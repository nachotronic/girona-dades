"""Liquidació dels pressupostos dels ens locals. Dades bàsiques (Generalitat, Socrata ytva-5kp3).

Ingresos y gastos liquidados por capítulos, por programas y principales ingresos tributarios,
en euros y en euros por habitante. Se guardan los ayuntamientos de la provincia de Girona
(codi_ens empieza por el código INE del municipio, 17xxx).
"""
from __future__ import annotations

import io

import pandas as pd

from .comun import carpeta, get
from .ambito import socrata_prefijos

URL = "https://analisi.transparenciacatalunya.cat/resource/ytva-5kp3.csv"
COLS = "any,nom_document,codi_estructura,desc_estructura,import,euros_habitant,codi_ens,nom_ens"
PAGINA = 50000


def ejecutar() -> str:
    sal = carpeta("pressupostos")
    parts, off = [], 0
    while True:
        r = get(URL, params={"$select": COLS, "$where": socrata_prefijos("codi_ens") + " AND starts_with(nom_ens,'Ajuntament')",
                             "$order": "codi_ens,any,nom_document,codi_estructura", "$limit": PAGINA, "$offset": off}, timeout=600)
        df = pd.read_csv(io.BytesIO(r.content), dtype=str)
        parts.append(df)
        if len(df) < PAGINA:
            break
        off += PAGINA
    df = pd.concat(parts, ignore_index=True)
    df["ine"] = df["codi_ens"].str[:5]
    df.to_csv(sal / "liquidacio.csv.gz", index=False)
    return f"{len(df)} filas, {df['ine'].nunique()} municipios, años {df['any'].min()}-{df['any'].max()}"
