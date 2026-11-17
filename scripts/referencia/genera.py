"""Genera la capa de referencia de «Girona en xifres» para buscadores e IAs.

A partir de build/referencia.json (valores calculados por el propio mapa con extreu.mjs) escribe en web/:
  ca/… y es/…            páginas estáticas legibles sin JavaScript: inicio, provincia, municipios, temas e indicadores
  dades/…                descargas CSV y JSON con metadatos (datapackage.json)
  llms.txt, llms-full*.txt   resumen para modelos de lenguaje y texto completo con las cifras
  sitemap.xml, robots.txt
y, con --publica, inserta en web/index.html el canonical, los hreflang y el JSON-LD con la URL del sitio.

La URL base sale de lloc.yml (o de la variable SITE_URL): cambiar de dominio es cambiar esa línea.
Uso: python scripts/referencia/genera.py [build/referencia.json] [--publica]
"""
from __future__ import annotations

import csv
import html
import io
import json
import os
import re
import shutil
import sys
import unicodedata
from pathlib import Path
from urllib.parse import urlparse

import yaml

ARREL = Path(__file__).resolve().parents[2]
WEB = ARREL / "web"
args = [a for a in sys.argv[1:] if not a.startswith("--")]
PUBLICA = "--publica" in sys.argv
ENTRADA = Path(args[0]) if args else ARREL / "build" / "referencia.json"

LLOC = yaml.safe_load((ARREL / "lloc.yml").read_text(encoding="utf-8"))
BASE = (os.environ.get("SITE_URL") or LLOC["url"]).strip()
if not BASE.endswith("/"):
    BASE += "/"
NOM = LLOC.get("nom", "Girona en xifres")
LLIC, LLIC_URL = LLOC.get("llicencia", "CC-BY-4.0"), LLOC.get("llicencia_url", "https://creativecommons.org/licenses/by/4.0/")
REPO = "https://github.com/nachotronic/girona-dades"
# Versión de los CSS (la Action pasa el commit) para que el navegador no mezcle páginas nuevas con estilos viejos
V = f"?v={os.environ['VERSIO']}" if os.environ.get("VERSIO") else ""

D = json.loads(ENTRADA.read_text(encoding="utf-8"))
GENERAT = D["generat"]
MUN = D["municipis"]
IND = D["indicadors"]
TEMES = [t for t in D["temes"] if any(i["tema"] == t["id"] for i in IND)]
PER_ID = {i["id"]: i for i in IND}
PROV_POB = D["provincia"].get("poblacio")

# ---------------------------------------------------------------------------
# Fuentes de los indicadores que no llevan nota en mapa.js (la nota ya cita la fuente)
F = {
    "incasol": ("Incasòl / Agència de l'Habitatge de Catalunya, fiances de lloguer", "https://analisi.transparenciacatalunya.cat/d/qww9-bvhh"),
    "mitma": ("Ministerio de Transportes y Movilidad Sostenible, compraventas de viviendas (notarios)", "https://apps.fomento.gob.es/BoletinOnline2/?nivel=2&orden=34000000"),
    "atlas": ("INE, Atlas de distribución de renta de los hogares", "https://www.ine.es/dynt3/inebase/index.htm?padre=12385"),
    "registre": ("Registre de Turisme de Catalunya", "https://analisi.transparenciacatalunya.cat/d/t2h3-cgys"),
    "catastro": ("Dirección General del Catastro, INSPIRE", "https://www.catastro.hacienda.gob.es/INSPIRE/buildings/17/ES.SDGC.BU.atom_17.xml"),
    "xifra": ("Xifra, Diputació de Girona", "https://www.ddgi.cat/xifra/"),
    "emex": ("Idescat, El municipi en xifres (EMEX)", "https://www.idescat.cat/emex/"),
    "generalitat": ("Dades obertes de la Generalitat de Catalunya", "https://analisi.transparenciacatalunya.cat/"),
    "habitatge": ("Secretaria d'Habitatge, Generalitat de Catalunya", "https://analisi.transparenciacatalunya.cat/d/j8h8-vxug"),
}
FONT_ID = {
    **dict.fromkeys(["lloguer", "var5"], "incasol"),
    **dict.fromkeys(["compra", "nova", "protegida"], "mitma"),
    **dict.fromkeys(["renda", "renda_llar", "gini", "pobresa", "pobresa_sev", "alts", "salari", "pensio", "prest_atur", "edat", "majors65", "menors18", "llar", "unipersonals", "estrangers", "esforc"], "atlas"),
    **dict.fromkeys(["hut", "tur_hut_c"], "registre"),
    **dict.fromkeys(["antics", "anyo", "viv_edif"], "catastro"),
    **dict.fromkeys(["pob", "pob_var", "deute", "atur", "irpf", "autonoms", "empreses", "llocs", "visats", "buits", "kwh", "natalitat", "mortalitat", "catala", "ocupats", "ocupats_dones",
                     "atur_var", "atur_estr", "prest_atur_ben", "pensions", "pnc", "residencies", "farmacies", "sanitaris", "pmp", "sector_serveis", "sector_ind", "sector_const", "sector_agri"], "xifra"),
    **dict.fromkeys(["educ_sup", "educ_prim", "nascuts_estr", "ist", "rfdb", "pib_hab", "segones", "lloguer_pct", "petits", "grans", "monoparentals", "places_tur", "residus", "pensio_mitjana",
                     "creixement", "immigracio", "densitat", "sau", "esports", "motos", "enten_cat", "estacional", "tur_estacional_c", "tur_segones_c"], "emex"),
    **dict.fromkeys(["rgc", "selectiva"], "generalitat"),
    "iniciats": "habitatge",
}
# Periodo cuando el indicador no lo lleva (lo dice su título)
PERIODE_FIX = {"var5": "2020-2025", "nova": "2021-2025", "protegida": "2021-2025"}


def font(i, l):
    if i["nota"].get(l):
        return i["nota"][l], None
    k = FONT_ID.get(i["id"])
    return (F[k][0], F[k][1]) if k else (None, None)


def periode(i, l):
    return i["periode_et"].get(l) or PERIODE_FIX.get(i["id"]) or i["periode"]


def amb_periode(i, l):
    """Descripción larga con el periodo entre paréntesis, si no lo dice ya."""
    d, per = nom_ind(i, l, True), periode(i, l)
    return f"{d} ({per})" if per and per not in d else d


# ---------------------------------------------------------------------------
# Textos

