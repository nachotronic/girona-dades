"""Exploración puntual de fuentes de salud (listas de espera, farmacia, centros)."""
import json, pathlib, re, urllib.parse
import requests

S = pathlib.Path("exploracion/salut"); S.mkdir(parents=True, exist_ok=True)
UA = {"User-Agent": "girona-dades/0.1 (+https://github.com/nachotronic/girona-dades)"}
SOC = "https://analisi.transparenciacatalunya.cat"
inf = []

def get(url, **kw):
    try:
        r = requests.get(url, headers=UA, timeout=120, **kw)
        inf.append(f"{r.status_code} {len(r.content)} {url}")
        return r
    except Exception as e:
        inf.append(f"ERR {type(e).__name__} {url}"); return None

cat = {}
for t in ["receptes", "farmàcia", "medicaments", "llista d'espera", "llistes d'espera", "temps d'espera", "Central de Resultats",
          "salut mental", "hospital", "centres sanitaris", "atenció primària", "morbiditat", "vacunació", "urgències",
          "altes hospitalàries", "CMBD", "consum de fàrmacs", "prestació farmacèutica", "CatSalut", "Observatori del Sistema de Salut",
          "àrea bàsica de salut", "regió sanitària"]:
    r = get(f"{SOC}/api/catalog/v1?" + urllib.parse.urlencode({"q": t, "limit": 40, "domains": "analisi.transparenciacatalunya.cat"}))
    if r is not None and r.ok:
        for x in r.json().get("results", []):
            rs = x["resource"]; cat[rs["id"]] = (rs["name"], rs.get("data_updated_at", "")[:10], rs.get("columns_field_name", []))
(S / "cataleg.txt").write_text("\n".join(f"{k}\t{v[1]}\t{v[0]}\t{','.join(v[2])[:400]}" for k, v in sorted(cat.items(), key=lambda z: z[1][0])), encoding="utf-8")

for d in ["av3u-smj4", "7f3n-y4sh", "hj2f-96x6", "ftq4-h9vk"] + [k for k, v in cat.items() if re.search(r"recept|farm|espera|medicam|hospital|centres|mental", v[0], re.I)][:25]:
    r = get(f"{SOC}/resource/{d}.json?$limit=15")
    if r is not None: (S / f"m_{d}.json").write_bytes(r.content[:60000])
r = get(f"{SOC}/resource/tt92-bngg.json?$select=any,mes,count(*)&$group=any,mes&$order=any,mes")
if r is not None: (S / "tt92_anys.json").write_bytes(r.content)

B = "https://catsalut.gencat.cat/ca/coneix-catsalut/acces-sistema-salut/llistes-espera/"
for p in ["", "intervencions-quirurgiques/", "consultes-externes-especialitats/", "proves-diagnostiques/"]:
    r = get(B + p)
    if r is None: continue
    links = sorted(set(re.findall(r'(?:href|src|data-url)="([^"]+)"', r.text)))
    (S / f"llistes_{p.strip('/') or 'index'}.txt").write_text("\n".join(links), encoding="utf-8")
    (S / f"llistes_{p.strip('/') or 'index'}.html").write_text(r.text[:200000], encoding="utf-8")
for u in ["https://datos.gob.es/en/catalogo/a09002970-recetas-facturadas-al-servei-catala-de-la-salut",
          "https://datos.gob.es/es/aplicaciones/espera-cat",
          "https://observatorisalut.gencat.cat/ca/central_de_resultats/",
          "https://observatorisalut.gencat.cat/ca/observatori-desigualtats-salut/indicadors_comunitaria/",
          "https://catsalut.gencat.cat/ca/proveidors-professionals/farmacia-medicaments/dades-facturacio/"]:
    r = get(u)
    if r is not None:
        n = re.sub(r"\W+", "_", u)[-60:]
        (S / f"w_{n}.html").write_text(r.text[:300000], encoding="utf-8")
(S / "informe.txt").write_text("\n".join(inf), encoding="utf-8")
print("\n".join(inf))
