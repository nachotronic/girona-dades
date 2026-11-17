"""Anuario Estadístico de la AEAT para la web.

construir() devuelve:
  mun    {ine: {clau: {any: valor}}}    IRPF municipal 2013-, para la serie del mapa y la ficha
  refs   {clau: {any: {gi, cat, esp}}}  referencias de la provincia, Cataluña y España
  any    último año del IRPF municipal
  prov   gráficos de «La província» (salarios, pensiones, IRPF provincial)

España = territorio de régimen común (la AEAT no tiene los datos del País Vasco ni de Navarra).
"""
from __future__ import annotations

import math
import pathlib

import pandas as pd

RAIZ = pathlib.Path(__file__).resolve().parent.parent
D = RAIZ / "data" / "processed" / "anuari_aeat"
ZONES = ("gi", "cat", "esp")


def r(x, n=0):
    if x is None or (isinstance(x, float) and (math.isnan(x) or math.isinf(x))):
        return None
    return round(float(x), n) if n else int(round(float(x)))


def _div(a, b, k=1.0):
    return a / b * k if b and a == a and b == b else None


def _ind(o) -> dict:
    """Indicadores de una fila del IRPF municipal (los del tema «Renda» del mapa)."""
    rb, n = o["rb"], o["decl"]
    rend = (o["capital"] or 0) + (o["immobles"] or 0) + (o["guanys"] or 0)
    return {
        "bruta": r(_div(rb, n)), "disp": r(_div(o["rd"], n)),
        "decl": r(_div(n, o["hab"], 100), 1), "tipus": r(_div(o["quota"], rb, 100), 1),
        "capital": r(_div(rend, rb, 100), 1), "activitats": r(_div(o["activitats"], rb, 100), 1),
        "treball": r(_div(o["treball"], rb, 100), 1), "pp": r(_div(o["pp_n"], n, 100), 1),
        "fills": r(_div(o["fills_decl"], n, 100), 1),
    }


def municipal():
    f = D / "irpf_mun.csv.gz"
    if not f.exists():
        return {}, {}, None
    d = pd.read_csv(f, dtype={"ine": str})
    mun, refs = {}, {}
    for _, o in d.iterrows():
        a = int(o["any"])
        for k, v in _ind(o).items():
            if v is None:
                continue
            if o["ine"] in ZONES:
                refs.setdefault(k, {}).setdefault(a, {})[o["ine"]] = v
            else:
                mun.setdefault(o["ine"], {}).setdefault(k, {})[a] = v
    return mun, refs, int(d["any"].max())


def _serie(t: pd.DataFrame, f) -> dict:
    """{zona: [[any, 'any', valor], ...]} a partir de una tabla agrupada por zona y año."""
    out = {}
    for (z, a), g in t.groupby(["zona", "any"]):
        v = f(g.sum(numeric_only=True))
        if v is not None:
            out.setdefault(z, []).append([int(a), str(int(a)), v])
    return {z: sorted(s) for z, s in out.items()}


SECTORS = {1: "agricultura", 2: "energia", 3: "industria", 4: "construccio", 5: "comerc", 6: "informacio",
           7: "finances", 8: "empreses", 9: "socials", 10: "altres"}
EDATS = [("18-25", 10), ("26-35", 12), ("36-45", 14), ("46-55", 16), ("56-65", 18), ("65+", 20)]


