import { ORIGEN_LABELS } from "../nomenclador.types";
import type { ValorOut, GalenoOut, ComponentePayload, Origen } from "../nomenclador.types";
import { today, parseMonto } from "../nomenclador.helpers";
import { fechaCorta } from "@/app/pages/NomencladorNacional/utiles";
import type { ModalidadValor, ComoFactura, ComponenteForm, PrecioForm, ValorForm } from "./porOS.types";

export function formVacio(): ValorForm {
  return {
    nomencladorId: null,
    nomencladorLabel: "",
    nomencladorDesc: "",
    origen: "NE",
    modalidad: "calculable",
    comoFactura: "manual",
    nomencladorSlug: "",
    vigencia_desde: today(),
    descripcion: "",
    porPresupuesto: false,
    nivel: "",
    complejidad: "",
    cantidad_ayudantes: "",
    coseguro: "",
    observacion: "",
    especialidadesChecked: new Set(),
    sinRestriccion: false,
    componentes: initComps(),
    mismoPrecio: true,
    precios: {},
  };
}

/** Componentes a mandar: Honorarios siempre; Gastos/Ayudante sólo si están cargados. */
export function componentesPayload(
  modalidad: ModalidadValor,
  comps: ComponenteForm[],
): ComponentePayload[] {
  return comps
    .filter((c, i) => {
      if (i === 0) return true;
      if (modalidad === "calculable") return c.galeno_id != null;
      return c.valor_unitario.trim() !== "" && !isNaN(parseFloat(c.valor_unitario));
    })
    .map((c, i) => ({
      concepto: c.concepto,
      galeno_id: modalidad === "calculable" ? c.galeno_id : null,
      cantidad: modalidad === "calculable" ? parseFloat(c.cantidad) || 0 : 0,
      valor_unitario: modalidad === "fijo" ? parseFloat(c.valor_unitario) : null,
      opcional: c.opcional,
      orden: i,
    }));
}

/** "" o un importe ≥ 0; si no, el mensaje de error. */
export function errorCoseguro(v: string): string | null {
  if (!v.trim()) return null;
  const n = parseFloat(v);
  if (isNaN(n)) return "Importe inválido";
  return n < 0 ? "El coseguro no puede ser negativo" : null;
}

/** Aviso (no bloquea) de qué pasa con una vigencia que no es posterior a la vigente: la misma fecha la actualiza. */
export function avisoVigencia(nueva: string, vigente: string | undefined): string | null {
  if (!nueva || !vigente || nueva > vigente) return null;
  if (nueva === vigente) {
    return `Ya existe una vigencia desde el ${fechaCorta(vigente)}: se actualiza con estos valores, no se crea otra.`;
  }
  return `Es anterior a la vigente (${fechaCorta(vigente)}): se eliminan de la base las vigencias desde el ${fechaCorta(nueva)} en adelante y esta queda como la última.`;
}

/** El galeno nivelado que usa la ecuación (el primero), o null. */
export function galenoNivelado(
  comps: ComponenteForm[],
  galenoPorId: Map<number, GalenoOut>,
): GalenoOut | null {
  for (const c of comps) {
    const g = c.galeno_id != null ? galenoPorId.get(c.galeno_id) : undefined;
    if (g && g.nivel != null) return g;
  }
  return null;
}

/** Errores de un precio, con `prefijo` delante de cada clave (`""` para el compartido). */
export function erroresPrecio(p: PrecioForm, prefijo: string): Record<string, string> {
  const errs: Record<string, string> = {};
  const cos = errorCoseguro(p.coseguro);
  if (cos) errs[`${prefijo}coseguro`] = cos;
  const hon = p.componentes[0];
  if (p.modalidad === "calculable") {
    if (!hon.galeno_id) errs[`${prefijo}comp_0_galeno`] = "Seleccioná un galeno";
  } else if (!hon.valor_unitario.trim() || isNaN(parseFloat(hon.valor_unitario))) {
    errs[`${prefijo}comp_0_valor`] = "Valor inválido";
  }
  p.componentes.slice(1).forEach((c, i) => {
    const idx = i + 1;
    if (p.modalidad === "calculable" && c.cantidad && !c.galeno_id)
      errs[`${prefijo}comp_${idx}_galeno`] = "Seleccioná un galeno";
    if (p.modalidad === "fijo" && c.valor_unitario.trim() && isNaN(parseFloat(c.valor_unitario)))
      errs[`${prefijo}comp_${idx}_valor`] = "Valor inválido";
  });
  return errs;
}

