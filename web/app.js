"use strict";

// ---------- Textos ----------
const T = {
  ca: {
    marca: "Girona en dades",
    titol: "Habitatge i renda a la província de Girona",
    entradeta: "Lloguers, compravendes, pisos turístics i renda de les llars, municipi a municipi, amb dades oficials que s'actualitzen cada setmana.",
    h_prov: "La província en xifres",
    h_evol: "Com ha evolucionat",
    g_lloguer: "Lloguer mitjà mensual",
    g_compra: "Compravendes d'habitatges",
    g_renda: "Renda neta mitjana per persona",
    u_operacions: "operacions per any",
    u_euros_any: "€/any",
    h_mun: "Municipi a municipi",
    ajuda_taula: "Toca una capçalera per ordenar i una fila per veure la fitxa del municipi.",
    cerca: "Cerca un municipi",
    cerca_ph: "Cerca un municipi o comarca",
    comptador: (n, t) => `${n} de ${t} municipis`,
    h_fonts: "Fonts",
    f_lloguer: "lloguer mitjà a partir de les fiances",
    f_compra: "compravendes d'habitatges",
    f_renda: "renda neta i índex de Gini",
    f_hut: "habitatges d'ús turístic",
    f_cat: "habitatges i any de construcció",
    f_xifra: "població",
    actualitzat: "Dades generades el",
    codi: "Codi i dades a GitHub",
    k_lloguer: "Lloguer mitjà",
    k_compra: "Compravendes",
    k_renda: "Renda neta per persona",
    k_esforc: "Esforç del lloguer",
    k_hut: "Habitatges d'ús turístic",
    k_antics: "Habitatges anteriors a 1980",
    k_pob: "Població",
    n_vs: (a) => `respecte a ${a}`,
    n_esforc: "del que ingressa una llar mitjana",
    n_hut: (x) => `${x} per cada 100 habitatges`,
    n_antics: "segons el Cadastre",
    n_estacional: (x) => `${x} de població estacional (ETCA)`,
    c_municipi: "Municipi", c_comarca: "Comarca", c_pob: "Població",
    c_lloguer: "Lloguer 2025 (€/mes)", c_var5: "Lloguer, variació en 5 anys",
    c_renda: "Renda per persona 2024 (€)", c_esforc: "Esforç lloguer (% renda llar)",
    c_compra: "Compravendes 2025", c_hut: "HUT per 100 habitatges",
    municipi: "Municipi", provincia: "Província",
    tanca: "Tanca",
    sense: "Sense dades: el municipi té massa pocs contractes o operacions per publicar-les.",
    sub: (c, p) => `${c} · ${p} habitants`,
  },
  es: {
    marca: "Girona en datos",
    titol: "Vivienda y renta en la provincia de Girona",
    entradeta: "Alquileres, compraventas, pisos turísticos y renta de los hogares, municipio a municipio, con datos oficiales que se actualizan cada semana.",
    h_prov: "La provincia en cifras",
    h_evol: "Cómo ha evolucionado",
    g_lloguer: "Alquiler medio mensual",
    g_compra: "Compraventas de viviendas",
    g_renda: "Renta neta media por persona",
    u_operacions: "operaciones por año",
    u_euros_any: "€/año",
    h_mun: "Municipio a municipio",
    ajuda_taula: "Toca una cabecera para ordenar y una fila para ver la ficha del municipio.",
    cerca: "Busca un municipio",
    cerca_ph: "Busca un municipio o comarca",
    comptador: (n, t) => `${n} de ${t} municipios`,
    h_fonts: "Fuentes",
    f_lloguer: "alquiler medio a partir de las fianzas",
    f_compra: "compraventas de viviendas",
    f_renda: "renta neta e índice de Gini",
    f_hut: "viviendas de uso turístico",
    f_cat: "viviendas y año de construcción",
    f_xifra: "población",
    actualitzat: "Datos generados el",
    codi: "Código y datos en GitHub",
    k_lloguer: "Alquiler medio",
    k_compra: "Compraventas",
    k_renda: "Renta neta por persona",
    k_esforc: "Esfuerzo del alquiler",
    k_hut: "Viviendas de uso turístico",
    k_antics: "Viviendas anteriores a 1980",
    k_pob: "Población",
    n_vs: (a) => `respecto a ${a}`,
    n_esforc: "de lo que ingresa un hogar medio",
    n_hut: (x) => `${x} por cada 100 viviendas`,
    n_antics: "según el Catastro",
    n_estacional: (x) => `${x} de población estacional (ETCA)`,
    c_municipi: "Municipio", c_comarca: "Comarca", c_pob: "Población",
    c_lloguer: "Alquiler 2025 (€/mes)", c_var5: "Alquiler, variación en 5 años",
    c_renda: "Renta por persona 2024 (€)", c_esforc: "Esfuerzo alquiler (% renta hogar)",
    c_compra: "Compraventas 2025", c_hut: "VUT por 100 viviendas",
    municipi: "Municipio", provincia: "Provincia",
    tanca: "Cerrar",
    sense: "Sin datos: el municipio tiene demasiado pocos contratos u operaciones para publicarlas.",
    sub: (c, p) => `${c} · ${p} habitantes`,
  },
};

