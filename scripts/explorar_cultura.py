"""Exploración temporal: catálogo de Cultura, 3.ª ronda (lengua por municipio, tablas AEC de cultura)."""
import json
import pathlib
import re

import requests

OUT = pathlib.Path("exploracion/cultura_cataleg")
OUT.mkdir(parents=True, exist_ok=True)
UA = {"User-Agent": "girona-dades/0.1 (+https://github.com/nachotronic/girona-dades)"}
DOM = "https://analisi.transparenciacatalunya.cat"
log = []
for ident in ["374c-85cu", "q9ct-fkjt", "q8hv-6y23"]:
    try:
        m = requests.get(f"{DOM}/api/views/{ident}.json", headers=UA, timeout=120).json()
        cols = [(c.get("fieldName"), c.get("name"), c.get("dataTypeName")) for c in m.get("columns", [])]
        r = requests.get(f"{DOM}/resource/{ident}.json?$limit=5", headers=UA, timeout=120).json()
        n = requests.get(f"{DOM}/resource/{ident}.json?$select=count(*)", headers=UA, timeout=120).json()
        (OUT / f"meta_{ident}.json").write_text(json.dumps({"nom": m.get("name"), "desc": m.get("description"), "cols": cols,
                                                           "mostra": r, "n": n}, ensure_ascii=False, indent=1), encoding="utf-8")
        log.append(f"{ident} {m.get('name')}: {n}")
    except Exception as e:  # noqa: BLE001
        log.append(f"ERR {ident}: {e}")
# Tablas del Anuario sobre cultura (índices por tema)
for n in range(15038, 15047):
    try:
        t = requests.get(f"https://www.idescat.cat/indicadors/?id=aec&n={n}&lang=ca", headers=UA, timeout=60).text
        for h, txt in re.findall(r'<a[^>]+href="([^"]*n=(\d+)[^"]*)"[^>]*>(.*?)</a>', t, re.S)[:0]:
            pass
        files = sorted(set((a, re.sub(r"<[^>]+>", "", b).strip()) for a, b in re.findall(r'href="[^"]*[?&](?:amp;)?n=(\d+)[^"]*"[^>]*>(.*?)</a>', t, re.S)))
        log.append(f"AEC {n}: " + " || ".join(f"{a}:{b[:70]}" for a, b in files if b))
    except Exception as e:  # noqa: BLE001
        log.append(f"ERR AEC {n}: {e}")
(OUT / "log3.txt").write_text("\n".join(log), encoding="utf-8")
print("\n".join(log))
