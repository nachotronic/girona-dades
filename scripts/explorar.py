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
# Presupuestos municipales liquidados (Hacienda, CONPREL) y municipales de la Generalitat
for ds in ("e05250001-presupuestos-y-liquidaciones-de-las-entidades-locales-datos-individuales",
           "e05250001-presupuestos-y-liquidaciones-de-las-entidades-locales-datos-agregados"):
    CANDIDATAS["dgob_" + ds[-12:]] = f"https://datos.gob.es/apidata/catalog/dataset/{ds}.json"
CANDIDATAS["conprel_web"] = "https://serviciostelematicosext.hacienda.gob.es/SGFAL/CONPREL"
for q in ("pressupostos ens locals", "liquidació pressupost", "pressupost municipal", "ingressos i despeses ajuntaments"):
    CANDIDATAS["soc_" + q.replace(" ", "_").replace("ó", "o")] = f"{SOCRATA}?q={urllib.parse.quote(q)}&domains=analisi.transparenciacatalunya.cat&limit=40&only=dataset"
# Valor tasado de vivienda (MIVAU, municipios de más de 25.000 habitantes)
for c in ("35103500", "35103600", "35104000", "35101500"):
    CANDIDATAS[f"mivau_{c}"] = f"https://apps.fomento.gob.es/BoletinOnline2/sedal/{c}.XLS"
# INE: listas de tablas de DIRCE (empresas por municipio) e indicadores de mortalidad (esperanza de vida)
INE = "https://servicios.ine.es/wstempus/js/ES"
for op in ("DIRCE", "IDB", "MNP", "39"):
    CANDIDATAS[f"ine_ops_{op}"] = f"{INE}/TABLAS_OPERACION/{op}"


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
