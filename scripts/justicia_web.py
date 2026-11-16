"""Seguridad y justicia para la web: Mossos (regiones, meses y tipos), Interior y CGPJ.

construir(municipios, salida) devuelve un dict con:
  pj      {id partido: {indicador: valor}}  (y escribe web/datos/pj.geojson)
  abp     {clau ABP: {indicador: valor}}    (tipos de hecho de los últimos 12 meses)
  x       {ine: {...}}                       (partido judicial del municipio e indicadores de Interior)
  refs    {indicador: {gi, cat, esp}}
  anys    {indicador: periodo}
  prov    gráficos de la sección «La província»
"""
from __future__ import annotations

import json
import math
import pathlib
import re
import sys

import pandas as pd

RAIZ = pathlib.Path(__file__).resolve().parent.parent
sys.path.insert(0, str(RAIZ))
from fuentes.comun import normaliza  # noqa: E402

P = RAIZ / "data" / "processed"
CAT_PROV = ["BARCELONA", "GIRONA", "LLEIDA", "TARRAGONA"]
TRIM = {1: "1T", 2: "2T", 3: "3T", 4: "4T"}


def r(x, n=1):
    if x is None or (isinstance(x, float) and (math.isnan(x) or math.isinf(x))):
        return None
    return round(float(x), n)


def _nom(n: str) -> str:
    """'Bisbal d'Empordà, la' -> 'la Bisbal d'Empordà'."""
    m = re.match(r"^(.*),\s*(la|el|les|els|l')$", str(n).strip())
    return (f"{m.group(2)}{'' if m.group(2).endswith(chr(39)) else ' '}{m.group(1)}") if m else str(n)


def taxa(n, p, per=1000, dec=1):
    return r(n / p * per, dec) if p and n == n else None


# ---------------------------------------------------------------------------

def _poblacio_prov():
    f = P / "cgpj" / "poblacio_provincies.csv"
    if not f.exists():
        return {}
    d = pd.read_csv(f)
    d = d.dropna(subset=["poblacio"])
    res = {}
    for a, g in d.groupby("any"):
        z = dict(zip(g["clau"], g["poblacio"]))
        res[int(a)] = {"gi": z.get("GIRONA"), "cat": sum(z.get(p, 0) or 0 for p in CAT_PROV) or None, "esp": z.get("ESPANA"),
                       **{p: z.get(p) for p in CAT_PROV}}
    # El INE dejó de actualizar la tabla 2852 en 2021: los años siguientes, con la población que publica el CGPJ
    fv = P / "cgpj" / "vdg_trimestral.csv"
    if fv.exists():
        v = pd.read_csv(fv)
        v = v[(v["nivell"] == "prov") & (v["var"] == "poblacio")].dropna(subset=["valor"])
        for a, g in v.groupby("any"):
            if int(a) in res:
                continue
            g = g[g["trimestre"] == g["trimestre"].max()]
            z = dict(zip(g["zona"], g["valor"]))
            if z.get("ESPANA") and all(z.get(p) for p in CAT_PROV):
                res[int(a)] = {"gi": z["GIRONA"], "cat": sum(z[p] for p in CAT_PROV), "esp": z["ESPANA"], **{p: z[p] for p in CAT_PROV}}
    return res


def _pob_any(pp, a):
    if not pp:
        return {}
    a = min(pp, key=lambda k: abs(k - a))
    return pp[a]


# ---------------------------------------------------------------------------
# CGPJ por partido judicial

def _partits(municipios):
    f = P / "cgpj" / "municipis_partits.csv"
    if not f.exists():
        return None, {}
    rel = pd.read_csv(f, dtype=str)
    rel["id"] = rel["pj_nom"].map(normaliza)
    pob = {m["ine"]: m["poblacion"] or 0 for m in municipios}
    nom_m = {m["ine"]: m["nom"] for m in municipios}
    pj = {}
    for id_, g in rel.groupby("id"):
        pj[id_] = {"nom": _nom(g["pj_nom"].iloc[0]), "pob": sum(pob.get(i, 0) for i in g["ine"]),
                   "munis": sorted(nom_m.get(i, i) for i in g["ine"])}
    return rel, pj


