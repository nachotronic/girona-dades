"""Valores de referencia para comparar: Cataluña (Idescat EMEX) y España (INE).

- EMEX (El municipi en xifres) devuelve, para cada municipio, el valor del municipio,
  de la comarca y de Cataluña. Se guarda la columna de Cataluña.
- INE, Atlas de distribución de renta, tablas NAC-CCAA-PROV: España, Cataluña y Girona.
"""
from __future__ import annotations

import json

from .comun import carpeta, get

EMEX = "https://api.idescat.cat/emex/v1/dades.json?id=170792&lang=cat"
INE = "https://servicios.ine.es/wstempus/js/ES/DATOS_TABLA/{}?nult=1"
TABLAS_INE = {
    "53689": "renta media y mediana",
    "53687": "fuentes de ingresos",
    "53690": "umbrales fijos",
    "53694": "umbrales relativos",
}


def _emex() -> list[dict]:
    d = get(EMEX).json()
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


def _ine(tabla: str) -> list[dict]:
    d = get(INE.format(tabla), timeout=300).json()
    res = []
    for s in d:
        nom = s.get("Nombre", "")
        if not any(k in nom for k in ("Total Nacional", "Cataluña", "Girona")):
            continue
        for p in s.get("Data", []):
            res.append({"serie": nom, "any": p.get("Anyo") or p.get("NombrePeriodo"), "valor": p.get("Valor")})
    return res


def ejecutar() -> str:
    sal = carpeta("referencies")
    lineas = []
    e = _emex()
    (sal / "emex_catalunya.json").write_text(json.dumps(e, ensure_ascii=False, indent=0), encoding="utf-8")
    lineas.append(f"EMEX: {len(e)} indicadores")
    ine = {}
    for t, nom in TABLAS_INE.items():
        try:
            ine[t] = _ine(t)
            lineas.append(f"INE {t} ({nom}): {len(ine[t])} valores")
        except Exception as ex:  # noqa: BLE001
            lineas.append(f"INE {t}: ERROR {type(ex).__name__}: {str(ex)[:150]}")
    (sal / "ine_renta.json").write_text(json.dumps(ine, ensure_ascii=False, indent=0), encoding="utf-8")
    return "\n".join(lineas)
