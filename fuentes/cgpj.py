"""Consejo General del Poder Judicial: estadística judicial de la provincia de Girona.

Cuatro piezas, todas por partido judicial salvo la tercera:

1. Idescat, «Divisió territorial judicial» (codis n=18): municipio -> partido judicial, y la
   geometría de cada partido (unión de sus municipios).
2. Violencia sobre la mujer, boletín trimestral del Observatorio (un Excel por trimestre con una
   fila por partido judicial y otro por provincia): mujeres víctimas, denuncias, órdenes de
   protección y delitos por tipo. Los trimestres ya descargados se guardan y no se vuelven a pedir,
   salvo los dos últimos (el CGPJ los revisa).
3. «Efecto de la crisis en los órganos judiciales», series trimestrales por provincia desde 2013:
   lanzamientos (desahucios) practicados, ejecuciones hipotecarias, monitorios y despidos.
4. Base de datos PC-Axis (zip anual con todos los órganos desde 1995): asuntos penales y civiles,
   lanzamientos, decretos por impago de alquiler y concursos de los juzgados de primera instancia e
   instrucción, sumados por partido judicial, más los totales de Cataluña y España.

Población de las provincias (para las tasas de Cataluña y España): INE, tabla 2852.
"""
from __future__ import annotations

import io
import re
import urllib.parse
import zipfile

import numpy as np
import pandas as pd

from .comun import PROC, carpeta, get, normaliza

CG = "https://www.poderjudicial.es"
CODIS = "https://www.idescat.cat/codis/?id=50&n=18&f=ssv"
VDG_PAG = CG + "/cgpj/es/Temas/Violencia-domestica-y-de-genero/Actividad-del-Observatorio/Datos-estadisticos/"
CRISIS_PAG = CG + "/cgpj/es/Temas/Estadistica-Judicial/Estadistica-por-temas/Datos-penales--civiles-y-laborales/Civil-y-laboral/Efecto-de-la-Crisis-en-los-organos-judiciales/"
PCAXIS_PAG = CG + "/cgpj/es/Temas/Estadistica-Judicial/Base-de-datos-de-la-estadistica-judicial--PC-AXIS-/Estadistica-Judicial-en-PC-Axis-para-uso-en-equipo-local"
PCAXIS_ZIP = "https://www5.poderjudicial.es/estad/BOL1995{a}.zip"
ORDINALS = ["Primer", "Segundo", "Tercer", "Cuarto"]
# Partidos judiciales de la provincia (nombre del CGPJ, sin acentos y en mayúsculas)
PARTITS = ["FIGUERES", "GIRONA", "LA BISBAL D'EMPORDA", "RIPOLL", "SANTA COLOMA DE FARNERS", "OLOT", "BLANES",
           "SANT FELIU DE GUIXOLS", "PUIGCERDA"]
CAT_PROV = {"BARCELONA", "GIRONA", "LLEIDA", "TARRAGONA"}
PX_TAULES = {  # fichero -> (clave, procedimientos que se guardan; None = todos)
    "OUJII001": ("penal", None),
    "OUJII008": ("civil", None),
    "OUJII021": ("llancaments", None),
    "OUJII012": ("impagament", None),
    "OUJII009": ("concursos", None),
}
DES_DE = 2012  # años que se guardan de la base PC-Axis


def enc(u: str) -> str:
    p = urllib.parse.urlsplit(u)
    return urllib.parse.urlunsplit((p.scheme, p.netloc, urllib.parse.quote(urllib.parse.unquote(p.path)), p.query, ""))


def _txt(x) -> str:
    return "" if x is None or (isinstance(x, float) and np.isnan(x)) else re.sub(r"\s+", " ", str(x)).strip()


def _num(x):
    try:
        return float(str(x).replace(",", "."))
    except (TypeError, ValueError):
        return np.nan


def _clau(n: str) -> str:
    """'S. CIVIL E INSTR. DE LA BISBAL D'EMPORDA' -> 'S CIVIL E INSTR DE LA BISBAL D EMPORDA' (sin acentos)."""
    import unicodedata
    s = unicodedata.normalize("NFKD", str(n)).encode("ascii", "ignore").decode().upper()
    return " ".join(re.sub(r"[^A-Z0-9]+", " ", s).split())


