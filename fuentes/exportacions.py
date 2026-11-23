"""Comercio exterior (exportaciones e importaciones de bienes) por provincia: AEAT, Departamento de Aduanas.

https://sede.agenciatributaria.gob.es/Sede/estadisticas/estadisticas-comercio-exterior.html

Se usan los «ficheros territoriales» (texto de ancho fijo, una línea por año o mes, flujo, provincia
de la aduana, provincia de origen o destino, país, posición NC8, modo de transporte, peso, unidades,
valor estadístico en céntimos y domicilio fiscal). Cada periodo viene en 10 zips por tramos de capítulos.
  - Anuales definitivos (historicas_anuales/territoriales_anuales/trAAanCC.zip), desde 2015.
  - Mensuales (territoriales_mens/AAAA/<mes>/trAAmmCC.zip), provisionales el año en curso.
La provincia que cuenta es la de origen (exportación) o destino (importación) de la mercancía,
igual que Idescat y DataComex. No hay datos por municipio ni por comarca.

Salida (data/processed/exportacions/):
  agregats.csv.gz   per (AAAA o AAAA-MM), flux (E/I), nivell, zona, clau, valor (€), pes (kg)
                    nivell: prov (zona = código de provincia, «--» sin provincia), pais, cap (capítulo NC2),
                    mode (transporte), cap_pais y nc4 (solo Girona). zona: gi, cat, esp.
  manifest.json     ficheros procesados (url -> tamaño) para no volver a bajar lo que no ha cambiado
"""
from __future__ import annotations

import collections
import datetime as dt
import io
import json
import re
import zipfile

import pandas as pd

from .comun import _sesion, carpeta, get

BASE = "https://sede.agenciatributaria.gob.es"
INDICE = BASE + "/Sede/estadisticas/estadisticas-comercio-exterior.html"
DESDE_MES = 2019
CAT = {"08", "17", "25", "43"}
MESOS = {"enero": 1, "febrero": 2, "marzo": 3, "abril": 4, "mayo": 5, "junio": 6, "julio": 7, "agosto": 8,
         "septiembre": 9, "setiembre": 9, "octubre": 10, "noviembre": 11, "diciembre": 12}
# Las rutas cambian según el año (territoriales_anuales, datos_anuales_territoriales, historicas_anuales,
# territoriales_mens, datos_mensuales_territoriales…): se reconoce el fichero por el nombre trAA(an|mm)CC.zip
RE_ZIP = re.compile(r'href="([^"]*/tr(\d\d)(an|[a-z]{2})(\d\d)\.zip)"', re.I)
RE_PAG = re.compile(r'href="(/Sede/estadisticas/estadisticas-comercio-exterior/[^"#?]+\.html)"')
# Población residente por provincia (ECP, tabla 56945; la 2852 del padrón se dejó de actualizar en 2021)
INE_POB = ["https://servicios.ine.es/wstempus/js/ES/DATOS_TABLA/56945?nult=1", "https://servicios.ine.es/wstempus/js/ES/DATOS_TABLA/2852?nult=1"]
PROVS = {"01": "Araba/Álava", "02": "Albacete", "03": "Alicante/Alacant", "04": "Almería", "05": "Ávila", "06": "Badajoz",
         "07": "Balears, Illes", "08": "Barcelona", "09": "Burgos", "10": "Cáceres", "11": "Cádiz", "12": "Castellón/Castelló",
         "13": "Ciudad Real", "14": "Córdoba", "15": "Coruña, A", "16": "Cuenca", "17": "Girona", "18": "Granada", "19": "Guadalajara",
         "20": "Gipuzkoa", "21": "Huelva", "22": "Huesca", "23": "Jaén", "24": "León", "25": "Lleida", "26": "Rioja, La", "27": "Lugo",
         "28": "Madrid", "29": "Málaga", "30": "Murcia", "31": "Navarra", "32": "Ourense", "33": "Asturias", "34": "Palencia",
         "35": "Palmas, Las", "36": "Pontevedra", "37": "Salamanca", "38": "Santa Cruz de Tenerife", "39": "Cantabria", "40": "Segovia",
         "41": "Sevilla", "42": "Soria", "43": "Tarragona", "44": "Teruel", "45": "Toledo", "46": "Valencia/València", "47": "Valladolid",
         "48": "Bizkaia", "49": "Zamora", "50": "Zaragoza", "51": "Ceuta", "52": "Melilla"}
