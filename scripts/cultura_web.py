"""Cultura para la web: bibliotecas públicas (DadesBib), equipamientos, entidades, archivos, librerías,
Programa.cat, agenda cultural y tablas comarcales del Idescat (cine, museos).

construir(municipios) devuelve un dict con:
  mun    {ine: {clave: {año: valor}}}       indicadores del mapa (tema «cul»)
  refs   {clave: {año: {gi, cat}}}          provincia y Cataluña
  anys   {"cul_bib": .., "cul_eq": .., "cul_prog": .., "cul_ag": .., "cul_com": ..}
  com    {comarca: {clave: {año: valor}}}   nivel de comarcas del mapa
  fitxa  {ine: {"eq": [[nom, tipus, aforament]], "bib": [[nom, {año: préstamos}]]}}
  prov   gráficos de «La província»
"""
from __future__ import annotations

import csv
import io
import math
import pathlib
import re
import sys
from collections import defaultdict

import pandas as pd

RAIZ = pathlib.Path(__file__).resolve().parent.parent
sys.path.insert(0, str(RAIZ))
from fuentes.comun import normaliza, slug  # noqa: E402

D = RAIZ / "data" / "processed" / "cultura"

# Variables de DadesBib -> clave, decimales, factor
BIB = {
    "Nombre biblioteques": ("b_n", 0, 1),
    "Préstecs totals": ("b_prest", 0, 1),
    "Préstecs per habitant": ("b_prest_h", 2, 1),
    "Visites total": ("b_vis", 0, 1),
    "Visites per habitant": ("b_vis_h", 2, 1),
    "% de carnets (persones) sobre població total": ("b_carn_p", 1, 1),
    "Usuaris actius de préstec per habitant": ("b_usu_p", 1, 100),
    "Assistents a activitats per 1.000 habitants": ("b_act_h", 0, 1),
    "Activitats (sessions)": ("b_act", 0, 1),
    "Fons per habitant": ("b_fons_h", 2, 1),
    "Despesa de funcionament per habitant": ("b_desp_h", 2, 1),
    "Hores setmanals d'obertura al públic": ("b_hores", 1, 1),
    "Superfície útil (m²) per 1.000 habitants": ("b_m2_h", 1, 1),
    "Usos (sessions) d'internet i ofimàtica per habitant": ("b_int_h", 2, 1),
    "Préstecs audiovisuals": ("_prest_av", 0, 1),
    "Carnets persones": ("_carn", 0, 1),
    "Usuaris actius de préstec": ("_usu", 0, 1),
    "Activitats (assistents)": ("_assist", 0, 1),
    "Despesa total de funcionament": ("_desp", 0, 1),
    "Fons total": ("_fons", 0, 1),
}
# Tipos de equipamiento (Equipaments culturals de Catalunya)
EQ = {
    "Espais escènics i musicals": "esc",
    "Museus, col·leccions i centres d'interpretació": "mus",
    "Centres culturals: ateneus, centres cívics i cases de cultura": "civ",
    "Espais d'arts visuals": "vis",
    "Biblioteques": "bib",
    "Arxius": "arx",
    "Cinemes": "cin",
    "Altres espais aptes per a ús cultural": "alt",
}


def _num(s):
    """'2.207.186' -> 2207186; '54,49' -> 54.49; '85,51 %' -> 85.51; '' -> None."""
    if s is None:
        return None
    s = str(s).replace("%", "").replace("\xa0", "").strip()
    if not s:
        return None
    s = s.replace(".", "").replace(",", ".")
    try:
        v = float(s)
    except ValueError:
        return None
    return None if math.isnan(v) else v


def _arr(v, dec):
    if v is None or (isinstance(v, float) and (math.isnan(v) or math.isinf(v))):
        return None
    return int(round(v)) if dec == 0 else round(float(v), dec)


ALIES_BIB = {normaliza("Palamós"): "17118"}  # DadesBib usa el nombre antiguo


