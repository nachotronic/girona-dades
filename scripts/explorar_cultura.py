"""Exploración temporal: catálogo completo de datos de Cultura en la Generalitat (Socrata) e Idescat."""
import json
import pathlib
import re

import requests

OUT = pathlib.Path("exploracion/cultura_cataleg")
OUT.mkdir(parents=True, exist_ok=True)
UA = {"User-Agent": "girona-dades/0.1 (+https://github.com/nachotronic/girona-dades)"}
log = []
vistos = {}
for q in [{"categories": "Cultura i lleure"}, {"attribution": "Departament de Cultura"}, {"q": "cultura"}, {"q": "biblioteques"},
          {"q": "museus"}, {"q": "patrimoni"}, {"q": "cinema"}, {"q": "teatre"}, {"q": "música"}, {"q": "festes"},
          {"q": "arqueologia"}, {"q": "llengua"}, {"q": "audiovisual"}, {"q": "llibre"}, {"q": "arts escèniques"}]:
    off = 0
    while True:
        p = {"domains": "analisi.transparenciacatalunya.cat", "limit": 100, "offset": off, "only": "dataset", **q}
        try:
            r = requests.get("https://api.us.socrata.com/api/catalog/v1", params=p, headers=UA, timeout=120)
            res = r.json().get("results", [])
        except Exception as e:  # noqa: BLE001
            log.append(f"ERR {q}: {e}")
            break
        for x in res:
            rs = x["resource"]
            vistos[rs["id"]] = {"id": rs["id"], "nom": rs["name"], "attr": rs.get("attribution"),
                                "cat": x.get("classification", {}).get("domain_category"),
                                "cols": rs.get("columns_field_name", []), "upd": rs.get("data_updated_at"),
                                "desc": (rs.get("description") or "")[:300]}
        if len(res) < 100:
            break
        off += 100
log.append(f"{len(vistos)} conjuntos")
cult = {k: v for k, v in vistos.items() if (v["cat"] or "").startswith("Cultura") or "Cultura" in (v["attr"] or "")}
(OUT / "cataleg.json").write_text(json.dumps(cult, ensure_ascii=False, indent=1), encoding="utf-8")
(OUT / "tots.json").write_text(json.dumps({k: [v["nom"], v["attr"], v["cat"]] for k, v in vistos.items()}, ensure_ascii=False, indent=0), encoding="utf-8")
# Idescat: lista de tablas del anuario (AEC) sobre cultura
try:
    t = requests.get("https://www.idescat.cat/indicadors/?id=aec&n=15753&lang=ca", headers=UA, timeout=60).text
    (OUT / "idescat_aec_15753.html").write_text(t, encoding="utf-8")
    for tema in ["https://www.idescat.cat/tema/cultu?lang=ca", "https://www.idescat.cat/indicadors/?id=aec&lang=ca"]:
        r = requests.get(tema, headers=UA, timeout=60)
        (OUT / (re.sub(r"\W+", "_", tema)[-40:] + ".html")).write_text(r.text, encoding="utf-8")
except Exception as e:  # noqa: BLE001
    log.append(f"ERR idescat {e}")
(OUT / "log.txt").write_text("\n".join(log), encoding="utf-8")
print("\n".join(log))
