"""Exploración puntual de fuentes de salud, ronda 2."""
import json, pathlib, re, urllib.parse
import requests

S = pathlib.Path("exploracion/salut2"); S.mkdir(parents=True, exist_ok=True)
UA = {"User-Agent": "girona-dades/0.1 (+https://github.com/nachotronic/girona-dades)"}
SOC = "https://analisi.transparenciacatalunya.cat"
inf = []

def get(url, nom=None, lim=400000):
    try:
        r = requests.get(url, headers=UA, timeout=180)
        inf.append(f"{r.status_code} {len(r.content)} {nom} {url}")
        if nom: (S / nom).write_bytes(r.content[:lim])
        return r
    except Exception as e:
        inf.append(f"ERR {type(e).__name__} {nom} {url}"); return None

def q(d, nom, **p):
    get(f"{SOC}/resource/{d}.json?" + urllib.parse.urlencode(p), nom)

q("thrd-jj3r", "rec_regions.json", **{"$select": "codi_regio_sanitaria,regio_sanitaria,max(any),count(*)", "$group": "codi_regio_sanitaria,regio_sanitaria"})
q("thrd-jj3r", "rec_mesos.json", **{"$select": "any,mes,sum(nombre_receptes),sum(import_integre)", "$group": "any,mes", "$order": "any,mes", "$limit": 500})
q("thrd-jj3r", "rec_edats.json", **{"$select": "grup_edat,count(*)", "$group": "grup_edat"})
q("44sy-txnv", "vig_mostra.json", **{"$limit": 20, "$order": "data_inici DESC"})
q("44sy-txnv", "vig_diag.json", **{"$select": "diagnostic,count(*),max(data_inici),min(data_inici)", "$group": "diagnostic"})
q("44sy-txnv", "vig_ambit.json", **{"$select": "codi_ambit,nom_ambit,codi_regio,nom_regio,count(*)", "$group": "codi_ambit,nom_ambit,codi_regio,nom_regio"})
q("nrmq-ytje", "est_mostra.json", **{"$limit": 10, "$where": "provincia_codi='17'"})
q("nrmq-ytje", "est_tipus.json", **{"$select": "servei_fmt_nivell_2,count(*)", "$group": "servei_fmt_nivell_2", "$where": "provincia_codi='17'", "$order": "count(*) DESC", "$limit": 300})
for d in ["nrmq-ytje", "ptdc-nwds", "av3u-smj4", "thrd-jj3r", "44sy-txnv", "7dt9-azyt"]:
    get(f"{SOC}/api/views/{d}.json", f"view_{d}.json")
q("ptdc-nwds", "esca_mostra.json", **{"$limit": 30})
q("7dt9-azyt", "momo_mostra.json", **{"$limit": 10, "$order": "data DESC"})

B = "https://catsalut.gencat.cat/ca/coneix-catsalut/acces-sistema-salut/llistes-espera/"
for p in ["intervencions-quirurgiques/consulta/", "intervencions-quirurgiques/anys-anteriors/", "intervencions-quirurgiques/informacio/",
          "consultes-externes-especialitats/consulta/", "proves-diagnostiques/consulta/"]:
    n = re.sub(r"\W+", "_", p).strip("_")
    r = get(B + p, f"le_{n}.html", 600000)
    if r is not None and r.ok:
        links = sorted(set(re.findall(r'(?:href|src|data-url|action)="([^"]+)"', r.text)))
        (S / f"le_{n}_links.txt").write_text("\n".join(links), encoding="utf-8")
for u, n in [("https://web.gencat.cat/ca/generalitat/dades-indicadors/estadistiques-indicadors/salut/esca-salut", "esca_web.html"),
             ("https://salutweb.gencat.cat/ca/departament/estadistiques-sanitaries/enquestes/esca/", "esca_salutweb.html"),
             ("https://www.idescat.cat/indicadors/?id=aec&n=15655", "idescat_esca.html")]:
    r = get(u, n, 600000)
    if r is not None and r.ok:
        links = sorted(set(re.findall(r'href="([^"]+)"', r.text)))
        (S / (n + "_links.txt")).write_text("\n".join(links), encoding="utf-8")
(S / "informe.txt").write_text("\n".join(inf), encoding="utf-8")
print("\n".join(inf))
