// Genera data/processed/exportacions/mon.geojson y provincies.geojson (se ejecutó una vez; no corre en las Actions).
// npm i topojson-client mapshaper; paquetes world-atlas@2.0.2, i18n-iso-countries@7.11.0, es-atlas@0.6.0.
// Después: mapshaper -simplify 12% (mundo) y 15% (provincias), antimeridiano corregido y Canarias desplazadas junto a la península.
import fs from "fs";
import * as topo from "topojson-client";
const codes = JSON.parse(fs.readFileSync("/tmp/npmgeo/i18n-iso-countries-7.11.0/package/codes.json"));
const num2a = Object.fromEntries(codes.map((c) => [c[2], c[0]]));
const w = JSON.parse(fs.readFileSync("/tmp/npmgeo/world-atlas-2.0.2/package/countries-50m.json"));
const gw = topo.feature(w, w.objects.countries);
gw.features = gw.features.filter((f) => f.id !== "010").map((f) => ({ type: "Feature", properties: { c: num2a[f.id] || (f.properties.name === "Kosovo" ? "XK" : f.properties.name === "N. Cyprus" ? "CY" : f.properties.name === "Somaliland" ? "SO" : "") }, geometry: f.geometry }));
console.log("sin código:", gw.features.filter((f) => !f.properties.c).length);
fs.writeFileSync("mon_raw.json", JSON.stringify(gw));
const e = JSON.parse(fs.readFileSync("/tmp/npmgeo/es-atlas-0.6.0/package/es/provinces.json"));
const ge = topo.feature(e, e.objects.provinces);
ge.features = ge.features.map((f) => ({ type: "Feature", properties: { c: f.id, n: f.properties.name }, geometry: f.geometry }));
fs.writeFileSync("prov_raw.json", JSON.stringify(ge));
