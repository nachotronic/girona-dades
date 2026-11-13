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
CANDIDATAS["meta_3cre_fa8v"] = "https://analisi.transparenciacatalunya.cat/api/views/3cre-fa8v.json"
CANDIDATAS["mostra_3cre_fa8v"] = "https://analisi.transparenciacatalunya.cat/resource/3cre-fa8v.json?$limit=5"
CANDIDATAS["meta_tt92_bngg"] = "https://analisi.transparenciacatalunya.cat/api/views/tt92-bngg.json"
CANDIDATAS["mostra_tt92_bngg"] = "https://analisi.transparenciacatalunya.cat/resource/tt92-bngg.json?$limit=5"
CANDIDATAS["meta_tqzv_uu8e"] = "https://analisi.transparenciacatalunya.cat/api/views/tqzv-uu8e.json"
CANDIDATAS["mostra_tqzv_uu8e"] = "https://analisi.transparenciacatalunya.cat/resource/tqzv-uu8e.json?$limit=5"
CANDIDATAS["meta_ftq4_h9vk"] = "https://analisi.transparenciacatalunya.cat/api/views/ftq4-h9vk.json"
CANDIDATAS["mostra_ftq4_h9vk"] = "https://analisi.transparenciacatalunya.cat/resource/ftq4-h9vk.json?$limit=5"
CANDIDATAS["meta_7f3n_y4sh"] = "https://analisi.transparenciacatalunya.cat/api/views/7f3n-y4sh.json"
CANDIDATAS["mostra_7f3n_y4sh"] = "https://analisi.transparenciacatalunya.cat/resource/7f3n-y4sh.json?$limit=5"
CANDIDATAS["meta_ptdc_nwds"] = "https://analisi.transparenciacatalunya.cat/api/views/ptdc-nwds.json"
CANDIDATAS["mostra_ptdc_nwds"] = "https://analisi.transparenciacatalunya.cat/resource/ptdc-nwds.json?$limit=5"
CANDIDATAS["meta_f87r_vsu7"] = "https://analisi.transparenciacatalunya.cat/api/views/f87r-vsu7.json"
CANDIDATAS["mostra_f87r_vsu7"] = "https://analisi.transparenciacatalunya.cat/resource/f87r-vsu7.json?$limit=5"
CANDIDATAS["meta_hj2f_96x6"] = "https://analisi.transparenciacatalunya.cat/api/views/hj2f-96x6.json"
CANDIDATAS["mostra_hj2f_96x6"] = "https://analisi.transparenciacatalunya.cat/resource/hj2f-96x6.json?$limit=5"
CANDIDATAS["socrata_llistes_espera_catsalut"] = SOCRATA + "?" + urllib.parse.urlencode({"q": "espera CatSalut", "limit": 10})
CANDIDATAS["catsalut_llistes_web"] = "https://catsalut.gencat.cat/ca/coneix-catsalut/acces-sistema-salut/llistes-espera/"


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
