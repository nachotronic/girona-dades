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


# ---------------------------------------------------------------------------
# La provincia: series generales del INE (Girona, Cataluña, España)

def _punts(d, desde=None):
    """[[año, FK_Periodo, valor]] -> [[x, etiqueta, valor]] ordenado."""
    res = []
    for a, fk, v in d:
        if v is None or a is None:
            continue
        if 1 <= fk <= 12:
            x, et = a + (fk - 1) / 12, f"{a}-{fk:02d}"
        elif 19 <= fk <= 22:
            x, et = a + (fk - 19) / 4, f"{a}T{fk - 18}"
        else:
            x, et = a, str(a)
        if desde is None or x >= desde:
            res.append([round(x, 4), et, v])
    return sorted(res)


def provincia_series():
    f = P / "provincia" / "ine_series.json"
    if not f.exists():
        return {}
    d = json.loads(f.read_text(encoding="utf-8"))

    def serie(tabla, *claus, zona):
        for s_ in d.get(tabla, {}).get("series", []):
            n = s_["nom"]
            if n.startswith(zona) and all(c in n for c in claus):
                return s_["d"]
        return []

    def index(punts, base):
        b = next((v for x, _, v in punts if x == base), None)
        return [[x, e, round(v / b * 100, 1)] for x, e, v in punts if x >= base] if b else []

    res = {}
    # 1. Inflación
    res["ipc"] = {"tipus": "linia", "u": "%", "dec": 1, "series": {
        "gi": _punts(serie("76143", "Índice general", "Variación anual", zona="Girona"), 2016),
        "cat": _punts(serie("76140", "Índice general", "Variación anual", zona="Cataluña"), 2016),
        "esp": _punts(serie("76134", "Índice general", "Variación anual", zona="Nacional"), 2016)}}
    # 2. Paro EPA
    res["paro"] = {"tipus": "linia", "u": "%", "dec": 1, "series": {
        "gi": _punts(serie("65349", "Tasa de paro", "Ambos sexos", zona="Tasa de paro de la población. Girona"), 2008),
        "cat": _punts(serie("65335", "Cataluña", "Ambos sexos. Total", zona="Tasa de paro"), 2008),
        "esp": _punts(serie("65349", "Tasa de paro", "Ambos sexos", "Total Nacional", zona="Tasa de paro"), 2008)}}
    # 3. IPC por grupos, último año
    grups = []
    for s_ in d.get("76154", {}).get("series", []):
        n = s_["nom"]
        if n.startswith("Girona.") and "Variación anual" in n and "Índice general" not in n:
            g = n.split(".")[1].strip()
            esp = serie("76154", f" {g}.", "Variación anual", zona="Total Nacional")
            pg, pe = _punts(s_["d"]), _punts(esp)
            if pg and pe:
                grups.append({"g": g, "gi": pg[-1][2], "esp": pe[-1][2], "any": pg[-1][1]})
    res["ipc_grups"] = {"tipus": "barres", "u": "%", "dec": 1, "grups": sorted(grups, key=lambda x: -x["gi"])}
    # 4. Compraventas de vivienda (índice 2007 = 100)
    cv = {z: _punts(serie("6155", "General", "Compraventa", zona=n)) for z, n in (("gi", "Girona"), ("cat", "Cataluña"), ("esp", "Total Nacional"))}
    res["compra"] = {"tipus": "linia", "u": "idx", "dec": 0, "base": 2007, "abs": {z: v[-1][2] for z, v in cv.items() if v},
                     "any": cv["gi"][-1][1] if cv["gi"] else None,
                     "series": {z: index(v, 2007) for z, v in cv.items()}}
    # 5. Turismo: % de pernoctaciones de residentes en el extranjero (años completos)
    def anual(dd, minim=12):
        tot = {}
        for a, fk, v in dd:
            if v is not None and 1 <= fk <= 12:
                tot.setdefault(a, [0, 0]); tot[a][0] += v; tot[a][1] += 1
        return {a: t for a, (t, n) in tot.items() if n >= minim}
    tur = {}
    for z, n, tt in (("gi", "Girona", "Pernoctaciones. Total."), ("cat", "Cataluña", "Pernoctaciones. Total."), ("esp", "Nacional", "Pernoctaciones. Total categorías. Total.")):
        tot = anual(serie("2074", tt, zona=n))
        ext = anual(serie("2074", "Pernoctaciones", "Residentes en el extranjero", zona=n))
        tur[z] = sorted([[a, str(a), round(ext[a] / tot[a] * 100, 1)] for a in tot if a in ext and tot[a] and a >= 2005])
        if z == "gi" and tot:
            res["pernoct_total"] = {"any": max(tot), "v": tot[max(tot)]}
    res["turisme"] = {"tipus": "linia", "u": "%", "dec": 0, "series": tur}
    # 6. Ejecuciones hipotecarias de viviendas (índice 2014 = 100)
    eh = {z: _punts(serie("10744", "General", zona=n)) for z, n in (("gi", "Girona"), ("esp", "Total Nacional"))}
    res["execucions"] = {"tipus": "linia", "u": "idx", "dec": 0, "base": 2014, "abs": {z: v[-1][2] for z, v in eh.items() if v},
                         "any": eh["gi"][-1][1] if eh["gi"] else None, "series": {z: index(v, 2014) for z, v in eh.items()}}
    # 7. Sociedades mercantiles constituidas (índice 2007 = 100)
    so = {z: _punts(serie("6454", "Mercantiles", "Número de Sociedades", zona=n)) for z, n in (("gi", "Girona"), ("cat", "Cataluña"), ("esp", "Total Nacional"))}
    res["societats"] = {"tipus": "linia", "u": "idx", "dec": 0, "base": 2007, "abs": {z: v[-1][2] for z, v in so.items() if v},
                        "any": so["gi"][-1][1] if so["gi"] else None, "series": {z: index(v, 2007) for z, v in so.items()}}
    # 8. Hipotecas sobre viviendas: número anual (índice 2007 = 100) e importe medio
    def anys_complets(dd):
        return {a: t for a, t in anual(dd).items()}
    hn = {z: anys_complets(serie("76317", "Viviendas. Número de hipotecas", zona="Viviendas. Número de hipotecas. " + n)) for z, n in (("gi", "Girona"), ("esp", "Total Nacional"))}
    hi = {z: anys_complets(serie("76317", "Viviendas. Importe de hipotecas", zona="Viviendas. Importe de hipotecas. " + n)) for z, n in (("gi", "Girona"), ("esp", "Total Nacional"))}
    if hn["gi"]:
        ser = {z: sorted([[a, str(a), v] for a, v in hn[z].items()]) for z in hn}
        ug = max(hn["gi"])
        res["hipoteques"] = {"tipus": "linia", "u": "idx", "dec": 0, "base": 2007, "abs": {z: hn[z].get(ug) for z in hn}, "any": ug,
                             "series": {z: index(v, 2007) for z, v in ser.items()}}
        res["hipoteca_mitjana"] = {"tipus": "linia", "u": "€", "dec": 0, "series": {
            z: sorted([[a, str(a), round(hi[z][a] * 1000 / hn[z][a])] for a in hn[z] if a in hi[z] and hn[z][a]]) for z in hn}}
    # 9. Defunciones por causa (capítulos CIE-10), último año: % sobre el total
    def cap(nom):
        m = re.search(r"(?:Todas las edades\. )?([IVX]+(?:-[IVX]+)?)\.([^.]+?)\. Total", nom)
        return (m.group(1), m.group(2).strip()) if m else (None, None)
    def defs(zona_ok):
        out = {}
        for s_ in d.get("73035", {}).get("series", []):
            n = s_["nom"]
            if zona_ok(n) and "Todas las edades" in n and "Hombres" not in n and "Mujeres" not in n:
                c, nom = cap(n)
                pts = [x for x in s_["d"] if x[2] is not None]
                if c and pts:
                    out[c] = (nom, {a: v for a, _, v in pts})
        return out
    dg = defs(lambda n: n.startswith("Girona."))
    de = defs(lambda n: "Total Nacional" in n and not n.startswith("Girona"))
    if "I-XXII" in dg and "I-XXII" in de:
        a = max(set(dg["I-XXII"][1]) & set(de["I-XXII"][1]))
        tg, te = dg["I-XXII"][1][a], de["I-XXII"][1][a]
        grups = [{"g": nom, "c": c, "gi": round(100 * v[a] / tg, 1), "esp": round(100 * de[c][1].get(a, 0) / te, 1), "n": v[a], "any": a}
                 for c, (nom, v) in dg.items() if c != "I-XXII" and c in de and a in v]
        grups = sorted(grups, key=lambda x: -x["gi"])
        res["causes"] = {"tipus": "barres", "u": "%", "dec": 1, "total": tg, "any": a, "grups": [g for g in grups if g["gi"] >= 1]}
    # 10. Pernoctaciones hoteleras por destino (millones, años completos)
    zs = {"gi": ("2039", "Costa Brava"), "cat": ("2078", "17095-Lloret de Mar"), "esp": ("2039", "Pirineus-Prepirineus")}
    dest = {}
    for z, (t, nom) in zs.items():
        tot = {}
        for s_ in d.get(t, {}).get("series", []):
            if nom in s_["nom"] and "Pernoctaciones" in s_["nom"]:
                # Lloret cierra hoteles en invierno: el INE no da esos meses
                for a, v in anual(s_["d"], 12 if z != "cat" else 7).items():
                    tot[a] = tot.get(a, 0) + v
        dest[z] = sorted([[a, str(a), round(v / 1e6, 2)] for a, v in tot.items() if 2005 <= a < dt.date.today().year])
    res["destins"] = {"tipus": "linia", "u": "M", "dec": 1, "noms": "destins", "series": dest}
    return res


