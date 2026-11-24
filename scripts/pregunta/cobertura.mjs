// Cobertura del cercador de preguntes: comprova que cada indicador del mapa i cada gràfic de les seccions es pot trobar.
//   node scripts/pregunta/cobertura.mjs [web] [--detall] [--md fitxer.md]
// Per a cada indicador pregunta «<nom curt> en <municipi amb dada>» (en castellà i en català) i mira si el cercador
// respon amb aquest indicador. Llista també els indicadors sense sinònims a pregunta-dic.js i els gràfics que no es troben
// pel seu títol. Quan s'afegeix una dada nova al mapa o un gràfic nou a una secció, el cercador ja la té (pel nom);
// aquest informe diu quines convé reforçar amb sinònims a pregunta-dic.js. No falla mai: només informa.
// MapLibre es pot servir en local amb MAPLIBRE=/ruta/maplibre-gl.js (com prova.mjs).
import { createServer } from "node:http";
import { readFile, writeFile } from "node:fs/promises";
import { extname, join, normalize, dirname } from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const aqui = dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
const md = argv.includes("--md") ? argv[argv.indexOf("--md") + 1] : null;
const detall = argv.includes("--detall");
const arrel = argv.find((a, k) => !a.startsWith("--") && argv[k - 1] !== "--md") || join(aqui, "../../web");
const T = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".geojson": "application/json" };
const srv = createServer(async (req, res) => {
  const r = normalize(decodeURIComponent(new URL(req.url, "http://x").pathname));
  const f = join(arrel, r.endsWith("/") ? r + "index.html" : r);
  try { const b = await readFile(f); res.writeHead(200, { "content-type": T[extname(f)] || "application/octet-stream" }); res.end(b); } catch { res.writeHead(404); res.end(); }
});
await new Promise((r) => srv.listen(0, "127.0.0.1", r));
const nav = await chromium.launch();
const p = await nav.newPage();
if (process.env.MAPLIBRE) await p.route(/unpkg\.com\/maplibre-gl.*\.js$/, (r) => r.fulfill({ path: process.env.MAPLIBRE, contentType: "text/javascript" }));
else await p.route(/^https?:\/\/(?!127\.0\.0\.1)/, (r) => r.abort());
p.on("pageerror", (e) => console.error("Error:", e.message));
await p.goto(`http://127.0.0.1:${srv.address().port}/?lang=es`);
await p.waitForFunction(() => window.preguntaDades && typeof D !== "undefined" && D && D.cj, null, { timeout: 120000 });
await p.waitForLoadState("networkidle").catch(() => {});
await p.waitForFunction(() => { const n = document.querySelectorAll("section.sec figure[data-id]").length; const ok = n > 0 && n === window.__nFig; window.__nFig = n; return ok; }, null, { timeout: 60000, polling: 1000 }).catch(() => {});
const r = await p.evaluate(async () => {
  const P = window.preguntaDades, inds = P.indicadors(), curt = {};
  inds.forEach((i) => { (curt[i.es.toLowerCase()] = curt[i.es.toLowerCase()] || []).push(i.id); });
  const out = [];
  for (const i of inds) {
    if (!i.mun) continue;
    const res = [];
    for (const [l, nom, prep] of [["es", i.es, "en"], ["ca", i.ca, "a"]]) {
      const q = `${nom} ${prep} ${i.mun}`, pl = await P.pla(q);
      const tr = pl.inds[0] || null;
      res.push({ l, q, tr, ok: tr === i.id || (curt[i.es.toLowerCase()] || []).includes(tr) });
    }
    out.push({ ...i, res });
  }
  const grafs = [];
  for (const g of P.grafics()) { const pl = await P.pla(g.tit); grafs.push({ ...g, tr: pl.inds[0] || pl.tipus, ok: !["no", "resum", "fora"].includes(pl.tipus) }); }
  return { out, grafs };
});
await nav.close(); srv.close();
const { out, grafs } = r;
const fallen = out.filter((i) => i.res.some((x) => !x.ok)), senseSin = out.filter((i) => !i.sin), gFallen = grafs.filter((g) => !g.ok);
const perTema = {};
senseSin.forEach((i) => { perTema[i.tema] = (perTema[i.tema] || 0) + 1; });
const linies = [
  `## Cercador «Pregunta a les dades»: cobertura`,
  ``,
  `- Indicadors del mapa al cercador: **${out.length}**. Es troben pel seu nom (es i ca): **${out.length - fallen.length}**.`,
  `- Indicadors sense sinònims a pregunta-dic.js: **${senseSin.length}**${senseSin.length ? ` (${Object.entries(perTema).sort((a, b) => b[1] - a[1]).map(([t, n]) => `${t} ${n}`).join(", ")})` : ""}.`,
  `- Gràfics de les seccions: **${grafs.length}**. Amb el seu títol, el cercador respon el gràfic o la mateixa dada del mapa: **${grafs.length - gFallen.length}**.`,
];
if (fallen.length) linies.push("", "### Indicadors que no es troben pel nom", "", ...fallen.map((i) => `- \`${i.id}\` (${i.tema}): ${i.res.filter((x) => !x.ok).map((x) => `«${x.q}» → ${x.tr || "res"}`).join("; ")}`));
if (gFallen.length) linies.push("", "### Gràfics que no es troben pel títol (el cercador no respon res)", "", ...gFallen.map((g) => `- \`${g.sec}/${g.id}\` «${g.tit}» → ${g.tr}`));
if (detall && senseSin.length) linies.push("", "### Indicadors sense sinònims", "", ...senseSin.map((i) => `- \`${i.id}\` (${i.tema}) ${i.es}`));
const txt = linies.join("\n");
console.log(txt);
if (md) await writeFile(md, txt + "\n", { flag: "a" });
