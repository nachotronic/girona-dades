"""Exploración de las estadísticas del Catastro (temporal, 2.ª ronda): descarga muestras."""
import pathlib, re
import requests

SAL = pathlib.Path("exploracion/catastro2"); SAL.mkdir(parents=True, exist_ok=True)
UA = {"User-Agent": "Mozilla/5.0 (girona-dades)"}
C = "https://www.catastro.hacienda.gob.es"
J = C + "/jaxi/tabla.do?path=/est{a}/{p}/&file={f}.px&type=pcaxis&L=0"
U = {}
for t in ("URBANA", "PARCELAS", "RUSTICA"):
    U[f"xls_{t}2026"] = f"{C}/documentos/estadisticas/{t}2026.xls"
U["xls_URBANA2012"] = f"{C}/documentos/estadisticas/URBANA2012.xls"
for f in ("04117", "URAO4217", "URBO4217", "04317", "04417", "04517"):
    U[f"urb2026_{f}"] = J.format(a=2026, p="catastro/urbano", f=f)
U["urb2012_04117"] = J.format(a=2012, p="catastro/urbano", f="04117")
U["urb2008_URAO4217"] = J.format(a=2008, p="catastro/urbano", f="URAO4217")
for f in ("04117", "04217"):
    U[f"rus2026_{f}"] = J.format(a=2026, p="catastro/rustico", f=f)
U["ibi2025_04017"] = J.format(a=2025, p="ibi", f="04017")
U["ibi2025_U04017"] = J.format(a=2025, p="ibi", f="U04017")
for s in ("1_17", "2_17", "3_17"):
    U[f"dis2025_{s}"] = C + f"/jaxi/tabla.do?path=/est2025/catastro/distrito/&file=ANU2025_{s}.px&type=pcaxis&L=0"
for n in ("hst_inm_distritos", "hst_vm_distritos"):
    U[n] = f"{C}/documentos/estadisticas/serieshistoricas/{n}.csv"
log = []
for k, u in U.items():
    try:
        r = requests.get(u, headers=UA, timeout=300)
        ext = {"xls": "xls", "csv": "csv"}.get(u.rsplit(".", 1)[-1], "px")
        if "html" in r.headers.get("content-type", ""):
            ext = "html"
        (SAL / f"{k}.{ext}").write_bytes(r.content[:8_000_000])
        log.append(f"{r.status_code} {r.headers.get('content-type','')} {len(r.content)} {k} {u}")
    except Exception as e:
        log.append(f"ERR {k} {e}")
(SAL / "informe.txt").write_text("\n".join(log), encoding="utf-8")
print("\n".join(log))
