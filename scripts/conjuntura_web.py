"""Datos de coyuntura (mensuales y trimestrales) para web/datos/conjuntura.json.

Municipio: paro registrado, contratos y demandantes (SEPE, mensual); alquiler medio
(Incasòl, trimestral); compraventas (Ministerio, trimestral); viviendas iniciadas y
acabadas (Secretaria d'Habitatge, trimestral).
Provincia, Cataluña y España: lo anterior más compraventas e hipotecas (INE, mensual),
pernoctaciones y viajeros en hoteles (INE, mensual) e IPC.
"""
from __future__ import annotations

import glob
import re
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


def _preu_venda():
    """Compraventas registradas (Secretaria d'Habitatge, Registradores; carga manual con
    scripts/compravendes_manual.py): por trimestre, número y €/m² construido total, nuevo y usado.
    Devuelve {zona: {periodo: (n, m2_tot, m2_nou, m2_usat, n_nou, n_usat)}} con los municipios por
    código INE y «gi» (demarcación de Girona) y «cat» (Cataluña)."""
    f = P / "compravendes" / "compravendes.csv.gz"
    if not f.exists():
        return {}
    d = pd.read_csv(f, dtype={"codi": str})
    d = d[(d["tipus"] == "mun") | ((d["ambit"] == "Demarcacions territorials") & d["nom"].isin(["Girona", "Catalunya"]))]
    res = {}
    for r in d.itertuples():
        z = r.codi if r.tipus == "mun" else ("gi" if r.nom == "Girona" else "cat")
        res.setdefault(z, {})[r.per] = (r.n_tot, r.m2_tot, r.m2_nou, r.m2_usat, r.n_nou, r.n_usat)
    return res


def _preu12(s: dict, per: list[str]) -> dict:
    """€/m² de los últimos cuatro trimestres (media de los trimestres ponderada por compraventas)."""
    out = {}
    for k, (i_, j_) in {"pm2_12": (1, 0), "pm2n_12": (2, 4), "pm2u_12": (3, 5)}.items():
        o = {}
        for p in per:
            a, q = int(p[:4]), int(p[-1])
            ps = [f"{a - (1 if q - x <= 0 else 0)}T{(q - x - 1) % 4 + 1}" for x in range(4)]
            if not all(x in s for x in ps):
                continue
            num = den = 0.0
            for x in ps:
                v, n = s[x][i_], s[x][j_]
                if v == v and v is not None and n == n and n:
                    num += v * n
                    den += n
            if den >= 5:
                o[p] = num / den
        out[k] = o
    return out


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


def _afiliacio():
    f = P / "conjuntura" / "afiliacio.csv"
    return pd.read_csv(f, dtype={"ambit": str, "mes": str}) if f.exists() else pd.DataFrame(columns=["mes", "ambit", "reg", "valor"])


def _dgt():
    fs = sorted(glob.glob(str(P / "conjuntura" / "dgt" / "mat_*.csv")))
    parts = []
    for f in fs:
        d = pd.read_csv(f, dtype={"ine": str})
        a = pathlib.Path(f).stem[4:]
        d["per"] = f"{a[:4]}-{a[4:]}"
        parts.append(d)
    return pd.concat(parts) if parts else pd.DataFrame(columns=["ine", "tipus", "nou", "electric", "n", "per"])


def _trf():
    """Transferencias de vehículos (segunda mano), DGT. Girona por municipio y todas las provincias."""
    gi, pr = [], []
    for f in sorted(glob.glob(str(P / "conjuntura" / "dgt" / "trf_*.csv"))):
        st = pathlib.Path(f).stem
        a = st.rsplit("_", 1)[1]
        d = pd.read_csv(f, dtype={"ine": str, "prov": str}, keep_default_na=False)
        d["per"] = f"{a[:4]}-{a[4:]}"
        (pr if st.startswith("trf_prov_") else gi).append(d)
    gi = pd.concat(gi) if gi else pd.DataFrame(columns=["ine", "tipus", "edat", "empresa", "n", "per"])
    pr = pd.concat(pr) if pr else pd.DataFrame(columns=["prov", "tipus", "n", "per"])
    return gi, pr


PROV_CAT = {"B", "GI", "L", "T"}


def _aena():
    f = P / "conjuntura" / "aena.csv"
    return pd.read_csv(f, dtype={"mes": str}) if f.exists() else pd.DataFrame(columns=["mes", "aeroport", "passatgers"])


