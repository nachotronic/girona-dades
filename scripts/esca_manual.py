"""Carga manual (anual) de la Enquesta de Salut de Catalunya (ESCA).

scientiasalut.gencat.cat prohíbe las descargas automáticas (robots.txt), así que cada año
se descarga a mano el Excel «principals indicadors ESCA AAAA» de
https://scientiasalut.gencat.cat/handle/11351/1566 y se ejecuta:

    python scripts/esca_manual.py ruta/principals-indicadors-ESCA-AAAA.xlsx

Escribe en data/processed/esca/:
  esca_regio.csv      indicadores de la región sanitaria de Girona y de Cataluña (hoja «Regió sanitària»):
                      bloc (adults/infants), sexe, num, indicador, poblacio, cat, gi, gi_ic, sig
                      (sig = 1 / -1 si Girona está por encima / por debajo de Cataluña con p<0,05)
  esca_evolucio.csv   serie de Cataluña desde 1994 (hoja «Evolució temporal_%bruts»), adultos
  esca_meta.json      edición y fichero de origen
"""
from __future__ import annotations

import json
import pathlib
import re
import sys

import openpyxl
import pandas as pd

RAIZ = pathlib.Path(__file__).resolve().parent.parent
SAL = RAIZ / "data" / "processed" / "esca"
SOTA, SOBRE = "FFEC6839", "FF8CBDC1"


def _num(v):
    return float(v) if isinstance(v, (int, float)) else None


def regio(wb) -> pd.DataFrame:
    ws = wb["Regió sanitària"]
    files, blocs = [], []
    capcalera = None
    for row in ws.iter_rows():
        vals = {c.column: c.value for c in row if c.value is not None}
        txt = " ".join(str(v) for v in vals.values())
        if "CATALUNYA" in txt and "Girona" in txt:
            capcalera = {"gi": next(k for k, v in vals.items() if v == "Girona"),
                         "cat": next(k for k, v in vals.items() if "CATALUNYA" in str(v))}
            blocs.append(capcalera)
            continue
        if capcalera and "%" in vals.values() and "pct" not in capcalera:
            pcts = sorted(k for k, v in vals.items() if v == "%")
            capcalera["pct_cat"] = min(pcts, key=lambda k: abs(k - capcalera["cat"]))
            capcalera["pct_gi"] = max(k for k in pcts if k <= capcalera["gi"])
            capcalera["pct"] = True
            continue
        if not capcalera or "pct" not in capcalera:
            continue
        nom_col = 2 if isinstance(vals.get(1), (int, float)) or 1 not in vals else 1
        nom = vals.get(2) if 2 in vals and isinstance(vals.get(2), str) else None
        cat, gi = _num(vals.get(capcalera["pct_cat"])), _num(vals.get(capcalera["pct_gi"]))
        if not nom or cat is None:
            continue
        fill = row[capcalera["pct_gi"] - 1].fill.fgColor.rgb if len(row) >= capcalera["pct_gi"] else None
        files.append({"b": len(blocs) - 1, "num": vals.get(1), "indicador": re.sub(r"\s+", " ", nom).strip(),
                      "poblacio": str(vals.get(3, "")).strip(), "cat": cat, "gi": gi,
                      "gi_ic": vals.get(capcalera["pct_gi"] + 1),
                      "sig": 1 if fill == SOBRE else -1 if fill == SOTA else 0})
    df = pd.DataFrame(files)
    # Bloques en orden: total adultos, total infantil, hombres adultos, hombres infantil, mujeres adultos, mujeres infantil
    ordre = [("adults", "total"), ("infants", "total"), ("adults", "homes"), ("infants", "homes"), ("adults", "dones"), ("infants", "dones")]
    df["bloc"] = df["b"].map(lambda b: ordre[b][0] if b < len(ordre) else "")
    df["sexe"] = df["b"].map(lambda b: ordre[b][1] if b < len(ordre) else "")
    return df.drop(columns="b")


def evolucio(wb) -> pd.DataFrame:
    ws = wb["Evolució temporal_%bruts"]
    anys, files, prev = {}, [], None
    for row in ws.iter_rows():
        vals = {c.column: c.value for c in row if c.value is not None}
        if "ESCA (per períodes" in " ".join(str(v) for v in vals.values()):
            break  # a partir de aquí, infantil por bienios
        if not anys and any(str(v) == "1994" for v in vals.values()):
            anys = {k: int(v) for k, v in vals.items() if re.fullmatch(r"\d{4}", str(v))}
            continue
        if vals.get(4) == "Total":
            prev = vals
            continue
        if vals.get(4) == "Homes" and prev is not None and isinstance(vals.get(2), str):
            nom = re.sub(r"\s+", " ", (prev.get(2) or vals[2])).strip() if isinstance(prev.get(2), str) else re.sub(r"\s+", " ", vals[2]).strip()
            for k, a in anys.items():
                v = _num(prev.get(k))
                if v is not None:
                    files.append({"num": vals.get(1), "indicador": nom, "poblacio": str(vals.get(3, "")).strip(), "any": a, "cat": v})
            prev = None
    return pd.DataFrame(files)


def main(f: str) -> None:
    wb = openpyxl.load_workbook(f, data_only=True)
    SAL.mkdir(parents=True, exist_ok=True)
    r = regio(wb)
    e = evolucio(wb)
    r.to_csv(SAL / "esca_regio.csv", index=False)
    e.to_csv(SAL / "esca_evolucio.csv", index=False)
    edicio = re.search(r"(20\d\d)", pathlib.Path(f).name)
    meta = {"edicio": edicio.group(1) if edicio else "", "periode_regio": "2023-2024" if not edicio else f"{int(edicio.group(1)) - 1}-{edicio.group(1)}",
            "fitxer": pathlib.Path(f).name, "carregat": __import__("datetime").date.today().isoformat()}
    (SAL / "esca_meta.json").write_text(json.dumps(meta, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"{len(r)} files per regió, {e['indicador'].nunique()} indicadors amb sèrie ({e['any'].min()}-{e['any'].max()})")


if __name__ == "__main__":
    main(sys.argv[1])
