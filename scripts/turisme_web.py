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
    # Campings: hasta 2024 Xifra da las plazas; desde 2025, el número de campings
    tria = {("hotels", "Total"): "x_hotel_n", ("campings", "Total"): "x_camp_pl",
            ("rural", "Total"): "x_rural_n", ("hut", "Nombre d'establiments"): "x_hut_n", ("hut", "Nombre de places"): "x_hut_pl",
            ("apart", "Nombre d'establiments"): "x_apt_n", ("apart", "Nombre de places"): "x_apt_pl", ("oficines", "Total"): "x_ofi_n"}
    res = {}
    for (taula, col), clau in tria.items():
        g = d[(d["taula"] == taula) & (d["col"].astype(str) == col)]
        if clau == "x_camp_pl":
            g = g[g["any"] <= 2024]
        for _, x in g.iterrows():
            if pd.notna(x["valor"]):
                res.setdefault(x["ine"], {}).setdefault(clau, {})[int(x["any"])] = float(x["valor"])
    return res


# ---------------------------------------------------------------------------
# INE
def _ine():
    f = P / "turisme" / "ine_turisme.json"
    if f.exists():
        return json.loads(f.read_text(encoding="utf-8"))
    f = P / "provincia" / "ine_series.json"
    return json.loads(f.read_text(encoding="utf-8")) if f.exists() else {}


def _series(d, taula, *claus, zona=None, excl=()):
    """Series de una tabla cuyo nombre contiene todas las claves (y empieza por la zona)."""
    out = []
    for s_ in d.get(taula, {}).get("series", []):
        n = s_["nom"]
        if zona is not None and not (n.startswith(zona + ".") or f" {zona}." in n or f". {zona}" in n):
            continue
        if all(c in n for c in claus) and not any(e in n for e in excl):
            out.append(s_)
    return out


def _mensual(s_):
    """[[año, mes, valor]] -> {'AAAA-MM': valor}."""
    return {f"{a}-{fk:02d}": v for a, fk, v in s_["d"] if v is not None and fk and 1 <= fk <= 12}


def _una(d, taula, *claus, zona=None, excl=()):
    l = _series(d, taula, *claus, zona=zona, excl=excl)
    return _mensual(l[0]) if l else {}


def _anual(m, minim=12, op="suma"):
    g = {}
    for k, v in m.items():
        g.setdefault(int(k[:4]), []).append(v)
    return {a: (sum(l) if op == "suma" else sum(l) / len(l)) for a, l in g.items() if len(l) >= minim}


def _linia(ser, desde=2005, dec=1, escala=1):
    return sorted([[a, str(a), r(v / escala, dec)] for a, v in ser.items() if a >= desde and v is not None])


def _mesos(ser, desde="2016-01"):
    res = []
    for k, v in sorted(ser.items()):
        if k >= desde and v is not None:
            a, m = int(k[:4]), int(k[5:7])
            res.append([round(a + (m - 1) / 12, 4), k, v])
    return res


ZONES = {"gi": "Girona", "cat": "Cataluña", "esp": "Nacional"}


def _punts_anuals(d, taules, noms, minim=12):
    """{ine: {any: pernoctaciones}} de los puntos turísticos de Girona (residentes en España + extranjero).
    Las tablas van en orden de preferencia (base nueva primero); cada año sale de la primera que lo tiene completo."""
    res = {}
    for t_ in taules:
        agg, vist = {}, set()
        for s_ in _series(d, t_, "Pernoctaciones"):
            ine = _ine_punt(s_["nom"], noms)
            if not ine:
                continue
            k = (ine, "esp" if "España" in s_["nom"] else "ext")
            if k in vist:
                continue
            vist.add(k)
            for a, v in _anual(_mensual(s_), minim=minim).items():
                if a < ANY_ACTUAL:
                    agg.setdefault(ine, {}).setdefault(a, 0)
                    agg[ine][a] += v
        for ine, per in agg.items():
            for a, v in per.items():
                res.setdefault(ine, {}).setdefault(a, v)
    return res


def _ine_punt(nom, noms):
    """Código INE del punto turístico: por el código «17xxx-» o por el nombre al principio."""
    m = re.search(r"\b(17\d{3})-", nom)
    if m:
        return m.group(1)
    p = nom.split(".")[0].strip()
    if p in ("Nacional", "Total Nacional", "Cabanes"):
        return None
    return noms.get(normaliza(p))


