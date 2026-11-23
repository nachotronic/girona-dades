"""Medio ambiente para la web: tema «amb» del mapa, niveles de estaciones («aire» y «met»),
gráficos de la sección «Medi ambient» y bloque de la ficha municipal.

construir(municipios, sortida) devuelve un dict con:
  mun    {ine: {clave: {año: valor}}}             indicadores municipales (sequía, territorio protegido, playas)
  anys   {"amb_seq": .., "amb_terr": .., "amb_aigua": .., "amb_aire": .., "amb_met": ..}
  com    {comarca: {clave: {año: valor}}}         consumo de agua por comarca
  aire   {codi: {clave: valor}}                   estaciones de calidad del aire (último año completo)
  met    {codi: {clave: valor}}                   estaciones meteorológicas (último año completo)
  fitxa  {ine: {...}}                             bloque de la ficha
  prov   gráficos de la sección
y escribe web/datos/aire.geojson y web/datos/met.geojson (círculos alrededor de cada estación).
"""
from __future__ import annotations

import datetime as dt
import json
import math
import re
import pathlib
import sys
from collections import defaultdict

import pandas as pd

RAIZ = pathlib.Path(__file__).resolve().parent.parent
sys.path.insert(0, str(RAIZ))

D = RAIZ / "data" / "processed" / "medi_ambient"
TER = RAIZ / "data" / "processed" / "territorio" / "municipios.csv"
GEO = RAIZ / "data" / "processed" / "geo" / "municipis.geojson"
# Comarcas que solo están en parte en la provincia: sus cifras comarcales no son de Girona
FORA = {"Cerdanya", "Osona"}
# Gravedad de los estados de sequía (hidrológica)
GRAU = {"NORMALITAT": 0, "PREALERTA": 1, "ALERTA": 2, "EXCEPCIONALITAT": 3, "EMERGÈNCIA": 4, "EMERGENCIA": 4,
        "EMERGÈNCIA I": 4, "EMERGÈNCIA II": 5, "EMERGÈNCIA III": 6}
CONT = {"NO2": "no2", "PM10": "pm10", "PM2.5": "pm25", "O3": "o3", "SO2": "so2", "CO": "co"}
REF_CLIMA = (1991, 2020)
MIN_DIES = 330


def _num(s):
    return pd.to_numeric(s, errors="coerce")


def _r(v, d=1):
    return None if v is None or (isinstance(v, float) and not math.isfinite(v)) else round(float(v), d)


def _grau(s: str) -> int:
    s = str(s or "").strip().upper()
    if s in GRAU:
        return GRAU[s]
    for k, v in sorted(GRAU.items(), key=lambda x: -len(x[0])):
        if s.startswith(k):
            return v
    return 0


def _cercle(lon, lat, km=2.2, n=28):
    pts = []
    for i in range(n + 1):
        a = 2 * math.pi * i / n
        pts.append([round(lon + km / (111.32 * math.cos(math.radians(lat))) * math.cos(a), 5), round(lat + km / 110.57 * math.sin(a), 5)])
    return {"type": "Polygon", "coordinates": [pts]}


def _centroides():
    try:
        import geopandas as gpd
        g = gpd.read_file(GEO).to_crs(25831)
        c = g.geometry.representative_point().to_crs(4326)
        return {i: (p.x, p.y) for i, p in zip(g["ine"], c)}
    except Exception:  # noqa: BLE001
        return {}


def _dist(a, b):
    (x1, y1), (x2, y2) = a, b
    return math.hypot((x1 - x2) * 111.32 * math.cos(math.radians((y1 + y2) / 2)), (y1 - y2) * 110.57)


# ---------------------------------------------------------------------------

