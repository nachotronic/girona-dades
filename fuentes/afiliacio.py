"""Afiliaciones a la Seguridad Social por municipio de residencia (Idescat, tabla afi 8703).

Régimen general y régimen especial de autónomos (RETA) a último día de mes: mensual desde
mayo de 2020, trimestral antes. Se guarda en formato largo:
  data/processed/conjuntura/afiliacio.csv   mes, ambit (código INE o 'gi'/'cat'), reg, valor
"""
from __future__ import annotations

import pandas as pd

from .comun import carpeta, get
from .ambito import AMBITO
from .nacionalitat import _jsonstat
from .territorio import municipios

NODE = "https://api.idescat.cat/taules/v2/afi/8603/8703"
REG = {"REG_GRL_SP_COALMINING": "rg", "REG_SP_SELF_EMPL_WORK": "reta"}


def _taula(d: dict, ambit: str) -> pd.DataFrame:
    df = _jsonstat(d)
    reg = next(c for c in df.columns if c.startswith("CON_REG"))
    df = df[df[reg].isin(REG)]
    return pd.DataFrame({"mes": df["MONTH"].str.replace("M", "-"), "ambit": ambit, "reg": df[reg].map(REG), "valor": df["valor"]})


def ejecutar() -> str:
    sal = carpeta("conjuntura")
    parts, errors = [], 0
    for _, m in municipios().iterrows():
        try:
            parts.append(_taula(get(f"{NODE}/mun/data?lang=ca&MUN={m['codi_idescat']}", pausa=0.15).json(), m["codi_ine"]))
        except Exception:  # noqa: BLE001
            errors += 1
    linies = []
    for nivell, filtre, ambit in [*(("prov", f"&PROV={p}", "gi" if AMBITO == ["17"] else p) for p in AMBITO), ("cat", "", "cat")]:
        try:
            parts.append(_taula(get(f"{NODE}/{nivell}/data?lang=ca{filtre}").json(), ambit))
        except Exception as e:  # noqa: BLE001
            linies.append(f"{nivell}: ERROR {type(e).__name__}: {str(e)[:150]}")
    df = pd.concat(parts).dropna(subset=["valor"])
    df.to_csv(sal / "afiliacio.csv", index=False)
    linies.insert(0, f"{df['ambit'].nunique()} ámbitos, meses {df['mes'].min()}-{df['mes'].max()}, {errors} errores")
    return "\n".join(linies)