def prov_series(d, mov_prov, ieet_com, reg_tot, aena, noms=None, noms_orig=None):
    res = {}
    any_max = ANY_ACTUAL  # años completos: hasta el anterior al actual si el actual no tiene 12 meses
    # 1. Pernoctaciones hoteleras: índice 2019 = 100
    pern = {z: _anual(_una(d, "2074", "Pernoctaciones", "Total", zona=n, excl=("Residentes",))) for z, n in ZONES.items()}
    if pern["gi"]:
        res["t_pern_idx"] = {"tipus": "linia", "u": "idx", "dec": 0, "base": 2019, "abs": {z: v.get(max(v)) for z, v in pern.items() if v},
                             "any": max(pern["gi"]),
                             "series": {z: [[a, str(a), r(v[a] / v[2019] * 100, 0)] for a in sorted(v) if a >= 2005] for z, v in pern.items() if v.get(2019)}}
    # 2. Pernoctaciones por tipo de alojamiento (último año completo), millones
    tipus = {
        "hotel": _anual(_una(d, "2074", "Pernoctaciones", "Total", zona="Girona", excl=("Residentes",))),
        "camp": {a: sum(x) for a, x in _zip_anual([_anual(_una(d, "2062", "Pernoctaciones", rr, zona="Girona")) for rr in ("Residentes en España", "Residentes en el extranjero")]).items()},
        "apt": {a: sum(x) for a, x in _zip_anual([_anual(_una(d, "2063", "Pernoctaciones", rr, zona="Girona")) for rr in ("Residentes en España", "Residentes en el extranjero")]).items()},
        "rural": {a: sum(x) for a, x in _zip_anual([_anual(_una(d, "2073", "Pernoctaciones", rr, zona="Girona")) for rr in ("Residentes en España", "Residentes en el extranjero")]).items()},
    }
    # Alojamientos de corta estancia de plataformas (OAT): total menos los reglados
    oat = _anual(_una(d, "48427", "Pernoctaciones", "Total", zona="Girona"))
    comuns = [a for a in tipus["hotel"] if all(a in tipus[k] for k in tipus)]
    if comuns:
        a = max(comuns)
        grups = [{"g": k, "c": "tt:" + k, "gi": r(tipus[k][a] / 1e6, 2)} for k in ("hotel", "camp", "apt", "rural")]
        if oat.get(a):
            reg = sum(tipus[k][a] for k in tipus)
            if oat[a] > reg:
                grups.append({"g": "plat", "c": "tt:plat", "gi": r((oat[a] - reg) / 1e6, 2)})
        grups.sort(key=lambda x: -x["gi"])
        res["t_pern_tipus"] = {"tipus": "barres", "u": "M", "dec": 2, "claus": ["gi"], "any": a, "grups": grups,
                               "total": r(sum(g["gi"] for g in grups), 1)}
        res["t_pern_evol"] = {"tipus": "linia", "u": "M", "dec": 1, "noms": "tt",
                              "series": {"gi": _linia(tipus["hotel"], 2005, 2, 1e6), "cat": _linia(tipus["camp"], 2005, 2, 1e6),
                                         "esp": _linia({a: tipus["apt"].get(a, 0) + tipus["rural"].get(a, 0) for a in tipus["apt"]}, 2005, 2, 1e6)}}
    # 3. Estacionalidad: reparto mensual de las pernoctaciones hoteleras (media de los 3 últimos años completos)
    est = {}
    for z, n in ZONES.items():
        m = _una(d, "2074", "Pernoctaciones", "Total", zona=n, excl=("Residentes",))
        anys = sorted(a for a, v in _anual(m).items())[-3:]
        if anys:
            tot = sum(v for k, v in m.items() if int(k[:4]) in anys)
            est[z] = [r(sum(v for k, v in m.items() if int(k[:4]) in anys and int(k[5:7]) == mm) / tot * 100, 1) for mm in range(1, 13)]
    if est.get("gi"):
        res["t_estac"] = {"tipus": "barres", "u": "%", "dec": 1, "claus": [z for z in ("gi", "cat", "esp") if z in est],
                          "grups": [{"g": str(mm), "c": f"mes:{mm}", **{z: est[z][mm - 1] for z in est}} for mm in range(1, 13)]}
    # 4. Ocupación hotelera por plazas (media anual)
    oc = {z: _anual(_una(d, "2066", "Grado de ocupación por plazas", zona=n, excl=("fin de semana",)), op="mitjana") for z, n in ZONES.items()}
    if oc["gi"]:
        res["t_ocup"] = {"tipus": "linia", "u": "%", "dec": 1, "series": {z: _linia(v, 2005, 1) for z, v in oc.items() if v}}
    # 5. ADR y RevPAR (media anual de los datos mensuales)
    for k, t_ in (("t_adr", "2059"), ("t_revpar", "2057")):
        sr = {z: _anual(_una(d, t_, "Dato", zona=n, excl=("Tasa",)), op="mitjana") for z, n in (("gi", "Girona"), ("cat", "Cataluña"), ("esp", "Nacional"))}
        if sr["gi"]:
            res[k] = {"tipus": "linia", "u": "€", "dec": 0, "series": {z: _linia(v, 2008, 1) for z, v in sr.items() if v}}
    # 6. Estancia media en hoteles
    em = {z: _anual(_una(d, "2065", "Estancia media", zona=n), op="mitjana") for z, n in ZONES.items()}
    if em["gi"]:
        res["t_estada"] = {"tipus": "linia", "u": "dies", "dec": 1, "series": {z: _linia(v, 2005, 2) for z, v in em.items() if v}}
    # 7. % de pernoctaciones hoteleras de extranjeros
    ext = {}
    for z, n in ZONES.items():
        tot = _anual(_una(d, "2074", "Pernoctaciones", "Total", zona=n, excl=("Residentes",)))
        ex = _anual(_una(d, "2074", "Pernoctaciones", "Residentes en el extranjero", zona=n))
        ext[z] = sorted([[a, str(a), r(ex[a] / tot[a] * 100, 1)] for a in tot if a in ex and tot[a] and a >= 2005])
    if ext["gi"]:
        res["t_ext"] = {"tipus": "linia", "u": "%", "dec": 0, "series": ext}
    # 8. Personal empleado en alojamientos turísticos (media anual)
    pers = {}
    for k, t_ in (("hotel", "2066"), ("camp", "2064"), ("apt", "2072"), ("rural", "2070")):
        pers[k] = _anual(_una(d, t_, "Personal empleado", zona="Girona"), minim=10, op="mitjana")
    if pers["hotel"]:
        res["t_personal"] = {"tipus": "linia", "u": "", "dec": 0, "noms": "tt",
                             "series": {"gi": _linia(pers["hotel"], 2005, 0), "cat": _linia(pers["camp"], 2005, 0),
                                        "esp": _linia({a: pers["apt"].get(a, 0) + pers["rural"].get(a, 0) for a in pers["apt"]}, 2005, 0)}}
    # 9. Puntos turísticos: pernoctaciones en hoteles y campings del último año completo
    ph = _punts_anuals(d, ("75197", "2078"), noms, minim=8)
    pc = _punts_anuals(d, ("75194", "2084"), noms, minim=6)
    if ph or pc:
        anys_ = [a for v in list(ph.values()) + list(pc.values()) for a in v]
        a = max(anys_)
        if sum(1 for v in list(ph.values()) + list(pc.values()) if a in v) < 3:
            a -= 1
        a = min(a, ANY_ACTUAL - 1)  # el año en curso aún no está completo
        nom_i = {i: n for n, i in noms_orig.items()}
        grups = [{"g": nom_i.get(i, i), "gi": r(ph.get(i, {}).get(a, 0) / 1e6, 2), "cat": r(pc.get(i, {}).get(a, 0) / 1e6, 2)} for i in set(ph) | set(pc)]
        grups = sorted([g for g in grups if g["gi"] or g["cat"]], key=lambda x: -(x["gi"] + x["cat"]))
        for g in grups:
            for k in ("gi", "cat"):
                if not g[k]:
                    g[k] = None  # sin barra vacía con «0,00»
        res["t_punts"] = {"tipus": "barres", "u": "M", "dec": 2, "claus": ["gi", "cat"], "noms": "pt", "any": a, "grups": grups}
    # 10. Origen de los turistas (telefonía móvil, último año completo)
    if mov_prov:
        for k, grups in mov_prov.items():
            res[k] = grups
    # 11. Gasto de los turistas internacionales (EGATUR): Cataluña y España
    for k, c, dec in (("t_gasto_pers", "Gasto medio por persona", 0), ("t_gasto_dia", "Gasto medio diario", 0)):
        sr = {}
        for z, n in (("cat", "Cataluña"), ("esp", "Total Nacional")):
            m = _una(d, "23998", c, "Dato base", zona=n)
            if m:
                g = {}
                for kk, v in m.items():
                    g.setdefault(int(kk[:4]), []).append(v)
                sr[z] = _linia({a: sum(l) / len(l) for a, l in g.items() if len(l) >= 12}, 2016, dec)
        if sr.get("cat"):
            res[k] = {"tipus": "linia", "u": "€", "dec": dec, "series": sr}
    gt = _una(d, "23998", "Gasto total", "Dato base", zona="Cataluña")
    if gt:
        res["t_gasto_total"] = {"any": max(_anual(gt)), "v": _anual(gt)[max(_anual(gt))]} if _anual(gt) else None
    # 12. Impuesto turístico (IEET) por tipo de establecimiento, comarcas de Girona
    if ieet_com:
        res.update(ieet_com)
    # 13. Plazas por tipo (Registre de Turisme)
    if reg_tot:
        grups = [{"g": k, "c": "tt:" + k, "gi": reg_tot.get(f"{k}_pl", 0)} for k in ("camp", "hut", "hotel", "rural", "apt", "llar")]
        res["t_places"] = {"tipus": "barres", "u": "", "dec": 0, "claus": ["gi"], "grups": sorted(grups, key=lambda x: -x["gi"]),
                           "total": sum(g["gi"] for g in grups)}
    # 14. Aeropuerto de Girona (Aena), pasajeros al año
    if aena:
        res["t_aena"] = {"tipus": "linia", "u": "M", "dec": 2, "series": {"gi": _linia(aena, 2004, 2, 1e6)}}
    # 15. Destinos (Costa Brava, Lloret, Pirineus), de «La província»
    return res


