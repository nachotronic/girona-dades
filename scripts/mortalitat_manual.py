"""Carga manual (anual) de l'«Anàlisi de la mortalitat a Catalunya» (Departament de Salut).

El Departament de Salut publica cada año un Excel con las tablas del informe (Annex de taules).
Se descarga a mano de https://salutweb.gencat.cat/ca/el_departament/estadistiques-sanitaries/dades-de-salut-i-serveis-sanitaris/mortalitat/
(o lo sube Nacho) y se ejecuta:

    python scripts/mortalitat_manual.py ruta/analisi-mortalitat-catalunya-AAAA-taules.xlsx

Lo que trae y se usa:
  - Comarques (hoja «Comarques»): defunciones y población por edad y sexo (10.1), defunciones por 20 grupos de
    causas y edad (10.2), tasa estandarizada (10.3), índice de mortalidad estándar (10.4) y esperanza de vida (10.5).
  - Regió sanitària de Girona (hoja «Regions sanitàries»): esperanza de vida (9.4), mortalidad evitable (9.5),
    tasas estandarizadas por causa (9.6), población (9.1) y defunciones por causa y edad (9.2).
  - Catalunya: tasas generales (1.1, 1.2), causas (2.1, 2.4), evitable (6.1, 6.2), tabla de vida (7).
No trae nada por municipio ni por ABS.

OJO: en la edición 2024 las tablas 10.3 y 10.4 tienen las etiquetas de comarca desplazadas una fila (Aran va
detrás de Anoia en las etiquetas y detrás de Urgell en los valores). Por eso se recalcula la tasa estandarizada
de cada comarca con la tabla 10.1 y se asigna cada fila al orden que mejor encaja (el de las etiquetas o el de
la tabla 10.1). Si ninguno encaja, el script se para.

Además se calculan (población estándar europea 2013, grupos de edad de las tablas de causas):
  - tasa estandarizada por grupo de causas para cada comarca, la región y Cataluña;
  - mortalidad prematura: tasa estandarizada de las defunciones antes de los 75 años.

Con el otro Excel del informe, «…-evolucio-1983-AAAA.xlsx», el mismo script lee la evolución del índex de
mortalitat estàndard por comarca (1999-) y región sanitaria (2005-) -> mortalitat_ime_evol.csv (ver evolucio_ime).

Escribe en data/processed/mortalitat/:
  mortalitat.csv        any, nivell (com / rs / cat), ambit, ind, sexe (d / h / t), v, li, ls
  mortalitat_meta.json  edición, fichero de origen y fecha de carga
Cada carga sustituye las filas de su año y conserva las de los otros años.
"""
from __future__ import annotations

import datetime
import json
import math
import pathlib
import re
import sys
import unicodedata

import openpyxl
import pandas as pd

RAIZ = pathlib.Path(__file__).resolve().parent.parent
SAL = RAIZ / "data" / "processed" / "mortalitat"

# Población estándar europea 2013 en los grupos de edad de las tablas de causas
BANDES = ["<1", "1-4", "5-14", "15-24", "25-34", "35-44", "45-54", "55-64", "65-74", "75-84", ">84"]
PES = [1000, 4000, 11000, 11500, 12500, 14000, 14000, 12500, 10500, 6500, 2500]
# Edad inicial de los grupos quinquenales de la tabla 10.1 / 1.1 -> índice de banda
QUINQ = {0: 0, 1: 1, 5: 2, 10: 2, 15: 3, 20: 3, 25: 4, 30: 4, 35: 5, 40: 5, 45: 6, 50: 6, 55: 7, 60: 7, 65: 8, 70: 8, 75: 9, 80: 9, 85: 10}
CAUSES = {"I": "inf", "II": "tum", "III": "sang", "IV": "endo", "V": "ment", "VI": "nerv", "VII": "ull", "VIII": "oida", "IX": "circ",
          "X": "resp", "XI": "dig", "XII": "pell", "XIII": "osteo", "XIV": "genit", "XV": "emb", "XVI": "perin", "XVII": "cong",
          "XVIII": "mal", "XX": "ext"}
