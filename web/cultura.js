"use strict";
/* Cultura: bloque de la ficha (equipamientos del municipio y sus bibliotecas) y textos de los gráficos cul_* de «La província».
   Usa las globales de app.js (D, LANG, fmt, pct, grafLinia) y window.PG (provincia.js). */
(function () {
  const TX = {
    ca: {
      h: "Cultura",
      sub: (n, a) => `${n} equipaments al cens d'equipaments culturals (${a}). Font: Departament de Cultura.`,
      cap: "Cap equipament al cens d'equipaments culturals del Departament de Cultura.",
      tipus: { civ: "Ateneus, centres cívics i casals", esc: "Teatres, auditoris i sales", bib: "Biblioteques", mus: "Museus i col·leccions", vis: "Sales d'exposicions", arx: "Arxius", cin: "Cinemes", alt: "Altres espais" },
      places: "places",
      bib: "Biblioteques públiques",
      bib_frase: (p, a, ph, pp, c, pc) => `El ${a} les biblioteques públiques del municipi van fer <b>${p} préstecs</b>, ${ph} per habitant (província: ${pp}). Els carnets de biblioteca equivalen al ${c} de la població (província: ${pc}); també en tenen persones d'altres municipis.`,
      sense_bib: "El municipi no té biblioteca pública: si n'hi ha, el servei arriba amb el bibliobús o des de la biblioteca d'un municipi veí.",
      evol: "Préstecs per habitant",
      prov: "Província", cat: "Catalunya",
      prest: "préstecs", mes: (n) => `i ${n} més`,
      prog: (n, a) => `Programa.cat: <b>${n} funcions</b> professionals de teatre, música, circ i dansa el ${a}.`,
      font: "Fonts: Departament de Cultura (cens d'equipaments culturals, DadesBib i Programa.cat).",
      ct: "Centres de culte",
      ct_frase: (n, a, h, hp, nc) => `<b>${n} ${n === "1" ? "centre de culte actiu" : "centres de culte actius"}</b> el ${a}, ${h} per 10.000 habitants (província: ${hp})${nc ? `; ${nc} no són catòlics` : ""}.`,
      ct_cap: (a) => `Cap centre de culte actiu registrat el ${a}.`,
      ct_font: "Font: Generalitat, Direcció General d'Afers Religiosos.",
    },
    es: {
      h: "Cultura",
      sub: (n, a) => `${n} equipamientos en el censo de equipamientos culturales (${a}). Fuente: Departament de Cultura.`,
      cap: "Ningún equipamiento en el censo de equipamientos culturales del Departament de Cultura.",
      tipus: { civ: "Ateneos, centros cívicos y casales", esc: "Teatros, auditorios y salas", bib: "Bibliotecas", mus: "Museos y colecciones", vis: "Salas de exposiciones", arx: "Archivos", cin: "Cines", alt: "Otros espacios" },
      places: "plazas",
      bib: "Bibliotecas públicas",
      bib_frase: (p, a, ph, pp, c, pc) => `En ${a} las bibliotecas públicas del municipio hicieron <b>${p} préstamos</b>, ${ph} por habitante (provincia: ${pp}). Los carnés de biblioteca equivalen al ${c} de la población (provincia: ${pc}); también los tienen personas de otros municipios.`,
      sense_bib: "El municipio no tiene biblioteca pública: si hay servicio, llega con el bibliobús o desde la biblioteca de un municipio vecino.",
      evol: "Préstamos por habitante",
      prov: "Provincia", cat: "Cataluña",
      prest: "préstamos", mes: (n) => `y ${n} más`,
      prog: (n, a) => `Programa.cat: <b>${n} funciones</b> profesionales de teatro, música, circo y danza en ${a}.`,
      font: "Fuentes: Departament de Cultura (censo de equipamientos culturales, DadesBib y Programa.cat).",
      ct: "Centros de culto",
      ct_frase: (n, a, h, hp, nc) => `<b>${n} ${n === "1" ? "centro de culto activo" : "centros de culto activos"}</b> en ${a}, ${h} por 10.000 habitantes (provincia: ${hp})${nc ? `; ${nc} no son católicos` : ""}.`,
      ct_cap: (a) => `Ningún centro de culto activo registrado en ${a}.`,
      ct_font: "Fuente: Generalitat, Direcció General d'Afers Religiosos.",
    },
  };
  // Confesiones (nombre de la Generalitat, en catalán) -> castellano
  const CONF_ES = { "Església catòlica": "Iglesia católica", "Esglésies Evangèliques": "Iglesias evangélicas", "Islam": "Islam", "Budisme": "Budismo",
    "Testimonis cristians de Jehovà": "Testigos cristianos de Jehová", "Esglésies orientals": "Iglesias orientales (ortodoxas)", "Altres": "Otras",
    "Sikhisme": "Sijismo", "Església Adventista del Setè Dia": "Iglesia Adventista del Séptimo Día", "Fe Bahà'í": "Fe bahaí", "Hinduisme": "Hinduismo",
    "Església de Jesucrist dels Sants dels Darrers Dies": "Iglesia de Jesucristo de los Santos de los Últimos Días", "Judaisme": "Judaísmo",
    "Esglésies Ortodoxes": "Iglesias ortodoxas", "Taoisme": "Taoísmo" };
  const CONF_CA = { "Esglésies orientals": "Esglésies orientals (ortodoxes)" };
  window.nomConfessio = (c) => (LANG === "es" ? CONF_ES[c] || c : CONF_CA[c] || c);
  const tx = (k, ...a) => { const v = TX[LANG][k]; return typeof v === "function" ? v(...a) : v; };
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  // «TEATRE MUNICIPAL DE GIRONA» -> «Teatre Municipal de Girona»
  const MIN = new Set(["de", "del", "dels", "d", "la", "les", "el", "els", "l", "i", "y", "a", "en", "per", "s"]);
  const nom = (s) => (s === s.toUpperCase() ? s.toLowerCase().replace(/(^|[\s'’(-])([\p{L}]+)/gu, (m, p, w, i) => p + (i > 0 && MIN.has(w) ? w : w[0].toUpperCase() + w.slice(1))) : s);
  const MAX = 10;
  const ref = (k, a, z) => { const r = D.cul_ref && D.cul_ref[k] && D.cul_ref[k][a]; return r ? r[z] : null; };
  const val = (m, k, a) => (m.cul && m.cul[k] && m.cul[k][a] != null ? m.cul[k][a] : null);

  window.blocCultura = (m) => {
    const ae = D.anys && D.anys.cul_eq, ab = D.anys && D.anys.cul_bib, ap = D.anys && D.anys.cul_prog;
    if (!ae && !ab) return "";
    const f = m.cul_f || {}, eq = f.eq || [];
    const grups = {};
    eq.forEach(([n, t, st, af]) => (grups[t] = grups[t] || []).push([n, st, af]));
    const ordre = ["esc", "cin", "mus", "vis", "civ", "bib", "arx", "alt"];
    const llista = ordre.filter((t) => grups[t]).map((t) => `<li><span class="cu-t">${tx("tipus")[t]} <small>${grups[t].length}</small></span>
      <span class="cu-n">${grups[t].slice(0, MAX).map(([n, st, af]) => `${esc(nom(n))}${af ? ` <small>(${fmt(af)} ${tx("places")})</small>` : ""}`).join(" · ")}${grups[t].length > MAX ? ` <small>${tx("mes", grups[t].length - MAX)}</small>` : ""}</span></li>`).join("");
    const p = val(m, "b_prest", ab);
    const bibs = (f.bib || []).map(([n, s]) => { const v = s[ab]; return v != null ? `<li><span>${esc(n)}</span><span>${fmt(v)} ${tx("prest")}</span></li>` : ""; }).join("");
    const pn = val(m, "p_n", ap);
    return `<section class="fitxa-bloc fx-cul"><h3>${tx("h")}</h3><p class="fb-sub">${eq.length ? tx("sub", fmt(eq.length), ae) : tx("cap")}</p>
      <div class="fx-dues"><div>${llista ? `<ul class="cu-eq">${llista}</ul>` : ""}${pn ? `<p class="fx-dada">${tx("prog", fmt(pn), ap)}</p>` : ""}</div>
      <div><p class="fx-sub2">${tx("bib")}</p>
      ${p != null ? `<p class="fx-dada">${tx("bib_frase", fmt(p), ab, fmt(val(m, "b_prest_h", ab), 2), fmt(ref("b_prest_h", ab, "gi"), 2), pct(val(m, "b_carn_p", ab), 0), pct(ref("b_carn_p", ab, "gi"), 0))}</p>
        ${bibs ? `<ul class="cu-bib">${bibs}</ul>` : ""}
        <figure class="grafic"><figcaption><span>${tx("evol")}</span></figcaption><div class="g-cul"></div></figure>` : ab ? `<p class="fx-dada">${tx("sense_bib")}</p>` : ""}</div></div>
      <p class="fb-font">${tx("font")}</p>${blocCulte(m)}</section>`;
  };
  const blocCulte = (m) => {
    const a = D.anys && D.anys.cul_ct;
    if (!a) return "";
    const ct = (m.cul_f || {}).ct || [], n = val(m, "ct_n", a);
    const grups = {};
    ct.forEach(([nm, , c]) => (grups[c] = grups[c] || []).push(nm));
    const ordre = Object.keys(grups).sort((x, y) => (x === "Església catòlica" ? -1 : y === "Església catòlica" ? 1 : grups[y].length - grups[x].length));
    const llista = ordre.map((c) => `<li><span class="cu-t">${esc(nomConfessio(c))} <small>${grups[c].length}</small></span>
      <span class="cu-n">${grups[c].slice(0, MAX).map(esc).join(" · ")}${grups[c].length > MAX ? ` <small>${tx("mes", grups[c].length - MAX)}</small>` : ""}</span></li>`).join("");
    const nc = n ? n - (val(m, "ct_cat", a) || 0) : 0;
    return `<p class="fx-sub2">${tx("ct")}</p>
      <p class="fx-dada">${n ? tx("ct_frase", fmt(n), a, fmt(val(m, "ct_h", a), 1), fmt(ref("ct_h", a, "gi"), 1), nc ? fmt(nc) : "") : tx("ct_cap", a)}</p>
      ${llista ? `<ul class="cu-eq">${llista}</ul>` : ""}<p class="fb-font">${tx("ct_font")}</p>`;
  };
  window.pintaCultura = (cont, m) => {
    const g = cont && cont.querySelector(".g-cul");
    if (!g || !m.cul || !m.cul.b_prest_h) return;
    const R = (D.cul_ref || {}).b_prest_h || {}, z = (k) => Object.fromEntries(Object.entries(R).map(([a, o]) => [a, o[k]]).filter(([, v]) => v != null));
    grafLinia(g, [
      { nom: m.nom, color: "var(--serie-1)", dades: m.cul.b_prest_h },
      { nom: tx("prov"), color: "var(--accent)", dades: z("gi") },
      { nom: tx("cat"), color: "var(--text-3)", dades: z("cat") },
    ], (v) => fmt(v, 2));
  };

  // «La província»
  if (!window.PG) return;
  const ca = {
    cul_prest: ["Préstecs de les biblioteques", "Préstecs de les biblioteques públiques per habitant"],
    h_cul_prest: (v, a, c, v0, a0) => `Les biblioteques públiques de la província van fer <b>${v} préstecs per habitant</b> el ${a} (Catalunya, ${c}). El ${a0} en feien ${v0}; el 2020, amb les biblioteques tancades, van caure a la meitat.`,
    cul_carn: ["Carnet de biblioteca", "Persones amb carnet de biblioteca (% de la població)"],
    h_cul_carn: (v, a, c) => `El <b>${v}</b> dels habitants de la província té carnet de biblioteca (${a}), més que a Catalunya (${c}).`,
    cul_vis: ["Visites a les biblioteques", "Visites a les biblioteques públiques per habitant"],
    h_cul_vis: (v, a, v19) => `<b>${v} visites per habitant</b> el ${a}: encara per sota de les ${v19} del 2019, abans de la pandèmia.`,
    cul_desp: ["Despesa en biblioteques", "Despesa de funcionament de les biblioteques públiques per habitant (€)"],
    h_cul_desp: (v, a, c) => `Les biblioteques públiques de la província van gastar <b>${v} € per habitant</b> el ${a} (Catalunya, ${c} €), sobretot en personal.`,
    cul_eq: ["Equipaments culturals", "Equipaments al cens d'equipaments culturals, per tipus"],
    cul_eq_noms: { gi: "Província de Girona" },
    h_cul_eq: (n, a, g, gn) => `La província té <b>${n} equipaments culturals</b> al cens del Departament de Cultura (${a}). Els més nombrosos són els ${g}: ${gn}.`,
    cul_prog: ["Teatre i música de Programa.cat", "Funcions professionals contractades pels ajuntaments amb ajut de Programa.cat"],
    cul_prog_noms: { gi: "Província de Girona" },
    h_cul_prog: (n, a, m, e) => `El ${a}, ${m} municipis de la província van programar <b>${n} funcions</b> de teatre, música, circ i dansa amb Programa.cat, amb uns catxets de ${e} €.`,
    cul_prog_amb: ["Què es programa", "Funcions de Programa.cat per disciplina (%)"],
    h_cul_prog_amb: (g, v, a) => `El ${a}, el <b>${v}</b> de les funcions de Programa.cat a la província van ser de ${g}.`,
    ce: { civ: "Ateneus, centres cívics i casals", esc: "Teatres, auditoris i sales", bib: "Biblioteques", mus: "Museus i col·leccions", vis: "Sales d'exposicions", arx: "Arxius", cin: "Cinemes", alt: "Altres espais" },
    cp: { teatre: "Teatre", musica: "Música", circ: "Circ", dansa: "Dansa" },
    font_bib: "Font: Departament de Cultura, estadístiques de biblioteques públiques (DadesBib)",
    font_eq: "Font: Departament de Cultura, cens d'equipaments culturals",
    font_prog: "Font: Departament de Cultura, Programa.cat",
    cul_ct: ["Centres de culte per confessió", "Centres de culte actius a la província, per confessió"],
    cul_ct_noms: { gi: "Província de Girona" },
    h_cul_ct: (n, a, c, p) => `La província tenia <b>${n} centres de culte actius</b> el ${a}. El ${p} són de l'Església catòlica; la segona confessió són les ${c}.`,
    cul_ct_nocat: ["Culte no catòlic", "Centres de culte d'altres confessions que la catòlica (%)"],
    cul_ct_nocat_noms: { gi: "Província de Girona", cat: "Catalunya" },
    h_cul_ct_nocat: (v, a, c) => `El <b>${v}</b> dels centres de culte de la província no són catòlics (${a}); a Catalunya, el ${c}.`,
    font_ct: "Font: Generalitat, Direcció General d'Afers Religiosos (centres de culte de Catalunya)",
  };
  const es = {
    cul_prest: ["Préstamos de las bibliotecas", "Préstamos de las bibliotecas públicas por habitante"],
    h_cul_prest: (v, a, c, v0, a0) => `Las bibliotecas públicas de la provincia hicieron <b>${v} préstamos por habitante</b> en ${a} (Cataluña, ${c}). En ${a0} hacían ${v0}; en 2020, con las bibliotecas cerradas, cayeron a la mitad.`,
    cul_carn: ["Carné de biblioteca", "Personas con carné de biblioteca (% de la población)"],
    h_cul_carn: (v, a, c) => `El <b>${v}</b> de los habitantes de la provincia tiene carné de biblioteca (${a}), más que en Cataluña (${c}).`,
    cul_vis: ["Visitas a las bibliotecas", "Visitas a las bibliotecas públicas por habitante"],
    h_cul_vis: (v, a, v19) => `<b>${v} visitas por habitante</b> en ${a}: aún por debajo de las ${v19} de 2019, antes de la pandemia.`,
    cul_desp: ["Gasto en bibliotecas", "Gasto de funcionamiento de las bibliotecas públicas por habitante (€)"],
    h_cul_desp: (v, a, c) => `Las bibliotecas públicas de la provincia gastaron <b>${v} € por habitante</b> en ${a} (Cataluña, ${c} €), sobre todo en personal.`,
    cul_eq: ["Equipamientos culturales", "Equipamientos en el censo de equipamientos culturales, por tipo"],
    cul_eq_noms: { gi: "Provincia de Girona" },
    h_cul_eq: (n, a, g, gn) => `La provincia tiene <b>${n} equipamientos culturales</b> en el censo del Departament de Cultura (${a}). Los más numerosos son los ${g}: ${gn}.`,
    cul_prog: ["Teatro y música de Programa.cat", "Funciones profesionales contratadas por los ayuntamientos con ayuda de Programa.cat"],
    cul_prog_noms: { gi: "Provincia de Girona" },
    h_cul_prog: (n, a, m, e) => `En ${a}, ${m} municipios de la provincia programaron <b>${n} funciones</b> de teatro, música, circo y danza con Programa.cat, con unos cachés de ${e} €.`,
    cul_prog_amb: ["Qué se programa", "Funciones de Programa.cat por disciplina (%)"],
    h_cul_prog_amb: (g, v, a) => `En ${a}, el <b>${v}</b> de las funciones de Programa.cat en la provincia fueron de ${g}.`,
    ce: { civ: "Ateneos, centros cívicos y casales", esc: "Teatros, auditorios y salas", bib: "Bibliotecas", mus: "Museos y colecciones", vis: "Salas de exposiciones", arx: "Archivos", cin: "Cines", alt: "Otros espacios" },
    cp: { teatre: "Teatro", musica: "Música", circ: "Circo", dansa: "Danza" },
    font_bib: "Fuente: Departament de Cultura, estadísticas de bibliotecas públicas (DadesBib)",
    font_eq: "Fuente: Departament de Cultura, censo de equipamientos culturales",
    font_prog: "Fuente: Departament de Cultura, Programa.cat",
    cul_ct: ["Centros de culto por confesión", "Centros de culto activos en la provincia, por confesión"],
    cul_ct_noms: { gi: "Provincia de Girona" },
    h_cul_ct: (n, a, c, p) => `La provincia tenía <b>${n} centros de culto activos</b> en ${a}. El ${p} son de la Iglesia católica; la segunda confesión son las ${c}.`,
    cul_ct_nocat: ["Culto no católico", "Centros de culto de confesiones distintas de la católica (%)"],
    cul_ct_nocat_noms: { gi: "Provincia de Girona", cat: "Cataluña" },
    h_cul_ct_nocat: (v, a, c) => `El <b>${v}</b> de los centros de culto de la provincia no son católicos (${a}); en Cataluña, el ${c}.`,
    font_ct: "Fuente: Generalitat, Direcció General d'Afers Religiosos (centros de culto de Cataluña)",
  };
  window.PG.textos(ca, es);
  const T = () => (LANG === "es" ? es : ca);
  const tp = (k, ...a) => { const v = T()[k]; return typeof v === "function" ? v(...a) : v; };
  window.PG.grup((g, c) => (c && c.startsWith("ct:") ? nomConfessio(c.slice(3)) : c && c.startsWith("ce:") ? T().ce[c.slice(3)] || g : c && c.startsWith("cp:") ? T().cp[c.slice(3)] || g : null));
  const ult = (s) => (s && s.length ? s[s.length - 1] : null);
  window.PG.titular((id, sp) => {
    if (!/^cul_/.test(id)) return null;
    const s = sp.series || {}, g = ult(s.gi), c = ult(s.cat);
    if (id === "cul_prest" && g) { const g0 = s.gi[0]; return tp("h_cul_prest", fmt(g[2], 2), g[1], c ? fmt(c[2], 2) : "–", fmt(g0[2], 2), g0[1]); }
    if (id === "cul_carn" && g) return tp("h_cul_carn", pct(g[2], 0), g[1], c ? pct(c[2], 0) : "–");
    if (id === "cul_vis" && g) { const g19 = s.gi.find((x) => x[1] === "2019"); return tp("h_cul_vis", fmt(g[2], 1), g[1], g19 ? fmt(g19[2], 1) : "–"); }
    if (id === "cul_desp" && g) return tp("h_cul_desp", fmt(g[2], 2), g[1], c ? fmt(c[2], 2) : "–");
    if (id === "cul_eq" && sp.grups && sp.grups.length) { const m = [...sp.grups].filter(x => !/alt$/.test(x.g)).sort((a, b) => b.gi - a.gi)[0]; return tp("h_cul_eq", fmt(sp.total), sp.any, T().ce[m.g].toLowerCase(), fmt(m.gi)); }
    if (id === "cul_prog" && sp.abs) return tp("h_cul_prog", fmt(sp.abs.n), sp.abs.any, fmt(sp.abs.munis), fmt(sp.abs.eur));
    if (id === "cul_prog_amb" && sp.grups && sp.grups.length) return tp("h_cul_prog_amb", T().cp[sp.grups[0].c.slice(3)].toLowerCase(), pct(sp.grups[0].gi, 0), sp.any);
    if (id === "cul_ct" && sp.grups && sp.grups.length > 1) { const c0 = sp.grups.find((x) => x.g === "Església catòlica") || sp.grups[0], c1 = sp.grups.filter((x) => x !== c0)[0];
      return tp("h_cul_ct", fmt(sp.total), sp.any, nomConfessio(c1.g).toLowerCase(), pct(100 * c0.gi / sp.total, 0)); }
    if (id === "cul_ct_nocat" && g) return tp("h_cul_ct_nocat", pct(g[2], 0), g[1], c ? pct(c[2], 0) : "–");
    return "";
  });
})();
