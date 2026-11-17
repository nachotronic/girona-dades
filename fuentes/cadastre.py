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
import zipfile

import pandas as pd

from .comun import RAW, carpeta, descargar, get

C = "https://www.catastro.hacienda.gob.es/documentos/estadisticas/"
FICHEROS = ("URBANA", "PARCELAS", "RUSTICA")
HST = {"inm": "hst_inm_distritos.csv", "vm": "hst_vm_distritos.csv", "sm": "hst_supm_distritos.csv"}
# Información económico-financiera del IBI por municipio (2008-): recibos, bases, cuotas, tipos y recargo
ECO = C + "economicofinanciera/serie_eco_fin.csv"
ECO_SUMA = ["RECIBOS_URBANA", "BINTEGRA_NO_EXENTA_URBANA", "BLIQ_NO_EXENTA_URBANA", "CINTEGRA_URBANA", "CLIQUIDA_URBANA",
            "RECIBOS_RUSTICA", "CLIQUIDA_RUSTICA", "RECIBOS_BICES", "CLIQUIDA_BICES"]
ECO_COLS = ["TIPO_GENERAL_U", "TIPOS_DIFERENCIADOS", "TIPO_GENERAL_R", "RECARGO_DESOCUPADOS", "EXEN_URB", "EXEN_RUS"]
# Series históricas por municipio del paquete PC-Axis completo (desde los años noventa)
PXZIP = C + "px.zip"
HISTORICS = {"urbana": "px/datoshistoricos/urbana/H1M117.px", "rustica": "px/datoshistoricos/rustica/H1M217.px",
             "ibi": "px/datoshistoricos/IBI/H1M317.px"}
# Las cabeceras cambian un poco con los años
SINONIMOS = {"REVISION": "ULT_REVISION", "C_INE": "COD_INE_MUNI", "COD_INE": "COD_INE_MUNI", "INE": "COD_INE_MUNI",
             "SUPER_SOLAR": "SUP_SOLAR", "SUPER_CONST": "SUP_CONST",
             "NUMPARC": "PARCELAS_RUS", "PARCELAS": "PARCELAS_RUS", "SUBPARCELAS": "SUBPARCELAS_RUS", "NUMSUBP": "SUBPARCELAS_RUS"}
# Superficie y valor rústicos: el nombre y la unidad cambian (m² o ha; euros o miles de euros)
SUP_RUS = ("SUPERFICIE_HA_RUS", "SUPERFICIE", "SUPTOT", "TOTSUP")
VAL_RUS = ("VALOR_MILES_RUS", "VALOR", "VALCATTOT", "TOTVALCAT")
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
    if f == "RUSTICA":
        for objectiu, noms, llindar, factor in (("SUPERFICIE_HA_RUS", SUP_RUS, 200_000, 10_000), ("VALOR_MILES_RUS", VAL_RUS, 100_000, 1000)):
            col = next((c for c in noms if c in d.columns and d[c].notna().any()), None)
            if col is None:
                continue
            v = d[col]
            d[objectiu] = v / factor if v.median() > llindar else v
        d = d.drop(columns=[c for c in (*SUP_RUS[1:], *VAL_RUS[1:]) if c in d.columns])
        nums = [c for c in d.columns if c in nums or c in ("SUPERFICIE_HA_RUS", "VALOR_MILES_RUS")]
    d = d[["COD_INE_MUNI", *[c for c in dict.fromkeys(nums) if c in d.columns and c not in {"AREF", "COD_INE_PROV", "COD_INE_CCAA"}]]]
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
        # Los nombres de municipio y comunidad pueden llevar comas sin comillas: se leen
        # los dos primeros campos y las últimas columnas numéricas
        linies = r.content.decode("latin-1").splitlines()
        cap = linies[0].split(",")
        cols = [c for c in cap if c not in {"AREF", "DISTRITO", "MUNICIPIO", "CPROVNOM", "CCAANOM"}]
        files = []
        for l in linies[1:]:
            c = l.split(",")
            if len(c) >= len(cap) and c[1].startswith("17"):
                files.append([int(c[0]), c[1], *c[len(c) - len(cols):]])
        d = pd.DataFrame(files, columns=["any", "districte", *[f"{k}_{c.lower()}" for c in cols]])
        for c in d.columns[2:]:
            d[c] = pd.to_numeric(d[c], errors="coerce")
        parts.append(d.set_index(["districte", "any"]))
    t = parts[0]
    for p in parts[1:]:
        t = t.join(p, how="outer")
    t = t.reset_index()
    res.append(f"distritos censales: {t['districte'].nunique()} distritos, años {t['any'].min()}-{t['any'].max()}")
    return t


