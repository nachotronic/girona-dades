"""INE, Cifras oficiales de población de los municipios (revisión del Padrón municipal).

El INE publica una tabla por provincia ("Girona: Población por municipios y sexo") con la
serie anual desde 1996. Se localiza entre las tablas de la operación por su nombre y se
guarda en largo: ine, any, valor (población total).
"""
from __future__ import annotations

import io
import json

import pandas as pd

from .comun import carpeta, get

API = "https://servicios.ine.es/wstempus/js/ES"
CSV = "https://www.ine.es/jaxiT3/files/t/es/csv_bdsc/{id}.csv"
OPERACIONES = ("22", "PMH", "IOE30245", "30245")


def _busca(lineas) -> int | None:
    for op in OPERACIONES:
        try:
            tablas = get(f"{API}/TABLAS_OPERACION/{op}", timeout=120).json()
        except Exception as e:  # noqa: BLE001
            lineas.append(f"op {op}: ERROR {e}")
            continue
        if not isinstance(tablas, list):
            lineas.append(f"op {op}: sin tablas")
            continue
        cand = [t for t in tablas if "Girona" in t.get("Nombre", "") or "Gerona" in t.get("Nombre", "")]
        lineas.append(f"op {op}: {len(tablas)} tablas, {len(cand)} de Girona: " + "; ".join(f"{t['Id']} {t['Nombre']}" for t in cand[:6]))
        for t in cand:
            if "municipio" in t["Nombre"].lower():
                return t["Id"]
    return None


def _dirce(sal, lineas) -> None:
    """DIRCE: tablas de empresas por municipio. El CSV completo es de toda España: se lee en
    streaming y se guardan solo las filas de municipios de Girona (código 17xxx)."""
    import re
    import requests
    try:
        tablas = get(f"{API}/TABLAS_OPERACION/DIRCE", timeout=120).json()
    except Exception as e:  # noqa: BLE001
        lineas.append(f"DIRCE: ERROR {e}")
        return
    cand = [t for t in tablas if "unicipio" in t.get("Nombre", "")]
    lineas.append(f"DIRCE: {len(tablas)} tablas; por municipio: " + "; ".join(f"{t['Id']} {t['Nombre']}" for t in cand[:8]))
    pat = re.compile(r"(^|;)17\d{3} ")
    for t in cand[:3]:
        try:
            with requests.get(CSV.format(id=t["Id"]), stream=True, timeout=1800) as r:
                r.raise_for_status()
                it = r.iter_lines(decode_unicode=False)
                cap = next(it).decode("utf-8-sig")
                files = [cap] + [l.decode("utf-8", "replace") for l in it if pat.search(l.decode("utf-8", "replace"))]
            (sal / f"dirce_{t['Id']}.csv").write_text("\n".join(files), encoding="utf-8")
            lineas.append(f"DIRCE {t['Id']}: {len(files) - 1} filas de Girona")
        except Exception as e:  # noqa: BLE001
            lineas.append(f"DIRCE {t['Id']}: ERROR {type(e).__name__} {str(e)[:120]}")


def _esperanca(sal, lineas) -> None:
    """Esperanza de vida al nacer por municipio (INE, IDB 30687) y por provincia (77117)."""
    from .territorio import municipios
    noms = set(municipios()["nom"]) | {"Girona", "Gerona", "Cataluña", "Total Nacional", "Total"}
    res = {}
    for ident in ("30687", "77117"):
        try:
            d = get(f"{API}/DATOS_TABLA/{ident}?nult=15", timeout=600).json()
            series = []
            for x in d:
                nom = x.get("Nombre", "")
                cap = nom.split(".")[0].strip()
                if cap in noms or "Girona" in nom or "Cataluña" in nom or "Nacional" in nom:
                    series.append({"nom": nom, "d": [[p.get("Anyo"), p.get("Valor")] for p in x.get("Data", [])]})
            res[ident] = series
            lineas.append(f"esperanza {ident}: {len(series)} series de {len(d)}; ej.: " + "; ".join(s_["nom"] for s_ in series[:4]))
        except Exception as e:  # noqa: BLE001
            lineas.append(f"esperanza {ident}: ERROR {type(e).__name__} {str(e)[:120]}")
    (sal / "esperanca.json").write_text(json.dumps(res, ensure_ascii=False), encoding="utf-8")


def ejecutar() -> str:
    sal = carpeta("padro")
    lineas = []
    _esperanca(sal, lineas)
    _dirce(sal, lineas)
    ident = _busca(lineas)
    if not ident:
        return "\n".join(lineas + ["No se ha encontrado la tabla de Girona"])
    r = get(CSV.format(id=ident), timeout=900)
    df = pd.read_csv(io.BytesIO(r.content), sep=";", dtype=str, encoding="utf-8-sig")
    df.columns = [c.strip() for c in df.columns]
    mun = next(c for c in df.columns if c.startswith("Municipio"))
    df = df[df[mun].notna() & df[mun].str.match(r"^17\d{3}")].copy()
    sexe = next((c for c in df.columns if c.startswith("Sexo")), None)
    if sexe:
        df = df[df[sexe].str.strip() == "Total"]
    out = pd.DataFrame({
        "ine": df[mun].str[:5],
        "any": df["Periodo"].str[-4:],
        "valor": pd.to_numeric(df["Total"].str.replace(".", "", regex=False).str.replace(",", ".", regex=False), errors="coerce"),
    }).dropna()
    out.to_csv(sal / "poblacio_municipis.csv.gz", index=False)
    (sal / "tabla.json").write_text(json.dumps({"id": ident}), encoding="utf-8")
    lineas.append(f"tabla {ident}: {out['ine'].nunique()} municipios, años {out['any'].min()}-{out['any'].max()}")
    return "\n".join(lineas)
