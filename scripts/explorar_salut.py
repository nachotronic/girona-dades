"""Exploración puntual de fuentes de salud, ronda 2."""
import json, pathlib, re, urllib.parse
import requests

S = pathlib.Path("exploracion/salut3"); S.mkdir(parents=True, exist_ok=True)
UA = {"User-Agent": "girona-dades/0.1 (+https://github.com/nachotronic/girona-dades)"}
SOC = "https://analisi.transparenciacatalunya.cat"
inf = []

def get(url, nom=None, lim=400000):
    try:
        r = requests.get(url, headers=UA, timeout=180)
        inf.append(f"{r.status_code} {len(r.content)} {nom} {url}")
        if nom: (S / nom).write_bytes(r.content[:lim])
        return r
    except Exception as e:
        inf.append(f"ERR {type(e).__name__} {nom} {url}"); return None

def q(d, nom, **p):
    get(f"{SOC}/resource/{d}.json?" + urllib.parse.urlencode(p), nom)

CS = "https://catsalut.gencat.cat"
for j in ["llistesEspera_funcions.js", "llistesEspera2csv.js", "llistesEspera2pdf.js"]:
    get(f"{CS}/.content/administratiu/js/llistes_espera/{j}", "js_" + j, 800000)
ESC = "https://web.gencat.cat/ca/generalitat/dades-indicadors/estadistiques-indicadors/salut/esca-salut/resultats-esca-salut"
for u, n in [(ESC, "esca_resultats.html")]:
    r = get(u, n, 800000)
    if r is not None and r.ok:
        links = sorted(set(re.findall(r'href="([^"]+)"', r.text)))
        (S / (n + "_links.txt")).write_text("\n".join(links), encoding="utf-8")
        for l in [l for l in links if re.search(r"\.(xlsx?|csv|zip)$", l, re.I)][:12]:
            get(urllib.parse.urljoin(u, l), "esca_" + re.sub(r"\W+", "_", l)[-80:], 3000000)
(S / "informe.txt").write_text("\n".join(inf), encoding="utf-8")
print("\n".join(inf))
