"""Exploración de las estadísticas del Catastro (temporal): guarda HTML/JS y enlaces."""
import pathlib, re, time, urllib.parse
import requests

BASE = "https://www.catastro.hacienda.gob.es/es-ES/"
SAL = pathlib.Path("exploracion/catastro"); SAL.mkdir(parents=True, exist_ok=True)
UA = {"User-Agent": "Mozilla/5.0 (girona-dades)"}
inici = [BASE + "estadisticas.html"] + [BASE + f"estadisticas_{n}.html" for n in
         ("1", "2", "3_1", "3_2", "4", "5", "6", "7", "9", "10", "11", "12")]
pend, vist, log = list(inici), set(), []
n = 0
while pend and n < 120:
    u = pend.pop(0)
    if u in vist:
        continue
    vist.add(u); n += 1
    try:
        r = requests.get(u, headers=UA, timeout=120)
    except Exception as e:
        log.append(f"ERR {u} {e}"); continue
    tipo = r.headers.get("content-type", "")
    nom = re.sub(r"[^A-Za-z0-9._-]", "_", urllib.parse.urlsplit(u).path.strip("/") + "_" + (urllib.parse.urlsplit(u).query or ""))[:150]
    log.append(f"{r.status_code} {tipo.split(';')[0]} {len(r.content)} {u}")
    if "html" in tipo or "javascript" in tipo or "json" in tipo or u.endswith(".js"):
        (SAL / (nom + (".js" if u.endswith(".js") else ".html"))).write_bytes(r.content)
        txt = r.text
        for h in re.findall(r"""(?:href|src|action|value|data-[a-z-]+)\s*=\s*["']([^"'#]+)["']""", txt) + re.findall(r"""["'](/[^"'\s]*(?:\.px|\.csv|\.xlsx?|\.zip|\.js|jaxi[^"'\s]*))["']""", txt):
            v = urllib.parse.urljoin(u, h)
            if "catastro" not in v:
                continue
            if v.endswith(".js") or re.search(r"estadisticas[^/]*\.html$", v):
                pend.append(v)
            elif re.search(r"\.(px|csv|xlsx?|zip)$|jaxi", v, re.I):
                log.append(f"  LINK {v}")
    else:
        (SAL / (nom + ".bin")).write_bytes(r.content[:300000])
    time.sleep(0.5)
(SAL / "informe.txt").write_text("\n".join(log), encoding="utf-8")
print("\n".join(log))
