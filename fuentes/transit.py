"""Accidentes de tráfico: Servei Català de Trànsit, DGT y Mossos d'Esquadra.

- Socrata Generalitat (Servei Català de Trànsit):
    rmgc-ncpb  accidentes con muertos o heridos graves en Cataluña, uno por fila, con municipio,
               comarca y zona (carretera o zona urbana), desde 2010
- Socrata Generalitat (Mossos d'Esquadra):
    iaq4-5fyp  intervenciones en accidentes de tráfico por región policial y mes, desde 2011
- DGT, datos municipales de siniestralidad (anual, desde 2014): accidentes con víctimas en
  vías urbanas, muertos y heridos (hospitalizados o no) por tipo de usuario y municipio.
  https://www.dgt.es/export/sites/web-DGT/.galleries/downloads/dgt-en-cifras/informacion_municipal/
  Datos-municipales-siniestralidad/DatosMunicipalesSiniestralidad_<año>.xlsx

Escribe en data/processed/transit/:
  sct_accidents.csv.gz   accidentes graves de la provincia (una fila por accidente)
  sct_catalunya.csv      Cataluña por año, demarcación y zona (accidentes, muertos, heridos)
  dgt_urba.csv           DGT, vías urbanas: municipios de Girona por año (y columnas por usuario)
  dgt_agregats.csv       DGT, vías urbanas: totales de Girona, Cataluña y España por año
  mossos_mes.csv         intervenciones de los Mossos por mes: región de Girona y Cataluña
"""
from __future__ import annotations

import datetime as dt
import io
import urllib.parse

import pandas as pd

from .comun import carpeta, get

DOMINIO = "https://analisi.transparenciacatalunya.cat"
DGT = ("https://www.dgt.es/export/sites/web-DGT/.galleries/downloads/dgt-en-cifras/informacion_municipal/"
       "Datos-municipales-siniestralidad/DatosMunicipalesSiniestralidad_{a}.xlsx")
DGT_DESDE = 2014
CAT = ("08", "17", "25", "43")
COLS_SCT = ["any", "dat", "hor", "nommun", "nomcom", "nomdem", "zona", "d_tipus_via", "via", "tipacc", "d_subtipus_accident",
            "f_morts", "f_ferits_greus", "f_ferits_lleus", "f_victimes", "f_vianants_implicades", "f_bicicletes_implicades",
            "f_ciclomotors_implicades", "f_motocicletes_implicades", "f_veh_lleugers_implicades", "f_veh_pesants_implicades",
            "f_altres_unit_implicades", "f_unitats_implicades"]


def soql(ident: str, **params) -> pd.DataFrame:
    params.setdefault("$limit", 2_000_000)
    r = get(f"{DOMINIO}/resource/{ident}.csv?{urllib.parse.urlencode(params)}", timeout=900)
    return pd.read_csv(io.BytesIO(r.content), dtype=str, low_memory=False)


def sct(sal) -> list[str]:
    d = soql("rmgc-ncpb", **{"$where": "nomdem = 'Girona'"})
    falten = [c for c in COLS_SCT if c not in d.columns]
    d = d[[c for c in COLS_SCT if c in d.columns]]
    d.to_csv(sal / "sct_accidents.csv.gz", index=False)
    c = soql("rmgc-ncpb", **{"$select": "any, nomdem, zona, count(*) as n, sum(f_morts) as morts, sum(f_ferits_greus) as greus, "
                                        "sum(f_ferits_lleus) as lleus", "$group": "any, nomdem, zona", "$order": "any"})
    c.to_csv(sal / "sct_catalunya.csv", index=False)
    anys = pd.to_numeric(d["any"], errors="coerce")
    res = [f"SCT: {len(d)} accidentes graves en la provincia ({anys.min():.0f}-{anys.max():.0f}), "
           f"{d['nommun'].nunique()} municipios; Cataluña {len(c)} filas"]
    if falten:
        res.append(f"AVISO columnas que ya no están: {falten}")
    return res