let LANG = "ca";
try {
  const q = new URLSearchParams(location.search).get("lang");
  const guardat = localStorage.getItem("lang");
  LANG = ["ca", "es"].includes(q) ? q : ["ca", "es"].includes(guardat) ? guardat : ((navigator.language || "").startsWith("es") ? "es" : "ca");
} catch (e) { /* sin almacenamiento */ }
const t = (k, ...a) => { const v = T[LANG][k]; return typeof v === "function" ? v(...a) : v; };

// ---------- Formato ----------
const loc = () => (LANG === "ca" ? "ca-ES" : "es-ES");
const fmt = (v, d = 0) => (v == null || isNaN(v) ? "–" : v.toLocaleString(loc(), { maximumFractionDigits: d, minimumFractionDigits: d }));
const pct = (v, d = 1, signe = false) => (v == null || isNaN(v) ? "–" : (signe && v > 0 ? "+" : "") + fmt(v, d) + " %");
const ultim = (o) => { const k = Object.keys(o || {}).sort(); return k.length ? [k[k.length - 1], o[k[k.length - 1]]] : [null, null]; };
const val = (o, a) => (o && o[a] != null ? o[a] : null);

// ---------- Estado ----------
let D = null;
let orden = { col: "pob", dir: -1 };
let seleccionat = null;

const COLS = [
  { id: "nom", t: "c_municipi", v: (m) => m.nom, txt: true },
  { id: "comarca", t: "c_comarca", v: (m) => m.comarca, txt: true },
  { id: "pob", t: "c_pob", v: (m) => m.poblacion, f: (v) => fmt(v), barra: true },
  { id: "lloguer", t: "c_lloguer", v: (m) => val(m.alquiler, "2025"), f: (v) => fmt(v), barra: true },
  { id: "var5", t: "c_var5", v: (m) => { const a = val(m.alquiler, "2025"), b = val(m.alquiler, "2020"); return a && b ? (a / b - 1) * 100 : null; }, f: (v) => pct(v, 0, true) },
  { id: "renda", t: "c_renda", v: (m) => val(m.renta_persona, "2024"), f: (v) => fmt(v), barra: true },
  { id: "esforc", t: "c_esforc", v: (m) => esforc(m), f: (v) => pct(v, 0) },
  { id: "compra", t: "c_compra", v: (m) => val(m.compraventas, "2025"), f: (v) => fmt(v) },
  { id: "hut", t: "c_hut", v: (m) => (m.viviendas ? (m.hut / m.viviendas) * 100 : null), f: (v) => fmt(v, 1), barra: true },
];

function esforc(m) {
  const ll = val(m.alquiler, "2024"), rh = val(m.renta_hogar, "2024");
  return ll && rh ? (ll * 12 / rh) * 100 : null;
}

