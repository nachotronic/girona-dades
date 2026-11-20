"""Exploración temporal: DadesBib por municipios, un informe por año (fuentes/cultura.py)."""
import pathlib
import shutil
import subprocess
import sys

subprocess.run([sys.executable, "-m", "pip", "install", "-q", "pandas"], check=False)
sys.path.insert(0, ".")
from fuentes import cultura  # noqa: E402

OUT = pathlib.Path("exploracion/dadesbib")
OUT.mkdir(parents=True, exist_ok=True)
for f in OUT.glob("*"):
    f.unlink()
sal = cultura.carpeta("cultura")
try:
    log = cultura.dadesbib(sal)
except Exception as e:  # noqa: BLE001
    log = [f"ERR {type(e).__name__}: {e}"]
for f in sal.glob("bib_*.csv"):
    shutil.copy(f, OUT / f.name)
(OUT / "log.txt").write_text("\n".join(log), encoding="utf-8")
print("\n".join(log))
