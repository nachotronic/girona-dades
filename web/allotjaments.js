// Hoteles, campings, apartamentos y turismo rural mes a mes (encuestas de ocupación del INE).
// Datos en datos/allotjaments.json (scripts/allotjaments_web.py), que se pide la primera vez que se pinta.
// Se pinta en la sección Turisme (provincia, Costa Brava, Pirineu y puntos turísticos) y en la ficha de los
// municipios que el INE publica como punto turístico.
(function () {
  const TX = {
    ca: {
      tit: "Hotels, càmpings, apartaments i turisme rural, mes a mes",
      sub: (u) => `Enquestes d'ocupació de l'INE. Últim mes publicat: ${u}. Cada mes surten les dades del mes anterior.`,
      sub_f: (n, u) => `${n} és punt turístic de l'INE: té dades pròpies de cada mes. Últim mes publicat: ${u}.`,
      tipus: { hotel: "Hotels", camp: "Càmpings", apt: "Apartaments", rural: "Turisme rural" },
      zona: "Zona", zones: { gi: "Província de Girona", cb: "Costa Brava", pir: "Pirineus (zona de l'INE, tot Catalunya)" }, punts: "Punts turístics",
      ind: { pern: "Pernoctacions", via: "Viatgers", ocup: "Ocupació", adr: "Preu (ADR)", revpar: "RevPAR", pl: "Places", pers: "Personal", estada: "Estada mitjana", ext: "% estrangers" },
      ocup_camp: "Ocupació de parcel·les", ocup_pl: "Ocupació de places",
      x_via: (m) => `Viatgers · ${m}`, x_pern: (m) => `Nits · ${m}`, x_ocup: (m) => `Ocupació · ${m}`, x_ext: (m) => `Nits d'estrangers · ${m}`,
      x_pl: (m) => `Places obertes · ${m}`, x_estada: (m) => `Estada mitjana · ${m}`, x_adr: (m) => `Preu mitjà per nit · ${m}`, x_pers: (m) => `Personal · ${m}`,
      x_12: "Nits, últims 12 mesos",
      vs: (v, a) => `${v} que el ${a}`, fa: (v) => `fa un any, ${v}`, est: (n) => `${n} establiments oberts`, dies: "dies",
      revpar: (v) => `RevPAR ${v} € per habitació disponible`, cap_fs: (v) => `caps de setmana, ${v}`, vs12: (v) => `${v} que els 12 anteriors`,
      g_anys: (i) => `${i}: cada mes, aquest any i els anteriors`, g_res: "Nits per residència, últims 24 mesos",
      g_cmp: "Ocupació hotelera per places: Girona, Catalunya i Espanya", g_orig: (a, b) => `D'on són els residents a Espanya · nits d'hotel de ${a} a ${b}`,
      esp: "Residents a Espanya", estr: "Residents a l'estranger", gi: "Girona", cat: "Catalunya", e: "Espanya",
      taula: "Els últims 13 mesos", mes: "Mes",
      mesos: ["gener", "febrer", "març", "abril", "maig", "juny", "juliol", "agost", "setembre", "octubre", "novembre", "desembre"],
      mc: ["G", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"],
      nota_camp: "Als càmpings l'ocupació es mesura per parcel·les. Molts tanquen a l'hivern: hi ha mesos sense dades.",
      font: "Font: INE, Enquestes d'ocupació en allotjaments turístics (hotels, càmpings, apartaments i turisme rural) i Índex de preus hotelers (ADR i RevPAR).",
    },
    es: {
      tit: "Hoteles, campings, apartamentos y turismo rural, mes a mes",
      sub: (u) => `Encuestas de ocupación del INE. Último mes publicado: ${u}. Cada mes salen los datos del mes anterior.`,
      sub_f: (n, u) => `${n} es punto turístico del INE: tiene datos propios de cada mes. Último mes publicado: ${u}.`,
      tipus: { hotel: "Hoteles", camp: "Campings", apt: "Apartamentos", rural: "Turismo rural" },
      zona: "Zona", zones: { gi: "Provincia de Girona", cb: "Costa Brava", pir: "Pirineos (zona del INE, toda Cataluña)" }, punts: "Puntos turísticos",
      ind: { pern: "Pernoctaciones", via: "Viajeros", ocup: "Ocupación", adr: "Precio (ADR)", revpar: "RevPAR", pl: "Plazas", pers: "Personal", estada: "Estancia media", ext: "% extranjeros" },
      ocup_camp: "Ocupación de parcelas", ocup_pl: "Ocupación de plazas",
      x_via: (m) => `Viajeros · ${m}`, x_pern: (m) => `Noches · ${m}`, x_ocup: (m) => `Ocupación · ${m}`, x_ext: (m) => `Noches de extranjeros · ${m}`,
      x_pl: (m) => `Plazas abiertas · ${m}`, x_estada: (m) => `Estancia media · ${m}`, x_adr: (m) => `Precio medio por noche · ${m}`, x_pers: (m) => `Personal · ${m}`,
      x_12: "Noches, últimos 12 meses",
      vs: (v, a) => `${v} que en ${a}`, fa: (v) => `hace un año, ${v}`, est: (n) => `${n} establecimientos abiertos`, dies: "días",
      revpar: (v) => `RevPAR ${v} € por habitación disponible`, cap_fs: (v) => `fines de semana, ${v}`, vs12: (v) => `${v} que los 12 anteriores`,
      g_anys: (i) => `${i}: cada mes, este año y los anteriores`, g_res: "Noches por residencia, últimos 24 meses",
      g_cmp: "Ocupación hotelera por plazas: Girona, Cataluña y España", g_orig: (a, b) => `De dónde son los residentes en España · noches de hotel de ${a} a ${b}`,
      esp: "Residentes en España", estr: "Residentes en el extranjero", gi: "Girona", cat: "Cataluña", e: "España",
      taula: "Los últimos 13 meses", mes: "Mes",
      mesos: ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"],
      mc: ["E", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"],
      nota_camp: "En los campings la ocupación se mide por parcelas. Muchos cierran en invierno: hay meses sin datos.",
      font: "Fuente: INE, Encuestas de ocupación en alojamientos turísticos (hoteles, campings, apartamentos y turismo rural) e Índice de precios hoteleros (ADR y RevPAR).",
    },
  };
  const tx = (k, ...a) => { const v = TX[LANG][k]; return typeof v === "function" ? v(...a) : v; };
  const etMes = (m) => `${tx("mesos")[+m.slice(5, 7) - 1]} ${m.slice(0, 4)}`;
  const etMesC = (m) => `${tx("mesos")[+m.slice(5, 7) - 1].slice(0, 3)}. ${m.slice(2, 4)}`;
  const NSV = "http://www.w3.org/2000/svg";
  const nou = (tag, at, pare) => { const e = document.createElementNS(NSV, tag); Object.entries(at).forEach(([k, v]) => e.setAttribute(k, v)); if (pare) pare.appendChild(e); return e; };
  const mesMes = (m, n) => { const a = +m.slice(0, 4), b = +m.slice(5, 7) - 1 + n; const y = a + Math.floor(b / 12), mm = ((b % 12) + 12) % 12; return `${y}-${String(mm + 1).padStart(2, "0")}`; };
  const varTxt = (v) => (v == null || !isFinite(v) ? "" : `<b class="${v >= 0 ? "puja" : "baixa"}">${pct(v, 1, true)}</b>`);

  // Máximo «redondo» del eje, sin dejar media gráfica vacía
  const sostre = (v) => { if (!(v > 0)) return 1; const p = Math.pow(10, Math.floor(Math.log10(v))); return [1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10].map((k) => k * p).find((k) => k >= v * 1.02) || 10 * p; };
  const talls = (top) => { const p = top / Math.pow(10, Math.floor(Math.log10(top))); return [1.2, 1.5, 3, 6].some((k) => Math.abs(p - k) < 1e-9) ? 3 : p === 2.5 || p === 5 ? 5 : 4; };
  let A = null, carregant = null;
  const est = { tipus: "hotel", zona: "gi", ind: "pern" };

  // Serie de una zona/tipo/indicador como {mes: valor}
  function serie(z, tipus, ind) {
    const s = A && A.z[z] && A.z[z].t[tipus] && A.z[z].t[tipus][ind];
    if (!s) return null;
    const o = {};
    s.v.forEach((v, i) => { if (v != null) o[mesMes(s.s, i)] = v; });
    return o;
  }
  function serieInd(z, tipus, ind) {
    if (ind !== "ext") return serie(z, tipus, ind);
    const p = serie(z, tipus, "pern"), x = serie(z, tipus, "pern_x");
    if (!p || !x) return null;
    const o = {};
    Object.keys(p).forEach((k) => { if (x[k] != null && p[k]) o[k] = (x[k] / p[k]) * 100; });
    return o;
  }
  const ultMes = (s) => { const ks = Object.keys(s || {}).sort(); return ks.length ? ks[ks.length - 1] : null; };
  const unitat = (ind) => (["ocup", "ext"].includes(ind) ? "%" : ["adr", "revpar"].includes(ind) ? "€" : ind === "estada" ? tx("dies") : "");
  const decs = (ind) => (["estada"].includes(ind) ? 2 : ["ocup", "ext", "adr", "revpar"].includes(ind) ? 1 : 0);
  const nomZona = (z) => tx("zones")[z] || (D.municipios.find((m) => m.ine === z) || {}).nom || z;

  // ---------- Gráficos ----------
  // Líneas de 12 meses: un trazo por año (actual en rojo, anterior en negro, 2019 discontinuo, el resto gris)
  function anys(cont, s, ind) {
    cont.innerHTML = "";
    const u = ultMes(s); if (!u) return;
    const ua = +u.slice(0, 4), dec = decs(ind);
    const llista = [...new Set([ua, ua - 1, ua - 2, ua - 3, 2019])].filter((a) => Object.keys(s).some((k) => +k.slice(0, 4) === a)).sort((a, b) => a - b);
    const cls = (a) => (a === ua ? "al-a0" : a === ua - 1 ? "al-a1" : a === 2019 ? "al-a19" : "al-ax");
    const series = llista.map((a) => ({ a, cls: cls(a), d: Array.from({ length: 12 }, (_, i) => s[`${a}-${String(i + 1).padStart(2, "0")}`] ?? null) }));
    const vals = series.flatMap((x) => x.d).filter((v) => v != null);
    const W = Math.max(280, cont.clientWidth || 520), H = W < 440 ? 210 : 240, top = sostre(Math.max(...vals));
    const m = { t: 12, r: 44, b: 24, l: Math.max(30, 10 + 7 * fmt(top).length) };
    const X = (i) => m.l + (i / 11) * (W - m.l - m.r), Y = (v) => m.t + (1 - v / top) * (H - m.t - m.b);
    const svg = nou("svg", { viewBox: `0 0 ${W} ${H}`, class: "pg", role: "img" }, cont);
    const div = talls(top);
    for (let i = 0; i <= div; i++) { const v = (top / div) * i; nou("line", { x1: m.l, x2: W - m.r, y1: Y(v), y2: Y(v), class: i ? "pg-g" : "pg-ref" }, svg); nou("text", { x: m.l - 6, y: Y(v) + 3.5, "text-anchor": "end", class: "pg-t" }, svg).textContent = fmt(v, top < 10 ? 1 : 0); }
    tx("mc").forEach((e, i) => { nou("text", { x: X(i), y: H - 6, "text-anchor": "middle", class: "pg-t" }, svg).textContent = e; });
    series.forEach((x) => {
      // Trazos partidos donde falta el mes (campings cerrados en invierno)
      let tram = [];
      const tanca = () => { if (tram.length > 1) nou("polyline", { points: tram.join(" "), class: `pg-l ${x.cls}` }, svg); else if (tram.length === 1) { const [cx, cy] = tram[0].split(","); nou("circle", { cx, cy, r: 2.5, class: `pg-p ${x.cls}` }, svg); } tram = []; };
      x.d.forEach((v, i) => { if (v == null) tanca(); else tram.push(`${X(i).toFixed(1)},${Y(v).toFixed(1)}`); });
      tanca();
      const li = x.d.map((v, i) => [v, i]).filter(([v]) => v != null).pop();
      if (li && (x.cls === "al-a0" || x.cls === "al-a1")) nou("text", { x: X(li[1]) + 6, y: Y(li[0]) + 3.5, class: `pg-e ${x.cls}` }, svg).textContent = x.a;
    });
    const guia = nou("line", { y1: m.t, y2: H - m.b, class: "pg-guia", visibility: "hidden" }, svg);
    const zona = nou("rect", { x: m.l - 6, y: m.t, width: W - m.l - m.r + 12, height: H - m.t - m.b, fill: "transparent" }, svg);
    zona.addEventListener("pointermove", (ev) => {
      const r = svg.getBoundingClientRect(), px = ((ev.clientX - r.left) / r.width) * W;
      const i = Math.max(0, Math.min(11, Math.round(((px - m.l) / (W - m.l - m.r)) * 11)));
      guia.setAttribute("x1", X(i)); guia.setAttribute("x2", X(i)); guia.setAttribute("visibility", "visible");
      const html = series.slice().reverse().map((x) => (x.d[i] != null ? `<br><i class="pg-dot ${x.cls}"></i>${x.a}: <b>${fmt(x.d[i], dec)}${unitat(ind) === "%" ? " %" : unitat(ind) === "€" ? " €" : ""}</b>` : "")).join("");
      mostraTip(`<b>${tx("mesos")[i]}</b>${html}`, ev.clientX, ev.clientY);
    });
    zona.addEventListener("pointerleave", () => { guia.setAttribute("visibility", "hidden"); amagaTip(); });
    const lleg = document.createElement("p");
    lleg.className = "al-lleg";
    lleg.innerHTML = series.slice().reverse().map((x) => `<span><i class="pg-dot ${x.cls}"></i>${x.a}</span>`).join("");
    cont.appendChild(lleg);
  }

  // Columnas apiladas de los últimos 24 meses: residentes en España + extranjero
  function residencia(cont, e, x) {
    cont.innerHTML = "";
    const u = ultMes(e); if (!u) return;
    const per = Array.from({ length: 24 }, (_, i) => mesMes(u, i - 23));
    const tot = per.map((k) => (e[k] || 0) + (x[k] || 0));
    const W = Math.max(280, cont.clientWidth || 520), H = W < 440 ? 200 : 230, top = sostre(Math.max(...tot) || 1);
    const esc = top >= 1e6 ? 1e6 : top >= 1e4 ? 1e3 : 1, suf = esc === 1e6 ? " M" : esc === 1e3 ? " mil" : "";
    const m = { t: 10, r: 6, b: 22, l: Math.max(40, 16 + 7.5 * (fmt(top / esc, 1) + suf).length) };
    const bw = (W - m.l - m.r) / per.length, Y = (v) => m.t + (1 - v / top) * (H - m.t - m.b);
    let s = `<svg viewBox="0 0 ${W} ${H}" class="pg" role="img">`;
    const div = talls(top);
    for (let i = 0; i <= div; i++) { const v = (top / div) * i; s += `<line x1="${m.l}" x2="${W - m.r}" y1="${Y(v)}" y2="${Y(v)}" class="${i ? "pg-g" : "pg-ref"}"/><text x="${m.l - 4}" y="${Y(v) + 3.5}" text-anchor="end" class="pg-t">${fmt(v / esc, top / esc < 10 ? 1 : 0)}${suf}</text>`; }
    per.forEach((k, i) => {
      const ve = e[k] || 0, vx = x[k] || 0, x0 = (m.l + i * bw + 1).toFixed(1), w = Math.max(1, bw - 2).toFixed(1);
      const t_ = `${etMes(k)}: ${fmt(ve + vx)} · ${tx("esp")} ${fmt(ve)} · ${tx("estr")} ${fmt(vx)}`;
      s += `<g class="al-col" data-t="${t_}"><rect x="${x0}" y="${Y(ve).toFixed(1)}" width="${w}" height="${(H - m.b - Y(ve)).toFixed(1)}" class="al-e"/><rect x="${x0}" y="${Y(ve + vx).toFixed(1)}" width="${w}" height="${(Y(ve) - Y(ve + vx)).toFixed(1)}" class="al-x"/></g>`;
      if (k.endsWith("-01") || (i === 0 && +k.slice(5, 7) < 10)) s += `<text x="${x0}" y="${H - 6}" class="pg-t">${k.slice(0, 4)}</text>`;
    });
    cont.innerHTML = s + `</svg><p class="al-lleg"><span><i class="pg-dot al-x"></i>${tx("estr")}</span><span><i class="pg-dot al-e"></i>${tx("esp")}</span></p>`;
    cont.querySelectorAll(".al-col").forEach((g) => {
      g.addEventListener("pointermove", (ev) => mostraTip(g.dataset.t, ev.clientX, ev.clientY));
      g.addEventListener("pointerleave", amagaTip);
    });
  }

  // Líneas mensuales (36 meses) de Girona, Cataluña y España
  function comparacio(cont, ind) {
    cont.innerHTML = "";
    const zs = [["gi", "pg-gi"], ["cat", "pg-cat"], ["esp", "pg-esp"]].map(([z, c]) => [z, c, serie(z, "hotel", ind)]).filter((x) => x[2]);
    if (!zs.length) return;
    const u = ultMes(zs[0][2]), per = Array.from({ length: 36 }, (_, i) => mesMes(u, i - 35));
    const vals = zs.flatMap(([, , s]) => per.map((k) => s[k])).filter((v) => v != null);
    const W = Math.max(280, cont.clientWidth || 520), H = W < 440 ? 210 : 240, top = sostre(Math.max(...vals));
    const m = { t: 12, r: 44, b: 24, l: 32 };
    const X = (i) => m.l + (i / 35) * (W - m.l - m.r), Y = (v) => m.t + (1 - v / top) * (H - m.t - m.b);
    const svg = nou("svg", { viewBox: `0 0 ${W} ${H}`, class: "pg", role: "img" }, cont);
    const div = talls(top);
    for (let i = 0; i <= div; i++) { const v = (top / div) * i; nou("line", { x1: m.l, x2: W - m.r, y1: Y(v), y2: Y(v), class: i ? "pg-g" : "pg-ref" }, svg); nou("text", { x: m.l - 6, y: Y(v) + 3.5, "text-anchor": "end", class: "pg-t" }, svg).textContent = fmt(v); }
    per.forEach((k, i) => { if (k.endsWith("-01")) nou("text", { x: X(i), y: H - 6, "text-anchor": "middle", class: "pg-t" }, svg).textContent = k.slice(0, 4); });
    zs.forEach(([, c, s]) => {
      nou("polyline", { points: per.map((k, i) => (s[k] != null ? `${X(i).toFixed(1)},${Y(s[k]).toFixed(1)}` : null)).filter(Boolean).join(" "), class: `pg-l ${c}` }, svg);
      if (s[u] != null) { nou("circle", { cx: X(35), cy: Y(s[u]), r: 3.5, class: `pg-p ${c}` }, svg); }
    });
    const fins = zs.filter(([, , s]) => s[u] != null).map(([, c, s]) => ({ y: Y(s[u]), v: s[u], c })).sort((a, b) => a.y - b.y);
    for (let i = 1; i < fins.length; i++) if (fins[i].y - fins[i - 1].y < 12) fins[i].y = fins[i - 1].y + 12;
    fins.forEach((f) => { nou("text", { x: W - m.r + 6, y: f.y + 3.5, class: `pg-e ${f.c}` }, svg).textContent = fmt(f.v, 0); });
    const guia = nou("line", { y1: m.t, y2: H - m.b, class: "pg-guia", visibility: "hidden" }, svg);
    const zona = nou("rect", { x: m.l, y: m.t, width: W - m.l - m.r, height: H - m.t - m.b, fill: "transparent" }, svg);
    const noms = { gi: tx("gi"), cat: tx("cat"), esp: tx("e") };
    zona.addEventListener("pointermove", (ev) => {
      const r = svg.getBoundingClientRect(), px = ((ev.clientX - r.left) / r.width) * W;
      const i = Math.max(0, Math.min(35, Math.round(((px - m.l) / (W - m.l - m.r)) * 35)));
      guia.setAttribute("x1", X(i)); guia.setAttribute("x2", X(i)); guia.setAttribute("visibility", "visible");
      mostraTip(`<b>${etMes(per[i])}</b>` + zs.map(([z, c, s]) => (s[per[i]] != null ? `<br><i class="pg-dot ${c}"></i>${noms[z]}: <b>${fmt(s[per[i]], 1)}${ind === "ocup" ? " %" : " €"}</b>` : "")).join(""), ev.clientX, ev.clientY);
    });
    zona.addEventListener("pointerleave", () => { guia.setAttribute("visibility", "hidden"); amagaTip(); });
    const lleg = document.createElement("p");
    lleg.className = "al-lleg";
    lleg.innerHTML = zs.map(([z, c]) => `<span><i class="pg-dot ${c}"></i>${noms[z]}</span>`).join("");
    cont.appendChild(lleg);
  }

  function barresOrig(cont) {
    const O = A.orig; if (!O) { cont.innerHTML = ""; return; }
    const g = O.g.slice(0, 8), mx = g[0].v;
    cont.innerHTML = `<ol class="al-orig">${g.map((x) => `<li><span>${x.g}</span><b style="--w:${(x.v / mx) * 100}%"></b><em>${pct(x.v, 1)}</em></li>`).join("")}</ol>`;
  }

  // ---------- Bloque ----------
  function pinta(cont, fix) {
    if (!cont) return;
    if (!A) {
      if (!carregant) carregant = fetch("datos/allotjaments.json").then((r) => (r.ok ? r.json() : null)).catch(() => null).then((d) => { A = d; });
      carregant.then(() => pinta(cont, fix));
      return;
    }
    if (!A.z || (fix && !A.z[fix])) { cont.innerHTML = ""; return; }
    const st = fix ? (cont._est = cont._est || { tipus: null, ind: "pern" }) : est;
    const zona = fix || st.zona;
    const tipusZ = ["hotel", "camp", "apt", "rural"].filter((t_) => A.z[zona] && A.z[zona].t[t_]);
    if (!tipusZ.includes(st.tipus)) st.tipus = tipusZ[0];
    const T = st.tipus, Z = A.z[zona].t[T];
    const inds = ["pern", "via", "ocup", "ext", "adr", "revpar", "pl", "pers", "estada"].filter((k) => (k === "ext" ? Z.pern_x : Z[k]));
    if (!inds.includes(st.ind)) st.ind = inds[0];
    const pern = serie(zona, T, "pern"), u = ultMes(pern) || A.ult[T];
    const ant = mesMes(u, -12);
    const v = (ind, k = u) => { const s = serieInd(zona, T, ind); return s ? s[k] : null; };
    const dv = (ind) => { const a = v(ind), b = v(ind, ant); return a != null && b ? (a / b - 1) * 100 : null; };
    const tiles = [];
    const mesTxt = etMes(u);
    if (v("pern") != null) tiles.push(tile(tx("x_pern", mesTxt), fmt(v("pern")), dv("pern") != null ? tx("vs", varTxt(dv("pern")), etMes(ant)) : ""));
    if (v("via") != null) tiles.push(tile(tx("x_via", mesTxt), fmt(v("via")), dv("via") != null ? tx("vs", varTxt(dv("via")), etMes(ant)) : ""));
    if (v("ocup") != null) tiles.push(tile(tx("x_ocup", mesTxt), pct(v("ocup"), 1), [v("ocup", ant) != null ? tx("fa", pct(v("ocup", ant), 1)) : "", v("ocup_fs") != null ? tx("cap_fs", pct(v("ocup_fs"), 0)) : ""].filter(Boolean).join(" · ")));
    if (v("ext") != null) tiles.push(tile(tx("x_ext", mesTxt), pct(v("ext"), 0), v("ext", ant) != null ? tx("fa", pct(v("ext", ant), 0)) : ""));
    if (v("adr") != null) tiles.push(tile(tx("x_adr", mesTxt), `${fmt(v("adr"))} <small>€</small>`, [dv("adr") != null ? tx("vs", varTxt(dv("adr")), etMes(ant)) : "", v("revpar") != null ? tx("revpar", fmt(v("revpar"))) : ""].filter(Boolean).join(" · ")));
    if (v("pl") != null) tiles.push(tile(tx("x_pl", mesTxt), fmt(v("pl")), v("est") != null ? tx("est", fmt(v("est"))) : ""));
    if (v("estada") != null) tiles.push(tile(tx("x_estada", mesTxt), `${fmt(v("estada"), 1)} <small>${tx("dies")}</small>`, v("estada", ant) != null ? tx("fa", fmt(v("estada", ant), 1)) : ""));
    if (v("pers") != null) tiles.push(tile(tx("x_pers", mesTxt), fmt(v("pers")), dv("pers") != null ? tx("vs", varTxt(dv("pers")), etMes(ant)) : ""));
    if (pern) {
      const s12 = (fi) => { let s = 0, n = 0; for (let i = 0; i < 12; i++) { const x = pern[mesMes(fi, -i)]; if (x != null) { s += x; n++; } } return n ? s : null; };
      const a = s12(u), b = s12(ant);
      if (a != null) tiles.push(tile(tx("x_12"), a >= 1e6 ? `${fmt(a / 1e6, 2)} <small>M</small>` : fmt(a), b ? tx("vs12", varTxt((a / b - 1) * 100)) : ""));
    }
    // Tabla de los últimos 13 meses
    const files = Array.from({ length: 13 }, (_, i) => mesMes(u, -i));
    const cols = ["via", "pern", "ocup", "ext", "estada", "adr"].filter((k) => inds.includes(k) || (k === "via" && Z.via));
    const cel = (k, m) => { const x = v(k, m); return x == null ? "–" : k === "ocup" || k === "ext" ? pct(x, k === "ext" ? 0 : 1) : k === "adr" ? `${fmt(x)} €` : k === "estada" ? fmt(x, 1) : fmt(x); };
    const ocupNom = T === "camp" ? tx("ocup_camp") : tx("ocup_pl");
    const zonesSel = fix ? "" : (() => {
      const base = ["gi", "cb", "pir"].filter((z) => A.z[z]);
      const punts = Object.keys(A.z).filter((z) => /^\d{5}$/.test(z)).sort((a, b) => nomZona(a).localeCompare(nomZona(b)));
      return `<label class="ex-any al-zona"><span>${tx("zona")}</span><select>${base.map((z) => `<option value="${z}"${z === zona ? " selected" : ""}>${nomZona(z)}</option>`).join("")}<optgroup label="${tx("punts")}">${punts.map((z) => `<option value="${z}"${z === zona ? " selected" : ""}>${nomZona(z)} · ${Object.keys(A.z[z].t).map((t_) => tx("tipus")[t_].toLowerCase()).join(", ")}</option>`).join("")}</optgroup></select></label>`;
    })();
    const sub = fix ? tx("sub_f", nomZona(fix), etMes(u)) : tx("sub", etMes(A.ult.hotel || u));
    const indNom = (k) => (k === "ocup" ? ocupNom : tx("ind")[k]);
    const esProv = !fix && zona === "gi" && T === "hotel";
    cont.innerHTML = `<section class="al">
      <h3 class="al-tit">${tx("tit")}</h3><p class="al-sub">${sub}</p>
      <div class="ex-ctl al-ctl"><div class="segment al-tipus" role="group">${tipusZ.map((t_) => `<button type="button" data-tipus="${t_}" aria-pressed="${t_ === T}">${tx("tipus")[t_]}</button>`).join("")}</div>${zonesSel}</div>
      <div class="xifres al-xifres">${tiles.join("")}</div>
      <div class="pg-graella al-graella">
        <figure class="pg-fig al-fig-anys" data-id="al_anys"><figcaption><span class="pg-tit">${tx("g_anys", indNom(st.ind))}</span><span class="unitat">${unitat(st.ind)}</span></figcaption>
          <div class="al-inds" role="group">${inds.map((k) => `<button type="button" class="xip" data-ind="${k}" aria-checked="${k === st.ind}">${indNom(k)}</button>`).join("")}</div>
          <div class="al-g-anys"></div></figure>
        ${Z.pern_e ? `<figure class="pg-fig" data-id="al_res"><figcaption><span class="pg-tit">${tx("g_res")}</span></figcaption><div class="al-g-res"></div></figure>` : ""}
        ${esProv ? `<figure class="pg-fig" data-id="al_cmp"><figcaption><span class="pg-tit">${tx("g_cmp")}</span><span class="unitat">%</span></figcaption><div class="al-g-cmp"></div></figure>` : ""}
        ${esProv && A.orig ? `<figure class="pg-fig" data-id="al_orig"><figcaption><span class="pg-tit">${tx("g_orig", etMes(A.orig.des), etMes(A.orig.fins))}</span><span class="unitat">%</span></figcaption><div class="al-g-orig"></div></figure>` : ""}
      </div>
      <div class="al-taula-c"><p class="al-ttit">${tx("taula")}</p><table class="al-taula"><thead><tr><th>${tx("mes")}</th>${cols.map((k) => `<th>${indNom(k)}</th>`).join("")}</tr></thead>
        <tbody>${files.map((m) => `<tr><td>${etMesC(m)}</td>${cols.map((k) => `<td>${cel(k, m)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>
      <p class="fb-font">${T === "camp" ? tx("nota_camp") + " " : ""}${tx("font")}</p></section>`;
    cont.querySelectorAll("[data-tipus]").forEach((b) => b.addEventListener("click", () => { st.tipus = b.dataset.tipus; pinta(cont, fix); }));
    cont.querySelectorAll("[data-ind]").forEach((b) => b.addEventListener("click", () => { st.ind = b.dataset.ind; pinta(cont, fix); }));
    const sel = cont.querySelector(".al-zona select");
    if (sel) sel.addEventListener("change", (e) => { st.zona = e.target.value; pinta(cont, fix); });
    anys(cont.querySelector(".al-g-anys"), serieInd(zona, T, st.ind) || {}, st.ind);
    const gr = cont.querySelector(".al-g-res"); if (gr) residencia(gr, serie(zona, T, "pern_e") || {}, serie(zona, T, "pern_x") || {});
    const gc = cont.querySelector(".al-g-cmp"); if (gc) comparacio(gc, "ocup");
    const go = cont.querySelector(".al-g-orig"); if (go) barresOrig(go);
  }

  window.pintaAllotjaments = () => pinta(document.getElementById("tur-allot"));
  window.fitxaAllotjaments = (cont, m) => pinta(cont, m.ine);
})();