// ---------- Textos estáticos ----------
function aplicaIdioma() {
  document.documentElement.lang = LANG;
  document.title = t("marca");
  document.querySelectorAll("[data-t]").forEach((el) => { el.textContent = t(el.dataset.t); });
  document.querySelectorAll("[data-tp]").forEach((el) => { el.placeholder = t(el.dataset.tp); });
  document.querySelectorAll(".idiomes button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.lang === LANG)));
}

// ---------- Tooltip ----------
const tip = document.getElementById("tip");
function mostraTip(html, x, y) {
  tip.innerHTML = html; tip.hidden = false;
  const r = tip.getBoundingClientRect();
  let left = x + 14, top = y - r.height - 10;
  if (left + r.width > innerWidth - 8) left = x - r.width - 14;
  if (top < 8) top = y + 16;
  tip.style.left = left + "px"; tip.style.top = top + "px";
}
const amagaTip = () => { tip.hidden = true; };

// ---------- Gráficos SVG ----------
const NS = "http://www.w3.org/2000/svg";
function el(tag, attrs = {}, pare) {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  if (pare) pare.appendChild(e);
  return e;
}
function escala(d0, d1, r0, r1) { return (v) => r0 + ((v - d0) / (d1 - d0 || 1)) * (r1 - r0); }
function niceMax(v) {
  if (v <= 0) return 1;
  const p = Math.pow(10, Math.floor(Math.log10(v))), n = v / p;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * p;
}

function divisions(max) {
  const lead = max / Math.pow(10, Math.floor(Math.log10(max)));
  return lead === 2.5 || lead === 5 ? 5 : 4;
}

/** Línea: series = [{nom, color, dades:{any:valor}}] */
function grafLinia(cont, series, f = (v) => fmt(v)) {
  cont.innerHTML = "";
  const W = Math.max(300, Math.min(720, cont.clientWidth || 560)), H = W < 440 ? 220 : 260, m = { t: 12, r: 16, b: 28, l: 52 };
  const anys = [...new Set(series.flatMap((s) => Object.keys(s.dades)))].map(Number).sort((a, b) => a - b);
  if (!anys.length) { cont.textContent = t("sense"); return; }
  const max = niceMax(Math.max(...series.flatMap((s) => Object.values(s.dades))));
  const x = escala(anys[0], anys[anys.length - 1], m.l, W - m.r);
  const y = escala(0, max, H - m.b, m.t);
  const svg = el("svg", { viewBox: `0 0 ${W} ${H}`, role: "img" }, cont);
  const g = el("g", { class: "graella" }, svg);
  const ax = el("g", { class: "eix" }, svg);
  const div = divisions(max);
  for (let i = 0; i <= div; i++) {
    const v = (max / div) * i, yy = y(v);
    if (i) el("line", { x1: m.l, x2: W - m.r, y1: yy, y2: yy }, g);
    el("text", { x: m.l - 8, y: yy + 4, "text-anchor": "end" }, ax).textContent = fmt(v);
  }
  el("line", { class: "base", x1: m.l, x2: W - m.r, y1: H - m.b, y2: H - m.b }, svg);
  const pas = Math.ceil(anys.length / (W < 440 ? 4 : 7));
  anys.forEach((a, i) => { if (i % pas === 0 || (i === anys.length - 1 && (anys.length - 1) % pas >= pas / 2)) el("text", { x: x(a), y: H - 8, "text-anchor": "middle" }, ax).textContent = a; });
  series.forEach((s) => {
    const pts = anys.filter((a) => s.dades[a] != null).map((a) => `${x(a)},${y(s.dades[a])}`);
    el("polyline", { points: pts.join(" "), fill: "none", stroke: s.color, "stroke-width": 2, "stroke-linejoin": "round", "stroke-linecap": "round" }, svg);
  });
  // Etiqueta directa del último valor de cada serie
  series.forEach((s) => {
    const [a, v] = ultim(s.dades); if (a == null) return;
    el("circle", { cx: x(+a), cy: y(v), r: 4, fill: s.color, stroke: "var(--fons)", "stroke-width": 2 }, svg);
  });
  // Capa de hover
  const guia = el("line", { y1: m.t, y2: H - m.b, stroke: "var(--text-3)", "stroke-dasharray": "3 3", visibility: "hidden" }, svg);
  const punts = series.map((s) => el("circle", { r: 4, fill: s.color, stroke: "var(--fons)", "stroke-width": 2, visibility: "hidden" }, svg));
  const zona = el("rect", { x: m.l, y: m.t, width: W - m.l - m.r, height: H - m.t - m.b, fill: "transparent" }, svg);
  const mou = (ev) => {
    const r = svg.getBoundingClientRect();
    const px = ((ev.clientX - r.left) / r.width) * W;
    const a = anys.reduce((b, c) => (Math.abs(x(c) - px) < Math.abs(x(b) - px) ? c : b));
    guia.setAttribute("x1", x(a)); guia.setAttribute("x2", x(a)); guia.setAttribute("visibility", "visible");
    let html = `<b>${a}</b>`;
    series.forEach((s, i) => {
      const v = s.dades[a];
      if (v != null) { punts[i].setAttribute("cx", x(a)); punts[i].setAttribute("cy", y(v)); punts[i].setAttribute("visibility", "visible"); }
      else punts[i].setAttribute("visibility", "hidden");
      html += `<br>${s.nom}: ${f(v)}`;
    });
    mostraTip(html, ev.clientX, ev.clientY);
  };
  zona.addEventListener("pointermove", mou);
  zona.addEventListener("pointerleave", () => { amagaTip(); guia.setAttribute("visibility", "hidden"); punts.forEach((p) => p.setAttribute("visibility", "hidden")); });
  if (series.length > 1) {
    const ll = document.createElement("div"); ll.className = "llegenda";
    ll.innerHTML = series.map((s) => `<span><i style="background:${s.color}"></i>${s.nom}</span>`).join("");
    cont.appendChild(ll);
  }
}

/** Barras verticales: dades = {any: valor} */
function grafBarres(cont, dades, f = (v) => fmt(v)) {
  cont.innerHTML = "";
  const anys = Object.keys(dades).map(Number).sort((a, b) => a - b);
  if (!anys.length) { cont.textContent = t("sense"); return; }
  const W = Math.max(300, Math.min(720, cont.clientWidth || 560)), H = W < 440 ? 220 : 260, m = { t: 12, r: 8, b: 28, l: 52 };
  const max = niceMax(Math.max(...Object.values(dades)));
  const banda = (W - m.l - m.r) / anys.length, amp = Math.max(2, banda - 2);
  const y = escala(0, max, H - m.b, m.t);
  const svg = el("svg", { viewBox: `0 0 ${W} ${H}`, role: "img" }, cont);
  const g = el("g", { class: "graella" }, svg), ax = el("g", { class: "eix" }, svg);
  const div = divisions(max);
  for (let i = 0; i <= div; i++) {
    const v = (max / div) * i, yy = y(v);
    if (i) el("line", { x1: m.l, x2: W - m.r, y1: yy, y2: yy }, g);
    el("text", { x: m.l - 8, y: yy + 4, "text-anchor": "end" }, ax).textContent = fmt(v);
  }
  const pas = Math.ceil(anys.length / (W < 440 ? 4 : 7));
  const etiqueta = (i) => i % pas === 0 || (i === anys.length - 1 && (anys.length - 1) % pas >= pas / 2);
  anys.forEach((a, i) => {
    const v = dades[a], x0 = m.l + i * banda + 1, yy = y(v), h = H - m.b - yy;
    const rad = Math.min(4, amp / 2, h);
    // Barra con esquinas superiores redondeadas, anclada a la base
    el("path", { d: `M${x0},${H - m.b}V${yy + rad}Q${x0},${yy} ${x0 + rad},${yy}H${x0 + amp - rad}Q${x0 + amp},${yy} ${x0 + amp},${yy + rad}V${H - m.b}Z`, fill: "var(--barra)" }, svg);
    if (etiqueta(i)) el("text", { x: x0 + amp / 2, y: H - 8, "text-anchor": "middle" }, ax).textContent = a;
    const hit = el("rect", { x: m.l + i * banda, y: m.t, width: banda, height: H - m.t - m.b, fill: "transparent" }, svg);
    hit.addEventListener("pointermove", (ev) => mostraTip(`<b>${a}</b><br>${f(v)}`, ev.clientX, ev.clientY));
    hit.addEventListener("pointerleave", amagaTip);
  });
  el("line", { class: "base", x1: m.l, x2: W - m.r, y1: H - m.b, y2: H - m.b }, svg);
}

// ---------- Cifras ----------
function tile(etiqueta, valor, nota = "") {
  return `<div class="xifra"><p class="etiqueta">${etiqueta}</p><p class="valor">${valor}</p>${nota ? `<p class="nota">${nota}</p>` : ""}</div>`;
}
function variacio(o, a, b, colorea = false) {
  const va = val(o, a), vb = val(o, b);
  if (va == null || vb == null) return "";
  const v = (va / vb - 1) * 100;
  const cls = colorea ? (v > 0 ? "puja" : "baixa") : "";
  return `<span class="${cls}">${pct(v, 1, true)}</span> ${t("n_vs", b)}`;
}

function pintaProvincia() {
  const p = D.provincia;
  const ll = val(p.alquiler, "2025"), rh = mitjanaRendaLlar();
  const esf = ll && rh ? (val(p.alquiler, "2024") * 12 / rh) * 100 : null;
  document.getElementById("xifres").innerHTML = [
    tile(`${t("k_lloguer")} 2025`, `${fmt(ll)} <small>€/mes</small>`, variacio(p.alquiler, "2025", "2024", true)),
    tile(`${t("k_compra")} 2025`, fmt(val(p.compraventas, "2025")), variacio(p.compraventas, "2025", "2024")),
    tile(`${t("k_renda")} 2024`, `${fmt(val(p.renta_persona, "2024"))} <small>€</small>`, variacio(p.renta_persona, "2024", "2023")),
    tile(`${t("k_esforc")} 2024`, pct(esf, 0), t("n_esforc")),
    tile(t("k_hut"), fmt(p.hut), t("n_hut", fmt((p.hut / p.viviendas) * 100, 1))),
    tile(t("k_antics"), pct((p.viv_antes_1980 / p.viviendas) * 100, 0), t("n_antics")),
  ].join("");
  grafLinia(document.getElementById("g-lloguer"), [{ nom: t("provincia"), color: "var(--serie-1)", dades: p.alquiler }], (v) => `${fmt(v)} €`);
  grafBarres(document.getElementById("g-compra"), p.compraventas);
}

function mitjanaRendaLlar() {
  // Renta media por hogar de la provincia, ponderada por población (2024)
  let s = 0, n = 0;
  D.municipios.forEach((m) => { const v = val(m.renta_hogar, "2024"); if (v && m.poblacion) { s += v * m.poblacion; n += m.poblacion; } });
  return n ? s / n : null;
}

// ---------- Tabla ----------
function pintaTaula() {
  const cap = document.querySelector("#taula thead tr");
  cap.innerHTML = COLS.map((c) => `<th scope="col" data-col="${c.id}" tabindex="0" aria-sort="${orden.col === c.id ? (orden.dir > 0 ? "ascending" : "descending") : "none"}">${t(c.t)}</th>`).join("");
  cap.querySelectorAll("th").forEach((th) => {
    const canvia = () => {
      const c = th.dataset.col;
      orden = orden.col === c ? { col: c, dir: -orden.dir } : { col: c, dir: COLS.find((x) => x.id === c).txt ? 1 : -1 };
      pintaTaula();
    };
    th.addEventListener("click", canvia);
    th.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); canvia(); } });
  });
  const q = (document.getElementById("cerca").value || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  const norm = (s) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  const col = COLS.find((c) => c.id === orden.col);
  const files = D.municipios.filter((m) => !q || norm(m.nom).includes(q) || norm(m.comarca).includes(q));
  files.sort((a, b) => {
    const va = col.v(a), vb = col.v(b);
    if (va == null) return 1; if (vb == null) return -1;
    return (col.txt ? String(va).localeCompare(String(vb), loc()) : va - vb) * orden.dir;
  });
  const maxs = {};
  COLS.filter((c) => c.barra).forEach((c) => { maxs[c.id] = Math.max(...D.municipios.map((m) => c.v(m) || 0)); });
  document.querySelector("#taula tbody").innerHTML = files.map((m) => {
    const cel = COLS.map((c) => {
      const v = c.v(m);
      if (c.txt) return `<td class="${c.id === "nom" ? "nom" : ""}">${v}</td>`;
      if (v == null) return `<td class="buit">–</td>`;
      const b = c.barra ? `<span class="barra" style="width:${Math.max(2, (v / maxs[c.id]) * 48)}px"></span>` : "";
      return `<td>${b}${c.f(v)}</td>`;
    }).join("");
    return `<tr tabindex="0" data-ine="${m.ine}">${cel}</tr>`;
  }).join("");
  document.getElementById("comptador").textContent = t("comptador", files.length, D.municipios.length);
  document.querySelectorAll("#taula tbody tr").forEach((tr) => {
    const obre = () => obreFitxa(tr.dataset.ine, true);
    tr.addEventListener("click", obre);
    tr.addEventListener("keydown", (e) => { if (e.key === "Enter") obre(); });
  });
}

