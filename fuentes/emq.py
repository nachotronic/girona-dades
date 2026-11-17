"""Enquesta de Mobilitat Quotidiana de les comarques gironines 2024-2025 (ATM Girona).

L'ATM no publica fitxers: només un visor Power BI «publicat a la web». Aquest mòdul fa les
mateixes consultes que fa el visor (API pública de Power BI, amb la clau del visor) però
agrupant per municipi de residència, comarca i parells origen-destinació.

Escriu data/processed/emq/<consulta>.json = {"cols": [...], "rows": [[...], ...]}.
"""
from __future__ import annotations

import base64
import json
import re
import time

import requests

from .comun import carpeta

R = "eyJrIjoiZDVmNjE4OGUtNTJjOS00MTcyLThlODUtM2YxZTI4NGY2Zjk0IiwidCI6IjNiOTQyN2RjLWQzMGUtNDNiYy04YzA2LWZmNzI1MzY3NmZlYyIsImMiOjh9"
VISOR = f"https://app.powerbi.com/view?r={R}"
UA = {"User-Agent": "Mozilla/5.0 (girona-dades)"}
CLUSTERS = ["north-europe-g-primary", "west-europe-d-primary", "west-europe-b-primary", "north-europe-k-primary"]

LV, SD, PE = "Data", "Data (cap de setmana)", "Data (persones)"
SUM, COUNT = 0, 5


def _clau():
    c = json.loads(base64.b64decode(R + "=" * (-len(R) % 4)))
    return c["k"], c["t"]


class Visor:
    def __init__(self):
        self.key, _ = _clau()
        self.h = {**UA, "X-PowerBI-ResourceKey": self.key, "Content-Type": "application/json"}
        cands = []
        try:
            t = requests.get(VISOR, headers=UA, timeout=60).text
            cands = [c.lower() for c in re.findall(r"https://([A-Za-z0-9-]+)-redirect\.analysis\.windows\.net", t)]
            cands = [c.replace("wabi-", "") for c in cands]
        except requests.RequestException:
            pass
        self.api = self.model = None
        for c in dict.fromkeys(cands + CLUSTERS):
            api = f"https://wabi-{c}-api.analysis.windows.net"
            try:
                r = requests.get(f"{api}/public/reports/{self.key}/modelsAndExploration?preferReadOnlySession=true",
                                 headers=self.h, timeout=120)
            except requests.RequestException:
                continue
            if r.ok:
                self.api, self.model = api, r.json()["models"][0]["id"]
                break
        if not self.api:
            raise RuntimeError("no s'ha trobat el clúster del visor Power BI")

    def consulta(self, entitat: str, grups: list[str], mesures: list) -> tuple[list[str], list[list]]:
        """grups: columnes; mesures: ("sum"|"count", columna) o ("m", mesura del model)."""
        src = {"SourceRef": {"Source": "t"}}
        sel, noms = [], []
        for g in grups:
            sel.append({"Column": {"Expression": src, "Property": g}, "Name": f"g:{g}"})
            noms.append(g)
        for tipus, p in mesures:
            if tipus == "m":
                sel.append({"Measure": {"Expression": src, "Property": p}, "Name": f"m:{p}"})
            else:
                f = SUM if tipus == "sum" else COUNT
                sel.append({"Aggregation": {"Expression": {"Column": {"Expression": src, "Property": p}}, "Function": f},
                            "Name": f"{tipus}:{p}"})
            noms.append(f"{tipus}:{p}")
        q = {"Version": 2, "From": [{"Name": "t", "Entity": entitat, "Type": 0}], "Select": sel}
        files, token = [], None
        while True:
            finestra = {"Count": 30000}
            if token:
                finestra["RestartTokens"] = token
            binding = {"Primary": {"Groupings": [{"Projections": list(range(len(sel)))}]},
                       "DataReduction": {"DataVolume": 6, "Primary": {"Window": finestra}}, "Version": 1}
            cos = {"version": "1.0.0", "queries": [{"Query": {"Commands": [{"SemanticQueryDataShapeCommand": {
                "Query": q, "Binding": binding}}]}, "QueryId": ""}], "cancelQueries": [], "modelId": self.model}
            for intent in range(4):
                r = requests.post(f"{self.api}/public/reports/querydata?synchronous=true", headers=self.h, json=cos, timeout=300)
                if r.ok:
                    break
                time.sleep(5 * (intent + 1))
            r.raise_for_status()
            res = r.json()["results"][0]["result"]
            if "dsr" not in res.get("data", {}) or "DS" not in res["data"]["dsr"]:
                raise RuntimeError(json.dumps(res)[:400])
            data = res["data"]
            ds = data["dsr"]["DS"][0]
            files += _descodifica(ds, data["descriptor"]["Select"], [s["Name"] for s in sel])
            token = ds.get("RT")
            if not token:
                break
        return noms, files


