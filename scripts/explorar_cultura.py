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
          {"q": "arqueologia"}, {"q": "jaciments"}, {"q": "inventari"}, {"q": "visitants"}, {"q": "festivals"}, {"q": "català"}, {"q": "sardanes"}, {"q": "castells"}, {"q": "llengua"}, {"q": "audiovisual"}, {"q": "llibre"}, {"q": "arts escèniques"}]:
    off = 0
    while True:
        p = {"limit": 100, "offset": off, "only": "dataset", **q}
        try:
            r = requests.get("https://analisi.transparenciacatalunya.cat/api/catalog/v1", params=p, headers=UA, timeout=120)
            if off == 0:
                log.append(f"{q}: HTTP {r.status_code}, {r.json().get('resultSetSize')}")
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
# Idescat: publicaciones de cultura con nivel municipal o comarcal (contenido de la página)
for pub in ["cine", "eauvi", "eulp", "ec", "eb", "bcin", "eae"]:
    try:
        r = requests.get(f"https://www.idescat.cat/pub/?id={pub}&lang=ca", headers=UA, timeout=60)
        (OUT / f"pub_{pub}.html").write_text(r.text, encoding="utf-8")
    except Exception as e:  # noqa: BLE001
        log.append(f"ERR pub {pub} {e}")
# EMEX de Girona (para ver qué indicadores de lengua/cultura hay por municipio)
try:
    r = requests.get("https://api.idescat.cat/emex/v1/dades.json?id=170792&lang=ca", headers=UA, timeout=60)
    (OUT / "emex_girona.json").write_text(r.text, encoding="utf-8")
except Exception as e:  # noqa: BLE001
    log.append(f"ERR emex {e}")
(OUT / "log.txt").write_text("\n".join(log), encoding="utf-8")
print("\n".join(log))
