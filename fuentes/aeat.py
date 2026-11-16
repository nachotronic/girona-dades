"""Agencia Tributaria: Estadística de los declarantes del IRPF por municipios (municipios de más de 1.000 habitantes).

La publicación son páginas HTML estáticas ("jrubik<hash>.html") enlazadas entre sí: desde la
página nacional de "Datos municipales por ámbito territorial" se baja a Cataluña, a la
provincia de Girona y a cada municipio (enlaces con el texto "Nombre-17xxx"). De cada página se
lee la tabla de conceptos (número de declaraciones, renta bruta media, rentas del trabajo...).

Las páginas de inicio de cada año tienen hash distinto; se parte de la página de 2023 y de los
enlaces a otros años que aparezcan en ella.
"""
from __future__ import annotations

import io
import re
import time
from urllib.parse import urljoin

import pandas as pd
from bs4 import BeautifulSoup

from .comun import carpeta, get

BASE = "https://sede.agenciatributaria.gob.es/AEAT/Contenidos_Comunes/La_Agencia_Tributaria/Estadisticas/Publicaciones/sites/irpfmunicipios/"
# Página "Datos municipales por ámbito territorial y tamaño de población" por año
INICIOS = {"2023": BASE + "2023/jrubik56c8a4941ca3d442b24b56b4ceb716f086a75f33.html"}
PAUSA = 0.4


def _sopa(url: str) -> BeautifulSoup:
    r = get(url, pausa=PAUSA)
    return BeautifulSoup(r.content.decode("utf-8", "replace"), "lxml")


def _enlace(soup: BeautifulSoup, url: str, patron: str) -> str | None:
    for a in soup.find_all("a", href=True):
        if re.fullmatch(patron, a.get_text(" ", strip=True)) and "jrubik" in a["href"]:
            return urljoin(url, a["href"])
    return None


def _conceptos(soup: BeautifulSoup) -> dict[str, float]:
    """Tablas de la página: 't<n>|concepto|<columna>' -> valor. La primera columna de la
    primera tabla es el total del concepto (importes en euros)."""
    res = {}
    for n, t in enumerate(soup.find_all("table")[:3]):
        for tr in t.find_all("tr"):
            c = [x.get_text(" ", strip=True) for x in tr.find_all(["td", "th"])]
            if len(c) < 2 or not c[0]:
                continue
            for j, x in enumerate(c[1:], 1):
                try:
                    res.setdefault(f"t{n}|{c[0]}|{j}", float(x.replace(".", "").replace(",", ".")))
                except ValueError:
                    pass
    return res


def ejecutar() -> str:
    sal = carpeta("aeat")
    lineas, filas = [], []
    for any_, inici in INICIOS.items():
        try:
            s = _sopa(inici)
            u_cat = _enlace(s, inici, r"Cataluña")
            s = _sopa(u_cat)
            u_gi = _enlace(s, u_cat, r"Girona")
            s_gi = _sopa(u_gi)
            filas.append({"any": any_, "ine": "17", "nom": "Provincia", **_conceptos(s_gi)})
            muns = [(a.get_text(" ", strip=True), urljoin(u_gi, a["href"])) for a in s_gi.find_all("a", href=True)
                    if re.search(r"-17\d{3}$", a.get_text(" ", strip=True)) and "jrubik" in a["href"]]
            for nom, u in muns:
                try:
                    filas.append({"any": any_, "ine": nom[-5:], "nom": nom[:-6], **_conceptos(_sopa(u))})
                except Exception as e:  # noqa: BLE001
                    lineas.append(f"{any_} {nom}: ERROR {e}")
            lineas.append(f"{any_}: {len(muns)} municipios")
        except Exception as e:  # noqa: BLE001
            lineas.append(f"{any_}: ERROR {type(e).__name__}: {str(e)[:160]}")
        time.sleep(1)
    if filas:
        df = pd.DataFrame(filas)
        df.to_csv(sal / "irpf_municipios.csv", index=False)
        lineas.append(f"{len(df)} filas, {df.shape[1]} columnas")
    return "\n".join(lineas)
