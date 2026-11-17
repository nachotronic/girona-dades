"""Mobilitat per a la web: Enquesta de Mobilitat Quotidiana 2024-2025 (ATM Girona).

construir(municipios, sortida) devuelve un dict con:
  mun    {ine: {clau: valor}}           indicadores por municipio de residencia (tema «mob» del mapa)
  n      {ine: enquestats}               personas entrevistadas en cada municipio
  fitxa  {ine: {...}}                    modos, destinos y orígenes para la ficha
  com    {comarca: {clau: valor}}        los mismos indicadores por comarca (nivel «com» del mapa)
  ref    {clau: valor}                   ámbito de la encuesta (las 7 comarcas)
  seccio gráficos de la sección Mobilitat
y escribe web/datos/com.geojson (comarcas, disolviendo los municipios).

Los porcentajes de modo, motivo y tipo de desplazamiento son sobre los desplazamientos en día
laborable de las personas residentes; los de vehículos y teletrabajo, sobre las personas.
"""
from __future__ import annotations

import json
import math
import pathlib
from collections import defaultdict

RAIZ = pathlib.Path(__file__).resolve().parent.parent
E = RAIZ / "data" / "processed" / "emq"
MIN_N = 30  # personas entrevistadas para dar el dato de un municipio
EDICIO = "2024-2025"

BUS = ("Autobús",)
TREN = ("Renfe", "Ferrocarrils", "Metro", "Tramvia")


def _r(x, n=1):
    if x is None or (isinstance(x, float) and (math.isnan(x) or math.isinf(x))):
        return None
    return round(float(x), n)


def _q(nom):
    f = E / f"{nom}.json"
    if not f.exists():
        return []
    return json.loads(f.read_text(encoding="utf-8"))["rows"]


def _ine(x):
    s = str(x).strip()
    return s.zfill(5) if s.isdigit() and s.zfill(5).startswith("17") else None


def _mitja(nom):
    """Agrupa los medios detallados del visor en las categorías de la web."""
    if not nom:
        return None
    if nom.startswith("Cotxe"):
        return "cotxe"
    if nom == "Caminant":
        return "peu"
    if nom in ("Bicicleta", "Patinet"):
        return "bici"
    if nom.startswith("Moto"):
        return "moto"
    if nom.startswith(BUS):
        return "bus"
    if nom.startswith(TREN):
        return "tren"
    return "altres"


MODE = {"Transport privat": "priv", "Transport públic": "pub", "Modes actius": "act"}
MOTIU = {"Ocupacional": "ocup", "Personal ineludible": "inel", "Personal opcional": "opc"}


