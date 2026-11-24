"""Xifra (Diputació de Girona): tablas que piden elegir municipio, una consulta por municipio.

  policia.csv    efectivos de la policía local por graduación (últimos 3 años)
  naixement.csv  población por lugar de nacimiento (último año)
  cens.csv       censo de viviendas 2021: tipo de vivienda y edificios por número de plantas
  romanent.csv   remanente de tesorería (cuatro últimos años)
  resultat.csv   resultado presupuestario (cuatro últimos años)
  cesel.csv      coste efectivo de los servicios (tres últimos años)
  prestacions.csv beneficiarios de prestaciones por desempleo por municipio y mes desde 2010
                 (contributiva, subsidio, renta activa de inserción, total)
  tur_comarca.csv viajeros, pernoctaciones y ocupación de hoteles, campings y turismo rural
                 por comarca, anual y trimestral desde 2006

Cada tabla se vuelve a bajar solo cuando Xifra ofrece un año que aún no está guardado.
"""
from __future__ import annotations

import os
import re
import time

import pandas as pd

from .comun import carpeta
from .xifra_treball import _municipis, _num, _opcions, _peticio, _taules, Bloqueig

LIMIT_S = 60 * int(os.environ.get("XIFRA_MUNICIPAL_MIN", "90"))


def _sal(nom):
    return carpeta("xifra_municipal") / f"{nom}.csv"


def _anys_guardats(nom: str, col: str = "any") -> set[str]:
    f = _sal(nom)
    if not f.exists():
        return set()
    return set(pd.read_csv(f, dtype=str, usecols=[col])[col])


def _taula_amb(html: str, prova) -> list[list[str]] | None:
    for t in _taules(html):
        if t and prova(t[0]):
            return t
    return None


def _per_municipi(nom, pag, idm, camp_mun, camp_any, anys, extra, llegeix, fi):
    """Recorre los municipios (y años) de una página y guarda lo que devuelve `llegeix`."""
    html = _peticio("GET", f"{pag}?IdMenu={idm}")
    ops, _ = _opcions(html, camp_mun)
    muns = [(o[:5], o) for o in ops if o and re.match(r"17\d{3}", o)]
    if not muns:
        return f"{nom}: ERROR sin formulario"
    files = []
    for any_ in anys:
        for ine, val in muns:
            if time.time() > fi:
                return f"{nom}: ERROR sin tiempo ({len(files)} filas, no se guarda)"
            dades = {"IdMenu": idm, camp_mun: val, "boton": "Actualitzar", **extra}
            if camp_any:
                dades[camp_any] = any_
            for f in llegeix(_peticio("POST", pag.lower(), dades), ine, any_):
                files.append(f)
    if not files:
        return f"{nom}: ERROR sin datos"
    d = pd.DataFrame(files)
    f = _sal(nom)
    if f.exists() and "any" in d:
        vell = pd.read_csv(f, dtype=str)
        vell = vell[~vell["any"].isin(set(d["any"].astype(str)))]
        d = pd.concat([vell, d.fillna("").astype(str)])
    d.to_csv(f, index=False)
    return f"{nom}: {d['ine'].nunique()} municipios"


def _policia(fi):
    html = _peticio("GET", "qualitat/qpl.asp?IdMenu=03031001")
    anys, _ = _opcions(html, "any")
    nous = [a for a in anys[:3] if a not in _anys_guardats("policia")]
    if not nous:
        return "policia: al día"

    def ll(h, ine, any_):
        t = _taula_amb(h, lambda c: "Graduació" in c)
        return [{"ine": ine, "any": any_, "grau": f[1], "n": _num(f[2])} for f in (t or [])[1:]
                if len(f) >= 3 and f[1] and f[1].upper() != "TOTAL"]
    return _per_municipi("policia", "qualitat/qpl.asp", "03031001", "mun_ambit", "any", nous, {"dades": "0"}, ll, fi)


