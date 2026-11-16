"""Ejecuta las fuentes indicadas y lleva el registro del estado de cada una.

Uso: python scripts/actualizar.py [territorio generalitat ine ...]   (sin argumentos = todas)

Escribe:
  data/estado.json  estado acumulado por fuente: último intento, última descarga correcta,
                    resultado y resumen. Las ejecuciones parciales solo cambian sus fuentes.
  data/estado.md    el mismo estado en una tabla, más el detalle de esta ejecución.

Estados de cada fuente:
  ok     sin errores
  avís   la fuente terminó pero alguna parte falló (una línea con «ERROR» en su resumen) o
         un fichero se habría quedado a menos de la mitad y se ha restaurado
  error  la fuente lanzó una excepción (sus ficheros anteriores no se tocan)

Protección: si tras ejecutar una fuente un fichero de data/processed que ya estaba en git
desaparece o pierde más de la mitad de su tamaño, se restaura la versión de git (una
respuesta vacía o un cambio de formato en origen no machaca datos buenos). Con
PERMETRE_REDUCCIO=1 se acepta la reducción.

Si la variable PROBLEMES_MD apunta a un fichero, se escribe en él la lista de fuentes con
problemas (error, avís o sin descarga correcta en DIES_CADUCAT días) para abrir una issue.
"""
from __future__ import annotations

import datetime as dt
import importlib
import json
import os
import pathlib
import subprocess
import sys
import time
import traceback

RAIZ = pathlib.Path(__file__).resolve().parent.parent
sys.path.insert(0, str(RAIZ))
PROC = RAIZ / "data" / "processed"
F_JSON = RAIZ / "data" / "estado.json"
F_MD = RAIZ / "data" / "estado.md"
DIES_CADUCAT = 15  # todas las fuentes se ejecutan cada semana: dos semanas sin éxito es un problema

TODAS = ["territorio", "generalitat", "ine", "mitma", "xifra", "catastro", "geometria", "salut", "policia", "referencies", "provincia", "emex", "educacio", "nacionalitat", "universitaris", "conjuntura", "emergencies", "afiliacio", "dgt", "aena", "eleccions", "aeat", "padro", "pressupostos", "tributs", "llistes_espera"]

# Nombre de cada fuente (para estado.md, la issue y la web) y cada cuánto publica el organismo
FONTS = {
    "territorio": ("Municipis i comarques (Idescat)", "fix"),
    "generalitat": ("Dades obertes de la Generalitat: lloguer, turisme, habitatges iniciats, ens locals…", "mensual/trimestral"),
    "ine": ("INE, Atlas de distribució de renda", "anual"),
    "mitma": ("Ministerio de Transportes y Vivienda, Boletín Online", "trimestral"),
    "xifra": ("Xifra, Diputació de Girona", "anual"),
    "catastro": ("Catastro INSPIRE, edificis", "semestral"),
    "geometria": ("INE, seccionat censal 2024", "fix"),
    "salut": ("CatSalut: àrees bàsiques de salut, receptes, infeccions i centres", "setmanal/mensual"),
    "llistes_espera": ("CatSalut, llistes d'espera per hospital", "mensual"),
    "policia": ("Mossos d'Esquadra, fets penals", "mensual"),
    "referencies": ("Valors de referència de Catalunya i Espanya", "anual"),
    "provincia": ("INE, sèries de la província", "mensual"),
    "emex": ("Idescat, El municipi en xifres", "anual"),
    "educacio": ("Departament d'Educació i INE, cens 2021", "anual"),
    "nacionalitat": ("INE i Idescat, població per nacionalitat", "anual"),
    "universitaris": ("Idescat, mobilitat universitària", "anual"),
    "conjuntura": ("SEPE, atur i contractes", "mensual"),
    "emergencies": ("Bombers, Agents Rurals i incendis forestals", "anual"),
    "afiliacio": ("Idescat, afiliació a la Seguretat Social", "mensual"),
    "dgt": ("DGT, matriculacions", "mensual"),
    "aena": ("Aena, passatgers de l'aeroport", "mensual"),
    "eleccions": ("Generalitat, processos electorals", "per elecció"),
    "aeat": ("Agencia Tributaria, IRPF per municipis", "anual"),
    "padro": ("INE, padró i empreses (DIRCE)", "anual"),
    "pressupostos": ("Generalitat, liquidació dels pressupostos municipals", "anual"),
    "tributs": ("Ministerio de Hacienda, tipus impositius municipals", "anual"),
}


