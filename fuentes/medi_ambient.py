"""Medio ambiente: aire, clima, agua y territorio protegido de la provincia de Girona.

Dades obertes de la Generalitat (Socrata, analisi.transparenciacatalunya.cat):
- tasf-thgu  calidad del aire, valores horarios de las estaciones automáticas de la XVPCA
- yqwd-vj5e  estaciones meteorológicas automáticas del Meteocat (XEMA)
- 7bvh-jvq2  datos meteorológicos diarios de la XEMA (se agregan por año y mes en el servidor)
- gn9e-3qhr  agua en los embalses de las Conques Internes (diario, desde el 2000)
- i5n8-43cw  estado de sequía por municipio (historial de cambios de estado)
- 2gws-ubmt  consumo de agua por comarca (anual)
- 83qv-sib8  playas de Cataluña por municipio

MITECO (cartografía, se cruza con los términos municipales):
- zonas vulnerables por contaminación de nitratos de origen agrario (se toma el último fichero publicado)
- Red Natura 2000 y espacios naturales protegidos (ENP)

Escribe en data/processed/medi_ambient/.
"""
from __future__ import annotations

import io
import re
import urllib.parse
import zipfile

import pandas as pd

from .comun import PROC, RAW, carpeta, descargar, get

DOMINIO = "https://analisi.transparenciacatalunya.cat"
ZVN_PAGINA = "https://www.miteco.gob.es/es/cartografia-y-sig/ide/descargas/agua/zonas-vulnerables.html"
N2000_PAGINA = "https://www.miteco.gob.es/es/biodiversidad/servicios/banco-datos-naturaleza/informacion-disponible/rednatura_2000_desc.html"
ENP_PAGINA = "https://www.miteco.gob.es/es/biodiversidad/servicios/banco-datos-naturaleza/informacion-disponible/enp_descargas.html"
# Embalses que abastecen a la provincia: el sistema Ter (Sau y Susqueda) y Boadella (Alt Empordà)
EMBASSAMENTS = {"Embassament de Susqueda (Osor)": "susqueda", "Embassament de Sau (Vilanova de Sau)": "sau",
                "Embassament de Darnius Boadella (Darnius)": "boadella"}
CONTAMINANTS = ["NO2", "PM10", "PM2.5", "O3", "SO2", "CO"]
# Variables diarias de la XEMA
V_TMITJ, V_TMAX, V_TMIN, V_PREC = 1000, 1001, 1002, 1300


def soql(ident: str, **params) -> pd.DataFrame:
    params.setdefault("$limit", 5_000_000)
    q = urllib.parse.urlencode(params)
    r = get(f"{DOMINIO}/resource/{ident}.csv?{q}", timeout=1200)
    return pd.read_csv(io.BytesIO(r.content), dtype=str, low_memory=False)


def _num(s):
    return pd.to_numeric(s, errors="coerce")


# ---------------------------------------------------------------------------
# Calidad del aire (XVPCA)

def _aire(d) -> str:
    df = soql("tasf-thgu", **{"$where": "starts_with(codi_ine,'17')"})
    hores = [f"h{i:02d}" for i in range(1, 25)]
    df["contaminant"] = df["contaminant"].str.strip().str.upper().str.replace("PM2,5", "PM2.5")
    df = df[df["contaminant"].isin(CONTAMINANTS)].copy()
    for h in hores:
        df[h] = _num(df[h])
    df["data"] = pd.to_datetime(df["data"].str[:10], errors="coerce")
    df = df.dropna(subset=["data"]).drop_duplicates(["codi_eoi", "data", "contaminant"], keep="last")
    df["any"] = df["data"].dt.year
    est = (df.sort_values("data").groupby("codi_eoi")
           .agg(nom=("nom_estacio", "last"), municipi=("municipi", "last"), ine=("codi_ine", "last"), tipus=("tipus_estacio", "last"),
                area=("area_urbana", "last"), lat=("latitud", "last"), lon=("longitud", "last"), d0=("data", "min"), d1=("data", "max"))
           .reset_index())
    est["d0"] = est["d0"].dt.date
    est["d1"] = est["d1"].dt.date
    cont = df.groupby("codi_eoi")["contaminant"].apply(lambda s: " ".join(sorted(set(s)))).rename("contaminants")
    est = est.merge(cont, on="codi_eoi", how="left")
    est.to_csv(d / "aire_estacions.csv", index=False)

    # Media diaria (con al menos 18 horas válidas) y máximo de la media móvil de 8 horas (ozono)
    v = df[hores].to_numpy()
    df["n_h"] = (~pd.isna(v)).sum(axis=1)
    df["mitjana_dia"] = df[hores].mean(axis=1)
    df["max_h"] = df[hores].max(axis=1)
    df["h200"] = (df[hores] > 200).sum(axis=1)
    files = []
    for (eoi, c), g in df.groupby(["codi_eoi", "contaminant"]):
        g = g.sort_values("data")
        if c == "O3":
            # Serie horaria continua para la media móvil de 8 horas
            s = g.set_index("data")[hores].stack(dropna=False)
            idx = [d_ + pd.Timedelta(hours=int(h[1:]) - 1) for d_, h in s.index]
            s = pd.Series(s.to_numpy(), index=pd.DatetimeIndex(idx)).sort_index()
            m8 = s.rolling(8, min_periods=6).mean()
            max8 = m8.groupby(m8.index.normalize()).max()
            dies120 = (max8 > 120).groupby(max8.index.year).sum()
        else:
            dies120 = pd.Series(dtype=float)
        bons = g[g["n_h"] >= 18]
        for a, ga in g.groupby("any"):
            ba = bons[bons["any"] == a]
            hores_valides = int(ga["n_h"].sum())
            files.append({
                "codi_eoi": eoi, "contaminant": c, "any": int(a), "hores": hores_valides, "dies": int(len(ba)),
                "mitjana": round(float(ga[hores].stack().mean()), 2) if hores_valides else None,
                "dies50": int((ba["mitjana_dia"] > 50).sum()) if c == "PM10" else None,
                "h200": int(ga["h200"].sum()) if c == "NO2" else None,
                "dies120": int(dies120.get(a, 0)) if c == "O3" else None,
                "max_h": float(ga["max_h"].max()) if hores_valides else None,
            })
    an = pd.DataFrame(files)
    an.to_csv(d / "aire_anual.csv", index=False)
    # Mensual para los gráficos (media de las horas válidas)
    df["mes"] = df["data"].dt.strftime("%Y-%m")
    mens = (df.groupby(["codi_eoi", "contaminant", "mes"])[hores].apply(lambda x: x.stack().mean()).rename("mitjana").round(2).reset_index())
    mens.to_csv(d / "aire_mensual.csv", index=False)
    actives = est[est["d1"] >= (pd.Timestamp.today() - pd.Timedelta(days=60)).date()]
    return f"aire: {len(est)} estaciones ({len(actives)} activas), {len(an)} filas anuales, hasta {df['data'].max().date()}"


