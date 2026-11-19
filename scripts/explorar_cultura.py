"""Exploración de fuentes de cultura (temporal). Escribe exploracion/cultura/."""
import json
import pathlib
import re
import sys
import time

import requests

OUT = pathlib.Path("exploracion/cultura")
OUT.mkdir(parents=True, exist_ok=True)
UA = {"User-Agent": "girona-dades/0.1 (+https://github.com/nachotronic/girona-dades)"}
SOC = "https://analisi.transparenciacatalunya.cat"
TERMES = ["museus", "biblioteques", "cinema", "cinemes", "equipaments culturals", "patrimoni", "jaciments",
          "arqueològic", "arts escèniques", "teatre", "festivals", "cultura", "espectadors", "visitants",
          "monuments", "béns culturals", "arxius", "llibreries", "música", "dansa", "inventari patrimoni",
          "ateneus", "centres cívics", "auditoris", "sales de concerts", "festes", "castells", "sardanes"]
log = []


def get(url, **kw):
    try:
        r = requests.get(url, headers=UA, timeout=180, **kw)
        log.append(f"{r.status_code} {len(r.content)} {url}")
        return r
    except Exception as e:  # noqa: BLE001
        log.append(f"ERR {type(e).__name__} {url}")
        return None


def cataleg():
    vistos = {}
    for t in TERMES:
        r = get(f"{SOC}/api/catalog/v1", params={"q": t, "limit": 100, "only": "datasets"})
        if not r or r.status_code != 200:
            continue
        for x in r.json().get("results", []):
            res = x["resource"]
            vistos[res["id"]] = {
                "id": res["id"], "nom": res["name"], "desc": (res.get("description") or "")[:400],
                "cols": res.get("columns_name", []), "act": res.get("data_updated_at"),
                "org": x.get("classification", {}).get("domain_category"),
            }
        time.sleep(0.5)
    (OUT / "cataleg.json").write_text(json.dumps(list(vistos.values()), ensure_ascii=False, indent=1), encoding="utf-8")
    return vistos


def mostres(ids):
    for d in ids:
        r = get(f"{SOC}/resource/{d}.json", params={"$limit": 5})
        if r is not None:
            (OUT / f"m_{d}.json").write_text(r.text[:20000], encoding="utf-8")
        r = get(f"{SOC}/resource/{d}.json", params={"$select": "count(*)"})
        if r is not None:
            log.append(f"  count {d}: {r.text[:100]}")


def webs():
    pags = {
        "zenodo_bib.csv": "https://zenodo.org/records/15815448/files/data.csv?download=1",
        "dadesbib.html": "https://estadistiquesbiblioteques.gencat.cat/",
        "dadesculturals.html": "https://dadesculturals.gencat.cat/ca/estadistica_per_temes/",
        "dadesculturals_bib.html": "https://dadesculturals.gencat.cat/ca/estadistica_per_temes/biblioteques/index.html",
        "dadesculturals_mus.html": "https://dadesculturals.gencat.cat/ca/estadistica_per_temes/museus/index.html",
        "dadesculturals_cin.html": "https://dadesculturals.gencat.cat/ca/estadistica_per_temes/cinema/index.html",
        "idescat_taules.json": "https://api.idescat.cat/taules/v2?lang=ca",
        "icec_cinema.html": "https://icec.gencat.cat/ca/sectors/audiovisual/dades/",
    }
    for nom, u in pags.items():
        r = get(u)
        if r is not None:
            (OUT / nom).write_bytes(r.content[:3_000_000])
    # enlaces de descarga dentro de las páginas html
    for f in OUT.glob("*.html"):
        t = f.read_text(errors="ignore")
        enl = sorted(set(re.findall(r'href="([^"]+\.(?:xlsx?|csv|zip|json|ods|pdf)[^"]*)"', t, re.I)))
        log.append(f"  enlaces {f.name}: " + " ".join(enl[:80]))


if __name__ == "__main__":
    ids = sys.argv[1:]
    if ids:
        mostres(ids)
    else:
        cataleg()
        webs()
    (OUT / "log.txt").write_text("\n".join(log), encoding="utf-8")
    print("\n".join(log))
