"""Dinero público para la web: tema «dp» del mapa (municipio y comarca), sección «Diners públics»
y bloque de la ficha municipal.

construir(municipios) devuelve un dict con:
  mun    {ine: {clave: {año: valor}}}     contratos de cada ayuntamiento y subvenciones que concede
  com    {comarca: {clave: {año: valor}}} subvenciones que reciben los beneficiarios de cada comarca
  anys   {"dp_contr": .., "dp_plat": .., "dp_subv": .., "dp_com": ..}
  fitxa  {ine: {...}}                      bloque de la ficha
  prov   gráficos de la sección
  refs   referencias (Girona y Cataluña)
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

D = RAIZ / "data" / "processed" / "diners_publics"
TER = RAIZ / "data" / "processed" / "territorio" / "municipios.csv"
ANY_REG = 2023          # el registro de contratos es completo (con los menores) desde 2023
ANY_SUBV = 2021         # el RAISC es completo desde 2021
MIN_PLAT = 10           # contratos con ofertas para dar el % de licitador único de un municipio
MENOR = {"Menor"}
DIRECTE = {"Negociat sense publicitat", "Contractes d'emergències", "Adjudicacions directes no menors"}
ADM = {"001": "gen", "002": "dip", "003": "cc", "004": "ajt"}


def _num(s):
    return pd.to_numeric(s, errors="coerce")


def _r(v, d=1):
    return None if v is None or (isinstance(v, float) and not math.isfinite(v)) else round(float(v), d)


def _pobs():
    try:
        import transit_web
        return transit_web._pobs()
    except Exception as e:  # noqa: BLE001
        print("AVISO diners: población", e)
        return {}, {}


def _pob(s, y):
    if not s:
        return None
    return s.get(y) or s[min(s, key=lambda k: abs(k - y))]


def _registre(municipios, pobs, zon, ult):
    f = D / "contractes_registre.csv"
    if not f.exists():
        return {}, {}, {}, {}
    r = pd.read_csv(f, dtype={"ine": str})
    r["import"], r["n"], r["any"] = _num(r["import"]), _num(r["n"]), _num(r["exercici"])
    r = r[(r["any"] >= ANY_REG) & (r["any"] <= ult)]
    r["ine"] = r["ine"].str.zfill(5)
    mun, fitxa = defaultdict(dict), {}
    for (ine, a), g in r.groupby(["ine", "any"]):
        tot = g["import"].sum()
        a = int(a)
        p = _pob(pobs.get(ine), a)
        if p:
            mun[ine].setdefault("dp_contr_hab", {})[a] = _r(tot / p, 0)
        if tot > 0:
            mun[ine].setdefault("dp_menor", {})[a] = _r(100 * g.loc[g["procediment_adjudicacio"].isin(MENOR), "import"].sum() / tot)
            mun[ine].setdefault("dp_directe", {})[a] = _r(100 * g.loc[g["procediment_adjudicacio"].isin(DIRECTE), "import"].sum() / tot)
        if a == ult:
            fitxa[ine] = {"imp": _r(tot, 0), "n": int(g["n"].sum()), "n_menor": int(g.loc[g["procediment_adjudicacio"].isin(MENOR), "n"].sum())}
    # Provincia y Cataluña: % del importe en contratos menores y adjudicación directa
    prov = {}
    ser = {"gi": [], "cat": []}
    ser_d = {"gi": [], "cat": []}
    fc = D / "contractes_registre_cat.csv"
    cat = pd.read_csv(fc) if fc.exists() else pd.DataFrame(columns=["exercici", "procediment_adjudicacio", "n", "imp"])
    for a in range(ANY_REG, ult + 1):
        g = r[r["any"] == a]
        c = cat[_num(cat["exercici"]) == a]
        for z, x, col in (("gi", g, "import"), ("cat", c, "imp")):
            tot = _num(x[col]).sum()
            if tot > 0:
                ser[z].append([a, str(a), _r(100 * _num(x.loc[x["procediment_adjudicacio"].isin(MENOR), col]).sum() / tot)])
                ser_d[z].append([a, str(a), _r(100 * _num(x.loc[x["procediment_adjudicacio"].isin(DIRECTE), col]).sum() / tot)])
    if ser["gi"]:
        prov["dp_menor"] = {"tipus": "linia", "u": "%", "dec": 1, "zero": True, "series": ser}
    refs = {"dp_menor": {a: {"cat": v} for a, _, v in ser["cat"]}, "dp_directe": {a: {"cat": v} for a, _, v in ser_d["cat"]}}
    # Importe por habitante de los ayuntamientos de Girona y de Cataluña
    hab = {"gi": [], "cat": []}
    for a in range(ANY_REG, ult + 1):
        zp = zon.get(a) or {}
        g = r[r["any"] == a]["import"].sum()
        c = _num(cat.loc[_num(cat["exercici"]) == a, "imp"]).sum()
        if zp.get("gi") and g:
            hab["gi"].append([a, str(a), _r(g / zp["gi"], 0)])
        if zp.get("cat") and c:
            hab["cat"].append([a, str(a), _r(c / zp["cat"], 0)])
    refs["dp_contr_hab"] = {a: {"cat": v} for a, _, v in hab["cat"]}
    x = {"any": ult, "imp": _r(r[r["any"] == ult]["import"].sum() / 1e6, 1), "menor": ser["gi"][-1][2] if ser["gi"] else None,
         "menor_cat": ser["cat"][-1][2] if ser["cat"] else None, "n": int(r[r["any"] == ult]["n"].sum())}
    return dict(mun), fitxa, (prov, refs), x


def _plataforma(municipios):
    f = D / "contractes_plataforma.csv.gz"
    if not f.exists():
        return {}, {}, {}, {}, None
    p = pd.read_csv(f, dtype=str)
    p = p[p["es_agregada"].fillna("NO") == "NO"].copy()
    p["ine"] = p["codi_ine10"].str[:5]
    p["imp"] = _num(p["import_adjudicacio_sense"])
    p["of"] = _num(p["ofertes_rebudes"])
    p["data"] = p["data_adjudicacio_contracte"].fillna(p["data_publicacio_adjudicacio"]).fillna(p["data_publicacio_formalitzacio"])
    p["any"] = _num(p["data"].str[:4])
    p = p[p["fase_publicacio"].isin(["Adjudicació", "Formalització", "Execució"]) & (p["procediment"] != "Contracte menor")]
    # Una fila por contrato (expediente y lote), la de la fase más avanzada
    ordre = {"Adjudicació": 0, "Formalització": 1, "Execució": 2}
    p["o"] = p["fase_publicacio"].map(ordre)
    p = p.sort_values("o").drop_duplicates(["ine", "codi_expedient", "numero_lot"], keep="last")
    p = p[(p["any"] >= 2023) & (p["any"] <= dt.date.today().year)]
    ult = int(p["any"].max()) if len(p) else None
    amb = p[p["of"].notna() & (p["of"] > 0)]
    mun, fitxa = defaultdict(dict), defaultdict(dict)
    for ine, g in amb.groupby("ine"):
        if len(g) >= MIN_PLAT:
            mun[ine]["dp_1of"] = {ult: _r(100 * (g["of"] == 1).mean())}
            mun[ine]["dp_of"] = {ult: _r(g["of"].mean())}
        fitxa[ine].update({"n_of": len(g), "u": int((g["of"] == 1).sum())})
    emp = p[p["tipus_empresa"].isin(["PIME", "No PIME"]) & p["imp"].notna()]
    for ine, g in emp.groupby("ine"):
        if len(g) >= MIN_PLAT and g["imp"].sum() > 0:
            mun[ine]["dp_pime"] = {ult: _r(100 * g.loc[g["tipus_empresa"] == "PIME", "imp"].sum() / g["imp"].sum())}
    # Los tres contratos más grandes de los dos últimos años
    # (los lotes de un mismo expediente se suman)
    exp = (p[p["any"] >= ult - 1].dropna(subset=["imp"]).groupby(["ine", "codi_expedient"])
           .agg(t=("denominacio", "first"), imp=("imp", "sum"), of=("of", "max"), a=("any", "max"), lots=("numero_lot", "nunique")).reset_index())
    for ine, g in exp.sort_values("imp", ascending=False).groupby("ine"):
        fitxa[ine]["grans"] = [{"t": str(x.t)[:160], "imp": _r(x.imp, 0), "of": None if pd.isna(x.of) else int(x.of), "a": int(x.a)}
                               for x in g.head(3).itertuples()]
    ser = [[int(a), str(int(a)), _r(100 * (g["of"] == 1).mean())] for a, g in amb.groupby("any") if len(g) >= 100]
    prov = {"dp_1of": {"tipus": "linia", "u": "%", "dec": 1, "zero": True, "series": {"gi": ser}}} if ser else {}
    x = {"u": _r(100 * (amb["of"] == 1).mean()), "n": int(len(amb)), "of": _r(amb["of"].median(), 0), "des": 2023, "fins": ult}
    return dict(mun), dict(fitxa), prov, x, ult


def _subvencions(municipios, pobs, zon, ult):
    res = {"mun": defaultdict(dict), "com": defaultdict(dict), "fitxa": {}, "prov": {}, "refs": {}, "x": {}}
    fa = D / "subv_ajuntaments.csv"
    if fa.exists():
        a = pd.read_csv(fa, dtype={"ine": str})
        a["import"], a["any"] = _num(a["import"]), _num(a["any"])
        a = a[(a["any"] >= ANY_SUBV) & (a["any"] <= ult)]
        a["ine"] = a["ine"].str.zfill(5)
        for (ine, y), g in a.groupby(["ine", "any"]):
            p = _pob(pobs.get(ine), int(y))
            if p:
                res["mun"][ine].setdefault("dp_subv_hab", {})[int(y)] = _r(g["import"].sum() / p, 1)
        for ine, g in a[a["any"] == ult].groupby("ine"):
            fin = g.groupby("finalitat_p_blica")["import"].sum().sort_values(ascending=False)
            res["fitxa"][ine] = {"imp": _r(g["import"].sum(), 0), "n": int(_num(g["n"]).sum()), "fin": [[str(k), _r(v, 0)] for k, v in fin.head(3).items()]}
    fc = D / "subv_comarques.csv.gz"
    if not fc.exists():
        return res
    c = pd.read_csv(fc, dtype=str)
    c["import"], c["any"] = _num(c["import"]), _num(c["any"])
    c = c[(c["any"] >= ANY_SUBV) & (c["any"] <= ult)]
    c["codi"] = c["codi_territorial"].str.split("_").str[0].str.zfill(2)
    t = pd.read_csv(TER, dtype=str)
    nom_com = dict(zip(t["codi_comarca"].str.zfill(2), t["nom_comarca"]))
    pob_com = defaultdict(lambda: defaultdict(float))
    for m in municipios:
        for y, v in (pobs.get(m["ine"]) or {}).items():
            pob_com[m.get("comarca")][y] += v
    for (codi, y), g in c.groupby(["codi", "any"]):
        nom = nom_com.get(codi)
        pc = _pob(dict(pob_com.get(nom) or {}), int(y)) if nom else None
        if not pc:
            continue
        y = int(y)
        res["com"][nom].setdefault("subv", {})[y] = _r(g["import"].sum() / pc, 0)
        for cod, k in (("001", "gen"), ("002", "dip")):
            res["com"][nom].setdefault("subv_" + k, {})[y] = _r(g.loc[g["administraci_codi"] == cod, "import"].sum() / pc, 0)
        res["com"][nom].setdefault("subv_soc", {})[y] = _r(g.loc[g["finalitat_p_blica_codi"] == "05", "import"].sum() / pc, 0)
    # Provincia y Cataluña por habitante
    tc = pd.read_csv(D / "subv_catalunya.csv") if (D / "subv_catalunya.csv").exists() else pd.DataFrame(columns=["any", "import", "administraci_codi"])
    ser = {"gi": [], "cat": []}
    for y in range(ANY_SUBV, ult + 1):
        zp = zon.get(y) or {}
        g = c.loc[c["any"] == y, "import"].sum()
        k = _num(tc.loc[_num(tc["any"]) == y, "import"]).sum()
        if zp.get("gi") and g:
            ser["gi"].append([y, str(y), _r(g / zp["gi"], 0)])
        if zp.get("cat") and k:
            ser["cat"].append([y, str(y), _r(k / zp["cat"], 0)])
    if ser["gi"]:
        res["prov"]["dp_subv"] = {"tipus": "linia", "u": "", "dec": 0, "zero": True, "series": ser}
    res["refs"]["dp_c_subv"] = {a: {"gi": g, "cat": next((v for b, _, v in ser["cat"] if b == a), None)} for a, _, g in ser["gi"]}
    u = c[c["any"] == ult]
    fin = u.groupby("finalitat_p_blica")["import"].sum().sort_values(ascending=False)
    adm = u.groupby("administraci_codi")["import"].sum()
    res["x"] = {"any": ult, "imp": _r(u["import"].sum() / 1e6, 0), "hab": ser["gi"][-1][2] if ser["gi"] else None,
                "cat": ser["cat"][-1][2] if ser["cat"] else None, "gen": _r(100 * adm.get("001", 0) / u["import"].sum(), 0) if len(u) else None,
                "fin": [[str(k), _r(v / 1e6, 1)] for k, v in fin.head(3).items()]}
    return res


def construir(municipios) -> dict:
    res = {"mun": {}, "com": {}, "anys": {}, "fitxa": {}, "prov": {}, "refs": {}, "xifres": {}, "resum": ""}
    if not D.exists():
        res["resum"] = "sin datos"
        return res
    ult = dt.date.today().year - 1
    pobs, zon = _pobs()
    ines = {m["ine"] for m in municipios}
    resum = []

    def posa(mun):
        for ine, o in mun.items():
            if ine in ines:
                res["mun"].setdefault(ine, {}).update(o)

    m1, f1, (p1, r1), x1 = _registre(municipios, pobs, zon, ult)
    if m1:
        posa(m1)
        res["anys"]["dp_contr"] = ult
        res["prov"].update(p1)
        res["refs"].update(r1)
        res["xifres"]["contr"] = x1
        for ine, f in f1.items():
            res["fitxa"].setdefault(ine, {})["contr"] = f
        resum.append(f"contratos {len(m1)} ayuntamientos ({ANY_REG}-{ult})")
    m2, f2, p2, x2, a2 = _plataforma(municipios)
    if a2:
        posa(m2)
        res["anys"]["dp_plat"] = a2
        res["prov"].update(p2)
        res["xifres"]["plat"] = x2
        for ine, f in f2.items():
            if ine in ines:
                res["fitxa"].setdefault(ine, {})["plat"] = f
        resum.append(f"plataforma {x2['n']} contratos con ofertas")
    s = _subvencions(municipios, pobs, zon, ult)
    if s["com"] or s["mun"]:
        posa(s["mun"])
        res["com"] = dict(s["com"])
        res["anys"]["dp_subv"] = ult
        res["prov"].update(s["prov"])
        res["refs"].update(s["refs"])
        res["xifres"]["subv"] = s["x"]
        for ine, f in s["fitxa"].items():
            if ine in ines:
                res["fitxa"].setdefault(ine, {})["subv"] = f
        resum.append(f"subvenciones {len(s['com'])} comarcas, {len(s['mun'])} ayuntamientos que conceden")
    res["resum"] = "; ".join(resum)
    return res


if __name__ == "__main__":
    import json
    mun = json.loads((RAIZ / "web" / "datos" / "municipios.json").read_text(encoding="utf-8"))["municipios"]
    r = construir(mun)
    print(r["resum"])
    print(json.dumps(r["xifres"], ensure_ascii=False)[:1500])
    print(json.dumps({k: v["series"] for k, v in r["prov"].items()}, ensure_ascii=False)[:1500])
    print(json.dumps(r["mun"].get("17079"), ensure_ascii=False)[:800])
    print(json.dumps(r["fitxa"].get("17079"), ensure_ascii=False)[:1200])
    print(json.dumps(r["com"].get("Gironès"), ensure_ascii=False)[:800])
    print(json.dumps(r["refs"], ensure_ascii=False)[:600])