def _sequera(municipios):
    f = D / "sequera.csv"
    if not f.exists():
        return {}, None, {}, {}
    s = pd.read_csv(f, dtype=str)
    s["ine"] = s["codi_municipi"].str[:5]
    s["data"] = pd.to_datetime(s["data_canvi_estat_sequera"].str[:10], errors="coerce")
    s["g"] = s["estat_sequera_hidrol_gic"].map(_grau)
    s = s.dropna(subset=["data"]).sort_values("data")
    # Un municipio puede estar en dos unidades de explotación: cuenta la peor
    s = s.groupby(["ine", "data"], as_index=False)["g"].max()
    avui = pd.Timestamp(dt.date.today())
    mun, mensual = {}, defaultdict(lambda: defaultdict(int))
    ara = {}
    for ine, g in s.groupby("ine"):
        g = g.sort_values("data")
        dies = pd.Series(g["g"].to_numpy(), index=g["data"]).resample("D").ffill()
        dies = dies.reindex(pd.date_range(dies.index.min(), avui, freq="D")).ffill()
        o = {}
        o["seq_exc_tot"] = {avui.year: int((dies[dies.index >= "2021-01-01"] >= 3).sum())}
        for a, x in dies.groupby(dies.index.year):
            if a < 2021 or a >= avui.year:  # el año en curso no está completo
                continue
            o.setdefault("seq_alerta", {})[int(a)] = int((x >= 2).sum())
            o.setdefault("seq_exc", {})[int(a)] = int((x >= 3).sum())
        mun[ine] = o
        ara[ine] = int(dies.iloc[-1])
        for mes, x in dies.groupby(dies.index.strftime("%Y-%m")):
            if mes >= "2021-01":
                mensual[mes][2 if x.max() >= 3 else 1 if x.max() >= 2 else 0] += 1
    # Último año: días transcurridos (no completo)
    anys = sorted({a for o in mun.values() for a in o.get("seq_exc", {})})
    # Año con más municipios en sequía grave (para la cifra de la sección)
    pitjor = max(anys, key=lambda a: sum(1 for o in mun.values() if o.get("seq_exc", {}).get(a, 0) > 0)) if anys else None
    mensual["_pitjor"] = pitjor
    return mun, (anys[-1] if anys else None), dict(mensual), ara


def _nom_espai(n: str) -> str:
    """«Gavarres, les» -> «Les Gavarres», para que coincidan los nombres de Natura 2000 y de los ENP."""
    n = re.sub(r"[`´’]", "'", str(n).strip())
    m = re.match(r"^(.*),\s*(el|la|les|els|l'|s')$", n, re.I)
    if m:
        art = m.group(2).capitalize()
        sep = "" if art.endswith("'") else " "
        n = f"{art}{sep}{m.group(1)}"
    return n[:1].upper() + n[1:]


def _territori(municipios):
    f = D / "territori_protegit.csv"
    if not f.exists():
        return {}, {}
    t = pd.read_csv(f, dtype={"ine": str})
    mun, noms = {}, defaultdict(dict)
    for _, r in t.iterrows():
        ha = r["ha"]
        o = {}
        for k in ("n2000", "enp", "zvn"):
            if k in t.columns and pd.notna(r.get(k)) and ha:
                o[k + "_pct"] = round(min(100.0, r[k] / ha * 100), 1)
        mun[r["ine"]] = o
    fe = D / "espais_municipis.csv"
    if fe.exists():
        e = pd.read_csv(fe, dtype=str)
        for (capa, ine), g in e.groupby(["capa", "ine"]):
            noms[ine][capa] = sorted({_nom_espai(n) for n in g["nom"].dropna()})[:12]
    return mun, noms


def _platges():
    f = D / "platges.csv"
    if not f.exists():
        return {}, {}
    p = pd.read_csv(f, dtype=str)
    n = p.groupby("ide_municipi").size().to_dict()
    noms = p.groupby("ide_municipi")["des_nom_platja"].apply(lambda s: sorted(s.dropna())).to_dict()
    return {k[:5]: int(v) for k, v in n.items()}, {k[:5]: v for k, v in noms.items()}


