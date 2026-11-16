"""Salud por Área Básica de Salud (ABS), CatSalut / Generalitat (Socrata).

- tqzv-uu8e  geometrías de las ABS (WKT) -> se quedan las que tocan la provincia
- ftq4-h9vk  población oficial por ABS, sexo y edad (Registre central de població)
- 3cre-fa8v  defunciones por ABS, sexo y grupo de edad (Registre de mortalitat)
- tt92-bngg  indicadores de atención primaria (Central de Resultats)
- thrd-jj3r  recetas facturadas al CatSalut por región sanitaria, mes y grupo ATC
- 44sy-txnv  vigilancia sindrómica de infecciones en atención primaria (semanal, por ABS)
- 8gmd-gz7i  Equipaments de Catalunya: CAP, hospitales, salud mental… con coordenadas

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
    g = g[g[col].astype(str).str.contains("POLYGON", na=False)].copy()
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
    import datetime as dt
    anys_d = set(dfn.groupby("any")["casos"].sum().loc[lambda s: s > 40000].index) - set(range(dt.date.today().year, 2100))
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
    # Población del último año por ABS y estructura por edad
    ult = pob["any"].max()
    pu = pob[pob["any"] == ult]
    tot = pu.groupby("codi_abs")["p"].sum().rename("poblacio")
    p65 = pu[pu["edat"] >= 65].groupby("codi_abs")["p"].sum()
    p80 = pu[pu["edat"] >= 80].groupby("codi_abs")["p"].sum()
    p14 = pu[pu["edat"] < 15].groupby("codi_abs")["p"].sum()
    est = pd.concat([tot, (100 * p65 / tot).rename("pct_65"), (100 * p80 / tot).rename("pct_80"),
                     (100 * p14 / tot).rename("pct_0_14")], axis=1).reset_index()
    est["any"] = int(ult)
    est.to_csv(sal / "poblacio_abs.csv", index=False)
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


def _pob_regions() -> pd.DataFrame:
    """Población oficial por región sanitaria y año (Registre central de població del CatSalut)."""
    p = soql("ftq4-h9vk", **{"$select": "any, rs_codi, sum(poblacio_oficial) as p", "$group": "any, rs_codi"})
    p["any"] = pd.to_numeric(p["any"], errors="coerce")
    p["p"] = pd.to_numeric(p["p"], errors="coerce")
    return p


GIRONA_RS = "64"


def _receptes(sal, codis) -> str:
    """Receptes facturades al CatSalut (thrd-jj3r): mensual por región sanitaria y por grupo terapéutico."""
    m = soql("thrd-jj3r", **{
        "$select": "any, mes, codi_regio_sanitaria as rs, sum(nombre_receptes) as receptes, sum(import_integre) as import, "
                   "sum(aportacio_catsalut) as catsalut",
        "$group": "any, mes, rs"})
    for c in ("any", "mes", "receptes", "import", "catsalut"):
        m[c] = pd.to_numeric(m[c], errors="coerce")
    m.to_csv(sal / "receptes_mes.csv", index=False)
    ult = int(m["any"].max())
    g = soql("thrd-jj3r", **{
        "$select": "any, mes, codi_regio_sanitaria as rs, codi_atc_3 as atc, atc_3 as nom, sum(nombre_receptes) as receptes, "
                   "sum(import_integre) as import",
        "$where": f"any >= '{ult - 1}'",
        "$group": "any, mes, rs, atc, nom"})
    for c in ("any", "mes", "receptes", "import"):
        g[c] = pd.to_numeric(g[c], errors="coerce")
    g.to_csv(sal / "receptes_atc.csv.gz", index=False)
    _pob_regions().to_csv(sal / "poblacio_rs.csv", index=False)
    u = m.sort_values(["any", "mes"]).iloc[-1]
    return f"receptes: {len(m)} files (fins {int(u['any'])}-{int(u['mes']):02d}), {g['atc'].nunique()} grups ATC"


def _vigilancia(sal, codis) -> str:
    """Vigilància sindròmica d'infeccions a l'atenció primària (44sy-txnv), setmanal per ABS."""
    import datetime as dt
    des = (dt.date.today() - dt.timedelta(days=7 * 160)).isoformat()
    s = soql("44sy-txnv", **{
        "$select": "data_inici, codi_regio as rs, diagnostic, sum(casos) as casos",
        "$where": f"data_inici >= '{des}'",
        "$group": "data_inici, rs, diagnostic"})
    s["casos"] = pd.to_numeric(s["casos"], errors="coerce")
    s["data_inici"] = s["data_inici"].str[:10]
    s.to_csv(sal / "infeccions_rs.csv", index=False)
    ult = sorted(s["data_inici"].unique())[-8]
    a = soql("44sy-txnv", **{
        "$select": "data_inici, codi_abs, diagnostic, sum(casos) as casos",
        "$where": f"data_inici >= '{ult}' AND codi_regio in('64','71','67')",
        "$group": "data_inici, codi_abs, diagnostic"})
    a["casos"] = pd.to_numeric(a["casos"], errors="coerce")
    a["data_inici"] = a["data_inici"].str[:10]
    a["codi_abs"] = a["codi_abs"].astype(str).str.lstrip("0")
    a = a[a["codi_abs"].isin(codis)]
    a.to_csv(sal / "infeccions_abs.csv", index=False)
    return f"infeccions: setmanes fins {s['data_inici'].max()}, {a['codi_abs'].nunique()} ABS"


TIPUS_CENTRE = {"1.": "cap", "2.": "continuada", "3.": "hospital", "4.": "sociosanitari", "5.": "mental", "6.": "drogues"}


def _centres(sal, codis) -> str:
    """CAP, hospitales y otros centros sanitarios con coordenadas (Equipaments de Catalunya, 8gmd-gz7i)."""
    import json
    e = soql("8gmd-gz7i", **{"$select": "idequipament, nom, categoria, poblacio, codi_municipi, longitud, latitud",
                              "$where": "categoria like '%Centres sanitaris%' AND codi_municipi like '17%'"})
    feats = []
    for _, x in e.iterrows():
        tipus = [v for k, v in TIPUS_CENTRE.items() if f"|{k}" in str(x["categoria"])]
        try:
            lon, lat = float(x["longitud"]), float(x["latitud"])
        except (TypeError, ValueError):
            continue
        if not tipus or not (0.5 < lon < 3.5 and 41.5 < lat < 42.6):
            continue
        feats.append({"type": "Feature", "geometry": {"type": "Point", "coordinates": [round(lon, 5), round(lat, 5)]},
                      "properties": {"id": str(x["idequipament"]), "nom": str(x["nom"]).strip(), "t": tipus[0],
                                     "mun": str(x["poblacio"]).strip(), "ine": str(x["codi_municipi"])[:5]}})
    (sal / "centres.geojson").write_text(json.dumps({"type": "FeatureCollection", "features": feats}, ensure_ascii=False), encoding="utf-8")
    n = pd.Series([f["properties"]["t"] for f in feats]).value_counts().to_dict()
    return f"centres sanitaris: {len(feats)} ({n})"


def ejecutar() -> str:
    sal = carpeta("salut")
    lineas = []
    codis, txt = _abs_girona(sal)
    lineas.append(txt)
    for f in (_mortalidad, _primaria, _receptes, _vigilancia, _centres):
        try:
            lineas.append(f(sal, codis))
        except Exception as e:  # noqa: BLE001
            lineas.append(f"{f.__name__}: ERROR {type(e).__name__}: {str(e)[:300]}")
    return "\n".join(lineas)
