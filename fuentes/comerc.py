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

Cada part que falla escriu «ERROR» al resum i no impedeix les altres.
"""
from __future__ import annotations

import io
import json

import pandas as pd

from .comun import PROC, carpeta, get, normaliza

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


ALIES = {  # noms del CECC que no coincideixen amb l'Idescat
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
