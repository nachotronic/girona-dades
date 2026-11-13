"""Series generales de la provincia (INE), con Cataluña y España para comparar.

Para cada tabla se guardan solo las series cuyo nombre menciona Girona, Cataluña
o el total nacional. La selección final de series se hace en construir_web.py.
"""
from __future__ import annotations

import json

from .comun import carpeta, get

API = "https://servicios.ine.es/wstempus/js/ES"
TABLAS = {
    # IPC: variación anual del índice general
    "76143": "IPC, variación anual por provincias",
    "76140": "IPC, variación anual por CCAA",
    "76134": "IPC, variación anual nacional",
    "76154": "IPC por provincias y grupos (anual)",
    # EPA
    "65349": "EPA, tasas de actividad, paro y empleo por provincia",
    # Turismo
    "2074": "Hoteles, viajeros y pernoctaciones por CCAA y provincias",
    "2062": "Campings, viajeros y pernoctaciones por provincias",
    # Compraventas (ETDP)
    "6150": "ETDP compraventa de viviendas (mensual)",
    "6155": "ETDP compraventa de viviendas (anual)",
    "49280": "ETDP compraventa de viviendas",
    "6149": "ETDP viviendas transmitidas",
    # Ejecuciones hipotecarias
    "10744": "Viviendas con ejecución hipotecaria por provincia",
    # Sociedades mercantiles
    "6454": "Sociedades constituidas por provincias",
    "6464": "Sociedades disueltas por provincias",
}
ZONAS = ("Girona", "Gerona", "Cataluña", "Catalunya", "Total Nacional", "Nacional", "Total nacional")


def _tabla(ident: str, nult: int = 400) -> list[dict]:
    d = get(f"{API}/DATOS_TABLA/{ident}?nult={nult}", timeout=600).json()
    res = []
    for s in d:
        nom = s.get("Nombre", "")
        if not any(z in nom for z in ZONAS):
            continue
        res.append({"nom": nom, "d": [[p.get("Anyo"), p.get("FK_Periodo"), p.get("Valor")] for p in s.get("Data", [])]})
    return res


def ejecutar() -> str:
    sal = carpeta("provincia")
    lineas, tot = [], {}
    tablas = dict(TABLAS)
    # Hipotecas: se buscan las tablas provinciales de la operación (código numérico 40)
    try:
        for t in get(f"{API}/TABLAS_OPERACION/40").json():
            n = t["Nombre"]
            if "provincia" in n.lower() and "vivienda" in n.lower():
                tablas[str(t["Id"])] = "Hipotecas: " + n
    except Exception as e:  # noqa: BLE001
        lineas.append(f"hipotecas (lista de tablas): ERROR {e}")
    for ident, nom in tablas.items():
        try:
            s = _tabla(ident)
            tot[ident] = {"nom": nom, "series": s}
            lineas.append(f"{ident} {nom}: {len(s)} series")
        except Exception as e:  # noqa: BLE001
            lineas.append(f"{ident} {nom}: ERROR {type(e).__name__}: {str(e)[:120]}")
    (sal / "ine_series.json").write_text(json.dumps(tot, ensure_ascii=False), encoding="utf-8")
    return "\n".join(lineas)
