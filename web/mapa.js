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
  const X = (k) => (m) => (m.x && m.x[k] != null ? m.x[k] : null);
  const S = (k) => (x) => (x[k] != null ? x[k] : null);
  const suma = (o, anys) => anys.reduce((s, a) => s + (o && o[a] != null ? o[a] : NaN), 0);
  const ANYS5 = ["2021", "2022", "2023", "2024", "2025"];

  // Temas del selector
  const TEMES = [
    { id: "hab", ca: "Habitatge", es: "Vivienda" },
    { id: "ren", ca: "Renda i pobresa", es: "Renta y pobreza" },
    { id: "pob", ca: "Població", es: "Población" },
    { id: "tre", ca: "Treball i economia", es: "Trabajo y economía" },
    { id: "sal", ca: "Salut i serveis", es: "Salud y servicios" },
    { id: "ajt", ca: "Ajuntaments", es: "Ayuntamientos" },
    { id: "ene", ca: "Energia i residus", es: "Energía y residuos" },
    { id: "pol", ca: "Política", es: "Política" },
  ];
  // Indicadores: v(m) municipio, s(x) sección; ca/es = [etiqueta corta, título completo]; a = año (o clave de D.anys)
  const IND = [
    // Vivienda
    { id: "lloguer", tema: "hab", ca: ["Lloguer", "Lloguer mitjà (€/mes)"], es: ["Alquiler", "Alquiler medio (€/mes)"], a: 2025, v: (m) => val(m.alquiler, "2025"), ...EU },
    { id: "var5", tema: "hab", ca: ["Pujada del lloguer", "Variació del lloguer 2020-2025"], es: ["Subida del alquiler", "Variación del alquiler 2020-2025"], v: (m) => { const a = val(m.alquiler, "2025"), b = val(m.alquiler, "2020"); return a && b ? (a / b - 1) * 100 : null; }, f: (v) => pct(v, 0, true), c: (v) => pct(v, 0, true) },
    { id: "esforc", tema: "hab", ca: ["Esforç del lloguer", "Esforç del lloguer (% de la renda de la llar)"], es: ["Esfuerzo del alquiler", "Esfuerzo del alquiler (% de la renta del hogar)"], a: 2024, v: (m) => esforc(m), ...P0 },
    { id: "compra", tema: "hab", ca: ["Compravendes", "Compravendes per 1.000 habitants"], es: ["Compraventas", "Compraventas por 1.000 habitantes"], a: 2025, v: (m) => (val(m.compraventas, "2025") != null && m.poblacion ? (m.compraventas["2025"] / m.poblacion) * 1000 : null), ...N1 },
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
    // Renta y pobreza
    { id: "renda", tema: "ren", ca: ["Renda per persona", "Renda neta per persona (€)"], es: ["Renta por persona", "Renta neta por persona (€)"], a: 2024, v: (m) => val(m.renta_persona, "2024"), s: S("renta_persona"), ...EU },
    { id: "renda_llar", tema: "ren", ca: ["Renda per llar", "Renda neta per llar (€)"], es: ["Renta por hogar", "Renta neta por hogar (€)"], a: 2024, v: (m) => val(m.renta_hogar, "2024"), s: S("renta_hogar"), ...EU },
    { id: "pobresa", tema: "ren", ca: ["Risc de pobresa", "Població sota el 60 % de la renda mediana (%)"], es: ["Riesgo de pobreza", "Población bajo el 60 % de la renta mediana (%)"], a: "pobresa", v: X("pobresa"), s: S("pobresa"), ...P1 },
    { id: "pobresa_sev", tema: "ren", ca: ["Pobresa severa", "Població sota el 40 % de la renda mediana (%)"], es: ["Pobreza severa", "Población bajo el 40 % de la renta mediana (%)"], a: "pobresa_sev", v: X("pobresa_sev"), s: S("pobresa_sev"), ...P1 },
    { id: "alts", tema: "ren", ca: ["Rendes altes", "Població per sobre del 200 % de la renda mediana (%)"], es: ["Rentas altas", "Población por encima del 200 % de la renta mediana (%)"], a: "alts_ingressos", v: X("alts_ingressos"), s: S("alts_ingressos"), ...P1 },
    { id: "gini", tema: "ren", ca: ["Desigualtat (Gini)", "Índex de Gini"], es: ["Desigualdad (Gini)", "Índice de Gini"], a: 2024, v: (m) => val(m.gini, "2024"), s: S("gini"), f: (v) => fmt(v, 1), c: (v) => fmt(v, 0) },
    { id: "p80p20", tema: "ren", ca: ["Ràtio P80/P20", "Renda del 20 % més ric respecte al 20 % més pobre"], es: ["Ratio P80/P20", "Renta del 20 % más rico respecto al 20 % más pobre"], a: 2024, v: null, s: S("p80p20"), ...N2 },
    { id: "salari", tema: "ren", ca: ["Ingressos del salari", "Ingressos que provenen del salari (%)"], es: ["Ingresos del salario", "Ingresos que proceden del salario (%)"], a: "ing_salari", v: X("ing_salari"), s: S("ing_salari"), ...P0 },
    { id: "pensio", tema: "ren", ca: ["Ingressos de pensions", "Ingressos que provenen de pensions (%)"], es: ["Ingresos de pensiones", "Ingresos que proceden de pensiones (%)"], a: "ing_pensio", v: X("ing_pensio"), s: S("ing_pensio"), ...P0 },
    { id: "prest_atur", tema: "ren", ca: ["Prestacions d'atur", "Ingressos que provenen de prestacions d'atur (%)"], es: ["Prestaciones de paro", "Ingresos que proceden de prestaciones por desempleo (%)"], a: "ing_atur", v: X("ing_atur"), s: S("ing_atur"), ...P1 },
    { id: "rgc", tema: "ren", ca: ["Renda garantida", "Beneficiaris de la renda garantida per 1.000 habitants"], es: ["Renta garantizada", "Beneficiarios de la renta garantizada por 1.000 habitantes"], a: "rgc", v: X("rgc"), ...N1 },
    { id: "irpf", tema: "ren", ca: ["Base de l'IRPF", "Base imposable mitjana per declarant de l'IRPF (€)"], es: ["Base del IRPF", "Base imponible media por declarante del IRPF (€)"], a: "irpf_base", v: X("irpf_base"), ...EU },
    // Población
    { id: "pob", tema: "pob", ca: ["Habitants", "Població"], es: ["Habitantes", "Población"], v: (m) => m.poblacion, ...N0 },
    { id: "edat", tema: "pob", ca: ["Edat mitjana", "Edat mitjana de la població (anys)"], es: ["Edad media", "Edad media de la población (años)"], a: "edat", v: X("edat"), s: S("edat"), ...N1 },
    { id: "majors65", tema: "pob", ca: ["Més de 65 anys", "Població de 65 anys i més (%)"], es: ["Más de 65 años", "Población de 65 años y más (%)"], a: "majors65", v: X("majors65"), s: S("majors65"), ...P0 },
    { id: "menors18", tema: "pob", ca: ["Menys de 18 anys", "Població menor de 18 anys (%)"], es: ["Menos de 18 años", "Población menor de 18 años (%)"], a: "menors18", v: X("menors18"), s: S("menors18"), ...P0 },
    { id: "estrangers", tema: "pob", ca: ["Estrangers", "Població de nacionalitat estrangera (%)"], es: ["Extranjeros", "Población de nacionalidad extranjera (%)"], a: "estrangers", v: X("estrangers"), s: S("estrangers"), ...P0 },
    { id: "llar", tema: "pob", ca: ["Mida de la llar", "Persones per llar"], es: ["Tamaño del hogar", "Personas por hogar"], a: "llar", v: X("llar"), s: S("llar"), ...N2 },
    { id: "unipersonals", tema: "pob", ca: ["Viuen sols", "Llars unipersonals (%)"], es: ["Viven solos", "Hogares unipersonales (%)"], a: "unipersonals", v: X("unipersonals"), s: S("unipersonals"), ...P0 },
    { id: "estacional", tema: "pob", ca: ["Població estacional", "Població estacional respecte a la resident (%)"], es: ["Población estacional", "Población estacional respecto a la residente (%)"], v: (m) => (m.poblacion && m.poblacion_etca ? (m.poblacion_etca / m.poblacion) * 100 : null), ...P0 },
    { id: "natalitat", tema: "pob", ca: ["Natalitat", "Naixements per 1.000 habitants"], es: ["Natalidad", "Nacimientos por 1.000 habitantes"], a: "natalitat", v: X("natalitat"), ...N1 },
    { id: "mortalitat", tema: "pob", ca: ["Mortalitat", "Defuncions per 1.000 habitants"], es: ["Mortalidad", "Defunciones por 1.000 habitantes"], a: "mortalitat", v: X("mortalitat"), ...N1 },
    { id: "catala", tema: "pob", ca: ["Parla català", "Població que sap parlar català (%)"], es: ["Habla catalán", "Población que sabe hablar catalán (%)"], a: "catala", v: X("catala"), ...P0 },
    // Trabajo y economía
    { id: "atur", tema: "tre", ca: ["Atur registrat", "Aturats registrats per 100 habitants"], es: ["Paro registrado", "Parados registrados por 100 habitantes"], a: "atur", v: X("atur"), ...N1 },
    { id: "llocs", tema: "tre", ca: ["Llocs de treball", "Llocs de treball per 100 habitants"], es: ["Puestos de trabajo", "Puestos de trabajo por 100 habitantes"], v: X("llocs"), ...N0 },
    { id: "autonoms", tema: "tre", ca: ["Autònoms", "Autònoms per 100 habitants"], es: ["Autónomos", "Autónomos por 100 habitantes"], v: X("autonoms"), ...N1 },
    { id: "empreses", tema: "tre", ca: ["Empreses", "Empreses per 1.000 habitants"], es: ["Empresas", "Empresas por 1.000 habitantes"], v: X("empreses"), ...N1 },
    { id: "cotxes", tema: "tre", ca: ["Cotxes", "Turismes per 1.000 habitants"], es: ["Coches", "Turismos por 1.000 habitantes"], a: "cotxes", v: X("cotxes"), ...N0 },
    { id: "ocupats", tema: "tre", ca: ["Afiliats", "Afiliats a la Seguretat Social per 100 habitants (per residència)"], es: ["Afiliados", "Afiliados a la Seguridad Social por 100 habitantes (por residencia)"], v: X("ocupats"), ...N1 },
    { id: "ocupats_dones", tema: "tre", ca: ["Afiliades dones", "Dones entre els afiliats a la Seguretat Social (%)"], es: ["Afiliadas mujeres", "Mujeres entre los afiliados a la Seguridad Social (%)"], v: X("ocupats_dones"), ...P1 },
    { id: "atur_var", tema: "tre", ca: ["Variació de l'atur", "Variació interanual de l'atur registrat (%)"], es: ["Variación del paro", "Variación interanual del paro registrado (%)"], a: "atur_var", v: X("atur_var"), ...P1 },
    { id: "atur_estr", tema: "tre", ca: ["Aturats estrangers", "Estrangers entre els aturats registrats (%)"], es: ["Parados extranjeros", "Extranjeros entre los parados registrados (%)"], a: "atur_estr", v: X("atur_estr"), ...P0 },
    { id: "prest_atur", tema: "tre", ca: ["Prestacions d'atur", "Beneficiaris de prestacions d'atur per 1.000 habitants"], es: ["Prestaciones de paro", "Beneficiarios de prestaciones de paro por 1.000 habitantes"], a: "prest_atur", v: X("prest_atur"), ...N1 },
    { id: "sector_serveis", tema: "tre", ca: ["Serveis", "Llocs de treball als serveis (%)"], es: ["Servicios", "Puestos de trabajo en servicios (%)"], v: X("sector_serveis"), ...P0 },
    { id: "sector_ind", tema: "tre", ca: ["Indústria", "Llocs de treball a la indústria (%)"], es: ["Industria", "Puestos de trabajo en la industria (%)"], v: X("sector_ind"), ...P0 },
    { id: "sector_const", tema: "tre", ca: ["Construcció", "Llocs de treball a la construcció (%)"], es: ["Construcción", "Puestos de trabajo en la construcción (%)"], v: X("sector_const"), ...P0 },
    { id: "sector_agri", tema: "tre", ca: ["Agricultura", "Llocs de treball a l'agricultura (%)"], es: ["Agricultura", "Puestos de trabajo en la agricultura (%)"], v: X("sector_agri"), ...P1 },
    // Salud y servicios sociales
    { id: "pensions", tema: "sal", ca: ["Pensionistes", "Pensions contributives per 100 habitants"], es: ["Pensionistas", "Pensiones contributivas por 100 habitantes"], v: X("pensions"), ...N1 },
    { id: "pnc", tema: "sal", ca: ["Pensions no contributives", "Pensions no contributives per 1.000 habitants"], es: ["Pensiones no contributivas", "Pensiones no contributivas por 1.000 habitantes"], a: "pnc", v: X("pnc"), ...N1 },
    { id: "residencies", tema: "sal", ca: ["Residències", "Places en residències per a gent gran per 1.000 habitants"], es: ["Residencias", "Plazas en residencias de mayores por 1.000 habitantes"], a: "residencies", v: X("residencies"), ...N1 },
    { id: "farmacies", tema: "sal", ca: ["Farmàcies", "Farmàcies per 10.000 habitants"], es: ["Farmacias", "Farmacias por 10.000 habitantes"], a: "farmacies", v: X("farmacies"), ...N1 },
    { id: "sanitaris", tema: "sal", ca: ["Centres sanitaris", "Centres sanitaris (CAP, consultoris, hospitals)"], es: ["Centros sanitarios", "Centros sanitarios (CAP, consultorios, hospitales)"], a: "sanitaris", v: X("sanitaris"), ...N0 },
    // Ayuntamientos
    { id: "deute", tema: "ajt", ca: ["Deute per habitant", "Deute viu de l'ajuntament per habitant (€)"], es: ["Deuda por habitante", "Deuda viva del ayuntamiento por habitante (€)"], a: "deute_hab", v: X("deute_hab"), ...EU },
    { id: "pmp", tema: "ajt", ca: ["Pagament a proveïdors", "Període mitjà de pagament a proveïdors (dies)"], es: ["Pago a proveedores", "Periodo medio de pago a proveedores (días)"], v: X("pmp"), ...N0 },
    // Energía y residuos
    { id: "kwh", tema: "ene", ca: ["Consum elèctric domèstic", "Consum elèctric domèstic per habitant (kWh)"], es: ["Consumo eléctrico doméstico", "Consumo eléctrico doméstico por habitante (kWh)"], a: "kwh_dom", v: X("kwh_dom"), ...N0 },
    { id: "autoconsum", tema: "ene", ca: ["Autoconsum", "Instal·lacions d'autoconsum per 1.000 habitants"], es: ["Autoconsumo", "Instalaciones de autoconsumo por 1.000 habitantes"], v: X("autoconsum"), ...N1 },
    { id: "selectiva", tema: "ene", ca: ["Recollida selectiva", "Recollida selectiva (% dels residus)"], es: ["Recogida selectiva", "Recogida selectiva (% de los residuos)"], a: "selectiva", v: X("selectiva"), ...P0 },
    // Política
    { id: "alcalde", tema: "pol", cat: true, ca: ["Partit de l'alcalde", "Partit de l'alcalde o alcaldessa"], es: ["Partido del alcalde", "Partido del alcalde o alcaldesa"], v: (m) => (m.pol && m.pol.alcalde ? m.pol.alcalde.bloc : null), f: (v) => nomBloc(v), c: (v) => nomBloc(v) },
    { id: "participacio", tema: "pol", ca: ["Participació", "Participació a les municipals (%)"], es: ["Participación", "Participación en las municipales (%)"], a: "eleccions", v: X("participacio"), ...P0 },
    { id: "vot_junts", tema: "pol", ca: ["Vot a Junts", "Vot a Junts a les municipals (% dels vots)"], es: ["Voto a Junts", "Voto a Junts en las municipales (% de los votos)"], a: "eleccions", v: X("vot_junts"), ...P0 },
    { id: "vot_erc", tema: "pol", ca: ["Vot a ERC", "Vot a ERC a les municipals (% dels vots)"], es: ["Voto a ERC", "Voto a ERC en las municipales (% de los votos)"], a: "eleccions", v: X("vot_erc"), ...P0 },
    { id: "vot_psc", tema: "pol", ca: ["Vot a PSC", "Vot a PSC a les municipals (% dels vots)"], es: ["Voto a PSC", "Voto a PSC en las municipales (% de los votos)"], a: "eleccions", v: X("vot_psc"), ...P0 },
    { id: "vot_cup", tema: "pol", ca: ["Vot a CUP", "Vot a CUP a les municipals (% dels vots)"], es: ["Voto a CUP", "Voto a CUP en las municipales (% de los votos)"], a: "eleccions", v: X("vot_cup"), ...P0 },
    { id: "vot_vox", tema: "pol", ca: ["Vot a Vox", "Vot a Vox a les municipals (% dels vots)"], es: ["Voto a Vox", "Voto a Vox en las municipales (% de los votos)"], a: "eleccions", v: X("vot_vox"), ...P0 },
    { id: "vot_pp", tema: "pol", ca: ["Vot a PP", "Vot a PP a les municipals (% dels vots)"], es: ["Voto a PP", "Voto a PP en las municipales (% de los votos)"], a: "eleccions", v: X("vot_pp"), ...P0 },
    { id: "vot_alianca", tema: "pol", ca: ["Vot a Aliança Catalana", "Vot a Aliança Catalana a les municipals (% dels vots)"], es: ["Voto a Aliança Catalana", "Voto a Aliança Catalana en las municipales (% de los votos)"], a: "eleccions", v: X("vot_alianca"), ...P0 },
    { id: "vot_comuns", tema: "pol", ca: ["Vot a Comuns", "Vot a Comuns a les municipals (% dels vots)"], es: ["Voto a Comuns", "Voto a Comuns en las municipales (% de los votos)"], a: "eleccions", v: X("vot_comuns"), ...P0 },
    { id: "vot_locals", tema: "pol", ca: ["Vot a les llistes locals", "Vot a les llistes locals a les municipals (% dels vots)"], es: ["Voto a las listas locales", "Voto a las listas locales en las municipales (% de los votos)"], a: "eleccions", v: X("vot_locals"), ...P0 },
  ];
  const nomInd = (i, curt) => {
    const txt = i[LANG][curt ? 0 : 1];
    if (curt) return txt;
    const a = typeof i.a === "number" ? i.a : i.a && D.anys ? D.anys[i.a] : null;
    return a ? `${txt} · ${a}` : txt;
  };
  let tema = "ren";
  // Municipios que se rotulan en el mapa (capitales de comarca y grandes poblaciones)
  const ROTULS = ["Girona", "Figueres", "Olot", "Ripoll", "Puigcerdà", "Banyoles", "la Bisbal d'Empordà", "Santa Coloma de Farners", "Blanes", "Lloret de Mar", "Palamós", "Roses", "Sant Feliu de Guíxols"];
  const ROTULS_MOBIL = ["Girona", "Figueres", "Olot", "Ripoll", "Puigcerdà", "Blanes", "Palamós"];

  let mapa = null, geoMun = null, geoSec = null, SEC = {}, nivell = "mun", ind = null, llindars = [];
  let hoverId = null, munPerIne = {}, valorsActuals = [], fixat = null;

  const disponible = (i, n) => (n === "mun" ? !!i.v : !!i.s);

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
    if (nivell === "mun") { const m = munPerIne[props.ine]; return m ? ind.v(m) : null; }
    const x = SEC[props.cusec]; return x ? ind.s(x) : null;
  }
  const codiSec = (p) => `${p.cusec.slice(5, 7)}-${p.cusec.slice(7)}`;
  const nomZona = (p) => {
    const m = munPerIne[p.ine], nom = m ? m.nom : p.ine;
    return nivell === "sec" ? { nom, lloc: `${t("seccio")} ${codiSec(p)}` } : { nom, lloc: m ? m.comarca : "" };
  };

  function pinta() {
    const geo = nivell === "mun" ? geoMun : geoSec;
    const valors = geo.features.map((f) => valorDe(f.properties));
    if (ind.cat) return pintaCat(geo, valors);
    llindars = quantils(valors);
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
    mapa.setLayoutProperty("limits-mun", "visibility", nivell === "sec" ? "visible" : "none");
    document.getElementById("ind-titol").textContent = nomInd(ind);
    document.getElementById("mapa-desc").textContent = !disponible(ind, "sec") ? t("nomes_mun") : "";
    llegenda(); ranquing(); info(fixat);
  }

  // Indicadores por categorías (partido del alcalde): un color por bloque
  let recompte = [];
  function pintaCat(geo, valors) {
    geo.features.forEach((f, i) => { f.properties.c = valors[i] ? colorBloc(valors[i]) : sense(); f.properties.v = valors[i]; });
    valorsActuals = geo.features.map((f, i) => ({ p: f.properties, v: valors[i] })).filter((x) => x.v);
    const n = {}; valorsActuals.forEach((x) => { n[x.v] = (n[x.v] || 0) + 1; });
    recompte = Object.entries(n).sort((a, b) => b[1] - a[1]);
    mapa.getSource("zones").setData(geo);
    mapa.setLayoutProperty("limits-mun", "visibility", "none");
    document.getElementById("ind-titol").textContent = nomInd(ind);
    document.getElementById("mapa-desc").textContent = t("nomes_mun");
    const max = recompte.length ? recompte[0][1] : 1;
    document.getElementById("llegenda").innerHTML = `<div class="cat-llista">${recompte.map(([b, k]) =>
      `<div class="cat-fila"><i style="background:${colorBloc(b)}"></i><span class="cat-nom">${nomBloc(b)}</span><span class="cat-barra"><b style="width:${(k / max) * 100}%;background:${colorBloc(b)}"></b></span><span class="cat-n">${k}</span></div>`).join("")}</div>`;
    document.getElementById("ranquing").innerHTML = "";
    info(fixat);
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

  function ranquing() {
    if (ind.cat) return;
    const el = document.getElementById("ranquing");
    const fila = (x) => { const z = nomZona(x.p); return `<li data-ine="${x.p.ine}" title="${z.nom}"><span>${z.nom}${nivell === "sec" ? ` · ${codiSec(x.p)}` : ""}</span><span>${ind.c(x.v)}</span></li>`; };
    const alts = valorsActuals.slice(0, 5), baixos = valorsActuals.slice(-5).reverse();
    el.innerHTML = `<div><h4>${t("r_alts")}</h4><ol>${alts.map(fila).join("")}</ol></div><div><h4>${t("r_baixos")}</h4><ol>${baixos.map(fila).join("")}</ol></div>`;
    el.querySelectorAll("li").forEach((li) => li.addEventListener("click", () => obreFitxa(li.dataset.ine, true)));
  }

  function info(props) {
    const el = document.getElementById("info");
    if (!props) { el.innerHTML = `<p class="pista">${t("pista")}</p>`; return; }
    const z = nomZona(props), v = valorDe(props);
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
      <button type="button">${t("obrir_fitxa")} →</button>`;
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
      const ok = disponible(i, nivell) || (q && (disponible(i, "mun") || disponible(i, "sec")));
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
  }

  // Selecciona un indicador; si no existe al nivel actual, cambia de nivel
  async function tria(i) {
    ind = i; tema = i.tema;
    if (!disponible(i, nivell)) { nivell = disponible(i, "mun") ? "mun" : "sec"; fixat = null; }
    if (nivell === "sec") await carregaSeccions();
    omplirSelector(); botonsNivell(); pinta();
  }

  function botonsNivell() {
    document.querySelectorAll(".segment button").forEach((b) => {
      b.setAttribute("aria-pressed", String(b.dataset.nivell === nivell));
      b.disabled = !disponible(ind, b.dataset.nivell);
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

  async function canviaNivell(n) {
    if (n === nivell || !disponible(ind, n)) return;
    if (n === "sec") await carregaSeccions();
    nivell = n; fixat = null; omplirSelector(); botonsNivell(); pinta();
  }

  function tipHtml(props) {
    const z = nomZona(props), v = props.v;
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
    mapa = new maplibregl.Map({
      container: "mapa", style: estil, center: [2.6, 42.05], zoom: 8,
      minZoom: 7, maxZoom: 14, cooperativeGestures: matchMedia("(pointer: coarse)").matches,
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
      mapa.fitBounds([[1.72, 41.64], [3.33, 42.5]], { padding: estret ? 8 : 24, duration: 0 });
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
      const fm = geoMun.features.find((x) => x.properties.ine === p.ine);
      if (fm) mapa.getSource("seleccio").setData({ type: "FeatureCollection", features: [fm] });
      if (matchMedia("(pointer: coarse)").matches) amagaTip();
    });

    document.querySelectorAll(".segment button").forEach((b) => b.addEventListener("click", () => canviaNivell(b.dataset.nivell)));
    matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => { colorsBase(); pinta(); });
    let amplePrev = innerWidth;
    addEventListener("resize", () => { if (Math.abs(innerWidth - amplePrev) > 40) { amplePrev = innerWidth; llegenda(); } });
    omplirSelector(); botonsNivell(); cercador();
  };
})();
