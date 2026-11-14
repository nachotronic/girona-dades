"""Población por nacionalidad (INE, Estadística del Padrón Continuo, operación 188).

El INE publica una tabla por provincia con el mismo nombre; la de Girona se localiza
mirando la primera serie de cada candidata. Se usan dos:
- "Población por sexo, municipios y nacionalidad (principales nacionalidades)"
- "Población por sexo, municipios, nacionalidad (español/extranjero) y edad (grandes grupos)"
Se descarga el CSV completo (todos los años) y se guarda en largo.
"""
from __future__ import annotations

import io
import json

import pandas as pd

from .comun import carpeta, get

API = "https://servicios.ine.es/wstempus/js/ES"
CSV = "https://www.ine.es/jaxiT3/files/t/es/csv_bdsc/{id}.csv"
TABLAS = {
    "nacionalitats": "municipios y nacionalidad (principales nacionalidades)",
    "edat_nacionalitat": "municipios, nacionalidad (español/extranjero) y edad",
}


def _busca(sal) -> dict[str, int]:
    cache = sal / "tablas_girona.json"
    if cache.exists():
        return json.loads(cache.read_text())
    tablas = get(f"{API}/TABLAS_OPERACION/188", timeout=120).json()
    res = {}
    for clave, texto in TABLAS.items():
        for t in tablas:
            if texto not in t["Nombre"] or "islas" in t["Nombre"]:
                continue
            s = get(f"{API}/SERIES_TABLA/{t['Id']}", params={"page": 1}, pausa=0.2).json()
            if isinstance(s, list) and s and ". Girona." in s[0].get("Nombre", ""):
                res[clave] = t["Id"]
                break
    cache.write_text(json.dumps(res, indent=1))
    return res


def _llegeix(ident: int) -> pd.DataFrame:
    r = get(CSV.format(id=ident), timeout=900)
    df = pd.read_csv(io.BytesIO(r.content), sep=";", dtype=str, encoding="utf-8-sig")
    df.columns = [c.strip() for c in df.columns]
    mun = next(c for c in df.columns if c.startswith("Municipios"))
    df = df[df[mun].notna() & df[mun].str.match(r"^17\d{3}")].copy()
    df["ine"] = df[mun].str[:5]
    df["valor"] = pd.to_numeric(df["Total"].str.replace(".", "", regex=False).str.replace(",", ".", regex=False), errors="coerce")
    df["any"] = df["Periodo"].str[-4:]
    sexe = next((c for c in df.columns if c.startswith("Sexo")), None)
    if sexe:
        df = df[df[sexe].str.strip() == "Total"]
    return df.drop(columns=[c for c in (mun, "Total", "Periodo", sexe, "Provincias", "Total Nacional") if c and c in df.columns])


IDC = "https://api.idescat.cat/taules/v2/censph"


def _jsonstat(d: dict) -> pd.DataFrame:
    """JSON-stat (dataset) a tabla larga con una columna por dimensión (código) y 'valor'."""
    ids, mida = d["id"], d["size"]
    cats = [list(d["dimension"][k]["category"]["index"]) for k in ids]
    if isinstance(d["dimension"][ids[0]]["category"]["index"], dict):
        cats = [sorted(d["dimension"][k]["category"]["index"], key=d["dimension"][k]["category"]["index"].get) for k in ids]
    vals = d["value"]
    if isinstance(vals, dict):
        vals = [vals.get(str(i)) for i in range(int(pd.Series(mida).prod()))]
    idx = pd.MultiIndex.from_product(cats, names=ids)
    return pd.DataFrame({"valor": vals}, index=idx).reset_index()


def _idescat(sal, mun: pd.DataFrame) -> str:
    """Censo anual (Idescat): extranjeros por país (6000) y población por nacionalidad y edad (16352), por municipio."""
    lineas = []
    for taula, nom, extra in (("6000", "paisos", "&SEX=TOTAL"), ("16352", "edat_nac", "&SEX=TOTAL")):
        node = get(f"{IDC}/{taula}?lang=ca").json()["link"]["item"][0]["href"].split("?")[0]
        parts, etiquetes = [], {}
        # Idescat solo publica este detalle para los municipios grandes: se piden los que lista el nodo
        disp = set(get(f"{node}/mun?lang=ca").json()["dimension"]["MUN"]["category"]["index"])
        for codi in [c for c in mun["codi6"] if c in disp]:
            try:
                d = get(f"{node}/mun/data?lang=ca&MUN={codi}{extra}", pausa=0.15).json()
            except Exception:  # noqa: BLE001
                continue
            parts.append(_jsonstat(d))
            if not etiquetes:
                etiquetes = {k: v["category"].get("label", {}) for k, v in d["dimension"].items()}
                try:
                    de = get(f"{node}/mun/data?lang=es&MUN={codi}{extra}").json()
                    etiquetes = {k: {c: [etiquetes[k].get(c, c), v["category"].get("label", {}).get(c, c)] for c in v["category"].get("label", {})}
                                 for k, v in de["dimension"].items()}
                except Exception:  # noqa: BLE001
                    pass
        try:
            pv = _jsonstat(get(f"{node}/prov/data?lang=ca{extra}").json())
            pv = pv.rename(columns={"PROV": "MUN"})
            pv["MUN"] = "P" + pv["MUN"].astype(str)
            parts.append(pv)
            ct = _jsonstat(get(f"{node}/cat/data?lang=ca{extra}").json())
            ct = ct.rename(columns={"CAT": "MUN"})
            ct["MUN"] = "CAT"
            parts.append(ct)
        except Exception as e:  # noqa: BLE001
            lineas.append(f"idescat {taula} prov/cat: ERROR {type(e).__name__}: {str(e)[:200]}")
        df = pd.concat(parts)
        df.to_csv(sal / f"idescat_{nom}.csv.gz", index=False)
        (sal / f"idescat_{nom}_etiquetes.json").write_text(json.dumps(etiquetes, ensure_ascii=False), encoding="utf-8")
        lineas.append(f"idescat {taula}: {len(df)} filas, {df['MUN'].nunique()} municipios, columnas {list(df.columns)}")
    return "\n".join(lineas)


def ejecutar() -> str:
    from .territorio import municipios
    sal = carpeta("nacionalitat")
    lineas = []
    try:
        m = municipios()
        col = next(c for c in m.columns if c in ("codi_idescat", "codi", "codi6", "codi_municipi"))
        m = m.assign(codi6=m[col].astype(str).str.zfill(6))
        lineas.append(_idescat(sal, m))
    except Exception as e:  # noqa: BLE001
        lineas.append(f"idescat: ERROR {type(e).__name__}: {str(e)[:300]}")
    ids = _busca(sal)
    lineas.append(f"tablas Girona: {ids}")
    for clave, ident in ids.items():
        if (sal / f"{clave}.csv.gz").exists():
            continue
        try:
            df = _llegeix(ident)
            df.to_csv(sal / f"{clave}.csv.gz", index=False)
            lineas.append(f"{clave} ({ident}): {len(df)} filas, años {df['any'].min()}-{df['any'].max()}, {df['ine'].nunique()} municipios; columnas {list(df.columns)}")
        except Exception as e:  # noqa: BLE001
            lineas.append(f"{clave}: ERROR {type(e).__name__}: {str(e)[:300]}")
    return "\n".join(lineas)