def _zip_anual(dicts):
    comuns = set(dicts[0]).intersection(*dicts[1:]) if dicts and all(dicts) else set()
    return {a: [x[a] for x in dicts] for a in comuns}


def _punt(nom):
    """Nombre del punto turístico de Girona en el nombre de la serie."""
    m = re.search(r"17\d{3}-([^.]+)", nom)
    if m:
        return m.group(1).strip()
    p = nom.split(".")[0].strip()
    return p if p not in ("Nacional", "Total Nacional") else None


# ---------------------------------------------------------------------------
# Telefonía móvil: turistas por municipio (anual = suma de los meses) y origen para la provincia
def movils():
    f = P / "turisme" / "moviles.csv.gz"
    if not f.exists():
        return None
    d = pd.read_csv(f, dtype={"ine": str})
    d["any"] = d["mes"].str[:4].astype(int)
    return d


def _anys_complets(d):
    n = d.groupby("any")["mes"].nunique()
    return sorted(n[n == 12].index.tolist())


def mov_municipis(d):
    """{ine: {clau: {any: valor}}} y mensual del último año para la ficha."""
    res, mens = {}, {}
    if d is None or not len(d):
        return res, mens, None
    tots = {"rec": "Total", "int": "Total Nacional"}
    for t_, orig in tots.items():
        x = d[(d["t"] == t_) & (d["orig"] == orig)]
        comp = _anys_complets(x)
        g = x[x["any"].isin(comp)].groupby(["ine", "any"])["turistes"].sum()
        for (ine, a), v in g.items():
            res.setdefault(ine, {}).setdefault("mov_" + t_, {})[int(a)] = float(v)
        # Estiu: juliol i agost sobre el total de l'any
        for (ine, a), gg in x[x["any"].isin(comp)].groupby(["ine", "any"]):
            pass
        for ine, gg in x.groupby("ine"):
            mens.setdefault(ine, {})[t_] = {m: float(v) for m, v in zip(gg["mes"], gg["turistes"])}
    # Francesos sobre els estrangers
    x = d[d["t"] == "rec"]
    comp = _anys_complets(x[x["orig"] == "Total"])
    piv = x[x["any"].isin(comp)].groupby(["ine", "any", "orig"])["turistes"].sum().unstack("orig")
    if "Francia" in piv.columns and "Total" in piv.columns:
        for (ine, a), row in piv.iterrows():
            if row["Total"] and row["Total"] >= 300:
                res.setdefault(ine, {}).setdefault("mov_fr", {})[int(a)] = r(row["Francia"] / row["Total"] * 100 if pd.notna(row["Francia"]) else 0, 1)
    ult = max(comp) if comp else None
    return res, mens, ult


