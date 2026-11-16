"""Resultados electorales para la web: un índice de convocatorias y un fichero por convocatoria.

Lee data/processed/eleccions/ (fuentes/eleccions.py) y escribe:
  web/datos/eleccions.json        convocatorias disponibles y bloques
  web/datos/eleccions/<ID>.json   resultados por municipio y sección censal

Cada zona es [cens, votants, nuls, blancs, [i, vots, i, vots, ...]] con los índices de la lista
«c» de candidaturas de la convocatoria ([sigles, bloc, denominació]), ordenadas por votos.
"""
from __future__ import annotations

import json
import pathlib
import re

import pandas as pd

RAIZ = pathlib.Path(__file__).resolve().parent.parent
P = RAIZ / "data" / "processed" / "eleccions"

TIPUS = {
    "A": {"ca": "Parlament", "es": "Parlament"},
    "G": {"ca": "Congrés", "es": "Congreso"},
    "M": {"ca": "Municipals", "es": "Municipales"},
    "E": {"ca": "Europees", "es": "Europeas"},
}
ORDRE_TIPUS = ["A", "G", "M", "E"]

# Bloques: misma familia política a lo largo de los años (por siglas y agrupación de candidaturas)
BLOCS = [
    ("Junts", {"JUNTS", "JUNTSXCAT", "JXCAT", "CIU", "CDC", "DL", "CM", "JXF"}),
    ("ERC", {"ERC", "AM", "EPDD", "ESQUERRA"}),
    ("PSC", {"PSC", "CP", "PSOE"}),
    ("CUP", {"CUP", "AMUNT"}),
    ("Comuns", {"ICV", "EUIA", "CATSÍQUEESPOT", "CATCOMÚ", "ECP", "COMÚ", "COMUNS", "SUMAR", "CEC", "ECG", "BEC", "GUANYEM"}),
    ("Cs", {"CS", "CIUDADANOS", "CIUTADANS"}),
    ("PP", {"PP"}),
    ("Vox", {"VOX"}),
]
ORDRE_BLOCS = ["Junts", "JxSí", "ERC", "PSC", "CUP", "Comuns", "Cs", "PP", "Vox", "Aliança", "Locals", "Altres"]


def bloc(sigles: str, agrupacio: str, tipus: str) -> str:
    txt = f"{sigles or ''} {agrupacio or ''}".upper().replace("C'S", "CS").replace(".", "").replace("'", "")
    if "ALIANÇA" in txt:  # Aliança Catalana (no «Alianza por el Comercio»)
        return "Aliança"
    toks = set(re.findall(r"[A-ZÀ-ÜÇ]+", txt))
    if tipus == "M":
        # Marcas municipales: PSC-Progrés Municipal (PM, PMC) y CUP-Poble Actiu (PA)
        toks |= {"PSC" for x in ("PM", "PMC") if x in toks} | ({"CUP"} if "PA" in toks else set())
    if toks & {"PDECAT", "UNIOCAT", "UNIO"}:
        return "Altres"
    if toks & {"JXSÍ", "JXSI"}:
        return "JxSí"
    for nom, claus in BLOCS:
        if toks & claus:
            return nom
    return "Locals" if tipus == "M" else "Altres"


def _n(s: pd.Series) -> pd.Series:
    return pd.to_numeric(s, errors="coerce").fillna(0).astype(int)


def _nom(ident: str, data: str) -> dict:
    t, a = ident[0], ident[1:5]
    mes = {"es": "", "ca": ""}
    if t == "G" and a == "2019":
        abril = data[5:7] == "04"
        mes = {"ca": " (abril)" if abril else " (nov.)", "es": " (abril)" if abril else " (nov.)"}
    return {k: f"{TIPUS[t][k]} {a}{mes[k]}" for k in ("ca", "es")}


def _clau(df: pd.DataFrame) -> pd.Series:
    """Código de la zona: INE del municipio (MU) o CUSEC de la sección (SE)."""
    sec = df["ine"] + df["districte"].fillna("").astype(str).str.zfill(2) + df["seccio"].fillna("").astype(str).str.zfill(3)
    return sec.where(df["nivell"] == "SE", df["ine"]).where(df["nivell"] != "CA", "cat")


