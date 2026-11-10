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

CANDIDATAS = {
    # Base territorial
    "idescat_emex_nodes_mun": "https://api.idescat.cat/emex/v1/nodes.json?tipus=mun",
    "idescat_emex_nodes_com": "https://api.idescat.cat/emex/v1/nodes.json?tipus=com",
    "idescat_emex_girona": "https://api.idescat.cat/emex/v1/dades.json?id=170792",
    "idescat_codis_mun": "https://www.idescat.cat/codis/?id=50&n=9&f=ssv",
    # INE
    "ine_operaciones": "https://servicios.ine.es/wstempus/js/ES/OPERACIONES_DISPONIBLES",
    "ine_tablas_adrh": "https://servicios.ine.es/wstempus/js/ES/TABLAS_OPERACION/ADRH",
    "ine_vut_39364": "https://servicios.ine.es/wstempus/js/ES/DATOS_TABLA/39364?nult=1",
    # Catastro INSPIRE
    "catastro_bu_atom": "https://www.catastro.hacienda.gob.es/INSPIRE/buildings/ES.SDGC.BU.atom.xml",
    "catastro_bu_atom_17": "https://www.catastro.hacienda.gob.es/INSPIRE/buildings/17/ES.SDGC.BU.atom_17.xml",
    "catastro_bu_atom_alt": "http://www.catastro.minhap.es/INSPIRE/buildings/ES.SDGC.bu.atom.xml",
    # Locales
    "girona_ckan_paquetes": "https://www.girona.cat/opendata/api/3/action/package_list",
    "xifra_menu_ini": "https://www.ddgi.cat/xifra/menu_ini.asp",
    "xifra_menu_mun": "https://www.ddgi.cat/xifra/menu_mun.asp",
    "xifra_poblacion": "https://www.ddgi.cat/xifra/menu_send.asp?IdMenu=030201",
    "xifra_ambits": "https://www.ddgi.cat/xifra/ambits.asp",
    "xifra_novetats": "https://www.ddgi.cat/xifra/novetats.asp",
    # Ministerio de Transportes, boletín
    "mitma_trans_mun": "https://apps.fomento.gob.es/BoletinOnline2/sedal/34010210.XLS",
    "mitma_valor_medio_prov": "https://apps.fomento.gob.es/BoletinOnline2/sedal/34020150.XLS",
    "mitma_suelo_10_50k": "https://apps.fomento.gob.es/BoletinOnline2/sedal/36402500.XLS",
    # Hacienda / AEAT
    "hacienda_conprel": "https://serviciostelematicosext.hacienda.gob.es/SGFAL/CONPREL",
    "aeat_irpf_municipios": "https://sede.agenciatributaria.gob.es/AEAT/Contenidos_Comunes/La_Agencia_Tributaria/Estadisticas/Publicaciones/sites/irpfmunicipios/2023/jrubik7fe28e5d4daeab97eaf47efe29f0716914ab405e.html",
}
for t in TERMINOS_SOCRATA:
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
            r = requests.get(url, headers=UA, timeout=60)
            tipo = r.headers.get("content-type", "")
            (MUESTRAS / f"{clave}.{extension(tipo)}").write_bytes(r.content[:LIMITE])
            filas.append(f"| {clave} | {r.status_code} | {tipo.split(';')[0]} | {len(r.content)} | {r.url} |")
        except Exception as e:  # noqa: BLE001 - queremos registrar cualquier fallo
            filas.append(f"| {clave} | error | {type(e).__name__}: {str(e)[:80]} | | {url} |")
        time.sleep(1)
    (SALIDA / "informe.md").write_text("# Exploración de fuentes\n\n" + "\n".join(filas) + "\n", encoding="utf-8")
    print("\n".join(filas))


if __name__ == "__main__":
    main()
