/* Muertos en incendios en «La província» (informes de Fundación Mapfre y APTB): textos y titulares de inc_*. */
(function () {
  if (!window.PG) return;
  const ca = {
    inc_morts: ["Morts en incendis", "Morts en incendis i explosions per milió d'habitants"],
    h_inc_morts: (n, v, a, g, c, e) => `El ${a} van morir <b>${n} persones en incendis</b> a la província, ${v} a casa seva: ${g} per milió d'habitants (Catalunya, ${c}; Espanya, ${e}).`,
    inc_morts_n: ["Quantes persones moren en incendis", "Morts en incendis i explosions a la província cada any"],
    incm_noms: { gi: "Total", cat: "A l'habitatge" },
    h_inc_morts_n: (t, a0, mx, amx, pc, av) => `Des del ${a0}, <b>${t} persones</b> han mort en incendis a la província. El pitjor any va ser el ${amx}, amb ${mx}. Des del ${av}, el ${pc} van morir a casa seva.`,
    font_mapfre: "Font: Fundación Mapfre i APTB, Víctimes d'incendis a Espanya (no hi ha dades per província del 2016)",
  };
  const es = {
    inc_morts: ["Muertos en incendios", "Muertos en incendios y explosiones por millón de habitantes"],
    h_inc_morts: (n, v, a, g, c, e) => `En ${a} murieron <b>${n} personas en incendios</b> en la provincia, ${v} en su casa: ${g} por millón de habitantes (Cataluña, ${c}; España, ${e}).`,
    inc_morts_n: ["Cuántas personas mueren en incendios", "Muertos en incendios y explosiones en la provincia cada año"],
    incm_noms: { gi: "Total", cat: "En la vivienda" },
    h_inc_morts_n: (t, a0, mx, amx, pc, av) => `Desde ${a0}, <b>${t} personas</b> han muerto en incendios en la provincia. El peor año fue ${amx}, con ${mx}. Desde ${av}, el ${pc} murieron en su casa.`,
    font_mapfre: "Fuente: Fundación Mapfre y APTB, Víctimas de incendios en España (no hay datos por provincia de 2016)",
  };
  window.PG.textos(ca, es);
  const T = () => (LANG === "es" ? es : ca);
  const tx = (k, ...a) => { const v = T()[k]; return typeof v === "function" ? v(...a) : v; };
  const ult = (s) => (s && s.length ? s[s.length - 1] : null);
  window.PG.titular((id, sp) => {
    if (!/^inc_morts/.test(id)) return null;
    const s = sp.series || {};
    if (id === "inc_morts") {
      const a = sp.abs, g = ult(s.gi), c = ult(s.cat), e = ult(s.esp); if (!a || !g) return "";
      return tx("h_inc_morts", fmt(a.n), fmt(a.viv), a.any, fmt(g[2], 1), fmt(c && c[2], 1), fmt(e && e[2], 1));
    }
    const g = s.gi; if (!g || !g.length) return "";
    const mx = g.reduce((r, x) => (x[2] > r[2] ? x : r), g[0]);
    const v = s.cat || [], av = v.length ? v[0][0] : null;
    const tv = v.reduce((t, x) => t + x[2], 0), tg = g.filter((x) => av != null && x[0] >= av).reduce((t, x) => t + x[2], 0);
    return tx("h_inc_morts_n", fmt(g.reduce((t, x) => t + x[2], 0)), g[0][1], fmt(mx[2]), mx[1], pct(tg ? (tv / tg) * 100 : null, 0), av);
  });
})();
