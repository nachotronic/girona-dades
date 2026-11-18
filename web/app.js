"use strict";

// ---------- Textos ----------
const T = {
  ca: {
    locals: "Llistes locals", n_alcaldies: (k, b) => `${k} alcaldies de ${b} a la província`, h_ajt: "Ajuntament", alcalde: "Alcaldia", ple: "Ple municipal", resultats: (a) => `Resultats de les municipals ${a}`, participacio: (p) => `Participació: ${p}`, regidors: (n) => `${n} ${n === 1 ? "regidor" : "regidors"}`, f_pol: "alcaldes, plens i resultats electorals", f_eleccions: "resultats per secció censal: Parlament, Congrés, municipals i europees (2010-2024)", f_mapaelectoral: "Congrés, municipals i europees des del 1977 i Corts del 1933 i el 1936, per municipi (i per secció el 2004-2009)",
    cerca_mapa: "Busca un municipi", cerca_ind: "Busca un indicador", cerca_ind_ph: "Busca entre els indicadors", cap_ind: "Cap indicador coincideix amb la cerca.", n_ind: (n) => `${n} indicadors`,
    nav_exp: "Exportacions", h_exp: "Què ven la província al món", lead_exp: "Quant exporta i importa la província, de quins productes i amb quins països, i com queda davant Catalunya i les altres províncies. Dades de Duanes (Agència Tributària): el detall més petit és la província.", ex_u_mon: "milions d'euros", f_exportacions: "exportacions i importacions per província, país, producte i mitjà de transport, anuals i mensuals", nav_dem: "Demografia", h_dem: "Quants naixem, quants morim i de què", lead_dem: "Naixements i defuncions de cada mes i de cada setmana, fills per dona, edat de les mares, causes de mort i els noms que es posen als nadons. La província davant Catalunya, Espanya i la resta de províncies.", f_dem_ine: "naixements i defuncions mensuals (definitius i provisionals), defuncions setmanals, indicadors demogràfics i causes de mort per província", f_dem_salut: "defuncions diàries per àrea bàsica de salut, des del 2017", f_dem_noms: "noms dels nadons per any, província i comarca", nav_tur: "Turisme", h_tur: "Qui ve, on dorm i quant gasta", lead_tur: "Places, pernoctacions, ocupació, preus dels hotels, d'on vénen els turistes i quant gasten. Província de Girona davant Catalunya i Espanya. Al mapa, el tema «Turisme» ho baixa a cada municipi.", f_turisme: "ocupació, preus dels hotels, despesa i turistes per municipi segons la telefonia mòbil", f_xifra_tur: "hotels, càmpings, turisme rural i habitatges d'ús turístic per municipi i any", f_ieet: "impost sobre les estades en establiments turístics",
    nav_salut: "Salut", h_salut: "Llistes d'espera, receptes, infeccions i hàbits", lead_salut: "Quant s'espera per operar-se o per veure l'especialista a cada hospital, quants medicaments es receten, com circulen la grip i les infeccions respiratòries, i què diu la gent de la seva salut i dels seus hàbits. Regió sanitària de Girona davant Catalunya.",
    nav_mapa: "Mapa", nav_conj: "Conjuntura", h_conj: "Com va la província, mes a mes", lead_conj: "L'últim mes o trimestre publicat d'atur, contractes, habitatge, hipoteques, preus i turisme, comparat amb el mateix període de l'any anterior.", f_sepe: "atur registrat i contractes per municipi, cada mes", f_ine_mes: "compravendes, hipoteques, IPC i ocupació hotelera de la província", f_iniciats: "habitatges iniciats i acabats per municipi, cada trimestre", nav_prov: "La província", h_prov2: "Girona davant Catalunya i Espanya", lead_prov: "Preus, feina, habitatge, turisme i empreses: les grans xifres de la província, comparades amb Catalunya i Espanya.", nav_evol: "Evolució", nav_mun: "Municipis", nav_fonts: "Fonts",
    sobre_hero: "Dades obertes · Província de Girona",
    meta_mun: "221 municipis · 536 seccions censals",
    lead_mapa: "Més de 200 indicadors de conjuntura, habitatge, renda, població, treball, comerç, salut, seguretat, emergències, vehicles, ajuntaments, cadastre, impostos locals, energia, eleccions i alcaldies. Tria un tema i un indicador, i baixa fins a la secció censal on la font ho permet.",
    lead_evol: "El conjunt de la província, any a any.",
    g_ren: "Renda", g_hab: "Lloguer i mercat", g_parc: "Parc d'habitatges", g_pob: "Població",
    x_renda: "Renda per persona", x_renda_llar: "Renda per llar", x_gini: "Desigualtat", x_lloguer: "Lloguer",
    x_var5: "Pujada del lloguer", x_esforc: "Esforç del lloguer", x_compra: "Compravendes", x_hut: "Pisos turístics",
    x_antics: "Abans de 1980", x_nous: "Des del 2000", x_estacional: "Població estacional", x_pob: "Habitants",
    pista: "Passa per sobre d'una zona del mapa, o toca-la, per veure'n el detall.",
    posicio: (i, n) => `${i}a de ${n}`, mediana: (v) => `mediana ${v}`,
    r_alts: "Més alts", r_baixos: "Més baixos", obrir_fitxa: "Obre la fitxa del municipi", cat_mes: (n) => `Mostra'n ${n} més`, cat_menys: "Mostra només les 5 primeres",
    h_mapa: "Tota la província, en un mapa",
    nac_info: (n, p, e) => `${n} persones, el ${p} dels ${e} estrangers del municipi`, nac_k: (k, p) => `Primera nacionalitat a ${k} municipis: ${p}`,
    h_nac: "D'on són els estrangers", h_nac_sub: (a, e, p) => `${e} residents de nacionalitat estrangera (${p} de la població), ${a}. Principals països:`, altres_paisos: "Altres països", n_estr: "estrangers", f_nac: "Idescat, Cens anual de població", f_nac_ine: "INE, padró continu. L'INE només detalla les principals nacionalitats; la resta (Hondures, Gàmbia, Índia…) són a «altres països»", font_c: "Font",
    h_univ: "On estudien els universitaris", h_univ_sub: (n, c) => `${n} universitaris residents, curs ${c}.`, u_mateix: "Al mateix municipi", u_comarca: "A la resta de la comarca", u_fora: "Fora de la comarca", f_univ: "Idescat, mobilitat per estudis universitaris",
    ctl_indicador: "Indicador", ctl_nivell: "Detall", nivell_mun: "Municipis", nivell_sec: "Seccions censals", nivell_abs: "Àrees de salut", lc_grans: "Grans establiments comercials", f_comerc: "comerços i superfície de venda per sector i municipi, locals buits (Mapa del Comerç Català 2022) i llicències de grans establiments", f_llistes: "llistes d'espera per hospital", nivell_abp: "Àrees policials", area_abs: "Àrea bàsica de salut", area_abp: "Àrea bàsica policial", nivell_aar: "Àrees d'Agents Rurals", nivell_pj: "Partits judicials", nivell_com: "Comarques", area_com: "Comarca", nav_mob: "Mobilitat", h_mob: "Com es mou la gent", lead_mob: "Quants desplaçaments fem cada dia feiner, amb quin mitjà, per què, a quina hora i cap a on. Enquesta de Mobilitat Quotidiana 2024-2025 de l'ATM de Girona: 13.894 persones entrevistades a les set comarques. Al mapa, el tema «Mobilitat» ho baixa a cada comarca i als municipis amb prou entrevistes.", f_emq: "desplaçaments, mitjà de transport, motiu, horari, origen i destinació, vehicles i teletreball per municipi i comarca", area_pj: "Partit judicial", f_cgpj: "violència de gènere, desnonaments i assumptes dels jutjats per partit judicial", f_interior: "Balanç de Criminalitat, municipis de més de 20.000 habitants", area_aar: "Àrea bàsica dels Agents Rurals", aar_info: (r, k) => `Àrea regional ${r}${k ? ` · ${k} municipis de la província` : ""}`, reb_info: (b) => `Regió de Bombers: ${b}`, reb_k: (k) => `${k} municipis de la província en aquesta regió`, f_idescat_codis: "divisions territorials dels Agents Rurals i dels Bombers (municipis de cada àrea)", f_bombers: "actuacions per municipi", f_incendis: "incendis forestals per municipi d'inici", ref_titol: "Comparació", ref_gi_curt: "Província", tots_ind: "Tots els indicadors", posicio_curt: (a, b) => `${a}a de ${b}`, fi_nota: "Barra: del valor més baix al més alt de la província.", any_ctl: "Any", reprodueix: "Reprodueix l'evolució", atura: "Atura", evolucio: "Evolució", prov_curt: "Província", f_salut: "població, defuncions, atenció primària, infeccions, receptes i centres sanitaris", f_mossos: "fets penals per àrea bàsica policial, regió i mes", f_emex: "valors de referència de Catalunya", ref_gi: "Província de Girona", ref_cat: "Catalunya", ref_esp: "Espanya",
    mapa_aria: "Mapa de la província de Girona",
    ajuda_mapa: "Passa per sobre d'un municipi o secció per veure'n el valor; toca'l per obrir-ne la fitxa.",
    f_geo: "límits de municipis i seccions", f_base: "mapa base",
    sense_dades: "Sense dades", seccio: "Secció censal",
    nomes_mun: "Aquest indicador només existeix per municipi.",
    veure_seccions: "Veure'l per seccions al mapa",
    i_lloguer: "Lloguer mitjà 2025 (€/mes)", i_var5: "Variació del lloguer 2020-2025",
    i_renda: "Renda neta per persona 2024 (€)", i_renda_llar: "Renda neta per llar 2024 (€)",
    i_esforc: "Esforç del lloguer (% de la renda de la llar)", i_compra: "Compravendes per 1.000 habitants 2025",
    i_hut: "Habitatges d'ús turístic per 100 habitatges", i_antics: "Habitatges construïts abans de 1980 (%)",
    i_nous: "Habitatges construïts des del 2000 (%)", i_gini: "Índex de Gini 2024 (desigualtat)",
    i_pob: "Població", i_estacional: "Població estacional respecte a la resident (%)",
    marca: "Girona en xifres",
    titol: "Com és cada poble de Girona",
    entradeta: "Habitatge, renda, feina, salut, seguretat i política dels 221 municipis de la província, en mapes i fitxes comparades amb Catalunya i Espanya. Dades oficials que s'actualitzen cada setmana.",
    h_prov: "La província en xifres",
    h_evol: "Com ha evolucionat",
    g_lloguer: "Lloguer mitjà mensual",
    g_compra: "Compravendes d'habitatges",
    sol_tit: "Plaques solars", sol_sub: (n, kw, a, mx) => `${n} instal·lacions fotovoltaiques d'autoconsum i ${kw} kW de potència a finals del ${a}.${mx ? ` L'any amb més instal·lacions noves va ser el ${mx}.` : ""}`,
    sol_k_h: "Instal·lacions per 1.000 habitants", sol_k_w: "Potència per habitant", sol_k_viv: "Instal·lacions per 100 habitatges",
    sol_ref: (g, c) => `Província ${g}${c !== "–" ? ` · Catalunya ${c}` : ""}`, sol_n_viv: "Habitatges segons el Cadastre",
    sol_g_nn: "Instal·lacions noves cada any", sol_g_w: "Potència per habitant", u_install: "instal·lacions",
    sol_font: (d) => `Font: Generalitat, Registre d'autoconsum de Catalunya (RAC), dades fins al ${d}. Població: padró. Sense dades per secció censal: el registre no dona l'adreça.`,
    g_renda: "Renda neta mitjana per persona",
    u_operacions: "operacions per any",
    u_euros_any: "€/any",
    h_mun: "Municipi a municipi",
    ajuda_taula: "Ordena per qualsevol columna i toca una fila per obrir la fitxa del municipi.",
    cerca: "Cerca un municipi",
    cerca_ph: "Cerca un municipi o comarca",
    comptador: (n, t) => `${n} de ${t} municipis`,
    h_fonts: "Fonts",
    f_lloguer: "lloguer mitjà a partir de les fiances",
    f_compra: "compravendes d'habitatge nou, usat i protegit",
    f_renda: "renda, pobresa, fonts d'ingressos i demografia",
    f_hut: "habitatges d'ús turístic",
    f_cat: "habitatges i any de construcció",
    f_cad: "immobles, valor cadastral, sòl i usos per municipi (1990-2026), IBI per municipi (2008-2025) i valor i superfície de l'habitatge per districte censal",
    f_hab: "habitatges iniciats i acabats (1990-2025), habitatge protegit, cèdules d'habitabilitat per municipi i secció, àrees de política d'habitatge i Mapa urbanístic de Catalunya",
    f_trib: "tipus de l'IBI, IAE, impost de circulació, plusvàlua i ICIO de cada ajuntament (2000-2026)",
    f_aeat: "declarants de l'IRPF per municipi", f_anuari_aeat: "anuari estadístic: IRPF per municipi des del 2013, salaris i pensions", f_padro: "població oficial de cada municipi i empreses", f_nac: "població per nacionalitat", f_pres: "liquidació dels pressupostos municipals",
    f_edu: "alumnes, centres, preinscripció, avaluacions i nivell d'estudis", f_univ: "on estudien els universitaris de cada municipi", f_afil: "afiliats i autònoms per municipi de residència, cada mes",
    f_dgt: "matriculacions de vehicles per municipi, cada mes", f_aena: "passatgers de l'aeroport de Girona, cada mes",
    font_act: "Descarregat", font_manual: "Càrrega manual anual", f_esca: "enquesta de salut per regió sanitària i sèrie de Catalunya", font_avis: "Última descàrrega correcta", font_avis_t: "L'última descàrrega va fallar en part: es mostren les dades anteriors",
    f_xifra: "població, treball, ajuntaments, energia", f_gen: "renda garantida, plaques solars d'autoconsum, residus",
    actualitzat: "Actualitzat el",
    codi: "Codi i dades a GitHub", ref_pagines: "Dades per municipi en text, CSV i JSON",
    l_qui: "Qui som", l_avis: "Avís legal", l_priv: "Privacitat i galetes", l_llic: "Reutilització: CC BY 4.0",
    nav_pq: "Pregunta", pq_et: "Pregunta a les dades", pq_ph: "Quants assalariats hi ha a Agullana?", pq_boto: "Pregunta", pq_prova: "Prova:",
    pq_sense_ia: "Sense intel·ligència artificial: només respon amb les dades publicades en aquest web i, si no ho sap, ho diu.", pq_des_mapa: "Preguntar",
    l_proposa: "Proposa una dada", pr_sobre: "Bústia", pr_titol: "Et falta alguna dada?", pr_lead: "Fes-nos saber quina dada t'agradaria trobar aquí, de quin municipi o tema, i d'on es podria treure si ho saps. Llegim totes les propostes.",
    pr_dada: "Quina dada et falta", pr_dada_ph: "Per exemple: preu del lloguer per barris de Figueres", pr_lloc: "Municipi o tema", pr_lloc_ph: "Opcional", pr_font: "Font, si la coneixes", pr_font_ph: "Opcional: organisme o enllaç",
    pr_email: "El teu correu", pr_email_ph: "Opcional, només si vols resposta", pr_envia: "Envia la proposta", pr_assumpte: "Proposta de dada · Girona en xifres",
    pr_avis: "El missatge s'envia per correu a la redacció a través de FormSubmit. Detalls a ", pr_avis_l: "Privacitat",
    pr_enviant: "Enviant…", pr_ok: "<b>Gràcies.</b> Hem rebut la proposta.", pr_error: (u, c) => `No s'ha pogut enviar. <a href="${u}">Envia-la per correu</a> a ${c}.`,
    pr_fitxa: (n) => `Et falta alguna dada de ${n}? Fes-nos-ho saber`,
    k_lloguer: "Lloguer mitjà",
    k_hab: "Habitants", n_hab: (v) => `${v} nascuts a l'estranger`, k_atur: "Atur (EPA)", n_atur: (p, e) => `${p} · Espanya, ${e}`,
    k_ipc: "Inflació", n_ipc: (p, e) => `interanual, ${p} · Espanya, ${e}`, k_tur: "Nits d'hotel", n_tur: (v) => `${v} de turistes estrangers`,
    mesos_curt: ["gen.", "febr.", "març", "abr.", "maig", "juny", "jul.", "ag.", "set.", "oct.", "nov.", "des."],
    k_compra: "Compravendes",
    k_renda: "Renda neta per persona",
    k_esforc: "Esforç del lloguer",
    k_hut: "Habitatges d'ús turístic",
    k_antics: "Habitatges anteriors a 1980",
    k_pob: "Població",
    n_vs: (a) => `respecte a ${a}`,
    n_esforc: "del que ingressa una llar mitjana",
    n_hut: (x) => `${x} per cada 100 habitatges`,
    n_antics: "segons el Cadastre",
    n_estacional: (x) => `${x} de població estacional (ETCA)`,
    c_municipi: "Municipi", c_comarca: "Comarca", c_pob: "Població",
    c_lloguer: "Lloguer 2025 (€/mes)", c_var5: "Lloguer, variació en 5 anys",
    c_renda: "Renda per persona 2024 (€)", c_esforc: "Esforç lloguer (% renda llar)",
    c_compra: "Compravendes 2025", c_hut: "HUT per 100 habitatges",
    municipi: "Municipi", provincia: "Província",
    tanca: "Tanca",
    sense: "Sense dades: el municipi té massa pocs contractes o operacions per publicar-les.",
    sub: (c, p) => `${c} · ${p} habitants`,
  },
  es: {
    locals: "Listas locales", n_alcaldies: (k, b) => `${k} alcaldías de ${b} en la provincia`, h_ajt: "Ayuntamiento", alcalde: "Alcaldía", ple: "Pleno municipal", resultats: (a) => `Resultados de las municipales ${a}`, participacio: (p) => `Participación: ${p}`, regidors: (n) => `${n} ${n === 1 ? "concejal" : "concejales"}`, f_pol: "alcaldes, plenos y resultados electorales", f_eleccions: "resultados por sección censal: Parlament, Congreso, municipales y europeas (2010-2024)", f_mapaelectoral: "Congreso, municipales y europeas desde 1977 y Cortes de 1933 y 1936, por municipio (y por sección en 2004-2009)",
    cerca_mapa: "Busca un municipio", cerca_ind: "Busca un indicador", cerca_ind_ph: "Busca entre los indicadores", cap_ind: "Ningún indicador coincide con la búsqueda.", n_ind: (n) => `${n} indicadores`,
    nav_exp: "Exportaciones", h_exp: "Qué vende la provincia al mundo", lead_exp: "Cuánto exporta e importa la provincia, de qué productos y con qué países, y cómo queda frente a Cataluña y las demás provincias. Datos de Aduanas (Agencia Tributaria): el detalle más pequeño es la provincia.", ex_u_mon: "millones de euros", f_exportacions: "exportaciones e importaciones por provincia, país, producto y medio de transporte, anuales y mensuales", nav_dem: "Demografía", h_dem: "Cuántos nacemos, cuántos morimos y de qué", lead_dem: "Nacimientos y defunciones de cada mes y de cada semana, hijos por mujer, edad de las madres, causas de muerte y los nombres que se ponen a los bebés. La provincia frente a Cataluña, España y el resto de provincias.", f_dem_ine: "nacimientos y defunciones mensuales (definitivos y provisionales), defunciones semanales, indicadores demográficos y causas de muerte por provincia", f_dem_salut: "defunciones diarias por área básica de salud, desde 2017", f_dem_noms: "nombres de los bebés por año, provincia y comarca", nav_tur: "Turismo", h_tur: "Quién viene, dónde duerme y cuánto gasta", lead_tur: "Plazas, pernoctaciones, ocupación, precios de los hoteles, de dónde vienen los turistas y cuánto gastan. Provincia de Girona frente a Cataluña y España. En el mapa, el tema «Turismo» lo baja a cada municipio.", f_turisme: "ocupación, precios de los hoteles, gasto y turistas por municipio según la telefonía móvil", f_xifra_tur: "hoteles, campings, turismo rural y viviendas de uso turístico por municipio y año", f_ieet: "impuesto sobre las estancias en establecimientos turísticos",
    nav_salut: "Salud", h_salut: "Listas de espera, recetas, infecciones y hábitos", lead_salut: "Cuánto se espera para operarse o para ver al especialista en cada hospital, cuántos medicamentos se recetan, cómo circulan la gripe y las infecciones respiratorias, y qué dice la gente de su salud y de sus hábitos. Región sanitaria de Girona frente a Cataluña.",
    nav_mapa: "Mapa", nav_conj: "Coyuntura", h_conj: "Cómo va la provincia, mes a mes", lead_conj: "El último mes o trimestre publicado de paro, contratos, vivienda, hipotecas, precios y turismo, comparado con el mismo periodo del año anterior.", f_sepe: "paro registrado y contratos por municipio, cada mes", f_ine_mes: "compraventas, hipotecas, IPC y ocupación hotelera de la provincia", f_iniciats: "viviendas iniciadas y acabadas por municipio, cada trimestre", nav_prov: "La provincia", h_prov2: "Girona frente a Cataluña y España", lead_prov: "Precios, empleo, vivienda, turismo y empresas: las grandes cifras de la provincia, comparadas con Cataluña y España.", nav_evol: "Evolución", nav_mun: "Municipios", nav_fonts: "Fuentes",
    sobre_hero: "Datos abiertos · Provincia de Girona",
    meta_mun: "221 municipios · 536 secciones censales",
    lead_mapa: "Más de 200 indicadores de coyuntura, vivienda, renta, población, trabajo, comercio, salud, seguridad, emergencias, vehículos, ayuntamientos, catastro, impuestos locales, energía, elecciones y alcaldías. Elige un tema y un indicador, y baja hasta la sección censal donde la fuente lo permite.",
    lead_evol: "El conjunto de la provincia, año a año.",
    g_ren: "Renta", g_hab: "Alquiler y mercado", g_parc: "Parque de viviendas", g_pob: "Población",
    x_renda: "Renta por persona", x_renda_llar: "Renta por hogar", x_gini: "Desigualdad", x_lloguer: "Alquiler",
    x_var5: "Subida del alquiler", x_esforc: "Esfuerzo del alquiler", x_compra: "Compraventas", x_hut: "Pisos turísticos",
    x_antics: "Antes de 1980", x_nous: "Desde 2000", x_estacional: "Población estacional", x_pob: "Habitantes",
    pista: "Pasa por encima de una zona del mapa, o tócala, para ver el detalle.",
    posicio: (i, n) => `${i}.º de ${n}`, mediana: (v) => `mediana ${v}`,
    r_alts: "Más altos", r_baixos: "Más bajos", obrir_fitxa: "Abrir la ficha del municipio", cat_mes: (n) => `Mostrar ${n} más`, cat_menys: "Mostrar solo las 5 primeras",
    h_mapa: "Toda la provincia, en un mapa",
    nac_info: (n, p, e) => `${n} personas, el ${p} de los ${e} extranjeros del municipio`, nac_k: (k, p) => `Primera nacionalidad en ${k} municipios: ${p}`,
    h_nac: "De dónde son los extranjeros", h_nac_sub: (a, e, p) => `${e} residentes de nacionalidad extranjera (${p} de la población), ${a}. Principales países:`, altres_paisos: "Otros países", n_estr: "extranjeros", f_nac: "Idescat, Censo anual de población", f_nac_ine: "INE, padrón continuo. El INE solo detalla las principales nacionalidades; el resto (Honduras, Gambia, India…) está en «otros países»", font_c: "Fuente",
    h_univ: "Dónde estudian los universitarios", h_univ_sub: (n, c) => `${n} universitarios residentes, curso ${c}.`, u_mateix: "En el mismo municipio", u_comarca: "En el resto de la comarca", u_fora: "Fuera de la comarca", f_univ: "Idescat, movilidad por estudios universitarios",
    ctl_indicador: "Indicador", ctl_nivell: "Detalle", nivell_mun: "Municipios", nivell_sec: "Secciones censales", nivell_abs: "Áreas de salud", lc_grans: "Grandes establecimientos comerciales", f_comerc: "comercios y superficie de venta por sector y municipio, locales vacíos (Mapa del Comerç Català 2022) y licencias de grandes establecimientos", f_llistes: "listas de espera por hospital", nivell_abp: "Áreas policiales", area_abs: "Área básica de salud", area_abp: "Área básica policial", nivell_aar: "Áreas de Agents Rurals", nivell_pj: "Partidos judiciales", nivell_com: "Comarcas", area_com: "Comarca", nav_mob: "Movilidad", h_mob: "Cómo se mueve la gente", lead_mob: "Cuántos desplazamientos hacemos cada día laborable, con qué medio, por qué, a qué hora y hacia dónde. Encuesta de Movilidad Cotidiana 2024-2025 de la ATM de Girona: 13.894 personas entrevistadas en las siete comarcas. En el mapa, el tema «Movilidad» lo baja a cada comarca y a los municipios con suficientes entrevistas.", f_emq: "desplazamientos, medio de transporte, motivo, horario, origen y destino, vehículos y teletrabajo por municipio y comarca", area_pj: "Partido judicial", f_cgpj: "violencia de género, desahucios y asuntos de los juzgados por partido judicial", f_interior: "Balance de Criminalidad, municipios de más de 20.000 habitantes", area_aar: "Área básica de los Agents Rurals", aar_info: (r, k) => `Área regional ${r}${k ? ` · ${k} municipios de la provincia` : ""}`, reb_info: (b) => `Región de Bombers: ${b}`, reb_k: (k) => `${k} municipios de la provincia en esta región`, f_idescat_codis: "divisiones territoriales de los Agents Rurals y de los Bombers (municipios de cada área)", f_bombers: "actuaciones por municipio", f_incendis: "incendios forestales por municipio de inicio", ref_titol: "Comparación", ref_gi_curt: "Provincia", tots_ind: "Todos los indicadores", posicio_curt: (a, b) => `${a}.º de ${b}`, fi_nota: "Barra: del valor más bajo al más alto de la provincia.", any_ctl: "Año", reprodueix: "Reproduce la evolución", atura: "Detener", evolucio: "Evolución", prov_curt: "Provincia", f_salut: "población, defunciones, atención primaria, infecciones, recetas y centros sanitarios", f_mossos: "hechos penales por área básica policial, región y mes", f_emex: "valores de referencia de Cataluña", ref_gi: "Provincia de Girona", ref_cat: "Cataluña", ref_esp: "España",
    mapa_aria: "Mapa de la provincia de Girona",
    ajuda_mapa: "Pasa por encima de un municipio o sección para ver su valor; tócalo para abrir su ficha.",
    f_geo: "límites de municipios y secciones", f_base: "mapa base",
    sense_dades: "Sin datos", seccio: "Sección censal",
    nomes_mun: "Este indicador solo existe por municipio.",
    veure_seccions: "Verlo por secciones en el mapa",
    i_lloguer: "Alquiler medio 2025 (€/mes)", i_var5: "Variación del alquiler 2020-2025",
    i_renda: "Renta neta por persona 2024 (€)", i_renda_llar: "Renta neta por hogar 2024 (€)",
    i_esforc: "Esfuerzo del alquiler (% de la renta del hogar)", i_compra: "Compraventas por 1.000 habitantes 2025",
    i_hut: "Viviendas de uso turístico por 100 viviendas", i_antics: "Viviendas construidas antes de 1980 (%)",
    i_nous: "Viviendas construidas desde 2000 (%)", i_gini: "Índice de Gini 2024 (desigualdad)",
    i_pob: "Población", i_estacional: "Población estacional respecto a la residente (%)",
    marca: "Girona en xifres",
    titol: "Cómo es cada pueblo de Girona",
    entradeta: "Vivienda, renta, empleo, salud, seguridad y política de los 221 municipios de la provincia, en mapas y fichas comparadas con Cataluña y España. Datos oficiales que se actualizan cada semana.",
    h_prov: "La provincia en cifras",
    h_evol: "Cómo ha evolucionado",
    g_lloguer: "Alquiler medio mensual",
    g_compra: "Compraventas de viviendas",
    sol_tit: "Placas solares", sol_sub: (n, kw, a, mx) => `${n} instalaciones fotovoltaicas de autoconsumo y ${kw} kW de potencia a finales de ${a}.${mx ? ` El año con más instalaciones nuevas fue ${mx}.` : ""}`,
    sol_k_h: "Instalaciones por 1.000 habitantes", sol_k_w: "Potencia por habitante", sol_k_viv: "Instalaciones por 100 viviendas",
    sol_ref: (g, c) => `Provincia ${g}${c !== "–" ? ` · Cataluña ${c}` : ""}`, sol_n_viv: "Viviendas según el Catastro",
    sol_g_nn: "Instalaciones nuevas cada año", sol_g_w: "Potencia por habitante", u_install: "instalaciones",
    sol_font: (d) => `Fuente: Generalitat, Registro de autoconsumo de Cataluña (RAC), datos hasta el ${d}. Población: padrón. Sin datos por sección censal: el registro no da la dirección.`,
    g_renda: "Renta neta media por persona",
    u_operacions: "operaciones por año",
    u_euros_any: "€/año",
    h_mun: "Municipio a municipio",
    ajuda_taula: "Ordena por cualquier columna y toca una fila para abrir la ficha del municipio.",
    cerca: "Busca un municipio",
    cerca_ph: "Busca un municipio o comarca",
    comptador: (n, t) => `${n} de ${t} municipios`,
    h_fonts: "Fuentes",
    f_lloguer: "alquiler medio a partir de las fianzas",
    f_compra: "compraventas de vivienda nueva, usada y protegida",
    f_renda: "renta, pobreza, fuentes de ingresos y demografía",
    f_hut: "viviendas de uso turístico",
    f_cat: "viviendas y año de construcción",
    f_cad: "inmuebles, valor catastral, suelo y usos por municipio (1990-2026), IBI por municipio (2008-2025) y valor y superficie de la vivienda por distrito censal",
    f_hab: "viviendas iniciadas y acabadas (1990-2025), vivienda protegida, cédulas de habitabilidad por municipio y sección, áreas de política de vivienda y Mapa urbanístico de Cataluña",
    f_trib: "tipos del IBI, IAE, impuesto de circulación, plusvalía e ICIO de cada ayuntamiento (2000-2026)",
    f_aeat: "declarantes del IRPF por municipio", f_anuari_aeat: "anuario estadístico: IRPF por municipio desde 2013, salarios y pensiones", f_padro: "población oficial de cada municipio y empresas", f_nac: "población por nacionalidad", f_pres: "liquidación de los presupuestos municipales",
    f_edu: "alumnos, centros, preinscripción, evaluaciones y nivel de estudios", f_univ: "dónde estudian los universitarios de cada municipio", f_afil: "afiliados y autónomos por municipio de residencia, cada mes",
    f_dgt: "matriculaciones de vehículos por municipio, cada mes", f_aena: "pasajeros del aeropuerto de Girona, cada mes",
    font_act: "Descargado", font_manual: "Carga manual anual", f_esca: "encuesta de salud por región sanitaria y serie de Cataluña", font_avis: "Última descarga correcta", font_avis_t: "La última descarga falló en parte: se muestran los datos anteriores",
    f_xifra: "población, trabajo, ayuntamientos, energía", f_gen: "renta garantizada, placas solares de autoconsumo, residuos",
    actualitzat: "Actualizado el",
    codi: "Código y datos en GitHub", ref_pagines: "Datos por municipio en texto, CSV y JSON",
    l_qui: "Quiénes somos", l_avis: "Aviso legal", l_priv: "Privacidad y cookies", l_llic: "Reutilización: CC BY 4.0",
    nav_pq: "Pregunta", pq_et: "Pregunta a los datos", pq_ph: "¿Cuántos asalariados hay en Agullana?", pq_boto: "Preguntar", pq_prova: "Prueba:",
    pq_sense_ia: "Sin inteligencia artificial: solo responde con los datos publicados en esta web y, si no lo sabe, lo dice.", pq_des_mapa: "Preguntar",
    l_proposa: "Propón un dato", pr_sobre: "Buzón", pr_titol: "¿Te falta algún dato?", pr_lead: "Dinos qué dato te gustaría encontrar aquí, de qué municipio o tema, y de dónde podría sacarse si lo sabes. Leemos todas las propuestas.",
    pr_dada: "Qué dato te falta", pr_dada_ph: "Por ejemplo: precio del alquiler por barrios de Figueres", pr_lloc: "Municipio o tema", pr_lloc_ph: "Opcional", pr_font: "Fuente, si la conoces", pr_font_ph: "Opcional: organismo o enlace",
    pr_email: "Tu correo", pr_email_ph: "Opcional, solo si quieres respuesta", pr_envia: "Enviar la propuesta", pr_assumpte: "Propuesta de dato · Girona en xifres",
    pr_avis: "El mensaje se envía por correo a la redacción a través de FormSubmit. Detalles en ", pr_avis_l: "Privacidad",
    pr_enviant: "Enviando…", pr_ok: "<b>Gracias.</b> Hemos recibido la propuesta.", pr_error: (u, c) => `No se ha podido enviar. <a href="${u}">Envíala por correo</a> a ${c}.`,
    pr_fitxa: (n) => `¿Te falta algún dato de ${n}? Háznoslo saber`,
    k_lloguer: "Alquiler medio",
    k_hab: "Habitantes", n_hab: (v) => `${v} nacidos en el extranjero`, k_atur: "Paro (EPA)", n_atur: (p, e) => `${p} · España, ${e}`,
    k_ipc: "Inflación", n_ipc: (p, e) => `interanual, ${p} · España, ${e}`, k_tur: "Noches de hotel", n_tur: (v) => `${v} de turistas extranjeros`,
    mesos_curt: ["ene.", "feb.", "mar.", "abr.", "may.", "jun.", "jul.", "ago.", "sep.", "oct.", "nov.", "dic."],
    k_compra: "Compraventas",
    k_renda: "Renta neta por persona",
    k_esforc: "Esfuerzo del alquiler",
    k_hut: "Viviendas de uso turístico",
    k_antics: "Viviendas anteriores a 1980",
    k_pob: "Población",
    n_vs: (a) => `respecto a ${a}`,
    n_esforc: "de lo que ingresa un hogar medio",
    n_hut: (x) => `${x} por cada 100 viviendas`,
    n_antics: "según el Catastro",
    n_estacional: (x) => `${x} de población estacional (ETCA)`,
    c_municipi: "Municipio", c_comarca: "Comarca", c_pob: "Población",
    c_lloguer: "Alquiler 2025 (€/mes)", c_var5: "Alquiler, variación en 5 años",
    c_renda: "Renta por persona 2024 (€)", c_esforc: "Esfuerzo alquiler (% renta hogar)",
    c_compra: "Compraventas 2025", c_hut: "VUT por 100 viviendas",
    municipi: "Municipio", provincia: "Provincia",
    tanca: "Cerrar",
    sense: "Sin datos: el municipio tiene demasiado pocos contratos u operaciones para publicarlas.",
    sub: (c, p) => `${c} · ${p} habitantes`,
  },
};