def convocatoria(ident: str) -> dict | None:
    fv, fp = P / f"vots_{ident}.csv.gz", P / f"part_{ident}.csv.gz"
    if not fv.exists() or not fp.exists():
        return None
    v = pd.read_csv(fv, dtype=str)
    p = pd.read_csv(fp, dtype=str)
    for df in (v, p):
        df["ine"] = df["ine"].astype(str).str.zfill(5)
        # Fuera el voto exterior (CERA, códigos 17998 y 17999); 17901-17903 son municipios
        df.drop(df[(df["nivell"] != "CA") & (df["ine"].str[2:] >= "990")].index, inplace=True)
        df["z"] = _clau(df)
    v["vots"] = _n(v["vots"])
    v = v[v["vots"] > 0]
    tipus = ident[0]
    v["bloc"] = [bloc(s, a, tipus) for s, a in zip(v["sigles"].fillna("?"), v["agrupacio"].fillna(""))]
    v["sigles"] = v["sigles"].fillna("?").str.strip()
    # Candidaturas: en las municipales, las siglas se repiten entre pueblos; se agrupan por siglas y bloque
    tot = v[v["nivell"] != "CA"].groupby(["sigles", "bloc"])["vots"].sum().sort_values(ascending=False)
    cands = list(tot.index)
    idx = {k: i for i, k in enumerate(cands)}
    denom = v.drop_duplicates(["sigles", "bloc"]).set_index(["sigles", "bloc"])["denominacio"].to_dict()
    c = [[s, b] + ([str(denom.get((s, b)) or "")] if tipus != "M" else []) for s, b in cands]

    zones = {}
    pz = p.set_index("z")
    for z, g in v[v["nivell"] != "CA"].groupby("z"):
        if z not in pz.index:
            continue
        f = pz.loc[z]
        if isinstance(f, pd.DataFrame):
            f = f.iloc[0]
        g = g.groupby(["sigles", "bloc"])["vots"].sum().sort_values(ascending=False)
        res = []
        for k, n in g.items():
            res += [idx[k], int(n)]
        zones[z] = [int(_n(pd.Series([f[x]]))[0]) for x in ("cens", "votants", "nuls", "blancs")] + [res]

    def total(mask_p, mask_v) -> list:
        pp, vv = p[mask_p], v[mask_v]
        if pp.empty:
            return None
        blocs = vv.groupby("bloc")["vots"].sum().to_dict()
        return [int(_n(pp[x]).sum()) for x in ("cens", "votants", "nuls", "blancs")] + [{k: int(n) for k, n in blocs.items()}]

    mun = {z: x for z, x in zones.items() if len(z) == 5}
    sec = {z: x for z, x in zones.items() if len(z) == 10}
    return {
        "id": ident, "c": c, "mun": mun, "sec": sec,
        "prov": total(p["nivell"] == "MU", v["nivell"] == "MU"),
        "cat": total(p["nivell"] == "CA", v["nivell"] == "CA"),
    }


def construir(salida: pathlib.Path) -> str:
    if not (P / "convocatories.csv").exists():
        return "AVISO: sin datos electorales"
    conv = pd.read_csv(P / "convocatories.csv", dtype=str).set_index("id_eleccio")
    (salida / "eleccions").mkdir(parents=True, exist_ok=True)
    index, lineas = [], []
    geo = salida / "seccions.geojson"
    cusecs = {f["properties"]["cusec"] for f in json.loads(geo.read_text())["features"]} if geo.exists() else set()
    for f in sorted(P.glob("vots_*.csv.gz")):
        ident = f.name[5:-7]
        if ident[0] not in TIPUS:
            continue
        d = convocatoria(ident)
        if not d:
            continue
        data = str(conv["data_eleccio"].get(ident, ""))[:10]
        blocs = sorted({c[1] for c in d["c"]}, key=ORDRE_BLOCS.index)
        index.append({"id": ident, "t": ident[0], "any": int(ident[1:5]), "data": data, "n": _nom(ident, data), "b": blocs})
        (salida / "eleccions" / f"{ident}.json").write_text(json.dumps(d, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
        cob = len(cusecs & set(d["sec"])) if cusecs else 0
        lineas.append(f"{ident}: {len(d['mun'])} municipios, {len(d['sec'])} secciones ({cob}/{len(cusecs)} con geometría 2024), {len(d['c'])} candidaturas")
    index.sort(key=lambda x: (ORDRE_TIPUS.index(x["t"]), x["data"]))
    (salida / "eleccions.json").write_text(json.dumps({"conv": index, "blocs": ORDRE_BLOCS}, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    return "\n".join(lineas)


if __name__ == "__main__":
    print(construir(RAIZ / "web" / "datos"))
