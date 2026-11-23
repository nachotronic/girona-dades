"""Educación: Departament d'Educació (Socrata Generalitat) e INE (Censo 2021).

- C2021_Indicadores.csv   INE, indicadores del Censo 2021 por sección censal
                          (t9_1 % con estudios superiores, t7_1 % cursando estudios superiores...)
- xvme-26kg  alumnos matriculados y grupos por centro, enseñanza y titularidad
- kvmv-ahh4  directorio anual de centros docentes (con coordenadas)
- 99md-r3rq  asignación de plazas en la preinscripción (1.ª petición)
- rk5x-gny6  evaluación de 6.º de primaria (por alumno; se agrega en el servidor)
- 59vm-wwq7  evaluación de 4.º de ESO (por alumno; se agrega en el servidor)
- Estadística de l'ensenyament (curso actual, CSV en educacio.gencat.cat): alumnos por municipio,
  etapa, pública/concertada/privada, sexo, zona de nacionalidad y NESE; resultados de ESO del curso
  anterior; personal docente por municipio, sexo y edad; FP por familia profesional.

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


EMOUNIV = "https://www.idescat.cat/pub/?id=emouniv&lang=ca&f=ssv&n={n}"


def _ssv(url: str) -> pd.DataFrame:
    """Tabla de Idescat en formato ssv: cabecera de notas, fila de títulos que empieza por ';' o 'Codi;'."""
    txt = get(url, timeout=120).content.decode("utf-8-sig", errors="replace")
    files = txt.splitlines()
    ini = next(i for i, f in enumerate(files) if f.startswith(";") or f.startswith("Codi;"))
    cos = []
    for f in files[ini:]:
        if not f.strip():
            break
        cos.append(f)
    return pd.read_csv(io.StringIO("\n".join(cos)), sep=";", dtype=str)


def _universitaris(sal) -> str:
    """Movilidad por estudios universitarios (Idescat, emouniv): dónde estudian los residentes."""
    mun = _ssv(EMOUNIV.format(n=8816) + "&geo=mun")
    mun = mun[mun["Codi"].str.startswith("17")]
    mun.to_csv(sal / "univ_municipis.csv", index=False)
    com = _ssv(EMOUNIV.format(n=8816) + "&geo=com")
    com.to_csv(sal / "univ_comarques.csv", index=False)
    taules = {"prov_residents": (8815, "&geo=prov:17"), "prov_desti": (8816, "&geo=prov:17"), "prov_llocs": (8817, "&geo=prov:17"),
              "cat_desti": (8816, ""), "cat_residents": (8815, "")}
    for nom, (n, geo) in taules.items():
        _ssv(EMOUNIV.format(n=n) + geo).to_csv(sal / f"univ_{nom}.csv", index=False)
    return f"universitarios: {len(mun)} municipios, {len(com)} comarcas; columnas {list(mun.columns)}"

EST = "https://educacio.gencat.cat/web/.content/home/departament/estadistiques/estadistiques-ensenyament/curs-actual/"
# etapa -> fichero de alumnos matriculados (municipio, titularidad, concierto, sexo, nacionalidad, NESE)
EST_ALUMNES = {
    "llar": "infantil-1cicle/einf1c-a-csv-01.csv",
    "inf": "infantil-2cicle/einf2c-a-csv-01.csv",
    "pri": "educacio-primaria/pri-a-csv-01.csv",
    "eso": "eso/eso-a-csv-01.csv",
    "batx": "batxillerat/batx-a-csv-01.csv",
    "fp": "fp/fitxers/fp-distancia/fptotal-a-csv-01.csv",
}
EST_DOCENTS = {"inf_pri": "personal-docent-regim-general/einf2ciprimaria-p-csv-03.csv",
               "sec": "personal-docent-regim-general/secundaria-p-csv-03.csv"}
EST_RESULTATS = "eso/eso-a-csv-02.csv"


def _est_csv(ruta: str) -> pd.DataFrame:
    r = get(EST + ruta, timeout=300)
    for enc in ("utf-8-sig", "cp1252"):
        try:
            txt = r.content.decode(enc)
            break
        except UnicodeDecodeError:
            continue
    df = pd.read_csv(io.StringIO(txt), sep=";", dtype=str, keep_default_na=False)
    df.columns = [c.strip() for c in df.columns]
    df["n"] = pd.to_numeric(df[df.columns[-1]], errors="coerce").fillna(0)
    df["ine"] = df["Codi municipi"].str.strip().str.zfill(5)
    return df


def _col(df: pd.DataFrame, *prefixos: str) -> str | None:
    return next((c for c in df.columns for p in prefixos if c.lower().startswith(p.lower())), None)


def _tipus(df: pd.DataFrame) -> pd.Series:
    """pub = público, conc = privado concertado, priv = privado no concertado."""
    cc = _col(df, "Matrícula concertada", "Concertat")
    conc = df[cc].str.strip().str.upper().isin(["SI", "S", "SÍ"]) if cc else pd.Series(False, index=df.index)
    pub = df["Naturalesa"].str.upper().str.startswith("P\u00daBLIC")
    return pd.Series("priv", index=df.index).mask(conc, "conc").mask(pub, "pub")


def _agrega(df: pd.DataFrame, claus: list[str]) -> pd.DataFrame:
    """Suma por municipio de Girona y añade el total de Cataluña (ine = 'CAT')."""
    gi = df[df["ine"].str.startswith("17")].groupby(["ine"] + claus, dropna=False)["n"].sum().reset_index()
    cat = df.groupby(claus, dropna=False)["n"].sum().reset_index()
    cat.insert(0, "ine", "CAT")
    out = pd.concat([gi, cat], ignore_index=True)
    out["n"] = out["n"].astype(int)
    return out[out["n"] > 0]


def _ensenyament(sal) -> str:
    parts, edats, curs, msg = [], [], None, []
    for etapa, ruta in EST_ALUMNES.items():
        try:
            df = _est_csv(ruta)
        except Exception as e:  # noqa: BLE001
            msg.append(f"{etapa} ERROR {type(e).__name__}")
            continue
        curs = curs or df["Curs"].iloc[0]
        df["etapa"], df["tipus"] = etapa, _tipus(df)
        df["sexe"] = df["Sexe"].str.upper().str[0]
        df["zona"] = df[_col(df, "Zona nacionalitat")].str.strip().str.upper()
        nc = _col(df, "Necessitats específiques")
        df["nese"] = df[nc].str.strip().str.upper().str[:1] if nc else ""
        # Edad respecto a la teórica del curso (1.º de primaria = 6, 1.º de ESO = 12, 1.º de bachillerato = 16)
        edat = pd.to_numeric(df["Edat"], errors="coerce") if "Edat" in df.columns else pd.Series(float("nan"), index=df.index)
        df["edat"] = edat.astype("Int64").astype(str).replace("<NA>", "")
        teorica = {"pri": 5, "eso": 11, "batx": 15}.get(etapa)
        nivell = pd.to_numeric(df["Nivell"], errors="coerce") if "Nivell" in df.columns else None
        df["retard"] = ((edat > nivell + teorica).map({True: "S", False: "N"}) if teorica and nivell is not None else "")
        df["retard"] = df["retard"].fillna("")
        claus = ["etapa", "tipus", "sexe", "zona", "nese", "retard"]
        ed = _agrega(df, ["etapa", "edat", "zona"])
        ed.insert(0, "curs", df["Curs"].iloc[0])
        edats.append(ed)
        if etapa == "fp":
            df["familia"] = df[_col(df, "Temàtica")].str.strip()
            df["grau"] = df[_col(df, "Grau")].str.strip()
            fam = _agrega(df, ["grau", "familia"])
            fam.insert(0, "curs", curs)
            fam.to_csv(sal / "ens_fp_families.csv", index=False)
        a = _agrega(df, claus)
        parts.append(a)
        msg.append(f"{etapa} {int(a.loc[a['ine'] != 'CAT', 'n'].sum())}")
    if not parts:
        raise RuntimeError("ningún fichero de alumnos")
    out = pd.concat(parts, ignore_index=True)
    out.insert(0, "curs", curs)
    out.to_csv(sal / "ens_alumnes.csv.gz", index=False)
    pd.concat(edats, ignore_index=True).to_csv(sal / "ens_edats.csv.gz", index=False)
    return f"estadística de l'ensenyament {curs}: alumnos de Girona por etapa: " + ", ".join(msg)


def _ens_docents(sal) -> str:
    parts = []
    for nom, ruta in EST_DOCENTS.items():
        df = _est_csv(ruta)
        df["nivell"], df["tipus"] = nom, _tipus(df)
        df["sexe"] = df["Sexe"].str.upper().str[0]
        df["edat"] = df["Edat"].str.strip().str.upper()
        a = _agrega(df, ["nivell", "tipus", "sexe", "edat"])
        a.insert(0, "curs", df["Curs"].iloc[0])
        parts.append(a)
    out = pd.concat(parts, ignore_index=True)
    out.to_csv(sal / "ens_docents.csv", index=False)
    return f"personal docente {out['curs'].iloc[0]}: {int(out.loc[out['ine'] != 'CAT', 'n'].sum())} en Girona"


def _ens_resultats(sal) -> str:
    df = _est_csv(EST_RESULTATS)
    df["tipus"] = _tipus(df)
    df["nivell"] = df["Nivell"].str.strip()
    df["resultat"] = df[_col(df, "Resultat")].str.strip().str.upper()
    a = _agrega(df, ["nivell", "tipus", "resultat"])
    a.insert(0, "curs", df["Curs"].iloc[0])
    a.to_csv(sal / "ens_resultats_eso.csv", index=False)
    return f"resultados ESO {a['curs'].iloc[0]}: {int(a.loc[a['ine'] != 'CAT', 'n'].sum())} alumnos evaluados en Girona"


def ejecutar() -> str:
    sal = carpeta("educacio")
    lineas = []
    passos = [("censo", lambda: _censo(sal)), ("matricula", lambda: _matricula(sal)), ("centres", lambda: _centres(sal)),
              ("preinscripcio", lambda: _preinscripcio(sal)),
              ("6e", lambda: _avaluacio(sal, "rk5x-gny6", "6e")), ("4eso", lambda: _avaluacio(sal, "59vm-wwq7", "4eso")),
              ("universitaris", lambda: _universitaris(sal)),
              ("ensenyament", lambda: _ensenyament(sal)), ("docents", lambda: _ens_docents(sal)),
              ("resultats", lambda: _ens_resultats(sal))]
    for nom, f in passos:
        try:
            lineas.append(f())
        except Exception as e:  # noqa: BLE001
            lineas.append(f"{nom}: ERROR {type(e).__name__}: {str(e)[:300]}")
    (sal / "estat.json").write_text(json.dumps(lineas, ensure_ascii=False, indent=1), encoding="utf-8")
    return "\n".join(lineas)
