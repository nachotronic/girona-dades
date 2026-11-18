// Nacimientos, defunciones, causas de muerte y nombres: sección «Néixer i morir».
// Datos en datos/demografia.json (scripts/demografia_web.py), que se piden la primera vez que se pinta.
// Mapa de provincias (MapLibre), mapa de comarcas con el nombre más puesto y gráficos con pintaGrafics (provincia.js).
// Usa las globales de app.js: LANG, fmt, pct, tile, mostraTip, amagaTip; y window.PG de provincia.js.
(function () {
  const CAUSES = {
    I: ["Malalties infeccioses", "Enfermedades infecciosas"], II: ["Tumors", "Tumores"], III: ["Malalties de la sang", "Enfermedades de la sangre"],
    IV: ["Diabetis i altres malalties endocrines", "Diabetes y otras enfermedades endocrinas"], V: ["Trastorns mentals (demències)", "Trastornos mentales (demencias)"],
    "VI-VIII": ["Sistema nerviós (Alzheimer, Parkinson…)", "Sistema nervioso (alzhéimer, párkinson…)"], IX: ["Cor i vasos (infarts, ictus)", "Corazón y vasos (infartos, ictus)"],
    X: ["Sistema respiratori", "Sistema respiratorio"], XI: ["Sistema digestiu", "Sistema digestivo"], XII: ["Pell", "Piel"], XIII: ["Ossos i músculs", "Huesos y músculos"],
    XIV: ["Ronyons i sistema genitourinari", "Riñones y sistema genitourinario"], XV: ["Embaràs i part", "Embarazo y parto"], XVI: ["Afeccions perinatals", "Afecciones perinatales"],
    XVII: ["Malformacions congènites", "Malformaciones congénitas"], XVIII: ["Causes mal definides", "Causas mal definidas"], XX: ["Causes externes (accidents, suïcidis, caigudes)", "Causas externas (accidentes, suicidios, caídas)"],
  };
  const EDM = { menys20: ["Menys de 20 anys", "Menos de 20 años"], "20_24": ["20 a 24 anys", "20 a 24 años"], "25_29": ["25 a 29 anys", "25 a 29 años"], "30_34": ["30 a 34 anys", "30 a 34 años"], "35_39": ["35 a 39 anys", "35 a 39 años"], "40mes": ["40 anys o més", "40 años o más"] };
  const EDD = { "0_14": ["0 a 14 anys", "0 a 14 años"], "15_44": ["15 a 44 anys", "15 a 44 años"], "45_64": ["45 a 64 anys", "45 a 64 años"], "65_74": ["65 a 74 anys", "65 a 74 años"], "75_84": ["75 a 84 anys", "75 a 84 años"], "85_94": ["85 a 94 anys", "85 a 94 años"], "95mes": ["95 anys o més", "95 años o más"] };
  const TX = {
    ca: {
      x_naix: "Naixements, últims 12 mesos", x_def: "Defuncions, últims 12 mesos", x_saldo: "Creixement natural, 12 mesos", n_saldo: "naixements menys defuncions",
      x_fec: (a) => `Fills per dona ${a}`, n_fec: (e) => `Espanya, ${e}`, x_mare: (a) => `Edat mitjana de la mare ${a}`, n_mare: (e) => `Espanya, ${e} anys`,
      x_noms: (a) => `Noms més posats ${a}`, n_noms: (f, m, e) => `${f} nenes i ${m} nens${e ? ` · empatada amb ${e}` : ""}`, i: "i",
      fins: (de, a) => `${de} a ${a}`, var_ant: (v) => `${v} respecte als 12 mesos anteriors`, prov: "provisional",
      anys: "anys", setmana: (w) => `setmana ${w}`, mitjana_base: "Mitjana 2016-2019",
      dm_nd: ["Naixements i defuncions", "Nombre a l'any, província de Girona"], dm_nd_noms: { gi: "Naixements", esp: "Defuncions" },
      dm_mes: ["Mes a mes", "Naixements i defuncions de cada mes (els darrers, provisionals)"],
      dm_setm: ["Defuncions setmana a setmana", "Defuncions de cada setmana, província de Girona"],
      dm_rs_mes: ["Defuncions registrades per CatSalut", "Defuncions de cada mes, regió sanitària de Girona"], dm_rs_noms: { gi: "Defuncions", esp: "Mitjana del mes, 2017-2019" },
      dm_fec: ["Fills per dona", "Indicador conjuntural de fecunditat"], dm_mare_edat: ["Edat de les mares", "Edat mitjana a la maternitat (anys)"],
      dm_mares: ["Mares cada cop més grans", "Naixements segons l'edat de la mare (%)"],
      dm_causes_sexe: ["De què moren les dones i els homes", "Defuncions per grup de causes (% de les de cada sexe)"], dm_sexe_noms: { gi: "Dones", esp: "Homes" },
      dm_causes_evol: ["Tumors, cor i pulmons", "Defuncions per grup de causes (% del total)"], dm_cev_noms: { gi: "Tumors", cat: "Cor i vasos", esp: "Sistema respiratori" },
      dm_def_edat: ["A quina edat es mor", "Defuncions segons l'edat (%)"], dm_inf: ["Mortalitat infantil", "Morts abans de complir un any per 1.000 nascuts vius"],
      dm_nom: (n) => [`Nadons que es diuen ${n}`, "Nadons per any, província de Girona"], dm_nom_noms: { gi: "Nenes", esp: "Nens" },
      h_nd: (a, n, d, a0) => `El ${a} van néixer <b>${n} nadons</b> a la província i van morir <b>${d} persones</b>.${a0 ? ` Cada any des del ${a0} hi ha més defuncions que naixements.` : ""}`,
      h_mes: (m, n, d) => `${m}: <b>${n} naixements</b> i <b>${d} defuncions</b> a la província (dades provisionals de l'INE).`,
      h_setm: (w, a, n, dlt) => `Fins a la setmana ${w} del ${a} han mort <b>${n} persones</b> a la província, ${dlt} que en el mateix període de l'any anterior.`,
      h_rs: (m, n, b) => `L'últim mes complet, ${m}, CatSalut va registrar <b>${n} defuncions</b> a la regió sanitària de Girona. La mitjana d'aquest mes el 2017-2019 era de ${b}.`,
      h_fec: (g, a, e, g0) => `Les dones de la província tenen <b>${g} fills</b> de mitjana (${a})${e ? `, davant dels ${e} d'Espanya` : ""}. El 1975 en tenien ${g0}.`,
      h_mare: (g, a, g0) => `Les mares de la província tenen <b>${g} anys</b> de mitjana quan neix el fill (${a}). El 1975, ${g0}.`,
      h_mares: (a1, p, a0, p0) => `El ${a1}, el <b>${p}</b> dels nadons de la província eren de mares de 35 anys o més. El ${a0}, el ${p0}.`,
      h_csexe: (ch, ph, cd, pd, a) => `Els homes de la província moren sobretot de <b>${ch.toLowerCase()}</b> (${ph}) i les dones, de <b>${cd.toLowerCase()}</b> (${pd}). Dades del ${a}.`,
      h_cev: (a0, t, c, a) => `${a0 ? `Des del ${a0}, els tumors` : "Els tumors"} són la primera causa de mort a la província: el <b>${t}</b> de les defuncions el ${a}, davant del ${c} del cor i els vasos.`,
      h_dedat: (p, a1, p0, a0) => `El <b>${p}</b> de les persones que moren a la província tenen 85 anys o més (${a1}). El ${a0}, el ${p0}.`,
      h_inf: (g, a, e, g0) => `<b>${g} de cada 1.000 nadons</b> moren abans de fer un any a la província (${a}); a Espanya, ${e}. El 1975 eren ${g0}.`,
      h_nom: (n, nom, a0, am, nm) => `<b>${n} nadons</b> s'han dit ${nom} a la província des del ${a0}. L'any que més, el ${am} (${nm}).`,
      h_nom_no: (q) => `No hi ha cap nom «${q}» entre els que publica l'Idescat per a la província (només surten els que porten prou nadons).`,
      mes: "més", menys: "menys", igual: "els mateixos",
      font_dm_ine: "Font: INE, Moviment natural de la població. Els darrers mesos, estimació mensual de naixements i de defuncions (provisionals)",
      font_dm_setm: "Font: INE, Estimació del nombre de defuncions setmanals (EDeS), provisional",
      font_dm_ecm: "Font: INE, Estadística de defuncions segons la causa de mort", font_dm_idb: "Font: INE, Indicadors demogràfics bàsics",
      font_dm_salut: "Font: CatSalut, registre de defuncions del Registre central d'assegurats. La regió sanitària de Girona inclou l'Alt Maresme (Blanes, Calella…) i no la Cerdanya",
      font_dm_noms: "Font: Idescat, noms dels nadons. Només hi surten els noms amb prou nadons perquè l'Idescat els publiqui; l'Idescat escriu els noms sense accents",
      // Mapa de províncies
      m_tit: "Girona i les altres províncies", ind: "Indicador", causa: "Causa", per: "Mesura",
      i_natalitat: ["Natalitat", "Naixements per 1.000 habitants"], i_fecunditat: ["Fecunditat", "Fills per dona"], i_edat_mare: ["Edat de la mare", "Edat mitjana a la maternitat (anys)"],
      i_mortalitat: ["Mortalitat", "Defuncions per 1.000 habitants"], i_mort_inf: ["Mortalitat infantil", "Morts abans d'un any per 1.000 nascuts vius"],
      i_saldo: ["Creixement natural", "Naixements menys defuncions per 1.000 habitants"], i_esperanca: ["Esperança de vida", "Anys de vida en néixer"],
      i_naix_var: ["Naixements: variació", "Naixements dels últims 12 mesos respecte als 12 anteriors (%)"], i_def_var: ["Defuncions: variació", "Defuncions dels últims 12 mesos respecte als 12 anteriors (%)"],
      i_causes: ["Causes de mort", "Defuncions per causa"], c_pct: "% de les defuncions", c_taxa: "Per 100.000 habitants",
      h_m: (r, n, v, e) => `Girona ocupa el lloc <b>${r}</b> de ${n} províncies, de més a menys: <b>${v}</b>${e ? `. Espanya, ${e}` : ""}.`,
      sense: "Sense dades", any_m: (a) => `Dades del ${a}`, font_m: "Font: INE (Indicadors demogràfics bàsics, Moviment natural de la població, estimacions mensuals provisionals i Estadística de defuncions segons la causa de mort). Taxa per causa: calculada amb la població que es dedueix de la taxa bruta de mortalitat",
      // Noms
      n_tit: "Els noms dels nadons", n_u: "Nadons inscrits amb cada nom, província de Girona", nenes: "Nenes", nens: "Nens", any: "Any",
      h_n: (a, f, nf, m, nm) => `El ${a}, ${f.includes(" i ") ? "els noms de nena més posats a la província van ser" : "el nom de nena més posat a la província va ser"} <b>${f}</b> (${nf}${f.includes(" i ") ? " cadascun" : ""}) i ${m.includes(" i ") ? "els de nen" : "el de nen"}, <b>${m}</b> (${nm}${m.includes(" i ") ? " cadascun" : ""}).`,
      h_n_cat: (f, m) => ` A tot Catalunya, ${f} i ${m}.`, com_tit: (a, s) => `El nom de ${s} més posat a cada comarca, ${a}`, nena: "nena", nen: "nen",
      com_sense: "Pocs nadons per publicar-ho", cerca: "Busca un nom", cerca_ph: "Escriu un nom: Júlia, Jan, Pau…", nadons: "nadons",
    },
    es: {
      x_naix: "Nacimientos, últimos 12 meses", x_def: "Defunciones, últimos 12 meses", x_saldo: "Crecimiento natural, 12 meses", n_saldo: "nacimientos menos defunciones",
      x_fec: (a) => `Hijos por mujer ${a}`, n_fec: (e) => `España, ${e}`, x_mare: (a) => `Edad media de la madre ${a}`, n_mare: (e) => `España, ${e} años`,
      x_noms: (a) => `Nombres más puestos ${a}`, n_noms: (f, m, e) => `${f} niñas y ${m} niños${e ? ` · empatada con ${e}` : ""}`, i: "y",
      fins: (de, a) => `${de} a ${a}`, var_ant: (v) => `${v} respecto a los 12 meses anteriores`, prov: "provisional",
      anys: "años", setmana: (w) => `semana ${w}`, mitjana_base: "Media 2016-2019",
      dm_nd: ["Nacimientos y defunciones", "Número al año, provincia de Girona"], dm_nd_noms: { gi: "Nacimientos", esp: "Defunciones" },
      dm_mes: ["Mes a mes", "Nacimientos y defunciones de cada mes (los últimos, provisionales)"],
      dm_setm: ["Defunciones semana a semana", "Defunciones de cada semana, provincia de Girona"],
      dm_rs_mes: ["Defunciones registradas por CatSalut", "Defunciones de cada mes, región sanitaria de Girona"], dm_rs_noms: { gi: "Defunciones", esp: "Media del mes, 2017-2019" },
      dm_fec: ["Hijos por mujer", "Indicador coyuntural de fecundidad"], dm_mare_edat: ["Edad de las madres", "Edad media a la maternidad (años)"],
      dm_mares: ["Madres cada vez mayores", "Nacimientos según la edad de la madre (%)"],
      dm_causes_sexe: ["De qué mueren las mujeres y los hombres", "Defunciones por grupo de causas (% de las de cada sexo)"], dm_sexe_noms: { gi: "Mujeres", esp: "Hombres" },
      dm_causes_evol: ["Tumores, corazón y pulmones", "Defunciones por grupo de causas (% del total)"], dm_cev_noms: { gi: "Tumores", cat: "Corazón y vasos", esp: "Sistema respiratorio" },
      dm_def_edat: ["A qué edad se muere", "Defunciones según la edad (%)"], dm_inf: ["Mortalidad infantil", "Muertes antes de cumplir un año por 1.000 nacidos vivos"],
      dm_nom: (n) => [`Bebés que se llaman ${n}`, "Bebés por año, provincia de Girona"], dm_nom_noms: { gi: "Niñas", esp: "Niños" },
      h_nd: (a, n, d, a0) => `En ${a} nacieron <b>${n} bebés</b> en la provincia y murieron <b>${d} personas</b>.${a0 ? ` Cada año desde ${a0} hay más defunciones que nacimientos.` : ""}`,
      h_mes: (m, n, d) => `${m}: <b>${n} nacimientos</b> y <b>${d} defunciones</b> en la provincia (datos provisionales del INE).`,
      h_setm: (w, a, n, dlt) => `Hasta la semana ${w} de ${a} han muerto <b>${n} personas</b> en la provincia, ${dlt} que en el mismo periodo del año anterior.`,
      h_rs: (m, n, b) => `El último mes completo, ${m}, CatSalut registró <b>${n} defunciones</b> en la región sanitaria de Girona. La media de ese mes en 2017-2019 era de ${b}.`,
      h_fec: (g, a, e, g0) => `Las mujeres de la provincia tienen <b>${g} hijos</b> de media (${a})${e ? `, frente a los ${e} de España` : ""}. En 1975 tenían ${g0}.`,
      h_mare: (g, a, g0) => `Las madres de la provincia tienen <b>${g} años</b> de media cuando nace el hijo (${a}). En 1975, ${g0}.`,
      h_mares: (a1, p, a0, p0) => `En ${a1}, el <b>${p}</b> de los bebés de la provincia eran de madres de 35 años o más. En ${a0}, el ${p0}.`,
      h_csexe: (ch, ph, cd, pd, a) => `Los hombres de la provincia mueren sobre todo de <b>${ch.toLowerCase()}</b> (${ph}) y las mujeres, de <b>${cd.toLowerCase()}</b> (${pd}). Datos de ${a}.`,
      h_cev: (a0, t, c, a) => `${a0 ? `Desde ${a0}, los tumores` : "Los tumores"} son la primera causa de muerte en la provincia: el <b>${t}</b> de las defunciones en ${a}, frente al ${c} del corazón y los vasos.`,
      h_dedat: (p, a1, p0, a0) => `El <b>${p}</b> de las personas que mueren en la provincia tienen 85 años o más (${a1}). En ${a0}, el ${p0}.`,
      h_inf: (g, a, e, g0) => `<b>${g} de cada 1.000 bebés</b> mueren antes de cumplir un año en la provincia (${a}); en España, ${e}. En 1975 eran ${g0}.`,
      h_nom: (n, nom, a0, am, nm) => `<b>${n} bebés</b> se han llamado ${nom} en la provincia desde ${a0}. El año que más, ${am} (${nm}).`,
      h_nom_no: (q) => `No hay ningún nombre «${q}» entre los que publica el Idescat para la provincia (solo salen los que llevan bastantes bebés).`,
      mes: "más", menys: "menos", igual: "las mismas",
      font_dm_ine: "Fuente: INE, Movimiento natural de la población. Los últimos meses, estimación mensual de nacimientos y de defunciones (provisionales)",
      font_dm_setm: "Fuente: INE, Estimación del número de defunciones semanales (EDeS), provisional",
      font_dm_ecm: "Fuente: INE, Estadística de defunciones según la causa de muerte", font_dm_idb: "Fuente: INE, Indicadores demográficos básicos",
      font_dm_salut: "Fuente: CatSalut, registro de defunciones del Registre central d'assegurats. La región sanitaria de Girona incluye el Alt Maresme (Blanes, Calella…) y no la Cerdanya",
      font_dm_noms: "Fuente: Idescat, nombres de los bebés. Solo salen los nombres con bastantes bebés para que el Idescat los publique; el Idescat escribe los nombres sin acentos",
      m_tit: "Girona y las demás provincias", ind: "Indicador", causa: "Causa", per: "Medida",
      i_natalitat: ["Natalidad", "Nacimientos por 1.000 habitantes"], i_fecunditat: ["Fecundidad", "Hijos por mujer"], i_edat_mare: ["Edad de la madre", "Edad media a la maternidad (años)"],
      i_mortalitat: ["Mortalidad", "Defunciones por 1.000 habitantes"], i_mort_inf: ["Mortalidad infantil", "Muertes antes de un año por 1.000 nacidos vivos"],
      i_saldo: ["Crecimiento natural", "Nacimientos menos defunciones por 1.000 habitantes"], i_esperanca: ["Esperanza de vida", "Años de vida al nacer"],
      i_naix_var: ["Nacimientos: variación", "Nacimientos de los últimos 12 meses respecto a los 12 anteriores (%)"], i_def_var: ["Defunciones: variación", "Defunciones de los últimos 12 meses respecto a los 12 anteriores (%)"],
      i_causes: ["Causas de muerte", "Defunciones por causa"], c_pct: "% de las defunciones", c_taxa: "Por 100.000 habitantes",
      h_m: (r, n, v, e) => `Girona ocupa el puesto <b>${r}</b> de ${n} provincias, de más a menos: <b>${v}</b>${e ? `. España, ${e}` : ""}.`,
      sense: "Sin datos", any_m: (a) => `Datos de ${a}`, font_m: "Fuente: INE (Indicadores demográficos básicos, Movimiento natural de la población, estimaciones mensuales provisionales y Estadística de defunciones según la causa de muerte). Tasa por causa: calculada con la población que se deduce de la tasa bruta de mortalidad",
      n_tit: "Los nombres de los bebés", n_u: "Bebés inscritos con cada nombre, provincia de Girona", nenes: "Niñas", nens: "Niños", any: "Año",
      h_n: (a, f, nf, m, nm) => `En ${a}, ${f.includes(" y ") ? "los nombres de niña más puestos en la provincia fueron" : "el nombre de niña más puesto en la provincia fue"} <b>${f}</b> (${nf}${f.includes(" y ") ? " cada uno" : ""}) y ${m.includes(" y ") ? "los de niño" : "el de niño"}, <b>${m}</b> (${nm}${m.includes(" y ") ? " cada uno" : ""}).`,
      h_n_cat: (f, m) => ` En toda Cataluña, ${f} y ${m}.`, com_tit: (a, s) => `El nombre de ${s} más puesto en cada comarca, ${a}`, nena: "niña", nen: "niño",
      com_sense: "Pocos bebés para publicarlo", cerca: "Busca un nombre", cerca_ph: "Escribe un nombre: Júlia, Jan, Pau…", nadons: "bebés",
    },
  };
  const tx = (k, ...a) => { const v = TX[LANG][k]; return typeof v === "function" ? v(...a) : v; };
  const L = () => (LANG === "ca" ? 0 : 1);
  const MESOS = { ca: ["gener", "febrer", "març", "abril", "maig", "juny", "juliol", "agost", "setembre", "octubre", "novembre", "desembre"], es: ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"] };
  const etMes = (m) => `${MESOS[LANG][+m.slice(5, 7) - 1]} ${m.slice(0, 4)}`;
  const delta = (n, ant) => { if (!ant) return ""; const d = (n / ant - 1) * 100; return Math.abs(d) < 0.5 ? tx("igual") : `${LANG === "ca" ? "un" : "un"} ${pct(Math.abs(d), 1)} ${d > 0 ? tx("mes") : tx("menys")}`; };
  const ult = (s) => (s && s.length ? s[s.length - 1] : null);
  // Nombres empatados en el primer puesto: «Júlia, Martina i Sofia»
  const primers = (l) => { const t = (l || []).filter((x) => l[0] && x[1] === l[0][1]).map((x) => x[0]); return t.length > 1 ? `${t.slice(0, -1).join(", ")} ${tx("i")} ${t[t.length - 1]}` : t[0] || ""; };
  const norm = (s) => String(s).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

  let X = null, carregant = null, registrat = false;
  const est = { ind: "natalitat", causa: "II", mesura: "taxa", any: null, sexe: "f", nom: "" };
  const mapes = {};

  // ---------- Textos y titulares para pintaGrafics ----------
  function registra() {
    if (registrat || !window.PG) return;
    registrat = true;
    const tit = (k) => [TX.ca[k], TX.es[k]];
    const ids = ["dm_nd", "dm_mes", "dm_setm", "dm_rs_mes", "dm_fec", "dm_mare_edat", "dm_mares", "dm_causes_sexe", "dm_causes_evol", "dm_def_edat", "dm_inf"];
    const ca = {}, es = {};
    ids.forEach((k) => { ca[k] = TX.ca[k]; es[k] = TX.es[k]; });
    ["dm_nd_noms", "dm_rs_noms", "dm_sexe_noms", "dm_cev_noms", "dm_nom_noms", "font_dm_ine", "font_dm_setm", "font_dm_ecm", "font_dm_idb", "font_dm_salut", "font_dm_noms"].forEach((k) => { ca[k] = TX.ca[k]; es[k] = TX.es[k]; });
    window.PG.textos(ca, es);
    void tit;
    window.PG.grup((g, c) => {
      if (!c) return null;
      if (c.startsWith("cau:")) return (CAUSES[c.slice(4)] || [g, g])[L()];
      if (c.startsWith("edm:")) return (EDM[c.slice(4)] || [g, g])[L()];
      if (c.startsWith("edd:")) return (EDD[c.slice(4)] || [g, g])[L()];
      return null;
    });
    window.PG.titular((id, sp) => (/^dm_/.test(id) ? titular(id, sp) : null));
  }

  // Leyendas que dependen de los datos (años)
  function textosDinamics() {
    const G = X.g, ca = {}, es = {};
    if (G.dm_setm && G.dm_setm.anys) {
      const [a, b] = G.dm_setm.anys;
      ca.dm_setm_noms = { gi: String(a), cat: String(b), esp: TX.ca.mitjana_base };
      es.dm_setm_noms = { gi: String(a), cat: String(b), esp: TX.es.mitjana_base };
    }
    const sp = G.dm_mares || G.dm_def_edat;
    if (sp && sp.anys) { ca.dm_anys_noms = { gi: String(sp.anys[0]), cat: String(sp.anys[1]) }; es.dm_anys_noms = ca.dm_anys_noms; }
    window.PG.textos(ca, es);
  }

  function titular(id, sp) {
    const s = sp.series || {}, g = ult(s.gi), e = ult(s.esp), c = ult(s.cat), g0 = s.gi && s.gi[0];
    if (id === "dm_nd" && g) {
      // Primer año de la racha actual con más defunciones que nacimientos
      const dd = Object.fromEntries((s.esp || []).map((p) => [p[0], p[2]]));
      let a0 = null;
      for (let i = s.gi.length - 1; i >= 0; i--) { const p = s.gi[i]; if (dd[p[0]] != null && dd[p[0]] > p[2]) a0 = p[0]; else break; }
      return tx("h_nd", g[0], fmt(g[2]), fmt(dd[g[0]]), a0 && a0 < g[0] ? a0 : null);
    }
    if (id === "dm_mes" && g) { const d = (s.esp || []).find((p) => p[1] === g[1]); return tx("h_mes", etMes(g[1]).replace(/^./, (x) => x.toUpperCase()), fmt(g[2]), d ? fmt(d[2]) : "–"); }
    if (id === "dm_setm" && X.x.setm) { const w = X.x.setm; return tx("h_setm", w.setm, w.any, fmt(w.n), delta(w.n, w.ant)); }
    if (id === "dm_rs_mes" && g) { const b = (s.esp || []).find((p) => p[1] === g[1]); return tx("h_rs", etMes(g[1]), fmt(g[2]), b ? fmt(b[2]) : "–"); }
    if (id === "dm_fec" && g) return tx("h_fec", fmt(g[2], 2), g[0], e ? fmt(e[2], 2) : null, fmt(g0[2], 2));
    if (id === "dm_mare_edat" && g) return tx("h_mare", fmt(g[2], 1), g[0], fmt(g0[2], 1));
    if (id === "dm_inf" && g) return tx("h_inf", fmt(g[2], 1), g[0], e ? fmt(e[2], 1) : "–", fmt(g0[2], 1));
    if (id === "dm_mares") { const gr = sp.grups.filter((x) => x.c === "edm:35_39" || x.c === "edm:40mes"); const p = gr.reduce((t, x) => t + (x.gi || 0), 0), p0 = gr.reduce((t, x) => t + (x.cat || 0), 0); return tx("h_mares", sp.anys[0], pct(p, 0), sp.anys[1], pct(p0, 0)); }
    if (id === "dm_def_edat") { const gr = sp.grups.filter((x) => x.c === "edd:85_94" || x.c === "edd:95mes"); const p = gr.reduce((t, x) => t + (x.gi || 0), 0), p0 = gr.reduce((t, x) => t + (x.cat || 0), 0); return tx("h_dedat", pct(p, 0), sp.anys[0], pct(p0, 0), sp.anys[1]); }
    if (id === "dm_causes_sexe") {
      const h = [...sp.grups].sort((a, b) => (b.esp || 0) - (a.esp || 0))[0], d = [...sp.grups].sort((a, b) => (b.gi || 0) - (a.gi || 0))[0];
      return h && d ? tx("h_csexe", CAUSES[h.g][L()], pct(h.esp, 0), CAUSES[d.g][L()], pct(d.gi, 0), sp.any) : "";
    }
    if (id === "dm_causes_evol" && g && c) {
      const cc = Object.fromEntries(s.cat.map((p) => [p[0], p[2]]));
      let a0 = null;
      for (let i = s.gi.length - 1; i >= 0; i--) { const p = s.gi[i]; if (cc[p[0]] != null && p[2] > cc[p[0]]) a0 = p[0]; else break; }
      return tx("h_cev", a0 && a0 > s.gi[0][0] ? a0 : null, pct(g[2], 0), pct(c[2], 0), g[0]);
    }
    if (id === "dm_nom") return sp.h || "";
    return "";
  }

  // Etiquetas de las semanas, en el idioma actual
  function prepara() {
    const G = { ...X.g };
    if (G.dm_setm) {
      const sp = JSON.parse(JSON.stringify(G.dm_setm));
      Object.values(sp.series).forEach((ser) => ser.forEach((p) => { p[1] = tx("setmana", p[0]); }));
      G.dm_setm = sp;
    }
    if (D.prov && D.prov.causes) G.causes = D.prov.causes;
    return G;
  }
  const FONT = (id) => (id === "dm_setm" ? "font_dm_setm" : id === "dm_rs_mes" ? "font_dm_salut" : /^dm_(causes|def_edat)/.test(id) ? (id === "dm_def_edat" ? "font_dm_ine" : "font_dm_ecm") : id === "causes" ? "font_causes" : /^dm_(fec|mare_edat|inf)$/.test(id) ? "font_dm_idb" : id === "dm_nom" ? "font_dm_noms" : "font_dm_ine");

  // ---------- Cifras ----------
  function xifres() {
    const cont = document.getElementById("dem-xifres"); if (!cont) return;
    const x = X.x, t = [];
    const per = (o) => tx("fins", etMes(o.de), etMes(o.a));
    if (x.naix12) t.push(tile(tx("x_naix"), fmt(x.naix12.n), `${per(x.naix12)} · ${tx("var_ant", pct((x.naix12.n / x.naix12.ant - 1) * 100, 1, true))}`));
    if (x.def12) t.push(tile(tx("x_def"), fmt(x.def12.n), `${per(x.def12)} · ${tx("var_ant", pct((x.def12.n / x.def12.ant - 1) * 100, 1, true))}`));
    if (x.naix12 && x.def12) { const v = x.naix12.n - x.def12.n; t.push(tile(tx("x_saldo"), `${v > 0 ? "+" : ""}${fmt(v)}`, tx("n_saldo"))); }
    if (x.fecunditat) t.push(tile(tx("x_fec", x.fecunditat.any), fmt(x.fecunditat.gi, 2), x.fecunditat.esp ? tx("n_fec", fmt(x.fecunditat.esp, 2)) : ""));
    if (x.edat_mare) t.push(tile(tx("x_mare", x.edat_mare.any), `${fmt(x.edat_mare.gi, 1)} <small>${tx("anys")}</small>`, x.edat_mare.esp ? tx("n_mare", fmt(x.edat_mare.esp, 1)) : ""));
    const N = X.noms;
    if (N) { const r = N.rank[N.any]; if (r && r.f[0] && r.m[0]) t.push(tile(tx("x_noms", N.any), `${r.f[0][0]} <small>${tx("i")}</small> ${r.m[0][0]}`, tx("n_noms", fmt(r.f[0][1]), fmt(r.m[0][1]), r.f.filter((x, i) => i > 0 && x[1] === r.f[0][1]).map((x) => x[0]).join(", ")))); }
    cont.innerHTML = t.join("");
  }

  // ---------- Mapas ----------
  const RAMPA = () => (document.documentElement.dataset.theme === "dark" || (!document.documentElement.dataset.theme && matchMedia("(prefers-color-scheme: dark)").matches)
    ? ["#12302d", "#174440", "#1d5a55", "#25726b", "#3a8f86", "#64b3a8", "#a4dbd2"] : ["#e4f2ef", "#bfe0da", "#8fc7be", "#5aa9a0", "#2f8a82", "#106b66", "#00423f"]);
  const DIVERG = ["#b2182b", "#e58e8e", "#f3d3d3", "#e8eceb", "#bfe0da", "#5aa9a0", "#00423f"];
  const CATEG = ["#e3001b", "#00423f", "#5aa9a0", "#f08a8a", "#8a6d00", "#6b4fa0", "#1f6fb2", "#9a9a9a"];
  const css = (v) => getComputedStyle(document.documentElement).getPropertyValue(v).trim();
  function talls(vals, k = 7) {
    const s = vals.filter((v) => v != null && isFinite(v)).sort((a, b) => a - b);
    if (!s.length) return [];
    const r = (v) => { const a = Math.abs(v); const p = a >= 1000 ? 100 : a >= 100 ? 10 : a >= 10 ? 1 : a >= 1 ? 0.1 : 0.01; return Math.round(v / p) * p; };
    const t = []; for (let i = 1; i < k; i++) t.push(r(s[Math.floor((i / k) * (s.length - 1))]));
    return [...new Set(t)];
  }
  const colorDe = (v, t, rampa) => { if (v == null || !isFinite(v)) return null; let i = 0; while (i < t.length && v >= t[i]) i++; return rampa[Math.round((i * (rampa.length - 1)) / Math.max(1, t.length))]; };
  function llegenda(el, t, rampa, f = fmt) {
    const n = t.length + 1;
    el.innerHTML = `<div class="escala">${Array.from({ length: n }, (_, i) => `<i style="background:${rampa[Math.round((i * (rampa.length - 1)) / Math.max(1, t.length))]}"></i>`).join("")}</div>
      <div class="ticks">${t.map((v, i) => `<span style="left:${((i + 1) / n) * 100}%">${f(v)}</span>`).join("")}</div>`;
  }
  function creaMapa(id, geo, opts) {
    const cont = document.getElementById(id);
    if (!cont || !window.maplibregl) return null;
    const mapa = new maplibregl.Map({
      container: id, style: { version: 8, sources: {}, layers: [{ id: "fons", type: "background", paint: { "background-color": css("--paper") || "#fffefb" } }] },
      bounds: opts.bounds, fitBoundsOptions: { padding: 8 }, maxZoom: 9, renderWorldCopies: false,
      attributionControl: false, dragRotate: false, pitchWithRotate: false, cooperativeGestures: true,
    });
    mapa.touchZoomRotate.disableRotation();
    mapa.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    const o = { mapa, geo, llest: false, pendent: null };
    mapa.on("load", () => {
      mapa.addSource("g", { type: "geojson", data: geo, promoteId: opts.clau });
      mapa.addLayer({ id: "f", type: "fill", source: "g", paint: { "fill-color": ["coalesce", ["feature-state", "col"], css("--sense") || "#e7e3da"] } });
      mapa.addLayer({ id: "l", type: "line", source: "g", paint: { "line-color": css("--paper") || "#fffefb", "line-width": 0.8 } });
      if (opts.ressalta) mapa.addLayer({ id: "s", type: "line", source: "g", filter: ["==", ["get", opts.clau], opts.ressalta], paint: { "line-color": css("--accent") || "#e3001b", "line-width": 2 } });
      o.llest = true;
      if (o.pendent) { o.pendent(); o.pendent = null; }
      mapa.on("mousemove", "f", (e) => { const f = e.features[0]; const h = opts.tip(f.properties[opts.clau], f.properties); if (h) mostraTip(h, e.originalEvent.clientX, e.originalEvent.clientY); else amagaTip(); });
      mapa.on("mouseleave", "f", amagaTip);
    });
    return o;
  }
  function pinta(o, colors, clau) {
    const fes = () => { o.geo.features.forEach((f) => { o.mapa.setFeatureState({ source: "g", id: f.properties[clau] }, { col: colors[f.properties[clau]] || null }); }); };
    if (o.llest) fes(); else o.pendent = fes;
  }
  const barres = (files, f) => {
    const mx = Math.max(...files.map((x) => Math.abs(x[1] || 0))) || 1;
    return `<div class="pb">${files.map(([n, v, nota, cls]) => `<div class="pb-fila"><span class="pb-nom">${n}${nota ? ` <small class="pb-n">${nota}</small>` : ""}</span><span class="pb-barres"><span class="pb-b"><b class="${cls || "pg-bg-gi"}" style="width:${(Math.abs(v) / mx) * 100}%"></b><em>${f(v)}</em></span></span></div>`).join("")}</div>`;
  };

  const IND = ["natalitat", "fecunditat", "edat_mare", "mortalitat", "mort_inf", "saldo", "esperanca", "naix_var", "def_var", "causes"];
  const DIV = new Set(["saldo", "naix_var", "def_var"]);
  function valorsProv() {
    const M = X.mapa;
    if (est.ind === "causes") {
      const c = M.causes && M.causes.caps[est.causa];
      const v = c ? c[est.mesura] : {};
      return { v: Object.fromEntries(Object.entries(v).filter(([k]) => k !== "esp")), esp: v.esp, any: M.causes && M.causes.any, dec: est.mesura === "pct" ? 1 : 0 };
    }
    const m = M[est.ind] || { v: {} };
    return { v: m.v, esp: m.esp, any: m.de ? tx("fins", etMes(m.de), etMes(m.any)) : m.any, dec: m.dec };
  }
  function fmtInd(v, dec) {
    if (v == null) return tx("sense");
    if (est.ind === "naix_var" || est.ind === "def_var") return pct(v, 1, true);
    if (est.ind === "causes" && est.mesura === "pct") return pct(v, 1);
    if (est.ind === "saldo") return `${v > 0 ? "+" : ""}${fmt(v, 2)}`;
    return fmt(v, dec);
  }
  const nomProv = (c) => (X.geo_prov.features.find((x) => x.properties.c === c) || { properties: {} }).properties.n || c;
  function pintaEsp() {
    const { v, esp, any, dec } = valorsProv();
    let t = talls(Object.values(v)), rampa = RAMPA();
    if (DIV.has(est.ind)) {
      const vs = Object.values(v).filter((x) => x != null), mx = Math.max(...vs.map(Math.abs)) || 1;
      const r = (x) => (mx >= 10 ? Math.round(x) : Math.round(x * 10) / 10);
      t = [-0.6, -0.3, -0.08, 0.08, 0.3, 0.6].map((k) => r(k * mx)); rampa = DIVERG;
    }
    const col = {}; Object.entries(v).forEach(([c, x]) => { col[c] = colorDe(x, t, rampa); });
    if (!mapes.esp) mapes.esp = creaMapa("dem-esp", X.geo_prov, { clau: "c", bounds: [[-13, 34.2], [4.4, 43.9]], ressalta: "17", tip: (c) => { const o = valorsProv(); return `<b>${nomProv(c)}</b><br>${fmtInd(o.v[c], o.dec)}`; } });
    if (mapes.esp) pinta(mapes.esp, col, "c");
    llegenda(document.getElementById("dem-esp-lleg"), t, rampa, (x) => fmtInd(x, dec));
    const ord = Object.entries(v).filter(([, x]) => x != null).sort((a, b) => b[1] - a[1]);
    const r = ord.findIndex((x) => x[0] === "17") + 1, n = ord.length;
    const lab = est.ind === "causes" ? [`${CAUSES[est.causa][L()]}`, tx(est.mesura === "pct" ? "c_pct" : "c_taxa")] : tx("i_" + est.ind);
    document.getElementById("dem-esp-tit").textContent = tx("m_tit");
    document.getElementById("dem-esp-u").textContent = `${lab[0]}: ${lab[1].charAt(0).toLowerCase() + lab[1].slice(1)} · ${tx("any_m", any)}`;
    document.getElementById("dem-esp-h").innerHTML = r ? tx("h_m", r, n, fmtInd(v["17"], dec), esp != null ? fmtInd(esp, dec) : null) : "";
    const rq = ord.slice(0, 10);
    if (r > 10) rq.push(ord[r - 1]);
    document.getElementById("dem-esp-rq").innerHTML = barres(rq.map(([c, x], k) => [`${k < 10 ? k + 1 : r}. ${c === "17" ? `<b>${nomProv(c)}</b>` : nomProv(c)}`, x, "", c === "17" ? "ex-gi" : "pg-bg-esp"]), (x) => fmtInd(x, dec));
    document.getElementById("dem-esp-font").textContent = tx("font_m");
  }
  function controlsEsp() {
    const p = document.getElementById("dem-esp-ctl");
    const disp = IND.filter((k) => X.mapa[k]);
    const caps = X.mapa.causes ? Object.keys(X.mapa.causes.caps).filter((c) => CAUSES[c]) : [];
    p.innerHTML = `<label class="ex-any"><span>${tx("ind")}</span><select id="dem-ind">${disp.map((k) => `<option value="${k}"${k === est.ind ? " selected" : ""}>${tx("i_" + k)[0]}</option>`).join("")}</select></label>
      ${est.ind === "causes" ? `<label class="ex-any"><span>${tx("causa")}</span><select id="dem-causa">${caps.map((c) => `<option value="${c}"${c === est.causa ? " selected" : ""}>${CAUSES[c][L()]}</option>`).join("")}</select></label>
      <div class="segment" role="group">${["taxa", "pct"].map((k) => `<button type="button" data-mesura="${k}" aria-pressed="${est.mesura === k}">${tx("c_" + k)}</button>`).join("")}</div>` : ""}`;
    p.querySelector("#dem-ind").addEventListener("change", (e) => { est.ind = e.target.value; controlsEsp(); pintaEsp(); });
    const sc = p.querySelector("#dem-causa"); if (sc) sc.addEventListener("change", (e) => { est.causa = e.target.value; pintaEsp(); });
    p.querySelectorAll("[data-mesura]").forEach((b) => b.addEventListener("click", () => { est.mesura = b.dataset.mesura; controlsEsp(); pintaEsp(); }));
  }

  // ---------- Nombres ----------
  function pintaNoms() {
    const N = X.noms, fig = document.querySelector("#s-dem .dm-noms");
    if (!N) { if (fig) fig.hidden = true; return; }
    const a = est.any || N.any, r = N.rank[a] || { f: [], m: [] };
    document.getElementById("dem-noms-tit").textContent = tx("n_tit");
    document.getElementById("dem-noms-u").textContent = tx("n_u");
    const c = document.getElementById("dem-noms-ctl");
    c.innerHTML = `<div class="segment" role="group">${["f", "m"].map((k) => `<button type="button" data-sexe="${k}" aria-pressed="${est.sexe === k}">${tx(k === "f" ? "nenes" : "nens")}</button>`).join("")}</div>
      <label class="ex-any"><span>${tx("any")}</span><select id="dem-noms-any">${N.anys.slice().reverse().map((y) => `<option value="${y}"${String(y) === String(a) ? " selected" : ""}>${y}</option>`).join("")}</select></label>`;
    c.querySelectorAll("[data-sexe]").forEach((b) => b.addEventListener("click", () => { est.sexe = b.dataset.sexe; pintaNoms(); }));
    c.querySelector("select").addEventListener("change", (e) => { est.any = e.target.value; pintaNoms(); });
    const f0 = r.f[0], m0 = r.m[0];
    document.getElementById("dem-noms-h").innerHTML = f0 && m0 ? tx("h_n", a, primers(r.f), fmt(f0[1]), primers(r.m), fmt(m0[1])) + (String(a) === String(N.any) && N.cat.f[0] && N.cat.m[0] ? tx("h_n_cat", primers(N.cat.f), primers(N.cat.m)) : "") : "";
    const l = r[est.sexe] || [];
    document.getElementById("dem-noms-top").innerHTML = barres(l.slice(0, 15).map(([n, v], i) => [`${i + 1}. ${n}`, v, "", est.sexe === "f" ? "pg-bg-gi" : "pg-bg-cat"]), (v) => fmt(v));
    pintaComarques();
    document.getElementById("dem-noms-font").textContent = TX[LANG].font_dm_noms;
    const inp = document.getElementById("dem-cerca");
    inp.placeholder = tx("cerca_ph");
    document.getElementById("dem-cerca-l").textContent = tx("cerca");
    const dl = document.getElementById("dem-noms-llista");
    if (!dl.dataset.ple) { dl.innerHTML = [...new Set(Object.keys(N.serie).map((k) => k.split("|")[0]))].sort((x, y) => x.localeCompare(y)).map((n) => `<option value="${n}">`).join(""); dl.dataset.ple = 1; }
    if (!inp.dataset.lligat) { inp.addEventListener("input", () => { est.nom = inp.value; pintaNom(); }); inp.dataset.lligat = 1; }
    if (!est.nom) { est.nom = (r.f[0] || [""])[0]; inp.value = est.nom; }
    pintaNom();
  }
  function pintaComarques() {
    const N = X.noms, el = document.getElementById("dem-com");
    if (!X.geo_com || !el) return;
    const s = est.sexe, cols = {}, et = {}, noms = [];
    Object.entries(N.com).forEach(([com, o]) => { const p = (o[s] || [])[0]; if (p) { et[com] = p[0]; if (!noms.includes(p[0])) noms.push(p[0]); } });
    // Colores por orden de frecuencia del nombre en la provincia
    const ord = (N.rank[N.any][s] || []).map((x) => x[0]);
    noms.sort((a, b) => (ord.indexOf(a) + 1 || 99) - (ord.indexOf(b) + 1 || 99));
    Object.entries(et).forEach(([com, n]) => { cols[com] = CATEG[noms.indexOf(n) % CATEG.length]; });
    if (!mapes.com) {
      const bb = X.geo_com.features.flatMap((f) => (f.geometry.type === "Polygon" ? [f.geometry.coordinates] : f.geometry.coordinates).flat(1)).flat(1);
      const xs = bb.map((p) => p[0]), ys = bb.map((p) => p[1]);
      mapes.com = creaMapa("dem-com", X.geo_com, { clau: "id", bounds: [[Math.min(...xs), Math.min(...ys)], [Math.max(...xs), Math.max(...ys)]],
        tip: (c) => { const o = (X.noms.com[c] || {})[est.sexe]; return `<b>${c}</b><br>${o && o.length ? o.map((x, i) => `${i + 1}. ${x[0]} (${fmt(x[1])})`).join("<br>") : tx("com_sense")}`; } });
    }
    if (mapes.com) {
      const o = mapes.com;
      const fes = () => {
        o.geo.features.forEach((f) => o.mapa.setFeatureState({ source: "g", id: f.properties.id }, { col: cols[f.properties.id] || null }));
        // Etiquetas con el nombre: marcadores HTML en el centro de cada comarca (sin depender de fuentes del mapa)
        (o.marques || []).forEach((m) => m.remove());
        o.marques = o.geo.features.filter((f) => et[f.properties.id]).map((f) => {
          const e = document.createElement("span"); e.className = "dm-et"; e.textContent = et[f.properties.id];
          return new maplibregl.Marker({ element: e }).setLngLat(centre(f.geometry)).addTo(o.mapa);
        });
      };
      if (o.llest) fes(); else o.pendent = fes;
    }
    document.getElementById("dem-com-lleg").innerHTML = `<p class="dm-com-tit">${tx("com_tit", N.any, tx(s === "f" ? "nena" : "nen"))}</p>` +
      noms.map((n, i) => `<span class="dm-cat"><i style="background:${CATEG[i % CATEG.length]}"></i>${n}</span>`).join("") + `<span class="dm-cat"><i class="dm-sense"></i>${tx("com_sense")}</span>`;
  }
  // Centro aproximado: media de los vértices del anillo exterior más grande
  function centre(g) {
    const pols = g.type === "Polygon" ? [g.coordinates] : g.coordinates;
    const ring = pols.map((p) => p[0]).sort((a, b) => b.length - a.length)[0];
    return [ring.reduce((t, p) => t + p[0], 0) / ring.length, ring.reduce((t, p) => t + p[1], 0) / ring.length];
  }
  function pintaNom() {
    const N = X.noms, q = norm(est.nom || ""), g = document.getElementById("dem-cerca-g"), h = document.getElementById("dem-cerca-h");
    if (!q) { g.innerHTML = ""; h.innerHTML = ""; return; }
    const ks = Object.keys(N.serie).filter((k) => norm(k.split("|")[0]) === q);
    if (!ks.length) { g.innerHTML = ""; h.innerHTML = tx("h_nom_no", est.nom); return; }
    const nom = ks[0].split("|")[0];
    const ser = {};
    ks.forEach((k) => { const s = k.split("|")[1]; ser[s === "f" ? "gi" : "esp"] = N.serie[k].map((v, i) => [N.anys[i], String(N.anys[i]), v]); });
    const tot = ks.reduce((t, k) => t + N.serie[k].reduce((a, b) => a + b, 0), 0);
    const per = N.anys.map((y, i) => [y, ks.reduce((t, k) => t + N.serie[k][i], 0)]).sort((a, b) => b[1] - a[1])[0];
    h.innerHTML = tx("h_nom", fmt(tot), nom, N.anys[0], per[0], fmt(per[1]));
    const sp = { tipus: "linia", u: "n", dec: 0, noms: "dm_nom", series: ser, h: "" };
    window.PG.textos({ dm_nom: TX.ca.dm_nom(nom) }, { dm_nom: TX.es.dm_nom(nom) });
    window.PG.pintaGrafics(g, { dm_nom: sp }, ["dm_nom"], FONT);
    g.querySelectorAll(".pg-h, .pg-font").forEach((e) => e.remove());
  }

  // ---------- Sección ----------
  function pintaTot() {
    registra();
    textosDinamics();
    xifres();
    controlsEsp();
    if (X.geo_prov) pintaEsp();
    const ids = ["dm_nd", "dm_mes", "dm_setm", "dm_rs_mes", "dm_fec", "dm_mare_edat", "dm_mares", "dm_causes_sexe", "causes", "dm_causes_evol", "dm_def_edat", "dm_inf"];
    window.PG.pintaGrafics(document.getElementById("dem-grafics"), prepara(), ids, FONT);
    pintaNoms();
  }
  function pintaSeccio() {
    const sec = document.getElementById("s-dem");
    if (!sec || !window.PG) return Promise.resolve();
    if (X) { pintaTot(); return Promise.resolve(); }
    if (!carregant) carregant = Promise.all([
      fetch("datos/demografia.json").then((r) => (r.ok ? r.json() : null)),
      fetch("datos/provincies.geojson").then((r) => (r.ok ? r.json() : null)).catch(() => null),
      fetch("datos/com.geojson").then((r) => (r.ok ? r.json() : null)).catch(() => null),
    ]).then(([d, prov, com]) => {
      if (!d) { sec.hidden = true; return; }
      X = d; X.geo_prov = prov; X.geo_com = com;
      if (prov && X.mapa) { const ok = new Set(Object.values(X.mapa).flatMap((m) => Object.keys(m.v || {}))); prov.features = prov.features.filter((f) => ok.has(f.properties.c)); }
      pintaTot();
    }).catch((e) => { console.error(e); sec.hidden = true; });
    return carregant;
  }
  window.pintaSeccioDemografia = pintaSeccio;
})();