def punts_de_pas(d, reg):
    """Municipios donde la telefonía móvil cuenta como «turistas» sobre todo a gente de paso: la frontera y los
    grandes aparcamientos de camiones de la AP-7 y la N-II (La Jonquera, Agullana, Cabanes, Vilamalla…).
    El INE llama turista a quien pasa la noche fuera de su municipio de residencia, y el móvil se asigna al lugar
    donde duerme: un camionero francés que duerme en La Jonquera, o un móvil de Le Perthús que se conecta a una
    antena española, cuentan. Criterio: más turistas extranjeros al año que la mitad de las plazas-noche de
    alojamiento registradas (plazas × 365) y casi sin temporada (julio y agosto < 26 % del año)."""
    if d is None or not len(d):
        return set()
    x = d[(d["t"] == "rec") & (d["orig"] == "Total")]
    comp = _anys_complets(x)
    if not comp:
        return set()
    a = max(comp)
    y = x[x["any"] == a]
    tot = y.groupby("ine")["turistes"].sum()
    estiu = y[y["mes"].str[5:7].isin(["07", "08"])].groupby("ine")["turistes"].sum()
    pas = set()
    for ine, v in tot.items():
        pl = sum(n for k, n in reg.get(ine, {}).items() if k.endswith("_pl"))
        if v >= 5000 and v > 0.5 * max(pl, 1) * 365 and estiu.get(ine, 0) / v < 0.26:
            pas.add(ine)
    return pas


