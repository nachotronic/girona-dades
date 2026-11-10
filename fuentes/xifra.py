"""Xifra (Diputació de Girona): recorre el menú municipal y guarda cada tabla en CSV.

Las páginas de datos muestran los 221 municipios en una tabla HTML y tienen un
desplegable `any` con los años disponibles. Por defecto se guarda el año más
reciente; con XIFRA_HISTORICO=1 se guardan todos.
"""
from __future__ import annotations

import io
import os
import re
import time
from urllib.parse import urljoin

import pandas as pd
from bs4 import BeautifulSoup

from .comun import carpeta, get, post, slug

BASE = "https://www.ddgi.cat/xifra/"
MENU = BASE + "menu_mun.asp"
PAUSA = 0.5


def _arregla(m: re.Match) -> str:
    try:
        return m.group().encode("latin-1").decode("utf-8")
    except UnicodeDecodeError:
        return m.group()


def _html(r) -> str:
    """Xifra mezcla latin-1 y fragmentos UTF-8 en la misma página: se decodifica como
    latin-1 y se reparan las secuencias UTF-8."""
    texto = r.content.decode("latin-1")
    return re.sub(r"[\xc2-\xf4][\x80-\xbf]+", _arregla, texto)


def _enlaces_menu(html: str, url: str) -> list[tuple[str, str]]:
    soup = BeautifulSoup(html, "lxml")
    res = []
    for a in soup.find_all("a", href=True):
        if "IdMenu=" in a["href"]:
            res.append((urljoin(url, a["href"]), a.get_text(" ", strip=True)))
    return res


def _tablas(html: str) -> list[pd.DataFrame]:
    try:
        tablas = pd.read_html(io.StringIO(html), thousands=".", decimal=",")
    except ValueError:
        return []
    # Las tablas de datos tienen muchas filas. Las tablas de maquetación envuelven a las
    # de datos con las mismas columnas: de cada juego de columnas se queda la más pequeña.
    por_columnas: dict[tuple, pd.DataFrame] = {}
    for t in tablas:
        if len(t) < 20:
            continue
        clave = tuple(map(str, t.columns))
        if clave not in por_columnas or len(t) < len(por_columnas[clave]):
            por_columnas[clave] = t
    return list(por_columnas.values())


def _formulario(html: str, url: str) -> dict | None:
    """Acción, campos ocultos y opciones de los desplegables `any` y `dades`."""
    soup = BeautifulSoup(html, "lxml")
    form = soup.find("form", attrs={"name": "formulario"})
    if not form:
        return None
    ocultos = {i["name"]: i.get("value", "") for i in form.find_all("input", attrs={"type": re.compile("hidden", re.I)}) if i.get("name")}
    opciones = {}
    por_defecto = {}
    for sel in form.find_all("select"):
        ops = [(o.get("value"), o.get_text(" ", strip=True)) for o in sel.find_all("option")]
        opciones[sel["name"]] = ops
        elegida = sel.find("option", selected=True) or sel.find("option")
        por_defecto[sel["name"]] = elegida.get("value") if elegida else None
    return {"accion": urljoin(url, form.get("action") or url), "ocultos": ocultos,
            "opciones": opciones, "por_defecto": por_defecto}


def _guarda(salida, indice, idm, titulo, any_, dades, etiqueta, tablas, url):
    for i, t in enumerate(tablas):
        nombre = f"{idm}_{slug(titulo, 40)}_{slug(etiqueta or 'dades', 40)}_{any_ or 'ultimo'}_{i}.csv"
        t.to_csv(salida / nombre, index=False)
        indice.append({"idmenu": idm, "titulo": titulo, "dades": dades, "dades_nom": etiqueta,
                       "any": any_, "tabla": i, "filas": len(t), "columnas": len(t.columns),
                       "fichero": nombre, "url": url})


def ejecutar() -> str:
    historico = os.environ.get("XIFRA_HISTORICO") == "1"
    salida = carpeta("xifra")
    vistos: set[str] = set()
    pendientes = _enlaces_menu(_html(get(MENU)), MENU)
    indice: list[dict] = []
    errores = 0
    while pendientes:
        url, titulo = pendientes.pop(0)
        idm = re.search(r"IdMenu=(\d+)", url).group(1)
        if idm in vistos or not idm.startswith("03"):  # 03 = dades municipals
            continue
        vistos.add(idm)
        try:
            r = get(url, pausa=PAUSA)
        except Exception:  # noqa: BLE001
            errores += 1
            continue
        html, final = _html(r), r.url
        tablas = _tablas(html)
        if not tablas:
            # Página de menú intermedia: seguir sus enlaces
            pendientes.extend(e for e in _enlaces_menu(html, final)
                              if re.search(r"IdMenu=(\d+)", e[0]).group(1) not in vistos)
            continue
        # Las páginas de datos enlazan a sus tablas hermanas (03020101 -> 03020102...)
        pendientes.extend(e for e in _enlaces_menu(html, final)
                          if re.search(r"IdMenu=(\d+)", e[0]).group(1) not in vistos)
        form = _formulario(html, final)
        if not form:
            _guarda(salida, indice, idm, titulo, None, None, None, tablas, final)
            continue
        anys = [v for v, _ in form["opciones"].get("any", [])] or [None]
        if not historico:
            anys = [form["por_defecto"].get("any") or anys[0]]
        # `dades` solo cambia la presentación (absolutos o porcentajes): nos quedamos con la de defecto
        dades = [(form["por_defecto"].get("dades"), None)]
        for any_ in anys:
            for valor, etiqueta in dades:
                es_defecto = any_ == form["por_defecto"].get("any") and valor == form["por_defecto"].get("dades")
                if es_defecto:
                    t_actual = tablas
                else:
                    datos = dict(form["ocultos"])
                    datos.update({k: v for k, v in form["por_defecto"].items() if v is not None})
                    if any_ is not None:
                        datos["any"] = any_
                    if valor is not None:
                        datos["dades"] = valor
                    datos["boton"] = "Actualitza"
                    try:
                        t_actual = _tablas(_html(post(form["accion"], datos)))
                        time.sleep(PAUSA)
                    except Exception:  # noqa: BLE001
                        errores += 1
                        continue
                _guarda(salida, indice, idm, titulo, any_, valor, etiqueta, t_actual, final)
    pd.DataFrame(indice).to_csv(salida / "_indice.csv", index=False)
    return f"{len(indice)} tablas de {len({x['idmenu'] for x in indice})} páginas; {errores} errores"
