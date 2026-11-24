"""Xifra (Diputació de Girona): mercado de trabajo por municipio, con toda la serie.

El robot general de Xifra (fuentes/xifra.py) solo guarda la foto más reciente de las
tablas que traen los 221 municipios. Aquí se guardan las series trimestrales completas
y las tablas que piden elegir municipio:

  pa.csv        población activa local registrada (Xifra + Observatoris de Desenvolupament
                Econòmic Local), trimestral desde 2008, por sexo y la de 16-24 años.
                Una consulta por municipio y trimestre: se baja de lo más nuevo a lo más
                viejo con un límite de tiempo por ejecución y se completa en las siguientes.
  atur.csv      paro registrado, media del trimestre, desde 2005
  atur_est.csv  paro registrado de extranjeros, media del trimestre
  contr.csv     contratos registrados en el trimestre, desde 2006 (también de
                extranjeros y de ETT)
  llocs.csv     puestos de trabajo (afiliados a la Seguridad Social por centro de trabajo),
                asalariados y autónomos por sector, trimestral desde 2008
  ocup.csv      ocupados (afiliados por residencia) por sexo, edad y nacionalidad,
                trimestral desde 2012
  atur_cat.csv  paro por nivel formativo, grupo de ocupación y actividad de cada municipio:
                media del último año completo y último mes

Formato largo: ine, per (2026T3, 2025 o 2026-10), serie, v. Los valores ocultos por
secreto estadístico («#», «ND») quedan vacíos.
"""
from __future__ import annotations

import datetime as dt
import io
import os
import re
import time

import pandas as pd
import requests
from bs4 import BeautifulSoup

from .comun import _sesion, carpeta
from .xifra import _html

BASE = "https://www.ddgi.cat/xifra/"
PAUSA = float(os.environ.get("XIFRA_PAUSA", "0.6"))
# Minutos como máximo para la población activa en cada ejecución (consulta por municipio)
LIMIT_MIN = float(os.environ.get("XIFRA_TREBALL_MIN", "150"))
# Los últimos periodos se vuelven a bajar siempre: Xifra los revisa
REFRESCA = 2


class Bloqueig(Exception):
    pass


def _peticio(metode: str, url: str, dades: dict | None = None) -> str:
    for intent in range(6):
        try:
            r = _sesion.request(metode, BASE + url, data=dades, timeout=120)
        except requests.RequestException:
            time.sleep(10 * (intent + 1))
            continue
        if r.status_code == 429 or r.status_code >= 500:
            time.sleep(60 * (intent + 1))
            continue
        r.raise_for_status()
        time.sleep(PAUSA)
        return _html(r)
    raise Bloqueig(url)


def _taules(html: str) -> list[list[list[str]]]:
    soup = BeautifulSoup(html, "lxml")
    res = []
    for t in soup.find_all("table"):
        if t.find("table"):
            continue
        files = [[c.get_text(" ", strip=True) for c in tr.find_all(["td", "th"])] for tr in t.find_all("tr")]
        files = [f for f in files if f]
        if len(files) > 2:
            res.append(files)
    return res


def _num(s: str):
    s = (s or "").strip().replace(".", "").replace(",", ".").replace("%", "")
    try:
        return float(s)
    except ValueError:
        return None


def _taula(html: str, primera: str) -> list[list[str]] | None:
    """La tabla de datos cuya cabecera empieza por `primera`."""
    for t in _taules(html):
        if t[0] and t[0][0].startswith(primera):
            return t
    return None


def _opcions(html: str, nom: str) -> tuple[list[str], str | None]:
    soup = BeautifulSoup(html, "lxml")
    s = soup.find("select", attrs={"name": nom})
    if not s:
        return [], None
    ops = [o.get("value") for o in s.find_all("option")]
    sel = s.find("option", selected=True)
    return ops, (sel.get("value") if sel else (ops[0] if ops else None))


def _guarda(nom: str, df: pd.DataFrame, nous_per: set[str]):
    """Sustituye en el CSV los periodos bajados ahora y conserva el resto."""
    f = carpeta("xifra_treball") / f"{nom}.csv"
    if f.exists() and nous_per:
        vell = pd.read_csv(f, dtype={"ine": str, "per": str})
        vell = vell[~vell["per"].isin(nous_per)]
        df = pd.concat([vell, df])
    df = df.sort_values(["serie", "per", "ine"]).drop_duplicates(["ine", "per", "serie"], keep="last")
    df.to_csv(f, index=False)


