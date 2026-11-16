"""Exploración de turismo, ronda 3 (temporal): viviendas turísticas (INE VTE) y Movimientos en Fronteras."""
import json, pathlib, re, time
import requests
S = pathlib.Path("exploracion/turisme3"); S.mkdir(parents=True, exist_ok=True)
UA = {"User-Agent": "girona-dades/0.1 (+https://github.com/nachotronic/girona-dades)"}
INE = "https://servicios.ine.es/wstempus/js/ES"
log = []
def get(u):
    for i in range(3):
        try: return requests.get(u, headers=UA, timeout=300)
        except Exception as e: log.append(f"{u}: {e}"); time.sleep(3)
res = {}
for op in ("VTE", "FR"):
    try:
        tabs = get(f"{INE}/TABLAS_OPERACION/{op}").json()
    except Exception as e:
        log.append(f"{op}: {e}"); continue
    for t in tabs:
        tid = t["Id"]; info = {"op": op, "nom": t["Nombre"]}
        try:
            gs = get(f"{INE}/GRUPOS_TABLA/{tid}").json(); info["grups"] = []
            for g in gs:
                v = get(f"{INE}/VALORES_GRUPOSTABLA/{tid}/{g['Id']}").json()
                gi = [x for x in v if re.match(r"^17\d{3}", str(x.get("Codigo", ""))) or x.get("Nombre") in ("Girona", "Cataluña", "Total Nacional", "Total")]
                info["grups"].append({"id": g["Id"], "nom": g["Nombre"], "n": len(v), "ej": v[:3], "gi": gi[:5], "n_gi": len(gi)})
            # Prueba: filtrar por Girona (municipio 17079 o provincia 17) en el primer grupo geográfico
            for g in info["grups"]:
                x = next((x for x in g["gi"] if str(x.get("Codigo")) in ("17079", "17", "1707901001")), None)
                if x:
                    r = get(f"{INE}/DATOS_TABLA/{tid}?tv={x['FK_Variable']}:{x['Id']}&nult=2")
                    try:
                        d = r.json(); info["prueba"] = {"filtro": x["Nombre"], "n": len(d), "ej": [(s["Nombre"], s["Data"][:2]) for s in d[:8]]}
                    except Exception as e:
                        info["prueba"] = {"error": str(e), "txt": r.text[:200] if r is not None else None}
                    break
        except Exception as e:
            info["error"] = str(e)[:200]
        res[tid] = info
        time.sleep(0.2)
(S / "vte_fr.json").write_text(json.dumps(res, ensure_ascii=False, indent=1))
(S / "log.txt").write_text("\n".join(log))