def _descodifica(ds: dict, descriptor: list, ordre: list[str]) -> list[list]:
    dicts = ds.get("ValueDicts", {})
    # descriptor: Name -> Value (G0, M0...)
    nom_val = {d["Name"]: d["Value"] for d in descriptor}
    files = []
    if not ds.get("PH"):
        return files
    filas = next(iter(ds["PH"][0].values()), [])
    esquema, ant = None, None
    for f in filas:
        if "S" in f:
            esquema = f["S"]
            ant = [None] * len(esquema)
        cs = list(f.get("C", []))
        rep, nul = f.get("R", 0), f.get("Ø", 0)
        fila = []
        for i, col in enumerate(esquema):
            if rep >> i & 1:
                v = ant[i]
            elif nul >> i & 1:
                v = None
            else:
                v = cs.pop(0)
                if "DN" in col and isinstance(v, int):
                    v = dicts[col["DN"]][v]
            fila.append(v)
        ant = fila
        pos = {c["N"]: i for i, c in enumerate(esquema)}
        sortida = []
        for n in ordre:
            i = pos.get(nom_val.get(n))
            v = fila[i] if i is not None else None
            if isinstance(v, str) and re.fullmatch(r"-?\d+(\.\d+)?([eE]-?\d+)?", v) and esquema[i].get("T") in (3, 4):
                v = float(v)
            sortida.append(v)
        files.append(sortida)
    return files


ORIG, ORIG_NOM, ORIG_COM = "ORIGEN ENCUESTADO", "ORIGEN ENCUESTADO_NOM", "ORIGEN ENCUESTADO_COM_NOM"
KPI_LV = ["Despl_pp", "Durada media", "Pct Intram", "Pct Intracomarcals", "Ratio Privado/Publico", "Ratio Ocupacional_Personal"]
KPI_SD = ["Despl_pp_cap", "Durada media (cap)", "Ratio Privado/Publico (cap)"]
PERS_TXT = ["P7_1 (text)", "P7_4 (text)", "P7_6 (text)", "P7_13A_Text", "P7_10_nom", "P7_11_nom", "P1_5_2_CAT",
            "P6_1B_text", "P6_1C_text", "P5_5_1 (text)", "P5_5_2 (text)", "P5_5_3 (text)", "P5_5_4 (text)", "Edat_text", "SEXE_text",
            "P7_5_1_bin", "P7_2_1_bin", "P7_8A_DADES"]
PERS_NUM = ["P7_2_1", "P7_2_2", "P7_2_3", "P7_2_4", "P7_2_5", "P7_3_1 (nº coche benzina)", "P7_3_2 (nºcoche diesel)",
            "P7_3_4 (nºcoche hibrido)", "P7_3_5 (nº coche electrico)", "P7_5_1", "P7_5_2", "P7_5_3", "P7_5_4", "P7_5_5", "P7_7_1", "P7_6"]

