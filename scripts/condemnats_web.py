"""Delitos según nacionalidad para «La província»: condenados (INE) y detenidos e investigados (Interior).

Se comparan tasas, no cifras absolutas: condenados por 1.000 residentes de 18 años o más (las
condenas del INE son de adultos) y detenidos o investigados por 1.000 residentes de 15 años o más
(Interior incluye menores de 14 a 17). Población: INE, Estadística Continua de Población, 1 de julio.
El INE agrupa la edad de 5 en 5: los residentes de 18 y 19 años se estiman como 2/5 del grupo 15-19.

construir() devuelve los gráficos (cn_* y dn_*) para D.prov.
"""
from __future__ import annotations

import math
import pathlib
import re

import pandas as pd

RAIZ = pathlib.Path(__file__).resolve().parent.parent
P = RAIZ / "data" / "processed" / "condemnats"
CAT = ["bcn", "gi", "lle", "tar"]
Z = ["gi", "cat", "esp"]
# Agrupaciones de nacionalidad: INE condenados (76641) -> población (56947)
ORIGENS = [("es", ["Española"], ["Española"]),
           ("ue", ["País de la UE27_2020 sin España"], ["País de la UE27_2020 sin España"]),
           ("eur", ["País de Europa menos UE27_2020"], ["País de Europa menos UE27_2020"]),
           ("afr", ["De Africa"], ["De Africa"]),
           ("ame", ["De América"], ["De América del Norte", "De Centro América y Caribe", "De Sudamérica"]),
           ("asi", ["De Asia"], ["De Asia"])]
# Tipos de delito del INE que no se solapan entre sí (clave del texto en la web, nombre en el INE)
TIPUS = [("homicidi", "Homicidio y sus formas"), ("lesions", "Lesiones"), ("sexual", "Contra la libertad e indemnidad sexuales"),
         ("maltracte", "Trato degradante y violencia"), ("amenaces", "Amenazas"), ("furts", "Hurtos"), ("robatori_f", "Robo con fuerza"),
         ("robatori_v", "Robo con violencia"), ("estafes", "Estafas"), ("danys", "Daños"), ("usurpacio", "Usurpación"),
         ("drogues", "Contra la salud pública"), ("seg_vial", "Contra la seguridad vial"), ("falsedat", "Falsedades documentales"),
         ("autoritat", "Atentados contra la autoridad y de la resistencia y desobediencia"), ("trencament", "Quebrantamiento de condena"),
         ("familia", "Abandono de familia")]


def r(x, n=1):
    if x is None or (isinstance(x, float) and (math.isnan(x) or math.isinf(x))):
        return None
    return round(float(x), n)


def _edat_min(e: str) -> int | None:
    if e.startswith("Todas"):
        return None
    m = re.search(r"(\d+)", e)
    return int(m.group(1)) if m else None


class Pob:
    """Población residente a 1 de julio por zona, nacionalidad, sexo y edad mínima."""

    def __init__(self):
        p = pd.read_csv(P / "poblacio.csv.gz")
        p = p[p["data"].str.endswith("-07")].copy()
        p["any"] = p["data"].str[:4].astype(int)
        p["e0"] = p["edat"].map(_edat_min)
        p = p[p["e0"].notna()]
        cat = p[p["zona"].isin(CAT)].groupby(["edat", "e0", "nac", "sexe", "any"], as_index=False)["n"].sum()
        cat["zona"] = "cat"
        self.p = pd.concat([p, cat], ignore_index=True)
        self.anys = sorted(self.p["any"].unique())

    def __call__(self, zona, nacs, any_, edat=18, sexe="Total"):
        q = self.p[(self.p["zona"] == zona) & (self.p["nac"].isin(nacs)) & (self.p["sexe"] == sexe) & (self.p["any"] == any_)]
        if q.empty:
            return None
        n = q[q["e0"] >= max(edat, 20) if edat >= 18 else q["e0"] >= edat]["n"].sum()
        if edat == 18:
            n += 0.4 * q[q["e0"] == 15]["n"].sum()
        return float(n) or None


def _zones(d: pd.DataFrame, claus: list[str]) -> pd.DataFrame:
    """Añade Cataluña (suma de las cuatro provincias)."""
    c = d[d["zona"].isin(CAT)].groupby(claus, as_index=False)["n"].sum()
    c["zona"] = "cat"
    return pd.concat([d[d["zona"].isin(["gi", "esp"])], c], ignore_index=True)


def _taxa(n, p, per=1000, dec=1):
    return r(n / p * per, dec) if n is not None and p else None


