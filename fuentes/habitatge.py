"""Vivienda y urbanismo: estadísticas del Departament de Territori, Habitatge i Transició Ecològica
y de la Agència Tributària de Catalunya, publicadas en el portal de datos abiertos (Socrata).

Las páginas de estadística de habitatge.gencat.cat y territori.gencat.cat no permiten la lectura
automática; estos conjuntos son los mismos datos en formato abierto:

    txkt-yjtq  viviendas iniciadas y acabadas por municipio, anual, 1990-
    v8i4-fa4q  viviendas con protección oficial iniciadas (calificación provisional) y acabadas
               (calificación definitiva), anual, 2002-
    3pqu-s3ga  cédulas de habitabilidad (una fila por cédula, con superficie útil y coordenadas)
    w8kv-kmwv  impuesto sobre las viviendas vacías (ATC): viviendas declaradas por grandes tenedores, 2018-
    fftm-v9b6  áreas de política de vivienda: zona de mercado residencial tensionado, demanda fuerte…
    epsm-zskb  Mapa urbanístico de Cataluña: superficie por clasificación del suelo y municipio
    6wpu-9y2e  sectores de desarrollo del Mapa urbanístico: viviendas previstas y pendientes

Se guarda el detalle de la provincia de Girona y el total de Cataluña para comparar.
"""
from __future__ import annotations

import io
import urllib.parse

import pandas as pd

from .comun import PROC, carpeta, get

DOMINIO = "https://analisi.transparenciacatalunya.cat"


def soql(ident: str, **params) -> pd.DataFrame:
    params.setdefault("$limit", 5_000_000)
    r = get(f"{DOMINIO}/resource/{ident}.csv?{urllib.parse.urlencode(params)}", timeout=1200)
    return pd.read_csv(io.BytesIO(r.content), dtype=str, low_memory=False)


def num(s: pd.Series) -> pd.Series:
    return pd.to_numeric(s.str.replace(",", ".", regex=False), errors="coerce")


def enter(s: pd.Series) -> pd.Series:
    """Recuentos: los de 1.000 o más vienen como texto con punto de miles («1.217»)."""
    s = s.astype(str).str.strip()
    s = s.where(~s.str.fullmatch(r"\d{1,3}(\.\d{3})+"), s.str.replace(".", "", regex=False))
    return num(s)


def _ine(s: pd.Series) -> pd.Series:
    """Código INE de 5 cifras a partir de un código de 5 o 6 cifras (Idescat)."""
    s = s.astype(str).str.strip().str.replace(r"\.0$", "", regex=True)
    return s.where(s.str.len() <= 5, s.str[:5]).str.zfill(5)


def _gi_cat(d: pd.DataFrame, cols: list[str]) -> pd.DataFrame:
    """Filas de los municipios de Girona más una fila «cat» por año con el total de Cataluña."""
    gi = d[d["ine"].str.startswith("17")]
    cat = d.groupby("any", as_index=False)[cols].sum(min_count=1)
    cat["ine"] = "cat"
    gis = gi.groupby("any", as_index=False)[cols].sum(min_count=1)
    gis["ine"] = "gi"
    return pd.concat([gi[["ine", "any", *cols]], gis, cat], ignore_index=True)


def construccio(sal) -> str:
    d = soql("txkt-yjtq", **{"$select": "codi_ine,any,iniciats_totals,acabats_totals"})
    d = d.rename(columns={"iniciats_totals": "ini", "acabats_totals": "aca"})
    d["ine"] = _ine(d["codi_ine"])
    d["any"] = num(d["any"]).astype("Int64")
    for c in ("ini", "aca"):
        d[c] = enter(d[c])
    t = _gi_cat(d.dropna(subset=["any"]), ["ini", "aca"])
    hpo = soql("v8i4-fa4q", **{"$select": "codi_ine,any,iniciats_hpo,acabats_hpo"})
    hpo = hpo.rename(columns={"iniciats_hpo": "ini_hpo", "acabats_hpo": "aca_hpo"})
    hpo["ine"] = _ine(hpo["codi_ine"])
    hpo["any"] = num(hpo["any"]).astype("Int64")
    for c in ("ini_hpo", "aca_hpo"):
        hpo[c] = enter(hpo[c])
    th = _gi_cat(hpo.dropna(subset=["any"]), ["ini_hpo", "aca_hpo"])
    t = t.merge(th, on=["ine", "any"], how="outer").sort_values(["ine", "any"])
    t.to_csv(sal / "construccio.csv.gz", index=False)
    g = t[t["ine"] == "gi"].dropna(subset=["ini"])
    u = g.iloc[-1] if len(g) else None
    h = t[(t["ine"] == "gi") & t["ini_hpo"].notna()]
    return (f"iniciats i acabats {int(t['any'].min())}-{int(t['any'].max())}"
            + (f" (Girona {int(u['any'])}: {int(u['ini'])} iniciats, {int(u['aca'])} acabats)" if u is not None else "")
            + (f"; HPO {int(h['any'].min())}-{int(h['any'].max())}" if len(h) else "; ERROR: sense HPO"))


