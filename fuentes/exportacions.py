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
RE_ZIP = re.compile(r'href="([^"]*/(territoriales_anuales|territoriales_mens)/[^"]*?tr(\d\d)(an|[a-z]{2})(\d\d)\.zip)"', re.I)
RE_PAG = re.compile(r'href="(/Sede/estadisticas/estadisticas-comercio-exterior/[^"#?]+\.html)"')
COLS = ["per", "flux", "nivell", "zona", "clau", "valor", "pes"]


def _enlaces() -> dict[str, list[str]]:
    """{periodo: [urls]} con los zips territoriales anuales (AAAA) y mensuales (AAAA-MM)."""
    pags = {INDICE}
    t = get(INDICE).text
    pags |= {BASE + p for p in RE_PAG.findall(t) if re.search(r"/(\d{4}(-territoriales)?|historicas?[^/]*|\d{4}__)\.html$", p)}
    per = collections.defaultdict(set)
    for p in sorted(pags):
        try:
            h = t if p == INDICE else get(p).text
        except Exception:  # noqa: BLE001 - una página caída no para el resto
            continue
        for url, tipo, aa, mm, _ in RE_ZIP.findall(h):
            any_ = 2000 + int(aa)
            if tipo.lower() == "territoriales_anuales":
                per[str(any_)].add(BASE + url if url.startswith("/") else url)
            else:
                carp = url.rstrip("/").split("/")[-2].lower()
                mes = MESOS.get(carp)
                if mes and any_ >= DESDE_MES:
                    per[f"{any_}-{mes:02d}"].add(BASE + url if url.startswith("/") else url)
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
    if not nous:
        linies.append(f"Sin cambios ({len(enl)} periodos publicados, último {max(enl)})")
    return "\n".join(linies) + (f"\n{errors} periodos con ERROR" if errors else "")
