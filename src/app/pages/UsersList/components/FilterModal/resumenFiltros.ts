import type { EspecialidadOption } from "@/app/shared/lib/especialidadesCatalog";
import type { FilterSelection } from "@/app/types/filters";
import { MISSING_FIELD_LABELS } from "@/app/types/filters";

/** Un filtro puesto, listo para mostrar: qué se filtra y por qué valor. */
export interface FiltroActivo {
  key: string;
  grupo: "Vencimientos" | "Filtros" | "Faltantes";
  rotulo: string;
  valor: string;
}

function nombreDeEspecialidad(val: string, especialidades: EspecialidadOption[]): string {
  if (val.startsWith("id:")) {
    const id = val.slice(3);
    return especialidades.find((o) => o.value === id)?.label ?? id;
  }
  return val;
}

/** Los filtros que están puestos en la selección. */
export function filtrosActivos(
  filters: FilterSelection,
  especialidades: EspecialidadOption[],
): FiltroActivo[] {
  const out: FiltroActivo[] = [];
  const { vencimientos: v, otros: o, faltantes: f } = filters;
  const venc = (key: string, rotulo: string, valor: string) =>
    out.push({ key, grupo: "Vencimientos", rotulo, valor });
  const otro = (key: string, rotulo: string, valor: string) =>
    out.push({ key, grupo: "Filtros", rotulo, valor });

  if (v.malapraxisVencida) venc("malapraxisVencida", "Mala praxis", "Vencida");
  if (v.malapraxisPorVencer) venc("malapraxisPorVencer", "Mala praxis", "Por vencer");
  if (v.anssalVencido) venc("anssalVencido", "ANSSAL", "Vencida");
  if (v.anssalPorVencer) venc("anssalPorVencer", "ANSSAL", "Por vencer");
  if (v.coberturaVencida) venc("coberturaVencida", "Cobertura", "Vencida");
  if (v.coberturaPorVencer) venc("coberturaPorVencer", "Cobertura", "Por vencer");
  if (v.dias > 0) venc("dias", "Vence en", `${v.dias} días`);
  if (v.fechaDesde) venc("fechaDesde", "Vence desde", v.fechaDesde);
  if (v.fechaHasta) venc("fechaHasta", "Vence hasta", v.fechaHasta);

  if (o.estado) otro("estado", "Estado", o.estado === "activo" ? "Activo" : "Inactivo");
  if (o.sexo) otro("sexo", "Sexo", o.sexo.toUpperCase());
  if (o.cuit) otro("cuit", "CUIT", o.cuit);
  if (o.provincia) otro("provincia", "Provincia", o.provincia);
  if (o.categoria) otro("categoria", "Categoría", o.categoria);
  if (o.condicionImpositiva) otro("condicionImpositiva", "Cond. impositiva", o.condicionImpositiva);
  if (o.especialidad)
    otro("especialidad", "Especialidad", nombreDeEspecialidad(o.especialidad, especialidades));
  if (o.adherente) otro("adherente", "Adherente", o.adherente === "si" ? "Sí" : "No");
  if (o.tieneMalapraxis)
    otro("tieneMalapraxis", "Mala praxis", o.tieneMalapraxis === "true" ? "Con" : "Sin");
  if (o.fechaIngresoDesde) otro("fechaIngresoDesde", "Ingreso desde", o.fechaIngresoDesde);
  if (o.fechaIngresoHasta) otro("fechaIngresoHasta", "Ingreso hasta", o.fechaIngresoHasta);

  if (f.enabled) {
    out.push({
      key: "faltantes",
      grupo: "Faltantes",
      rotulo: f.mode === "missing" ? "Sin" : "Con",
      valor: MISSING_FIELD_LABELS[f.field] ?? f.field,
    });
  }

  return out;
}
