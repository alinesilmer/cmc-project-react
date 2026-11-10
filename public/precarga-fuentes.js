// Precarga las fuentes de cada app (panel: Google Sans + Montserrat; sitio: Inter + Manrope). Archivo aparte porque la CSP no admite scripts en línea.
(function () {
  var panel = location.pathname.indexOf("/panel") === 0;
  var fuentes = panel ? ["google-sans", "montserrat"] : ["inter", "manrope"];
  fuentes.forEach(function (f) {
    var l = document.createElement("link");
    l.rel = "preload"; l.as = "font"; l.type = "font/woff2"; l.crossOrigin = "anonymous";
    l.href = "/fonts/" + f + "-latin.woff2";
    document.head.appendChild(l);
  });
})();