def _files_bib(text: str):
    """Filas de datos de un CSV de DadesBib (varios informes separados por líneas en blanco).

    Sin detalle: [ámbito, año, variable, valor]. Con detalle por biblioteca: [ámbito, biblioteca, año, variable, valor]
    (o el mismo orden con el ámbito repetido). Devuelve (ámbito, biblioteca o None, año, variable, valor)."""
    for bloc in re.split(r"\n\s*\n", text):
        for x in csv.reader(io.StringIO(bloc)):
            if len(x) < 4:
                continue
            anys = [i for i, c in enumerate(x) if re.fullmatch(r"(19|20)\d\d", c.strip())]
            if not anys:
                continue
            ia = anys[0]
            if ia + 2 >= len(x):
                continue
            amb = x[0].strip()
            bib = x[1].strip() if ia >= 2 and x[1].strip() and x[1].strip() != amb else None
            yield amb, bib, int(x[ia]), x[ia + 1].strip(), x[ia + 2]


def _bib(municipios):
    mun, refs, fitxa = {}, {}, defaultdict(list)
    ine_de = {normaliza(m["nom"]): m["ine"] for m in municipios}
    # Provincias y Cataluña
    fa = D / "bib_ambits_raw.csv"
    anys = set()
    if fa.exists():
        for amb, _, a, var, val in _files_bib(fa.read_text(encoding="utf-8")):
            if var not in BIB:
                continue
            k, dec, fac = BIB[var]
            z = "gi" if amb == "Girona" else "cat" if amb == "Tot Catalunya" else None
            v = _num(val)
            if z and v is not None:
                refs.setdefault(k, {}).setdefault(a, {})[z] = _arr(v * fac, dec)
    for a, o in refs.get("_usu", {}).items():
        for z, u in o.items():
            p, ph = (refs.get("b_prest", {}).get(a) or {}).get(z), (refs.get("b_prest_h", {}).get(a) or {}).get(z)
            if u and p and ph:
                refs.setdefault("b_usu_p", {}).setdefault(a, {})[z] = _arr(u / (p / ph) * 100, 1)
    for k in [k for k in refs if k.startswith("_")]:
        del refs[k]
    fms = sorted(D.glob("bib_mun_*.csv"))
    sense = set()
    brut = defaultdict(lambda: defaultdict(dict))  # ine -> año -> variable -> valor
    if fms:
        prest_bib = defaultdict(lambda: defaultdict(dict))  # ine -> biblioteca -> año -> préstamos
        for amb, bib, a, var, val in _files_bib("\n\n".join(f.read_text(encoding="utf-8") for f in fms)):
            ine = ine_de.get(normaliza(amb)) or ALIES_BIB.get(normaliza(amb))
            if not ine:
                if amb not in ("Tot Catalunya", "Girona (província)") and not amb.endswith(":"):
                    sense.add(amb)
                continue
            v = _num(val)
            if v is None:
                continue
            if bib:
                if var == "Préstecs totals":
                    prest_bib[ine][bib][a] = int(v)
                continue
            if var in BIB:
                brut[ine][a][var] = v
                anys.add(a)
        for ine, bs in prest_bib.items():
            fitxa[ine] = sorted(([b, dict(sorted(s.items()))] for b, s in bs.items()), key=lambda x: -max(x[1].values() or [0]))
    if sense:
        print("AVISO cultura: ámbitos de DadesBib sin casar:", sorted(sense)[:20])
    for ine, xa in brut.items():
        o = {}
        for a, xv in xa.items():
            if not xv.get("Nombre biblioteques"):
                continue
            if xv.get("Usuaris actius de préstec") is not None and xv.get("Préstecs per habitant") and xv.get("Préstecs totals"):
                xv["Usuaris actius de préstec per habitant"] = xv["Usuaris actius de préstec"] / (xv["Préstecs totals"] / xv["Préstecs per habitant"])
            for var, v in xv.items():
                k, dec, fac = BIB[var]
                if k.startswith("_"):
                    continue
                o.setdefault(k, {})[a] = _arr(v * fac, dec)
        mun[ine] = o
    return mun, refs, (max(anys) if anys else None), dict(fitxa), brut


