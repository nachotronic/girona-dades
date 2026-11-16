"""Exploración puntual (2.ª ronda): CGPJ PC-Axis, crisis, Interior, Mossos, partidos judiciales."""
import io
import json
import pathlib
import re
import traceback
import urllib.parse
import zipfile

import pandas as pd
import requests

S = pathlib.Path("exploracion/justicia2")
S.mkdir(parents=True, exist_ok=True)
UA = {"User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36"}
GIR = re.compile(r"girona|figueres|blanes|olot|puigcerd|bisbal|coloma de farners|ripoll|feliu de gu|lloret|\bsalt\b|catalu|total|espa", re.I)
LOG = []


def get(url, **kw):
    r = requests.get(url, headers=UA, timeout=kw.pop("timeout", 300), **kw)
    LOG.append(f"{r.status_code} {r.headers.get('content-type','')} {len(r.content)} {url}")
    return r


def enc(u):
    p = urllib.parse.urlsplit(u)
    return urllib.parse.urlunsplit((p.scheme, p.netloc, urllib.parse.quote(p.path), p.query, ""))


def dump_xlsx(nombre, contenido, cab=16):
    out = []
    try:
        xl = pd.ExcelFile(io.BytesIO(contenido))
        for sh in xl.sheet_names:
            df = xl.parse(sh, header=None, dtype=str)
            out.append(f"===== hoja {sh} {df.shape}")
            for i, row in df.head(cab).iterrows():
                vals = ["" if pd.isna(x) else str(x)[:40] for x in row.values[:40]]
                if any(vals):
                    out.append(f"{i}: " + " | ".join(vals))
            for i, row in df.iterrows():
                t = " ".join(str(x) for x in row.values[:4] if not pd.isna(x))
                if GIR.search(t) and i >= cab:
                    out.append(f"{i}* " + " | ".join("" if pd.isna(x) else str(x)[:30] for x in row.values[:40]))
    except Exception as e:  # noqa: BLE001
        out.append(f"ERROR {e}")
    (S / f"{nombre}.txt").write_text("\n".join(out[:6000]), encoding="utf-8")


def paso(f):
    try:
        f()
    except Exception:  # noqa: BLE001
        LOG.append(f"FALLO {f.__name__}: {traceback.format_exc()[-800:]}")


CG = "https://www.poderjudicial.es"


def crisis():
    base = CG + "/stfls/ESTADISTICA/FICHEROS/Crisis/"
    for i, n in enumerate(("Datos sobre el efecto de la crisis en los organos judiciales - Anual 2025.xlsx",
                           "Series - Efecto de la crisis en los organos judiciales por provincias 2T-2026.xlsx",
                           "Datos sobre el efecto de la crisis en los organos judiciales 2T-2026- con Microempresas.xlsx")):
        r = get(enc(base + n))
        if r.ok:
            dump_xlsx(f"crisis_{i}", r.content)


def vdg_anual():
    for u in ("La-violencia-sobre-la-mujer-en-la-estadistica-judicial---Anual-2025",
              "La-violencia-sobre-la-mujer-en-la-estadistica-judicial---Anual-2024",
              "La-violencia-sobre-la-mujer-en-la-estadistica-judicial--Primer-trimestre-de-2026",
              "La-violencia-sobre-la-mujer-en-la-estadistica-judicial--Tercer-Trimestre-de-2025",
              "La-violencia-sobre-la-mujer-en-la-estadistica-judicial--Primer-Trimestre-de-2024",
              "La-violencia-sobre-la-mujer-en-la-estadistica-judicial--Primer-trimestre-de-2020"):
        r = get(CG + "/cgpj/es/Temas/Violencia-domestica-y-de-genero/Actividad-del-Observatorio/Datos-estadisticos/" + u)
        links = re.findall(r'href="([^"]+\.xlsx?)[^"]*"', r.text)
        (S / f"vdg_{u[-22:]}.txt").write_text("\n".join(links), encoding="utf-8")