def _sumes():
    """Sumas ponderadas por municipio de residencia: s[ine][clau] = desplazamientos o personas."""
    s = defaultdict(lambda: defaultdict(float))
    meta = {}
    for ine, nom, com, n, fac, viat, *_ in [(r[0], r[1], r[2], r[4], r[3], r[5]) for r in _q("pe_mun")]:
        i = _ine(ine)
        if not i or not fac:
            continue
        meta[i] = {"nom": nom, "com": com, "n": n}
        s[i]["pers"] += fac
        if viat is not None:
            s[i]["mou_w"] += viat * fac
    for ine, _, _, mode, fac, _ in _q("lv_mun_mode"):
        i = _ine(ine)
        if i and fac:
            s[i]["d"] += fac
            if mode in MODE:
                s[i]["m_" + MODE[mode]] += fac
                s[i]["m_tot"] += fac
    for ine, med, fac in _q("lv_mun_mitja"):
        i, k = _ine(ine), _mitja(med)
        if i and k and fac:
            s[i]["x_" + k] += fac
            s[i]["x_tot"] += fac
    for ine, mot, fac, _ in _q("lv_mun_motiu"):
        i = _ine(ine)
        if i and fac and mot in MOTIU:
            s[i]["mo_" + MOTIU[mot]] += fac
            s[i]["mo_tot"] += fac
    for ine, t, fac in _q("lv_mun_intra"):
        i = _ine(ine)
        if i and fac and t in ("Intra", "Inter"):
            s[i]["in_" + t] += fac
    for ine, t, fac in _q("lv_mun_tipus"):
        i = _ine(ine)
        if i and fac and t:
            s[i]["tp_tot"] += fac
            if t != "intracomarcal":
                s[i]["tp_fora"] += fac
    for ine, dur, fac in _q("lv_mun_dur"):
        i = _ine(ine)
        if i and fac and dur is not None and 0 < dur <= 300:
            s[i]["dur_w"] += dur * fac
            s[i]["dur_n"] += fac
    for ine, mode, fac, _ in _q("sd_mun_mode"):
        i = _ine(ine)
        if i and fac:
            s[i]["cs_d"] += fac
            if mode in MODE:
                s[i]["cs_" + MODE[mode]] += fac
                s[i]["cs_tot"] += fac
    for ine, v, fac, _ in _q("pe_mun__P7_1_text"):
        i = _ine(ine)
        if i and fac and v:
            s[i]["veh_tot"] += fac
            if v == "No":
                s[i]["veh_no"] += fac
    for ine, v, fac, _ in _q("pe_mun__P7_4_text"):
        i = _ine(ine)
        if i and fac and v:
            s[i]["pl_tot"] += fac
            if v.startswith("No"):
                s[i]["pl_no"] += fac
    for ine, v, fac, _ in _q("pe_mun__P7_6_text"):
        i = _ine(ine)
        if i and fac and v:
            s[i]["tt_tot"] += fac
            if v.startswith("Sí"):
                s[i]["tt_si"] += fac
    return s, meta


def _indicadors(x, pob=None, rebuts=None):
    """Indicadores a partir de las sumas de un municipio, comarca o del ámbito."""
    p = lambda a, b: _r(x[a] / x[b] * 100, 1) if x.get(b) else None
    v = {
        "dpp": _r(x["d"] / x["pers"], 2) if x.get("pers") else None,
        "mou": _r(x["mou_w"] / x["pers"] * 100, 1) if x.get("pers") and x.get("mou_w") else None,
        "priv": p("m_priv", "m_tot"), "pub": p("m_pub", "m_tot"), "act": p("m_act", "m_tot"),
        "cotxe": p("x_cotxe", "x_tot"), "peu": p("x_peu", "x_tot"), "bici": p("x_bici", "x_tot"),
        "bus": p("x_bus", "x_tot"), "tren": p("x_tren", "x_tot"),
        "ocup": p("mo_ocup", "mo_tot"), "inel": p("mo_inel", "mo_tot"), "opc": p("mo_opc", "mo_tot"),
        "intra": _r(x["in_Intra"] / (x["in_Intra"] + x["in_Inter"]) * 100, 1) if x.get("in_Intra", 0) + x.get("in_Inter", 0) else None,
        "fora": p("tp_fora", "tp_tot"),
        "dur": _r(x["dur_w"] / x["dur_n"], 1) if x.get("dur_n") else None,
        "cs_dpp": _r(x["cs_d"] / x["pers"], 2) if x.get("pers") and x.get("cs_d") else None,
        "cs_priv": p("cs_priv", "cs_tot"),
        "sense_veh": p("veh_no", "veh_tot"), "sense_pl": p("pl_no", "pl_tot"), "telet": p("tt_si", "tt_tot"),
    }
    if pob and rebuts is not None:
        v["atrau"] = _r(rebuts / pob, 2)
    return {k: w for k, w in v.items() if w is not None}


def _od():
    """Desplazamientos laborables entre municipios: od[(orig, dest)] = desplazamientos."""
    od = defaultdict(float)
    noms = {}
    for o, on, d, dn, fac, _ in _q("lv_od_mun"):
        io, idd = _ine(o), _ine(d)
        if fac and (io or idd):
            od[(io or "fora", idd or "fora")] += fac
            if io and on:
                noms[io] = on
            if idd and dn:
                noms[idd] = dn
    return od, noms


