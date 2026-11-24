"""Más estadísticas del Catastro (se llaman desde cadastre.ejecutar):

1. Titularidad (estadisticas_3_1): sujetos pasivos del IBI e inmuebles de uso residencial por
   municipio, según el número de inmuebles de cada titular y el tipo de persona (física nacional o
   extranjera, sociedad, entidad, administración). CSV desde 2024.
2. Altas (estadisticas_3_2): inmuebles residenciales que se dan de alta cada año desde 2008, por
   municipio y tipo de titular.
3. Urbana trimestral (estadisticas_2): antigüedad de las construcciones, categoría, usos y suelo
   sin edificar por municipio. Un CSV por trimestre desde 2021; se guarda el último de cada año.
4. Rústica por tipo de cultivo (estadisticas_10): % de superficie por cultivo, del paquete PC-Axis.
5. Bienes inmuebles de características especiales (estadisticas_11): BICE por municipio.
6. Piscinas (estadisticas_12): piscinas cubiertas y no cubiertas por municipio, CSV desde 2022.
7. Tipos de gravamen (estadisticas_9, PC-Axis 04117): IBI urbana, rústica y BICE por grupos (A-D).

El portal devuelve una página HTML con código 200 cuando un fichero no existe: se descarta.

Genera en data/processed/cadastre/:
  titulars.csv.gz       codi_ine, any y sumas de viviendas por tipo de titular y tamaño
  altes.csv.gz          codi_ine, any, altas residenciales por tipo de titular
  trimestral.csv.gz     codi_ine, any, trimestre y columnas del fichero trimestral
  cultius.csv.gz        codi_ine, any, cultivo, % de superficie
  bice.csv.gz           codi_ine, any, unidades, valor y tipos
  piscines.csv.gz       codi_ine, any, cub (cubiertas), desc (no cubiertas)
  gravamen.csv.gz       codi_ine, any, rev (año de la ponencia), urb, rus, bice_a..bice_d
  detall_referencies.json  sumas por año para Girona (gi), Cataluña (cat) y España (esp)
"""
from __future__ import annotations

import datetime as dt
import io
import json
import re
import zipfile

import pandas as pd

from .comun import RAW, get

C = "https://www.catastro.hacienda.gob.es/documentos/estadisticas/"
CAT = ("08", "17", "25", "43")
# Tipos de titular del fichero «desglose por tipología de persona fiscal»
TIPUS = {"FIS_NA": "fna", "FIS_EX": "fex", "SOCIEDADES": "soc", "ENTIDADES_SINAL": "esal", "ENTIDADES_SINPJ": "espj",
         "ENTIDADES_EXT": "jex", "AAPP": "aapp", "ENTIDADES_NDEF": "ndef", "OTROS": "otr"}
# Tramos de número de inmuebles por titular: hasta 1, 2-5, 6-10, 11-25, 26-100, más de 100
TRAMS = {"1I": "t1", "5I": "t5", "10I": "t10", "25I": "t25", "100I": "t100", "MAS100": "tm"}
ALTES = ["ALTAS", "PF_NACIONALES", "PF_EXTRANJERAS", "SOCIEDADES", "ESAL", "ESPJ", "PJ_EXTRANJERAS", "AAPP", "OTRAS"]
# Cultivos de la tabla 04217 (Girona por municipios y tipo de cultivo)
CULTIUS = {"Labor secano": "sec", "Labor regadío": "reg", "Pastos y terrenos incultos": "past", "Olivar": "oli", "Viña": "vin",
           "Cítricos": "citr", "Frutales": "fru", "Frutos secos": "fsec", "Plantas subtropicales y mediterráneas": "subt",
           "Especies maderables de crecimiento lento": "fus_l", "Especies maderables de crecimiento rápido": "fus_r", "Otros": "altres"}
BICE = ["TOTAL", "UNIDADES_SINGULARIZADAS", "TITULARES", "VC_MILES"]


def _csv(url: str, **kw) -> pd.DataFrame | None:
    """Descarga un CSV del portal; None si no existe (el portal responde con HTML)."""
    try:
        r = get(url, timeout=300)
    except Exception:  # noqa: BLE001
        return None
    if "html" in r.headers.get("content-type", "") or r.content[:200].lstrip().lower().startswith((b"<!doctype", b"<html")):
        return None
    txt = r.content.decode("utf-8-sig") if r.content[:3] == b"\xef\xbb\xbf" else r.content.decode("latin-1")
    d = pd.read_csv(io.StringIO(txt), sep=";", dtype=str, index_col=False, **kw)
    d.columns = [c.strip().strip("'\"").upper() for c in d.columns]
    for c in d.columns:
        d[c] = d[c].astype(str).str.strip().str.strip("'\"").str.strip()
    return d