def pcaxis():
    r = get("https://www5.poderjudicial.es/estad/BOL19952025.zip", timeout=900)
    z = zipfile.ZipFile(io.BytesIO(r.content))
    titulos, valores = [], []
    for n in z.namelist():
        if n.lower().endswith(".px"):
            with z.open(n) as f:
                cab = b""
                while b"DATA=" not in cab and len(cab) < 3_000_000:
                    trozo = f.read(65536)
                    if not trozo:
                        break
                    cab += trozo
            cab = cab.split(b"DATA=")[0].decode("latin-1")
            t = re.search(r'TITLE=(".*?");', cab, re.S)
            titulos.append(f"{n}\t{z.getinfo(n).file_size}\t{re.sub(r'\s+', ' ', t.group(1)) if t else ''}")
            proc = re.search(r'VALUES\("PROCEDIMIENTOS"\)=(.*?);', cab, re.S)
            sit = re.search(r'VALUES\("SITUACION"\)=(.*?);', cab, re.S)
            org = re.search(r'VALUES\("ORGJUD"\)=(.*?);', cab, re.S)
            orgs = re.findall(r'"([^"]+)"', org.group(1)) if org else []
            gi = [o for o in orgs if GIR.search(o) and "TOTAL" not in o.upper()]
            valores.append(f"===== {n} {t.group(1)[:120] if t else ''}\nPROC: {re.sub(r'\s+', ' ', proc.group(1))[:2500] if proc else ''}\n"
                           f"SIT: {re.sub(r'\s+', ' ', sit.group(1))[:1500] if sit else ''}\nORG Girona ({len(orgs)}): {gi[:60]}")
    (S / "px_titulos.txt").write_text("\n".join(titulos), encoding="utf-8")
    (S / "px_valores.txt").write_text("\n".join(valores), encoding="utf-8")
    out = []
    for n in z.namelist():
        if "/class/" in n and re.search(r"PJUD(J1IIT|JIT|JP|AP)\.AGG|OJJ1IIT\.vs$", n, re.I):
            txt = z.read(n).decode("latin-1")
            lin = txt.splitlines()
            out.append(f"===== {n}\n" + "\n".join(lin[:40]) + "\n--- Girona ---\n" + "\n".join(l for l in lin if GIR.search(l))[:6000])
    (S / "px_agg.txt").write_text("\n".join(out), encoding="utf-8")


MIR = "https://estadisticasdecriminalidad.ses.mir.es"


def interior():
    for p in ("DatosBalanceAnt/20254/", "DatosBalanceAnt/20184/"):
        r = get(MIR + f"/sec/dynPx/inebase/index.htm?type=pcaxis&path=/{p}&file=pcaxis")
        (S / f"mir_index_{p[-6:-1]}.txt").write_text("\n".join(re.findall(r'Tabla\.htm[^"]*"[^>]*>[^<]*', r.text)), encoding="utf-8")
    for path, f in (("DatosBalanceAct", "09006"), ("DatosBalanceAct", "09005"), ("DatosBalanceAnt", "1509012")):
        r = get(MIR + f"/sec/jaxiPx/files/_px/es/csv_bdsc/{path}/l0/{f}.csv_bdsc?nocab=1")
        lin = r.content.decode("utf-8", "replace").splitlines()
        (S / f"mir_{f}.txt").write_text("\n".join(lin[:30] + ["---"] + [l for l in lin if GIR.search(l)][:600]), encoding="utf-8")


SOC = "https://analisi.transparenciacatalunya.cat"


def mossos():
    q = {"$select": "tipus_de_fet, t_tol_codi_penal, sum(coneguts) as n", "$where": "regi_policial_rp like '%Girona%' and any='2025'",
         "$group": "tipus_de_fet, t_tol_codi_penal", "$order": "n desc", "$limit": "500"}
    r = get(f"{SOC}/resource/qnyt-emjc.json?" + urllib.parse.urlencode(q))
    (S / "mossos_tipus.json").write_text(r.text, encoding="utf-8")
    q = {"$select": "any, max(mes) as m", "$group": "any", "$order": "any"}
    r = get(f"{SOC}/resource/qnyt-emjc.json?" + urllib.parse.urlencode(q))
    (S / "mossos_anys.json").write_text(r.text, encoding="utf-8")
    for d in ("q5uj-pxxf", "3qwi-5fut", "cijc-mfrv", "y48r-ae59"):
        r = get(f"{SOC}/api/views/{d}.json")
        try:
            m = r.json()
            (S / f"meta_{d}.txt").write_text(m.get("name", "") + "\n" + m.get("description", "")[:1500] + "\n" +
                                             "\n".join(f"{c['fieldName']} | {c['name']}" for c in m.get("columns", [])), encoding="utf-8")
        except Exception:  # noqa: BLE001
            pass
        r = get(f"{SOC}/resource/{d}.json?$limit=8")
        (S / f"mostra_{d}.json").write_text(r.text[:30000], encoding="utf-8")
    for term in ("partit judicial", "partits judicials", "jutjats"):
        r = get(f"{SOC}/api/catalog/v1?" + urllib.parse.urlencode({"q": term, "limit": 30, "domains": "analisi.transparenciacatalunya.cat"}))
        try:
            (S / f"cat_{term.replace(' ', '_')}.txt").write_text("\n".join(f"{x['resource']['id']} {x['resource']['name']}" for x in r.json()["results"]), encoding="utf-8")
        except Exception:  # noqa: BLE001
            pass


def idescat():
    out = []
    for n in range(1, 130):
        try:
            r = requests.get(f"https://www.idescat.cat/codis/?id=50&n={n}&f=ssv", headers=UA, timeout=30)
            out.append(f"{n}\t{r.status_code}\t{r.content[:300].decode('utf-8', 'replace').splitlines()[:3]}")
        except Exception as e:  # noqa: BLE001
            out.append(f"{n}\terror {e}")
    (S / "idescat_codis.txt").write_text("\n".join(out), encoding="utf-8")


for f in (interior, crisis, vdg_anual, mossos, idescat, pcaxis):
    paso(f)
(S / "log.txt").write_text("\n".join(LOG), encoding="utf-8")
print("\n".join(LOG))
