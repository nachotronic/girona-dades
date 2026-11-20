"""Exploración temporal: qué tamaño de informe aguanta DadesBib sin dar 502."""
import pathlib
import subprocess
import sys
import time

subprocess.run([sys.executable, "-m", "pip", "install", "-q", "pandas"], check=False)
sys.path.insert(0, ".")
from fuentes import cultura  # noqa: E402

OUT = pathlib.Path("exploracion/dadesbib")
OUT.mkdir(parents=True, exist_ok=True)
log = []


def prova(nom, n_mun, detall, anys=None, vars_grups=None):
    t0 = time.monotonic()
    try:
        d = cultura.DadesBib()
        d.post({"__EVENTTARGET": cultura.MC + "list_abast", "__EVENTARGUMENT": "", cultura.MC + "RadioList": "RadioAbast",
                cultura.MC + "list_abast": "Municipis"})
        munis = sorted(v for v, _ in cultura._opcions(d.t, cultura.MC + "items_seg") if v.startswith("17"))
        grup = set(munis[:n_mun])
        if vars_grups is not None:
            cultura.GRUPS_BIB[:] = vars_grups
        d = cultura.DadesBib()
        txt, n, nv, na = d.informe("Municipis", lambda v, e: v in grup, detall, anys)
        (OUT / f"{nom}.csv").write_text(txt[:3_000_000], encoding="utf-8")
        log.append(f"OK {nom}: {n} mun, {nv} vars, anys {anys or na}, detall {detall}: {len(txt)} bytes, {txt.count(chr(10))} líneas, {time.monotonic() - t0:.0f} s")
    except Exception as e:  # noqa: BLE001
        log.append(f"ERR {nom}: {type(e).__name__}: {str(e)[:150]} ({time.monotonic() - t0:.0f} s)")
    print(log[-1], flush=True)


GR = list(cultura.GRUPS_BIB)
prova("m1", 1, False)
prova("m1_det", 1, True)
prova("m5", 5, False)
prova("m5_det", 5, True)
prova("m5_det_1any", 5, True, [11])
prova("m15", 15, False)
prova("m15_1any", 15, False, [11])
prova("m15_prestec", 15, False, None, ["Préstec"])
prova("m60_1any", 60, False, [11])
cultura.GRUPS_BIB[:] = GR
(OUT / "log.txt").write_text("\n".join(log), encoding="utf-8")
