"""Social: servicios sociales, dependencia, equipamientos sociales y alquiler turístico de Airbnb.

- ivft-vegh  Registre d'entitats, serveis i establiments socials (RESES): servicios de la provincia con tipología y plazas
- fvnd-jbxf  personas atendidas por los servicios sociales básicos, por ente local (municipios > 20.000 hab. y consejos comarcales)
- jmq2-kiub  servicio de comedor social, por ente local
- fp8n-2tg5  beneficiarios de prestación o servicio de dependencia por grado, por comarca
- d89u-ybpd  teleasistencia, por comarca;  abpu-8jdu  ayuda a domicilio, por comarca
- 4d3w-u7sx  prestaciones económicas de dependencia (cuidador no profesional), por comarca
- 84qn-my68  personas cuidadoras no profesionales, por municipio de residencia (agregado en el servidor)
- Inside Airbnb, «Girona, Catalonia, Spain»: anuncios de la última instantánea (se guarda cada una para hacer serie)

Escribe en data/processed/social/.
"""
from __future__ import annotations

import io
import re
import urllib.parse

import pandas as pd

from .comun import carpeta, get, normaliza
from .territorio import municipios

DOMINIO = "https://analisi.transparenciacatalunya.cat"
AIRBNB = "https://insideairbnb.com/get-the-data/"
COMARCALS = {"fp8n-2tg5": "dependencia_grau", "d89u-ybpd": "teleassistencia", "abpu-8jdu": "ajuda_domicili", "4d3w-u7sx": "prestacio_cuidador"}


def soql(ident: str, **params) -> pd.DataFrame:
    params.setdefault("$limit", 5_000_000)
    r = get(f"{DOMINIO}/resource/{ident}.csv?{urllib.parse.urlencode(params)}", timeout=900)
    return pd.read_csv(io.BytesIO(r.content), dtype=str, low_memory=False)


def _ine(noms: pd.Series) -> pd.Series:
    mun = municipios()
    per_nom = dict(zip(mun["nom_normalitzat"], mun["codi_ine"].astype(str).str.zfill(5)))
    per_nom.update({"aro castell platja": "17048", "calonge": "17034"})
    return noms.fillna("").map(lambda s: per_nom.get(normaliza(s)))


def _reses(d) -> str:
    r = soql("ivft-vegh", **{"$where": "starts_with(cp, '17')"})
    r["ine"] = _ine(r["municipi"])
    r.drop(columns=[c for c in r.columns if c.startswith(":@")], errors="ignore").to_csv(d / "reses.csv", index=False)
    return f"RESES: {len(r)} servicios, {r['ine'].notna().mean():.0%} con municipio, {pd.to_numeric(r['capacitat'], errors='coerce').sum():,.0f} plazas"


def _serveis(d) -> str:
    lin = []
    for ident, nom in (("fvnd-jbxf", "ssb_ateses"), ("jmq2-kiub", "menjador")):
        x = soql(ident)
        x.to_csv(d / f"{nom}.csv", index=False)
        lin.append(f"{nom} {len(x)} filas hasta {x['any'].max()}")
    for ident, nom in COMARCALS.items():
        x = soql(ident)
        x.to_csv(d / f"{nom}.csv", index=False)
        lin.append(f"{nom} {len(x)} filas hasta {x['any'].max()}")
    c = soql("84qn-my68", **{"$select": "codi_municipi_residencia as ine, sexe, count(*) as n", "$group": "codi_municipi_residencia, sexe"})
    c.to_csv(d / "cuidadors.csv", index=False)
    lin.append(f"cuidadores {pd.to_numeric(c['n']).sum():,.0f} en Cataluña")
    return "servicios sociales: " + "; ".join(lin)


def _airbnb(d) -> str:
    html = get(AIRBNB, timeout=120).text
    urls = re.findall(r'https://data\.insideairbnb\.com/spain/catalonia/girona/(\d{4}-\d{2}-\d{2})/visualisations/listings\.csv', html)
    if not urls:
        raise RuntimeError("no hay enlace de Girona en Inside Airbnb")
    dia = max(urls)
    f = d / f"airbnb_{dia}.csv.gz"
    if not f.exists():
        r = get(f"https://data.insideairbnb.com/spain/catalonia/girona/{dia}/visualisations/listings.csv", timeout=600)
        x = pd.read_csv(io.BytesIO(r.content), dtype=str)
        x.to_csv(f, index=False, compression="gzip")
        nou = "nueva"
    else:
        x = pd.read_csv(f, dtype=str)
        nou = "ya estaba"
    return f"Airbnb: instantánea {dia} ({nou}), {len(x)} anuncios, columnas {list(x.columns)[:18]}"


def ejecutar() -> str:
    d = carpeta("social")
    lineas = []
    for f in (_reses, _serveis, _airbnb):
        try:
            lineas.append(f(d))
        except Exception as e:  # noqa: BLE001
            lineas.append(f"{f.__name__}: ERROR {type(e).__name__}: {str(e)[:300]}")
    return "\n".join(lineas)
