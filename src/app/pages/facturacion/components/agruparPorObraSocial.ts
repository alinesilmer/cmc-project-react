import type { PrestacionRead } from "../types";
import { parseMoney } from "../money";

export interface GrupoObraSocial {
  clave: string;
  nombre: string;
  prestaciones: PrestacionRead[];
  totalHonorarios: number;
  totalGastos: number;
  totalImporte: number;
}

/**
 * Agrupa un listado plano de prestaciones por obra social, con subtotal por
 * grupo — las anuladas (`estado === "X"`) no suman, mismo criterio que ya usa
 * el resumen de `DetallePorMedico.tsx` y "Las rechazadas no suman" en
 * `Validaciones/components/PrestacionesTable.tsx`. Grupos ordenados por
 * nombre; dentro de cada grupo se conserva el orden recibido.
 */
export function agruparPorObraSocial(prestaciones: PrestacionRead[]): GrupoObraSocial[] {
  const porClave = new Map<string, GrupoObraSocial>();

  for (const p of prestaciones) {
    const clave = p.cod_obra_social ?? "sin-os";
    const nombre = p.nombre_obra_social || p.cod_obra_social || "Sin obra social";
    let grupo = porClave.get(clave);
    if (!grupo) {
      grupo = { clave, nombre, prestaciones: [], totalHonorarios: 0, totalGastos: 0, totalImporte: 0 };
      porClave.set(clave, grupo);
    }
    grupo.prestaciones.push(p);
    if (p.estado !== "X") {
      grupo.totalHonorarios += parseMoney(p.honorarios);
      grupo.totalGastos += parseMoney(p.gastos);
      grupo.totalImporte += parseMoney(p.importe_total);
    }
  }

  return Array.from(porClave.values()).sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
}
