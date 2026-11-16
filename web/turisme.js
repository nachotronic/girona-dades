// Turismo: cifras de la sección Turisme y bloque de la ficha del municipio
// (plazas del Registre de Turisme, pisos turísticos, turistas según la telefonía móvil, impuesto turístico).
(function () {
  const TX = {
    ca: {
      tit: "Turisme", sub: "Places d'allotjament d'avui, pisos turístics per any i turistes segons la telefonia mòbil.",
      k_places: "Places turístiques", n_places: (v) => `${v} per cada 100 habitants`,
      k_hut: "Pisos turístics", n_hut: (v) => `${v} per cada 100 habitatges`,
      k_hotels: "Places d'hotel", n_hotels: (n) => `${n} hotels i hostals`,
      k_camp: "Places de càmping", n_camp: (n) => `${n} càmpings`,
      k_ext: (a) => `Turistes estrangers ${a}`, n_ext: (v) => `${v} per habitant`,
      k_nac: (a) => `D'altres províncies ${a}`,
      k_ieet: (a) => `Impost turístic ${a}`, n_ieet: (v) => `${v} € per habitant`,
      k_pern: (a) => `Nits d'hotel ${a}`, n_pern: (o) => `ocupació mitjana del ${o}`,
      g_mov: "Turistes a l'any", g_hut: "Pisos turístics registrats", g_mesos: (a) => `Turistes de cada mes, ${a}`,
      estr: "Estrangers", nac: "D'altres províncies", fr: (v) => `El ${v} dels estrangers són francesos.`,
      estiu: (v) => `El juliol i l'agost hi arriba el ${v} dels turistes de l'any.`,
      font: "Fonts: Registre de Turisme de Catalunya; Xifra (Diputació de Girona); INE, turisme a partir de la telefonia mòbil (experimental); Agència Tributària de Catalunya.",
      mesos: ["G", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"],
      x_places: "Places turístiques", xn_places: (v) => `${v} per cada 100 habitants`,
      x_hut: "Pisos turístics", xn_hut: (v) => `${v} places`,
      x_pern: (a) => `Nits d'hotel ${a}`, xn_pern: (v) => `${v} de turistes estrangers`,
      x_ext: (a) => `Visites d'estrangers ${a}`, xn_ext: (v) => `i ${v} M d'altres províncies (mòbils)`,
      x_ocup: (a) => `Ocupació hotelera ${a}`, xn_ocup: (v) => `Catalunya, ${v}`,
      x_adr: (a) => `Preu mitjà de l'hotel ${a}`, xn_adr: (v) => `per habitació i nit · Catalunya, ${v} €`,
    },
    es: {
      tit: "Turismo", sub: "Plazas de alojamiento de hoy, pisos turísticos por año y turistas según la telefonía móvil.",
      k_places: "Plazas turísticas", n_places: (v) => `${v} por cada 100 habitantes`,
      k_hut: "Pisos turísticos", n_hut: (v) => `${v} por cada 100 viviendas`,
      k_hotels: "Plazas de hotel", n_hotels: (n) => `${n} hoteles y hostales`,
      k_camp: "Plazas de camping", n_camp: (n) => `${n} campings`,
      k_ext: (a) => `Turistas extranjeros ${a}`, n_ext: (v) => `${v} por habitante`,
      k_nac: (a) => `De otras provincias ${a}`,
      k_ieet: (a) => `Impuesto turístico ${a}`, n_ieet: (v) => `${v} € por habitante`,
      k_pern: (a) => `Noches de hotel ${a}`, n_pern: (o) => `ocupación media del ${o}`,
      g_mov: "Turistas al año", g_hut: "Pisos turísticos registrados", g_mesos: (a) => `Turistas de cada mes, ${a}`,
      estr: "Extranjeros", nac: "De otras provincias", fr: (v) => `El ${v} de los extranjeros son franceses.`,
      estiu: (v) => `En julio y agosto llega el ${v} de los turistas del año.`,
      font: "Fuentes: Registre de Turisme de Catalunya; Xifra (Diputació de Girona); INE, turismo a partir de la telefonía móvil (experimental); Agència Tributària de Catalunya.",
      mesos: ["E", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"],
      x_places: "Plazas turísticas", xn_places: (v) => `${v} por cada 100 habitantes`,
      x_hut: "Pisos turísticos", xn_hut: (v) => `${v} plazas`,
      x_pern: (a) => `Noches de hotel ${a}`, xn_pern: (v) => `${v} de turistas extranjeros`,
      x_ext: (a) => `Visitas de extranjeros ${a}`, xn_ext: (v) => `y ${v} M de otras provincias (móviles)`,
      x_ocup: (a) => `Ocupación hotelera ${a}`, xn_ocup: (v) => `Cataluña, ${v}`,
      x_adr: (a) => `Precio medio del hotel ${a}`, xn_adr: (v) => `por habitación y noche · Cataluña, ${v} €`,
    },
  };
  const tx = (k, ...a) => { const v = TX[LANG][k]; return typeof v === "function" ? v(...a) : v; };
  const ultA = (o) => { const ks = Object.keys(o || {}).sort(); return ks.length ? ks[ks.length - 1] : null; };
  const ultS = (sp, k) => { const s = sp && sp.series && sp.series[k]; return s && s.length ? s[s.length - 1] : null; };

  // Cifras grandes de la sección Turisme
  window.xifresTurisme = (cont) => {
    if (!cont || !D.tur) return;
    const T = D.tur, R = T.t_resum || {}, P = T.t_places, H = (T.t_places && T.t_places.grups || []).find((g) => g.c === "tt:hut");
    const pern = T.t_pern_idx, ext = ultS(T.t_ext, "gi"), oc = ultS(T.t_ocup, "gi"), occ = ultS(T.t_ocup, "cat"), adr = ultS(T.t_adr, "gi"), adc = ultS(T.t_adr, "cat");
    cont.innerHTML = [
      P && P.total ? tile(tx("x_places"), fmt(P.total), R.pob ? tx("xn_places", fmt((P.total / R.pob) * 100)) : "") : "",
      R.hut ? tile(tx("x_hut"), fmt(R.hut), H ? tx("xn_hut", fmt(H.gi)) : "") : "",
      pern && pern.abs ? tile(tx("x_pern", pern.any), `${fmt(pern.abs.gi / 1e6, 1)} <small>M</small>`, ext ? tx("xn_pern", pct(ext[2], 0)) : "") : "",
      R.mov_ext ? tile(tx("x_ext", R.any_mov), `${fmt(R.mov_ext / 1e6, 1)} <small>M</small>`, R.mov_nac ? tx("xn_ext", fmt(R.mov_nac / 1e6, 1)) : "") : "",
      oc ? tile(tx("x_ocup", oc[1]), pct(oc[2], 0), occ ? tx("xn_ocup", pct(occ[2], 0)) : "") : "",
      adr ? tile(tx("x_adr", adr[1]), `${fmt(adr[2])} <small>€</small>`, adc ? tx("xn_adr", fmt(adc[2])) : "") : "",
    ].join("");
  };

  // Bloque de la ficha
  window.fitxaTurisme = (cont, m) => {
    if (!cont) return;
    const tu = m.tur || {}, f = m.turf || {}, reg = f.reg || {};
    const a = (k) => D.anys && D.anys["tur_" + k];
    const v = (k, an = a(k)) => (tu[k] && an != null ? tu[k][an] : null);
    const tiles = [];
    if (f.pl != null) tiles.push(tile(tx("k_places"), fmt(f.pl), v("pl_h") != null ? tx("n_places", fmt(v("pl_h"), 1)) : ""));
    const ah = ultA(tu.hut_n);
    if (ah) tiles.push(tile(`${tx("k_hut")} ${ah}`, fmt(tu.hut_n[ah]), tu.hut_viv && tu.hut_viv[ah] != null ? tx("n_hut", fmt(tu.hut_viv[ah], 1)) : ""));
    if (reg.hotel_pl) tiles.push(tile(tx("k_hotels"), fmt(reg.hotel_pl), tx("n_hotels", fmt(reg.hotel_n))));
    if (reg.camp_pl) tiles.push(tile(tx("k_camp"), fmt(reg.camp_pl), tx("n_camp", fmt(reg.camp_n))));
    const am = ultA(tu.mov_rec);
    if (am) tiles.push(tile(tx("k_ext", am), fmt(tu.mov_rec[am]), tu.mov_rec_h ? tx("n_ext", fmt(tu.mov_rec_h[am], 1)) : ""));
    const an = ultA(tu.mov_int);
    if (an) tiles.push(tile(tx("k_nac", an), fmt(tu.mov_int[an]), tu.mov_int_h ? tx("n_ext", fmt(tu.mov_int_h[an], 1)) : ""));
    const ai = ultA(tu.ieet);
    if (ai) tiles.push(tile(tx("k_ieet", ai), `${fmt(tu.ieet[ai] / 1e3)} <small>mil €</small>`, tu.ieet_h ? tx("n_ieet", fmt(tu.ieet_h[ai], 1)) : ""));
    const ap = ultA(tu.pern);
    if (ap) tiles.push(tile(tx("k_pern", ap), fmt(tu.pern[ap]), tu.ocup && tu.ocup[ap] ? tx("n_pern", pct(tu.ocup[ap], 0)) : ""));
    if (!tiles.length) { cont.innerHTML = ""; return; }
    const frases = [];
    const afr = ultA(tu.mov_fr); if (afr && tu.mov_fr[afr] >= 1) frases.push(tx("fr", pct(tu.mov_fr[afr], 0)));
    const aes = ultA(tu.estiu_p); if (aes) frases.push(tx("estiu", pct(tu.estiu_p[aes], 0)));
    // Turistas de cada mes del último año completo (extranjeros + otras provincias)
    let mesos = "";
    const mv = f.mov || {};
    const anyM = aes || null;
    if (anyM && (mv.rec || mv.int)) {
      const vals = Array.from({ length: 12 }, (_, i) => { const k = `${anyM}-${String(i + 1).padStart(2, "0")}`; return [(mv.rec || {})[k] || 0, (mv.int || {})[k] || 0]; });
      const mx = Math.max(...vals.map(([x, y]) => x + y)) || 1;
      mesos = `<figure class="grafic tu-mesos"><figcaption><span>${tx("g_mesos", anyM)}</span></figcaption>
        <div class="tu-barres">${vals.map(([x, y], i) => `<div class="tu-mes" title="${fmt(x + y)}"><span class="tu-col"><b class="tu-int" style="height:${(y / mx) * 100}%"></b><b class="tu-rec" style="height:${(x / mx) * 100}%"></b></span><i>${tx("mesos")[i]}</i></div>`).join("")}</div>
        <p class="tu-lleg"><span><i class="tu-rec"></i>${tx("estr")}</span><span><i class="tu-int"></i>${tx("nac")}</span></p></figure>`;
    }
    cont.innerHTML = `<section class="tu"><h3 class="ajt-tit">${tx("tit")}</h3><p class="tb-sub">${tx("sub")} ${frases.join(" ")}</p>
      <div class="xifres">${tiles.slice(0, 6).join("")}</div>
      <div class="dos tu-dos">
        ${tu.mov_rec ? `<figure class="grafic"><figcaption><span>${tx("g_mov")}</span></figcaption><div class="g-tmov"></div></figure>` : ""}
        ${mesos}
        ${tu.hut_n && Object.keys(tu.hut_n).length > 1 ? `<figure class="grafic"><figcaption><span>${tx("g_hut")}</span></figcaption><div class="g-thut"></div></figure>` : ""}
      </div>
      <p class="fb-font">${tx("font")}</p></section>`;
    const gm = cont.querySelector(".g-tmov");
    if (gm) grafLinia(gm, [
      { nom: tx("estr"), color: "var(--serie-1)", dades: tu.mov_rec || {} },
      { nom: tx("nac"), color: "var(--serie-2)", dades: tu.mov_int || {} },
    ]);
    const gh = cont.querySelector(".g-thut");
    if (gh) grafBarres(gh, tu.hut_n);
  };
})();
