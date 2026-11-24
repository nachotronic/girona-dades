"""INE, Indicadores Urbanos (Urban Audit): ~45 indicadores anuales de los municipios de más de 20.000 habitantes.

Operación UA del INE (Tempus3). Siete ámbitos (demografía, aspectos sociales, económicos, formación,
suelo, desplazamientos al trabajo y turismo), cada uno con una tabla por nivel territorial:
  69329-69335  municipios de más de 20.000 habitantes (y el total nacional)
  69315-69321  conurbaciones (KERNEL)        -> Conurbación de Girona (ES030C)
  69322-69328  áreas urbanas funcionales (FUA) -> AUF de Girona (ES030F)
Las zonas submunicipales (SCD) solo existen para 10 grandes ciudades; Girona no tiene.

Se guarda solo el total por sexo. Se descargan todos los municipios de España para poder dar la
posición de cada ciudad gironina entre las ~435 de más de 20.000 habitantes.

Escribe en data/processed/urbans/:
  urbans_mun.csv.gz  cod (INE de 5 cifras; «00» = total nacional), ind, any, valor (todas las ciudades)
  urbans_zones.csv   zona (auf, kernel, esp), ind, any, valor para la AUF y la conurbación de Girona
  urbans_ind.csv     ind (Id del INE), tabla, ambito, nombre, unidad
"""
from __future__ import annotations

import pandas as pd

from .comun import carpeta, get

API = "https://servicios.ine.es/wstempus/js/ES"
AMBITS = ["dem", "soc", "eco", "edu", "sol", "mob", "tur"]
T_MUN = range(69329, 69336)
T_KERNEL = range(69315, 69322)
T_FUA = range(69322, 69329)
SEXE_TOTAL = 451            # Sexo = Total (variable 18)
FUA_GIRONA = (599, 305260)  # AUF de Girona
KERNEL_GIRONA = (600, 437982)  # Conurbación de Girona
NO_IND = {"Municipios", "Sexo", "Total Nacional", "Supraciudad", "Conurbación", "Subciudad"}


def _taula(t: int, filtre: str = "") -> list[dict]:
    r = get(f"{API}/DATOS_TABLA/{t}?tip=AM&tv=18:{SEXE_TOTAL}{filtre}", timeout=600, reintentos=5)
    j = r.json()
    if not isinstance(j, list):
        raise RuntimeError(f"tabla {t}: respuesta inesperada {str(j)[:200]}")
    return j


def _files(series: list[dict], t: int, cat: dict) -> list[dict]:
    out = []
    for s in series:
        md = s.get("MetaData") or []
        ind = next((m for m in md if m.get("T3_Variable") not in NO_IND), None)
        if ind is None:
            continue
        lloc = next((m for m in md if m.get("T3_Variable") in ("Municipios", "Supraciudad", "Conurbación")), None)
        nac = next((m for m in md if m.get("T3_Variable") == "Total Nacional"), None)
        cod = (lloc or {}).get("Codigo") if lloc else ("00" if nac else None)
        if not cod:
            continue
        cat.setdefault(ind["Id"], {"ind": ind["Id"], "tabla": t, "ambit": AMBITS[(t - 69301) % 7],
                                   "nombre": ind["Nombre"].strip(), "unidad": (s.get("T3_Unidad") or "").strip()})
        for d in s.get("Data") or []:
            if d.get("Valor") is None:
                continue
            out.append({"cod": cod, "ind": ind["Id"], "any": int(d["Anyo"]), "valor": d["Valor"]})
    return out


def ejecutar() -> str:
    d = carpeta("urbans")
    cat: dict = {}
    files, errors = [], []
    for t in T_MUN:
        try:
            files += _files(_taula(t), t, cat)
        except Exception as e:  # noqa: BLE001 - una tabla que falla no tumba las demás
            errors.append(f"municipios {t}: ERROR {type(e).__name__} {e}")
    if not files:
        raise RuntimeError("; ".join(errors) or "sin datos")
    m = pd.DataFrame(files).drop_duplicates(["cod", "ind", "any"]).sort_values(["ind", "cod", "any"])
    m["cod"] = m["cod"].astype(str)
    m.to_csv(d / "urbans_mun.csv.gz", index=False, compression={"method": "gzip", "mtime": 0})

    zones = []
    for nom, taules, (var, val) in (("auf", T_FUA, FUA_GIRONA), ("kernel", T_KERNEL, KERNEL_GIRONA)):
        for t in taules:
            try:
                for f in _files(_taula(t, f"&tv={var}:{val}"), t, cat):
                    if f["cod"] != "00":
                        zones.append({"zona": nom, **{k: f[k] for k in ("ind", "any", "valor")}})
            except Exception as e:  # noqa: BLE001
                errors.append(f"{nom} {t}: ERROR {type(e).__name__} {e}")
    esp = m[m["cod"] == "00"]
    zones += [{"zona": "esp", "ind": r.ind, "any": r.any, "valor": r.valor} for r in esp.itertuples()]
    pd.DataFrame(zones).sort_values(["zona", "ind", "any"]).to_csv(d / "urbans_zones.csv", index=False)
    pd.DataFrame(cat.values()).sort_values(["tabla", "ind"]).to_csv(d / "urbans_ind.csv", index=False)

    gi = m[m["cod"].str.startswith("17")]
    ciutats = m[m["cod"] != "00"]["cod"].nunique()
    res = (f"{len(cat)} indicadores, {ciutats} municipios de España ({gi['cod'].nunique()} de Girona), "
           f"{m['any'].min()}-{m['any'].max()}; AUF y conurbación de Girona: {len([z for z in zones if z['zona'] != 'esp'])} valores")
    return "; ".join([res] + errors)
