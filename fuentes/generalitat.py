"""Conjuntos de dades obertes de la Generalitat (Socrata), filtrados a la provincia de Girona.

Cada conjunto se descarga completo en CSV y se filtra buscando la columna que contiene
códigos o nombres de los municipios de Girona. Si no se encuentra, se guarda sin filtrar
y se indica en el resultado.
"""
from __future__ import annotations

import io

import pandas as pd

from .comun import RAW, carpeta, get, normaliza, slug
from .territorio import municipios

DOMINIO = "https://analisi.transparenciacatalunya.cat"

CONJUNTOS = {
    "qww9-bvhh": "Preu mitjà del lloguer d'habitatges per municipi",
    "t2h3-cgys": "Establiments d'allotjament turístic (Registre de Turisme)",
    "q4sr-68c3": "Impost sobre estades en establiments turístics per municipi",
    "u5i2-b24m": "Renda garantida de ciutadania per municipis",
    "69zu-w48s": "Estadístiques de residus municipals",
    "8idm-becu": "Consum d'energia elèctrica per municipis i sectors",
    "2b4s-skfm": "Instal·lacions d'autoconsum elèctric",
    "8aaj-ypcb": "Indicadors territorials de l'Observatori del Territori",
    "yqwd-vj5e": "Metadades estacions meteorològiques automàtiques (XEMA)",
    "qnyt-emjc": "Fets penals coneguts, resolts i detencions",
    # Cargos electos (se actualizan a diario)
    "nm3n-3vbj": "Composició dels plens d'ajuntaments",
    "vevv-8fvw": "Dades d'ens locals - Ajuntaments",
    "2v2p-vu4h": "Historial d'alcaldes",
    "vq27-2ky2": "Eleccions municipals. Vots",
    "ques-gd6z": "Eleccions municipals. Participació",
}

# Columnas con datos de contacto personales que no se guardan
NO_GUARDAR = {"E-MAIL", "E_MAIL", "EMAIL", "TELEFON_MOBIL"}


def _filtra_girona(df: pd.DataFrame) -> tuple[pd.DataFrame, str]:
    mun = municipios()
    codigos5 = set(mun["codi_ine"])
    codigos6 = set(mun["codi_idescat"])
    nombres = set(mun["nom_normalitzat"])
    mejor, puntos = None, 0
    for col in df.columns:
        valores = df[col].dropna().astype(str).str.strip()
        if valores.empty:
            continue
        muestra = valores.drop_duplicates().head(5000)
        c = (muestra.str.zfill(5).isin(codigos5) | muestra.str.zfill(6).isin(codigos6)
             | muestra.str[:5].isin(codigos5) & muestra.str.len().isin([6, 10])).sum()
        n = muestra.map(normaliza).isin(nombres).sum()
        if max(c, n) > puntos:
            mejor, puntos = (col, "codigo" if c >= n else "nombre"), max(c, n)
    if not mejor or puntos < 5:
        # Último recurso: columnas de provincia o demarcación
        for col in df.columns:
            if any(k in normaliza(col) for k in ("provincia", "demarcacio", "regio", "regi")):
                m = df[col].astype(str).str.contains("Girona", case=False, na=False)
                if m.any():
                    return df[m], f"filtrado por {col}=Girona"
        return df, "SIN FILTRAR (no se encontró columna de municipio)"
    col, tipo = mejor
    v = df[col].astype(str).str.strip()
    if tipo == "codigo":
        m = v.str.zfill(5).isin(codigos5) | v.str.zfill(6).isin(codigos6) | (v.str[:5].isin(codigos5) & v.str.len().isin([6, 10]))
    else:
        m = v.map(normaliza).isin(nombres)
    return df[m], f"filtrado por {col} ({tipo})"


def descarga_conjunto(ident: str) -> pd.DataFrame:
    url = f"{DOMINIO}/api/views/{ident}/rows.csv?accessType=DOWNLOAD"
    r = get(url, timeout=600)
    (RAW / "generalitat").mkdir(parents=True, exist_ok=True)
    (RAW / "generalitat" / f"{ident}.csv").write_bytes(r.content)
    return pd.read_csv(io.BytesIO(r.content), dtype=str, low_memory=False)


def ejecutar() -> str:
    salida = carpeta("generalitat")
    lineas = []
    for ident, nombre in CONJUNTOS.items():
        try:
            df = descarga_conjunto(ident)
            filtrado, como = _filtra_girona(df)
            filtrado = filtrado.drop(columns=[c for c in filtrado.columns if c.upper() in NO_GUARDAR])
            filtrado.to_csv(salida / f"{ident}_{slug(nombre, 50)}.csv", index=False)
            lineas.append(f"{ident}: {len(filtrado)}/{len(df)} filas, {como}")
        except Exception as e:  # noqa: BLE001
            lineas.append(f"{ident}: ERROR {type(e).__name__}: {str(e)[:120]}")
    return "\n".join(lineas)
