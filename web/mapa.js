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
    ["llanc", ["Desnonaments", "Llançaments practicats per 10.000 habitants"], ["Desahucios", "Lanzamientos practicados por 10.000 habitantes"], { nota: { ca: "CGPJ, llançaments (desnonaments) practicats pels jutjats del partit judicial, per impagament de lloguer, execució hipotecària o altres causes. No inclou els que executen els serveis comuns, per això el total provincial és una mica inferior al de l'informe trimestral del CGPJ.", es: "CGPJ, lanzamientos (desahucios) practicados por los juzgados del partido judicial, por impago de alquiler, ejecución hipotecaria u otras causas. No incluye los que ejecutan los servicios comunes, por eso el total provincial es algo inferior al del informe trimestral del CGPJ." } }],
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
    { id: "tur", ca: "Turisme", es: "Turismo" },
    { id: "mob", ca: "Mobilitat", es: "Movilidad" },
    { id: "hab", ca: "Habitatge", es: "Vivienda" },
    { id: "ren", ca: "Renda", es: "Renta" },
    { id: "pob", ca: "Població", es: "Población" },
    { id: "edu", ca: "Educació", es: "Educación" },
    { id: "tre", ca: "Treball", es: "Trabajo" },
    { id: "com", ca: "Comerç", es: "Comercio" },
    { id: "sal", ca: "Salut", es: "Salud" },
    { id: "seg", ca: "Seguretat", es: "Seguridad" },
    { id: "jus", ca: "Justícia", es: "Justicia" },
    { id: "eme", ca: "Emergències", es: "Emergencias" },
    { id: "acc", ca: "Trànsit", es: "Tráfico" },
    { id: "cul", ca: "Cultura", es: "Cultura" },
    { id: "ter", ca: "Territori", es: "Territorio" },
    { id: "amb", ca: "Medi ambient", es: "Medio ambiente" },
    { id: "agr", ca: "Camp", es: "Campo" },
    { id: "veh", ca: "Vehicles", es: "Vehículos" },
    { id: "ajt", ca: "Ajuntaments", es: "Ayuntamientos" },
    { id: "dp", ca: "Diners públics", es: "Dinero público" },
    { id: "cad", ca: "Cadastre", es: "Catastro" },
    { id: "tri", ca: "Impostos locals", es: "Impuestos locales" },
    { id: "ene", ca: "Energia", es: "Energía" },
    { id: "urb", ca: "Ciutats (INE)", es: "Ciudades (INE)" },
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
  const trf12 = suma12(CJ("trf", "m")), trfV12 = suma12(CJ("trf_v", "m")), trf12P = suma12((_, a) => CJP("trf", "m")(a));
  const trf12Z = (z) => suma12((_, a) => CJP("trf", "m", z)(a));
  const NOTA_TRF = { ca: "DGT, microdades de transferències: canvis de titular de turismes segons el domicili del nou titular. Inclou els cotxes que compren els concessionaris i compravendes per revendre'ls, per això surten tan alts municipis com Fornells de la Selva o Vilamalla. Ganvam i Faconauto parteixen d'aquestes dades, però publiquen una xifra un 30 % més baixa perquè en descompten operacions que no són vendes al comprador final.", es: "DGT, microdatos de transferencias: cambios de titular de turismos según el domicilio del nuevo titular. Incluye los coches que compran concesionarios y compraventas para revenderlos, por eso salen tan altos municipios como Fornells de la Selva o Vilamalla. Ganvam y Faconauto parten de estos datos, pero publican una cifra un 30 % más baja porque descuentan operaciones que no son ventas al comprador final." };
  const NOTA_AFI = { ca: "Idescat a partir de la Seguretat Social: afiliacions al règim general i d'autònoms segons el municipi de residència. Mensual des del maig del 2020, trimestral abans.", es: "Idescat a partir de la Seguridad Social: afiliaciones al régimen general y de autónomos según el municipio de residencia. Mensual desde mayo de 2020, trimestral antes." };
  const aturP = CJP("atur", "m"), cvqP = CJP("cvq", "t"), cvq4 = suma4(cvq), cvq4P = suma4((_, a) => cvqP(a));
  const refCJ = (k, per, fn) => () => { const a = D.cj && D.cj.per[per].slice(-1)[0]; return a ? { cat: fn("cat", a), esp: fn("esp", a) } : {}; };
  const varZ = (k, per, n) => (z, a) => { const b = antPer(per, a, n), va = CJP(k, per, z)(a), vb = b ? CJP(k, per, z)(b) : null; return va != null && vb ? (va / vb - 1) * 100 : null; };
  // Por habitante (padrón) a partir de una serie de la coyuntura: municipio, provincia y Cataluña
  const perHab = (f, k) => (m, a) => { const v = f(m, a); return v != null && m.poblacion ? (v / m.poblacion) * k : null; };
  const perHabP = (c, k) => (a) => { const v = CJP(c, "m")(a); return v != null ? (v / sumaPob()) * k : null; };
  const perHabZ = (c, z, a, k) => (z === "cat" && D.cj.pob_cat && CJP(c, "m", "cat")(a) != null ? (CJP(c, "m", "cat")(a) / D.cj.pob_cat.pob) * k : null);
  const NOTA_SEPE = { ca: "SEPE, atur registrat el darrer dia del mes. Les xifres d'1 a 4 no es publiquen.", es: "SEPE, paro registrado el último día del mes. Las cifras de 1 a 4 no se publican." };
  const NOTA_CONTR = { ca: "SEPE, contractes registrats al mes al municipi del centre de treball.", es: "SEPE, contratos registrados en el mes en el municipio del centro de trabajo." };

  // Accidentes de tráfico: m.acc = {clave: {año: valor}}, D.acc_ref = {clave: {año: {gi, cat, esp}}}, D.anys.acc (SCT) y D.anys.accu (DGT)
  const AC = (k) => (m, a) => (a != null && m.acc && m.acc[k] && m.acc[k][a] != null ? m.acc[k][a] : null);
  const ACR = (k, z) => (a) => { const r = D.acc_ref && D.acc_ref[k] && D.acc_ref[k][a]; return r && r[z] != null ? r[z] : null; };
  const NOTA_SCT = { ca: "Servei Català de Trànsit: accidents amb algun mort o ferit greu, a la carretera i a la ciutat, segons el municipi on van passar. Els ferits lleus no hi són. Les taxes es calculen sobre la població resident: als municipis petits travessats per una carretera gran (l'AP-7, l'N-II) i a la costa a l'estiu surten molt altes. La mitjana de 5 anys d'un any inclou aquell any i els quatre anteriors. Mireu també les comarques.", es: "Servei Català de Trànsit: accidentes con algún muerto o herido grave, en carretera y en ciudad, según el municipio donde ocurrieron. Los heridos leves no están. Las tasas se calculan sobre la población residente: en los municipios pequeños atravesados por una carretera grande (la AP-7, la N-II) y en la costa en verano salen muy altas. La media de 5 años de un año incluye ese año y los cuatro anteriores. Mirad también las comarcas." };
  const NOTA_DGT = { ca: "DGT, dades municipals de sinistralitat: tots els accidents amb víctimes (també els ferits lleus) però només els de les vies urbanes, no els de la carretera. Taxa sobre la població resident.", es: "DGT, datos municipales de siniestralidad: todos los accidentes con víctimas (también los heridos leves) pero solo los de las vías urbanas, no los de carretera. Tasa sobre la población residente." };
  const ACC = [
    ["s_mfg_h5", "acc", ["Morts i ferits greus", "Morts i ferits greus en accidents per 10.000 habitants i any (mitjana de 5 anys)"], ["Muertos y heridos graves", "Muertos y heridos graves en accidentes por 10.000 habitantes y año (media de 5 años)"], NOTA_SCT, N1],
    ["s_mfg_h", "acc", ["Morts i ferits greus (un any)", "Morts i ferits greus en accidents de trànsit per 10.000 habitants"], ["Muertos y heridos graves (un año)", "Muertos y heridos graves en accidentes de tráfico por 10.000 habitantes"], NOTA_SCT, N1],
    ["s_n", "acc", ["Accidents greus", "Accidents de trànsit amb algun mort o ferit greu"], ["Accidentes graves", "Accidentes de tráfico con algún muerto o herido grave"], NOTA_SCT, { sumable: true, ...N0 }],
    ["s_morts", "acc", ["Morts a la carretera i la ciutat", "Persones mortes en accidents de trànsit"], ["Muertos en carretera y ciudad", "Personas muertas en accidentes de tráfico"], NOTA_SCT, { sumable: true, ...N0 }],
    ["s_mfg", "acc", ["Morts i ferits greus (total)", "Persones mortes o ferides greus en accidents de trànsit"], ["Muertos y heridos graves (total)", "Personas muertas o heridas graves en accidentes de tráfico"], NOTA_SCT, { sumable: true, ...N0 }],
    ["s_carr_p", "acc", ["Accidents greus a la carretera", "Accidents greus a la carretera, no a la zona urbana (%)"], ["Accidentes graves en carretera", "Accidentes graves en carretera, no en zona urbana (%)"], NOTA_SCT, { sumable: false, cob: 0.2, ...P0 }],
    ["s_moto_p", "acc", ["Accidents greus amb moto", "Accidents greus amb alguna moto o ciclomotor implicat (%)"], ["Accidentes graves con moto", "Accidentes graves con alguna moto o ciclomotor implicado (%)"], NOTA_SCT, { sumable: false, cob: 0.2, ...P0 }],
    ["s_vian_p", "acc", ["Atropellaments greus", "Accidents greus amb algun vianant implicat (%)"], ["Atropellos graves", "Accidentes graves con algún peatón implicado (%)"], NOTA_SCT, { sumable: false, cob: 0.2, ...P0 }],
    ["u_h", "accu", ["Accidents a la ciutat", "Accidents amb víctimes a les vies urbanes per 1.000 habitants"], ["Accidentes en la ciudad", "Accidentes con víctimas en las vías urbanas por 1.000 habitantes"], NOTA_DGT, N1],
    ["u_vic_h", "accu", ["Víctimes a la ciutat", "Morts i ferits (també lleus) a les vies urbanes per 1.000 habitants"], ["Víctimas en la ciudad", "Muertos y heridos (también leves) en las vías urbanas por 1.000 habitantes"], NOTA_DGT, N1],
    ["u_n", "accu", ["Accidents a la ciutat (total)", "Accidents amb víctimes a les vies urbanes"], ["Accidentes en la ciudad (total)", "Accidentes con víctimas en las vías urbanas"], NOTA_DGT, { sumable: true, ...N0 }],
    ["u_vian_h", "accu", ["Vianants atropellats", "Vianants morts o ferits a les vies urbanes per 10.000 habitants"], ["Peatones atropellados", "Peatones muertos o heridos en las vías urbanas por 10.000 habitantes"], NOTA_DGT, N1],
    ["u_bici_h", "accu", ["Ciclistes i patinets", "Ciclistes i usuaris de patinet morts o ferits a les vies urbanes per 10.000 habitants"], ["Ciclistas y patinetes", "Ciclistas y usuarios de patinete muertos o heridos en las vías urbanas por 10.000 habitantes"], NOTA_DGT, N1],
    ["u_moto_h", "accu", ["Motoristes ferits a la ciutat", "Motoristes morts o ferits a les vies urbanes per 10.000 habitants"], ["Motoristas heridos en la ciudad", "Motoristas muertos o heridos en las vías urbanas por 10.000 habitantes"], NOTA_DGT, N1],
  ];
  // Comarcas: el año elegido en el mapa solo se aplica a los municipios; las comarcas muestran el último
  const ACZ = (k, a) => (x) => { const o = x && x[k]; if (!o) return null; const y = D.anys && D.anys[a]; return y != null && o[y] != null ? o[y] : null; };

  // Cultura: m.cul = {clave: {año: valor}}, D.cul_ref = {clave: {año: {gi, cat}}}, D.anys.cul_bib/cul_eq/cul_prog/cul_ag, comarcas en D.arees.com[c]["cul_" + clave]
  const CU = (k) => (m, a) => (a != null && m.cul && m.cul[k] && m.cul[k][a] != null ? m.cul[k][a] : null);
  const CUR = (k, z) => (a) => { const r = D.cul_ref && D.cul_ref[k] && D.cul_ref[k][a]; return r && r[z] != null ? r[z] : null; };
  const CUZ = (k, a) => (x) => { const o = x && x["cul_" + k]; if (!o) return null; const y = D.anys && D.anys[a]; return y != null && o[y] != null ? o[y] : null; };
  const EUR1 = { f: (v) => `${fmt(v, 2)} €`, c: (v) => `${fmt(v, 0)} €` };
  const NOTA_BIB = { ca: "Departament de Cultura, estadístiques de les biblioteques públiques (DadesBib). Només hi surten els municipis amb biblioteca pública; els que només tenen el bibliobús, no. Les xifres per habitant són sobre la població del municipi, encara que la biblioteca també serveixi els pobles del voltant: mireu també les comarques.", es: "Departament de Cultura, estadísticas de las bibliotecas públicas (DadesBib). Solo salen los municipios con biblioteca pública; los que solo tienen el bibliobús, no. Las cifras por habitante son sobre la población del municipio, aunque la biblioteca también sirva a los pueblos de alrededor: mirad también las comarcas." };
  const NOTA_EQ = { ca: "Departament de Cultura, cens d'equipaments culturals de Catalunya: equipaments públics i privats inscrits al cens.", es: "Departament de Cultura, censo de equipamientos culturales de Cataluña: equipamientos públicos y privados inscritos en el censo." };
  const NOTA_ENT = { ca: "Departament de Cultura, cens d'entitats de cultura popular i associacions (gegants, corals, teatre amateur, diables, castells...). Només les entitats inscrites al cens.", es: "Departament de Cultura, censo de entidades de cultura popular y asociaciones (gigantes, corales, teatro aficionado, diablos, castells...). Solo las entidades inscritas en el censo." };
  const NOTA_ARX = { ca: "Departament de Cultura, directori d'arxius de Catalunya (municipals, comarcals, eclesiàstics, d'empresa...).", es: "Departament de Cultura, directorio de archivos de Cataluña (municipales, comarcales, eclesiásticos, de empresa...)." };
  const NOTA_LLIB = { ca: "Departament de Cultura, xarxa de llibreries acreditades (llibreries independents amb fons i activitat cultural reconeguts). No són totes les llibreries.", es: "Departament de Cultura, red de librerías acreditadas (librerías independientes con fondo y actividad cultural reconocidos). No son todas las librerías." };
  const NOTA_PROG = { ca: "Programa.cat: funcions professionals de teatre, música, circ i dansa que els ajuntaments contracten amb ajut del Departament de Cultura i de la Diputació, segons el municipi on es fan. No és tota la programació del municipi.", es: "Programa.cat: funciones profesionales de teatro, música, circo y danza que los ayuntamientos contratan con ayuda del Departament de Cultura y de la Diputació, según el municipio donde se hacen. No es toda la programación del municipio." };
  const NOTA_CPNL = { ca: "Consorci per a la Normalització Lingüística (CPNL): inscripcions als seus cursos de català segons el municipi de residència de l'alumne. Una persona que fa dos cursos l'any compta dues vegades. No inclou altres escoles d'idiomes. Dades des del 2011.", es: "Consorci per a la Normalització Lingüística (CPNL): inscripciones en sus cursos de catalán según el municipio de residencia del alumno. Una persona que hace dos cursos al año cuenta dos veces. No incluye otras escuelas de idiomas. Datos desde 2011." };
  const NOTA_AG = { ca: "Agenda cultural de Catalunya: activitats que els ajuntaments, els equipaments i les entitats hi publiquen, segons el municipi i l'any en què comencen. Depèn de qui hi publica: no és el total d'activitats.", es: "Agenda cultural de Cataluña: actividades que los ayuntamientos, los equipamientos y las entidades publican en ella, según el municipio y el año en que empiezan. Depende de quién publica: no es el total de actividades." };
  const BIBC = { cob: 0.1 };
  // Solo comarcas (Idescat, último año): x["cul_" + clave] = {año: valor}
  const CUL_DARRER = (o) => { if (!o) return null; const ks = Object.keys(o).sort(); return ks.length ? o[ks[ks.length - 1]] : null; };
  const CUC = (k) => (x) => CUL_DARRER(x && x["cul_" + k]);
  const CUCR = (k) => () => { const r = D.cul_ref && D.cul_ref[k]; const o = r ? CUL_DARRER(r) : null; return o || {}; };
  const NOTA_CULTE = { ca: "Generalitat, Direcció General d'Afers Religiosos: centres de culte actius (on s'hi fa culte almenys una vegada l'any) de cada municipi i confessió, des del 2020. Esglésies, ermites, santuaris, oratoris, mesquites, sales del Regne… Cada centre compta una vegada encara que hi facin culte diverses comunitats. Els centres catòlics depenen de la llista que revisa cada bisbat: el de Girona en dona 867 el 2020, 773 del 2021 al 2023 i 661 el 2024; la baixada no vol dir que s'hagin tancat tantes esglésies.", es: "Generalitat, Direcció General d'Afers Religiosos: centros de culto activos (donde se celebra culto al menos una vez al año) de cada municipio y confesión, desde 2020. Iglesias, ermitas, santuarios, oratorios, mezquitas, salones del Reino… Cada centro cuenta una vez aunque celebren culto varias comunidades. Los centros católicos dependen de la lista que revisa cada obispado: el de Girona da 867 en 2020, 773 de 2021 a 2023 y 661 en 2024; la bajada no significa que se hayan cerrado tantas iglesias." };
  const NOTA_CT_OSM = { ca: "OpenStreetMap: edificis i llocs de culte cartografiats (amenity=place_of_worship), situats a la seva secció censal. A la província són gairebé tots esglésies i ermites catòliques: les mesquites, les esglésies evangèliques i els altres llocs de culte de les confessions minoritàries gairebé no hi són. Per comptar totes les confessions, mireu els municipis.", es: "OpenStreetMap: edificios y lugares de culto cartografiados (amenity=place_of_worship), situados en su sección censal. En la provincia son casi todos iglesias y ermitas católicas: las mezquitas, las iglesias evangélicas y los demás lugares de culto de las confesiones minoritarias casi no están. Para contar todas las confesiones, mirad los municipios." };
  const NOTA_COMC = { ca: "Només per comarques: Idescat, Anuari estadístic de Catalunya (font: Departament de Cultura), darrer any publicat. Les xifres per habitant són sobre la població de la comarca. La Cerdanya i Osona no hi surten perquè només una part és de la província.", es: "Solo por comarcas: Idescat, Anuario estadístico de Cataluña (fuente: Departament de Cultura), último año publicado. Las cifras por habitante son sobre la población de la comarca. La Cerdanya y Osona no salen porque solo una parte es de la provincia." };
  const CULC = [
    ["c_esp_h", ["Anar al cinema", "Entrades de cinema venudes per habitant i any"], ["Ir al cine", "Entradas de cine vendidas por habitante y año"], N2],
    ["c_pant", ["Pantalles de cinema", "Pantalles de cinema"], ["Pantallas de cine", "Pantallas de cine"], N0],
    ["c_but_h", ["Butaques de cinema", "Butaques de cinema per 1.000 habitants"], ["Butacas de cine", "Butacas de cine por 1.000 habitantes"], N1],
    ["c_esp", ["Espectadors de cinema", "Entrades de cinema venudes"], ["Espectadores de cine", "Entradas de cine vendidas"], N0],
    ["m_vis_h", ["Visitants dels museus", "Visitants de museus i col·leccions per habitant"], ["Visitantes de los museos", "Visitantes de museos y colecciones por habitante"], N1],
    ["m_vis", ["Visitants dels museus (total)", "Visitants de museus i col·leccions"], ["Visitantes de los museos (total)", "Visitantes de museos y colecciones"], N0],
    ["m_n", ["Museus registrats", "Museus i col·leccions registrats (seus i subseus)"], ["Museos registrados", "Museos y colecciones registrados (sedes y subsedes)"], N0],
    ["r_fm", ["Ràdios FM", "Emissores de ràdio de freqüència modulada (privades i municipals)"], ["Radios FM", "Emisoras de radio de frecuencia modulada (privadas y municipales)"], N0],
  ];
  // Medi ambient: m.amb = {clave: {año: valor}}, D.anys.amb_seq/amb_terr/amb_aigua/amb_aire/amb_met; comarcas en D.arees.com[c]["amb_" + clave];
  // estaciones de calidad del aire (D.arees.aire) y meteorológicas (D.arees.met) como niveles propios del mapa
  const AM = (k) => (m, a) => (a != null && m.amb && m.amb[k] && m.amb[k][a] != null ? m.amb[k][a] : null);
  const AMZ = (k) => (x) => CUL_DARRER(x && x["amb_" + k]);
  const AMR = (k) => () => { const r = D.amb_ref && D.amb_ref["aigua_" + k]; const o = r ? CUL_DARRER(r) : null; return o || {}; };
  const NOTA_SEQ = { ca: "Agència Catalana de l'Aigua, estat de sequera hidrològica de la unitat d'explotació que abasteix cada municipi (historial de canvis des del 2021). Excepcionalitat i emergència porten restriccions de consum; l'últim any no és complet.", es: "Agència Catalana de l'Aigua, estado de sequía hidrológica de la unidad de explotación que abastece a cada municipio (historial de cambios desde 2021). Excepcionalidad y emergencia conllevan restricciones de consumo; el último año no está completo." };
  const NOTA_N2000 = { ca: "MITECO, cartografia de la Xarxa Natura 2000 (zones d'especial conservació i zones d'especial protecció per a les aus), creuada amb el terme municipal. Inclou la part terrestre.", es: "MITECO, cartografía de la Red Natura 2000 (zonas especiales de conservación y zonas de especial protección para las aves), cruzada con el término municipal. Incluye la parte terrestre." };
  const NOTA_ENP = { ca: "MITECO, espais naturals protegits (parcs naturals, reserves, paratges, espais del PEIN declarats…), creuats amb el terme municipal.", es: "MITECO, espacios naturales protegidos (parques naturales, reservas, parajes, espacios del PEIN declarados…), cruzados con el término municipal." };
  const NOTA_ZVN = { ca: "MITECO, zones vulnerables per contaminació de nitrats d'origen agrari (darrera designació publicada), creuades amb el terme municipal. A les zones vulnerables, la quantitat de fems i purins que es pot abocar als camps està limitada.", es: "MITECO, zonas vulnerables por contaminación de nitratos de origen agrario (última designación publicada), cruzadas con el término municipal. En las zonas vulnerables, la cantidad de estiércol y purines que se puede echar en los campos está limitada." };
  const NOTA_PL = { ca: "Departament de Territori, inventari de platges de Catalunya.", es: "Departament de Territori, inventario de playas de Cataluña." };
  const NOTA_AIGUA = { ca: "Agència Catalana de l'Aigua, consum d'aigua per comarques (xarxa d'abastament, sense pous propis). Litres per habitant i dia sobre la població resident: a les comarques turístiques, l'estiu l'infla. La Cerdanya i Osona no hi surten perquè només una part és de la província.", es: "Agència Catalana de l'Aigua, consumo de agua por comarcas (red de abastecimiento, sin pozos propios). Litros por habitante y día sobre la población residente: en las comarcas turísticas, el verano lo infla. La Cerdanya y Osona no salen porque solo una parte es de la provincia." };
  const NOTA_AIRE = { ca: "Generalitat, Xarxa de Vigilància i Previsió de la Contaminació Atmosfèrica (XVPCA): estacions automàtiques de la província, darrer any complet (75 % d'hores vàlides). Límit anual de la UE: 40 µg/m³ per al NO₂ i el PM10, 25 per al PM2,5; l'OMS recomana 10, 15 i 5.", es: "Generalitat, Red de Vigilancia y Previsión de la Contaminación Atmosférica (XVPCA): estaciones automáticas de la provincia, último año completo (75 % de horas válidas). Límite anual de la UE: 40 µg/m³ para el NO₂ y el PM10, 25 para el PM2,5; la OMS recomienda 10, 15 y 5." };
  const NOTA_MET = { ca: "Meteocat, Xarxa d'Estacions Meteorològiques Automàtiques (XEMA): estacions operatives de la província, darrer any complet. L'anomalia compara amb la mitjana dels anys complets anteriors de la mateixa estació (com a mínim 10).", es: "Meteocat, Red de Estaciones Meteorológicas Automáticas (XEMA): estaciones operativas de la provincia, último año completo. La anomalía compara con la media de los años completos anteriores de la misma estación (como mínimo 10)." };
  const UG = { f: (v) => `${fmt(v, 1)} µg/m³`, c: (v) => fmt(v, 0) };
  const GR = { f: (v) => `${fmt(v, 1)} °C`, c: (v) => fmt(v, 1) };
  const GRA = { f: (v) => `${v > 0 ? "+" : ""}${fmt(v, 1)} °C`, c: (v) => `${v > 0 ? "+" : ""}${fmt(v, 1)}` };
  const PCA = { f: (v) => `${v > 0 ? "+" : ""}${pct(v, 0)}`, c: (v) => `${v > 0 ? "+" : ""}${fmt(v, 0)}` };
  const AMB_MUN = [
    ["seq_exc", "amb_seq", ["Dies de sequera greu", "Dies en excepcionalitat o emergència per sequera"], ["Días de sequía grave", "Días en excepcionalidad o emergencia por sequía"], NOTA_SEQ, N0],
    ["seq_exc_tot", "amb_terr", ["Sequera greu des del 2021", "Dies en excepcionalitat o emergència per sequera des del 2021"], ["Sequía grave desde 2021", "Días en excepcionalidad o emergencia por sequía desde 2021"], NOTA_SEQ, N0],
    ["seq_alerta", "amb_seq", ["Dies en alerta per sequera", "Dies en alerta, excepcionalitat o emergència per sequera"], ["Días en alerta por sequía", "Días en alerta, excepcionalidad o emergencia por sequía"], NOTA_SEQ, N0],
    ["n2000_pct", "amb_terr", ["Xarxa Natura 2000", "Terme municipal dins la Xarxa Natura 2000 (%)"], ["Red Natura 2000", "Término municipal dentro de la Red Natura 2000 (%)"], NOTA_N2000, P0],
    ["enp_pct", "amb_terr", ["Espais naturals protegits", "Terme municipal dins d'espais naturals protegits (%)"], ["Espacios naturales protegidos", "Término municipal dentro de espacios naturales protegidos (%)"], NOTA_ENP, P0],
    ["zvn_pct", "amb_terr", ["Zona vulnerable per nitrats", "Terme municipal en zona vulnerable per nitrats (%)"], ["Zona vulnerable por nitratos", "Término municipal en zona vulnerable por nitratos (%)"], NOTA_ZVN, P0],
    ["platges", "amb_terr", ["Platges", "Platges del municipi"], ["Playas", "Playas del municipio"], NOTA_PL, { sumable: true, ...N0 }],
  ];
  const AMB_COM = [
    ["dom", ["Aigua a casa", "Consum domèstic d'aigua (litres per habitant i dia)"], ["Agua en casa", "Consumo doméstico de agua (litros por habitante y día)"], N0],
    ["tot", ["Consum d'aigua total", "Consum total d'aigua de la xarxa (litres per habitant i dia)"], ["Consumo de agua total", "Consumo total de agua de la red (litros por habitante y día)"], N0],
    ["act", ["Aigua de les activitats", "Consum d'aigua de les activitats econòmiques (litres per habitant i dia)"], ["Agua de las actividades", "Consumo de agua de las actividades económicas (litros por habitante y día)"], N0],
  ];
  const AMB_AIRE = [
    ["no2", ["Diòxid de nitrogen (NO₂)", "NO₂, mitjana anual (µg/m³)"], ["Dióxido de nitrógeno (NO₂)", "NO₂, media anual (µg/m³)"], UG],
    ["pm10", ["Partícules PM10", "PM10, mitjana anual (µg/m³)"], ["Partículas PM10", "PM10, media anual (µg/m³)"], UG],
    ["pm25", ["Partícules fines PM2,5", "PM2,5, mitjana anual (µg/m³)"], ["Partículas finas PM2,5", "PM2,5, media anual (µg/m³)"], UG],
    ["o3", ["Ozó (O₃)", "O₃, mitjana anual (µg/m³)"], ["Ozono (O₃)", "O₃, media anual (µg/m³)"], UG],
    ["o3d", ["Dies amb massa ozó", "Dies amb la mitjana de 8 hores d'ozó per sobre de 120 µg/m³"], ["Días con demasiado ozono", "Días con la media de 8 horas de ozono por encima de 120 µg/m³"], N0],
    ["pm10d", ["Dies amb massa partícules", "Dies amb la mitjana diària de PM10 per sobre de 50 µg/m³"], ["Días con demasiadas partículas", "Días con la media diaria de PM10 por encima de 50 µg/m³"], N0],
    ["so2", ["Diòxid de sofre (SO₂)", "SO₂, mitjana anual (µg/m³)"], ["Dióxido de azufre (SO₂)", "SO₂, media anual (µg/m³)"], UG],
  ];
  const AMB_MET = [
    ["t", ["Temperatura mitjana", "Temperatura mitjana de l'any (°C)"], ["Temperatura media", "Temperatura media del año (°C)"], GR],
    ["ta", ["Anomalia de temperatura", "Diferència amb la temperatura mitjana dels anys anteriors (°C)"], ["Anomalía de temperatura", "Diferencia con la temperatura media de los años anteriores (°C)"], GRA],
    ["tx", ["Temperatura màxima", "Mitjana de les màximes diàries (°C)"], ["Temperatura máxima", "Media de las máximas diarias (°C)"], GR],
    ["tn", ["Temperatura mínima", "Mitjana de les mínimes diàries (°C)"], ["Temperatura mínima", "Media de las mínimas diarias (°C)"], GR],
    ["dies30", ["Dies de calor", "Dies amb una màxima de 30 °C o més"], ["Días de calor", "Días con una máxima de 30 °C o más"], N0],
    ["dies35", ["Dies de calor extrema", "Dies amb una màxima de 35 °C o més"], ["Días de calor extremo", "Días con una máxima de 35 °C o más"], N0],
    ["nits20", ["Nits tropicals", "Nits amb una mínima de 20 °C o més"], ["Noches tropicales", "Noches con una mínima de 20 °C o más"], N0],
    ["glacades", ["Dies de glaçada", "Dies amb la mínima per sota de 0 °C"], ["Días de helada", "Días con la mínima por debajo de 0 °C"], N0],
    ["p", ["Pluja de l'any", "Precipitació acumulada a l'any (mm)"], ["Lluvia del año", "Precipitación acumulada en el año (mm)"], N0],
    ["pa", ["Anomalia de pluja", "Pluja de l'any davant la mitjana dels anys anteriors (%)"], ["Anomalía de lluvia", "Lluvia del año frente a la media de los años anteriores (%)"], PCA],
    ["pluja1", ["Dies de pluja", "Dies amb 1 mm de pluja o més"], ["Días de lluvia", "Días con 1 mm de lluvia o más"], N0],
  ];
  // Indicadores urbanos del INE: m.ua = {clave: {año: valor}}, D.ua.z.esp = España; solo los 10 municipios de más de 20.000 hab.
  const UAV = (k) => (m, a) => (a != null && m.ua && m.ua[k] && m.ua[k][a] != null ? m.ua[k][a] : null);
  const UAE = (k, a) => { const z = D.ua && D.ua.z && D.ua.z.esp && D.ua.z.esp[k]; return z && a != null && z[a] != null ? z[a] : null; };
  // Energia i connectivitat: m.en = {clave: {año: valor}}, D.anys.en_cert/en_rec/en_carb/en_cob; secciones en SEC[cusec]["en_cert_*"]; D.en_ref = medianas de carburantes
  const EN = (k) => (m, a) => (a != null && m.en && m.en[k] && m.en[k][a] != null ? m.en[k][a] : null);
  const NOTA_CERT = { ca: "Institut Català d'Energia (ICAEN), registre de certificats d'eficiència energètica d'edificis (des del 2016). Habitatges amb certificat, l'últim de cada referència cadastral; qualificació de consum d'energia primària no renovable. Només municipis amb 10 certificats o més i seccions amb 30 o més. Certifiquen sobretot els pisos que es venen o es lloguen.", es: "Institut Català d'Energia (ICAEN), registro de certificados de eficiencia energética de edificios (desde 2016). Viviendas con certificado, el último de cada referencia catastral; calificación de consumo de energía primaria no renovable. Solo municipios con 10 certificados o más y secciones con 30 o más. Se certifican sobre todo los pisos que se venden o se alquilan." };
  const NOTA_REC = { ca: "Generalitat, punts de recàrrega per a vehicles elèctrics (dades obertes). Ràpids: 50 kW o més. Taxa sobre la població resident.", es: "Generalitat, puntos de recarga para vehículos eléctricos (datos abiertos). Rápidos: 50 kW o más. Tasa sobre la población residente." };
  const NOTA_CARB = { ca: "Ministeri per a la Transició Ecològica, preus dels carburants a les estacions de servei. Mediana de les gasolineres del municipi el dia de la darrera descàrrega (setmanal). Referències: medianes de Catalunya i d'Espanya el mateix dia.", es: "Ministerio para la Transición Ecológica, precios de los carburantes en las estaciones de servicio. Mediana de las gasolineras del municipio el día de la última descarga (semanal). Referencias: medianas de Cataluña y de España el mismo día." };
  const NOTA_COB = { ca: "Ministeri per a la Transformació Digital, cobertura de banda ampla per municipi (juny de cada any; fins al 2020, desembre). Percentatge d'habitatges (fins al 2020, llars) amb cobertura. Des del 2022 les velocitats es mesuren «en condicions de màxima demanda».", es: "Ministerio para la Transformación Digital, cobertura de banda ancha por municipio (junio de cada año; hasta 2020, diciembre). Porcentaje de viviendas (hasta 2020, hogares) con cobertura. Desde 2022 las velocidades se miden «en condiciones de máxima demanda»." };
  const ENE = [
    ["cert_eg", "en_cert", ["Pisos poc eficients", "Habitatges certificats amb lletra E, F o G (%)"], ["Pisos poco eficientes", "Viviendas certificadas con letra E, F o G (%)"], NOTA_CERT, { s: S("en_cert_eg"), ...P0 }],
    ["cert_ab", "en_cert", ["Pisos eficients", "Habitatges certificats amb lletra A o B (%)"], ["Pisos eficientes", "Viviendas certificadas con letra A o B (%)"], NOTA_CERT, { s: S("en_cert_ab"), ...P1 }],
    ["cert_g", "en_cert", ["Pisos amb lletra G", "Habitatges certificats amb la pitjor lletra, la G (%)"], ["Pisos con letra G", "Viviendas certificadas con la peor letra, la G (%)"], NOTA_CERT, { s: S("en_cert_g"), ...P0 }],
    ["cert_kwh", "en_cert", ["Consum d'energia dels pisos", "Energia primària no renovable dels habitatges certificats (kWh/m² any)"], ["Consumo de energía de los pisos", "Energía primaria no renovable de las viviendas certificadas (kWh/m² año)"], NOTA_CERT, { s: S("en_cert_kwh"), ...N0 }],
    ["cert_n", "en_cert", ["Certificats energètics", "Habitatges amb certificat energètic per 1.000 habitants"], ["Certificados energéticos", "Viviendas con certificado energético por 1.000 habitantes"], NOTA_CERT, N0],
    ["rec_n", "en_rec", ["Punts de recàrrega", "Punts de recàrrega per a vehicles elèctrics"], ["Puntos de recarga", "Puntos de recarga para vehículos eléctricos"], NOTA_REC, { sumable: true, ...N0 }],
    ["rec_10k", "en_rec", ["Recàrrega per habitant", "Punts de recàrrega per 10.000 habitants"], ["Recarga por habitante", "Puntos de recarga por 10.000 habitantes"], NOTA_REC, N1],
    ["rec_rapid", "en_rec", ["Recàrrega ràpida", "Punts de recàrrega ràpida (50 kW o més)"], ["Recarga rápida", "Puntos de recarga rápida (50 kW o más)"], NOTA_REC, { sumable: true, ...N0 }],
    ["gas_n", "en_carb", ["Gasolineres", "Estacions de servei"], ["Gasolineras", "Estaciones de servicio"], NOTA_CARB, { sumable: true, ...N0 }],
    ["gas_g95", "en_carb", ["Preu de la gasolina", "Gasolina 95, preu mitjà a les gasolineres del municipi (€/litre)"], ["Precio de la gasolina", "Gasolina 95, precio medio en las gasolineras del municipio (€/litro)"], NOTA_CARB, { f: (v) => `${fmt(v, 3)} €`, c: (v) => `${fmt(v, 2)} €` }],
    ["gas_diesel", "en_carb", ["Preu del gasoil", "Gasoil A, preu mitjà a les gasolineres del municipi (€/litre)"], ["Precio del gasóleo", "Gasóleo A, precio medio en las gasolineras del municipio (€/litro)"], NOTA_CARB, { f: (v) => `${fmt(v, 3)} €`, c: (v) => `${fmt(v, 2)} €` }],
    ["cob_ftth", "en_cob", ["Fibra òptica", "Habitatges amb cobertura de fibra fins a casa, FTTH (%)"], ["Fibra óptica", "Viviendas con cobertura de fibra hasta casa, FTTH (%)"], NOTA_COB, P1],
    ["cob_1g", "en_cob", ["Internet d'1 Gbps", "Habitatges amb cobertura d'1 Gbps o més (%)"], ["Internet de 1 Gbps", "Viviendas con cobertura de 1 Gbps o más (%)"], NOTA_COB, P1],
    ["cob_100", "en_cob", ["Internet de 100 Mbps", "Habitatges amb cobertura de 100 Mbps o més (%)"], ["Internet de 100 Mbps", "Viviendas con cobertura de 100 Mbps o más (%)"], NOTA_COB, P1],
    ["cob_5g", "en_cob", ["Cobertura 5G", "Habitatges amb cobertura mòbil 5G (%)"], ["Cobertura 5G", "Viviendas con cobertura móvil 5G (%)"], NOTA_COB, P1],
  ];
  // Diners públics: m.dp = {clave: {año: valor}}, D.anys.dp_contr/dp_plat/dp_subv; comarcas en D.arees.com[c]["dp_" + clave]; D.dp_ref
  const DP = (k) => (m, a) => (a != null && m.dp && m.dp[k] && m.dp[k][a] != null ? m.dp[k][a] : null);
  const DPZ = (k) => (x) => CUL_DARRER(x && x["dp_" + k]);
  const DPR = (k) => (a) => { const r = D.dp_ref && D.dp_ref[k]; if (!r) return {}; const o = r[a] || CUL_DARRER(r); return o || {}; };
  const NOTA_DPC = { ca: "Registre públic de contractes de Catalunya: contractes adjudicats per cada ajuntament (no inclou les seves empreses ni organismes), per exercici. Dades completes, amb els contractes menors, des del 2023. Un sol contracte plurianual gran (una concessió) pot disparar l'import d'un any.", es: "Registre públic de contractes de Catalunya: contratos adjudicados por cada ayuntamiento (no incluye sus empresas ni organismos), por ejercicio. Datos completos, con los contratos menores, desde 2023. Un solo contrato plurianual grande (una concesión) puede disparar el importe de un año." };
  const NOTA_MENOR = { ca: "Registre públic de contractes. Contractes menors: fins a 15.000 € (serveis i subministraments) o 40.000 € (obres), sense concurrència obligatòria. Adjudicació directa: negociat sense publicitat, emergències i altres adjudicacions directes. Percentatge sobre l'import adjudicat per l'ajuntament.", es: "Registre públic de contractes. Contratos menores: hasta 15.000 € (servicios y suministros) o 40.000 € (obras), sin concurrencia obligatoria. Adjudicación directa: negociado sin publicidad, emergencias y otras adjudicaciones directas. Porcentaje sobre el importe adjudicado por el ayuntamiento." };
  const NOTA_PLAT = { ca: "Plataforma de serveis de contractació pública: contractes no menors de l'ajuntament i les seves empreses i organismes adjudicats des del 2023 amb les ofertes rebudes publicades. Només municipis amb 10 contractes o més.", es: "Plataforma de serveis de contractació pública: contratos no menores del ayuntamiento y sus empresas y organismos adjudicados desde 2023 con las ofertas recibidas publicadas. Solo municipios con 10 contratos o más." };
  const NOTA_SUBV = { ca: "Registre de subvencions i ajuts de Catalunya (RAISC): subvencions concedides per l'ajuntament, per any de concessió. Només hi surten els ajuntaments que les registren al RAISC (a Girona, uns 50 cada any); un municipi sense dada no vol dir que no en doni.", es: "Registro de subvenciones y ayudas de Cataluña (RAISC): subvenciones concedidas por el ayuntamiento, por año de concesión. Solo salen los ayuntamientos que las registran en el RAISC (en Girona, unos 50 cada año); un municipio sin dato no significa que no las dé." };
  const NOTA_SUBVC = { ca: "Registre de subvencions i ajuts de Catalunya (RAISC): import concedit a beneficiaris de cada comarca (la part gironina de la Cerdanya i Osona) per totes les administracions catalanes, per habitant. No inclou els ajuts de l'Estat ni de la UE gestionats directament. Últim any complet.", es: "Registro de subvenciones y ayudas de Cataluña (RAISC): importe concedido a beneficiarios de cada comarca (la parte gerundense de la Cerdanya y Osona) por todas las administraciones catalanas, por habitante. No incluye las ayudas del Estado ni de la UE gestionadas directamente. Último año completo." };
  const EUR0 = { f: (v) => `${fmt(v)} €`, c: (v) => `${fmt(v)} €` };
  const DPM = [
    ["contr_hab", "dp_contr", ["Contractes de l'ajuntament", "Import adjudicat per l'ajuntament per habitant (€)"], ["Contratos del ayuntamiento", "Importe adjudicado por el ayuntamiento por habitante (€)"], NOTA_DPC, EUR0],
    ["menor", "dp_contr", ["Contractes menors", "Import adjudicat en contractes menors (% del total)"], ["Contratos menores", "Importe adjudicado en contratos menores (% del total)"], NOTA_MENOR, P0],
    ["directe", "dp_contr", ["Adjudicació directa", "Import adjudicat sense concurrència: negociat sense publicitat i emergències (%)"], ["Adjudicación directa", "Importe adjudicado sin concurrencia: negociado sin publicidad y emergencias (%)"], NOTA_MENOR, P1],
    ["1of", "dp_plat", ["Concursos amb una sola oferta", "Contractes no menors adjudicats amb una sola oferta, des del 2023 (%)"], ["Concursos con una sola oferta", "Contratos no menores adjudicados con una sola oferta, desde 2023 (%)"], NOTA_PLAT, P0],
    ["of", "dp_plat", ["Ofertes per concurs", "Ofertes rebudes de mitjana als contractes no menors, des del 2023"], ["Ofertas por concurso", "Ofertas recibidas de media en los contratos no menores, desde 2023"], NOTA_PLAT, N1],
    ["pime", "dp_plat", ["Contractes a pimes", "Import dels contractes no menors adjudicat a pimes, des del 2023 (%)"], ["Contratos a pymes", "Importe de los contratos no menores adjudicado a pymes, desde 2023 (%)"], NOTA_PLAT, P0],
    ["subv_hab", "dp_subv", ["Subvencions de l'ajuntament", "Subvencions concedides per l'ajuntament per habitant (€)"], ["Subvenciones del ayuntamiento", "Subvenciones concedidas por el ayuntamiento por habitante (€)"], NOTA_SUBV, { f: (v) => `${fmt(v, 1)} €`, c: (v) => `${fmt(v)} €` }],
  ];
  const DPC = [
    ["subv", ["Subvencions rebudes", "Subvencions i ajuts rebuts a la comarca per habitant (€)"], ["Subvenciones recibidas", "Subvenciones y ayudas recibidas en la comarca por habitante (€)"]],
    ["subv_gen", ["Subvencions de la Generalitat", "Subvencions de la Generalitat rebudes a la comarca per habitant (€)"], ["Subvenciones de la Generalitat", "Subvenciones de la Generalitat recibidas en la comarca por habitante (€)"]],
    ["subv_dip", ["Subvencions de la Diputació", "Subvencions de la Diputació de Girona rebudes a la comarca per habitant (€)"], ["Subvenciones de la Diputación", "Subvenciones de la Diputació de Girona recibidas en la comarca por habitante (€)"]],
    ["subv_soc", ["Ajuts socials", "Subvencions de serveis socials i promoció social per habitant (€)"], ["Ayudas sociales", "Subvenciones de servicios sociales y promoción social por habitante (€)"]],
  ];
  const CUL = [
    ["b_prest_h", "cul_bib", ["Préstecs de biblioteca", "Préstecs de les biblioteques públiques per habitant"], ["Préstamos de biblioteca", "Préstamos de las bibliotecas públicas por habitante"], NOTA_BIB, { ...BIBC, ...N2 }],
    ["b_vis_h", "cul_bib", ["Visites a la biblioteca", "Visites a les biblioteques públiques per habitant"], ["Visitas a la biblioteca", "Visitas a las bibliotecas públicas por habitante"], NOTA_BIB, { ...BIBC, ...N2 }],
    ["b_carn_p", "cul_bib", ["Carnet de biblioteca", "Persones amb carnet de biblioteca (% de la població)"], ["Carné de biblioteca", "Personas con carné de biblioteca (% de la población)"], NOTA_BIB, { ...BIBC, ...P0 }],
    ["b_usu_p", "cul_bib", ["Usuaris actius", "Persones que s'han endut algun préstec durant l'any (% de la població)"], ["Usuarios activos", "Personas que se han llevado algún préstamo durante el año (% de la población)"], NOTA_BIB, { ...BIBC, ...P1 }],
    ["b_act_h", "cul_bib", ["Activitats a la biblioteca", "Assistents a activitats de les biblioteques per 1.000 habitants"], ["Actividades en la biblioteca", "Asistentes a actividades de las bibliotecas por 1.000 habitantes"], NOTA_BIB, { ...BIBC, ...N0 }],
    ["b_fons_h", "cul_bib", ["Llibres i documents", "Fons de les biblioteques públiques per habitant"], ["Libros y documentos", "Fondo de las bibliotecas públicas por habitante"], NOTA_BIB, { ...BIBC, ...N1 }],
    ["b_desp_h", "cul_bib", ["Despesa en biblioteques", "Despesa de funcionament de les biblioteques per habitant"], ["Gasto en bibliotecas", "Gasto de funcionamiento de las bibliotecas por habitante"], NOTA_BIB, { ...BIBC, ...EUR1 }],
    ["b_hores", "cul_bib", ["Hores d'obertura", "Hores d'obertura de les biblioteques a la setmana"], ["Horas de apertura", "Horas de apertura de las bibliotecas a la semana"], NOTA_BIB, { ...BIBC, sumable: true, ...N0 }],
    ["b_prest", "cul_bib", ["Préstecs (total)", "Préstecs de les biblioteques públiques"], ["Préstamos (total)", "Préstamos de las bibliotecas públicas"], NOTA_BIB, { ...BIBC, sumable: true, ...N0 }],
    ["b_vis", "cul_bib", ["Visites (total)", "Visites a les biblioteques públiques"], ["Visitas (total)", "Visitas a las bibliotecas públicas"], NOTA_BIB, { ...BIBC, sumable: true, ...N0 }],
    ["e_n_h", "cul_eq", ["Equipaments culturals", "Equipaments culturals per 10.000 habitants"], ["Equipamientos culturales", "Equipamientos culturales por 10.000 habitantes"], NOTA_EQ, N1],
    ["e_but_h", "cul_eq", ["Butaques de teatre i auditori", "Places dels espais escènics i musicals per 1.000 habitants"], ["Butacas de teatro y auditorio", "Plazas de los espacios escénicos y musicales por 1.000 habitantes"], NOTA_EQ, N0],
    ["e_esc", "cul_eq", ["Espais escènics i musicals", "Teatres, auditoris i sales polivalents"], ["Espacios escénicos y musicales", "Teatros, auditorios y salas polivalentes"], NOTA_EQ, { sumable: true, ...N0 }],
    ["e_teatres", "cul_eq", ["Teatres i auditoris", "Teatres i auditoris"], ["Teatros y auditorios", "Teatros y auditorios"], NOTA_EQ, { sumable: true, ...N0 }],
    ["e_mus", "cul_eq", ["Museus i col·leccions", "Museus, col·leccions i centres d'interpretació"], ["Museos y colecciones", "Museos, colecciones y centros de interpretación"], NOTA_EQ, { sumable: true, ...N0 }],
    ["e_civ", "cul_eq", ["Ateneus i centres cívics", "Ateneus, centres cívics i cases de cultura"], ["Ateneos y centros cívicos", "Ateneos, centros cívicos y casas de cultura"], NOTA_EQ, { sumable: true, ...N0 }],
    ["e_vis", "cul_eq", ["Sales d'exposicions", "Sales d'exposicions i centres d'arts visuals"], ["Salas de exposiciones", "Salas de exposiciones y centros de artes visuales"], NOTA_EQ, { sumable: true, ...N0 }],
    ["e_cin", "cul_eq", ["Cinemes", "Cinemes"], ["Cines", "Cines"], NOTA_EQ, { sumable: true, ...N0 }],
    ["e_n", "cul_eq", ["Equipaments culturals (total)", "Equipaments culturals al cens"], ["Equipamientos culturales (total)", "Equipamientos culturales en el censo"], NOTA_EQ, { sumable: true, ...N0 }],
    ["ent_n", "cul_eq", ["Entitats de cultura popular", "Entitats culturals inscrites al cens"], ["Entidades de cultura popular", "Entidades culturales inscritas en el censo"], NOTA_ENT, { sumable: true, ...N0 }],
    ["arx_n", "cul_eq", ["Arxius", "Arxius oberts a la consulta"], ["Archivos", "Archivos abiertos a la consulta"], NOTA_ARX, { sumable: true, ...N0 }],
    ["llib_n", "cul_eq", ["Llibreries acreditades", "Llibreries de la xarxa acreditada per la Generalitat"], ["Librerías acreditadas", "Librerías de la red acreditada por la Generalitat"], NOTA_LLIB, { sumable: true, ...N0 }],
    ["p_h", "cul_prog", ["Funcions de teatre i música", "Funcions professionals de Programa.cat per 10.000 habitants"], ["Funciones de teatro y música", "Funciones profesionales de Programa.cat por 10.000 habitantes"], NOTA_PROG, N1],
    ["p_n", "cul_prog", ["Funcions (total)", "Funcions professionals de teatre, música, circ i dansa de Programa.cat"], ["Funciones (total)", "Funciones profesionales de teatro, música, circo y danza de Programa.cat"], NOTA_PROG, { sumable: true, ...N0 }],
    ["cpnl_h", "cul_cpnl", ["Cursos de català", "Inscripcions als cursos de català del CPNL per 1.000 habitants"], ["Cursos de catalán", "Inscripciones en los cursos de catalán del CPNL por 1.000 habitantes"], NOTA_CPNL, N1],
    ["cpnl_n", "cul_cpnl", ["Cursos de català (total)", "Inscripcions als cursos de català del CPNL"], ["Cursos de catalán (total)", "Inscripciones en los cursos de catalán del CPNL"], NOTA_CPNL, { sumable: true, ...N0 }],
    ["ag_h", "cul_ag", ["Agenda cultural", "Activitats publicades a l'agenda cultural per 1.000 habitants"], ["Agenda cultural", "Actividades publicadas en la agenda cultural por 1.000 habitantes"], NOTA_AG, N1],
    ["ag_n", "cul_ag", ["Agenda cultural (total)", "Activitats publicades a l'agenda cultural"], ["Agenda cultural (total)", "Actividades publicadas en la agenda cultural"], NOTA_AG, { sumable: true, ...N0 }],
    ["ct_h", "cul_ct", ["Centres de culte", "Centres de culte per 10.000 habitants"], ["Centros de culto", "Centros de culto por 10.000 habitantes"], NOTA_CULTE, N1],
    ["ct_n", "cul_ct", ["Centres de culte (total)", "Centres de culte de totes les confessions"], ["Centros de culto (total)", "Centros de culto de todas las confesiones"], NOTA_CULTE, { sumable: true, ...N0 }],
    ["ct_cat", "cul_ct", ["Esglésies catòliques", "Centres de culte de l'Església catòlica"], ["Iglesias católicas", "Centros de culto de la Iglesia católica"], NOTA_CULTE, { sumable: true, ...N0 }],
    ["ct_ev", "cul_ct", ["Esglésies evangèliques", "Centres de culte evangèlics"], ["Iglesias evangélicas", "Centros de culto evangélicos"], NOTA_CULTE, { sumable: true, ...N0 }],
    ["ct_isl", "cul_ct", ["Mesquites i oratoris", "Centres de culte islàmics"], ["Mezquitas y oratorios", "Centros de culto islámicos"], NOTA_CULTE, { sumable: true, ...N0 }],
    ["ct_alt", "cul_ct", ["Altres confessions", "Centres de culte d'altres confessions (budistes, testimonis de Jehovà, ortodoxos, sikhs…)"], ["Otras confesiones", "Centros de culto de otras confesiones (budistas, testigos de Jehová, ortodoxos, sijs…)"], NOTA_CULTE, { sumable: true, ...N0 }],
    ["ct_nocat_p", "cul_ct", ["Culte no catòlic", "Centres de culte d'altres confessions que la catòlica (%)"], ["Culto no católico", "Centros de culto de confesiones distintas de la católica (%)"], NOTA_CULTE, { sumable: false, ...P0 }],
    ["ct_osm", "cul_osm", ["Esglésies i ermites al mapa", "Edificis religiosos cartografiats a OpenStreetMap"], ["Iglesias y ermitas en el mapa", "Edificios religiosos cartografiados en OpenStreetMap"], NOTA_CT_OSM, { sumable: true, s: S("cul_ct_osm"), ...N0 }],
  ];

  // Parque de vehículos (DGT, anual): m.veh = {clave: {año: valor}}, D.veh_ref = {clave: {año: {gi, cat, esp}}}
  const AT = (k) => (m, a) => (a != null && m.ats && m.ats[k] && m.ats[k][a] != null ? m.ats[k][a] : null);
  const ATR = (k, z) => (a) => { const r = D.ats_ref && D.ats_ref[k] && D.ats_ref[k][a]; return r && r[z] != null ? r[z] : null; };
  const VH = (k) => (m, a) => (a != null && m.veh && m.veh[k] && m.veh[k][a] != null ? m.veh[k][a] : null);
  const VHR = (k, z) => (a) => { const r = D.veh_ref && D.veh_ref[k] && D.veh_ref[k][a]; return r && r[z] != null ? r[z] : null; };
  // Turismo: m.tur = {clave: {año: valor}}, D.tur_ref = {clave: {año: {gi}}}, D.anys["tur_" + clave] = último año
  const TU = (k) => (m, a) => (a != null && m.tur && m.tur[k] && m.tur[k][a] != null ? m.tur[k][a] : null);
  const TUR = (k) => (a) => { const r = D.tur_ref && D.tur_ref[k] && D.tur_ref[k][a]; return r && r.gi != null ? r.gi : null; };
  const NT = {
    reg: { ca: "Registre de Turisme de Catalunya (establiments d'alta avui). Taxa sobre la població resident. Als pisos turístics antics sense places informades se'ls assigna la mitjana del municipi.", es: "Registre de Turisme de Catalunya (establecimientos de alta hoy). Tasa sobre la población residente. A los pisos turísticos antiguos sin plazas informadas se les asigna la media del municipio." },
    xifra: { ca: "Xifra, Diputació de Girona, a partir del Registre de Turisme de Catalunya (situació a final d'any).", es: "Xifra, Diputació de Girona, a partir del Registre de Turisme de Catalunya (situación a final de año)." },
    camp: { ca: "Places de càmping: Xifra (Diputació de Girona) fins al 2024 i Registre de Turisme de Catalunya avui. Taxa sobre la població resident.", es: "Plazas de camping: Xifra (Diputació de Girona) hasta 2024 y Registre de Turisme de Catalunya hoy. Tasa sobre la población residente." },
    mov: { ca: "INE, estadística experimental a partir de la posició dels telèfons mòbils: turistes que passen almenys una nit al municipi, sumats els dotze mesos de l'any (un turista que torna un altre mes compta dues vegades). Els d'altres províncies no inclouen els de la mateixa província de Girona.", es: "INE, estadística experimental a partir de la posición de los teléfonos móviles: turistas que pasan al menos una noche en el municipio, sumados los doce meses del año (un turista que vuelve otro mes cuenta dos veces). Los de otras provincias no incluyen los de la misma provincia de Girona." },
    ieet: { ca: "Agència Tributària de Catalunya: impost sobre les estades en establiments turístics (IEET) i recàrrec municipal, autoliquidacions dels dos semestres. Només els 21 municipis que publica la Generalitat.", es: "Agència Tributària de Catalunya: impuesto sobre las estancias en establecimientos turísticos (IEET) y recargo municipal, autoliquidaciones de los dos semestres. Solo los 21 municipios que publica la Generalitat." },
    vte: { ca: "INE, estadística experimental d'habitatges turístics a partir dels anuncis de les plataformes (Airbnb, Booking, Vrbo): darrera dada de cada any (agost fins al 2023, novembre des del 2024). Percentatge sobre el total d'habitatges del municipi.", es: "INE, estadística experimental de viviendas turísticas a partir de los anuncios de las plataformas (Airbnb, Booking, Vrbo): último dato de cada año (agosto hasta 2023, noviembre desde 2024). Porcentaje sobre el total de viviendas del municipio." },
    camping: { ca: "INE, Enquesta d'ocupació en càmpings: només els punts turístics que publica l'INE (Torroella, Castelló d'Empúries, Blanes, Sant Pere Pescador…).", es: "INE, Encuesta de ocupación en campings: solo los puntos turísticos que publica el INE (Torroella, Castelló d'Empúries, Blanes, Sant Pere Pescador…)." },
    punts: { ca: "INE, Enquesta d'ocupació hotelera: només els punts turístics que l'INE publica (Lloret, Girona, Roses, Platja d'Aro…).", es: "INE, Encuesta de ocupación hotelera: solo los puntos turísticos que publica el INE (Lloret, Girona, Roses, Platja d'Aro…)." },
  };
  // Movilidad: Enquesta de Mobilitat Quotidiana 2024-2025 (ATM Girona). m.mob = {clave: valor}, D.mob.ref = ámbito de la encuesta,
  // D.arees.com = comarcas. Solo municipios con al menos D.mob.min_n personas entrevistadas (la atracción no depende de la muestra).
  const MIN = { f: (v) => `${fmt(v)} min`, c: (v) => fmt(v) };
  const D2 = { f: (v) => fmt(v, 2), c: (v) => fmt(v, 2) };
  const NOTA_MOB = { ca: "ATM Àrea de Girona, Enquesta de Mobilitat Quotidiana 2024-2025: 13.894 entrevistes (novembre del 2024 a l'abril del 2025) a residents de 4 anys o més de l'Alt Empordà, el Baix Empordà, la Garrotxa, el Gironès, el Pla de l'Estany, el Ripollès i la Selva (la Cerdanya no hi és). Dia feiner, segons el municipi de residència. Els municipis amb menys de 30 persones entrevistades no tenen dada: mireu-ho per comarques. «Província» vol dir les set comarques.", es: "ATM Àrea de Girona, Encuesta de Movilidad Cotidiana 2024-2025: 13.894 entrevistas (noviembre de 2024 a abril de 2025) a residentes de 4 años o más del Alt Empordà, el Baix Empordà, la Garrotxa, el Gironès, el Pla de l'Estany, el Ripollès y la Selva (la Cerdanya no está). Día laborable, según el municipio de residencia. Los municipios con menos de 30 personas entrevistadas no tienen dato: miradlo por comarcas. «Provincia» quiere decir las siete comarcas." };
  const NOTA_ATRAU = { ca: "ATM Àrea de Girona, Enquesta de Mobilitat Quotidiana 2024-2025: desplaçaments en dia feiner que acaben al municipi i comencen en un altre, fets per residents de les set comarques de l'enquesta, dividits per la població del municipi. Mesura com n'és de pol d'atracció (feina, comerç, escoles, serveis).", es: "ATM Àrea de Girona, Encuesta de Movilidad Cotidiana 2024-2025: desplazamientos en día laborable que terminan en el municipio y empiezan en otro, hechos por residentes de las siete comarcas de la encuesta, divididos por la población del municipio. Mide cuánto atrae (trabajo, comercio, escuelas, servicios)." };
  const MOB = [
    ["dpp", ["Desplaçaments per persona", "Desplaçaments per persona en un dia feiner"], ["Desplazamientos por persona", "Desplazamientos por persona en un día laborable"], D2],
    ["mou", ["Gent que surt de casa", "Persones que es desplacen en un dia feiner (%)"], ["Gente que sale de casa", "Personas que se desplazan en un día laborable (%)"], P0],
    ["priv", ["Vehicle privat", "Desplaçaments en cotxe, moto o furgoneta (%)"], ["Vehículo privado", "Desplazamientos en coche, moto o furgoneta (%)"], P0],
    ["pub", ["Transport públic", "Desplaçaments en autobús, tren o taxi (%)"], ["Transporte público", "Desplazamientos en autobús, tren o taxi (%)"], P1],
    ["act", ["A peu o en bici", "Desplaçaments a peu, en bicicleta o en patinet (%)"], ["A pie o en bici", "Desplazamientos a pie, en bicicleta o en patinete (%)"], P0],
    ["cotxe", ["Cotxe", "Desplaçaments en cotxe, conduint o d'acompanyant (%)"], ["Coche", "Desplazamientos en coche, conduciendo o de acompañante (%)"], P0],
    ["peu", ["A peu", "Desplaçaments caminant (%)"], ["A pie", "Desplazamientos caminando (%)"], P0],
    ["bici", ["Bici i patinet", "Desplaçaments en bicicleta o patinet (%)"], ["Bici y patinete", "Desplazamientos en bicicleta o patinete (%)"], P1],
    ["bus", ["Autobús", "Desplaçaments en autobús urbà, interurbà, escolar o d'empresa (%)"], ["Autobús", "Desplazamientos en autobús urbano, interurbano, escolar o de empresa (%)"], P1],
    ["tren", ["Tren", "Desplaçaments en tren (Rodalies, regionals, AVE) o metro (%)"], ["Tren", "Desplazamientos en tren (Rodalies, regionales, AVE) o metro (%)"], P1],
    ["dur", ["Durada del desplaçament", "Durada mitjana d'un desplaçament (minuts)"], ["Duración del desplazamiento", "Duración media de un desplazamiento (minutos)"], MIN],
    ["intra", ["Sense sortir del poble", "Desplaçaments que comencen i acaben dins del municipi (%)"], ["Sin salir del pueblo", "Desplazamientos que empiezan y terminan dentro del municipio (%)"], P0],
    ["fora", ["Fora de la comarca", "Desplaçaments que surten de la comarca de residència (%)"], ["Fuera de la comarca", "Desplazamientos que salen de la comarca de residencia (%)"], P0],
    ["ocup", ["Per feina o estudis", "Desplaçaments per anar a treballar o a estudiar (% sense la tornada a casa)"], ["Por trabajo o estudios", "Desplazamientos para ir a trabajar o a estudiar (% sin la vuelta a casa)"], P0],
    ["atrau", ["Pol d'atracció", "Desplaçaments diaris que arriben d'altres municipis, per habitant"], ["Polo de atracción", "Desplazamientos diarios que llegan de otros municipios, por habitante"], N2],
    ["cs_dpp", ["Desplaçaments el cap de setmana", "Desplaçaments per persona en un dia de cap de setmana"], ["Desplazamientos el fin de semana", "Desplazamientos por persona en un día de fin de semana"], D2],
    ["cs_priv", ["Cotxe el cap de setmana", "Desplaçaments en vehicle privat el cap de setmana (%)"], ["Coche el fin de semana", "Desplazamientos en vehículo privado el fin de semana (%)"], P0],
    ["sense_veh", ["Sense cotxe ni moto", "Persones de llars sense cap cotxe ni moto (%)"], ["Sin coche ni moto", "Personas de hogares sin ningún coche ni moto (%)"], P0],
    ["sense_pl", ["Sense plaça d'aparcament", "Persones sense plaça d'aparcament a casa (%)"], ["Sin plaza de aparcamiento", "Personas sin plaza de aparcamiento en casa (%)"], P0],
    ["telet", ["Teletreball", "Persones que treballen i fan teletreball, almenys alguns dies (%)"], ["Teletrabajo", "Personas que trabajan y teletrabajan, al menos algunos días (%)"], P0],
  ];
  const MV = (k) => (m) => (m.mob && m.mob[k] != null ? m.mob[k] : null);
  const TURI = [
    ["pl_h", ["Places turístiques", "Places en allotjaments turístics per 100 habitants"], ["Plazas turísticas", "Plazas en alojamientos turísticos por 100 habitantes"], NT.reg, N1],
    ["pl_hotel_h", ["Places d'hotel", "Places d'hotel per 100 habitants"], ["Plazas de hotel", "Plazas de hotel por 100 habitantes"], NT.reg, N1],
    ["pl_camp_h", ["Places de càmping", "Places de càmping per 100 habitants"], ["Plazas de camping", "Plazas de camping por 100 habitantes"], NT.camp, N1],
    ["pl_hut_h", ["Places en pisos turístics", "Places en habitatges d'ús turístic per 100 habitants"], ["Plazas en pisos turísticos", "Plazas en viviendas de uso turístico por 100 habitantes"], NT.reg, N1],
    ["pl_rural_h", ["Places de turisme rural", "Places de turisme rural per 100 habitants"], ["Plazas de turismo rural", "Plazas de turismo rural por 100 habitantes"], NT.reg, N2],
    ["hut_viv", ["Pisos turístics per habitatge", "Habitatges d'ús turístic per 100 habitatges"], ["Pisos turísticos por vivienda", "Viviendas de uso turístico por 100 viviendas"], NT.xifra, N1],
    ["vte_pct", ["Pisos a les plataformes", "Habitatges turístics anunciats a Airbnb, Booking i Vrbo sobre el total d'habitatges (%)"], ["Pisos en las plataformas", "Viviendas turísticas anunciadas en Airbnb, Booking y Vrbo sobre el total de viviendas (%)"], NT.vte, { sumable: false, ...P1 }],
    ["vte_pl_h", ["Places a les plataformes", "Places en habitatges turístics anunciats per 100 habitants"], ["Plazas en las plataformas", "Plazas en viviendas turísticas anunciadas por 100 habitantes"], NT.vte, N1],
    ["hut_n", ["Pisos turístics", "Habitatges d'ús turístic registrats"], ["Pisos turísticos", "Viviendas de uso turístico registradas"], NT.xifra, N0],
    ["hotels", ["Hotels i hostals", "Hotels, hostals i pensions"], ["Hoteles y hostales", "Hoteles, hostales y pensiones"], NT.xifra, N0],
    ["rural_n", ["Cases de turisme rural", "Establiments de turisme rural"], ["Casas de turismo rural", "Establecimientos de turismo rural"], NT.xifra, N0],
    ["mov_rec_h", ["Turistes estrangers", "Turistes estrangers a l'any per habitant (telefonia mòbil)"], ["Turistas extranjeros", "Turistas extranjeros al año por habitante (telefonía móvil)"], NT.mov, N1],
    ["mov_int_h", ["Turistes d'altres províncies", "Turistes d'altres províncies a l'any per habitant (telefonia mòbil)"], ["Turistas de otras provincias", "Turistas de otras provincias al año por habitante (telefonía móvil)"], NT.mov, N1],
    ["mov_rec", ["Turistes estrangers (total)", "Turistes estrangers a l'any (telefonia mòbil)"], ["Turistas extranjeros (total)", "Turistas extranjeros al año (telefonía móvil)"], NT.mov, N0],
    ["mov_ext_p", ["Pes del turisme estranger", "Turistes estrangers sobre el total (%)"], ["Peso del turismo extranjero", "Turistas extranjeros sobre el total (%)"], NT.mov, { sumable: false, ...P0 }],
    ["mov_fr", ["Turistes francesos", "Francesos sobre els turistes estrangers (%)"], ["Turistas franceses", "Franceses sobre los turistas extranjeros (%)"], NT.mov, { sumable: false, ...P0 }],
    ["estiu_p", ["Estacionalitat", "Turistes del juliol i l'agost sobre els de tot l'any (%)"], ["Estacionalidad", "Turistas de julio y agosto sobre los de todo el año (%)"], NT.mov, { sumable: false, ...P0 }],
    ["ieet_h", ["Impost turístic", "Impost turístic recaptat per habitant (€/any)"], ["Impuesto turístico", "Impuesto turístico recaudado por habitante (€/año)"], NT.ieet, { cob: 0.05, ...EU }],
    ["pern_h", ["Nits d'hotel per habitant", "Pernoctacions hoteleres a l'any per habitant"], ["Noches de hotel por habitante", "Pernoctaciones hoteleras al año por habitante"], NT.punts, { cob: 0.02, ...N1 }],
    ["pern_camp_h", ["Nits de càmping per habitant", "Pernoctacions en càmpings a l'any per habitant"], ["Noches de camping por habitante", "Pernoctaciones en campings al año por habitante"], NT.camping, { cob: 0.02, ...N1 }],
    ["ocup_camp", ["Ocupació dels càmpings", "Grau d'ocupació per parcel·les, mitjana dels mesos oberts (%)"], ["Ocupación de los campings", "Grado de ocupación por parcelas, media de los meses abiertos (%)"], NT.camping, { cob: 0.02, sumable: false, ...P0 }],
    ["ocup", ["Ocupació hotelera", "Grau d'ocupació hotelera per places, mitjana de l'any (%)"], ["Ocupación hotelera", "Grado de ocupación hotelera por plazas, media del año (%)"], NT.punts, { cob: 0.02, sumable: false, ...P0 }],
    ["adr", ["Preu de l'hotel", "Tarifa mitjana diària per habitació, ADR (€)"], ["Precio del hotel", "Tarifa media diaria por habitación, ADR (€)"], NT.punts, { cob: 0.02, sumable: false, ...EU }],
    ["platges", ["Platges", "Platges i trams de costa catalogats"], ["Playas", "Playas y tramos de costa catalogados"], { ca: "Generalitat, catàleg de platges de Catalunya.", es: "Generalitat, catálogo de playas de Cataluña." }, N0],
  ];
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

  // Comercio (CECC, anual): m.com = {clave: {año: valor}}, D.com_ref = {clave: {año: {gi, cat}}}
  const CM = (k) => (m, a) => (a != null && m.com && m.com[k] && m.com[k][a] != null ? m.com[k][a] : null);
  const CMR = (k, z) => (a) => { const r = D.com_ref && D.com_ref[k] && D.com_ref[k][a]; return r && r[z] != null ? r[z] : null; };
  const NOTA_COM = { ca: "Cens d'establiments comercials de Catalunya (Generalitat i Cambres de Comerç): comerç al detall amb establiment, sense bars ni restaurants ni serveis. No hi ha cens del 2020 ni del 2022, i el desglossament per sectors dels municipis petits només existeix des del 2021.", es: "Censo de establecimientos comerciales de Cataluña (Generalitat y Cámaras de Comercio): comercio minorista con establecimiento, sin bares ni restaurantes ni servicios. No hay censo de 2020 ni de 2022, y el desglose por sectores de los municipios pequeños solo existe desde 2021." };
  const COM = [
    ["est_h", ["Comerços per habitant", "Establiments comercials per 1.000 habitants"], ["Comercios por habitante", "Establecimientos comerciales por 1.000 habitantes"], N1],
    ["n", ["Establiments comercials", "Comerços al detall amb establiment"], ["Establecimientos comerciales", "Comercios minoristas con establecimiento"], N0],
    ["sup_h", ["Superfície comercial", "Superfície de venda per habitant (m²)"], ["Superficie comercial", "Superficie de venta por habitante (m²)"], N2],
    ["sup_mitj", ["Mida de les botigues", "Superfície de venda mitjana per establiment (m²)"], ["Tamaño de las tiendas", "Superficie de venta media por establecimiento (m²)"], { sumable: false, ...N0 }],
    ["s_alim", ["Alimentació", "Botigues d'alimentació per 1.000 habitants"], ["Alimentación", "Tiendas de alimentación por 1.000 habitantes"], N2],
    ["s_qna", ["Farmàcies, drogueries i estancs", "Comerç quotidià no alimentari per 1.000 habitants"], ["Farmacias, droguerías y estancos", "Comercio cotidiano no alimentario por 1.000 habitantes"], N2],
    ["s_pers", ["Roba, calçat i complements", "Equipament de la persona per 1.000 habitants"], ["Ropa, calzado y complementos", "Equipamiento de la persona por 1.000 habitantes"], N2],
    ["s_llar", ["Equipament de la llar", "Mobles, electrodomèstics, ferreteria… per 1.000 habitants"], ["Equipamiento del hogar", "Muebles, electrodomésticos, ferretería… por 1.000 habitantes"], N2],
    ["s_lleure", ["Lleure i cultura", "Llibreries, esports, joguines… per 1.000 habitants"], ["Ocio y cultura", "Librerías, deportes, juguetes… por 1.000 habitantes"], N2],
    ["s_auto", ["Automoció i carburants", "Concessionaris, recanvis i benzineres per 1.000 habitants"], ["Automoción y carburantes", "Concesionarios, recambios y gasolineras por 1.000 habitantes"], N2],
    ["s_mixt", ["Supermercats i grans magatzems", "Comerç mixt per 1.000 habitants"], ["Supermercados y grandes almacenes", "Comercio mixto por 1.000 habitantes"], N2],
    ["p_quot", ["Pes del comerç quotidià", "Alimentació i quotidià no alimentari (% dels establiments)"], ["Peso del comercio cotidiano", "Alimentación y cotidiano no alimentario (% de los establecimientos)"], { sumable: false, ...P1 }],
  ];

  // Vivienda y urbanismo de la Generalitat: m.hb = {clave: {año: valor}}, m.hbf = {clave: valor}, D.hb_ref = {clave: {año: {gi, cat}}}
  const HB = (k) => (m, a) => (a != null && m.hb && m.hb[k] && m.hb[k][a] != null ? m.hb[k][a] : null);
  const HBR = (k, z) => (a) => { const r = D.hb_ref && D.hb_ref[k] && D.hb_ref[k][a]; return r && r[z] != null ? r[z] : null; };
  const NHB = {
    cons: { ca: "Departament de Territori, Habitatge i Transició Ecològica, a partir dels visats (iniciats) i els certificats de final d'obra (acabats) dels col·legis d'aparelladors. Sèrie anual des del 1990. La Generalitat no publica dades d'Espanya.", es: "Departament de Territori, Habitatge i Transició Ecològica, a partir de los visados (iniciadas) y los certificados de final de obra (acabadas) de los colegios de aparejadores. Serie anual desde 1990. La Generalitat no publica datos de España." },
    hpo: { ca: "Departament de Territori: habitatges amb protecció oficial acabats (qualificació definitiva) sobre el total d'habitatges acabats, en els cinc anys fins al triat. Només municipis amb 20 habitatges acabats o més en el període.", es: "Departament de Territori: viviendas con protección oficial acabadas (calificación definitiva) sobre el total de viviendas acabadas, en los cinco años hasta el elegido. Solo municipios con 20 viviendas acabadas o más en el periodo." },
    ced: { ca: "Departament de Territori, cèdules d'habitabilitat concedides per 1.000 habitatges (immobles residencials del Cadastre). Cal una cèdula per vendre, llogar o contractar subministraments, així que mesura el moviment del parc d'habitatges. A les seccions censals, mitjana anual del 2021 al 2025 (seccions amb 50 habitatges o més).", es: "Departament de Territori, cédulas de habitabilidad concedidas por 1.000 viviendas (inmuebles residenciales del Catastro). Hace falta una cédula para vender, alquilar o contratar suministros, así que mide el movimiento del parque de viviendas. En las secciones censales, media anual de 2021 a 2025 (secciones con 50 viviendas o más)." },
    m2: { ca: "Departament de Territori: superfície útil mitjana dels habitatges que han obtingut cèdula d'habitabilitat (útil, no construïda: sense parets). A les seccions, 2021-2025. Mínim de 10 cèdules.", es: "Departament de Territori: superficie útil media de las viviendas que han obtenido cédula de habitabilidad (útil, no construida: sin paredes). En las secciones, 2021-2025. Mínimo de 10 cédulas." },
    ihb: { ca: "Agència Tributària de Catalunya, impost sobre els habitatges buits: pisos buits més de dos anys sense causa justificada de persones jurídiques (bancs, fons, empreses) declarats a l'impost, no exempts, per 1.000 habitatges. No inclou els pisos buits de particulars.", es: "Agència Tributària de Catalunya, impuesto sobre las viviendas vacías: pisos vacíos más de dos años sin causa justificada de personas jurídicas (bancos, fondos, empresas) declarados al impuesto, no exentos, por 1.000 viviendas. No incluye los pisos vacíos de particulares." },
    plan: { ca: "Mapa urbanístic de Catalunya, sectors de desenvolupament residencials i mixtos (plans parcials i de millora urbana): habitatges que el planejament preveu i que encara no s'han construït, per 100 habitatges existents (Cadastre).", es: "Mapa urbanístico de Cataluña, sectores de desarrollo residenciales y mixtos (planes parciales y de mejora urbana): viviendas que el planeamiento prevé y que aún no se han construido, por 100 viviendas existentes (Catastro)." },
    urb: { ca: "Mapa urbanístic de Catalunya (Departament de Territori): classificació del sòl segons el planejament general vigent de cada municipi.", es: "Mapa urbanístico de Cataluña (Departament de Territori): clasificación del suelo según el planeamiento general vigente de cada municipio." },
    urb_s: { ca: "Mapa urbanístic de Catalunya (Departament de Territori): classificació del sòl segons el planejament general vigent. A les seccions censals, polígons del servei WFS del Mapa urbanístic creuats amb el seccionat de l'INE.", es: "Mapa urbanístico de Cataluña (Departament de Territori): clasificación del suelo según el planeamiento general vigente. En las secciones censales, polígonos del servicio WFS del Mapa urbanístico cruzados con el seccionado del INE." },
  };
  const HBI = [
    ["ini", ["Habitatges iniciats", "Habitatges iniciats per 1.000 habitants"], ["Viviendas iniciadas", "Viviendas iniciadas por 1.000 habitantes"], { nota: NHB.cons, ...N1 }],
    ["aca", ["Habitatges acabats", "Habitatges acabats per 1.000 habitants"], ["Viviendas acabadas", "Viviendas acabadas por 1.000 habitantes"], { any: "ini", nota: NHB.cons, ...N1 }],
    ["hpo", ["Habitatge protegit construït", "Habitatges protegits sobre el total d'acabats, últims 5 anys (%)"], ["Vivienda protegida construida", "Viviendas protegidas sobre el total de acabadas, últimos 5 años (%)"], { nota: NHB.hpo, ...P1 }],
    ["ced", ["Moviment d'habitatges", "Cèdules d'habitabilitat per 1.000 habitatges"], ["Movimiento de viviendas", "Cédulas de habitabilidad por 1.000 viviendas"], { s: S("hb_ced"), nota: NHB.ced, ...N1 }],
    ["m2", ["Superfície útil", "Superfície útil mitjana dels habitatges amb cèdula (m²)"], ["Superficie útil", "Superficie útil media de las viviendas con cédula (m²)"], { k: "ced_m2", any: "ced", s: S("hb_m2"), nota: NHB.m2, f: (v) => `${fmt(v)} m²`, c: (v) => fmt(v) }],
    ["ihb", ["Pisos buits de bancs i empreses", "Habitatges buits de persones jurídiques (impost) per 1.000 habitatges"], ["Pisos vacíos de bancos y empresas", "Viviendas vacías de personas jurídicas (impuesto) por 1.000 viviendas"], { nota: NHB.ihb, ...N2 }],
  ];
  const HBF = [
    ["pend_viv", ["Habitatges per construir", "Habitatges previstos pel planejament i no construïts, per 100 habitatges"], ["Viviendas por construir", "Viviendas previstas por el planeamiento y no construidas, por 100 viviendas"], { ref: () => { const p = (D.hb_ref && D.hb_ref.plan) || {}; return { gi: p.gi && p.gi.pend_viv, cat: p.cat && p.cat.pend_viv }; }, nota: NHB.plan, ...N1 }],
  ];
  const HBU = [
    ["su", ["Sòl urbà", "Sòl urbà (% de la superfície del municipi)"], ["Suelo urbano", "Suelo urbano (% de la superficie del municipio)"], { s: S("hb_su"), ...P1 }],
    ["surb", ["Sòl urbanitzable", "Sòl urbanitzable (% de la superfície del municipi)"], ["Suelo urbanizable", "Suelo urbanizable (% de la superficie del municipio)"], { s: S("hb_surb"), f: (v) => pct(v, 1), c: (v) => pct(v, 1) }],
    ["snu", ["Sòl no urbanitzable", "Sòl no urbanitzable (% de la superfície del municipi)"], ["Suelo no urbanizable", "Suelo no urbanizable (% de la superficie del municipio)"], { s: S("hb_snu"), ...P0 }],
    ["su_hab", ["Sòl urbà per habitant", "Sòl urbà per habitant (m²)"], ["Suelo urbano por habitante", "Suelo urbano por habitante (m²)"], { f: (v) => `${fmt(v)} m²`, c: (v) => fmt(v) }],
    ["snc", ["Sòl urbà per desenvolupar", "Sòl urbà no consolidat (% del sòl urbà)"], ["Suelo urbano por desarrollar", "Suelo urbano no consolidado (% del suelo urbano)"], P1],
    ["res_suc", ["Sòl urbà residencial", "Zones residencials (% del sòl urbà consolidat)"], ["Suelo urbano residencial", "Zonas residenciales (% del suelo urbano consolidado)"], P0],
  ];
  const NOM_ZMRT = { "ZMRT 1": ["Primera declaració (2024)", "Primera declaración (2024)"], "ZMRT 2": ["Segona declaració (2025)", "Segunda declaración (2025)"], no: ["No tensionada", "No tensionada"] };
  const COL_ZMRT = { "ZMRT 1": "#e3001b", "ZMRT 2": "#f08a8f", no: "#d5d9dd" };
  const NOM_PTSH = { "ADFA 1": ["Demanda forta i acreditada (1)", "Demanda fuerte y acreditada (1)"], "ADFA 2": ["Demanda forta i acreditada (2)", "Demanda fuerte y acreditada (2)"], Preferent: ["Preferent", "Preferente"], "No preferent": ["No preferent", "No preferente"], Rural: ["Rural", "Rural"] };
  const COL_PTSH = { "ADFA 1": "#00423f", "ADFA 2": "#2f8a82", Preferent: "#8fc7be", "No preferent": "#e4f2ef", Rural: "#d5d9dd" };

  // Cadastre (Direcció General del Cadastre, «Datos municipios»): m.cad = {clave: {año: valor}}
  const CV = (k) => (m, a) => (a != null && m.cad && m.cad[k] && m.cad[k][a] != null ? m.cad[k][a] : null);
  const DESOC = { ca: ["Sí, el 50 % (el màxim)", "Sí, menys del 50 %", "No en cobra"], es: ["Sí, el 50 % (el máximo)", "Sí, menos del 50 %", "No cobra"] };
  const CADK = (k) => (k === "vm2" || k === "sm2" ? "cad_vm2" : k.startsWith("ibi_") ? "cad_ibi" : "cad");
  const CADA = (k) => D.anys && D.anys[CADK(k)];
  const CVR = (k, z) => (a) => { const r = D.cad_ref && D.cad_ref[k] && D.cad_ref[k][a]; return r && r[z] != null ? r[z] : null; };
  const NOTA_CAD = { ca: "Direcció General del Cadastre (Ministeri d'Hisenda), estadístiques per municipi. L'any és el del padró cadastral a 1 de gener. El valor cadastral el fixa la ponència de valors i sol ser molt inferior al de mercat; als municipis amb la ponència antiga ho és encara més. Espanya, sense el País Basc ni Navarra (tenen cadastre propi).", es: "Dirección General del Catastro (Ministerio de Hacienda), estadísticas por municipio. El año es el del padrón catastral a 1 de enero. El valor catastral lo fija la ponencia de valores y suele ser muy inferior al de mercado; en los municipios con la ponencia antigua lo es todavía más. España, sin el País Vasco ni Navarra (tienen catastro propio)." };
  const NOTA_IBI = { ca: "Direcció General del Cadastre, informació economicofinancera de l'IBI: rebuts, bases i quotes de cada ajuntament. Quota líquida = el que es paga després de bonificacions. Espanya, sense el País Basc ni Navarra.", es: "Dirección General del Catastro, información económico-financiera del IBI: recibos, bases y cuotas de cada ayuntamiento. Cuota líquida = lo que se paga después de bonificaciones. España, sin el País Vasco ni Navarra." };
  const NOTA_CAD_U = { ca: "Direcció General del Cadastre. Immobles urbans segons l'ús principal que hi consta al Cadastre.", es: "Dirección General del Catastro. Inmuebles urbanos según el uso principal que consta en el Catastro." };
  const CAD = [
    ["vm", ["Valor cadastral mitjà", "Valor cadastral mitjà per immoble urbà (€)"], ["Valor catastral medio", "Valor catastral medio por inmueble urbano (€)"], EU],
    ["vviv", ["Valor cadastral de l'habitatge", "Valor cadastral mitjà dels immobles residencials (€)"], ["Valor catastral de la vivienda", "Valor catastral medio de los inmuebles residenciales (€)"], EU],
    ["vhab", ["Valor cadastral per habitant", "Valor cadastral urbà per habitant (€)"], ["Valor catastral por habitante", "Valor catastral urbano por habitante (€)"], EU],
    ["vm2", ["Valor cadastral per m²", "Valor cadastral mitjà de l'habitatge (€/m²)"], ["Valor catastral por m²", "Valor catastral medio de la vivienda (€/m²)"], { s: S("cad_vm2"), nota: { ca: "Direcció General del Cadastre, sèries per districte censal: valor cadastral mitjà per metre quadrat de l'habitatge col·lectiu i unifamiliar, ponderat pel nombre d'immobles. A la vista per seccions, cada secció mostra el valor del seu districte censal.", es: "Dirección General del Catastro, series por distrito censal: valor catastral medio por metro cuadrado de la vivienda colectiva y unifamiliar, ponderado por el número de inmuebles. En la vista por secciones, cada sección muestra el valor de su distrito censal." }, f: (v) => `${fmt(v)} €/m²`, c: (v) => fmt(v) }],
    ["sm2", ["Superfície de l'habitatge", "Superfície mitjana de l'habitatge (m²)"], ["Superficie de la vivienda", "Superficie media de la vivienda (m²)"], { s: S("cad_sm2"), nota: { ca: "Direcció General del Cadastre, sèries per districte censal: superfície construïda mitjana de l'habitatge col·lectiu i unifamiliar, ponderada pel nombre d'immobles. Inclou la part proporcional dels elements comuns. A la vista per seccions, cada secció mostra el valor del seu districte censal.", es: "Dirección General del Catastro, series por distrito censal: superficie construida media de la vivienda colectiva y unifamiliar, ponderada por el número de inmuebles. Incluye la parte proporcional de los elementos comunes. En la vista por secciones, cada sección muestra el valor de su distrito censal." }, f: (v) => `${fmt(v)} m²`, c: (v) => fmt(v) }],
    ["sol", ["Pes del sòl", "Valor del sòl sobre el valor cadastral urbà (%)"], ["Peso del suelo", "Valor del suelo sobre el valor catastral urbano (%)"], { sumable: false, ...P0 }],
    ["n", ["Immobles urbans", "Immobles urbans (béns immobles)"], ["Inmuebles urbanos", "Inmuebles urbanos (bienes inmuebles)"], N0],
    ["ih", ["Immobles per habitant", "Immobles urbans per 100 habitants"], ["Inmuebles por habitante", "Inmuebles urbanos por 100 habitantes"], N0],
    ["res", ["Immobles residencials", "Immobles d'ús residencial (% dels urbans)"], ["Inmuebles residenciales", "Inmuebles de uso residencial (% de los urbanos)"], { sumable: false, nota: NOTA_CAD_U, ...P0 }],
    ["alm", ["Places i trasters", "Magatzems i aparcaments (% dels immobles urbans)"], ["Plazas y trasteros", "Almacenes y aparcamientos (% de los inmuebles urbanos)"], { sumable: false, nota: NOTA_CAD_U, ...P0 }],
    ["com", ["Locals comercials", "Immobles d'ús comercial per 1.000 habitants"], ["Locales comerciales", "Inmuebles de uso comercial por 1.000 habitantes"], { nota: NOTA_CAD_U, ...N0 }],
    ["ind", ["Naus industrials", "Immobles d'ús industrial per 1.000 habitants"], ["Naves industriales", "Inmuebles de uso industrial por 1.000 habitantes"], { nota: NOTA_CAD_U, ...N0 }],
    ["ofi", ["Oficines", "Immobles d'oficines per 1.000 habitants"], ["Oficinas", "Inmuebles de oficinas por 1.000 habitantes"], { nota: NOTA_CAD_U, ...N1 }],
    ["hos", ["Hotels i restaurants (cadastre)", "Immobles d'ús hoteler i de restauració"], ["Hoteles y restaurantes (catastro)", "Inmuebles de uso hotelero y de restauración"], { nota: NOTA_CAD_U, ...N0 }],
    ["solar", ["Solars sense edificar", "Parcel·les urbanes sense edificar (% de les parcel·les)"], ["Solares sin edificar", "Parcelas urbanas sin edificar (% de las parcelas)"], { sumable: false, ...P1 }],
    ["suph", ["Sòl urbà per habitant", "Superfície de les parcel·les urbanes per habitant (m²)"], ["Suelo urbano por habitante", "Superficie de las parcelas urbanas por habitante (m²)"], N0],
    ["rha", ["Valor del sòl rústic", "Valor cadastral rústic per hectàrea (€)"], ["Valor del suelo rústico", "Valor catastral rústico por hectárea (€)"], { sumable: false, ...EU }],
    ["rpar", ["Mida de la finca rústica", "Superfície mitjana de la parcel·la rústica (ha)"], ["Tamaño de la finca rústica", "Superficie media de la parcela rústica (ha)"], { sumable: false, ...N2 }],
    ["ibi_rec", ["Rebut mitjà de l'IBI", "Quota líquida mitjana per rebut de l'IBI urbà (€)"], ["Recibo medio del IBI", "Cuota líquida media por recibo del IBI urbano (€)"], { tema: "tri", nota: NOTA_IBI, ...EU }],
    ["ibi_hab", ["IBI per habitant", "Quota líquida de l'IBI urbà per habitant (€)"], ["IBI por habitante", "Cuota líquida del IBI urbano por habitante (€)"], { tema: "tri", nota: NOTA_IBI, ...EU }],
    ["ibi_tot", ["Tot l'IBI per habitant", "Quota líquida de l'IBI urbà, rústic i d'equipaments especials per habitant (€)"], ["Todo el IBI por habitante", "Cuota líquida del IBI urbano, rústico y de equipamientos especiales por habitante (€)"], { tema: "tri", nota: NOTA_IBI, ...EU }],
    ["ibi_base", ["Base de l'IBI", "Base liquidable mitjana per rebut de l'IBI urbà (€)"], ["Base del IBI", "Base liquidable media por recibo del IBI urbano (€)"], { tema: "tri", nota: NOTA_IBI, ...EU }],
    ["ibi_bon", ["Bonificacions de l'IBI", "Bonificacions sobre la quota íntegra de l'IBI urbà (%)"], ["Bonificaciones del IBI", "Bonificaciones sobre la cuota íntegra del IBI urbano (%)"], { tema: "tri", nota: NOTA_IBI, ...P1 }],
    ["rev", ["Ponència de valors", "Any de l'última revisió cadastral (ponència de valors)"], ["Ponencia de valores", "Año de la última revisión catastral (ponencia de valores)"], { sumable: false, f: (v) => String(Math.round(v)), c: (v) => String(Math.round(v)) }],
  ];

  // Plaques solars d'autoconsum (RAC, Generalitat): m.sol = {clave: {año: valor}} acumulado a 31 de diciembre
  const SV = (k) => (m, a) => (a != null && m.sol && m.sol[k] && m.sol[k][a] != null ? m.sol[k][a] : null);
  const SVR = (k, z) => (a) => { const r = D.sol_ref && D.sol_ref[k] && D.sol_ref[k][a]; return r && r[z] != null ? r[z] : null; };
  const NOTA_SOL = { ca: "Registre d'autoconsum de Catalunya (RAC, Generalitat): instal·lacions fotovoltaiques inscrites, acumulades segons la data de posada en servei. No inclou les plantes que només venen a la xarxa. El registre no dona l'adreça, per això no hi ha dades per secció censal.", es: "Registro de autoconsumo de Cataluña (RAC, Generalitat): instalaciones fotovoltaicas inscritas, acumuladas según la fecha de puesta en servicio. No incluye las plantas que solo venden a la red. El registro no da la dirección, por eso no hay datos por sección censal." };
  const SOL = [
    ["h", ["Plaques solars", "Instal·lacions fotovoltaiques d'autoconsum per 1.000 habitants"], ["Placas solares", "Instalaciones fotovoltaicas de autoconsumo por 1.000 habitantes"], N1],
    ["n", ["Instal·lacions solars", "Instal·lacions fotovoltaiques d'autoconsum"], ["Instalaciones solares", "Instalaciones fotovoltaicas de autoconsumo"], N0],
    ["kw", ["Potència solar", "Potència fotovoltaica d'autoconsum instal·lada (kW)"], ["Potencia solar", "Potencia fotovoltaica de autoconsumo instalada (kW)"], N0],
    ["w", ["Potència per habitant", "Potència fotovoltaica d'autoconsum per habitant (W)"], ["Potencia por habitante", "Potencia fotovoltaica de autoconsumo por habitante (W)"], N0],
    ["viv", ["Plaques per habitatge", "Instal·lacions fotovoltaiques per cada 100 habitatges"], ["Placas por vivienda", "Instalaciones fotovoltaicas por cada 100 viviendas"], N1],
    ["nou", ["Plaques noves", "Instal·lacions posades en servei l'any, per 1.000 habitants"], ["Placas nuevas", "Instalaciones puestas en servicio en el año, por 1.000 habitantes"], N1],
    ["nn", ["Plaques noves (nombre)", "Instal·lacions fotovoltaiques posades en servei l'any"], ["Placas nuevas (número)", "Instalaciones fotovoltaicas puestas en servicio en el año"], N0],
    ["mida", ["Mida de la instal·lació", "Potència mitjana per instal·lació (kW)"], ["Tamaño de la instalación", "Potencia media por instalación (kW)"], N1],
    ["gran", ["Instal·lacions grans", "Potència en instal·lacions de 100 kW o més (% del total)"], ["Instalaciones grandes", "Potencia en instalaciones de 100 kW o más (% del total)"], P0],
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
    ca: { font: "Generalitat de Catalunya, resultats per secció censal.",
      font_me: "Mapa Electoral (mapaelectoral.es, CC BY 4.0), a partir del Ministeri de l'Interior i l'INE. Vots agrupats per famílies polítiques; als municipis, els blancs compten amb els nuls.",
      font_rep: "Mapa Electoral (mapaelectoral.es), a partir de l'Atlas Electoral de la Segona República (Rodon, Vall-Prat i Martín Álvarez, UPF; CC BY-NC-SA 4.0). Municipis actuals; vots estimats a partir dels percentatges, sense blancs ni nuls.",
      nomes_mun: "Aquesta elecció només té dades per municipi.", pctv: "Percentatges sobre els vots vàlids (candidatures i en blanc).", seccions: "Les seccions són les del 2024: les que s'han creat després de l'elecció surten sense dades.",
      part: "Votants sobre el cens electoral (sense el vot exterior).", marge: "Diferència entre la primera i la segona candidatura, en punts sobre els vots vàlids.", guany: "Cada zona té el color del bloc polític de la candidatura més votada.",
      participacio: "Participació", vots: "vots", cens: "cens", punts: "punts", tipus: "Elecció", any: "Any", cap: "Aquesta candidatura no es va presentar en aquesta elecció.", altres_c: "Altres" },
    es: { font: "Generalitat de Catalunya, resultados por sección censal.",
      font_me: "Mapa Electoral (mapaelectoral.es, CC BY 4.0), a partir del Ministerio del Interior y el INE. Votos agrupados por familias políticas; en los municipios, los blancos cuentan con los nulos.",
      font_rep: "Mapa Electoral (mapaelectoral.es), a partir del Atlas Electoral de la Segunda República (Rodon, Vall-Prat y Martín Álvarez, UPF; CC BY-NC-SA 4.0). Municipios actuales; votos estimados a partir de los porcentajes, sin blancos ni nulos.",
      nomes_mun: "Esta elección solo tiene datos por municipio.", pctv: "Porcentajes sobre los votos válidos (candidaturas y en blanco).", seccions: "Las secciones son las de 2024: las creadas después de la elección aparecen sin datos.",
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
    UCD: { ca: "Unión de Centro Democrático, el partit d'Adolfo Suárez (1977-1982).", es: "Unión de Centro Democrático, el partido de Adolfo Suárez (1977-1982)." },
    FEsq: { ca: "Front d'Esquerres de Catalunya, la versió catalana del Front Popular a les eleccions del 1936 (ERC, socialistes, comunistes i altres).", es: "Front d'Esquerres de Catalunya, la versión catalana del Frente Popular en las elecciones de 1936 (ERC, socialistas, comunistas y otros)." },
    Lliga: { ca: "Lliga Catalana (abans Lliga Regionalista), de Francesc Cambó. El 1936 va anar dins del Front Català d'Ordre (Dretes).", es: "Lliga Catalana (antes Lliga Regionalista), de Francesc Cambó. En 1936 fue dentro del Front Català d'Ordre (Derechas)." },
    Dretes: { ca: "Candidatures de dretes de la Segona República; el 1936, el Front Català d'Ordre (Lliga, CEDA i altres).", es: "Candidaturas de derechas de la Segunda República; en 1936, el Front Català d'Ordre (Lliga, CEDA y otros)." },
    Locals: { ca: "Candidatures municipals que no pertanyen a cap dels blocs anteriors.", es: "Candidaturas municipales que no pertenecen a ninguno de los bloques anteriores." },
  };
  // La fuente depende de la convocatoria: Generalitat (gen) o Mapa Electoral (me, rep)
  const elFont = (l) => { const f = (elInfo() || {}).f; return TXT_EL[l][f === "me" ? "font_me" : f === "rep" ? "font_rep" : "font"]; };
  const elNota = (extra, pctv) => {
    const txt = (l) => [extra && extra[l], pctv && TXT_EL[l].pctv, elFont(l)].filter(Boolean).join(" ");
    return { get ca() { return txt("ca"); }, get es() { return txt("es"); } };
  };
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
    { id: "cj_trf", per: "m", cob: 0.3, tema: "con", ca: ["Cotxes de segona mà", "Turismes de segona mà comprats en 12 mesos per 1.000 habitants"], es: ["Coches de segunda mano", "Turismos de segunda mano comprados en 12 meses por 1.000 habitantes"],
      t: (m, a) => { const v = trf12(m, a); return v != null && m.poblacion ? (v / m.poblacion) * 1000 : null; }, pv: (a) => { const v = trf12P(null, a); return v != null ? (v / sumaPob()) * 1000 : null; },
      ref: refCJ("trf", "m", (z, a) => { const v = trf12Z(z)(null, a); return z === "cat" && v != null && D.cj.pob_cat ? (v / D.cj.pob_cat.pob) * 1000 : null; }), nota: NOTA_TRF, ...N1 },
    { id: "cj_trf_vell", per: "m", cob: 0.3, sumable: false, tema: "con", ca: ["Cotxes vells venuts", "Turismes de 15 anys o més (% dels de segona mà comprats en 12 mesos)"], es: ["Coches viejos vendidos", "Turismos de 15 años o más (% de los de segunda mano comprados en 12 meses)"],
      t: (m, a) => { const v = trfV12(m, a), t = trf12(m, a); return v != null && t >= 20 ? (v / t) * 100 : null; },
      pv: (a) => { let v = 0, t = 0; for (let k = 0; k < 12; k++) { const b = k ? antPer("m", a, k) : a, x = b ? CJP("trf", "m")(b) : null, p = b ? CJP("trf_v", "m")(b) : null; if (x == null || p == null) return null; t += x; v += (x * p) / 100; } return t ? (v / t) * 100 : null; },
      nota: { ca: "Antiguitat comptada des de la primera matriculació. Només municipis amb 20 compres o més en 12 mesos. " + NOTA_TRF.ca, es: "Antigüedad contada desde la primera matriculación. Solo municipios con 20 compras o más en 12 meses. " + NOTA_TRF.es }, ...P0 },
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
    // Compraventas: suma de los últimos 4 trimestres (Ministerio de Vivienda, notarios), actualizada cada trimestre
    { id: "compra", per: "t", tema: "hab", ca: ["Compravendes", "Compravendes d'habitatges dels últims 12 mesos per 1.000 habitants"], es: ["Compraventas", "Compraventas de viviendas de los últimos 12 meses por 1.000 habitantes"],
      t: (m, a) => { const v = cvq4(m, a); return v != null && m.poblacion ? (v / m.poblacion) * 1000 : null; }, pv: (a) => { const v = cvq4P(null, a); return v != null ? (v / sumaPob()) * 1000 : null; },
      nota: { ca: "Ministeri d'Habitatge, a partir dels notaris: suma dels quatre últims trimestres.", es: "Ministerio de Vivienda, a partir de los notarios: suma de los cuatro últimos trimestres." }, ...N1 },
    { id: "nova", tema: "hab", ca: ["Obra nova", "Compravendes d'habitatge nou (% del total, 2021-2025)"], es: ["Obra nueva", "Compraventas de vivienda nueva (% del total, 2021-2025)"], v: (m) => { const n = suma(m.cv_nova, ANYS5), t = suma(m.compraventas, ANYS5); return t > 0 ? (n / t) * 100 : null; }, ...P0 },
    { id: "protegida", tema: "hab", ca: ["Habitatge protegit", "Compravendes d'habitatge protegit (% del total, 2021-2025)"], es: ["Vivienda protegida", "Compraventas de vivienda protegida (% del total, 2021-2025)"], v: (m) => { const n = suma(m.cv_protegida, ANYS5), t = suma(m.compraventas, ANYS5); return t > 0 ? (n / t) * 100 : null; }, ...P1 },
    { id: "hut", tema: "hab", ca: ["Pisos turístics", "Habitatges d'ús turístic per 100 habitatges"], es: ["Pisos turísticos", "Viviendas de uso turístico por 100 viviendas"], v: (m) => (m.viviendas ? (m.hut / m.viviendas) * 100 : null), ...N1 },
    { id: "buits", tema: "hab", ca: ["Pisos buits", "Habitatges buits registrats per 1.000 habitatges"], es: ["Pisos vacíos", "Viviendas vacías registradas por 1.000 viviendas"], a: "buits", v: X("buits"), ...N1 },
    { id: "visats", tema: "hab", ca: ["Pisos en projecte", "Habitatges visats per 1.000 habitants"], es: ["Pisos en proyecto", "Viviendas visadas por 1.000 habitantes"], a: "visats", v: X("visats"), ...N1 },
    { id: "valor_cad", tema: "hab", ca: ["Valor cadastral de l'habitatge", "Valor cadastral mitjà dels immobles residencials (€)"], es: ["Valor catastral de la vivienda", "Valor catastral medio de los inmuebles residenciales (€)"], a: "cad", sumable: false, v: (m) => CV("vviv")(m, D.anys && D.anys.cad), t: CV("vviv"), pv: CVR("vviv", "gi"), ref: () => { const a = D.anys && D.anys.cad; return { cat: CVR("vviv", "cat")(a), esp: CVR("vviv", "esp")(a) }; }, nota: NOTA_CAD, ...EU },
    { id: "antics", tema: "hab", ca: ["Abans de 1980", "Habitatges construïts abans de 1980 (%)"], es: ["Antes de 1980", "Viviendas construidas antes de 1980 (%)"], v: (m) => (m.viviendas ? (m.viv_antes_1980 / m.viviendas) * 100 : null), s: (x) => (x.viviendas ? (x.viv_antes_1980 / x.viviendas) * 100 : null), ...P0 },
    { id: "nous", tema: "hab", ca: ["Des del 2000", "Habitatges construïts des del 2000 (%)"], es: ["Desde 2000", "Viviendas construidas desde 2000 (%)"], v: null, s: (x) => (x.viviendas ? (x.viv_post_2000 / x.viviendas) * 100 : null), ...P0 },
    { id: "anyo", tema: "hab", ca: ["Any de construcció", "Any mitjà de construcció dels habitatges"], es: ["Año de construcción", "Año medio de construcción de las viviendas"], v: (m) => m.anyo_mediano, s: S("anyo_mediano"), f: (v) => String(Math.round(v)), c: (v) => String(Math.round(v)) },
    { id: "viv_edif", tema: "hab", ca: ["Pisos per edifici", "Habitatges per edifici"], es: ["Pisos por edificio", "Viviendas por edificio"], v: (m) => (m.edificis ? m.viviendas / m.edificis : null), s: (x) => (x.edificis ? x.viviendas / x.edificis : null), ...N1 },
    { id: "segones", tema: "hab", ca: ["Segones residències", "Habitatges no principals: segones residències i buits (%)"], es: ["Segundas residencias", "Viviendas no principales: segundas residencias y vacías (%)"], a: "segones", v: X("segones"), ...P0 },
    { id: "lloguer_pct", tema: "hab", ca: ["Llars de lloguer", "Habitatges principals de lloguer (%)"], es: ["Hogares de alquiler", "Viviendas principales de alquiler (%)"], a: "lloguer_pct", v: X("lloguer_pct"), ...P0 },
    { id: "petits", tema: "hab", ca: ["Pisos petits", "Habitatges principals de 60 m² o menys (%)"], es: ["Pisos pequeños", "Viviendas principales de 60 m² o menos (%)"], a: "petits", v: X("petits"), ...P0 },
    { id: "grans", tema: "hab", ca: ["Cases grans", "Habitatges principals de més de 120 m² (%)"], es: ["Casas grandes", "Viviendas principales de más de 120 m² (%)"], a: "grans", v: X("grans"), ...P0 },
    ...HBI.map(([k, ca, es, ext]) => ({ id: k === "ini" ? "iniciats" : "hb_" + k, tema: "hab", ca, es, a: "hb_" + (ext.any || k), sumable: false,
      v: (m) => HB(ext.k || k)(m, D.anys && D.anys["hb_" + (ext.any || k)]), t: HB(ext.k || k), pv: HBR(ext.k || k, "gi"),
      ref: () => ({ cat: HBR(ext.k || k, "cat")(anyActiu() || (D.anys && D.anys["hb_" + (ext.any || k)])) }), ...ext })),
    ...HBF.map(([k, ca, es, ext]) => ({ id: "hb_" + k, tema: "hab", ca, es, a: "hb_urb", sumable: false, v: (m) => (m.hbf && m.hbf[k] != null ? m.hbf[k] : null), ...ext })),
    { id: "hb_zmrt", tema: "hab", cat: true, ca: ["Zona tensionada", "Municipis declarats zona de mercat residencial tensionat"], es: ["Zona tensionada", "Municipios declarados zona de mercado residencial tensionado"],
      v: (m) => (m.hbf && m.hbf.zmrt) || null, f: (v) => NOM_ZMRT[v][LANG === "ca" ? 0 : 1], c: (v) => NOM_ZMRT[v][LANG === "ca" ? 0 : 1], color: (v) => COL_ZMRT[v] || "#a5abb5",
      nota: { ca: "Departament de Territori, Habitatge i Transició Ecològica, àrees de referència en matèria d'habitatge. Als municipis declarats tensionats s'hi pot limitar el preu del lloguer (llei estatal de l'habitatge del 2023). La primera declaració, del març del 2024, la segona, del 2025.", es: "Departament de Territori, Habitatge i Transició Ecològica, áreas de referencia en materia de vivienda. En los municipios declarados tensionados se puede limitar el precio del alquiler (ley estatal de vivienda de 2023). La primera declaración, de marzo de 2024; la segunda, de 2025." } },
    { id: "hb_ptsh", tema: "hab", cat: true, ca: ["Demanda d'habitatge (pla sectorial)", "Àrees del Pla territorial sectorial d'habitatge"], es: ["Demanda de vivienda (plan sectorial)", "Áreas del Plan territorial sectorial de vivienda"],
      v: (m) => (m.hbf && m.hbf.ptsh) || null, f: (v) => (NOM_PTSH[v] || [v, v])[LANG === "ca" ? 0 : 1], c: (v) => (NOM_PTSH[v] || [v, v])[LANG === "ca" ? 0 : 1], color: (v) => COL_PTSH[v] || "#a5abb5",
      nota: { ca: "Pla territorial sectorial d'habitatge de Catalunya (2019): classifica els municipis segons la demanda d'habitatge. Les àrees de demanda forta i acreditada (ADFA) són on s'ha de concentrar l'habitatge protegit.", es: "Plan territorial sectorial de vivienda de Cataluña (2019): clasifica los municipios según la demanda de vivienda. Las áreas de demanda fuerte y acreditada (ADFA) son donde se debe concentrar la vivienda protegida." } },
    // Renta y pobreza
    { id: "renda", tema: "ren", ca: ["Renda per persona", "Renda neta per persona (€)"], es: ["Renta por persona", "Renta neta por persona (€)"], a: 2024, v: (m) => val(m.renta_persona, "2024"), t: (m, a) => val(m.renta_persona, a), s: S("renta_persona"), ...EU },
    { id: "renda_llar", tema: "ren", ca: ["Renda per llar", "Renda neta per llar (€)"], es: ["Renta por hogar", "Renta neta por hogar (€)"], a: 2024, v: (m) => val(m.renta_hogar, "2024"), t: (m, a) => val(m.renta_hogar, a), s: S("renta_hogar"), ...EU },
    { id: "pobresa", tema: "ren", ca: ["Risc de pobresa", "Població sota el 60 % de la renda mediana (%)"], es: ["Riesgo de pobreza", "Población bajo el 60 % de la renta mediana (%)"], a: "pobresa", v: X("pobresa"), s: S("pobresa"), ...P1 },
    { id: "pobresa_sev", tema: "ren", ca: ["Pobresa severa", "Població sota el 40 % de la renda mediana (%)"], es: ["Pobreza severa", "Población bajo el 40 % de la renta mediana (%)"], a: "pobresa_sev", v: X("pobresa_sev"), s: S("pobresa_sev"), ...P1 },
    { id: "pobresa_esp", tema: "ren", ca: ["Risc de pobresa (espanyols)", "Població de nacionalitat espanyola sota el 60 % de la renda mediana (%)"], es: ["Riesgo de pobreza (españoles)", "Población de nacionalidad española bajo el 60 % de la renta mediana (%)"], a: "pobresa_esp", v: X("pobresa_esp"), s: S("pobresa_esp"), nota: { ca: "INE, Atles de distribució de renda de les llars. Percentatge de les persones de nacionalitat espanyola que viuen en llars amb ingressos per unitat de consum per sota del 60 % de la mediana estatal. «Espanyola» inclou les persones estrangeres que s'han nacionalitzat.", es: "INE, Atlas de distribución de renta de los hogares. Porcentaje de las personas de nacionalidad española que viven en hogares con ingresos por unidad de consumo por debajo del 60 % de la mediana estatal. «Española» incluye a las personas extranjeras que se han nacionalizado." }, ...P1 },
    { id: "pobresa_ext", tema: "ren", ca: ["Risc de pobresa (estrangers)", "Població de nacionalitat estrangera sota el 60 % de la renda mediana (%)"], es: ["Riesgo de pobreza (extranjeros)", "Población de nacionalidad extranjera bajo el 60 % de la renta mediana (%)"], a: "pobresa_ext", v: X("pobresa_ext"), s: S("pobresa_ext"), nota: { ca: "INE, Atles de distribució de renda de les llars. Percentatge de les persones de nacionalitat estrangera que viuen en llars amb ingressos per unitat de consum per sota del 60 % de la mediana estatal. «Espanyola» inclou les persones estrangeres que s'han nacionalitzat.", es: "INE, Atlas de distribución de renta de los hogares. Porcentaje de las personas de nacionalidad extranjera que viven en hogares con ingresos por unidad de consumo por debajo del 60 % de la mediana estatal. «Española» incluye a las personas extranjeras que se han nacionalizado." }, ...P1 },
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
    { id: "nac_top", tema: "pob", cat: true, ca: ["Principal nacionalitat", "Primera nacionalitat estrangera de cada municipi"], es: ["Principal nacionalidad", "Primera nacionalidad extranjera de cada municipio"], a: "nac", maxCat: 5, v: (m) => (m.x && m.x.nac_top) || null, f: (v) => nomPais(v), c: (v) => nomPais(v), color: (v) => colorPais(v),
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
    { id: "edu_estr16", sumable: false, tema: "edu", ca: ["Infants estrangers", "Població de 0 a 15 anys de nacionalitat estrangera (%)"], es: ["Niños extranjeros", "Población de 0 a 15 años de nacionalidad extranjera (%)"], a: "edu_estr16", v: X("edu_estr16"), nota: { ca: "Tots els infants empadronats, vagin o no a escola al municipi. L'alumnat estranger dels centres del municipi és a «Alumnat estranger». INE, padró continu.", es: "Todos los niños empadronados, vayan o no a la escuela en el municipio. El alumnado extranjero de los centros del municipio está en «Alumnado extranjero». INE, padrón continuo." }, ...P0 },
    { id: "edu_univ", sumable: false, tema: "edu", ca: ["Universitaris", "Estudiants universitaris residents per 1.000 habitants"], es: ["Universitarios", "Estudiantes universitarios residentes por 1.000 habitantes"], a: "edu_univ", v: X("edu_univ"), nota: { ca: "Idescat, a partir de la matrícula de les universitats catalanes. No inclou qui estudia fora de Catalunya.", es: "Idescat, a partir de la matrícula de las universidades catalanas. No incluye a quien estudia fuera de Cataluña." }, ...N1 },
    { id: "edu_publica", sumable: false, tema: "edu", ca: ["Escola pública", "Alumnes d'infantil, primària, ESO i batxillerat en centres públics (%)"], es: ["Escuela pública", "Alumnos de infantil, primaria, ESO y bachillerato en centros públicos (%)"], a: "edu_publica", v: X("edu_publica"), nota: { ca: "Departament d'Educació. Alumnes matriculats als centres del municipi; la resta van a centres privats i concertats. Només municipis amb 500 alumnes o més: als pobles amb una sola escola sempre és pública.", es: "Departament d'Educació. Alumnos matriculados en los centros del municipio; el resto va a centros privados y concertados. Solo municipios con 500 alumnos o más: en los pueblos con una sola escuela siempre es pública." }, ...P0 },
    { id: "edu_conc", sumable: false, tema: "edu", ca: ["Escola concertada", "Alumnes en centres privats concertats (%)"], es: ["Escuela concertada", "Alumnos en centros privados concertados (%)"], a: "edu_conc", v: X("edu_conc"), nota: { ca: "Departament d'Educació, Estadística de l'ensenyament. Alumnes d'infantil (3-5 anys), primària, ESO i batxillerat als centres del municipi. Només municipis amb 50 alumnes o més.", es: "Departament d'Educació, Estadística de l'ensenyament. Alumnos de infantil (3-5 años), primaria, ESO y bachillerato en los centros del municipio. Solo municipios con 50 alumnos o más." }, ...P1 },
    { id: "edu_priv", sumable: false, tema: "edu", ca: ["Escola privada", "Alumnes en centres privats no concertats (%)"], es: ["Escuela privada", "Alumnos en centros privados no concertados (%)"], a: "edu_priv", v: X("edu_priv"), nota: { ca: "Departament d'Educació, Estadística de l'ensenyament. Alumnes d'infantil (3-5 anys), primària, ESO i batxillerat als centres del municipi. Només municipis amb 50 alumnes o més.", es: "Departament d'Educació, Estadística de l'ensenyament. Alumnos de infantil (3-5 años), primaria, ESO y bachillerato en los centros del municipio. Solo municipios con 50 alumnos o más." }, ...P1 },
    { id: "edu_estr", sumable: false, tema: "edu", ca: ["Alumnat estranger", "Alumnes de nacionalitat estrangera (%)"], es: ["Alumnado extranjero", "Alumnos de nacionalidad extranjera (%)"], a: "edu_estr", v: X("edu_estr"), nota: { ca: "Departament d'Educació, Estadística de l'ensenyament. Alumnes d'infantil (3-5 anys), primària, ESO i batxillerat als centres del municipi. La ficha del municipi el desglossa per zona d'origen i edat.", es: "Departament d'Educació, Estadística de l'ensenyament. Alumnos de infantil (3-5 años), primaria, ESO y bachillerato en los centros del municipio. La ficha del municipio lo desglosa por zona de origen y edad." }, ...P1 },
    { id: "edu_nese", sumable: false, tema: "edu", ca: ["Necessitats de suport (NESE)", "Alumnes amb necessitats específiques de suport educatiu (%)"], es: ["Necesidades de apoyo (NESE)", "Alumnos con necesidades específicas de apoyo educativo (%)"], a: "edu_nese", v: X("edu_nese"), nota: { ca: "Departament d'Educació, Estadística de l'ensenyament. Alumnes d'infantil (3-5 anys), primària, ESO i batxillerat als centres del municipi. Inclou discapacitat i trastorns, però també situació socioeconòmica desfavorida, arribada recent i altes capacitats.", es: "Departament d'Educació, Estadística de l'ensenyament. Alumnos de infantil (3-5 años), primaria, ESO y bachillerato en los centros del municipio. Incluye discapacidad y trastornos, pero también situación socioeconómica desfavorecida, llegada reciente y altas capacidades." }, ...P1 },
    { id: "edu_retard", sumable: false, tema: "edu", ca: ["Alumnes amb retard a l'ESO", "Alumnes d'ESO més grans de l'edat que toca al seu curs (%)"], es: ["Alumnos con retraso en la ESO", "Alumnos de ESO mayores de la edad que corresponde a su curso (%)"], a: "edu_retard", v: X("edu_retard"), nota: { ca: "Departament d'Educació, Estadística de l'ensenyament. Mesura aproximada de la repetició: compta qui té més anys dels que toquen (12 anys a 1r, 15 a 4t). Només municipis amb 50 alumnes d'ESO o més.", es: "Departament d'Educació, Estadística de l'ensenyament. Medida aproximada de la repetición: cuenta a quien tiene más años de los que tocan (12 años en 1.º, 15 en 4.º). Solo municipios con 50 alumnos de ESO o más." }, ...P1 },
    { id: "edu_grad4", sumable: false, tema: "edu", ca: ["Graduats a 4t d'ESO", "Alumnes de 4t d'ESO que van obtenir el graduat el curs passat (%)"], es: ["Graduados en 4.º de ESO", "Alumnos de 4.º de ESO que obtuvieron el graduado el curso pasado (%)"], a: "edu_grad4", v: X("edu_grad4"), nota: { ca: "Departament d'Educació, Estadística de l'ensenyament. Alumnes avaluats a final de curs als centres del municipi. Només municipis amb 20 alumnes de 4t o més.", es: "Departament d'Educació, Estadística de l'ensenyament. Alumnos evaluados a final de curso en los centros del municipio. Solo municipios con 20 alumnos de 4.º o más." }, ...P1 },
    { id: "edu_fp", sumable: false, tema: "edu", ca: ["Formació professional", "Alumnes de cicles de grau mitjà i superior"], es: ["Formación profesional", "Alumnos de ciclos de grado medio y superior"], a: "edu_fp", v: X("edu_fp"), nota: { ca: "Departament d'Educació, Estadística de l'ensenyament. Alumnes als centres del municipi, presencials i a distància.", es: "Departament d'Educació, Estadística de l'ensenyament. Alumnos en los centros del municipio, presenciales y a distancia." }, ...N0 },
    { id: "edu_docents", sumable: false, tema: "edu", ca: ["Docents", "Professors d'infantil, primària i secundària als centres del municipi"], es: ["Docentes", "Profesores de infantil, primaria y secundaria en los centros del municipio"], a: "edu_docents", v: X("edu_docents"), nota: { ca: "Departament d'Educació, Estadística de l'ensenyament. Personal docent de règim general (no inclou les llars d'infants).", es: "Departament d'Educació, Estadística de l'ensenyament. Personal docente de régimen general (no incluye las guarderías)." }, ...N0 },
    { id: "edu_alum_doc", sumable: false, tema: "edu", ca: ["Alumnes per docent", "Alumnes d'infantil a FP per cada docent"], es: ["Alumnos por docente", "Alumnos de infantil a FP por cada docente"], a: "edu_alum_doc", v: X("edu_alum_doc"), nota: { ca: "Departament d'Educació, Estadística de l'ensenyament. Només municipis amb 10 docents o més.", es: "Departament d'Educació, Estadística de l'ensenyament. Solo municipios con 10 docentes o más." }, ...N1 },
    { id: "edu_doc_dones", sumable: false, tema: "edu", ca: ["Docents dones", "Dones entre el personal docent (%)"], es: ["Docentes mujeres", "Mujeres entre el personal docente (%)"], a: "edu_doc_dones", v: X("edu_doc_dones"), nota: { ca: "Departament d'Educació, Estadística de l'ensenyament. Només municipis amb 10 docents o més.", es: "Departament d'Educació, Estadística de l'ensenyament. Solo municipios con 10 docentes o más." }, ...P0 },
    { id: "edu_doc_50", sumable: false, tema: "edu", ca: ["Docents de 50 anys o més", "Docents de 50 anys o més (%)"], es: ["Docentes de 50 años o más", "Docentes de 50 años o más (%)"], a: "edu_doc_50", v: X("edu_doc_50"), nota: { ca: "Departament d'Educació, Estadística de l'ensenyament. Indica quants professors es jubilaran en els propers quinze anys. Només municipis amb 10 docents o més.", es: "Departament d'Educació, Estadística de l'ensenyament. Indica cuántos profesores se jubilarán en los próximos quince años. Solo municipios con 10 docentes o más." }, ...P0 },
    { id: "edu_ratio_pri", sumable: false, tema: "edu", ca: ["Alumnes per grup (primària)", "Alumnes per grup a primària"], es: ["Alumnos por grupo (primaria)", "Alumnos por grupo en primaria"], a: "edu_ratio_pri", v: X("edu_ratio_pri"), nota: { ca: "Departament d'Educació. Mitjana dels centres del municipi.", es: "Departament d'Educació. Media de los centros del municipio." }, ...N1 },
    { id: "edu_ratio_eso", sumable: false, tema: "edu", ca: ["Alumnes per grup (ESO)", "Alumnes per grup a l'ESO"], es: ["Alumnos por grupo (ESO)", "Alumnos por grupo en la ESO"], a: "edu_ratio_eso", v: X("edu_ratio_eso"), nota: { ca: "Departament d'Educació. Només municipis amb institut.", es: "Departament d'Educació. Solo municipios con instituto." }, ...N1 },
    { id: "edu_0_3", sumable: false, tema: "edu", ca: ["Escolarització 0-3", "Infants a la llar d'infants per cada 100 de 0 a 2 anys (aprox.)"], es: ["Escolarización 0-3", "Niños en la guardería por cada 100 de 0 a 2 años (aprox.)"], a: "edu_0_3", v: X("edu_0_3"), nota: { ca: "Alumnes de llar d'infants matriculats al municipi (Departament d'Educació) sobre tres vegades els naixements de l'últim any (Idescat). Aproximació: no inclou llars privades no autoritzades i compta infants d'altres municipis.", es: "Alumnos de guardería matriculados en el municipio (Departament d'Educació) sobre tres veces los nacimientos del último año (Idescat). Aproximación: no incluye guarderías privadas no autorizadas y cuenta niños de otros municipios." }, ...P0 },
    { id: "edu_primera", sumable: false, tema: "edu", ca: ["Primera opció", "Places assignades a la primera opció de la preinscripció (%)"], es: ["Primera opción", "Plazas asignadas en la primera opción de la preinscripción (%)"], a: "edu_primera", v: X("edu_primera"), nota: { ca: "Departament d'Educació. P3, primària i 1r d'ESO.", es: "Departament d'Educació. P3, primaria y 1.º de ESO." }, ...P0 },
    { id: "edu_mateix", sumable: false, tema: "edu", ca: ["Estudia al municipi", "Alumnes residents que estudien al mateix municipi (%)"], es: ["Estudia en el municipio", "Alumnos residentes que estudian en el mismo municipio (%)"], a: "edu_mateix", v: X("edu_mateix"), nota: { ca: "Idescat, El municipi en xifres.", es: "Idescat, El municipi en xifres." }, ...P0 },
    { id: "edu_centres", tema: "edu", ca: ["Centres educatius", "Centres educatius (escoles, instituts, llars d'infants i altres)"], es: ["Centros educativos", "Centros educativos (escuelas, institutos, guarderías y otros)"], a: "edu_centres", v: X("edu_centres"), nota: { ca: "Departament d'Educació, directori de centres.", es: "Departament d'Educació, directorio de centros." }, ...N0 },
    { id: "edu_alumnes", tema: "edu", ca: ["Alumnes", "Alumnes matriculats d'infantil a batxillerat"], es: ["Alumnos", "Alumnos matriculados de infantil a bachillerato"], a: "edu_alumnes", v: X("edu_alumnes"), nota: { ca: "Departament d'Educació. Alumnes als centres del municipi.", es: "Departament d'Educació. Alumnos en los centros del municipio." }, ...N0 },
    // Trabajo y economía
    // Paro, autónomos y afiliados: mensuales (SEPE e Idescat/Seguridad Social, los mismos datos que Coyuntura) por 100 habitantes
    { id: "atur", per: "m", tema: "tre", ca: ["Atur registrat", "Aturats registrats per 100 habitants, a final de mes"], es: ["Paro registrado", "Parados registrados por 100 habitantes, a final de mes"],
      t: perHab(atur, 100), pv: perHabP("atur", 100), ref: refCJ("atur", "m", (z, a) => perHabZ("atur", z, a, 100)), nota: NOTA_SEPE, ...N1 },
    { id: "llocs", tema: "tre", ca: ["Llocs de treball", "Llocs de treball per 100 habitants"], es: ["Puestos de trabajo", "Puestos de trabajo por 100 habitantes"], v: X("llocs"), ...N0 },
    { id: "autonoms", per: "m", cob: 0.5, tema: "tre", ca: ["Autònoms", "Afiliats al règim d'autònoms per 100 habitants, a final de mes"], es: ["Autónomos", "Afiliados al régimen de autónomos por 100 habitantes, a final de mes"],
      t: perHab(reta, 100), pv: perHabP("reta", 100), ref: refCJ("reta", "m", (z, a) => perHabZ("reta", z, a, 100)), nota: NOTA_AFI, ...N1 },
    { id: "empreses", tema: "tre", ca: ["Empreses", "Empreses per 1.000 habitants"], es: ["Empresas", "Empresas por 1.000 habitantes"], v: X("empreses"), ...N1 },
    { id: "ocupats", per: "m", cob: 0.5, tema: "tre", ca: ["Afiliats", "Afiliats a la Seguretat Social per 100 habitants (per residència), a final de mes"], es: ["Afiliados", "Afiliados a la Seguridad Social por 100 habitantes (por residencia), a final de mes"],
      t: perHab(afil, 100), pv: perHabP("afil", 100), ref: refCJ("afil", "m", (z, a) => perHabZ("afil", z, a, 100)), nota: NOTA_AFI, ...N1 },
    { id: "ocupats_dones", tema: "tre", ca: ["Afiliades dones", "Dones entre els afiliats a la Seguretat Social (%)"], es: ["Afiliadas mujeres", "Mujeres entre los afiliados a la Seguridad Social (%)"], v: X("ocupats_dones"), ...P1 },
    { id: "atur_var", per: "m", sumable: false, tema: "tre", ca: ["Variació de l'atur", "Variació de l'atur registrat respecte al mateix mes de l'any anterior (%)"], es: ["Variación del paro", "Variación del paro registrado respecto al mismo mes del año anterior (%)"],
      t: variacio(atur, "m", 12, 20), pv: (a) => varZ("atur", "m", 12)("gi", a), ref: refCJ("atur", "m", (z, a) => varZ("atur", "m", 12)(z, a)),
      nota: { ca: "Només municipis amb almenys 20 aturats fa un any. SEPE.", es: "Solo municipios con al menos 20 parados hace un año. SEPE." }, f: (v) => pct(v, 1, true), c: (v) => pct(v, 0, true) },
    { id: "atur_estr", tema: "tre", ca: ["Aturats estrangers", "Estrangers entre els aturats registrats (%)"], es: ["Parados extranjeros", "Extranjeros entre los parados registrados (%)"], a: "atur_estr", v: X("atur_estr"), ...P0 },
    { id: "prest_atur_ben", tema: "tre", ca: ["Prestacions d'atur", "Beneficiaris de prestacions d'atur per 1.000 habitants"], es: ["Prestaciones de paro", "Beneficiarios de prestaciones de paro por 1.000 habitantes"], a: "prest_atur", v: X("prest_atur"), ...N1 },
    { id: "sector_serveis", tema: "tre", ca: ["Serveis", "Llocs de treball als serveis (%)"], es: ["Servicios", "Puestos de trabajo en servicios (%)"], v: X("sector_serveis"), ...P0 },
    { id: "sector_ind", tema: "tre", ca: ["Indústria", "Llocs de treball a la indústria (%)"], es: ["Industria", "Puestos de trabajo en la industria (%)"], v: X("sector_ind"), ...P0 },
    { id: "sector_const", tema: "tre", ca: ["Construcció", "Llocs de treball a la construcció (%)"], es: ["Construcción", "Puestos de trabajo en la construcción (%)"], v: X("sector_const"), ...P0 },
    { id: "sector_agri", tema: "tre", ca: ["Agricultura", "Llocs de treball a l'agricultura (%)"], es: ["Agricultura", "Puestos de trabajo en la agricultura (%)"], v: X("sector_agri"), ...P1 },
    { id: "pib_hab", tema: "tre", ca: ["PIB per habitant", "Producte interior brut per habitant (€)"], es: ["PIB por habitante", "Producto interior bruto por habitante (€)"], a: "pib_hab", v: X("pib_hab"), ...EU },
    { id: "places_tur", tema: "tur", ca: ["Hotel, càmping i rural", "Places d'hotel, càmping i turisme rural per 1.000 habitants"], es: ["Hotel, camping y rural", "Plazas de hotel, camping y turismo rural por 1.000 habitantes"], a: "places_tur", v: X("places_tur"), ...N0 },
    // Salud y servicios sociales
    { id: "pensions", tema: "sal", ca: ["Pensionistes", "Pensions contributives per 100 habitants"], es: ["Pensionistas", "Pensiones contributivas por 100 habitantes"], v: X("pensions"), ...N1 },
    { id: "pnc", tema: "sal", ca: ["Pensions no contributives", "Pensions no contributives per 1.000 habitants"], es: ["Pensiones no contributivas", "Pensiones no contributivas por 1.000 habitantes"], a: "pnc", v: X("pnc"), ...N1 },
    { id: "residencies", tema: "sal", ca: ["Residències", "Places en residències per a gent gran per 1.000 habitants"], es: ["Residencias", "Plazas en residencias de mayores por 1.000 habitantes"], a: "residencies", v: X("residencies"), ...N1 },
    { id: "farmacies", tema: "sal", ca: ["Farmàcies", "Farmàcies per 10.000 habitants"], es: ["Farmacias", "Farmacias por 10.000 habitantes"], a: "farmacies", v: X("farmacies"), ...N1 },
    { id: "sanitaris", sumable: false, tema: "sal", ca: ["Centres sanitaris", "Centres sanitaris (CAP, consultoris, hospitals)"], es: ["Centros sanitarios", "Centros sanitarios (CAP, consultorios, hospitales)"], a: "sanitaris", v: X("sanitaris"), ...N0 },
    { id: "rme", tema: "sal", ca: ["Mortalitat ajustada", "Mortalitat ajustada per edat (Catalunya = 100)"], es: ["Mortalidad ajustada", "Mortalidad ajustada por edad (Cataluña = 100)"], a: "rme", abs: A("rme"), nota: { ca: "Dades per àrea bàsica de salut (CatSalut). Índex: Catalunya = 100, ajustat per edat i sexe.", es: "Datos por área básica de salud (CatSalut). Índice: Cataluña = 100, ajustado por edad y sexo." }, ...N0 },
    { id: "mort_prem", tema: "sal", ca: ["Mortalitat prematura", "Mortalitat abans dels 75 anys, ajustada (Catalunya = 100)"], es: ["Mortalidad prematura", "Mortalidad antes de los 75 años, ajustada (Cataluña = 100)"], a: "mort_prem", abs: A("mort_prem"), nota: { ca: "Dades per àrea bàsica de salut (CatSalut). Índex: Catalunya = 100, ajustat per edat i sexe.", es: "Datos por área básica de salud (CatSalut). Índice: Cataluña = 100, ajustado por edad y sexo." }, ...N0 },
    { id: "def_12m", tema: "sal", ca: ["Defuncions de l'últim any", "Defuncions dels últims 12 mesos per 1.000 habitants"], es: ["Defunciones del último año", "Defunciones de los últimos 12 meses por 1.000 habitantes"], a: "def_12m", abs: A("def_12m"), nota: { ca: "Dades per àrea bàsica de salut (CatSalut, registre de defuncions, s'actualitza cada setmana). Últims 12 mesos complets. Depèn molt de l'edat de la població.", es: "Datos por área básica de salud (CatSalut, registro de defunciones, se actualiza cada semana). Últimos 12 meses completos. Depende mucho de la edad de la población." }, ...N1 },
    { id: "def_exces", sumable: false, tema: "sal", ca: ["Defuncions davant del 2017-2019", "Defuncions dels últims 12 mesos respecte a la mitjana del 2017-2019 (%)"], es: ["Defunciones frente a 2017-2019", "Defunciones de los últimos 12 meses respecto a la media de 2017-2019 (%)"], a: "def_exces", abs: A("def_exces"), nota: { ca: "Dades per àrea bàsica de salut (CatSalut, s'actualitza cada setmana). Compara els últims 12 mesos complets amb la mitjana anual del 2017-2019, abans de la covid. No té en compte que la població ha crescut i envellit.", es: "Datos por área básica de salud (CatSalut, se actualiza cada semana). Compara los últimos 12 meses completos con la media anual de 2017-2019, antes de la covid. No tiene en cuenta que la población ha crecido y envejecido." }, f: (v) => `${v > 0 ? "+" : ""}${pct(v, 0)}`, c: (v) => `${v > 0 ? "+" : ""}${pct(v, 0)}` },
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
    { id: "cap_n", sumable: false, tema: "sal", ca: ["CAP i atenció continuada", "Centres d'atenció primària a l'àrea"], es: ["CAP y atención continuada", "Centros de atención primaria en el área"], a: "cap_n", abs: A("cap_n"), nota: { ca: "Centres d'atenció primària i d'atenció continuada (Equipaments de Catalunya).", es: "Centros de atención primaria y de atención continuada (Equipaments de Catalunya)." }, ...N0 },
    { id: "inf_resp", tema: "sal", ca: ["Infeccions respiratòries", "Infeccions respiratòries ateses al CAP, últimes 4 setmanes, per 1.000 habitants"], es: ["Infecciones respiratorias", "Infecciones respiratorias atendidas en el CAP, últimas 4 semanas, por 1.000 habitantes"], a: "inf_resp", abs: A("inf_resp"), nota: { ca: "Casos diagnosticats a l'atenció primària les últimes 4 setmanes publicades (Departament de Salut, SIVIC), sobre la població assignada a l'ABS.", es: "Casos diagnosticados en atención primaria en las últimas 4 semanas publicadas (Departament de Salut, SIVIC), sobre la población asignada al ABS." }, ...N1 },
    { id: "inf_grip", tema: "sal", ca: ["Grip", "Casos de grip, últimes 4 setmanes, per 100.000 habitants"], es: ["Gripe", "Casos de gripe, últimas 4 semanas, por 100.000 habitantes"], a: "inf_grip", abs: A("inf_grip"), nota: { ca: "Casos diagnosticats a l'atenció primària les últimes 4 setmanes publicades (Departament de Salut, SIVIC), sobre la població assignada a l'ABS.", es: "Casos diagnosticados en atención primaria en las últimas 4 semanas publicadas (Departament de Salut, SIVIC), sobre la población asignada al ABS." }, ...N0 },
    { id: "inf_covid", tema: "sal", ca: ["COVID-19", "Casos de COVID-19, últimes 4 setmanes, per 100.000 habitants"], es: ["COVID-19", "Casos de COVID-19, últimas 4 semanas, por 100.000 habitantes"], a: "inf_covid", abs: A("inf_covid"), nota: { ca: "Casos diagnosticats a l'atenció primària les últimes 4 setmanes publicades (Departament de Salut, SIVIC), sobre la població assignada a l'ABS.", es: "Casos diagnosticados en atención primaria en las últimas 4 semanas publicadas (Departament de Salut, SIVIC), sobre la población asignada al ABS." }, ...N0 },
    { id: "domicili", tema: "sal", ca: ["Atenció a domicili", "Població atesa al programa d'atenció domiciliària (%)"], es: ["Atención a domicilio", "Población atendida en el programa de atención domiciliaria (%)"], a: "domicili", abs: A("domicili"), nota: { ca: "Dades per àrea bàsica de salut (CatSalut, Central de Resultats).", es: "Datos por área básica de salud (CatSalut, Central de Resultats)." }, ...P1 },
    // Seguridad (áreas básicas policiales)
    { id: "fets", tema: "seg", ca: ["Delictes", "Fets penals coneguts per 1.000 habitants"], es: ["Delitos", "Hechos penales conocidos por 1.000 habitantes"], a: "fets", abp: A("fets"), nota: { ca: "Dades per àrea bàsica policial (Mossos d'Esquadra), últims 12 mesos (s'actualitza cada mes). Les taxes es calculen sobre la població resident: a la costa, l'estiu les infla.", es: "Datos por área básica policial (Mossos d'Esquadra), últimos 12 meses (se actualiza cada mes). Las tasas se calculan sobre la población residente: en la costa, el verano las infla." }, ...N1 },
    { id: "patrimoni", tema: "seg", ca: ["Furts i robatoris", "Delictes contra el patrimoni per 1.000 habitants"], es: ["Hurtos y robos", "Delitos contra el patrimonio por 1.000 habitantes"], a: "patrimoni", abp: A("patrimoni"), nota: { ca: "Dades per àrea bàsica policial (Mossos d'Esquadra), últims 12 mesos (s'actualitza cada mes). Les taxes es calculen sobre la població resident: a la costa, l'estiu les infla.", es: "Datos por área básica policial (Mossos d'Esquadra), últimos 12 meses (se actualiza cada mes). Las tasas se calculan sobre la población residente: en la costa, el verano las infla." }, ...N1 },
    { id: "persones", tema: "seg", ca: ["Contra les persones", "Lesions, homicidis i delictes contra la llibertat per 1.000 habitants"], es: ["Contra las personas", "Lesiones, homicidios y delitos contra la libertad por 1.000 habitantes"], a: "persones", abp: A("persones"), nota: { ca: "Dades per àrea bàsica policial (Mossos d'Esquadra), últims 12 mesos (s'actualitza cada mes). Les taxes es calculen sobre la població resident: a la costa, l'estiu les infla.", es: "Datos por área básica policial (Mossos d'Esquadra), últimos 12 meses (se actualiza cada mes). Las tasas se calculan sobre la población residente: en la costa, el verano las infla." }, ...N1 },
    { id: "sexual", tema: "seg", ca: ["Delictes sexuals", "Delictes contra la llibertat sexual per 1.000 habitants"], es: ["Delitos sexuales", "Delitos contra la libertad sexual por 1.000 habitantes"], a: "sexual", abp: A("sexual"), nota: { ca: "Dades per àrea bàsica policial (Mossos d'Esquadra), últims 12 mesos (s'actualitza cada mes). Les taxes es calculen sobre la població resident: a la costa, l'estiu les infla.", es: "Datos por área básica policial (Mossos d'Esquadra), últimos 12 meses (se actualiza cada mes). Las tasas se calculan sobre la población residente: en la costa, el verano las infla." }, ...N2 },
    { id: "resolts", tema: "seg", ca: ["Delictes resolts", "Fets penals resolts (% dels coneguts)"], es: ["Delitos resueltos", "Hechos penales resueltos (% de los conocidos)"], a: "resolts", abp: A("resolts"), nota: { ca: "Dades per àrea bàsica policial (Mossos d'Esquadra), últims 12 mesos (s'actualitza cada mes). Les taxes es calculen sobre la població resident: a la costa, l'estiu les infla.", es: "Datos por área básica policial (Mossos d'Esquadra), últimos 12 meses (se actualiza cada mes). Las tasas se calculan sobre la población residente: en la costa, el verano las infla." }, ...P0 },
    { id: "detencions", tema: "seg", ca: ["Detencions", "Detencions per 1.000 habitants"], es: ["Detenciones", "Detenciones por 1.000 habitantes"], a: "detencions", abp: A("detencions"), nota: { ca: "Dades per àrea bàsica policial (Mossos d'Esquadra), últims 12 mesos (s'actualitza cada mes). Les taxes es calculen sobre la població resident: a la costa, l'estiu les infla.", es: "Datos por área básica policial (Mossos d'Esquadra), últimos 12 meses (se actualiza cada mes). Las tasas se calculan sobre la población residente: en la costa, el verano las infla." }, ...N1 },
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
    // Plaques solars: autoconsum fotovoltaic (RAC)
    ...SOL.map(([k, ca, es, fmtk]) => ({ id: "sol_" + k, tema: "ene", ca, es, a: "sol", sumable: ["n", "kw", "nn"].includes(k), v: (m) => SV(k)(m, D.anys && D.anys.sol), t: SV(k), pv: SVR(k, "gi"),
      ref: () => { const a = D.anys && D.anys.sol; return { cat: SVR(k, "cat")(a) }; }, nota: NOTA_SOL, ...fmtk })),
    { id: "selectiva", tema: "ene", ca: ["Recollida selectiva", "Recollida selectiva (% dels residus)"], es: ["Recogida selectiva", "Recogida selectiva (% de los residuos)"], a: "selectiva", v: X("selectiva"), ...P0 },
    { id: "residus", tema: "ene", ca: ["Residus per habitant", "Residus municipals per habitant i dia (kg)"], es: ["Residuos por habitante", "Residuos municipales por habitante y día (kg)"], a: "residus", v: X("residus"), ...N2 },
    // Parque de vehículos (DGT)
    ...ACC.map(([k, a, ca, es, nota, fmtk]) => ({ id: "acc_" + k, tema: "acc", ca, es, a, v: (m) => AC(k)(m, D.anys && D.anys[a]), t: AC(k), pv: ACR(k, "gi"),
      com: ACZ(k, a), ref: () => { const y = (ind && ind.a === a && anyActiu()) || (D.anys && D.anys[a]); return { cat: ACR(k, "cat")(y), esp: ACR(k, "esp")(y) }; }, nota, ...fmtk })),
    ...CUL.map(([k, a, ca, es, nota, fmtk]) => ({ id: "cul_" + k, tema: "cul", ca, es, a, v: (m) => CU(k)(m, D.anys && D.anys[a]), t: CU(k), pv: CUR(k, "gi"),
      ...(/^b_/.test(k) ? { com: CUZ(k, a), buit: () => !(D.anys && D.anys[a]) } : /^ct_/.test(k) && k !== "ct_osm" ? { com: CUZ(k, a), buit: () => !(D.anys && D.anys[a]) } : k === "ct_osm" ? { buit: () => !(D.anys && D.anys[a]) } : {}), ref: () => { const y = (ind && ind.a === a && anyActiu()) || (D.anys && D.anys[a]); return { cat: CUR(k, "cat")(y) }; }, nota, ...fmtk })),
    ...CULC.map(([k, ca, es, fmtk, nota]) => ({ id: "cul_" + k, tema: "cul", ca, es, a: "cul_com", sumable: false, com: CUC(k), ref: CUCR(k), nota: nota || NOTA_COMC, ...fmtk })),
    ...AMB_MUN.map(([k, a, ca, es, nota, fmtk]) => ({ id: "amb_" + k, tema: "amb", ca, es, a, v: (m) => AM(k)(m, D.anys && D.anys[a]), t: a === "amb_seq" ? AM(k) : undefined, nota, ...fmtk })),
    ...AMB_COM.map(([k, ca, es, fmtk]) => ({ id: "amb_c_" + k, tema: "amb", ca, es, a: "amb_aigua", sumable: false, com: AMZ(k), ref: AMR(k), nota: NOTA_AIGUA, ...fmtk })),
    ...AMB_AIRE.map(([k, ca, es, fmtk]) => ({ id: "amb_a_" + k, tema: "amb", ca, es, a: "amb_aire", sumable: false, aire: A(k), nota: NOTA_AIRE, ...fmtk })),
    ...AMB_MET.map(([k, ca, es, fmtk]) => ({ id: "amb_m_" + k, tema: "amb", ca, es, a: "amb_met", sumable: false, met: A(k), nota: NOTA_MET, ...fmtk })),
    ...DPM.map(([k, a, ca, es, nota, fmtk]) => ({ id: "dp_" + k, tema: "dp", dk: "dp_" + k, ca, es, a, sumable: false, v: (m) => DP("dp_" + k)(m, D.anys && D.anys[a]), t: a === "dp_plat" ? undefined : DP("dp_" + k), nota,
      ref: ["menor", "directe", "contr_hab"].includes(k) ? () => ({ cat: DPR("dp_" + k)(anyActiu() || (D.anys && D.anys[a])).cat }) : undefined, ...fmtk })),
    ...DPC.map(([k, ca, es]) => ({ id: "dp_c_" + k, tema: "dp", ca, es, a: "dp_subv", sumable: false, com: DPZ(k), nota: NOTA_SUBVC, ...EUR0,
      ref: k === "subv" ? () => { const o = DPR("dp_c_subv")(D.anys && D.anys.dp_subv); return { gi: o.gi, cat: o.cat }; } : undefined })),
    ...(window.UA_CAT || []).filter((x) => x[5]).map(([k, , ca, es, fk]) => ({ id: "ua_" + k.slice(1).replace(/^_/, ""), uk: k, tema: "urb", ca, es, a: "ua", sumable: false, cob: 0.004,
      v: (m) => UAV(k)(m, anysDe(IND.find((i) => i.uk === k)).slice(-1)[0]), t: UAV(k),
      ref: () => { const i = IND.find((x) => x.uk === k), a = anyActiu() || anysDe(i).slice(-1)[0]; return { esp: window.UA_ABS.has(k) ? null : UAE(k, a) }; }, nota: window.UA_NOTA, ...window.UA_FMT(fk) })),
    ...ENE.map(([k, a, ca, es, nota, fmtk]) => ({ id: "en_" + k, tema: "ene", ca, es, a, sumable: false, v: (m) => EN("en_" + k)(m, D.anys && D.anys[a]), t: a === "en_cob" ? EN("en_" + k) : undefined, nota,
      ref: /^gas_g|^gas_d/.test(k) ? () => { const r = D.en_ref && D.en_ref[k]; return r ? { cat: r.cat, esp: r.esp } : {}; } : undefined, ...fmtk })),
    ...VEH.map(([k, ca, es, fmtk]) => ({ id: "veh_" + k, tema: "veh", ca, es, a: "veh", sumable: k === "n", v: (m) => VH(k)(m, D.anys && D.anys.veh), t: VH(k), pv: VHR(k, "gi"),
      ref: () => { const a = D.anys && D.anys.veh; return { cat: VHR(k, "cat")(a), esp: VHR(k, "esp")(a) }; }, nota: NOTA_VEH, ...fmtk })),
    // Turismo
    ...TURI.map(([k, ca, es, nota, ext]) => ({ id: "tur_" + k, tema: "tur", ca, es, a: "tur_" + k, v: (m) => TU(k)(m, D.anys && D.anys["tur_" + k]), t: TU(k), pv: TUR(k), nota, ...ext })),
    // Movilidad (EMQ 2024-2025)
    ...MOB.map(([k, ca, es, ext]) => ({ id: "mob_" + k, tema: "mob", ca, es, a: "mob", sumable: false, v: MV(k), ...(k === "atrau" ? {} : { com: (x) => (x && x[k] != null ? x[k] : null) }),
      ref: () => ({ gi: D.mob && D.mob.ref ? D.mob.ref[k] : null }), nota: k === "atrau" ? NOTA_ATRAU : NOTA_MOB, ...ext })),
    // Comercio (CECC)
    ...COM.map(([k, ca, es, fmtk]) => ({ id: "com_" + k, tema: "com", ca, es, a: "com", sumable: k === "n", v: (m) => CM(k)(m, D.anys && D.anys.com), t: CM(k), pv: CMR(k, "gi"),
      ref: () => { const a = D.anys && D.anys.com; return { cat: CMR(k, "cat")(a) }; }, nota: NOTA_COM, ...fmtk })),
    { id: "com_var", sumable: false, tema: "com", ca: ["Comerços guanyats o perduts", "Variació dels establiments comercials des del 2017 (%)"], es: ["Comercios ganados o perdidos", "Variación de los establecimientos comerciales desde 2017 (%)"], a: "com_var", v: X("com_var"),
      nota: { ca: "Cens d'establiments comercials de Catalunya, 2017 i darrer cens. Només municipis amb 10 comerços o més el 2017.", es: "Censo de establecimientos comerciales de Cataluña, 2017 y último censo. Solo municipios con 10 comercios o más en 2017." }, f: (v) => pct(v, 1, true), c: (v) => pct(v, 0, true) },
    { id: "com_buits", sumable: false, tema: "com", ca: ["Locals buits", "Locals comercials tancats o buits (% dels locals en planta baixa)"], es: ["Locales vacíos", "Locales comerciales cerrados o vacíos (% de los locales en planta baja)"], a: "com_buits", v: X("com_buits"),
      nota: { ca: "Mapa del Comerç Català 2022 (Generalitat): inspecció directa dels locals de les ciutats de més de 20.000 habitants i de les capitals de comarca. A la resta de municipis no s'ha fet.", es: "Mapa del Comerç Català 2022 (Generalitat): inspección directa de los locales de las ciudades de más de 20.000 habitantes y de las capitales de comarca. En el resto de municipios no se ha hecho." }, ...P1 },
    // Impuestos municipales: tipos de cada ayuntamiento por año (Ministerio de Hacienda, SGFAL)
    // Mapa urbanístic de Catalunya: sèrie anual per municipi
    ...HBU.map(([k, ca, es, fmtk]) => ({ id: "u_" + k, tema: "ter", ca, es, a: "hb_urb", sumable: false, v: (m) => HB("u_" + k)(m, D.anys && D.anys.hb_urb), t: HB("u_" + k), pv: HBR("u_" + k, "gi"),
      ref: () => ({ cat: HBR("u_" + k, "cat")(anyActiu() || (D.anys && D.anys.hb_urb)) }), nota: fmtk.s ? NHB.urb_s : NHB.urb, ...fmtk })),
    // Cadastre: sèrie anual per municipi
    ...CAD.map(([k, ca, es, ext]) => ({ id: "cad_" + k, tema: "cad", ca, es, a: CADK(k), sumable: false, v: (m) => CV(k)(m, CADA(k)), t: CV(k),
      ...(k === "n" || k === "hos" || k === "rev" ? {} : { pv: CVR(k, "gi"), ref: () => { const a = CADA(k); return { cat: CVR(k, "cat")(a), esp: CVR(k, "esp")(a) }; } }),
      nota: NOTA_CAD, ...ext })),
    // Recàrrec als pisos buits: categories (la majoria d'ajuntaments no el cobren)
    { id: "cad_ibi_desoc", tema: "tri", cat: true, ca: ["Recàrrec a pisos buits", "Ajuntaments que cobren un recàrrec de l'IBI als habitatges desocupats"], es: ["Recargo a pisos vacíos", "Ayuntamientos que cobran un recargo del IBI a las viviendas desocupadas"],
      v: (m) => { const v = CV("ibi_desoc")(m, CADA("ibi_desoc")); return v == null ? null : v >= 50 ? DESOC[LANG][0] : v > 0 ? DESOC[LANG][1] : DESOC[LANG][2]; },
      f: (v) => v, c: (v) => v, color: (v) => (v === DESOC[LANG][0] ? "#0b4f4b" : v === DESOC[LANG][1] ? "#5fae9f" : "#e2e5e8"),
      nota: { ca: "Direcció General del Cadastre. Recàrrec (fins al 50 %) que l'ajuntament pot cobrar sobre la quota de l'IBI dels habitatges desocupats amb caràcter permanent.", es: "Dirección General del Catastro. Recargo (hasta el 50 %) que el ayuntamiento puede cobrar sobre la cuota del IBI de las viviendas desocupadas con carácter permanente." }, notaCat: { ca: "Nombre de municipis de la província en cada cas (últim any amb dades).", es: "Número de municipios de la provincia en cada caso (último año con datos)." } },
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
    indBloc("UCD", "UCD", "UCD"),
    indBloc("FEsq", "el Front d'Esquerres", "el Front d'Esquerres"),
    indBloc("Lliga", "la Lliga", "la Lliga"),
    indBloc("Dretes", "les dretes", "las derechas"),
    { id: "densitat", sumable: false, tema: "ter", ca: ["Densitat", "Habitants per km²"], es: ["Densidad", "Habitantes por km²"], a: "densitat", v: X("densitat"), ...N0 },
    { id: "sau", sumable: false, tema: "ter", ca: ["Superfície agrícola", "Superfície agrícola utilitzada (% del terme)"], es: ["Superficie agrícola", "Superficie agrícola utilizada (% del término)"], a: "sau", v: X("sau"), ...P0 },
    { id: "esports", tema: "ter", ca: ["Espais esportius", "Espais esportius per 1.000 habitants"], es: ["Espacios deportivos", "Espacios deportivos por 1.000 habitantes"], a: "esports", v: X("esports"), ...N1 },
    { id: "motos", tema: "ter", ca: ["Motos", "Motocicletes per 1.000 habitants"], es: ["Motos", "Motocicletas por 1.000 habitantes"], a: "motos", v: X("motos"), ...N0 },
  ];
  // Indicadores añadidos a partir del inventario de España en Datos (fuentes originales: INE, AEAT, Idescat, Diputació)
  const NA = { ca: "Agència Tributària, estadística dels declarants de l'IRPF per municipis (anuari estadístic, sèrie des del 2013). Només municipis de més de 1.000 habitants. Espanya: territori de règim comú, sense el País Basc ni Navarra.", es: "Agencia Tributaria, estadística de los declarantes del IRPF por municipios (anuario estadístico, serie desde 2013). Solo municipios de más de 1.000 habitantes. España: territorio de régimen común, sin el País Vasco ni Navarra." };
  // IRPF municipal (m.irpf: {clave: {año: valor}}) y referencias D.irpf_ref: {clave: {año: {gi, cat, esp}}}
  const IV = (k) => (m, a) => (a != null && m.irpf && m.irpf[k] && m.irpf[k][a] != null ? m.irpf[k][a] : null);
  const IVR = (k, z) => (a) => { const r = D.irpf_ref && D.irpf_ref[k] && D.irpf_ref[k][a]; return r && r[z] != null ? r[z] : null; };
  const IRPF = [
    ["bruta", ["Renda declarada", "Renda bruta mitjana per declaració de l'IRPF (€)"], ["Renta declarada", "Renta bruta media por declaración del IRPF (€)"], EU],
    ["disp", ["Renda disponible declarada", "Renda disponible mitjana per declaració, després d'impostos (€)"], ["Renta disponible declarada", "Renta disponible media por declaración, después de impuestos (€)"], EU],
    ["decl", ["Declaracions", "Declaracions de l'IRPF per 100 habitants"], ["Declaraciones", "Declaraciones del IRPF por 100 habitantes"], N0],
    ["tipus", ["Tipus efectiu", "Quota de l'IRPF sobre la renda bruta declarada (%)"], ["Tipo efectivo", "Cuota del IRPF sobre la renta bruta declarada (%)"], P1],
    ["treball", ["Rendes del treball", "Rendes del treball i pensions (% de la renda declarada)"], ["Rentas del trabajo", "Rentas del trabajo y pensiones (% de la renta declarada)"], P1],
    ["capital", ["Rendes del capital", "Rendes del capital, lloguers i guanys patrimonials (% de la renda declarada)"], ["Rentas del capital", "Rentas del capital, alquileres y ganancias patrimoniales (% de la renta declarada)"], P1],
    ["activitats", ["Rendes d'activitats", "Rendes d'activitats econòmiques: autònoms i professionals (% de la renda declarada)"], ["Rentas de actividades", "Rentas de actividades económicas: autónomos y profesionales (% de la renta declarada)"], P1],
    ["pp", ["Plans de pensions", "Declaracions amb aportacions a plans de pensions (%)"], ["Planes de pensiones", "Declaraciones con aportaciones a planes de pensiones (%)"], P1],
    ["fills", ["Declaracions amb fills", "Declaracions amb fills a càrrec (%)"], ["Declaraciones con hijos", "Declaraciones con hijos a cargo (%)"], P1],
  ];
  const NX = { ca: "Xifra, Diputació de Girona.", es: "Xifra, Diputació de Girona." };
  const NP = { ca: "Generalitat de Catalunya, liquidació dels pressupostos dels ens locals. Últim any liquidat.", es: "Generalitat de Catalunya, liquidación de los presupuestos de los entes locales. Último año liquidado." };
  const NE = { ca: "Idescat, El municipi en xifres.", es: "Idescat, El municipio en cifras." };
  const NOUS = [
    { id: "renda_bruta", tema: "ren", ca: ["Renda bruta per persona", "Renda bruta mitjana per persona (€)"], es: ["Renta bruta por persona", "Renta bruta media por persona (€)"], a: 2024, v: (m) => val(m.renda_bruta, "2024"), t: (m, a) => val(m.renda_bruta, a), s: S("renta_bruta"), nota: { ca: "INE, Atlas de distribució de la renda de les llars. Abans d'impostos i cotitzacions.", es: "INE, Atlas de distribución de la renta de los hogares. Antes de impuestos y cotizaciones." }, ...EU },
    { id: "renda_bruta_llar", tema: "ren", ca: ["Renda bruta per llar", "Renda bruta mitjana per llar (€)"], es: ["Renta bruta por hogar", "Renta bruta media por hogar (€)"], a: 2024, v: (m) => val(m.renda_bruta_llar, "2024"), t: (m, a) => val(m.renda_bruta_llar, a), nota: { ca: "INE, Atlas de distribució de la renda de les llars.", es: "INE, Atlas de distribución de la renta de los hogares." }, ...EU },
    { id: "renda_mediana", tema: "ren", ca: ["Renda mediana", "Renda mediana per unitat de consum (€)"], es: ["Renta mediana", "Renta mediana por unidad de consumo (€)"], a: 2024, v: (m) => val(m.renda_mediana, "2024"), t: (m, a) => val(m.renda_mediana, a), s: S("renta_mediana"), nota: { ca: "INE, Atlas de distribució de la renda. La meitat de la població en té menys i l'altra meitat, més.", es: "INE, Atlas de distribución de la renta. La mitad de la población tiene menos y la otra mitad, más." }, ...EU },
    { id: "irpf_quota", tema: "ren", ca: ["Quota d'IRPF", "Quota resultant de l'IRPF per declarant (€)"], es: ["Cuota de IRPF", "Cuota resultante del IRPF por declarante (€)"], a: "irpf_quota", v: X("irpf_quota"), nota: NE, ...EU },
    ...IRPF.map(([k, ca, es, fmtk, ext]) => ({ id: "aeat_" + k, tema: "ren", ca, es, a: "irpf", sumable: false, v: (m) => IV(k)(m, D.anys && D.anys.irpf), t: IV(k), pv: IVR(k, "gi"),
      ref: () => { const a = anyActiu() || (D.anys && D.anys.irpf); return { cat: IVR(k, "cat")(a), esp: IVR(k, "esp")(a) }; }, nota: NA, ...fmtk, ...(ext || {}) })),
    { id: "aeat_var", tema: "ren", sumable: false, ca: ["Com ha crescut la renda declarada", "Variació de la renda bruta mitjana per declaració des del 2013 (%)"], es: ["Cuánto ha crecido la renta declarada", "Variación de la renta bruta media por declaración desde 2013 (%)"], a: "irpf",
      v: (m) => { const s = m.irpf && m.irpf.bruta; const u = D.anys && D.anys.irpf; return s && s[2013] && s[u] ? (s[u] / s[2013] - 1) * 100 : null; },
      ref: () => { const R = (D.irpf_ref || {}).bruta || {}, u = D.anys && D.anys.irpf, f = (z) => (R[2013] && R[u] && R[2013][z] ? (R[u][z] / R[2013][z] - 1) * 100 : null); return { gi: f("gi"), cat: f("cat"), esp: f("esp") }; },
      nota: NA, f: (v) => `${v > 0 ? "+" : ""}${pct(v, 1)}`, c: (v) => `${v > 0 ? "+" : ""}${pct(v, 0)}` },
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
    { id: "biblio", tema: "cul", ca: ["Biblioteques", "Biblioteques per 10.000 habitants"], es: ["Bibliotecas", "Bibliotecas por 10.000 habitantes"], a: "biblio", v: X("biblio"), nota: NX, ...N1 },
    { id: "museus", sumable: false, tema: "cul", ca: ["Museus", "Museus i col·leccions"], es: ["Museos", "Museos y colecciones"], a: "museus", v: X("museus"), nota: NX, ...N0 },
    { id: "explotacions", tema: "ter", ca: ["Explotacions agràries", "Explotacions agràries per 1.000 habitants"], es: ["Explotaciones agrarias", "Explotaciones agrarias por 1.000 habitantes"], a: "explotacions", v: X("explotacions"), nota: { ca: "Cens agrari 2020 (INE), via Xifra.", es: "Censo agrario 2020 (INE), vía Xifra." }, ...N1 },
    { id: "furgonetes", tema: "ter", ca: ["Furgonetes i camions", "Vehicles industrials per 1.000 habitants"], es: ["Furgonetas y camiones", "Vehículos industriales por 1.000 habitantes"], a: "furgonetes", v: X("furgonetes"), nota: NE, ...N0 },
    // Resto de la ficha EMEX de Idescat (2026-11-17)
    { id: "dones", tema: "pob", ca: ["Dones", "Dones (% de la població)"], es: ["Mujeres", "Mujeres (% de la población)"], a: "dones", v: X("dones"), nota: NE, ...P1 },
    { id: "majors85", tema: "pob", ca: ["85 anys i més", "Població de 85 anys i més (%)"], es: ["85 años y más", "Población de 85 años y más (%)"], a: "majors85", v: X("majors85"), nota: NE, ...P1 },
    { id: "nascuts_cat", tema: "pob", ca: ["Nascuts a Catalunya", "Població nascuda a Catalunya (%)"], es: ["Nacidos en Cataluña", "Población nacida en Cataluña (%)"], a: "nascuts_cat", v: X("nascuts_cat"), nota: NE, ...P0 },
    { id: "nascuts_esp", tema: "pob", ca: ["Nascuts a la resta d'Espanya", "Població nascuda a la resta d'Espanya (%)"], es: ["Nacidos en el resto de España", "Población nacida en el resto de España (%)"], a: "nascuts_esp", v: X("nascuts_esp"), nota: NE, ...P1 },
    { id: "creix_natural", tema: "pob", ca: ["Creixement natural", "Naixements menys defuncions per 1.000 habitants"], es: ["Crecimiento natural", "Nacimientos menos defunciones por 1.000 habitantes"], a: "creix_natural", v: X("creix_natural"), nota: NE, f: (v) => `${v > 0 ? "+" : ""}${fmt(v, 1)}`, c: (v) => `${v > 0 ? "+" : ""}${fmt(v, Math.abs(v) < 10 && v % 1 ? 1 : 0)}`, ...N1 },
    { id: "creix_migratori", tema: "pob", ca: ["Creixement migratori", "Saldo migratori total per 1.000 habitants"], es: ["Crecimiento migratorio", "Saldo migratorio total por 1.000 habitantes"], a: "creix_migratori", v: X("creix_migratori"), nota: NE, f: (v) => `${v > 0 ? "+" : ""}${fmt(v, 1)}`, c: (v) => `${v > 0 ? "+" : ""}${fmt(v, Math.abs(v) < 10 && v % 1 ? 1 : 0)}`, ...N1 },
    { id: "emigracio", tema: "pob", ca: ["Emigració a l'estranger", "Persones que se'n van a viure a l'estranger per 1.000 habitants"], es: ["Emigración al extranjero", "Personas que se van a vivir al extranjero por 1.000 habitantes"], a: "emigracio", v: X("emigracio"), nota: NE, ...N1 },
    { id: "saldo_exterior", tema: "pob", ca: ["Saldo amb l'estranger", "Immigració menys emigració exterior per 1.000 habitants"], es: ["Saldo con el extranjero", "Inmigración menos emigración exterior por 1.000 habitantes"], a: "saldo_exterior", v: X("saldo_exterior"), nota: NE, f: (v) => `${v > 0 ? "+" : ""}${fmt(v, 1)}`, c: (v) => `${v > 0 ? "+" : ""}${fmt(v, Math.abs(v) < 10 && v % 1 ? 1 : 0)}`, ...N1 },
    { id: "immig_ue", sumable: false, tema: "pob", ca: ["Immigració de la UE", "Immigrants de l'estranger que venen de la UE (%)"], es: ["Inmigración de la UE", "Inmigrantes del extranjero que vienen de la UE (%)"], a: "immig_ue", v: X("immig_ue"), nota: { ca: "Idescat, El municipi en xifres. Només municipis amb 10 immigracions externes o més.", es: "Idescat, El municipio en cifras. Solo municipios con 10 inmigraciones externas o más." }, ...P0 },
    { id: "matrimonis", tema: "pob", ca: ["Matrimonis", "Matrimonis per 1.000 habitants"], es: ["Matrimonios", "Matrimonios por 1.000 habitantes"], a: "matrimonis", v: X("matrimonis"), nota: NE, ...N1 },
    { id: "parelles_fills", sumable: false, tema: "pob", ca: ["Parelles amb fills", "Llars de parelles amb fills (%)"], es: ["Parejas con hijos", "Hogares de parejas con hijos (%)"], a: "parelles_fills", v: X("parelles_fills"), nota: { ca: "Cens de població i habitatges 2021 (INE), via Idescat, El municipi en xifres.", es: "Censo de población y viviendas 2021 (INE), vía Idescat, El municipio en cifras." }, ...P0 },
    { id: "parelles_sense", sumable: false, tema: "pob", ca: ["Parelles sense fills", "Llars de parelles sense fills (%)"], es: ["Parejas sin hijos", "Hogares de parejas sin hijos (%)"], a: "parelles_sense", v: X("parelles_sense"), nota: { ca: "Cens de població i habitatges 2021 (INE), via Idescat, El municipi en xifres.", es: "Censo de población y viviendas 2021 (INE), vía Idescat, El municipio en cifras." }, ...P0 },
    { id: "llars_5", sumable: false, tema: "pob", ca: ["Llars de 5 o més", "Llars de cinc persones o més (%)"], es: ["Hogares de 5 o más", "Hogares de cinco personas o más (%)"], a: "llars_5", v: X("llars_5"), nota: { ca: "Cens de població i habitatges 2021 (INE), via Idescat, El municipi en xifres.", es: "Censo de población y viviendas 2021 (INE), vía Idescat, El municipio en cifras." }, ...P1 },
    { id: "llegir_cat", sumable: false, tema: "pob", ca: ["Llegeix català", "Població que sap llegir el català (%)"], es: ["Lee catalán", "Población que sabe leer el catalán (%)"], a: "llegir_cat", v: X("llegir_cat"), nota: { ca: "Cens 2011, via Idescat. Població de 2 anys i més.", es: "Censo 2011, vía Idescat. Población de 2 años y más." }, ...P0 },
    { id: "escriure_cat", sumable: false, tema: "pob", ca: ["Escriu català", "Població que sap escriure el català (%)"], es: ["Escribe catalán", "Población que sabe escribir el catalán (%)"], a: "escriure_cat", v: X("escriure_cat"), nota: { ca: "Cens 2011, via Idescat. Població de 2 anys i més.", es: "Censo 2011, vía Idescat. Población de 2 años y más." }, ...P0 },
    { id: "atur_dones", sumable: false, tema: "tre", ca: ["Atur femení", "Dones a l'atur registrat (% dels aturats)"], es: ["Paro femenino", "Mujeres en paro registrado (% de los parados)"], a: "ats", v: (m) => AT("atur_dones")(m, anysDe(IND.find((i) => i.id === "atur_dones")).slice(-1)[0]), t: AT("atur_dones"), pv: ATR("atur_dones", "gi"), ref: () => { const a = anyActiu() || anysDe(IND.find((i) => i.id === "atur_dones")).slice(-1)[0]; return { cat: ATR("atur_dones", "cat")(a), esp: ATR("atur_dones", "esp")(a) }; }, nota: { ca: "SEPE, mitjana anual de les dades mensuals. Només municipis amb 20 aturats o més de mitjana.", es: "SEPE, media anual de los datos mensuales. Solo municipios con 20 parados o más de media." }, ...P0 },
    { id: "atur_serv", sumable: false, tema: "tre", ca: ["Atur als serveis", "Aturats que venen dels serveis (%)"], es: ["Paro en servicios", "Parados que vienen de los servicios (%)"], a: "ats", v: (m) => AT("atur_serv")(m, anysDe(IND.find((i) => i.id === "atur_serv")).slice(-1)[0]), t: AT("atur_serv"), pv: ATR("atur_serv", "gi"), ref: () => { const a = anyActiu() || anysDe(IND.find((i) => i.id === "atur_serv")).slice(-1)[0]; return { cat: ATR("atur_serv", "cat")(a), esp: ATR("atur_serv", "esp")(a) }; }, nota: { ca: "SEPE, mitjana anual de les dades mensuals. Només municipis amb 20 aturats o més de mitjana.", es: "SEPE, media anual de los datos mensuales. Solo municipios con 20 parados o más de media." }, ...P0 },
    { id: "atur_ind", sumable: false, tema: "tre", ca: ["Atur a la indústria", "Aturats que venen de la indústria (%)"], es: ["Paro en la industria", "Parados que vienen de la industria (%)"], a: "ats", v: (m) => AT("atur_ind")(m, anysDe(IND.find((i) => i.id === "atur_ind")).slice(-1)[0]), t: AT("atur_ind"), pv: ATR("atur_ind", "gi"), ref: () => { const a = anyActiu() || anysDe(IND.find((i) => i.id === "atur_ind")).slice(-1)[0]; return { cat: ATR("atur_ind", "cat")(a), esp: ATR("atur_ind", "esp")(a) }; }, nota: { ca: "SEPE, mitjana anual de les dades mensuals. Només municipis amb 20 aturats o més de mitjana.", es: "SEPE, media anual de los datos mensuales. Solo municipios con 20 parados o más de media." }, ...P1 },
    { id: "atur_const", sumable: false, tema: "tre", ca: ["Atur a la construcció", "Aturats que venen de la construcció (%)"], es: ["Paro en la construcción", "Parados que vienen de la construcción (%)"], a: "ats", v: (m) => AT("atur_const")(m, anysDe(IND.find((i) => i.id === "atur_const")).slice(-1)[0]), t: AT("atur_const"), pv: ATR("atur_const", "gi"), ref: () => { const a = anyActiu() || anysDe(IND.find((i) => i.id === "atur_const")).slice(-1)[0]; return { cat: ATR("atur_const", "cat")(a), esp: ATR("atur_const", "esp")(a) }; }, nota: { ca: "SEPE, mitjana anual de les dades mensuals. Només municipis amb 20 aturats o més de mitjana.", es: "SEPE, media anual de los datos mensuales. Solo municipios con 20 parados o más de media." }, ...P1 },
    { id: "atur_agri", sumable: false, tema: "tre", ca: ["Atur a l'agricultura", "Aturats que venen de l'agricultura (%)"], es: ["Paro en la agricultura", "Parados que vienen de la agricultura (%)"], a: "ats", v: (m) => AT("atur_agri")(m, anysDe(IND.find((i) => i.id === "atur_agri")).slice(-1)[0]), t: AT("atur_agri"), pv: ATR("atur_agri", "gi"), ref: () => { const a = anyActiu() || anysDe(IND.find((i) => i.id === "atur_agri")).slice(-1)[0]; return { cat: ATR("atur_agri", "cat")(a), esp: ATR("atur_agri", "esp")(a) }; }, nota: { ca: "SEPE, mitjana anual de les dades mensuals. Només municipis amb 20 aturats o més de mitjana.", es: "SEPE, media anual de los datos mensuales. Solo municipios con 20 parados o más de media." }, ...P1 },
    { id: "atur_nou", sumable: false, tema: "tre", ca: ["Atur sense feina anterior", "Aturats que busquen la primera feina (%)"], es: ["Paro sin empleo anterior", "Parados que buscan su primer empleo (%)"], a: "ats", v: (m) => AT("atur_nou")(m, anysDe(IND.find((i) => i.id === "atur_nou")).slice(-1)[0]), t: AT("atur_nou"), pv: ATR("atur_nou", "gi"), ref: () => { const a = anyActiu() || anysDe(IND.find((i) => i.id === "atur_nou")).slice(-1)[0]; return { cat: ATR("atur_nou", "cat")(a), esp: ATR("atur_nou", "esp")(a) }; }, nota: { ca: "SEPE, mitjana anual de les dades mensuals. Només municipis amb 20 aturats o més de mitjana.", es: "SEPE, media anual de los datos mensuales. Solo municipios con 20 parados o más de media." }, ...P1 },
    { id: "pensionistes_dones", sumable: false, tema: "tre", ca: ["Pensionistes dones", "Dones entre els pensionistes de la Seguretat Social (%)"], es: ["Pensionistas mujeres", "Mujeres entre los pensionistas de la Seguridad Social (%)"], a: "pensionistes_dones", v: X("pensionistes_dones"), nota: NE, ...P0 },
    { id: "vab_agri", sumable: false, tema: "tre", ca: ["Economia: agricultura", "Pes de l'agricultura en el valor afegit brut (%)"], es: ["Economía: agricultura", "Peso de la agricultura en el valor añadido bruto (%)"], a: "vab_agri", v: X("vab_agri"), nota: { ca: "Idescat, PIB municipal (estimació), El municipi en xifres. Només municipis de més de 5.000 habitants.", es: "Idescat, PIB municipal (estimación), El municipio en cifras. Solo municipios de más de 5.000 habitantes." }, ...P1 },
    { id: "vab_ind", sumable: false, tema: "tre", ca: ["Economia: indústria", "Pes de la indústria en el valor afegit brut (%)"], es: ["Economía: industria", "Peso de la industria en el valor añadido bruto (%)"], a: "vab_ind", v: X("vab_ind"), nota: { ca: "Idescat, PIB municipal (estimació), El municipi en xifres. Només municipis de més de 5.000 habitants.", es: "Idescat, PIB municipal (estimación), El municipio en cifras. Solo municipios de más de 5.000 habitantes." }, ...P1 },
    { id: "vab_const", sumable: false, tema: "tre", ca: ["Economia: construcció", "Pes de la construcció en el valor afegit brut (%)"], es: ["Economía: construcción", "Peso de la construcción en el valor añadido bruto (%)"], a: "vab_const", v: X("vab_const"), nota: { ca: "Idescat, PIB municipal (estimació), El municipi en xifres. Només municipis de més de 5.000 habitants.", es: "Idescat, PIB municipal (estimación), El municipio en cifras. Solo municipios de más de 5.000 habitantes." }, ...P1 },
    { id: "vab_serv", sumable: false, tema: "tre", ca: ["Economia: serveis", "Pes dels serveis en el valor afegit brut (%)"], es: ["Economía: servicios", "Peso de los servicios en el valor añadido bruto (%)"], a: "vab_serv", v: X("vab_serv"), nota: { ca: "Idescat, PIB municipal (estimació), El municipi en xifres. Només municipis de més de 5.000 habitants.", es: "Idescat, PIB municipal (estimación), El municipio en cifras. Solo municipios de más de 5.000 habitantes." }, ...P1 },
    { id: "pib", sumable: false, tema: "tre", ca: ["PIB", "Producte interior brut (milions d'euros)"], es: ["PIB", "Producto interior bruto (millones de euros)"], a: "pib", v: X("pib"), nota: { ca: "Idescat, PIB municipal (estimació), El municipi en xifres. Només municipis de més de 5.000 habitants.", es: "Idescat, PIB municipal (estimación), El municipio en cifras. Solo municipios de más de 5.000 habitantes." }, ...N0 },
    { id: "propietat_pct", sumable: false, tema: "hab", ca: ["Llars de propietat", "Habitatges principals de propietat (%)"], es: ["Hogares en propiedad", "Viviendas principales en propiedad (%)"], a: "propietat_pct", v: X("propietat_pct"), nota: { ca: "Cens de població i habitatges 2021 (INE), via Idescat, El municipi en xifres.", es: "Censo de población y viviendas 2021 (INE), vía Idescat, El municipio en cifras." }, ...P0 },
    { id: "cedits_pct", sumable: false, tema: "hab", ca: ["Habitatges cedits", "Habitatges principals cedits o d'altres formes (%)"], es: ["Viviendas cedidas", "Viviendas principales cedidas u otras formas (%)"], a: "cedits_pct", v: X("cedits_pct"), nota: { ca: "Cens de població i habitatges 2021 (INE), via Idescat, El municipi en xifres.", es: "Censo de población y viviendas 2021 (INE), vía Idescat, El municipio en cifras." }, ...P1 },
    { id: "hpo_iniciats", sumable: false, tema: "hab", ca: ["Protegits iniciats", "Habitatges de protecció oficial iniciats"], es: ["Protegidas iniciadas", "Viviendas de protección oficial iniciadas"], a: "hpo_iniciats", v: X("hpo_iniciats"), nota: NE, ...N0 },
    { id: "altitud", sumable: false, tema: "ter", ca: ["Altitud", "Altitud del nucli principal (m)"], es: ["Altitud", "Altitud del núcleo principal (m)"], a: "altitud", v: X("altitud"), nota: NE, ...N0 },
    { id: "pavellons", sumable: false, tema: "ter", ca: ["Pavellons", "Pavellons (nombre)"], es: ["Pabellones", "Pabellones (número)"], a: "pavellons", v: X("pavellons"), nota: { ca: "Cens d'equipaments esportius de Catalunya, via Idescat.", es: "Censo de equipamientos deportivos de Cataluña, vía Idescat." }, ...N0 },
    { id: "pistes_poli", sumable: false, tema: "ter", ca: ["Pistes poliesportives", "Pistes poliesportives (nombre)"], es: ["Pistas polideportivas", "Pistas polideportivas (número)"], a: "pistes_poli", v: X("pistes_poli"), nota: { ca: "Cens d'equipaments esportius de Catalunya, via Idescat.", es: "Censo de equipamientos deportivos de Cataluña, vía Idescat." }, ...N0 },
    { id: "camps_esport", sumable: false, tema: "ter", ca: ["Camps poliesportius", "Camps poliesportius (nombre)"], es: ["Campos polideportivos", "Campos polideportivos (número)"], a: "camps_esport", v: X("camps_esport"), nota: { ca: "Cens d'equipaments esportius de Catalunya, via Idescat.", es: "Censo de equipamientos deportivos de Cataluña, vía Idescat." }, ...N0 },
    { id: "sales_esport", sumable: false, tema: "ter", ca: ["Sales esportives", "Sales esportives (nombre)"], es: ["Salas deportivas", "Salas deportivas (número)"], a: "sales_esport", v: X("sales_esport"), nota: { ca: "Cens d'equipaments esportius de Catalunya, via Idescat.", es: "Censo de equipamientos deportivos de Cataluña, vía Idescat." }, ...N0 },
    { id: "atletisme", sumable: false, tema: "ter", ca: ["Pistes d'atletisme", "Pistes d'atletisme (nombre)"], es: ["Pistas de atletismo", "Pistas de atletismo (número)"], a: "atletisme", v: X("atletisme"), nota: { ca: "Cens d'equipaments esportius de Catalunya, via Idescat.", es: "Censo de equipamientos deportivos de Cataluña, vía Idescat." }, ...N0 },
    { id: "residus_ind", sumable: false, tema: "ene", ca: ["Residus industrials", "Residus industrials declarats (tones)"], es: ["Residuos industriales", "Residuos industriales declarados (toneladas)"], a: "residus_ind", v: X("residus_ind"), nota: { ca: "Agència de Residus de Catalunya, via Idescat. Segons la ubicació de l'establiment.", es: "Agència de Residus de Catalunya, vía Idescat. Según la ubicación del establecimiento." }, ...N0 },
    { id: "residus_ind_est", sumable: false, tema: "ene", ca: ["Indústries amb residus", "Establiments amb declaració anual de residus"], es: ["Industrias con residuos", "Establecimientos con declaración anual de residuos"], a: "residus_ind_est", v: X("residus_ind_est"), nota: { ca: "Agència de Residus de Catalunya, via Idescat.", es: "Agència de Residus de Catalunya, vía Idescat." }, ...N0 },
    { id: "agr_sau_ha", sumable: false, tema: "agr", ca: ["Superfície agrícola (ha)", "Superfície agrícola (hectàrees)"], es: ["Superficie agrícola (ha)", "Superficie agrícola (hectáreas)"], a: "agr_sau_ha", v: X("agr_sau_ha"), nota: { ca: "Cens agrari 2020 (INE), via Idescat, El municipi en xifres. Hectàrees.", es: "Censo agrario 2020 (INE), vía Idescat, El municipio en cifras. Hectáreas." }, ...N0 },
    { id: "agr_llaurades", sumable: false, tema: "agr", ca: ["Terres llaurades", "Terres llaurades (hectàrees)"], es: ["Tierras labradas", "Tierras labradas (hectáreas)"], a: "agr_llaurades", v: X("agr_llaurades"), nota: { ca: "Cens agrari 2020 (INE), via Idescat, El municipi en xifres. Hectàrees.", es: "Censo agrario 2020 (INE), vía Idescat, El municipio en cifras. Hectáreas." }, ...N0 },
    { id: "agr_pastures", sumable: false, tema: "agr", ca: ["Pastures permanents", "Pastures permanents (hectàrees)"], es: ["Pastos permanentes", "Pastos permanentes (hectáreas)"], a: "agr_pastures", v: X("agr_pastures"), nota: { ca: "Cens agrari 2020 (INE), via Idescat, El municipi en xifres. Hectàrees.", es: "Censo agrario 2020 (INE), vía Idescat, El municipio en cifras. Hectáreas." }, ...N0 },
    { id: "agr_cereal", sumable: false, tema: "agr", ca: ["Cereals", "Cereals (hectàrees)"], es: ["Cereales", "Cereales (hectáreas)"], a: "agr_cereal", v: X("agr_cereal"), nota: { ca: "Cens agrari 2020 (INE), via Idescat, El municipi en xifres. Hectàrees.", es: "Censo agrario 2020 (INE), vía Idescat, El municipio en cifras. Hectáreas." }, ...N0 },
    { id: "agr_farratge", sumable: false, tema: "agr", ca: ["Farratges", "Farratges (hectàrees)"], es: ["Forrajes", "Forrajes (hectáreas)"], a: "agr_farratge", v: X("agr_farratge"), nota: { ca: "Cens agrari 2020 (INE), via Idescat, El municipi en xifres. Hectàrees.", es: "Censo agrario 2020 (INE), vía Idescat, El municipio en cifras. Hectáreas." }, ...N0 },
    { id: "agr_herbacis", sumable: false, tema: "agr", ca: ["Altres herbacis", "Altres herbacis (hectàrees)"], es: ["Otros herbáceos", "Otros herbáceos (hectáreas)"], a: "agr_herbacis", v: X("agr_herbacis"), nota: { ca: "Cens agrari 2020 (INE), via Idescat, El municipi en xifres. Hectàrees.", es: "Censo agrario 2020 (INE), vía Idescat, El municipio en cifras. Hectáreas." }, ...N0 },
    { id: "agr_guarets", sumable: false, tema: "agr", ca: ["Guarets", "Guarets (hectàrees)"], es: ["Barbechos", "Barbechos (hectáreas)"], a: "agr_guarets", v: X("agr_guarets"), nota: { ca: "Cens agrari 2020 (INE), via Idescat, El municipi en xifres. Hectàrees.", es: "Censo agrario 2020 (INE), vía Idescat, El municipio en cifras. Hectáreas." }, ...N0 },
    { id: "agr_vinya", sumable: false, tema: "agr", ca: ["Vinya", "Vinya (hectàrees)"], es: ["Viñedo", "Viñedo (hectáreas)"], a: "agr_vinya", v: X("agr_vinya"), nota: { ca: "Cens agrari 2020 (INE), via Idescat, El municipi en xifres. Hectàrees.", es: "Censo agrario 2020 (INE), vía Idescat, El municipio en cifras. Hectáreas." }, ...N0 },
    { id: "agr_olivera", sumable: false, tema: "agr", ca: ["Oliveres", "Oliveres (hectàrees)"], es: ["Olivar", "Olivar (hectáreas)"], a: "agr_olivera", v: X("agr_olivera"), nota: { ca: "Cens agrari 2020 (INE), via Idescat, El municipi en xifres. Hectàrees.", es: "Censo agrario 2020 (INE), vía Idescat, El municipio en cifras. Hectáreas." }, ...N0 },
    { id: "agr_fruiters", sumable: false, tema: "agr", ca: ["Fruiters", "Fruiters (hectàrees)"], es: ["Frutales", "Frutales (hectáreas)"], a: "agr_fruiters", v: X("agr_fruiters"), nota: { ca: "Cens agrari 2020 (INE), via Idescat, El municipi en xifres. Hectàrees.", es: "Censo agrario 2020 (INE), vía Idescat, El municipio en cifras. Hectáreas." }, ...N0 },
    { id: "agr_llenyosos", sumable: false, tema: "agr", ca: ["Altres llenyosos", "Altres llenyosos (hectàrees)"], es: ["Otros leñosos", "Otros leñosos (hectáreas)"], a: "agr_llenyosos", v: X("agr_llenyosos"), nota: { ca: "Cens agrari 2020 (INE), via Idescat, El municipi en xifres. Hectàrees.", es: "Censo agrario 2020 (INE), vía Idescat, El municipio en cifras. Hectáreas." }, ...N0 },
    { id: "agr_hivernacle", sumable: false, tema: "agr", ca: ["Hivernacles", "Hivernacles (hectàrees)"], es: ["Invernaderos", "Invernaderos (hectáreas)"], a: "agr_hivernacle", v: X("agr_hivernacle"), nota: { ca: "Cens agrari 2020 (INE), via Idescat, El municipi en xifres. Hectàrees.", es: "Censo agrario 2020 (INE), vía Idescat, El municipio en cifras. Hectáreas." }, ...N1 },
    { id: "agr_horts", sumable: false, tema: "agr", ca: ["Horts familiars", "Horts familiars (hectàrees)"], es: ["Huertos familiares", "Huertos familiares (hectáreas)"], a: "agr_horts", v: X("agr_horts"), nota: { ca: "Cens agrari 2020 (INE), via Idescat, El municipi en xifres. Hectàrees.", es: "Censo agrario 2020 (INE), vía Idescat, El municipio en cifras. Hectáreas." }, ...N1 },
    { id: "agr_expl_sau", sumable: false, tema: "agr", ca: ["Explotacions agrícoles", "Explotacions amb superfície agrícola"], es: ["Explotaciones agrícolas", "Explotaciones con superficie agrícola"], a: "agr_expl_sau", v: X("agr_expl_sau"), nota: { ca: "Cens agrari 2020 (INE), via Idescat.", es: "Censo agrario 2020 (INE), vía Idescat." }, ...N0 },
    { id: "agr_expl_ram", sumable: false, tema: "agr", ca: ["Explotacions ramaderes", "Explotacions amb ramaderia"], es: ["Explotaciones ganaderas", "Explotaciones con ganadería"], a: "agr_expl_ram", v: X("agr_expl_ram"), nota: { ca: "Cens agrari 2020 (INE), via Idescat.", es: "Censo agrario 2020 (INE), vía Idescat." }, ...N0 },
    { id: "ram_porcs_hab", tema: "agr", ca: ["Porcs per habitant", "Caps de porcí per habitant"], es: ["Cerdos por habitante", "Cabezas de porcino por habitante"], a: "ram_porcs_hab", v: X("ram_porcs_hab"), nota: { ca: "Cens agrari 2020 (INE), via Idescat, El municipi en xifres. Caps de bestiar. Sense dada: secret estadístic o cap explotació.", es: "Censo agrario 2020 (INE), vía Idescat, El municipio en cifras. Cabezas de ganado. Sin dato: secreto estadístico o ninguna explotación." }, ...N1 },
    { id: "ram_porcs", sumable: false, tema: "agr", ca: ["Porcí", "Caps de bestiar: porcí"], es: ["Porcino", "Cabezas de ganado: porcino"], a: "ram_porcs", v: X("ram_porcs"), nota: { ca: "Cens agrari 2020 (INE), via Idescat, El municipi en xifres. Caps de bestiar. Sense dada: secret estadístic o cap explotació.", es: "Censo agrario 2020 (INE), vía Idescat, El municipio en cifras. Cabezas de ganado. Sin dato: secreto estadístico o ninguna explotación." }, ...N0 },
    { id: "ram_bovins", sumable: false, tema: "agr", ca: ["Boví", "Caps de bestiar: boví"], es: ["Bovino", "Cabezas de ganado: bovino"], a: "ram_bovins", v: X("ram_bovins"), nota: { ca: "Cens agrari 2020 (INE), via Idescat, El municipi en xifres. Caps de bestiar. Sense dada: secret estadístic o cap explotació.", es: "Censo agrario 2020 (INE), vía Idescat, El municipio en cifras. Cabezas de ganado. Sin dato: secreto estadístico o ninguna explotación." }, ...N0 },
    { id: "ram_ovins", sumable: false, tema: "agr", ca: ["Oví", "Caps de bestiar: oví"], es: ["Ovino", "Cabezas de ganado: ovino"], a: "ram_ovins", v: X("ram_ovins"), nota: { ca: "Cens agrari 2020 (INE), via Idescat, El municipi en xifres. Caps de bestiar. Sense dada: secret estadístic o cap explotació.", es: "Censo agrario 2020 (INE), vía Idescat, El municipio en cifras. Cabezas de ganado. Sin dato: secreto estadístico o ninguna explotación." }, ...N0 },
    { id: "ram_cabres", sumable: false, tema: "agr", ca: ["Cabrum", "Caps de bestiar: cabrum"], es: ["Caprino", "Cabezas de ganado: caprino"], a: "ram_cabres", v: X("ram_cabres"), nota: { ca: "Cens agrari 2020 (INE), via Idescat, El municipi en xifres. Caps de bestiar. Sense dada: secret estadístic o cap explotació.", es: "Censo agrario 2020 (INE), vía Idescat, El municipio en cifras. Cabezas de ganado. Sin dato: secreto estadístico o ninguna explotación." }, ...N0 },
    { id: "ram_aviram", sumable: false, tema: "agr", ca: ["Aviram", "Caps de bestiar: aviram"], es: ["Aves", "Cabezas de ganado: aves"], a: "ram_aviram", v: X("ram_aviram"), nota: { ca: "Cens agrari 2020 (INE), via Idescat, El municipi en xifres. Caps de bestiar. Sense dada: secret estadístic o cap explotació.", es: "Censo agrario 2020 (INE), vía Idescat, El municipio en cifras. Cabezas de ganado. Sin dato: secreto estadístico o ninguna explotación." }, ...N0 },
    { id: "ram_conills", sumable: false, tema: "agr", ca: ["Conilles mares", "Caps de bestiar: conilles mares"], es: ["Conejas madre", "Cabezas de ganado: conejas madre"], a: "ram_conills", v: X("ram_conills"), nota: { ca: "Cens agrari 2020 (INE), via Idescat, El municipi en xifres. Caps de bestiar. Sense dada: secret estadístic o cap explotació.", es: "Censo agrario 2020 (INE), vía Idescat, El municipio en cifras. Cabezas de ganado. Sin dato: secreto estadístico o ninguna explotación." }, ...N0 },
    { id: "ram_equins", sumable: false, tema: "agr", ca: ["Equí", "Caps de bestiar: equí"], es: ["Equino", "Cabezas de ganado: equino"], a: "ram_equins", v: X("ram_equins"), nota: { ca: "Cens agrari 2020 (INE), via Idescat, El municipi en xifres. Caps de bestiar. Sense dada: secret estadístic o cap explotació.", es: "Censo agrario 2020 (INE), vía Idescat, El municipio en cifras. Cabezas de ganado. Sin dato: secreto estadístico o ninguna explotación." }, ...N0 },
  ];
  NOUS.forEach((n) => { let k = -1; IND.forEach((i, j) => { if (i.tema === n.tema) k = j; }); IND.splice(k + 1, 0, n); });
  // Turismo: también la población estacional, las segundas residencias y los pisos turísticos del tema Vivienda
  ["estacional", "segones", "hut"].forEach((id, k) => { const m = IND.find((i) => i.id === id), p = IND.findIndex((i) => i.id === "tur_pl_rural_h"); if (m && p >= 0) IND.splice(p + 1 + k, 0, { ...m, id: "tur_" + id + "_c", tema: "tur" }); });
  // Los indicadores nuevos de la EMEX, junto a los que ya había del mismo asunto
  [["dones", "edat"], ["majors85", "majors65"], ["nascuts_cat", "nascuts_estr"], ["nascuts_esp", "nascuts_cat"], ["llegir_cat", "enten_cat"], ["escriure_cat", "llegir_cat"],
   ["parelles_fills", "monoparentals"], ["parelles_sense", "parelles_fills"], ["llars_5", "parelles_sense"], ["creix_natural", "creixement"], ["creix_migratori", "creix_natural"],
   ["emigracio", "immigracio"], ["saldo_exterior", "emigracio"], ["immig_ue", "saldo_exterior"],
   ["atur_dones", "atur_estr"], ["atur_serv", "atur_dones"], ["atur_ind", "atur_serv"], ["atur_const", "atur_ind"], ["atur_agri", "atur_const"], ["atur_nou", "atur_agri"],
   ["propietat_pct", "lloguer_pct"], ["cedits_pct", "propietat_pct"]].forEach(([id, ant]) => {
    const k = IND.findIndex((i) => i.id === id); if (k < 0 || !IND.some((i) => i.id === ant)) return;
    const [x] = IND.splice(k, 1); IND.splice(IND.findIndex((i) => i.id === ant) + 1, 0, x);
  });
  // Campo: también la superficie agrícola y las explotaciones del tema Territorio
  ["sau", "explotacions"].forEach((id, k) => { const m = IND.find((i) => i.id === id), p = IND.findIndex((i) => i.tema === "agr"); if (m && p >= 0) IND.splice(p + k, 0, { ...m, id: "agr_" + id + "_c", tema: "agr" }); });
  // Los indicadores de coyuntura muestran el último periodo con datos
  // Las matriculaciones mensuales también en el tema Vehicles, después del parque
  { const m = IND.find((i) => i.id === "cj_mat"), p = IND.findIndex((i) => i.id === "veh_tur_h"); if (m && p >= 0) IND.splice(p + 1, 0, { ...m, id: "veh_mat", tema: "veh" }); }
  ["cj_trf_vell", "cj_trf"].forEach((id) => { const m = IND.find((i) => i.id === id), p = IND.findIndex((i) => i.id === "veh_mat"); if (m && p >= 0) IND.splice(p + 1, 0, { ...m, id: id.replace("cj_", "veh_"), tema: "veh" }); });
  IND.forEach((i) => { if (i.per) i.v = (m) => (D.cj ? i.t(m, anysDe(i).slice(-1)[0]) : null); });
  const nomInd = (i, curt) => {
    const txt = i[LANG][curt ? 0 : 1];
    if (curt) return txt;
    if (i.el) { const c = elInfo(); return c ? `${txt}\u00a0· ${c.n[LANG]}` : txt; }
    const a = i === ind && anyActiu() ? anyActiu() : i.uk ? anysDe(i).slice(-1)[0] : typeof i.a === "number" ? i.a : i.a && D.anys ? D.anys[i.a] : null;
    const ap = i.per && !a && D.cj ? anysDe(i).slice(-1)[0] : a;
    return ap ? `${txt} · ${etPer(String(ap))}` : txt;
  };
  let tema = "ren";
  // Municipios que se rotulan en el mapa (capitales de comarca y grandes poblaciones)
  const ROTULS = ["Girona", "Figueres", "Olot", "Ripoll", "Puigcerdà", "Banyoles", "la Bisbal d'Empordà", "Santa Coloma de Farners", "Blanes", "Lloret de Mar", "Palamós", "Roses", "Sant Feliu de Guíxols"];
  const ROTULS_MOBIL = ["Girona", "Figueres", "Olot", "Ripoll", "Puigcerdà", "Blanes", "Palamós"];

  let mapa = null, geoMun = null, geoSec = null, SEC = {}, nivell = "mun", ind = null, llindars = [];
  // Niveles por áreas (salud y policía): geometría y datos por código de área
  const NIVELLS = ["mun", "sec", "abs", "abp", "aar", "pj", "com", "aire", "met"], ZONA = { abs: { geo: null, d: {} }, abp: { geo: null, d: {} }, aar: { geo: null, d: {} }, pj: { geo: null, d: {} }, com: { geo: null, d: {} }, aire: { geo: null, d: {} }, met: { geo: null, d: {} } };
  const esArea = (n) => n === "abs" || n === "abp" || n === "aar" || n === "pj" || n === "com" || n === "aire" || n === "met";
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
      if (i.tema === "acc") D.municipios.forEach((m) => Object.values(m.acc || {}).forEach((o) => Object.keys(o).forEach((a) => tots.add(a))));
      if (i.tema === "cul") D.municipios.forEach((m) => Object.values(m.cul || {}).forEach((o) => Object.keys(o).forEach((a) => tots.add(a))));
      if (i.tema === "urb") D.municipios.forEach((m) => Object.keys((m.ua || {})[i.uk] || {}).forEach((a) => tots.add(a)));
      if (i.tema === "dp" && i.dk) D.municipios.forEach((m) => Object.keys((m.dp || {})[i.dk] || {}).forEach((a) => tots.add(a)));
      if (i.a === "en_cob") D.municipios.forEach((m) => Object.entries(m.en || {}).forEach(([k, o]) => /^en_cob_/.test(k) && Object.keys(o).forEach((a) => tots.add(a))));
      if (i.a === "amb_seq") D.municipios.forEach((m) => Object.entries(m.amb || {}).forEach(([k, o]) => /^seq_/.test(k) && Object.keys(o).forEach((a) => tots.add(a))));
      if (i.tema === "veh") D.municipios.forEach((m) => Object.values(m.veh || {}).forEach((o) => Object.keys(o).forEach((a) => tots.add(a))));
      if (i.tema === "tur") D.municipios.forEach((m) => Object.values(m.tur || {}).forEach((o) => Object.keys(o).forEach((a) => tots.add(a))));
      if (i.tema === "com") D.municipios.forEach((m) => Object.values(m.com || {}).forEach((o) => Object.keys(o).forEach((a) => tots.add(a))));
      if (["cad", "cad_vm2", "cad_ibi"].includes(i.a)) D.municipios.forEach((m) => Object.values(m.cad || {}).forEach((o) => Object.keys(o).forEach((a) => tots.add(a))));
      if (i.a === "sol") D.municipios.forEach((m) => Object.values(m.sol || {}).forEach((o) => Object.keys(o).forEach((a) => tots.add(a))));
      if (i.a === "irpf") D.municipios.forEach((m) => Object.values(m.irpf || {}).forEach((o) => Object.keys(o).forEach((a) => tots.add(a))));
      if (i.a === "ats") D.municipios.forEach((m) => Object.values(m.ats || {}).forEach((o) => Object.keys(o).forEach((a) => tots.add(a))));
      if (/^hb_/.test(i.a || "")) D.municipios.forEach((m) => Object.values(m.hb || {}).forEach((o) => Object.keys(o).forEach((a) => tots.add(a))));
      cacheAnys[i.id] = [...tots].sort().filter((a) => D.municipios.filter((m) => { const v = i.t(m, a); return v != null && isFinite(v); }).length >= D.municipios.length * (i.cob != null ? i.cob : 0.3));
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
    const tipus = ["A", "G", "M", "E", "R"].filter((tp) => EL.conv.some((c) => c.t === tp));
    const nomT = (tp) => EL.conv.find((c) => c.t === tp).n[LANG].replace(/ \d{4}.*$/, "");
    const etAny = (c) => (c.t === "G" && c.any === 2019 ? `${c.data.slice(5, 7) === "04" ? (LANG === "es" ? "Abr" : "Abr") : "Nov"} 19` : String(c.any));
    el.hidden = false; el.classList.add("el-ctl");
    el.innerHTML = `<div class="el-fila" role="group" aria-label="${tel("tipus")}">${tipus.map((tp) => `<button type="button" data-t="${tp}" aria-pressed="${tp === act.t}">${nomT(tp)}</button>`).join("")}</div>
      <div class="el-fila el-anys" role="group" aria-label="${tel("any")}">${EL.conv.filter((c) => c.t === act.t).map((c) => `<button type="button" data-id="${c.id}" aria-pressed="${c.id === act.id}" title="${c.n[LANG]} · ${c.data.split("-").reverse().join("/")}">${etAny(c)}</button>`).join("")}</div>`;
    const canvia = async (id) => {
      await carregaConv(id); if (absent(ind)) ind = IND.find((i) => i.id === "el_guany");
      if (!disponible(ind, nivell)) { nivell = "mun"; fixat = null; }
      omplirSelector(); botonsNivell(); pinta();
    };
    el.querySelectorAll("[data-t]").forEach((b) => b.addEventListener("click", () => { const l = EL.conv.filter((c) => c.t === b.dataset.t); canvia(l[l.length - 1].id); }));
    el.querySelectorAll("[data-id]").forEach((b) => b.addEventListener("click", () => canvia(b.dataset.id)));
  }
  function para() { if (reproduint) { clearInterval(reproduint); reproduint = null; } }

  let hoverId = null, munPerIne = {}, valorsActuals = [], fixat = null;

  const disponible = (i, n) => (i.el ? n === "mun" || (n === "sec" && (!elInfo() || elInfo().sec !== false)) : n === "mun" ? !!i.v : n === "sec" ? !!i.s : !!i[n]);
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
    document.getElementById("mapa-desc").textContent = ind.nota ? ind.nota[LANG] + (ind.el && nivell === "sec" ? " " + tel("seccions") : "") + (ind.el && elInfo() && elInfo().sec === false ? " " + tel("nomes_mun") : "") : !disponible(ind, "sec") && !esArea(nivell) ? t("nomes_mun") : "";
    controlAnys(); llegenda(); referencies(); ranquing(); info(fixat);
    avisa("pinta");
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
    document.getElementById("mapa-desc").textContent = ind.nota ? ind.nota[LANG] + (ind.el && nivell === "sec" ? " " + tel("seccions") : "") + (ind.el && elInfo() && elInfo().sec === false ? " " + tel("nomes_mun") : "") : t("nomes_mun");
    const max = recompte.length ? recompte[0][1] : 1;
    // Con muchas categorías (nacionalidades) solo se ven las primeras; el resto, desplegable
    const N = ind.maxCat && recompte.length > ind.maxCat + 1 ? ind.maxCat : 0;
    const fila = ([b, k], i) => `<div class="cat-fila"${N && i >= N ? " hidden" : ""}><i style="background:${colCat(b)}"></i><span class="cat-nom">${ind.c(b)}</span><span class="cat-barra"><b style="width:${(k / max) * 100}%;background:${colCat(b)}"></b></span><span class="cat-n">${k}</span></div>`;
    const ll = document.getElementById("llegenda");
    ll.innerHTML = `<div class="cat-llista">${recompte.map(fila).join("")}</div>${N ? `<button type="button" class="cat-mes" aria-expanded="false">${t("cat_mes", recompte.length - N)}</button>` : ""}${ind.notaCat ? `<p class="cat-nota">${ind.notaCat[LANG]}</p>` : ""}`;
    const bm = ll.querySelector(".cat-mes");
    if (bm) bm.addEventListener("click", () => {
      const obert = bm.getAttribute("aria-expanded") !== "true";
      ll.querySelectorAll(".cat-fila").forEach((f, i) => { f.hidden = !obert && i >= N; });
      bm.setAttribute("aria-expanded", String(obert));
      bm.textContent = obert ? t("cat_menys") : t("cat_mes", recompte.length - N);
    });
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
    if (i.ref && !i.t) { const g = i.ref().gi; if (g != null) return g; }
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
      ...(!ind.uk ? [{ nom: t("prov_curt"), cls: "s-prov", d: serieProv(ind) }] : window.UA_ABS.has(ind.uk) ? [] : [{ nom: t("ref_esp"), cls: "s-prov", d: (D.ua && D.ua.z && D.ua.z.esp && D.ua.z.esp[ind.uk]) || {} }]),
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

  // Avisos para mapamobil.js (vista de pantalla completa en móvil y estado en la URL)
  const avisa = (tipus, detail) => document.dispatchEvent(new CustomEvent(`mapa:${tipus}`, { detail }));
  const normal = (s) => String(s).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  let consulta = "";

  function omplirSelector() {
    const cont = document.getElementById("indicadors");
    const q = normal(consulta.trim());
    const temes = TEMES.map((tm) => `<button type="button" class="tema" data-tema="${tm.id}" aria-pressed="${!q && tm.id === tema}">${tm[LANG]}</button>`).join("");
    const llista = q
      ? IND.filter((i) => !(i.buit && i.buit()) && normal([...i.ca, ...i.es].join(" ")).includes(q))
      : IND.filter((i) => !(i.buit && i.buit()) && i.tema === tema);
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
      if (document.body.classList.contains("mm-ple")) { btn.setAttribute("aria-expanded", "true"); document.body.classList.add("menu-ind-obert"); avisa("menu-obert"); return; }
      // Deja el mapa justo bajo la barra y la hoja ocupa el resto de la pantalla
      const cap = document.querySelector(".cap");
      const dalt = (cap && getComputedStyle(cap).position === "sticky" ? cap.offsetHeight : 0) + btn.offsetHeight;
      const caixa = document.querySelector(".mapa-caixa");
      const y = caixa.getBoundingClientRect().top + scrollY - dalt;
      window.scrollTo({ top: y, behavior: "instant" });
      const lliure = innerHeight - dalt - caixa.offsetHeight;
      full.style.setProperty("--alt-full", `${Math.round(Math.max(lliure, innerHeight * (innerWidth > 640 ? 0.36 : 0.42)))}px`);
      btn.setAttribute("aria-expanded", "true"); document.body.classList.add("menu-ind-obert"); avisa("menu-obert");
    }
    function tanca() { if (!obert()) return; btn.setAttribute("aria-expanded", "false"); document.body.classList.remove("menu-ind-obert"); avisa("menu-tancat"); }
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
      obre, tanca, obert,
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
  window.mapaMenuInd = menuInd;

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
    document.querySelectorAll(".segment button[data-nivell]").forEach((b) => {
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
      encaixa(ine); avisa("zona", { ine });
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
      const files = IND.filter((i) => i.tema === tm.id && !i.cat && !i.el && !(i.buit && i.buit())).map((i) => {
        const v = valorM(i);
        if (v == null || !isFinite(v)) return "";
        const r = (i.ref && (i.a === "sol" || i.a === "irpf" || i.a === "ats" || /^hb/.test(i.a || "") || i.a === "veh" || i.a === "acc" || i.a === "accu" || /^cul_/.test(i.a || "") || i.a === "ua" || ["cad", "cad_vm2", "cad_ibi"].includes(i.a)) ? i.ref() : (D.ref || {})[i.id]) || {};
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
  // Para mapamobil.js
  window.mapaApi = {
    IND, TEMES, nomInd,
    ok: (i) => NIVELLS.some((n) => disponible(i, n)) && !absent(i),
    llegenda: () => { if (ind) llegenda(); },
    get ind() { return ind; }, get nivell() { return nivell; }, get any() { return anySel; }, get fixat() { return fixat; }, get mapa() { return mapa; },
    tria(id) { const i = IND.find((x) => x.id === id); if (!i) return; consulta = ""; const c = document.getElementById("cerca-ind"); if (c) c.value = ""; return tria(i); },
    // Para pregunta.js: área (de salud, policial, judicial, de Agents Rurals) de un municipio y nombres de las áreas
    // Comarca: la del municipio. Estaciones de aire y meteorológicas: la que lo cubre o, si no, la más cercana con dato (hasta `max` km)
    async area(n, ine, te) {
      const m = munPerIne[ine] || D.municipios.find((x) => x.ine === ine);
      if (!m) return null;
      if (n === "pj") return m.x && m.x.pj ? { id: m.x.pj, nom: m.x.pj_nom } : null;
      if (n === "com") return m.comarca ? { id: m.comarca, nom: m.comarca } : null;
      if (!geoMun || !ZONA[n]) return null;
      const z = await areaDe(n, m);
      if (n !== "aire" && n !== "met") return z;
      if (z && (!te || te(z.id))) return { ...z, km: 0 };
      const f = geoMun.features.find((x) => x.properties.ine === m.ine);
      if (!f) return null;
      const [x0, y0] = centre(f), km = ([x, y]) => Math.hypot((x - x0) * 111.32 * Math.cos((y0 * Math.PI) / 180), (y - y0) * 110.57);
      const max = n === "aire" ? 20 : 15;
      let millor = null;
      ZONA[n].geo.features.forEach((e) => { const d = km(centre(e)); if (d <= max && (!te || te(e.properties.id)) && (!millor || d < millor.km)) millor = { ...e.properties, km: d }; });
      return millor;
    },
    async noms(n) {
      const o = {};
      if (n === "pj") { D.municipios.forEach((m) => { if (m.x && m.x.pj) o[m.x.pj] = m.x.pj_nom; }); return o; }
      if (n === "com") { Object.keys((D.arees && D.arees.com) || {}).forEach((c) => { o[c] = c; }); return o; }
      if (!ZONA[n]) return o;
      await carregaZona(n);
      ZONA[n].geo.features.forEach((f) => { o[f.properties.id] = f.properties.nom; });
      return o;
    },
    selecciona(ine) {
      if (nivell !== "mun") return;
      const f = geoMun.features.find((x) => x.properties.ine === ine); if (!f) return;
      fixat = (geoNivell().features.find((x) => x.properties.ine === ine) || f).properties; info(fixat); encaixa(ine);
    },
  };
  window.mapaIdioma = () => { if (!mapa) return; omplirSelector(); pinta(); };
  // Para pregunta.js: muestra una convocatoria concreta en el mapa electoral
  window.mapaEleccio = async (id) => { if (!mapa || !id) return; await carregaConv(id); if (!ind || !ind.el) ind = IND.find((i) => i.id === "el_guany"); if (!disponible(ind, nivell)) { nivell = "mun"; fixat = null; } omplirSelector(); botonsNivell(); pinta(); };
  // Inserción (iframe): estado actual del mapa y arranque con un indicador, nivel y año dados
  window.mapaEstat = () => (ind ? { id: ind.id, nivell, any: anySel, nom: nomInd(ind) } : null);
  let llest; window.mapaLlest = new Promise((r) => { llest = r; });
  window.mapaEmbed = async ({ id, nivell: n, any }) => {
    await window.mapaLlest;
    const i = IND.find((x) => x.id === id);
    if (i) await tria(i);
    if (n && n !== nivell) await canviaNivell(n);
    if (any && anysDe(ind).includes(any)) { anySel = any; pinta(); }
  };

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
      minZoom: 6, maxZoom: 14, cooperativeGestures: !!window.EMB || matchMedia("(pointer: coarse)").matches,
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
      llest();
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
      avisa("zona", { punt: e.point });
    });

    document.querySelectorAll(".segment button[data-nivell]").forEach((b) => b.addEventListener("click", () => canviaNivell(b.dataset.nivell)));
    matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => { colorsBase(); pinta(); });
    let amplePrev = innerWidth;
    addEventListener("resize", () => { if (Math.abs(innerWidth - amplePrev) > 40) { amplePrev = innerWidth; llegenda(); } });
    omplirSelector(); botonsNivell(); cercador();
  };
})();