# ---------------------------------------------------------------------------
# 1. Municipios y partidos judiciales

def partits(lineas: list[str]) -> pd.DataFrame:
    texto = get(CODIS).content.decode("utf-8-sig")
    actual, files, nivells = {}, [], set()
    for linia in texto.splitlines():
        c = [x.strip() for x in linia.split(";")]
        if len(c) < 3:
            continue
        nivell = c[0].lstrip("﻿")
        nivells.add(nivell)
        if "artit" in nivell.lower():
            actual = {"pj_codi": c[1], "pj_nom": c[2]}
        elif nivell == "Municipi" and c[1].isdigit() and actual:
            files.append({"ine": c[1][:5], "nom": c[2], **actual})
    rel = pd.DataFrame(files)
    if rel.empty:
        raise RuntimeError(f"Idescat n=18 sin municipios; niveles: {sorted(nivells)}")
    gi = rel[rel["ine"].str.startswith("17")].copy()
    sal = carpeta("cgpj")
    gi.to_csv(sal / "municipis_partits.csv", index=False)
    lineas.append(f"partidos judiciales: {gi['pj_nom'].nunique()} en la provincia, {len(gi)} municipios "
                  f"({', '.join(sorted(gi['pj_nom'].unique()))})")
    try:
        import geopandas as gpd
        mun = gpd.read_file(PROC / "geo" / "municipis.geojson")
        col = next(c for c in mun.columns if c.lower() in ("ine", "codi_ine", "codi", "cod_ine"))
        mun["ine"] = mun[col].astype(str).str.zfill(5).str[:5]
        g = mun.merge(gi[["ine", "pj_codi", "pj_nom"]], on="ine").to_crs(25831)
        g = g.dissolve(by=["pj_codi", "pj_nom"], as_index=False)
        g["geometry"] = g.buffer(1).buffer(-1).simplify(60, preserve_topology=True)
        g.to_crs(4326)[["pj_codi", "pj_nom", "geometry"]].to_file(sal / "pj.geojson", driver="GeoJSON", COORDINATE_PRECISION=5)
        lineas.append(f"geometría: {len(g)} partidos")
    except Exception as e:  # noqa: BLE001
        lineas.append(f"ERROR geometría de los partidos: {e}")
    return gi


# ---------------------------------------------------------------------------
# 2. Violencia sobre la mujer (trimestral)

def _fila_cap(df: pd.DataFrame, patro: str) -> tuple[int, int] | None:
    pat = re.compile(patro, re.I)
    for i in range(min(25, len(df))):
        for j, v in enumerate(df.iloc[i].values):
            if pat.search(_txt(v)):
                return i, j
    return None


def _taula_noms(df: pd.DataFrame, cols: dict[str, str]) -> dict[str, dict[str, float]]:
    """{nombre de fila: {clave: valor}} para las columnas cuya cabecera casa con cada patrón."""
    pos = {}
    for k, pat in cols.items():
        p = _fila_cap(df, pat)
        if p:
            pos[k] = p
    if not pos:
        return {}
    ini = max(i for i, _ in pos.values()) + 1
    res = {}
    for i in range(ini, len(df)):
        fila = df.iloc[i].values
        nom = next((_txt(x) for x in fila[:3] if _txt(x) and not re.match(r"^[\d.,-]+$", _txt(x))), "")
        if not nom or nom.startswith("*"):
            continue
        res.setdefault(nom.upper(), {k: _num(fila[j]) for k, (_, j) in pos.items()})
    return res


VDG_COLS = {
    "Denuncias-Renuncias": {"victimes": r"^Mujeres v[ií]ctimas de violencia de g[eé]nero$", "denuncies": r"^Denuncias recibidas",
                            "renuncies": r"se acoge a"},
    "Órdenes y Medidas": {"ordres": r"^N[ºo] Total$|^N[ºo] Total[^*]*$"},
    "Delitos": {"delictes": r"^Total$", "lesions153": r"Art\. 153", "lesions173": r"Art\. 173", "llibertat": r"^Contra la libertad$",
                "sexual": r"indemnidad sexual", "trencaments": r"Quebrantamientos de Pen", "trencaments_m": r"Quebrantamientos\s+de Med"},
}


