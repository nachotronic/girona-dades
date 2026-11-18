"""Exploración puntual (2.ª ronda): Socrata Generalitat, onomástica Idescat, nombres INE y muestras INE de Girona."""
import json
import pathlib
import re
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent.parent))
from fuentes.comun import get  # noqa: E402

S = pathlib.Path("exploracion/ine2")
S.mkdir(parents=True, exist_ok=True)
INE = "https://servicios.ine.es/wstempus/js/ES"
inf = []


def prova(nom, url, lim=200_000, **kw):
    try:
        r = get(url, timeout=kw.pop("timeout", 300), reintentos=2, **kw)
        (S / nom).write_text(r.text[:lim], encoding="utf-8")
        inf.append(f"OK {nom} {len(r.content)} {url}")
        return r
    except Exception as e:  # noqa: BLE001
        inf.append(f"ERROR {nom} {e} {url}")
        return None


SOC = "https://analisi.transparenciacatalunya.cat"
for d in ("38yu-vcnn", "7q2v-xzgx", "yjvj-y978", "tqmi-fkum", "whxh-x66q", "7dt9-azyt", "3cre-fa8v", "5r3k-cykq", "vkds-6sun", "qsc9-9mbi", "5qx5-hkkr"):
    r = prova(f"soc_{d}_meta.json", f"{SOC}/api/views/{d}.json")
    if r:
        m = r.json()
        inf.append(f"  {d} {m.get('name')} | filas? {m.get('rowsUpdatedAt')} | cols: " + ", ".join(c.get("fieldName", "") for c in m.get("columns", [])))
    prova(f"soc_{d}_mostra.json", f"{SOC}/resource/{d}.json?$limit=25")
    # ¿hay datos de Girona?
    prova(f"soc_{d}_girona.json", f"{SOC}/resource/{d}.json?$q=Girona&$limit=25")

IDO = "https://api.idescat.cat/onomastica/v1/nadons"
prova("ido_class.json", f"{IDO}/dades.json?id=40683&class=geo&lang=ca")
prova("ido_class_t.json", f"{IDO}/dades.json?id=40683&class=t&lang=ca")
prova("ido_top_prov17.json", f"{IDO}/cerca.json?orderby=v&desc=1&geo=prov:17&lang=ca")
prova("ido_top_prov17_2015.json", f"{IDO}/cerca.json?orderby=v&desc=1&geo=prov:17&t=2015&lang=ca")
prova("ido_top_sex_prov17.json", f"{IDO}/cerca.json?orderby=sex&desc=1&geo=prov:17&lang=ca")
prova("ido_top_com03.json", f"{IDO}/cerca.json?orderby=v&desc=1&geo=com:03&lang=ca")
prova("ido_maria_prov17.json", f"{IDO}/dades.json?id=MARIA&geo=prov:17&lang=ca")
prova("ido_cerca_p25.json", f"{IDO}/cerca.json?orderby=v&desc=1&geo=prov:17&posicio=25&lang=ca")

r = prova("ine_nombres.html", "https://www.ine.es/dyngs/INEbase/operacion.htm?c=Estadistica_C&cid=1254736177009&menu=ultiDatos&idp=1254735572981")
if r:
    for l in sorted(set(re.findall(r'href="([^"]+)"', r.text))):
        if re.search(r"xls|csv|nombyapel|nacid|recien|jaxi|tpx", l, re.I):
            inf.append(f"    enlace {l}")
prova("ine_nombres_resultados.html", "https://www.ine.es/dyngs/INEbase/operacion.htm?c=Estadistica_C&cid=1254736177009&menu=resultados&idp=1254735572981")
for f in ("ine_nombres_resultados.html",):
    p = S / f
    if p.exists():
        for l in sorted(set(re.findall(r'href="([^"]+)"', p.read_text(encoding="utf-8")))):
            if re.search(r"xls|csv|nombyapel|nacid|recien|jaxi|tpx", l, re.I):
                inf.append(f"    enlace-res {l}")

for t in ("35168", "62278", "46682", "6524", "6561", "6510", "6549", "73037", "1581", "1484"):
    try:
        d = get(f"{INE}/DATOS_TABLA/{t}?nult=3", timeout=600).json()
        g = [s for s in d if re.search(r"Girona|Gerona|Total Nacional|Total nacional|Cataluña", s.get("Nombre", ""))]
        (S / f"ine_{t}.json").write_text(json.dumps(g[:80], ensure_ascii=False, indent=0), encoding="utf-8")
        inf.append(f"OK ine {t}: {len(d)} series, {len(g)} Girona/Cat/Nac; ej: " + " || ".join(s["Nombre"] for s in g[:6]))
    except Exception as e:  # noqa: BLE001
        inf.append(f"ERROR ine {t} {e}")

(S / "informe.txt").write_text("\n".join(inf), encoding="utf-8")
print("\n".join(inf))
