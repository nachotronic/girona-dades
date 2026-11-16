"""Exploración puntual de fuentes de salud, ronda 2."""
import json, pathlib, re, urllib.parse
import requests

S = pathlib.Path("exploracion/salut5"); S.mkdir(parents=True, exist_ok=True)
UA = {"User-Agent": "girona-dades/0.1 (+https://github.com/nachotronic/girona-dades)"}
SOC = "https://analisi.transparenciacatalunya.cat"
inf = []

def get(url, nom=None, lim=400000):
    try:
        r = requests.get(url, headers=UA, timeout=400)
        inf.append(f"{r.status_code} {len(r.content)} {nom} {url}")
        if nom: (S / nom).write_bytes(r.content[:lim])
        return r
    except Exception as e:
        inf.append(f"ERR {type(e).__name__} {nom} {url}"); return None

def q(d, nom, **p):
    get(f"{SOC}/resource/{d}.json?" + urllib.parse.urlencode(p), nom)

q("8gmd-gz7i", "equip_cats.json", **{"$select": "categoria, count(*)", "$where": "categoria like '%Salut%' AND codi_municipi like '17%'", "$group": "categoria", "$limit": 500})
for u, n in [("https://www.idescat.cat/cercador/?q=enquesta+de+salut&lang=ca", "idescat_cerca.html"),
             ("https://salutweb.gencat.cat/ca/el_departament/estadistiques_sanitaries/enquestes/esca/", "salutweb_esca.html")]:
    get(u, n, 600000)
SC = "https://scientiasalut.gencat.cat"
r = get(f"{SC}/handle/11351/1566/browse?resetOffset=true&type=dateissued&order=DESC&rpp=100", "esca_browse.html", 900000)
if r is not None and r.ok:
    items = list(dict.fromkeys(re.findall(r'href="(/handle/11351/\d+)"', r.text)))
    (S / "esca_items.txt").write_text("\n".join(items), encoding="utf-8")
    for it in items[:40]:
        r2 = get(SC + it, None)
        if r2 is None or not r2.ok: continue
        tit = re.search(r"<title>(.*?)</title>", r2.text, re.S)
        bits = sorted(set(re.findall(r'href="(/bitstream/[^"]+)"', r2.text)))
        with open(S / "esca_items_detall.txt", "a", encoding="utf-8") as f:
            f.write(f"## {it} {tit.group(1).strip() if tit else ''}\n" + "\n".join(bits) + "\n")
(S / "informe.txt").write_text("\n".join(inf), encoding="utf-8")
print("\n".join(inf))
