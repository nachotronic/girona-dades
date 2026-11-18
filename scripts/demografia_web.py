"""Nacimientos, defunciones, causas de muerte y nombres para la web: sección «Néixer i morir» (D.dem).

Lee data/processed/demografia/ (fuentes/demografia.py) y escribe web/datos/demografia.json con:
  xifres   cifras de cabecera (últimos 12 meses provisionales, fecundidad, nombres)
  g        gráficos con el formato de pintaGrafics (provincia.js): series gi/cat/esp o grupos
  mapa     indicadores por provincia de España para el mapa (código INE de 2 cifras)
  noms     nombres de los nadons (Idescat): ranking por año, comarcas y serie de cada nombre
Devuelve también los indicadores por ABS del mapa principal (defunciones de los últimos 12 meses).
"""
from __future__ import annotations

import datetime as dt
import json
import pathlib
import re
import unicodedata

import pandas as pd

RAIZ = pathlib.Path(__file__).resolve().parent.parent
DIR = RAIZ / "data" / "processed" / "demografia"
GEO_PROV = RAIZ / "data" / "processed" / "exportacions" / "provincies.geojson"


def _n(s):
    s = unicodedata.normalize("NFKD", str(s)).encode("ascii", "ignore").decode().lower()
    return re.sub(r"\s+", " ", s).strip()


def _alias():
    al = {}
    if GEO_PROV.exists():
        for f in json.loads(GEO_PROV.read_text(encoding="utf-8"))["features"]:
            c, n = f["properties"]["c"], f["properties"]["n"]
            al[_n(n)] = c
            for p in n.split("/"):
                al[_n(p)] = c
    extra = {"Coruña, A": "15", "Coruña (A)": "15", "Balears (Illes)": "07", "Palmas (Las)": "35", "Rioja (La)": "26", "A Coruña": "15", "Balears, Illes": "07", "Illes Balears": "07", "Palmas, Las": "35", "Las Palmas": "35",
             "Rioja, La": "26", "La Rioja": "26", "Madrid, Comunidad de": "28", "Asturias, Principado de": "33", "Murcia, Región de": "30",
             "Navarra, Comunidad Foral de": "31", "Gerona": "17", "Lérida": "25", "Orense": "32", "Guipúzcoa": "20", "Vizcaya": "48",
             "Alicante/Alacant": "03", "Castellón/Castelló": "12", "Valencia/València": "46", "Araba/Álava": "01",
             "Total Nacional": "esp", "Total nacional": "esp", "Cataluña": "cat"}
    for k, v in extra.items():
        al[_n(k)] = v
    return al


AL = _alias()


def zona(nom: str):
    """Código de provincia (o esp/cat) de una serie del INE, por coincidencia exacta de un fragmento del nombre."""
    for t in [x.strip() for x in nom.split(". ")]:
        t = t.rstrip(".")
        for cand in (t, t.split(", ")[0]):
            c = AL.get(_n(cand))
            if c:
                return c
    return None


def _r(v, d=1):
    return None if v is None or v != v else round(float(v), d)


def _mes_x(a, m):
    return round(a + (m - 1) / 12, 4)


class Ine:
    def __init__(self):
        self.d = json.loads((DIR / "ine.json").read_text(encoding="utf-8")) if (DIR / "ine.json").exists() else {}

    def series(self, t, filtre=None):
        """{zona: [[año, periodo, valor, (fecha)]]} de las series que pasan el filtro (una por zona)."""
        out = {}
        for s in self.d.get(t, {}).get("series", []):
            if filtre and not filtre(s["nom"]):
                continue
            z = zona(s["nom"])
            if z and z not in out:
                out[z] = [p for p in s["d"] if p[2] is not None]
        return out

    def anual(self, t, filtre=None):
        return {z: {p[0]: p[2] for p in pts} for z, pts in self.series(t, filtre).items()}


def _mensual(ine):
    """Nacimientos y defunciones por mes y provincia: definitivos (MNP) + provisionales (EMN, EDeS)."""
    res = {}
    for k, defin, hist, prov in (("naix", "6524", "6526", "46682"), ("def", "6561", "6563", "62278")):
        tot = {}
        for t in (hist, defin, prov):
            for z, pts in ine.series(t).items():
                for a, m, v, *_ in pts:
                    if 1 <= m <= 12:
                        tot.setdefault(z, {})
                        # El definitivo manda sobre el provisional
                        if (a, m) not in tot[z] or t != prov:
                            tot[z][(a, m)] = v
        res[k] = tot
    return res


