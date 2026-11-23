"""Gráficos de «La província» con el Boletín estadístico del Ministerio de Vivienda y Transportes.

Lee las tablas provinciales que guarda fuentes/mitma.py en data/processed/mitma (una CSV por hoja
del Excel, sin filas ni columnas vacías) y devuelve los gráficos mt_*:

  mt_ini    viviendas libres iniciadas y terminadas en la provincia, cada año desde 1991 (32200500, 32201000)
  mt_preu   valor medio de las compraventas de vivienda libre, por trimestre (34020150; extranjeros 34020180)
  mt_ext    % de compraventas hechas por extranjeros, residentes o no, suma de 4 trimestres (340101d0)
  mt_qui    dónde viven los compradores de vivienda en la provincia, últimos 4 trimestres (340101f0, 340101d0)
  mt_nova   % de vivienda nueva entre las compraventas, suma de 4 trimestres (34010180, 34010110)
  mt_unif   % de compraventas en edificios de una sola vivienda (casas), suma de 4 trimestres (340101a0)
  mt_rangs  compraventas de vivienda libre por precio, último trimestre (340101l0)
  mt_vt     valor tasado (€/m²) por antigüedad y vivienda protegida, último trimestre (3510xxxx)

Zonas: gi (provincia de Girona), cat (Cataluña), esp (España).
"""
from __future__ import annotations

import glob
import re
import sys
import pathlib

import pandas as pd

RAIZ = pathlib.Path(__file__).resolve().parent.parent
sys.path.insert(0, str(RAIZ))
from fuentes.comun import normaliza  # noqa: E402

P = RAIZ / "data" / "processed" / "mitma"
ZONES = {"girona": "gi", "gerona": "gi", "cataluna": "cat", "nacional total": "esp", "espana": "esp"}
MESOS = {"ene": 1, "feb": 2, "mar": 3, "abr": 4, "may": 5, "jun": 6, "jul": 7, "ago": 8, "sep": 9, "sept": 9, "oct": 10, "nov": 11, "dic": 12}


def _num(v):
    x = pd.to_numeric(str(v).replace(" ", ""), errors="coerce")
    return None if pd.isna(x) else float(x)


def _zona(v) -> str | None:
    return ZONES.get(normaliza(v)) if isinstance(v, str) else None


def _csv(f):
    return pd.read_csv(f, header=None, dtype=str, keep_default_na=False)


def _files(codigo):
    return sorted(glob.glob(str(P / f"{codigo}_*.csv")))


def _trimestral(codigo) -> dict:
    """Tablas con una columna por trimestre y una fila «Año AAAA» encima: {zona: {(año, t): valor}}."""
    res: dict = {}
    for f in _files(codigo):
        df = _csv(f)
        fila = next((i for i in range(min(15, len(df))) if any(re.match(r"^Año \d{4}", str(x).strip()) for x in df.iloc[i])), None)
        if fila is None:
            continue
        # Fila de los trimestres («1º», «2º (**)»…): evita las columnas de variación del final
        ft = next((i for i in range(fila + 1, min(fila + 4, len(df))) if any(re.match(r"^[1-4]º", str(x).strip()) for x in df.iloc[i])), None)
        if ft is None:
            continue
        cols, any_ = {}, None
        for j, x in enumerate(df.iloc[fila]):
            m = re.match(r"^Año (\d{4})", str(x).strip())
            if m:
                any_ = int(m.group(1))
            elif str(x).strip():
                any_ = None
            mq = re.match(r"^([1-4])º", str(df.iloc[ft, j]).strip())
            if any_ and mq:
                cols[j] = (any_, int(mq.group(1)))
        for i in range(ft + 1, len(df)):
            z = _zona(df.iloc[i, 0])
            if not z:
                continue
            for j, k in cols.items():
                v = _num(df.iloc[i, j]) if j < df.shape[1] else None
                if v is not None:
                    res.setdefault(z, {}).setdefault(k, v)
    return res


def _per_full(codigo, col=0) -> dict:
    """Tablas con una hoja por trimestre (1t-2007, t1a2005): {(año, t): (cabecera, {zona: fila})}."""
    res = {}
    for f in _files(codigo):
        m = re.search(r"_(\d)t-(\d{4})", f) or re.search(r"_t(\d)a(\d{4})", f)
        if not m:
            continue
        df = _csv(f)
        files = {}
        for i in range(len(df)):
            z = _zona(df.iloc[i, col]) or (_zona(df.iloc[i, col - 1]) if col else None)
            if z and z not in files:
                files[z] = [_num(x) for x in df.iloc[i]]
        res[(int(m.group(2)), int(m.group(1)))] = (df, files)
    return res