def _naixement(fi):
    html = _peticio("GET", "demografia/dpn1.asp?IdMenu=03020301")
    anys, _ = _opcions(html, "any")
    if not anys or anys[0] in _anys_guardats("naixement"):
        return "naixement: al día"

    def ll(h, ine, any_):
        t = _taula_amb(h, lambda c: "Àmbit geogràfic" in c)
        return [{"ine": ine, "any": any_, "ambit": f[1], "h": _num(f[2]), "d": _num(f[3]), "t": _num(f[4])} for f in (t or [])[1:] if len(f) >= 5]
    return _per_municipi("naixement", "demografia/dpn1.asp", "03020301", "mun_ambit", "any", anys[:1], {"dades": "0"}, ll, fi)


# Instalaciones (hab_hin) y problemas del edificio (hab_hpp) solo llegan a 2011 y 2001: no se bajan
CENS = {"hpt": ("qualitat/hab_hpt.asp", "03031105"), "enp": ("qualitat/hab_enp.asp", "03031108")}


def _cens(fi):
    if _sal("cens").exists() and set(pd.read_csv(_sal("cens"), dtype=str)["taula"]) >= set(CENS):
        return "cens: al día (censo 2021)"
    res, files = [], []
    for k, (pag, idm) in CENS.items():
        def ll(h, ine, any_, k=k):
            t = _taules(h)
            t = t[-1] if t else []
            return [{"ine": ine, "any": any_, "taula": k, "cat": f[1], "n": _num(f[2])} for f in t[1:]
                    if len(f) >= 3 and f[1] and not f[1].upper().startswith("TOTAL")]
        r = _per_municipi(f"cens_{k}", pag, idm, "mun_ambit", "any", ["2021"], {"dades": "0"}, ll, fi)
        res.append(r)
        f = _sal(f"cens_{k}")
        if f.exists():
            files.append(pd.read_csv(f, dtype=str))
            f.unlink()
    if files:
        pd.concat(files).to_csv(_sal("cens"), index=False)
    return "; ".join(res)


def _financera(nom, pag, idm, fi):
    html = _peticio("GET", f"{pag}?IdMenu={idm}")
    anys, _ = _opcions(html, "any")
    if not anys or anys[0] in _anys_guardats(nom):
        return f"{nom}: al día"

    def ll(h, ine, any_):
        res = []
        for t in _taules(h):
            cap = next((r for r in t if any(re.fullmatch(r"\d{4}", c) for c in r)), None)
            if not cap:
                continue
            cols = [(i, c) for i, c in enumerate(cap) if re.fullmatch(r"\d{4}", c)]
            ini = t.index(cap)
            for f in t[ini + 1:]:
                if len(f) < len(cap):
                    continue
                clau = " ".join(f[: cols[0][0]])
                for i, a in cols:
                    res.append({"ine": ine, "any": a, "concepte": clau, "v": _num(f[i])})
        return res
    return _per_municipi(nom, pag, idm, "Municipi", "any", anys[:1], {}, ll, fi)


def _col_prest(c: str) -> str:
    c = c.lower()
    if "total" in c:
        return "total"
    if "contributiu" in c:
        return "contrib"
    if "inserci" in c:
        return "rai"
    if "assistencial" in c or "subsidi" in c:
        return "subsidi"
    return "altres"


