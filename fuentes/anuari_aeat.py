"""Agencia Tributaria: Anuario Estadístico, descarga masiva (CSV).

https://sede.agenciatributaria.gob.es/Sede/estadisticas/anuario-estadistico/acceso-descarga-masiva-datos.html

Ficheros (separador «;», coma decimal):
  modelo100.csv            IRPF por provincia (sexo, nacionalidad), desde 2009
  modelo190_salarios.csv   salarios del modelo 190 por provincia (sexo, sector, edad, nacionalidad)
  modelo190_pensiones.csv  pensiones del modelo 190 por provincia (sexo)
  IRPFmunicipios.csv       IRPF por municipio (más de 1.000 habitantes), desde 2013
Sociedades (200), IVA (390) y Patrimonio (714) solo se publican por comunidad autónoma: no se usan.

El fichero municipal identifica cada municipio con un código propio (MUNI_DEF). La tabla de
códigos está en el PDF de ayuda, pero le faltan los municipios que han superado hace poco los
1.000 habitantes; esos se identifican cruzando declaraciones y habitantes con la estadística
por municipios que baja fuentes/aeat.py (mismo año, mismas cifras). La correspondencia se guarda
y se acumula en codis.csv.

Salida (data/processed/anuari_aeat/):
  irpf_mun.csv.gz   año, municipio (código INE) o zona (gi, cat, esp) y conceptos
  m100.csv.gz       IRPF por zona, año, sexo y nacionalidad
  salaris.csv.gz    salarios por zona, año, sector y sexo
  pensions.csv.gz   pensiones por zona, año y sexo
  codis.csv         MUNI_DEF -> código INE (o provincia, en las agrupaciones)
"""
from __future__ import annotations

import io
import re

import pandas as pd

from .comun import PROC, RAW, carpeta, descargar

BASE = "https://sede.agenciatributaria.gob.es/static_files/Sede/Tema/Estadisticas/Anuario_estadistico/Exportacion/"
CAT = {"08", "17", "25", "43"}

# Conceptos municipales que se guardan
MUNI = {
    "decl": "MUNI_1", "hab": "MUNI_4", "treball": "MUNI_7", "capital": "MUNI_8", "immobles": "MUNI_9",
    "activitats": "MUNI_10", "guanys": "MUNI_12", "rb": "MUNI_23", "cotitz": "MUNI_26", "quota": "MUNI_27",
    "rd": "MUNI_28", "fills_decl": "MUNI_32", "pp_n": "MUNI_132", "pp": "MUNI_133",
    "viv_n": "MUNI_150", "viv": "MUNI_151", "ingressar_n": "MUNI_168", "tornar_n": "MUNI_170",
}
M100 = {"decl": "M100_35", "declarants": "M100_34", "treball": "M100_2", "bi": "M100_14", "big": "M100_12",
        "bia": "M100_13", "quota": "M100_30", "activitats_ed": "M100_7", "activitats_ona": "M100_8"}


def _leer(ruta) -> pd.DataFrame:
    bruto = ruta.read_bytes()
    try:
        texto = bruto.decode("utf-8-sig")
    except UnicodeDecodeError:
        texto = bruto.decode("latin-1")
    d = pd.read_csv(io.StringIO(texto), sep=";", dtype=str, keep_default_na=False)
    for c in d.columns:
        if re.match(r"^(M\d{3}_|M190_P|MUNI_\d)", c):
            d[c] = pd.to_numeric(d[c].str.replace(",", ".", regex=False), errors="coerce")
    return d


def _zona(d: pd.DataFrame) -> pd.DataFrame:
    """Repite las filas de Girona como «gi», las de Cataluña como «cat» y todas como «esp»."""
    prov = d["PROV"].astype(int).map("{:02d}".format)
    return pd.concat([d[prov == "17"].assign(zona="gi"), d[prov.isin(CAT)].assign(zona="cat"), d.assign(zona="esp")])


def _codis_pdf(raw) -> dict[str, str]:
    try:
        import pypdf
        f = descargar(BASE + "AyudaCSV_AnuarioMunicipal.pdf", raw / "AyudaCSV_AnuarioMunicipal.pdf")
        cod = {}
        for p in pypdf.PdfReader(str(f)).pages:
            for l in (p.extract_text() or "").splitlines():
                m = re.match(r"^\s*(\d+)\s+(.*)-(\d{5}|\d{2})\s*$", l)
                if m:
                    cod[m.group(1)] = m.group(3)
                m = re.match(r"^\s*(\d+)\s+.*Resto acumulado - (.+?)\s*$", l)
                if m:
                    cod[m.group(1)] = "resto:" + m.group(2)
        return cod
    except Exception:  # noqa: BLE001
        return {}