let LANG = "ca";
try {
  const q = new URLSearchParams(location.search).get("lang");
  const guardat = localStorage.getItem("lang");
  LANG = ["ca", "es"].includes(q) ? q : ["ca", "es"].includes(guardat) ? guardat : ((navigator.language || "").startsWith("es") ? "es" : "ca");
} catch (e) { /* sin almacenamiento */ }
const t = (k, ...a) => { const v = T[LANG][k]; return typeof v === "function" ? v(...a) : v; };

// ---------- Bloques políticos ----------
const BLOC_COLOR = { Junts: "#23a99c", "JxSí": "#1f6f8b", ERC: "#ef8f2a", PSC: "#d2453a", CUP: "#e9cf3a", PP: "#2f6fc0", Vox: "#62a43c", Cs: "#c2577f", "Aliança": "#3b4a63", Comuns: "#8a4fa8", Locals: "#a5abb5", Altres: "#d3d6db", UCD: "#3d8b4f", FEsq: "#9b2335", Lliga: "#1d3f6e", Dretes: "#6d6a8f", Centre: "#b8a36a" };
const colorBloc = (b) => BLOC_COLOR[b] || BLOC_COLOR.Locals;
const nomBloc = (b) => (b === "Locals" ? t("locals") : b === "Aliança" ? "Aliança Catalana" : b === "JxSí" ? "Junts pel Sí" : b === "Cs" ? (LANG === "es" ? "Ciudadanos" : "Ciutadans") : b === "Altres" ? (LANG === "es" ? "Otros" : "Altres") : b === "FEsq" ? "Front d'Esquerres" : b === "Lliga" ? "Lliga Catalana" : b === "Dretes" ? (LANG === "es" ? "Derechas" : "Dretes") : b === "Centre" ? (LANG === "es" ? "Centro" : "Centre") : b);

