"""Tipos impositivos municipales (Ministerio de Hacienda, SGFAL, «Consulta de tipos impositivos»).

https://serviciostelematicosext.hacienda.gob.es/SGFAL/ConsultaTipos/aspx/listado_municipiosm.aspx

Formulario ASP.NET: se elige año (lbAno) y provincia (lbProvincias) por postback y se piden
los dos «Excel» (en realidad HTML con una tabla):
  linkExcelMunicipio  municipios de la provincia elegida (~1,5 MB)
  linkExcelTodo       todos los municipios de régimen común que han enviado información (~50 MB)

De la provincia se guarda la tabla entera (todas las columnas) por año. Del fichero de toda
España solo se calculan agregados (media ponderada por población, media simple y número de
municipios) de los tipos principales para Cataluña (CCAA 09) y España. País Vasco y Navarra
(régimen foral) no están en la consulta.

Salida en data/processed/tributs/:
  girona.csv.gz    una fila por municipio y año, columnas «grupo | subgrupo | etiqueta»
  claves.csv.gz    tipos principales por municipio y año (ine, any, clave, valor)
  agregats.json    {any: {zona: {clave: {"pond":…, "mitjana":…, "n":…}}}}  zona = gi, cat, esp
"""
from __future__ import annotations

import datetime as dt
import json
import re
import time

import lxml.html
import pandas as pd
import requests

from .comun import UA, carpeta

URL = "https://serviciostelematicosext.hacienda.gob.es/SGFAL/ConsultaTipos/aspx/listado_municipiosm.aspx"
PRE = "ctl00$MainContentPlaceHolder$"
PRIMER_ANY = 2000

# Tipos principales: clave -> función que elige la columna (o columnas) por su etiqueta
def _es(*trozos):
    return lambda c: all(t.lower() in c.lower() for t in trozos)


CLAVES = {
    "ibi_u": _es("IBI", "Urbana"),
    "ibi_rev": _es("IBI", "Rev. Catastral"),
    "ibi_coef": _es("IBI", "Actualizaci"),
    "ibi_r": _es("IBI", "Rústica"),
    "ibi_bice": _es("IBI", "Caract"),
    "iae_max": _es("I.A.E", "max"),
    "iae_min": _es("I.A.E", "min"),
    "ivtm_8": _es("IVTM", "8 a 11,99"),
    "ivtm_12": _es("IVTM", "12 a 15,99"),
    "ivtm_16": _es("IVTM", "16 a 19,99"),
    "ivtm_moto": _es("IVTM", "125 a 250"),
    "iivtnu": lambda c: "I.V.T.N.U" in c and ("Tipo" in c or "gravamen" in c.lower()),
    "icio": _es("ICIO"),
}
# Claves que no se promedian (años, coeficientes técnicos)
SIN_MEDIA = {"ibi_rev", "ibi_coef"}


def num(s: str):
    s = (s or "").strip().replace("\xa0", "")
    if not s or s in ("-", "--"):
        return None
    try:
        return float(s.replace(".", "").replace(",", "."))
    except ValueError:
        return None


def rejilla(tabla) -> list[list[str]]:
    """Expande una tabla HTML con colspan/rowspan a una rejilla de texto."""
    filas, pend = [], {}  # pend[(fila, col)] = texto
    for i, tr in enumerate(tabla.iter("tr")):
        fila, col = [], 0
        for celda in tr:
            if celda.tag not in ("td", "th"):
                continue
            while (i, col) in pend:
                fila.append(pend.pop((i, col))); col += 1
            txt = " ".join(celda.text_content().split())
            cs, rs = int(celda.get("colspan") or 1), int(celda.get("rowspan") or 1)
            for k in range(cs):
                fila.append(txt)
                for j in range(1, rs):
                    pend[(i + j, col + k)] = txt
            col += cs
        while (i, col) in pend:
            fila.append(pend.pop((i, col))); col += 1
        filas.append(fila)
    return filas


