"""Exploración puntual: CGPJ, Interior (Balance de Criminalidad), INE condenados, Mossos.

Escribe exploracion/justicia/*.txt con lo que encuentra (cabeceras, filas de Girona).
"""
import io
import pathlib
import re
import traceback
import urllib.parse
import zipfile

import pandas as pd
import requests

S = pathlib.Path("exploracion/justicia")
S.mkdir(parents=True, exist_ok=True)
UA = {"User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36"}
GIR = re.compile(r"girona|figueres|blanes|olot|puigcerd|bisbal|coloma de farners|ripoll|feliu de gu|lloret|salt\b|catalu|total|espa", re.I)
LOG = []


def get(url, **kw):
    r = requests.get(url, headers=UA, timeout=kw.pop("timeout", 300), **kw)
    LOG.append(f"{r.status_code} {r.headers.get('content-type','')} {len(r.content)} {url}")
    return r


def enc(u):
    p = urllib.parse.urlsplit(u)
    return urllib.parse.urlunsplit((p.scheme, p.netloc, urllib.parse.quote(p.path), p.query, ""))


def dump_xlsx(nombre, contenido):
    out = []
    try:
        xl = pd.ExcelFile(io.BytesIO(contenido))
        for sh in xl.sheet_names:
            df = xl.parse(sh, header=None, dtype=str)
            out.append(f"===== hoja {sh} {df.shape}")
            for i, row in df.head(14).iterrows():
                out.append(f"{i}: " + " | ".join("" if pd.isna(x) else str(x)[:40] for x in row.values[:30]))
            for i, row in df.iterrows():
                t = " ".join(str(x) for x in row.values[:4] if not pd.isna(x))
                if GIR.search(t) and i >= 14:
                    out.append(f"{i}* " + " | ".join("" if pd.isna(x) else str(x)[:30] for x in row.values[:30]))
    except Exception as e:  # noqa: BLE001
        out.append(f"ERROR {e}")
    (S / f"{nombre}.txt").write_text("\n".join(out[:4000]), encoding="utf-8")


def pagina(nombre, url, patron=r'href="([^"]+\.(?:xlsx|xls|zip|csv|px|pdf))"'):
    r = get(url)
    (S / f"{nombre}.html").write_text(r.text[:400000], encoding="utf-8")
    links = [urllib.parse.urljoin(url, h) for h in re.findall(patron, r.text, re.I)]
    (S / f"{nombre}_links.txt").write_text("\n".join(links), encoding="utf-8")
    return r.text, links


def paso(f):
    try:
        f()
    except Exception:  # noqa: BLE001
        LOG.append(f"FALLO {f.__name__}: {traceback.format_exc()[-600:]}")


CG = "https://www.poderjudicial.es"


def vdg():
    base = CG + "/stfls/ESTADISTICA/DOCUMENTOSCGPJ/"
    for n in ("Violencia sobre la Mujer Juzgados por Partido Judicial - Cuarto Trimestre 2025.xlsx",
              "Violencia sobre la Mujer Juzgados por Provincias - Cuarto Trimestre 2025.xlsx"):
        r = get(enc(base + n))
        if r.ok:
            dump_xlsx("vdg_" + n.split(" por ")[1][:12].replace(" ", "_"), r.content)
    pagina("vdg_q4_2025", CG + "/cgpj/es/Temas/Violencia-domestica-y-de-genero/Actividad-del-Observatorio/Datos-estadisticos/La-violencia-sobre-la-mujer-en-la-estadistica-judicial--Cuarto-Trimestre-de-2025")
    pagina("vdg_datos", CG + "/cgpj/es/Temas/Violencia-domestica-y-de-genero/Actividad-del-Observatorio/Datos-estadisticos/")


def crisis():
    t, links = pagina("crisis", CG + "/cgpj/es/Temas/Estadistica-Judicial/Estadistica-por-temas/Datos-penales--civiles-y-laborales/Civil-y-laboral/Efecto-de-la-Crisis-en-los-organos-judiciales/")
    for i, l in enumerate([x for x in links if x.lower().endswith((".xlsx", ".xls"))][:4]):
        r = get(enc(l))
        if r.ok:
            dump_xlsx(f"crisis_{i}", r.content)


