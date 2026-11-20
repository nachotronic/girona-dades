"""Exploración temporal: cultura, Socrata e Idescat (fuentes/cultura.py) sin DadesBib."""
import pathlib
import shutil
import subprocess
import sys

subprocess.run([sys.executable, "-m", "pip", "install", "-q", "pandas"], check=False)
sys.path.insert(0, ".")
from fuentes import cultura  # noqa: E402

OUT = pathlib.Path("exploracion/cultura_nou")
OUT.mkdir(parents=True, exist_ok=True)
sal = cultura.carpeta("cultura")
log = cultura.socrata(sal) + cultura.idescat_aec(sal)
for n in ["cpnl.csv", "aec_centres_culte.txt"]:
    if (sal / n).exists():
        shutil.copy(sal / n, OUT / n)
(OUT / "log.txt").write_text("\n".join(log), encoding="utf-8")
print("\n".join(log))
