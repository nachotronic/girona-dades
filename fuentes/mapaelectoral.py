"""Resultados electorales históricos de Mapa Electoral (mapaelectoral.es), por municipio y sección censal.

Completa lo que no publica la Generalitat en fuentes/eleccions.py (que empieza en 2010):
  Congrés     1977-2000 por municipio, 2004 y 2008 por sección
  Europees    1987-1999 por municipio, 2004 y 2009 por sección
  Municipals  1979-2007 por municipio
  República   Corts de 1933 y 1936 por municipio actual
y cualquier convocatoria nueva (29N de 2026) mientras la Generalitat no la publique.

Descargas (CC BY 4.0, citando Ministerio del Interior e INE), https://mapaelectoral.es/generales-2026/metodologia.html:
  municipios.csv, municipios_historico.csv       votos por familia política y municipio
  resultados_secciones_largo*.csv                votos por familia, blancos y nulos por sección (INE 2023)
  municipios_republica.csv                       % por bloque, municipios actuales (CC BY-NC-SA 4.0,
                                                 Atlas Electoral de la Segunda República, UPF)

Mapa Electoral agrupa las candidaturas en familias (PP, PSOE, SUMAR, ERC, JUNTS...), no da las listas
una a una. Escribe en data/processed/mapaelectoral/ el mismo formato que fuentes/eleccions.py:
  vots_<ID>.csv.gz, part_<ID>.csv.gz y convocatories.csv
con una columna «bloc» ya asignada.
"""
from __future__ import annotations

import io
import re

import pandas as pd

from .comun import carpeta, get
from .eleccions import CONVOCATORIES

BASE = "https://mapaelectoral.es/generales-2026/descargas/"
CATALUNYA = ("08", "17", "25", "43")

# Fechas de las convocatorias que no están en la tabla de la Generalitat
DATES = {"R19331": "1933-11-19", "R19361": "1936-02-16", "G20261": "2026-11-29"}

BLOC_FAM = {"PP": "PP", "PSOE": "PSC", "VOX": "Vox", "SUMAR": "Comuns", "CS": "Cs", "ERC": "ERC",
            "JUNTS": "Junts", "CUP": "CUP", "UCD": "UCD", "AA": "Aliança"}
BLOC_REP = {"ERC": "ERC", "LLIGA": "Lliga", "DER": "Dretes", "CENTRO": "Centre", "FP": "FEsq"}
NOM_REP = {"ERC": "ERC", "LLIGA": "Lliga", "DER": "Dretes", "CENTRO": "Centre", "FP": "Front d'Esquerres",
           "PSOE": "Socialistes", "SUMAR": "Comunistes", "IZQREP": "Esq. republicana", "PNV": "PNB", "OTROS": "Altres"}
DESC = {  # por siglas
    "PDC": "Pacte Democràtic per Catalunya", "CiU": "Convergència i Unió", "PSUC": "Partit Socialista Unificat de Catalunya",
    "IC": "Iniciativa per Catalunya", "ICV-EUiA": "Iniciativa per Catalunya Verds - Esquerra Unida i Alternativa",
    "PSC": "Partit dels Socialistes de Catalunya", "AP": "Alianza Popular i coalicions", "PP": "Partit Popular",
    "UCD": "Unión de Centro Democrático", "CDS": "Centro Democrático y Social", "ERC": "Esquerra Republicana de Catalunya",
    "Altres": "Altres candidatures", "Locals i altres": "Llistes locals i altres candidatures",
}


def _sigles(fam: str, tipus: str, any_: int) -> str:
    if fam == "JUNTS":
        return "PDC" if any_ == 1977 else "CiU" if any_ < 2015 else "DL" if any_ == 2015 else "CDC" if any_ == 2016 else "Junts"
    if fam == "SUMAR":
        return "PSUC" if any_ < 1987 else "IC" if any_ < 2003 else "ICV-EUiA" if any_ < 2015 else "ECP" if any_ < 2023 else "Sumar"
    if fam == "PP":
        return "AP" if any_ < 1989 else "PP"
    if fam == "PSOE":
        return "PSC"
    if fam == "OTROS":
        return "Locals i altres" if tipus == "M" else "Altres"
    return {"CS": "Cs", "AA": "Aliança", "VOX": "Vox"}.get(fam, fam)


