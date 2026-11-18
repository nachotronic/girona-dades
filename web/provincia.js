/* La provincia en el contexto: series del INE de Girona, Cataluña y España. */
(function () {
  const TP = {
    ca: {
      gi: "Girona", cat: "Catalunya", esp: "Espanya",
      mesos: ["gener", "febrer", "març", "abril", "maig", "juny", "juliol", "agost", "setembre", "octubre", "novembre", "desembre"],
      ipc: ["Inflació", "Variació anual de l'IPC (%)"],
      paro: ["Atur (EPA)", "Taxa d'atur (%)"],
      ipc_grups: ["Què s'encareix", "Variació anual dels preus per grups (%)"],
      compra: ["Compravendes d'habitatges", "Índex, 2007 = 100"],
      turisme: ["Turisme estranger", "Pernoctacions hoteleres de residents a l'estranger (%)"],
      execucions: ["Execucions hipotecàries", "Habitatges amb execució iniciada. Índex, 2014 = 100"],
      societats: ["Empreses noves", "Societats mercantils constituïdes. Índex, 2007 = 100"],
      h_ipc: (g, c, e, p) => `Els preus pugen un <b>${g}</b> interanual a Girona (${p}), davant del ${c} a Catalunya i el ${e} a Espanya.`,
      h_paro: (g, e, p) => `L'atur és del <b>${g}</b> a Girona (${p}). A Espanya, del ${e}.`,
      h_ipc_grups: (g, v, a) => `El ${a}, el que més es va encarir a Girona va ser <b>${g.toLowerCase()}</b> (${v}).`,
      h_compra: (n, a, d, c, e) => `<b>${n}</b> compravendes d'habitatges el ${a}: ${d} respecte al 2007. Catalunya, ${c}; Espanya, ${e}.`,
      h_turisme: (g, a, n) => `El <b>${g}</b> de les nits d'hotel són de turistes estrangers (${a}), sobre ${n} pernoctacions.`,
      h_execucions: (n, a, d) => `<b>${n}</b> habitatges amb execució hipotecària el ${a}, ${d} que el 2014.`,
      h_societats: (n, a, d, c, e) => `<b>${n}</b> societats noves el ${a}: ${d} respecte al 2007. Catalunya, ${c}; Espanya, ${e}.`,
      menys: (v) => `un ${v} menys`, mes: (v) => `un ${v} més`,
      esperanca: ["Esperança de vida", "Anys de vida en néixer"],
      at_renda: ["Renda declarada", "Renda bruta mitjana per declaració de l'IRPF (€)"],
      at_salari: ["Salari mitjà", "Salari brut anual mitjà per assalariat (€)"],
      at_bretxa: ["Bretxa salarial", "Salari mitjà de les dones (% del dels homes)"],
      at_sectors: ["Salaris per sector", "Salari brut anual mitjà per assalariat (€)"],
      at_qui: ["Qui cobra què", "Salari brut anual mitjà per assalariat (€)"],
      at_pensio: ["Pensió mitjana", "Import anual mitjà per pensionista (€)"],
      at_tipus: ["Tipus mitjà de l'IRPF", "Quota resultant sobre la base imposable (%)"],
      at_nac: ["Renda declarada segons qui declara", "Base imposable mitjana per declaració (€)"],
      h_at_renda: (g, a, c, e, d) => `Una declaració de l'IRPF de la província declara <b>${g} €</b> de renda bruta de mitjana (${a}), davant dels ${c} € de Catalunya i els ${e} € d'Espanya. Des del 2013, ${d}.`,
      h_at_salari: (g, a, c, e) => `Un assalariat de la província va cobrar <b>${g} €</b> bruts de mitjana el ${a}. A Catalunya, ${c} €; a Espanya, ${e} €.`,
      h_at_bretxa: (g, a, g0, a0) => `Les dones cobren de mitjana el <b>${g}</b> del que cobren els homes a la província (${a}). El ${a0}, el ${g0}.`,
      h_at_sectors: (s, v, s2, v2, a) => `El ${a}, els sous més alts eren a <b>${s}</b> (${v} €) i els més baixos, a ${s2} (${v2} €).`,
      h_at_qui: (e, n, a) => `Un assalariat estranger cobra <b>${e}</b> menys que un d'espanyol a la província (${a}).`,
      h_at_pensio: (g, a, c, n, h, d) => `<b>${n}</b> pensionistes cobren de mitjana <b>${g} €</b> l'any a la província (${a}); a Catalunya, ${c} €. Els homes, ${h} €; les dones, ${d} €.`,
      h_at_tipus: (g, a, c, e) => `L'IRPF s'emporta el <b>${g}</b> de la base imposable a la província (${a}), davant del ${c} a Catalunya i el ${e} a Espanya.`,
      h_at_nac: (x, n, e, a) => `El ${x} de les declaracions de la província són d'estrangers (${a}). Declaren <b>${e} €</b> de mitjana, davant dels ${n} € dels espanyols.`,
      ag: { agricultura: "Agricultura i pesca", energia: "Energia, aigua i mines", industria: "Indústria", construccio: "Construcció i immobiliàries", comerc: "Comerç, reparacions i transport", informacio: "Informació i comunicacions", finances: "Finances i assegurances", empreses: "Serveis a les empreses", socials: "Serveis socials", altres: "Altres serveis personals i d'oci", homes: "Homes", dones: "Dones", espanyols: "Espanyols", estrangers: "Estrangers", nacionals: "Espanyols" },
      anys_edat: "anys", menys_p: (v) => `un ${v}`,
      font_aeat: "Font: Agència Tributària, Anuari estadístic (models 100 i 190). Espanya: territori de règim comú, sense el País Basc ni Navarra",
      cad_viv: ["Valor cadastral de l'habitatge", "Valor cadastral mitjà dels immobles residencials (€)"],
      cad_usos: ["Immobles que no són habitatges", "Immobles urbans per ús, sense els residencials (% del total)"],
      h_cad_viv: (g, a, c, e, d) => `El valor cadastral mitjà d'un habitatge a la província és de <b>${g} €</b> (${a}), davant dels ${c} € de Catalunya i els ${e} € d'Espanya. Des del 2012, ${d}.`,
      h_cad_usos: (r, a, g, v) => `El <b>${r}</b> dels immobles urbans de la província són habitatges (${a}). Després vénen ${g.toLowerCase()}: ${v}.`,
      cad_ibi: ["Rebut de l'IBI", "Quota líquida mitjana per rebut de l'IBI urbà (€)"],
      h_cad_ibi: (g, a, c, e, n, t) => `El rebut mitjà de l'IBI urbà a la província és de <b>${g} €</b> (${a}), davant dels ${c} € de Catalunya i els ${e} € d'Espanya.${n != null ? ` <b>${n} dels ${t} ajuntaments</b> apliquen el recàrrec als pisos buits.` : ""}`,
      hb_ini: ["Habitatges iniciats", "Habitatges iniciats per 1.000 habitants"],
      h_hb_ini: (g, a, n, c, mx, amx, q) => `El ${a} es van començar <b>${n} habitatges</b> a la província: ${g} per 1.000 habitants, davant d'${c} a Catalunya. Són el ${q} dels del ${amx}, en plena bombolla (${mx}).`,
      hb_aca: ["Habitatges acabats", "Habitatges acabats per 1.000 habitants"],
      h_hb_aca: (g, a, n, c) => `El ${a} es van acabar <b>${n} habitatges</b> a la província: ${g} per 1.000 habitants (Catalunya, ${c}).`,
      hb_hpo: ["Habitatge protegit", "Habitatges protegits sobre el total d'acabats, últims 5 anys (%)"],
      h_hb_hpo: (g, c, a) => `Dels habitatges acabats a la província en els cinc anys fins al ${a}, només el <b>${g}</b> són protegits, davant del ${c} a Catalunya.`,
      hb_ced: ["Moviment d'habitatges", "Cèdules d'habitabilitat per 1.000 habitatges"],
      h_hb_ced: (n, a, g, c) => `El ${a} es van concedir <b>${n} cèdules d'habitabilitat</b> a la província, ${g} per 1.000 habitatges (Catalunya, ${c}). Cal una cèdula per vendre o llogar un pis.`,
      hb_m2: ["Superfície dels habitatges", "Superfície útil mitjana dels habitatges amb cèdula (m²)"],
      h_hb_m2: (g, c, a) => `Els habitatges que es venen o es lloguen a la província tenen <b>${g} m² útils</b> de mitjana (${a}), davant dels ${c} m² de Catalunya.`,
      hb_ihb: ["Pisos buits de bancs i empreses", "Habitatges buits declarats a l'impost per 1.000 habitatges"],
      h_hb_ihb: (n, a, n0, a0) => `<b>${n} pisos</b> buits de bancs, fons i empreses van pagar l'impost el ${a} a la província, davant de ${n0} el ${a0}.`,
      hb_sol: ["Classificació del sòl", "Superfície del municipi segons el planejament (%)"],
      h_hb_sol: (su, a, p, pv) => `El sòl urbà ocupa el <b>${su}</b> de la província (${a}). El planejament encara permet construir <b>${p} habitatges</b> més en sectors pendents, ${pv} per cada 100 d'existents.`,
      hu: { su: "Urbà", surb: "Urbanitzable", snu: "No urbanitzable" },
      font_hab: "Font: Departament de Territori, Habitatge i Transició Ecològica, Agència Tributària de Catalunya i Mapa urbanístic de Catalunya. Taxes per habitatge: Cadastre. La Generalitat no publica dades d'Espanya",
      font_cad: "Font: Direcció General del Cadastre (Ministeri d'Hisenda). Espanya, sense el País Basc ni Navarra",
      cu: { almacen: "Magatzems i aparcaments", comercial: "Comercial", industrial: "Industrial", oficinas: "Oficines", hosteleria: "Hoteleria", solar: "Sòl vacant", deportivo: "Esportiu", cultural: "Cultural", sanidad: "Sanitat i benestar", religioso: "Religiós", espectaculos: "Espectacles", singular: "Edificis singulars" },
      solar: ["Plaques solars", "Potència fotovoltaica d'autoconsum per habitant (W), acumulada mes a mes"],
      h_solar: (g, c, n, kw, m) => `La província suma <b>${n} instal·lacions</b> d'autoconsum fotovoltaic i ${kw} MW (${m}): <b>${g} W per habitant</b>, davant dels ${c} de Catalunya.`,
      font_sol: "Font: Generalitat, Registre d'autoconsum de Catalunya (RAC)",
      esperanca_noms: { gi: "Total", cat: "Dones", esp: "Homes" },
      h_esperanca: (g, a, d, h) => `Qui neix avui a la província pot esperar viure <b>${g} anys</b> (${a}): ${d} les dones i ${h} els homes.`,
      hipoteques: ["Hipoteques sobre habitatges", "Nombre anual. Índex, 2007 = 100"],
      hipoteca_mitjana: ["Hipoteca mitjana", "Import mitjà per habitatge (€)"],
      causes: ["De què es mor", "Defuncions per grup de causes (% del total)"],
      destins: ["On dormen els turistes", "Pernoctacions hoteleres anuals (milions)"],
      destins_noms: { gi: "Costa Brava", cat: "Lloret de Mar", esp: "Pirineus (tot Catalunya)" },
      h_hipoteques: (n, a, d, e) => `<b>${n}</b> hipoteques sobre habitatges el ${a}: ${d} que el 2007. A Espanya, ${e}.`,
      h_hipoteca_mitjana: (g, e, a) => `La hipoteca mitjana a Girona és de <b>${g} €</b> (${a}), davant dels ${e} € d'Espanya.`,
      h_causes: (n, a, c, v) => `<b>${n}</b> defuncions el ${a}. La primera causa: <b>${c.toLowerCase()}</b> (${v}).`,
      h_destins: (v, a, l) => `La Costa Brava va sumar <b>${v} milions</b> de nits d'hotel el ${a}; només Lloret de Mar, ${l} milions.`,
      comp_4eso: ["Competències bàsiques a 4t d'ESO", "Puntuació mitjana de català, castellà, anglès i matemàtiques (0-100)"],
      comp_4eso_mat: ["4t d'ESO per matèries", "Puntuació mitjana a les proves de competències bàsiques (0-100)"],
      comp_6e: ["Competències bàsiques a 6è de primària", "Puntuació mitjana de català, castellà, anglès i matemàtiques (0-100)"],
      edu_publica_prov: ["Escola pública", "Alumnes d'infantil a batxillerat en centres públics (%)"],
      h_comp: (g, c, a, n) => `Els alumnes de ${n} de Girona van treure <b>${g} punts</b> de mitjana el ${a}, davant dels ${c} de Catalunya.`,
      h_comp_mat: (m, v, a) => `El ${a}, la millor matèria a Girona va ser <b>${m.toLowerCase()}</b> (${v} punts).`,
      h_publica: (g, c, cu, n) => `El <b>${g}</b> dels ${n} alumnes de la província van a un centre públic (curs ${cu}). A Catalunya, el ${c}.`,
      n4eso: "4t d'ESO", n6e: "6è",
      univ_fora_prov: ["Universitaris que marxen", "Universitaris residents a la província que estudien fora (%)"],
      univ_noms: { gi: "Estudien fora de la província", cat: "Places de la província ocupades per gent de fora" },
      h_univ: (p, n, r, c, p0, c0) => `El <b>${p}</b> dels universitaris de la província estudien fora (${n} de ${r}, curs ${c}). El curs ${c0}, el ${p0}.`,
      nac_prov: ["D'on són els estrangers", "Principals nacionalitats (% dels estrangers de la província)"],
      h_nac_prov: (n, a, p, v) => `<b>${n}</b> residents estrangers a la província (${a}). La primera nacionalitat: <b>${p}</b>, el ${v}.`,
      font_univ: "Font: Idescat, mobilitat per estudis universitaris", font_nac: "Font: Idescat, Cens anual de població",
      font_edu: "Font: Departament d'Educació",
      font_causes: "Font: INE, Estadística de defuncions segons la causa de mort",
      font: "Font: INE",
      le_quir: ["Esperar una operació", "Temps mitjà d'espera dels pacients pendents d'intervenció (dies)"],
      le_ext: ["Esperar l'especialista", "Temps mitjà d'espera per a una primera visita a l'hospital (dies)"],
      le_diag: ["Esperar una prova", "Temps mitjà d'espera per a una prova diagnòstica (dies)"],
      le_pacients: ["Llista d'espera quirúrgica", "Pacients pendents d'operar-se a la regió sanitària de Girona"],
      le_quir_hosp: ["Operacions, hospital per hospital", "Temps mitjà d'espera per a una intervenció, últim mes (dies)"],
      le_ext_hosp: ["Especialistes, hospital per hospital", "Temps mitjà d'espera per a una primera visita, últim mes (dies)"],
      le_diag_hosp: ["Proves, hospital per hospital", "Temps mitjà d'espera per a una prova diagnòstica, últim mes (dies)"],
      le_quir_proc: ["Quines operacions", "Intervencions amb més pacients en espera: dies d'espera"],
      le_ext_proc: ["Quines especialitats", "Especialitats amb més pacients en espera: dies d'espera"],
      le_diag_proc: ["Quines proves", "Proves amb més pacients en espera: dies d'espera"],
      rec_hab: ["Receptes per habitant", "Receptes facturades al CatSalut per habitant i any"],
      rec_euros: ["Despesa en medicaments", "Import de les receptes per habitant i any (€)"],
      rec_grups: ["Què es recepta", "Receptes per cada 100 habitants en els últims 12 mesos"],
      inf_setm: ["Infeccions respiratòries", "Casos atesos a l'atenció primària per 100.000 habitants, setmana a setmana"],
      grip_setm: ["Grip", "Casos de grip diagnosticats a l'atenció primària per 100.000 habitants, setmana a setmana"],
      hosp_noms: { gi: "Temps mitjà d'espera" }, rgi_noms: { gi: "Regió sanitària de Girona" },
      pac: "pacients", def_n: "defuncions", dies: "dies", setmana: (d) => `setmana del ${d}`,
      h_le_quir: (g, c, m, n) => `Qui espera una operació a la regió de Girona hi porta <b>${g} dies</b> de mitjana (${m}); a Catalunya, ${c}. Hi ha <b>${n}</b> persones a la llista.`,
      h_le_ext: (g, c, m, n) => `Per a una primera visita a l'especialista, l'espera mitjana és de <b>${g} dies</b> (${m}); a Catalunya, ${c}. ${n} persones esperen.`,
      h_le_diag: (g, c, m, n) => `Per a una prova diagnòstica, l'espera mitjana és de <b>${g} dies</b> (${m}); a Catalunya, ${c}. ${n} persones esperen.`,
      h_le_pacients: (n, m, d) => `<b>${n}</b> persones esperaven una operació el ${m}, ${d} que un any abans.`,
      h_le_hosp: (h, v, h2, v2) => `On més s'espera és a <b>${h}</b> (${v} dies de mitjana); on menys, a ${h2} (${v2}).`,
      h_le_proc: (p, n, g, c) => `La llista més llarga és la de <b>${p.charAt(0).toLowerCase() + p.slice(1)}</b>: ${n} pacients, que esperen ${g} dies de mitjana (Catalunya, ${c}).`,
      h_rec_hab: (g, a, c) => `Cada habitant de la regió de Girona va rebre <b>${g} receptes</b> el ${a}. A Catalunya, ${c}.`,
      h_rec_euros: (g, a, c) => `<b>${g} €</b> en medicaments receptats per habitant el ${a}, davant dels ${c} € de Catalunya.`,
      h_rec_grups: (g, v, c) => `El que més es recepta són <b>${g.charAt(0).toLowerCase() + g.slice(1)}</b>: ${v} receptes per cada 100 habitants en un any (Catalunya, ${c}).`,
      h_inf: (v, d, c) => `La ${d}, <b>${v} casos</b> per 100.000 habitants a la regió de Girona. A Catalunya, ${c}.`,
      esca_salut: ["Com diuen que estan", "Enquesta de salut: adults de 15 anys o més (%)"],
      esca_habits: ["Hàbits", "Enquesta de salut: adults de 15 anys o més (%)"],
      esca_serveis: ["Ús de la sanitat", "Enquesta de salut: tota la població (%)"],
      esca_infants: ["Infants", "Enquesta de salut: menors de 15 anys (%)"],
      esca_evol: ["Catalunya, des del 1994", "Enquesta de salut: adults (%)"],
      evol_noms: { gi: "Fumadors", cat: "Obesitat", esp: "Pressió alta" },
      sig_mes: "més que Catalunya", davant: "davant del", sig_menys: "menys que Catalunya",
      h_esca: (n, p, c) => `<b>${n}</b> de cada 100 adults de la regió de Girona diuen que la seva salut és bona, molt bona o excel·lent (${p}). A Catalunya, ${c}.`,
      h_esca_dif: (k, p) => `Diferències clares amb Catalunya: ${k} (${p}).`,
      h_esca_infants: (v, c) => `Un <b>${v}</b> dels infants de 6 a 12 anys té excés de pes; a Catalunya, un ${c}.`,
      h_esca_evol: (a, t, t0, o, o0) => `El ${a}, el ${t} dels adults catalans fumaven (el ${t0} el 1994), i el ${o} tenien obesitat (el ${o0} el 2006).`,
      font_esca: "Font: Departament de Salut, Enquesta de salut de Catalunya (ESCA). Girona: regió sanitària, mitjana 2023-2024; Catalunya: 2024. Mostra a Girona: unes 500 persones (marge d'error d'uns 4-5 punts).",
      font_le: "Font: CatSalut, llistes d'espera", font_rec: "Font: CatSalut, receptes facturades", font_inf: "Font: Departament de Salut, SIVIC",
      menys_q: (v) => `un ${v} menys`, mes_q: (v) => `un ${v} més`,
    },
    es: {
      gi: "Girona", cat: "Cataluña", esp: "España",
      mesos: ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"],
      ipc: ["Inflación", "Variación anual del IPC (%)"],
      paro: ["Paro (EPA)", "Tasa de paro (%)"],
      ipc_grups: ["Qué se encarece", "Variación anual de los precios por grupos (%)"],
      compra: ["Compraventas de viviendas", "Índice, 2007 = 100"],
      turisme: ["Turismo extranjero", "Pernoctaciones hoteleras de residentes en el extranjero (%)"],
      execucions: ["Ejecuciones hipotecarias", "Viviendas con ejecución iniciada. Índice, 2014 = 100"],
      societats: ["Empresas nuevas", "Sociedades mercantiles constituidas. Índice, 2007 = 100"],
      h_ipc: (g, c, e, p) => `Los precios suben un <b>${g}</b> interanual en Girona (${p}), frente al ${c} en Cataluña y el ${e} en España.`,
      h_paro: (g, e, p) => `El paro es del <b>${g}</b> en Girona (${p}). En España, del ${e}.`,
      h_ipc_grups: (g, v, a) => `En ${a}, lo que más se encareció en Girona fue <b>${g.toLowerCase()}</b> (${v}).`,
      h_compra: (n, a, d, c, e) => `<b>${n}</b> compraventas de viviendas en ${a}: ${d} respecto a 2007. Cataluña, ${c}; España, ${e}.`,
      h_turisme: (g, a, n) => `El <b>${g}</b> de las noches de hotel son de turistas extranjeros (${a}), sobre ${n} pernoctaciones.`,
      h_execucions: (n, a, d) => `<b>${n}</b> viviendas con ejecución hipotecaria en ${a}, ${d} que en 2014.`,
      h_societats: (n, a, d, c, e) => `<b>${n}</b> sociedades nuevas en ${a}: ${d} respecto a 2007. Cataluña, ${c}; España, ${e}.`,
      menys: (v) => `un ${v} menos`, mes: (v) => `un ${v} más`,
      esperanca: ["Esperanza de vida", "Años de vida al nacer"],
      at_renda: ["Renta declarada", "Renta bruta media por declaración del IRPF (€)"],
      at_salari: ["Salario medio", "Salario bruto anual medio por asalariado (€)"],
      at_bretxa: ["Brecha salarial", "Salario medio de las mujeres (% del de los hombres)"],
      at_sectors: ["Salarios por sector", "Salario bruto anual medio por asalariado (€)"],
      at_qui: ["Quién cobra qué", "Salario bruto anual medio por asalariado (€)"],
      at_pensio: ["Pensión media", "Importe anual medio por pensionista (€)"],
      at_tipus: ["Tipo medio del IRPF", "Cuota resultante sobre la base imponible (%)"],
      at_nac: ["Renta declarada según quién declara", "Base imponible media por declaración (€)"],
      h_at_renda: (g, a, c, e, d) => `Una declaración del IRPF de la provincia declara <b>${g} €</b> de renta bruta de media (${a}), frente a los ${c} € de Cataluña y los ${e} € de España. Desde 2013, ${d}.`,
      h_at_salari: (g, a, c, e) => `Un asalariado de la provincia cobró <b>${g} €</b> brutos de media en ${a}. En Cataluña, ${c} €; en España, ${e} €.`,
      h_at_bretxa: (g, a, g0, a0) => `Las mujeres cobran de media el <b>${g}</b> de lo que cobran los hombres en la provincia (${a}). En ${a0}, el ${g0}.`,
      h_at_sectors: (s, v, s2, v2, a) => `En ${a}, los sueldos más altos estaban en <b>${s}</b> (${v} €) y los más bajos, en ${s2} (${v2} €).`,
      h_at_qui: (e, n, a) => `Un asalariado extranjero cobra <b>${e}</b> menos que uno español en la provincia (${a}).`,
      h_at_pensio: (g, a, c, n, h, d) => `<b>${n}</b> pensionistas cobran de media <b>${g} €</b> al año en la provincia (${a}); en Cataluña, ${c} €. Los hombres, ${h} €; las mujeres, ${d} €.`,
      h_at_tipus: (g, a, c, e) => `El IRPF se lleva el <b>${g}</b> de la base imponible en la provincia (${a}), frente al ${c} en Cataluña y el ${e} en España.`,
      h_at_nac: (x, n, e, a) => `El ${x} de las declaraciones de la provincia son de extranjeros (${a}). Declaran <b>${e} €</b> de media, frente a los ${n} € de los españoles.`,
      ag: { agricultura: "Agricultura y pesca", energia: "Energía, agua y minas", industria: "Industria", construccio: "Construcción e inmobiliarias", comerc: "Comercio, reparaciones y transporte", informacio: "Información y comunicaciones", finances: "Finanzas y seguros", empreses: "Servicios a las empresas", socials: "Servicios sociales", altres: "Otros servicios personales y de ocio", homes: "Hombres", dones: "Mujeres", espanyols: "Españoles", estrangers: "Extranjeros", nacionals: "Españoles" },
      anys_edat: "años", menys_p: (v) => `un ${v}`,
      font_aeat: "Fuente: Agencia Tributaria, Anuario estadístico (modelos 100 y 190). España: territorio de régimen común, sin el País Vasco ni Navarra",
      cad_viv: ["Valor catastral de la vivienda", "Valor catastral medio de los inmuebles residenciales (€)"],
      cad_usos: ["Inmuebles que no son viviendas", "Inmuebles urbanos por uso, sin los residenciales (% del total)"],
      h_cad_viv: (g, a, c, e, d) => `El valor catastral medio de una vivienda en la provincia es de <b>${g} €</b> (${a}), frente a los ${c} € de Cataluña y los ${e} € de España. Desde 2012, ${d}.`,
      h_cad_usos: (r, a, g, v) => `El <b>${r}</b> de los inmuebles urbanos de la provincia son viviendas (${a}). Después vienen ${g.toLowerCase()}: ${v}.`,
      cad_ibi: ["Recibo del IBI", "Cuota líquida media por recibo del IBI urbano (€)"],
      h_cad_ibi: (g, a, c, e, n, t) => `El recibo medio del IBI urbano en la provincia es de <b>${g} €</b> (${a}), frente a los ${c} € de Cataluña y los ${e} € de España.${n != null ? ` <b>${n} de los ${t} ayuntamientos</b> aplican el recargo a los pisos vacíos.` : ""}`,
      hb_ini: ["Viviendas iniciadas", "Viviendas iniciadas por 1.000 habitantes"],
      h_hb_ini: (g, a, n, c, mx, amx, q) => `En ${a} se empezaron <b>${n} viviendas</b> en la provincia: ${g} por 1.000 habitantes, frente a ${c} en Cataluña. Son el ${q} de las de ${amx}, en plena burbuja (${mx}).`,
      hb_aca: ["Viviendas acabadas", "Viviendas acabadas por 1.000 habitantes"],
      h_hb_aca: (g, a, n, c) => `En ${a} se acabaron <b>${n} viviendas</b> en la provincia: ${g} por 1.000 habitantes (Cataluña, ${c}).`,
      hb_hpo: ["Vivienda protegida", "Viviendas protegidas sobre el total de acabadas, últimos 5 años (%)"],
      h_hb_hpo: (g, c, a) => `De las viviendas acabadas en la provincia en los cinco años hasta ${a}, solo el <b>${g}</b> son protegidas, frente al ${c} en Cataluña.`,
      hb_ced: ["Movimiento de viviendas", "Cédulas de habitabilidad por 1.000 viviendas"],
      h_hb_ced: (n, a, g, c) => `En ${a} se concedieron <b>${n} cédulas de habitabilidad</b> en la provincia, ${g} por 1.000 viviendas (Cataluña, ${c}). Hace falta una cédula para vender o alquilar un piso.`,
      hb_m2: ["Superficie de las viviendas", "Superficie útil media de las viviendas con cédula (m²)"],
      h_hb_m2: (g, c, a) => `Las viviendas que se venden o alquilan en la provincia tienen <b>${g} m² útiles</b> de media (${a}), frente a los ${c} m² de Cataluña.`,
      hb_ihb: ["Pisos vacíos de bancos y empresas", "Viviendas vacías declaradas al impuesto por 1.000 viviendas"],
      h_hb_ihb: (n, a, n0, a0) => `<b>${n} pisos</b> vacíos de bancos, fondos y empresas pagaron el impuesto en ${a} en la provincia, frente a ${n0} en ${a0}.`,
      hb_sol: ["Clasificación del suelo", "Superficie del municipio según el planeamiento (%)"],
      h_hb_sol: (su, a, p, pv) => `El suelo urbano ocupa el <b>${su}</b> de la provincia (${a}). El planeamiento aún permite construir <b>${p} viviendas</b> más en sectores pendientes, ${pv} por cada 100 existentes.`,
      hu: { su: "Urbano", surb: "Urbanizable", snu: "No urbanizable" },
      font_hab: "Fuente: Departament de Territori, Habitatge i Transició Ecològica, Agència Tributària de Catalunya y Mapa urbanístico de Cataluña. Tasas por vivienda: Catastro. La Generalitat no publica datos de España",
      font_cad: "Fuente: Dirección General del Catastro (Ministerio de Hacienda). España, sin el País Vasco ni Navarra",
      cu: { almacen: "Almacenes y aparcamientos", comercial: "Comercial", industrial: "Industrial", oficinas: "Oficinas", hosteleria: "Hostelería", solar: "Suelo vacante", deportivo: "Deportivo", cultural: "Cultural", sanidad: "Sanidad y beneficencia", religioso: "Religioso", espectaculos: "Espectáculos", singular: "Edificios singulares" },
      solar: ["Placas solares", "Potencia fotovoltaica de autoconsumo por habitante (W), acumulada mes a mes"],
      h_solar: (g, c, n, kw, m) => `La provincia suma <b>${n} instalaciones</b> de autoconsumo fotovoltaico y ${kw} MW (${m}): <b>${g} W por habitante</b>, frente a los ${c} de Cataluña.`,
      font_sol: "Fuente: Generalitat, Registro de autoconsumo de Cataluña (RAC)",
      esperanca_noms: { gi: "Total", cat: "Mujeres", esp: "Hombres" },
      h_esperanca: (g, a, d, h) => `Quien nace hoy en la provincia puede esperar vivir <b>${g} años</b> (${a}): ${d} las mujeres y ${h} los hombres.`,
      hipoteques: ["Hipotecas sobre viviendas", "Número anual. Índice, 2007 = 100"],
      hipoteca_mitjana: ["Hipoteca media", "Importe medio por vivienda (€)"],
      causes: ["De qué se muere", "Defunciones por grupo de causas (% del total)"],
      destins: ["Dónde duermen los turistas", "Pernoctaciones hoteleras anuales (millones)"],
      destins_noms: { gi: "Costa Brava", cat: "Lloret de Mar", esp: "Pirineos (toda Cataluña)" },
      h_hipoteques: (n, a, d, e) => `<b>${n}</b> hipotecas sobre viviendas en ${a}: ${d} que en 2007. En España, ${e}.`,
      h_hipoteca_mitjana: (g, e, a) => `La hipoteca media en Girona es de <b>${g} €</b> (${a}), frente a los ${e} € de España.`,
      h_causes: (n, a, c, v) => `<b>${n}</b> defunciones en ${a}. La primera causa: <b>${c.toLowerCase()}</b> (${v}).`,
      h_destins: (v, a, l) => `La Costa Brava sumó <b>${v} millones</b> de noches de hotel en ${a}; solo Lloret de Mar, ${l} millones.`,
      comp_4eso: ["Competencias básicas en 4.º de ESO", "Puntuación media de catalán, castellano, inglés y matemáticas (0-100)"],
      comp_4eso_mat: ["4.º de ESO por materias", "Puntuación media en las pruebas de competencias básicas (0-100)"],
      comp_6e: ["Competencias básicas en 6.º de primaria", "Puntuación media de catalán, castellano, inglés y matemáticas (0-100)"],
      edu_publica_prov: ["Escuela pública", "Alumnos de infantil a bachillerato en centros públicos (%)"],
      h_comp: (g, c, a, n) => `Los alumnos de ${n} de Girona sacaron <b>${g} puntos</b> de media en ${a}, frente a los ${c} de Cataluña.`,
      h_comp_mat: (m, v, a) => `En ${a}, la mejor materia en Girona fue <b>${m.toLowerCase()}</b> (${v} puntos).`,
      h_publica: (g, c, cu, n) => `El <b>${g}</b> de los ${n} alumnos de la provincia va a un centro público (curso ${cu}). En Cataluña, el ${c}.`,
      n4eso: "4.º de ESO", n6e: "6.º",
      univ_fora_prov: ["Universitarios que se van", "Universitarios residentes en la provincia que estudian fuera (%)"],
      univ_noms: { gi: "Estudian fuera de la provincia", cat: "Plazas de la provincia ocupadas por gente de fuera" },
      h_univ: (p, n, r, c, p0, c0) => `El <b>${p}</b> de los universitarios de la provincia estudia fuera (${n} de ${r}, curso ${c}). En el curso ${c0}, el ${p0}.`,
      nac_prov: ["De dónde son los extranjeros", "Principales nacionalidades (% de los extranjeros de la provincia)"],
      h_nac_prov: (n, a, p, v) => `<b>${n}</b> residentes extranjeros en la provincia (${a}). La primera nacionalidad: <b>${p}</b>, el ${v}.`,
      font_univ: "Fuente: Idescat, movilidad por estudios universitarios", font_nac: "Fuente: Idescat, Censo anual de población",
      font_edu: "Fuente: Departament d'Educació",
      font_causes: "Fuente: INE, Estadística de defunciones según la causa de muerte",
      font: "Fuente: INE",
      le_quir: ["Esperar una operación", "Tiempo medio de espera de los pacientes pendientes de intervención (días)"],
      le_ext: ["Esperar al especialista", "Tiempo medio de espera para una primera visita en el hospital (días)"],
      le_diag: ["Esperar una prueba", "Tiempo medio de espera para una prueba diagnóstica (días)"],
      le_pacients: ["Lista de espera quirúrgica", "Pacientes pendientes de operarse en la región sanitaria de Girona"],
      le_quir_hosp: ["Operaciones, hospital por hospital", "Tiempo medio de espera para una intervención, último mes (días)"],
      le_ext_hosp: ["Especialistas, hospital por hospital", "Tiempo medio de espera para una primera visita, último mes (días)"],
      le_diag_hosp: ["Pruebas, hospital por hospital", "Tiempo medio de espera para una prueba diagnóstica, último mes (días)"],
      le_quir_proc: ["Qué operaciones", "Intervenciones con más pacientes en espera: días de espera"],
      le_ext_proc: ["Qué especialidades", "Especialidades con más pacientes en espera: días de espera"],
      le_diag_proc: ["Qué pruebas", "Pruebas con más pacientes en espera: días de espera"],
      rec_hab: ["Recetas por habitante", "Recetas facturadas al CatSalut por habitante y año"],
      rec_euros: ["Gasto en medicamentos", "Importe de las recetas por habitante y año (€)"],
      rec_grups: ["Qué se receta", "Recetas por cada 100 habitantes en los últimos 12 meses"],
      inf_setm: ["Infecciones respiratorias", "Casos atendidos en atención primaria por 100.000 habitantes, semana a semana"],
      grip_setm: ["Gripe", "Casos de gripe diagnosticados en atención primaria por 100.000 habitantes, semana a semana"],
      hosp_noms: { gi: "Tiempo medio de espera" }, rgi_noms: { gi: "Región sanitaria de Girona" },
      pac: "pacientes", def_n: "defunciones", dies: "días", setmana: (d) => `semana del ${d}`,
      h_le_quir: (g, c, m, n) => `Quien espera una operación en la región de Girona lleva <b>${g} días</b> de media (${m}); en Cataluña, ${c}. Hay <b>${n}</b> personas en la lista.`,
      h_le_ext: (g, c, m, n) => `Para una primera visita al especialista, la espera media es de <b>${g} días</b> (${m}); en Cataluña, ${c}. ${n} personas esperan.`,
      h_le_diag: (g, c, m, n) => `Para una prueba diagnóstica, la espera media es de <b>${g} días</b> (${m}); en Cataluña, ${c}. ${n} personas esperan.`,
      h_le_pacients: (n, m, d) => `<b>${n}</b> personas esperaban una operación en ${m}, ${d} que un año antes.`,
      h_le_hosp: (h, v, h2, v2) => `Donde más se espera es en <b>${h}</b> (${v} días de media); donde menos, en ${h2} (${v2}).`,
      h_le_proc: (p, n, g, c) => `La lista más larga es la de <b>${p.charAt(0).toLowerCase() + p.slice(1)}</b>: ${n} pacientes, que esperan ${g} días de media (Cataluña, ${c}).`,
      h_rec_hab: (g, a, c) => `Cada habitante de la región de Girona recibió <b>${g} recetas</b> en ${a}. En Cataluña, ${c}.`,
      h_rec_euros: (g, a, c) => `<b>${g} €</b> en medicamentos recetados por habitante en ${a}, frente a los ${c} € de Cataluña.`,
      h_rec_grups: (g, v, c) => `Lo que más se receta son <b>${g.charAt(0).toLowerCase() + g.slice(1)}</b>: ${v} recetas por cada 100 habitantes en un año (Cataluña, ${c}).`,
      h_inf: (v, d, c) => `La ${d}, <b>${v} casos</b> por 100.000 habitantes en la región de Girona. En Cataluña, ${c}.`,
      esca_salut: ["Cómo dicen que están", "Encuesta de salud: adultos de 15 años o más (%)"],
      esca_habits: ["Hábitos", "Encuesta de salud: adultos de 15 años o más (%)"],
      esca_serveis: ["Uso de la sanidad", "Encuesta de salud: toda la población (%)"],
      esca_infants: ["Niños", "Encuesta de salud: menores de 15 años (%)"],
      esca_evol: ["Cataluña, desde 1994", "Encuesta de salud: adultos (%)"],
      evol_noms: { gi: "Fumadores", cat: "Obesidad", esp: "Tensión alta" },
      sig_mes: "más que Cataluña", davant: "frente al", sig_menys: "menos que Cataluña",
      h_esca: (n, p, c) => `<b>${n}</b> de cada 100 adultos de la región de Girona dicen que su salud es buena, muy buena o excelente (${p}). En Cataluña, ${c}.`,
      h_esca_dif: (k, p) => `Diferencias claras con Cataluña: ${k} (${p}).`,
      h_esca_infants: (v, c) => `Un <b>${v}</b> de los niños de 6 a 12 años tiene exceso de peso; en Cataluña, un ${c}.`,
      h_esca_evol: (a, t, t0, o, o0) => `En ${a}, el ${t} de los adultos catalanes fumaba (el ${t0} en 1994), y el ${o} tenía obesidad (el ${o0} en 2006).`,
      font_esca: "Fuente: Departament de Salut, Encuesta de salud de Cataluña (ESCA). Girona: región sanitaria, media 2023-2024; Cataluña: 2024. Muestra en Girona: unas 500 personas (margen de error de unos 4-5 puntos).",
      font_le: "Fuente: CatSalut, listas de espera", font_rec: "Fuente: CatSalut, recetas facturadas", font_inf: "Fuente: Departament de Salut, SIVIC",
      menys_q: (v) => `un ${v} menos`, mes_q: (v) => `un ${v} más`,
    },
  };
  // Seguridad y justicia (Mossos, Interior, CGPJ)
  Object.assign(TP.ca, {
    mossos_mes: ["Delictes, mes a mes", "Fets penals coneguts en 12 mesos per 1.000 habitants"],
    mmes_noms: { gi: "Regió Policial Girona", cat: "Catalunya" },
    h_mossos_mes: (n, d, v) => `<b>${n}</b> fets penals coneguts a la Regió Policial Girona en els últims 12 mesos (fins ${d}), ${v} que els 12 anteriors.`,
    rp_fets: ["Regions policials", "Fets penals coneguts per 1.000 habitants, últims 12 mesos"],
    rp_noms: { gi: "Fets per 1.000 habitants" },
    h_rp_fets: (p, v, c) => `La Regió Policial Girona és la <b>${p}</b> de nou en delictes per habitant (${v} per 1.000), davant de ${c} a tot Catalunya.`,
    rp_tipus: ["Quins delictes", "Fets coneguts per 1.000 habitants, últims 12 mesos"],
    rpt_noms: { gi: "Regió Policial Girona", cat: "Catalunya" },
    h_rp_tipus: (t, v, c) => `El delicte més freqüent són els <b>${t.toLowerCase()}</b>: ${v} per 1.000 habitants a la regió, ${c} a Catalunya.`,
    int_munis: ["Ciutats de més de 20.000 habitants", "Infraccions penals per 1.000 habitants"],
    intm_noms: { gi: "Infraccions per 1.000 habitants" },
    h_int_munis: (m, v, a, g) => `<b>${m}</b> és la ciutat de la província amb més infraccions penals per habitant el ${a} (${v} per 1.000). La província, ${g}.`,
    llancaments: ["Desnonaments", "Llançaments practicats per 10.000 habitants"],
    h_llancaments: (n, d, v) => `<b>${n}</b> desnonaments practicats a la província en els últims quatre trimestres (fins ${d}), ${v} que un any abans.`,
    llanc_tipus: ["Per què es desnona", "Llançaments practicats a la província per trimestre"],
    llanc_tipus_noms: { gi: "Lloguer (LAU)", cat: "Hipoteca", esp: "Altres (ocupacions, precari…)" },
    h_llanc_tipus: (l, t, d) => `<b>${l}</b> dels ${t} desnonaments del ${d} van ser per impagament del lloguer.`,
    vdg: ["Violència de gènere", "Denúncies als jutjats per 10.000 habitants"],
    h_vdg: (n, p, g, e) => `<b>${n}</b> denúncies per violència de gènere als jutjats de la província el ${p}. En un any, ${g} per 10.000 habitants (Espanya, ${e}).`,
    z_gi: "Província de Girona", z_cat: "Catalunya", z_esp: "Espanya",
    font_mossos: "Font: Mossos d'Esquadra, fets penals coneguts", font_interior: "Font: Ministeri de l'Interior, Balanç de Criminalitat",
    font_cgpj: "Font: Consell General del Poder Judicial",
  });
  Object.assign(TP.es, {
    mossos_mes: ["Delitos, mes a mes", "Hechos penales conocidos en 12 meses por 1.000 habitantes"],
    mmes_noms: { gi: "Región Policial Girona", cat: "Cataluña" },
    h_mossos_mes: (n, d, v) => `<b>${n}</b> hechos penales conocidos en la Región Policial Girona en los últimos 12 meses (hasta ${d}), ${v} que los 12 anteriores.`,
    rp_fets: ["Regiones policiales", "Hechos penales conocidos por 1.000 habitantes, últimos 12 meses"],
    rp_noms: { gi: "Hechos por 1.000 habitantes" },
    h_rp_fets: (p, v, c) => `La Región Policial Girona es la <b>${p}</b> de nueve en delitos por habitante (${v} por 1.000), frente a ${c} en toda Cataluña.`,
    rp_tipus: ["Qué delitos", "Hechos conocidos por 1.000 habitantes, últimos 12 meses"],
    rpt_noms: { gi: "Región Policial Girona", cat: "Cataluña" },
    h_rp_tipus: (t, v, c) => `El delito más frecuente son los <b>${t.toLowerCase()}</b>: ${v} por 1.000 habitantes en la región, ${c} en Cataluña.`,
    int_munis: ["Ciudades de más de 20.000 habitantes", "Infracciones penales por 1.000 habitantes"],
    intm_noms: { gi: "Infracciones por 1.000 habitantes" },
    h_int_munis: (m, v, a, g) => `<b>${m}</b> es la ciudad de la provincia con más infracciones penales por habitante en ${a} (${v} por 1.000). La provincia, ${g}.`,
    llancaments: ["Desahucios", "Lanzamientos practicados por 10.000 habitantes"],
    h_llancaments: (n, d, v) => `<b>${n}</b> desahucios practicados en la provincia en los últimos cuatro trimestres (hasta ${d}), ${v} que un año antes.`,
    llanc_tipus: ["Por qué se desahucia", "Lanzamientos practicados en la provincia por trimestre"],
    llanc_tipus_noms: { gi: "Alquiler (LAU)", cat: "Hipoteca", esp: "Otros (ocupaciones, precario…)" },
    h_llanc_tipus: (l, t, d) => `<b>${l}</b> de los ${t} desahucios del ${d} fueron por impago del alquiler.`,
    vdg: ["Violencia de género", "Denuncias en los juzgados por 10.000 habitantes"],
    h_vdg: (n, p, g, e) => `<b>${n}</b> denuncias por violencia de género en los juzgados de la provincia en el ${p}. En un año, ${g} por 10.000 habitantes (España, ${e}).`,
    z_gi: "Provincia de Girona", z_cat: "Cataluña", z_esp: "España",
    font_mossos: "Fuente: Mossos d'Esquadra, hechos penales conocidos", font_interior: "Fuente: Ministerio del Interior, Balance de Criminalidad",
    font_cgpj: "Fuente: Consejo General del Poder Judicial",
  });
  // Turismo
  Object.assign(TP.ca, {
    t_pern_idx: ["Nits d'hotel", "Pernoctacions hoteleres a l'any, índex 2019 = 100"],
    h_t_pern_idx: (n, a, v) => `<b>${n} milions</b> de nits d'hotel a la província el ${a}, ${v} que el 2019.`,
    t_pern_tipus: ["On dormen", "Pernoctacions per tipus d'allotjament (milions)"],
    h_t_pern_tipus: (t, a, g, p) => `<b>${t} milions</b> de pernoctacions en allotjaments turístics el ${a}. Els ${g} en sumen el ${p}.`,
    t_pern_evol: ["Hotels, càmpings i la resta", "Pernoctacions a l'any (milions)"],
    tt_noms: { gi: "Hotels", cat: "Càmpings", esp: "Apartaments i turisme rural" },
    h_t_pern_evol: (h, c, a) => `Els hotels van sumar <b>${h} milions</b> de nits el ${a}; els càmpings, ${c} milions.`,
    t_estac: ["Quan vénen", "Pernoctacions hoteleres de cada mes (% de l'any)"],
    h_t_estac: (g, c) => `El juliol i l'agost concentren <b>el ${g}</b> de les nits d'hotel de la província. A Catalunya, el ${c}.`,
    t_ocup: ["Ocupació dels hotels", "Grau d'ocupació per places, mitjana de l'any (%)"],
    h_t_ocup: (g, a, c, e) => `Els hotels de la província van tenir ocupades <b>el ${g}</b> de les places el ${a} (Catalunya, ${c}; Espanya, ${e}).`,
    t_adr: ["Preu de l'habitació", "Tarifa mitjana diària, ADR (€)"],
    h_t_adr: (g, a, c) => `Una habitació d'hotel costava <b>${g} €</b> per nit de mitjana el ${a}. A Catalunya, ${c} €.`,
    t_revpar: ["Ingrés per habitació", "Ingrés per habitació disponible, RevPAR (€)"],
    h_t_revpar: (g, a, c) => `Cada habitació disponible va ingressar <b>${g} €</b> per nit de mitjana el ${a} (Catalunya, ${c} €).`,
    t_estada: ["Quants dies es queden", "Estada mitjana als hotels (dies)"],
    h_t_estada: (g, a, e) => `L'estada mitjana als hotels de la província és de <b>${g} dies</b> (${a}). A Espanya, ${e}.`,
    t_ext: ["Turisme estranger", "Pernoctacions hoteleres de residents a l'estranger (%)"],
    h_t_ext: (g, a) => `<b>El ${g}</b> de les nits d'hotel són de turistes estrangers (${a}).`,
    t_personal: ["Feina als allotjaments", "Persones ocupades, mitjana de l'any"],
    h_t_personal: (h, c, a) => `Els hotels de la província donen feina a <b>${h} persones</b> de mitjana (${a}); els càmpings, a ${c}.`,
    t_punts: ["Destinacions", "Nits en hotels i càmpings per punt turístic (milions)"],
    h_t_punts: (p, v, a) => `<b>${p}</b> és el primer destí hoteler de la província: ${v} milions de nits el ${a}.`,
    t_orig_ext: ["D'on vénen els estrangers", "Turistes estrangers per país (%, telefonia mòbil)"],
    h_t_orig_ext: (p, v, n, a) => `<b>${p}</b>: el ${v} dels ${n} milions de visites de turistes estrangers del ${a}.`,
    t_orig_nac: ["D'on vénen els de fora", "Turistes d'altres províncies per comunitat (%, telefonia mòbil)"],
    h_t_orig_nac: (p, v, a) => `El ${v} dels turistes espanyols d'altres províncies són de <b>${p}</b> (${a}).`,
    t_mov_mes: ["Turistes cada mes", "Turistes a la província segons la telefonia mòbil"],
    mov_noms: { gi: "Estrangers", cat: "D'altres províncies" },
    pt_noms: { gi: "Hotels", cat: "Càmpings" },
    h_t_mov_mes: (v, d) => `<b>${v}</b> turistes estrangers a la província el ${d}, segons la posició dels mòbils.`,
    t_gasto_pers: ["Quant gasten", "Despesa mitjana per turista estranger i viatge (€)"],
    h_t_gasto_pers: (c, a, e) => `Un turista estranger gasta <b>${c} €</b> per viatge a Catalunya (${a}). A Espanya, ${e} €.`,
    t_gasto_dia: ["Despesa per dia", "Despesa mitjana diària per turista estranger (€)"],
    h_t_gasto_dia: (c, a, e) => `<b>${c} €</b> al dia per turista estranger a Catalunya (${a}); ${e} € a Espanya.`,
    t_ieet: ["Impost turístic", "Recaptació de l'IEET a les comarques gironines (milions d'€)"],
    h_t_ieet: (v, a) => `L'impost turístic va recaptar <b>${v} milions d'euros</b> a les comarques gironines el ${a}.`,
    t_ieet_tipus: ["Qui paga l'impost", "Recaptació de l'IEET per tipus d'allotjament (milions d'€)"],
    h_t_ieet_tipus: (g, v, a) => `Els <b>${g}</b> aporten ${v} milions de l'impost turístic (${a}).`,
    t_places: ["Places turístiques", "Places per tipus d'allotjament, avui"],
    h_t_places: (n, p) => `La província té <b>${n} places turístiques</b>, ${p} per cada 100 habitants.`,
    t_aena: ["Aeroport de Girona", "Passatgers a l'any (milions)"],
    h_t_aena: (v, a) => `<b>${v} milions</b> de passatgers a l'aeroport de Girona el ${a}.`,
    tt: { hotel: "Hotels", camp: "Càmpings", apt: "Apartaments turístics", rural: "Turisme rural", hut: "Habitatges d'ús turístic", llar: "Llars compartides", plat: "Pisos de plataformes", alberg: "Albergs", altres: "Altres", creuers: "Creuers" },
    mesos_c: ["gen", "feb", "mar", "abr", "mai", "jun", "jul", "ago", "set", "oct", "nov", "des"],
    font_tur: "Font: INE, enquestes d'ocupació en allotjaments turístics", font_irsh: "Font: INE, indicadors de rendibilitat del sector hoteler",
    font_mov: "Font: INE, mesurament del turisme a partir de la telefonia mòbil (estadística experimental)", font_egatur: "Font: INE, Egatur (Catalunya i Espanya; no hi ha dada provincial)",
    font_ieet: "Font: Agència Tributària de Catalunya, IEET per comarca", font_reg: "Font: Registre de Turisme de Catalunya", font_aena: "Font: Aena",
  });
  Object.assign(TP.es, {
    t_pern_idx: ["Noches de hotel", "Pernoctaciones hoteleras al año, índice 2019 = 100"],
    h_t_pern_idx: (n, a, v) => `<b>${n} millones</b> de noches de hotel en la provincia en ${a}, ${v} que en 2019.`,
    t_pern_tipus: ["Dónde duermen", "Pernoctaciones por tipo de alojamiento (millones)"],
    h_t_pern_tipus: (t, a, g, p) => `<b>${t} millones</b> de pernoctaciones en alojamientos turísticos en ${a}. Los ${g} suman el ${p}.`,
    t_pern_evol: ["Hoteles, campings y el resto", "Pernoctaciones al año (millones)"],
    tt_noms: { gi: "Hoteles", cat: "Campings", esp: "Apartamentos y turismo rural" },
    h_t_pern_evol: (h, c, a) => `Los hoteles sumaron <b>${h} millones</b> de noches en ${a}; los campings, ${c} millones.`,
    t_estac: ["Cuándo vienen", "Pernoctaciones hoteleras de cada mes (% del año)"],
    h_t_estac: (g, c) => `Julio y agosto concentran <b>el ${g}</b> de las noches de hotel de la provincia. En Cataluña, el ${c}.`,
    t_ocup: ["Ocupación de los hoteles", "Grado de ocupación por plazas, media del año (%)"],
    h_t_ocup: (g, a, c, e) => `Los hoteles de la provincia tuvieron ocupadas <b>el ${g}</b> de las plazas en ${a} (Cataluña, ${c}; España, ${e}).`,
    t_adr: ["Precio de la habitación", "Tarifa media diaria, ADR (€)"],
    h_t_adr: (g, a, c) => `Una habitación de hotel costaba <b>${g} €</b> por noche de media en ${a}. En Cataluña, ${c} €.`,
    t_revpar: ["Ingreso por habitación", "Ingreso por habitación disponible, RevPAR (€)"],
    h_t_revpar: (g, a, c) => `Cada habitación disponible ingresó <b>${g} €</b> por noche de media en ${a} (Cataluña, ${c} €).`,
    t_estada: ["Cuántos días se quedan", "Estancia media en los hoteles (días)"],
    h_t_estada: (g, a, e) => `La estancia media en los hoteles de la provincia es de <b>${g} días</b> (${a}). En España, ${e}.`,
    t_ext: ["Turismo extranjero", "Pernoctaciones hoteleras de residentes en el extranjero (%)"],
    h_t_ext: (g, a) => `<b>El ${g}</b> de las noches de hotel son de turistas extranjeros (${a}).`,
    t_personal: ["Empleo en los alojamientos", "Personas ocupadas, media del año"],
    h_t_personal: (h, c, a) => `Los hoteles de la provincia dan empleo a <b>${h} personas</b> de media (${a}); los campings, a ${c}.`,
    t_punts: ["Destinos", "Noches en hoteles y campings por punto turístico (millones)"],
    h_t_punts: (p, v, a) => `<b>${p}</b> es el primer destino hotelero de la provincia: ${v} millones de noches en ${a}.`,
    t_orig_ext: ["De dónde vienen los extranjeros", "Turistas extranjeros por país (%, telefonía móvil)"],
    h_t_orig_ext: (p, v, n, a) => `<b>${p}</b>: el ${v} de los ${n} millones de visitas de turistas extranjeros de ${a}.`,
    t_orig_nac: ["De dónde vienen los de fuera", "Turistas de otras provincias por comunidad (%, telefonía móvil)"],
    h_t_orig_nac: (p, v, a) => `El ${v} de los turistas españoles de otras provincias son de <b>${p}</b> (${a}).`,
    t_mov_mes: ["Turistas cada mes", "Turistas en la provincia según la telefonía móvil"],
    mov_noms: { gi: "Extranjeros", cat: "De otras provincias" },
    pt_noms: { gi: "Hoteles", cat: "Campings" },
    h_t_mov_mes: (v, d) => `<b>${v}</b> turistas extranjeros en la provincia en ${d}, según la posición de los móviles.`,
    t_gasto_pers: ["Cuánto gastan", "Gasto medio por turista extranjero y viaje (€)"],
    h_t_gasto_pers: (c, a, e) => `Un turista extranjero gasta <b>${c} €</b> por viaje en Cataluña (${a}). En España, ${e} €.`,
    t_gasto_dia: ["Gasto por día", "Gasto medio diario por turista extranjero (€)"],
    h_t_gasto_dia: (c, a, e) => `<b>${c} €</b> al día por turista extranjero en Cataluña (${a}); ${e} € en España.`,
    t_ieet: ["Impuesto turístico", "Recaudación del IEET en las comarcas gerundenses (millones de €)"],
    h_t_ieet: (v, a) => `El impuesto turístico recaudó <b>${v} millones de euros</b> en las comarcas gerundenses en ${a}.`,
    t_ieet_tipus: ["Quién paga el impuesto", "Recaudación del IEET por tipo de alojamiento (millones de €)"],
    h_t_ieet_tipus: (g, v, a) => `Los <b>${g}</b> aportan ${v} millones del impuesto turístico (${a}).`,
    t_places: ["Plazas turísticas", "Plazas por tipo de alojamiento, hoy"],
    h_t_places: (n, p) => `La provincia tiene <b>${n} plazas turísticas</b>, ${p} por cada 100 habitantes.`,
    t_aena: ["Aeropuerto de Girona", "Pasajeros al año (millones)"],
    h_t_aena: (v, a) => `<b>${v} millones</b> de pasajeros en el aeropuerto de Girona en ${a}.`,
    tt: { hotel: "Hoteles", camp: "Campings", apt: "Apartamentos turísticos", rural: "Turismo rural", hut: "Viviendas de uso turístico", llar: "Hogares compartidos", plat: "Pisos de plataformas", alberg: "Albergues", altres: "Otros", creuers: "Cruceros" },
    mesos_c: ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"],
    font_tur: "Fuente: INE, encuestas de ocupación en alojamientos turísticos", font_irsh: "Fuente: INE, indicadores de rentabilidad del sector hotelero",
    font_mov: "Fuente: INE, medición del turismo a partir de la telefonía móvil (estadística experimental)", font_egatur: "Fuente: INE, Egatur (Cataluña y España; no hay dato provincial)",
    font_ieet: "Fuente: Agència Tributària de Catalunya, IEET por comarca", font_reg: "Fuente: Registre de Turisme de Catalunya", font_aena: "Fuente: Aena",
  });
  const ORIG = {
    Francia: ["França", "Francia"], Alemania: ["Alemanya", "Alemania"], "Reino Unido": ["Regne Unit", "Reino Unido"], "Países Bajos": ["Països Baixos", "Países Bajos"],
    "Bélgica": ["Bèlgica", "Bélgica"], Suiza: ["Suïssa", "Suiza"], Italia: ["Itàlia", "Italia"], "Estados Unidos de América": ["Estats Units", "Estados Unidos"], Irlanda: ["Irlanda", "Irlanda"],
    "Cataluña": ["Catalunya (Barcelona, Lleida i Tarragona)", "Cataluña (Barcelona, Lleida y Tarragona)"], "Madrid, Comunidad de": ["Madrid", "Madrid"], "Comunitat Valenciana": ["País Valencià", "Comunidad Valenciana"],
    "Aragón": ["Aragó", "Aragón"], "Andalucía": ["Andalusia", "Andalucía"],
  };
  const MO = {
    furts: ["Furts", "Hurtos"], robatori_forca: ["Robatoris amb força", "Robos con fuerza"], robatori_vehicle: ["Robatoris en vehicles", "Robos en vehículos"],
    robatori_violencia: ["Robatoris amb violència", "Robos con violencia"], estafes: ["Estafes", "Estafas"], danys: ["Danys", "Daños"], lesions: ["Lesions", "Lesiones"],
    amenaces: ["Amenaces i coaccions", "Amenazas y coacciones"], ocupacio: ["Ocupacions d'immobles", "Ocupaciones de inmuebles"], drogues: ["Tràfic de drogues", "Tráfico de drogas"],
    agressions_sexuals: ["Agressions sexuals", "Agresiones sexuales"], alcohol: ["Alcohol o drogues al volant", "Alcohol o drogas al volante"],
    trencament: ["Trencaments de condemna", "Quebrantamientos de condena"],
  };
  const GRUPS_CA = {
    "Alimentos y bebidas no alcohólicas": "Aliments i begudes no alcohòliques", "Bebidas alcohólicas, tabaco y estupefacientes": "Begudes alcohòliques i tabac",
    "Vestido y calzado": "Vestit i calçat", "Vivienda, agua, electricidad, gas y otros combustibles": "Habitatge, aigua, electricitat i gas",
    "Muebles, artículos del hogar y artículos para el mantenimiento corriente del hogar": "Mobles i articles de la llar", "Sanidad": "Sanitat",
    "Transporte": "Transport", "Información y comunicaciones": "Informació i comunicacions", "Actividades recreativas, deporte y cultura": "Oci, esport i cultura",
    "Servicios de educación": "Educació", "Restaurantes y servicios de alojamiento": "Restaurants i allotjament", "Seguros y servicios financieros": "Assegurances i serveis financers",
    "Cuidado personal, protección social, y bienes y servicios diversos": "Cura personal i altres serveis",
  };
  const GRUPS_ES = {
    "Vivienda, agua, electricidad, gas y otros combustibles": "Vivienda, agua, electricidad y gas",
    "Muebles, artículos del hogar y artículos para el mantenimiento corriente del hogar": "Muebles y artículos del hogar",
    "Bebidas alcohólicas, tabaco y estupefacientes": "Bebidas alcohólicas y tabaco",
    "Cuidado personal, protección social, y bienes y servicios diversos": "Cuidado personal y otros servicios",
  };
  const CAUSES = {
    I: ["Malalties infeccioses", "Enfermedades infecciosas"], II: ["Tumors", "Tumores"],
    III: ["Malalties de la sang", "Enfermedades de la sangre"], IV: ["Malalties endocrines i metabòliques", "Enfermedades endocrinas y metabólicas"],
    V: ["Trastorns mentals (demències)", "Trastornos mentales (demencias)"], "VI-VIII": ["Sistema nerviós (Alzheimer…)", "Sistema nervioso (alzhéimer…)"],
    IX: ["Sistema circulatori (cor, ictus)", "Sistema circulatorio (corazón, ictus)"], X: ["Sistema respiratori", "Sistema respiratorio"],
    XI: ["Sistema digestiu", "Sistema digestivo"], XII: ["Pell", "Piel"], XIII: ["Ossos i músculs", "Huesos y músculos"],
    XIV: ["Sistema genitourinari", "Sistema genitourinario"], XVIII: ["Causes mal definides", "Causas mal definidas"],
    XX: ["Causes externes (accidents, suïcidis)", "Causas externas (accidentes, suicidios)"],
  };
  const ATC = {
    antidepressius: ["Antidepressius", "Antidepresivos"], ansiolitics: ["Ansiolítics", "Ansiolíticos"], hipnotics: ["Somnífers i sedants", "Somníferos y sedantes"],
    opioides: ["Opioides", "Opioides"], analgesics: ["Analgèsics (paracetamol, metamizole…)", "Analgésicos (paracetamol, metamizol…)"],
    antibiotics: ["Antibiòtics", "Antibióticos"], antiulcerosos: ["Protectors d'estómac", "Protectores de estómago"],
    colesterol: ["Per al colesterol", "Para el colesterol"], antidiabetics: ["Per a la diabetis", "Para la diabetes"],
    tensio: ["Per a la tensió i el cor", "Para la tensión y el corazón"], respiratoris: ["Inhaladors (asma, MPOC)", "Inhaladores (asma, EPOC)"],
  };
  const ESCA = {
    percepcio: ["Salut bona o molt bona", "Salud buena o muy buena"], pressio: ["Pressió alta", "Tensión alta"], diabetis: ["Diabetis", "Diabetes"],
    exces_pes: ["Excés de pes", "Exceso de peso"], obesitat: ["Obesitat", "Obesidad"], cronica: ["Malaltia crònica", "Enfermedad crónica"],
    dolor: ["Dolor", "Dolor"], benestar: ["Baix benestar emocional", "Bajo bienestar emocional"], depressio: ["Depressió moderada o greu", "Depresión moderada o grave"],
    discapacitat: ["Alguna discapacitat", "Alguna discapacidad"], dependencia: ["Dependència", "Dependencia"],
    tabac: ["Fumen", "Fuman"], activitat: ["Activitat física saludable", "Actividad física saludable"], dormir: ["Dormen les hores recomanades", "Duermen las horas recomendadas"],
    mediterrania: ["Dieta mediterrània", "Dieta mediterránea"], fruita: ["5 racions de fruita o verdura al dia", "5 raciones de fruta o verdura al día"],
    ensucrades: ["Begudes ensucrades cada dia", "Bebidas azucaradas cada día"], a_peu: ["Es mouen a peu o en bici", "Se mueven a pie o en bici"],
    transport: ["Es mouen en transport públic", "Se mueven en transporte público"],
    visita: ["Han anat al metge (12 mesos)", "Han ido al médico (12 meses)"], medicaments: ["Prenen medicaments receptats", "Toman medicamentos recetados"],
    urgencies: ["Han anat a urgències (12 mesos)", "Han ido a urgencias (12 meses)"], hospital: ["Ingressats a l'hospital (12 mesos)", "Ingresados en el hospital (12 meses)"],
    doble: ["Tenen mútua privada", "Tienen mutua privada"], satisfaccio: ["Satisfets amb la sanitat pública", "Satisfechos con la sanidad pública"],
    mental: ["Probable problema de salut mental", "Probable problema de salud mental"], oci_actiu: ["Oci actiu", "Ocio activo"], oci_sed: ["Oci sedentari", "Ocio sedentario"],
    hipercalorics: ["Menjar hipercalòric sovint", "Comida hipercalórica a menudo"], dents: ["Es renten les dents 2 cops al dia", "Se lavan los dientes 2 veces al día"],
  };
  const MATERIES = { pcat: ["Català", "Catalán"], pcast: ["Castellà", "Castellano"], pang: ["Anglès", "Inglés"], pmat: ["Matemàtiques", "Matemáticas"], pcien: ["Ciències", "Ciencias"] };
  const tp = (k, ...a) => { const v = TP[LANG][k]; return typeof v === "function" ? v(...a) : v; };
  // Ampliaciones de otras secciones (demografia.js): textos, nombres de grupo y titulares propios
  const EXT = { grup: [], titular: [] };
  const nomGrup = (g, c) => EXT.grup.reduce((r, f) => r || f(g, c), null) || nomGrup0(g, c);
  const nomGrup0 = (g, c) => (c && /^a[sn]:/.test(c) ? tp("ag")[c.slice(3)] || g : c && c.startsWith("ae:") ? `${c.slice(3)} ${tp("anys_edat")}` : c && c.startsWith("cu:") ? tp("cu")[c.slice(3)] || g : c && c.startsWith("hu:") ? tp("hu")[c.slice(3)] || g : c && c.startsWith("esca:") ? (ESCA[c.slice(5)] || [g, g])[LANG === "ca" ? 0 : 1] : c && c.startsWith("tt:") ? tp("tt")[c.slice(3)] || g : c && c.startsWith("mes:") ? tp("mesos_c")[+c.slice(4) - 1] : c && c.startsWith("or:") ? (ORIG[c.slice(3)] || [g, g])[LANG === "ca" ? 0 : 1] : c && c.startsWith("atc:") ? (ATC[c.slice(4)] || [g, g])[LANG === "ca" ? 0 : 1] : c && c.startsWith("mo:") ? (MO[c.slice(3)] || [g, g])[LANG === "ca" ? 0 : 1] : c && c.startsWith("z:") ? tp("z_" + c.slice(2)) : c && c.startsWith("pais:") ? nomPais(c.slice(5)) : c && MATERIES[c] ? MATERIES[c][LANG === "ca" ? 0 : 1] : c && CAUSES[c] ? CAUSES[c][LANG === "ca" ? 0 : 1] : LANG === "ca" ? GRUPS_CA[g] || g : GRUPS_ES[g] || g);
  const nomSerie = (sp, k) => (sp.noms ? tp(sp.noms + "_noms")[k] : tp(k));
  const unitat = (sp) => (sp.u === "%" ? " %" : sp.u === "€" ? " €" : sp.u === "M" ? " M" : sp.u === "dies" ? " " + tp("dies") : sp.u === "W" ? " W" : sp.u === "m²" ? " m²" : "");
  const etiqueta = (e) => {
    const m = /^(\d{4})-(\d{2})$/.exec(e); if (m) return `${tp("mesos")[+m[2] - 1]} ${m[1]}`;
    const q = /^(\d{4})T(\d)$/.exec(e); if (q) return `${q[2]}T ${q[1]}`;
    const d = /^(\d{4})-(\d{2})-(\d{2})$/.exec(e); if (d) return `${+d[3]} ${tp("mesos")[+d[2] - 1].slice(0, 3)}. ${d[1]}`;
    return e;
  };
  const NS = "http://www.w3.org/2000/svg";
  const nou = (tag, at, pare) => { const e = document.createElementNS(NS, tag); Object.entries(at).forEach(([k, v]) => e.setAttribute(k, v)); if (pare) pare.appendChild(e); return e; };
  const ORDRE = ["esp", "cat", "gi"];

  function linia(cont, sp) {
    cont.innerHTML = "";
    const claus = ORDRE.filter((k) => sp.series[k] && sp.series[k].length);
    if (!claus.length) return;
    const pts = claus.flatMap((k) => sp.series[k]);
    const ymax = Math.max(...pts.map((p) => Math.abs(p[2])));
    const W = Math.max(280, cont.clientWidth || 520), H = W < 440 ? 210 : 240, m = { t: 14, r: ymax >= 1e5 ? 58 : 46, b: 24, l: ymax >= 1e5 ? 52 : ymax >= 1e3 ? 42 : 34 };
    const x0 = Math.min(...pts.map((p) => p[0])), x1 = Math.max(...pts.map((p) => p[0]));
    let y0 = Math.min(...pts.map((p) => p[2])), y1 = Math.max(...pts.map((p) => p[2]));
    if (sp.u === "%" && y0 > 0 && sp.zero !== false) y0 = 0;
    const pas = (() => { const r = (y1 - y0) / 4, p = Math.pow(10, Math.floor(Math.log10(r || 1))); return [1, 2, 2.5, 5, 10].map((k) => k * p).find((k) => k >= r); })();
    y0 = Math.floor(y0 / pas) * pas; y1 = Math.ceil(y1 / pas) * pas;
    const X = (x) => m.l + ((x - x0) / (x1 - x0 || 1)) * (W - m.l - m.r), Y = (y) => m.t + (1 - (y - y0) / (y1 - y0 || 1)) * (H - m.t - m.b);
    const svg = nou("svg", { viewBox: `0 0 ${W} ${H}`, class: "pg", role: "img" }, cont);
    for (let v = y0; v <= y1 + 1e-9; v += pas) {
      nou("line", { x1: m.l, x2: W - m.r, y1: Y(v), y2: Y(v), class: (sp.u === "idx" && Math.abs(v - 100) < 1e-9) || (sp.u === "%" && v === 0) ? "pg-ref" : "pg-g" }, svg);
      nou("text", { x: m.l - 6, y: Y(v) + 3.5, "text-anchor": "end", class: "pg-t" }, svg).textContent = fmt(v, pas < 1 ? 1 : 0);
    }
    const anys = []; for (let a = Math.ceil(x0); a <= Math.floor(x1); a++) anys.push(a);
    const salt = Math.ceil(anys.length / (W < 440 ? 4 : 7));
    anys.forEach((a, i) => { if (i % salt === 0) nou("text", { x: X(a), y: H - 6, "text-anchor": "middle", class: "pg-t" }, svg).textContent = a; });
    claus.forEach((k) => {
      const s = sp.series[k];
      nou("polyline", { points: s.map((p) => `${X(p[0]).toFixed(1)},${Y(p[2]).toFixed(1)}`).join(" "), class: `pg-l pg-${k}` }, svg);
      const u = s[s.length - 1];
      nou("circle", { cx: X(u[0]), cy: Y(u[2]), r: 3.5, class: `pg-p pg-${k}` }, svg);
    });
    // Etiquetas finales, separadas si se solapan
    const fins = claus.map((k) => { const u = sp.series[k][sp.series[k].length - 1]; return { k, y: Y(u[2]), v: u[2] }; }).sort((a, b) => a.y - b.y);
    for (let i = 1; i < fins.length; i++) if (fins[i].y - fins[i - 1].y < 12) fins[i].y = fins[i - 1].y + 12;
    fins.forEach((f) => { nou("text", { x: W - m.r + 6, y: f.y + 3.5, class: `pg-e pg-${f.k}` }, svg).textContent = fmt(f.v, sp.dec); });
    // Hover
    const guia = nou("line", { y1: m.t, y2: H - m.b, class: "pg-guia", visibility: "hidden" }, svg);
    const zona = nou("rect", { x: m.l, y: m.t, width: W - m.l - m.r, height: H - m.t - m.b, fill: "transparent" }, svg);
    const xs = [...new Set(pts.map((p) => p[0]))].sort((a, b) => a - b);
    zona.addEventListener("pointermove", (ev) => {
      const r = svg.getBoundingClientRect(), px = ((ev.clientX - r.left) / r.width) * W;
      const x = xs.reduce((b, c) => (Math.abs(X(c) - px) < Math.abs(X(b) - px) ? c : b));
      guia.setAttribute("x1", X(x)); guia.setAttribute("x2", X(x)); guia.setAttribute("visibility", "visible");
      let html = "", et = "";
      claus.slice().reverse().forEach((k) => { const p = sp.series[k].find((q) => q[0] === x); if (p) { et = p[1]; html += `<br><i class="pg-dot pg-${k}"></i>${nomSerie(sp, k)}: <b>${fmt(p[2], sp.dec)}${unitat(sp)}</b>`; } });
      mostraTip(`<b>${etiqueta(et)}</b>${html}`, ev.clientX, ev.clientY);
    });
    zona.addEventListener("pointerleave", () => { guia.setAttribute("visibility", "hidden"); amagaTip(); });
  }

  function barres(cont, sp) {
    const gs = sp.grups; if (!gs || !gs.length) { cont.innerHTML = ""; return; }
    const ks = sp.claus || ["gi", "esp"];
    const mx = Math.max(...gs.flatMap((g) => ks.map((k) => Math.abs(g[k])))) || 1;
    const fv = (v) => (sp.u === "%" ? pct(v, 1) : fmt(v, sp.dec));
    const b = (v, k) => v == null ? "" : `<span class="pb-b"><b class="pg-bg-${k}" style="width:${(Math.abs(v) / mx) * 100}%"></b><em>${fv(v)}</em></span>`;
    cont.innerHTML = `<div class="pb">${gs.map((g) => `<div class="pb-fila"><span class="pb-nom">${nomGrup(g.g, g.c)}${g.n != null ? ` <small class="pb-n">${fmt(g.n)} ${tp(sp.nu || "pac")}</small>` : ""}${g.s ? ` <small class="pb-n pb-s${g.s > 0 ? "m" : "n"}">${g.s > 0 ? "▲ " + tp("sig_mes") : "▼ " + tp("sig_menys")}</small>` : ""}</span><span class="pb-barres">${ks.map((k) => b(g[k], k)).join("")}</span></div>`).join("")}</div>`;
  }

  const delta = (idx) => { const d = idx - 100; return d < 0 ? tp("menys", pct(-d, 0)) : tp("mes", pct(d, 0)); };
  const ult = (sp, k) => { const s = sp.series && sp.series[k]; return s && s.length ? s[s.length - 1] : null; };

  function titular(id, sp, P) {
    for (const f of EXT.titular) { const r = f(id, sp, P); if (r != null) return r; }
    if (id === "ipc") { const g = ult(sp, "gi"), c = ult(sp, "cat"), e = ult(sp, "esp"); return g ? tp("h_ipc", pct(g[2], 1), pct(c && c[2], 1), pct(e && e[2], 1), etiqueta(g[1])) : ""; }
    if (id === "paro") { const g = ult(sp, "gi"), e = ult(sp, "esp"); return g ? tp("h_paro", pct(g[2], 1), pct(e && e[2], 1), etiqueta(g[1])) : ""; }
    if (id === "ipc_grups") { const g = sp.grups[0]; return g ? tp("h_ipc_grups", nomGrup(g.g), pct(g.gi, 1), g.any) : ""; }
    if (id === "turisme") { const g = ult(sp, "gi"); return g && P.pernoct_total ? tp("h_turisme", pct(g[2], 0), g[1], fmt(P.pernoct_total.v / 1e6, 1) + " M") : ""; }
    if (["compra", "societats"].includes(id)) { const g = ult(sp, "gi"), c = ult(sp, "cat"), e = ult(sp, "esp"); return g ? tp(`h_${id}`, fmt(sp.abs.gi), sp.any, delta(g[2]), delta(c[2]), delta(e[2])) : ""; }
    if (id === "hipoteques") { const g = ult(sp, "gi"), e = ult(sp, "esp"); return g ? tp("h_hipoteques", fmt(sp.abs.gi), sp.any, delta(g[2]), delta(e[2])) : ""; }
    if (id === "hipoteca_mitjana") { const g = ult(sp, "gi"), e = ult(sp, "esp"); return g ? tp("h_hipoteca_mitjana", fmt(g[2]), fmt(e && e[2]), g[1]) : ""; }
    if (id === "causes") { const g = sp.grups[0]; return g ? tp("h_causes", fmt(sp.total), sp.any, nomGrup(g.g, g.c), pct(g.gi, 1)) : ""; }
    if (id === "destins") { const g = ult(sp, "gi"), l = ult(sp, "cat"); return g ? tp("h_destins", fmt(g[2], 1), g[1], fmt(l && l[2], 1)) : ""; }
    if (id === "comp_4eso" || id === "comp_6e") { const g = ult(sp, "gi"), c = ult(sp, "cat"); return g ? tp("h_comp", fmt(g[2], 1), fmt(c && c[2], 1), g[1], tp(id === "comp_4eso" ? "n4eso" : "n6e")) : ""; }
    if (id === "comp_4eso_mat") { const g = [...sp.grups].sort((a, b) => b.gi - a.gi)[0]; return g ? tp("h_comp_mat", nomGrup(g.g, g.c), fmt(g.gi, 1), sp.any) : ""; }
    if (id === "edu_publica_prov") { const g = ult(sp, "gi"), c = ult(sp, "cat"); return g ? tp("h_publica", pct(g[2], 0), pct(c && c[2], 0), g[1], fmt(sp.abs && sp.abs.n)) : ""; }
    if (id === "univ_fora_prov") { const g = ult(sp, "gi"); const g0 = sp.series.gi[0]; return g && sp.abs ? tp("h_univ", pct(g[2], 0), fmt(sp.abs.fora), fmt(sp.abs.residents), sp.abs.curs, pct(g0[2], 0), g0[1]) : ""; }
    if (id === "nac_prov") { const g = sp.grups[0]; return g ? tp("h_nac_prov", fmt(sp.total), sp.any, nomPais(g.c.slice(5)), pct(g.gi, 1)) : ""; }
    if (id === "solar") { const g = ult(sp, "gi"), c = ult(sp, "cat"); return g && sp.abs ? tp("h_solar", fmt(g[2]), fmt(c && c[2]), fmt(sp.abs.n), fmt(sp.abs.kw / 1000, 0), etiqueta(sp.abs.mes)) : ""; }
    if (id === "cad_viv") { const g = ult(sp, "gi"), c = ult(sp, "cat"), e = ult(sp, "esp"), g0 = sp.series.gi[0]; const d = g && g0 ? (g[2] / g0[2] - 1) * 100 : null; return g ? tp("h_cad_viv", fmt(g[2]), g[1], fmt(c && c[2]), fmt(e && e[2]), d == null ? "" : d < 0 ? tp("menys", pct(-d, 0)) : tp("mes", pct(d, 0))) : ""; }
    if (id === "hb_ini") { const g = ult(sp, "gi"), c = ult(sp, "cat"); return g && sp.abs ? tp("h_hb_ini", fmt(g[2], 1), g[1], fmt(sp.abs.ini), fmt(c && c[2], 1), sp.max ? fmt(sp.max[1]) : "–", sp.max ? sp.max[0] : "–", sp.max ? pct((sp.abs.ini / sp.max[1]) * 100, 0) : "–") : ""; }
    if (id === "hb_aca") { const g = ult(sp, "gi"), c = ult(sp, "cat"), h = P.hb_ini; return g && h && h.abs ? tp("h_hb_aca", fmt(g[2], 1), g[1], fmt(h.abs.aca), fmt(c && c[2], 1)) : ""; }
    if (id === "hb_hpo") { const g = ult(sp, "gi"), c = ult(sp, "cat"); return g ? tp("h_hb_hpo", pct(g[2], 1), pct(c && c[2], 1), g[1]) : ""; }
    if (id === "hb_ced") { const g = ult(sp, "gi"), c = ult(sp, "cat"); return g && sp.abs ? tp("h_hb_ced", fmt(sp.abs.n), g[1], fmt(g[2], 1), fmt(c && c[2], 1)) : ""; }
    if (id === "hb_m2") { const g = ult(sp, "gi"), c = ult(sp, "cat"); return g ? tp("h_hb_m2", fmt(g[2]), fmt(c && c[2]), g[1]) : ""; }
    if (id === "hb_ihb") { const g = ult(sp, "gi"); return g && sp.abs ? tp("h_hb_ihb", fmt(sp.abs.n), g[1], fmt(sp.abs.n0), sp.abs.a0) : ""; }
    if (id === "hb_sol") { const g = sp.grups.find((x) => x.g === "su"), p = sp.abs && sp.abs.plan; return g && p ? tp("h_hb_sol", pct(g.gi, 1), sp.any, fmt(p.pend), fmt(p.pend_viv, 1)) : ""; }
    if (id === "cad_ibi") { const g = ult(sp, "gi"), c = ult(sp, "cat"), e = ult(sp, "esp"), d = sp.abs && sp.abs.desoc; return g ? tp("h_cad_ibi", fmt(g[2]), g[1], fmt(c && c[2]), fmt(e && e[2]), d ? d[0] : null, d ? d[1] : null) : ""; }
    if (id === "cad_usos") { const g = sp.grups[0]; return g && sp.res ? tp("h_cad_usos", pct(sp.res.gi, 0), sp.any, nomGrup(g.g, g.c), pct(g.gi, 1)) : ""; }
    if (id === "esperanca") { const g = ult(sp, "gi"), d = ult(sp, "cat"), h = ult(sp, "esp"); return g ? tp("h_esperanca", fmt(g[2], 1), g[1], fmt(d && d[2], 1), fmt(h && h[2], 1)) : ""; }
    if (id === "mossos_mes") { const g = ult(sp, "gi"); const a = sp.abs || {}; return g && a.n12 ? tp("h_mossos_mes", fmt(a.n12), etiqueta(g[1]), a.n12_ant ? delta((a.n12 / a.n12_ant) * 100) : "") : ""; }
    if (id === "rp_fets") { const i = sp.grups.findIndex((x) => x.g === "Girona"); const ords = LANG === "ca" ? ["primera", "segona", "tercera", "quarta", "cinquena", "sisena", "setena", "vuitena", "novena"] : ["primera", "segunda", "tercera", "cuarta", "quinta", "sexta", "séptima", "octava", "novena"]; return i >= 0 ? tp("h_rp_fets", ords[i] || i + 1, fmt(sp.grups[i].gi, 1), fmt(sp.abs.cat, 1)) : ""; }
    if (id === "rp_tipus") { const g = sp.grups[0]; return g ? tp("h_rp_tipus", nomGrup(g.g, g.c), fmt(g.gi, 1), fmt(g.cat, 1)) : ""; }
    if (id === "int_munis") { const g = sp.grups[0], p = sp.grups.find((x) => x.c === "z:gi"); return g && !g.c ? tp("h_int_munis", g.g, fmt(g.gi, 1), sp.abs.any, p ? fmt(p.gi, 1) : "–") : ""; }
    if (id === "llancaments") { const a = sp.abs || {}; return a.n4 ? tp("h_llancaments", fmt(a.n4), a.fins, a.n4_ant ? delta((a.n4 / a.n4_ant) * 100) : "") : ""; }
    if (id === "llanc_tipus") { const l = ult(sp, "gi"), h = ult(sp, "cat"), o = ult(sp, "esp"); return l ? tp("h_llanc_tipus", fmt(l[2]), fmt(l[2] + (h ? h[2] : 0) + (o ? o[2] : 0)), etiqueta(l[1])) : ""; }
    if (id === "vdg") { const g = ult(sp, "gi"), e = ult(sp, "esp"), a = sp.abs || {}; return g ? tp("h_vdg", fmt(a.n), a.per, fmt(g[2], 1), fmt(e && e[2], 1)) : ""; }
    if (/^le_(quir|ext|diag)$/.test(id)) { const g = ult(sp, "gi"), c = ult(sp, "cat"); return g ? tp(`h_${id}`, fmt(g[2]), fmt(c && c[2]), etiqueta(g[1]), fmt(sp.abs.pacients)) : ""; }
    if (id === "le_pacients") { const s_ = sp.series.gi, g = s_[s_.length - 1], a = s_.find((p) => p[1] === `${+g[1].slice(0, 4) - 1}${g[1].slice(4)}`); if (!g) return ""; const d = a ? (g[2] / a[2] - 1) * 100 : null; return tp("h_le_pacients", fmt(g[2]), etiqueta(g[1]), d == null ? "" : d < 0 ? tp("menys_q", pct(-d, 0)) : tp("mes_q", pct(d, 0))); }
    if (/_hosp$/.test(id)) { const gs = sp.grups; return gs.length > 1 ? tp("h_le_hosp", gs[0].g, fmt(gs[0].gi), gs[gs.length - 1].g, fmt(gs[gs.length - 1].gi)) : ""; }
    if (/^le_.*_proc$/.test(id)) { const g = sp.grups[0]; return g ? tp("h_le_proc", g.g, fmt(g.n), fmt(g.gi), fmt(g.cat)) : ""; }
    if (id === "rec_hab" || id === "rec_euros") { const g = ult(sp, "gi"), c = ult(sp, "cat"); return g ? tp(`h_${id}`, fmt(g[2], id === "rec_hab" ? 1 : 0), g[1], fmt(c && c[2], id === "rec_hab" ? 1 : 0)) : ""; }
    if (id === "rec_grups") { const g = sp.grups[0]; return g ? tp("h_rec_grups", nomGrup(g.g, g.c), fmt(g.gi, 1), fmt(g.cat, 1)) : ""; }
    if (id === "inf_setm" || id === "grip_setm") { const g = ult(sp, "gi"), c = ult(sp, "cat"); return g ? tp("h_inf", fmt(g[2]), tp("setmana", etiqueta(g[1])), fmt(c && c[2])) : ""; }
    if (/^t_/.test(id)) return titularTur(id, sp);
    if (id === "esca_salut") { const g = sp.grups.find((x) => x.g === "percepcio"); return g ? tp("h_esca", fmt(g.gi, 0), sp.any, fmt(g.cat, 0)) : ""; }
    if (id === "esca_habits" || id === "esca_serveis") { const d = sp.grups.filter((x) => x.s); return d.length ? tp("h_esca_dif", d.map((x) => `${nomGrup(x.g, x.c).charAt(0).toLowerCase() + nomGrup(x.g, x.c).slice(1)}, ${pct(x.gi, 0)} ${tp("davant")} ${pct(x.cat, 0)}`).join("; "), sp.any) : ""; }
    if (id === "esca_infants") { const g = sp.grups.find((x) => x.g === "exces_pes"); return g ? tp("h_esca_infants", pct(g.gi, 0), pct(g.cat, 0)) : ""; }
    if (id === "esca_evol") { const t_ = sp.series.gi, o = sp.series.cat; if (!t_ || !o || !t_.length || !o.length) return ""; const u = t_[t_.length - 1]; return tp("h_esca_evol", u[1], pct(u[2], 0), pct(t_[0][2], 0), pct(o[o.length - 1][2], 0), pct(o[0][2], 0)); }
    if (/^at_/.test(id)) return titularAeat(id, sp);
    if (id === "execucions") { const g = ult(sp, "gi"); return g ? tp("h_execucions", fmt(sp.abs.gi), sp.any, delta(g[2])) : ""; }
    return "";
  }

  function titularAeat(id, sp) {
    const g = ult(sp, "gi"), c = ult(sp, "cat"), e = ult(sp, "esp"), gs = sp.grups || [];
    if (id === "at_renda" && g) { const g0 = sp.series.gi[0], d = (g[2] / g0[2] - 1) * 100; return tp("h_at_renda", fmt(g[2]), g[1], fmt(c && c[2]), fmt(e && e[2]), d < 0 ? tp("menys", pct(-d, 0)) : tp("mes", pct(d, 0))); }
    if (id === "at_salari" && g) return tp("h_at_salari", fmt(g[2]), g[1], fmt(c && c[2]), fmt(e && e[2]));
    if (id === "at_bretxa" && g) { const g0 = sp.series.gi[0]; return tp("h_at_bretxa", pct(g[2], 1), g[1], pct(g0[2], 1), g0[1]); }
    if (id === "at_sectors" && gs.length > 1) { const a = gs[0], b = gs[gs.length - 1]; return tp("h_at_sectors", nomGrup(a.g, a.c).toLowerCase(), fmt(a.gi), nomGrup(b.g, b.c).toLowerCase(), fmt(b.gi), sp.any); }
    if (id === "at_qui") { const es = gs.find((x) => x.g === "espanyols"), ex = gs.find((x) => x.g === "estrangers"); return es && ex && es.gi ? tp("h_at_qui", pct((1 - ex.gi / es.gi) * 100, 0), fmt(sp.abs && sp.abs.n), sp.any) : ""; }
    if (id === "at_pensio" && g) { const a = sp.abs || {}; return tp("h_at_pensio", fmt(g[2]), g[1], fmt(c && c[2]), fmt(a.n), fmt(a.h_gi), fmt(a.d_gi)); }
    if (id === "at_tipus" && g) return tp("h_at_tipus", pct(g[2], 1), g[1], pct(c && c[2], 1), pct(e && e[2], 1));
    if (id === "at_nac") { const n = gs.find((x) => x.g === "nacionals"), x = gs.find((y) => y.g === "estrangers"); return n && x ? tp("h_at_nac", pct(sp.abs.ext, 0), fmt(n.gi), fmt(x.gi), sp.any) : ""; }
    return "";
  }

  function titularTur(id, sp) {
    const g = ult(sp, "gi"), c = ult(sp, "cat"), e = ult(sp, "esp"), gs = sp.grups || [];
    const d0 = (v) => fmt(v, 0), d1 = (v) => fmt(v, 1);
    if (id === "t_pern_idx" && g) return tp("h_t_pern_idx", d1(sp.abs.gi / 1e6), g[1], delta(g[2]));
    if (id === "t_pern_tipus" && gs.length) return tp("h_t_pern_tipus", d1(sp.total), sp.any, nomGrup(gs[0].g, gs[0].c).toLowerCase(), pct((gs[0].gi / sp.total) * 100, 0));
    if (id === "t_pern_evol" && g) return tp("h_t_pern_evol", d1(g[2]), c ? d1(c[2]) : "–", g[1]);
    if (id === "t_estac" && gs.length >= 8) { const s = (k) => (gs[6][k] || 0) + (gs[7][k] || 0); return tp("h_t_estac", pct(s("gi"), 0), pct(s("cat"), 0)); }
    if (id === "t_ocup" && g) return tp("h_t_ocup", pct(g[2], 0), g[1], c ? pct(c[2], 0) : "–", e ? pct(e[2], 0) : "–");
    if ((id === "t_adr" || id === "t_revpar") && g) return tp("h_" + id, d0(g[2]), g[1], c ? d0(c[2]) : "–");
    if (id === "t_estada" && g) return tp("h_t_estada", fmt(g[2], 1), g[1], e ? fmt(e[2], 1) : "–");
    if (id === "t_ext" && g) return tp("h_t_ext", pct(g[2], 0), g[1]);
    if (id === "t_personal" && g) return tp("h_t_personal", d0(g[2]), c ? d0(c[2]) : "–", g[1]);
    if (id === "t_punts" && gs.length) { const g = [...gs].sort((a, b) => (b.gi || 0) - (a.gi || 0))[0]; return tp("h_t_punts", g.g, fmt(g.gi, 1), sp.any); }
    if (id === "t_orig_ext" && gs.length) return tp("h_t_orig_ext", nomGrup(gs[0].g, gs[0].c), pct(gs[0].gi, 0), fmt(sp.total / 1e6, 1), sp.any);
    if (id === "t_orig_nac" && gs.length) return tp("h_t_orig_nac", nomGrup(gs[0].g, gs[0].c), pct(gs[0].gi, 0), sp.any);
    if (id === "t_mov_mes" && g) return tp("h_t_mov_mes", d0(g[2]), etiqueta(g[1]));
    if ((id === "t_gasto_pers" || id === "t_gasto_dia") && c) return tp("h_" + id, d0(c[2]), c[1], e ? d0(e[2]) : "–");
    if (id === "t_ieet" && g) return tp("h_t_ieet", fmt(g[2], 1), g[1]);
    if (id === "t_ieet_tipus" && gs.length) return tp("h_t_ieet_tipus", nomGrup(gs[0].g, gs[0].c).toLowerCase(), fmt(gs[0].gi, 1), sp.any);
    if (id === "t_places" && sp.total) return tp("h_t_places", d0(sp.total), D.tur.t_resum && D.tur.t_resum.pob ? d0((sp.total / D.tur.t_resum.pob) * 100) : "–");
    if (id === "t_aena" && g) return tp("h_t_aena", fmt(g[2], 2), g[1]);
    return "";
  }

  function pintaGrafics(cont, P, ids, font) {
    if (!cont || !P) return;
    ids = ids.filter((k) => P[k] && (P[k].tipus === "barres" ? P[k].grups && P[k].grups.length : P[k].series && Object.values(P[k].series).some((x) => x && x.length)));
    cont.innerHTML = ids.map((id) => {
      const sp = P[id];
      const claus = sp.tipus === "barres" ? sp.claus || ["gi", "esp"] : ORDRE.filter((k) => sp.series[k] && sp.series[k].length).reverse();
      return `<figure class="pg-fig" data-id="${id}">
        <figcaption><span class="pg-tit">${tp(id)[0]}</span><span class="unitat">${tp(id)[1]}</span></figcaption>
        <p class="pg-h">${titular(id, sp, P)}</p>
        <p class="pg-lleg">${claus.map((k) => `<span><i class="pg-dot pg-${k}"></i>${nomSerie(sp, k)}</span>`).join("")}</p>
        <div class="pg-c"></div>
        <p class="pg-font">${tp(font(id))}</p></figure>`;
    }).join("");
    cont.querySelectorAll(".pg-fig").forEach((f) => {
      const sp = P[f.dataset.id], c = f.querySelector(".pg-c");
      if (sp.tipus === "barres") barres(c, sp); else linia(c, sp);
    });
  }

  window.PG = {
    pintaGrafics, etiqueta,
    textos: (ca, es) => { Object.assign(TP.ca, ca); Object.assign(TP.es, es); },
    grup: (f) => EXT.grup.push(f), titular: (f) => EXT.titular.push(f),
  };

  window.pintaSeccioProv = () => {
    const ids = ["ipc", "paro", "ipc_grups", "compra", "hipoteques", "hipoteca_mitjana", "societats", "execucions", "causes", "esperanca", "solar", "hb_ini", "hb_aca", "hb_hpo", "hb_ced", "hb_m2", "hb_ihb", "hb_sol", "cad_viv", "cad_ibi", "cad_usos", "at_renda", "at_tipus", "at_nac", "at_salari", "at_sectors", "at_qui", "at_bretxa", "at_pensio", "edu_publica_prov", "univ_fora_prov", "comp_4eso", "comp_4eso_mat", "comp_6e", "nac_prov", "mossos_mes", "rp_fets", "rp_tipus", "int_munis", "llancaments", "llanc_tipus", "vdg"];
    pintaGrafics(document.getElementById("prov-grafics"), D.prov, ids, (id) => (/^(mossos_mes|rp_)/.test(id) ? "font_mossos" : id === "int_munis" ? "font_interior" : /^(llanc|vdg)/.test(id) ? "font_cgpj" : id === "causes" ? "font_causes" : id === "solar" ? "font_sol" : /^cad_/.test(id) ? "font_cad" : /^hb_/.test(id) ? "font_hab" : /^at_/.test(id) ? "font_aeat" : id === "univ_fora_prov" ? "font_univ" : id === "nac_prov" ? "font_nac" : /^(comp_|edu_)/.test(id) ? "font_edu" : "font"));
  };

  window.pintaSeccioTurisme = () => {
    const T = { ...(D.tur || {}), ...(D.prov && D.prov.destins ? { destins: D.prov.destins } : {}) }, sec = document.getElementById("s-tur");
    if (!T || !Object.keys(T).length) { if (sec) sec.hidden = true; return; }
    const ids = ["t_places", "t_pern_tipus", "t_pern_idx", "t_pern_evol", "t_estac", "t_mov_mes", "t_orig_ext", "t_orig_nac", "t_ext", "t_punts", "destins", "t_ocup", "t_estada", "t_adr", "t_revpar", "t_gasto_pers", "t_gasto_dia", "t_ieet", "t_ieet_tipus", "t_personal", "t_aena"];
    const font = (id) => (/^t_(adr|revpar)$/.test(id) ? "font_irsh" : /^t_(orig|mov)/.test(id) ? "font_mov" : /^t_gasto/.test(id) ? "font_egatur" : /^t_ieet/.test(id) ? "font_ieet" : id === "t_places" ? "font_reg" : id === "t_aena" ? "font_aena" : "font_tur");
    pintaGrafics(document.getElementById("tur-grafics"), T, ids, font);
    if (window.xifresTurisme) window.xifresTurisme(document.getElementById("tur-xifres"));
  };

  window.pintaSeccioSalut = () => {
    const S = D.salut;
    const sec = document.getElementById("s-salut");
    if (!S || !Object.keys(S).length) { if (sec) sec.hidden = true; return; }
    ["le_quir_hosp", "le_ext_hosp", "le_diag_hosp"].forEach((k) => { if (S[k]) S[k].noms = "hosp"; });
    if (S.le_pacients) S.le_pacients.noms = "rgi";
    const ids = ["le_quir", "le_quir_hosp", "le_quir_proc", "le_pacients", "le_ext", "le_ext_hosp", "le_ext_proc", "le_diag", "le_diag_hosp", "le_diag_proc", "rec_hab", "rec_euros", "rec_grups", "inf_setm", "grip_setm", "esca_salut", "esca_habits", "esca_serveis", "esca_infants", "esca_evol"];
    pintaGrafics(document.getElementById("salut-grafics"), S, ids, (id) => (/^le_/.test(id) ? "font_le" : /^rec_/.test(id) ? "font_rec" : /^esca_/.test(id) ? "font_esca" : "font_inf"));
  };
})();
