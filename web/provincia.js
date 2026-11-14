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
      hipoteques: ["Hipoteques sobre habitatges", "Nombre anual. Índex, 2007 = 100"],
      hipoteca_mitjana: ["Hipoteca mitjana", "Import mitjà per habitatge (€)"],
      causes: ["De què es mor", "Defuncions per grup de causes (% del total)"],
      destins: ["On dormen els turistes", "Pernoctacions hoteleres anuals (milions)"],
      destins_noms: { gi: "Costa Brava", cat: "Lloret de Mar", esp: "Pirineus (tot Catalunya)" },
      h_hipoteques: (n, a, d, e) => `<b>${n}</b> hipoteques sobre habitatges el ${a}: ${d} que el 2007. A Espanya, ${e}.`,
      h_hipoteca_mitjana: (g, e, a) => `La hipoteca mitjana a Girona és de <b>${g} €</b> (${a}), davant dels ${e} € d'Espanya.`,
      h_causes: (n, a, c, v) => `<b>${n}</b> defuncions el ${a}. La primera causa: <b>${c.toLowerCase()}</b> (${v}).`,
      h_destins: (v, a, l) => `La Costa Brava va sumar <b>${v} milions</b> de nits d'hotel el ${a}; només Lloret de Mar, ${l} milions.`,
      comp_4eso: ["Competències bàsiques a 4t d'ESO", "Puntuació mitjana de català, castellà, anglès i matemàtiques (0-100)"],
      comp_4eso_mat: ["4t d'ESO per matèries", "Puntuació mitjana a les proves de competències bàsiques (0-100)"],
      comp_6e: ["Competències bàsiques a 6è de primària", "Puntuació mitjana de català, castellà, anglès i matemàtiques (0-100)"],
      edu_publica_prov: ["Escola pública", "Alumnes d'infantil a batxillerat en centres públics (%)"],
      h_comp: (g, c, a, n) => `Els alumnes de ${n} de Girona van treure <b>${g} punts</b> de mitjana el ${a}, davant dels ${c} de Catalunya.`,
      h_comp_mat: (m, v, a) => `El ${a}, la millor matèria a Girona va ser <b>${m.toLowerCase()}</b> (${v} punts).`,
      h_publica: (g, c, cu, n) => `El <b>${g}</b> dels ${n} alumnes de la província van a un centre públic (curs ${cu}). A Catalunya, el ${c}.`,
      n4eso: "4t d'ESO", n6e: "6è",
      font_edu: "Font: Departament d'Educació",
      font_causes: "Font: INE, Estadística de defuncions segons la causa de mort",
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
      hipoteques: ["Hipotecas sobre viviendas", "Número anual. Índice, 2007 = 100"],
      hipoteca_mitjana: ["Hipoteca media", "Importe medio por vivienda (€)"],
      causes: ["De qué se muere", "Defunciones por grupo de causas (% del total)"],
      destins: ["Dónde duermen los turistas", "Pernoctaciones hoteleras anuales (millones)"],
      destins_noms: { gi: "Costa Brava", cat: "Lloret de Mar", esp: "Pirineos (toda Cataluña)" },
      h_hipoteques: (n, a, d, e) => `<b>${n}</b> hipotecas sobre viviendas en ${a}: ${d} que en 2007. En España, ${e}.`,
      h_hipoteca_mitjana: (g, e, a) => `La hipoteca media en Girona es de <b>${g} €</b> (${a}), frente a los ${e} € de España.`,
      h_causes: (n, a, c, v) => `<b>${n}</b> defunciones en ${a}. La primera causa: <b>${c.toLowerCase()}</b> (${v}).`,
      h_destins: (v, a, l) => `La Costa Brava sumó <b>${v} millones</b> de noches de hotel en ${a}; solo Lloret de Mar, ${l} millones.`,
      comp_4eso: ["Competencias básicas en 4.º de ESO", "Puntuación media de catalán, castellano, inglés y matemáticas (0-100)"],
      comp_4eso_mat: ["4.º de ESO por materias", "Puntuación media en las pruebas de competencias básicas (0-100)"],
      comp_6e: ["Competencias básicas en 6.º de primaria", "Puntuación media de catalán, castellano, inglés y matemáticas (0-100)"],
      edu_publica_prov: ["Escuela pública", "Alumnos de infantil a bachillerato en centros públicos (%)"],
      h_comp: (g, c, a, n) => `Los alumnos de ${n} de Girona sacaron <b>${g} puntos</b> de media en ${a}, frente a los ${c} de Cataluña.`,
      h_comp_mat: (m, v, a) => `En ${a}, la mejor materia en Girona fue <b>${m.toLowerCase()}</b> (${v} puntos).`,
      h_publica: (g, c, cu, n) => `El <b>${g}</b> de los ${n} alumnos de la provincia va a un centro público (curso ${cu}). En Cataluña, el ${c}.`,
      n4eso: "4.º de ESO", n6e: "6.º",
      font_edu: "Fuente: Departament d'Educació",
      font_causes: "Fuente: INE, Estadística de defunciones según la causa de muerte",
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
  const CAUSES = {
    I: ["Malalties infeccioses", "Enfermedades infecciosas"], II: ["Tumors", "Tumores"],
    III: ["Malalties de la sang", "Enfermedades de la sangre"], IV: ["Malalties endocrines i metabòliques", "Enfermedades endocrinas y metabólicas"],
    V: ["Trastorns mentals (demències)", "Trastornos mentales (demencias)"], "VI-VIII": ["Sistema nerviós (Alzheimer…)", "Sistema nervioso (alzhéimer…)"],
    IX: ["Sistema circulatori (cor, ictus)", "Sistema circulatorio (corazón, ictus)"], X: ["Sistema respiratori", "Sistema respiratorio"],
    XI: ["Sistema digestiu", "Sistema digestivo"], XII: ["Pell", "Piel"], XIII: ["Ossos i músculs", "Huesos y músculos"],
    XIV: ["Sistema genitourinari", "Sistema genitourinario"], XVIII: ["Causes mal definides", "Causas mal definidas"],
    XX: ["Causes externes (accidents, suïcidis)", "Causas externas (accidentes, suicidios)"],
  };
  const MATERIES = { pcat: ["Català", "Catalán"], pcast: ["Castellà", "Castellano"], pang: ["Anglès", "Inglés"], pmat: ["Matemàtiques", "Matemáticas"], pcien: ["Ciències", "Ciencias"] };
  const tp = (k, ...a) => { const v = TP[LANG][k]; return typeof v === "function" ? v(...a) : v; };
  const nomGrup = (g, c) => (c && MATERIES[c] ? MATERIES[c][LANG === "ca" ? 0 : 1] : c && CAUSES[c] ? CAUSES[c][LANG === "ca" ? 0 : 1] : LANG === "ca" ? GRUPS_CA[g] || g : GRUPS_ES[g] || g);
  const nomSerie = (sp, k) => (sp.noms ? tp(sp.noms + "_noms")[k] : tp(k));
  const unitat = (sp) => (sp.u === "%" ? " %" : sp.u === "€" ? " €" : sp.u === "M" ? " M" : "");
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
    const pts = claus.flatMap((k) => sp.series[k]);
    const ymax = Math.max(...pts.map((p) => Math.abs(p[2])));
    const W = Math.max(280, cont.clientWidth || 520), H = W < 440 ? 210 : 240, m = { t: 14, r: ymax >= 1e5 ? 58 : 46, b: 24, l: ymax >= 1e5 ? 52 : ymax >= 1e3 ? 42 : 34 };
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
      claus.slice().reverse().forEach((k) => { const p = sp.series[k].find((q) => q[0] === x); if (p) { et = p[1]; html += `<br><i class="pg-dot pg-${k}"></i>${nomSerie(sp, k)}: <b>${fmt(p[2], sp.dec)}${unitat(sp)}</b>`; } });
      mostraTip(`<b>${etiqueta(et)}</b>${html}`, ev.clientX, ev.clientY);
    });
    zona.addEventListener("pointerleave", () => { guia.setAttribute("visibility", "hidden"); amagaTip(); });
  }

  function barres(cont, sp) {
    const gs = sp.grups; if (!gs || !gs.length) { cont.innerHTML = ""; return; }
    const ks = sp.claus || ["gi", "esp"];
    const mx = Math.max(...gs.flatMap((g) => ks.map((k) => Math.abs(g[k])))) || 1;
    const fv = (v) => (sp.u === "%" ? pct(v, 1) : fmt(v, sp.dec));
    const b = (v, k) => `<span class="pb-b"><b class="pg-bg-${k}" style="width:${(Math.abs(v) / mx) * 100}%"></b><em>${fv(v)}</em></span>`;
    cont.innerHTML = `<div class="pb">${gs.map((g) => `<div class="pb-fila"><span class="pb-nom">${nomGrup(g.g, g.c)}</span><span class="pb-barres">${ks.map((k) => b(g[k], k)).join("")}</span></div>`).join("")}</div>`;
  }

  const delta = (idx) => { const d = idx - 100; return d < 0 ? tp("menys", pct(-d, 0)) : tp("mes", pct(d, 0)); };
  const ult = (sp, k) => { const s = sp.series && sp.series[k]; return s && s.length ? s[s.length - 1] : null; };

  function titular(id, sp, P) {
    if (id === "ipc") { const g = ult(sp, "gi"), c = ult(sp, "cat"), e = ult(sp, "esp"); return g ? tp("h_ipc", pct(g[2], 1), pct(c && c[2], 1), pct(e && e[2], 1), etiqueta(g[1])) : ""; }
    if (id === "paro") { const g = ult(sp, "gi"), e = ult(sp, "esp"); return g ? tp("h_paro", pct(g[2], 1), pct(e && e[2], 1), etiqueta(g[1])) : ""; }
    if (id === "ipc_grups") { const g = sp.grups[0]; return g ? tp("h_ipc_grups", nomGrup(g.g), pct(g.gi, 1), g.any) : ""; }
    if (id === "turisme") { const g = ult(sp, "gi"); return g && P.pernoct_total ? tp("h_turisme", pct(g[2], 0), g[1], fmt(P.pernoct_total.v / 1e6, 1) + " M") : ""; }
    if (["compra", "societats"].includes(id)) { const g = ult(sp, "gi"), c = ult(sp, "cat"), e = ult(sp, "esp"); return g ? tp(`h_${id}`, fmt(sp.abs.gi), sp.any, delta(g[2]), delta(c[2]), delta(e[2])) : ""; }
    if (id === "hipoteques") { const g = ult(sp, "gi"), e = ult(sp, "esp"); return g ? tp("h_hipoteques", fmt(sp.abs.gi), sp.any, delta(g[2]), delta(e[2])) : ""; }
    if (id === "hipoteca_mitjana") { const g = ult(sp, "gi"), e = ult(sp, "esp"); return g ? tp("h_hipoteca_mitjana", fmt(g[2]), fmt(e && e[2]), g[1]) : ""; }
    if (id === "causes") { const g = sp.grups[0]; return g ? tp("h_causes", fmt(sp.total), sp.any, nomGrup(g.g, g.c), pct(g.gi, 1)) : ""; }
    if (id === "destins") { const g = ult(sp, "gi"), l = ult(sp, "cat"); return g ? tp("h_destins", fmt(g[2], 1), g[1], fmt(l && l[2], 1)) : ""; }
    if (id === "comp_4eso" || id === "comp_6e") { const g = ult(sp, "gi"), c = ult(sp, "cat"); return g ? tp("h_comp", fmt(g[2], 1), fmt(c && c[2], 1), g[1], tp(id === "comp_4eso" ? "n4eso" : "n6e")) : ""; }
    if (id === "comp_4eso_mat") { const g = [...sp.grups].sort((a, b) => b.gi - a.gi)[0]; return g ? tp("h_comp_mat", nomGrup(g.g, g.c), fmt(g.gi, 1), sp.any) : ""; }
    if (id === "edu_publica_prov") { const g = ult(sp, "gi"), c = ult(sp, "cat"); return g ? tp("h_publica", pct(g[2], 0), pct(c && c[2], 0), g[1], fmt(sp.abs && sp.abs.n)) : ""; }
    if (id === "execucions") { const g = ult(sp, "gi"); return g ? tp("h_execucions", fmt(sp.abs.gi), sp.any, delta(g[2])) : ""; }
    return "";
  }

  window.pintaSeccioProv = () => {
    const cont = document.getElementById("prov-grafics");
    if (!cont || !D.prov) return;
    const P = D.prov;
    const ids = ["ipc", "paro", "ipc_grups", "compra", "hipoteques", "hipoteca_mitjana", "turisme", "destins", "societats", "execucions", "causes", "edu_publica_prov", "comp_4eso", "comp_4eso_mat", "comp_6e"].filter((k) => P[k]);
    cont.innerHTML = ids.map((id) => {
      const sp = P[id];
      const claus = sp.tipus === "barres" ? sp.claus || ["gi", "esp"] : ORDRE.filter((k) => sp.series[k] && sp.series[k].length).reverse();
      return `<figure class="pg-fig" data-id="${id}">
        <figcaption><span class="pg-tit">${tp(id)[0]}</span><span class="unitat">${tp(id)[1]}</span></figcaption>
        <p class="pg-h">${titular(id, sp, P)}</p>
        <p class="pg-lleg">${claus.map((k) => `<span><i class="pg-dot pg-${k}"></i>${nomSerie(sp, k)}</span>`).join("")}</p>
        <div class="pg-c"></div>
        <p class="pg-font">${tp(id === "causes" ? "font_causes" : /^(comp_|edu_)/.test(id) ? "font_edu" : "font")}</p></figure>`;
    }).join("");
    cont.querySelectorAll(".pg-fig").forEach((f) => {
      const sp = P[f.dataset.id], c = f.querySelector(".pg-c");
      if (sp.tipus === "barres") barres(c, sp); else linia(c, sp);
    });
  };
})();