def _prestacions(fi):
    """Una consulta por mes con los 221 municipios. Se revisan siempre los 3 últimos meses."""
    f = _sal("prestacions")
    vell = pd.read_csv(f, dtype=str) if f.exists() else pd.DataFrame(columns=["ine", "mes", "serie", "v"])
    fets = set(vell["mes"])
    pag, idm = "atur/ppd.asp", "030609"
    html = _peticio("GET", f"{pag}?IdMenu={idm}")
    anys, any_def = _opcions(html, "any")
    _, mes_def = _opcions(html, "mes")
    if not anys or not any_def or not mes_def:
        return "prestacions: ERROR sin formulario"
    ultim = (int(any_def), int(mes_def))
    mesos = [(a, m) for a in range(min(int(x) for x in anys), ultim[0] + 1) for m in range(1, 13) if (a, m) <= ultim]
    pend = [p for p in mesos if f"{p[0]}-{p[1]:02d}" not in fets] + mesos[-3:]
    files, n = [], 0
    for a, m in dict.fromkeys(pend):
        if time.time() > fi:
            break
        h = html if (a, m) == ultim else _peticio("POST", pag, {"IdMenu": idm, "any": a, "mes": m, "dades": "0", "boton": "Actualitzar"})
        t = _taula_amb(h, lambda c: c[0].startswith("Codi INE"))
        n += 1
        if not t:
            continue
        # Las columnas cambian con los años (antes había más tipos de subsidio): se leen por la cabecera
        cols = [_col_prest(c) for c in t[0][2:]]
        for r in t[1:]:
            if re.fullmatch(r"17\d{3}", r[0]):
                vals = {}
                for c, v in zip(cols, r[2:]):
                    x = _num(v)
                    if c in vals and x is not None:
                        vals[c] = (vals[c] or 0) + x
                    elif c not in vals:
                        vals[c] = x
                for c, x in vals.items():
                    files.append({"ine": r[0], "mes": f"{a}-{m:02d}", "serie": c, "v": x})
    if files:
        d = pd.DataFrame(files).fillna("").astype(str)
        vell = vell[~vell["mes"].isin(set(d["mes"]))]
        pd.concat([vell, d]).sort_values(["mes", "serie", "ine"]).to_csv(f, index=False)
    return f"prestacions: {n} meses consultados hasta {ultim[0]}-{ultim[1]:02d}"


TUR = {"hotel": ("provincials/activecon/tur_enq_hotel.asp", "03040802"),
       "camping": ("provincials/activecon/tur_enq_campings.asp", "03040804"),
       "rural": ("provincials/activecon/tur_enq_trural.asp", "03040806")}


def _turisme_comarca(fi):
    f = _sal("tur_comarca")
    vell = pd.read_csv(f, dtype=str) if f.exists() else pd.DataFrame(columns=["tipus", "any", "trim"])
    files, n = [], 0
    for tipus, (pag, idm) in TUR.items():
        html = _peticio("GET", f"{pag}?IdMenu={idm}")
        anys, any_def = _opcions(html, "any")
        _, trim_def = _opcions(html, "trimestre")
        if not anys:
            continue
        fets = set(zip(vell.loc[vell["tipus"] == tipus, "any"], vell.loc[vell["tipus"] == tipus, "trim"]))
        for a in sorted(anys):
            for q in ["0", "1", "2", "3", "4"]:
                # El año en curso y el anterior se revisan siempre
                if (a, q) in fets and int(a) < int(any_def) - 1:
                    continue
                if int(a) == int(any_def) and q != "0" and int(q) > int(trim_def or 0):
                    continue
                if time.time() > fi:
                    break
                t = _taula_amb(_peticio("POST", pag.lower(), {"IdMenu": idm, "any": a, "trimestre": q, "boton": "Actualitzar"}),
                               lambda c: "Comarca" in c)
                n += 1
                for r in (t or [])[1:]:
                    if len(r) >= 4 and r[1]:
                        files.append({"tipus": tipus, "any": a, "trim": q, "comarca": r[1],
                                      "viatgers": _num(r[2]), "pernoct": _num(r[3]), "ocup": _num(r[4]) if len(r) > 4 else None})
    if files:
        d = pd.DataFrame(files).fillna("").astype(str)
        clau = set(zip(d["tipus"], d["any"], d["trim"]))
        vell = vell[[(a, b, c) not in clau for a, b, c in zip(vell["tipus"], vell["any"], vell["trim"])]]
        pd.concat([vell, d]).to_csv(f, index=False)
    return f"tur_comarca: {n} consultas"


def ejecutar() -> str:
    fi = time.time() + LIMIT_S
    res = []
    for fn in (_prestacions, _turisme_comarca, _policia, _naixement,
               lambda fi: _financera("romanent", "financera/rop.asp", "03070107", fi),
               lambda fi: _financera("resultat", "financera/rep.asp", "03070106", fi),
               lambda fi: _financera("cesel", "financera/cesel.asp", "030706", fi),
               _cens):
        try:
            res.append(fn(fi))
        except Bloqueig as e:
            res.append(f"ERROR Xifra bloquea ({e})")
        except Exception as e:  # noqa: BLE001
            res.append(f"ERROR {e}")
    return "; ".join(res)
