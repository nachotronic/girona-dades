"""Social para la web: tema «soc» del mapa (municipio, sección y comarca), sección «Social» y bloque de la ficha.

construir(municipios) devuelve un dict con:
  mun    {ine: {clave: {año|fecha: valor}}}  equipamientos sociales (RESES), cuidadores no profesionales y Airbnb
  sec    {cusec: {clave: valor}}               anuncios de Airbnb por sección censal
  com    {comarca: {clave: {año: valor}}}      servicios sociales básicos, comedor social y dependencia, por 1.000 hab.
  anys   {"soc_reses": .., "soc_cuid": .., "soc_air": "AAAA-MM-DD", "soc_com": ..}
  fitxa  {ine: {...}}                          bloque de la ficha
  prov   gráficos de la sección (Girona y Cataluña)
  refs   referencias de las comarcas (Girona y Cataluña)
  xifres cifras de cabecera
"""
from __future__ import annotations

import datetime as dt
import math
import pathlib
import sys
from collections import defaultdict

import pandas as pd

RAIZ = pathlib.Path(__file__).resolve().parent.parent
sys.path.insert(0, str(RAIZ))
sys.path.insert(0, str(RAIZ / "scripts"))

from fuentes.comun import normaliza  # noqa: E402

P = RAIZ / "data" / "processed"
D = P / "social"
TER = P / "territorio" / "municipios.csv"
GEO_SEC = RAIZ / "web" / "datos" / "seccions.geojson"
MIN_AIR_SEC = 50        # viviendas mínimas de una sección para dar anuncios por 100 viviendas
MIN_AIR_PREU = 10       # anuncios con precio para dar la mediana de un municipio
# Ayuntamientos de más de 20.000 habitantes de fuera de la provincia que tienen servicios sociales propios
# en comarcas compartidas con Girona (Osona): se suman a su comarca
EXTRA_COM = {"Osona": {"vic", "manlleu"}}

# Grupos de servicios del RESES
GG_RES = r"^Servei de (?:residència assistida|llar residència) per a gent gran"
GG_DIA = r"^Servei de centre de dia per a gent gran"
DISC = r"discapacitat|malaltia mental"


def _num(s):
    return pd.to_numeric(s, errors="coerce")


def _r(v, d=1):
    return None if v is None or (isinstance(v, float) and not math.isfinite(v)) else round(float(v), d)


def _pobs():
    try:
        import transit_web
        return transit_web._pobs()
    except Exception as e:  # noqa: BLE001
        print("AVISO social: población", e)
        return {}, {}


def _pob(s, y):
    if not s:
        return None
    return s.get(y) or s[min(s, key=lambda k: abs(k - y))]


def _emex():
    """Población de 65 años y más por municipio y población total de cada comarca entera (último año)."""
    f = P / "emex" / "emex_municipis.csv.gz"
    if not f.exists():
        return {}, {}
    e = pd.read_csv(f, dtype=str)
    e["ine"] = e["ine"].str.zfill(5)
    v = lambda i, c: dict(zip(e.loc[e["id"] == i, "ine"], _num(e.loc[e["id"] == i, c].str.replace("_", ""))))
    a, b = v("f28", "mun"), v("f29", "mun")
    m65 = {k: (a.get(k) or 0) + (b.get(k) or 0) for k in set(a) | set(b)}
    return m65, v("f171", "com")


def _comarques(municipios, pobs):
    """Población por comarca y año: la de la comarca entera (Cerdanya y Osona salen en parte de Barcelona y Lleida)
    y la parte gironina, para escalar."""
    t = pd.read_csv(TER, dtype=str)
    nom_com = dict(zip(t["codi_comarca"].str.zfill(2), t["nom_comarca"]))
    _, pob_com = _emex()
    part = defaultdict(lambda: defaultdict(float))
    ine_com = {}
    for m in municipios:
        ine_com[m["ine"]] = m.get("comarca")
        for y, v in (pobs.get(m["ine"]) or {}).items():
            part[m.get("comarca")][y] += v
    sencera, quota = {}, {}
    for c, s in part.items():
        u = max(s)
        ine = next(i for i, cc in ine_com.items() if cc == c)
        tot = pob_com.get(ine) or s[u]
        q = min(1.0, s[u] / tot) if tot else 1.0
        quota[c] = q
        sencera[c] = {y: v / q for y, v in s.items()}
    return nom_com, ine_com, sencera, quota