def _bloc(fam: str, tipus: str) -> str:
    if fam in BLOC_FAM:
        return BLOC_FAM[fam]
    return "Locals" if tipus == "M" and fam == "OTROS" else "Altres"


def _llegeix(nom: str) -> pd.DataFrame:
    df = pd.read_csv(io.BytesIO(get(BASE + nom, timeout=600).content), dtype={"mun_code": str, "tract_code": str}, low_memory=False)
    df["mun_code"] = df["mun_code"].str.zfill(5)
    return df[df["mun_code"].str[:2].isin(CATALUNYA)].copy()


def _ident(clau: str, keys_any: list[str]) -> str:
    """«2019_11» -> G20192, «E2004» -> E20041, «M2007» -> M20071."""
    if clau[0] in "EM":
        return f"{clau}1"
    any_ = clau[:4]
    n = sorted(k for k in keys_any if k[:4] == any_).index(clau) + 1
    return f"G{any_}{n}"


def _claus(cols, patro: str) -> list[str]:
    return sorted({m.group(1) for c in cols if (m := re.match(patro, c))})


def _municipis(df: pd.DataFrame, clau: str, tipus: str) -> tuple[list, list]:
    """Filas MU (Girona) y CA (suma de Cataluña) a partir de un CSV ancho con <clau>_v<FAM>."""
    fams = [c[len(clau) + 2:] for c in df.columns if c.startswith(clau + "_v") and c != clau + "_votantes"]
    any_ = int(re.search(r"\d{4}", clau).group())
    d = df[df[clau + "_censo"].notna()]
    vots, part = [], []
    for nivell, g in (("MU", d[d["mun_code"].str[:2] == "17"]), ("CA", d)):
        grups = g.groupby("mun_code") if nivell == "MU" else [("cat", g)]
        for ine, x in grups:
            tot = 0
            for fam in fams:
                n = int(pd.to_numeric(x[f"{clau}_v{fam}"], errors="coerce").fillna(0).sum())
                if n > 0:
                    tot += n
                    vots.append({"nivell": nivell, "ine": ine if nivell == "MU" else "", "candidatura": fam,
                                 "sigles": _sigles(fam, tipus, any_), "denominacio": DESC.get(_sigles(fam, tipus, any_), ""), "vots": n,
                                 "bloc": _bloc(fam, tipus)})
            cens = int(pd.to_numeric(x[clau + "_censo"], errors="coerce").fillna(0).sum())
            votants = int(pd.to_numeric(x[clau + "_votantes"], errors="coerce").fillna(0).sum())
            # Sin blancos ni nulos por municipio: la diferencia entre votantes y votos a candidaturas va a «nuls»
            part.append({"nivell": nivell, "ine": ine if nivell == "MU" else "", "cens": cens, "votants": votants,
                         "nuls": max(0, votants - tot), "blancs": 0, "candidatures": tot})
    return vots, part


def _seccions(df: pd.DataFrame, clau: str, tipus: str) -> tuple[list, list]:
    """Filas SE (Girona) del CSV largo por sección."""
    any_ = int(re.search(r"\d{4}", clau).group())
    d = df[(df["eleccion"] == clau) & (df["mun_code"].str[:2] == "17")]
    fixes = {"tract_code", "mun_code", "censo", "blancos", "nulos", "candidaturas", "votantes", "eleccion"}
    fams = [c for c in d.columns if c not in fixes]
    vots, part = [], []
    for _, f in d.iterrows():
        t = str(f["tract_code"]).zfill(10)
        loc = {"nivell": "SE", "ine": t[:5], "districte": t[5:7], "seccio": t[7:]}
        for fam in fams:
            n = f[fam]
            if pd.notna(n) and n > 0:
                vots.append({**loc, "candidatura": fam, "sigles": _sigles(fam, tipus, any_), "denominacio": DESC.get(_sigles(fam, tipus, any_), ""),
                             "vots": int(n), "bloc": _bloc(fam, tipus)})
        part.append({**loc, **{k: int(f[c]) if pd.notna(f[c]) else 0 for k, c in
                               (("cens", "censo"), ("votants", "votantes"), ("nuls", "nulos"), ("blancs", "blancos"),
                                ("candidatures", "candidaturas"))}})
    return vots, part


