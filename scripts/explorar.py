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
# Coyuntura, segunda ronda (2): niveles de Idescat, transporte, DGT
IDC = "https://api.idescat.cat/taules/v2"
for ruta in ("afi/8602", "afi/8603", "afic", "e03", "ee", "e01"):
    CANDIDATAS["idescat_" + ruta.replace("/", "_")] = f"{IDC}/{ruta}?lang=ca"
INE = "https://servicios.ine.es/wstempus/js/ES"
for op in ("TV", "TMOV_R", "TMOV_I", "IRAV", "IPVA"):
    CANDIDATAS[f"ine_tablas_{op}"] = f"{INE}/TABLAS_OPERACION/{op}"
CANDIDATAS["ine_49259"] = f"{INE}/DATOS_TABLA/49259?nult=3"
CANDIDATAS["ine_6295"] = f"{INE}/DATOS_TABLA/6295?nult=3"
CANDIDATAS["aena_mensuales"] = "https://www.aena.es/es/estadisticas/informes-mensuales.html"
CANDIDATAS["dgt_mat_202609"] = "https://www.dgt.es/microdatos/salida/2026/9/vehiculos/matriculaciones/export_mensual_mat_202609.zip"

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
