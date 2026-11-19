/* Accidentes de tráfico en «La província»: textos, titulares y grupos de los gráficos acc_*. */
(function () {
  if (!window.PG) return;
  const ca = {
    acc_greus: ["Morts i ferits greus", "Morts i ferits greus en accidents de trànsit per 100.000 habitants"],
    h_acc_greus: (n, a, m, mfg, c, a0, mfg0) => `El ${a} hi va haver <b>${n} accidents greus</b> a les carreteres i els carrers de la província: <b>${m} morts</b> i ${mfg} morts o ferits greus en total, ${c} a la carretera. El ${a0} n'hi va haver ${mfg0}.`,
    acc_morts: ["Morts a la carretera i la ciutat", "Persones mortes en accidents de trànsit a la província"],
    acc_mo_noms: { gi: "Província de Girona" },
    h_acc_morts: (m, a, mx, amx) => `<b>${m} persones</b> van morir en accidents de trànsit a la província el ${a}. El pitjor any de la sèrie va ser el ${amx}, amb ${mx}.`,
    acc_urb: ["Víctimes a la ciutat", "Morts i ferits (també lleus) a les vies urbanes per 1.000 habitants"],
    h_acc_urb: (n, v, a, g, c, e) => `El ${a} hi va haver <b>${n} accidents amb víctimes</b> als carrers dels municipis de la província, amb ${v} morts i ferits: ${g} per 1.000 habitants (Catalunya, ${c}; Espanya, ${e}).`,
    acc_usuaris: ["Qui pateix els accidents a la ciutat", "Morts i ferits a les vies urbanes segons com anaven (%)"],
    h_acc_usuaris: (m, v, a) => `El ${a}, el <b>${m}</b> dels morts i ferits als carrers de la província anaven en moto o ciclomotor, i el ${v} eren vianants.`,
    acu: { vian: "Vianants", bici: "Bicicleta i patinet", moto: "Moto i ciclomotor", cotxe: "Cotxe", furgo: "Furgoneta, camió, autobús i altres" },
    acc_mossos: ["Accidents atesos pels Mossos", "Intervencions de Trànsit dels Mossos en accidents, cada mes"],
    acc_mm_noms: { gi: "Regió Policial Girona" },
    h_acc_mossos: (n, p) => `Els Mossos van intervenir en <b>${n} accidents de trànsit</b> a la Regió Policial Girona en 12 mesos, ${p}.`,
    font_sct: "Font: Servei Català de Trànsit, accidents amb morts o ferits greus",
    font_dgt: "Font: DGT, dades municipals de sinistralitat (vies urbanes)",
    font_acc_mossos: "Font: Mossos d'Esquadra, intervencions en accidents de trànsit",
  };
  const es = {
    acc_greus: ["Muertos y heridos graves", "Muertos y heridos graves en accidentes de tráfico por 100.000 habitantes"],
    h_acc_greus: (n, a, m, mfg, c, a0, mfg0) => `En ${a} hubo <b>${n} accidentes graves</b> en las carreteras y calles de la provincia: <b>${m} muertos</b> y ${mfg} muertos o heridos graves en total, ${c} en carretera. En ${a0} hubo ${mfg0}.`,
    acc_morts: ["Muertos en carretera y ciudad", "Personas muertas en accidentes de tráfico en la provincia"],
    acc_mo_noms: { gi: "Provincia de Girona" },
    h_acc_morts: (m, a, mx, amx) => `<b>${m} personas</b> murieron en accidentes de tráfico en la provincia en ${a}. El peor año de la serie fue ${amx}, con ${mx}.`,
    acc_urb: ["Víctimas en la ciudad", "Muertos y heridos (también leves) en las vías urbanas por 1.000 habitantes"],
    h_acc_urb: (n, v, a, g, c, e) => `En ${a} hubo <b>${n} accidentes con víctimas</b> en las calles de los municipios de la provincia, con ${v} muertos y heridos: ${g} por 1.000 habitantes (Cataluña, ${c}; España, ${e}).`,
    acc_usuaris: ["Quién sufre los accidentes en la ciudad", "Muertos y heridos en las vías urbanas según cómo iban (%)"],
    h_acc_usuaris: (m, v, a) => `En ${a}, el <b>${m}</b> de los muertos y heridos en las calles de la provincia iban en moto o ciclomotor, y el ${v} eran peatones.`,
    acu: { vian: "Peatones", bici: "Bicicleta y patinete", moto: "Moto y ciclomotor", cotxe: "Coche", furgo: "Furgoneta, camión, autobús y otros" },
    acc_mossos: ["Accidentes atendidos por los Mossos", "Intervenciones de Tráfico de los Mossos en accidentes, cada mes"],
    acc_mm_noms: { gi: "Región Policial Girona" },
    h_acc_mossos: (n, p) => `Los Mossos intervinieron en <b>${n} accidentes de tráfico</b> en la Región Policial Girona en 12 meses, ${p}.`,
    font_sct: "Fuente: Servei Català de Trànsit, accidentes con muertos o heridos graves",
    font_dgt: "Fuente: DGT, datos municipales de siniestralidad (vías urbanas)",
    font_acc_mossos: "Fuente: Mossos d'Esquadra, intervenciones en accidentes de tráfico",
  };
  window.PG.textos(ca, es);
  const T = () => (LANG === "es" ? es : ca);
  const tx = (k, ...a) => { const v = T()[k]; return typeof v === "function" ? v(...a) : v; };
  window.PG.grup((g, c) => (c && c.startsWith("acu:") ? T().acu[c.slice(4)] || g : null));
  const ult = (s) => (s && s.length ? s[s.length - 1] : null);
  // «hasta octubre de 2026» / «fins a l'octubre del 2026»
  const fins = (e) => {
    const m = /^(\d{4})-(\d{2})$/.exec(e || ""); if (!m) return e;
    const MES = LANG === "es" ? ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"]
      : ["gener", "febrer", "març", "abril", "maig", "juny", "juliol", "agost", "setembre", "octubre", "novembre", "desembre"];
    const n = MES[+m[2] - 1];
    return LANG === "ca" ? `fins ${/^[aeiou]/.test(n) ? "a l'" : "al "}${n} del ${m[1]}` : `hasta ${n} de ${m[1]}`;
  };
  window.PG.titular((id, sp) => {
    if (!/^acc_/.test(id)) return null;
    const s = sp.series || {};
    if (id === "acc_greus" && sp.abs) { const a = sp.abs; return tx("h_acc_greus", fmt(a.n), a.any, fmt(a.morts), fmt(a.mfg), fmt(a.carr), a.a0, fmt(a.mfg0)); }
    if (id === "acc_morts") {
      const g = ult(s.gi); if (!g) return "";
      const mx = s.gi.reduce((r, x) => (x[2] > r[2] ? x : r), s.gi[0]);
      return tx("h_acc_morts", fmt(g[2]), g[1], fmt(mx[2]), mx[1]);
    }
    if (id === "acc_urb" && sp.abs) { const g = ult(s.gi), c = ult(s.cat), e = ult(s.esp); return tx("h_acc_urb", fmt(sp.abs.n), fmt(sp.abs.vic), sp.abs.any, fmt(g && g[2], 1), fmt(c && c[2], 1), fmt(e && e[2], 1)); }
    if (id === "acc_usuaris") { const f = (k) => (sp.grups.find((x) => x.g === k) || {}).gi; return tx("h_acc_usuaris", pct(f("moto"), 0), pct(f("vian"), 0), sp.any); }
    if (id === "acc_mossos") return tx("h_acc_mossos", fmt(sp.total), fins(sp.fins));
    return "";
  });
})();