// ---------- Ficha ----------
function obreFitxa(ine, desplaca) {
  const m = D.municipios.find((x) => x.ine === ine);
  if (!m) return;
  seleccionat = ine;
  try { history.replaceState(null, "", `#${ine}`); } catch (e) { /* */ }
  const f = document.getElementById("fitxa");
  const [aR, vR] = ultim(m.renta_persona);
  const esf = esforc(m);
  const [aG, vG] = ultim(m.gini);
  f.hidden = false;
  f.innerHTML = `
    <button type="button" class="tanca">${t("tanca")}</button>
    <h2>${m.nom}</h2>
    <p class="sub">${t("sub", m.comarca, fmt(m.poblacion))}</p>
    <div class="xifres">
      ${tile(`${t("k_lloguer")} 2025`, val(m.alquiler, "2025") ? `${fmt(val(m.alquiler, "2025"))} <small>€/mes</small>` : "–", variacio(m.alquiler, "2025", "2024", true))}
      ${tile(`${t("k_compra")} 2025`, fmt(val(m.compraventas, "2025")), variacio(m.compraventas, "2025", "2024"))}
      ${tile(`${t("k_renda")} ${aR || ""}`, vR ? `${fmt(vR)} <small>€</small>` : "–", aG ? `Gini ${fmt(vG, 1)}` : "")}
      ${tile(`${t("k_esforc")} 2024`, pct(esf, 0), esf ? t("n_esforc") : "")}
      ${tile(t("k_hut"), fmt(m.hut), m.viviendas ? t("n_hut", fmt((m.hut / m.viviendas) * 100, 1)) : "")}
      ${tile(t("k_antics"), m.viviendas ? pct((m.viv_antes_1980 / m.viviendas) * 100, 0) : "–", m.poblacion_etca ? t("n_estacional", fmt(m.poblacion_etca)) : t("n_antics"))}
    </div>
    <div class="dos">
      <figure class="grafic"><figcaption>${t("g_lloguer")} <span class="unitat">€/mes</span></figcaption><div class="g-ll"></div></figure>
      <figure class="grafic"><figcaption>${t("g_renda")} <span class="unitat">${t("u_euros_any")}</span></figcaption><div class="g-re"></div></figure>
      <figure class="grafic"><figcaption>${t("g_compra")} <span class="unitat">${t("u_operacions")}</span></figcaption><div class="g-cv"></div></figure>
    </div>`;
  f.querySelector(".tanca").addEventListener("click", () => { f.hidden = true; seleccionat = null; try { history.replaceState(null, "", location.pathname + location.search); } catch (e) { /* */ } });
  grafLinia(f.querySelector(".g-ll"), [
    { nom: m.nom, color: "var(--serie-1)", dades: m.alquiler },
    { nom: t("provincia"), color: "var(--serie-2)", dades: D.provincia.alquiler },
  ], (v) => `${fmt(v)} €`);
  grafLinia(f.querySelector(".g-re"), [
    { nom: m.nom, color: "var(--serie-1)", dades: m.renta_persona },
    { nom: t("provincia"), color: "var(--serie-2)", dades: D.provincia.renta_persona },
  ], (v) => `${fmt(v)} €`);
  grafBarres(f.querySelector(".g-cv"), m.compraventas);
  if (desplaca) f.scrollIntoView({ behavior: "smooth", block: "start" });
}

// ---------- Inicio ----------
function pintaTot() {
  aplicaIdioma();
  pintaProvincia();
  pintaTaula();
  document.getElementById("data-gen").textContent = new Date(D.generado).toLocaleDateString(loc(), { day: "numeric", month: "long", year: "numeric" });
  if (seleccionat) obreFitxa(seleccionat, false);
}

document.querySelectorAll(".idiomes button").forEach((b) => b.addEventListener("click", () => {
  LANG = b.dataset.lang;
  try { localStorage.setItem("lang", LANG); } catch (e) { /* */ }
  pintaTot();
}));
document.getElementById("cerca").addEventListener("input", () => pintaTaula());
let ampleAnterior = innerWidth;
addEventListener("resize", () => {
  if (!D || Math.abs(innerWidth - ampleAnterior) < 40) return;
  ampleAnterior = innerWidth;
  pintaProvincia();
  if (seleccionat) obreFitxa(seleccionat, false);
});

aplicaIdioma();
fetch("datos/municipios.json").then((r) => r.json()).then((d) => {
  D = d;
  const h = location.hash.slice(1);
  if (/^\d{5}$/.test(h)) seleccionat = h;
  pintaTot();
  if (seleccionat) obreFitxa(seleccionat, true);
});