def _aigua(municipios):
    f = D / "aigua_comarques.csv"
    if not f.exists():
        return {}, {}, None, {}
    c = pd.read_csv(f, dtype=str)
    t = pd.read_csv(TER, dtype=str)
    nom_com = dict(zip(t["codi_comarca"].str.zfill(2), t["nom_comarca"]))
    c["codi"] = c["codi_comarca"].str.zfill(2)
    for k in ("any", "poblaci", "dom_stic_xarxa", "activitats_econ_miques_i", "total", "consum_dom_stic_per_c_pita"):
        c[k] = _num(c[k])
    c = c.dropna(subset=["any"])
    c["any"] = c["any"].astype(int)
    com = defaultdict(dict)
    gi = c[c["codi"].isin(nom_com) & ~c["codi"].map(nom_com).isin(FORA)]
    for _, r in gi.iterrows():
        nom = nom_com[r["codi"]]
        dpc = r["consum_dom_stic_per_c_pita"]
        com[nom].setdefault("dom", {})[int(r["any"])] = _r(dpc, 1)
        if r["poblaci"]:
            com[nom].setdefault("act", {})[int(r["any"])] = _r(r["activitats_econ_miques_i"] * 1000 / r["poblaci"] / 365, 1)
            com[nom].setdefault("tot", {})[int(r["any"])] = _r(r["total"] * 1000 / r["poblaci"] / 365, 1)
    refs = defaultdict(dict)
    for a, g in c.groupby("any"):
        ga = gi[gi["any"] == a]
        tot_cat = g[g["codi"].str.match(r"^\d{2}$") & (g["codi"] != "00")]
        for z, x in (("gi", ga), ("cat", tot_cat)):
            p = x["poblaci"].sum()
            if p:
                refs["dom"].setdefault(int(a), {})[z] = _r(x["dom_stic_xarxa"].sum() * 1000 / p / 365, 1)
                refs["act"].setdefault(int(a), {})[z] = _r(x["activitats_econ_miques_i"].sum() * 1000 / p / 365, 1)
                refs["tot"].setdefault(int(a), {})[z] = _r(x["total"].sum() * 1000 / p / 365, 1)
    any_ = int(c["any"].max()) if len(c) else None
    return dict(com), dict(refs), any_, {}


def _embassaments():
    f = D / "embassaments.csv"
    if not f.exists():
        return {}, None
    e = pd.read_csv(f)
    e["pct"] = _num(e["percentatge_volum_embassat"])
    e["vol"] = _num(e["volum_embassat"])
    e["cap"] = e["vol"] / e["pct"] * 100
    e = e.dropna(subset=["pct"])
    cap = e[e["pct"] > 5].groupby("embassament")["cap"].median()
    p = e.pivot_table(index="dia", columns="embassament", values="vol", aggfunc="last").sort_index()
    ter = (p[["sau", "susqueda"]].sum(axis=1, min_count=2) / (cap["sau"] + cap["susqueda"]) * 100) if {"sau", "susqueda"} <= set(p.columns) else None
    boa = p["boadella"] / cap["boadella"] * 100 if "boadella" in p.columns else None
    def serie(s):
        s = s.dropna()
        s.index = pd.to_datetime(s.index)
        s = s[s.index.dayofweek == 0] if len(s) > 400 else s  # un punto por semana (lunes)
        return [[round(d.year + (d.dayofyear - 1) / 365.25, 4), d.strftime("%Y-%m-%d"), round(float(v), 1)] for d, v in s.items()]
    ser = {}
    if ter is not None:
        ser["gi"] = serie(ter)
    if boa is not None:
        ser["cat"] = serie(boa)
    ult = {}
    if ter is not None and len(ter.dropna()):
        ult = {"dia": str(ter.dropna().index[-1]), "ter": round(float(ter.dropna().iloc[-1]), 1),
               "boa": round(float(boa.dropna().iloc[-1]), 1) if boa is not None and len(boa.dropna()) else None,
               "hm3": round(float(p[["sau", "susqueda"]].iloc[-1].sum()), 1)}
    return ({"amb_emb": {"tipus": "linia", "u": "%", "dec": 1, "noms": "amb_emb", "series": ser}} if ser else {}), ult