// ---------- Países (nacionalidades) ----------
const PAIS_COLORS = ["#106b66", "#e3001b", "#2f6fc0", "#ef8f2a", "#8a4fa8", "#62a43c", "#c2577f", "#8c6d3f", "#3b4a63", "#e9cf3a"];
const nomPais = (c) => { const p = D && D.paisos && D.paisos[c]; return p ? p[LANG === "ca" ? 0 : 1] : c === "ALTRES" ? t("altres_paisos") : c; };
const colorPais = (c) => { const i = D && D.paisos_ordre ? D.paisos_ordre.indexOf(c) : -1; return i >= 0 && i < PAIS_COLORS.length ? PAIS_COLORS[i] : "#a5abb5"; };

function blocNacionalitats(m) {
  const n = m.nac;
  if (!n || !n.p || !n.p.length) return "";
  const mx = n.p[0][1];
  const files = n.p.map(([c, k]) => `<li><span class="nb-nom">${nomPais(c)}</span><span class="nb-barra"><b style="width:${(k / mx) * 100}%"></b></span><span class="nb-v">${fmt(k)}<small>${pct((100 * k) / n.ex, 0)}</small></span></li>`).join("");
  const resta = n.ex - n.p.reduce((s, x) => s + x[1], 0);
  return `<section class="fitxa-bloc fx-nac"><h3>${t("h_nac")}</h3><p class="fb-sub">${t("h_nac_sub", n.any, fmt(n.ex), pct(m.poblacion ? (100 * n.ex) / m.poblacion : null, 1))}</p>
    <ol class="nb">${files}${resta > 0 ? `<li class="nb-resta"><span class="nb-nom">${t("altres_paisos")}</span><span class="nb-barra"></span><span class="nb-v">${fmt(resta)}<small>${pct((100 * resta) / n.ex, 0)}</small></span></li>` : ""}</ol>
    <p class="fb-font">${t("font_c")}: ${t(n.font === "ine" ? "f_nac_ine" : "f_nac")}</p></section>`;
}

