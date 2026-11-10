"""Base territorial: los municipios de la provincia de Girona y su comarca (Idescat)."""
from __future__ import annotations

import io

import pandas as pd

from .comun import PROC, carpeta, get, normaliza

URL_CODIS = "https://www.idescat.cat/codis/?id=50&n=9&f=ssv"
SALIDA = PROC / "territorio" / "municipios.csv"


def parsea_codis(texto: str) -> pd.DataFrame:
    lineas = texto.lstrip("﻿").splitlines()
    inicio = next(i for i, l in enumerate(lineas) if l.startswith("Codi;"))
    df = pd.read_csv(io.StringIO("\n".join(lineas[inicio:])), sep=";", dtype=str)
    df = df.loc[:, ~df.columns.str.startswith("Unnamed")]
    df.columns = ["codi_idescat", "nom", "codi_comarca", "nom_comarca"]
    df = df[df["codi_idescat"].str.startswith("17")].copy()
    df["codi_ine"] = df["codi_idescat"].str[:5]
    df["nom_normalitzat"] = df["nom"].map(normaliza)
    return df[["codi_ine", "codi_idescat", "nom", "codi_comarca", "nom_comarca", "nom_normalitzat"]].sort_values("codi_ine")


def municipios() -> pd.DataFrame:
    """Devuelve la tabla de municipios, descargándola si hace falta."""
    if not SALIDA.exists():
        ejecutar()
    return pd.read_csv(SALIDA, dtype=str)


def ejecutar() -> str:
    r = get(URL_CODIS)
    df = parsea_codis(r.content.decode("utf-8", "replace"))
    carpeta("territorio")
    df.to_csv(SALIDA, index=False)
    return f"{len(df)} municipios, {df['codi_comarca'].nunique()} comarcas"
