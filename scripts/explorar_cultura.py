"""Exploración de cultura, 3.ª ronda (temporal): ejecuta fuentes/cultura.py y copia el resultado a exploracion/."""
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
pags = {f"aec_{n}.html": f"https://www.idescat.cat/indicadors/?id=aec&n={n}&tema=cultu&lang=ca" for n in range(15038, 15047)}
pags.update({f"basics_{n}.html": f"https://www.idescat.cat/indicadors/?id=basics&n={n}&tema=cultu&lang=ca" for n in (10359, 10361, 10362, 10364, 10367, 22191)})
pags["bcin.html"] = "https://www.idescat.cat/pub/?id=bcin&lang=ca"
pags["paae_040707.html"] = "https://idescat.cat/paae/2024/040707"
pags["geonetwork_2304.html"] = "https://sig.gencat.cat/geonetwork/srv/cat/pdf?id=2304"
for nom, u in pags.items():
    try:
        r = requests.get(u, headers=UA, timeout=120)
        (OUT / nom).write_bytes(r.content[:2_000_000])
        t = re.sub(r"<script.*?</script>|<style.*?</style>", "", r.text, flags=re.S)
        tit = re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", t))[:300]
        enl = sorted(set(re.findall(r'href="([^"]*(?:csv|xls|f=|wfs|download|zip)[^"]*)"', r.text, re.I)))[:30]
        log.append(f"{r.status_code} {nom} {tit[:250]} || {' '.join(enl)}")
    except Exception as e:  # noqa: BLE001
        log.append(f"ERR {nom} {e}")
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
