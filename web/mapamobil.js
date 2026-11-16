// Mapa en el móvil (2026-11-16): en la página, una vista previa quieta que no atrapa el desplazamiento;
// al tocarla, el mapa ocupa toda la pantalla con la barra del indicador, una fila con los indicadores del tema
// y una hoja inferior arrastrable (leyenda, años y datos del municipio). El botón «atrás» del móvil cierra cada capa.
// El indicador, el nivel, el año y el municipio quedan en la URL (?ind=&niv=&any=&m=) en cualquier pantalla.
(function () {
  if (window.EMB || /[?&]embed=/.test(location.search)) return;
  const MQ = matchMedia("(max-width: 760px), (max-height: 520px) and (orientation: landscape) and (pointer: coarse)");
  const HORIT = matchMedia("(orientation: landscape)");
  const TXT = {
    ca: { obre: "Explora el mapa", tanca: "Torna a la pàgina", asa: "Mou el panell", tots: "Tots" },
    es: { obre: "Explora el mapa", tanca: "Vuelve a la página", asa: "Mueve el panel", tots: "Todos" },
  };
  const lang = () => (document.documentElement.lang === "es" ? "es" : "ca");
  const tx = (k) => TXT[lang()][k];
  const $ = (id) => document.getElementById(id);
  const cos = document.body;
  const graella = document.querySelector(".mapa-graella");
  const caixa = document.querySelector(".mapa-caixa");
  const menu = $("mapa-menu");
  const panell = document.querySelector(".mapa-panell");
  if (!graella || !caixa || !menu || !panell) return;

  // ---------- Elementos nuevos ----------
  const obreBtn = document.createElement("button");
  obreBtn.type = "button"; obreBtn.className = "mm-obre";
  obreBtn.innerHTML = `<span class="mm-obre-txt"></span><svg aria-hidden="true" viewBox="0 0 20 20" width="16" height="16"><path d="M3 8V3h5M17 8V3h-5M3 12v5h5M17 12v5h-5" fill="none" stroke="currentColor" stroke-width="1.8"/></svg>`;
  const vel = document.createElement("div"); vel.className = "mm-vel"; // captura los toques sobre la vista previa
  caixa.append(vel, obreBtn);

  const tancaBtn = document.createElement("button");
  tancaBtn.type = "button"; tancaBtn.className = "mm-tanca";
  tancaBtn.innerHTML = `<svg aria-hidden="true" viewBox="0 0 20 20" width="20" height="20"><path d="M12.5 4 6.5 10l6 6" fill="none" stroke="currentColor" stroke-width="2"/></svg>`;
  menu.prepend(tancaBtn);

  const xips = document.createElement("div");
  xips.className = "mm-xips"; xips.setAttribute("role", "radiogroup");
  $("menu-ind-btn").after(xips);

  const asa = document.createElement("button");
  asa.type = "button"; asa.className = "mm-asa"; asa.innerHTML = "<i></i>";
  panell.prepend(asa);

  const textos = () => {
    obreBtn.querySelector(".mm-obre-txt").textContent = tx("obre");
    tancaBtn.setAttribute("aria-label", tx("tanca")); tancaBtn.title = tx("tanca");
    asa.setAttribute("aria-label", tx("asa"));
  };
  textos();
  new MutationObserver(textos).observe(document.documentElement, { attributes: true, attributeFilter: ["lang"] });

  // ---------- Fila de indicadores del tema actual ----------
  let temaFila = null;
  function omplirXips() {
    const A = window.mapaApi; if (!A || !A.ind) return;
    const tm = A.ind.tema;
    const llista = A.IND.filter((i) => i.tema === tm && A.ok(i));
    xips.innerHTML = llista.map((i) => `<button type="button" class="mm-xip" role="radio" data-id="${i.id}" aria-checked="${i.id === A.ind.id}">${A.nomInd(i, true)}</button>`).join("");
    const act = xips.querySelector('[aria-checked="true"]');
    if (act && (temaFila !== tm || !enVista(act))) xips.scrollLeft = Math.max(0, act.offsetLeft - 16);
    temaFila = tm;
  }
  const enVista = (b) => b.offsetLeft >= xips.scrollLeft && b.offsetLeft + b.offsetWidth <= xips.scrollLeft + xips.clientWidth;
  xips.addEventListener("click", (e) => {
    const b = e.target.closest(".mm-xip"); if (!b || !window.mapaApi) return;
    window.mapaApi.tria(b.dataset.id);
  });

  // ---------- Hoja inferior ----------
  // Tres alturas: «peek» (asa, nivel, leyenda y años), media pantalla y casi toda la pantalla
  let estat = "peek";
  const disponible = () => graella.clientHeight - menu.offsetHeight;
  function altPeek() {
    const fi = ["anys-ctl", "llegenda"].map($).find((el) => el && !el.hidden && el.offsetHeight);
    if (!fi) return 120;
    return Math.min(Math.round(fi.offsetTop + fi.offsetHeight + 12), disponible() * 0.4);
  }
  const altEstat = (s) => (s === "full" ? disponible() : s === "mitja" ? Math.max(altPeek() + 60, Math.round(disponible() * 0.52)) : altPeek());
  function posaFull(s, anim = true) {
    estat = s;
    if (!ple() || HORIT.matches) { panell.style.height = ""; return; }
    panell.classList.toggle("mm-anim", anim);
    const pk = altPeek();
    graella.style.setProperty("--mm-peek", `${pk}px`); // el mapa termina donde empieza la hoja recogida
    panell.style.height = `${s === "peek" ? pk : altEstat(s)}px`;
    panell.dataset.estat = s;
    if (s !== "full") panell.scrollTop = 0;
  }
  // Arrastre con el asa (y tocarla alterna entre alturas)
  let drag = null;
  asa.addEventListener("pointerdown", (e) => {
    if (!ple() || HORIT.matches) return;
    drag = { y: e.clientY, h: panell.offsetHeight, mogut: false };
    asa.setPointerCapture(e.pointerId); panell.classList.remove("mm-anim");
  });
  asa.addEventListener("pointermove", (e) => {
    if (!drag) return;
    const dy = drag.y - e.clientY;
    if (Math.abs(dy) > 4) drag.mogut = true;
    panell.style.height = `${Math.max(altPeek() - 20, Math.min(disponible(), drag.h + dy))}px`;
  });
  const deixa = (e) => {
    if (!drag) return;
    const d = drag; drag = null;
    if (!d.mogut) { posaFull(estat === "peek" ? "mitja" : estat === "mitja" ? "full" : "peek"); return; }
    const h = panell.offsetHeight, v = d.h - h; // v > 0: hacia abajo
    const opcions = ["peek", "mitja", "full"].map((s) => [s, altEstat(s)]);
    let millor = opcions.reduce((a, b) => (Math.abs(b[1] - h) < Math.abs(a[1] - h) ? b : a))[0];
    if (Math.abs(v) > 40 && millor === estat) millor = v > 0 ? (estat === "full" ? "mitja" : "peek") : (estat === "peek" ? "mitja" : "full");
    posaFull(millor);
    if (e && e.type === "pointercancel") posaFull(estat);
  };
  asa.addEventListener("pointerup", deixa); asa.addEventListener("pointercancel", deixa);
  asa.addEventListener("keydown", (e) => {
    if (e.key === "ArrowUp") { posaFull(estat === "peek" ? "mitja" : "full"); e.preventDefault(); }
    if (e.key === "ArrowDown") { posaFull(estat === "full" ? "mitja" : "peek"); e.preventDefault(); }
  });

  // ---------- Pantalla completa ----------
  const ple = () => cos.classList.contains("mm-ple");
  let tornaY = 0;
  function aplicaMapa(ple_) {
    const A = window.mapaApi, m = A && A.mapa;
    if (!m) return;
    if (ple_) {
      m.cooperativeGestures.disable();
      ["dragPan", "touchZoomRotate", "doubleClickZoom", "scrollZoom"].forEach((h) => m[h].enable());
      m.touchZoomRotate.disableRotation();
    } else if (MQ.matches) {
      // Vista previa: el mapa no recibe gestos y la página se desplaza con normalidad
      ["dragPan", "touchZoomRotate", "doubleClickZoom", "scrollZoom"].forEach((h) => m[h].disable());
    } else {
      ["dragPan", "touchZoomRotate", "doubleClickZoom", "scrollZoom"].forEach((h) => m[h].enable());
      m.touchZoomRotate.disableRotation();
      if (matchMedia("(pointer: coarse)").matches) m.cooperativeGestures.enable();
    }
  }
  const segment = panell.querySelector(".segment-panell");
  function obrePle() {
    if (ple()) return;
    tornaY = scrollY;
    cos.classList.add("mm-ple");
    if (segment) caixa.append(segment); // el nivel (municipis, seccions…) flota sobre el mapa
    aplicaMapa(true);
    omplirXips();
    requestAnimationFrame(() => { window.mapaApi.llegenda(); posaFull(window.mapaApi.fixat ? "mitja" : "peek", false); window.mapaApi.mapa && window.mapaApi.mapa.resize(); });
  }
  function tancaPle() {
    if (!ple()) return;
    if (window.mapaMenuInd) window.mapaMenuInd.tanca();
    cos.classList.remove("mm-ple");
    if (segment) panell.prepend(segment);
    graella.style.removeProperty("--mm-peek");
    panell.style.height = ""; delete panell.dataset.estat;
    aplicaMapa(false);
    if (window.mapaApi) window.mapaApi.llegenda();
    window.scrollTo({ top: tornaY, behavior: "instant" });
  }

  // ---------- Historial: cada capa es una entrada, así «atrás» la cierra ----------
  const estatH = () => (history.state && history.state.mm) || null;
  const empeny = (mm) => { try { history.pushState({ mm }, "", location.href); } catch (e) { /* */ } };
  function aplicaHistorial() {
    const mm = estatH();
    if (mm === "ple" || mm === "tria") { obrePle(); } else if (mm !== "fitxa") tancaPle();
    if (mm !== "tria" && window.mapaMenuInd && window.mapaMenuInd.obert()) window.mapaMenuInd.tanca();
    desaUrl();
  }
  addEventListener("popstate", aplicaHistorial);
  function entra() { if (!ple()) { empeny("ple"); obrePle(); } }
  function surt() { if (estatH() === "ple") history.back(); else { tancaPle(); } }

  obreBtn.addEventListener("click", entra);
  vel.addEventListener("click", entra);
  tancaBtn.addEventListener("click", surt);
  // En la página, la barra del indicador abre el mapa y el selector a la vez
  $("menu-ind-btn").addEventListener("click", (e) => {
    if (!MQ.matches || ple()) return;
    e.stopImmediatePropagation(); entra();
    if (window.mapaMenuInd) window.mapaMenuInd.obre();
  }, true);
  document.addEventListener("mapa:menu-obert", () => { if (ple() && estatH() !== "tria") empeny("tria"); });
  document.addEventListener("mapa:menu-tancat", () => { if (estatH() === "tria") history.back(); });
  // Elegido un indicador en el selector a pantalla completa, se vuelve al mapa
  $("indicadors").addEventListener("click", (e) => {
    if (ple() && e.target.closest(".xip") && window.mapaMenuInd) setTimeout(() => window.mapaMenuInd.tanca(), 120);
  });
  // La ficha del municipio se abre en la página; «atrás» devuelve al mapa
  if (typeof window.obreFitxa === "function") {
    const orig = window.obreFitxa;
    window.obreFitxa = function (ine, desplaca) {
      if (ple()) {
        if (estatH() === "tria") window.mapaMenuInd.tanca();
        empeny("fitxa"); tancaPle();
      }
      return orig.call(this, ine, desplaca);
    };
  }

  // Al tocar un municipio, la hoja sube a media pantalla con sus datos.
  // (Sin mover el mapa: desplazarlo mientras la hoja sube dejaba el lienzo a medio pintar en Chromium.)
  document.addEventListener("mapa:zona", () => setTimeout(() => {
    if (ple() && !HORIT.matches && estat === "peek") posaFull("mitja");
  }, 0));

  // ---------- Estado en la URL ----------
  let aplicant = true;
  function desaUrl() {
    if (aplicant) return;
    const A = window.mapaApi; if (!A || !A.ind) return;
    const q = new URLSearchParams(location.search);
    ["ind", "niv", "any", "m"].forEach((k) => q.delete(k));
    const defecte = A.ind.id === "renda" && A.nivell === "mun" && A.any == null && !A.fixat;
    if (!defecte) {
      q.set("ind", A.ind.id);
      if (A.nivell !== "mun") q.set("niv", A.nivell);
      if (A.any != null) q.set("any", A.any);
      if (A.fixat && A.fixat.ine && A.nivell === "mun") q.set("m", A.fixat.ine);
    }
    const s = q.toString();
    try { history.replaceState(history.state, "", location.pathname + (s ? `?${s}` : "") + location.hash); } catch (e) { /* */ }
  }
  document.addEventListener("mapa:pinta", () => { omplirXips(); desaUrl(); if (ple() && !HORIT.matches) requestAnimationFrame(() => posaFull(estat, false)); });
  document.addEventListener("mapa:zona", () => setTimeout(desaUrl, 0));

  (async () => {
    if (!window.mapaLlest) return;
    await window.mapaLlest;
    aplicaMapa(ple());
    const q = new URLSearchParams(location.search);
    try {
      if (q.get("ind") || q.get("niv") || q.get("any")) {
        await window.mapaEmbed({ id: q.get("ind") || "renda", nivell: q.get("niv"), any: q.get("any") });
      }
      if (q.get("m")) window.mapaApi.selecciona(q.get("m"));
    } catch (e) { /* URL antigua o indicador inexistente */ }
    aplicant = false;
    omplirXips();
    if (history.state && history.state.mm && MQ.matches) aplicaHistorial();
  })();

  MQ.addEventListener("change", () => { if (!MQ.matches && ple()) surt(); aplicaMapa(ple()); });
  HORIT.addEventListener("change", () => requestAnimationFrame(() => { if (window.mapaApi) window.mapaApi.llegenda(); posaFull(estat, false); }));
  addEventListener("resize", () => { if (ple() && !drag) posaFull(estat, false); });
})();
