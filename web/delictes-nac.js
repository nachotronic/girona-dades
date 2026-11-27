/* Delitos según nacionalidad en «La província»: condenados (INE) y detenidos e investigados (Interior).
   Textos, nombres de grupo, titulares y notas de los gráficos cn_* y dn_*. */
(function () {
  if (!window.PG) return;
  const NOTA_CN_CA = "Compta on es dicta la condemna, no on viu el condemnat: hi entren turistes i persones de pas, que no surten al padró, i a Girona això pesa (costa i frontera). Els estrangers residents són més joves i més sovint homes que els espanyols, i totes dues coses fan pujar qualsevol taxa; el gràfic per sexe en corregeix una part. La nacionalitat no explica per què: hi pesen l'edat, la renda, la feina i on vigila la policia. Població de 18 anys o més a 1 de juliol (els de 18 i 19 anys, estimats).";
  const NOTA_CN_ES = "Cuenta dónde se dicta la condena, no dónde vive el condenado: entran turistas y personas de paso, que no salen en el padrón, y en Girona eso pesa (costa y frontera). Los extranjeros residentes son más jóvenes y más a menudo hombres que los españoles, y ambas cosas hacen subir cualquier tasa; el gráfico por sexo corrige una parte. La nacionalidad no explica el porqué: influyen la edad, la renta, el trabajo y dónde vigila la policía. Población de 18 años o más a 1 de julio (los de 18 y 19 años, estimados).";
  const NOTA_DN_CA = "Detingut o investigat no vol dir culpable, i una persona pot sortir-hi més d'un cop. Inclou menors de 14 a 17 anys (es compara amb la població de 15 anys o més) i qualsevol persona detinguda a la província, hi visqui o no. Fins al 2019 Interior no comptava els Mossos en les dades d'estrangers: la sèrie comença el 2020.";
  const NOTA_DN_ES = "Detenido o investigado no quiere decir culpable, y una persona puede salir más de una vez. Incluye menores de 14 a 17 años (se compara con la población de 15 años o más) y a cualquier persona detenida en la provincia, viva o no en ella. Hasta 2019 Interior no contaba a los Mossos en los datos de extranjeros: la serie empieza en 2020.";
  const ca = {
    cnz_noms: { gi: "Província de Girona", cat: "Catalunya", esp: "Espanya" },
    cn_taxa: ["Condemnats segons nacionalitat", "Condemnats per 1.000 residents de 18 anys o més"],
    h_cn_taxa: (a, es, ex, rt, rc, re) => `El ${a} es van condemnar a la província <b>${ex} de cada 1.000 estrangers</b> adults residents i <b>${es} de cada 1.000 espanyols</b>: ${rt} vegades més. A Catalunya la diferència és de ${rc} vegades i a Espanya, de ${re}.`,
    cn_taxa_nota: NOTA_CN_CA,
    cn_ratio: ["Quantes vegades més", "Taxa de condemnats estrangers dividida per la dels espanyols"],
    h_cn_ratio: (a, v, a0, v0, c, e) => `El ${a} la taxa de condemnats estrangers era <b>${v} vegades</b> la dels espanyols a la província; el ${a0}, ${v0}. A Catalunya, ${c}; a Espanya, ${e}.`,
    cn_pes: ["Quin pes tenen", "Estrangers en els condemnats i en la població de 18 anys o més (%)"],
    h_cn_pes: (a, c, p, cc, pc) => `Els estrangers són el <b>${c} dels condemnats</b> a la província (${a}) i el ${p} dels residents adults. A Catalunya, el ${cc} i el ${pc}.`,
    cn_sexe: ["Homes amb homes", "Condemnats per 1.000 residents de 18 anys o més, segons sexe i nacionalitat"],
    h_cn_sexe: (a, he, hx, de, dx) => `Comparant homes amb homes, el ${a} es van condemnar ${he} de cada 1.000 espanyols i <b>${hx} de cada 1.000 estrangers</b>. Les dones, molt menys: ${de} espanyoles i ${dx} estrangeres de cada 1.000.`,
    cn_origen: ["Segons d'on són", "Delictes condemnats per 1.000 residents de 18 anys o més, segons la nacionalitat"],
    h_cn_origen: (a, mx, v, mn, vm) => `A la província, el ${a} la taxa més alta és la dels nacionals ${mx} (${v} delictes per 1.000 residents adults) i la més baixa, la dels ${mn} (${vm}). Una condemna pot incloure més d'un delicte.`,
    cn_tipus: ["Quins delictes", "Estrangers entre els condemnats de cada delicte a tot Espanya (%)"],
    h_cn_tipus: (a, tot, t1, v1, tn, vn) => `A tot Espanya els estrangers van ser el ${tot} dels delictes condemnats el ${a}. Pesen més en <b>${t1}</b> (${v1}) i menys en ${tn} (${vn}). L'INE no dona aquest detall per províncies.`,
    cn_delictes: "delictes", cn_delictes_1: "delicte",
    dn_taxa: ["Detinguts i investigats", "Detencions i investigacions per 1.000 residents de 15 anys o més"],
    h_dn_taxa: (a, n, p, es, ex, rt) => `El ${a} la policia va fer ${n} detencions i investigacions a la província; el ${p} van ser de persones estrangeres. Per cada 1.000 residents de 15 anys o més: <b>${es} entre els espanyols i ${ex} entre els estrangers</b>, ${rt} vegades més.`,
    dn_taxa_nota: NOTA_DN_CA,
    dn_pes: ["Estrangers entre els detinguts", "Detencions i investigacions de persones estrangeres (% del total)"],
    h_dn_pes: (a, g, c, e) => `El ${a}, el <b>${g}</b> de les detencions i investigacions a la província van ser de persones estrangeres (Catalunya, ${c}; Espanya, ${e}).`,
    dn_pais: ["De quin país", "Nacionalitat en les detencions i investigacions d'estrangers a la província (%)"],
    h_dn_pais: (a, p, v, n) => `<b>${p}</b> és la primera nacionalitat en les detencions i investigacions d'estrangers a la província el ${a}: el ${v} de ${n}.`,
    dn_pers: "detencions", dn_pers_1: "detenció",
    vegades: (v) => v,
    g: {
      "cn:es": "Espanyols", "cn:ex": "Estrangers", "dn:es": "Espanyols", "dn:ex": "Estrangers",
      "cnp:cond": "Dels condemnats", "cnp:pob": "De la població adulta",
      "cns:h_es": "Homes espanyols", "cns:h_ex": "Homes estrangers", "cns:d_es": "Dones espanyoles", "cns:d_ex": "Dones estrangeres",
      "cno:es": "Espanyols", "cno:ue": "Unió Europea", "cno:eur": "Resta d'Europa", "cno:afr": "Àfrica", "cno:ame": "Amèrica", "cno:asi": "Àsia",
      "cnt:homicidi": "Homicidi i assassinat", "cnt:lesions": "Lesions", "cnt:sexual": "Contra la llibertat sexual", "cnt:maltracte": "Tracte degradant i violència",
      "cnt:amenaces": "Amenaces", "cnt:furts": "Furts", "cnt:robatori_f": "Robatori amb força", "cnt:robatori_v": "Robatori amb violència",
      "cnt:estafes": "Estafes", "cnt:danys": "Danys", "cnt:usurpacio": "Ocupació d'immobles (usurpació)", "cnt:drogues": "Drogues (salut pública)",
      "cnt:seg_vial": "Seguretat viària", "cnt:falsedat": "Falsedat documental", "cnt:autoritat": "Atemptat, resistència i desobediència",
      "cnt:trencament": "Trencament de condemna", "cnt:familia": "Abandonament de família",
    },
    org: { es: "espanyols", ue: "de la Unió Europea", eur: "de la resta d'Europa", afr: "d'Àfrica", ame: "d'Amèrica", asi: "d'Àsia" },
    paisos: { Marruecos: "el Marroc", Argelia: "Algèria", Rumanía: "Romania", Francia: "França", "Rep. Dominicana": "la República Dominicana", Gambia: "Gàmbia", Senegal: "el Senegal", Italia: "Itàlia", Alemania: "Alemanya", Holanda: "els Països Baixos", Bélgica: "Bèlgica", Polonia: "Polònia", Ucrania: "Ucraïna", Rusia: "Rússia", Lituania: "Lituània", "Reino Unido": "el Regne Unit", Bulgaría: "Bulgària", Paquistán: "el Pakistan", China: "la Xina", India: "l'Índia", Perú: "el Perú", Brasil: "el Brasil", Camerún: "el Camerun", Mali: "Mali", Ghana: "Ghana", Nigeria: "Nigèria", "Guinea Bisau": "Guinea Bissau", "Guinea Ecuatorial": "Guinea Equatorial", Filipinas: "les Filipines", Irán: "l'Iran", Paraguay: "el Paraguai", Uruguay: "l'Uruguai", Ecuador: "l'Equador" },
    font_cn: "Font: INE, Estadística de Població Condemnada Adulta; població: INE, Estadística Contínua de Població",
    font_dn: "Font: Ministeri de l'Interior, Portal Estadístic de Criminalitat (detencions i investigats); població: INE",
  };
  const es = {
    cnz_noms: { gi: "Provincia de Girona", cat: "Cataluña", esp: "España" },
    cn_taxa: ["Condenados según nacionalidad", "Condenados por 1.000 residentes de 18 años o más"],
    h_cn_taxa: (a, es_, ex, rt, rc, re) => `En ${a} se condenó en la provincia a <b>${ex} de cada 1.000 extranjeros</b> adultos residentes y a <b>${es_} de cada 1.000 españoles</b>: ${rt} veces más. En Cataluña la diferencia es de ${rc} veces y en España, de ${re}.`,
    cn_taxa_nota: NOTA_CN_ES,
    cn_ratio: ["Cuántas veces más", "Tasa de condenados extranjeros dividida por la de los españoles"],
    h_cn_ratio: (a, v, a0, v0, c, e) => `En ${a} la tasa de condenados extranjeros era <b>${v} veces</b> la de los españoles en la provincia; en ${a0}, ${v0}. En Cataluña, ${c}; en España, ${e}.`,
    cn_pes: ["Qué peso tienen", "Extranjeros en los condenados y en la población de 18 años o más (%)"],
    h_cn_pes: (a, c, p, cc, pc) => `Los extranjeros son el <b>${c} de los condenados</b> en la provincia (${a}) y el ${p} de los residentes adultos. En Cataluña, el ${cc} y el ${pc}.`,
    cn_sexe: ["Hombres con hombres", "Condenados por 1.000 residentes de 18 años o más, según sexo y nacionalidad"],
    h_cn_sexe: (a, he, hx, de, dx) => `Comparando hombres con hombres, en ${a} se condenó a ${he} de cada 1.000 españoles y a <b>${hx} de cada 1.000 extranjeros</b>. Las mujeres, mucho menos: ${de} españolas y ${dx} extranjeras de cada 1.000.`,
    cn_origen: ["Según de dónde son", "Delitos condenados por 1.000 residentes de 18 años o más, según la nacionalidad"],
    h_cn_origen: (a, mx, v, mn, vm) => `En la provincia, en ${a} la tasa más alta es la de los nacionales ${mx} (${v} delitos por 1.000 residentes adultos) y la más baja, la de los ${mn} (${vm}). Una condena puede incluir más de un delito.`,
    cn_tipus: ["Qué delitos", "Extranjeros entre los condenados de cada delito en toda España (%)"],
    h_cn_tipus: (a, tot, t1, v1, tn, vn) => `En toda España los extranjeros fueron el ${tot} de los delitos condenados en ${a}. Pesan más en <b>${t1}</b> (${v1}) y menos en ${tn} (${vn}). El INE no da este detalle por provincias.`,
    cn_delictes: "delitos", cn_delictes_1: "delito",
    dn_taxa: ["Detenidos e investigados", "Detenciones e investigaciones por 1.000 residentes de 15 años o más"],
    h_dn_taxa: (a, n, p, es_, ex, rt) => `En ${a} la policía hizo ${n} detenciones e investigaciones en la provincia; el ${p} fueron de personas extranjeras. Por cada 1.000 residentes de 15 años o más: <b>${es_} entre los españoles y ${ex} entre los extranjeros</b>, ${rt} veces más.`,
    dn_taxa_nota: NOTA_DN_ES,
    dn_pes: ["Extranjeros entre los detenidos", "Detenciones e investigaciones de personas extranjeras (% del total)"],
    h_dn_pes: (a, g, c, e) => `En ${a}, el <b>${g}</b> de las detenciones e investigaciones en la provincia fueron de personas extranjeras (Cataluña, ${c}; España, ${e}).`,
    dn_pais: ["De qué país", "Nacionalidad en las detenciones e investigaciones de extranjeros en la provincia (%)"],
    h_dn_pais: (a, p, v, n) => `<b>${p}</b> es la primera nacionalidad en las detenciones e investigaciones de extranjeros en la provincia en ${a}: el ${v} de ${n}.`,
    dn_pers: "detenciones", dn_pers_1: "detención",
    g: {
      "cn:es": "Españoles", "cn:ex": "Extranjeros", "dn:es": "Españoles", "dn:ex": "Extranjeros",
      "cnp:cond": "De los condenados", "cnp:pob": "De la población adulta",
      "cns:h_es": "Hombres españoles", "cns:h_ex": "Hombres extranjeros", "cns:d_es": "Mujeres españolas", "cns:d_ex": "Mujeres extranjeras",
      "cno:es": "Españoles", "cno:ue": "Unión Europea", "cno:eur": "Resto de Europa", "cno:afr": "África", "cno:ame": "América", "cno:asi": "Asia",
      "cnt:homicidi": "Homicidio y asesinato", "cnt:lesions": "Lesiones", "cnt:sexual": "Contra la libertad sexual", "cnt:maltracte": "Trato degradante y violencia",
      "cnt:amenaces": "Amenazas", "cnt:furts": "Hurtos", "cnt:robatori_f": "Robo con fuerza", "cnt:robatori_v": "Robo con violencia",
      "cnt:estafes": "Estafas", "cnt:danys": "Daños", "cnt:usurpacio": "Ocupación de inmuebles (usurpación)", "cnt:drogues": "Drogas (salud pública)",
      "cnt:seg_vial": "Seguridad vial", "cnt:falsedat": "Falsedad documental", "cnt:autoritat": "Atentado, resistencia y desobediencia",
      "cnt:trencament": "Quebrantamiento de condena", "cnt:familia": "Abandono de familia",
    },
    org: { es: "españoles", ue: "de la Unión Europea", eur: "del resto de Europa", afr: "de África", ame: "de América", asi: "de Asia" },
    paisos: { "Rep. Dominicana": "República Dominicana", Bulgaría: "Bulgaria", Holanda: "Países Bajos" },
    font_cn: "Fuente: INE, Estadística de la Población Condenada Adulta; población: INE, Estadística Continua de Población",
    font_dn: "Fuente: Ministerio del Interior, Portal Estadístico de Criminalidad (detenciones e investigados); población: INE",
  };
  window.PG.textos(ca, es);
  const T = () => (LANG === "es" ? es : ca);
  const tx = (k, ...a) => { const v = T()[k]; return typeof v === "function" ? v(...a) : v; };
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
  const pais = (n, art) => { const p = T().paisos[n] || n; return art ? p : p.replace(/^(el |la |els |les |l')/, ""); };
  window.PG.grup((g, c) => {
    if (!c) return null;
    if (/^(cn|dn|cnp|cns|cno|cnt):/.test(c)) return T().g[c] || g;
    if (c.startsWith("dnp:")) return cap(pais(c.slice(4)));
    return null;
  });
  const pc = (v, d = 0) => (v == null ? "–" : `${fmt(v, d)} %`);
  const f1 = (v) => (v == null ? "–" : fmt(v, 1));
  const ult = (sp, k) => { const s = sp.series && sp.series[k]; return s && s.length ? s[s.length - 1] : null; };
  window.PG.titular((id, sp) => {
    if (!/^(cn|dn)_/.test(id)) return null;
    const gs = sp.grups || [], a = sp.abs || {}, G = (c) => gs.find((x) => x.c === c) || {};
    if (id === "cn_taxa") { const e = G("cn:es"), x = G("cn:ex"); return e.gi ? tx("h_cn_taxa", a.any, f1(e.gi), f1(x.gi), f1(a.rt.gi), f1(a.rt.cat), f1(a.rt.esp)) : ""; }
    if (id === "cn_ratio") { const s = sp.series.gi || []; if (!s.length) return ""; const u = s[s.length - 1], c = ult(sp, "cat"), e = ult(sp, "esp"); return tx("h_cn_ratio", u[1], f1(u[2]), s[0][1], f1(s[0][2]), c ? f1(c[2]) : "–", e ? f1(e[2]) : "–"); }
    if (id === "cn_pes") { const c = G("cnp:cond"), p = G("cnp:pob"); return c.gi != null ? tx("h_cn_pes", sp.any, pc(c.gi), pc(p.gi), pc(c.cat), pc(p.cat)) : ""; }
    if (id === "cn_sexe") { const v = (k) => f1(G("cns:" + k).gi); return tx("h_cn_sexe", sp.any, v("h_es"), v("h_ex"), v("d_es"), v("d_ex")); }
    if (id === "cn_origen") { const o = gs.filter((x) => x.gi != null && x.c !== "cno:es").sort((p, q) => q.gi - p.gi); if (o.length < 2) return ""; const k = (x) => T().org[x.c.slice(4)]; const mn = [...gs].filter((x) => x.gi != null).sort((p, q) => p.gi - q.gi)[0]; return tx("h_cn_origen", sp.any, k(o[0]), f1(o[0].gi), k(mn), f1(mn.gi)); }
    if (id === "cn_tipus") { if (!gs.length) return ""; const n = (x) => T().g[x.c].toLowerCase(), u = gs[gs.length - 1]; return tx("h_cn_tipus", a.any, pc(a.tot), n(gs[0]), pc(gs[0].esp), n(u), pc(u.esp)); }
    if (id === "dn_taxa") { const e = G("dn:es"), x = G("dn:ex"); return e.gi ? tx("h_dn_taxa", a.any, fmt(a.n), pc(a.pct), f1(e.gi), f1(x.gi), f1(a.rt.gi)) : ""; }
    if (id === "dn_pes") { const g = ult(sp, "gi"), c = ult(sp, "cat"), e = ult(sp, "esp"); return g ? tx("h_dn_pes", g[1], pc(g[2]), pc(c && c[2]), pc(e && e[2])) : ""; }
    if (id === "dn_pais") { const g = gs[0]; return g ? tx("h_dn_pais", a.any, cap(pais(g.g, LANG === "ca")), pc(g.gi), fmt(a.tot)) : ""; }
    return "";
  });
})();
