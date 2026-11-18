"""Nacimientos, defunciones, causas de muerte y nombres de los recién nacidos.

- INE (API Tempus): series por provincia, para el mapa de España y la comparación
    MNP nacimientos y defunciones mensuales desde 1975 (6524, 6561) e históricas 1941-1974 (6526, 6563)
    Estimación mensual de nacimientos (EMN, 46682) y de defunciones semanales/mensuales (EDeS, 35168, 62278):
      datos provisionales, se actualizan cada semana o cada mes
    Indicadores demográficos básicos por provincia (natalidad, fecundidad, edad a la maternidad, mortalidad,
      mortalidad infantil, saldo vegetativo, esperanza de vida)
    Defunciones por causa (capítulos CIE-10) y sexo por provincia (ECM, 73035)
    Girona: nacimientos por edad de la madre (6510) y defunciones por edad (6549)
- CatSalut (Socrata 3cre-fa8v, Registre central d'assegurats): defunciones diarias por ABS, sexo y edad.
  Se guarda el total diario de la región sanitaria de Girona y de Cataluña, y el mensual por ABS.
- Idescat, API de onomástica: nombres de los nadons por año (provincia de Girona, Cataluña y comarcas).

Escribe data/processed/demografia/:
  ine.json            {tabla: {nom, series: [{nom, d: [[año, periodo, valor, fecha]]}]}}
  defuncions_dia.csv  data, zona (gi = región sanitaria de Girona, cat), casos
  defuncions_abs.csv  mes, codi_abs, casos
  defuncions_edat.csv mes, sexe, grup_edat, casos (región sanitaria de Girona)
  noms.json           {anys, prov: {any: [[nom, sexe, n, per_mil]]}, cat: {...}, com: {nom_comarca: {any: [...]}}}
"""
from __future__ import annotations

import datetime as dt
import io
import json
import re

import pandas as pd

from .comun import carpeta, get

INE = "https://servicios.ine.es/wstempus/js/ES"
CSV = "https://www.ine.es/jaxiT3/files/t/es/csv_bdsc/{}.csv"

# tabla: (descripción, nult, ¿todas las provincias?)
TABLAS = {
    "6524": ("Nacimientos mensuales por provincia de residencia de la madre (desde 1975)", 720, True),
    "6561": ("Defunciones mensuales por provincia de residencia (desde 1975)", 720, True),
    "6526": ("Nacimientos por provincia de inscripción (1941-1974)", 420, True),
    "6563": ("Defunciones por provincia de inscripción (1941-1974)", 420, True),
    "46682": ("EMN: nacimientos mensuales y acumulados por provincia (provisional)", 150, True),
    "62278": ("EDeS: defunciones mensuales y acumuladas por provincia (provisional)", 250, True),
    "35168": ("EDeS: defunciones semanales y acumuladas por provincia (provisional)", 600, True),
    "1470": ("IDB: tasa bruta de natalidad por provincia", 50, True),
    "1478": ("IDB: indicador coyuntural de fecundidad por provincia", 50, True),
    "1581": ("IDB: edad media a la maternidad por provincia", 50, True),
    "1482": ("IDB: tasa bruta de mortalidad por provincia", 50, True),
    "1484": ("IDB: tasa de mortalidad infantil por provincia", 50, True),
    "1487": ("IDB: saldo vegetativo por mil habitantes por provincia", 50, True),
    "1485": ("IDB: esperanza de vida al nacimiento por provincia", 50, True),
    "73035": ("ECM: defunciones por causas (capítulos) por sexo y provincia", 40, True),
    "6510": ("Nacimientos por grupo de edad de la madre (Girona)", 30, False),
    "6549": ("Defunciones por sexo y grupo de edad (Girona)", 30, False),
}
PROVINCIAS = ("Araba", "Álava", "Albacete", "Alicante", "Alacant", "Almería", "Ávila", "Badajoz", "Balears", "Barcelona", "Burgos",
              "Cáceres", "Cádiz", "Castellón", "Castelló", "Ciudad Real", "Córdoba", "Coruña", "Cuenca", "Girona", "Gerona", "Granada",
              "Guadalajara", "Gipuzkoa", "Guipúzcoa", "Huelva", "Huesca", "Jaén", "León", "Lleida", "Lérida", "Rioja", "Lugo", "Madrid",
              "Málaga", "Murcia", "Navarra", "Ourense", "Orense", "Asturias", "Palencia", "Palmas", "Pontevedra", "Salamanca",
              "Santa Cruz de Tenerife", "Cantabria", "Segovia", "Sevilla", "Soria", "Tarragona", "Teruel", "Toledo", "Valencia",
              "València", "Valladolid", "Bizkaia", "Vizcaya", "Zamora", "Zaragoza", "Ceuta", "Melilla", "Total Nacional", "Total nacional",
              "Cataluña")