def _anys(mes_z):
    """Totales anuales de los años con los 12 meses."""
    per = {}
    for (a, m), v in mes_z.items():
        per.setdefault(a, []).append(v)
    return {a: sum(v) for a, v in per.items() if len(v) == 12}


def _ult12(mes_z):
    ks = sorted(mes_z)
    if len(ks) < 24:
        return None
    u = ks[-12:]
    a = [(x[0] - 1, x[1]) for x in u]
    if not all(k in mes_z for k in a):
        return None
    return {"n": int(sum(mes_z[k] for k in u)), "ant": int(sum(mes_z[k] for k in a)), "de": f"{u[0][0]}-{u[0][1]:02d}", "a": f"{u[-1][0]}-{u[-1][1]:02d}"}


CAPS = ["I", "II", "III", "IV", "V", "VI-VIII", "IX", "X", "XI", "XII", "XIII", "XIV", "XV", "XVI", "XVII", "XVIII", "XX"]


def _causes(ine):
    """{zona: {sexe: {cap: {año: n}}}} de la tabla 73035."""
    out = {}
    for s in ine.d.get("73035", {}).get("series", []):
        n = s["nom"]
        m = re.search(r"([IVX]+(?:-[IVX]+)?)\.([^.]+?)\. (Total|Hombres|Mujeres)\.", n)
        z = zona(n)
        if not m or not z:
            continue
        out.setdefault(z, {}).setdefault(m.group(3), {})[m.group(1)] = {p[0]: p[2] for p in s["d"] if p[2] is not None}
    return out


def _grups_edat(ine, t, pref):
    """Girona y España: {zona: {año: {grupo: n}}} con grupos de edad agregados."""
    out = {}
    for s in ine.d.get(t, {}).get("series", []):
        n = s["nom"]
        z = zona(n)
        if z not in ("17", "esp") or f"{pref}. Total." not in n:
            continue
        m = re.search(r"(Menos de 15|De (\d+) a (\d+)|(\d+) y más|(\d+) años y más)", n)
        if not m:
            continue
        ini = 0 if m.group(1).startswith("Menos") else int(m.group(2) or m.group(4) or m.group(5))
        for a, _, v, *_ in s["d"]:
            if v is not None:
                out.setdefault(z, {}).setdefault(a, {}).setdefault(ini, 0)
                out[z][a][ini] += v
    return out


def _agrupa(d, talls):
    """{ini: n} -> {etiqueta: n} con talls [(ini, fi, etiqueta)]."""
    return {e: sum(v for k, v in d.items() if i <= k <= f) for i, f, e in talls}


# ---------------------------------------------------------------------------
# CatSalut: defunciones diarias de la región sanitaria de Girona y por ABS

def _salut():
    fd, fa = DIR / "defuncions_dia.csv", DIR / "defuncions_abs.csv"
    if not fd.exists():
        return None
    d = pd.read_csv(fd)
    d["data"] = pd.to_datetime(d["data"])
    cat = d[d.zona == "cat"].set_index("data")["casos"].sort_index()
    # Los últimos días llegan incompletos: se corta en el último día con al menos el 75 % de lo normal
    ref = cat.rolling(365, min_periods=200).median()
    ok = cat[cat >= 0.75 * ref.shift(1)]
    fi = ok.index.max()
    # Se corta en domingo para tener semanas completas (lunes a domingo)
    fi = fi - pd.Timedelta(days=(fi.weekday() + 1) % 7)
    gi = d[(d.zona == "gi") & (d.data <= fi)].set_index("data")["casos"].sort_index()
    cat = cat[cat.index <= fi]
    return {"fi": fi, "gi": gi, "cat": cat, "abs": pd.read_csv(fa, dtype={"codi_abs": str}) if fa.exists() else None}


