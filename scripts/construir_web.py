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


def estat_fonts() -> dict:
    """Última descarga correcta y estado de cada fuente (data/estado.json, lo escribe scripts/actualizar.py)."""
    try:
        e = json.loads((RAIZ / "data" / "estado.json").read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return {}
    res = {k: {"estat": v.get("estat"), "ok": v.get("ok")} for k, v in e.items()}
    # Fuentes que se cargan a mano (no las ejecuta scripts/actualizar.py): fecha de la última carga
    fm = P / "esca" / "esca_meta.json"
    if fm.exists():
        m = json.loads(fm.read_text(encoding="utf-8"))
        res["esca"] = {"estat": "manual", "ok": m.get("carregat"), "edicio": m.get("edicio")}
    fm = P / "sem" / "sem_meta.json"
    if fm.exists():
        m = json.loads(fm.read_text(encoding="utf-8"))
        res["sem"] = {"estat": "manual", "ok": m.get("carregat")}
    return res


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
    rb = atlas_secciones("31016.csv.gz", "Renta bruta media por persona")
    md = atlas_secciones("31016.csv.gz", "Mediana de la renta por unidad de consumo")
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
            "renta_bruta": r(rb.get(cusec)), "renta_mediana": r(md.get(cusec)),
            "viviendas": r(float(f["viviendas"])) if f is not None else None,
            "viv_antes_1980": r(float(f["viv_antes_1980"])) if f is not None else None,
            "viv_post_2000": r(float(f["viv_post_2000"])) if f is not None else None,
            "anyo_mediano": r(float(f["anyo_mediano"])) if f is not None and not pd.isna(f["anyo_mediano"]) else None,
            "edificis": r(float(f["edificios"])) if f is not None and "edificios" in f else None,
        }
    for clau, k in (("cad_vm2", "vm"), ("cad_sm2", "sm")):
        _, dis, _, _ = cad_districtes(k)
        for cusec in list(res):
            if cusec[:7] in dis:
                res[cusec][clau] = dis[cusec[:7]]
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
    "pobresa_esp": ("31023.csv.gz", {3: "Total", 4: "Española", 5: "Población con ingresos por unidad de consumo por debajo 60% de la mediana"}, 1),
    "pobresa_ext": ("31023.csv.gz", {3: "Total", 4: "Extranjera", 5: "Población con ingresos por unidad de consumo por debajo 60% de la mediana"}, 1),
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
    """Renta garantizada y recogida selectiva por municipio (el autoconsumo va en solar())."""
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


def _dins(x, y, geom):
    """Punto dentro de un (Multi)Polygon GeoJSON, por paridad de cruces."""
    polis = geom["coordinates"] if geom["type"] == "MultiPolygon" else [geom["coordinates"]]
    for poli in polis:
        dins = False
        for anell in poli:
            for (x1, y1), (x2, y2) in zip(anell, anell[1:] + anell[:1]):
                if (y1 > y) != (y2 > y) and x < (x2 - x1) * (y - y1) / (y2 - y1) + x1:
                    dins = not dins
        if dins:
            return True
    return False


def _codis_abs(sal):
    f = sal / "abs.geojson"
    if not f.exists():
        return []
    return [str(x["properties"]["codi"]) for x in json.loads(f.read_text(encoding="utf-8"))["features"]]