def _existents(nom: str) -> set[str]:
    f = carpeta("xifra_treball") / f"{nom}.csv"
    if not f.exists():
        return set()
    return set(pd.read_csv(f, dtype={"per": str}, usecols=["per"])["per"])


def _trimestres(desde: tuple[int, int], fins: tuple[int, int]) -> list[tuple[int, int]]:
    return [(a, q) for a in range(desde[0], fins[0] + 1) for q in range(1, 5) if desde <= (a, q) <= fins]


def _pendents(nom: str, tots: list[tuple[int, int]]) -> list[tuple[int, int]]:
    fets = _existents(nom)
    return [p for p in tots if f"{p[0]}T{p[1]}" not in fets] + [p for p in tots[-REFRESCA:] if f"{p[0]}T{p[1]}" in fets]


# --- Tablas con los 221 municipios por periodo (comparación de dos periodos) ---------------

PERIODES = {
    # nom: (página, IdMenu, agrupat de municipios, primer año, serie)
    "atur": ("atur/aturperiodes.asp", "03060602", "7", 2005, "atur"),
    "atur_est": ("atur/aturestperiodes.asp", "03060802", "7", 2006, "atur_est"),
    "contr": ("contractes/kperiodes.asp", "03061001", "1", 2006, "contr"),
    "contr_est": ("contractes/kestperiodes.asp", "03061003", "1", 2006, "contr_est"),
    "contr_ett": ("contractes/kettperiodes.asp", "03061005", "1", 2006, "contr_ett"),
}


