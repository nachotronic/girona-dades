"""Listas de espera del CatSalut (mensual, por hospital y región sanitaria).

CatSalut publica cada mes tres ficheros XML (SpreadsheetML de Excel 2003) que lee su web
de consulta (llistesEspera_funcions.js):
  https://catsalut.gencat.cat/.content/xml/llistes-espera/{quirurgiques|externes|diagnostiques}-AAAA-MM.xml

Son tablas dinámicas: las primeras columnas (agrupación, procedimiento, mes, región, centro)
solo aparecen cuando cambian y hay filas «Total» intermedias. Se rellenan hacia abajo y se
descartan los totales. Cada fila acaba con cinco cifras: pacientes en lista, % hombres,
% mujeres, tiempo medio de espera de los pendientes (días) y actividad del mes.

Se guarda:
  llistes_espera_centres.csv.gz  detalle de los centros de la región sanitaria de Girona
  llistes_espera_regions.csv.gz  totales por mes, tipo, procedimiento y región (todas)
El histórico se acumula: cada ejecución solo baja los meses que faltan (y repasa los dos últimos).
"""
from __future__ import annotations

import datetime as dt
import html
import re

import pandas as pd

from .comun import carpeta, get

BASE = "https://catsalut.gencat.cat/.content/xml/llistes-espera/"
TIPUS = {"quirurgiques": 5, "externes": 4, "diagnostiques": 4}  # columnas de etiquetas
INICI = (2019, 1)
GIRONA = "Girona"
NUM = ["pacients", "pct_homes", "pct_dones", "dies", "activitat"]


def _num(x: str):
    try:
        return float(x)
    except ValueError:
        return None


def parse(xml: str, tipus: str) -> pd.DataFrame:
    n_et = TIPUS[tipus]
    files, et = [], [None] * n_et
    for fila in re.findall(r"<Row[^>]*>(.*?)</Row>", xml, re.S):
        cel = [html.unescape(re.sub(r"<[^>]+>", "", c)).strip() for c in re.findall(r"<Data[^>]*>(.*?)</Data>", fila, re.S)]
        if len(cel) <= 5:
            continue
        vals, labels = cel[-5:], cel[:-5]
        if labels and "total" in labels[0].lower():
            continue
        nums = [_num(v) for v in vals]
        if any(v is None for v in nums) or len(labels) > n_et:
            continue  # cabecera u otra fila no numérica
        et = et[: n_et - len(labels)] + labels
        files.append(et + nums)
    cols = (["agrupacio", "grup"] if tipus == "quirurgiques" else ["grup"]) + ["mes", "regio", "centre"]
    df = pd.DataFrame(files, columns=cols + NUM)
    if "agrupacio" not in df:
        df.insert(0, "agrupacio", "")
    df["mes"] = df["mes"].astype(str).str[:7]
    df["tipus"] = tipus
    return df


def _mesos():
    a, m = INICI
    hoy = dt.date.today()
    while (a, m) <= (hoy.year, hoy.month):
        yield f"{a}-{m:02d}"
        m += 1
        if m == 13:
            a, m = a + 1, 1


def ejecutar() -> str:
    sal = carpeta("salut")
    fc, fr = sal / "llistes_espera_centres.csv.gz", sal / "llistes_espera_regions.csv.gz"
    cen = pd.read_csv(fc, dtype=str) if fc.exists() else pd.DataFrame()
    reg = pd.read_csv(fr, dtype=str) if fr.exists() else pd.DataFrame()
    fets = set(reg["tipus"] + "|" + reg["mes"]) if len(reg) else set()
    lin, nous_c, nous_r = [], [], []
    for tipus in TIPUS:
        mesos = list(_mesos())
        ja = [m for m in mesos if f"{tipus}|{m}" in fets]
        repassa = set(ja[-2:])
        pendents = [m for m in mesos if f"{tipus}|{m}" not in fets or m in repassa]
        n, err = 0, 0
        for mes in pendents:
            try:
                r = get(f"{BASE}{tipus}-{mes}.xml", reintentos=2, timeout=180)
            except Exception:  # noqa: BLE001 - un mes que falta (aún no publicado o hueco) no es un error
                err += 1
                continue
            if b"<Row" not in r.content:
                continue
            d = parse(r.content.decode("utf-8", errors="replace"), tipus)
            if d.empty:
                continue
            d["mes"] = mes
            nous_c.append(d[d["regio"] == GIRONA])
            d["pond"] = d["pacients"] * d["dies"]
            g = d.groupby(["tipus", "mes", "agrupacio", "grup", "regio"], as_index=False)[["pacients", "pond", "activitat"]].sum()
            nous_r.append(g)
            n += 1
        ult = max([m for m in mesos if f"{tipus}|{m}" in fets] + [x["mes"].iloc[0] for x in nous_r if len(x) and x["tipus"].iloc[0] == tipus], default="-")
        lin.append(f"{tipus}: {n} mesos baixats, últim {ult}")
    if nous_r:
        nr = pd.concat(nous_r).astype(str)
        claus = set(nr["tipus"] + "|" + nr["mes"])
        if len(reg):
            reg = reg[~(reg["tipus"] + "|" + reg["mes"]).isin(claus)]
        reg = pd.concat([reg, nr]).sort_values(["tipus", "mes"])
        reg.to_csv(fr, index=False)
        nc = pd.concat(nous_c).astype(str)
        if len(cen):
            cen = cen[~(cen["tipus"] + "|" + cen["mes"]).isin(claus)]
        cen = pd.concat([cen, nc]).sort_values(["tipus", "mes"])
        cen.to_csv(fc, index=False)
    if not len(reg):
        lin.append("ERROR: no s'ha pogut baixar cap mes")
    return "\n".join(lin)
