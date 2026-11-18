"""Exploración puntual: tablas del INE e Idescat de nacimientos, defunciones, causas de muerte y nombres.

Escribe exploracion/ine/*.  Uso temporal desde explorar.yml.
"""
import json
import pathlib
import re
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent.parent))
from fuentes.comun import get  # noqa: E402

S = pathlib.Path("exploracion/ine")
S.mkdir(parents=True, exist_ok=True)
INE = "https://servicios.ine.es/wstempus/js/ES"
inf = []


def guarda(nom, txt):
    (S / nom).write_text(txt[:400_000] if isinstance(txt, str) else json.dumps(txt, ensure_ascii=False, indent=1)[:400_000], encoding="utf-8")


def prova(nom, url, **kw):
    try:
        r = get(url, timeout=kw.pop("timeout", 180), reintentos=2, **kw)
        guarda(nom, r.text)
        inf.append(f"OK {nom} {len(r.content)} {url}")
        return r
    except Exception as e:  # noqa: BLE001
        inf.append(f"ERROR {nom} {e} {url}")
        return None


# 1. Operaciones del INE que interesan
r = prova("operaciones.json", f"{INE}/OPERACIONES_DISPONIBLES")
ops = []
if r:
    for o in r.json():
        if re.search(r"Nacimient|Defunci|Movimiento Natural|Nombre|Matrimon|Mortal|Causa|Fenómenos Demogr|Indicadores Demogr|Morbilidad", o.get("Nombre", ""), re.I):
            ops.append(o)
guarda("ops_interes.json", ops)
for o in ops:
    cod = o.get("Codigo") or o.get("Id")
    r = prova(f"tablas_{o['Id']}.json", f"{INE}/TABLAS_OPERACION/{o['Id']}")
    if not r:
        continue
    try:
        ts = r.json()
    except Exception:  # noqa: BLE001
        continue
    inf.append(f"  op {o['Id']} {cod} {o['Nombre']}: {len(ts)} tablas")
    for t in ts:
        n = t.get("Nombre", "")
        inf.append(f"    {t['Id']} | {n}")
    # muestra de series de las tablas provinciales/municipales
    for t in ts:
        n = t.get("Nombre", "")
        if re.search(r"provincia|municipi|Girona|Gerona|capital", n, re.I):
            prova(f"series_{t['Id']}.json", f"{INE}/SERIES_TABLA/{t['Id']}?page=1", timeout=120)

# 2. Nombres de recién nacidos (INE): página de la operación y enlaces a ficheros
for nom, url in {
    "nombres_ine_pag.html": "https://www.ine.es/dyngs/INEbase/es/operacion.htm?c=Estadistica_C&cid=1254736177009&menu=resultados&idp=1254734710990",
    "nombres_ine_widget.html": "https://www.ine.es/widgets/nombApell/index.shtml",
    "nombres_ine_daco.html": "https://www.ine.es/daco/daco42/nombyapel/nombyapel.htm",
}.items():
    r = prova(nom, url)
    if r:
        for l in sorted(set(re.findall(r'href="([^"]+\.(?:xlsx?|csv|zip|htm[l]?)[^"]*)"', r.text))):
            if re.search(r"nomb|nacid|recien", l, re.I):
                inf.append(f"    enlace {l}")

# 3. Idescat: onomástica y tablas v2 (naixements, defuncions)
IDC = "https://api.idescat.cat"
prova("idescat_onom_doc.html", "https://www.idescat.cat/dev/api/onomastica/")
for nom, url in {
    "idescat_onom_nadons_ca.json": f"{IDC}/onomastica/v1/nadons/dades.json?lang=ca",
    "idescat_onom_nadons_sug.json": f"{IDC}/onomastica/v1/nadons/sug.json?q=Marti&lang=ca",
    "idescat_onom_cerca.json": f"{IDC}/onomastica/v1/cerca.json?q=Marti&lang=ca",
    "idescat_taules.json": f"{IDC}/taules/v2?lang=ca",
}.items():
    prova(nom, url)
r = prova("idescat_taules_list.json", f"{IDC}/taules/v2?lang=ca")
if r:
    try:
        d = r.json()
        txt = json.dumps(d, ensure_ascii=False)
        for m in sorted(set(re.findall(r'"label":\s*"([^"]*)"[^}]*?"href":\s*"([^"]*)"', txt))):
            inf.append(f"    idescat {m[0]} {m[1]}")
    except Exception as e:  # noqa: BLE001
        inf.append(f"idescat parse {e}")
for st in ("naix", "def", "mort", "cmort", "onom", "noms", "mnp"):
    prova(f"idescat_taules_{st}.json", f"{IDC}/taules/v2/{st}?lang=ca")

# 4. Registre de mortalitat (Salut) en Socrata
SOC = "https://analisi.transparenciacatalunya.cat/api/catalog/v1"
for q in ("mortalitat", "defuncions", "naixements", "noms nadons", "causa de mort"):
    r = prova(f"socrata_{q.replace(' ', '_')}.json", f"{SOC}?q={q}&limit=40")
    if r:
        for x in r.json().get("results", []):
            res = x.get("resource", {})
            inf.append(f"    socrata[{q}] {res.get('id')} | {res.get('name')} | {res.get('updatedAt', '')[:10]}")

(S / "informe.txt").write_text("\n".join(inf), encoding="utf-8")
print("\n".join(inf))
