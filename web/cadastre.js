// Fitxa del municipio: estadísticas del Catastro (Datos municipios) comparadas con la provincia,
// Cataluña y España, evolución del valor catastral de la vivienda e inmuebles por uso.
(function () {
  const TX = {
    ca: {
      tit: "Cadastre", sub: (a, r) => `Padró cadastral a 1 de gener de ${a}.${r ? ` Última ponència de valors: ${r}.` : ""}`,
      ind: "Indicador", prov: "Província", cat: "Catalunya", esp: "Espanya",
      g_viv: "Valor cadastral mitjà de l'habitatge", u_eur: "€ per immoble", g_ibi: "Rebut mitjà de l'IBI urbà", u_rebut: "€ per rebut",
      usos: "Immobles urbans per ús", u_usos: (a) => `${a} · % dels immobles i valor cadastral mitjà`, us: "Ús", nimm: "Immobles", pct: "% del total", vm: "Valor mitjà",
      vella: (r, a) => `La ponència de valors és de ${r}: fa ${a - r} anys que no es revisen els valors, i per això són molt més baixos que els de mercat.`,
      font: "Font: Direcció General del Cadastre (Ministeri d'Hisenda), estadístiques per municipi, sèries per districte censal i informació economicofinancera de l'IBI. Valor per m²: habitatge col·lectiu i unifamiliar. Espanya, sense el País Basc ni Navarra.",
      files: { n: "Immobles urbans", vm: "Valor cadastral mitjà per immoble", vviv: "Valor cadastral mitjà de l'habitatge", vm2: "Valor cadastral de l'habitatge per m²", sm2: "Superfície mitjana de l'habitatge", ibi_rec: "Rebut mitjà de l'IBI urbà", ibi_hab: "IBI urbà per habitant", ibi_desoc: "Recàrrec de l'IBI a pisos buits", vhab: "Valor cadastral urbà per habitant", sol: "Pes del sòl en el valor", ih: "Immobles per 100 habitants", solar: "Parcel·les urbanes sense edificar", suph: "Sòl urbà per habitant", rha: "Valor rústic per hectàrea" },
      noms: { res: "Residencial", almacen: "Magatzems i aparcaments", comercial: "Comercial", industrial: "Industrial", oficinas: "Oficines", hosteleria: "Hoteleria", solar: "Sòl vacant", deportivo: "Esportiu", cultural: "Cultural", sanidad: "Sanitat i benestar", religioso: "Religiós", espectaculos: "Espectacles", singular: "Edificis singulars", altres: "Altres usos" },
    },
    es: {
      tit: "Catastro", sub: (a, r) => `Padrón catastral a 1 de enero de ${a}.${r ? ` Última ponencia de valores: ${r}.` : ""}`,
      ind: "Indicador", prov: "Provincia", cat: "Cataluña", esp: "España",
      g_viv: "Valor catastral medio de la vivienda", u_eur: "€ por inmueble", g_ibi: "Recibo medio del IBI urbano", u_rebut: "€ por recibo",
      usos: "Inmuebles urbanos por uso", u_usos: (a) => `${a} · % de los inmuebles y valor catastral medio`, us: "Uso", nimm: "Inmuebles", pct: "% del total", vm: "Valor medio",
      vella: (r, a) => `La ponencia de valores es de ${r}: hace ${a - r} años que no se revisan los valores, y por eso son mucho más bajos que los de mercado.`,
      font: "Fuente: Dirección General del Catastro (Ministerio de Hacienda), estadísticas por municipio, series por distrito censal e información económico-financiera del IBI. Valor por m²: vivienda colectiva y unifamiliar. España, sin el País Vasco ni Navarra.",
      files: { n: "Inmuebles urbanos", vm: "Valor catastral medio por inmueble", vviv: "Valor catastral medio de la vivienda", vm2: "Valor catastral de la vivienda por m²", sm2: "Superficie media de la vivienda", ibi_rec: "Recibo medio del IBI urbano", ibi_hab: "IBI urbano por habitante", ibi_desoc: "Recargo del IBI a pisos vacíos", vhab: "Valor catastral urbano por habitante", sol: "Peso del suelo en el valor", ih: "Inmuebles por 100 habitantes", solar: "Parcelas urbanas sin edificar", suph: "Suelo urbano por habitante", rha: "Valor rústico por hectárea" },
      noms: { res: "Residencial", almacen: "Almacenes y aparcamientos", comercial: "Comercial", industrial: "Industrial", oficinas: "Oficinas", hosteleria: "Hostelería", solar: "Suelo vacante", deportivo: "Deportivo", cultural: "Cultural", sanidad: "Sanidad y beneficencia", religioso: "Religioso", espectaculos: "Espectáculos", singular: "Edificios singulares", altres: "Otros usos" },
    },
  };
  const tx = (k, ...a) => { const v = TX[LANG][k]; return typeof v === "function" ? v(...a) : v; };
  const U = { n: "", vm: " €", vviv: " €", vm2: " €/m²", sm2: " m²", vhab: " €", ibi_rec: " €", ibi_hab: " €", ibi_desoc: " %", sol: " %", ih: "", solar: " %", suph: " m²", rha: " €" };
  const DEC = { sol: 0, solar: 1 };
  const f = (k, v) => (v == null ? "–" : `${fmt(v, DEC[k] || 0)}${U[k]}`);
  const darrer = (o) => { const ks = Object.keys(o || {}).sort(); return ks.length ? ks[ks.length - 1] : null; };

  window.fitxaCadastre = (cont, m) => {
    if (!cont) return;
    const c = m.cad;
    const a = D.anys && D.anys.cad;
    if (!c || !a) { cont.innerHTML = ""; return; }
    const val = (k) => { const o = c[k] || {}; const y = darrer(o); return y ? o[y] : null; };
    const ref = (k, z) => { const o = (D.cad_ref && D.cad_ref[k]) || {}; const y = darrer(o); return y && o[y] ? o[y][z] : null; };
    const files = Object.keys(U).map((k) => {
      const v = val(k);
      if (v == null) return "";
      return `<tr><th scope="row">${tx("files")[k]}</th><td class="tb-v">${f(k, v)}</td>
        <td class="tb-r" data-l="${tx("prov")}">${f(k, ref(k, "gi"))}</td><td class="tb-r" data-l="${tx("cat")}">${f(k, ref(k, "cat"))}</td><td class="tb-r" data-l="${tx("esp")}">${f(k, ref(k, "esp"))}</td></tr>`;
    }).join("");
    const rev = c.rev && c.rev[a];
    // Inmuebles por uso (último año), con el peso de cada uso en la provincia como referencia
    const u = m.cad_u || {}, ug = { ...((D.cad_u_ref && D.cad_u_ref.gi) || {}) };
    const tot = Object.values(u).reduce((s, x) => s + (x[0] || 0), 0), totG = Object.values(ug).reduce((s, x) => s + (x[0] || 0), 0);
    // Los usos con menos del 0,5 % se agrupan en «otros usos» (sin valor medio)
    let usos = Object.entries(u).filter(([, x]) => x[0]).sort((p, q) => q[1][0] - p[1][0]);
    const petits = usos.filter(([, x]) => (x[0] / tot) * 100 < 0.5);
    if (petits.length > 1) {
      const nG = petits.reduce((s, [k]) => s + ((ug[k] && ug[k][0]) || 0), 0);
      ug.altres = [nG, null];
      usos = [...usos.filter((e) => !petits.includes(e)), ["altres", [petits.reduce((s, [, x]) => s + x[0], 0), null]]];
    }
    const maxP = Math.max(...usos.map(([, x]) => (x[0] / tot) * 100), 1);
    const filesU = usos.map(([k, x]) => {
      const p = (x[0] / tot) * 100, pg = ug[k] && totG ? (ug[k][0] / totG) * 100 : null;
      return `<tr><th scope="row">${tx("noms")[k] || k}</th><td class="tb-v">${fmt(x[0])}</td>
        <td class="tb-marge"><span class="tb-barra" title="${tx("prov")}: ${pg != null ? pct(pg, 1) : "–"}"><b style="width:${((p / maxP) * 100).toFixed(1)}%"></b>${pg != null ? `<i style="left:${Math.min(100, (pg / maxP) * 100).toFixed(1)}%"></i>` : ""}</span><small>${pct(p, 1)}${pg != null ? ` · ${tx("prov")} ${pct(pg, 1)}` : ""}</small></td>
        <td class="tb-r" data-l="${tx("vm")}">${x[1] != null ? `${fmt(x[1])} €` : "–"}</td></tr>`;
    }).join("");
    const anyAra = Number(a);
    cont.innerHTML = `<section class="tb cd"><h3 class="ajt-tit">${tx("tit")}</h3><p class="tb-sub">${rev && anyAra - rev >= 15 ? `${tx("sub", a, null)} ${tx("vella", rev, anyAra)}` : tx("sub", a, rev)}</p>
      <div class="tb-cos">
        <div class="tb-taula"><table><thead><tr><th>${tx("ind")}</th><th class="tb-v">${m.nom}</th><th>${tx("prov")}</th><th>${tx("cat")}</th><th>${tx("esp")}</th></tr></thead><tbody>${files}</tbody></table></div>
        <div class="cd-grafs"><figure class="grafic"><figcaption><span>${tx("g_viv")}</span><span class="unitat">${tx("u_eur")}</span></figcaption><div class="g-cviv"></div></figure>${c.ibi_rec ? `<figure class="grafic cd-g2"><figcaption><span>${tx("g_ibi")}</span><span class="unitat">${tx("u_rebut")}</span></figcaption><div class="g-cibi"></div></figure>` : ""}</div>
      </div>
      ${usos.length ? `<div class="cd-usos"><h4 class="cd-h">${tx("usos")}</h4><p class="cd-u">${tx("u_usos", a)}</p>
        <div class="tb-taula"><table><thead><tr><th>${tx("us")}</th><th class="tb-v">${tx("nimm")}</th><th>${tx("pct")}</th><th>${tx("vm")}</th></tr></thead><tbody>${filesU}</tbody></table></div></div>` : ""}
      <p class="fb-font">${tx("font")}</p></section>`;
    const serieK = (k, z) => { const o = {}; Object.entries((D.cad_ref && D.cad_ref[k]) || {}).forEach(([y, r]) => { if (r[z] != null) o[y] = r[z]; }); return o; };
    const serie = (z) => serieK("vviv", z);
    if (c.ibi_rec) grafLinia(cont.querySelector(".g-cibi"), [
      { nom: m.nom, color: "var(--serie-1)", dades: c.ibi_rec },
      { nom: tx("prov"), color: "var(--serie-2)", dades: serieK("ibi_rec", "gi") },
      { nom: tx("cat"), color: "var(--text-3)", dades: serieK("ibi_rec", "cat") },
      { nom: tx("esp"), color: "var(--accent)", dades: serieK("ibi_rec", "esp") },
    ], (v) => (v == null ? "–" : `${fmt(v)} €`));
    grafLinia(cont.querySelector(".g-cviv"), [
      { nom: m.nom, color: "var(--serie-1)", dades: c.vviv || {} },
      { nom: tx("prov"), color: "var(--serie-2)", dades: serie("gi") },
      { nom: tx("cat"), color: "var(--text-3)", dades: serie("cat") },
      { nom: tx("esp"), color: "var(--accent)", dades: serie("esp") },
    ], (v) => (v == null ? "–" : `${fmt(v)} €`));
  };
})();
