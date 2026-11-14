"""Educación: Departament d'Educació (Socrata Generalitat) e INE (Censo 2021).

- C2021_Indicadores.csv   INE, indicadores del Censo 2021 por sección censal
                          (t9_1 % con estudios superiores, t7_1 % cursando estudios superiores...)
- xvme-26kg  alumnos matriculados y grupos por centro, enseñanza y titularidad
- kvmv-ahh4  directorio anual de centros docentes (con coordenadas)
- 99md-r3rq  asignación de plazas en la preinscripción (1.ª petición)
- rk5x-gny6  evaluación de 6.º de primaria (por alumno; se agrega en el servidor)
- 59vm-wwq7  evaluación de 4.º de ESO (por alumno; se agrega en el servidor)

Cada parte va en su propio try para que un fallo no tumbe las demás.
"""
from __future__ import annotations

import io
import json

import pandas as pd

from .comun import carpeta, get
from .salut import DOMINIO, soql

CENSO = "https://www.ine.es/censos2021/C2021_Indicadores.csv"


def _columnas(ident: str) -> dict[str, str]:
    meta = get(f"{DOMINIO}/api/views/{ident}.json", timeout=120).json()
    return {c["fieldName"]: c.get("dataTypeName", "") for c in meta.get("columns", [])}


def _censo(sal) -> str:
    r = get(CENSO, timeout=600)
    df = pd.read_csv(io.BytesIO(r.content), dtype=str)
    # Valores de referencia de Cataluña y España, ponderados por la población de 16 años o más
    num = df[[c for c in df.columns if c.startswith("t")]].apply(pd.to_numeric, errors="coerce")
    pes = num["t1_1"] * (1 - num["t4_1"])
    refs = {}
    for zona, mask in (("esp", pd.Series(True, index=df.index)), ("cat", df["ccaa"] == "09"), ("gi", df["cpro"] == "17")):
        w = pes[mask]
        refs[zona] = {c: round(float((num.loc[mask, c] * w).sum() / w.sum()), 4) for c in ("t7_1", "t8_1", "t9_1", "t10_1", "t5_1", "t6_1")}
    (sal / "censo2021_refs.json").write_text(json.dumps(refs, indent=1), encoding="utf-8")
    df = df[df["cpro"] == "17"].copy()
    df["seccion"] = df["cpro"] + df["cmun"] + df["dist"] + df["secc"]
    df["ine"] = df["cpro"] + df["cmun"]
    cols = ["seccion", "ine"] + [c for c in df.columns if c.startswith("t")]
    df[cols].to_csv(sal / "censo2021_seccions.csv", index=False)
    return f"censo 2021: {len(df)} secciones de Girona"


def _matricula(sal) -> str:
    cols = _columnas("xvme-26kg")
    curs = "curs" if "curs" in cols else "any"
    ult = soql("xvme-26kg", **{"$select": f"max({curs}) as c"})["c"].iloc[0]
    sel = (f"{curs} as curs, codi_municipi_5, nom_ensenyament, nom_estudis, nivell, nom_naturalesa, "
           "sum(matr_cules_total) as alumnes, sum(unitats) as grups")
    grp = f"{curs}, codi_municipi_5, nom_ensenyament, nom_estudis, nivell, nom_naturalesa"
    df = soql("xvme-26kg", **{"$select": sel, "$group": grp, "$where": f"{curs}='{ult}'"})
    df.to_csv(sal / "matricula.csv.gz", index=False)
    # Serie de Cataluña y Girona por curso y enseñanza (todas las temporadas)
    hist = soql("xvme-26kg", **{
        "$select": f"{curs} as curs, codi_municipi_5, nom_ensenyament, nom_naturalesa, "
                   "sum(matr_cules_total) as alumnes, sum(unitats) as grups",
        "$group": f"{curs}, codi_municipi_5, nom_ensenyament, nom_naturalesa"})
    hist["gi"] = hist["codi_municipi_5"].astype(str).str.startswith("17")
    for c in ("alumnes", "grups"):
        hist[c] = pd.to_numeric(hist[c], errors="coerce")
    hist = hist.groupby(["curs", "gi", "nom_ensenyament", "nom_naturalesa"], dropna=False)[["alumnes", "grups"]].sum().reset_index()
    hist.to_csv(sal / "matricula_historic.csv", index=False)
    gi = df[df["codi_municipi_5"].astype(str).str.startswith("17")]
    return f"matrícula {ult}: {len(df)} filas ({len(gi)} de Girona); histórico {len(hist)} filas"


