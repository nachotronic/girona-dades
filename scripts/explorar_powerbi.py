"""Explora un informe Power BI publicado en la web (visor público de la EMQ de l'ATM Girona).

Guarda en exploracion/powerbi/: el modelo, el esquema conceptual y el resultado de la
consulta de cada visual del informe.
"""
import base64
import json
import pathlib

import requests

R = "eyJrIjoiZDVmNjE4OGUtNTJjOS00MTcyLThlODUtM2YxZTI4NGY2Zjk0IiwidCI6IjNiOTQyN2RjLWQzMGUtNDNiYy04YzA2LWZmNzI1MzY3NmZlYyIsImMiOjh9"
SAL = pathlib.Path("exploracion/powerbi")
UA = {"User-Agent": "Mozilla/5.0"}


def main() -> None:
    SAL.mkdir(parents=True, exist_ok=True)
    cfg = json.loads(base64.b64decode(R + "=" * (-len(R) % 4)))
    key, tenant = cfg["k"], cfg["t"]
    log = [json.dumps(cfg)]
    ruta = requests.get(f"https://api.powerbi.com/public/routing/cluster/{tenant}", headers=UA, timeout=60)
    log.append(f"routing {ruta.status_code} {ruta.text[:300]}")
    uri = ruta.json()["FixedClusterUri"].rstrip("/")
    api = uri.replace("-redirect", "").replace("://", "://").replace(".analysis", "-api.analysis")
    log.append("api " + api)
    h = {**UA, "X-PowerBI-ResourceKey": key, "Content-Type": "application/json"}
    me = requests.get(f"{api}/public/reports/{key}/modelsAndExploration?preferReadOnlySession=true", headers=h, timeout=120)
    log.append(f"models {me.status_code} {len(me.content)}")
    (SAL / "models.json").write_bytes(me.content)
    d = me.json()
    model = d["models"][0]
    mid = model["id"]
    cs = requests.post(f"{api}/public/reports/conceptualschema", headers=h,
                       json={"modelIds": [mid], "userPreferredLocale": "ca-ES"}, timeout=120)
    log.append(f"schema {cs.status_code} {len(cs.content)}")
    (SAL / "schema.json").write_bytes(cs.content)
    secciones = d["exploration"]["sections"]
    n = 0
    resumen = []
    for s in secciones:
        resumen.append(f"## {s.get('displayName')}")
        for v in s.get("visualContainers", []):
            try:
                c = json.loads(v["config"])
                sv = c.get("singleVisual", {})
                q = sv.get("prototypeQuery")
                titulo = sv.get("visualType")
                resumen.append(f"- {titulo} {json.dumps([x.get('Name') for x in (q or {}).get('Select', [])], ensure_ascii=False)}")
                if not q:
                    continue
                n += 1
                cuerpo = {"version": "1.0.0", "queries": [{"Query": {"Commands": [{"SemanticQueryDataShapeCommand": {
                    "Query": q, "Binding": {"Primary": {"Groupings": [{"Projections": list(range(len(q["Select"])))}]},
                                             "DataReduction": {"DataVolume": 4, "Primary": {"Window": {"Count": 30000}}},
                                             "Version": 1}}}]}, "QueryId": ""}],
                    "cancelQueries": [], "modelId": mid}
                r = requests.post(f"{api}/public/reports/querydata?synchronous=true", headers=h, json=cuerpo, timeout=120)
                (SAL / f"v{n:03d}_{titulo}.json").write_text(json.dumps({"section": s.get("displayName"), "query": q, "status": r.status_code, "result": r.json() if r.ok else r.text[:2000]}, ensure_ascii=False)[:400000], encoding="utf-8")
            except Exception as e:  # noqa: BLE001
                resumen.append(f"  error {type(e).__name__}: {e}")
    (SAL / "resumen.md").write_text("\n".join(log + resumen), encoding="utf-8")
    print("\n".join(log + resumen))


if __name__ == "__main__":
    main()
