/* Muertos en incendios en «La província» (informes de Fundación Mapfre y APTB): textos y titulares de inc_*. */
(function () {
  if (!window.PG) return;
  const ca = {
    inc_morts: ["Morts en incendis", "Morts en incendis i explosions per milió d'habitants"],
    h_inc_morts: (n, v, a, g, c, e, t, a0, mx, amx) => `El ${a} van morir <b>${n} persones en incendis</b> a la província, ${v} a casa seva: ${g} per milió d'habitants (Catalunya, ${c}; Espanya, ${e}). Des del ${a0} n'han mort ${t}; el pitjor any va ser el ${amx}, amb ${mx}.`,
    font_mapfre: "Font: Fundación Mapfre i APTB, Víctimes d'incendis a Espanya (no hi ha dades per província del 2016)",
  };
  const es = {
    inc_morts: ["Muertos en incendios", "Muertos en incendios y explosiones por millón de habitantes"],
    h_inc_morts: (n, v, a, g, c, e, t, a0, mx, amx) => `En ${a} murieron <b>${n} personas en incendios</b> en la provincia, ${v} en su casa: ${g} por millón de habitantes (Cataluña, ${c}; España, ${e}). Desde ${a0} han muerto ${t}; el peor año fue ${amx}, con ${mx}.`,
    font_mapfre: "Fuente: Fundación Mapfre y APTB, Víctimas de incendios en España (no hay datos por provincia de 2016)",
  };
  window.PG.textos(ca, es);
  const T = () => (LANG === "es" ? es : ca);
  const tx = (k, ...a) => { const v = T()[k]; return typeof v === "function" ? v(...a) : v; };
  const ult = (s) => (s && s.length ? s[s.length - 1] : null);
  window.PG.titular((id, sp) => {
    if (id !== "inc_morts") return null;
    const s = sp.series || {};
    const a = sp.abs, g = ult(s.gi), c = ult(s.cat), e = ult(s.esp); if (!a || !g) return "";
    return tx("h_inc_morts", fmt(a.n), fmt(a.viv), a.any, fmt(g[2], 1), fmt(c && c[2], 1), fmt(e && e[2], 1), fmt(a.total), a.a0, fmt(a.max), a.amax);
  });
})();