def _condemnats(pob: Pob) -> dict:
    d = pd.read_csv(P / "condemnats.csv")
    d = _zones(d, ["sexe", "nac", "any"])
    anys = sorted(set(d["any"]) & set(pob.anys))
    if not anys:
        return {}
    a = anys[-1]
    v = lambda z, s, n, y: d[(d["zona"] == z) & (d["sexe"] == s) & (d["nac"] == n) & (d["any"] == y)]["n"].sum()
    out = {}
    # Tasas del último año
    t = {z: {k: _taxa(v(z, "Total", n, a), pob(z, [n], a)) for k, n in (("es", "Española"), ("ex", "Extranjera"))} for z in Z}
    out["cn_taxa"] = {"tipus": "barres", "u": "", "dec": 1, "claus": Z, "noms": "cnz", "any": int(a),
                      "grups": [{"g": k, "c": "cn:" + k, **{z: t[z][k] for z in Z}} for k in ("es", "ex")],
                      "abs": {"any": int(a), "n_es": int(v("gi", "Total", "Española", a)), "n_ex": int(v("gi", "Total", "Extranjera", a)),
                              "rt": {z: r(t[z]["ex"] / t[z]["es"], 1) if t[z]["es"] and t[z]["ex"] else None for z in Z}}}
    # Evolución de la razón entre tasas
    series = {}
    for z in Z:
        s = []
        for y in anys:
            te, tx = _taxa(v(z, "Total", "Española", y), pob(z, ["Española"], y), dec=4), _taxa(v(z, "Total", "Extranjera", y), pob(z, ["Extranjera"], y), dec=4)
            if te and tx:
                s.append([int(y), str(y), r(tx / te, 2)])
        series[z] = s
    out["cn_ratio"] = {"tipus": "linia", "u": "", "dec": 1, "noms": "cnz", "series": series}
    # Peso en condenados y en población adulta
    gp = []
    for k in ("cond", "pob"):
        row = {"g": k, "c": "cnp:" + k}
        for z in Z:
            if k == "cond":
                row[z] = r(v(z, "Total", "Extranjera", a) / v(z, "Total", "Total", a) * 100, 1) if v(z, "Total", "Total", a) else None
            else:
                ex, es = pob(z, ["Extranjera"], a), pob(z, ["Española"], a)
                row[z] = r(ex / (ex + es) * 100, 1) if ex and es else None
        gp.append(row)
    out["cn_pes"] = {"tipus": "barres", "u": "%", "dec": 1, "claus": Z, "noms": "cnz", "any": int(a), "grups": gp}
    # Por sexo
    gs = []
    for s, ps in (("Hombres", "Hombres"), ("Mujeres", "Mujeres")):
        for k, n in (("es", "Española"), ("ex", "Extranjera")):
            gs.append({"g": f"{s}_{k}", "c": f"cns:{'h' if s == 'Hombres' else 'd'}_{k}", **{z: _taxa(v(z, s, n, a), pob(z, [n], a, sexe=ps)) for z in Z}})
    out["cn_sexe"] = {"tipus": "barres", "u": "", "dec": 1, "claus": Z, "noms": "cnz", "any": int(a), "grups": gs}
    # Delitos por origen: por 1.000 residentes adultos de cada origen
    f = P / "delictes_origen.csv"
    if f.exists():
        o = _zones(pd.read_csv(f), ["nac", "any"])
        ao = min(int(o["any"].max()), int(a))
        go = []
        for k, nc, npob in ORIGENS:
            row = {"g": k, "c": "cno:" + k}
            for z in Z:
                n = o[(o["zona"] == z) & (o["nac"].isin(nc)) & (o["any"] == ao)]["n"].sum()
                row[z] = _taxa(n, pob(z, npob, ao))
            go.append(row)
        tot = o[(o["zona"] == "gi") & (o["nac"] == "Total") & (o["any"] == ao)]["n"].sum()
        out["cn_origen"] = {"tipus": "barres", "u": "", "dec": 1, "claus": Z, "noms": "cnz", "any": ao, "grups": go, "abs": {"n": int(tot), "any": ao}}
    # Tipos de delito (solo España)
    f = P / "delictes_tipus_esp.csv"
    if f.exists():
        t_ = pd.read_csv(f)
        at = int(t_["any"].max())
        u = t_[t_["any"] == at]
        piv = u.pivot_table(index="tipus", columns="nac", values="n", aggfunc="sum")
        if "Total" in piv and "Española" in piv:
            piv["pct"] = (1 - piv["Española"] / piv["Total"]) * 100
            tot = piv.loc["Delitos"] if "Delitos" in piv.index else None
            gt = [{"g": k, "c": "cnt:" + k, "esp": r(piv.loc[n, "pct"], 1), "n": int(piv.loc[n, "Total"])} for k, n in TIPUS if n in piv.index]
            gt.sort(key=lambda x: -(x["esp"] or 0))
            out["cn_tipus"] = {"tipus": "barres", "u": "%", "dec": 1, "claus": ["esp"], "noms": "cnz", "any": at, "nu": "cn_delictes", "grups": gt,
                               "abs": {"tot": r(tot["pct"], 1) if tot is not None else None, "any": at}}
    return out


