"""Energía y conectividad para la web: indicadores del tema «ene» (municipio y sección),
gráficos de la sección «Energia i connectivitat» y bloque de la ficha municipal.

construir(municipios) devuelve un dict con:
  mun    {ine: {clave: {año: valor}}}     certificados, recarga, gasolineras y cobertura de banda ancha
  sec    {cusec: {clave: valor}}           certificados energéticos por sección censal
  anys   {"en_cert": .., "en_rec": .., "en_carb": .., "en_cob": ..}
  fitxa  {ine: {...}}                      bloque de la ficha
  prov   gráficos de la sección
  refs   referencias de Cataluña y España (carburantes)
  xifres cifras de cabecera de la sección
"""
from __future__ import annotations

import datetime as dt
import math
import pathlib
import re
import sys
from collections import defaultdict

import pandas as pd

RAIZ = pathlib.Path(__file__).resolve().parent.parent
sys.path.insert(0, str(RAIZ))

D = RAIZ / "data" / "processed" / "energia"
GEO = RAIZ / "data" / "processed" / "geo" / "municipis.geojson"
LLETRES = "ABCDEFG"
MIN_SEC = 30      # certificados mínimos para mostrar una sección
MIN_MUN = 10      # y un municipio
# Tecnologías de banda ancha que se muestran (clave: expresión sobre el nombre de la columna del Ministerio)
TECS = {"ftth": r"^FTTH$", "100": r"^Cob\. 100\s*Mbps", "1g": r"^Cob\. 1\s*Gbps", "5g": r"^5G$", "30": r"^Cob\. 30\s*Mbps(?!.*criterio)"}


def _num(s):
    return pd.to_numeric(s, errors="coerce")


def _r(v, d=1):
    return None if v is None or (isinstance(v, float) and not math.isfinite(v)) else round(float(v), d)


def _residencial(s: pd.Series) -> pd.Series:
    return s.fillna("").str.contains(r"(?i)habitatge|vivienda|bloc")


def _certificats(municipios):
    f = D / "certificats.csv.gz"
    if not f.exists():
        return {}, {}, None, {}, {}
    c = pd.read_csv(f, dtype=str)
    c = c[_residencial(c["us_edifici"])].copy()
    c["q"] = c["qualificaci_de_consum_d"].str.strip().str.upper().str[:1]
    c = c[c["q"].isin(list(LLETRES))]
    c["kwh"] = _num(c["energia_prim_ria_no_renovable"]).where(lambda x: (x > 0) & (x < 1500))
    c["any"] = _num(c["data_entrada"].str[:4])
    ult = int(c["any"].max())
    pob = {m["ine"]: m.get("poblacion") or 0 for m in municipios}

    def agrega(g):
        n = len(g)
        q = g["q"].value_counts()
        return {"n": n, "ab": 100 * (q.get("A", 0) + q.get("B", 0)) / n, "eg": 100 * (q.get("E", 0) + q.get("F", 0) + q.get("G", 0)) / n,
                "g": 100 * q.get("G", 0) / n, "kwh": g["kwh"].mean(), "dist": [int(q.get(l, 0)) for l in LLETRES]}

    mun, fitxa = {}, {}
    for ine, g in c.groupby("ine"):
        a = agrega(g)
        fitxa[ine] = {"n": a["n"], "dist": a["dist"], "kwh": _r(a["kwh"], 0), "ab": _r(a["ab"], 1), "eg": _r(a["eg"], 1)}
        if a["n"] < MIN_MUN:
            continue
        o = {"cert_ab": _r(a["ab"]), "cert_eg": _r(a["eg"]), "cert_g": _r(a["g"]), "cert_kwh": _r(a["kwh"], 0)}
        if pob.get(ine):
            o["cert_n"] = _r(1000 * a["n"] / pob[ine])
        mun[ine] = {k: {ult: v} for k, v in o.items() if v is not None}
    sec = {}
    for cusec, g in c[c["cusec"].notna()].groupby("cusec"):
        if len(g) < MIN_SEC:
            continue
        a = agrega(g)
        sec[str(cusec).split(".")[0].zfill(10)] = {"en_cert_ab": _r(a["ab"]), "en_cert_eg": _r(a["eg"]), "en_cert_g": _r(a["g"]), "en_cert_kwh": _r(a["kwh"], 0)}
    # Por año de registro: calificación de los certificados de viviendas existentes y nuevas
    ex = c[~c["tipus_tramit"].fillna("").str.contains(r"(?i)acabats$|^edificis acabats")]
    nous = c[c["tipus_tramit"].fillna("").str.contains(r"(?i)^edificis acabats")]
    ser_eg, ser_ab = [], []
    for a, g in ex.groupby("any"):
        if len(g) >= 200 and a < dt.date.today().year + 1:
            q = g["q"].value_counts()
            ser_eg.append([int(a), str(int(a)), _r(100 * (q.get("E", 0) + q.get("F", 0) + q.get("G", 0)) / len(g))])
            ser_ab.append([int(a), str(int(a)), _r(100 * (q.get("A", 0) + q.get("B", 0)) / len(g))])
    prov = {}
    if ser_eg:
        prov["ene_cert"] = {"tipus": "linia", "u": "%", "dec": 1, "noms": "ene_cert", "zero": True, "series": {"gi": ser_eg, "cat": ser_ab}}
    q = c["q"].value_counts()
    xifres = {"n": int(len(c)), "eg": _r(100 * (q.get("E", 0) + q.get("F", 0) + q.get("G", 0)) / len(c)),
              "ab": _r(100 * (q.get("A", 0) + q.get("B", 0)) / len(c)), "dist": [int(q.get(l, 0)) for l in LLETRES],
              "nous_ab": _r(100 * nous["q"].isin(["A", "B"]).mean()) if len(nous) >= 100 else None, "fins": str(c["data_entrada"].max())[:10]}
    return mun, sec, ult, prov, {"fitxa": fitxa, "xifres": xifres}


