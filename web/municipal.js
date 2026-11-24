"use strict";
/* Xifra municipal: gráficos de la provincia (cuentas de los ayuntamientos, coste de los servicios,
   policía local, lugar de nacimiento, censo de viviendas 2021 y turismo por comarca) y bloque de la
   ficha municipal. Datos: m.xm, D.xm_ref y D.xm (construir_web.py, scripts/municipal_web.py).
   Usa las globales de app.js (D, LANG, fmt, pct) y window.PG (provincia.js). */
(function () {
  const ca = {
    xm_fin: ["Els comptes dels ajuntaments", "Euros per habitant, suma de tots els ajuntaments de la província"], xm_fin_noms: { gi: "Romanent per a despeses generals", bcn: "Resultat pressupostari ajustat", lle: "Factures fora del pressupost (compte 413)" },
    xm_ces: ["Quant costen els serveis", "Cost efectiu per habitant (€), mitjana de la província"], xm_ces_noms: { gi: "Últim any", esp: "Any anterior" },
    xm_pol: ["Policia local", "Efectius a 31 de desembre, per graduació"], xm_pol_noms: { gi: "Últim any", esp: "Fa dos anys" },
    xm_naix: ["On han nascut els que hi viuen", "% de la població de la província"], xm_naix_noms: { gi: "Població" },
    xm_cens_hpt: ["Habitatges principals, secundaris i buits", "% dels habitatges, cens del 2021"], xm_cens_hpt_noms: { gi: "Habitatges" },
    xm_cens_enp: ["Habitatges segons les plantes de l'edifici", "% dels habitatges, cens del 2021"], xm_cens_enp_noms: { gi: "Habitatges" },
    xm_tur_ocup: ["Ocupació de les places", "% de places ocupades, mitjana de l'any"], xm_tur_ocup_noms: { gi: "Hotels", bcn: "Càmpings", lle: "Turisme rural" },
    xm_tur_com: ["Ocupació per comarques", "% de places ocupades, mitjana de l'any"], xm_tur_com_noms: { gi: "Hotels", bcn: "Càmpings", lle: "Turisme rural" },
    xm_tur_pern: ["Pernoctacions per comarques", "Nits als hotels, milers"], xm_tur_pern_noms: { gi: "Últim any", esp: "Fa deu anys" },
    h_xm_fin: (r, a, rp) => `El ${a}, als ajuntaments de la província els quedaven <b>${r} per habitant</b> de romanent per a despeses generals, i van tancar l'any amb un resultat ajustat de ${rp} per habitant.`,
    h_xm_ces: (s, v, a) => `El ${a}, el servei més car per habitant era <b>${s.toLowerCase()}</b>: ${v}.`,
    h_xm_pol: (n, a, h) => `El ${a}, la província tenia <b>${n} policies locals</b>, ${h} per cada 10.000 habitants.`,
    h_xm_naix: (e, m, a) => `El ${a}, el <b>${e}</b> dels habitants de la província havien nascut a l'estranger i el ${m} al mateix municipi on viuen.`,
    h_xm_cens_hpt: (p, b) => `El 2021, només el <b>${p}</b> dels habitatges de la província eren la residència habitual d'algú; el ${b} eren buits.`,
    h_xm_cens_enp: (v) => `El 2021, el <b>${v}</b> dels habitatges eren en edificis d'una o dues plantes.`,
    h_xm_tur_ocup: (v, a) => `El ${a}, els hotels de la província van ocupar de mitjana el <b>${v}</b> de les places.`,
    h_xm_tur_com: (c, v, a) => `El ${a}, la comarca amb els hotels més plens va ser <b>${c}</b>, amb un ${v} d'ocupació.`,
    h_xm_tur_pern: (c, v, a) => `El ${a}, <b>${c}</b> va sumar ${v} pernoctacions d'hotel.`,
    font_xm_fin: "Font: Xifra (Diputació de Girona), a partir de les liquidacions dels pressupostos municipals (Ministeri d'Hisenda)",
    font_xm_pol: "Font: Xifra (Diputació de Girona), a partir del Departament d'Interior",
    font_xm_naix: "Font: Xifra (Diputació de Girona), a partir del padró continu (Idescat)",
    font_xm_cens: "Font: Xifra (Diputació de Girona), a partir del cens de població i habitatges 2021 (INE i Idescat)",
    font_xm_tur: "Font: Xifra (Diputació de Girona), a partir de les enquestes d'ocupació en allotjaments turístics (INE i Idescat)",
    f_h: "Ajuntament i serveis", f_rom: "Romanent per a despeses generals", f_rp: "Resultat pressupostari ajustat", f_413: "Factures fora del pressupost",
    f_res: "Cost de la recollida d'escombraries", f_pol: "Policies locals", f_polh: (v) => `${v} per 10.000 habitants`, f_sense_pol: "Sense policia local",
    f_naix: "Nascuts a l'estranger", f_mun: (v) => `el ${v} al mateix municipi`, f_eq: "Equipaments", f_eq_txt: (c, t, cr, o) => [c && `${c} cementiri${c === 1 ? "" : "s"}`, t && `${t} tanatori${t === 1 ? "" : "s"}`, cr && `${cr} crematori${cr === 1 ? "" : "s"}`, o && `${o} centre${o === 1 ? "" : "s"} ocupacional${o === 1 ? "" : "s"}`].filter(Boolean).join(", "),
    f_prov: (v) => `província: ${v}`, f_hab: "per habitant", f_font: "Font: Xifra (Diputació de Girona), a partir del Ministeri d'Hisenda, el Departament d'Interior, l'Idescat i el Departament de Salut.",
  };
  const es = {
    xm_fin: ["Las cuentas de los ayuntamientos", "Euros por habitante, suma de todos los ayuntamientos de la provincia"], xm_fin_noms: { gi: "Remanente para gastos generales", bcn: "Resultado presupuestario ajustado", lle: "Facturas fuera del presupuesto (cuenta 413)" },
    xm_ces: ["Cuánto cuestan los servicios", "Coste efectivo por habitante (€), media de la provincia"], xm_ces_noms: { gi: "Último año", esp: "Año anterior" },
    xm_pol: ["Policía local", "Efectivos a 31 de diciembre, por graduación"], xm_pol_noms: { gi: "Último año", esp: "Hace dos años" },
    xm_naix: ["Dónde han nacido los que viven aquí", "% de la población de la provincia"], xm_naix_noms: { gi: "Población" },
    xm_cens_hpt: ["Viviendas principales, secundarias y vacías", "% de las viviendas, censo de 2021"], xm_cens_hpt_noms: { gi: "Viviendas" },
    xm_cens_enp: ["Viviendas según las plantas del edificio", "% de las viviendas, censo de 2021"], xm_cens_enp_noms: { gi: "Viviendas" },
    xm_tur_ocup: ["Ocupación de las plazas", "% de plazas ocupadas, media del año"], xm_tur_ocup_noms: { gi: "Hoteles", bcn: "Campings", lle: "Turismo rural" },
    xm_tur_com: ["Ocupación por comarcas", "% de plazas ocupadas, media del año"], xm_tur_com_noms: { gi: "Hoteles", bcn: "Campings", lle: "Turismo rural" },
    xm_tur_pern: ["Pernoctaciones por comarcas", "Noches en hoteles, miles"], xm_tur_pern_noms: { gi: "Último año", esp: "Hace diez años" },
    h_xm_fin: (r, a, rp) => `En ${a}, a los ayuntamientos de la provincia les quedaban <b>${r} por habitante</b> de remanente para gastos generales, y cerraron el año con un resultado ajustado de ${rp} por habitante.`,
    h_xm_ces: (s, v, a) => `En ${a}, el servicio más caro por habitante era <b>${s.toLowerCase()}</b>: ${v}.`,
    h_xm_pol: (n, a, h) => `En ${a}, la provincia tenía <b>${n} policías locales</b>, ${h} por cada 10.000 habitantes.`,
    h_xm_naix: (e, m, a) => `En ${a}, el <b>${e}</b> de los habitantes de la provincia había nacido en el extranjero y el ${m} en el mismo municipio donde vive.`,
    h_xm_cens_hpt: (p, b) => `En 2021, solo el <b>${p}</b> de las viviendas de la provincia eran la residencia habitual de alguien; el ${b} estaban vacías.`,
    h_xm_cens_enp: (v) => `En 2021, el <b>${v}</b> de las viviendas estaban en edificios de una o dos plantas.`,
    h_xm_tur_ocup: (v, a) => `En ${a}, los hoteles de la provincia ocuparon de media el <b>${v}</b> de las plazas.`,
    h_xm_tur_com: (c, v, a) => `En ${a}, la comarca con los hoteles más llenos fue <b>${c}</b>, con un ${v} de ocupación.`,
    h_xm_tur_pern: (c, v, a) => `En ${a}, <b>${c}</b> sumó ${v} pernoctaciones de hotel.`,
    font_xm_fin: "Fuente: Xifra (Diputació de Girona), a partir de las liquidaciones de los presupuestos municipales (Ministerio de Hacienda)",
    font_xm_pol: "Fuente: Xifra (Diputació de Girona), a partir del Departament d'Interior",
    font_xm_naix: "Fuente: Xifra (Diputació de Girona), a partir del padrón continuo (Idescat)",
    font_xm_cens: "Fuente: Xifra (Diputació de Girona), a partir del censo de población y viviendas 2021 (INE e Idescat)",
    font_xm_tur: "Fuente: Xifra (Diputació de Girona), a partir de las encuestas de ocupación en alojamientos turísticos (INE e Idescat)",
    f_h: "Ayuntamiento y servicios", f_rom: "Remanente para gastos generales", f_rp: "Resultado presupuestario ajustado", f_413: "Facturas fuera del presupuesto",
    f_res: "Coste de la recogida de basura", f_pol: "Policías locales", f_polh: (v) => `${v} por 10.000 habitantes`, f_sense_pol: "Sin policía local",
    f_naix: "Nacidos en el extranjero", f_mun: (v) => `el ${v} en el mismo municipio`, f_eq: "Equipamientos", f_eq_txt: (c, t, cr, o) => [c && `${c} cementerio${c === 1 ? "" : "s"}`, t && `${t} tanatorio${t === 1 ? "" : "s"}`, cr && `${cr} crematorio${cr === 1 ? "" : "s"}`, o && `${o} centro${o === 1 ? "" : "s"} ocupacional${o === 1 ? "" : "es"}`].filter(Boolean).join(", "),
    f_prov: (v) => `provincia: ${v}`, f_hab: "por habitante", f_font: "Fuente: Xifra (Diputació de Girona), a partir del Ministerio de Hacienda, el Departament d'Interior, el Idescat y el Departament de Salut.",
  };
  // Nombres en castellano de las categorías que vienen de Xifra en catalán
  const TRAD = {
    "Mateix municipi. Mateixa província": "Mismo municipio", "Diferent municipi. Mateixa província": "Otro municipio de la provincia", "Resta de Catalunya": "Resto de Cataluña",
    "Altra comunitat autònoma": "Otra comunidad autónoma", "Total nascuts a l'estranger": "Extranjero",
    Agent: "Agente", Caporal: "Cabo", Sergent: "Sargento", Sotsinspector: "Subinspector", Inspector: "Inspector", Intendent: "Intendente", "Intendent major": "Intendente mayor", Superintendent: "Superintendente",
    "Província de Girona": "Provincia de Girona",
    "Habitatge principal": "Vivienda principal", "Habitatge secundari o altres": "Segunda residencia u otros usos", "Habitatge buit": "Vivienda vacía",
    "Una planta": "Una planta", "Dues plantes": "Dos plantas", "Tres plantes": "Tres plantas", "Quatre plantes": "Cuatro plantas", "Cinc plantes": "Cinco plantas", "Sis plantes": "Seis plantas", "Set plantes": "Siete plantas", "Vuit i més": "Ocho o más", "No costa": "No consta",
  };
  const CURT = { "Mateix municipi. Mateixa província": "Mateix municipi", "Diferent municipi. Mateixa província": "Un altre municipi de la província", "Altra comunitat autònoma": "Una altra comunitat autònoma", "Total nascuts a l'estranger": "Estranger" };
  const nom = (c) => (LANG === "es" ? TRAD[c] || c : CURT[c] || c);
  window.PG.textos(ca, es);
  const T = () => (LANG === "es" ? es : ca);
  const tp = (k, ...a) => { const v = T()[k]; return typeof v === "function" ? v(...a) : v; };
  const eur = (v) => (v == null ? "–" : `${fmt(v)} €`);
  const R = (k) => (D.xm_ref && D.xm_ref[k]) || {};
  const darrer = (o) => { const ks = Object.keys(o || {}).sort(); return ks.length ? ks[ks.length - 1] : null; };
  const CES = [["ces_res", "Recollida d'escombraries", "Recogida de basura"], ["ces_net", "Neteja dels carrers", "Limpieza de calles"], ["ces_llum", "Enllumenat públic", "Alumbrado público"], ["ces_pol", "Policia local", "Policía local"], ["ces_soc", "Serveis socials bàsics", "Servicios sociales básicos"]];

  function grafics() {
    const G = {}, X = D.xm || {};
    const ser = (k) => Object.entries(R(k)).filter(([, o]) => o.gi != null).map(([a, o]) => [+a, a, o.gi]).sort((a, b) => a[0] - b[0]);
    if (Object.keys(R("rom_h")).length) G.xm_fin = { tipus: "linia", u: "€", dec: 0, noms: "xm_fin", series: { gi: ser("rom_h"), bcn: ser("rp_h"), lle: ser("c413_h") } };
    const ac = darrer(R("ces_res"));
    if (ac) {
      const ap = String(+ac - 1);
      G.xm_ces = { tipus: "barres", u: "€", dec: 0, claus: ["gi", "esp"], noms: "xm_ces", any: ac,
        grups: CES.map(([k, c, e]) => ({ g: LANG === "es" ? e : c, gi: (R(k)[ac] || {}).gi, esp: (R(k)[ap] || {}).gi })).filter((g) => g.gi != null).sort((a, b) => b.gi - a.gi) };
    }
    if (X.pol && X.pol.graus) {
      G.xm_pol = { tipus: "barres", u: "", dec: 0, claus: ["gi"], noms: "xm_pol", any: X.pol.any, total: Object.values(X.pol.serie || {}).slice(-1)[0],
        grups: X.pol.graus.filter(([, v]) => v).map(([g, v]) => ({ g: nom(g), gi: v })) };
    }
    if (X.naix && X.naix.files) {
      const f = Object.fromEntries(X.naix.files), t = f.Total;
      const ks = ["Mateix municipi. Mateixa província", "Diferent municipi. Mateixa província", "Resta de Catalunya", "Altra comunitat autònoma", "Total nascuts a l'estranger"];
      if (t) G.xm_naix = { tipus: "barres", u: "%", dec: 1, claus: ["gi"], noms: "xm_naix", any: X.naix.any, grups: ks.filter((k) => f[k] != null).map((k) => ({ g: nom(k), gi: (f[k] / t) * 100 })) };
    }
    if (X.cens) {
      ["hpt", "enp"].forEach((k) => {
        const l = X.cens[k]; if (!l || !l.length) return;
        const t = l.reduce((u, x) => u + (x[1] || 0), 0); if (!t) return;
        G["xm_cens_" + k] = { tipus: "barres", u: "%", dec: 1, claus: ["gi"], noms: "xm_cens_" + k, any: "2021", grups: l.map(([g, v]) => ({ g: nom(g), gi: (v / t) * 100 })) };
      });
    }
    const TC = X.tur_com;
    if (TC && TC.hotel) {
      const prov = "Província de Girona", s = (t) => Object.entries(((TC[t] || {}).any || {})[prov] || {}).filter(([, v]) => v[2] != null).map(([a, v]) => [+a, a, v[2]]).sort((a, b) => a[0] - b[0]);
      G.xm_tur_ocup = { tipus: "linia", u: "%", dec: 1, noms: "xm_tur_ocup", series: { gi: s("hotel"), bcn: s("camping"), lle: s("rural") } };
      const anys = Object.keys((TC.hotel.any || {})[prov] || {}).sort();
      const a = anys[anys.length - 1], a10 = anys.includes(String(+a - 10)) ? String(+a - 10) : anys[0];
      const coms = Object.keys(TC.hotel.any).filter((c) => c !== prov);
      const v = (t, c, y, i) => { const o = ((TC[t] || {}).any || {})[c]; return o && o[y] ? o[y][i] : null; };
      // Campings y rural pueden ir un año por detrás de los hoteles: se usa el último año de cada uno
      const ult = (t) => { const o = ((TC[t] || {}).any || {})[prov]; return o ? Object.keys(o).sort().pop() : null; };
      G.xm_tur_com = { tipus: "barres", u: "%", dec: 1, claus: ["gi", "bcn", "lle"], noms: "xm_tur_com", any: a,
        grups: coms.map((c) => ({ g: c, gi: v("hotel", c, a, 2), bcn: v("camping", c, ult("camping"), 2), lle: v("rural", c, ult("rural"), 2) })).filter((g) => g.gi != null || g.bcn != null).sort((x, y) => (y.gi || 0) - (x.gi || 0)) };
      G.xm_tur_pern = { tipus: "barres", u: "", dec: 0, claus: ["gi", "esp"], noms: "xm_tur_pern", any: a, a10,
        grups: coms.map((c) => ({ g: c, gi: v("hotel", c, a, 1) != null ? v("hotel", c, a, 1) / 1000 : null, esp: v("hotel", c, a10, 1) != null ? v("hotel", c, a10, 1) / 1000 : null })).filter((g) => g.gi != null).sort((x, y) => y.gi - x.gi) };
    }
    return G;
  }

  window.PG.titular((id, sp) => {
    if (!/^xm_/.test(id)) return null;
    const s = sp.series || {}, g = s.gi && s.gi[s.gi.length - 1], gs = sp.grups || [];
    if (id === "xm_fin" && g) { const rp = (s.bcn || []).find((p) => p[1] === g[1]); return tp("h_xm_fin", eur(g[2]), g[1], rp ? eur(rp[2]) : "–"); }
    if (id === "xm_ces" && gs.length) return tp("h_xm_ces", gs[0].g, eur(gs[0].gi), sp.any);
    if (id === "xm_pol") { const h = (R("pol_h")[sp.any] || {}).gi; return tp("h_xm_pol", fmt(sp.total), sp.any, h != null ? fmt(h, 1) : "–"); }
    if (id === "xm_naix" && gs.length) return tp("h_xm_naix", pct(gs[gs.length - 1].gi, 1), pct(gs[0].gi, 0), sp.any);
    if (id === "xm_cens_hpt" && gs.length >= 3) return tp("h_xm_cens_hpt", pct(gs[0].gi, 0), pct(gs[2].gi, 0));
    if (id === "xm_cens_enp" && gs.length) return tp("h_xm_cens_enp", pct(gs.slice(0, 2).reduce((u, x) => u + (x.gi || 0), 0), 0));
    if (id === "xm_tur_ocup" && g) return tp("h_xm_tur_ocup", pct(g[2], 1), g[1]);
    if (id === "xm_tur_com" && gs.length) return tp("h_xm_tur_com", gs[0].g, pct(gs[0].gi, 1), sp.any);
    if (id === "xm_tur_pern" && gs.length) return tp("h_xm_tur_pern", gs[0].g, fmt(gs[0].gi * 1000), sp.any);
    return "";
  });

  const font = (id) => (/^xm_(fin|ces)/.test(id) ? "font_xm_fin" : id === "xm_pol" ? "font_xm_pol" : id === "xm_naix" ? "font_xm_naix" : /^xm_cens/.test(id) ? "font_xm_cens" : "font_xm_tur");
  window.pintaSeccioXM = () => {
    if (!D.xm && !D.xm_ref) return;
    const G = grafics();
    window.PG.pintaGrafics(document.getElementById("dp-xm"), G, ["xm_fin", "xm_ces", "xm_pol"], font);
    window.PG.pintaGrafics(document.getElementById("dem-xm"), G, ["xm_naix", "xm_cens_hpt", "xm_cens_enp"], font);
    window.PG.pintaGrafics(document.getElementById("tur-com"), G, ["xm_tur_ocup", "xm_tur_com", "xm_tur_pern"], font);
  };

  // Ficha municipal
  window.blocXM = (m) => {
    const x = m.xm; if (!x) return "";
    const ult = (k) => { const a = darrer(x[k]); return a ? [a, x[k][a]] : null; };
    const ref = (k, a) => (R(k)[a] || {}).gi;
    const fila = (et, v, nota) => `<div class="fx-xm-f"><span>${et}</span><b>${v}</b>${nota ? `<small>${nota}</small>` : ""}</div>`;
    const files = [];
    [["rom_h", "f_rom"], ["rp_h", "f_rp"], ["c413_h", "f_413"], ["ces_res", "f_res"]].forEach(([k, e]) => {
      const u = ult(k); if (!u) return;
      files.push(fila(`${tp(e)} (${u[0]})`, `${eur(u[1])} <small>${tp("f_hab")}</small>`, tp("f_prov", eur(ref(k, u[0])))));
    });
    const p = ult("pol_n");
    if (p) files.push(fila(`${tp("f_pol")} (${p[0]})`, p[1] ? fmt(p[1]) : "0", p[1] ? tp("f_polh", fmt((x.pol_h || {})[p[0]], 1)) : tp("f_sense_pol")));
    const n = ult("naix_estr");
    if (n) files.push(fila(`${tp("f_naix")} (${n[0]})`, pct(n[1], 1), ult("naix_mun") ? tp("f_mun", pct(ult("naix_mun")[1], 0)) : ""));
    const q = (k) => (ult(k) || [null, 0])[1];
    const eq = tp("f_eq_txt", q("cem_n"), q("tan_n"), q("crem_n"), q("ocup_n"));
    if (eq) files.push(`<div class="fx-xm-f fx-xm-l"><span>${tp("f_eq")}</span><b>${eq}</b></div>`);
    if (!files.length) return "";
    return `<section class="fitxa-bloc fx-xm"><h3>${tp("f_h")}</h3><div class="fx-xm-g">${files.join("")}</div><p class="fb-font">${tp("f_font")}</p></section>`;
  };
})();
