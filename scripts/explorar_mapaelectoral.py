"""Exploración temporal: descarga los CSV de mapaelectoral.es y guarda cabecera y filas de Girona."""
import csv, gzip, io, pathlib, requests
B = "https://mapaelectoral.es/generales-2026/descargas/"
F = ["secciones.csv", "municipios.csv", "municipios_historico.csv", "resultados_secciones_largo.csv",
     "secciones_municipales_europeas.csv", "resultados_secciones_largo_municipales_europeas.csv",
     "municipios_republica.csv", "LICENCIA-republica.txt"]
S = pathlib.Path("exploracion/mapaelectoral"); S.mkdir(parents=True, exist_ok=True)
inf = []
for f in F:
    try:
        r = requests.get(B + f, timeout=300, headers={"User-Agent": "girona-dades (+https://github.com/nachotronic/girona-dades)"})
        inf.append(f"{f}: {r.status_code} {r.headers.get('content-type')} {len(r.content)} bytes")
        if r.status_code != 200: continue
        t = r.content.decode("utf-8-sig", "replace")
        if f.endswith(".txt"):
            (S / f).write_text(t); continue
        lines = t.splitlines()
        (S / (f + ".head.txt")).write_text("\n".join(lines[:15]))
        rd = csv.reader(io.StringIO(t)); h = next(rd)
        cod = [i for i, c in enumerate(h) if any(k in c.lower() for k in ("code", "cod", "cusec", "ine"))]
        rows = [h] + [x for x in rd if any(x[i].zfill(5 if len(x[i]) <= 5 else 10).startswith("17") for i in cod[:2] if i < len(x))]
        inf.append(f"  cols={len(h)} codecols={[h[i] for i in cod]} girona_rows={len(rows)-1} total_lines={len(lines)}")
        with gzip.open(S / (f + ".girona.csv.gz"), "wt", newline="") as g:
            csv.writer(g).writerows(rows)
    except Exception as e:
        inf.append(f"{f}: ERROR {e}")
(S / "informe.txt").write_text("\n".join(inf))
print("\n".join(inf))
