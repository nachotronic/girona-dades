/* Delitos de odio y discriminación (Mossos) en «La província»: textos, titulares y grupos de odi_any y odi_ambit. */
(function () {
  if (!window.PG) return;
  const ca = {
    odi_any: ["Delictes d'odi", "Fets d'odi i discriminació coneguts pels Mossos per 100.000 habitants"],
    odia_noms: { gi: "Província de Girona", cat: "Catalunya" },
    h_odi_any: (n, a, n0, a0, d) => `Els Mossos van registrar <b>${n} fets d'odi i discriminació</b> a la província el ${a}, ${d} que l'any anterior. El ${a0} n'eren ${n0}.`,
    odi_ambit: ["Odi per què", "Fets d'odi segons el motiu (%)"],
    odib_noms: { gi: "Província de Girona", cat: "Catalunya" },
    h_odi_ambit: (m, v, p, c) => `El motiu més freqüent a la província és <b>${m}</b>: el ${v} dels fets del ${p} (a Catalunya, el ${c}).`,
    odi_amb: { racisme: "el racisme i l'origen", lgtbi: "la LGTBI-fòbia", politica: "la ideologia política", religio: "la religió (islamofòbia, antisemitisme…)", sexisme: "el sexisme", aporofobia: "l'aporofòbia (odi als pobres)", discapacitat: "la discapacitat", altres: "altres motius" },
    odi_amb_g: { racisme: "Racisme i origen", lgtbi: "LGTBI-fòbia", politica: "Ideologia política", religio: "Religió", sexisme: "Sexisme", aporofobia: "Aporofòbia", discapacitat: "Discapacitat", altres: "Altres" },
    font_odi: "Font: Mossos d'Esquadra, fets delictius i infraccions administratives de l'àmbit de l'odi i la discriminació",
  };
  const es = {
    odi_any: ["Delitos de odio", "Hechos de odio y discriminación conocidos por los Mossos por 100.000 habitantes"],
    odia_noms: { gi: "Provincia de Girona", cat: "Cataluña" },
    h_odi_any: (n, a, n0, a0, d) => `Los Mossos registraron <b>${n} hechos de odio y discriminación</b> en la provincia en ${a}, ${d} que el año anterior. En ${a0} fueron ${n0}.`,
    odi_ambit: ["Odio por qué", "Hechos de odio según el motivo (%)"],
    odib_noms: { gi: "Provincia de Girona", cat: "Cataluña" },
    h_odi_ambit: (m, v, p, c) => `El motivo más frecuente en la provincia es <b>${m}</b>: el ${v} de los hechos de ${p} (en Cataluña, el ${c}).`,
    odi_amb: { racisme: "el racismo y el origen", lgtbi: "la LGTBI-fobia", politica: "la ideología política", religio: "la religión (islamofobia, antisemitismo…)", sexisme: "el sexismo", aporofobia: "la aporofobia (odio a los pobres)", discapacitat: "la discapacidad", altres: "otros motivos" },
    odi_amb_g: { racisme: "Racismo y origen", lgtbi: "LGTBI-fobia", politica: "Ideología política", religio: "Religión", sexisme: "Sexismo", aporofobia: "Aporofobia", discapacitat: "Discapacidad", altres: "Otros" },
    font_odi: "Fuente: Mossos d'Esquadra, hechos delictivos e infracciones administrativas del ámbito del odio y la discriminación",
  };
  window.PG.textos(ca, es);
  const T = () => (LANG === "es" ? es : ca);
  const tx = (k, ...a) => { const v = T()[k]; return typeof v === "function" ? v(...a) : v; };
  window.PG.grup((g, c) => (c && c.startsWith("odi:") ? T().odi_amb_g[c.slice(4)] || g : null));
  const pc = (v) => `${fmt(v, 0)} %`;
  const delta = (n, n0) => {
    if (!n0) return "";
    const p = Math.round((n / n0 - 1) * 100);
    return LANG === "es" ? (p >= 0 ? `un ${p} % más` : `un ${-p} % menos`) : (p >= 0 ? `un ${p} % més` : `un ${-p} % menys`);
  };
  window.PG.titular((id, sp) => {
    if (!/^odi_/.test(id)) return null;
    const a = sp.abs || {};
    if (id === "odi_any") return a.n != null ? tx("h_odi_any", fmt(a.n), a.any, fmt(a.n0), a.a0, delta(a.n, a.n_ant)) : "";
    if (id === "odi_ambit") {
      const g = (sp.grups || []).find((x) => x.c !== "odi:altres");
      return g ? tx("h_odi_ambit", T().odi_amb[g.c.slice(4)], pc(g.gi), (a.per || "").replace("–", LANG === "es" ? " a " : " al "), pc(g.cat)) : "";
    }
    return "";
  });
})();