/** Los errores de un prefijo, sin el prefijo (lo que espera `ComponentEditor`). */
export function erroresDe(errors: Record<string, string>, prefijo: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(errors)) {
    if (k.startsWith(prefijo)) out[k.slice(prefijo.length)] = v;
  }
  return out;
}

export function clonarPrecio(p: PrecioForm): PrecioForm {
  return { ...p, componentes: p.componentes.map((c) => ({ ...c })) };
}

/** El precio vigente de una fila, como formulario. */
export function precioDeValor(v: ValorOut): PrecioForm {
  return {
    modalidad: v.modalidad === "galeno" ? "calculable" : "fijo",
    componentes: compsFromOut(v.componentes),
    coseguro: v.coseguro && parseMonto(v.coseguro) !== 0 ? v.coseguro : "",
    ...comoFacturaDe(v),
  };
}

/** Cómo se factura hoy un valor NE (el NN va siempre por el Nacional: no se elige). */
export function comoFacturaDe(v: ValorOut): Pick<PrecioForm, "comoFactura" | "nomencladorId"> {
  if (v.origen !== "NE" || v.por_presupuesto) return {};
  if (v.modalidad === "fijo") return { comoFactura: "fijo", nomencladorId: null };
  return v.nomenclador_nivelado_id != null
    ? { comoFactura: "nomenclador", nomencladorId: v.nomenclador_nivelado_id }
    : { comoFactura: "manual", nomencladorId: null };
}

/** Lo que se manda al servidor para que el valor nuevo siga (o cambie) su forma de facturarse. */
export function nomencladorPayload(p: Pick<PrecioForm, "comoFactura" | "nomencladorId">) {
  if (p.comoFactura === undefined) return {};
  return {
    definir_nomenclador: true,
    nomenclador_nivelado_id: p.comoFactura === "nomenclador" ? (p.nomencladorId ?? null) : null,
  };
}

/** Para comparar contra lo que había al abrir: sólo rota lo que cambió. */
export const firmaPrecio = (p: PrecioForm) => JSON.stringify(p);

// ─── Helpers ──────────────────────────────────────────────────────────────────


export const PAGE_SIZE = 25;

export function origenBadgeLabel(o: Origen): string {
  return ORIGEN_LABELS[o];
}

export const MODALIDAD_LABELS: Record<ValorOut["modalidad"], string> = {
  galeno: "Calculable",
  fijo: "Fijo",
  por_presupuesto: "Por presupuesto",
};

export const FIXED_CONCEPTOS: ComponenteForm["concepto"][] = [
  "Honorarios",
  "Gastos",
  "Ayudante",
];

export function initComps(): ComponenteForm[] {
  return FIXED_CONCEPTOS.map((concepto) => ({
    concepto,
    galeno_id: null,
    cantidad: "",
    valor_unitario: "",
    opcional: concepto !== "Honorarios",
  }));
}

/** El importe de un concepto suelto, o `null` si el valor no lo tiene cargado. */
export function montoDe(
  v: ValorOut,
  concepto: ComponenteForm["concepto"],
): number | null {
  const c = v.componentes.find((x) => x.concepto === concepto && x.activo);
  if (!c) return null;
  return c.tipo === "calculable"
    ? parseMonto(c.subtotal)
    : parseMonto(c.valor_unitario);
}

export function compsFromOut(comps: ValorOut["componentes"]): ComponenteForm[] {
  return FIXED_CONCEPTOS.map((concepto) => {
    const ex = comps.find((c) => c.concepto === concepto && c.activo);
    return {
      concepto,
      galeno_id: ex?.galeno_id ?? null,
      cantidad: ex?.cantidad ?? "",
      valor_unitario: ex?.valor_unitario ?? "",
      opcional: concepto !== "Honorarios",
    };
  });
}

// ─── ComoSeFactura: por nomenclador / valor fijo / manual ──────────────────────

export const COMO_FACTURA: { id: ComoFactura; titulo: string; texto: string }[] = [
  { id: "nomenclador", titulo: "Por nomenclador", texto: "Calculado con el galeno de la obra social y la escala del nomenclador." },
  { id: "fijo", titulo: "Valor fijo", texto: "Un importe en pesos por componente, sin galeno." },
  { id: "manual", titulo: "Manual (galeno × cantidad)", texto: "Elegís el galeno y la cantidad de cada componente." },
];