def _reses(municipios, pobs, m65):
    f = D / "reses.csv"
    if not f.exists():
        return {}, {}, {}, None
    r = pd.read_csv(f, dtype=str)
    r["ine"] = r["ine"].str.zfill(5)
    r["cap"] = _num(r["capacitat"]).fillna(0)
    r = r[r["ine"].notna()]
    r["res"] = r["tipologia"].str.contains(GG_RES, regex=True, na=False)
    r["dia"] = r["tipologia"].str.contains(GG_DIA, regex=True, na=False)
    r["disc"] = r["tipologia"].str.contains(DISC, case=False, regex=True, na=False)
    r["pub"] = r["qualificacio"].fillna("").str.contains("pública", case=False)
    any_ = dt.date.today().year
    mun, fitxa = defaultdict(dict), {}
    g = r.groupby("ine")
    for m in municipios:
        ine = m["ine"]
        p = _pob(pobs.get(ine), any_)
        p65 = m65.get(ine)
        x = r[r["ine"] == ine] if ine in g.groups else r.iloc[0:0]
        res, dia, disc = x.loc[x["res"], "cap"].sum(), x.loc[x["dia"], "cap"].sum(), x.loc[x["disc"], "cap"].sum()
        o = mun[ine]
        o["soc_serveis"] = {any_: int(len(x))}
        if p65:
            o["soc_res65"] = {any_: _r(100 * res / p65, 1)}
            o["soc_dia65"] = {any_: _r(100 * dia / p65, 1)}
        if p:
            o["soc_disc"] = {any_: _r(1000 * disc / p, 1)}
        if len(x):
            tip = x.groupby("tipologia").agg(n=("registre", "size"), cap=("cap", "sum")).sort_values(["cap", "n"], ascending=False)
            fitxa[ine] = {"n": int(len(x)), "res": int(res), "n_res": int(x["res"].sum()), "dia": int(dia), "disc": int(disc),
                          "res_pub": int(x.loc[x["res"] & x["pub"], "cap"].sum()),
                          "tip": [[k.replace("Servei de ", "").replace("Servei d'", "").replace("Servei ", ""), int(v.n), int(v.cap)] for k, v in tip.head(5).iterrows()]}
    tot65 = sum(m65.get(m["ine"]) or 0 for m in municipios)
    x = {"res": int(r.loc[r["res"], "cap"].sum()), "n_res": int(r["res"].sum()), "dia": int(r.loc[r["dia"], "cap"].sum()),
         "res65": _r(100 * r.loc[r["res"], "cap"].sum() / tot65, 1) if tot65 else None, "n": int(len(r)),
         "pub": _r(100 * r.loc[r["res"] & r["pub"], "cap"].sum() / max(1, r.loc[r["res"], "cap"].sum()), 0)}
    return dict(mun), fitxa, x, any_


def _cuidadors(municipios, pobs):
    f = D / "cuidadors.csv"
    if not f.exists():
        return {}, {}, None
    c = pd.read_csv(f, dtype=str)
    c["ine"] = c["ine"].str.zfill(5)
    c["n"] = _num(c["n"]).fillna(0)
    any_ = dt.date.today().year
    mun, fitxa = defaultdict(dict), {}
    for ine, g in c.groupby("ine"):
        if not ine.startswith("17"):
            continue
        n = g["n"].sum()
        p = _pob(pobs.get(ine), any_)
        if p:
            mun[ine]["soc_cuid"] = {any_: _r(1000 * n / p, 1)}
        if n >= 10:
            mun[ine]["soc_cuid_d"] = {any_: _r(100 * g.loc[g["sexe"] == "DONA", "n"].sum() / n, 0)}
        fitxa[ine] = {"n": int(n), "d": _r(100 * g.loc[g["sexe"] == "DONA", "n"].sum() / n, 0) if n else None}
    gi = c[c["ine"].str.startswith("17")]
    x = {"n": int(gi["n"].sum()), "d": _r(100 * gi.loc[gi["sexe"] == "DONA", "n"].sum() / max(1, gi["n"].sum()), 0),
         "cat_n": int(c["n"].sum())}
    return dict(mun), fitxa, (x, any_)


