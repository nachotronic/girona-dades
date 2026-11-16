"""Exploración temporal del Cens d'establiments comercials (censcomerc.empresa.gencat.cat)."""
import json, pathlib, re, requests
OUT = pathlib.Path("exploracion/censcomerc"); OUT.mkdir(parents=True, exist_ok=True)
UA = {"User-Agent": "girona-dades/0.1 (+https://github.com/nachotronic/girona-dades)"}
BASE = "https://censcomerc.empresa.gencat.cat/"
log = []
def get(u, **kw):
    try:
        r = requests.get(u, headers=UA, timeout=60, **kw)
        log.append(f"{r.status_code} {r.headers.get('content-type','')} {len(r.content)} {u}")
        return r
    except Exception as e:
        log.append(f"ERR {e} {u}"); return None
r = get(BASE)
html = r.text if r is not None else ""
(OUT / "index.html").write_text(html)
srcs = re.findall(r'(?:src|href)="([^"]+\.(?:js|json))"', html)
urls = set()
for s in srcs:
    u = s if s.startswith("http") else BASE + s.lstrip("/")
    b = get(u)
    if b is None: continue
    t = b.text
    (OUT / ("bundle_" + re.sub(r"[^\w.]", "_", s)[-80:])).write_text(t[:3_000_000])
    for m in re.finditer(r'["\'`]((?:https?:)?//[^"\'`\s]{4,200}|/[a-zA-Z0-9_\-]+/[^"\'`\s]{2,200})["\'`]', t):
        urls.add(m.group(1))
    for kw in ("api", "rest", "servei", "service", "csv", "xls", "export", "descarreg"):
        for m in re.finditer(kw, t, re.I):
            urls.add("CTX:" + t[max(0, m.start()-120):m.end()+120].replace("\n", " "))
(OUT / "urls.txt").write_text("\n".join(sorted(urls)))
# Socrata
for q in ("establiments comercials", "cens comercial", "comerç", "superfície comercial", "establiments"):
    c = get("https://analisi.transparenciacatalunya.cat/api/catalog/v1", params={"q": q, "limit": 40})
    if c is not None and c.ok:
        for res in c.json().get("results", []):
            rr = res["resource"]; log.append(f"SOCRATA[{q}] {rr['id']} | {rr['name']} | {rr.get('updatedAt')}")
(OUT / "log.txt").write_text("\n".join(log))
