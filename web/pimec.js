/* Las pymes de Girona en «La província» (Pimec, Anuari de la Pime Catalana): textos, sectores y titulares de pime_*. */
(function () {
  if (!window.PG) return;
  const SECT = {
    primari: ["Sector primari", "Sector primario"], energia: ["Energia, gas, aigua i reciclatge", "Energía, gas, agua y reciclaje"],
    extractives: ["Indústries extractives", "Industrias extractivas"], quimica: ["Indústria química", "Industria química"],
    metall: ["Metal·lúrgia, maquinària i material elèctric", "Metalurgia, maquinaria y material eléctrico"],
    mat_transport: ["Material de transport", "Material de transporte"], alimentaria: ["Indústria alimentària", "Industria alimentaria"],
    textil: ["Tèxtil, cuir i confecció", "Textil, cuero y confección"], paper: ["Paper i arts gràfiques", "Papel y artes gráficas"],
    fusta: ["Cautxú, fusta i altres indústries", "Caucho, madera y otras industrias"], construccio: ["Construcció", "Construcción"],
    comerc: ["Comerç i reparacions", "Comercio y reparaciones"], hoteleria: ["Hoteleria i restauració", "Hostelería y restauración"],
    transport: ["Transport i comunicacions", "Transporte y comunicaciones"], financers: ["Finances, assegurances i lloguers", "Finanzas, seguros y alquileres"],
    serv_empreses: ["Serveis a les empreses", "Servicios a empresas"], serv_persones: ["Serveis a les persones", "Servicios a las personas"],
  };
  const ca = {
    pime_rf: ["Rendibilitat de les pimes", "Benefici abans d'impostos sobre els fons propis (%), mitjana de les pimes"],
    pime_sect_rf: ["Rendibilitat per activitat", "Rendibilitat financera de les pimes de la província per activitat (%)"],
    pime_vab: ["Productivitat de les pimes", "Valor afegit brut per treballador (€), mitjana de les pimes"],
    pime_sect_vab: ["Productivitat per activitat", "Valor afegit i cost de personal per treballador a les pimes de la província (€)"],
    pime_deute: ["Endeutament de les pimes", "Deute (passiu exigible) sobre el total del passiu (%)"],
    pime_vendes: ["Vendes per pime", "Ingressos d'explotació per empresa (€), mitjana de les pimes"],
    pime_noms: { gi: "Girona", bcn: "Barcelona", lle: "Lleida", tar: "Tarragona" },
    pime_s1_noms: { gi: "Rendibilitat financera" },
    pime_s2_noms: { gi: "Valor afegit per treballador", cat: "Cost de personal per treballador" },
    pime_ord: ["la més alta", "la segona més alta", "la segona més baixa", "la més baixa"],
    pime_ord_d: ["la menys endeutada", "la segona menys endeutada", "la segona més endeutada", "la més endeutada"],
    h_pime_rf: (v, a, d, o) => `Les pimes gironines van obtenir una rendibilitat del <b>${v}</b> sobre els seus fons propis el ${a}${d}. És ${o} de les quatre demarcacions catalanes.`,
    pime_dif: (d) => (Math.abs(d) < 0.05 ? ", igual que l'any anterior" : `, ${String(Math.abs(d)).replace(".", ",")} punts ${d > 0 ? "més" : "menys"} que l'any anterior`),
    h_pime_sect_rf: (s, v, s2, v2, a) => `El ${a}, les més rendibles van ser les pimes de <b>${s}</b> (${v}) i les que menys, les de ${s2} (${v2}).`,
    h_pime_vab: (v, a, va, sou, clu, o) => `Cada treballador d'una pime gironina va generar <b>${v} €</b> de valor afegit el ${a}, un ${va} més. En costava ${sou} €: el ${clu} del que produïa. És ${o} de les quatre demarcacions.`,
    h_pime_sect_vab: (s, v, s2, v2, a) => `On més valor afegit genera cada treballador és a <b>${s}</b> (${v} €), i on menys, a ${s2} (${v2} €), dades del ${a}.`,
    h_pime_deute: (v, a, o, v0, a0) => `El deute és el <b>${v}</b> del passiu de les pimes gironines (${a}): Girona és ${o} de les quatre demarcacions. El ${a0} era el ${v0}.`,
    h_pime_vendes: (v, a, va, vab) => `Una pime gironina va facturar de mitjana <b>${v} milions d'euros</b> el ${a}, un ${va} més que l'any anterior. D'aquests ingressos, el ${vab} és valor afegit (salaris i beneficis).`,
    font_pimec: "Font: Pimec, Anuari de la Pime Catalana (PimesDat a partir dels comptes de SABI). Cada any surt d'una edició diferent i no hi ha dades del 2014 ni del 2017",
  };
  const es = {
    pime_rf: ["Rentabilidad de las pymes", "Beneficio antes de impuestos sobre los fondos propios (%), media de las pymes"],
    pime_sect_rf: ["Rentabilidad por actividad", "Rentabilidad financiera de las pymes de la provincia por actividad (%)"],
    pime_vab: ["Productividad de las pymes", "Valor añadido bruto por trabajador (€), media de las pymes"],
    pime_sect_vab: ["Productividad por actividad", "Valor añadido y coste de personal por trabajador en las pymes de la provincia (€)"],
    pime_deute: ["Endeudamiento de las pymes", "Deuda (pasivo exigible) sobre el total del pasivo (%)"],
    pime_vendes: ["Ventas por pyme", "Ingresos de explotación por empresa (€), media de las pymes"],
    pime_noms: { gi: "Girona", bcn: "Barcelona", lle: "Lleida", tar: "Tarragona" },
    pime_s1_noms: { gi: "Rentabilidad financiera" },
    pime_s2_noms: { gi: "Valor añadido por trabajador", cat: "Coste de personal por trabajador" },
    pime_ord: ["la más alta", "la segunda más alta", "la segunda más baja", "la más baja"],
    pime_ord_d: ["la menos endeudada", "la segunda menos endeudada", "la segunda más endeudada", "la más endeudada"],
    h_pime_rf: (v, a, d, o) => `Las pymes gerundenses obtuvieron una rentabilidad del <b>${v}</b> sobre sus fondos propios en ${a}${d}. Es ${o} de las cuatro provincias catalanas.`,
    pime_dif: (d) => (Math.abs(d) < 0.05 ? ", igual que el año anterior" : `, ${String(Math.abs(d)).replace(".", ",")} puntos ${d > 0 ? "más" : "menos"} que el año anterior`),
    h_pime_sect_rf: (s, v, s2, v2, a) => `En ${a}, las más rentables fueron las pymes de <b>${s}</b> (${v}) y las que menos, las de ${s2} (${v2}).`,
    h_pime_vab: (v, a, va, sou, clu, o) => `Cada trabajador de una pyme gerundense generó <b>${v} €</b> de valor añadido en ${a}, un ${va} más. Costaba ${sou} €: el ${clu} de lo que producía. Es ${o} de las cuatro provincias.`,
    h_pime_sect_vab: (s, v, s2, v2, a) => `Donde más valor añadido genera cada trabajador es en <b>${s}</b> (${v} €), y donde menos, en ${s2} (${v2} €), datos de ${a}.`,
    h_pime_deute: (v, a, o, v0, a0) => `La deuda es el <b>${v}</b> del pasivo de las pymes gerundenses (${a}): Girona es ${o} de las cuatro provincias. En ${a0} era el ${v0}.`,
    h_pime_vendes: (v, a, va, vab) => `Una pyme gerundense facturó de media <b>${v} millones de euros</b> en ${a}, un ${va} más que el año anterior. De esos ingresos, el ${vab} es valor añadido (salarios y beneficios).`,
    font_pimec: "Fuente: Pimec, Anuari de la Pime Catalana (PimesDat a partir de las cuentas de SABI). Cada año sale de una edición distinta y no hay datos de 2014 ni de 2017",
  };
  window.PG.textos(ca, es);
  const T = () => (LANG === "es" ? es : ca);
  const tx = (k, ...a) => { const v = T()[k]; return typeof v === "function" ? v(...a) : v; };
  const L = () => (LANG === "ca" ? 0 : 1);
  window.PG.grup((g, c) => (c && c.startsWith("pime:") && SECT[c.slice(5)] ? SECT[c.slice(5)][L()] : null));
  const nom = (g) => (SECT[g.c.slice(5)] || [g.g, g.g])[L()].toLowerCase();
  const ult = (s) => (s && s.length ? s[s.length - 1] : null);
  window.PG.titular((id, sp) => {
    if (!/^pime_/.test(id)) return null;
    const a = sp.abs || {}, g = sp.series ? ult(sp.series.gi) : null;
    if (id === "pime_rf" && g) return tx("h_pime_rf", pct(g[2], 1), g[1], a.d == null ? "" : tx("pime_dif", a.d), tx("pime_ord")[a.rang - 1]);
    if (id === "pime_vab" && g) return tx("h_pime_vab", fmt(g[2]), g[1], pct(a.var, 1), fmt(a.sou), pct(a.clu, 1), tx("pime_ord")[a.rang - 1]);
    if (id === "pime_deute" && g) { const g0 = sp.series.gi[0]; return tx("h_pime_deute", pct(g[2], 1), g[1], tx("pime_ord_d")[a.rang - 1], pct(g0[2], 1), g0[1]); }
    if (id === "pime_vendes" && g) return tx("h_pime_vendes", fmt(g[2] / 1e6, 2), g[1], pct(a.var, 1), pct(a.vab, 1));
    const gs = sp.grups || [];
    if (id === "pime_sect_rf" && gs.length > 1) { const x = gs[0], y = gs[gs.length - 1]; return tx("h_pime_sect_rf", nom(x), pct(x.gi, 1), nom(y), pct(y.gi, 1), sp.any); }
    if (id === "pime_sect_vab" && gs.length > 1) { const x = gs[0], y = gs[gs.length - 1]; return tx("h_pime_sect_vab", nom(x), fmt(x.gi), nom(y), fmt(y.gi), sp.any); }
    return "";
  });
})();
