"""Genera web/datos/municipios.json a partir de data/processed (vivienda y renta)."""
from __future__ import annotations

import datetime as dt
import glob
import json
import math
import pathlib

import sys

import pandas as pd

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent.parent))
from fuentes.comun import normaliza  # noqa: E402

RAIZ = pathlib.Path(__file__).resolve().parent.parent
P = RAIZ / "data" / "processed"
SALIDA = RAIZ / "web" / "datos" / "municipios.json"


def num(s):
    """'17.794' -> 17794 ; '33,0' -> 33.0 ; NaN -> None"""
    if s is None or (isinstance(s, float) and math.isnan(s)):
        return None
    s = str(s).strip().replace(".", "").replace(",", ".")
    try:
        return float(s)
    except ValueError:
        return None


def uno(patron: str) -> str:
    return glob.glob(str(P / patron))[0]


def territorio():
    return pd.read_csv(P / "territorio" / "municipios.csv", dtype=str)


def poblacion():
    df = pd.read_csv(uno("xifra/03020101_*"), dtype=str)
    pob = dict(zip(df["Codi INE"].str[:5], pd.to_numeric(df["Total"], errors="coerce")))
    e = pd.read_csv(uno("xifra/03020103_*"), dtype=str).iloc[1:]
    etca = dict(zip(e["Codi INE"].str[:5], pd.to_numeric(e["Població ECTA"], errors="coerce")))
    return pob, etca


def alquiler():
    d = pd.read_csv(uno("generalitat/qww9-bvhh_*"), dtype=str)
    d = d[(d["Període"] == "gener-desembre") & (d["Àmbit territorial"] == "Municipi")].copy()
    d["renda"] = pd.to_numeric(d["Renda"], errors="coerce")
    d["contratos"] = pd.to_numeric(d["Habitatges"], errors="coerce")
    d["any"] = d["Any"].astype(int)
    d["ine"] = d["Codi territorial"].str.zfill(5)
    return d[["ine", "any", "renda", "contratos"]]


def compraventas(codigo="34010210"):
    df = pd.read_csv(uno(f"mitma/{codigo}_*"), header=None, dtype=str)
    anys = df.iloc[4].ffill()
    cols = {}
    for j in range(1, df.shape[1]):
        a = str(anys.iloc[j])
        if a.startswith("Año"):
            cols.setdefault(int(a.split()[1]), []).append(j)
    # Las filas de la provincia empiezan tras la cabecera "Girona" (fila sin datos)
    cab = [i for i in range(df.shape[0]) if str(df.iloc[i, 0]).strip() == "Girona" and df.iloc[i, 1:].isna().all()]
    filas = df.iloc[(cab[0] + 1 if cab else 9):]
    nombres = dict(zip(territorio()["nom_normalitzat"], territorio()["codi_ine"]))
    res = {}
    for _, f in filas.iterrows():
        n = normaliza(f[0])
        ine = nombres.get(n)
        if not ine and n:
            # Municipios renombrados tras fusiones ("Palamós" -> "Palamós i Sant Joan")
            cand = [k for k in nombres if set(n.split()) <= set(k.split())]
            ine = nombres[cand[0]] if len(cand) == 1 else None
        # Si un nombre se repite (pueblos homónimos de otras provincias al final), vale el primero
        if not ine or ine in res:
            continue
        serie = {}
        for a, js in cols.items():
            vals = [pd.to_numeric(f[j], errors="coerce") for j in js]
            if len(vals) == 4 and all(not pd.isna(v) for v in vals):
                serie[a] = int(sum(vals))
        res[ine] = serie
    return res


def atlas(fichero, indicador):
    d = pd.read_csv(P / "ine" / "atlas_renta" / fichero, dtype=str)
    col = d.columns[3]
    d = d[d["Distritos"].isna() & d["Secciones"].isna() & (d[col] == indicador)]
    res = {}
    for _, f in d.iterrows():
        v = num(f["Total"])
        if v is not None:
            res.setdefault(f["Municipios"][:5], {})[int(f["Periodo"])] = v
    return res


def hut():
    h = pd.read_csv(uno("generalitat/t2h3-cgys_*"), dtype=str)
    h = h[h["Tipus establiment"] == "Habitatges d'ús turístic"]
    return h["Codi Municipi (IDESCAT)"].str[:5].value_counts().to_dict()


def catastro():
    c = pd.read_csv(P / "catastro" / "edificios_municipio.csv", dtype={"codi_ine": str})
    antes = [x for x in c.columns if x.startswith("viviendas_") and (x == "viviendas_<1900" or (x[10:].isdigit() and int(x[10:]) < 1980))]
    c["viv_antes_1980"] = c[antes].sum(axis=1)
    return c.set_index("codi_ine")


