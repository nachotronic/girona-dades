"""Estadísticas del Catastro (Dirección General del Catastro, Ministerio de Hacienda).

1. «Datos municipios» (estadisticas_7): un Excel anual para toda España desde 2012 con el
   catastro urbano (inmuebles, valor catastral total, del suelo y de la construcción, superficie,
   parcelas, inmuebles y valor por uso), las parcelas urbanas (solares y edificadas, por tamaño) y
   el catastro rústico (parcelas, superficie y valor). Año = AREF (padrón catastral a 1 de enero).
2. «Series históricas por distritos censales» (estadisticas_5): inmuebles y valor catastral medio
   por uso y distrito censal desde 2013.

Genera en data/processed/cadastre/:
  municipis.csv.gz   codi_ine, any y variables de los tres ficheros (solo provincia de Girona)
  referencies.json   sumas por año para la provincia de Girona, Cataluña y España
  districtes.csv.gz  distrito censal (7 dígitos INE), año, inmuebles y valor medio por uso
"""
from __future__ import annotations

import datetime as dt
import io
import json
import re

import pandas as pd

from .comun import RAW, carpeta, descargar, get

C = "https://www.catastro.hacienda.gob.es/documentos/estadisticas/"
FICHEROS = ("URBANA", "PARCELAS", "RUSTICA")
HST = {"inm": "hst_inm_distritos.csv", "vm": "hst_vm_distritos.csv"}
# Las cabeceras cambian un poco con los años
SINONIMOS = {"REVISION": "ULT_REVISION", "C_INE": "COD_INE_MUNI", "COD_INE": "COD_INE_MUNI", "INE": "COD_INE_MUNI"}
NO_SUMA = {"ULT_REVISION", "AREF", "COD_INE_MUNI", "COD_INE_PROV", "COD_INE_CCAA"}


def _lee(f: str, any_: int) -> pd.DataFrame | None:
    ruta = RAW / "cadastre" / f"{f}{any_}.xls"
    try:
        descargar(C + f"{f}{any_}.xls", ruta)
    except Exception:  # noqa: BLE001 - años aún no publicados
        return None
    try:
        d = pd.read_excel(ruta, sheet_name=0, dtype=str)
    except Exception:  # noqa: BLE001
        return None
    d.columns = [SINONIMOS.get(str(c).strip().upper(), str(c).strip().upper()) for c in d.columns]
    if "COD_INE_MUNI" not in d.columns:
        cand = [c for c in d.columns if "INE" in c and d[c].astype(str).str.fullmatch(r"\d{4,5}").mean() > 0.9]
        if not cand:
            return None
        d = d.rename(columns={cand[0]: "COD_INE_MUNI"})
    d["COD_INE_MUNI"] = d["COD_INE_MUNI"].astype(str).str.strip().str.zfill(5)
    d = d[d["COD_INE_MUNI"].str.fullmatch(r"\d{5}")]
    nums = [c for c in d.columns if c not in {"COD_INE_MUNI"} and not c.startswith("NOM_")]
    for c in nums:
        d[c] = pd.to_numeric(d[c], errors="coerce")
    d = d[["COD_INE_MUNI", *[c for c in nums if c not in {"AREF", "COD_INE_PROV", "COD_INE_CCAA"}]]]
    d.insert(1, "any", any_)
    return d


def _municipis(res: list[str]) -> tuple[pd.DataFrame, dict]:
    darrer = dt.date.today().year + 1
    taules = []
    for any_ in range(2012, darrer + 1):
        parts = []
        for f in FICHEROS:
            d = _lee(f, any_)
            if d is None:
                continue
            parts.append(d.set_index(["COD_INE_MUNI", "any"]))
        if not parts:
            continue
        t = parts[0]
        for p in parts[1:]:
            t = t.join(p[[c for c in p.columns if c not in t.columns]], how="outer")
        taules.append(t.reset_index())
        res.append(f"{any_}: {len(parts)} ficheros, {len(t)} municipios")
    tot = pd.concat(taules, ignore_index=True)
    # Referencias: España, Cataluña (CCAA 09) y provincia de Girona (17)
    suma = [c for c in tot.columns if c not in NO_SUMA and c != "any"]
    refs = {}
    for z, filtre in (("esp", tot["COD_INE_MUNI"].str.len() == 5), ("cat", tot["COD_INE_MUNI"].str[:2].isin(["08", "17", "25", "43"])),
                      ("gi", tot["COD_INE_MUNI"].str[:2] == "17")):
        g = tot[filtre].groupby("any")[suma].sum(min_count=1)
        refs[z] = {str(a): {k: (None if pd.isna(v) else round(float(v), 2)) for k, v in fila.items()} for a, fila in g.iterrows()}
    gi = tot[tot["COD_INE_MUNI"].str[:2] == "17"].rename(columns={"COD_INE_MUNI": "codi_ine"})
    return gi, refs


def _districtes(res: list[str]) -> pd.DataFrame | None:
    parts = []
    for k, f in HST.items():
        try:
            r = get(C + "serieshistoricas/" + f, timeout=300)
        except Exception as e:  # noqa: BLE001
            res.append(f"ERROR {f}: {e}")
            return None
        d = pd.read_csv(io.BytesIO(r.content), dtype=str, encoding="latin-1")
        d = d[d["DISTRITO"].str.startswith("17")]
        cols = [c for c in d.columns if c not in {"AREF", "DISTRITO", "MUNICIPIO", "CPROVNOM", "CCAANOM"}]
        d = d.rename(columns={"AREF": "any", "DISTRITO": "districte", **{c: f"{k}_{c.lower()}" for c in cols}})
        for c in d.columns:
            if c.startswith(k + "_"):
                d[c] = pd.to_numeric(d[c], errors="coerce")
        d["any"] = d["any"].astype(int)
        parts.append(d.drop(columns=["MUNICIPIO", "CPROVNOM", "CCAANOM"], errors="ignore").set_index(["districte", "any"]))
    t = parts[0].join(parts[1], how="outer").reset_index()
    res.append(f"distritos censales: {t['districte'].nunique()} distritos, años {t['any'].min()}-{t['any'].max()}")
    return t


def ejecutar() -> str:
    out = carpeta("cadastre")
    res: list[str] = []
    gi, refs = _municipis(res)
    gi.to_csv(out / "municipis.csv.gz", index=False)
    (out / "referencies.json").write_text(json.dumps(refs, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    res.append(f"Girona: {gi['codi_ine'].nunique()} municipios, años {gi['any'].min()}-{gi['any'].max()}, {len(gi.columns)} columnas")
    if gi["codi_ine"].nunique() < 200:
        res.append("ERROR: faltan municipios de Girona")
    dis = _districtes(res)
    if dis is not None:
        dis.to_csv(out / "districtes.csv.gz", index=False)
    return "\n".join(res)
