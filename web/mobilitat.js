// Movilidad: sección Mobilitat y bloque de la ficha del municipio
// (Enquesta de Mobilitat Quotidiana 2024-2025 de l'ATM de Girona). Datos en D.mob (ámbito y gráficos),
// D.arees.com (comarcas), m.mob (indicadores) y m.mobf (modos, destinos y orígenes).
(function () {
  const TX = {
    ca: {
      tit: "Mobilitat", sub: (n, c) => `Enquesta de Mobilitat Quotidiana 2024-2025 de l'ATM de Girona: ${n} persones entrevistades al municipi. Dia feiner, residents de 4 anys o més. Comparat amb la comarca (${c}) i amb les set comarques de l'enquesta.`,
      poques: (n, mn, c) => `Al municipi només s'hi van fer ${n} entrevistes (en calen ${mn} per donar-ne xifres pròpies): les dades són de la comarca, ${c}.`,
      fora: "Aquest municipi és fora de l'enquesta de mobilitat de l'ATM de Girona (la Cerdanya no hi és).",
      k_dpp: "Desplaçaments per persona", n_dpp: (c, t) => `cada dia feiner · comarca ${c}, total ${t}`,
      k_priv: "En cotxe o moto", k_pub: "En transport públic", k_act: "A peu o en bici", n_ref: (c, t) => `comarca ${c} · total ${t}`,
      k_dur: "Durada mitjana", k_intra: "Sense sortir del municipi", k_telet: "Fan teletreball", k_veh: "Llars sense cotxe ni moto", k_atrau: "Desplaçaments que rep, per habitant",
      g_modes: "Amb què es mouen", u_modes: "% dels desplaçaments en dia feiner",
      g_dest: "On van", u_dest: "% dels desplaçaments que surten del municipi", g_orig: "D'on vénen", u_orig: "% dels desplaçaments que hi arriben d'altres municipis",
      fora_s: (v) => `A més, el ${v} dels que surten van fora de les set comarques.`,
      ent: (n, i) => `Cada dia feiner hi arriben uns ${n} desplaçaments d'altres municipis; ${i} es fan sense sortir-ne.`,
      zona: { mun: "Municipi", com: "Comarca", tot: "7 comarques" },
      modes: { priv: "Cotxe, moto o furgoneta", pub: "Transport públic", act: "A peu, bici o patinet" },
      m_det: { cotxe: "Cotxe", peu: "A peu", moto: "Moto", bus: "Autobús", bici: "Bici i patinet", tren: "Tren i metro", altres: "Altres" },
      font: "Font: ATM Àrea de Girona, Enquesta de Mobilitat Quotidiana 2024-2025 (visor de resultats). Mostra de 13.894 persones; les xifres municipals tenen marge d'error, sobretot als pobles petits.",
      // Sección
      x_d: "Desplaçaments cada dia feiner", xn_d: (p) => `de ${p} M de residents de 4 anys o més`,
      x_dpp: "Desplaçaments per persona", xn_dpp: (c) => `${c} el cap de setmana`,
      x_priv: "En cotxe o moto", xn_priv: (c) => `${c} el cap de setmana`,
      x_act: "A peu o en bici", xn_act: (b) => `${b} en bicicleta o patinet`,
      x_pub: "En transport públic", xn_pub: (b, t) => `${b} en autobús, ${t} en tren`,
      x_dur: "Durada mitjana", xn_dur: (i) => `el ${i} dels trajectes no surten del municipi`,
      s_mitjans: ["Amb què ens movem", "% dels desplaçaments en dia feiner"],
      h_mitjans: (a, b, c) => `El <b>cotxe</b> fa ${a} de cada 10 desplaçaments (conduint o d'acompanyant) i caminar, ${b}. El transport públic no arriba al ${c}.`,
      s_comarques: ["Cada comarca", "% dels desplaçaments en dia feiner per mitjà"],
      h_comarques: (c1, v1, c2, v2) => `On més es camina és al <b>${c1}</b> (${v1} a peu, en bici o en patinet); on més es depèn del cotxe, a la <b>${c2}</b> (${v2}).`,
      s_hores: ["A quina hora", "Desplaçaments en dia feiner segons l'hora de sortida (milers)"],
      h_hores: (h, v) => `L'hora punta és de <b>${h} a ${h + 1}</b>: hi surten ${v} mil desplaçaments, més que en qualsevol altra hora.`,
      s_motius: ["Per què ens movem", "% dels desplaçaments de cada motiu segons el mitjà"],
      h_motius: (a, b) => `Per anar a <b>treballar o estudiar</b> s'agafa més el cotxe (${a}) i el transport públic; per a l'oci, mig món va a peu (${b}).`,
      motius: { Ocupacional: "Feina o estudis", "Personal ineludible": "Compres, metge, gestions", "Personal opcional": "Oci, esport, visites", "Tornada a casa": "Tornada a casa" },
      s_matriu: ["D'on a on", "% dels desplaçaments que surten de cada comarca, segons la comarca on acaben"],
      h_matriu: (c, v) => `La gent es mou sobretot dins de la seva comarca. El <b>${c}</b> és qui més en surt: ${v} dels desplaçaments acaben en una altra comarca.`,
      orig: "Origen ↓ · destinació →", resta: "Fora",
      s_pols: ["Pols d'atracció", "Desplaçaments diaris que arriben d'altres municipis (milers)"],
      h_pols: (m, v) => `<b>${m}</b> rep cada dia feiner ${v} mil desplaçaments de gent d'altres municipis.`,
      s_llars: ["Cotxe, aparcament i teletreball", "% de les persones de cada comarca"],
      h_llars: (v, t) => `El ${v} de la gent viu en una llar sense cotxe ni moto, i el ${t} dels que treballen fan teletreball almenys alguns dies.`,
      l_veh: "Sense cotxe ni moto", l_pl: "Sense plaça d'aparcament", l_tt: "Fan teletreball",
      font_s: "Font: ATM Àrea de Girona, Enquesta de Mobilitat Quotidiana 2024-2025. Set comarques, sense la Cerdanya.",
    },
    es: {
      tit: "Movilidad", sub: (n, c) => `Encuesta de Movilidad Cotidiana 2024-2025 de la ATM de Girona: ${n} personas entrevistadas en el municipio. Día laborable, residentes de 4 años o más. Comparado con la comarca (${c}) y con las siete comarcas de la encuesta.`,
      poques: (n, mn, c) => `En el municipio solo se hicieron ${n} entrevistas (hacen falta ${mn} para dar cifras propias): los datos son de la comarca, ${c}.`,
      fora: "Este municipio está fuera de la encuesta de movilidad de la ATM de Girona (la Cerdanya no está).",
      k_dpp: "Desplazamientos por persona", n_dpp: (c, t) => `cada día laborable · comarca ${c}, total ${t}`,
      k_priv: "En coche o moto", k_pub: "En transporte público", k_act: "A pie o en bici", n_ref: (c, t) => `comarca ${c} · total ${t}`,
      k_dur: "Duración media", k_intra: "Sin salir del municipio", k_telet: "Teletrabajan", k_veh: "Hogares sin coche ni moto", k_atrau: "Desplazamientos que recibe, por habitante",
      g_modes: "Con qué se mueven", u_modes: "% de los desplazamientos en día laborable",
      g_dest: "Adónde van", u_dest: "% de los desplazamientos que salen del municipio", g_orig: "De dónde vienen", u_orig: "% de los desplazamientos que llegan de otros municipios",
      fora_s: (v) => `Además, el ${v} de los que salen van fuera de las siete comarcas.`,
      ent: (n, i) => `Cada día laborable llegan unos ${n} desplazamientos de otros municipios; ${i} se hacen sin salir de él.`,
      zona: { mun: "Municipio", com: "Comarca", tot: "7 comarcas" },
      modes: { priv: "Coche, moto o furgoneta", pub: "Transporte público", act: "A pie, bici o patinete" },
      m_det: { cotxe: "Coche", peu: "A pie", moto: "Moto", bus: "Autobús", bici: "Bici y patinete", tren: "Tren y metro", altres: "Otros" },
      font: "Fuente: ATM Àrea de Girona, Encuesta de Movilidad Cotidiana 2024-2025 (visor de resultados). Muestra de 13.894 personas; las cifras municipales tienen margen de error, sobre todo en los pueblos pequeños.",
      x_d: "Desplazamientos cada día laborable", xn_d: (p) => `de ${p} M de residentes de 4 años o más`,
      x_dpp: "Desplazamientos por persona", xn_dpp: (c) => `${c} el fin de semana`,
      x_priv: "En coche o moto", xn_priv: (c) => `${c} el fin de semana`,
      x_act: "A pie o en bici", xn_act: (b) => `${b} en bicicleta o patinete`,
      x_pub: "En transporte público", xn_pub: (b, t) => `${b} en autobús, ${t} en tren`,
      x_dur: "Duración media", xn_dur: (i) => `el ${i} de los trayectos no salen del municipio`,
      s_mitjans: ["Con qué nos movemos", "% de los desplazamientos en día laborable"],
      h_mitjans: (a, b, c) => `El <b>coche</b> hace ${a} de cada 10 desplazamientos (conduciendo o de acompañante) y caminar, ${b}. El transporte público no llega al ${c}.`,
      s_comarques: ["Cada comarca", "% de los desplazamientos en día laborable por medio"],
      h_comarques: (c1, v1, c2, v2) => `Donde más se camina es en el <b>${c1}</b> (${v1} a pie, en bici o en patinete); donde más se depende del coche, en la <b>${c2}</b> (${v2}).`,
      s_hores: ["A qué hora", "Desplazamientos en día laborable según la hora de salida (miles)"],
      h_hores: (h, v) => `La hora punta es de <b>${h} a ${h + 1}</b>: salen ${v} mil desplazamientos, más que en cualquier otra hora.`,
      s_motius: ["Por qué nos movemos", "% de los desplazamientos de cada motivo según el medio"],
      h_motius: (a, b) => `Para ir a <b>trabajar o estudiar</b> se coge más el coche (${a}) y el transporte público; para el ocio, medio mundo va a pie (${b}).`,
      motius: { Ocupacional: "Trabajo o estudios", "Personal ineludible": "Compras, médico, gestiones", "Personal opcional": "Ocio, deporte, visitas", "Tornada a casa": "Vuelta a casa" },
      s_matriu: ["De dónde a dónde", "% de los desplazamientos que salen de cada comarca, según la comarca donde terminan"],
      h_matriu: (c, v) => `La gente se mueve sobre todo dentro de su comarca. El <b>${c}</b> es el que más sale: ${v} de los desplazamientos terminan en otra comarca.`,
      orig: "Origen ↓ · destino →", resta: "Fuera",
      s_pols: ["Polos de atracción", "Desplazamientos diarios que llegan de otros municipios (miles)"],
      h_pols: (m, v) => `<b>${m}</b> recibe cada día laborable ${v} mil desplazamientos de gente de otros municipios.`,
      s_llars: ["Coche, aparcamiento y teletrabajo", "% de las personas de cada comarca"],
      h_llars: (v, t) => `El ${v} de la gente vive en un hogar sin coche ni moto, y el ${t} de los que trabajan teletrabajan al menos algunos días.`,
      l_veh: "Sin coche ni moto", l_pl: "Sin plaza de aparcamiento", l_tt: "Teletrabajan",
      font_s: "Fuente: ATM Àrea de Girona, Encuesta de Movilidad Cotidiana 2024-2025. Siete comarcas, sin la Cerdanya.",
    },
  };
  const MITJANS_ES = {
    "Cotxe com a conductor": "Coche, conduciendo", "Cotxe com acompanyant": "Coche, de acompañante", Caminant: "A pie", "Moto com a conductor": "Moto, conduciendo",
    "Moto com acompanyant": "Moto, de acompañante", "Autobús urbà": "Autobús urbano", "Autobús interurbà": "Autobús interurbano", "Autobús escolar": "Autobús escolar",
    "Autobús empresa": "Autobús de empresa", Bicicleta: "Bicicleta", Patinet: "Patinete", "Renfe Rodalies": "Renfe Rodalies", "Furgoneta/ camió": "Furgoneta o camión",
    "Renfe regional convencional (Regional o Regional Exprés)": "Renfe regional", "Renfe regional altes prestacions (AVANT)": "Renfe Avant", "Renfe llarg recorregut": "Renfe larga distancia", Metro: "Metro", Taxi: "Taxi",
  };
  const MITJANS_CA = { "Cotxe com a conductor": "Cotxe, conduint", "Cotxe com acompanyant": "Cotxe, d'acompanyant", "Moto com a conductor": "Moto, conduint", "Moto com acompanyant": "Moto, d'acompanyant", "Furgoneta/ camió": "Furgoneta o camió", "Renfe regional convencional (Regional o Regional Exprés)": "Renfe regional", "Renfe regional altes prestacions (AVANT)": "Renfe Avant" };
  const nomMitja = (k) => (LANG === "es" ? MITJANS_ES[k] : MITJANS_CA[k]) || k;
  const tx = (k, ...a) => { const v = TX[LANG][k]; return typeof v === "function" ? v(...a) : v; };
  const MODES = ["priv", "pub", "act"];
  const COL = { priv: "var(--tinta)", pub: "var(--accent)", act: "var(--serie-1)" };
  const p0 = (v) => pct(v, 0), p1 = (v) => pct(v, 1);
  const nomMun = (ine) => { const m = D.municipios.find((x) => x.ine === ine); return m ? m.nom : ine; };

  // Barra apilada de modos (privado, público, activo)
  const apilada = (x, etiqueta) => {
    const tot = MODES.reduce((s, k) => s + (x[k] || 0), 0) || 1;
    return `<div class="mb-fila"><span class="mb-nom">${etiqueta}</span><span class="mb-apil">${MODES.map((k) => `<b style="width:${((x[k] || 0) / tot) * 100}%;background:${COL[k]}" title="${tx("modes")[k]}: ${p1(x[k])}">${(x[k] || 0) >= 9 ? p0(x[k]) : ""}</b>`).join("")}</span></div>`;
  };
  const llegModes = () => `<p class="pg-lleg">${MODES.map((k) => `<span><i class="mb-dot" style="background:${COL[k]}"></i>${tx("modes")[k]}</span>`).join("")}</p>`;
  const barresH = (files, f = p1, cls = "") => {
    const mx = Math.max(...files.map((x) => x[1] || 0)) || 1;
    return `<div class="pb ${cls}">${files.map(([n, v, nota]) => `<div class="pb-fila"><span class="pb-nom">${n}${nota ? ` <small class="pb-n">${nota}</small>` : ""}</span><span class="pb-barres"><span class="pb-b"><b class="pg-bg-gi" style="width:${(v / mx) * 100}%"></b><em>${f(v)}</em></span></span></div>`).join("")}</div>`;
  };
  const figura = (id, tit, h, cos, font = tx("font_s")) => `<figure class="pg-fig" data-id="${id}"><figcaption><span class="pg-tit">${tit[0]}</span><span class="unitat">${tit[1]}</span></figcaption>
    <p class="pg-h">${h}</p>${cos}<p class="pg-font">${font}</p></figure>`;

  // Columnas apiladas por hora
  function hores(sp) {
    const W = 520, H = 210, m = { t: 10, r: 6, b: 22, l: 30 };
    const tots = sp.map((r) => r[1] + r[2] + r[3]), mx = Math.max(...tots) || 1;
    const pas = mx > 200000 ? 50000 : mx > 100000 ? 25000 : 10000, top = Math.ceil(mx / pas) * pas;
    const bw = (W - m.l - m.r) / 24, Y = (v) => m.t + (1 - v / top) * (H - m.t - m.b);
    let s = `<svg viewBox="0 0 ${W} ${H}" class="pg mb-hores" role="img">`;
    for (let v = 0; v <= top; v += pas) s += `<line x1="${m.l}" x2="${W - m.r}" y1="${Y(v)}" y2="${Y(v)}" class="pg-g"/><text x="${m.l - 4}" y="${Y(v) + 3.5}" text-anchor="end" class="pg-t">${fmt(v / 1000)}</text>`;
    sp.forEach(([h, a, b, c], i) => {
      let y = H - m.b;
      [["priv", a], ["pub", b], ["act", c]].forEach(([k, v]) => { const hh = (v / top) * (H - m.t - m.b); y -= hh; s += `<rect x="${m.l + i * bw + 1}" y="${y.toFixed(1)}" width="${(bw - 2).toFixed(1)}" height="${hh.toFixed(1)}" style="fill:${COL[k]}"><title>${h}h · ${tx("modes")[k]}: ${fmt(v)}</title></rect>`; });
      if (h % 3 === 0) s += `<text x="${m.l + i * bw + bw / 2}" y="${H - 6}" text-anchor="middle" class="pg-t">${h}h</text>`;
    });
    return s + "</svg>";
  }

  window.pintaSeccioMobilitat = () => {
    const sec = document.getElementById("s-mob");
    if (!sec) return;
    if (!D.mob || !D.mob.s) { sec.hidden = true; return; }
    const S = D.mob.s, T = S.total || {}, R = D.mob.ref || {};
    document.getElementById("mob-xifres").innerHTML = [
      tile(tx("x_d"), `${fmt(S.d_total / 1e6, 1)} <small>M</small>`, tx("xn_d", fmt(S.pers / 1e6, 2))),
      tile(tx("x_dpp"), fmt(T.dpp, 2), tx("xn_dpp", fmt(T.cs_dpp, 2))),
      tile(tx("x_priv"), p0(T.priv), tx("xn_priv", p0(T.cs_priv))),
      tile(tx("x_act"), p0(T.act), tx("xn_act", p1(T.bici))),
      tile(tx("x_pub"), p1(T.pub), tx("xn_pub", p1(T.bus), p1(T.tren))),
      tile(tx("x_dur"), `${fmt(T.dur)} <small>min</small>`, tx("xn_dur", p0(R.intra))),
    ].join("");
    const figs = [];
    // Medios detallados
    const mit = S.mitjans || [];
    const cotxe = mit.filter((x) => x[0].startsWith("Cotxe")).reduce((s, x) => s + x[1], 0), peu = (mit.find((x) => x[0] === "Caminant") || [0, 0])[1];
    figs.push(figura("mitjans", tx("s_mitjans"), tx("h_mitjans", fmt(cotxe / 10, 1), `${fmt(peu / 10, 1)}`, p0(Math.ceil(T.pub))), barresH(mit.slice(0, 14).map((x) => [nomMitja(x[0]), x[1]]))));
    // Comarcas
    const cs = Object.entries(S.comarques || {}).sort((a, b) => (b[1].act || 0) - (a[1].act || 0));
    if (cs.length) {
      const pr = [...cs].sort((a, b) => b[1].priv - a[1].priv)[0];
      figs.push(figura("comarques", tx("s_comarques"), tx("h_comarques", cs[0][0], p0(cs[0][1].act), pr[0], p0(pr[1].priv)),
        llegModes() + `<div class="mb">${cs.map(([c, x]) => apilada(x, c)).join("")}${apilada(T, `<b>${tx("zona").tot}</b>`)}</div>`));
    }
    // Horas
    if (S.hores) {
      const tots = S.hores.map((r) => r[1] + r[2] + r[3]), hp = tots.indexOf(Math.max(...tots));
      figs.push(figura("hores", tx("s_hores"), tx("h_hores", hp, fmt(tots[hp] / 1000)), llegModes() + hores(S.hores)));
    }
    // Motivos
    if (S.motius) {
      const o = S.motius.Ocupacional || {}, op = S.motius["Personal opcional"] || {};
      const ordre = ["Ocupacional", "Personal ineludible", "Personal opcional", "Tornada a casa"].filter((k) => S.motius[k]);
      figs.push(figura("motius", tx("s_motius"), tx("h_motius", p0(o.priv), p0(op.act)),
        llegModes() + `<div class="mb">${ordre.map((k) => apilada(S.motius[k], `${tx("motius")[k]} <small class="pb-n">${fmt(S.motius[k].d / 1000)} mil</small>`)).join("")}</div>`));
    }
    // Matriz entre comarcas
    const M = S.matriu;
    if (M && M.coms.length) {
      const filas = M.coms.map((c, i) => { const tot = M.v[i].reduce((s, v) => s + v, 0) + (M.fora[i] || 0); return { c, tot, pc: [...M.v[i], M.fora[i] || 0].map((v) => (tot ? (v / tot) * 100 : 0)) }; });
      const surt = filas.map((f, i) => ({ c: f.c, v: 100 - f.pc[i] })).sort((a, b) => b.v - a.v)[0];
      const curt = (c) => c.replace("Pla de l'Estany", "Pla Est.").replace("Alt Empordà", "Alt Emp.").replace("Baix Empordà", "Baix Emp.");
      const cel = (v, diag) => `<td class="${diag ? "mx-d" : ""}${v >= 45 ? " mx-f" : ""}" style="--a:${Math.min(1, v / 25).toFixed(2)}">${v >= 0.05 ? fmt(v, v < 10 ? 1 : 0) : "·"}</td>`;
      figs.push(figura("matriu", tx("s_matriu"), tx("h_matriu", surt.c, p0(surt.v)),
        `<div class="mx-taula"><table class="mx"><thead><tr><th>${tx("orig")}</th>${M.coms.map((c) => `<th title="${c}">${curt(c)}</th>`).join("")}<th>${tx("resta")}</th></tr></thead>
        <tbody>${filas.map((f, i) => `<tr><th scope="row">${f.c}</th>${f.pc.map((v, j) => cel(v, i === j)).join("")}</tr>`).join("")}</tbody></table></div>`));
    }
    // Polos de atracción
    if (S.pols && S.pols.length) {
      figs.push(figura("pols", tx("s_pols"), tx("h_pols", nomMun(S.pols[0][0]), fmt(S.pols[0][1] / 1000)), barresH(S.pols.map(([i, v]) => [nomMun(i), v / 1000]), (v) => fmt(v, 1))));
    }
    // Vehículos, aparcamiento y teletrabajo por comarca
    if (cs.length) {
      const fila = (c, x) => `<div class="pb-fila"><span class="pb-nom">${c}</span><span class="pb-barres">${[["sense_veh", "var(--tinta)"], ["sense_pl", "var(--text-3)"], ["telet", "var(--accent)"]].map(([k, col]) => `<span class="pb-b"><b style="width:${Math.min(100, (x[k] || 0) / 40 * 100)}%;background:${col}"></b><em>${p0(x[k])}</em></span>`).join("")}</span></div>`;
      figs.push(figura("llars", tx("s_llars"), tx("h_llars", p0(T.sense_veh), p0(T.telet)),
        `<p class="pg-lleg"><span><i class="mb-dot" style="background:var(--tinta)"></i>${tx("l_veh")}</span><span><i class="mb-dot" style="background:var(--text-3)"></i>${tx("l_pl")}</span><span><i class="mb-dot" style="background:var(--accent)"></i>${tx("l_tt")}</span></p>
        <div class="pb mb-tres">${[...cs].sort((a, b) => a[0].localeCompare(b[0])).map(([c, x]) => fila(c, x)).join("")}${fila(`<b>${tx("zona").tot}</b>`, T)}</div>`));
    }
    document.getElementById("mob-grafics").innerHTML = figs.join("");
  };

  // Bloque de la ficha
  window.fitxaMobilitat = (cont, m) => {
    if (!cont) return;
    if (!D.mob || !D.mob.ref) { cont.innerHTML = ""; return; }
    const f = m.mobf, R = D.mob.ref;
    if (!f) { cont.innerHTML = ["Cerdanya", "Osona"].some((c) => (m.comarca || "").includes(c)) ? `<section class="mob-f"><h3 class="ajt-tit">${tx("tit")}</h3><p class="tb-sub">${tx("fora")}</p></section>` : ""; return; }
    const C = (D.arees && D.arees.com && D.arees.com[f.com]) || {};
    const propi = m.mob && m.mob.dpp != null;
    const X = propi ? m.mob : C;
    const nr = (k, fm) => tx("n_ref", fm(C[k]), fm(R[k]));
    const tiles = [
      tile(tx("k_dpp"), fmt(X.dpp, 2), tx("n_dpp", fmt(C.dpp, 2), fmt(R.dpp, 2))),
      tile(tx("k_priv"), p0(X.priv), nr("priv", p0)),
      tile(tx("k_act"), p0(X.act), nr("act", p0)),
      tile(tx("k_pub"), p1(X.pub), nr("pub", p1)),
      tile(tx("k_dur"), `${fmt(X.dur)} <small>min</small>`, nr("dur", (v) => `${fmt(v)} min`)),
      tile(tx("k_intra"), p0(X.intra), nr("intra", p0)),
      tile(tx("k_veh"), p0(X.sense_veh), nr("sense_veh", p0)),
      tile(tx("k_telet"), p0(X.telet), nr("telet", p0)),
      ...(m.mob && m.mob.atrau != null ? [tile(tx("k_atrau"), fmt(m.mob.atrau, 2), tx("ent", fmt(f.entrades), fmt(f.intern)))] : []),
    ];
    const modes = `<figure class="grafic"><figcaption><span>${tx("g_modes")}</span><span class="unitat">${tx("u_modes")}</span></figcaption>${llegModes()}
      <div class="mb">${propi ? apilada(m.mob, m.nom) : ""}${apilada(C, `${tx("zona").com} · ${f.com}`)}${apilada(R, tx("zona").tot)}</div></figure>`;
    const llista = (l, tit, u, extra = "") => (l && l.length ? `<figure class="grafic"><figcaption><span>${tit}</span><span class="unitat">${u}</span></figcaption>${barresH(l.map((x) => [x[1], x[3]]))}${extra ? `<p class="mb-nota">${extra}</p>` : ""}</figure>` : "");
    cont.innerHTML = `<section class="mob-f"><h3 class="ajt-tit">${tx("tit")}</h3>
      <p class="tb-sub">${propi ? tx("sub", fmt(f.n), f.com) : tx("poques", fmt(f.n), D.mob.min_n, f.com)}</p>
      <div class="xifres">${tiles.join("")}</div>
      <div class="dos mob-dos">${modes}${llista(f.dest, tx("g_dest"), tx("u_dest"), f.fora >= 1 ? tx("fora_s", p0(f.fora)) : "")}${llista(f.orig, tx("g_orig"), tx("u_orig"))}</div>
      <p class="fb-font">${tx("font")}</p></section>`;
  };
})();