def _pob_rs(sal):
    """Población oficial del último año por región sanitaria."""
    f = sal / "poblacio_rs.csv"
    if not f.exists():
        return {}
    p = pd.read_csv(f, dtype={"rs_codi": str})
    p = p[p["any"] == p["any"].max()]
    return {str(k): float(v) for k, v in zip(p["rs_codi"], p["p"]) if v == v}


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
    # Población asignada y estructura por edad (Registre central de població del CatSalut)
    pob_abs = {}
    if (sal / "poblacio_abs.csv").exists():
        pa = pd.read_csv(sal / "poblacio_abs.csv", dtype={"codi_abs": str})
        pob_abs = dict(zip(pa["codi_abs"], pa["poblacio"]))
        gi = pa[pa["codi_abs"].isin(set(res["abs"]) | set(_codis_abs(sal)))]
        for _, f in gi.iterrows():
            o = res["abs"].setdefault(f["codi_abs"], {})
            o["pob_abs"] = int(f["poblacio"])
            for k in ("pct_65", "pct_80", "pct_0_14"):
                if k in f and f[k] == f[k]:
                    o["abs_" + k] = r(f[k], 1)
        if "pct_65" in pa:
            for z, x in (("gi", gi), ("cat", pa)):
                tot = x["poblacio"].sum()
                for k in ("pct_65", "pct_80", "pct_0_14"):
                    refs.setdefault("abs_" + k, {})[z] = r((x[k] * x["poblacio"]).sum() / tot, 1)
            refs["pob_abs"] = {"gi": int(gi["poblacio"].sum())}
            anys.update({k: int(pa["any"].iloc[0]) for k in ("pob_abs", "abs_pct_65", "abs_pct_80", "abs_pct_0_14")})
    # Infecciones atendidas en primaria: últimas 4 semanas, por 1.000 habitantes de la ABS
    fi = sal / "infeccions_abs.csv"
    if fi.exists() and pob_abs:
        inf = pd.read_csv(fi, dtype={"codi_abs": str})
        setm = sorted(inf["data_inici"].unique())[-4:]
        inf = inf[inf["data_inici"].isin(setm)]
        grups = {"inf_resp": None, "inf_grip": ["Grip"], "inf_covid": ["COVID-19"]}
        resp = ["Altres IRA", "Bronquiolitis", "COVID-19", "Grip", "Pneumònia"]
        for k, dg in grups.items():
            x = inf[inf["diagnostic"].isin(dg or resp)].groupby("codi_abs")["casos"].sum()
            mult = 1000 if k == "inf_resp" else 100000
            for c_, v in x.items():
                if pob_abs.get(c_):
                    res["abs"].setdefault(c_, {})[k] = r(v / pob_abs[c_] * mult, 1 if mult == 1000 else 0)
            tot = sum(pob_abs.get(c_, 0) for c_ in x.index)
            if tot:
                refs.setdefault(k, {})["gi"] = r(x.sum() / tot * mult, 1 if mult == 1000 else 0)
            d0, d1 = pd.Timestamp(setm[0]), pd.Timestamp(setm[-1]) + pd.Timedelta(days=6)
            anys[k] = f"{d0.day}/{d0.month}–{d1.day}/{d1.month}/{d1.year}"
        fr = sal / "infeccions_rs.csv"
        if fr.exists():
            rs = pd.read_csv(fr, dtype={"rs": str})
            rs = rs[rs["data_inici"].isin(setm)]
            pr = _pob_rs(sal)
            ptot = sum(pr.values())
            for k, dg in grups.items():
                mult = 1000 if k == "inf_resp" else 100000
                v = rs[rs["diagnostic"].isin(dg or resp)]["casos"].sum()
                if ptot:
                    refs.setdefault(k, {})["cat"] = r(v / ptot * mult, 1 if mult == 1000 else 0)
    if (sal / "centres.geojson").exists():
        cg = json.loads((sal / "centres.geojson").read_text(encoding="utf-8"))
        per_abs = {}
        # Asignación de cada centro a su ABS por contención del punto (sin dependencias geográficas)
        ga = json.loads((sal / "abs.geojson").read_text(encoding="utf-8")) if (sal / "abs.geojson").exists() else {"features": []}
        for f in cg["features"]:
            x, y = f["geometry"]["coordinates"]
            c_ = next((str(a["properties"]["codi"]) for a in ga["features"] if _dins(x, y, a["geometry"])), None)
            if c_:
                per_abs.setdefault(c_, {}).setdefault(f["properties"]["t"], 0)
                per_abs[c_][f["properties"]["t"]] += 1
        for c_, d in per_abs.items():
            if c_ in res["abs"]:
                res["abs"][c_]["cap_n"] = d.get("cap", 0) + d.get("continuada", 0)
    if (sal / "abs.geojson").exists():
        g = json.loads((sal / "abs.geojson").read_text(encoding="utf-8"))
        for f in g["features"]:
            f["properties"] = {"id": str(f["properties"]["codi"]), "nom": f["properties"]["nom"]}
        (SALIDA.parent / "abs.geojson").write_text(json.dumps(g, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")

    pol = P / "policia"
    if all((pol / n).exists() for n in ("fets_penals_abp.csv.gz", "abp.geojson", "poblacio_abp.csv")):
        # Últimos 12 meses (se renueva cada mes) y, si no está, el último año completo
        if (pol / "fets_12m_titol_abp.csv").exists():
            fp = pd.read_csv(pol / "fets_12m_titol_abp.csv", dtype={"desde": str, "fins": str})
            d0, d1 = fp["desde"].iloc[0], fp["fins"].iloc[0]
            ult = f"{d0[5:7]}/{d0[:4]}–{d1[5:7]}/{d1[:4]}"
        else:
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
    tg = "76141" if any(s_["nom"].startswith("Girona.") and "Variación anual" in s_["nom"] for s_ in d.get("76141", {}).get("series", [])) else "76154"
    for s_ in d.get(tg, {}).get("series", []):
        n = s_["nom"]
        if n.startswith("Girona.") and "Variación anual" in n and "Índice general" not in n:
            g = n.split(".")[1].strip()
            esp = serie(tg, f" {g}.", "Variación anual", zona="Total Nacional") or serie(tg, f" {g}.", "Variación anual", zona="Nacional")
            pg, pe = _punts(s_["d"]), _punts(esp)
            if pg and pe:
                grups.append({"g": g, "gi": pg[-1][2], "esp": pe[-1][2], "any": pg[-1][1]})
    res["ipc_grups"] = {"tipus": "barres", "u": "%", "dec": 1, "grups": sorted(grups, key=lambda x: -x["gi"])}
    # Series mensuales: suma de los últimos 12 meses, recalculada cada mes (así no hay que esperar al año completo
    # y no se ve la estacionalidad). El índice toma como base la suma de enero a diciembre del año base.
    def movil12(dd, minim=12, desde=None):
        mes = {(a, fk): v for a, fk, v in dd if v is not None and a is not None and 1 <= fk <= 12}
        if not mes:
            return []
        ini = min(a * 12 + fk - 1 for a, fk in mes)
        fi = max(a * 12 + fk - 1 for a, fk in mes)
        res = []
        for u in range(ini + 11, fi + 1):
            vs = [mes.get(((u - i) // 12, (u - i) % 12 + 1)) for i in range(12)]
            if vs[0] is None or sum(v is not None for v in vs) < minim:
                continue
            a, m = u // 12, u % 12 + 1
            if desde is None or a >= desde:
                res.append([round(a + (m - 1) / 12, 4), f"{a}-{m:02d}", sum(v for v in vs if v is not None)])
        return res

    def index_m(punts, base):
        b = next((v for _, e, v in punts if e == f"{base}-12"), None)
        return [[x, e, round(v / b * 100, 1)] for x, e, v in punts if x >= base + 11 / 12] if b else []

    def serie_m(clau, base, series, extra=None):
        sm = {z: movil12(v) for z, v in series.items()}
        g = sm.get("gi") or []
        res[clau] = {"tipus": "linia", "u": "idx", "dec": 0, "base": base, "m12": True,
                     "abs": {z: v[-1][2] for z, v in sm.items() if v}, "any": g[-1][1] if g else None,
                     "series": {z: index_m(v, base) for z, v in sm.items()}, **(extra or {})}
        return sm

    # 4. Compraventas de vivienda (suma de 12 meses, índice 2007 = 100)
    serie_m("compra", 2007, {z: serie("6150", "General", "Compraventa", zona=n + ".")
                             for z, n in (("gi", "Girona"), ("cat", "Cataluña"), ("esp", "Total Nacional"))})
    # 5. Turismo: % de pernoctaciones hoteleras de residentes en el extranjero (12 meses)
    def anual(dd, minim=12):
        tot = {}
        for a, fk, v in dd:
            if v is not None and 1 <= fk <= 12:
                tot.setdefault(a, [0, 0]); tot[a][0] += v; tot[a][1] += 1
        return {a: t for a, (t, n) in tot.items() if n >= minim}
    tur = {}
    for z, n, tt in (("gi", "Girona", "Pernoctaciones. Total."), ("cat", "Cataluña", "Pernoctaciones. Total."), ("esp", "Nacional", "Pernoctaciones. Total categorías. Total.")):
        tot = {e: v for _, e, v in movil12(serie("2074", tt, zona=n), desde=2005)}
        ext = movil12(serie("2074", "Pernoctaciones", "Residentes en el extranjero", zona=n), desde=2005)
        tur[z] = [[x, e, round(v / tot[e] * 100, 1)] for x, e, v in ext if tot.get(e)]
        if z == "gi" and tot:
            u = max(tot)
            res["pernoct_total"] = {"any": u, "v": tot[u], "m12": True}
    res["turisme"] = {"tipus": "linia", "u": "%", "dec": 0, "m12": True, "series": tur}
    # 6. Ejecuciones hipotecarias de viviendas (índice 2014 = 100). El INE solo las da por provincia una vez al año.
    eh = {z: _punts(serie("10744", "General", zona=n)) for z, n in (("gi", "Girona"), ("esp", "Total Nacional"))}
    res["execucions"] = {"tipus": "linia", "u": "idx", "dec": 0, "base": 2014, "abs": {z: v[-1][2] for z, v in eh.items() if v},
                         "any": eh["gi"][-1][1] if eh["gi"] else None, "series": {z: index(v, 2014) for z, v in eh.items()}}
    # 7. Sociedades mercantiles constituidas (suma de 12 meses, índice 2008 = 100: la serie mensual empieza en 2008)
    serie_m("societats", 2008, {
        "gi": serie("6295", "Mercantiles. Número de Sociedades", zona="Girona. Sociedades Constituídas"),
        "cat": serie("6295", "Mercantiles. Número de Sociedades", zona="Cataluña. Sociedades Constituídas"),
        "esp": serie("6295", "Total Nacional. Mercantiles", zona="Sociedades Constituídas. Número de Sociedades")})
    # 8. Hipotecas sobre viviendas: suma de 12 meses (índice 2007 = 100) e importe medio de los 12 meses
    hn = serie_m("hipoteques", 2007, {z: serie("76317", "Viviendas. Número de hipotecas", zona="Viviendas. Número de hipotecas. " + n)
                                      for z, n in (("gi", "Girona"), ("esp", "Total Nacional"))})
    hi = {z: {e: v for _, e, v in movil12(serie("76317", "Viviendas. Importe de hipotecas", zona="Viviendas. Importe de hipotecas. " + n))}
          for z, n in (("gi", "Girona"), ("esp", "Total Nacional"))}
    res["hipoteca_mitjana"] = {"tipus": "linia", "u": "€", "dec": 0, "m12": True, "series": {
        z: [[x, e, round(hi[z][e] * 1000 / v)] for x, e, v in hn[z] if e in hi[z] and v] for z in hn}}
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
        res["causes"] = {"tipus": "barres", "u": "%", "dec": 1, "nu": "def_n", "total": tg, "any": a, "grups": [g for g in grups if g["gi"] >= 1]}
    # 10. Pernoctaciones hoteleras por destino (millones, suma de 12 meses)
    zs = {"gi": ("2039", "Costa Brava"), "cat": ("2078", "17095-Lloret de Mar"), "esp": ("2039", "Pirineus-Prepirineus")}
    dest = {}
    for z, (t, nom) in zs.items():
        tot = {}
        for s_ in d.get(t, {}).get("series", []):
            if nom in s_["nom"] and "Pernoctaciones" in s_["nom"]:
                # Lloret cierra hoteles en invierno: el INE no da esos meses
                for x, et, v in movil12(s_["d"], 12 if z != "cat" else 7, desde=2005):
                    tot[(x, et)] = tot.get((x, et), 0) + v
        dest[z] = sorted([[x, et, round(v / 1e6, 2)] for (x, et), v in tot.items()])
    res["destins"] = {"tipus": "linia", "u": "M", "dec": 1, "noms": "destins", "m12": True, "series": dest}
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
# Indicadores complementarios (inventario de espanaendatos.es reconstruido con las fuentes
# originales): Xifra (Diputació), EMEX (Idescat), AEAT, INE.

def atur_detall():
    """Paro registrado por sexo y sector (SEPE, ficheros mensuales de la coyuntura): media anual de
    cada año completo, como el EMEX de Idescat. Los «<5» cuentan como 2,5. Solo municipios con 20
    parados o más de media. Devuelve ({ine: {clave: {año: %}}}, {clave: {año: {gi, cat, esp}}})."""
    import glob as _g
    d = P / "conjuntura"
    cols = {"atur_dones": ["d_25", "d_25_45", "d_45"], "atur_agri": ["agri"], "atur_ind": ["ind"], "atur_const": ["cons"],
            "atur_serv": ["serv"], "atur_nou": ["sense"]}

    def llegeix(patro):
        fs = sorted(_g.glob(str(d / patro)))
        if not fs:
            return pd.DataFrame()
        df = pd.concat([pd.read_csv(f, dtype=str) for f in fs])
        df["any"] = df["mes"].str[:4]
        # Solo años completos (o casi)
        n = df.groupby("any")["mes"].nunique()
        df = df[df["any"].isin(n[n >= 11].index)]  # 2020 no tiene diciembre
        for c in ["total"] + sum(cols.values(), []):
            df[c] = pd.to_numeric(df[c].replace("<5", "2.5"), errors="coerce")
        return df

    res, refs = {}, {}
    m = llegeix("sepe_paro_*.csv")
    if len(m):
        g = m.groupby(["ine", "any"]).mean(numeric_only=True).reset_index()
        for _, f in g.iterrows():
            if not f["total"] or f["total"] < 20:
                continue
            for k, cs in cols.items():
                v = sum(f[c] for c in cs) / f["total"] * 100
                if v == v:
                    res.setdefault(f["ine"], {}).setdefault(k, {})[f["any"]] = round(float(v), 1)
    t = llegeix("sepe_totals_paro_*.csv")
    if len(t):
        g = t.groupby(["ambit", "any"]).mean(numeric_only=True).reset_index()
        for _, f in g.iterrows():
            for k, cs in cols.items():
                if f["total"]:
                    refs.setdefault(k, {}).setdefault(f["any"], {})[f["ambit"]] = round(float(sum(f[c] for c in cs) / f["total"] * 100), 1)
    return res, refs


def complements_indicadores(pob):
    """Devuelve (x por municipio, refs, años, extra por municipio para la ficha)."""
    per = lambda v, p, k=100: None if v is None or not p else v / p * k  # noqa: E731
    res, anys, refs, fitxa = {}, {}, {}, {}

    def pon(clave, dades, f, dec=1, any_=None):
        for ine, vs in dades.items():
            try:
                v = f(ine, vs)
            except (TypeError, ZeroDivisionError, IndexError):
                v = None
            if v is not None and math.isfinite(v):
                res.setdefault(ine, {})[clave] = r(v, dec)
        if any_:
            anys[clave] = any_

    # Servicios (Xifra). El comercio viene del CECC (comerc())
    pon("bancs", _xifra("030516", [5]), lambda i, v: per(v[0], pob.get(i), 10000), 1, 2026)
    pon("biblio", _xifra("03030201", [7]), lambda i, v: per(v[0], pob.get(i), 10000), 1, 2024)
    pon("museus", _xifra("03030203", [3]), lambda i, v: v[0], 0, 2025)
    # Agricultura (censo agrario 2020)
    pon("explotacions", _xifra("03050801", [6]), lambda i, v: per(v[0], pob.get(i), 1000), 1, 2020)
    # Vivienda: certificados energéticos y políticas de vivienda
    ce = _xifra("03031202", [2, 3, 4, 5, 6, 7, 8, 9])
    pon("cert_ab", ce, lambda i, v: per((v[0] or 0) + (v[1] or 0), v[7]) if v[7] and v[7] >= 20 else None, 1, 2026)
    pon("cert_eg", ce, lambda i, v: per((v[4] or 0) + (v[5] or 0) + (v[6] or 0), v[7]) if v[7] and v[7] >= 20 else None, 0, 2026)
    hp = _xifra("030511", [2, 6])
    pon("hpo_sol", hp, lambda i, v: per(v[0], pob.get(i), 1000), 1, 2025)
    pon("ajuts_lloguer", hp, lambda i, v: per(v[1], pob.get(i), 1000), 1, 2025)
    # Emisiones de CO2 (2019): residencial, servicios, residuos, transporte e industria
    em = {k: _xifra(k, [-1]) for k in ("03030601", "03030602", "03030603", "03030604", "03030605")}
    tot = {}
    for k, d in em.items():
        for ine, v in d.items():
            if v and v[0] is not None:
                tot[ine] = tot.get(ine, 0) + v[0]
    pon("co2", {i: [v] for i, v in tot.items()}, lambda i, v: per(v[0], pob.get(i), 1), 1, 2019)
    pon("co2_transport", em["03030604"], lambda i, v: per(v[0], pob.get(i), 1), 1, 2019)
    pon("co2_residencial", em["03030601"], lambda i, v: per(v[0], pob.get(i), 1), 2, 2019)
    pon("gas", _xifra("03030501", [-1]), lambda i, v: per(v[0], pob.get(i), 1), 0, 2023)
    # Población: proyección a 2044 y residentes en el extranjero
    pon("proj2044", _xifra("030206", [5]), lambda i, v: (v[0] / pob[i] - 1) * 100 if pob.get(i) and v[0] else None, 1, 2044)
    pon("proj_65", _xifra("030206", [4, 5]), lambda i, v: per(v[0], v[1]), 0, 2044)
    # Hacienda municipal (Xifra)
    ibi = _xifra("03070504", [2, 3])
    pon("ibi_tipus", ibi, lambda i, v: v[1], 2, 2026)
    pon("ibi_revisio", ibi, lambda i, v: v[0], 0)
    pte = _xifra("03070507", [2, 7])
    pon("pte_hab", pte, lambda i, v: per(v[1], pob.get(i), 1), 0, 2024)
    pon("esforc_fiscal", pte, lambda i, v: v[0], 2, 2022)
    # EMEX (Idescat): IRPF 2024, mercado de trabajo del censo 2024, tamaño de empresa, migraciones
    f = P / "emex" / "emex_municipis.csv.gz"
    if f.exists():
        e = pd.read_csv(f, dtype={"ine": str, "id": str, "any": str})
        for c in ("mun", "cat"):
            e[c] = pd.to_numeric(e[c].astype(str).str.replace("_", ""), errors="coerce")
        e = e.drop_duplicates(["ine", "id"])
        mun = e.pivot(index="ine", columns="id", values="mun")
        cat = e.drop_duplicates("id").set_index("id")["cat"]
        anys_id = e.drop_duplicates("id").set_index("id")["any"].astype(str).str.extract(r"(\d{4})")[0]
        col = lambda d, k: d[k] if k in d else None  # noqa: E731

        def pc(a, b, mult=100, minim=0):
            """a / b × mult, solo si el denominador llega al mínimo (evita porcentajes de 1 sobre 2)."""
            return a / b.where(b >= max(minim, 1e-9)) * mult

        defs = {
            "irpf_quota": (lambda d: col(d, "f11"), "f11", 0),
            "taxa_atur": (lambda d: col(d, "f222") / col(d, "f223") * 100, "f222", 1),
            "taxa_activitat": (lambda d: col(d, "f223") / col(d, "f224") * 100, "f223", 1),
            "micro": (lambda d: col(d, "f225") / (col(d, "f225") + col(d, "f284") + col(d, "f390") + col(d, "f227")) * 100, "f225", 0),
            "gran_empresa": (lambda d: col(d, "f227") / (col(d, "f225") + col(d, "f284") + col(d, "f390") + col(d, "f227")) * 100, "f227", 1),
            "cera": (lambda d: col(d, "f336") / col(d, "f321") * 100, "f336", 1),
            "saldo_intern": (lambda d: col(d, "f324") / col(d, "f321") * 1000, "f324", 1),
            "ibi_rebut": (lambda d: col(d, "f200") / col(d, "f198"), "f200", 0),
            "furgonetes": (lambda d: col(d, "f272") / col(d, "f321") * 1000, "f272", 0),
            "piscines": (lambda d: col(d, "f301"), "f301", 0),
            # Resto de la ficha EMEX (2026-11-17): lo que la web aún no tenía
            "dones": (lambda d: pc(col(d, "f320"), col(d, "f321")), "f320", 1),
            "majors85": (lambda d: pc(col(d, "f29"), col(d, "f171")), "f29", 1),
            "nascuts_esp": (lambda d: pc(col(d, "f72"), col(d, "f74")), "f72", 1),
            "nascuts_cat": (lambda d: pc(col(d, "f69"), col(d, "f74")), "f69", 1),
            "creix_natural": (lambda d: col(d, "f54"), "f54", 1),
            "creix_migratori": (lambda d: col(d, "f55"), "f55", 1),
            "emigracio": (lambda d: pc(col(d, "f373"), col(d, "f321"), 1000), "f373", 1),
            "saldo_exterior": (lambda d: pc(col(d, "f372") - col(d, "f373"), col(d, "f321"), 1000), "f372", 1),
            "immig_ue": (lambda d: pc(col(d, "f314"), col(d, "f317"), 100, 10), "f314", 0),
            "matrimonis": (lambda d: pc(col(d, "f179"), col(d, "f321"), 1000), "f179", 1),
            "parelles_fills": (lambda d: pc(col(d, "f112"), col(d, "f115")), "f112", 1),
            "parelles_sense": (lambda d: pc(col(d, "f111"), col(d, "f115")), "f111", 1),
            "llars_5": (lambda d: pc(col(d, "f405"), col(d, "f107")), "f405", 1),
            "llegir_cat": (lambda d: pc(col(d, "f93"), col(d, "f96")), "f93", 0),
            "escriure_cat": (lambda d: pc(col(d, "f94"), col(d, "f96")), "f94", 0),
            "pensionistes_dones": (lambda d: pc(col(d, "f383"), col(d, "f384"), 100, 20), "f383", 0),
            "vab_agri": (lambda d: pc(col(d, "f194"), col(d, "f251")), "f194", 1),
            "vab_ind": (lambda d: pc(col(d, "f195"), col(d, "f251")), "f195", 1),
            "vab_const": (lambda d: pc(col(d, "f196"), col(d, "f251")), "f196", 1),
            "vab_serv": (lambda d: pc(col(d, "f197"), col(d, "f251")), "f197", 1),
            "pib": (lambda d: col(d, "f2"), "f2", 0),
            "propietat_pct": (lambda d: pc(col(d, "f126"), col(d, "f131")), "f126", 1),
            "cedits_pct": (lambda d: pc(col(d, "f130"), col(d, "f131")), "f130", 1),
            "hpo_iniciats": (lambda d: col(d, "f13"), "f13", 0),
            "altitud": (lambda d: col(d, "f258"), "f258", 0),
            "pavellons": (lambda d: col(d, "f293"), "f293", 0),
            "pistes_poli": (lambda d: col(d, "f294"), "f294", 0),
            "camps_esport": (lambda d: col(d, "f295"), "f295", 0),
            "sales_esport": (lambda d: col(d, "f296"), "f296", 0),
            "atletisme": (lambda d: col(d, "f302"), "f302", 0),
            "residus_ind": (lambda d: col(d, "f369"), "f369", 0),
            "residus_ind_est": (lambda d: col(d, "f371"), "f371", 0),
            # Censo agrario 2020: hectáreas por cultivo y cabezas de ganado
            "agr_vinya": (lambda d: col(d, "f349"), "f349", 0),
            "agr_olivera": (lambda d: col(d, "f348"), "f348", 0),
            "agr_cereal": (lambda d: col(d, "f391"), "f391", 0),
            "agr_farratge": (lambda d: col(d, "f392"), "f392", 0),
            "agr_herbacis": (lambda d: col(d, "f393"), "f393", 0),
            "agr_fruiters": (lambda d: col(d, "f347"), "f347", 0),
            "agr_llenyosos": (lambda d: col(d, "f350"), "f350", 0),
            "agr_hivernacle": (lambda d: col(d, "f394"), "f394", 1),
            "agr_horts": (lambda d: col(d, "f395"), "f395", 1),
            "agr_guarets": (lambda d: col(d, "f346"), "f346", 0),
            "agr_pastures": (lambda d: col(d, "f134"), "f134", 0),
            "agr_llaurades": (lambda d: col(d, "f351"), "f351", 0),
            "agr_sau_ha": (lambda d: col(d, "f345"), "f345", 0),
            "agr_expl_sau": (lambda d: col(d, "f396"), "f396", 0),
            "agr_expl_ram": (lambda d: col(d, "f397"), "f397", 0),
            "ram_porcs": (lambda d: col(d, "f144"), "f144", 0),
            "ram_porcs_hab": (lambda d: pc(col(d, "f144"), col(d, "f321"), 1), "f144", 1),
            "ram_bovins": (lambda d: col(d, "f141"), "f141", 0),
            "ram_ovins": (lambda d: col(d, "f142"), "f142", 0),
            "ram_cabres": (lambda d: col(d, "f252"), "f252", 0),
            "ram_aviram": (lambda d: col(d, "f145"), "f145", 0),
            "ram_conills": (lambda d: col(d, "f146"), "f146", 0),
            "ram_equins": (lambda d: col(d, "f147"), "f147", 0),
        }
        # Recuentos: el valor de Cataluña no se puede comparar con el de un municipio
        RECOMPTES = {"piscines", "pib", "hpo_iniciats", "altitud", "pavellons", "pistes_poli", "camps_esport", "sales_esport", "atletisme",
                     "residus_ind", "residus_ind_est"} | {k for k in defs if (k.startswith("agr_") or k.startswith("ram_")) and k != "ram_porcs_hab"}
        catdf = pd.DataFrame([cat.to_dict()])
        for k, (fn, rid, dec) in defs.items():
            try:
                s_, c_ = fn(mun), fn(catdf)
            except Exception as ex:  # noqa: BLE001
                print("AVISO complements", k, ex)
                continue
            if s_ is None:
                continue
            for ine, v in s_.items():
                if v == v and v is not None and math.isfinite(v):
                    res.setdefault(ine, {})[k] = round(float(v), dec)
            if c_ is not None and len(c_) and c_.iloc[0] == c_.iloc[0] and k not in RECOMPTES:
                refs[k] = {"cat": round(float(c_.iloc[0]), dec)}
            a = anys_id.get(rid)
            if isinstance(a, str):
                anys[k] = int(a)
    # Renta bruta y mediana (INE, Atlas de distribución de renta)
    for k, ind in (("renda_bruta", "Renta bruta media por persona"), ("renda_bruta_llar", "Renta bruta media por hogar"),
                   ("renda_mediana", "Mediana de la renta por unidad de consumo"), ("renda_uc", "Media de la renta por unidad de consumo")):
        s_ = atlas("31016.csv.gz", ind)
        for ine, d in s_.items():
            fitxa.setdefault(ine, {})[k] = {a: r(v) for a, v in d.items()}
    # IRPF por municipio (AEAT, municipios de más de 1.000 habitantes)
    fa = P / "aeat" / "irpf_municipios.csv"
    if fa.exists():
        a = pd.read_csv(fa, dtype={"ine": str, "any": str}).sort_values("any")  # el último año prevalece
        def c_(row, *noms):
            for n in noms:
                v = row.get(f"t0|{n}|1")
                if v == v and v is not None:
                    return float(v)
            return None
        for _, row in a.iterrows():
            ine = row["ine"]
            o = {
                "decl": c_(row, "NÚMERO DE DECLARACIONES"), "hab": c_(row, "NÚMERO DE HABITANTES"),
                "bruta": c_(row, "RENTA BRUTA MEDIA"), "disp": c_(row, "RENTA DISPONIBLE MEDIA"),
                "treball": c_(row, "RENTAS DEL TRABAJO"), "capital": c_(row, "RENTAS DEL CAPITAL MOBILIARIO"),
                "immobles": c_(row, "RENTAS DE BIENES INMUEBLES NO AFECTOS A ACTIV. ECONÓMICAS"),
                "activitats": c_(row, "RENTAS DE ACTIVIDADES ECONÓMICAS"), "guanys": c_(row, "GANANCIAS PATRIMONIALES NETAS"),
                "rb": c_(row, "RENTA BRUTA"), "quota": c_(row, "CUOTA RESULTANTE DE LA AUTOLIQUIDACIÓN"),
                "any": int(row["any"]),
            }
            if ine == "17":
                fitxa.setdefault("_prov", {})["aeat"] = o
                continue
            fitxa.setdefault(ine, {})["aeat"] = {k: (r(v) if isinstance(v, float) else v) for k, v in o.items() if v is not None}
            x = res.setdefault(ine, {})
            if o["bruta"]:
                x["aeat_bruta"] = r(o["bruta"])
            if o["disp"]:
                x["aeat_disp"] = r(o["disp"])
            hab = o["hab"] or pob.get(ine)
            if o["decl"] and hab:
                x["aeat_decl"] = r(o["decl"] / hab * 100, 1)
            if o["rb"] and o["quota"]:
                x["aeat_tipus"] = r(o["quota"] / o["rb"] * 100, 1)
            if o["rb"] and o["capital"] is not None and o["immobles"] is not None:
                x["aeat_capital"] = r((o["capital"] + o["immobles"] + (o["guanys"] or 0)) / o["rb"] * 100, 1)
            if o["rb"] and o["activitats"] is not None:
                x["aeat_activitats"] = r(o["activitats"] / o["rb"] * 100, 1)
        for k in ("aeat_bruta", "aeat_disp", "aeat_decl", "aeat_tipus", "aeat_capital", "aeat_activitats"):
            anys[k] = int(a["any"].max())
    # Serie de población (INE padrón: cifras oficiales; si no, Estadística del Padrón continuo)
    fp = P / "padro" / "poblacio_municipis.csv.gz"
    fn = P / "nacionalitat" / "edat_nacionalitat.csv.gz"
    if fp.exists():
        d = pd.read_csv(fp, dtype={"ine": str, "any": str})
        for ine, g in d.groupby("ine"):
            fitxa.setdefault(ine, {})["pob_s"] = {int(a): int(v) for a, v in zip(g["any"], g["valor"])}
    if fn.exists():
        d = pd.read_csv(fn, dtype=str)
        d = d[d["Edad (grandes grupos)"] == "Todas las edades"]
        d["valor"] = pd.to_numeric(d["valor"], errors="coerce")
        for (ine, nac), g in d.groupby(["ine", "Nacionalidad"]):
            k = {"Total": "pob_s", "Extranjera": "estr_s"}.get(nac)
            if not k:
                continue
            o = fitxa.setdefault(ine, {})
            if k == "pob_s" and "pob_s" in o:
                continue
            o[k] = {int(a): int(v) for a, v in zip(g["any"], g["valor"]) if v == v}
    return res, refs, anys, fitxa


def pressupostos(pob):
    """Liquidación de presupuestos municipales (Generalitat): por municipio, el último año con datos
    en €/habitante por capítulos, programas e ingresos tributarios, y la serie de ingresos y gastos."""
    f = P / "pressupostos" / "liquidacio.csv.gz"
    if not f.exists():
        return {}, {}, {}, {}, {}
    d = pd.read_csv(f, dtype=str)
    d["eh"] = pd.to_numeric(d["euros_habitant"], errors="coerce")
    d["imp"] = pd.to_numeric(d["import"], errors="coerce")
    d["any"] = d["any"].astype(int)
    doc = {"INGRESSOS": "ing", "DESPESES": "desp", "CLASSIFICACIÓ PER PROGRAMES": "prog", "PRINCIPALS INGRESSOS TRIBUTARIS": "trib"}
    d["k"] = d["nom_document"].map(doc)
    d = d.dropna(subset=["k", "eh"])
    noms = {k: dict(zip(g["codi_estructura"], g["desc_estructura"])) for k, g in d.sort_values("any").groupby("k")}
    fitxa, x, anys = {}, {}, {}
    for ine, g in d.groupby("ine"):
        tot = g[g["k"].isin(["ing", "desp"])].groupby(["any", "k"])["eh"].sum().unstack()
        tot = tot[(tot.get("ing", 0) > 0) & (tot.get("desp", 0) > 0)]
        if tot.empty:
            continue
        a = int(tot.index.max())
        u = g[g["any"] == a]
        o = {"any": a}
        for k in ("ing", "desp", "prog", "trib"):
            uu = u[u["k"] == k]
            o[k] = {c: r(v, 1) for c, v in zip(uu["codi_estructura"], uu["eh"])}
        o["serie"] = {"ing": {int(i): r(v) for i, v in tot["ing"].items()}, "desp": {int(i): r(v) for i, v in tot["desp"].items()}}
        fitxa[ine] = {"pres": o}
        ing, desp = sum(o["ing"].values()), sum(o["desp"].values())
        xx = x.setdefault(ine, {})
        xx["pres_ing"], xx["pres_desp"] = r(ing), r(desp)
        xx["pres_saldo"] = r(ing - desp)
        xx["pres_inv"] = r(o["desp"].get("6", 0))
        xx["pres_personal"] = r(o["desp"].get("1", 0) / desp * 100, 1) if desp else None
        xx["pres_transf"] = r((o["ing"].get("4", 0) + o["ing"].get("7", 0)) / ing * 100, 1) if ing else None
        xx["pres_social"] = r(o["prog"].get("2", 0))
        xx["pres_ibi"] = r(o["trib"].get("1102")) if o["trib"].get("1102") is not None else None
        xx["pres_taxes"] = r(o["trib"].get("3000")) if o["trib"].get("3000") is not None else None
        xx["pres_any"] = a
    a_max = int(d["any"].max())
    for k in ("pres_ing", "pres_desp", "pres_saldo", "pres_inv", "pres_personal", "pres_transf", "pres_social", "pres_ibi", "pres_taxes"):
        anys[k] = a_max
    # Media provincial ponderada (importes / habitantes) del último año
    u = d[d["any"] == a_max].copy()
    u["hab"] = u["imp"] / u["eh"].where(u["eh"] > 0)
    hab = u.dropna(subset=["hab"]).groupby("ine")["hab"].median().sum()
    prov = {"any": a_max}
    for k in ("ing", "desp", "prog", "trib"):
        uu = u[u["k"] == k]
        prov[k] = {c: r(v / hab, 1) for c, v in uu.groupby("codi_estructura")["imp"].sum().items()} if hab else {}
    for ine in list(x):
        x[ine] = {k: v for k, v in x[ine].items() if v is not None}
    return x, anys, fitxa, prov, noms


def esperanca_series():
    f = P / "padro" / "esperanca.json"
    if not f.exists():
        return {}
    d = json.loads(f.read_text(encoding="utf-8"))
    ser = {}
    for s_ in d.get("77117", []):
        z = "gi" if "Ambos" in s_["nom"] else "esp" if "Varones" in s_["nom"] else "cat" if "Mujeres" in s_["nom"] else None
        if z:
            ser[z] = sorted([[int(a), str(a), v] for a, v in s_["d"] if v is not None])
    return {"esperanca": {"tipus": "linia", "u": "anys", "dec": 1, "noms": "esperanca", "series": ser}} if ser.get("gi") else {}


# ---------------------------------------------------------------------------
# Salut a la província: llistes d'espera (CatSalut), receptes i infeccions per regió sanitària

GRUPS_ATC = [  # (clau, prefijos ATC)
    ("antidepressius", ["N06A"]), ("ansiolitics", ["N05B"]), ("hipnotics", ["N05C"]), ("opioides", ["N02A"]),
    ("analgesics", ["N02B"]), ("antibiotics", ["J01"]), ("antiulcerosos", ["A02B"]), ("colesterol", ["C10A"]),
    ("antidiabetics", ["A10"]), ("tensio", ["C09", "C07", "C08", "C03"]), ("respiratoris", ["R03"]),
]


def _mes_x(m):
    a, mm = int(m[:4]), int(m[5:7])
    return round(a + (mm - 1) / 12, 4)


NOMS_HOSP = {
    "Hospital U de Girona Doctor Josep Trueta": "Hospital Josep Trueta (Girona)",
    "Hosp. d'Olot i Comarcal de la Garrotxa": "Hospital d'Olot",
    "HC Sant Jaume Calella i HC de Blanes": "Hospital de Blanes i Calella",
    "Hospital Santa Caterina": "Hospital Santa Caterina (Salt)",
}


ESCA_GRUPS = {  # gráfico -> [(clave, texto que identifica el indicador en la tabla)]
    "esca_salut": [("percepcio", "Percepció positiva de l'estat de salut"), ("pressio", "pressió alta"), ("diabetis", "diabetis"),
                   ("exces_pes", "excés de pes"), ("obesitat", "Tenir obesitat"), ("cronica", "malaltia o problema de salut crònic"),
                   ("dolor", "Tenir dolor"), ("benestar", "baix benestar emocional"), ("depressio", "depressió moderada"),
                   ("discapacitat", "alguna discapacitat"), ("dependencia", "dependència")],
    "esca_habits": [("tabac", "Consum de tabac"), ("activitat", "Activitat física saludable"), ("dormir", "Dormir les hores"),
                    ("mediterrania", "dieta mediterrània"), ("fruita", "5 racions"), ("ensucrades", "begudes ensucrades"),
                    ("a_peu", "a peu, en bicicleta"), ("transport", "transport públic")],
    "esca_serveis": [("visita", "Visita a un professional"), ("medicaments", "medicaments preescrits"), ("urgencies", "servei d'urgències"),
                     ("hospital", "Hospitalització"), ("doble", "doble cobertura"), ("satisfaccio", "Satisfacció")],
    "esca_infants": [("percepcio", "Percepció positiva de l'estat de salut"), ("exces_pes", "excés de pes"), ("obesitat", "Tenir obesitat"),
                     ("mental", "problema de salut mental"), ("oci_actiu", "oci actiu"), ("oci_sed", "oci sedentari"),
                     ("fruita", "5 racions"), ("hipercalorics", "hipercalòrics"), ("dents", "Raspallar-se")],
}
ESCA_EVOL = [("gi", "Consum de tabac"), ("cat", "Obesitat"), ("esp", "Pressió alta")]


def esca_series():
    """Encuesta de Salud de Cataluña (carga manual anual, scripts/esca_manual.py)."""
    d = P / "esca"
    out = {}
    if not (d / "esca_regio.csv").exists():
        return out
    meta = json.loads((d / "esca_meta.json").read_text(encoding="utf-8")) if (d / "esca_meta.json").exists() else {}
    r = pd.read_csv(d / "esca_regio.csv")
    r = r[r["sexe"] == "total"]
    for graf, inds in ESCA_GRUPS.items():
        x = r[r["bloc"] == ("infants" if graf == "esca_infants" else "adults")]
        grups = []
        for clau, txt in inds:
            f = x[x["indicador"].str.contains(txt, case=False, regex=False)]
            if f.empty or f["gi"].isna().iloc[0]:
                continue
            f = f.iloc[0]
            grups.append({"g": clau, "c": "esca:" + clau, "gi": round(float(f["gi"]) * 100, 1), "cat": round(float(f["cat"]) * 100, 1),
                          "s": int(f["sig"])})
        if grups:
            out[graf] = {"tipus": "barres", "u": "%", "dec": 1, "claus": ["gi", "cat"], "any": meta.get("periode_regio", ""), "grups": grups}
    fe = d / "esca_evolucio.csv"
    if fe.exists():
        e = pd.read_csv(fe)
        ser = {}
        for z, txt in ESCA_EVOL:
            g = e[e["indicador"].str.startswith(txt)].sort_values("any")
            ser[z] = [[int(a), str(int(a)), round(float(v) * 100, 1)] for a, v in zip(g["any"], g["cat"])]
        out["esca_evol"] = {"tipus": "linia", "u": "%", "dec": 1, "noms": "evol", "series": ser}
    return out


def sem_series():
    """Sistema d'Emergències Mèdiques (carga manual, scripts/sem_manual.py). Solo hay datos por región sanitaria."""
    d = P / "sem"
    out = {}
    pr = P / "salut" / "poblacio_rs.csv"
    pob = {}
    if pr.exists():
        po = pd.read_csv(pr, dtype={"rs_codi": str})
        for a, g in po.groupby("any"):
            pob[int(a)] = {"gi": float(g.loc[g["rs_codi"] == "64", "p"].sum()), "cat": float(g["p"].sum())}
    def pob_any(a, z):
        if not pob:
            return None
        a2 = a if a in pob else min(pob, key=lambda y: abs(y - a))
        return pob[a2][z] or None
    ft = d / "sem_temps.csv"
    if ft.exists():
        t = pd.read_csv(ft)
        for k, col in (("sem_lent", "n20"), ("sem_rapid", "n10")):
            ser = {}
            for z, x in (("gi", t[t["ambit"] == "GIRONA"]), ("cat", t)):
                g = x.groupby("any")[[col, "total"]].sum()
                parc = set(t.loc[t["parcial"] == 1, "any"])
                ser[z] = [[int(a), f"{a}, 1r sem." if a in parc else str(a), round(float(v[col]) / v["total"] * 100, 1)] for a, v in g.iterrows() if v["total"]]
            out[k] = {"tipus": "linia", "u": "%", "dec": 1, "series": ser}
    # Códigos de activación: serie anual por 100.000 habitantes (sin el semestre suelto del 2022)
    fc, fm = d / "sem_codis.csv", d / "sem_codis_memoria.csv"
    cs = [pd.read_csv(f) for f in (fc, fm) if f.exists()]
    if cs:
        c = pd.concat(cs, ignore_index=True)
        c = c[c.get("parcial", 0).fillna(0) != 1]
        gi = c[c["regio"] == "GIRONA"].groupby("any")[["iam", "ictus", "ppt"]].sum()
        ca = c.groupby("any")[["iam", "ictus", "ppt"]].sum()
        ult = int(gi.index.max())
        out["sem_codis"] = {"tipus": "barres", "u": "n", "dec": 1, "claus": ["gi", "cat"], "any": str(ult), "grups": [
            {"g": k, "c": "sem:" + k, "gi": round(float(gi.loc[ult, k]) / pob_any(ult, "gi") * 1e5, 1), "cat": round(float(ca.loc[ult, k]) / pob_any(ult, "cat") * 1e5, 1),
             "n": int(gi.loc[ult, k])} for k in ("ppt", "ictus", "iam")], "nu": "casos"}
        # Evolución en Girona: solo años seguidos (el Excel acaba el 2021; la memoria salta al 2025)
        anys = sorted(int(a) for a in gi.index)
        seg = [a for a in anys if a <= anys[0] + len(anys) - 1 and all(y in anys for y in range(anys[0], a + 1))]
        out["sem_codis_evol"] = {"tipus": "linia", "u": "n", "dec": 0, "noms": "codis", "series": {
            z: [[a, str(a), int(gi.loc[a, k])] for a in seg] for z, k in (("gi", "ppt"), ("cat", "ictus"), ("esp", "iam"))}}
    fr = d / "sem_recursos.csv"
    if fr.exists():
        r = pd.read_csv(fr)
        ult = int(r["any"].max())
        r = r[r["any"] == ult]
        g = r[r["regio"] == "GIRONA"].iloc[0]
        out["sem_recursos"] = {"tipus": "barres", "u": "n", "dec": 1, "claus": ["gi", "cat"], "any": str(ult), "nu": "unitats", "grups": [
            {"g": k, "c": "sem:" + k, "gi": round(float(g[k]) / pob_any(ult, "gi") * 1e6, 1), "cat": round(float(r[k].sum()) / pob_any(ult, "cat") * 1e6, 1), "n": int(g[k])}
            for k in ("svb", "sva", "vir", "hems")], "abs": {"gi": int(g[["svb", "sva", "vir", "hems"]].sum()), "cat": int(r[["svb", "sva", "vir", "hems"]].sum().sum())}}
    return out


def salut_series():
    sal = P / "salut"
    out = {}
    # Listas de espera: tiempo medio (días) ponderado por pacientes, región de Girona frente a Cataluña
    fr, fc = sal / "llistes_espera_regions.csv.gz", sal / "llistes_espera_centres.csv.gz"
    if fr.exists():
        rg = pd.read_csv(fr)
        for c_ in ("pacients", "pond", "activitat"):
            rg[c_] = pd.to_numeric(rg[c_], errors="coerce")
        for tipus, k in (("quirurgiques", "le_quir"), ("externes", "le_ext"), ("diagnostiques", "le_diag")):
            x = rg[rg["tipus"] == tipus]
            if x.empty:
                continue
            ser = {}
            for z, filt in (("gi", x["regio"] == "Girona"), ("cat", pd.Series(True, index=x.index))):
                g = x[filt].groupby("mes")[["pacients", "pond"]].sum()
                ser[z] = [[_mes_x(m), m, round(float(v.pond / v.pacients), 0)] for m, v in g.iterrows() if v.pacients]
            g = x[x["regio"] == "Girona"].groupby("mes")["pacients"].sum()
            ult = x["mes"].max()
            out[k] = {"tipus": "linia", "u": "dies", "dec": 0, "series": ser, "abs": {"pacients": int(g.get(ult, 0)), "mes": ult}}
            if tipus == "quirurgiques":
                out["le_pacients"] = {"tipus": "linia", "u": "n", "dec": 0, "series": {"gi": [[_mes_x(m), m, int(v)] for m, v in g.items()]}}
            # Procedimientos con más pacientes en Girona: días de espera Girona vs Cataluña
            u = x[x["mes"] == ult]
            gi = u[u["regio"] == "Girona"].groupby("grup")[["pacients", "pond"]].sum()
            ca = u.groupby("grup")[["pacients", "pond"]].sum()
            gi = gi[~gi.index.astype(str).str.startswith("Resta")]
            top = gi.sort_values("pacients", ascending=False).head(10 if tipus != "quirurgiques" else 12)
            grups = [{"g": nom, "c": "", "gi": round(float(v.pond / v.pacients), 0), "cat": round(float(ca.loc[nom, "pond"] / ca.loc[nom, "pacients"]), 0),
                      "n": int(v.pacients)} for nom, v in top.iterrows() if v.pacients and ca.loc[nom, "pacients"]]
            out[k + "_proc"] = {"tipus": "barres", "u": "dies", "dec": 0, "claus": ["gi", "cat"], "any": ult, "grups": grups}
    if fc.exists():
        ce = pd.read_csv(fc)
        for c_ in ("pacients", "dies", "activitat"):
            ce[c_] = pd.to_numeric(ce[c_], errors="coerce")
        for tipus, k in (("quirurgiques", "le_quir_hosp"), ("externes", "le_ext_hosp"), ("diagnostiques", "le_diag_hosp")):
            x = ce[ce["tipus"] == tipus]
            if x.empty:
                continue
            ult = x["mes"].max()
            u = x[x["mes"] == ult].assign(pond=lambda d: d["pacients"] * d["dies"])
            h = u.groupby("centre")[["pacients", "pond"]].sum()
            h = h[h["pacients"] >= 20]
            h["dies"] = h["pond"] / h["pacients"]
            h = h.sort_values("dies", ascending=False)
            out[k] = {"tipus": "barres", "u": "dies", "dec": 0, "claus": ["gi"], "any": ult,
                      "grups": [{"g": NOMS_HOSP.get(nom, nom), "c": "", "gi": round(float(v.dies), 0), "n": int(v.pacients)} for nom, v in h.iterrows()]}
    # Recetas: por habitante y año (años completos), y grupos terapéuticos en los últimos 12 meses
    pr = sal / "poblacio_rs.csv"
    fm = sal / "receptes_mes.csv"
    if fm.exists() and pr.exists():
        rm = pd.read_csv(fm, dtype={"rs": str})
        po = pd.read_csv(pr, dtype={"rs_codi": str})
        pob = {(int(a), str(c_)): float(v) for a, c_, v in zip(po["any"], po["rs_codi"], po["p"]) if v == v}
        anys_p = sorted({a for a, _ in pob})
        def pob_any(a, rs=None):
            a2 = a if a in anys_p else min(anys_p, key=lambda y: abs(y - a))
            return sum(v for (y, c_), v in pob.items() if y == a2 and (rs is None or c_ == rs))
        compl = rm.groupby("any")["mes"].nunique()
        anys_c = [int(a) for a, n in compl.items() if n == 12]
        for k, col, dec in (("rec_hab", "receptes", 1), ("rec_euros", "import", 0)):
            ser = {}
            for z, rs in (("gi", "64"), ("cat", None)):
                x = rm if rs is None else rm[rm["rs"] == rs]
                g = x.groupby("any")[col].sum()
                ser[z] = [[a, str(a), round(float(g[a]) / pob_any(a, rs), dec)] for a in anys_c if a in g and pob_any(a, rs)]
            out[k] = {"tipus": "linia", "u": "€" if col == "import" else "n", "dec": dec, "series": ser}
        fa = sal / "receptes_atc.csv.gz"
        if fa.exists():
            ra = pd.read_csv(fa, dtype={"rs": str, "atc": str})
            ra["m"] = ra["any"].astype(int) * 100 + ra["mes"].astype(int)
            ms = sorted(ra["m"].unique())[-12:]
            ra = ra[ra["m"].isin(ms)]
            a_ult = int(str(ms[-1])[:4])
            pg, pc = pob_any(a_ult, "64"), pob_any(a_ult)
            grups = []
            for clau, pref in GRUPS_ATC:
                m_ = ra["atc"].astype(str).str.startswith(tuple(pref))
                vg = ra.loc[m_ & (ra["rs"] == "64"), "receptes"].sum() / pg * 100
                vc = ra.loc[m_, "receptes"].sum() / pc * 100
                grups.append({"g": clau, "c": "atc:" + clau, "gi": round(float(vg), 1), "cat": round(float(vc), 1)})
            grups.sort(key=lambda g: -g["gi"])
            per = f"{str(ms[0])[:4]}-{str(ms[0])[4:]}/{str(ms[-1])[:4]}-{str(ms[-1])[4:]}"
            out["rec_grups"] = {"tipus": "barres", "u": "n", "dec": 1, "claus": ["gi", "cat"], "any": per, "grups": grups}
    out.update(esca_series())
    out.update(sem_series())
    # Infecciones respiratorias atendidas en primaria, semanal, por 100.000 habitantes
    fi = sal / "infeccions_rs.csv"
    if fi.exists() and pr.exists():
        iv = pd.read_csv(fi, dtype={"rs": str})
        resp = ["Altres IRA", "Bronquiolitis", "COVID-19", "Grip", "Pneumònia"]
        pr_ = _pob_rs(sal)
        for k, dg in (("inf_setm", resp), ("grip_setm", ["Grip"])):
            x = iv[iv["diagnostic"].isin(dg)]
            ser = {}
            for z, filt, p_ in (("gi", x["rs"] == "64", pr_.get("64")), ("cat", pd.Series(True, index=x.index), sum(pr_.values()))):
                g = x[filt].groupby("data_inici")["casos"].sum().sort_index()
                if p_:
                    ser[z] = [[round(pd.Timestamp(d).year + (pd.Timestamp(d).dayofyear - 1) / 365.25, 4), d, round(float(v) / p_ * 1e5, 0)] for d, v in g.items()]
            out[k] = {"tipus": "linia", "u": "n", "dec": 0, "series": ser}
    return out


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


ENS_BASE = ["inf", "pri", "eso", "batx"]  # infantil 2.º ciclo a bachillerato (misma base que «Escola pública»)
ENS_ZONES = {"RESTA UNIÓ EUROPEA": "ue", "RESTA D'EUROPA": "eur", "MAGREB": "mag", "RESTA D'ÀFRICA": "afr",
             "CENTRE I SUDAMÈRICA": "sud", "AMÈRICA DEL NORD": "nam", "ÀSIA I OCEANIA": "asi"}


def ensenyament_indicadores():
    """Estadística de l'ensenyament (curso actual): titularidad, nacionalidad, edad, NESE, docentes y resultados.

    Devuelve (por municipio, refs, años, series provinciales). En m.x van los indicadores del mapa y «ens»,
    el desglose para la ficha: alumnos por etapa y tipo de centro, extranjeros por zona y alumnos por edad.
    """
    d = P / "educacio"
    res, refs, anys, prov = {}, {}, {}, {}
    f = d / "ens_alumnes.csv.gz"
    if not f.exists():
        return res, refs, anys, prov
    a = pd.read_csv(f, dtype=str, keep_default_na=False)
    a["n"] = pd.to_numeric(a["n"], errors="coerce").fillna(0)
    curs = _curs_ini(a["curs"].iloc[0])
    a["estr"] = ~a["zona"].isin(["ESPANYA", ""])
    gi_mask = a["ine"].str.startswith("17")
    put = lambda ine, k, v, dec=1: res.setdefault(ine, {}).__setitem__(k, round(float(v), dec)) if v == v and v is not None and math.isfinite(float(v)) else None  # noqa: E731

    def ind(g):
        o = {}
        b = g[g["etapa"].isin(ENS_BASE)]
        nb = b["n"].sum()
        if nb >= 50:
            for k, t in (("edu_conc", "conc"), ("edu_priv", "priv")):
                o[k] = 100 * b.loc[b["tipus"] == t, "n"].sum() / nb
            o["edu_estr"] = 100 * b.loc[b["estr"], "n"].sum() / nb
            nn = b[b["nese"].isin(["S", "N"])]
            if nn["n"].sum():
                o["edu_nese"] = 100 * nn.loc[nn["nese"] == "S", "n"].sum() / nn["n"].sum()
        e = g[(g["etapa"] == "eso") & g["retard"].isin(["S", "N"])]
        if e["n"].sum() >= 50:
            o["edu_retard"] = 100 * e.loc[e["retard"] == "S", "n"].sum() / e["n"].sum()
        fp = g.loc[g["etapa"] == "fp", "n"].sum()
        if fp:
            o["edu_fp"] = fp
        return o
    for ine, g in a[gi_mask].groupby("ine"):
        for k, v in ind(g).items():
            put(ine, k, v, 0 if k == "edu_fp" else 1)
        et = {}
        for (e, t), n in g.groupby(["etapa", "tipus"])["n"].sum().items():
            et.setdefault(e, {"pub": 0, "conc": 0, "priv": 0, "estr": 0})[t] = int(n)
        for e, n in g[g["estr"]].groupby("etapa")["n"].sum().items():
            et[e]["estr"] = int(n)
        zones = {ENS_ZONES.get(z, "alt"): int(n) for z, n in g[g["estr"]].groupby("zona")["n"].sum().items() if n}
        res.setdefault(ine, {})["ens"] = {"et": {e: [v["pub"], v["conc"], v["priv"], v["estr"]] for e, v in et.items()}, "z": zones}
    cat_o, gi_o = ind(a[a["ine"] == "CAT"]), ind(a[gi_mask])
    for k in cat_o:
        if k != "edu_fp":
            refs[k] = {"cat": round(cat_o[k], 1), "gi": round(gi_o.get(k, float("nan")), 1)}
        anys[k] = curs
    refs["edu_fp"] = {"gi": int(gi_o.get("edu_fp", 0))}
    # Edad de los alumnos (para la ficha): [edad, total, extranjeros], de 0 a 20 años y «21 o más»
    f = d / "ens_edats.csv.gz"
    if f.exists():
        ed = pd.read_csv(f, dtype=str, keep_default_na=False)
        ed["n"] = pd.to_numeric(ed["n"], errors="coerce").fillna(0)
        ed["e"] = pd.to_numeric(ed["edat"], errors="coerce").clip(upper=21)
        ed["estr"] = ~ed["zona"].isin(["ESPANYA", ""])
        ed = ed[ed["e"].notna() & ed["ine"].str.startswith("17")]
        for ine, g in ed.groupby("ine"):
            t = g.groupby("e")["n"].sum()
            x = g[g["estr"]].groupby("e")["n"].sum()
            if ine in res and "ens" in res[ine]:
                res[ine]["ens"]["ed"] = [[int(e), int(n), int(x.get(e, 0))] for e, n in t.items() if n]
    # Docentes del centro (infantil-primaria y secundaria) por municipio del centro
    f = d / "ens_docents.csv"
    if f.exists():
        dc = pd.read_csv(f, dtype=str, keep_default_na=False)
        dc["n"] = pd.to_numeric(dc["n"], errors="coerce").fillna(0)
        dc["gran"] = dc["edat"].str.contains("50|55|60|MÉS DE 64", regex=True)

        def doc(g, al):
            o, n = {}, g["n"].sum()
            if n >= 10:
                o["edu_doc_dones"] = 100 * g.loc[g["sexe"] == "D", "n"].sum() / n
                o["edu_doc_50"] = 100 * g.loc[g["gran"], "n"].sum() / n
                if al:
                    o["edu_alum_doc"] = al / n
            if n:
                o["edu_docents"] = n
            return o
        al_m = a[a["etapa"].isin(["inf", "pri", "eso", "batx", "fp"])].groupby("ine")["n"].sum()
        for ine, g in dc[dc["ine"].str.startswith("17")].groupby("ine"):
            for k, v in doc(g, al_m.get(ine, 0)).items():
                put(ine, k, v, 0 if k == "edu_docents" else 1)
        al_gi = al_m[al_m.index.str.startswith("17")].sum()
        c_o, g_o = doc(dc[dc["ine"] == "CAT"], al_m.get("CAT", 0)), doc(dc[dc["ine"].str.startswith("17")], al_gi)
        for k in ("edu_doc_dones", "edu_doc_50", "edu_alum_doc"):
            if k in c_o:
                refs[k] = {"cat": round(c_o[k], 1), "gi": round(g_o[k], 1)}
        refs["edu_docents"] = {"gi": int(g_o.get("edu_docents", 0))}
        for k in ("edu_doc_dones", "edu_doc_50", "edu_alum_doc", "edu_docents"):
            anys[k] = _curs_ini(dc["curs"].iloc[0])
    # Resultados de ESO del curso anterior: alumnos de 4.º que obtienen el título (promocionan)
    f = d / "ens_resultats_eso.csv"
    if f.exists():
        r = pd.read_csv(f, dtype=str, keep_default_na=False)
        r["n"] = pd.to_numeric(r["n"], errors="coerce").fillna(0)
        r = r[r["nivell"] == "4"]
        r["no"] = r["resultat"].str.startswith("NO ")

        def grad(g):
            n = g["n"].sum()
            return 100 * (n - g.loc[g["no"], "n"].sum()) / n if n else None
        for ine, g in r[r["ine"].str.startswith("17")].groupby("ine"):
            if g["n"].sum() >= 20:
                put(ine, "edu_grad4", grad(g))
        refs["edu_grad4"] = {"cat": round(grad(r[r["ine"] == "CAT"]), 1), "gi": round(grad(r[r["ine"].str.startswith("17")]), 1)}
        anys["edu_grad4"] = _curs_ini(r["curs"].iloc[0])
    # «La província»: alumnado extranjero por etapa y por zona de nacionalidad (Girona y Cataluña)
    noms = {"llar": "et:llar", "inf": "et:inf", "pri": "et:pri", "eso": "et:eso", "batx": "et:batx", "fp": "et:fp"}
    grups = []
    for e, c in noms.items():
        g, k = a[gi_mask & (a["etapa"] == e)], a[(a["ine"] == "CAT") & (a["etapa"] == e)]
        if g["n"].sum() and k["n"].sum():
            grups.append({"g": e, "c": c, "gi": round(100 * g.loc[g["estr"], "n"].sum() / g["n"].sum(), 1),
                          "cat": round(100 * k.loc[k["estr"], "n"].sum() / k["n"].sum(), 1), "n": int(g["n"].sum()), "any": curs})
    if grups:
        prov["edu_estr_etapa"] = {"tipus": "barres", "u": "%", "dec": 1, "nu": "alu", "claus": ["gi", "cat"], "any": curs, "grups": grups}
    ex_g, ex_c = a[gi_mask & a["estr"]], a[(a["ine"] == "CAT") & a["estr"]]
    zg, zc = ex_g.groupby("zona")["n"].sum(), ex_c.groupby("zona")["n"].sum()
    grups = [{"g": z, "c": "ez:" + ENS_ZONES.get(z, "alt"), "gi": round(100 * zg.get(z, 0) / zg.sum(), 1), "cat": round(100 * zc.get(z, 0) / zc.sum(), 1), "any": curs}
             for z in zg.sort_values(ascending=False).index]
    if grups:
        prov["edu_zones"] = {"tipus": "barres", "u": "%", "dec": 1, "claus": ["gi", "cat"], "any": curs, "grups": grups,
                             "abs": {"n": int(zg.sum()), "pct": round(100 * zg.sum() / a.loc[gi_mask, "n"].sum(), 1)}}
    # Tipo de centro por etapa en la provincia (% pública, concertada y privada)
    grups = []
    for e, c in noms.items():
        g = a[gi_mask & (a["etapa"] == e)]
        n = g["n"].sum()
        if n:
            t = g.groupby("tipus")["n"].sum()
            grups.append({"g": e, "c": c, **{k: round(100 * t.get(k, 0) / n, 1) for k in ("pub", "conc", "priv")}, "n": int(n), "any": curs})
    if grups:
        prov["edu_tipus_etapa"] = {"tipus": "barres", "u": "%", "dec": 1, "claus": ["pub", "conc", "priv"], "any": curs, "grups": grups, "noms": "tc", "nu": "alu"}
    return res, refs, anys, prov


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

BOMB_MES: dict = {}  # serie mensual de actuaciones de Bombers en la provincia (la rellena emergencies_indicadores)
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
        # Últimos 12 meses completos, si está el fichero mensual (se actualiza cada mes)
        fm = d / "actuacions_bombers_mes.csv.gz"
        if fm.exists():
            am = pd.read_csv(fm, dtype={"codi_ine": str})
            for c in ("n", "any", "mes"):
                am[c] = pd.to_numeric(am[c], errors="coerce")
            am = am.dropna(subset=["any", "mes", "codi_ine"])
            am["ym"] = (am["any"] * 12 + am["mes"] - 1).astype(int)
            fi = pd.to_datetime(lim["fi"].astype(str).str[:10], errors="coerce").max()
            # último mes completo: el de la última actuación si es fin de mes; si no, el anterior
            u = (fi.year * 12 + fi.month - 1 - (0 if (fi + pd.Timedelta(days=1)).month != fi.month else 1)) if pd.notna(fi) else int(am["ym"].max())
            u = min(u, int(am["ym"].max()))
            a = am[(am["ym"] > u - 12) & (am["ym"] <= u)].copy()
            a["ine"] = a["codi_ine"].str.zfill(5).str[:5]
            ult = f"{(u - 11) % 12 + 1:02d}/{(u - 11) // 12}–{u % 12 + 1:02d}/{u // 12}"
            # Serie mensual de la provincia: incendios, salvamentos y accidentes de tráfico
            g = am[am["tga_nom_grupo"].isin(GRUPS_URGENTS) & (am["ym"] <= u) & (am["ym"] > u - 12 * 6)]
            def ser(grups):
                x = g[g["tga_nom_grupo"].isin(grups)].groupby("ym")["n"].sum()
                return [[round(k // 12 + (k % 12) / 12, 4), f"{k // 12}-{k % 12 + 1:02d}", int(v)] for k, v in sorted(x.items())]
            BOMB_MES.update({"tipus": "linia", "u": "", "dec": 0, "noms": "bmes", "series": {
                "gi": ser(("incendi urbà", "incendi vegetació")), "cat": ser(("salvaments",)), "esp": ser(("mobilitat",))},
                "total": int(g[g["ym"] > u - 12]["n"].sum()), "fins": f"{u // 12}-{u % 12 + 1:02d}"})
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


# ---------------------------------------------------------------------------
# Tipos impositivos municipales (Hacienda, SGFAL)

TRIB_DEC = {"ibi_u": 3, "ibi_r": 3, "ibi_bice": 3, "ibi_rev": 0, "iae_max": 2, "iae_min": 2,
            "ivtm_8": 2, "ivtm_12": 2, "ivtm_16": 2, "ivtm_moto": 2, "iivtnu": 2, "icio": 2}


def tributs():
    """Series por municipio {ine: {clave: {any: valor}}}, referencias {clave: {any: {gi, cat, esp}}} y último año."""
    d = P / "tributs"
    if not (d / "claves.csv.gz").exists():
        return {}, {}, None
    k = pd.read_csv(d / "claves.csv.gz", dtype={"ine": str})
    k = k[k["clave"].isin(TRIB_DEC)]
    mun = {}
    for (ine, cl), g in k.groupby(["ine", "clave"]):
        mun.setdefault(ine, {})[cl] = {int(a): round(float(v), TRIB_DEC[cl]) for a, v in zip(g["any"], g["valor"])}
    agr = json.loads((d / "agregats.json").read_text(encoding="utf-8")) if (d / "agregats.json").exists() else {}
    refs = {}
    for a, zs in agr.items():
        for z in ("gi", "cat", "esp"):
            for cl, x in (zs.get(z) or {}).items():
                if cl in TRIB_DEC and x.get("pond") is not None:
                    refs.setdefault(cl, {}).setdefault(int(a), {})[z] = round(x["pond"], TRIB_DEC[cl])
    return mun, refs, int(k["any"].max()) if len(k) else None


USOS_CAD = ["RES", "ALMACEN", "COMERCIAL", "INDUSTRIAL", "OFICINAS", "HOSTELERIA", "SOLAR", "DEPORTIVO", "CULTURAL", "SANIDAD", "RELIGIOSO", "ESPECTACULOS", "SINGULAR"]
CAD_DEC = {"n": 0, "vm": 0, "vviv": 0, "vhab": 0, "sol": 1, "ih": 1, "res": 1, "alm": 1, "com": 1, "ind": 1, "ofi": 2, "hos": 0,
           "solar": 1, "suph": 0, "rha": 0, "rpar": 2, "rev": 0,
           "vm2": 0, "sm2": 0, "ibi_hab": 0, "ibi_rec": 0, "ibi_base": 0, "ibi_bon": 1, "ibi_tot": 0, "ibi_desoc": 0}


def _cad_ind(f, pob):
    """Indicadores catastrales de una fila (municipio o agregado) con su población."""
    g = lambda k: (lambda v: None if v is None or (isinstance(v, float) and math.isnan(v)) else float(v))(f.get(k))  # noqa: E731
    q = lambda a, b, k=1: (a / b * k) if a is not None and b else None  # noqa: E731
    n = g("UURBANAS")
    return {"n": n, "vm": q(g("V_CATASTRAL"), n), "vviv": q(g("V_CAT_RES"), g("UU_RES")), "vhab": q(g("V_CATASTRAL"), pob),
            "sol": q(g("V_SUELO"), g("V_CATASTRAL"), 100), "ih": q(n, pob, 100), "res": q(g("UU_RES"), n, 100),
            "alm": q(g("UU_ALMACEN"), n, 100), "com": q(g("UU_COMERCIAL"), pob, 1000), "ind": q(g("UU_INDUSTRIAL"), pob, 1000),
            "ofi": q(g("UU_OFICINAS"), pob, 1000), "hos": g("UU_HOSTELERIA"), "solar": q(g("SOLAR_URB"), g("PARCELAS_URB"), 100),
            "suph": q(g("SUPERF_URB"), pob), "rha": q(g("VALOR_MILES_RUS"), g("SUPERFICIE_HA_RUS"), 1000),
            "rpar": q(g("SUPERFICIE_HA_RUS"), g("PARCELAS_RUS")), "rev": g("ULT_REVISION")}


def _px(ruta):
    """Lee un PC-Axis sencillo: devuelve ({dimensión: [valores]}, orden de dimensiones, lista de datos)."""
    t = ruta.read_text(encoding="latin-1")
    cap, dades = t.split("DATA=", 1)
    dims = {m.group(1): re.findall(r'"([^"]*)"', m.group(2)) for m in re.finditer(r'VALUES\("([^"]+)"\)=(.*?);', cap, re.S)}
    ordre = re.findall(r'"([^"]+)"', re.search(r"STUB=(.*?);", cap, re.S).group(1)) + re.findall(r'"([^"]+)"', re.search(r"HEADING=(.*?);", cap, re.S).group(1))
    nums = [None if x.startswith('"') else float(x) for x in re.findall(r'"[^"]*"|-?\d+(?:\.\d+)?', dades.split(";")[0])]
    return dims, ordre, nums


def cad_historic():
    """Catastro urbano 1990-2009 por municipio (paquete PC-Axis): {ine: {año: (inmuebles, valor en €)}}."""
    f = P / "cadastre" / "historic_urbana.px"
    if not f.exists():
        return {}
    try:
        dims, ordre, nums = _px(f)
        munis, anys, vars_ = dims[ordre[0]], dims[ordre[1]], dims[ordre[2]]
        if len(nums) != len(munis) * len(anys) * len(vars_):
            print("AVISO cad_historic: tamaño inesperado")
            return {}
        noms = dict(zip(territorio()["nom_normalitzat"], territorio()["codi_ine"]))
        iI, iV = vars_.index("Bienes inmuebles"), vars_.index("Valor catastral")
        res = {}
        for i, nom in enumerate(munis):
            n_ = normaliza(re.sub(r"\s*\((.*?)\)\s*$", r" \1", nom))
            ine = noms.get(n_)
            if not ine:
                # Nombres antiguos o abreviados ("Calonge" -> "Calonge i Sant Antoni"): palabras contenidas
                cand = [k for k in noms if set(n_.split()) <= set(k.split())]
                ine = noms[cand[0]] if len(cand) == 1 else None
            if not ine:
                continue
            for j, a in enumerate(anys):
                b = (i * len(anys) + j) * len(vars_)
                n, v = nums[b + iI], nums[b + iV]
                if n and v:
                    res.setdefault(ine, {})[int(a)] = (n, v * 1000)
        return res
    except Exception as e:  # noqa: BLE001
        print("AVISO cad_historic:", e)
        return {}


def cad_districtes(k="vm"):
    """Valor cadastral mitjà de l'habitatge (€/m²) per districte censal (sèries del Catastro, 2013-).
    Mitjana de l'habitatge col·lectiu i unifamiliar ponderada pel nombre d'immobles. Devuelve
    {ine: {año: v}}, {districte: v} del último año, {año: v} de la provincia y el último año."""
    f = P / "cadastre" / "districtes.csv.gz"
    if not f.exists():
        return {}, {}, {}, None
    d = pd.read_csv(f, dtype={"districte": str})
    d["n"] = d[["inm_vcol", "inm_vuni"]].fillna(0).sum(axis=1)
    if f"{k}_{k}_viv_colectiva" not in d.columns:
        return {}, {}, {}, None
    d["s"] = d["inm_vcol"].fillna(0) * d[f"{k}_{k}_viv_colectiva"].fillna(0) + d["inm_vuni"].fillna(0) * d[f"{k}_{k}_viv_unifamiliar"].fillna(0)
    d = d[(d["n"] > 0) & (d["s"] > 0)]
    d["ine"] = d["districte"].str[:5]
    ult = int(d["any"].max())
    mun = {}
    for (ine, y), g in d.groupby(["ine", "any"]):
        mun.setdefault(ine, {})[int(y)] = int(round(g["s"].sum() / g["n"].sum()))
    u = d[(d["any"] == ult) & (d["n"] >= 20)]
    dis = {x.districte: int(round(x.s / x.n)) for x in u.itertuples()}
    prov = {int(y): int(round(g["s"].sum() / g["n"].sum())) for y, g in d.groupby("any")}
    return mun, dis, prov, ult


def cadastre():
    """Estadísticas del Catastro por municipio y año (Datos municipios, 2012-). Devuelve
    {ine: {clave: {año: v}}}, {clave: {año: {gi, cat, esp}}}, último año, {ine: usos} y {ámbito: usos}
    (usos del último año: {uso: [inmuebles, valor medio]})."""
    d = P / "cadastre"
    fm = d / "municipis.csv.gz"
    if not fm.exists():
        return {}, {}, None, {}, {}
    c = pd.read_csv(fm, dtype={"codi_ine": str})
    pobs = {}
    fp = P / "padro" / "poblacio_municipis.csv.gz"
    if fp.exists():
        for x in pd.read_csv(fp, dtype={"ine": str}).itertuples():
            pobs.setdefault(x.ine, {})[int(x.any)] = float(x.valor)
    prox = lambda s, y: (s.get(y) or s.get(y - 1) or (s[min(s, key=lambda k: abs(k - y))] if s else None))  # noqa: E731
    # El año del Catastro es el padrón a 1 de enero: se usa la población del año anterior
    pob = lambda ine, y: prox(pobs.get(ine, {}), y - 1)  # noqa: E731
    ult = int(c["any"].max())
    usos = lambda f: {u.lower(): [int(f["UU_" + u]) if pd.notna(f.get("UU_" + u)) else None,  # noqa: E731
                                  round(f["V_CAT_" + u] / f["UU_" + u]) if pd.notna(f.get("V_CAT_" + u)) and f.get("UU_" + u) else None] for u in USOS_CAD}
    mun, usos_mun = {}, {}
    for f in c.to_dict("records"):
        y = int(f["any"])
        for k, v in _cad_ind(f, pob(f["codi_ine"], y)).items():
            if v is not None:
                mun.setdefault(f["codi_ine"], {}).setdefault(k, {})[y] = round(v, CAD_DEC[k]) if CAD_DEC[k] else int(round(v))
        if y == ult:
            usos_mun[f["codi_ine"]] = usos(f)
    # Referencias: sumas del Catastro; población de Girona (padrón) y de Cataluña y España (agregados DGT/INE)
    pz = {"gi": {}, "cat": {}, "esp": {}}
    for ine, s in pobs.items():
        for y, v in s.items():
            pz["gi"][y] = pz["gi"].get(y, 0) + v
    fv = P / "vehicles" / "agregats.csv"
    if fv.exists():
        for x in pd.read_csv(fv).to_dict("records"):
            if x["ambit"] in ("cat", "esp") and x.get("pob") == x.get("pob"):
                pz[x["ambit"]][int(x["any"])] = float(x["pob"])
    refs, usos_ref = {}, {}
    fr = d / "referencies.json"
    if fr.exists():
        for z, per_any in json.loads(fr.read_text(encoding="utf-8")).items():
            for y, f in per_any.items():
                y = int(y)
                for k, v in _cad_ind(f, prox(pz.get(z, {}), y - 1)).items():
                    if v is not None and k not in ("rev", "hos", "n"):
                        refs.setdefault(k, {}).setdefault(y, {})[z] = round(v, CAD_DEC[k])
                if y == ult:
                    usos_ref[z] = usos(f)
    # Serie larga (1990-2009) de inmuebles y valor medio, delante de la de 2012-
    hist = cad_historic()
    sum_h = {}
    for ine, serie in hist.items():
        primer = min(mun.get(ine, {}).get("n", {}) or [9999])
        for y, (n, v) in sorted(serie.items()):
            if ine in mun and y < primer:
                mun[ine].setdefault("n", {})[y] = int(n)
                mun[ine].setdefault("vm", {})[y] = int(round(v / n))
                sn, sv = sum_h.get(y, (0, 0))
                sum_h[y] = (sn + n, sv + v)
    for y, (n, v) in sum_h.items():
        if len([1 for s_ in hist.values() if y in s_]) >= 200:
            refs.setdefault("vm", {}).setdefault(y, {})["gi"] = int(round(v / n))
    for clau, k in (("vm2", "vm"), ("sm2", "sm")):
        dm, _, dprov, _ = cad_districtes(k)
        for ine, serie in dm.items():
            if ine in mun:
                mun[ine][clau] = serie
        for y, v in dprov.items():
            refs.setdefault(clau, {}).setdefault(y, {})["gi"] = v
    # IBI: información económico-financiera (recibos, bases y cuotas), 2008-
    fi = d / "ibi_municipis.csv.gz"
    if fi.exists():
        e = pd.read_csv(fi, dtype={"codi_ine": str})
        for f in e.to_dict("records"):
            y = int(f["any"])
            for k, v in _ibi_ind(f, pob(f["codi_ine"], y)).items():
                if v is not None:
                    mun.setdefault(f["codi_ine"], {}).setdefault(k, {})[y] = round(v, CAD_DEC[k])
        fr = d / "ibi_referencies.json"
        if fr.exists():
            for z, per_any in json.loads(fr.read_text(encoding="utf-8")).items():
                for y, f in per_any.items():
                    y = int(y)
                    # Antes de 2011 a Cataluña y España les faltan recibos de municipios grandes (Barcelona en 2009)
                    if z != "gi" and y < 2011:
                        continue
                    for k, v in _ibi_ind(f, prox(pz.get(z, {}), y - 1)).items():
                        if v is not None and k != "ibi_desoc":
                            refs.setdefault(k, {}).setdefault(y, {})[z] = round(v, CAD_DEC[k])
                    if f.get("N_MUNICIPIOS"):
                        refs.setdefault("ibi_desoc_n", {}).setdefault(y, {})[z] = [f.get("N_RECARGO") or 0, f["N_MUNICIPIOS"]]
    return mun, refs, ult, usos_mun, usos_ref


def _ibi_ind(f, pob):
    g = lambda k: (lambda v: None if v is None or (isinstance(v, float) and math.isnan(v)) else float(v))(f.get(k))  # noqa: E731
    q = lambda a, b, k=1: (a / b * k) if a is not None and b else None  # noqa: E731
    ci, cl = g("CINTEGRA_URBANA"), g("CLIQUIDA_URBANA")
    return {"ibi_hab": q(cl, pob), "ibi_rec": q(cl, g("RECIBOS_URBANA")), "ibi_base": q(g("BLIQ_NO_EXENTA_URBANA"), g("RECIBOS_URBANA")),
            "ibi_bon": (100 - cl / ci * 100) if ci and cl is not None and cl <= ci else None,
            "ibi_tot": q((cl or 0) + (g("CLIQUIDA_RUSTICA") or 0) + (g("CLIQUIDA_BICES") or 0), pob) if cl is not None else None,
            "ibi_desoc": g("RECARGO_DESOCUPADOS") or (0 if "RECARGO_DESOCUPADOS" in f else None)}


def cadastre_prov(refs, ult, usos_ref):
    """Gráficos de «La província»: valor catastral de la vivienda (serie) e inmuebles por uso."""
    out = {}
    v = refs.get("vviv", {})
    ser = {z: sorted([[y, str(y), r_[z]] for y, r_ in v.items() if r_.get(z) is not None]) for z in ("gi", "cat", "esp")}
    if ser.get("gi"):
        out["cad_viv"] = {"tipus": "linia", "u": "€", "dec": 0, "series": ser}
    v = refs.get("ibi_rec", {})
    ser = {z: sorted([[y, str(y), r_[z]] for y, r_ in v.items() if r_.get(z) is not None]) for z in ("gi", "cat", "esp")}
    if ser.get("gi"):
        ua = max(v)
        out["cad_ibi"] = {"tipus": "linia", "u": "€", "dec": 0, "series": ser, "abs": {"desoc": (refs.get("ibi_desoc_n", {}).get(ua) or {}).get("gi")}}
    if usos_ref.get("gi"):
        tot = {z: sum((x[0] or 0) for x in u.values()) for z, u in usos_ref.items()}
        grups = []
        for k, x in usos_ref["gi"].items():
            if not x[0] or k == "res":
                continue
            g = {"g": k, "c": "cu:" + k}
            for z in ("gi", "cat", "esp"):
                n = (usos_ref.get(z, {}).get(k) or [None])[0]
                g[z] = round(n / tot[z] * 100, 1) if n and tot.get(z) else None
            grups.append(g)
        res = {z: round((usos_ref[z]["res"][0] or 0) / tot[z] * 100, 1) for z in usos_ref if tot.get(z)}
        out["cad_usos"] = {"tipus": "barres", "u": "%", "dec": 1, "claus": ["gi", "cat", "esp"], "any": ult, "res": res,
                           "grups": sorted([g for g in grups if (g["gi"] or 0) >= 0.3], key=lambda x: -(x["gi"] or 0))}
    return out


def vehicles():
    """Parque de vehículos de la DGT (anual). Devuelve {ine: {clave: {any: valor}}},
    {clave: {any: {gi, cat, esp}}} y el último año. Las claves ya son indicadores calculados."""
    d = P / "vehicles"
    fs = sorted(d.glob("dgt_mun_*.csv")) if d.exists() else []
    if not fs:
        return {}, {}, None

    def calc(x):
        pob, tot = x.get("pob"), x.get("total")
        fuel = sum(x.get(k) or 0 for k in ("gasolina", "diesel", "elec", "glp", "gnl", "altres"))
        dist = sum(x.get(k) or 0 for k in ("dist_b", "dist_c", "dist_eco", "dist_0", "sense_dist"))
        q = lambda a, b, f=1: (a / b * f) if a is not None and b else None  # noqa: E731
        return {
            "n": tot, "total_h": q(tot, pob, 1000), "tur_h": q(x.get("tur"), pob, 1000),
            "moto_h": q((x.get("moto") or 0) + (x.get("cicl") or 0), pob, 1000),
            "furg_h": q((x.get("furg") or 0) + (x.get("cam") or 0), pob, 1000),
            "elec_p": q(x.get("elec"), fuel, 100), "diesel_p": q(x.get("diesel"), fuel, 100),
            "eco_p": q((x.get("dist_eco") or 0) + (x.get("dist_0") or 0), dist, 100), "sense_p": q(x.get("sense_dist"), dist, 100),
            "tur4_p": q(x.get("tur_4"), x.get("tur"), 100), "antig_tur": x.get("antig_tur"), "cond_h": q(x.get("cond"), pob, 100),
        }

    dec = {"n": 0, "total_h": 0, "tur_h": 0, "moto_h": 0, "furg_h": 0, "elec_p": 2, "diesel_p": 1, "eco_p": 1, "sense_p": 1, "tur4_p": 1, "antig_tur": 1, "cond_h": 1}
    arr = lambda v, k: None if v is None or (isinstance(v, float) and math.isnan(v)) else (round(v, dec[k]) if dec[k] else int(round(v)))  # noqa: E731
    mun = {}
    for f in fs:
        a = int(f.stem.split("_")[-1])
        for x in pd.read_csv(f, dtype={"ine": str}).to_dict("records"):
            x = {k: (None if isinstance(v, float) and math.isnan(v) else v) for k, v in x.items()}
            if x.get("pob") and x["pob"] < 1:
                continue
            for k, v in calc(x).items():
                v = arr(v, k)
                if v is not None:
                    mun.setdefault(x["ine"], {}).setdefault(k, {})[a] = v
    refs = {}
    if (d / "agregats.csv").exists():
        for x in pd.read_csv(d / "agregats.csv").to_dict("records"):
            for k, v in calc(x).items():
                v = arr(v, k)
                if v is not None:
                    refs.setdefault(k, {}).setdefault(int(x["any"]), {})[x["ambit"]] = v
    return mun, refs, max(int(f.stem.split("_")[-1]) for f in fs)


# ---------------------------------------------------------------------------
# Comercio: Cens d'establiments comercials de Catalunya (CECC), Mapa del Comerç Català 2022
# (locales vacíos) y registro de licencias comerciales (grandes establecimientos).

SECTORS_COM = {"alim": "quotidi_alimentari_exc_vending", "qna": "quotidi_no_alimentari", "pers": "equipament_persona",
               "llar": "equipament_llar", "lleure": "lleure_i_cultura", "auto": "automoci_i_carburants",
               "mixt": "comer_mixt", "altres": "altres"}


def comerc():
    """Devuelve ({ine: {clave: {any: valor}}}, {clave: {any: {gi, cat}}}, último año,
    {ine: indicadores sueltos para m.x}, {ine: datos para la ficha}, {clave: {cat}}, puntos GeoJSON)."""
    d = P / "comerc"
    if not (d / "cecc.csv").exists():
        return {}, {}, None, {}, {}, {}, None
    df = pd.read_csv(d / "cecc.csv", dtype={"ine": str, "any": int})
    num_cols = ["poblaci", "establiments", "superf_cie_de_venda_m2"] + list(SECTORS_COM.values())
    for c in num_cols:
        df[c] = pd.to_numeric(df[c], errors="coerce")
    df = df.drop_duplicates(["municipi", "any"])
    # Las dades obertes solo traen los sectores de los municipios grandes: el resto sale de la API
    # de la aplicación del censo (un sector que no aparece = 0 establecimientos)
    fs = d / "sectors_municipis.csv"
    if fs.exists():
        NOMS_API = {"Altres": "altres", "Automoció i carburants": "automoci_i_carburants", "Comerç mixt": "comer_mixt",
                    "Equipament llar": "equipament_llar", "Equipament persona": "equipament_persona", "Lleure i cultura": "lleure_i_cultura",
                    "Quotidià alimentari": "quotidi_alimentari_exc_vending", "Quotidià no alimentari": "quotidi_no_alimentari"}
        sa = pd.read_csv(fs, dtype={"ine": str, "any": int})
        sa["col"] = sa["sector"].map(NOMS_API)
        sa = sa[sa["col"].notna()]
        pv = sa.pivot_table(index=["ine", "any"], columns="col", values="establiments", aggfunc="sum")
        for (ine, a), fila in pv.iterrows():
            sel = (df["ine"] == ine) & (df["any"] == a)
            # Antes de 2021 la API devuelve todos los sectores vacíos en los municipios pequeños: no es un 0
            if fila.fillna(0).sum() == 0 and (df.loc[sel, "establiments"].fillna(0) > 0).any():
                continue
            if sel.any() and df.loc[sel, SECTORS_COM["alim"]].isna().all():
                for c in SECTORS_COM.values():
                    df.loc[sel, c] = fila.get(c, 0) if fila.get(c, 0) == fila.get(c, 0) else 0

    def calc(x):
        pob, n, sup = x.get("poblaci"), x.get("establiments"), x.get("superf_cie_de_venda_m2")
        q = lambda a, b, f=1: (a / b * f) if a is not None and a == a and b else None  # noqa: E731
        o = {"n": n, "sup": sup, "est_h": q(n, pob, 1000), "sup_h": q(sup, pob), "sup_mitj": q(sup, n)}
        for k, c in SECTORS_COM.items():
            o["s_" + k] = q(x.get(c), pob, 1000)
        o["p_quot"] = q((x.get(SECTORS_COM["alim"]) or 0) + (x.get(SECTORS_COM["qna"]) or 0), n, 100)
        return o

    dec = {"n": 0, "sup": 0, "est_h": 1, "sup_h": 2, "sup_mitj": 0, "p_quot": 1, **{"s_" + k: 2 for k in SECTORS_COM}}
    arr = lambda v, k: None if v is None or (isinstance(v, float) and not math.isfinite(v)) else (round(v, dec[k]) if dec[k] else int(round(v)))  # noqa: E731
    mun, refs, fitxa, x_mun = {}, {}, {}, {}
    gi = df[df["ine"].notna()]
    for x in gi.to_dict("records"):
        for k, v in calc(x).items():
            v = arr(v, k)
            if v is not None:
                mun.setdefault(x["ine"], {}).setdefault(k, {})[int(x["any"])] = v
    for ambit, g in (("gi", gi), ("cat", df)):
        for a, ga in g.groupby("any"):
            s = {c: ga[c].sum() for c in num_cols}
            o = calc(s)
            # Sectores: solo con los municipios que los tienen (en Cataluña, los ~120 grandes)
            gs = ga[ga[SECTORS_COM["alim"]].notna()]
            if len(gs) < len(ga):
                os_ = calc({c: gs[c].sum() for c in num_cols})
                o.update({k: v for k, v in os_.items() if k.startswith("s_") or k == "p_quot"})
            for k, v in o.items():
                v = arr(v, k)
                if v is not None:
                    refs.setdefault(k, {}).setdefault(int(a), {})[ambit] = v
    anys = sorted(df["any"].unique())
    a0, a1 = int(anys[0]), int(anys[-1])
    refs_x = {}
    for ine, o in mun.items():
        n = o.get("n", {})
        if n.get(a0, 0) >= 10 and a1 in n:
            x_mun.setdefault(ine, {})["com_var"] = round((n[a1] / n[a0] - 1) * 100, 1)
    for ambit, g in (("gi", gi), ("cat", df)):
        t0, t1 = g[g["any"] == a0]["establiments"].sum(), g[g["any"] == a1]["establiments"].sum()
        refs_x.setdefault("com_var", {})[ambit] = round((t1 / t0 - 1) * 100, 1)
    # Locales vacíos (Mapa del Comerç Català 2022): ciudades de más de 20.000 habitantes y capitales
    f = d / "mapa_comerc_2022.csv"
    if f.exists():
        mc = pd.read_csv(f, dtype={"codi": str})
        for c in ("localb", "total", "actius", "actius_comercials", "naub", "host", "serv"):
            mc[c] = pd.to_numeric(mc.get(c), errors="coerce")
        mc["ine"] = mc["codi"].str.zfill(6).str[:5]
        for x in mc[mc["ine"].str.startswith("17")].to_dict("records"):
            if x["total"]:
                x_mun.setdefault(x["ine"], {})["com_buits"] = round(x["localb"] / x["total"] * 100, 1)
                fitxa.setdefault(x["ine"], {})["buits"] = {"any": 2022, "buits": int(x["localb"]), "total": int(x["total"]),
                                                           "actius": int(x["actius"] or 0), "comercials": int(x["actius_comercials"] or 0)}
        mg = mc[mc["ine"].str.startswith("17")]
        refs_x["com_buits"] = {"cat": round(mc["localb"].sum() / mc["total"].sum() * 100, 1),
                               "gi": round(mg["localb"].sum() / mg["total"].sum() * 100, 1)}
    # Grandes establecimientos con licencia comercial favorable
    punts = None
    f = d / "llicencies.csv"
    if f.exists():
        ll = pd.read_csv(f, dtype=str)
        ll = ll[ll["sentit_resoluci_ferma"].str.lower().str.startswith("favorable", na=False)]
        feats = []
        for x in ll.to_dict("records"):
            g = re.match(r"POINT \(([-\d.]+) ([-\d.]+)\)", str(x.get("georefer_ncia", "")))
            sup = pd.to_numeric(x.get("sup_venda_m2"), errors="coerce")
            ine = str(x.get("codi_municipi", ""))[:5]
            data = str(x.get("data_resoluci_ferma") or x.get("data_entrada_dgc") or "")[:4]
            e = {"nom": str(x.get("sol_licitant", "")).strip(), "f": x.get("format_de_l_establiment"), "s": None if pd.isna(sup) else int(round(sup)), "a": data}
            fitxa.setdefault(ine, {}).setdefault("grans", []).append(e)
            if g:
                feats.append({"type": "Feature", "geometry": {"type": "Point", "coordinates": [round(float(g.group(1)), 5), round(float(g.group(2)), 5)]},
                              "properties": {**e, "ine": ine}})
        for o in fitxa.values():
            if "grans" in o:
                o["grans"].sort(key=lambda e: -(e["s"] or 0))
        punts = {"type": "FeatureCollection", "features": feats}
    return mun, refs, a1, x_mun, fitxa, refs_x, punts
def solar():
    """Autoconsumo fotovoltaico (RAC de la Generalitat) por municipio y año, acumulado a 31 de
    diciembre según la fecha de puesta en servicio. Devuelve {ine: {clave: {año: valor}}},
    {clave: {año: {gi, cat}}}, el último año, el último mes y la serie mensual de la provincia."""
    fs = glob.glob(str(P / "generalitat" / "2b4s-skfm_*"))
    if not fs:
        return {}, {}, None, None, {}
    a = pd.read_csv(fs[0], dtype=str)
    a = a[a["Tecnologia"].astype(str).str.upper().str.contains("FOTOVOLT", na=False)].copy()
    a["data"] = pd.to_datetime(a["Data de posada en servei"], dayfirst=True, errors="coerce")
    a = a.dropna(subset=["data"])
    a["any"] = a["data"].dt.year
    a["kw"] = pd.to_numeric(a["Potència"], errors="coerce").fillna(0)
    a["ine"] = a["Codi IDESCAT municipi"].str.zfill(6).str[:5]
    a = a[a["ine"].str[:2] == "17"]
    if a.empty:
        return {}, {}, None, None, {}
    ult_mes = a["data"].max().strftime("%Y-%m")
    ult = int(a["any"].max())
    ANYS = list(range(2018, ult + 1))
    # Población por año (padrón) y viviendas (Catastro)
    pobs = {}
    fp = P / "padro" / "poblacio_municipis.csv.gz"
    if fp.exists():
        d = pd.read_csv(fp, dtype={"ine": str})
        for x in d.itertuples():
            pobs.setdefault(x.ine, {})[int(x.any)] = float(x.valor)
    pob_any = lambda ine, y: (lambda s: s.get(y) or (s[min(s, key=lambda k: abs(k - y))] if s else None))(pobs.get(ine, {}))  # noqa: E731
    viv = {}
    try:
        viv = catastro()["viviendas"].to_dict()
    except Exception as e:  # noqa: BLE001
        print("AVISO solar viviendas:", e)
    q = lambda x, y, f=1: (x / y * f) if y else None  # noqa: E731
    mun = {}
    for ine in pobs:
        g = a[a["ine"] == ine]
        o = {}
        for y in ANYS:
            h = g[g["any"] <= y]
            n, kw, nn = len(h), float(h["kw"].sum()), int((g["any"] == y).sum())
            pb = pob_any(ine, y)
            vals = {"n": n, "kw": round(kw, 1), "h": q(n, pb, 1000), "w": q(kw * 1000, pb), "viv": q(n, viv.get(ine), 100),
                    "nn": nn, "nou": q(nn, pb, 1000), "mida": q(kw, n) if n else None,
                    "gran": q(float(h.loc[h["kw"] >= 100, "kw"].sum()), kw, 100) if kw else None}
            for k, v in vals.items():
                if v is not None and not (isinstance(v, float) and math.isnan(v)):
                    o.setdefault(k, {})[y] = round(v, 2 if k in ("h", "viv", "nou", "mida") else 1) if isinstance(v, float) else v
        mun[ine] = o
    # Referencias: provincia (suma de municipios) y Cataluña (agregados mensuales del conjunto completo)
    pob_gi = {y: sum(pob_any(i, y) or 0 for i in pobs) for y in ANYS}
    pob_cat = {}
    fv = P / "vehicles" / "agregats.csv"
    if fv.exists():
        for x in pd.read_csv(fv).to_dict("records"):
            if x["ambit"] == "cat" and x.get("pob") == x.get("pob"):
                pob_cat[int(x["any"])] = float(x["pob"])
    pc = lambda y: pob_cat.get(y) or (pob_cat[min(pob_cat, key=lambda k: abs(k - y))] if pob_cat else None)  # noqa: E731
    ag = {}
    fa = P / "generalitat" / "autoconsum_agregats.csv"
    if fa.exists():
        for x in pd.read_csv(fa).to_dict("records"):
            ag.setdefault(x["ambit"], {})[x["mes"]] = (int(x["n"]), float(x["kw"]))
    mens_gi = a.groupby(a["data"].dt.strftime("%Y-%m")).agg(n=("kw", "size"), kw=("kw", "sum"))
    ag["gi"] = {m: (int(r_.n), float(r_.kw)) for m, r_ in mens_gi.iterrows()}
    refs = {}
    for amb, pobf in (("gi", lambda y: pob_gi.get(y)), ("cat", pc)):
        if amb not in ag:
            continue
        for y in ANYS:
            n = sum(v[0] for m, v in ag[amb].items() if int(m[:4]) <= y)
            kw = sum(v[1] for m, v in ag[amb].items() if int(m[:4]) <= y)
            nn = sum(v[0] for m, v in ag[amb].items() if int(m[:4]) == y)
            pb = pobf(y)
            vals = {"h": q(n, pb, 1000), "w": q(kw * 1000, pb), "nou": q(nn, pb, 1000), "mida": q(kw, n) if n else None}
            if amb == "gi":
                tv = sum(viv.get(i) or 0 for i in pobs)
                vals.update({"n": n, "kw": round(kw, 1), "nn": nn, "viv": q(n, tv, 100),
                             "gran": q(float(a.loc[(a["any"] <= y) & (a["kw"] >= 100), "kw"].sum()), kw, 100) if kw else None})
            for k, v in vals.items():
                if v is not None:
                    refs.setdefault(k, {}).setdefault(y, {})[amb] = round(v, 2) if isinstance(v, float) else v
    # Serie mensual: vatios fotovoltaicos de autoconsumo por habitante (acumulado)
    ser = {}
    for amb, pobf in (("gi", lambda y: pob_gi.get(y)), ("cat", pc)):
        if amb not in ag:
            continue
        acc, pts = 0.0, []
        for m in sorted(ag[amb]):
            acc += ag[amb][m][1]
            y, mm = int(m[:4]), int(m[5:7])
            if y >= 2019 and pobf(y):
                pts.append([round(y + (mm - 1) / 12, 4), m, round(acc * 1000 / pobf(y), 1)])
        ser[amb] = pts
    prov = {"solar": {"tipus": "linia", "u": "W", "dec": 0, "series": ser,
                      "abs": {"n": refs.get("n", {}).get(ult, {}).get("gi"), "kw": refs.get("kw", {}).get(ult, {}).get("gi"), "mes": ult_mes}}} if ser.get("gi") else {}
    return mun, refs, ult, ult_mes, prov


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
    en, refs_en, anys_en, prov_en = ensenyament_indicadores()
    for ine, x in en.items():
        extra_mun.setdefault(ine, {}).update(x)
    anys_extra.update(anys_en)
    refs_ed.update(refs_en)
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
    trib, refs_trib, any_trib = tributs()
    veh, refs_veh, any_veh = vehicles()
    com, refs_com, any_com, x_com, fitxa_com, refs_xcom, punts_com = comerc()
    for ine, x in x_com.items():
        extra_mun.setdefault(ine, {}).update(x)
    if any_com:
        anys_extra.update({"com_buits": 2022, "com_var": any_com})
    sol, refs_sol, any_sol, mes_sol, prov_sol = solar()
    import anuari_aeat_web
    aw = anuari_aeat_web.construir()
    cad, refs_cad, any_cad, usos_cad, usos_cad_ref = cadastre()
    cm, refs_cm, anys_cm, fitxa_cm = complements_indicadores(pob)
    ats, refs_ats = atur_detall()
    for ine, x in cm.items():
        extra_mun.setdefault(ine, {}).update(x)
    anys_extra.update(anys_cm)
    refs_ed.update(refs_cm)
    px, anys_px, fitxa_px, prov_pres, noms_pres = pressupostos(pob)
    for ine, x in px.items():
        extra_mun.setdefault(ine, {}).update(x)
    for ine, x in fitxa_px.items():
        fitxa_cm.setdefault(ine, {}).update(x)
    anys_extra.update(anys_px)
    import habitatge_web
    hw = habitatge_web.construir(pob)
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
            **({"trib": trib[ine]} if ine in trib else {}),
            **({"veh": veh[ine]} if ine in veh else {}),
            **({"ats": ats[ine]} if ine in ats else {}),
            **({"com": com[ine]} if ine in com else {}),
            **({"com_f": fitxa_com[ine]} if ine in fitxa_com else {}),
            **({"sol": sol[ine]} if ine in sol else {}),
            **({"irpf": aw["mun"][ine]} if ine in aw["mun"] else {}),
            **({"cad": cad[ine], "cad_u": usos_cad.get(ine)} if ine in cad else {}),
            **({"nac": nac_mun[ine]} if ine in nac_mun else {}),
            **({"hb": hw["mun"][ine]} if ine in hw["mun"] else {}),
            **({"hbf": hw["fix"][ine]} if ine in hw["fix"] else {}),
            **fitxa_cm.get(ine, {}),
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
    # Nacimientos, defunciones y nombres: sección «Néixer i morir» (fichero aparte) y defunciones por ABS en el mapa
    import demografia_web
    try:
        dw = demografia_web.construir(SALIDA.parent)
        print("demografia:", dw.get("resum"))
        codis_abs = set(zones.get("abs", {})) | set(_codis_abs(P / "salut"))
        for c_, o in dw["abs"].items():
            if c_ in codis_abs:
                zones.setdefault("abs", {}).setdefault(c_, {}).update(o)
        if dw["abs_meta"]:
            de_, a_ = dw["abs_meta"]["de"], dw["abs_meta"]["a"]
            per_ = f"{de_[5:]}/{de_[:4]}-{a_[5:]}/{a_[:4]}"
            anys_arees.update({"def_12m": per_, "def_exces": per_})
            for k_, v_ in dw["abs_meta"]["ref"].items():
                refs_arees.setdefault(k_, {}).update(v_)
    except Exception as e:  # noqa: BLE001 - la web se publica igual sin la sección
        print("demografia: ERROR", type(e).__name__, e)
    zones["aar"] = zona_emx
    zona_aar(zona_emx)
    anys_extra.update(anys_arees)
    # Seguridad y justicia: Mossos por región, mes y tipo; Interior; CGPJ por partido judicial
    import justicia_web
    jw = justicia_web.construir(municipios, SALIDA.parent)
    zones["pj"] = jw["pj"]
    for c, o in jw["abp"].items():
        zones["abp"].setdefault(c, {}).update(o)
    for m in municipios:
        m["x"].update(jw["x"].get(m["ine"], {}))
    anys_extra.update(jw["anys"])
    # Turismo: tema «tur» del mapa, sección Turisme y bloque de la ficha
    import turisme_web
    tw = turisme_web.construir(municipios)
    for m in municipios:
        if m["ine"] in tw["mun"]:
            m["tur"] = tw["mun"][m["ine"]]
        if m["ine"] in tw["fitxa"]:
            m["turf"] = tw["fitxa"][m["ine"]]
    anys_extra.update(tw["anys"])
    # Comercio exterior (AEAT): sección Exportacions, fichero aparte que la web pide al pintarla
    import exportacions_web
    try:
        print("exportacions:", exportacions_web.construir(SALIDA.parent))
    except Exception as e:  # noqa: BLE001 - la web se publica igual sin la sección
        print("exportacions: ERROR", type(e).__name__, e)
    # Movilidad: Enquesta de Mobilitat Quotidiana (ATM Girona), tema «mob», nivel «com» y sección Mobilitat
    import mobilitat_web
    mw = mobilitat_web.construir(municipios, SALIDA.parent)
    for m in municipios:
        if m["ine"] in mw["mun"]:
            m["mob"] = mw["mun"][m["ine"]]
        if m["ine"] in mw["fitxa"]:
            m["mobf"] = mw["fitxa"][m["ine"]]
    if mw["any"]:
        anys_extra["mob"] = mw["any"]
        zones["com"] = mw["com"]
    # Accidentes de tráfico: Servei Català de Trànsit, DGT (vías urbanas) y Mossos. Tema «acc», nivel «com» y gráficos de la provincia
    import incendis_web
    try:
        icw = incendis_web.construir()
        print("incendis:", icw["resum"])
    except Exception as e:  # noqa: BLE001
        print("incendis: ERROR", type(e).__name__, e)
        icw = {"prov": {}}
    # Pymes por demarcación: Pimec, Anuari de la Pime Catalana (cifras copiadas a mano de los PDF)
    import pimec_web
    try:
        pmw = pimec_web.construir()
        print("pimec:", pmw["resum"])
    except Exception as e:  # noqa: BLE001
        print("pimec: ERROR", type(e).__name__, e)
        pmw = {"prov": {}}
    import transit_web
    try:
        trw = transit_web.construir(municipios)
        print("transit:", trw["resum"])
    except Exception as e:  # noqa: BLE001 - la web se publica igual sin accidentes
        print("transit: ERROR", type(e).__name__, e)
        trw = {"mun": {}, "refs": {}, "anys": {}, "com": {}, "prov": {}}
    for m in municipios:
        if m["ine"] in trw["mun"]:
            m["acc"] = trw["mun"][m["ine"]]
    anys_extra.update(trw["anys"])
    for c, o in trw["com"].items():
        zones.setdefault("com", {}).setdefault(c, {}).update(o)
    # Boletín estadístico del Ministerio de Vivienda: viviendas libres iniciadas, precio y compradores de las compraventas, valor tasado
    import mitma_web
    try:
        mtw = mitma_web.construir()
        print("mitma:", mtw["resum"])
    except Exception as e:  # noqa: BLE001 - la web se publica igual sin estos gráficos
        print("mitma: ERROR", type(e).__name__, e)
        mtw = {"prov": {}}
    # Cultura: bibliotecas (DadesBib), equipamientos, entidades, Programa.cat y agenda. Tema «cul», comarcas y gráficos de la provincia
    import cultura_web
    try:
        cuw = cultura_web.construir(municipios)
        print("cultura:", cuw["resum"])
    except Exception as e:  # noqa: BLE001 - la web se publica igual sin cultura
        print("cultura: ERROR", type(e).__name__, e)
        cuw = {"mun": {}, "refs": {}, "anys": {}, "com": {}, "fitxa": {}, "prov": {}}
    for m in municipios:
        if m["ine"] in cuw["mun"]:
            m["cul"] = cuw["mun"][m["ine"]]
        if m["ine"] in cuw["fitxa"]:
            m["cul_f"] = cuw["fitxa"][m["ine"]]
    anys_extra.update(cuw["anys"])
    for c, o in cuw["com"].items():
        zones.setdefault("com", {}).setdefault(c, {}).update({"cul_" + k: v for k, v in o.items()})
    # Medio ambiente: aire y clima por estación, sequía, territorio protegido, playas y agua por comarca. Tema «amb» y sección Medi ambient
    import medi_ambient_web
    try:
        maw = medi_ambient_web.construir(municipios, SALIDA.parent)
        print("medi_ambient:", maw["resum"])
    except Exception as e:  # noqa: BLE001 - la web se publica igual sin medio ambiente
        print("medi_ambient: ERROR", type(e).__name__, e)
        maw = {"mun": {}, "anys": {}, "com": {}, "aire": {}, "met": {}, "fitxa": {}, "prov": {}, "refs": {}}
    for m in municipios:
        if m["ine"] in maw["mun"]:
            m["amb"] = maw["mun"][m["ine"]]
        if m["ine"] in maw["fitxa"]:
            m["amb_f"] = maw["fitxa"][m["ine"]]
    anys_extra.update(maw["anys"])
    for c, o in maw["com"].items():
        zones.setdefault("com", {}).setdefault(c, {}).update({"amb_" + k: v for k, v in o.items()})
    if maw["aire"]:
        zones["aire"] = maw["aire"]
    if maw["met"]:
        zones["met"] = maw["met"]
    # Energía y conectividad: certificados energéticos (municipio y sección), recarga, gasolineras y banda ancha. Tema «ene» y sección Energia
    import energia_web
    try:
        enw = energia_web.construir(municipios)
        print("energia:", enw["resum"])
    except Exception as e:  # noqa: BLE001 - la web se publica igual sin energía
        print("energia: ERROR", type(e).__name__, e)
        enw = {"mun": {}, "sec": {}, "anys": {}, "fitxa": {}, "prov": {}, "refs": {}, "xifres": {}}
    for m in municipios:
        if m["ine"] in enw["mun"]:
            m["en"] = enw["mun"][m["ine"]]
        if m["ine"] in enw["fitxa"]:
            m["en_f"] = enw["fitxa"][m["ine"]]
    anys_extra.update(enw["anys"])
    refs = referencias()
    for k, v in refs_emex.items():
        refs.setdefault(k, {}).update(v)
    for k, v in refs_ed.items():
        refs.setdefault(k, {}).update(v)
    for k, v in refs_arees.items():
        refs.setdefault(k, {}).update(v)
    for k, v in jw["refs"].items():
        refs.setdefault(k, {}).update(v)
    for k, v in refs_xcom.items():
        refs.setdefault(k, {}).update(v)
    for cl, per_any in refs_trib.items():
        refs["trib_" + cl] = per_any[max(per_any)]
    if prov_alq:
        refs.setdefault("lloguer", {})["gi"] = prov_alq[max(prov_alq)]
    datos = {
        "generado": dt.date.today().isoformat(),
        "arees": zones, "ref": refs, "prov": {**provincia_series(), **educacio_series(), **prov_en, **universitaris_series(), **prov_nac, **esperanca_series(), **jw["prov"], **prov_sol, **aw["prov"], **({"bomb_mes": BOMB_MES} if BOMB_MES else {}), **cadastre_prov(refs_cad, any_cad, usos_cad_ref), **hw["prov"], **trw["prov"], **icw["prov"], **pmw["prov"], **cuw["prov"], **mtw["prov"]}, "salut": salut_series(), "pres_noms": noms_pres, "paisos": paisos, "paisos_ordre": paisos_ordre,
        "anys": {**anys_extra, **hw["anys"], **({"trib": any_trib} if any_trib else {}), **({"veh": any_veh} if any_veh else {}), **({"sol": any_sol} if any_sol else {}), **({"irpf": aw["any"]} if aw["any"] else {}), **({"com": any_com} if any_com else {}), **({"cad": any_cad} if any_cad else {}), **({"cad_vm2": cad_districtes()[3], "cad_ibi": max(refs_cad.get("ibi_rec") or {0: 0}) or None} if any_cad else {})},
        "acc_ref": trw["refs"], "cul_ref": cuw["refs"], "amb_ref": maw["refs"], "en_ref": enw["refs"], "en": {"prov": enw["prov"], "x": enw["xifres"]}, "amb": {"prov": maw["prov"], **({"emb": maw["emb"]} if maw.get("emb") else {})}, "trib_ref": refs_trib, "veh_ref": refs_veh, "ats_ref": refs_ats, "sol_ref": refs_sol, "irpf_ref": aw["refs"], "cad_ref": refs_cad, "hb_ref": hw["refs"], "cad_u_ref": usos_cad_ref, "com_ref": refs_com, "sol_mes": mes_sol, "tur": tw["prov"], "tur_ref": tw["refs"], "mob": {"ref": mw["ref"], "s": mw["seccio"], "min_n": mobilitat_web.MIN_N} if mw["any"] else None,
        "provincia": {
            "poblacion": sum(m["poblacion"] or 0 for m in municipios),
            "alquiler": prov_alq, "compraventas": prov_cv, "renta_persona": prov_renta,
            "hut": sum(m["hut"] for m in municipios),
            "viviendas": sum(m["viviendas"] or 0 for m in municipios),
            "viv_antes_1980": sum(m["viv_antes_1980"] or 0 for m in municipios),
            **({"aeat": fitxa_cm["_prov"]["aeat"]} if "_prov" in fitxa_cm else {}),
            **({"pres": prov_pres} if prov_pres else {}),
        },
        "municipios": municipios,
        "fonts": estat_fonts(),
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
    for cusec, x in hw["sec"].items():
        sec.setdefault(cusec, {}).update(x)
    for cusec, x in enw["sec"].items():
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
    if punts_com:
        (SALIDA.parent / "comerc_grans.geojson").write_text(json.dumps(punts_com, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
        print(f"comerc_grans.geojson: {len(punts_com['features'])} grans establiments")
    import shutil
    for nombre in ("municipis.geojson", "seccions.geojson"):
        origen = P / "geo" / nombre
        if origen.exists():
            shutil.copy(origen, SALIDA.parent / nombre)
            print(f"{nombre}: {origen.stat().st_size // 1024} KB")
        else:
            print(f"AVISO: falta {origen}")
    # Resultados electorales por convocatoria (municipio y sección), en ficheros aparte
    import eleccions_web
    print(eleccions_web.construir(SALIDA.parent))


if __name__ == "__main__":
    main()