GIRONA = ("Girona", "Gerona", "Total Nacional", "Total nacional", "Cataluña")


def _toca(nom: str, zonas) -> bool:
    toks = [t.strip() for t in re.split(r"[.,]", nom)]
    return any(any(t == z or t.startswith(z + " ") or t.startswith(z + "/") or t.endswith("/" + z) or t.endswith(" " + z) for z in zonas) for t in toks)


def _fecha(ms):
    try:
        return dt.datetime.utcfromtimestamp(ms / 1000 + 43200).date().isoformat() if ms else None
    except Exception:  # noqa: BLE001
        return None


# Series derivadas que no hacen falta (se calculan en la web) y ocupan mucho
FUERA = re.compile(r"Acumulado|Variación|Diferencia")
SEMANAL = {"35168"}


def _tabla_api(ident, nult, zonas):
    d = get(f"{INE}/DATOS_TABLA/{ident}?nult={nult}", timeout=900).json()
    if not isinstance(d, list):
        raise ValueError(str(d)[:150])
    pt = (lambda p: [p.get("Anyo"), p.get("FK_Periodo"), p.get("Valor"), _fecha(p.get("Fecha"))]) if ident in SEMANAL else (lambda p: [p.get("Anyo"), p.get("FK_Periodo"), p.get("Valor")])
    return [{"nom": s.get("Nombre", ""), "d": [pt(p) for p in s.get("Data", [])]}
            for s in d if _toca(s.get("Nombre", ""), zonas) and not FUERA.search(s.get("Nombre", ""))]


def _tabla_csv(ident, zonas):
    """Alternativa: CSV completo de la tabla. El nombre de la serie se arma con las columnas de dimensión."""
    r = get(CSV.format(ident), timeout=900)
    df = pd.read_csv(io.BytesIO(r.content), sep=";", dtype=str, encoding="utf-8-sig")
    df.columns = [c.strip() for c in df.columns]
    dims = [c for c in df.columns if c not in ("Periodo", "Total")]
    df["nom"] = df[dims].fillna("").agg(". ".join, axis=1)
    df = df[df["nom"].map(lambda n: _toca(n, zonas) and not FUERA.search(n))]
    df["v"] = pd.to_numeric(df["Total"].str.replace(".", "", regex=False).str.replace(",", ".", regex=False), errors="coerce")
    res = []
    for nom, g in df.groupby("nom", sort=False):
        pts = []
        for per, v in zip(g["Periodo"], g["v"]):
            m = re.match(r"(\d{4})(?:M(\d{2})|SM(\d{2}))?", str(per))
            if not m:
                continue
            pts.append([int(m.group(1)), int(m.group(2) or m.group(3) or 28), None if pd.isna(v) else float(v)])
        res.append({"nom": nom, "d": pts})
    return res


