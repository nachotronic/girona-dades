"""Prueba las URLs candidatas de cada fuente y guarda una muestra de la respuesta.

Se ejecuta en GitHub Actions (workflow explorar.yml). Escribe:
  exploracion/informe.md        tabla con estado HTTP, tipo y tamaño
  exploracion/muestras/<id>.*   primeros 150 KB de cada respuesta
"""
import pathlib
import time
import urllib.parse

import requests

SALIDA = pathlib.Path("exploracion")
MUESTRAS = SALIDA / "muestras"
LIMITE = 150_000
UA = {"User-Agent": "girona-dades/0.1 (+https://github.com/nachotronic/girona-dades)"}

SOCRATA = "https://analisi.transparenciacatalunya.cat/api/catalog/v1"
TERMINOS_SOCRATA = [
    "lloguer", "fiances", "compravendes habitatges", "habitatges d'ús turístic",
    "sol·licitants habitatge protecció oficial", "atur registrat municipis",
    "llistes d'espera", "estacions meteorològiques", "qualitat de l'aire",
    "residus municipals", "consum elèctric municipis", "centres educatius",
    "fets penals", "renda garantida", "establiments turístics",
]

CANDIDATAS = {}
# Coyuntura, segunda ronda (3)
IDC = "https://api.idescat.cat/taules/v2"
CANDIDATAS["idescat_afi_8703"] = f"{IDC}/afi/8603/8703?lang=ca"
CANDIDATAS["idescat_afi_8703_mun"] = f"{IDC}/afi/8603/8703/mun?lang=ca"
CANDIDATAS["idescat_afi_8703_data"] = f"{IDC}/afi/8603/8703/mun/data?lang=ca&MUN=170792"
CANDIDATAS["idescat_afi_8702_data"] = f"{IDC}/afi/8602/8702/mun/data?lang=ca&MUN=170792"
CANDIDATAS["idescat_afic_14995"] = f"{IDC}/afic/14995?lang=ca"
INE = "https://servicios.ine.es/wstempus/js/ES"
CANDIDATAS["ine_6295"] = f"{INE}/DATOS_TABLA/6295?nult=3"
CSV = "https://www.ine.es/jaxiT3/files/t/es/csv_bdsc/{}.csv"
for t in ("52048", "53463", "53464", "52047", "59060"):
    CANDIDATAS[f"inecsv_{t}"] = CSV.format(t)
CANDIDATAS["aena_2026"] = "https://www.aena.es/es/estadisticas/informes-mensuales.html?anio=2026"

# Eleccions: resultats per mesa (Interior) i Parlament (Generalitat)
INTERIOR = "https://infoelectoral.interior.gob.es/estaticos/docxl/apliextr/"
ZIPS = {f"int_{t}{f}": f"{INTERIOR}{t}{f}_MESA.zip" for t, f in (
    ("02", "202307"), ("02", "201911"), ("04", "202305"), ("07", "202406"))}
CANDIDATAS_E = {}
SOC = "https://analisi.transparenciacatalunya.cat"
for d in ("ntc4-rnwr", "irrv-2mfc", "tgns-3xuy"):
    CANDIDATAS_E[f"pe_{d}_meta"] = f"{SOC}/api/views/{d}.json"
    CANDIDATAS_E[f"pe_{d}_mostra"] = f"{SOC}/resource/{d}.json?$limit=30"
CANDIDATAS_E["pe_tgns_tot"] = f"{SOC}/resource/tgns-3xuy.json?$limit=5000"

# Parque de vehículos por municipio (DGT): explora_parque() recorre las categorías de
# «DGT en cifras», entra en las fichas de parque/municipios y prueba sus descargas
DGT = "https://www.dgt.es"
DGTR = DGT + "/menusecundario/dgt-en-cifras/dgt-en-cifras-resultados/"
CANDIDATAS_E = {}
INICI_DGT = [DGTR + f"?categorias=/Tema/{t}/" + (f"&pagina={n}" if n > 1 else "") for t in ("Informacion-municipal", "Vehiculos") for n in (1, 2, 3)]

# Mapa urbanístic de Catalunya: serveis web i descàrrega
CANDIDATAS_E["muc_meta"] = f"{SOC}/api/views/magm-wuv7.json"
CANDIDATAS_E["muc_sect_meta"] = f"{SOC}/api/views/7u3t-vi7t.json"
CANDIDATAS_E["muc_qgtr_meta"] = f"{SOC}/api/views/qgtr-hfva.json"
for k, u in {"sig_wfs": "https://sig.gencat.cat/ows/PLANEJAMENT/wfs?service=WFS&request=GetCapabilities",
             "sig_wms": "https://sig.gencat.cat/ows/PLANEJAMENT/wms?service=WMS&request=GetCapabilities",
             "sig_wfs2": "https://sig.gencat.cat/ows/URBANISME/wfs?service=WFS&request=GetCapabilities",
             "ptop_wfs": "https://ptop.gencat.cat/geoserver/ows?service=WFS&request=GetCapabilities",
             "muc_robots": "https://territori.gencat.cat/robots.txt",
             "sig_robots": "https://sig.gencat.cat/robots.txt"}.items():
    CANDIDATAS_E[k] = u