function blocUniversitaris(m) {
  const u = m.x && m.x.univ_split;
  if (!u) return "";
  const tot = u[0] + u[1] + u[2] || 1, noms = ["u_mateix", "u_comarca", "u_fora"];
  return `<section class="fitxa-bloc fx-univ"><h3>${t("h_univ")}</h3><p class="fb-sub">${t("h_univ_sub", fmt(m.x.univ_n), (D.anys && D.anys.edu_univ_fora) ? `${D.anys.edu_univ_fora}/${String(D.anys.edu_univ_fora + 1).slice(2)}` : "")}</p>
    <div class="ub">${u.map((v, i) => (v ? `<b class="ub-${i}" style="width:${(100 * v) / tot}%"></b>` : "")).join("")}</div>
    <ul class="ub-lleg">${u.map((v, i) => `<li><i class="ub-${i}"></i>${t(noms[i])}<span>${fmt(v)} · ${pct((100 * v) / tot, 0)}</span></li>`).join("")}</ul>
    <p class="fb-font">${t("font_c")}: ${t("f_univ")}</p></section>`;
}

// ---------- Formato ----------
const loc = () => (LANG === "ca" ? "ca-ES" : "es-ES");
const fmt = (v, d = 0) => (v == null || isNaN(v) ? "–" : v.toLocaleString(loc(), { maximumFractionDigits: d, minimumFractionDigits: d }));
const pct = (v, d = 1, signe = false) => (v == null || isNaN(v) ? "–" : (signe && v > 0 ? "+" : "") + fmt(v, d) + " %");
const ultim = (o) => { const k = Object.keys(o || {}).sort(); return k.length ? [k[k.length - 1], o[k[k.length - 1]]] : [null, null]; };
const val = (o, a) => (o && o[a] != null ? o[a] : null);
// Etiqueta de un periodo: "2026-10" -> "oct. 2026", "2026T2" -> "2T 2026"
const etPer = (e) => { const m = /^(\d{4})-(\d{2})$/.exec(e); if (m) return `${t("mesos_curt")[+m[2] - 1]} ${m[1]}`; const q = /^(\d{4})T(\d)$/.exec(e); return q ? `${q[2]}T ${q[1]}` : e; };

