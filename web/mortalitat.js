"use strict";
/* Anàlisi de la mortalitat (Departament de Salut): bloque en la sección Demografia (D.mort.prov, D.mort.x)
   y bloque de la ficha municipal con los datos de la comarca (D.arees.com[comarca]["mc_" + clave]).
   Usa las globales de app.js (D, LANG, fmt, pct, tile) y window.PG (provincia.js). */
(function () {
  const CAUSES = {
    tum: ["Tumors", "Tumores"], circ: ["Aparell circulatori", "Aparato circulatorio"], resp: ["Aparell respiratori", "Aparato respiratorio"],
    nerv: ["Sistema nerviós (Alzheimer, Parkinson…)", "Sistema nervioso (alzhéimer, párkinson…)"], ment: ["Trastorns mentals (demències)", "Trastornos mentales (demencias)"],
    dig: ["Aparell digestiu", "Aparato digestivo"], genit: ["Aparell genitourinari", "Aparato genitourinario"], endo: ["Endocrines (diabetis…)", "Endocrinas (diabetes…)"],
    ext: ["Causes externes (accidents, suïcidis…)", "Causas externas (accidentes, suicidios…)"], inf: ["Infeccioses", "Infecciosas"], mal: ["Mal definides", "Mal definidas"],
    osteo: ["Osteomusculars", "Osteomusculares"],
  };
  const EVIT = {
    pulmo: ["Càncer de pulmó", "Cáncer de pulmón"], ext: ["Altres causes externes (caigudes, ofegaments…)", "Otras causas externas (caídas, ahogamientos…)"],
    isq: ["Infart i cardiopatia isquèmica", "Infarto y cardiopatía isquémica"], cerebro: ["Ictus", "Ictus"], suic: ["Suïcidis", "Suicidios"],
    mama: ["Càncer de mama", "Cáncer de mama"], pneum: ["Pneumònia i grip", "Neumonía y gripe"], traf: ["Accidents de trànsit", "Accidentes de tráfico"],
    hepat: ["Cirrosi alcohòlica", "Cirrosis alcohólica"], hta: ["Hipertensió", "Hipertensión"], perin: ["Causes perinatals", "Causas perinatales"],
    uter: ["Càncer d'úter", "Cáncer de útero"], pell: ["Càncer de pell", "Cáncer de piel"], coll: ["Càncer de coll d'úter", "Cáncer de cuello de útero"],
  };
  const TX = {
    ca: {
      tit: "Com i quan morim", sub: (a) => `Esperança de vida, mortalitat ajustada per edat, causes i morts evitables a la regió sanitària de Girona i a cada comarca, ${a}. L'informe no baixa a municipis.`,
      x_ev: "Esperança de vida", xn_ev: (d, h, c) => `dones ${d}, homes ${h}. Catalunya, ${c}`,
      x_ev65: "Als 65 anys", xn_ev65: (c) => `anys que queden per viure (Catalunya, ${c})`,
      x_tme: "Mortalitat ajustada", xn_tme: (c, p) => `defuncions per 100.000 habitants ajustades per edat (Catalunya, ${c}): un ${p}`,
      x_prem: "Abans dels 75 anys", xn_prem: (c) => `defuncions prematures per 100.000 habitants ajustades per edat (Catalunya, ${c})`,
      x_evit: "Morts evitables", xn_evit: (n, v, c) => `${n} defuncions que una bona prevenció o atenció sanitària podien haver evitat: ${v} per 100.000 habitants (Catalunya, ${c})`,
      x_def: "Defuncions", xn_def: () => `de residents a la regió sanitària`,
      mes: (v) => `${v} més`, menys: (v) => `${v} menys`, anys: "anys",
      mapa: "Veure-ho per comarques al mapa", font: "Font: Departament de Salut, Anàlisi de la mortalitat a Catalunya (registre de mortalitat).",
      mort_causes: ["De què es mor, tenint en compte l'edat", "Taxa estandarditzada per 100.000 habitants per grup de causes"],
      mort_noms: { gi: "Regió sanitària de Girona", cat: "Catalunya" },
      h_mort_causes: (a, g, c) => `Ajustant per edat, a la regió de Girona hi ha <b>${g} defuncions per 100.000 habitants</b> el ${a}, davant de ${c} a Catalunya. Els tumors i les malalties del cor hi pesen més que a la resta del país.`,
      mort_com_ev: ["Esperança de vida per comarca", "Anys de vida en néixer"],
      mortc_noms: { gi: "Comarca" },
      h_mort_com_ev: (a, c1, v1, c2, v2, cat) => `El ${a}, a la <b>${c1}</b> es viu de mitjana <b>${v1} anys</b>; al <b>${c2}</b>, ${v2}. Catalunya, ${cat}.`,
      mort_com_tme: ["Mortalitat ajustada per comarca", "Defuncions per 100.000 habitants, ajustades per edat"],
      h_mort_com_tme: (a, c1, n) => `${n ? `<b>${n}</b> comarques moren per sobre de Catalunya amb una diferència que no s'explica per l'atzar` : "Cap comarca no es diferencia clarament de Catalunya"}${c1 ? `; la que més, el <b>${c1}</b>` : ""} (${a}). La Cerdanya i Osona hi són senceres.`,
      mort_evitable: ["Morts evitables", "Defuncions evitables per 100.000 habitants, per causa"],
      h_mort_evitable: (a, n, v, c) => `<b>${n}</b> morts evitables a la regió el ${a}: ${v} per 100.000 habitants (Catalunya, ${c}). El càncer de pulmó, lligat al tabac, n'és la primera causa.`,
      font_mort: "Font: Departament de Salut, Anàlisi de la mortalitat a Catalunya",
      fx_h: "Mortalitat a la comarca", fx_sub: (c, a) => `${c}, ${a}. El Departament de Salut no publica aquestes dades per municipi.`,
      fx_ev: (v, d, h, c) => `L'esperança de vida en néixer és de <b>${v} anys</b> (dones ${d}, homes ${h}); a Catalunya, ${c}.`,
      fx_tme: (v, i, c) => `Ajustant per edat, hi moren <b>${v} persones per cada 100.000 habitants</b> a l'any. L'índex de mortalitat és ${i} (Catalunya = 100, amb ${c} per 100.000).`,
      fx_causa: (c, v) => `La primera causa són els <b>${c.toLowerCase()}</b> (${v} per 100.000, ajustat per edat).`,
      fx_font: "Font: Departament de Salut, Anàlisi de la mortalitat a Catalunya.",
    },
    es: {
      tit: "Cómo y cuándo morimos", sub: (a) => `Esperanza de vida, mortalidad ajustada por edad, causas y muertes evitables en la región sanitaria de Girona y en cada comarca, ${a}. El informe no baja a municipios.`,
      x_ev: "Esperanza de vida", xn_ev: (d, h, c) => `mujeres ${d}, hombres ${h}. Cataluña, ${c}`,
      x_ev65: "A los 65 años", xn_ev65: (c) => `años que quedan por vivir (Cataluña, ${c})`,
      x_tme: "Mortalidad ajustada", xn_tme: (c, p) => `defunciones por 100.000 habitantes ajustadas por edad (Cataluña, ${c}): un ${p}`,
      x_prem: "Antes de los 75 años", xn_prem: (c) => `defunciones prematuras por 100.000 habitantes ajustadas por edad (Cataluña, ${c})`,
      x_evit: "Muertes evitables", xn_evit: (n, v, c) => `${n} defunciones que una buena prevención o atención sanitaria podían haber evitado: ${v} por 100.000 habitantes (Cataluña, ${c})`,
      x_def: "Defunciones", xn_def: () => `de residentes en la región sanitaria`,
      mes: (v) => `${v} más`, menys: (v) => `${v} menos`, anys: "años",
      mapa: "Verlo por comarcas en el mapa", font: "Fuente: Departament de Salut, Anàlisi de la mortalitat a Catalunya (registro de mortalidad).",
      mort_causes: ["De qué se muere, teniendo en cuenta la edad", "Tasa estandarizada por 100.000 habitantes por grupo de causas"],
      mort_noms: { gi: "Región sanitaria de Girona", cat: "Cataluña" },
      h_mort_causes: (a, g, c) => `Ajustando por edad, en la región de Girona hay <b>${g} defunciones por 100.000 habitantes</b> en ${a}, frente a ${c} en Cataluña. Los tumores y las enfermedades del corazón pesan más que en el resto del país.`,
      mort_com_ev: ["Esperanza de vida por comarca", "Años de vida al nacer"],
      mortc_noms: { gi: "Comarca" },
      h_mort_com_ev: (a, c1, v1, c2, v2, cat) => `En ${a}, en la <b>${c1}</b> se vive de media <b>${v1} años</b>; en el <b>${c2}</b>, ${v2}. Cataluña, ${cat}.`,
      mort_com_tme: ["Mortalidad ajustada por comarca", "Defunciones por 100.000 habitantes, ajustadas por edad"],
      h_mort_com_tme: (a, c1, n) => `${n ? `<b>${n}</b> comarcas mueren por encima de Cataluña con una diferencia que no se explica por el azar` : "Ninguna comarca se diferencia claramente de Cataluña"}${c1 ? `; la que más, el <b>${c1}</b>` : ""} (${a}). La Cerdanya y Osona están enteras.`,
      mort_evitable: ["Muertes evitables", "Defunciones evitables por 100.000 habitantes, por causa"],
      h_mort_evitable: (a, n, v, c) => `<b>${n}</b> muertes evitables en la región en ${a}: ${v} por 100.000 habitantes (Cataluña, ${c}). El cáncer de pulmón, ligado al tabaco, es la primera causa.`,
      font_mort: "Fuente: Departament de Salut, Anàlisi de la mortalitat a Catalunya",
      fx_h: "Mortalidad en la comarca", fx_sub: (c, a) => `${c}, ${a}. El Departament de Salut no publica estos datos por municipio.`,
      fx_ev: (v, d, h, c) => `La esperanza de vida al nacer es de <b>${v} años</b> (mujeres ${d}, hombres ${h}); en Cataluña, ${c}.`,
      fx_tme: (v, i, c) => `Ajustando por edad, mueren <b>${v} personas por cada 100.000 habitantes</b> al año. El índice de mortalidad es ${i} (Cataluña = 100, con ${c} por 100.000).`,
      fx_causa: (c, v) => `La primera causa son los <b>${c.toLowerCase()}</b> (${v} por 100.000, ajustado por edad).`,
      fx_font: "Fuente: Departament de Salut, Anàlisi de la mortalitat a Catalunya.",
    },
  };
  const L = () => (LANG === "es" ? 1 : 0);
  const tx = (k, ...a) => { const v = TX[LANG][k]; return typeof v === "function" ? v(...a) : v; };
  const ult = (o) => { if (!o) return null; const ks = Object.keys(o).sort(); return ks.length ? o[ks[ks.length - 1]] : null; };
  const art = (c) => (/^[AEIOUÀÈÉÍÒÓÚ]/i.test(c) ? `l'${c}` : c); // «el Ripollès», «l'Alt Empordà»

  // ---------- Ficha municipal (datos de la comarca)
  window.blocMortalitat = (m) => {
    const c = m && m.comarca, x = c && D.arees && D.arees.com && D.arees.com[c], a = D.anys && D.anys.mc;
    if (!x || !x.mc_ev0) return "";
    const r = D.mc_ref || {}, rc = (k) => { const o = r["mc_" + k]; const v = o && (o[a] || ult(o)); return v ? v.cat : null; };
    const g = (k) => ult(x["mc_" + k]);
    const causes = ["tum", "circ", "resp", "dem", "ext"].map((k) => [k, g(k)]).filter((y) => y[1] != null).sort((p, q) => q[1] - p[1]);
    const nomC = { tum: ["tumors", "tumores"], circ: ["malalties del cor i la circulació", "enfermedades del corazón y la circulación"], resp: ["malalties respiratòries", "enfermedades respiratorias"], dem: ["demències i Alzheimer", "demencias y alzhéimer"], ext: ["accidents i suïcidis", "accidentes y suicidios"] };
    let t = `<p class="fx-dada">${tx("fx_ev", fmt(g("ev0"), 1), fmt(g("ev0_d"), 1), fmt(g("ev0_h"), 1), fmt(rc("ev0"), 1))}</p>`;
    if (g("tme") != null) t += `<p class="fx-dada">${tx("fx_tme", fmt(g("tme")), fmt(g("ime")), fmt(rc("tme")))}</p>`;
    if (causes.length) t += `<p class="fx-dada">${tx("fx_causa", nomC[causes[0][0]][L()], fmt(causes[0][1]))}</p>`;
    return `<section class="fitxa-bloc fx-mort"><h3>${tx("fx_h")}</h3><p class="fb-sub">${tx("fx_sub", c, a)}</p>${t}<p class="fb-font">${tx("fx_font")}</p></section>`;
  };

  if (!window.PG) return;
  window.PG.textos(
    { mort_causes: TX.ca.mort_causes, mort_noms: TX.ca.mort_noms, mort_com_ev: TX.ca.mort_com_ev, mortc_noms: TX.ca.mortc_noms, mort_com_tme: TX.ca.mort_com_tme, mort_evitable: TX.ca.mort_evitable, font_mort: TX.ca.font_mort },
    { mort_causes: TX.es.mort_causes, mort_noms: TX.es.mort_noms, mort_com_ev: TX.es.mort_com_ev, mortc_noms: TX.es.mortc_noms, mort_com_tme: TX.es.mort_com_tme, mort_evitable: TX.es.mort_evitable, font_mort: TX.es.font_mort });
  window.PG.grup((g, c) => (c && c.startsWith("mc:") ? (CAUSES[c.slice(3)] || [g, g])[L()] : c && c.startsWith("mce:") ? (EVIT[c.slice(4)] || [g, g])[L()] : null));
  window.PG.titular((id, sp) => {
    if (!/^mort_/.test(id)) return null;
    const a = sp.any;
    if (id === "mort_causes") return sp.tme ? tx("h_mort_causes", a, fmt(sp.tme[0]), fmt(sp.tme[1])) : "";
    if (id === "mort_com_ev") { const g = sp.grups, p = g[0], u = g[g.length - 1]; return tx("h_mort_com_ev", a, p.g, fmt(p.gi, 1), u.g, fmt(u.gi, 1), fmt(sp.ref[1], 1)); }
    if (id === "mort_com_tme") { const s = sp.grups.filter((x) => x.s > 0); return tx("h_mort_com_tme", a, s.length ? s[0].g : "", s.length); }
    if (id === "mort_evitable") return sp.tot ? tx("h_mort_evitable", a, fmt(sp.tot[2]), fmt(sp.tot[0], 1), fmt(sp.tot[1], 1)) : "";
    return "";
  });

  window.pintaSeccioMort = () => {
    const M = D.mort, cont = document.getElementById("dem-mort");
    if (!cont) return;
    if (!M || !M.prov || !Object.keys(M.prov).length) { cont.hidden = true; return; }
    const x = M.x || {}, a = x.any;
    const dif = (g, c) => { const d = (g / c - 1) * 100; return d >= 0 ? tx("mes", pct(d, 1)) : tx("menys", pct(-d, 1)); };
    const tiles = [
      x.ev0_t ? tile(tx("x_ev"), `${fmt(x.ev0_t[0], 1)} <small>${tx("anys")}</small>`, tx("xn_ev", fmt(x.ev0_d[0], 1), fmt(x.ev0_h[0], 1), fmt(x.ev0_t[1], 1))) : "",
      x.tme_t ? tile(tx("x_tme"), fmt(x.tme_t[0]), tx("xn_tme", fmt(x.tme_t[1]), dif(x.tme_t[0], x.tme_t[1]))) : "",
      x.ev_tot_t ? tile(tx("x_evit"), fmt(x.ev_tot_n), tx("xn_evit", fmt(x.ev_tot_n), fmt(x.ev_tot_t[0], 1), fmt(x.ev_tot_t[1], 1))) : "",
    ].join("");
    cont.hidden = false;
    cont.innerHTML = `<section class="al dm-mort">
      <h3 class="al-tit">${tx("tit")}</h3><p class="al-sub">${tx("sub", a)}</p>
      <div class="xifres al-xifres">${tiles}</div>
      <div class="pg-graella al-graella" id="dem-mort-g"></div>
      <p class="dm-mort-mapa"><button type="button" class="xip" data-mc="mc_ev0">${tx("mapa")} →</button></p></section>`;
    window.PG.pintaGrafics(document.getElementById("dem-mort-g"), M.prov, ["mort_causes", "mort_com_ev", "mort_com_tme", "mort_evitable"], () => "font_mort");
    const b = cont.querySelector("[data-mc]");
    if (b) b.addEventListener("click", async () => {
      const s = document.getElementById("s-mapa");
      if (window.mapaApi && window.mapaApi.tria) await window.mapaApi.tria(b.dataset.mc);
      if (s) s.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };
})();
