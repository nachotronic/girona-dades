"""Datos de coyuntura (mensuales y trimestrales) para web/datos/conjuntura.json.

Municipio: paro registrado, contratos y demandantes (SEPE, mensual); alquiler medio
(Incasòl, trimestral); compraventas (Ministerio, trimestral); viviendas iniciadas y
acabadas (Secretaria d'Habitatge, trimestral).
Provincia, Cataluña y España: lo anterior más compraventas e hipotecas (INE, mensual),
pernoctaciones y viajeros en hoteles (INE, mensual) e IPC.
"""
from __future__ import annotations

import glob
import json
import math
import pathlib

import pandas as pd

RAIZ = pathlib.Path(__file__).resolve().parent.parent
P = RAIZ / "data" / "processed"
DESDE = 2019
TRIM = {"gener-març": 1, "abril-juny": 2, "juliol-setembre": 3, "octubre-desembre": 4}


def _n(v):
    if v is None or (isinstance(v, float) and (math.isnan(v) or math.isinf(v))):
        return None
    return round(float(v), 1) if abs(v) < 100 and v % 1 else int(round(float(v)))


def _num(s: pd.Series) -> pd.Series:
    """'<5' -> NaN (dato oculto por el SEPE)."""
    return pd.to_numeric(s.astype(str).str.strip().str.replace(".", "", regex=False), errors="coerce")


def _mesos(ultim: str) -> list[str]:
    a, m = int(ultim[:4]), int(ultim[5:])
    return [f"{y}-{k:02d}" for y in range(DESDE, a + 1) for k in range(1, 13) if (y, k) <= (a, m)]


def _trimestres(ultim: str) -> list[str]:
    a, q = int(ultim[:4]), int(ultim[-1])
    return [f"{y}T{k}" for y in range(DESDE, a + 1) for k in range(1, 5) if (y, k) <= (a, q)]


def _sepe(tipus: str):
    fs = sorted(glob.glob(str(P / "conjuntura" / f"sepe_{tipus}_[0-9]*.csv")))
    mun = pd.concat([pd.read_csv(f, dtype=str) for f in fs]) if fs else pd.DataFrame()
    ft = sorted(glob.glob(str(P / "conjuntura" / f"sepe_totals_{tipus}_*.csv")))
    tot = pd.concat([pd.read_csv(f, dtype={"mes": str}) for f in ft]) if ft else pd.DataFrame()
    for d in (mun, tot):
        if len(d):
            d["per"] = d["mes"].str[:4] + "-" + d["mes"].str[4:6]
    return mun, tot


def _ine():
    f = P / "provincia" / "ine_series.json"
    return json.loads(f.read_text(encoding="utf-8")) if f.exists() else {}


def _serie_ine(d, tabla, prefijo, *claus):
    for s in d.get(tabla, {}).get("series", []):
        n = s["nom"]
        if n.startswith(prefijo) and all(c in n for c in claus):
            return {f"{a}-{fk:02d}": v for a, fk, v in s["d"] if v is not None and 1 <= fk <= 12}
    return {}


def _lloguer_trim():
    fs = glob.glob(str(P / "generalitat" / "qww9-bvhh_*"))
    if not fs:
        return pd.DataFrame(columns=["ine", "per", "renda", "contr"])
    d = pd.read_csv(fs[0], dtype=str)
    d = d[d["Àmbit territorial"] == "Municipi"].copy()
    d["ine"] = d["Codi territorial"].str.zfill(5)
    d["renda"] = pd.to_numeric(d["Renda"], errors="coerce")
    d["contr"] = pd.to_numeric(d["Habitatges"], errors="coerce")
    # Algunos trimestres llegan sin renta (p. ej. 2026 T1): se deduce del semestre
    # gener-juny y del otro trimestre, porque la renta es una media ponderada por contratos
    idx = {(f.ine, f.Any, f.Període): (f.renda, f.contr) for f in d.itertuples()}
    for i, f in d[d["Període"].isin(["gener-març", "abril-juny"]) & d["renda"].isna()].iterrows():
        altre = "abril-juny" if f["Període"] == "gener-març" else "gener-març"
        rs, ns = idx.get((f["ine"], f["Any"], "gener-juny"), (None, None))
        ra, na = idx.get((f["ine"], f["Any"], altre), (None, None))
        if all(v is not None and not pd.isna(v) for v in (rs, ns, ra, na, f["contr"])) and f["contr"] > 0:
            v = (rs * ns - ra * na) / f["contr"]
            if v > 0:
                d.at[i, "renda"] = round(v, 2)
    d = d[d["Període"].isin(TRIM)].copy()
    d["per"] = d["Any"] + "T" + d["Període"].map(TRIM).astype(str)
    return d[["ine", "per", "renda", "contr"]]


