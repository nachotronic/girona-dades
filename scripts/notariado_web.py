"""Sección «Notaries» de la web: actos notariales por provincia (Consejo General del Notariado).

Lee data/processed/notariado/actes.csv.gz (fuentes/notariado.py) y la población provincial de
data/processed/notariado/poblacio.csv (INE, ECP), y escribe web/datos/notariado.json, que la web pide al
pintar la sección:

  ind   por indicador: freq (m/t), ult (último periodo), series de Girona, Cataluña y España
        (suma de 12 meses o 4 trimestres por 1.000 habitantes; importes medios ponderados por el
        número de actos) en el formato de provincia.js: [x decimal, etiqueta, valor]
  prov  por indicador y provincia (código INE): valor de los últimos 12 meses por 1.000 habitantes
        (o importe medio) y total de actos
  x     cifras de cabecera de Girona
"""
from __future__ import annotations

import json
import math
import pathlib

import pandas as pd

RAIZ = pathlib.Path(__file__).resolve().parent.parent
DIR = RAIZ / "data" / "processed" / "notariado"
CAT = ["08", "17", "25", "43"]
DES_DE = 2008  # las sumas móviles empiezan a tener sentido con un año completo

# Indicadores de la web: clave -> (claves de actes.csv que se suman, variable)
IND = {
    "her": (["herencies"], "n"),
    "test": (["testaments"], "n"),
    "abint": (["abintestat"], "n"),
    "don": (["donacions"], "n"),
    "pod": (["poder_general", "poder_plets", "poder_altres"], "n"),
    "hipv": (["hip_vivenda"], "n"),
    "hipv_imp": (["hip_vivenda"], "cuantia"),
    "hip": (["hip_total"], "n"),
    "canc": (["cancel_hip"], "n"),
    "canc_imp": (["cancel_hip"], "cuantia"),
    "soc": (["societats"], "n"),
    "soc_cap": (["societats"], "capital_mitja"),
    "pol": (["polissa", "polissa_aval"], "n"),
    "seg": (["segregacio"], "n"),
    "sub": (["subsanacio"], "n"),
}
IMPORT = {"cuantia", "capital_mitja"}


def _r(v, d=2):
    return None if v is None or (isinstance(v, float) and math.isnan(v)) else round(float(v), d)


def _trimestre(d: pd.DataFrame) -> pd.DataFrame:
    """Pasa a trimestres los datos mensuales (para sumar indicadores de distinta frecuencia)."""
    d = d.copy()
    m = d["freq"] == "m"
    d.loc[m, "per"] = (d.loc[m, "per"] - 1) // 3 + 1
    # solo trimestres completos (los tres meses) de los indicadores mensuales
    k = ["clau", "zona", "any", "per", "var"]
    n = d[m].groupby(k)["valor"].transform("size")
    d = d[~m | (n.reindex(d.index).fillna(3) == 3)]
    d = d.groupby(k + ["freq"], as_index=False)["valor"].sum()
    d["freq"] = "t"
    return d


def serie(d: pd.DataFrame, var: str, freq: str) -> pd.DataFrame:
    """Una fila por zona y periodo con el número de actos (n) y, si toca, el importe medio (imp)."""
    n = d[d["var"] == "n"].groupby(["zona", "any", "per"], as_index=False)["valor"].sum().rename(columns={"valor": "n"})
    if var in IMPORT:
        v = d[d["var"] == var][["clau", "zona", "any", "per", "valor"]]
        nn = d[d["var"] == "n"][["clau", "zona", "any", "per", "valor"]].rename(columns={"valor": "w"})
        v = v.merge(nn, on=["clau", "zona", "any", "per"])
        v["vw"] = v["valor"] * v["w"]
        s = v.groupby(["zona", "any", "per"], as_index=False)[["vw", "w"]].sum()
        n = n.merge(s, on=["zona", "any", "per"], how="left")
    n["freq"] = freq
    return n


def _afegeix_cat(s: pd.DataFrame) -> pd.DataFrame:
    c = s[s["zona"].isin(CAT)]
    cols = [k for k in ("n", "vw", "w") if k in s]
    g = c.groupby(["any", "per", "freq"], as_index=False)[cols].sum(min_count=1)
    k = c.groupby(["any", "per"]).size().rename("nz").reset_index()
    g = g.merge(k, on=["any", "per"])
    g = g[g["nz"] == 4].drop(columns="nz")
    g["zona"] = "CAT"
    return pd.concat([s, g], ignore_index=True)


