"use strict";
/* Energia i connectivitat: sección con cifras y gráficos (D.en.prov, D.en.x) y bloque de la ficha municipal (m.en, m.en_f).
   Usa las globales de app.js (D, LANG, fmt, pct, tile) y window.PG (provincia.js). */
(function () {
  const LL = "ABCDEFG";
  const TX = {
    ca: {
      h: "Energia i connectivitat",
      sub: "Lletra energètica dels habitatges certificats, recàrrega elèctrica, gasolineres i cobertura d'internet.",
      cert: "Certificats energètics", cert_n: (n) => `${n} habitatges amb certificat`,
      cert_txt: (eg, ab, kwh) => `<b>${eg}</b> tenen lletra E, F o G i ${ab} una A o una B. Consum mitjà: ${kwh} kWh/m² l'any d'energia primària no renovable.`,
      rec: "Recàrrega", rec_txt: (n, r, kw) => `<b>${n}</b> punts de recàrrega per a cotxes elèctrics${r ? `, ${r} ${r === "1" ? "ràpid" : "de ràpids"} (50 kW o més)` : ""}${kw ? `; el més potent, de ${kw} kW` : ""}.`,
      rec_cap: "Cap punt de recàrrega públic al registre de la Generalitat.",
      gas: "Gasolineres", gas_txt: (n, g, d, dia) => `<b>${n}</b> ${n === "1" ? "gasolinera" : "gasolineres"}. El ${dia}, gasolina 95 a <b>${g}</b> i gasoil a ${d} (mediana).`,
      gas_bar: (r, g) => ` La més barata, ${r}: ${g} el litre de 95.`,
      cob: "Internet", cob_txt: (a, f, g1, c5) => `Al juny del ${a}, <b>${f}</b> dels habitatges tenien fibra fins a casa, ${g1} podien tenir 1 Gbps i ${c5} cobertura 5G.`,
      font: "Fonts: ICAEN, Generalitat, Ministeri per a la Transició Ecològica i Ministeri per a la Transformació Digital.",
      x_cert: "Habitatges certificats amb lletra E, F o G", xn_cert: (n, ab, nous) => `de ${n} certificats; A o B, ${ab}${nous ? ` (els edificis nous, ${nous})` : ""}`,
      x_g95: (d) => `Gasolina 95, ${d}`, xn_g95: (c, e) => `mediana de la província; Catalunya ${c}, Espanya ${e}`,
      x_rec: "Punts de recàrrega elèctrica", xn_rec: (r, m, h) => `${r} de ràpids, en ${m} municipis; ${h} per 10.000 habitants`,
      x_cob: (a) => `Habitatges amb fibra, ${a}`, xn_cob: (g, c) => `${g} amb 1 Gbps i ${c} amb 5G`,
    },
    es: {
      h: "Energía y conectividad",
      sub: "Letra energética de las viviendas certificadas, recarga eléctrica, gasolineras y cobertura de internet.",
      cert: "Certificados energéticos", cert_n: (n) => `${n} viviendas con certificado`,
      cert_txt: (eg, ab, kwh) => `<b>${eg}</b> tienen letra E, F o G y ${ab} una A o una B. Consumo medio: ${kwh} kWh/m² al año de energía primaria no renovable.`,
      rec: "Recarga", rec_txt: (n, r, kw) => `<b>${n}</b> puntos de recarga para coches eléctricos${r ? `, ${r} ${r === "1" ? "rápido" : "rápidos"} (50 kW o más)` : ""}${kw ? `; el más potente, de ${kw} kW` : ""}.`,
      rec_cap: "Ningún punto de recarga público en el registro de la Generalitat.",
      gas: "Gasolineras", gas_txt: (n, g, d, dia) => `<b>${n}</b> ${n === "1" ? "gasolinera" : "gasolineras"}. El ${dia}, gasolina 95 a <b>${g}</b> y gasóleo a ${d} (mediana).`,
      gas_bar: (r, g) => ` La más barata, ${r}: ${g} el litro de 95.`,
      cob: "Internet", cob_txt: (a, f, g1, c5) => `En junio de ${a}, <b>${f}</b> de las viviendas tenían fibra hasta casa, ${g1} podían tener 1 Gbps y ${c5} cobertura 5G.`,
      font: "Fuentes: ICAEN, Generalitat, Ministerio para la Transición Ecológica y Ministerio para la Transformación Digital.",
      x_cert: "Viviendas certificadas con letra E, F o G", xn_cert: (n, ab, nous) => `de ${n} certificados; A o B, ${ab}${nous ? ` (los edificios nuevos, ${nous})` : ""}`,
      x_g95: (d) => `Gasolina 95, ${d}`, xn_g95: (c, e) => `mediana de la provincia; Cataluña ${c}, España ${e}`,
      x_rec: "Puntos de recarga eléctrica", xn_rec: (r, m, h) => `${r} rápidos, en ${m} municipios; ${h} por 10.000 habitantes`,
      x_cob: (a) => `Viviendas con fibra, ${a}`, xn_cob: (g, c) => `${g} con 1 Gbps y ${c} con 5G`,
    },
  };
  const tx = (k, ...a) => { const v = TX[LANG][k]; return typeof v === "function" ? v(...a) : v; };
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  const eur = (v, d = 3) => (v == null ? "–" : `${fmt(v, d)} €`);
  const dia = (d) => (d && window.PG ? window.PG.etiqueta(d) : d || "");

  // Barra con la distribución de letras A-G
  const barra = (dist) => {
    const n = dist.reduce((a, b) => a + b, 0);
    if (!n) return "";
    return `<div class="en-barra" role="img" aria-label="${LL.split("").map((l, i) => `${l}: ${pct(100 * dist[i] / n, 0)}`).join(", ")}">${dist.map((v, i) => v ? `<span class="en-${LL[i]}" style="flex:${v}" title="${LL[i]}: ${pct(100 * v / n, 1)}">${100 * v / n >= 6 ? LL[i] : ""}</span>` : "").join("")}</div>`;
  };

  window.blocEnergia = (m) => {
    const f = m.en_f;
    if (!f) return "";
    const c = f.cert, r = f.rec, g = f.gas, o = f.cob, X = (D.en && D.en.x) || {};
    const cert = c && c.n >= 10 ? `<p class="fx-sub2">${tx("cert")}</p><p class="fx-dada">${tx("cert_n", fmt(c.n))}</p>${barra(c.dist)}
      <p class="fx-dada">${tx("cert_txt", pct(c.eg, 0), pct(c.ab, 1), fmt(c.kwh))}</p>` : "";
    const rec = `<p class="fx-sub2">${tx("rec")}</p><p class="fx-dada">${r ? tx("rec_txt", fmt(r.n), r.rapid ? fmt(r.rapid) : "", r.kw ? fmt(r.kw) : "") : tx("rec_cap")}</p>`;
    const gas = g ? `<p class="fx-sub2">${tx("gas")}</p><p class="fx-dada">${tx("gas_txt", fmt(g.n), eur(g.g95), eur(g.diesel), dia(X.carb && X.carb.dia))}${g.barata && g.n > 1 ? tx("gas_bar", esc(g.barata.rotul), eur(g.barata.g95)) : ""}</p>` : "";
    const cob = o && o.ftth != null ? `<p class="fx-sub2">${tx("cob")}</p><p class="fx-dada">${tx("cob_txt", D.anys && D.anys.en_cob, pct(o.ftth, o.ftth > 99 ? 1 : 0), pct(o["1g"], 0), pct(o["5g"], 0))}</p>` : "";
    return `<section class="fitxa-bloc fx-ene"><h3>${tx("h")}</h3><p class="fb-sub">${tx("sub")}</p>
      <div class="fx-dues"><div>${cert}${cob}</div><div>${rec}${gas}</div></div>
      <p class="fb-font">${tx("font")}</p></section>`;
  };

  if (!window.PG) return;
  const ult = (s) => (s && s.length ? s[s.length - 1] : null);
  const ca = {
    ene_cert: ["Lletra energètica", "Habitatges existents certificats cada any, segons la lletra de consum (%)"],
    ene_cert_noms: { gi: "Lletra E, F o G", cat: "Lletra A o B" },
    h_ene_cert: (v, a, ab) => `El ${a}, <b>${v}</b> dels pisos i cases que es van certificar (sobretot per vendre'ls o llogar-los) tenien una E, una F o una G. Només ${ab} treien una A o una B.`,
    ene_carb: ["Preu dels carburants", "Mediana de les gasolineres de la província, el primer dia de cada mes (€/litre)"],
    ene_carb_noms: { gi: "Gasolina 95", cat: "Gasoil A" },
    h_ene_carb: (g, d, dia, mx, amx) => `El ${dia}, la gasolina 95 costava <b>${g}</b> el litre i el gasoil ${d}. El màxim de la sèrie va ser ${mx}, ${amx}.`,
    ene_cob: ["Cobertura d'internet", "Habitatges de la província amb cobertura, mitjana ponderada per població (%)"],
    ene_cob_noms: { gi: "Fibra fins a casa (FTTH)", cat: "100 Mbps o més", esp: "5G" },
    h_ene_cob: (f, a, f0, a0) => `Al ${a}, <b>${f}</b> dels habitatges de la província tenien fibra fins a casa; el ${a0}, ${f0}.`,
    font_ene_cert: "Font: ICAEN", font_ene_carb: "Font: Ministeri per a la Transició Ecològica", font_ene_cob: "Font: Ministeri per a la Transformació Digital",
  };
  const es = {
    ene_cert: ["Letra energética", "Viviendas existentes certificadas cada año, según la letra de consumo (%)"],
    ene_cert_noms: { gi: "Letra E, F o G", cat: "Letra A o B" },
    h_ene_cert: (v, a, ab) => `En ${a}, <b>${v}</b> de los pisos y casas que se certificaron (sobre todo para venderlos o alquilarlos) tenían una E, una F o una G. Solo ${ab} sacaban una A o una B.`,
    ene_carb: ["Precio de los carburantes", "Mediana de las gasolineras de la provincia, el primer día de cada mes (€/litro)"],
    ene_carb_noms: { gi: "Gasolina 95", cat: "Gasóleo A" },
    h_ene_carb: (g, d, dia, mx, amx) => `El ${dia}, la gasolina 95 costaba <b>${g}</b> el litro y el gasóleo ${d}. El máximo de la serie fue ${mx}, en ${amx}.`,
    ene_cob: ["Cobertura de internet", "Viviendas de la provincia con cobertura, media ponderada por población (%)"],
    ene_cob_noms: { gi: "Fibra hasta casa (FTTH)", cat: "100 Mbps o más", esp: "5G" },
    h_ene_cob: (f, a, f0, a0) => `En ${a}, <b>${f}</b> de las viviendas de la provincia tenían fibra hasta casa; en ${a0}, ${f0}.`,
    font_ene_cert: "Fuente: ICAEN", font_ene_carb: "Fuente: Ministerio para la Transición Ecológica", font_ene_cob: "Fuente: Ministerio para la Transformación Digital",
  };
  window.PG.textos(ca, es);
  const T = () => (LANG === "es" ? es : ca);
  const tp = (k, ...a) => { const v = T()[k]; return typeof v === "function" ? v(...a) : v; };
  window.PG.titular((id, sp) => {
    if (!/^ene_/.test(id)) return null;
    const s = sp.series || {}, g = ult(s.gi), c = ult(s.cat);
    if (id === "ene_cert" && g) return tp("h_ene_cert", pct(g[2], 0), g[1], c ? pct(c[2], 0) : "–");
    if (id === "ene_carb" && g) {
      const mx = s.gi.reduce((b, x) => (x[2] > b[2] ? x : b), s.gi[0]);
      return tp("h_ene_carb", eur(g[2]), c ? eur(c[2]) : "–", dia(g[1]), eur(mx[2]), dia(mx[1]).toLowerCase());
    }
    if (id === "ene_cob" && g) { const g0 = s.gi[0]; return tp("h_ene_cob", pct(g[2], 0), g[1], pct(g0[2], 0), g0[1]); }
    return "";
  });

  window.pintaSeccioEne = () => {
    const A = D.en && D.en.prov, sec = document.getElementById("s-ene");
    if (!A || !Object.keys(A).length) { if (sec) sec.hidden = true; return; }
    const ids = ["ene_cert", "ene_carb", "ene_cob"].filter((k) => A[k]);
    window.PG.pintaGrafics(document.getElementById("ene-grafics"), A, ids, (id) => "font_" + id);
    const x = document.getElementById("ene-xifres"), X = D.en.x || {};
    if (!x) return;
    const ce = X.cert, ca_ = X.carb, re = X.rec, co = X.cob;
    x.innerHTML = [
      ce ? tile(tx("x_cert"), pct(ce.eg, 0), tx("xn_cert", fmt(ce.n), pct(ce.ab, 0), ce.nous_ab != null ? pct(ce.nous_ab, 0) : "")) : "",
      ca_ && ca_.g95 && ca_.g95.gi ? tile(tx("x_g95", dia(ca_.dia)), eur(ca_.g95.gi), tx("xn_g95", eur(ca_.g95.cat), eur(ca_.g95.esp))) : "",
      re ? tile(tx("x_rec"), fmt(re.n), tx("xn_rec", fmt(re.rapid), fmt(re.mun), fmt(re.per10k, 1))) : "",
      co && co.ftth != null ? tile(tx("x_cob", co.any), pct(co.ftth, 0), tx("xn_cob", pct(co["1g"], 0), pct(co["5g"], 0))) : "",
    ].join("");
  };
})();
