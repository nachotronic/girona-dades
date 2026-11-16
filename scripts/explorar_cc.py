import pathlib, requests, time, json
OUT = pathlib.Path("exploracion/censcomerc"); OUT.mkdir(parents=True, exist_ok=True)
B = "https://censcomerc.empresa.gencat.cat/api/"
UA = {"User-Agent": "Mozilla/5.0", "Accept": "application/json", "Referer": "https://censcomerc.empresa.gencat.cat/"}
log = []
for nom, u in [("sm_agullana", B + "sector/filtre/municipi?municipi=Agullana&year=2023"),
               ("sm_girona", B + "sector/filtre/municipi?municipi=Girona&year=2023"),
               ("sm_besalu", B + "sector/filtre/municipi?year=2023&municipi=Besal%C3%BA"),
               ("sectors", B + "sectors/filtre?year=2023"),
               ("sectors_mun", B + "sectors/filtre?year=2023&municipi=Agullana"),
               ("act", B + "activitat/filtre?year=2023&municipi=Agullana"),
               ("mun2023", B + "municipis/filtre/?year=2023"),
               ("sectors_all", B + "sectors/")]:
    for i in range(3):
        try:
            r = requests.get(u, headers=UA, timeout=90)
            log.append(f"{r.status_code} {len(r.content)} {u}")
            if r.ok:
                (OUT / f"{nom}.json").write_bytes(r.content[:300000]); break
        except Exception as e:
            log.append(f"ERR {e} {u}")
        time.sleep(5)
(OUT / "log.txt").write_text("\n".join(log))
