"use strict";
/* Pregunta a les dades: cercador de preguntes en llenguatge natural, sense IA i sense servidor.
   1. Normalitza la pregunta i hi busca llocs (municipis, nuclis, comarques, província, llocs de fora) amb una clau fonètica
      que perdona accents, guions, apòstrofs, articles, castellanitzacions i faltes (ny/ñ, ll/l, ç, x/ch, v/b, h…).
   2. Detecta la intenció amb llistes de paraules: rànquing, filtres, condicions, evolució, any, recompte, font, tema, eleccions, seccions.
   3. Puntua els ~380 indicadors del mapa amb les paraules que queden (nom, títol i sinònims de pregunta-dic.js, ponderats per IDF).
      Si la pregunta té diverses parts («paro y alquiler»), puntua cada part.
   4. Respon NOMÉS amb les xifres que calcula el mapa (window.indMapa, window.mapaApi) o amb els fitxers de dades del web.
      Si no entén la pregunta o no hi ha dada, ho diu i proposa dades semblants: no s'inventa res.
   Usa les globals d'app.js: D, LANG, t, fmt, pct, etPer, obreFitxa, nomBloc. */
(() => {
  const form = document.getElementById("pregunta-form");
  if (!form) return;
  const inp = document.getElementById("pregunta");
  const out = document.getElementById("pregunta-resposta");
  const exEl = document.getElementById("pregunta-exemples");
  const DIC = window.PREGUNTA_DIC || { SIN: {}, ALIES: {}, NUCLIS: {}, COM_ALIES: {}, FORA: [], TEMES: {} };

  // ---------------------------------------------------------------- Textos
  const X = {
    ca: {
      exemples: ["Quants assalariats hi ha a Agullana?", "Quin municipi té més atur?", "Lloguer a Olot vs Figueres", "Atur i lloguer a Salt", "Pobles amb el lloguer per sota de 600 €", "Com ha canviat la població de Salt?", "Qui va guanyar les eleccions a Girona?", "Secció més rica de Girona", "Desnonaments a Figueres", "Dades d'habitatge de Lloret"],
      prov: "Província de Girona", cat: "Catalunya", esp: "Espanya", gi: "Província",
      posicio: (p, n) => `Posició <b>${p}</b> de ${n} municipis amb dada, de més a menys.`,
      posicio_z: (p, n, z) => `Posició <b>${p}</b> de ${n} ${z}, de més a menys.`,
      font: "Font", mapa: "Veure al mapa", fitxa: (n) => `Fitxa de ${n}`, mapa_sec: "Veure les seccions al mapa",
      semblants: "Potser volies dir", altres: "Altres dades que et poden interessar", si_que: (m) => `Dades semblants que sí que hi ha per a ${m}`,
      sense_dada: (ind, mun) => `No hi ha dada de <b>${ind}</b> per a ${mun}: la font no la publica per a aquest municipi.`,
      no_entenc: "No he sabut respondre aquesta pregunta amb les dades del web.",
      no_entenc_2: "Funciona millor amb un municipi i una dada concreta. Prova, per exemple:",
      nomes_mun: (m) => `Resum de <b>${m}</b>. Toca una xifra per veure-la en detall o pregunta per una dada concreta.`,
      no_tinc: (w) => `No tinc dades de «${w}». Et mostro la dada més propera que he trobat.`,
      no_tinc_mun: (m, w) => `He reconegut <b>${m}</b>, però no tinc dades de «${w}» per municipi. Aquest és el seu resum:`,
      fora: (n) => `${n} no és de la província de Girona. Aquest web només cobreix els seus 221 municipis.`,
      nucli: (n, m) => `${n} forma part del municipi de <b>${m}</b>: les dades són de tot el municipi.`,
      parcial: (w, m) => `He entès «${w}» com a ${m}, el més poblat. Volies dir un altre?`,
      rank_sobre: (asc) => `Rànquing · de ${asc ? "menys a més" : "més a menys"}`,
      rank_frase: (m, v, asc) => `El valor més ${asc ? "baix" : "alt"} és el de <b>${m}</b>: <b>${v}</b>.`,
      rank_filtre: (f) => `Només ${f}.`,
      rank_nota: "Els municipis petits poden tenir valors extrems. Pots afinar-ho: «de més de 5.000 habitants».",
      mes_de: (n) => `municipis de més de ${n} habitants`, menys_de: (n) => `municipis de menys de ${n} habitants`, a_comarca: (c) => `municipis de la comarca ${c}`,
      cap_rank: "Cap municipi compleix aquestes condicions.",
      comp_tit: "Comparació", evol_tit: "Evolució", pos_curt: (p, n) => `posició ${p} de ${n}`, sense_curt: "sense dada",
      evol_frase: (a, va, b, vb, d) => `De ${a} a ${b} ha passat de <b>${va}</b> a <b>${vb}</b>${d ? ` (${d})` : ""}.`,
      sense_serie: "Aquest indicador no té sèrie històrica al web; aquesta és la darrera dada.",
      any_no: (a) => `No hi ha dada de ${a} per a aquest indicador; aquesta és la més recent.`,
      ultim: (p, v) => `Darrera dada${p ? ` (${p})` : ""}: ${v}.`, padro: "INE, padró municipal",
      sense_prov: "Aquest indicador no té un valor per al conjunt de la província.",
      dalt: "Valors més alts", baix: "Valors més baixos",
      alcalde: (m, n, p) => `L'alcalde o alcaldessa de ${m} és <b>${n}</b>${p ? ` (${p})` : ""}.`,
      sense_alcalde: (m) => `No tinc el nom de l'alcalde de ${m}.`,
      comarca: (m, c) => `${m} és a la comarca <b>${c}</b>.`,
      afil_nota: (r, p) => `Són ${r} per cada 100 residents de 15 a 64 anys. Els autònoms són el ${p} dels afiliats.`,
      asal_nota: "Assalariats: afiliacions totals menys les d'autònoms (règim general), segons el municipi de residència.",
      habitants: "habitants",
      // Comparació amb la mitjana
      vs: (qui, d, ref, rv) => `${qui} està ${d} ${ref} (${rv}).`,
      per_sobre: (x) => `un ${x} per sobre de`, per_sota: (x) => `un ${x} per sota de`, punts_sobre: (x) => `${x} punts per sobre de`, punts_sota: (x) => `${x} punts per sota de`, igual: "igual que",
      la_prov: "la província", cat_ref: "Catalunya", esp_ref: "Espanya",
      mes_que: (a, d, b) => `${a}: ${d} que ${b}.`,
      // Diverses dades
      multi_tit: (m) => `${m}: diverses dades`, multi_comp: "Diverses dades i municipis",
      // Condicions
      cond_tit: "Municipis que compleixen les condicions", cond_frase: (n, c) => `<b>${n}</b> ${n === 1 ? "municipi" : "municipis"} ${c}.`, cond_i: " i ",
      cond_mes: (i, v) => `amb ${i} per sobre de ${v}`, cond_menys: (i, v) => `amb ${i} per sota de ${v}`, cond_cap: "Cap municipi compleix les condicions.",
      // Àrees (salut, policia, jutjats, agents rurals)
      area_tit: { abs: "Àrea bàsica de salut", abp: "Àrea bàsica policial", pj: "Partit judicial", aar: "Àrea d'Agents Rurals" },
      area_nota: (t, n) => `Dada de l'${t.toLowerCase()} <b>${n}</b>, a la qual pertany el municipi: la font no la publica per municipis.`,
      area_nota_pj: (n) => `Dada del partit judicial de <b>${n}</b>, al qual pertany el municipi: la font no la publica per municipis.`,
      arees: { abs: "àrees de salut", abp: "àrees policials", pj: "partits judicials", aar: "àrees" },
      // Tema
      tema_tit: (tm, m) => `${tm} a ${m}`, tema_prov: (tm) => `${tm} a la província`, tema_frase: (n) => `${n} indicadors d'aquest tema. Toca'n un per veure'l en detall.`,
      // Font
      font_tit: "D'on surt aquesta dada", font_frase: (i) => `La dada «${i}» surt de:`, font_per: (p) => `Període: ${p}.`, font_totes: "Totes les fonts del web",
      // Per què
      perque: "No puc explicar les causes: només mostro les dades publicades. Aquestes són les que hi tenen relació:",
      // Seccions
      sec_tit: (m) => `Seccions censals de ${m}`, sec_prov: "Seccions censals de la província", sec_frase: (s, v, asc) => `La secció amb el valor més ${asc ? "baix" : "alt"} és la <b>${s}</b>: <b>${v}</b>.`,
      sec_nom: (d, s) => `districte ${d}, secció ${s}`, sec_no: (i) => `«${i}» no es publica per seccions censals.`, sec_n: (n) => `${n} seccions amb dada.`,
      // Eleccions
      el_tit: (n) => n, el_guanya: (m, c, p) => `A ${m} va guanyar <b>${c}</b>, amb el ${p} dels vots vàlids.`,
      el_part: (v) => `Participació: <b>${v}</b>.`, el_bloc: (b, m, v) => `${b} va treure el <b>${v}</b> dels vots vàlids a ${m}.`,
      el_bloc_prov: (b, v) => `${b}: <b>${v}</b> a la província.`, el_rank: (b) => `On vota més ${b}`, el_guany_rank: (b) => `On va guanyar ${b}`,
      el_guany_n: (b, n, t) => `${b} va ser la candidatura més votada a <b>${n}</b> dels ${t} municipis.`, el_cap: "No he trobat aquesta elecció.",
      el_font: "Resultats oficials (Ministeri de l'Interior i Generalitat). Percentatges sobre els vots vàlids (candidatures i en blanc).",
      el_prov: "Província", el_cand: "Candidatura", el_vots: "Vots", el_carregant: "Carregant els resultats…",
      // Interpretació en directe
      entenc: "Entenc", suggeriments: "Suggeriments", t_valor: "valor", t_rank: "rànquing", t_comp: "comparació", t_evol: "evolució",
      s_atur: (m) => `Atur a ${m}`, s_lloguer: (m) => `Lloguer a ${m}`, s_renda: (m) => `Renda de ${m}`, s_pob: (m) => `Com ha canviat la població de ${m}`, s_alc: (m) => `Qui és l'alcalde de ${m}`,
      s_eleccions: (m) => `Qui va guanyar les eleccions a ${m}`, s_habitatge: (m) => `Dades d'habitatge de ${m}`,
      s_mes: (i) => `Municipis amb més ${i.toLowerCase()}`, s_menys: (i) => `Municipis amb menys ${i.toLowerCase()}`, s_a: (i, m) => `${i} a ${m}`, s_evol: (i, m) => `Evolució de ${i.toLowerCase()} a ${m}`, s_vs: (i, a, b) => `${i} a ${a} vs ${b}`,
    },
    es: {
      exemples: ["¿Cuántos asalariados hay en Agullana?", "¿Qué municipio tiene más paro?", "Alquiler en Olot vs Figueres", "Paro y alquiler en Salt", "Pueblos con el alquiler por debajo de 600 €", "¿Cómo ha cambiado la población de Salt?", "¿Quién ganó las elecciones en Girona?", "Sección más rica de Girona", "Desahucios en Figueres", "Datos de vivienda de Lloret"],
      prov: "Provincia de Girona", cat: "Cataluña", esp: "España", gi: "Provincia",
      posicio: (p, n) => `Puesto <b>${p}</b> de ${n} municipios con dato, de más a menos.`,
      posicio_z: (p, n, z) => `Puesto <b>${p}</b> de ${n} ${z}, de más a menos.`,
      font: "Fuente", mapa: "Ver en el mapa", fitxa: (n) => `Ficha de ${n}`, mapa_sec: "Ver las secciones en el mapa",
      semblants: "Quizá querías decir", altres: "Otros datos que pueden interesarte", si_que: (m) => `Datos parecidos que sí hay para ${m}`,
      sense_dada: (ind, mun) => `No hay dato de <b>${ind}</b> para ${mun}: la fuente no lo publica para este municipio.`,
      no_entenc: "No he sabido responder a esta pregunta con los datos de la web.",
      no_entenc_2: "Funciona mejor con un municipio y un dato concreto. Prueba, por ejemplo:",
      nomes_mun: (m) => `Resumen de <b>${m}</b>. Toca una cifra para verla en detalle o pregunta por un dato concreto.`,
      no_tinc: (w) => `No tengo datos de «${w}». Te enseño el dato más cercano que he encontrado.`,
      no_tinc_mun: (m, w) => `He reconocido <b>${m}</b>, pero no tengo datos de «${w}» por municipio. Este es su resumen:`,
      fora: (n) => `${n} no es de la provincia de Girona. Esta web solo cubre sus 221 municipios.`,
      nucli: (n, m) => `${n} forma parte del municipio de <b>${m}</b>: los datos son de todo el municipio.`,
      parcial: (w, m) => `He entendido «${w}» como ${m}, el más poblado. ¿Querías decir otro?`,
      rank_sobre: (asc) => `Ranking · de ${asc ? "menos a más" : "más a menos"}`,
      rank_frase: (m, v, asc) => `El valor más ${asc ? "bajo" : "alto"} es el de <b>${m}</b>: <b>${v}</b>.`,
      rank_filtre: (f) => `Solo ${f}.`,
      rank_nota: "Los municipios pequeños pueden tener valores extremos. Puedes afinarlo: «de más de 5.000 habitantes».",
      mes_de: (n) => `municipios de más de ${n} habitantes`, menys_de: (n) => `municipios de menos de ${n} habitantes`, a_comarca: (c) => `municipios de la comarca ${c}`,
      cap_rank: "Ningún municipio cumple estas condiciones.",
      comp_tit: "Comparación", evol_tit: "Evolución", pos_curt: (p, n) => `puesto ${p} de ${n}`, sense_curt: "sin dato",
      evol_frase: (a, va, b, vb, d) => `De ${a} a ${b} ha pasado de <b>${va}</b> a <b>${vb}</b>${d ? ` (${d})` : ""}.`,
      sense_serie: "Este indicador no tiene serie histórica en la web; este es el último dato.",
      any_no: (a) => `No hay dato de ${a} para este indicador; este es el más reciente.`,
      ultim: (p, v) => `Último dato${p ? ` (${p})` : ""}: ${v}.`, padro: "INE, padrón municipal",
      sense_prov: "Este indicador no tiene un valor para el conjunto de la provincia.",
      dalt: "Valores más altos", baix: "Valores más bajos",
      alcalde: (m, n, p) => `El alcalde o alcaldesa de ${m} es <b>${n}</b>${p ? ` (${p})` : ""}.`,
      sense_alcalde: (m) => `No tengo el nombre del alcalde de ${m}.`,
      comarca: (m, c) => `${m} está en la comarca <b>${c}</b>.`,
      afil_nota: (r, p) => `Son ${r} por cada 100 residentes de 15 a 64 años. Los autónomos son el ${p} de los afiliados.`,
      asal_nota: "Asalariados: afiliaciones totales menos las de autónomos (régimen general), según el municipio de residencia.",
      habitants: "habitantes",
      vs: (qui, d, ref, rv) => `${qui} está ${d} ${ref} (${rv}).`,
      per_sobre: (x) => `un ${x} por encima de`, per_sota: (x) => `un ${x} por debajo de`, punts_sobre: (x) => `${x} puntos por encima de`, punts_sota: (x) => `${x} puntos por debajo de`, igual: "igual que",
      la_prov: "la provincia", cat_ref: "Cataluña", esp_ref: "España",
      mes_que: (a, d, b) => `${a}: ${d} que ${b}.`,
      multi_tit: (m) => `${m}: varios datos`, multi_comp: "Varios datos y municipios",
      cond_tit: "Municipios que cumplen las condiciones", cond_frase: (n, c) => `<b>${n}</b> ${n === 1 ? "municipio" : "municipios"} ${c}.`, cond_i: " y ",
      cond_mes: (i, v) => `con ${i} por encima de ${v}`, cond_menys: (i, v) => `con ${i} por debajo de ${v}`, cond_cap: "Ningún municipio cumple las condiciones.",
      area_tit: { abs: "Área básica de salud", abp: "Área básica policial", pj: "Partido judicial", aar: "Área de Agents Rurals" },
      area_nota: (t, n) => `Dato del ${t.toLowerCase()} <b>${n}</b>, al que pertenece el municipio: la fuente no lo publica por municipios.`,
      area_nota_pj: (n) => `Dato del partido judicial de <b>${n}</b>, al que pertenece el municipio: la fuente no lo publica por municipios.`,
      arees: { abs: "áreas de salud", abp: "áreas policiales", pj: "partidos judiciales", aar: "áreas" },
      tema_tit: (tm, m) => `${tm} en ${m}`, tema_prov: (tm) => `${tm} en la provincia`, tema_frase: (n) => `${n} indicadores de este tema. Toca uno para verlo en detalle.`,
      font_tit: "De dónde sale este dato", font_frase: (i) => `El dato «${i}» sale de:`, font_per: (p) => `Periodo: ${p}.`, font_totes: "Todas las fuentes de la web",
      perque: "No puedo explicar las causas: solo enseño los datos publicados. Estos son los que tienen relación:",
      sec_tit: (m) => `Secciones censales de ${m}`, sec_prov: "Secciones censales de la provincia", sec_frase: (s, v, asc) => `La sección con el valor más ${asc ? "bajo" : "alto"} es la <b>${s}</b>: <b>${v}</b>.`,
      sec_nom: (d, s) => `distrito ${d}, sección ${s}`, sec_no: (i) => `«${i}» no se publica por secciones censales.`, sec_n: (n) => `${n} secciones con dato.`,
      el_tit: (n) => n, el_guanya: (m, c, p) => `En ${m} ganó <b>${c}</b>, con el ${p} de los votos válidos.`,
      el_part: (v) => `Participación: <b>${v}</b>.`, el_bloc: (b, m, v) => `${b} sacó el <b>${v}</b> de los votos válidos en ${m}.`,
      el_bloc_prov: (b, v) => `${b}: <b>${v}</b> en la provincia.`, el_rank: (b) => `Dónde se vota más a ${b}`, el_guany_rank: (b) => `Dónde ganó ${b}`,
      el_guany_n: (b, n, t) => `${b} fue la candidatura más votada en <b>${n}</b> de los ${t} municipios.`, el_cap: "No he encontrado esa elección.",
      el_font: "Resultados oficiales (Ministerio del Interior y Generalitat). Porcentajes sobre los votos válidos (candidaturas y en blanco).",
      el_prov: "Provincia", el_cand: "Candidatura", el_vots: "Votos", el_carregant: "Cargando los resultados…",
      entenc: "Entiendo", suggeriments: "Sugerencias", t_valor: "valor", t_rank: "ranking", t_comp: "comparación", t_evol: "evolución",
      s_atur: (m) => `Paro en ${m}`, s_lloguer: (m) => `Alquiler en ${m}`, s_renda: (m) => `Renta de ${m}`, s_pob: (m) => `Cómo ha cambiado la población de ${m}`, s_alc: (m) => `Quién es el alcalde de ${m}`,
      s_eleccions: (m) => `Quién ganó las elecciones en ${m}`, s_habitatge: (m) => `Datos de vivienda de ${m}`,
      s_mes: (i) => `Municipios con más ${i.toLowerCase()}`, s_menys: (i) => `Municipios con menos ${i.toLowerCase()}`, s_a: (i, m) => `${i} en ${m}`, s_evol: (i, m) => `Evolución de ${i.toLowerCase()} en ${m}`, s_vs: (i, a, b) => `${i} en ${a} vs ${b}`,
    },
  };
  const tx = (k, ...a) => { const v = X[LANG][k]; return typeof v === "function" ? v(...a) : v; };
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  // ---------------------------------------------------------------- Normalització
  const norm = (s) => String(s).toLowerCase().replace(/l·l|l\.l/g, "ll").normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/(\d)[.\s](?=\d{3}\b)/g, "$1").replace(/(\d),(\d)/g, "$1.$2").replace(/[^a-z0-9.]+/g, " ").replace(/\.(?!\d)|(?<!\d)\./g, " ").replace(/\s+/g, " ").trim();
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
  // Clau fonètica per a noms de lloc: sense articles ni espais, i amb les grafies catalanes i castellanes igualades
  const ART = new Set(["el", "la", "l", "els", "les", "los", "las", "s", "sa", "es"]);
  const ABREV = { st: "sant", sta: "santa", san: "sant", sto: "sant", santo: "sant", d: "de", del: "de", dels: "de", de: "de", las: "les", los: "els", y: "i" };
  function clau(tks) {
    const t = tks.map((w) => ABREV[w] || w);
    while (t.length > 1 && ART.has(t[0])) t.shift();
    let s = t.filter((w, k) => !(w === "de" && k > 0)).join("");
    s = s.replace(/tx/g, "ch").replace(/ix/g, "x").replace(/x/g, "ch").replace(/ny/g, "n").replace(/ll/g, "l").replace(/ig$/g, "ch").replace(/h/g, "")
      .replace(/qu(?=[ei])/g, "k").replace(/c(?=[ei])/g, "s").replace(/z/g, "s").replace(/c/g, "k").replace(/q/g, "k").replace(/v/g, "b").replace(/j/g, "y").replace(/g(?=[ei])/g, "y").replace(/gu(?=[ei])/g, "g")
      .replace(/w/g, "u").replace(/ss/g, "s").replace(/(.)\1+/g, "$1");
    return s;
  }

  const STOP = new Set(("de del dels la las el els los lo les l d s en a al als y i o u e que q quin quina quins quines cual cuales es son esta estan " +
    "hay hi ha han he te tiene tienen tenen tenir tener per por para pel pels con amb un una uns unes como com cuanto cuanta cuantos cuantas quant quanta quants quantes " +
    "mi me se su sus seu seva seus seves ho sobre entre vs versus contra respecto respecte frente davant segun segons dime digues dame dona quiero vull saber sabe " +
    "datos dato dades dada informacion info cifra cifras xifra xifres numero nombre total actual actualment actualmente ara ahora hoy avui ultimo ultima darrer darrera " +
    "municipio municipios municipi municipis pueblo pueblos poble pobles ciudad ciudades ciutat ciutats localidad localidades lugar lloc llocs sitio zona zonas " +
    "donde on onde vive viven viu viuen hace fa fan hacen sigui sea ser esser estar dins dentro aqui alla tot todo todos tots totes toda todas " +
    "mas mes menos menys mayor major menor maximo maxim minimo minim alto alta altos altas alt alts bajo baja bajos bajas baix baixa baixos baixes top ranking ranquing rankings lista llista " +
    "clasificacion classificacio primero primeros primer primers primera primeras ordenados ordenats evolucion evolucio cambiado canviat ido anat historico historic serie historia " +
    "tendencia desde des fins hasta ano anos any anys provincia provincial catalunya cataluna espana espanya compara comparar comparacion comparacio comparativa " +
    "media mitjana promedio mitja resto resta demas altres otros respecte frente ultims ultimos darrers fue va era hi havia habia hubo tenia").split(" "));
  const LLOC = new Set("municipio municipios municipi municipis pueblo pueblos poble pobles ciudad ciudades ciutat ciutats localidad localidades donde on lugar lloc llocs sitio".split(" "));
  const XERRA = new Set(("puedes podrias pots podries sabes saps conocer coneixer mostrar muestra muestrame ensenya ensenyam ver veure decir dir quisiera gustaria agradaria favor porfa hola gracias gracies mucho mucha molt molta poco poca poc tanto existe existen registrado registrat cada " +
    "tiene tienen hay paga pagan pagar cuesta costa valor valores valors nivel nivell indice index porcentaje percentatge tasa taxa medio precio preu cantidad quantitat mismo mateix anterior actuales ahi alli pasado passat passada pasada reciente recent " +
    "hablame parla parlame explicame explica cuentame explica dime digues sobre acerca quisiera necesito necessito busco cerco situacion situacio esta estat va van anar ir vienen venen gente gent personas persones cosa coses tal").split(" "));
  const SEP = new Set(["y", "i", "e", "and", "ademas", "tambe", "tambien", "mas", "plus"]);

  // ---------------------------------------------------------------- Fonts (com scripts/referencia/genera.py)
  const F = {
    incasol: "Incasòl / Agència de l'Habitatge de Catalunya, fiances de lloguer", mitma: "Ministerio de Transportes y Movilidad Sostenible, compraventas de viviendas (notarios)",
    atlas: "INE, Atlas de distribución de renta de los hogares", registre: "Registre de Turisme de Catalunya", catastro: "Dirección General del Catastro, INSPIRE",
    xifra: "Xifra, Diputació de Girona", emex: "Idescat, El municipi en xifres (EMEX)", generalitat: "Dades obertes de la Generalitat de Catalunya", habitatge: "Secretaria d'Habitatge, Generalitat de Catalunya",
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

  // Adjectius que ja diuen l'indicador i l'ordre: «el més car», «el pueblo más pequeño»
  const ADJ = [
    ["caro cara caros caras car cars cares costoso costos encarecido", "lloguer", "desc"], ["barato barata baratos baratas barat barats barates economico economic asequible assequible", "lloguer", "asc"],
    ["rico rica ricos ricas ric rics riques adinerado", "renda", "desc"], ["pobre pobres humilde humildes", "renda", "asc"],
    ["poblado poblados pobladas poblats poblades poblat poblada habitado habitados grande grandes gran grans", "pob", "desc"], ["pequeno pequena pequenos pequenas petit petita petits petites", "pob", "asc"],
    ["envejecido envejecidos envellit envellits viejo vieja viejos viejas vell vella vells velles envejecida envejecidas antiguo", "edat", "desc"], ["joven jovenes jove joves rejuvenecido", "edat", "asc"],
    ["seguro segura segur segura tranquilo tranquil", "int_total", "asc"], ["peligroso peligrosa perillos perillosa inseguro insegur conflictivo", "int_total", "desc"],
    ["turistico turistica turistic turistica", "tur_mov_rec_h", "desc"], ["multicultural diverso divers", "estrangers", "desc"],
  ].map(([w, id, dir]) => ({ w: new Set(w.split(" ")), id, dir }));
  const PRI = ["q_asal", "q_afil", "pob", "renda", "lloguer", "cj_atur", "cj_atur_n", "compra", "hut", "edat", "estrangers", "int_total", "cj_afil", "atur", "ocupats", "renda_llar", "esforc"];
  const RISC = new Set(["das", "pau", "quart", "pera", "colera", "torrent", "verges", "salt", "ger", "pals", "alp", "sils", "cabanes", "ordis", "osor", "llers", "mieres", "jafre", "foixa", "saus", "serinya", "escala", "breda", "amer", "pont de molins", "flaca", "urus", "ulla", "bolvir", "toses", "cistella", "juia", "quart", "sant mori", "garrigas", "porqueres", "beuda", "palau", "vilaur", "crespia", "regencos"]);
  const PREP = new Set(["de", "d", "en", "a", "al", "del", "entre", "y", "i", "vs", "o", "per", "por", "con", "amb", "sobre", "que", "desde", "hasta", "fins"]);

  // Partits (blocs dels resultats electorals)
  const BLOCS = {
    Junts: "junts, junts per catalunya, jxcat, ciu, convergencia, convergencia i unio, cdc, pdecat, puigdemont, convergents", ERC: "erc, esquerra, esquerra republicana, republicanos, republicans",
    PSC: "psc, psoe, socialistas, socialistes, socialista", PP: "pp, partido popular, partit popular, populares, populars", Vox: "vox", CUP: "cup, candidatura d unitat popular",
    Comuns: "comuns, comunes, en comu, en comu podem, podemos, podem, icv, sumar, catalunya en comu, iniciativa", Cs: "ciudadanos, ciutadans, cs", "Aliança": "alianca, alianca catalana, orriols",
    "JxSí": "junts pel si, jxsi", Locals: "listas locales, llistes locals, independientes, independents, candidaturas locales", UCD: "ucd",
  };
  const EL_TIPUS = { A: "parlament parlamento autonomicas autonomiques catalanas catalanes parlament de catalunya", G: "generales generals congreso congres cortes corts", M: "municipales municipals locales locals ayuntamiento ajuntament alcaldia", E: "europeas europees europeo europeu", R: "republica republicanas 1933 1936" };
  const EL_PARAULES = new Set("elecciones eleccions eleccion eleccio votos vots voto vot votado votat votaron votar gano guanya guanyar guanyo ganador guanyador ganaron candidatura candidatures partido partit participacion participacio abstencion abstencio electoral electorales electorals comicios urnas".split(" "));

  // ---------------------------------------------------------------- Índexs
  let LISTO = false, ENT = [], INDS = [], IDF = {}, NIND = 0, VOCAB = new Set(), BYID = {}, TEMES_I = [], BLOC_TK = [];
  const cjIdx = (a) => (D.cj && D.cj.idx.m[a] != null ? D.cj.idx.m[a] : null);
  const cjv = (k, ine, a) => { const c = D.cj && D.cj.mun[ine], s = c && c[k], i = cjIdx(a); return s && i != null ? s[i] : null; };
  const cjp = (k, z, a) => { const s = D.cj && D.cj.prov[k] && D.cj.prov[k][z], i = cjIdx(a); return s && i != null ? s[i] : null; };
  const N0 = (v) => fmt(v);

  function virtuals(IND) {
    const afilI = IND.find((i) => i.id === "cj_afil");
    if (!afilI || !D.cj || !D.cj.mun) return [];
    const last = () => { const l = window.indMapa.anysDe(afilI); return l[l.length - 1]; };
    const mk = (id, ca, es, fn, mapa) => ({
      id, per: "m", cob: 0.5, tema: "tre", ca, es, nota: afilI.nota, mapa, virtual: true, f: N0,
      t: (m, a) => fn((k) => cjv(k, m.ine, a)), get v() { return (m) => this.t(m, last()); },
      pv: (a) => fn((k) => cjp(k, "gi", a)), ref: () => { const a = last(); return { cat: fn((k) => cjp(k, "cat", a)) }; },
    });
    return [
      mk("q_asal", ["Assalariats", "Afiliats assalariats a la Seguretat Social (règim general), per residència"], ["Asalariados", "Afiliados asalariados a la Seguridad Social (régimen general), por residencia"],
        (g) => { const f = g("afil"), r = g("reta"); return f != null && r != null ? f - r : null; }, "cj_afil"),
      mk("q_afil", ["Afiliats a la Seguretat Social", "Afiliats a la Seguretat Social, per residència (persones)"], ["Afiliados a la Seguridad Social", "Afiliados a la Seguridad Social, por residencia (personas)"], (g) => g("afil"), "cj_afil"),
      mk("q_reta", ["Autònoms (persones)", "Afiliats autònoms a la Seguretat Social, per residència (persones)"], ["Autónomos (personas)", "Afiliados autónomos a la Seguridad Social, por residencia (personas)"], (g) => g("reta"), "cj_reta"),
    ];
  }
  const zonaDe = (i) => (i.v ? null : i.abs ? "abs" : i.abp ? "abp" : i.pj ? "pj" : i.aar ? "aar" : null);

  function prepara() {
    if (LISTO) return true;
    if (typeof D === "undefined" || !D || !D.municipios || !window.indMapa || !window.mapaApi) return false;
    const { IND } = window.indMapa;
    // Entitats: municipis (amb variants), nuclis, comarques, província, llocs de fora
    const ent = [];
    const add = (frase, e) => { const tk = toks(frase); if (tk.length) ent.push({ tk, k: clau(tk), ...e }); };
    const perNom = {};
    D.municipios.forEach((m) => { perNom[m.nom] = m; });
    D.municipios.forEach((m) => {
      const mm = /^(.*), (el|la|l'|els|les|s')$/.exec(m.nom);
      const base = mm ? mm[1] : m.nom;
      add(base, { tipus: "mun", m });
      if (mm) add(`${mm[2]} ${base}`, { tipus: "mun", m });
      const parts = base.split(/, | i /);
      if (parts.length > 1) parts.forEach((p, k) => { if (k === 0 || !/^Sant[a]? /.test(p)) add(p, { tipus: "mun", m }); });
      (DIC.ALIES[m.nom] || "").split("|").filter(Boolean).forEach((a) => add(a, { tipus: "mun", m }));
    });
    Object.entries(DIC.NUCLIS || {}).forEach(([n, mun]) => { if (mun && perNom[mun]) add(n, { tipus: "mun", m: perNom[mun], nucli: n }); else if (!mun) add(n, { tipus: "fora", nom: n.replace(/\b\w/g, (c) => c.toUpperCase()) }); });
    const coms = [...new Set(D.municipios.map((m) => m.comarca))];
    coms.forEach((c) => { add(c, { tipus: "com", c }); (DIC.COM_ALIES[c] || "").split("|").filter(Boolean).forEach((a) => add(a, { tipus: "com", c })); });
    ["provincia de girona", "provincia de gerona", "la provincia", "provincia", "comarques gironines", "comarcas gerundenses", "toda la provincia", "tota la provincia", "conjunto de la provincia"].forEach((p) => add(p, { tipus: "prov" }));
    (DIC.FORA || []).forEach((f) => add(f, { tipus: "fora", nom: f }));
    ENT = ent;

    // Indicadors: municipals numèrics, per àrea (salut, policia, jutjats), virtuals i especials
    const base = IND.filter((i) => !i.cat && !i.el && (i.v || zonaDe(i)) && window.mapaApi.ok(i));
    const especials = [
      { id: "alcalde", especial: true, ca: ["Alcalde", "Alcalde o alcaldessa"], es: ["Alcalde", "Alcalde o alcaldesa"] },
      { id: "comarca", especial: true, ca: ["Comarca", "Comarca"], es: ["Comarca", "Comarca"] },
    ];
    INDS = [...virtuals(IND), ...base, ...especials].map((i) => {
      const sh = new Set(), lg = new Set();
      ["ca", "es"].forEach((l) => {
        toks(i[l][0]).filter((w) => !STOP.has(w)).forEach((w) => { sh.add(stem(w)); VOCAB.add(w); });
        toks(i[l][1]).filter((w) => !STOP.has(w)).forEach((w) => { lg.add(stem(w)); VOCAB.add(w); });
      });
      const fr = (DIC.SIN[i.id] || "").split(",").map((f) => toks(f).map(stem)).filter((f) => f.length);
      toks(DIC.SIN[i.id] || "").forEach((w) => VOCAB.add(w));
      return { i, sh, lg, synTk: fr.filter((f) => f.length === 1).map((f) => f[0]), synFr: fr.filter((f) => f.length > 1), pri: PRI.indexOf(i.id) };
    });
    NIND = INDS.length;
    IDF = {};
    INDS.forEach((x) => new Set([...x.sh, ...x.lg, ...x.synTk]).forEach((s) => { IDF[s] = (IDF[s] || 0) + 1; }));
    Object.keys(IDF).forEach((s) => { IDF[s] = Math.log(1 + NIND / IDF[s]); });
    BYID = {}; INDS.forEach((x) => { BYID[x.i.id] = x; });
    // Temes i partits
    TEMES_I = Object.entries(DIC.TEMES || {}).map(([id, s]) => ({ id, fr: s.split(",").map((f) => toks(f)).filter((f) => f.length) }));
    TEMES_I.forEach((t) => t.fr.forEach((f) => f.forEach((w) => VOCAB.add(w))));
    BLOC_TK = Object.entries(BLOCS).map(([b, s]) => ({ b, fr: s.split(",").map((f) => toks(f)).filter((f) => f.length) }));
    BLOC_TK.forEach((t) => t.fr.forEach((f) => f.forEach((w) => VOCAB.add(w))));
    EL_PARAULES.forEach((w) => VOCAB.add(w));
    Object.values(EL_TIPUS).forEach((s) => s.split(" ").forEach((w) => VOCAB.add(w)));
    // Parts distintives dels noms compostos: «Feliu», «Guíxols», «Bisbal», «Caldes»… Si són de més d'un municipi, guanya el més poblat
    const GEN = new Set("sant santa sants san de del dels d l la les el els i s sa vall castell mas mont pont port torre mar selva riu serra pla bosc vila valle".split(" "));
    const comW = new Set(D.municipios.flatMap((m) => toks(m.comarca)));
    const jaK = new Set(ENT.map((e) => e.k));
    const parc = {};
    D.municipios.forEach((m) => {
      const tk = toks(m.nom.replace(/, (el|la|l'|els|les|s')$/, ""));
      for (let a = 0; a < tk.length; a++) for (let b = a; b < Math.min(tk.length, a + 3); b++) {
        if (a === 0 && b === tk.length - 1) continue;
        const sub = tk.slice(a, b + 1);
        if (GEN.has(sub[0]) || GEN.has(sub[sub.length - 1])) continue;
        if (sub.length === 1 && (sub[0].length < 4 || VOCAB.has(sub[0]) || STOP.has(sub[0]) || XERRA.has(sub[0]) || comW.has(sub[0]))) continue;
        const k = clau(sub);
        if (k.length < 4 || jaK.has(k)) continue;
        (parc[k] = parc[k] || { tk: sub, ms: new Set() }).ms.add(m);
      }
    });
    Object.entries(parc).forEach(([k, p]) => {
      const ms = [...p.ms].sort((x, y) => (y.poblacion || 0) - (x.poblacion || 0));
      ENT.push({ tk: p.tk, k, tipus: "mun", m: ms[0], parcial: true, altres: ms.slice(1) });
    });
    LISTO = true;
    return true;
  }

  const eqTok = (q, k) => q === k || (q.length >= 5 && k.length >= 5 && (q.startsWith(k) || k.startsWith(q)) && Math.abs(q.length - k.length) <= 3) || (q.length >= 6 && k.length >= 6 && lev(q, k, 1) <= 1);

  // ---------------------------------------------------------------- Llocs a la pregunta
  function entitats(raw, tk) {
    const rawTk = String(raw).replace(/l·l/g, "ll").split(/[^\p{L}\p{N}]+/u).filter(Boolean);
    const cands = [];
    const maxN = 7;
    for (let s = 0; s < tk.length; s++) {
      for (let n = 1; n <= maxN && s + n <= tk.length; n++) {
        const fin = tk.slice(s, s + n);
        if (STOP.has(fin[0]) && !ART.has(fin[0]) && !ABREV[fin[0]]) continue;
        if (n > 1 && (STOP.has(fin[n - 1]) && !ART.has(fin[n - 1]))) continue;
        const k = clau(fin);
        if (k.length < 3) continue;
        const sencer = fin.join(" ");
        ENT.forEach((e) => {
          let sc = 0;
          if (e.k === k) sc = k.length * 2 + 1;
          else if (k.length >= 5 && e.k.length >= 5 && k[0] === e.k[0]) {
            // Aproximat: només si la finestra no és vocabulari de les dades
            if (n === 1 && (VOCAB.has(fin[0]) || STOP.has(fin[0]) || XERRA.has(fin[0]))) return;
            const max = e.k.length >= 9 ? 2 : 1;
            const d = lev(k, e.k, max);
            if (d > max) return;
            sc = k.length * 2 - 4 * d;
          } else return;
          // Noms que també són paraules corrents: amb majúscula o després de «de», «en», «a»…
          if (e.tipus === "mun" && (RISC.has(sencer) || (e.parcial && n === 1 && tk.length > 2))) {
            const r = rawTk[s] || "";
            const majus = r && r[0] === r[0].toUpperCase() && r[0] !== r[0].toLowerCase();
            if (!majus && !(s > 0 && PREP.has(tk[s - 1]))) return;
          }
          cands.push({ e, s, n, sc });
        });
      }
    }
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

  // ---------------------------------------------------------------- Indicadors
  function puntua(qs, qall, nomesId) {
    const llista = nomesId ? INDS.filter((x) => nomesId.has(x.i.id)) : INDS;
    return llista.map((x) => {
      let sc = 0;
      const vist = new Set();
      qs.forEach(({ s }) => {
        if (vist.has(s)) return; vist.add(s);
        let best = 0;
        x.synTk.forEach((k) => { if (s === k) best = Math.max(best, 4 * (IDF[k] || 1)); else if (eqTok(s, k)) best = Math.max(best, 2.5 * (IDF[k] || 1)); });
        x.sh.forEach((k) => { if (s === k) best = Math.max(best, 2.2 * (IDF[k] || 1)); else if (eqTok(s, k)) best = Math.max(best, 1.8 * (IDF[k] || 1)); });
        if (!best) x.lg.forEach((k) => { if (eqTok(s, k)) best = Math.max(best, 1 * (IDF[k] || 1)); });
        sc += best;
      });
      x.synFr.forEach((f) => {
        for (let k = 0; k + f.length <= qall.length; k++) {
          if (f.every((w, j) => eqTok(qall[k + j], w))) { sc += 2 + f.reduce((t, w) => t + (STOP.has(w) ? 0 : 4 * (IDF[w] || 1)), 0); return; }
        }
      });
      return { x, sc: sc + (x.pri >= 0 ? (PRI.length - x.pri) * 0.01 : 0) };
    }).filter((o) => o.sc >= 1).sort((a, b) => b.sc - a.sc);
  }
  const fraseA = (tk, f) => { for (let k = 0; k + f.length <= tk.length; k++) if (f.every((w, j) => tk[k + j] === w)) return k; return -1; };

  // ---------------------------------------------------------------- Anàlisi de la pregunta
  function analitza(raw, forcat) {
    const tk = toks(String(raw).replace(/,/g, " y "));
    const { res, usat } = entitats(raw, tk);
    const txt = " " + tk.join(" ") + " ";
    const has = (...w) => w.some((x) => tk.includes(x));
    const hasF = (re) => re.test(txt);
    const muns = [], coms = [], fora = [], nuclis = [], parcials = [];
    let prov = false;
    res.forEach((c) => {
      if (c.e.tipus === "mun") { if (!muns.includes(c.e.m)) muns.push(c.e.m); if (c.e.nucli) nuclis.push([c.e.nucli, c.e.m]); if (c.e.parcial && c.e.altres.length) parcials.push({ s: c.s, n: c.n, m: c.e.m, altres: c.e.altres }); }
      else if (c.e.tipus === "com") { if (!coms.includes(c.e.c)) coms.push(c.e.c); }
      else if (c.e.tipus === "prov") prov = true;
      else if (c.e.tipus === "fora") fora.push(c.e.nom);
    });
    // Filtres de població
    let minPob = null, maxPob = null, txt2 = txt;
    const mp = /(?:mas|mes|por encima|per sobre) de (\d+) (?:habitantes|habitants|hab|vecinos|veins|personas|persones)/.exec(txt);
    const np = /(?:menos|menys|por debajo|per sota) de (\d+) (?:habitantes|habitants|hab|vecinos|veins|personas|persones)/.exec(txt);
    const marca = (m) => { const a = txt.slice(0, m.index).split(" ").filter(Boolean).length, n = m[0].trim().split(" ").length; for (let j = a; j < a + n && j < tk.length; j++) usat[j] = true; };
    if (mp) { minPob = +mp[1]; txt2 = txt2.replace(mp[0], " "); marca(mp); }
    if (np) { maxPob = +np[1]; txt2 = txt2.replace(np[0], " "); marca(np); }
    // Condicions numèriques sobre un indicador: «por debajo de 600 €», «más del 30 %»
    const conds = [];
    const reCond = /(mas|mes|menos|menys|por encima|per sobre|por debajo|per sota|superior|inferior|mayor|major|menor|supera|superen|superan|no arriba|no llega|minimo|minim|maximo|maxim)( de| del| a| al| que)? (\d+(?:\.\d+)?)( por ciento| per cent| euros| eur| €| %)?/g;
    let mc;
    while ((mc = reCond.exec(txt2))) {
      const n = +mc[3];
      if (!mc[4] && /^(19|20)\d\d$/.test(mc[3])) continue;
      const amunt = /mas|mes|encima|sobre|superior|mayor|major|supera|superen|superan|minimo|minim/.test(mc[1]);
      conds.push({ amunt, n, pos: mc.index, txt: mc[0] });
    }
    const txt3 = conds.reduce((s, c) => s.replace(c.txt, " "), txt2);
    const tk2 = txt3.trim().split(" ").filter(Boolean);
    const s2 = new Set(tk2);
    const has2 = (...w) => w.some((x) => s2.has(x));
    // Ordre
    let dir = null;
    if (has2("menos", "menys", "menor", "minimo", "minim", "minima", "pitjor", "peor") || /\b(mas|mes) (bajo|baja|bajos|bajas|baix|baixa|baixos|baixes)\b/.test(txt3)) dir = "asc";
    else if (has2("mas", "mayor", "major", "maximo", "maxim", "maxima", "top", "ranking", "ranquing", "lider", "encabeza", "primeros", "primers", "millor", "mejor", "record") ||
      (s2.has("mes") && !/\b(el|este|aquest|cada|al|per|por|ultimo|ultim|darrer|del|un|aquell|aquel|pasado|passat) mes\b/.test(txt3))) dir = "desc";
    let adjInd = null;
    tk2.forEach((w) => ADJ.forEach((a) => { if (a.w.has(w)) adjInd = a; }));
    if (adjInd) dir = adjInd.dir;
    const ranqParaula = has2("ranking", "ranquing", "lista", "llista", "clasificacion", "classificacio", "top") || tk2.some((w) => LLOC.has(w));
    let nTop = 10;
    const mn = /\b(?:top|los|les|els|primeros|primers|primeres|primeras|ultimos|ultims)\s+(\d{1,2})\b|\b(\d{1,2})\s+(?:municipios|municipis|pueblos|pobles|ciudades|ciutats|primeros|primers|secciones|seccions)\b/.exec(txt3);
    if (mn) nTop = Math.max(1, Math.min(50, +(mn[1] || mn[2])));
    const ya = /\b(19[0-9]\d|20[0-4]\d)\b/.exec(txt3);
    const any = ya ? ya[1] : null;
    const evol = hasF(/ (evolucion|evolucio|evoluciona|evolucionado|evolucionat|cambiado|canviat|cambiat|subido|pujat|crecido|crescut|bajado|baixat|caido|caigut|historico|historic|historica|historia|serie|tendencia|variado|variat|trayectoria|trajectoria) /) ||
      hasF(/ (ha ido|ha anat|a lo largo|al llarg|ultimos anos|ultims anys|en los ultimos|als darrers|els darrers|des de|desde) /) || (has("cuanto", "quant") && hasF(/ (sube|puja|crece|creix|baja|baixa) /));
    const mUlt = /(?:ultimos|ultims|darrers) (\d{1,2}) (?:anos|anys)/.exec(txt);
    const ultAnys = mUlt ? +mUlt[1] : null;
    const compte = has("cuantos", "cuantas", "quants", "quantes", "numero", "nombre") || hasF(/ (cuanta gente|quanta gent) /);
    const font = hasF(/ (fuente|fuentes|font|fonts|origen|procedencia|procedencia) /) || hasF(/ (de donde sale|de donde salen|d on surt|d on surten|quien publica|qui publica|de donde viene|d on ve) /);
    const perque = hasF(/ (por que|per que|perque|porque|motivo|motiu|causa|causas|raon|rao|explicacion) /) && !hasF(/ (porque|perque) (es|son|hay|hi ha) /);
    const seccio = hasF(/ (seccion|secciones|seccio|seccions|barrio|barrios|barri|barris|censal|censales|censals) /);
    const resum = hasF(/ (hablame|parlame|parla m|resumen|resum|ficha|fitxa|todo sobre|tot sobre|que sabes|que saps|informacion de|informacio de|datos de|dades de|como es|com es) /);
    // Eleccions
    const elTipus = Object.entries(EL_TIPUS).find(([, s]) => s.split(" ").some((w) => tk.includes(w)));
    const blocs = [];
    BLOC_TK.forEach((b) => b.fr.forEach((f) => { const k = fraseA(tk, f); if (k >= 0 && !usat[k] && !blocs.includes(b.b)) { blocs.push(b.b); for (let j = 0; j < f.length; j++) usat[k + j] = true; } }));
    const elec = tk.some((w) => EL_PARAULES.has(w)) || (blocs.length > 0 && (has("voto", "vot", "votos", "vots", "votan", "voten", "vota") || !!elTipus)) || (blocs.length > 0 && tk.length <= 6);
    // Paraules per a l'indicador, separades en parts per «y», «i», comes
    const qs = [], segs = [[]];
    tk.forEach((w, k) => {
      if (usat[k]) return;
      if (SEP.has(w) && segs[segs.length - 1].length) { segs.push([]); return; }
      if (!STOP.has(w) && !/^[\d.]+$/.test(w) && !XERRA.has(w)) { qs.push({ w, s: stem(w), k }); segs[segs.length - 1].push({ w, s: stem(w), k }); }
    });
    const qall = tk.filter((w, k) => !usat[k]).map(stem);
    // Tema: paraules de tema sense cap indicador més concret
    let tema = null;
    let temaF = null;
    TEMES_I.forEach((t) => t.fr.forEach((f) => { if (!tema && fraseA(tk, f) >= 0) { tema = t.id; temaF = f; } }));
    // Amb «cuánto ha crecido…», el verb indica evolució, no l'indicador
    const EVW = /^(evoluc|cambi|canvi|pujat|subid|crecid|cresc|bajad|baixat|caid|caigut|variad|variat)/;
    if (evol) { const sv = qs.filter((o) => !EVW.test(o.w)); if (sv.length && sv.length < qs.length) { qs.length = 0; qs.push(...sv); } }
    let cands = puntua(qs, qall);
    if (compte && cands.length) {
      const pref = { cj_atur: "cj_atur_n", atur: "cj_atur_n", cj_afil: "q_afil", ocupats: "q_afil", cj_reta: "q_reta", autonoms: "q_reta", tur_hut_c: "tur_hut_n", hut: "tur_hut_n", sol_h: "sol_n", tur_mov_rec_h: "tur_mov_rec", veh_total_h: "veh_n", veh_tur_h: "veh_n", com_est_h: "com_n", tur_pl_hotel_h: "tur_hotels" };
      const p = pref[cands[0].x.i.id];
      if (p && BYID[p]) cands = [{ x: BYID[p], sc: cands[0].sc + 1 }, ...cands.filter((c) => c.x.i.id !== p)];
    }
    if (adjInd && !forcat && BYID[adjInd.id]) {
      const sense = qs.filter(({ w }) => !adjInd.w.has(w));
      const c2 = puntua(sense, qall.filter((w) => !adjInd.w.has(w)));
      if ((!c2.length || c2[0].sc < 1.2) && !(cands.length && cands[0].x.i.id !== adjInd.id && cands[0].x.synFr.some((f) => f.some((w) => adjInd.w.has(w) || [...adjInd.w].some((a) => eqTok(stem(a), w))) && qall.some((_, k) => k + f.length <= qall.length && f.every((w, j) => eqTok(qall[k + j], w)))))) cands = [{ x: BYID[adjInd.id], sc: 99 }, ...cands.filter((c) => c.x.i.id !== adjInd.id)];
    }
    let ind = null;
    if (forcat && BYID[forcat]) ind = BYID[forcat].i;
    else if (cands.length && cands[0].sc >= 1.2) ind = cands[0].x.i;
    // «población en 2044»: projecció
    if (ind && ind.id === "pob" && any && +any > new Date().getFullYear() && BYID.proj2044) ind = BYID.proj2044.i;
    // Diverses dades: cada part de la pregunta amb el seu indicador
    let inds = ind ? [ind] : [];
    const segsOk = segs.filter((s) => s.length);
    if (!forcat && segsOk.length > 1) {
      const r = segsOk.map((sg) => { const c = puntua(sg, sg.map((o) => o.s)); return c.length && c[0].sc >= 2 ? c[0].x.i : null; });
      const u = [...new Set(r.filter(Boolean))];
      if (u.length > 1) inds = u;
    }
    // Les condicions s'assignen a l'indicador de la part on apareixen
    if (conds.length && inds.length) {
      const posTok = (pos) => txt.slice(0, pos).split(" ").filter(Boolean).length;
      conds.forEach((c) => {
        const p = posTok(c.pos);
        let best = inds[0];
        if (inds.length > 1) {
          let bd = 1e9;
          inds.forEach((i) => { const ws = qs.filter((o) => BYID[i.id] && (BYID[i.id].synTk.some((k) => eqTok(o.s, k)) || [...BYID[i.id].sh].some((k) => eqTok(o.s, k)))); ws.forEach((o) => { const d = Math.abs(o.k - p); if (d < bd) { bd = d; best = i; } }); });
        }
        c.ind = best;
      });
    }
    // Si només hi ha paraules de tema, és una pregunta de tema
    if (tema && !forcat) {
      const temaWs = new Set(TEMES_I.find((t) => t.id === tema).fr.flat());
      const resta = qs.filter((o) => !temaWs.has(o.w));
      const c3 = resta.length ? puntua(resta, qall.filter((w) => !temaWs.has(w))) : [];
      // Si la paraula de tema és també el nom o un sinònim de l'indicador trobat («renta», «población»), mana l'indicador
      const cobreix = ind && !resum && BYID[ind.id] && temaF.every((w) => { const st = stem(w); return BYID[ind.id].synTk.some((k) => eqTok(st, k)) || [...BYID[ind.id].sh].some((k) => eqTok(st, k)); });
      if (!cobreix && !(c3.length && c3[0].sc >= 2) && (resum || !ind || cands[0].sc < 8)) { if (!(c3.length && c3[0].sc >= 2)) inds = []; ind = c3.length && c3[0].sc >= 2 ? ind : null; }
      else tema = null;
    }
    // «el pueblo más rico de Girona»: Girona és la província
    if (muns.length === 1 && muns[0].ine === "17079" && (dir || adjInd) && tk.some((w) => LLOC.has(w)) && !coms.length) { muns.length = 0; prov = true; }
    const alt = cands.filter((c) => !inds.includes(c.x.i)).slice(0, 4).map((c) => c.x.i);
    const dubte = !forcat && cands.length > 1 && ind && inds.length === 1 && cands[1].sc >= cands[0].sc * 0.85;
    const ignora = qs.filter(({ w }) => w.length >= 4 && !VOCAB.has(w) && !ADJ.some((a) => a.w.has(w)) && !/^(evoluc|cambi|canvi|pujat|subid|crecid|cresc|bajad|baixat|caid|caigut|compar|seccio|seccion|debajo|encima|sota|superior|inferior|supera|llega|arriba|habitant|vecin|veins|person|barri|censal|mitjan|medi|promed|respect|frente|davant|tant|tanto|tanta)/.test(w)).map((o) => o.w);
    return { tk, muns, coms, fora, prov, nuclis, parcials, dir, ranqParaula, nTop, any, evol, ultAnys, compte, font, perque, seccio, resum, tema, elec, elTipus: elTipus ? elTipus[0] : null, blocs, ind, inds, conds, alt, dubte, minPob, maxPob, qs, ignora, cands };
  }

  // ---------------------------------------------------------------- Dades d'un indicador
  const anysDe = (i) => window.indMapa.anysDe(i);
  const valorProvincia = (i) => window.indMapa.valorProvincia(i);
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
  const esPct = (i) => /%/.test(i.f(12.3));
  function valFn(i, a) { return a ? (m) => { try { return SER(i).mun(m, a); } catch (e) { return null; } } : (m) => { try { return i.v ? i.v(m) : null; } catch (e) { return null; } }; }
  function valors(i, a) { const f = valFn(i, a); return D.municipios.map((m) => ({ m, v: f(m) })).filter((o) => num(o.v)); }
  function refs(i) {
    let r = {};
    try {
      r = (i.ref && (i.per || i.virtual || i.a === "sol" || i.a === "irpf" || /^hb/.test(i.a || "") || i.a === "veh" || ["cad", "cad_vm2", "cad_ibi"].includes(i.a)) ? i.ref() : (D.ref || {})[i.id]) || (i.ref && !i.v ? i.ref() : {}) || {};
    } catch (e) { r = {}; }
    let gi = null;
    try { gi = i.id === "pob" ? D.provincia && D.provincia.poblacion : valorProvincia(i); } catch (e) { gi = null; }
    return { gi: num(gi) ? gi : null, cat: num(r.cat) ? r.cat : null, esp: num(r.esp) ? r.esp : null };
  }
  function clauAny(i, any) {
    if (!any) return null;
    const l = serie(i).filter((a) => String(a).slice(0, 4) === any);
    return l.length ? l[l.length - 1] : null;
  }

  // ---------------------------------------------------------------- Peces de la resposta
  const nomMun = (m) => { const mm = /^(.*), (el|la|l'|els|les|s')$/.exec(m.nom); return mm ? (mm[2].endsWith("'") ? mm[2] + mm[1] : `${mm[2]} ${mm[1]}`).replace(/^./, (c) => c.toUpperCase()) : m.nom; };
  function botons(i, m, extra) {
    const id = i && (i.mapa || i.id);
    return `<p class="pq-accions">${id && !i.especial ? `<button type="button" class="pq-btn" data-mapa="${esc(id)}"${m ? ` data-ine="${m.ine}"` : ""}>${tx("mapa")} →</button>` : ""}${extra || ""}${m ? `<button type="button" class="pq-btn pq-btn-2" data-fitxa="${m.ine}">${esc(tx("fitxa", nomMun(m)))} →</button>` : ""}</p>`;
  }
  const peuFont = (i, serieUsada) => { const f = serieUsada && i.id === "pob" ? tx("padro") : font(i); return f ? `<p class="pq-font"><span>${tx("font")}</span> ${esc(f)}</p>` : ""; };
  function refsHtml(i, r) {
    const files = [[tx("gi"), r.gi, "gi"], [tx("cat"), r.cat, "cat"], [tx("esp"), r.esp, "esp"]].filter((x) => num(x[1]));
    if (!files.length) return "";
    return `<dl class="pq-refs">${files.map(([n, v, k]) => `<div class="pq-ref pq-ref-${k}"><dt>${esc(n)}</dt><dd>${esc(i.f(v))}</dd></div>`).join("")}</dl>`;
  }
  // Frase de comparació amb la província, Catalunya i Espanya (només si són comparables, no un total)
  function frasesVs(i, v, r, qui) {
    const fr = [];
    const unaFrase = (rv, ref) => {
      if (!num(rv) || !num(v)) return null;
      if (!esPct(i) && (rv > v * 8 || v > rv * 8)) return null;
      let d;
      if (esPct(i)) { const p = v - rv; d = Math.abs(p) < 0.05 ? tx("igual") : p > 0 ? tx("punts_sobre", fmt(Math.abs(p), 1)) : tx("punts_sota", fmt(Math.abs(p), 1)); }
      else { if (rv <= 0 || v < 0) return null; const p = (v / rv - 1) * 100; d = Math.abs(p) < 0.5 ? tx("igual") : p > 0 ? tx("per_sobre", pct(Math.abs(p), 0)) : tx("per_sota", pct(Math.abs(p), 0)); }
      return { d, ref, rv };
    };
    const a = unaFrase(r.gi, tx("la_prov")), b = unaFrase(r.cat, tx("cat_ref"));
    if (a) fr.push(tx("vs", qui, a.d, a.ref, i.f(a.rv)));
    if (b) fr.push(tx("vs", qui, b.d, b.ref, i.f(b.rv)).replace(/^[^ ]+ (està|está)/, (s) => s));
    return fr.length ? `<p class="pq-vs">${fr.join(" ")}</p>` : "";
  }
  function tira(i, vals, m, r) {
    const vs = vals.map((o) => o.v);
    const v0 = Math.min(...vs), v1 = Math.max(...vs), rg = v1 - v0 || Math.abs(v1) || 1;
    r = Object.fromEntries(["gi", "cat", "esp"].map((k) => [k, num(r[k]) && r[k] >= v0 - rg && r[k] <= v1 + rg ? r[k] : null]));
    const ref = [r.gi, r.cat, r.esp].filter(num);
    const mn = Math.min(...vs, ...ref), mx = Math.max(...vs, ...ref);
    if (!(mx > mn)) return "";
    const X_ = (x) => (3 + ((x - mn) / (mx - mn)) * 94).toFixed(1);
    const punts = vals.map((o) => `<i style="left:${X_(o.v)}%"></i>`).join("");
    const marca = (x, cls, tit) => (num(x) ? `<b class="${cls}" style="left:${X_(x)}%" title="${esc(tit)}: ${esc(i.f(x))}"></b>` : "");
    const mv = m ? vals.find((o) => o.m === m || o.id === m) : null;
    const nomM = m && m.nom ? nomMun(m) : mv && mv.nom;
    return `<div class="pq-tira" aria-hidden="true"><div class="pq-tira-punts">${punts}</div>${marca(r.esp, "pq-m-esp", tx("esp"))}${marca(r.cat, "pq-m-cat", tx("cat"))}${marca(r.gi, "pq-m-gi", tx("gi"))}${mv ? marca(mv.v, "pq-m-mun", nomM) : ""}
      <span class="pq-tira-min">${esc(i.f(v0))}</span><span class="pq-tira-max">${esc(i.f(v1))}</span></div>
      <p class="pq-llegenda">${mv ? `<span><i class="pq-m-mun"></i>${esc(nomM)}</span>` : ""}${num(r.gi) ? `<span><i class="pq-m-gi"></i>${tx("gi")}</span>` : ""}${num(r.cat) ? `<span><i class="pq-m-cat"></i>${tx("cat")}</span>` : ""}${num(r.esp) ? `<span><i class="pq-m-esp"></i>${tx("esp")}</span>` : ""}</p>`;
  }
  function chips(list, titol, ine) {
    if (!list.length) return "";
    return `<div class="pq-alt"><p>${titol}</p>${list.map((i) => `<button type="button" class="pq-xip" data-ind="${esc(i.id)}"${ine ? ` data-ine="${ine}"` : ""}>${esc(nomCurt(i))}</button>`).join("")}</div>`;
  }
  const cap = (sobre, titol) => `<p class="pq-sobre">${sobre}</p><h3 class="pq-titol">${esc(titol)}</h3>`;
  function sparkline(punts, i) {
    const w = 640, h = 120, p = 6;
    const vs = punts.map((o) => o.v), mn = Math.min(...vs), mx = Math.max(...vs);
    const X_ = (k) => p + (k / Math.max(1, punts.length - 1)) * (w - 2 * p), Y_ = (v) => (mx > mn ? h - p - ((v - mn) / (mx - mn)) * (h - 2 * p) : h / 2);
    const d = punts.map((o, k) => `${k ? "L" : "M"}${X_(k).toFixed(1)},${Y_(o.v).toFixed(1)}`).join("");
    const u = punts[punts.length - 1];
    return `<figure class="pq-evol"><svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" role="img" aria-label="${esc(nomCurt(i))}"><path d="${d}" fill="none" stroke="currentColor" stroke-width="2.5" vector-effect="non-scaling-stroke"/>
      <circle cx="${X_(punts.length - 1)}" cy="${Y_(u.v)}" r="4" class="pq-evol-u"/></svg>
      <figcaption><span>${esc(etPer(String(punts[0].a)))}</span><span>${esc(i.f(mn))} – ${esc(i.f(mx))}</span><span>${esc(etPer(String(u.a)))}</span></figcaption></figure>`;
  }
  const varTxt = (a, b) => (num(a) && num(b) && a > 0 && b > 0 ? pct((b / a - 1) * 100, 1, true) : "");
  const barra = (v, max) => `<span class="pq-r-barra">${num(v) ? `<b style="width:${((Math.abs(v) / (max || 1)) * 100).toFixed(1)}%"></b>` : ""}</span>`;

  // ---------------------------------------------------------------- Tipus de resposta
  function respMun(q, i, m) {
    if (i.id === "alcalde") {
      const a = m.pol && m.pol.alcalde;
      return cap(esc(nomMun(m)) + " · " + esc(m.comarca), nomCurt(i)) + `<p class="pq-frase">${a ? tx("alcalde", esc(nomMun(m)), esc(a.nom), esc(a.partit)) : tx("sense_alcalde", esc(nomMun(m)))}</p>` + botons(null, m);
    }
    if (i.id === "comarca") return cap(esc(nomMun(m)), nomCurt(i)) + `<p class="pq-frase">${tx("comarca", esc(nomMun(m)), esc(m.comarca))}</p>` + botons(null, m);
    const a = clauAny(i, q.any);
    const avis = q.any && !a ? `<p class="pq-avis">${serie(i).length > 1 ? tx("any_no", q.any) : tx("sense_serie")}</p>` : "";
    const vals = valors(i, a);
    const mv = vals.find((o) => o.m === m);
    const sobre = `${esc(nomMun(m))} · ${esc(m.comarca)}`;
    if (!mv) {
      const r = refs(i);
      const alt = q.alt.filter((x) => !x.especial && num(valFn(x)(m))).slice(0, 4);
      q.altFet = true;
      return cap(sobre, nomCurt(i)) + `<p class="pq-frase">${tx("sense_dada", esc(nomLlarg(i)), esc(nomMun(m)))}</p>` + refsHtml(i, a ? {} : r) + peuFont(i) + botons(i, m) + chips(alt, tx("si_que", nomMun(m)), m.ine);
    }
    const pos = vals.filter((o) => o.v > mv.v).length + 1;
    const r = a ? { gi: SER(i).prov(a) } : refs(i);
    let extra = "";
    if (i.id === "q_asal" || i.id === "q_afil") {
      const aa = a || serie(i).slice(-1)[0];
      const ra = BYID.cj_afil && BYID.cj_afil.i.t(m, aa), rr = BYID.cj_reta && BYID.cj_reta.i.t(m, aa);
      if (num(ra) && num(rr)) extra = `<p class="pq-nota">${tx("afil_nota", fmt(ra, 1), pct(rr, 0))}${i.id === "q_asal" ? " " + tx("asal_nota") : ""}</p>`;
    }
    if (a && a !== serie(i).slice(-1)[0]) { const vu = valFn(i)(m); if (num(vu)) extra += `<p class="pq-nota">${tx("ultim", periode(i), i.f(vu))}</p>`; }
    return cap(sobre, nomCurt(i)) + avis +
      `<p class="pq-valor"><span class="pq-num">${esc(i.f(mv.v))}</span><span class="pq-unitat">${esc(nomLlarg(i))}${periode(i, a) ? ` · ${esc(periode(i, a))}` : ""}</span></p>` +
      `<p class="pq-pos">${tx("posicio", pos, vals.length)}</p>` + (i.virtual || i.id === "pob" ? "" : frasesVs(i, mv.v, r, esc(nomMun(m)))) + extra + refsHtml(i, r) + tira(i, vals, m, r) + peuFont(i, !!a) + botons(i, m);
  }

  // Dada per àrea (salut, policia, jutjats, agents rurals)
  async function respArea(q, i, m) {
    const zk = zonaDe(i);
    const AR = (D.arees || {})[zk] || {};
    const noms = await window.mapaApi.noms(zk).catch(() => ({}));
    const vals = Object.entries(AR).map(([id, d]) => { let v = null; try { v = i[zk](d); } catch (e) { /* */ } return { id, nom: noms[id] || id, v }; }).filter((o) => num(o.v));
    const r = refs(i);
    if (!m) return respRanquingArea(q, i, vals, zk, r);
    const z = await window.mapaApi.area(zk, m.ine).catch(() => null);
    const mv = z ? vals.find((o) => String(o.id) === String(z.id)) : null;
    const sobre = `${esc(nomMun(m))} · ${esc(m.comarca)}`;
    if (!mv) return cap(sobre, nomCurt(i)) + `<p class="pq-frase">${tx("sense_dada", esc(nomLlarg(i)), esc(nomMun(m)))}</p>` + refsHtml(i, r) + peuFont(i) + botons(i, m);
    const pos = vals.filter((o) => o.v > mv.v).length + 1;
    const tz = tx("area_tit")[zk];
    return cap(sobre, nomCurt(i)) +
      `<p class="pq-valor"><span class="pq-num">${esc(i.f(mv.v))}</span><span class="pq-unitat">${esc(nomLlarg(i))}${periode(i) ? ` · ${esc(periode(i))}` : ""}</span></p>` +
      `<p class="pq-avis">${zk === "pj" ? tx("area_nota_pj", esc(mv.nom)) : tx("area_nota", tz, esc(mv.nom))}</p>` +
      `<p class="pq-pos">${tx("posicio_z", pos, vals.length, tx("arees")[zk])}</p>` + frasesVs(i, mv.v, r, esc(mv.nom)) + refsHtml(i, r) + tira(i, vals, mv.id, r) + peuFont(i) + botons(i, m);
  }
  function respRanquingArea(q, i, vals, zk, r) {
    const asc = q.dir === "asc";
    vals.sort((x, y) => (asc ? x.v - y.v : y.v - x.v));
    const top = vals.slice(0, q.nTop), max = Math.max(...top.map((o) => Math.abs(o.v))) || 1;
    return cap(`${tx("rank_sobre", asc)} · ${esc(tx("arees")[zk])}`, nomCurt(i)) +
      `<p class="pq-frase">${tx("rank_frase", esc(top[0].nom), esc(i.f(top[0].v)), asc)} <span class="pq-sub">${esc(nomLlarg(i))}.</span></p>` +
      `<ol class="pq-ranquing">${top.map((o, k) => `<li><span class="pq-r-n">${k + 1}</span><span class="pq-r-nom">${esc(o.nom)}</span>${barra(o.v, max)}<span class="pq-r-v">${esc(i.f(o.v))}</span></li>`).join("")}</ol>` +
      refsHtml(i, r) + peuFont(i) + botons(i);
  }

  function filtra(q, vals, filtres) {
    if (q.minPob) { vals = vals.filter((o) => (o.m.poblacion || 0) > q.minPob); filtres.push(tx("mes_de", fmt(q.minPob))); }
    if (q.maxPob) { vals = vals.filter((o) => (o.m.poblacion || 0) < q.maxPob); filtres.push(tx("menys_de", fmt(q.maxPob))); }
    if (q.coms.length) { vals = vals.filter((o) => q.coms.includes(o.m.comarca)); filtres.push(tx("a_comarca", q.coms.join(", "))); }
    return vals;
  }
  function filaMun(o, k, i, max) {
    return `<li><span class="pq-r-n">${k + 1}</span><button type="button" class="pq-r-nom" data-fitxa="${o.m.ine}">${esc(nomMun(o.m))}<small>${esc(o.m.comarca)}${i.id === "pob" ? "" : ` · ${fmt(o.m.poblacion)} ${tx("habitants")}`}</small></button>${barra(o.v, max)}<span class="pq-r-v">${esc(i.f(o.v))}</span></li>`;
  }
  function respRanquing(q, i) {
    const a = clauAny(i, q.any);
    const asc = q.dir === "asc";
    const filtres = [];
    let vals = filtra(q, valors(i, a), filtres);
    const tot = vals.length;
    vals.sort((x, y) => (asc ? x.v - y.v : y.v - x.v) || (y.m.poblacion || 0) - (x.m.poblacion || 0));
    const top = vals.slice(0, q.nTop);
    const sobre = `${tx("rank_sobre", asc)}${periode(i, a) ? " · " + esc(periode(i, a)) : ""}`;
    if (!top.length) return cap(sobre, nomCurt(i)) + `<p class="pq-frase">${tx("cap_rank")}</p>` + botons(i);
    const max = Math.max(...top.map((o) => Math.abs(o.v))) || 1;
    const r = a ? {} : refs(i);
    return cap(sobre, nomCurt(i)) +
      `<p class="pq-frase">${tx("rank_frase", esc(nomMun(top[0].m)), esc(i.f(top[0].v)), asc)} <span class="pq-sub">${esc(nomLlarg(i))}.</span>${filtres.length ? " " + tx("rank_filtre", filtres.join(", ")) : ""}</p>` +
      `<ol class="pq-ranquing">${top.map((o, k) => filaMun(o, k, i, max)).join("")}</ol>` + (!q.minPob && !q.maxPob && tot > 60 ? `<p class="pq-nota">${tx("rank_nota")}</p>` : "") +
      refsHtml(i, r) + peuFont(i) + botons(i);
  }

  // Condicions: «pobles amb el lloguer per sota de 600 € i renda per sobre de 15.000»
  function respCondicions(q) {
    const filtres = [];
    let base = filtra(q, D.municipios.map((m) => ({ m, v: null })), filtres);
    const cs = q.conds.filter((c) => c.ind && c.ind.v);
    cs.forEach((c) => { const f = valFn(c.ind); base = base.filter((o) => { const v = f(o.m); return num(v) && (c.amunt ? v > c.n : v < c.n); }); });
    const i0 = cs[0].ind, f0 = valFn(i0);
    let vals = base.map((o) => ({ m: o.m, v: f0(o.m) }));
    const asc = q.dir ? q.dir === "asc" : !cs[0].amunt;
    vals.sort((x, y) => (asc ? x.v - y.v : y.v - x.v));
    const txtC = cs.map((c) => tx(c.amunt ? "cond_mes" : "cond_menys", esc(nomCurt(c.ind).toLowerCase()), esc(c.ind.f(c.n)))).join(tx("cond_i"));
    const max = Math.max(...vals.slice(0, 25).map((o) => Math.abs(o.v)), 1);
    const altres = cs.slice(1).map((c) => c.ind);
    const fila = (o, k) => `<li><span class="pq-r-n">${k + 1}</span><button type="button" class="pq-r-nom" data-fitxa="${o.m.ine}">${esc(nomMun(o.m))}<small>${esc(o.m.comarca)}${altres.map((x) => ` · ${esc(nomCurt(x))}: ${esc(x.f(valFn(x)(o.m)))}`).join("")}</small></button>${barra(o.v, max)}<span class="pq-r-v">${esc(i0.f(o.v))}</span></li>`;
    return cap(`${esc(tx("cond_tit"))}${filtres.length ? " · " + esc(filtres.join(", ")) : ""}`, cs.map((c) => nomCurt(c.ind)).join(" · ")) +
      `<p class="pq-frase">${vals.length ? tx("cond_frase", vals.length, txtC) : tx("cond_cap")}</p>` +
      (vals.length ? `<ol class="pq-ranquing">${vals.slice(0, 25).map(fila).join("")}</ol>` : "") + peuFont(i0) + botons(i0);
  }

  function respComparacio(q, i, muns) {
    const a = clauAny(i, q.any);
    const vals = valors(i, a);
    const r = a ? {} : refs(i);
    const files = muns.map((m) => ({ m, o: vals.find((x) => x.m === m) }));
    const vs = files.filter((f) => f.o).map((f) => Math.abs(f.o.v)).concat([r.gi, r.cat, r.esp].filter(num).filter((x) => !(x > 8 * Math.max(...files.filter((f) => f.o).map((f) => f.o.v), 0))).map(Math.abs));
    const max = Math.max(...vs, 0) || 1;
    const pos = (v) => vals.filter((o) => o.v > v).length + 1;
    const fila = (nom, sub, v, cls, ine) => `<li class="${cls}"><span class="pq-r-nom"${ine ? ` data-fitxa="${ine}" role="button" tabindex="0"` : ""}>${esc(nom)}${sub ? `<small>${esc(sub)}</small>` : ""}</span>${num(v) && Math.abs(v) <= max ? barra(v, max) : '<span class="pq-r-barra"></span>'}<span class="pq-r-v">${num(v) ? esc(i.f(v)) : "–"}</span></li>`;
    const ls = files.map((f) => fila(nomMun(f.m), f.o ? tx("pos_curt", pos(f.o.v), vals.length) : tx("sense_curt"), f.o ? f.o.v : null, "pq-c-mun", f.m.ine)).join("") +
      [[tx("prov"), r.gi, "gi"], [tx("cat"), r.cat, "cat"], [tx("esp"), r.esp, "esp"]].filter((x) => num(x[1])).map(([n, v, k]) => fila(n, "", v, `pq-c-ref pq-c-${k}`)).join("");
    const amb = files.filter((f) => f.o).sort((x, y) => y.o.v - x.o.v);
    let frase = "";
    if (amb.length >= 2) {
      const [x, y] = [amb[0], amb[amb.length - 1]];
      let d = "";
      if (esPct(i)) d = `${fmt(x.o.v - y.o.v, 1)} ${LANG === "ca" ? "punts més" : "puntos más"}`;
      else if (y.o.v > 0) d = `${pct((x.o.v / y.o.v - 1) * 100, 0)} ${LANG === "ca" ? "més" : "más"}`;
      frase = `<p class="pq-frase">${amb.map((f) => `${esc(nomMun(f.m))}: <b>${esc(i.f(f.o.v))}</b>`).join(" · ")}</p>` + (d && x.o.v !== y.o.v ? `<p class="pq-vs">${tx("mes_que", esc(nomMun(x.m)), d, esc(nomMun(y.m)))}</p>` : "");
    }
    return cap(`${tx("comp_tit")}${periode(i, a) ? " · " + esc(periode(i, a)) : ""}`, nomCurt(i)) + frase + `<p class="pq-sub">${esc(nomLlarg(i))}</p>` +
      `<ol class="pq-ranquing pq-comp">${ls}</ol>` + peuFont(i) + botons(i);
  }

  // Diverses dades d'un o més municipis
  function respMulti(q, inds, muns) {
    if (muns.length <= 1) {
      const m = muns[0];
      const cel = inds.map((i) => {
        const vals = valors(i), r = refs(i);
        const v = m ? valFn(i)(m) : r.gi;
        const p = m && num(v) ? vals.filter((o) => o.v > v).length + 1 : null;
        return `<li><button type="button" class="pq-xip-gran" data-ind="${esc(i.id)}"${m ? ` data-ine="${m.ine}"` : ""}><span>${esc(nomCurt(i))}</span><b>${num(v) ? esc(i.f(v)) : "–"}</b><small>${esc(periode(i))}${p ? ` · ${tx("pos_curt", p, vals.length)}` : ""}${m && num(r.gi) ? ` · ${tx("gi")}: ${esc(i.f(r.gi))}` : ""}</small></button></li>`;
      }).join("");
      return cap(m ? `${esc(nomMun(m))} · ${esc(m.comarca)}` : tx("prov"), m ? tx("multi_tit", nomMun(m)) : tx("prov")) + `<ul class="pq-resum pq-resum-${Math.min(inds.length, 4)}">${cel}</ul>` +
        `<p class="pq-font"><span>${tx("font")}</span> ${inds.map((i) => esc(font(i))).filter(Boolean).filter((v, k, a) => a.indexOf(v) === k).join(" · ")}</p>` + botons(null, m);
    }
    const th = inds.map((i) => `<th>${esc(nomCurt(i))}<small>${esc(periode(i))}</small></th>`).join("");
    const trs = muns.map((m) => `<tr><th scope="row"><button type="button" data-fitxa="${m.ine}">${esc(nomMun(m))}</button></th>${inds.map((i) => { const v = valFn(i)(m); return `<td>${num(v) ? esc(i.f(v)) : "–"}</td>`; }).join("")}</tr>`).join("");
    const trp = `<tr class="pq-t-ref"><th scope="row">${tx("gi")}</th>${inds.map((i) => { const r = refs(i); return `<td>${num(r.gi) ? esc(i.f(r.gi)) : "–"}</td>`; }).join("")}</tr>`;
    return cap(tx("comp_tit"), tx("multi_comp")) + `<div class="pq-taula-c"><table class="pq-taula"><thead><tr><th></th>${th}</tr></thead><tbody>${trs}${trp}</tbody></table></div>`;
  }

  function respEvolucio(q, i, muns) {
    let l = serie(i);
    if (l.length < 2) return null;
    if (q.ultAnys) { const a0 = String(+String(l[l.length - 1]).slice(0, 4) - q.ultAnys); l = l.filter((a) => String(a).slice(0, 4) >= a0); }
    else if (q.any && /(desde|des de)/.test(q.tk.join(" "))) l = l.filter((a) => String(a).slice(0, 4) >= q.any);
    const blocs = (muns.length ? muns : [null]).map((m) => {
      const sr = SER(i);
      const punts = l.map((a) => ({ a, v: m ? valFn(i, a)(m) : sr.prov(a) })).filter((o) => num(o.v));
      if (punts.length < 2) return m ? `<p class="pq-frase"><b>${esc(nomMun(m))}</b>: ${tx("sense_dada", esc(nomLlarg(i)), esc(nomMun(m)))}</p>` : "";
      const p0 = punts[0], pu = punts[punts.length - 1];
      const d = esPct(i) ? `${pu.v - p0.v >= 0 ? "+" : "−"}${fmt(Math.abs(pu.v - p0.v), 1)} ${LANG === "ca" ? "punts" : "puntos"}` : varTxt(p0.v, pu.v);
      return `<div class="pq-evol-bloc">${muns.length > 1 || !m ? `<h4>${esc(m ? nomMun(m) : tx("prov"))}</h4>` : ""}<p class="pq-frase">${tx("evol_frase", esc(etPer(String(p0.a))), esc(i.f(p0.v)), esc(etPer(String(pu.a))), esc(i.f(pu.v)), d)}</p>${sparkline(punts, i)}</div>`;
    }).join("");
    if (!blocs.trim()) return null;
    const sobre = muns.length === 1 ? `${esc(nomMun(muns[0]))} · ${tx("evol_tit")}` : tx("evol_tit");
    return cap(sobre, nomCurt(i)) + `<p class="pq-sub">${esc(nomLlarg(i))}</p>` + blocs + peuFont(i, true) + botons(i, muns.length === 1 ? muns[0] : null);
  }

  function respProvincia(q, i) {
    if (i.especial) return null;
    const a = clauAny(i, q.any);
    const vals = valors(i, a).sort((x, y) => y.v - x.v);
    const r = a ? { gi: SER(i).prov(a) } : refs(i);
    const llista = (arr) => `<ol class="pq-mini">${arr.map((o) => `<li><button type="button" data-fitxa="${o.m.ine}">${esc(nomMun(o.m))}</button><span>${esc(i.f(o.v))}</span></li>`).join("")}</ol>`;
    return cap(`${tx("prov")}${periode(i, a) ? " · " + esc(periode(i, a)) : ""}`, nomCurt(i)) +
      (num(r.gi) ? `<p class="pq-valor"><span class="pq-num">${esc(i.f(r.gi))}</span><span class="pq-unitat">${esc(nomLlarg(i))}</span></p>` + frasesVs(i, r.gi, { cat: r.cat }, esc(tx("prov"))) : `<p class="pq-frase">${tx("sense_prov")}</p><p class="pq-sub">${esc(nomLlarg(i))}</p>`) +
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

  // Tots els indicadors d'un tema, per a un municipi o la província
  function respTema(q, tema, m) {
    const tm = window.mapaApi.TEMES.find((x) => x.id === tema);
    const inds = INDS.map((x) => x.i).filter((i) => i.tema === tema && i.v && !i.especial && !i.virtual);
    const files = inds.map((i) => {
      const vals = valors(i), r = refs(i);
      const v = m ? valFn(i)(m) : r.gi;
      if (!num(v)) return "";
      const p = m ? vals.filter((o) => o.v > v).length + 1 : null;
      return `<li><button type="button" class="pq-t-fila" data-ind="${esc(i.id)}"${m ? ` data-ine="${m.ine}"` : ""}><span class="pq-t-nom">${esc(nomCurt(i))}<small>${esc(nomLlarg(i))}${periode(i) ? ` · ${esc(periode(i))}` : ""}</small></span><span class="pq-t-v">${esc(i.f(v))}${p ? `<small>${tx("pos_curt", p, vals.length)}</small>` : ""}</span><span class="pq-t-gi">${m && num(r.gi) ? `${tx("gi")}<br>${esc(i.f(r.gi))}` : ""}</span></button></li>`;
    }).filter(Boolean);
    const nomT = tm ? tm[LANG] : tema;
    return cap(m ? `${esc(nomMun(m))} · ${esc(m.comarca)}` : tx("prov"), m ? tx("tema_tit", nomT, nomMun(m)) : tx("tema_prov", nomT)) +
      `<p class="pq-sub">${tx("tema_frase", files.length)}</p><ul class="pq-tema">${files.join("")}</ul>` + botons(null, m);
  }

  function respFont(q, i) {
    return cap(tx("font_tit"), nomCurt(i)) + `<p class="pq-frase">${tx("font_frase", esc(nomLlarg(i)))}</p><p class="pq-frase pq-font-gran">${esc(font(i) || "–")}</p>` +
      (periode(i) ? `<p class="pq-nota">${tx("font_per", esc(periode(i)))}</p>` : "") + `<p class="pq-accions"><a class="pq-btn pq-btn-2" href="#s-fonts">${tx("font_totes")} →</a></p>`;
  }

  // Seccions censals: rànquing de les seccions d'un municipi (o de tota la província)
  let SEC = null;
  async function respSeccions(q, i, m) {
    if (!i.s) return cap(m ? esc(nomMun(m)) : tx("prov"), nomCurt(i)) + `<p class="pq-frase">${tx("sec_no", esc(nomCurt(i)))}</p>` + (m ? respMun(q, i, m).replace(/^[\s\S]*?<\/h3>/, "") : "");
    if (!SEC) SEC = await fetch("datos/seccions.json").then((r) => r.json());
    const asc = q.dir === "asc";
    let vals = Object.entries(SEC).filter(([k]) => !m || k.slice(0, 5) === m.ine).map(([k, x]) => { let v = null; try { v = i.s(x); } catch (e) { /* */ } return { k, v }; }).filter((o) => num(o.v));
    if (!vals.length) return cap(m ? esc(nomMun(m)) : tx("prov"), nomCurt(i)) + `<p class="pq-frase">${tx("sec_no", esc(nomCurt(i)))}</p>`;
    vals.sort((x, y) => (asc ? x.v - y.v : y.v - x.v));
    const nomS = (k) => { const mm = D.municipios.find((x) => x.ine === k.slice(0, 5)); const s = tx("sec_nom", +k.slice(5, 7), +k.slice(7)); return m ? s : `${mm ? nomMun(mm) : k.slice(0, 5)}, ${s}`; };
    const top = vals.slice(0, q.nTop), max = Math.max(...top.map((o) => Math.abs(o.v))) || 1;
    const btnSec = `<button type="button" class="pq-btn pq-btn-2" data-mapa="${esc(i.id)}" data-sec="${m ? m.ine : "1"}">${tx("mapa_sec")} →</button>`;
    return cap(`${tx("rank_sobre", asc)} · ${esc(m ? tx("sec_tit", nomMun(m)) : tx("sec_prov"))}`, nomCurt(i)) +
      `<p class="pq-frase">${tx("sec_frase", esc(nomS(top[0].k)), esc(i.f(top[0].v)), asc)} <span class="pq-sub">${esc(nomLlarg(i))}. ${tx("sec_n", vals.length)}</span></p>` +
      `<ol class="pq-ranquing">${top.map((o, k) => `<li><span class="pq-r-n">${k + 1}</span><span class="pq-r-nom">${esc(nomS(o.k))}<small>${o.k}</small></span>${barra(o.v, max)}<span class="pq-r-v">${esc(i.f(o.v))}</span></li>`).join("")}</ol>` +
      peuFont(i) + `<p class="pq-accions">${btnSec}</p>`;
  }

  // Eleccions: resultats de qualsevol convocatòria (datos/eleccions.json i datos/eleccions/ID.json)
  let EL = null;
  const EL_D = {};
  async function elConv(q) {
    if (!EL) EL = await fetch("datos/eleccions.json").then((r) => r.json());
    let l = EL.conv.filter((c) => !q.elTipus || c.t === q.elTipus);
    if (q.any) l = l.filter((c) => String(c.any) === q.any);
    if (!l.length) return null;
    const c = l.slice().sort((a, b) => String(a.data || a.any).localeCompare(String(b.data || b.any))).pop();
    if (!EL_D[c.id]) EL_D[c.id] = await fetch(`datos/eleccions/${c.id}.json`).then((r) => r.json());
    return { c, d: EL_D[c.id] };
  }
  const elCands = (d, z) => {
    if (!z) return [];
    if (!Array.isArray(z[4])) return Object.entries(z[4]).map(([b, v]) => ({ s: b, b, nom: b, v })).sort((a, b) => b.v - a.v);
    const r = []; for (let k = 0; k < z[4].length; k += 2) { const c = d.c[z[4][k]]; r.push({ s: c[0], b: c[1], nom: c[2], v: z[4][k + 1] }); }
    return r.sort((a, b) => b.v - a.v);
  };
  const elValids = (z) => (z ? z[1] - z[2] : 0);
  const elBloc = (d, z, b) => { const v = elValids(z); return z && v ? (elCands(d, z).filter((c) => c.b === b).reduce((s, c) => s + c.v, 0) / v) * 100 : null; };
  const nomB = (b) => (typeof nomBloc === "function" ? nomBloc(b) : b);
  async function respEleccions(q) {
    const e = await elConv(q);
    if (!e) return `<p class="pq-frase">${tx("el_cap")}</p>`;
    const { c, d } = e;
    const nomC = c.n[LANG] || c.n.ca;
    const p1 = (v) => pct(v, 1);
    const elFont = `<p class="pq-font"><span>${tx("font")}</span> ${esc(tx("el_font"))}</p>`;
    const btnEl = `<p class="pq-accions"><button type="button" class="pq-btn" data-mapa="${q.blocs.length === 1 ? "el_" + q.blocs[0].toLowerCase().replace("ç", "c").replace("í", "i") : "el_guany"}" data-conv="${c.id}"${q.muns.length === 1 ? ` data-ine="${q.muns[0].ine}"` : ""}>${tx("mapa")} →</button>${q.muns.length === 1 ? `<button type="button" class="pq-btn pq-btn-2" data-fitxa="${q.muns[0].ine}">${esc(tx("fitxa", nomMun(q.muns[0])))} →</button>` : ""}</p>`;
    const munVals = (b) => D.municipios.map((m) => ({ m, v: elBloc(d, d.mun[m.ine], b) })).filter((o) => num(o.v));
    // Un partit sense municipi: rànquing
    if (q.blocs.length && !q.muns.length) {
      const b = q.blocs[0];
      if (/ (gano|guanya|guanyar|guanyo|ganaron|ganador|guanyador|gana) /.test(" " + q.tk.join(" ") + " ")) {
        const guanya = D.municipios.filter((m) => { const cc = elCands(d, d.mun[m.ine]); return cc.length && cc[0].b === b; });
        const vals = munVals(b).filter((o) => guanya.includes(o.m)).sort((x, y) => y.v - x.v);
        const max = Math.max(...vals.slice(0, q.nTop).map((o) => o.v), 1);
        return cap(esc(nomC), tx("el_guany_rank", nomB(b))) + `<p class="pq-frase">${tx("el_guany_n", esc(nomB(b)), guanya.length, Object.keys(d.mun).length)}</p>` +
          `<ol class="pq-ranquing">${vals.slice(0, q.nTop).map((o, k) => filaMun(o, k, { id: "", f: p1 }, max)).join("")}</ol>` + elFont + btnEl;
      }
      const filtres = [];
      let vals = filtra(q, munVals(b), filtres);
      const asc = q.dir === "asc";
      vals.sort((x, y) => (asc ? x.v - y.v : y.v - x.v));
      const top = vals.slice(0, q.nTop), max = Math.max(...top.map((o) => o.v), 1);
      const pv = elBloc(d, d.prov, b);
      return cap(`${esc(nomC)} · ${tx("rank_sobre", asc)}`, tx("el_rank", nomB(b))) +
        (num(pv) ? `<p class="pq-frase">${tx("el_bloc_prov", esc(nomB(b)), p1(pv))}${filtres.length ? " " + tx("rank_filtre", filtres.join(", ")) : ""}</p>` : "") +
        `<ol class="pq-ranquing">${top.map((o, k) => filaMun(o, k, { id: "", f: p1 }, max)).join("")}</ol>` + elFont + btnEl;
    }
    // Municipis (o província)
    const zones = q.muns.length ? q.muns.map((m) => ({ nom: nomMun(m), z: d.mun[m.ine], m })) : [{ nom: tx("prov"), z: d.prov }];
    const blocs = zones.map(({ nom, z, m }) => {
      if (!z) return `<p class="pq-frase">${tx("sense_dada", esc(nomC), esc(nom))}</p>`;
      const cs = elCands(d, z), v = elValids(z);
      const part = z[0] ? (z[1] / z[0]) * 100 : null;
      if (q.blocs.length) {
        return q.blocs.map((b) => { const x = elBloc(d, z, b), pvx = elBloc(d, d.prov, b); return `<p class="pq-frase">${tx("el_bloc", esc(nomB(b)), esc(nom), num(x) ? p1(x) : "–")}${m && num(pvx) ? ` <span class="pq-sub">${tx("el_prov")}: ${p1(pvx)}.</span>` : ""}</p>`; }).join("");
      }
      const max = cs.length ? cs[0].v : 1;
      const top = cs.slice(0, 6);
      return `${zones.length > 1 ? `<h4 class="pq-h4">${esc(nom)}</h4>` : ""}<p class="pq-frase">${cs.length ? tx("el_guanya", esc(nom), `${esc(cs[0].s)}${cs[0].b !== cs[0].s ? ` (${esc(nomB(cs[0].b))})` : ""}`, p1((cs[0].v / v) * 100)) : ""} ${num(part) ? tx("el_part", p1(part)) : ""}</p>` +
        `<ol class="pq-ranquing pq-comp">${top.map((x) => `<li class="pq-el"><span class="pq-r-nom">${esc(x.s)}<small>${esc(x.nom && x.nom !== x.s ? x.nom : nomB(x.b))}</small></span><span class="pq-r-barra"><b style="width:${((x.v / max) * 100).toFixed(1)}%;background:${esc(typeof colorBloc === "function" ? colorBloc(x.b) : "")}"></b></span><span class="pq-r-v">${p1((x.v / v) * 100)}<small>${fmt(x.v)} ${tx("el_vots").toLowerCase()}</small></span></li>`).join("")}</ol>`;
    }).join("");
    const sobre = q.muns.length === 1 ? `${esc(nomMun(q.muns[0]))} · ${esc(q.muns[0].comarca)}` : q.muns.length ? tx("comp_tit") : tx("prov");
    return cap(sobre, nomC) + blocs + elFont + btnEl;
  }

  function noEntenc(extra) {
    return `<p class="pq-frase">${tx("no_entenc")}</p>${extra || ""}<p class="pq-sub">${tx("no_entenc_2")}</p><div class="pq-alt">${tx("exemples").slice(0, 6).map((e) => `<button type="button" class="pq-xip" data-q="${esc(e)}">${esc(e)}</button>`).join("")}</div>`;
  }

  // ---------------------------------------------------------------- Pla: quin tipus de resposta toca
  function planifica(q, forcat) {
    const i = q.ind, ninds = q.inds.length;
    if (!q.muns.length && q.fora.length && !q.prov) return { tipus: "fora" };
    if (i && i.id === "alcalde" && q.muns.length) return { tipus: "alcalde" };
    if (q.elec && !forcat) return { tipus: "elec" };
    if (q.font && i && !i.especial) return { tipus: "font" };
    if (q.conds.length && q.conds.some((c) => c.ind && c.ind.v) && !q.muns.length) return { tipus: "cond" };
    if (q.seccio && i && !i.especial) return { tipus: "sec" };
    if (q.tema && !ninds) return { tipus: "tema" };
    if (ninds > 1) return { tipus: "multi" };
    if (!i && q.muns.length === 1) return { tipus: "resum" };
    if (!i && q.muns.length > 1) return { tipus: "comp" };
    if (!i) return { tipus: "no" };
    if (i.id === "alcalde" || i.id === "comarca") return q.muns.length ? { tipus: i.id } : { tipus: "no" };
    if (zonaDe(i)) return { tipus: q.muns.length ? "area" : "rank" };
    if (q.evol && serie(i).length > 1) return { tipus: "evol" };
    if (q.muns.length > 1) return { tipus: "comp" };
    if (q.muns.length === 1) return { tipus: "mun" };
    if (q.dir || q.ranqParaula || q.minPob || q.maxPob || q.coms.length) return { tipus: "rank" };
    if (q.evol) return { tipus: "evol" };
    return { tipus: "prov" };
  }

  // ---------------------------------------------------------------- Resposta
  let ultima = null, torn = 0;
  async function respon(raw, forcat, ineForcat) {
    raw = String(raw || "").trim();
    if (!raw && !forcat) { out.hidden = true; out.innerHTML = ""; return; }
    if (!prepara()) { out.hidden = false; out.innerHTML = `<p class="pq-sub">…</p>`; setTimeout(() => respon(raw, forcat, ineForcat), 300); return; }
    ultima = { raw, forcat, ineForcat };
    const meu = ++torn;
    const q = analitza(raw, forcat);
    if (ineForcat) { const m = D.municipios.find((x) => x.ine === ineForcat); if (m && !q.muns.includes(m)) q.muns = [m]; }
    const { tipus } = planifica(q, forcat);
    const i = q.ind;
    const pinta = (html) => { if (meu !== torn) return; out.innerHTML = `<div class="pq-cos">${html}</div>`; out.hidden = false; out.dataset.tipus = tipus; out.dataset.indicador = q.inds.map((x) => x.id).join("+"); };
    let html = "";
    const capM = (x) => x.charAt(0).toUpperCase() + x.slice(1);
    const bonic = (n) => n.replace(/\b([lsd]) (?=[aeiouh])/g, "$1'").split(" ").map((w, k) => { const a = /^([lsd]')(.+)$/.exec(w); if (a) return (k ? a[1] : a[1].toUpperCase()) + capM(a[2]); return k && /^(de|del|la|les|el|els|i)$/.test(w) ? w : capM(w); }).join(" ");
    const nuclis = q.nuclis.filter(([n, m]) => !norm(nomMun(m)).startsWith(norm(n))).map(([n, m]) => `<p class="pq-avis">${tx("nucli", esc(bonic(n)), esc(nomMun(m)))}</p>`).join("");
    try {
      if (tipus === "fora") html = `<p class="pq-frase">${esc(tx("fora", q.fora[0]))}</p>` + noEntenc("").replace(/^<p class="pq-frase">.*?<\/p>/, "");
      else if (tipus === "elec") { pinta(`<p class="pq-sub">${tx("el_carregant")}</p>`); html = await respEleccions(q); }
      else if (tipus === "font") html = respFont(q, i);
      else if (tipus === "cond") html = respCondicions(q);
      else if (tipus === "sec") { html = await respSeccions(q, i, q.muns[0] || null); }
      else if (tipus === "tema") html = respTema(q, q.tema, q.muns[0] || null);
      else if (tipus === "multi") html = respMulti(q, q.inds, q.muns);
      else if (tipus === "resum") html = `<p class="pq-frase">${q.ignora.length ? tx("no_tinc_mun", esc(nomMun(q.muns[0])), esc(q.ignora.join(" "))) : tx("nomes_mun", esc(nomMun(q.muns[0])))}</p>` + respResum(q.muns[0]) + chips(q.alt, tx("semblants"), q.muns[0].ine);
      else if (tipus === "comp" && !i) html = ["pob", "renda", "lloguer", "cj_atur"].map((id) => BYID[id] && respComparacio(q, BYID[id].i, q.muns)).filter(Boolean).map((h) => `<section class="pq-bloc">${h}</section>`).join("");
      else if (tipus === "no") html = noEntenc(chips(q.alt, tx("semblants")));
      else if (tipus === "alcalde" || tipus === "comarca") html = q.muns.map((m) => respMun(q, i, m)).join("");
      else if (tipus === "area") html = await respArea(q, i, q.muns[0]);
      else if (tipus === "rank" && zonaDe(i)) html = await respArea(q, i, null);
      else if (tipus === "evol") html = respEvolucio(q, i, q.muns) || (q.muns.length ? respMun(q, i, q.muns[0]) : respProvincia(q, i)).replace(/(<\/h3>)/, `$1<p class="pq-avis">${tx("sense_serie")}</p>`);
      else if (tipus === "comp") html = respComparacio(q, i, q.muns);
      else if (tipus === "mun") html = respMun(q, i, q.muns[0]);
      else if (tipus === "rank") { if (!q.dir) q.dir = "desc"; html = respRanquing(q, i); }
      else html = respProvincia(q, i) || noEntenc("");
    } catch (e) {
      console.error(e);
      html = noEntenc("");
    }
    if (nuclis) html = html.replace(/(<\/h3>)/, `$1${nuclis}`) || nuclis;
    // Nom parcial de més d'un municipi («Feliu»): s'agafa el més poblat i s'ofereixen els altres
    const parc = q.parcials.map((p) => `<div class="pq-alt pq-parcial"><p>${tx("parcial", esc(q.tk.slice(p.s, p.s + p.n).join(" ")), esc(nomMun(p.m)))}</p>${p.altres.slice(0, 5).map((m) => `<button type="button" class="pq-xip" data-q="${esc([...q.tk.slice(0, p.s), nomMun(m), ...q.tk.slice(p.s + p.n)].join(" "))}">${esc(nomMun(m))}</button>`).join("")}</div>`).join("");
    if (parc) html = /<\/h3>/.test(html) ? html.replace(/(<\/h3>)/, `$1${parc}`) : parc + html;
    if (i && !forcat && q.ignora.length && !i.especial && !["resum", "no", "fora", "elec"].includes(tipus)) html = html.replace(/(<\/h3>)/, `$1<p class="pq-avis">${tx("no_tinc", esc(q.ignora.join(" ")))}</p>`);
    if (q.perque && i) html = html.replace(/(<\/h3>)/, `$1<p class="pq-avis">${tx("perque")}</p>`);
    if (i && !i.especial && q.alt.length && !q.altFet && !["multi", "tema", "elec", "font"].includes(tipus)) html += chips(q.alt.slice(0, q.dubte ? 4 : 3), q.dubte ? tx("semblants") : tx("altres"), q.muns.length === 1 ? q.muns[0].ine : null);
    pinta(html);
  }

  // ---------------------------------------------------------------- Interpretació en directe i suggeriments
  const live = document.getElementById("pregunta-viu");
  const MUNS_GRANS = () => D.municipios.slice().sort((a, b) => (b.poblacion || 0) - (a.poblacion || 0));
  function suggeriments(v) {
    const q = analitza(v);
    const s = [];
    const tk = toks(v), ult = tk[tk.length - 1] || "";
    const acabat = /\s$/.test(v);
    // Completar el nom d'un municipi que s'està escrivint
    if (ult.length >= 2 && !acabat) {
      const ja = new Set(q.muns);
      const paraules = v.trim().split(/\s+/);
      let opc = [], pre = v.replace(/\S+$/, "");
      // Les últimes 1 a 4 paraules poden ser el començament d'un nom («sant feliu» → Sant Feliu de Guíxols)
      for (let j = Math.min(4, paraules.length); j >= 1 && !opc.length; j--) {
        const tros = toks(paraules.slice(-j).join(" "));
        if (!tros.length || (j > 1 && STOP.has(tros[0]) && !ART.has(tros[0]) && !ABREV[tros[0]])) continue;
        const k = clau(tros);
        if (k.length < 2) continue;
        opc = MUNS_GRANS().filter((m) => !ja.has(m) && toks(nomMun(m)).some((w, i, arr) => clau(arr.slice(i)).startsWith(k) && (i === 0 || !ART.has(w)))).slice(0, 4);
        if (opc.length) pre = paraules.slice(0, -j).join(" ") + (paraules.length > j ? " " : "");
      }
      opc.forEach((m) => s.push(pre + nomMun(m)));
      // o el d'un indicador
      if (s.length < 3 && !VOCAB.has(ult) && !STOP.has(ult) && !XERRA.has(ult) && !/^(habitant|vecin|veins|person)/.test(ult)) {
        const st = stem(ult);
        INDS.filter((x) => !x.i.especial && [...x.sh].some((w) => w.startsWith(st))).sort((a, b) => (b.pri >= 0 ? 100 - b.pri : 0) - (a.pri >= 0 ? 100 - a.pri : 0)).slice(0, 3)
          .forEach((x) => s.push(pre + nomCurt(x.i).toLowerCase() + (q.muns[0] ? "" : " ")));
      }
    }
    const m = q.muns[0], i = q.ind;
    if (m && !i) [tx("s_atur", nomMun(m)), tx("s_lloguer", nomMun(m)), tx("s_renda", nomMun(m)), tx("s_pob", nomMun(m)), tx("s_alc", nomMun(m)), tx("s_eleccions", nomMun(m)), tx("s_habitatge", nomMun(m))].forEach((x) => s.push(x));
    else if (i && !i.especial && !m) { s.push(tx("s_mes", nomCurt(i)), tx("s_menys", nomCurt(i)), tx("s_a", nomCurt(i), "Girona")); if (serie(i).length > 1) s.push(tx("s_evol", nomCurt(i), tx("la_prov"))); }
    else if (i && !i.especial && m) { if (serie(i).length > 1) s.push(tx("s_evol", nomCurt(i), nomMun(m))); const altre = MUNS_GRANS().find((x) => x !== m && x.comarca === m.comarca) || MUNS_GRANS().find((x) => x !== m); s.push(tx("s_vs", nomCurt(i), nomMun(m), nomMun(altre))); s.push(tx("s_mes", nomCurt(i))); }
    return { q, s: [...new Set(s)].filter((x) => norm(x) !== norm(v)).slice(0, 6) };
  }
  function entesa(q) {
    const p = [];
    q.muns.forEach((m) => p.push(nomMun(m)));
    q.coms.forEach((c) => p.push(c));
    if (q.prov && !q.muns.length) p.push(tx("prov"));
    if (q.elec) p.push(LANG === "ca" ? "eleccions" : "elecciones");
    q.blocs.forEach((b) => p.push(nomB(b)));
    if (q.tema && !q.inds.length) { const tm = window.mapaApi.TEMES.find((x) => x.id === q.tema); if (tm) p.push(tm[LANG]); }
    q.inds.forEach((i) => p.push(nomCurt(i)));
    const { tipus } = planifica(q);
    const tt = { rank: tx("t_rank"), comp: tx("t_comp"), evol: tx("t_evol") }[tipus];
    if (tt) p.push(tt);
    return p;
  }
  let actiu = -1, sugs = [], tempo = null;
  function pintaViu() {
    if (!live) return;
    const v = inp.value;
    if (!v.trim() || !prepara()) { live.hidden = true; live.innerHTML = ""; return; }
    const { q, s } = suggeriments(v);
    sugs = s;
    const e = entesa(q);
    live.innerHTML = (e.length ? `<p class="pq-entenc"><span>${tx("entenc")}</span>${e.map((x) => `<b>${esc(x)}</b>`).join("")}</p>` : "") +
      (s.length ? `<ul class="pq-sug" role="listbox" id="pregunta-sug">${s.map((x, k) => `<li role="option" id="pq-sug-${k}" aria-selected="${k === actiu}" data-q="${esc(x)}">${esc(x)}</li>`).join("")}</ul>` : "");
    live.hidden = !e.length && !s.length;
    inp.setAttribute("aria-expanded", String(!!s.length));
  }
  const tancaViu = () => { if (live) { live.hidden = true; } actiu = -1; inp.setAttribute("aria-expanded", "false"); };

  // ---------------------------------------------------------------- Interfície
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
  const pregunta = (v) => { clearTimeout(tempo); inp.value = v; tancaViu(); respon(v); desaUrl(v.trim()); };
  form.addEventListener("submit", (e) => { e.preventDefault(); if (actiu >= 0 && sugs[actiu]) { pregunta(sugs[actiu]); return; } pregunta(inp.value); });
  inp.addEventListener("search", () => { if (!inp.value) { respon(""); desaUrl(""); tancaViu(); } });
  inp.addEventListener("input", () => { actiu = -1; clearTimeout(tempo); tempo = setTimeout(pintaViu, 120); });
  inp.addEventListener("keydown", (e) => {
    if (!live || live.hidden || !sugs.length) return;
    if (e.key === "ArrowDown") { actiu = (actiu + 1) % sugs.length; pintaViu(); e.preventDefault(); }
    else if (e.key === "ArrowUp") { actiu = (actiu - 1 + sugs.length) % sugs.length; pintaViu(); e.preventDefault(); }
    else if (e.key === "Escape") tancaViu();
    if (actiu >= 0) inp.setAttribute("aria-activedescendant", `pq-sug-${actiu}`); else inp.removeAttribute("aria-activedescendant");
  });
  inp.addEventListener("blur", () => setTimeout(tancaViu, 150));
  inp.addEventListener("focus", () => { if (inp.value.trim()) pintaViu(); });
  if (live) live.addEventListener("mousedown", (e) => { const li = e.target.closest("[data-q]"); if (li) { e.preventDefault(); pregunta(li.dataset.q); } });
  exEl && exEl.addEventListener("click", (e) => { const b = e.target.closest("[data-q]"); if (b) pregunta(b.dataset.q); });
  out.addEventListener("click", (e) => {
    const q = e.target.closest("[data-q]");
    if (q) { pregunta(q.dataset.q); return; }
    const mp = e.target.closest("[data-mapa]");
    if (mp && window.mapaApi) {
      const id = mp.dataset.mapa, ine = mp.dataset.ine, sec = mp.dataset.sec, conv = mp.dataset.conv;
      const vaMapa = async () => {
        await window.mapaApi.tria(id);
        if (conv && window.mapaEleccio) await window.mapaEleccio(conv);
        if (sec && sec.length === 5 && window.mapaMunicipi) window.mapaMunicipi(sec);
        else if (ine) setTimeout(() => window.mapaApi.selecciona(ine), 450);
      };
      vaMapa();
      document.getElementById("s-mapa").scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    const x = e.target.closest("[data-ind]");
    if (x && out.contains(x) && x !== out) { respon(inp.value, x.dataset.ind, x.dataset.ine); return; }
    const f = e.target.closest("[data-fitxa]");
    if (f && typeof window.obreFitxa === "function") window.obreFitxa(f.dataset.fitxa, true);
  });
  out.addEventListener("keydown", (e) => { if (e.key === "Enter" && e.target.matches("[data-fitxa][role=button]")) e.target.click(); });

  // Des del cercador d'indicadors del mapa: si el que s'hi escriu sembla una pregunta, s'ofereix respondre-la
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
      const v = ci.value.trim(); ci.value = ""; ci.dispatchEvent(new Event("input")); pont.hidden = true;
      if (window.mapaMenuInd && window.mapaMenuInd.tanca) try { window.mapaMenuInd.tanca(); } catch (e) { /* */ }
      pregunta(v);
      form.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  document.querySelectorAll(".idiomes button").forEach((b) => b.addEventListener("click", () => {
    pintaExemples();
    if (ultima && !out.hidden) respon(ultima.raw, ultima.forcat, ultima.ineForcat);
  }));
  pintaExemples();
  try {
    const q0 = new URLSearchParams(location.search).get("q");
    if (q0) { inp.value = q0; respon(q0); }
  } catch (e) { /* */ }
  // Per a les proves (scripts/pregunta/prova.mjs)
  window.preguntaDades = {
    respon,
    analitza: (s) => (prepara() ? analitza(s) : null),
    pla: async (s) => {
      prepara(); const q = analitza(s); const p = planifica(q);
      let inds = q.inds.map((i) => i.id);
      if (p.tipus === "elec") inds = q.blocs.length ? q.blocs.map((b) => "el_" + b.toLowerCase().replace("ç", "c").replace("í", "i")) : / (participacion|participacio|abstencion|abstencio) /.test(" " + q.tk.join(" ") + " ") ? ["el_part"] : ["el_guany"];
      return { tipus: p.tipus, inds, muns: q.muns.map((m) => m.nom) };
    },
    suggeriments: (s) => (prepara() ? suggeriments(s).s : []),
  };
})();
