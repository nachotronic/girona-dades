"use strict";
/* Bústia «Et falta alguna dada?»: formulario sin servidor propio. El mensaje se envía a FormSubmit
   (formsubmit.co), que lo reenvía por correo a la redacción. Si el envío falla, se ofrece el mismo texto por mailto.
   Usa las variables globales de app.js: t, LANG. */
(() => {
  const CORREU = "redaccion@mapaelectoral.es";
  const DESTI = `https://formsubmit.co/ajax/${CORREU}`;
  const form = document.getElementById("proposa-form");
  if (!form) return;
  const estat = document.getElementById("proposa-estat");
  const boto = form.querySelector("button[type=submit]");
  const mostra = (cls, html) => { estat.className = `pr-estat ${cls}`; estat.innerHTML = html; estat.hidden = false; };

  const mailto = (d) => {
    const cos = [`${t("pr_dada")}: ${d.dada}`, d.lloc && `${t("pr_lloc")}: ${d.lloc}`, d.font && `${t("pr_font")}: ${d.font}`].filter(Boolean).join("\n\n");
    return `mailto:${CORREU}?subject=${encodeURIComponent(t("pr_assumpte"))}&body=${encodeURIComponent(cos)}`;
  };

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const f = new FormData(form);
    if (f.get("_honey")) return; // robots
    const d = { dada: (f.get("dada") || "").trim(), lloc: (f.get("lloc") || "").trim(), font: (f.get("font") || "").trim(), email: (f.get("email") || "").trim() };
    if (!d.dada) { form.dada.focus(); return; }
    boto.disabled = true;
    mostra("pr-envia", t("pr_enviant"));
    const cos = {
      _subject: `${t("pr_assumpte")}${d.lloc ? ` · ${d.lloc}` : ""}`,
      _template: "table", _captcha: "false",
      [t("pr_dada")]: d.dada, [t("pr_lloc")]: d.lloc || "–", [t("pr_font")]: d.font || "–",
      idioma: LANG, pagina: location.href,
    };
    if (d.email) { cos.email = d.email; cos._replyto = d.email; }
    fetch(DESTI, { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify(cos) })
      .then((r) => r.json().then((j) => ({ ok: r.ok && String(j.success) === "true" })))
      .then(({ ok }) => {
        if (!ok) throw new Error("formsubmit");
        form.reset();
        mostra("pr-ok", t("pr_ok"));
      })
      .catch(() => mostra("pr-error", t("pr_error", mailto(d), CORREU)))
      .finally(() => { boto.disabled = false; });
  });

  // Enlace al final de la ficha: rellena el municipio y lleva al formulario
  window.fitxaProposa = (cont, m) => {
    if (!cont) return;
    cont.innerHTML = `<a class="fp-enllac" href="#proposa"><span class="fp-sobre">${t("pr_sobre")}</span><span class="fp-text">${t("pr_fitxa", m.nom)}</span><span class="fp-fletxa" aria-hidden="true">→</span></a>`;
    cont.querySelector("a").addEventListener("click", () => {
      form.lloc.value = m.nom;
      setTimeout(() => form.dada.focus({ preventScroll: true }), 400);
    });
  };
})();
