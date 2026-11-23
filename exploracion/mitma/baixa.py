"""Exploración temporal: descarga las tablas del Boletín (URL nueva y antigua)."""
import pathlib, requests
D = pathlib.Path("exploracion/mitma")
UA = {"User-Agent": "girona-dades/0.1 (+https://github.com/nachotronic/girona-dades)"}
COD = ["32100500", "32101000", "32200500", "32201000",
       "340101b0", "340101c0", "340101e0", "340101f0", "340101g0", "340101i0", "340101j0", "340101k0",
       "34020120", "34020130", "34020140", "34010110", "34010210", "340101a0", "340101d0", "340101h0", "340101l0",
       "34020110", "34020150", "34020180",
       "35101000", "35101500", "35102000", "35102500", "35103000", "35103500"]
inf = []
for c in COD:
    for nom, url in (("nova", f"https://cdn.transportes.gob.es/estadistica/BoletinOnline2/{c}.xls"),
                     ("antiga", f"https://apps.fomento.gob.es/BoletinOnline2/sedal/{c}.XLS")):
        try:
            r = requests.get(url, headers=UA, timeout=120)
            inf.append(f"{c} {nom} {r.status_code} {r.headers.get('content-type')} {len(r.content)}")
            if r.ok and nom == "nova":
                (D / f"{c}.xls").write_bytes(r.content)
        except Exception as e:
            inf.append(f"{c} {nom} ERROR {e}")
(D / "informe.txt").write_text("\n".join(inf))