def explora_parque(filas: list) -> None:
    import re
    vistos, fitxers = set(), []
    pendientes = [(f"dgt_cat{k}", u) for k, u in enumerate(INICI_DGT)]
    n = 0
    while pendientes and n < 60:
        clave, url = pendientes.pop(0)
        if url in vistos:
            continue
        vistos.add(url)
        try:
            r = requests.get(url, headers=UA, timeout=180)
            n += 1
        except Exception as e:  # noqa: BLE001
            filas.append(f"| {clave} | error | {type(e).__name__} | | {url} |")
            continue
        tipo = r.headers.get("content-type", "")
        filas.append(f"| {clave} | {r.status_code} | {tipo.split(';')[0]} | {len(r.content)} | {r.url} |")
        if "html" not in tipo:
            ext = url.rsplit(".", 1)[-1][:5].lower()
            (MUESTRAS / f"{clave}.{ext}").write_bytes(r.content[:8_000_000])
            continue
        (MUESTRAS / f"{clave}.html").write_bytes(r.content[:400_000])
        for href in sorted(set(re.findall(r'href="([^"#]+)"', r.text))):
            absu = urllib.parse.urljoin(r.url, href.replace("&amp;", "&"))
            low = absu.lower()
            if "dgt.es" not in low or absu in vistos:
                continue
            clau = ("parque", "municip", "censo", "matraba", "microdato")
            if "dgt-en-cifras-detalle" in low and any(k in low for k in clau):
                pendientes.insert(0, (f"dgt_d{len(vistos):02d}", absu))
            elif low.endswith((".xlsx", ".xls", ".zip", ".csv")) and any(k in low for k in clau + ("parq", "vehic")):
                fitxers.append(absu)
                if sum(1 for f in fitxers if f.rsplit(".", 1)[-1] == absu.rsplit(".", 1)[-1]) <= 6:
                    pendientes.append((f"dgt_f{len(fitxers):02d}", absu))
        time.sleep(1)
    (MUESTRAS / "dgt_enllacos.txt").write_text("\n".join(sorted(vistos)) + "\n\n--- fitxers ---\n" + "\n".join(fitxers), encoding="utf-8")


def explora_zips(filas: list) -> None:
    import io, zipfile
    for clave, url in ZIPS.items():
        try:
            r = requests.get(url, headers=UA, timeout=300)
            filas.append(f"| {clave} | {r.status_code} | {r.headers.get('content-type','')} | {len(r.content)} | {r.url} |")
            if r.status_code != 200:
                continue
            z = zipfile.ZipFile(io.BytesIO(r.content))
            info = []
            for n in z.namelist():
                datos = z.read(n)
                info.append(f"{n}\t{len(datos)}")
                lineas = datos.decode("latin-1").splitlines()
                gir = [l for l in lineas if "17" in l[9:20]][:300]
                (MUESTRAS / f"{clave}_{n}.txt").write_text("\n".join(lineas[:40] + ["--- 17 ---"] + gir), encoding="utf-8")
            (MUESTRAS / f"{clave}_LISTA.txt").write_text("\n".join(info), encoding="utf-8")
        except Exception as e:  # noqa: BLE001
            filas.append(f"| {clave} | error | {type(e).__name__}: {str(e)[:80]} | | {url} |")


def extension(tipo: str) -> str:
    tipo = tipo.lower()
    for clave, ext in (("excel", "xls"), ("json", "json"), ("xml", "xml"), ("html", "html"), ("csv", "csv")):
        if clave in tipo:
            return ext
    return "txt"


def main() -> None:
    MUESTRAS.mkdir(parents=True, exist_ok=True)
    filas = ["| id | estado | tipo | tamaño | url final |", "| --- | --- | --- | --- | --- |"]
    for clave, url in CANDIDATAS_E.items():
        try:
            if url.endswith(".zip"):
                import io, zipfile
                r = requests.get(url, headers=UA, timeout=300)
                z = zipfile.ZipFile(io.BytesIO(r.content))
                txt = []
                for n in z.namelist():
                    with z.open(n) as fz:
                        txt.append(f"== {n} ({z.getinfo(n).file_size} bytes)")
                        for _ in range(25):
                            txt.append(fz.readline().decode("latin-1").rstrip("\r\n"))
                (MUESTRAS / f"{clave}.txt").write_text("\n".join(txt), encoding="utf-8")
                filas.append(f"| {clave} | {r.status_code} | zip | {len(r.content)} | {url} |")
                continue
            r = requests.get(url, headers=UA, timeout=120, stream=True)
            contenido = r.raw.read(LIMITE * 20 if clave.startswith(("ine_", "idescat_", "socrata_", "aena_", "dgt_")) else LIMITE, decode_content=True)
            tipo = r.headers.get("content-type", "")
            (MUESTRAS / f"{clave}.{extension(tipo)}").write_bytes(contenido)
            filas.append(f"| {clave} | {r.status_code} | {tipo.split(';')[0]} | {r.headers.get('content-length', len(contenido))} | {r.url} |")
        except Exception as e:  # noqa: BLE001 - queremos registrar cualquier fallo
            filas.append(f"| {clave} | error | {type(e).__name__}: {str(e)[:80]} | | {url} |")
        time.sleep(1)
    (SALIDA / "informe.md").write_text("# Exploración de fuentes\n\n" + "\n".join(filas) + "\n", encoding="utf-8")
    print("\n".join(filas))


if __name__ == "__main__":
    main()
