"""Exploración de fuentes de cultura, 2.ª ronda (temporal). Escribe exploracion/cultura/."""
import html as H
import json
import pathlib
import re
import time

import requests

OUT = pathlib.Path("exploracion/cultura")
OUT.mkdir(parents=True, exist_ok=True)
UA = {"User-Agent": "girona-dades/0.1 (+https://github.com/nachotronic/girona-dades)"}
SOC = "https://analisi.transparenciacatalunya.cat"
IDS = ["48s6-82h2", "v366-9743", "mnw2-hjsc", "pdn2-3bbd", "igtv-wrij", "kgek-zg4b", "2xiz-255m", "rhpv-yr4f",
       "4fyy-qt6t", "8gmd-gz7i", "aqrw-u8kv", "q8hv-6y23"]
log = []


def get(url, s=requests, **kw):
    try:
        r = s.get(url, headers=UA, timeout=300, **kw)
        log.append(f"{r.status_code} {len(r.content)} {r.url[:200]}")
        return r
    except Exception as e:  # noqa: BLE001
        log.append(f"ERR {type(e).__name__} {url}")
        return None


def socrata():
    for d in IDS:
        r = get(f"{SOC}/api/views/{d}.json")
        if r is not None and r.ok:
            m = r.json()
            cols = [(c.get("fieldName"), c.get("name"), c.get("dataTypeName"), (c.get("cachedContents") or {}).get("top", [])[:25]) for c in m.get("columns", [])]
            (OUT / f"meta_{d}.json").write_text(json.dumps({"nom": m.get("name"), "desc": m.get("description"), "rows": m.get("rowsUpdatedAt"), "cols": cols}, ensure_ascii=False, indent=1), encoding="utf-8")
        r = get(f"{SOC}/resource/{d}.json", params={"$limit": 4})
        if r is not None:
            (OUT / f"m_{d}.json").write_text(r.text[:30000], encoding="utf-8")
        r = get(f"{SOC}/resource/{d}.json", params={"$select": "count(*)"})
        if r is not None:
            log.append(f"  count {d}: {r.text[:100]}")
        time.sleep(0.5)


def camps(t):
    """Valores de un formulario ASP.NET: inputs hidden/text y selects (opciones seleccionadas)."""
    f = {}
    for m in re.finditer(r'<input[^>]*>', t):
        a = m.group(0)
        n = re.search(r'name="([^"]+)"', a)
        tp = (re.search(r'type="([^"]+)"', a) or [None, "text"])[1]
        if not n or tp in ("submit", "button", "image", "checkbox", "radio"):
            continue
        v = re.search(r'value="([^"]*)"', a)
        f[H.unescape(n.group(1))] = H.unescape(v.group(1)) if v else ""
    return f


def opcions(t, nom):
    m = re.search(r'<select[^>]*name="' + re.escape(nom) + r'"[^>]*>(.*?)</select>', t, re.S)
    if not m:
        return []
    return [(H.unescape(a), re.sub(r"<[^>]+>", "", H.unescape(b)).strip()) for a, b in re.findall(r'<option[^>]*value="([^"]*)"[^>]*>(.*?)</option>', m.group(1), re.S)]


def dadesbib():
    U = "https://estadistiquesbiblioteques.gencat.cat/"
    s = requests.Session()
    r = get(U, s)
    if r is None:
        return
    url = r.url
    MC = "ctl00$MainContent$"
    pas = [0]

    def post(t, extra):
        f = camps(t)
        f.update(extra)
        pas[0] += 1
        try:
            rr = s.post(url, data=f, headers=UA, timeout=300)
        except Exception as e:  # noqa: BLE001
            log.append(f"ERR post {pas[0]} {e}")
            return t
        (OUT / f"bib_{pas[0]}.html").write_text(rr.text, encoding="utf-8")
        log.append(f"post {pas[0]} {rr.status_code} {len(rr.text)} {list(extra)[:6]}")
        return rr.text

    t = r.text
    t = post(t, {"__EVENTTARGET": MC + "list_abast", "__EVENTARGUMENT": "", MC + "RadioList": "RadioAbast", MC + "list_abast": "Municipis"})
    ops = opcions(t, MC + "items_seg")
    log.append(f"  items_seg ({len(ops)}): {ops[:15]}")
    gir = [v for v, e in ops if "Girona" in e or "Figueres" in e][:2]
    if not gir and ops:
        gir = [ops[0][0]]
    t = post(t, {MC + "RadioList": "RadioAbast", MC + "list_abast": "Municipis", MC + "items_seg": gir, MC + "add_seg": ""})
    log.append(f"  items_seg_sel: {opcions(t, MC + 'items_seg_sel')[:10]}")
    sel_seg = [v for v, _ in opcions(t, MC + "items_seg_sel")]
    totes_var = {}
    for g in ["Equipament", "Usuaris registrats (carnets)", "Préstec", "Activitats", "Ús d'altres serveis"]:
        t = post(t, {"__EVENTTARGET": MC + "agr_variables", "__EVENTARGUMENT": "", MC + "RadioList": "RadioAbast", MC + "list_abast": "Municipis",
                     MC + "items_seg_sel": sel_seg, MC + "agr_variables": g})
        vo = opcions(t, MC + "var")
        totes_var[g] = vo
        t = post(t, {MC + "RadioList": "RadioAbast", MC + "list_abast": "Municipis", MC + "items_seg_sel": sel_seg, MC + "agr_variables": g,
                     MC + "var": [v for v, _ in vo], MC + "add_var": ""})
    (OUT / "bib_variables.json").write_text(json.dumps(totes_var, ensure_ascii=False, indent=1), encoding="utf-8")
    var_sel = [v for v, _ in opcions(t, MC + "var_sel")]
    log.append(f"  var_sel ({len(var_sel)})")
    ext = {f"{MC}CheckAny$CheckAny_{i}": "on" for i in range(12)}
    ext.update({MC + "RadioList": "RadioAbast", MC + "list_abast": "Municipis", MC + "items_seg_sel": sel_seg, MC + "var_sel": var_sel,
                MC + "chk_detall_biblio": "on", MC + "Button_Submit_Top": "Envia"})
    t = post(t, ext)
    enl = sorted(set(re.findall(r'(?:href|action)="([^"]+)"', t)))
    log.append("  enlaces resultado: " + " ".join(enl[:60]))
    log.append("  inputs resultado: " + " ".join(sorted(set(re.findall(r'<input[^>]*name="([^"]+)"[^>]*type="submit"|<input[^>]*type="submit"[^>]*name="([^"]+)"', t).__str__()[:1500].split()))))


def idescat():
    for nom, u in {"idescat_cultu.html": "https://www.idescat.cat/tema/cultu?lang=ca",
                   "idescat_aec_cultura.html": "https://www.idescat.cat/indicadors/?id=aec&t=cultu&lang=ca",
                   "idescat_emex_cultura.html": "https://www.idescat.cat/emex/?id=170792&lang=ca#h4000"}.items():
        r = get(u)
        if r is not None:
            (OUT / nom).write_text(r.text, encoding="utf-8")
            enl = sorted(set(re.findall(r'href="([^"]*(?:aec|n=)[^"]*)"', r.text)))
            log.append(f"  enlaces {nom}: " + " ".join(enl[:150]))


if __name__ == "__main__":
    for f in OUT.glob("*.html"):
        f.unlink()
    socrata()
    idescat()
    dadesbib()
    (OUT / "log.txt").write_text("\n".join(log), encoding="utf-8")
    print("\n".join(log))