def atlas_secciones(fichero, indicador, anyo="2024"):
    d = pd.read_csv(P / "ine" / "atlas_renta" / fichero, dtype=str)
    col = d.columns[3]
    d = d[d["Secciones"].notna() & (d[col] == indicador) & (d["Periodo"] == anyo)]
    return {f["Secciones"][:10]: num(f["Total"]) for _, f in d.iterrows()}


def secciones():
    rp = atlas_secciones("31016.csv.gz", "Renta neta media por persona")
    rh = atlas_secciones("31016.csv.gz", "Renta neta media por hogar")
    gi = atlas_secciones("37697.csv.gz", "Índice de Gini")
    p8 = atlas_secciones("37697.csv.gz", "Distribución de la renta P80/P20")
    cat = {}
    ruta = P / "catastro" / "edificios_seccion.csv"
    if ruta.exists():
        c = pd.read_csv(ruta, dtype={"cusec": str})
        cat = {f["cusec"].zfill(10): f for _, f in c.iterrows()}
    res = {}
    for cusec in sorted(set(rp) | set(gi) | set(cat)):
        f = cat.get(cusec)
        res[cusec] = {
            "renta_persona": r(rp.get(cusec)), "renta_hogar": r(rh.get(cusec)),
            "gini": r(gi.get(cusec), 1), "p80p20": r(p8.get(cusec), 1),
            "viviendas": r(float(f["viviendas"])) if f is not None else None,
            "viv_antes_1980": r(float(f["viv_antes_1980"])) if f is not None else None,
            "viv_post_2000": r(float(f["viv_post_2000"])) if f is not None else None,
            "anyo_mediano": r(float(f["anyo_mediano"])) if f is not None and not pd.isna(f["anyo_mediano"]) else None,
            "edificis": r(float(f["edificios"])) if f is not None and "edificios" in f else None,
        }
    _, extra, _ = atlas_extra()
    for cusec, x in extra.items():
        res.setdefault(cusec, {}).update(x)
    return res


# Indicadores extra del Atlas de renta (último año), por municipio y por sección.
# clave: (fichero, {columna: valor}, decimales)
ATLAS_EXTRA = {
    "ing_salari": ("31017.csv.gz", {3: "Fuente de ingreso: salario"}, 1),
    "ing_pensio": ("31017.csv.gz", {3: "Fuente de ingreso: pensiones"}, 1),
    "ing_atur": ("31017.csv.gz", {3: "Fuente de ingreso: prestaciones por desempleo"}, 1),
    "ing_altres_prest": ("31017.csv.gz", {3: "Fuente de ingreso: otras prestaciones"}, 1),
    "pobresa": ("31021.csv.gz", {3: "Total", 4: "Población con ingresos por unidad de consumo por debajo 60% de la mediana"}, 1),
    "pobresa_sev": ("31021.csv.gz", {3: "Total", 4: "Población con ingresos por unidad de consumo por debajo 40% de la mediana"}, 1),
    "alts_ingressos": ("31021.csv.gz", {3: "Total", 4: "Población con ingresos por unidad de consumo por encima 200% de la mediana"}, 1),
    "edat": ("31024.csv.gz", {3: "Edad media de la población"}, 1),
    "menors18": ("31024.csv.gz", {3: "Porcentaje de población menor de 18 años"}, 1),
    "majors65": ("31024.csv.gz", {3: "Porcentaje de población de 65 y más años"}, 1),
    "llar": ("31024.csv.gz", {3: "Tamaño medio del hogar"}, 2),
    "unipersonals": ("31024.csv.gz", {3: "Porcentaje de hogares unipersonales"}, 1),
    "espanyols": ("31024.csv.gz", {3: "Porcentaje de población española"}, 1),
}
_CACHE_ATLAS = {}


def atlas_extra():
    """Devuelve ({ine: {clave: v}}, {cusec: {clave: v}}, {clave: año})."""
    mun, sec, anys = {}, {}, {}
    for clave, (fichero, filtros, dec) in ATLAS_EXTRA.items():
        ruta = P / "ine" / "atlas_renta" / fichero
        if not ruta.exists():
            print(f"AVISO: falta {ruta}")
            continue
        if fichero not in _CACHE_ATLAS:
            _CACHE_ATLAS[fichero] = pd.read_csv(ruta, dtype=str)
        d = _CACHE_ATLAS[fichero]
        for i, v in filtros.items():
            d = d[d[d.columns[i]] == v]
        if d.empty:
            continue
        anyo = d["Periodo"].max()
        anys[clave] = int(anyo)
        d = d[d["Periodo"] == anyo]
        for _, f in d.iterrows():
            v = num(f["Total"])
            if v is None:
                continue
            v = r(v, dec)
            if pd.isna(f["Distritos"]) and pd.isna(f["Secciones"]):
                mun.setdefault(f["Municipios"][:5], {})[clave] = v
            elif not pd.isna(f["Secciones"]):
                sec.setdefault(f["Secciones"][:10], {})[clave] = v
    for dic in (mun, sec):
        for x in dic.values():
            if "espanyols" in x:
                x["estrangers"] = r(100 - x.pop("espanyols"), 1)
    if "espanyols" in anys:
        anys["estrangers"] = anys.pop("espanyols")
    return mun, sec, anys