def _comparacio(nom: str) -> str:
    pag, idm, agr, desde, serie = PERIODES[nom]
    html = _peticio("GET", f"{pag}?IdMenu={idm}&agrupat={agr}")
    anys, any_def = _opcions(html, "any2")
    _, mes_def = _opcions(html, "MTSA2")
    if not anys or not mes_def:
        return f"{nom}: ERROR sin formulario"
    a, m = int(any_def), int(mes_def)
    # Último trimestre completo
    ultim = (a, m // 3) if m // 3 else (a - 1, 4)
    desde = max(desde, min(int(x) for x in anys))
    tots = _trimestres((desde, 1), ultim)
    pend = _pendents(nom, tots)
    files, fets = [], set()
    for k in range(0, len(pend), 2):
        p1 = pend[k]
        p2 = pend[k + 1] if k + 1 < len(pend) else pend[k]
        dades = {"IdMenu": idm, "any1": p1[0], "MTSA1": 12 + p1[1], "agrupat": agr,
                 "any2": p2[0], "MTSA2": 12 + p2[1], "mun_ambit": "1", "boton": "Actualitza"}
        t = _taula(_peticio("POST", pag.lower(), dades), "Municipis")
        if not t:
            continue
        for f in t[1:]:
            mt = re.match(r"(17\d{3})\s", f[0])
            if not mt or len(f) < 3:
                continue
            for p, v in ((p1, f[1]), (p2, f[2])):
                files.append({"ine": mt.group(1), "per": f"{p[0]}T{p[1]}", "serie": serie, "v": _num(v)})
        fets.update({f"{p1[0]}T{p1[1]}", f"{p2[0]}T{p2[1]}"})
    if files:
        _guarda(nom, pd.DataFrame(files), fets)
    return f"{nom}: {len(fets)} trimestres nuevos o revisados hasta {ultim[0]}T{ultim[1]}"


# --- Tablas trimestrales con los 221 municipios (un periodo por consulta) ---------------

TRIMESTRALS = {
    # nom: [(página, IdMenu, prefijo de serie, columnas)]
    "llocs": [("inss/inssAssal.asp", "03060101", "assal", ["agri", "ind", "cons", "serv", "total"]),
              ("inss/inssAutonom.asp", "03060102", "auton", ["agri", "ind", "cons", "serv", "total"])],
    "ocup": [("atur/osx.asp", "03060401", "ocup", ["h", "d", "total"]),
             ("atur/oed.asp", "03060402", "ocup_edat", ["30", "30_44", "45_54", "55", "total"]),
             ("atur/ona.asp", "03060403", "ocup_nac", ["esp", "est", "total"])],
}


def _trimestral(nom: str) -> str:
    files, fets = [], set()
    ultim = None
    for pag, idm, pre, cols in TRIMESTRALS[nom]:
        html = _peticio("GET", f"{pag}?IdMenu={idm}")
        anys, any_def = _opcions(html, "any1")
        _, q_def = _opcions(html, "MTSA1")
        if not anys:
            continue
        u = (int(any_def), int(q_def))
        ultim = max(ultim or u, u)
        tots = _trimestres((min(int(x) for x in anys), 1), u)
        pend = [p for p in tots if not _te_serie(nom, f"{p[0]}T{p[1]}", pre)] + tots[-REFRESCA:]
        for p in dict.fromkeys(pend):
            per = f"{p[0]}T{p[1]}"
            dades = {"IdMenu": idm, "any1": p[0], "MTSA1": p[1], "dades": "0", "boton": "Actualitza"}
            if p == u:
                t = _taula(html, "Codi INE")
            else:
                t = _taula(_peticio("POST", pag.lower(), dades), "Codi INE")
            if not t:
                continue
            for f in t[1:]:
                if not re.fullmatch(r"17\d{3}", f[0]):
                    continue
                for c, v in zip(cols, f[2:]):
                    files.append({"ine": f[0], "per": per, "serie": f"{pre}_{c}", "v": _num(v)})
            fets.add(per)
    if files:
        df = pd.DataFrame(files)
        f = carpeta("xifra_treball") / f"{nom}.csv"
        if f.exists():
            vell = pd.read_csv(f, dtype={"ine": str, "per": str})
            clau = set(zip(df["per"], df["serie"]))
            vell = vell[[(p, s) not in clau for p, s in zip(vell["per"], vell["serie"])]]
            df = pd.concat([vell, df])
        df.sort_values(["serie", "per", "ine"]).drop_duplicates(["ine", "per", "serie"], keep="last").to_csv(f, index=False)
    return f"{nom}: {len(fets)} trimestres bajados" + (f" hasta {ultim[0]}T{ultim[1]}" if ultim else " (ERROR sin formulario)")


_CACHE_SERIES: dict[str, pd.DataFrame] = {}


def _te_serie(nom: str, per: str, pre: str) -> bool:
    if nom not in _CACHE_SERIES:
        f = carpeta("xifra_treball") / f"{nom}.csv"
        _CACHE_SERIES[nom] = pd.read_csv(f, dtype={"per": str}, usecols=["per", "serie"]).drop_duplicates() if f.exists() else pd.DataFrame(columns=["per", "serie"])
    d = _CACHE_SERIES[nom]
    return bool(((d["per"] == per) & d["serie"].str.startswith(pre + "_")).any())


# --- Población activa: una consulta por municipio y trimestre -----------------------------

def _municipis(html: str) -> list[tuple[str, str]]:
    ops, _ = _opcions(html, "mun_ambit")
    return [(o[:5], o) for o in ops if o and re.match(r"17\d{3}", o)]


def _poblacio_activa(fi: float) -> str:
    html = _peticio("GET", "atur/aturEpe.asp?IdMenu=030600")
    anys, any_def = _opcions(html, "any")
    _, q_def = _opcions(html, "trimestre")
    muns = _municipis(html)
    if not anys or not muns:
        return "pa: ERROR sin formulario"
    ultim = (int(any_def), int(q_def))
    tots = _trimestres((min(int(x) for x in anys), 1), ultim)
    f = carpeta("xifra_treball") / "pa.csv"
    vell = pd.read_csv(f, dtype={"ine": str, "per": str}) if f.exists() else pd.DataFrame(columns=["ine", "per", "serie", "v"])
    fets = vell.groupby("per")["ine"].nunique().to_dict()
    # De lo más nuevo a lo más viejo; los dos últimos se revisan cada vez
    ordre = [p for p in reversed(tots) if fets.get(f"{p[0]}T{p[1]}", 0) < len(muns)]
    ordre = list(dict.fromkeys(list(reversed(tots[-REFRESCA:])) + ordre))
    baixats = 0
    for p in ordre:
        if time.time() > fi:
            break
        per = f"{p[0]}T{p[1]}"
        files = []
        ja = set(vell.loc[vell["per"] == per, "ine"]) if p not in tots[-REFRESCA:] else set()
        for ine, val in muns:
            if ine in ja:
                continue
            if time.time() > fi:
                break
            dades = {"IdMenu": "030600", "mun_ambit": val, "any": p[0], "trimestre": p[1], "dades": "0", "boton": "Actualitzar"}
            t = _taula(_peticio("POST", "atur/aturepe.asp", dades), "Edat")
            if not t:
                continue
            for fila in t[1:]:
                et = fila[0].lower()
                clau = "t" if et.startswith("total") else "16_24" if et.startswith("16") else None
                if not clau or len(fila) < 4:
                    continue
                if clau == "t":
                    files += [{"ine": ine, "per": per, "serie": "pa_h", "v": _num(fila[1])},
                              {"ine": ine, "per": per, "serie": "pa_d", "v": _num(fila[2])},
                              {"ine": ine, "per": per, "serie": "pa", "v": _num(fila[3])}]
                else:
                    files.append({"ine": ine, "per": per, "serie": "pa_16_24", "v": _num(fila[3])})
        if files:
            nou = pd.DataFrame(files)
            vell = pd.concat([vell[~((vell["per"] == per) & vell["ine"].isin(nou["ine"]))], nou])
            vell.sort_values(["serie", "per", "ine"]).to_csv(f, index=False)
            baixats += 1
    complets = sum(1 for p in tots if vell.loc[vell["per"] == f"{p[0]}T{p[1]}", "ine"].nunique() >= len(muns))
    return f"pa: {complets}/{len(tots)} trimestres completos hasta {ultim[0]}T{ultim[1]} ({baixats} tocados en esta ejecución)"


# --- Paro por categorías de cada municipio ----------------------------------------------

CATEGORIES = {"3": "nf", "6": "go", "4": "act"}


def _atur_categories(fi: float) -> str:
    html = _peticio("GET", "atur/aturPeriodes.asp?IdMenu=03060602&agrupat=3")
    _, any_def = _opcions(html, "any2")
    _, mes_def = _opcions(html, "MTSA2")
    muns = _municipis(html)
    if not any_def or not muns:
        return "atur_cat: ERROR sin formulario"
    a, m = int(any_def), int(mes_def)
    any_ple = a - 1 if m < 12 else a
    per_any, per_mes = str(any_ple), f"{a}-{m:02d}"
    f = carpeta("xifra_treball") / "atur_cat.csv"
    vell = pd.read_csv(f, dtype={"ine": str, "per": str}) if f.exists() else pd.DataFrame(columns=["ine", "per", "serie", "cat", "v"])
    # Se vuelve a bajar cuando hay un mes nuevo
    if len(vell) and per_mes in set(vell["per"]):
        return f"atur_cat: al día ({per_mes})"
    files = []
    for ine, val in muns:
        for agr, pre in CATEGORIES.items():
            if time.time() > fi:
                break
            dades = {"IdMenu": "03060602", "any1": any_ple, "MTSA1": "19", "agrupat": agr, "any2": a, "MTSA2": m,
                     "mun_ambit": val, "boton": "Actualitza"}
            html = _peticio("POST", "atur/aturperiodes.asp", dades)
            for t in _taules(html):
                if not t[0] or "Tots" not in t[0][0]:
                    continue
                for fila in t[1:]:
                    if len(fila) < 3 or fila[0].upper().startswith("TOTAL"):
                        continue
                    files += [{"ine": ine, "per": per_any, "serie": pre, "cat": fila[0], "v": _num(fila[1])},
                              {"ine": ine, "per": per_mes, "serie": pre, "cat": fila[0], "v": _num(fila[2])}]
                break
    if not files:
        return "atur_cat: ERROR sin datos"
    nou = pd.DataFrame(files)
    if nou["ine"].nunique() < len(muns) * 0.9:
        return f"atur_cat: ERROR solo {nou['ine'].nunique()} municipios (se conserva lo anterior)"
    nou.to_csv(f, index=False)
    return f"atur_cat: {nou['ine'].nunique()} municipios, {per_any} y {per_mes}"


def ejecutar() -> str:
    res = []
    for nom in PERIODES:
        try:
            res.append(_comparacio(nom))
        except Exception as e:  # noqa: BLE001
            res.append(f"{nom}: ERROR {e}")
    for nom in TRIMESTRALS:
        try:
            res.append(_trimestral(nom))
        except Exception as e:  # noqa: BLE001
            res.append(f"{nom}: ERROR {e}")
    try:
        res.append(_atur_categories(time.time() + 60 * 30))
    except Exception as e:  # noqa: BLE001
        res.append(f"atur_cat: ERROR {e}")
    try:
        res.append(_poblacio_activa(time.time() + 60 * LIMIT_MIN))
    except Exception as e:  # noqa: BLE001
        res.append(f"pa: ERROR {e}")
    return "; ".join(res)
