"use strict";
/* Social: sección con cifras y gráficos (D.soc.prov, D.soc.x), cifras de Airbnb en la sección Turisme
   y bloques de la ficha municipal (m.soc, m.soc_f). Usa las globales de app.js (D, LANG, fmt, pct, tile) y window.PG (provincia.js). */
(function () {
  const TX = {
    ca: {
      h: "Social",
      sub: "Residències, centres de dia i altres serveis socials del municipi, i les persones que cuiden un familiar dependent.",
      res: "Residències per a gent gran",
      res_txt: (n, p, h, pb) => `${n === 1 ? "Hi ha <b>1 residència</b>" : `Hi ha <b>${n} residències</b>`} amb ${p} places: ${h} per cada 100 persones de 65 anys o més. ${pb ? `${pb} són de titularitat pública.` : ""}`,
      res_no: "No hi ha cap residència per a gent gran registrada al municipi.",
      dia_txt: (p) => `Els centres de dia per a gent gran hi tenen <b>${p} places</b>.`,
      serv: "Serveis registrats", serv_txt: (n) => `${n} serveis i establiments socials inscrits al registre de la Generalitat. Els que tenen més places:`,
      places: (n) => (n === 1 ? "1 plaça" : `${n} places`),
      cuid: "Cuidadors familiars", cuid_txt: (n, h, d) => `<b>${n}</b> persones del municipi cuiden un familiar dependent i cobren la prestació (${h} per 1.000 habitants); el ${d} són dones.`,
      font: "Fonts: Registre d'entitats, serveis i establiments socials (RESES) i Departament de Drets Socials (Generalitat).",
      air_h: "Airbnb", air_sub: "Anuncis actius a Airbnb al municipi, segons la darrera instantània d'Inside Airbnb.",
      air_txt: (n, d, h, s) => `El ${d} hi havia <b>${n} anuncis</b> (${h} per cada 100 habitatges); ${s} eren pisos sencers.`,
      air_preu: (p) => `Un pis sencer hi costa <b>${p} la nit</b> (mediana).`,
      air_sense: (n, m) => `${n} anuncis no mostren cap número de registre i ${m} són d'amfitrions amb 10 anuncis o més.`,
      air_font: "Font: Inside Airbnb.",
      x_res: "Places de residència", xn_res: (n, r, p) => `per cada 100 persones de 65 anys o més; ${n} places en ${r} residències, el ${p} públiques`,
      x_dep: (a) => `Persones dependents ateses, ${a}`, xn_dep: (c) => `per 1.000 habitants (Catalunya, ${c})`,
      x_ssb: (a) => `Ateses pels serveis socials, ${a}`, xn_ssb: (c) => `per 1.000 habitants (Catalunya, ${c})`,
      x_cuid: "Cuidadors familiars", xn_cuid: (d) => `persones que cuiden un familiar dependent; el ${d} són dones`,
      x_air: "Anuncis d'Airbnb", xn_air: (d, v) => `el ${d}, ${v} per cada 100 habitatges`,
      x_airs: "Pisos sencers a Airbnb", xn_airs: (p) => `dels anuncis; preu mitjà de ${p} la nit`,
      x_airr: "Airbnb sense registre", xn_airr: (m) => `dels anuncis no mostren cap número; el ${m} són d'amfitrions amb 10 anuncis o més`,
    },
    es: {
      h: "Social",
      sub: "Residencias, centros de día y otros servicios sociales del municipio, y las personas que cuidan a un familiar dependiente.",
      res: "Residencias para mayores",
      res_txt: (n, p, h, pb) => `${n === 1 ? "Hay <b>1 residencia</b>" : `Hay <b>${n} residencias</b>`} con ${p} plazas: ${h} por cada 100 personas de 65 años o más. ${pb ? `${pb} son de titularidad pública.` : ""}`,
      res_no: "No hay ninguna residencia para mayores registrada en el municipio.",
      dia_txt: (p) => `Los centros de día para mayores tienen <b>${p} plazas</b>.`,
      serv: "Servicios registrados", serv_txt: (n) => `${n} servicios y establecimientos sociales inscritos en el registro de la Generalitat. Los que tienen más plazas:`,
      places: (n) => (n === 1 ? "1 plaza" : `${n} plazas`),
      cuid: "Cuidadores familiares", cuid_txt: (n, h, d) => `<b>${n}</b> personas del municipio cuidan a un familiar dependiente y cobran la prestación (${h} por 1.000 habitantes); el ${d} son mujeres.`,
      font: "Fuentes: Registre d'entitats, serveis i establiments socials (RESES) y Departament de Drets Socials (Generalitat).",
      air_h: "Airbnb", air_sub: "Anuncios activos en Airbnb en el municipio, según la última instantánea de Inside Airbnb.",
      air_txt: (n, d, h, s) => `El ${d} había <b>${n} anuncios</b> (${h} por cada 100 viviendas); ${s} eran pisos enteros.`,
      air_preu: (p) => `Un piso entero cuesta <b>${p} la noche</b> (mediana).`,
      air_sense: (n, m) => `${n} anuncios no muestran ningún número de registro y ${m} son de anfitriones con 10 anuncios o más.`,
      air_font: "Fuente: Inside Airbnb.",
      x_res: "Plazas de residencia", xn_res: (n, r, p) => `por cada 100 personas de 65 años o más; ${n} plazas en ${r} residencias, el ${p} públicas`,
      x_dep: (a) => `Personas dependientes atendidas, ${a}`, xn_dep: (c) => `por 1.000 habitantes (Cataluña, ${c})`,
      x_ssb: (a) => `Atendidas por los servicios sociales, ${a}`, xn_ssb: (c) => `por 1.000 habitantes (Cataluña, ${c})`,
      x_cuid: "Cuidadores familiares", xn_cuid: (d) => `personas que cuidan a un familiar dependiente; el ${d} son mujeres`,
      x_air: "Anuncios de Airbnb", xn_air: (d, v) => `el ${d}, ${v} por cada 100 viviendas`,
      x_airs: "Pisos enteros en Airbnb", xn_airs: (p) => `de los anuncios; precio medio de ${p} la noche`,
      x_airr: "Airbnb sin registro", xn_airr: (m) => `de los anuncios no muestran ningún número; el ${m} son de anfitriones con 10 anuncios o más`,
    },
  };
  const tx = (k, ...a) => { const v = TX[LANG][k]; return typeof v === "function" ? v(...a) : v; };
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  const ult = (o) => { if (!o) return null; const ks = Object.keys(o).sort(); return ks.length ? o[ks[ks.length - 1]] : null; };
  const dia = (s) => { if (!s) return ""; const d = new Date(s + "T12:00:00"); return d.toLocaleDateString(LANG === "es" ? "es-ES" : "ca-ES", { day: "numeric", month: "long", year: "numeric" }); };
  const cap = (s) => { const t = String(s); return t.charAt(0).toUpperCase() + t.slice(1); };

  window.blocSocial = (m) => {
    const f = m.soc_f || {}, s = m.soc || {}, r = f.reses, c = f.cuid;
    if (!r && !c) return "";
    let res = "";
    if (r && r.n_res) res += `<p class="fx-dada">${tx("res_txt", r.n_res, fmt(r.res), fmt(ult(s.soc_res65), 1), r.res_pub ? fmt(r.res_pub) : "")}</p>`;
    else res += `<p class="fx-dada">${tx("res_no")}</p>`;
    if (r && r.dia) res += `<p class="fx-dada">${tx("dia_txt", fmt(r.dia))}</p>`;
    if (c && c.n) res += `<p class="fx-sub2">${tx("cuid")}</p><p class="fx-dada">${tx("cuid_txt", fmt(c.n), fmt(ult(s.soc_cuid), 1), c.d != null ? pct(c.d, 0) : "–")}</p>`;
    const srv = r && r.tip && r.tip.length
      ? `<p class="fx-dada">${tx("serv_txt", fmt(r.n))}</p><ul class="cu-bib">${r.tip.map(([k, n, p]) => `<li><span>${esc(cap(k))}${n > 1 ? ` <small>(${n})</small>` : ""}</span><span>${p ? tx("places", fmt(p)) : ""}</span></li>`).join("")}</ul>`
      : "–";
    return `<section class="fitxa-bloc fx-soc"><h3>${tx("h")}</h3><p class="fb-sub">${tx("sub")}</p>
      <div class="fx-dues"><div><p class="fx-sub2">${tx("res")}</p>${res}</div><div><p class="fx-sub2">${tx("serv")}</p>${srv}</div></div>
      <p class="fb-font">${tx("font")}</p></section>`;
  };

  window.blocAirbnb = (m) => {
    const a = m.soc_f && m.soc_f.air, s = m.soc || {};
    if (!a || !a.n) return "";
    const d = D.anys && D.anys.soc_air, h = s.soc_air_100 && s.soc_air_100[d];
    let t = `<p class="fx-dada">${tx("air_txt", fmt(a.n), dia(d), h != null ? fmt(h, 1) : "–", fmt(a.sencer))}</p>`;
    if (a.preu) t += `<p class="fx-dada">${tx("air_preu", `${fmt(a.preu)} €`)}</p>`;
    if (a.n >= 5) t += `<p class="fx-dada">${tx("air_sense", fmt(a.sense), fmt(a.multi))}</p>`;
    return `<section class="fitxa-bloc fx-air"><h3>${tx("air_h")}</h3><p class="fb-sub">${tx("air_sub")}</p>${t}<p class="fb-font">${tx("air_font")}</p></section>`;
  };

  if (!window.PG) return;
  const ul = (s) => (s && s.length ? s[s.length - 1] : null);
  const ca = {
    soc_ssb: ["Serveis socials bàsics", "Persones ateses pels serveis socials bàsics per 1.000 habitants"],
    soc_ssb_noms: { gi: "Província de Girona", cat: "Catalunya" },
    h_soc_ssb: (v, a, c) => `El ${a}, els serveis socials bàsics de la província van atendre <b>${v} persones per cada 1.000 habitants</b>. A Catalunya, ${c}.`,
    soc_dep: ["Dependència", "Persones dependents amb prestació o servei per 1.000 habitants"],
    soc_dep_noms: { gi: "Província de Girona", cat: "Catalunya" },
    h_soc_dep: (v, a, c, v0, a0) => `El ${a}, <b>${v} de cada 1.000 habitants</b> de la província rebien una ajuda per dependència (Catalunya, ${c}). El ${a0}, ${v0}.`,
    soc_sad: ["Ajuda a domicili", "Persones dependents amb servei d'ajuda a domicili per 1.000 habitants"],
    soc_sad_noms: { gi: "Província de Girona", cat: "Catalunya" },
    h_soc_sad: (v, a, c) => `El ${a}, <b>${v} de cada 1.000 habitants</b> de la província tenien ajuda a domicili per dependència. A Catalunya, ${c}.`,
    font_soc: "Font: Departament de Drets Socials (Generalitat)",
  };
  const es = {
    soc_ssb: ["Servicios sociales básicos", "Personas atendidas por los servicios sociales básicos por 1.000 habitantes"],
    soc_ssb_noms: { gi: "Provincia de Girona", cat: "Cataluña" },
    h_soc_ssb: (v, a, c) => `En ${a}, los servicios sociales básicos de la provincia atendieron a <b>${v} personas por cada 1.000 habitantes</b>. En Cataluña, ${c}.`,
    soc_dep: ["Dependencia", "Personas dependientes con prestación o servicio por 1.000 habitantes"],
    soc_dep_noms: { gi: "Provincia de Girona", cat: "Cataluña" },
    h_soc_dep: (v, a, c, v0, a0) => `En ${a}, <b>${v} de cada 1.000 habitantes</b> de la provincia recibían una ayuda por dependencia (Cataluña, ${c}). En ${a0}, ${v0}.`,
    soc_sad: ["Ayuda a domicilio", "Personas dependientes con servicio de ayuda a domicilio por 1.000 habitantes"],
    soc_sad_noms: { gi: "Provincia de Girona", cat: "Cataluña" },
    h_soc_sad: (v, a, c) => `En ${a}, <b>${v} de cada 1.000 habitantes</b> de la provincia tenían ayuda a domicilio por dependencia. En Cataluña, ${c}.`,
    font_soc: "Fuente: Departament de Drets Socials (Generalitat)",
  };
  window.PG.textos(ca, es);
  const T = () => (LANG === "es" ? es : ca);
  const tp = (k, ...a) => { const v = T()[k]; return typeof v === "function" ? v(...a) : v; };
  window.PG.titular((id, sp) => {
    if (!/^soc_/.test(id)) return null;
    const s = sp.series || {}, g = ul(s.gi), c = ul(s.cat);
    if (!g) return "";
    const f = (v) => fmt(v, v >= 100 ? 0 : 1), cv = c ? f(c[2]) : "–";
    if (id === "soc_dep") { const g0 = s.gi[0]; return tp("h_soc_dep", f(g[2]), g[1], cv, f(g0[2]), g0[1]); }
    return tp("h_" + id, f(g[2]), g[1], cv);
  });

  window.pintaSeccioSoc = () => {
    const S = D.soc || {}, A = S.prov, X = S.x || {}, sec = document.getElementById("s-soc");
    if (!A || !Object.keys(A).length) { if (sec) sec.hidden = true; }
    else {
      const ids = ["soc_dep", "soc_ssb", "soc_sad"].filter((k) => A[k]);
      window.PG.pintaGrafics(document.getElementById("soc-grafics"), A, ids, () => "font_soc");
      const x = document.getElementById("soc-xifres");
      if (x) {
        const r = X.reses, c = X.com || {}, k = X.cuid;
        x.innerHTML = [
          r ? tile(tx("x_res"), fmt(r.res65, 1), tx("xn_res", fmt(r.res), fmt(r.n_res), pct(r.pub, 0))) : "",
          c.dep ? tile(tx("x_dep", c.dep.any), fmt(c.dep.gi, 1), tx("xn_dep", fmt(c.dep.cat, 1))) : "",
          c.ssb ? tile(tx("x_ssb", c.ssb.any), fmt(c.ssb.gi, 0), tx("xn_ssb", fmt(c.ssb.cat, 0))) : "",
          k ? tile(tx("x_cuid"), fmt(k.n), tx("xn_cuid", pct(k.d, 0))) : "",
        ].join("");
      }
    }
    // Airbnb, en la sección de turismo
    const t = document.getElementById("tur-air"), a = X.air;
    if (t && a) {
      t.innerHTML = [
        tile(tx("x_air"), fmt(a.n), tx("xn_air", dia(a.dia), fmt(a.viv, 1))),
        tile(tx("x_airs"), pct(a.sencer, 0), tx("xn_airs", `${fmt(a.preu)} €`)),
        tile(tx("x_airr"), pct(a.sense, 0), tx("xn_airr", pct(a.multi, 0))),
      ].join("");
    }
  };
})();
