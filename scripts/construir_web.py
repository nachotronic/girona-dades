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


def r(x, n=0):
    return None if x is None or (isinstance(x, float) and math.isnan(x)) else (round(x, n) if n else int(round(x)))


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
    datos = {
        "generado": dt.date.today().isoformat(),
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
    SALIDA.write_text(json.dumps(datos, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
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
