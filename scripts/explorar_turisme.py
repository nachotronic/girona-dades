"""Exploración de fuentes de turismo, ronda 2 (temporal). Guarda en exploracion/turisme2/."""
import json, pathlib, re, sys, time
import requests
sys.path.insert(0, ".")
S = pathlib.Path("exploracion/turisme2"); S.mkdir(parents=True, exist_ok=True)
UA = {"User-Agent": "girona-dades/0.1 (+https://github.com/nachotronic/girona-dades)"}
INE = "https://servicios.ine.es/wstempus/js/ES"
log = []

def get(u, **k):
    for i in range(3):
        try:
            return requests.get(u, headers=UA, timeout=300, **k)
        except Exception as e:
            log.append(f"{u} intento {i}: {e}"); time.sleep(3)

def guarda(nom, r, maxb=2_000_000):
    if r is None: log.append(f"{nom}: sin respuesta"); return None
    log.append(f"{nom}: {r.status_code} {r.headers.get('content-type')} {len(r.content)}")
    (S / nom).write_bytes(r.content[:maxb]); return r

# 1. Tablas municipales de telefonía móvil: grupos y valores
for t in ("52048", "53464", "53465", "53001"):
    r = guarda(f"grupos_{t}.json", get(f"{INE}/GRUPOS_TABLA/{t}"))
    try:
        gs = r.json()
    except Exception:
        continue
    vals = {}
    for g in gs:
        rv = get(f"{INE}/VALORES_GRUPOSTABLA/{t}/{g['Id']}")
        try:
            v = rv.json(); vals[g["Id"]] = {"nom": g.get("Nombre"), "n": len(v), "ej": v[:5],
                "gi": [x for x in v if re.match(r"^17\d{3}$", str(x.get("Codigo", ""))) or "Girona" in str(x.get("Nombre", ""))][:300]}
        except Exception as e:
            vals[g["Id"]] = {"error": str(e)[:200], "txt": rv.text[:300] if rv is not None else None}
    (S / f"valores_{t}.json").write_text(json.dumps(vals, ensure_ascii=False, indent=1))
    # Prueba de filtro: Girona (municipio) con tv=<variable>:<valor>
    for gid, info in vals.items():
        gi = [x for x in info.get("gi", []) if str(x.get("Codigo")) == "17079"]
        if gi:
            x = gi[0]
            u = f"{INE}/DATOS_TABLA/{t}?tv={x['FK_Variable']}:{x['Id']}&nult=3"
            guarda(f"prueba_{t}.json", get(u))
            u2 = f"{INE}/DATOS_TABLA/{t}?tv={x['FK_Variable']}:{x['Id']}&nult=1&det=1"
            guarda(f"prueba_{t}_det.json", get(u2))
            break

# 2. Índices de INEbase: gasto con tarjetas y telefonía móvil
for k, u in {"tarjetas_7459.htm": "https://www.ine.es/dynt3/inebase/index.htm?padre=7459",
             "moviles_8578.htm": "https://www.ine.es/dynt3/inebase/es/index.htm?padre=8578&capsel=8579",
             "moviles_8581.htm": "https://www.ine.es/dynt3/inebase/es/index.htm?padre=8578&capsel=8581"}.items():
    r = guarda(k, get(u))
    if r is not None:
        ids = sorted(set(re.findall(r"[?&]t=(\d+)", r.text)))
        log.append(f"{k}: tablas {ids}")
        for t in ids[:30]:
            rr = get(f"{INE}/SERIES_TABLA/{t}?det=0")
            try:
                ss = [s["Nombre"] for s in rr.json()]
                gi = [s for s in ss if "Girona" in s or "Gerona" in s or "Cataluña" in s]
                (S / f"series_{t}.json").write_text(json.dumps({"n": len(ss), "ej": ss[:6], "gi": gi[:40]}, ensure_ascii=False, indent=1))
            except Exception as e:
                log.append(f"series {t}: {e}")

# 3. Socrata: muestras
SOC = "https://analisi.transparenciacatalunya.cat"
for d in ("83qv-sib8", "2nmt-74sj", "rn32-up9n", "8gmd-gz7i", "9qmy-ujbd", "jrvb-e5fa", "6yx4-i5rd"):
    guarda(f"soc_{d}_meta.json", get(f"{SOC}/api/views/{d}.json"), 300_000)
    guarda(f"soc_{d}.json", get(f"{SOC}/resource/{d}.json?$limit=40"), 300_000)
guarda("soc_8gmd_museus.json", get(f"{SOC}/resource/8gmd-gz7i.json", params={"$limit": 50, "$q": "museu Girona"}), 300_000)

# 4. Xifra con todos los años
try:
    from fuentes import turisme
    x, l = turisme.xifra()
    log += l
    x.to_csv(S / "xifra_oferta.csv", index=False)
except Exception as e:
    log.append(f"xifra: ERROR {e}")
(S / "log.txt").write_text("\n".join(log))
