"""Movilidad por estudios universitarios (Idescat, emouniv). Se ejecuta aparte de educacio."""
from __future__ import annotations

from .comun import carpeta
from .educacio import _universitaris


def ejecutar() -> str:
    return _universitaris(carpeta("educacio"))
