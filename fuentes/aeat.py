"""Agencia Tributaria: Estadística de los declarantes del IRPF por municipios (municipios de más de 1.000 habitantes).

La publicación son páginas HTML estáticas ("jrubik<hash>.html") enlazadas entre sí: desde la
página nacional de "Datos municipales por ámbito territorial" se baja a Cataluña, a la
provincia de Girona y a cada municipio (enlaces con el texto "Nombre-17xxx"). De cada página se
lee la tabla de conceptos (número de declaraciones, renta bruta media, rentas del trabajo...).

Las páginas de inicio de cada año tienen hash distinto. Los años publicados se leen del catálogo
de datos abiertos (enlaces «irpfmunicipios/<año>/home.html»); desde la portada de cada año se
sigue el enlace «Datos municipales por ámbito territorial y tamaño». Los años ya guardados no
se vuelven a descargar (la AEAT no revisa las cifras publicadas).
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
CATALOGO = "https://sede.agenciatributaria.gob.es/Sede/datosabiertos/catalogo/hacienda/Estadistica_de_los_declarantes_del_IRPF_por_municipios.shtml"
DESDE = 2022
# Página "Datos municipales por ámbito territorial y tamaño de población" conocida (por si falla el catálogo)
INICIOS = {"2023": BASE + "2023/jrubik56c8a4941ca3d442b24b56b4ceb716f086a75f33.html"}


def _inicios() -> tuple[dict[str, str], list[str]]:
    """Página de inicio de cada año publicado desde DESDE."""
    inicios, avisos = dict(INICIOS), []
    try:
        cat = get(CATALOGO).text
        anys = sorted({int(a) for a in re.findall(r"sites/irpfmunicipios/(\d{4})/home\.html", cat) if int(a) >= DESDE})
    except Exception as e:  # noqa: BLE001
        return inicios, [f"catálogo: ERROR {type(e).__name__}: {str(e)[:120]}"]
    for a in anys:
        if str(a) in inicios:
            continue
        home = f"{BASE}{a}/home.html"
        try:
            # portada -> «Detalle de los municipios con más de 1.000 habitantes» (home_parcial…) -> datos
            u, cola, vistas = None, [home], set()
            while cola and not u and len(vistas) < 6:
                pag = cola.pop(0)
                vistas.add(pag)
                s = _sopa(pag)
                u = _enlace(s, pag, r"Datos municipales por ámbito territorial.*")
                cola += [urljoin(pag, x["href"]) for x in s.find_all("a", href=True)
                         if "home_parcial" in x["href"] and x.get_text(" ", strip=True).startswith("Detalle")
                         and urljoin(pag, x["href"]) not in vistas]
            if u:
                inicios[str(a)] = u
            else:
                avisos.append(f"{a}: ERROR sin enlace a los datos municipales en {home}")
        except Exception as e:  # noqa: BLE001
            avisos.append(f"{a}: ERROR {type(e).__name__}: {str(e)[:120]}")
    return dict(sorted(inicios.items())), avisos
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
    f = sal / "irpf_municipios.csv"
    previ = pd.read_csv(f, dtype=str) if f.exists() else pd.DataFrame(columns=["any"])
    inicios, lineas = _inicios()
    filas = []
    for any_, inici in inicios.items():
        if (previ["any"] == any_).sum() > 50:
            lineas.append(f"{any_}: ya guardado")
            continue
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
        nou = pd.DataFrame(filas).astype(str)
        df = pd.concat([previ[~previ["any"].isin(nou["any"])], nou], ignore_index=True).sort_values(["any", "ine"])
        df.to_csv(f, index=False)
        lineas.append(f"{len(df)} filas, {df.shape[1]} columnas")
    return "\n".join(lineas)