T = {
    "ca": {
        "dir_mun": "municipis", "dir_ind": "indicadors", "dir_tema": "temes", "dir_prov": "provincia",
        "lema": "Dades obertes de la província de Girona",
        "desc_lloc": "Habitatge, renda, feina, salut, seguretat, turisme i política dels 221 municipis de la província de Girona, amb dades oficials comparades amb Catalunya i Espanya.",
        "mapa": "Mapa interactiu", "municipis": "Municipis", "temes": "Temes", "dades": "Descàrregues", "provincia": "La província",
        "inici": "Inici", "actualitzat": "Dades actualitzades el", "indicador": "Indicador", "valor": "Valor", "periode": "Període",
        "posicio": "Posició", "prov": "Província", "cat": "Catalunya", "esp": "Espanya", "font": "Font", "municipi": "Municipi", "comarca": "Comarca",
        "poblacio": "Població", "de": "de", "veure_mapa": "Veure al mapa interactiu", "veure_fitxa": "Fitxa interactiva",
        "citar": "Com citar aquestes dades", "llicencia": "Llicència", "codi": "Codi i dades a GitHub",
        "nota_pos": "La posició ordena els municipis de més a menys (1 = el valor més alt).",
        "baixa": "Descarrega les dades d'aquest municipi", "tots_ind": "Tots els indicadors",
        "h_mun": lambda n: f"{n}: dades del municipi", "t_mun": lambda n: f"{n} en xifres: habitatge, renda, població i més",
        "d_mun": lambda n, c: f"Indicadors oficials de {n} ({c}, província de Girona): lloguer, renda, població, feina, turisme, impostos i més, comparats amb la província, Catalunya i Espanya.",
        "h_ind": lambda n: n, "t_ind": lambda n: f"{n} per municipi a la província de Girona",
        "d_ind": lambda n, p: f"{n}{' (' + p + ')' if p else ''}: valor de cadascun dels municipis de la província de Girona, ordenats, amb la mitjana provincial i la comparació amb Catalunya i Espanya.",
        "h_tema": lambda n: n, "t_tema": lambda n: f"{n}: indicadors de la província de Girona",
        "h_prov": "La província de Girona en xifres", "t_prov": "La província de Girona en xifres",
        "d_prov": "Valors de la província de Girona de tots els indicadors, comparats amb Catalunya i Espanya.",
        "h_inici": "Dades de la província de Girona, municipi a municipi",
        "ranquing": "Rànquing dels municipis", "mitjana": "Mitjana de la província",
        "max": "Valor més alt", "min": "Valor més baix", "n_mun": lambda n, t: f"{n} de {t} municipis amb dada",
        "llegir": "Per a persones, buscadors i IA", "alcalde": "Alcalde o alcaldessa",
        "per_dades": "Arxius de dades",
        "dades_txt": "Totes les xifres es poden descarregar en CSV i JSON, amb el diccionari d'indicadors, la font i el període de cada dada.",
        "f_wide": "Un municipi per fila i un indicador per columna (darrera dada).",
        "f_llarg": "Format llarg: municipi, indicador, valor i període (la font de cada indicador és al diccionari).",
        "f_dic": "Diccionari d'indicadors amb nom, descripció, font, període i valors de referència.",
        "f_sec": "Indicadors per secció censal (536 seccions).",
        "f_mun_json": "Un JSON per municipi.", "f_pkg": "Metadades (Frictionless Data Package).",
        "cita": lambda t, u: f"{NOM}, «{t}». {u} (consultat el {GENERAT}). Dades originals: vegeu la font de cada indicador.",
        "resum": "Resum", "sense": "sense dada",
        "lang_nom": "Català",
    },
    "es": {
        "dir_mun": "municipios", "dir_ind": "indicadores", "dir_tema": "temas", "dir_prov": "provincia",
        "lema": "Datos abiertos de la provincia de Girona",
        "desc_lloc": "Vivienda, renta, empleo, salud, seguridad, turismo y política de los 221 municipios de la provincia de Girona, con datos oficiales comparados con Cataluña y España.",
        "mapa": "Mapa interactivo", "municipis": "Municipios", "temes": "Temas", "dades": "Descargas", "provincia": "La provincia",
        "inici": "Inicio", "actualitzat": "Datos actualizados el", "indicador": "Indicador", "valor": "Valor", "periode": "Periodo",
        "posicio": "Posición", "prov": "Provincia", "cat": "Cataluña", "esp": "España", "font": "Fuente", "municipi": "Municipio", "comarca": "Comarca",
        "poblacio": "Población", "de": "de", "veure_mapa": "Ver en el mapa interactivo", "veure_fitxa": "Ficha interactiva",
        "citar": "Cómo citar estos datos", "llicencia": "Licencia", "codi": "Código y datos en GitHub",
        "nota_pos": "La posición ordena los municipios de más a menos (1 = el valor más alto).",
        "baixa": "Descarga los datos de este municipio", "tots_ind": "Todos los indicadores",
        "h_mun": lambda n: f"{n}: datos del municipio", "t_mun": lambda n: f"{n} en cifras: vivienda, renta, población y más",
        "d_mun": lambda n, c: f"Indicadores oficiales de {n} ({c}, provincia de Girona): alquiler, renta, población, empleo, turismo, impuestos y más, comparados con la provincia, Cataluña y España.",
        "h_ind": lambda n: n, "t_ind": lambda n: f"{n} por municipio en la provincia de Girona",
        "d_ind": lambda n, p: f"{n}{' (' + p + ')' if p else ''}: valor de cada uno de los municipios de la provincia de Girona, ordenados, con la media provincial y la comparación con Cataluña y España.",
        "h_tema": lambda n: n, "t_tema": lambda n: f"{n}: indicadores de la provincia de Girona",
        "h_prov": "La provincia de Girona en cifras", "t_prov": "La provincia de Girona en cifras",
        "d_prov": "Valores de la provincia de Girona de todos los indicadores, comparados con Cataluña y España.",
        "h_inici": "Datos de la provincia de Girona, municipio a municipio",
        "ranquing": "Ranking de los municipios", "mitjana": "Media de la provincia",
        "max": "Valor más alto", "min": "Valor más bajo", "n_mun": lambda n, t: f"{n} de {t} municipios con dato",
        "llegir": "Para personas, buscadores e IA", "alcalde": "Alcalde o alcaldesa",
        "per_dades": "Archivos de datos",
        "dades_txt": "Todas las cifras se pueden descargar en CSV y JSON, con el diccionario de indicadores, la fuente y el periodo de cada dato.",
        "f_wide": "Un municipio por fila y un indicador por columna (último dato).",
        "f_llarg": "Formato largo: municipio, indicador, valor y periodo (la fuente de cada indicador está en el diccionario).",
        "f_dic": "Diccionario de indicadores con nombre, descripción, fuente, periodo y valores de referencia.",
        "f_sec": "Indicadores por sección censal (536 secciones).",
        "f_mun_json": "Un JSON por municipio.", "f_pkg": "Metadatos (Frictionless Data Package).",
        "cita": lambda t, u: f"{NOM}, «{t}». {u} (consultado el {GENERAT}). Datos originales: ver la fuente de cada indicador.",
        "resum": "Resumen", "sense": "sin dato",
        "lang_nom": "Español",
    },
}
LANGS = ["ca", "es"]
OG_LOCALE = {"ca": "ca_ES", "es": "es_ES"}


# ---------------------------------------------------------------------------
# Utilidades

def miles(n):
    return f"{n:,}".replace(",", ".")


def esc(s):
    return html.escape(str(s), quote=True)


def nom_natural(n):
    """«Bisbal d'Empordà, la» → «la Bisbal d'Empordà»; «Escala, l'» → «l'Escala»."""
    m = re.match(r"^(.*), (el|la|els|les|l'|s')$", n)
    if not m:
        return n
    base, art = m.groups()
    return f"{art}{base}" if art.endswith("'") else f"{art} {base}"


def slug(s):
    s = unicodedata.normalize("NFKD", s.replace("l·l", "ll").replace("'", "")).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")


for m in MUN:
    m["natural"] = nom_natural(m["nom"])
    m["slug"] = slug(m["natural"])
assert len({m["slug"] for m in MUN}) == len(MUN), "slugs de municipio repetidos"
PER_INE = {m["ine"]: m for m in MUN}
TEMA = {t["id"]: t for t in TEMES}


def ruta(l, tipus, clau=None):
    """Ruta relativa a la raíz del sitio, terminada en «/»."""
    t = T[l]
    if tipus == "inici":
        return f"{l}/"
    if tipus == "prov":
        return f"{l}/{t['dir_prov']}/"
    if tipus == "dades":
        return f"{l}/#dades"
    if tipus == "mun":
        return f"{l}/{t['dir_mun']}/{PER_INE[clau]['slug']}/"
    if tipus == "munis":
        return f"{l}/{t['dir_mun']}/"
    if tipus == "ind":
        return f"{l}/{t['dir_ind']}/{slug(clau)}/"
    if tipus == "tema":
        return f"{l}/{t['dir_tema']}/{slug(TEMA[clau][l])}/"
    raise ValueError(tipus)


def nom_ind(i, l, llarg=False):
    return i[l][1 if llarg else 0]


def ordre(i):
    """Municipios ordenados de mayor a menor valor y posición de cada uno (empates con la misma posición)."""
    vs = sorted(i["valors"].items(), key=lambda kv: -kv[1])
    pos, ant, p = {}, None, 0
    for k, (ine, v) in enumerate(vs, 1):
        if v != ant:
            p, ant = k, v
        pos[ine] = p
    return vs, pos


ORDRE = {i["id"]: ordre(i) for i in IND}
ICONES = [f for f in ["favicon.svg", "favicon.ico", "apple-touch-icon.png", "og.png", "icon-512.png", "site.webmanifest"] if (WEB / f).exists()]