def _ine(sal) -> list[str]:
    f = sal / "ine.json"
    out = json.loads(f.read_text(encoding="utf-8")) if f.exists() else {}
    lineas = []
    for ident, (nom, nult, totes) in TABLAS.items():
        zonas = PROVINCIAS if totes else GIRONA
        try:
            try:
                s = _tabla_api(ident, nult, zonas)
            except Exception as e:  # noqa: BLE001
                lineas.append(f"INE {ident}: API falla ({str(e)[:80]}), se prueba el CSV")
                s = _tabla_csv(ident, zonas)
            if not s:
                raise ValueError("sin series")
            out[ident] = {"nom": nom, "series": s}
            ult = max((p[0] for x in s for p in x["d"] if p[2] is not None), default=None)
            lineas.append(f"INE {ident} {nom}: {len(s)} series, último año {ult}")
        except Exception as e:  # noqa: BLE001
            lineas.append(f"INE {ident} {nom}: ERROR {type(e).__name__}: {str(e)[:200]}" + (" (se conserva la anterior)" if ident in out else ""))
    f.write_text(json.dumps(out, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    return lineas


def _salut(sal) -> list[str]:
    from .salut import soql
    lineas = []
    try:
        d = soql("3cre-fa8v", **{"$select": "data, codi_regio, sum(casos) as casos", "$group": "data, codi_regio"})
        d["casos"] = pd.to_numeric(d["casos"], errors="coerce").fillna(0)
        d["data"] = d["data"].str[:10]
        gi = d[d["codi_regio"].astype(str).str.lstrip("0") == "64"].groupby("data")["casos"].sum()
        ca = d.groupby("data")["casos"].sum()
        dia = pd.concat([gi.rename("gi"), ca.rename("cat")], axis=1).fillna(0).reset_index().melt(id_vars="data", var_name="zona", value_name="casos")
        dia["casos"] = dia["casos"].astype(int)
        dia.sort_values(["zona", "data"]).to_csv(sal / "defuncions_dia.csv", index=False)
        lineas.append(f"CatSalut diario: {dia['data'].min()} a {dia['data'].max()}, Girona {int(gi.sum())} defunciones")
    except Exception as e:  # noqa: BLE001
        lineas.append(f"CatSalut diario: ERROR {type(e).__name__}: {str(e)[:200]}")
    try:
        d = soql("3cre-fa8v", **{"$select": "date_trunc_ym(data) as mes, codi_abs, sum(casos) as casos", "$group": "mes, codi_abs"})
        d["mes"] = d["mes"].str[:7]
        d["codi_abs"] = d["codi_abs"].astype(str).str.lstrip("0")
        d["casos"] = pd.to_numeric(d["casos"], errors="coerce").fillna(0).astype(int)
        d.sort_values(["codi_abs", "mes"]).to_csv(sal / "defuncions_abs.csv", index=False)
        lineas.append(f"CatSalut por ABS y mes: {d['codi_abs'].nunique()} ABS, {d['mes'].min()} a {d['mes'].max()}")
    except Exception as e:  # noqa: BLE001
        lineas.append(f"CatSalut por ABS: ERROR {type(e).__name__}: {str(e)[:200]}")
    try:
        d = soql("3cre-fa8v", **{"$select": "date_trunc_ym(data) as mes, sexe, grup_edat, sum(casos) as casos",
                                 "$where": "codi_regio='64'", "$group": "mes, sexe, grup_edat"})
        d["mes"] = d["mes"].str[:7]
        d["casos"] = pd.to_numeric(d["casos"], errors="coerce").fillna(0).astype(int)
        d.sort_values(["mes", "sexe", "grup_edat"]).to_csv(sal / "defuncions_edat.csv", index=False)
        lineas.append(f"CatSalut por edad (RS Girona): {len(d)} filas")
    except Exception as e:  # noqa: BLE001
        lineas.append(f"CatSalut por edad: ERROR {type(e).__name__}: {str(e)[:200]}")
    return lineas


ONO = "https://api.idescat.cat/onomastica/v1/nadons"


def _llista(e):
    return e if isinstance(e, list) else [e] if e else []


def _cerca(geo: str | None, any_: int, max_pag: int = 80):
    """Todos los nombres de los nadons de un año y territorio: [[nom, sexe, n, per_mil]] y nombre del territorio."""
    res, nom_geo, pos = [], None, 0
    for _ in range(max_pag):
        url = f"{ONO}/cerca.json?orderby=v&desc=1&t={any_}&posicio={pos}&lang=ca" + (f"&geo={geo}" if geo else "")
        f = get(url, pausa=0.15).json().get("feed", {})
        nom_geo = nom_geo or (f.get("ono:geo") or {}).get("content")
        es = _llista(f.get("entry"))
        if not es:
            break
        for e in es:
            o = e.get("ono:f", {})
            c, p = o.get("ono:c", {}), o.get("ono:pos1", {})
            try:
                res.append([c.get("content"), c.get("sex"), int(p.get("ono:v")), float((p.get("ono:w") or {}).get("ono:sex") or 0)])
            except (TypeError, ValueError):
                continue
        pos += len(es)
        if pos >= int(f.get("opensearch:totalResults") or 0):
            break
    return res, nom_geo


COMARQUES_GI = {"Alt Empordà", "Baix Empordà", "Cerdanya", "Garrotxa", "Gironès", "Pla de l'Estany", "Ripollès", "Selva", "Osona"}


def _noms(sal) -> list[str]:
    f = sal / "noms.json"
    out = json.loads(f.read_text(encoding="utf-8")) if f.exists() else {"prov": {}, "cat": {}, "com": {}}
    d = get(f"{ONO}/dades.json?id=40683&class=t&lang=ca").json()
    anys = sorted(int(x["c"]) for x in _llista(d.get("onomastica_nadons", {}).get("ff", {}).get("f")))
    if not anys:
        return ["noms: ERROR sin años"]
    out["anys"] = anys
    lineas = []
    # Provincia: todos los años (los ya bajados no se repiten, salvo los dos últimos, que se revisan)
    nous = 0
    for a in anys:
        if str(a) in out["prov"] and a < anys[-1] - 1:
            continue
        try:
            out["prov"][str(a)], _ = _cerca("prov:17", a)
            nous += 1
        except Exception as e:  # noqa: BLE001
            lineas.append(f"noms Girona {a}: ERROR {str(e)[:120]}")
    for a in anys[-3:]:
        try:
            out["cat"][str(a)], _ = _cerca(None, a, 200)
        except Exception as e:  # noqa: BLE001
            lineas.append(f"noms Catalunya {a}: ERROR {str(e)[:120]}")
    for c in range(1, 44):
        geo = f"com:{c:02d}"
        try:
            f0 = get(f"{ONO}/cerca.json?orderby=v&desc=1&t={anys[-1]}&geo={geo}&lang=ca", pausa=0.1).json().get("feed", {})
        except Exception:  # noqa: BLE001
            continue
        nom = (f0.get("ono:geo") or {}).get("content")
        if nom not in COMARQUES_GI:
            continue
        out["com"].setdefault(nom, {})
        for a in anys[-3:]:
            try:
                out["com"][nom][str(a)], _ = _cerca(geo, a)
            except Exception as e:  # noqa: BLE001
                lineas.append(f"noms {nom} {a}: ERROR {str(e)[:120]}")
    f.write_text(json.dumps(out, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    u = out["prov"].get(str(anys[-1])) or []
    top = lambda s: next((x[0] for x in u if x[1] == s), "–")
    lineas.insert(0, f"noms: años {anys[0]}-{anys[-1]} ({nous} bajados), {len(u)} nombres en {anys[-1]}; primeros {top('m')} y {top('f')}; comarcas {sorted(out['com'])}")
    return lineas


def ejecutar() -> str:
    sal = carpeta("demografia")
    lineas = []
    for nom, fn in (("ine", _ine), ("salut", _salut), ("noms", _noms)):
        try:
            lineas += fn(sal)
        except Exception as e:  # noqa: BLE001
            lineas.append(f"{nom}: ERROR {type(e).__name__}: {str(e)[:300]}")
    return "\n".join(lineas)
