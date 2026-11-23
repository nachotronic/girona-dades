"use strict";
/* Medi ambient: sección con cifras y gráficos (D.amb.prov) y bloque de la ficha municipal (m.amb, m.amb_f).
   Usa las globales de app.js (D, LANG, fmt, pct, tile) y window.PG (provincia.js). */
(function () {
  const TX = {
    ca: {
      x_ter: "Aigua als embassaments del Ter", xn_ter: (a, b) => `Sau i Susqueda, ${a}. Boadella: ${b}`,
      x_temp: (a) => `Temperatura mitjana del ${a}`, xn_temp: (d, a0) => `${d} respecte a la mitjana del ${a0} ençà`,
      x_seq: (a) => `Municipis amb sequera greu el ${a}`, xn_seq: (n) => `de ${n} amb dades de l'ACA`,
      h: "Medi ambient",
      sub: "Territori protegit, sequera i el temps que fa a l'estació meteorològica més propera.",
      n2000: "Xarxa Natura 2000", enp: "Espais naturals protegits", zvn: "Zona vulnerable per nitrats",
      del_terme: "del terme", cap: "gens",
      espais: "Espais", platges: (n) => `${n} platges`,
      seq: "Sequera", seq_any: (a, e, al) => `El ${a}: <b>${e} dies</b> en excepcionalitat o emergència i ${al} en alerta o pitjor.`,
      seq_ara: ["normalitat", "prealerta", "alerta", "excepcionalitat", "emergència", "emergència II", "emergència III"],
      seq_estat: (s) => `Estat actual: <b>${s}</b>.`,
      met: (nom, km) => `Estació meteorològica més propera: <b>${nom}</b>${km > 1 ? ` (a ${km} km)` : ""}`,
      met_any: (a, t, ta, p, pa) => `El ${a} hi va fer una temperatura mitjana de <b>${t} °C</b>${ta != null ? ` (${ta} respecte als anys anteriors)` : ""} i hi van caure <b>${p} mm</b> de pluja${pa != null ? ` (${pa})` : ""}.`,
      met_dies: (d30, n20, g) => `${d30} dies de 30 °C o més, ${n20} nits tropicals i ${g} dies de glaçada.`,
      font: "Fonts: MITECO, Agència Catalana de l'Aigua, Departament de Territori i Meteocat.",
    },
    es: {
      x_ter: "Agua en los embalses del Ter", xn_ter: (a, b) => `Sau y Susqueda, ${a}. Boadella: ${b}`,
      x_temp: (a) => `Temperatura media de ${a}`, xn_temp: (d, a0) => `${d} respecto a la media desde ${a0}`,
      x_seq: (a) => `Municipios con sequía grave en ${a}`, xn_seq: (n) => `de ${n} con datos de la ACA`,
      h: "Medio ambiente",
      sub: "Territorio protegido, sequía y el tiempo que hace en la estación meteorológica más cercana.",
      n2000: "Red Natura 2000", enp: "Espacios naturales protegidos", zvn: "Zona vulnerable por nitratos",
      del_terme: "del término", cap: "nada",
      espais: "Espacios", platges: (n) => `${n} playas`,
      seq: "Sequía", seq_any: (a, e, al) => `En ${a}: <b>${e} días</b> en excepcionalidad o emergencia y ${al} en alerta o peor.`,
      seq_ara: ["normalidad", "prealerta", "alerta", "excepcionalidad", "emergencia", "emergencia II", "emergencia III"],
      seq_estat: (s) => `Estado actual: <b>${s}</b>.`,
      met: (nom, km) => `Estación meteorológica más cercana: <b>${nom}</b>${km > 1 ? ` (a ${km} km)` : ""}`,
      met_any: (a, t, ta, p, pa) => `En ${a} hubo una temperatura media de <b>${t} °C</b>${ta != null ? ` (${ta} respecto a los años anteriores)` : ""} y cayeron <b>${p} mm</b> de lluvia${pa != null ? ` (${pa})` : ""}.`,
      met_dies: (d30, n20, g) => `${d30} días de 30 °C o más, ${n20} noches tropicales y ${g} días de helada.`,
      font: "Fuentes: MITECO, Agència Catalana de l'Aigua, Departament de Territori y Meteocat.",
    },
  };
  const tx = (k, ...a) => { const v = TX[LANG][k]; return typeof v === "function" ? v(...a) : v; };
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  const sg = (v, d = 1) => `${v > 0 ? "+" : ""}${fmt(v, d)}`;
  const ult = (s) => (s && s.length ? s[s.length - 1] : null);
  const val = (m, k) => { const o = m.amb && m.amb[k]; if (!o) return null; const ks = Object.keys(o).sort(); return ks.length ? o[ks[ks.length - 1]] : null; };

  // Bloque de la ficha
  window.blocMediAmbient = (m) => {
    const f = m.amb_f || {};
    if (!m.amb && !f.met) return "";
    const fila = (k) => { const v = val(m, k + "_pct"); return v == null ? "" : `<li><span>${tx(k)}</span><span>${v > 0 ? `<b>${pct(v, v < 1 ? 1 : 0)}</b> ${tx("del_terme")}` : tx("cap")}</span></li>`; };
    const esp = [...(f.esp && f.esp.n2000 || []), ...(f.esp && f.esp.enp || [])];
    const unics = [...new Set(esp)].slice(0, 8);
    const a = D.anys && D.anys.amb_seq, se = a && m.amb && m.amb.seq_exc ? m.amb.seq_exc : null;
    // Año con más días de sequía grave
    let seqTxt = "";
    if (se) {
      const pitjor = Object.keys(se).sort((x, y) => se[y] - se[x] || y - x)[0];
      seqTxt = `<p class="fx-dada">${tx("seq_any", pitjor, fmt(se[pitjor]), fmt((m.amb.seq_alerta || {})[pitjor] || 0))}${f.seq_ara != null ? " " + tx("seq_estat", tx("seq_ara")[f.seq_ara] || "") : ""}</p>`;
    }
    const mt = f.met;
    const metTxt = mt ? `<p class="fx-dada">${tx("met", esc(mt.nom), fmt(mt.km))}. ${tx("met_any", D.anys && D.anys.amb_met, fmt(mt.t, 1), mt.ta != null ? `${sg(mt.ta)} °C` : null, fmt(mt.p), mt.pa != null ? `${sg(mt.pa, 0)} %` : null)} ${tx("met_dies", fmt(mt.dies30 || 0), fmt(mt.nits20 || 0), fmt(mt.glacades || 0))}</p>` : "";
    const pl = f.pl && f.pl.length ? `<p class="fx-dada">${tx("platges", f.pl.length)}: ${f.pl.slice(0, 12).map(esc).join(" · ")}${f.pl.length > 12 ? "…" : ""}</p>` : "";
    return `<section class="fitxa-bloc fx-amb"><h3>${tx("h")}</h3><p class="fb-sub">${tx("sub")}</p>
      <div class="fx-dues"><div><ul class="cu-bib">${fila("n2000")}${fila("enp")}${fila("zvn")}</ul>
        ${unics.length ? `<p class="fx-dada">${tx("espais")}: ${unics.map(esc).join(" · ")}</p>` : ""}${pl}</div>
      <div>${seqTxt ? `<p class="fx-sub2">${tx("seq")}</p>${seqTxt}` : ""}${metTxt}</div></div>
      <p class="fb-font">${tx("font")}</p></section>`;
  };

  if (!window.PG) return;
  const ca = {
    amb_emb: ["Aigua als embassaments", "Volum embassat sobre la capacitat (%)"],
    amb_emb_noms: { gi: "Sau i Susqueda (Ter)", cat: "Boadella (Muga)" },
    h_amb_emb: (v, d, b) => `Sau i Susqueda, que abasteixen Girona i bona part de l'àrea de Barcelona, són al <b>${v}</b> (${d}). Boadella, que abasteix l'Alt Empordà, al ${b}.`,
    amb_seq: ["Municipis en sequera", "Municipis de la província en cada estat de sequera, per mes"],
    amb_seq_noms: { gi: "Excepcionalitat o emergència", cat: "Alerta o pitjor" },
    h_amb_seq: (n, mes, mx, mmx) => `El pitjor moment va ser ${mmx}, amb <b>${mx} municipis</b> en excepcionalitat o emergència. ${mes}: ${n}.`,
    amb_temp: ["Temperatura mitjana", "Mitjana anual de les estacions de la XEMA amb sèrie completa (°C)"],
    amb_clima_noms: { gi: "Estacions de la província" },
    h_amb_temp: (v, a, d, a0, n) => `El ${a}, les ${n} estacions amb sèrie completa van marcar una mitjana de <b>${v} °C</b>, ${d} més que el ${a0}.`,
    amb_calor: ["Dies de calor", "Dies amb una màxima de 30 °C o més, mitjana de les estacions"],
    h_amb_calor: (v, a, v0, a0) => `<b>${v} dies</b> de 30 °C o més el ${a} de mitjana a cada estació; el ${a0} en van ser ${v0}.`,
    amb_prec: ["Pluja", "Precipitació anual, mitjana de les estacions (mm)"],
    h_amb_prec: (v, a, mn, amn) => `El ${a} van caure <b>${v} mm</b> de mitjana. L'any més sec de la sèrie va ser el ${amn}, amb ${mn} mm.`,
    amb_no2: ["Diòxid de nitrogen", "NO₂, mitjana anual a les estacions (µg/m³)"],
    h_amb_no2: (n, v, a) => `${n}: <b>${v} µg/m³</b> de NO₂ el ${a}. El límit de la UE és 40 i l'OMS recomana 10.`,
    amb_o3: ["Dies amb massa ozó", "Dies amb la mitjana de 8 hores per sobre de 120 µg/m³"],
    h_amb_o3: (n, v, a) => `${n} va tenir <b>${v} dies</b> amb massa ozó el ${a}. La UE en permet 25 l'any de mitjana; l'ozó puja amb la calor i el sol.`,
    amb_pm10: ["Partícules PM10", "PM10, mitjana anual a les estacions (µg/m³)"],
    h_amb_pm10: (n, v, a) => `${n}: <b>${v} µg/m³</b> de partícules PM10 el ${a} (límit de la UE: 40; OMS: 15).`,
    amb_aigua_dom: ["Aigua a casa", "Consum domèstic d'aigua de la xarxa (litres per habitant i dia)"],
    h_amb_aigua_dom: (v, a, c) => `A les comarques de Girona es gasten <b>${v} litres</b> d'aigua per persona i dia a casa (${a}; Catalunya, ${c}).`,
    amb_aigua_tot: ["Consum d'aigua total", "Consum total de la xarxa, cases i activitats (litres per habitant i dia)"],
    h_amb_aigua_tot: (v, a, c) => `Comptant també les activitats econòmiques, <b>${v} litres</b> per habitant i dia (${a}; Catalunya, ${c}).`,
    font_amb_aca: "Font: Agència Catalana de l'Aigua",
    font_amb_met: "Font: Meteocat, XEMA",
    font_amb_aire: "Font: Generalitat, XVPCA",
  };
  const es = {
    amb_emb: ["Agua en los embalses", "Volumen embalsado sobre la capacidad (%)"],
    amb_emb_noms: { gi: "Sau y Susqueda (Ter)", cat: "Boadella (Muga)" },
    h_amb_emb: (v, d, b) => `Sau y Susqueda, que abastecen a Girona y a buena parte del área de Barcelona, están al <b>${v}</b> (${d}). Boadella, que abastece al Alt Empordà, al ${b}.`,
    amb_seq: ["Municipios en sequía", "Municipios de la provincia en cada estado de sequía, por mes"],
    amb_seq_noms: { gi: "Excepcionalidad o emergencia", cat: "Alerta o peor" },
    h_amb_seq: (n, mes, mx, mmx) => `El peor momento fue ${mmx}, con <b>${mx} municipios</b> en excepcionalidad o emergencia. ${mes}: ${n}.`,
    amb_temp: ["Temperatura media", "Media anual de las estaciones de la XEMA con serie completa (°C)"],
    amb_clima_noms: { gi: "Estaciones de la provincia" },
    h_amb_temp: (v, a, d, a0, n) => `En ${a}, las ${n} estaciones con serie completa marcaron una media de <b>${v} °C</b>, ${d} más que en ${a0}.`,
    amb_calor: ["Días de calor", "Días con una máxima de 30 °C o más, media de las estaciones"],
    h_amb_calor: (v, a, v0, a0) => `<b>${v} días</b> de 30 °C o más en ${a} de media en cada estación; en ${a0} fueron ${v0}.`,
    amb_prec: ["Lluvia", "Precipitación anual, media de las estaciones (mm)"],
    h_amb_prec: (v, a, mn, amn) => `En ${a} cayeron <b>${v} mm</b> de media. El año más seco de la serie fue ${amn}, con ${mn} mm.`,
    amb_no2: ["Dióxido de nitrógeno", "NO₂, media anual en las estaciones (µg/m³)"],
    h_amb_no2: (n, v, a) => `${n}: <b>${v} µg/m³</b> de NO₂ en ${a}. El límite de la UE es 40 y la OMS recomienda 10.`,
    amb_o3: ["Días con demasiado ozono", "Días con la media de 8 horas por encima de 120 µg/m³"],
    h_amb_o3: (n, v, a) => `${n} tuvo <b>${v} días</b> con demasiado ozono en ${a}. La UE permite 25 al año de media; el ozono sube con el calor y el sol.`,
    amb_pm10: ["Partículas PM10", "PM10, media anual en las estaciones (µg/m³)"],
    h_amb_pm10: (n, v, a) => `${n}: <b>${v} µg/m³</b> de partículas PM10 en ${a} (límite de la UE: 40; OMS: 15).`,
    amb_aigua_dom: ["Agua en casa", "Consumo doméstico de agua de la red (litros por habitante y día)"],
    h_amb_aigua_dom: (v, a, c) => `En las comarcas de Girona se gastan <b>${v} litros</b> de agua por persona y día en casa (${a}; Cataluña, ${c}).`,
    amb_aigua_tot: ["Consumo de agua total", "Consumo total de la red, casas y actividades (litros por habitante y día)"],
    h_amb_aigua_tot: (v, a, c) => `Contando también las actividades económicas, <b>${v} litros</b> por habitante y día (${a}; Cataluña, ${c}).`,
    font_amb_aca: "Fuente: Agència Catalana de l'Aigua",
    font_amb_met: "Fuente: Meteocat, XEMA",
    font_amb_aire: "Fuente: Generalitat, XVPCA",
  };
  window.PG.textos(ca, es);
  const T = () => (LANG === "es" ? es : ca);
  const tp = (k, ...a) => { const v = T()[k]; return typeof v === "function" ? v(...a) : v; };
  const mes = (e) => window.PG.etiqueta(e).toLowerCase();
  window.PG.titular((id, sp) => {
    if (!/^amb_/.test(id)) return null;
    const s = sp.series || {}, g = ult(s.gi), c = ult(s.cat);
    if (id === "amb_emb" && g) return tp("h_amb_emb", pct(g[2], 0), window.PG.etiqueta(g[1]), c ? pct(c[2], 0) : "–");
    if (id === "amb_seq" && g) { const mx = s.gi.reduce((b, x) => (x[2] > b[2] ? x : b), s.gi[0]); return tp("h_amb_seq", fmt(g[2]), window.PG.etiqueta(g[1]), fmt(mx[2]), mes(mx[1])); }
    if (id === "amb_temp" && g) { const g0 = s.gi[0]; return tp("h_amb_temp", fmt(g[2], 1), g[1], `${fmt(g[2] - g0[2], 1)} °C`, g0[1], sp.n_est); }
    if (id === "amb_calor" && g) { const g0 = s.gi[0]; return tp("h_amb_calor", fmt(g[2]), g[1], fmt(g0[2]), g0[1]); }
    if (id === "amb_prec" && g) { const mn = s.gi.reduce((b, x) => (x[2] < b[2] ? x : b), s.gi[0]); return tp("h_amb_prec", fmt(g[2]), g[1], fmt(mn[2]), mn[1]); }
    if (/^amb_(no2|o3|pm10)$/.test(id) && g) return tp("h_" + id, (sp.noms_ext || {}).gi || "", fmt(g[2], id === "amb_o3" ? 0 : 1), g[1]);
    if (/^amb_aigua_/.test(id) && g) return tp("h_" + id, fmt(g[2]), g[1], c ? fmt(c[2]) : "–");
    return "";
  });

  window.pintaSeccioAmb = () => {
    const A = D.amb && D.amb.prov, sec = document.getElementById("s-amb");
    if (!A || !Object.keys(A).length) { if (sec) sec.hidden = true; return; }
    // Nombres de las estaciones de cada gráfico de aire
    ["amb_no2", "amb_o3", "amb_pm10"].forEach((k) => { if (A[k] && A[k].noms_ext) { const o = { [k + "_noms"]: A[k].noms_ext }; window.PG.textos(o, o); } });
    const ids = ["amb_emb", "amb_seq", "amb_temp", "amb_calor", "amb_prec", "amb_no2", "amb_o3", "amb_pm10", "amb_aigua_dom", "amb_aigua_tot"];
    const font = (id) => (/^amb_(emb|seq|aigua)/.test(id) ? "font_amb_aca" : /^amb_(temp|calor|prec)$/.test(id) ? "font_amb_met" : "font_amb_aire");
    window.PG.pintaGrafics(document.getElementById("amb-grafics"), A, ids, font);
    const x = document.getElementById("amb-xifres");
    if (!x) return;
    const e = D.amb.emb, t = A.amb_temp && A.amb_temp.series.gi, sq = A.amb_seq && A.amb_seq.series.gi;
    const ts = t && t.length ? t[t.length - 1] : null;
    const any = D.anys && D.anys.amb_seq;
    let nSeq = null, nTot = 0;
    if (any) D.municipios.forEach((m) => { const v = m.amb && m.amb.seq_exc && m.amb.seq_exc[any]; if (m.amb && m.amb.seq_exc) { nTot++; if (v > 0) nSeq = (nSeq || 0) + 1; } });
    x.innerHTML = [
      e && e.ter != null ? tile(tx("x_ter"), pct(e.ter, 0), tx("xn_ter", window.PG.etiqueta(e.dia), e.boa != null ? pct(e.boa, 0) : "–")) : "",
      ts ? tile(tx("x_temp", ts[1]), `${fmt(ts[2], 1)} <small>°C</small>`, tx("xn_temp", `${sg(ts[2] - t[0][2])} °C`, t[0][1])) : "",
      any && nTot ? tile(tx("x_seq", any), fmt(nSeq || 0), tx("xn_seq", fmt(nTot))) : "",
    ].join("");
  };
})();
