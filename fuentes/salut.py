"""Salud por Área Básica de Salud (ABS), CatSalut / Generalitat (Socrata).

- tqzv-uu8e  geometrías de las ABS (WKT) -> se quedan las que tocan la provincia
- ftq4-h9vk  población oficial por ABS, sexo y edad (Registre central de població)
- 3cre-fa8v  defunciones por ABS, sexo y grupo de edad (Registre de mortalitat)
- tt92-bngg  indicadores de atención primaria (Central de Resultats)

Las consultas se agregan en el servidor (SoQL) para no bajar millones de filas.
La mortalidad se estandariza por edad y sexo con las tasas de Cataluña
(razón de mortalidad estandarizada, Cataluña = 100).
"""
from __future__ import annotations

import io
import re
import urllib.parse

import pandas as pd

from .comun import PROC, carpeta, get

DOMINIO = "https://analisi.transparenciacatalunya.cat"


def soql(ident: str, **params) -> pd.DataFrame:
    params.setdefault("$limit", 2_000_000)
    q = urllib.parse.urlencode({k: v for k, v in params.items()})
    r = get(f"{DOMINIO}/resource/{ident}.csv?{q}", timeout=900)
    return pd.read_csv(io.BytesIO(r.content), dtype=str, low_memory=False)


def _abs_girona(sal) -> tuple[set[str], str]:
    import geopandas as gpd
    from shapely import wkt

    g = soql("tqzv-uu8e")
    col = next(c for c in g.columns if c.lower() in ("geometry", "the_geom", "geometria"))
    g = gpd.GeoDataFrame(g.drop(columns=[col]), geometry=g[col].map(wkt.loads), crs=4326)
    g["codi"] = g["codi"].astype(str).str.lstrip("0")
    prov = gpd.read_file(PROC / "geo" / "municipis.geojson").to_crs(25831)
    limit = prov.union_all() if hasattr(prov, "union_all") else prov.unary_union
    g = g.to_crs(25831)
    dins = g[g.intersection(limit).area > 0.05 * g.area].copy()
    dins["geometry"] = dins.intersection(limit).simplify(40, preserve_topology=True)
    dins = dins.to_crs(4326)
    dins[["codi", "nom", "nom_sector_sanitari", "nom_regio_sanitaria", "geometry"]].to_file(
        sal / "abs.geojson", driver="GeoJSON", COORDINATE_PRECISION=5)
    return set(dins["codi"]), f"{len(dins)} ABS en la provincia (de {len(g)})"


def _grupo(etiqueta: str) -> int:
    m = re.search(r"\d+", str(etiqueta))
    return int(m.group()) if m else -1