# ---------------------------------------------------------------------------
# Idescat EMEX: indicadores municipales adicionales (con el valor de Cataluña)

def emex_indicadores():
    f = P / "emex" / "emex_municipis.csv.gz"
    if not f.exists():
        return {}, {}, {}
    e = pd.read_csv(f, dtype={"ine": str, "id": str, "any": str})
    for c in ("mun", "cat"):
        e[c] = pd.to_numeric(e[c], errors="coerce")
    e = e.drop_duplicates(["ine", "id"])
    mun = e.pivot(index="ine", columns="id", values="mun")
    cat = e.drop_duplicates("id").set_index("id")["cat"]
    anys_id = e.drop_duplicates("id").set_index("id")["any"].astype(str).str.extract(r"(\d{4})")[0]

    def col(df, k):
        return df[k] if k in df else pd.Series(dtype=float)

    def q(a, b, mult=100):
        return a / b.where(b > 0) * mult

    defs = {  # clave -> (función sobre un "df" de columnas fXX, id de referencia para el año)
        "educ_sup": (lambda d: col(d, "f389"), "f389"),
        "educ_prim": (lambda d: col(d, "f386"), "f386"),
        "nascuts_estr": (lambda d: q(col(d, "f73"), col(d, "f74")), "f73"),
        "ist": (lambda d: col(d, "f385"), "f385"),
        "rfdb": (lambda d: col(d, "f7"), "f7"),
        "pib_hab": (lambda d: col(d, "f3"), "f3"),
        "segones": (lambda d: 100 - col(d, "f399"), "f399"),
        "lloguer_pct": (lambda d: col(d, "f401"), "f401"),
        "petits": (lambda d: q(col(d, "f402").fillna(0) + col(d, "f403").fillna(0), col(d, "f193")), "f402"),
        "grans": (lambda d: q(col(d, "f192"), col(d, "f193")), "f192"),
        "monoparentals": (lambda d: q(col(d, "f113"), col(d, "f115")), "f113"),
        "iniciats": (lambda d: q(col(d, "f14"), col(d, "f321"), 1000), "f14"),
        "places_tur": (lambda d: q(col(d, "f216").fillna(0) + col(d, "f218").fillna(0) + col(d, "f220").fillna(0), col(d, "f321"), 1000), "f216"),
        "residus": (lambda d: col(d, "f366"), "f366"),
        "pensio_mitjana": (lambda d: col(d, "f376"), "f376"),
        "part_parlament": (lambda d: col(d, "f254"), "f254"),
        "part_congres": (lambda d: col(d, "f255"), "f255"),
        "creixement": (lambda d: col(d, "f53"), "f53"),
        "immigracio": (lambda d: q(col(d, "f372"), col(d, "f321"), 1000), "f372"),
        "densitat": (lambda d: col(d, "f262"), "f262"),
        "sau": (lambda d: q(col(d, "f345"), col(d, "f271") * 100), "f345"),
        "esports": (lambda d: q(col(d, "f300"), col(d, "f321"), 1000), "f300"),
        "motos": (lambda d: q(col(d, "f325"), col(d, "f321"), 1000), "f325"),
        "enten_cat": (lambda d: q(col(d, "f91"), col(d, "f96")), "f91"),
    }
    catdf = pd.DataFrame([cat.to_dict()])
    res, refs, anys = {}, {}, {}
    for k, (fn, rid) in defs.items():
        try:
            s_ = fn(mun)
            c_ = fn(catdf)
        except Exception as ex:  # noqa: BLE001
            print("AVISO emex", k, ex)
            continue
        for ine, v in s_.items():
            if v == v and v is not None and math.isfinite(v):
                res.setdefault(ine, {})[k] = round(float(v), 1)
        if len(c_) and c_.iloc[0] == c_.iloc[0]:
            refs[k] = {"cat": round(float(c_.iloc[0]), 1)}
        a = anys_id.get(rid)
        if isinstance(a, str):
            anys[k] = int(a)
    return res, refs, anys



