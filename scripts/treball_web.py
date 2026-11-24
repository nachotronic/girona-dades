"""Mercado de trabajo de Xifra para la web: series trimestrales por municipio y provincia.

Lee data/processed/xifra_treball/*.csv (fuentes/xifra_treball.py) y devuelve el bloque
`xt` de conjuntura.json:
  per   trimestres (2005T1…)
  mun   {ine: {clave: [valor por trimestre]}}
  prov  {clave: [valor por trimestre]}   provincia de Girona (sumas de los municipios)
  cat   paro por nivel formativo, grupo de ocupación y actividad: último año y último mes
"""
from __future__ import annotations

import math
import pathlib

import pandas as pd

RAIZ = pathlib.Path(__file__).resolve().parent.parent
P = RAIZ / "data" / "processed" / "xifra_treball"


def _llegeix(nom: str) -> pd.DataFrame:
    f = P / f"{nom}.csv"
    if not f.exists():
        return pd.DataFrame(columns=["ine", "per", "serie", "v"])
    d = pd.read_csv(f, dtype={"ine": str, "per": str})
    d["v"] = pd.to_numeric(d["v"], errors="coerce")
    return d


def _r(v, dec=1):
    if v is None or (isinstance(v, float) and (math.isnan(v) or math.isinf(v))):
        return None
    return round(float(v), dec) if dec else int(round(float(v)))


def construir(municipios: list[dict]) -> dict | None:
    d = pd.concat([_llegeix(n) for n in ("atur", "atur_est", "contr", "contr_est", "contr_ett", "llocs", "ocup", "pa")])
    if not len(d):
        return None
    d = d[d["per"].str.fullmatch(r"\d{4}T[1-4]", na=False)]
    piv = d.pivot_table(index=["ine", "per"], columns="serie", values="v", aggfunc="first")
    pers = sorted(set(d["per"]))
    # Sin trimestres vacíos por en medio
    a0, a1 = int(pers[0][:4]), int(pers[-1][:4])
    pers = [f"{a}T{q}" for a in range(a0, a1 + 1) for q in range(1, 5) if pers[0] <= f"{a}T{q}" <= pers[-1]]
    idx = {p: i for i, p in enumerate(pers)}
    pob = {m["ine"]: {int(a): v for a, v in (m.get("pob_s") or {}).items()} for m in municipios}

    def pob_any(ine, any_):
        s = pob.get(ine) or {}
        if not s:
            return None
        if any_ in s:
            return s[any_]
        k = min(s, key=lambda a: abs(a - any_))
        return s[k]

    def col(df, c):
        return df[c] if c in df else pd.Series(index=df.index, dtype=float)

    def derivades(g: pd.DataFrame, pobs: pd.Series) -> dict[str, pd.Series]:
        atur, pa = col(g, "atur"), col(g, "pa")
        contr = col(g, "contr")
        llocs = col(g, "assal_total").add(col(g, "auton_total"), fill_value=None)
        ocup = col(g, "ocup_total")
        oe = col(g, "ocup_edat_total")
        on = col(g, "ocup_nac_total")
        res = {
            "taxa": (atur / pa * 100).where(pa >= 30),
            "atur": atur,
            "pa": pa,
            "atur_est": (col(g, "atur_est") / atur * 100).where(atur >= 20),
            "contr": contr,
            "llocs": llocs,
            "contr_h": (contr / pobs * 1000).where(pobs > 0),
            "contr_est": (col(g, "contr_est") / contr * 100).where(contr >= 30),
            "contr_ett": (col(g, "contr_ett") / contr * 100).where(contr >= 30),
            "llocs_h": (llocs / pobs * 100).where(pobs > 0),
            "auton": (col(g, "auton_total") / llocs * 100).where(llocs >= 20),
            "ocup_d": (col(g, "ocup_d") / ocup * 100).where(ocup >= 20),
            "ocup_30": (col(g, "ocup_edat_30") / oe * 100).where(oe >= 20),
            "ocup_55": (col(g, "ocup_edat_55") / oe * 100).where(oe >= 20),
            "ocup_est": (col(g, "ocup_nac_est") / on * 100).where(on >= 20),
        }
        for s in ("agri", "ind", "cons", "serv"):
            res[f"llocs_{s}"] = ((col(g, f"assal_{s}").fillna(0) + col(g, f"auton_{s}").fillna(0)) / llocs * 100).where(llocs >= 20)
        return res

    ENTERS = {"atur", "pa", "contr", "llocs"}
    mun = {}
    for ine, g in piv.groupby(level=0):
        g = g.droplevel(0).reindex(pers)
        pobs = pd.Series([pob_any(ine, int(p[:4])) for p in pers], index=pers, dtype=float)
        o = {}
        for k, s in derivades(g, pobs).items():
            vals = [_r(v, 0 if k in ENTERS else 1) for v in s.reindex(pers)]
            if any(v is not None for v in vals):
                o[k] = vals
        mun[ine] = o
    # Provincia: sumas de los municipios. La población activa solo cuando están todos.
    n_mun = piv.index.get_level_values(0).nunique()
    tot = piv.groupby(level=1).sum(min_count=1).reindex(pers)
    n_pa = piv["pa"].groupby(level=1).count().reindex(pers) if "pa" in piv else None
    if n_pa is not None:
        tot.loc[n_pa < n_mun * 0.98, ["pa", "pa_h", "pa_d", "pa_16_24"]] = None
    pob_tot = pd.Series([sum(pob_any(i, int(p[:4])) or 0 for i in pob) for p in pers], index=pers, dtype=float)
    prov = {}
    for k, s in derivades(tot, pob_tot).items():
        vals = [_r(v, 0 if k in ENTERS else 1) for v in s.reindex(pers)]
        if any(v is not None for v in vals):
            prov[k] = vals
    out = {"per": pers, "mun": mun, "prov": prov}
    # Paro por categorías
    c = P / "atur_cat.csv"
    if c.exists():
        dc = pd.read_csv(c, dtype={"ine": str, "per": str})
        dc["v"] = pd.to_numeric(dc["v"], errors="coerce")
        pany = sorted(p for p in set(dc["per"]) if len(p) == 4)
        pmes = sorted(p for p in set(dc["per"]) if len(p) == 7)
        if pany:
            pa_ = pany[-1]
            dc = dc[dc["per"].isin([pa_] + pmes[-1:])]
            ordre = {s: list(dict.fromkeys(g["cat"])) for s, g in dc.groupby("serie", sort=False)}
            cm = {}
            for (ine, s), g in dc.groupby(["ine", "serie"]):
                v = g.set_index(["per", "cat"])["v"]
                cm.setdefault(ine, {})[s] = [[_r(v.get((pa_, k)), 0), _r(v.get((pmes[-1], k)), 0) if pmes else None] for k in ordre[s]]
            tp = dc.groupby(["serie", "per", "cat"])["v"].sum(min_count=1)
            cp = {s: [[_r(tp.get((s, pa_, k)), 0), _r(tp.get((s, pmes[-1], k)), 0) if pmes else None] for k in ks] for s, ks in ordre.items()}
            out["cat"] = {"any": pa_, "mes": pmes[-1] if pmes else None, "noms": ordre, "mun": cm, "prov": cp}
    return out
