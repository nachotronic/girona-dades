"""Comercio exterior para la web: sección «Exportacions» (D.exp) y geometrías de sus dos mapas.

Lee data/processed/exportacions/agregats.csv.gz (fuentes/exportacions.py) y escribe:
  web/datos/exportacions.json   series, países, capítulos, provincias…
  web/datos/mon.geojson         países del mundo (Natural Earth 1:50m, world-atlas), código ISO alfa-2
  web/datos/provincies.geojson  provincias de España (es-atlas), código INE
Los años sin fichero anual definitivo se suman de los meses (provisionales) si están los 12.
"""
from __future__ import annotations

import json
import pathlib
import shutil

import pandas as pd

RAIZ = pathlib.Path(__file__).resolve().parent.parent
DIR = RAIZ / "data" / "processed" / "exportacions"
UE = set("AT BE BG CY CZ DE DK EE FI FR GR HR HU IE IT LT LU LV MT NL PL PT RO SE SI SK".split())
NO_PAIS = {"WW", "YY", "XX", "QQ", "QR", "QS", "QU", "QV", "QW", "QX", "QY", "QZ", "XA", "XB", "XC"}
M = 1e6


def _r(v, d=1):
    return None if v is None or pd.isna(v) else round(float(v), d)


def construir(salida: pathlib.Path) -> dict | None:
    fa = DIR / "agregats.csv.gz"
    if not fa.exists():
        return None
    a = pd.read_csv(fa, dtype={"per": str, "zona": str, "clau": str, "flux": str, "nivell": str})
    a["mes"] = a["per"].str.len() == 7
    a["any"] = a["per"].str[:4].astype(int)
    anuals = set(a.loc[~a["mes"], "any"])
    # Años completos: anual definitivo, o 12 meses provisionales
    mesos_any = a[a["mes"]].groupby("any")["per"].nunique()
    prov_anys = sorted(int(y) for y, n in mesos_any.items() if n == 12 and y not in anuals)
    anys = sorted(anuals) + prov_anys
    if not anys:
        return None
    ult = anys[-1]
    an = pd.concat([a[~a["mes"]], a[a["mes"] & a["any"].isin(prov_anys)].assign(per=lambda d: d["any"].astype(str))])
    an = an.groupby(["any", "flux", "nivell", "zona", "clau"], as_index=False)[["valor", "pes"]].sum()

    def serie(niv, zona, flux, clau=None):
        d = an[(an.nivell == niv) & (an.zona == zona) & (an.flux == flux)]
        if clau is not None:
            d = d[d.clau == clau]
        s = d.groupby("any")["valor"].sum()
        return [_r(s.get(y, 0) / M) for y in anys]

    # Totales: provincia 17, Cataluña y España (la suma de «prov» incluye la mercancía sin provincia)
    tot = {"gi": {f: serie("prov", "17", f) for f in "EI"}}
    for z, provs in (("cat", ["08", "17", "25", "43"]), ("esp", None)):
        tot[z] = {}
        for f in "EI":
            d = an[(an.nivell == "prov") & (an.flux == f)]
            if provs:
                d = d[d.zona.isin(provs)]
            s = d.groupby("any")["valor"].sum()
            tot[z][f] = [_r(s.get(y, 0) / M) for y in anys]

    # Mensual: Girona, Cataluña y España
    mm = a[a["mes"] & (a.nivell == "prov")]
    mesos = sorted(mm["per"].unique())
    mes = {"per": mesos}
    for z, filtre in (("gi", ["17"]), ("cat", ["08", "17", "25", "43"]), ("esp", None)):
        d = mm if filtre is None else mm[mm.zona.isin(filtre)]
        p = d.pivot_table(index="per", columns="flux", values="valor", aggfunc="sum").reindex(mesos)
        mes[z] = {f: [_r(v / M, 2) for v in p.get(f, pd.Series(index=mesos, dtype=float))] for f in "EI"}

    # Últimos 12 meses frente a los 12 anteriores
    u12 = None
    if len(mesos) >= 24:
        def suma(z, f, i0, i1):
            return _r(sum(x or 0 for x in mes[z][f][i0:i1]))
        n = len(mesos)
        u12 = {"de": mesos[n - 12], "a": mesos[-1], **{z: {f: suma(z, f, n - 12, n) for f in "EI"} | {f + "_ant": suma(z, f, n - 24, n - 12) for f in "EI"} for z in ("gi", "cat", "esp")}}

    # Países (Girona, todos los años; Cataluña el último)
    pa = an[(an.nivell == "pais") & ~an.clau.isin(NO_PAIS)]
    paisos = {}
    for f in "EI":
        p = pa[(pa.zona == "gi") & (pa.flux == f)].pivot_table(index="clau", columns="any", values="valor", aggfunc="sum").fillna(0)
        p = p[p.max(axis=1) >= 50_000]
        paisos[f] = {c: [_r(r.get(y, 0) / M, 2) for y in anys] for c, r in p.iterrows()}
    cat_p = pa[(pa.zona == "cat") & (pa.flux == "E") & (pa["any"] == ult)].set_index("clau")["valor"]
    ue = {}
    for z in ("gi", "cat", "esp"):
        d = an[(an.nivell == "pais") & (an.zona == z) & (an.flux == "E")]
        t = d.groupby("any")["valor"].sum()
        u = d[d.clau.isin(UE)].groupby("any")["valor"].sum()
        ue[z] = [_r(u.get(y, 0) / t.get(y, 1) * 100) for y in anys]

    # Capítulos NC2 (Girona, todos los años; Cataluña y España el último)
    ca = an[an.nivell == "cap"]
    caps = {}
    for f in "EI":
        p = ca[(ca.zona == "gi") & (ca.flux == f)].pivot_table(index="clau", columns="any", values="valor", aggfunc="sum").fillna(0)
        caps[f] = {c: [_r(r.get(y, 0) / M, 2) for y in anys] for c, r in p.iterrows() if r.max() >= 100_000}
    caps_ref = {z: {c: _r(v / M) for c, v in ca[(ca.zona == z) & (ca.flux == "E") & (ca["any"] == ult)].set_index("clau")["valor"].items()} for z in ("cat", "esp")}
    # Destinos principales de cada capítulo (último año)
    cp = an[(an.nivell == "cap_pais") & (an["any"] == ult) & (an.flux == "E")].copy()
    cp[["cap", "pais"]] = cp["clau"].str.split("|", expand=True)
    cp = cp[~cp.pais.isin(NO_PAIS)]
    cap_pais = {}
    for c, g in cp.groupby("cap"):
        t = g["valor"].sum()
        if t < 20 * M:
            continue
        g = g.sort_values("valor", ascending=False).head(5)
        cap_pais[c] = [[r.pais, _r(r.valor / t * 100)] for r in g.itertuples()]
    # Modo de transporte (último año)
    mo = an[(an.nivell == "mode") & (an.zona == "gi") & (an["any"] == ult)]
    mode = {f: {r.clau: _r(r.valor / M) for r in mo[mo.flux == f].itertuples()} for f in "EI"}
    # Peso: euros por kilo exportado
    pes = {z: _r(an[(an.nivell == "cap") & (an.zona == z) & (an.flux == "E") & (an["any"] == ult)]["valor"].sum()
                 / max(1, an[(an.nivell == "cap") & (an.zona == z) & (an.flux == "E") & (an["any"] == ult)]["pes"].sum()), 2)
           for z in ("gi", "cat", "esp")}

    # Provincias: exportaciones e importaciones por año y población
    pr = an[(an.nivell == "prov") & (an.zona != "--")]
    provs = {}
    for c, g in pr.groupby("zona"):
        s = {f: g[g.flux == f].set_index("any")["valor"] for f in "EI"}
        provs[c] = {f: [_r(s[f].get(y, 0) / M) for y in anys] for f in "EI"}
    fp = DIR / "poblacio.csv"
    pob = {}
    if fp.exists():
        p = pd.read_csv(fp, dtype={"prov": str})
        p = p[p["any"] == p["any"].max()]
        pob = {r.prov: int(r.poblacio) for r in p.itertuples()}
        for z, cs in (("gi", ["17"]), ("cat", ["08", "17", "25", "43"])):
            pob[z] = sum(pob.get(c, 0) for c in cs)
        pob["any"] = int(p["any"].max())

    salida.mkdir(parents=True, exist_ok=True)
    for g in ("mon.geojson", "provincies.geojson"):
        if (DIR / g).exists():
            shutil.copy(DIR / g, salida / g)
    D = {"anys": anys, "prov_anys": prov_anys, "ult": ult, "tot": tot, "mes": mes, "u12": u12, "paisos": paisos,
         "cat_paisos": {c: _r(v / M) for c, v in cat_p.items() if v >= 1e5}, "ue": ue, "caps": caps, "caps_ref": caps_ref,
         "cap_pais": cap_pais, "mode": mode, "eur_kg": pes, "provs": provs, "pob": pob}
    (salida / "exportacions.json").write_text(json.dumps(D, ensure_ascii=False, separators=(",", ":"), allow_nan=False), encoding="utf-8")
    return {"ult": ult, "anys": anys}


if __name__ == "__main__":
    print(construir(RAIZ / "web" / "datos"))
