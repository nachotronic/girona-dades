"use strict";
/* Mapa coroplético interactivo (MapLibre) por municipio y sección censal.
   Usa las variables globales de app.js: D, t, fmt, pct, val, esforc, mostraTip, amagaTip, obreFitxa, LANG. */

(function () {
  // Escala secuencial de un solo tono (verde mar), de claro a oscuro; en modo oscuro se invierte la luminosidad.
  const RAMPA_CLAR = ["#e4f2ef", "#bfe0da", "#8fc7be", "#5aa9a0", "#2f8a82", "#106b66", "#00423f"];
  const RAMPA_FOSC = ["#12302d", "#174440", "#1d5a55", "#25726b", "#3a8f86", "#64b3a8", "#a4dbd2"];
  const fosc = () => matchMedia("(prefers-color-scheme: dark)").matches && document.documentElement.dataset.theme !== "light";
  const rampa = () => (fosc() ? RAMPA_FOSC : RAMPA_CLAR);
  const sense = () => (fosc() ? "#23262a" : "#e9ebed");
  const css = (v) => getComputedStyle(document.documentElement).getPropertyValue(v).trim();

  const eur = (v) => `${fmt(v)} €`;
  const P0 = { f: (v) => pct(v, 0), c: (v) => pct(v, 0) };
  const P1 = { f: (v) => pct(v, 1), c: (v) => pct(v, 0) };
  const N0 = { f: (v) => fmt(v), c: (v) => fmt(v) };
  const N1 = { f: (v) => fmt(v, 1), c: (v) => fmt(v, Math.abs(v) < 10 && v % 1 ? 1 : 0) };
  const N2 = { f: (v) => fmt(v, 2), c: (v) => fmt(v, 1) };
  const EU = { f: eur, c: (v) => fmt(v) };
  const A = (k) => (x) => (x && x[k] != null ? x[k] : null);
  const X = (k) => (m) => (m.x && m.x[k] != null ? m.x[k] : null);
  const S = (k) => (x) => (x[k] != null ? x[k] : null);
  const suma = (o, anys) => anys.reduce((s, a) => s + (o && o[a] != null ? o[a] : NaN), 0);
  const ANYS5 = ["2021", "2022", "2023", "2024", "2025"];

  // Seguridad y justicia: Mossos por tipo de hecho, Interior (municipios > 20.000 hab.) y CGPJ por partido judicial
  const MOSSOS = [
    ["furts", ["Furts", "Furts"], ["Hurtos", "Hurtos"], 1],
    ["robatori_forca", ["Robatoris amb força", "Robatoris amb força (domicilis, comerços…)"], ["Robos con fuerza", "Robos con fuerza (domicilios, comercios…)"], 1],
    ["robatori_vehicle", ["Robatoris en vehicles", "Robatoris a l'interior de vehicles"], ["Robos en vehículos", "Robos en el interior de vehículos"], 1],
    ["robatori_violencia", ["Robatoris amb violència", "Robatoris amb violència o intimidació"], ["Robos con violencia", "Robos con violencia o intimidación"], 2],
    ["estafes", ["Estafes", "Estafes"], ["Estafas", "Estafas"], 1],
    ["danys", ["Danys", "Danys"], ["Daños", "Daños"], 1],
    ["lesions", ["Lesions", "Lesions"], ["Lesiones", "Lesiones"], 1],
    ["amenaces", ["Amenaces i coaccions", "Amenaces i coaccions"], ["Amenazas y coacciones", "Amenazas y coacciones"], 2],
    ["ocupacio", ["Ocupacions", "Ocupacions d'immobles i usurpacions"], ["Ocupaciones", "Ocupaciones de inmuebles y usurpaciones"], 2],
    ["drogues", ["Tràfic de drogues", "Delictes contra la salut pública (drogues)"], ["Tráfico de drogas", "Delitos contra la salud pública (drogas)"], 2],
    ["agressions_sexuals", ["Agressions sexuals", "Agressions i abusos sexuals"], ["Agresiones sexuales", "Agresiones y abusos sexuales"], 2],
    ["alcohol", ["Alcohol i drogues al volant", "Conducció sota els efectes de l'alcohol o les drogues"], ["Alcohol y drogas al volante", "Conducción bajo los efectos del alcohol o las drogas"], 2],
    ["trencament", ["Trencaments de condemna", "Trencaments de condemna (ordres d'allunyament…)"], ["Quebrantamientos de condena", "Quebrantamientos de condena (órdenes de alejamiento…)"], 2],
  ];
  const NOTA_MO = { ca: "Mossos d'Esquadra, fets coneguts dels últims 12 mesos publicats per àrea bàsica policial. Taxa sobre la població resident: a la costa, l'estiu la infla.", es: "Mossos d'Esquadra, hechos conocidos de los últimos 12 meses publicados por área básica policial. Tasa sobre la población residente: en la costa, el verano la infla." };
  const INTERIOR = [
    ["total", ["Criminalitat (Interior)", "Infraccions penals"], ["Criminalidad (Interior)", "Infracciones penales"]],
    ["conv", ["Criminalitat convencional", "Criminalitat convencional (sense ciberdelictes)"], ["Criminalidad convencional", "Criminalidad convencional (sin ciberdelitos)"]],
    ["ciber", ["Cibercriminalitat", "Ciberdelictes (estafes informàtiques i altres)"], ["Cibercriminalidad", "Ciberdelitos (estafas informáticas y otros)"]],
    ["domicilis", ["Robatoris a domicilis", "Robatoris amb força a domicilis"], ["Robos en domicilios", "Robos con fuerza en domicilios"]],
    ["violencia", ["Robatoris violents", "Robatoris amb violència o intimidació"], ["Robos violentos", "Robos con violencia o intimidación"]],
    ["sexual", ["Delictes sexuals (Interior)", "Delictes contra la llibertat sexual"], ["Delitos sexuales (Interior)", "Delitos contra la libertad sexual"]],
    ["drogues", ["Tràfic de drogues (Interior)", "Tràfic de drogues"], ["Tráfico de drogas (Interior)", "Tráfico de drogas"]],
  ];
  const NOTA_INT = { ca: "Ministeri de l'Interior, Balanç de Criminalitat (any complet). Només municipis de més de 20.000 habitants; inclou fets coneguts per totes les policies.", es: "Ministerio del Interior, Balance de Criminalidad (año completo). Solo municipios de más de 20.000 habitantes; incluye hechos conocidos por todas las policías." };
  const NOTA_PJ = { ca: "CGPJ, jutjats de primera instància i instrucció de cada partit judicial (any complet). Taxa sobre la població dels municipis del partit.", es: "CGPJ, juzgados de primera instancia e instrucción de cada partido judicial (año completo). Tasa sobre la población de los municipios del partido." };
  const NOTA_VDG = { ca: "CGPJ, Observatori contra la Violència Domèstica i de Gènere: jutjats de violència sobre la dona de cada partit judicial, últims quatre trimestres. Taxa per 10.000 habitants.", es: "CGPJ, Observatorio contra la Violencia Doméstica y de Género: juzgados de violencia sobre la mujer de cada partido judicial, últimos cuatro trimestres. Tasa por 10.000 habitantes." };
  const JUSTICIA = [
    ["penal", ["Assumptes penals", "Assumptes penals ingressats per 1.000 habitants"], ["Asuntos penales", "Asuntos penales ingresados por 1.000 habitantes"], {}],
    ["civil", ["Assumptes civils", "Assumptes civils ingressats per 1.000 habitants"], ["Asuntos civiles", "Asuntos civiles ingresados por 1.000 habitantes"], {}],
    ["llanc", ["Desnonaments", "Llançaments practicats per 10.000 habitants"], ["Desahucios", "Lanzamientos practicados por 10.000 habitantes"], { nota: { ca: "CGPJ, llançaments (desnonaments) practicats pels jutjats del partit judicial, per impagament de lloguer, execució hipotecària o altres causes.", es: "CGPJ, lanzamientos (desahucios) practicados por los juzgados del partido judicial, por impago de alquiler, ejecución hipotecaria u otras causas. No incluye los que ejecutan los servicios comunes, por eso el total provincial es algo inferior al del informe trimestral del CGPJ." } }],
    ["llanc_lau", ["Desnonaments de lloguer", "Llançaments per la Llei d'arrendaments urbans per 10.000 habitants"], ["Desahucios de alquiler", "Lanzamientos por la Ley de arrendamientos urbanos por 10.000 habitantes"], {}],
    ["llanc_hipo", ["Desnonaments hipotecaris", "Llançaments per execució hipotecària per 10.000 habitants"], ["Desahucios hipotecarios", "Lanzamientos por ejecución hipotecaria por 10.000 habitantes"], { ...N2 }],
    ["verbals_lloguer", ["Demandes de desnonament", "Judicis verbals d'arrendament ingressats per 10.000 habitants"], ["Demandas de desahucio", "Juicios verbales arrendaticios ingresados por 10.000 habitantes"], {}],
    ["ocupa", ["Demandes per ocupació", "Judicis verbals per ocupació il·legal d'habitatges per 10.000 habitants"], ["Demandas por ocupación", "Juicios verbales por ocupación ilegal de viviendas por 10.000 habitantes"], { ...N2 }],
    ["monitoris", ["Reclamacions de deutes", "Procediments monitoris ingressats per 1.000 habitants"], ["Reclamaciones de deudas", "Procedimientos monitorios ingresados por 1.000 habitantes"], {}],
    ["resolucio", ["Taxa de resolució", "Assumptes resolts per cada 100 d'ingressats"], ["Tasa de resolución", "Asuntos resueltos por cada 100 ingresados"], { sumable: false, ...P0 }],
    ["pendents", ["Assumptes pendents", "Assumptes pendents a final d'any per cada 100 de resolts"], ["Asuntos pendientes", "Asuntos pendientes a final de año por cada 100 resueltos"], { sumable: false, ...P0 }],
    ["vdg_den", ["Violència de gènere: denúncies", "Denúncies per violència de gènere per 10.000 habitants"], ["Violencia de género: denuncias", "Denuncias por violencia de género por 10.000 habitantes"], { nota: NOTA_VDG }],
    ["vdg_vict", ["Violència de gènere: víctimes", "Dones víctimes de violència de gènere per 10.000 habitants"], ["Violencia de género: víctimas", "Mujeres víctimas de violencia de género por 10.000 habitantes"], { nota: NOTA_VDG }],
    ["vdg_ord", ["Ordres de protecció", "Ordres de protecció i mesures cautelars per 10.000 habitants"], ["Órdenes de protección", "Órdenes de protección y medidas cautelares por 10.000 habitantes"], { nota: NOTA_VDG, ...N2 }],
    ["vdg_ren", ["Renúncies de les víctimes", "Víctimes que s'acullen a la dispensa de declarar (% de les denúncies)"], ["Renuncias de las víctimas", "Víctimas que se acogen a la dispensa de declarar (% de las denuncias)"], { nota: NOTA_VDG, sumable: false, ...P1 }],
  ];

  // Temas del selector
  const TEMES = [
    { id: "con", ca: "Conjuntura", es: "Coyuntura" },
    { id: "hab", ca: "Habitatge", es: "Vivienda" },
    { id: "ren", ca: "Renda", es: "Renta" },
    { id: "pob", ca: "Població", es: "Población" },
    { id: "edu", ca: "Educació", es: "Educación" },
    { id: "tre", ca: "Treball", es: "Trabajo" },
    { id: "sal", ca: "Salut", es: "Salud" },
    { id: "seg", ca: "Seguretat", es: "Seguridad" },
    { id: "jus", ca: "Justícia", es: "Justicia" },
    { id: "eme", ca: "Emergències", es: "Emergencias" },
    { id: "ter", ca: "Territori", es: "Territorio" },
    { id: "veh", ca: "Vehicles", es: "Vehículos" },
    { id: "ajt", ca: "Ajuntaments", es: "Ayuntamientos" },
    { id: "tri", ca: "Impostos locals", es: "Impuestos locales" },
    { id: "ene", ca: "Energia", es: "Energía" },
    { id: "ele", ca: "Eleccions", es: "Elecciones" },
    { id: "pol", ca: "Alcaldies", es: "Alcaldías" },
  ];
  // Coyuntura (conjuntura.json): series mensuales (m) y trimestrales (t) alineadas con D.cj.per
  const CJ = (k, per) => (m, a) => { const c = D.cj && D.cj.mun[m.ine], s = c && c[k], i = s ? D.cj.idx[per][a] : null; return i == null ? null : s[i]; };
  const CJP = (k, per, z = "gi") => (a) => { const s = D.cj && D.cj.prov[k] && D.cj.prov[k][z], i = s ? D.cj.idx[per][a] : null; return i == null ? null : s[i]; };
  const antPer = (per, a, n) => { const l = D.cj ? D.cj.per[per] : [], i = l.indexOf(a); return i >= n ? l[i - n] : null; };
  const variacio = (f, per, n, minim) => (x, a) => { const b = antPer(per, a, n), va = f(x, a), vb = b ? f(x, b) : null; return va != null && vb != null && vb >= minim ? (va / vb - 1) * 100 : null; };
  const suma4 = (f) => (x, a) => { let s = 0; for (let k = 0; k < 4; k++) { const b = k ? antPer("t", a, k) : a, v = b ? f(x, b) : null; if (v == null) return null; s += v; } return s; };
  const p1564 = (m) => (D.cj && D.cj.pob1564[m.ine]) || null;
  const sumaP1564 = () => (D.cj ? Object.values(D.cj.pob1564).reduce((s, v) => s + v, 0) : 0);
  const sumaPob = () => D.municipios.reduce((s, m) => s + (m.poblacion || 0), 0);
  const atur = CJ("atur", "m"), contr = CJ("contr", "m"), indef = CJ("indef", "m"), llq = CJ("llq", "t"), cvq = CJ("cvq", "t"), ini = CJ("ini", "t");
  const afil = CJ("afil", "m"), reta = CJ("reta", "m"), mat = CJ("mat", "m");
  const suma12 = (f) => (x, a) => { let s = 0; for (let k = 0; k < 12; k++) { const b = k ? antPer("m", a, k) : a, v = b ? f(x, b) : null; if (v == null) return null; s += v; } return s; };
  const mat12 = suma12(mat), mat12P = suma12((_, a) => CJP("mat", "m")(a));
  const NOTA_AFI = { ca: "Idescat a partir de la Seguretat Social: afiliacions al règim general i d'autònoms segons el municipi de residència. Mensual des del maig del 2020, trimestral abans.", es: "Idescat a partir de la Seguridad Social: afiliaciones al régimen general y de autónomos según el municipio de residencia. Mensual desde mayo de 2020, trimestral antes." };
  const aturP = CJP("atur", "m"), cvqP = CJP("cvq", "t"), cvq4 = suma4(cvq), cvq4P = suma4((_, a) => cvqP(a));
  const refCJ = (k, per, fn) => () => { const a = D.cj && D.cj.per[per].slice(-1)[0]; return a ? { cat: fn("cat", a), esp: fn("esp", a) } : {}; };
  const varZ = (k, per, n) => (z, a) => { const b = antPer(per, a, n), va = CJP(k, per, z)(a), vb = b ? CJP(k, per, z)(b) : null; return va != null && vb ? (va / vb - 1) * 100 : null; };
  const NOTA_SEPE = { ca: "SEPE, atur registrat el darrer dia del mes. Les xifres d'1 a 4 no es publiquen.", es: "SEPE, paro registrado el último día del mes. Las cifras de 1 a 4 no se publican." };
  const NOTA_CONTR = { ca: "SEPE, contractes registrats al mes al municipi del centre de treball.", es: "SEPE, contratos registrados en el mes en el municipio del centro de trabajo." };

  // Parque de vehículos (DGT, anual): m.veh = {clave: {año: valor}}, D.veh_ref = {clave: {año: {gi, cat, esp}}}
  const VH = (k) => (m, a) => (a != null && m.veh && m.veh[k] && m.veh[k][a] != null ? m.veh[k][a] : null);
  const VHR = (k, z) => (a) => { const r = D.veh_ref && D.veh_ref[k] && D.veh_ref[k][a]; return r && r[z] != null ? r[z] : null; };
  const NOTA_VEH = { ca: "DGT, dades municipals: vehicles segons el domicili del titular, amb les empreses de lloguer i flotes incloses on tenen la seu.", es: "DGT, datos municipales: vehículos según el domicilio del titular, con las empresas de alquiler y flotas incluidas donde tienen la sede." };
  const VEH = [
    ["total_h", ["Vehicles per habitant", "Parc de vehicles per 1.000 habitants"], ["Vehículos por habitante", "Parque de vehículos por 1.000 habitantes"], N0],
    ["n", ["Parc de vehicles", "Vehicles registrats al municipi"], ["Parque de vehículos", "Vehículos registrados en el municipio"], N0],
    ["tur_h", ["Cotxes per habitant", "Turismes per 1.000 habitants"], ["Coches por habitante", "Turismos por 1.000 habitantes"], N0],
    ["moto_h", ["Motos per habitant", "Motocicletes i ciclomotors per 1.000 habitants"], ["Motos por habitante", "Motocicletas y ciclomotores por 1.000 habitantes"], N0],
    ["furg_h", ["Furgonetes i camions", "Furgonetes i camions per 1.000 habitants"], ["Furgonetas y camiones", "Furgonetas y camiones por 1.000 habitantes"], N0],
    ["elec_p", ["Elèctrics i híbrids endollables", "Vehicles electrificats (% del parc)"], ["Eléctricos e híbridos enchufables", "Vehículos electrificados (% del parque)"], { f: (v) => pct(v, 2), c: (v) => pct(v, 1) }],
    ["diesel_p", ["Dièsel", "Vehicles dièsel (% del parc)"], ["Diésel", "Vehículos diésel (% del parque)"], P1],
    ["eco_p", ["Etiqueta ECO o 0", "Vehicles amb etiqueta ambiental ECO o 0 emissions (% del parc)"], ["Etiqueta ECO o 0", "Vehículos con etiqueta ambiental ECO o 0 emisiones (% del parque)"], P1],
    ["sense_p", ["Sense etiqueta", "Vehicles sense etiqueta ambiental de la DGT (% del parc)"], ["Sin etiqueta", "Vehículos sin etiqueta ambiental de la DGT (% del parque)"], P1],
    ["tur4_p", ["Cotxes de menys de 4 anys", "Turismes de menys de 4 anys (% dels turismes)"], ["Coches de menos de 4 años", "Turismos de menos de 4 años (% de los turismos)"], P1],
    ["antig_tur", ["Edat dels cotxes", "Antiguitat mitjana dels turismes (anys)"], ["Edad de los coches", "Antigüedad media de los turismos (años)"], N1],
    ["cond_h", ["Conductors", "Persones amb permís de conduir per cada 100 habitants"], ["Conductores", "Personas con permiso de conducir por cada 100 habitantes"], N1],
  ];

  // Impuestos municipales (m.trib: {clave: {año: valor}})
  const TV = (k) => (m, a) => (a != null && m.trib && m.trib[k] && m.trib[k][a] != null ? m.trib[k][a] : null);
  const NOTA_TRIB = { ca: "Ministeri d'Hisenda, consulta de tipus impositius municipals (ordenances fiscals que envien els ajuntaments). Les referències són mitjanes ponderades per població; Espanya sense el País Basc ni Navarra.", es: "Ministerio de Hacienda, consulta de tipos impositivos municipales (ordenanzas fiscales que envían los ayuntamientos). Las referencias son medias ponderadas por población; España sin el País Vasco ni Navarra." };
  const PT = (d) => ({ f: (v) => `${fmt(v, d)} %`, c: (v) => `${fmt(v, Math.min(d, 2))} %` });
  const TRIB = [
    ["ibi_u", ["IBI urbà", "Tipus de l'IBI urbà (% del valor cadastral)"], ["IBI urbano", "Tipo del IBI urbano (% del valor catastral)"], { sumable: false, ...PT(2) }],
    ["ibi_rev", ["Revisió cadastral", "Any de l'última revisió dels valors cadastrals"], ["Revisión catastral", "Año de la última revisión de los valores catastrales"], { sumable: false, f: (v) => String(Math.round(v)), c: (v) => String(Math.round(v)),
      nota: { ca: "Any de l'última ponència de valors del Cadastre al municipi. Com més antiga, més baixos són els valors cadastrals i més alt sol ser el tipus de l'IBI. Ministeri d'Hisenda.", es: "Año de la última ponencia de valores del Catastro en el municipio. Cuanto más antigua, más bajos son los valores catastrales y más alto suele ser el tipo del IBI. Ministerio de Hacienda." } }],
    ["ibi_r", ["IBI rústic", "Tipus de l'IBI rústic (% del valor cadastral)"], ["IBI rústico", "Tipo del IBI rústico (% del valor catastral)"], { sumable: false, ...PT(2) }],
    ["ibi_bice", ["IBI d'equipaments (BICE)", "Tipus de l'IBI de béns de característiques especials: autopistes, preses, centrals (%)"], ["IBI de equipamientos (BICE)", "Tipo del IBI de bienes de características especiales: autopistas, presas, centrales (%)"], { sumable: false, ...PT(2) }],
    ["iae_max", ["IAE", "Coeficient de situació màxim de l'impost d'activitats econòmiques"], ["IAE", "Coeficiente de situación máximo del impuesto de actividades económicas"], { sumable: false, f: (v) => fmt(v, 2), c: (v) => fmt(v, 1) }],
    ["ivtm_12", ["Impost de circulació", "Impost de vehicles: turisme de 12 a 15,99 CV fiscals (€/any)"], ["Impuesto de circulación", "Impuesto de vehículos: turismo de 12 a 15,99 CV fiscales (€/año)"], { sumable: false, f: (v) => `${fmt(v, 2)} €`, c: (v) => fmt(v) }],
    ["iivtnu", ["Plusvàlua municipal", "Tipus de l'impost sobre l'increment de valor dels terrenys (%)"], ["Plusvalía municipal", "Tipo del impuesto sobre el incremento de valor de los terrenos (%)"], { sumable: false, ...PT(1) }],
    ["icio", ["ICIO", "Impost sobre construccions, instal·lacions i obres (% del pressupost)"], ["ICIO", "Impuesto sobre construcciones, instalaciones y obras (% del presupuesto)"], { sumable: false, ...PT(2) }],
  ];
  // Máximos legales (TRLRHL): IBI urbano 1,10 % sin incrementos, IAE 3,8, IVTM 2 × cuota mínima (71,94 €), plusvalía 30 %, ICIO 4 %
  const TRIB_MAX = { ibi_u: 1.1, iae_max: 3.8, ivtm_12: 143.88, iivtnu: 30, icio: 4 };
  const tribMax = (m, a) => { if (!m.trib || a == null) return null; let n = 0, k = 0; for (const [c, mx] of Object.entries(TRIB_MAX)) { const v = TV(c)(m, a); if (v == null) continue; k++; if (v >= mx - 0.005) n++; } return k >= 4 ? n : null; };
  window.TRIB_MAX = TRIB_MAX;

  // ---------- Eleccions (eleccions.json + un fichero por convocatoria) ----------
  // Zona: [cens, votants, nuls, blancs, [i, vots, ...]] (índices de EL_D.c) o, en los totales, {bloc: vots}
  let EL = null, elConv = null;
  const EL_D = {};
  const elDades = () => (elConv && EL_D[elConv]) || null;
  const elInfo = (id = elConv) => (EL ? EL.conv.find((c) => c.id === id) : null);
  const elValids = (z) => (z ? z[1] - z[2] : 0);
  const elCands = (z) => {
    const d = elDades(); if (!z || !d) return [];
    if (!Array.isArray(z[4])) return Object.entries(z[4]).map(([b, v]) => ({ s: b, b, v })).sort((a, b) => b.v - a.v);
    const r = []; for (let k = 0; k < z[4].length; k += 2) { const c = d.c[z[4][k]]; r.push({ s: c[0], b: c[1], nom: c[2], v: z[4][k + 1] }); }
    return r;
  };
  const elBloc = (z, b) => { const v = elValids(z); if (!z || !v) return null; return (elCands(z).filter((c) => c.b === b).reduce((s, c) => s + c.v, 0) / v) * 100; };
  const elPart = (z) => (z && z[0] ? (z[1] / z[0]) * 100 : null);
  const elGuany = (z) => { const c = elCands(z); return c.length ? c[0].b : null; };
  const elMarge = (z) => { const c = elCands(z), v = elValids(z); return c.length > 1 && v ? ((c[0].v - c[1].v) / v) * 100 : null; };
  const TXT_EL = {
    ca: { font: "Generalitat de Catalunya, resultats per secció censal.", pctv: "Percentatges sobre els vots vàlids (candidatures i en blanc).", seccions: "Les seccions són les del 2024: les que s'han creat després de l'elecció surten sense dades.",
      part: "Votants sobre el cens electoral (sense el vot exterior).", marge: "Diferència entre la primera i la segona candidatura, en punts sobre els vots vàlids.", guany: "Cada zona té el color del bloc polític de la candidatura més votada.",
      participacio: "Participació", vots: "vots", cens: "cens", punts: "punts", tipus: "Elecció", any: "Any", cap: "Aquesta candidatura no es va presentar en aquesta elecció.", altres_c: "Altres" },
    es: { font: "Generalitat de Catalunya, resultados por sección censal.", pctv: "Porcentajes sobre los votos válidos (candidaturas y en blanco).", seccions: "Las secciones son las de 2024: las creadas después de la elección aparecen sin datos.",
      part: "Votantes sobre el censo electoral (sin el voto exterior).", marge: "Diferencia entre la primera y la segunda candidatura, en puntos sobre los votos válidos.", guany: "Cada zona tiene el color del bloque político de la candidatura más votada.",
      participacio: "Participación", vots: "votos", cens: "censo", punts: "puntos", tipus: "Elección", any: "Año", cap: "Esta candidatura no se presentó en esta elección.", altres_c: "Otras" },
  };
  const tel = (k) => (TXT_EL[LANG] || TXT_EL.ca)[k];
  const COMPOSICIO = {
    Junts: { ca: "Inclou CiU, CDC, Democràcia i Llibertat, JxCat i Junts (i Compromís Municipal a les municipals). El 2015 al Parlament va anar dins de Junts pel Sí.", es: "Incluye CiU, CDC, Democràcia i Llibertat, JxCat y Junts (y Compromís Municipal en las municipales). En 2015 en el Parlament fue dentro de Junts pel Sí." },
    ERC: { ca: "Inclou les coalicions d'ERC (Catalunya Sí, Sobiranistes, Ara Repúbliques) i Acord Municipal.", es: "Incluye las coaliciones de ERC (Catalunya Sí, Sobiranistes, Ara Repúbliques) y Acord Municipal." },
    PSC: { ca: "Inclou PSC-Candidatura de Progrés i PSC-Progrés Municipal.", es: "Incluye PSC-Candidatura de Progrés y PSC-Progrés Municipal." },
    CUP: { ca: "Inclou les llistes municipals de la CUP i Amunt.", es: "Incluye las listas municipales de la CUP y Amunt." },
    Comuns: { ca: "ICV-EUiA, Catalunya Sí que es Pot, En Comú Podem, Sumar i les llistes d'En Comú a les municipals.", es: "ICV-EUiA, Catalunya Sí que es Pot, En Comú Podem, Sumar y las listas de En Comú en las municipales." },
    "JxSí": { ca: "Coalició de CDC i ERC a les eleccions al Parlament del 2015.", es: "Coalición de CDC y ERC en las elecciones al Parlament de 2015." },
    Locals: { ca: "Candidatures municipals que no pertanyen a cap dels blocs anteriors.", es: "Candidaturas municipales que no pertenecen a ninguno de los bloques anteriores." },
  };
  const elNota = (extra, pctv) => ({ ca: [extra && extra.ca, pctv && TXT_EL.ca.pctv, TXT_EL.ca.font].filter(Boolean).join(" "), es: [extra && extra.es, pctv && TXT_EL.es.pctv, TXT_EL.es.font].filter(Boolean).join(" ") });
  const elRef = (f) => () => { const d = elDades(); return d ? { cat: d.cat ? f(d.cat) : null } : {}; };
  const indBloc = (b, ca, es) => ({ id: "el_" + b.toLowerCase().replace("ç", "c").replace("í", "i"), el: true, bloc: b, tema: "ele", ca: [`Vot a ${ca}`, `Vot a ${ca} (% dels vots vàlids)`], es: [`Voto a ${es}`, `Voto a ${es} (% de los votos válidos)`],
    ez: (z) => elBloc(z, b), ref: elRef((z) => elBloc(z, b)), nota: elNota(COMPOSICIO[b], true), ...P1, c: (v) => pct(v, 0) });

  // Indicadores: v(m) municipio, s(x) sección; ca/es = [etiqueta corta, título completo]; a = año (o clave de D.anys)
  const IND = [
    // Coyuntura
    { id: "cj_atur", per: "m", tema: "con", ca: ["Atur registrat", "Persones a l'atur registrat (% de la població de 15 a 64 anys)"], es: ["Paro registrado", "Personas en paro registrado (% de la población de 15 a 64 años)"],
      t: (m, a) => { const v = atur(m, a), p = p1564(m); return v != null && p ? (v / p) * 100 : null; }, pv: (a) => { const v = aturP(a); return v != null ? (v / sumaP1564()) * 100 : null; },
      ref: refCJ("atur", "m", (z, a) => (z === "cat" && D.cj.pob_cat && CJP("atur", "m", "cat")(a) != null ? (CJP("atur", "m", "cat")(a) / D.cj.pob_cat.p1564) * 100 : null)), nota: NOTA_SEPE, f: (v) => pct(v, 1), c: (v) => pct(v, v < 10 && v % 1 ? 1 : 0) },
    { id: "cj_atur_var", per: "m", sumable: false, tema: "con", ca: ["Atur: variació anual", "Variació de l'atur registrat respecte al mateix mes de l'any anterior (%)"], es: ["Paro: variación anual", "Variación del paro registrado respecto al mismo mes del año anterior (%)"],
      t: variacio(atur, "m", 12, 20), pv: (a) => varZ("atur", "m", 12)("gi", a), ref: refCJ("atur", "m", (z, a) => varZ("atur", "m", 12)(z, a)),
      nota: { ca: "Només municipis amb almenys 20 aturats fa un any. SEPE.", es: "Solo municipios con al menos 20 parados hace un año. SEPE." }, f: (v) => pct(v, 1, true), c: (v) => pct(v, 0, true) },
    { id: "cj_atur_n", per: "m", tema: "con", ca: ["Aturats", "Persones a l'atur registrat"], es: ["Parados", "Personas en paro registrado"], t: atur, pv: aturP, nota: NOTA_SEPE, ...N0 },
    { id: "cj_contr", per: "m", tema: "con", ca: ["Contractes", "Contractes signats al mes per 1.000 habitants"], es: ["Contratos", "Contratos firmados en el mes por 1.000 habitantes"],
      t: (m, a) => { const v = contr(m, a); return v != null && m.poblacion ? (v / m.poblacion) * 1000 : null; }, pv: (a) => { const v = CJP("contr", "m")(a); return v != null ? (v / sumaPob()) * 1000 : null; },
      ref: refCJ("contr", "m", (z, a) => (z === "cat" && D.cj.pob_cat && CJP("contr", "m", "cat")(a) != null ? (CJP("contr", "m", "cat")(a) / D.cj.pob_cat.pob) * 1000 : null)), nota: NOTA_CONTR, ...N1 },
    { id: "cj_indef", per: "m", cob: 0.15, sumable: false, tema: "con", ca: ["Contractes indefinits", "Contractes indefinits o convertits en indefinits (% del total)"], es: ["Contratos indefinidos", "Contratos indefinidos o convertidos en indefinidos (% del total)"],
      t: (m, a) => { const i = indef(m, a), c = contr(m, a); return i != null && c ? Math.min(100, (i / c) * 100) : null; }, pv: CJP("indef", "m"), ref: refCJ("indef", "m", (z, a) => CJP("indef", "m", z)(a)),
      nota: { ca: "Només municipis amb almenys 20 contractes al mes. SEPE.", es: "Solo municipios con al menos 20 contratos en el mes. SEPE." }, ...P0 },
    { id: "cj_afil", per: "m", cob: 0.5, tema: "con", ca: ["Afiliats", "Afiliats a la Seguretat Social per cada 100 residents de 15 a 64 anys"], es: ["Afiliados", "Afiliados a la Seguridad Social por cada 100 residentes de 15 a 64 años"],
      t: (m, a) => { const v = afil(m, a), p = p1564(m); return v != null && p ? (v / p) * 100 : null; }, pv: (a) => { const v = CJP("afil", "m")(a); return v != null ? (v / sumaP1564()) * 100 : null; },
      ref: refCJ("afil", "m", (z, a) => (z === "cat" && D.cj.pob_cat && CJP("afil", "m", "cat")(a) != null ? (CJP("afil", "m", "cat")(a) / D.cj.pob_cat.p1564) * 100 : null)), nota: NOTA_AFI, ...N1 },
    { id: "cj_afil_var", per: "m", cob: 0.5, sumable: false, tema: "con", ca: ["Afiliats: variació anual", "Variació dels afiliats residents respecte al mateix mes de l'any anterior (%)"], es: ["Afiliados: variación anual", "Variación de los afiliados residentes respecto al mismo mes del año anterior (%)"],
      t: variacio(afil, "m", 12, 50), pv: (a) => varZ("afil", "m", 12)("gi", a), ref: refCJ("afil", "m", (z, a) => varZ("afil", "m", 12)(z, a)),
      nota: { ca: "Només municipis amb almenys 50 afiliats. Idescat.", es: "Solo municipios con al menos 50 afiliados. Idescat." }, f: (v) => pct(v, 1, true), c: (v) => pct(v, 1, true) },
    { id: "cj_reta", per: "m", cob: 0.5, sumable: false, tema: "con", ca: ["Autònoms", "Autònoms (% dels afiliats residents)"], es: ["Autónomos", "Autónomos (% de los afiliados residentes)"],
      t: (m, a) => { const r = reta(m, a), t = afil(m, a); return r != null && t ? (r / t) * 100 : null; }, pv: (a) => { const r = CJP("reta", "m")(a), t = CJP("afil", "m")(a); return r != null && t ? (r / t) * 100 : null; },
      ref: refCJ("reta", "m", (z, a) => { const r = CJP("reta", "m", z)(a), t = CJP("afil", "m", z)(a); return r != null && t ? (r / t) * 100 : null; }), nota: NOTA_AFI, ...P0 },
    { id: "cj_mat", per: "m", cob: 0.3, tema: "con", ca: ["Cotxes nous", "Turismes nous matriculats en 12 mesos per 1.000 habitants"], es: ["Coches nuevos", "Turismos nuevos matriculados en 12 meses por 1.000 habitantes"],
      t: (m, a) => { const v = mat12(m, a); return v != null && m.poblacion ? (v / m.poblacion) * 1000 : null; }, pv: (a) => { const v = mat12P(null, a); return v != null ? (v / sumaPob()) * 1000 : null; },
      nota: { ca: "DGT, segons el domicili del titular. Inclou les empreses de lloguer, que pugen molt la xifra d'alguns municipis.", es: "DGT, según el domicilio del titular. Incluye las empresas de alquiler, que disparan la cifra de algunos municipios." }, ...N1 },
    { id: "cj_llq", per: "t", cob: 0.2, tema: "con", ca: ["Lloguer del trimestre", "Lloguer mitjà dels contractes nous del trimestre (€/mes)"], es: ["Alquiler del trimestre", "Alquiler medio de los contratos nuevos del trimestre (€/mes)"],
      t: llq, pv: CJP("llq", "t"), nota: { ca: "Incasòl, fiances dipositades. Només municipis amb prou contractes.", es: "Incasòl, fianzas depositadas. Solo municipios con suficientes contratos." }, ...EU },
    { id: "cj_llq_var", per: "t", cob: 0.2, sumable: false, tema: "con", ca: ["Lloguer: variació anual", "Variació del lloguer mitjà respecte al mateix trimestre de l'any anterior (%)"], es: ["Alquiler: variación anual", "Variación del alquiler medio respecto al mismo trimestre del año anterior (%)"],
      t: variacio(llq, "t", 4, 1), pv: (a) => varZ("llq", "t", 4)("gi", a), nota: { ca: "Incasòl, fiances dipositades.", es: "Incasòl, fianzas depositadas." }, f: (v) => pct(v, 1, true), c: (v) => pct(v, 0, true) },
    { id: "cj_cvq", per: "t", tema: "con", ca: ["Compravendes del trimestre", "Compravendes d'habitatges al trimestre per 1.000 habitants"], es: ["Compraventas del trimestre", "Compraventas de viviendas en el trimestre por 1.000 habitantes"],
      t: (m, a) => { const v = cvq(m, a); return v != null && m.poblacion ? (v / m.poblacion) * 1000 : null; }, pv: (a) => { const v = cvqP(a); return v != null ? (v / sumaPob()) * 1000 : null; },
      nota: { ca: "Ministeri d'Habitatge, a partir dels notaris.", es: "Ministerio de Vivienda, a partir de los notarios." }, ...N1 },
    { id: "cj_cvq_var", per: "t", sumable: false, tema: "con", ca: ["Compravendes: variació anual", "Compravendes dels últims 12 mesos respecte als 12 anteriors (%)"], es: ["Compraventas: variación anual", "Compraventas de los últimos 12 meses respecto a los 12 anteriores (%)"],
      t: variacio(cvq4, "t", 4, 10), pv: (a) => { const b = antPer("t", a, 4), va = cvq4P(null, a), vb = b ? cvq4P(null, b) : null; return va != null && vb ? (va / vb - 1) * 100 : null; },
      nota: { ca: "Suma de quatre trimestres. Només municipis amb almenys 10 compravendes l'any anterior.", es: "Suma de cuatro trimestres. Solo municipios con al menos 10 compraventas el año anterior." }, f: (v) => pct(v, 1, true), c: (v) => pct(v, 0, true) },
    { id: "cj_ini", per: "t", tema: "con", ca: ["Habitatges iniciats", "Habitatges iniciats al trimestre per 1.000 habitants"], es: ["Viviendas iniciadas", "Viviendas iniciadas en el trimestre por 1.000 habitantes"],
      t: (m, a) => { const v = ini(m, a); return v != null && m.poblacion ? (v / m.poblacion) * 1000 : null; }, pv: (a) => { const v = CJP("ini", "t")(a); return v != null ? (v / sumaPob()) * 1000 : null; },
      nota: { ca: "Secretaria d'Habitatge, a partir dels visats dels aparelladors.", es: "Secretaria d'Habitatge, a partir de los visados de los aparejadores." }, ...N1 },
    // Vivienda
    { id: "lloguer", tema: "hab", ca: ["Lloguer", "Lloguer mitjà (€/mes)"], es: ["Alquiler", "Alquiler medio (€/mes)"], a: 2025, v: (m) => val(m.alquiler, "2025"), t: (m, a) => val(m.alquiler, a), ...EU },
    { id: "var5", sumable: false, tema: "hab", ca: ["Pujada del lloguer", "Variació del lloguer 2020-2025"], es: ["Subida del alquiler", "Variación del alquiler 2020-2025"], v: (m) => { const a = val(m.alquiler, "2025"), b = val(m.alquiler, "2020"); return a && b ? (a / b - 1) * 100 : null; }, f: (v) => pct(v, 0, true), c: (v) => pct(v, 0, true) },
    { id: "esforc", tema: "hab", ca: ["Esforç del lloguer", "Esforç del lloguer (% de la renda de la llar)"], es: ["Esfuerzo del alquiler", "Esfuerzo del alquiler (% de la renta del hogar)"], a: 2024, v: (m) => esforc(m), ...P0 },
    { id: "compra", t: (m, a) => (val(m.compraventas, a) != null && m.poblacion ? (m.compraventas[a] / m.poblacion) * 1000 : null), tema: "hab", ca: ["Compravendes", "Compravendes per 1.000 habitants"], es: ["Compraventas", "Compraventas por 1.000 habitantes"], a: 2025, v: (m) => (val(m.compraventas, "2025") != null && m.poblacion ? (m.compraventas["2025"] / m.poblacion) * 1000 : null), ...N1 },
    { id: "nova", tema: "hab", ca: ["Obra nova", "Compravendes d'habitatge nou (% del total, 2021-2025)"], es: ["Obra nueva", "Compraventas de vivienda nueva (% del total, 2021-2025)"], v: (m) => { const n = suma(m.cv_nova, ANYS5), t = suma(m.compraventas, ANYS5); return t > 0 ? (n / t) * 100 : null; }, ...P0 },
    { id: "protegida", tema: "hab", ca: ["Habitatge protegit", "Compravendes d'habitatge protegit (% del total, 2021-2025)"], es: ["Vivienda protegida", "Compraventas de vivienda protegida (% del total, 2021-2025)"], v: (m) => { const n = suma(m.cv_protegida, ANYS5), t = suma(m.compraventas, ANYS5); return t > 0 ? (n / t) * 100 : null; }, ...P1 },
    { id: "hut", tema: "hab", ca: ["Pisos turístics", "Habitatges d'ús turístic per 100 habitatges"], es: ["Pisos turísticos", "Viviendas de uso turístico por 100 viviendas"], v: (m) => (m.viviendas ? (m.hut / m.viviendas) * 100 : null), ...N1 },
    { id: "buits", tema: "hab", ca: ["Pisos buits", "Habitatges buits registrats per 1.000 habitatges"], es: ["Pisos vacíos", "Viviendas vacías registradas por 1.000 viviendas"], a: "buits", v: X("buits"), ...N1 },
    { id: "visats", tema: "hab", ca: ["Pisos en projecte", "Habitatges visats per 1.000 habitants"], es: ["Pisos en proyecto", "Viviendas visadas por 1.000 habitantes"], a: "visats", v: X("visats"), ...N1 },
    { id: "valor_cad", tema: "hab", ca: ["Valor cadastral", "Valor cadastral mitjà per immoble urbà (€)"], es: ["Valor catastral", "Valor catastral medio por inmueble urbano (€)"], a: "valor_cad", v: X("valor_cad"), ...EU },
    { id: "antics", tema: "hab", ca: ["Abans de 1980", "Habitatges construïts abans de 1980 (%)"], es: ["Antes de 1980", "Viviendas construidas antes de 1980 (%)"], v: (m) => (m.viviendas ? (m.viv_antes_1980 / m.viviendas) * 100 : null), s: (x) => (x.viviendas ? (x.viv_antes_1980 / x.viviendas) * 100 : null), ...P0 },
    { id: "nous", tema: "hab", ca: ["Des del 2000", "Habitatges construïts des del 2000 (%)"], es: ["Desde 2000", "Viviendas construidas desde 2000 (%)"], v: null, s: (x) => (x.viviendas ? (x.viv_post_2000 / x.viviendas) * 100 : null), ...P0 },
    { id: "anyo", tema: "hab", ca: ["Any de construcció", "Any mitjà de construcció dels habitatges"], es: ["Año de construcción", "Año medio de construcción de las viviendas"], v: (m) => m.anyo_mediano, s: S("anyo_mediano"), f: (v) => String(Math.round(v)), c: (v) => String(Math.round(v)) },
    { id: "viv_edif", tema: "hab", ca: ["Pisos per edifici", "Habitatges per edifici"], es: ["Pisos por edificio", "Viviendas por edificio"], v: (m) => (m.edificis ? m.viviendas / m.edificis : null), s: (x) => (x.edificis ? x.viviendas / x.edificis : null), ...N1 },
    { id: "segones", tema: "hab", ca: ["Segones residències", "Habitatges no principals: segones residències i buits (%)"], es: ["Segundas residencias", "Viviendas no principales: segundas residencias y vacías (%)"], a: "segones", v: X("segones"), ...P0 },
    { id: "lloguer_pct", tema: "hab", ca: ["Llars de lloguer", "Habitatges principals de lloguer (%)"], es: ["Hogares de alquiler", "Viviendas principales de alquiler (%)"], a: "lloguer_pct", v: X("lloguer_pct"), ...P0 },
    { id: "petits", tema: "hab", ca: ["Pisos petits", "Habitatges principals de 60 m² o menys (%)"], es: ["Pisos pequeños", "Viviendas principales de 60 m² o menos (%)"], a: "petits", v: X("petits"), ...P0 },
    { id: "grans", tema: "hab", ca: ["Cases grans", "Habitatges principals de més de 120 m² (%)"], es: ["Casas grandes", "Viviendas principales de más de 120 m² (%)"], a: "grans", v: X("grans"), ...P0 },
    { id: "iniciats", tema: "hab", ca: ["Habitatges iniciats", "Habitatges iniciats per 1.000 habitants"], es: ["Viviendas iniciadas", "Viviendas iniciadas por 1.000 habitantes"], a: "iniciats", v: X("iniciats"), ...N1 },
    // Renta y pobreza
    { id: "renda", tema: "ren", ca: ["Renda per persona", "Renda neta per persona (€)"], es: ["Renta por persona", "Renta neta por persona (€)"], a: 2024, v: (m) => val(m.renta_persona, "2024"), t: (m, a) => val(m.renta_persona, a), s: S("renta_persona"), ...EU },
    { id: "renda_llar", tema: "ren", ca: ["Renda per llar", "Renda neta per llar (€)"], es: ["Renta por hogar", "Renta neta por hogar (€)"], a: 2024, v: (m) => val(m.renta_hogar, "2024"), t: (m, a) => val(m.renta_hogar, a), s: S("renta_hogar"), ...EU },
    { id: "pobresa", tema: "ren", ca: ["Risc de pobresa", "Població sota el 60 % de la renda mediana (%)"], es: ["Riesgo de pobreza", "Población bajo el 60 % de la renta mediana (%)"], a: "pobresa", v: X("pobresa"), s: S("pobresa"), ...P1 },
    { id: "pobresa_sev", tema: "ren", ca: ["Pobresa severa", "Població sota el 40 % de la renda mediana (%)"], es: ["Pobreza severa", "Población bajo el 40 % de la renta mediana (%)"], a: "pobresa_sev", v: X("pobresa_sev"), s: S("pobresa_sev"), ...P1 },
    { id: "alts", tema: "ren", ca: ["Rendes altes", "Població per sobre del 200 % de la renda mediana (%)"], es: ["Rentas altas", "Población por encima del 200 % de la renta mediana (%)"], a: "alts_ingressos", v: X("alts_ingressos"), s: S("alts_ingressos"), ...P1 },
    { id: "gini", sumable: false, tema: "ren", ca: ["Desigualtat (Gini)", "Índex de Gini"], es: ["Desigualdad (Gini)", "Índice de Gini"], a: 2024, v: (m) => val(m.gini, "2024"), t: (m, a) => val(m.gini, a), s: S("gini"), f: (v) => fmt(v, 1), c: (v) => fmt(v, 0) },
    { id: "p80p20", sumable: false, tema: "ren", ca: ["Ràtio P80/P20", "Renda del 20 % més ric respecte al 20 % més pobre"], es: ["Ratio P80/P20", "Renta del 20 % más rico respecto al 20 % más pobre"], a: 2024, v: null, s: S("p80p20"), ...N2 },
    { id: "salari", tema: "ren", ca: ["Ingressos del salari", "Ingressos que provenen del salari (%)"], es: ["Ingresos del salario", "Ingresos que proceden del salario (%)"], a: "ing_salari", v: X("ing_salari"), s: S("ing_salari"), ...P0 },
    { id: "pensio", tema: "ren", ca: ["Ingressos de pensions", "Ingressos que provenen de pensions (%)"], es: ["Ingresos de pensiones", "Ingresos que proceden de pensiones (%)"], a: "ing_pensio", v: X("ing_pensio"), s: S("ing_pensio"), ...P0 },
    { id: "prest_atur", tema: "ren", ca: ["Prestacions d'atur", "Ingressos que provenen de prestacions d'atur (%)"], es: ["Prestaciones de paro", "Ingresos que proceden de prestaciones por desempleo (%)"], a: "ing_atur", v: X("ing_atur"), s: S("ing_atur"), ...P1 },
    { id: "rgc", tema: "ren", ca: ["Renda garantida", "Beneficiaris de la renda garantida per 1.000 habitants"], es: ["Renta garantizada", "Beneficiarios de la renta garantizada por 1.000 habitantes"], a: "rgc", v: X("rgc"), ...N1 },
    { id: "irpf", tema: "ren", ca: ["Base de l'IRPF", "Base imposable mitjana per declarant de l'IRPF (€)"], es: ["Base del IRPF", "Base imponible media por declarante del IRPF (€)"], a: "irpf_base", v: X("irpf_base"), ...EU },
    { id: "ist", sumable: false, tema: "ren", ca: ["Índex socioeconòmic", "Índex socioeconòmic territorial (Catalunya = 100)"], es: ["Índice socioeconómico", "Índice socioeconómico territorial (Cataluña = 100)"], a: "ist", v: X("ist"), ...N0 },
    { id: "rfdb", tema: "ren", ca: ["Renda disponible", "Renda familiar disponible bruta per habitant (€)"], es: ["Renta disponible", "Renta familiar disponible bruta por habitante (€)"], a: "rfdb", v: X("rfdb"), ...EU },
    { id: "pensio_mitjana", tema: "ren", ca: ["Pensió mitjana", "Pensió contributiva mitjana (€/mes)"], es: ["Pensión media", "Pensión contributiva media (€/mes)"], a: "pensio_mitjana", v: X("pensio_mitjana"), ...EU },
    // Población
    { id: "pob", sumable: false, tema: "pob", ca: ["Habitants", "Població"], es: ["Habitantes", "Población"], v: (m) => m.poblacion, ...N0 },
    { id: "edat", tema: "pob", ca: ["Edat mitjana", "Edat mitjana de la població (anys)"], es: ["Edad media", "Edad media de la población (años)"], a: "edat", v: X("edat"), s: S("edat"), ...N1 },
    { id: "majors65", tema: "pob", ca: ["Més de 65 anys", "Població de 65 anys i més (%)"], es: ["Más de 65 años", "Población de 65 años y más (%)"], a: "majors65", v: X("majors65"), s: S("majors65"), ...P0 },
    { id: "menors18", tema: "pob", ca: ["Menys de 18 anys", "Població menor de 18 anys (%)"], es: ["Menos de 18 años", "Población menor de 18 años (%)"], a: "menors18", v: X("menors18"), s: S("menors18"), ...P0 },
    { id: "estrangers", tema: "pob", ca: ["Estrangers", "Població de nacionalitat estrangera (%)"], es: ["Extranjeros", "Población de nacionalidad extranjera (%)"], a: "estrangers", v: X("estrangers"), s: S("estrangers"), ...P0 },
    // Nacionalidades (censo anual Idescat)
    { id: "nac_top", tema: "pob", cat: true, ca: ["Principal nacionalitat", "Primera nacionalitat estrangera de cada municipi"], es: ["Principal nacionalidad", "Primera nacionalidad extranjera de cada municipio"], a: "nac", v: (m) => (m.x && m.x.nac_top) || null, f: (v) => nomPais(v), c: (v) => nomPais(v), color: (v) => colorPais(v),
      infoCat: (m, v, k) => (m && m.x && v ? `<p class="rel">${t("nac_info", fmt(m.x.nac_top_n), pct(m.x.nac_top_pct, 0), fmt(m.x.nac_ex))}</p><p class="rel">${t("nac_k", k, nomPais(v))}</p>` : `<p class="rel">${t("sense_dades")}</p>`), nota: { ca: "INE, padró continu. Nacionalitat, no lloc de naixement. L'INE només detalla les principals nacionalitats: països com Hondures o Gàmbia queden agrupats. Només municipis amb 20 estrangers o més.", es: "INE, padrón continuo. Nacionalidad, no lugar de nacimiento. El INE solo detalla las principales nacionalidades: países como Honduras o Gambia quedan agrupados. Solo municipios con 20 extranjeros o más." }, notaCat: { ca: "Nombre de municipis on és la primera nacionalitat estrangera.", es: "Número de municipios donde es la primera nacionalidad extranjera." } },
    { id: "nac_top_pct", sumable: false, tema: "pob", ca: ["Pes de la primera nacionalitat", "Primera nacionalitat estrangera (% dels estrangers del municipi)"], es: ["Peso de la primera nacionalidad", "Primera nacionalidad extranjera (% de los extranjeros del municipio)"], a: "nac", v: X("nac_top_pct"), nota: { ca: "INE, padró continu. Nacionalitat, no lloc de naixement. L'INE només detalla les principals nacionalitats: països com Hondures o Gàmbia queden agrupats. Només municipis amb 20 estrangers o més.", es: "INE, padrón continuo. Nacionalidad, no lugar de nacimiento. El INE solo detalla las principales nacionalidades: países como Honduras o Gambia quedan agrupados. Solo municipios con 20 extranjeros o más." }, ...P0 },
    { id: "nac_MA", sumable: false, tema: "pob", ca: ["Nacionalitat: Marroc", "Residents amb nacionalitat de Marroc (% de la població)"], es: ["Nacionalidad: Marruecos", "Residentes con nacionalidad de Marruecos (% de la población)"], a: "nac_MA", v: X("nac_MA"), nota: { ca: "INE, padró continu.", es: "INE, padrón continuo." }, ...P1 },
    { id: "nac_RO", sumable: false, tema: "pob", ca: ["Nacionalitat: Romania", "Residents amb nacionalitat de Romania (% de la població)"], es: ["Nacionalidad: Rumanía", "Residentes con nacionalidad de Rumanía (% de la población)"], a: "nac_RO", v: X("nac_RO"), nota: { ca: "INE, padró continu.", es: "INE, padrón continuo." }, ...P1 },
    { id: "nac_FR", sumable: false, tema: "pob", ca: ["Nacionalitat: França", "Residents amb nacionalitat de França (% de la població)"], es: ["Nacionalidad: Francia", "Residentes con nacionalidad de Francia (% de la población)"], a: "nac_FR", v: X("nac_FR"), nota: { ca: "INE, padró continu.", es: "INE, padrón continuo." }, ...P1 },
    { id: "nac_RU", sumable: false, tema: "pob", ca: ["Nacionalitat: Rússia", "Residents amb nacionalitat de Rússia (% de la població)"], es: ["Nacionalidad: Rusia", "Residentes con nacionalidad de Rusia (% de la población)"], a: "nac_RU", v: X("nac_RU"), nota: { ca: "INE, padró continu.", es: "INE, padrón continuo." }, ...P1 },
    { id: "nac_CO", sumable: false, tema: "pob", ca: ["Nacionalitat: Colòmbia", "Residents amb nacionalitat de Colòmbia (% de la població)"], es: ["Nacionalidad: Colombia", "Residentes con nacionalidad de Colombia (% de la población)"], a: "nac_CO", v: X("nac_CO"), nota: { ca: "INE, padró continu.", es: "INE, padrón continuo." }, ...P1 },
    { id: "nac_IT", sumable: false, tema: "pob", ca: ["Nacionalitat: Itàlia", "Residents amb nacionalitat de Itàlia (% de la població)"], es: ["Nacionalidad: Italia", "Residentes con nacionalidad de Italia (% de la población)"], a: "nac_IT", v: X("nac_IT"), nota: { ca: "INE, padró continu.", es: "INE, padrón continuo." }, ...P1 },
    { id: "llar", tema: "pob", ca: ["Mida de la llar", "Persones per llar"], es: ["Tamaño del hogar", "Personas por hogar"], a: "llar", v: X("llar"), s: S("llar"), ...N2 },
    { id: "unipersonals", tema: "pob", ca: ["Viuen sols", "Llars unipersonals (%)"], es: ["Viven solos", "Hogares unipersonales (%)"], a: "unipersonals", v: X("unipersonals"), s: S("unipersonals"), ...P0 },
    { id: "estacional", tema: "pob", ca: ["Població estacional", "Població estacional respecte a la resident (%)"], es: ["Población estacional", "Población estacional respecto a la residente (%)"], v: (m) => (m.poblacion && m.poblacion_etca ? (m.poblacion_etca / m.poblacion) * 100 : null), ...P0 },
    { id: "natalitat", tema: "pob", ca: ["Natalitat", "Naixements per 1.000 habitants"], es: ["Natalidad", "Nacimientos por 1.000 habitantes"], a: "natalitat", v: X("natalitat"), ...N1 },
    { id: "mortalitat", tema: "pob", ca: ["Mortalitat", "Defuncions per 1.000 habitants"], es: ["Mortalidad", "Defunciones por 1.000 habitantes"], a: "mortalitat", v: X("mortalitat"), ...N1 },
    { id: "catala", tema: "pob", ca: ["Parla català", "Població que sap parlar català (%)"], es: ["Habla catalán", "Población que sabe hablar catalán (%)"], a: "catala", v: X("catala"), ...P0 },
    { id: "enten_cat", tema: "pob", ca: ["Entén el català", "Població que entén el català (%)"], es: ["Entiende el catalán", "Población que entiende el catalán (%)"], a: "enten_cat", v: X("enten_cat"), ...P0 },
    { id: "nascuts_estr", tema: "pob", ca: ["Nascuts a l'estranger", "Població nascuda a l'estranger (%)"], es: ["Nacidos en el extranjero", "Población nacida en el extranjero (%)"], a: "nascuts_estr", v: X("nascuts_estr"), ...P0 },
    { id: "immigracio", tema: "pob", ca: ["Immigració", "Immigracions de l'estranger per 1.000 habitants"], es: ["Inmigración", "Inmigraciones del extranjero por 1.000 habitantes"], a: "immigracio", v: X("immigracio"), ...N1 },
    { id: "creixement", tema: "pob", ca: ["Creixement", "Creixement total de la població (‰)"], es: ["Crecimiento", "Crecimiento total de la población (‰)"], a: "creixement", v: X("creixement"), ...N1 },
    { id: "monoparentals", tema: "pob", ca: ["Llars monoparentals", "Llars monoparentals (%)"], es: ["Hogares monoparentales", "Hogares monoparentales (%)"], a: "monoparentals", v: X("monoparentals"), ...P0 },
    { id: "educ_sup", tema: "edu", ca: ["Estudis superiors", "Població de 15 anys i més amb estudis superiors (%)"], es: ["Estudios superiores", "Población de 15 años y más con estudios superiores (%)"], a: "educ_sup", v: X("educ_sup"), ...P0 },
    { id: "educ_prim", tema: "edu", ca: ["Estudis primaris o menys", "Població de 15 anys i més amb primària o menys (%)"], es: ["Estudios primarios o menos", "Población de 15 años y más con primaria o menos (%)"], a: "educ_prim", v: X("educ_prim"), ...P0 },
    // Educación
    { id: "edu_sup21", sumable: false, tema: "edu", ca: ["Estudis superiors (cens)", "Població de 16 anys i més amb estudis superiors (%)"], es: ["Estudios superiores (censo)", "Población de 16 años y más con estudios superiores (%)"], a: "edu_sup21", v: X("edu_sup21"), s: S("edu_sup21"), nota: { ca: "INE, Cens 2021. Disponible també per secció censal.", es: "INE, Censo 2021. Disponible también por sección censal." }, ...P1 },
    { id: "edu_cursant", sumable: false, tema: "edu", ca: ["Cursa estudis superiors", "Població de 16 anys i més que cursa estudis superiors (%)"], es: ["Cursa estudios superiores", "Población de 16 años y más que cursa estudios superiores (%)"], a: "edu_cursant", v: X("edu_cursant"), s: S("edu_cursant"), nota: { ca: "INE, Cens 2021. Disponible també per secció censal.", es: "INE, Censo 2021. Disponible también por sección censal." }, ...P1 },
    { id: "edu_estr16", sumable: false, tema: "edu", ca: ["Infants estrangers", "Població de 0 a 15 anys de nacionalitat estrangera (%)"], es: ["Niños extranjeros", "Población de 0 a 15 años de nacionalidad extranjera (%)"], a: "edu_estr16", v: X("edu_estr16"), nota: { ca: "Aproximació a l'alumnat estranger: el Departament d'Educació no publica l'alumnat per nacionalitat i municipi. INE, padró continu.", es: "Aproximación al alumnado extranjero: el Departament d'Educació no publica el alumnado por nacionalidad y municipio. INE, padrón continuo." }, ...P0 },
    { id: "edu_univ", sumable: false, tema: "edu", ca: ["Universitaris", "Estudiants universitaris residents per 1.000 habitants"], es: ["Universitarios", "Estudiantes universitarios residentes por 1.000 habitantes"], a: "edu_univ", v: X("edu_univ"), nota: { ca: "Idescat, a partir de la matrícula de les universitats catalanes. No inclou qui estudia fora de Catalunya.", es: "Idescat, a partir de la matrícula de las universidades catalanas. No incluye a quien estudia fuera de Cataluña." }, ...N1 },
    { id: "edu_publica", sumable: false, tema: "edu", ca: ["Escola pública", "Alumnes d'infantil, primària, ESO i batxillerat en centres públics (%)"], es: ["Escuela pública", "Alumnos de infantil, primaria, ESO y bachillerato en centros públicos (%)"], a: "edu_publica", v: X("edu_publica"), nota: { ca: "Departament d'Educació. Alumnes matriculats als centres del municipi; la resta van a centres privats i concertats. Només municipis amb 500 alumnes o més: als pobles amb una sola escola sempre és pública.", es: "Departament d'Educació. Alumnos matriculados en los centros del municipio; el resto va a centros privados y concertados. Solo municipios con 500 alumnos o más: en los pueblos con una sola escuela siempre es pública." }, ...P0 },
    { id: "edu_ratio_pri", sumable: false, tema: "edu", ca: ["Alumnes per grup (primària)", "Alumnes per grup a primària"], es: ["Alumnos por grupo (primaria)", "Alumnos por grupo en primaria"], a: "edu_ratio_pri", v: X("edu_ratio_pri"), nota: { ca: "Departament d'Educació. Mitjana dels centres del municipi.", es: "Departament d'Educació. Media de los centros del municipio." }, ...N1 },
    { id: "edu_ratio_eso", sumable: false, tema: "edu", ca: ["Alumnes per grup (ESO)", "Alumnes per grup a l'ESO"], es: ["Alumnos por grupo (ESO)", "Alumnos por grupo en la ESO"], a: "edu_ratio_eso", v: X("edu_ratio_eso"), nota: { ca: "Departament d'Educació. Només municipis amb institut.", es: "Departament d'Educació. Solo municipios con instituto." }, ...N1 },
    { id: "edu_0_3", sumable: false, tema: "edu", ca: ["Escolarització 0-3", "Infants a la llar d'infants per cada 100 de 0 a 2 anys (aprox.)"], es: ["Escolarización 0-3", "Niños en la guardería por cada 100 de 0 a 2 años (aprox.)"], a: "edu_0_3", v: X("edu_0_3"), nota: { ca: "Alumnes de llar d'infants matriculats al municipi (Departament d'Educació) sobre tres vegades els naixements de l'últim any (Idescat). Aproximació: no inclou llars privades no autoritzades i compta infants d'altres municipis.", es: "Alumnos de guardería matriculados en el municipio (Departament d'Educació) sobre tres veces los nacimientos del último año (Idescat). Aproximación: no incluye guarderías privadas no autorizadas y cuenta niños de otros municipios." }, ...P0 },
    { id: "edu_primera", sumable: false, tema: "edu", ca: ["Primera opció", "Places assignades a la primera opció de la preinscripció (%)"], es: ["Primera opción", "Plazas asignadas en la primera opción de la preinscripción (%)"], a: "edu_primera", v: X("edu_primera"), nota: { ca: "Departament d'Educació. P3, primària i 1r d'ESO.", es: "Departament d'Educació. P3, primaria y 1.º de ESO." }, ...P0 },
    { id: "edu_mateix", sumable: false, tema: "edu", ca: ["Estudia al municipi", "Alumnes residents que estudien al mateix municipi (%)"], es: ["Estudia en el municipio", "Alumnos residentes que estudian en el mismo municipio (%)"], a: "edu_mateix", v: X("edu_mateix"), nota: { ca: "Idescat, El municipi en xifres.", es: "Idescat, El municipi en xifres." }, ...P0 },
    { id: "edu_centres", tema: "edu", ca: ["Centres educatius", "Centres educatius (escoles, instituts, llars d'infants i altres)"], es: ["Centros educativos", "Centros educativos (escuelas, institutos, guarderías y otros)"], a: "edu_centres", v: X("edu_centres"), nota: { ca: "Departament d'Educació, directori de centres.", es: "Departament d'Educació, directorio de centros." }, ...N0 },
    { id: "edu_alumnes", tema: "edu", ca: ["Alumnes", "Alumnes matriculats d'infantil a batxillerat"], es: ["Alumnos", "Alumnos matriculados de infantil a bachillerato"], a: "edu_alumnes", v: X("edu_alumnes"), nota: { ca: "Departament d'Educació. Alumnes als centres del municipi.", es: "Departament d'Educació. Alumnos en los centros del municipio." }, ...N0 },
    // Trabajo y economía
    { id: "atur", tema: "tre", ca: ["Atur registrat", "Aturats registrats per 100 habitants"], es: ["Paro registrado", "Parados registrados por 100 habitantes"], a: "atur", v: X("atur"), ...N1 },
    { id: "llocs", tema: "tre", ca: ["Llocs de treball", "Llocs de treball per 100 habitants"], es: ["Puestos de trabajo", "Puestos de trabajo por 100 habitantes"], v: X("llocs"), ...N0 },
    { id: "autonoms", tema: "tre", ca: ["Autònoms", "Autònoms per 100 habitants"], es: ["Autónomos", "Autónomos por 100 habitantes"], v: X("autonoms"), ...N1 },
    { id: "empreses", tema: "tre", ca: ["Empreses", "Empreses per 1.000 habitants"], es: ["Empresas", "Empresas por 1.000 habitantes"], v: X("empreses"), ...N1 },
    { id: "ocupats", tema: "tre", ca: ["Afiliats", "Afiliats a la Seguretat Social per 100 habitants (per residència)"], es: ["Afiliados", "Afiliados a la Seguridad Social por 100 habitantes (por residencia)"], v: X("ocupats"), ...N1 },
    { id: "ocupats_dones", tema: "tre", ca: ["Afiliades dones", "Dones entre els afiliats a la Seguretat Social (%)"], es: ["Afiliadas mujeres", "Mujeres entre los afiliados a la Seguridad Social (%)"], v: X("ocupats_dones"), ...P1 },
    { id: "atur_var", sumable: false, tema: "tre", ca: ["Variació de l'atur", "Variació interanual de l'atur registrat (%)"], es: ["Variación del paro", "Variación interanual del paro registrado (%)"], a: "atur_var", v: X("atur_var"), ...P1 },
    { id: "atur_estr", tema: "tre", ca: ["Aturats estrangers", "Estrangers entre els aturats registrats (%)"], es: ["Parados extranjeros", "Extranjeros entre los parados registrados (%)"], a: "atur_estr", v: X("atur_estr"), ...P0 },
    { id: "prest_atur_ben", tema: "tre", ca: ["Prestacions d'atur", "Beneficiaris de prestacions d'atur per 1.000 habitants"], es: ["Prestaciones de paro", "Beneficiarios de prestaciones de paro por 1.000 habitantes"], a: "prest_atur", v: X("prest_atur"), ...N1 },
    { id: "sector_serveis", tema: "tre", ca: ["Serveis", "Llocs de treball als serveis (%)"], es: ["Servicios", "Puestos de trabajo en servicios (%)"], v: X("sector_serveis"), ...P0 },
    { id: "sector_ind", tema: "tre", ca: ["Indústria", "Llocs de treball a la indústria (%)"], es: ["Industria", "Puestos de trabajo en la industria (%)"], v: X("sector_ind"), ...P0 },
    { id: "sector_const", tema: "tre", ca: ["Construcció", "Llocs de treball a la construcció (%)"], es: ["Construcción", "Puestos de trabajo en la construcción (%)"], v: X("sector_const"), ...P0 },
    { id: "sector_agri", tema: "tre", ca: ["Agricultura", "Llocs de treball a l'agricultura (%)"], es: ["Agricultura", "Puestos de trabajo en la agricultura (%)"], v: X("sector_agri"), ...P1 },
    { id: "pib_hab", tema: "tre", ca: ["PIB per habitant", "Producte interior brut per habitant (€)"], es: ["PIB por habitante", "Producto interior bruto por habitante (€)"], a: "pib_hab", v: X("pib_hab"), ...EU },
    { id: "places_tur", tema: "tre", ca: ["Places turístiques", "Places d'hotel, càmping i turisme rural per 1.000 habitants"], es: ["Plazas turísticas", "Plazas de hotel, camping y turismo rural por 1.000 habitantes"], a: "places_tur", v: X("places_tur"), ...N0 },
    // Salud y servicios sociales
    { id: "pensions", tema: "sal", ca: ["Pensionistes", "Pensions contributives per 100 habitants"], es: ["Pensionistas", "Pensiones contributivas por 100 habitantes"], v: X("pensions"), ...N1 },
    { id: "pnc", tema: "sal", ca: ["Pensions no contributives", "Pensions no contributives per 1.000 habitants"], es: ["Pensiones no contributivas", "Pensiones no contributivas por 1.000 habitantes"], a: "pnc", v: X("pnc"), ...N1 },
    { id: "residencies", tema: "sal", ca: ["Residències", "Places en residències per a gent gran per 1.000 habitants"], es: ["Residencias", "Plazas en residencias de mayores por 1.000 habitantes"], a: "residencies", v: X("residencies"), ...N1 },
    { id: "farmacies", tema: "sal", ca: ["Farmàcies", "Farmàcies per 10.000 habitants"], es: ["Farmacias", "Farmacias por 10.000 habitantes"], a: "farmacies", v: X("farmacies"), ...N1 },
    { id: "sanitaris", sumable: false, tema: "sal", ca: ["Centres sanitaris", "Centres sanitaris (CAP, consultoris, hospitals)"], es: ["Centros sanitarios", "Centros sanitarios (CAP, consultorios, hospitales)"], a: "sanitaris", v: X("sanitaris"), ...N0 },
    { id: "rme", tema: "sal", ca: ["Mortalitat ajustada", "Mortalitat ajustada per edat (Catalunya = 100)"], es: ["Mortalidad ajustada", "Mortalidad ajustada por edad (Cataluña = 100)"], a: "rme", abs: A("rme"), nota: { ca: "Dades per àrea bàsica de salut (CatSalut). Índex: Catalunya = 100, ajustat per edat i sexe.", es: "Datos por área básica de salud (CatSalut). Índice: Cataluña = 100, ajustado por edad y sexo." }, ...N0 },
    { id: "mort_prem", tema: "sal", ca: ["Mortalitat prematura", "Mortalitat abans dels 75 anys, ajustada (Catalunya = 100)"], es: ["Mortalidad prematura", "Mortalidad antes de los 75 años, ajustada (Cataluña = 100)"], a: "mort_prem", abs: A("mort_prem"), nota: { ca: "Dades per àrea bàsica de salut (CatSalut). Índex: Catalunya = 100, ajustat per edat i sexe.", es: "Datos por área básica de salud (CatSalut). Índice: Cataluña = 100, ajustado por edad y sexo." }, ...N0 },
    { id: "diabetis", tema: "sal", ca: ["Diabetis", "Prevalença de diabetis tipus 2 en la població atesa (%)"], es: ["Diabetes", "Prevalencia de diabetes tipo 2 en la población atendida (%)"], a: "diabetis", abs: A("diabetis"), nota: { ca: "Dades per àrea bàsica de salut (CatSalut, Central de Resultats).", es: "Datos por área básica de salud (CatSalut, Central de Resultats)." }, ...P1 },
    { id: "tensio", tema: "sal", ca: ["Tensió controlada", "Hipertensos amb bon control de la tensió arterial (%)"], es: ["Tensión controlada", "Hipertensos con buen control de la tensión arterial (%)"], a: "tensio", abs: A("tensio"), nota: { ca: "Dades per àrea bàsica de salut (CatSalut, Central de Resultats).", es: "Datos por área básica de salud (CatSalut, Central de Resultats)." }, ...P0 },
    { id: "grip", tema: "sal", ca: ["Vacuna de la grip", "Vacunats de la grip, 60 anys o més (%)"], es: ["Vacuna de la gripe", "Vacunados de la gripe, 60 años o más (%)"], a: "grip", abs: A("grip"), nota: { ca: "Dades per àrea bàsica de salut (CatSalut, Central de Resultats).", es: "Datos por área básica de salud (CatSalut, Central de Resultats)." }, ...P0 },
    { id: "vac_inf", tema: "sal", ca: ["Vacunes infantils", "Cobertura vacunal infantil (%)"], es: ["Vacunas infantiles", "Cobertura vacunal infantil (%)"], a: "vac_inf", abs: A("vac_inf"), nota: { ca: "Dades per àrea bàsica de salut (CatSalut, Central de Resultats).", es: "Datos por área básica de salud (CatSalut, Central de Resultats)." }, ...P0 },
    { id: "presencials", tema: "sal", ca: ["Visites presencials", "Visites presencials a l'atenció primària (%)"], es: ["Visitas presenciales", "Visitas presenciales en atención primaria (%)"], a: "presencials", abs: A("presencials"), nota: { ca: "Dades per àrea bàsica de salut (CatSalut, Central de Resultats).", es: "Datos por área básica de salud (CatSalut, Central de Resultats)." }, ...P0 },
    { id: "econsulta", tema: "sal", ca: ["eConsulta", "Pacients que fan servir l'eConsulta (%)"], es: ["eConsulta", "Pacientes que usan la eConsulta (%)"], a: "econsulta", abs: A("econsulta"), nota: { ca: "Dades per àrea bàsica de salut (CatSalut, Central de Resultats).", es: "Datos por área básica de salud (CatSalut, Central de Resultats)." }, ...P0 },
    { id: "antibio", tema: "sal", ca: ["Antibiòtics inadequats", "Antibiòtics en faringitis d'adults, ús inadequat (%)"], es: ["Antibióticos inadecuados", "Antibióticos en faringitis de adultos, uso inadecuado (%)"], a: "antibio", abs: A("antibio"), nota: { ca: "Dades per àrea bàsica de salut (CatSalut, Central de Resultats).", es: "Datos por área básica de salud (CatSalut, Central de Resultats)." }, ...P0 },
    { id: "pob_abs", tema: "sal", ca: ["Població assignada", "Persones assignades a l'àrea bàsica de salut"], es: ["Población asignada", "Personas asignadas al área básica de salud"], a: "pob_abs", abs: A("pob_abs"), nota: { ca: "Dades per àrea bàsica de salut (CatSalut, Registre central de població).", es: "Datos por área básica de salud (CatSalut, Registre central de població)." }, ...N0 },
    { id: "abs_pct_65", tema: "sal", ca: ["Pacients de 65 anys o més", "Població assignada de 65 anys o més (%)"], es: ["Pacientes de 65 años o más", "Población asignada de 65 años o más (%)"], a: "abs_pct_65", abs: A("abs_pct_65"), nota: { ca: "Dades per àrea bàsica de salut (CatSalut, Registre central de població).", es: "Datos por área básica de salud (CatSalut, Registre central de població)." }, ...P1 },
    { id: "abs_pct_80", tema: "sal", ca: ["Pacients de 80 anys o més", "Població assignada de 80 anys o més (%)"], es: ["Pacientes de 80 años o más", "Población asignada de 80 años o más (%)"], a: "abs_pct_80", abs: A("abs_pct_80"), nota: { ca: "Dades per àrea bàsica de salut (CatSalut, Registre central de població).", es: "Datos por área básica de salud (CatSalut, Registre central de població)." }, ...P1 },
    { id: "cap_n", sumable: false, tema: "sal", ca: ["CAP i atenció continuada", "Centres d'atenció primària a l'àrea"], es: ["CAP y atención continuada", "Centros de atención primaria en el área"], a: "cap_n", abs: A("cap_n"), nota: { ca: "Centres d'atenció primària i d'atenció continuada (Equipaments de Catalunya). Els punts del mapa marquen els CAP i els hospitals.", es: "Centros de atención primaria y de atención continuada (Equipaments de Catalunya). Los puntos del mapa marcan los CAP y los hospitales." }, ...N0 },
    { id: "inf_resp", tema: "sal", ca: ["Infeccions respiratòries", "Infeccions respiratòries ateses al CAP, últimes 4 setmanes, per 1.000 habitants"], es: ["Infecciones respiratorias", "Infecciones respiratorias atendidas en el CAP, últimas 4 semanas, por 1.000 habitantes"], a: "inf_resp", abs: A("inf_resp"), nota: { ca: "Casos diagnosticats a l'atenció primària les últimes 4 setmanes publicades (Departament de Salut, SIVIC), sobre la població assignada a l'ABS.", es: "Casos diagnosticados en atención primaria en las últimas 4 semanas publicadas (Departament de Salut, SIVIC), sobre la población asignada al ABS." }, ...N1 },
    { id: "inf_grip", tema: "sal", ca: ["Grip", "Casos de grip, últimes 4 setmanes, per 100.000 habitants"], es: ["Gripe", "Casos de gripe, últimas 4 semanas, por 100.000 habitantes"], a: "inf_grip", abs: A("inf_grip"), nota: { ca: "Casos diagnosticats a l'atenció primària les últimes 4 setmanes publicades (Departament de Salut, SIVIC), sobre la població assignada a l'ABS.", es: "Casos diagnosticados en atención primaria en las últimas 4 semanas publicadas (Departament de Salut, SIVIC), sobre la población asignada al ABS." }, ...N0 },
    { id: "inf_covid", tema: "sal", ca: ["COVID-19", "Casos de COVID-19, últimes 4 setmanes, per 100.000 habitants"], es: ["COVID-19", "Casos de COVID-19, últimas 4 semanas, por 100.000 habitantes"], a: "inf_covid", abs: A("inf_covid"), nota: { ca: "Casos diagnosticats a l'atenció primària les últimes 4 setmanes publicades (Departament de Salut, SIVIC), sobre la població assignada a l'ABS.", es: "Casos diagnosticados en atención primaria en las últimas 4 semanas publicadas (Departament de Salut, SIVIC), sobre la población asignada al ABS." }, ...N0 },
    { id: "domicili", tema: "sal", ca: ["Atenció a domicili", "Població atesa al programa d'atenció domiciliària (%)"], es: ["Atención a domicilio", "Población atendida en el programa de atención domiciliaria (%)"], a: "domicili", abs: A("domicili"), nota: { ca: "Dades per àrea bàsica de salut (CatSalut, Central de Resultats).", es: "Datos por área básica de salud (CatSalut, Central de Resultats)." }, ...P1 },
    // Seguridad (áreas básicas policiales)
    { id: "fets", tema: "seg", ca: ["Delictes", "Fets penals coneguts per 1.000 habitants"], es: ["Delitos", "Hechos penales conocidos por 1.000 habitantes"], a: "fets", abp: A("fets"), nota: { ca: "Dades per àrea bàsica policial (Mossos d'Esquadra). Les taxes es calculen sobre la població resident: a la costa, l'estiu les infla.", es: "Datos por área básica policial (Mossos d'Esquadra). Las tasas se calculan sobre la población residente: en la costa, el verano las infla." }, ...N1 },
    { id: "patrimoni", tema: "seg", ca: ["Furts i robatoris", "Delictes contra el patrimoni per 1.000 habitants"], es: ["Hurtos y robos", "Delitos contra el patrimonio por 1.000 habitantes"], a: "patrimoni", abp: A("patrimoni"), nota: { ca: "Dades per àrea bàsica policial (Mossos d'Esquadra). Les taxes es calculen sobre la població resident: a la costa, l'estiu les infla.", es: "Datos por área básica policial (Mossos d'Esquadra). Las tasas se calculan sobre la población residente: en la costa, el verano las infla." }, ...N1 },
    { id: "persones", tema: "seg", ca: ["Contra les persones", "Lesions, homicidis i delictes contra la llibertat per 1.000 habitants"], es: ["Contra las personas", "Lesiones, homicidios y delitos contra la libertad por 1.000 habitantes"], a: "persones", abp: A("persones"), nota: { ca: "Dades per àrea bàsica policial (Mossos d'Esquadra). Les taxes es calculen sobre la població resident: a la costa, l'estiu les infla.", es: "Datos por área básica policial (Mossos d'Esquadra). Las tasas se calculan sobre la población residente: en la costa, el verano las infla." }, ...N1 },
    { id: "sexual", tema: "seg", ca: ["Delictes sexuals", "Delictes contra la llibertat sexual per 1.000 habitants"], es: ["Delitos sexuales", "Delitos contra la libertad sexual por 1.000 habitantes"], a: "sexual", abp: A("sexual"), nota: { ca: "Dades per àrea bàsica policial (Mossos d'Esquadra). Les taxes es calculen sobre la població resident: a la costa, l'estiu les infla.", es: "Datos por área básica policial (Mossos d'Esquadra). Las tasas se calculan sobre la población residente: en la costa, el verano las infla." }, ...N2 },
    { id: "resolts", tema: "seg", ca: ["Delictes resolts", "Fets penals resolts (% dels coneguts)"], es: ["Delitos resueltos", "Hechos penales resueltos (% de los conocidos)"], a: "resolts", abp: A("resolts"), nota: { ca: "Dades per àrea bàsica policial (Mossos d'Esquadra). Les taxes es calculen sobre la població resident: a la costa, l'estiu les infla.", es: "Datos por área básica policial (Mossos d'Esquadra). Las tasas se calculan sobre la población residente: en la costa, el verano las infla." }, ...P0 },
    { id: "detencions", tema: "seg", ca: ["Detencions", "Detencions per 1.000 habitants"], es: ["Detenciones", "Detenciones por 1.000 habitantes"], a: "detencions", abp: A("detencions"), nota: { ca: "Dades per àrea bàsica policial (Mossos d'Esquadra). Les taxes es calculen sobre la població resident: a la costa, l'estiu les infla.", es: "Datos por área básica policial (Mossos d'Esquadra). Las tasas se calculan sobre la población residente: en la costa, el verano las infla." }, ...N1 },
    // Mossos: tipos de hecho de los últimos 12 meses por ABP
    ...MOSSOS.map(([k, ca, es, dec]) => ({ id: "mo_" + k, tema: "seg", ca: [ca[0], ca[1] + " per 1.000 habitants"], es: [es[0], es[1] + " por 1.000 habitantes"], a: "mo_" + k, abp: A("mo_" + k), nota: NOTA_MO, ...(dec === 2 ? N2 : N1) })),
    // Ministerio del Interior: municipios de más de 20.000 habitantes
    ...INTERIOR.map(([k, ca, es]) => ({ id: "int_" + k, tema: "seg", ca: [ca[0], ca[1] + " per 1.000 habitants"], es: [es[0], es[1] + " por 1.000 habitantes"], a: "int_" + k, v: X("int_" + k), nota: NOTA_INT, ...(k === "total" || k === "conv" ? N1 : N2) })),
    // CGPJ: juzgados de cada partido judicial
    ...JUSTICIA.map(([k, ca, es, ext]) => ({ id: "pj_" + k, tema: "jus", ca, es, a: "pj_" + k, pj: A("pj_" + k), nota: ext.nota || NOTA_PJ, ...N1, ...ext })),
    // Emergencias: divisiones territoriales de Agents Rurals y Bombers (Idescat), Bombers e incendios forestales
    { id: "aar", tema: "eme", cat: true, ca: ["Àrea d'Agents Rurals", "Àrea bàsica dels Agents Rurals de cada municipi"], es: ["Área de Agents Rurals", "Área básica de los Agents Rurals de cada municipio"], v: X("aar"), f: (v) => v, c: (v) => v, color: (v) => colorArea(v),
      infoCat: (m, v, k) => (m && m.x && v ? `<p class="rel">${t("aar_info", m.x.arr, k)}</p><p class="rel">${t("reb_info", m.x.reb)}</p>` : `<p class="rel">${t("sense_dades")}</p>`), nota: { ca: "Idescat, codis territorials (novetat de novembre de 2026). A Girona les àrees bàsiques coincideixen amb les comarques, excepte la Cerdanya (àrea regional de l'Alt Pirineu) i Espinelves, Vidrà i Viladrau, que van amb Osona - Lluçanès.", es: "Idescat, códigos territoriales (novedad de noviembre de 2026). En Girona las áreas básicas coinciden con las comarcas, salvo la Cerdanya (área regional del Alt Pirineu) y Espinelves, Vidrà y Viladrau, que van con Osona - Lluçanès." }, notaCat: { ca: "Nombre de municipis de la província a cada àrea.", es: "Número de municipios de la provincia en cada área." } },
    { id: "reb", tema: "eme", cat: true, ca: ["Regió de Bombers", "Regió d'emergències dels Bombers de la Generalitat"], es: ["Región de Bombers", "Región de emergencias de los Bombers de la Generalitat"], v: X("reb"), f: (v) => v, c: (v) => v, color: (v) => (String(v).startsWith("Girona") ? "#106b66" : "#ef8f2a"),
      infoCat: (m, v, k) => (m && m.x && v ? `<p class="rel">${t("reb_k", k)}</p><p class="rel">${t("aar_info", m.x.arr, null)} · ${m.x.aar}</p>` : `<p class="rel">${t("sense_dades")}</p>`), nota: { ca: "Idescat, codis territorials (novetat de novembre de 2026). La Cerdanya, Espinelves, Vidrà i Viladrau depenen de la regió Centre.", es: "Idescat, códigos territoriales (novedad de noviembre de 2026). La Cerdanya, Espinelves, Vidrà y Viladrau dependen de la región Centre." }, notaCat: { ca: "Nombre de municipis de la província a cada regió.", es: "Número de municipios de la provincia en cada región." } },
    { id: "bombers", tema: "eme", ca: ["Actuacions dels Bombers", "Actuacions urgents dels Bombers per 1.000 habitants"], es: ["Actuaciones de Bombers", "Actuaciones urgentes de Bombers por 1.000 habitantes"], a: "bombers", v: X("bombers"), aar: A("bombers"), nota: { ca: "Bombers de la Generalitat, actuacions urgents ateses al municipi (sense pràctiques, simulacres ni dispositius preventius). Taxa sobre la població resident: a la costa i al Pirineu l'estiu i el turisme l'inflen.", es: "Bombers de la Generalitat, actuaciones urgentes atendidas en el municipio (sin prácticas, simulacros ni dispositivos preventivos). Tasa sobre la población residente: en la costa y el Pirineo el verano y el turismo la inflan." }, ...N1 },
    { id: "bomb_inc_urba", tema: "eme", ca: ["Incendis urbans", "Incendis urbans atesos pels Bombers per 1.000 habitants"], es: ["Incendios urbanos", "Incendios urbanos atendidos por Bombers por 1.000 habitantes"], a: "bomb_inc_urba", v: X("bomb_inc_urba"), aar: A("bomb_inc_urba"), nota: { ca: "Bombers de la Generalitat, actuacions urgents ateses al municipi (sense pràctiques, simulacres ni dispositius preventius). Taxa sobre la població resident: a la costa i al Pirineu l'estiu i el turisme l'inflen.", es: "Bombers de la Generalitat, actuaciones urgentes atendidas en el municipio (sin prácticas, simulacros ni dispositivos preventivos). Tasa sobre la población residente: en la costa y el Pirineo el verano y el turismo la inflan." }, ...N2 },
    { id: "bomb_inc_veg", tema: "eme", ca: ["Incendis de vegetació", "Incendis de vegetació atesos pels Bombers per 1.000 habitants"], es: ["Incendios de vegetación", "Incendios de vegetación atendidos por Bombers por 1.000 habitantes"], a: "bomb_inc_veg", v: X("bomb_inc_veg"), aar: A("bomb_inc_veg"), nota: { ca: "Bombers de la Generalitat, actuacions urgents ateses al municipi (sense pràctiques, simulacres ni dispositius preventius). Taxa sobre la població resident: a la costa i al Pirineu l'estiu i el turisme l'inflen.", es: "Bombers de la Generalitat, actuaciones urgentes atendidas en el municipio (sin prácticas, simulacros ni dispositivos preventivos). Tasa sobre la población residente: en la costa y el Pirineo el verano y el turismo la inflan." }, ...N2 },
    { id: "bomb_salvaments", tema: "eme", ca: ["Salvaments", "Salvaments i rescats dels Bombers per 1.000 habitants"], es: ["Salvamentos", "Salvamentos y rescates de Bombers por 1.000 habitantes"], a: "bomb_salvaments", v: X("bomb_salvaments"), aar: A("bomb_salvaments"), nota: { ca: "Bombers de la Generalitat, actuacions urgents ateses al municipi (sense pràctiques, simulacres ni dispositius preventius). Taxa sobre la població resident: a la costa i al Pirineu l'estiu i el turisme l'inflen.", es: "Bombers de la Generalitat, actuaciones urgentes atendidas en el municipio (sin prácticas, simulacros ni dispositivos preventivos). Tasa sobre la población residente: en la costa y el Pirineo el verano y el turismo la inflan." }, ...N2 },
    { id: "bomb_mobilitat", tema: "eme", ca: ["Accidents de trànsit", "Actuacions dels Bombers en accidents i mobilitat per 1.000 habitants"], es: ["Accidentes de tráfico", "Actuaciones de Bombers en accidentes y movilidad por 1.000 habitantes"], a: "bomb_mobilitat", v: X("bomb_mobilitat"), aar: A("bomb_mobilitat"), nota: { ca: "Bombers de la Generalitat, actuacions urgents ateses al municipi (sense pràctiques, simulacres ni dispositius preventius). Taxa sobre la població resident: a la costa i al Pirineu l'estiu i el turisme l'inflen.", es: "Bombers de la Generalitat, actuaciones urgentes atendidas en el municipio (sin prácticas, simulacros ni dispositivos preventivos). Tasa sobre la población residente: en la costa y el Pirineo el verano y el turismo la inflan." }, ...N2 },
    { id: "inc_forestals", tema: "eme", ca: ["Incendis forestals", "Incendis forestals per any i 10.000 ha de terme"], es: ["Incendios forestales", "Incendios forestales por año y 10.000 ha de término"], a: "inc_forestals", v: X("inc_forestals"), aar: A("inc_forestals"), nota: { ca: "Incendis forestals segons el municipi on es van iniciar (Departament d'Agricultura; l'últim any és provisional). Un gran incendi pot cremar més enllà del terme on comença.", es: "Incendios forestales según el municipio donde se iniciaron (Departament d'Agricultura; el último año es provisional). Un gran incendio puede quemar más allá del término donde empieza." }, ...N2 },
    { id: "ha_cremades", tema: "eme", ca: ["Superfície cremada", "Superfície cremada en incendis forestals (% del terme, acumulat)"], es: ["Superficie quemada", "Superficie quemada en incendios forestales (% del término, acumulado)"], a: "ha_cremades", v: X("ha_cremades"), aar: A("ha_cremades"), nota: { ca: "Incendis forestals segons el municipi on es van iniciar (Departament d'Agricultura; l'últim any és provisional). Un gran incendi pot cremar més enllà del terme on comença.", es: "Incendios forestales según el municipio donde se iniciaron (Departament d'Agricultura; el último año es provisional). Un gran incendio puede quemar más allá del término donde empieza." }, f: (v) => pct(v, v < 1 ? 2 : 1), c: (v) => pct(v, v < 1 ? 2 : 0) },
    // Ayuntamientos
    { id: "deute", tema: "ajt", ca: ["Deute per habitant", "Deute viu de l'ajuntament per habitant (€)"], es: ["Deuda por habitante", "Deuda viva del ayuntamiento por habitante (€)"], a: "deute_hab", v: X("deute_hab"), ...EU },
    { id: "pmp", tema: "ajt", ca: ["Pagament a proveïdors", "Període mitjà de pagament a proveïdors (dies)"], es: ["Pago a proveedores", "Periodo medio de pago a proveedores (días)"], v: X("pmp"), ...N0 },
    // Energía y residuos
    { id: "kwh", tema: "ene", ca: ["Consum elèctric domèstic", "Consum elèctric domèstic per habitant (kWh)"], es: ["Consumo eléctrico doméstico", "Consumo eléctrico doméstico por habitante (kWh)"], a: "kwh_dom", v: X("kwh_dom"), ...N0 },
    { id: "autoconsum", tema: "ene", ca: ["Autoconsum", "Instal·lacions d'autoconsum per 1.000 habitants"], es: ["Autoconsumo", "Instalaciones de autoconsumo por 1.000 habitantes"], v: X("autoconsum"), ...N1 },
    { id: "selectiva", tema: "ene", ca: ["Recollida selectiva", "Recollida selectiva (% dels residus)"], es: ["Recogida selectiva", "Recogida selectiva (% de los residuos)"], a: "selectiva", v: X("selectiva"), ...P0 },
    { id: "residus", tema: "ene", ca: ["Residus per habitant", "Residus municipals per habitant i dia (kg)"], es: ["Residuos por habitante", "Residuos municipales por habitante y día (kg)"], a: "residus", v: X("residus"), ...N2 },
    // Parque de vehículos (DGT)
    ...VEH.map(([k, ca, es, fmtk]) => ({ id: "veh_" + k, tema: "veh", ca, es, a: "veh", sumable: k === "n", v: (m) => VH(k)(m, D.anys && D.anys.veh), t: VH(k), pv: VHR(k, "gi"),
      ref: () => { const a = D.anys && D.anys.veh; return { cat: VHR(k, "cat")(a), esp: VHR(k, "esp")(a) }; }, nota: NOTA_VEH, ...fmtk })),
    // Impuestos municipales: tipos de cada ayuntamiento por año (Ministerio de Hacienda, SGFAL)
    ...TRIB.map(([k, ca, es, ext]) => ({ id: "trib_" + k, tema: "tri", ca, es, a: "trib", v: (m) => TV(k)(m, D.anys && D.anys.trib), t: TV(k), nota: ext.nota || NOTA_TRIB, ...ext })),
    { id: "trib_max", sumable: false, tema: "tri", ca: ["Impostos al màxim", "Impostos al màxim legal (dels 5 principals)"], es: ["Impuestos al máximo", "Impuestos al máximo legal (de los 5 principales)"], a: "trib",
      v: (m) => tribMax(m, D.anys && D.anys.trib), t: tribMax, nota: { ca: "Quants d'aquests cinc impostos té l'ajuntament al màxim que permet la llei: IBI urbà (1,10 %, sense increments), IAE (coeficient 3,8), impost de circulació (el doble de la quota mínima), plusvàlua (30 %) i ICIO (4 %). Ministeri d'Hisenda.", es: "Cuántos de estos cinco impuestos tiene el ayuntamiento al máximo que permite la ley: IBI urbano (1,10 %, sin incrementos), IAE (coeficiente 3,8), impuesto de circulación (el doble de la cuota mínima), plusvalía (30 %) e ICIO (4 %). Ministerio de Hacienda." }, f: (v) => `${fmt(v)} / 5`, c: (v) => fmt(v) },
    // Política
    { id: "alcalde", tema: "pol", cat: true, ca: ["Partit de l'alcalde", "Partit de l'alcalde o alcaldessa"], es: ["Partido del alcalde", "Partido del alcalde o alcaldesa"], v: (m) => (m.pol && m.pol.alcalde ? m.pol.alcalde.bloc : null), f: (v) => nomBloc(v), c: (v) => nomBloc(v) },
    // Eleccions: valores de la convocatoria elegida, por municipio y sección
    { id: "el_guany", el: true, cat: true, tema: "ele", ca: ["Guanyador", "Candidatura més votada"], es: ["Ganador", "Candidatura más votada"], ez: elGuany, f: (v) => nomBloc(v), c: (v) => nomBloc(v), nota: elNota({ ca: TXT_EL.ca.guany, es: TXT_EL.es.guany }), notaCat: { ca: "Nombre de zones on cada bloc va ser el més votat.", es: "Número de zonas donde cada bloque fue el más votado." } },
    { id: "el_part", el: true, tema: "ele", ca: ["Participació", "Participació (% del cens)"], es: ["Participación", "Participación (% del censo)"], ez: elPart, ref: elRef(elPart), nota: elNota({ ca: TXT_EL.ca.part, es: TXT_EL.es.part }), ...P1, c: (v) => pct(v, 0) },
    { id: "el_marge", el: true, sumable: false, tema: "ele", ca: ["Avantatge del guanyador", "Avantatge de la primera candidatura sobre la segona (punts)"], es: ["Ventaja del ganador", "Ventaja de la primera candidatura sobre la segunda (puntos)"], ez: elMarge, ref: elRef(elMarge), nota: elNota({ ca: TXT_EL.ca.marge, es: TXT_EL.es.marge }, false), f: (v) => fmt(v, 1), c: (v) => fmt(v, 0) },
    indBloc("Junts", "Junts (CiU)", "Junts (CiU)"),
    indBloc("ERC", "ERC", "ERC"),
    indBloc("PSC", "PSC", "PSC"),
    indBloc("CUP", "la CUP", "la CUP"),
    indBloc("Comuns", "Comuns", "Comuns"),
    indBloc("PP", "PP", "PP"),
    indBloc("Vox", "Vox", "Vox"),
    indBloc("Cs", "Ciutadans", "Ciudadanos"),
    indBloc("Aliança", "Aliança Catalana", "Aliança Catalana"),
    indBloc("JxSí", "Junts pel Sí", "Junts pel Sí"),
    indBloc("Locals", "llistes locals", "listas locales"),
    { id: "densitat", sumable: false, tema: "ter", ca: ["Densitat", "Habitants per km²"], es: ["Densidad", "Habitantes por km²"], a: "densitat", v: X("densitat"), ...N0 },
    { id: "sau", sumable: false, tema: "ter", ca: ["Superfície agrícola", "Superfície agrícola utilitzada (% del terme)"], es: ["Superficie agrícola", "Superficie agrícola utilizada (% del término)"], a: "sau", v: X("sau"), ...P0 },
    { id: "esports", tema: "ter", ca: ["Espais esportius", "Espais esportius per 1.000 habitants"], es: ["Espacios deportivos", "Espacios deportivos por 1.000 habitantes"], a: "esports", v: X("esports"), ...N1 },
    { id: "motos", tema: "ter", ca: ["Motos", "Motocicletes per 1.000 habitants"], es: ["Motos", "Motocicletas por 1.000 habitantes"], a: "motos", v: X("motos"), ...N0 },
  ];
  // Indicadores añadidos a partir del inventario de España en Datos (fuentes originales: INE, AEAT, Idescat, Diputació)
  const NA = { ca: "Agència Tributària, estadística dels declarants de l'IRPF. Només municipis de més de 1.000 habitants.", es: "Agencia Tributaria, estadística de los declarantes del IRPF. Solo municipios de más de 1.000 habitantes." };
  const NX = { ca: "Xifra, Diputació de Girona.", es: "Xifra, Diputació de Girona." };
  const NP = { ca: "Generalitat de Catalunya, liquidació dels pressupostos dels ens locals. Últim any liquidat.", es: "Generalitat de Catalunya, liquidación de los presupuestos de los entes locales. Último año liquidado." };
  const NE = { ca: "Idescat, El municipi en xifres.", es: "Idescat, El municipio en cifras." };
  const NOUS = [
    { id: "renda_bruta", tema: "ren", ca: ["Renda bruta per persona", "Renda bruta mitjana per persona (€)"], es: ["Renta bruta por persona", "Renta bruta media por persona (€)"], a: 2024, v: (m) => val(m.renda_bruta, "2024"), t: (m, a) => val(m.renda_bruta, a), s: S("renta_bruta"), nota: { ca: "INE, Atlas de distribució de la renda de les llars. Abans d'impostos i cotitzacions.", es: "INE, Atlas de distribución de la renta de los hogares. Antes de impuestos y cotizaciones." }, ...EU },
    { id: "renda_bruta_llar", tema: "ren", ca: ["Renda bruta per llar", "Renda bruta mitjana per llar (€)"], es: ["Renta bruta por hogar", "Renta bruta media por hogar (€)"], a: 2024, v: (m) => val(m.renda_bruta_llar, "2024"), t: (m, a) => val(m.renda_bruta_llar, a), nota: { ca: "INE, Atlas de distribució de la renda de les llars.", es: "INE, Atlas de distribución de la renta de los hogares." }, ...EU },
    { id: "renda_mediana", tema: "ren", ca: ["Renda mediana", "Renda mediana per unitat de consum (€)"], es: ["Renta mediana", "Renta mediana por unidad de consumo (€)"], a: 2024, v: (m) => val(m.renda_mediana, "2024"), t: (m, a) => val(m.renda_mediana, a), s: S("renta_mediana"), nota: { ca: "INE, Atlas de distribució de la renda. La meitat de la població en té menys i l'altra meitat, més.", es: "INE, Atlas de distribución de la renta. La mitad de la población tiene menos y la otra mitad, más." }, ...EU },
    { id: "irpf_quota", tema: "ren", ca: ["Quota d'IRPF", "Quota resultant de l'IRPF per declarant (€)"], es: ["Cuota de IRPF", "Cuota resultante del IRPF por declarante (€)"], a: "irpf_quota", v: X("irpf_quota"), nota: NE, ...EU },
    { id: "aeat_bruta", tema: "ren", ca: ["Renda declarada", "Renda bruta mitjana per declaració de l'IRPF (€)"], es: ["Renta declarada", "Renta bruta media por declaración del IRPF (€)"], a: "aeat_bruta", v: X("aeat_bruta"), nota: NA, ...EU },
    { id: "aeat_disp", tema: "ren", ca: ["Renda disponible declarada", "Renda disponible mitjana per declaració, després d'impostos (€)"], es: ["Renta disponible declarada", "Renta disponible media por declaración, después de impuestos (€)"], a: "aeat_disp", v: X("aeat_disp"), nota: NA, ...EU },
    { id: "aeat_decl", tema: "ren", ca: ["Declaracions", "Declaracions de l'IRPF per 100 habitants"], es: ["Declaraciones", "Declaraciones del IRPF por 100 habitantes"], a: "aeat_decl", v: X("aeat_decl"), nota: NA, ...N0 },
    { id: "aeat_tipus", sumable: false, tema: "ren", ca: ["Tipus efectiu", "Quota de l'IRPF sobre la renda bruta declarada (%)"], es: ["Tipo efectivo", "Cuota del IRPF sobre la renta bruta declarada (%)"], a: "aeat_tipus", v: X("aeat_tipus"), nota: NA, ...P1 },
    { id: "aeat_capital", sumable: false, tema: "ren", ca: ["Rendes del capital", "Rendes del capital, lloguers i guanys patrimonials (% de la renda declarada)"], es: ["Rentas del capital", "Rentas del capital, alquileres y ganancias patrimoniales (% de la renta declarada)"], a: "aeat_capital", v: X("aeat_capital"), nota: NA, ...P1 },
    { id: "aeat_activitats", sumable: false, tema: "ren", ca: ["Rendes d'activitats", "Rendes d'activitats econòmiques: autònoms i professionals (% de la renda declarada)"], es: ["Rentas de actividades", "Rentas de actividades económicas: autónomos y profesionales (% de la renta declarada)"], a: "aeat_activitats", v: X("aeat_activitats"), nota: NA, ...P1 },
    { id: "pob_var", sumable: false, tema: "pob", ca: ["Creixement des del 2003", "Variació de la població des del 2003 (%)"], es: ["Crecimiento desde 2003", "Variación de la población desde 2003 (%)"], v: (m) => { const b = m.pob_s && m.pob_s["2003"]; return b && m.poblacion ? (m.poblacion / b - 1) * 100 : null; }, nota: { ca: "INE, padró municipal.", es: "INE, padrón municipal." }, f: (v) => pct(v, 0, true), c: (v) => pct(v, 0, true) },
    { id: "proj2044", sumable: false, tema: "pob", ca: ["Població el 2044", "Projecció de població a 2044 respecte a l'actual (%)"], es: ["Población en 2044", "Proyección de población a 2044 respecto a la actual (%)"], a: "proj2044", v: X("proj2044"), nota: { ca: "Idescat, projeccions de població (escenari mitjà), via Xifra.", es: "Idescat, proyecciones de población (escenario medio), vía Xifra." }, f: (v) => pct(v, 0, true), c: (v) => pct(v, 0, true) },
    { id: "proj_65", sumable: false, tema: "pob", ca: ["Gent gran el 2044", "Població de més de 64 anys el 2044 (% projectat)"], es: ["Mayores en 2044", "Población de más de 64 años en 2044 (% proyectado)"], a: "proj2044", v: X("proj_65"), nota: NX, ...P0 },
    { id: "cera", tema: "pob", ca: ["Residents a l'estranger", "Persones del municipi que viuen a l'estranger (% de la població)"], es: ["Residentes en el extranjero", "Personas del municipio que viven en el extranjero (% de la población)"], a: "cera", v: X("cera"), nota: { ca: "Idescat, padró d'espanyols residents a l'estranger (PERE).", es: "Idescat, padrón de españoles residentes en el extranjero (PERE)." }, ...P1 },
    { id: "saldo_intern", sumable: false, tema: "pob", ca: ["Migració interna", "Saldo migratori amb la resta de Catalunya i d'Espanya per 1.000 habitants"], es: ["Migración interna", "Saldo migratorio con el resto de Cataluña y de España por 1.000 habitantes"], a: "saldo_intern", v: X("saldo_intern"), nota: NE, f: (v) => fmt(v, 1), c: (v) => fmt(v, Math.abs(v) < 10 && v % 1 ? 1 : 0) },
    { id: "taxa_atur", sumable: false, tema: "tre", ca: ["Taxa d'atur (cens)", "Població desocupada (% de la població activa)"], es: ["Tasa de paro (censo)", "Población desocupada (% de la población activa)"], a: "taxa_atur", v: X("taxa_atur"), nota: { ca: "Idescat, cens de població. Només municipis amb prou mostra.", es: "Idescat, censo de población. Solo municipios con suficiente muestra." }, ...P1 },
    { id: "taxa_activitat", sumable: false, tema: "tre", ca: ["Taxa d'activitat", "Població activa (% de la de 16 anys i més)"], es: ["Tasa de actividad", "Población activa (% de la de 16 años y más)"], a: "taxa_activitat", v: X("taxa_activitat"), nota: { ca: "Idescat, cens de població.", es: "Idescat, censo de población." }, ...P0 },
    { id: "micro", sumable: false, tema: "tre", ca: ["Microempreses", "Afiliats en centres de treball de menys de 10 treballadors (%)"], es: ["Microempresas", "Afiliados en centros de trabajo de menos de 10 trabajadores (%)"], a: "micro", v: X("micro"), nota: NE, ...P0 },
    { id: "gran_empresa", sumable: false, tema: "tre", ca: ["Grans empreses", "Afiliats en centres de treball de 250 treballadors o més (%)"], es: ["Grandes empresas", "Afiliados en centros de trabajo de 250 trabajadores o más (%)"], a: "gran_empresa", v: X("gran_empresa"), nota: NE, ...P0 },
    { id: "cert_ab", sumable: false, tema: "hab", ca: ["Pisos eficients", "Certificats energètics amb qualificació A o B (%)"], es: ["Pisos eficientes", "Certificados energéticos con calificación A o B (%)"], a: "cert_ab", v: X("cert_ab"), nota: { ca: "Institut Català d'Energia, via Xifra. Només municipis amb 20 certificats o més.", es: "Institut Català d'Energia, vía Xifra. Solo municipios con 20 certificados o más." }, ...P1 },
    { id: "cert_eg", sumable: false, tema: "hab", ca: ["Pisos poc eficients", "Certificats energètics amb qualificació E, F o G (%)"], es: ["Pisos poco eficientes", "Certificados energéticos con calificación E, F o G (%)"], a: "cert_ab", v: X("cert_eg"), nota: { ca: "Institut Català d'Energia, via Xifra.", es: "Institut Català d'Energia, vía Xifra." }, ...P0 },
    { id: "hpo_sol", tema: "hab", ca: ["Demanda d'habitatge protegit", "Sol·licitants d'habitatge de protecció oficial per 1.000 habitants"], es: ["Demanda de vivienda protegida", "Solicitantes de vivienda de protección oficial por 1.000 habitantes"], a: "hpo_sol", v: X("hpo_sol"), nota: { ca: "Registre de sol·licitants d'HPO, via Xifra.", es: "Registro de solicitantes de VPO, vía Xifra." }, ...N1 },
    { id: "ajuts_lloguer", tema: "hab", ca: ["Ajuts al lloguer", "Ajuts al pagament del lloguer per 1.000 habitants"], es: ["Ayudas al alquiler", "Ayudas al pago del alquiler por 1.000 habitantes"], a: "hpo_sol", v: X("ajuts_lloguer"), nota: { ca: "Agència de l'Habitatge, via Xifra.", es: "Agència de l'Habitatge, vía Xifra." }, ...N1 },
    { id: "ibi_rebut", sumable: false, tema: "ajt", ca: ["Rebut de l'IBI", "Quota íntegra mitjana per rebut de l'IBI (€)"], es: ["Recibo del IBI", "Cuota íntegra media por recibo del IBI (€)"], a: "ibi_rebut", v: X("ibi_rebut"), nota: NE, ...EU },
    { id: "pte_hab", tema: "ajt", ca: ["Diners de l'Estat", "Participació en els tributs de l'Estat per habitant (€)"], es: ["Dinero del Estado", "Participación en los tributos del Estado por habitante (€)"], a: "pte_hab", v: X("pte_hab"), nota: { ca: "Ministeri d'Hisenda, via Xifra. Girona, Figueres i altres municipis grans tenen un règim de cessió diferent.", es: "Ministerio de Hacienda, vía Xifra. Girona, Figueres y otros municipios grandes tienen un régimen de cesión distinto." }, ...EU },
    { id: "esforc_fiscal", sumable: false, tema: "ajt", ca: ["Esforç fiscal", "Coeficient d'esforç fiscal de l'ajuntament"], es: ["Esfuerzo fiscal", "Coeficiente de esfuerzo fiscal del ayuntamiento"], a: "esforc_fiscal", v: X("esforc_fiscal"), nota: { ca: "Ministeri d'Hisenda, via Xifra. Com més alt, més pressió dels tributs locals.", es: "Ministerio de Hacienda, vía Xifra. Cuanto más alto, más presión de los tributos locales." }, ...N2 },
    { id: "pres_desp", tema: "ajt", ca: ["Despesa per habitant", "Despesa liquidada de l'ajuntament per habitant (€)"], es: ["Gasto por habitante", "Gasto liquidado del ayuntamiento por habitante (€)"], a: "pres_desp", v: X("pres_desp"), nota: NP, ...EU },
    { id: "pres_ing", tema: "ajt", ca: ["Ingressos per habitant", "Ingressos liquidats de l'ajuntament per habitant (€)"], es: ["Ingresos por habitante", "Ingresos liquidados del ayuntamiento por habitante (€)"], a: "pres_desp", v: X("pres_ing"), nota: NP, ...EU },
    { id: "pres_saldo", sumable: false, tema: "ajt", ca: ["Saldo pressupostari", "Ingressos menys despeses liquidats per habitant (€)"], es: ["Saldo presupuestario", "Ingresos menos gastos liquidados por habitante (€)"], a: "pres_desp", v: X("pres_saldo"), nota: NP, f: (v) => `${v > 0 ? "+" : ""}${fmt(v)} €`, c: (v) => `${v > 0 ? "+" : ""}${fmt(v)}` },
    { id: "pres_inv", tema: "ajt", ca: ["Inversió per habitant", "Inversions reals de l'ajuntament per habitant (€)"], es: ["Inversión por habitante", "Inversiones reales del ayuntamiento por habitante (€)"], a: "pres_desp", v: X("pres_inv"), nota: NP, ...EU },
    { id: "pres_personal", sumable: false, tema: "ajt", ca: ["Despesa de personal", "Despeses de personal (% de la despesa)"], es: ["Gasto de personal", "Gastos de personal (% del gasto)"], a: "pres_desp", v: X("pres_personal"), nota: NP, ...P0 },
    { id: "pres_transf", sumable: false, tema: "ajt", ca: ["Dependència de transferències", "Transferències d'altres administracions (% dels ingressos)"], es: ["Dependencia de transferencias", "Transferencias de otras administraciones (% de los ingresos)"], a: "pres_desp", v: X("pres_transf"), nota: NP, ...P0 },
    { id: "pres_social", tema: "ajt", ca: ["Despesa social", "Despesa en protecció i promoció social per habitant (€)"], es: ["Gasto social", "Gasto en protección y promoción social por habitante (€)"], a: "pres_desp", v: X("pres_social"), nota: NP, ...EU },
    { id: "pres_ibi", tema: "ajt", ca: ["IBI recaptat", "Ingressos per l'IBI per habitant (€)"], es: ["IBI recaudado", "Ingresos por el IBI por habitante (€)"], a: "pres_desp", v: X("pres_ibi"), nota: NP, ...EU },
    { id: "pres_taxes", tema: "ajt", ca: ["Taxes", "Ingressos per taxes per habitant (€)"], es: ["Tasas", "Ingresos por tasas por habitante (€)"], a: "pres_desp", v: X("pres_taxes"), nota: NP, ...EU },
    { id: "co2", tema: "ene", ca: ["Emissions de CO₂", "Emissions de CO₂ per habitant (tones/any)"], es: ["Emisiones de CO₂", "Emisiones de CO₂ por habitante (toneladas/año)"], a: "co2", v: X("co2"), nota: { ca: "Edificis, serveis, residus, transport i indústria. Xifra, a partir de l'ICAEN.", es: "Edificios, servicios, residuos, transporte e industria. Xifra, a partir del ICAEN." }, ...N1 },
    { id: "co2_transport", tema: "ene", ca: ["CO₂ del transport", "Emissions de CO₂ del transport per habitant (tones/any)"], es: ["CO₂ del transporte", "Emisiones de CO₂ del transporte por habitante (toneladas/año)"], a: "co2", v: X("co2_transport"), nota: NX, ...N1 },
    { id: "co2_residencial", tema: "ene", ca: ["CO₂ de les llars", "Emissions de CO₂ dels habitatges per habitant (tones/any)"], es: ["CO₂ de los hogares", "Emisiones de CO₂ de las viviendas por habitante (toneladas/año)"], a: "co2", v: X("co2_residencial"), nota: NX, ...N2 },
    { id: "gas", tema: "ene", ca: ["Consum de gas", "Consum de gas natural per habitant (kWh)"], es: ["Consumo de gas", "Consumo de gas natural por habitante (kWh)"], a: "gas", v: X("gas"), nota: { ca: "Xifra. Només municipis amb xarxa de gas i dades publicades.", es: "Xifra. Solo municipios con red de gas y datos publicados." }, ...N0 },
    { id: "bancs", tema: "ter", ca: ["Oficines bancàries", "Oficines de bancs i caixes per 10.000 habitants"], es: ["Oficinas bancarias", "Oficinas de bancos y cajas por 10.000 habitantes"], a: "bancs", v: X("bancs"), nota: { ca: "Banc d'Espanya, via Xifra.", es: "Banco de España, vía Xifra." }, ...N1 },
    { id: "comerc", tema: "ter", ca: ["Comerços", "Establiments comercials per 1.000 habitants"], es: ["Comercios", "Establecimientos comerciales por 1.000 habitantes"], a: "comerc", v: X("comerc"), nota: { ca: "Cens d'establiments comercials, via Xifra.", es: "Censo de establecimientos comerciales, vía Xifra." }, ...N1 },
    { id: "comerc_m2", tema: "ter", ca: ["Superfície comercial", "Superfície de venda per habitant (m²)"], es: ["Superficie comercial", "Superficie de venta por habitante (m²)"], a: "comerc", v: X("comerc_m2"), nota: NX, ...N2 },
    { id: "biblio", tema: "ter", ca: ["Biblioteques", "Biblioteques per 10.000 habitants"], es: ["Bibliotecas", "Bibliotecas por 10.000 habitantes"], a: "biblio", v: X("biblio"), nota: NX, ...N1 },
    { id: "museus", sumable: false, tema: "ter", ca: ["Museus", "Museus i col·leccions"], es: ["Museos", "Museos y colecciones"], a: "museus", v: X("museus"), nota: NX, ...N0 },
    { id: "explotacions", tema: "ter", ca: ["Explotacions agràries", "Explotacions agràries per 1.000 habitants"], es: ["Explotaciones agrarias", "Explotaciones agrarias por 1.000 habitantes"], a: "explotacions", v: X("explotacions"), nota: { ca: "Cens agrari 2020 (INE), via Xifra.", es: "Censo agrario 2020 (INE), vía Xifra." }, ...N1 },
    { id: "furgonetes", tema: "ter", ca: ["Furgonetes i camions", "Vehicles industrials per 1.000 habitants"], es: ["Furgonetas y camiones", "Vehículos industriales por 1.000 habitantes"], a: "furgonetes", v: X("furgonetes"), nota: NE, ...N0 },
  ];
  NOUS.forEach((n) => { let k = -1; IND.forEach((i, j) => { if (i.tema === n.tema) k = j; }); IND.splice(k + 1, 0, n); });
  // Los indicadores de coyuntura muestran el último periodo con datos
  // Las matriculaciones mensuales también en el tema Vehicles, después del parque
  { const m = IND.find((i) => i.id === "cj_mat"), p = IND.findIndex((i) => i.id === "veh_tur_h"); if (m && p >= 0) IND.splice(p + 1, 0, { ...m, id: "veh_mat", tema: "veh" }); }
  IND.forEach((i) => { if (i.per) i.v = (m) => (D.cj ? i.t(m, anysDe(i).slice(-1)[0]) : null); });
  const nomInd = (i, curt) => {
    const txt = i[LANG][curt ? 0 : 1];
    if (curt) return txt;
    if (i.el) { const c = elInfo(); return c ? `${txt}\u00a0· ${c.n[LANG]}` : txt; }
    const a = i === ind && anyActiu() ? anyActiu() : typeof i.a === "number" ? i.a : i.a && D.anys ? D.anys[i.a] : null;
    const ap = i.per && !a && D.cj ? anysDe(i).slice(-1)[0] : a;
    return ap ? `${txt} · ${etPer(String(ap))}` : txt;
  };
  let tema = "ren";
  // Municipios que se rotulan en el mapa (capitales de comarca y grandes poblaciones)
  const ROTULS = ["Girona", "Figueres", "Olot", "Ripoll", "Puigcerdà", "Banyoles", "la Bisbal d'Empordà", "Santa Coloma de Farners", "Blanes", "Lloret de Mar", "Palamós", "Roses", "Sant Feliu de Guíxols"];
  const ROTULS_MOBIL = ["Girona", "Figueres", "Olot", "Ripoll", "Puigcerdà", "Blanes", "Palamós"];

  let mapa = null, geoMun = null, geoSec = null, SEC = {}, nivell = "mun", ind = null, llindars = [];
  // Niveles por áreas (salud y policía): geometría y datos por código de área
  const NIVELLS = ["mun", "sec", "abs", "abp", "aar", "pj"], ZONA = { abs: { geo: null, d: {} }, abp: { geo: null, d: {} }, aar: { geo: null, d: {} }, pj: { geo: null, d: {} } };
  const esArea = (n) => n === "abs" || n === "abp" || n === "aar" || n === "pj";
  // Colores fijos para las áreas básicas de Agents Rurals (por orden de la lista de Idescat)
  const AREES_AAR = ["Alt Empordà", "Baix Empordà", "Garrotxa", "Gironès", "Pla de l'Estany", "Ripollès", "Selva", "Cerdanya", "Osona - Lluçanès"];
  const colorArea = (v) => { const i = AREES_AAR.indexOf(v); return i >= 0 ? PAIS_COLORS[i] : "#a5abb5"; };
  // Series temporales: año elegido en el mapa (null = el último)
  let anySel = null;
  const cacheAnys = {};
  function anysDe(i) {
    if (!i.t) return [];
    if (i.per) {
      if (!D.cj) return [];
      if (!cacheAnys[i.id]) cacheAnys[i.id] = D.cj.per[i.per].filter((a) => D.municipios.filter((m) => { const v = i.t(m, a); return v != null && isFinite(v); }).length >= D.municipios.length * (i.cob || 0.3));
      return cacheAnys[i.id];
    }
    if (!cacheAnys[i.id]) {
      const tots = new Set(); D.municipios.forEach((m) => ["alquiler", "compraventas", "renta_persona", "renta_hogar", "gini", "renda_bruta", "renda_bruta_llar", "renda_mediana"].forEach((k) => Object.keys(m[k] || {}).forEach((a) => tots.add(a))));
      if (i.tema === "tri") D.municipios.forEach((m) => Object.values(m.trib || {}).forEach((o) => Object.keys(o).forEach((a) => tots.add(a))));
      if (i.tema === "veh") D.municipios.forEach((m) => Object.values(m.veh || {}).forEach((o) => Object.keys(o).forEach((a) => tots.add(a))));
      cacheAnys[i.id] = [...tots].sort().filter((a) => D.municipios.filter((m) => { const v = i.t(m, a); return v != null && isFinite(v); }).length >= D.municipios.length * 0.3);
    }
    return cacheAnys[i.id];
  }
  const ambSerie = () => ind && ind.t && nivell === "mun" && anysDe(ind).length > 1;
  const anyActiu = () => (ambSerie() ? anySel || anysDe(ind)[anysDe(ind).length - 1] : null);
  function serieProv(i) {
    if (i.id === "lloguer" && D.provincia && D.provincia.alquiler) return D.provincia.alquiler;
    if (i.pv) { const r = {}; anysDe(i).forEach((a) => { const v = i.pv(a); if (v != null && isFinite(v)) r[a] = v; }); return r; }
    const res = {};
    anysDe(i).forEach((a) => {
      let s = 0, w = 0;
      D.municipios.forEach((m) => { const v = i.t(m, a); if (v != null && isFinite(v) && m.poblacion) { s += v * m.poblacion; w += m.poblacion; } });
      if (w) res[a] = s / w;
    });
    return res;
  }
  function serieMun(i, m) { const r = {}; anysDe(i).forEach((a) => { const v = i.t(m, a); if (v != null && isFinite(v)) r[a] = v; }); return r; }

  // Minigráfica: municipio (verde) frente a la provincia (gris)
  function minigrafic(series) {
    const W = 360, H = 84, mg = { t: 10, r: 6, b: 18, l: 6 };
    const anys = [...new Set(series.flatMap((x) => Object.keys(x.d)))].sort();
    const vals = series.flatMap((x) => Object.values(x.d));
    if (anys.length < 2 || !vals.length) return "";
    let mn = Math.min(...vals), mx = Math.max(...vals); const pad = (mx - mn) * 0.12 || 1; mn -= pad; mx += pad;
    const X = (a) => mg.l + ((anys.indexOf(a)) / (anys.length - 1)) * (W - mg.l - mg.r);
    const Y = (v) => mg.t + (1 - (v - mn) / (mx - mn)) * (H - mg.t - mg.b);
    const sel = anyActiu();
    let svg = `<svg viewBox="0 0 ${W} ${H}" class="mini" role="img">`;
    if (sel && anys.includes(sel)) svg += `<line x1="${X(sel)}" x2="${X(sel)}" y1="${mg.t - 6}" y2="${H - mg.b}" class="mini-sel"/>`;
    series.forEach((x) => {
      const pts = anys.filter((a) => x.d[a] != null).map((a) => `${X(a).toFixed(1)},${Y(x.d[a]).toFixed(1)}`);
      svg += `<polyline points="${pts.join(" ")}" class="mini-l ${x.cls}"/>`;
      const ult = anys.filter((a) => x.d[a] != null).pop();
      if (ult) svg += `<circle cx="${X(ult)}" cy="${Y(x.d[ult])}" r="3" class="mini-p ${x.cls}"/>`;
    });
    svg += `<text x="${mg.l}" y="${H - 4}" class="mini-a">${etPer(anys[0])}</text><text x="${W - mg.r}" y="${H - 4}" text-anchor="end" class="mini-a">${etPer(anys[anys.length - 1])}</text></svg>`;
    const lleg = series.map((x) => `<span class="${x.cls}"><i></i>${x.nom}</span>`).join("");
    return `<div class="mini-caixa"><p class="mini-tit">${t("evolucio")}</p>${svg}<div class="mini-lleg">${lleg}</div></div>`;
  }

  let reproduint = null;
  function controlAnys() {
    const el = document.getElementById("anys-ctl");
    if (ind.el && EL) return controlEl(el);
    el.classList.remove("el-ctl");
    if (!ambSerie()) { el.hidden = true; el.innerHTML = ""; return; }
    const anys = anysDe(ind), act = anyActiu(), idx = anys.indexOf(act);
    el.hidden = false;
    el.innerHTML = `<button type="button" class="play" aria-label="${reproduint ? t("atura") : t("reprodueix")}" title="${reproduint ? t("atura") : t("reprodueix")}">${reproduint ? "❚❚" : "▶"}</button>
      <input type="range" min="0" max="${anys.length - 1}" step="1" value="${idx}" aria-label="${t("any_ctl")}">
      <span class="any-act">${etPer(String(act))}</span>`;
    const r = el.querySelector("input");
    r.addEventListener("input", () => { para(); anySel = anys[+r.value]; pinta(); });
    el.querySelector(".play").addEventListener("click", () => {
      if (reproduint) { para(); controlAnys(); return; }
      let k = anys.indexOf(anyActiu()); if (k >= anys.length - 1) k = -1;
      reproduint = setInterval(() => {
        k++; anySel = anys[k]; pinta();
        if (k >= anys.length - 1) { para(); controlAnys(); }
      }, ind.per === "m" ? 200 : ind.per === "t" ? 450 : 900);
      controlAnys();
    });
  }
  // Selector de convocatoria: tipo de elección y año
  function controlEl(el) {
    const act = elInfo() || EL.conv[0];
    const tipus = ["A", "G", "M", "E"].filter((tp) => EL.conv.some((c) => c.t === tp));
    const nomT = (tp) => EL.conv.find((c) => c.t === tp).n[LANG].replace(/ \d{4}.*$/, "");
    const etAny = (c) => (c.t === "G" && c.any === 2019 ? `${c.data.slice(5, 7) === "04" ? (LANG === "es" ? "Abr" : "Abr") : "Nov"} 19` : String(c.any));
    el.hidden = false; el.classList.add("el-ctl");
    el.innerHTML = `<div class="el-fila" role="group" aria-label="${tel("tipus")}">${tipus.map((tp) => `<button type="button" data-t="${tp}" aria-pressed="${tp === act.t}">${nomT(tp)}</button>`).join("")}</div>
      <div class="el-fila el-anys" role="group" aria-label="${tel("any")}">${EL.conv.filter((c) => c.t === act.t).map((c) => `<button type="button" data-id="${c.id}" aria-pressed="${c.id === act.id}" title="${c.n[LANG]} · ${c.data.split("-").reverse().join("/")}">${etAny(c)}</button>`).join("")}</div>`;
    const canvia = async (id) => { await carregaConv(id); if (absent(ind)) ind = IND.find((i) => i.id === "el_guany"); omplirSelector(); pinta(); };
    el.querySelectorAll("[data-t]").forEach((b) => b.addEventListener("click", () => { const l = EL.conv.filter((c) => c.t === b.dataset.t); canvia(l[l.length - 1].id); }));
    el.querySelectorAll("[data-id]").forEach((b) => b.addEventListener("click", () => canvia(b.dataset.id)));
  }
  function para() { if (reproduint) { clearInterval(reproduint); reproduint = null; } }

  let hoverId = null, munPerIne = {}, valorsActuals = [], fixat = null;

  const disponible = (i, n) => (i.el ? n === "mun" || n === "sec" : n === "mun" ? !!i.v : n === "sec" ? !!i.s : !!i[n]);
  const zonaEl = (props) => { const d = elDades(); return !d ? null : nivell === "mun" ? d.mun[props.ine] : d.sec[props.cusec]; };
  // Una candidatura o bloque que no se presentó en la convocatoria elegida
  const absent = (i) => i.bloc && elInfo() && !elInfo().b.includes(i.bloc);

  // Cortes por cuantiles, redondeados a una cifra "limpia" para que la leyenda se lea bien
  function quantils(valors) {
    const v = valors.filter((x) => x != null && isFinite(x)).sort((a, b) => a - b);
    if (v.length < 2) return [];
    const k = RAMPA_CLAR.length;
    const crus = Array.from({ length: k - 1 }, (_, i) => v[Math.floor(((i + 1) / k) * (v.length - 1))]);
    // Paso de redondeo según la dispersión de los cortes (no del rango, que distorsionan los extremos)
    const rang = crus[crus.length - 1] - crus[0] || v[v.length - 1] - v[0];
    const pas = rang > 0 ? Math.pow(10, Math.floor(Math.log10(rang))) / 10 : 1;
    const res = [];
    for (let i = 1; i < k; i++) {
      const q = +(Math.round(crus[i - 1] / pas) * pas).toPrecision(12);
      if (q > v[0] && q <= v[v.length - 1] && !res.includes(q)) res.push(q);
    }
    return res;
  }
  const colorClasse = (c, n) => rampa()[Math.round((c * (rampa().length - 1)) / Math.max(1, n - 1))];
  const classe = (v) => { if (v == null || !isFinite(v)) return -1; let i = 0; while (i < llindars.length && v >= llindars[i]) i++; return i; };

  function valorDe(props) {
    if (ind.el) return absent(ind) ? null : ind.ez(zonaEl(props));
    if (nivell === "mun") { const m = munPerIne[props.ine]; return !m ? null : ambSerie() ? ind.t(m, anyActiu()) : ind.v(m); }
    if (esArea(nivell)) { const x = ZONA[nivell].d[props.id]; return x ? ind[nivell](x) : null; }
    const x = SEC[props.cusec]; return x ? ind.s(x) : null;
  }
  const codiSec = (p) => `${p.cusec.slice(5, 7)}-${p.cusec.slice(7)}`;
  const nomZona = (p) => {
    if (esArea(nivell)) return { nom: p.nom, lloc: t("area_" + nivell) };
    const m = munPerIne[p.ine], nom = m ? m.nom : p.ine;
    return nivell === "sec" ? { nom, lloc: `${t("seccio")} ${codiSec(p)}` } : { nom, lloc: m ? m.comarca : "" };
  };

  const geoNivell = () => (nivell === "mun" ? geoMun : nivell === "sec" ? geoSec : ZONA[nivell].geo);

  function pinta() {
    const geo = geoNivell();
    const valors = geo.features.map((f) => valorDe(f.properties));
    if (ind.cat) return pintaCat(geo, valors);
    // Con serie temporal, los cortes se fijan con todos los años para que se vea el cambio
    llindars = ambSerie() ? quantils(anysDe(ind).flatMap((a) => D.municipios.map((m) => ind.t(m, a)))) : quantils(valors);
    const n = llindars.length + 1;
    geo.features.forEach((f, i) => {
      const c = classe(valors[i]);
      f.properties.c = c < 0 ? sense() : colorClasse(c, n);
      f.properties.v = valors[i];
    });
    valorsActuals = geo.features.map((f, i) => ({ p: f.properties, v: valors[i] })).filter((x) => x.v != null && isFinite(x.v)).sort((a, b) => b.v - a.v);
    const src = mapa.getSource("zones");
    if (!src) return;
    src.setData(geo);
    mapa.setLayoutProperty("limits-mun", "visibility", nivell !== "mun" ? "visible" : "none");
    document.getElementById("ind-titol").textContent = nomInd(ind);
    document.getElementById("mapa-desc").textContent = ind.nota ? ind.nota[LANG] + (ind.el && nivell === "sec" ? " " + tel("seccions") : "") : !disponible(ind, "sec") && !esArea(nivell) ? t("nomes_mun") : "";
    controlAnys(); llegenda(); referencies(); ranquing(); info(fixat); capaCentres();
  }

  // CAP y hospitales: capa de puntos encima de los indicadores de salud (se puede ocultar)
  let promCentres = null, ambCentres = true;
  const CAPES_C = ["centres-cap", "centres-h"];
  function capaCentres() {
    const vis = ind && ind.tema === "sal" && !ind.cat;
    const ll = document.getElementById("llegenda-centres");
    if (ll) ll.hidden = !vis;
    if (vis && !promCentres) {
      promCentres = fetch("datos/centres.geojson").then((r) => r.json()).then((g) => {
        mapa.addSource("centres", { type: "geojson", data: g });
        const r = (a, b) => ["interpolate", ["linear"], ["zoom"], 7, a, 12, b];
        mapa.addLayer({ id: "centres-cap", type: "circle", source: "centres", filter: ["in", ["get", "t"], ["literal", ["cap", "continuada"]]],
          paint: { "circle-radius": r(2.2, 5), "circle-color": css("--tinta") || "#111", "circle-stroke-color": css("--paper") || "#fff", "circle-stroke-width": 1 } });
        mapa.addLayer({ id: "centres-h", type: "circle", source: "centres", filter: ["==", ["get", "t"], "hospital"],
          paint: { "circle-radius": r(4.5, 8), "circle-color": "#e3001b", "circle-stroke-color": css("--paper") || "#fff", "circle-stroke-width": 1.5 } });
        capaCentres();
      }).catch(() => {});
      return;
    }
    CAPES_C.forEach((l) => { if (mapa.getLayer(l)) mapa.setLayoutProperty(l, "visibility", vis && ambCentres ? "visible" : "none"); });
  }
  const NOM_TIPUS_C = { cap: ["CAP", "CAP"], continuada: ["Atenció continuada", "Atención continuada"], hospital: ["Hospital", "Hospital"] };
  function centreSota(e) {
    if (!ambCentres || !mapa.getLayer("centres-h") || mapa.getLayoutProperty("centres-h", "visibility") === "none") return null;
    return mapa.queryRenderedFeatures(e.point, { layers: CAPES_C })[0] || null;
  }

  // Indicadores por categorías (partido del alcalde): un color por bloque
  let recompte = [];
  const colCat = (v) => (ind.color ? ind.color(v) : colorBloc(v));
  function pintaCat(geo, valors) {
    geo.features.forEach((f, i) => { f.properties.c = valors[i] ? colCat(valors[i]) : sense(); f.properties.v = valors[i]; });
    valorsActuals = geo.features.map((f, i) => ({ p: f.properties, v: valors[i] })).filter((x) => x.v);
    const n = {}; valorsActuals.forEach((x) => { n[x.v] = (n[x.v] || 0) + 1; });
    recompte = Object.entries(n).sort((a, b) => b[1] - a[1]);
    mapa.getSource("zones").setData(geo);
    mapa.setLayoutProperty("limits-mun", "visibility", nivell !== "mun" ? "visible" : "none");
    document.getElementById("ind-titol").textContent = nomInd(ind);
    document.getElementById("mapa-desc").textContent = ind.nota ? ind.nota[LANG] + (ind.el && nivell === "sec" ? " " + tel("seccions") : "") : t("nomes_mun");
    const max = recompte.length ? recompte[0][1] : 1;
    document.getElementById("llegenda").innerHTML = `<div class="cat-llista">${recompte.map(([b, k]) =>
      `<div class="cat-fila"><i style="background:${colCat(b)}"></i><span class="cat-nom">${ind.c(b)}</span><span class="cat-barra"><b style="width:${(k / max) * 100}%;background:${colCat(b)}"></b></span><span class="cat-n">${k}</span></div>`).join("")}</div>${ind.notaCat ? `<p class="cat-nota">${ind.notaCat[LANG]}</p>` : ""}`;
    document.getElementById("ranquing").innerHTML = "";
    controlAnys(); referencies(); info(fixat);
  }

  function llegenda() {
    if (ind.cat) return;
    const el = document.getElementById("llegenda");
    if (!valorsActuals.length) { el.innerHTML = ""; return; }
    const n = llindars.length + 1;
    const mx = valorsActuals[0].v, mn = valorsActuals[valorsActuals.length - 1].v;
    let html = `<div class="escala">${Array.from({ length: n }, (_, i) => `<i style="background:${colorClasse(i, n)}"></i>`).join("")}</div>`;
    const ticks = [[0, ind.c(mn)], ...llindars.map((l, i) => [((i + 1) / n) * 100, ind.c(l)]), [100, ind.c(mx)]];
    // Si no cabe, se muestran solo los cortes alternos
    // Se descartan las etiquetas que se solaparían (ancho estimado por carácter)
    const ample = el.clientWidth || 280, w = (s) => String(s).length * 6.4;
    const mostra = [];
    ticks.forEach((tk, i) => {
      const x = (tk[0] / 100) * ample, ini = i === 0 ? x : i === ticks.length - 1 ? x - w(tk[1]) : x - w(tk[1]) / 2;
      while (mostra.length > 1 && i === ticks.length - 1 && mostra[mostra.length - 1].fi + 8 > ini) mostra.pop();
      if (!mostra.length || mostra[mostra.length - 1].fi + 8 <= ini) mostra.push({ tk, fi: ini + w(tk[1]), tr: i === 0 ? "none" : i === ticks.length - 1 ? "translateX(-100%)" : "translateX(-50%)" });
    });
    html += `<div class="ticks">${mostra.map(({ tk: [x, txt], tr }) => `<span style="left:${x}%;transform:${tr}">${txt}</span>`).join("")}</div>`;
    html += `<div class="nd" style="--sense:${sense()}"><i></i>${t("sense_dades")}</div>`;
    el.innerHTML = html;
  }

  // Comparación con la provincia, Cataluña y España
  function valorProvincia(i = ind) {
    if (i.el) { const d = elDades(); return d && d.prov && !i.cat && !absent(i) ? i.ez(d.prov) : null; }
    if (i.pv) { const u = anysDe(i).slice(-1)[0]; return u ? i.pv(u) : null; }
    const r = (D.ref || {})[i.id];
    if (r && r.gi != null) return r.gi;
    if (!i.v || i.cat || i.sumable === false) return null;
    let s = 0, w = 0;
    D.municipios.forEach((m) => { const v = i.v(m); if (v != null && isFinite(v) && m.poblacion) { s += v * m.poblacion; w += m.poblacion; } });
    return w ? s / w : null;
  }
  function referencies() {
    const el = document.getElementById("referencies");
    if (!el) return;
    const r = (ind.ref && !absent(ind) ? ind.ref() : (D.ref || {})[ind.id]) || {};
    const files = [[t("ref_gi"), valorProvincia(), "gi"], [t("ref_cat"), r.cat, "cat"], [t("ref_esp"), r.esp, "esp"]]
      .filter((x) => x[1] != null && isFinite(x[1]));
    const ult = anysDe(ind).slice(-1)[0];
    if (ind.cat || files.length < 2 || (ambSerie() && anyActiu() !== ult)) { el.innerHTML = ""; return; }
    const max = Math.max(...files.map((x) => Math.abs(x[1]))) || 1;
    el.innerHTML = `<h4>${t("ref_titol")}</h4>${files.map(([nom, v, k]) =>
      `<div class="ref-fila ref-${k}"><span class="ref-nom">${nom}</span><span class="ref-barra"><b style="width:${(Math.abs(v) / max) * 100}%"></b></span><span class="ref-v">${ind.f(v)}</span></div>`).join("")}${r.nota ? `<p class="ref-nota">${r.nota[LANG] || r.nota}</p>` : ""}`;
  }

  function ranquing() {
    if (ind.cat) return;
    const el = document.getElementById("ranquing");
    const fila = (x) => { const z = nomZona(x.p); return `<li data-ine="${x.p.ine}" title="${z.nom}"><span>${z.nom}${nivell === "sec" ? ` · ${codiSec(x.p)}` : ""}</span><span>${ind.c(x.v)}</span></li>`; };
    const nr = Math.min(5, Math.floor(valorsActuals.length / 2)), alts = valorsActuals.slice(0, nr), baixos = valorsActuals.slice(-nr).reverse();
    el.innerHTML = `<div><h4>${t("r_alts")}</h4><ol>${alts.map(fila).join("")}</ol></div><div><h4>${t("r_baixos")}</h4><ol>${baixos.map(fila).join("")}</ol></div>`;
    if (!esArea(nivell)) el.querySelectorAll("li").forEach((li) => li.addEventListener("click", () => obreFitxa(li.dataset.ine, true)));
  }

  function info(props) {
    const el = document.getElementById("info");
    const mini = (m) => (ind.t && !esArea(nivell) ? minigrafic([
      ...(m ? [{ nom: m.nom, cls: "s-mun", d: serieMun(ind, m) }] : []),
      { nom: t("prov_curt"), cls: "s-prov", d: serieProv(ind) },
    ]) : "");
    if (!props) { el.innerHTML = `<p class="pista">${t("pista")}</p>${mini(null)}`; return; }
    if (ind.el) return infoEl(el, props);
    const z = nomZona(props), v = valorDe(props);
    if (ind.cat && ind.infoCat) {
      const k = (recompte.find((x) => x[0] === v) || [0, 0])[1];
      el.innerHTML = `<p class="nom">${z.nom}</p><p class="lloc">${z.lloc}</p>
        <p class="gran"><i class="punt-bloc" style="background:${v ? colCat(v) : sense()}"></i>${v ? ind.c(v) : "–"}</p>
        ${ind.infoCat(munPerIne[props.ine], v, k)}
        <button type="button">${t("obrir_fitxa")} →</button>`;
      el.querySelector("button").addEventListener("click", () => obreFitxa(props.ine, true));
      return;
    }
    if (ind.cat) {
      const mm = munPerIne[props.ine], al = mm && mm.pol && mm.pol.alcalde;
      const k = (recompte.find((x) => x[0] === v) || [0, 0])[1];
      el.innerHTML = `<p class="nom">${z.nom}</p><p class="lloc">${z.lloc}</p>
        <p class="gran"><i class="punt-bloc" style="background:${colorBloc(v)}"></i>${v ? nomBloc(v) : "–"}</p>
        <p class="rel">${al ? `${al.nom} · ${al.partit}` : t("sense_dades")}</p>
        <p class="rel">${v ? t("n_alcaldies", k, nomBloc(v)) : ""}</p>
        <button type="button">${t("obrir_fitxa")} →</button>`;
      el.querySelector("button").addEventListener("click", () => obreFitxa(props.ine, true));
      return;
    }
    const pos = v == null ? -1 : valorsActuals.findIndex((x) => x.v <= v);
    const med = valorsActuals.length ? valorsActuals[Math.floor(valorsActuals.length / 2)].v : null;
    el.innerHTML = `<p class="nom">${z.nom}</p><p class="lloc">${z.lloc}</p>
      <p class="gran">${v == null ? "–" : ind.f(v)}</p>
      <p class="rel">${v == null ? t("sense_dades") : `${t("posicio", pos + 1, valorsActuals.length)} · ${t("mediana", ind.f(med))}`}</p>
      ${mini(munPerIne[props.ine])}
      ${esArea(nivell) ? (props.munis ? `<p class="rel munis">${props.munis}</p>` : "") : `<button type="button">${t("obrir_fitxa")} →</button>`}`;
    const b = el.querySelector("button"); if (b) b.addEventListener("click", () => obreFitxa(props.ine, true));
  }

  // Ficha de la zona en una elección: participación y resultados de cada candidatura
  function infoEl(el, props) {
    const z = nomZona(props), d = zonaEl(props), v = valorDe(props);
    if (!d) { el.innerHTML = `<p class="nom">${z.nom}</p><p class="lloc">${z.lloc}</p><p class="rel">${t("sense_dades")}</p>`; return; }
    const cs = elCands(d), vv = elValids(d), N = 7;
    const files = cs.slice(0, N), resta = cs.slice(N).reduce((s, c) => s + c.v, 0);
    const max = files.length ? files[0].v : 1;
    const fila = (s, b, n, tit) => `<li title="${tit || s}"><span class="sigla"><i style="background:${colorBloc(b)}"></i>${s}</span><span class="vbarra"><b style="width:${(n / max) * 100}%;background:${colorBloc(b)}"></b></span><span class="vpct">${pct((n / vv) * 100, 1)}</span></li>`;
    const gran = ind.cat ? `<i class="punt-bloc" style="background:${colorBloc(v)}"></i>${cs[0].s}` : v == null ? "–" : ind.f(v);
    const pos = !ind.cat && v != null ? valorsActuals.findIndex((x) => x.v <= v) : -1;
    el.innerHTML = `<p class="nom">${z.nom}</p><p class="lloc">${z.lloc}</p>
      <p class="gran${ind.cat ? " el-guany" : ""}">${gran}</p>
      <p class="rel">${absent(ind) ? tel("cap") : pos >= 0 ? t("posicio", pos + 1, valorsActuals.length) : `${cs[0].s === cs[0].b ? "" : nomBloc(cs[0].b) + " · "}${pct((cs[0].v / vv) * 100, 1)}`}</p>
      <p class="rel">${tel("participacio")} ${pct(elPart(d), 1)} · ${fmt(d[1])} ${tel("vots")} · ${tel("cens")} ${fmt(d[0])}</p>
      <ol class="vots el-vots">${files.map((c) => fila(c.s, c.b, c.v, c.nom)).join("")}${resta ? fila(tel("altres_c"), "Altres", resta) : ""}</ol>
      ${nivell === "mun" ? `<button type="button">${t("obrir_fitxa")} →</button>` : `<button type="button">${t("obrir_fitxa")}: ${z.nom} →</button>`}`;
    el.querySelector("button").addEventListener("click", () => obreFitxa(props.ine, true));
  }

  const normal = (s) => String(s).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  let consulta = "";

  function omplirSelector() {
    const cont = document.getElementById("indicadors");
    const q = normal(consulta.trim());
    const temes = TEMES.map((tm) => `<button type="button" class="tema" data-tema="${tm.id}" aria-pressed="${!q && tm.id === tema}">${tm[LANG]}</button>`).join("");
    const llista = q
      ? IND.filter((i) => normal([...i.ca, ...i.es].join(" ")).includes(q))
      : IND.filter((i) => i.tema === tema);
    const xips = llista.map((i) => {
      const ok = NIVELLS.some((n) => disponible(i, n)) && !absent(i);
      const pref = q ? `<span class="xip-tema">${TEMES.find((tm) => tm.id === i.tema)[LANG]}</span>` : "";
      return `<button type="button" class="xip" role="radio" data-id="${i.id}" aria-checked="${i.id === ind.id}" ${ok ? "" : "disabled"} title="${nomInd(i)}">${pref}${nomInd(i, true)}</button>`;
    }).join("");
    cont.innerHTML = `<div class="temes" role="group">${temes}</div><div class="xips-fila">${xips || `<p class="cap-ind">${t("cap_ind")}</p>`}</div>`;
    cont.querySelectorAll(".tema").forEach((b) => b.addEventListener("click", () => {
      tema = b.dataset.tema; consulta = ""; document.getElementById("cerca-ind").value = "";
      const prim = IND.find((i) => i.tema === tema && disponible(i, nivell)) || IND.find((i) => i.tema === tema);
      tria(prim);
    }));
    cont.querySelectorAll(".xip").forEach((b) => b.addEventListener("click", () => tria(IND.find((i) => i.id === b.dataset.id))));
    menuInd.etiqueta();
  }

  // ---------- Menú de indicadores junto al mapa ----------
  // Escritorio: columna fija a la izquierda del mapa. Tablet y móvil: barra fija sobre el mapa que abre una hoja inferior.
  const menuInd = (() => {
    const TXT = { ca: { canvia: "Canvia", tanca: "Fet", titol: "Tria un indicador" }, es: { canvia: "Cambia", tanca: "Hecho", titol: "Elige un indicador" } };
    const tx = (k) => (TXT[LANG] || TXT.ca)[k];
    const $ = (id) => document.getElementById(id);
    const btn = $("menu-ind-btn"), full = $("mapa-eines");
    if (!btn || !full) return { etiqueta() {} };
    const compacte = matchMedia("(max-width: 1099px)");
    const obert = () => btn.getAttribute("aria-expanded") === "true";
    function obre() {
      // Deja el mapa justo bajo la barra y la hoja ocupa el resto de la pantalla
      const cap = document.querySelector(".cap");
      const dalt = (cap && getComputedStyle(cap).position === "sticky" ? cap.offsetHeight : 0) + btn.offsetHeight;
      const caixa = document.querySelector(".mapa-caixa");
      const y = caixa.getBoundingClientRect().top + scrollY - dalt;
      window.scrollTo({ top: y, behavior: "instant" });
      const lliure = innerHeight - dalt - caixa.offsetHeight;
      full.style.setProperty("--alt-full", `${Math.round(Math.max(lliure, innerHeight * (innerWidth > 640 ? 0.36 : 0.42)))}px`);
      btn.setAttribute("aria-expanded", "true"); document.body.classList.add("menu-ind-obert");
    }
    function tanca() { btn.setAttribute("aria-expanded", "false"); document.body.classList.remove("menu-ind-obert"); }
    btn.addEventListener("click", () => (obert() ? tanca() : obre()));
    $("menu-ind-tanca").addEventListener("click", tanca);
    document.addEventListener("keydown", (e) => { if (e.key === "Escape" && obert()) { tanca(); btn.focus(); } });
    document.addEventListener("pointerdown", (e) => { if (obert() && !full.contains(e.target) && !btn.contains(e.target)) tanca(); });
    compacte.addEventListener("change", () => { if (!compacte.matches) tanca(); });
    // Altura de la cabecera fija, para que la barra del indicador quede justo debajo
    const cap = document.querySelector(".cap");
    const altCap = () => document.documentElement.style.setProperty("--cap-h", `${cap && getComputedStyle(cap).position === "sticky" ? cap.offsetHeight : 0}px`);
    if (cap) { new ResizeObserver(altCap).observe(cap); addEventListener("resize", altCap); altCap(); }
    return {
      etiqueta() {
        const tm = TEMES.find((x) => x.id === (ind && ind.tema));
        $("menu-ind-tema").textContent = tm ? tm[LANG] : "";
        $("menu-ind-nom").textContent = ind ? nomInd(ind, true) : "";
        $("menu-ind-canvia").textContent = tx("canvia");
        $("menu-ind-titol").textContent = tx("titol");
        $("menu-ind-tanca").textContent = tx("tanca");
      },
    };
  })();

  // Selecciona un indicador; si no existe al nivel actual, cambia de nivel
  async function tria(i) {
    if (i !== ind) { anySel = null; para(); }
    ind = i; tema = i.tema;
    if (!disponible(i, nivell)) { nivell = NIVELLS.find((n) => disponible(i, n)); fixat = null; }
    await carregaNivell(nivell);
    if (i.el) await carregaConv(elConv);
    omplirSelector(); botonsNivell(); pinta();
  }

  // Índice de convocatorias y resultados de cada una (bajo demanda)
  async function carregaConv(id) {
    if (!EL) EL = await fetch("datos/eleccions.json").then((r) => r.json());
    if (!id) { const a = EL.conv.filter((c) => c.t === "A"); id = (a.length ? a : EL.conv)[(a.length ? a : EL.conv).length - 1].id; }
    if (!EL_D[id]) {
      document.getElementById("mapa").classList.add("carregant");
      EL_D[id] = await fetch(`datos/eleccions/${id}.json`).then((r) => r.json());
      document.getElementById("mapa").classList.remove("carregant");
    }
    elConv = id;
  }

  function botonsNivell() {
    document.querySelectorAll(".segment button").forEach((b) => {
      b.setAttribute("aria-pressed", String(b.dataset.nivell === nivell));
      b.disabled = !disponible(ind, b.dataset.nivell);
      // Los niveles por áreas solo aparecen cuando el indicador existe a ese nivel
      const nomesArea = !disponible(ind, "mun") && !disponible(ind, "sec");
      b.hidden = b.disabled && (esArea(b.dataset.nivell) || nomesArea);
    });
  }

  let promSeccions = null;
  function carregaSeccions() {
    if (!promSeccions) {
      document.getElementById("mapa").classList.add("carregant");
      promSeccions = Promise.all([
        fetch("datos/seccions.geojson").then((r) => r.json()),
        fetch("datos/seccions.json").then((r) => r.json()),
      ]).then(([gs, sec]) => {
        geoSec = gs; SEC = sec;
        geoSec.features.forEach((f, i) => { f.id = i; });
        document.getElementById("mapa").classList.remove("carregant");
      });
    }
    return promSeccions;
  }

  const promZona = {};
  function carregaZona(n) {
    if (!promZona[n]) {
      document.getElementById("mapa").classList.add("carregant");
      promZona[n] = fetch(`datos/${n}.geojson`).then((r) => r.json()).then((g) => {
        g.features.forEach((f, i) => { f.id = i; });
        ZONA[n].geo = g; ZONA[n].d = (D.arees && D.arees[n]) || {};
        document.getElementById("mapa").classList.remove("carregant");
      });
    }
    return promZona[n];
  }
  const carregaNivell = (n) => (n === "sec" ? carregaSeccions() : esArea(n) ? carregaZona(n) : Promise.resolve());

  async function canviaNivell(n) {
    if (n === nivell || !disponible(ind, n)) return;
    await carregaNivell(n);
    nivell = n; fixat = null; omplirSelector(); botonsNivell(); pinta();
  }

  function tipHtml(props) {
    const z = nomZona(props), v = props.v;
    if (ind.el && ind.cat) { const d = zonaEl(props), c = elCands(d)[0]; return `<b>${z.nom}</b> <span class="t-sub">${z.lloc}</span><br>${c ? `<b>${c.s}</b> · ${pct((c.v / elValids(d)) * 100, 1)}` : t("sense_dades")}`; }
    return `<b>${z.nom}</b> <span class="t-sub">${z.lloc}</span><br>${v == null ? t("sense_dades") : `<b>${ind.f(v)}</b>`}`;
  }

  function caixa(coords) {
    let [x0, y0, x1, y1] = [180, 90, -180, -90];
    const recorre = (c) => (typeof c[0] === "number" ? (x0 = Math.min(x0, c[0]), y0 = Math.min(y0, c[1]), x1 = Math.max(x1, c[0]), y1 = Math.max(y1, c[1])) : c.forEach(recorre));
    recorre(coords);
    return [[x0, y0], [x1, y1]];
  }

  // Punto aproximado para el rótulo: centro de la caja del polígono más grande
  function centre(f) {
    const g = f.geometry;
    const pols = g.type === "Polygon" ? [g.coordinates] : g.coordinates;
    let millor = null, area = -1;
    pols.forEach((p) => { const [[a, b], [c, d]] = caixa(p); const ar = (c - a) * (d - b); if (ar > area) { area = ar; millor = [(a + c) / 2, (b + d) / 2]; } });
    return millor;
  }

  function encaixa(ine) {
    const f = geoMun.features.find((x) => x.properties.ine === ine);
    if (!f) return;
    mapa.fitBounds(caixa(f.geometry.coordinates), { padding: 60, maxZoom: nivell === "sec" ? 13.5 : 9.6, duration: 800 });
    mapa.getSource("seleccio").setData({ type: "FeatureCollection", features: [f] });
  }

  window.mapaMunicipi = async (ine) => {
    if (!mapa) return;
    if (!disponible(ind, "sec")) { ind = IND.find((i) => i.id === "renda"); tema = "ren"; }
    await carregaSeccions();
    nivell = "sec"; omplirSelector(); botonsNivell(); pinta();
    document.getElementById("s-mapa").scrollIntoView({ behavior: "smooth", block: "start" });
    setTimeout(() => encaixa(ine), 400);
  };

  // Buscador de municipios sobre el mapa
  function cercador() {
    const inp = document.getElementById("cerca-mapa"), ll = document.getElementById("cerca-mapa-llista");
    const caixaC = inp.closest(".cerca-mapa");
    let res = [], act = -1;
    const tanca = () => { ll.hidden = true; caixaC.setAttribute("aria-expanded", "false"); act = -1; };
    const pinta_ = () => {
      ll.innerHTML = res.map((m, i) => `<li role="option" id="cm-${i}" aria-selected="${i === act}" data-ine="${m.ine}"><b>${m.nom}</b><span>${m.comarca}</span></li>`).join("");
      ll.hidden = !res.length; caixaC.setAttribute("aria-expanded", String(!!res.length));
      if (act >= 0) inp.setAttribute("aria-activedescendant", `cm-${act}`); else inp.removeAttribute("aria-activedescendant");
      ll.querySelectorAll("li").forEach((li) => li.addEventListener("mousedown", (e) => { e.preventDefault(); tria_(li.dataset.ine); }));
    };
    const tria_ = (ine) => {
      const m = munPerIne[ine]; if (!m) return;
      inp.value = m.nom; tanca(); inp.blur();
      const f = geoMun.features.find((x) => x.properties.ine === ine);
      if (nivell === "mun" && f) { fixat = f.properties; info(fixat); }
      encaixa(ine);
    };
    inp.addEventListener("input", () => {
      const q = normal(inp.value.trim());
      res = !q ? [] : D.municipios.filter((m) => normal(m.nom).includes(q))
        .sort((a, b) => (normal(a.nom).startsWith(q) ? 0 : 1) - (normal(b.nom).startsWith(q) ? 0 : 1) || (b.poblacion || 0) - (a.poblacion || 0)).slice(0, 8);
      act = res.length ? 0 : -1; pinta_();
    });
    inp.addEventListener("keydown", (e) => {
      if (e.key === "ArrowDown" && res.length) { act = (act + 1) % res.length; pinta_(); e.preventDefault(); }
      else if (e.key === "ArrowUp" && res.length) { act = (act - 1 + res.length) % res.length; pinta_(); e.preventDefault(); }
      else if (e.key === "Enter" && act >= 0) { tria_(res[act].ine); e.preventDefault(); }
      else if (e.key === "Escape") tanca();
    });
    inp.addEventListener("blur", () => setTimeout(tanca, 100));
    const ci = document.getElementById("cerca-ind");
    ci.addEventListener("input", () => { consulta = ci.value; omplirSelector(); });
  }

  // ---------- Ficha completa del municipio: todos los indicadores, por temas ----------
  function dinsPoligon(pt, geom) {
    const [x, y] = pt;
    const anell = (r) => { let c = false; for (let i = 0, j = r.length - 1; i < r.length; j = i++) { const [xi, yi] = r[i], [xj, yj] = r[j]; if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c; } return c; };
    const pols = geom.type === "Polygon" ? [geom.coordinates] : geom.coordinates;
    return pols.some((p) => anell(p[0]) && !p.slice(1).some(anell));
  }
  async function areaDe(n, m) {
    await carregaZona(n);
    const f = geoMun.features.find((x) => x.properties.ine === m.ine);
    if (!f) return null;
    const pt = centre(f);
    const z = ZONA[n].geo.features.find((x) => dinsPoligon(pt, x.geometry));
    return z ? z.properties : null;
  }
  // Para el resumen de la ficha (resum.js)
  window.indMapa = { IND, valorProvincia, anysDe };
  window.fitxaIndicadors = async (m) => {
    if (!geoMun) return "";
    const [abs, abp] = await Promise.all([areaDe("abs", m), areaDe("abp", m)]);
    const pj = m.x && m.x.pj ? { id: m.x.pj, nom: m.x.pj_nom } : null, AR = D.arees || {};
    const valorM = (i) => {
      if (i.v) return i.v(m);
      if (i.abs && abs) return i.abs(ZONA.abs.d[abs.id]);
      if (i.abp && abp) return i.abp(ZONA.abp.d[abp.id]);
      if (i.pj && pj) return i.pj((AR.pj || {})[pj.id]);
      return null;
    };
    const cap = `<div class="fi-fila fi-cap"><span></span><span class="fi-strip-cap"></span><span>${m.nom}</span><span>${t("ref_gi_curt")}</span><span>${t("ref_cat")}</span><span>${t("ref_esp")}</span></div>`;
    const blocs = TEMES.map((tm) => {
      const files = IND.filter((i) => i.tema === tm.id && !i.cat && !i.el).map((i) => {
        const v = valorM(i);
        if (v == null || !isFinite(v)) return "";
        const r = (D.ref || {})[i.id] || {};
        const gi = valorProvincia(i), cat = r.cat, esp = r.esp;
        // Escala: todos los municipios (o áreas) y las referencias
        const zk = i.abs ? "abs" : i.abp ? "abp" : "pj";
        const tots = i.v ? D.municipios.map((x) => i.v(x)) : Object.values(AR[zk] || {}).map((x) => i[zk](x));
        const vs = tots.filter((x) => x != null && isFinite(x)).sort((a, b) => a - b);
        const mn = Math.min(vs[0], ...[gi, cat, esp].filter((x) => x != null)), mx = Math.max(vs[vs.length - 1], ...[gi, cat, esp].filter((x) => x != null));
        const X = (x) => (mx > mn ? 3 + ((x - mn) / (mx - mn)) * 94 : 50);
        const pos = vs.length - vs.filter((x) => x <= v).length + 1;
        const marca = (x, cls, tit) => (x != null && isFinite(x) ? `<i class="${cls}" style="left:${X(x).toFixed(1)}%" title="${tit}: ${i.f(x)}"></i>` : "");
        const area = !i.v ? `<span class="fi-area">${(i.abs ? abs : i.abp ? abp : pj).nom}</span>` : "";
        return `<div class="fi-fila"><span class="fi-nom">${nomInd(i, true)}<small>${i[LANG][1]}${area ? " · " : ""}${area}</small></span>
          <span class="fi-strip" aria-hidden="true"><b></b>${marca(esp, "m-esp", t("ref_esp"))}${marca(cat, "m-cat", t("ref_cat"))}${marca(gi, "m-gi", t("ref_gi"))}${marca(v, "m-mun", m.nom)}</span>
          <span class="fi-v">${i.f(v)}${i.v && !i.cat ? `<small>${t("posicio_curt", pos, vs.length)}</small>` : ""}</span>
          <span class="fi-r fi-gi">${gi != null ? i.f(gi) : "–"}</span><span class="fi-r">${cat != null ? i.f(cat) : "–"}</span><span class="fi-r">${esp != null ? i.f(esp) : "–"}</span></div>`;
      }).join("");
      const zones = tm.id === "eme" && m.x && m.x.aar ? `<p class="fi-zones">${t("area_aar")}: <b>${m.x.aar}</b> · ${t("reb_info", `<b>${m.x.reb}</b>`)}</p>` : "";
      return files ? `<section class="fi-tema"><h4>${tm[LANG]}</h4>${zones}${cap}${files}</section>` : "";
    }).join("");
    return `<div class="fi"><div class="fi-tit"><h3>${t("tots_ind")}</h3>
      <p class="fi-lleg"><span><i class="m-mun"></i>${m.nom}</span><span><i class="m-gi"></i>${t("ref_gi")}</span><span><i class="m-cat"></i>${t("ref_cat")}</span><span><i class="m-esp"></i>${t("ref_esp")}</span><span class="fi-nota">${t("fi_nota")}</span></p></div>${blocs}</div>`;
  };

  // Selecciona un indicador desde otra sección y lleva al mapa
  window.mapaIndicador = (id) => {
    const i = IND.find((x) => x.id === id);
    if (!i || !mapa) return;
    consulta = ""; const c = document.getElementById("cerca-ind"); if (c) c.value = "";
    tria(i);
    document.getElementById("s-mapa").scrollIntoView({ behavior: "smooth", block: "start" });
  };
  window.mapaIdioma = () => { if (!mapa) return; omplirSelector(); pinta(); };

  function colorsBase() {
    if (!mapa || !mapa.getLayer("zones-line")) return;
    mapa.setPaintProperty("fons", "background-color", css("--paper"));
    mapa.setPaintProperty("zones-line", "line-color", css("--paper"));
    mapa.setPaintProperty("limits-mun", "line-color", css("--tinta"));
    mapa.setPaintProperty("hover", "line-color", css("--tinta"));
    mapa.setPaintProperty("seleccio", "line-color", css("--accent"));
  }

  window.iniciaMapa = async () => {
    if (typeof maplibregl === "undefined") return;
    ind = IND.find((i) => i.id === "renda");
    D.municipios.forEach((m) => { munPerIne[m.ine] = m; });
    geoMun = await fetch("datos/municipis.geojson").then((r) => r.json());
    geoMun.features.forEach((f, i) => { f.id = i; });

    // Sin mapa base: solo el territorio, sobre el color del papel
    const estil = { version: 8, sources: {}, layers: [{ id: "fons", type: "background", paint: { "background-color": css("--paper") || "#fffefb" } }] };
    const estret = innerWidth < 640;
    const encaixaProv = () => mapa.fitBounds([[1.72, 41.64], [3.33, 42.5]], { padding: innerWidth < 640 ? { top: 56, bottom: 10, left: 10, right: 14 } : { top: 64, bottom: 24, left: 24, right: 24 }, duration: 0 });
    mapa = new maplibregl.Map({
      container: "mapa", style: estil, center: [2.6, 42.05], zoom: 8,
      minZoom: 6, maxZoom: 14, cooperativeGestures: matchMedia("(pointer: coarse)").matches,
      attributionControl: false, dragRotate: false, pitchWithRotate: false,
    });
    mapa.touchZoomRotate.disableRotation();
    mapa.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");

    mapa.on("load", () => {
      mapa.addSource("zones", { type: "geojson", data: geoMun });
      mapa.addSource("municipis", { type: "geojson", data: geoMun });
      mapa.addSource("seleccio", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
      mapa.addLayer({ id: "zones-fill", type: "fill", source: "zones", paint: { "fill-color": ["get", "c"] } });
      mapa.addLayer({ id: "zones-line", type: "line", source: "zones", paint: { "line-color": "#fffefb", "line-width": ["interpolate", ["linear"], ["zoom"], 7, 0.35, 12, 1.2] } });
      mapa.addLayer({ id: "limits-mun", type: "line", source: "municipis", layout: { visibility: "none" }, paint: { "line-color": "#13233f", "line-opacity": 0.55, "line-width": ["interpolate", ["linear"], ["zoom"], 7, 0.4, 12, 1.2] } });
      mapa.addLayer({ id: "hover", type: "line", source: "zones", paint: { "line-color": "#13233f", "line-width": ["case", ["boolean", ["feature-state", "hover"], false], 1.8, 0] } });
      mapa.addLayer({ id: "seleccio", type: "line", source: "seleccio", paint: { "line-color": "#c8553d", "line-width": 2.5 } });
      colorsBase();
      pinta();
      encaixaProv();
      // Si cambia el tamaño del contenedor (giro del móvil, barra lateral) y nadie ha movido el mapa, se vuelve a encuadrar
      let mogut = false;
      mapa.on("dragstart", () => { mogut = true; }); mapa.on("zoomstart", (e) => { if (e.originalEvent) mogut = true; });
      new ResizeObserver(() => { mapa.resize(); if (!mogut) encaixaProv(); }).observe(document.getElementById("mapa"));
      // Rótulos de las poblaciones principales, para orientarse sin mapa base
      (estret ? ROTULS_MOBIL : ROTULS).forEach((nom) => {
        const m = D.municipios.find((x) => x.nom === nom); if (!m) return;
        const f = geoMun.features.find((x) => x.properties.ine === m.ine); if (!f) return;
        const e = document.createElement("div"); e.className = "etiq-mapa"; e.textContent = nom;
        new maplibregl.Marker({ element: e }).setLngLat(centre(f)).addTo(mapa);
      });
    });

    const marca = (f) => {
      if (hoverId !== null) mapa.setFeatureState({ source: "zones", id: hoverId }, { hover: false });
      hoverId = f ? f.id : null;
      if (f) mapa.setFeatureState({ source: "zones", id: hoverId }, { hover: true });
    };
    mapa.on("mousemove", "zones-fill", (e) => {
      const c = centreSota(e);
      if (c) {
        const t_ = NOM_TIPUS_C[c.properties.t];
        mapa.getCanvas().style.cursor = "default";
        mostraTip(`<b>${c.properties.nom}</b><br>${t_ ? t_[LANG === "ca" ? 0 : 1] : ""} · ${c.properties.mun}`, e.originalEvent.clientX, e.originalEvent.clientY);
        return;
      }
      const f = e.features[0];
      marca(f);
      mapa.getCanvas().style.cursor = "pointer";
      mostraTip(tipHtml(f.properties), e.originalEvent.clientX, e.originalEvent.clientY);
      info(f.properties);
    });
    mapa.on("movestart", () => { if (matchMedia("(pointer: coarse)").matches) amagaTip(); });
    mapa.on("mouseleave", "zones-fill", () => { marca(null); mapa.getCanvas().style.cursor = ""; amagaTip(); info(fixat); });
    mapa.on("click", "zones-fill", (e) => {
      const f = e.features[0], p = f.properties;
      fixat = p; info(p); marca(f);
      const fm = esArea(nivell) ? ZONA[nivell].geo.features[f.id] : geoMun.features.find((x) => x.properties.ine === p.ine);
      if (fm) mapa.getSource("seleccio").setData({ type: "FeatureCollection", features: [fm] });
      if (matchMedia("(pointer: coarse)").matches) amagaTip();
    });

    document.querySelectorAll(".segment button").forEach((b) => b.addEventListener("click", () => canviaNivell(b.dataset.nivell)));
    const chk = document.getElementById("mostra-centres");
    if (chk) chk.addEventListener("change", () => { ambCentres = chk.checked; capaCentres(); });
    matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => { colorsBase(); pinta(); });
    let amplePrev = innerWidth;
    addEventListener("resize", () => { if (Math.abs(innerWidth - amplePrev) > 40) { amplePrev = innerWidth; llegenda(); } });
    omplirSelector(); botonsNivell(); cercador();
  };
})();
