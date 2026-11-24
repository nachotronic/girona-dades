"""Ocupación de los alojamientos turísticos mes a mes (encuestas de ocupación del INE).

Lee data/processed/turisme/ine_turisme.json (fuentes/turisme.py, se actualiza cada mes) y escribe
web/datos/allotjaments.json, que la web pide la primera vez que pinta el bloque (web/allotjaments.js):

  ult    {tipo: 'AAAA-MM'}                 último mes publicado de cada tipo de alojamiento
  z      {zona: {t: {tipo: {ind: {s: 'AAAA-MM', v: [...]}}}}}
         zona = gi (provincia), cat, esp, cb (Costa Brava), pir (Pirineus) o el código INE del punto turístico
         tipo = hotel, camp, apt, rural
         ind  = via, via_e, via_x (viajeros total / residentes en España / en el extranjero),
                pern, pern_e, pern_x (pernoctaciones), ocup (plazas; parcelas en los campings), ocup_fs (fin de semana),
                ocup_u (habitaciones / apartamentos), est, pl, u (habitaciones / apartamentos / parcelas), pers,
                estada, adr, revpar
  orig   procedencia de las pernoctaciones hoteleras de residentes en España (últimos 12 meses, % por comunidad)
"""
from __future__ import annotations

import json
import pathlib
import re
import sys

import pandas as pd

RAIZ = pathlib.Path(__file__).resolve().parent.parent
sys.path.insert(0, str(RAIZ))
from fuentes.comun import normaliza  # noqa: E402

P = RAIZ / "data" / "processed"
DESDE = "2015-01"

# tabla: (tipo, nivel). Las de base nueva van después para que sus meses ganen a la serie antigua.
TAULES = [
    ("2074", "hotel", "prov"), ("2066", "hotel", "prov"), ("2065", "hotel", "prov"), ("2059", "hotel", "prov"), ("2057", "hotel", "prov"),
    ("2039", "hotel", "zona"), ("2013", "hotel", "zona"), ("2040", "hotel", "zona"), ("46297", "hotel", "zona"), ("46300", "hotel", "zona"),
    ("2078", "hotel", "punt"), ("75197", "hotel", "punt"), ("2076", "hotel", "punt"), ("75198", "hotel", "punt"), ("2077", "hotel", "punt"),
    ("46298", "hotel", "punt"), ("46301", "hotel", "punt"),
    ("2062", "camp", "prov"), ("2064", "camp", "prov"), ("2068", "camp", "prov"),
    ("2047", "camp", "zona"), ("2084", "camp", "punt"), ("75194", "camp", "punt"), ("2085", "camp", "punt"), ("75196", "camp", "punt"),
    ("2063", "apt", "prov"), ("2072", "apt", "prov"), ("2061", "apt", "prov"),
    ("2073", "rural", "prov"), ("2070", "rural", "prov"), ("2067", "rural", "prov"),
]
ESTADA = {"2065", "2040", "2077", "2068", "2061", "2067"}


def _zona(nom: str, nivell: str, noms: dict) -> str | None:
    parts = [p.strip() for p in nom.split(".")]
    if nivell == "prov":
        if "Girona" in parts:
            return "gi"
        if "Cataluña" in parts:
            return "cat"
        if "Nacional" in parts or "Total Nacional" in parts:
            return "esp"
        return None
    if nivell == "zona":
        return "cb" if "Costa Brava" in nom else "pir" if "Pirineus" in nom else None
    m = re.search(r"\b(17\d{3})-", nom)
    if m:
        return m.group(1)
    p = parts[0]
    if p in ("Nacional", "Total Nacional", "Cabanes"):
        return None
    return noms.get(normaliza(p))


def _indicador(nom: str, taula: str, tipus: str) -> str | None:
    n = nom
    if "Tasa de variación" in n:
        return None
    if "fin de semana" in n:
        return "ocup_fs"
    if "Grado de ocupación por plazas" in n:
        return "ocup"
    if "Grado de ocupación por parcelas" in n:
        return "ocup"
    if "Grado de ocupación por habitaciones" in n or "Grado de ocupación por apartamentos" in n:
        return "ocup_u"
    if "ocupadas" in n:
        return None
    if "Número de establecimientos" in n:
        return "est"
    if "habitaciones estimadas" in n or "apartamentos estimados" in n or "Número de parcelas" in n:
        return "u"
    if "Número de plazas" in n:
        return "pl"
    if "Personal empleado" in n:
        return "pers"
    if "RevPAR" in n:
        return "revpar"
    if "ADR" in n:
        return "adr"
    if taula in ESTADA:
        return "estada"
    for clau, base in (("Viajero", "via"), ("Pernoctaciones", "pern")):
        if clau in n:
            if "España" in n:
                return base + "_e"
            if "xtranjero" in n:
                return base + "_x"
            return base
    return None


