"""Parque de vehículos por municipio (DGT, «Datos municipales. Información general»).

Un Excel anual con todos los municipios de España: población, censo de conductores, parque
por tipo, antigüedad, carburante y distintivo ambiental. Se guarda:
  data/processed/vehicles/dgt_mun_<año>.csv   municipios de Girona, columnas cortas
  data/processed/vehicles/agregats.csv        any, ambit (gi/cat/esp) y las mismas columnas sumadas
Los años ya guardados no se vuelven a descargar (salvo el último, por si se corrige).
"""
from __future__ import annotations

import datetime as dt
import io

import pandas as pd

from .comun import carpeta, get

URL = ("https://www.dgt.es/export/sites/web-DGT/.galleries/downloads/dgt-en-cifras/informacion_municipal/"
       "Datos-municipales-general/DatosMunicipalesGeneral_{}.xlsx")
DESDE = 2020
COLS = {
    "Población Total": "pob", "Censo Conductores": "cond",
    "Parque Ciclomotores": "cicl", "Parque Motocicletas": "moto", "Parque Turismos": "tur",
    "Parque Furgonetas": "furg", "Parque Camiones": "cam", "Parque Total": "total",
    "Parque Turismos (<4 años)": "tur_4", "Parque Turismos (<25 años)": "tur_25",
    "Antigüedad Media del Parque (<25 años)": "antig", "Antigüedad Media de Turismos": "antig_tur",
    "Gasolina": "gasolina", "Diesel": "diesel", "Electrificado": "elec", "GLP (Gas Licuado del Petroleo)": "glp",
    "GNL (Gas Natural Licuado)": "gnl", "Otros Tipos de Propulsión": "altres",
    "Distintivo B": "dist_b", "Distintivo C": "dist_c", "Distintivo ECO": "dist_eco", "Distintivo 0": "dist_0",
    "Sin Distintivo": "sense_dist",
}
MITJANES = {"antig": "tur_25", "antig_tur": "tur_25"}  # medias: se agregan ponderadas


def _any(a: int) -> tuple[pd.DataFrame, pd.DataFrame]:
    df = pd.read_excel(io.BytesIO(get(URL.format(a), timeout=300).content), header=0)
    df.columns = [str(c).strip() for c in df.columns]
    falta = [c for c in COLS if c not in df.columns]
    if falta:
        raise ValueError(f"columnas que faltan: {falta[:4]}")
    df = df.rename(columns=COLS)
    df["ine"] = pd.to_numeric(df["Código INE"], errors="coerce").astype("Int64").astype(str).str.zfill(5)
    num = list(COLS.values())
    df[num] = df[num].apply(pd.to_numeric, errors="coerce")
    gi = df[(df["Provincia"].astype(str).str.strip() == "Girona") & (df["ine"] != "17000")]
    agr = []
    for ambit, d in (("gi", df[df["Provincia"].astype(str).str.strip() == "Girona"]),
                     ("cat", df[df["Comunidad Autónoma"].astype(str).str.strip() == "Cataluña"]), ("esp", df)):
        fila = {"any": a, "ambit": ambit}
        for c in num:
            if c in MITJANES:
                w = d[MITJANES[c]].where(d[c].notna())
                fila[c] = round(float((d[c] * w).sum() / w.sum()), 3) if w.sum() else None
            else:
                fila[c] = float(d[c].sum())
        agr.append(fila)
    return gi[["ine", *num]], pd.DataFrame(agr)


def ejecutar() -> str:
    sal = carpeta("vehicles")
    fa = sal / "agregats.csv"
    agr = pd.read_csv(fa) if fa.exists() else pd.DataFrame(columns=["any", "ambit"])
    linies = []
    ultim = max([a for a in range(DESDE, dt.date.today().year + 1) if (sal / f"dgt_mun_{a}.csv").exists()] or [DESDE - 1])
    for a in range(DESDE, dt.date.today().year + 1):
        desti = sal / f"dgt_mun_{a}.csv"
        if desti.exists() and a < ultim:
            continue
        try:
            gi, ag = _any(a)
        except Exception as e:  # noqa: BLE001
            linies.append(f"{a}: {type(e).__name__}: {str(e)[:100]}")
            continue
        gi.to_csv(desti, index=False)
        agr = pd.concat([agr[agr["any"] != a], ag])
        t = ag.set_index("ambit")["total"]
        linies.append(f"{a}: {len(gi)} municipios, parque Girona {t['gi']:.0f}, Cataluña {t['cat']:.0f}, España {t['esp']:.0f}")
    agr.sort_values(["any", "ambit"]).to_csv(fa, index=False)
    return "\n".join(linies)
