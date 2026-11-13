"use strict";
/* Mapa coroplético interactivo (MapLibre) por municipio y sección censal.
   Usa las variables globales de app.js: D, t, fmt, pct, val, esforc, mostraTip, amagaTip, obreFitxa, LANG. */

(function () {
  // Escala secuencial de un solo tono (azul tinta), de claro a oscuro; en modo oscuro se invierte la luminosidad.
  const RAMPA_CLAR = ["#e3ecf5", "#bccfe4", "#8fb0d2", "#6390bf", "#3d6fa6", "#244f85", "#13335f"];
  const RAMPA_FOSC = ["#1c2a3d", "#213c5e", "#29517f", "#35699f", "#4c84bd", "#74a4d6", "#aacaec"];
  const fosc = () => matchMedia("(prefers-color-scheme: dark)").matches && document.documentElement.dataset.theme !== "light";
  const rampa = () => (fosc() ? RAMPA_FOSC : RAMPA_CLAR);
  const sense = () => (fosc() ? "#24272c" : "#e7e3da");
  const css = (v) => getComputedStyle(document.documentElement).getPropertyValue(v).trim();

  const eur = (v) => `${fmt(v)} €`;
  // f: valor completo; c: valor corto para la escala; g: grupo del selector
  const IND = [
    { id: "renda", g: "g_ren", x: "x_renda", t: "i_renda", v: (m) => val(m.renta_persona, "2024"), s: (x) => x.renta_persona, f: eur, c: (v) => fmt(v) },
    { id: "renda_llar", g: "g_ren", x: "x_renda_llar", t: "i_renda_llar", v: (m) => val(m.renta_hogar, "2024"), s: (x) => x.renta_hogar, f: eur, c: (v) => fmt(v) },
    { id: "gini", g: "g_ren", x: "x_gini", t: "i_gini", v: (m) => val(m.gini, "2024"), s: (x) => x.gini, f: (v) => fmt(v, 1), c: (v) => fmt(v, 0) },
    { id: "lloguer", g: "g_hab", x: "x_lloguer", t: "i_lloguer", v: (m) => val(m.alquiler, "2025"), f: eur, c: (v) => fmt(v) },
    { id: "var5", g: "g_hab", x: "x_var5", t: "i_var5", v: (m) => { const a = val(m.alquiler, "2025"), b = val(m.alquiler, "2020"); return a && b ? (a / b - 1) * 100 : null; }, f: (v) => pct(v, 0, true), c: (v) => pct(v, 0, true) },
    { id: "esforc", g: "g_hab", x: "x_esforc", t: "i_esforc", v: (m) => esforc(m), f: (v) => pct(v, 0), c: (v) => pct(v, 0) },
    { id: "compra", g: "g_hab", x: "x_compra", t: "i_compra", v: (m) => (val(m.compraventas, "2025") != null && m.poblacion ? (m.compraventas["2025"] / m.poblacion) * 1000 : null), f: (v) => fmt(v, 1), c: (v) => fmt(v, 0) },
    { id: "hut", g: "g_hab", x: "x_hut", t: "i_hut", v: (m) => (m.viviendas ? (m.hut / m.viviendas) * 100 : null), f: (v) => fmt(v, 1), c: (v) => fmt(v, 0) },
    { id: "antics", g: "g_parc", x: "x_antics", t: "i_antics", v: (m) => (m.viviendas ? (m.viv_antes_1980 / m.viviendas) * 100 : null), s: (x) => (x.viviendas ? (x.viv_antes_1980 / x.viviendas) * 100 : null), f: (v) => pct(v, 0), c: (v) => pct(v, 0) },
    { id: "nous", g: "g_parc", x: "x_nous", t: "i_nous", v: null, s: (x) => (x.viviendas ? (x.viv_post_2000 / x.viviendas) * 100 : null), f: (v) => pct(v, 0), c: (v) => pct(v, 0) },
    { id: "estacional", g: "g_pob", x: "x_estacional", t: "i_estacional", v: (m) => (m.poblacion && m.poblacion_etca ? (m.poblacion_etca / m.poblacion) * 100 : null), f: (v) => pct(v, 0), c: (v) => pct(v, 0) },
    { id: "pob", g: "g_pob", x: "x_pob", t: "i_pob", v: (m) => m.poblacion, f: (v) => fmt(v), c: (v) => fmt(v) },
  ];
  // Municipios que se rotulan en el mapa (capitales de comarca y grandes poblaciones)
  const ROTULS = ["Girona", "Figueres", "Olot", "Ripoll", "Puigcerdà", "Banyoles", "la Bisbal d'Empordà", "Santa Coloma de Farners", "Blanes", "Lloret de Mar", "Palamós", "Roses", "Sant Feliu de Guíxols"];
  const ROTULS_MOBIL = ["Girona", "Figueres", "Olot", "Ripoll", "Puigcerdà", "Blanes", "Palamós"];

  let mapa = null, geoMun = null, geoSec = null, SEC = {}, nivell = "mun", ind = IND[0], llindars = [];
  let hoverId = null, munPerIne = {}, valorsActuals = [], fixat = null;

  const disponible = (i, n) => (n === "mun" ? !!i.v : !!i.s);

  // Cortes por cuantiles, redondeados a una cifra "limpia" para que la leyenda se lea bien
  function quantils(valors) {
    const v = valors.filter((x) => x != null && isFinite(x)).sort((a, b) => a - b);
    if (v.length < 2) return [];
    const k = RAMPA_CLAR.length, rang = v[v.length - 1] - v[0];
    const pas = rang > 0 ? Math.pow(10, Math.floor(Math.log10(rang))) / 10 : 1;
    const res = [];
    for (let i = 1; i < k; i++) {
      const q = +(Math.round(v[Math.floor((i / k) * (v.length - 1))] / pas) * pas).toPrecision(12);
      if (q > v[0] && q <= v[v.length - 1] && !res.includes(q)) res.push(q);
    }
    return res;
  }
  const colorClasse = (c, n) => rampa()[Math.round((c * (rampa().length - 1)) / Math.max(1, n - 1))];
  const classe = (v) => { if (v == null || !isFinite(v)) return -1; let i = 0; while (i < llindars.length && v >= llindars[i]) i++; return i; };

  function valorDe(props) {
    if (nivell === "mun") { const m = munPerIne[props.ine]; return m ? ind.v(m) : null; }
    const x = SEC[props.cusec]; return x ? ind.s(x) : null;
  }
  const codiSec = (p) => `${p.cusec.slice(5, 7)}-${p.cusec.slice(7)}`;
  const nomZona = (p) => {
    const m = munPerIne[p.ine], nom = m ? m.nom : p.ine;
    return nivell === "sec" ? { nom, lloc: `${t("seccio")} ${codiSec(p)}` } : { nom, lloc: m ? m.comarca : "" };
  };

  function pinta() {
    const geo = nivell === "mun" ? geoMun : geoSec;
    const valors = geo.features.map((f) => valorDe(f.properties));
    llindars = quantils(valors);
    const n = llindars.length + 1;
    geo.features.forEach((f, i) => {
      const c = classe(valors[i]);
      f.properties.c = c < 0 ? sense() : colorClasse(c, n);
      f.properties.v = valors[i];
    });
    valorsActuals = geo.features.map((f, i) => ({ p: f.properties, v: valors[i] })).filter((x) => x.v != null && isFinite(x.v)).sort((a, b) => b.v - a.v);
    const src = mapa.getSource("zones");
    if (!src) return;
    src.setData(geo);
    mapa.setLayoutProperty("limits-mun", "visibility", nivell === "sec" ? "visible" : "none");
    document.getElementById("ind-titol").textContent = t(ind.t);
    document.getElementById("mapa-desc").textContent = !disponible(ind, "sec") ? t("nomes_mun") : "";
    llegenda(); ranquing(); info(fixat);
  }

  function llegenda() {
    const el = document.getElementById("llegenda");
    if (!valorsActuals.length) { el.innerHTML = ""; return; }
    const n = llindars.length + 1;
    const mx = valorsActuals[0].v, mn = valorsActuals[valorsActuals.length - 1].v;
    let html = `<div class="escala">${Array.from({ length: n }, (_, i) => `<i style="background:${colorClasse(i, n)}"></i>`).join("")}</div>`;
    const ticks = [[0, ind.c(mn)], ...llindars.map((l, i) => [((i + 1) / n) * 100, ind.c(l)]), [100, ind.c(mx)]];
    // Si no cabe, se muestran solo los cortes alternos
    // Se descartan las etiquetas que se solaparían (ancho estimado por carácter)
    const ample = el.clientWidth || 280, w = (s) => String(s).length * 6.4;
    const mostra = [];
    ticks.forEach((tk, i) => {
      const x = (tk[0] / 100) * ample, ini = i === 0 ? x : i === ticks.length - 1 ? x - w(tk[1]) : x - w(tk[1]) / 2;
      while (mostra.length > 1 && i === ticks.length - 1 && mostra[mostra.length - 1].fi + 8 > ini) mostra.pop();
      if (!mostra.length || mostra[mostra.length - 1].fi + 8 <= ini) mostra.push({ tk, fi: ini + w(tk[1]), tr: i === 0 ? "none" : i === ticks.length - 1 ? "translateX(-100%)" : "translateX(-50%)" });
    });
    html += `<div class="ticks">${mostra.map(({ tk: [x, txt], tr }) => `<span style="left:${x}%;transform:${tr}">${txt}</span>`).join("")}</div>`;
    html += `<div class="nd" style="--sense:${sense()}"><i></i>${t("sense_dades")}</div>`;
    el.innerHTML = html;
  }

  function ranquing() {
    const el = document.getElementById("ranquing");
    const fila = (x) => { const z = nomZona(x.p); return `<li data-ine="${x.p.ine}" title="${z.nom}"><span>${z.nom}${nivell === "sec" ? ` · ${codiSec(x.p)}` : ""}</span><span>${ind.c(x.v)}</span></li>`; };
    const alts = valorsActuals.slice(0, 5), baixos = valorsActuals.slice(-5).reverse();
    el.innerHTML = `<div><h4>${t("r_alts")}</h4><ol>${alts.map(fila).join("")}</ol></div><div><h4>${t("r_baixos")}</h4><ol>${baixos.map(fila).join("")}</ol></div>`;
    el.querySelectorAll("li").forEach((li) => li.addEventListener("click", () => obreFitxa(li.dataset.ine, true)));
  }

  function info(props) {
    const el = document.getElementById("info");
    if (!props) { el.innerHTML = `<p class="pista">${t("pista")}</p>`; return; }
    const z = nomZona(props), v = valorDe(props);
    const pos = v == null ? -1 : valorsActuals.findIndex((x) => x.v <= v);
    const med = valorsActuals.length ? valorsActuals[Math.floor(valorsActuals.length / 2)].v : null;
    el.innerHTML = `<p class="nom">${z.nom}</p><p class="lloc">${z.lloc}</p>
      <p class="gran">${v == null ? "–" : ind.f(v)}</p>
      <p class="rel">${v == null ? t("sense_dades") : `${t("posicio", pos + 1, valorsActuals.length)} · ${t("mediana", ind.f(med))}`}</p>
      <button type="button">${t("obrir_fitxa")} →</button>`;
    el.querySelector("button").addEventListener("click", () => obreFitxa(props.ine, true));
  }

  function omplirSelector() {
    const cont = document.getElementById("indicadors");
    let html = "", grup = null;
    IND.forEach((i) => {
      if (i.g !== grup) { grup = i.g; html += `<span class="grup">${t(grup)}</span>`; }
      const ok = disponible(i, nivell);
      html += `<button type="button" class="xip" role="radio" data-id="${i.id}" aria-checked="${i.id === ind.id}" ${ok ? "" : "disabled"} title="${t(i.t)}">${t(i.x)}</button>`;
    });
    cont.innerHTML = html;
    cont.querySelectorAll(".xip").forEach((b) => b.addEventListener("click", () => {
      ind = IND.find((i) => i.id === b.dataset.id);
      cont.querySelectorAll(".xip").forEach((x) => x.setAttribute("aria-checked", String(x === b)));
      botonsNivell(); pinta();
    }));
  }

  function botonsNivell() {
    document.querySelectorAll(".segment button").forEach((b) => {
      b.setAttribute("aria-pressed", String(b.dataset.nivell === nivell));
      b.disabled = !disponible(ind, b.dataset.nivell);
    });
  }

  function canviaNivell(n) {
    if (n === nivell || !disponible(ind, n)) return;
    nivell = n; fixat = null; omplirSelector(); botonsNivell(); pinta();
  }

  function tipHtml(props) {
    const z = nomZona(props), v = props.v;
    return `<b>${z.nom}</b> <span class="t-sub">${z.lloc}</span><br>${v == null ? t("sense_dades") : `<b>${ind.f(v)}</b>`}`;
  }

  function caixa(coords) {
    let [x0, y0, x1, y1] = [180, 90, -180, -90];
    const recorre = (c) => (typeof c[0] === "number" ? (x0 = Math.min(x0, c[0]), y0 = Math.min(y0, c[1]), x1 = Math.max(x1, c[0]), y1 = Math.max(y1, c[1])) : c.forEach(recorre));
    recorre(coords);
    return [[x0, y0], [x1, y1]];
  }

  // Punto aproximado para el rótulo: centro de la caja del polígono más grande
  function centre(f) {
    const g = f.geometry;
    const pols = g.type === "Polygon" ? [g.coordinates] : g.coordinates;
    let millor = null, area = -1;
    pols.forEach((p) => { const [[a, b], [c, d]] = caixa(p); const ar = (c - a) * (d - b); if (ar > area) { area = ar; millor = [(a + c) / 2, (b + d) / 2]; } });
    return millor;
  }

  function encaixa(ine) {
    const f = geoMun.features.find((x) => x.properties.ine === ine);
    if (!f) return;
    mapa.fitBounds(caixa(f.geometry.coordinates), { padding: 40, maxZoom: 13.5, duration: 800 });
    mapa.getSource("seleccio").setData({ type: "FeatureCollection", features: [f] });
  }

  window.mapaMunicipi = (ine) => {
    if (!mapa) return;
    if (!disponible(ind, "sec")) { ind = IND[0]; }
    nivell = "sec"; omplirSelector(); botonsNivell(); pinta();
    document.getElementById("s-mapa").scrollIntoView({ behavior: "smooth", block: "start" });
    setTimeout(() => encaixa(ine), 400);
  };

  window.mapaIdioma = () => { if (!mapa) return; omplirSelector(); pinta(); };

  function colorsBase() {
    if (!mapa || !mapa.getLayer("zones-line")) return;
    mapa.setPaintProperty("fons", "background-color", css("--paper"));
    mapa.setPaintProperty("zones-line", "line-color", css("--paper"));
    mapa.setPaintProperty("limits-mun", "line-color", css("--tinta"));
    mapa.setPaintProperty("hover", "line-color", css("--tinta"));
    mapa.setPaintProperty("seleccio", "line-color", css("--accent"));
  }

  window.iniciaMapa = async () => {
    if (typeof maplibregl === "undefined") return;
    D.municipios.forEach((m) => { munPerIne[m.ine] = m; });
    const [gm, gs, sec] = await Promise.all([
      fetch("datos/municipis.geojson").then((r) => r.json()),
      fetch("datos/seccions.geojson").then((r) => r.json()),
      fetch("datos/seccions.json").then((r) => r.json()),
    ]);
    geoMun = gm; geoSec = gs; SEC = sec;
    geoMun.features.forEach((f, i) => { f.id = i; });
    geoSec.features.forEach((f, i) => { f.id = i; });

    // Sin mapa base: solo el territorio, sobre el color del papel
    const estil = { version: 8, sources: {}, layers: [{ id: "fons", type: "background", paint: { "background-color": css("--paper") || "#fffefb" } }] };
    const estret = innerWidth < 640;
    mapa = new maplibregl.Map({
      container: "mapa", style: estil, center: [2.6, 42.05], zoom: 8,
      minZoom: 7, maxZoom: 14, cooperativeGestures: matchMedia("(pointer: coarse)").matches,
      attributionControl: false, dragRotate: false, pitchWithRotate: false,
    });
    mapa.touchZoomRotate.disableRotation();
    mapa.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");

    mapa.on("load", () => {
      mapa.addSource("zones", { type: "geojson", data: geoMun });
      mapa.addSource("municipis", { type: "geojson", data: geoMun });
      mapa.addSource("seleccio", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
      mapa.addLayer({ id: "zones-fill", type: "fill", source: "zones", paint: { "fill-color": ["get", "c"] } });
      mapa.addLayer({ id: "zones-line", type: "line", source: "zones", paint: { "line-color": "#fffefb", "line-width": ["interpolate", ["linear"], ["zoom"], 7, 0.35, 12, 1.2] } });
      mapa.addLayer({ id: "limits-mun", type: "line", source: "municipis", layout: { visibility: "none" }, paint: { "line-color": "#13233f", "line-opacity": 0.55, "line-width": ["interpolate", ["linear"], ["zoom"], 7, 0.4, 12, 1.2] } });
      mapa.addLayer({ id: "hover", type: "line", source: "zones", paint: { "line-color": "#13233f", "line-width": ["case", ["boolean", ["feature-state", "hover"], false], 1.8, 0] } });
      mapa.addLayer({ id: "seleccio", type: "line", source: "seleccio", paint: { "line-color": "#c8553d", "line-width": 2.5 } });
      colorsBase();
      pinta();
      mapa.fitBounds([[1.72, 41.64], [3.33, 42.5]], { padding: estret ? 8 : 24, duration: 0 });
      // Rótulos de las poblaciones principales, para orientarse sin mapa base
      (estret ? ROTULS_MOBIL : ROTULS).forEach((nom) => {
        const m = D.municipios.find((x) => x.nom === nom); if (!m) return;
        const f = geoMun.features.find((x) => x.properties.ine === m.ine); if (!f) return;
        const e = document.createElement("div"); e.className = "etiq-mapa"; e.textContent = nom;
        new maplibregl.Marker({ element: e }).setLngLat(centre(f)).addTo(mapa);
      });
    });

    const marca = (f) => {
      if (hoverId !== null) mapa.setFeatureState({ source: "zones", id: hoverId }, { hover: false });
      hoverId = f ? f.id : null;
      if (f) mapa.setFeatureState({ source: "zones", id: hoverId }, { hover: true });
    };
    mapa.on("mousemove", "zones-fill", (e) => {
      const f = e.features[0];
      marca(f);
      mapa.getCanvas().style.cursor = "pointer";
      mostraTip(tipHtml(f.properties), e.originalEvent.clientX, e.originalEvent.clientY);
      info(f.properties);
    });
    mapa.on("movestart", () => { if (matchMedia("(pointer: coarse)").matches) amagaTip(); });
    mapa.on("mouseleave", "zones-fill", () => { marca(null); mapa.getCanvas().style.cursor = ""; amagaTip(); info(fixat); });
    mapa.on("click", "zones-fill", (e) => {
      const f = e.features[0], p = f.properties;
      fixat = p; info(p); marca(f);
      const fm = geoMun.features.find((x) => x.properties.ine === p.ine);
      if (fm) mapa.getSource("seleccio").setData({ type: "FeatureCollection", features: [fm] });
      if (matchMedia("(pointer: coarse)").matches) amagaTip();
    });

    document.querySelectorAll(".segment button").forEach((b) => b.addEventListener("click", () => canviaNivell(b.dataset.nivell)));
    matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => { colorsBase(); pinta(); });
    let amplePrev = innerWidth;
    addEventListener("resize", () => { if (Math.abs(innerWidth - amplePrev) > 40) { amplePrev = innerWidth; llegenda(); } });
    omplirSelector(); botonsNivell();
  };
})();
