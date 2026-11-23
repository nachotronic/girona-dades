"""Muertos en incendios en la provincia (gráficos de «La província», tema Emergencias).

Fuente: informes anuales «Víctimas de incendios en España» de Fundación Mapfre y la
Asociación Profesional de Técnicos de Bomberos (APTB), tablas de víctimas mortales por
provincia. Los PDF no se pueden descargar desde la Action (el servidor bloquea el acceso
automático), así que las cifras se copian a mano en
data/processed/emergencies/victimes_incendis.csv cuando sale cada edición (octubre-noviembre):

    any,zona,morts,morts_habitatge,font

zona: GIRONA, BARCELONA, LLEIDA, TARRAGONA, ESPANA. morts_habitatge solo para Girona y España
(las ediciones de 2010 y 2011 no lo dan por provincia). No hay edición con provincias de 2016,
y la de 2012 cubre 2012 y 2013.
"""
from __future__ import annotations

import pathlib

import pandas as pd

RAIZ = pathlib.Path(__file__).resolve().parent.parent
F = RAIZ / "data" / "processed" / "emergencies" / "victimes_incendis.csv"
CAT = ["BARCELONA", "GIRONA", "LLEIDA", "TARRAGONA"]


def construir() -> dict:
    if not F.exists():
        return {"prov": {}, "resum": "sin datos"}
    import justicia_web
    pob = justicia_web._poblacio_prov()
    d = pd.read_csv(F)
    taula = {(int(r.any), r.zona): r for r in d.itertuples()}
    anys = sorted({int(a) for a in d["any"]})

    def p(y, k):
        if y in pob:
            return pob[y].get(k)
        return pob[min(pob, key=lambda a: abs(a - y))].get(k) if pob else None

    taxa = {"gi": [], "cat": [], "esp": []}
    for y in anys:
        if all((y, z) in taula for z in CAT + ["ESPANA"]):
            gi = taula[(y, "GIRONA")].morts
            cat = sum(taula[(y, z)].morts for z in CAT)
            esp = taula[(y, "ESPANA")].morts
            for k, n, pk in (("gi", gi, "gi"), ("cat", cat, "cat"), ("esp", esp, "esp")):
                pp = p(y, pk)
                if pp:
                    taxa[k].append([y, str(y), round(n / pp * 1e6, 1)])
    gi = [[y, str(y), int(taula[(y, "GIRONA")].morts)] for y in anys if (y, "GIRONA") in taula]
    viv = [[y, str(y), int(taula[(y, "GIRONA")].morts_habitatge)] for y in anys
           if (y, "GIRONA") in taula and pd.notna(taula[(y, "GIRONA")].morts_habitatge)]
    u = anys[-1]
    cat_u = sum(taula[(u, z)].morts for z in CAT) if all((u, z) in taula for z in CAT) else None
    abs_ = {"any": u, "n": gi[-1][2], "viv": viv[-1][2] if viv and viv[-1][0] == u else None,
            "cat": cat_u, "esp": int(taula[(u, "ESPANA")].morts) if (u, "ESPANA") in taula else None,
            "total": sum(x[2] for x in gi), "a0": anys[0]}
    prov = {
        "inc_morts": {"tipus": "linia", "u": "", "dec": 1, "series": taxa, "abs": abs_},
        "inc_morts_n": {"tipus": "linia", "u": "", "dec": 0, "noms": "incm", "series": {"gi": gi, "cat": viv}},
    }
    return {"prov": prov, "resum": f"{len(anys)} años {anys[0]}-{u}; Girona {u}: {gi[-1][2]} muertos"}


if __name__ == "__main__":
    import json
    r = construir()
    print(r["resum"])
    print(json.dumps(r["prov"], ensure_ascii=False)[:1500])