COLS = ["per", "flux", "nivell", "zona", "clau", "valor", "pes"]


def _enlaces() -> dict[str, list[str]]:
    """{periodo: [urls]} con los zips territoriales anuales (AAAA) y mensuales (AAAA-MM).
    Recorre el índice, las páginas de cada año y las de cada mes (enlazadas desde la del año)."""
    util = re.compile(r"territoriales|historicas|/\d{4}(__)?\.html$|/(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|setiembre|octubre|noviembre|diciembre)(__)?\.html$")
    pendents, vistes = [INDICE], set()
    per = collections.defaultdict(set)
    while pendents and len(vistes) < 700:
        p = pendents.pop(0)
        if p in vistes:
            continue
        vistes.add(p)
        try:
            h = get(p).text
        except Exception:  # noqa: BLE001 - una página caída no para el resto
            continue
        for q in RE_PAG.findall(h):
            if util.search(q) and "maxima" not in q and "resumen" not in q and BASE + q not in vistes:
                pendents.append(BASE + q)
        for url, aa, mm, _ in RE_ZIP.findall(h):
            any_ = 2000 + int(aa)
            url = BASE + url if url.startswith("/") else url
            if mm.lower() == "an":
                per[str(any_)].add(url)
            else:
                mes = MESOS.get(url.rstrip("/").split("/")[-2].lower())
                if mes and any_ >= DESDE_MES:
                    per[f"{any_}-{mes:02d}"].add(url)
    return {k: sorted(v) for k, v in per.items()}


def _linia(l: str):
    """(flux, prov, pais, nc8, mode, valor_cent, pes) o None. Se lee desde la derecha: el ancho de los
    campos numéricos cambia entre ficheros anuales (13) y mensuales (12) y la aduana puede ir en blanco."""
    t = l.split()
    if len(t) < 8 or t[1] not in ("E", "I"):
        return None
    try:
        valor, pes = int(t[-2]), int(t[-4])
    except ValueError:
        return None
    pr = l[8:10]
    if not pr.isdigit():
        pr = "--"
    return t[1], pr, t[-7], t[-6], t[-5], valor, pes


def _processa(urls: list[str], mides: dict) -> pd.DataFrame:
    v = collections.Counter()
    p = collections.Counter()
    for url in urls:
        cont = get(url, timeout=600).content
        mides[url] = str(len(cont))
        z = zipfile.ZipFile(io.BytesIO(cont))
        for n in z.namelist():
            with z.open(n) as fz:
                for b in io.TextIOWrapper(fz, encoding="latin-1"):
                    r = _linia(b)
                    if not r:
                        continue
                    f, pr, pa, nc, mo, val, pe = r
                    cap = nc[:2] if nc[:2].isdigit() else "XX"
                    zones = ["esp"] + (["cat"] if pr in CAT else []) + (["gi"] if pr == "17" else [])
                    claus = [("prov", pr, pr)]
                    for zo in zones:
                        claus += [("pais", zo, pa), ("cap", zo, cap), ("mode", zo, mo)]
                    if pr == "17":
                        claus += [("cap_pais", "gi", f"{cap}|{pa}"), ("nc4", "gi", nc[:4])]
                    for c in claus:
                        k = (f,) + c
                        v[k] += val
                        p[k] += pe
    files = [(f, niv, zo, cl, v[k] / 100, p[k]) for k in v for (f, niv, zo, cl) in [k]]
    return pd.DataFrame(files, columns=COLS[1:])


