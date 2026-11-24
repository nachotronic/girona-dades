"use strict";
// Notaries: sección «Notaries» con actos notariales por provincia (Consejo General del Notariado).
// Datos en datos/notariado.json (scripts/notariado_web.py), que se piden la primera vez que se pinta.
// Mapa MapLibre de provincias (datos/provincies.geojson, el mismo de Exportacions) y gráficos de provincia.js (window.PG).
// Usa las globales de app.js: LANG, fmt, pct, tile, mostraTip, amagaTip.
(function () {
  const TX = {
    ca: {
      ind: {
        her: ["Herències", "herències acceptades i repartides davant notari per 1.000 habitants"],
        test: ["Testaments", "testaments oberts per 1.000 habitants"],
        abint: ["Hereus sense testament", "actes per declarar hereus quan no hi ha testament, per 1.000 habitants"],
        don: ["Donacions", "donacions per 1.000 habitants"],
        pod: ["Poders", "poders notarials (generals, per a plets i altres) per 1.000 habitants"],
        hipv: ["Hipoteques per comprar habitatge", "per 1.000 habitants"],
        hipv_imp: ["Hipoteca mitjana", "euros per préstec hipotecari per comprar habitatge"],
        hip: ["Totes les hipoteques", "préstecs hipotecaris de qualsevol finalitat per 1.000 habitants"],
        canc: ["Hipoteques cancel·lades", "cartes de pagament i cancel·lacions per 1.000 habitants"],
        canc_imp: ["Import mitjà cancel·lat", "euros per cancel·lació d'hipoteca"],
        soc: ["Societats noves", "societats constituïdes per 1.000 habitants"],
        soc_cap: ["Capital de les societats noves", "euros de capital mitjà per societat constituïda"],
        pol: ["Pòlisses de préstec i crèdit", "pòlisses intervingudes per notari per 1.000 habitants"],
        seg: ["Segregacions de finques", "per 1.000 habitants"],
        sub: ["Rectificacions d'escriptures", "esmenes, aclariments i modificacions per 1.000 habitants"],
      },
      dotze: "últims 12 mesos", quatre: "últims 4 trimestres",
      x_her: "Herències", xn_her: (v, c, e) => `per 1.000 habitants en 12 mesos (${v}); Catalunya ${c}, Espanya ${e}`,
      x_test: "Testaments", xn_test: (v, c, e) => `per 1.000 habitants en 4 trimestres (${v}); Catalunya ${c}, Espanya ${e}`,
      x_don: "Donacions", xn_don: (v, c, e) => `per 1.000 habitants en 4 trimestres (${v}); Catalunya ${c}, Espanya ${e}`,
      x_hipv: "Hipoteques d'habitatge", xn_hipv: (n, i) => `en 12 mesos; préstec mitjà de ${i}`,
      x_canc: "Hipoteques cancel·lades", xn_canc: (n) => `en 12 mesos, davant ${n} hipoteques noves de tota mena`,
      x_soc: "Societats noves", xn_soc: (c) => `en 4 trimestres; capital mitjà de ${c}`,
      m_tit: "Girona davant les altres províncies", ind_l: "Indicador",
      h_map: (r, n, v, u) => `Girona és la <b>${r}a</b> de ${n} províncies (${v} ${u}).`,
      h_map_imp: (r, n, v) => `Girona és la <b>${r}a</b> de ${n} províncies (${v}).`,
      per_mil: "per 1.000 hab.", sense: "Sense dades", actes: "actes",
      font: "Font: Consell General del Notariat, Centre d'Informació Estadística (Índex Únic Informatitzat).",
      font_p: (a) => `Font: Consell General del Notariat i INE (població ${a}).`,
      nd: "El Notariat només publica aquestes dades per província: no hi ha xifres per municipi ni per secció censal. Ceuta i Melilla surten juntes i no es mostren.",
      ult: (e) => `Dades fins ${e}.`,
      g: {
        not_her: ["Herències", "per 1.000 habitants, suma de 12 mesos"],
        not_test: ["Testaments", "per 1.000 habitants, suma de 4 trimestres"],
        not_abint: ["Hereus sense testament", "declaracions d'hereus abintestat per 1.000 habitants, 4 trimestres"],
        not_don: ["Donacions", "per 1.000 habitants, suma de 4 trimestres"],
        not_pod: ["Poders notarials", "per 1.000 habitants, suma de 4 trimestres"],
        not_hipv: ["Hipoteques per comprar habitatge", "per 1.000 habitants, suma de 12 mesos"],
        not_hipv_imp: ["Hipoteca mitjana per comprar habitatge", "euros, mitjana de 12 mesos"],
        not_hc: ["Hipoteques noves i cancel·lades", "província de Girona, nombre en 12 mesos"],
        not_soc: ["Societats noves", "per 1.000 habitants, suma de 4 trimestres"],
        not_soc_cap: ["Capital de les societats noves", "euros per societat, mitjana de 4 trimestres"],
        not_pol: ["Pòlisses de préstec i crèdit", "per 1.000 habitants, suma de 12 mesos"],
        not_seg: ["Segregacions de finques", "per 1.000 habitants, suma de 4 trimestres"],
      },
      not_hc_noms: { gi: "Hipoteques signades", esp: "Hipoteques cancel·lades" },
      h: (t, v, q, c, e) => `${q}, a la província hi va haver <b>${v} ${t} per cada 1.000 habitants</b>; a Catalunya, ${c}, i a Espanya, ${e}.`,
      h_imp: (t, v, q, c, e) => `${q}, ${t} a la província era de <b>${v}</b>; a Catalunya, ${c}, i a Espanya, ${e}.`,
      t: { not_her: "herències", not_test: "testaments", not_abint: "declaracions d'hereus sense testament", not_don: "donacions", not_pod: "poders", not_hipv: "hipoteques per comprar habitatge", not_soc: "societats noves", not_pol: "pòlisses de préstec", not_seg: "segregacions", not_hipv_imp: "la hipoteca mitjana", not_soc_cap: "el capital mitjà de les societats noves" },
      h_hc: (q, a, b) => `${q}, a la província es van signar <b>${a} hipoteques</b> i se'n van cancel·lar <b>${b}</b>.`,
      q12: (e) => `En els 12 mesos fins ${e}`, q4: (e) => `En els 4 trimestres fins ${e}`,
      mesos: ["gener", "febrer", "març", "abril", "maig", "juny", "juliol", "agost", "setembre", "octubre", "novembre", "desembre"],
    },
    es: {
      ind: {
        her: ["Herencias", "herencias aceptadas y repartidas ante notario por 1.000 habitantes"],
        test: ["Testamentos", "testamentos abiertos por 1.000 habitantes"],
        abint: ["Herederos sin testamento", "actas para declarar herederos cuando no hay testamento, por 1.000 habitantes"],
        don: ["Donaciones", "donaciones por 1.000 habitantes"],
        pod: ["Poderes", "poderes notariales (generales, para pleitos y otros) por 1.000 habitantes"],
        hipv: ["Hipotecas para comprar vivienda", "por 1.000 habitantes"],
        hipv_imp: ["Hipoteca media", "euros por préstamo hipotecario para comprar vivienda"],
        hip: ["Todas las hipotecas", "préstamos hipotecarios de cualquier finalidad por 1.000 habitantes"],
        canc: ["Hipotecas canceladas", "cartas de pago y cancelaciones por 1.000 habitantes"],
        canc_imp: ["Importe medio cancelado", "euros por cancelación de hipoteca"],
        soc: ["Sociedades nuevas", "sociedades constituidas por 1.000 habitantes"],
        soc_cap: ["Capital de las sociedades nuevas", "euros de capital medio por sociedad constituida"],
        pol: ["Pólizas de préstamo y crédito", "pólizas intervenidas por notario por 1.000 habitantes"],
        seg: ["Segregaciones de fincas", "por 1.000 habitantes"],
        sub: ["Rectificaciones de escrituras", "subsanaciones, aclaraciones y modificaciones por 1.000 habitantes"],
      },
      dotze: "últimos 12 meses", quatre: "últimos 4 trimestres",
      x_her: "Herencias", xn_her: (v, c, e) => `por 1.000 habitantes en 12 meses (${v}); Cataluña ${c}, España ${e}`,
      x_test: "Testamentos", xn_test: (v, c, e) => `por 1.000 habitantes en 4 trimestres (${v}); Cataluña ${c}, España ${e}`,
      x_don: "Donaciones", xn_don: (v, c, e) => `por 1.000 habitantes en 4 trimestres (${v}); Cataluña ${c}, España ${e}`,
      x_hipv: "Hipotecas de vivienda", xn_hipv: (n, i) => `en 12 meses; préstamo medio de ${i}`,
      x_canc: "Hipotecas canceladas", xn_canc: (n) => `en 12 meses, frente a ${n} hipotecas nuevas de todo tipo`,
      x_soc: "Sociedades nuevas", xn_soc: (c) => `en 4 trimestres; capital medio de ${c}`,
      m_tit: "Girona frente a las demás provincias", ind_l: "Indicador",
      h_map: (r, n, v, u) => `Girona es la <b>${r}.ª</b> de ${n} provincias (${v} ${u}).`,
      h_map_imp: (r, n, v) => `Girona es la <b>${r}.ª</b> de ${n} provincias (${v}).`,
      per_mil: "por 1.000 hab.", sense: "Sin datos", actes: "actos",
      font: "Fuente: Consejo General del Notariado, Centro de Información Estadística (Índice Único Informatizado).",
      font_p: (a) => `Fuente: Consejo General del Notariado e INE (población ${a}).`,
      nd: "El Notariado solo publica estos datos por provincia: no hay cifras por municipio ni por sección censal. Ceuta y Melilla salen juntas y no se muestran.",
      ult: (e) => `Datos hasta ${e}.`,
      g: {
        not_her: ["Herencias", "por 1.000 habitantes, suma de 12 meses"],
        not_test: ["Testamentos", "por 1.000 habitantes, suma de 4 trimestres"],
        not_abint: ["Herederos sin testamento", "declaraciones de herederos abintestato por 1.000 habitantes, 4 trimestres"],
        not_don: ["Donaciones", "por 1.000 habitantes, suma de 4 trimestres"],
        not_pod: ["Poderes notariales", "por 1.000 habitantes, suma de 4 trimestres"],
        not_hipv: ["Hipotecas para comprar vivienda", "por 1.000 habitantes, suma de 12 meses"],
        not_hipv_imp: ["Hipoteca media para comprar vivienda", "euros, media de 12 meses"],
        not_hc: ["Hipotecas nuevas y canceladas", "provincia de Girona, número en 12 meses"],
        not_soc: ["Sociedades nuevas", "por 1.000 habitantes, suma de 4 trimestres"],
        not_soc_cap: ["Capital de las sociedades nuevas", "euros por sociedad, media de 4 trimestres"],
        not_pol: ["Pólizas de préstamo y crédito", "por 1.000 habitantes, suma de 12 meses"],
        not_seg: ["Segregaciones de fincas", "por 1.000 habitantes, suma de 4 trimestres"],
      },
      not_hc_noms: { gi: "Hipotecas firmadas", esp: "Hipotecas canceladas" },
      h: (t, v, q, c, e) => `${q}, en la provincia hubo <b>${v} ${t} por cada 1.000 habitantes</b>; en Cataluña, ${c}, y en España, ${e}.`,
      h_imp: (t, v, q, c, e) => `${q}, ${t} en la provincia era de <b>${v}</b>; en Cataluña, ${c}, y en España, ${e}.`,
      t: { not_her: "herencias", not_test: "testamentos", not_abint: "declaraciones de herederos sin testamento", not_don: "donaciones", not_pod: "poderes", not_hipv: "hipotecas para comprar vivienda", not_soc: "sociedades nuevas", not_pol: "pólizas de préstamo", not_seg: "segregaciones", not_hipv_imp: "la hipoteca media", not_soc_cap: "el capital medio de las sociedades nuevas" },
      h_hc: (q, a, b) => `${q}, en la provincia se firmaron <b>${a} hipotecas</b> y se cancelaron <b>${b}</b>.`,
      q12: (e) => `En los 12 meses hasta ${e}`, q4: (e) => `En los 4 trimestres hasta ${e}`,
      mesos: ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"],
    },
  };
  const tx = (k, ...a) => { const v = TX[LANG][k]; return typeof v === "function" ? v(...a) : v; };
  const MAPA = ["her", "test", "abint", "don", "pod", "hipv", "hipv_imp", "canc", "soc", "soc_cap", "pol", "seg", "sub"];
  const GRAF = ["not_her", "not_test", "not_abint", "not_don", "not_hipv", "not_hipv_imp", "not_hc", "not_soc", "not_soc_cap", "not_pod", "not_pol", "not_seg"];
  const eur = (v) => (v == null ? "–" : `${fmt(v)} €`);
  const f1 = (v) => fmt(v, v != null && v < 10 ? 2 : 1);
  // «al maig del 2026» / «mayo de 2026» / «al 2n trimestre del 2026» / «el 2.º trimestre de 2026»
  const periode = (e) => {
    const m = /^(\d{4})-(\d{2})$/.exec(e || ""); const q = /^(\d{4})T(\d)$/.exec(e || "");
    if (m) { const n = tx("mesos")[+m[2] - 1]; return LANG === "ca" ? `${/^[aeiou]/.test(n) ? "a l'" : "al "}${n} del ${m[1]}` : `${n} de ${m[1]}`; }
    if (q) return LANG === "ca" ? `al ${["1r", "2n", "3r", "4t"][+q[2] - 1]} trimestre del ${q[1]}` : `el ${q[2]}.º trimestre de ${q[1]}`;
    return e;
  };

  let X = null, carregant = null, mapa = null;
  const est = { ind: "her" };

  const css = (v) => getComputedStyle(document.documentElement).getPropertyValue(v).trim();
  const fosc = () => document.documentElement.dataset.theme === "dark" || (!document.documentElement.dataset.theme && matchMedia("(prefers-color-scheme: dark)").matches);
  const RAMPA = () => (fosc() ? ["#0d2b29", "#12433f", "#1b5d57", "#2b7a72", "#4b9a91", "#7dbbb2", "#b9ddd7"] : ["#e6f2ef", "#c3e2db", "#93cbc0", "#5aa9a0", "#2f8a80", "#14675f", "#00423f"]);
  function talls(vals, k = 7) {
    const s = vals.filter((v) => v != null && isFinite(v)).sort((a, b) => a - b);
    if (!s.length) return [];
    const r = (v) => { const a = Math.abs(v); const p = a >= 10000 ? 1000 : a >= 1000 ? 100 : a >= 100 ? 10 : a >= 10 ? 1 : a >= 1 ? 0.1 : 0.01; return Math.round(v / p) * p; };
    const t = []; for (let i = 1; i < k; i++) t.push(r(s[Math.floor((i / k) * (s.length - 1))]));
    return [...new Set(t)];
  }
  const colorDe = (v, t, rampa) => { if (v == null || !isFinite(v)) return null; let i = 0; while (i < t.length && v >= t[i]) i++; return rampa[Math.round((i * (rampa.length - 1)) / Math.max(1, t.length))]; };
  function llegenda(el, t, rampa, f) {
    const n = t.length + 1;
    el.innerHTML = `<div class="escala">${Array.from({ length: n }, (_, i) => `<i style="background:${rampa[Math.round((i * (rampa.length - 1)) / Math.max(1, t.length))]}"></i>`).join("")}</div>
      <div class="ticks">${t.map((v, i) => `<span style="left:${((i + 1) / n) * 100}%">${f(v)}</span>`).join("")}</div>`;
  }
  const barres = (files, f) => {
    const mx = Math.max(...files.map((x) => Math.abs(x[1] || 0))) || 1;
    return `<div class="pb">${files.map(([n, v, cls]) => `<div class="pb-fila"><span class="pb-nom">${n}</span><span class="pb-barres"><span class="pb-b"><b class="${cls}" style="width:${(Math.abs(v) / mx) * 100}%"></b><em>${f(v)}</em></span></span></div>`).join("")}</div>`;
  };
  const nomProv = (c) => (X.geo.features.find((x) => x.properties.c === c) || { properties: {} }).properties.n || c;
  const esImp = (k) => /_imp$|_cap$/.test(k);

  function creaMapa() {
    const id = "not-esp", cont = document.getElementById(id);
    if (!cont || !window.maplibregl || !X.geo) return null;
    const m = new maplibregl.Map({
      container: id, style: { version: 8, sources: {}, layers: [{ id: "fons", type: "background", paint: { "background-color": css("--paper") || "#fffefb" } }] },
      bounds: [[-13, 34.2], [4.4, 43.9]], fitBoundsOptions: { padding: 8 }, maxZoom: 7, renderWorldCopies: false,
      attributionControl: false, dragRotate: false, pitchWithRotate: false, cooperativeGestures: true,
    });
    m.touchZoomRotate.disableRotation();
    m.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    const o = { mapa: m, llest: false, pendent: null };
    m.on("load", () => {
      m.addSource("g", { type: "geojson", data: X.geo, promoteId: "c" });
      m.addLayer({ id: "f", type: "fill", source: "g", paint: { "fill-color": ["coalesce", ["feature-state", "col"], css("--sense") || "#e7e3da"] } });
      m.addLayer({ id: "l", type: "line", source: "g", paint: { "line-color": css("--paper") || "#fffefb", "line-width": 0.6 } });
      m.addLayer({ id: "s", type: "line", source: "g", filter: ["==", ["get", "c"], "17"], paint: { "line-color": css("--accent") || "#e3001b", "line-width": 2 } });
      o.llest = true;
      if (o.pendent) { o.pendent(); o.pendent = null; }
      m.on("mousemove", "f", (e) => {
        const c = e.features[0].properties.c, v = (X.prov[est.ind] || {})[c];
        m.getCanvas().style.cursor = "default";
        mostraTip(`<b>${nomProv(c)}</b><br>${v && v.v != null ? (esImp(est.ind) ? eur(v.v) : `${f1(v.v)} ${tx("per_mil")}<br>${fmt(v.n)} ${tx("actes")}`) : tx("sense")}`, e.originalEvent.clientX, e.originalEvent.clientY);
      });
      m.on("mouseleave", "f", amagaTip);
    });
    return o;
  }

  function pintaMapa() {
    const k = est.ind, P = X.prov[k] || {}, I = X.ind[k] || {};
    const vals = Object.fromEntries(Object.entries(P).filter(([c, v]) => c !== "ES" && v.v != null).map(([c, v]) => [c, v.v]));
    const t = talls(Object.values(vals)), rampa = RAMPA();
    const col = {}; Object.entries(vals).forEach(([c, v]) => { col[c] = colorDe(v, t, rampa); });
    if (!mapa) mapa = creaMapa();
    if (mapa) { const fes = () => X.geo.features.forEach((f) => mapa.mapa.setFeatureState({ source: "g", id: f.properties.c }, { col: col[f.properties.c] || null })); if (mapa.llest) fes(); else mapa.pendent = fes; }
    const f = esImp(k) ? (v) => (v >= 1000 ? `${fmt(v / 1000)} k€` : eur(v)) : f1;
    llegenda(document.getElementById("not-esp-lleg"), t, rampa, f);
    const ord = Object.entries(vals).sort((a, b) => b[1] - a[1]);
    const r = ord.findIndex((x) => x[0] === "17") + 1, n = ord.length;
    const [tit, u] = tx("ind")[k];
    document.getElementById("not-esp-tit").textContent = tit;
    document.getElementById("not-esp-u").textContent = `${u} · ${tx(I.freq === "t" ? "quatre" : "dotze")}`;
    document.getElementById("not-esp-h").innerHTML = r ? (esImp(k) ? tx("h_map_imp", r, n, eur(vals["17"])) : tx("h_map", r, n, f1(vals["17"]), tx("per_mil"))) + ` ${tx("ult", periode(I.ult))}` : "";
    const rq = ord.slice(0, 10).map(([c, v], i) => [`${i + 1}. ${c === "17" ? `<b>${nomProv(c)}</b>` : nomProv(c)}`, v, c === "17" ? "ex-gi" : "pg-bg-esp"]);
    if (r > 10) rq.push([`${r}. <b>${nomProv("17")}</b>`, vals["17"], "ex-gi"]);
    document.getElementById("not-esp-rq").innerHTML = barres(rq, esImp(k) ? eur : f1);
  }

  function controls() {
    const p = document.getElementById("not-esp-ctl");
    p.innerHTML = `<label class="ex-any"><span>${tx("ind_l")}</span><select id="not-ind">${MAPA.filter((k) => X.prov[k]).map((k) => `<option value="${k}"${k === est.ind ? " selected" : ""}>${tx("ind")[k][0]}</option>`).join("")}</select></label>`;
    p.querySelector("select").addEventListener("change", (e) => { est.ind = e.target.value; pintaMapa(); });
  }

  function xifres() {
    const x = X.x, el = document.getElementById("not-xifres");
    if (!el) return;
    const t = [];
    const per = (k, lab, nota) => { const o = x[k]; if (o) t.push(tile(tx(lab), f1(o.v), tx(nota, fmt(o.n), f1(o.cat), f1(o.es)))); };
    per("her", "x_her", "xn_her");
    per("test", "x_test", "xn_test");
    per("don", "x_don", "xn_don");
    if (x.hipv) t.push(tile(tx("x_hipv"), fmt(x.hipv.n), tx("xn_hipv", fmt(x.hipv.n), eur(x.hipv_imp && x.hipv_imp.v))));
    if (x.canc && x.hip) t.push(tile(tx("x_canc"), fmt(x.canc.n), tx("xn_canc", fmt(x.hip.n))));
    if (x.soc) t.push(tile(tx("x_soc"), fmt(x.soc.n), tx("xn_soc", eur(x.soc_cap && x.soc_cap.v))));
    el.innerHTML = t.join("");
  }

  // Gráficos con provincia.js: textos, titulares y series
  let pgFet = false;
  function preparaPG() {
    if (pgFet || !window.PG) return;
    pgFet = true;
    const txt = (L) => { const o = { not_hc_noms: TX[L].not_hc_noms, font_not: TX[L].font }; Object.entries(TX[L].g).forEach(([k, v]) => { o[k] = v; }); return o; };
    window.PG.textos(txt("ca"), txt("es"));
    window.PG.titular((id, sp) => {
      if (!/^not_/.test(id)) return null;
      const s = sp.series || {}, u = (k) => (s[k] && s[k].length ? s[k][s[k].length - 1] : null), g = u("gi"), c = u("cat"), e = u("esp");
      if (!g) return "";
      const q = (sp.freq === "t" ? tx("q4", periode(g[1])) : tx("q12", periode(g[1])));
      if (id === "not_hc") return tx("h_hc", q, fmt(g[2]), e ? fmt(e[2]) : "–");
      if (sp.u === "€") return tx("h_imp", tx("t")[id], eur(g[2]), q, c ? eur(c[2]) : "–", e ? eur(e[2]) : "–");
      return tx("h", tx("t")[id], f1(g[2]), q, c ? f1(c[2]) : "–", e ? f1(e[2]) : "–");
    });
  }
  function grafics() {
    preparaPG();
    if (!window.PG) return;
    const P = {};
    GRAF.forEach((id) => {
      const I = X.ind[id.slice(4)];
      if (!I) return;
      P[id] = { series: I.series, freq: I.freq, u: I.u === "€" ? "€" : "", dec: I.u === "€" || I.u === "n" ? 0 : 2, ...(I.noms ? { noms: I.noms } : {}), ...(I.u === "€" ? { zero: false } : {}) };
    });
    window.PG.pintaGrafics(document.getElementById("not-grafics"), P, GRAF, () => "font_not");
  }

  function pintaSeccio() {
    const sec = document.getElementById("s-not");
    if (!sec) return;
    if (!X) {
      if (!carregant) carregant = Promise.all([
        fetch("datos/notariado.json").then((r) => (r.ok ? r.json() : null)),
        fetch("datos/provincies.geojson").then((r) => (r.ok ? r.json() : null)),
      ]).then(([d, geo]) => {
        if (!d || !d.ind || !Object.keys(d.ind).length) { sec.hidden = true; return; }
        X = d; X.geo = geo;
        if (geo) geo.features = geo.features.filter((f) => X.prov.her && X.prov.her[f.properties.c]);
        pintaSeccio();
      }).catch(() => { sec.hidden = true; });
      return;
    }
    document.getElementById("not-nd").textContent = tx("nd");
    document.querySelectorAll("#s-not .not-font").forEach((e) => { e.textContent = tx("font_p", X.pob_any || ""); });
    xifres();
    controls();
    if (X.geo) pintaMapa();
    grafics();
  }
  window.pintaSeccioNotariado = pintaSeccio;
})();
