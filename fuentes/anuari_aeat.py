"""Agencia Tributaria: Anuario Estadístico, descarga masiva (CSV).

https://sede.agenciatributaria.gob.es/Sede/estadisticas/anuario-estadistico/acceso-descarga-masiva-datos.html

Ficheros (separador «;», coma decimal, desde el ejercicio 2009):
  modelo100.csv            IRPF por CCAA y provincia (sexo, nacionalidad)
  modelo190_salarios.csv   salarios (modelo 190) por CCAA y provincia (sexo, sector)
  modelo190_pensiones.csv  pensiones (modelo 190) por CCAA y provincia (sexo)
  modelo200.csv            Sociedades, solo CCAA
  modelo390.csv            IVA, solo CCAA
  modelo714.csv            Patrimonio, solo CCAA
  IRPFmunicipios.csv       IRPF por municipio (serie larga)

Fase de exploración: se guardan los ficheros (filtrados a Girona, Cataluña y España cuando es
posible) y un resumen de columnas y valores de cada dimensión en esquema.txt.
"""
from __future__ import annotations

import io

import pandas as pd

from .comun import RAW, carpeta, descargar

BASE = "https://sede.agenciatributaria.gob.es/static_files/Sede/Tema/Estadisticas/Anuario_estadistico/Exportacion/"
FICHEROS = ["modelo100", "modelo190_salarios", "modelo190_pensiones", "modelo200", "modelo390", "modelo714", "IRPFmunicipios"]


def _leer(ruta) -> pd.DataFrame:
    bruto = ruta.read_bytes()
    for enc in ("utf-8-sig", "latin-1"):
        try:
            texto = bruto.decode(enc)
            break
        except UnicodeDecodeError:
            continue
    return pd.read_csv(io.StringIO(texto), sep=";", dtype=str, keep_default_na=False)


def _esquema(nombre: str, d: pd.DataFrame) -> list[str]:
    lin = [f"## {nombre}: {d.shape[0]} filas x {d.shape[1]} columnas", "columnas: " + ", ".join(d.columns)]
    for c in d.columns:
        if c.startswith(("M1", "M2", "M3", "M7", "MUNI_")) and c not in ("MUNI_DEF",):
            continue
        v = d[c].unique()
        lin.append(f"- {c} ({len(v)}): " + " | ".join(map(str, v[:60])))
    lin.append("muestra:")
    lin.append(d.head(5).to_csv(sep=";", index=False))
    return lin


def ejecutar() -> str:
    out = carpeta("anuari_aeat")
    raw = RAW / "anuari_aeat"
    raw.mkdir(parents=True, exist_ok=True)
    resumen, esquema = [], []
    for nom in FICHEROS:
        try:
            f = descargar(BASE + nom + ".csv", raw / f"{nom}.csv", timeout=600)
            d = _leer(f)
            esquema += _esquema(nom, d)
            if nom == "IRPFmunicipios":
                # municipios de Girona + filas agregadas (sin código de municipio de 5 cifras)
                cod = d.get("MUNICIPIO", d.iloc[:, 0]).astype(str)
                prov = d.get("PROVINCIA", pd.Series([""] * len(d))).astype(str)
                ccaa = d.get("CCAA", pd.Series([""] * len(d))).astype(str)
                m = cod.str.contains(r"-17\d{3}$") | prov.str.contains("17") | ~cod.str.contains(r"\d{5}$") \
                    | ccaa.str.contains(r"Catalu|^0?9\b")
                d = d[m]
            d.to_csv(out / f"{nom}.csv.gz", index=False, compression="gzip")
            resumen.append(f"{nom}: {len(d)} filas")
        except Exception as e:  # noqa: BLE001
            resumen.append(f"{nom}: ERROR {type(e).__name__}: {str(e)[:150]}")
    (out / "esquema.txt").write_text("\n".join(esquema), encoding="utf-8")
    return "; ".join(resumen)
