"""Vivienda y urbanismo de la Generalitat (fuente «habitatge») para la web.

construir(pob_mun) devuelve:
  mun    {ine: {clau: {any: valor}}}    series anuales del mapa y la ficha
  fix    {ine: {clau: valor}}           datos sin serie (zona tensionada, planeamiento, suelo)
  refs   {clau: {any: {gi, cat}}}       provincia y Cataluña (la Generalitat no publica España)
  sec    {cusec: {clau: valor}}         cédulas de habitabilidad por sección censal
  anys   {clau: último año}
  prov   gráficos de «La província»
"""
from __future__ import annotations

import math
import pathlib

import pandas as pd

RAIZ = pathlib.Path(__file__).resolve().parent.parent
P = RAIZ / "data" / "processed"
D = P / "habitatge"
ANY_HPO = 10  # años para el peso de la vivienda protegida entre las acabadas
SEC_ANYS = 5  # años completos de cédulas para las secciones


def r(x, n=0):
    if x is None or (isinstance(x, float) and (math.isnan(x) or math.isinf(x))):
        return None
    return round(float(x), n) if n else int(round(float(x)))


def _q(a, b, k=1.0, n=1):
    if a is None or b is None or (isinstance(a, float) and math.isnan(a)) or not b or (isinstance(b, float) and math.isnan(b)):
        return None
    return r(a / b * k, n)


def _poblacions(pob_mun):
    """Población por año: municipios (padrón), provincia y Cataluña."""
    pob = {}
    fp = P / "padro" / "poblacio_municipis.csv.gz"
    if fp.exists():
        for x in pd.read_csv(fp, dtype={"ine": str}).itertuples():
            pob.setdefault(x.ine, {})[int(x.any)] = float(x.valor)
    for ine, v in pob_mun.items():
        pob.setdefault(ine, {}).setdefault(2025, v)
    gi = {}
    for s in pob.values():
        for y, v in s.items():
            gi[y] = gi.get(y, 0) + v
    pob["gi"] = gi
    cat = {}
    fc = D / "poblacio_catalunya.csv"
    if fc.exists():
        cat.update({int(a): float(b) for a, b in pd.read_csv(fc).values})
    fv = P / "vehicles" / "agregats.csv"
    if fv.exists():
        for x in pd.read_csv(fv).to_dict("records"):
            if x["ambit"] == "cat" and x.get("pob") == x.get("pob"):
                cat[int(x["any"])] = float(x["pob"])
    pob["cat"] = cat
    return pob


def _habitatges():
    """Viviendas (inmuebles residenciales del Catastro) por año: municipios, provincia y Cataluña."""
    viv = {}
    fm = P / "cadastre" / "municipis.csv.gz"
    if fm.exists():
        c = pd.read_csv(fm, dtype={"codi_ine": str}, usecols=["codi_ine", "any", "UU_RES"])
        for x in c.itertuples():
            if x.UU_RES == x.UU_RES:
                viv.setdefault(x.codi_ine, {})[int(x.any)] = float(x.UU_RES)
    fr = P / "cadastre" / "referencies.json"
    if fr.exists():
        import json
        for z, per_any in json.loads(fr.read_text(encoding="utf-8")).items():
            if z in ("gi", "cat"):
                viv[z] = {int(y): float(f["UU_RES"]) for y, f in per_any.items() if f.get("UU_RES")}
    return viv


def _prox(s, y):
    if not s:
        return None
    if y in s:
        return s[y]
    k = min(s, key=lambda a: abs(a - y))
    return s[k] if abs(k - y) <= 3 else None


