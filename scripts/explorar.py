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
B = "https://api.idescat.cat/taules/v2/censph/6000/20200"
CANDIDATAS["idc_6000_node"] = f"{B}?lang=ca"
CANDIDATAS["idc_6000_mun"] = f"{B}/mun?lang=ca"
CANDIDATAS["idc_6000_data_girona"] = f"{B}/mun/data?lang=ca&MUN=170792"
CANDIDATAS["idc_6000_data"] = f"{B}/mun/data?lang=ca"
CANDIDATAS["idc_pmh_9145"] = "https://api.idescat.cat/taules/v2/pmh/9145?lang=ca"
# Divisiones territoriales de Agents Rurals y Bombers (novedad Idescat 13/11/2026)
for n in (86, 87, 88):
    CANDIDATAS[f"codis_{n}"] = f"https://www.idescat.cat/codis/?id=50&n={n}&f=ssv"
for q in ("bombers", "agents rurals", "incendis forestals", "incendis", "emergències", "actuacions bombers",
          "regions emergència", "àrees bàsiques agents rurals", "denúncies agents rurals", "superfície forestal"):
    CANDIDATAS["soc_" + q.replace(" ", "_").replace("à", "a").replace("è", "e").replace("ú", "u")] = (
        f"{SOCRATA}?q={urllib.parse.quote(q)}&limit=40&only=dataset")
# Coyuntura: paro, contratos y demandantes por municipio (SEPE, mensual)
SEPE = "https://sede.sepe.gob.es/es/portaltrabaja/resources/sede/datos_abiertos/datos/"
for a in (2025, 2026):
    CANDIDATAS[f"sepe_paro_{a}"] = f"{SEPE}Paro_por_municipios_{a}_csv.csv"
    CANDIDATAS[f"sepe_contratos_{a}"] = f"{SEPE}Contratos_por_municipios_{a}_csv.csv"
    CANDIDATAS[f"sepe_dtes_{a}"] = f"{SEPE}Dtes_empleo_por_municipios_{a}_csv.csv"
CANDIDATAS["sepe_portal"] = "https://www.sepe.es/HomeSepe/que-es-el-sepe/estadisticas/datos-estadisticos/municipios.html"
CANDIDATAS["sepe_datos_abiertos"] = "https://datos.gob.es/apidata/catalog/dataset/publisher/EA0021470?_pageSize=50"
# Afiliación a la Seguridad Social por municipio
CANDIDATAS["ss_afil_mun"] = "https://www.seg-social.es/wps/portal/wss/internet/EstadisticasPresupuestosEstudios/Estadisticas/EST8/2341/2342/2343"
CANDIDATAS["ss_datosgob"] = "https://datos.gob.es/apidata/catalog/dataset/title/afiliados?_pageSize=50"
# Idescat: índice de estadísticas de la API de tablas
CANDIDATAS["idescat_taules"] = "https://api.idescat.cat/taules/v2?lang=ca"
for t in ("atur registrat", "afiliats", "contractes", "habitatges iniciats", "pernoctacions", "ocupacio hotelera", "matriculacio", "fiances", "atur", "treballadors"):
    CANDIDATAS[f"socrata_{t.replace(' ', '_')}"] = f"{SOCRATA}?q={urllib.parse.quote(t)}&domains=analisi.transparenciacatalunya.cat&limit=40"

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