def _bib_comarques(municipios, brut):
    """Comarcas a partir de los municipios: totales y población implícita (préstamos / préstamos por habitante)."""
    com_de = {m["ine"]: m.get("comarca") for m in municipios}
    acc = defaultdict(lambda: defaultdict(lambda: defaultdict(float)))
    for ine, xa in brut.items():
        c = com_de.get(ine)
        for a, xv in xa.items():
            ph = xv.get("Préstecs per habitant")
            p = xv.get("Préstecs totals")
            if not c or not ph or not p:
                continue
            s = acc[c][a]
            s["pob"] += p / ph
            for var in ("Préstecs totals", "Visites total", "Carnets persones", "Usuaris actius de préstec", "Activitats (assistents)",
                        "Despesa total de funcionament", "Fons total", "Nombre biblioteques"):
                s[var] += xv.get(var) or 0
    com = {}
    for c, xa in acc.items():
        o = {}
        for a, s in xa.items():
            pob = s["pob"] or None
            q = lambda n, k=1: (s[n] / pob * k) if pob else None  # noqa: E731
            for k, v, dec in (("b_prest_h", q("Préstecs totals"), 2), ("b_vis_h", q("Visites total"), 2), ("b_carn_p", q("Carnets persones", 100), 1),
                              ("b_usu_p", q("Usuaris actius de préstec", 100), 1), ("b_act_h", q("Activitats (assistents)", 1000), 0),
                              ("b_desp_h", q("Despesa total de funcionament"), 2), ("b_fons_h", q("Fons total"), 2),
                              ("b_prest", s["Préstecs totals"], 0), ("b_vis", s["Visites total"], 0), ("b_n", s["Nombre biblioteques"], 0)):
                if (v := _arr(v, dec)) is not None:
                    o.setdefault(k, {})[a] = v
        com[c] = o
    return com


def _equipaments(municipios):
    f = D / "equipaments.csv"
    mun, fitxa, refs = {}, defaultdict(list), {}
    if not f.exists():
        return mun, fitxa, refs, None
    e = pd.read_csv(f, dtype=str)
    e["ine"] = e["id_municipi"].str[:5]
    e["t"] = e["tipus"].map(EQ).fillna("alt")
    e["af"] = pd.to_numeric(e["aforament_total"], errors="coerce")
    e.loc[e["af"].isna(), "af"] = pd.to_numeric(e["aforament_sala_principal"], errors="coerce")
    any_ = pd.to_datetime(e["actualitzaci"], errors="coerce").dt.year.max()
    any_ = int(any_) if pd.notna(any_) else None
    pob = {m["ine"]: m.get("poblacion") or 0 for m in municipios}
    tot = defaultdict(float)
    for m in municipios:
        g = e[e["ine"] == m["ine"]]
        p = pob[m["ine"]]
        n = {t: int((g["t"] == t).sum()) for t in EQ.values()}
        esc = g[g["t"] == "esc"]
        teatres = int(esc["subtipus"].isin(["Teatre", "Auditori"]).sum())
        but = float(esc["af"].fillna(0).sum())
        cult = sum(v for k, v in n.items() if k not in ("bib", "arx"))
        o = {"e_n": len(g), "e_esc": n["esc"], "e_teatres": teatres, "e_mus": n["mus"], "e_civ": n["civ"], "e_vis": n["vis"], "e_cin": n["cin"],
             "e_n_h": _arr(len(g) / p * 10_000, 1) if p else None, "e_but_h": _arr(but / p * 1000, 0) if p else None}
        for k, v in (("e_n", len(g)), ("e_esc", n["esc"]), ("e_teatres", teatres), ("e_mus", n["mus"]), ("e_civ", n["civ"]),
                     ("e_vis", n["vis"]), ("e_cin", n["cin"]), ("but", but), ("pob", p), ("cult", cult)):
            tot[k] += v
        mun[m["ine"]] = {k: {any_: v} for k, v in o.items() if v is not None}
        for x in g.sort_values(["t", "nom"]).itertuples():
            fitxa[m["ine"]].append([str(x.nom).strip(), x.t, str(x.subtipus) if isinstance(x.subtipus, str) and x.subtipus != "NA" else "",
                                    int(x.af) if pd.notna(x.af) and x.af > 0 else None])
    if tot["pob"]:
        refs = {k: {any_: {"gi": tot[k]}} for k in ("e_n", "e_esc", "e_teatres", "e_mus", "e_civ", "e_vis", "e_cin")}
        refs["e_n_h"] = {any_: {"gi": _arr(tot["e_n"] / tot["pob"] * 10_000, 1)}}
        refs["e_but_h"] = {any_: {"gi": _arr(tot["but"] / tot["pob"] * 1000, 0)}}
    return mun, fitxa, refs, any_


