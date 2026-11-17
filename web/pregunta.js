"use strict";
/* Pregunta a les dades: buscador de preguntes en llenguatge natural, sense IA i sense servidor.
   Reconeix el municipi (o la comarca), l'indicador i el tipus de pregunta (valor, rànquing, comparació, evolució)
   amb regles i sinònims, i respon NOMÉS amb les xifres que calcula el mapa (window.indMapa, window.mapaApi).
   Si no entén la pregunta o no hi ha dada, ho diu i proposa indicadors semblants: no s'inventa res.
   Usa les globals d'app.js: D, LANG, t, fmt, pct, etPer, obreFitxa. */
(() => {
  const form = document.getElementById("pregunta-form");
  if (!form) return;
  const inp = document.getElementById("pregunta");
  const out = document.getElementById("pregunta-resposta");
  const exEl = document.getElementById("pregunta-exemples");

  // ---------------------------------------------------------------- Textos
  const X = {
    ca: {
      exemples: ["Quants assalariats hi ha a Agullana?", "Quin municipi té més atur?", "Lloguer a Olot vs Figueres", "Com ha canviat el lloguer a Girona?", "Pobles de més de 5.000 habitants amb més pisos turístics", "Qui és l'alcalde de Banyoles?"],
      prov: "Província de Girona", cat: "Catalunya", esp: "Espanya", gi: "Província",
      posicio: (p, n) => `Posició <b>${p}</b> de ${n} municipis amb dada, de més a menys.`,
      font: "Font", mapa: "Veure al mapa", fitxa: (n) => `Fitxa de ${n}`,
      semblants: "Potser volies dir", si_que: (m) => `Dades semblants que sí que hi ha per a ${m}`, altres: "Altres dades que et poden interessar",
      sense_dada: (ind, mun) => `No hi ha dada de <b>${ind}</b> per a ${mun}: la font no la publica per a aquest municipi.`,
      no_entenc: "No he sabut respondre aquesta pregunta amb les dades del web.",
      no_entenc_2: "Funciona millor amb un municipi i una dada concreta. Prova, per exemple:",
      nomes_mun: (m) => `Resum de <b>${m}</b>. Toca una xifra per veure-la en detall o pregunta per una dada concreta.`,
      no_tinc: (w) => `No tinc dades de «${w}». Et mostro la dada més propera que he trobat.`,
      no_tinc_mun: (m, w) => `He reconegut <b>${m}</b>, però no tinc dades de «${w}» per municipi. Aquest és el seu resum:`,
      fora: (n) => `${n} no és de la província de Girona. Aquest web només cobreix els seus 221 municipis.`,
      rank_sobre: (asc) => `Rànquing · de ${asc ? "menys a més" : "més a menys"}`,
      rank_frase: (m, v, asc) => `El valor més ${asc ? "baix" : "alt"} és el de <b>${m}</b>: <b>${v}</b>.`,
      rank_filtre: (f) => `Només ${f}.`,
      rank_nota: "Els municipis petits poden tenir valors extrems. Pots afinar-ho: «de més de 5.000 habitants».",
      mes_de: (n) => `municipis de més de ${n} habitants`, menys_de: (n) => `municipis de menys de ${n} habitants`, a_comarca: (c) => `municipis de la comarca ${c}`,
      cap_rank: "Cap municipi compleix aquestes condicions.",
      comp_tit: "Comparació", pos_curt: (p, n) => `posició ${p} de ${n}`, sense_curt: "sense dada", evol_tit: "Evolució",
      evol_frase: (a, va, b, vb, d) => `De ${a} a ${b} ha passat de <b>${va}</b> a <b>${vb}</b>${d ? ` (${d})` : ""}.`,
      sense_serie: "Aquest indicador no té sèrie històrica al web; aquesta és la darrera dada.",
      any_no: (a) => `No hi ha dada de ${a} per a aquest indicador; aquesta és la més recent.`,
      ultim: (p, v) => `Darrera dada${p ? ` (${p})` : ""}: ${v}.`, padro: "INE, padró municipal",
      prov_frase: (v) => `Al conjunt de la província: <b>${v}</b>.`,
      sense_prov: "Aquest indicador no té un valor per al conjunt de la província.",
      dalt: "Valors més alts", baix: "Valors més baixos",
      alcalde: (m, n, p) => `L'alcalde o alcaldessa de ${m} és <b>${n}</b>${p ? ` (${p})` : ""}.`,
      sense_alcalde: (m) => `No tinc el nom de l'alcalde de ${m}.`,
      comarca: (m, c) => `${m} és a la comarca <b>${c}</b>.`,
      persones: "persones",
      afil_nota: (r, p) => `Són ${r} per cada 100 residents de 15 a 64 anys. Els autònoms són el ${p} dels afiliats.`,
      asal_nota: "Afiliats al règim general (assalariats): total d'afiliacions menys les d'autònoms, segons el municipi de residència.",
      habitants: "habitants", resum_pob: "Habitants",
      entes: "He entès", ind: "Dada", mun: "Municipi", periode: "Període",
    },
    es: {
      exemples: ["¿Cuántos asalariados hay en Agullana?", "¿Qué municipio tiene más paro?", "Alquiler en Olot vs Figueres", "¿Cómo ha cambiado el alquiler en Girona?", "Pueblos de más de 5.000 habitantes con más pisos turísticos", "¿Quién es el alcalde de Banyoles?"],
      prov: "Provincia de Girona", cat: "Cataluña", esp: "España", gi: "Provincia",
      posicio: (p, n) => `Puesto <b>${p}</b> de ${n} municipios con dato, de más a menos.`,
      font: "Fuente", mapa: "Ver en el mapa", fitxa: (n) => `Ficha de ${n}`,
      semblants: "Quizá querías decir", si_que: (m) => `Datos parecidos que sí hay para ${m}`, altres: "Otros datos que pueden interesarte",
      sense_dada: (ind, mun) => `No hay dato de <b>${ind}</b> para ${mun}: la fuente no lo publica para este municipio.`,
      no_entenc: "No he sabido responder a esta pregunta con los datos de la web.",
      no_entenc_2: "Funciona mejor con un municipio y un dato concreto. Prueba, por ejemplo:",
      nomes_mun: (m) => `Resumen de <b>${m}</b>. Toca una cifra para verla en detalle o pregunta por un dato concreto.`,
      no_tinc: (w) => `No tengo datos de «${w}». Te enseño el dato más cercano que he encontrado.`,
      no_tinc_mun: (m, w) => `He reconocido <b>${m}</b>, pero no tengo datos de «${w}» por municipio. Este es su resumen:`,
      fora: (n) => `${n} no es de la provincia de Girona. Esta web solo cubre sus 221 municipios.`,
      rank_sobre: (asc) => `Ranking · de ${asc ? "menos a más" : "más a menos"}`,
      rank_frase: (m, v, asc) => `El valor más ${asc ? "bajo" : "alto"} es el de <b>${m}</b>: <b>${v}</b>.`,
      rank_filtre: (f) => `Solo ${f}.`,
      rank_nota: "Los municipios pequeños pueden tener valores extremos. Puedes afinarlo: «de más de 5.000 habitantes».",
      mes_de: (n) => `municipios de más de ${n} habitantes`, menys_de: (n) => `municipios de menos de ${n} habitantes`, a_comarca: (c) => `municipios de la comarca ${c}`,
      cap_rank: "Ningún municipio cumple estas condiciones.",
      comp_tit: "Comparación", pos_curt: (p, n) => `puesto ${p} de ${n}`, sense_curt: "sin dato", evol_tit: "Evolución",
      evol_frase: (a, va, b, vb, d) => `De ${a} a ${b} ha pasado de <b>${va}</b> a <b>${vb}</b>${d ? ` (${d})` : ""}.`,
      sense_serie: "Este indicador no tiene serie histórica en la web; este es el último dato.",
      any_no: (a) => `No hay dato de ${a} para este indicador; este es el más reciente.`,
      ultim: (p, v) => `Último dato${p ? ` (${p})` : ""}: ${v}.`, padro: "INE, padrón municipal",
      prov_frase: (v) => `En el conjunto de la provincia: <b>${v}</b>.`,
      sense_prov: "Este indicador no tiene un valor para el conjunto de la provincia.",
      dalt: "Valores más altos", baix: "Valores más bajos",
      alcalde: (m, n, p) => `El alcalde o alcaldesa de ${m} es <b>${n}</b>${p ? ` (${p})` : ""}.`,
      sense_alcalde: (m) => `No tengo el nombre del alcalde de ${m}.`,
      comarca: (m, c) => `${m} está en la comarca <b>${c}</b>.`,
      persones: "personas",
      afil_nota: (r, p) => `Son ${r} por cada 100 residentes de 15 a 64 años. Los autónomos son el ${p} de los afiliados.`,
      asal_nota: "Afiliados al régimen general (asalariados): total de afiliaciones menos las de autónomos, según el municipio de residencia.",
      habitants: "habitantes", resum_pob: "Habitantes",
      entes: "He entendido", ind: "Dato", mun: "Municipio", periode: "Periodo",
    },
  };
  const tx = (k, ...a) => { const v = X[LANG][k]; return typeof v === "function" ? v(...a) : v; };
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  // ---------------------------------------------------------------- Normalización
  const norm = (s) => String(s).toLowerCase().replace(/l·l/g, "ll").normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/(\d)[.\s](?=\d{3}\b)/g, "$1").replace(/[^a-z0-9]+/g, " ").trim();
  const toks = (s) => norm(s).split(" ").filter(Boolean);
  const stem = (w) => {
    if (/^\d/.test(w)) return w;
    let s = w;
    if (s.length > 4) s = s.replace(/(es|s)$/, "");
    if (s.length > 4) s = s.replace(/[aoe]$/, "");
    return s;
  };
  function lev(a, b, max = 2) {
    if (Math.abs(a.length - b.length) > max) return max + 1;
    let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
    for (let i = 1; i <= a.length; i++) {
      const cur = [i]; let min = i;
      for (let j = 1; j <= b.length; j++) {
        cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
        if (cur[j] < min) min = cur[j];
      }
      if (min > max) return max + 1;
      prev = cur;
    }
    return prev[b.length];
  }

  const STOP = new Set(("de del dels la las el els los lo les l d s en a al als y i o u e que q quin quina quins quines cual cuales cuál es son esta estan esta " +
    "hay hi ha han he te tiene tienen tenen tenir tener per por para pel pels con amb un una uns unes como com cuanto cuanta cuantos cuantas quant quanta quants quantes " +
    "mi me se su sus seu seva seus seves ho sobre entre vs versus contra respecto respecte frente davant segun segons dime digues dame dona quiero vull saber sabe " +
    "datos dato dades dada informacion info cifra cifras xifra xifres numero nombre total actual actualment actualmente ara ahora hoy avui ultimo ultima darrer darrera " +
    "municipio municipios municipi municipis pueblo pueblos poble pobles ciudad ciudades ciutat ciutats localidad localidades lugar lloc llocs sitio zona zonas " +
    "donde on onde cual quina cuál vive viven viu viuen hace fa fan hacen son sigui sea ser esser estar dins dentro aqui alla tot todo todos tots totes toda todas " +
    "mas mes menos menys mayor major menor maximo maxim minimo minim alto alta altos altas alt alts bajo baja bajos bajas baix baixa baixos baixes top ranking ranquing rankings lista llista " +
    "clasificacion classificacio primero primeros primer primers primera primeras ordenados ordenats evolucion evolucio cambiado canviat ha ido anat historico historic serie " +
    "tendencia desde des fins hasta ano anos any anys provincia provincial catalunya cataluna espana espanya compara comparar comparacion comparacio vs y el la").split(" "));
  const XERRA = new Set(("puedes podrias pots podries sabes saps conocer coneixer mostrar muestra muestrame ensenya ensenyam ver veure decir dir quisiera gustaria agradaria favor porfa hola gracias gracies mucho mucha molt molta poco poca poc cuanto tanto existe existen registrado registrat cada " +
    "tiene tienen hay paga pagan pagar cuesta costa valor valores valors nivel nivell indice index porcentaje percentatge tasa taxa media mitjana medio mitja precio preu cantidad quantitat mismo mateix ultimos ultims anterior actuales ahi alli pasado passat passada pasada reciente recent").split(" "));
  const LLOC = new Set("municipio municipios municipi municipis pueblo pueblos poble pobles ciudad ciudades ciutat ciutats localidad localidades donde on lugar lloc llocs sitio".split(" "));

  // ---------------------------------------------------------------- Fuentes (como scripts/referencia/genera.py)
  const F = {
    incasol: "Incasòl / Agència de l'Habitatge de Catalunya, fiances de lloguer",
    mitma: "Ministerio de Transportes y Movilidad Sostenible, compraventas de viviendas (notarios)",
    atlas: "INE, Atlas de distribución de renta de los hogares",
    registre: "Registre de Turisme de Catalunya",
    catastro: "Dirección General del Catastro, INSPIRE",
    xifra: "Xifra, Diputació de Girona",
    emex: "Idescat, El municipi en xifres (EMEX)",
    generalitat: "Dades obertes de la Generalitat de Catalunya",
    habitatge: "Secretaria d'Habitatge, Generalitat de Catalunya",
  };
  const FONT_ID = {};
  const fid = (ids, k) => ids.split(" ").forEach((i) => { FONT_ID[i] = k; });
  fid("lloguer var5", "incasol"); fid("compra nova protegida", "mitma");
  fid("renda renda_llar gini pobresa pobresa_sev alts salari pensio prest_atur edat majors65 menors18 llar unipersonals estrangers esforc", "atlas");
  fid("hut tur_hut_c", "registre"); fid("antics anyo viv_edif", "catastro");
  fid("pob pob_var deute atur irpf autonoms empreses llocs visats buits kwh natalitat mortalitat catala ocupats ocupats_dones atur_var atur_estr prest_atur_ben pensions pnc residencies farmacies sanitaris pmp sector_serveis sector_ind sector_const sector_agri", "xifra");
  fid("educ_sup educ_prim nascuts_estr ist rfdb pib_hab segones lloguer_pct petits grans monoparentals places_tur residus pensio_mitjana creixement immigracio densitat sau esports motos enten_cat estacional tur_estacional_c tur_segones_c", "emex");
  fid("rgc selectiva", "generalitat"); fid("iniciats", "habitatge");
  const PERIODE_FIX = { var5: "2020-2025", nova: "2021-2025", protegida: "2021-2025" };

  // ---------------------------------------------------------------- Sinónimos (es + ca) por indicador
  // Frases que la gente usa y que no salen en el nombre del indicador. Pesan más que las palabras del título.
  // Frases separadas por comas. Una palabra suelta puntúa sola; una frase de varias palabras solo cuenta entera y seguida.
  const SIN = {
    q_asal: "asalariados, asalariadas, asalariada, asalariado, poblacion asalariada, assalariats, assalariades, assalariada, assalariat, regimen general, empleados, empleats, por cuenta ajena, per compte d altri",
    q_afil: "afiliados, afiliadas, afiliats, afiliades, seguridad social, seguretat social, trabajadores, treballadors, ocupados, ocupats, gente que trabaja, gent que treballa, personas que trabajan, persones que treballen, empleo, ocupacio, trabajan, treballen",
    q_reta: "autonomos, autonoms, trabajadores autonomos, treballadors autonoms",
    cj_atur: "paro, desempleo, atur, desocupados, desocupats, sin trabajo, sense feina, sin empleo, parados, aturats, tasa de paro, taxa d atur",
    cj_atur_n: "parados, aturats, personas en paro, persones a l atur",
    pob: "poblacion, poblacio, habitantes, habitants, vecinos, veins, empadronados, empadronats, censo, cuanta gente, quanta gent, gente vive, gent viu",
    lloguer: "alquiler, alquileres, lloguer, lloguers, alquilar, llogar, arrendamiento, renta del piso, precio del alquiler, preu del lloguer, piso de alquiler, pis de lloguer, cuanto cuesta alquilar, quant costa llogar, precio de la vivienda, preu de l habitatge, precio vivienda, preu habitatge",
    renda: "renta, renda, ingresos, ingressos, rico, ricos, rica, rics, riques, pobre, pobres, renta media, renda mitjana, renta per capita, renda per capita, dinero, diners, gana, guanya, cobran, cobren, nivel de vida, nivell de vida",
    compra: "compraventas, compravendes, compraventa, compravenda, ventas de pisos, vendes de pisos, venta de viviendas, venda d habitatges, se venden, es venen",
    hut: "pisos turisticos, pis turistic, pisos turistics, airbnb, viviendas turisticas, habitatges turistics, habitatges d us turistic, vut, hut, alquiler turistico, lloguer turistic",
    edat: "edad media, edat mitjana, edad, edat, envejecido, envellit",
    majors65: "mayores, gent gran, ancianos, jubilados, vejez, gente mayor, persones grans",
    estrangers: "extranjeros, estrangers, inmigrantes, immigrants, extranjera, estrangera, foraneos",
    int_total: "delitos, delictes, criminalidad, criminalitat, inseguridad, inseguretat, seguridad ciudadana, seguretat ciutadana, crimenes, crims, infracciones penales",
    mo_furts: "hurtos, furts",
    mo_robatori_forca: "robos, robatoris",
    gini: "desigualdad, desigualtat",
    deute: "deuda, deute, endeudamiento, endeutament",
    catala: "catalan, catala, hablan catalan, parlen catala",
    cad_ibi_rec: "ibi, contribucion, contribucio",
    edu_centres: "colegios, escuelas, escoles, col legis, institutos, instituts",
    densitat: "densidad, densitat",
    taxa_activitat: "poblacion activa, poblacio activa",
    pensions: "pensionistas, pensionistes, jubilados, jubilats",
    pensio_mitjana: "pension media, pensio mitjana, pensiones, pensions",
    segones: "segundas residencias, segones residencies, casas de veraneo",
    buits: "pisos vacios, pisos buits, viviendas vacias, habitatges buits",
    tur_pl_h: "plazas turisticas, places turistiques",
    tur_mov_rec: "turistas, turistes, turismo, turisme, visitantes, visitants",
    farmacies: "farmacias, farmacies",
    alcalde: "alcalde, alcaldesa, alcaldessa, quien gobierna, qui governa, partido que gobierna, partit que governa, batlle",
    comarca: "comarca",
    natalitat: "nacimientos, naixements, natalidad, bebes, nadons",
    mortalitat: "muertes, defunciones, morts, defuncions",
    salari: "salario, salari, sueldo, sou",
    cj_llq: "alquiler del trimestre, lloguer del trimestre",
    veh_elec_p: "coches electricos, cotxes electrics, vehiculos electricos, vehicles electrics, electricos, electrics",
    veh_tur_h: "coches, cotxes",
    co2: "contaminacion, contaminacio, emisiones, emissions",
    selectiva: "reciclaje, reciclatge, reciclar",
  };
  // Adjetivos que ya dicen el indicador y el orden: «el más caro», «el més petit»
  const ADJ = [
    ["caro cara caros caras car cars cares costoso", "lloguer", "desc"], ["barato barata baratos baratas barat barats barates economico economic asequible assequible", "lloguer", "asc"],
    ["rico rica ricos ricas ric rics riques", "renda", "desc"], ["pobre pobres", "renda", "asc"],
    ["poblado poblat grande grandes gran grans", "pob", "desc"], ["pequeno pequena pequenos petit petita petits", "pob", "asc"],
    ["envejecido envellit viejo vell vella", "edat", "desc"], ["joven jovenes jove joves", "edat", "asc"],
    ["seguro segura segur", "int_total", "asc"], ["peligroso perillos inseguro insegur", "int_total", "desc"],
  ].map(([w, id, dir]) => ({ w: new Set(w.split(" ")), id, dir }));
  // Prioridad cuando dos indicadores puntúan igual: los más consultados primero
  const PRI = ["q_asal", "q_afil", "pob", "renda", "lloguer", "cj_atur", "cj_atur_n", "compra", "hut", "edat", "estrangers", "int_total", "cj_afil", "atur", "ocupats", "renda_llar", "esforc"];

  // Lugares de fuera de la provincia por los que se suele preguntar
  const FORA = ["Barcelona", "Mataró", "Badalona", "Sabadell", "Terrassa", "L'Hospitalet", "Tarragona", "Lleida", "Reus", "Manresa", "Vic", "Granollers", "Calella", "Malgrat de Mar", "Pineda de Mar", "Arenys de Mar", "Sitges", "Madrid", "Perpinyà", "Perpiñán", "Andorra", "Tordera", "Santa Susanna", "Palafolls"];
  // Nombres en castellano y formas cortas habituales
  const ALIES = {
    "Girona": "gerona", "Figueres": "figueras", "Banyoles": "banolas", "Roses": "rosas", "Begur": "bagur", "Tossa de Mar": "tosa de mar|tossa",
    "Bisbal d'Empordà, la": "bisbal|la bisbal|bisbal del ampurdan", "Castelló d'Empúries": "castellon de ampurias|castello|empuriabrava",
    "Jonquera, la": "la junquera|junquera", "Sant Joan de les Abadesses": "san juan de las abadesas|sant joan abadesses",
    "Sant Feliu de Guíxols": "san feliu de guixols|sant feliu|san feliu|guixols", "Castell d'Aro, Platja d'Aro i s'Agaró": "platja d aro|playa de aro|castillo de aro|castell d aro|s agaro",
    "Escala, l'": "la escala|escala", "Lloret de Mar": "lloret", "Santa Coloma de Farners": "santa coloma", "Caldes de Malavella": "caldas de malavella|caldes",
    "Sant Hilari Sacalm": "san hilario sacalm|sant hilari", "Torroella de Montgrí": "torroella|l estartit|estartit", "Port de la Selva, el": "puerto de la selva",
    "Palamós i Sant Joan": "palamos", "Calonge i Sant Antoni": "calonge|sant antoni de calonge", "Puigcerdà": "puigcerda", "Llançà": "llansa", "Camprodon": "camprodon",
    "Cassà de la Selva": "cassa", "Santa Cristina d'Aro": "santa cristina de aro|santa cristina", "Vall d'en Bas, la": "vall d en bas|les preses", "Portbou": "port bou",
  };
  const COM_ALIES = { "Alt Empordà": "alto ampurdan|alt emporda", "Baix Empordà": "bajo ampurdan|baix emporda", "Gironès": "girones", "Ripollès": "ripolles",
    "Cerdanya": "cerdana|cerdanya", "Garrotxa": "garrocha|garrotxa", "Pla de l'Estany": "pla de l estany|pla de estany", "Selva": "la selva|comarca de la selva", "Osona": "osona" };
  // Nombres de municipio que también son palabras corrientes: solo cuentan con mayúscula o tras «de», «en», «a»…
  const RISC = new Set(["das", "pau", "quart", "pera", "colera", "torrent", "verges", "salt", "ger", "pals", "alp", "sils", "cabanes", "ordis", "osor", "pont de molins", "llers", "mieres", "jafre", "ullastret", "foixa", "saus", "serinya", "escala"]);
  const PREP = new Set(["de", "d", "en", "a", "del", "entre", "y", "i", "vs", "o", "per", "por", "con", "amb", "sobre", "que"]);

  // ---------------------------------------------------------------- Índices (al tener los datos)
  let LISTO = false, ENT = [], INDS = [], IDF = {}, NIND = 0, VOCAB = new Set(), BYID = {};
  const cjIdx = (a) => (D.cj && D.cj.idx.m[a] != null ? D.cj.idx.m[a] : null);
  const cjv = (k, ine, a) => { const c = D.cj && D.cj.mun[ine], s = c && c[k], i = cjIdx(a); return s && i != null ? s[i] : null; };
  const cjp = (k, z, a) => { const s = D.cj && D.cj.prov[k] && D.cj.prov[k][z], i = cjIdx(a); return s && i != null ? s[i] : null; };
  const N0 = (v) => fmt(v);

  function virtuals(IND) {
    const afilI = IND.find((i) => i.id === "cj_afil"), retaI = IND.find((i) => i.id === "cj_reta");
    if (!afilI || !D.cj || !D.cj.mun) return [];
    const last = () => { const l = window.indMapa.anysDe(afilI); return l[l.length - 1]; };
    const mk = (id, ca, es, fn, mapa) => ({
      id, per: "m", cob: 0.5, tema: "con", ca, es, nota: afilI.nota, mapa, virtual: true, f: N0,
      t: (m, a) => fn((k) => cjv(k, m.ine, a)), get v() { return (m) => this.t(m, last()); },
      pv: (a) => fn((k) => cjp(k, "gi", a)), ref: () => { const a = last(); return { cat: fn((k) => cjp(k, "cat", a)) }; },
    });
    return [
      mk("q_asal", ["Assalariats", "Afiliats assalariats a la Seguretat Social (règim general), per residència"], ["Asalariados", "Afiliados asalariados a la Seguridad Social (régimen general), por residencia"],
        (g) => { const f = g("afil"), r = g("reta"); return f != null && r != null ? f - r : null; }, "cj_afil"),
      mk("q_afil", ["Afiliats a la Seguretat Social", "Afiliats a la Seguretat Social, per residència (persones)"], ["Afiliados a la Seguridad Social", "Afiliados a la Seguridad Social, por residencia (personas)"],
        (g) => g("afil"), "cj_afil"),
      mk("q_reta", ["Autònoms", "Afiliats autònoms a la Seguretat Social, per residència (persones)"], ["Autónomos", "Afiliados autónomos a la Seguridad Social, por residencia (personas)"],
        (g) => g("reta"), retaI ? "cj_reta" : "cj_afil"),
    ];
  }

  function prepara() {
    if (LISTO) return true;
    if (typeof D === "undefined" || !D || !D.municipios || !window.indMapa || !window.mapaApi) return false;
    const { IND } = window.indMapa;
    // Entidades: municipios, comarcas, provincia y lugares de fuera
    const ent = [];
    const add = (frase, e) => { const tk = toks(frase); if (tk.length) ent.push({ tk, ...e }); };
    D.municipios.forEach((m) => {
      const nom = m.nom;
      const mm = /^(.*), (el|la|l'|els|les|s')$/.exec(nom);
      const base = mm ? mm[1] : nom;
      add(base, { tipus: "mun", m });
      if (mm) add(`${mm[2]} ${base}`, { tipus: "mun", m });
      // Nombres compuestos: «Palamós i Sant Joan», «Saus, Camallera i Llampaies»
      const parts = base.split(/, | i /);
      if (parts.length > 1) parts.forEach((p, k) => { if (k === 0 || !/^Sant[a]? /.test(p)) add(p, { tipus: "mun", m }); });
      (ALIES[nom] || "").split("|").filter(Boolean).forEach((a) => add(a, { tipus: "mun", m }));
    });
    const coms = [...new Set(D.municipios.map((m) => m.comarca))];
    coms.forEach((c) => { add(c, { tipus: "com", c }); (COM_ALIES[c] || "").split("|").filter(Boolean).forEach((a) => add(a, { tipus: "com", c })); });
    ["provincia de girona", "provincia de gerona", "la provincia", "provincia", "comarques gironines", "toda la provincia", "tota la provincia"].forEach((p) => add(p, { tipus: "prov" }));
    FORA.forEach((f) => add(f, { tipus: "fora", nom: f }));
    ENT = ent;

    // Indicadores municipales con valor numérico + virtuales
    const base = IND.filter((i) => i.v && !i.cat && !i.el && window.mapaApi.ok(i));
    const all = [...virtuals(IND), ...base];
    const especials = [
      { id: "alcalde", especial: true, ca: ["Alcalde", "Alcalde o alcaldessa"], es: ["Alcalde", "Alcalde o alcaldesa"] },
      { id: "comarca", especial: true, ca: ["Comarca", "Comarca"], es: ["Comarca", "Comarca"] },
    ];
    INDS = [...all, ...especials].map((i) => {
      const sh = new Set(), lg = new Set();
      ["ca", "es"].forEach((l) => {
        toks(i[l][0]).filter((w) => !STOP.has(w)).forEach((w) => { sh.add(stem(w)); VOCAB.add(w); });
        toks(i[l][1]).filter((w) => !STOP.has(w)).forEach((w) => { lg.add(stem(w)); VOCAB.add(w); });
      });
      return { i, sh, lg, pri: PRI.indexOf(i.id) };
    });
    // Sinónimos: cada lista se parte en frases de 1-4 palabras buscando las que aparecen en la pregunta (ver puntua)
    INDS.forEach((x) => {
      const fr = (SIN[x.i.id] || "").split(",").map((f) => toks(f).map(stem)).filter((f) => f.length);
      x.synTk = fr.filter((f) => f.length === 1).map((f) => f[0]);
      x.synFr = fr.filter((f) => f.length > 1);
      toks(SIN[x.i.id] || "").forEach((w) => VOCAB.add(w));
    });
    NIND = INDS.length;
    IDF = {};
    INDS.forEach((x) => new Set([...x.sh, ...x.lg, ...x.synTk]).forEach((s) => { IDF[s] = (IDF[s] || 0) + 1; }));
    Object.keys(IDF).forEach((s) => { IDF[s] = Math.log(1 + NIND / IDF[s]); });
    BYID = {}; INDS.forEach((x) => { BYID[x.i.id] = x; });
    LISTO = true;
    return true;
  }

  const eqTok = (q, k) => q === k || (q.length >= 5 && k.length >= 5 && (q.startsWith(k) || k.startsWith(q)) && Math.abs(q.length - k.length) <= 3) || (q.length >= 6 && k.length >= 6 && lev(q, k, 1) <= 1);

  // ---------------------------------------------------------------- Análisis de la pregunta
  function entitats(raw, tk) {
    const rawTk = String(raw).replace(/l·l/g, "ll").split(/[^\p{L}\p{N}]+/u).filter(Boolean);
    const cands = [];
    ENT.forEach((e) => {
      const n = e.tk.length;
      for (let s = 0; s + n <= tk.length; s++) {
        let sc = 0, ok = true;
        for (let k = 0; k < n; k++) {
          const a = tk[s + k], b = e.tk[k];
          if (a === b) { sc += b.length; continue; }
          // Aproximado solo en palabras largas que no son vocabulario de indicadores
          if (b.length >= 5 && a.length >= 4 && !VOCAB.has(a) && !STOP.has(a) && lev(a, b, b.length >= 8 ? 2 : 1) <= (b.length >= 8 ? 2 : 1)) { sc += b.length - 2 * lev(a, b, 2); continue; }
          ok = false; break;
        }
        if (!ok) continue;
        // Una sola palabra corta y genérica no basta
        if (n === 1 && e.tk[0].length < 3) continue;
        const frase = e.tk.join(" ");
        if (e.tipus === "mun" && RISC.has(frase)) {
          const r = rawTk[s] || "";
          const majus = r && r[0] === r[0].toUpperCase() && r[0] !== r[0].toLowerCase();
          if (!majus && !(s > 0 && PREP.has(tk[s - 1]))) continue;
        }
        cands.push({ e, s, n, sc });
      }
    });
    cands.sort((a, b) => b.sc - a.sc || b.n - a.n);
    const usat = new Array(tk.length).fill(false), res = [];
    cands.forEach((c) => {
      for (let k = c.s; k < c.s + c.n; k++) if (usat[k]) return;
      for (let k = c.s; k < c.s + c.n; k++) usat[k] = true;
      res.push(c);
    });
    res.sort((a, b) => a.s - b.s);
    return { res, usat };
  }

  function puntua(qs, qall) {
    // qs: [{w, s}] palabras de la pregunta sin entidades ni palabras vacías
    const out = INDS.map((x) => {
      let sc = 0;
      const vist = new Set();
      qs.forEach(({ s }) => {
        if (vist.has(s)) return; vist.add(s);
        let best = 0;
        x.synTk.forEach((k) => { if (s === k) best = Math.max(best, 4 * (IDF[k] || 1)); else if (eqTok(s, k)) best = Math.max(best, 2.5 * (IDF[k] || 1)); });
        x.sh.forEach((k) => { if (eqTok(s, k)) best = Math.max(best, 2 * (IDF[k] || 1)); });
        if (!best) x.lg.forEach((k) => { if (eqTok(s, k)) best = Math.max(best, 1 * (IDF[k] || 1)); });
        sc += best;
      });
      // Frases de sinónimos de varias palabras: cuentan si aparecen enteras y seguidas en la pregunta (con palabras vacías incluidas)
      x.synFr.forEach((f) => {
        for (let k = 0; k + f.length <= qall.length; k++) {
          if (f.every((w, j) => eqTok(qall[k + j], w))) { sc += 2 + f.reduce((t, w) => t + (STOP.has(w) ? 0 : 4 * (IDF[w] || 1)), 0); return; }
        }
      });
      return { x, sc: sc + (x.pri >= 0 ? (PRI.length - x.pri) * 0.01 : 0) };
    }).filter((o) => o.sc >= 1).sort((a, b) => b.sc - a.sc);
    return out;
  }

  function analitza(raw, forcat) {
    const tk = toks(raw);
    const { res, usat } = entitats(raw, tk);
    const set = new Set(tk);
    const has = (...w) => w.some((x) => set.has(x));
    const hasF = (re) => re.test(" " + tk.join(" ") + " ");
    const muns = [], coms = [], fora = [];
    let prov = false;
    res.forEach((c) => {
      if (c.e.tipus === "mun") { if (!muns.includes(c.e.m)) muns.push(c.e.m); }
      else if (c.e.tipus === "com") coms.push(c.e.c);
      else if (c.e.tipus === "prov") prov = true;
      else if (c.e.tipus === "fora") fora.push(c.e.nom);
    });
    // Filtro de población: «de más de 5.000 habitantes»
    let minPob = null, maxPob = null;
    const mp = /(?:mas|mes) de (\d+) (?:habitantes|habitants|hab|vecinos|veins)/.exec(tk.join(" "));
    const np = /(?:menos|menys) de (\d+) (?:habitantes|habitants|hab|vecinos|veins)/.exec(tk.join(" "));
    let txtSense = " " + tk.join(" ") + " ";
    if (mp) { minPob = +mp[1]; txtSense = txtSense.replace(mp[0], " "); }
    if (np) { maxPob = +np[1]; txtSense = txtSense.replace(np[0], " "); }
    const tk2 = txtSense.trim().split(" ");
    const s2 = new Set(tk2);
    const has2 = (...w) => w.some((x) => s2.has(x));
    // Orden
    let dir = null;
    if (has2("menos", "menys", "menor", "minimo", "minim", "minima") || /\b(mas|mes) (bajo|baja|bajos|bajas|baix|baixa|baixos|baixes)\b/.test(txtSense)) dir = "asc";
    else if (has2("mas", "mayor", "major", "maximo", "maxim", "maxima", "top", "ranking", "ranquing", "lider", "encabeza", "primeros", "primers") ||
      (s2.has("mes") && !/\b(el|este|aquest|cada|al|per|por|ultimo|ultim|darrer|del|un|aquell) mes\b/.test(txtSense))) dir = "desc";
    let adjInd = null;
    tk2.forEach((w) => ADJ.forEach((a) => { if (a.w.has(w)) { adjInd = a; } }));
    if (adjInd) dir = adjInd.dir;
    const ranqParaula = has2("ranking", "ranquing", "lista", "llista", "clasificacion", "classificacio", "top") || tk2.some((w) => LLOC.has(w));
    // Número de resultados: «los 5», «top 20»
    let nTop = 10;
    const mn = /\b(?:top|los|les|els|primeros|primers|primeres|primeras)\s+(\d{1,2})\b|\b(\d{1,2})\s+(?:municipios|municipis|pueblos|pobles|ciudades|ciutats|primeros|primers)\b/.exec(txtSense);
    if (mn) nTop = Math.max(1, Math.min(50, +(mn[1] || mn[2])));
    // Año pedido
    const ya = /\b(19[5-9]\d|20[0-4]\d)\b/.exec(txtSense);
    const any = ya ? ya[1] : null;
    const evol = hasF(/ (evolucion|evolucio|evoluciona|evolucionado|cambiado|canviat|subido|pujat|crecido|crescut|bajado|baixat|historico|historic|historica|serie|tendencia|variado|variat) /) ||
      hasF(/ (ha ido|ha anat|a lo largo|al llarg|ultimos anos|ultims anys|desde|des de|en los ultimos|als darrers) /);
    const compte = has("cuantos", "cuantas", "quants", "quantes", "numero", "nombre") || hasF(/ (cuanta gente|quanta gent) /);
    // Palabras que quedan para el indicador
    const qs = [];
    tk.forEach((w, k) => { if (!usat[k] && !STOP.has(w) && !/^\d+$/.test(w)) qs.push({ w, s: stem(w) }); });
    const qall = tk.filter((w, k) => !usat[k]).map(stem);
    let cands = puntua(qs, qall);
    // «Cuántos…»: si el mejor es una tasa y hay un recuento del mismo tema, se prefiere el recuento
    if (compte && cands.length) {
      const pref = { cj_atur: "cj_atur_n", atur: "cj_atur_n", cj_afil: "q_afil", ocupats: "q_afil", cj_reta: "q_reta", autonoms: "q_reta", tur_hut_c: "tur_hut_n", hut: "tur_hut_n", sol_h: "sol_n", tur_mov_rec_h: "tur_mov_rec", veh_total_h: "veh_n", com_est_h: "com_n" };
      const p = pref[cands[0].x.i.id];
      if (p && BYID[p]) cands = [{ x: BYID[p], sc: cands[0].sc + 1 }, ...cands.filter((c) => c.x.i.id !== p)];
    }
    let ind = null;
    // «El poble més petit»: si el adjetivo es lo único que apunta a un indicador, manda el adjetivo
    if (adjInd && !forcat && BYID[adjInd.id]) {
      const sense = qs.filter(({ w }) => !adjInd.w.has(w));
      const c2 = puntua(sense, qall.filter((w) => !adjInd.w.has(w)));
      if (!c2.length || c2[0].sc < 1.2) cands = [{ x: BYID[adjInd.id], sc: 99 }, ...cands.filter((c) => c.x.i.id !== adjInd.id)];
    }
    if (forcat && BYID[forcat]) ind = BYID[forcat].i;
    else if (cands.length && cands[0].sc >= 1.2) ind = cands[0].x.i;
    else if (adjInd && BYID[adjInd.id]) ind = BYID[adjInd.id].i;
    const alt = cands.filter((c) => !ind || c.x.i.id !== ind.id).slice(0, 4).map((c) => c.x.i);
    const dubte = !forcat && cands.length > 1 && ind && cands[1].sc >= cands[0].sc * 0.85;
    // Palabras que no corresponden a ningún dato del web: se avisa de que no se han tenido en cuenta
    const ignora = qs.filter(({ w }) => w.length >= 4 && !VOCAB.has(w) && !XERRA.has(w) && !ADJ.some((a) => a.w.has(w)) && !/^(evoluc|cambi|canvi|pujat|subid|crecid|cresc|bajad|baixat)/.test(w)).map((o) => o.w);
    return { tk, muns, coms, fora, prov, dir, ranqParaula, nTop, any, evol, compte, ind, alt, dubte, minPob, maxPob, qs, ignora };
  }

  // ---------------------------------------------------------------- Datos de un indicador
  const { anysDe, valorProvincia } = { get anysDe() { return window.indMapa.anysDe; }, get valorProvincia() { return window.indMapa.valorProvincia; } };
  // Serie temporal de un indicador: años, valor municipal y provincial. La población usa el padrón (m.pob_s), como la ficha.
  const cacheSer = {};
  function SER(i) {
    if (i.id === "pob") {
      if (!cacheSer.pob) {
        const anys = [...new Set(D.municipios.flatMap((m) => Object.keys(m.pob_s || {})))].sort();
        const tots = (a) => D.municipios.every((m) => m.pob_s && m.pob_s[a] != null);
        cacheSer.pob = { anys, mun: (m, a) => (m.pob_s ? m.pob_s[a] : null), prov: (a) => (tots(a) ? D.municipios.reduce((t, m) => t + m.pob_s[a], 0) : null) };
      }
      return cacheSer.pob;
    }
    if (!i.t) return { anys: [], mun: () => null, prov: () => null };
    return { anys: anysDe(i), mun: (m, a) => i.t(m, a), prov: (a) => (i.pv ? i.pv(a) : i.id === "lloguer" && D.provincia && D.provincia.alquiler ? D.provincia.alquiler[a] : null) };
  }
  const serie = (i) => SER(i).anys;
  function periode(i, a) {
    if (a) return etPer(String(a));
    if (PERIODE_FIX[i.id]) return PERIODE_FIX[i.id];
    const p = typeof i.a === "number" ? i.a : i.a && D.anys ? D.anys[i.a] : null;
    if (p) return etPer(String(p));
    if (i.per) { const l = serie(i); return l.length ? etPer(l[l.length - 1]) : ""; }
    return "";
  }
  function font(i) {
    if (i.nota) return typeof i.nota === "string" ? i.nota : i.nota[LANG] || i.nota.ca || "";
    const k = FONT_ID[i.id];
    return k ? F[k] : "";
  }
  const nomCurt = (i) => i[LANG][0], nomLlarg = (i) => i[LANG][1];
  const num = (v) => v != null && typeof v === "number" && isFinite(v);
  function valFn(i, a) { return a ? (m) => { try { return SER(i).mun(m, a); } catch (e) { return null; } } : (m) => { try { return i.v(m); } catch (e) { return null; } }; }
  function valors(i, a) { const f = valFn(i, a); return D.municipios.map((m) => ({ m, v: f(m) })).filter((o) => num(o.v)); }
  function refs(i) {
    let r = {};
    try {
      r = (i.ref && (i.per || i.virtual || i.a === "sol" || i.a === "irpf" || /^hb/.test(i.a || "") || i.a === "veh" || ["cad", "cad_vm2", "cad_ibi"].includes(i.a)) ? i.ref() : (D.ref || {})[i.id]) || {};
    } catch (e) { r = {}; }
    let gi = null;
    try { gi = i.id === "pob" ? D.provincia && D.provincia.poblacion : valorProvincia(i); } catch (e) { gi = null; }
    return { gi: num(gi) ? gi : null, cat: num(r.cat) ? r.cat : null, esp: num(r.esp) ? r.esp : null };
  }
  // Año pedido -> clave de la serie (último mes o trimestre de ese año)
  function clauAny(i, any) {
    if (!any) return null;
    const l = serie(i).filter((a) => String(a).slice(0, 4) === any);
    return l.length ? l[l.length - 1] : null;
  }

  // ---------------------------------------------------------------- Piezas de la respuesta
  const nomMun = (m) => { const mm = /^(.*), (el|la|l'|els|les|s')$/.exec(m.nom); return mm ? (mm[2].endsWith("'") ? mm[2] + mm[1] : `${mm[2]} ${mm[1]}`).replace(/^./, (c) => c.toUpperCase()) : m.nom; };
  function botons(i, m) {
    const id = i && (i.mapa || i.id);
    return `<p class="pq-accions">${id && !i.especial ? `<button type="button" class="pq-btn" data-mapa="${esc(id)}"${m ? ` data-ine="${m.ine}"` : ""}>${tx("mapa")} →</button>` : ""}${m ? `<button type="button" class="pq-btn pq-btn-2" data-fitxa="${m.ine}">${esc(tx("fitxa", nomMun(m)))} →</button>` : ""}</p>`;
  }
  const peuFont = (i, serieUsada) => { const f = serieUsada && i.id === "pob" ? tx("padro") : font(i); return f ? `<p class="pq-font"><span>${tx("font")}</span> ${esc(f)}</p>` : ""; };
  function refsHtml(i, r, extra) {
    const files = [...(extra || []), [tx("gi"), r.gi, "gi"], [tx("cat"), r.cat, "cat"], [tx("esp"), r.esp, "esp"]].filter((x) => num(x[1]));
    if (!files.length) return "";
    return `<dl class="pq-refs">${files.map(([n, v, k]) => `<div class="pq-ref pq-ref-${k}"><dt>${esc(n)}</dt><dd>${esc(i.f(v))}</dd></div>`).join("")}</dl>`;
  }
  // Tira con todos los municipios y las marcas del municipio y las referencias
  function tira(i, vals, m, r) {
    const vs = vals.map((o) => o.v);
    // Las referencias solo entran en la tira si son comparables (no un total provincial frente a municipios)
    const v0 = Math.min(...vs), v1 = Math.max(...vs), rg = v1 - v0 || Math.abs(v1) || 1;
    r = Object.fromEntries(["gi", "cat", "esp"].map((k) => [k, num(r[k]) && r[k] >= v0 - rg && r[k] <= v1 + rg ? r[k] : null]));
    const ref = [r.gi, r.cat, r.esp].filter(num);
    let mn = Math.min(...vs, ...ref), mx = Math.max(...vs, ...ref);
    if (!(mx > mn)) return "";
    const X_ = (x) => (3 + ((x - mn) / (mx - mn)) * 94).toFixed(1);
    const punts = vals.map((o) => `<i style="left:${X_(o.v)}%"></i>`).join("");
    const marca = (x, cls, tit) => (num(x) ? `<b class="${cls}" style="left:${X_(x)}%" title="${esc(tit)}: ${esc(i.f(x))}"></b>` : "");
    const mv = m ? vals.find((o) => o.m === m) : null;
    return `<div class="pq-tira" aria-hidden="true"><div class="pq-tira-punts">${punts}</div>${marca(r.esp, "pq-m-esp", tx("esp"))}${marca(r.cat, "pq-m-cat", tx("cat"))}${marca(r.gi, "pq-m-gi", tx("gi"))}${mv ? marca(mv.v, "pq-m-mun", nomMun(m)) : ""}
      <span class="pq-tira-min">${esc(i.f(Math.min(...vs)))}</span><span class="pq-tira-max">${esc(i.f(Math.max(...vs)))}</span></div>
      <p class="pq-llegenda">${m ? `<span><i class="pq-m-mun"></i>${esc(nomMun(m))}</span>` : ""}${num(r.gi) ? `<span><i class="pq-m-gi"></i>${tx("gi")}</span>` : ""}${num(r.cat) ? `<span><i class="pq-m-cat"></i>${tx("cat")}</span>` : ""}${num(r.esp) ? `<span><i class="pq-m-esp"></i>${tx("esp")}</span>` : ""}</p>`;
  }
  function chips(list, titol) {
    if (!list.length) return "";
    return `<div class="pq-alt"><p>${titol}</p>${list.map((i) => `<button type="button" class="pq-xip" data-ind="${esc(i.id)}">${esc(nomCurt(i))}</button>`).join("")}</div>`;
  }
  const cap = (sobre, titol) => `<p class="pq-sobre">${sobre}</p><h3 class="pq-titol">${esc(titol)}</h3>`;
  function sparkline(punts, i) {
    // punts: [{a, v}]
    const w = 640, h = 120, p = 6;
    const vs = punts.map((o) => o.v), mn = Math.min(...vs), mx = Math.max(...vs);
    const X_ = (k) => p + (k / Math.max(1, punts.length - 1)) * (w - 2 * p), Y_ = (v) => (mx > mn ? h - p - ((v - mn) / (mx - mn)) * (h - 2 * p) : h / 2);
    const d = punts.map((o, k) => `${k ? "L" : "M"}${X_(k).toFixed(1)},${Y_(o.v).toFixed(1)}`).join("");
    const u = punts[punts.length - 1];
    return `<figure class="pq-evol"><svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" role="img" aria-label="${esc(nomCurt(i))}"><path d="${d}" fill="none" stroke="currentColor" stroke-width="2.5" vector-effect="non-scaling-stroke"/>
      <circle cx="${X_(punts.length - 1)}" cy="${Y_(u.v)}" r="4" class="pq-evol-u"/></svg>
      <figcaption><span>${esc(etPer(String(punts[0].a)))}</span><span>${esc(i.f(mn))} – ${esc(i.f(mx))}</span><span>${esc(etPer(String(u.a)))}</span></figcaption></figure>`;
  }
  const varTxt = (a, b) => (num(a) && num(b) && a !== 0 && a > 0 && b > 0 ? pct((b / a - 1) * 100, 1, true) : "");

  // ---------------------------------------------------------------- Tipos de respuesta
  function respMun(q, i, m) {
    if (i.id === "alcalde") {
      const a = m.pol && m.pol.alcalde;
      return cap(esc(nomMun(m)) + " · " + esc(m.comarca), nomCurt(i)) + `<p class="pq-frase">${a ? tx("alcalde", esc(nomMun(m)), esc(a.nom), esc(a.partit)) : tx("sense_alcalde", esc(nomMun(m)))}</p>` + botons({ id: "alcalde" }, m);
    }
    if (i.id === "comarca") return cap(esc(nomMun(m)), nomCurt(i)) + `<p class="pq-frase">${tx("comarca", esc(nomMun(m)), esc(m.comarca))}</p>` + botons(null, m);
    let a = clauAny(i, q.any), avis = "";
    if (q.any && !a) avis = `<p class="pq-avis">${serie(i).length > 1 ? tx("any_no", q.any) : tx("sense_serie")}</p>`;
    const vals = valors(i, a);
    const mv = vals.find((o) => o.m === m);
    const sobre = `${esc(nomMun(m))} · ${esc(m.comarca)}`;
    if (!mv) {
      const r = refs(i);
      const alt = q.alt.filter((x) => !x.especial && num(valFn(x)(m))).slice(0, 4);
      q.altFet = true;
      return cap(sobre, nomCurt(i)) + `<p class="pq-frase">${tx("sense_dada", esc(nomLlarg(i)), esc(nomMun(m)))}</p>` + refsHtml(i, a ? {} : r) + peuFont(i) + botons(i, m) +
        chips(alt, tx("si_que", nomMun(m)));
    }
    const pos = vals.filter((o) => o.v > mv.v).length + 1;
    const r = a ? { gi: SER(i).prov(a) } : refs(i);
    let extra = "";
    if (i.id === "q_asal" || i.id === "q_afil") {
      const aa = a || serie(i).slice(-1)[0];
      const ra = BYID.cj_afil && BYID.cj_afil.i.t(m, aa), rr = BYID.cj_reta && BYID.cj_reta.i.t(m, aa);
      if (num(ra) && num(rr)) extra = `<p class="pq-nota">${tx("afil_nota", fmt(ra, 1), pct(rr, 0))}${i.id === "q_asal" ? " " + tx("asal_nota") : ""}</p>`;
    }
    if (a && a !== serie(i).slice(-1)[0]) {
      const vu = valFn(i)(m);
      if (num(vu)) extra += `<p class="pq-nota">${tx("ultim", periode(i), i.f(vu))}</p>`;
    }
    return cap(sobre, nomCurt(i)) + avis +
      `<p class="pq-valor"><span class="pq-num">${esc(i.f(mv.v))}</span><span class="pq-unitat">${esc(nomLlarg(i))}${periode(i, a) ? ` · ${esc(periode(i, a))}` : ""}</span></p>` +
      `<p class="pq-pos">${tx("posicio", pos, vals.length)}</p>` + extra + refsHtml(i, r) + tira(i, vals, m, r) + peuFont(i, !!a) + botons(i, m);
  }

  function respRanquing(q, i) {
    let a = clauAny(i, q.any);
    const asc = q.dir === "asc";
    let vals = valors(i, a);
    const filtres = [];
    if (q.minPob) { vals = vals.filter((o) => (o.m.poblacion || 0) > q.minPob); filtres.push(tx("mes_de", fmt(q.minPob))); }
    if (q.maxPob) { vals = vals.filter((o) => (o.m.poblacion || 0) < q.maxPob); filtres.push(tx("menys_de", fmt(q.maxPob))); }
    if (q.coms.length) { vals = vals.filter((o) => q.coms.includes(o.m.comarca)); filtres.push(tx("a_comarca", q.coms.join(", "))); }
    const tot = vals.length;
    vals.sort((x, y) => (asc ? x.v - y.v : y.v - x.v) || (y.m.poblacion || 0) - (x.m.poblacion || 0));
    const top = vals.slice(0, q.nTop);
    const sobre = `${tx("rank_sobre", asc)}${periode(i, a) ? " · " + esc(periode(i, a)) : ""}`;
    if (!top.length) return cap(sobre, nomCurt(i)) + `<p class="pq-frase">${tx("cap_rank")}</p>` + botons(i);
    const max = Math.max(...top.map((o) => Math.abs(o.v))) || 1;
    const files = top.map((o, k) => `<li><span class="pq-r-n">${k + 1}</span><button type="button" class="pq-r-nom" data-fitxa="${o.m.ine}">${esc(nomMun(o.m))}<small>${esc(o.m.comarca)}${i.id === "pob" ? "" : ` · ${fmt(o.m.poblacion)} ${tx("habitants")}`}</small></button><span class="pq-r-barra"><b style="width:${((Math.abs(o.v) / max) * 100).toFixed(1)}%"></b></span><span class="pq-r-v">${esc(i.f(o.v))}</span></li>`).join("");
    const r = a ? {} : refs(i);
    return cap(sobre, nomCurt(i)) +
      `<p class="pq-frase">${tx("rank_frase", esc(nomMun(top[0].m)), esc(i.f(top[0].v)), asc)} <span class="pq-sub">${esc(nomLlarg(i))}.</span>${filtres.length ? " " + tx("rank_filtre", filtres.join(", ")) : ""}</p>` +
      `<ol class="pq-ranquing">${files}</ol>` + (!q.minPob && !q.maxPob && tot > 60 ? `<p class="pq-nota">${tx("rank_nota")}</p>` : "") +
      refsHtml(i, r) + peuFont(i) + botons(i);
  }

  function respComparacio(q, i, muns) {
    let a = clauAny(i, q.any);
    const vals = valors(i, a);
    const r = a ? {} : refs(i);
    const files = muns.map((m) => ({ m, o: vals.find((x) => x.m === m) }));
    const vs = files.filter((f) => f.o).map((f) => Math.abs(f.o.v)).concat([r.gi, r.cat, r.esp].filter(num).map(Math.abs));
    const max = Math.max(...vs, 0) || 1;
    const fila = (nom, sub, v, cls, ine) => `<li class="${cls}"><span class="pq-r-nom"${ine ? ` data-fitxa="${ine}" role="button" tabindex="0"` : ""}>${esc(nom)}${sub ? `<small>${esc(sub)}</small>` : ""}</span><span class="pq-r-barra">${num(v) ? `<b style="width:${((Math.abs(v) / max) * 100).toFixed(1)}%"></b>` : ""}</span><span class="pq-r-v">${num(v) ? esc(i.f(v)) : "–"}</span></li>`;
    const pos = (v) => vals.filter((o) => o.v > v).length + 1;
    const ls = files.map((f) => fila(nomMun(f.m), f.o ? tx("pos_curt", pos(f.o.v), vals.length) : tx("sense_curt"), f.o ? f.o.v : null, "pq-c-mun", f.m.ine)).join("") +
      [[tx("prov"), r.gi, "gi"], [tx("cat"), r.cat, "cat"], [tx("esp"), r.esp, "esp"]].filter((x) => num(x[1])).map(([n, v, k]) => fila(n, "", v, `pq-c-ref pq-c-${k}`)).join("");
    const amb = files.filter((f) => f.o).sort((x, y) => y.o.v - x.o.v);
    const frase = amb.length >= 2 ? `<p class="pq-frase">${amb.map((f) => `${esc(nomMun(f.m))}: <b>${esc(i.f(f.o.v))}</b>`).join(" · ")}</p>` : "";
    return cap(`${tx("comp_tit")}${periode(i, a) ? " · " + esc(periode(i, a)) : ""}`, nomCurt(i)) + frase + `<p class="pq-sub">${esc(nomLlarg(i))}</p>` +
      `<ol class="pq-ranquing pq-comp">${ls}</ol>` + peuFont(i) + botons(i);
  }

  function respEvolucio(q, i, muns) {
    const l = serie(i);
    if (l.length < 2) return null;
    const blocs = (muns.length ? muns : [null]).map((m) => {
      const sr = SER(i);
      const punts = l.map((a) => ({ a, v: m ? valFn(i, a)(m) : sr.prov(a) })).filter((o) => num(o.v));
      if (punts.length < 2) return m ? `<p class="pq-frase"><b>${esc(nomMun(m))}</b>: ${tx("sense_dada", esc(nomLlarg(i)), esc(nomMun(m)))}</p>` : "";
      const p0 = punts[0], pu = punts[punts.length - 1];
      return `<div class="pq-evol-bloc">${muns.length > 1 || !m ? `<h4>${esc(m ? nomMun(m) : tx("prov"))}</h4>` : ""}<p class="pq-frase">${tx("evol_frase", esc(etPer(String(p0.a))), esc(i.f(p0.v)), esc(etPer(String(pu.a))), esc(i.f(pu.v)), varTxt(p0.v, pu.v))}</p>${sparkline(punts, i)}</div>`;
    }).join("");
    if (!blocs.trim()) return null;
    const sobre = muns.length === 1 ? `${esc(nomMun(muns[0]))} · ${tx("evol_tit")}` : tx("evol_tit");
    return cap(sobre, nomCurt(i)) + `<p class="pq-sub">${esc(nomLlarg(i))}</p>` + blocs + peuFont(i, true) + botons(i, muns.length === 1 ? muns[0] : null);
  }

  function respProvincia(q, i) {
    if (i.especial) return null;
    let a = clauAny(i, q.any);
    const vals = valors(i, a).sort((x, y) => y.v - x.v);
    const r = a ? { gi: SER(i).prov(a) } : refs(i);
    const llista = (arr) => `<ol class="pq-mini">${arr.map((o) => `<li><button type="button" data-fitxa="${o.m.ine}">${esc(nomMun(o.m))}</button><span>${esc(i.f(o.v))}</span></li>`).join("")}</ol>`;
    return cap(`${tx("prov")}${periode(i, a) ? " · " + esc(periode(i, a)) : ""}`, nomCurt(i)) +
      (num(r.gi) ? `<p class="pq-valor"><span class="pq-num">${esc(i.f(r.gi))}</span><span class="pq-unitat">${esc(nomLlarg(i))}</span></p>` : `<p class="pq-frase">${tx("sense_prov")}</p><p class="pq-sub">${esc(nomLlarg(i))}</p>`) +
      refsHtml(i, { cat: r.cat, esp: r.esp }) + (vals.length ? tira(i, vals, null, r) : "") +
      (vals.length >= 6 ? `<div class="pq-dalt-baix"><div><h4>${tx("dalt")}</h4>${llista(vals.slice(0, 3))}</div><div><h4>${tx("baix")}</h4>${llista(vals.slice(-3).reverse())}</div></div>` : "") +
      peuFont(i) + botons(i);
  }

  function respResum(m) {
    const ids = ["pob", "renda", "lloguer", "cj_atur", "q_asal", "edat", "estrangers", "hut"];
    const fil = ids.map((id) => BYID[id] && BYID[id].i).filter(Boolean).map((i) => {
      const v = valFn(i)(m);
      if (!num(v)) return "";
      return `<li><button type="button" class="pq-xip-gran" data-ind="${esc(i.id)}" data-ine="${m.ine}"><span>${esc(nomCurt(i))}</span><b>${esc(i.f(v))}</b><small>${esc(periode(i))}</small></button></li>`;
    }).join("");
    const a = m.pol && m.pol.alcalde;
    return `<ul class="pq-resum">${fil}</ul>${a ? `<p class="pq-nota">${tx("alcalde", esc(nomMun(m)), esc(a.nom), esc(a.partit))}</p>` : ""}` + botons(null, m);
  }

  function noEntenc(extra) {
    return `<p class="pq-frase">${tx("no_entenc")}</p>${extra || ""}<p class="pq-sub">${tx("no_entenc_2")}</p><div class="pq-alt">${tx("exemples").slice(0, 4).map((e) => `<button type="button" class="pq-xip" data-q="${esc(e)}">${esc(e)}</button>`).join("")}</div>`;
  }

  // ---------------------------------------------------------------- Respuesta
  let ultima = null;
  function respon(raw, forcat, ineForcat) {
    raw = String(raw || "").trim();
    if (!raw && !forcat) { out.hidden = true; out.innerHTML = ""; return; }
    if (!prepara()) { out.hidden = false; out.innerHTML = `<p class="pq-sub">…</p>`; setTimeout(() => respon(raw, forcat, ineForcat), 300); return; }
    ultima = { raw, forcat, ineForcat };
    const q = analitza(raw, forcat);
    if (ineForcat) { const m = D.municipios.find((x) => x.ine === ineForcat); if (m && !q.muns.includes(m)) q.muns = [m]; }
    const i = q.ind;
    let html = "";
    if (!q.muns.length && q.fora.length) html = `<p class="pq-frase">${esc(tx("fora", q.fora[0]))}</p>` + noEntenc("").replace(/^<p class="pq-frase">.*?<\/p>/, "");
    else if (!i && q.muns.length === 1) html = `<p class="pq-frase">${q.ignora.length ? tx("no_tinc_mun", esc(nomMun(q.muns[0])), esc(q.ignora.join(" "))) : tx("nomes_mun", esc(nomMun(q.muns[0])))}</p>` + respResum(q.muns[0]) + chips(q.alt, tx("semblants"));
    else if (!i && q.muns.length > 1) {
      // Sin indicador, varios municipios: se comparan los datos básicos
      html = ["pob", "renda", "lloguer", "cj_atur"].map((id) => BYID[id] && respComparacio(q, BYID[id].i, q.muns)).filter(Boolean).map((h) => `<section class="pq-bloc">${h}</section>`).join("");
    } else if (!i) html = noEntenc(chips(q.alt, tx("semblants")));
    else if (i.especial && !q.muns.length) html = noEntenc("");
    else if ((q.evol || (q.any && !q.muns.length && false)) && !i.especial) html = respEvolucio(q, i, q.muns) || (q.muns.length ? respMun(q, i, q.muns[0]) : respProvincia(q, i)).replace(/(<\/h3>)/, `$1<p class="pq-avis">${tx("sense_serie")}</p>`);
    else if (q.muns.length > 1) html = respComparacio(q, i, q.muns);
    else if (q.muns.length === 1) html = respMun(q, i, q.muns[0]);
    else if ((q.dir || q.ranqParaula || q.minPob || q.maxPob || q.coms.length) && !i.especial) {
      if (!q.dir) q.dir = "desc";
      html = respRanquing(q, i);
    } else html = respProvincia(q, i) || noEntenc("");
    if (i && !forcat && q.ignora.length && !i.especial) html = html.replace(/(<\/h3>)/, `$1<p class="pq-avis">${tx("no_tinc", esc(q.ignora.join(" ")))}</p>`);
    // Si había otro indicador casi igual de probable, se ofrece
    if (i && !i.especial && q.alt.length && !q.altFet) html += chips(q.alt.slice(0, q.dubte ? 4 : 3), q.dubte ? tx("semblants") : tx("altres"));
    out.innerHTML = `<div class="pq-cos">${html}</div>`;
    out.hidden = false;
    out.dataset.indicador = i ? i.id : "";
  }

  // ---------------------------------------------------------------- Interfaz
  function pintaExemples() {
    if (!exEl) return;
    exEl.innerHTML = tx("exemples").map((e) => `<button type="button" class="pq-ex" data-q="${esc(e)}">${esc(e)}</button>`).join("");
  }
  function desaUrl(q) {
    try {
      const u = new URL(location.href);
      if (q) u.searchParams.set("q", q); else u.searchParams.delete("q");
      history.replaceState(history.state, "", u.pathname + u.search + u.hash);
    } catch (e) { /* */ }
  }
  form.addEventListener("submit", (e) => { e.preventDefault(); respon(inp.value); desaUrl(inp.value.trim()); });
  inp.addEventListener("search", () => { if (!inp.value) { respon(""); desaUrl(""); } });
  exEl && exEl.addEventListener("click", (e) => { const b = e.target.closest("[data-q]"); if (!b) return; inp.value = b.dataset.q; respon(inp.value); desaUrl(inp.value); });
  out.addEventListener("click", (e) => {
    const q = e.target.closest("[data-q]");
    if (q) { inp.value = q.dataset.q; respon(inp.value); desaUrl(inp.value); return; }
    const x = e.target.closest("[data-ind]");
    if (x) { respon(inp.value, x.dataset.ind, x.dataset.ine); return; }
    const mp = e.target.closest("[data-mapa]");
    if (mp && window.mapaApi) {
      const id = mp.dataset.mapa, ine = mp.dataset.ine;
      Promise.resolve(window.mapaApi.tria(id)).then(() => { if (ine) setTimeout(() => window.mapaApi.selecciona(ine), 450); });
      document.getElementById("s-mapa").scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    const f = e.target.closest("[data-fitxa]");
    if (f && typeof window.obreFitxa === "function") window.obreFitxa(f.dataset.fitxa, true);
  });
  out.addEventListener("keydown", (e) => { if (e.key === "Enter" && e.target.matches("[data-fitxa][role=button]")) e.target.click(); });

  // Desde el buscador de indicadores del mapa: si lo escrito parece una pregunta, se ofrece responderla
  const ci = document.getElementById("cerca-ind"), pont = document.getElementById("pregunta-mapa");
  if (ci && pont) {
    const mira = () => {
      const v = ci.value.trim();
      const sembla = v.length > 3 && (v.split(/\s+/).length >= 3 || /\?$/.test(v) || (prepara() && entitats(v, toks(v)).res.some((c) => c.e.tipus === "mun")));
      pont.hidden = !sembla;
      if (sembla) pont.innerHTML = `<span>${esc(t("pq_des_mapa"))}</span> «${esc(v)}» →`;
    };
    ci.addEventListener("input", mira);
    pont.addEventListener("click", () => {
      inp.value = ci.value.trim(); ci.value = ""; ci.dispatchEvent(new Event("input")); pont.hidden = true;
      if (window.mapaMenuInd && window.mapaMenuInd.tanca) try { window.mapaMenuInd.tanca(); } catch (e) { /* */ }
      respon(inp.value); desaUrl(inp.value);
      form.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  // Idioma
  document.querySelectorAll(".idiomes button").forEach((b) => b.addEventListener("click", () => {
    pintaExemples();
    if (ultima && !out.hidden) respon(ultima.raw, ultima.forcat, ultima.ineForcat);
  }));
  pintaExemples();
  // Pregunta en la URL (?q=…): se responde al cargar
  try {
    const q0 = new URLSearchParams(location.search).get("q");
    if (q0) { inp.value = q0; respon(q0); }
  } catch (e) { /* */ }
  // Para pruebas
  window.preguntaDades = { respon, analitza: (s) => (prepara() ? analitza(s) : null), puntua: (s) => { prepara(); const tk = toks(s); return puntua(tk.filter((w) => !STOP.has(w)).map((w) => ({ w, s: stem(w) })), tk.map(stem)).slice(0, 5).map((o) => o.x.i.id + ":" + o.sc.toFixed(2)); } };
})();
