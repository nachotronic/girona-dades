"""Ámbito territorial de la ejecución: qué provincias se descargan y procesan.

Se elige con la variable de entorno AMBITO (códigos INE de provincia separados por comas).
Por defecto es Girona ("17"), así que sin la variable todo se comporta como hasta ahora.
  AMBITO=17               Girona
  AMBITO=08,17,25,43      Cataluña

La clave "gi" de los ficheros de agregados sigue significando «el total del ámbito» para
no romper construir_web.py; se renombrará cuando la web sepa trabajar con varias provincias.
"""
from __future__ import annotations

import os

import pandas as pd

PROVINCIAS = {
    "08": {"nom": "Barcelona", "ccaa": "09", "dgt": "B"},
    "17": {"nom": "Girona", "ccaa": "09", "dgt": "GI", "alt": ["Gerona"]},
    "25": {"nom": "Lleida", "ccaa": "09", "dgt": "L", "alt": ["Lérida"]},
    "43": {"nom": "Tarragona", "ccaa": "09", "dgt": "T"},
}

AMBITO: list[str] = [p.strip().zfill(2) for p in os.environ.get("AMBITO", "17").split(",") if p.strip()]
desconocidas = [p for p in AMBITO if p not in PROVINCIAS]
if desconocidas:
    raise ValueError(f"AMBITO con provincias no configuradas: {desconocidas}")

CCAA = sorted({PROVINCIAS[p]["ccaa"] for p in AMBITO})
NOMBRE = "Girona" if AMBITO == ["17"] else ("Catalunya" if sorted(AMBITO) == ["08", "17", "25", "43"] else ", ".join(PROVINCIAS[p]["nom"] for p in AMBITO))


def en_ambito(codigos: pd.Series) -> pd.Series:
    """Máscara de los códigos INE (municipio, sección o provincia) que caen en el ámbito."""
    return codigos.astype(str).str.zfill(2).str[:2].isin(AMBITO)


def es_del_ambito(codigo: str) -> bool:
    return str(codigo).zfill(2)[:2] in AMBITO


def nombres_provincia() -> list[str]:
    """Nombres con que el INE y otras fuentes llaman a las provincias del ámbito."""
    return [n for p in AMBITO for n in [PROVINCIAS[p]["nom"], *PROVINCIAS[p].get("alt", [])]]


def socrata_prefijos(columna: str) -> str:
    """Condición SoQL: la columna empieza por alguno de los códigos de provincia del ámbito.

    Algunos conjuntos guardan el código sin el cero inicial (Barcelona = 8xxx), así que para
    las provincias que empiezan por 0 se aceptan las dos formas. En Cataluña no hay ambigüedad:
    ningún otro código de provincia catalana empieza por 8.
    """
    pref = [x for p in AMBITO for x in ([p, p.lstrip("0")] if p.startswith("0") else [p])]
    return "(" + " OR ".join(f"starts_with({columna}, '{x}')" for x in pref) + ")"
