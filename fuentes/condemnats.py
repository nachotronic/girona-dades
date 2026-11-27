"""Delitos según nacionalidad: condenados (INE) y detenidos e investigados (Ministerio del Interior).

INE, Estadística de la Población Condenada Adulta (operación CONA), anual desde 2013:
  25708  condenados por provincia (lugar de condena), sexo y nacionalidad (española/extranjera)
  76641  delitos por provincia y nacionalidad (agrupación de países)
  49050  delitos por tipo y nacionalidad (solo total nacional)
INE, Estadística Continua de Población, tabla 56947: población residente por provincia, edad
  quinquenal, sexo y nacionalidad (agrupación de países), 1 de enero y 1 de julio.
Interior, Portal Estadístico de Criminalidad, series anuales de detenciones e investigados
  por provincia (2010-): 03002 todos, 03006 extranjeros (tipología y sexo), 03008 extranjeros
  por nacionalidad. Hasta 2019 no incluyen los Mossos d'Esquadra en los extranjeros.

Se guardan Girona, las otras tres provincias catalanas y el total nacional.
"""
from __future__ import annotations

import csv
import io
import re

import pandas as pd

from .comun import carpeta, get, normaliza

INE = "https://servicios.ine.es/wstempus/js/ES"
CSV_INE = "https://www.ine.es/jaxiT3/files/t/es/csv_bdsc/{}.csv"
MIR = "https://estadisticasdecriminalidad.ses.mir.es/sec/jaxiPx/files/_px/es/csv_bdsc/Datos3/l0/{}.csv_bdsc"
ZONES = {"girona": "gi", "barcelona": "bcn", "lleida": "lle", "tarragona": "tar", "nacional total": "esp"}


def _zona(nom: str) -> str | None:
    n = normaliza(re.sub(r"^\d+\s+", "", str(nom)))
    return ZONES.get(n)


def _ine_taula(id_: int) -> list[tuple[list[str], int, float]]:
    """[(partes del nombre de la serie, año, valor)] de una tabla del INE."""
    d = get(f"{INE}/DATOS_TABLA/{id_}", params={"nult": 40}, timeout=300).json()
    res = []
    for s in d:
        parts = [p.strip() for p in s["Nombre"].split(". ") if p.strip()]
        for v in s.get("Data", []):
            if v.get("Valor") is not None:
                res.append((parts, int(v["Anyo"]), float(v["Valor"])))
    return res


def _condemnats(sal) -> str:
    files = []
    for parts, a, v in _ine_taula(25708):  # Sexo. Provincia. Dato base. Nacionalidad.
        z = _zona(parts[1])
        if z:
            files.append({"zona": z, "sexe": parts[0], "nac": parts[3], "any": a, "n": v})
    d = pd.DataFrame(files)
    d.to_csv(sal / "condemnats.csv", index=False)
    files = []
    for parts, a, v in _ine_taula(76641):  # Provincia. Dato base. Delitos. Nacionalidad.
        z = _zona(parts[0])
        if z:
            files.append({"zona": z, "nac": parts[-1], "any": a, "n": v})
    o = pd.DataFrame(files)
    o.to_csv(sal / "delictes_origen.csv", index=False)
    files = []
    for parts, a, v in _ine_taula(49050):  # Total Nacional. Dato base. Tipo de delito. Nacionalidad.
        files.append({"tipus": ". ".join(parts[2:-1]), "nac": parts[-1], "any": a, "n": v})
    t = pd.DataFrame(files)
    t.to_csv(sal / "delictes_tipus_esp.csv", index=False)
    return f"INE condenados: {len(d)} filas ({d['any'].min()}-{d['any'].max()}), origen {len(o)}, tipos {t['tipus'].nunique()}"


def _poblacio(sal) -> str:
    """Población por provincia, edad, sexo y nacionalidad: el CSV completo pesa ~100 MB; se filtra al vuelo."""
    r = get(CSV_INE.format(56947), timeout=1800, stream=True)
    r.encoding = "utf-8"
    files, cap = [], None
    for linia in r.iter_lines(decode_unicode=True):
        if not linia:
            continue
        linia = linia.lstrip("﻿")
        if cap is None:
            cap = linia.split(";")
            continue
        c = [x.strip().strip('"') for x in linia.split(";")]
        if len(c) < 6:
            continue
        z = _zona(c[0])
        m = re.match(r"1 de (enero|julio) de (\d{4})", c[4])
        if not z or not m:
            continue
        v = c[5].strip().strip('"').replace(".", "").replace(",", ".")
        if not v:
            continue
        files.append({"zona": z, "edat": c[1], "nac": c[2], "sexe": c[3], "data": f"{m[2]}-{'01' if m[1] == 'enero' else '07'}", "n": float(v)})
    p = pd.DataFrame(files)
    p.to_csv(sal / "poblacio.csv.gz", index=False, compression="gzip")
    return f"INE población 56947: {len(p)} filas, {p['data'].min()}-{p['data'].max()}"


def _mir(fitxer: str) -> pd.DataFrame:
    r = get(MIR.format(fitxer) + "?nocab=1", timeout=300, reintentos=5)
    try:
        txt = r.content.decode("utf-8")
    except UnicodeDecodeError:
        txt = r.content.decode("iso-8859-15")
    rows = list(csv.reader(io.StringIO(txt.lstrip("﻿")), delimiter=";"))
    cap, rows = rows[0], rows[1:]
    d = pd.DataFrame(rows, columns=cap[: len(rows[0])] if rows else cap)
    d["zona"] = d.iloc[:, 0].map(_zona)
    d = d[d["zona"].notna()].copy()
    d["valor"] = pd.to_numeric(d.iloc[:, -2].str.replace(".", "", regex=False).str.replace(",", ".", regex=False), errors="coerce")
    d["any"] = pd.to_numeric(d["periodo"] if "periodo" in d else d.iloc[:, -3], errors="coerce")
    return d.dropna(subset=["any"])


def _detinguts(sal) -> str:
    tot = _mir("03002")
    tot = tot.rename(columns={tot.columns[1]: "tipologia"})[["zona", "tipologia", "any", "valor"]]
    tot["sexe"], tot["nac"] = "Ambos sexos", "Total"
    ext = _mir("03006")
    ext = ext.rename(columns={ext.columns[1]: "tipologia", ext.columns[2]: "sexe"})[["zona", "tipologia", "sexe", "any", "valor"]]
    ext["nac"] = "Extranjera"
    d = pd.concat([tot, ext], ignore_index=True)
    d["any"] = d["any"].astype(int)
    d.to_csv(sal / "detinguts.csv", index=False)
    pa = _mir("03008")
    pa = pa.rename(columns={pa.columns[1]: "pais", pa.columns[2]: "sexe"})
    pa = pa[pa["sexe"].str.contains("Ambos", case=False)][["zona", "pais", "any", "valor"]]
    pa["any"] = pa["any"].astype(int)
    pa.to_csv(sal / "detinguts_pais.csv", index=False)
    return f"Interior detenciones: {len(d)} filas ({d['any'].min()}-{d['any'].max()}), países {pa['pais'].nunique()}"


def ejecutar() -> str:
    sal = carpeta("condemnats")
    lineas = []
    for f in (_condemnats, _poblacio, _detinguts):
        try:
            lineas.append(f(sal))
        except Exception as e:  # noqa: BLE001
            lineas.append(f"ERROR {f.__name__}: {type(e).__name__}: {str(e)[:200]}")
    return "\n".join(lineas)