// ---------- Estado ----------
let D = null;
let orden = { col: "pob", dir: -1 };
let seleccionat = null;

const COLS = [
  { id: "nom", t: "c_municipi", v: (m) => m.nom, txt: true },
  { id: "comarca", t: "c_comarca", v: (m) => m.comarca, txt: true },
  { id: "pob", t: "c_pob", v: (m) => m.poblacion, f: (v) => fmt(v), barra: true },
  { id: "lloguer", t: "c_lloguer", v: (m) => val(m.alquiler, "2025"), f: (v) => fmt(v), barra: true },
  { id: "var5", t: "c_var5", v: (m) => { const a = val(m.alquiler, "2025"), b = val(m.alquiler, "2020"); return a && b ? (a / b - 1) * 100 : null; }, f: (v) => pct(v, 0, true) },
  { id: "renda", t: "c_renda", v: (m) => val(m.renta_persona, "2024"), f: (v) => fmt(v), barra: true },
  { id: "esforc", t: "c_esforc", v: (m) => esforc(m), f: (v) => pct(v, 0) },
  { id: "compra", t: "c_compra", v: (m) => val(m.compraventas, "2025"), f: (v) => fmt(v) },
  { id: "hut", t: "c_hut", v: (m) => (m.viviendas ? (m.hut / m.viviendas) * 100 : null), f: (v) => fmt(v, 1), barra: true },
];

function esforc(m) {
  const ll = val(m.alquiler, "2024"), rh = val(m.renta_hogar, "2024");
  return ll && rh ? (ll * 12 / rh) * 100 : null;
}