def _anual(codigo) -> dict:
    fs = _files(codigo)
    if not fs:
        return {}
    df = _csv(fs[0])
    fila = next(i for i in range(len(df)) if sum(bool(re.fullmatch(r"\d{4}", str(x).strip())) for x in df.iloc[i]) > 5)
    cols = {j: int(str(x).strip()) for j, x in enumerate(df.iloc[fila]) if re.fullmatch(r"\d{4}", str(x).strip())}
    res = {}
    for i in range(fila + 1, len(df)):
        z = _zona(df.iloc[i, 0])
        if z and z not in res:
            res[z] = {a: v for j, a in cols.items() if (v := _num(df.iloc[i, j])) is not None}
    return res


def _mensual(codigo) -> dict:
    """«2008 por meses» y debajo Ene., Feb.…: {zona: {(año, mes): valor}}."""
    fs = _files(codigo)
    if not fs:
        return {}
    df = _csv(fs[0])
    fa = next(i for i in range(len(df)) if any(re.match(r"^\d{4} por meses", str(x).strip()) for x in df.iloc[i]))
    cols, any_ = {}, None
    for j in range(df.shape[1]):
        m = re.match(r"^(\d{4})", str(df.iloc[fa, j]).strip())
        if m:
            any_ = int(m.group(1))
        mes = MESOS.get(str(df.iloc[fa + 1, j]).strip().lower().rstrip(".")[:4].rstrip("."))
        if any_ and mes:
            cols[j] = (any_, mes)
    res = {}
    for i in range(fa + 2, len(df)):
        z = _zona(df.iloc[i, 0])
        if z and z not in res:
            res[z] = {k: v for j, k in cols.items() if (v := _num(df.iloc[i, j])) is not None}
    return res


def _x(k):
    return round(k[0] + (k[1] - 1) / 4, 4)


def _et(k):
    return f"{k[0]}T{k[1]}"


def _suma4(d: dict, k) -> float | None:
    a, q = k
    ks = [(a - (1 if q - i < 1 else 0), (q - i - 1) % 4 + 1) for i in range(4)]
    vs = [d.get(x) for x in ks]
    return sum(vs) if all(v is not None for v in vs) else None


def _quota4(num: dict, den: dict, desde=None) -> list:
    """% de num sobre den, sumando los últimos 4 trimestres."""
    res = []
    for k in sorted(den):
        n, d = _suma4(num, k), _suma4(den, k)
        if n is not None and d and (desde is None or k[0] >= desde):
            res.append([_x(k), _et(k), round(n / d * 100, 1)])
    return res


