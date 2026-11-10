"""Catastro INSPIRE (edificios) de toda la provincia de Girona.

Descarga el GML de edificios de cada municipio desde el servicio Atom de la Gerencia
de Girona (17) y genera:
  catastro/edificios.csv.gz          un edificio por fila (año, uso, viviendas, superficie, x, y)
  catastro/edificios_municipio.csv   agregados por municipio
  catastro/codigos.csv               correspondencia código Catastro <-> código INE
Las coordenadas están en ETRS89 UTM 31N (EPSG:25831); el centro es la media de los vértices.
"""
from __future__ import annotations

import difflib
import re
import zipfile

import pandas as pd
from lxml import etree

from .comun import RAW, carpeta, descargar, get, normaliza
from .territorio import municipios

ATOM = "https://www.catastro.hacienda.gob.es/INSPIRE/buildings/17/ES.SDGC.BU.atom_17.xml"
CAMPOS = {"currentUse": "uso", "numberOfDwellings": "viviendas", "numberOfBuildingUnits": "inmuebles",
          "numberOfFloorsAboveGround": "plantas", "value": "superficie_m2"}


def _entradas() -> list[tuple[str, str, str]]:
    xml = etree.fromstring(get(ATOM).content)
    ns = {"a": "http://www.w3.org/2005/Atom"}
    res = []
    for e in xml.findall("a:entry", ns):
        titulo = (e.findtext("a:title", default="", namespaces=ns) or "").strip()
        m = re.match(r"(\d{5})-(.+?)\s+buildings", titulo, re.I)
        enlaces = [l.get("href") for l in e.findall("a:link", ns) if (l.get("href") or "").lower().endswith(".zip")]
        if m and enlaces:
            res.append((m.group(1), m.group(2).strip(), enlaces[0]))
    return res


def _codigos(entradas) -> pd.DataFrame:
    mun = municipios()
    por_nombre = dict(zip(mun["nom_normalitzat"], mun["codi_ine"]))
    filas = []
    for cod, nombre, _ in entradas:
        n = normaliza(nombre)
        ine = por_nombre.get(n)
        metodo = "exacto"
        if not ine:
            # Nombres abreviados ("BRUNYOLA" -> "Brunyola i Sant Martí Sapresa"): tokens contenidos
            tok = set(n.split())
            cand = [k for k in por_nombre if tok and (tok <= set(k.split()) or set(k.split()) <= tok)]
            if len(cand) == 1:
                ine, metodo = por_nombre[cand[0]], f"contenido:{cand[0]}"
        if not ine:
            parecido = difflib.get_close_matches(n, por_nombre, n=1, cutoff=0.75)
            ine, metodo = (por_nombre[parecido[0]], f"aproximado:{parecido[0]}") if parecido else (None, "sin_coincidencia")
        filas.append({"codigo_catastro": cod, "nombre_catastro": nombre, "codi_ine": ine, "metodo": metodo})
    return pd.DataFrame(filas)


def _texto(el, nombre):
    for d in el.iter():
        if isinstance(d.tag, str) and etree.QName(d).localname == nombre and d.text and d.text.strip():
            return d.text.strip()
    return None


def _edificios(zip_path, cod):
    with zipfile.ZipFile(zip_path) as z:
        gml = next(n for n in z.namelist() if n.lower().endswith(".gml") and "building." in n.lower()) \
            if any("building." in n.lower() for n in z.namelist()) else next(n for n in z.namelist() if n.lower().endswith(".gml"))
        with z.open(gml) as f:
            for _, el in etree.iterparse(f, events=("end",), tag="{*}Building"):
                fila = {"codigo_catastro": cod, "id": el.get("{http://www.opengis.net/gml/3.2}id")}
                anyo = _texto(el, "end") or _texto(el, "beginning")
                fila["anyo"] = int(anyo[:4]) if anyo and anyo[:4].isdigit() else None
                for loc, col in CAMPOS.items():
                    fila[col] = _texto(el, loc)
                pos = _texto(el, "posList")
                if pos:
                    v = [float(x) for x in pos.split()]
                    fila["x"], fila["y"] = round(sum(v[0::2]) / len(v[0::2])), round(sum(v[1::2]) / len(v[1::2]))
                yield fila
                el.clear()
                while el.getprevious() is not None:
                    del el.getparent()[0]


def ejecutar() -> str:
    salida = carpeta("catastro")
    entradas = _entradas()
    codigos = _codigos(entradas)
    codigos.to_csv(salida / "codigos.csv", index=False)
    filas, errores = [], []
    for cod, nombre, url in entradas:
        try:
            z = descargar(url, RAW / "catastro" / f"{cod}.zip")
            filas.extend(_edificios(z, cod))
            z.unlink()
        except Exception as e:  # noqa: BLE001
            errores.append(f"{cod} {nombre}: {type(e).__name__}")
    df = pd.DataFrame(filas)
    for c in ("viviendas", "inmuebles", "plantas", "superficie_m2"):
        df[c] = pd.to_numeric(df[c], errors="coerce")
    df = df.merge(codigos[["codigo_catastro", "codi_ine"]], on="codigo_catastro", how="left")
    df.to_csv(salida / "edificios.csv.gz", index=False, compression="gzip")
    df["decada"] = (df["anyo"] // 10 * 10).astype("Int64")
    agg = df.groupby("codi_ine").agg(edificios=("id", "count"), viviendas=("viviendas", "sum"),
                                     superficie_m2=("superficie_m2", "sum"), anyo_mediano=("anyo", "median"))
    res = df[df["uso"].fillna("").str.contains("residential", case=False)]
    agg["edificios_residenciales"] = res.groupby("codi_ine")["id"].count()
    viv_dec = df.pivot_table(index="codi_ine", columns="decada", values="viviendas", aggfunc="sum").add_prefix("viviendas_")
    agg = agg.join(viv_dec).reset_index()
    agg.to_csv(salida / "edificios_municipio.csv", index=False)
    sin = (codigos["codi_ine"].isna()).sum()
    return f"{len(entradas)} municipios, {len(df)} edificios, {int(df['viviendas'].sum())} viviendas; {sin} sin código INE; errores: {errores[:10]}"