def _xnum(x):
    if x is None or (isinstance(x, float) and math.isnan(x)):
        return None
    x = str(x).strip().replace("%", "")
    if x in ("", "ND", "-", "..", "nd"):
        return None
    try:
        return float(x)
    except ValueError:
        return num(x)


def _xifra(prefijo, cols):
    """Tabla de Xifra por municipio -> {ine: [valores de las columnas pedidas]}"""
    try:
        d = pd.read_csv(uno(f"xifra/{prefijo}_*"), dtype=str)
    except Exception as e:  # noqa: BLE001
        print(f"AVISO xifra {prefijo}: {e}")
        return {}
    clau = d.columns[0]
    res = {}
    for _, f in d.iterrows():
        ine = str(f[clau])[:5]
        if not ine.isdigit():
            continue
        res[ine] = [_xnum(f[d.columns[c]] if isinstance(c, int) else f[c]) for c in cols]
    return res


def xifra_indicadores(pob, viv):
    """Indicadores municipales derivados de Xifra (Diputació de Girona). Devuelve ({ine: {clave: v}}, {clave: año})."""
    per = lambda v, p, k=100: None if v is None or not p else v / p * k  # noqa: E731
    res, anys = {}, {}
    def pon(clave, dades, f, dec=1, any_=None):
        for ine, vs in dades.items():
            try:
                v = f(ine, vs)
            except (TypeError, ZeroDivisionError):
                v = None
            if v is not None:
                res.setdefault(ine, {})[clave] = r(v, dec)
        if any_:
            anys[clave] = any_
    pon("deute_hab", _xifra("030704", [2]), lambda i, v: per(v[0], pob.get(i), 1), 0, 2025)
    pon("atur", _xifra("030606", [2]), lambda i, v: per(v[0], pob.get(i)), 1, 2026)
    pon("cotxes", _xifra("030514", [2, 7]), lambda i, v: per(v[0], pob.get(i), 1000), 0, 2024)
    pon("irpf_base", _xifra("030521", [2]), lambda i, v: v[0], 0, 2023)
    pon("autonoms", _xifra("03060102", [6]), lambda i, v: per(v[0], pob.get(i)), 1)
    pon("empreses", _xifra("030504", [6]), lambda i, v: per(v[0], pob.get(i), 1000), 1)
    pon("llocs", _xifra("030601", [6]), lambda i, v: per(v[0], pob.get(i)), 0)
    pon("visats", _xifra("03051002", [3]), lambda i, v: per(v[0], pob.get(i), 1000), 1, 2025)
    pon("buits", _xifra("03031201", [2]), lambda i, v: per(v[0], viv.get(i), 1000), 1, 2025)
    pon("valor_cad", _xifra("03031401", [5, 8]), lambda i, v: v[1] * 1000 / v[0] if v[0] else None, 0, 2025)
    pon("kwh_dom", _xifra("03030502", [7]), lambda i, v: per(v[0], pob.get(i), 1), 0, 2024)
    pon("natalitat", _xifra("03020401", [4]), lambda i, v: per(v[0], pob.get(i), 1000), 1, 2024)
    pon("mortalitat", _xifra("03020402", [4]), lambda i, v: per(v[0], pob.get(i), 1000), 1, 2024)
    pon("catala", _xifra("03020305", [3, 7]), lambda i, v: per(v[0], v[1]), 0, 2011)
    # Trabajo (afiliados a la Seguridad Social por residencia = "Ocupats")
    pon("ocupats", _xifra("030604", [4]), lambda i, v: per(v[0], pob.get(i)), 1)
    pon("ocupats_dones", _xifra("030604", [3, 4]), lambda i, v: per(v[0], v[1]), 1)
    llocs = _xifra("030601", [2, 3, 4, 5, 6])
    for clau, k in (("sector_agri", 0), ("sector_ind", 1), ("sector_const", 2), ("sector_serveis", 3)):
        pon(clau, llocs, lambda i, v, k=k: per(v[k], v[4]), 1)
    pon("atur_var", _xifra("030606", [1, 2]), lambda i, v: (v[1] / v[0] - 1) * 100 if v[0] and v[0] >= 20 else None, 1, 2026)
    pon("atur_estr", {i: [a[0], b[0]] for i, a in _xifra("030608", [2]).items() for b in [_xifra("030606", [2]).get(i, [None])]},
        lambda i, v: per(v[0], v[1]) if v[1] and v[1] >= 20 else None, 0, 2026)
    pon("prest_atur", _xifra("030609", [5]), lambda i, v: per(v[0], pob.get(i), 1000), 1, 2026)
    # Pensiones y servicios
    pon("pensions", _xifra("03030906", [7]), lambda i, v: per(v[0], pob.get(i)), 1)
    pon("pnc", _xifra("03030904", [6]), lambda i, v: per(v[0], pob.get(i), 1000), 1, 2025)
    pon("pnc_import", _xifra("03030904", [7]), lambda i, v: v[0], 0, 2025)
    pon("residencies", _xifra("03030901", [5]), lambda i, v: per(v[0], pob.get(i), 1000), 1, 2025)
    pon("farmacies", _xifra("03030703", [2]), lambda i, v: per(v[0], pob.get(i), 10000), 1, 2025)
    pon("sanitaris", _xifra("03030704", [2, 3, 4, 5, 6]), lambda i, v: sum(x or 0 for x in v), 0, 2025)
    # Periodo medio de pago: último trimestre con dato
    pmp = _xifra("030702", list(range(2, 10)))
    pon("pmp", pmp, lambda i, v: next((x for x in v if x is not None), None), 0)
    return res, anys



