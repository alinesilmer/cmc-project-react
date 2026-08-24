// Registro de deuda de una obra social: fecha, monto y estado, más la factura.
//
// El monto viaja como string, no como number: es un DECIMAL(14,2) del lado del
// servidor y el `number` de JS pierde centavos en cifras grandes. Se convierte
// sólo para mostrar.

export type EstadoPago = "pendiente" | "parcial" | "pagado";

export interface PagoOS {
  id: number;
  obra_social_id: number;
  /** `YYYY-MM-DD`. */
  fecha: string;
  monto: string;
  estado: EstadoPago;
  /** URL autorizada del adjunto (`/api/archivos/…`), o `null`. */
  factura_url?: string | null;
  factura_nombre?: string | null;
  created_at?: string | null;
}

export interface ResumenPagosOS {
  total: string;
  /** Lo que sigue sin saldarse: `pendiente` y `parcial`. */
  adeudado: string;
  pagado: string;
  /** Cuántas filas no están en `pagado`. */
  pendientes: number;
}

export interface PagosPageOS {
  items: PagoOS[];
  resumen: ResumenPagosOS;
}

/** Sin la factura: se sube por su propio endpoint. */
export interface PagoInput {
  fecha: string;
  monto: string;
  estado: EstadoPago;
}

// ── Presentación ─────────────────────────────────────────────────────────────

export const ESTADOS: { valor: EstadoPago; label: string }[] = [
  { valor: "pendiente", label: "Pendiente" },
  { valor: "parcial", label: "Parcial" },
  { valor: "pagado", label: "Pagado" },
];

export const COLOR_ESTADO: Record<EstadoPago, string> = {
  pendiente: "#cc2a2a",
  parcial: "#f59e0b",
  pagado: "#1d9148",
};

export const LABEL_ESTADO: Record<EstadoPago, string> = {
  pendiente: "Pendiente",
  parcial: "Parcial",
  pagado: "Pagado",
};

const money = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** `"1250000.50"` → `$ 1.250.000,50`. */
export function formatMonto(valor?: string | null): string {
  const n = parseFloat(valor ?? "");
  return isNaN(n) ? "—" : money.format(n);
}