def _airbnb(municipios):
    fs = sorted(D.glob("airbnb_*.csv.gz"))
    if not fs:
        return {}, {}, {}, {}, None
    viv = {m["ine"]: m.get("viviendas") for m in municipios}
    noms = {normaliza(m["nom"]): m["ine"] for m in municipios}
    noms.update({normaliza(n): i for n, i in (("Castell-Platja d'Aro", "17048"), ("Calonge", "17034"), ("Calonge i Sant Antoni", "17034"))})
    mun, sec, fitxa, hist = defaultdict(dict), {}, {}, []
    for f in fs:
        dia = f.name.replace("airbnb_", "").replace(".csv.gz", "")
        a = pd.read_csv(f, dtype=str)
        a["lat"], a["lon"] = _num(a["latitude"]), _num(a["longitude"])
        a["preu"] = _num(a["price"])
        a = a.dropna(subset=["lat", "lon"])
        # Municipio por coordenadas (y, si no cae en ninguno, por el nombre del barrio)
        try:
            import geopandas as gpd
            pts = gpd.GeoDataFrame(a, geometry=gpd.points_from_xy(a["lon"], a["lat"]), crs=4326)
            ms = gpd.read_file(RAIZ / "web" / "datos" / "municipis.geojson")[["ine", "geometry"]].to_crs(4326)
            j = gpd.sjoin(pts, ms, predicate="within", how="left")
            j = j[~j.index.duplicated()]
            a["ine"] = j["ine"].astype("string").values
            if f == fs[-1] and GEO_SEC.exists():
                ss = gpd.read_file(GEO_SEC)[["cusec", "geometry"]].to_crs(4326)
                js = gpd.sjoin(pts, ss, predicate="within", how="left")
                js = js[~js.index.duplicated()]
                a["cusec"] = js["cusec"].astype("string").values
        except Exception as e:  # noqa: BLE001
            print("AVISO social: sin geopandas", e)
            a["ine"] = None
        a["ine"] = a["ine"].fillna(a["neighbourhood"].map(lambda s: noms.get(normaliza(s or ""))))
        a = a[a["ine"].notna() & a["ine"].str.startswith("17")]
        a["sencer"] = a["room_type"] == "Entire home/apt"
        lic = a["license"].fillna("").str.strip()
        a["llic"] = lic.str.contains(r"HUTG|registration number|ESFC", case=False, regex=True)
        a["exempt"] = lic.str.lower().str.startswith("exempt")
        hc = _num(a["calculated_host_listings_count"]).fillna(1)
        a["multi"] = hc >= 10
        for ine, g in a.groupby("ine"):
            o = mun[ine]
            o.setdefault("soc_air_n", {})[dia] = int(len(g))
            if viv.get(ine):
                o.setdefault("soc_air_100", {})[dia] = _r(100 * len(g) / viv[ine], 1)
            if len(g) >= 5:
                o.setdefault("soc_air_sencer", {})[dia] = _r(100 * g["sencer"].mean(), 0)
                o.setdefault("soc_air_sense", {})[dia] = _r(100 * (~g["llic"] & ~g["exempt"]).mean(), 0)
                o.setdefault("soc_air_multi", {})[dia] = _r(100 * g["multi"].mean(), 0)
            pr = g.loc[g["sencer"], "preu"].dropna()
            if len(pr) >= MIN_AIR_PREU:
                o.setdefault("soc_air_preu", {})[dia] = _r(pr.median(), 0)
            if f == fs[-1]:
                fitxa[ine] = {"n": int(len(g)), "sencer": int(g["sencer"].sum()), "preu": _r(pr.median(), 0) if len(pr) >= MIN_AIR_PREU else None,
                              "sense": int((~g["llic"] & ~g["exempt"]).sum()), "multi": int(g["multi"].sum()),
                              "disp": _r(_num(g["availability_365"]).median(), 0)}
        tot = len(a)
        hist.append({"dia": dia, "n": tot, "sencer": _r(100 * a["sencer"].mean(), 0) if tot else None,
                     "sense": _r(100 * (~a["llic"] & ~a["exempt"]).mean(), 0) if tot else None,
                     "multi": _r(100 * a["multi"].mean(), 0) if tot else None,
                     "preu": _r(a.loc[a["sencer"], "preu"].median(), 0), "cusec": "cusec" in a})
        if f == fs[-1] and "cusec" in a:
            vs = {}
            fe = P / "catastro" / "edificios_seccion.csv"
            if fe.exists():
                e = pd.read_csv(fe, dtype={"cusec": str})
                vs = dict(zip(e["cusec"].str.zfill(10), e["viviendas"]))
            for cusec, g in a[a["cusec"].notna()].groupby("cusec"):
                cusec = str(cusec).zfill(10)
                v = vs.get(cusec)
                o = {"soc_air_n": int(len(g))}
                if v and v >= MIN_AIR_SEC:
                    o["soc_air_100"] = _r(100 * len(g) / v, 1)
                sec[cusec] = o
    x = hist[-1]
    x["viv"] = _r(100 * x["n"] / max(1, sum(v or 0 for v in viv.values())), 1)
    x["hist"] = [[h["dia"], h["n"]] for h in hist]
    return dict(mun), sec, fitxa, x, hist[-1]["dia"]


