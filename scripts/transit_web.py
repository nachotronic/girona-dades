"""Accidentes de tráfico para la web: Servei Català de Trànsit, DGT (vías urbanas) y Mossos.

construir(municipios) devuelve un dict con:
  mun   {ine: {clave: {año: valor}}}           indicadores del mapa (tema «acc»)
  refs  {clave: {año: {gi, cat, esp}}}         referencias de cada año
  anys  {"acc": último año SCT, "accu": último año DGT}
  com   {comarca: {clave: {año: valor}}}       nivel de comarcas del mapa
  prov  gráficos de la sección «La província»
  xifres  cifras para el titular de la ficha
"""
from __future__ import annotations

import math
import pathlib
import sys

import pandas as pd

RAIZ = pathlib.Path(__file__).resolve().parent.parent
sys.path.insert(0, str(RAIZ))
sys.path.insert(0, str(RAIZ / "scripts"))
from fuentes.comun import normaliza  # noqa: E402

P = RAIZ / "data" / "processed"
D = P / "transit"

# Claves del Servei Català de Trànsit (accidentes con muertos o heridos graves, carretera y ciudad)
SCT_DEC = {"mfg_h5": 1, "n": 0, "morts": 0, "mfg": 0, "mfg_h": 1, "carr_p": 0, "moto_p": 0, "vian_p": 0}
# Claves de la DGT (todos los accidentes con víctimas, solo vías urbanas)
DGT_DEC = {"u_n": 0, "u_h": 1, "u_vic_h": 1, "u_morts": 0, "u_vian_h": 1, "u_bici_h": 1, "u_moto_h": 1}


def _num(x):
    return None if x is None or (isinstance(x, float) and (math.isnan(x) or math.isinf(x))) else x


def _arr(v, dec):
    v = _num(v)
    if v is None:
        return None
    return int(round(v)) if dec == 0 else round(float(v), dec)


def _pobs():
    """Población del padrón por municipio y año, y de Girona, Cataluña y España por año."""
    pobs = {}
    fp = P / "padro" / "poblacio_municipis.csv.gz"
    if fp.exists():
        for x in pd.read_csv(fp, dtype={"ine": str}).itertuples():
            pobs.setdefault(x.ine, {})[int(x.any)] = float(x.valor)
    try:
        import justicia_web
        zon = justicia_web._poblacio_prov()
    except Exception as e:  # noqa: BLE001
        print("AVISO transit: población de Cataluña y España", e)
        zon = {}
    return pobs, zon


def _pob(s, y):
    if not s:
        return None
    return s.get(y) or s[min(s, key=lambda k: abs(k - y))]


