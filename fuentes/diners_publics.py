"""Dinero público: subvenciones (RAISC) y contratos públicos de la provincia de Girona.

- s9xt-n979  concesiones del Registre de subvencions i ajuts de Catalunya (RAISC). Se agrega en el servidor:
             · lo que reciben los beneficiarios de cada comarca de la provincia (codi_territorial = comarca_provincia), por año,
               administración que concede y finalidad
             · lo que concede cada ayuntamiento de Cataluña, por año (se filtran los de Girona al construir la web)
- hb6v-jcbf  Registre públic de contractes: contratos de cada ayuntamiento por ejercicio y procedimiento (agregado)
- ybgg-dgi6  Plataforma de serveis de contractació pública: publicaciones de los órganos de la provincia (codi_ine10 17…),
             con ofertas recibidas, tipo de empresa e importes, contrato a contrato

Escribe en data/processed/diners_publics/.
"""
from __future__ import annotations

import datetime as dt
import io
import urllib.parse

import pandas as pd

from .comun import carpeta, get, normaliza
from .territorio import municipios

DOMINIO = "https://analisi.transparenciacatalunya.cat"
CAMPS_PLAT = ["codi_ine10", "nom_organ", "nom_departament_ens", "codi_expedient", "numero_lot", "tipus_contracte", "procediment",
              "fase_publicacio", "denominacio", "import_adjudicacio_sense", "ofertes_rebudes", "tipus_empresa", "data_adjudicacio_contracte",
              "data_publicacio_adjudicacio", "data_publicacio_formalitzacio", "es_agregada", "codi_cpv", "resultat"]


def soql(ident: str, timeout: int = 1800, **params) -> pd.DataFrame:
    params.setdefault("$limit", 5_000_000)
    q = urllib.parse.urlencode(params)
    r = get(f"{DOMINIO}/resource/{ident}.csv?{q}", timeout=timeout)
    return pd.read_csv(io.BytesIO(r.content), dtype=str, low_memory=False)


def _ines_ajuntaments(noms: pd.Series) -> pd.Series:
    """'Ajuntament de la Bisbal d'Empordà' -> 17023 (solo municipios de la provincia)."""
    mun = municipios()
    per_nom = dict(zip(mun["nom_normalitzat"], mun["codi_ine"].astype(str).str.zfill(5)))
    # Nombres cortos que usan algunos ayuntamientos
    per_nom.update({"aro castell platja": "17048", "calonge": "17034", "aro castell": "17048"})
    net = noms.fillna("").str.replace(r"(?i)^\s*ajuntament\s+(de\s+|d['’]\s*)?", "", regex=True)
    return net.map(lambda s: per_nom.get(normaliza(s)))


def _subvencions(d) -> str:
    any_ = dt.date.today().year
    # Lo que reciben los beneficiarios de cada comarca de la provincia
    c = soql("s9xt-n979", **{
        "$select": "codi_territorial, date_extract_y(data_concessi) as any, administraci_codi, administraci_, finalitat_p_blica_codi, finalitat_p_blica, "
                   "tipus_de_beneficiaris_codi, count(*) as n, sum(import_subvenci_pr_stec_ajut) as import",
        "$where": "codi_territorial like '%_17' and data_concessi >= '2016-01-01'",
        "$group": "codi_territorial, any, administraci_codi, administraci_, finalitat_p_blica_codi, finalitat_p_blica, tipus_de_beneficiaris_codi"})
    c.to_csv(d / "subv_comarques.csv.gz", index=False, compression="gzip")
    # Toda Cataluña por año y administración (referencia por habitante)
    t = soql("s9xt-n979", **{
        "$select": "date_extract_y(data_concessi) as any, administraci_codi, count(*) as n, sum(import_subvenci_pr_stec_ajut) as import",
        "$where": "data_concessi >= '2016-01-01'", "$group": "any, administraci_codi"})
    t.to_csv(d / "subv_catalunya.csv", index=False)
    # Lo que concede cada ayuntamiento (todas las finalidades), por año
    a = soql("s9xt-n979", **{
        "$select": "departament_o_entitat_local_d_adscripci_ as ens, date_extract_y(data_concessi) as any, finalitat_p_blica, count(*) as n, "
                   "sum(import_subvenci_pr_stec_ajut) as import",
        "$where": "administraci_codi = '004' and data_concessi >= '2016-01-01'", "$group": "ens, any, finalitat_p_blica"})
    a["ine"] = _ines_ajuntaments(a["ens"])
    a = a[a["ine"].notna()]
    a.to_csv(d / "subv_ajuntaments.csv", index=False)
    return (f"subvenciones: {len(c)} filas comarcales ({pd.to_numeric(c['import'], errors='coerce').sum() / 1e6:,.0f} M€), "
            f"{a['ine'].nunique()} ayuntamientos que conceden, hasta {pd.to_numeric(c['any'], errors='coerce').max():.0f} (año {any_})")


def _contractes(d) -> str:
    # Registre públic de contractes: ayuntamientos por ejercicio y procedimiento
    r = soql("hb6v-jcbf", timeout=2400, **{
        "$select": "organisme_contractant, exercici, procediment_adjudicacio, tipus_contracte, count(*) as n, sum(import_adjudicacio) as import",
        "$where": "starts_with(organisme_contractant, 'Ajuntament')",
        "$group": "organisme_contractant, exercici, procediment_adjudicacio, tipus_contracte"})
    r["ine"] = _ines_ajuntaments(r["organisme_contractant"])
    gi = r[r["ine"].notna()]
    gi.to_csv(d / "contractes_registre.csv", index=False)
    # Referencia: todos los ayuntamientos de Cataluña por ejercicio y procedimiento
    r.groupby(["exercici", "procediment_adjudicacio"], dropna=False).agg(
        n=("n", lambda s: pd.to_numeric(s, errors="coerce").sum()), imp=("import", lambda s: pd.to_numeric(s, errors="coerce").sum())
    ).reset_index().to_csv(d / "contractes_registre_cat.csv", index=False)
    # Plataforma: contrato a contrato, órganos de la provincia
    p = soql("ybgg-dgi6", **{"$select": ",".join(CAMPS_PLAT), "$where": "starts_with(codi_ine10, '17')"})
    p.to_csv(d / "contractes_plataforma.csv.gz", index=False, compression="gzip")
    return (f"contratos: registro {gi['ine'].nunique()} ayuntamientos de Girona ({len(gi)} filas), ejercicios {gi['exercici'].min()}-{gi['exercici'].max()}; "
            f"plataforma {len(p)} publicaciones")


def ejecutar() -> str:
    d = carpeta("diners_publics")
    lineas = []
    for f in (_subvencions, _contractes):
        try:
            lineas.append(f(d))
        except Exception as e:  # noqa: BLE001
            lineas.append(f"{f.__name__}: ERROR {type(e).__name__}: {str(e)[:300]}")
    return "\n".join(lineas)
