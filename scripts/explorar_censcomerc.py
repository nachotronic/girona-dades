"""Exploración temporal del Cens d'establiments comercials (2a ronda)."""
import json, pathlib, requests, base64
OUT = pathlib.Path("exploracion/censcomerc"); OUT.mkdir(parents=True, exist_ok=True)
for f in OUT.glob("bundle_*"): f.unlink()
UA = {"User-Agent": "girona-dades/0.1 (+https://github.com/nachotronic/girona-dades)"}
B = "https://censcomerc.empresa.gencat.cat/api/"
log = []
def get(nom, u, **kw):
    try:
        r = requests.get(u, headers=UA, timeout=120, **kw)
        log.append(f"{r.status_code} {r.headers.get('content-type','')} {len(r.content)} {r.url}")
        (OUT / nom).write_bytes(r.content[:400_000])
        return r
    except Exception as e:
        log.append(f"ERR {e} {u}")
r = get("anys.json", B + "anys/actius")
get("ambits.json", B + "ambits/filtre/?year=2024")
get("comarques.json", B + "comarques/filtre/?year=2024")
get("municipis_2024.json", B + "municipis/filtre/?year=2024")
get("municipis_sense.json", B + "municipis/filtre/?")
get("municipis_2017.json", B + "municipis/filtre/?year=2017")
get("sectors_girona.json", B + "sector/filtre/municipi?municipi=Girona&year=2024")
get("sectors_cat.json", B + "sectors/filtre?year=2024")
get("activitats_girona.json", B + "activitat/filtre?municipi=Girona&year=2024")
get("filtres.json", B + "filtres/territori?year=2024")
get("municipi_nom.json", B + "municipi/filtre?nom=Girona&year=2024")
x = get("excel_municipis.json", B + "excel/filtre?tipo=municipis&year=2024")
try:
    (OUT / "excel_municipis.xlsx").write_bytes(base64.b64decode(x.json()["export"]))
except Exception as e: log.append(f"excel ERR {e}")
for d in ("2dhj-q3r8", "8my5-y3qb", "4w2r-uffk", "jyyn-3aye", "8dtv-rvgy"):
    get(f"soc_{d}_meta.json", f"https://analisi.transparenciacatalunya.cat/api/views/{d}.json")
    get(f"soc_{d}_mostra.json", f"https://analisi.transparenciacatalunya.cat/resource/{d}.json?$limit=20")
(OUT / "log.txt").write_text("\n".join(log))
