"""Seguridad por Área Básica Policial (ABP) de los Mossos d'Esquadra.

- i2dd-kfpa  geometrías de las ABP
- dtpq-6fvw  relación municipio -> ABP
- qnyt-emjc  hechos penales conocidos, resueltos y detenciones por ABP y mes

Se guardan las ABP que tocan la provincia y los hechos agregados por ABP, año
y título del Código Penal para toda Cataluña (para poder comparar).
"""
from __future__ import annotations

import io

import pandas as pd

from .comun import PROC, carpeta, get, normaliza

DOMINIO = "https://analisi.transparenciacatalunya.cat"


def _csv(ident: str) -> pd.DataFrame:
    r = get(f"{DOMINIO}/api/views/{ident}/rows.csv?accessType=DOWNLOAD", timeout=900)
    return pd.read_csv(io.BytesIO(r.content), dtype=str, low_memory=False)


def clau_abp(nom: str) -> str:
    return normaliza(str(nom).replace("ABP", " ").replace("Àrea Bàsica Policial", " "))


def ejecutar() -> str:
    import geopandas as gpd
    from shapely import wkt

    sal = carpeta("policia")
    lineas = []
    rel = _csv("dtpq-6fvw")
    rel = rel.drop(columns=[c for c in rel.columns if "GEOM" in c.upper()])
    rel.to_csv(sal / "municipis_abp.csv", index=False)
    lineas.append(f"relación municipio-ABP: {len(rel)} filas, columnas {list(rel.columns)}")

    g = _csv("i2dd-kfpa")
    col = next(c for c in g.columns if "GEOM" in c.upper() or c.lower() == "the_geom")
    g = g[g[col].astype(str).str.contains("POLYGON", na=False)].copy()
    g = gpd.GeoDataFrame(g.drop(columns=[col]), geometry=g[col].map(wkt.loads), crs=4326)
    if g.total_bounds[0] > 1000:  # coordenadas proyectadas
        g = g.set_crs(25831, allow_override=True)
    prov = gpd.read_file(PROC / "geo" / "municipis.geojson").to_crs(25831)
    limit = prov.union_all() if hasattr(prov, "union_all") else prov.unary_union
    g = g.to_crs(25831)
    # Población por ABP: población de las ABS (CatSalut) repartida por superficie
    from .salut import soql
    ab = soql("tqzv-uu8e")
    acol = next(c for c in ab.columns if c.lower() in ("geometry", "the_geom", "geometria"))
    ab = ab[ab[acol].astype(str).str.contains("POLYGON", na=False)].copy()
    ab = gpd.GeoDataFrame(ab.drop(columns=[acol]), geometry=ab[acol].map(wkt.loads), crs=4326).to_crs(25831)
    ab["codi"] = ab["codi"].astype(str).str.lstrip("0")
    pa = soql("ftq4-h9vk", **{"$select": "abs_codi, any, sum(poblacio_oficial) as p", "$group": "abs_codi, any"})
    pa["any"] = pd.to_numeric(pa["any"], errors="coerce")
    pa = pa[pa["any"] == pa["any"].max()]
    pa["abs_codi"] = pa["abs_codi"].astype(str).str.lstrip("0")
    ab = ab.merge(pa[["abs_codi", "p"]], left_on="codi", right_on="abs_codi", how="left")
    ab["p"] = pd.to_numeric(ab["p"], errors="coerce").fillna(0)
    ab["area_abs"] = ab.area
    ccol0 = next(c for c in g.columns if "CODI_ABP" in c.upper())
    inter = gpd.overlay(ab[["codi", "p", "area_abs", "geometry"]], g[[ccol0, "geometry"]], how="intersection", keep_geom_type=True)
    inter["pp"] = inter["p"] * inter.area / inter["area_abs"]
    pob_abp = inter.groupby(ccol0)["pp"].sum()
    g["poblacio"] = g[ccol0].map(pob_abp).round()
    nall = next(c for c in g.columns if "NOM_ABP" in c.upper())
    g.assign(clau=g[nall].map(clau_abp))[[ccol0, nall, "clau", "poblacio"]].to_csv(sal / "poblacio_abp.csv", index=False)
    lineas.append(f"población ABP (año {int(pa['any'].max())}): total {g['poblacio'].sum():,.0f}")

    dins = g[g.intersection(limit).area > 0.05 * g.area].copy()
    dins["geometry"] = dins.intersection(limit).simplify(40, preserve_topology=True)
    ncol = next(c for c in dins.columns if "NOM_ABP" in c.upper())
    ccol = next(c for c in dins.columns if "CODI_ABP" in c.upper())
    dins = dins.rename(columns={ncol: "nom", ccol: "codi"})
    dins["clau"] = dins["nom"].map(clau_abp)
    dins.to_crs(4326)[["codi", "nom", "clau", "poblacio", "geometry"]].to_file(
        sal / "abp.geojson", driver="GeoJSON", COORDINATE_PRECISION=5)
    lineas.append(f"{len(dins)} ABP en la provincia (de {len(g)}): {', '.join(dins['nom'])}")

    f = _csv("qnyt-emjc")
    f["Coneguts"] = pd.to_numeric(f["Coneguts"], errors="coerce").fillna(0)
    f["Resolts"] = pd.to_numeric(f["Resolts"], errors="coerce").fillna(0)
    f["Detencions"] = pd.to_numeric(f["Detencions"], errors="coerce").fillna(0)
    f["Any"] = pd.to_numeric(f["Any"], errors="coerce")
    f["Mes"] = pd.to_numeric(f["Mes"], errors="coerce")
    meses = f.groupby("Any")["Mes"].nunique()
    f = f[f["Any"].isin(meses[meses == 12].index)]
    agg = (f.groupby(["Àrea Bàsica Policial (ABP)", "Regió Policial (RP)", "Any", "Títol Codi Penal"])
           [["Coneguts", "Resolts", "Detencions"]].sum().reset_index())
    agg.columns = ["abp", "rp", "any", "titol", "coneguts", "resolts", "detencions"]
    agg["clau"] = agg["abp"].map(clau_abp)
    agg.to_csv(sal / "fets_penals_abp.csv.gz", index=False)
    sense = sorted(set(dins["clau"]) - set(agg["clau"]))
    lineas.append(f"hechos penales: años completos {sorted(meses[meses == 12].index.astype(int))[-3:]}, "
                  f"{agg['abp'].nunique()} ABP; ABP de Girona sin datos: {sense}")
    return "\n".join(lineas)
