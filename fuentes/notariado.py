"""Consejo General del Notariado, Centro de Información Estadística (CIEN): actos notariales.

El buscador «Estadísticas al completo» (www.notariado.org/liferay/web/cien/estadisticas-al-completo)
sirve los datos del Índice Único Informatizado por POST a /cienServices/service/buscador/json. Para
Girona solo hay detalle provincial (ningún acto se publica por municipio fuera de las grandes
ciudades), así que se descargan todas las provincias y el total de España para poder compararlas.

Cada indicador se pide con la frecuencia más fina que el Notariado publica para las provincias
(mensual o trimestral). Se guarda una tabla larga:

  data/processed/notariado/actes.csv   clau, zona (código INE de provincia o ES), any, per
                                       (mes 1-12 o trimestre 1-4), freq (m/t),
                                       var (n = número de actos, cuantia = importe medio en €,
                                       capital, capital_mitja, socis, socis_mitja), valor
"""
from __future__ import annotations

import datetime as dt
import time

import pandas as pd

from .comun import PROC, carpeta, normaliza, post

URL = "https://www.notariado.org/cienServices/service/buscador/json"
DES_DE = "01/01/2007"

# Provincias del Notariado (prov_id del árbol geográfico) -> código INE. Ceuta y Melilla van juntas y se dejan.
PROVS = {52: "04", 51: "11", 50: "14", 49: "18", 48: "21", 47: "23", 46: "29", 45: "41", 44: "22", 43: "44", 42: "50",
         41: "33", 40: "07", 39: "35", 38: "38", 37: "39", 30: "09", 29: "24", 28: "34", 27: "37", 26: "40", 25: "42",
         24: "47", 23: "49", 31: "05", 36: "02", 35: "13", 34: "16", 33: "19", 32: "45", 22: "08", 21: "17", 20: "25",
         19: "43", 18: "03", 17: "12", 16: "46", 15: "06", 14: "10", 10: "15", 13: "27", 12: "32", 11: "36", 9: "28",
         8: "30", 7: "31", 2: "20", 1: "48", 3: "01", 6: "26"}
# Nombre que devuelve el servicio (normalizado) -> código INE
NOMS = {normaliza(n): c for n, c in {
    "Almería": "04", "Cádiz": "11", "Córdoba": "14", "Granada": "18", "Huelva": "21", "Jaén": "23", "Málaga": "29",
    "Sevilla": "41", "Huesca": "22", "Teruel": "44", "Zaragoza": "50", "Asturias": "33", "Illes Balears": "07",
    "Las Palmas": "35", "Tenerife": "38", "Cantabria": "39", "Burgos": "09", "León": "24", "Palencia": "34",
    "Salamanca": "37", "Segovia": "40", "Soria": "42", "Valladolid": "47", "Zamora": "49", "Ávila": "05",
    "Albacete": "02", "Ciudad Real": "13", "Cuenca": "16", "Guadalajara": "19", "Toledo": "45", "Barcelona": "08",
    "Girona": "17", "Lleida": "25", "Tarragona": "43", "Alicante": "03", "Castellón": "12", "Valencia": "46",
    "Badajoz": "06", "Cáceres": "10", "A Coruña": "15", "Lugo": "27", "Ourense": "32", "Pontevedra": "36",
    "Madrid": "28", "Murcia": "30", "Navarra": "31", "Guipúzcoa": "20", "Vizcaya": "48", "Álava": "01",
    "La Rioja": "26"}.items()}

VARS = {"12": "n", "7": "cuantia", "2": "capital", "4": "capital_mitja", "24": "socis", "11": "socis_mitja"}
FREQ = {"02": "m", "04": "t", "03": "s"}
G, P, S = "SOLREC_ACTOS_GENERAL", "SOLREC_ACTOS_PRESTAMOS", "SOLREC_ACTOS_SOCIEDADES"