def construir(pob_mun: dict) -> dict:
    out = {"mun": {}, "fix": {}, "refs": {}, "sec": {}, "anys": {}, "prov": {}}
    if not D.exists():
        return out
    pob, viv = _poblacions(pob_mun), _habitatges()
    mun, refs, anys = out["mun"], out["refs"], out["anys"]

    def pon(ine, k, y, v):
        if v is None:
            return
        if ine in ("gi", "cat"):
            refs.setdefault(k, {}).setdefault(y, {})[ine] = v
        else:
            mun.setdefault(ine, {}).setdefault(k, {})[y] = v

    # Viviendas iniciadas y acabadas (1990-) y protegidas (2002-)
    fc = D / "construccio.csv.gz"
    if fc.exists():
        c = pd.read_csv(fc, dtype={"ine": str})
        for x in c.to_dict("records"):
            y, ine = int(x["any"]), x["ine"]
            p = _prox(pob.get(ine, {}), y)
            for k in ("ini", "aca"):
                if x[k] == x[k]:
                    pon(ine, "n_" + k, y, r(x[k]))
                    pon(ine, k, y, _q(x[k], p, 1000, 2))
            for k in ("ini_hpo", "aca_hpo"):
                if x[k] == x[k]:
                    pon(ine, "n_" + k, y, r(x[k]))
        anys["hb_ini"] = int(c["any"].max())
        # Peso de la protegida entre las acabadas en los últimos 10 años, y serie anual (ventana de 5 años)
        ult = int(c.dropna(subset=["aca_hpo"])["any"].max())
        for ine, g in c.groupby("ine"):
            g = g.set_index("any")
            for y in range(2006, ult + 1):
                w = g.loc[(g.index > y - 5) & (g.index <= y)]
                if len(w) == 5 and w["aca"].sum() >= (20 if ine not in ("gi", "cat") else 0):
                    pon(ine, "hpo", y, min(100.0, _q(w["aca_hpo"].sum(), w["aca"].sum(), 100, 1)))
            w = g.loc[(g.index > ult - ANY_HPO) & (g.index <= ult)]
            if ine in ("gi", "cat"):
                continue
            out["fix"].setdefault(ine, {}).update({
                "hpo10": min(100.0, _q(w["aca_hpo"].sum(), w["aca"].sum(), 100, 1)) if w["aca"].sum() >= 20 else None,
                "n_aca10": r(w["aca"].sum()), "n_hpo10": r(w["aca_hpo"].sum())})
        anys["hb_hpo"] = ult

    # Cédulas de habitabilidad: por 1.000 viviendas y superficie útil media (solo años completos)
    fd = D / "cedules.csv.gz"
    if fd.exists():
        d = pd.read_csv(fd, dtype={"ine": str})
        tots = d[d["ine"] == "gi"].set_index("any")["n"]
        # El último año está incompleto si tiene mucho menos que el anterior
        ult = int(tots.index.max())
        if ult - 1 in tots.index and tots[ult] < tots[ult - 1] * 0.9:
            ult -= 1
        d = d[(d["any"] <= ult) & (d["any"] >= 2008)]
        for x in d.to_dict("records"):
            y, ine = int(x["any"]), x["ine"]
            pon(ine, "n_ced", y, r(x["n"]))
            pon(ine, "ced", y, _q(x["n"], _prox(viv.get(ine, {}), y), 1000, 1))
            if x["n_sup"] >= (10 if ine not in ("gi", "cat") else 0):
                pon(ine, "ced_m2", y, _q(x["sup"], x["n_sup"], 1, 0))
        anys["hb_ced"] = ult
        fs = D / "cedules_seccions.csv.gz"
        if fs.exists():
            s = pd.read_csv(fs, dtype={"cusec": str})
            s = s[(s["any"] > ult - SEC_ANYS) & (s["any"] <= ult)].groupby("cusec")[["n", "sup", "n_sup"]].sum()
            vs = {}
            fe = P / "catastro" / "edificios_seccion.csv"
            if fe.exists():
                e = pd.read_csv(fe, dtype={"cusec": str})
                vs = dict(zip(e["cusec"].str.zfill(10), e["viviendas"]))
            for cusec, x in s.iterrows():
                o = {"hb_ced": _q(x["n"] / SEC_ANYS, vs.get(cusec.zfill(10)), 1000, 1) if vs.get(cusec.zfill(10), 0) >= 50 else None,
                     "hb_m2": _q(x["sup"], x["n_sup"], 1, 0) if x["n_sup"] >= 10 else None}
                out["sec"][cusec.zfill(10)] = {k: v for k, v in o.items() if v is not None}
            anys["hb_sec"] = [ult - SEC_ANYS + 1, ult]
            # Mismo cálculo por municipio, para comparar con las secciones
            m5 = d[(d["any"] > ult - SEC_ANYS)].groupby("ine")[["n", "sup", "n_sup"]].sum()
            for ine, x in m5.iterrows():
                v = _prox(viv.get(ine, {}), ult)
                o = {"ced5": _q(x["n"] / SEC_ANYS, v, 1000, 1), "m2_5": _q(x["sup"], x["n_sup"], 1, 0) if x["n_sup"] >= 10 else None}
                if ine in ("gi", "cat"):
                    for k, val in o.items():
                        refs.setdefault(k, {})[ine] = val
                else:
                    out["fix"].setdefault(ine, {}).update(o)

    # Impuesto sobre las viviendas vacías (grandes tenedores), por 1.000 viviendas
    fb = D / "buits_ihb.csv.gz"
    if fb.exists():
        b = pd.read_csv(fb, dtype={"ine": str})
        for x in b.to_dict("records"):
            y, ine = int(x["any"]), x["ine"]
            n = x["ihb"] if x["ihb"] == x["ihb"] else 0
            pon(ine, "n_ihb", y, r(n))
            pon(ine, "ihb", y, _q(n, _prox(viv.get(ine, {}), y), 1000, 2))
        anys["hb_ihb"] = int(b["any"].max())
        # Los municipios que no aparecen no tienen ningún piso declarado
        for ine in pob_mun:
            for y in range(int(b["any"].min()), anys["hb_ihb"] + 1):
                if y not in mun.get(ine, {}).get("ihb", {}) and _prox(viv.get(ine, {}), y):
                    pon(ine, "ihb", y, 0.0)
                    pon(ine, "n_ihb", y, 0)

    # Áreas de política de vivienda
    fa = D / "arees_politica.csv"
    if fa.exists():
        a = pd.read_csv(fa, dtype=str)
        for x in a.to_dict("records"):
            z = x.get("zona_de_mercat_residencial_tensat")
            out["fix"].setdefault(x["ine"], {}).update({
                "zmrt": z if isinstance(z, str) and z.startswith("ZMRT") else "no",
                "ptsh": x.get("area_ptsh") or None, "hpo_zona": x.get("hpo") or None})

    # Mapa urbanístico: clasificación del suelo (último año) y sectores de desarrollo
    fu = D / "urbanisme.csv.gz"
    if fu.exists():
        u = pd.read_csv(fu, dtype={"ine": str})
        ult = int(u["any"].max())
        anys["hb_urb"] = ult
        for x in u.to_dict("records"):
            y, ine = int(x["any"]), x["ine"]
            sup = x["superficie_ha"]
            o = {"su": _q(x["_05_su"], sup, 100, 1), "surb": _q(x["_05_surb"], sup, 100, 1), "snu": _q(x["_05_snu"], sup, 100, 1),
                 "su_hab": _q(x["_05_su"] * 10_000, x["poblacio_padro"], 1, 0), "snc": _q(x["_05_snc"], x["_05_su"], 100, 1),
                 "res_suc": _q(x["_13_qual_suc"], x["_05_suc"], 100, 1)}
            for k, v in o.items():
                pon(ine, "u_" + k, y, v)
            if y == ult and ine in ("gi", "cat"):
                refs.setdefault("u_ha", {})[ine] = {"su": r(x["_05_su"]), "surb": r(x["_05_surb"]), "snu": r(x["_05_snu"])}
    fm = D / "muc_seccions.csv.gz"
    if fm.exists():
        u = pd.read_csv(fm, dtype={"cusec": str}).fillna(0)
        g = lambda x, *ks: sum(x.get(k, 0) for k in ks)  # noqa: E731
        for x in u.to_dict("records"):
            tot = x["ha_total"]
            o = {"hb_su": _q(g(x, "SUC", "SNC"), tot, 100, 1), "hb_surb": _q(g(x, "SUD", "SND"), tot, 100, 1), "hb_snu": _q(g(x, "SNU"), tot, 100, 1)}
            out["sec"].setdefault(x["cusec"].zfill(10), {}).update({k: v for k, v in o.items() if v is not None})
    fs = D / "sectors_desenvolupament.csv.gz"
    if fs.exists():
        s = pd.read_csv(fs, dtype={"ine": str})
        s = s[s["tip_desenv"].isin(["Residencial", "Mixt"])]
        g = s.groupby("ine")[["num_habitg", "hab_vacant"]].sum()
        tot = {"gi": g[g.index.str.startswith("17")].sum(), "cat": g.sum()}
        for ine, x in list(g.iterrows()) + list(tot.items()):
            v = _prox(viv.get(ine, {}), 2025)
            o = {"plan": r(x["num_habitg"]), "pend": r(x["hab_vacant"]), "pend_viv": _q(x["hab_vacant"], v, 100, 1)}
            if ine in ("gi", "cat"):
                refs.setdefault("plan", {})[ine] = o
            elif ine.startswith("17"):
                out["fix"].setdefault(ine, {}).update(o)
        for ine in pob_mun:
            if ine not in g.index and _prox(viv.get(ine, {}), 2025):
                out["fix"].setdefault(ine, {}).update({"plan": 0, "pend": 0, "pend_viv": 0.0})
    out["prov"] = provincia(refs, anys)
    return out


