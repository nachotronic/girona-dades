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
CANDIDATAS["idescat_mobilitat"] = "https://www.idescat.cat/mobilitat/?n=2&lang=ca"
CANDIDATAS["idescat_mobilitat_univ"] = "https://www.idescat.cat/mobilitat/?n=2&t=2024&tipus=univ&geo=mun:170792&lang=ca"
CANDIDATAS["emouniv_8817_prov"] = "https://www.idescat.cat/pub/?id=emouniv&n=8817&geo=prov:17&lang=ca&f=ssv"
CANDIDATAS["emouniv_8815_prov"] = "https://www.idescat.cat/pub/?id=emouniv&n=8815&geo=prov:17&lang=ca&f=ssv"
CANDIDATAS["emouniv_8816_cat"] = "https://www.idescat.cat/pub/?id=emouniv&n=8816&lang=ca&f=ssv"
CANDIDATAS["emouniv_8816_figueres"] = "https://www.idescat.cat/pub/?id=emouniv&n=8816&geo=mun:170669&lang=ca&f=ssv"
CANDIDATAS["emouniv_8816_mun_tot"] = "https://www.idescat.cat/pub/?id=emouniv&n=8816&geo=mun&lang=ca&f=ssv"
CANDIDATAS["idescat_aec_univ"] = "https://www.idescat.cat/indicadors/?id=aec&n=15979&lang=ca"
CANDIDATAS["idescat_mob_api"] = "https://api.idescat.cat/taules/v2?lang=ca&search=mobilitat"

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