def _pcaxis(pj, pp, refs, anys):
    f = P / "cgpj" / "pcaxis_partits.csv.gz"
    if not f.exists():
        return {}
    d = pd.read_csv(f)
    d["id"] = d["zona"].map(lambda z: z if z in ("CAT", "ESP") else normaliza(z))
    a = int(d[d["taula"] == "civil"]["any"].max())
    d = d[d["any"] == a]
    pob_ref = _pob_any(pp, a)

    def val(taula, proc, sit):
        x = d[(d["taula"] == taula) & (d["proc"].str.lower().str.match(proc.lower())) & (d["sit"].str.lower().str.match(sit.lower()))]
        return x.groupby("id")["valor"].sum().to_dict()

    # Totales: los grandes bloques de cada jurisdicción (sin ejecuciones, incidentes ni medidas)
    BLOCS = {"penal": ["PROCESOS DEL JUZGADO DE INSTRUCCION"],
             "civil": ["PROCESOS CONTENCIOSOS DE LA L.E.C. VIGENTE (SIN INCLUIR DERECHO DE FAMILIA)",
                       "PROCESOS CONTENCIOSOS DE LA L.E.C. DEROGADA (SIN INCLUIR DERECHO DE FAMILIA)",
                       "PROCESOS RELATIVOS AL DERECHO DE FAMILIA E INFANCIA", "JURISDICCION VOLUNTARIA"]}

    def total(taula, sit):
        x = d[(d["taula"] == taula) & (d["sit"].str.lower() == sit.lower()) & d["proc"].isin(BLOCS[taula])]
        return x.groupby("id")["valor"].sum().to_dict(), BLOCS[taula]

    pen_i, bl_p = total("penal", "Ingresados")
    pen_r, _ = total("penal", "Resueltos")
    pen_p, _ = total("penal", "Pendientes al finalizar")
    civ_i, bl_c = total("civil", "Ingresados")
    civ_r, _ = total("civil", "Resueltos")
    civ_p, _ = total("civil", "Pendientes al finalizar")
    print(f"PC-Axis {a}: bloques penales {bl_p}; civiles {bl_c}")
    ll = val("llancaments", "total", "")
    ll_lau = val("llancaments", ".*arrendamientos", "")
    ll_hip = val("llancaments", ".*hipotecaria", "")
    verb = val("civil", "verbales arrendaticios", "ingresados")
    ocupa = val("civil", "verbales posesorios ocupacion", "ingresados")
    monit = val("civil", "monitorios", "ingresados")
    ind = {"penal": (pen_i, 1000), "civil": (civ_i, 1000), "llanc": (ll, 10000), "llanc_lau": (ll_lau, 10000), "llanc_hipo": (ll_hip, 10000),
           "verbals_lloguer": (verb, 10000), "ocupa": (ocupa, 10000), "monitoris": (monit, 1000)}
    res = {}
    gi_ids = list(pj)

    def zona(id_):
        if id_ == "gi":
            return lambda dic: sum(dic.get(i, 0) for i in gi_ids)
        return lambda dic: dic.get(id_, 0)

    pobs = {**{i: pj[i]["pob"] for i in gi_ids}, "gi": sum(pj[i]["pob"] for i in gi_ids), "CAT": pob_ref.get("cat"), "ESP": pob_ref.get("esp")}
    for z in gi_ids + ["gi", "CAT", "ESP"]:
        v = zona(z)
        o = {}
        for k, (dic, per) in ind.items():
            o["pj_" + k] = taxa(v(dic), pobs.get(z), per, 2 if per == 10000 and k in ("llanc_hipo", "ocupa") else 1)
        ing, res_, pen = v(pen_i) + v(civ_i), v(pen_r) + v(civ_r), v(pen_p) + v(civ_p)
        o["pj_resolucio"] = r(res_ / ing * 100, 0) if ing else None
        o["pj_pendents"] = r(pen / res_ * 100, 0) if res_ else None
        if z in gi_ids:
            res[z] = o
        else:
            for k, x in o.items():
                refs.setdefault(k, {})[{"gi": "gi", "CAT": "cat", "ESP": "esp"}[z]] = x
    for k in list(ind) + ["resolucio", "pendents"]:
        anys["pj_" + k] = a
    return res


