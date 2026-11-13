"""Límites de secciones censales (INE, seccionado 2024) y municipios de la provincia.

Genera:
  geo/seccions.geojson         537 secciones de Girona, simplificadas, en WGS84
  geo/municipis.geojson        221 municipios (unión de sus secciones)
  catastro/edificios_seccion.csv  viviendas del Catastro agregadas por sección censal
"""
from __future__ import annotations

import zipfile

import geopandas as gpd
import pandas as pd

from .comun import PROC, RAW, carpeta, descargar

URL = "https://www.ine.es/prodyser/cartografia/seccionado_2024.zip"


def _columna(df, *nombres):
    for n in nombres:
        for c in df.columns:
            if c.upper() == n:
                return c
    raise KeyError(f"no se encontró ninguna columna {nombres} en {list(df.columns)}")


def _lee_secciones() -> gpd.GeoDataFrame:
    z = descargar(URL, RAW / "geo" / "seccionado_2024.zip", timeout=900)
    destino = RAW / "geo" / "seccionado_2024"
    with zipfile.ZipFile(z) as f:
        f.extractall(destino)
    shp = sorted(destino.rglob("*.shp"), key=lambda p: p.stat().st_size, reverse=True)[0]
    gdf = gpd.read_file(shp)
    cpro = _columna(gdf, "CPRO")
    gdf = gdf[gdf[cpro].astype(str).str.zfill(2) == "17"].copy()
    gdf["cusec"] = gdf[_columna(gdf, "CUSEC")].astype(str).str.zfill(10)
    gdf["ine"] = gdf[_columna(gdf, "CUMUN")].astype(str).str.zfill(5)
    return gdf[["cusec", "ine", "geometry"]]


def _guarda(gdf: gpd.GeoDataFrame, tolerancia: float, ruta):
    g = gdf.copy()
    g["geometry"] = g.geometry.simplify(tolerancia, preserve_topology=True)
    g = g.to_crs(4326)
    g.to_file(ruta, driver="GeoJSON", COORDINATE_PRECISION=5)


def ejecutar() -> str:
    secc = _lee_secciones()
    carpeta("geo")
    _guarda(secc, 12, PROC / "geo" / "seccions.geojson")
    mun = secc.dissolve(by="ine", as_index=False)[["ine", "geometry"]]
    _guarda(mun, 30, PROC / "geo" / "municipis.geojson")

    # Catastro -> sección censal (los edificios vienen en ETRS89 UTM 31N)
    lineas = [f"{len(secc)} secciones, {len(mun)} municipios (CRS origen {secc.crs})"]
    ed_path = PROC / "catastro" / "edificios.csv.gz"
    if ed_path.exists():
        ed = pd.read_csv(ed_path, usecols=["anyo", "viviendas", "x", "y"]).dropna(subset=["x", "y"])
        pts = gpd.GeoDataFrame(ed, geometry=gpd.points_from_xy(ed["x"], ed["y"]), crs=25831).to_crs(secc.crs)
        unido = gpd.sjoin(pts, secc[["cusec", "geometry"]], how="inner", predicate="within")
        unido["antes_1980"] = unido["viviendas"].where(unido["anyo"] < 1980, 0)
        unido["post_2000"] = unido["viviendas"].where(unido["anyo"] >= 2000, 0)
        agg = unido.groupby("cusec").agg(edificios=("viviendas", "size"), viviendas=("viviendas", "sum"),
                                         viv_antes_1980=("antes_1980", "sum"), viv_post_2000=("post_2000", "sum"),
                                         anyo_mediano=("anyo", "median")).reset_index()
        carpeta("catastro")
        agg.to_csv(PROC / "catastro" / "edificios_seccion.csv", index=False)
        lineas.append(f"{len(unido)} de {len(pts)} edificios asignados a {len(agg)} secciones")
    return "\n".join(lineas)
