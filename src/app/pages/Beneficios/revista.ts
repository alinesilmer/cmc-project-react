import type { Beneficio } from "./beneficios.types";

/**
 * Genera la "Revista de Beneficios": un catálogo A4 imprimible con todos los
 * convenios vigentes, listo para repartir en papel o mandar como PDF.
 *
 * Se arma como HTML y se abre en una ventana nueva para que el usuario lo
 * imprima o lo guarde como PDF (Ctrl+P → Guardar como PDF). Es a propósito:
 *
 *  · No suma dependencias — jsPDF/html2canvas rasterizan y el texto sale
 *    borroso al imprimir; esto sale vectorial y se puede seleccionar.
 *  · Queda editable: si el Colegio quiere retocar algo, es HTML.
 *  · Los saltos de página los controla `@page` + `break-inside`, así ninguna
 *    tarjeta queda partida entre dos hojas.
 */

const PALETA = {
  azul: "#173F70",
  azulProfundo: "#0D2747",
  turquesa: "#1E93B0",
  dorado: "#C2A24C",
  doradoClaro: "#F2E2A8",
  gris: "#F3F6FA",
  grisBorde: "#DCE4EE",
  texto: "#222E3C",
  textoSuave: "#5C6C7D",
};

const escapar = (s: string): string =>
  s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string
  );

/** Agrupa por categoría y ordena alfabéticamente dentro de cada una. */
function agrupar(items: Beneficio[]): [string, Beneficio[]][] {
  const mapa = new Map<string, Beneficio[]>();
  for (const b of items) {
    const lista = mapa.get(b.categoria) ?? [];
    lista.push(b);
    mapa.set(b.categoria, lista);
  }
  return [...mapa.entries()]
    .sort(([a], [b]) => a.localeCompare(b, "es"))
    .map(([cat, lista]) => [
      cat,
      lista.sort((x, y) => x.titulo.localeCompare(y.titulo, "es")),
    ]);
}

function tarjeta(b: Beneficio): string {
  const acento = b.color || PALETA.turquesa;
  return `
    <article class="ben" style="--acento:${escapar(acento)}">
      <div class="ben-top">
        <h3 class="ben-tit">${escapar(b.titulo)}</h3>
        ${b.descuento ? `<span class="ben-desc-chip">${escapar(b.descuento)}</span>` : ""}
      </div>
      <p class="ben-txt">${escapar(b.descripcion)}</p>
      ${
        b.ubicacion
          ? `<p class="ben-loc">
               <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                    stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                 <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>
               </svg>
               ${escapar(b.ubicacion)}
             </p>`
          : ""
      }
    </article>`;
}

