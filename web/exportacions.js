// Comercio exterior: sección «Exportacions» (AEAT, ficheros territoriales de Aduanas).
// Datos en datos/exportacions.json (scripts/exportacions_web.py), que se pide la primera vez que se pinta.
// Dos mapas MapLibre (países del mundo y provincias de España) y gráficos SVG propios.
// Usa las globales de app.js: LANG, fmt, pct, tile, mostraTip, amagaTip, nomPais.
(function () {
  const CAP = {
    "01": ["Animals vius", "Animales vivos"], "02": ["Carn", "Carne"], "03": ["Peix i marisc", "Pescado y marisco"], "04": ["Llet, ous i mel", "Leche, huevos y miel"],
    "05": ["Altres productes animals", "Otros productos animales"], "06": ["Plantes i flors", "Plantas y flores"], "07": ["Hortalisses", "Hortalizas"], "08": ["Fruita", "Fruta"],
    "09": ["Cafè, te i espècies", "Café, té y especias"], 10: ["Cereals", "Cereales"], 11: ["Farines i midons", "Harinas y almidones"], 12: ["Llavors oleaginoses", "Semillas oleaginosas"],
    13: ["Gomes i resines", "Gomas y resinas"], 14: ["Matèries vegetals", "Materias vegetales"], 15: ["Olis i greixos", "Aceites y grasas"], 16: ["Embotits i conserves de carn i peix", "Embutidos y conservas de carne y pescado"],
    17: ["Sucre i llaminadures", "Azúcar y golosinas"], 18: ["Cacau i xocolata", "Cacao y chocolate"], 19: ["Galetes, pasta i pastisseria", "Galletas, pasta y pastelería"], 20: ["Conserves vegetals i sucs", "Conservas vegetales y zumos"],
    21: ["Preparats alimentaris diversos", "Preparados alimenticios diversos"], 22: ["Begudes", "Bebidas"], 23: ["Pinsos i residus alimentaris", "Piensos y residuos alimentarios"], 24: ["Tabac", "Tabaco"],
    25: ["Sal, pedra i ciment", "Sal, piedra y cemento"], 26: ["Minerals metàl·lics", "Minerales metálicos"], 27: ["Combustibles i energia", "Combustibles y energía"], 28: ["Química inorgànica", "Química inorgánica"],
    29: ["Química orgànica", "Química orgánica"], 30: ["Medicaments", "Medicamentos"], 31: ["Adobs", "Abonos"], 32: ["Tints, pintures i tintes", "Tintes, pinturas y tintas"],
    33: ["Perfums i cosmètica", "Perfumes y cosmética"], 34: ["Sabons i detergents", "Jabones y detergentes"], 35: ["Proteïnes i coles", "Proteínas y colas"], 36: ["Explosius i pirotècnia", "Explosivos y pirotecnia"],
    37: ["Fotografia i cinema", "Fotografía y cine"], 38: ["Altres productes químics", "Otros productos químicos"], 39: ["Plàstics", "Plásticos"], 40: ["Cautxú", "Caucho"],
    41: ["Pells i cuirs", "Pieles y cueros"], 42: ["Marroquineria", "Marroquinería"], 43: ["Pelleteria", "Peletería"], 44: ["Fusta", "Madera"],
    45: ["Suro", "Corcho"], 46: ["Cistelleria", "Cestería"], 47: ["Pasta de paper", "Pasta de papel"], 48: ["Paper i cartró", "Papel y cartón"],
    49: ["Llibres i impresos", "Libros e impresos"], 50: ["Seda", "Seda"], 51: ["Llana", "Lana"], 52: ["Cotó", "Algodón"],
    53: ["Altres fibres vegetals", "Otras fibras vegetales"], 54: ["Filaments sintètics", "Filamentos sintéticos"], 55: ["Fibres sintètiques", "Fibras sintéticas"], 56: ["Feltres, cordes i no teixits", "Fieltros, cuerdas y tela sin tejer"],
    57: ["Catifes", "Alfombras"], 58: ["Teixits especials", "Tejidos especiales"], 59: ["Teixits tècnics", "Tejidos técnicos"], 60: ["Teixits de punt", "Tejidos de punto"],
    61: ["Roba de punt", "Ropa de punto"], 62: ["Roba (no de punt)", "Ropa (no de punto)"], 63: ["Altres articles tèxtils", "Otros artículos textiles"], 64: ["Calçat", "Calzado"],
    65: ["Barrets", "Sombreros"], 66: ["Paraigües", "Paraguas"], 67: ["Plomes i flors artificials", "Plumas y flores artificiales"], 68: ["Manufactures de pedra", "Manufacturas de piedra"],
    69: ["Ceràmica", "Cerámica"], 70: ["Vidre", "Vidrio"], 71: ["Joieria i metalls preciosos", "Joyería y metales preciosos"], 72: ["Ferro i acer", "Hierro y acero"],
    73: ["Manufactures de ferro i acer", "Manufacturas de hierro y acero"], 74: ["Coure", "Cobre"], 75: ["Níquel", "Níquel"], 76: ["Alumini", "Aluminio"],
    78: ["Plom", "Plomo"], 79: ["Zinc", "Cinc"], 80: ["Estany", "Estaño"], 81: ["Altres metalls", "Otros metales"],
    82: ["Eines i coberts", "Herramientas y cubiertos"], 83: ["Manufactures de metall", "Manufacturas de metal"], 84: ["Maquinària", "Maquinaria"], 85: ["Aparells elèctrics", "Aparatos eléctricos"],
    86: ["Material ferroviari", "Material ferroviario"], 87: ["Automòbils i components", "Automóviles y componentes"], 88: ["Aeronaus", "Aeronaves"], 89: ["Vaixells", "Barcos"],
    90: ["Òptica i instruments mèdics", "Óptica e instrumentos médicos"], 91: ["Rellotgeria", "Relojería"], 92: ["Instruments musicals", "Instrumentos musicales"], 93: ["Armes", "Armas"],
    94: ["Mobles i il·luminació", "Muebles e iluminación"], 95: ["Joguines i esport", "Juguetes y deporte"], 96: ["Manufactures diverses", "Manufacturas diversas"], 97: ["Art i antiguitats", "Arte y antigüedades"],
    99: ["Altres", "Otros"], XX: ["Sense classificar", "Sin clasificar"],
  };
  const MODE = { 1: ["Vaixell", "Barco"], 2: ["Tren", "Tren"], 3: ["Camió", "Camión"], 4: ["Avió", "Avión"], 5: ["Correu", "Correo"], 7: ["Instal·lacions fixes", "Instalaciones fijas"], 8: ["Vies navegables", "Vías navegables"], 9: ["Mitjans propis", "Medios propios"] };
  const TX = {
    ca: {
      x_exp: (a) => `Exportacions ${a}`, xn_exp: (v, a) => `${v} respecte del ${a}`,
      x_12: "Últims 12 mesos", xn_12: (de, a, v) => `${de} – ${a} · ${v} interanual`,
      x_saldo: "Saldo comercial", xn_saldo: (i) => `exporta més del que importa (${i} M€ d'importacions)`, xn_saldo_n: (i) => `importa més del que exporta (${i} M€ d'importacions)`,
      x_pes: "Pes en les exportacions catalanes", xn_pes: (p) => `amb el ${p} de la població`,
      x_hab: "Per habitant", xn_hab: (c, e) => `Catalunya ${c} € · Espanya ${e} €`,
      x_ue: "Cap a la Unió Europea", xn_ue: (c, e) => `Catalunya ${c} · Espanya ${e}`,
      m_mon: ["On venen els productes gironins", "milions d'euros"], m_mon_i: ["D'on compra la província", "milions d'euros"],
      e: "Exportacions", i: "Importacions", any: "Any",
      h_mon: (p, v, s, n) => `<b>${p}</b> s'emporta ${v} de les vendes a l'estranger; entre els cinc primers països sumen ${s}. La província ven a ${n} països.`,
      h_mon_i: (p, v, n) => `El primer proveïdor és <b>${p}</b> (${v} de les compres a l'estranger). La província compra a ${n} països.`,
      m_esp: ["Girona davant les altres províncies", ""], ind_hab: "Per habitant", ind_tot: "Total", ind_var: "Creixement", ind_saldo: "Saldo per habitant",
      u_hab: "euros exportats per habitant", u_tot: "milions d'euros exportats", u_var: (a, b) => `% de creixement de les exportacions, ${a}-${b}`, u_saldo: "exportacions menys importacions, euros per habitant",
      h_esp: (r, n, v) => `Girona és la <b>${r}a</b> de ${n} províncies en exportacions per habitant (${v} €).`,
      h_esp_tot: (r, n) => `Girona és la <b>${r}a</b> de ${n} províncies en valor exportat.`,
      h_esp_var: (r, n, v) => `Les exportacions gironines han crescut un ${v}: <b>${r}a</b> de ${n} províncies.`,
      h_esp_saldo: (r, n, v) => `Amb un saldo de ${v} € per habitant, Girona és la <b>${r}a</b> de ${n} províncies.`,
      rq: "Rànquing", sense: "Sense dades",
      g_evol: ["Exportacions i importacions", "milions d'euros a l'any"], h_evol: (a0, v0, a1, v1, s) => `De ${fmtM(v0)} M€ el ${a0} a ${fmtM(v1)} M€ el ${a1}. La província ${s}.`, s_pos: "sempre ha venut més del que ha comprat", s_neg: "no sempre ha venut més del que ha comprat",
      g_idx: (a) => [`Creixement comparat`, `índex, ${a} = 100`], h_idx: (g, c, e, a) => `Des del ${a}, les exportacions de Girona han crescut un ${g}, les de Catalunya un ${c} i les d'Espanya un ${e}.`,
      g_mes: ["Mes a mes", "exportacions, milions d'euros"], h_mes: (m, v, d) => `${m}: ${fmtM(v)} M€, ${d} que el mateix mes de l'any anterior.`,
      g_caps: (a) => ["Què ven la província", `milions d'euros exportats el ${a} · % del total`], h_caps: (c, v, c2, v2) => `La <b>${c.toLowerCase()}</b> és de llarg el primer producte: ${v} de tot el que s'exporta. Després, ${c2.toLowerCase()} (${v2}).`,
      g_espec: (a) => ["En què destaca", `% de les exportacions catalanes de cada producte que surten de Girona, ${a}`], h_espec: (c, v) => `Girona fa el ${v} de tota la <b>${c.toLowerCase()}</b> que exporta Catalunya, tot i tenir només el 10 % de la població.`,
      g_var: (a, b) => ["Què puja i què baixa", `variació de les exportacions, ${a} davant ${b}, milions d'euros`], h_var: (c, v, c2, v2) => `El que més creix és <b>${c.toLowerCase()}</b> (${v} M€); el que més cau, ${c2.toLowerCase()} (${v2} M€).`,
      g_paisos: (a) => ["Principals clients", `milions d'euros exportats el ${a} · variació anual`], h_paisos: (p, v, d) => `<b>${p}</b> és el primer client, amb ${v} de les exportacions (${d} en un any).`,
      g_cap_pais: ["On va cada producte", "% de les exportacions de cada producte, cinc primers països"], h_cap_pais: (c, p, v) => `La ${c.toLowerCase()} va sobretot a <b>${p}</b> (${v}), però es ven a tot el món.`,
      g_mode: ["Com surt la mercaderia", "% del valor exportat per mitjà de transport"], h_mode: (v, m) => `El ${v} surt per carretera; el vaixell, ${m}.`,
      g_imp: (a) => ["Què compra la província", `milions d'euros importats el ${a}`], h_imp: (c, v) => `La primera compra a l'estranger és <b>${c.toLowerCase()}</b>: ${v} de totes les importacions.`,
      g_ue: ["Quant pesa Europa", "% de les exportacions que van a la Unió Europea"], h_ue: (g, c) => `Girona depèn més d'Europa que la resta del país: ${g} de les vendes, davant el ${c} de Catalunya.`,
      zona: { gi: "Girona", cat: "Catalunya", esp: "Espanya" }, saldo: "Saldo",
      font: "Font: Agència Tributària, Departament de Duanes, fitxers territorials de comerç exterior. Província d'origen de la mercaderia.",
      font_p: (a) => `Font: Agència Tributària (Duanes) i INE (població ${a}).`,
      prov: (a) => `${a} provisional`, nd: "No hi ha dades de comerç exterior per municipi ni per comarca: la xifra més petita que publica Duanes és la província.",
      milers: "M€", mesos: ["gen.", "febr.", "març", "abr.", "maig", "juny", "jul.", "ag.", "set.", "oct.", "nov.", "des."],
      mes: "més", menys: "menys",
    },
    es: {
      x_exp: (a) => `Exportaciones ${a}`, xn_exp: (v, a) => `${v} respecto a ${a}`,
      x_12: "Últimos 12 meses", xn_12: (de, a, v) => `${de} – ${a} · ${v} interanual`,
      x_saldo: "Saldo comercial", xn_saldo: (i) => `exporta más de lo que importa (${i} M€ de importaciones)`, xn_saldo_n: (i) => `importa más de lo que exporta (${i} M€ de importaciones)`,
      x_pes: "Peso en las exportaciones catalanas", xn_pes: (p) => `con el ${p} de la población`,
      x_hab: "Por habitante", xn_hab: (c, e) => `Cataluña ${c} € · España ${e} €`,
      x_ue: "Hacia la Unión Europea", xn_ue: (c, e) => `Cataluña ${c} · España ${e}`,
      m_mon: ["Dónde se venden los productos gerundenses", "millones de euros"], m_mon_i: ["Dónde compra la provincia", "millones de euros"],
      e: "Exportaciones", i: "Importaciones", any: "Año",
      h_mon: (p, v, s, n) => `<b>${p}</b> se lleva ${v} de las ventas al extranjero; entre los cinco primeros países suman ${s}. La provincia vende a ${n} países.`,
      h_mon_i: (p, v, n) => `El primer proveedor es <b>${p}</b> (${v} de las compras al extranjero). La provincia compra a ${n} países.`,
      m_esp: ["Girona frente a las demás provincias", ""], ind_hab: "Por habitante", ind_tot: "Total", ind_var: "Crecimiento", ind_saldo: "Saldo por habitante",
      u_hab: "euros exportados por habitante", u_tot: "millones de euros exportados", u_var: (a, b) => `% de crecimiento de las exportaciones, ${a}-${b}`, u_saldo: "exportaciones menos importaciones, euros por habitante",
      h_esp: (r, n, v) => `Girona es la <b>${r}.ª</b> de ${n} provincias en exportaciones por habitante (${v} €).`,
      h_esp_tot: (r, n) => `Girona es la <b>${r}.ª</b> de ${n} provincias en valor exportado.`,
      h_esp_var: (r, n, v) => `Las exportaciones gerundenses han crecido un ${v}: <b>${r}.ª</b> de ${n} provincias.`,
      h_esp_saldo: (r, n, v) => `Con un saldo de ${v} € por habitante, Girona es la <b>${r}.ª</b> de ${n} provincias.`,
      rq: "Ranking", sense: "Sin datos",
      g_evol: ["Exportaciones e importaciones", "millones de euros al año"], h_evol: (a0, v0, a1, v1, s) => `De ${fmtM(v0)} M€ en ${a0} a ${fmtM(v1)} M€ en ${a1}. La provincia ${s}.`, s_pos: "siempre ha vendido más de lo que ha comprado", s_neg: "no siempre ha vendido más de lo que ha comprado",
      g_idx: (a) => ["Crecimiento comparado", `índice, ${a} = 100`], h_idx: (g, c, e, a) => `Desde ${a}, las exportaciones de Girona han crecido un ${g}, las de Cataluña un ${c} y las de España un ${e}.`,
      g_mes: ["Mes a mes", "exportaciones, millones de euros"], h_mes: (m, v, d) => `${m}: ${fmtM(v)} M€, ${d} que el mismo mes del año anterior.`,
      g_caps: (a) => ["Qué vende la provincia", `millones de euros exportados en ${a} · % del total`], h_caps: (c, v, c2, v2) => `La <b>${c.toLowerCase()}</b> es de largo el primer producto: ${v} de todo lo que se exporta. Después, ${c2.toLowerCase()} (${v2}).`,
      g_espec: (a) => ["En qué destaca", `% de las exportaciones catalanas de cada producto que salen de Girona, ${a}`], h_espec: (c, v) => `Girona hace el ${v} de toda la <b>${c.toLowerCase()}</b> que exporta Cataluña, pese a tener solo el 10 % de la población.`,
      g_var: (a, b) => ["Qué sube y qué baja", `variación de las exportaciones, ${a} frente a ${b}, millones de euros`], h_var: (c, v, c2, v2) => `Lo que más crece es <b>${c.toLowerCase()}</b> (${v} M€); lo que más cae, ${c2.toLowerCase()} (${v2} M€).`,
      g_paisos: (a) => ["Principales clientes", `millones de euros exportados en ${a} · variación anual`], h_paisos: (p, v, d) => `<b>${p}</b> es el primer cliente, con ${v} de las exportaciones (${d} en un año).`,
      g_cap_pais: ["Adónde va cada producto", "% de las exportaciones de cada producto, cinco primeros países"], h_cap_pais: (c, p, v) => `La ${c.toLowerCase()} va sobre todo a <b>${p}</b> (${v}), pero se vende en todo el mundo.`,
      g_mode: ["Cómo sale la mercancía", "% del valor exportado por medio de transporte"], h_mode: (v, m) => `El ${v} sale por carretera; el barco, ${m}.`,
      g_imp: (a) => ["Qué compra la provincia", `millones de euros importados en ${a}`], h_imp: (c, v) => `La primera compra en el extranjero es <b>${c.toLowerCase()}</b>: ${v} de todas las importaciones.`,
      g_ue: ["Cuánto pesa Europa", "% de las exportaciones que van a la Unión Europea"], h_ue: (g, c) => `Girona depende más de Europa que el resto del país: ${g} de las ventas, frente al ${c} de Cataluña.`,
      zona: { gi: "Girona", cat: "Cataluña", esp: "España" }, saldo: "Saldo",
      font: "Fuente: Agencia Tributaria, Departamento de Aduanas, ficheros territoriales de comercio exterior. Provincia de origen de la mercancía.",
      font_p: (a) => `Fuente: Agencia Tributaria (Aduanas) e INE (población ${a}).`,
      prov: (a) => `${a} provisional`, nd: "No hay datos de comercio exterior por municipio ni por comarca: la cifra más pequeña que publica Aduanas es la provincia.",
      milers: "M€", mesos: ["ene.", "feb.", "mar.", "abr.", "may.", "jun.", "jul.", "ago.", "sept.", "oct.", "nov.", "dic."],
      mes: "más", menys: "menos",
    },
  };
  const tx = (k, ...a) => { const v = TX[LANG][k]; return typeof v === "function" ? v(...a) : v; };
  const L = () => (LANG === "ca" ? 0 : 1);
  const nomCap = (c) => (CAP[c] || CAP[+c] || [c, c])[L()];
  const nomP = (c) => { try { const n = new Intl.DisplayNames([LANG === "ca" ? "ca" : "es"], { type: "region" }).of(c); return n && n !== c ? n : nomPais(c); } catch (e) { return nomPais(c); } };
  const fmtM = (v) => fmt(v, v < 10 ? 1 : 0);
  const p0 = (v) => pct(v, 0), p1 = (v) => pct(v, 1);
  const etMes = (m) => `${tx("mesos")[+m.slice(5) - 1]} ${m.slice(0, 4)}`;
  const figura = (id, tit, h, cos, font = tx("font"), cls = "") => `<figure class="pg-fig ex-g ${cls}" data-id="${id}"><figcaption><span class="pg-tit">${tit[0]}</span><span class="unitat">${tit[1]}</span></figcaption><p class="pg-h">${h}</p>${cos}<p class="pg-font">${font}</p></figure>`;
  const barres = (files, f = fmtM) => {
    const mx = Math.max(...files.map((x) => Math.abs(x[1] || 0))) || 1;
    return `<div class="pb">${files.map(([n, v, nota, cls]) => `<div class="pb-fila"><span class="pb-nom">${n}${nota ? ` <small class="pb-n">${nota}</small>` : ""}</span><span class="pb-barres"><span class="pb-b"><b class="${cls || "pg-bg-gi"}" style="width:${(Math.abs(v) / mx) * 100}%"></b><em>${f(v)}</em></span></span></div>`).join("")}</div>`;
  };
  const varTxt = (v) => (v == null ? "" : `<b class="ex-var">${pct(v, 1, true)}</b>`);

  let X = null, carregant = null;
  const est = { flux: "E", any: null, ind: "hab" };
  const mapes = {};

  // Gráfico de líneas genérico: series [{k, nom, cls, d: [[x, v]]}]
  function linies(cont, series, { idx = false, dec = 0, etX = (x) => x } = {}) {
    const NS = "http://www.w3.org/2000/svg";
    const nou = (tag, at, pare) => { const e = document.createElementNS(NS, tag); Object.entries(at).forEach(([k, v]) => e.setAttribute(k, v)); if (pare) pare.appendChild(e); return e; };
    cont.innerHTML = "";
    const pts = series.flatMap((s) => s.d.filter((p) => p[1] != null));
    if (!pts.length) return;
    const W = Math.max(280, cont.clientWidth || 520), H = W < 440 ? 210 : 240;
    const xs = [...new Set(pts.map((p) => p[0]))];
    let y0 = Math.min(0, ...pts.map((p) => p[1])), y1 = Math.max(...pts.map((p) => p[1]));
    if (idx) y0 = Math.min(...pts.map((p) => p[1]));
    const pas = (() => { const r = (y1 - y0) / 4, p = Math.pow(10, Math.floor(Math.log10(r || 1))); return [1, 2, 2.5, 5, 10].map((k) => k * p).find((k) => k >= r); })();
    y0 = Math.floor(y0 / pas) * pas; y1 = Math.ceil(y1 / pas) * pas;
    const m = { t: 12, r: 52, b: 24, l: y1 >= 1000 ? 44 : 34 };
    const X_ = (i) => m.l + (i / Math.max(1, xs.length - 1)) * (W - m.l - m.r), Y = (v) => m.t + (1 - (v - y0) / (y1 - y0 || 1)) * (H - m.t - m.b);
    const svg = nou("svg", { viewBox: `0 0 ${W} ${H}`, class: "pg", role: "img" }, cont);
    for (let v = y0; v <= y1 + 1e-9; v += pas) {
      nou("line", { x1: m.l, x2: W - m.r, y1: Y(v), y2: Y(v), class: (idx && Math.abs(v - 100) < 1e-9) || (!idx && v === 0) ? "pg-ref" : "pg-g" }, svg);
      nou("text", { x: m.l - 6, y: Y(v) + 3.5, "text-anchor": "end", class: "pg-t" }, svg).textContent = fmt(v);
    }
    const salt = Math.ceil(xs.length / (W < 440 ? 4 : 7));
    xs.forEach((x, i) => { if (i % salt === 0 || i === xs.length - 1) nou("text", { x: X_(i), y: H - 6, "text-anchor": "middle", class: "pg-t" }, svg).textContent = etX(x); });
    const fins = [];
    series.forEach((s) => {
      const d = s.d.filter((p) => p[1] != null);
      nou("polyline", { points: d.map((p) => `${X_(xs.indexOf(p[0])).toFixed(1)},${Y(p[1]).toFixed(1)}`).join(" "), class: `pg-l ${s.cls}` }, svg);
      const u = d[d.length - 1];
      nou("circle", { cx: X_(xs.indexOf(u[0])), cy: Y(u[1]), r: 3.5, class: `pg-p ${s.cls}` }, svg);
      fins.push({ y: Y(u[1]), v: u[1], cls: s.cls });
    });
    fins.sort((a, b) => a.y - b.y);
    for (let i = 1; i < fins.length; i++) if (fins[i].y - fins[i - 1].y < 12) fins[i].y = fins[i - 1].y + 12;
    fins.forEach((f) => { nou("text", { x: W - m.r + 6, y: f.y + 3.5, class: `pg-e ${f.cls}` }, svg).textContent = fmt(f.v, dec); });
    const guia = nou("line", { y1: m.t, y2: H - m.b, class: "pg-guia", visibility: "hidden" }, svg);
    const zona = nou("rect", { x: m.l, y: m.t, width: W - m.l - m.r, height: H - m.t - m.b, fill: "transparent" }, svg);
    zona.addEventListener("pointermove", (ev) => {
      const r = svg.getBoundingClientRect(), px = ((ev.clientX - r.left) / r.width) * W;
      const i = Math.max(0, Math.min(xs.length - 1, Math.round(((px - m.l) / (W - m.l - m.r)) * (xs.length - 1))));
      guia.setAttribute("x1", X_(i)); guia.setAttribute("x2", X_(i)); guia.setAttribute("visibility", "visible");
      const html = series.map((s) => { const p = s.d.find((q) => q[0] === xs[i]); return p && p[1] != null ? `<br><i class="pg-dot ${s.cls}"></i>${s.nom}: <b>${fmt(p[1], dec)}</b>` : ""; }).join("");
      mostraTip(`<b>${etX(xs[i])}</b>${html}`, ev.clientX, ev.clientY);
    });
    zona.addEventListener("pointerleave", () => { guia.setAttribute("visibility", "hidden"); amagaTip(); });
  }

  // Columnas mensuales con el mismo mes del año anterior como marca
  function columnes(cont, per, vals) {
    const n = Math.min(36, per.length), p = per.slice(-n), v = vals.slice(-n);
    const W = Math.max(280, cont.clientWidth || 520), H = W < 440 ? 200 : 230, m = { t: 10, r: 6, b: 22, l: 36 };
    const mx = Math.max(...v.map((x) => x || 0)) || 1;
    const pas = mx > 800 ? 200 : mx > 400 ? 100 : 50, top = Math.ceil(mx / pas) * pas;
    const bw = (W - m.l - m.r) / n, Y = (x) => m.t + (1 - x / top) * (H - m.t - m.b);
    let s = `<svg viewBox="0 0 ${W} ${H}" class="pg" role="img">`;
    for (let y = 0; y <= top; y += pas) s += `<line x1="${m.l}" x2="${W - m.r}" y1="${Y(y)}" y2="${Y(y)}" class="pg-g"/><text x="${m.l - 4}" y="${Y(y) + 3.5}" text-anchor="end" class="pg-t">${fmt(y)}</text>`;
    p.forEach((mes, i) => {
      const val = v[i] || 0, j = per.indexOf(`${+mes.slice(0, 4) - 1}${mes.slice(4)}`), ant = j >= 0 ? vals[j] : null;
      const d = ant ? (val / ant - 1) * 100 : null;
      s += `<rect x="${(m.l + i * bw + 1).toFixed(1)}" y="${Y(val).toFixed(1)}" width="${Math.max(1, bw - 2).toFixed(1)}" height="${(H - m.b - Y(val)).toFixed(1)}" class="ex-col${i === n - 1 ? " ex-ult" : ""}" data-t="${etMes(mes)}: ${fmtM(val)} M€${d == null ? "" : ` (${pct(d, 1, true)})`}"></rect>`;
      if (ant) s += `<line x1="${(m.l + i * bw + 1).toFixed(1)}" x2="${(m.l + (i + 1) * bw - 1).toFixed(1)}" y1="${Y(ant).toFixed(1)}" y2="${Y(ant).toFixed(1)}" class="ex-ant"/>`;
      if (mes.endsWith("-01")) s += `<text x="${(m.l + i * bw).toFixed(1)}" y="${H - 6}" class="pg-t">${mes.slice(0, 4)}</text>`;
    });
    cont.innerHTML = s + "</svg>";
    cont.querySelectorAll("rect.ex-col").forEach((r) => { r.addEventListener("pointermove", (ev) => mostraTip(r.dataset.t, ev.clientX, ev.clientY)); r.addEventListener("pointerleave", amagaTip); });
  }

  // ---------- Mapas ----------
  const RAMPA = () => (document.documentElement.dataset.theme === "dark" || (!document.documentElement.dataset.theme && matchMedia("(prefers-color-scheme: dark)").matches)
    ? ["#12302d", "#174440", "#1d5a55", "#25726b", "#3a8f86", "#64b3a8", "#a4dbd2"] : ["#e4f2ef", "#bfe0da", "#8fc7be", "#5aa9a0", "#2f8a82", "#106b66", "#00423f"]);
  const DIVERG = ["#b2182b", "#e58e8e", "#f3d3d3", "#e8eceb", "#bfe0da", "#5aa9a0", "#00423f"];
  const css = (v) => getComputedStyle(document.documentElement).getPropertyValue(v).trim();
  // Cortes por cuantiles redondeados
  function talls(vals, k = 7) {
    const s = vals.filter((v) => v != null && isFinite(v)).sort((a, b) => a - b);
    if (!s.length) return [];
    const r = (v) => { const a = Math.abs(v); const p = a >= 1000 ? 100 : a >= 100 ? 10 : a >= 10 ? 1 : 0.1; return Math.round(v / p) * p; };
    const t = []; for (let i = 1; i < k; i++) t.push(r(s[Math.floor((i / k) * (s.length - 1))]));
    return [...new Set(t)];
  }
  const colorDe = (v, t, rampa) => { if (v == null || !isFinite(v)) return null; let i = 0; while (i < t.length && v >= t[i]) i++; return rampa[Math.round((i * (rampa.length - 1)) / Math.max(1, t.length))]; };
  function llegenda(el, t, rampa, f = fmt) {
    const n = t.length + 1;
    el.innerHTML = `<div class="escala">${Array.from({ length: n }, (_, i) => `<i style="background:${rampa[Math.round((i * (rampa.length - 1)) / Math.max(1, t.length))]}"></i>`).join("")}</div>
      <div class="ticks">${t.map((v, i) => `<span style="left:${((i + 1) / n) * 100}%">${f(v)}</span>`).join("")}</div>`;
  }

  function creaMapa(id, geo, opts) {
    const cont = document.getElementById(id);
    if (!cont || !window.maplibregl) return null;
    const mapa = new maplibregl.Map({
      container: id, style: { version: 8, sources: {}, layers: [{ id: "fons", type: "background", paint: { "background-color": css("--paper") || "#fffefb" } }] },
      bounds: opts.bounds, fitBoundsOptions: { padding: 8 }, minZoom: opts.minZoom || 0, maxZoom: 7, renderWorldCopies: false,
      attributionControl: false, dragRotate: false, pitchWithRotate: false, cooperativeGestures: true,
    });
    mapa.touchZoomRotate.disableRotation();
    mapa.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    const o = { mapa, geo, llest: false, pendent: null };
    mapa.on("load", () => {
      mapa.addSource("g", { type: "geojson", data: geo, promoteId: "c" });
      mapa.addLayer({ id: "f", type: "fill", source: "g", paint: { "fill-color": ["coalesce", ["feature-state", "col"], css("--sense") || "#e7e3da"] } });
      mapa.addLayer({ id: "l", type: "line", source: "g", paint: { "line-color": css("--paper") || "#fffefb", "line-width": 0.6 } });
      mapa.addLayer({ id: "s", type: "line", source: "g", filter: ["==", ["get", "c"], opts.ressalta || "__"], paint: { "line-color": css("--accent") || "#e3001b", "line-width": 2 } });
      o.llest = true;
      if (o.pendent) { o.pendent(); o.pendent = null; }
      mapa.on("mousemove", "f", (e) => { const f = e.features[0]; mapa.getCanvas().style.cursor = "default"; const h = opts.tip(f.properties.c); if (h) mostraTip(h, e.originalEvent.clientX, e.originalEvent.clientY); else amagaTip(); });
      mapa.on("mouseleave", "f", amagaTip);
    });
    return o;
  }
  function pinta(o, colors) {
    const fes = () => { o.geo.features.forEach((f) => { o.mapa.setFeatureState({ source: "g", id: f.properties.c }, { col: colors[f.properties.c] || null }); }); };
    if (o.llest) fes(); else o.pendent = fes;
  }

  function pintaMon() {
    const i = X.anys.indexOf(est.any), P = X.paisos[est.flux] || {};
    const vals = Object.fromEntries(Object.entries(P).map(([c, s]) => [c, s[i]]).filter(([, v]) => v > 0));
    const tot = Object.values(vals).reduce((s, v) => s + v, 0) || 1;
    const t = talls(Object.values(vals).map(Math.log10)).map((v) => Math.pow(10, v));
    const tr = [...new Set(t.map((v) => (v >= 100 ? Math.round(v / 50) * 50 : v >= 10 ? Math.round(v / 5) * 5 : v >= 1 ? Math.round(v) : Math.round(v * 10) / 10)))].filter((v) => v > 0);
    const col = {}; Object.entries(vals).forEach(([c, v]) => { col[c] = colorDe(v, tr, RAMPA()); });
    if (!mapes.mon) mapes.mon = creaMapa("exp-mon", X.geo_mon, { bounds: [[-170, -58], [180, 78]], tip: (c) => { const ii = X.anys.indexOf(est.any), v = (X.paisos[est.flux][c] || [])[ii], vant = (X.paisos[est.flux][c] || [])[ii - 1]; const tt = Object.values(X.paisos[est.flux]).reduce((s, x) => s + (x[ii] || 0), 0) || 1; return `<b>${nomP(c)}</b><br>${v ? `${fmtM(v)} M€ · ${p1((v / tt) * 100)}${vant ? `<br>${pct((v / vant - 1) * 100, 1, true)} ${LANG === "ca" ? "respecte del" : "respecto a"} ${est.any - 1}` : ""}` : tx("sense")}`; } });
    if (mapes.mon) pinta(mapes.mon, col);
    llegenda(document.getElementById("exp-mon-lleg"), tr, RAMPA(), fmtM);
    const ord = Object.entries(vals).sort((a, b) => b[1] - a[1]);
    const s5 = ord.slice(0, 5).reduce((s, x) => s + x[1], 0);
    document.getElementById("exp-mon-h").innerHTML = ord.length ? (est.flux === "E" ? tx("h_mon", nomP(ord[0][0]), p0((ord[0][1] / tot) * 100), p0((s5 / tot) * 100), fmt(ord.length)) : tx("h_mon_i", nomP(ord[0][0]), p0((ord[0][1] / tot) * 100), fmt(ord.length))) : "";
    document.getElementById("exp-mon-tit").textContent = tx(est.flux === "E" ? "m_mon" : "m_mon_i")[0];
    document.getElementById("exp-mon-rq").innerHTML = barres(ord.slice(0, 10).map(([c, v]) => [nomP(c), v, p1((v / tot) * 100)]));
  }

  function valorsProv() {
    const i = X.anys.indexOf(X.ult), i0 = Math.max(0, i - 5), pob = X.pob || {};
    const out = {};
    Object.entries(X.provs).forEach(([c, s]) => {
      const e = s.E[i], im = s.I[i], h = pob[c];
      if (est.ind === "hab") out[c] = h ? (e * 1e6) / h : null;
      else if (est.ind === "tot") out[c] = e;
      else if (est.ind === "var") out[c] = s.E[i0] ? (e / s.E[i0] - 1) * 100 : null;
      else out[c] = h ? ((e - im) * 1e6) / h : null;
    });
    return { out, a0: X.anys[i0] };
  }
  function pintaEsp() {
    const { out, a0 } = valorsProv();
    const div = est.ind === "saldo" || est.ind === "var";
    let t = talls(Object.values(out));
    let rampa = RAMPA();
    if (div) { const vs = Object.values(out).filter((v) => v != null).sort((a, b) => a - b); const mx = Math.max(Math.abs(vs[0]), Math.abs(vs[vs.length - 1])); const p = est.ind === "var" ? [-0.5, -0.25, -0.05, 0.05, 0.25, 0.5] : [-0.5, -0.2, -0.05, 0.05, 0.2, 0.5]; t = p.map((k) => { const v = k * mx; const a = Math.abs(v), r = a >= 1000 ? 100 : a >= 100 ? 10 : 1; return Math.round(v / r) * r; }); rampa = DIVERG; if (est.ind === "var") { const c = vs[Math.floor(vs.length / 2)]; t = [-10, 0, 10, 20, 30, 40].map((x) => x + Math.round(c / 10) * 10 - 20); rampa = DIVERG; } }
    const col = {}; Object.entries(out).forEach(([c, v]) => { col[c] = colorDe(v, t, rampa); });
    const f = est.ind === "var" ? (v) => pct(v, 0) : est.ind === "tot" ? fmtM : (v) => fmt(v);
    if (!mapes.esp) mapes.esp = creaMapa("exp-esp", X.geo_prov, { bounds: [[-13, 34.2], [4.4, 43.9]], ressalta: "17", tip: (c) => { const { out: o } = valorsProv(); const n = (X.geo_prov.features.find((x) => x.properties.c === c) || { properties: {} }).properties.n; return `<b>${n || c}</b><br>${o[c] == null ? tx("sense") : est.ind === "var" ? pct(o[c], 1, true) : est.ind === "tot" ? `${fmtM(o[c])} M€` : `${fmt(o[c])} €`}`; } });
    if (mapes.esp) pinta(mapes.esp, col);
    llegenda(document.getElementById("exp-esp-lleg"), t, rampa, f);
    const ord = Object.entries(out).filter(([, v]) => v != null).sort((a, b) => b[1] - a[1]);
    const r = ord.findIndex((x) => x[0] === "17") + 1, n = ord.length;
    document.getElementById("exp-esp-u").textContent = est.ind === "var" ? tx("u_var", a0, X.ult) : tx("u_" + est.ind);
    document.getElementById("exp-esp-h").innerHTML = est.ind === "hab" ? tx("h_esp", r, n, fmt(out["17"])) : est.ind === "tot" ? tx("h_esp_tot", r, n) : est.ind === "var" ? tx("h_esp_var", r, n, pct(out["17"], 0)) : tx("h_esp_saldo", r, n, fmt(out["17"]));
    const nom = (c) => (X.geo_prov.features.find((x) => x.properties.c === c) || { properties: {} }).properties.n || c;
    const rq = ord.slice(0, 10);
    if (r > 10) rq.push(ord[r - 1]);
    document.getElementById("exp-esp-rq").innerHTML = barres(rq.map(([c, v], k) => [`${k < 10 ? k + 1 : r}. ${c === "17" ? `<b>${nom(c)}</b>` : nom(c)}`, v, "", c === "17" ? "ex-gi" : "pg-bg-esp"]), f);
  }

  function controls() {
    const s = document.getElementById("exp-mon-ctl");
    s.innerHTML = `<div class="segment" role="group">${["E", "I"].map((k) => `<button type="button" data-flux="${k}" aria-pressed="${est.flux === k}">${tx(k.toLowerCase())}</button>`).join("")}</div>
      <label class="ex-any"><span>${tx("any")}</span><select id="exp-any">${X.anys.slice().reverse().map((a) => `<option value="${a}"${a === est.any ? " selected" : ""}>${a}${X.prov_anys.includes(a) ? "*" : ""}</option>`).join("")}</select></label>`;
    s.querySelectorAll("[data-flux]").forEach((b) => b.addEventListener("click", () => { est.flux = b.dataset.flux; controls(); pintaMon(); }));
    s.querySelector("select").addEventListener("change", (e) => { est.any = +e.target.value; pintaMon(); });
    const p = document.getElementById("exp-esp-ctl");
    p.innerHTML = `<div class="segment" role="group">${["hab", "tot", "var", "saldo"].map((k) => `<button type="button" data-ind="${k}" aria-pressed="${est.ind === k}">${tx("ind_" + k)}</button>`).join("")}</div>`;
    p.querySelectorAll("[data-ind]").forEach((b) => b.addEventListener("click", () => { est.ind = b.dataset.ind; controls(); pintaEsp(); }));
  }

  // ---------- Sección ----------
  function pintaTotsX() {
    const A = X.anys, n = A.length, i = n - 1, ult = X.ult, T = X.tot, pob = X.pob || {};
    const E = T.gi.E[i], Ea = T.gi.E[i - 1], I = T.gi.I[i];
    const tiles = [
      tile(`${tx("x_exp", ult)}${X.prov_anys.includes(ult) ? "*" : ""}`, `${fmt(E)} <small>M€</small>`, Ea ? `${varTxt((E / Ea - 1) * 100)} ${tx("xn_exp", "", A[i - 1]).trim()}` : ""),
    ];
    const u = X.u12;
    if (u && u.gi.E_ant) tiles.push(tile(tx("x_12"), `${fmt(u.gi.E)} <small>M€</small>`, tx("xn_12", etMes(u.de), etMes(u.a), varTxt((u.gi.E / u.gi.E_ant - 1) * 100))));
    tiles.push(tile(tx("x_saldo"), `${E - I >= 0 ? "+" : ""}${fmt(E - I)} <small>M€</small>`, tx(E >= I ? "xn_saldo" : "xn_saldo_n", fmt(I))));
    if (pob.gi && pob.cat) tiles.push(tile(tx("x_pes"), p1((E / T.cat.E[i]) * 100), tx("xn_pes", p1((pob.gi / pob.cat) * 100))));
    if (pob.gi) tiles.push(tile(tx("x_hab"), `${fmt((E * 1e6) / pob.gi)} <small>€</small>`, tx("xn_hab", fmt((T.cat.E[i] * 1e6) / pob.cat), fmt((T.esp.E[i] * 1e6) / pob.esp))));
    tiles.push(tile(tx("x_ue"), p0(X.ue.gi[i]), tx("xn_ue", p0(X.ue.cat[i]), p0(X.ue.esp[i]))));
    document.getElementById("exp-xifres").innerHTML = tiles.join("");

    const figs = [];
    const F = X.caps.E, ci = (c) => (F[c] || [])[i] || 0;
    const caps = Object.keys(F).filter((c) => ci(c) > 0).sort((a, b) => ci(b) - ci(a));
    const totE = caps.reduce((s, c) => s + ci(c), 0) || 1;
    // Evolución exportaciones / importaciones
    figs.push(figura("evol", tx("g_evol"), tx("h_evol", A[0], T.gi.E[0], ult, E, A.every((_, k) => T.gi.E[k] >= T.gi.I[k]) ? tx("s_pos") : tx("s_neg")),
      `<p class="pg-lleg"><span><i class="pg-dot ex-e"></i>${tx("e")}</span><span><i class="pg-dot ex-i"></i>${tx("i")}</span></p><div class="pg-c" data-g="evol"></div>`));
    // Índice comparado
    const ix = (z) => T[z].E.map((v, k) => [A[k], T[z].E[0] ? (v / T[z].E[0]) * 100 : null]);
    const dl = (z) => p0((T[z].E[i] / T[z].E[0] - 1) * 100);
    figs.push(figura("idx", tx("g_idx", A[0]), tx("h_idx", dl("gi"), dl("cat"), dl("esp"), A[0]),
      `<p class="pg-lleg">${["gi", "cat", "esp"].map((z) => `<span><i class="pg-dot pg-${z}"></i>${tx("zona")[z]}</span>`).join("")}</p><div class="pg-c" data-g="idx"></div>`));
    // Mes a mes
    const M = X.mes;
    if (M && M.per.length > 12) {
      const k = M.per.length - 1, ant = M.per.indexOf(`${+M.per[k].slice(0, 4) - 1}${M.per[k].slice(4)}`);
      const d = ant >= 0 && M.gi.E[ant] ? (M.gi.E[k] / M.gi.E[ant] - 1) * 100 : null;
      figs.push(figura("mes", tx("g_mes"), tx("h_mes", etMes(M.per[k]), M.gi.E[k], d == null ? "" : d >= 0 ? `${p1(d)} ${tx("mes")}` : `${p1(-d)} ${tx("menys")}`), `<div class="pg-c" data-g="mes"></div>`));
    }
    // Qué vende
    if (caps.length > 1) figs.push(figura("caps", tx("g_caps", ult), tx("h_caps", nomCap(caps[0]), p0((ci(caps[0]) / totE) * 100), nomCap(caps[1]), p0((ci(caps[1]) / totE) * 100)),
      barres(caps.slice(0, 14).map((c) => [nomCap(c), ci(c), p1((ci(c) / totE) * 100)]))));
    // Especialización frente a Cataluña
    const cr = X.caps_ref.cat || {};
    const esp = caps.filter((c) => ci(c) >= 20 && cr[c]).map((c) => [c, (ci(c) / cr[c]) * 100]).sort((a, b) => b[1] - a[1]).slice(0, 12);
    if (esp.length) figs.push(figura("espec", tx("g_espec", ult), tx("h_espec", nomCap(esp[0][0]), p0(esp[0][1])), barres(esp.map(([c, v]) => [nomCap(c), v, `${fmtM(ci(c))} M€`]), p0)));
    // Qué sube y qué baja
    if (n > 1) {
      const dv = Object.keys(F).map((c) => [c, (F[c][i] || 0) - (F[c][i - 1] || 0)]).sort((a, b) => b[1] - a[1]);
      const sel = [...dv.slice(0, 6), ...dv.slice(-6).filter((x) => x[1] < 0)];
      const s = (v) => `${v > 0 ? "+" : ""}${fmt(v, Math.abs(v) < 10 ? 1 : 0)}`;
      figs.push(figura("var", tx("g_var", ult, A[i - 1]), tx("h_var", nomCap(dv[0][0]), s(dv[0][1]), nomCap(dv[dv.length - 1][0]), s(dv[dv.length - 1][1])),
        barres(sel.map(([c, v]) => [nomCap(c), v, "", v >= 0 ? "ex-puja" : "ex-baixa"]), s)));
    }
    // Clientes principales
    const P = X.paisos.E || {}, pv = (c, k = i) => (P[c] || [])[k] || 0;
    const ps = Object.keys(P).filter((c) => pv(c) > 0).sort((a, b) => pv(b) - pv(a));
    const totP = ps.reduce((s, c) => s + pv(c), 0) || 1;
    if (ps.length) {
      const d0 = pv(ps[0], i - 1) ? (pv(ps[0]) / pv(ps[0], i - 1) - 1) * 100 : null;
      figs.push(figura("paisos", tx("g_paisos", ult), tx("h_paisos", nomP(ps[0]), p0((pv(ps[0]) / totP) * 100), d0 == null ? "–" : pct(d0, 1, true)),
        barres(ps.slice(0, 14).map((c) => [nomP(c), pv(c), pv(c, i - 1) ? varTxt((pv(c) / pv(c, i - 1) - 1) * 100) : ""]))));
    }
    // Adónde va cada producto
    const CPa = X.cap_pais || {};
    const top = caps.filter((c) => CPa[c]).slice(0, 6);
    if (top.length) {
      const fila = (c) => `<div class="ex-cp"><p class="ex-cp-n">${nomCap(c)} <small class="pb-n">${fmtM(ci(c))} M€</small></p><p class="ex-cp-b">${CPa[c].map(([p, v], k) => `<span style="width:${v}%" class="ex-cp-${k}" title="${nomP(p)}: ${p1(v)}">${v >= 9 ? `${p}` : ""}</span>`).join("")}</p><p class="ex-cp-l">${CPa[c].slice(0, 3).map(([p, v]) => `${nomP(p)} ${p0(v)}`).join(" · ")}</p></div>`;
      figs.push(figura("cap_pais", tx("g_cap_pais"), tx("h_cap_pais", nomCap(top[0]), nomP(CPa[top[0]][0][0]), p0(CPa[top[0]][0][1])), `<div class="ex-cps">${top.map(fila).join("")}</div>`));
    }
    // Importaciones
    const FI = X.caps.I, cii = (c) => (FI[c] || [])[i] || 0;
    const capsI = Object.keys(FI).filter((c) => cii(c) > 0).sort((a, b) => cii(b) - cii(a));
    const totI = capsI.reduce((s, c) => s + cii(c), 0) || 1;
    if (capsI.length) figs.push(figura("imp", tx("g_imp", ult), tx("h_imp", nomCap(capsI[0]), p0((cii(capsI[0]) / totI) * 100)), barres(capsI.slice(0, 10).map((c) => [nomCap(c), cii(c), p1((cii(c) / totI) * 100)]))));
    // Europa
    figs.push(figura("ue", tx("g_ue"), tx("h_ue", p0(X.ue.gi[i]), p0(X.ue.cat[i])),
      `<p class="pg-lleg">${["gi", "cat", "esp"].map((z) => `<span><i class="pg-dot pg-${z}"></i>${tx("zona")[z]}</span>`).join("")}</p><div class="pg-c" data-g="ue"></div>`));
    // Transporte
    const mo = X.mode.E || {}, tm = Object.values(mo).reduce((s, v) => s + v, 0) || 1;
    const mos = Object.entries(mo).filter(([, v]) => v / tm >= 0.001).sort((a, b) => b[1] - a[1]);
    if (mos.length) figs.push(figura("mode", tx("g_mode"), tx("h_mode", p0(((mo[3] || 0) / tm) * 100), p0(((mo[1] || 0) / tm) * 100)), barres(mos.map(([k, v]) => [(MODE[k] || [k, k])[L()], (v / tm) * 100]), p1)));

    const g = document.getElementById("exp-grafics");
    g.innerHTML = figs.join("");
    const c = (k) => g.querySelector(`[data-g="${k}"]`);
    linies(c("evol"), [{ nom: tx("e"), cls: "ex-e", d: A.map((a, k) => [a, T.gi.E[k]]) }, { nom: tx("i"), cls: "ex-i", d: A.map((a, k) => [a, T.gi.I[k]]) }]);
    linies(c("idx"), ["esp", "cat", "gi"].map((z) => ({ nom: tx("zona")[z], cls: `pg-${z}`, d: ix(z) })), { idx: true });
    linies(c("ue"), ["esp", "cat", "gi"].map((z) => ({ nom: tx("zona")[z], cls: `pg-${z}`, d: A.map((a, k) => [a, X.ue[z][k]]) })), { dec: 1 });
    if (c("mes")) columnes(c("mes"), M.per, M.gi.E);
  }

  function pintaSeccio() {
    const sec = document.getElementById("s-exp");
    if (!sec) return;
    if (!X) {
      if (!carregant) carregant = Promise.all([
        fetch("datos/exportacions.json").then((r) => (r.ok ? r.json() : null)),
        fetch("datos/mon.geojson").then((r) => (r.ok ? r.json() : null)),
        fetch("datos/provincies.geojson").then((r) => (r.ok ? r.json() : null)),
      ]).then(([d, mon, prov]) => {
        if (!d) { sec.hidden = true; return; }
        X = d; X.geo_mon = mon; X.geo_prov = prov;
        if (prov) prov.features = prov.features.filter((f) => X.provs[f.properties.c]);
        est.any = X.ult;
        pintaSeccio();
      }).catch(() => { sec.hidden = true; });
      return;
    }
    document.getElementById("exp-nd").textContent = tx("nd") + (X.prov_anys.length ? ` * ${tx("prov", X.prov_anys.join(", "))}.` : "");
    document.getElementById("exp-esp-tit").textContent = tx("m_esp")[0];
    document.querySelectorAll("#s-exp .ex-font").forEach((e) => { e.textContent = e.dataset.p ? tx("font_p", (X.pob || {}).any || "") : tx("font"); });
    pintaTotsX();
    controls();
    if (X.geo_mon) pintaMon();
    if (X.geo_prov) pintaEsp();
  }
  window.pintaSeccioExportacions = pintaSeccio;
})();