def mov_provincia(d, pob_prov):
    """Gráficos de origen (últimos 12 meses completos) para la sección."""
    out = {}
    if d is None or not len(d):
        return out
    for t_, tot, k in (("rec", "Total", "t_orig_ext"), ("int", "Total Nacional", "t_orig_nac")):
        x = d[d["t"] == t_]
        comp = _anys_complets(x[x["orig"] == tot])
        if not comp:
            continue
        a = max(comp)
        g = x[x["any"] == a].groupby("orig")["turistes"].sum()
        total = g.get(tot)
        if not total:
            continue
        grups = sorted([{"g": o, "c": "or:" + o, "gi": r(v / total * 100, 1)} for o, v in g.items() if o != tot], key=lambda z: -z["gi"])
        out[k] = {"tipus": "barres", "u": "%", "dec": 1, "claus": ["gi"], "any": a, "total": float(total), "grups": grups[:8]}
        # Serie mensual de la provincia (suma de municipios)
        m = x[x["orig"] == tot].groupby("mes")["turistes"].sum()
        out.setdefault("_mov_mes", {})[t_] = {k_: float(v) for k_, v in m.items()}
    if "_mov_mes" in out:
        mm = out.pop("_mov_mes")
        ser = {}
        if "rec" in mm:
            ser["gi"] = _mesos(mm["rec"], "2019-01")
        if "int" in mm:
            ser["cat"] = _mesos(mm["int"], "2019-01")
        out["t_mov_mes"] = {"tipus": "linia", "u": "", "dec": 0, "noms": "mov", "series": ser}
    return out


# ---------------------------------------------------------------------------
# IEET por comarca (todas las de Girona) para la provincia
COMARQUES_GI = {"Alt Empordà", "Baix Empordà", "Cerdanya", "Garrotxa", "Gironès", "Pla de l'Estany", "Ripollès", "Selva"}


def ieet_comarques():
    f = P / "turisme" / "ieet_comarques.csv"
    if not f.exists():
        return {}
    d = pd.read_csv(f, dtype=str)
    pc = next(c for c in d.columns if c.startswith("per"))
    d = d[d[pc].str.match(r"^\d{2}S[12]$", na=False)].copy()
    d["any"] = 2000 + d[pc].str[:2].astype(int)
    sems = d.groupby("any")[pc].apply(lambda s: {x[-1] for x in s})
    comp = sorted(a for a, s in sems.items() if {"1", "2"} <= s)
    d = d[d["any"].isin(comp)]
    cols = {c: c.split("_")[0] for c in d.columns if c.endswith("_import_ingressat")}
    for c in cols:
        d[c] = d[c].map(_num_es)
    d["tot"] = d[list(cols)].fillna(0).sum(axis=1)
    gi = d[d["comarca"].isin(COMARQUES_GI)]
    serie_gi = gi.groupby("any")["tot"].sum()
    serie_cat = d.groupby("any")["tot"].sum()
    out = {}
    if len(serie_gi):
        out["t_ieet"] = {"tipus": "linia", "u": "M", "dec": 1, "abs": {"gi": float(serie_gi.iloc[-1]), "cat": float(serie_cat.iloc[-1])}, "any": int(serie_gi.index[-1]),
                         "series": {"gi": _linia(serie_gi.to_dict(), 2017, 2, 1e6)}}
        a = int(serie_gi.index[-1])
        u = gi[gi["any"] == a]
        grups = [{"g": IEET_TIPUS.get(k.upper(), k), "c": "tt:" + IEET_TIPUS.get(k.upper(), k), "gi": r(u[c].fillna(0).sum() / 1e6, 2)} for c, k in cols.items()]
        out["t_ieet_tipus"] = {"tipus": "barres", "u": "M", "dec": 2, "claus": ["gi"], "any": a, "grups": sorted([g for g in grups if g["gi"]], key=lambda x: -x["gi"])}
    return out