def cedules(sal) -> str:
    """Cédulas de habitabilidad concedidas: agregado por municipio y año para toda Cataluña
    y puntos de Girona (últimos años) para asignarlos a secciones censales."""
    agr = soql("3pqu-s3ga", **{
        "$select": "codi_ine, date_extract_y(data_resolucio) as any, count(*) as n, sum(superficie_util) as sup, count(superficie_util) as n_sup",
        "$where": "data_resolucio IS NOT NULL",
        "$group": "codi_ine, any"})
    agr["ine"] = _ine(agr["codi_ine"])
    for c in ("any", "n", "sup", "n_sup"):
        agr[c] = num(agr[c])
    agr = agr.dropna(subset=["any"])
    agr["any"] = agr["any"].astype(int)
    t = _gi_cat(agr, ["n", "sup", "n_sup"]).sort_values(["ine", "any"])
    t.to_csv(sal / "cedules.csv.gz", index=False)
    ult = int(t[t["ine"] == "gi"]["any"].max())
    p = soql("3pqu-s3ga", **{
        "$select": "codi_ine, date_extract_y(data_resolucio) as any, superficie_util, latitud, longitud",
        "$where": f"provincia = 'Girona' AND data_resolucio >= '{ult - 5}-01-01T00:00:00'"})
    p["ine"] = _ine(p["codi_ine"])
    p = p.drop(columns=["codi_ine"])
    for c in ("any", "superficie_util", "latitud", "longitud"):
        p[c] = num(p[c])
    p = p.dropna(subset=["latitud", "longitud"])
    p["latitud"], p["longitud"] = p["latitud"].round(5), p["longitud"].round(5)
    seccions = _a_seccions(p)
    seccions.to_csv(sal / "cedules_seccions.csv.gz", index=False)
    return (f"cèdules {int(t['any'].min())}-{ult}, Girona {ult}: {int(t[(t['ine'] == 'gi') & (t['any'] == ult)]['n'].sum())}; "
            f"{len(p)} punts {ult - 5}-{ult} a {seccions['cusec'].nunique()} seccions")


def _a_seccions(p: pd.DataFrame) -> pd.DataFrame:
    import geopandas as gpd

    sec = gpd.read_file(PROC / "geo" / "seccions.geojson")
    col = next(c for c in ("cusec", "CUSEC") if c in sec.columns)
    pts = gpd.GeoDataFrame(p, geometry=gpd.points_from_xy(p["longitud"], p["latitud"]), crs=4326).to_crs(sec.crs)
    j = gpd.sjoin(pts, sec[[col, "geometry"]], how="inner", predicate="within")
    out = j.groupby([col, "any"]).agg(n=("any", "size"), sup=("superficie_util", "sum"), n_sup=("superficie_util", "count")).reset_index()
    return out.rename(columns={col: "cusec"})


def buits(sal) -> str:
    d = soql("w8kv-kmwv")
    d["ine"] = _ine(d["codi"])
    d["any"] = num(d["any"]).astype("Int64")
    d["exempt"] = d["exempt"].str.strip().str.lower().str.startswith("s")
    for c in ("habitatges", "tenidors", "superficie_util"):
        d[c] = num(d[c])
    d = d.dropna(subset=["any"])
    # Viviendas sujetas al impuesto (no exentas) y exentas, por municipio y año
    w = d.pivot_table(index=["ine", "any"], columns="exempt", values="habitatges", aggfunc="sum").reset_index()
    w = w.rename(columns={False: "ihb", True: "ihb_exempt"})
    for c in ("ihb", "ihb_exempt"):
        if c not in w:
            w[c] = None
    t = _gi_cat(w, ["ihb", "ihb_exempt"]).sort_values(["ine", "any"])
    t.to_csv(sal / "buits_ihb.csv.gz", index=False)
    g = t[t["ine"] == "gi"]
    return f"IHB {int(t['any'].min())}-{int(t['any'].max())}: {len(t[t['ine'].str.startswith('17')]['ine'].unique())} municipis; Girona {int(g['any'].max())}: {int(g.iloc[-1]['ihb'] or 0)} pisos"


