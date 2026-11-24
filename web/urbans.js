"use strict";
/* Indicadors urbans de l'INE (Urban Audit): sección «Ciutats» con comparador de las diez ciudades de más de
   20.000 habitantes (barras y evolución) y bloque de la ficha municipal con la posición en España.
   Datos: m.ua = {clave: {año: valor}}, m.ua_r = {clave: [posición, ciudades, año]}, D.ua.z = {auf, kernel, esp}, D.ua.n.
   Usa las globales de app.js (D, LANG, fmt, pct, tile, mostraTip, amagaTip, obreFitxa) y urbans-cat.js. */
(function () {
  const TX = {
    ca: {
      h: "Indicadors urbans de l'INE",
      sub: (n, c) => `Com queda ${c} entre els ${n} municipis d'Espanya de més de 20.000 habitants. Posició 1 = el valor més alt.`,
      col_v: "Valor", col_esp: "Espanya", col_pos: "Posició a Espanya",
      pos: (p, n) => `${p}a de ${n}`,
      compara: "Compara-la amb les altres ciutats →",
      font: "Font: INE, Indicadors urbans (Urban Audit).",
      ind: "Indicador", any: (a) => `Dades del ${a}`,
      auf: "Àrea urbana de Girona", kernel: "Conurbació de Girona", esp: "Espanya",
      pista: "Toca una ciutat per seguir-la al gràfic.",
      evol: "Evolució", barres: "Les deu ciutats",
      x_car: "Habitatge més car", x_lloguer: "Lloguer més alt", x_atur: "Més atur", x_jove: "Ciutat més jove", x_ext: "Més població nascuda fora",
      xn: (c, p, n, e) => `${c} · ${p}a de ${n} ciutats d'Espanya · Espanya ${e}`,
      xn_jove: (c, p, n, e) => `${c}, d'edat mediana · ${n - p + 1}a més jove de ${n} · Espanya ${e}`,
      sense: "Sense dades",
      nota_auf: "L'àrea urbana funcional de Girona inclou la ciutat i els municipis on una bona part de la població hi va a treballar; la conurbació, la ciutat i els municipis enganxats (Salt, Sarrià de Ter…).",
    },
    es: {
      h: "Indicadores urbanos del INE",
      sub: (n, c) => `Cómo queda ${c} entre los ${n} municipios de España de más de 20.000 habitantes. Posición 1 = el valor más alto.`,
      col_v: "Valor", col_esp: "España", col_pos: "Posición en España",
      pos: (p, n) => `${p}.º de ${n}`,
      compara: "Compárala con las demás ciudades →",
      font: "Fuente: INE, Indicadores Urbanos (Urban Audit).",
      ind: "Indicador", any: (a) => `Datos de ${a}`,
      auf: "Área urbana de Girona", kernel: "Conurbación de Girona", esp: "España",
      pista: "Toca una ciudad para seguirla en el gráfico.",
      evol: "Evolución", barres: "Las diez ciudades",
      x_car: "Vivienda más cara", x_lloguer: "Alquiler más alto", x_atur: "Más paro", x_jove: "Ciudad más joven", x_ext: "Más población nacida fuera",
      xn: (c, p, n, e) => `${c} · ${p}.ª de ${n} ciudades de España · España ${e}`,
      xn_jove: (c, p, n, e) => `${c}, de edad mediana · ${n - p + 1}.ª más joven de ${n} · España ${e}`,
      sense: "Sin datos",
      nota_auf: "El área urbana funcional de Girona incluye la ciudad y los municipios donde buena parte de la población va a trabajar a ella; la conurbación, la ciudad y los municipios pegados (Salt, Sarrià de Ter…).",
    },
  };
  const tx = (k, ...a) => { const v = TX[LANG][k]; return typeof v === "function" ? v(...a) : v; };
  const L = () => (LANG === "es" ? 1 : 0);
  const CAT = () => window.UA_CAT || [];
  const info = (k) => CAT().find((x) => x[0] === k);
  const F = (k) => window.UA_FMT(info(k)[4]);
  const nom = (k, curt) => info(k)[2 + L()][curt ? 0 : 1];
  const ciutats = () => D.municipios.filter((m) => m.ua && Object.keys(m.ua).length).sort((a, b) => a.nom.localeCompare(b.nom));
  const darrer = (o) => { const ks = Object.keys(o || {}); return ks.length ? ks.sort().slice(-1)[0] : null; };
  const zona = (z, k) => (D.ua && D.ua.z && D.ua.z[z] && D.ua.z[z][k]) || null;
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

  // Año de comparación: el último en el que al menos la mitad de las ciudades con el indicador tienen dato
  const anyComu = (k) => {
    const cs = ciutats().filter((m) => m.ua[k]);
    const anys = [...new Set(cs.flatMap((m) => Object.keys(m.ua[k])))].sort();
    for (let i = anys.length - 1; i >= 0; i--) if (cs.filter((m) => m.ua[k][anys[i]] != null).length >= Math.max(1, cs.length / 2)) return anys[i];
    return null;
  };

  // ---------- Ficha municipal ----------
  window.blocUrbans = (m) => {
    if (!m.ua || !D.ua) return "";
    const R = m.ua_r || {};
    const grups = Object.keys(window.UA_AMB).map((amb) => {
      const files = CAT().filter((x) => x[1] === amb && m.ua[x[0]]).map(([k]) => {
        const a = darrer(m.ua[k]); if (!a) return "";
        const v = m.ua[k][a], e = (zona("esp", k) || {})[a], r = R[k], f = F(k).f;
        const strip = r ? `<span class="ua-strip" aria-hidden="true"><i style="left:${(100 * (1 - (r[0] - 1) / Math.max(1, r[1] - 1))).toFixed(1)}%"></i></span>` : "";
        return `<tr><th scope="row">${nom(k, true)}<small>${nom(k)}</small></th><td class="ua-v">${f(v)}<small>${a}</small></td><td>${e != null ? f(e) : "–"}</td>
          <td class="ua-p">${r ? `${strip}<span>${tx("pos", r[0], r[1])}</span>` : "–"}</td></tr>`;
      }).join("");
      return files ? `<tbody><tr class="ua-g"><th colspan="4">${window.UA_AMB[amb][L()]}</th></tr>${files}</tbody>` : "";
    }).join("");
    if (!grups) return "";
    return `<section class="fitxa-bloc fx-ua"><h3>${tx("h")}</h3><p class="fb-sub">${tx("sub", fmt(D.ua.n), esc(m.nom))}</p>
      <div class="ua-taula-caixa"><table class="ua-taula"><thead><tr><th>${tx("ind")}</th><th>${tx("col_v")}</th><th>${tx("col_esp")}</th><th>${tx("col_pos")}</th></tr></thead>${grups}</table></div>
      <p class="ua-mes"><a href="#s-urb" data-ua-ciutat="${m.ine}">${tx("compara")}</a></p>
      <p class="fb-font">${tx("font")}</p></section>`;
  };
  document.addEventListener("click", (ev) => {
    const a = ev.target.closest && ev.target.closest("[data-ua-ciutat]");
    if (!a) return;
    sel = a.dataset.uaCiutat; pintaComp();
  });

  // ---------- Sección «Ciutats» ----------
  let indSel = "u438466", sel = "17079";

  function xifres() {
    const x = document.getElementById("urb-xifres");
    if (!x) return;
    const cs = ciutats();
    const top = (k, menor) => {
      const a = anyComu(k); if (!a) return null;
      const vs = cs.filter((m) => m.ua[k] && m.ua[k][a] != null).sort((p, q) => (menor ? p.ua[k][a] - q.ua[k][a] : q.ua[k][a] - p.ua[k][a]));
      return vs.length ? { m: vs[0], v: vs[0].ua[k][a], a, r: (vs[0].ua_r || {})[k], e: (zona("esp", k) || {})[a] } : null;
    };
    const t1 = (et, k, menor) => {
      const o = top(k, menor); if (!o) return "";
      const f = F(k).f, r = o.r || [null, D.ua.n];
      return tile(`${tx(et)}, ${o.a}`, f(o.v), (menor ? tx("xn_jove", esc(o.m.nom), r[0], r[1], f(o.e)) : tx("xn", esc(o.m.nom), r[0], r[1], f(o.e))));
    };
    x.innerHTML = [t1("x_car", "u438466"), t1("x_lloguer", "u417726"), t1("x_atur", "u292646"), t1("x_jove", "u23121", true), t1("x_ext", "u292636")].join("");
  }

  function selector() {
    const s = document.getElementById("urb-ind");
    if (!s) return;
    const amb = window.UA_AMB, cs = ciutats();
    s.innerHTML = Object.keys(amb).map((g) => {
      const ops = CAT().filter((x) => x[1] === g && cs.filter((m) => m.ua[x[0]]).length).map((x) => `<option value="${x[0]}"${x[0] === indSel ? " selected" : ""}>${x[2 + L()][0]}</option>`).join("");
      return ops ? `<optgroup label="${amb[g][L()]}">${ops}</optgroup>` : "";
    }).join("");
    s.onchange = () => { indSel = s.value; pintaComp(); };
  }

  function barres(cont, k, a) {
    const f = F(k).f, cs = ciutats().filter((m) => m.ua[k] && m.ua[k][a] != null).sort((p, q) => q.ua[k][a] - p.ua[k][a]);
    const refs = [["auf", tx("auf")], ["kernel", tx("kernel")], ["esp", tx("esp")]].map(([z, n]) => [z, n, (zona(z, k) || {})[a]]).filter((x) => x[2] != null);
    const mx = Math.max(...cs.map((m) => Math.abs(m.ua[k][a])), ...refs.map((x) => Math.abs(x[2]))) || 1;
    const fila = (cls, n, v, extra, ine) => `<li class="${cls}"${ine ? ` data-ine="${ine}" tabindex="0" role="button" aria-pressed="${ine === sel}"` : ""}><span class="ub-n">${n}</span><span class="ub-b"><b style="width:${(Math.abs(v) / mx) * 100}%"></b></span><span class="ub-v">${f(v)}</span><span class="ub-r">${extra}</span></li>`;
    cont.innerHTML = `<ol class="ub">${cs.map((m) => { const r = (m.ua_r || {})[k]; return fila(m.ine === sel ? "ub-sel" : "", esc(m.nom), m.ua[k][a], r && String(r[2]) === a ? tx("pos", r[0], r[1]) : "", m.ine); }).join("")}</ol>
      ${refs.length ? `<ol class="ub ub-refs">${refs.map(([z, n, v]) => fila("ub-" + z, n, v, "")).join("")}</ol>` : ""}`;
    cont.querySelectorAll("li[data-ine]").forEach((li) => {
      const tria = () => { sel = li.dataset.ine; pintaComp(); };
      li.addEventListener("click", tria);
      li.addEventListener("keydown", (ev) => { if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); tria(); } });
    });
  }

  const NS = "http://www.w3.org/2000/svg";
  const nou = (tag, at, pare) => { const e = document.createElementNS(NS, tag); Object.entries(at).forEach(([q, v]) => e.setAttribute(q, v)); if (pare) pare.appendChild(e); return e; };
  function linies(cont, k) {
    cont.innerHTML = "";
    const cs = ciutats().filter((m) => m.ua[k]);
    const sers = cs.map((m) => ({ id: m.ine, nom: m.nom, d: m.ua[k] }));
    const e = zona("esp", k); if (e) sers.push({ id: "esp", nom: tx("esp"), d: e });
    const anys = [...new Set(sers.flatMap((s) => Object.keys(s.d)))].map(Number).sort((a, b) => a - b);
    if (anys.length < 2) { cont.innerHTML = `<p class="ub-buit">${tx("any", anys[0] || "")}</p>`; return; }
    const vals = sers.flatMap((s) => Object.values(s.d));
    const fk = info(k)[4], f = F(k);
    const W = Math.max(300, cont.clientWidth || 560), H = W < 440 ? 230 : 270, mg = { t: 14, r: 92, b: 26, l: 8 };
    let y0 = Math.min(...vals), y1 = Math.max(...vals);
    if ((fk[0] === "p" || fk[0] === "e" || fk === "n0") && y0 > 0) y0 = 0;
    const pas = (() => { const r = (y1 - y0) / 4, p = Math.pow(10, Math.floor(Math.log10(r || 1))); return [1, 2, 2.5, 5, 10].map((q) => q * p).find((q) => q >= r); })();
    y0 = Math.floor(y0 / pas) * pas; y1 = Math.ceil(y1 / pas) * pas;
    const lab = (v) => f.c(v);
    mg.l = Math.max(30, 10 + 7 * Math.max(lab(y0).length, lab(y1).length));
    const X = (a) => mg.l + ((a - anys[0]) / (anys[anys.length - 1] - anys[0])) * (W - mg.l - mg.r);
    const Y = (v) => mg.t + (1 - (v - y0) / (y1 - y0 || 1)) * (H - mg.t - mg.b);
    const svg = nou("svg", { viewBox: `0 0 ${W} ${H}`, class: "ul", role: "img", "aria-label": `${nom(k)}: ${tx("evol")}` }, cont);
    for (let v = y0; v <= y1 + 1e-9; v += pas) {
      nou("line", { x1: mg.l, x2: W - mg.r, y1: Y(v), y2: Y(v), class: "ul-g" }, svg);
      nou("text", { x: mg.l - 6, y: Y(v) + 3.5, "text-anchor": "end", class: "ul-t" }, svg).textContent = lab(v);
    }
    const salt = Math.ceil(anys.length / (W < 440 ? 4 : 7));
    anys.forEach((a, i) => { if (i % salt === 0 || i === anys.length - 1) nou("text", { x: X(a), y: H - 7, "text-anchor": "middle", class: "ul-t" }, svg).textContent = a; });
    const ordre = [...sers.filter((s) => s.id !== sel && s.id !== "esp"), ...sers.filter((s) => s.id === "esp"), ...sers.filter((s) => s.id === sel)];
    const fins = [];
    ordre.forEach((s) => {
      const ps = anys.filter((a) => s.d[a] != null);
      if (!ps.length) return;
      const cls = s.id === sel ? "ul-sel" : s.id === "esp" ? "ul-esp" : "ul-alt";
      nou("polyline", { points: ps.map((a) => `${X(a).toFixed(1)},${Y(s.d[a]).toFixed(1)}`).join(" "), class: `ul-l ${cls}` }, svg);
      if (cls !== "ul-alt") {
        const u = ps[ps.length - 1];
        nou("circle", { cx: X(u), cy: Y(s.d[u]), r: 3.5, class: `ul-p ${cls}` }, svg);
        fins.push({ y: Y(s.d[u]), x: X(u), txt: `${s.nom} ${f.c(s.d[u])}`, cls });
      }
    });
    fins.sort((a, b) => a.y - b.y);
    for (let i = 1; i < fins.length; i++) if (fins[i].y - fins[i - 1].y < 13) fins[i].y = fins[i - 1].y + 13;
    fins.forEach((q) => { nou("text", { x: q.x + 7, y: q.y + 3.5, class: `ul-e ${q.cls}` }, svg).textContent = q.txt; });
    const guia = nou("line", { y1: mg.t, y2: H - mg.b, class: "ul-guia", visibility: "hidden" }, svg);
    const zonaR = nou("rect", { x: mg.l, y: mg.t, width: W - mg.l - mg.r, height: H - mg.t - mg.b, fill: "transparent" }, svg);
    zonaR.addEventListener("pointermove", (ev) => {
      const r = svg.getBoundingClientRect(), px = ((ev.clientX - r.left) / r.width) * W;
      const a = anys.reduce((b, c) => (Math.abs(X(c) - px) < Math.abs(X(b) - px) ? c : b));
      guia.setAttribute("x1", X(a)); guia.setAttribute("x2", X(a)); guia.setAttribute("visibility", "visible");
      const fs = sers.filter((s) => s.d[a] != null).sort((p, q) => q.d[a] - p.d[a]);
      mostraTip(`<b>${a}</b>${fs.map((s) => `<br>${s.id === sel ? "<b>" : ""}${esc(s.nom)}: ${f.f(s.d[a])}${s.id === sel ? "</b>" : ""}`).join("")}`, ev.clientX, ev.clientY);
    });
    zonaR.addEventListener("pointerleave", () => { guia.setAttribute("visibility", "hidden"); amagaTip(); });
  }

  function pintaComp() {
    const c = document.getElementById("urb-comp");
    if (!c || !D.ua) return;
    if (!info(indSel)) indSel = CAT()[0][0];
    const s = document.getElementById("urb-ind"); if (s && s.value !== indSel) s.value = indSel;
    const a = anyComu(indSel);
    const m = D.municipios.find((x) => x.ine === sel);
    document.getElementById("urb-tit").innerHTML = `${nom(indSel)}<small>${a ? tx("any", a) : tx("sense")}</small>`;
    document.getElementById("urb-evol-tit").textContent = `${tx("evol")} · ${m ? m.nom : ""}`;
    if (a) barres(document.getElementById("urb-barres"), indSel, a);
    linies(document.getElementById("urb-linies"), indSel);
    const ll = document.getElementById("urb-lleg-sel"); if (ll) ll.textContent = m ? m.nom : "";
  }

  window.pintaSeccioUrb = () => {
    const sec = document.getElementById("s-urb");
    if (!D.ua || !ciutats().length) { if (sec) sec.hidden = true; return; }
    const c = document.getElementById("urb-comp");
    if (c && !c.dataset.fet) {
      c.dataset.fet = "1";
      c.innerHTML = `<div class="urb-ctl"><label><span class="sobre">${tx("ind")}</span><select id="urb-ind"></select></label><p class="urb-pista" id="urb-pista"></p></div>
        <h3 class="urb-tit" id="urb-tit"></h3>
        <div class="urb-dues"><div><p class="fx-sub2" id="urb-bar-tit"></p><div id="urb-barres"></div></div>
        <div><p class="fx-sub2" id="urb-evol-tit"></p><div id="urb-linies" class="urb-linies"></div><p class="lleg-ul"><span class="ul-sel"><i></i><span id="urb-lleg-sel"></span></span><span class="ul-esp"><i></i><span id="urb-lleg-esp"></span></span><span class="ul-alt"><i></i><span id="urb-lleg-alt"></span></span></p></div></div>
        <p class="ref-nota">${tx("nota_auf")}</p><p class="pg-font">${tx("font")}</p>`;
      let w = c.clientWidth;
      addEventListener("resize", () => { if (Math.abs(c.clientWidth - w) > 40) { w = c.clientWidth; pintaComp(); } });
    }
    // Textos que dependen del idioma
    c.querySelector(".urb-ctl .sobre").textContent = tx("ind");
    document.getElementById("urb-pista").textContent = tx("pista");
    document.getElementById("urb-bar-tit").textContent = tx("barres");
    c.querySelector(".ref-nota").textContent = tx("nota_auf");
    c.querySelector(".pg-font").textContent = tx("font");
    document.getElementById("urb-lleg-esp").textContent = tx("esp");
    document.getElementById("urb-lleg-alt").textContent = LANG === "es" ? "Las demás" : "Les altres";
    selector(); xifres(); pintaComp();
  };
})();
