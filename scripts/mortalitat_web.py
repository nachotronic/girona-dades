"""Anàlisi de la mortalitat (Departament de Salut) para la web: carga manual anual (scripts/mortalitat_manual.py).

Devuelve:
  com    {comarca: {clave: {año: valor}}}   indicadores por comarca para el mapa (tema «sal», nivel comarcas)
  refs   {"mc_" + clave: {año: {"gi": regió sanitària de Girona, "cat": Catalunya}}}
  anys   {"mc": último año}
  prov   gráficos de la sección Demografia (causas, comarcas, mortalidad evitable)
  xifres cifras de cabecera (región sanitaria de Girona y Cataluña)
La Cerdanya y Osona van enteras (el informe no las parte por provincia).
"""
from __future__ import annotations

import json
import pathlib

import pandas as pd

RAIZ = pathlib.Path(__file__).resolve().parent.parent
F = RAIZ / "data" / "processed" / "mortalitat" / "mortalitat.csv"
COM_GI = {"ALT EMPORDA": "Alt Empordà", "BAIX EMPORDA": "Baix Empordà", "CERDANYA": "Cerdanya", "GARROTXA": "Garrotxa",
          "GIRONES": "Gironès", "OSONA": "Osona", "PLA DE L'ESTANY": "Pla de l'Estany", "RIPOLLES": "Ripollès", "SELVA": "Selva"}
# clave del mapa -> (indicador del CSV, sexo, decimales)
MAPA = {
    "ev0": ("ev0", "t", 1), "ev0_d": ("ev0", "d", 1), "ev0_h": ("ev0", "h", 1), "ev65": ("ev65", "t", 1),
    "tme": ("tme", "t", 0), "ime": ("ime", "t", 0), "prem": ("prem", "t", 0), "tbm": ("tbm", "t", 1),
    "tum": ("tme_tum", "t", 0), "circ": ("tme_circ", "t", 0), "resp": ("tme_resp", "t", 0), "dem": (None, "t", 0), "ext": ("tme_ext", "t", 0),
}
# Grupos de causas del gráfico (TME oficial de la región y de Cataluña)
CAUSES = ["tum", "circ", "resp", "nerv", "ment", "dig", "genit", "endo", "ext", "inf", "mal", "osteo"]


def _r(v, d):
    return None if v is None or pd.isna(v) else round(float(v), d)