def _vdg(pj, pp, refs, anys):
    f = P / "cgpj" / "vdg_trimestral.csv"
    if not f.exists():
        return {}, {}
    d = pd.read_csv(f)
    d["q"] = d["any"] * 10 + d["trimestre"]
    qs = sorted(d[d["nivell"] == "pj"]["q"].unique())
    if len(qs) < 4:
        return {}, {}
    ult4 = qs[-4:]
    res = {}
    x = d[(d["nivell"] == "pj") & d["q"].isin(ult4)]
    x = x.assign(id=x["zona"].map(normaliza))
    s = x.groupby(["id", "var"])["valor"].sum().unstack()
    a = int(str(ult4[-1])[:4])
    pob_ref = _pob_any(pp, a)
    for id_ in pj:
        if id_ not in s.index:
            continue
        f_ = s.loc[id_]
        p = pj[id_]["pob"]
        res[id_] = {"pj_vdg_den": taxa(f_.get("denuncies"), p, 10000), "pj_vdg_vict": taxa(f_.get("victimes"), p, 10000),
                    "pj_vdg_ord": taxa(f_.get("ordres"), p, 10000, 2),
                    "pj_vdg_ren": r(f_.get("renuncies") / f_.get("denuncies") * 100, 1) if f_.get("denuncies") else None}
    # Referencias: provincia (suma de partidos), Cataluña (provincias) y España
    gi_s = s.loc[[i for i in pj if i in s.index]].sum()
    pr = d[(d["nivell"] == "prov") & d["q"].isin(ult4)].groupby(["zona", "var"])["valor"].sum().unstack()
    cat_s = pr.loc[[z for z in CAT_PROV if z in pr.index]].sum() if len(pr) else None
    esp_s = pr.loc["ESPANA"] if "ESPANA" in pr.index else (s.loc[normaliza("ESPAÑA")] if normaliza("ESPAÑA") in s.index else None)
    for z, ss, p in (("gi", gi_s, sum(pj[i]["pob"] for i in pj)), ("cat", cat_s, pob_ref.get("cat")), ("esp", esp_s, pob_ref.get("esp"))):
        if ss is None:
            continue
        refs.setdefault("pj_vdg_den", {})[z] = taxa(ss.get("denuncies"), p, 10000)
        refs.setdefault("pj_vdg_vict", {})[z] = taxa(ss.get("victimes"), p, 10000)
        refs.setdefault("pj_vdg_ord", {})[z] = taxa(ss.get("ordres"), p, 10000, 2)
        refs.setdefault("pj_vdg_ren", {})[z] = r(ss.get("renuncies") / ss.get("denuncies") * 100, 1) if ss.get("denuncies") else None
    per = f"{str(ult4[0])[4]}T {str(ult4[0])[:4]} – {str(ult4[-1])[4]}T {str(ult4[-1])[:4]}"
    for k in ("den", "vict", "ord", "ren"):
        anys["pj_vdg_" + k] = per
    # Serie anual de la provincia, Cataluña y España (denuncias por 10.000 habitantes)
    serie = {"gi": [], "cat": [], "esp": []}
    pv = d[d["nivell"] == "prov"]
    for a_, g in pv.groupby("any"):
        if g["trimestre"].nunique() < 4:
            continue
        t_ = g[g["var"] == "denuncies"].groupby("zona")["valor"].sum()
        pb = _pob_any(pp, int(a_))
        for k, n in (("gi", t_.get("GIRONA")), ("cat", sum(t_.get(z, 0) for z in CAT_PROV)), ("esp", t_.get("ESPANA"))):
            v = taxa(n, pb.get(k), 10000)
            if v is not None:
                serie[k].append([int(a_), str(int(a_)), v])
    ultq = d[d["nivell"] == "prov"]["q"].max()
    nq = d[(d["nivell"] == "prov") & (d["q"] == ultq) & (d["zona"] == "GIRONA") & (d["var"] == "denuncies")]["valor"].sum()
    prov = {"vdg": {"tipus": "linia", "u": "", "dec": 1, "series": serie,
                    "abs": {"n": r(nq, 0), "per": f"{str(ultq)[4]}T {str(ultq)[:4]}"}}} if serie["gi"] else {}
    return res, prov