def _republica(df: pd.DataFrame, clau: str) -> tuple[list, list]:
    """Porcentajes por bloque (sin blancos ni nulos) convertidos en votos aproximados."""
    fams = [c[len(clau) + 1:] for c in df.columns if c.startswith(clau + "_")
            and c[len(clau) + 1:] not in ("part", "censo", "votantes", "gana", "municipios_epoca")]
    d = df[df[clau + "_censo"].notna()]
    vots, part = [], []
    for nivell, g in (("MU", d[d["mun_code"].str[:2] == "17"]), ("CA", d)):
        grups = g.groupby("mun_code") if nivell == "MU" else [("cat", g)]
        for ine, x in grups:
            votants = pd.to_numeric(x[clau + "_votantes"], errors="coerce").fillna(0)
            tot = 0
            for fam in fams:
                n = int(round((pd.to_numeric(x[f"{clau}_{fam}"], errors="coerce").fillna(0) * votants).sum()))
                if n > 0:
                    tot += n
                    vots.append({"nivell": nivell, "ine": ine if nivell == "MU" else "", "candidatura": fam,
                                 "sigles": NOM_REP.get(fam, fam), "denominacio": "", "vots": n,
                                 "bloc": BLOC_REP.get(fam, "Altres")})
            part.append({"nivell": nivell, "ine": ine if nivell == "MU" else "",
                         "cens": int(pd.to_numeric(x[clau + "_censo"], errors="coerce").fillna(0).sum()),
                         "votants": int(votants.sum()), "nuls": 0, "blancs": 0, "candidatures": tot})
    return vots, part


def _desa(salida, ident: str, vots: list, part: list) -> str:
    v, p = pd.DataFrame(vots), pd.DataFrame(part)
    if v.empty or p.empty:
        return f"{ident}: sin datos"
    v.to_csv(salida / f"vots_{ident}.csv.gz", index=False)
    p.to_csv(salida / f"part_{ident}.csv.gz", index=False)
    n = p["nivell"].value_counts().to_dict()
    return f"{ident}: {len(v)} filas de votos, zonas {n}"


def ejecutar() -> str:
    salida = carpeta("mapaelectoral")
    lineas, conv = [], []

    def afegeix(ident, data, vots, part):
        if ident in CONVOCATORIES:  # ya la publica la Generalitat, con las candidaturas una a una
            return
        lineas.append(_desa(salida, ident, vots, part))
        conv.append({"id_eleccio": ident, "data_eleccio": DATES.get(ident, data), "font": "rep" if ident[0] == "R" else "me"})

    # Congrés, municipals y europeas desde 2004 (2007 municipales, solo municipio)
    mun = _llegeix("municipios.csv")
    sec_g = _llegeix("resultados_secciones_largo.csv")
    sec_me = _llegeix("resultados_secciones_largo_municipales_europeas.csv")
    claus_g = _claus(mun.columns, r"^(\d{4}_\d{2})_censo$")
    for clau in claus_g:
        ident = _ident(clau, claus_g)
        v, p = _municipis(mun, clau, "G")
        sv, sp = _seccions(sec_g, clau, "G")
        afegeix(ident, f"{clau[:4]}-{clau[5:7]}-01", v + sv, p + sp)
    for clau in _claus(mun.columns, r"^([EM]\d{4})_censo$"):
        v, p = _municipis(mun, clau, clau[0])
        sv, sp = _seccions(sec_me, clau, clau[0])
        afegeix(_ident(clau, []), f"{clau[1:5]}-01-01", v + sv, p + sp)

    # Antes de 2004: solo por municipio
    his = _llegeix("municipios_historico.csv")
    claus_h = _claus(his.columns, r"^(\d{4}_\d{2})_censo$")
    for clau in claus_h:
        v, p = _municipis(his, clau, "G")
        afegeix(_ident(clau, claus_h), f"{clau[:4]}-{clau[5:7]}-01", v, p)
    for clau in _claus(his.columns, r"^([EM]\d{4})_censo$"):
        v, p = _municipis(his, clau, clau[0])
        afegeix(_ident(clau, []), f"{clau[1:5]}-01-01", v, p)

    # Segunda República
    rep = _llegeix("municipios_republica.csv")
    for clau in _claus(rep.columns, r"^(\d{4}_\d{2})_censo$"):
        v, p = _republica(rep, clau)
        afegeix(f"R{clau[:4]}1", f"{clau[:4]}-{clau[5:7]}-01", v, p)

    pd.DataFrame(conv).sort_values("id_eleccio").to_csv(salida / "convocatories.csv", index=False)
    return "\n".join(lineas)
