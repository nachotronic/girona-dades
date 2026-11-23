"use strict";
/* Diners públics: sección con cifras y gráficos (D.dp.prov, D.dp.x) y bloque de la ficha municipal (m.dp, m.dp_f).
   Usa las globales de app.js (D, LANG, fmt, pct, tile) y window.PG (provincia.js). */
(function () {
  const TX = {
    ca: {
      h: "Diners públics",
      sub: "Com contracta l'ajuntament i quines subvencions dona, segons els registres públics de la Generalitat.",
      contr: "Contractes de l'ajuntament",
      contr_txt: (a, imp, hab, n, nm, pm) => `El ${a}, l'ajuntament va adjudicar <b>${imp}</b> (${hab} per habitant) en ${n} contractes. ${nm} van ser contractes menors, que no necessiten concurs: el <b>${pm}</b> de l'import.`,
      of_txt: (n, u) => `Dels ${n} contractes no menors amb ofertes publicades des del 2023, <b>${u}</b> només en van rebre una.`,
      grans: "Els contractes més grans", ofertes: (n) => (n === 1 ? "1 oferta" : `${n} ofertes`),
      subv: "Subvencions que dona l'ajuntament",
      subv_txt: (a, imp, n) => `El ${a} en va registrar <b>${imp}</b> en ${n} ajuts.`, subv_fin: "Sobretot per a",
      subv_no: "L'ajuntament no registra les seves subvencions al RAISC.",
      font: "Fonts: Registre públic de contractes, Plataforma de serveis de contractació pública i RAISC (Generalitat).",
      x_subv: (a) => `Subvencions rebudes a la província, ${a}`, xn_subv: (h, c, g) => `${h} per habitant (Catalunya, ${c}); el ${g} les dona la Generalitat`,
      x_menor: (a) => `Contractes menors dels ajuntaments, ${a}`, xn_menor: (c, imp) => `de l'import adjudicat (Catalunya, ${c}); ${imp} adjudicats en total`,
      x_1of: "Concursos amb una sola oferta", xn_1of: (n, a, b) => `de ${n} contractes dels ens locals amb ofertes publicades, ${a}-${b}`,
    },
    es: {
      h: "Dinero público",
      sub: "Cómo contrata el ayuntamiento y qué subvenciones da, según los registros públicos de la Generalitat.",
      contr: "Contratos del ayuntamiento",
      contr_txt: (a, imp, hab, n, nm, pm) => `En ${a}, el ayuntamiento adjudicó <b>${imp}</b> (${hab} por habitante) en ${n} contratos. ${nm} fueron contratos menores, que no necesitan concurso: el <b>${pm}</b> del importe.`,
      of_txt: (n, u) => `De los ${n} contratos no menores con ofertas publicadas desde 2023, <b>${u}</b> solo recibieron una.`,
      grans: "Los contratos más grandes", ofertes: (n) => (n === 1 ? "1 oferta" : `${n} ofertas`),
      subv: "Subvenciones que da el ayuntamiento",
      subv_txt: (a, imp, n) => `En ${a} registró <b>${imp}</b> en ${n} ayudas.`, subv_fin: "Sobre todo para",
      subv_no: "El ayuntamiento no registra sus subvenciones en el RAISC.",
      font: "Fuentes: Registre públic de contractes, Plataforma de serveis de contractació pública y RAISC (Generalitat).",
      x_subv: (a) => `Subvenciones recibidas en la provincia, ${a}`, xn_subv: (h, c, g) => `${h} por habitante (Cataluña, ${c}); el ${g} las da la Generalitat`,
      x_menor: (a) => `Contratos menores de los ayuntamientos, ${a}`, xn_menor: (c, imp) => `del importe adjudicado (Cataluña, ${c}); ${imp} adjudicados en total`,
      x_1of: "Concursos con una sola oferta", xn_1of: (n, a, b) => `de ${n} contratos de los entes locales con ofertas publicadas, ${a}-${b}`,
    },
  };
  const tx = (k, ...a) => { const v = TX[LANG][k]; return typeof v === "function" ? v(...a) : v; };
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  const eur = (v) => {
    if (v == null) return "–";
    if (Math.abs(v) >= 1e6) return `${fmt(v / 1e6, 1)} M€`;
    return `${fmt(v)} €`;
  };
  const fin = (s) => { const t = String(s); return t.charAt(0).toLowerCase() + t.slice(1); };

  window.blocDiners = (m) => {
    const f = m.dp_f;
    if (!f) return "";
    const c = f.contr, p = f.plat, s = f.subv, a = D.anys && D.anys.dp_contr, as = D.anys && D.anys.dp_subv;
    const hab = m.dp && m.dp.dp_contr_hab && m.dp.dp_contr_hab[a], pm = m.dp && m.dp.dp_menor && m.dp.dp_menor[a];
    let ctr = "";
    if (c) ctr += `<p class="fx-dada">${tx("contr_txt", a, eur(c.imp), hab != null ? `${fmt(hab)} €` : "–", fmt(c.n), fmt(c.n_menor), pm != null ? pct(pm, 0) : "–")}</p>`;
    if (p && p.n_of >= 5) ctr += `<p class="fx-dada">${tx("of_txt", fmt(p.n_of), fmt(p.u))}</p>`;
    if (p && p.grans && p.grans.length) ctr += `<p class="fx-sub2">${tx("grans")}</p><ul class="cu-bib dp-grans">${p.grans.map((g) => `<li><span>${esc(g.t)} <small>(${g.a}${g.of ? ", " + tx("ofertes", g.of) : ""})</small></span><span>${eur(g.imp)}</span></li>`).join("")}</ul>`;
    const sub = s ? `<p class="fx-dada">${tx("subv_txt", as, eur(s.imp), fmt(s.n))}</p>${s.fin && s.fin.length ? `<ul class="cu-bib">${s.fin.map(([k, v]) => `<li><span>${esc(k)}</span><span>${eur(v)}</span></li>`).join("")}</ul>` : ""}` : `<p class="fx-dada">${tx("subv_no")}</p>`;
    if (!ctr && !s) return "";
    return `<section class="fitxa-bloc fx-dp"><h3>${tx("h")}</h3><p class="fb-sub">${tx("sub")}</p>
      <div class="fx-dues"><div><p class="fx-sub2">${tx("contr")}</p>${ctr || "–"}</div><div><p class="fx-sub2">${tx("subv")}</p>${sub}</div></div>
      <p class="fb-font">${tx("font")}</p></section>`;
  };

  if (!window.PG) return;
  const ult = (s) => (s && s.length ? s[s.length - 1] : null);
  const ca = {
    dp_subv: ["Subvencions per habitant", "Subvencions i ajuts de les administracions catalanes rebuts per habitant (€)"],
    dp_subv_noms: { gi: "Província de Girona", cat: "Catalunya" },
    h_dp_subv: (v, a, c, v0, a0) => `El ${a}, els beneficiaris de la província van rebre <b>${v} per habitant</b> en subvencions de la Generalitat, la Diputació, els consells comarcals i els ajuntaments (Catalunya, ${c}). El ${a0}, ${v0}.`,
    dp_menor: ["Contractes menors", "Import adjudicat pels ajuntaments en contractes menors (% del total)"],
    dp_menor_noms: { gi: "Ajuntaments de Girona", cat: "Ajuntaments de Catalunya" },
    h_dp_menor: (v, a, c) => `Els ajuntaments gironins van adjudicar el <b>${v}</b> dels diners del ${a} en contractes menors, sense concurs. A Catalunya, el ${c}.`,
    dp_1of: ["Una sola oferta", "Contractes no menors dels ens locals adjudicats amb una sola oferta (%)"],
    dp_1of_noms: { gi: "Ens locals de Girona" },
    h_dp_1of: (v, a) => `El ${a}, el <b>${v}</b> dels concursos dels ajuntaments gironins i les seves empreses van tenir una sola oferta.`,
    font_dp_raisc: "Font: RAISC (Generalitat)", font_dp_reg: "Font: Registre públic de contractes", font_dp_plat: "Font: Plataforma de serveis de contractació pública",
  };
  const es = {
    dp_subv: ["Subvenciones por habitante", "Subvenciones y ayudas de las administraciones catalanas recibidas por habitante (€)"],
    dp_subv_noms: { gi: "Provincia de Girona", cat: "Cataluña" },
    h_dp_subv: (v, a, c, v0, a0) => `En ${a}, los beneficiarios de la provincia recibieron <b>${v} por habitante</b> en subvenciones de la Generalitat, la Diputación, los consejos comarcales y los ayuntamientos (Cataluña, ${c}). En ${a0}, ${v0}.`,
    dp_menor: ["Contratos menores", "Importe adjudicado por los ayuntamientos en contratos menores (% del total)"],
    dp_menor_noms: { gi: "Ayuntamientos de Girona", cat: "Ayuntamientos de Cataluña" },
    h_dp_menor: (v, a, c) => `Los ayuntamientos gerundenses adjudicaron el <b>${v}</b> del dinero de ${a} en contratos menores, sin concurso. En Cataluña, el ${c}.`,
    dp_1of: ["Una sola oferta", "Contratos no menores de los entes locales adjudicados con una sola oferta (%)"],
    dp_1of_noms: { gi: "Entes locales de Girona" },
    h_dp_1of: (v, a) => `En ${a}, el <b>${v}</b> de los concursos de los ayuntamientos gerundenses y sus empresas tuvieron una sola oferta.`,
    font_dp_raisc: "Fuente: RAISC (Generalitat)", font_dp_reg: "Fuente: Registre públic de contractes", font_dp_plat: "Fuente: Plataforma de serveis de contractació pública",
  };
  window.PG.textos(ca, es);
  const T = () => (LANG === "es" ? es : ca);
  const tp = (k, ...a) => { const v = T()[k]; return typeof v === "function" ? v(...a) : v; };
  window.PG.titular((id, sp) => {
    if (!/^dp_/.test(id)) return null;
    const s = sp.series || {}, g = ult(s.gi), c = ult(s.cat);
    if (id === "dp_subv" && g) { const g0 = s.gi[0]; return tp("h_dp_subv", `${fmt(g[2])} €`, g[1], c ? `${fmt(c[2])} €` : "–", `${fmt(g0[2])} €`, g0[1]); }
    if (id === "dp_menor" && g) return tp("h_dp_menor", pct(g[2], 0), g[1], c ? pct(c[2], 0) : "–");
    if (id === "dp_1of" && g) { const x = s.gi.length > 1 && String(g[1]) === String(new Date().getFullYear()) ? s.gi[s.gi.length - 2] : g; return tp("h_dp_1of", pct(x[2], 0), x[1]); }
    return "";
  });

  window.pintaSeccioDp = () => {
    const A = D.dp && D.dp.prov, sec = document.getElementById("s-dp");
    if (!A || !Object.keys(A).length) { if (sec) sec.hidden = true; return; }
    const ids = ["dp_subv", "dp_menor", "dp_1of"].filter((k) => A[k]);
    const font = (id) => (id === "dp_subv" ? "font_dp_raisc" : id === "dp_menor" ? "font_dp_reg" : "font_dp_plat");
    window.PG.pintaGrafics(document.getElementById("dp-grafics"), A, ids, font);
    const x = document.getElementById("dp-xifres"), X = D.dp.x || {};
    if (!x) return;
    const s = X.subv, c = X.contr, p = X.plat;
    x.innerHTML = [
      s ? tile(tx("x_subv", s.any), `${fmt(s.imp)} <small>M€</small>`, tx("xn_subv", `${fmt(s.hab)} €`, `${fmt(s.cat)} €`, pct(s.gen, 0))) : "",
      c ? tile(tx("x_menor", c.any), pct(c.menor, 0), tx("xn_menor", pct(c.menor_cat, 0), `${fmt(c.imp, 0)} M€`)) : "",
      p ? tile(tx("x_1of"), pct(p.u, 0), tx("xn_1of", fmt(p.n), p.des, p.fins)) : "",
    ].join("");
  };
})();
