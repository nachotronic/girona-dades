"""Energía y conectividad: certificados energéticos, puntos de recarga, gasolineras y banda ancha.

- j6ii-t3w2  certificados de eficiencia energética de edificios (ICAEN), con coordenadas UTM -> sección censal
- tb2m-m33b  estaciones de recarga para vehículo eléctrico (Generalitat)
- Ministerio para la Transición Ecológica, precios de carburantes (API REST de sedeaplicaciones.minetur.gob.es):
  estaciones de la provincia con su precio de hoy y, para la serie, el primer día de cada mes (histórico)
- Ministerio para la Transformación Digital, cobertura de banda ancha por municipio (Excel anual, 2013-)

Escribe en data/processed/energia/.
"""
from __future__ import annotations

import datetime as dt
import io
import re
import urllib.parse

import pandas as pd

from .comun import PROC, RAW, carpeta, descargar, get

DOMINIO = "https://analisi.transparenciacatalunya.cat"
CARB = "https://sedeaplicaciones.minetur.gob.es/ServiciosRESTCarburantes/PreciosCarburantes"
COB_PAGINA = "https://digital.gob.es/telecomunicaciones-infraestructuras-digitales/areas-interes/banda-ancha/informacion-cobertura.html"
CAMPS_CERT = ["num_cas", "referencia_cadastral", "codi_poblacio", "us_edifici", "qualificaci_de_consum_d", "qualificacio_d_emissions",
              "energia_prim_ria_no_renovable", "emissions_de_co2", "consum_d_energia_final", "metres_cadastre", "any_construccio",
              "utm_x", "utm_y", "longitud", "latitud", "data_entrada", "solar_fotovoltaica", "solar_termica", "vehicle_electric",
              "motiu_de_la_certificacio", "tipus_tramit", "rehabilitacio_energetica"]
PREUS = {"Precio Gasolina 95 E5": "g95", "Precio Gasoleo A": "diesel", "Precio Gasolina 98 E5": "g98", "Precio Gases licuados del petróleo": "glp"}


def soql(ident: str, **params) -> pd.DataFrame:
    params.setdefault("$limit", 5_000_000)
    q = urllib.parse.urlencode(params)
    r = get(f"{DOMINIO}/resource/{ident}.csv?{q}", timeout=1800)
    return pd.read_csv(io.BytesIO(r.content), dtype=str, low_memory=False)


def _seccions():
    import geopandas as gpd
    return gpd.read_file(PROC / "geo" / "seccions.geojson")[["cusec", "ine", "geometry"]]


def _certificats(d) -> str:
    import geopandas as gpd
    c = soql("j6ii-t3w2", **{"$select": ",".join(CAMPS_CERT), "$where": "codi_provincia='17'"})
    c["data_entrada"] = c["data_entrada"].str[:10]
    # Un certificado nuevo de la misma referencia catastral sustituye al anterior
    c = c.sort_values("data_entrada")
    amb_ref = c["referencia_cadastral"].fillna("").str.len() >= 14
    c = pd.concat([c[amb_ref].drop_duplicates("referencia_cadastral", keep="last"), c[~amb_ref]], ignore_index=True)
    x, y = pd.to_numeric(c["utm_x"], errors="coerce"), pd.to_numeric(c["utm_y"], errors="coerce")
    ok = x.between(380_000, 540_000) & y.between(4_580_000, 4_720_000)
    pts = gpd.GeoDataFrame(c[ok].copy(), geometry=gpd.points_from_xy(x[ok], y[ok]), crs=25831).to_crs(4326)
    sec = _seccions()
    j = gpd.sjoin(pts, sec, predicate="within", how="left")
    c["cusec"] = None
    c.loc[j.index, "cusec"] = j["cusec"].to_numpy()
    c["ine"] = c["codi_poblacio"].str.zfill(5)
    cols = ["ine", "cusec", "us_edifici", "qualificaci_de_consum_d", "qualificacio_d_emissions", "energia_prim_ria_no_renovable",
            "emissions_de_co2", "metres_cadastre", "any_construccio", "data_entrada", "solar_fotovoltaica", "solar_termica",
            "vehicle_electric", "motiu_de_la_certificacio", "tipus_tramit", "rehabilitacio_energetica"]
    c[cols].to_csv(d / "certificats.csv.gz", index=False, compression="gzip")
    return f"certificados: {len(c)} únicos, {c['cusec'].notna().mean():.0%} con sección, hasta {c['data_entrada'].max()}"


def _recarrega(d) -> str:
    r = soql("tb2m-m33b", **{"$where": "codiprov='17'"})
    r.drop(columns=[k for k in r.columns if k.startswith(":@") or k == "geocoded_column"], errors="ignore").to_csv(d / "recarrega.csv", index=False)
    return f"recarga: {len(r)} puntos"


def _carb_json(url: str) -> list[dict]:
    r = get(url, headers={"Accept": "application/json"}, timeout=300)
    return r.json().get("ListaEESSPrecio") or []