def _mensual(s_):
    return {f"{a}-{fk:02d}": v for a, fk, v in s_["d"] if v is not None and fk and 1 <= fk <= 12}


def _mesos(desde: str, fins: str) -> list[str]:
    return [p.strftime("%Y-%m") for p in pd.period_range(desde, fins, freq="M")]


def construir() -> dict:
    f = P / "turisme" / "ine_turisme.json"
    if not f.exists():
        return {}
    d = json.loads(f.read_text(encoding="utf-8"))
    t = pd.read_csv(P / "territorio" / "municipios.csv", dtype=str)
    noms = {normaliza(n): i for n, i in zip(t["nom"], t["codi_ine"])}
    for alias, nom in (("castell-platja d'aro", "Castell d'Aro, Platja d'Aro i s'Agaró"), ("platja d'aro", "Castell d'Aro, Platja d'Aro i s'Agaró"),
                       ("torroella de montgri", "Torroella de Montgrí")):
        i = noms.get(normaliza(nom))
        if i:
            noms[normaliza(alias)] = i
    noms["girona"] = "17079"  # en las tablas de puntos «Girona» es la ciudad

    brut: dict = {}  # (zona, tipo, ind) -> {mes: valor}
    for taula, tipus, nivell in TAULES:
        for s_ in d.get(taula, {}).get("series", []):
            z = _zona(s_["nom"], nivell, noms)
            ind = _indicador(s_["nom"], taula, tipus)
            if not z or not ind:
                continue
            brut.setdefault((z, tipus, ind), {}).update(_mensual(s_))

    # Totales que faltan (zonas, puntos y alojamientos extrahoteleros solo dan residentes en España + extranjero)
    for (z, tipus, ind) in list(brut):
        if ind.endswith("_e"):
            base = ind[:-2]
            e, x = brut[(z, tipus, ind)], brut.get((z, tipus, base + "_x"), {})
            tot = brut.setdefault((z, tipus, base), {})
            for k in set(e) & set(x):
                tot.setdefault(k, e[k] + x[k])

    ult = {}
    for (z, tipus, ind), m in brut.items():
        if z == "gi" and ind == "pern" and m:
            ult[tipus] = max(m)
    out = {"ult": ult, "z": {}}
    for (z, tipus, ind), m in sorted(brut.items()):
        ks = sorted(k for k in m if k >= DESDE)
        if len(ks) < 3:
            continue
        mesos = _mesos(ks[0], ks[-1])
        dec = 2 if ind in ("estada", "ocup", "ocup_fs", "ocup_u", "adr", "revpar") else 0
        v = [None if m.get(k) is None else (round(m[k], dec) if dec else int(round(m[k]))) for k in mesos]
        out["z"].setdefault(z, {}).setdefault("t", {}).setdefault(tipus, {})[ind] = {"s": ks[0], "v": v}

    # Puntos turísticos que el INE dejó de publicar (algunos campings solo salen en 2024): fuera
    for z in [z for z in out["z"] if z.isdigit()]:
        for tipus in list(out["z"][z]["t"]):
            sr = out["z"][z]["t"][tipus].get("pern") or next(iter(out["z"][z]["t"][tipus].values()))
            fi = pd.Period(sr["s"], freq="M") + len(sr["v"]) - 1
            if tipus not in ult or fi < pd.Period(ult[tipus], freq="M") - 12:
                del out["z"][z]["t"][tipus]
        if not out["z"][z]["t"]:
            del out["z"][z]

    # Procedencia de los residentes en España (hoteles de la provincia): % de las pernoctaciones de los últimos 12 meses
    pe = brut.get(("gi", "hotel", "pern_e"), {})
    if pe:
        fins = max(pe)
        ult12 = _mesos(str(pd.Period(fins, freq="M") - 11), fins)
        acc = {}
        for s_ in d.get("2069", {}).get("series", []):
            n = s_["nom"]
            if ". Girona." not in n or "Pernoctaciones" not in n or "Nacional." in n.split("Residencia:")[-1]:
                continue
            ccaa = n.split("Residencia:")[-1].strip(" .")
            mm = _mensual(s_)
            acc[ccaa] = sum(mm.get(k, 0) / 100 * pe.get(k, 0) for k in ult12)
        tot = sum(acc.values())
        if tot:
            g = sorted(({"g": k, "v": round(v / tot * 100, 1)} for k, v in acc.items()), key=lambda x: -x["v"])
            out["orig"] = {"des": ult12[0], "fins": fins, "g": g}
    return out


def escriure(salida: pathlib.Path) -> dict:
    D = construir()
    if D:
        (salida / "allotjaments.json").write_text(json.dumps(D, ensure_ascii=False, separators=(",", ":"), allow_nan=False), encoding="utf-8")
    return D


if __name__ == "__main__":
    D = escriure(RAIZ / "web" / "datos")
    print({k: list(v["t"]) for k, v in D.get("z", {}).items()}, D.get("ult"))