# ---------------------------------------------------------------------------
# Educació: Departament d'Educació (matrícula, centros, preinscripción) y Censo 2021 (INE)

def _curs_ini(c):
    m = re.match(r"(\d{4})", str(c))
    return int(m.group(1)) if m else None


def educacio_indicadores(pob):
    """Devuelve (por municipio, por sección, refs, años)."""
    d = P / "educacio"
    res, sec, refs, anys = {}, {}, {}, {}
    if not d.exists():
        return res, sec, refs, anys
    put = lambda ine, k, v, dec=1: res.setdefault(ine, {}).__setitem__(k, round(float(v), dec)) if v == v and v is not None and math.isfinite(float(v)) else None  # noqa: E731
    # Censo 2021 por sección: estudios superiores y población que cursa estudios superiores
    f = d / "censo2021_seccions.csv"
    if f.exists():
        c = pd.read_csv(f, dtype={"seccion": str, "ine": str})
        c["pes"] = c["t1_1"] * (1 - c["t4_1"])
        c = c[c["t9_1"].notna() & c["pes"].notna()]
        for _, x in c.iterrows():
            o = {k: round(float(x[t]) * 100, 1) for k, t in (("edu_sup21", "t9_1"), ("edu_cursant", "t7_1")) if x[t] == x[t]}
            if o:
                sec[x["seccion"]] = o
        for ine, g in c.groupby("ine"):
            put(ine, "edu_sup21", (g["t9_1"] * g["pes"]).sum() / g["pes"].sum() * 100)
            put(ine, "edu_cursant", (g["t7_1"] * g["pes"]).sum() / g["pes"].sum() * 100)
        anys.update({"edu_sup21": 2021, "edu_cursant": 2021})
        fr = d / "censo2021_refs.json"
        if fr.exists():
            rj = json.loads(fr.read_text())
            refs["edu_sup21"] = {z: round(rj[z]["t9_1"] * 100, 1) for z in ("gi", "cat", "esp") if z in rj}
            refs["edu_cursant"] = {z: round(rj[z]["t7_1"] * 100, 1) for z in ("gi", "cat", "esp") if z in rj}
    # Matrícula del último curso
    f = d / "matricula.csv.gz"
    if f.exists():
        m = pd.read_csv(f, dtype=str)
        for k in ("alumnes", "grups"):
            m[k] = pd.to_numeric(m[k], errors="coerce").fillna(0)
        curs = _curs_ini(m["curs"].iloc[0])
        m["gi"] = m["codi_municipi_5"].astype(str).str.startswith("17")
        base = m["nom_estudis"].isin(["EDUCACIÓ INFANTIL", "EDUCACIÓ PRIMÀRIA", "EDUCACIÓ SECUNDÀRIA OBLIGATÒRIA", "BATXILLERAT"]) & ~m["nom_ensenyament"].str.contains("LLAR D'INFANTS")
        llar = m["nom_ensenyament"].str.contains("LLAR D'INFANTS")

        def ind(g):
            o = {}
            b = g[base.loc[g.index]]
            if b["alumnes"].sum() >= 500:
                o["edu_publica"] = 100 * b.loc[b["nom_naturalesa"] == "Públic", "alumnes"].sum() / b["alumnes"].sum()
            for k, est in (("edu_ratio_pri", "EDUCACIÓ PRIMÀRIA"), ("edu_ratio_eso", "EDUCACIÓ SECUNDÀRIA OBLIGATÒRIA")):
                e = g[(g["nom_estudis"] == est)]
                if e["grups"].sum() > 0:
                    o[k] = e["alumnes"].sum() / e["grups"].sum()
            o["edu_alumnes"] = g.loc[base.loc[g.index] | llar.loc[g.index], "alumnes"].sum()
            o["edu_llar"] = g.loc[llar.loc[g.index], "alumnes"].sum()
            return o
        for ine, g in m[m["gi"]].groupby("codi_municipi_5"):
            for k, v in ind(g).items():
                put(ine, k, v, 0 if k in ("edu_alumnes", "edu_llar") else 1)
        cat_o, gi_o = ind(m), ind(m[m["gi"]])
        for k in ("edu_publica", "edu_ratio_pri", "edu_ratio_eso"):
            if k in cat_o:
                refs[k] = {"cat": round(cat_o[k], 1), "gi": round(gi_o[k], 1)}
        refs["edu_alumnes"] = {"gi": int(gi_o["edu_alumnes"])}
        for k in ("edu_publica", "edu_ratio_pri", "edu_ratio_eso", "edu_alumnes"):
            anys[k] = curs
        # Escolarización 0-3 aproximada: alumnos de llar d'infants / (3 × nacimientos del último año)
        e = P / "emex" / "emex_municipis.csv.gz"
        if e.exists():
            em = pd.read_csv(e, dtype={"ine": str, "id": str})
            nx = em[em["id"] == "f187"].drop_duplicates("ine")
            nx_m = dict(zip(nx["ine"], pd.to_numeric(nx["mun"], errors="coerce")))
            nx_cat = pd.to_numeric(nx["cat"], errors="coerce").dropna()
            for ine, x in res.items():
                n = nx_m.get(ine)
                if n and n >= 5 and "edu_llar" in x:
                    put(ine, "edu_0_3", min(100.0, 100 * x["edu_llar"] / (3 * n)))
                elif n and n >= 5:
                    put(ine, "edu_0_3", 0.0)
            if len(nx_cat) and cat_o.get("edu_llar"):
                refs["edu_0_3"] = {"cat": round(100 * cat_o["edu_llar"] / (3 * nx_cat.iloc[0]), 1)}
                ng = sum(v for v in nx_m.values() if v == v)
                if ng:
                    refs["edu_0_3"]["gi"] = round(100 * gi_o["edu_llar"] / (3 * ng), 1)
            anys["edu_0_3"] = curs
            f381 = em[em["id"] == "f381"].drop_duplicates("ine")
            for ine, v in zip(f381["ine"], pd.to_numeric(f381["mun"], errors="coerce")):
                put(ine, "edu_mateix", v)
            cv = pd.to_numeric(f381["cat"], errors="coerce").dropna()
            if len(cv):
                refs["edu_mateix"] = {"cat": round(float(cv.iloc[0]), 1)}
            anys["edu_mateix"] = curs - 1 if curs else None
    # Centros docentes del último curso
    f = d / "centres.csv"
    if f.exists():
        c = pd.read_csv(f, dtype=str)
        for ine, g in c.groupby("codi_municipi"):
            put(ine, "edu_centres", len(g), 0)
        refs["edu_centres"] = {"gi": len(c)}
        anys["edu_centres"] = _curs_ini(c["curs"].iloc[0])
    # Preinscripción: % de plazas asignadas en la primera petición (P3, 1.º de primaria y 1.º de ESO)
    f = d / "preinscripcio.csv.gz"
    if f.exists():
        p_ = pd.read_csv(f, dtype=str)
        for k in ("assig", "primera"):
            p_[k] = pd.to_numeric(p_[k], errors="coerce").fillna(0)
        p_["c"] = p_["curs"].map(_curs_ini)
        ult = p_["c"].max()
        p_ = p_[p_["c"] == ult]
        for ine, g in p_[p_["codi_municipi_5"].str.startswith("17")].groupby("codi_municipi_5"):
            if g["assig"].sum() >= 5:
                put(ine, "edu_primera", 100 * g["primera"].sum() / g["assig"].sum())
        pg = p_[p_["codi_municipi_5"].str.startswith("17")]
        refs["edu_primera"] = {"cat": round(100 * p_["primera"].sum() / p_["assig"].sum(), 1),
                               "gi": round(100 * pg["primera"].sum() / pg["assig"].sum(), 1)}
        anys["edu_primera"] = int(ult)
    for x in res.values():
        x.pop("edu_llar", None)
    return res, sec, refs, anys