def _eco_fin(res: list[str]) -> tuple[pd.DataFrame, dict]:
    r = get(ECO, timeout=300)
    d = pd.read_csv(io.BytesIO(r.content), sep=";", quotechar="'", decimal=",", dtype={"CODINE": str, "CPROV": str, "CCAA": str}, encoding="latin-1", low_memory=False)
    d["CODINE"] = d["CODINE"].str.zfill(5)
    for c in ECO_SUMA + [c for c in ECO_COLS if c != "TIPOS_DIFERENCIADOS"]:
        d[c] = pd.to_numeric(d[c], errors="coerce")
    refs = {}
    for z, filtre in (("esp", d["CODINE"].str.len() == 5), ("cat", d["CODINE"].str[:2].isin(["08", "17", "25", "43"])), ("gi", d["CODINE"].str[:2] == "17")):
        g = d[filtre].groupby("EJERCICIO")[ECO_SUMA].sum(min_count=1)
        refs[z] = {str(a): {k: (None if pd.isna(v) else round(float(v), 2)) for k, v in fila.items()} for a, fila in g.iterrows()}
        # Municipios que aplican el recargo a los inmuebles desocupados
        rec = d[filtre].groupby("EJERCICIO")["RECARGO_DESOCUPADOS"].apply(lambda x: int((x > 0).sum()))
        for a, n in rec.items():
            refs[z].setdefault(str(a), {})["N_RECARGO"] = n
        n = d[filtre].groupby("EJERCICIO")["CODINE"].nunique()
        for a, v in n.items():
            refs[z].setdefault(str(a), {})["N_MUNICIPIOS"] = int(v)
    gi = d[d["CODINE"].str[:2] == "17"][["EJERCICIO", "CODINE", *ECO_SUMA, *ECO_COLS]].rename(columns={"EJERCICIO": "any", "CODINE": "codi_ine"})
    res.append(f"IBI económico-financiero: {gi['codi_ine'].nunique()} municipios, años {gi['any'].min()}-{gi['any'].max()}")
    return gi, refs


def _historics(out, res: list[str]) -> None:
    """Guarda las series históricas de Girona (PC-Axis) del paquete completo."""
    ruta = RAW / "cadastre" / "px.zip"
    descargar(PXZIP, ruta, timeout=900)
    with zipfile.ZipFile(ruta) as z:
        for k, n in HISTORICS.items():
            try:
                (out / f"historic_{k}.px").write_bytes(z.read(n))
                res.append(f"histórico {k}: {n}")
            except KeyError:
                res.append(f"ERROR histórico {k}: no está {n}")


def ejecutar() -> str:
    out = carpeta("cadastre")
    res: list[str] = []
    gi, refs = _municipis(res)
    gi.to_csv(out / "municipis.csv.gz", index=False)
    (out / "referencies.json").write_text(json.dumps(refs, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    res.append(f"Girona: {gi['codi_ine'].nunique()} municipios, años {gi['any'].min()}-{gi['any'].max()}, {len(gi.columns)} columnas")
    if gi["codi_ine"].nunique() < 200:
        res.append("ERROR: faltan municipios de Girona")
    try:
        dis = _districtes(res)
    except Exception as e:  # noqa: BLE001
        dis = None
        res.append(f"ERROR distritos censales: {e}")
    if dis is not None:
        dis.to_csv(out / "districtes.csv.gz", index=False)
    try:
        eco, refs_eco = _eco_fin(res)
        eco.to_csv(out / "ibi_municipis.csv.gz", index=False)
        (out / "ibi_referencies.json").write_text(json.dumps(refs_eco, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    except Exception as e:  # noqa: BLE001
        res.append(f"ERROR IBI económico-financiero: {e}")
    try:
        _historics(out, res)
    except Exception as e:  # noqa: BLE001
        res.append(f"ERROR series históricas: {e}")
    return "\n".join(res)