def construir(salida: pathlib.Path) -> dict:
    fa = DIR / "actes.csv.gz"
    if not fa.exists():
        return {"resum": "sin datos"}
    a = pd.read_csv(fa, dtype={"zona": str})
    fp = DIR / "poblacio.csv"
    if not fp.exists():  # todavía sin descargar: la de exportacions (hasta 2021)
        fp = RAIZ / "data" / "processed" / "exportacions" / "poblacio.csv"
    p = pd.read_csv(fp, dtype={"prov": str})
    p = p[p["prov"].str.fullmatch(r"\d\d|ES")]
    pob = p.pivot_table(index="any", columns="prov", values="poblacio")
    if "ES" not in pob.columns:
        pob["ES"] = pob.drop(columns=["51", "52"], errors="ignore").sum(axis=1)
    pob["CAT"] = pob[CAT].sum(axis=1)
    pob_ult = int(pob.index.max())

    def hab(zona: str, any_: int) -> float | None:
        y = min(max(any_, int(pob.index.min())), pob_ult)
        v = pob.at[y, zona] if zona in pob.columns else None
        return None if v is None or math.isnan(v) else float(v)

    ind, prov, resum = {}, {}, []
    for k, (claus, var) in IND.items():
        d = a[a["clau"].isin(claus)]
        if d.empty:
            continue
        freqs = set(d["freq"])
        if len(freqs) > 1:
            d = _trimestre(d)
            # solo los periodos en que están todos los actos que se suman
            nc = d[d["var"] == "n"].groupby(["zona", "any", "per"])["clau"].transform("nunique")
            d = d.loc[nc[nc == len(claus)].index]
        freq = "t" if "t" in freqs else "m"
        s = _afegeix_cat(serie(d, var, freq))
        win = 12 if freq == "m" else 4
        out = {}
        # El último periodo con datos de casi todas las provincias (el resto se descarta)
        cnt = s[~s["zona"].isin(["ES", "CAT"])].groupby(["any", "per"]).size()
        ok = cnt[cnt >= 40].index
        ult = max(ok) if len(ok) else None
        if ult is None:
            continue
        for z, g in s.groupby("zona"):
            g = g.sort_values(["any", "per"]).set_index(["any", "per"])
            g = g[g.index <= ult]
            # periodos completos y consecutivos para la suma móvil
            idx = pd.MultiIndex.from_tuples([(y, q) for y in range(int(g.index[0][0]), ult[0] + 1)
                                             for q in range(1, win + 1) if (y, q) <= ult and (y, q) >= g.index[0]])
            g = g.reindex(idx)
            rn = g["n"].rolling(win, min_periods=win).sum()
            if var in IMPORT:
                rv = g["vw"].rolling(win, min_periods=win).sum() / g["w"].rolling(win, min_periods=win).sum()
            pts = []
            for (y, q), v in rn.items():
                if v is None or math.isnan(v) or y < DES_DE:
                    continue
                x = y + (q - 0.5) / win
                et = f"{y}-{q:02d}" if freq == "m" else f"{y}T{q}"
                if var in IMPORT:
                    val = rv.get((y, q))
                    if val is None or math.isnan(val):
                        continue
                    pts.append([round(x, 4), et, _r(val, 0)])
                else:
                    h = hab(z, y)
                    if h:
                        pts.append([round(x, 4), et, _r(v / h * 1000, 3)])
            out[z] = pts
            lv = rn.get(ult)
            if z not in ("CAT",) and lv is not None and not math.isnan(lv):
                o = {"n": int(lv)}
                if var in IMPORT:
                    o["v"] = _r(rv.get(ult), 0)
                else:
                    h = hab(z, ult[0])
                    o["v"] = _r(lv / h * 1000, 3) if h else None
                prov.setdefault(k, {})[z] = o
        et = f"{ult[0]}-{ult[1]:02d}" if freq == "m" else f"{ult[0]}T{ult[1]}"
        ind[k] = {"freq": freq, "ult": et, "u": "€" if var in IMPORT else "h",
                  "series": {"gi": out.get("17", []), "cat": out.get("CAT", []), "esp": out.get("ES", [])}}
        resum.append(f"{k} {et}")

    # Girona: hipotecas nuevas frente a cancelaciones (suma de 12 meses, número de actos)
    if "hipv" in ind and "canc" in ind:
        def abs12(clau):
            d = a[(a["clau"] == clau) & (a["zona"] == "17") & (a["var"] == "n")].sort_values(["any", "per"])
            r = d["valor"].rolling(12, min_periods=12).sum()
            return [[round(y + (q - 0.5) / 12, 4), f"{y}-{q:02d}", int(v)] for y, q, v in zip(d["any"], d["per"], r) if not math.isnan(v) and y >= DES_DE]
        ind["hc"] = {"freq": "m", "ult": ind["hip"]["ult"] if "hip" in ind else ind["hipv"]["ult"], "u": "n",
                     "series": {"gi": abs12("hip_total"), "esp": abs12("cancel_hip")}, "noms": "not_hc"}
    # Cifras de cabecera: Girona y su posición entre las provincias
    x = {}
    for k, o in prov.items():
        g = o.get("17")
        if not g:
            continue
        vals = sorted(((v["v"], c) for c, v in o.items() if c != "ES" and v.get("v") is not None), reverse=True)
        rang = next((i + 1 for i, (_, c) in enumerate(vals) if c == "17"), None)
        x[k] = {**g, "es": o.get("ES", {}).get("v"), "rang": rang, "nprov": len(vals)}
        cs = [prov[k].get(c, {}) for c in CAT]
        if all(c.get("n") is not None for c in cs):
            if IND[k][1] in IMPORT:
                x[k]["cat"] = None
            else:
                x[k]["cat"] = _r(sum(c["n"] for c in cs) / hab("CAT", int(ind[k]["ult"][:4])) * 1000, 3)
    D = {"ind": ind, "prov": prov, "x": x, "pob_any": pob_ult}
    salida.mkdir(parents=True, exist_ok=True)
    (salida / "notariado.json").write_text(json.dumps(D, ensure_ascii=False, separators=(",", ":"), allow_nan=False), encoding="utf-8")
    return {"resum": ", ".join(resum)}


if __name__ == "__main__":
    print(construir(RAIZ / "web" / "datos"))
