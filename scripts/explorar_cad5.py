"""Exploración temporal: estadisticas_5 del Catastro (px.zip, serie_eco_fin, hst_supm)."""
import io, pathlib, re, zipfile
import requests
S = pathlib.Path("exploracion/cad5"); S.mkdir(parents=True, exist_ok=True)
C = "https://www.catastro.hacienda.gob.es/documentos/estadisticas/"
UA = {"User-Agent": "Mozilla/5.0 (girona-dades)"}
log = []
r = requests.get(C + "px.zip", headers=UA, timeout=600)
log.append(f"px.zip {r.status_code} {len(r.content)}")
try:
    z = zipfile.ZipFile(io.BytesIO(r.content))
    noms = z.namelist()
    log.append(f"{len(noms)} ficheros")
    (S / "px_lista.txt").write_text("\n".join(f"{i.filename}\t{i.file_size}" for i in z.infolist()), encoding="utf-8")
    gi = [n for n in noms if re.search(r"17\.px$|_17|4217|4117|4317|4417|4517|04017", n, re.I)]
    log.append("Girona: " + ", ".join(gi[:80]))
    for n in gi[:25]:
        b = z.read(n)[:6000].decode("latin-1", "replace")
        (S / ("m_" + re.sub(r"[^A-Za-z0-9._-]", "_", n) + ".txt")).write_text(b, encoding="utf-8")
except Exception as e:
    log.append(f"ERR zip {e}")
for f in ("economicofinanciera/serie_eco_fin.csv", "serieshistoricas/hst_supm_distritos.csv"):
    r = requests.get(C + f, headers=UA, timeout=300)
    lin = r.content.decode("latin-1").splitlines()
    log.append(f"{f} {r.status_code} {len(lin)} líneas")
    keep = lin[:30] + [l for l in lin if re.search(r"Girona|GIRONA|^\d{4},17\d{5}", l)][:300]
    (S / (f.split("/")[-1] + ".txt")).write_text("\n".join(keep), encoding="utf-8")
(S / "informe.txt").write_text("\n".join(log), encoding="utf-8")
print("\n".join(log))
