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


def ejecutar() -> str:
    sal = carpeta("turisme")
    lineas = []
    x, l = xifra()
    lineas += l
    if len(x):
        x.to_csv(sal / "xifra_oferta.csv", index=False)
    return "\n".join(lineas)