def educacio_series():
    """Series provinciales: competencias básicas y alumnado en centros públicos (Girona vs Cataluña)."""
    d = P / "educacio"
    out = {}
    noms = {"pcat": "Català", "pcast": "Castellà", "pang": "Anglès", "pmat": "Matemàtiques", "pcien": "Ciències"}
    for nom, f in (("4eso", "avaluacio_4eso.csv"), ("6e", "avaluacio_6e.csv")):
        if not (d / f).exists():
            continue
        a = pd.read_csv(d / f)
        a = a[a["area_territorial"].isin(["Girona", "CATALUNYA"])]
        core = [c for c in ("pcat", "pcast", "pang", "pmat") if c in a.columns]
        a["mitjana"] = a[core].mean(axis=1)
        ser = {}
        for z, area in (("gi", "Girona"), ("cat", "CATALUNYA")):
            g = a[a["area_territorial"] == area].sort_values("any")
            ser[z] = [[int(x), str(int(x)), round(float(v), 1)] for x, v in zip(g["any"], g["mitjana"]) if v == v]
        out[f"comp_{nom}"] = {"tipus": "linia", "u": "pt", "dec": 1, "series": ser}
        ult = int(a["any"].max())
        u = a[a["any"] == ult].set_index("area_territorial")
        grups = [{"g": noms[c], "c": c, "gi": round(float(u.loc["Girona", c]), 1), "cat": round(float(u.loc["CATALUNYA", c]), 1), "any": ult}
                 for c in noms if c in u.columns and u.loc[["Girona", "CATALUNYA"], c].notna().all()]
        out[f"comp_{nom}_mat"] = {"tipus": "barres", "u": "pt", "dec": 1, "claus": ["gi", "cat"], "any": ult, "grups": grups}
    f = d / "matricula_historic.csv"
    if f.exists():
        h = pd.read_csv(f)
        h = h[~h["nom_ensenyament"].astype(str).str.contains("LLAR D'INFANTS|IDIOMES|ANGLÈS|FRANCÈS|ALEMANY", regex=True)]
        ser, tot = {}, {}
        for z, filt in (("gi", h["gi"] == True), ("cat", pd.Series(True, index=h.index))):  # noqa: E712
            g = h[filt].groupby(["curs", "nom_naturalesa"])["alumnes"].sum().unstack(fill_value=0)
            g["pct"] = 100 * g.get("Públic", 0) / g.sum(axis=1)
            ser[z] = [[_curs_ini(c), str(c), round(float(v), 1)] for c, v in g["pct"].items()]
            if z == "gi":
                tot = {"curs": str(g.index[-1]), "n": int(g.drop(columns="pct").iloc[-1].sum())}
        out["edu_publica_prov"] = {"tipus": "linia", "u": "%", "dec": 1, "series": ser, "abs": tot}
    return out