MESOS = ["Gener", "Febrer", "Març", "Abril", "Maig", "Juny", "Juliol", "Agost", "Setembre", "Octubre", "Novembre", "Desembre"]


def generalitat_indicadores(pob):
    """Renta garantizada, autoconsumo y recogida selectiva por municipio."""
    res, anys = {}, {}
    def pon(ine, clave, v, dec=1):
        if v is not None and not (isinstance(v, float) and math.isnan(v)):
            res.setdefault(ine, {})[clave] = r(float(v), dec)
    try:
        g = pd.read_csv(uno("generalitat/u5i2-b24m_*"), dtype=str)
        g["any"] = pd.to_numeric(g["Any"], errors="coerce")
        g["mes"] = g["Mes"].map({m: i for i, m in enumerate(MESOS)})
        g = g.dropna(subset=["any", "mes"]).sort_values(["any", "mes"])
        ult = g.groupby(g["Codi municipi"].str[:5]).tail(1)
        for _, f in ult.iterrows():
            ine = f["Codi municipi"][:5]
            b = _xnum(f["Total Beneficiaris"])
            if b is not None and pob.get(ine):
                pon(ine, "rgc", b / pob[ine] * 1000)
        anys["rgc"] = int(g["any"].max())
    except Exception as e:  # noqa: BLE001
        print("AVISO renda garantida:", e)
    try:
        a = pd.read_csv(uno("generalitat/2b4s-skfm_*"), dtype=str)
        a["kw"] = pd.to_numeric(a["Potència"], errors="coerce") / 1000
        a["ine"] = a["Codi IDESCAT municipi"].str[:5]
        for ine, grp in a.groupby("ine"):
            if pob.get(ine):
                pon(ine, "autoconsum", len(grp) / pob[ine] * 1000)
    except Exception as e:  # noqa: BLE001
        print("AVISO autoconsum:", e)
    try:
        w = pd.read_csv(uno("generalitat/69zu-w48s_*"), dtype=str)
        w["any"] = pd.to_numeric(w["Any"], errors="coerce")
        ua = int(w["any"].max())
        for _, f in w[w["any"] == ua].iterrows():
            pon(f["Codi municipi"][:5], "selectiva", _xnum(f["R.S. / R.M. % total"]))
        anys["selectiva"] = ua
    except Exception as e:  # noqa: BLE001
        print("AVISO residus:", e)
    return res, anys



import re

BLOCS = [("Junts", {"CM", "JUNTS", "JXF", "JXCAT", "CIU", "CDC", "PDECAT", "JXC"}),
         ("ERC", {"ERC", "AM"}),
         ("PSC", {"PSC", "CP", "PSOE"}),
         ("CUP", {"CUP", "AMUNT"}),
         ("Vox", {"VOX"}),
         ("PP", {"PP"}),
         ("Comuns", {"ECP", "COMUNS", "ICV", "EUIA", "BEC"}),
         ("Aliança", {"ALIANÇA"})]


def bloc(sigles):
    """Agrupa unas siglas de candidatura en su bloque político (o 'Locals')."""
    toks = set(re.findall(r"[A-ZÀ-Ü]+", str(sigles).upper()))
    for nom, claus in BLOCS:
        if toks & claus:
            return nom
    return "Locals"