def _comptes(municipios, fitxer, col_ine, clau, any_):
    """Recuento por municipio de un directorio (entidades, archivos, librerías)."""
    f = D / fitxer
    if not f.exists():
        return {}
    d = pd.read_csv(f, dtype=str)
    d = d[d[col_ine].str[:2] == "17"]
    c = d[col_ine].str[:5].value_counts().to_dict()
    return {m["ine"]: {clau: {any_: int(c.get(m["ine"], 0))}} for m in municipios}, d


def _programa(municipios):
    """Programa.cat: funciones profesionales de teatro, música, circo y danza subvencionadas, por municipio y año."""
    f = D / "programa_cat.csv"
    if not f.exists():
        return {}, {}, None, {}
    d = pd.read_csv(f, dtype=str)
    d["any"] = pd.to_datetime(d["data_espectacle"], errors="coerce").dt.year
    d = d.dropna(subset=["any"])
    d["any"] = d["any"].astype(int)
    d["ine"] = d["ine_municipi_espai"].str[:5]
    d["eur"] = pd.to_numeric(d["import_caixet"], errors="coerce").fillna(0)
    # Solo años completos: el año en curso tiene funciones ya programadas pero no todas
    import datetime as dt
    ult = min(int(d["any"].max()), dt.date.today().year - 1)
    d = d[(d["any"] >= 2014) & (d["any"] <= ult)]
    gi = d[d["ine"].str[:2] == "17"]
    g = gi.groupby(["ine", "any"]).size().to_dict()
    pob = {m["ine"]: m.get("poblacion") or 0 for m in municipios}
    anys = sorted(int(a) for a in d["any"].unique())
    mun = {}
    for m in municipios:
        o = {}
        for a in anys:
            n = g.get((m["ine"], a), 0)
            o.setdefault("p_n", {})[a] = n
            if pob[m["ine"]]:
                o.setdefault("p_h", {})[a] = _arr(n / pob[m["ine"]] * 10_000, 1)
        mun[m["ine"]] = o
    ptot = sum(pob.values())
    refs = {"p_n": {}, "p_h": {}}
    for a in anys:
        n = int((gi["any"] == a).sum())
        refs["p_n"][a] = {"gi": n, "cat": int((d["any"] == a).sum())}
        refs["p_h"][a] = {"gi": _arr(n / ptot * 10_000, 1) if ptot else None}
    # Gráficos de la provincia: funciones por año y por disciplina (último año, % de Girona y de Cataluña)
    cat_n = d.groupby("any").size()
    prov = {"cul_prog": {"tipus": "linia", "u": "", "dec": 0, "noms": "cul_prog",
                         "series": {"gi": [[int(a), str(a), int((gi["any"] == a).sum())] for a in anys]},
                         "abs": {"any": ult, "n": int((gi["any"] == ult).sum()), "eur": int(gi.loc[gi["any"] == ult, "eur"].sum()),
                                 "munis": int(gi.loc[gi["any"] == ult, "ine"].nunique())}}}
    u_gi, u_cat = gi[gi["any"] == ult], d[d["any"] == ult]
    if len(u_gi):
        prov["cul_prog_amb"] = {"tipus": "barres", "u": "%", "dec": 0, "claus": ["gi", "cat"], "any": ult,
                                "grups": [{"g": c, "c": "cp:" + slug(c), "gi": round((u_gi["mbit"] == c).mean() * 100, 1),
                                           "cat": round((u_cat["mbit"] == c).mean() * 100, 1)} for c in u_gi["mbit"].value_counts().index]}
    del cat_n
    return mun, refs, ult, prov


