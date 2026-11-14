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
I = "https://servicios.ine.es/wstempus/js/ES"
for _id in (33754, 33760, 33766, 33753, 33759, 33765):
    CANDIDATAS[f"ine_series_{_id}"] = f"{I}/SERIES_TABLA/{_id}?page=1"
CANDIDATAS["ine_datos_33760"] = f"{I}/DATOS_TABLA/33760?nult=1&tip=A"
CANDIDATAS["idescat_emouniv"] = "https://www.idescat.cat/pub/?id=emouniv&lang=ca"
CANDIDATAS["idescat_emouniv_es"] = "https://www.idescat.cat/pub/?id=emouniv&lang=es"
CANDIDATAS["idescat_censph_6000"] = "https://api.idescat.cat/taules/v2/censph/6000?lang=ca"
CANDIDATAS["idescat_censph_16401"] = "https://api.idescat.cat/taules/v2/censph/16401?lang=ca"
CANDIDATAS["mostra_8w7y_estudis"] = S + "/resource/8w7y-2bfp.json?$select=estudis,curs,sum(n_mero_matr_cules_estad_stica::number)%20as%20n&$group=estudis,curs&$limit=200"
CANDIDATAS["mostra_5kd9_gi"] = S + "/resource/5kd9-2wex.json?$select=curs,comarca_del_centre,nacionalitat,tipus_d_estudi,sum(matr_cula::number)%20as%20m&$group=curs,comarca_del_centre,nacionalitat,tipus_d_estudi&$where=universitat='UdG'&$limit=500"
CANDIDATAS["mostra_5kd9_univ"] = S + "/resource/5kd9-2wex.json?$select=universitat,count(*)&$group=universitat"

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
