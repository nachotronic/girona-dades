"""Comerç: Cens d'establiments comercials de Catalunya (CECC) i fonts complementàries.

- 2dhj-q3r8  CECC per municipi i any (2017, 2018, 2019, 2021, 2023): establiments, superfície
             de venda i desglossament per sector. Es guarda tot Catalunya (per a les
             referències) amb el codi INE afegit als municipis de Girona.
- 4w2r-uffk  Mapa del Comerç Català 2022: locals actius i buits de les ciutats de més de
             20.000 habitants i capitals de comarca (índex d'ocupació comercial).
- jyyn-3aye  Ocupació comercial (IATC) per districte/secció de les ciutats inspeccionades,
             amb geometria.
- 8dtv-rvgy  Registre de llicències comercials (grans establiments) amb coordenades.
- 7wgs-rhrt  Mapa Comercial de Ciutats Europees 2024 (si té ciutats de Girona).
- API de censcomerc.empresa.gencat.cat (api/sector/filtre/municipi): establiments i superfície
  per sector de cada municipi. Les dades obertes només tenen els sectors dels ~120 municipis
  més grans de Catalunya; l'API els té tots. Els anys ja descarregats no es tornen a demanar,
  excepte el darrer.

Cada part que falla escriu «ERROR» al resum i no impedeix les altres.
"""
from __future__ import annotations

import io
import json

import pandas as pd

import time

from .comun import PROC, carpeta, get, normaliza

API = "https://censcomerc.empresa.gencat.cat/api/"

SOC = "https://analisi.transparenciacatalunya.cat/resource/"


def _csv(ds: str, params: dict | None = None) -> pd.DataFrame:
    parts, off = [], 0
    while True:
        p = {"$limit": 50000, "$offset": off, **(params or {})}
        r = get(SOC + ds + ".csv", params=p, timeout=300)
        df = pd.read_csv(io.BytesIO(r.content), dtype=str)
        parts.append(df)
        if len(df) < 50000:
            break
        off += 50000
    return pd.concat(parts, ignore_index=True)


def _municipis():
    m = pd.read_csv(PROC / "territorio" / "municipios.csv", dtype=str)
    return {normaliza(n): c for n, c in zip(m["nom"], m["codi_ine"])}, set(m["codi_idescat"])


ALIES = {  # noms del CECC que no coincideixen amb l'Idescat (municipis que han canviat de nom)
    "Calonge": "Calonge i Sant Antoni", "Castell-Platja d'Aro": "Castell d'Aro, Platja d'Aro i s'Agaró",
    "Brunyola": "Brunyola i Sant Martí Sapresa", "Palamós": "Palamós i Sant Joan", "Masarac": "Masarac i Vilarnadal",
}


def ejecutar() -> str:
    sal = carpeta("comerc")
    noms, idescat = _municipis()
    res = []

    # 1. CECC
    try:
        df = _csv("2dhj-q3r8")
        df["ine"] = df["municipi"].map(lambda n: noms.get(normaliza(ALIES.get(n, n))))
        df.to_csv(sal / "cecc.csv", index=False)
        gi = df[df["ine"].notna()]
        sense = sorted(set(df.loc[df["ine"].isna() & df["comarca"].isin(
            ["Alt Empordà", "Baix Empordà", "Garrotxa", "Gironès", "Pla de l'Estany", "Ripollès", "Selva", "Cerdanya"]), "municipi"]))
        res.append(f"CECC {len(df)} files, anys {','.join(sorted(df['any'].unique()))}, {gi['ine'].nunique()} municipis de Girona"
                   + (f"; sense codi: {', '.join(sense[:20])}" if sense else ""))
    except Exception as e:  # noqa: BLE001
        res.append(f"ERROR CECC: {e}")

    # 1b. Sectors per municipi (API de l'aplicació)
    try:
        res.append(_sectors_api(sal, df))
    except Exception as e:  # noqa: BLE001
        res.append(f"ERROR sectors API: {e}")

    # 2. Mapa del Comerç Català 2022 (locals buits)
    try:
        mc = _csv("4w2r-uffk")
        mc.to_csv(sal / "mapa_comerc_2022.csv", index=False)
        res.append(f"Mapa del Comerç 2022: {len(mc)} ciutats, {mc['codi'].isin(idescat).sum()} de Girona")
    except Exception as e:  # noqa: BLE001
        res.append(f"ERROR Mapa del Comerç: {e}")

    # 3. Ocupació comercial per districte (amb geometria)
    try:
        r = get(SOC + "jyyn-3aye.geojson", params={"$limit": 50000}, timeout=300)
        gj = r.json()
        feats = [f for f in gj.get("features", [])
                 if str(f["properties"].get("municipi", ""))[:2] == "17" or str(f["properties"].get("mundissec", ""))[:2] == "17"]
        (sal / "iatc_districtes.geojson").write_text(json.dumps({"type": "FeatureCollection", "features": feats}, ensure_ascii=False))
        ciutats = sorted({f["properties"].get("nom_municipi") for f in feats})
        res.append(f"IATC: {len(gj.get('features', []))} zones a Catalunya, {len(feats)} a Girona ({', '.join(map(str, ciutats))})")
    except Exception as e:  # noqa: BLE001
        res.append(f"ERROR IATC: {e}")

    # 4. Llicències comercials (grans establiments)
    try:
        ll = _csv("8dtv-rvgy", {"$where": "starts_with(codi_municipi,'17')"})
        ll = ll.drop(columns=[c for c in ll.columns if c.startswith(":@") or c.startswith("nif")], errors="ignore")
        ll.to_csv(sal / "llicencies.csv", index=False)
        res.append(f"Llicències comercials: {len(ll)} a Girona")
    except Exception as e:  # noqa: BLE001
        res.append(f"ERROR llicències: {e}")

    # 5. Mapa Comercial de Ciutats Europees 2024 (exploratori)
    try:
        eu = _csv("7wgs-rhrt")
        eu.to_csv(sal / "mapa_comercial_2024.csv", index=False)
        res.append(f"Mapa Comercial 2024: {len(eu)} files, columnes {', '.join(eu.columns[:12])}")
    except Exception as e:  # noqa: BLE001
        res.append(f"ERROR Mapa Comercial 2024: {e}")
    return "; ".join(res)


