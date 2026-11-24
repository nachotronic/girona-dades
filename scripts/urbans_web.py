"""Indicadores urbanos del INE (Urban Audit) para la web: tema «urb» del mapa, sección «Les ciutats»
y bloque de la ficha de los municipios de más de 20.000 habitantes.

construir(municipios) devuelve un dict con:
  mun    {ine: {"u<Id>": {año: valor}}}           series de cada ciudad gironina
  rank   {ine: {"u<Id>": [posición, ciudades, año]}} posición entre las ciudades de España (1 = valor más alto)
  zones  {"auf"|"kernel"|"esp": {"u<Id>": {año: valor}}} AUF y conurbación de Girona y total nacional
  n      número de municipios de España con datos (el máximo de todos los indicadores)
  anys   {"ua": último año con datos}
Claves derivadas: u_dens (habitantes por km²) y u_pern_hab (pernoctaciones por habitante).
"""
from __future__ import annotations

import pathlib
import sys

import pandas as pd

RAIZ = pathlib.Path(__file__).resolve().parent.parent
sys.path.insert(0, str(RAIZ))
D = RAIZ / "data" / "processed" / "urbans"
POB, SUP, PERN = 21523, 292695, 292655


def _r(v):
    if v is None or pd.isna(v):
        return None
    v = float(v)
    return round(v, 2) if abs(v) < 1000 else round(v)


def _derivades(m: pd.DataFrame) -> pd.DataFrame:
    p = m.pivot_table(index=["cod", "any"], columns="ind", values="valor", aggfunc="first")
    extra = []
    if POB in p and SUP in p:
        # La superficie no cambia: se usa la última conocida de cada municipio
        sup = p[SUP].groupby(level="cod").transform(lambda s: s.ffill().bfill())
        extra.append((p[POB] / sup).rename("dens"))
    if POB in p and PERN in p:
        extra.append((p[PERN] / p[POB]).rename("pern_hab"))
    if not extra:
        return pd.DataFrame(columns=["cod", "any", "ind", "valor"])
    e = pd.concat(extra, axis=1).reset_index().melt(id_vars=["cod", "any"], var_name="ind", value_name="valor").dropna()
    return e


def construir(municipios) -> dict:
    res = {"mun": {}, "rank": {}, "zones": {}, "n": 0, "anys": {}, "resum": "sin datos"}
    f = D / "urbans_mun.csv.gz"
    if not f.exists():
        return res
    m = pd.read_csv(f, dtype={"cod": str})
    m["valor"] = pd.to_numeric(m["valor"], errors="coerce")
    m = pd.concat([m, _derivades(m)], ignore_index=True)
    m["k"] = "u" + m["ind"].astype(str).str.replace(r"^(?=[a-z])", "_", regex=True)
    ines = {x["ine"] for x in municipios}
    ciu = m[m["cod"] != "00"]
    res["n"] = int(ciu["cod"].nunique())
    gi = m[m["cod"].isin(ines)]
    for (cod, k), g in gi.groupby(["cod", "k"]):
        res["mun"].setdefault(cod, {})[k] = {int(a): _r(v) for a, v in zip(g["any"], g["valor"]) if _r(v) is not None}
    # Posición en España en el último año con dato de cada ciudad
    for (k, a), g in ciu.groupby(["k", "any"]):
        g = g.dropna(subset=["valor"])
        gg = g[g["cod"].isin(ines)]
        if gg.empty:
            continue
        pos = g["valor"].rank(ascending=False, method="min")
        for cod, p in zip(g["cod"], pos):
            if cod in ines and res["mun"].get(cod, {}).get(k) and max(res["mun"][cod][k]) == a:
                res["rank"].setdefault(cod, {})[k] = [int(p), int(len(g)), int(a)]
    esp = m[m["cod"] == "00"]
    zones = {"esp": esp}
    fz = D / "urbans_zones.csv"
    if fz.exists():
        z = pd.read_csv(fz)
        z["valor"] = pd.to_numeric(z["valor"], errors="coerce")
        z["k"] = "u" + z["ind"].astype(str)
        for nom in ("auf", "kernel"):
            zz = z[z["zona"] == nom]
            if len(zz):
                zz = zz.assign(cod=nom)
                zones[nom] = pd.concat([zz, _derivades(zz).assign(k=lambda d: "u_" + d["ind"].astype(str))], ignore_index=True)
    for nom, z in zones.items():
        for k, g in z.groupby("k"):
            res["zones"].setdefault(nom, {})[k] = {int(a): _r(v) for a, v in zip(g["any"], g["valor"]) if _r(v) is not None}
    res["anys"]["ua"] = int(gi["any"].max()) if len(gi) else None
    res["resum"] = (f"{len(res['mun'])} ciudades de Girona, {gi['k'].nunique()} indicadores, posición entre {res['n']} municipios; "
                    f"zonas: {', '.join(sorted(res['zones']))}")
    return res


if __name__ == "__main__":
    import json
    from collections import namedtuple  # noqa: F401
    r = construir([{"ine": c} for c in ["17015", "17023", "17066", "17079", "17095", "17114", "17117", "17152", "17155", "17160"]])
    print(r["resum"])
    print(json.dumps(r["rank"].get("17079"), ensure_ascii=False)[:800])