def cap_html(l, r, path, titol, desc, alt, jsonld, extra_head=""):
    """Cabecera HTML. r = prefijo relativo hasta la raíz; path = ruta propia; alt = ruta de la versión en el otro idioma."""
    o = "es" if l == "ca" else "ca"
    url = BASE + path
    icones = ""
    if "favicon.svg" in ICONES:
        icones += f'<link rel="icon" href="{r}favicon.svg" type="image/svg+xml">'
    if "favicon.ico" in ICONES:
        icones += f'<link rel="icon" href="{r}favicon.ico" sizes="any">'
    if "apple-touch-icon.png" in ICONES:
        icones += f'<link rel="apple-touch-icon" href="{r}apple-touch-icon.png">'
    og_img = f'<meta property="og:image" content="{BASE}og.png"><meta name="twitter:card" content="summary_large_image">' if "og.png" in ICONES else '<meta name="twitter:card" content="summary">'
    ld = f'<script type="application/ld+json">{json.dumps(jsonld, ensure_ascii=False, separators=(",", ":"))}</script>' if jsonld else ""
    return f"""<!doctype html>
<html lang="{l}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{esc(titol)} · {esc(NOM)}</title>
<meta name="description" content="{esc(desc)}">
<link rel="canonical" href="{url}">
<link rel="alternate" hreflang="{l}" href="{url}">
<link rel="alternate" hreflang="{o}" href="{BASE + alt}">
<link rel="alternate" hreflang="x-default" href="{BASE + (path if l == 'ca' else alt)}">
<meta property="og:type" content="website"><meta property="og:site_name" content="{esc(NOM)}">
<meta property="og:title" content="{esc(titol)}"><meta property="og:description" content="{esc(desc)}">
<meta property="og:url" content="{url}"><meta property="og:locale" content="{OG_LOCALE[l]}">{og_img}
<meta name="theme-color" content="#0f1113">{icones}
<link rel="preload" href="{r}fonts/archivo-latin-wdth-normal.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="{r}estilos.css{V}">
<link rel="stylesheet" href="{r}referencia.css{V}">
{extra_head}{ld}
</head>
<body class="ref">
<header class="cap">
  <div class="amplada cap-dins">
    <a class="marca" href="{r}?lang={l}"><span class="marca-punt" aria-hidden="true"></span>{esc(NOM)}</a>
    <nav class="menu" aria-label="{esc(T[l]['temes'])}">
      <a href="{r}?lang={l}#s-mapa">{T[l]['mapa']}</a>
      <a href="{r}{ruta(l, 'prov')}">{T[l]['provincia']}</a>
      <a href="{r}{ruta(l, 'munis')}">{T[l]['municipis']}</a>
      <a href="{r}{ruta(l, 'inici')}#temes">{T[l]['temes']}</a>
      <a href="{r}{ruta(l, 'inici')}#dades">{T[l]['dades']}</a>
    </nav>
    <div class="idiomes ref-idiomes" role="group" aria-label="Idioma">
      <a href="{r}{path if l == 'ca' else alt}" hreflang="ca" lang="ca"{' aria-current="true"' if l == 'ca' else ''}>CA</a>
      <a href="{r}{path if l == 'es' else alt}" hreflang="es" lang="es"{' aria-current="true"' if l == 'es' else ''}>ES</a>
    </div>
  </div>
</header>
<main class="amplada ref-main">
"""


def peu_html(l, r, titol, path):
    t = T[l]
    return f"""
  <section class="ref-cita" aria-labelledby="h-cita">
    <h2 id="h-cita" class="ref-h3">{t['citar']}</h2>
    <p class="ref-cita-txt">{esc(t['cita'](titol, BASE + path))}</p>
  </section>
</main>
<footer class="peu">
  <div class="amplada">
    <p class="peu-marca">{esc(NOM)}</p>
    <p class="peu-meta">{t['actualitzat']} {GENERAT} · {t['llicencia']}: <a href="{LLIC_URL}" rel="license">{LLIC}</a> · <a href="{REPO}">{t['codi']}</a> · <a href="{r}llms.txt">llms.txt</a> · <a href="{r}dades/">CSV / JSON</a></p>
  </div>
</footer>
</body>
</html>
"""


def molla(l, r, passos):
    """Migas de pan visibles."""
    trossos = [f'<a href="{r}{ruta(l, "inici")}">{T[l]["inici"]}</a>'] + [f'<a href="{r}{p}">{esc(n)}</a>' if p else f"<span>{esc(n)}</span>" for n, p in passos]
    return f'<nav class="ref-molla" aria-label="breadcrumb">{" / ".join(trossos)}</nav>'


def ld_molla(l, passos):
    items = [{"@type": "ListItem", "position": 1, "name": T[l]["inici"], "item": BASE + ruta(l, "inici")}]
    for k, (n, p) in enumerate(passos, 2):
        items.append({"@type": "ListItem", "position": k, "name": n, **({"item": BASE + p} if p else {})})
    return {"@type": "BreadcrumbList", "itemListElement": items}


ORG = {"@type": "Organization", "@id": BASE + "#org", "name": NOM, "url": BASE, **({"logo": BASE + "icon-512.png"} if "icon-512.png" in ICONES else {})}


def escriu(path, txt):
    f = WEB / path
    if path.endswith("/"):
        f = f / "index.html"
    f.parent.mkdir(parents=True, exist_ok=True)
    f.write_text(txt, encoding="utf-8")


def fmt_v(i, l, ine=None, z=None):
    f = i["fmt"][l]
    v = f["mun"].get(ine) if ine else f.get(z)
    return v.replace(" %", "\u00a0%").replace(" €", "\u00a0€") if v else v


def maj(s):
    return s[:1].upper() + s[1:]


def celda_font(i, l):
    txt, url = font(i, l)
    if not txt:
        return ""
    return f'<a href="{esc(url)}">{esc(txt)}</a>' if url else esc(txt)


# ---------------------------------------------------------------------------
# Centroides de los municipios (para el JSON-LD Place)

def centroides():
    g = json.loads((WEB / "datos" / "municipis.geojson").read_text(encoding="utf-8"))
    res = {}
    for f in g["features"]:
        geo = f["geometry"]
        anells = [geo["coordinates"][0]] if geo["type"] == "Polygon" else [p[0] for p in geo["coordinates"]]
        a = max(anells, key=len)
        xs, ys = [p[0] for p in a], [p[1] for p in a]
        res[f["properties"]["ine"]] = (round(sum(ys) / len(ys), 5), round(sum(xs) / len(xs), 5))
    return res


CENTRE = centroides()

# Indicadores clave para el resumen en texto de cada municipio
CLAU = ["pob", "lloguer", "esforc", "compra", "hut", "renda", "renda_llar", "cj_atur", "edat", "estrangers", "valor_cad", "trib_ibi"]


COMARCA_ART = {"Alt Empordà": "l'Alt Empordà", "Baix Empordà": "el Baix Empordà", "Cerdanya": "la Cerdanya", "Garrotxa": "la Garrotxa", "Gironès": "el Gironès",
               "Pla de l'Estany": "el Pla de l'Estany", "Ripollès": "el Ripollès", "Selva": "la Selva", "Lluçanès": "el Lluçanès", "Osona": "Osona"}


def resum_mun(m, l):
    """Frases cortas con las cifras clave: lo que un buscador o una IA pueden citar tal cual."""
    t = T[l]
    n = m["natural"]
    fr = []
    if m.get("poblacio"):
        p = f"{m['poblacio']:,}".replace(",", ".")
        if l == "ca":
            c = COMARCA_ART.get(m["comarca"], m["comarca"])
            c = "del " + c[3:] if c.startswith("el ") else "dels " + c[4:] if c.startswith("els ") else ("d'" + c if c[0] in "AEIOUÀÈÉÍÒÓÚ" else "de " + c)
            fr.append(f"{maj(n)} és un municipi {c}, a la província de Girona, amb {p} habitants.")
        else:
            c = COMARCA_ART.get(m["comarca"], m["comarca"])
            c = "del " + c[3:] if c.startswith("el ") else c
            fr.append(f"{maj(n)} es un municipio de la comarca {c if c.startswith('del ') else 'de ' + c}, en la provincia de Girona, con {p} habitantes.")
    for k in CLAU[1:]:
        i = PER_ID.get(k)
        if not i or m["ine"] not in i["valors"]:
            continue
        v, per, gi = fmt_v(i, l, m["ine"]), periode(i, l), fmt_v(i, l, z="gi")
        pos = ORDRE[k][1][m["ine"]]
        tot = len(i["valors"])
        desc = nom_ind(i, l, True)
        desc = re.sub(r"\s*\((€|€/mes|anys|años|kWh)\)$", "", desc)
        if per and per in desc:
            per = None
        if l == "ca":
            fr.append(f"{desc}: {v}{' (' + per + ')' if per else ''}{', província: ' + gi if gi else ''}; posició {pos} de {tot}.")
        else:
            fr.append(f"{desc}: {v}{' (' + per + ')' if per else ''}{', provincia: ' + gi if gi else ''}; posición {pos} de {tot}.")
    a = m.get("alcalde")
    if a and a.get("nom"):
        fr.append(f"{t['alcalde']}: {a['nom']} ({a['partit']})." if a.get("partit") else f"{t['alcalde']}: {a['nom']}.")
    return fr


def comarca_txt(m, l):
    return m["comarca"]


# ---------------------------------------------------------------------------
# Páginas de municipio

