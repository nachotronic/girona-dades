"""Las pymes de Girona en «La província»: rentabilidad, productividad, deuda y ventas.

Fuente: Pimec, Anuari de la Pime Catalana (Observatori de la Pime), capítulo «Anàlisi
econòmica i financera de la pime per demarcacions», tablas X1-X4 de cada demarcación
(Barcelona, Girona, Lleida, Tarragona), calculadas por PimesDat con los balances de SABI.
Cada edición da los datos de dos años antes (edición 2026 = ejercicio 2024).

El servidor de Pimec no deja descargar los PDF desde la Action, así que las cifras se copian
a mano en data/processed/pimec/anuari_pime.csv cuando sale cada edición (junio):

    any,edicio,demarcacio,sector,taula,indicador,valor

sector «Total» = todas las pymes de la demarcación; el detalle por actividad solo se guarda
para Girona y el último año. Ediciones usadas: 2015, 2017, 2018, 2020-2026 (no hay PDF
publicado de 2016 ni de 2019, así que faltan los ejercicios 2014 y 2017).
"""
from __future__ import annotations

import pathlib

import pandas as pd

RAIZ = pathlib.Path(__file__).resolve().parent.parent
F = RAIZ / "data" / "processed" / "pimec" / "anuari_pime.csv"
DEM = {"GIRONA": "gi", "BARCELONA": "bcn", "LLEIDA": "lle", "TARRAGONA": "tar"}
GRANS = {"Primari", "Indústria", "Construcció", "Serveis"}
# Nombre corto de cada actividad (clave para las traducciones en web/pimec.js)
SECT = {
    "Energia, gas, aigua i reciclatge": "energia", "Ind. extractives no energètiques": "extractives",
    "Indústries químiques": "quimica", "Metal·lúrgia, maq. i material elèctric": "metall",
    "Material de transport": "mat_transport", "Indústria alimentària": "alimentaria",
    "Indústria tèxtil, cuir i confecció": "textil", "Indústria del paper i arts gràfiques": "paper",
    "Cautxú, fusta i altres indústries": "fusta", "Construcció": "construccio",
    "Comerç i reparacions": "comerc", "Hoteleria i restauració": "hoteleria",
    "Transport i comunicacions": "transport", "Serv. financers, asseg. i lloguers": "financers",
    "Altres serveis a les empreses": "serv_empreses", "Altres serveis a les persones": "serv_persones",
    "Primari": "primari",
}


def construir() -> dict:
    if not F.exists():
        return {"prov": {}, "resum": "sin datos"}
    d = pd.read_csv(F)
    tot = d[d["sector"] == "Total"]
    u = int(d["any"].max())

    def serie(ind, dec=1):
        out = {}
        for dem, k in DEM.items():
            s = tot[(tot["demarcacio"] == dem) & (tot["indicador"] == ind)].sort_values("any")
            out[k] = [[int(r.any), str(int(r.any)), round(float(r.valor), dec) if dec else int(round(float(r.valor)))] for r in s.itertuples()]
        return out

    def val(dem, ind, any_=u):
        x = tot[(tot["demarcacio"] == dem) & (tot["indicador"] == ind) & (tot["any"] == any_)]["valor"]
        return float(x.iloc[0]) if len(x) else None

    def rang(ind, menor=False):
        """Posición de Girona entre las cuatro demarcaciones el último año (1 = la más alta)."""
        vs = sorted(((val(dem, ind), dem) for dem in DEM), key=lambda t: t[0] if not menor else -t[0], reverse=True)
        return [dem for _, dem in vs].index("GIRONA") + 1

    prov = {}
    abs_ = {"any": u, "ed": u + 2}
    prov["pime_rf"] = {"tipus": "linia", "u": "%", "dec": 1, "noms": "pime", "series": serie("rend_financera"),
                       "abs": {**abs_, "rang": rang("rend_financera"), "d": val("GIRONA", "d_rend_financera"),
                               "re": val("GIRONA", "rend_economica"), "marge": val("GIRONA", "marge")}}
    prov["pime_vab"] = {"tipus": "linia", "u": "€", "dec": 0, "noms": "pime", "series": serie("vab_treballador", 0),
                        "abs": {**abs_, "rang": rang("vab_treballador"), "var": val("GIRONA", "var_vab_treballador"),
                                "sou": val("GIRONA", "despesa_personal_treballador"), "clu": val("GIRONA", "personal_sobre_vab")}}
    prov["pime_deute"] = {"tipus": "linia", "u": "%", "dec": 1, "zero": False, "noms": "pime", "series": serie("passiu_exigible"),
                          "abs": {**abs_, "rang": rang("passiu_exigible", menor=True), "pn": val("GIRONA", "patrimoni_net"),
                                  "curt": val("GIRONA", "passiu_corrent"), "llarg": val("GIRONA", "passiu_no_corrent")}}
    prov["pime_vendes"] = {"tipus": "linia", "u": "€", "dec": 0, "noms": "pime", "series": serie("ingressos_empresa", 0),
                           "abs": {**abs_, "var": val("GIRONA", "var_ingressos"), "vab": val("GIRONA", "vab_pct")}}

    sec = d[(d["demarcacio"] == "GIRONA") & (d["any"] == u) & (d["sector"] != "Total")]
    act = sec[~sec["sector"].isin(GRANS - {"Primari", "Construcció"})]  # 17 actividades (primari y construcció no se desglosan)

    def grups(ind, ind2=None, dec=1):
        p = act.pivot_table(index="sector", columns="indicador", values="valor")
        gs = []
        for s, r in p.iterrows():
            g = {"g": s, "c": "pime:" + SECT.get(s, s), "gi": round(float(r[ind]), dec) if dec else int(round(float(r[ind])))}
            if ind2:
                g["cat"] = round(float(r[ind2]), dec) if dec else int(round(float(r[ind2])))
            gs.append(g)
        return sorted(gs, key=lambda g: -g["gi"])

    prov["pime_sect_rf"] = {"tipus": "barres", "u": "%", "dec": 1, "claus": ["gi"], "noms": "pime_s1", "any": u,
                            "grups": grups("rend_financera"), "abs": {"tot": val("GIRONA", "rend_financera")}}
    prov["pime_sect_vab"] = {"tipus": "barres", "u": "€", "dec": 0, "claus": ["gi", "cat"], "noms": "pime_s2", "any": u,
                             "grups": grups("vab_treballador", "despesa_personal_treballador", 0)}
    anys = sorted(int(a) for a in tot["any"].unique())
    return {"prov": prov, "resum": f"{len(anys)} ejercicios {anys[0]}-{u}; Girona {u}: rentabilidad {val('GIRONA', 'rend_financera')} %"}


if __name__ == "__main__":
    import json
    r = construir()
    print(r["resum"])
    print(json.dumps(r["prov"], ensure_ascii=False)[:2500])
