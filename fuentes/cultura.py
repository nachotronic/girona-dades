"""Cultura: bibliotecas públicas (DadesBib), equipamientos y otros datos del Departament de Cultura.

- DadesBib, cercador d'estadístiques de biblioteques públiques de Catalunya
  (https://estadistiquesbiblioteques.gencat.cat). Formulario ASP.NET + ReportViewer: se eligen años,
  ámbito (municipios o provincias) e indicadores, y el informe se exporta en CSV. Desde 2014.
- Socrata Generalitat (analisi.transparenciacatalunya.cat):
    48s6-82h2  Equipaments culturals de Catalunya (cines, teatros, museos, centros cívicos...)
    v366-9743  Cens de biblioteques i centres patrimonials
    pdn2-3bbd  Entitats culturals i associacions (ECA)
    igtv-wrij  Directori d'arxius de Catalunya
    kgek-zg4b  Xarxa de llibreries acreditades
    2xiz-255m  Programa.cat: espectáculos profesionales subvencionados, por municipio y fecha
    rhpv-yr4f  Agenda cultural de Catalunya (actividades por municipio)

Escribe en data/processed/cultura/:
  bib_municipis.csv     DadesBib, municipios de Girona por año e indicador (formato largo)
  bib_biblioteques.csv  DadesBib, cada biblioteca de la provincia por año e indicador
  bib_ambits.csv        DadesBib, provincias y Cataluña por año e indicador
  equipaments.csv, biblioteques_cens.csv, entitats.csv, arxius.csv, llibreries.csv, programa_cat.csv
  agenda.csv            actividades de la agenda por municipio y año (toda Cataluña)
"""
from __future__ import annotations

import csv
import html as H
import io
import re
import urllib.parse

import pandas as pd
import requests

from .comun import UA, carpeta, get

DOMINIO = "https://analisi.transparenciacatalunya.cat"
BIB = "https://estadistiquesbiblioteques.gencat.cat/"
MC = "ctl00$MainContent$"
GRUPS_BIB = ["Equipament", "Obertura al públic", "Fons", "Usuaris registrats (carnets)", "Préstec", "Activitats", "Ús d'altres serveis",
             "Despesa de funcionament"]


def soql(ident: str, **params) -> pd.DataFrame:
    params.setdefault("$limit", 2_000_000)
    r = get(f"{DOMINIO}/resource/{ident}.csv?{urllib.parse.urlencode(params)}", timeout=900)
    return pd.read_csv(io.BytesIO(r.content), dtype=str, low_memory=False)


# --- DadesBib (formulario ASP.NET) ---

def _camps(t: str) -> dict:
    f = {}
    for m in re.finditer(r"<input[^>]*>", t):
        a = m.group(0)
        n = re.search(r'name="([^"]+)"', a)
        tp = (re.search(r'type="([^"]+)"', a) or [None, "text"])[1]
        if not n or tp in ("submit", "button", "image", "checkbox", "radio"):
            continue
        v = re.search(r'value="([^"]*)"', a)
        f[H.unescape(n.group(1))] = H.unescape(v.group(1)) if v else ""
    return f


def _opcions(t: str, nom: str) -> list[tuple[str, str]]:
    m = re.search(r'<select[^>]*name="' + re.escape(nom) + r'"[^>]*>(.*?)</select>', t, re.S)
    if not m:
        return []
    return [(H.unescape(a), re.sub(r"<[^>]+>", "", H.unescape(b)).strip())
            for a, b in re.findall(r'<option[^>]*value="([^"]*)"[^>]*>(.*?)</option>', m.group(1), re.S)]