def _ine_punts(df, lon="lon", lat="lat"):
    """INE de cada punto a partir de las coordenadas (términos municipales)."""
    try:
        import geopandas as gpd
        mun = gpd.read_file(GEO)[["ine", "geometry"]].to_crs(4326)
        ok = df[lon].notna() & df[lat].notna()
        pts = gpd.GeoDataFrame(df[ok].copy(), geometry=gpd.points_from_xy(df.loc[ok, lon], df.loc[ok, lat]), crs=4326)
        j = gpd.sjoin(pts, mun, predicate="within", how="left")
        j = j[~j.index.duplicated()]
        out = pd.Series(None, index=df.index, dtype=object)
        out.loc[j.index] = j["ine"].astype(str).str.zfill(5).to_numpy()
        return out
    except Exception:  # noqa: BLE001
        return pd.Series(None, index=df.index, dtype=object)


def _recarrega(municipios):
    f = D / "recarrega.csv"
    if not f.exists():
        return {}, None, {}, {}
    r = pd.read_csv(f, dtype=str)
    r["ine"] = r["codimun"].astype(str).str.replace(r"\.0$", "", regex=True).str.zfill(6).str[:5]
    r["kw"] = _num(r["kw"])
    r["rapid"] = r["kw"] >= 50
    any_ = dt.date.today().year
    pob = {m["ine"]: m.get("poblacion") or 0 for m in municipios}
    mun, fitxa = {}, {}
    for ine in pob:
        g = r[r["ine"] == ine]
        o = {"rec_n": len(g), "rec_rapid": int(g["rapid"].sum())}
        if pob[ine]:
            o["rec_10k"] = _r(10_000 * len(g) / pob[ine])
        mun[ine] = {k: {any_: v} for k, v in o.items() if v is not None}
        if len(g):
            fitxa[ine] = {"n": len(g), "rapid": int(g["rapid"].sum()), "kw": _r(g["kw"].max(), 0)}
    tot_pob = sum(pob.values())
    xifres = {"n": int(len(r)), "rapid": int(r["rapid"].sum()), "mun": int(r["ine"].nunique()), "per10k": _r(10_000 * len(r) / tot_pob) if tot_pob else None}
    return mun, any_, fitxa, xifres


