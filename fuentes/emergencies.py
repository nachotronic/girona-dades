"""Emergencias: divisiones de Agents Rurals y Bombers (Idescat), actuaciones de Bombers e incendios forestales.

- Idescat, Codis territorials (novetat 13/11/2026):
    ?id=50&n=87  áreas regionales y básicas de los Agents Rurals, con sus municipios
    ?id=50&n=88  regiones de emergencias de los Bombers de la Generalitat, con sus municipios
- Socrata Generalitat:
    g2ay-3vnj  actuaciones de los Bombers por municipio (desde 2010)
    bks7-dkfd  incendios forestales 2011-2024 (municipio de inicio, hectáreas)
    crs7-idxi  incendios forestales del año anterior (provisional)

Las geometrías de las áreas básicas de Agents Rurals se construyen uniendo los
municipios de la provincia según la relación de Idescat.
"""
from __future__ import annotations

import io
import urllib.parse

import pandas as pd

from .comun import PROC, carpeta, get

DOMINIO = "https://analisi.transparenciacatalunya.cat"
CODIS = "https://www.idescat.cat/codis/?id=50&n={n}&f=ssv"


def soql(ident: str, **params) -> pd.DataFrame:
    params.setdefault("$limit", 2_000_000)
    r = get(f"{DOMINIO}/resource/{ident}.csv?{urllib.parse.urlencode(params)}", timeout=900)
    return pd.read_csv(io.BytesIO(r.content), dtype=str, low_memory=False)


def parse_codis(texto: str, nivells: dict[str, str]) -> pd.DataFrame:
    """Recorre el fichero anidado de Idescat y devuelve una fila por municipio con sus áreas.

    `nivells` traduce el nombre del nivel del fichero a un prefijo de columna.
    """
    actual: dict[str, str] = {}
    files = []
    for linia in texto.splitlines():
        c = [x.strip() for x in linia.split(";")]
        if len(c) < 3:
            continue
        nivell = c[0].lstrip("﻿")
        if nivell in nivells:
            p = nivells[nivell]
            actual[f"{p}_codi"], actual[f"{p}_nom"] = c[1], c[2]
            if len(c) > 3 and c[3]:
                actual[f"{p}_acron"] = c[3]
        elif nivell == "Municipi" and c[1].isdigit():
            files.append({"idescat": c[1], "ine": c[1][:5], "nom": c[2], **actual})
    return pd.DataFrame(files)


def relacio() -> pd.DataFrame:
    ar = parse_codis(get(CODIS.format(n=87)).content.decode("utf-8-sig"), {
        "Àrees regionals dels agents rurals": "arr", "Àrees bàsiques dels agents rurals": "aar"})
    bo = parse_codis(get(CODIS.format(n=88)).content.decode("utf-8-sig"), {"Regió emergència": "reb"})
    return ar.merge(bo.drop(columns=["nom", "idescat"]), on="ine", how="outer")


def geometries(rel: pd.DataFrame, sal) -> str:
    import geopandas as gpd

    mun = gpd.read_file(PROC / "geo" / "municipis.geojson").to_crs(25831)
    mun["ha"] = mun.area / 10_000
    mun[["ine", "ha"]].to_csv(sal / "superficie_municipis.csv", index=False)
    g = mun.merge(rel[["ine", "aar_codi", "aar_nom", "arr_nom"]], on="ine", how="left")
    sense = g[g["aar_codi"].isna()]["ine"].tolist()
    g = g.dropna(subset=["aar_codi"]).dissolve(by=["aar_codi", "aar_nom", "arr_nom"], as_index=False, aggfunc={"ha": "sum"})
    g["geometry"] = g.buffer(0).simplify(40, preserve_topology=True)
    g.to_crs(4326)[["aar_codi", "aar_nom", "arr_nom", "ha", "geometry"]].to_file(
        sal / "aar.geojson", driver="GeoJSON", COORDINATE_PRECISION=5)
    return f"{len(g)} áreas básicas de Agents Rurals en la provincia: {', '.join(g['aar_nom'])}; municipios sin área: {sense}"


def ejecutar() -> str:
    sal = carpeta("emergencies")
    lineas = []
    rel = relacio()
    rel.to_csv(sal / "municipis_arees.csv", index=False)
    gi = rel[rel["ine"].str.startswith("17")]
    lineas.append(f"relación Idescat: {len(rel)} municipios ({len(gi)} con código 17); "
                  f"regiones Bombers en Girona: {gi.groupby('reb_nom').size().to_dict()}; "
                  f"áreas regionales AR: {gi.groupby('arr_nom').size().to_dict()}")
    lineas.append(geometries(rel, sal))

    # Actuaciones de Bombers por municipio, año y grupo (toda Cataluña, para comparar)
    a = soql("g2ay-3vnj", **{"$select": "codi_ine, any, tga_nom_grupo, count(*) as n",
                              "$group": "codi_ine, any, tga_nom_grupo"})
    a.to_csv(sal / "actuacions_bombers.csv.gz", index=False)
    lim = soql("g2ay-3vnj", **{"$select": "any, min(act_dat_actuacio) as ini, max(act_dat_actuacio) as fi, count(*) as n",
                                "$group": "any", "$order": "any"})
    lim.to_csv(sal / "actuacions_bombers_anys.csv", index=False)
    lineas.append(f"actuaciones Bombers: {len(a)} filas; códigos de ejemplo {a['codi_ine'].dropna().head(3).tolist()}; "
                  f"grupos {sorted(a['tga_nom_grupo'].dropna().unique())}")
    lineas.append("años: " + "; ".join(f"{x['any']} {str(x['ini'])[:10]}→{str(x['fi'])[:10]} ({x['n']})" for _, x in lim.tail(4).iterrows()))

    # Incendios forestales (histórico validado + año anterior provisional)
    inc = soql("bks7-dkfd")
    inc["font"] = "bks7-dkfd"
    try:
        ant = soql("crs7-idxi")
        ant = ant.rename(columns={"ha_forestals": "haforestal", "ha_no_forestals": "hanoforest", "ha_arbrades": "haarbrades",
                                  "ha_no_arbrades": "hanoarbrad", "terme_municipal": "termemunic"})
        ant["font"] = "crs7-idxi"
        inc = pd.concat([inc, ant], ignore_index=True)
    except Exception as e:  # noqa: BLE001
        lineas.append(f"AVISO año anterior: {e}")
    inc["any"] = pd.to_datetime(inc["data_incendi"], errors="coerce").dt.year
    inc = inc.drop_duplicates(subset=["codi_municipi", "data_incendi", "haforestal", "hanoforest"])
    inc.to_csv(sal / "incendis_forestals.csv.gz", index=False)
    lineas.append(f"incendios forestales: {len(inc)} ({inc['any'].min():.0f}-{inc['any'].max():.0f}); "
                  f"códigos de ejemplo {inc['codi_municipi'].dropna().head(3).tolist()}; columnas {list(inc.columns)}")
    return "\n".join(lineas)