def universitaris_indicadores(pob):
    """Dónde estudian los universitarios residentes en cada municipio (Idescat, emouniv)."""
    d = P / "educacio"
    res, refs, anys = {}, {}, {}
    f = d / "univ_municipis.csv"
    if not f.exists():
        return res, refs, anys
    u = pd.read_csv(f, dtype={"Codi": str})
    u.columns = ["codi", "nom", "mateix", "comarca", "fora", "total"]
    for c in ("mateix", "comarca", "fora", "total"):
        u[c] = pd.to_numeric(u[c], errors="coerce")
    u["ine"] = u["codi"].str[:5]
    for _, x in u.iterrows():
        o = {"univ_n": int(x["total"])} if x["total"] == x["total"] else {}
        p_ = pob.get(x["ine"])
        if p_ and x["total"] == x["total"]:
            o["edu_univ"] = round(1000 * x["total"] / p_, 1)
        if x["total"] >= 20:
            o["edu_univ_fora"] = round(100 * x["fora"] / x["total"], 1)
            o["univ_split"] = [int(x["mateix"]), int(x["comarca"]), int(x["fora"])]
        res[x["ine"]] = o
    tot = u[["mateix", "comarca", "fora", "total"]].sum()
    refs["edu_univ_fora"] = {"gi": round(100 * tot["fora"] / tot["total"], 1)}
    refs["edu_univ"] = {"gi": round(1000 * tot["total"] / sum(v for v in pob.values() if v == v), 1)}
    fc = d / "univ_cat_desti.csv"
    if fc.exists():
        c = pd.read_csv(fc).iloc[0]
        refs["edu_univ_fora"]["cat"] = round(100 * float(c.iloc[3]) / float(c.iloc[4]), 1)
    curs = None
    fr = d / "univ_prov_desti.csv"
    if fr.exists():
        curs = _curs_ini(str(pd.read_csv(fr).iloc[0, 0]).replace("Curs ", ""))
    anys.update({"edu_univ_fora": curs, "edu_univ": f"{curs}/{str(curs + 1)[2:]}" if curs else None})
    return res, refs, anys


def universitaris_series():
    """Serie provincial: % de universitarios residentes que estudian fuera de la provincia y % de plazas ocupadas por no residentes."""
    f = P / "educacio" / "univ_prov_residents.csv"
    if not f.exists():
        return {}
    t = pd.read_csv(f).set_index("Unnamed: 0")
    t = t.apply(lambda c: pd.to_numeric(c, errors="coerce"))
    fora, res_ = t.loc["Residents que estudien a fora de la província"], t.loc["Alumnes residents (2)"]
    nores, llocs = t.loc["No residents que estudien a la província"], t.loc["Llocs d'estudi localitzats (1)"]
    med = res_.median()
    ser = {"gi": [], "cat": []}
    for c in reversed(t.columns):
        if not (res_[c] > 0.7 * med):  # 2018/19 viene incompleto
            continue
        ini = _curs_ini(c.replace("Curs ", ""))
        ser["gi"].append([ini, c.replace("Curs ", ""), round(100 * fora[c] / res_[c], 1)])
        ser["cat"].append([ini, c.replace("Curs ", ""), round(100 * nores[c] / llocs[c], 1)])
    ult = t.columns[0]
    return {"univ_fora_prov": {"tipus": "linia", "u": "%", "dec": 1, "series": ser, "noms": "univ",
                               "abs": {"curs": ult.replace("Curs ", ""), "residents": int(res_[ult]), "fora": int(fora[ult]), "nores": int(nores[ult]), "llocs": int(llocs[ult])}}}


INE_ISO = {"Alemania": "DE", "Bulgaria": "BG", "Francia": "FR", "Italia": "IT", "Polonia": "PL", "Portugal": "PT", "Rumanía": "RO",
           "Reino Unido": "GB", "Rusia": "RU", "Ucrania": "UA", "Argelia": "DZ", "Marruecos": "MA", "Nigeria": "NG", "Senegal": "SN",
           "Argentina": "AR", "Bolivia": "BO", "Brasil": "BR", "Chile": "CL", "Colombia": "CO", "Cuba": "CU", "Ecuador": "EC",
           "Paraguay": "PY", "Perú": "PE", "República Dominicana": "DO", "Uruguay": "UY", "Venezuela": "VE", "China": "CN", "Pakistán": "PK"}


