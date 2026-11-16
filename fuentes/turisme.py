"""Turismo: oferta por municipio (Xifra, histórico), INE (coyuntura turística, rentabilidad,
gasto, puntos turísticos y telefonía móvil) e Idescat.

Escribe en data/processed/turisme/:
  xifra_oferta.csv      any, ine, clau, valor   (hoteles, campings, casas rurales, HUT, apartamentos, oficinas)
  ine_turisme.json      {tabla: {nom, series: [{nom, d: [[año, periodo, valor]]}]}}
  moviles_*.csv         turistas por municipio de destino según la telefonía móvil (INE, experimental)

El Registre de Turisme (establecimientos y plazas actuales) y el impuesto turístico (IEET)
llegan por la fuente «generalitat».
"""
from __future__ import annotations

import json
import re
import time

import pandas as pd

from .comun import carpeta, get, post
from .xifra import _formulario, _html, _tablas

# Xifra (Diputació de Girona): tablas de turismo con selector de año
XIFRA = {
    "hotels": "https://www.ddgi.cat/xifra/activecon/tur_hotels.asp?IdMenu=030401",
    "campings": "https://www.ddgi.cat/xifra/activecon/tur_campings.asp?IdMenu=030402",
    "rural": "https://www.ddgi.cat/xifra/activecon/tur_casespages.asp?IdMenu=030404",
    "oficines": "https://www.ddgi.cat/xifra/activecon/tur_ofturisme.asp?IdMenu=030405",
    "hut": "https://www.ddgi.cat/xifra/activecon/tur_habitatges.asp?IdMenu=030406",
    "apart": "https://www.ddgi.cat/xifra/activecon/tur_apartaments.asp?IdMenu=030407",
}


def _cols(t: pd.DataFrame) -> list[str]:
    if isinstance(t.columns, pd.MultiIndex):
        return [" ".join(dict.fromkeys(str(x) for x in c)).strip() for c in t.columns]
    return [str(c) for c in t.columns]


def _llarg(t: pd.DataFrame, taula: str, any_: str) -> pd.DataFrame:
    t = t.copy()
    t.columns = _cols(t)
    ci = next(c for c in t.columns if c.startswith("Codi INE"))
    t = t[t[ci].astype(str).str.match(r"^17\d{3}")]
    files = []
    for c in t.columns:
        if c == ci or c.startswith("Municipi"):
            continue
        v = pd.to_numeric(t[c].astype(str).str.replace(".", "", regex=False).str.replace(",", ".", regex=False), errors="coerce")
        files.append(pd.DataFrame({"any": any_, "ine": t[ci].astype(str).str[:5], "taula": taula, "col": c, "valor": v}))
    return pd.concat(files) if files else pd.DataFrame()


def xifra() -> tuple[pd.DataFrame, list[str]]:
    parts, lin = [], []
    for taula, url in XIFRA.items():
        try:
            html = _html(get(url, pausa=0.5))
            form = _formulario(html, url)
            anys = [v for v, _ in (form or {}).get("opciones", {}).get("any", [])] if form else []
            def_any = (form or {}).get("por_defecto", {}).get("any")
            n = 0
            for a in anys or [def_any]:
                if a == def_any or not form:
                    ts = _tablas(html)
                else:
                    dades = dict(form["ocultos"])
                    dades.update({k: v for k, v in form["por_defecto"].items() if v is not None})
                    dades["any"] = a
                    dades["boton"] = "Actualitza"
                    try:
                        ts = _tablas(_html(post(form["accion"], dades)))
                        time.sleep(0.5)
                    except Exception:  # noqa: BLE001
                        continue
                if ts:
                    parts.append(_llarg(ts[0], taula, str(a)))
                    n += 1
            lin.append(f"Xifra {taula}: {n} anys ({min(anys) if anys else def_any}–{max(anys) if anys else def_any})")
        except Exception as e:  # noqa: BLE001
            lin.append(f"Xifra {taula}: ERROR {type(e).__name__}: {str(e)[:120]}")
    return (pd.concat(parts) if parts else pd.DataFrame()), lin


