"""Población por nacionalidad (INE, Estadística del Padrón Continuo, operación 188).

El INE publica una tabla por provincia con el mismo nombre; la de Girona se localiza
mirando la primera serie de cada candidata. Se usan dos:
- "Población por sexo, municipios y nacionalidad (principales nacionalidades)"
- "Población por sexo, municipios, nacionalidad (español/extranjero) y edad (grandes grupos)"
Se descarga el CSV completo (todos los años) y se guarda en largo.
"""
from __future__ import annotations

import io
import json

import pandas as pd

from .comun import carpeta, get

API = "https://servicios.ine.es/wstempus/js/ES"
CSV = "https://www.ine.es/jaxiT3/files/t/es/csv_bdsc/{id}.csv"
TABLAS = {
    "nacionalitats": "municipios y nacionalidad (principales nacionalidades)",
    "edat_nacionalitat": "municipios, nacionalidad (español/extranjero) y edad",
}


def _busca(sal) -> dict[str, int]:
    cache = sal / "tablas_girona.json"
    if cache.exists():
        return json.loads(cache.read_text())
    tablas = get(f"{API}/TABLAS_OPERACION/188", timeout=120).json()
    res = {}
    for clave, texto in TABLAS.items():
        for t in tablas:
            if texto not in t["Nombre"] or "islas" in t["Nombre"]:
                continue
            s = get(f"{API}/SERIES_TABLA/{t['Id']}", params={"page": 1}, pausa=0.2).json()
            if isinstance(s, list) and s and ". Girona." in s[0].get("Nombre", ""):
                res[clave] = t["Id"]
                break
    cache.write_text(json.dumps(res, indent=1))
    return res


def _llegeix(ident: int) -> pd.DataFrame:
    r = get(CSV.format(id=ident), timeout=900)
    df = pd.read_csv(io.BytesIO(r.content), sep=";", dtype=str, encoding="utf-8-sig")
    df.columns = [c.strip() for c in df.columns]
    mun = next(c for c in df.columns if c.startswith("Municipios"))
    df = df[df[mun].notna() & df[mun].str.match(r"^17\d{3}")].copy()
    df["ine"] = df[mun].str[:5]
    df["valor"] = pd.to_numeric(df["Total"].str.replace(".", "", regex=False).str.replace(",", ".", regex=False), errors="coerce")
    df["any"] = df["Periodo"].str[-4:]
    sexe = next((c for c in df.columns if c.startswith("Sexo")), None)
    if sexe:
        df = df[df[sexe].str.strip() == "Total"]
    return df.drop(columns=[c for c in (mun, "Total", "Periodo", sexe, "Provincias", "Total Nacional") if c and c in df.columns])


def ejecutar() -> str:
    sal = carpeta("nacionalitat")
    ids = _busca(sal)
    lineas = [f"tablas Girona: {ids}"]
    for clave, ident in ids.items():
        try:
            df = _llegeix(ident)
            df.to_csv(sal / f"{clave}.csv.gz", index=False)
            lineas.append(f"{clave} ({ident}): {len(df)} filas, años {df['any'].min()}-{df['any'].max()}, {df['ine'].nunique()} municipios; columnas {list(df.columns)}")
        except Exception as e:  # noqa: BLE001
            lineas.append(f"{clave}: ERROR {type(e).__name__}: {str(e)[:300]}")
    return "\n".join(lineas)