def lee_tabla(html: bytes) -> pd.DataFrame:
    if isinstance(html, bytes):
        try:
            html = html.decode("utf-8")
        except UnicodeDecodeError:
            html = html.decode("latin-1")
    doc = lxml.html.fromstring(html)
    tabla = max(doc.iter("table"), key=lambda t: sum(1 for _ in t.iter("tr")))
    g = rejilla(tabla)
    # Las filas de datos empiezan por el código «CC-PP-MMM»
    inicio = next(i for i, f in enumerate(g) if f and re.match(r"^\d{2}-\d{2}-\d{3}$", f[0]))
    cab = g[:inicio]
    ncol = max(len(f) for f in g[inicio:])
    nombres = []
    for c in range(ncol):
        partes = []
        for f in cab:
            t = f[c] if c < len(f) else ""
            if t and t not in partes and not t.startswith("Datos"):
                partes.append(t)
        nombres.append(" | ".join(partes) or f"col{c}")
    # nombres repetidos (no debería) -> sufijo
    vistos = {}
    for k, n in enumerate(nombres):
        if n in vistos:
            vistos[n] += 1; nombres[k] = f"{n} #{vistos[n]}"
        else:
            vistos[n] = 0
    datos = [f + [""] * (ncol - len(f)) for f in g[inicio:] if f and re.match(r"^\d{2}-\d{2}-\d{3}$", f[0])]
    df = pd.DataFrame(datos, columns=nombres)
    cod = df.iloc[:, 0].str.split("-", expand=True)
    df.insert(0, "ccaa", cod[0]); df.insert(1, "prov", cod[1]); df.insert(2, "ine", cod[1] + cod[2])
    return df


def claves(df: pd.DataFrame) -> pd.DataFrame:
    """Tipos principales por municipio (columnas = CLAVES) más la población."""
    cols = list(df.columns)
    out = pd.DataFrame({"ccaa": df["ccaa"], "ine": df["ine"]})
    pob = next((c for c in cols if "Población" in c), None)
    out["pob"] = df[pob].map(num) if pob else None
    for k, f in CLAVES.items():
        sel = [c for c in cols if f(c)]
        if not sel:
            continue
        v = df[sel].apply(lambda col: col.map(num))
        # Plusvalía: varios tipos por periodo de generación; se toma el máximo
        out[k] = v.max(axis=1) if k == "iivtnu" else v.iloc[:, 0]
    return out


def agrega(k: pd.DataFrame) -> dict:
    res = {}
    for c in k.columns:
        if c in ("ccaa", "ine", "pob") or c in SIN_MEDIA:
            continue
        v = k[[c, "pob"]].dropna()
        v = v[v[c] > 0] if c != "ibi_bice" else v
        if v.empty:
            continue
        w = v["pob"].sum()
        res[c] = {"pond": round(float((v[c] * v["pob"]).sum() / w), 4) if w else None,
                  "mitjana": round(float(v[c].mean()), 4), "n": int(len(v))}
    return res


class Formulario:
    def __init__(self):
        self.s = requests.Session()
        self.s.headers["User-Agent"] = UA
        r = self._pide("get")
        self.campos = self._campos(r.text)

    def _pide(self, metodo, **kw):
        for intento in range(4):
            try:
                r = self.s.request(metodo, URL, timeout=600, **kw)
                r.raise_for_status()
                return r
            except requests.RequestException:
                if intento == 3:
                    raise
                time.sleep(5 * (intento + 1))

    @staticmethod
    def _campos(html: str) -> dict:
        doc = lxml.html.fromstring(html)
        d = {}
        for i in doc.iter("input"):
            if i.get("name") and i.get("type", "text") in ("hidden", "text"):
                d[i.get("name")] = i.get("value", "")
        for s in doc.iter("select"):
            op = s.xpath(".//option[@selected]") or s.xpath(".//option")
            if s.get("name") and op:
                d[s.get("name")] = op[0].get("value", "")
        return d

    def postback(self, objetivo: str, **valores):
        d = dict(self.campos)
        d.update({PRE + k: v for k, v in valores.items()})
        d["__EVENTTARGET"], d["__EVENTARGUMENT"] = PRE + objetivo, ""
        r = self._pide("post", data=d)
        if "html" in r.headers.get("content-type", "") and "attachment" not in r.headers.get("content-disposition", ""):
            self.campos = self._campos(r.text)
        return r

    def anys(self) -> list[int]:
        doc = lxml.html.fromstring(self._pide("get").text)
        sel = doc.xpath("//select[contains(@name,'lbAno')]//option/@value")
        return sorted(int(a) for a in sel if a.strip().isdigit())