def ara() -> str:
    return dt.datetime.now(dt.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def mides() -> dict[str, int]:
    return {str(p.relative_to(RAIZ)): p.stat().st_size for p in PROC.rglob("*") if p.is_file()} if PROC.exists() else {}


def en_git(ruta: str) -> bool:
    r = subprocess.run(["git", "ls-files", "--error-unmatch", ruta], cwd=RAIZ, capture_output=True)
    return r.returncode == 0


def protegeix(abans: dict[str, int]) -> list[str]:
    """Restaura de git los ficheros que han desaparecido o se han quedado a menos de la mitad."""
    if os.environ.get("PERMETRE_REDUCCIO") == "1":
        return []
    despres, restaurats = mides(), []
    for ruta, mida in abans.items():
        nova = despres.get(ruta)
        if mida < 2048 or (nova is not None and nova >= mida / 2):
            continue
        if not en_git(ruta):
            continue
        r = subprocess.run(["git", "checkout", "HEAD", "--", ruta], cwd=RAIZ, capture_output=True, text=True)
        if r.returncode == 0:
            restaurats.append(f"{ruta}: {mida // 1024} KB -> {'esborrat' if nova is None else f'{nova // 1024} KB'}, restaurat")
    return restaurats


def llegeix_estat() -> dict:
    try:
        return json.loads(F_JSON.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return {}


def problemes(estat: dict) -> list[str]:
    avui = dt.datetime.now(dt.timezone.utc)
    res = []
    for n in TODAS:
        e = estat.get(n)
        nom = FONTS.get(n, (n,))[0]
        if not e:
            res.append(f"- **{n}** ({nom}): encara no s'ha executat")
            continue
        if e["estat"] != "ok":
            res.append(f"- **{n}** ({nom}): {e['estat']} el {e['intent'][:10]}")
        ok = e.get("ok")
        if not ok:
            res.append(f"- **{n}** ({nom}): cap descàrrega correcta registrada")
        elif (avui - dt.datetime.fromisoformat(ok.replace("Z", "+00:00"))).days > DIES_CADUCAT:
            res.append(f"- **{n}** ({nom}): última descàrrega correcta el {ok[:10]}")
    return res


def escriu_md(estat: dict, blocs: list[str]) -> None:
    files = ["| Font | Estat | Última descàrrega correcta | Últim intent | Publica |", "|---|---|---|---|---|"]
    for n in TODAS:
        e = estat.get(n, {})
        nom, freq = FONTS.get(n, (n, ""))
        files.append(f"| {n} — {nom} | {e.get('estat', '—')} | {(e.get('ok') or '—')[:16].replace('T', ' ')} | "
                     f"{(e.get('intent') or '—')[:16].replace('T', ' ')} | {freq} |")
    text = [f"# Estado de las fuentes\n\nÚltima ejecución: {ara()[:16].replace('T', ' ')} UTC\n", "\n".join(files) + "\n",
            "## Detalle de la última ejecución\n", *blocs]
    F_MD.write_text("\n".join(text), encoding="utf-8")


def main(nombres: list[str]) -> int:
    nombres = nombres or TODAS
    estat = llegeix_estat()
    blocs, errors = [], 0
    for n in nombres:
        t0, inici = time.time(), ara()
        abans = mides()
        try:
            res = str(importlib.import_module(f"fuentes.{n}").ejecutar())
            e = "avís" if "ERROR" in res else "ok"
        except Exception:  # noqa: BLE001
            res, e = traceback.format_exc(limit=3), "error"
            errors += 1
        restaurats = protegeix(abans)
        if restaurats:
            res += "\n\nFicheros restaurados (habrían perdido más de la mitad):\n" + "\n".join(restaurats)
            e = "error" if e == "error" else "avís"
        durada = round(time.time() - t0)
        prev = estat.get(n, {})
        estat[n] = {"estat": e, "intent": inici, "ok": inici if e == "ok" else prev.get("ok"),
                    "durada": durada, "resum": res[-1500:]}
        bloc = f"### {n}: {e} ({durada} s)\n\n```\n{res}\n```\n"
        print(bloc, flush=True)
        blocs.append(bloc)
    F_JSON.parent.mkdir(exist_ok=True)
    F_JSON.write_text(json.dumps({k: estat[k] for k in sorted(estat)}, ensure_ascii=False, indent=1), encoding="utf-8")
    escriu_md(estat, blocs)
    if os.environ.get("PROBLEMES_MD"):
        p = problemes(estat)
        pathlib.Path(os.environ["PROBLEMES_MD"]).write_text("\n".join(p), encoding="utf-8")
        print(f"{len(p)} problemas pendientes", flush=True)
    return 1 if errors == len(nombres) else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