def _aire():
    fe, fa = D / "aire_estacions.csv", D / "aire_anual.csv"
    if not fe.exists() or not fa.exists():
        return {}, None, {}, []
    est = pd.read_csv(fe, dtype={"codi_eoi": str, "ine": str})
    an = pd.read_csv(fa, dtype={"codi_eoi": str})
    # Año completo: cada contaminante con al menos el 75 % de las horas
    an = an[(an["hores"] >= 0.75 * 8760) & (an["any"] < dt.date.today().year)]
    if not len(an):
        return {}, None, {}, []
    any_ = int(an["any"].max())
    est["d1"] = pd.to_datetime(est["d1"])
    res, feats = {}, []
    for _, e in est.iterrows():
        x = an[(an["codi_eoi"] == e["codi_eoi"]) & (an["any"] == any_)]
        if not len(x):
            continue
        o = {}
        for _, r in x.iterrows():
            k = CONT.get(r["contaminant"])
            if not k:
                continue
            o[k] = _r(r["mitjana"], 1)
            if k == "o3" and pd.notna(r["dies120"]):
                o["o3d"] = int(r["dies120"])
            if k == "pm10" and pd.notna(r["dies50"]):
                o["pm10d"] = int(r["dies50"])
            if k == "no2" and pd.notna(r["h200"]):
                o["no2h"] = int(r["h200"])
        if not o:
            continue
        res[e["codi_eoi"]] = o
        tipus = {"traffic": "trànsit", "background": "fons", "industrial": "industrial"}.get(str(e["tipus"]), str(e["tipus"]))
        feats.append({"type": "Feature", "geometry": _cercle(float(e["lon"]), float(e["lat"]), 2.6),
                      "properties": {"id": e["codi_eoi"], "nom": str(e["nom"]), "munis": f"Estació de {tipus} · {e['municipi']} · dades del {any_}"}})
    # Serie anual por estación para el gráfico
    noms = {c: str(n) for c, n in zip(est["codi_eoi"], est["nom"])}
    prov = {}
    for cont, clau in (("NO2", "amb_no2"), ("O3", "amb_o3"), ("PM10", "amb_pm10")):
        x = an[an["contaminant"] == cont]
        top = x.groupby("codi_eoi")["any"].agg(["max", "count"]).sort_values(["max", "count"], ascending=False)
        top = [c for c in top.index if top.loc[c, "max"] >= any_ - 1][:3]
        if not top:
            continue
        claus = ["gi", "cat", "esp"]
        ser, nm = {}, {}
        for k, c in zip(claus, top):
            s = x[x["codi_eoi"] == c].sort_values("any")
            v = "dies120" if cont == "O3" else "mitjana"
            ser[k] = [[int(a), str(int(a)), _r(val, 0 if cont == "O3" else 1)] for a, val in zip(s["any"], s[v]) if pd.notna(val)]
            nm[k] = noms.get(c, c)
        prov[clau] = {"tipus": "linia", "u": "", "dec": 0 if cont == "O3" else 1, "noms": clau, "series": ser, "noms_ext": nm, "zero": True}
    return res, any_, prov, feats


