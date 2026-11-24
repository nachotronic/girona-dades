"use strict";
/* Catálogo de los Indicadores Urbanos del INE (Urban Audit) que se muestran: clave de los datos (m.ua, D.ua.z),
   ámbito, etiquetas [corta, completa] en catalán y castellano, formato y si va al mapa.
   Lo usan mapa.js (tema «urb») y urbans.js (sección «Les ciutats» y ficha). Se carga antes que mapa.js. */
window.UA_AMB = {
  dem: ["Població", "Población"], soc: ["Llars, habitatge i seguretat", "Hogares, vivienda y seguridad"],
  eco: ["Treball i renda", "Trabajo y renta"], edu: ["Educació", "Educación"], sol: ["Sòl", "Suelo"],
  mob: ["Anar a treballar", "Ir a trabajar"], tur: ["Turisme", "Turismo"],
};
// [clave, ámbito, ca, es, formato, mapa]  formato: n0 n1 n2 p1 e0 m2 a1 t1 t2 min
window.UA_CAT = [
  ["u21523", "dem", ["Població", "Població resident"], ["Población", "Población residente"], "n0", 1],
  ["u_dens", "dem", ["Densitat", "Habitants per km²"], ["Densidad", "Habitantes por km²"], "n0", 1],
  ["u23121", "dem", ["Edat mediana", "Edat mediana de la població (anys)"], ["Edad mediana", "Edad mediana de la población (años)"], "a1", 1],
  ["u292631", "dem", ["Menors de 15 anys", "Població de 0 a 14 anys (%)"], ["Menores de 15 años", "Población de 0 a 14 años (%)"], "p1", 1],
  ["u292633", "dem", ["65 anys o més", "Població de 65 anys o més (%)"], ["65 años o más", "Población de 65 años o más (%)"], "p1", 1],
  ["u292636", "dem", ["Nascuts a l'estranger", "Població nascuda a l'estranger (%)"], ["Nacidos en el extranjero", "Población nacida en el extranjero (%)"], "p1", 1],
  ["u292637", "dem", ["Estrangers", "Població de nacionalitat estrangera (%)"], ["Extranjeros", "Población de nacionalidad extranjera (%)"], "p1", 1],
  ["u292644", "dem", ["Natalitat", "Naixements per 1.000 habitants"], ["Natalidad", "Nacimientos por 1.000 habitantes"], "t2", 1],
  ["u292645", "dem", ["Mortalitat", "Defuncions per 1.000 habitants"], ["Mortalidad", "Defunciones por 1.000 habitantes"], "t2", 1],
  ["u312422", "dem", ["Esperança de vida", "Esperança de vida en néixer (anys)"], ["Esperanza de vida", "Esperanza de vida al nacer (años)"], "a1", 0],
  ["u321950", "dem", ["Fills per dona", "Nombre mitjà de fills per dona"], ["Hijos por mujer", "Número medio de hijos por mujer"], "n2", 0],
  ["u292638", "soc", ["Llars", "Nombre de llars"], ["Hogares", "Número de hogares"], "n0", 1],
  ["u292639", "soc", ["Mida de les llars", "Persones per llar"], ["Tamaño de los hogares", "Personas por hogar"], "n2", 1],
  ["u292640", "soc", ["Llars d'una persona", "Llars unipersonals (% de les llars)"], ["Hogares de una persona", "Hogares unipersonales (% de los hogares)"], "p1", 1],
  ["u292641", "soc", ["Habitatges", "Habitatges segons el Cadastre"], ["Viviendas", "Viviendas según el Catastro"], "n0", 1],
  ["u292643", "soc", ["Habitatges buits", "Habitatges buits segons el cens (%)"], ["Viviendas vacías", "Viviendas vacías según el censo (%)"], "p1", 1],
  ["u417726", "soc", ["Lloguer mitjà (AEAT)", "Lloguer mensual mitjà declarat a Hisenda (€)"], ["Alquiler medio (AEAT)", "Alquiler mensual medio declarado a Hacienda (€)"], "e0", 1],
  ["u417728", "soc", ["Lloguer mitjà, mediana", "Mediana del lloguer mensual declarat a Hisenda (€)"], ["Alquiler, mediana", "Mediana del alquiler mensual declarado a Hacienda (€)"], "e0", 1],
  ["u417725", "soc", ["Lloguer per m²", "Lloguer anual mitjà per metre quadrat (€/m²)"], ["Alquiler por m²", "Alquiler anual medio por metro cuadrado (€/m²)"], "e1", 1],
  ["u438466", "soc", ["Preu de l'habitatge", "Preu mitjà de compravenda de l'habitatge (€)"], ["Precio de la vivienda", "Precio medio de compraventa de la vivienda (€)"], "e0", 1],
  ["u438467", "soc", ["Preu d'un pis", "Preu mitjà de compravenda d'un pis (€)"], ["Precio de un piso", "Precio medio de compraventa de un piso (€)"], "e0", 1],
  ["u438468", "soc", ["Preu d'una casa", "Preu mitjà de compravenda d'un habitatge unifamiliar (€)"], ["Precio de una casa", "Precio medio de compraventa de una vivienda unifamiliar (€)"], "e0", 1],
  ["u438469", "soc", ["Preu per m²", "Preu mitjà de compravenda per metre quadrat (€/m²)"], ["Precio por m²", "Precio medio de compraventa por metro cuadrado (€/m²)"], "e0", 1],
  ["u311394", "soc", ["Infraccions penals", "Infraccions penals per 1.000 habitants"], ["Infracciones penales", "Infracciones penales por 1.000 habitantes"], "t1", 1],
  ["u437955", "soc", ["Robatoris i furts", "Robatoris i furts per 1.000 habitants"], ["Robos y hurtos", "Robos y hurtos por 1.000 habitantes"], "t1", 1],
  ["u437956", "soc", ["Delictes sexuals", "Delictes contra la llibertat sexual per 1.000 habitants"], ["Delitos sexuales", "Delitos contra la libertad sexual por 1.000 habitantes"], "t2", 1],
  ["u292646", "eco", ["Taxa d'atur", "Taxa d'atur estimada (% de la població activa)"], ["Tasa de paro", "Tasa de paro estimada (% de la población activa)"], "p1", 1],
  ["u283908", "eco", ["Taxa d'activitat", "Taxa d'activitat (% de la població de 16 anys o més)"], ["Tasa de actividad", "Tasa de actividad (% de la población de 16 años o más)"], "p1", 1],
  ["u292648", "eco", ["Feina als serveis", "Ocupació als serveis (% dels llocs de treball)"], ["Empleo en servicios", "Empleo en los servicios (% de los puestos de trabajo)"], "p1", 1],
  ["u292649", "eco", ["Feina a la indústria", "Ocupació a la indústria (% dels llocs de treball)"], ["Empleo en la industria", "Empleo en la industria (% de los puestos de trabajo)"], "p1", 1],
  ["u312423", "eco", ["Renda per habitant", "Renda neta mitjana anual per habitant (€)"], ["Renta por habitante", "Renta neta media anual por habitante (€)"], "e0", 0],
  ["u292650", "eco", ["Renda per llar", "Renda neta mitjana anual per llar (€)"], ["Renta por hogar", "Renta neta media anual por hogar (€)"], "e0", 0],
  ["u292651", "edu", ["Escolarització de 0 a 4 anys", "Infants de 0 a 4 anys escolaritzats (%)"], ["Escolarización de 0 a 4 años", "Niños de 0 a 4 años escolarizados (%)"], "p1", 1],
  ["u292652", "edu", ["Estudis bàsics", "Població de 25 a 64 anys amb estudis obligatoris o menys (%)"], ["Estudios básicos", "Población de 25 a 64 años con estudios obligatorios o menos (%)"], "p1", 1],
  ["u292654", "edu", ["Estudis superiors", "Població de 25 a 64 anys amb estudis superiors (%)"], ["Estudios superiores", "Población de 25 a 64 años con estudios superiores (%)"], "p1", 1],
  ["u292695", "sol", ["Superfície", "Superfície del municipi (km²)"], ["Superficie", "Superficie del municipio (km²)"], "n1", 0],
  ["u312414", "sol", ["Ciutat compacta", "Teixit urbà residencial continu (% del sòl)"], ["Ciudad compacta", "Tejido urbano residencial continuo (% del suelo)"], "p1", 0],
  ["u312415", "sol", ["Ciutat dispersa", "Teixit urbà residencial discontinu (% del sòl)"], ["Ciudad dispersa", "Tejido urbano residencial discontinuo (% del suelo)"], "p1", 0],
  ["u312417", "sol", ["Indústria i equipaments", "Zones industrials, comercials i públiques (% del sòl)"], ["Industria y equipamientos", "Zonas industriales, comerciales y públicas (% del suelo)"], "p1", 0],
  ["u312419", "sol", ["Verd urbà", "Zones verdes urbanes, esportives i d'oci (% del sòl)"], ["Verde urbano", "Zonas verdes urbanas, deportivas y de ocio (% del suelo)"], "p1", 0],
  ["u312420", "sol", ["Sòl agrícola", "Zones agrícoles (% del sòl)"], ["Suelo agrícola", "Zonas agrícolas (% del suelo)"], "p1", 0],
  ["u312421", "sol", ["Sòl natural", "Zones naturals (% del sòl)"], ["Suelo natural", "Zonas naturales (% del suelo)"], "p1", 0],
  ["u21836", "mob", ["A la feina en cotxe", "Desplaçaments a la feina en cotxe (%)"], ["Al trabajo en coche", "Desplazamientos al trabajo en coche (%)"], "p1", 0],
  ["u21841", "mob", ["A la feina a peu", "Desplaçaments a la feina a peu (%)"], ["Al trabajo a pie", "Desplazamientos al trabajo a pie (%)"], "p1", 0],
  ["u21843", "mob", ["A la feina en transport públic", "Desplaçaments a la feina en transport públic (%)"], ["Al trabajo en transporte público", "Desplazamientos al trabajo en transporte público (%)"], "p1", 0],
  ["u21846", "mob", ["Temps per anar a la feina", "Durada mitjana del desplaçament a la feina (minuts)"], ["Tiempo para ir al trabajo", "Duración media del desplazamiento al trabajo (minutos)"], "n1", 0],
  ["u292655", "tur", ["Pernoctacions", "Pernoctacions turístiques a l'any"], ["Pernoctaciones", "Pernoctaciones turísticas al año"], "n0", 1],
  ["u_pern_hab", "tur", ["Pernoctacions per habitant", "Pernoctacions turístiques per habitant"], ["Pernoctaciones por habitante", "Pernoctaciones turísticas por habitante"], "n1", 1],
  ["u292656", "tur", ["Places turístiques", "Places en establiments turístics"], ["Plazas turísticas", "Plazas en establecimientos turísticos"], "n0", 1],
];
window.UA_FMT = (fk) => {
  const d = +fk.slice(-1) || 0, n = (v, dd = d) => fmt(v, dd);
  if (fk[0] === "p") return { f: (v) => pct(v, d), c: (v) => pct(v, 0) };
  if (fk[0] === "e") return { f: (v) => `${n(v)} €`, c: (v) => (Math.abs(v) >= 1e4 ? `${fmt(v / 1000, 0)} k€` : `${fmt(v, 0)} €`) };
  if (fk[0] === "a" || fk[0] === "t") return { f: (v) => n(v), c: (v) => fmt(v, d ? 1 : 0) };
  return { f: (v) => n(v), c: (v) => (Math.abs(v) >= 1e6 ? `${fmt(v / 1e6, 1)} M` : fmt(v, Math.abs(v) < 10 ? d : 0)) };
};
window.UA_NOTA = {
  ca: "INE, Indicadors urbans (Urban Audit), edició anual. Només els deu municipis de la província de més de 20.000 habitants: Banyoles, Blanes, Figueres, Girona, Lloret de Mar, Olot, Palafrugell, Roses, Salt i Sant Feliu de Guíxols. L'INE els calcula a partir d'altres estadístiques i registres amb el mateix mètode per a totes les ciutats d'Espanya, per això es poden comparar entre si però no sempre coincideixen amb altres xifres d'aquest web: la taxa d'atur és una estimació, no l'atur registrat.",
  es: "INE, Indicadores Urbanos (Urban Audit), edición anual. Solo los diez municipios de la provincia de más de 20.000 habitantes: Banyoles, Blanes, Figueres, Girona, Lloret de Mar, Olot, Palafrugell, Roses, Salt y Sant Feliu de Guíxols. El INE los calcula a partir de otras estadísticas y registros con el mismo método para todas las ciudades de España, por eso se pueden comparar entre sí pero no siempre coinciden con otras cifras de esta web: la tasa de paro es una estimación, no el paro registrado.",
};
