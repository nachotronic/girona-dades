"""Matriculaciones de vehículos (DGT, microdatos mensuales MATRABA).

Cada mes es un ZIP de ~16 MB con un fichero de ancho fijo de toda España (~120 MB). Se
cuentan los vehículos con domicilio en la provincia de Girona por municipio, tipo
(turismos, motos, furgonetas y camiones, resto), nuevos o usados importados y
eléctricos. Los meses ya guardados no se vuelven a descargar.
  data/processed/conjuntura/dgt/mat_<aaaamm>.csv   ine, tipus, nou, electric, n
"""
from __future__ import annotations

import datetime as dt
import io
import zipfile
from collections import Counter

import pandas as pd

from .comun import carpeta, get
from .ambito import AMBITO, PROVINCIAS, es_del_ambito

URL = "https://www.dgt.es/microdatos/salida/{a}/{m}/vehiculos/matriculaciones/export_mensual_mat_{a}{m:02d}.zip"
DESDE = (2019, 1)
# Posiciones del registro (ancho fijo, 714 caracteres)
TIPUS, PROP, PROV, MUN, NOU = slice(91, 93), 93, slice(152, 154), slice(192, 197), 178


def _tipus(c: str) -> str:
    if c == "40":
        return "turisme"
    if c[:1] == "5" or c in ("90", "91", "92"):
        return "moto"
    if c[:1] in ("1", "2"):
        return "furgo"
    return "altres"


# Código de provincia de la DGT (matrícula) -> código INE
DGT_PROV = {PROVINCIAS[p]["dgt"].ljust(2): p for p in AMBITO}


def _mes(a: int, m: int) -> pd.DataFrame:
    r = get(URL.format(a=a, m=m), timeout=600)
    z = zipfile.ZipFile(io.BytesIO(r.content))
    comptes = Counter()
    for nom in z.namelist():
        with z.open(nom) as f:
            for linia in io.TextIOWrapper(f, encoding="latin-1"):
                if len(linia) < 200 or linia[PROV] not in DGT_PROV:
                    continue
                ine = linia[MUN]
                ine = ine if es_del_ambito(ine) else DGT_PROV[linia[PROV]] + "000"
                comptes[(ine, _tipus(linia[TIPUS]), linia[NOU] == "N", linia[PROP] == "2")] += 1
    return pd.DataFrame([(*k, n) for k, n in comptes.items()], columns=["ine", "tipus", "nou", "electric", "n"])


def ejecutar() -> str:
    sal = carpeta("conjuntura", "dgt")
    avui = dt.date.today()
    a, m = DESDE
    linies, nous = [], 0
    while (a, m) < (avui.year, avui.month):
        desti = sal / f"mat_{a}{m:02d}.csv"
        if not desti.exists():
            try:
                df = _mes(a, m)
                df.to_csv(desti, index=False)
                nous += 1
                linies.append(f"{a}-{m:02d}: {int(df['n'].sum())} vehículos en Girona")
            except Exception as e:  # noqa: BLE001
                linies.append(f"{a}-{m:02d}: ERROR {type(e).__name__}: {str(e)[:100]}")
        a, m = (a + 1, 1) if m == 12 else (a, m + 1)
    return f"{nous} meses nuevos\n" + "\n".join(linies[-40:])
