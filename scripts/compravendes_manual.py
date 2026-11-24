"""Carga manual de las compraventas de vivienda registradas por municipio (Secretaria d'Habitatge).

La Generalitat publica cada trimestre, a partir de los datos del Colegio de Registradores, el número de
compraventas, la superficie media, el precio total y el precio por m² construido (vivienda nueva y usada)
de los municipios de más de 2.000 habitantes (5.000 hasta 2024) y de comarcas, ámbitos y demarcaciones:
https://habitatge.gencat.cat/ca/dades/indicadors_estadistiques/estadistiques_de_construccio_i_mercat_immobiliari/estadistica-de-les-compravendes/compravendes-habitatges-Catalunya/

habitatge.gencat.cat no admite descargas automáticas (robots.txt), así que cada trimestre se bajan a mano
los dos Excel del año en curso y se ejecuta:

    python scripts/compravendes_manual.py Trimestrals_per_municipis_2026.xlsx Trimestrals_per_ambits_2026.xlsx

Añade o sustituye esos trimestres en data/processed/compravendes/compravendes.csv.gz (una fila por
municipio de Girona o ámbito territorial y trimestre; los precios en blanco son trimestres con menos de
tres compraventas) y actualiza compravendes_meta.json. Solo se leen las hojas trimestrales («2t26»).
"""
from __future__ import annotations

import datetime
import json
import pathlib
import re
import sys

import pandas as pd

RAIZ = pathlib.Path(__file__).resolve().parent.parent
SAL = RAIZ / "data" / "processed" / "compravendes"
COLS = ["n_nou", "n_prot", "n_usat", "n_tot", "sup_nou", "sup_prot", "sup_usat", "sup_tot", "preu_nou", "preu_usat",
        "preu_tot", "m2_nou", "m2_usat", "m2_tot", "m2max_nou", "m2max_usat", "m2min_nou", "m2min_usat"]
# Posición de cada columna en la hoja de municipios (la de ámbitos va una columna por delante: no tiene código)
POS = [2, 3, 4, 5, 7, 8, 9, 10, 12, 13, 14, 16, 17, 18, 20, 21, 23, 24]
AMBITS = {"Comarques", "Àmbits territorials funcionals", "Demarcacions territorials"}


def _num(v):
    try:
        x = float(v)
    except (TypeError, ValueError):
        return None
    return None if pd.isna(x) else round(x, 2)


def llegeix(fitxer: str) -> list[dict]:
    mun = "municipis" in fitxer.lower() or "mun_" in fitxer.lower()
    files = []
    for full, df in pd.read_excel(fitxer, sheet_name=None, header=None).items():
        m = re.fullmatch(r"([1-4])t(\d\d)", str(full).strip())
        if not m:
            continue
        per = f"20{m.group(2)}T{m.group(1)}"
        sec = "Àmbits"
        for r in df.itertuples(index=False):
            r = list(r) + [None] * 30
            if mun:
                codi = str(r[0]).strip()
                if not re.fullmatch(r"17\d{3}", codi):
                    continue
                vals = [_num(r[i]) for i in POS]
                files.append({"tipus": "mun", "ambit": "", "codi": codi, "nom": str(r[1]).strip(), "per": per, **dict(zip(COLS, vals))})
            else:
                nom = r[0]
                if nom is None or (isinstance(nom, float) and pd.isna(nom)):
                    continue
                resta = [x for x in r[1:25] if x is not None and not (isinstance(x, float) and pd.isna(x))]
                if not resta:
                    sec = str(nom).strip() if str(nom).strip() in AMBITS else sec
                    continue
                if _num(r[1]) is None and _num(r[4]) is None:
                    continue
                vals = [_num(r[i - 1]) for i in POS]
                files.append({"tipus": "terr", "ambit": sec, "codi": "", "nom": str(nom).strip(), "per": per, **dict(zip(COLS, vals))})
    return files


def main(fitxers: list[str]) -> None:
    nou = pd.DataFrame([f for x in fitxers for f in llegeix(x)])
    if nou.empty:
        sys.exit("no se ha leído ninguna hoja trimestral")
    for c in COLS[4:]:
        nou.loc[nou[c] == 0, c] = None  # 0 = sin dato
    fa = SAL / "compravendes.csv.gz"
    vell = pd.read_csv(fa, dtype={"codi": str}) if fa.exists() else pd.DataFrame(columns=nou.columns)
    vell = vell[~vell["per"].isin(set(nou["per"]))]
    d = pd.concat([vell, nou], ignore_index=True).sort_values(["tipus", "ambit", "codi", "nom", "per"])
    SAL.mkdir(parents=True, exist_ok=True)
    d.to_csv(fa, index=False)
    meta = {"carregat": datetime.date.today().isoformat(), "ultim": d["per"].max(), "fitxers": ", ".join(pathlib.Path(x).name for x in fitxers)}
    (SAL / "compravendes_meta.json").write_text(json.dumps(meta, ensure_ascii=False), encoding="utf-8")
    print(f"{len(nou)} filas nuevas ({', '.join(sorted(set(nou['per'])))}); total {len(d)}; último {meta['ultim']}")


if __name__ == "__main__":
    main(sys.argv[1:])