def _num(d: pd.DataFrame, cols) -> pd.DataFrame:
    for c in cols:
        if c in d.columns:
            d[c] = pd.to_numeric(d[c].str.replace(",", ".", regex=False), errors="coerce")
    return d


def _refs(d: pd.DataFrame, cols: list[str], clau: str = "codi_ine") -> dict:
    """{gi|cat|esp: {año: {col: suma}}} a partir de un fichero de toda España."""
    out = {}
    for z, f in (("esp", d[clau].str.len() == 5), ("cat", d[clau].str[:2].isin(CAT)), ("gi", d[clau].str[:2] == "17")):
        g = d[f].groupby("any")[cols].sum(min_count=1)
        out[z] = {str(int(a)): {k: (None if pd.isna(v) else round(float(v), 2)) for k, v in fila.items()} for a, fila in g.iterrows()}
    return out


def _titulars(res: list[str]) -> tuple[pd.DataFrame | None, dict]:
    parts = []
    for any_ in range(2024, dt.date.today().year + 2):
        v = _csv(C + f"propietarios/{any_}/P_SPI_mun_V.csv")
        t = _csv(C + f"propietarios/{any_}/P_SPI_mun_V_TPF.csv")
        if v is None or t is None:
            continue
        for d in (v, t):
            d["codi_ine"] = d["CODINE"].str.zfill(5)
        v = _num(v, [c for c in v.columns if c.startswith(("U_", "I_U_", "NUM_", "INMUEBLES"))])
        t = _num(t, [c for c in t.columns if c.startswith(("SP_U_", "I_U_", "NUM_", "PROPIEDADES"))])
        o = pd.DataFrame({"codi_ine": v["codi_ine"], "sp": v["NUM_SUJETOS_PASIVOS"], "inm": v["INMUEBLES"]})
        # Viviendas según el tamaño del titular (todas las personas)
        for tr, k in (("HASTA_1", "t1"), ("HASTA_5", "t5"), ("HASTA_10", "t10"), ("HASTA_25", "t25"), ("HASTA_100", "t100"), ("MAYOR_100", "tm")):
            o["i_" + k] = v[[c for c in v.columns if c.startswith("I_U_") and c.endswith("_" + tr)]].sum(axis=1, min_count=1)
            o["s_" + k] = v[[c for c in v.columns if c.startswith("U_") and c.endswith("_" + tr)]].sum(axis=1, min_count=1)
        o = o.set_index("codi_ine")
        tt = t.set_index("codi_ine")
        for tp, k in TIPUS.items():
            o["i_" + k] = tt[[c for c in tt.columns if c.startswith("I_U_") and c.endswith("_" + tp)]].sum(axis=1, min_count=1)
            o["s_" + k] = tt[[c for c in tt.columns if c.startswith("SP_U_") and c.endswith("_" + tp)]].sum(axis=1, min_count=1)
        # Viviendas de sociedades con más de 10 viviendas en el municipio
        o["i_soc10"] = tt[[f"I_U_{tr}_SOCIEDADES" for tr in ("25I", "100I", "MAS100") if f"I_U_{tr}_SOCIEDADES" in tt.columns]].sum(axis=1, min_count=1)
        o = o.reset_index()
        o.insert(1, "any", any_)
        parts.append(o)
        res.append(f"titularidad {any_}: {len(o)} municipios")
    if not parts:
        res.append("ERROR titularidad: ningún año")
        return None, {}
    d = pd.concat(parts, ignore_index=True)
    refs = _refs(d, [c for c in d.columns if c not in ("codi_ine", "any")])
    return d[d["codi_ine"].str[:2] == "17"], refs