def _carb_df(llista: list[dict], dia: str) -> pd.DataFrame:
    df = pd.DataFrame(llista)
    if not len(df):
        return df
    out = pd.DataFrame({"dia": dia, "id": df.get("IDEESS"), "municipi": df.get("Municipio"), "rotul": df.get("Rótulo"),
                        "lat": pd.to_numeric(df.get("Latitud", pd.Series(dtype=str)).str.replace(",", "."), errors="coerce"),
                        "lon": pd.to_numeric(df.get("Longitud (WGS84)", pd.Series(dtype=str)).str.replace(",", "."), errors="coerce")})
    for k, v in PREUS.items():
        if k in df.columns:
            out[v] = pd.to_numeric(df[k].str.replace(",", "."), errors="coerce")
    return out


def _carburants(d) -> str:
    avui = dt.date.today()
    ara = _carb_df(_carb_json(f"{CARB}/EstacionesTerrestres/FiltroProvincia/17"), avui.isoformat())
    ara.to_csv(d / "gasolineres.csv", index=False)
    # Referencias de hoy: Cataluña y España (medianas)
    refs = {}
    for clau, url in (("cat", f"{CARB}/EstacionesTerrestres/FiltroCCAA/09"), ("esp", f"{CARB}/EstacionesTerrestres/")):
        try:
            x = _carb_df(_carb_json(url), avui.isoformat())
            refs[clau] = {v: round(float(x[v].median()), 3) for v in PREUS.values() if v in x.columns and x[v].notna().any()}
        except Exception as e:  # noqa: BLE001
            refs[clau] = {"error": str(e)[:100]}
    pd.DataFrame([{"zona": z, **o} for z, o in refs.items()]).to_csv(d / "carburants_refs.csv", index=False)
    # Serie mensual de la provincia (primer día de cada mes, desde 2010): se descargan solo los meses que faltan
    f = d / "carburants_mensual.csv"
    hist = pd.read_csv(f) if f.exists() else pd.DataFrame(columns=["mes"])
    fets = set(hist["mes"].astype(str))
    noves, errors = [], 0
    m = dt.date(2010, 1, 1)
    while m <= avui:
        mes = m.strftime("%Y-%m")
        if mes not in fets and errors < 5:
            try:
                x = _carb_df(_carb_json(f"{CARB}/EstacionesTerrestresHist/FiltroProvincia/{m.strftime('%d-%m-%Y')}/17"), m.isoformat())
                if len(x):
                    noves.append({"mes": mes, "n": int(len(x)), **{v: round(float(x[v].median()), 3) for v in PREUS.values() if v in x.columns and x[v].notna().any()}})
            except Exception:  # noqa: BLE001
                errors += 1
        m = (m.replace(day=28) + dt.timedelta(days=4)).replace(day=1)
    if noves:
        hist = pd.concat([hist, pd.DataFrame(noves)], ignore_index=True).sort_values("mes")
        hist.to_csv(f, index=False)
    return f"gasolineras: {len(ara)} hoy, {len(hist)} meses ({len(noves)} nuevos), refs {refs}"


def _cobertura(d) -> str:
    html = get(COB_PAGINA).text
    enllacos = [urllib.parse.urljoin(COB_PAGINA, h) for h in re.findall(r'href="([^"]+\.xlsx)"', html) if re.search(r"cobertura", h, re.I)]
    if not enllacos:
        raise RuntimeError("no hay enlaces .xlsx en la página de cobertura")
    lineas = []
    files = []
    for url in enllacos:
        nom = urllib.parse.unquote(url.rsplit("/", 1)[-1])
        x = descargar(url, RAW / "energia" / nom, timeout=900)
        xl = pd.ExcelFile(x)
        for full in xl.sheet_names:
            df = xl.parse(full, header=None, dtype=str)
            # Fila de cabecera: la primera que menciona el municipio o el código INE
            cap = next((i for i in range(min(30, len(df))) if df.iloc[i].astype(str).str.contains(r"(?i)municipio|c[oó]d.*ine|cod_?mun", regex=True).any()), None)
            if cap is None:
                lineas.append(f"{nom}/{full}: sin cabecera ({df.shape})")
                continue
            t = df.iloc[cap + 1:].copy()
            t.columns = [str(c).strip() for c in df.iloc[cap]]
            ccod = next((c for c in t.columns if re.search(r"(?i)c[oó]d|ine", c) and t[c].astype(str).str.match(r"^\s*17\d{3}\s*$").any()), None)
            if not ccod:
                lineas.append(f"{nom}/{full}: sin código de municipio; columnas {list(t.columns)[:12]}")
                continue
            t = t[t[ccod].astype(str).str.strip().str.match(r"^17\d{3}$")].copy()
            t.insert(0, "ine", t[ccod].astype(str).str.strip())
            t.insert(0, "full", full)
            t.insert(0, "fitxer", nom)
            files.append(t)
            lineas.append(f"{nom}/{full}: {len(t)} municipios; columnas {list(t.columns)[3:20]}")
    if files:
        pd.concat(files, ignore_index=True).to_csv(d / "cobertura.csv.gz", index=False, compression="gzip")
    (d / "cobertura_fulls.txt").write_text("\n".join(lineas), encoding="utf-8")
    return "cobertura: " + "; ".join(lineas)[:1200]


def ejecutar() -> str:
    d = carpeta("energia")
    lineas = []
    for f in (_certificats, _recarrega, _carburants, _cobertura):
        try:
            lineas.append(f(d))
        except Exception as e:  # noqa: BLE001
            lineas.append(f"{f.__name__}: ERROR {type(e).__name__}: {str(e)[:300]}")
    return "\n".join(lineas)