# ---------------------------------------------------------------------------
# INE: tablas de turismo. Se guardan solo las series de Girona, Cataluña, España, las zonas
# turísticas de la provincia (Costa Brava, Pirineus) y sus puntos turísticos.
INE = "https://servicios.ine.es/wstempus/js/ES"
TAULES_INE = {
    # Hoteles (EOH)
    "2074": "Hoteles: viajeros y pernoctaciones por CCAA y provincias",
    "2066": "Hoteles: establecimientos, plazas, ocupación y personal por CCAA y provincias",
    "2065": "Hoteles: estancia media por CCAA y provincias",
    "2069": "Hoteles: procedencia de los viajeros por provincia",
    "2039": "Hoteles: viajeros y pernoctaciones por zonas turísticas",
    "2013": "Hoteles: plazas y ocupación por zonas turísticas",
    "2040": "Hoteles: estancia media por zonas turísticas",
    "2078": "Hoteles: viajeros y pernoctaciones por puntos turísticos",
    "75197": "Hoteles: viajeros y pernoctaciones por puntos turísticos (base nueva)",
    "2076": "Hoteles: plazas y ocupación por puntos turísticos",
    "75198": "Hoteles: plazas y ocupación por puntos turísticos (base nueva)",
    "2077": "Hoteles: estancia media por puntos turísticos",
    # Rentabilidad hotelera (IRSH)
    "2059": "ADR por CCAA y provincias", "2057": "RevPAR por CCAA y provincias",
    "46297": "ADR por zonas turísticas", "46300": "RevPAR por zonas turísticas",
    "46298": "ADR por puntos turísticos", "46301": "RevPAR por puntos turísticos",
    # Campings (EOAC)
    "2062": "Campings: viajeros y pernoctaciones por provincias",
    "2064": "Campings: parcelas, ocupación y personal por provincias",
    "2068": "Campings: estancia media por provincias",
    "2047": "Campings: viajeros y pernoctaciones por zonas turísticas",
    "2084": "Campings: viajeros y pernoctaciones por puntos turísticos",
    "75194": "Campings: viajeros y pernoctaciones por puntos turísticos (base nueva)",
    "2085": "Campings: plazas y ocupación por puntos turísticos",
    "75196": "Campings: plazas y ocupación por puntos turísticos (base nueva)",
    # Apartamentos (EOAP) y turismo rural (EOTR)
    "2063": "Apartamentos: viajeros y pernoctaciones por provincias",
    "2072": "Apartamentos: plazas, ocupación y personal por provincias",
    "2061": "Apartamentos: estancia media por provincias",
    "2073": "Turismo rural: viajeros y pernoctaciones por provincias",
    "2070": "Turismo rural: plazas, ocupación y personal por provincias",
    "2067": "Turismo rural: estancia media por provincias",
    # Alojamientos de corta estancia de plataformas (OAT)
    "48427": "Pernoctaciones en alojamientos turísticos y de corta estancia por provincias (mensual)",
    "48440": "Ocupación en alojamientos turísticos y de corta estancia (anual)",
    # Gasto de los turistas internacionales (EGATUR) por CCAA
    "23998": "EGATUR: gasto de los turistas internacionales por CCAA de destino",
    "24745": "EGATUR: partidas de gasto por CCAA",
    # Turistas internacionales (Frontur) por CCAA de destino
    "23988": "FRONTUR: turistas internacionales por CCAA de destino",
    # Telefonía móvil (experimental): turistas por provincia de destino
    "52047": "Turistas extranjeros por provincia de destino y país (telefonía móvil)",
    "52997": "Turistas residentes por provincia de destino y provincia de origen (telefonía móvil)",
}
# Tablas por zonas y puntos turísticos: solo las zonas y los municipios de Girona
PUNTS_INE = {"2039", "2013", "2040", "2078", "75197", "2076", "75198", "2077", "46297", "46300", "46298", "46301", "2047", "2084", "75194", "2085", "75196"}
ZONES_INE = ("Girona", "Gerona", "Cataluña", "Catalunya", "Total Nacional", "Nacional", "Total nacional", "Costa Brava", "Pirineus")


def _puntos_girona() -> re.Pattern:
    from .territorio import municipios
    noms = [re.escape(n) for n in municipios()["nom"].tolist() if len(n) > 3]
    return re.compile(r"\b17\d{3}-|Costa Brava|Pirineus|Platja d'Aro|Castell-Platja|^(?:" + "|".join(noms) + r")\.", re.I)


