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
            contenido = r.raw.read(LIMITE * 20 if clave.startswith(("ine_", "idescat_", "socrata_", "aena_")) else LIMITE, decode_content=True)
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