def arees(sal) -> str:
    d = soql("fftm-v9b6")
    d["ine"] = _ine(d["codmuni"])
    d = d[d["ine"].str.startswith("17")]
    cols = ["ine", "area_ptsh", "municipis_d_intervencio", "hpo", "municipis_amb", "programa_d_actuacio_concertada", "zona_de_mercat_residencial_tensat"]
    d[[c for c in cols if c in d.columns]].to_csv(sal / "arees_politica.csv", index=False)
    tens = d["zona_de_mercat_residencial_tensat"].fillna("").str.lower()
    return f"àrees de política d'habitatge: {len(d)} municipis, {int((~tens.isin(['', 'na', 'no'])).sum())} en zona tensionada"


def urbanisme(sal) -> str:
    d = soql("epsm-zskb")
    d["ine"] = _ine(d["codi_ine_5_txt"])
    d["any"] = num(d["any"]).astype("Int64")
    keep = ["ine", "any", "poblacio_padro", "superficie_ha"] + [c for c in d.columns if c.startswith(("_05_", "_13_", "_12_", "_14_", "_15_")) and "perce" not in c]
    for c in keep[2:]:
        d[c] = num(d[c])
    d = d[keep].dropna(subset=["any"])
    t = _gi_cat(d, keep[2:]).sort_values(["ine", "any"])
    t.to_csv(sal / "urbanisme.csv.gz", index=False)
    s = soql("6wpu-9y2e", **{"$select": "codi_ine,tip_desenv,tipus_sect,class_muc,num_habitg,hab_vacant,superf_ha,sostre,sostre_vac"})
    s["ine"] = _ine(s["codi_ine"])
    for c in ("num_habitg", "hab_vacant", "superf_ha", "sostre", "sostre_vac"):
        s[c] = num(s[c])
    s.drop(columns=["codi_ine"]).to_csv(sal / "sectors_desenvolupament.csv.gz", index=False)
    sg = s[s["ine"].str.startswith("17")]
    return (f"mapa urbanístic {int(t['any'].min())}-{int(t['any'].max())}; sectors: {len(sg)} a Girona, "
            f"{int(sg['num_habitg'].sum())} habitatges previstos, {int(sg['hab_vacant'].sum())} pendents")


def poblacio_cat(sal) -> str:
    """Población oficial de Cataluña por año (INE, cifras del padrón por comunidades, tabla 2853),
    para las tasas de referencia."""
    r = get("https://servicios.ine.es/wstempus/js/ES/DATOS_TABLA/2853?nult=40", timeout=300)
    files = []
    for s_ in r.json():
        nom = s_.get("Nombre", "")
        if "Cataluña" in nom and "Total" in nom:
            for d in s_.get("Data", []):
                if d.get("Valor") is not None:
                    files.append({"any": int(d.get("Anyo") or d.get("NombrePeriodo")), "pob": d["Valor"]})
            break
    t = pd.DataFrame(files).drop_duplicates("any").sort_values("any")
    t.to_csv(sal / "poblacio_catalunya.csv", index=False)
    return f"població de Catalunya {t['any'].min()}-{t['any'].max()}" if len(t) else "ERROR: sense població de Catalunya"


def ejecutar() -> str:
    sal = carpeta("habitatge")
    parts = []
    for nom, f in (("construcció", construccio), ("cèdules", cedules), ("buits", buits), ("àrees", arees), ("urbanisme", urbanisme), ("població", poblacio_cat)):
        try:
            parts.append(f(sal))
        except Exception as e:  # noqa: BLE001 - una parte que falla no impide las otras
            parts.append(f"ERROR {nom}: {type(e).__name__}: {str(e)[:200]}")
    return "; ".join(parts)
