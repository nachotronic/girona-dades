"""Turismo para la web: tema «Turisme» del mapa y sección de gráficos de la provincia.

construir(municipios) devuelve un dict con:
  mun     {ine: {clau: {any: valor}}}   series anuales por municipio (tema «tur» del mapa)
  refs    {clau: {any: {gi, cat, esp}}} valores de referencia
  any     último año de cada clave
  prov    gráficos de la sección Turisme (mismo formato que «La província»)
  fitxa   {ine: {...}}                   cifras actuales para la ficha del municipio
"""
from __future__ import annotations

import datetime as dt
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
ANY_ACTUAL = dt.date.today().year


def r(x, n=1):
    if x is None or (isinstance(x, float) and (math.isnan(x) or math.isinf(x))):
        return None
    return round(float(x), n)


def _num_es(s):
    """'66.000,00' -> 66000.0; 'nd' -> None."""
    if s is None or (isinstance(s, float) and math.isnan(s)):
        return None
    s = str(s).strip()
    if not s or s.lower() in ("nd", "-", "..", "nan"):
        return None
    try:
        return float(s.replace(".", "").replace(",", "."))
    except ValueError:
        return None


def _uno(patron):
    l = sorted(P.glob(patron))
    return l[0] if l else None


# ---------------------------------------------------------------------------
# Registre de Turisme de Catalunya: establecimientos y plazas actuales
TIPUS = {"Hotels": "hotel", "Càmpings": "camp", "Turisme rural": "rural", "Habitatges d'ús turístic": "hut",
         "Apartaments Turístics": "apt", "Llars compartides": "llar", "Autocaravanes": "auto"}


def registre():
    f = _uno("generalitat/t2h3-cgys_*")
    if not f:
        return {}, {}, None
    d = pd.read_csv(f, dtype=str)
    d = d[d["Estat"].fillna("Alta") == "Alta"].copy()
    d["tipus"] = d["Tipus establiment"].map(TIPUS)
    d = d.dropna(subset=["tipus"])
    d["ine"] = d["Codi Municipi (IDESCAT)"].str[:5]
    d["pl"] = pd.to_numeric(d["Total places"], errors="coerce")
    # Muchos pisos turísticos antiguos no tienen las plazas informadas: se imputa la media
    # del municipio (o de la provincia) de los que sí las tienen
    h = d["tipus"] == "hut"
    mitj_mun = d[h & (d["pl"] > 0)].groupby("ine")["pl"].mean()
    mitj_prov = d.loc[h & (d["pl"] > 0), "pl"].mean()
    falta = h & ~(d["pl"] > 0)
    d.loc[falta, "pl"] = d.loc[falta, "ine"].map(mitj_mun).fillna(mitj_prov)
    g = d.groupby(["ine", "tipus"]).agg(n=("pl", "size"), pl=("pl", "sum")).reset_index()
    res = {}
    for _, x in g.iterrows():
        o = res.setdefault(x["ine"], {})
        o[f"{x['tipus']}_n"] = int(x["n"])
        o[f"{x['tipus']}_pl"] = int(round(x["pl"]))
    tot = {}
    for t_ in TIPUS.values():
        tot[f"{t_}_n"] = int((d["tipus"] == t_).sum())
        tot[f"{t_}_pl"] = int(round(d.loc[d["tipus"] == t_, "pl"].sum()))
    # Categoría de los hoteles (estrellas) para la provincia
    ho = d[d["tipus"] == "hotel"]
    cat = ho["Categoria"].fillna("").str.extract(r"(\d) estrell")[0]
    tot["hotel_cat"] = {k: int(v) for k, v in ho.assign(c=cat).groupby("c")["pl"].sum().items()}
    tot["imputats"] = int(falta.sum())
    return res, tot, int(f.stat().st_mtime and ANY_ACTUAL)


# ---------------------------------------------------------------------------
# Impuesto sobre estancias en establecimientos turísticos (IEET), por municipio y semestre
IEET_TIPUS = {"EH": "hotel", "HT": "hut", "AT": "apt", "CA": "camp", "TR": "rural", "AJ": "alberg", "AE": "altres", "CR": "creuers"}


def ieet(noms):
    f = _uno("generalitat/q4sr-68c3_*")
    if not f:
        return {}, {}
    d = pd.read_csv(f, dtype=str)
    d["per"] = d["Període autoliquidació"].str.strip()
    d = d[d["per"].str.match(r"^\d{2}S[12]$")]
    d["any"] = 2000 + d["per"].str[:2].astype(int)
    files = []
    for _, x in d.iterrows():
        ine = noms.get(normaliza(_nom_coma(x["Municipi"])))
        if not ine:
            continue
        for k, t_ in IEET_TIPUS.items():
            q = _num_es(x.get(f"{k} - quota IEET"))
            rc = _num_es(x.get(f"{k} - recarrec mpal"))
            if q is not None or rc is not None:
                files.append({"ine": ine, "any": x["any"], "sem": x["per"][-1], "tipus": t_, "q": (q or 0) + (rc or 0)})
    l = pd.DataFrame(files)
    if not len(l):
        return {}, {}
    # Años completos: los dos semestres publicados
    sems = d.groupby("any")["per"].apply(lambda s: set(x[-1] for x in s))
    complets = sorted(a for a, s in sems.items() if {"1", "2"} <= s)
    l = l[l["any"].isin(complets)]
    mun = {}
    for (ine, a), g in l.groupby(["ine", "any"]):
        mun.setdefault(ine, {})[int(a)] = r(g["q"].sum(), 0)
    prov = {int(a): {t_: r(g[g["tipus"] == t_]["q"].sum(), 0) for t_ in IEET_TIPUS.values()} for a, g in l.groupby("any")}
    return mun, prov


def _nom_coma(n):
    m = re.match(r"^(.*),\s*(la|el|les|els|l')$", str(n).strip())
    return (f"{m.group(2)}{'' if m.group(2).endswith(chr(39)) else ' '}{m.group(1)}") if m else str(n)


# ---------------------------------------------------------------------------
# Xifra (Diputació): oferta por municipio y año
def xifra_oferta():
    f = P / "turisme" / "xifra_oferta.csv"
    if not f.exists():
        return {}
    d = pd.read_csv(f, dtype={"ine": str, "any": str})
    d = d[d["any"].astype(str).str.match(r"^\d{4}$")]
    d["any"] = d["any"].astype(int)
    tria = {("hotels", "Total Hotels"): "x_hotel_n", ("hotels", "Hostals i pensions"): "x_hostal_n", ("campings", "Total"): "x_camp_n",
            ("rural", "Total"): "x_rural_n", ("hut", "Nombre d'establiments"): "x_hut_n", ("hut", "Nombre de places"): "x_hut_pl",
            ("apart", "Nombre d'establiments"): "x_apt_n", ("apart", "Nombre de places"): "x_apt_pl", ("oficines", "Total"): "x_ofi_n"}
    res = {}
    for (taula, col), clau in tria.items():
        g = d[(d["taula"] == taula) & (d["col"].astype(str).str.endswith(col))]
        for _, x in g.iterrows():
            if pd.notna(x["valor"]):
                res.setdefault(x["ine"], {}).setdefault(clau, {})[int(x["any"])] = float(x["valor"])
    return res