def _municipal(raw, out, lineas):
    d = _leer(descargar(BASE + "IRPFmunicipios.csv", raw / "IRPFmunicipios.csv", timeout=900))
    fc = out / "codis.csv"
    codis = dict(pd.read_csv(fc, dtype=str).values) if fc.exists() else {}
    pdf = _codis_pdf(raw)
    if not pdf:
        lineas.append("PDF de códigos: ERROR no se ha podido leer (se usan los códigos guardados)")
    # Cruce con la estadística por municipios (declaraciones + habitantes del mismo año)
    fa = PROC / "aeat" / "irpf_municipios.csv"
    cruce = {}
    if fa.exists():
        a = pd.read_csv(fa, dtype={"ine": str, "any": str})
        a = a[a["ine"].str.len() == 5]
        for _, r_ in a.iterrows():
            n, h = r_.get("t0|NÚMERO DE DECLARACIONES|1"), r_.get("t0|NÚMERO DE HABITANTES|1")
            if n == n and h == h:
                cruce[(r_["any"], int(n), int(h))] = r_["ine"]
    # El PDF manda; el cruce solo identifica los códigos que no están en él, y solo si las cifras no se repiten
    for k, v in pdf.items():
        codis.setdefault(k, v)
    claus = d[["EJER", "MUNI_DEF", "MUNI_1", "MUNI_4"]].dropna()
    claus = claus.assign(k=list(zip(claus["EJER"], claus["MUNI_1"].astype(int), claus["MUNI_4"].astype(int))))
    unica = claus["k"].map(claus["k"].value_counts()) == 1
    for _, r_ in claus[unica & ~claus["MUNI_DEF"].isin(list(codis))].iterrows():
        if r_["k"] in cruce:
            codis[r_["MUNI_DEF"]] = cruce[r_["k"]]
    pd.DataFrame(sorted(codis.items(), key=lambda x: int(x[0])), columns=["muni_def", "codi"]).to_csv(fc, index=False)
    # Provincia de las «Resto acumulado - <nombre>»: la de los municipios con el mismo nombre de provincia no está; basta Girona
    codi = d["MUNI_DEF"].map(codis).fillna("")
    prov = codi.str[:2].where(codi.str.match(r"^\d"), "")
    prov = prov.where(~codi.str.contains("resto:Girona"), "17")
    prov = prov.where(~codi.str.contains(r"resto:(?:Barcelona|Lleida|Tarragona)"), "cat")
    sin = int((codi == "").sum())
    t = d[["EJER"] + list(MUNI.values())].rename(columns={v: k for k, v in MUNI.items()}).rename(columns={"EJER": "any"})
    files = [t[codi.str.match(r"^17\d{3}$")].assign(ine=codi)]
    files.append(t[prov == "17"].groupby("any", as_index=False).sum(numeric_only=True).assign(ine="gi"))
    files.append(t[prov.isin(CAT) | (prov == "cat")].groupby("any", as_index=False).sum(numeric_only=True).assign(ine="cat"))
    files.append(t.groupby("any", as_index=False).sum(numeric_only=True).assign(ine="esp"))
    res = pd.concat(files, ignore_index=True)
    res = res[["any", "ine"] + list(MUNI)]
    res.to_csv(out / "irpf_mun.csv.gz", index=False, compression="gzip")
    n_gi = res[res["ine"].str.len() == 5]
    lineas.append(f"IRPF municipal: {n_gi['ine'].nunique()} municipios de Girona, años {res['any'].min()}-{res['any'].max()}"
                  f" ({sin} filas de España sin código)")


def ejecutar() -> str:
    out = carpeta("anuari_aeat")
    raw = RAW / "anuari_aeat"
    raw.mkdir(parents=True, exist_ok=True)
    lineas = []
    try:
        d = _zona(_leer(descargar(BASE + "modelo100.csv", raw / "modelo100.csv", timeout=600)))
        t = d.groupby(["zona", "EJER", "SEXO", "NACIONALIDAD"])[list(M100.values())].sum().reset_index()
        t = t.rename(columns={v: k for k, v in M100.items()} | {"EJER": "any", "SEXO": "sexe", "NACIONALIDAD": "nac"})
        t.to_csv(out / "m100.csv.gz", index=False, compression="gzip")
        lineas.append(f"IRPF provincial: años {t['any'].min()}-{t['any'].max()}")
    except Exception as e:  # noqa: BLE001
        lineas.append(f"modelo100: ERROR {type(e).__name__}: {str(e)[:150]}")
    try:
        d = _zona(_leer(descargar(BASE + "modelo190_salarios.csv", raw / "modelo190_salarios.csv", timeout=600)))
        cols = [f"M190_{i}" for i in range(1, 22)]
        t = d.groupby(["zona", "EJER", "SECTOR", "SEXO"])[cols].sum().reset_index()
        t.columns = ["zona", "any", "sector", "sexe"] + [c.lower() for c in cols]
        t.to_csv(out / "salaris.csv.gz", index=False, compression="gzip")
        lineas.append(f"salarios: años {t['any'].min()}-{t['any'].max()}")
    except Exception as e:  # noqa: BLE001
        lineas.append(f"modelo190_salarios: ERROR {type(e).__name__}: {str(e)[:150]}")
    try:
        d = _zona(_leer(descargar(BASE + "modelo190_pensiones.csv", raw / "modelo190_pensiones.csv", timeout=600)))
        t = d.groupby(["zona", "EJER", "SEXO"])[["M190_P1", "M190_P2", "M190_P3"]].sum().reset_index()
        t.columns = ["zona", "any", "sexe", "percepcions", "import", "pensionistes"]
        t.to_csv(out / "pensions.csv.gz", index=False, compression="gzip")
        lineas.append(f"pensiones: años {t['any'].min()}-{t['any'].max()}")
    except Exception as e:  # noqa: BLE001
        lineas.append(f"modelo190_pensiones: ERROR {type(e).__name__}: {str(e)[:150]}")
    try:
        _municipal(raw, out, lineas)
    except Exception as e:  # noqa: BLE001
        lineas.append(f"IRPFmunicipios: ERROR {type(e).__name__}: {str(e)[:150]}")
    return "\n".join(lineas)