def _compraventes_trim(nombres):
    """Tabla municipal del Ministerio: columnas por año y trimestre."""
    from fuentes.comun import normaliza
    fs = glob.glob(str(P / "mitma" / "34010210_*"))
    if not fs:
        return {}
    df = pd.read_csv(fs[0], header=None, dtype=str)
    anys = df.iloc[4].ffill()
    cols = {}
    for j in range(1, df.shape[1]):
        a = str(anys.iloc[j])
        if a.startswith("Año"):
            y = int(a.split()[1])
            q = sum(1 for k in range(1, j) if str(anys.iloc[k]) == a) + 1
            cols[j] = f"{y}T{q}"
    cab = [i for i in range(df.shape[0]) if str(df.iloc[i, 0]).strip() == "Girona" and df.iloc[i, 1:].isna().all()]
    res = {}
    for _, f in df.iloc[(cab[0] + 1 if cab else 9):].iterrows():
        n = normaliza(f[0])
        ine = nombres.get(n)
        if not ine and n:
            cand = [k for k in nombres if set(n.split()) <= set(k.split())]
            ine = nombres[cand[0]] if len(cand) == 1 else None
        if not ine or ine in res:
            continue
        res[ine] = {p: v for j, p in cols.items() if not pd.isna(v := pd.to_numeric(f[j], errors="coerce"))}
    return res


def _iniciats():
    fs = glob.glob(str(P / "generalitat" / "j8h8-vxug_*"))
    if not fs:
        return {}, {}
    d = pd.read_csv(fs[0], dtype=str)
    ini, aca = {}, {}
    for _, f in d.iterrows():
        ine = str(f.get("Codi INE", "")).strip()[:5].zfill(5)
        if not ine.startswith("17"):
            continue
        for q, nom in TRIM.items():
            p = f"{f['Any']}T{nom}"
            for dic, pref in ((ini, "Iniciats"), (aca, "Acabats")):
                v = pd.to_numeric(f.get(f"{pref} {q}"), errors="coerce")
                if not pd.isna(v):
                    dic.setdefault(ine, {})[p] = v
    return ini, aca


