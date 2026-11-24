"use strict";
/* Resumen de cada municipio en la ficha: frases con los datos más relevantes, lo que lo hace
   distinto dentro de la provincia y una tabla de datos clave con año y fuente.
   También añade a la ficha la evolución de la población, el IRPF (AEAT) y el presupuesto liquidado.
   Usa las globales de app.js (D, LANG, t, fmt, pct, etPer, grafLinia, esforc, val) y window.indMapa (mapa.js). */

(function () {
  const TX = {
    ca: {
      resum: "En resum", destaca: "El que el fa diferent", taula: "Dades clau",
      c_ind: "Indicador", c_val: "Municipi", c_prov: "Província", c_pos: "Posició", c_any: "Any", c_font: "Font",
      nota_pos: "Posició entre els municipis de la província, de més a menys.",
      mes_alt: "més alt", mes_baix: "més baix", de: (n) => `de ${n}`,
      pob: (nom, p, a, rk, n, sh) => `<b>${nom}</b> té <b>${p} habitants</b>${a ? ` (${a})` : ""}: ${rk === 1 ? "és el municipi més poblat de la província" : `és el ${ord(rk)} municipi més poblat dels ${n} de la província`} i hi viu el ${sh} de la població.`,
      creix: (a0, g, d, v, pv) => `Des del ${a0} ${g ? "ha guanyat" : "ha perdut"} ${d} habitants (${v}), quan el conjunt de la província ha variat un ${pv}.`,
      renda: (a, v, d, sobre, rk, n) => `La renda neta per persona (${a}) és de <b>${v}</b>, ${d} ${sobre ? "per sobre" : "per sota"} de la mitjana provincial: és el ${ord(rk)} de ${n}.`,
      renda_igual: (a, v, rk, n) => `La renda neta per persona (${a}) és de <b>${v}</b>, a la mitjana provincial: és el ${ord(rk)} de ${n}.`,
      lloguer: (v, var5, esf) => `El lloguer mitjà és de <b>${v} al mes</b>${var5 ? ` (${var5} des del 2020)` : ""}${esf ? ` i s'endú el ${esf} de la renda d'una llar` : ""}.`,
      gent: (e, g) => `El ${e} dels veïns té nacionalitat estrangera i el ${g} té 65 anys o més.`,
      hut: (v) => `Hi ha ${v} habitatges d'ús turístic per cada 100 habitatges.`,
      atur: (v, p, pv) => `L'atur registrat equival al ${v} de la població de 15 a 64 anys (${p}), davant del ${pv} a la província.`,
      h_pob: "Població", h_pob_sub: (a0, a1) => `Habitants a 1 de gener, ${a0}-${a1}. Font: INE, padró municipal.`, estrangers: "Nacionalitat estrangera (fins al 2022)",
      h_irpf: "Renda declarada a Hisenda", h_irpf_sub: (a, d) => `IRPF ${a}: ${d} declaracions. Font: Agència Tributària.`,
      bruta: "Renda bruta mitjana", disp: "Renda disponible mitjana", tipus: "Tipus efectiu (quota / renda bruta)",
      comp: "D'on surt la renda declarada", treball: "Treball i pensions", activitats: "Activitats econòmiques", capital: "Capital mobiliari", immobles: "Lloguers i immobles", guanys: "Guanys patrimonials", altres: "Altres",
      h_pres: "Pressupost de l'ajuntament", h_pres_sub: (a) => `Liquidació del ${a}, euros per habitant. Font: Generalitat de Catalunya, liquidació dels pressupostos dels ens locals.`,
      ingressos: "Ingressos", despeses: "Despeses", saldo: "Saldo", per_hab: "€ per habitant", prov_mitjana: "mitjana provincial",
      evol_pres: "Ingressos i despeses per habitant",
      evol_irpf: "Renda bruta mitjana per declaració", esp: "Espanya", h_irpf_var: (a, v, p) => `Des del 2013, la renda declarada mitjana ha crescut un <b>${v}</b> (província: ${p}).`,
      h_com: "Comerç", h_com_sub: (a, n, s) => `Cens d'establiments comercials ${a}: ${n} establiments i ${s} m² de superfície de venda. Font: Generalitat de Catalunya.`,
      com_sect: "Establiments per 1.000 habitants, per sector", com_evol: "Establiments per 1.000 habitants", cat: "Catalunya",
      com_buits: (b, tot, p, pc) => `Locals buits (2022): <b>${b} de ${tot}</b> locals en planta baixa, el ${p}. Mitjana de les ciutats catalanes: ${pc}.`,
      com_grans: "Grans establiments amb llicència comercial", m2: "m²",
      sect: { alim: "Alimentació", qna: "Quotidià no alimentari", pers: "Roba i complements", llar: "Equipament de la llar", lleure: "Lleure i cultura", auto: "Automoció i carburants", mixt: "Comerç mixt", altres: "Altres" },
    },
    es: {
      resum: "En resumen", destaca: "Lo que lo hace distinto", taula: "Datos clave",
      c_ind: "Indicador", c_val: "Municipio", c_prov: "Provincia", c_pos: "Posición", c_any: "Año", c_font: "Fuente",
      nota_pos: "Posición entre los municipios de la provincia, de más a menos.",
      mes_alt: "más alto", mes_baix: "más bajo", de: (n) => `de ${n}`,
      pob: (nom, p, a, rk, n, sh) => `<b>${nom}</b> tiene <b>${p} habitantes</b>${a ? ` (${a})` : ""}: ${rk === 1 ? "es el municipio más poblado de la provincia" : `es el ${ord(rk)} municipio más poblado de los ${n} de la provincia`} y en él vive el ${sh} de la población.`,
      creix: (a0, g, d, v, pv) => `Desde ${a0} ha ${g ? "ganado" : "perdido"} ${d} habitantes (${v}), mientras que el conjunto de la provincia ha variado un ${pv}.`,
      renda: (a, v, d, sobre, rk, n) => `La renta neta por persona (${a}) es de <b>${v}</b>, ${d} ${sobre ? "por encima" : "por debajo"} de la media provincial: es el ${ord(rk)} de ${n}.`,
      renda_igual: (a, v, rk, n) => `La renta neta por persona (${a}) es de <b>${v}</b>, en la media provincial: es el ${ord(rk)} de ${n}.`,
      lloguer: (v, var5, esf) => `El alquiler medio es de <b>${v} al mes</b>${var5 ? ` (${var5} desde 2020)` : ""}${esf ? ` y se lleva el ${esf} de la renta de un hogar` : ""}.`,
      gent: (e, g) => `El ${e} de los vecinos tiene nacionalidad extranjera y el ${g} tiene 65 años o más.`,
      hut: (v) => `Hay ${v} viviendas de uso turístico por cada 100 viviendas.`,
      atur: (v, p, pv) => `El paro registrado equivale al ${v} de la población de 15 a 64 años (${p}), frente al ${pv} en la provincia.`,
      h_pob: "Población", h_pob_sub: (a0, a1) => `Habitantes a 1 de enero, ${a0}-${a1}. Fuente: INE, padrón municipal.`, estrangers: "Nacionalidad extranjera (hasta 2022)",
      h_irpf: "Renta declarada a Hacienda", h_irpf_sub: (a, d) => `IRPF ${a}: ${d} declaraciones. Fuente: Agencia Tributaria.`,
      bruta: "Renta bruta media", disp: "Renta disponible media", tipus: "Tipo efectivo (cuota / renta bruta)",
      comp: "De dónde sale la renta declarada", treball: "Trabajo y pensiones", activitats: "Actividades económicas", capital: "Capital mobiliario", immobles: "Alquileres e inmuebles", guanys: "Ganancias patrimoniales", altres: "Otras",
      h_pres: "Presupuesto del ayuntamiento", h_pres_sub: (a) => `Liquidación de ${a}, euros por habitante. Fuente: Generalitat de Catalunya, liquidación de los presupuestos de los entes locales.`,
      ingressos: "Ingresos", despeses: "Gastos", saldo: "Saldo", per_hab: "€ por habitante", prov_mitjana: "media provincial",
      evol_pres: "Ingresos y gastos por habitante",
      evol_irpf: "Renta bruta media por declaración", esp: "España", h_irpf_var: (a, v, p) => `Desde 2013, la renta declarada media ha crecido un <b>${v}</b> (provincia: ${p}).`,
      h_com: "Comercio", h_com_sub: (a, n, s) => `Censo de establecimientos comerciales ${a}: ${n} establecimientos y ${s} m² de superficie de venta. Fuente: Generalitat de Catalunya.`,
      com_sect: "Establecimientos por 1.000 habitantes, por sector", com_evol: "Establecimientos por 1.000 habitantes", cat: "Cataluña",
      com_buits: (b, tot, p, pc) => `Locales vacíos (2022): <b>${b} de ${tot}</b> locales en planta baja, el ${p}. Media de las ciudades catalanas: ${pc}.`,
      com_grans: "Grandes establecimientos con licencia comercial", m2: "m²",
      sect: { alim: "Alimentación", qna: "Cotidiano no alimentario", pers: "Ropa y complementos", llar: "Equipamiento del hogar", lleure: "Ocio y cultura", auto: "Automoción y carburantes", mixt: "Comercio mixto", altres: "Otros" },
    },
  };
  const tx = (k, ...a) => { const v = TX[LANG][k]; return typeof v === "function" ? v(...a) : v; };
  function ord(n) {
    if (LANG === "es") return `${n}.º`;
    return `${n}${n === 1 || n === 3 ? "r" : n === 2 ? "n" : n === 4 ? "t" : "è"}`;
  }
  const font = (ca, es) => ({ ca, es });
  // Fuente corta de cada indicador de la tabla de datos clave
  const FONTS = {
    pob: font("INE, padró", "INE, padrón"), renda: font("INE, Atlas de renda", "INE, Atlas de renta"), renda_mediana: font("INE, Atlas de renda", "INE, Atlas de renta"),
    aeat_bruta: font("Agència Tributària", "Agencia Tributaria"), cj_atur: font("SEPE", "SEPE"), lloguer: font("Incasòl", "Incasòl"),
    esforc: font("Incasòl i INE", "Incasòl e INE"), compra: font("Ministeri d'Habitatge", "Ministerio de Vivienda"), hut: font("Registre de Turisme", "Registro de Turismo"),
    estrangers: font("INE", "INE"), edat: font("INE", "INE"), majors65: font("INE", "INE"), empreses: font("Seguretat Social (Xifra)", "Seguridad Social (Xifra)"),
    deute: font("Ministeri d'Hisenda (Xifra)", "Ministerio de Hacienda (Xifra)"), pres_desp: font("Generalitat", "Generalitat"), educ_sup: font("Idescat", "Idescat"),
    pob_var: font("INE, padró", "INE, padrón"),
  };
  const CLAU = ["pob", "pob_var", "renda", "aeat_bruta", "cj_atur", "lloguer", "esforc", "compra", "hut", "estrangers", "majors65", "educ_sup", "deute", "pres_desp"];
  // Indicadores que no entran en "lo que lo hace distinto" (recuentos, años, categorías o redundantes)
  const FORA = new Set(["pob", "museus", "ibi_revisio", "trib_ibi_rev", "trib_max", "sanitaris", "edu_centres", "edu_alumnes", "anyo", "nac_top_pct", "aar", "reb", "alcalde", "esports", "pmp"]);

  const vals = (i) => D.municipios.map((x) => [x, i.v(x)]).filter(([, v]) => v != null && isFinite(v));
  function posicio(i, m) {
    const l = vals(i), v = i.v(m);
    if (v == null || !isFinite(v)) return null;
    const alts = l.filter(([, x]) => x > v).length, baixos = l.filter(([, x]) => x < v).length;
    return { alt: alts + 1, baix: baixos + 1, n: l.length, iguals: l.length - alts - baixos };
  }
  function anyDe(i) {
    const IM = window.indMapa;
    if (i.per) { const a = IM.anysDe(i).slice(-1)[0]; return a ? etPer(String(a)) : ""; }
    if (typeof i.a === "number") return String(i.a);
    if (i.a && D.anys && D.anys[i.a]) return String(D.anys[i.a]);
    if (i.id === "pob" || i.id === "pob_var") return "2025";
    return "";
  }

  function frases(m) {
    const IM = window.indMapa, I = (id) => IM.IND.find((x) => x.id === id);
    const fr = [];
    const n = D.municipios.length, tot = D.municipios.reduce((s, x) => s + (x.poblacion || 0), 0);
    const rk = D.municipios.filter((x) => (x.poblacion || 0) > (m.poblacion || 0)).length + 1;
    fr.push(tx("pob", m.nom, fmt(m.poblacion), "2025", rk, n, pct((100 * m.poblacion) / tot, 1)));
    const s = m.pob_s || {};
    const a0 = Object.keys(s).sort()[0];
    if (a0 && s[a0] && m.poblacion) {
      const pv0 = D.municipios.reduce((acc, x) => acc + ((x.pob_s || {})[a0] || 0), 0);
      const d = m.poblacion - s[a0];
      fr.push(tx("creix", a0, d >= 0, fmt(Math.abs(d)), pct((m.poblacion / s[a0] - 1) * 100, 0, true), pct((tot / pv0 - 1) * 100, 0, true)));
    }
    const ir = I("renda"), vr = ir && ir.v(m);
    if (vr) {
      const pv = IM.valorProvincia(ir), p = posicio(ir, m), d = pv ? (vr / pv - 1) * 100 : 0;
      fr.push(Math.abs(d) < 1 ? tx("renda_igual", anyDe(ir), `${fmt(vr)} €`, p.alt, p.n) : tx("renda", anyDe(ir), `${fmt(vr)} €`, pct(Math.abs(d), 0), d > 0, p.alt, p.n));
    }
    const ll = val(m.alquiler, "2025");
    if (ll) {
      const b = val(m.alquiler, "2020"), e = esforc(m);
      fr.push(tx("lloguer", `${fmt(ll)} €`, b ? pct((ll / b - 1) * 100, 0, true) : null, e ? pct(e, 0) : null));
    }
    const ie = I("estrangers"), ig = I("majors65");
    if (ie && ig && ie.v(m) != null && ig.v(m) != null) fr.push(tx("gent", pct(ie.v(m), 0), pct(ig.v(m), 0)));
    const ia = I("cj_atur");
    if (ia && D.cj) {
      const v = ia.v(m), pv = IM.valorProvincia(ia);
      if (v != null && pv != null) fr.push(tx("atur", pct(v, 1), anyDe(ia), pct(pv, 1)));
    }
    const ih = I("hut"), vh = ih && ih.v(m);
    if (vh && vh >= 5) fr.push(tx("hut", fmt(vh, 1)));
    return fr;
  }

  // Indicadores en los que el municipio está entre los primeros o los últimos de la provincia
  function destaca(m) {
    const IM = window.indMapa, cand = [];
    IM.IND.forEach((i) => {
      if (!i.v || i.cat || i.per || FORA.has(i.id) || i.tema === "pol" || /^(nac_|vot_|cj_)/.test(i.id)) return;
      const p = posicio(i, m);
      if (!p || p.n < 120 || p.iguals > 3) return;
      const [k, dir] = p.alt <= p.baix ? [p.alt, "alt"] : [p.baix, "baix"];
      if (k > Math.max(5, Math.round(p.n * 0.04))) return;
      cand.push({ i, k, dir, n: p.n, v: i.v(m), pv: IM.valorProvincia(i), r: k / p.n });
    });
    cand.sort((a, b) => a.r - b.r || a.k - b.k);
    const res = [], perTema = {};
    for (const c of cand) {
      if ((perTema[c.i.tema] || 0) >= 2) continue;
      perTema[c.i.tema] = (perTema[c.i.tema] || 0) + 1;
      res.push(c);
      if (res.length >= 5) break;
    }
    return res;
  }

  function taula(m) {
    const IM = window.indMapa;
    const files = CLAU.map((id) => IM.IND.find((x) => x.id === id)).filter((i) => i && i.v && i.v(m) != null && isFinite(i.v(m))).map((i) => {
      const v = i.v(m), pv = IM.valorProvincia(i), p = posicio(i, m), f = FONTS[i.id];
      return `<tr><th scope="row">${i[LANG][0]}<small>${i[LANG][1]}</small></th><td class="rt-v">${i.f(v)}</td><td data-l="${tx("c_prov")}">${pv != null && i.id !== "pob" ? i.f(pv) : "–"}</td>
        <td data-l="${tx("c_pos")}">${p ? `${ord(p.alt)} <span>${tx("de", p.n)}</span>` : "–"}</td><td data-l="${tx("c_any")}">${anyDe(i) || "–"}</td><td class="rt-f" data-l="${tx("c_font")}">${f ? f[LANG] : ""}</td></tr>`;
    }).join("");
    return `<div class="rt-caixa"><table class="rt"><caption>${tx("taula")}</caption>
      <thead><tr><th scope="col">${tx("c_ind")}</th><th scope="col">${tx("c_val")}</th><th scope="col">${tx("c_prov")}</th><th scope="col">${tx("c_pos")}</th><th scope="col">${tx("c_any")}</th><th scope="col">${tx("c_font")}</th></tr></thead>
      <tbody>${files}</tbody></table></div><p class="rt-nota">${tx("nota_pos")}</p>`;
  }

  function blocPoblacio(m) {
    const s = m.pob_s || {};
    const d = { ...s };
    if (m.poblacion) d["2025"] = d["2025"] || m.poblacion;
    const anys = Object.keys(d).sort();
    if (anys.length < 3) return "";
    return `<section class="fitxa-bloc fx-pob"><h3>${tx("h_pob")}</h3><p class="fb-sub">${tx("h_pob_sub", anys[0], anys[anys.length - 1])}</p><div class="g-pob"></div></section>`;
  }

  function blocIrpf(m) {
    const a = m.aeat;
    if (!a || !a.bruta) return "";
    const p = (D.provincia || {}).aeat || {};
    const barra = (et, v, pv) => {
      const mx = Math.max(v || 0, pv || 0, 1);
      return `<li><span class="nb-nom">${et}</span><span class="nb-barra"><b style="width:${(100 * (v || 0)) / mx}%"></b><i class="fx-ref" style="left:${(100 * (pv || 0)) / mx}%" title="${tx("prov_mitjana")}"></i></span><span class="nb-v">${fmt(v)} €<small>${pv ? fmt(pv) : ""}</small></span></li>`;
    };
    const rb = a.rb || 1;
    const parts = [["treball", a.treball, "ub-0"], ["activitats", a.activitats, "ub-1"], ["immobles", a.immobles, "ub-3"], ["capital", a.capital, "ub-4"], ["guanys", a.guanys, "ub-2"]].filter((x) => x[1]);
    const suma = parts.reduce((s, x) => s + x[1], 0);
    const ub = parts.map(([k, v, c]) => `<b class="${c}" style="width:${(100 * v) / suma}%" title="${tx(k)}"></b>`).join("");
    const lleg = parts.map(([k, v, c]) => `<li><i class="${c}"></i>${tx(k)}<span>${pct((100 * v) / suma, 0)}</span></li>`).join("");
    const sb = (m.irpf && m.irpf.bruta) || {}, ab = Object.keys(sb).sort(), Rb = (D.irpf_ref || {}).bruta || {};
    let evol = "";
    if (ab.length > 2) {
      const a0 = ab[0], a1 = ab[ab.length - 1], v = (sb[a1] / sb[a0] - 1) * 100, pv = Rb[a0] && Rb[a1] ? (Rb[a1].gi / Rb[a0].gi - 1) * 100 : null;
      evol = `<figure class="grafic"><figcaption><span>${tx("evol_irpf")}</span><span class="unitat">€</span></figcaption>${a0 === "2013" ? `<p class="fx-dada">${tx("h_irpf_var", a0, pct(v, 0), pv == null ? "–" : pct(pv, 0))}</p>` : ""}<div class="g-irpf"></div></figure>`;
    }
    const tipus = a.quota && a.rb ? (100 * a.quota) / a.rb : null, tipusP = p.quota && p.rb ? (100 * p.quota) / p.rb : null;
    return `<section class="fitxa-bloc fx-irpf"><h3>${tx("h_irpf")}</h3><p class="fb-sub">${tx("h_irpf_sub", a.any, fmt(a.decl))}</p>
      <ul class="nb fx-nb">${barra(tx("bruta"), a.bruta, p.bruta)}${barra(tx("disp"), a.disp, p.disp)}</ul>
      ${tipus ? `<p class="fx-dada">${tx("tipus")}: <b>${pct(tipus, 1)}</b>${tipusP ? ` · ${tx("prov_mitjana")} ${pct(tipusP, 1)}` : ""}</p>` : ""}
      <p class="fx-sub2">${tx("comp")}</p><div class="ub">${ub}</div><ul class="ub-lleg">${lleg}</ul>
      ${evol}
      <p class="fb-font">${LANG === "ca" ? "Barra: municipi. Marca i xifra petita: mitjana de la província." : "Barra: municipio. Marca y cifra pequeña: media de la provincia."}</p></section>`;
  }

  function blocPressupost(m) {
    const p = m.pres;
    if (!p || !p.ing) return "";
    const P = (D.provincia || {}).pres || {};
    const fila = (cap, nom, v, pv, mx) => `<li><span class="nb-nom" title="${nom}">${nom}</span><span class="nb-barra"><b style="width:${(100 * Math.max(0, v || 0)) / mx}%"></b>${pv != null ? `<i class="fx-ref" style="left:${Math.min(100, (100 * pv) / mx)}%"></i>` : ""}</span><span class="nb-v">${fmt(v)}<small>${pv != null ? fmt(pv) : ""}</small></span></li>`;
    const llista = (obj, objP, noms) => {
      const ks = Object.keys(obj).filter((k) => obj[k] > 0.5).sort((a, b) => obj[b] - obj[a]);
      const mx = Math.max(...ks.map((k) => Math.max(obj[k], (objP || {})[k] || 0)), 1);
      return ks.map((k) => fila(k, (noms || {})[k] || k, obj[k], objP ? objP[k] : null, mx)).join("");
    };
    const tI = Object.values(p.ing).reduce((s, v) => s + v, 0), tD = Object.values(p.desp).reduce((s, v) => s + v, 0);
    return `<section class="fitxa-bloc fx-pres"><h3>${tx("h_pres")}</h3><p class="fb-sub">${tx("h_pres_sub", p.any)}</p>
      <div class="fx-tres"><p><span>${tx("ingressos")}</span><b>${fmt(tI)} €</b></p><p><span>${tx("despeses")}</span><b>${fmt(tD)} €</b></p><p><span>${tx("saldo")}</span><b class="${tI - tD >= 0 ? "fx-pos" : "fx-neg"}">${tI - tD >= 0 ? "+" : "−"}${fmt(Math.abs(tI - tD))} €</b></p></div>
      <div class="fx-dues"><div><p class="fx-sub2">${tx("ingressos")} · ${tx("per_hab")}</p><ul class="nb fx-nb">${llista(p.ing, P.ing, D.pres_noms && D.pres_noms.ing)}</ul></div>
      <div><p class="fx-sub2">${tx("despeses")} · ${tx("per_hab")}</p><ul class="nb fx-nb">${llista(p.desp, P.desp, D.pres_noms && D.pres_noms.desp)}</ul></div></div>
      ${p.serie ? `<figure class="grafic"><figcaption><span>${tx("evol_pres")}</span><span class="unitat">€</span></figcaption><div class="g-pres"></div></figure>` : ""}
      <p class="fb-font">${LANG === "ca" ? "Barra: municipi. Marca i xifra petita: mitjana de la província (ponderada per població)." : "Barra: municipio. Marca y cifra pequeña: media de la provincia (ponderada por población)."}</p></section>`;
  }

  function blocComerc(m) {
    const c = m.com, a = D.anys && D.anys.com;
    if (!c || !a || !c.n || c.n[a] == null) return "";
    const R = D.com_ref || {}, ref = (k, z) => (R[k] && R[k][a] ? R[k][a][z] : null);
    const ks = Object.keys(TX[LANG].sect).filter((k) => c["s_" + k] && c["s_" + k][a] != null);
    const mx = Math.max(...ks.map((k) => Math.max(c["s_" + k][a], ref("s_" + k, "gi") || 0)), 0.1);
    const files = ks.map((k) => { const v = c["s_" + k][a], pv = ref("s_" + k, "gi");
      return `<li><span class="nb-nom">${TX[LANG].sect[k]}</span><span class="nb-barra"><b style="width:${(100 * v) / mx}%"></b>${pv != null ? `<i class="fx-ref" style="left:${(100 * pv) / mx}%"></i>` : ""}</span><span class="nb-v">${fmt(v, 1)}<small>${pv != null ? fmt(pv, 1) : ""}</small></span></li>`; }).join("");
    const b = m.com_f && m.com_f.buits, rb = (D.ref || {}).com_buits || {};
    return `<section class="fitxa-bloc fx-com"><h3>${tx("h_com")}</h3><p class="fb-sub">${tx("h_com_sub", a, fmt(c.n[a]), fmt(c.sup && c.sup[a]))}</p>
      <div class="fx-dues"><div><p class="fx-sub2">${tx("com_sect")}</p><ul class="nb fx-nb">${files}</ul></div>
      <div><figure class="grafic"><figcaption><span>${tx("com_evol")}</span></figcaption><div class="g-com"></div></figure></div></div>
      ${b ? `<p class="fx-dada">${tx("com_buits", fmt(b.buits), fmt(b.total), pct((100 * b.buits) / b.total, 1), pct(rb.cat, 1))}</p>` : ""}
      <p class="fb-font">${LANG === "ca" ? "Barra: municipi. Marca i xifra petita: província. Sense cens el 2020 ni el 2022." : "Barra: municipio. Marca y cifra pequeña: provincia. Sin censo en 2020 ni en 2022."}</p></section>`;
  }

  window.fitxaResum = (cont, extra, m) => {
    if (!window.indMapa || !cont) return;
    const ds = destaca(m);
    const dsHtml = ds.map((c) => `<li><span class="rs-k">${ord(c.k)}<small>${c.dir === "alt" ? tx("mes_alt") : tx("mes_baix")}</small></span>
      <span class="rs-t">${c.i[LANG][0]}<small>${c.i.f(c.v)}${c.pv != null ? ` · ${LANG === "ca" ? "província" : "provincia"} ${c.i.f(c.pv)}` : ""}</small></span></li>`).join("");
    cont.innerHTML = `<section class="rs"><p class="sobre">${tx("resum")}</p>
      <div class="rs-cos"><div class="rs-text">${frases(m).map((f) => `<p>${f}</p>`).join("")}</div>
      ${dsHtml ? `<div class="rs-dest"><h4>${tx("destaca")}</h4><ol>${dsHtml}</ol><p class="rt-nota">${LANG === "ca" ? `Posició entre els ${D.municipios.length} municipis.` : `Posición entre los ${D.municipios.length} municipios.`}</p></div>` : ""}</div>
      ${taula(m)}</section>`;
    if (!extra) return;
    extra.innerHTML = `${blocPoblacio(m)}${blocIrpf(m)}${blocPressupost(m)}${blocComerc(m)}${window.blocEnsenyament ? window.blocEnsenyament(m) : ""}${window.blocCultura ? window.blocCultura(m) : ""}${window.blocMediAmbient ? window.blocMediAmbient(m) : ""}${window.blocEnergia ? window.blocEnergia(m) : ""}${window.blocDiners ? window.blocDiners(m) : ""}${window.blocUrbans ? window.blocUrbans(m) : ""}`;
    if (window.pintaCultura) window.pintaCultura(extra, m);
    if (window.pintaEnsenyament) window.pintaEnsenyament(extra, m);
    const gc = extra.querySelector(".g-com");
    if (gc) {
      const R = (D.com_ref || {}).est_h || {}, z = (k) => Object.fromEntries(Object.entries(R).map(([a, o]) => [a, o[k]]).filter(([, v]) => v != null));
      grafLinia(gc, [
        { nom: m.nom, color: "var(--serie-1)", dades: m.com.est_h || {} },
        { nom: LANG === "ca" ? "Província" : "Provincia", color: "var(--accent)", dades: z("gi") },
        { nom: tx("cat"), color: "var(--text-3)", dades: z("cat") },
      ], (v) => fmt(v, 1));
    }
    const gp = extra.querySelector(".g-pob");
    if (gp) {
      const d = { ...(m.pob_s || {}) };
      if (m.poblacion) d["2025"] = d["2025"] || m.poblacion;
      const series = [{ nom: m.nom, color: "var(--serie-1)", dades: d }];
      if (m.estr_s && Object.keys(m.estr_s).length > 2) series.push({ nom: tx("estrangers"), color: "var(--accent)", dades: m.estr_s });
      grafLinia(gp, series, (v) => fmt(v));
    }
    const gi = extra.querySelector(".g-irpf");
    if (gi) {
      const R = (D.irpf_ref || {}).bruta || {}, z = (k) => Object.fromEntries(Object.entries(R).map(([a, o]) => [a, o[k]]).filter(([, v]) => v != null));
      grafLinia(gi, [
        { nom: m.nom, color: "var(--serie-1)", dades: m.irpf.bruta },
        { nom: LANG === "ca" ? "Província" : "Provincia", color: "var(--accent)", dades: z("gi") },
        { nom: tx("cat"), color: "var(--text-3)", dades: z("cat") },
        { nom: tx("esp"), color: "var(--text-2)", dades: z("esp") },
      ], (v) => `${fmt(v)} €`);
    }
    const gr = extra.querySelector(".g-pres");
    if (gr && m.pres.serie) {
      grafLinia(gr, [
        { nom: tx("ingressos"), color: "var(--serie-1)", dades: m.pres.serie.ing },
        { nom: tx("despeses"), color: "var(--accent)", dades: m.pres.serie.desp },
      ], (v) => `${fmt(v)} €`);
    }
  };
})();
