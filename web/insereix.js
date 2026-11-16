/* Girona en xifres: ajusta l'alçada dels gràfics inserits amb iframe. Es pot carregar diverses vegades. */
(function () {
  if (window.__gironaXifres) return;
  window.__gironaXifres = 1;
  var s = document.currentScript, orig = s ? new URL(s.src).origin : null;
  window.addEventListener("message", function (e) {
    var d = e.data;
    if (!d || d.gx !== "alcada" || typeof d.h !== "number" || (orig && e.origin !== orig)) return;
    var fs = document.getElementsByTagName("iframe");
    for (var i = 0; i < fs.length; i++) if (fs[i].contentWindow === e.source) { fs[i].style.height = Math.max(120, Math.min(4000, d.h)) + "px"; break; }
  });
})();
