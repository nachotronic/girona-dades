// Extrae de la web construida (web/) los valores de todos los indicadores tal como los calcula el mapa (web/mapa.js),
// para que las páginas estáticas, las descargas y llms.txt digan exactamente lo mismo que la web interactiva.
// Uso: node scripts/referencia/extreu.mjs web build/referencia.json
import { createServer } from "node:http";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { extname, join, normalize, dirname } from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const [arrel = "web", sortida = "build/referencia.json"] = process.argv.slice(2);

const TIPUS = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".geojson": "application/json", ".woff2": "font/woff2" };
const servidor = createServer(async (req, res) => {
  const ruta = normalize(decodeURIComponent(new URL(req.url, "http://x").pathname)).replace(/^(\.\.[/\\])+/, "");
  const fitxer = join(arrel, ruta.endsWith("/") ? ruta + "index.html" : ruta);
  try { const b = await readFile(fitxer); res.writeHead(200, { "content-type": TIPUS[extname(fitxer)] || "application/octet-stream" }); res.end(b); }
  catch { res.writeHead(404); res.end(); }
});
await new Promise((r) => servidor.listen(0, "127.0.0.1", r));
const port = servidor.address().port;

const nav = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
const pag = await nav.newPage();
// Solo hace falta el cálculo: el mapa base y MapLibre (CDN) no se cargan
await pag.route(/^https?:\/\/(?!127\.0\.0\.1)/, (r) => r.abort());
pag.on("pageerror", (e) => console.error("Error de la pàgina:", e.message));
await pag.goto(`http://127.0.0.1:${port}/?lang=ca`, { waitUntil: "load" });
await pag.waitForFunction(() => typeof D !== "undefined" && D && D.municipios && window.indMapa && window.mapaApi, null, { timeout: 120000 });

const dades = await pag.evaluate(async () => {
  const { IND, valorProvincia, anysDe } = window.indMapa;
  const { TEMES, nomInd } = window.mapaApi;
  const SEC = await fetch("datos/seccions.json").then((r) => r.json());
  const num = (v) => (v != null && typeof v === "number" && isFinite(v) ? Math.round(v * 1e4) / 1e4 : null);
  const periode = (i) => {
    const a = typeof i.a === "number" ? i.a : i.a && D.anys ? D.anys[i.a] : null;
    return i.per && !a && D.cj ? anysDe(i).slice(-1)[0] : a != null ? String(a) : null;
  };
  const etiqueta = (i, l) => { LANG = l; const n = nomInd(i); const p = n.split(" · "); return p.length > 1 ? p[p.length - 1] : null; };
  const textNota = (n, l) => (!n ? null : typeof n === "string" ? n : n[l] || null);
  const ind = [];
  for (const i of IND) {
    if (!i.v || i.cat || i.el) continue;
    const vals = {};
    let n = 0;
    D.municipios.forEach((m) => { let v = null; try { v = num(i.v(m)); } catch (e) { v = null; } if (v != null) { vals[m.ine] = v; n++; } });
    if (!n) continue;
    let gi = null, r = {};
    try { gi = num(valorProvincia(i)); } catch (e) { /* */ }
    try { r = (i.ref && (i.a === "sol" || i.a === "veh" || i.a === "cad" || i.a === "cad_vm2" || i.per) ? i.ref() : (D.ref || {})[i.id]) || {}; } catch (e) { r = {}; }
    const fmtL = {}, eti = {};
    for (const l of ["ca", "es"]) {
      LANG = l;
      const f = {};
      Object.entries(vals).forEach(([k, v]) => { f[k] = i.f(v); });
      fmtL[l] = { mun: f, gi: gi != null ? i.f(gi) : null, cat: num(r.cat) != null ? i.f(r.cat) : null, esp: num(r.esp) != null ? i.f(r.esp) : null };
      eti[l] = etiqueta(i, l);
    }
    let sec = null;
    if (i.s) {
      sec = {};
      Object.entries(SEC).forEach(([k, x]) => { let v = null; try { v = num(i.s(x)); } catch (e) { /* */ } if (v != null) sec[k] = v; });
      if (!Object.keys(sec).length) sec = null;
    }
    ind.push({
      id: i.id, tema: i.tema, ca: i.ca, es: i.es, periode: periode(i), periode_et: eti,
      nota: { ca: textNota(i.nota, "ca"), es: textNota(i.nota, "es") }, sumable: i.sumable !== false,
      valors: vals, prov: gi, cat: num(r.cat), esp: num(r.esp), fmt: fmtL, sec,
    });
  }
  LANG = "ca";
  return {
    generat: D.generado, temes: TEMES.map((t) => ({ id: t.id, ca: t.ca, es: t.es })),
    municipis: D.municipios.map((m) => ({
      ine: m.ine, nom: m.nom, comarca: m.comarca, poblacio: m.poblacion,
      alcalde: m.pol && m.pol.alcalde ? { nom: m.pol.alcalde.nom, partit: m.pol.alcalde.partit } : null,
    })),
    provincia: { poblacio: D.provincia && D.provincia.poblacion }, fonts: D.fonts || {}, indicadors: ind,
  };
});
await nav.close();
servidor.close();
await mkdir(dirname(sortida), { recursive: true });
await writeFile(sortida, JSON.stringify(dades));
console.log(`${dades.indicadors.length} indicadors municipals, ${dades.municipis.length} municipis → ${sortida}`);
