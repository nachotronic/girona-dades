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
S = "https://analisi.transparenciacatalunya.cat"
for _id in ("gspe-4f4s", "8w7y-2bfp", "5kd9-2wex", "um2m-zw96", "jzx6-bqke"):
    CANDIDATAS["meta_" + _id] = f"{S}/api/views/{_id}.json"
    CANDIDATAS["mostra_" + _id] = f"{S}/resource/{_id}.json?$limit=20"
CANDIDATAS["mostra_8w7y_gi"] = S + "/resource/8w7y-2bfp.json?$limit=20&$where=starts_with(codi_resid_ncia_municipi,'17')"
for t in ["mobilitat obligada estudis", "alumnat estranger", "estrangers", "nacionalitat", "universitaris residència"]:
    CANDIDATAS["socrata_" + "".join(c if c.isalnum() else "_" for c in t)[:40]] = SOCRATA + "?" + urllib.parse.urlencode({"q": t, "limit": 25})
CANDIDATAS["idescat_taules"] = "https://api.idescat.cat/taules/v2?lang=ca"
CANDIDATAS["idescat_pmh"] = "https://api.idescat.cat/taules/v2/pmh?lang=ca"
CANDIDATAS["idescat_censph"] = "https://api.idescat.cat/taules/v2/censph?lang=ca"
for _op in ("188", "EPC", "PC", "EM", "CPV2021"):
    CANDIDATAS["ine_ops_" + _op] = f"https://servicios.ine.es/wstempus/js/ES/TABLAS_OPERACION/{_op}"

def extension(tipo: str) -> str:
    tipo = tipo.lower()
    for clave, ext in (("excel", "xls"), ("json", "json"), ("xml", "xml"), ("html", "html"), ("csv", "csv")):
        if clave in tipo:
            return ext
    return "txt"


def main() -> None:
    MUESTRAS.mkdir(parents=True, exist_ok=True)
    filas = ["| id | estado | tipo | tamaño | url final |", "| --- | --- | --- | --- | --- |"]
    for clave, url in CANDIDATAS.items():
        try:
            r = requests.get(url, headers=UA, timeout=120, stream=True)
            contenido = r.raw.read(LIMITE * 20 if clave.startswith("ine_ops_") else LIMITE, decode_content=True)
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