def _centres(sal) -> str:
    cols = _columnas("kvmv-ahh4")
    curs = "curs" if "curs" in cols else next((c for c in cols if c.startswith("curs")), None)
    ult = soql("kvmv-ahh4", **{"$select": f"max({curs}) as c"})["c"].iloc[0]
    df = soql("kvmv-ahh4", **{"$where": f"{curs}='{ult}'"})
    mun = next(c for c in ("codi_municipi_5", "codi_municipi") if c in df.columns)
    df = df[df[mun].astype(str).str[:2] == "17"]
    fora = [c for c in df.columns if c.startswith(":@") or c in ("e_mail_centre", "fax", "telefon", "tel_fon")]
    df.drop(columns=fora).to_csv(sal / "centres.csv", index=False)
    return f"centros {ult}: {len(df)} en Girona"


def _preinscripcio(sal) -> str:
    cols = _columnas("99md-r3rq")
    curs = "curs" if "curs" in cols else "any"
    df = soql("99md-r3rq", **{
        "$select": f"{curs} as curs, codi_municipi_5, nivell, nom_ensenyament, sum(oferta_inicial_places) as places, "
                   "sum(assignacions) as assig, sum(assignacions_1a_peticio) as primera",
        "$group": f"{curs}, codi_municipi_5, nivell, nom_ensenyament"})
    df.to_csv(sal / "preinscripcio.csv.gz", index=False)
    return f"preinscripción: {len(df)} filas, cursos {sorted(df['curs'].unique())[-3:]}"


def _avaluacio(sal, ident: str, nom: str) -> str:
    cols = _columnas(ident)
    any_ = "any" if "any" in cols else next((c for c in cols if c.startswith("curs")), None)
    mats = [c for c in ("pcat", "pcast", "pang", "pmat", "pcien", "pfran") if c in cols]
    num = lambda c: c if cols.get(c) == "number" else f"{c}::number"  # noqa: E731
    sel = ", ".join([f"{any_} as any", "area_territorial", "count(*) as n"] + [f"avg({num(c)}) as {c}" for c in mats])
    df = soql(ident, **{"$select": sel, "$group": f"{any_}, area_territorial"})
    tot = soql(ident, **{"$select": ", ".join([f"{any_} as any", "count(*) as n"] + [f"avg({num(c)}) as {c}" for c in mats]),
                         "$group": any_})
    tot["area_territorial"] = "CATALUNYA"
    pd.concat([df, tot]).to_csv(sal / f"avaluacio_{nom}.csv", index=False)
    return f"evaluación {nom}: {len(df)} filas, áreas {sorted(df['area_territorial'].dropna().unique())[:12]}"


def ejecutar() -> str:
    sal = carpeta("educacio")
    lineas = []
    passos = [("censo", lambda: _censo(sal)), ("matricula", lambda: _matricula(sal)), ("centres", lambda: _centres(sal)),
              ("preinscripcio", lambda: _preinscripcio(sal)),
              ("6e", lambda: _avaluacio(sal, "rk5x-gny6", "6e")), ("4eso", lambda: _avaluacio(sal, "59vm-wwq7", "4eso"))]
    for nom, f in passos:
        try:
            lineas.append(f())
        except Exception as e:  # noqa: BLE001
            lineas.append(f"{nom}: ERROR {type(e).__name__}: {str(e)[:300]}")
    (sal / "estat.json").write_text(json.dumps(lineas, ensure_ascii=False, indent=1), encoding="utf-8")
    return "\n".join(lineas)