def construir(municipios: list[dict], pob1564: dict) -> dict:
    from fuentes.comun import normaliza
    ines = [m["ine"] for m in municipios]
    nombres = {normaliza(m["nom"]): m["ine"] for m in municipios}
    paro, paro_t = _sepe("paro")
    contr, contr_t = _sepe("contratos")
    dtes, dtes_t = _sepe("dtes")
    llq = _lloguer_trim()
    cvq = _compraventes_trim(nombres)
    ini, aca = _iniciats()
    ine = _ine()

    ults = [df["per"].max() for df in (paro, contr) if len(df)]
    ults += [max(_serie_ine(ine, "6150", "Girona.", "General. Compraventa. Número") or {"": ""}), max(_serie_ine(ine, "2074", "Girona.", "Pernoctaciones. Total") or {"": ""})]
    ult_m = max([x for x in ults if x] or ["2026-01"])
    cands_t = [llq["per"].max() if len(llq) else None] + [max(v) for v in cvq.values() if v]
    ult_t = max([x for x in cands_t if x] or ["2026T1"])
    M, T = _mesos(ult_m), _trimestres(ult_t)

    def arr(dic, per):
        return [_n(dic.get(p)) for p in per]

    mun = {i: {} for i in ines}
    for nom, df, col in (("atur", paro, "total"), ("contr", contr, "total")):
        if not len(df):
            continue
        df = df.assign(v=_num(df[col]))
        for i, g in df.groupby("ine"):
            if i in mun:
                mun[i][nom] = arr(dict(zip(g["per"], g["v"])), M)
    if len(contr):
        c = contr.assign(v=sum(_num(contr[k]).fillna(2.5) for k in ("h_indef", "h_conv", "d_indef", "d_conv")), tot=_num(contr["total"]))
        for i, g in c.groupby("ine"):
            if i in mun:
                mun[i]["indef"] = arr({p: (v if t and t >= 20 else None) for p, v, t in zip(g["per"], g["v"], g["tot"])}, M)
    for i, g in llq.groupby("ine"):
        if i in mun:
            mun[i]["llq"] = arr(dict(zip(g["per"], g["renda"])), T)
    for i, s in cvq.items():
        if i in mun:
            mun[i]["cvq"] = arr(s, T)
    for i, s in ini.items():
        if i in mun:
            mun[i]["ini"] = arr(s, T)
    mun = {i: {k: v for k, v in x.items() if any(y is not None for y in v)} for i, x in mun.items()}

    # Series de la provincia, Cataluña y España
    prov = {}

    def tot(df, col="total"):
        if not len(df):
            return {}
        return {a: dict(zip(g["per"], g[col])) for a, g in df.groupby("ambit")}

    for nom, df in (("atur", paro_t), ("contr", contr_t), ("dtes", dtes_t)):
        t_ = tot(df)
        if t_:
            prov[nom] = {"per": "m", **{a: arr(t_.get(a, {}), M) for a in ("gi", "cat", "esp")}}
    if len(contr_t):
        c = contr_t.assign(ind=contr_t[["h_indef", "h_conv", "d_indef", "d_conv"]].sum(axis=1))
        pi = {a: {p: (i_ / t_ * 100 if t_ else None) for p, i_, t_ in zip(g["per"], g["ind"], g["total"])} for a, g in c.groupby("ambit")}
        prov["indef"] = {"per": "m", **{a: [None if v is None else round(v, 1) for v in (pi.get(a, {}).get(p) for p in M)] for a in ("gi", "cat", "esp")}}
    def ine_m(nom, tabla, zonas, *claus):
        ser = {}
        for a, pref in zonas.items():
            s = _serie_ine(ine, tabla, pref, *claus)
            if s:
                ser[a] = [_n(s.get(p)) for p in M]
        if ser.get("gi") and any(v is not None for v in ser["gi"]):
            prov[nom] = {"per": "m", **ser}

    ine_m("cv", "6150", {"gi": "Girona.", "cat": "Cataluña.", "esp": "Total Nacional."}, "General. Compraventa. Número")
    ine_m("cv_nova", "6150", {"gi": "Girona.", "cat": "Cataluña.", "esp": "Total Nacional."}, "Vivienda nueva. Compraventa. Número")
    ine_m("hip", "76317", {"gi": "Viviendas. Número de hipotecas. Girona", "esp": "Viviendas. Número de hipotecas. Total Nacional"})
    # Importe medio de la hipoteca (miles de euros en la tabla)
    hn = {a: _serie_ine(ine, "76317", f"Viviendas. Número de hipotecas. {z}") for a, z in (("gi", "Girona"), ("esp", "Total Nacional"))}
    hi = {a: _serie_ine(ine, "76317", f"Viviendas. Importe de hipotecas. {z}") for a, z in (("gi", "Girona"), ("esp", "Total Nacional"))}
    if hn["gi"]:
        prov["hip_imp"] = {"per": "m", **{a: [_n(hi[a][p] * 1000 / hn[a][p]) if hn[a].get(p) and hi[a].get(p) else None for p in M] for a in hn}}
    ine_m("pern", "2074", {"gi": "Girona.", "cat": "Cataluña.", "esp": "Nacional."}, "Pernoctaciones. Total")
    ine_m("pern_ext", "2074", {"gi": "Girona.", "cat": "Cataluña.", "esp": "Nacional."}, "Pernoctaciones", "Residentes en el extranjero")
    ine_m("viat", "2074", {"gi": "Girona.", "cat": "Cataluña.", "esp": "Nacional."}, "Viajeros. Total")
    ipc = {"gi": _serie_ine(ine, "76143", "Girona.", "Índice general", "Variación anual"),
           "cat": _serie_ine(ine, "76140", "Cataluña.", "Índice general", "Variación anual"),
           "esp": _serie_ine(ine, "76134", "Nacional.", "Índice general", "Variación anual")}
    if ipc["gi"]:
        prov["ipc"] = {"per": "m", **{a: [s.get(p) for p in M] for a, s in ipc.items() if s}}

    # Trimestrales de la provincia
    if len(llq):
        g = llq.dropna(subset=["renda", "contr"])
        g = g[g["contr"] > 0]
        pr = {p: (x["renda"] * x["contr"]).sum() / x["contr"].sum() for p, x in g.groupby("per")}
        prov["llq"] = {"per": "t", "gi": [_n(pr.get(p)) for p in T]}
        prov["llq_n"] = {"per": "t", "gi": [_n(x["contr"].sum()) if len(x := g[g["per"] == p]) else None for p in T]}
    if cvq:
        prov["cvq"] = {"per": "t", "gi": [_n(sum(s[p] for s in cvq.values() if p in s)) if any(p in s for s in cvq.values()) else None for p in T]}
    if ini:
        prov["ini"] = {"per": "t", "gi": [_n(sum(s[p] for s in ini.values() if p in s)) if any(p in s for s in ini.values()) else None for p in T]}
        prov["aca"] = {"per": "t", "gi": [_n(sum(s[p] for s in aca.values() if p in s)) if any(p in s for s in aca.values()) else None for p in T]}
    return {"per": {"m": M, "t": T}, "mun": mun, "pob1564": {k: int(v) for k, v in pob1564.items() if v}, "prov": prov}