def _meteo():
    fe, fa, fd = D / "meteo_estacions.csv", D / "meteo_anual.csv", D / "meteo_dies.csv"
    if not fe.exists() or not fa.exists():
        return {}, None, {}, [], {}
    est = pd.read_csv(fe, dtype=str)
    an = pd.read_csv(fa, dtype={"codi_estacio": str})
    for k in ("any", "codi_variable", "mitjana", "suma", "n"):
        an[k] = _num(an[k])
    di = pd.read_csv(fd, dtype={"codi_estacio": str}) if fd.exists() else pd.DataFrame(columns=["codi_estacio", "any"])
    di["any"] = _num(di["any"])
    # Años completos por estación (temperatura media con ≥330 días)
    an = an[an["any"] < dt.date.today().year]
    t = an[(an["codi_variable"] == 1000) & (an["n"] >= MIN_DIES)].set_index(["codi_estacio", "any"])["mitjana"]
    p = an[(an["codi_variable"] == 1300) & (an["n"] >= MIN_DIES)].set_index(["codi_estacio", "any"])["suma"]
    tx = an[(an["codi_variable"] == 1001) & (an["n"] >= MIN_DIES)].set_index(["codi_estacio", "any"])["mitjana"]
    tn = an[(an["codi_variable"] == 1002) & (an["n"] >= MIN_DIES)].set_index(["codi_estacio", "any"])["mitjana"]
    di = di.set_index(["codi_estacio", "any"])
    any_ = int(t.index.get_level_values(1).max()) if len(t) else None
    if any_ is None:
        return {}, None, {}, [], {}
    res, feats, info = {}, [], {}
    for _, e in est.iterrows():
        c = e["codi_estacio"]
        if (c, any_) not in t.index:
            continue
        o = {"t": _r(t[(c, any_)], 1)}
        if (c, any_) in p.index:
            o["p"] = _r(p[(c, any_)], 0)
        if (c, any_) in tx.index:
            o["tx"] = _r(tx[(c, any_)], 1)
        if (c, any_) in tn.index:
            o["tn"] = _r(tn[(c, any_)], 1)
        for k in ("dies30", "dies35", "nits20", "glaçades", "pluja1"):
            if k in di.columns:
                v = di[k].get((c, any_)) if (c, any_) in di.index else None
                o[k.replace("ç", "c")] = int(v) if v is not None and pd.notna(v) else 0
        # Anomalía frente a los años completos de la propia estación hasta el anterior (mínimo 10)
        ts = t.loc[c] if c in t.index.get_level_values(0) else pd.Series(dtype=float)
        base = ts[(ts.index < any_)]
        if len(base) >= 10:
            o["ta"] = _r(o["t"] - base.mean(), 1)
            o["n_base"] = int(len(base))
            o["a0"] = int(base.index.min())
        ps = p.loc[c] if c in p.index.get_level_values(0) else pd.Series(dtype=float)
        pb = ps[ps.index < any_]
        if len(pb) >= 10 and "p" in o and pb.mean():
            o["pa"] = _r((o["p"] / pb.mean() - 1) * 100, 0)
        res[c] = o
        info[c] = (float(e["longitud"]), float(e["latitud"]), str(e["nom_estacio"]), str(e.get("codi_municipi") or "")[:5])
        feats.append({"type": "Feature", "geometry": _cercle(float(e["longitud"]), float(e["latitud"]), 2.2),
                      "properties": {"id": c, "nom": str(e["nom_estacio"]), "munis": f"Meteocat (XEMA) · {e['nom_municipi']} · {e['altitud']} m · dades del {any_}"}})
    # Gráficos: media de las estaciones con todos los años completos desde el 2002
    prov = {}
    tt = t.unstack(0)
    pp = p.unstack(0)
    ok = [c for c in tt.columns if tt.loc[2002:any_, c].notna().sum() >= (any_ - 2002 + 1) - 2]
    if ok:
        m = tt.loc[2002:any_, ok].mean(axis=1, skipna=True)
        prov["amb_temp"] = {"tipus": "linia", "u": "", "dec": 1, "noms": "amb_clima", "zero": False,
                            "series": {"gi": [[int(a), str(int(a)), _r(v, 2)] for a, v in m.items() if pd.notna(v)]}, "n_est": len(ok)}
        okp = [c for c in ok if c in pp.columns]
        mp = pp.loc[2002:any_, okp].mean(axis=1, skipna=True)
        prov["amb_prec"] = {"tipus": "linia", "u": "", "dec": 0, "noms": "amb_clima",
                            "series": {"gi": [[int(a), str(int(a)), _r(v, 0)] for a, v in mp.items() if pd.notna(v)]}, "n_est": len(okp)}
        if "dies30" in di.columns:
            d30 = di["dies30"].unstack(0).reindex(index=range(2002, any_ + 1), columns=ok).fillna(0)
            prov["amb_calor"] = {"tipus": "linia", "u": "", "dec": 0, "noms": "amb_clima",
                                 "series": {"gi": [[int(a), str(int(a)), _r(v, 0)] for a, v in d30.mean(axis=1).items()]}, "n_est": len(ok)}
    return res, any_, prov, feats, info


