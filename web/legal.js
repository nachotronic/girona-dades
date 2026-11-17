"use strict";
// Páginas de texto (Qui som, Avís legal, Privacitat): el contenido va en los dos idiomas dentro de
// [data-l="ca"] y [data-l="es"]; aquí se muestra uno, con la misma preferencia que la portada.
(() => {
  let lang = "ca";
  try {
    const q = new URLSearchParams(location.search).get("lang");
    const g = localStorage.getItem("lang");
    lang = ["ca", "es"].includes(q) ? q : ["ca", "es"].includes(g) ? g : ((navigator.language || "").startsWith("es") ? "es" : "ca");
  } catch (e) { /* sin almacenamiento */ }

  const aplica = () => {
    document.documentElement.lang = lang;
    document.querySelectorAll("[data-l]").forEach((el) => { el.hidden = el.dataset.l !== lang; });
    const tit = document.querySelector(`meta[name="titol-${lang}"]`);
    if (tit) document.title = tit.content;
    document.querySelectorAll(".idiomes button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.lang === lang)));
  };
  document.querySelectorAll(".idiomes button").forEach((b) => b.addEventListener("click", () => {
    lang = b.dataset.lang;
    try { localStorage.setItem("lang", lang); } catch (e) { /* */ }
    aplica();
  }));
  aplica();
  // Un enlace a #ca-… o #es-… abre la página en ese idioma (los bloques del otro idioma están ocultos)
  const h = location.hash.match(/^#(ca|es)-/);
  if (h && h[1] !== lang) {
    lang = h[1];
    aplica();
    const el = document.getElementById(location.hash.slice(1));
    if (el) el.scrollIntoView();
  }
})();