def _sectors_api(sal, df) -> str:
    f = sal / "sectors_municipis.csv"
    prev = pd.read_csv(f, dtype=str) if f.exists() else pd.DataFrame(columns=["ine", "municipi", "any", "sector", "establiments", "sup_venda"])
    gi = df[df["ine"].notna()][["ine", "municipi", "any", "establiments"]].drop_duplicates(["ine", "municipi", "any"])
    darrer = gi["any"].max()
    fets = set(zip(prev["ine"], prev["any"])) if len(prev) else set()
    files, fallits, n = [], [], 0

    def variants(nom: str) -> list[str]:
        """L'API no sempre fa servir el nom del cens: «Bisbal d'Empordà, la» -> «la Bisbal d'Empordà», noms antics."""
        v = [nom]
        if ", " in nom:
            base, art = nom.rsplit(", ", 1)
            v.append(f"{art}{base}" if art.endswith("'") else f"{art} {base}")
        v += [k for k, val in ALIES.items() if val == nom]
        return list(dict.fromkeys(v))

    def consulta(x) -> bool:
        nonlocal n
        dades = None
        for nom in variants(x.municipi):
            try:
                r = get(API + "sector/filtre/municipi", params={"municipi": nom, "year": x.any}, timeout=60, reintentos=2)
                dades = r.json()
                break
            except Exception:  # noqa: BLE001
                continue
        if dades is None:
            return False
        n += 1
        for s in dades if isinstance(dades, list) else []:
            files.append({"ine": x.ine, "municipi": x.municipi, "any": x.any, "sector": s.get("sector"),
                          "establiments": s.get("numEstabliments") or 0, "sup_venda": s.get("supVenda") or 0})
        return True

    for x in gi.itertuples():
        if (x.ine, x.any) in fets and x.any != darrer:
            continue
        if not consulta(x):
            fallits.append(x)
        time.sleep(0.15)
    # L'API falla a ratxes (503): segona passada, més a poc a poc, només per a les consultes fallides
    if fallits:
        time.sleep(60)
        resten = []
        for x in fallits:
            if not consulta(x):
                resten.append(x)
            time.sleep(1.5)
        fallits = resten
    # Les que continuen fallant però ja tenien dades d'una execució anterior es conserven: no és un error
    sense = [x for x in fallits if (x.ine, x.any) not in fets]
    conservats = len(fallits) - len(sense)
    # Municipis sense cap establiment aquell any: l'API no en té fitxa, no és un error
    buits = [x for x in sense if pd.to_numeric(x.establiments, errors="coerce") == 0]
    errors = len(sense) - len(buits)
    nou = pd.DataFrame(files, dtype=str)
    if len(nou):
        claus = set(zip(nou["ine"], nou["any"]))
        prev = prev[[k not in claus for k in zip(prev["ine"], prev["any"])]] if len(prev) else prev
    tot = pd.concat([prev, nou], ignore_index=True).sort_values(["ine", "any", "sector"])
    tot.to_csv(f, index=False)
    return (f"Sectors per municipi (API): {n} consultes, {tot[['ine', 'any']].drop_duplicates().shape[0]} municipi-any"
            + (f"; {conservats} consultes fallides, es conserven les dades anteriors" if conservats else "")
            + (f"; {len(buits)} municipi-any sense establiments (l'API no en té fitxa)" if buits else "")
            + (f"; ERROR en {errors} consultes sense dades anteriors: " + ", ".join(f"{x.municipi} {x.any}" for x in sense if x not in buits)[:300] if errors else ""))