def _taula_ine(ident: str, pat: re.Pattern, nult: int = 400) -> list[dict]:
    d = get(f"{INE}/DATOS_TABLA/{ident}?nult={nult}", timeout=900).json()
    res = []
    for s in d:
        nom = s.get("Nombre", "")
        if not pat.search(nom):
            continue
        # Los puntos turísticos de otras provincias con nombre parecido (Castellón, Castelldefels…)
        if re.search(r"Castell[oó]n|Castelldefels|Girona\b.*Castell[oó]n", nom):
            continue
        res.append({"nom": nom, "d": [[p.get("Anyo"), p.get("FK_Periodo"), p.get("Valor")] for p in s.get("Data", [])]})
    return res


def ine() -> tuple[dict, list[str]]:
    pat_p = _puntos_girona()
    zones = re.compile("|".join(re.escape(z) for z in ZONES_INE))
    tot, lin = {}, []
    for ident, nom in TAULES_INE.items():
        try:
            s = _taula_ine(ident, pat_p if ident in PUNTS_INE else zones)
            tot[ident] = {"nom": nom, "series": s}
            lin.append(f"INE {ident} {nom}: {len(s)} series")
        except Exception as e:  # noqa: BLE001
            lin.append(f"INE {ident} {nom}: ERROR {type(e).__name__}: {str(e)[:120]}")
        time.sleep(0.3)
    return tot, lin


# ---------------------------------------------------------------------------
# INE experimental: turistas por municipio de destino según la posición de los teléfonos móviles.
# La tabla nacional es enorme: se pide municipio a municipio con el filtro tv=variable:valor.
MOVILS = {"rec": ("52048", "País de residencia"), "int": ("53464", "CCAA y provincia de origen")}
ORIGENS = {"Total", "Total Nacional", "Francia", "Alemania", "Reino Unido", "Países Bajos", "Bélgica", "Suiza", "Italia",
           "Estados Unidos de América", "Irlanda", "Cataluña", "Madrid, Comunidad de", "Comunitat Valenciana", "Aragón", "Andalucía"}


def _valors_municipis(taula: str) -> list[dict]:
    """Valores de la variable «municipio» de la tabla para los municipios de Girona (con reintentos)."""
    for intent in range(4):
        try:
            grups = get(f"{INE}/GRUPOS_TABLA/{taula}").json()
            if not isinstance(grups, list):
                _ERR_INE[taula] = "GRUPOS_TABLA " + str(grups)[:150]
            gm = next(g for g in grups if "unicipio" in g["Nombre"])
            vals = get(f"{INE}/VALORES_GRUPOSTABLA/{taula}/{gm['Id']}").json()
            if not isinstance(vals, list):
                _ERR_INE[taula] = "VALORES_GRUPOSTABLA " + str(vals)[:150]
            res = [v for v in vals if re.match(r"^17\d{3}$", str(v.get("Codigo", "")))]
            _VALS[taula] = res
            return res
        except Exception:  # noqa: BLE001
            if intent == 3:
                # Las dos tablas de móviles comparten la variable «municipios»: se reutilizan sus valores
                germana = {"52048": "53464", "53464": "52048"}.get(taula)
                if germana in _VALS:
                    return _VALS[germana]
                raise
            time.sleep(10 * (intent + 1))
    return []


_ERR_INE: dict = {}
_VALS: dict = {}