# ---------------------------------------------------------------------------
# Clima (Meteocat, XEMA)

def _meteo(d) -> str:
    est = soql("yqwd-vj5e", **{"$where": "codi_provincia='17'"})
    est = est[["codi_estacio", "nom_estacio", "nom_municipi", "codi_municipi", "nom_comarca", "altitud", "latitud", "longitud", "data_inici", "data_fi", "nom_estat_ema"]]
    est.to_csv(d / "meteo_estacions.csv", index=False)
    codis = ",".join(f"'{c}'" for c in est["codi_estacio"])
    vars_ = f"{V_TMITJ},{V_TMAX},{V_TMIN},{V_PREC}"
    base = {"$where": f"codi_variable in({vars_}) and codi_estacio in({codis})"}
    an = soql("7bvh-jvq2", **{"$select": "codi_estacio,date_extract_y(data_lectura) as any,codi_variable,avg(valor) as mitjana,sum(valor) as suma,count(valor) as n,max(valor) as maxim,min(valor) as minim",
                               "$group": "codi_estacio,any,codi_variable", **base})
    an.to_csv(d / "meteo_anual.csv", index=False)
    me = soql("7bvh-jvq2", **{"$select": "codi_estacio,date_extract_y(data_lectura) as any,date_extract_m(data_lectura) as mes,codi_variable,avg(valor) as mitjana,sum(valor) as suma,count(valor) as n",
                               "$where": f"codi_variable in({V_TMITJ},{V_PREC}) and codi_estacio in({codis})", "$group": "codi_estacio,any,mes,codi_variable"})
    me.to_csv(d / "meteo_mensual.csv", index=False)
    # Días de calor y de frío: se cuentan en el servidor
    llindars = {"dies30": f"codi_variable={V_TMAX} and valor>=30", "dies35": f"codi_variable={V_TMAX} and valor>=35",
                "nits20": f"codi_variable={V_TMIN} and valor>=20", "glaçades": f"codi_variable={V_TMIN} and valor<0",
                "pluja1": f"codi_variable={V_PREC} and valor>=1"}
    comptes = None
    for k, w in llindars.items():
        c = soql("7bvh-jvq2", **{"$select": f"codi_estacio,date_extract_y(data_lectura) as any,count(valor) as {k}",
                                  "$where": f"{w} and codi_estacio in({codis})", "$group": "codi_estacio,any"})
        comptes = c if comptes is None else comptes.merge(c, on=["codi_estacio", "any"], how="outer")
    comptes.to_csv(d / "meteo_dies.csv", index=False)
    return f"meteo: {len(est)} estaciones, {an['any'].min()}-{an['any'].max()}, {len(an)} filas anuales"


# ---------------------------------------------------------------------------
# Agua (ACA)