def nacionalitat_indicadores(pob):
    """Extranjeros por nacionalidad.
    - Mapa (todos los municipios): INE, padrón 2022, principales nacionalidades (las demás van agrupadas).
    - Ficha: Idescat, censo anual (165 países) en los municipios grandes; padrón 2022 del INE en el resto.
    - Infantes extranjeros (0-15): INE, padrón 2022.
    Devuelve (x por municipio, nac por municipio, paisos, ordre, refs, anys, series prov)."""
    d = P / "nacionalitat"
    res, nac, refs, anys, prov = {}, {}, {}, {}, {}
    f = d / "nacionalitats.csv.gz"
    if not f.exists():
        return res, nac, {}, [], refs, anys, prov
    col = "Nacionalidad (principales nacionalidades)"
    n = pd.read_csv(f, dtype={"ine": str})
    ult_ine = int(n["any"].max())
    n = n[n["any"] == ult_ine]
    tot = n[n[col] == "Extranjera"].set_index("ine")["valor"]
    pais = n[n[col].isin(INE_ISO)].copy()
    pais["c"] = pais[col].map(INE_ISO)
    pais = pais[pais["valor"] > 0]
    tops = {}
    for ine, g in pais.groupby("ine"):
        g = g.sort_values("valor", ascending=False)
        ex = tot.get(ine)
        if ex and ex == ex:
            nac[ine] = {"any": ult_ine, "ex": int(ex), "font": "ine", "p": [[c, int(v)] for c, v in zip(g["c"].head(10), g["valor"].head(10))]}
        if ex and ex >= 20 and len(g):
            c0, v0 = g.iloc[0]["c"], g.iloc[0]["valor"]
            res.setdefault(ine, {}).update({"nac_top": c0, "nac_top_pct": round(100 * v0 / ex, 1), "nac_top_n": int(v0), "nac_ex": int(ex)})
            tops[c0] = tops.get(c0, 0) + 1
    anys["nac"] = ult_ine
    prov_ine = pais.groupby("c")["valor"].sum().sort_values(ascending=False)
    ordre = sorted(tops, key=lambda c: (-tops[c], -prov_ine.get(c, 0)))
    # Pes de les principals nacionalitats sobre la població (padró 2022)
    tot_pob = n[n[col] == "Total"].set_index("ine")["valor"]
    principals = list(prov_ine.head(6).index)
    for ine, g in pais[pais["c"].isin(principals)].groupby("ine"):
        p_ = tot_pob.get(ine)
        if p_:
            for c, v in zip(g["c"], g["valor"]):
                res.setdefault(ine, {})[f"nac_{c}"] = round(100 * v / p_, 2)
    for c in principals:
        refs[f"nac_{c}"] = {"gi": round(100 * prov_ine[c] / tot_pob.sum(), 2)}
        anys[f"nac_{c}"] = ult_ine
    # Infants estrangers (0-15) — aproximació a l'alumnat estranger
    fe = d / "edat_nacionalitat.csv.gz"
    if fe.exists():
        e = pd.read_csv(fe, dtype={"ine": str})
        e = e[(e["any"] == e["any"].max()) & (e["Edad (grandes grupos)"] == "Menos de 16 años")].pivot_table(index="ine", columns="Nacionalidad", values="valor", aggfunc="sum")
        for ine, x in e.iterrows():
            if x.get("Total", 0) >= 30:
                res.setdefault(ine, {})["edu_estr16"] = round(100 * x["Extranjera"] / x["Total"], 1)
        refs["edu_estr16"] = {"gi": round(100 * e["Extranjera"].sum() / e["Total"].sum(), 1)}
        anys["edu_estr16"] = int(pd.read_csv(fe, usecols=["any"])["any"].max())
    # Idescat: detalle completo de países (municipios grandes, provincia y Cataluña)
    lab = {}
    fi = d / "idescat_paisos.csv.gz"
    if fi.exists():
        lab = json.loads((d / "idescat_paisos_etiquetes.json").read_text()).get("COUNTRY_G", {})
        i = pd.read_csv(fi, dtype=str, keep_default_na=False, na_values=[""])
        i = i[(i["SEX"] == "TOTAL")]
        i["valor"] = pd.to_numeric(i["valor"], errors="coerce")
        ult = i["YEAR"].max()
        i = i[i["YEAR"] == ult]
        iso = i[i["COUNTRY_G"].str.len() == 2]
        for m, g in iso.groupby("MUN"):
            t_ = i[(i["MUN"] == m) & (i["COUNTRY_G"] == "TOTAL")]["valor"]
            if not len(t_):
                continue
            g = g[g["valor"] > 0].sort_values("valor", ascending=False)
            blk = {"any": int(ult), "ex": int(t_.iloc[0]), "font": "idescat", "p": [[c, int(v)] for c, v in zip(g["COUNTRY_G"].head(10), g["valor"].head(10))]}
            if m[:1].isdigit():
                nac[m[:5]] = blk
            elif m in ("P17", "P170000", "CAT") or m.startswith("P17"):
                prov["gi" if m.startswith("P17") else "cat"] = blk
        if "gi" in prov:
            blk = prov.pop("gi")
            cat_blk = prov.pop("cat", None)
            catd = dict(cat_blk["p"]) if cat_blk else {}
            catx = cat_blk["ex"] if cat_blk else None
            gi_all = iso[iso["MUN"].str.startswith("P17")].sort_values("valor", ascending=False).head(12)
            cat_all = iso[iso["MUN"] == "CAT"].set_index("COUNTRY_G")["valor"]
            prov["nac_prov"] = {"tipus": "barres", "u": "%", "dec": 1, "claus": ["gi", "cat"] if catx else ["gi"], "any": int(ult), "total": blk["ex"],
                                "grups": [{"g": c, "c": "pais:" + c, "gi": round(100 * float(v) / blk["ex"], 1),
                                           **({"cat": round(100 * float(cat_all.get(c, 0)) / catx, 1)} if catx else {})}
                                          for c, v in zip(gi_all["COUNTRY_G"], gi_all["valor"])]}
            prov.pop("cat", None)
    usats = set(ordre) | set(principals) | {c for x in nac.values() for c, _ in x["p"]} | {g["c"][5:] for g in prov.get("nac_prov", {}).get("grups", [])}
    noms_es = {k: v for k, v in INE_ISO.items()}
    inv = {v: k for k, v in noms_es.items()}
    paisos = {c: (lab.get(c) if isinstance(lab.get(c), list) else [lab.get(c, inv.get(c, c)), inv.get(c, lab.get(c, c))]) for c in usats}
    neteja = lambda x: re.sub(r",\s*(el|la|els|les|l')$", "", str(x)).strip()  # noqa: E731
    paisos = {c: [neteja(v[0]), neteja(v[1])] for c, v in paisos.items()}
    return res, nac, paisos, ordre, refs, anys, prov