// ---------- Textos estáticos ----------
function aplicaIdioma() {
  document.documentElement.lang = LANG;
  document.title = t("marca");
  document.querySelectorAll("[data-t]").forEach((el) => { el.textContent = t(el.dataset.t); });
  document.querySelectorAll("[data-tp]").forEach((el) => { el.placeholder = t(el.dataset.tp); });
  document.querySelectorAll("[data-ta]").forEach((el) => { el.setAttribute("aria-label", t(el.dataset.ta)); });
  document.querySelectorAll(".idiomes button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.lang === LANG)));
  const llic = document.getElementById("l-llic");
  if (llic) llic.href = `qui-som.html#${LANG}-llic`;
  document.querySelectorAll("a[data-t=pr_avis_l]").forEach((a) => { a.href = `privacitat.html#${LANG}-contacte`; });
  document.querySelectorAll("a[data-t=ref_pagines]").forEach((a) => { a.href = `${LANG}/`; a.hreflang = LANG; });
}

// ---------- Tooltip ----------
const tip = document.getElementById("tip");
function mostraTip(html, x, y) {
  tip.innerHTML = html; tip.hidden = false;
  const r = tip.getBoundingClientRect();
  let left = x + 14, top = y - r.height - 10;
  if (left + r.width > innerWidth - 8) left = x - r.width - 14;
  if (top < 8) top = y + 16;
  tip.style.left = left + "px"; tip.style.top = top + "px";
}
const amagaTip = () => { tip.hidden = true; };

// ---------- Gráficos SVG ----------
const NS = "http://www.w3.org/2000/svg";
function el(tag, attrs = {}, pare) {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  if (pare) pare.appendChild(e);
  return e;
}
function escala(d0, d1, r0, r1) { return (v) => r0 + ((v - d0) / (d1 - d0 || 1)) * (r1 - r0); }
function niceMax(v) {
  if (v <= 0) return 1;
  const p = Math.pow(10, Math.floor(Math.log10(v))), n = v / p;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * p;
}

function divisions(max) {
  const lead = max / Math.pow(10, Math.floor(Math.log10(max)));
  return lead === 2.5 || lead === 5 ? 5 : 4;
}

/** Línea: series = [{nom, color, dades:{any:valor}}] */
function grafLinia(cont, series, f = (v) => fmt(v)) {
  cont.innerHTML = "";
  const W = Math.max(300, Math.min(720, cont.clientWidth || 560)), H = W < 440 ? 220 : 260, m = { t: 24, r: 16, b: 28, l: 52 };
  const anys = [...new Set(series.flatMap((s) => Object.keys(s.dades)))].map(Number).sort((a, b) => a - b);
  if (!anys.length) { cont.textContent = t("sense"); return; }
  const max = niceMax(Math.max(...series.flatMap((s) => Object.values(s.dades))));
  m.l = Math.max(m.l, 14 + 8 * fmt(max).length);
  const x = escala(anys[0], anys[anys.length - 1], m.l, W - m.r);
  const y = escala(0, max, H - m.b, m.t);
  const svg = el("svg", { viewBox: `0 0 ${W} ${H}`, role: "img" }, cont);
  const g = el("g", { class: "graella" }, svg);
  const ax = el("g", { class: "eix" }, svg);
  const div = divisions(max);
  for (let i = 0; i <= div; i++) {
    const v = (max / div) * i, yy = y(v);
    if (i) el("line", { x1: m.l, x2: W - m.r, y1: yy, y2: yy }, g);
    el("text", { x: m.l - 8, y: yy + 4, "text-anchor": "end" }, ax).textContent = fmt(v, max < 5 && (max / div) % 1 ? 2 : 0);
  }
  el("line", { class: "base", x1: m.l, x2: W - m.r, y1: H - m.b, y2: H - m.b }, svg);
  const pas = Math.ceil(anys.length / (W < 440 ? 4 : 7));
  anys.forEach((a, i) => { if (i % pas === 0 || (i === anys.length - 1 && (anys.length - 1) % pas >= pas / 2)) el("text", { x: x(a), y: H - 8, "text-anchor": "middle" }, ax).textContent = a; });
  series.forEach((s) => {
    const pts = anys.filter((a) => s.dades[a] != null).map((a) => `${x(a)},${y(s.dades[a])}`);
    el("polyline", { points: pts.join(" "), fill: "none", stroke: s.color, "stroke-width": 2.25, "stroke-linejoin": "round", "stroke-linecap": "round" }, svg);
  });
  // Etiqueta directa del último valor de cada serie
  series.forEach((s) => {
    const [a, v] = ultim(s.dades); if (a == null) return;
    el("circle", { cx: x(+a), cy: y(v), r: 4, fill: s.color, stroke: "var(--fons)", "stroke-width": 2 }, svg);
  });
  if (series.length === 1) {
    const [a, v] = ultim(series[0].dades);
    if (a != null) el("text", { class: "etq-final", x: x(+a) - 8, y: y(v) - 12, "text-anchor": "end", fill: series[0].color }, svg).textContent = f(v);
  }
  // Capa de hover
  const guia = el("line", { y1: m.t, y2: H - m.b, stroke: "var(--text-3)", "stroke-dasharray": "3 3", visibility: "hidden" }, svg);
  const punts = series.map((s) => el("circle", { r: 4, fill: s.color, stroke: "var(--fons)", "stroke-width": 2, visibility: "hidden" }, svg));
  const zona = el("rect", { x: m.l, y: m.t, width: W - m.l - m.r, height: H - m.t - m.b, fill: "transparent" }, svg);
  const mou = (ev) => {
    const r = svg.getBoundingClientRect();
    const px = ((ev.clientX - r.left) / r.width) * W;
    const a = anys.reduce((b, c) => (Math.abs(x(c) - px) < Math.abs(x(b) - px) ? c : b));
    guia.setAttribute("x1", x(a)); guia.setAttribute("x2", x(a)); guia.setAttribute("visibility", "visible");
    let html = `<b>${a}</b>`;
    series.forEach((s, i) => {
      const v = s.dades[a];
      if (v != null) { punts[i].setAttribute("cx", x(a)); punts[i].setAttribute("cy", y(v)); punts[i].setAttribute("visibility", "visible"); }
      else punts[i].setAttribute("visibility", "hidden");
      html += `<br>${s.nom}: ${f(v)}`;
    });
    mostraTip(html, ev.clientX, ev.clientY);
  };
  zona.addEventListener("pointermove", mou);
  zona.addEventListener("pointerleave", () => { amagaTip(); guia.setAttribute("visibility", "hidden"); punts.forEach((p) => p.setAttribute("visibility", "hidden")); });
  if (series.length > 1) {
    const ll = document.createElement("div"); ll.className = "llegenda";
    ll.innerHTML = series.map((s) => `<span><i style="background:${s.color}"></i>${s.nom}</span>`).join("");
    cont.appendChild(ll);
  }
}

/** Barras verticales: dades = {any: valor} */
function grafBarres(cont, dades, f = (v) => fmt(v)) {
  cont.innerHTML = "";
  const anys = Object.keys(dades).map(Number).sort((a, b) => a - b);
  if (!anys.length) { cont.textContent = t("sense"); return; }
  const W = Math.max(300, Math.min(720, cont.clientWidth || 560)), H = W < 440 ? 220 : 260, m = { t: 12, r: 8, b: 28, l: 52 };
  const max = niceMax(Math.max(...Object.values(dades)));
  const banda = (W - m.l - m.r) / anys.length, amp = Math.max(2, banda - 2);
  const y = escala(0, max, H - m.b, m.t);
  const svg = el("svg", { viewBox: `0 0 ${W} ${H}`, role: "img" }, cont);
  const g = el("g", { class: "graella" }, svg), ax = el("g", { class: "eix" }, svg);
  const div = divisions(max);
  for (let i = 0; i <= div; i++) {
    const v = (max / div) * i, yy = y(v);
    if (i) el("line", { x1: m.l, x2: W - m.r, y1: yy, y2: yy }, g);
    el("text", { x: m.l - 8, y: yy + 4, "text-anchor": "end" }, ax).textContent = fmt(v);
  }
  const pas = Math.ceil(anys.length / (W < 440 ? 4 : 7));
  const etiqueta = (i) => i % pas === 0 || (i === anys.length - 1 && (anys.length - 1) % pas >= pas / 2);
  anys.forEach((a, i) => {
    const v = dades[a], x0 = m.l + i * banda + 1, yy = y(v), h = H - m.b - yy;
    const rad = Math.min(4, amp / 2, h);
    // Barra con esquinas superiores redondeadas, anclada a la base
    el("path", { d: `M${x0},${H - m.b}V${yy + rad}Q${x0},${yy} ${x0 + rad},${yy}H${x0 + amp - rad}Q${x0 + amp},${yy} ${x0 + amp},${yy + rad}V${H - m.b}Z`, fill: "var(--barra)" }, svg);
    if (etiqueta(i)) el("text", { x: x0 + amp / 2, y: H - 8, "text-anchor": "middle" }, ax).textContent = a;
    const hit = el("rect", { x: m.l + i * banda, y: m.t, width: banda, height: H - m.t - m.b, fill: "transparent" }, svg);
    hit.addEventListener("pointermove", (ev) => mostraTip(`<b>${a}</b><br>${f(v)}`, ev.clientX, ev.clientY));
    hit.addEventListener("pointerleave", amagaTip);
  });
  el("line", { class: "base", x1: m.l, x2: W - m.r, y1: H - m.b, y2: H - m.b }, svg);
}

// ---------- Cifras ----------
function tile(etiqueta, valor, nota = "") {
  return `<div class="xifra"><p class="etiqueta">${etiqueta}</p><p class="valor">${valor}</p>${nota ? `<p class="nota">${nota}</p>` : ""}</div>`;
}
function variacio(o, a, b, colorea = false) {
  const va = val(o, a), vb = val(o, b);
  if (va == null || vb == null) return "";
  const v = (va / vb - 1) * 100;
  const cls = colorea ? (v > 0 ? "puja" : "baixa") : "";
  return `<span class="${cls}">${pct(v, 1, true)}</span> ${t("n_vs", b)}`;
}

function pintaProvincia() {
  const p = D.provincia, P = D.prov || {};
  const ll = val(p.alquiler, "2025");
  const ultim = (sp, k) => { const s = sp && sp.series && sp.series[k]; return s && s.length ? s[s.length - 1] : null; };
  const periode = (e) => { const m = /^(\d{4})-(\d{2})$/.exec(e); if (m) return `${t("mesos_curt")[+m[2] - 1]} ${m[1]}`; const q = /^(\d{4})T(\d)$/.exec(e); return q ? `${q[2]}T ${q[1]}` : e; };
  // % de nacidos en el extranjero, ponderado por población
  let se = 0, sn = 0; D.municipios.forEach((m) => { const v = m.x && m.x.nascuts_estr; if (v != null && m.poblacion) { se += v * m.poblacion; sn += m.poblacion; } });
  const aG = ultim(P.paro, "gi"), aE = ultim(P.paro, "esp"), iG = ultim(P.ipc, "gi"), iE = ultim(P.ipc, "esp"), tE = ultim(P.turisme, "gi");
  const tiles = [
    tile(t("k_hab"), fmt(p.poblacion), sn ? t("n_hab", pct(se / sn, 0)) : ""),
    aG ? tile(t("k_atur"), pct(aG[2], 1), t("n_atur", periode(aG[1]), pct(aE && aE[2], 1))) : "",
    tile(`${t("k_renda")} 2024`, `${fmt(val(p.renta_persona, "2024"))} <small>€</small>`, variacio(p.renta_persona, "2024", "2023")),
    iG ? tile(t("k_ipc"), pct(iG[2], 1, true), t("n_ipc", periode(iG[1]), pct(iE && iE[2], 1, true))) : "",
    tile(`${t("k_lloguer")} 2025`, `${fmt(ll)} <small>€/mes</small>`, variacio(p.alquiler, "2025", "2024", true)),
    P.pernoct_total ? tile(`${t("k_tur")} ${P.pernoct_total.any}`, `${fmt(P.pernoct_total.v / 1e6, 1)} <small>M</small>`, tE ? t("n_tur", pct(tE[2], 0)) : "") : "",
  ];
  document.getElementById("xifres").innerHTML = tiles.join("");
}

function mitjanaRendaLlar() {
  // Renta media por hogar de la provincia, ponderada por población (2024)
  let s = 0, n = 0;
  D.municipios.forEach((m) => { const v = val(m.renta_hogar, "2024"); if (v && m.poblacion) { s += v * m.poblacion; n += m.poblacion; } });
  return n ? s / n : null;
}

// ---------- Tabla ----------
function pintaTaula() {
  const cap = document.querySelector("#taula thead tr");
  cap.innerHTML = COLS.map((c) => `<th scope="col" data-col="${c.id}" data-c="${c.id}" tabindex="0" aria-sort="${orden.col === c.id ? (orden.dir > 0 ? "ascending" : "descending") : "none"}">${t(c.t)}</th>`).join("");
  cap.querySelectorAll("th").forEach((th) => {
    const canvia = () => {
      const c = th.dataset.col;
      orden = orden.col === c ? { col: c, dir: -orden.dir } : { col: c, dir: COLS.find((x) => x.id === c).txt ? 1 : -1 };
      pintaTaula();
    };
    th.addEventListener("click", canvia);
    th.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); canvia(); } });
  });
  const q = (document.getElementById("cerca").value || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  const norm = (s) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  const col = COLS.find((c) => c.id === orden.col);
  const files = D.municipios.filter((m) => !q || norm(m.nom).includes(q) || norm(m.comarca).includes(q));
  files.sort((a, b) => {
    const va = col.v(a), vb = col.v(b);
    if (va == null) return 1; if (vb == null) return -1;
    return (col.txt ? String(va).localeCompare(String(vb), loc()) : va - vb) * orden.dir;
  });
  const maxs = {};
  COLS.filter((c) => c.barra).forEach((c) => { maxs[c.id] = Math.max(...D.municipios.map((m) => c.v(m) || 0)); });
  document.querySelector("#taula tbody").innerHTML = files.map((m) => {
    const cel = COLS.map((c) => {
      const v = c.v(m);
      if (c.txt) return `<td data-c="${c.id}" class="${c.id === "nom" ? "nom" : "com"}">${v}</td>`;
      if (v == null) return `<td data-c="${c.id}" class="buit">–</td>`;
      const b = c.barra ? `<span class="barra" style="width:${Math.max(2, (v / maxs[c.id]) * 48)}px"></span>` : "";
      return `<td data-c="${c.id}">${b}${c.f(v)}</td>`;
    }).join("");
    return `<tr tabindex="0" data-ine="${m.ine}">${cel}</tr>`;
  }).join("");
  document.getElementById("comptador").textContent = t("comptador", files.length, D.municipios.length);
  document.querySelectorAll("#taula tbody tr").forEach((tr) => {
    const obre = () => obreFitxa(tr.dataset.ine, true);
    tr.addEventListener("click", obre);
    tr.addEventListener("keydown", (e) => { if (e.key === "Enter") obre(); });
  });
}

