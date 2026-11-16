"""Ministerio del Interior, Balance de Criminalidad (trimestral, acumulado del año).

Portal Estadístico de Criminalidad: la página «balances» enlaza cada trimestre
(/DatosBalanceAnt/AAAAT/); el índice PC-Axis de cada trimestre da las tres tablas
(comunidades, provincias y municipios de más de 20.000 habitantes) y se descargan en CSV.

Se guardan los cuartos trimestres (año completo) desde 2019 y el último trimestre publicado:
municipios de la provincia (17xxx), provincias de Cataluña, Cataluña y total nacional.
"""
from __future__ import annotations

import io
import re

import pandas as pd

from .comun import carpeta, get, normaliza

MIR = "https://estadisticasdecriminalidad.ses.mir.es"
CAT_PROV = {"barcelona", "girona", "lleida", "tarragona"}


def _taules(path: str) -> list[tuple[str, str, str]]:
    """[(carpeta, fichero, título)] de un trimestre."""
    h = get(f"{MIR}/sec/dynPx/inebase/index.htm?type=pcaxis&path=/{path}&file=pcaxis", timeout=120).text
    return [(c, f, t.strip()) for c, f, t in re.findall(r'Tabla\.htm\?path=/([^/]+)/l0/&amp;file=([\w.]+)\.px[^>]*>([^<]+)', h)]


def _csv(carpeta_px: str, fitxer: str) -> pd.DataFrame:
    r = get(f"{MIR}/sec/jaxiPx/files/_px/es/csv_bdsc/{carpeta_px}/l0/{fitxer}.csv_bdsc?nocab=1", timeout=300)
    txt = r.content.decode("iso-8859-15").lstrip("﻿")
    d = pd.read_csv(io.StringIO(txt), sep=";", dtype=str)
    d.columns = ["zona", "tipologia", "periode", "valor"][: len(d.columns)]
    return d


def ejecutar() -> str:
    lineas = []
    h = get(f"{MIR}/publico/portalestadistico/balances", timeout=120).text
    paths = sorted(set(re.findall(r"(DatosBalance\w*/(\d{4})(\d)/)", h)), key=lambda x: (x[1], x[2]))
    if not paths:
        raise RuntimeError("no hay trimestres en la página de balances")
    ultim = paths[-1]
    tria = [p for p in paths if p[2] == "4" and int(p[1]) >= 2019] + ([ultim] if ultim[2] != "4" else [])
    files = []
    for path, a, t in tria:
        try:
            taules = _taules(path)
        except Exception as e:  # noqa: BLE001
            lineas.append(f"ERROR índice {a}T{t}: {e}")
            continue
        for carp, fitxer, tit in taules:
            nivell = "mun" if "unicipio" in tit else "prov" if "rovincia" in tit else "ccaa" if "omunidad" in tit else None
            if not nivell:
                continue
            try:
                d = _csv(carp, fitxer)
            except Exception as e:  # noqa: BLE001
                lineas.append(f"ERROR {a}T{t} {nivell}: {e}")
                continue
            z = d["zona"].astype(str).str.strip()
            if nivell == "mun":
                d = d[z.str.match(r"^17\d{3}\s")]
                d["codi"] = d["zona"].str[:5]
                d["zona"] = d["zona"].str[6:].str.strip()
            elif nivell == "prov":
                d = d[z.map(lambda x: normaliza(x) in CAT_PROV) | z.str.contains("Nacional", case=False)]
                d["codi"] = d["zona"].map(lambda x: "ESP" if "acional" in x else normaliza(x))
            else:
                d = d[z.str.contains("CATALU", case=False) | z.str.contains("Nacional", case=False)]
                d["codi"] = d["zona"].map(lambda x: "ESP" if "acional" in x else "CAT")
            d = d[~d["periode"].astype(str).str.contains("Variaci", case=False)]
            d["valor"] = pd.to_numeric(d["valor"].astype(str).str.replace(".", "", regex=False).str.replace(",", ".", regex=False), errors="coerce")
            d["any_pub"], d["trim_pub"], d["nivell"] = int(a), int(t), nivell
            files.append(d)
        lineas.append(f"{a}T{t}: {len(taules)} tablas")
    if not files:
        raise RuntimeError("sin datos")
    tot = pd.concat(files)
    # Periodo: «enero-diciembre 2025» -> any 2025, mesos 12
    m = tot["periode"].str.extract(r"(\w+)-(\w+)\s+(\d{4})")
    mesos = {"marzo": 3, "junio": 6, "septiembre": 9, "diciembre": 12}
    tot["any"] = pd.to_numeric(m[2], errors="coerce")
    tot["mesos"] = m[1].str.lower().map(mesos)
    tot = tot.dropna(subset=["any", "valor"]).drop_duplicates(["nivell", "codi", "tipologia", "any", "mesos"], keep="last")
    tot[["nivell", "codi", "zona", "tipologia", "any", "mesos", "valor"]].sort_values(["nivell", "codi", "any", "mesos"]).to_csv(
        carpeta("interior") / "balanc_criminalitat.csv", index=False)
    mun = tot[tot["nivell"] == "mun"]
    lineas.append(f"municipios de Girona: {', '.join(sorted(mun['zona'].unique()))}; años {int(tot['any'].min())}-{int(tot['any'].max())}; "
                  f"último periodo: {int(ultim[1])}T{ultim[2]}")
    if mun.empty:
        lineas.append("ERROR ningún municipio de Girona")
    return "\n".join(lineas)
