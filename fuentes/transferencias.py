"""Vehículos de segunda mano: transferencias (cambios de titularidad) de la DGT, microdatos mensuales.

Es la misma fuente que usan Ganvam y Faconauto para sus «ventas de vehículos de ocasión».
Cada mes es un ZIP de ~40 MB con un fichero de ancho fijo de toda España (714 caracteres por
registro, mismo diseño que MATRABA; diseño de registro: TRANSFERENCIAS_MATRABA.pdf). Se guardan:
  data/processed/conjuntura/dgt/trf_<aaaamm>.csv       ine, tipus, edat, empresa, n   (provincia de Girona)
  data/processed/conjuntura/dgt/trf_prov_<aaaamm>.csv  prov, tipus, n                 (todas las provincias)
«ine» y «prov» son los del domicilio del vehículo, es decir, del nuevo titular. «edat» es la antigüedad
del vehículo en años completos en el mes de la transferencia (0-4, 5-9, 10-14, 15+), contada desde la
primera matriculación (o la de España si falta). «empresa» = titular persona jurídica.
Los meses ya guardados no se vuelven a descargar.
"""
from __future__ import annotations

import datetime as dt
import io
import zipfile
from collections import Counter

import pandas as pd

from .comun import carpeta, get
from .dgt import _tipus

URL = "https://www.dgt.es/microdatos/salida/{a}/{m}/vehiculos/transferencias/export_mensual_trf_{a}{m:02d}.zip"
DESDE = (2015, 1)
# Posiciones (base 0) del diseño de registro
FEC_MAT, TIPUS, PROV, MUN, PRIM, PJ = slice(0, 8), slice(91, 93), slice(152, 154), slice(192, 197), slice(170, 178), 179


def _edat(linia: str, a: int, m: int) -> str:
    f = linia[PRIM].strip() or linia[FEC_MAT]
    try:
        anys = (a * 12 + m - (int(f[4:8]) * 12 + int(f[2:4]))) // 12
    except ValueError:
        return "nd"
    if anys < 0 or anys > 80:
        return "nd"
    return "0-4" if anys < 5 else "5-9" if anys < 10 else "10-14" if anys < 15 else "15+"


def _mes(a: int, m: int) -> tuple[pd.DataFrame, pd.DataFrame]:
    r = get(URL.format(a=a, m=m), timeout=900)
    z = zipfile.ZipFile(io.BytesIO(r.content))
    gi, prov = Counter(), Counter()
    for nom in z.namelist():
        with z.open(nom) as f:
            for linia in io.TextIOWrapper(f, encoding="latin-1"):
                if len(linia) < 200:
                    continue
                tipus = _tipus(linia[TIPUS])
                p = linia[PROV].strip()
                prov[(p, tipus)] += 1
                if p != "GI":
                    continue
                ine = linia[MUN]
                ine = ine if ine.startswith("17") else "17000"
                gi[(ine, tipus, _edat(linia, a, m), linia[PJ] == "X")] += 1
    if not gi:
        raise ValueError("ningún registro de Girona: ¿ha cambiado el formato?")
    return (pd.DataFrame([(*k, n) for k, n in gi.items()], columns=["ine", "tipus", "edat", "empresa", "n"]),
            pd.DataFrame([(*k, n) for k, n in prov.items()], columns=["prov", "tipus", "n"]))


def ejecutar() -> str:
    sal = carpeta("conjuntura", "dgt")
    avui = dt.date.today()
    a, m = DESDE
    linies, nous = [], 0
    while (a, m) < (avui.year, avui.month):
        desti, desti_p = sal / f"trf_{a}{m:02d}.csv", sal / f"trf_prov_{a}{m:02d}.csv"
        if not (desti.exists() and desti_p.exists()):
            try:
                df, dp = _mes(a, m)
                df.to_csv(desti, index=False)
                dp.to_csv(desti_p, index=False)
                nous += 1
                tur = df[df["tipus"] == "turisme"]
                linies.append(f"{a}-{m:02d}: {int(tur['n'].sum())} turismos transferidos en Girona")
            except Exception as e:  # noqa: BLE001
                # El mes en curso aún no está publicado: no es un error
                if (a, m) == ((avui.year, avui.month - 1) if avui.month > 1 else (avui.year - 1, 12)) and "404" in str(e):
                    linies.append(f"{a}-{m:02d}: aún no publicado")
                else:
                    linies.append(f"{a}-{m:02d}: ERROR {type(e).__name__}: {str(e)[:100]}")
        a, m = (a + 1, 1) if m == 12 else (a, m + 1)
    return f"{nous} meses nuevos\n" + "\n".join(linies[-40:])