def pagina_mun(m, l):
    t, o = T[l], "es" if l == "ca" else "ca"
    path, alt = ruta(l, "mun", m["ine"]), ruta(o, "mun", m["ine"])
    r = "../../../"
    n = m["natural"]
    titol = t["t_mun"](n)
    desc = t["d_mun"](n, m["comarca"])
    files_ld = []
    blocs = []
    for tm in TEMES:
        files = []
        for i in IND:
            if i["tema"] != tm["id"] or m["ine"] not in i["valors"]:
                continue
            pos = ORDRE[i["id"]][1][m["ine"]]
            tot = len(i["valors"])
            per = periode(i, l) or "–"
            v = fmt_v(i, l, m["ine"])
            files.append(f'<tr><th scope="row"><a href="{r}{ruta(l, "ind", i["id"])}">{esc(nom_ind(i, l))}</a><small>{esc(nom_ind(i, l, True))}</small></th>'
                         f'<td class="n v" data-l="{esc(n)}">{esc(v)}</td><td class="n" data-l="{t["periode"]}">{esc(per)}</td><td class="n" data-l="{t["posicio"]}">{pos}/{tot}</td>'
                         f'<td class="n" data-l="{t["prov"]}">{esc(fmt_v(i, l, z="gi") or "–")}</td><td class="n" data-l="{t["cat"]}">{esc(fmt_v(i, l, z="cat") or "–")}</td><td class="n" data-l="{t["esp"]}">{esc(fmt_v(i, l, z="esp") or "–")}</td>'
                         f'<td class="ref-font" data-l="{t["font"]}">{celda_font(i, l)}</td></tr>')
            ft, _ = font(i, l)
            files_ld.append({"@type": "PropertyValue", "propertyID": i["id"], "name": nom_ind(i, l, True), "value": i["valors"][m["ine"]],
                             **({"description": f"{v} · {per}"}), **({"measurementTechnique": ft} if ft else {})})
        if files:
            blocs.append(f'<section class="ref-tema" id="{tm["id"]}"><h2 class="ref-h2"><a href="{r}{ruta(l, "tema", tm["id"])}">{esc(tm[l])}</a></h2>'
                         f'<div class="ref-taula-cont"><table class="ref-taula ref-fitxes"><thead><tr><th scope="col">{t["indicador"]}</th><th scope="col">{esc(n)}</th><th scope="col">{t["periode"]}</th>'
                         f'<th scope="col">{t["posicio"]}</th><th scope="col">{t["prov"]}</th><th scope="col">{t["cat"]}</th><th scope="col">{t["esp"]}</th><th scope="col">{t["font"]}</th></tr></thead>'
                         f'<tbody>{"".join(files)}</tbody></table></div></section>')
    resum = resum_mun(m, l)
    lat, lon = CENTRE.get(m["ine"], (None, None))
    lloc = {"@type": ["Place", "AdministrativeArea"], "@id": BASE + path + "#lloc", "name": n, "alternateName": m["nom"] if m["nom"] != n else None,
            "identifier": {"@type": "PropertyValue", "propertyID": "INE", "value": m["ine"]},
            "containedInPlace": {"@type": "AdministrativeArea", "name": f"{m['comarca']}, {'província de Girona' if l == 'ca' else 'provincia de Girona'}, Catalunya, España"},
            **({"geo": {"@type": "GeoCoordinates", "latitude": lat, "longitude": lon}} if lat else {})}
    lloc = {k: v for k, v in lloc.items() if v is not None}
    dataset = {"@type": "Dataset", "@id": BASE + path + "#dades", "name": titol, "description": desc + " " + " ".join(resum[:4]),
               "url": BASE + path, "inLanguage": l, "license": LLIC_URL, "isAccessibleForFree": True, "creator": {"@id": ORG["@id"]}, "publisher": {"@id": ORG["@id"]},
               "dateModified": GENERAT, "spatialCoverage": {"@id": lloc["@id"]}, "keywords": [n, m["comarca"], "Girona", "Catalunya", *[tm[l] for tm in TEMES]],
               "isPartOf": {"@id": BASE + "#dataset"},
               "distribution": [{"@type": "DataDownload", "encodingFormat": "application/json", "contentUrl": f"{BASE}dades/municipis/{m['ine']}.json"},
                                {"@type": "DataDownload", "encodingFormat": "text/csv", "contentUrl": f"{BASE}dades/municipis/{m['ine']}.csv"}],
               "variableMeasured": files_ld}
    passos = [(t["municipis"], ruta(l, "munis")), (n, None)]
    ld = {"@context": "https://schema.org", "@graph": [ORG, {"@type": "WebPage", "@id": BASE + path, "url": BASE + path, "name": titol, "inLanguage": l, "dateModified": GENERAT,
                                                             "about": {"@id": lloc["@id"]}, "mainEntity": {"@id": dataset["@id"]}, "breadcrumb": ld_molla(l, passos)}, lloc, dataset]}
    alc = m.get("alcalde")
    cos = cap_html(l, r, path, titol, desc, alt, ld) + molla(l, r, passos) + f"""
  <header class="ref-cap">
    <p class="sobre">{esc(m['comarca'])} · INE {m['ine']}</p>
    <h1>{esc(maj(t['h_mun'](n)))}</h1>
    <p class="meta">{t['actualitzat']} {GENERAT} · <a href="{r}?lang={l}#{m['ine']}">{t['veure_fitxa']}</a> · <a href="{r}dades/municipis/{m['ine']}.csv">CSV</a> · <a href="{r}dades/municipis/{m['ine']}.json">JSON</a></p>
  </header>
  <section class="ref-resum" aria-labelledby="h-resum">
    <h2 id="h-resum" class="ref-h3">{t['resum']}</h2>
    {''.join(f'<p>{esc(x)}</p>' for x in resum)}
  </section>
  <nav class="ref-index" aria-label="{t['temes']}">{''.join(f'<a href="#{tm["id"]}">{esc(tm[l])}</a>' for tm in TEMES if any(tm["id"] == i["tema"] and m["ine"] in i["valors"] for i in IND))}</nav>
  {''.join(blocs)}
  <p class="ref-nota">{t['nota_pos']}</p>
""" + peu_html(l, r, titol, path)
    escriu(path, cos)
    return path


# ---------------------------------------------------------------------------
# Páginas de indicador

