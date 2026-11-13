/* La provincia en el contexto: series del INE de Girona, Cataluña y España. */
(function () {
  const TP = {
    ca: {
      gi: "Girona", cat: "Catalunya", esp: "Espanya",
      mesos: ["gener", "febrer", "març", "abril", "maig", "juny", "juliol", "agost", "setembre", "octubre", "novembre", "desembre"],
      ipc: ["Inflació", "Variació anual de l'IPC (%)"],
      paro: ["Atur (EPA)", "Taxa d'atur (%)"],
      ipc_grups: ["Què s'encareix", "Variació anual dels preus per grups (%)"],
      compra: ["Compravendes d'habitatges", "Índex, 2007 = 100"],
      turisme: ["Turisme estranger", "Pernoctacions hoteleres de residents a l'estranger (%)"],
      execucions: ["Execucions hipotecàries", "Habitatges amb execució iniciada. Índex, 2014 = 100"],
      societats: ["Empreses noves", "Societats mercantils constituïdes. Índex, 2007 = 100"],
      h_ipc: (g, c, e, p) => `Els preus pugen un <b>${g}</b> interanual a Girona (${p}), davant del ${c} a Catalunya i el ${e} a Espanya.`,
      h_paro: (g, e, p) => `L'atur és del <b>${g}</b> a Girona (${p}). A Espanya, del ${e}.`,
      h_ipc_grups: (g, v, a) => `El ${a}, el que més es va encarir a Girona va ser <b>${g.toLowerCase()}</b> (${v}).`,
      h_compra: (n, a, d, c, e) => `<b>${n}</b> compravendes d'habitatges el ${a}: ${d} respecte al 2007. Catalunya, ${c}; Espanya, ${e}.`,
      h_turisme: (g, a, n) => `El <b>${g}</b> de les nits d'hotel són de turistes estrangers (${a}), sobre ${n} pernoctacions.`,
      h_execucions: (n, a, d) => `<b>${n}</b> habitatges amb execució hipotecària el ${a}, ${d} que el 2014.`,
      h_societats: (n, a, d, c, e) => `<b>${n}</b> societats noves el ${a}: ${d} respecte al 2007. Catalunya, ${c}; Espanya, ${e}.`,
      menys: (v) => `un ${v} menys`, mes: (v) => `un ${v} més`,
      font: "Font: INE",
    },
    es: {
      gi: "Girona", cat: "Cataluña", esp: "España",
      mesos: ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"],
      ipc: ["Inflación", "Variación anual del IPC (%)"],
      paro: ["Paro (EPA)", "Tasa de paro (%)"],
      ipc_grups: ["Qué se encarece", "Variación anual de los precios por grupos (%)"],
      compra: ["Compraventas de viviendas", "Índice, 2007 = 100"],
      turisme: ["Turismo extranjero", "Pernoctaciones hoteleras de residentes en el extranjero (%)"],
      execucions: ["Ejecuciones hipotecarias", "Viviendas con ejecución iniciada. Índice, 2014 = 100"],
      societats: ["Empresas nuevas", "Sociedades mercantiles constituidas. Índice, 2007 = 100"],
      h_ipc: (g, c, e, p) => `Los precios suben un <b>${g}</b> interanual en Girona (${p}), frente al ${c} en Cataluña y el ${e} en España.`,
      h_paro: (g, e, p) => `El paro es del <b>${g}</b> en Girona (${p}). En España, del ${e}.`,
      h_ipc_grups: (g, v, a) => `En ${a}, lo que más se encareció en Girona fue <b>${g.toLowerCase()}</b> (${v}).`,
      h_compra: (n, a, d, c, e) => `<b>${n}</b> compraventas de viviendas en ${a}: ${d} respecto a 2007. Cataluña, ${c}; España, ${e}.`,
      h_turisme: (g, a, n) => `El <b>${g}</b> de las noches de hotel son de turistas extranjeros (${a}), sobre ${n} pernoctaciones.`,
      h_execucions: (n, a, d) => `<b>${n}</b> viviendas con ejecución hipotecaria en ${a}, ${d} que en 2014.`,
      h_societats: (n, a, d, c, e) => `<b>${n}</b> sociedades nuevas en ${a}: ${d} respecto a 2007. Cataluña, ${c}; España, ${e}.`,
      menys: (v) => `un ${v} menos`, mes: (v) => `un ${v} más`,
      font: "Fuente: INE",
    },
  };
  const GRUPS_CA = {
    "Alimentos y bebidas no alcohólicas": "Aliments i begudes no alcohòliques", "Bebidas alcohólicas, tabaco y estupefacientes": "Begudes alcohòliques i tabac",
    "Vestido y calzado": "Vestit i calçat", "Vivienda, agua, electricidad, gas y otros combustibles": "Habitatge, aigua, electricitat i gas",
    "Muebles, artículos del hogar y artículos para el mantenimiento corriente del hogar": "Mobles i articles de la llar", "Sanidad": "Sanitat",
    "Transporte": "Transport", "Información y comunicaciones": "Informació i comunicacions", "Actividades recreativas, deporte y cultura": "Oci, esport i cultura",
    "Servicios de educación": "Educació", "Restaurantes y servicios de alojamiento": "Restaurants i allotjament", "Seguros y servicios financieros": "Assegurances i serveis financers",
    "Cuidado personal, protección social, y bienes y servicios diversos": "Cura personal i altres serveis",
  };
  const GRUPS_ES = {
    "Vivienda, agua, electricidad, gas y otros combustibles": "Vivienda, agua, electricidad y gas",
    "Muebles, artículos del hogar y artículos para el mantenimiento corriente del hogar": "Muebles y artículos del hogar",
    "Bebidas alcohólicas, tabaco y estupefacientes": "Bebidas alcohólicas y tabaco",
    "Cuidado personal, protección social, y bienes y servicios diversos": "Cuidado personal y otros servicios",
  };
  const tp = (k, ...a) => { const v = TP[LANG][k]; return typeof v === "function" ? v(...a) : v; };
  const nomGrup = (g) => (LANG === "ca" ? GRUPS_CA[g] || g : GRUPS_ES[g] || g);
  const etiqueta = (e) => {
    const m = /^(\d{4})-(\d{2})$/.exec(e); if (m) return `${tp("mesos")[+m[2] - 1]} ${m[1]}`;
    const q = /^(\d{4})T(\d)$/.exec(e); if (q) return `${q[2]}T ${q[1]}`;
    return e;
  };
  const NS = "http://www.w3.org/2000/svg";
  const nou = (tag, at, pare) => { const e = document.createElementNS(NS, tag); Object.entries(at).forEach(([k, v]) => e.setAttribute(k, v)); if (pare) pare.appendChild(e); return e; };
  const ORDRE = ["esp", "cat", "gi"];

  function linia(cont, sp) {
    cont.innerHTML = "";
    const claus = ORDRE.filter((k) => sp.series[k] && sp.series[k].length);
    if (!claus.length) return;
    const W = Math.max(280, cont.clientWidth || 520), H = W < 440 ? 210 : 240, m = { t: 14, r: 46, b: 24, l: 34 };
    const pts = claus.flatMap((k) => sp.series[k]);
    const x0 = Math.min(...pts.map((p) => p[0])), x1 = Math.max(...pts.map((p) => p[0]));
    let y0 = Math.min(...pts.map((p) => p[2])), y1 = Math.max(...pts.map((p) => p[2]));
    if (sp.u === "%" && y0 > 0) y0 = 0;
    const pas = (() => { const r = (y1 - y0) / 4, p = Math.pow(10, Math.floor(Math.log10(r || 1))); return [1, 2, 2.5, 5, 10].map((k) => k * p).find((k) => k >= r); })();
    y0 = Math.floor(y0 / pas) * pas; y1 = Math.ceil(y1 / pas) * pas;
    const X = (x) => m.l + ((x - x0) / (x1 - x0 || 1)) * (W - m.l - m.r), Y = (y) => m.t + (1 - (y - y0) / (y1 - y0 || 1)) * (H - m.t - m.b);
    const svg = nou("svg", { viewBox: `0 0 ${W} ${H}`, class: "pg", role: "img" }, cont);
    for (let v = y0; v <= y1 + 1e-9; v += pas) {
      nou("line", { x1: m.l, x2: W - m.r, y1: Y(v), y2: Y(v), class: (sp.u === "idx" && Math.abs(v - 100) < 1e-9) || (sp.u === "%" && v === 0) ? "pg-ref" : "pg-g" }, svg);
      nou("text", { x: m.l - 6, y: Y(v) + 3.5, "text-anchor": "end", class: "pg-t" }, svg).textContent = fmt(v, pas < 1 ? 1 : 0);
    }
    const anys = []; for (let a = Math.ceil(x0); a <= Math.floor(x1); a++) anys.push(a);
    const salt = Math.ceil(anys.length / (W < 440 ? 4 : 7));
    anys.forEach((a, i) => { if (i % salt === 0) nou("text", { x: X(a), y: H - 6, "text-anchor": "middle", class: "pg-t" }, svg).textContent = a; });
    claus.forEach((k) => {
      const s = sp.series[k];
      nou("polyline", { points: s.map((p) => `${X(p[0]).toFixed(1)},${Y(p[2]).toFixed(1)}`).join(" "), class: `pg-l pg-${k}` }, svg);
      const u = s[s.length - 1];
      nou("circle", { cx: X(u[0]), cy: Y(u[2]), r: 3.5, class: `pg-p pg-${k}` }, svg);
    });
    // Etiquetas finales, separadas si se solapan
    const fins = claus.map((k) => { const u = sp.series[k][sp.series[k].length - 1]; return { k, y: Y(u[2]), v: u[2] }; }).sort((a, b) => a.y - b.y);
    for (let i = 1; i < fins.length; i++) if (fins[i].y - fins[i - 1].y < 12) fins[i].y = fins[i - 1].y + 12;
    fins.forEach((f) => { nou("text", { x: W - m.r + 6, y: f.y + 3.5, class: `pg-e pg-${f.k}` }, svg).textContent = fmt(f.v, sp.dec); });
    // Hover
    const guia = nou("line", { y1: m.t, y2: H - m.b, class: "pg-guia", visibility: "hidden" }, svg);
    const zona = nou("rect", { x: m.l, y: m.t, width: W - m.l - m.r, height: H - m.t - m.b, fill: "transparent" }, svg);
    const xs = [...new Set(pts.map((p) => p[0]))].sort((a, b) => a - b);
    zona.addEventListener("pointermove", (ev) => {
      const r = svg.getBoundingClientRect(), px = ((ev.clientX - r.left) / r.width) * W;
      const x = xs.reduce((b, c) => (Math.abs(X(c) - px) < Math.abs(X(b) - px) ? c : b));
      guia.setAttribute("x1", X(x)); guia.setAttribute("x2", X(x)); guia.setAttribute("visibility", "visible");
      let html = "", et = "";
      claus.slice().reverse().forEach((k) => { const p = sp.series[k].find((q) => q[0] === x); if (p) { et = p[1]; html += `<br><i class="pg-dot pg-${k}"></i>${tp(k)}: <b>${fmt(p[2], sp.dec)}${sp.u === "%" ? " %" : ""}</b>`; } });
      mostraTip(`<b>${etiqueta(et)}</b>${html}`, ev.clientX, ev.clientY);
    });
    zona.addEventListener("pointerleave", () => { guia.setAttribute("visibility", "hidden"); amagaTip(); });
  }

  function barres(cont, sp) {
    const gs = sp.grups; if (!gs || !gs.length) { cont.innerHTML = ""; return; }
    const mx = Math.max(...gs.flatMap((g) => [Math.abs(g.gi), Math.abs(g.esp)])) || 1;
    const b = (v, k) => `<span class="pb-b"><b class="pg-bg-${k}" style="width:${(Math.abs(v) / mx) * 100}%"></b><em>${pct(v, 1)}</em></span>`;
    cont.innerHTML = `<div class="pb">${gs.map((g) => `<div class="pb-fila"><span class="pb-nom">${nomGrup(g.g)}</span><span class="pb-barres">${b(g.gi, "gi")}${b(g.esp, "esp")}</span></div>`).join("")}</div>`;
  }

  const delta = (idx) => { const d = idx - 100; return d < 0 ? tp("menys", pct(-d, 0)) : tp("mes", pct(d, 0)); };
  const ult = (sp, k) => { const s = sp.series && sp.series[k]; return s && s.length ? s[s.length - 1] : null; };

  function titular(id, sp, P) {
    if (id === "ipc") { const g = ult(sp, "gi"), c = ult(sp, "cat"), e = ult(sp, "esp"); return g ? tp("h_ipc", pct(g[2], 1), pct(c && c[2], 1), pct(e && e[2], 1), etiqueta(g[1])) : ""; }
    if (id === "paro") { const g = ult(sp, "gi"), e = ult(sp, "esp"); return g ? tp("h_paro", pct(g[2], 1), pct(e && e[2], 1), etiqueta(g[1])) : ""; }
    if (id === "ipc_grups") { const g = sp.grups[0]; return g ? tp("h_ipc_grups", nomGrup(g.g), pct(g.gi, 1), g.any) : ""; }
    if (id === "turisme") { const g = ult(sp, "gi"); return g && P.pernoct_total ? tp("h_turisme", pct(g[2], 0), g[1], fmt(P.pernoct_total.v / 1e6, 1) + " M") : ""; }
    if (["compra", "societats"].includes(id)) { const g = ult(sp, "gi"), c = ult(sp, "cat"), e = ult(sp, "esp"); return g ? tp(`h_${id}`, fmt(sp.abs.gi), sp.any, delta(g[2]), delta(c[2]), delta(e[2])) : ""; }
    if (id === "execucions") { const g = ult(sp, "gi"); return g ? tp("h_execucions", fmt(sp.abs.gi), sp.any, delta(g[2])) : ""; }
    return "";
  }

  window.pintaSeccioProv = () => {
    const cont = document.getElementById("prov-grafics");
    if (!cont || !D.prov) return;
    const P = D.prov;
    const ids = ["ipc", "paro", "ipc_grups", "compra", "turisme", "societats", "execucions"].filter((k) => P[k]);
    cont.innerHTML = ids.map((id) => {
      const sp = P[id];
      const claus = sp.tipus === "barres" ? ["gi", "esp"] : ORDRE.filter((k) => sp.series[k] && sp.series[k].length).reverse();
      return `<figure class="pg-fig" data-id="${id}">
        <figcaption><span class="pg-tit">${tp(id)[0]}</span><span class="unitat">${tp(id)[1]}</span></figcaption>
        <p class="pg-h">${titular(id, sp, P)}</p>
        <p class="pg-lleg">${claus.map((k) => `<span><i class="pg-dot pg-${k}"></i>${tp(k)}</span>`).join("")}</p>
        <div class="pg-c"></div>
        <p class="pg-font">${tp("font")}</p></figure>`;
    }).join("");
    cont.querySelectorAll(".pg-fig").forEach((f) => {
      const sp = P[f.dataset.id], c = f.querySelector(".pg-c");
      if (sp.tipus === "barres") barres(c, sp); else linia(c, sp);
    });
  };
})();