// ---------- Ficha ----------
function obreFitxa(ine, desplaca) {
  const m = D.municipios.find((x) => x.ine === ine);
  if (!m) return;
  seleccionat = ine;
  if (!window.EMB) try { history.replaceState(history.state, "", `#${ine}`); } catch (e) { /* */ }
  const f = document.getElementById("fitxa");
  const [aR, vR] = ultim(m.renta_persona);
  const esf = esforc(m);
  const [aG, vG] = ultim(m.gini);
  f.hidden = false;
  f.innerHTML = `
    <div class="fitxa-cap">
      <div>
        <p class="sobre">${t("municipi")}</p>
        <h2>${m.nom}</h2>
        <p class="sub">${t("sub", m.comarca, fmt(m.poblacion))}</p>
        <div class="accions"><button type="button" class="a-seccions">${t("veure_seccions")}</button></div>
      </div>
      <button type="button" class="tanca">${t("tanca")} ✕</button>
    </div>
    <div class="fitxa-resum"></div>
    <div class="xifres">
      ${tile(`${t("k_lloguer")} 2025`, val(m.alquiler, "2025") ? `${fmt(val(m.alquiler, "2025"))} <small>€/mes</small>` : "–", variacio(m.alquiler, "2025", "2024", true))}
      ${tile(`${t("k_compra")} 2025`, fmt(val(m.compraventas, "2025")), variacio(m.compraventas, "2025", "2024"))}
      ${tile(`${t("k_renda")} ${aR || ""}`, vR ? `${fmt(vR)} <small>€</small>` : "–", aG ? `Gini ${fmt(vG, 1)}` : "")}
      ${tile(`${t("k_esforc")} 2024`, pct(esf, 0), esf ? t("n_esforc") : "")}
      ${tile(t("k_hut"), fmt(m.hut), m.viviendas ? t("n_hut", fmt((m.hut / m.viviendas) * 100, 1)) : "")}
      ${tile(t("k_antics"), m.viviendas ? pct((m.viv_antes_1980 / m.viviendas) * 100, 0) : "–", m.poblacion_etca ? t("n_estacional", fmt(m.poblacion_etca)) : t("n_antics"))}
    </div>
    <div class="dos">
      <figure class="grafic"><figcaption><span>${t("g_lloguer")}</span><span class="unitat">€/mes</span></figcaption><div class="g-ll"></div></figure>
      <figure class="grafic"><figcaption><span>${t("g_renda")}</span><span class="unitat">${t("u_euros_any")}</span></figcaption><div class="g-re"></div></figure>
      <figure class="grafic"><figcaption><span>${t("g_compra")}</span><span class="unitat">${t("u_operacions")}</span></figcaption><div class="g-cv"></div></figure>
    </div>
    <div class="fitxa-conj"></div>
    <div class="fitxa-blocs">${blocNacionalitats(m)}${blocUniversitaris(m)}</div>
    <div class="fitxa-extra"></div>
    <div class="fitxa-tur"></div>
    <div class="fitxa-hab"></div>
    <div class="fitxa-mob"></div>
    <div class="fitxa-cad"></div>
    <div class="fitxa-trib"></div>
    <div class="fitxa-sol"></div>
    <div class="fitxa-ind"></div>
    ${ajuntament(m)}
    <div class="fitxa-proposa"></div>`;
  f.querySelector(".a-seccions").addEventListener("click", () => { if (window.mapaMunicipi) window.mapaMunicipi(m.ine); });
  f.querySelector(".tanca").addEventListener("click", () => { f.hidden = true; seleccionat = null; try { history.replaceState(history.state, "", location.pathname + location.search); } catch (e) { /* */ } });
  grafLinia(f.querySelector(".g-ll"), [
    { nom: m.nom, color: "var(--serie-1)", dades: m.alquiler },
    { nom: t("provincia"), color: "var(--serie-2)", dades: D.provincia.alquiler },
  ], (v) => `${fmt(v)} €`);
  grafLinia(f.querySelector(".g-re"), [
    { nom: m.nom, color: "var(--serie-1)", dades: m.renta_persona },
    { nom: t("provincia"), color: "var(--serie-2)", dades: D.provincia.renta_persona },
  ], (v) => `${fmt(v)} €`);
  grafBarres(f.querySelector(".g-cv"), m.compraventas);
  if (window.fitxaConjuntura) window.fitxaConjuntura(f.querySelector(".fitxa-conj"), m);
  if (window.fitxaResum) window.fitxaResum(f.querySelector(".fitxa-resum"), f.querySelector(".fitxa-extra"), m);
  if (window.fitxaHabitatge) window.fitxaHabitatge(f.querySelector(".fitxa-hab"), m);
  if (window.fitxaCadastre) window.fitxaCadastre(f.querySelector(".fitxa-cad"), m);
  if (window.fitxaTributs) window.fitxaTributs(f.querySelector(".fitxa-trib"), m);
  if (window.fitxaTurisme) window.fitxaTurisme(f.querySelector(".fitxa-tur"), m);
  if (window.fitxaMobilitat) window.fitxaMobilitat(f.querySelector(".fitxa-mob"), m);
  fitxaSolar(f.querySelector(".fitxa-sol"), m);
  if (window.fitxaProposa) window.fitxaProposa(f.querySelector(".fitxa-proposa"), m);
  if (window.fitxaIndicadors) window.fitxaIndicadors(m).then((html) => { if (seleccionat === m.ine) f.querySelector(".fitxa-ind").innerHTML = html; });
  if (desplaca) f.scrollIntoView({ behavior: "smooth", block: "start" });
}

