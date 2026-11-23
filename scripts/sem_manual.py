"""Carga manual del Sistema d'Emergències Mèdiques (SEM).

sem.gencat.cat no deja descargar sus ficheros de forma automática y no publica datos por
municipio ni comarca: solo por región sanitaria (o «LOT»). Hay dos fuentes:

1. El Excel «Resum de l'activitat del SEM» (2013 - 1r semestre 2022), en
   https://sem.gencat.cat/ca/coneixer-el-sem/el-sem-en-xifres/ . Se descarga a mano y se ejecuta:

       python scripts/sem_manual.py ruta/resum-activitat-sem.xlsx

   Escribe en data/processed/sem/:
     sem_temps.csv   tiempo de llegada a los incidentes de prioridad 0 (los más graves) por LOT:
                     any, ambit, n10 (<10 min), n10_20, n20 (>20 min), total, parcial (1 = solo un semestre)
     sem_codis.csv   códigos de activación por región sanitaria: any, regio, iam, ictus, ppt, parcial
     sem_meta.json   fichero de origen y fecha de carga

2. La memoria anual (PDF). Sus cifras por región van a mano, porque vienen en gráficos:
     sem_codis_memoria.csv   códigos IAM / ICTUS / PPT por región sanitaria (gráfico «Codis activats per Regió Sanitària»)
     sem_recursos.csv        unidades por región sanitaria (mapa «Distribució territorial dels recursos»)
   Cada año se añaden las filas del año nuevo.
"""
from __future__ import annotations

import datetime
import json
import pathlib
import re
import sys

import openpyxl
import pandas as pd

RAIZ = pathlib.Path(__file__).resolve().parent.parent
SAL = RAIZ / "data" / "processed" / "sem"


def _txt(v) -> str:
    return re.sub(r"\s+", " ", str(v or "")).strip()


def full(ws, any_: int):
    files = [[c for c in r] for r in ws.iter_rows(values_only=True)]
    parcial = int(any(("SEMESTRE" in _txt(v).upper()) for r in files[:3] for v in r))
    temps, codis = [], []
    mode, cols = None, {}
    for r in files:
        nom = _txt(r[1]) if len(r) > 1 else ""
        vals = [v for v in r[3:] if v is not None]
        if nom.startswith("Temps Resposta Prioritat 0"):
            mode = "temps"
            continue
        if nom.startswith("CODIS ACTIVATS"):
            mode = "codis"
            cols = {_txt(v).upper(): i for i, v in enumerate(r) if _txt(v).upper() in ("IAM", "ICTUS", "PPT")}
            continue
        if not nom or not vals:
            continue
        if mode == "temps" and len(vals) >= 7 and all(isinstance(v, (int, float)) for v in vals[:7]):
            ambit = re.sub(r"^LOT\s+", "", nom.upper()).replace("''", "'")
            temps.append({"any": any_, "ambit": ambit, "n10": vals[0], "n10_20": vals[2], "n20": vals[4], "total": vals[6], "parcial": parcial})
        elif mode == "codis":
            regio = re.sub(r"^BARCELONA\s*-\s*", "", nom.upper())
            f = {"any": any_, "regio": regio, "parcial": parcial}
            for k, i in cols.items():
                v = r[i]
                f[k.lower()] = v if isinstance(v, (int, float)) else 0
            codis.append(f)
    return temps, codis


def main(f: str) -> None:
    wb = openpyxl.load_workbook(f, data_only=True)
    temps, codis = [], []
    for ws in wb:
        m = re.search(r"ACTIVITAT (\d{4})", ws.title)
        if not m:
            continue
        t, c = full(ws, int(m.group(1)))
        temps += t
        codis += c
    SAL.mkdir(parents=True, exist_ok=True)
    t = pd.DataFrame(temps)
    c = pd.DataFrame(codis)[["any", "regio", "iam", "ictus", "ppt", "parcial"]]
    t.to_csv(SAL / "sem_temps.csv", index=False)
    c.to_csv(SAL / "sem_codis.csv", index=False)
    meta = {"fitxer": pathlib.Path(f).name, "anys": f"{t['any'].min()}-{t['any'].max()}", "carregat": datetime.date.today().isoformat()}
    (SAL / "sem_meta.json").write_text(json.dumps(meta, ensure_ascii=False, indent=1), encoding="utf-8")
    gi = t[t["ambit"] == "GIRONA"]
    print(f"{len(t)} files de temps ({len(gi)} de Girona), {len(c)} de codis, anys {meta['anys']}")


if __name__ == "__main__":
    main(sys.argv[1])