def _comarcals(municipios, pobs, zon):
    """Servicios sociales básicos, comedor social y dependencia por comarca, por 1.000 habitantes de la comarca entera."""
    nom_com, ine_com, sencera, quota = _comarques(municipios, pobs)
    coms = set(sencera)
    ncom = {normaliza(c): c for c in coms}
    com, ser, refs, ult = defaultdict(dict), {}, {}, {}

    def taxa(clau, tot_com, tot_cat):
        """tot_com {comarca: {año: n}}, tot_cat {año: n}"""
        anys = sorted({y for s in tot_com.values() for y in s})
        sg, sc = [], []
        for c, s in tot_com.items():
            for y, n in s.items():
                p = _pob(sencera.get(c), y)
                if p and n is not None:
                    com[c].setdefault(clau, {})[y] = _r(1000 * n / p, 1)
        for y in anys:
            zp = zon.get(y) or {}
            n_gi = sum((tot_com.get(c) or {}).get(y, 0) * quota[c] for c in coms)
            if zp.get("gi") and n_gi:
                sg.append([y, str(y), _r(1000 * n_gi / zp["gi"], 1)])
            if zp.get("cat") and tot_cat.get(y):
                sc.append([y, str(y), _r(1000 * tot_cat[y] / zp["cat"], 1)])
        refs["soc_c_" + clau] = {a: {"gi": g, "cat": next((v for b, _, v in sc if b == a), None)} for a, _, g in sg}
        if sg:
            ser[clau] = {"gi": sg, "cat": sc}
            ult[clau] = sg[-1][0]

    def ens(fitxer, cols):
        f = D / fitxer
        if not f.exists():
            return
        s = pd.read_csv(f, dtype=str)
        s["n"] = sum(_num(s[c]).fillna(0) for c in cols if c in s)
        s["any"] = _num(s["any"]).astype("Int64")
        s["codi"] = s["codi_idescat_eacat"].fillna("").str.zfill(10)
        s["nn"] = s["nom_ens_local"].map(lambda x: normaliza(x or ""))
        s = s[s["n"] > 0]
        tc = defaultdict(lambda: defaultdict(float))
        for x in s.itertuples():
            y = int(x.any)
            c = None
            if x.nn in ncom:
                c = ncom[x.nn]
            elif x.codi.startswith("17") and x.codi[:5] in ine_com:
                c = ine_com[x.codi[:5]]
            else:
                c = next((k for k, v in EXTRA_COM.items() if x.nn in v), None)
            if c:
                tc[c][y] += x.n
        cat = s.groupby("any")["n"].sum()
        return {c: dict(v) for c, v in tc.items()}, {int(k): v for k, v in cat.items()}

    r = ens("ssb_ateses.csv", ["homes", "dones", "no_binaris"])
    if r:
        taxa("ssb", *r)
    r = ens("menjador.csv", ["homes_en_menjadors", "dones_en_menjadors", "no_binaris_en_menjadors"])
    if r:
        taxa("menj", *r)
    for fitxer, clau, col in (("dependencia_grau.csv", "dep", "total"), ("dependencia_grau.csv", "dep3", "total_grau_iii"),
                              ("teleassistencia.csv", "tele", "total"), ("ajuda_domicili.csv", "sad", "total"),
                              ("prestacio_cuidador.csv", "pcuid", "total_prestacions")):
        f = D / fitxer
        if not f.exists():
            continue
        x = pd.read_csv(f, dtype=str)
        x["n"], x["y"] = _num(x[col]), _num(x["any"]).astype("Int64")
        x["c"] = x["codi"].str.zfill(2).map(nom_com)
        tc = defaultdict(dict)
        for z in x[x["c"].notna()].itertuples():
            tc[z.c][int(z.y)] = z.n
        taxa(clau, dict(tc), {int(k): v for k, v in x.groupby("y")["n"].sum().items()})
    return dict(com), ser, refs, ult


