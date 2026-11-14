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
E = "https://www.idescat.cat/pub/?id=emouniv"
for n in ("8815", "8816", "8817", "10768"):
    CANDIDATAS[f"emouniv_{n}"] = f"{E}&n={n}&lang=ca"
    CANDIDATAS[f"emouniv_{n}_mun"] = f"{E}&n={n}&geo=mun:170792&lang=ca"
    CANDIDATAS[f"emouniv_{n}_ssv"] = f"{E}&n={n}&geo=mun:170792&lang=ca&f=ssv"
CANDIDATAS["emouniv_8816_com"] = f"{E}&n=8816&geo=com:20&lang=ca&f=ssv"
CANDIDATAS["emouniv_8816_prov"] = f"{E}&n=8816&geo=prov:17&lang=ca&f=ssv"
CANDIDATAS["emouniv_8816_csv"] = f"{E}&n=8816&geo=mun:170792&lang=ca&f=csv"
CANDIDATAS["emoesc_main"] = "https://www.idescat.cat/pub/?id=emoesc&lang=ca"
CANDIDATAS["ine_series_33790"] = "https://servicios.ine.es/wstempus/js/ES/SERIES_TABLA/33790?page=1"
CANDIDATAS["ine_datos_33790_am"] = "https://servicios.ine.es/wstempus/js/ES/DATOS_TABLA/33790?nult=1&tip=AM"

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