PARTICULES = {"de", "del", "la", "les", "i", "el", "els", "d", "l"}


def nom_propi(n):
    n = str(n).strip()
    base = n.replace("(Ind.)", "").replace("(ind.)", "")
    if base.upper() != base:
        return n
    paraules = re.split(r"(\s+|-|'|\()", n.lower())
    return "".join(p if p in PARTICULES or not p.strip() else p[:1].upper() + p[1:] for p in paraules).replace("(ind.)", "(Ind.)")


def _t(x):
    return None if x is None or (isinstance(x, float) and math.isnan(x)) else str(x).strip()


def politica():
    """Alcalde, pleno y resultados municipales por municipio (Generalitat)."""
    res, anys = {}, {}
    try:
        a = pd.read_csv(uno("generalitat/vevv-8fvw_*"), dtype=str)
        for _, f in a.iterrows():
            res.setdefault(f["CODI_ENS"][:5], {})["alcalde"] = {
                "nom": nom_propi(f["PRESIDENT"]), "carrec": _t(f["CARREC_PRESIDENT"]),
                "partit": _t(f["PARTITPOL"]) or "", "bloc": bloc(f["PARTITPOL"])}
    except Exception as e:  # noqa: BLE001
        print("AVISO alcaldes:", e)
    try:
        p = pd.read_csv(uno("generalitat/nm3n-3vbj_*"), dtype=str)
        p = p[p["TIPUS_ENS"] == "Municipis"]
        p["o"] = pd.to_numeric(p["ORDRE"], errors="coerce")
        for ine, g in p.sort_values("o").groupby(p["CODI_10"].str[:5]):
            res.setdefault(ine, {})["ple"] = [{"nom": nom_propi(f["NOM"]), "carrec": _t(f["CARREC"]) or "", "partit": _t(f["PARTIT_POLITIC"]) or ""} for _, f in g.iterrows() if _t(f["NOM"])]
    except Exception as e:  # noqa: BLE001
        print("AVISO plens:", e)
    try:
        v = pd.read_csv(uno("generalitat/vq27-2ky2_*"), dtype=str)
        v["any"] = pd.to_numeric(v["ANY_ELECCIO"], errors="coerce")
        ua = int(v["any"].max()); anys["eleccions"] = ua
        v = v[v["any"] == ua]
        q = pd.read_csv(uno("generalitat/ques-gd6z_*"), dtype=str)
        q = q[pd.to_numeric(q["ANY_ELECCIO"], errors="coerce") == ua]
        part = {f["CODI_ENS"][:5]: _xnum(f["VOTANTS_PERCENT"]) for _, f in q.iterrows()}
        for ine, g in v.groupby(v["CODI_ENS"].str[:5]):
            rs = []
            for _, f in g.iterrows():
                vots = _xnum(f["VOTS"])
                if not vots:
                    continue
                rs.append({"s": _t(f["SIGLES_CANDIDATURA"]) or "?", "b": bloc(f["SIGLES_CANDIDATURA"]), "vots": int(vots),
                           "pct": r(_xnum(f["% VOTS"]), 1), "reg": int(_xnum(f["REGIDORS"]) or 0)})
            rs.sort(key=lambda x: -x["vots"])
            res.setdefault(ine, {})["eleccions"] = {"any": ua, "participacio": r(part.get(ine), 1), "resultats": rs}
    except Exception as e:  # noqa: BLE001
        print("AVISO eleccions:", e)
    return res, anys


def indicadores_politica(pol):
    """Indicadores numéricos para el mapa a partir de los resultados municipales."""
    out = {}
    for ine, p in pol.items():
        e = p.get("eleccions")
        if not e:
            continue
        x = {"participacio": e["participacio"]}
        tot = sum(z["vots"] for z in e["resultats"]) or None
        for nom, _ in BLOCS + [("Locals", None)]:
            vb = sum(z["vots"] for z in e["resultats"] if z["b"] == nom)
            x["vot_" + nom.lower().replace("ç", "c")] = r(vb / tot * 100, 1) if tot else None
        out[ine] = x
    return out


def r(x, n=0):
    return None if x is None or (isinstance(x, float) and math.isnan(x)) else (round(x, n) if n else int(round(x)))


# ---------------------------------------------------------------------------
# Áreas de salud (ABS) y áreas policiales (ABP)

PRIMARIA = {  # clave -> (código, filtro, fórmula)
    "diabetis": ("APEE00201", None, 100), "grip": ("APEE00103", None, 100), "vac_inf": ("APEE00101", None, 100),
    "tensio": ("APEE00401", None, 100), "visites": ("APDG00501", "Visites Totals", 1),
    "presencials": ("APDG00601", None, 100), "econsulta": ("APTI00101", None, 100),
    "antibio": ("APAD00401", None, 100), "domicili": ("APEE00501", None, 100),
}
TITOLS = {
    "patrimoni": ("contra el patrimoni",),
    "persones": ("De les lesions", "homicidi", "contra la llibertat", "integritat moral", "Faltes contra les persones"),
    "sexual": ("llibertat i la indemnitat sexuals",),
}


