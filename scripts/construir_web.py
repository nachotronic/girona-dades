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


def compraventas():
    df = pd.read_csv(uno("mitma/34010210_*"), header=None, dtype=str)
    anys = df.iloc[4].ffill()
    cols = {}
    for j in range(1, df.shape[1]):
        a = str(anys.iloc[j])
        if a.startswith("Año"):
            cols.setdefault(int(a.split()[1]), []).append(j)
    filas = df.iloc[9:]
    nombres = dict(zip(territorio()["nom_normalitzat"], territorio()["codi_ine"]))
    res = {}
    for _, f in filas.iterrows():
        n = normaliza(f[0])
        ine = nombres.get(n)
        if not ine and n:
            # Municipios renombrados tras fusiones ("Palamós" -> "Palamós i Sant Joan")
            cand = [k for k in nombres if set(n.split()) <= set(k.split())]
            ine = nombres[cand[0]] if len(cand) == 1 else None
        if not ine:
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
        }
    return res


def r(x, n=0):
    return None if x is None or (isinstance(x, float) and math.isnan(x)) else (round(x, n) if n else int(round(x)))


def main():
    t = territorio()
    pob, etca = poblacion()
    alq = alquiler()
    cv = compraventas()
    renta_p = atlas("31016.csv.gz", "Renta neta media por persona")
    renta_h = atlas("31016.csv.gz", "Renta neta media por hogar")
    gini = atlas("37697.csv.gz", "Índice de Gini")
    hu = hut()
    cat = catastro()

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
            "renta_persona": {k: r(v) for k, v in renta_p.get(ine, {}).items()},
            "renta_hogar": {k: r(v) for k, v in renta_h.get(ine, {}).items()},
            "gini": {k: r(v, 1) for k, v in gini.get(ine, {}).items()},
            "hut": int(hu.get(ine, 0)),
            "viviendas": r(viv),
            "anyo_mediano": r(cat.loc[ine, "anyo_mediano"]) if ine in cat.index else None,
            "viv_antes_1980": r(cat.loc[ine, "viv_antes_1980"]) if ine in cat.index else None,
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