# ---------------------------------------------------------------------------
# Emergències: divisiones de Agents Rurals y Bombers (Idescat), actuaciones de Bombers e incendios forestales

GRUPS_URGENTS = ("incendi urbà", "incendi vegetació", "salvaments", "assistència tècnica", "fuites perilloses",
                 "mobilitat", "altres urgents", "suport tècnic")


def emergencies_indicadores(pob):
    """Devuelve (x por municipio, refs, anys, datos por área básica de Agents Rurals)."""
    d = P / "emergencies"
    if not (d / "municipis_arees.csv").exists():
        return {}, {}, {}, {}
    res, refs, anys, zona = {}, {}, {}, {}
    rel = pd.read_csv(d / "municipis_arees.csv", dtype=str)
    rel = rel[rel["ine"].str.startswith("17")]
    for _, f in rel.iterrows():
        x = res.setdefault(f["ine"], {})
        x["aar"], x["arr"] = f["aar_nom"], f["arr_nom"]
        x["reb"] = f"{f['reb_nom']} ({f['reb_acron']})" if isinstance(f.get("reb_acron"), str) else f["reb_nom"]
    aar_de = dict(zip(rel["ine"], rel["aar_codi"]))
    sup = pd.read_csv(d / "superficie_municipis.csv", dtype={"ine": str}).set_index("ine")["ha"]
    # Cataluña: población y superficie (Idescat EMEX)
    cat_ha = None
    ef = P / "referencies" / "emex_catalunya.json"
    if ef.exists():
        e = {x["id"]: x for x in json.loads(ef.read_text(encoding="utf-8"))}
        try:
            cat_ha = float(e["f271"]["cat"]) * 100  # km² -> ha
        except (KeyError, TypeError, ValueError):
            pass
    pob_aar = {}
    for ine, c in aar_de.items():
        pob_aar[c] = pob_aar.get(c, 0) + (pob.get(ine) or 0)
    sup_aar = {}
    for ine, c in aar_de.items():
        sup_aar[c] = sup_aar.get(c, 0) + float(sup.get(ine, 0))

    def poner(k, por_ine, por_aar, cat, any_, dec=1):
        for ine, v in por_ine.items():
            if ine in res and v is not None and math.isfinite(v):
                res[ine][k] = round(float(v), dec)
        for c, v in por_aar.items():
            if v is not None and math.isfinite(v):
                zona.setdefault(c, {})[k] = round(float(v), dec)
        tot_gi = None
        if k in GI_TOT:
            tot_gi = GI_TOT[k]
        if cat is not None or tot_gi is not None:
            refs[k] = {kk: round(float(vv), dec) for kk, vv in (("cat", cat), ("gi", tot_gi)) if vv is not None}
        anys[k] = any_

    GI_TOT = {}
    # Actuaciones de Bombers: último año completo
    fa = d / "actuacions_bombers.csv.gz"
    if fa.exists():
        a = pd.read_csv(fa, dtype={"codi_ine": str})
        a["n"] = pd.to_numeric(a["n"], errors="coerce").fillna(0)
        a["any"] = pd.to_numeric(a["any"], errors="coerce")
        lim = pd.read_csv(d / "actuacions_bombers_anys.csv")
        complets = lim[lim["fi"].astype(str).str[5:10] >= "12-15"]["any"]
        ult = int(complets.max())
        a = a[(a["any"] == ult) & a["codi_ine"].notna()]
        a["ine"] = a["codi_ine"].str.zfill(5).str[:5]
        a = a[a["tga_nom_grupo"].isin(GRUPS_URGENTS)]
        defs = {"bombers": GRUPS_URGENTS, "bomb_inc_urba": ("incendi urbà",), "bomb_inc_veg": ("incendi vegetació",),
                "bomb_salvaments": ("salvaments",), "bomb_mobilitat": ("mobilitat",)}
        gi_pob = sum(v or 0 for k_, v in pob.items() if k_.startswith("17"))
        for k, grups in defs.items():
            x = a[a["tga_nom_grupo"].isin(grups)]
            n = x.groupby("ine")["n"].sum()
            por_ine = {ine: n.get(ine, 0) / p * 1000 for ine, p in pob.items() if ine in res and p}
            n_aar = {}
            for ine, v in n.items():
                if ine in aar_de:
                    n_aar[aar_de[ine]] = n_aar.get(aar_de[ine], 0) + v
            por_aar = {c: n_aar.get(c, 0) / p * 1000 for c, p in pob_aar.items() if p}
            GI_TOT[k] = n[n.index.str.startswith("17")].sum() / gi_pob * 1000 if gi_pob else None
            # Sin referencia de Cataluña: la ciudad de Barcelona tiene su propio cuerpo de bomberos
            poner(k, por_ine, por_aar, None, ult, 2 if k != "bombers" else 1)

    # Incendios forestales (municipio de inicio)
    fi = d / "incendis_forestals.csv.gz"
    if fi.exists():
        inc = pd.read_csv(fi, dtype={"codi_municipi": str})
        inc["ine"] = inc["codi_municipi"].str.zfill(6).str[:5]
        inc["ha"] = pd.to_numeric(inc["haforestal"], errors="coerce").fillna(0) + pd.to_numeric(inc["hanoforest"], errors="coerce").fillna(0)
        a0, a1 = int(inc["any"].min()), int(inc["any"].max())
        per = f"{a0}-{a1}"
        n = inc.groupby("ine").size()
        ha = inc.groupby("ine")["ha"].sum()
        gi = [ine for ine in res]
        n_aar, ha_aar = {}, {}
        for ine in gi:
            c = aar_de.get(ine)
            n_aar[c] = n_aar.get(c, 0) + int(n.get(ine, 0))
            ha_aar[c] = ha_aar.get(c, 0) + float(ha.get(ine, 0))
        anys_n = a1 - a0 + 1
        # Incendios por año y 10.000 ha de término (para comparar municipios de tamaño distinto)
        GI_TOT["inc_forestals"] = sum(int(n.get(i, 0)) for i in gi) / anys_n / (sum(float(sup.get(i, 0)) for i in gi) / 10_000)
        poner("inc_forestals", {i: n.get(i, 0) / anys_n / (sup[i] / 10_000) for i in gi if sup.get(i)},
              {c: n_aar[c] / anys_n / (sup_aar[c] / 10_000) for c in n_aar if sup_aar.get(c)},
              len(inc) / anys_n / (cat_ha / 10_000) if cat_ha else None, per, 2)
        GI_TOT["ha_cremades"] = sum(float(ha.get(i, 0)) for i in gi) / sum(float(sup.get(i, 0)) for i in gi) * 100
        poner("ha_cremades", {i: ha.get(i, 0) / sup[i] * 100 for i in gi if sup.get(i)},
              {c: ha_aar[c] / sup_aar[c] * 100 for c in ha_aar if sup_aar.get(c)},
              inc["ha"].sum() / cat_ha * 100 if cat_ha else None, per, 2)
        for i in gi:
            res[i]["inc_n"] = int(n.get(i, 0))
            res[i]["inc_ha"] = round(float(ha.get(i, 0)), 1)
        GI_TOT.pop("inc_forestals"); GI_TOT.pop("ha_cremades", None)
    return res, refs, anys, zona