def _sct(municipios, pobs, zon):
    f = D / "sct_accidents.csv.gz"
    if not f.exists():
        return {}, {}, None, {}, {}
    d = pd.read_csv(f, dtype=str)
    num = [c for c in d.columns if c.startswith("f_")]
    for c in num:
        d[c] = pd.to_numeric(d[c], errors="coerce").fillna(0)
    d["any"] = pd.to_numeric(d["any"], errors="coerce")
    d = d.dropna(subset=["any"])
    d["any"] = d["any"].astype(int)
    ine_de = {normaliza(m["nom"]): m["ine"] for m in municipios}
    # Municipios que han cambiado de nombre: el SCT usa el antiguo
    ine_de.update({normaliza(n): i for n, i in (("Brunyola", "17028"), ("Calonge", "17034"), ("Castell-Platja d'Aro", "17048"),
                                                 ("Masarac", "17100"), ("Palamós", "17118"))})
    # Algunos nombres del SCT van en otra forma (artículo delante o detrás): normaliza los ordena igual
    d["ine"] = d["nommun"].map(lambda n: ine_de.get(normaliza(n)))
    sense = sorted(d.loc[d["ine"].isna(), "nommun"].dropna().unique())
    if sense:
        print("AVISO transit: municipios del SCT sin casar:", sense)
    d = d.dropna(subset=["ine"])
    d["mfg"] = d["f_morts"] + d["f_ferits_greus"]
    d["carr"] = (d["zona"].str.lower().str.startswith("carretera")).astype(int)
    d["moto"] = ((d.get("f_motocicletes_implicades", 0) + d.get("f_ciclomotors_implicades", 0)) > 0).astype(int)
    d["vian"] = (d.get("f_vianants_implicades", 0) > 0).astype(int)
    anys = list(range(int(d["any"].min()), int(d["any"].max()) + 1))
    g = d.groupby(["ine", "any"]).agg(n=("any", "size"), morts=("f_morts", "sum"), mfg=("mfg", "sum"),
                                      carr=("carr", "sum"), moto=("moto", "sum"), vian=("vian", "sum"))
    com_de = {m["ine"]: m.get("comarca") for m in municipios}

    def calc(x, pb):
        n = x.get("n", 0)
        q = lambda a, b, k=1: (a / b * k) if b else None  # noqa: E731
        return {"n": n, "morts": x.get("morts", 0), "mfg": x.get("mfg", 0), "mfg_h": q(x.get("mfg", 0), pb, 10_000),
                "carr_p": q(x.get("carr", 0), n, 100), "moto_p": q(x.get("moto", 0), n, 100), "vian_p": q(x.get("vian", 0), n, 100)}

    mun, com, refs = {}, {}, {}
    gd = g.to_dict("index")
    for m in municipios:
        ine = m["ine"]
        o = {}
        for y in anys:
            x = gd.get((ine, y), {})
            for k, v in calc(x, _pob(pobs.get(ine), y)).items():
                v = _arr(v, SCT_DEC[k])
                if v is not None:
                    o.setdefault("s_" + k, {})[y] = v
        mun[ine] = o
    # Comarcas y provincia
    for y in anys:
        sums, pobc = {}, {}
        for m in municipios:
            c = com_de.get(m["ine"])
            x = gd.get((m["ine"], y), {})
            s = sums.setdefault(c, {})
            for k in ("n", "morts", "mfg", "carr", "moto", "vian"):
                s[k] = s.get(k, 0) + x.get(k, 0)
            pobc[c] = pobc.get(c, 0) + (_pob(pobs.get(m["ine"]), y) or 0)
        tot = {k: sum(s[k] for s in sums.values()) for k in ("n", "morts", "mfg", "carr", "moto", "vian")}
        for c, s in sums.items():
            for k, v in calc(s, pobc[c]).items():
                v = _arr(v, SCT_DEC[k])
                if v is not None:
                    com.setdefault(c, {}).setdefault("s_" + k, {})[y] = v
        for k, v in calc(tot, sum(pobc.values())).items():
            v = _arr(v, SCT_DEC[k])
            if v is not None:
                refs.setdefault("s_" + k, {}).setdefault(y, {})["gi"] = v
    # Cataluña (todas las demarcaciones)
    fc = D / "sct_catalunya.csv"
    serie_cat = {}
    if fc.exists():
        c = pd.read_csv(fc)
        for k in ("n", "morts", "greus", "lleus"):
            c[k] = pd.to_numeric(c[k], errors="coerce").fillna(0)
        c["carr"] = c["zona"].str.lower().str.startswith("carretera") * c["n"]
        t = c.groupby("any")[["n", "morts", "greus", "carr"]].sum()
        for y, x in t.iterrows():
            y = int(y)
            pc = (zon.get(y) or {}).get("cat")
            vals = {"n": None, "morts": None, "mfg": None, "mfg_h": (x["morts"] + x["greus"]) / pc * 10_000 if pc else None,
                    "carr_p": x["carr"] / x["n"] * 100 if x["n"] else None}
            for k, v in vals.items():
                v = _arr(v, SCT_DEC[k])
                if v is not None:
                    refs.setdefault("s_" + k, {}).setdefault(y, {})["cat"] = v
            serie_cat[y] = {"mfg": x["morts"] + x["greus"], "morts": x["morts"], "pob": pc}
    xprov = {y: {"n": sum(gd.get((m["ine"], y), {}).get("n", 0) for m in municipios),
                 "morts": sum(gd.get((m["ine"], y), {}).get("morts", 0) for m in municipios),
                 "mfg": sum(gd.get((m["ine"], y), {}).get("mfg", 0) for m in municipios),
                 "carr": sum(gd.get((m["ine"], y), {}).get("carr", 0) for m in municipios),
                 "pob": sum(_pob(pobs.get(m["ine"]), y) or 0 for m in municipios)} for y in anys}
    # Mitjana de cinc anys (menos ruido en los municipios pequeños): muertos y heridos graves por 10.000 habitantes y año
    def m5(mfg, pob):
        o = {}
        for y in anys[4:]:
            ys = range(y - 4, y + 1)
            p_ = sum(pob.get(a) or 0 for a in ys)
            if p_:
                o[y] = round(sum(mfg.get(a, 0) for a in ys) / p_ * 10_000, 1)
        return o
    for m in municipios:
        ine = m["ine"]
        mun[ine]["s_mfg_h5"] = m5({y: gd.get((ine, y), {}).get("mfg", 0) for y in anys}, {y: _pob(pobs.get(ine), y) for y in anys})
    for c in {com_de.get(m["ine"]) for m in municipios}:
        ms_ = [m["ine"] for m in municipios if com_de.get(m["ine"]) == c]
        com.setdefault(c, {})["s_mfg_h5"] = m5({y: sum(gd.get((i, y), {}).get("mfg", 0) for i in ms_) for y in anys},
                                               {y: sum(_pob(pobs.get(i), y) or 0 for i in ms_) for y in anys})
    for y, v in m5({y: x["mfg"] for y, x in xprov.items()}, {y: x["pob"] for y, x in xprov.items()}).items():
        refs.setdefault("s_mfg_h5", {}).setdefault(y, {})["gi"] = v
    for y, v in m5({y: x["mfg"] for y, x in serie_cat.items()}, {y: x["pob"] for y, x in serie_cat.items()}).items():
        refs.setdefault("s_mfg_h5", {}).setdefault(y, {})["cat"] = v
    return mun, com, max(anys), refs, {"gi": xprov, "cat": serie_cat}


