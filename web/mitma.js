/* Boletín estadístico del Ministerio de Vivienda en «La província»: textos, titulares y grupos de los gráficos mt_*. */
(function () {
  if (!window.PG) return;
  const ca = {
    mt_preu: ["Preu de les compravendes", "Valor mitjà de les compravendes d'habitatge lliure, per trimestre (€)"],
    h_mt_preu: (v, p, sobre, mx, pmx, c, e, x) => `Un habitatge lliure es va vendre de mitjana per <b>${v} €</b> a la província el ${p}, ${sobre ? "per sobre" : "per sota"} del màxim de la bombolla (${mx} €, ${pmx}). Catalunya, ${c} €; Espanya, ${e} €.${x ? ` Els compradors estrangers residents a Espanya van pagar ${x} € de mitjana.` : ""}`,
    mt_rangs: ["Quant costen els habitatges venuts", "Compravendes d'habitatge lliure segons el preu (% del total)"],
    h_mt_rangs: (b, n, p, a, eb, ea) => `El ${p}, el <b>${b}</b> dels ${n} habitatges lliures venuts a la província van costar menys de 150.000 €, i el ${a}, més de 450.000 € (Espanya, ${eb} i ${ea}).`,
    mt_qui: ["Qui compra habitatge a la província", "Compravendes d'habitatge segons on viu el comprador, darrers 4 trimestres (%)"],
    h_mt_qui: (g, b, n) => `El <b>${g}</b> dels habitatges venuts a la província en un any els va comprar algú que hi viu; el ${b}, gent de la província de Barcelona, i el ${n}, gent que no viu a Espanya.`,
    mt_ext: ["Compradors estrangers", "Compravendes d'habitatge fetes per estrangers, residents o no a Espanya (% del total, suma de 4 trimestres)"],
    h_mt_ext: (g, c, e, g0, a0) => `Els estrangers fan el <b>${g}</b> de les compravendes d'habitatge a la província, davant del ${c} a Catalunya i el ${e} a Espanya. El ${a0} eren el ${g0}.`,
    mt_nova: ["Habitatge nou", "Habitatges nous entre les compravendes (% del total, suma de 4 trimestres)"],
    h_mt_nova: (g, mx, pmx, e) => `Només el <b>${g}</b> dels habitatges venuts a la província en un any eren nous (Espanya, ${e}). El ${pmx} n'eren el ${mx}.`,
    mt_unif: ["Cases", "Compravendes d'habitatge lliure en edificis d'un sol habitatge (% del total, suma de 4 trimestres)"],
    h_mt_unif: (g, c, e) => `El <b>${g}</b> dels habitatges lliures venuts a la província són cases (edificis d'un sol habitatge), més que a Catalunya (${c}) i a Espanya (${e}).`,
    mt_ini: ["Habitatges lliures iniciats i acabats", "Habitatges lliures començats i acabats a la província cada any"],
    mt_it_noms: { gi: "Iniciats", cat: "Acabats" },
    h_mt_ini: (a, i, t, amx, mx, m12, fins, d) => `El ${a} es van començar <b>${i} habitatges lliures</b> a la província i se'n van acabar ${t}. El ${amx}, en plena bombolla, se'n van començar ${mx}.${m12 ? ` En els 12 mesos ${fins}, ${m12} (${d} que un any abans).` : ""}`,
    mt_vt: ["Valor taxat per tipus d'habitatge", "Valor taxat mitjà del metre quadrat (€/m²)"],
    h_mt_vt: (g, p, dc, n, pr) => `El metre quadrat d'habitatge lliure es taxa a <b>${g} €</b> a la província (${p}), ${dc} que a Catalunya. L'habitatge de menys de 5 anys, a ${n} €; el protegit, a ${pr} €.`,
    mt: { gi: "Viuen a la província de Girona", bcn: "Viuen a la província de Barcelona", esp: "Viuen a la resta d'Espanya", nores: "No viuen a Espanya",
      r150: "Fins a 150.000 €", r300: "De 150.000 a 300.000 €", r450: "De 300.000 a 450.000 €", r600: "De 450.000 a 600.000 €", rmes: "Més de 600.000 €",
      vt_tot: "Habitatge lliure", vt_nova: "Lliure, fins a 5 anys", vt_vella: "Lliure, més de 5 anys", vt_prot: "Habitatge protegit" },
    mes_que: "més", menys_que: "menys",
    font_mt: "Font: Ministeri d'Habitatge i Agenda Urbana, Butlletí estadístic (compravendes davant notari)",
    font_mt_ini: "Font: Ministeri d'Habitatge i Agenda Urbana, Butlletí estadístic (certificats dels col·legis d'aparelladors)",
    font_mt_vt: "Font: Ministeri d'Habitatge i Agenda Urbana, Butlletí estadístic (taxacions per a hipoteques)",
  };
  const es = {
    mt_preu: ["Precio de las compraventas", "Valor medio de las compraventas de vivienda libre, por trimestre (€)"],
    h_mt_preu: (v, p, sobre, mx, pmx, c, e, x) => `Una vivienda libre se vendió de media por <b>${v} €</b> en la provincia en el ${p}, ${sobre ? "por encima" : "por debajo"} del máximo de la burbuja (${mx} €, ${pmx}). Cataluña, ${c} €; España, ${e} €.${x ? ` Los compradores extranjeros residentes en España pagaron ${x} € de media.` : ""}`,
    mt_rangs: ["Cuánto cuestan las viviendas vendidas", "Compraventas de vivienda libre según el precio (% del total)"],
    h_mt_rangs: (b, n, p, a, eb, ea) => `En el ${p}, el <b>${b}</b> de las ${n} viviendas libres vendidas en la provincia costaron menos de 150.000 €, y el ${a}, más de 450.000 € (España, ${eb} y ${ea}).`,
    mt_qui: ["Quién compra vivienda en la provincia", "Compraventas de vivienda según dónde vive el comprador, últimos 4 trimestres (%)"],
    h_mt_qui: (g, b, n) => `El <b>${g}</b> de las viviendas vendidas en la provincia en un año las compró alguien que vive en ella; el ${b}, gente de la provincia de Barcelona, y el ${n}, gente que no vive en España.`,
    mt_ext: ["Compradores extranjeros", "Compraventas de vivienda hechas por extranjeros, residentes o no en España (% del total, suma de 4 trimestres)"],
    h_mt_ext: (g, c, e, g0, a0) => `Los extranjeros hacen el <b>${g}</b> de las compraventas de vivienda en la provincia, frente al ${c} en Cataluña y el ${e} en España. En ${a0} eran el ${g0}.`,
    mt_nova: ["Vivienda nueva", "Viviendas nuevas entre las compraventas (% del total, suma de 4 trimestres)"],
    h_mt_nova: (g, mx, pmx, e) => `Solo el <b>${g}</b> de las viviendas vendidas en la provincia en un año eran nuevas (España, ${e}). En ${pmx} eran el ${mx}.`,
    mt_unif: ["Casas", "Compraventas de vivienda libre en edificios de una sola vivienda (% del total, suma de 4 trimestres)"],
    h_mt_unif: (g, c, e) => `El <b>${g}</b> de las viviendas libres vendidas en la provincia son casas (edificios de una sola vivienda), más que en Cataluña (${c}) y en España (${e}).`,
    mt_ini: ["Viviendas libres iniciadas y terminadas", "Viviendas libres empezadas y terminadas en la provincia cada año"],
    mt_it_noms: { gi: "Iniciadas", cat: "Terminadas" },
    h_mt_ini: (a, i, t, amx, mx, m12, fins, d) => `En ${a} se empezaron <b>${i} viviendas libres</b> en la provincia y se terminaron ${t}. En ${amx}, en plena burbuja, se empezaron ${mx}.${m12 ? ` En los 12 meses ${fins}, ${m12} (${d} que un año antes).` : ""}`,
    mt_vt: ["Valor tasado por tipo de vivienda", "Valor tasado medio del metro cuadrado (€/m²)"],
    h_mt_vt: (g, p, dc, n, pr) => `El metro cuadrado de vivienda libre se tasa a <b>${g} €</b> en la provincia (${p}), ${dc} que en Cataluña. La vivienda de menos de 5 años, a ${n} €; la protegida, a ${pr} €.`,
    mt: { gi: "Viven en la provincia de Girona", bcn: "Viven en la provincia de Barcelona", esp: "Viven en el resto de España", nores: "No viven en España",
      r150: "Hasta 150.000 €", r300: "De 150.000 a 300.000 €", r450: "De 300.000 a 450.000 €", r600: "De 450.000 a 600.000 €", rmes: "Más de 600.000 €",
      vt_tot: "Vivienda libre", vt_nova: "Libre, hasta 5 años", vt_vella: "Libre, más de 5 años", vt_prot: "Vivienda protegida" },
    mes_que: "más", menys_que: "menos",
    font_mt: "Fuente: Ministerio de Vivienda y Agenda Urbana, Boletín estadístico (compraventas ante notario)",
    font_mt_ini: "Fuente: Ministerio de Vivienda y Agenda Urbana, Boletín estadístico (certificados de los colegios de aparejadores)",
    font_mt_vt: "Fuente: Ministerio de Vivienda y Agenda Urbana, Boletín estadístico (tasaciones para hipotecas)",
  };
  window.PG.textos(ca, es);
  const T = () => (LANG === "es" ? es : ca);
  const tx = (k, ...a) => { const v = T()[k]; return typeof v === "function" ? v(...a) : v; };
  window.PG.grup((g, c) => (c && c.startsWith("mt:") ? T().mt[c.slice(3)] || g : null));
  const ult = (s) => (s && s.length ? s[s.length - 1] : null);
  const et = (e) => window.PG.etiqueta(e);
  // «fins al juny del 2026» / «hasta junio de 2026»
  const fins = (e) => {
    const m = /^(\d{4})-(\d{2})$/.exec(e || ""); if (!m) return e;
    const MES = LANG === "es" ? ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"]
      : ["gener", "febrer", "març", "abril", "maig", "juny", "juliol", "agost", "setembre", "octubre", "novembre", "desembre"];
    const n = MES[+m[2] - 1];
    return LANG === "ca" ? `fins ${/^[aeiou]/.test(n) ? "a l'" : "al "}${n} del ${m[1]}` : `hasta ${n} de ${m[1]}`;
  };
  const dif = (a, b) => { const d = (a / b - 1) * 100; return `un ${pct(Math.abs(d), 0)} ${d >= 0 ? T().mes_que : T().menys_que}`; };
  window.PG.titular((id, sp) => {
    if (!/^mt_/.test(id)) return null;
    const s = sp.series || {}, a = sp.abs || {}, gs = sp.grups || [];
    const g = ult(s.gi), c = ult(s.cat), e = ult(s.esp);
    const grup = (k) => gs.find((x) => x.g === k) || {};
    if (id === "mt_preu" && g) return tx("h_mt_preu", fmt(g[2]), et(g[1]), a.mx != null && g[2] > a.mx, fmt(a.mx), et(a.pmx || ""), fmt(c && c[2]), fmt(e && e[2]), a.ext ? fmt(a.ext) : "");
    if (id === "mt_rangs" && gs.length) {
      const a450 = (k) => (grup("r600")[k] || 0) + (grup("rmes")[k] || 0); // més de 450.000 €
      return tx("h_mt_rangs", pct(grup("r150").gi, 0), fmt(a.n), et(sp.any), pct(a450("gi"), 0), pct(grup("r150").esp, 0), pct(a450("esp"), 0));
    }
    if (id === "mt_qui" && gs.length) return tx("h_mt_qui", pct(grup("gi").gi, 0), pct(grup("bcn").gi, 0), pct(grup("nores").gi, 0));
    if (id === "mt_ext" && g) { const g0 = s.gi[0]; return tx("h_mt_ext", pct(g[2], 0), pct(c && c[2], 0), pct(e && e[2], 0), pct(g0[2], 0), g0[1].slice(0, 4)); }
    if (id === "mt_nova" && g) { const mx = s.gi.reduce((r, x) => (x[2] > r[2] ? x : r), s.gi[0]); return tx("h_mt_nova", pct(g[2], 1), pct(mx[2], 0), mx[1].slice(0, 4), pct(e && e[2], 1)); }
    if (id === "mt_unif" && g) return tx("h_mt_unif", pct(g[2], 0), pct(c && c[2], 0), pct(e && e[2], 0));
    if (id === "mt_ini" && a.any) {
      const d = a.m12 && a.m12_0 ? dif(a.m12, a.m12_0) : "";
      return tx("h_mt_ini", a.any, fmt(a.ini), fmt(a.ter), a.amx, fmt(a.mx), a.m12 ? fmt(a.m12) : "", fins(a.fins), d);
    }
    if (id === "mt_vt" && gs.length) {
      const t = grup("vt_tot");
      return tx("h_mt_vt", fmt(t.gi), et(sp.any), dif(t.gi, t.cat), fmt(grup("vt_nova").gi), fmt(grup("vt_prot").gi));
    }
    return "";
  });
})();