def zona_aar(zona):
    """Copia las áreas básicas de Agents Rurals a web/datos con nombre y municipios."""
    g_ = P / "emergencies" / "aar.geojson"
    if not g_.exists():
        return
    g = json.loads(g_.read_text(encoding="utf-8"))
    rel = pd.read_csv(P / "emergencies" / "municipis_arees.csv", dtype=str)
    rel = rel[rel["ine"].str.startswith("17")]
    t = territorio()
    nom_ine = dict(zip(t["codi_ine"], t["nom"]))
    for f in g["features"]:
        p = f["properties"]
        ms = sorted(nom_ine.get(i, i) for i in rel[rel["aar_codi"] == p["aar_codi"]]["ine"])
        f["properties"] = {"id": p["aar_codi"], "nom": p["aar_nom"],
                           "munis": f"{len(ms)} municipis · àrea regional {p['arr_nom']}: " + ", ".join(ms[:12]) + ("…" if len(ms) > 12 else "")}
    (SALIDA.parent / "aar.geojson").write_text(json.dumps(g, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")


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
    em, refs_emex, anys_em = emex_indicadores()
    for ine, x in em.items():
        extra_mun.setdefault(ine, {}).update(x)
    anys_extra.update(anys_em)
    ed, ed_sec, refs_ed, anys_ed = educacio_indicadores(pob)
    for ine, x in ed.items():
        extra_mun.setdefault(ine, {}).update(x)
    anys_extra.update(anys_ed)
    un, refs_un, anys_un = universitaris_indicadores(pob)
    for ine, x in un.items():
        extra_mun.setdefault(ine, {}).update(x)
    anys_extra.update(anys_un)
    refs_ed.update(refs_un)
    nx, nac_mun, paisos, paisos_ordre, refs_nac, anys_nac, prov_nac = nacionalitat_indicadores(pob)
    for ine, x in nx.items():
        extra_mun.setdefault(ine, {}).update(x)
    anys_extra.update(anys_nac)
    refs_ed.update(refs_nac)
    emx, refs_emx, anys_emx, zona_emx = emergencies_indicadores(pob)
    for ine, x in emx.items():
        extra_mun.setdefault(ine, {}).update(x)
    anys_extra.update(anys_emx)
    refs_ed.update(refs_emx)
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
            **({"nac": nac_mun[ine]} if ine in nac_mun else {}),
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
    zones["aar"] = zona_emx
    zona_aar(zona_emx)
    anys_extra.update(anys_arees)
    refs = referencias()
    for k, v in refs_emex.items():
        refs.setdefault(k, {}).update(v)
    for k, v in refs_ed.items():
        refs.setdefault(k, {}).update(v)
    for k, v in refs_arees.items():
        refs.setdefault(k, {}).update(v)
    if prov_alq:
        refs.setdefault("lloguer", {})["gi"] = prov_alq[max(prov_alq)]
    datos = {
        "generado": dt.date.today().isoformat(),
        "arees": zones, "ref": refs, "prov": {**provincia_series(), **educacio_series(), **universitaris_series(), **prov_nac}, "paisos": paisos, "paisos_ordre": paisos_ordre,
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
    for cusec, x in ed_sec.items():
        sec.setdefault(cusec, {}).update(x)
    (SALIDA.parent / "seccions.json").write_text(json.dumps(sec, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"seccions.json: {len(sec)} secciones")
    # Coyuntura (mensual y trimestral), en un fichero aparte
    import conjuntura_web
    emex = pd.read_csv(P / "emex" / "emex_municipis.csv.gz", dtype=str)
    e27 = emex[emex["id"] == "f27"]
    pob1564 = dict(zip(e27["ine"].str.zfill(5), pd.to_numeric(e27["mun"], errors="coerce")))
    cj = conjuntura_web.construir(municipios, pob1564)
    cj["generado"] = datos["generado"]
    # Población de Cataluña (total y de 15 a 64 años) para las tasas de referencia
    cat = lambda f: pd.to_numeric(emex[emex["id"] == f]["cat"].str.replace("_", ""), errors="coerce").dropna()
    if len(cat("f27")) and len(cat("f321")):
        cj["pob_cat"] = {"p1564": int(cat("f27").iloc[0]), "pob": int(cat("f321").iloc[0])}
    (SALIDA.parent / "conjuntura.json").write_text(json.dumps(cj, ensure_ascii=False, separators=(",", ":"), allow_nan=False), encoding="utf-8")
    print(f"conjuntura.json: {(SALIDA.parent / 'conjuntura.json').stat().st_size // 1024} KB, {len(cj['per']['m'])} meses, {len(cj['per']['t'])} trimestres")
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