def _detinguts(pob: Pob) -> dict:
    f = P / "detinguts.csv"
    if not f.exists():
        return {}
    d = pd.read_csv(f)
    d = d[d["sexe"].str.contains("Ambos", case=False, na=False)]
    tip = d["tipologia"].astype(str)
    tot_k = next((t for t in tip.unique() if re.search(r"total", t, re.I)), None)
    if tot_k is None:  # sin fila de total: se suman los grupos de primer nivel («1. …», «2. …»)
        d = d[tip.str.match(r"^\d+\.\s")]
    else:
        d = d[tip == tot_k]
    d = d.rename(columns={"valor": "n"})
    d = _zones(d, ["nac", "any"])
    anys = sorted(y for y in set(d["any"]) & set(pob.anys) if y >= 2020)  # Mossos incluidos desde 2020
    if not anys:
        return {}
    a = anys[-1]
    v = lambda z, n, y: d[(d["zona"] == z) & (d["nac"] == n) & (d["any"] == y)]["n"].sum()
    out = {}
    t = {}
    for z in Z:
        tt, ex = v(z, "Total", a), v(z, "Extranjera", a)
        t[z] = {"es": _taxa(tt - ex, pob(z, ["Española"], a, edat=15)), "ex": _taxa(ex, pob(z, ["Extranjera"], a, edat=15))}
    out["dn_taxa"] = {"tipus": "barres", "u": "", "dec": 1, "claus": Z, "noms": "cnz", "any": int(a),
                      "grups": [{"g": k, "c": "dn:" + k, **{z: t[z][k] for z in Z}} for k in ("es", "ex")],
                      "abs": {"any": int(a), "n": int(v("gi", "Total", a)), "ex": int(v("gi", "Extranjera", a)),
                              "pct": r(v("gi", "Extranjera", a) / v("gi", "Total", a) * 100, 0) if v("gi", "Total", a) else None,
                              "rt": {z: r(t[z]["ex"] / t[z]["es"], 1) if t[z]["es"] and t[z]["ex"] else None for z in Z}}}
    series = {z: [[int(y), str(y), r(v(z, "Extranjera", y) / v(z, "Total", y) * 100, 1)] for y in anys if v(z, "Total", y)] for z in Z}
    out["dn_pes"] = {"tipus": "linia", "u": "%", "dec": 1, "noms": "cnz", "series": series}
    f = P / "detinguts_pais.csv"
    if f.exists():
        pa = pd.read_csv(f)
        pa = pa[(pa["zona"] == "gi") & (pa["any"] == a)]
        paisos = pa[pa["pais"].astype(str).str.match(r"^\d+\.\d+\.-")].copy()
        paisos = paisos[~paisos["pais"].str.contains("Otros|Resto|Apátrida|No consta", case=False)]
        paisos["nom"] = paisos["pais"].str.replace(r"^\d+\.\d+\.-", "", regex=True).str.strip()
        tot = v("gi", "Extranjera", a)
        if tot:
            top = paisos.sort_values("valor", ascending=False).head(10)
            out["dn_pais"] = {"tipus": "barres", "u": "%", "dec": 1, "claus": ["gi"], "noms": "cnz", "any": int(a), "nu": "dn_pers",
                              "grups": [{"g": f_["nom"], "c": "dnp:" + f_["nom"], "gi": r(f_["valor"] / tot * 100, 1), "n": int(f_["valor"])} for _, f_ in top.iterrows()],
                              "abs": {"any": int(a), "tot": int(tot)}}
    return out


def construir() -> dict:
    if not (P / "poblacio.csv.gz").exists():
        return {}
    pob = Pob()
    out = {}
    for f in (_condemnats, _detinguts):
        try:
            out.update(f(pob))
        except Exception as e:  # noqa: BLE001
            print(f"AVISO condemnats {f.__name__}:", e)
    print("condemnats:", sorted(out))
    return out
