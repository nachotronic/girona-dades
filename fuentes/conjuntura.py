"""Coyuntura mensual del mercado de trabajo (SEPE): paro registrado, contratos y
demandantes de empleo por municipio.

El SEPE publica un CSV por año con todos los municipios de España (~10 MB). Por cada año
se guarda:
  data/processed/conjuntura/sepe_<tipo>_<año>.csv      filas de los municipios de Girona
  data/processed/conjuntura/sepe_totals_<tipo>_<año>.csv sumas mensuales de Girona,
                                                         Cataluña y España
Los años cerrados que ya están guardados no se vuelven a descargar.

El SEPE oculta los valores de 1 a 4 como "<5": en los municipios se guardan tal cual y
en las sumas cuentan como 2,5.
"""
from __future__ import annotations

import datetime as dt
import io

import pandas as pd

from .comun import carpeta, get

URL = "https://sede.sepe.gob.es/es/portaltrabaja/resources/sede/datos_abiertos/datos/{fichero}_{any}_csv.csv"
TIPUS = {
    "paro": "Paro_por_municipios",
    "contratos": "Contratos_por_municipios",
    "dtes": "Dtes_empleo_por_municipios",
}
# Columnas por posición (los nombres cambian de un año a otro)
COLS = {
    "paro": ["total", "h_25", "h_25_45", "h_45", "d_25", "d_25_45", "d_45", "agri", "ind", "cons", "serv", "sense"],
    "contratos": ["total", "h_indef", "h_temp", "h_conv", "d_indef", "d_temp", "d_conv", "agri", "ind", "cons", "serv"],
    "dtes": ["total", "h_25", "h_25_45", "h_45", "d_25", "d_25_45", "d_45", "agri", "ind", "cons", "serv", "sense"],
}
DESDE = 2019
# El SEPE publica el fichero de contratos de 2019 vacío: empieza en 2020
DESDE_TIPUS = {"contratos": 2020}


def _llegeix(contingut: bytes, tipus: str) -> pd.DataFrame:
    text = contingut.decode("latin-1")
    linies = text.splitlines()
    # La cabecera es la primera línea que empieza por "Código mes"
    ini = next(i for i, l in enumerate(linies[:10]) if l.lower().startswith(("código mes", "codigo mes")))
    df = pd.read_csv(io.StringIO("\n".join(linies[ini + 1:])), sep=";", header=None, dtype=str)
    df = df.dropna(how="all")
    n = len(COLS[tipus])
    df = df.iloc[:, : 8 + n]
    df.columns = ["mes", "mes_nom", "ca", "ca_nom", "prov", "prov_nom", "ine", "nom"] + COLS[tipus]
    df = df[df["mes"].str.strip().str.fullmatch(r"\d{6}", na=False)].copy()
    for c in ("mes", "ca", "prov", "ine", "nom"):
        df[c] = df[c].str.strip()
    df["ine"] = df["ine"].str.zfill(5)
    df["prov"] = df["prov"].str.zfill(2)
    return df


def _numeric(s: pd.Series) -> pd.Series:
    s = s.astype(str).str.strip().str.replace(".", "", regex=False)
    return pd.to_numeric(s.where(s != "<5", "2.5"), errors="coerce")


def _totals(df: pd.DataFrame, tipus: str) -> pd.DataFrame:
    num = df[COLS[tipus]].apply(_numeric)
    num["mes"] = df["mes"]
    parts = []
    for ambit, mask in (("gi", df["prov"] == "17"), ("cat", df["ca"].astype(str).str.strip().isin(["9", "09"])), ("esp", slice(None))):
        g = num[mask].groupby("mes").sum(numeric_only=True).round(0).reset_index()
        g.insert(1, "ambit", ambit)
        parts.append(g)
    return pd.concat(parts)


def ejecutar() -> str:
    sal = carpeta("conjuntura")
    avui = dt.date.today()
    lineas = []
    for tipus, fichero in TIPUS.items():
        for any_ in range(DESDE_TIPUS.get(tipus, DESDE), avui.year + 1):
            desti = sal / f"sepe_{tipus}_{any_}.csv"
            tancat = any_ < avui.year - (1 if avui.month <= 2 else 0)
            if tancat and desti.exists() and (sal / f"sepe_totals_{tipus}_{any_}.csv").exists():
                lineas.append(f"{tipus} {any_}: ya guardado")
                continue
            try:
                r = get(URL.format(fichero=fichero, any=any_), timeout=600)
                df = _llegeix(r.content, tipus)
                gi = df[df["prov"] == "17"].drop(columns=["ca", "ca_nom", "prov", "prov_nom", "mes_nom"])
                gi.to_csv(desti, index=False)
                _totals(df, tipus).to_csv(sal / f"sepe_totals_{tipus}_{any_}.csv", index=False)
                meses = sorted(df["mes"].unique())
                lineas.append(f"{tipus} {any_}: {len(gi)} filas de Girona, meses {meses[0]}-{meses[-1]}")
            except Exception as e:  # noqa: BLE001
                lineas.append(f"{tipus} {any_}: ERROR {type(e).__name__}: {str(e)[:120]}")
    return "\n".join(lineas)