SEXES = {"Dones": "d", "Homes": "h", "Total": "t"}
# Comarcas con municipios de la provincia de Girona (la Cerdanya y Osona, enteras)
COM_GI = {"ALT EMPORDA": "Alt Empordà", "BAIX EMPORDA": "Baix Empordà", "CERDANYA": "Cerdanya", "GARROTXA": "Garrotxa",
          "GIRONES": "Gironès", "OSONA": "Osona", "PLA DE L'ESTANY": "Pla de l'Estany", "RIPOLLES": "Ripollès", "SELVA": "Selva"}


def _txt(v) -> str:
    return re.sub(r"\s+", " ", "" if v is None else str(v)).strip()


def _norm(s) -> str:
    s = unicodedata.normalize("NFKD", _txt(s).upper().replace("’", "'"))
    s = "".join(c for c in s if not unicodedata.combining(c))
    return re.sub(r"\s*\(.*\)$", "", s).strip()


def _num(v):
    if isinstance(v, (int, float)) and not (isinstance(v, float) and math.isnan(v)):
        return float(v)
    return None


def _files(ws) -> list[list]:
    return [[c for c in r if c is not None and _txt(c) != ""] for r in ws.iter_rows(values_only=True)]


def _busca(files, patro, des=0) -> int:
    for i in range(des, len(files)):
        if any(isinstance(c, str) and re.match(patro, c.strip()) for c in files[i]):
            return i
    raise ValueError(f"no se encuentra la tabla {patro!r}")


def _causa(nom: str) -> str | None:
    m = re.match(r"^\s*([IVX]+)\s*\.", str(nom))
    return CAUSES.get(m.group(1)) if m else None


def _edat(e) -> int | None:
    """'<1' -> 0, '1-4' -> 1, '>84' -> 85, 'En néixer' -> 0 (tabla de vida)"""
    t = _txt(e)
    if t.startswith("<"):
        return 0
    if t.startswith(">"):
        return int(re.sub(r"\D", "", t)) + 1
    m = re.match(r"^(\d+)", t)
    return int(m.group(1)) if m else None


# ---------------------------------------------------------------- cálculo
def tme(def_banda: list[float], pob_banda: list[float], fins: int = len(BANDES)) -> float | None:
    """Tasa estandarizada (población europea 2013) por 100.000, con las bandas hasta `fins` (sin incluir)."""
    if any(p <= 0 for p in pob_banda[:fins]):
        return None
    pes = PES[:fins]
    return 100000 * sum(w * d / p for w, d, p in zip(pes, def_banda, pob_banda)) / sum(pes)


def _a_bandes(per_edat: dict[int, float]) -> list[float]:
    b = [0.0] * len(BANDES)
    for e, v in per_edat.items():
        b[QUINQ.get(e, 10 if e >= 85 else None)] += v
    return b


# ---------------------------------------------------------------- lectores
def taula_edats(files, i0, i1) -> dict[str, dict]:
    """Bloques «NOM / Defuncions Població Taxes / Dones Homes Total / filas por edad» (tablas 10.1 y 1.1).
    Devuelve {nom: {"def": {sexe: {edat: n}}, "pob": {...}}} en el orden de la tabla."""
    res, cur = {}, None
    for i in range(i0, i1):
        f = files[i]
        if len(f) == 1 and isinstance(f[0], str) and not f[0].startswith(("↓", "↑", "<", "^", "Font")) and _edat(f[0]) is None:
            cur = _norm(f[0])
            res[cur] = {"def": {"d": {}, "h": {}, "t": {}}, "pob": {"d": {}, "h": {}, "t": {}}}
            continue
        if len(f) >= 7 and isinstance(f[0], (str, int)) and _edat(f[0]) is not None and _num(f[1]) is not None:
            if cur is None:
                cur = "CATALUNYA"
                res[cur] = {"def": {"d": {}, "h": {}, "t": {}}, "pob": {"d": {}, "h": {}, "t": {}}}
            e = _edat(f[0])
            for k, s in enumerate("dht"):
                res[cur]["def"][s][e] = _num(f[1 + k])
                res[cur]["pob"][s][e] = _num(f[4 + k])
    return res