def _crisis(pp):
    f = P / "cgpj" / "crisis_provincies.csv"
    if not f.exists():
        return {}
    d = pd.read_csv(f)
    res = {}
    ll = d[d["var"] == "llanc_total"]
    serie = {"gi": [], "cat": [], "esp": []}
    for a, g in ll.groupby("any"):
        if g["trimestre"].nunique() < 4:
            continue
        pb = _pob_any(pp, int(a))
        s = g.groupby("zona")["valor"].sum()
        for k, n in (("gi", s.get("GIRONA")), ("cat", sum(s.get(z, 0) for z in CAT_PROV)), ("esp", s.get("ESPANA"))):
            v = taxa(n, pb.get(k), 10000)
            if v is not None:
                serie[k].append([int(a), str(int(a)), v])
    gq = ll[ll["zona"] == "GIRONA"].sort_values(["any", "trimestre"])
    if serie["gi"] and len(gq) >= 4:
        u = gq.iloc[-1]
        res["llancaments"] = {"tipus": "linia", "u": "", "dec": 1, "series": serie,
                              "abs": {"n4": r(gq["valor"].tail(4).sum(), 0), "fins": f"{int(u['trimestre'])}T {int(u['any'])}",
                                      "n4_ant": r(gq["valor"].iloc[-8:-4].sum(), 0) if len(gq) >= 8 else None}}
    # Composición trimestral en Girona
    comp = {}
    for k, var in (("gi", "llanc_lau"), ("cat", "llanc_hipo")):
        x = d[(d["var"] == var) & (d["zona"] == "GIRONA")].sort_values(["any", "trimestre"])
        comp[k] = [[round(a + (t - 1) / 4, 4), f"{int(a)}T{int(t)}", float(v)] for a, t, v in zip(x["any"], x["trimestre"], x["valor"])]
    if comp.get("gi"):
        tot = d[(d["var"] == "llanc_total") & (d["zona"] == "GIRONA")].set_index(["any", "trimestre"])["valor"]
        lau = d[(d["var"] == "llanc_lau") & (d["zona"] == "GIRONA")].set_index(["any", "trimestre"])["valor"]
        hip = d[(d["var"] == "llanc_hipo") & (d["zona"] == "GIRONA")].set_index(["any", "trimestre"])["valor"]
        alt = (tot - lau.reindex(tot.index).fillna(0) - hip.reindex(tot.index).fillna(0)).dropna()
        comp["esp"] = [[round(a + (t - 1) / 4, 4), f"{int(a)}T{int(t)}", float(v)] for (a, t), v in alt.items()]
        res["llanc_tipus"] = {"tipus": "linia", "u": "", "dec": 0, "noms": "llanc_tipus", "series": comp}
    return res


# ---------------------------------------------------------------------------
# Mossos