def ejecutar() -> str:
    out = carpeta("tributs")
    f_agr = out / "agregats.json"
    agregats = json.loads(f_agr.read_text(encoding="utf-8")) if f_agr.exists() else {}
    f_gir, f_cla = out / "girona.csv.gz", out / "claves.csv.gz"
    gir_prev = pd.read_csv(f_gir, dtype=str) if f_gir.exists() else pd.DataFrame()
    cla_prev = pd.read_csv(f_cla, dtype={"ine": str}) if f_cla.exists() else pd.DataFrame()
    hoy = dt.date.today().year
    fm = Formulario()
    anys = [a for a in fm.anys() if a >= PRIMER_ANY]
    log, girs, clas = [], [], []
    for a in anys:
        # Los años cerrados ya descargados no se repiten (el año en curso y el anterior, sí)
        if str(a) in agregats and a < hoy - 1 and not gir_prev.empty and (gir_prev["any"] == str(a)).any():
            girs.append(gir_prev[gir_prev["any"] == str(a)])
            clas.append(cla_prev[cla_prev["any"] == a])
            continue
        try:
            fm.postback("lbAno", lbAno=str(a), lbProvincias="17")
            fm.postback("lbProvincias", lbAno=str(a), lbProvincias="17")
            g = lee_tabla(fm.postback("linkExcelMunicipio", lbAno=str(a), lbProvincias="17").content)
            g = g[g["prov"] == "17"]
            g.insert(0, "any", str(a))
            girs.append(g.astype(str))
            kg = claves(g)
            ag = {"gi": agrega(kg)}
            try:
                t = lee_tabla(fm.postback("linkExcelTodo", lbAno=str(a), lbProvincias="17").content)
                kt = claves(t)
                ag["cat"], ag["esp"] = agrega(kt[kt["ccaa"] == "09"]), agrega(kt)
                ag["n_esp"] = int(len(kt))
            except Exception as e:  # noqa: BLE001 - el fichero de toda España es grande; seguir sin él
                log.append(f"{a}: sin España ({type(e).__name__}: {str(e)[:80]})")
                ag.update({z: agregats.get(str(a), {}).get(z, {}) for z in ("cat", "esp")})
            agregats[str(a)] = ag
            kg = kg.drop(columns=["ccaa"]).melt(id_vars=["ine"], var_name="clave", value_name="valor").dropna()
            kg.insert(1, "any", a)
            clas.append(kg)
            log.append(f"{a}: {len(g)} municipios de Girona, {ag.get('n_esp', '?')} de España")
        except Exception as e:  # noqa: BLE001
            log.append(f"{a}: ERROR {type(e).__name__}: {str(e)[:120]}")
        time.sleep(1)
    if girs:
        pd.concat(girs, ignore_index=True).to_csv(f_gir, index=False, compression="gzip")
    if clas:
        pd.concat(clas, ignore_index=True).sort_values(["any", "ine", "clave"]).to_csv(f_cla, index=False, compression="gzip")
    f_agr.write_text(json.dumps(dict(sorted(agregats.items())), ensure_ascii=False, indent=0), encoding="utf-8")
    return "\n".join(log)