def construir(municipios) -> dict:
    res = {"mun": {}, "sec": {}, "com": {}, "anys": {}, "fitxa": {}, "prov": {}, "refs": {}, "xifres": {}, "resum": ""}
    if not D.exists():
        res["resum"] = "sin datos"
        return res
    pobs, zon = _pobs()
    m65, _ = _emex()
    ines = {m["ine"] for m in municipios}
    resum = []

    def posa(mun):
        for ine, o in mun.items():
            if ine in ines:
                res["mun"].setdefault(ine, {}).update(o)

    def fitx(f, k):
        for ine, o in f.items():
            if ine in ines:
                res["fitxa"].setdefault(ine, {})[k] = o

    m1, f1, x1, a1 = _reses(municipios, pobs, m65)
    if a1:
        posa(m1)
        fitx(f1, "reses")
        res["anys"]["soc_reses"] = a1
        res["xifres"]["reses"] = x1
        resum.append(f"RESES {x1['n']} servicios, {x1['res']} plazas de residencia")
    m2, f2, c2 = _cuidadors(municipios, pobs)
    if c2:
        posa(m2)
        fitx(f2, "cuid")
        res["anys"]["soc_cuid"] = c2[1]
        res["xifres"]["cuid"] = c2[0]
        resum.append(f"cuidadores {c2[0]['n']}")
    m3, s3, f3, x3, a3 = _airbnb(municipios)
    if a3:
        posa(m3)
        fitx(f3, "air")
        res["sec"] = s3
        res["anys"]["soc_air"] = a3
        res["xifres"]["air"] = x3
        resum.append(f"Airbnb {a3}: {x3['n']} anuncios, {len(s3)} secciones")
    com, ser, refs, ult = _comarcals(municipios, pobs, zon)
    if com:
        res["com"] = com
        res["refs"].update(refs)
        res["anys"].update({"soc_c_" + k: v for k, v in ult.items()})
        for k in ("ssb", "dep", "sad"):
            if k in ser:
                res["prov"]["soc_" + k] = {"tipus": "linia", "u": "", "dec": 0 if k == "ssb" else 1, "zero": True, "series": ser[k]}
        res["xifres"]["com"] = {k: {"any": ser[k]["gi"][-1][0], "gi": ser[k]["gi"][-1][2], "cat": ser[k]["cat"][-1][2] if ser[k]["cat"] else None}
                                for k in ser}
        resum.append(f"comarcal {sorted(ult.items())}")
    res["resum"] = "; ".join(resum)
    return res


if __name__ == "__main__":
    import json
    mun = json.loads((RAIZ / "web" / "datos" / "municipios.json").read_text(encoding="utf-8"))["municipios"]
    r = construir(mun)
    print(r["resum"])
    print(json.dumps(r["xifres"], ensure_ascii=False)[:2000])
    print(json.dumps({k: v["series"] for k, v in r["prov"].items()}, ensure_ascii=False)[:2000])
    for i in ("17079", "17023", "17092"):
        print(i, json.dumps(r["mun"].get(i), ensure_ascii=False)[:900])
        print(json.dumps(r["fitxa"].get(i), ensure_ascii=False)[:1200])
    print(json.dumps(r["com"].get("Gironès"), ensure_ascii=False)[:1200])
    print(json.dumps(r["com"].get("Cerdanya"), ensure_ascii=False)[:600])
    print(len(r["sec"]), list(r["sec"].items())[:3])