def _serie(refs, k, desde=None):
    o = refs.get(k, {})
    return {z: [[y, str(y), o[y][z]] for y in sorted(o) if o[y].get(z) is not None and (desde is None or y >= desde)] for z in ("gi", "cat")}


def provincia(refs, anys) -> dict:
    out = {}
    if refs.get("ini"):
        out["hb_ini"] = {"tipus": "linia", "u": "", "dec": 1, "series": _serie(refs, "ini", 1996),
                         "abs": {k: (refs.get("n_" + k, {}).get(anys["hb_ini"]) or {}).get("gi") for k in ("ini", "aca")},
                         "max": max(((y, o["gi"]) for y, o in refs.get("n_ini", {}).items() if o.get("gi") is not None), key=lambda t: t[1], default=None)}
        out["hb_aca"] = {"tipus": "linia", "u": "", "dec": 1, "series": _serie(refs, "aca", 1996)}
    if refs.get("hpo"):
        out["hb_hpo"] = {"tipus": "linia", "u": "%", "dec": 1, "series": _serie(refs, "hpo")}
    if refs.get("ced"):
        out["hb_ced"] = {"tipus": "linia", "u": "", "dec": 1, "series": _serie(refs, "ced"),
                         "abs": {"n": (refs.get("n_ced", {}).get(anys["hb_ced"]) or {}).get("gi")}}
        out["hb_m2"] = {"tipus": "linia", "u": "m²", "dec": 0, "zero": False, "series": _serie(refs, "ced_m2")}
    if refs.get("ihb"):
        out["hb_ihb"] = {"tipus": "linia", "u": "", "dec": 2, "series": _serie(refs, "ihb"),
                         "abs": {"n": (refs.get("n_ihb", {}).get(anys["hb_ihb"]) or {}).get("gi"),
                                 "n0": (refs.get("n_ihb", {}).get(min(refs["n_ihb"])) or {}).get("gi"), "a0": min(refs["n_ihb"])}}
    if refs.get("u_ha"):
        grups = []
        for k in ("su", "surb", "snu"):
            g = {"g": k, "c": "hu:" + k}
            for z in ("gi", "cat"):
                o = refs.get("u_" + k, {}).get(anys["hb_urb"], {})
                g[z] = o.get(z)
            grups.append(g)
        out["hb_sol"] = {"tipus": "barres", "u": "%", "dec": 1, "claus": ["gi", "cat"], "any": anys["hb_urb"], "grups": grups,
                         "abs": {"plan": refs.get("plan", {}).get("gi"), "su_hab": (refs.get("u_su_hab", {}).get(anys["hb_urb"]) or {}).get("gi")}}
    return out