def _aigua(d) -> str:
    noms = ",".join(f"'{n}'" for n in EMBASSAMENTS)
    e = soql("gn9e-3qhr", **{"$select": "dia,estaci,percentatge_volum_embassat,volum_embassat", "$where": f"estaci in({noms})", "$order": "dia"})
    e["embassament"] = e["estaci"].map(EMBASSAMENTS)
    e["dia"] = e["dia"].str[:10]
    e[["dia", "embassament", "percentatge_volum_embassat", "volum_embassat"]].to_csv(d / "embassaments.csv", index=False)
    s = soql("i5n8-43cw", **{"$where": "starts_with(codi_municipi,'17')"})
    s.to_csv(d / "sequera.csv", index=False)
    c = soql("2gws-ubmt")
    c.to_csv(d / "aigua_comarques.csv", index=False)
    p = soql("83qv-sib8", **{"$where": "starts_with(ide_municipi,'17')"})
    p.to_csv(d / "platges.csv", index=False)
    return (f"aigua: embalses {e['dia'].min()}-{e['dia'].max()} ({len(e)} filas), sequía {s['municipi'].nunique()} municipios "
            f"(último cambio {str(s['data_canvi_estat_sequera'].max())[:10]}), consumo {c['any'].min()}-{c['any'].max()}, {len(p)} playas")


# ---------------------------------------------------------------------------
# Territorio protegido y zonas vulnerables (MITECO)

def _enllac(pagina: str, patro: str) -> str:
    html = get(pagina).text
    for href in re.findall(r'href="([^"]+)"', html):
        if re.search(patro, href, re.I):
            return urllib.parse.urljoin(pagina, href.replace("&amp;", "&"))
    raise RuntimeError(f"no se encontró {patro} en {pagina}")


def _capa(url: str, nom: str):
    import geopandas as gpd
    z = descargar(url, RAW / "medi_ambient" / f"{nom}.zip", timeout=1800)
    dest = RAW / "medi_ambient" / nom
    with zipfile.ZipFile(z) as f:
        f.extractall(dest)
    shps = sorted(dest.rglob("*.shp"), key=lambda p: p.stat().st_size, reverse=True)
    if not shps:
        shps = sorted(dest.rglob("*.geojson"), key=lambda p: p.stat().st_size, reverse=True)
    return [gpd.read_file(p) for p in shps], url


def _territori(d) -> str:
    import geopandas as gpd
    mun = gpd.read_file(PROC / "geo" / "municipis.geojson").to_crs(25831)
    mun["ha"] = mun.geometry.area / 1e4
    caixa = mun.total_bounds
    res = mun[["ine", "ha"]].copy().set_index("ine")
    lineas, llistes = [], []
    capes = {
        "zvn": (_enllac(ZVN_PAGINA, r"DescargaFichero\?f=zonas-vulnerables-[^\"]*\.zip"), None),
        "n2000": (_enllac(N2000_PAGINA, r"n2000_\d{4}_shp\.zip"), None),
        "enp": (_enllac(ENP_PAGINA, r"Enp\d{4}_shp\.zip"), None),
    }
    for clau, (url, _) in capes.items():
        try:
            gdfs, url = _capa(url, clau)
            g = pd.concat([x.to_crs(25831) for x in gdfs if len(x)], ignore_index=True)
            g = gpd.GeoDataFrame(g, geometry="geometry", crs=25831)
            g = g.cx[caixa[0]:caixa[2], caixa[1]:caixa[3]]
            g = g[g.geometry.notna() & ~g.geometry.is_empty].copy()
            g["geometry"] = g.geometry.buffer(0)
            unio = g.geometry.union_all()
            inter = mun.geometry.intersection(unio)
            res[clau] = (inter.area.to_numpy() / 1e4).round(1)
            # Nombre de los espacios que tocan cada municipio
            cnom = next((c for c in g.columns if c.upper() in ("SITE_NAME", "NOMBRE", "NOMBRE_ZV", "NOM", "NAME", "SITENAME", "DENOMINACI")), None)
            ctip = next((c for c in g.columns if c.upper() in ("SITE_TYPE", "FIGURA_LP", "FIGURA", "TIPO", "TIPO_FIGUR", "DESIG_ABBR")), None)
            if cnom:
                j = gpd.sjoin(g[[cnom] + ([ctip] if ctip else []) + ["geometry"]], mun[["ine", "geometry"]], predicate="intersects")
                for _, r in j.iterrows():
                    llistes.append({"capa": clau, "ine": r["ine"], "nom": r[cnom], "tipus": r[ctip] if ctip else ""})
            lineas.append(f"{clau}: {len(g)} polígonos de {url.rsplit('/', 1)[-1]}, {int((res[clau] > 0).sum())} municipios tocan")
            (d / f"{clau}_font.txt").write_text(url + "\n" + ",".join(map(str, g.columns)) + "\n", encoding="utf-8")
        except Exception as e:  # noqa: BLE001
            lineas.append(f"{clau}: ERROR {type(e).__name__}: {str(e)[:300]}")
    res.reset_index().to_csv(d / "territori_protegit.csv", index=False)
    if llistes:
        pd.DataFrame(llistes).drop_duplicates().to_csv(d / "espais_municipis.csv", index=False)
    return "; ".join(lineas)


def ejecutar() -> str:
    d = carpeta("medi_ambient")
    lineas = []
    for f in (_aire, _meteo, _aigua, _territori):
        try:
            lineas.append(f(d))
        except Exception as e:  # noqa: BLE001
            lineas.append(f"{f.__name__}: ERROR {type(e).__name__}: {str(e)[:300]}")
    return "\n".join(lineas)