def construir() -> dict:
    prov, notes = {}, []
    if not P.exists():
        return {"prov": prov, "resum": "sin datos"}

    # 1. Viviendas libres iniciadas y terminadas (cada año, solo la provincia)
    ini, ter = _anual("32200500"), _anual("32201000")
    if ini.get("gi"):
        gi, gt = ini["gi"], ter.get("gi", {})
        mx = max(gi.items(), key=lambda x: x[1])
        sp = {"tipus": "linia", "u": "", "dec": 0, "noms": "mt_it",
              "series": {"gi": [[a, str(a), int(v)] for a, v in sorted(gi.items())],
                         "cat": [[a, str(a), int(v)] for a, v in sorted(gt.items())]},
              "abs": {"any": max(gi), "ini": int(gi[max(gi)]), "ter": int(gt.get(max(gi), 0)), "amx": mx[0], "mx": int(mx[1]),
                      "q_cat": round(gi[max(gi)] / ini["cat"][max(gi)] * 100, 1) if ini.get("cat", {}).get(max(gi)) else None}}
        mi, mt = _mensual("32100500"), _mensual("32101000")
        g = mi.get("gi", {})
        if g:
            u = max(g)
            ult = sorted(k for k in g if k <= u)[-12:]
            if len(ult) == 12:
                ant = [(a - 1, m) for a, m in ult]
                sp["abs"].update({"m12": int(sum(g[k] for k in ult)), "m12_0": int(sum(g.get(k, 0) for k in ant)),
                                  "t12": int(sum(mt.get("gi", {}).get(k, 0) for k in ult)), "fins": f"{u[0]}-{u[1]:02d}"})
        prov["mt_ini"] = sp

    # 2. Valor medio de las compraventas de vivienda libre
    vm = _trimestral("34020150")
    if vm.get("gi"):
        series = {z: [[_x(k), _et(k), round(v)] for k, v in sorted(s.items())] for z, s in vm.items()}
        u = max(vm["gi"])
        sp = {"tipus": "linia", "u": "€", "dec": 0, "series": series, "abs": {"per": _et(u)}}
        mx = max(((k, v) for k, v in vm["gi"].items() if k[0] <= 2012), key=lambda x: x[1], default=None)
        if mx:
            sp["abs"].update({"mx": round(mx[1]), "pmx": _et(mx[0])})
        ext = _per_full("34020180")
        if u in ext and ext[u][1].get("gi"):
            sp["abs"]["ext"] = round(ext[u][1]["gi"][1]) if ext[u][1]["gi"][1] else None
        prov["mt_preu"] = sp

    # 3 y 4. Residencia del comprador
    rd = _per_full("340101d0")
    if rd:
        # Columnas: TOTAL, Residentes (Total, Españoles, Extranjeros, No consta), No residentes (Total, Españoles, Extranjeros, No consta)
        num, den = {}, {}
        for k, (_, fs) in rd.items():
            for z, f in fs.items():
                if len(f) >= 9 and f[1]:
                    den.setdefault(z, {})[k] = f[1]
                    num.setdefault(z, {})[k] = (f[4] or 0) + (f[8] or 0)
        series = {z: _quota4(num[z], den[z]) for z in den}
        u = max(k for k in rd if "gi" in rd[k][1])
        prov["mt_ext"] = {"tipus": "linia", "u": "%", "dec": 1, "series": series, "abs": {"per": _et(u)}}
        # Dónde viven los compradores: residentes por provincia (340101f0) + no residentes (340101d0)
        rf = _per_full("340101f0", col=2)
        ks = sorted(k for k in rf if k in rd and "gi" in rd[k][1])[-4:]
        if len(ks) == 4:
            tot = {"gi": 0, "bcn": 0, "esp": 0, "nores": 0, "ext_res": 0}
            ok = True
            for k in ks:
                df, _ = rf[k]
                cab = next((i for i in range(len(df)) if "Barcelona" in [str(x).strip() for x in df.iloc[i]]), None)
                fila = next((i for i in range(len(df)) if str(df.iloc[i, 2]).strip() == "Girona"), None)
                if cab is None or fila is None:
                    ok = False
                    break
                noms = [str(x).strip() for x in df.iloc[cab]]
                vals = [_num(x) for x in df.iloc[fila]]
                jb, jg = noms.index("Barcelona"), noms.index("Girona")
                total_res = vals[3]
                tot["gi"] += vals[jg] or 0
                tot["bcn"] += vals[jb] or 0
                tot["esp"] += (total_res or 0) - (vals[jg] or 0) - (vals[jb] or 0)
                fd = rd[k][1]["gi"]
                tot["nores"] += fd[6] or 0
                tot["ext_res"] += fd[4] or 0
            s = tot["gi"] + tot["bcn"] + tot["esp"] + tot["nores"]
            if ok and s:
                prov["mt_qui"] = {"tipus": "barres", "u": "%", "dec": 0, "claus": ["gi"], "any": f"{_et(ks[0])}–{_et(ks[-1])}",
                                  "abs": {"n": int(s), "ext_res": round(tot["ext_res"] / s * 100, 1), "per": _et(ks[-1])},
                                  "grups": [{"g": g, "c": "mt:" + g, "gi": round(tot[g] / s * 100, 1)} for g in ("gi", "bcn", "esp", "nores")]}
            else:
                notes.append("ERROR mt_qui: no se encuentra la fila de Girona en 340101f0")

    # 5. Vivienda nueva entre las compraventas
    nova, total = _trimestral("34010180"), _trimestral("34010110")
    if nova.get("gi") and total.get("gi"):
        prov["mt_nova"] = {"tipus": "linia", "u": "%", "dec": 1, "series": {z: _quota4(nova[z], total[z]) for z in total if z in nova}}

    # 6. Casas (edificios de una sola vivienda) entre las compraventas de vivienda libre
    ta = _per_full("340101a0")
    if ta:
        num, den = {}, {}
        for k, (_, fs) in ta.items():
            for z, f in fs.items():
                if len(f) >= 3 and f[1]:
                    den.setdefault(z, {})[k] = f[1]
                    num.setdefault(z, {})[k] = f[2] or 0
        prov["mt_unif"] = {"tipus": "linia", "u": "%", "dec": 1, "series": {z: _quota4(num[z], den[z]) for z in den}}

    # 7. Compraventas por precio (último trimestre; una hoja por provincia)
    rangs = {}
    for f in _files("340101l0"):
        nom = normaliza(pathlib.Path(f).stem.split("_", 1)[1].replace("-", " "))
        z = ZONES.get(nom)
        if not z:
            continue
        df = _csv(f)
        cab = next((i for i in range(len(df)) if any("0-150.000" in str(x) for x in df.iloc[i])), None)
        fila = next((i for i in range(len(df)) if str(df.iloc[i, 1]).strip() == "Total"), None)
        per = next((str(x) for i in range(min(8, len(df))) for x in df.iloc[i] if "trimestre de" in str(x)), "")
        if cab is None or fila is None:
            continue
        noms = [str(x).strip() for x in df.iloc[cab]]
        vals = [_num(x) for x in df.iloc[fila]]
        jt = noms.index("Total")
        rangs[z] = {"per": per, "v": [(noms[j], vals[j]) for j in range(2, jt)], "t": vals[jt]}
    if rangs.get("gi") and rangs["gi"]["t"]:
        # Grupos: hasta 150.000, 150-300.000, 300-450.000, 450-600.000, más de 600.000
        def grups(r):
            v = [x or 0 for _, x in r["v"]]
            g = [v[0], v[1], v[2], v[3], sum(v[4:])]
            return [round(x / r["t"] * 100, 1) for x in g]
        gs = {z: grups(r) for z, r in rangs.items() if r["t"]}
        m = re.search(r"(Primer|Segundo|Tercer|Cuarto) trimestre de (\d{4})", rangs["gi"]["per"])
        per = f"{m.group(2)}T{['Primer', 'Segundo', 'Tercer', 'Cuarto'].index(m.group(1)) + 1}" if m else ""
        prov["mt_rangs"] = {"tipus": "barres", "u": "%", "dec": 0, "claus": ["gi", "cat", "esp"], "any": per,
                            "abs": {"n": int(rangs["gi"]["t"]), "per": per},
                            "grups": [{"g": c, "c": "mt:" + c, **{z: gs[z][i] for z in gs}} for i, c in enumerate(("r150", "r300", "r450", "r600", "rmes"))]}

    # 8. Valor tasado por antigüedad y vivienda protegida (€/m²)
    taules = {"vt_tot": "35101000", "vt_nova": "35101500", "vt_vella": "35102000", "vt_prot": "35102500"}
    vt = {c: _trimestral(t) for c, t in taules.items()}
    if vt["vt_tot"].get("gi"):
        u = max(vt["vt_tot"]["gi"])
        gs = []
        for c in taules:
            d = vt[c]
            if all(u in d.get(z, {}) for z in ("gi", "cat", "esp")):
                gs.append({"g": c, "c": "mt:" + c, **{z: round(d[z][u]) for z in ("gi", "cat", "esp")}})
        if gs:
            prov["mt_vt"] = {"tipus": "barres", "u": "€/m²", "dec": 0, "claus": ["gi", "cat", "esp"], "any": _et(u), "grups": gs}

    falten = [k for k in ("mt_ini", "mt_preu", "mt_ext", "mt_qui", "mt_nova", "mt_unif", "mt_rangs", "mt_vt") if k not in prov]
    resum = f"gráficos {sorted(prov)}" + (f"; ERROR faltan {falten}" if falten else "") + ("; " + "; ".join(notes) if notes else "")
    return {"prov": prov, "resum": resum}


if __name__ == "__main__":
    import json
    r = construir()
    print(r["resum"])
    for k, v in r["prov"].items():
        s = {z: (x[:2] + ["…"] + x[-2:]) for z, x in v.get("series", {}).items()}
        print(k, json.dumps({**{a: b for a, b in v.items() if a not in ("series",)}, "series": s}, ensure_ascii=False)[:900])