def taula_causes(files, i0, i1, capcalera: bool) -> dict[str, dict]:
    """Bloques de defunciones por 20 grupos de causas y edad (10.2, 9.2, 2.1): {nom: {sexe: {causa: [n por banda]}}}.
    `capcalera`: los bloques empiezan con una fila «NOM, Defuncions, Taxa…»."""
    res, cur, sexe = {}, None if capcalera else "CATALUNYA", None
    if not capcalera:
        res[cur] = {}
    for i in range(i0, i1):
        f = files[i]
        if not f:
            continue
        if capcalera and isinstance(f[0], str) and len(f) >= 2 and _txt(f[1]) == "Defuncions":
            cur = _norm(f[0]); res[cur] = {}; continue
        if len(f) == 1 and _txt(f[0]) in SEXES:
            sexe = SEXES[_txt(f[0])]; res.setdefault(cur, {})[sexe] = {}; continue
        if cur and sexe and isinstance(f[0], str) and len(f) >= 12:
            c = _causa(f[0]) or ("total" if _txt(f[0]) == "Total" else None)
            if c:
                res[cur][sexe][c] = [_num(x) or 0 for x in f[1:12]]
    return {k: v for k, v in res.items() if v}


def taula_ci(files, i0, n_max=60) -> list[tuple[str, list]]:
    """Tablas «nom, valor, LI, LS» × 3 sexos (10.3, 10.4): lista de (nom, [v,li,ls]*3) en el orden de la tabla."""
    out = []
    for i in range(i0, min(i0 + n_max, len(files))):
        f = files[i]
        if out and (not f or not isinstance(f[0], str) or len(f) < 10):
            break
        if f and isinstance(f[0], str) and len(f) >= 10 and all(_num(x) is not None for x in f[1:10]):
            out.append((_norm(f[0]), [_num(x) for x in f[1:10]]))
    return out


def esperanca_com(files, i0) -> dict[str, list]:
    """10.5: nom -> [d0,d5,d25,d45,d65,d85, h0..., t0...]"""
    out = {}
    for i in range(i0, len(files)):
        f = files[i]
        if out and (not f or not isinstance(f[0], str)):
            break
        if f and isinstance(f[0], str) and len(f) >= 19 and _num(f[1]) is not None:
            out[_norm(f[0])] = [_num(x) for x in f[1:19]]
    return out