class DadesBib:
    def __init__(self):
        self.s = requests.Session()
        self.s.headers["User-Agent"] = UA
        r = self.s.get(BIB, timeout=300)
        r.raise_for_status()
        self.url, self.t = r.url, r.text
        self.anys = re.findall(r'<label for="CheckAny_\d+">(\d{4})</label>', self.t) or []

    def post(self, extra: dict) -> str:
        f = _camps(self.t)
        f.update(extra)
        r = self.s.post(self.url, data=f, timeout=600)
        r.raise_for_status()
        self.t = r.text
        return r.text

    def informe(self, abast: str, filtre, detall: bool) -> str:
        """Devuelve el CSV del informe: todos los años, los municipios/ámbitos que pasan `filtre` y todas las variables."""
        base = {MC + "RadioList": "RadioAbast", MC + "list_abast": abast}
        self.post({"__EVENTTARGET": MC + "list_abast", "__EVENTARGUMENT": "", **base})
        items = [v for v, e in _opcions(self.t, MC + "items_seg") if filtre(v, e)]
        if not items:
            raise RuntimeError(f"DadesBib: ningún elemento en «{abast}»")
        self.post({**base, MC + "items_seg": items, MC + "add_seg": ""})
        sel = [v for v, _ in _opcions(self.t, MC + "items_seg_sel")]
        base[MC + "items_seg_sel"] = sel
        for g in GRUPS_BIB:
            self.post({"__EVENTTARGET": MC + "agr_variables", "__EVENTARGUMENT": "", **base, MC + "agr_variables": g})
            vs = [v for v, _ in _opcions(self.t, MC + "var")]
            if vs:
                self.post({**base, MC + "agr_variables": g, MC + "var": vs, MC + "add_var": ""})
        var_sel = [v for v, _ in _opcions(self.t, MC + "var_sel")]
        n_anys = len(re.findall(r'id="CheckAny_\d+"', self.t))
        ext = {f"{MC}CheckAny$CheckAny_{i}": "on" for i in range(n_anys)}
        ext.update({**base, MC + "var_sel": var_sel, MC + "Button_Submit_Top": "Envia"})
        if detall:
            ext[MC + "chk_detall_biblio"] = "on"
        t = self.post(ext)
        m = re.search(r'"ExportUrlBase":"([^"]+)"', t)
        if not m:
            raise RuntimeError("DadesBib: el informe no tiene ExportUrlBase")
        exp = urllib.parse.urljoin(self.url, m.group(1).encode().decode("unicode_escape")) + "CSV"
        r = self.s.get(exp, timeout=900)
        r.raise_for_status()
        txt = r.content.decode("utf-8-sig", errors="replace")
        # volver al formulario para la siguiente consulta
        r = self.s.get(BIB, timeout=300)
        self.url, self.t = r.url, r.text
        return txt, len(sel), len(var_sel), n_anys


def dadesbib(sal) -> list[str]:
    res = []
    d = DadesBib()
    for nom, abast, filtre, detall in (
        ("bib_municipis", "Municipis", lambda v, e: v.startswith("17"), False),
        ("bib_biblioteques", "Municipis", lambda v, e: v.startswith("17"), True),
        ("bib_ambits", "Províncies", lambda v, e: True, False),
        ("bib_catalunya", "Tot Catalunya", lambda v, e: True, False),
    ):
        try:
            txt, n, nv, na = d.informe(abast, filtre, detall)
            (sal / f"{nom}_raw.csv").write_text(txt, encoding="utf-8")
            files = list(csv.reader(io.StringIO(txt)))
            res.append(f"DadesBib {nom}: {n} elementos, {nv} variables, {na} años; {len(files)} filas en el CSV")
        except Exception as e:  # noqa: BLE001
            res.append(f"ERROR DadesBib {nom}: {type(e).__name__}: {str(e)[:200]}")
            d = DadesBib()
    return res


# --- Socrata ---

def socrata(sal) -> list[str]:
    res = []
    consultes = {
        "equipaments": ("48s6-82h2", {"$where": "starts_with(id_municipi, '17')"}),
        "biblioteques_cens": ("v366-9743", {}),
        "entitats": ("pdn2-3bbd", {"$where": "starts_with(codi_municipi, '17')"}),
        "arxius": ("igtv-wrij", {"$where": "starts_with(codi_ine, '17')"}),
        "llibreries": ("kgek-zg4b", {}),
        "programa_cat": ("2xiz-255m", {}),
        "agenda": ("rhpv-yr4f", {"$select": "municipi, comarca, date_extract_y(data_inici) as any, count(*) as n",
                                 "$group": "municipi, comarca, any", "$order": "any"}),
    }
    for nom, (ident, params) in consultes.items():
        try:
            d = soql(ident, **params)
            d.to_csv(sal / f"{nom}.csv", index=False)
            res.append(f"{nom} ({ident}): {len(d)} filas, columnas {list(d.columns)[:40]}")
        except Exception as e:  # noqa: BLE001
            res.append(f"ERROR {nom} ({ident}): {type(e).__name__}: {str(e)[:200]}")
    return res


def ejecutar() -> str:
    sal = carpeta("cultura")
    lineas = []
    for nom, f in (("Socrata", socrata), ("DadesBib", dadesbib)):
        try:
            lineas += f(sal)
        except Exception as e:  # noqa: BLE001
            lineas.append(f"ERROR {nom}: {type(e).__name__}: {str(e)[:200]}")
    return "\n".join(lineas)
