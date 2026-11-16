"""Resultados electorales por municipio y sección censal (Generalitat, «Processos electorals»).

Conjuntos de dades obertes (Socrata):
  ntc4-rnwr  Processos electorals - Vots          (vots per candidatura)
  irrv-2mfc  Processos electorals - Participació  (cens, votants, blancs, nuls)
  tgns-3xuy  Processos electorals - Convocatòries

Cubren todas las convocatorias celebradas en Cataluña (Parlament, Congrés, municipals,
europees...) hasta el nivel de sección («SE»). El código de territorio es el código INE
del municipio sin el cero inicial (Gavà = 8089, Girona = 17079).

Genera, por convocatoria, en data/processed/eleccions/:
  vots_<ID>.csv.gz   nivell, ine, districte, seccio, candidatura, sigles, agrupacio, vots, escons, color
  part_<ID>.csv.gz   nivell, ine, districte, seccio, cens, votants, nuls, blancs, candidatures
"""
from __future__ import annotations

import io

import pandas as pd

from .comun import carpeta, get

DOMINIO = "https://analisi.transparenciacatalunya.cat/resource"
# Convocatorias que se publican en la web: Parlament (A), Congrés (G), municipals (M) y europees (E)
CONVOCATORIES = [
    "A20101", "M20111", "G20111", "A20121", "E20141",
    "M20151", "A20151", "G20151", "G20161", "A20171",
    "G20191", "M20191", "E20191", "G20192", "A20211",
    "M20231", "G20231", "A20241", "E20241",
]
NIVELLS = ("MU", "SE")
PAGINA = 50000


def _consulta(conjunt: str, where: str, camps: str) -> pd.DataFrame:
    trossos, offset = [], 0
    while True:
        params = {"$select": camps, "$where": where, "$limit": PAGINA, "$offset": offset, "$order": ":id"}
        r = get(f"{DOMINIO}/{conjunt}.csv", params=params, timeout=600)
        df = pd.read_csv(io.BytesIO(r.content), dtype=str)
        trossos.append(df)
        if len(df) < PAGINA:
            break
        offset += PAGINA
    return pd.concat(trossos, ignore_index=True) if trossos else pd.DataFrame()


def _where(ident: str) -> str:
    niv = ",".join(f"'{n}'" for n in NIVELLS)
    return (f"id_eleccio='{ident}' AND id_nivell_territorial in({niv}) "
            f"AND starts_with(territori_codi, '17')")


def _ine(codi: pd.Series) -> pd.Series:
    return codi.astype(str).str.strip().str.zfill(5)


def ejecutar() -> str:
    salida = carpeta("eleccions")
    conv = pd.read_csv(io.BytesIO(get(f"{DOMINIO}/tgns-3xuy.csv", params={"$limit": 5000}).content), dtype=str)
    conv.to_csv(salida / "convocatories.csv", index=False)
    lineas = []
    for ident in CONVOCATORIES:
        try:
            v = _consulta("ntc4-rnwr", _where(ident),
                          "id_nivell_territorial,territori_codi,districte,secci_,candidatura_codi,candidatura_denominacio,"
                          "candidatura_sigles,agrupacio_sigles,candidat_posicio,vots,escons,candidatura_color")
            p = _consulta("irrv-2mfc", _where(ident),
                          "id_nivell_territorial,territori_codi,districte,seccio,cens_electoral,votants,vots_nuls,"
                          "vots_blancs,vots_candidatures")
            v = v.rename(columns={"id_nivell_territorial": "nivell", "secci_": "seccio", "candidatura_codi": "candidatura",
                                  "candidatura_denominacio": "denominacio", "candidatura_sigles": "sigles",
                                  "agrupacio_sigles": "agrupacio", "candidat_posicio": "posicio",
                                  "candidatura_color": "color"})
            p = p.rename(columns={"id_nivell_territorial": "nivell", "cens_electoral": "cens", "vots_nuls": "nuls",
                                  "vots_blancs": "blancs", "vots_candidatures": "candidatures"})
            for df in (v, p):
                df["ine"] = _ine(df.pop("territori_codi"))
            v.to_csv(salida / f"vots_{ident}.csv.gz", index=False)
            p.to_csv(salida / f"part_{ident}.csv.gz", index=False)
            n = p["nivell"].value_counts().to_dict()
            lineas.append(f"{ident}: {len(v)} filas de votos, participación {n}")
        except Exception as e:  # noqa: BLE001
            lineas.append(f"{ident}: ERROR {type(e).__name__}: {str(e)[:160]}")
    return "\n".join(lineas)
