// Fitxa del municipio: construcción, vivienda protegida, cédulas de habitabilidad, pisos vacíos
// de personas jurídicas y planeamiento (Generalitat), comparados con la provincia y Cataluña.
(function () {
  const TX = {
    ca: {
      tit: "Construcció i planejament", sub: (a) => `Departament de Territori, Habitatge i Transició Ecològica i Agència Tributària de Catalunya. Dades del ${a}.`,
      ind: "Indicador", prov: "Província", cat: "Catalunya",
      zona: "Zona de mercat residencial tensionat", ptsh: "Pla sectorial d'habitatge", si1: "sí, des del 2024", si2: "sí, des del 2025", no: "no",
      g_ini: "Habitatges iniciats i acabats", u_ini: "per 1.000 habitants", s_ini: "Iniciats", s_aca: "Acabats", g_ced: "Cèdules d'habitabilitat", u_ced: "per 1.000 habitatges",
      files: { ini: "Habitatges iniciats", aca: "Habitatges acabats", hpo10: "Protegits entre els acabats (10 anys)", ced: "Cèdules d'habitabilitat", m2: "Superfície útil mitjana (cèdules)", ihb: "Pisos buits de bancs i empreses", pend: "Habitatges previstos i no construïts", su: "Sòl urbà", surb: "Sòl urbanitzable", su_hab: "Sòl urbà per habitant" },
      u: { ini: "per 1.000 hab.", aca: "per 1.000 hab.", ced: "per 1.000 habitatges", ihb: "per 1.000 habitatges", pend: "per 100 habitatges" },
      n_ini: (n, a) => `${n} el ${a}`, n_hpo: (h, t) => `${h} de ${t}`, n_ihb: (n) => `${n} pisos`, n_pend: (n) => `${n} habitatges`,
      noms_ptsh: { "ADFA 1": "demanda forta i acreditada", "ADFA 2": "demanda forta i acreditada", Preferent: "àrea preferent", "No preferent": "àrea no preferent", Rural: "àrea rural" },
      font: "Font: Departament de Territori (habitatges iniciats i acabats, habitatge protegit, cèdules d'habitabilitat, àrees de política d'habitatge, Mapa urbanístic de Catalunya) i Agència Tributària de Catalunya (impost sobre els habitatges buits). Taxes per habitatge: immobles residencials del Cadastre. La Generalitat no publica dades d'Espanya.",
    },
    es: {
      tit: "Construcción y planeamiento", sub: (a) => `Departament de Territori, Habitatge i Transició Ecològica y Agència Tributària de Catalunya. Datos de ${a}.`,
      ind: "Indicador", prov: "Provincia", cat: "Cataluña",
      zona: "Zona de mercado residencial tensionado", ptsh: "Plan sectorial de vivienda", si1: "sí, desde 2024", si2: "sí, desde 2025", no: "no",
      g_ini: "Viviendas iniciadas y acabadas", u_ini: "por 1.000 habitantes", s_ini: "Iniciadas", s_aca: "Acabadas", g_ced: "Cédulas de habitabilidad", u_ced: "por 1.000 viviendas",
      files: { ini: "Viviendas iniciadas", aca: "Viviendas acabadas", hpo10: "Protegidas entre las acabadas (10 años)", ced: "Cédulas de habitabilidad", m2: "Superficie útil media (cédulas)", ihb: "Pisos vacíos de bancos y empresas", pend: "Viviendas previstas y no construidas", su: "Suelo urbano", surb: "Suelo urbanizable", su_hab: "Suelo urbano por habitante" },
      u: { ini: "por 1.000 hab.", aca: "por 1.000 hab.", ced: "por 1.000 viviendas", ihb: "por 1.000 viviendas", pend: "por 100 viviendas" },
      n_ini: (n, a) => `${n} en ${a}`, n_hpo: (h, t) => `${h} de ${t}`, n_ihb: (n) => `${n} pisos`, n_pend: (n) => `${n} viviendas`,
      noms_ptsh: { "ADFA 1": "demanda fuerte y acreditada", "ADFA 2": "demanda fuerte y acreditada", Preferent: "área preferente", "No preferent": "área no preferente", Rural: "área rural" },
      font: "Fuente: Departament de Territori (viviendas iniciadas y acabadas, vivienda protegida, cédulas de habitabilidad, áreas de política de vivienda, Mapa urbanístico de Cataluña) y Agència Tributària de Catalunya (impuesto sobre las viviendas vacías). Tasas por vivienda: inmuebles residenciales del Catastro. La Generalitat no publica datos de España.",
    },
  };
  const tx = (k, ...a) => { const v = TX[LANG][k]; return typeof v === "function" ? v(...a) : v; };
  const A = (k) => D.anys && D.anys[k];
  const ult = (o) => { const ks = Object.keys(o || {}).sort(); return ks.length ? ks[ks.length - 1] : null; };
  const ser = (k, z) => { const o = {}; Object.entries((D.hb_ref && D.hb_ref[k]) || {}).forEach(([y, r]) => { if (r && r[z] != null) o[y] = r[z]; }); return o; };
  const refA = (k, z, a) => { const r = D.hb_ref && D.hb_ref[k] && D.hb_ref[k][a]; return r ? r[z] : null; };

  window.fitxaHabitatge = (cont, m) => {
    if (!cont) return;
    const h = m.hb || {}, f = m.hbf || {};
    if (!m.hb && !m.hbf) { cont.innerHTML = ""; return; }
    const aI = String(A("hb_ini")), aC = String(A("hb_ced")), aB = String(A("hb_ihb")), aU = String(A("hb_urb"));
    const v = (k, a) => (h[k] && h[k][a] != null ? h[k][a] : null);
    const pl = (D.hb_ref && D.hb_ref.plan) || {};
    const F = {
      n1: (x) => (x == null ? "–" : fmt(x, 1)), n2: (x) => (x == null ? "–" : fmt(x, 2)), p: (x) => (x == null ? "–" : pct(x, 1)), m2: (x) => (x == null ? "–" : `${fmt(x)} m²`),
    };
    // [clave, valor, prov, cat, formato, nota]
    const files = [
      ["ini", v("ini", aI), refA("ini", "gi", aI), refA("ini", "cat", aI), F.n1, v("n_ini", aI) != null ? tx("n_ini", fmt(v("n_ini", aI)), aI) : ""],
      ["aca", v("aca", aI), refA("aca", "gi", aI), refA("aca", "cat", aI), F.n1, v("n_aca", aI) != null ? tx("n_ini", fmt(v("n_aca", aI)), aI) : ""],
      ["hpo10", f.hpo10, null, null, F.p, f.n_aca10 != null ? tx("n_hpo", fmt(f.n_hpo10), fmt(f.n_aca10)) : ""],
      ["ced", v("ced", aC), refA("ced", "gi", aC), refA("ced", "cat", aC), F.n1, v("n_ced", aC) != null ? tx("n_ini", fmt(v("n_ced", aC)), aC) : ""],
      ["m2", v("ced_m2", aC), refA("ced_m2", "gi", aC), refA("ced_m2", "cat", aC), F.m2, ""],
      ["ihb", v("ihb", aB), refA("ihb", "gi", aB), refA("ihb", "cat", aB), F.n2, v("n_ihb", aB) != null ? tx("n_ihb", fmt(v("n_ihb", aB))) : ""],
      ["pend", f.pend_viv, pl.gi && pl.gi.pend_viv, pl.cat && pl.cat.pend_viv, F.n1, f.pend != null ? tx("n_pend", fmt(f.pend)) : ""],
      ["su", v("u_su", aU), refA("u_su", "gi", aU), refA("u_su", "cat", aU), F.p, ""],
      ["surb", v("u_surb", aU), refA("u_surb", "gi", aU), refA("u_surb", "cat", aU), F.p, ""],
      ["su_hab", v("u_su_hab", aU), refA("u_su_hab", "gi", aU), refA("u_su_hab", "cat", aU), F.m2, ""],
    ];
    // Protegidas: referencias de la provincia y Cataluña de los mismos 10 años
    const hp = (z) => { const R = D.hb_ref || {}, a = Number(A("hb_hpo")); let s = 0, t = 0; for (let y = a - 9; y <= a; y++) { const x = refA("n_aca_hpo", z, y), w = refA("n_aca", z, y); if (x != null && w != null) { s += x; t += w; } } return t && R ? (s / t) * 100 : null; };
    files[2][2] = hp("gi"); files[2][3] = hp("cat");
    const un = TX[LANG].u;
    const html = files.filter((x) => x[1] != null).map(([k, val, g, c, fm, n]) => `<tr><th scope="row">${tx("files")[k]}${un[k] ? ` <small>${un[k]}</small>` : ""}${n ? `<small class="hb-n">${n}</small>` : ""}</th><td class="tb-v">${fm(val)}</td>
      <td class="tb-r" data-l="${tx("prov")}">${fm(g)}</td><td class="tb-r" data-l="${tx("cat")}">${fm(c)}</td></tr>`).join("");
    const zona = f.zmrt === "ZMRT 1" ? tx("si1") : f.zmrt === "ZMRT 2" ? tx("si2") : f.zmrt ? tx("no") : null;
    const ptsh = f.ptsh ? tx("noms_ptsh")[f.ptsh] || f.ptsh : null;
    const xips = [zona ? `<span class="hb-xip${f.zmrt && f.zmrt !== "no" ? " hb-si" : ""}">${tx("zona")}: <b>${zona}</b></span>` : "", ptsh ? `<span class="hb-xip">${tx("ptsh")}: <b>${ptsh}</b></span>` : ""].join("");
    cont.innerHTML = `<section class="tb cd hb"><h3 class="ajt-tit">${tx("tit")}</h3><p class="tb-sub">${tx("sub", aI)}</p>
      ${xips ? `<p class="hb-xips">${xips}</p>` : ""}
      <div class="tb-cos">
        <div class="tb-taula"><table><thead><tr><th>${tx("ind")}</th><th class="tb-v">${m.nom}</th><th>${tx("prov")}</th><th>${tx("cat")}</th></tr></thead><tbody>${html}</tbody></table></div>
        <div class="cd-grafs"><figure class="grafic"><figcaption><span>${tx("g_ini")}</span><span class="unitat">${tx("u_ini")}</span></figcaption><div class="g-hini"></div></figure>
        <figure class="grafic cd-g2"><figcaption><span>${tx("g_ced")}</span><span class="unitat">${tx("u_ced")}</span></figcaption><div class="g-hced"></div></figure></div>
      </div>
      <p class="fb-font">${tx("font")}</p></section>`;
    const desde = (o, a0) => Object.fromEntries(Object.entries(o || {}).filter(([y]) => Number(y) >= a0));
    grafLinia(cont.querySelector(".g-hini"), [
      { nom: `${m.nom} · ${tx("s_ini")}`, color: "var(--serie-1)", dades: desde(h.ini, 1996) },
      { nom: `${m.nom} · ${tx("s_aca")}`, color: "var(--accent)", dades: desde(h.aca, 1996) },
      { nom: `${tx("prov")} · ${tx("s_ini")}`, color: "var(--serie-2)", dades: desde(ser("ini", "gi"), 1996) },
      { nom: `${tx("cat")} · ${tx("s_ini")}`, color: "var(--text-3)", dades: desde(ser("ini", "cat"), 1996) },
    ], (x) => (x == null ? "–" : fmt(x, 1)));
    grafLinia(cont.querySelector(".g-hced"), [
      { nom: m.nom, color: "var(--serie-1)", dades: h.ced || {} },
      { nom: tx("prov"), color: "var(--serie-2)", dades: ser("ced", "gi") },
      { nom: tx("cat"), color: "var(--text-3)", dades: ser("ced", "cat") },
    ], (x) => (x == null ? "–" : fmt(x, 1)));
  };
})();