def _mossos(refs, anys):
    pol = P / "policia"
    out_abp, prov = {}, {}
    if not (pol / "poblacio_abp.csv").exists():
        return out_abp, prov
    pa = pd.read_csv(pol / "poblacio_abp.csv")
    pob = dict(zip(pa["clau"], pa["poblacio"]))
    if (pol / "fets_12m_abp.csv").exists():
        a = pd.read_csv(pol / "fets_12m_abp.csv")
        fins = str(a["fins"].iloc[0])
        g = json.loads((pol / "abp.geojson").read_text(encoding="utf-8"))
        claus_gi = [f["properties"]["clau"] for f in g["features"] if f["properties"]["clau"] != "osona"]
        for (c, t), x in a.groupby(["clau", "tipus"]):
            if t == "total":
                continue
            v = taxa(x["coneguts"].sum(), pob.get(c), 1000, 2)
            if v is not None:
                out_abp.setdefault(c, {})["mo_" + t] = v
        pob_cat = sum(v for v in pob.values() if v == v)
        pob_gi = sum(pob.get(c) or 0 for c in claus_gi)
        for t, x in a[a["tipus"] != "total"].groupby("tipus"):
            refs.setdefault("mo_" + t, {}).update({"cat": taxa(x["coneguts"].sum(), pob_cat, 1000, 2),
                                                   "gi": taxa(x[x["clau"].isin(claus_gi)]["coneguts"].sum(), pob_gi, 1000, 2)})
            y, mm = int(fins[:4]), int(fins[5:7])
            ini = f"{mm % 12 + 1:02d}/{y - 1 if mm < 12 else y}"
            anys["mo_" + t] = f"{ini}–{mm:02d}/{y}"
        # Regiones policiales: población = suma de sus ABP
        abp_rp = a.drop_duplicates("clau").set_index("clau")["rp"].to_dict()
        pob_rp = {}
        for c, rp in abp_rp.items():
            pob_rp[rp] = pob_rp.get(rp, 0) + (pob.get(c) or 0)
        tot = a[a["tipus"] == "total"].groupby("rp")["coneguts"].sum()
        grups = [{"g": re.sub(r"^RP\s+", "", rp).strip(), "gi": taxa(n, pob_rp.get(rp), 1000)} for rp, n in tot.items() if pob_rp.get(rp)]
        grups = sorted([x for x in grups if x["gi"]], key=lambda x: -x["gi"])
        cat_v = taxa(tot.sum(), sum(pob_rp.values()), 1000)
        prov["rp_fets"] = {"tipus": "barres", "u": "", "dec": 1, "claus": ["gi"], "noms": "rp", "grups": grups,
                           "abs": {"fins": fins, "cat": cat_v}}
        rpg = next((rp for rp in tot.index if "Girona" in rp), None)
        if rpg:
            tg = a[(a["rp"] == rpg) & (a["tipus"] != "total")].groupby("tipus")["coneguts"].sum()
            tc = a[a["tipus"] != "total"].groupby("tipus")["coneguts"].sum()
            gs = [{"g": t, "c": "mo:" + t, "gi": taxa(tg.get(t, 0), pob_rp[rpg], 1000, 2), "cat": taxa(tc.get(t, 0), sum(pob_rp.values()), 1000, 2)}
                  for t in tc.index]
            prov["rp_tipus"] = {"tipus": "barres", "u": "", "dec": 1, "claus": ["gi", "cat"], "noms": "rpt", "grups": sorted(gs, key=lambda x: -(x["gi"] or 0)),
                                "abs": {"fins": fins}}
    if (pol / "fets_mensuals_rp.csv.gz").exists():
        m = pd.read_csv(pol / "fets_mensuals_rp.csv.gz")
        m = m[m["tipus"] == "total"]
        m["ym"] = m["any"] * 12 + m["mes"] - 1
        abp_rp = pd.read_csv(pol / "fets_12m_abp.csv").drop_duplicates("clau").set_index("clau")["rp"].to_dict() if (pol / "fets_12m_abp.csv").exists() else {}
        pob_rp = {}
        for c, rp in abp_rp.items():
            pob_rp[rp] = pob_rp.get(rp, 0) + (pob.get(c) or 0)
        rpg = next((rp for rp in m["rp"].unique() if "Girona" in rp), None)
        series = {}
        for k, x in (("gi", m[m["rp"] == rpg]), ("cat", m)):
            s = x.groupby("ym")["coneguts"].sum().sort_index()
            s12 = s.rolling(12).sum().dropna()
            p = pob_rp.get(rpg) if k == "gi" else sum(pob_rp.values())
            series[k] = [[round(ym // 12 + (ym % 12) / 12, 4), f"{ym // 12}-{ym % 12 + 1:02d}", taxa(v, p, 1000)] for ym, v in s12.items()]
        if series.get("gi"):
            u = m[m["rp"] == rpg].groupby("ym")["coneguts"].sum().sort_index()
            prov["mossos_mes"] = {"tipus": "linia", "u": "", "dec": 1, "noms": "mmes", "series": series,
                                  "abs": {"n12": r(u.tail(12).sum(), 0), "n12_ant": r(u.iloc[-24:-12].sum(), 0) if len(u) >= 24 else None}}
    return out_abp, prov


# ---------------------------------------------------------------------------
# Interior

INT_TIP = {"total": r"^III\.", "conv": r"^I\.", "ciber": r"^II\.", "domicilis": r"^7\.1", "violencia": r"^6\.", "sexual": r"^5\.\s", "drogues": r"^10\."}


def _interior(municipios, pp, refs, anys):
    f = P / "interior" / "balanc_criminalitat.csv"
    if not f.exists():
        return {}, {}
    d = pd.read_csv(f, dtype={"codi": str})
    d = d[d["mesos"] == 12]
    a = int(d["any"].max())
    d = d[d["any"] == a]
    d["k"] = None
    for k, pat in INT_TIP.items():
        d.loc[d["tipologia"].astype(str).str.match(pat), "k"] = k
    d = d.dropna(subset=["k"])
    pob = {m["ine"]: m["poblacion"] for m in municipios}
    nom = {m["ine"]: m["nom"] for m in municipios}
    pb = _pob_any(pp, a)
    x = {}
    for (c, k), g in d[d["nivell"] == "mun"].groupby(["codi", "k"]):
        v = taxa(g["valor"].sum(), pob.get(c), 1000, 1 if k in ("total", "conv") else 2)
        if v is not None:
            x.setdefault(c, {})["int_" + k] = v
    zref = {"girona": "gi", "CAT": "cat", "ESP": "esp"}
    for _, g in d[d["nivell"].isin(["prov", "ccaa"])].iterrows():
        z = zref.get(g["codi"])
        if z and not (z == "esp" and g["nivell"] == "ccaa"):
            refs.setdefault("int_" + g["k"], {})[z] = taxa(g["valor"], pb.get(z), 1000, 1 if g["k"] in ("total", "conv") else 2)
    for k in INT_TIP:
        anys["int_" + k] = a
    grups = [{"g": nom.get(c, c), "gi": v["int_total"]} for c, v in x.items() if "int_total" in v]
    grups = sorted(grups, key=lambda g: -g["gi"])
    for z, c in (("gi", "z:gi"), ("cat", "z:cat"), ("esp", "z:esp")):
        v = refs.get("int_total", {}).get(z)
        if v is not None:
            grups.append({"g": z, "c": c, "gi": v})
    prov = {"int_munis": {"tipus": "barres", "u": "", "dec": 1, "claus": ["gi"], "noms": "intm", "grups": grups, "abs": {"any": a}}} if grups else {}
    return x, prov


# ---------------------------------------------------------------------------

def construir(municipios, salida: pathlib.Path) -> dict:
    refs, anys, prov, x = {}, {}, {}, {}
    pp = _poblacio_prov()
    rel, pj = _partits(municipios)
    zona_pj = {}
    if rel is not None:
        for _, f in rel.iterrows():
            x.setdefault(f["ine"], {}).update({"pj": f["id"], "pj_nom": _nom(f["pj_nom"])})
        try:
            zona_pj = _pcaxis(pj, pp, refs, anys)
        except Exception as e:  # noqa: BLE001
            print("AVISO PC-Axis:", e)
        v, pv = _vdg(pj, pp, refs, anys)
        for k, o in v.items():
            zona_pj.setdefault(k, {}).update(o)
        prov.update(pv)
        g_ = P / "cgpj" / "pj.geojson"
        if g_.exists():
            g = json.loads(g_.read_text(encoding="utf-8"))
            for f in g["features"]:
                id_ = normaliza(f["properties"]["pj_nom"])
                ms = pj.get(id_, {}).get("munis", [])
                f["properties"] = {"id": id_, "nom": _nom(f["properties"]["pj_nom"]),
                                   "munis": f"{len(ms)} municipis: " + ", ".join(ms[:12]) + ("…" if len(ms) > 12 else "") if ms else ""}
            (salida / "pj.geojson").write_text(json.dumps(g, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    prov.update(_crisis(pp))
    abp, pm = _mossos(refs, anys)
    prov.update(pm)
    xi, pi = _interior(municipios, pp, refs, anys)
    for c, o in xi.items():
        x.setdefault(c, {}).update(o)
    prov.update(pi)
    print(f"justicia: {len(zona_pj)} partidos, {len(abp)} ABP con tipos, {len(xi)} municipios de Interior, gráficos {sorted(prov)}")
    return {"pj": zona_pj, "abp": abp, "x": x, "refs": refs, "anys": anys, "prov": prov}