def _altes(res: list[str]) -> tuple[pd.DataFrame | None, dict]:
    m = _csv(C + "altasuso/altur_m17_vi.csv")
    if m is None:
        res.append("ERROR altas: no está altur_m17_vi.csv")
        return None, {}
    m["codi_ine"] = m["CODINE"].str.zfill(5)
    m["any"] = pd.to_numeric(m["EJERCICIO"], errors="coerce")
    m = _num(m, ALTES)
    m = m.groupby(["codi_ine", "any"])[[c for c in ALTES if c in m.columns]].sum(min_count=1).reset_index()
    refs = {"gi": {str(int(a)): {k: float(v) for k, v in f.items() if pd.notna(v)} for a, f in m.groupby("any")[[c for c in ALTES if c in m.columns]].sum().iterrows()}}
    # Cataluña y España: fichero por comunidades (una fila por comunidad, año y uso)
    a = _csv(C + "altasuso/altur_aut_vi.csv")
    if a is not None:
        a["any"] = pd.to_numeric(a.get("EJERCICIO"), errors="coerce")
        a = _num(a, ALTES)
        cols = [c for c in ALTES if c in a.columns]
        es_cat = a.apply(lambda f: any(re.search(r"CATALU", str(x), re.I) for x in f.values) or str(f.iloc[0]).strip().zfill(2) == "09", axis=1)
        for z, f in (("esp", slice(None)), ("cat", es_cat)):
            g = a[f].groupby("any")[cols].sum(min_count=1)
            refs[z] = {str(int(y)): {k: float(v) for k, v in fila.items() if pd.notna(v)} for y, fila in g.iterrows()}
    res.append(f"altas residenciales: {m['codi_ine'].nunique()} municipios, {int(m['any'].min())}-{int(m['any'].max())}")
    return m, refs


def _trimestral(res: list[str]) -> tuple[pd.DataFrame | None, dict]:
    parts = []
    for any_ in range(2021, dt.date.today().year + 1):
        for q in (4, 3, 2, 1):
            d = _csv(C + f"trimestralesurbana/Urbana_T0{q}_{any_}.csv")
            if d is not None and "CODINE" in d.columns:
                break
        else:
            continue
        d["codi_ine"] = d["CODINE"].str.zfill(5)
        d = d[d["codi_ine"].str.fullmatch(r"\d{5}")]
        nums = [c for c in d.columns if c not in ("CODINE", "MUNINENOMBRE", "codi_ine")]
        d = _num(d, nums)
        d = d[["codi_ine", *nums]]
        d.insert(1, "any", any_)
        d.insert(2, "trim", q)
        parts.append(d)
        res.append(f"urbana trimestral {any_}: T{q}, {len(d)} municipios")
    if not parts:
        res.append("ERROR urbana trimestral: ningún fichero")
        return None, {}
    t = pd.concat(parts, ignore_index=True)
    suma = [c for c in t.columns if c not in ("codi_ine", "any", "trim", "PONENCIA") and not c.startswith("SUP_MEDIA")]
    refs = _refs(t, suma)
    return t[t["codi_ine"].str[:2] == "17"], refs


def _px_long(text: str) -> tuple[dict, list[str], list]:
    cap, dades = text.split("DATA=", 1)
    dims = {m.group(1): re.findall(r'"([^"]*)"', m.group(2)) for m in re.finditer(r'VALUES\("([^"]+)"\)=(.*?);', cap, re.S)}
    ordre = re.findall(r'"([^"]+)"', re.search(r"STUB=(.*?);", cap, re.S).group(1)) + re.findall(r'"([^"]+)"', re.search(r"HEADING=(.*?);", cap, re.S).group(1))
    toks = re.findall(r'"[^"]*"|[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?', dades.split(";")[0])
    nums = [None if x.startswith('"') else float(x) for x in toks]
    return dims, ordre, nums


def _cultius(z: zipfile.ZipFile, res: list[str]) -> tuple[pd.DataFrame | None, dict]:
    files, refs = [], {"gi": {}, "cat": {}}
    for n in z.namelist():
        m = re.fullmatch(r"px/est(\d{4})/catastro/rustico/(04217|03002|02002)\.px", n, re.I)
        if not m:
            continue
        any_, taula = int(m.group(1)), m.group(2)
        try:
            dims, ordre, nums = _px_long(z.read(n).decode("latin-1"))
            files_, cult, vars_ = dims[ordre[0]], dims[ordre[1]], dims[ordre[2]]
            iS = next(i for i, v in enumerate(vars_) if v.lower().startswith("superficie"))
            if len(nums) != len(files_) * len(cult) * len(vars_):
                res.append(f"AVISO cultivos {any_} {taula}: tamaño inesperado")
                continue
            for i, fila in enumerate(files_):
                for j, cu in enumerate(cult):
                    v = nums[(i * len(cult) + j) * len(vars_) + iS]
                    k = CULTIUS.get(cu.strip())
                    if k is None or v is None:
                        continue
                    if taula == "04217":
                        cod = fila.split()[0]
                        if re.fullmatch(r"17\d{3}", cod):
                            files.append((cod, any_, k, v))
                    elif (taula == "03002" and re.search(r"girona", fila, re.I)) :
                        refs["gi"].setdefault(str(any_), {})[k] = v
                    elif taula == "02002" and re.search(r"catalu", fila, re.I):
                        refs["cat"].setdefault(str(any_), {})[k] = v
        except Exception as e:  # noqa: BLE001
            res.append(f"AVISO cultivos {n}: {e}")
    if not files:
        res.append("ERROR cultivos: ninguna tabla 04217")
        return None, {}
    d = pd.DataFrame(files, columns=["codi_ine", "any", "cultiu", "pct"])
    res.append(f"cultivos: {d['codi_ine'].nunique()} municipios, años {d['any'].min()}-{d['any'].max()}")
    return d, refs