def _poblacio(sal) -> str:
    """Población por provincia para las exportaciones por habitante."""
    nom2cod = {re.sub(r"\W", "", v.lower()): k for k, v in PROVS.items()}
    for url in INE_POB:
        files = []
        try:
            js = get(url, timeout=300).json()
        except Exception:  # noqa: BLE001
            continue
        if not isinstance(js, list):
            # El INE responde con un diccionario de estado (p. ej. «restricciones de volumen»): se prueba la siguiente
            continue
        for se in js:
            parts = [x.strip() for x in se.get("Nombre", "").split(".")]
            if len(parts) < 3 or not ("Todas las edades" in parts or parts[1] == "Total") or "Total" not in parts[1:3]:
                continue
            if any(x in ("Hombres", "Mujeres") for x in parts[1:3]):
                continue
            nom = re.sub(r"^\d+\s*", "", parts[0])
            cod = "esp" if "nacional" in nom.lower() else nom2cod.get(re.sub(r"\W", "", nom.lower()))
            if cod:
                files += [(cod, d.get("Anyo"), d.get("Valor")) for d in se.get("Data", []) if d.get("Valor")]
        p = pd.DataFrame(files, columns=["prov", "any", "poblacio"]).drop_duplicates(["prov", "any"])
        if p["prov"].nunique() >= 50:
            p.sort_values(["prov", "any"]).to_csv(sal / "poblacio.csv", index=False)
            return f"población INE ({url.split('/')[-1]}): {p['prov'].nunique()} zonas, años {p['any'].min()}-{p['any'].max()}"
    return "ERROR población INE: ninguna tabla da las provincias"


def ejecutar() -> str:
    sal = carpeta("exportacions")
    fa, fm = sal / "agregats.csv.gz", sal / "manifest.json"
    agr = pd.read_csv(fa, dtype={"per": str, "zona": str, "clau": str}) if fa.exists() else pd.DataFrame(columns=COLS)
    man = json.loads(fm.read_text()) if fm.exists() else {}
    enl = _enlaces()
    if not enl:
        return "ERROR: no se han encontrado ficheros territoriales en la web de la AEAT"
    anuals = {k for k in enl if len(k) == 4}
    linies, errors, nous = [], 0, 0
    for per in sorted(enl):
        urls = enl[per]
        # Meses de un año que ya tiene fichero anual definitivo: se guardan una vez y no se repasan
        definitiu = len(per) == 4 or per[:4] in anuals
        firma = {}
        if per in set(agr["per"].astype(str)) and definitiu and all(u in man for u in urls):
            continue
        if per in set(agr["per"].astype(str)) and not definitiu:
            # Provisional: solo se vuelve a bajar si ha cambiado el tamaño de algún zip
            try:
                for u in urls:
                    firma[u] = _sesion.head(u, timeout=60, allow_redirects=True).headers.get("content-length")
            except Exception:  # noqa: BLE001
                continue
            if all(man.get(u) == firma[u] for u in urls):
                continue
        try:
            d = _processa(urls, firma)
        except Exception as e:  # noqa: BLE001
            errors += 1
            linies.append(f"{per}: ERROR {type(e).__name__}: {str(e)[:120]}")
            continue
        d.insert(0, "per", per)
        agr = pd.concat([agr[agr["per"].astype(str) != per], d], ignore_index=True)
        for u in urls:
            man[u] = firma.get(u, "ok")
        nous += 1
        gi = d[(d.nivell == "prov") & (d.zona == "17")].set_index("flux")["valor"]
        linies.append(f"{per}: {len(urls)} ficheros, Girona exporta {gi.get('E', 0) / 1e6:,.1f} M€ e importa {gi.get('I', 0) / 1e6:,.1f} M€")
        # Guarda a cada periodo para no perder trabajo si la Action se corta
        agr.sort_values(["per", "flux", "nivell", "zona", "clau"]).to_csv(fa, index=False, compression="gzip", float_format="%.2f")
        fm.write_text(json.dumps(man, indent=0, sort_keys=True))
    try:
        linies.append(_poblacio(sal))
    except Exception as e:  # noqa: BLE001
        linies.append(f"ERROR población: {type(e).__name__}: {str(e)[:100]}")
    if not nous:
        linies.append(f"Sin cambios ({len(enl)} periodos publicados, último {max(enl)})")
    return "\n".join(linies) + (f"\n{errors} periodos con ERROR" if errors else "")
