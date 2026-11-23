"use strict";
// Gráficos insertables: cada gráfico, mapa o bloque de ficha se puede ver solo en un iframe
// (index.html?embed=<pieza>) y lleva un botón «Insereix» que da el código para copiar.
//   prov:<id> · salut:<id> · conj:<id>    gráficos de La província, Salut y Conjuntura
//   tur:<id> · exp:<id> · mob:<id>          gráficos de Turisme, Exportacions (también sus dos mapas) y Mobilitat
//   mapa:<indicador>[&nivell=sec&any=2023] mapa con su leyenda
//   fitxa:<bloc>&m=<INE>                    bloque de la ficha de un municipio
(() => {
  const Q = new URLSearchParams(location.search);
  const BASE = new URL("./", location.href).href;

  const TX = {
    ca: {
      btn: "Insereix", tit: "Insereix aquest gràfic", tit_mapa: "Insereix aquest mapa",
      ajuda: "Copia el codi i enganxa'l a la teva pàgina com a bloc HTML. L'alçada s'ajusta sola al contingut i a l'amplada de la columna.",
      copia: "Copia el codi", copiat: "Copiat", previa: "Vista prèvia", tanca: "Tanca",
      nota: "Si la teva web no admet scripts, el gràfic funciona igual amb l'alçada fixa del codi.",
      font: "Font", veure: "Veure-ho a", municipi: "Municipi", pistes: "Ctrl + roda per fer zoom",
    },
    es: {
      btn: "Insertar", tit: "Inserta este gráfico", tit_mapa: "Inserta este mapa",
      ajuda: "Copia el código y pégalo en tu página como bloque HTML. La altura se ajusta sola al contenido y al ancho de la columna.",
      copia: "Copiar el código", copiat: "Copiado", previa: "Vista previa", tanca: "Cerrar",
      nota: "Si tu web no admite scripts, el gráfico funciona igual con la altura fija del código.",
      font: "Fuente", veure: "Verlo en", municipi: "Municipio", pistes: "Ctrl + rueda para hacer zoom",
    },
  };
  const tx = (k) => TX[LANG][k];

  // Bloques de la ficha municipal: selector dentro de #fitxa y fuente si el bloque no la lleva
  const BLOCS = {
    xifres: { sel: ".xifres", font: ["Incasòl, Ministeri d'Habitatge, INE, Registre de Turisme i Cadastre", "Incasòl, Ministerio de Vivienda, INE, Registro de Turismo y Catastro"] },
    resum: { sel: ".fitxa-resum", font: ["INE, Idescat, Incasòl, SEPE, Agència Tributària i altres", "INE, Idescat, Incasòl, SEPE, Agencia Tributaria y otras"] },
    lloguer: { sel: ".g-ll", fig: true, font: ["Incasòl, fiances de lloguer", "Incasòl, fianzas de alquiler"] },
    renda: { sel: ".g-re", fig: true, font: ["INE, Atlas de distribució de renda de les llars", "INE, Atlas de distribución de renta de los hogares"] },
    compra: { sel: ".g-cv", fig: true, font: ["Ministeri d'Habitatge i Agenda Urbana", "Ministerio de Vivienda y Agenda Urbana"] },
    conj: { sel: ".fitxa-conj", font: ["SEPE, Seguretat Social, DGT, Incasòl i Ministeri d'Habitatge", "SEPE, Seguridad Social, DGT, Incasòl y Ministerio de Vivienda"] },
    nac: { sel: ".fx-nac" }, univ: { sel: ".fx-univ" },
    pob: { sel: ".fx-pob", font: ["INE, padró municipal", "INE, padrón municipal"] },
    irpf: { sel: ".fx-irpf", font: ["Agència Tributària", "Agencia Tributaria"] },
    pres: { sel: ".fx-pres", font: ["Generalitat, liquidació dels pressupostos", "Generalitat, liquidación de los presupuestos"] },
    trib: { sel: ".fitxa-trib" },
    ind: { sel: ".fitxa-ind", font: ["Diverses fonts oficials (vegeu la llista a la web)", "Varias fuentes oficiales (ver la lista en la web)"] },
    ajt: { sel: ".ajt", font: ["Generalitat, ens locals i eleccions municipals", "Generalitat, entes locales y elecciones municipales"] },
    // Bloques que ya llevan su propia fuente
    com: { sel: ".fx-com", font: ["Generalitat, cens d'establiments comercials", "Generalitat, censo de establecimientos comerciales"] },
    tur: { sel: ".fitxa-tur" }, hab: { sel: ".fitxa-hab" }, mob: { sel: ".fitxa-mob" }, cad: { sel: ".fitxa-cad" },
    sol: { sel: ".fitxa-sol" }, cul: { sel: ".fx-cul" }, ens: { sel: ".fx-ens" }, amb: { sel: ".fx-amb" },
  };
  // Secciones con gráficos insertables: contenedor, ancla de la sección y función que la vuelve a dibujar
  const SECCIONS = {
    prov: { sel: "#prov-grafics .pg-fig", ancla: "#s-prov", pinta: "pintaSeccioProv" },
    salut: { sel: "#salut-grafics .pg-fig", ancla: "#s-salut", pinta: "pintaSeccioSalut" },
    conj: { sel: "#conj .cj-fig", ancla: "#s-conj", pinta: "pintaConjuntura" },
    tur: { sel: "#tur-grafics .pg-fig", ancla: "#s-tur", pinta: "pintaSeccioTurisme" },
    exp: { sel: "#s-exp .pg-fig", ancla: "#s-exp", pinta: "pintaSeccioExportacions" },
    mob: { sel: "#mob-grafics .pg-fig", ancla: "#s-mob", pinta: "pintaSeccioMobilitat" },
    dem: { sel: "#s-dem :is(.pg-fig, .dm-peca)", ancla: "#s-dem", pinta: "pintaSeccioDemografia" },
    amb: { sel: "#amb-grafics .pg-fig", ancla: "#s-amb", pinta: "pintaSeccioAmb" },
  };
  // Fuente corta de los mapas, por tema del indicador
  const FONT_TEMA = {
    con: ["SEPE, Idescat, DGT i Incasòl", "SEPE, Idescat, DGT e Incasòl"], hab: ["Incasòl, Ministeri d'Habitatge, Cadastre i Registre de Turisme", "Incasòl, Ministerio de Vivienda, Catastro y Registro de Turismo"],
    ren: ["INE, Atlas de renda, i Agència Tributària", "INE, Atlas de renta, y Agencia Tributaria"], pob: ["INE i Idescat, padró", "INE e Idescat, padrón"],
    edu: ["Departament d'Educació, INE i Idescat", "Departament d'Educació, INE e Idescat"], tre: ["Idescat, Seguretat Social i Xifra (Diputació de Girona)", "Idescat, Seguridad Social y Xifra (Diputació de Girona)"],
    sal: ["CatSalut i Observatori del Sistema de Salut", "CatSalut y Observatori del Sistema de Salut"], seg: ["Mossos d'Esquadra", "Mossos d'Esquadra"],
    eme: ["Bombers, Agents Rurals i Departament d'Agricultura", "Bombers, Agents Rurals y Departament d'Agricultura"], ter: ["Xifra (Diputació de Girona) i Cadastre", "Xifra (Diputació de Girona) y Catastro"],
    veh: ["DGT", "DGT"], ajt: ["Generalitat i Ministeri d'Hisenda", "Generalitat y Ministerio de Hacienda"], tri: ["Ministeri d'Hisenda, tipus impositius municipals", "Ministerio de Hacienda, tipos impositivos municipales"],
    ene: ["Generalitat i Xifra (Diputació de Girona)", "Generalitat y Xifra (Diputació de Girona)"], ele: ["Generalitat, resultats per secció censal", "Generalitat, resultados por sección censal"],
    pol: ["Generalitat, ens locals", "Generalitat, entes locales"],
    agr: ["INE, cens agrari 2020, via Idescat", "INE, censo agrario 2020, vía Idescat"],
    amb: ["Meteocat, XVPCA, Agència Catalana de l'Aigua i MITECO", "Meteocat, XVPCA, Agència Catalana de l'Aigua y MITECO"],
    cul: ["Departament de Cultura (DadesBib, cens d'equipaments, Programa.cat i agenda cultural)", "Departament de Cultura (DadesBib, censo de equipamientos, Programa.cat y agenda cultural)"],
  };
  const ll = (p) => p[LANG === "ca" ? 0 : 1];

  // Elemento de la pieza en la página
  function troba(tipus, id) {
    if (SECCIONS[tipus]) return document.querySelector(`${SECCIONS[tipus].sel}[data-id="${CSS.escape(id)}"]`);
    if (tipus === "mapa") return document.querySelector(".mapa-graella");
    if (tipus === "fitxa") {
      const b = BLOCS[id]; if (!b) return null;
      const e = document.querySelector(`#fitxa ${b.sel}`);
      return e && b.fig ? e.closest("figure") : e;
    }
    return null;
  }

  // ================= Modo inserción (dentro del iframe) =================
  const clau = Q.get("embed");
  if (clau) {
    const [tipus, id = ""] = clau.split(":");
    const ine = /^\d{5}$/.test(Q.get("m") || "") ? Q.get("m") : null;
    const html = document.documentElement;
    html.classList.add("emb");
    window.EMB = {
      tipus, id, ine,
      ambMapa: tipus === "mapa" || (tipus === "fitxa" && id === "ind"),
      inicia: async (pMapa) => {
        // Cabecera (ficha) y pie con fuente y crédito, fuera de <main> para que no se borren al repintar
        const main = document.querySelector("main");
        const cap = document.createElement("div"); cap.className = "emb-cap";
        const peu = document.createElement("div"); peu.className = "emb-peu";
        main.before(cap); main.after(peu);
        const m = ine && D.municipios.find((x) => x.ine === ine);
        const enllac = BASE + `?lang=${LANG}` + (m ? `#${m.ine}` : tipus === "mapa" ? "#s-mapa" : SECCIONS[tipus] ? SECCIONS[tipus].ancla : "#s-prov");
        const pintaMarc = () => {
          cap.innerHTML = m ? `<p class="emb-sobre">${tx("municipi")}</p><p class="emb-mun">${esc(m.nom)} <span>${esc(m.comarca)}</span></p>` : "";
          let font = "";
          if (tipus === "fitxa" && BLOCS[id] && BLOCS[id].font) font = ll(BLOCS[id].font);
          if (tipus === "mapa" && window.indMapa) { const i = window.indMapa.IND.find((x) => x.id === (window.mapaEstat && window.mapaEstat() ? window.mapaEstat().id : id)); if (i && FONT_TEMA[i.tema]) font = ll(FONT_TEMA[i.tema]); }
          peu.innerHTML = `${font ? `<span class="emb-font">${tx("font")}: ${font}</span>` : "<span></span>"}<a class="emb-marca" href="${enllac}" target="_blank" rel="noopener"><span class="marca-punt" aria-hidden="true"></span>${tx("veure")} <b>Girona en xifres</b> ↗</a>`;
        };
        pintaMarc();
        const aplica = () => {
          const e = troba(tipus, id);
          document.querySelectorAll(".emb-diana").forEach((x) => { if (x !== e) x.classList.remove("emb-diana"); });
          document.querySelectorAll(".emb-cami").forEach((x) => x.classList.remove("emb-cami"));
          if (!e) return false;
          e.classList.add("emb-diana");
          for (let p = e.parentElement; p && p !== document.body; p = p.parentElement) p.classList.add("emb-cami");
          return true;
        };
        // Se aísla la pieza y se vuelve a dibujar con el ancho real del iframe
        const repinta = () => {
          const sc = SECCIONS[tipus];
          if (sc && window[sc.pinta]) return window[sc.pinta]();
          else if (tipus === "fitxa" && m) obreFitxa(m.ine, false);
        };
        if (pMapa) await pMapa;
        const ok = aplica();
        if (tipus === "mapa" && window.mapaEmbed) {
          await window.mapaEmbed({ id, nivell: Q.get("nivell"), any: Q.get("any") });
          pintaMarc();
        } else await repinta();
        aplica();
        if (!ok && !troba(tipus, id)) { main.hidden = true; cap.innerHTML = `<p class="emb-sobre">${LANG === "ca" ? "Aquest gràfic ja no existeix" : "Este gráfico ya no existe"}</p>`; }
        html.classList.add("emb-a");
        // Repintados posteriores (cambio de ancho, bloques que llegan tarde): se vuelve a aislar
        let pend = false;
        new MutationObserver(() => { if (pend) return; pend = true; requestAnimationFrame(() => { pend = false; aplica(); }); }).observe(main, { childList: true, subtree: true });
        // Altura para el script de la página que inserta (insereix.js)
        let ultima = 0;
        const envia = () => {
          const h = Math.ceil(document.body.getBoundingClientRect().height);
          if (Math.abs(h - ultima) < 2) return;
          ultima = h;
          try { parent.postMessage({ gx: "alcada", h }, "*"); } catch (e) { /* */ }
        };
        new ResizeObserver(envia).observe(document.body);
        envia();
      },
    };
    return;
  }

  // ================= Página normal: botón «Insereix» en cada pieza =================
  const PECES = [
    { sel: "#prov-grafics .pg-fig", clau: (e) => `prov:${e.dataset.id}`, tit: (e) => e.querySelector(".pg-tit") },
    { sel: "#salut-grafics .pg-fig", clau: (e) => `salut:${e.dataset.id}`, tit: (e) => e.querySelector(".pg-tit") },
    { sel: "#dem-grafics .pg-fig, #s-dem .dm-peca", clau: (e) => `dem:${e.dataset.id}`, tit: (e) => e.querySelector(".pg-tit") },
    { sel: "#conj .cj-fig:not(.cj-fig-mun)", clau: (e) => `conj:${e.dataset.id}`, tit: (e) => e.querySelector(".cj-tit") },
    { sel: "#tur-grafics .pg-fig", clau: (e) => `tur:${e.dataset.id}`, tit: (e) => e.querySelector(".pg-tit") },
    { sel: "#s-exp .pg-fig[data-id]", clau: (e) => `exp:${e.dataset.id}`, tit: (e) => e.querySelector(".pg-tit") },
    { sel: "#mob-grafics .pg-fig", clau: (e) => `mob:${e.dataset.id}`, tit: (e) => e.querySelector(".pg-tit") },
    { sel: "#amb-grafics .pg-fig", clau: (e) => `amb:${e.dataset.id}`, tit: (e) => e.querySelector(".pg-tit") },
  ];
  const urlDe = (c, extra = "") => `${BASE}?embed=${encodeURIComponent(c).replace(/%3A/g, ":")}${extra}&lang=${LANG}`;
  const boto = (fn) => {
    const b = document.createElement("button");
    b.type = "button"; b.className = "emb-btn";
    b.innerHTML = `<span aria-hidden="true">&lt;/&gt;</span> ${tx("btn")}`;
    b.addEventListener("click", fn);
    return b;
  };

  function decora() {
    PECES.forEach((p) => document.querySelectorAll(p.sel).forEach((e) => {
      if (e.querySelector(":scope > .emb-btn")) return;
      e.appendChild(boto(() => obre(urlDe(p.clau(e)), (p.tit(e) || e).textContent.trim(), e)));
    }));
    const f = document.getElementById("fitxa");
    const ine = f && !f.hidden && typeof seleccionat === "string" ? seleccionat : null;
    if (ine) Object.keys(BLOCS).forEach((k) => {
      const e = troba("fitxa", k);
      if (!e || !e.textContent.trim()) return;
      if (k === "xifres") { if (!(e.nextElementSibling && e.nextElementSibling.classList.contains("emb-btn"))) e.after(boto(() => obreFitxa_(k, e, ine))); e.nextElementSibling.classList.add("emb-btn-sol"); return; }
      if (e.querySelector(":scope > .emb-btn")) return;
      e.appendChild(boto(() => obreFitxa_(k, e, ine)));
    });
    const bm = document.getElementById("emb-btn-mapa");
    const tb = `</> ${tx("btn")}`;
    if (bm && bm.textContent !== tb) bm.innerHTML = `<span aria-hidden="true">&lt;/&gt;</span> ${tx("btn")}`;
  }
  function obreFitxa_(k, e, ine) {
    const m = D.municipios.find((x) => x.ine === ine);
    const h = e.querySelector("h3, figcaption span, .sobre");
    obre(urlDe(`fitxa:${k}`, `&m=${ine}`), `${m ? m.nom : ""}${h ? ` · ${h.textContent.trim()}` : ""}`, e);
  }

  // Diálogo con el código
  let dlg = null;
  function obre(url, titol, e, alt) {
    if (!dlg) {
      dlg = document.createElement("dialog"); dlg.className = "emb-dlg";
      document.body.appendChild(dlg);
      dlg.addEventListener("click", (ev) => { if (ev.target === dlg) dlg.close(); });
    }
    const h = alt || Math.min(1600, Math.round(e.getBoundingClientRect().height) + 60);
    const codi = `<iframe src="${url}" title="${esc(titol)} · Girona en xifres" width="100%" height="${h}" style="width:100%;border:0;display:block" loading="lazy" data-gx></iframe>\n<script async src="${BASE}insereix.js"></script>`;
    dlg.innerHTML = `<div class="emb-dlg-cap"><p class="emb-sobre">${esc(titol)}</p><button type="button" class="emb-dlg-x" aria-label="${tx("tanca")}">✕</button></div>
      <h3>${tx(e.classList.contains("mapa-graella") ? "tit_mapa" : "tit")}</h3><p class="emb-dlg-ajuda">${tx("ajuda")}</p>
      <textarea readonly rows="5" spellcheck="false">${esc(codi)}</textarea>
      <div class="emb-dlg-accions"><button type="button" class="emb-dlg-copia">${tx("copia")}</button><a href="${url}" target="_blank" rel="noopener">${tx("previa")} ↗</a></div>
      <p class="emb-dlg-nota">${tx("nota")}</p>`;
    const ta = dlg.querySelector("textarea");
    dlg.querySelector(".emb-dlg-x").addEventListener("click", () => dlg.close());
    dlg.querySelector(".emb-dlg-copia").addEventListener("click", async (ev) => {
      ta.select();
      try { await navigator.clipboard.writeText(codi); } catch (err) { try { document.execCommand("copy"); } catch (e2) { /* */ } }
      ev.target.textContent = tx("copiat");
      setTimeout(() => { ev.target.textContent = tx("copia"); }, 1800);
    });
    dlg.showModal();
    ta.focus(); ta.select();
  }

  // Botón fijo del mapa (en el panel): inserta el indicador, nivel y año que se ven
  const bm = document.getElementById("emb-btn-mapa");
  if (bm) bm.addEventListener("click", () => {
    const s = window.mapaEstat && window.mapaEstat();
    if (!s) return;
    const extra = (s.nivell !== "mun" ? `&nivell=${s.nivell}` : "") + (s.any ? `&any=${s.any}` : "");
    obre(urlDe(`mapa:${s.id}`, extra), s.nom, document.querySelector(".mapa-graella"), 760);
  });

  let pend = false;
  const prog = () => { if (pend) return; pend = true; requestAnimationFrame(() => { pend = false; decora(); }); };
  new MutationObserver(prog).observe(document.querySelector("main"), { childList: true, subtree: true });
  prog();
})();