# ---------------------------------------------------------------- hojas
def comarques(wb) -> tuple[list[dict], dict]:
    F = _files(wb["Comarques"])
    i1, i2, i3, i4, i5 = (_busca(F, p) for p in (r"^\d*10\.1 ", r"^10\.2 ", r"^10\.3 ", r"^10\.4 ", r"^10\.5 "))
    edats = taula_edats(F, i1 + 1, i2)
    causes = taula_causes(F, i2 + 1, i3, capcalera=True)
    ev = esperanca_com(F, i5 + 1)
    tme_t, ime_t = taula_ci(F, i3 + 1), taula_ci(F, i4 + 1)
    ordre = list(edats)
    # TME recalculada con 10.1 (grupos quinquenales) para comprobar a qué comarca va cada fila de 10.3
    calc = {}
    for c, o in edats.items():
        d, p = _a_bandes(o["def"]["t"]), _a_bandes(o["pob"]["t"])
        calc[c] = (tme(d, p), sum(o["def"]["t"].values()))

    def error(noms):
        e = []
        for nom, (fila) in zip(noms, tme_t):
            v, li, ls = fila[1][6:9]
            t, n = calc.get(nom, (None, 0))
            if not t or not n:
                return math.inf
            amp = (ls - li) / 2 / v
            e.append(abs(v / t - 1) + abs(amp / (1.96 / math.sqrt(n)) - 1))
        return sum(e) / len(e)

    etiq = [n for n, _ in tme_t]
    e_etiq, e_ordre = error(etiq), error(ordre[:len(tme_t)]) if len(ordre) >= len(tme_t) else math.inf
    if min(e_etiq, e_ordre) > 0.15:
        raise SystemExit(f"Las tablas 10.3/10.4 no encajan con la 10.1 (error {e_etiq:.2f} / {e_ordre:.2f}): revisarlas a mano")
    noms_ci = etiq if e_etiq <= e_ordre else ordre[:len(tme_t)]
    avis = None if e_etiq <= e_ordre else f"10.3 y 10.4: etiquetas desplazadas, se usa el orden de la 10.1 (error {e_ordre:.3f} frente a {e_etiq:.3f})"
    files = []

    def add(com, ind, sexe, v, li=None, ls=None):
        if v is not None:
            files.append({"nivell": "com", "ambit": com, "ind": ind, "sexe": sexe, "v": round(v, 3), "li": None if li is None else round(li, 3), "ls": None if ls is None else round(ls, 3)})

    for nom, (_, vals) in zip(noms_ci, tme_t):
        for k, s in enumerate("dht"):
            add(nom, "tme", s, *vals[3 * k:3 * k + 3])
    for nom, (_, vals) in zip(noms_ci, ime_t):
        for k, s in enumerate("dht"):
            add(nom, "ime", s, *vals[3 * k:3 * k + 3])
    for nom, v in ev.items():
        for k, s in enumerate("dht"):
            add(nom, "ev0", s, v[6 * k]); add(nom, "ev65", s, v[6 * k + 4])
    for nom, o in edats.items():
        for s in "dht":
            n, p = sum(o["def"][s].values()), sum(o["pob"][s].values())
            add(nom, "def", s, n); add(nom, "pob", s, p)
            if p:
                add(nom, "tbm", s, 1000 * n / p)
        pb = _a_bandes(o["pob"]["t"])
        cc = causes.get(nom, {}).get("t", {})
        if cc.get("total"):
            add(nom, "prem", "t", tme(cc["total"], pb, fins=9))
            for c, d in cc.items():
                if c != "total":
                    add(nom, "tme_" + c, "t", tme(d, pb))
                    add(nom, "pct_" + c, "t", 100 * sum(d) / sum(cc["total"]))
    return files, {"avis_10_3": avis, "comarques": len(edats)}


