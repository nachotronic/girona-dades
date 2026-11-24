"""Datos municipales de Xifra para la web: m.xm = {clave: {año: valor}}.

Lee data/processed/xifra_municipal (fuentes/xifra_municipal.py) y las tablas que ya baja el
robot general de Xifra (data/processed/xifra): cuenta 413, centros ocupacionales y
equipamientos funerarios. Devuelve:
  mun    {ine: {clave: {año: valor}}}
  refs   {clave: {año: {"gi": valor de la provincia}}}
  anys   {grupo: último año}
  prov   gráficos de la provincia (policía local, nacidos fuera, turismo por comarca)
"""
from __future__ import annotations

import math
import pathlib
import re

import pandas as pd

RAIZ = pathlib.Path(__file__).resolve().parent.parent
XM = RAIZ / "data" / "processed" / "xifra_municipal"
XI = RAIZ / "data" / "processed" / "xifra"


def _r(v, dec=1):
    if v is None or (isinstance(v, float) and (math.isnan(v) or math.isinf(v))):
        return None
    return round(float(v), dec) if dec else int(round(float(v)))


def _llegeix(nom: str) -> pd.DataFrame | None:
    f = XM / f"{nom}.csv"
    if not f.exists():
        return None
    d = pd.read_csv(f, dtype={"ine": str, "any": str})
    return d


def _xifra(prefix: str) -> pd.DataFrame | None:
    fs = sorted(XI.glob(f"{prefix}_*.csv"))
    if not fs:
        return None
    d = pd.read_csv(fs[-1], dtype={"Codi INE": str})
    d = d[d["Codi INE"].str.fullmatch(r"17\d{3}", na=False)]
    any_ = re.search(r"_dades_(\d{4})_", fs[-1].name)
    return d.assign(_any=any_.group(1) if any_ else None)


def _num(s):
    return pd.to_numeric(s.astype(str).str.replace("ND", "").str.replace("#", ""), errors="coerce")