def _bice(res: list[str]) -> tuple[pd.DataFrame | None, dict]:
    parts = []
    for any_ in range(2020, dt.date.today().year + 1):
        d = _csv(C + f"est{any_}/bices/bices_municipio.csv")
        if d is None or "CODINE" not in d.columns:
            continue
        d["codi_ine"] = d["CODINE"].str.zfill(5)
        tipus = [c for c in d.columns if re.match(r"^[A-D]\d?_", c)]
        d = _num(d, BICE + tipus)
        d = d[["codi_ine", *[c for c in BICE if c in d.columns], *tipus]]
        d.insert(1, "any", any_)
        parts.append(d)
        res.append(f"BICE {any_}: {len(d)} municipios")
    if not parts:
        res.append("ERROR BICE: ningún fichero")
        return None, {}
    t = pd.concat(parts, ignore_index=True)
    refs = _refs(t, [c for c in t.columns if c not in ("codi_ine", "any")])
    return t[t["codi_ine"].str[:2] == "17"], refs


def _piscines(res: list[str]) -> tuple[pd.DataFrame | None, dict]:
    parts = []
    for any_ in range(2022, dt.date.today().year + 2):
        fs = {}
        for k, nom in (("cub", "piscinas_cubiertas"), ("desc", "piscinas_no_cubiertas")):
            d = _csv(C + f"piscinas/{any_}/{nom}_{any_}.csv")
            if d is None or "CODINE" not in d.columns:
                continue
            d["codi_ine"] = d["CODINE"].str.zfill(5)
            if "MUNINENOMBRE" in d.columns:
                for nm, c in zip(d["MUNINENOMBRE"], d["codi_ine"]):
                    if c.startswith("17"):
                        _NOMS.setdefault(_nom(nm), c)
            fs[k] = _num(d, ["TOTAL"]).groupby("codi_ine")["TOTAL"].sum()
        if not fs:
            continue
        o = pd.DataFrame(fs).reset_index().rename(columns={"index": "codi_ine"})
        for k in ("cub", "desc"):
            if k not in o.columns:
                o[k] = None
        o.insert(1, "any", any_)
        parts.append(o)
        res.append(f"piscinas {any_}: {len(o)} municipios")
    if not parts:
        res.append("ERROR piscinas: ningún fichero")
        return None, {}
    t = pd.concat(parts, ignore_index=True)
    refs = _refs(t, ["cub", "desc"])
    return t[t["codi_ine"].str[:2] == "17"], refs


_NOMS: dict[str, str] = {}  # nombre del municipio (normalizado) -> código INE, de los CSV de piscinas


def _nom(n: str) -> str:
    """«Far d'Empordà (El)» y «Far d'Empordà, El» -> «far d'empordà, el»."""
    n = re.sub(r"\s+", " ", n.strip().lower().replace("’", "'"))
    m = re.fullmatch(r"(.*?) \((.+)\)", n)
    return f"{m.group(1)}, {m.group(2)}" if m else n