def regio(wb) -> list[dict]:
    F = _files(wb["Regions sanitàries"])
    i1, i2, i3, i4, i5, i6 = (_busca(F, p) for p in (r"^9\.1 ", r"^9\.2 ", r"^9\.3 ", r"^9\.4 ", r"^9\.5 ", r"^9\.6 "))
    files = []

    def add(ind, sexe, v, li=None, ls=None):
        if v is not None:
            files.append({"nivell": "rs", "ambit": "GIRONA", "ind": ind, "sexe": sexe, "v": round(v, 3), "li": li, "ls": ls})

    # 9.4 esperanza de vida
    j = next(i for i in range(i4, i5) if F[i] and _norm(F[i][0]) == "GIRONA")
    for i in range(j + 1, j + 4):
        f = F[i]; s = SEXES[_txt(f[0])]
        add("ev0", s, _num(f[1])); add("ev65", s, _num(f[5]))
    # 9.6 TME por causa
    j = next(i for i in range(i6, len(F)) if F[i] and len(F[i]) == 1 and _norm(F[i][0]) == "GIRONA")
    for i in range(j + 1, j + 30):
        f = F[i]
        if f and isinstance(f[0], str) and len(f) >= 10:
            c = "tme" if _txt(f[0]).startswith("Totes") else (("tmec_" + _causa(f[0])) if _causa(f[0]) else None)
            if c:
                for k, s in enumerate("dht"):
                    add(c, s, *[_num(x) for x in f[1 + 3 * k:4 + 3 * k]])
            if c == "tme":
                break
    # 9.5 mortalidad evitable (lista de consenso, tasas brutas por 100.000)
    j = next(i for i in range(i5, i6) if F[i] and len(F[i]) == 1 and _norm(F[i][0]) == "GIRONA")
    files += _evitable(F, j + 1, i6, "rs", "GIRONA")
    # Población (9.1) y defunciones por causa y edad (9.2): tasas calculadas como en las comarcas
    cap = F[i1 + 3]
    col = [k for k, x in enumerate(cap) if _norm(x) == "GIRONA"]
    pob = [0.0] * len(BANDES)
    for i in range(i1 + 5, i2):
        f = F[i]
        if f and _edat(f[0]) is not None and len(f) > max(col):
            # la fila de nombres no tiene la etiqueta de edad de cada bloque de 10 regiones: +1 por bloque
            pob[QUINQ.get(_edat(f[0]), 10)] += _num(f[col[2] + col[2] // 10 + 1]) or 0  # bloque «Total»
    causes = taula_causes(F, i2 + 1, i3, capcalera=True).get("GIRONA", {}).get("t", {})
    if causes.get("total") and all(pob):
        add("prem", "t", tme(causes["total"], pob, fins=9))
        for c, d in causes.items():
            if c != "total":
                add("tme_" + c, "t", tme(d, pob)); add("pct_" + c, "t", 100 * sum(d) / sum(causes["total"]))
        add("def", "t", sum(causes["total"])); add("pob", "t", sum(pob))
    return files


def _evitable(F, i0, i1, nivell, ambit) -> list[dict]:
    out, bloc = [], None
    for i in range(i0, i1):
        f = F[i]
        if not f:
            continue
        t = _txt(f[0])
        if t.startswith("Causes susceptibles d'intervenció pels"):
            bloc = "serv"; continue
        if t.startswith("Causes susceptibles d'intervenció per les"):
            bloc = "pol"; continue
        if len(f) >= 7 and bloc:
            clau = ("ev_" + bloc) if t == "Total" else "ev_tot" if t.startswith("Totes les causes") else "evc_" + re.sub(r"[^a-z]", "", _norm(t).lower())[:24]
            for k, s in enumerate("dht"):
                v = _num(f[4 + k])
                if v is not None:
                    out.append({"nivell": nivell, "ambit": ambit, "ind": clau, "sexe": s, "v": v, "li": None, "ls": None, "nom": t if clau.startswith("evc_") else None})
                n = _num(f[1 + k])
                if n is not None and not clau.startswith("evc_"):
                    out.append({"nivell": nivell, "ambit": ambit, "ind": clau + "_n", "sexe": s, "v": n, "li": None, "ls": None})
            if clau == "ev_tot":
                break
    return out


def catalunya(wb) -> list[dict]:
    files = []

    def add(ind, sexe, v, li=None, ls=None, nom=None):
        if v is not None:
            files.append({"nivell": "cat", "ambit": "CATALUNYA", "ind": ind, "sexe": sexe, "v": round(v, 3), "li": li, "ls": ls, "nom": nom})

    F = _files(wb["Dades generals"])
    i1, i2 = _busca(F, r"^\d*1\.1 "), _busca(F, r"^1\.2 ")
    o = taula_edats(F, i1 + 1, i2)["CATALUNYA"]
    for s in "dht":
        n, p = sum(o["def"][s].values()), sum(o["pob"][s].values())
        add("def", s, n); add("pob", s, p); add("tbm", s, 1000 * n / p)
    for i in range(i2, i2 + 8):
        f = F[i]
        if f and _txt(f[0]).startswith("Taxes estandarditzades (e)") and len(f) >= 4:
            for k, s in enumerate("dht"):
                add("tme", s, 100 * _num(f[1 + k]))
    F = _files(wb["20 grups de causes"])
    i1, i2, i4 = _busca(F, r"^2\.1 "), _busca(F, r"^2\.2 "), _busca(F, r"^2\.4 ")
    causes = taula_causes(F, i1 + 1, i2, capcalera=False)["CATALUNYA"].get("t", {})
    pb = _a_bandes(o["pob"]["t"])
    add("prem", "t", tme(causes["total"], pb, fins=9))
    for c, d in causes.items():
        if c != "total":
            add("tme_" + c, "t", tme(d, pb)); add("pct_" + c, "t", 100 * sum(d) / sum(causes["total"]))
    for i in range(i4 + 1, i4 + 26):
        f = F[i]
        if f and isinstance(f[0], str) and _causa(f[0]) and len(f) >= 7:
            for k, s in enumerate("dht"):
                add("tmec_" + _causa(f[0]), s, _num(f[1 + 2 * k]))
    F = _files(wb["Evitable"])
    i1, i2 = _busca(F, r"^6\.1 "), _busca(F, r"^6\.2 ")
    for i in range(i1, i2):
        f = F[i]
        if f and isinstance(f[0], str) and len(f) >= 10 and _num(f[1]) is not None:
            k_ = {"Mortalitat prevenible": "ocde_prev", "Mortalitat tractable": "ocde_tract", "Mortalitat evitable": "ocde_tot"}.get(_txt(f[0]))
            if k_:
                for k, s in enumerate("dht"):
                    add(k_, s, _num(f[7 + k]))
    files += _evitable(F, i2 + 1, len(F), "cat", "CATALUNYA")
    F = _files(wb["Taula de vida"])
    sexe = None
    for f in F:
        if f and len(f) <= 2 and any(_txt(x) in SEXES for x in f):
            sexe = SEXES[next(_txt(x) for x in f if _txt(x) in SEXES)]
        elif sexe and f and len(f) >= 10 and (_txt(f[0]) == "En néixer" or f[0] == 65):
            add("ev0" if f[0] != 65 else "ev65", sexe, _num(f[-1]))
    F = _files(wb["Infantil"])
    for f in F:
        if f and _txt(f[0]) == "Mortalitat infantil" and len(f) >= 7:
            for k, s in enumerate("dht"):
                add("inf", s, _num(f[2 + 2 * k])); add("inf_n", s, _num(f[1 + 2 * k]))
    return files


def edicio(wb) -> int:
    for ws in wb.worksheets[:3]:
        for f in _files(ws)[:20]:
            for c in f:
                m = re.search(r"mortalitat a Catalunya,? (20\d\d)", str(c))
                if m:
                    return int(m.group(1))
    raise SystemExit("No se encuentra el año de la edición en el Excel")


def main(ruta: str) -> None:
    wb = openpyxl.load_workbook(ruta, read_only=True, data_only=True)
    any_ = edicio(wb)
    fc, info = comarques(wb)
    files = fc + regio(wb) + catalunya(wb)
    df = pd.DataFrame(files)
    df.insert(0, "any", any_)
    if "nom" not in df:
        df["nom"] = None
    SAL.mkdir(parents=True, exist_ok=True)
    f = SAL / "mortalitat.csv"
    if f.exists():
        ant = pd.read_csv(f)
        df = pd.concat([ant[ant["any"] != any_], df], ignore_index=True)
    df = df.sort_values(["any", "nivell", "ambit", "ind", "sexe"], kind="stable")
    df.to_csv(f, index=False)
    meta = {"edicio": any_, "anys": sorted(int(x) for x in df["any"].unique()), "fitxer": pathlib.Path(ruta).name,
            "carregat": datetime.date.today().isoformat(), **{k: v for k, v in info.items() if v}}
    (SAL / "mortalitat_meta.json").write_text(json.dumps(meta, ensure_ascii=False, indent=1), encoding="utf-8")
    gi = df[(df["any"] == any_) & (df["nivell"] == "com") & (df["ambit"].isin(COM_GI)) & (df["sexe"] == "t")]
    print(f"Edició {any_}: {len(df[df['any'] == any_])} files; {info}")
    print(gi[gi["ind"].isin(["ev0", "tme", "ime", "prem"])].pivot(index="ambit", columns="ind", values="v").round(1).to_string())


# ---------------------------------------------------------------- Excel «evolució 1983-AAAA»
SUPERIOR, INFERIOR = "FFE20025", "FFBCBF00"  # colores de la tabla: mortalidad superior / inferior a Cataluña


def _sig_color(c) -> int:
    f = c.fill
    if not f or not f.fill_type or f.fgColor.type != "rgb":
        return 0
    return 1 if f.fgColor.rgb == SUPERIOR else -1 if f.fgColor.rgb == INFERIOR else 0


def _any(v) -> int | None:
    m = re.match(r"^\s*((19|20)\d\d)\b", str(v)) if v is not None else None
    return int(m.group(1)) if m else None


def evolucio_ime(ruta: str) -> None:
    """Hojas «IME per comarca» (1999-) e «IME per regió sanitària» (2005-): el IME no viene en cifras, solo el color
    de cada celda (rojo = mortalidad superior a la de Cataluña, verde oliva = inferior, blanco = sin diferencia
    significativa). Escribe mortalitat_ime_evol.csv: any, nivell (com / rs), ambit, sexe, sig (1 / 0 / -1)."""
    wb = openpyxl.load_workbook(ruta)  # sin read_only: hacen falta los colores
    files = []
    for full, nivell in (("IME per comarca", "com"), ("IME per regió sanitària", "rs")):
        ws = wb[full]
        sexe, anys = None, {}
        for r in range(1, ws.max_row + 1):
            b = _txt(ws.cell(r, 2).value)
            if b in SEXES:
                sexe = SEXES[b]
                anys = {}
                for rr in range(r, r + 4):  # la fila de años va en la misma fila o unas debajo
                    anys = {k: _any(ws.cell(rr, k).value) for k in range(3, 40) if _any(ws.cell(rr, k).value)}
                    if len(anys) > 3:
                        break
                continue
            if sexe and anys and b and not b.startswith(("*", "<", "^")) and r > 0:
                if all(ws.cell(r, k).value is None or isinstance(ws.cell(r, k).value, str) for k in anys):
                    for k, y in anys.items():
                        files.append({"any": y, "nivell": nivell, "ambit": _norm(b), "sexe": sexe, "sig": _sig_color(ws.cell(r, k))})
    df = pd.DataFrame(files)
    df = df[df["ambit"].str.len() > 2]
    if df.empty or df["sig"].abs().sum() == 0:
        raise SystemExit("No se encuentran los colores del IME en el Excel de evolución")
    # Comprobación: el último año debe coincidir con el IME y su intervalo de las tablas del año (mortalitat.csv)
    f = SAL / "mortalitat.csv"
    if f.exists():
        d = pd.read_csv(f)
        u = int(df["any"].max())
        x = d[(d["any"] == u) & (d["nivell"] == "com") & (d["ind"] == "ime") & (d["sexe"] == "t")]
        ok = tot = 0
        for r in x.itertuples():
            s = 1 if r.li > 100 else -1 if r.ls < 100 else 0
            e = df[(df["any"] == u) & (df["nivell"] == "com") & (df["ambit"] == r.ambit) & (df["sexe"] == "t")]
            if not e.empty:
                tot += 1; ok += int(e["sig"].iloc[0] == s)
        print(f"Comprobación con las tablas {u}: {ok} de {tot} comarcas coinciden")
    SAL.mkdir(parents=True, exist_ok=True)
    df.sort_values(["nivell", "ambit", "sexe", "any"]).to_csv(SAL / "mortalitat_ime_evol.csv", index=False)
    fm = SAL / "mortalitat_meta.json"
    meta = json.loads(fm.read_text(encoding="utf-8")) if fm.exists() else {}
    meta.update({"evolucio": pathlib.Path(ruta).name, "evolucio_anys": [int(df["any"].min()), int(df["any"].max())], "carregat": datetime.date.today().isoformat()})
    fm.write_text(json.dumps(meta, ensure_ascii=False, indent=1), encoding="utf-8")
    g = df[(df["nivell"] == "com") & df["ambit"].isin(COM_GI) & (df["sexe"] == "t")]
    print(g.pivot(index="ambit", columns="any", values="sig").replace({1: "+", -1: "-", 0: "."}).apply(lambda r: "".join(r), axis=1).to_string())


if __name__ == "__main__":
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    wb0 = openpyxl.load_workbook(sys.argv[1], read_only=True)
    if "IME per comarca" in wb0.sheetnames:
        evolucio_ime(sys.argv[1])
    else:
        main(sys.argv[1])