def _dgt(municipios, pobs, zon):
    f, fa = D / "dgt_urba.csv", D / "dgt_agregats.csv"
    if not f.exists():
        return {}, {}, None, {}, {}
    d = pd.read_csv(f, dtype={"ine": str})
    agr = pd.read_csv(fa) if fa.exists() else pd.DataFrame()

    def col(x, *noms):
        return sum(float(v) for n in noms if (v := x.get(n)) is not None and v == v)

    def calc(x, pb):
        q = lambda a, b, k=1: (a / b * k) if b else None  # noqa: E731
        n = col(x, "Nº Accidentes con Víctimas")
        vic = col(x, "Fallecidos", "Heridos Hospitalizados", "Heridos no Hospitalizados")
        us = lambda u: col(x, f"{u} Fallecidos", f"{u} Heridos Graves", f"{u} Heridos Leves")  # noqa: E731
        return {"u_n": n, "u_h": q(n, pb, 1000), "u_vic_h": q(vic, pb, 1000), "u_morts": col(x, "Fallecidos"),
                "u_vian_h": q(us("Peatones"), pb, 10_000), "u_bici_h": q(us("Bicicletas") + us("VMP"), pb, 10_000),
                "u_moto_h": q(us("Motocicletas") + us("Ciclomotores"), pb, 10_000)}

    anys = sorted(int(a) for a in d["any"].unique())
    per = {(r["ine"], int(r["any"])): r for r in d.to_dict("records")}
    com_de = {m["ine"]: m.get("comarca") for m in municipios}
    mun, com, refs = {}, {}, {}
    num = [c for c in d.columns if c not in ("any", "ine", "municipi", "provincia", "ccaa")]
    for m in municipios:
        o = {}
        for y in anys:
            x = per.get((m["ine"], y))
            if x is None:
                continue
            for k, v in calc(x, _pob(pobs.get(m["ine"]), y)).items():
                v = _arr(v, DGT_DEC[k])
                if v is not None:
                    o.setdefault(k, {})[y] = v
        if o:
            mun[m["ine"]] = o
    for y in anys:
        sums, pobc = {}, {}
        for m in municipios:
            x = per.get((m["ine"], y))
            c = com_de.get(m["ine"])
            s = sums.setdefault(c, {})
            if x is not None:
                for k in num:
                    v = x.get(k)
                    s[k] = s.get(k, 0) + (float(v) if v is not None and v == v else 0)
            pobc[c] = pobc.get(c, 0) + (_pob(pobs.get(m["ine"]), y) or 0)
        for c, s in sums.items():
            for k, v in calc(s, pobc[c]).items():
                v = _arr(v, DGT_DEC[k])
                if v is not None:
                    com.setdefault(c, {}).setdefault(k, {})[y] = v
    serie = {}
    if len(agr):
        for x in agr.to_dict("records"):
            y, z = int(x["any"]), x["ambit"]
            pb = (zon.get(y) or {}).get(z)
            for k, v in calc(x, pb).items():
                v = _arr(v, DGT_DEC[k])
                if v is not None and (z == "gi" or not k.endswith("_n") and k != "u_morts"):
                    refs.setdefault(k, {}).setdefault(y, {})[z] = v
            serie.setdefault(z, {})[y] = {"vic": col(x, "Fallecidos", "Heridos Hospitalizados", "Heridos no Hospitalizados"),
                                          "n": col(x, "Nº Accidentes con Víctimas"), "pob": pb,
                                          **{u: col(x, f"{u} Fallecidos", f"{u} Heridos Graves", f"{u} Heridos Leves")
                                             for u in ("Peatones", "Bicicletas", "VMP", "Motocicletas", "Ciclomotores", "Turismos", "Furgonetas",
                                                       "Camiones", "Autobús", "Otros")}}
    return mun, com, max(anys), refs, serie


