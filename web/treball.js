"use strict";
/* Feina: sección con cifras y gráficos de la provincia y bloque de la ficha municipal, con las series
   trimestrales de Xifra (D.cj.xt, conjuntura.json). Usa las globales de app.js (D, LANG, fmt, pct, tile,
   grafLinia, etPer) y window.PG (provincia.js). */
(function () {
  const TX = {
    ca: {
      h: "Feina",
      sub: "Taxa d'atur, contractes, llocs de treball i qui treballa, trimestre a trimestre des del 2005. Les gràfiques fan la mitjana de cada any complet.",
      taxa_txt: (p, v, g, n, a) => `El ${p}, la taxa d'atur registral era del <b>${v}</b> (província, ${g}): ${n} aturats de mitjana sobre ${a} persones actives.`,
      taxa_any: (a, v) => `Fa un any, el ${v}.`,
      contr_txt: (n, e, x) => `En els últims quatre trimestres s'hi han registrat <b>${n} contractes</b>${e != null ? `; el ${e} per empreses de treball temporal` : ""}${x != null ? ` i el ${x} a persones estrangeres` : ""}.`,
      llocs_txt: (n, s, a) => `Hi ha <b>${n} llocs de treball</b> (afiliats als centres de treball del municipi): el ${s} als serveis i el ${a} són autònoms.`,
      ocup_txt: (e, j, g) => `Entre els veïns afiliats a la Seguretat Social, el ${e} són estrangers, el ${j} tenen menys de 30 anys i el ${g}, 55 o més.`,
      g_taxa: "Taxa d'atur registral (%)", g_contr: "Contractes per 1.000 habitants i any",
      nf: "Aturats per nivell d'estudis", go: "Aturats per ocupació que busquen", act: "Activitats amb més aturats",
      cat_sub: (a) => `Mitjana del ${a}. Barra de color: municipi; grisa: província.`,
      prov: "Província", font: "Font: Xifra (Diputació de Girona), a partir del Departament d'Empresa i Treball, de la Seguretat Social i de la Xarxa d'Observatoris de Desenvolupament Econòmic Local.",
      x_taxa: (p) => `Taxa d'atur registral, ${p}`, xn_taxa: (v, a) => `dels actius; fa un any, ${v}. ${a} persones actives`,
      x_contr: "Contractes, últims 4 trimestres", xn_contr: (e, x) => `el ${e} per ETT i el ${x} a estrangers`,
      x_llocs: (p) => `Llocs de treball, ${p}`, xn_llocs: (s, a) => `el ${s} als serveis; el ${a} són autònoms`,
      x_ocup: "Afiliats estrangers", xn_ocup: (p, j) => `dels residents afiliats (${p}); el ${j} tenen menys de 30 anys`,
    },
    es: {
      h: "Trabajo",
      sub: "Tasa de paro, contratos, puestos de trabajo y quién trabaja, trimestre a trimestre desde 2005. Los gráficos hacen la media de cada año completo.",
      taxa_txt: (p, v, g, n, a) => `En el ${p}, la tasa de paro registral era del <b>${v}</b> (provincia, ${g}): ${n} parados de media sobre ${a} personas activas.`,
      taxa_any: (a, v) => `Hace un año, el ${v}.`,
      contr_txt: (n, e, x) => `En los últimos cuatro trimestres se han registrado <b>${n} contratos</b>${e != null ? `; el ${e} por empresas de trabajo temporal` : ""}${x != null ? ` y el ${x} a personas extranjeras` : ""}.`,
      llocs_txt: (n, s, a) => `Hay <b>${n} puestos de trabajo</b> (afiliados en los centros de trabajo del municipio): el ${s} en los servicios y el ${a} son autónomos.`,
      ocup_txt: (e, j, g) => `Entre los vecinos afiliados a la Seguridad Social, el ${e} son extranjeros, el ${j} tienen menos de 30 años y el ${g}, 55 o más.`,
      g_taxa: "Tasa de paro registral (%)", g_contr: "Contratos por 1.000 habitantes y año",
      nf: "Parados por nivel de estudios", go: "Parados por ocupación que buscan", act: "Actividades con más parados",
      cat_sub: (a) => `Media de ${a}. Barra de color: municipio; gris: provincia.`,
      prov: "Provincia", font: "Fuente: Xifra (Diputació de Girona), a partir del Departament d'Empresa i Treball, de la Seguridad Social y de la Xarxa d'Observatoris de Desenvolupament Econòmic Local.",
      x_taxa: (p) => `Tasa de paro registral, ${p}`, xn_taxa: (v, a) => `de los activos; hace un año, ${v}. ${a} personas activas`,
      x_contr: "Contratos, últimos 4 trimestres", xn_contr: (e, x) => `el ${e} por ETT y el ${x} a extranjeros`,
      x_llocs: (p) => `Puestos de trabajo, ${p}`, xn_llocs: (s, a) => `el ${s} en los servicios; el ${a} son autónomos`,
      x_ocup: "Afiliados extranjeros", xn_ocup: (p, j) => `de los residentes afiliados (${p}); el ${j} tienen menos de 30 años`,
    },
  };
  const tx = (k, ...a) => { const v = TX[LANG][k]; return typeof v === "function" ? v(...a) : v; };
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  const XT = () => D.cj && D.cj.xt;
  const ultIdx = (s) => { if (!s) return -1; for (let i = s.length - 1; i >= 0; i--) if (s[i] != null) return i; return -1; };
  // Media (o suma) de cada año con los cuatro trimestres
  const perAny = (s, suma) => {
    const x = XT(), r = {}; if (!s) return r;
    const g = {}; x.per.forEach((p, i) => { if (s[i] == null) return; const a = +p.slice(0, 4); (g[a] = g[a] || []).push(s[i]); });
    Object.entries(g).forEach(([a, l]) => { if (l.length === 4) r[a] = suma ? l.reduce((u, v) => u + v, 0) : l.reduce((u, v) => u + v, 0) / 4; });
    return r;
  };
  const suma4 = (s, i) => { if (!s || i < 3) return null; let t = 0; for (let k = i - 3; k <= i; k++) { if (s[k] == null) return null; t += s[k]; } return t; };
  const NOMS_CURTS = { "Treballadors dels serveis de restauració, personals, protecció i venedors": "Restauració, serveis personals i venda" };
  const nomCat = (n) => {
    const c = NOMS_CURTS[n] || n;
    if (LANG !== "es") return c;
    return window.TRAD_XT && window.TRAD_XT[c] ? window.TRAD_XT[c] : c;
  };
  // Barras del municipio frente a la provincia (cuota de cada categoría sobre el total)
  function barresCat(s, m, max) {
    const c = XT().cat, v = c.mun[m.ine] && c.mun[m.ine][s], p = c.prov[s];
    if (!v || !p) return "";
    const tot = (l) => l.reduce((u, x) => u + (x && x[0] != null ? x[0] : 0), 0);
    const tm = tot(v), tp = tot(p);
    if (tm < 20) return "";
    let files = c.noms[s].map((n, i) => ({ n, vm: v[i] && v[i][0] != null ? (v[i][0] / tm) * 100 : null, vp: p[i] && p[i][0] != null ? (p[i][0] / tp) * 100 : null }));
    if (max) files = files.filter((f) => f.vm != null).sort((a, b) => b.vm - a.vm).slice(0, max);
    const mx = Math.max(...files.flatMap((f) => [f.vm || 0, f.vp || 0])) || 1;
    return `<div class="pb">${files.map((f) => `<div class="pb-fila"><span class="pb-nom">${esc(nomCat(f.n))}</span>
      <span class="pb-barres"><span class="pb-b"><b class="pg-bg-gi" style="width:${((f.vm || 0) / mx) * 100}%"></b><em>${pct(f.vm, 0)}</em></span>
      <span class="pb-b"><b class="pg-bg-esp" style="width:${((f.vp || 0) / mx) * 100}%"></b><em>${pct(f.vp, 0)}</em></span></span></div>`).join("")}</div>`;
  }

  window.blocTreball = (m) => {
    const x = XT(); if (!x) return "";
    const s = x.mun[m.ine] || {}, P = x.prov;
    const it = ultIdx(s.taxa), parts = [];
    if (it >= 0) {
      const ip = P.taxa ? P.taxa[it] : null, ia = it >= 4 && s.taxa[it - 4] != null ? s.taxa[it - 4] : null;
      parts.push(`<p class="fx-dada">${tx("taxa_txt", etPer(x.per[it]), pct(s.taxa[it], 1), pct(ip, 1), fmt(s.atur[it]), fmt(s.pa[it]))}${ia != null ? " " + tx("taxa_any", null, pct(ia, 1)) : ""}</p>`);
    }
    const ic = ultIdx(s.contr), c4 = suma4(s.contr, ic);
    if (c4) {
      const pc = (k) => { const a = suma4(s[k] && s[k].map((v, i) => (v != null && s.contr[i] != null ? (v * s.contr[i]) / 100 : null)), ic); return a != null && c4 >= 100 ? pct((a / c4) * 100, 0) : null; };
      parts.push(`<p class="fx-dada">${tx("contr_txt", fmt(c4), pc("contr_ett"), pc("contr_est"))}</p>`);
    }
    const il = ultIdx(s.llocs_h);
    if (il >= 0) {
      const n = s.llocs ? s.llocs[il] : null;
      if (s.llocs_serv && s.llocs_serv[il] != null) parts.push(`<p class="fx-dada">${tx("llocs_txt", fmt(n), pct(s.llocs_serv[il], 0), pct(s.auton && s.auton[il], 0))}</p>`);
    }
    const io = ultIdx(s.ocup_est);
    if (io >= 0) parts.push(`<p class="fx-dada">${tx("ocup_txt", pct(s.ocup_est[io], 0), pct(s.ocup_30 && s.ocup_30[io], 0), pct(s.ocup_55 && s.ocup_55[io], 0))}</p>`);
    if (!parts.length) return "";
    const c = x.cat, any = c && c.any;
    const cats = c ? ["nf", "go"].map((k) => { const b = barresCat(k, m); return b ? `<div><p class="fx-sub2">${tx(k)}</p><p class="fb-sub">${tx("cat_sub", any)}</p>${b}</div>` : ""; }).join("") : "";
    const act = c ? barresCat("act", m, 6) : "";
    return `<section class="fitxa-bloc fx-tre"><h3>${tx("h")}</h3><p class="fb-sub">${tx("sub")}</p>
      ${parts.join("")}
      <div class="fx-dues"><div><p class="fx-sub2">${tx("g_taxa")}</p><div class="grafic g-tre-taxa"></div></div><div><p class="fx-sub2">${tx("g_contr")}</p><div class="grafic g-tre-contr"></div></div></div>
      ${cats ? `<div class="fx-dues">${cats}</div>` : ""}
      ${act ? `<p class="fx-sub2">${tx("act")}</p><p class="fb-sub">${tx("cat_sub", any)}</p>${act}` : ""}
      <p class="fb-font">${tx("font")}</p></section>`;
  };
  window.pintaTreball = (cont, m) => {
    const x = XT(); if (!x || !cont) return;
    const s = x.mun[m.ine] || {}, P = x.prov;
    const g1 = cont.querySelector(".g-tre-taxa"), g2 = cont.querySelector(".g-tre-contr");
    if (g1) grafLinia(g1, [{ nom: m.nom, color: "var(--serie-1)", dades: perAny(s.taxa) }, { nom: tx("prov"), color: "var(--accent)", dades: perAny(P.taxa) }], (v) => pct(v, 1));
    if (g2) grafLinia(g2, [{ nom: m.nom, color: "var(--serie-1)", dades: perAny(s.contr_h, true) }, { nom: tx("prov"), color: "var(--accent)", dades: perAny(P.contr_h, true) }], (v) => fmt(v, 0));
  };

  // --- Sección de la provincia ---------------------------------------------------------
  if (!window.PG) return;
  const ca = {
    tr_taxa: ["Taxa d'atur registral", "Aturats registrats sobre la població activa (%), per trimestre"],
    tr_atur: ["Atur registrat", "Aturats, mitjana del trimestre"],
    tr_contr: ["Contractes", "Contractes registrats al trimestre"],
    tr_contr_pct: ["Qui fa i qui signa els contractes", "% dels contractes del trimestre"], tr_contr_pct_noms: { gi: "Fets per ETT", cat: "Signats per estrangers" },
    tr_llocs: ["Llocs de treball per sector", "% dels llocs de treball, a final de trimestre"], tr_llocs_noms: { gi: "Serveis", cat: "Indústria", esp: "Construcció", bcn: "Agricultura" },
    tr_ocup: ["Qui treballa", "% dels afiliats residents a la província"], tr_ocup_noms: { gi: "Estrangers", cat: "Menys de 30 anys", esp: "55 anys o més" },
    tr_nf: ["Aturats per nivell d'estudis", "% dels aturats"], tr_nf_noms: { gi: "Mitjana de l'últim any", esp: "Últim mes" },
    tr_go: ["Aturats per ocupació", "% dels aturats, segons l'ocupació que busquen"], tr_go_noms: { gi: "Mitjana de l'últim any", esp: "Últim mes" },
    tr_act: ["Aturats per activitat", "% dels aturats, segons l'activitat on treballaven (les 10 primeres)"], tr_act_noms: { gi: "Mitjana de l'últim any", esp: "Últim mes" },
    h_tr_taxa: (v, p, v0, p0, mx, pmx) => `El ${p}, la taxa d'atur registral de la província era del <b>${v}</b>. El ${p0}, del ${v0}; el màxim, el ${pmx}, amb un ${mx}.`,
    h_tr_atur: (v, p, v0) => `El ${p} hi havia de mitjana <b>${v} aturats</b>, ${v0} respecte al mateix trimestre de l'any anterior.`,
    h_tr_contr: (v, p, e) => `En els quatre trimestres fins al ${p} es van registrar <b>${v} contractes</b> a la província${e ? `, ${e} respecte als quatre anteriors` : ""}.`,
    h_tr_contr_pct: (e, x, p) => `El ${p}, el <b>${e}</b> dels contractes els van fer empreses de treball temporal i el <b>${x}</b> els van signar persones estrangeres.`,
    h_tr_llocs: (s, i, p) => `El ${p}, el <b>${s}</b> dels llocs de treball de la província eren als serveis i el ${i} a la indústria.`,
    h_tr_ocup: (e, p, e0, p0) => `El ${p}, el <b>${e}</b> dels afiliats que viuen a la província eren estrangers. El ${p0}, el ${e0}.`,
    h_tr_nf: (v, a) => `El ${a}, el <b>${v}</b> dels aturats de la província no tenien l'ESO acabada.`,
    h_tr_go: (n, v, a) => `El ${a}, el grup més nombrós d'aturats era el de <b>${n.toLowerCase()}</b>: el ${v}.`,
    h_tr_act: (n, v, a) => `El ${a}, l'activitat amb més aturats era <b>${n.toLowerCase()}</b>: el ${v}.`,
    font_tre: "Font: Xifra (Diputació de Girona), a partir del Departament d'Empresa i Treball, de la Seguretat Social i de la Xarxa d'Observatoris de Desenvolupament Econòmic Local",
  };
  const es = {
    tr_taxa: ["Tasa de paro registral", "Parados registrados sobre la población activa (%), por trimestre"],
    tr_atur: ["Paro registrado", "Parados, media del trimestre"],
    tr_contr: ["Contratos", "Contratos registrados en el trimestre"],
    tr_contr_pct: ["Quién hace y quién firma los contratos", "% de los contratos del trimestre"], tr_contr_pct_noms: { gi: "Hechos por ETT", cat: "Firmados por extranjeros" },
    tr_llocs: ["Puestos de trabajo por sector", "% de los puestos de trabajo, a final de trimestre"], tr_llocs_noms: { gi: "Servicios", cat: "Industria", esp: "Construcción", bcn: "Agricultura" },
    tr_ocup: ["Quién trabaja", "% de los afiliados residentes en la provincia"], tr_ocup_noms: { gi: "Extranjeros", cat: "Menos de 30 años", esp: "55 años o más" },
    tr_nf: ["Parados por nivel de estudios", "% de los parados"], tr_nf_noms: { gi: "Media del último año", esp: "Último mes" },
    tr_go: ["Parados por ocupación", "% de los parados, según la ocupación que buscan"], tr_go_noms: { gi: "Media del último año", esp: "Último mes" },
    tr_act: ["Parados por actividad", "% de los parados, según la actividad en la que trabajaban (las 10 primeras)"], tr_act_noms: { gi: "Media del último año", esp: "Último mes" },
    h_tr_taxa: (v, p, v0, p0, mx, pmx) => `En el ${p}, la tasa de paro registral de la provincia era del <b>${v}</b>. En el ${p0}, del ${v0}; el máximo, en el ${pmx}, con un ${mx}.`,
    h_tr_atur: (v, p, v0) => `En el ${p} había de media <b>${v} parados</b>, ${v0} respecto al mismo trimestre del año anterior.`,
    h_tr_contr: (v, p, e) => `En los cuatro trimestres hasta el ${p} se registraron <b>${v} contratos</b> en la provincia${e ? `, ${e} respecto a los cuatro anteriores` : ""}.`,
    h_tr_contr_pct: (e, x, p) => `En el ${p}, el <b>${e}</b> de los contratos los hicieron empresas de trabajo temporal y el <b>${x}</b> los firmaron personas extranjeras.`,
    h_tr_llocs: (s, i, p) => `En el ${p}, el <b>${s}</b> de los puestos de trabajo de la provincia estaban en los servicios y el ${i} en la industria.`,
    h_tr_ocup: (e, p, e0, p0) => `En el ${p}, el <b>${e}</b> de los afiliados que viven en la provincia eran extranjeros. En el ${p0}, el ${e0}.`,
    h_tr_nf: (v, a) => `En ${a}, el <b>${v}</b> de los parados de la provincia no tenían la ESO terminada.`,
    h_tr_go: (n, v, a) => `En ${a}, el grupo más numeroso de parados era el de <b>${n.toLowerCase()}</b>: el ${v}.`,
    h_tr_act: (n, v, a) => `En ${a}, la actividad con más parados era <b>${n.toLowerCase()}</b>: el ${v}.`,
    font_tre: "Fuente: Xifra (Diputació de Girona), a partir del Departament d'Empresa i Treball, de la Seguridad Social y de la Xarxa d'Observatoris de Desenvolupament Econòmic Local",
  };
  window.PG.textos(ca, es);
  const T = () => (LANG === "es" ? es : ca);
  const tp = (k, ...a) => { const v = T()[k]; return typeof v === "function" ? v(...a) : v; };
  const serie = (s) => { const x = XT(); return (s || []).map((v, i) => (v == null ? null : [+x.per[i].slice(0, 4) + (+x.per[i][5] - 1) / 4, x.per[i], v])).filter(Boolean); };
  const ul = (s) => (s && s.length ? s[s.length - 1] : null);
  function grafics() {
    const x = XT(), P = x.prov, G = {};
    const lin = (series, u, dec, extra) => ({ tipus: "linia", u, dec, series, ...extra });
    if (P.taxa) G.tr_taxa = lin({ gi: serie(P.taxa) }, "%", 1);
    if (P.atur) G.tr_atur = lin({ gi: serie(P.atur) }, "", 0, { zero: true });
    if (P.contr) G.tr_contr = lin({ gi: serie(P.contr) }, "", 0, { zero: true });
    if (P.contr_ett) G.tr_contr_pct = lin({ gi: serie(P.contr_ett), cat: serie(P.contr_est) }, "%", 1, { noms: "tr_contr_pct" });
    if (P.llocs_serv) G.tr_llocs = lin({ gi: serie(P.llocs_serv), cat: serie(P.llocs_ind), esp: serie(P.llocs_cons), bcn: serie(P.llocs_agri) }, "%", 1, { noms: "tr_llocs" });
    if (P.ocup_est) G.tr_ocup = lin({ gi: serie(P.ocup_est), cat: serie(P.ocup_30), esp: serie(P.ocup_55) }, "%", 1, { noms: "tr_ocup" });
    const c = x.cat;
    if (c) {
      ["nf", "go", "act"].forEach((k) => {
        const p = c.prov[k]; if (!p) return;
        const t0 = p.reduce((u, v) => u + (v[0] || 0), 0), t1 = p.reduce((u, v) => u + (v[1] || 0), 0);
        let grups = c.noms[k].map((n, i) => ({ g: nomCat(n), gi: t0 && p[i][0] != null ? (p[i][0] / t0) * 100 : null, esp: t1 && p[i][1] != null ? (p[i][1] / t1) * 100 : null }));
        if (k === "act") grups = grups.filter((g) => g.gi != null).sort((a, b) => b.gi - a.gi).slice(0, 10);
        G["tr_" + k] = { tipus: "barres", u: "%", dec: 1, claus: ["gi", "esp"], noms: "tr_" + k, grups, any: c.any };
      });
    }
    return G;
  }
  window.PG.titular((id, sp) => {
    if (!/^tr_/.test(id)) return null;
    const s = sp.series || {}, g = ul(s.gi);
    const x = XT();
    if (id === "tr_taxa" && g) {
      const l = s.gi, y0 = l.find((p) => p[1].endsWith(g[1].slice(4))) || l[0], mx = l.reduce((a, b) => (b[2] > a[2] ? b : a));
      return tp("h_tr_taxa", pct(g[2], 1), etPer(g[1]), pct(y0[2], 1), etPer(y0[1]), pct(mx[2], 1), etPer(mx[1]));
    }
    if (id === "tr_atur" && g) { const l = s.gi, a = l.length > 4 ? l[l.length - 5] : null; return tp("h_tr_atur", fmt(g[2]), etPer(g[1]), a ? pct((g[2] / a[2] - 1) * 100, 1, true) : "–"); }
    if (id === "tr_contr" && g) {
      const l = s.gi.map((p) => p[2]), n = l.length, a = n >= 4 ? l.slice(-4).reduce((u, v) => u + v, 0) : null, b = n >= 8 ? l.slice(-8, -4).reduce((u, v) => u + v, 0) : null;
      return tp("h_tr_contr", fmt(a), etPer(g[1]), b ? pct((a / b - 1) * 100, 1, true) : "");
    }
    if (id === "tr_contr_pct" && g) return tp("h_tr_contr_pct", pct(g[2], 1), pct(ul(s.cat) && ul(s.cat)[2], 0), etPer(g[1]));
    if (id === "tr_llocs" && g) return tp("h_tr_llocs", pct(g[2], 0), pct(ul(s.cat) && ul(s.cat)[2], 0), etPer(g[1]));
    if (id === "tr_ocup" && g) { const a = s.gi[0]; return tp("h_tr_ocup", pct(g[2], 1), etPer(g[1]), pct(a[2], 1), etPer(a[1])); }
    if (sp.tipus === "barres" && x.cat) {
      const gs = sp.grups || [];
      if (id === "tr_nf") { const v = gs.filter((r) => /sense estudis|primaris|sense titulaci|sin estudios|primarios|sin titulaci/i.test(r.g)).reduce((u, r) => u + (r.gi || 0), 0); return tp("h_tr_nf", pct(v, 0), x.cat.any); }
      const top = gs.filter((r) => r.gi != null).sort((a, b) => b.gi - a.gi)[0];
      return top ? tp("h_" + id, top.g, pct(top.gi, 0), x.cat.any) : "";
    }
    return "";
  });
  window.pintaSeccioTreball = () => {
    const sec = document.getElementById("s-tre"), x = XT();
    if (!x || !x.prov) { if (sec) sec.hidden = true; return; }
    if (sec) sec.hidden = false;
    const G = grafics();
    window.PG.pintaGrafics(document.getElementById("tre-grafics"), G, ["tr_taxa", "tr_atur", "tr_contr", "tr_contr_pct", "tr_llocs", "tr_ocup", "tr_nf", "tr_go", "tr_act"], () => "font_tre");
    const el = document.getElementById("tre-xifres"); if (!el) return;
    const P = x.prov, it = ultIdx(P.taxa), ic = ultIdx(P.contr), il = ultIdx(P.llocs_serv), io = ultIdx(P.ocup_est);
    const c4 = suma4(P.contr, ic);
    const pc = (k) => { const a = suma4(P[k] && P[k].map((v, i) => (v != null && P.contr[i] != null ? (v * P.contr[i]) / 100 : null)), ic); return a != null && c4 ? pct((a / c4) * 100, 0) : "–"; };
    el.innerHTML = [
      it >= 0 ? tile(tx("x_taxa", etPer(x.per[it])), pct(P.taxa[it], 1), tx("xn_taxa", it >= 4 ? pct(P.taxa[it - 4], 1) : "–", fmt(P.pa[it]))) : "",
      c4 ? tile(tx("x_contr"), fmt(c4), tx("xn_contr", pc("contr_ett"), pc("contr_est"))) : "",
      il >= 0 && P.llocs_h ? tile(tx("x_llocs", etPer(x.per[il])), fmt(P.llocs && P.llocs[il]), tx("xn_llocs", pct(P.llocs_serv[il], 0), pct(P.auton && P.auton[il], 0))) : "",
      io >= 0 ? tile(tx("x_ocup"), pct(P.ocup_est[io], 1), tx("xn_ocup", etPer(x.per[io]), pct(P.ocup_30 && P.ocup_30[io], 0))) : "",
    ].join("");
  };
})();