def _agenda(municipios):
    """Agenda cultural de Catalunya: actividades por municipio y año (según la fecha de inicio)."""
    f = D / "agenda.csv"
    if not f.exists():
        return {}, {}, None
    d = pd.read_csv(f, dtype=str).dropna(subset=["municipi", "any"])
    d["any"] = pd.to_numeric(d["any"], errors="coerce")
    d["n"] = pd.to_numeric(d["n"], errors="coerce").fillna(0)
    import datetime as dt
    ult = dt.date.today().year - 1
    d = d[(d["any"] >= 2021) & (d["any"] <= ult)]
    # 'agenda:ubicacions/girona/girones/girona' -> slug del municipio
    d["prov"] = d["municipi"].str.split("/").str[1]
    d["sl"] = d["municipi"].str.split("/").str[3].str.replace(",", "", regex=False)
    d = d.dropna(subset=["sl"])
    ine_de = {slug(m["nom"]): m["ine"] for m in municipios}
    # 'Bisbal d'Empordà, la' -> 'la-bisbal-d-emporda'
    for m in municipios:
        if ", " in m["nom"]:
            base, art = m["nom"].rsplit(", ", 1)
            ine_de[slug(f"{art} {base}")] = m["ine"]
    # Municipios que han cambiado de nombre: la agenda usa el antiguo
    ine_de.update({"brunyola": "17028", "calonge": "17034", "castell-platja-d-aro": "17048", "palamos": "17118"})
    gi = d[d["prov"] == "girona"].copy()
    gi["ine"] = gi["sl"].map(ine_de)
    sense = sorted(gi.loc[gi["ine"].isna(), "sl"].unique())
    if sense:
        print("AVISO cultura: municipios de la agenda sin casar:", sense[:20])
    g = gi.dropna(subset=["ine"]).groupby(["ine", "any"])["n"].sum().to_dict()
    pob = {m["ine"]: m.get("poblacion") or 0 for m in municipios}
    anys = sorted(int(a) for a in d["any"].unique())
    mun, refs = {}, {"ag_n": {}, "ag_h": {}}
    ptot = sum(pob.values())
    for m in municipios:
        o = {}
        for a in anys:
            n = int(g.get((m["ine"], a), 0))
            o.setdefault("ag_n", {})[a] = n
            if pob[m["ine"]]:
                o.setdefault("ag_h", {})[a] = _arr(n / pob[m["ine"]] * 1000, 1)
        mun[m["ine"]] = o
    for a in anys:
        n = int(gi.loc[gi["any"] == a, "n"].sum())
        refs["ag_n"][a] = {"gi": n, "cat": int(d.loc[d["any"] == a, "n"].sum())}
        refs["ag_h"][a] = {"gi": _arr(n / ptot * 1000, 1) if ptot else None}
    return mun, refs, (max(anys) if anys else None)


def _aec(nom):
    """Tabla comarcal del Anuari de l'Idescat (aec_<nom>.txt, formato ssv): (año, {comarca: {columna: valor}})."""
    f = D / f"aec_{nom}.txt"
    if not f.exists():
        return None, {}
    t = f.read_text(encoding="utf-8")
    m = re.search(r"^((?:19|20)\d\d)\s*$", t, re.M)
    cap, files = None, {}
    for lin in t.splitlines():
        x = lin.split(";")
        if len(x) < 2:
            continue
        if x[0] == "":
            cap = x[1:]
            continue
        if cap:
            files[x[0].strip()] = {c: _num(v) if v.strip() != ".." else None for c, v in zip(cap, x[1:])}
    return (int(m.group(1)) if m else None), files


# Comarcas que la provincia comparte: el Idescat da la comarca entera y el mapa solo dibuja la parte de Girona
COM_PARTIDES = {"Cerdanya", "Osona"}


def _comarques_idescat(municipios):
    """Cine, museos y radios por comarca (Anuari estadístic de Catalunya). Solo hay el último año."""
    pob = defaultdict(float)
    for m in municipios:
        if m.get("comarca"):
            pob[m["comarca"]] += m.get("poblacion") or 0
    com, refs, anys = defaultdict(dict), {}, []
    defs = {
        "cinema_sales": [("c_pant", "Pantalles", None, 0), ("c_but_h", "Aforament", 1000, 1)],
        "cinema_espectadors": [("c_esp_h", "Espectadors", 1, 2), ("c_esp", "Espectadors", None, 0)],
        "museus": [("m_vis_h", "Visitants", 1, 1), ("m_vis", "Visitants", None, 0), ("m_n", "Total", None, 0)],
        "radio_fm": [("r_fm", "Total", None, 0)],
    }
    for nom, cols in defs.items():
        a, files = _aec(nom)
        if not files:
            continue
        anys.append(a)
        gi_pob = sum(p for c, p in pob.items() if c not in COM_PARTIDES)
        for k, col, per, dec in cols:
            tot = 0
            for c, p in pob.items():
                if c in COM_PARTIDES:
                    continue
                v = (files.get(c) or {}).get(col)
                if v is None:
                    continue
                tot += v
                com[c][k] = {a: _arr(v / p * per, dec) if per else _arr(v, dec)} if (p or not per) else None
            cat = (files.get("Catalunya") or {}).get(col)
            refs[k] = {a: {"gi": _arr(tot / gi_pob * per, dec) if per else _arr(tot, dec)}}
            if cat is not None and not per:
                refs[k][a]["cat"] = _arr(cat, dec)
    return dict(com), refs, (max(anys) if anys else None)