# clau -> (actos, tabla, variables, temporal, parámetros extra)
INDICADORS = {
    "herencies": ("1103", G, "12", "02", {}),
    "testaments": ("0201", G, "12", "04", {}),
    "abintestat": ("1624", G, "12", "04", {}),
    "donacions": ("0701", G, "12", "04", {}),
    "poder_general": ("1401", G, "12", "04", {}),
    "poder_plets": ("1403", G, "12", "02", {}),
    "poder_altres": ("1405", G, "12", "02", {}),
    "hip_vivenda": ("12013", P, "12,7", "02", {"fpid": "1", "ocpid": "3"}),
    "hip_total": ("12013", P, "12,7", "02", {"fpid": "", "ocpid": ""}),
    "cancel_hip": ("1302", P, "12,7", "02", {"fpid": "", "ocpid": ""}),
    "subrogacio": ("0805", P, "12,7", "04", {"fpid": "", "ocpid": ""}),
    "polissa": ("1701", G, "12,7", "02", {}),
    "polissa_aval": ("1702", G, "12,7", "02", {}),
    "societats": ("19011", S, "12,2,4,24,11", "04", {"rcid": ""}),
    "segregacio": ("0401", G, "12", "04", {}),
    "subsanacio": ("1007", G, "12", "04", {}),
}


def consulta(clau: str, geografia: str) -> list[dict]:
    actos, tabla, variables, temporal, extra = INDICADORS[clau]
    fi = dt.date.today().replace(day=1) - dt.timedelta(days=1)
    params = {"actos": actos, "tabla": tabla, "variables": variables, "geografia": geografia, "ccaaid": "",
              "provid": ",".join(str(p) for p in PROVS) if geografia == "05" else "", "munid": "", "distid": "",
              "temporal": temporal, "fechaInicio": DES_DE, "fechaFin": fi.strftime("%d/%m/%Y"), **extra}
    for intent in range(4):
        try:
            r = post(URL, params, timeout=300)
            r.encoding = "latin-1"
            js = r.json()
            break
        except Exception:  # noqa: BLE001
            if intent == 3:
                raise
            time.sleep(10 * (intent + 1))
    if "datos" not in js:
        raise RuntimeError(f"respuesta sin datos: {str(js)[:200]}")
    files = []
    freq = FREQ[temporal]
    for d in js["datos"]:
        zona = "ES" if geografia == "04" else NOMS.get(normaliza(d.get("PROVINCIADESC", "")))
        if zona is None:
            continue
        per = d.get("MES") or d.get("TRIMESTRE") or d.get("SEMESTRE") or "1"
        vs = d["VARIABLES"] if isinstance(d["VARIABLES"], list) else [d["VARIABLES"]]
        for v in vs:
            if v.get("VALOR") in (None, ""):
                continue
            files.append({"clau": clau, "zona": zona, "any": int(d["ANO"]), "per": int(per), "freq": freq,
                          "var": VARS.get(str(v["ID"]), str(v["ID"])), "valor": float(v["VALOR"])})
    return files


def ejecutar() -> str:
    lineas: list[str] = []
    totes: list[dict] = []
    for clau in INDICADORS:
        for geo in ("05", "04"):
            try:
                f = consulta(clau, geo)
                totes += f
                if geo == "05":
                    gi = [x for x in f if x["zona"] == "17"]
                    ult = max(((x["any"], x["per"]) for x in gi), default=None)
                    lineas.append(f"{clau}: {len({x['zona'] for x in f})} provincias, Girona {len(gi)} valores, último {ult}")
            except Exception as e:  # noqa: BLE001
                lineas.append(f"ERROR {clau} ({'provincias' if geo == '05' else 'España'}): {type(e).__name__}: {str(e)[:200]}")
            time.sleep(1)
    if not totes:
        raise RuntimeError("el Notariado no ha devuelto datos")
    d = pd.DataFrame(totes).drop_duplicates(["clau", "zona", "any", "per", "var"], keep="last")
    d.sort_values(["clau", "zona", "any", "per", "var"]).to_csv(carpeta("notariado") / "actes.csv", index=False)
    lineas.append(f"actes.csv: {len(d)} filas, {d['clau'].nunique()} indicadores")
    return "\n".join(lineas)


if __name__ == "__main__":
    print(ejecutar())
    print(PROC)