def _gravamen(z: zipfile.ZipFile, res: list[str]) -> pd.DataFrame | None:
    """Tipos de gravamen por municipio de Girona (tabla 04117 de ordenanzas fiscales, 2006-).
    Hasta 2013 la tabla trae CODES con el código INE; después solo el nombre del municipio."""
    files, noms = [], dict(_NOMS)
    taules = sorted((int(m.group(1)), n) for n in z.namelist() if (m := re.search(r"est(\d{4})/ordenanzasfiscales/04117\.px$", n, re.I)))
    for any_, n in taules:
        try:
            text = z.read(n).decode("latin-1")
            cap, dades = text.split("DATA=", 1)
            vals = {m.group(1).lower(): re.findall(r'"([^"]*)"', m.group(2)) for m in re.finditer(r'VALUES\("([^"]+)"\)\s*=(.*?);', cap, re.S)}
            codes = {m.group(1).lower(): re.findall(r'"([^"]*)"', m.group(2)) for m in re.finditer(r'CODES\("([^"]+)"\)\s*=(.*?);', cap, re.S)}
            stub = re.findall(r'"([^"]+)"', re.search(r"STUB=(.*?);", cap, re.S).group(1))[0].lower()
            head = re.findall(r'"([^"]+)"', re.search(r"HEADING=(.*?);", cap, re.S).group(1))[0].lower()
            muns, vars_ = vals[stub], vals[head]
            cods = codes.get(stub)
            if cods:
                for nm, c in zip(muns, cods):
                    noms.setdefault(_nom(nm), c)
            for nm in muns:
                if mc := re.match(r"(17\d{3})\b\s*[-–]?\s*(.*)", nm.strip()):
                    noms.setdefault(_nom(mc.group(2)), mc.group(1))
            toks = re.findall(r'"[^"]*"|[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?', dades.replace(";", " "))
            nums = [None if x.startswith('"') else float(x) for x in toks]
            if len(nums) != len(muns) * len(vars_):
                res.append(f"AVISO gravamen {any_}: {len(nums)} valores para {len(muns)}×{len(vars_)}")
                continue
            col = {}
            for j, v in enumerate(vars_):
                vl = v.lower().strip()
                k = ("rev" if "valora" in vl else "urb" if vl == "urbana" else "rus" if vl.startswith("r") and "stica" in vl
                     else ("bice_" + vl[-1]) if vl.startswith("bice") and vl[-1] in "abcd" else None)
                if k:
                    col[k] = j
            falten = 0
            for i, mu in enumerate(muns):
                mc = re.match(r"(17\d{3})\b\s*[-–]?\s*(.*)", mu.strip())
                cands = [cods[i] if cods else None, mc.group(1) if mc else None, noms.get(_nom(mc.group(2) if mc else mu))]
                if cods and len(cods[i]) < 5 and cods[i].isdigit():
                    cands.append("17" + cods[i].zfill(3))
                cod = next((c for c in cands if c and re.fullmatch(r"17\d{3}", c)), None)
                if not cod or not re.fullmatch(r"17\d{3}", cod):
                    falten += 1
                    continue
                files.append({"codi_ine": cod, "any": any_, **{k: nums[i * len(vars_) + j] for k, j in col.items()}})
            if falten:
                res.append(f"AVISO gravamen {any_}: {falten} municipios sin código (ej. {muns[:2]}, códigos {(cods or [])[:2]}; {', '.join(m for m in muns if not noms.get(_nom(m)) and not re.match(r"17\d{3}", m))[:200]})")
        except Exception as e:  # noqa: BLE001
            res.append(f"AVISO gravamen {n}: {e}")
    if not files:
        res.append("ERROR gravamen: ninguna tabla 04117")
        return None
    d = pd.DataFrame(files)
    res.append(f"gravamen: {d['codi_ine'].nunique()} municipios, años {d['any'].min()}-{d['any'].max()}")
    return d


def ejecutar(out, res: list[str]) -> None:
    refs = {}
    for nom, fn in (("titulars", _titulars), ("altes", _altes), ("trimestral", _trimestral), ("bice", _bice), ("piscines", _piscines)):
        try:
            d, r = fn(res)
        except Exception as e:  # noqa: BLE001
            res.append(f"ERROR {nom}: {e}")
            continue
        if d is not None:
            d.to_csv(out / f"{nom}.csv.gz", index=False)
            refs[nom] = r
    ruta = RAW / "cadastre" / "px.zip"
    if ruta.exists():
        try:
            with zipfile.ZipFile(ruta) as z:
                d, r = _cultius(z, res)
            if d is not None:
                d.to_csv(out / "cultius.csv.gz", index=False)
                refs["cultius"] = r
        except Exception as e:  # noqa: BLE001
            res.append(f"ERROR cultivos: {e}")
        try:
            with zipfile.ZipFile(ruta) as z:
                d = _gravamen(z, res)
            if d is not None:
                d.to_csv(out / "gravamen.csv.gz", index=False)
        except Exception as e:  # noqa: BLE001
            res.append(f"ERROR gravamen: {e}")
    (out / "detall_referencies.json").write_text(json.dumps(refs, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