def _per_municipi(taula: str, nult: int):
    """Descarga la tabla municipio a municipio (filtro tv=variable:valor). Devuelve (municipio, series), errores."""
    vals = _valors_municipis(taula)
    res, errors = [], 0
    for v in vals:
        try:
            # Si la respuesta no es una lista (el INE devuelve un objeto de error cuando la consulta es grande), menos periodos
            for n_ in (nult, nult // 2, 24):
                d = get(f"{INE}/DATOS_TABLA/{taula}?tv={v['FK_Variable']}:{v['Id']}&nult={n_}", timeout=300, pausa=0.2).json()
                if isinstance(d, list):
                    res.append((v, d))
                    break
                _ERR_INE.setdefault(taula, str(d)[:150])
            else:
                errors += 1
        except Exception:  # noqa: BLE001
            errors += 1
    return res, errors, len(vals)


def movils() -> tuple[pd.DataFrame, list[str]]:
    files, lin = [], []
    for clau, (taula, _) in sorted(MOVILS.items(), key=lambda kv: kv[0] != "int"):
        try:
            dades, errors, n = _per_municipi(taula, 120)
            for v, d in dades:
                for s in d:
                    parts = [x.strip() for x in s["Nombre"].split(".") if x.strip()]
                    orig = next((x for x in parts if x not in ("Turistas", "Dato base", v["Nombre"])), None)
                    if orig not in ORIGENS:
                        continue
                    for p in s.get("Data", []):
                        if p.get("Valor") is not None and 1 <= p.get("FK_Periodo", 0) <= 12:
                            files.append({"t": clau, "ine": v["Codigo"], "orig": orig, "mes": f"{p['Anyo']}-{p['FK_Periodo']:02d}", "turistes": p["Valor"]})
            lin.append(f"Telefonía móvil {clau} ({taula}): {n} municipios" + (f", ERROR en {errors}" if errors else "") + (f" (INE: {_ERR_INE[taula]})" if taula in _ERR_INE else ""))
        except Exception as e:  # noqa: BLE001
            lin.append(f"Telefonía móvil {clau} ({taula}): ERROR {type(e).__name__}: {str(e)[:120]}" + (f" (INE: {_ERR_INE[taula]})" if taula in _ERR_INE else ""))
    return pd.DataFrame(files), lin


# INE experimental: viviendas turísticas (anuncios en plataformas) por municipio, semestral
VTE = {"39363": "viviendas y plazas", "39366": "porcentaje sobre las viviendas"}


def vte() -> tuple[pd.DataFrame, list[str]]:
    files, lin = [], []
    for taula, nom in VTE.items():
        try:
            dades, errors, n = _per_municipi(taula, 30)
            for v, d in dades:
                for s in d:
                    n_ = s["Nombre"]
                    k = "pct" if "Porcentaje" in n_ else "places_viv" if "por vivienda" in n_ else "places" if "Plazas" in n_ else "viv" if "Viviendas turísticas" in n_ else None
                    if not k:
                        continue
                    for p in s.get("Data", []):
                        if p.get("Valor") is not None:
                            files.append({"ine": v["Codigo"], "clau": k, "any": p["Anyo"], "mes": p["FK_Periodo"], "valor": p["Valor"]})
            lin.append(f"Viviendas turísticas INE {taula} ({nom}): {n} municipios" + (f", ERROR en {errors}" if errors else ""))
        except Exception as e:  # noqa: BLE001
            lin.append(f"Viviendas turísticas INE {taula}: ERROR {type(e).__name__}: {str(e)[:120]}")
    return pd.DataFrame(files), lin


# ---------------------------------------------------------------------------
# Generalitat (Socrata): impuesto turístico por comarca y catálogo de playas
SOC = "https://analisi.transparenciacatalunya.cat/resource"
COMARQUES_GI = {"Alt Empordà", "Baix Empordà", "Cerdanya", "Garrotxa", "Gironès", "Pla de l'Estany", "Ripollès", "Selva"}


def socrata() -> list[str]:
    import io
    sal, lin = carpeta("turisme"), []
    for ident, fitxer in (("2nmt-74sj", "ieet_comarques.csv"), ("83qv-sib8", "platges.csv")):
        try:
            d = pd.read_csv(io.BytesIO(get(f"{SOC}/{ident}.csv?$limit=50000").content), dtype=str)
            if "ide_municipi" in d.columns:
                d = d[d["ide_municipi"].str.startswith("17")]
            d.to_csv(sal / fitxer, index=False)
            lin.append(f"{ident} → {fitxer}: {len(d)} files")
        except Exception as e:  # noqa: BLE001
            lin.append(f"{ident}: ERROR {type(e).__name__}: {str(e)[:120]}")
    return lin


def ejecutar() -> str:
    sal = carpeta("turisme")
    lineas = []
    t, l = ine()
    lineas += l
    if t:
        (sal / "ine_turisme.json").write_text(json.dumps(t, ensure_ascii=False), encoding="utf-8")
    x, l = xifra()
    lineas += l
    if len(x):
        x.to_csv(sal / "xifra_oferta.csv", index=False)
    m, l = movils()
    lineas += l
    if len(m):
        # Si una de las dos tablas falla, se conserva la que había
        f = sal / "moviles.csv.gz"
        if f.exists() and set(m["t"]) != set(MOVILS):
            ant = pd.read_csv(f, dtype={"ine": str})
            m = pd.concat([ant[~ant["t"].isin(set(m["t"]))], m])
        m.to_csv(f, index=False)
    v, l = vte()
    lineas += l
    if len(v):
        v.to_csv(sal / "viviendas_turisticas.csv", index=False)
    lineas += socrata()
    return "\n".join(lineas)
