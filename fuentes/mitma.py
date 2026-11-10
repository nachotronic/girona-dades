"""Boletín estadístico del Ministerio de Transportes/Vivienda: tablas Excel con URL fija.

Las tablas provinciales se guardan completas. De las municipales se guardan las filas
de los municipios de Girona (por nombre) o que mencionan Girona.
"""
from __future__ import annotations

import pathlib

import pandas as pd
import yaml

from .comun import RAIZ, RAW, carpeta, descargar, normaliza, slug
from .territorio import municipios

URL = "https://apps.fomento.gob.es/BoletinOnline2/sedal/{codigo}.XLS"


def _codigos() -> dict[str, list[str]]:
    reg = yaml.safe_load((RAIZ / "fuentes.yml").read_text(encoding="utf-8"))
    res = {"municipio": [], "provincia": []}
    for f in reg["vivienda"]:
        if f["id"].startswith("mitma_"):
            res["municipio"] += f.get("tablas_municipio", []) + f.get("tablas_tamano_municipio", [])
            res["provincia"] += f.get("tablas_provincia", [])
    return res


PROVINCIAS_SIGUIENTES = {"huesca", "lleida", "lerida", "tarragona", "barcelona", "teruel", "zaragoza"}


def _filtra(df: pd.DataFrame, nombres: set[str]) -> pd.DataFrame:
    """Las tablas municipales agrupan los municipios bajo una fila con el nombre de la
    provincia. Se toman las filas entre la cabecera 'Girona' y la siguiente provincia."""
    primera = df.iloc[:, 0].astype(str).str.strip()
    vacias = df.iloc[:, 1:].isna().all(axis=1)
    cabeceras = [i for i, (v, vac) in enumerate(zip(primera, vacias)) if vac and v not in ("", "nan")]
    ini = next((i for i in cabeceras if normaliza(primera.iloc[i]) in {"girona", "gerona"}), None)
    if ini is None:
        # Sin cabecera de provincia: filas que nombran municipios de Girona
        return df[primera.map(normaliza).isin(nombres)]
    fin = next((i for i in cabeceras if i > ini and normaliza(primera.iloc[i]) not in nombres), len(df))
    return df.iloc[ini:fin]


def ejecutar() -> str:
    salida = carpeta("mitma")
    nombres = set(municipios()["nom_normalitzat"]) - {""}
    lineas = []
    for nivel, codigos in _codigos().items():
        for codigo in codigos:
            try:
                xls = descargar(URL.format(codigo=codigo), RAW / "mitma" / f"{codigo}.xls")
                hojas = pd.read_excel(xls, sheet_name=None, header=None, dtype=str)
                filas = 0
                for hoja, df in hojas.items():
                    df = df.dropna(how="all").dropna(axis=1, how="all")
                    if nivel == "municipio":
                        # Conservar las filas de cabecera (primeras 8) para poder interpretar columnas
                        df = pd.concat([df.head(8), _filtra(df.iloc[8:], nombres)])
                    df.to_csv(salida / f"{codigo}_{slug(str(hoja), 30)}.csv", index=False, header=False)
                    filas += len(df)
                lineas.append(f"{codigo} ({nivel}): {len(hojas)} hojas, {filas} filas")
            except Exception as e:  # noqa: BLE001
                lineas.append(f"{codigo}: ERROR {type(e).__name__}: {str(e)[:120]}")
    return "\n".join(lineas)
