"use strict";
/* Mapa coroplético interactivo (MapLibre) por municipio y sección censal.
   Usa las variables globales de app.js: D, t, fmt, pct, val, esforc, mostraTip, amagaTip, obreFitxa, LANG. */

(function () {
  const RAMPA = ["#cde2fb", "#9ec5f4", "#6da7ec", "#3987e5", "#256abf", "#184f95", "#0d366b"];
  const SENSE = "#e9e7e2";
  const ESTIL = "https://tiles.openfreemap.org/styles/positron";

  // Indicadores: v(m) para municipio, s(sec) para sección (si existe a ese nivel)
  const IND = [
    { id: "renda", t: "i_renda", v: (m) => val(m.renta_persona, "2024"), s: (x) => x.renta_persona, f: (v) => `${fmt(v)} €` },
    { id: "renda_llar", t: "i_renda_llar", v: (m) => val(m.renta_hogar, "2024"), s: (x) => x.renta_hogar, f: (v) => `${fmt(v)} €` },
    { id: "gini", t: "i_gini", v: (m) => val(m.gini, "2024"), s: (x) => x.gini, f: (v) => fmt(v, 1) },
    { id: "lloguer", t: "i_lloguer", v: (m) => val(m.alquiler, "2025"), f: (v) => `${fmt(v)} €` },
    { id: "var5", t: "i_var5", v: (m) => { const a = val(m.alquiler, "2025"), b = val(m.alquiler, "2020"); return a && b ? (a / b - 1) * 100 : null; }, f: (v) => pct(v, 0, true) },
    { id: "esforc", t: "i_esforc", v: (m) => esforc(m), f: (v) => pct(v, 0) },
    { id: "compra", t: "i_compra", v: (m) => (val(m.compraventas, "2025") != null && m.poblacion ? (m.compraventas["2025"] / m.poblacion) * 1000 : null), f: (v) => fmt(v, 1) },
    { id: "hut", t: "i_hut", v: (m) => (m.viviendas ? (m.hut / m.viviendas) * 100 : null), f: (v) => fmt(v, 1) },
    { id: "antics", t: "i_antics", v: (m) => (m.viviendas ? (m.viv_antes_1980 / m.viviendas) * 100 : null), s: (x) => (x.viviendas ? (x.viv_antes_1980 / x.viviendas) * 100 : null), f: (v) => pct(v, 0) },
    { id: "nous", t: "i_nous", v: null, s: (x) => (x.viviendas ? (x.viv_post_2000 / x.viviendas) * 100 : null), f: (v) => pct(v, 0) },
    { id: "estacional", t: "i_estacional", v: (m) => (m.poblacion && m.poblacion_etca ? (m.poblacion_etca / m.poblacion) * 100 : null), f: (v) => pct(v, 0) },
    { id: "pob", t: "i_pob", v: (m) => m.poblacion, f: (v) => fmt(v) },
  ];

  let mapa = null, geoMun = null, geoSec = null, SEC = {}, nivell = "mun", ind = IND[0], llindars = [];
  let hoverId = null, munPerIne = {};

  const disponible = (i, n) => (n === "mun" ? !!i.v : !!i.s);

  function quantils(valors) {
    const v = valors.filter((x) => x != null && isFinite(x)).sort((a, b) => a - b);
    if (v.length < 2) return [];
    const k = RAMPA.length, res = [];
    for (let i = 1; i < k; i++) res.push(v[Math.floor((i / k) * (v.length - 1))]);
    return [...new Set(res)];
  }
  const classe = (v) => { if (v == null || !isFinite(v)) return -1; let i = 0; while (i < llindars.length && v >= llindars[i]) i++; return Math.min(i, RAMPA.length - 1); };

  function valorDe(props) {
    if (nivell === "mun") { const m = munPerIne[props.ine]; return m ? ind.v(m) : null; }
    const x = SEC[props.cusec]; return x ? ind.s(x) : null;
  }

  function pinta() {
    const geo = nivell === "mun" ? geoMun : geoSec;
    const valors = geo.features.map((f) => valorDe(f.properties));
    llindars = quantils(valors);
    geo.features.forEach((f, i) => {
      const c = classe(valors[i]);
      f.properties.c = c < 0 ? SENSE : RAMPA[Math.round((c * (RAMPA.length - 1)) / Math.max(1, llindars.length))];
      f.properties.v = valors[i];
    });
    const src = mapa.getSource("zones");
    if (!src) return;
    src.setData(geo);
    // contorno de municipios encima de las secciones
    mapa.setLayoutProperty("limits-mun", "visibility", nivell === "sec" ? "visible" : "none");
    llegenda();
    document.getElementById("mapa-desc").textContent = !disponible(ind, "sec") && nivell === "mun" ? t("nomes_mun") : "";
  }

  function llegenda() {
    const el = document.getElementById("llegenda");
    const colors = [...new Set(llindars.map((_, i) => i)).values()];
    let html = `<div class="tit">${t(ind.t)}</div>`;
    const n = llindars.length + 1;
    for (let i = 0; i < n; i++) {
      const color = RAMPA[Math.round((i * (RAMPA.length - 1)) / Math.max(1, llindars.length))];
      const de = i === 0 ? null : llindars[i - 1], a = i === n - 1 ? null : llindars[i];
      const txt = de == null ? `< ${ind.f(a)}` : a == null ? `≥ ${ind.f(de)}` : `${ind.f(de)} – ${ind.f(a)}`;
      html += `<div class="fila"><i style="background:${color}"></i>${txt}</div>`;
    }
    html += `<div class="fila"><i class="nd"></i>${t("sense_dades")}</div>`;
    el.innerHTML = html;
    void colors;
  }

  function omplirSelector() {
    const sel = document.getElementById("indicador");
    sel.innerHTML = IND.filter((i) => disponible(i, nivell) || disponible(i, "mun"))
      .map((i) => `<option value="${i.id}" ${i.id === ind.id ? "selected" : ""} ${disponible(i, nivell) ? "" : "disabled"}>${t(i.t)}</option>`).join("");
  }

  function botonsNivell() {
    document.querySelectorAll(".segment button").forEach((b) => {
      b.setAttribute("aria-pressed", String(b.dataset.nivell === nivell));
      b.disabled = !disponible(ind, b.dataset.nivell);
    });
  }

  function canviaNivell(n) {
    if (n === nivell || !disponible(ind, n)) return;
    nivell = n; omplirSelector(); botonsNivell(); pinta();
  }

  function tipHtml(props) {
    const m = munPerIne[props.ine];
    const nom = m ? m.nom : props.ine;
    const cap = nivell === "sec" ? `<b>${nom}</b><br>${t("seccio")} ${props.cusec.slice(5, 7)}-${props.cusec.slice(7)}` : `<b>${nom}</b>${m ? `<br>${m.comarca}` : ""}`;
    const v = props.v;
    return `${cap}<br>${t(ind.t)}: <b>${v == null ? t("sense_dades") : ind.f(v)}</b>`;
  }

  function encaixa(ine) {
    const f = geoMun.features.find((x) => x.properties.ine === ine);
    if (!f) return;
    let [x0, y0, x1, y1] = [180, 90, -180, -90];
    const recorre = (c) => (typeof c[0] === "number" ? (x0 = Math.min(x0, c[0]), y0 = Math.min(y0, c[1]), x1 = Math.max(x1, c[0]), y1 = Math.max(y1, c[1])) : c.forEach(recorre));
    recorre(f.geometry.coordinates);
    mapa.fitBounds([[x0, y0], [x1, y1]], { padding: 40, maxZoom: 13.5, duration: 800 });
    mapa.getSource("seleccio").setData({ type: "FeatureCollection", features: [f] });
  }

  window.mapaMunicipi = (ine) => {
    if (!mapa) return;
    if (!disponible(ind, "sec")) { ind = IND[0]; }
    nivell = "sec"; omplirSelector(); botonsNivell(); pinta();
    document.querySelector(".mapa-sec").scrollIntoView({ behavior: "smooth", block: "start" });
    setTimeout(() => encaixa(ine), 400);
  };

  window.mapaIdioma = () => { if (!mapa) return; omplirSelector(); llegenda(); pinta(); };

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

    // Mapa base de OpenFreeMap; si no responde, fondo liso (las capas de datos funcionan igual)
    let estil = { version: 8, sources: {}, layers: [{ id: "fons", type: "background", paint: { "background-color": "#eef0f2" } }] };
    try {
      const ctrl = new AbortController(); const tm = setTimeout(() => ctrl.abort(), 5000);
      const r = await fetch(ESTIL, { signal: ctrl.signal }); clearTimeout(tm);
      if (r.ok) estil = await r.json();
    } catch (e) { /* sin mapa base */ }
    mapa = new maplibregl.Map({
      container: "mapa", style: estil, center: [2.75, 42.05], zoom: 8,
      minZoom: 7, maxZoom: 15, cooperativeGestures: matchMedia("(pointer: coarse)").matches,
      attributionControl: { compact: true },
    });
    mapa.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    mapa.on("error", () => { /* si falla el mapa base, las capas propias siguen funcionando */ });

    mapa.on("load", () => {
      // Insertar por debajo de las etiquetas del mapa base
      const etiquetes = mapa.getStyle().layers.find((l) => l.type === "symbol");
      const abans = etiquetes ? etiquetes.id : undefined;
      mapa.addSource("zones", { type: "geojson", data: geoMun });
      mapa.addSource("municipis", { type: "geojson", data: geoMun });
      mapa.addSource("seleccio", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
      mapa.addLayer({ id: "zones-fill", type: "fill", source: "zones", paint: { "fill-color": ["get", "c"], "fill-opacity": 0.82 } }, abans);
      mapa.addLayer({ id: "zones-line", type: "line", source: "zones", paint: { "line-color": "#ffffff", "line-width": ["interpolate", ["linear"], ["zoom"], 7, 0.3, 12, 1] } }, abans);
      mapa.addLayer({ id: "limits-mun", type: "line", source: "municipis", layout: { visibility: "none" }, paint: { "line-color": "#52514e", "line-width": ["interpolate", ["linear"], ["zoom"], 7, 0.4, 12, 1.4] } }, abans);
      mapa.addLayer({ id: "hover", type: "line", source: "zones", paint: { "line-color": "#0b0b0b", "line-width": ["case", ["boolean", ["feature-state", "hover"], false], 2, 0] } });
      mapa.addLayer({ id: "seleccio", type: "line", source: "seleccio", paint: { "line-color": "#eb6834", "line-width": 2.5 } });
      pinta();
      // Encuadre de la provincia
      mapa.fitBounds([[1.72, 41.64], [3.33, 42.5]], { padding: 16, duration: 0 });
    });

    mapa.on("mousemove", "zones-fill", (e) => {
      const f = e.features[0];
      if (hoverId !== null) mapa.setFeatureState({ source: "zones", id: hoverId }, { hover: false });
      hoverId = f.id; mapa.setFeatureState({ source: "zones", id: hoverId }, { hover: true });
      mapa.getCanvas().style.cursor = "pointer";
      mostraTip(tipHtml(f.properties), e.originalEvent.clientX, e.originalEvent.clientY);
    });
    mapa.on("movestart", () => { if (matchMedia("(pointer: coarse)").matches) amagaTip(); });
    mapa.on("mouseleave", "zones-fill", () => {
      if (hoverId !== null) mapa.setFeatureState({ source: "zones", id: hoverId }, { hover: false });
      hoverId = null; mapa.getCanvas().style.cursor = ""; amagaTip();
    });
    mapa.on("click", "zones-fill", (e) => {
      const p = e.features[0].properties;
      mostraTip(tipHtml(p), e.originalEvent.clientX, e.originalEvent.clientY);
      const f = geoMun.features.find((x) => x.properties.ine === p.ine);
      if (f) mapa.getSource("seleccio").setData({ type: "FeatureCollection", features: [f] });
      obreFitxa(p.ine, false);
    });

    document.getElementById("indicador").addEventListener("change", (e) => {
      ind = IND.find((i) => i.id === e.target.value);
      botonsNivell(); pinta();
    });
    document.querySelectorAll(".segment button").forEach((b) => b.addEventListener("click", () => canviaNivell(b.dataset.nivell)));
    omplirSelector(); botonsNivell();
  };
})();