def construir(municipios: list[dict]) -> dict:
    pob = {m["ine"]: {str(a): v for a, v in (m.get("pob_s") or {}).items()} for m in municipios}

    def pob_any(ine, a):
        s = pob.get(ine) or {}
        if not s:
            return None
        if a in s:
            return s[a]
        k = min(s, key=lambda x: abs(int(x) - int(a)))
        return s[k]

    mun: dict[str, dict] = {}
    refs: dict[str, dict] = {}
    anys: dict[str, str] = {}
    prov: dict = {}
    tots: dict[str, dict] = {}  # clave -> año -> (numerador, denominador) de la provincia

    def posa(ine, k, a, v):
        if v is None or (isinstance(v, float) and math.isnan(v)):
            return
        mun.setdefault(ine, {}).setdefault(k, {})[str(a)] = v

    def per_hab(k, grup, df, col_v, factor=1, dec=0, min_pob=0):
        """df con ine, any y valor: guarda valor por habitante y la referencia de la provincia."""
        t = {}
        for ine, a, v in zip(df["ine"], df["any"], df[col_v]):
            p = pob_any(ine, a)
            if v is None or v != v or not p or p < min_pob:
                continue
            posa(ine, k, a, _r(v / p * factor, dec))
            n, d_ = t.get(a, (0, 0))
            t[a] = (n + v, d_ + p)
        refs[k] = {a: {"gi": _r(n / d_ * factor, dec)} for a, (n, d_) in t.items() if d_}
        if t:
            anys[grup] = max(anys.get(grup, "0"), max(t))

    def absolut(k, grup, df, col_v):
        t = {}
        for ine, a, v in zip(df["ine"], df["any"], df[col_v]):
            if v is None or v != v:
                continue
            posa(ine, k, a, _r(v, 0))
            t[a] = t.get(a, 0) + v
        refs[k] = {a: {"gi": _r(v, 0)} for a, v in t.items()}
        if t:
            anys[grup] = max(anys.get(grup, "0"), max(t))

    # --- Cuentas municipales ------------------------------------------------------------
    for nom, concepte, k in (("romanent", "Romanent de tresoreria per a despeses gen.", "rom_h"),
                             ("resultat", "RP ajustat", "rp_h")):
        d = _llegeix(nom)
        if d is None:
            continue
        d = d[d["concepte"] == concepte].assign(v=lambda x: pd.to_numeric(x["v"], errors="coerce"))
        per_hab(k, "xm_fin", d, "v")
    d = _xifra("03070108")
    if d is not None:
        cols = [c for c in d.columns if re.fullmatch(r"\d{4}", str(c))]
        ll = d.melt(id_vars=["Codi INE"], value_vars=cols, var_name="any", value_name="v").rename(columns={"Codi INE": "ine"})
        ll["v"] = _num(ll["v"])
        per_hab("c413_h", "xm_fin", ll, "v")
    d = _llegeix("cesel")
    if d is not None:
        d["v"] = pd.to_numeric(d["v"], errors="coerce")
        for k, codi in (("ces_res", "1621 "), ("ces_net", "163 "), ("ces_llum", "165 "), ("ces_pol", "132/130P"), ("ces_soc", "231 ")):
            per_hab(k, "xm_ces", d[d["concepte"].str.startswith(codi)], "v", dec=1)

    # --- Policía local ----------------------------------------------------------------------
    d = _llegeix("policia")
    if d is not None:
        d["n"] = pd.to_numeric(d["n"], errors="coerce")
        s = d.groupby(["ine", "any"], as_index=False)["n"].sum(min_count=1)
        # Sin policía local (0 efectivos) queda sin dato en el mapa por habitante, no como un 0
        per_hab("pol_h", "xm_pol", s[s["n"] > 0], "n", factor=10000, dec=1)
        refs["pol_h"] = {a: {"gi": _r(g["n"].sum() / sum(pob_any(i, a) or 0 for i in pob) * 10000, 1)} for a, g in s.groupby("any")}
        absolut("pol_n", "xm_pol", s, "n")
        g = d.groupby(["any", "grau"], sort=False)["n"].sum()
        ua = max(d["any"])
        prov["pol"] = {"any": ua, "graus": [[k, _r(v, 0)] for k, v in g[ua].items()],
                       "serie": {a: _r(v, 0) for a, v in d.groupby("any")["n"].sum().items()}}

    # --- Lugar de nacimiento ------------------------------------------------------------
    d = _llegeix("naixement")
    if d is not None:
        d["t"] = pd.to_numeric(d["t"], errors="coerce")
        pv = d.pivot_table(index=["ine", "any"], columns="ambit", values="t", aggfunc="first").reset_index()
        tot = pv.get("Total")
        if tot is not None:
            for k, col in (("naix_mun", "Mateix municipi. Mateixa província"), ("naix_cat", "Resta de Catalunya"),
                           ("naix_esp", "Altra comunitat autònoma"), ("naix_estr", "Total nascuts a l'estranger")):
                if col not in pv:
                    continue
                t = {}
                for ine, a, v, n in zip(pv["ine"], pv["any"], pv[col], pv["Total"]):
                    if v == v and n and n >= 50:
                        posa(ine, k, a, _r(v / n * 100, 1))
                    if v == v and n == n:
                        x = t.get(a, (0, 0))
                        t[a] = (x[0] + v, x[1] + n)
                refs[k] = {a: {"gi": _r(x / y * 100, 1)} for a, (x, y) in t.items() if y}
            anys["xm_naix"] = max(pv["any"])
            g = d[d["any"] == anys["xm_naix"]].groupby("ambit", sort=False)["t"].sum()
            prov["naix"] = {"any": anys["xm_naix"], "files": [[k, _r(v, 0)] for k, v in g.items()]}

    # --- Censo de viviendas 2021 --------------------------------------------------------
    d = _llegeix("cens")
    if d is not None:
        d["n"] = pd.to_numeric(d["n"], errors="coerce")
        # Tipo de vivienda: «no principal» incluye las vacías; se separan en secundarias y otras / vacías
        h = d[d["taula"] == "hpt"].pivot_table(index=["ine", "any"], columns="cat", values="n", aggfunc="first").reset_index()
        if {"Habitatge principal", "Habitatge no principal", "Habitatge buit"} <= set(h.columns):
            h["Habitatge secundari o altres"] = h["Habitatge no principal"] - h["Habitatge buit"].fillna(0)
            h = h.melt(id_vars=["ine", "any"], value_vars=["Habitatge principal", "Habitatge secundari o altres", "Habitatge buit"], var_name="cat", value_name="n")
            d = pd.concat([d[d["taula"] != "hpt"], h.assign(taula="hpt")])
        prov["cens"] = {}
        for taula, g0 in d.groupby("taula"):
            cats = list(dict.fromkeys(g0["cat"]))
            prov["cens"][taula] = [[c, _r(g0.loc[g0["cat"] == c, "n"].sum(), 0)] for c in cats]
            for ine, g in g0.groupby("ine"):
                tot = g["n"].sum()
                if tot and tot >= 20:
                    mun.setdefault(ine, {}).setdefault("cens_" + taula, {})["2021"] = [_r(v / tot * 100, 1) for v in g.set_index("cat")["n"].reindex(cats)]
            prov["cens"][taula + "_cats"] = cats
        anys["xm_cens"] = "2021"

    # --- Centros ocupacionales y equipamientos funerarios (robot general de Xifra) -------
    for prefix, k, col, grup in (("03030903", "ocup_n", "Total", "xm_ocu"), ("03031301", "cem_n", "Total", "xm_fun"),
                                 ("03031304", "tan_n", "Total", "xm_fun"), ("03031303", "crem_n", "Total", "xm_fun")):
        d = _xifra(prefix)
        if d is None or col not in d:
            continue
        x = pd.DataFrame({"ine": d["Codi INE"], "any": d["_any"], "v": _num(d[col])})
        if k == "ocup_n":
            x["v"] = x["v"].fillna(0)
        absolut(k, grup, x, "v")

    # --- Turismo por comarca (Idescat a través de Xifra) --------------------------------
    d = _llegeix("tur_comarca")
    if d is not None:
        for c in ("viatgers", "pernoct", "ocup"):
            d[c] = pd.to_numeric(d[c], errors="coerce")
        out = {}
        for tipus, g in d.groupby("tipus"):
            an = g[g["trim"].astype(str) == "0"]
            tr = g[g["trim"].astype(str) != "0"]
            o = {}
            for com, h in an.groupby("comarca"):
                o[com] = {a: [_r(v, 0), _r(p, 0), _r(u, 1)] for a, v, p, u in zip(h["any"], h["viatgers"], h["pernoct"], h["ocup"])}
            t = {}
            for com, h in tr.groupby("comarca"):
                t[com] = {f"{a}T{q}": [_r(v, 0), _r(p, 0), _r(u, 1)] for a, q, v, p, u in zip(h["any"], h["trim"], h["viatgers"], h["pernoct"], h["ocup"])}
            out[tipus] = {"any": o, "trim": t}
        prov["tur_com"] = out

    for ine, o in mun.items():
        for k in list(o):
            if not o[k]:
                del o[k]
    resum = f"{len(mun)} municipios; " + ", ".join(f"{k} {v}" for k, v in sorted(anys.items()))
    return {"mun": mun, "refs": refs, "anys": anys, "prov": prov, "resum": resum}


if __name__ == "__main__":
    import json
    ms = json.loads((RAIZ / "web" / "datos" / "municipios.json").read_text())["municipios"]
    r = construir(ms)
    print(r["resum"])
    print({k: r["mun"].get("17079", {}).get(k) for k in ("rom_h", "rp_h", "c413_h", "ces_res", "pol_h", "naix_estr", "ocup_n", "tan_n")})
    print({k: v for k, v in r["refs"].items() if k in ("pol_h", "naix_estr", "rom_h")})
    print(list(r["prov"]), list(r["prov"].get("tur_com", {})))