def _vdg_excel(contenido: bytes, nivell: str) -> pd.DataFrame:
    xl = pd.ExcelFile(io.BytesIO(contenido))
    files = []
    for fulla, cols in VDG_COLS.items():
        nom = next((s for s in xl.sheet_names if s.strip().lower() == fulla.lower()), None)
        if not nom:
            continue
        df = xl.parse(nom, header=None, dtype=object)
        for zona, vals in _taula_noms(df, cols).items():
            for k, v in vals.items():
                files.append({"zona": zona, "var": k, "valor": v})
    d = pd.DataFrame(files)
    if d.empty:
        return d
    if nivell == "pj":
        d = d[d["zona"].isin(PARTITS + ["ESPAÑA", "ESPANA"])]
    else:
        d["zona"] = d["zona"].map(lambda z: normaliza(z).upper())
        d = d[d["zona"].isin(CAT_PROV | {"ESPANA"})]
    return d.drop_duplicates(["zona", "var"])


def vdg(lineas: list[str]) -> None:
    sal = carpeta("cgpj")
    f = sal / "vdg_trimestral.csv"
    prev = pd.read_csv(f) if f.exists() else pd.DataFrame(columns=["any", "trimestre", "nivell", "zona", "var", "valor"])
    fets = {(int(a), int(t)) for a, t in prev[["any", "trimestre"]].drop_duplicates().itertuples(index=False)}
    import datetime as dt
    hoy = dt.date.today()
    cands = [(a, t) for a in range(2019, hoy.year + 1) for t in range(1, 5) if (a, t) < (hoy.year, (hoy.month - 1) // 3 + 1)]
    recents = set(sorted(fets)[-2:]) if fets else set()
    nous, falten = [], []
    for a, t in cands:
        if (a, t) in fets and (a, t) not in recents:
            continue
        html = None
        for var in (f"{ORDINALS[t - 1]}-Trimestre-de-{a}", f"{ORDINALS[t - 1]}-trimestre-de-{a}"):
            try:
                r = get(VDG_PAG + "La-violencia-sobre-la-mujer-en-la-estadistica-judicial--" + var, reintentos=1, timeout=60)
                html = r.text
                break
            except Exception:  # noqa: BLE001
                continue
        if html is None:
            if (a, t) not in fets:
                falten.append(f"{t}T{a}")
            continue
        hrefs = [h.replace("&amp;", "&") for h in re.findall(r'href="([^"]+\.xlsx)[^"]*"', html, re.I)]
        trobat = False
        for nivell, pat in (("pj", r"Juzgados por Partido Judicial"), ("prov", r"Juzgados por Provincias")):
            h = next((x for x in hrefs if re.search(pat, urllib.parse.unquote(x), re.I)), None)
            if not h:
                continue
            try:
                d = _vdg_excel(get(enc(urllib.parse.urljoin(CG, h)), timeout=300).content, nivell)
            except Exception as e:  # noqa: BLE001
                lineas.append(f"ERROR VdG {t}T{a} {nivell}: {e}")
                continue
            if not d.empty:
                trobat = True
                nous.append(d.assign(any=a, trimestre=t, nivell=nivell))
        if not trobat and (a, t) not in fets:
            falten.append(f"{t}T{a}")
    if nous:
        nou = pd.concat(nous)
        claus = set(map(tuple, nou[["any", "trimestre", "nivell"]].drop_duplicates().values))
        prev = prev[[tuple(x) not in claus for x in prev[["any", "trimestre", "nivell"]].values]]
        tot = pd.concat([prev, nou[prev.columns]]).sort_values(["any", "trimestre", "nivell", "zona", "var"])
        tot.to_csv(f, index=False)
    else:
        tot = prev
    if tot.empty:
        lineas.append("ERROR violencia sobre la mujer: ningún trimestre")
        return
    u = tot[["any", "trimestre"]].drop_duplicates().sort_values(["any", "trimestre"])
    gir = tot[(tot["nivell"] == "pj") & (tot["var"] == "denuncies") & (tot["zona"].isin(PARTITS))]
    lineas.append(f"violencia sobre la mujer: {len(u)} trimestres ({u.iloc[0]['trimestre']}T{u.iloc[0]['any']} a "
                  f"{u.iloc[-1]['trimestre']}T{u.iloc[-1]['any']}), {len(nous)} ficheros nuevos; "
                  f"partidos de Girona con denuncias en el último: {gir[(gir['any'] == u.iloc[-1]['any']) & (gir['trimestre'] == u.iloc[-1]['trimestre'])]['zona'].nunique()}")
    if falten:
        lineas.append(f"trimestres sin fichero: {', '.join(falten[:12])}")


# ---------------------------------------------------------------------------
# 3. Efecto de la crisis: series por provincia

CRISIS_FULLES = {  # clave -> patrón del nombre de la hoja
    "llanc_total": r"^Lanzamientos pract.*Total",
    "llanc_hipo": r"^Lanzamientos E\.?\s*hipotecaria",
    "llanc_lau": r"^Lanzamientos L\.?A\.?U",
    "exec_hipo": r"Ej\.?\s*Hipot",
    "monitoris": r"^Monitorios",
    "acomiadaments": r"^Despidos",
    "ocupacio": r"pos\.?\s*ocupa",
}


def crisis(lineas: list[str]) -> None:
    html = get(CRISIS_PAG).text
    hrefs = [h.replace("&amp;", "&") for h in re.findall(r'href="([^"]+\.xlsx)[^"]*"', html, re.I)]
    h = next((x for x in hrefs if re.search(r"Series.*por provincias", urllib.parse.unquote(x), re.I)), None)
    if not h:
        raise RuntimeError("no se encuentra el fichero de series por provincias")
    xl = pd.ExcelFile(io.BytesIO(get(enc(urllib.parse.urljoin(CG, h)), timeout=300).content))
    files = []
    for k, pat in CRISIS_FULLES.items():
        nom = next((s for s in xl.sheet_names if re.search(pat, s.strip(), re.I)), None)
        if not nom:
            lineas.append(f"crisis: sin hoja {k}")
            continue
        df = xl.parse(nom, header=None, dtype=object)
        cap = next((i for i in range(min(20, len(df))) if sum(bool(re.match(r"^\d\d-T\d$", _txt(v))) for v in df.iloc[i].values) >= 4), None)
        if cap is None:
            continue
        cols = {}
        for j, v in enumerate(df.iloc[cap].values):
            m = re.match(r"^(\d\d)-T(\d)$", _txt(v))
            if m:
                q = (2000 + int(m.group(1)), int(m.group(2)))
                if q in cols.values():
                    break  # segundo bloque de la hoja (otra variable)
                cols[j] = q
        vistos = set()
        for i in range(cap + 1, len(df)):
            fila = df.iloc[i].values
            nom_f = next((_txt(x) for x in fila[:3] if _txt(x)), "")
            if not nom_f or nom_f.lower().startswith("evoluc") or any("Evoluci" in _txt(x) for x in fila[:6]):
                break
            z = normaliza(nom_f).upper()
            if z in vistos:
                continue
            vistos.add(z)
            if z in CAT_PROV or z == "TOTAL":
                for j, (a, t) in cols.items():
                    v = _num(fila[j])
                    if v == v:
                        files.append({"var": k, "zona": "ESPANA" if z == "TOTAL" else z, "any": a, "trimestre": t, "valor": v})
    d = pd.DataFrame(files)
    if d.empty:
        raise RuntimeError("crisis: sin datos")
    d.to_csv(carpeta("cgpj") / "crisis_provincies.csv", index=False)
    u = d[["any", "trimestre"]].drop_duplicates().sort_values(["any", "trimestre"]).iloc[-1]
    g = d[(d["zona"] == "GIRONA") & (d["var"] == "llanc_total")]
    lineas.append(f"crisis: {d['var'].nunique()} series, hasta {u['trimestre']}T{u['any']}; lanzamientos Girona último año: "
                  f"{g.sort_values(['any', 'trimestre'])['valor'].tail(4).sum():,.0f}")


# ---------------------------------------------------------------------------
# 4. Base de datos PC-Axis

def _px_valors(cab: str, var: str) -> list[str]:
    m = re.search(r'%s\("%s"\)=(.*?);' % ("VALUES", re.escape(var)), cab, re.S)
    return re.findall(r'"([^"]*)"', m.group(1)) if m else []


def _px_codis(cab: str, var: str) -> list[str]:
    m = re.search(r'CODES\("%s"\)=(.*?);' % re.escape(var), cab, re.S)
    return re.findall(r'"([^"]*)"', m.group(1)) if m else []


def _vs_codis(z: zipfile.ZipFile) -> dict[str, str]:
    """Nombre del órgano -> código (CCAA+provincia+partido+órgano) a partir de los ficheros .vs."""
    res = {}
    for n in z.namelist():
        if not n.lower().endswith(".vs"):
            continue
        txt = z.read(n).decode("latin-1")
        secc, cur = {}, None
        for l in txt.splitlines():
            l = l.strip()
            if l.startswith("[") and l.endswith("]"):
                cur = l[1:-1].lower()
                secc[cur] = {}
            elif cur and "=" in l:
                k, v = l.split("=", 1)
                secc[cur][k.strip()] = v.strip()
        codes, texts = secc.get("valuecode", {}), secc.get("valuetext", {})
        for k, c in codes.items():
            if k in texts:
                res.setdefault(texts[k], c)
    return res


def _org_zona(codi: str | None, nom: str) -> tuple[str | None, str | None]:
    """(partido de Girona o None, CCAA). Los órganos llevan el nombre de la sede del partido
    («J1I nr. 1 GIRONA», «S. CIVIL E INSTR. DE BLANES. PLAZA N. 1»); el código, si lo hay, da la CCAA
    y la provincia."""
    ccaa = codi[:2] if codi and re.match(r"^\d{6}", codi) else None
    if codi and re.match(r"^\d{6}", codi) and codi[2:4] != "17":
        return None, ccaa
    nn = f" {_clau(nom)} "
    for p in PARTITS:
        if f" {_clau(p)} " in nn:
            return p, ccaa
    return None, ccaa


def _px_taula(z: zipfile.ZipFile, nom: str, vs: dict[str, str], lineas: list[str]) -> pd.DataFrame:
    dades = z.read(nom)
    i = dades.find(b"DATA=")
    cab = dades[:i].decode("latin-1")
    stub = re.findall(r'"([^"]+)"', re.search(r"STUB=(.*?);", cab, re.S).group(1))
    head = re.findall(r'"([^"]+)"', re.search(r"HEADING=(.*?);", cab, re.S).group(1))
    dims = stub + head
    vals = {d: _px_valors(cab, d) for d in dims}
    forma = [len(vals[d]) for d in dims]
    cos = re.sub(rb'"[^"]*"', b" nan ", dades[i + 5:].split(b";")[0]).decode("ascii", "replace")
    del dades
    arr = np.fromstring(cos, sep=" ")
    if arr.size != int(np.prod(forma)):
        raise RuntimeError(f"{nom}: {arr.size} valores para forma {forma}")
    arr = arr.reshape(forma)
    ia, io_ = dims.index("ANNOS"), dims.index("ORGJUD")
    anys = [int(a) if a.isdigit() else None for a in vals["ANNOS"]]
    sel = [k for k, a in enumerate(anys) if a and a >= DES_DE]
    arr = np.take(arr, sel, axis=ia)
    anys = [anys[k] for k in sel]
    orgs = vals["ORGJUD"]
    codis = _px_codis(cab, "ORGJUD") or [vs.get(o) for o in orgs]
    zones = [_org_zona(c, o) for c, o in zip(codis, orgs)]
    sense = sum(1 for c in codis if not c)
    grups = {}
    for k, (pj, ccaa) in enumerate(zones):
        if "TOTAL" in orgs[k].upper():
            continue
        grups.setdefault("ESP", []).append(k)
        if ccaa == "09":
            grups.setdefault("CAT", []).append(k)
        if pj:
            grups.setdefault(pj, []).append(k)
    altres = [d for d in dims if d not in ("ANNOS", "ORGJUD")]
    files = []
    for g, ks in grups.items():
        s = np.nansum(np.take(arr, ks, axis=io_), axis=io_)  # dims sin ORGJUD
        dims_s = [d for d in dims if d != "ORGJUD"]
        for idx in np.ndindex(s.shape):
            v = s[idx]
            if not v:
                continue
            fila = {"zona": g}
            for d, x in zip(dims_s, idx):
                fila[d] = anys[x] if d == "ANNOS" else vals[d][x]
            fila["valor"] = float(v)
            files.append(fila)
    d = pd.DataFrame(files).rename(columns={"ANNOS": "any"})
    d["proc"] = d[altres[0]] if altres else ""
    d["sit"] = d[altres[1]] if len(altres) > 1 else ""
    if sense:
        lineas.append(f"{nom.split('/')[-1]}: {sense} de {len(orgs)} órganos sin código (se asignan por nombre)")
    return d[["any", "zona", "proc", "sit", "valor"]]


def pcaxis(lineas: list[str]) -> None:
    import datetime as dt
    html = ""
    try:
        html = get(PCAXIS_PAG).text
    except Exception:  # noqa: BLE001
        pass
    m = re.findall(r'href="([^"]*BOL\d{8}\.zip)"', html, re.I)
    urls = [urllib.parse.urljoin(CG, x) for x in m] or [PCAXIS_ZIP.format(a=a) for a in range(dt.date.today().year, 2023, -1)]
    contingut, url = None, None
    for u in urls:
        try:
            contingut, url = get(u, timeout=900, reintentos=2).content, u
            break
        except Exception:  # noqa: BLE001
            continue
    if contingut is None:
        raise RuntimeError(f"no se ha podido descargar la base PC-Axis ({urls[:2]})")
    z = zipfile.ZipFile(io.BytesIO(contingut))
    vs = _vs_codis(z)
    lineas.append(f"PC-Axis: {url.rsplit('/', 1)[-1]}, {len(vs)} órganos con código en los .vs")
    sal = carpeta("cgpj")
    totes = []
    for fitxer, (clau, _) in PX_TAULES.items():
        nom = next((n for n in z.namelist() if n.upper().endswith(f"/{fitxer}.PX")), None)
        if not nom:
            lineas.append(f"ERROR PC-Axis: falta {fitxer}")
            continue
        try:
            d = _px_taula(z, nom, vs, lineas).assign(taula=clau)
        except Exception as e:  # noqa: BLE001
            lineas.append(f"ERROR PC-Axis {fitxer}: {e}")
            continue
        totes.append(d)
        g = d[d["zona"].isin(PARTITS)]
        lineas.append(f"{fitxer} ({clau}): años {d['any'].min()}-{d['any'].max()}, partidos de Girona {g['zona'].nunique()}, "
                      f"procedimientos {d['proc'].nunique()}: {' | '.join(sorted(d['proc'].unique())[:60])[:1500]}")
    if not totes:
        raise RuntimeError("PC-Axis sin tablas")
    pd.concat(totes).to_csv(sal / "pcaxis_partits.csv.gz", index=False)


# ---------------------------------------------------------------------------

def poblacio(lineas: list[str]) -> None:
    js = get("https://servicios.ine.es/wstempus/js/ES/DATOS_TABLA/2852?nult=15").json()
    files = []
    for s in js:
        parts = [x.strip() for x in s.get("Nombre", "").split(".")]
        if len(parts) < 2 or parts[1] != "Total":
            continue
        zona = parts[0]
        for d in s.get("Data", []):
            files.append({"zona": zona, "any": d.get("Anyo"), "poblacio": d.get("Valor")})
    p = pd.DataFrame(files)
    p["clau"] = p["zona"].map(lambda z: "ESPANA" if "nacional" in z.lower() else normaliza(z).upper())
    p.to_csv(carpeta("cgpj") / "poblacio_provincies.csv", index=False)
    lineas.append(f"población INE 2852: {p['zona'].nunique()} zonas, años {p['any'].min()}-{p['any'].max()}")


def ejecutar() -> str:
    lineas: list[str] = []
    for nom, f in (("partidos", partits), ("población", poblacio), ("violencia sobre la mujer", vdg),
                   ("crisis", crisis), ("PC-Axis", pcaxis)):
        try:
            f(lineas)
        except Exception as e:  # noqa: BLE001
            lineas.append(f"ERROR {nom}: {type(e).__name__}: {str(e)[:300]}")
    return "\n".join(lineas)
