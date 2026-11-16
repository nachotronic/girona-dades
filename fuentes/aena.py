"""Pasajeros del aeropuerto de Girona-Costa Brava (Aena, informes mensuales en Excel).

Cada año tiene una página con un bloque por mes y enlaces a PDF y XLS. Del XLS se toma
la hoja de pasajeros y las filas de Girona, Barcelona y el total de la red.
  data/processed/conjuntura/aena.csv   mes, aeroport, passatgers (mes), fila (texto original)
Los meses ya guardados no se vuelven a descargar.
"""
from __future__ import annotations

import datetime as dt
import io

import pandas as pd
from bs4 import BeautifulSoup

from .comun import carpeta, get

BASE = "https://www.aena.es"
PAGINA = BASE + "/es/estadisticas/informes-mensuales.html?anio={}"
MESOS = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"]
DESDE = 2019
BUSCA = {"GIRONA": "girona", "BARCELONA": "barcelona", "TOTAL": "total"}


def _enllacos(any_: int) -> dict[str, str]:
    soup = BeautifulSoup(get(PAGINA.format(any_)).text, "lxml")
    res = {}
    for bloc in soup.select("div.informes"):
        mes = (bloc.get("id") or "").strip().lower()
        if mes not in MESOS:
            continue
        for a in bloc.find_all("a", href=True):
            if "XLS" in a.get_text(" ", strip=True).upper():
                res[f"{any_}-{MESOS.index(mes) + 1:02d}"] = BASE + a["href"] if a["href"].startswith("/") else a["href"]
    return res


def _llegeix(contingut: bytes) -> list[dict]:
    fulls = pd.read_excel(io.BytesIO(contingut), sheet_name=None, header=None, dtype=str)
    # Hoja de pasajeros: la primera que lo menciona
    nom = next((n for n, d in fulls.items() if "PASAJ" in (str(n) + " " + " ".join(d.head(12).fillna("").astype(str).values.ravel())).upper()), next(iter(fulls)))
    res = []
    for _, fila in fulls[nom].iterrows():
        cel = [str(x).strip() for x in fila if str(x).strip() not in ("", "nan")]
        if not cel:
            continue
        clau = next((v for k, v in BUSCA.items() if cel[0].upper().startswith(k)), None)
        if not clau:
            continue
        nums = []
        for x in cel[1:]:
            try:
                nums.append(float(x.replace(".", "").replace(",", ".")) if isinstance(x, str) and "," in x else float(x))
            except ValueError:
                continue
        if nums:
            res.append({"aeroport": clau, "passatgers": nums[0], "fila": " | ".join(cel)[:300]})
    return res


def ejecutar() -> str:
    sal = carpeta("conjuntura")
    f = sal / "aena.csv"
    prev = pd.read_csv(f, dtype={"mes": str}) if f.exists() else pd.DataFrame(columns=["mes", "aeroport", "passatgers", "fila"])
    fets = set(prev["mes"])
    noves, linies = [], []
    for any_ in range(DESDE, dt.date.today().year + 1):
        try:
            enll = _enllacos(any_)
        except Exception as e:  # noqa: BLE001
            linies.append(f"{any_}: ERROR página {type(e).__name__}")
            continue
        for mes, url in sorted(enll.items()):
            if mes in fets:
                continue
            try:
                files = _llegeix(get(url, timeout=120).content)
                # Si hay varias filas de un mismo aeropuerto (p. ej. subtotales), vale la primera
                vist = set()
                for x in files:
                    if x["aeroport"] not in vist:
                        vist.add(x["aeroport"])
                        noves.append({"mes": mes, **x})
                resum = ", ".join("%s=%.0f" % (x["aeroport"], x["passatgers"]) for x in files[:3])
                linies.append(f"{mes}: {resum}")
            except Exception as e:  # noqa: BLE001
                linies.append(f"{mes}: ERROR {type(e).__name__}: {str(e)[:80]}")
    df = pd.concat([prev, pd.DataFrame(noves)]) if noves else prev
    df.sort_values(["mes", "aeroport"]).to_csv(f, index=False)
    return f"{len(noves)} filas nuevas\n" + "\n".join(linies[-30:])