def construir() -> dict:
    res = {"com": {}, "refs": {}, "anys": {}, "prov": {}, "xifres": {}, "resum": "sin datos"}
    if not F.exists():
        return res
    d = pd.read_csv(F)
    d["any"] = d["any"].astype(int)
    u = int(d["any"].max())
    res["anys"]["mc"] = u

    def val(nivell, ambit, ind, sexe="t", any_=u, camp="v"):
        x = d[(d["any"] == any_) & (d["nivell"] == nivell) & (d["ambit"] == ambit) & (d["ind"] == ind) & (d["sexe"] == sexe)]
        return None if x.empty or pd.isna(x[camp].iloc[0]) else float(x[camp].iloc[0])

    def v_mapa(nivell, ambit, k, y):
        ind, s, _ = MAPA[k]
        if k == "dem":  # trastorns mentals (demències) + sistema nerviós (Alzheimer, Parkinson)
            a, b = val(nivell, ambit, "tme_ment", s, y), val(nivell, ambit, "tme_nerv", s, y)
            return None if a is None or b is None else a + b
        return val(nivell, ambit, ind, s, y)

    anys = sorted(d["any"].unique())
    for y in anys:
        for cod, nom in COM_GI.items():
            for k, (_, _, dec) in MAPA.items():
                v = v_mapa("com", cod, k, y)
                if v is not None:
                    res["com"].setdefault(nom, {}).setdefault(k, {})[str(y)] = _r(v, dec + 1)
        for k, (_, _, dec) in MAPA.items():
            gi, cat = v_mapa("rs", "GIRONA", k, y), v_mapa("cat", "CATALUNYA", k, y)
            if k == "ime":
                gi, cat = None, 100
            if gi is not None or cat is not None:
                res["refs"].setdefault("mc_" + k, {})[str(y)] = {"gi": _r(gi, dec + 1), "cat": _r(cat, dec + 1)}

    # ---- Gráficos de la sección
    grups = []
    for c in CAUSES:
        g, li, ls = (val("rs", "GIRONA", "tmec_" + c, "t", u, k) for k in ("v", "li", "ls"))
        ct = val("cat", "CATALUNYA", "tmec_" + c, "t")
        if g is None or ct is None:
            continue
        grups.append({"g": c, "c": "mc:" + c, "gi": _r(g, 1), "cat": _r(ct, 1), "s": 1 if li is not None and li > ct else -1 if ls is not None and ls < ct else 0})
    grups.sort(key=lambda x: -x["gi"])
    if grups:
        res["prov"]["mort_causes"] = {"tipus": "barres", "u": "n", "dec": 0, "claus": ["gi", "cat"], "noms": "mort", "any": u, "grups": grups,
                                      "tme": [_r(val("rs", "GIRONA", "tme"), 0), _r(val("cat", "CATALUNYA", "tme"), 0)]}
    # Comarcas: esperanza de vida y tasa estandarizada (con el IME para marcar las que difieren de Cataluña)
    ev, tm = [], []
    for cod, nom in COM_GI.items():
        e0 = val("com", cod, "ev0")
        if e0 is not None:
            ev.append({"g": nom, "gi": _r(e0, 1)})
        t, li, ls, n = val("com", cod, "tme"), val("com", cod, "ime", "t", u, "li"), val("com", cod, "ime", "t", u, "ls"), val("com", cod, "def")
        if t is not None:
            tm.append({"g": nom, "gi": _r(t, 0), "n": int(n) if n else None, "s": 1 if li and li > 100 else -1 if ls and ls < 100 else 0})
    if ev:
        res["prov"]["mort_com_ev"] = {"tipus": "barres", "u": "n", "dec": 1, "claus": ["gi"], "noms": "mortc", "any": u, "grups": sorted(ev, key=lambda x: -x["gi"]),
                                      "ref": [_r(val("rs", "GIRONA", "ev0"), 1), _r(val("cat", "CATALUNYA", "ev0"), 1)]}
    if tm:
        res["prov"]["mort_com_tme"] = {"tipus": "barres", "u": "n", "dec": 0, "claus": ["gi"], "noms": "mortc", "nu": "def_n", "any": u, "grups": sorted(tm, key=lambda x: -x["gi"]),
                                       "ref": [_r(val("rs", "GIRONA", "tme"), 0), _r(val("cat", "CATALUNYA", "tme"), 0)]}
    # Mortalidad evitable: causas con más peso en la región (tasa bruta por 100.000)
    ev_rs = d[(d["any"] == u) & (d["nivell"] == "rs") & d["ind"].str.startswith("evc_") & (d["sexe"] == "t")]
    ev_ct = d[(d["any"] == u) & (d["nivell"] == "cat") & d["ind"].str.startswith("evc_") & (d["sexe"] == "t")]
    if not ev_rs.empty:
        def clau(nom):
            n = str(nom).lower()
            for k, ps in {"pulmo": ["pulmó"], "isq": ["isquèmica"], "cerebro": ["cerebrovascular"], "suic": ["suïcidi"], "ext": ["resta", "extern"],
                          "mama": ["mama"], "pneum": ["pneumònia"], "traf": ["vehicles de motor"], "hepat": ["alcohòlic"], "hta": ["hipertensió"],
                          "perin": ["perinatals"], "uter": ["cos uterí", "cos i part"], "pell": ["pell"], "coll": ["coll ute", "coll úter"]}.items():
                if all(p in n for p in ps):
                    return k
            return None
        cat = {clau(r.nom): r.v for r in ev_ct.itertuples() if clau(r.nom)}
        files = [{"g": clau(r.nom), "c": "mce:" + clau(r.nom), "gi": _r(r.v, 1), "cat": _r(cat.get(clau(r.nom)), 1)} for r in ev_rs.itertuples() if clau(r.nom)]
        files = sorted([f for f in files if f["gi"] and f["gi"] >= 1.5], key=lambda x: -x["gi"])[:9]
        res["prov"]["mort_evitable"] = {"tipus": "barres", "u": "n", "dec": 1, "claus": ["gi", "cat"], "noms": "mort", "any": u, "grups": files,
                                        "tot": [_r(val("rs", "GIRONA", "ev_tot"), 1), _r(val("cat", "CATALUNYA", "ev_tot"), 1), int(val("rs", "GIRONA", "ev_tot_n") or 0)]}
    x = {"any": u}
    for k in ("ev0", "ev65", "tme", "prem", "ev_tot", "def", "inf"):
        for s in ("t", "d", "h"):
            gi, ct = val("rs", "GIRONA", k, s), val("cat", "CATALUNYA", k, s)
            if gi is not None or ct is not None:
                x[f"{k}_{s}"] = [_r(gi, 2), _r(ct, 2)]
    x["ev_tot_n"] = int(val("rs", "GIRONA", "ev_tot_n") or 0)
    res["xifres"] = x
    res["resum"] = f"{u}: {len(res['com'])} comarques, {len(res['refs'])} indicadors, {len(res['prov'])} gràfics"
    return res


if __name__ == "__main__":
    r = construir()
    print(r["resum"])
    print(json.dumps(r["com"].get("Gironès"), ensure_ascii=False))
    print(json.dumps(r["refs"], ensure_ascii=False)[:600])
    print(json.dumps(r["prov"], ensure_ascii=False)[:2500])
    print(r["xifres"])