def _valor_taxat():
    """Boletín del Ministerio. Tabla 35101000 (provincias): columnas por año y trimestre.
    Tabla 35103500 (municipios > 25.000 hab.): una hoja por trimestre (t<q>a<año>) con
    provincia, municipio y valor por antigüedad; se toma la columna «Total».
    Devuelve dos dicts {nombre normalizado: {periodo: €/m²}}."""
    from fuentes.comun import normaliza
    prov, mun = {}, {}
    for f in sorted(glob.glob(str(P / "mitma" / "35101000_*"))):
        df = pd.read_csv(f, header=None, dtype=str)
        # Fila con «Año 2019», «Año 2020»... (el título de la hoja también puede decir «Años»)
        fa = next((i for i in range(min(15, len(df))) if df.iloc[i].astype(str).str.strip().str.match(r"(?i)año \d{4}$").any()), None)
        if fa is None:
            continue
        anys = df.iloc[fa].ffill()
        cols = {}
        for j in range(1, df.shape[1]):
            a = str(anys.iloc[j])
            y = "".join(ch for ch in a if ch.isdigit())[:4]
            if len(y) == 4:
                q = sum(1 for k in range(1, j) if str(anys.iloc[k]) == a) + 1
                if q <= 4:
                    cols[j] = f"{y}T{q}"
        for _, fila in df.iloc[fa + 1:].iterrows():
            n = normaliza(str(fila[0]))
            if not n or n == "nan":
                continue
            vals = {p: v for j, p in cols.items() if not pd.isna(v := pd.to_numeric(str(fila[j]).replace(",", "."), errors="coerce"))}
            if vals:
                prov.setdefault(n, {}).update(vals)
    for f in sorted(glob.glob(str(P / "mitma" / "35103500_t*a*.csv"))):
        m = re.search(r"_t(\d)a(\d{4})", f)
        if not m:
            continue
        per = f"{m.group(2)}T{m.group(1)}"
        df = pd.read_csv(f, header=None, dtype=str)
        cap = next((i for i in range(min(10, len(df))) if df.iloc[i].astype(str).str.strip().eq("Total").any()), None)
        cm = next((i for i in range(min(10, len(df))) if df.iloc[i].astype(str).str.strip().eq("Municipio").any()), None)
        if cap is None or cm is None:
            continue
        jt = int(df.iloc[cap].astype(str).str.strip().eq("Total").to_numpy().argmax())
        jm = int(df.iloc[cm].astype(str).str.strip().eq("Municipio").to_numpy().argmax())
        for _, fila in df.iloc[max(cap, cm) + 1:].iterrows():
            n = normaliza(str(fila[jm]))
            v = pd.to_numeric(str(fila[jt]).replace(",", "."), errors="coerce")
            if n and n != "nan" and not pd.isna(v):
                mun.setdefault(n, {})[per] = float(v)
    return prov, mun


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
    afi = _afiliacio()
    dgt = _dgt()
    aena = _aena()
    trf, trf_p = _trf()
    vt_prov, vt = _valor_taxat()
    pv = _preu_venda()

    ults = [df["per"].max() for df in (paro, contr) if len(df)] + ([afi["mes"].max()] if len(afi) else [])
    ults += [max(_serie_ine(ine, "6150", "Girona.", "General. Compraventa. Número") or {"": ""}), max(_serie_ine(ine, "2074", "Girona.", "Pernoctaciones. Total") or {"": ""})]
    ult_m = max([x for x in ults if x] or ["2026-01"])
    cands_t = [llq["per"].max() if len(llq) else None] + [max(v) for v in cvq.values() if v] + [max(v) for v in vt.values() if v]
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
    # Precio de compraventa registrado (€/m², municipios de más de 2.000 habitantes; 5.000 hasta 2024)
    for i, s in pv.items():
        if i in mun:
            mun[i]["pm2"] = arr({p: v[1] for p, v in s.items() if v[1] == v[1]}, T)
            mun[i]["pm2_n"] = arr({p: v[0] for p, v in s.items()}, T)
            for k, o in _preu12(s, T).items():
                mun[i][k] = arr(o, T)
    # Afiliación por residencia (régimen general + autónomos) y autónomos
    if len(afi):
        piv = afi.pivot_table(index=["ambit", "mes"], columns="reg", values="valor", aggfunc="sum").reset_index()
        for i, g in piv.groupby("ambit"):
            if i in mun:
                mun[i]["afil"] = arr(dict(zip(g["mes"], g.get("rg", 0) + g.get("reta", 0))), M)
                if "reta" in g:
                    mun[i]["reta"] = arr(dict(zip(g["mes"], g["reta"])), M)
    # Turismos nuevos matriculados
    if len(dgt):
        tn = dgt[(dgt["tipus"] == "turisme") & (dgt["nou"].astype(str) == "True")]
        # Un municipio sin filas en un mes descargado tiene 0 matriculaciones, no un dato ausente
        mesos_dgt = set(dgt["per"])
        per_mun = {i: g.groupby("per")["n"].sum().to_dict() for i, g in tn.groupby("ine")}
        for i in mun:
            d = per_mun.get(i, {})
            mun[i]["mat"] = arr({p: d.get(p, 0) for p in mesos_dgt}, M)
    # Turismos de segunda mano: transferencias (cambios de titular) y las de coches de 15 años o más
    if len(trf):
        tt = trf[trf["tipus"] == "turisme"]
        mesos_trf = set(trf["per"])
        for k, g0 in (("trf", tt), ("trf_v", tt[tt["edat"] == "15+"])):
            per_mun = {i: g.groupby("per")["n"].sum().to_dict() for i, g in g0.groupby("ine")}
            for i in mun:
                d = per_mun.get(i, {})
                mun[i][k] = arr({p: d.get(p, 0) for p in mesos_trf}, M)
    # Valor tasado (solo municipios de más de 25.000 habitantes)
    for n, i in nombres.items():
        if n in vt and i in mun:
            mun[i]["vt"] = arr(vt[n], T)
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

    if len(afi):
        piv = afi.pivot_table(index=["ambit", "mes"], columns="reg", values="valor", aggfunc="sum").reset_index()
        ser_af, ser_re = {}, {}
        for a in ("gi", "cat"):
            g = piv[piv["ambit"] == a]
            if not len(g) and a == "gi":
                g = piv[piv["ambit"].str.startswith("17")].groupby("mes")[["rg", "reta"]].sum().reset_index()
            if len(g):
                ser_af[a] = arr(dict(zip(g["mes"], g["rg"] + g["reta"])), M)
                ser_re[a] = arr(dict(zip(g["mes"], g["reta"])), M)
        if ser_af.get("gi"):
            prov["afil"] = {"per": "m", **ser_af}
            prov["reta"] = {"per": "m", **ser_re}
    if len(dgt):
        tur = dgt[dgt["tipus"] == "turisme"]
        nous = tur[tur["nou"].astype(str) == "True"].groupby("per")["n"].sum()
        el = tur[(tur["nou"].astype(str) == "True") & (tur["electric"].astype(str) == "True")].groupby("per")["n"].sum()
        prov["mat"] = {"per": "m", "gi": arr(nous.to_dict(), M)}
        prov["mat_el"] = {"per": "m", "gi": [round(el.get(p, 0) / nous[p] * 100, 1) if p in nous and nous[p] else None for p in M]}
    if len(trf):
        tt = trf[trf["tipus"] == "turisme"]
        tot = tt.groupby("per")["n"].sum()
        tp = trf_p[trf_p["tipus"] == "turisme"]
        prov["trf"] = {"per": "m", "gi": arr(tot.to_dict(), M),
                       "cat": arr(tp[tp["prov"].isin(PROV_CAT)].groupby("per")["n"].sum().to_dict(), M),
                       "esp": arr(tp.groupby("per")["n"].sum().to_dict(), M)}
        # Reparto por antigüedad y por tipo de comprador (% del mes)
        for k, filtre in (("trf_v", tt["edat"] == "15+"), ("trf_j", tt["edat"] == "0-4"), ("trf_e", tt["empresa"].astype(str) == "True")):
            sub = tt[filtre].groupby("per")["n"].sum()
            prov[k] = {"per": "m", "gi": [round(sub.get(p, 0) / tot[p] * 100, 1) if p in tot and tot[p] else None for p in M]}
        # Otras categorías: motos
        mo = trf[trf["tipus"] == "moto"].groupby("per")["n"].sum()
        prov["trf_moto"] = {"per": "m", "gi": arr(mo.to_dict(), M)}
    if len(aena):
        g = aena[aena["aeroport"] == "girona"]
        if len(g):
            prov["aena"] = {"per": "m", "gi": arr(dict(zip(g["mes"], g["passatgers"])), M)}
    soc = {"gi": _serie_ine(ine, "6295", "Girona.", "Mercantiles. Número de Sociedades"),
           "cat": _serie_ine(ine, "6295", "Cataluña.", "Mercantiles. Número de Sociedades"),
           "esp": _serie_ine(ine, "6295", "Total Nacional.", "Mercantiles. Número de Sociedades")}
    if soc["gi"]:
        prov["soc"] = {"per": "m", **{a: arr(x, M) for a, x in soc.items() if x}}
    # Pernoctaciones fuera de hoteles: apartamentos (2063), campings (2062) y turismo rural (2073)
    ext = {}
    for t_ in ("2063", "2062", "2073"):
        for r_ in ("Residentes en España", "Residentes en el extranjero"):
            for p, v in _serie_ine(ine, t_, "Girona.", "Pernoctaciones", r_).items():
                ext[p] = ext.get(p, 0) + (v or 0)
    if ext:
        prov["extra"] = {"per": "m", "gi": arr(ext, M)}

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
    if "gi" in pv:
        prov["pm2"] = {"per": "t", **{z: arr({p: v[1] for p, v in pv[z].items() if v[1] == v[1]}, T) for z in ("gi", "cat") if z in pv}}
        prov["pm2_n"] = {"per": "t", "gi": arr({p: v[0] for p, v in pv["gi"].items()}, T)}
        for z in ("gi", "cat"):
            for k, o in _preu12(pv.get(z, {}), T).items():
                prov.setdefault(k, {"per": "t"})[z] = arr(o, T)
    vz = {a: vt_prov.get(normaliza(n)) for a, n in (("gi", "Girona"), ("cat", "Cataluña"), ("esp", "Total Nacional"))}
    if vz["gi"]:
        prov["vt"] = {"per": "t", **{a: arr(x, T) for a, x in vz.items() if x}}
    return {"per": {"m": M, "t": T}, "mun": mun, "pob1564": {k: int(v) for k, v in pob1564.items() if v}, "prov": prov}
