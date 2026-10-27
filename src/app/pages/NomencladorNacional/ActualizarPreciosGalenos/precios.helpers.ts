import type { GalenoOut } from "../nomenclador.types";
import { compararGalenos } from "../nomenclador.helpers";
import { formatoPesos, formatoUnidades } from "@/app/shared/lib/formatos";

/** Un galeno agrupado por código: los nivelados agrupan todos sus niveles. */
export type Grupo = {
  codigo: string;
  nombre: string;
  nivelado: boolean;
  /** Ordenados por nivel. */
  niveles: GalenoOut[];
  /** Se muestra en el boletín del médico. El interruptor pisa todos los niveles juntos. */
  visible: boolean;
};

export type ResultadoGuardado = { codigo: string; nombre: string; ok: boolean; msg?: string };

/** Los galenos de la obra social por código, en el orden del boletín y no el alfabético (ver `compararGalenos`). */
export function agruparGalenos(galenos: GalenoOut[]): Grupo[] {
  const porCodigo = new Map<string, GalenoOut[]>();
  for (const g of galenos) {
    const filas = porCodigo.get(g.codigo) ?? [];
    filas.push(g);
    porCodigo.set(g.codigo, filas);
  }
  return [...porCodigo.entries()]
    .map(([codigo, filas]) => {
      const niveles = [...filas].sort((a, b) => (a.nivel ?? 0) - (b.nivel ?? 0));
      return {
        codigo,
        nombre: niveles[0].nombre,
        nivelado: filas.some((f) => f.nivel != null),
        niveles,
        visible: filas.every((f) => f.visible !== false),
      };
    })
    .sort(compararGalenos);
}

/** El valor tipeado como número si es un monto válido (finito y no negativo); si no, `null`. */
export function montoValido(texto: string): number | null {
  if (texto.trim() === "") return null;
  const n = parseFloat(texto);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

/** Valor unitario actual de un grupo: un único valor si todos los niveles coinciden, si no un rango. */
export function grupoValorActual(g: Grupo): string {
  const nums = g.niveles.map((n) => parseFloat(n.valor_unitario));
  const min = Math.min(...nums);
  const max = Math.max(...nums);
  return min === max ? formatoPesos.format(min) : `${formatoPesos.format(min)} – ${formatoPesos.format(max)}`;
}

/** Honorario de un nivel: unidades de honorarios × valor unitario del galeno. */
export function honorarioDe(unidades: string | null, valorUnitario: number): number | null {
  if (unidades == null) return null;
  const u = parseFloat(unidades);
  if (Number.isNaN(u) || Number.isNaN(valorUnitario)) return null;
  return u * valorUnitario;
}

/** Unidades sin ceros de relleno: `3.00` → `3`, `0.25` → `0,25`. */
export function formatUnidades(unidades: string | null): string | null {
  if (unidades == null) return null;
  const u = parseFloat(unidades);
  return Number.isNaN(u) ? null : formatoUnidades.format(u);
}