def platges():
    f = P / "turisme" / "platges.csv"
    if not f.exists():
        return {}
    d = pd.read_csv(f, dtype=str)
    return d["ide_municipi"].str[:5].value_counts().to_dict()


def aena_anual():
    f = P / "conjuntura" / "aena.csv"
    if not f.exists():
        return {}
    d = pd.read_csv(f, dtype=str)
    d = d[d["aeroport"] == "girona"].copy()
    d["passatgers"] = pd.to_numeric(d["passatgers"], errors="coerce")
    d["any"] = d["mes"].str[:4].astype(int)
    n = d.groupby("any")["mes"].nunique()
    return {int(a): float(v) for a, v in d.groupby("any")["passatgers"].sum().items() if n[a] == 12}


# ---------------------------------------------------------------------------
# Puntos turísticos por municipio (INE): pernoctaciones, ocupación y ADR anuales
def punts_municipis(d, noms):
    res = {}
    def afegeix(clau, taules, filtre, op, minim, escala=1.0):
        # Cada año sale de la primera tabla (base nueva) que lo tiene; el año en curso no, porque está incompleto
        for t_ in taules:
            agg, vist = {}, set()
            for s_ in _series(d, t_, *filtre):
                if "fin de semana" in s_["nom"]:
                    continue
                ine = _ine_punt(s_["nom"], noms)
                if not ine:
                    continue
                k = (ine, "esp" if "España" in s_["nom"] else "ext" if "xtranjero" in s_["nom"] else "")
                if k in vist:
                    continue
                vist.add(k)
                for a, v in _anual(_mensual(s_), minim=minim, op=op).items():
                    if a < ANY_ACTUAL:
                        agg.setdefault(ine, {}).setdefault(a, []).append(v)
            for ine, per in agg.items():
                for a, l in per.items():
                    res.setdefault(ine, {}).setdefault(clau, {}).setdefault(a, r(sum(l) * escala, 1) if op == "suma" else r(sum(l) / len(l), 1))
    afegeix("pern", ("75197", "2078"), ("Pernoctaciones",), "suma", 8)
    afegeix("pern_camp", ("75194", "2084"), ("Pernoctaciones",), "suma", 6)
    afegeix("ocup_camp", ("75196", "2085"), ("Grado de ocupación por parcelas",), "mitjana", 4)
    afegeix("ocup", ("75198", "2076"), ("Grado de ocupación por plazas",), "mitjana", 8)
    afegeix("adr", ("46298",), ("Tarifa media diaria", "Dato"), "mitjana", 8)
    return res


