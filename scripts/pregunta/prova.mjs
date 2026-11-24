// Bateria de proves del cercador de preguntes: node scripts/pregunta/prova.mjs [web] [bateria.tsv] [--detall]
// Necessita Playwright (com scripts/referencia/extreu.mjs). MapLibre es pot servir en local amb MAPLIBRE=/ruta/maplibre-gl.js
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { readFileSync } from "node:fs";
import { extname, join, normalize, dirname } from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const aqui = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const detall = process.argv.includes("--detall");
const arrel = args[0] || join(aqui, "../../web"), fitxer = args[1] || join(aqui, "bateria.tsv");
const T = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".geojson": "application/json" };
const srv = createServer(async (req, res) => {
  const r = normalize(decodeURIComponent(new URL(req.url, "http://x").pathname));
  const f = join(arrel, r.endsWith("/") ? r + "index.html" : r);
  try { const b = await readFile(f); res.writeHead(200, { "content-type": T[extname(f)] || "application/octet-stream" }); res.end(b); } catch { res.writeHead(404); res.end(); }
});
await new Promise((r) => srv.listen(0, "127.0.0.1", r));
const casos = readFileSync(fitxer, "utf8").split("\n").filter((l) => l.trim() && !l.startsWith("#")).map((l) => { const [q, ind, muns, tipus] = l.split("\t"); return { q, ind, muns: muns || "", tipus: tipus || "" }; });
const nav = await chromium.launch();
const p = await nav.newPage();
if (process.env.MAPLIBRE) await p.route(/unpkg\.com\/maplibre-gl.*\.js$/, (r) => r.fulfill({ path: process.env.MAPLIBRE, contentType: "text/javascript" }));
else await p.route(/^https?:\/\/(?!127\.0\.0\.1)/, (r) => r.abort());
p.on("pageerror", (e) => console.error("Error:", e.message));
await p.goto(`http://127.0.0.1:${srv.address().port}/?lang=es`);
await p.waitForFunction(() => window.preguntaDades && typeof D !== "undefined" && D && D.cj, null, { timeout: 120000 });
// Els gràfics de les seccions també es busquen: s'espera que estiguin pintats
await p.waitForLoadState("networkidle").catch(() => {});
await p.waitForFunction(() => { const n = document.querySelectorAll("section.sec figure[data-id]").length; const ok = n > 0 && n === window.__nFig; window.__nFig = n; return ok; }, null, { timeout: 60000, polling: 1000 }).catch(() => {});
const res = await p.evaluate(async (casos) => {
  const out = [];
  for (const c of casos) {
    let r;
    if (window.preguntaDades.pla) r = await window.preguntaDades.pla(c.q);
    else {
      const a = window.preguntaDades.analitza(c.q), i = a.ind;
      const tipus = !a.muns.length && a.fora.length ? "fora" : i && i.id === "alcalde" ? "alcalde" : i && i.id === "comarca" ? "comarca" : !i && a.muns.length === 1 ? "resum" : !i && a.muns.length > 1 ? "comp" : !i ? "no" : a.evol ? "evol" : a.muns.length > 1 ? "comp" : a.muns.length === 1 ? "mun" : (a.dir || a.ranqParaula || a.minPob || a.coms.length) ? "rank" : "prov";
      r = { tipus, inds: i ? [i.id] : [], muns: a.muns.map((m) => m.nom) };
    }
    out.push(r);
  }
  return out;
}, casos);
let ok = 0;
const fallades = [];
casos.forEach((c, k) => {
  const r = res[k];
  const indsOk = c.ind === "-" ? !r.inds.length || c.tipus === "resum" || c.tipus === "fora" || c.tipus === "no" || c.tipus === "comp" : c.ind.split("+").every((x, j) => x.split("|").includes(r.inds[j]));
  const munsOk = (c.muns ? c.muns.split(";") : []).join(";") === r.muns.join(";");
  const tipusOk = !c.tipus || c.tipus.split("|").includes(r.tipus);
  const bo = indsOk && munsOk && tipusOk;
  if (bo) ok++; else fallades.push(`✗ ${c.q}\n    esperat: ${c.tipus} [${c.ind}] ${c.muns}\n    obtingut: ${r.tipus} [${r.inds.join("+")}] ${r.muns.join(";")}`);
});
if (detall) console.log(fallades.join("\n"));
console.log(`\n${ok} de ${casos.length} correctes (${((ok / casos.length) * 100).toFixed(0)} %)`);
await nav.close(); srv.close();
