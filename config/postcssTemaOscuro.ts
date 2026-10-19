import type { Declaration, Plugin, Rule } from "postcss";

/** Tema oscuro del panel, resuelto en un solo lugar. */

/** Sólo el panel y las dos librerías de interfaz que dibujan dentro de él. */
const ARCHIVOS = /[\\/]src[\\/]app[\\/]|[\\/]node_modules[\\/](rsuite|react-datepicker)[\\/]/;
const LIBRERIA = /[\\/]node_modules[\\/]/;

const SOPORTA = "(color: light-dark(#000, #fff))";

type Uso = "fondo" | "texto" | "borde";

function usoDe(prop: string, enLibreria: boolean): Uso | null {
  const p = prop.toLowerCase();
  if (p.startsWith("--")) {
    // Las variables propias del panel (p. ej. el color de marca de una obra social) no se tocan.
    if (!enLibreria) return null;
    if (/bg|background|overlay|backdrop/.test(p)) return "fondo";
    if (/border|divider/.test(p)) return "borde";
    if (/text|color|icon/.test(p)) return "texto";
    return null;
  }
  if (p === "background" || p === "background-color" || p === "background-image") return "fondo";
  if (p === "color" || p === "fill" || p === "stroke" || p === "caret-color") return "texto";
  if (p === "-webkit-text-fill-color" || p === "text-decoration-color" || p === "text-decoration") return "texto";
  if (p.startsWith("border") && !p.includes("radius") && !p.includes("spacing") && !p.includes("collapse")) {
    return "borde";
  }
  if (p === "outline" || p === "outline-color" || p === "column-rule") return "borde";
  return null;
}

// ── Color: sRGB ↔ OKLCH ──────────────────────────────────────────────────────
// OKLCH separa luminosidad, saturación y tono como los percibe el ojo: mover sólo la luminosidad no cambia el tono (cosa que en HSL sí pasa).

type Rgba = { r: number; g: number; b: number; a: number };
type Lch = { l: number; c: number; h: number };

const aLineal = (v: number) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
const aGamma = (v: number) => (v <= 0.0031308 ? v * 12.92 : 1.055 * v ** (1 / 2.4) - 0.055);

function aLch({ r, g, b }: Rgba): Lch {
  const lr = aLineal(r / 255);
  const lg = aLineal(g / 255);
  const lb = aLineal(b / 255);
  const l = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb);
  const m = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb);
  const s = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb);
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  return { l: L, c: Math.hypot(A, B), h: Math.atan2(B, A) };
}

