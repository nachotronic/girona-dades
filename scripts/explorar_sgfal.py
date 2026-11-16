"""Exploración temporal de SGFAL Consulta de tipos (Hacienda)."""
import pathlib, re, requests
from bs4 import BeautifulSoup
from urllib.parse import urljoin

S = pathlib.Path("exploracion/sgfal"); S.mkdir(parents=True, exist_ok=True)
URL = "https://serviciostelematicosext.hacienda.gob.es/SGFAL/ConsultaTipos/aspx/listado_municipiosm.aspx"
ses = requests.Session(); ses.headers["User-Agent"] = "Mozilla/5.0 girona-dades"
log = []

def campos(html):
    soup = BeautifulSoup(html, "html.parser")
    d = {}
    for i in soup.select("input"):
        if i.get("name") and i.get("type", "text") in ("hidden", "text"):
            d[i["name"]] = i.get("value", "")
    for s in soup.select("select"):
        o = s.find("option", selected=True) or s.find("option")
        if s.get("name") and o: d[s["name"]] = o.get("value", "")
    return soup, d

r = ses.get(URL, timeout=60); log.append(f"GET {r.status_code} {len(r.text)}")
(S / "0_get.html").write_text(r.text, encoding="utf-8")
soup, d = campos(r.text)
for s in soup.select("select"):
    log.append(f"SELECT {s.get('name')} id={s.get('id')} onchange={s.get('onchange')} n={len(s.find_all('option'))}")
for i in soup.select("input"):
    log.append(f"INPUT {i.get('type')} {i.get('name')} = {str(i.get('value',''))[:60]}")
for a in soup.select("a"):
    log.append(f"A {a.get('id')} href={a.get('href')} onclick={a.get('onclick')} :: {a.get_text(strip=True)[:60]}")
sel = [s.get("name") for s in soup.select("select")]
prov = next((n for n in sel if "rov" in (n or "")), sel[0] if sel else None)
if prov:
    d2 = dict(d); d2[prov] = "17"; d2["__EVENTTARGET"] = prov; d2["__EVENTARGUMENT"] = ""
    r2 = ses.post(URL, data=d2, timeout=60); log.append(f"POST prov {r2.status_code} {len(r2.text)}")
    (S / "1_prov17.html").write_text(r2.text, encoding="utf-8")
    soup2, d3 = campos(r2.text)
    for a in soup2.select("a"):
        if a.get("href") or a.get("onclick"):
            log.append(f"A2 {a.get('id')} href={a.get('href')} :: {a.get_text(strip=True)[:60]}")
    # intenta los enlaces Excel (postback)
    for k, a in enumerate(soup2.select("a")):
        h = a.get("href") or ""
        m = re.search(r"__doPostBack\('([^']+)'", h)
        if "xcel" in a.get_text() or "xls" in h.lower():
            d4 = dict(d3); d4[prov] = "17"
            if m: d4["__EVENTTARGET"] = m.group(1); d4["__EVENTARGUMENT"] = ""
            try:
                r4 = ses.post(URL, data=d4, timeout=120) if m else ses.get(urljoin(URL, h), timeout=120)
                log.append(f"EXCEL{k} {r4.status_code} {r4.headers.get('content-type')} {r4.headers.get('content-disposition')} {len(r4.content)}")
                (S / f"2_excel{k}.bin").write_bytes(r4.content[:3_000_000])
            except Exception as e: log.append(f"EXCEL{k} err {e}")
    # consulta un municipio (Girona) para ver resultado
    mun = next((n for n in [s.get("name") for s in soup2.select("select")] if "un" in (n or "")), None)
    if mun:
        s = soup2.find("select", attrs={"name": mun})
        opts = [(o.get("value"), o.get_text(strip=True)) for o in s.find_all("option")]
        log.append(f"MUNIS {len(opts)} {opts[:5]}")
        g = next((v for v, t in opts if "Girona" in t), opts[0][0])
        d5 = dict(d3); d5[prov] = "17"; d5[mun] = g
        for b in soup2.select("input[type=submit],input[type=image]"):
            d5[b.get("name")] = b.get("value", "x"); log.append(f"SUBMIT {b.get('name')}")
            break
        d5.pop("__EVENTTARGET", None)
        r5 = ses.post(URL, data=d5, timeout=60); log.append(f"POST mun {r5.status_code} {r5.url} {len(r5.text)}")
        (S / "3_girona.html").write_text(r5.text, encoding="utf-8")
(S / "log.txt").write_text("\n".join(log), encoding="utf-8")
print("\n".join(log))
