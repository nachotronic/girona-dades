// Fitxa del municipio: impuestos municipales (tipos de Hacienda, SGFAL) comparados con la provincia,
// Cataluña, España y los límites legales, más la evolución del tipo del IBI urbano.
(function () {
  const TX = {
    ca: {
      tit: "Impostos municipals", sub: (a) => `Tipus fixats per l'ajuntament a les ordenances fiscals de ${a}`,
      impost: "Impost", prov: "Província", cat: "Catalunya", esp: "Espanya", marge: "Marge legal",
      g_ibi: "Tipus de l'IBI urbà", u_pct: "% del valor cadastral",
      max: (n) => (n === 0 ? "Cap dels cinc impostos principals és al màxim legal." : `${n} dels cinc impostos principals ${n === 1 ? "és" : "són"} al màxim legal.`),
      rev: (a) => `Última revisió cadastral: ${a}.`,
      font: "Font: Ministeri d'Hisenda, consulta de tipus impositius municipals. Referències: mitjanes ponderades per població; Espanya sense el País Basc ni Navarra.",
      sense: "L'ajuntament no ha enviat les seves ordenances a Hisenda.",
      noms: { ibi_u: "IBI urbà", ibi_r: "IBI rústic", ibi_bice: "IBI d'equipaments especials", iae_max: "IAE (coef. màxim)", ivtm_12: "Circulació (turisme 12-16 CV)", iivtnu: "Plusvàlua", icio: "ICIO (obres)" },
    },
    es: {
      tit: "Impuestos municipales", sub: (a) => `Tipos fijados por el ayuntamiento en las ordenanzas fiscales de ${a}`,
      impost: "Impuesto", prov: "Provincia", cat: "Cataluña", esp: "España", marge: "Margen legal",
      g_ibi: "Tipo del IBI urbano", u_pct: "% del valor catastral",
      max: (n) => (n === 0 ? "Ninguno de los cinco impuestos principales está al máximo legal." : `${n} de los cinco impuestos principales ${n === 1 ? "está" : "están"} al máximo legal.`),
      rev: (a) => `Última revisión catastral: ${a}.`,
      font: "Fuente: Ministerio de Hacienda, consulta de tipos impositivos municipales. Referencias: medias ponderadas por población; España sin el País Vasco ni Navarra.",
      sense: "El ayuntamiento no ha enviado sus ordenanzas a Hacienda.",
      noms: { ibi_u: "IBI urbano", ibi_r: "IBI rústico", ibi_bice: "IBI de equipamientos especiales", iae_max: "IAE (coef. máximo)", ivtm_12: "Circulación (turismo 12-16 CV)", iivtnu: "Plusvalía", icio: "ICIO (obras)" },
    },
  };
  const tx = (k, ...a) => { const v = TX[LANG][k]; return typeof v === "function" ? v(...a) : v; };
  // Límites legales (TRLRHL). El IBI urbano puede superar el 1,10 % con los incrementos del art. 72.3.
  const LIM = {
    ibi_u: [0.4, 1.1, 2, "%"], ibi_r: [0.3, 0.9, 2, "%"], ibi_bice: [0.4, 1.3, 2, "%"], iae_max: [0.4, 3.8, 2, ""],
    ivtm_12: [71.94, 143.88, 2, "€"], iivtnu: [0, 30, 1, "%"], icio: [0, 4, 2, "%"],
  };
  const f = (k, v) => (v == null ? "–" : `${fmt(v, LIM[k][2])}${LIM[k][3] ? ` ${LIM[k][3]}` : ""}`);
  const ultimAny = (m) => {
    const a = D.anys && D.anys.trib;
    if (a && m.trib && m.trib.ibi_u && m.trib.ibi_u[a] != null) return String(a);
    const ks = Object.keys((m.trib && m.trib.ibi_u) || {}).sort();
    return ks.length ? ks[ks.length - 1] : null;
  };

  window.fitxaTributs = (cont, m) => {
    if (!cont) return;
    const a = m.trib ? ultimAny(m) : null;
    if (!a) { cont.innerHTML = D.trib_ref ? `<section class="tb"><h3 class="ajt-tit">${tx("tit")}</h3><p class="tb-sub">${tx("sense")}</p></section>` : ""; return; }
    const ref = (k, z) => { const r = D.trib_ref && D.trib_ref[k] && D.trib_ref[k][a]; return r ? r[z] : null; };
    const files = Object.keys(LIM).map((k) => {
      const v = m.trib[k] && m.trib[k][a];
      if (v == null) return "";
      const [mn, mx] = LIM[k];
      const top = Math.max(mx, v), X = (x) => Math.max(0, Math.min(100, ((x - mn) / (top - mn || 1)) * 100));
      const alMax = v >= mx - 0.005;
      return `<tr${alMax ? ' class="tb-max"' : ""}><th scope="row">${tx("noms")[k]}</th>
        <td class="tb-v">${f(k, v)}</td><td class="tb-r" data-l="${tx("prov")}">${f(k, ref(k, "gi"))}</td><td class="tb-r" data-l="${tx("cat")}">${f(k, ref(k, "cat"))}</td><td class="tb-r" data-l="${tx("esp")}">${f(k, ref(k, "esp"))}</td>
        <td class="tb-marge"><span class="tb-barra" title="${f(k, mn)} – ${f(k, mx)}"><b style="width:${X(v).toFixed(1)}%"></b>${top > mx ? `<i style="left:${X(mx).toFixed(1)}%"></i>` : ""}</span><small>${f(k, mn)} – ${f(k, mx)}</small></td></tr>`;
    }).join("");
    let n = 0, k = 0;
    Object.entries(window.TRIB_MAX || {}).forEach(([c, mx]) => { const v = m.trib[c] && m.trib[c][a]; if (v != null) { k++; if (v >= mx - 0.005) n++; } });
    const rev = m.trib.ibi_rev && m.trib.ibi_rev[a];
    cont.innerHTML = `<section class="tb"><h3 class="ajt-tit">${tx("tit")}</h3><p class="tb-sub">${tx("sub", a)}. ${k >= 4 ? tx("max", n) : ""} ${rev ? tx("rev", rev) : ""}</p>
      <div class="tb-cos">
        <div class="tb-taula"><table><thead><tr><th>${tx("impost")}</th><th class="tb-v">${m.nom}</th><th>${tx("prov")}</th><th>${tx("cat")}</th><th>${tx("esp")}</th><th>${tx("marge")}</th></tr></thead><tbody>${files}</tbody></table></div>
        <figure class="grafic"><figcaption><span>${tx("g_ibi")}</span><span class="unitat">${tx("u_pct")}</span></figcaption><div class="g-ibi"></div></figure>
      </div>
      <p class="fb-font">${tx("font")}</p></section>`;
    const serie = (z) => { const o = {}; Object.entries((D.trib_ref && D.trib_ref.ibi_u) || {}).forEach(([y, r]) => { if (r[z] != null) o[y] = r[z]; }); return o; };
    grafLinia(cont.querySelector(".g-ibi"), [
      { nom: m.nom, color: "var(--serie-1)", dades: m.trib.ibi_u || {} },
      { nom: tx("prov"), color: "var(--serie-2)", dades: serie("gi") },
      { nom: tx("cat"), color: "var(--text-3)", dades: serie("cat") },
      { nom: tx("esp"), color: "var(--accent)", dades: serie("esp") },
    ], (v) => (v == null ? "–" : `${fmt(v, 2)} %`));
  };
})();
