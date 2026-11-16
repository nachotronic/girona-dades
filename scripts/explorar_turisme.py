"""Exploración de fuentes de turismo (temporal). Guarda listados en exploracion/turisme/."""
import json, pathlib, re, time
import requests

S = pathlib.Path("exploracion/turisme"); S.mkdir(parents=True, exist_ok=True)
UA = {"User-Agent": "girona-dades/0.1 (+https://github.com/nachotronic/girona-dades)"}
INE = "https://servicios.ine.es/wstempus/js/ES"
log = []

def get(u, **k):
    for i in range(3):
        try:
            r = requests.get(u, headers=UA, timeout=180, **k); return r
        except Exception as e:
            log.append(f"{u} intento {i}: {e}"); time.sleep(3)

def guarda(nom, r, maxb=3_000_000):
    if r is None: log.append(f"{nom}: sin respuesta"); return
    log.append(f"{nom}: {r.status_code} {r.headers.get('content-type')} {len(r.content)}")
    (S / nom).write_bytes(r.content[:maxb])

r = get(f"{INE}/OPERACIONES_DISPONIBLES"); guarda("ine_ops.json", r)
ops = r.json() if r is not None and r.ok else []
pat = re.compile(r"turis|hotel|camping|apartamento|alojamiento|frontur|egatur|gasto|viajer|rentabilidad|albergue", re.I)
sel = [o for o in ops if pat.search(o.get("Nombre", ""))]
(S / "ine_ops_tur.json").write_text(json.dumps(sel, ensure_ascii=False, indent=1))
tabs = {}
for o in sel:
    cod = o.get("Codigo") or o.get("Id")
    rr = get(f"{INE}/TABLAS_OPERACION/{cod}")
    try: tabs[cod] = {"op": o.get("Nombre"), "tablas": [(t["Id"], t["Nombre"]) for t in rr.json()]}
    except Exception as e: tabs[cod] = {"op": o.get("Nombre"), "error": str(e)}
    time.sleep(0.3)
(S / "ine_tablas_tur.json").write_text(json.dumps(tabs, ensure_ascii=False, indent=1))
# Muestra de series de cada tabla (nombres, para ver la geografía)
mues = {}
for cod, v in tabs.items():
    for tid, tn in v.get("tablas", [])[:80]:
        rr = get(f"{INE}/SERIES_TABLA/{tid}?det=0")
        try:
            ss = [s["Nombre"] for s in rr.json()]
            gi = [s for s in ss if re.search(r"Girona|Gerona|17\d{3}|Costa Brava|Pirineu", s)]
            mues[tid] = {"t": tn, "n": len(ss), "ej": ss[:4], "gi": gi[:60]}
        except Exception as e:
            mues[tid] = {"t": tn, "error": str(e)[:100]}
        time.sleep(0.2)
(S / "ine_series_muestra.json").write_text(json.dumps(mues, ensure_ascii=False, indent=1))

PAG = {
 "ine_mov_interno.htm": "https://www.ine.es/experimental/turismo_moviles/experimental_turismo_moviles_interno.htm",
 "ine_mov.htm": "https://www.ine.es/experimental/turismo_moviles/experimental_turismo_moviles.htm",
 "ine_mov_receptor.htm": "https://www.ine.es/experimental/turismo_moviles/experimental_turismo_moviles_receptor.htm",
 "ine_mov_anual.htm": "https://www.ine.es/experimental/turismo_moviles/experimental_turismo_moviles_infoanual.htm",
 "ine_tarj_anual.htm": "https://www.ine.es/experimental/gasto_tarjetas/anual.htm",
 "ine_tarj_trim.htm": "https://www.ine.es/experimental/gasto_tarjetas/trimestral.htm",
 "idescat_taules.json": "https://api.idescat.cat/taules/v2?lang=ca",
 "idescat_turis.htm": "https://www.idescat.cat/tema/turis",
}
for k, u in PAG.items(): guarda(k, get(u))
# Idescat: estadísticas de turismo en la API de taules
try:
    d = json.loads((S / "idescat_taules.json").read_text())
    txt = json.dumps(d, ensure_ascii=False)
    ids = sorted(set(re.findall(r'taules/v2/(tur[a-z]*)', txt)))
    log.append(f"idescat tur: {ids}")
    for i in ids:
        guarda(f"idescat_{i}.json", get(f"https://api.idescat.cat/taules/v2/{i}?lang=ca"))
        try:
            dd = json.loads((S / f"idescat_{i}.json").read_text())
            for n in re.findall(r'taules/v2/' + i + r'/(\d+)', json.dumps(dd))[:6]:
                guarda(f"idescat_{i}_{n}.json", get(f"https://api.idescat.cat/taules/v2/{i}/{n}?lang=ca"))
        except Exception as e: log.append(f"{i}: {e}")
except Exception as e: log.append(f"idescat: {e}")
# Socrata Generalitat
for q in ("turisme", "turístic", "creuers", "ports", "museus visitants", "bandera blava", "platges", "allotjament"):
    r = get("https://analisi.transparenciacatalunya.cat/api/catalog/v1", params={"q": q, "limit": 60})
    try:
        res = [(x["resource"]["id"], x["resource"]["name"], x["resource"].get("data_updated_at")) for x in r.json()["results"]]
        (S / f"socrata_{q.replace(' ', '_')}.json").write_text(json.dumps(res, ensure_ascii=False, indent=1))
    except Exception as e: log.append(f"socrata {q}: {e}")
# Datos.gob.es / Ports de la Generalitat / Aena
for k, u in {"ports_gencat.htm": "https://portsgeneralitat.gencat.cat/ca/dades-i-estadistiques/",
             "ports_estad.htm": "https://ports.gencat.cat/ca/ports/estadistiques/",
             "ine_mov_api.json": f"{INE}/TABLAS_OPERACION/MOVTUR"}.items():
    guarda(k, get(u))
(S / "log.txt").write_text("\n".join(log))