CONSULTES = {
    # dia feiner: per municipi de residència de l'enquestat
    "lv_mun_mode": (LV, [ORIG, ORIG_NOM, ORIG_COM, "ModoCAT"], [("sum", "FACTORLV"), ("count", "REGISTRE")]),
    "lv_mun_motiu": (LV, [ORIG, "MotivoCAT"], [("sum", "FACTORLV"), ("count", "REGISTRE")]),
    "lv_mun_mitja": (LV, [ORIG, "MED(TEX)"], [("sum", "FACTORLV")]),
    "lv_mun_intra": (LV, [ORIG, "INTRAMUN_TXT"], [("sum", "FACTORLV")]),
    "lv_mun_tipus": (LV, [ORIG, "Tipologia_final_2.0"], [("sum", "FACTORLV")]),
    "lv_mun_hora": (LV, [ORIG, "DPLV_HOR_TXTO"], [("sum", "FACTORLV")]),
    "lv_mun_kpi": (LV, [ORIG], [("m", "Despl_pp_mun"), ("m", "Durada media mun"), ("m", "Indice Autocontencion")] + [("m", k) for k in KPI_LV]),
    "lv_com_kpi": (LV, [ORIG_COM], [("m", k) for k in KPI_LV] + [("m", "Indice Autocontencion_ COM"), ("sum", "FACTORLV"), ("count", "REGISTRE")]),
    "lv_tot_kpi": (LV, [], [("m", k) for k in KPI_LV] + [("sum", "FACTORLV"), ("count", "REGISTRE")]),
    "lv_com_mode": (LV, [ORIG_COM, "ModoCAT"], [("sum", "FACTORLV")]),
    "lv_com_motiu": (LV, [ORIG_COM, "MotivoCAT"], [("sum", "FACTORLV")]),
    "lv_mode_motiu": (LV, ["ModoCAT", "MotivoCAT"], [("sum", "FACTORLV")]),
    "lv_mitja_mode": (LV, ["MED(TEX)", "ModoCAT"], [("sum", "FACTORLV")]),
    "lv_hora_mode": (LV, ["DPLV_HOR_TXTO", "ModoCAT"], [("sum", "FACTORLV")]),
    "lv_mun_dur": (LV, [ORIG, "DPLV_DUR"], [("sum", "FACTORLV")]),
    # origen-destinació (desplaçaments, no residència)
    "lv_od_mun": (LV, ["INI_DPLV_MUN", "INI_DPLV_MUN_NOM", "DPLV_MUN", "DPLV_MUN_NOM"], [("sum", "FACTORLV"), ("count", "REGISTRE")]),
    "lv_od_mun_mode": (LV, ["INI_DPLV_MUN", "DPLV_MUN", "ModoCAT"], [("sum", "FACTORLV")]),
    "lv_od_com": (LV, ["INI_DPLV_COM_NOM", "DPLV_COM_NOM"], [("sum", "FACTORLV")]),
    "lv_od_territori": (LV, ["Cat_Territori_INI", "Cat_Territori_DPLV"], [("sum", "FACTORLV")]),
    # cap de setmana
    "sd_mun_mode": (SD, [ORIG, "ModoCAT (cap)"], [("sum", "FACTORSD"), ("count", "REGISTRE")]),
    "sd_mun_motiu": (SD, [ORIG, "MotivoCAT (cap)"], [("sum", "FACTORSD")]),
    "sd_mun_kpi": (SD, [ORIG], [("m", "Despl_pp_cap_mun"), ("m", "Durada media (cap) mun"), ("m", "Indice Autocontencion CAP")]),
    "sd_com_kpi": (SD, ["ORIGEN ENCUESTADO_COOM_NOM"], [("m", k) for k in KPI_SD] + [("sum", "FACTORSD")]),
    "sd_tot_kpi": (SD, [], [("m", k) for k in KPI_SD] + [("sum", "FACTORSD"), ("count", "REGISTRE")]),
    # persones
    "pe_mun": (PE, ["CMUN_BD", "MUNICIPI", "COMARCA_NOM"], [("sum", "FACTOREXP"), ("count", "REGISTRE"), ("m", "Pct HaViajadoLV"),
                                                           ("m", "Promedio NDesplazamientosLV"), ("m", "Pct HaViajadoSD")]),
    "pe_tot": (PE, [], [("sum", "FACTOREXP"), ("count", "REGISTRE"), ("m", "Pct HaViajadoLV"), ("m", "Promedio NDesplazamientosLV")]),
}
for c in PERS_TXT + PERS_NUM:
    CONSULTES["pe_mun__" + re.sub(r"\W+", "_", c).strip("_")] = (PE, ["CMUN_BD", c], [("sum", "FACTOREXP"), ("count", "REGISTRE")])


def ejecutar() -> str:
    out = carpeta("emq")
    v = Visor()
    res, errors = [], []
    for nom, (ent, grups, mes) in CONSULTES.items():
        try:
            cols, files = v.consulta(ent, grups, mes)
            (out / f"{nom}.json").write_text(json.dumps({"cols": cols, "rows": files}, ensure_ascii=False), encoding="utf-8")
            res.append(f"{nom}:{len(files)}")
        except Exception as e:  # noqa: BLE001
            errors.append(f"{nom} {type(e).__name__}: {str(e)[:120]}")
        time.sleep(0.5)
    txt = f"EMQ 2024-2025: {len(res)} consultes ({', '.join(res[:6])}…)"
    if errors:
        txt += f"; ERROR en {len(errors)}: " + " | ".join(errors[:5])
    return txt
