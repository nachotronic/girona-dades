"""Exploración de cultura, 4.ª ronda (temporal): ejecuta fuentes/cultura.py y copia el resultado a exploracion/."""
import pathlib
import re
import shutil
import sys

import subprocess

subprocess.run([sys.executable, "-m", "pip", "install", "-q", "pandas"], check=False)  # explorar.yml solo instala requests
import requests  # noqa: E402

sys.path.insert(0, ".")
OUT = pathlib.Path("exploracion/cultura")
for f in OUT.glob("*"):
    f.unlink()
OUT.mkdir(parents=True, exist_ok=True)
UA = {"User-Agent": "girona-dades/0.1 (+https://github.com/nachotronic/girona-dades)"}
log = []
try:
    from fuentes import cultura
    log.append(cultura.ejecutar())
except Exception as e:  # noqa: BLE001
    log.append(f"ERR cultura {type(e).__name__} {e}")
src = pathlib.Path("data/processed/cultura")
for f in src.glob("*"):
    if f.stat().st_size < 20_000_000:
        shutil.copy(f, OUT / f.name)
(OUT / "log.txt").write_text("\n".join(log), encoding="utf-8")
print("\n".join(log))