def _comarques_geo(municipios, sortida, dades_com):
    try:
        import geopandas as gpd
    except ImportError:
        print("AVISO mobilitat: sin geopandas, no hay com.geojson")
        return
    g = gpd.read_file(RAIZ / "data" / "processed" / "geo" / "municipis.geojson")
    com = {m["ine"]: m.get("comarca") for m in municipios}
    g["comarca"] = g["ine"].map(com)
    g = g[g["comarca"].notna()]
    d = g.dissolve(by="comarca", as_index=False)
    d["geometry"] = d.geometry.simplify(0.0008, preserve_topology=True)
    munis = defaultdict(list)
    for m in municipios:
        if m.get("comarca"):
            munis[m["comarca"]].append(m["nom"])
    feats = []
    for _, f in d.iterrows():
        c = f["comarca"]
        ms = sorted(munis[c])
        feats.append({"type": "Feature", "geometry": json.loads(gpd.GeoSeries([f.geometry]).to_json())["features"][0]["geometry"],
                      "properties": {"id": c, "nom": c, "munis": f"{len(ms)} municipis" + ("" if c in dades_com else " · fora de l'enquesta de l'ATM de Girona")}})
    (sortida / "com.geojson").write_text(json.dumps({"type": "FeatureCollection", "features": feats}, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")


def construir(municipios, sortida: pathlib.Path) -> dict:
    res = {"mun": {}, "n": {}, "fitxa": {}, "com": {}, "ref": {}, "seccio": {}, "any": None}
    if not (E / "pe_mun.json").exists():
        return res
    s, meta = _sumes()
    pob = {m["ine"]: m.get("poblacion") for m in municipios}
    od, noms_od = _od()
    rebuts = defaultdict(float)
    for (o, d), v in od.items():
        if d != "fora" and o != d:
            rebuts[d] += v
    # Municipios
    for i, x in s.items():
        res["n"][i] = int(meta[i]["n"])
        if meta[i]["n"] >= MIN_N:
            res["mun"][i] = _indicadors(x, pob.get(i), rebuts.get(i, 0.0))
        elif pob.get(i) and rebuts.get(i):
            # la atracción no depende de la muestra del municipio (son viajes de toda la encuesta)
            res["mun"][i] = {"atrau": _r(rebuts[i] / pob[i], 2)}
    # Comarcas y ámbito
    agr = defaultdict(lambda: defaultdict(float))
    for i, x in s.items():
        for k, v in x.items():
            agr[meta[i]["com"]][k] += v
            agr["_tot"][k] += v
    pob_com = defaultdict(float)
    com_de = {i: meta[i]["com"] for i in meta}
    for m in municipios:
        c = com_de.get(m["ine"])
        if c and m.get("poblacion"):
            pob_com[c] += m["poblacion"]
    for c, x in agr.items():
        if c == "_tot":
            continue
        res["com"][c] = {**_indicadors(x), "n": int(sum(meta[i]["n"] for i in meta if meta[i]["com"] == c))}
    tot_pob = sum(pob_com.values())
    reb_tot = sum(v for (o, d), v in od.items() if d != "fora" and o != d and d in com_de)
    res["ref"] = _indicadors(agr["_tot"], tot_pob, reb_tot)
    res["ref"]["n"] = int(sum(m["n"] for m in meta.values()))
    # Ficha: modos detallados, destinos y orígenes principales
    for i, x in s.items():
        f = {"n": int(meta[i]["n"]), "com": meta[i]["com"]}
        if meta[i]["n"] >= MIN_N and x.get("x_tot"):
            f["modes"] = {k[2:]: _r(v / x["x_tot"] * 100, 1) for k, v in x.items() if k.startswith("x_") and k != "x_tot"}
        sortides = sorted(((d, v) for (o, d), v in od.items() if o == i and d != i), key=lambda t: -t[1])
        fora_s = sum(v for d, v in sortides if d == "fora")
        tot_s = sum(v for _, v in sortides)
        entrades = sorted(((o, v) for (o, d), v in od.items() if d == i and o != i), key=lambda t: -t[1])
        tot_e = sum(v for _, v in entrades)
        intern = od.get((i, i), 0.0)
        if tot_s and meta[i]["n"] >= MIN_N:
            f["dest"] = [[d, noms_od.get(d, d), _r(v, -1), _r(v / tot_s * 100, 1)] for d, v in sortides if d != "fora"][:6]
            f["fora"] = _r(fora_s / tot_s * 100, 1)
            f["sortides"] = _r(tot_s, -1)
        if tot_e:
            f["orig"] = [[o, noms_od.get(o, o), _r(v, -1), _r(v / tot_e * 100, 1)] for o, v in entrades if o != "fora"][:6]
            f["entrades"] = _r(tot_e, -1)
        f["intern"] = _r(intern, -1)
        res["fitxa"][i] = f
    res["seccio"] = _seccio(agr, od, com_de)
    res["any"] = EDICIO
    _comarques_geo(municipios, sortida, res["com"])
    return res


def _seccio(agr, od, com_de):
    """Gráficos de la sección Mobilitat (ámbito de la encuesta)."""
    t = agr["_tot"]
    sec = {}
    # Medios detallados
    det = defaultdict(float)
    for med, _, fac in _q("lv_mitja_mode"):
        if med and fac:
            det[med] += fac
    tot = sum(det.values())
    sec["mitjans"] = [[k, _r(v / tot * 100, 1), _r(v, -2)] for k, v in sorted(det.items(), key=lambda x: -x[1]) if v / tot >= 0.002]
    # Modo por motivo
    mm = defaultdict(lambda: defaultdict(float))
    for mode, mot, fac in _q("lv_mode_motiu"):
        if mode in MODE and mot and fac:
            mm[mot][MODE[mode]] += fac
    sec["motius"] = {mot: {k: _r(v / sum(x.values()) * 100, 1) for k, v in x.items()} | {"d": _r(sum(x.values()), -2)} for mot, x in mm.items()}
    # Hora de salida por modo (desplazamientos por hora)
    hm = defaultdict(lambda: defaultdict(float))
    for h, mode, fac in _q("lv_hora_mode"):
        if h is not None and mode in MODE and fac:
            hm[int(h)][MODE[mode]] += fac
    sec["hores"] = [[h, *[_r(hm[h].get(k, 0), -1) for k in ("priv", "pub", "act")]] for h in range(24)]
    # Comarcas: modos y día laborable / fin de semana
    sec["comarques"] = {}
    for c, x in agr.items():
        if c == "_tot" or not x.get("m_tot"):
            continue
        sec["comarques"][c] = _indicadors(x)
    sec["total"] = _indicadors(t)
    sec["d_total"] = _r(t["d"], -3)
    sec["pers"] = _r(t["pers"], -2)
    sec["d_cs"] = _r(t.get("cs_d"), -3)
    # Matriz entre comarcas (desplazamientos laborables, origen -> destino)
    mat = defaultdict(float)
    for o, d, fac in _q("lv_od_com"):
        if fac:
            mat[(o or "?", d or "?")] += fac
    coms = sorted(c for c in sec["comarques"])
    sec["matriu"] = {"coms": coms, "v": [[_r(mat.get((o, d), 0), -1) for d in coms] for o in coms],
                     "fora": [_r(sum(v for (oo, d), v in mat.items() if oo == o and d not in coms and d != "?"), -1) for o in coms]}
    # Polos de atracción: municipios que más desplazamientos reciben de otros municipios
    reb = defaultdict(float)
    for (o, d), v in od.items():
        if d in com_de and o != d:
            reb[d] += v
    sec["pols"] = [[d, _r(v, -2)] for d, v in sorted(reb.items(), key=lambda x: -x[1])[:12]]
    return sec