def provincia(refs: dict) -> dict:
    out = {}
    if refs.get("bruta"):
        out["at_renda"] = {"tipus": "linia", "u": "€", "dec": 0,
                           "series": {z: sorted([[a, str(a), o[z]] for a, o in refs["bruta"].items() if o.get(z) is not None]) for z in ZONES}}
    fs = D / "salaris.csv.gz"
    if fs.exists():
        s = pd.read_csv(fs)
        ult = int(s["any"].max())
        out["at_salari"] = {"tipus": "linia", "u": "€", "dec": 0, "series": _serie(s, lambda x: r(_div(x["m190_2"], x["m190_3"])))}
        h, m_ = s[s["sexe"] == 1], s[s["sexe"] == 2]
        sh = h.groupby(["zona", "any"])[["m190_2", "m190_3"]].sum()
        sm = m_.groupby(["zona", "any"])[["m190_2", "m190_3"]].sum()
        q = (sm["m190_2"] / sm["m190_3"]) / (sh["m190_2"] / sh["m190_3"]) * 100
        out["at_bretxa"] = {"tipus": "linia", "u": "%", "dec": 1, "zero": False, "series": {
            z: [[int(a), str(int(a)), r(v, 1)] for (zz, a), v in q.items() if zz == z] for z in ZONES}}
        u = s[s["any"] == ult]
        tot = u.groupby("zona")[["m190_2", "m190_3"]].sum()
        sec = u.groupby(["zona", "sector"])[["m190_2", "m190_3"]].sum()
        grups = []
        for c, k in SECTORS.items():
            g = {"g": k, "c": "as:" + k}
            for z in ZONES:
                x = sec.loc[(z, c)] if (z, c) in sec.index else None
                g[z] = r(_div(x["m190_2"], x["m190_3"])) if x is not None else None
            g["n"] = None
            g["pes"] = r(_div(sec.loc[("gi", c), "m190_3"], tot.loc["gi", "m190_3"], 100), 1) if ("gi", c) in sec.index else None
            grups.append(g)
        out["at_sectors"] = {"tipus": "barres", "u": "€", "dec": 0, "claus": list(ZONES), "any": ult,
                             "grups": sorted(grups, key=lambda g: -(g["gi"] or 0))}
        # Quién cobra qué: sexo, nacionalidad y edad
        tz = u.groupby("zona").sum(numeric_only=True)
        gs = []
        for k, num, den in (("homes", None, None), ("dones", None, None), ("espanyols", "m190_4", "m190_5"), ("estrangers", "m190_6", "m190_7")):
            g = {"g": k, "c": "as:" + k}
            for z in ZONES:
                if k in ("homes", "dones"):
                    x = u[(u["zona"] == z) & (u["sexe"] == (1 if k == "homes" else 2))][["m190_2", "m190_3"]].sum()
                    g[z] = r(_div(x["m190_2"], x["m190_3"]))
                else:
                    g[z] = r(_div(tz.loc[z, num], tz.loc[z, den])) if z in tz.index else None
            gs.append(g)
        for et, i in EDATS:
            gs.append({"g": et, "c": "ae:" + et, **{z: r(_div(tz.loc[z, f"m190_{i}"], tz.loc[z, f"m190_{i + 1}"])) for z in ZONES if z in tz.index}})
        out["at_qui"] = {"tipus": "barres", "u": "€", "dec": 0, "claus": list(ZONES), "any": ult, "grups": gs,
                         "abs": {"n": r(tz.loc["gi", "m190_3"]) if "gi" in tz.index else None}}
    fp = D / "pensions.csv.gz"
    if fp.exists():
        p = pd.read_csv(fp)
        out["at_pensio"] = {"tipus": "linia", "u": "€", "dec": 0, "series": _serie(p, lambda x: r(_div(x["import"], x["pensionistes"])))}
        u = p[p["any"] == p["any"].max()]
        out["at_pensio"]["abs"] = {
            "n": r(u[u["zona"] == "gi"]["pensionistes"].sum()),
            **{f"{k}_{z}": r(_div(*u[(u["zona"] == z) & (u["sexe"] == sx)][["import", "pensionistes"]].sum().tolist()))
               for k, sx in (("h", 1), ("d", 2)) for z in ZONES}}
    fm = D / "m100.csv.gz"
    if fm.exists():
        m = pd.read_csv(fm)
        out["at_tipus"] = {"tipus": "linia", "u": "%", "dec": 1, "series": _serie(m, lambda x: r(_div(x["quota"], x["bi"], 100), 1))}
        u = m[m["any"] == m["any"].max()]
        gs = []
        for k, cond in (("nacionals", u["nac"] == 0), ("estrangers", u["nac"] == 1), ("homes", u["sexe"] == 1), ("dones", u["sexe"] == 2)):
            g = {"g": k, "c": "an:" + k}
            for z in ZONES:
                x = u[cond & (u["zona"] == z)][["bi", "decl"]].sum()
                g[z] = r(_div(x["bi"], x["decl"]))
            gs.append(g)
        ext = u[u["zona"] == "gi"]
        out["at_nac"] = {"tipus": "barres", "u": "€", "dec": 0, "claus": list(ZONES), "any": int(u["any"].max()), "grups": gs,
                         "abs": {"ext": r(_div(ext[ext["nac"] == 1]["decl"].sum(), ext["decl"].sum(), 100), 1)}}
    return out


def construir() -> dict:
    mun, refs, ult = municipal()
    return {"mun": mun, "refs": refs, "any": ult, "prov": provincia(refs)}