function aRgb({ l: L, c, h }: Lch): [number, number, number] | null {
  const A = c * Math.cos(h);
  const B = c * Math.sin(h);
  const l = (L + 0.3963377774 * A + 0.2158037573 * B) ** 3;
  const m = (L - 0.1055613458 * A - 0.0638541728 * B) ** 3;
  const s = (L - 0.0894841775 * A - 1.291485548 * B) ** 3;
  const rgb = [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
  if (rgb.some((v) => v < -0.0005 || v > 1.0005)) return null;
  return rgb.map((v) => Math.round(aGamma(Math.min(1, Math.max(0, v))) * 255)) as [number, number, number];
}

/** Si el color no entra en sRGB, baja la saturación hasta que entre. */
function escribir(lch: Lch, a: number): string {
  let c = lch.c;
  let rgb = aRgb({ ...lch, c });
  while (!rgb && c > 0.001) {
    c *= 0.9;
    rgb = aRgb({ ...lch, c });
  }
  const [r, g, b] = rgb ?? [0, 0, 0];
  if (a >= 1) return `#${[r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
  return `rgba(${r}, ${g}, ${b}, ${Number(a.toFixed(3))})`;
}

// ── Las reglas del tema ──────────────────────────────────────────────────────

/** Tono (en radianes) del azul del Colegio, para teñir los grises. */
const TONO_MARCA = 4.5;

const limitar = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

/** Devuelve el color para oscuro, o `null` si el original ya sirve. */
function oscurecer(color: Rgba, uso: Uso): string | null {
  const { l, c, h } = aLch(color);
  // Un gris puro no tiene tono propio: toma el azulado de la marca.
  const tono = c < 0.008 ? TONO_MARCA : h;

  if (uso === "fondo") {
    // Velos translúcidos y rellenos oscuros o de marca: sirven en los dos temas.
    if (color.a < 0.35 || l < 0.6) return null;
    // Relleno claro y saturado (naranja, amarillo): se apaga, pero se reconoce.
    if (c >= 0.1) return escribir({ l: 0.4, c: c * 0.75, h }, color.a);
    // Fondos claros: se comprimen a la franja oscura conservando el orden, así lo que era apenas más claro (tarjeta sobre página) lo sigue siendo.
    const t = (l - 0.6) / 0.4;
    return escribir({ l: 0.15 + 0.13 * t ** 3, c: limitar(c * 1.7, 0.022, 0.085), h: tono }, color.a);
  }

  if (uso === "texto") {
    // Texto claro: ya estaba sobre un fondo oscuro o de marca.
    if (l >= 0.62) return null;
    // Texto oscuro → claro, conservando la jerarquía (el más oscuro, el más claro).
    return escribir({ l: 0.96 - l * 0.5, c: Math.min(c, 0.12), h }, color.a);
  }

  if (color.a < 0.35) return null;
  if (c < 0.05) return escribir({ l: l >= 0.6 ? 0.27 + (1 - l) * 1.1 : 0.62, c: Math.max(c, 0.022), h: tono }, color.a);
  // Borde de color oscuro (azul de marca): se aclara para que se vea.
  if (l < 0.5) return escribir({ l: l + 0.22, c, h }, color.a);
  return null;
}

// ── Lectura de los colores de una declaración ────────────────────────────────

const COLOR =
  /#[0-9a-f]{8}\b|#[0-9a-f]{6}\b|#[0-9a-f]{3,4}\b|rgba?\(\s*[\d.]+%?[\s,]+[\d.]+%?[\s,]+[\d.]+%?\s*(?:[,/]\s*[\d.]+%?\s*)?\)|\b(?:white|black)\b/gi;

function leer(token: string): Rgba | null {
  const t = token.toLowerCase();
  if (t === "white") return { r: 255, g: 255, b: 255, a: 1 };
  if (t === "black") return { r: 0, g: 0, b: 0, a: 1 };

  if (t.startsWith("#")) {
    let hex = t.slice(1);
    if (hex.length <= 4) hex = [...hex].map((x) => x + x).join("");
    const n = (i: number) => parseInt(hex.slice(i, i + 2), 16);
    return { r: n(0), g: n(2), b: n(4), a: hex.length === 8 ? n(6) / 255 : 1 };
  }

  const partes = t.match(/[\d.]+%?/g);
  if (!partes || partes.length < 3) return null;
  const canal = (v: string) => (v.endsWith("%") ? (parseFloat(v) / 100) * 255 : parseFloat(v));
  const alfa = partes[3] ? (partes[3].endsWith("%") ? parseFloat(partes[3]) / 100 : parseFloat(partes[3])) : 1;
  return { r: canal(partes[0]), g: canal(partes[1]), b: canal(partes[2]), a: alfa };
}

// Los mismos colores se repiten miles de veces: cada uno se calcula una vez.
const resueltos = new Map<string, string | null>();

function resolver(token: string, uso: Uso): string | null {
  const clave = `${uso}|${token.toLowerCase()}`;
  let oscuro = resueltos.get(clave);
  if (oscuro === undefined) {
    const color = leer(token);
    oscuro = color ? oscurecer(color, uso) : null;
    resueltos.set(clave, oscuro);
  }
  return oscuro;
}

/** El valor con cada color envuelto en `light-dark()`, o `null` si no cambia nada. */
function valorOscuro(valor: string, uso: Uso): string | null {
  // Lo que va dentro de `url()` (rutas, SVG embebidos) no se toca.
  const partes = valor.split(/(url\([^)]*\))/i);
  let cambio = false;

  const salida = partes.map((parte) => {
    if (/^url\(/i.test(parte)) return parte;
    return parte.replace(COLOR, (token) => {
      const oscuro = resolver(token, uso);
      if (!oscuro) return token;
      cambio = true;
      return `light-dark(${token}, ${oscuro})`;
    });
  });

  return cambio ? salida.join("") : null;
}

export default function temaOscuro(): Plugin {
  return {
    postcssPlugin: "cmc-tema-oscuro",
    Once(root) {
      const archivo = root.source?.input.file ?? "";
      if (!ARCHIVOS.test(archivo)) return;

      const enLibreria = LIBRERIA.test(archivo);
      const variables = new Map<Rule, Declaration[]>();

      root.walkDecls((decl: Declaration) => {
        if (decl.value.includes("light-dark(")) return;
        // Una regla bajo `[data-tema="oscuro"]` ya es el color oscuro, elegido a mano: convertirla de nuevo lo arruinaría (un plateado pasaría a gris).
        const padre = decl.parent as { selector?: string } | undefined;
        if (padre?.selector?.includes("data-tema")) return;
        const uso = usoDe(decl.prop, enLibreria);
        if (!uso) return;
        const valor = valorOscuro(decl.value, uso);
        if (!valor) return;

        if (!decl.prop.startsWith("--")) {
          decl.cloneAfter({ value: valor });
          return;
        }
        // Una variable acepta cualquier valor: un navegador sin `light-dark()` no la descartaría y rompería lo que la usa.
        const regla = decl.parent;
        if (regla?.type !== "rule") return;
        const lista = variables.get(regla as Rule) ?? [];
        lista.push(decl.clone({ value: valor }));
        variables.set(regla as Rule, lista);
      });

      for (const [regla, decls] of variables) {
        const copia = regla.clone();
        copia.removeAll();
        copia.append(decls);
        regla.after({ name: "supports", params: SOPORTA, nodes: [copia] });
      }
    },
  };
}