def arees():
    """Devuelve ({'abs': {...}, 'abp': {...}}, refs, anys) y copia las geometrías a web/datos."""
    import shutil
    res, refs, anys = {"abs": {}, "abp": {}}, {}, {}
    sal = P / "salut"
    if (sal / "mortalitat_abs.csv").exists():
        mo = pd.read_csv(sal / "mortalitat_abs.csv", dtype={"codi_abs": str})
        for _, f in mo.iterrows():
            d = {"rme": r(f["rme"], 1), "mort_prem": r(f["prematura"], 1), "mort_bruta": r(f["taxa_bruta"], 1)}
            if f["codi_abs"] in ("CAT", "GI"):
                for k, v in d.items():
                    if v is not None:
                        refs.setdefault(k, {})["cat" if f["codi_abs"] == "CAT" else "gi"] = v
            else:
                res["abs"].setdefault(f["codi_abs"], {}).update(d)
        anys.update({k: str(mo["periode"].iloc[0]) for k in ("rme", "mort_prem", "mort_bruta")})
    if (sal / "primaria_abs.csv").exists():
        pr = pd.read_csv(sal / "primaria_abs.csv", dtype={"codi_abs_a": str, "filtre_1": str})
        pr["v"] = pd.to_numeric(pr["v"], errors="coerce")
        for k, (codi, filtre, mult) in PRIMARIA.items():
            x = pr[pr["codi_indicador"] == codi]
            if filtre:
                x = x[x["filtre_1"] == filtre]
            t = x.pivot_table(index="codi_abs_a", columns="nom_variable", values="v", aggfunc="sum")
            if not {"n", "d"} <= set(t.columns):
                continue
            for codi_abs, f in t.iterrows():
                v = r(f["n"] / f["d"] * mult, 1) if f["d"] else None
                if v is None:
                    continue
                if codi_abs in ("CAT", "GI"):
                    refs.setdefault(k, {})["cat" if codi_abs == "CAT" else "gi"] = v
                else:
                    res["abs"].setdefault(codi_abs, {})[k] = v
            anys[k] = int(pr["any"].iloc[0])
    if (sal / "abs.geojson").exists():
        g = json.loads((sal / "abs.geojson").read_text(encoding="utf-8"))
        for f in g["features"]:
            f["properties"] = {"id": str(f["properties"]["codi"]), "nom": f["properties"]["nom"]}
        (SALIDA.parent / "abs.geojson").write_text(json.dumps(g, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")

    pol = P / "policia"
    if all((pol / n).exists() for n in ("fets_penals_abp.csv.gz", "abp.geojson", "poblacio_abp.csv")):
        fp = pd.read_csv(pol / "fets_penals_abp.csv.gz")
        ult = int(fp["any"].max())
        fp = fp[fp["any"] == ult]
        pa = pd.read_csv(pol / "poblacio_abp.csv")
        pob = dict(zip(pa["clau"], pa["poblacio"]))
        g = json.loads((pol / "abp.geojson").read_text(encoding="utf-8"))
        claus = [f["properties"]["clau"] for f in g["features"]]

        def calcula(x, p):
            if not p:
                return {}
            tot = x["coneguts"].sum()
            d = {"fets": r(tot / p * 1000, 1), "resolts": r(x["resolts"].sum() / tot * 100, 1) if tot else None,
                 "detencions": r(x["detencions"].sum() / p * 1000, 2)}
            for k, pats in TITOLS.items():
                m = x["titol"].astype(str).apply(lambda t: any(q.lower() in t.lower() for q in pats))
                d[k] = r(x.loc[m, "coneguts"].sum() / p * 1000, 2 if k == "sexual" else 1)
            return d

        for c in claus:
            res["abp"][c] = calcula(fp[fp["clau"] == c], pob.get(c))
        cat = calcula(fp, sum(v for v in pob.values() if v == v))
        gi_claus = [c for c in claus if c != "osona"]
        gi = calcula(fp[fp["clau"].isin(gi_claus)], sum(pob.get(c) or 0 for c in gi_claus))
        for k in cat:
            refs.setdefault(k, {}).update({"cat": cat[k], "gi": gi.get(k)})
            anys[k] = ult
        # Municipios de Girona de cada ABP (para el panel)
        noms = {}
        try:
            rel = pd.read_csv(pol / "municipis_abp.csv", dtype=str)
            t = territorio()
            nom_ine = dict(zip(t["codi_ine"], t["nom"]))
            for _, f in rel.iterrows():
                ine = str(f["CODI_MUNICIPI"]).zfill(6)[:5]
                if ine in nom_ine:
                    noms.setdefault(str(f["CODI_ABP_MOSSOS"]).lstrip("0"), set()).add(nom_ine[ine])
        except Exception as e:  # noqa: BLE001
            print("AVISO municipios ABP:", e)
        for f in g["features"]:
            pr_ = f["properties"]
            ms = sorted(noms.get(str(pr_["codi"]).split(".")[0].lstrip("0"), []))
            f["properties"] = {"id": pr_["clau"], "nom": "ABP " + pr_["nom"],
                               "munis": f"{len(ms)} municipis: " + ", ".join(ms[:12]) + ("…" if len(ms) > 12 else "") if ms else ""}
        (SALIDA.parent / "abp.geojson").write_text(json.dumps(g, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    return res, refs, anys


# ---------------------------------------------------------------------------
# Valores de referencia: Cataluña (Idescat EMEX) y España / Girona (INE)

def referencias():
    refs = {}
    ref = P / "referencies"
    if (ref / "ine_renta.json").exists():
        ine = json.loads((ref / "ine_renta.json").read_text(encoding="utf-8"))
        series = [x for v in ine.values() for x in v]
        def busca(zona, texto):
            for x in series:
                if x["serie"].startswith(zona + ".") and texto in x["serie"] and ("Total." in x["serie"] or "Hombres" not in x["serie"] and "Mujeres" not in x["serie"]):
                    return x["valor"]
            return None
        mapa = {"renda": "Renta neta media por persona", "renda_llar": "Renta neta media por hogar",
                "pobresa": "debajo 60% de la mediana", "pobresa_sev": "debajo 40% de la mediana",
                "alts": "encima 200% de la mediana", "salari": "Fuente de ingreso: salario",
                "pensio": "Fuente de ingreso: pensiones", "prest_atur": "prestaciones por desempleo"}
        for k, txt in mapa.items():
            refs[k] = {z: busca(n, txt) for z, n in (("gi", "Girona"), ("cat", "Cataluña"), ("esp", "Total Nacional"))}
    if (ref / "emex_catalunya.json").exists():
        e = {x["id"]: x for x in json.loads((ref / "emex_catalunya.json").read_text(encoding="utf-8"))}
        def c(fid):
            try:
                return float(e[fid]["cat"])
            except (KeyError, TypeError, ValueError):
                return None
        def q(a, b, m=100):
            return round(a / b * m, 1) if a is not None and b else None
        pob = c("f321")
        cat = {
            "lloguer": c("f407"), "estrangers": q(c("f184"), c("f263")),
            "majors65": q((c("f28") or 0) + (c("f29") or 0), c("f171")),
            "natalitat": c("f330"), "mortalitat": c("f331"), "unipersonals": q(c("f98"), c("f107")),
            "atur": q(c("f308"), pob), "ocupats": q(c("f377"), pob), "ocupats_dones": q(c("f379"), c("f377")),
            "pensions": q(c("f375"), pob), "cotxes": q(c("f19"), pob, 1000), "selectiva": c("f368"),
            "participacio": c("f149"), "irpf": c("f10"),
        }
        for k, v in cat.items():
            if v is not None:
                refs.setdefault(k, {})["cat"] = v
    return {k: {z: x for z, x in v.items() if x is not None} for k, v in refs.items()}


def main():
    t = territorio()
    pob, etca = poblacion()
    alq = alquiler()
    cv = compraventas()
    cv_nova = compraventas("34010240")
    cv_usada = compraventas("34010250")
    cv_prot = compraventas("34010230")
    renta_p = atlas("31016.csv.gz", "Renta neta media por persona")
    renta_h = atlas("31016.csv.gz", "Renta neta media por hogar")
    gini = atlas("37697.csv.gz", "Índice de Gini")
    hu = hut()
    cat = catastro()
    extra_mun, _, anys_extra = atlas_extra()
    viv_mun = {i: cat.loc[i, "viviendas"] for i in cat.index}
    xi, anys_xi = xifra_indicadores(pob, viv_mun)
    for ine, x in xi.items():
        extra_mun.setdefault(ine, {}).update(x)
    anys_extra.update(anys_xi)
    ge, anys_ge = generalitat_indicadores(pob)
    for ine, x in ge.items():
        extra_mun.setdefault(ine, {}).update(x)
    anys_extra.update(anys_ge)
    pol, anys_pol = politica()
    for ine, x in indicadores_politica(pol).items():
        extra_mun.setdefault(ine, {}).update(x)
    anys_extra.update(anys_pol)

    municipios = []
    for _, m in t.iterrows():
        ine = m["codi_ine"]
        a = alq[alq["ine"] == ine]
        serie_alq = {int(k): r(v, 1) for k, v in zip(a["any"], a["renda"]) if not pd.isna(v)}
        viv = cat.loc[ine, "viviendas"] if ine in cat.index else None
        municipios.append({
            "ine": ine, "nom": m["nom"], "comarca": m["nom_comarca"],
            "poblacion": r(pob.get(ine)), "poblacion_etca": r(etca.get(ine)),
            "alquiler": serie_alq,
            "contratos": {int(k): r(v) for k, v in zip(a["any"], a["contratos"]) if not pd.isna(v)},
            "compraventas": cv.get(ine, {}),
            "cv_nova": cv_nova.get(ine, {}),
            "cv_usada": cv_usada.get(ine, {}),
            "cv_protegida": cv_prot.get(ine, {}),
            "renta_persona": {k: r(v) for k, v in renta_p.get(ine, {}).items()},
            "renta_hogar": {k: r(v) for k, v in renta_h.get(ine, {}).items()},
            "gini": {k: r(v, 1) for k, v in gini.get(ine, {}).items()},
            "hut": int(hu.get(ine, 0)),
            "viviendas": r(viv),
            "anyo_mediano": r(cat.loc[ine, "anyo_mediano"]) if ine in cat.index else None,
            "viv_antes_1980": r(cat.loc[ine, "viv_antes_1980"]) if ine in cat.index else None,
            "edificis": r(cat.loc[ine, "edificios"]) if ine in cat.index and "edificios" in cat.columns else None,
            "x": extra_mun.get(ine, {}),
            "pol": pol.get(ine, {}),
        })

    # Provincia: alquiler medio ponderado por contratos, compraventas sumadas, renta ponderada por población
    prov_alq = {}
    for a, g in alq.dropna(subset=["renda", "contratos"]).groupby("any"):
        prov_alq[int(a)] = round(float((g["renda"] * g["contratos"]).sum() / g["contratos"].sum()), 1)
    prov_cv = {}
    for m in municipios:
        for a, v in m["compraventas"].items():
            prov_cv[a] = prov_cv.get(a, 0) + v
    prov_renta = {}
    for a in sorted({a for m in municipios for a in m["renta_persona"]}):
        pares = [(m["renta_persona"][a], m["poblacion"]) for m in municipios if a in m["renta_persona"] and m["poblacion"]]
        prov_renta[a] = r(sum(v * p for v, p in pares) / sum(p for _, p in pares))
    SALIDA.parent.mkdir(parents=True, exist_ok=True)
    zones, refs_arees, anys_arees = arees()
    anys_extra.update(anys_arees)
    refs = referencias()
    for k, v in refs_arees.items():
        refs.setdefault(k, {}).update(v)
    if prov_alq:
        refs.setdefault("lloguer", {})["gi"] = prov_alq[max(prov_alq)]
    datos = {
        "generado": dt.date.today().isoformat(),
        "arees": zones, "ref": refs,
        "anys": anys_extra,
        "provincia": {
            "poblacion": sum(m["poblacion"] or 0 for m in municipios),
            "alquiler": prov_alq, "compraventas": prov_cv, "renta_persona": prov_renta,
            "hut": sum(m["hut"] for m in municipios),
            "viviendas": sum(m["viviendas"] or 0 for m in municipios),
            "viv_antes_1980": sum(m["viv_antes_1980"] or 0 for m in municipios),
        },
        "municipios": municipios,
    }
    def ordena(o):
        if isinstance(o, dict):
            if o and all(isinstance(k, int) for k in o):
                return {str(k): o[k] for k in sorted(o)}
            return {k: ordena(v) for k, v in o.items()}
        if isinstance(o, list):
            return [ordena(x) for x in o]
        return o

    datos = ordena(datos)
    SALIDA.parent.mkdir(parents=True, exist_ok=True)
    SALIDA.write_text(json.dumps(datos, ensure_ascii=False, separators=(",", ":"), allow_nan=False), encoding="utf-8")
    print(f"{SALIDA}: {SALIDA.stat().st_size // 1024} KB, {len(municipios)} municipios")
    sec = secciones()
    (SALIDA.parent / "seccions.json").write_text(json.dumps(sec, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"seccions.json: {len(sec)} secciones")
    import shutil
    for nombre in ("municipis.geojson", "seccions.geojson"):
        origen = P / "geo" / nombre
        if origen.exists():
            shutil.copy(origen, SALIDA.parent / nombre)
            print(f"{nombre}: {origen.stat().st_size // 1024} KB")
        else:
            print(f"AVISO: falta {origen}")


if __name__ == "__main__":
    main()