def _abs_indicadors(sal):
    """Defunciones de los últimos 12 meses completos por ABS: por 1.000 habitantes y frente a 2017-2019."""
    if not sal or sal["abs"] is None:
        return {}, {}
    a = sal["abs"].dropna(subset=["codi_abs"]).copy()
    a["codi_abs"] = a["codi_abs"].astype(str).str.lstrip("0")
    fi = sal["fi"]
    # Último mes completo
    ult = (fi + pd.Timedelta(days=1)).to_period("M") - 1 if (fi + pd.Timedelta(days=1)).day != 1 else fi.to_period("M")
    mesos = [str(ult - i) for i in range(12)]
    base = [f"{y}-{m:02d}" for y in (2017, 2018, 2019) for m in range(1, 13)]
    s12 = a[a.mes.isin(mesos)].groupby("codi_abs")["casos"].sum()
    sb = a[a.mes.isin(base)].groupby("codi_abs")["casos"].sum() / 3
    pf = RAIZ / "data" / "processed" / "salut" / "poblacio_abs.csv"
    pob = pd.read_csv(pf, dtype={"codi_abs": str}).set_index("codi_abs")["poblacio"] if pf.exists() else pd.Series(dtype=float)
    pob.index = pob.index.astype(str).str.lstrip("0")
    out = {}
    for c, v in s12.items():
        o = {}
        if pob.get(c):
            o["def_12m"] = _r(1000 * v / pob[c], 1)
        if sb.get(c, 0) >= 20:
            o["def_exces"] = _r(100 * (v / sb[c] - 1), 0)
        o["def_12m_n"] = int(v)
        out[c] = o
    tot_cat = a[a.mes.isin(mesos)]["casos"].sum()
    ref = {"def_exces": {"cat": _r(100 * (tot_cat / (a[a.mes.isin(base)]["casos"].sum() / 3) - 1), 0)}}
    return out, {"de": mesos[-1], "a": mesos[0], "ref": ref}


# ---------------------------------------------------------------------------
# Nombres

ACCENTS = {
    "MARTI": "Martí", "ALEX": "Àlex", "ADRIA": "Adrià", "NURIA": "Núria", "ERIC": "Èric", "CLAUDIA": "Clàudia", "JULIA": "Júlia",
    "LUCIA": "Lucía", "NURIA": "Núria", "MIREIA": "Mireia", "ELOI": "Eloi", "TEO": "Teo", "JOSEP": "Josep", "INES": "Inés", "IVAN": "Iván",
    "RUBEN": "Rubén", "JESUS": "Jesús", "ANGEL": "Àngel", "ANDRES": "Andrés", "JOAQUIM": "Joaquim", "AGUSTI": "Agustí", "TOMAS": "Tomàs",
    "NICOLAS": "Nicolás", "JOSE": "José", "MARIA": "Maria", "ROSER": "Roser", "ARIADNA": "Ariadna", "MONICA": "Mònica", "SILVIA": "Sílvia",
    "ESTER": "Ester", "BARBARA": "Bàrbara", "ANAIS": "Anaïs", "NOELIA": "Noelia", "RAUL": "Raúl", "SERGI": "Sergi", "VICTOR": "Víctor",
    "OSCAR": "Òscar", "HECTOR": "Hèctor", "ANGELA": "Àngela", "ALVARO": "Álvaro", "GERARD": "Gerard", "JOEL": "Joel", "ABRIL": "Abril",
    "ROC": "Roc", "IU": "Iu", "ORIOL": "Oriol", "AINA": "Aina", "QUERALT": "Queralt", "MARTINA": "Martina", "LLUC": "Lluc", "LLUIS": "Lluís",
    "ARNAU": "Arnau", "FARAH": "Farah", "ADAM": "Adam", "MOHAMED": "Mohamed", "YASMIN": "Yasmin", "CHLOE": "Chloé", "NOE": "Noè",
    "ZOE": "Zoe", "BRUNO": "Bruno", "ELIES": "Elies", "MATIES": "Maties", "MATEO": "Mateo", "JOAN": "Joan", "ONA": "Ona",
}


def _nom_bonic(n: str) -> str:
    if n in ACCENTS:
        return ACCENTS[n]
    return " ".join("-".join(p[:1] + p[1:].lower() for p in w.split("-")) for w in n.split(" "))


def _noms():
    f = DIR / "noms.json"
    if not f.exists():
        return None
    d = json.loads(f.read_text(encoding="utf-8"))
    anys = [a for a in d.get("anys", []) if str(a) in d["prov"] and d["prov"][str(a)]]
    if not anys:
        return None
    def top(l, s, n):
        return [[_nom_bonic(x[0]), x[2]] for x in l if x[1] == s][:n]
    rank = {str(a): {s: top(d["prov"][str(a)], s, 20) for s in "mf"} for a in anys}
    # Serie de cada nombre (provincia), para el buscador
    serie = {}
    for i, a in enumerate(anys):
        for nom, s, n, _ in d["prov"][str(a)]:
            serie.setdefault(f"{_nom_bonic(nom)}|{s}", [0] * len(anys))[i] = n
    serie = {k: v for k, v in serie.items() if sum(v) >= 15}
    ua = str(anys[-1])
    com = {c: {s: top(v.get(ua, []), s, 5) for s in "mf"} for c, v in d.get("com", {}).items() if v.get(ua)}
    cat = {s: top(d.get("cat", {}).get(ua, []), s, 10) for s in "mf"}
    return {"anys": anys, "rank": rank, "serie": serie, "com": com, "cat": cat, "any": anys[-1]}