def _mortalidad(sal, codis: set[str]) -> str:
    dfn = soql("3cre-fa8v", **{
        "$select": "codi_abs, date_extract_y(data) as any, sexe, grup_edat, sum(casos) as casos",
        "$group": "codi_abs, any, sexe, grup_edat"})
    dfn["codi_abs"] = dfn["codi_abs"].astype(str).str.lstrip("0")
    dfn["casos"] = pd.to_numeric(dfn["casos"], errors="coerce").fillna(0)
    dfn["any"] = pd.to_numeric(dfn["any"], errors="coerce")
    dfn["g"] = dfn["grup_edat"].map(_grupo)
    pob = soql("ftq4-h9vk", **{
        "$select": "abs_codi, any, genere, edat, sum(poblacio_oficial) as p",
        "$group": "abs_codi, any, genere, edat"})
    pob["abs_codi"] = pob["abs_codi"].astype(str).str.lstrip("0")
    pob["any"] = pd.to_numeric(pob["any"], errors="coerce")
    pob["p"] = pd.to_numeric(pob["p"], errors="coerce").fillna(0)
    pob["edat"] = pd.to_numeric(pob["edat"].astype(str).str.extract(r"(\d+)")[0], errors="coerce")
    limites = sorted(x for x in dfn["g"].unique() if x >= 0)
    pob["g"] = pob["edat"].map(lambda e: max([l for l in limites if l <= e], default=-1) if pd.notna(e) else -1)
    pob = pob.rename(columns={"abs_codi": "codi_abs", "genere": "sexe"})
    pob["sexe"] = pob["sexe"].str.strip().str.capitalize()
    dfn["sexe"] = dfn["sexe"].str.strip().str.capitalize()
    # Últimos 5 años completos con defunciones y población
    anys_d = set(dfn.groupby("any")["casos"].sum().loc[lambda s: s > 40000].index)
    anys = sorted(anys_d & set(pob["any"].dropna().unique()))[-5:]
    d = dfn[dfn["any"].isin(anys)].groupby(["codi_abs", "sexe", "g"])["casos"].sum()
    p = pob[pob["any"].isin(anys)].groupby(["codi_abs", "sexe", "g"])["p"].sum()
    taula = pd.concat([d, p], axis=1).fillna(0).reset_index()
    cat = taula.groupby(["sexe", "g"])[["casos", "p"]].sum()
    cat["taxa"] = cat["casos"] / cat["p"].where(cat["p"] > 0)
    taula = taula.join(cat["taxa"], on=["sexe", "g"])
    taula["esperades"] = taula["p"] * taula["taxa"].fillna(0)
    res = taula.groupby("codi_abs")[["casos", "esperades", "p"]].sum()
    res["rme"] = 100 * res["casos"] / res["esperades"]
    res["taxa_bruta"] = 1000 * res["casos"] / res["p"]
    res["prematura"] = (taula[taula["g"] < 75].groupby("codi_abs")["casos"].sum()
                        / taula[taula["g"] < 75].groupby("codi_abs")["esperades"].sum() * 100)
    res["periode"] = f"{int(anys[0])}-{int(anys[-1])}" if anys else ""
    out = res.reset_index()
    cat_tot = taula[["casos", "p"]].sum()
    gi = out[out["codi_abs"].isin(codis)]
    resum = pd.DataFrame([
        {"codi_abs": "CAT", "casos": cat_tot["casos"], "esperades": cat_tot["casos"], "p": cat_tot["p"], "rme": 100.0,
         "taxa_bruta": 1000 * cat_tot["casos"] / cat_tot["p"], "prematura": 100.0, "periode": out["periode"].iloc[0]},
        {"codi_abs": "GI", "casos": gi["casos"].sum(), "esperades": gi["esperades"].sum(), "p": gi["p"].sum(),
         "rme": 100 * gi["casos"].sum() / gi["esperades"].sum(), "taxa_bruta": 1000 * gi["casos"].sum() / gi["p"].sum(),
         "prematura": None, "periode": out["periode"].iloc[0]},
    ])
    pd.concat([gi, resum]).to_csv(sal / "mortalitat_abs.csv", index=False)
    # Población total del último año por ABS
    ult = pob["any"].max()
    pob[pob["any"] == ult].groupby("codi_abs")["p"].sum().rename("poblacio").reset_index().to_csv(
        sal / "poblacio_abs.csv", index=False)
    return f"mortalidad {anys}: {len(gi)} ABS; RME Girona {resum.iloc[1]['rme']:.1f}"


def _primaria(sal, codis: set[str]) -> str:
    ult = soql("tt92-bngg", **{"$select": "max(any) as a"})["a"].iloc[0]
    mes = soql("tt92-bngg", **{"$select": "max(mes) as m", "$where": f"any='{ult}'"})["m"].iloc[0]
    df = soql("tt92-bngg", **{
        "$select": "codi_abs_a, codi_indicador, indicador, formula, unitats, filtre_1, nom_variable, agregable, sum(valor) as v",
        "$where": f"any='{ult}' AND mes='{mes}'",
        "$group": "codi_abs_a, codi_indicador, indicador, formula, unitats, filtre_1, nom_variable, agregable"})
    df["codi_abs_a"] = df["codi_abs_a"].astype(str).str.lstrip("0")
    df["v"] = pd.to_numeric(df["v"], errors="coerce")
    df["any"], df["mes"] = ult, mes
    # Totales de Cataluña (suma de todas las ABS) y de las ABS de Girona
    claves = ["codi_indicador", "indicador", "formula", "unitats", "filtre_1", "nom_variable", "agregable", "any", "mes"]
    cat = df.groupby(claves, dropna=False)["v"].sum().reset_index().assign(codi_abs_a="CAT")
    gi = df[df["codi_abs_a"].isin(codis)]
    gtot = gi.groupby(claves, dropna=False)["v"].sum().reset_index().assign(codi_abs_a="GI")
    pd.concat([gi, gtot, cat]).to_csv(sal / "primaria_abs.csv", index=False)
    return f"atención primaria {ult}-{mes}: {gi['codi_indicador'].nunique()} indicadores, {gi['codi_abs_a'].nunique()} ABS"


def ejecutar() -> str:
    sal = carpeta("salut")
    lineas = []
    codis, txt = _abs_girona(sal)
    lineas.append(txt)
    for f in (_mortalidad, _primaria):
        try:
            lineas.append(f(sal, codis))
        except Exception as e:  # noqa: BLE001
            lineas.append(f"{f.__name__}: ERROR {type(e).__name__}: {str(e)[:300]}")
    return "\n".join(lineas)