def pagina_ind(i, l):
    t, o = T[l], "es" if l == "ca" else "ca"
    path, alt = ruta(l, "ind", i["id"]), ruta(o, "ind", i["id"])
    r = "../../../"
    nom, llarg, per = nom_ind(i, l), nom_ind(i, l, True), periode(i, l)
    titol = t["t_ind"](llarg)
    desc = t["d_ind"](llarg, per)
    vs, pos = ORDRE[i["id"]]
    ft, fu = font(i, l)
    files = "".join(
        f'<tr><td class="n">{pos[ine]}</td><th scope="row"><a href="{r}{ruta(l, "mun", ine)}">{esc(PER_INE[ine]["natural"])}</a></th><td>{esc(PER_INE[ine]["comarca"])}</td><td class="n v">{esc(fmt_v(i, l, ine))}</td></tr>'
        for ine, _ in vs)
    refs = [(t["prov"], fmt_v(i, l, z="gi")), (t["cat"], fmt_v(i, l, z="cat")), (t["esp"], fmt_v(i, l, z="esp"))]
    refs_html = "".join(f'<div class="xifra"><p class="etiqueta">{k}</p><p class="valor">{esc(v)}</p></div>' for k, v in refs if v)
    alt_v, baix_v = vs[0], vs[-1]
    frase = (f"{llarg}{' (' + per + ')' if per else ''}. {t['max']}: {PER_INE[alt_v[0]]['natural']}, {fmt_v(i, l, alt_v[0])}. {t['min']}: {PER_INE[baix_v[0]]['natural']}, {fmt_v(i, l, baix_v[0])}."
             + (f" {t['prov']}: {fmt_v(i, l, z='gi')}." if fmt_v(i, l, z="gi") else "") + (f" {t['cat']}: {fmt_v(i, l, z='cat')}." if fmt_v(i, l, z="cat") else "")
             + (f" {t['esp']}: {fmt_v(i, l, z='esp')}." if fmt_v(i, l, z="esp") else ""))
    tm = TEMA[i["tema"]]
    passos = [(tm[l], ruta(l, "tema", i["tema"])), (nom, None)]
    dataset = {"@type": "Dataset", "@id": BASE + path + "#dades", "name": titol, "description": desc + " " + frase, "url": BASE + path, "inLanguage": l,
               "license": LLIC_URL, "isAccessibleForFree": True, "creator": {"@id": ORG["@id"]}, "publisher": {"@id": ORG["@id"]}, "dateModified": GENERAT,
               **({"temporalCoverage": i["periode"] or PERIODE_FIX.get(i["id"])} if (i["periode"] or PERIODE_FIX.get(i["id"])) else {}),
               "spatialCoverage": {"@type": "AdministrativeArea", "name": "Província de Girona" if l == "ca" else "Provincia de Girona"},
               **({"isBasedOn": fu} if fu else {}), **({"citation": ft} if ft else {}), "isPartOf": {"@id": BASE + "#dataset"},
               "variableMeasured": {"@type": "PropertyValue", "propertyID": i["id"], "name": llarg},
               "distribution": [{"@type": "DataDownload", "encodingFormat": "text/csv", "contentUrl": f"{BASE}dades/indicadors/{i['id']}.csv"}]}
    ld = {"@context": "https://schema.org", "@graph": [ORG, {"@type": "WebPage", "@id": BASE + path, "url": BASE + path, "name": titol, "inLanguage": l, "dateModified": GENERAT,
                                                             "mainEntity": {"@id": dataset["@id"]}, "breadcrumb": ld_molla(l, passos)}, dataset]}
    cos = cap_html(l, r, path, titol, desc, alt, ld) + molla(l, r, passos) + f"""
  <header class="ref-cap">
    <p class="sobre">{esc(tm[l])}{' · ' + esc(per) if per else ''}</p>
    <h1>{esc(nom)}</h1>
    <p class="entradeta">{esc(llarg)}</p>
    <p class="meta">{t['n_mun'](len(vs), len(MUN))} · {t['actualitzat']} {GENERAT} · <a href="{r}dades/indicadors/{i['id']}.csv">CSV</a></p>
  </header>
  <section class="ref-resum"><p>{esc(frase)}</p>{f'<p class="ref-font-txt">{t["font"]}: {celda_font(i, l)}</p>' if ft else ''}</section>
  {f'<div class="xifres ref-xifres">{refs_html}</div>' if refs_html else ''}
  <section class="ref-tema"><h2 class="ref-h2">{t['ranquing']}</h2>
  <div class="ref-taula-cont"><table class="ref-taula ref-taula-curta"><thead><tr><th scope="col">{t['posicio']}</th><th scope="col">{t['municipi']}</th><th scope="col">{t['comarca']}</th><th scope="col">{esc(nom)}</th></tr></thead>
  <tbody>{files}</tbody></table></div></section>
  <p class="ref-nota">{t['nota_pos']}</p>
""" + peu_html(l, r, titol, path)
    escriu(path, cos)
    return path


# ---------------------------------------------------------------------------
# Temas, provincia, listado de municipios e inicio

def taula_prov(l, r, inds):
    t = T[l]
    files = "".join(
        f'<tr><th scope="row"><a href="{r}{ruta(l, "ind", i["id"])}">{esc(nom_ind(i, l))}</a><small>{esc(nom_ind(i, l, True))}</small></th>'
        f'<td class="n v" data-l="{t["prov"]}">{esc(fmt_v(i, l, z="gi") or "–")}</td><td class="n" data-l="{t["cat"]}">{esc(fmt_v(i, l, z="cat") or "–")}</td><td class="n" data-l="{t["esp"]}">{esc(fmt_v(i, l, z="esp") or "–")}</td>'
        f'<td class="n" data-l="{t["periode"]}">{esc(periode(i, l) or "–")}</td><td class="ref-font" data-l="{t["font"]}">{celda_font(i, l)}</td></tr>' for i in inds)
    return (f'<div class="ref-taula-cont"><table class="ref-taula ref-fitxes"><thead><tr><th scope="col">{t["indicador"]}</th><th scope="col">{t["prov"]}</th><th scope="col">{t["cat"]}</th>'
            f'<th scope="col">{t["esp"]}</th><th scope="col">{t["periode"]}</th><th scope="col">{t["font"]}</th></tr></thead><tbody>{files}</tbody></table></div>')


def pagina_tema(tm, l):
    t, o = T[l], "es" if l == "ca" else "ca"
    path, alt = ruta(l, "tema", tm["id"]), ruta(o, "tema", tm["id"])
    r = "../../../"
    inds = [i for i in IND if i["tema"] == tm["id"]]
    titol = t["t_tema"](tm[l])
    desc = f"{tm[l]}: " + ", ".join(nom_ind(i, l).lower() if l == "ca" else nom_ind(i, l) for i in inds[:12]) + ("…" if len(inds) > 12 else ".")
    passos = [(tm[l], None)]
    ld = {"@context": "https://schema.org", "@graph": [ORG, {"@type": "CollectionPage", "@id": BASE + path, "url": BASE + path, "name": titol, "inLanguage": l, "dateModified": GENERAT,
                                                             "breadcrumb": ld_molla(l, passos), "hasPart": [{"@type": "Dataset", "name": nom_ind(i, l, True), "url": BASE + ruta(l, "ind", i["id"])} for i in inds]}]}
    cos = cap_html(l, r, path, titol, desc, alt, ld) + molla(l, r, passos) + f"""
  <header class="ref-cap"><p class="sobre">{t['temes']}</p><h1>{esc(tm[l])}</h1><p class="meta">{len(inds)} {t['indicador'].lower()}s · {t['actualitzat']} {GENERAT}</p></header>
  <section class="ref-tema">{taula_prov(l, r, inds)}</section>
""" + peu_html(l, r, titol, path)
    escriu(path, cos)
    return path


def pagina_prov(l):
    t, o = T[l], "es" if l == "ca" else "ca"
    path, alt = ruta(l, "prov"), ruta(o, "prov")
    r = "../../"
    titol = t["t_prov"]
    passos = [(t["provincia"], None)]
    ld = {"@context": "https://schema.org", "@graph": [ORG, {"@type": "WebPage", "@id": BASE + path, "url": BASE + path, "name": titol, "inLanguage": l, "dateModified": GENERAT, "breadcrumb": ld_molla(l, passos)},
                                                       {"@type": "Dataset", "name": titol, "description": t["d_prov"], "url": BASE + path, "license": LLIC_URL, "isAccessibleForFree": True,
                                                        "creator": {"@id": ORG["@id"]}, "dateModified": GENERAT, "isPartOf": {"@id": BASE + "#dataset"},
                                                        "spatialCoverage": {"@type": "AdministrativeArea", "name": "Província de Girona" if l == "ca" else "Provincia de Girona"},
                                                        "distribution": [{"@type": "DataDownload", "encodingFormat": "application/json", "contentUrl": BASE + "dades/indicadors.json"}]}]}
    blocs = "".join(f'<section class="ref-tema" id="{tm["id"]}"><h2 class="ref-h2"><a href="{r}{ruta(l, "tema", tm["id"])}">{esc(tm[l])}</a></h2>{taula_prov(l, r, [i for i in IND if i["tema"] == tm["id"]])}</section>' for tm in TEMES)
    pob = f"{PROV_POB:,}".replace(",", ".") if PROV_POB else None
    cos = cap_html(l, r, path, titol, t["d_prov"], alt, ld) + molla(l, r, passos) + f"""
  <header class="ref-cap"><p class="sobre">{t['lema']}</p><h1>{esc(t['h_prov'])}</h1>
  <p class="entradeta">{esc(t['d_prov'])}{(' ' + t['poblacio'] + ': ' + pob + '.') if pob else ''}</p><p class="meta">{t['actualitzat']} {GENERAT}</p></header>
  <nav class="ref-index">{''.join(f'<a href="#{tm["id"]}">{esc(tm[l])}</a>' for tm in TEMES)}</nav>
  {blocs}
""" + peu_html(l, r, titol, path)
    escriu(path, cos)
    return path


