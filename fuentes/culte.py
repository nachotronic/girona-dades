"""Centres de culte: llocs de culte per municipi i confessió, i edificis religiosos per secció censal.

- Socrata Generalitat fmpi-m3ni «Centres de culte de Catalunya» (Direcció General d'Afers Religiosos):
  centros de culto activos (con culto al menos una vez al año), uno por fila y año (2020-), con municipio,
  confesión y organización (bisbat, federación...). No tiene dirección ni coordenadas.
- OpenStreetMap (API Overpass): amenity=place_of_worship de la provincia, con coordenadas, para la sección censal.
  En la provincia es casi todo iglesias y ermitas católicas; las confesiones minoritarias casi no están mapeadas.

Escribe en data/processed/cultura/:
  culte.csv        centros de culto de la provincia de Girona, todos los años
  culte_cat.csv    Cataluña: centros por año y confesión (para comparar)
  culte_osm.csv    edificios religiosos de OpenStreetMap con su sección censal
"""
from __future__ import annotations

import io
import urllib.parse

import pandas as pd

from .comun import PROC, carpeta, get

DOMINIO = "https://analisi.transparenciacatalunya.cat"
OVERPASS = ["https://overpass-api.de/api/interpreter", "https://overpass.kumi.systems/api/interpreter",
            "https://maps.mail.ru/osm/tools/overpass/api/interpreter"]
Q_OSM = '[out:json][timeout:180];area["ref:ine"="17"]["admin_level"="6"]->.a;nwr["amenity"="place_of_worship"](area.a);out center tags;'


def soql(ident: str, **params) -> pd.DataFrame:
    params.setdefault("$limit", 2_000_000)
    r = get(f"{DOMINIO}/resource/{ident}.csv?{urllib.parse.urlencode(params)}", timeout=900)
    return pd.read_csv(io.BytesIO(r.content), dtype=str, low_memory=False)


def _generalitat(d) -> str:
    c = soql("fmpi-m3ni", **{"$where": "codi_provincia='17'", "$order": "any,codi_municipi,id_entitat"})
    c["ine"] = c["codi_municipi"].str.zfill(6).str[:5]
    c = c[["any", "ine", "municipi", "id_entitat", "institucio", "confessi", "organitzaci_bisbat"]]
    c.to_csv(d / "culte.csv", index=False)
    t = soql("fmpi-m3ni", **{"$select": "any,confessi,count(*) as n", "$group": "any,confessi", "$order": "any"})
    t.to_csv(d / "culte_cat.csv", index=False)
    anys = sorted(c["any"].unique())
    return f"Generalitat: {len(c)} filas ({anys[0]}-{anys[-1]}), {len(c[c['any'] == anys[-1]])} centros en {anys[-1]}"


def _osm(d) -> str:
    import geopandas as gpd
    j, err = None, None
    for url in OVERPASS:
        try:
            r = get(url, params={"data": Q_OSM}, timeout=300)
            j = r.json()
            break
        except Exception as e:  # noqa: BLE001 - se prueba el siguiente servidor
            err = e
    if j is None:
        return f"OSM: ERROR {type(err).__name__} {err}"
    files = []
    for e in j.get("elements", []):
        t, c = e.get("tags", {}), e.get("center") or e
        if "lat" not in c:
            continue
        files.append({"osm": f"{e['type'][0]}{e['id']}", "nom": t.get("name", ""), "religio": t.get("religion", ""),
                      "denominacio": t.get("denomination", ""), "edifici": t.get("building", ""), "lat": c["lat"], "lon": c["lon"]})
    o = pd.DataFrame(files)
    if len(o) < 500:
        return f"OSM: ERROR solo {len(o)} elementos"
    sec = gpd.read_file(PROC / "geo" / "seccions.geojson")[["cusec", "ine", "geometry"]]
    pts = gpd.GeoDataFrame(o, geometry=gpd.points_from_xy(o["lon"], o["lat"]), crs=4326)
    s = gpd.sjoin(pts, sec.to_crs(4326), predicate="within", how="left")
    s = s[~s.index.duplicated()]
    o["cusec"], o["ine"] = s["cusec"].to_numpy(), s["ine"].to_numpy()
    o = o[o["cusec"].notna()].sort_values(["cusec", "osm"])
    o.to_csv(d / "culte_osm.csv", index=False)
    return f"OSM: {len(o)} edificios religiosos con sección"


def ejecutar() -> str:
    d = carpeta("cultura")
    res = []
    for f in (_generalitat, _osm):
        try:
            res.append(f(d))
        except Exception as e:  # noqa: BLE001 - una parte que falla no tumba la otra
            res.append(f"{f.__name__}: ERROR {type(e).__name__} {e}")
    return "; ".join(res)
