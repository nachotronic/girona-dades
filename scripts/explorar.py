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
LIMITE = 40_000
UA = {"User-Agent": "girona-dades/0.1 (+https://github.com/nachotronic/girona-dades)"}

SOCRATA = "https://analisi.transparenciacatalunya.cat/api/catalog/v1"
TERMINOS_SOCRATA = [
    "lloguer", "fiances", "compravendes habitatges", "habitatges d'ús turístic",
    "sol·licitants habitatge protecció oficial", "atur registrat municipis",
    "llistes d'espera", "estacions meteorològiques", "qualitat de l'aire",
    "residus municipals", "consum elèctric municipis", "centres educatius",
    "fets penals", "renda garantida", "establiments turístics",
]

CANDIDATAS = {
    "ogc_colecciones": "https://www.ine.es/geoserver/ogc/features/v1/collections?f=json",
    "wfs_secciones_caps": "https://servicios.ine.es/arcgis/services/WFS_INE_SECCIONES_G01/MapServer/WFSServer?service=WFS&request=GetCapabilities",
    "zip_seccionado_2024": "https://www.ine.es/prodyser/cartografia/seccionado_2024.zip",
    "zip_seccionado_2025": "https://www.ine.es/prodyser/cartografia/seccionado_2025.zip",
    "zip_secciones_2024": "https://www.ine.es/prodyser/cartografia/secciones_2024.zip",
    "pagina_cartografia": "https://www.ine.es/ss/Satellite?L=es_ES&c=Page&cid=1259952026632&p=1259952026632&pagename=ProductosYServicios%2FPYSLayout",
    "icgc_municipis": "https://datacloud.icgc.cat/datacloud/divisions-administratives/json_unzip/divisions-administratives-v2r1-municipis-50000-20250730.json",
}
for t in []:
    clave = "socrata_" + "".join(c if c.isalnum() else "_" for c in t)[:40]
    CANDIDATAS[clave] = SOCRATA + "?" + urllib.parse.urlencode({"q": t, "limit": 30})


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
            contenido = r.raw.read(LIMITE, decode_content=True)
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