def _carburants(municipios):
    f = D / "gasolineres.csv"
    if not f.exists():
        return {}, None, {}, {}, {}, {}
    g = pd.read_csv(f, dtype={"id": str})
    dia = str(g["dia"].iloc[0]) if len(g) else None
    g["ine"] = _ine_punts(g)
    any_ = int(dia[:4]) if dia else dt.date.today().year
    mun, fitxa = {}, {}
    ines = {m["ine"] for m in municipios}
    for ine in ines:
        x = g[g["ine"] == ine]
        o = {"gas_n": len(x)}
        if len(x):
            for k in ("g95", "diesel"):
                if k in x and x[k].notna().any():
                    o["gas_" + k] = _r(x[k].median(), 3)
            barata = x.dropna(subset=["g95"]).sort_values("g95").head(1) if "g95" in x else x.head(0)
            fitxa[ine] = {"n": len(x), "g95": o.get("gas_g95"), "diesel": o.get("gas_diesel"),
                          "barata": ({"rotul": str(barata["rotul"].iloc[0]).strip().title(), "g95": _r(barata["g95"].iloc[0], 3)} if len(barata) else None)}
        mun[ine] = {k: {any_: v} for k, v in o.items() if v is not None}
    refs = {}
    fr = D / "carburants_refs.csv"
    if fr.exists():
        rr = pd.read_csv(fr)
        for _, row in rr.iterrows():
            for k in ("g95", "diesel"):
                if k in rr and pd.notna(row.get(k)):
                    refs.setdefault("gas_" + k, {})[row["zona"]] = round(float(row[k]), 3)
    for k in ("g95", "diesel"):
        if k in g and g[k].notna().any():
            refs.setdefault("gas_" + k, {})["gi"] = round(float(g[k].median()), 3)
    prov = {}
    fm = D / "carburants_mensual.csv"
    if fm.exists():
        h = pd.read_csv(fm).sort_values("mes")
        ser = {}
        for k, z in (("g95", "gi"), ("diesel", "cat")):
            if k in h:
                ser[z] = [[int(m[:4]) + (int(m[5:7]) - 1) / 12, m, round(float(v), 3)] for m, v in zip(h["mes"], h[k]) if pd.notna(v)]
        if dia:
            x = int(dia[:4]) + (int(dia[5:7]) - 1) / 12 + (int(dia[8:10]) - 1) / 365
            for k, z in (("g95", "gi"), ("diesel", "cat")):
                if ser.get(z) and k in g and g[k].notna().any() and x > ser[z][-1][0]:
                    ser[z].append([x, dia, round(float(g[k].median()), 3)])
        if ser.get("gi"):
            prov["ene_carb"] = {"tipus": "linia", "u": "", "dec": 2, "noms": "ene_carb", "zero": False, "series": ser}
    xifres = {"dia": dia, "n": int(len(g)), **{k: refs.get("gas_" + k, {}) for k in ("g95", "diesel")}}
    return mun, any_, fitxa, prov, refs, xifres


def _tec(nom: str) -> str | None:
    for k, rx in TECS.items():
        if re.search(rx, str(nom).strip()):
            return k
    return None