def otras():
    for nom, u in {
        "datos_justicia": "/cgpj/es/Temas/Estadistica-Judicial/Estudios-e-Informes/Datos-de-Justicia/",
        "dato_a_dato": "/cgpj/es/Temas/Estadistica-Judicial/Estudios-e-Informes/Justicia-Dato-a-Dato/",
        "penales": "/cgpj/es/Temas/Estadistica-Judicial/Estadistica-por-temas/Datos-penales--civiles-y-laborales/",
        "demarcaciones": "/cgpj/es/Temas/Estadistica-Judicial/Estadistica-por-temas/Informacion-socioeconomica-relacionada-con-la-Administracion-de-Justicia/Sistema-de-Informacion-Socioeconomica-de-las-demarcaciones-judiciales/",
    }.items():
        t, links = pagina(nom, CG + u)
        sub = sorted(set(urllib.parse.urljoin(CG + u, h) for h in re.findall(r'href="(/cgpj/es/Temas/Estadistica-Judicial/[^"#?]+)"', t)))
        (S / f"{nom}_sub.txt").write_text("\n".join(sub), encoding="utf-8")
        for i, l in enumerate([x for x in links if x.lower().endswith((".xlsx", ".xls"))][:3]):
            r = get(enc(l))
            if r.ok:
                dump_xlsx(f"{nom}_{i}", r.content)


def pcaxis_zip():
    r = get("https://www5.poderjudicial.es/estad/BOL19952025.zip", timeout=900)
    z = zipfile.ZipFile(io.BytesIO(r.content))
    nombres = z.namelist()
    (S / "pcaxis_lista.txt").write_text("\n".join(f"{n}\t{z.getinfo(n).file_size}" for n in nombres), encoding="utf-8")
    vistos, out = set(), []
    for n in nombres:
        clave = re.sub(r"\d+", "#", n)
        if clave in vistos or not n.lower().endswith(".px"):
            continue
        vistos.add(clave)
        txt = z.read(n).decode("latin-1")
        cab = txt.split("DATA=")[0]
        out.append(f"===== {n}\n{cab[:3000]}")
    (S / "pcaxis_cabeceras.txt").write_text("\n".join(out[:300]), encoding="utf-8")


def pxweb():
    base = "https://www6.poderjudicial.es/PxWeb-2025-v1/"
    for u in ("api/v1/es/", "api/v1/es/10 Juzgados de Primera Instancia e Instrucción/",
              "pxweb/es/10 Juzgados de Primera Instancia e Instrucción/"):
        r = get(enc(base + u))
        (S / f"pxweb_{len(u)}.txt").write_text(r.text[:100000], encoding="utf-8")


MIR = "https://estadisticasdecriminalidad.ses.mir.es"


def interior():
    r = get(MIR + "/publico/portalestadistico/balances")
    (S / "mir_balances.html").write_text(r.text[:300000], encoding="utf-8")
    paths = sorted(set(re.findall(r"DatosBalance\w*/\d{5}/", r.text)))
    (S / "mir_paths.txt").write_text("\n".join(paths), encoding="utf-8")
    for p in paths[-2:]:
        r = get(MIR + f"/sec/dynPx/inebase/index.htm?type=pcaxis&path=/{p}&file=pcaxis")
        (S / f"mir_index_{p[-6:-1]}.html").write_text(r.text, encoding="utf-8")
        for f in re.findall(r"(\d{6,8})\.px", r.text)[:3]:
            for v in (f"/sec/jaxiPx/files/_px/es/csv_bdsc/{p.split('/')[0]}/l0/{f}.csv_bdsc?nocab=1",
                      f"/sec/jaxiPx/files/_px/es/csv_bdsc/{p}l0/{f}.csv_bdsc?nocab=1"):
                r2 = get(MIR + v)
                lin = r2.content.decode("utf-8", "replace").splitlines()
                (S / f"mir_{p[-6:-1]}_{f}_{len(v)}.txt").write_text("\n".join(lin[:30] + ["---"] + [l for l in lin if GIR.search(l)][:400]), encoding="utf-8")
    r = get(MIR + "/")
    (S / "mir_root.html").write_text(r.text[:200000], encoding="utf-8")


def ine():
    for op in ("ECA", "ECM", "30471", "22"):
        r = get(f"https://servicios.ine.es/wstempus/js/ES/TABLAS_OPERACION/{op}")
        (S / f"ine_tablas_{op}.json").write_text(r.text[:200000], encoding="utf-8")


def mossos():
    r = get("https://analisi.transparenciacatalunya.cat/api/views/qnyt-emjc.json")
    (S / "mossos_meta.json").write_text(r.text[:200000], encoding="utf-8")
    r = get("https://analisi.transparenciacatalunya.cat/resource/qnyt-emjc.json?$limit=20&$where=" + urllib.parse.quote("regi_policial_rp like '%Girona%'"))
    (S / "mossos_mostra.json").write_text(r.text[:100000], encoding="utf-8")
    r = get("https://analisi.transparenciacatalunya.cat/api/catalog/v1?q=" + urllib.parse.quote("mossos fets penals") + "&limit=40&domains=analisi.transparenciacatalunya.cat")
    (S / "mossos_catalogo.json").write_text(r.text[:200000], encoding="utf-8")


for f in (interior, vdg, crisis, otras, ine, mossos, pxweb, pcaxis_zip):
    paso(f)
(S / "log.txt").write_text("\n".join(LOG), encoding="utf-8")
print("\n".join(LOG))
