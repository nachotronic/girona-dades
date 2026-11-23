"use strict";
/* Educació: bloque de la ficha (alumnos por etapa y tipo de centro, alumnado extranjero por origen y por edad)
   y textos de los gráficos edu_estr_etapa, edu_zones y edu_tipus_etapa de «La província».
   Datos: m.x.ens = { et: {etapa: [pública, concertada, privada, extranjeros]}, z: {zona: n}, ed: [[edad, n, extranjeros]] }.
   Usa las globales de app.js (D, LANG, fmt, pct) y window.PG (provincia.js). */
(function () {
  const ETAPES = ["llar", "inf", "pri", "eso", "batx", "fp"];
  const TX = {
    ca: {
      h: "Escoles i alumnes",
      sub: (n, c, e) => `${n} alumnes als centres del municipi el curs ${c}. El ${e} té nacionalitat estrangera.`,
      et: { llar: "Llar d'infants (0-2)", inf: "Infantil (3-5)", pri: "Primària", eso: "ESO", batx: "Batxillerat", fp: "Formació professional" },
      tc: ["Pública", "Concertada", "Privada"],
      estr: "estrangers",
      origen: "Alumnat estranger per origen",
      edat: "Alumnes per edat",
      edat_lleg: ["Nacionalitat espanyola", "Estrangera"],
      anys: "anys", mes21: "21 o més",
      z: { sud: "Centre i Sud-amèrica", mag: "Magrib", ue: "Resta de la Unió Europea", eur: "Resta d'Europa", afr: "Resta d'Àfrica", asi: "Àsia i Oceania", nam: "Amèrica del Nord", alt: "Altres" },
      cap_estr: "Cap alumne de nacionalitat estrangera.",
      font: "Font: Departament d'Educació i Formació Professional, Estadística de l'ensenyament. Alumnes dels centres del municipi, visquin on visquin.",
    },
    es: {
      h: "Escuelas y alumnos",
      sub: (n, c, e) => `${n} alumnos en los centros del municipio en el curso ${c}. El ${e} tiene nacionalidad extranjera.`,
      et: { llar: "Guardería (0-2)", inf: "Infantil (3-5)", pri: "Primaria", eso: "ESO", batx: "Bachillerato", fp: "Formación profesional" },
      tc: ["Pública", "Concertada", "Privada"],
      estr: "extranjeros",
      origen: "Alumnado extranjero por origen",
      edat: "Alumnos por edad",
      edat_lleg: ["Nacionalidad española", "Extranjera"],
      anys: "años", mes21: "21 o más",
      z: { sud: "Centro y Sudamérica", mag: "Magreb", ue: "Resto de la Unión Europea", eur: "Resto de Europa", afr: "Resto de África", asi: "Asia y Oceanía", nam: "América del Norte", alt: "Otros" },
      cap_estr: "Ningún alumno de nacionalidad extranjera.",
      font: "Fuente: Departament d'Educació i Formació Professional, Estadística de l'ensenyament. Alumnos de los centros del municipio, vivan donde vivan.",
    },
  };
  const tx = (k, ...a) => { const v = TX[LANG][k]; return typeof v === "function" ? v(...a) : v; };
  const curs = () => { const a = D.anys && D.anys.edu_estr; return a ? `${a}-${String(a + 1).slice(2)}` : ""; };

  window.blocEnsenyament = (m) => {
    const e = m.x && m.x.ens;
    if (!e || !e.et) return "";
    const ets = ETAPES.filter((k) => e.et[k]);
    const tot = (k) => e.et[k][0] + e.et[k][1] + e.et[k][2];
    const n = ets.reduce((s, k) => s + tot(k), 0), ne = ets.reduce((s, k) => s + e.et[k][3], 0);
    if (!n) return "";
    const files = ets.map((k) => {
      const [pu, co, pr, es] = e.et[k], t = tot(k);
      const seg = [pu, co, pr].map((v, i) => (v ? `<b class="en-${i}" style="width:${(100 * v) / t}%" title="${tx("tc")[i]}: ${fmt(v)}"></b>` : "")).join("");
      return `<li><span class="en-nom">${tx("et")[k]}</span><span class="en-barra">${seg}</span><span class="en-v">${fmt(t)}<small>${pct((100 * es) / t, 0)} ${tx("estr")}</small></span></li>`;
    }).join("");
    const lleg = tx("tc").map((nom, i) => `<li><i class="en-${i}"></i>${nom}<span>${pct((100 * ets.reduce((s, k) => s + e.et[k][i], 0)) / n, 0)}</span></li>`).join("");
    const zs = Object.entries(e.z || {}).sort((a, b) => b[1] - a[1]);
    const zmx = zs.length ? zs[0][1] : 1;
    const zones = zs.length ? `<ol class="nb">${zs.map(([z, v]) => `<li><span class="nb-nom">${tx("z")[z] || z}</span><span class="nb-barra"><b style="width:${(v / zmx) * 100}%"></b></span><span class="nb-v">${fmt(v)}<small>${pct((100 * v) / ne, 0)}</small></span></li>`).join("")}</ol>` : `<p class="fx-dada">${tx("cap_estr")}</p>`;
    return `<section class="fitxa-bloc fx-ens"><h3>${tx("h")}</h3><p class="fb-sub">${tx("sub", fmt(n), curs(), pct((100 * ne) / n, 0))}</p>
      <ul class="en-et">${files}</ul><ul class="ub-lleg en-lleg">${lleg}</ul>
      <div class="fx-dues"><div><p class="fx-sub2">${tx("origen")}</p>${zones}</div>
      <div><p class="fx-sub2">${tx("edat")}</p><div class="en-edat"></div>
      <ul class="ub-lleg en-lleg"><li><i class="en-esp"></i>${tx("edat_lleg")[0]}</li><li><i class="en-ext"></i>${tx("edat_lleg")[1]}</li></ul></div></div>
      <p class="fb-font">${tx("font")}</p></section>`;
  };

  // Pirámide simple: una columna por edad, con la parte de alumnos extranjeros en rojo
  window.pintaEnsenyament = (cont, m) => {
    const g = cont && cont.querySelector(".en-edat"), e = m.x && m.x.ens;
    if (!g || !e || !e.ed || !e.ed.length) { if (g) g.closest("div").hidden = true; return; }
    const ed = new Map(e.ed.map(([a, n, x]) => [a, [n, x]]));
    const min = Math.min(...e.ed.map((x) => x[0])), max = Math.max(...e.ed.map((x) => x[0]));
    const edats = []; for (let a = min; a <= max; a++) edats.push(a);
    const mx = Math.max(...e.ed.map((x) => x[1])) || 1;
    g.innerHTML = `<div class="en-cols">${edats.map((a) => {
      const [n, x] = ed.get(a) || [0, 0];
      const et = a >= 21 ? tx("mes21") : a;
      return `<span class="en-col" title="${et} ${tx("anys")}: ${fmt(n)} (${fmt(x)} ${tx("estr")})"><span class="en-pila" style="height:${(100 * n) / mx}%"><b style="height:${n ? (100 * x) / n : 0}%"></b></span><small>${a % 3 === 0 || a === max ? (a >= 21 ? "21+" : a) : ""}</small></span>`;
    }).join("")}</div>`;
  };

  // «La província»
  if (!window.PG) return;
  const ca = {
    edu_estr_etapa: ["Alumnat estranger per etapa", "Alumnes de nacionalitat estrangera (%)"],
    h_edu_estr_etapa: (v, c, k, a) => `A la província, el <b>${v}</b> dels alumnes de primària és de nacionalitat estrangera (Catalunya, ${c}). A batxillerat només ho és el ${k}. Curs ${a}.`,
    edu_zones: ["D'on són els alumnes estrangers", "Alumnat estranger per zona de nacionalitat (%)"],
    h_edu_zones: (n, p, z, v, a) => `Als centres de la província hi ha <b>${n} alumnes estrangers</b>, el ${p} del total (curs ${a}). La zona d'origen més freqüent és ${z}, amb el ${v}.`,
    edu_tipus_etapa: ["Pública, concertada o privada", "Alumnes de la província per tipus de centre (%)"],
    h_edu_tipus_etapa: (p, c, b, a) => `El <b>${p}</b> dels alumnes de primària de la província va a l'escola pública i el ${c}, a la concertada. Al batxillerat, la privada sense concert arriba al ${b}. Curs ${a}.`,
    tc_noms: { pub: "Pública", conc: "Concertada", priv: "Privada" },
    alu: "alumnes",
    et: TX.ca.et, ez: TX.ca.z,
  };
  const es = {
    edu_estr_etapa: ["Alumnado extranjero por etapa", "Alumnos de nacionalidad extranjera (%)"],
    h_edu_estr_etapa: (v, c, k, a) => `En la provincia, el <b>${v}</b> de los alumnos de primaria es de nacionalidad extranjera (Cataluña, ${c}). En bachillerato solo lo es el ${k}. Curso ${a}.`,
    edu_zones: ["De dónde son los alumnos extranjeros", "Alumnado extranjero por zona de nacionalidad (%)"],
    h_edu_zones: (n, p, z, v, a) => `En los centros de la provincia hay <b>${n} alumnos extranjeros</b>, el ${p} del total (curso ${a}). La zona de origen más frecuente es ${z}, con el ${v}.`,
    edu_tipus_etapa: ["Pública, concertada o privada", "Alumnos de la provincia por tipo de centro (%)"],
    h_edu_tipus_etapa: (p, c, b, a) => `El <b>${p}</b> de los alumnos de primaria de la provincia va a la escuela pública y el ${c}, a la concertada. En bachillerato, la privada sin concierto llega al ${b}. Curso ${a}.`,
    tc_noms: { pub: "Pública", conc: "Concertada", priv: "Privada" },
    alu: "alumnos",
    et: TX.es.et, ez: TX.es.z,
  };
  window.PG.textos(ca, es);
  const T = () => (LANG === "es" ? es : ca);
  const tp = (k, ...a) => { const v = T()[k]; return typeof v === "function" ? v(...a) : v; };
  window.PG.grup((g, c) => (c && c.startsWith("et:") ? T().et[c.slice(3)] || g : c && c.startsWith("ez:") ? T().ez[c.slice(3)] || g : null));
  const cursP = (a) => `${a}-${String(a + 1).slice(2)}`;
  window.PG.titular((id, sp) => {
    if (!/^edu_(estr_etapa|zones|tipus_etapa)$/.test(id) || !sp.grups) return null;
    const g = (k) => sp.grups.find((x) => x.g === k) || {};
    if (id === "edu_estr_etapa") return tp("h_edu_estr_etapa", pct(g("pri").gi, 0), pct(g("pri").cat, 0), pct(g("batx").gi, 0), cursP(sp.any));
    if (id === "edu_zones") { const z = sp.grups[0]; return sp.abs ? tp("h_edu_zones", fmt(sp.abs.n), pct(sp.abs.pct, 0), T().ez[z.c.slice(3)].replace(/^R/, "r"), pct(z.gi, 0), cursP(sp.any)) : ""; }
    if (id === "edu_tipus_etapa") return tp("h_edu_tipus_etapa", pct(g("pri").pub, 0), pct(g("pri").conc, 0), pct(g("batx").priv, 0), cursP(sp.any));
    return "";
  });
})();
