"""INE: Atlas de distribución de renta de los hogares (operación ADRH) para Girona.

El INE publica una tabla por provincia con el mismo nombre. Para encontrar las de
Girona se miran las primeras series de cada tabla y se comprueba si sus nombres son
municipios de la provincia. El resultado se guarda en tablas_girona.json para no
repetir la búsqueda.
"""
from __future__ import annotations

import io
import json

import pandas as pd

from .comun import RAW, carpeta, get, normaliza
from .territorio import municipios

API = "https://servicios.ine.es/wstempus/js/ES"
CSV = "https://www.ine.es/jaxiT3/files/t/es/csv_bdsc/{id}.csv"


def _tablas_girona(salida) -> list[dict]:
    cache = salida / "tablas_girona.json"
    if cache.exists():
        return json.loads(cache.read_text())
    nombres = set(municipios()["nom_normalitzat"])
    tablas = get(f"{API}/TABLAS_OPERACION/ADRH").json()
    encontradas = []
    for t in tablas:
        try:
            series = get(f"{API}/SERIES_TABLA/{t['Id']}", params={"page": 1}, pausa=0.3).json()
        except Exception:  # noqa: BLE001
            continue
        cabezas = {normaliza(s.get("Nombre", "").split(".")[0].split(" sección")[0].split(" distrito")[0]) for s in series[:300]}
        aciertos = len(cabezas & nombres)
        if aciertos >= 5:
            encontradas.append({"id": t["Id"], "nombre": t["Nombre"], "aciertos": aciertos})
    cache.write_text(json.dumps(encontradas, ensure_ascii=False, indent=1))
    return encontradas


def ejecutar() -> str:
    salida = carpeta("ine", "atlas_renta")
    tablas = _tablas_girona(salida)
    lineas = [f"{len(tablas)} tablas del Atlas para Girona"]
    for t in tablas:
        try:
            r = get(CSV.format(id=t["id"]), timeout=900)
            (RAW / "ine").mkdir(parents=True, exist_ok=True)
            (RAW / "ine" / f"{t['id']}.csv").write_bytes(r.content)
            df = pd.read_csv(io.BytesIO(r.content), sep=";", dtype=str, encoding="utf-8-sig")
            df.to_csv(salida / f"{t['id']}.csv.gz", index=False, compression="gzip")
            lineas.append(f"{t['id']} {t['nombre']}: {len(df)} filas")
        except Exception as e:  # noqa: BLE001
            lineas.append(f"{t['id']}: ERROR {type(e).__name__}: {str(e)[:120]}")
    return "\n".join(lineas)