// ---------- Plaques solars d'autoconsum (RAC) ----------
function fitxaSolar(cont, m) {
  const a = D.anys && D.anys.sol, s = m.sol;
  if (!cont || !a || !s || !s.n) { if (cont) cont.innerHTML = ""; return; }
  const v = (k) => (s[k] && s[k][a] != null ? s[k][a] : null);
  const ref = (k, z) => { const r = D.sol_ref && D.sol_ref[k] && D.sol_ref[k][a]; return r ? r[z] : null; };
  const serie = (k, z) => { const o = {}; Object.entries((D.sol_ref && D.sol_ref[k]) || {}).forEach(([y, r]) => { if (r[z] != null) o[y] = r[z]; }); return o; };
  const nn = s.nn || {}, max = Object.entries(nn).sort((x, y) => y[1] - x[1])[0];
  cont.innerHTML = `<section class="tb"><h3 class="ajt-tit">${t("sol_tit")}</h3>
    <p class="tb-sub">${t("sol_sub", fmt(v("n")), fmt(v("kw")), a, max && max[1] ? max[0] : null)}</p>
    <div class="xifres">
      ${tile(t("sol_k_h"), fmt(v("h"), 1), t("sol_ref", fmt(ref("h", "gi"), 1), fmt(ref("h", "cat"), 1)))}
      ${tile(t("sol_k_w"), v("w") != null ? `${fmt(v("w"))} <small>W</small>` : "–", t("sol_ref", fmt(ref("w", "gi")), fmt(ref("w", "cat"))))}
      ${tile(t("sol_k_viv"), fmt(v("viv"), 1), t("sol_n_viv"))}
    </div>
    <div class="dos">
      <figure class="grafic"><figcaption><span>${t("sol_g_nn")}</span><span class="unitat">${t("u_install")}</span></figcaption><div class="g-solnn"></div></figure>
      <figure class="grafic"><figcaption><span>${t("sol_g_w")}</span><span class="unitat">W</span></figcaption><div class="g-solw"></div></figure>
    </div>
    <p class="fb-font">${t("sol_font", D.sol_mes ? D.sol_mes.split("-").reverse().join("/") : a)}</p></section>`;
  grafBarres(cont.querySelector(".g-solnn"), Object.fromEntries(Object.entries(nn).filter(([y]) => +y >= 2019)));
  grafLinia(cont.querySelector(".g-solw"), [
    { nom: m.nom, color: "var(--serie-1)", dades: Object.fromEntries(Object.entries(s.w || {}).filter(([y]) => +y >= 2019)) },
    { nom: t("provincia"), color: "var(--serie-2)", dades: Object.fromEntries(Object.entries(serie("w", "gi")).filter(([y]) => +y >= 2019)) },
    { nom: "Catalunya", color: "var(--text-3)", dades: Object.fromEntries(Object.entries(serie("w", "cat")).filter(([y]) => +y >= 2019)) },
  ], (x) => `${fmt(x)} W`);
}

// ---------- Ayuntamiento: alcaldía, resultados y pleno ----------
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
function ajuntament(m) {
  const p = m.pol || {};
  if (!p.alcalde && !p.ple && !p.eleccions) return "";
  const al = p.alcalde;
  const e = p.eleccions;
  const max = e && e.resultats.length ? Math.max(...e.resultats.map((r) => r.pct || 0)) : 1;
  const res = e ? `<figure class="grafic resultats"><figcaption><span>${t("resultats", e.any)}</span>${e.participacio != null ? `<span class="unitat">${t("participacio", pct(e.participacio, 1))}</span>` : ""}</figcaption>
    <ol class="vots">${e.resultats.map((r) => `<li><span class="sigla"><i style="background:${colorBloc(r.b)}"></i>${esc(r.s)}</span>
      <span class="vbarra"><b style="width:${((r.pct || 0) / max) * 100}%;background:${colorBloc(r.b)}"></b></span>
      <span class="vpct">${pct(r.pct, 1)}</span><span class="vreg">${t("regidors", r.reg)}</span></li>`).join("")}</ol></figure>` : "";
  // Pleno agrupado por candidatura, en el orden de los resultados
  const grups = {};
  (p.ple || []).forEach((x) => { (grups[x.partit] = grups[x.partit] || []).push(x); });
  const ordre = Object.keys(grups).sort((a, b) => grups[b].length - grups[a].length);
  const ple = p.ple ? `<figure class="grafic ple"><figcaption><span>${t("ple")}</span><span class="unitat">${t("regidors", p.ple.length)}</span></figcaption>
    <div class="escons">${p.ple.slice().sort((a, b) => ordre.indexOf(a.partit) - ordre.indexOf(b.partit)).map((x) => `<i title="${esc(x.nom)} · ${esc(x.partit)}" style="background:${colorBloc(blocDe(x.partit, e))}"></i>`).join("")}</div>
    <div class="grups">${ordre.map((g) => `<div class="grup-ple"><p class="gnom"><i style="background:${colorBloc(blocDe(g, e))}"></i>${esc(g)} <span>${grups[g].length}</span></p>
      <ul>${grups[g].map((x) => `<li${/alcald/i.test(x.carrec) ? ' class="alc"' : ""}>${esc(x.nom)}${/regidor/i.test(x.carrec) ? "" : ` <span>${esc(x.carrec)}</span>`}</li>`).join("")}</ul></div>`).join("")}</div></figure>` : "";
  return `<div class="ajt"><h3 class="ajt-tit">${t("h_ajt")}</h3>
    ${al ? `<div class="alcalde"><i class="punt-bloc" style="background:${colorBloc(al.bloc)}"></i><div><p class="etiqueta">${esc(al.carrec || t("alcalde"))}</p><p class="anom">${esc(al.nom)}</p><p class="apartit">${esc(al.partit)} · ${nomBloc(al.bloc)}</p></div></div>` : ""}
    <div class="dos">${res}${ple}</div></div>`;
}
// Bloque de unas siglas a partir de los resultados (si aparecen) o del propio texto
function blocDe(sigles, e) {
  const r = e && e.resultats.find((x) => x.s.replace(/\s/g, "") === String(sigles).replace(/\s/g, ""));
  if (r) return r.b;
  const toks = new Set(String(sigles).toUpperCase().match(/[A-ZÀ-Ü]+/g) || []);
  const B = [["Junts", ["CM", "JUNTS", "JXF", "JXCAT", "CIU"]], ["ERC", ["ERC", "AM"]], ["PSC", ["PSC", "CP"]], ["CUP", ["CUP", "AMUNT"]], ["Vox", ["VOX"]], ["PP", ["PP"]], ["Aliança", ["ALIANÇA"]]];
  for (const [b, ks] of B) if (ks.some((k) => toks.has(k))) return b;
  return "Locals";
}

// ---------- Fecha de descarga de cada fuente (data/estado.json) ----------
function pintaFonts() {
  const F = D.fonts || {};
  document.querySelectorAll(".fonts li[data-font]").forEach((li) => {
    const f = F[li.dataset.font];
    let el = li.querySelector(".font-act");
    if (!f || !f.ok) { if (el) el.remove(); return; }
    if (!el) { el = document.createElement("span"); el.className = "font-act"; li.appendChild(el); }
    const dia = new Date(f.ok).toLocaleDateString(loc(), { day: "numeric", month: "short", year: "numeric" });
    const avis = f.estat !== "ok" && f.estat !== "manual";
    el.classList.toggle("avis", avis);
    el.textContent = f.estat === "manual" ? `${t("font_manual")}: ${dia}` : `${t(avis ? "font_avis" : "font_act")}: ${dia}`;
    if (avis) el.title = t("font_avis_t"); else el.removeAttribute("title");
  });
}

// ---------- Inicio ----------
function pintaTot() {
  aplicaIdioma();
  pintaProvincia();
  if (window.pintaConjuntura) window.pintaConjuntura();
  if (window.pintaSeccioProv) { window.pintaSeccioProv(); window.pintaSeccioSalut(); if (window.pintaSeccioTurisme) window.pintaSeccioTurisme(); }
  if (window.pintaSeccioMobilitat) window.pintaSeccioMobilitat();
  if (window.pintaSeccioExportacions) window.pintaSeccioExportacions();
  if (window.pintaSeccioDemografia) window.pintaSeccioDemografia();
  pintaTaula();
  const dg = new Date(D.generado).toLocaleDateString(loc(), { day: "numeric", month: "long", year: "numeric" });
  document.querySelectorAll(".data-gen").forEach((e) => { e.textContent = dg; });
  pintaFonts();
  if (seleccionat) obreFitxa(seleccionat, false);
  if (window.mapaIdioma) window.mapaIdioma();
}

document.querySelectorAll(".idiomes button").forEach((b) => b.addEventListener("click", () => {
  LANG = b.dataset.lang;
  try { localStorage.setItem("lang", LANG); } catch (e) { /* */ }
  pintaTot();
}));
document.getElementById("cerca").addEventListener("input", () => pintaTaula());
let ampleAnterior = innerWidth;
addEventListener("resize", () => {
  if (!D || Math.abs(innerWidth - ampleAnterior) < 40) return;
  ampleAnterior = innerWidth;
  pintaProvincia();
  if (window.pintaConjuntura) window.pintaConjuntura();
  if (window.pintaSeccioProv) { window.pintaSeccioProv(); window.pintaSeccioSalut(); if (window.pintaSeccioTurisme) window.pintaSeccioTurisme(); }
  if (window.pintaSeccioMobilitat) window.pintaSeccioMobilitat();
  if (window.pintaSeccioExportacions) window.pintaSeccioExportacions();
  if (window.pintaSeccioDemografia) window.pintaSeccioDemografia();
  if (seleccionat) obreFitxa(seleccionat, false);
});

aplicaIdioma();
Promise.all([
  fetch("datos/municipios.json").then((r) => r.json()),
  fetch("datos/conjuntura.json").then((r) => (r.ok ? r.json() : null)).catch(() => null),
]).then(([d, cj]) => {
  D = d;
  if (cj) {
    cj.idx = {};
    Object.entries(cj.per).forEach(([k, l]) => { cj.idx[k] = {}; l.forEach((a, i) => { cj.idx[k][a] = i; }); });
    D.cj = cj;
  }
  // Inserción (iframe): solo se carga el mapa si la pieza lo necesita, y la ficha sin desplazar la página
  const E = window.EMB;
  const pMapa = window.iniciaMapa && (!E || E.ambMapa) ? window.iniciaMapa() : null;
  const h = location.hash.slice(1);
  if (E) seleccionat = E.ine || null;
  else if (/^\d{5}$/.test(h)) seleccionat = h;
  pintaTot();
  if (E) E.inicia(pMapa);
  else if (seleccionat) obreFitxa(seleccionat, true);
});
