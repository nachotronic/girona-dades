"use strict";
/* Coyuntura: últimos meses y trimestres de la provincia (sección 02) y de cada municipio (ficha).
   Usa las globales de app.js: D, LANG, t, fmt, pct, etPer, mostraTip, amagaTip. Datos en D.cj (conjuntura.json). */
(function () {
  const TX = {
    ca: {
      atur: ["Atur registrat", "Persones aturades a final de mes"],
      contr: ["Contractes", "Contractes signats al mes"],
      indef: ["Contractes indefinits", "% dels contractes del mes"],
      cv: ["Compravendes d'habitatges", "Inscrites als registres al mes"],
      hip: ["Hipoteques sobre habitatges", "Constituïdes al mes"],
      hip_imp: ["Hipoteca mitjana", "Import per habitatge (€)"],
      pern: ["Nits d'hotel", "Pernoctacions hoteleres al mes"],
      ipc: ["Inflació", "Variació anual de l'IPC (%)"],
      llq: ["Lloguer mitjà", "Contractes nous del trimestre (€/mes)"],
      ini: ["Habitatges iniciats", "Obres començades al trimestre"],
      vs: (p) => `respecte a ${p}`, punts: (v) => `${v} punts`, ult12: "Últims 12 mesos", ult4: "Últims 4 trimestres",
      cat: "Catalunya", esp: "Espanya", gi: "Girona", interanual: "Interanual",
      al_mapa: "Per municipis al mapa", font: "Font", tot_mes: "Tots els mesos des del 2019",
      h_fitxa: "Conjuntura", sub_fitxa: "Últims tres anys, mes a mes o trimestre a trimestre.",
      f_atur: ["Atur registrat", "persones"], f_contr: ["Contractes signats", "al municipi del centre de treball"],
      f_llq: ["Lloguer mitjà del trimestre", "€/mes, contractes nous"], f_cvq: ["Compravendes d'habitatges", "per trimestre"],
      f_ini: ["Habitatges iniciats", "per trimestre"], sense: "Sense dades recents per a aquest municipi.",
      llegenda: (p, a) => `<i class="cj-l-ult"></i>${p} <i class="cj-l-ant"></i>${a}`,
    },
    es: {
      atur: ["Paro registrado", "Personas en paro a final de mes"],
      contr: ["Contratos", "Contratos firmados en el mes"],
      indef: ["Contratos indefinidos", "% de los contratos del mes"],
      cv: ["Compraventas de viviendas", "Inscritas en los registros en el mes"],
      hip: ["Hipotecas sobre viviendas", "Constituidas en el mes"],
      hip_imp: ["Hipoteca media", "Importe por vivienda (€)"],
      pern: ["Noches de hotel", "Pernoctaciones hoteleras en el mes"],
      ipc: ["Inflación", "Variación anual del IPC (%)"],
      llq: ["Alquiler medio", "Contratos nuevos del trimestre (€/mes)"],
      ini: ["Viviendas iniciadas", "Obras empezadas en el trimestre"],
      vs: (p) => `respecto a ${p}`, punts: (v) => `${v} puntos`, ult12: "Últimos 12 meses", ult4: "Últimos 4 trimestres",
      cat: "Cataluña", esp: "España", gi: "Girona", interanual: "Interanual",
      al_mapa: "Por municipios en el mapa", font: "Fuente", tot_mes: "Todos los meses desde 2019",
      h_fitxa: "Coyuntura", sub_fitxa: "Últimos tres años, mes a mes o trimestre a trimestre.",
      f_atur: ["Paro registrado", "personas"], f_contr: ["Contratos firmados", "en el municipio del centro de trabajo"],
      f_llq: ["Alquiler medio del trimestre", "€/mes, contratos nuevos"], f_cvq: ["Compraventas de viviendas", "por trimestre"],
      f_ini: ["Viviendas iniciadas", "por trimestre"], sense: "Sin datos recientes para este municipio.",
      llegenda: (p, a) => `<i class="cj-l-ult"></i>${p} <i class="cj-l-ant"></i>${a}`,
    },
  };
  const tx = (k, ...a) => { const v = TX[LANG][k]; return typeof v === "function" ? v(...a) : v; };

  // flux: se suman los últimos 12 meses (4 trimestres); pp: la variación se da en puntos
  const TARGETES = [
    { id: "atur", per: "m", mapa: "cj_atur", font: "SEPE" },
    { id: "contr", per: "m", flux: true, mapa: "cj_contr", font: "SEPE" },
    { id: "indef", per: "m", pp: true, linia: true, u: "%", dec: 1, mapa: "cj_indef", font: "SEPE" },
    { id: "cv", per: "m", flux: true, mapa: "cj_cvq_var", font: "INE, ETDP" },
    { id: "hip", per: "m", flux: true, font: "INE, Hipoteques" },
    { id: "hip_imp", per: "m", linia: true, u: "€", font: "INE, Hipoteques" },
    { id: "pern", per: "m", flux: true, mega: true, font: "INE, EOH" },
    { id: "ipc", per: "m", pp: true, linia: true, u: "%", dec: 1, nivell: true, font: "INE, IPC" },
    { id: "llq", per: "t", u: "€", mapa: "cj_llq", font: "Incasòl" },
  ];

  const NS = "http://www.w3.org/2000/svg";
  const el = (tag, at, pare) => { const e = document.createElementNS(NS, tag); Object.entries(at).forEach(([k, v]) => e.setAttribute(k, v)); if (pare) pare.appendChild(e); return e; };
  const periodes = (per) => D.cj.per[per];
  const salt = (per) => (per === "m" ? 12 : 4);
  const ultIdx = (s) => { for (let i = s.length - 1; i >= 0; i--) if (s[i] != null) return i; return -1; };
  const fv = (v, c) => (v == null ? "–" : c.mega && v >= 1e5 ? `${fmt(v / 1e6, 2)} M` : c.u === "%" ? pct(v, c.dec ?? 1) : fmt(v, c.dec || 0) + (c.u === "€" ? " €" : ""));
  const signe = (v, d = 1) => (v == null || !isFinite(v) ? "–" : pct(v, d, true));
  const puntsTxt = (v) => (v == null ? "–" : tx("punts", (v > 0 ? "+" : "") + fmt(v, 1)));
  const suma = (s, i, n) => { let x = 0; for (let k = i - n + 1; k <= i; k++) { if (k < 0 || s[k] == null) return null; x += s[k]; } return x; };
  // Variación interanual de una serie en la posición i (en % o en puntos)
  const varAny = (s, i, c) => {
    const j = i - salt(c.per);
    if (!s || j < 0 || s[i] == null || s[j] == null) return null;
    return c.pp ? s[i] - s[j] : s[j] ? (s[i] / s[j] - 1) * 100 : null;
  };
  const cls = (v) => (v == null ? "" : v > 0 ? "cj-puja" : v < 0 ? "cj-baixa" : "");

  // Columnas: el último periodo en rojo y el mismo periodo del año anterior en negro
  function columnes(cont, s, per, c, n, H0) {
    cont.innerHTML = "";
    const ps = periodes(per), fi = ultIdx(s);
    if (fi < 0) return;
    const ini = Math.max(0, fi - n + 1), vals = s.slice(ini, fi + 1);
    const W = Math.max(260, cont.clientWidth || 360), H = H0 || (W < 420 ? 120 : 132), m = { t: 8, r: 2, b: 20, l: 2 };
    const max = Math.max(...vals.filter((v) => v != null), 1);
    const banda = (W - m.l - m.r) / vals.length, amp = Math.max(1.5, banda * (per === "m" ? 0.72 : 0.78));
    const svg = el("svg", { viewBox: `0 0 ${W} ${H}`, class: "cj-svg", role: "img" }, cont);
    el("line", { x1: m.l, x2: W - m.r, y1: H - m.b, y2: H - m.b, class: "cj-base" }, svg);
    vals.forEach((v, k) => {
      const i = ini + k, x = m.l + k * banda + (banda - amp) / 2;
      if (v != null) {
        const h = (v / max) * (H - m.t - m.b);
        el("rect", { x, y: H - m.b - h, width: amp, height: Math.max(h, 0.5), class: i === fi ? "cj-b cj-b-ult" : i === fi - salt(per) ? "cj-b cj-b-ant" : "cj-b" }, svg);
      }
      const p = ps[i];
      // Etiquetas de año en enero (o T1)
      if ((per === "m" && p.endsWith("-01")) || (per === "t" && p.endsWith("T1"))) {
        el("line", { x1: m.l + k * banda, x2: m.l + k * banda, y1: H - m.b, y2: H - m.b + 4, class: "cj-base" }, svg);
        if (k * banda < W - 30) el("text", { x: m.l + k * banda + 2, y: H - 5, class: "cj-t" }, svg).textContent = p.slice(0, 4);
      }
      const hit = el("rect", { x: m.l + k * banda, y: m.t, width: banda, height: H - m.t - m.b, fill: "transparent" }, svg);
      hit.addEventListener("pointermove", (ev) => {
        const va = varAny(s, i, c);
        mostraTip(`<b>${etPer(p)}</b><br>${fv(v, c)}${va != null ? `<br><span class="t-sub">${tx("interanual")}: ${c.pp ? puntsTxt(va) : signe(va)}</span>` : ""}`, ev.clientX, ev.clientY);
      });
      hit.addEventListener("pointerleave", amagaTip);
    });
  }

  // Líneas: Girona (rojo), Cataluña (negro) y España (gris discontinuo)
  function linies(cont, sers, per, c, n) {
    cont.innerHTML = "";
    const ps = periodes(per), fi = Math.max(...["gi", "cat", "esp"].filter((z) => sers[z]).map((z) => ultIdx(sers[z])));
    if (fi < 0) return;
    const ini = Math.max(0, fi - n + 1);
    const W = Math.max(260, cont.clientWidth || 360), H = W < 420 ? 120 : 132, m = { t: 10, r: 36, b: 20, l: 2 };
    const zs = ["esp", "cat", "gi"].filter((z) => sers[z]);
    const tots = zs.flatMap((z) => sers[z].slice(ini, fi + 1)).filter((v) => v != null);
    let y0 = Math.min(...tots), y1 = Math.max(...tots); const pad = (y1 - y0) * 0.1 || 1; y0 -= pad; y1 += pad;
    if (c.u === "%" && y0 > 0 && !c.nivell) y0 = 0;
    const X = (i) => m.l + ((i - ini) / Math.max(1, fi - ini)) * (W - m.l - m.r), Y = (v) => m.t + (1 - (v - y0) / (y1 - y0)) * (H - m.t - m.b);
    const svg = el("svg", { viewBox: `0 0 ${W} ${H}`, class: "cj-svg", role: "img" }, cont);
    el("line", { x1: m.l, x2: W - m.r, y1: H - m.b, y2: H - m.b, class: "cj-base" }, svg);
    // Tres líneas de referencia con valores redondos
    const pas = (() => { const r = (y1 - y0) / 3, q = Math.pow(10, Math.floor(Math.log10(r || 1))); return [1, 2, 2.5, 5, 10].map((k) => k * q).find((k) => k >= r); })();
    for (let v = Math.ceil(y0 / pas) * pas; v <= y1; v += pas) {
      el("line", { x1: m.l, x2: W - m.r, y1: Y(v), y2: Y(v), class: Math.abs(v) < 1e-9 ? "cj-zero" : "cj-g" }, svg);
      el("text", { x: m.l, y: Y(v) - 3, class: "cj-t" }, svg).textContent = c.u === "€" ? `${fmt(v / 1000, 0)}k` : fmt(v, pas < 1 ? 1 : 0);
    }
    for (let i = ini; i <= fi; i++) {
      const p = ps[i];
      if (p.endsWith("-01") || p.endsWith("T1")) {
        el("line", { x1: X(i), x2: X(i), y1: H - m.b, y2: H - m.b + 4, class: "cj-base" }, svg);
        if (X(i) < W - m.r - 24) el("text", { x: X(i) + 2, y: H - 5, class: "cj-t" }, svg).textContent = p.slice(0, 4);
      }
    }
    zs.forEach((z) => {
      const s = sers[z]; let d = "", obre = false;
      for (let i = ini; i <= fi; i++) {
        if (s[i] == null) { obre = false; continue; }
        d += `${obre ? "L" : "M"}${X(i).toFixed(1)},${Y(s[i]).toFixed(1)}`; obre = true;
      }
      el("path", { d, class: `cj-l cj-l-${z}` }, svg);
      const u = ultIdx(s);
      if (u >= ini && z === "gi") {
        el("circle", { cx: X(u), cy: Y(s[u]), r: 3, class: "cj-p" }, svg);
        el("text", { x: X(u) + 6, y: Y(s[u]) + 3.5, class: "cj-e" }, svg).textContent = c.u === "%" ? fmt(s[u], 1) : c.u === "€" ? `${fmt(s[u] / 1000, 0)}k` : fmt(s[u]);
      }
    });
    const guia = el("line", { y1: m.t, y2: H - m.b, class: "cj-guia", visibility: "hidden" }, svg);
    const zona = el("rect", { x: m.l, y: m.t, width: W - m.l - m.r, height: H - m.t - m.b, fill: "transparent" }, svg);
    zona.addEventListener("pointermove", (ev) => {
      const r = svg.getBoundingClientRect(), px = ((ev.clientX - r.left) / r.width) * W;
      const i = Math.max(ini, Math.min(fi, Math.round(ini + ((px - m.l) / (W - m.l - m.r)) * (fi - ini))));
      guia.setAttribute("x1", X(i)); guia.setAttribute("x2", X(i)); guia.setAttribute("visibility", "visible");
      const files = zs.slice().reverse().filter((z) => sers[z][i] != null).map((z) => `<br><i class="pg-dot pg-${z}"></i>${tx(z)}: <b>${fv(sers[z][i], c)}</b>`).join("");
      mostraTip(`<b>${etPer(ps[i])}</b>${files}`, ev.clientX, ev.clientY);
    });
    zona.addEventListener("pointerleave", () => { guia.setAttribute("visibility", "hidden"); amagaTip(); });
  }

  function targeta(c) {
    const sp = D.cj.prov[c.id];
    if (!sp || !sp.gi) return "";
    const s = sp.gi, i = ultIdx(s);
    if (i < 0) return "";
    const ps = periodes(c.per), ant = ps[i - salt(c.per)];
    const va = varAny(s, i, c);
    const comp = ["cat", "esp"].filter((z) => sp[z] && sp[z][i] != null).map((z) => {
      const v = c.nivell ? sp[z][i] : varAny(sp[z], i, c);
      return `<span>${tx(z)} <b class="${c.nivell ? "" : cls(v)}">${c.nivell ? fv(v, c) : c.pp ? puntsTxt(v) : signe(v)}</b></span>`;
    }).join("");
    const n = salt(c.per), acum = c.flux ? suma(s, i, n) : null, acumAnt = c.flux ? suma(s, i - n, n) : null;
    const acumTxt = acum != null ? `<p class="cj-acum">${tx(c.per === "m" ? "ult12" : "ult4")}: <b>${fv(acum, c)}</b>${acumAnt ? ` <span class="${cls((acum / acumAnt - 1) * 100)}">${signe((acum / acumAnt - 1) * 100)}</span>` : ""}</p>` : "";
    const varTxt = c.nivell ? `<p class="cj-var">${ant ? `${tx("vs", etPer(ant))}: <b>${fv(s[i - n], c)}</b>` : ""}</p>`
      : `<p class="cj-var"><b class="${cls(va)}">${c.pp ? puntsTxt(va) : signe(va)}</b> ${ant ? tx("vs", etPer(ant)) : ""}</p>`;
    return `<figure class="cj-fig" data-id="${c.id}">
      <figcaption><span class="cj-tit">${tx(c.id)[0]}</span><span class="cj-u">${tx(c.id)[1]}</span></figcaption>
      <p class="cj-xifra">${fv(s[i], c)}<span class="cj-per">${etPer(ps[i])}</span></p>
      ${varTxt}
      ${comp ? `<p class="cj-comp">${c.nivell ? "" : `${tx("interanual")} · `}${comp}</p>` : ""}
      <div class="cj-c"></div>
      ${!c.linia && ant ? `<p class="cj-lleg">${tx("llegenda", etPer(ps[i]), etPer(ant))}</p>` : ""}
      ${acumTxt}
      <p class="cj-peu"><span>${tx("font")}: ${c.font}</span>${c.mapa ? `<button type="button" class="cj-mapa" data-ind="${c.mapa}">${tx("al_mapa")} →</button>` : ""}</p>
    </figure>`;
  }

  window.pintaConjuntura = () => {
    const cont = document.getElementById("conj");
    if (!cont) return;
    if (!D.cj) { cont.closest("section").hidden = true; return; }
    cont.innerHTML = TARGETES.map(targeta).join("");
    cont.querySelectorAll(".cj-fig").forEach((f) => {
      const c = TARGETES.find((x) => x.id === f.dataset.id), sp = D.cj.prov[c.id], g = f.querySelector(".cj-c");
      if (c.linia) linies(g, sp, c.per, c, c.per === "m" ? 61 : 20);
      else columnes(g, sp.gi, c.per, c, c.per === "m" ? 37 : 13);
    });
    cont.querySelectorAll(".cj-mapa").forEach((b) => b.addEventListener("click", () => { if (window.mapaIndicador) window.mapaIndicador(b.dataset.ind); }));
  };

  // Ficha municipal: cuatro series en columnas
  const FITXA = [
    { k: "atur", per: "m", t: "f_atur" },
    { k: "contr", per: "m", t: "f_contr", flux: true },
    { k: "llq", per: "t", t: "f_llq", u: "€" },
    { k: "cvq", per: "t", t: "f_cvq", flux: true },
  ];
  window.fitxaConjuntura = (cont, m) => {
    if (!cont) return;
    const x = D.cj && D.cj.mun[m.ine];
    const items = x ? FITXA.filter((c) => x[c.k] && ultIdx(x[c.k]) >= periodes(c.per).length - salt(c.per)) : [];
    if (!items.length) { cont.innerHTML = ""; return; }
    cont.innerHTML = `<h3 class="ajt-tit">${tx("h_fitxa")}</h3><p class="cj-sub">${tx("sub_fitxa")}</p><div class="cj-fitxa">${items.map((c) => {
      const s = x[c.k], i = ultIdx(s), ps = periodes(c.per), va = varAny(s, i, c), ant = ps[i - salt(c.per)];
      return `<figure class="cj-fig cj-fig-mun" data-k="${c.k}"><figcaption><span class="cj-tit">${tx(c.t)[0]}</span><span class="cj-u">${tx(c.t)[1]}</span></figcaption>
        <p class="cj-xifra">${fv(s[i], c)}<span class="cj-per">${etPer(ps[i])}</span></p>
        <p class="cj-var">${va != null ? `<b class="${cls(va)}">${signe(va)}</b> ${tx("vs", etPer(ant))}` : "&nbsp;"}</p><div class="cj-c"></div></figure>`;
    }).join("")}</div>`;
    cont.querySelectorAll(".cj-fig-mun").forEach((f) => {
      const c = FITXA.find((y) => y.k === f.dataset.k);
      columnes(f.querySelector(".cj-c"), x[c.k], c.per, c, c.per === "m" ? 37 : 13, 104);
    });
  };
})();