def _mossos():
    f = D / "mossos_mes.csv"
    if not f.exists():
        return None
    m = pd.read_csv(f).sort_values(["any", "mes"])
    m["ym"] = m["any"] * 12 + m["mes"] - 1
    u = int(m["ym"].max())
    m = m[m["ym"] > u - 12 * 6]
    ser = lambda c: [[round(k // 12 + (k % 12) / 12, 4), f"{k // 12}-{k % 12 + 1:02d}", int(v)] for k, v in zip(m["ym"], m[c])]  # noqa: E731
    return {"tipus": "linia", "u": "", "dec": 0, "noms": "acc_mm", "series": {"gi": ser("gi")},
            "total": int(m[m["ym"] > u - 12]["gi"].sum()), "fins": f"{u // 12}-{u % 12 + 1:02d}",
            "abans": int(m[(m["ym"] > u - 24) & (m["ym"] <= u - 12)]["gi"].sum())}


def construir(municipios) -> dict:
    res = {"mun": {}, "refs": {}, "anys": {}, "com": {}, "prov": {}, "resum": ""}
    if not D.exists():
        return res
    pobs, zon = _pobs()
    ms, cs, us, rs, ps = _sct(municipios, pobs, zon)
    md, cd, ud, rd, pd_ = _dgt(municipios, pobs, zon)
    for src in (ms, md):
        for ine, o in src.items():
            res["mun"].setdefault(ine, {}).update(o)
    for src in (cs, cd):
        for c, o in src.items():
            res["com"].setdefault(c, {}).update(o)
    res["refs"] = {**rs, **rd}
    if us:
        res["anys"]["acc"] = us
    if ud:
        res["anys"]["accu"] = ud
    prov = res["prov"]
    if ps:
        gi, cat = ps["gi"], ps["cat"]
        s_gi = [[y, str(y), round(x["mfg"] / x["pob"] * 100_000, 1)] for y, x in sorted(gi.items()) if x["pob"]]
        s_cat = [[y, str(y), round(x["mfg"] / x["pob"] * 100_000, 1)] for y, x in sorted(cat.items()) if x.get("pob")]
        u = max(gi)
        prov["acc_greus"] = {"tipus": "linia", "u": "", "dec": 1, "series": {"gi": s_gi, "cat": s_cat},
                             "abs": {"any": u, "n": int(gi[u]["n"]), "morts": int(gi[u]["morts"]), "mfg": int(gi[u]["mfg"]),
                                     "carr": int(gi[u]["carr"]), "a0": min(gi), "mfg0": int(gi[min(gi)]["mfg"]), "morts0": int(gi[min(gi)]["morts"])}}
        prov["acc_morts"] = {"tipus": "linia", "u": "", "dec": 0, "noms": "acc_mo",
                             "series": {"gi": [[y, str(y), int(x["morts"])] for y, x in sorted(gi.items())]}}
    if pd_:
        sr = {z: [[y, str(y), round(x["vic"] / x["pob"] * 1000, 2)] for y, x in sorted(s.items()) if x.get("pob")] for z, s in pd_.items()}
        g = pd_.get("gi", {})
        u = max(g) if g else None
        prov["acc_urb"] = {"tipus": "linia", "u": "", "dec": 1, "series": sr,
                           **({"abs": {"any": u, "n": int(g[u]["n"]), "vic": int(g[u]["vic"])}} if u else {})}
        if u:
            x = g[u]
            grups = [["vian", x["Peatones"]], ["bici", x["Bicicletas"] + x["VMP"]], ["moto", x["Motocicletas"] + x["Ciclomotores"]],
                     ["cotxe", x["Turismos"]], ["furgo", x["Furgonetas"] + x["Camiones"] + x["Autobús"] + x["Otros"]]]
            tot = sum(v for _, v in grups)
            if tot:
                cx = pd_.get("cat", {}).get(u, {})
                tc = sum(cx.get(k, 0) for k in ("Peatones", "Bicicletas", "VMP", "Motocicletas", "Ciclomotores", "Turismos", "Furgonetas", "Camiones", "Autobús", "Otros"))
                cv = {"vian": cx.get("Peatones", 0), "bici": cx.get("Bicicletas", 0) + cx.get("VMP", 0),
                      "moto": cx.get("Motocicletas", 0) + cx.get("Ciclomotores", 0), "cotxe": cx.get("Turismos", 0),
                      "furgo": sum(cx.get(k, 0) for k in ("Furgonetas", "Camiones", "Autobús", "Otros"))}
                prov["acc_usuaris"] = {"tipus": "barres", "u": "%", "dec": 0, "claus": ["gi", "cat"], "any": u,
                                       "grups": [{"g": k, "c": "acu:" + k, "gi": round(v / tot * 100, 1), "cat": round(cv[k] / tc * 100, 1) if tc else None}
                                                 for k, v in grups]}
    mm = _mossos()
    if mm:
        prov["acc_mossos"] = mm
    res["resum"] = (f"SCT {len(ms)} municipios hasta {us}; DGT {len(md)} municipios hasta {ud}; "
                    f"gráficos {sorted(prov)}")
    return res
