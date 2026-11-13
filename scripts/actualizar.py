"""Ejecuta las fuentes indicadas y escribe data/estado.md con el resultado de cada una.

Uso: python scripts/actualizar.py [territorio generalitat ine mitma xifra catastro]
"""
from __future__ import annotations

import datetime as dt
import importlib
import pathlib
import sys
import time
import traceback

RAIZ = pathlib.Path(__file__).resolve().parent.parent
sys.path.insert(0, str(RAIZ))

TODAS = ["territorio", "generalitat", "ine", "mitma", "xifra", "catastro", "geometria"]


def main(nombres: list[str]) -> int:
    nombres = nombres or TODAS
    informe = [f"# Estado de la última actualización\n\n{dt.datetime.now(dt.timezone.utc):%Y-%m-%d %H:%M} UTC\n"]
    fallos = 0
    for n in nombres:
        t0 = time.time()
        try:
            res = importlib.import_module(f"fuentes.{n}").ejecutar()
            estado = "ok"
        except Exception:  # noqa: BLE001
            res, estado = traceback.format_exc(limit=3), "ERROR"
            fallos += 1
        bloque = f"## {n}: {estado} ({time.time() - t0:.0f} s)\n\n```\n{res}\n```\n"
        print(bloque, flush=True)
        informe.append(bloque)
    (RAIZ / "data").mkdir(exist_ok=True)
    (RAIZ / "data" / "estado.md").write_text("\n".join(informe), encoding="utf-8")
    return 1 if fallos == len(nombres) else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