def pagina_munis(l):
    t, o = T[l], "es" if l == "ca" else "ca"
    path, alt = ruta(l, "munis"), ruta(o, "munis")
    r = "../../"
    titol = t["municipis"] + (" de la província de Girona" if l == "ca" else " de la provincia de Girona")
    passos = [(t["municipis"], None)]
    ordenats = sorted(MUN, key=lambda m: slug(m["nom"]))
    files = "".join(f'<tr><th scope="row"><a href="{r}{ruta(l, "mun", m["ine"])}">{esc(m["natural"])}</a></th><td>{esc(m["comarca"])}</td><td class="n">{m["ine"]}</td>'
                    f'<td class="n">{(f"{m["poblacio"]:,}".replace(",", ".")) if m.get("poblacio") else "–"}</td></tr>' for m in ordenats)
    ld = {"@context": "https://schema.org", "@graph": [ORG, {"@type": "CollectionPage", "@id": BASE + path, "url": BASE + path, "name": titol, "inLanguage": l, "breadcrumb": ld_molla(l, passos),
                                                             "mainEntity": {"@type": "ItemList", "numberOfItems": len(MUN), "itemListElement": [
                                                                 {"@type": "ListItem", "position": k, "name": m["natural"], "url": BASE + ruta(l, "mun", m["ine"])} for k, m in enumerate(ordenats, 1)]}}]}
    cos = cap_html(l, r, path, titol, t["desc_lloc"], alt, ld) + molla(l, r, passos) + f"""
  <header class="ref-cap"><p class="sobre">{t['lema']}</p><h1>{esc(titol)}</h1><p class="meta">{len(MUN)} {t['municipis'].lower()} · {t['actualitzat']} {GENERAT}</p></header>
  <div class="ref-taula-cont"><table class="ref-taula ref-taula-curta"><thead><tr><th scope="col">{t['municipi']}</th><th scope="col">{t['comarca']}</th><th scope="col">INE</th><th scope="col">{t['poblacio']}</th></tr></thead><tbody>{files}</tbody></table></div>
""" + peu_html(l, r, titol, path)
    escriu(path, cos)
    return path


def llista_dades(l, r):
    t = T[l]
    arxius = [("dades/municipis.csv", t["f_wide"]), ("dades/indicadors.csv", t["f_llarg"]), ("dades/indicadors.json", t["f_dic"]),
              ("dades/seccions.csv", t["f_sec"]), ("dades/municipis/17079.json", t["f_mun_json"]), ("dades/datapackage.json", t["f_pkg"]), ("llms.txt", "llms.txt"), ("llms-full.txt", "llms-full.txt")]
    return "".join(f'<li><a href="{r}{p}">{p.split("/")[-1] if "17079" not in p else "municipis/<ine>.json"}</a><span>{esc(d)}</span></li>' for p, d in arxius)


def pagina_inici(l):
    t, o = T[l], "es" if l == "ca" else "ca"
    path, alt = ruta(l, "inici"), ruta(o, "inici")
    r = "../"
    titol = t["h_inici"]
    temes = "".join(f'<li><a href="{r}{ruta(l, "tema", tm["id"])}">{esc(tm[l])}</a><span>{sum(1 for i in IND if i["tema"] == tm["id"])}</span></li>' for tm in TEMES)
    grans = sorted(MUN, key=lambda m: -(m.get("poblacio") or 0))[:24]
    ld = {"@context": "https://schema.org", "@graph": [ORG,
                                                       {"@type": "WebSite", "@id": BASE + "#website", "url": BASE, "name": NOM, "inLanguage": ["ca", "es"], "publisher": {"@id": ORG["@id"]}},
                                                       {"@type": "WebPage", "@id": BASE + path, "url": BASE + path, "name": titol, "inLanguage": l, "dateModified": GENERAT, "isPartOf": {"@id": BASE + "#website"}}]}
    cos = cap_html(l, r, path, titol, t["desc_lloc"], alt, ld) + f"""
  <header class="ref-cap"><p class="sobre">{t['lema']} · {t['llegir']}</p><h1>{esc(titol)}</h1>
  <p class="entradeta">{esc(t['desc_lloc'])}</p>
  <p class="meta">{len(MUN)} {t['municipis'].lower()} · {len(IND)} {t['indicador'].lower()}s · {t['actualitzat']} {GENERAT} · <a href="{r}?lang={l}">{t['mapa']}</a></p></header>
  <section class="ref-tema"><h2 class="ref-h2"><a href="{r}{ruta(l, 'prov')}">{t['provincia']}</a> · <a href="{r}{ruta(l, 'munis')}">{t['municipis']}</a></h2>
  <ul class="ref-llista ref-llista-mun">{''.join(f'<li><a href="{r}{ruta(l, "mun", m["ine"])}">{esc(m["natural"])}</a></li>' for m in grans)}<li><a href="{r}{ruta(l, 'munis')}">{t['tots_ind'].split()[0]} ({len(MUN)}) →</a></li></ul></section>
  <section class="ref-tema" id="temes"><h2 class="ref-h2">{t['temes']}</h2><ul class="ref-llista">{temes}</ul></section>
  <section class="ref-tema" id="dades"><h2 class="ref-h2">{t['per_dades']}</h2><p>{esc(t['dades_txt'])} {t['llicencia']}: <a href="{LLIC_URL}" rel="license">{LLIC}</a>.</p><ul class="ref-fitxers">{llista_dades(l, r)}</ul></section>
""" + peu_html(l, r, titol, path)
    escriu(path, cos)
    return path


# ---------------------------------------------------------------------------
# Descargas

def csv_txt(capcalera, files):
    b = io.StringIO()
    w = csv.writer(b, lineterminator="\n")
    w.writerow(capcalera)
    w.writerows(files)
    return b.getvalue()


