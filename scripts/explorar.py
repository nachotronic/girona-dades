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
# Coyuntura, segunda ronda
IDC = "https://api.idescat.cat/taules/v2"
CANDIDATAS["idescat_index"] = f"{IDC}?lang=ca"
CANDIDATAS["idescat_afi"] = f"{IDC}/afi?lang=ca"
INE = "https://servicios.ine.es/wstempus/js/ES"
CANDIDATAS["ine_operaciones"] = f"{INE}/OPERACIONES_DISPONIBLES"
for op in ("EPC", "SM", "ETR", "IPV", "EOAC", "EOAP", "EOTR", "ICM", "IASS", "MNP", "ETDP"):
    CANDIDATAS[f"ine_tablas_{op}"] = f"{INE}/TABLAS_OPERACION/{op}"
BOL = "https://apps.fomento.gob.es/BoletinOnline2/sedal/{}.XLS"
for c in ("35101000", "35103500", "35102000", "35103000"):
    CANDIDATAS[f"mitma_{c}"] = BOL.format(c)
CANDIDATAS["mitma_valor_tasado"] = "https://apps.fomento.gob.es/BoletinOnline2/?nivel=2&orden=35000000"
CANDIDATAS["dgt_mat_202609"] = "https://www.dgt.es/microdatos/salida/2026/9/vehiculos/matriculaciones/export_mensual_mat_202609.zip"
CANDIDATAS["dgt_portal"] = "https://www.dgt.es/menusecundario/dgt-en-cifras/matraba-listados/matriculaciones-automoviles-mensual.html"
CANDIDATAS["aena_estadisticas"] = "https://www.aena.es/es/estadisticas/inicio.html"
CANDIDATAS["girona_opendata"] = "https://www.girona.cat/opendata/"
CANDIDATAS["girona_ckan"] = "https://www.girona.cat/opendata/api/3/action/package_list"
CANDIDATAS["ss_afil_prov"] = "https://www.seg-social.es/wps/portal/wss/internet/EstadisticasPresupuestosEstudios/Estadisticas/EST8/EST10"
for t in ("aeroport", "autonoms", "afiliacio", "empreses", "aigua", "vehicles", "parc de vehicles", "turisme", "creacio d'empreses", "ocupacio"):
    CANDIDATAS[f"socrata_{t.replace(' ', '_').replace(chr(39), '')}"] = f"{SOCRATA}?q={urllib.parse.quote(t)}&domains=analisi.transparenciacatalunya.cat&limit=40"

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
            contenido = r.raw.read(LIMITE * 20 if clave.startswith(("ine_", "idescat_", "socrata_")) else LIMITE, decode_content=True)
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