# ---------------------------------------------------------------------------
def construir(municipios):
    t = pd.read_csv(P / "territorio" / "municipios.csv", dtype=str)
    noms = {normaliza(n): i for n, i in zip(t["nom"], t["codi_ine"])}
    noms.update({normaliza(_nom_coma(n)): i for n, i in zip(t["nom"], t["codi_ine"])})
    for alias, nom in (("castell-platja d'aro", "Castell d'Aro, Platja d'Aro i s'Agaró"), ("platja d'aro", "Castell d'Aro, Platja d'Aro i s'Agaró"),
                       ("calonge", "Calonge i Sant Antoni"), ("l'escala", "l'Escala"), ("escala", "l'Escala"), ("torroella de montgri", "Torroella de Montgrí")):
        i = noms.get(normaliza(nom))
        if i:
            noms[normaliza(alias)] = i
    pob = {m["ine"]: m["poblacion"] for m in municipios}
    viv = {m["ine"]: m.get("viviendas") for m in municipios}
    pob_prov = sum(v or 0 for v in pob.values())
    mun = {}

    def posa(ine, k, a, v):
        if v is not None and not (isinstance(v, float) and math.isnan(v)):
            mun.setdefault(ine, {}).setdefault(k, {})[int(a)] = v

    # Registre de Turisme: plazas actuales por 100 habitantes
    reg, reg_tot, _ = registre()
    any_reg = ANY_ACTUAL
    fitxa = {}
    for ine, o in reg.items():
        p = pob.get(ine)
        if not p:
            continue
        tot = sum(o.get(f"{k}_pl", 0) for k in ("hotel", "camp", "rural", "hut", "apt", "llar", "auto"))
        posa(ine, "pl_h", any_reg, r(tot / p * 100, 1))
        for k in ("hotel", "camp", "rural", "hut"):
            posa(ine, f"pl_{k}_h", any_reg, r(o.get(f"{k}_pl", 0) / p * 100, 1))
        fitxa[ine] = {"reg": {k: v for k, v in o.items()}, "pl": tot}
    for m in municipios:
        if m["ine"] not in reg and pob.get(m["ine"]):
            posa(m["ine"], "pl_h", any_reg, 0.0)
    # Xifra: establecimientos por año
    xo = xifra_oferta()
    for ine, o in xo.items():
        for a, v in o.get("x_hotel_n", {}).items():
            posa(ine, "hotels", a, v)
        for a, v in o.get("x_camp_pl", {}).items():
            if pob.get(ine):
                posa(ine, "pl_camp_h", a, r(v / pob[ine] * 100, 1))
        for k in ("rural", "hut"):
            for a, v in o.get(f"x_{k}_n", {}).items():
                posa(ine, f"{k}_n", a, v)
        for a, v in o.get("x_hut_n", {}).items():
            if viv.get(ine):
                posa(ine, "hut_viv", a, r(v / viv[ine] * 100, 1))
        for a, v in o.get("x_hut_pl", {}).items():
            if pob.get(ine):
                posa(ine, "hut_pl_h", a, r(v / pob[ine] * 100, 1))
    # IEET por habitante
    im, _ = ieet(noms)
    for ine, o in im.items():
        for a, v in o.items():
            if pob.get(ine):
                posa(ine, "ieet_h", a, r(v / pob[ine], 1))
                posa(ine, "ieet", a, v)
    # Telefonía móvil
    d_mov = movils()
    pas = punts_de_pas(d_mov, reg)
    if d_mov is not None and pas:
        mens_tots = mov_municipis(d_mov)[1]
        d_mov = d_mov[~d_mov["ine"].isin(pas)]
    mm, mens, any_mov = mov_municipis(d_mov)
    if pas:
        for ine in pas:
            mens[ine] = mens_tots.get(ine, {})
            fitxa.setdefault(ine, {})["mov_pas"] = 1
        print("turisme: puntos de paso excluidos de los turistas por móvil:", sorted(pas))
    for ine, o in mm.items():
        p = pob.get(ine)
        for k, ser in o.items():
            for a, v in ser.items():
                if k == "mov_fr":
                    posa(ine, k, a, v)
                    continue
                posa(ine, k, a, r(v, 0))
                if p:
                    posa(ine, k + "_h", a, r(v / p, 1))
        rec, nac = o.get("mov_rec", {}), o.get("mov_int", {})
        for a in set(rec) & set(nac):
            if rec[a] + nac[a] >= 500:
                posa(ine, "mov_ext_p", a, r(rec[a] / (rec[a] + nac[a]) * 100, 1))
    # Estiu: % de turistes (estrangers + d'altres províncies) del juliol i l'agost
    for ine, o in mens.items():
        tots = {}
        for t_ in ("rec", "int"):
            for mes, v in o.get(t_, {}).items():
                tots.setdefault(int(mes[:4]), {}).setdefault(mes[5:7], 0)
                tots[int(mes[:4])][mes[5:7]] += v
        for a, ms in tots.items():
            if len(ms) == 12 and sum(ms.values()) >= 1000:
                posa(ine, "estiu_p", a, r((ms["07"] + ms["08"]) / sum(ms.values()) * 100, 1))
    # Puntos turísticos (INE)
    d = _ine()
    for ine, o in punts_municipis(d, noms).items():
        for k, ser in o.items():
            for a, v in ser.items():
                if k in ("pern", "pern_camp") and pob.get(ine):
                    posa(ine, k + "_h", a, r(v / pob[ine], 1))
                    posa(ine, k, a, v)
                elif k != "pern":
                    posa(ine, k, a, v)
    # Viviendas turísticas del INE (VTE): último semestre de cada año
    fv = P / "turisme" / "viviendas_turisticas.csv"
    if fv.exists():
        dv = pd.read_csv(fv, dtype={"ine": str})
        # Último periodo publicado de cada año (agosto hasta 2023, noviembre desde 2024); el año en curso, cuando ya hay noviembre
        dv = dv[(dv["any"] < ANY_ACTUAL) | (dv["mes"] >= 11)]
        dv = dv.sort_values("mes").groupby(["ine", "clau", "any"]).tail(1)
        for row in dv.itertuples():
            if row.clau == "pct":
                posa(row.ine, "vte_pct", row.any, r(row.valor, 2))
            elif row.clau == "viv":
                posa(row.ine, "vte_viv", row.any, int(row.valor))
            elif row.clau == "places" and pob.get(row.ine):
                posa(row.ine, "vte_pl_h", row.any, r(row.valor / pob[row.ine] * 100, 1))
                posa(row.ine, "vte_pl", row.any, int(row.valor))
    # Playas
    for ine, n in platges().items():
        posa(ine, "platges", any_reg, n)
    # Último año de cada clave (con datos en al menos un municipio)
    anys = {}
    for o in mun.values():
        for k, ser in o.items():
            anys[k] = max(anys.get(k, 0), max(ser))
    # Referencias de la provincia: suma o media ponderada según la clave
    refs = {}
    sumes = {"hotels", "rural_n", "hut_n", "vte_viv", "vte_pl", "ieet", "mov_rec", "mov_int", "pern", "pern_camp", "platges"}
    for k in anys:
        for a in sorted({a for o in mun.values() for a in o.get(k, {})}):
            vals = [(o[k][a], pob.get(ine) or 0) for ine, o in mun.items() if a in o.get(k, {})]
            if k in sumes:
                refs.setdefault(k, {})[a] = {"gi": r(sum(v for v, _ in vals), 1)}
            elif k == "vte_pl_h":
                tot_p = sum(o.get("vte_pl", {}).get(a, 0) for o in mun.values())
                refs.setdefault(k, {})[a] = {"gi": r(tot_p / pob_prov * 100, 1)}
            elif k.endswith("_h") and k[:-2] in sumes:
                tot = sum(o.get(k[:-2], {}).get(a, 0) for o in mun.values())
                refs.setdefault(k, {})[a] = {"gi": r(tot / pob_prov, 1)} if k not in ("ieet_h", "pern_h", "pern_camp_h") else {}
            elif k in ("pl_h", "pl_hotel_h", "pl_camp_h", "pl_rural_h", "pl_hut_h", "hut_pl_h"):
                if k == "hut_pl_h" or (k == "pl_camp_h" and a != any_reg):
                    tot = sum(v * p / 100 for v, p in vals)
                    refs.setdefault(k, {})[a] = {"gi": r(tot / pob_prov * 100, 1)}
                else:
                    tp_ = k[3:-2] if k != "pl_h" else None
                    tot = reg_tot and (sum(reg_tot.get(f"{x}_pl", 0) for x in ("hotel", "camp", "rural", "hut", "apt", "llar", "auto")) if not tp_ else reg_tot.get(f"{tp_}_pl", 0))
                    refs.setdefault(k, {})[a] = {"gi": r(tot / pob_prov * 100, 1)} if tot else {}
            elif k == "vte_pct":
                tot_v = sum(o.get("vte_viv", {}).get(a, 0) for o in mun.values())
                tot_viv = sum(v or 0 for v in viv.values())
                refs.setdefault(k, {})[a] = {"gi": r(tot_v / tot_viv * 100, 2)} if tot_viv else {}
            elif k == "hut_viv":
                tot_hut = sum(o.get("hut_n", {}).get(a, 0) for o in mun.values())
                tot_viv = sum(v or 0 for v in viv.values())
                refs.setdefault(k, {})[a] = {"gi": r(tot_hut / tot_viv * 100, 1)} if tot_viv else {}
    # Catalunya (EMEX) para las plazas: hotel, càmping, rural por 100 habitantes
    prov = prov_series(d, mov_provincia(d_mov, pob_prov), ieet_comarques(), reg_tot, aena_anual(), noms, dict(zip(t["nom"], t["codi_ine"])))
    prov["t_resum"] = {
        "places": sum(reg_tot.get(f"{x}_pl", 0) for x in ("hotel", "camp", "rural", "hut", "apt", "llar", "auto")) if reg_tot else None,
        "hut": reg_tot.get("hut_n") if reg_tot else None, "pob": pob_prov,
        "mov_ext": refs.get("mov_rec", {}).get(any_mov, {}).get("gi") if any_mov else None,
        "mov_nac": refs.get("mov_int", {}).get(any_mov, {}).get("gi") if any_mov else None, "any_mov": any_mov,
    }
    for m in municipios:
        if m["ine"] in mens:
            fitxa.setdefault(m["ine"], {})["mov"] = {t_: {k: v for k, v in sorted(s_.items()) if k >= "2019-01"} for t_, s_ in mens[m["ine"]].items()}
    return {"mun": mun, "refs": refs, "anys": {f"tur_{k}": v for k, v in anys.items()}, "prov": prov, "fitxa": fitxa}