def dades():
    d = WEB / "dades"
    if d.exists():
        shutil.rmtree(d)
    (d / "municipis").mkdir(parents=True)
    (d / "indicadors").mkdir()
    ids = [i["id"] for i in IND]
    # Ancho: un municipio por fila
    (d / "municipis.csv").write_text(csv_txt(["ine", "municipi", "comarca", "poblacio", *ids],
                                             [[m["ine"], m["natural"], m["comarca"], m.get("poblacio"), *[PER_ID[k]["valors"].get(m["ine"], "") for k in ids]] for m in MUN]), encoding="utf-8")
    # Largo
    llarg = []
    for i in IND:
        ft, fu = font(i, "es")
        for m in MUN:
            if m["ine"] in i["valors"]:
                llarg.append([m["ine"], m["natural"], i["id"], i["valors"][m["ine"]], i["periode"] or PERIODE_FIX.get(i["id"]) or ""])
    cap_llarg = ["ine", "municipi", "indicador", "valor", "periode"]
    (d / "indicadors.csv").write_text(csv_txt(cap_llarg, llarg), encoding="utf-8")
    # Diccionario
    dic = []
    for i in IND:
        fca, fu = font(i, "ca")
        fes, _ = font(i, "es")
        dic.append({"id": i["id"], "tema": i["tema"], "tema_ca": TEMA[i["tema"]]["ca"], "tema_es": TEMA[i["tema"]]["es"],
                    "nom_ca": i["ca"][0], "descripcio_ca": i["ca"][1], "nom_es": i["es"][0], "descripcion_es": i["es"][1],
                    "periode": i["periode"] or PERIODE_FIX.get(i["id"]), "font_ca": fca, "font_es": fes, "font_url": fu,
                    "provincia": i["prov"], "catalunya": i["cat"], "espanya": i["esp"], "municipis_amb_dada": len(i["valors"]),
                    "pagina_ca": BASE + ruta("ca", "ind", i["id"]), "pagina_es": BASE + ruta("es", "ind", i["id"]), "csv": f"{BASE}dades/indicadors/{i['id']}.csv"})
        vs, pos = ORDRE[i["id"]]
        (d / "indicadors" / f"{i['id']}.csv").write_text(csv_txt(["posicio", "ine", "municipi", "comarca", "valor", "valor_text", "periode"],
                                                                 [[pos[ine], ine, PER_INE[ine]["natural"], PER_INE[ine]["comarca"], v, i["fmt"]["ca"]["mun"][ine], i["periode"] or ""] for ine, v in vs]), encoding="utf-8")
    meta = {"nom": NOM, "url": BASE, "generat": GENERAT, "llicencia": LLIC, "llicencia_url": LLIC_URL, "codi": REPO}
    (d / "indicadors.json").write_text(json.dumps({**meta, "indicadors": dic}, ensure_ascii=False, indent=1), encoding="utf-8")
    # Un archivo por municipio
    for m in MUN:
        vals = []
        for i in IND:
            if m["ine"] not in i["valors"]:
                continue
            _, pos = ORDRE[i["id"]]
            ft, fu = font(i, "es")
            vals.append({"id": i["id"], "tema": i["tema"], "nom_ca": i["ca"][1], "nom_es": i["es"][1], "valor": i["valors"][m["ine"]], "text_ca": i["fmt"]["ca"]["mun"][m["ine"]],
                         "text_es": i["fmt"]["es"]["mun"][m["ine"]], "periode": i["periode"] or PERIODE_FIX.get(i["id"]), "posicio": pos[m["ine"]], "de": len(i["valors"]),
                         "provincia": i["prov"], "catalunya": i["cat"], "espanya": i["esp"], "font": ft, "font_url": fu})
        obj = {**meta, "municipi": {"ine": m["ine"], "nom": m["natural"], "nom_oficial": m["nom"], "comarca": m["comarca"], "poblacio": m.get("poblacio"), "alcalde": m.get("alcalde"),
                                    "centre": CENTRE.get(m["ine"]), "pagina_ca": BASE + ruta("ca", "mun", m["ine"]), "pagina_es": BASE + ruta("es", "mun", m["ine"])}, "indicadors": vals}
        (d / "municipis" / f"{m['ine']}.json").write_text(json.dumps(obj, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
        (d / "municipis" / f"{m['ine']}.csv").write_text(csv_txt(["indicador", "descripcio_ca", "descripcion_es", "valor", "periode", "posicio", "de", "provincia", "catalunya", "espanya", "font"],
                                                                 [[v["id"], v["nom_ca"], v["nom_es"], v["valor"], v["periode"] or "", v["posicio"], v["de"], v["provincia"], v["catalunya"], v["espanya"], v["font"] or ""] for v in vals]), encoding="utf-8")
    # Secciones censales
    sec_ind = [i for i in IND if i.get("sec")]
    codis = sorted({k for i in sec_ind for k in i["sec"]})
    (d / "seccions.csv").write_text(csv_txt(["seccio", "ine", "municipi", "districte", "seccio_num", *[i["id"] for i in sec_ind]],
                                            [[c, c[:5], PER_INE.get(c[:5], {}).get("natural", ""), c[5:7], c[7:], *[i["sec"].get(c, "") for i in sec_ind]] for c in codis]), encoding="utf-8")
    # Data Package (Frictionless)
    def camp(i):
        return {"name": i["id"], "type": "number", "title": i["es"][1], "description": f"{i['ca'][1]} / {i['es'][1]}. {font(i, 'es')[0] or ''}".strip()}
    pkg = {"name": "girona-en-xifres", "title": NOM, "description": T["ca"]["desc_lloc"] + " / " + T["es"]["desc_lloc"], "homepage": BASE, "version": GENERAT, "created": GENERAT,
           "licenses": [{"name": LLIC, "path": LLIC_URL}], "keywords": ["Girona", "Catalunya", "municipis", "habitatge", "renda", "dades obertes"],
           "sources": [{"title": v[0], "path": v[1]} for v in F.values()],
           "resources": [
               {"name": "municipis", "path": "municipis.csv", "format": "csv", "mediatype": "text/csv", "encoding": "utf-8",
                "schema": {"fields": [{"name": "ine", "type": "string"}, {"name": "municipi", "type": "string"}, {"name": "comarca", "type": "string"}, {"name": "poblacio", "type": "integer"}, *[camp(i) for i in IND]], "primaryKey": "ine"}},
               {"name": "indicadors-llarg", "path": "indicadors.csv", "format": "csv", "mediatype": "text/csv", "encoding": "utf-8",
                "schema": {"fields": [{"name": c, "type": "number" if c == "valor" else "string"} for c in cap_llarg]}},
               {"name": "diccionari", "path": "indicadors.json", "format": "json", "mediatype": "application/json"},
               {"name": "seccions", "path": "seccions.csv", "format": "csv", "mediatype": "text/csv", "encoding": "utf-8",
                "schema": {"fields": [{"name": "seccio", "type": "string"}, {"name": "ine", "type": "string"}, {"name": "municipi", "type": "string"}, {"name": "districte", "type": "string"},
                                      {"name": "seccio_num", "type": "string"}, *[camp(i) for i in sec_ind]], "primaryKey": "seccio"}},
           ]}
    (d / "datapackage.json").write_text(json.dumps(pkg, ensure_ascii=False, indent=1), encoding="utf-8")
    # Índice legible de la carpeta
    r = "../"
    cos = cap_html("ca", r, "dades/", "Dades / Datos", T["ca"]["dades_txt"], "dades/", None) + f"""
  <header class="ref-cap"><p class="sobre">CSV · JSON</p><h1>Dades / Datos</h1><p class="entradeta">{esc(T['ca']['dades_txt'])}<br>{esc(T['es']['dades_txt'])}</p></header>
  <ul class="ref-fitxers">{llista_dades('ca', r)}</ul>
""" + peu_html("ca", r, "Dades", "dades/")
    escriu("dades/", cos)
    return len(sec_ind)


# ---------------------------------------------------------------------------
# llms.txt, sitemap, robots

def llms(paths):
    pob = f"{PROV_POB:,}".replace(",", ".") if PROV_POB else "–"
    linia = lambda n, u, d="": f"- [{n}]({u}){': ' + d if d else ''}"
    temes_es = "\n".join(linia(tm["es"], BASE + ruta("es", "tema", tm["id"]), f"{sum(1 for i in IND if i['tema'] == tm['id'])} indicadores") for tm in TEMES)
    grans = sorted(MUN, key=lambda m: -(m.get("poblacio") or 0))[:20]
    txt = f"""# {NOM}

> Datos oficiales de los 221 municipios de la provincia de Girona (Catalunya, España): vivienda, renta, población, empleo, turismo, salud, seguridad, impuestos locales, catastro y política, comparados con la provincia, Cataluña y España. Bilingüe catalán/castellano. Datos actualizados el {GENERAT}; se regeneran automáticamente cada semana desde las fuentes originales (INE, Idescat, Generalitat de Catalunya, Diputació de Girona, Catastro, Ministerio de Hacienda, AEAT, Ministerio de Transportes, SEPE, Mossos d'Esquadra, CGPJ y otras).

Cómo usar este sitio:
- Cada municipio tiene una página estática con todas sus cifras, el periodo, la posición entre los 221 municipios, la media provincial, Cataluña, España y la fuente original de cada dato. Las páginas se leen sin JavaScript.
- Al citar, menciona «{NOM}» con la URL de la página y la fuente original que figura junto a cada indicador.
- Los nombres de municipio siguen la forma oficial catalana (p. ej. «la Bisbal d'Empordà», «Castell d'Aro, Platja d'Aro i s'Agaró»). El código INE de 5 cifras identifica cada municipio.
- Provincia de Girona: {pob} habitantes, {len(MUN)} municipios, 8 comarcas enteras y parte de otras.
- Licencia de la compilación: {LLIC} ({LLIC_URL}). Las fuentes originales mantienen sus propias condiciones de reutilización.

## Páginas principales
{linia("Inicio (castellano)", BASE + ruta("es", "inici"))}
{linia("Inici (català)", BASE + ruta("ca", "inici"))}
{linia("La provincia de Girona en cifras", BASE + ruta("es", "prov"), "todos los indicadores de la provincia frente a Cataluña y España")}
{linia("Lista de los 221 municipios", BASE + ruta("es", "munis"))}
{linia("Mapa interactivo", BASE + "?lang=es", "aplicación con mapas por municipio y sección censal (requiere JavaScript)")}

## Temas
{temes_es}

## Municipios más poblados
{chr(10).join(linia(m["natural"], BASE + ruta("es", "mun", m["ine"]), f"{m['comarca']}, {miles(m['poblacio'])} hab.") for m in grans if m.get("poblacio"))}

## Datos descargables
{linia("municipis.csv", BASE + "dades/municipis.csv", "un municipio por fila, un indicador por columna (último dato)")}
{linia("indicadors.csv", BASE + "dades/indicadors.csv", "formato largo: municipio, indicador, valor y periodo")}
{linia("indicadors.json", BASE + "dades/indicadors.json", "diccionario de indicadores con descripción, fuente, periodo y valores de referencia")}
{linia("seccions.csv", BASE + "dades/seccions.csv", "indicadores de renta y población por sección censal")}
{linia("datapackage.json", BASE + "dades/datapackage.json", "metadatos Frictionless Data Package")}
- Un JSON y un CSV por municipio: {BASE}dades/municipis/<codigo INE>.json (p. ej. {BASE}dades/municipis/17079.json para Girona)

## Optional
{linia("llms-full.txt", BASE + "llms-full.txt", "todas las cifras de todos los municipios en texto (castellano)")}
{linia("llms-full.ca.txt", BASE + "llms-full.ca.txt", "el mismo contenido en catalán")}
{linia("Código y proceso de actualización", REPO)}
"""
    (WEB / "llms.txt").write_text(txt, encoding="utf-8")
    for l, nomf in (("es", "llms-full.txt"), ("ca", "llms-full.ca.txt")):
        t = T[l]
        parts = [f"# {NOM} — {t['h_inici']}\n\n> {t['desc_lloc']} {t['actualitzat']} {GENERAT}. {t['llicencia']}: {LLIC}. URL: {BASE + ruta(l, 'inici')}\n"]
        parts.append(f"\n## {t['h_prov']}\n\nURL: {BASE + ruta(l, 'prov')}\n")
        for tm in TEMES:
            parts.append(f"\n### {tm[l]}\n")
            for i in IND:
                if i["tema"] != tm["id"]:
                    continue
                refs = "; ".join(f"{k}: {v}" for k, v in ((t["prov"], fmt_v(i, l, z="gi")), (t["cat"], fmt_v(i, l, z="cat")), (t["esp"], fmt_v(i, l, z="esp"))) if v)
                per = periode(i, l)
                parts.append(f"- {amb_periode(i, l)}: {refs or t['sense']}. {t['font']}: {font(i, l)[0] or '–'}\n")
        for m in sorted(MUN, key=lambda m: slug(m["nom"])):
            parts.append(f"\n## {m['natural']} ({m['comarca']}, INE {m['ine']})\n\nURL: {BASE + ruta(l, 'mun', m['ine'])}\n\n")
            parts.append(" ".join(resum_mun(m, l)) + "\n\n")
            for i in IND:
                if m["ine"] in i["valors"] and i["id"] not in CLAU:
                    per = periode(i, l)
                    pos = ORDRE[i["id"]][1][m["ine"]]
                    parts.append(f"- {amb_periode(i, l)}: {fmt_v(i, l, m['ine'])} [{pos}/{len(i['valors'])}]\n")
        (WEB / nomf).write_text("".join(parts), encoding="utf-8")


def sitemap(paths):
    """paths: lista de (ruta_ca, ruta_es, prioridad)."""
    f = ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">']
    for pca, pes, prio in paths:
        for p in (pca, pes):
            f.append(f'<url><loc>{BASE + p}</loc><lastmod>{GENERAT}</lastmod><priority>{prio}</priority>'
                     f'<xhtml:link rel="alternate" hreflang="ca" href="{BASE + pca}"/><xhtml:link rel="alternate" hreflang="es" href="{BASE + pes}"/></url>')
    f.append(f'<url><loc>{BASE}</loc><lastmod>{GENERAT}</lastmod><priority>1.0</priority></url>')
    f.append(f'<url><loc>{BASE}dades/</loc><lastmod>{GENERAT}</lastmod><priority>0.5</priority></url>')
    # Otras páginas sueltas de web/ (quiénes somos, aviso legal…), salvo las de prueba o marcadas noindex
    for h in sorted(WEB.glob("*.html")):
        txt = h.read_text(encoding="utf-8", errors="ignore")
        if h.name == "index.html" or h.name.startswith("prova") or re.search(r'name="robots"[^>]*noindex', txt):
            continue
        f.append(f'<url><loc>{BASE}{h.name}</loc><lastmod>{GENERAT}</lastmod><priority>0.4</priority></url>')
    f.append("</urlset>")
    (WEB / "sitemap.xml").write_text("\n".join(f) + "\n", encoding="utf-8")
    bots = ["GPTBot", "OAI-SearchBot", "ChatGPT-User", "ClaudeBot", "Claude-User", "Claude-SearchBot", "anthropic-ai", "PerplexityBot", "Perplexity-User",
            "Google-Extended", "Applebot-Extended", "CCBot", "Meta-ExternalAgent", "Amazonbot", "DuckAssistBot", "MistralAI-User", "cohere-ai", "Bytespider"]
    robots = "# " + NOM + ": datos abiertos. Se permite el acceso a buscadores y a asistentes de IA.\n" + "".join(f"User-agent: {b}\nAllow: /\n\n" for b in bots) + \
             "User-agent: *\nAllow: /\n\n" + f"Sitemap: {BASE}sitemap.xml\n"
    (WEB / "robots.txt").write_text(robots, encoding="utf-8")


def cname():
    host = urlparse(BASE).hostname or ""
    f = WEB / "CNAME"
    if host and not host.endswith("github.io"):
        f.write_text(host + "\n", encoding="utf-8")
    elif f.exists():
        f.unlink()


# Direcciones anteriores de la web: si alguna página de web/ aún las lleva escritas, se cambian por BASE al publicar
BASES_ANTIGUES = ["https://nachotronic.github.io/girona-dades/"]


def absolutes():
    for h in WEB.glob("*.html"):
        s = h.read_text(encoding="utf-8")
        s2 = s
        for b in BASES_ANTIGUES:
            if b != BASE:
                s2 = s2.replace(b, BASE)
        if s2 != s:
            h.write_text(s2, encoding="utf-8")


def portada():
    """Canonical, hreflang y JSON-LD de la portada interactiva (web/index.html), entre las marcas ref:inici y ref:fi."""
    f = WEB / "index.html"
    s = f.read_text(encoding="utf-8")
    ld = {"@context": "https://schema.org", "@graph": [ORG,
                                                       {"@type": "WebSite", "@id": BASE + "#website", "url": BASE, "name": NOM, "inLanguage": ["ca", "es"], "publisher": {"@id": ORG["@id"]},
                                                        "description": T["ca"]["desc_lloc"]},
                                                       {"@type": "Dataset", "@id": BASE + "#dataset", "name": NOM, "url": BASE, "description": T["ca"]["desc_lloc"] + " / " + T["es"]["desc_lloc"],
                                                        "license": LLIC_URL, "isAccessibleForFree": True, "creator": {"@id": ORG["@id"]}, "publisher": {"@id": ORG["@id"]}, "dateModified": GENERAT,
                                                        "inLanguage": ["ca", "es"], "keywords": ["Girona", "Catalunya", "municipis", "habitatge", "lloguer", "renda", "dades obertes"],
                                                        "spatialCoverage": {"@type": "AdministrativeArea", "name": "Província de Girona", "containedInPlace": {"@type": "AdministrativeArea", "name": "Catalunya"}},
                                                        "isBasedOn": [v[1] for v in F.values()],
                                                        "distribution": [{"@type": "DataDownload", "encodingFormat": "text/csv", "contentUrl": BASE + "dades/municipis.csv"},
                                                                         {"@type": "DataDownload", "encodingFormat": "text/csv", "contentUrl": BASE + "dades/indicadors.csv"},
                                                                         {"@type": "DataDownload", "encodingFormat": "application/json", "contentUrl": BASE + "dades/indicadors.json"}]}]}
    bloc = (f'<!-- ref:inici -->\n<link rel="canonical" href="{BASE}">\n<link rel="alternate" hreflang="ca" href="{BASE}?lang=ca">\n'
            f'<link rel="alternate" hreflang="es" href="{BASE}?lang=es">\n<link rel="alternate" hreflang="x-default" href="{BASE}">\n<meta property="og:url" content="{BASE}">\n'
            f'<link rel="alternate" type="text/plain" title="llms.txt" href="llms.txt">\n<link rel="sitemap" type="application/xml" href="sitemap.xml">\n'
            f'<script type="application/ld+json">{json.dumps(ld, ensure_ascii=False, separators=(",", ":"))}</script>\n<!-- ref:fi -->')
    s2 = re.sub(r"<!-- ref:inici -->.*?<!-- ref:fi -->", lambda _: bloc, s, flags=re.S)
    if s2 == s and "<!-- ref:inici -->" not in s:
        print("AVISO: web/index.html no tiene las marcas ref:inici/ref:fi")
    f.write_text(s2, encoding="utf-8")


def main():
    for l in LANGS:
        for sub in (T[l]["dir_mun"], T[l]["dir_ind"], T[l]["dir_tema"], T[l]["dir_prov"]):
            if (WEB / l / sub).exists():
                shutil.rmtree(WEB / l / sub)
    paths = []
    paths.append((pagina_inici("ca"), pagina_inici("es"), "0.9"))
    paths.append((pagina_prov("ca"), pagina_prov("es"), "0.8"))
    paths.append((pagina_munis("ca"), pagina_munis("es"), "0.7"))
    for tm in TEMES:
        paths.append((pagina_tema(tm, "ca"), pagina_tema(tm, "es"), "0.6"))
    for m in MUN:
        paths.append((pagina_mun(m, "ca"), pagina_mun(m, "es"), "0.8"))
    for i in IND:
        paths.append((pagina_ind(i, "ca"), pagina_ind(i, "es"), "0.6"))
    nsec = dades()
    llms(paths)
    sitemap(paths)
    cname()
    if PUBLICA:
        absolutes()
        portada()
    print(f"Referència: {len(paths) * 2} pàgines, {len(IND)} indicadors ({nsec} per secció), base {BASE}")


if __name__ == "__main__":
    main()