export function generarRevistaHtml(
  beneficios: Beneficio[],
  logoUrl: string
): string {
  const vigentes = beneficios.filter((b) => b.activo);
  const grupos = agrupar(vigentes);
  const anio = new Date().getFullYear();
  const mes = new Date().toLocaleDateString("es-AR", { month: "long", year: "numeric" });

  const secciones = grupos
    .map(
      ([categoria, lista]) => `
      <section class="cat">
        <h2 class="cat-tit"><span>${escapar(categoria)}</span><i>${lista.length}</i></h2>
        <div class="ben-grid">${lista.map(tarjeta).join("")}</div>
      </section>`
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="es-AR">
<head>
<meta charset="UTF-8">
<title>Revista de Beneficios · Colegio Médico de Corrientes</title>
<style>
  :root{
    --azul:${PALETA.azul}; --azul-profundo:${PALETA.azulProfundo};
    --turquesa:${PALETA.turquesa}; --dorado:${PALETA.dorado};
    --dorado-claro:${PALETA.doradoClaro}; --gris:${PALETA.gris};
    --gris-borde:${PALETA.grisBorde}; --texto:${PALETA.texto};
    --texto-suave:${PALETA.textoSuave};
  }
  *{margin:0;padding:0;box-sizing:border-box}
  html{background:#8A94A0}
  body{
    font-family:"Inter","Montserrat","Segoe UI",system-ui,-apple-system,sans-serif;
    color:var(--texto);font-size:9.5pt;line-height:1.5;-webkit-font-smoothing:antialiased;
  }

  /* Cada .hoja es una página A4. */
  /* Sin overflow:hidden — el catálogo crece según cuántos convenios haya y
     debe repaginarse solo, no recortarse. El recorte se aplica sólo donde hay
     adornos que deben quedar dentro del marco (.tapa, .aviso). */
  .hoja{
    position:relative;width:210mm;min-height:297mm;margin:8mm auto;
    padding:16mm 15mm 20mm;background:#fff;
    box-shadow:0 4px 26px rgba(0,0,0,.28);
  }

  /* ── Tapa ─────────────────────────────────────────────────────────── */
  .tapa{
    display:flex;flex-direction:column;align-items:center;justify-content:center;
    text-align:center;padding:0;
    background:linear-gradient(165deg,var(--azul) 0%,var(--azul-profundo) 100%);
    color:#fff;overflow:hidden;
  }
  .tapa::before{
    content:"";position:absolute;top:-70mm;right:-60mm;
    width:180mm;height:180mm;border-radius:50%;background:rgba(255,255,255,.04);
  }
  .tapa-logo{width:52mm;height:52mm;object-fit:contain;position:relative;margin-bottom:10mm}
  .tapa-inst{
    position:relative;font-size:9pt;font-weight:700;letter-spacing:.22em;
    text-transform:uppercase;color:var(--dorado-claro);
  }
  .tapa-tit{
    position:relative;margin-top:6mm;font-size:40pt;font-weight:800;
    letter-spacing:-.03em;line-height:1.02;
  }
  .tapa-tit em{font-style:normal;color:var(--turquesa)}
  .tapa-sub{
    position:relative;margin-top:6mm;font-size:12pt;color:rgba(255,255,255,.78);
    max-width:120mm;line-height:1.5;
  }
  .tapa-pie{
    position:absolute;bottom:16mm;left:0;right:0;text-align:center;
    font-size:9pt;letter-spacing:.16em;text-transform:uppercase;
    color:rgba(255,255,255,.6);
  }

  /* ── Encabezado de páginas interiores ─────────────────────────────── */
  .cab{
    display:flex;align-items:center;gap:5mm;padding-bottom:4mm;
    border-bottom:1px solid var(--gris-borde);margin-bottom:8mm;
  }
  .cab-logo{width:14mm;height:14mm;object-fit:contain}
  .cab-tit{font-size:11pt;font-weight:700;color:var(--azul-profundo);line-height:1.2}
  .cab-tit span{display:block;font-size:7.5pt;font-weight:600;color:var(--turquesa);
    letter-spacing:.1em;text-transform:uppercase}
  .cab-der{margin-left:auto;font-size:7.5pt;letter-spacing:.12em;text-transform:uppercase;
    color:var(--texto-suave);font-weight:600}

  /* ── Aviso de credencial: el mensaje más importante de la revista ─── */
  .aviso{
    background:var(--azul-profundo);color:#fff;border-radius:3px;
    padding:8mm 9mm;margin-bottom:9mm;position:relative;overflow:hidden;
  }
  .aviso::after{
    content:"";position:absolute;right:-16mm;top:-18mm;width:60mm;height:60mm;
    border-radius:50%;border:9mm solid rgba(30,147,176,.15);
  }
  .aviso-eti{
    position:relative;font-size:7.5pt;font-weight:700;letter-spacing:.16em;
    text-transform:uppercase;color:var(--dorado-claro);
  }
  .aviso-tit{position:relative;margin-top:2.5mm;font-size:19pt;font-weight:800;
    letter-spacing:-.02em;line-height:1.15}
  .aviso-txt{position:relative;margin-top:3mm;font-size:10pt;color:#C3D4E4;max-width:135mm}
  .aviso-req{position:relative;display:flex;gap:5mm;margin-top:6mm;flex-wrap:wrap}
  .req{
    display:flex;align-items:center;gap:2.5mm;background:rgba(255,255,255,.08);
    border:1px solid rgba(255,255,255,.18);border-radius:3px;padding:3mm 5mm;
    font-size:10pt;font-weight:700;
  }
  .req svg{color:var(--turquesa);flex-shrink:0}

  /* ── Pasos del instructivo ────────────────────────────────────────── */
  .sec-tit{
    font-size:14pt;font-weight:700;color:var(--azul-profundo);letter-spacing:-.015em;
    margin-bottom:4mm;display:flex;align-items:center;gap:3mm;
  }
  .sec-tit::after{content:"";flex:1;height:1px;background:var(--gris-borde)}
  .sec-sub{font-size:9.5pt;color:var(--texto-suave);margin:-2mm 0 5mm}

  .pasos{display:grid;grid-template-columns:repeat(3,1fr);gap:5mm;margin-bottom:9mm}
  .paso{background:var(--gris);border:1px solid var(--gris-borde);
    border-top:2.5px solid var(--turquesa);border-radius:3px;padding:5mm}
  .paso-n{
    width:7mm;height:7mm;border-radius:50%;background:var(--azul-profundo);color:#fff;
    display:grid;place-items:center;font-size:9pt;font-weight:700;margin-bottom:3mm;
  }
  .paso h4{font-size:10pt;font-weight:700;color:var(--azul-profundo);margin-bottom:1.5mm}
  .paso p{font-size:8.5pt;color:var(--texto-suave);line-height:1.45}

  /* ── Espacios para las imágenes de guía ───────────────────────────── */
  .guias{display:grid;grid-template-columns:repeat(3,1fr);gap:5mm}
  .guia{
    border:1.4px dashed var(--gris-borde);border-radius:3px;background:#FAFCFF;
    /* Proporción de captura de celular, recortada para que las tres entren
       en la hoja junto al instructivo. */
    aspect-ratio:3/4;display:flex;flex-direction:column;align-items:center;
    justify-content:center;gap:2mm;padding:4mm;text-align:center;
  }
  .guia svg{color:#B6C4D4}
  .guia-t{font-size:8.5pt;font-weight:700;color:var(--azul-profundo)}
  .guia-h{font-size:7.5pt;color:#93A3B4;line-height:1.35}

  /* ── Beneficios ───────────────────────────────────────────────────── */
  .cat{margin-bottom:8mm;break-inside:avoid}
  .cat-tit{
    display:flex;align-items:center;gap:3mm;font-size:12pt;font-weight:700;
    color:var(--azul-profundo);margin-bottom:4mm;
  }
  .cat-tit span{white-space:nowrap}
  .cat-tit i{
    font-style:normal;font-size:7.5pt;font-weight:700;color:var(--turquesa);
    background:#E8F4F8;border-radius:999px;padding:.6mm 2.4mm;
  }
  .cat-tit::after{content:"";flex:1;height:1px;background:var(--gris-borde);order:1}

  .ben-grid{display:grid;grid-template-columns:1fr 1fr;gap:4mm}
  .ben{
    border:1px solid var(--gris-borde);border-left:3px solid var(--acento);
    border-radius:3px;padding:4.5mm 5mm;break-inside:avoid;
  }
  .ben-top{display:flex;align-items:flex-start;justify-content:space-between;gap:3mm}
  .ben-tit{font-size:10.5pt;font-weight:700;color:var(--azul-profundo);line-height:1.25}
  .ben-desc-chip{
    flex-shrink:0;background:var(--acento);color:#fff;border-radius:3px;
    padding:.8mm 2.4mm;font-size:9pt;font-weight:800;white-space:nowrap;
  }
  .ben-txt{margin-top:2mm;font-size:8.5pt;color:var(--texto-suave);line-height:1.45}
  .ben-loc{
    margin-top:2.5mm;display:flex;align-items:center;gap:1.5mm;
    font-size:8pt;color:var(--texto-suave);
  }
  .ben-loc svg{color:var(--turquesa)}

  .vacio{
    padding:14mm;text-align:center;border:1.4px dashed var(--gris-borde);
    color:var(--texto-suave);font-size:10pt;
  }

  /* Fluye con el contenido: si el catálogo ocupa varias hojas, un pie absoluto
     quedaría sólo al final de la última. */
  .pie-pag{
    margin-top:9mm;
    display:flex;justify-content:space-between;align-items:center;
    padding-top:3mm;border-top:1px solid var(--gris-borde);
    font-size:7.5pt;color:var(--texto-suave);
  }
  .pie-pag strong{color:var(--azul)}

  /* Barra flotante: la revista se abre en una pestaña suelta y sin esto no hay
     ninguna pista de que el paso siguiente es imprimirla o guardarla en PDF. */
  .barra{
    position:fixed;top:0;left:0;right:0;z-index:9;
    display:flex;align-items:center;justify-content:center;gap:5mm;
    padding:3mm;background:rgba(13,39,71,.96);color:#fff;
    font-size:10pt;backdrop-filter:blur(4px);
  }
  .barra button{
    font:inherit;font-weight:700;cursor:pointer;border:0;border-radius:3px;
    padding:2mm 6mm;background:var(--turquesa);color:#fff;
  }
  .barra span{color:#B7C6D6}
  body{padding-top:14mm}

  @page{size:A4 portrait;margin:0}
  @media print{
    html{background:none}
    body{padding-top:0}
    .barra{display:none}
    .hoja{margin:0;box-shadow:none;page-break-after:always}
    .hoja:last-child{page-break-after:auto}
    /* Sin esto Chrome descarta los fondos de color al exportar a PDF. */
    *{-webkit-print-color-adjust:exact;print-color-adjust:exact}
    .ben,.paso,.guia,.aviso,.cat{break-inside:avoid}
  }
</style>
</head>
<body>

<div class="barra">
  <span>Elegí <strong>Guardar como PDF</strong> como destino para conservarla.</span>
  <button type="button" onclick="window.print()">Imprimir o guardar en PDF</button>
</div>

<!-- ══ TAPA ══════════════════════════════════════════════════════════════ -->
<div class="hoja tapa">
  <img class="tapa-logo" src="${escapar(logoUrl)}" alt="">
  <div class="tapa-inst">Colegio Médico de Corrientes</div>
  <h1 class="tapa-tit">Red de<br><em>Beneficios</em></h1>
  <p class="tapa-sub">
    Descuentos, promociones y ventajas exclusivas para los médicos asociados
    y su grupo familiar.
  </p>
  <div class="tapa-pie">Edición ${escapar(mes)}</div>
</div>

<!-- ══ CÓMO USAR TU BENEFICIO ════════════════════════════════════════════ -->
<div class="hoja">
  <div class="cab">
    <img class="cab-logo" src="${escapar(logoUrl)}" alt="">
    <div class="cab-tit">Colegio Médico<span>de Corrientes</span></div>
    <div class="cab-der">Red de Beneficios</div>
  </div>

  <div class="aviso">
    <div class="aviso-eti">Importante</div>
    <div class="aviso-tit">Para acceder a cualquier beneficio<br>presentá tu credencial y tu DNI</div>
    <p class="aviso-txt">
      Los comercios adheridos verifican que seas socio del Colegio antes de
      aplicar el descuento. Sin los dos documentos no se puede acreditar el
      beneficio.
    </p>
    <div class="aviso-req">
      <span class="req">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
             stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          <rect x="2.5" y="5" width="19" height="14" rx="2"/><circle cx="8.5" cy="11" r="2.2"/>
          <path d="M5 16.5c.7-1.6 2-2.4 3.5-2.4s2.8.8 3.5 2.4M15 10h4M15 13.5h4"/></svg>
        Credencial de socio
      </span>
      <span class="req">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
             stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="4.5" width="18" height="15" rx="2"/><path d="M7 9h5M7 12.5h10M7 16h7"/></svg>
        DNI
      </span>
    </div>
  </div>

  <h2 class="sec-tit">¿Dónde encuentro mi credencial?</h2>
  <p class="sec-sub">
    Es digital: la llevás en el celular y la mostrás desde la pantalla. No hace
    falta imprimirla.
  </p>

  <div class="pasos">
    <div class="paso">
      <div class="paso-n">1</div>
      <h4>Entrá a tu perfil</h4>
      <p>Ingresá con tu usuario a la app del Colegio o al portal del socio desde la web.</p>
    </div>
    <div class="paso">
      <div class="paso-n">2</div>
      <h4>Abrí "Mi Credencial"</h4>
      <p>Vas a ver tu credencial digital con tu nombre, especialidad, DNI y estado de socio.</p>
    </div>
    <div class="paso">
      <div class="paso-n">3</div>
      <h4>Mostrala en el comercio</h4>
      <p>Presentala junto con tu DNI antes de pagar. También podés descargarla en PDF.</p>
    </div>
  </div>

  <h2 class="sec-tit">Guía paso a paso</h2>
  <p class="sec-sub">
    Reemplazá estos espacios por capturas de pantalla reales del proceso.
  </p>

  <div class="guias">
    <div class="guia">
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor"
           stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.8"/>
        <path d="m21 15-5-5L5 21"/></svg>
      <span class="guia-t">Paso 1</span>
      <span class="guia-h">Captura del ingreso al portal</span>
    </div>
    <div class="guia">
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor"
           stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.8"/>
        <path d="m21 15-5-5L5 21"/></svg>
      <span class="guia-t">Paso 2</span>
      <span class="guia-h">Captura del botón "Mi Credencial"</span>
    </div>
    <div class="guia">
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor"
           stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.8"/>
        <path d="m21 15-5-5L5 21"/></svg>
      <span class="guia-t">Paso 3</span>
      <span class="guia-h">Captura de la credencial en pantalla</span>
    </div>
  </div>

  <div class="pie-pag">
    <span><strong>Colegio Médico de Corrientes</strong> · Red de Beneficios</span>
    <span>Presentá credencial y DNI</span>
  </div>
</div>

<!-- ══ BENEFICIOS ════════════════════════════════════════════════════════ -->
<div class="hoja">
  <div class="cab">
    <img class="cab-logo" src="${escapar(logoUrl)}" alt="">
    <div class="cab-tit">Colegio Médico<span>de Corrientes</span></div>
    <div class="cab-der">${vigentes.length} beneficio${vigentes.length === 1 ? "" : "s"} vigente${vigentes.length === 1 ? "" : "s"}</div>
  </div>

  ${
    vigentes.length === 0
      ? `<div class="vacio">Todavía no hay beneficios cargados.</div>`
      : secciones
  }

  <div class="pie-pag">
    <span><strong>Colegio Médico de Corrientes</strong> · Edición ${escapar(mes)}</span>
    <span>Beneficios sujetos a modificaciones · ${anio}</span>
  </div>
</div>

</body>
</html>`;
}

/** Abre la revista en una pestaña nueva, lista para imprimir o guardar en PDF. */
export function abrirRevista(beneficios: Beneficio[], logoUrl: string): boolean {
  const ventana = window.open("", "_blank");
  // El navegador puede bloquear el popup: se avisa en vez de fallar en silencio.
  if (!ventana) return false;
  ventana.document.write(generarRevistaHtml(beneficios, logoUrl));
  ventana.document.close();
  return true;
}