# ---------------------------------------------------------------------------

def construir(salida: pathlib.Path) -> dict:
    res = {"abs": {}, "abs_meta": {}}
    if not (DIR / "ine.json").exists():
        return res
    ine = Ine()
    G, X, M = {}, {}, {}
    mens = _mensual(ine)
    nai, dfn = mens["naix"], mens["def"]
    # 1. Nacimientos y defunciones por año en la provincia (1941-)
    an, ad = _anys(nai.get("17", {})), _anys(dfn.get("17", {}))
    if an:
        G["dm_nd"] = {"tipus": "linia", "u": "n", "dec": 0, "zero": False, "noms": "dm_nd",
                      "series": {"gi": sorted([[a, str(a), v] for a, v in an.items()]), "esp": sorted([[a, str(a), v] for a, v in ad.items()])}}
    # 2. Últimos meses (provisional)
    mg_n, mg_d = nai.get("17", {}), dfn.get("17", {})
    ini = max(min(mg_n or [(2020, 1)]), (dt.date.today().year - 6, 1))
    G["dm_mes"] = {"tipus": "linia", "u": "n", "dec": 0, "zero": False, "noms": "dm_nd",
                   "series": {"gi": [[_mes_x(*k), f"{k[0]}-{k[1]:02d}", v] for k, v in sorted(mg_n.items()) if k >= ini],
                              "esp": [[_mes_x(*k), f"{k[0]}-{k[1]:02d}", v] for k, v in sorted(mg_d.items()) if k >= ini]}}
    u_n, u_d = _ult12(mg_n), _ult12(mg_d)
    X["naix12"], X["def12"] = u_n, u_d
    # Definitivo / provisional: último año del MNP
    X["defin"] = max((p[0] for p in ine.series("6524").get("17", [])), default=None)
    # 3. Defunciones semanales (EDeS): este año, el anterior y la media 2016-2019
    wk = ine.series("35168").get("17", [])
    if wk:
        per = {}
        for a, _, v, f in wk:
            if not f:
                continue
            d0 = dt.date.fromisoformat(f)
            y, w, _ = d0.isocalendar()
            per.setdefault(y, {})[w] = v
        ys = sorted(per)
        ua = ys[-1]
        base = {w: sum(per[y].get(w, 0) for y in (2016, 2017, 2018, 2019) if w in per.get(y, {})) / max(1, sum(1 for y in (2016, 2017, 2018, 2019) if w in per.get(y, {}))) for w in range(1, 53)}
        G["dm_setm"] = {"tipus": "linia", "u": "n", "dec": 0, "zero": False, "noms": "dm_setm", "setm": True,
                        "series": {"gi": [[w, f"s{w}", v] for w, v in sorted(per[ua].items())],
                                   "cat": [[w, f"s{w}", v] for w, v in sorted(per.get(ua - 1, {}).items()) if w <= 52],
                                   "esp": [[w, f"s{w}", round(v)] for w, v in sorted(base.items())]}, "anys": [ua, ua - 1]}
        acum = sum(per[ua].values())
        acum_ant = sum(v for w, v in per.get(ua - 1, {}).items() if w <= max(per[ua]))
        X["setm"] = {"any": ua, "setm": max(per[ua]), "n": int(acum), "ant": int(acum_ant)}
    # 4. Indicadores demográficos básicos: Girona y España
    def idb(t, filtre=None):
        return ine.anual(t, filtre)
    tot = lambda n: "," not in n and not re.search(r"Primero|Segundo|Tercero|Cuarto|Española|Extranjera", n)  # total, no por orden
    amb = lambda n: "Ambos sexos" in n
    ind = {"natalitat": ("1470", None, 2), "fecunditat": ("1478", tot, 2), "edat_mare": ("1581", tot, 1), "mortalitat": ("1482", None, 2),
           "mort_inf": ("1484", amb, 2), "saldo": ("1487", None, 2), "esperanca": ("1485", amb, 1)}
    vals = {k: idb(t, f) for k, (t, f, _) in ind.items()}
    for k, gid in (("fecunditat", "dm_fec"), ("edat_mare", "dm_mare_edat"), ("mort_inf", "dm_inf")):
        v = vals[k]
        if v.get("17"):
            G[gid] = {"tipus": "linia", "u": "n", "dec": ind[k][2], "zero": k == "mort_inf",
                      "series": {z: sorted([[a, str(a), x] for a, x in v[c].items()]) for z, c in (("gi", "17"), ("esp", "esp")) if v.get(c)}}
    for k in ("fecunditat", "edat_mare"):
        v = vals[k].get("17") or {}
        if v:
            a = max(v)
            X[k] = {"any": a, "gi": v[a], "esp": (vals[k].get("esp") or {}).get(a)}
    # 5. Edad de la madre: Girona, último año y 25 años antes
    em = _grups_edat(ine, "6510", "Nacimiento")
    if em.get("17"):
        anys = sorted(em["17"])
        a1, a0 = anys[-1], anys[0]
        talls = [(0, 19, "menys20"), (20, 24, "20_24"), (25, 29, "25_29"), (30, 34, "30_34"), (35, 39, "35_39"), (40, 99, "40mes")]
        g1, g0 = _agrupa(em["17"][a1], talls), _agrupa(em["17"][a0], talls)
        t1, t0 = sum(g1.values()) or 1, sum(g0.values()) or 1
        G["dm_mares"] = {"tipus": "barres", "u": "%", "dec": 1, "claus": ["gi", "cat"], "noms": "dm_anys", "anys": [a1, a0], "any": a1,
                         "grups": [{"g": e, "c": "edm:" + e, "gi": _r(100 * g1[e] / t1), "cat": _r(100 * g0[e] / t0)} for _, _, e in talls]}
    # 6. Defunciones por edad: Girona, último año y 25 años antes
    ed = _grups_edat(ine, "6549", "Defunción")
    if ed.get("17"):
        anys = sorted(ed["17"])
        a1, a0 = anys[-1], anys[0]
        talls = [(0, 14, "0_14"), (15, 44, "15_44"), (45, 64, "45_64"), (65, 74, "65_74"), (75, 84, "75_84"), (85, 94, "85_94"), (95, 200, "95mes")]
        g1, g0 = _agrupa(ed["17"][a1], talls), _agrupa(ed["17"][a0], talls)
        t1, t0 = sum(g1.values()) or 1, sum(g0.values()) or 1
        G["dm_def_edat"] = {"tipus": "barres", "u": "%", "dec": 1, "claus": ["gi", "cat"], "noms": "dm_anys", "anys": [a1, a0], "any": a1,
                            "grups": [{"g": e, "c": "edd:" + e, "gi": _r(100 * g1[e] / t1), "cat": _r(100 * g0[e] / t0)} for _, _, e in talls]}
    # 7. Causas de muerte
    ca = _causes(ine)
    gi = ca.get("17", {})
    if gi.get("Total", {}).get("I-XXII"):
        tg = gi["Total"]["I-XXII"]
        a = max(tg)
        # Dones i homes, % de les defuncions de cada sexe
        td, th = gi["Mujeres"]["I-XXII"][a], gi["Hombres"]["I-XXII"][a]
        grups = [{"g": c, "c": "cau:" + c, "gi": _r(100 * gi["Mujeres"].get(c, {}).get(a, 0) / td), "esp": _r(100 * gi["Hombres"].get(c, {}).get(a, 0) / th),
                  "n": int(gi["Total"].get(c, {}).get(a, 0))} for c in CAPS if c in gi["Total"]]
        grups = sorted([g for g in grups if (g["gi"] or 0) + (g["esp"] or 0) >= 1.5], key=lambda g: -(g["n"]))
        G["dm_causes_sexe"] = {"tipus": "barres", "u": "%", "dec": 1, "nu": "def_n", "claus": ["gi", "esp"], "noms": "dm_sexe", "any": a, "total": int(tg[a]), "td": int(td), "th": int(th), "grups": grups}
        # Evolución de las tres primeras causas (% del total)
        ser = {}
        for z, c in (("gi", "II"), ("cat", "IX"), ("esp", "X")):
            ser[z] = [[y, str(y), _r(100 * gi["Total"][c][y] / tg[y])] for y in sorted(tg) if y in gi["Total"].get(c, {})]
        G["dm_causes_evol"] = {"tipus": "linia", "u": "%", "dec": 1, "noms": "dm_cev", "series": ser}
    # 8. CatSalut: defunciones por mes en la región sanitaria (con el corte de días incompletos)
    sal = _salut()
    if sal:
        gm = sal["gi"].resample("MS").sum()
        fi = sal["fi"]
        gm = gm[gm.index < (fi + pd.Timedelta(days=1)).to_period("M").start_time] if (fi + pd.Timedelta(days=1)).day != 1 else gm
        base = gm[(gm.index.year >= 2017) & (gm.index.year <= 2019)]
        bm = base.groupby(base.index.month).mean()
        G["dm_rs_mes"] = {"tipus": "linia", "u": "n", "dec": 0, "zero": False, "noms": "dm_rs",
                          "series": {"gi": [[_mes_x(t.year, t.month), f"{t.year}-{t.month:02d}", int(v)] for t, v in gm.items()],
                                     "esp": [[_mes_x(t.year, t.month), f"{t.year}-{t.month:02d}", round(float(bm[t.month]))] for t in gm.index]}}
        X["rs_fi"] = fi.date().isoformat()
        res["abs"], res["abs_meta"] = _abs_indicadors(sal)
    # 9. Mapa de provincias
    pob = {}
    m_tot = ca
    # Población implícita: defunciones / tasa bruta de mortalidad
    mort = vals["mortalitat"]
    for z, cz in ca.items():
        t = cz.get("Total", {}).get("I-XXII", {})
        for y, n in t.items():
            r = (mort.get(z) or {}).get(y)
            if r:
                pob.setdefault(z, {})[y] = n / (r / 1000)
    for k, (t, f, dec) in ind.items():
        v = vals[k]
        anys = sorted({y for z, s in v.items() if z not in ("esp", "cat") for y in s})
        if not anys:
            continue
        y = anys[-1]
        M[k] = {"any": y, "dec": dec, "v": {z: s.get(y) for z, s in v.items() if z not in ("esp", "cat") and s.get(y) is not None},
                "esp": (v.get("esp") or {}).get(y)}
    for k, src in (("naix_var", nai), ("def_var", dfn)):
        vv, per = {}, None
        for z, s in src.items():
            u = _ult12(s)
            if u and u["ant"] and z not in ("esp", "cat"):
                vv[z] = _r(100 * (u["n"] / u["ant"] - 1), 1)
                per = per or (u["de"], u["a"])
        ue = _ult12(src.get("esp", {}))
        if vv:
            M[k] = {"any": per[1] if per else None, "de": per[0] if per else None, "dec": 1, "v": vv, "esp": _r(100 * (ue["n"] / ue["ant"] - 1), 1) if ue and ue["ant"] else None}
    caus = {}
    anyc = max((max(cz.get("Total", {}).get("I-XXII", {0: 0})) for z, cz in ca.items() if z not in ("esp", "cat")), default=None)
    if anyc:
        for c in CAPS:
            pc, tx = {}, {}
            for z, cz in ca.items():
                if z in ("cat",):
                    continue
                n = cz.get("Total", {}).get(c, {}).get(anyc)
                t = cz.get("Total", {}).get("I-XXII", {}).get(anyc)
                if n is None or not t:
                    continue
                pc[z] = _r(100 * n / t, 1)
                p_ = (pob.get(z) or {}).get(anyc)
                if p_:
                    tx[z] = _r(1e5 * n / p_, 0)
            if pc:
                caus[c] = {"pct": pc, "taxa": tx}
        M["causes"] = {"any": anyc, "caps": caus}
    # 10. Cifras de los nombres
    noms = _noms()
    out = {"generat": dt.date.today().isoformat(), "x": X, "g": G, "mapa": M, "noms": noms}
    salida.mkdir(parents=True, exist_ok=True)
    (salida / "demografia.json").write_text(json.dumps(out, ensure_ascii=False, separators=(",", ":"), allow_nan=False), encoding="utf-8")
    if GEO_PROV.exists() and not (salida / "provincies.geojson").exists():
        import shutil
        shutil.copy(GEO_PROV, salida / "provincies.geojson")
    res["resum"] = {"graf": sorted(G), "mapa": sorted(M), "noms": bool(noms)}
    return res


if __name__ == "__main__":
    r = construir(RAIZ / "web" / "datos")
    print(r["resum"], len(r["abs"]), r["abs_meta"])