def construir(municipios, sortida: pathlib.Path) -> dict:
    res = {"mun": {}, "anys": {}, "com": {}, "aire": {}, "met": {}, "fitxa": {}, "prov": {}, "refs": {}, "resum": ""}
    if not D.exists():
        res["resum"] = "sin datos"
        return res
    ines = {m["ine"] for m in municipios}
    resum = []
    # Sequía
    ms, as_, mensual, ara = _sequera(municipios)
    for ine, o in ms.items():
        if ine in ines:
            res["mun"].setdefault(ine, {}).update(o)
    if as_:
        res["anys"]["amb_seq"] = as_
        res["seq_pitjor"] = mensual.pop("_pitjor", None)
        mesos = sorted(mensual)
        res["prov"]["amb_seq"] = {"tipus": "linia", "u": "", "dec": 0, "noms": "amb_seq", "zero": True, "series": {
            "gi": [[int(m[:4]) + (int(m[5:]) - 1) / 12, m, mensual[m].get(2, 0)] for m in mesos],
            "cat": [[int(m[:4]) + (int(m[5:]) - 1) / 12, m, mensual[m].get(1, 0) + mensual[m].get(2, 0)] for m in mesos]}}
        resum.append(f"sequía {len(ms)} municipios hasta {as_}")
    # Territorio
    mt, noms_t = _territori(municipios)
    any_terr = dt.date.today().year
    for ine, o in mt.items():
        if ine in ines:
            for k, v in o.items():
                res["mun"].setdefault(ine, {})[k] = {any_terr: v}
    for ine, o in ms.items():
        if ine in ines and "seq_exc_tot" in o:
            res["mun"][ine]["seq_exc_tot"] = o["seq_exc_tot"]
    if mt:
        res["anys"]["amb_terr"] = any_terr
        resum.append(f"territorio {len(mt)} municipios")
    pl, noms_pl = _platges()
    for ine in ines:
        if pl:
            res["mun"].setdefault(ine, {})["platges"] = {any_terr: pl.get(ine, 0)}
    # Agua por comarcas
    com, refs, aa, _ = _aigua(municipios)
    if aa:
        res["com"] = com
        res["anys"]["amb_aigua"] = aa
        res["refs"].update({"aigua_" + k: v for k, v in refs.items()})
        for k in ("dom", "tot"):
            r = refs.get(k, {})
            ser = {z: [[a, str(a), o[z]] for a, o in sorted(r.items()) if o.get(z) is not None] for z in ("gi", "cat")}
            if ser["gi"]:
                res["prov"]["amb_aigua_" + k] = {"tipus": "linia", "u": "", "dec": 0, "series": ser}
        resum.append(f"agua comarcas hasta {aa}")
    pe, ult_e = _embassaments()
    res["prov"].update(pe)
    if ult_e:
        res["emb"] = ult_e
    if res.get("seq_pitjor"):
        res["emb"] = {**res.get("emb", {}), "seq_pitjor": res["seq_pitjor"]}
    # Estaciones
    ai, aai, pai, fai = _aire()
    if aai:
        res["aire"], res["anys"]["amb_aire"] = ai, aai
        res["prov"].update(pai)
        (sortida / "aire.geojson").write_text(json.dumps({"type": "FeatureCollection", "features": fai}, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
        resum.append(f"aire {len(ai)} estaciones ({aai})")
    me, ame, pme, fme, info_me = _meteo()
    if ame:
        res["met"], res["anys"]["amb_met"] = me, ame
        res["prov"].update(pme)
        (sortida / "met.geojson").write_text(json.dumps({"type": "FeatureCollection", "features": fme}, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
        resum.append(f"meteo {len(me)} estaciones ({ame})")
    # Ficha: lo del municipio y la estación meteorológica más cercana
    cent = _centroides()
    for m in municipios:
        ine = m["ine"]
        f = {}
        if ine in noms_t:
            f["esp"] = noms_t[ine]
        if noms_pl.get(ine):
            f["pl"] = noms_pl[ine]
        if ine in ara:
            f["seq_ara"] = ara[ine]
        if cent.get(ine) and info_me:
            c = min(info_me, key=lambda k: _dist(cent[ine], info_me[k][:2]))
            km = 0 if info_me[c][3] == ine else round(_dist(cent[ine], info_me[c][:2]), 0)
            f["met"] = {"id": c, "nom": info_me[c][2], "km": km, **me[c]}
        if f:
            res["fitxa"][ine] = f
    res["resum"] = ", ".join(resum)
    return res


if __name__ == "__main__":
    ms = json.loads((RAIZ / "web" / "datos" / "municipios.json").read_text())["municipios"]
    r = construir(ms, pathlib.Path("/tmp"))
    print(r["resum"], r["anys"])
