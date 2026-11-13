"""Idescat, El municipi en xifres (EMEX): todos los indicadores de cada municipio,
con el valor de su comarca y de Cataluña. Se guarda en formato largo."""
from __future__ import annotations

import time

import pandas as pd

from .comun import carpeta, get
from .territorio import municipios

URL = "https://api.idescat.cat/emex/v1/dades.json?id={}&lang=cat"


def _fitxa(codi: str) -> list[dict]:
    d = get(URL.format(codi), timeout=60).json()
    res = []

    def walk(o, ctx=""):
        if isinstance(o, dict):
            if "v" in o and str(o.get("id", "")).startswith("f"):
                v = str(o["v"]).split(",")
                res.append({"id": o["id"], "nom": o.get("calt"), "u": o.get("u", ""), "any": o.get("r") or ctx,
                            "mun": v[0], "com": v[1] if len(v) > 1 else None, "cat": v[2] if len(v) > 2 else None})
            ctx2 = str(o.get("r", ctx)) if "ff" in o else ctx
            for x in o.values():
                walk(x, ctx2)
        elif isinstance(o, list):
            for x in o:
                walk(x, ctx)

    walk(d)
    return res


def ejecutar() -> str:
    sal = carpeta("emex")
    filas, errores = [], []
    for _, m in municipios().iterrows():
        try:
            for x in _fitxa(m["codi_idescat"]):
                x["ine"] = m["codi_ine"]
                filas.append(x)
        except Exception as e:  # noqa: BLE001
            errores.append(f"{m['nom']}: {type(e).__name__}")
        time.sleep(0.2)
    df = pd.DataFrame(filas)
    df.to_csv(sal / "emex_municipis.csv.gz", index=False)
    return f"{df['ine'].nunique() if len(df) else 0} municipios, {len(df)} valores; errores: {errores[:10]}"