def _junta(dst, src):
    for ine, o in src.items():
        for k, s in o.items():
            dst.setdefault(ine, {}).setdefault(k, {}).update(s)


def construir(municipios) -> dict:
    res = {"mun": {}, "refs": {}, "anys": {}, "com": {}, "fitxa": {}, "prov": {}, "resum": []}
    mb, rb, ab, fb, brut = _bib(municipios)
    _junta(res["mun"], mb)
    res["refs"].update(rb)
    if ab:
        res["anys"]["cul_bib"] = ab
        res["com"] = _bib_comarques(municipios, brut)
    me, fe, re_, ae = _equipaments(municipios)
    _junta(res["mun"], me)
    res["refs"].update(re_)
    if ae:
        res["anys"]["cul_eq"] = ae
        for fitxer, col, clau in (("entitats.csv", "codi_municipi", "ent_n"), ("arxius.csv", "codi_ine", "arx_n"), ("llibreries.csv", "codi_municipi", "llib_n")):
            r = _comptes(municipios, fitxer, col, clau, ae)
            if r:
                _junta(res["mun"], r[0])
                res["refs"][clau] = {ae: {"gi": int(len(r[1]))}}
    for clau, k, dec in (("cul_prest", "b_prest_h", 2), ("cul_carn", "b_carn_p", 1), ("cul_vis", "b_vis_h", 2), ("cul_desp", "b_desp_h", 2)):
        r = rb.get(k) or {}
        ser = {z: [[a, str(a), o[z]] for a, o in sorted(r.items()) if o.get(z) is not None] for z in ("gi", "cat")}
        if ser["gi"]:
            res["prov"][clau] = {"tipus": "linia", "u": "", "dec": dec, "series": ser}
    if ae and fe:
        n = defaultdict(int)
        for llista in fe.values():
            for x in llista:
                n[x[1]] += 1
        ordre = ["civ", "esc", "bib", "mus", "vis", "arx", "cin", "alt"]
        res["prov"]["cul_eq"] = {"tipus": "barres", "u": "", "dec": 0, "claus": ["gi"], "any": ae,
                                 "grups": [{"g": t, "c": "ce:" + t, "gi": n[t]} for t in ordre if n[t]], "total": sum(n.values())}
    mp, rp, ap, pp = _programa(municipios)
    _junta(res["mun"], mp)
    res["refs"].update(rp)
    res["prov"].update(pp)
    if ap:
        res["anys"]["cul_prog"] = ap
    mg, rg, ag = _agenda(municipios)
    _junta(res["mun"], mg)
    res["refs"].update(rg)
    if ag:
        res["anys"]["cul_ag"] = ag
    cc, rc, ac = _comarques_idescat(municipios)
    if ac:
        res["anys"]["cul_com"] = ac
        res["refs"].update(rc)
        for c, o in cc.items():
            res["com"].setdefault(c, {}).update({k: v for k, v in o.items() if v})
    for ine in set(fe) | set(fb):
        res["fitxa"][ine] = {**({"eq": fe[ine]} if fe.get(ine) else {}), **({"bib": fb[ine][:8]} if fb.get(ine) else {})}
    res["resum"] = (f"bibliotecas {len(mb)} municipios (último {ab}), equipamientos {sum(len(v) for v in fe.values())} ({ae}), "
                    f"Programa.cat hasta {ap}, agenda hasta {ag}")
    return res


if __name__ == "__main__":
    import json
    ms = json.loads((RAIZ / "web" / "datos" / "municipios.json").read_text())["municipios"]
    r = construir(ms)
    print(r["resum"], r["anys"])
    print({k: v for k, v in r["refs"].items() if k.startswith("b_")})
