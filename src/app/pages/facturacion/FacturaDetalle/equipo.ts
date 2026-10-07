// Equipo quirúrgico: qué prestaciones van pegadas a qué médico de cabecera.
//
// Lo normal es que el ayudante/pediatra traiga `grupo_equipo_id` (apunta a la cabeza). Pero
// hay ayudantes y pediatras cargados sueltos, sin grupo: de todas formas van con su médico
// de cabecera, así que acá se lo busca entre las prestaciones de la misma factura.
import type { PrestacionConSocio } from "./FilaPrestacion";

// Códigos (parto / cesárea) cuya carga habilita un pediatra: ahí está su cabecera.
const CODIGOS_CON_PEDIATRA = new Set(["110401", "110403"]);

const normal = (s: string | null | undefined): string => (s ?? "").trim().toLowerCase().replace(/\s+/g, " ");

// El paciente se identifica por su documento/afiliado; sin eso, por el nombre.
export const clavePaciente = (p: PrestacionConSocio): string =>
  normal(p.nro_afiliado) || normal(p.nombre_paciente);

const esIntegranteSuelto = (p: PrestacionConSocio): boolean =>
  p.grupo_equipo_id == null && (p.tipo_prestador === "Ayudante" || p.tipo_prestador === "Pediatra");

const puedeSerCabeza = (p: PrestacionConSocio): boolean =>
  p.grupo_equipo_id === p.id
  || (p.grupo_equipo_id == null && p.tipo_prestador !== "Ayudante" && p.tipo_prestador !== "Pediatra"
    && p.tipo_prestador !== "Gastos");

/**
 * Para cada ayudante/pediatra SIN grupo, la cabeza que le corresponde (id integrante → id
 * cabeza): misma factura, mismo paciente y misma fecha de práctica, de otro socio. Si hay
 * varias, gana la que ya es cabeza de un equipo, después la misma clínica y el mismo
 * código, y por último la de id más cercano (anterior primero). Sin candidata, queda suelto.
 */
export function inferirEquipos(prestaciones: PrestacionConSocio[]): Map<number, number> {
  const porClave = new Map<string, PrestacionConSocio[]>();
  for (const p of prestaciones) {
    if (!puedeSerCabeza(p)) continue;
    const k = `${clavePaciente(p)}|${p.fecha_practica ?? ""}`;
    const arr = porClave.get(k);
    if (arr) arr.push(p); else porClave.set(k, [p]);
  }

  const out = new Map<number, number>();
  for (const m of prestaciones) {
    if (!esIntegranteSuelto(m)) continue;
    const clave = clavePaciente(m);
    if (!clave) continue;
    const candidatas = (porClave.get(`${clave}|${m.fecha_practica ?? ""}`) ?? [])
      .filter((h) => h.id !== m.id && h.cod_medico !== m.cod_medico);
    if (candidatas.length === 0) continue;

    const puntaje = (h: PrestacionConSocio): number => {
      let s = 0;
      if (h.grupo_equipo_id === h.id) s += 4;
      if ((h.cod_clinica ?? null) === (m.cod_clinica ?? null)) s += 2;
      const mismoCodigo = h.codigo != null && h.codigo === m.codigo;
      const habilitaPediatra = m.tipo_prestador === "Pediatra" && h.codigo != null && CODIGOS_CON_PEDIATRA.has(h.codigo);
      if (mismoCodigo || habilitaPediatra) s += 2;
      return s;
    };
    // Distancia de id: las anteriores al integrante (la cabeza se carga primero) empatan mejor.
    const distancia = (h: PrestacionConSocio): number => (h.id < m.id ? m.id - h.id : (h.id - m.id) * 1_000_000);
    const mejor = candidatas.reduce((a, b) => {
      const d = puntaje(b) - puntaje(a);
      if (d !== 0) return d > 0 ? b : a;
      return distancia(b) < distancia(a) ? b : a;
    });
    out.set(m.id, mejor.id);
  }
  return out;
}