def _cobertura(municipios):
    f = D / "cobertura.csv.gz"
    if not f.exists():
        return {}, None, {}, {}, {}
    c = pd.read_csv(f, dtype={"ine": str})
    c["tec"] = c["tecnologia"].map(_tec)
    c = c[c["tec"].notna()]
    if not len(c):
        return {}, None, {}, {}, {}
    # Cada año, un solo valor por municipio y tecnología: el del último mes publicado; se prefiere la base «habitatges»
    c["ord"] = c["mes"].fillna("").map({"jun": 6, "dic": 12}).fillna(6)
    c["pb"] = (c["base"] == "habitatges").astype(int)
    c = c.sort_values(["any", "ord", "pb"]).drop_duplicates(["ine", "tec", "any"], keep="last")
    pob = {m["ine"]: m.get("poblacion") or 0 for m in municipios}
    mun = defaultdict(dict)
    for (ine, tec), g in c.groupby(["ine", "tec"]):
        if ine in pob:
            mun[ine]["cob_" + tec] = {int(a): _r(100 * v, 1) for a, v in zip(g["any"], g["pct"])}
    ult = int(c["any"].max())
    fitxa = {ine: {k[4:]: o.get(ult) for k, o in d.items()} for ine, d in mun.items()}
    # Provincia, ponderada por población
    c["pob"] = c["ine"].map(pob).fillna(0)
    ser = {}
    for tec, g in c.groupby("tec"):
        s = []
        for a, x in g.groupby("any"):
            if x["pob"].sum() > 0:
                s.append([int(a), str(int(a)), _r(100 * (x["pct"] * x["pob"]).sum() / x["pob"].sum())])
        ser[tec] = s
    prov = {}
    sr = {z: ser[t] for z, t in (("gi", "ftth"), ("cat", "100"), ("esp", "5g")) if ser.get(t)}
    if sr:
        prov["ene_cob"] = {"tipus": "linia", "u": "%", "dec": 1, "noms": "ene_cob", "zero": True, "series": sr}
    xifres = {"any": ult, **{t: (s[-1][2] if s else None) for t, s in ser.items()}}
    return dict(mun), ult, fitxa, prov, xifres


def construir(municipios) -> dict:
    res = {"mun": {}, "sec": {}, "anys": {}, "fitxa": {}, "prov": {}, "refs": {}, "xifres": {}, "resum": ""}
    if not D.exists():
        res["resum"] = "sin datos"
        return res
    resum = []
    ines = {m["ine"] for m in municipios}

    def posa(mun, clau):
        for ine, o in mun.items():
            if ine in ines:
                res["mun"].setdefault(ine, {}).update({"en_" + k if not k.startswith("en_") else k: v for k, v in o.items()})

    m1, s1, a1, p1, extra = _certificats(municipios)
    if a1:
        posa(m1, "cert")
        res["sec"] = s1
        res["anys"]["en_cert"] = a1
        res["prov"].update(p1)
        res["xifres"]["cert"] = extra["xifres"]
        for ine, f in extra["fitxa"].items():
            res["fitxa"].setdefault(ine, {})["cert"] = f
        resum.append(f"certificados {len(m1)} municipios, {len(s1)} secciones")
    m2, a2, f2, x2 = _recarrega(municipios)
    if a2:
        posa(m2, "rec")
        res["anys"]["en_rec"] = a2
        res["xifres"]["rec"] = x2
        for ine, f in f2.items():
            res["fitxa"].setdefault(ine, {})["rec"] = f
        resum.append(f"recarga {x2['n']} puntos")
    m3, a3, f3, p3, r3, x3 = _carburants(municipios)
    if a3:
        posa(m3, "gas")
        res["anys"]["en_carb"] = a3
        res["prov"].update(p3)
        res["refs"].update(r3)
        res["xifres"]["carb"] = x3
        for ine, f in f3.items():
            res["fitxa"].setdefault(ine, {})["gas"] = f
        resum.append(f"gasolineras {x3['n']} ({x3['dia']})")
    m4, a4, f4, p4, x4 = _cobertura(municipios)
    if a4:
        posa(m4, "cob")
        res["anys"]["en_cob"] = a4
        res["prov"].update(p4)
        res["xifres"]["cob"] = x4
        for ine, f in f4.items():
            res["fitxa"].setdefault(ine, {})["cob"] = f
        resum.append(f"cobertura {len(m4)} municipios hasta {a4}")
    res["resum"] = "; ".join(resum)
    return res


if __name__ == "__main__":
    import json
    mun = json.loads((RAIZ / "web" / "datos" / "municipios.json").read_text(encoding="utf-8"))["municipios"]
    r = construir(mun)
    print(r["resum"])
    print(json.dumps(r["xifres"], ensure_ascii=False)[:1500])
    print(json.dumps({k: {kk: (v["series"][kk][-3:]) for kk in v["series"]} for k, v in r["prov"].items()}, ensure_ascii=False)[:1500])
    print(json.dumps(r["mun"].get("17079"), ensure_ascii=False)[:800])
    print(json.dumps(r["fitxa"].get("17079"), ensure_ascii=False)[:800])
