"""Exploración temporal: tablas INE de mayor frecuencia y Socrata Bombers (se borra antes del PR)."""
import json, pathlib, requests
S = pathlib.Path("exploracion/freq"); S.mkdir(parents=True, exist_ok=True)
API = "https://servicios.ine.es/wstempus/js/ES"
out = {}
for op in ("EH", "IPC", "SM", "H", "ETDP", "ECP"):
    try:
        out[op] = [(t["Id"], t["Nombre"], t.get("FK_Periodicidad")) for t in requests.get(f"{API}/TABLAS_OPERACION/{op}", timeout=120).json()]
    except Exception as e:
        out[op] = str(e)
(S / "tablas.json").write_text(json.dumps(out, ensure_ascii=False, indent=1))
for t in ("10743", "10745", "10746", "50913", "50914", "76147", "76148", "76152", "76415", "76416", "76418", "6150", "3221", "76315", "76316"):
    try:
        d = requests.get(f"{API}/DATOS_TABLA/{t}?nult=3", timeout=300).json()
        res = [{"nom": s.get("Nombre"), "d": [[p.get("Anyo"), p.get("FK_Periodo"), p.get("Valor")] for p in s.get("Data", [])]} for s in d if "Girona" in s.get("Nombre", "") or "Nacional" in s.get("Nombre", "")]
        (S / f"ine_{t}.json").write_text(json.dumps({"n": len(d), "girona_nac": res[:60]}, ensure_ascii=False, indent=1))
    except Exception as e:
        (S / f"ine_{t}.json").write_text(str(e))
SOC = "https://analisi.transparenciacatalunya.cat"
for name, url in {
    "bombers_meta": f"{SOC}/api/views/g2ay-3vnj.json",
    "bombers_mes": f"{SOC}/resource/g2ay-3vnj.json?$select=date_trunc_ym(act_dat_actuacio) as m, count(*) as n&$group=m&$order=m DESC&$limit=30",
    "bombers_fila": f"{SOC}/resource/g2ay-3vnj.json?$limit=3&$order=act_dat_actuacio DESC",
}.items():
    try:
        r = requests.get(url, timeout=300); (S / f"{name}.json").write_text(r.text[:150000])
    except Exception as e:
        (S / f"{name}.json").write_text(str(e))
