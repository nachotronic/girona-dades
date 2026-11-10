"""Utilidades comunes: sesión HTTP, rutas y normalización de nombres."""
from __future__ import annotations

import pathlib
import re
import time
import unicodedata

import requests

RAIZ = pathlib.Path(__file__).resolve().parent.parent
RAW = RAIZ / "data" / "raw"
PROC = RAIZ / "data" / "processed"
UA = "girona-dades/0.1 (+https://github.com/nachotronic/girona-dades)"

_sesion = requests.Session()
_sesion.headers["User-Agent"] = UA


def get(url: str, *, reintentos: int = 3, pausa: float = 0.0, **kw) -> requests.Response:
    """GET con reintentos y espera exponencial."""
    kw.setdefault("timeout", 120)
    for intento in range(reintentos):
        try:
            r = _sesion.get(url, **kw)
            r.raise_for_status()
            if pausa:
                time.sleep(pausa)
            return r
        except requests.RequestException:
            if intento == reintentos - 1:
                raise
            time.sleep(2 ** (intento + 1))
    raise RuntimeError("inalcanzable")


def post(url: str, data: dict, **kw) -> requests.Response:
    kw.setdefault("timeout", 120)
    r = _sesion.post(url, data=data, **kw)
    r.raise_for_status()
    return r


def descargar(url: str, destino: pathlib.Path, **kw) -> pathlib.Path:
    destino.parent.mkdir(parents=True, exist_ok=True)
    with _sesion.get(url, stream=True, timeout=kw.pop("timeout", 300), **kw) as r:
        r.raise_for_status()
        with open(destino, "wb") as f:
            for trozo in r.iter_content(1 << 20):
                f.write(trozo)
    return destino


def carpeta(*partes: str) -> pathlib.Path:
    p = PROC.joinpath(*partes)
    p.mkdir(parents=True, exist_ok=True)
    return p


def normaliza(nombre: str) -> str:
    """'Bisbal d'Empordà, la' y 'LA BISBAL D'EMPORDA' -> 'bisbal emporda la'."""
    s = unicodedata.normalize("NFKD", str(nombre)).encode("ascii", "ignore").decode().lower()
    s = re.sub(r"[^a-z0-9]+", " ", s)
    palabras = [p for p in s.split() if p not in {"d", "l", "de", "del", "i", "la", "el", "les", "els", "s"}]
    return " ".join(sorted(palabras))


def slug(texto: str, largo: int = 60) -> str:
    s = unicodedata.normalize("NFKD", texto).encode("ascii", "ignore").decode().lower()
    return re.sub(r"[^a-z0-9]+", "-", s).strip("-")[:largo]