def _dgt_any(a: int) -> pd.DataFrame:
    r = get(DGT.format(a=a), timeout=300)
    d = pd.read_excel(io.BytesIO(r.content), dtype={"Código INE": str})
    d = d.rename(columns={"Código INE": "ine", "Municipio": "municipi", "Provincia": "provincia", "Comunidad Autónoma": "ccaa"})
    d["ine"] = d["ine"].astype(str).str.strip().str.zfill(5)
    d = d[d["ine"].str.fullmatch(r"\d{5}")]
    d.insert(0, "any", a)
    return d


def dgt(sal) -> list[str]:
    f, fa = sal / "dgt_urba.csv", sal / "dgt_agregats.csv"
    vell = pd.read_csv(f, dtype={"ine": str}) if f.exists() else pd.DataFrame(columns=["any", "ine"])
    agr = pd.read_csv(fa) if fa.exists() else pd.DataFrame(columns=["any", "ambit"])
    fets = set(vell["any"].astype(int)) if len(vell) else set()
    res = []
    for a in range(DGT_DESDE, dt.date.today().year):
        # Los dos últimos años se vuelven a descargar: la DGT consolida las cifras con retraso
        if a in fets and a < dt.date.today().year - 2:
            continue
        try:
            d = _dgt_any(a)
        except Exception as e:  # noqa: BLE001
            if "404" in str(e):
                res.append(f"DGT {a}: todavía no publicado")
            else:
                res.append(f"ERROR DGT {a}: {type(e).__name__}: {str(e)[:120]}")
            continue
        num = [c for c in d.columns if c not in ("any", "ine", "municipi", "provincia", "ccaa")]
        for c in num:
            d[c] = pd.to_numeric(d[c], errors="coerce").fillna(0)
        gi = d[d["ine"].str[:2] == "17"]
        vell = pd.concat([vell[vell["any"].astype(int) != a], gi], ignore_index=True)
        t = []
        for ambit, sel in (("gi", d["ine"].str[:2] == "17"), ("cat", d["ine"].str[:2].isin(CAT)), ("esp", d["ine"].str[:2] != "")):
            t.append({"any": a, "ambit": ambit, **d.loc[sel, num].sum().to_dict()})
        agr = pd.concat([agr[agr["any"].astype(int) != a], pd.DataFrame(t)], ignore_index=True)
        tg = t[0]
        res.append(f"DGT {a}: {len(gi)} municipios de Girona; urbanas Girona {tg.get('Nº Accidentes con Víctimas', 0):.0f} accidentes, "
                   f"{tg.get('Fallecidos', 0):.0f} muertos; España {t[2].get('Nº Accidentes con Víctimas', 0):.0f}")
    if len(vell):
        vell.sort_values(["any", "ine"]).to_csv(f, index=False)
        agr.sort_values(["any", "ambit"]).to_csv(fa, index=False)
    return res


def mossos(sal) -> list[str]:
    d = soql("iaq4-5fyp", **{"$select": "any, mes, regi_policial_rp, sum(nombre_intervencions) as n",
                             "$group": "any, mes, regi_policial_rp"})
    d["n"] = pd.to_numeric(d["n"], errors="coerce").fillna(0)
    d["ambit"] = d["regi_policial_rp"].str.contains("GIRONA", case=False).map({True: "gi", False: "resta"})
    m = d.groupby(["any", "mes", "ambit"])["n"].sum().unstack(fill_value=0).reset_index()
    m["cat"] = m.get("gi", 0) + m.get("resta", 0)
    m["any"], m["mes"] = m["any"].astype(int), m["mes"].astype(int)
    m = m.sort_values(["any", "mes"])[["any", "mes", "gi", "cat"]]
    m.to_csv(sal / "mossos_mes.csv", index=False)
    u = m.iloc[-1]
    return [f"Mossos: {len(m)} meses, último {int(u['any'])}-{int(u['mes']):02d} (Girona {u['gi']:.0f} intervenciones)"]


def ejecutar() -> str:
    sal = carpeta("transit")
    lineas = []
    for nom, f in (("SCT", sct), ("DGT", dgt), ("Mossos", mossos)):
        try:
            lineas += f(sal)
        except Exception as e:  # noqa: BLE001
            lineas.append(f"ERROR {nom}: {type(e).__name__}: {str(e)[:200]}")
    return "\n".join(lineas)
