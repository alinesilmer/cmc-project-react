import { useMemo } from "react";
import styles from "./NomencladorPorOS.module.scss";
import type { GalenoOut, ComponentesNNSugeridos, NomencladorDeCodigoOut } from "../nomenclador.types";
import { parseMonto } from "../nomenclador.helpers";
import { formatoPesos } from "@/app/shared/lib/formatos";
import type { ComoFactura } from "./porOS.types";
import { COMO_FACTURA } from "./porOS.helpers";
import Tabla from "@/app/components/ui/Tabla/Tabla";

export function ComoSeFactura({
  idBase = "como",
  valor,
  slug,
  opciones,
  cargandoOpciones,
  calculo,
  calculando,
  error,
  galenos,
  onCambiar,
  onSlug,
}: {
  /** Distingue los grupos de radios y los selects si hay más de uno en pantalla. */
  idBase?: string;
  valor: ComoFactura;
  slug: string;
  opciones: NomencladorDeCodigoOut[];
  cargandoOpciones: boolean;
  calculo: ComponentesNNSugeridos | null;
  calculando: boolean;
  error?: string;
  galenos: GalenoOut[];
  onCambiar: (c: ComoFactura) => void;
  onSlug: (slug: string) => void;
}) {
  const galenoPorId = useMemo(() => new Map(galenos.map((g) => [g.id, g])), [galenos]);
  const filas = (calculo?.disponible ? calculo.componentes : []).map((c) => {
    const g = galenoPorId.get(c.galeno_id);
    const cantidad = Number(c.cantidad);
    return { ...c, cantidad, subtotal: g ? parseMonto(g.valor_unitario) * cantidad : null, vu: g ? parseMonto(g.valor_unitario) : null };
  });
  const total = filas.reduce((a, f) => a + (f.subtotal ?? 0), 0);

  return (
    <div className={styles.comoFactura}>
      <span className={styles.formLabel}>Cómo se factura</span>
      <div className={styles.comoFacturaOpciones} role="radiogroup" aria-label="Cómo se factura">
        {COMO_FACTURA.map((o) => (
          <label key={o.id} className={`${styles.comoFacturaOpcion} ${valor === o.id ? styles.comoFacturaOn : ""}`}>
            <input
              type="radio"
              name={`${idBase}-factura`}
              checked={valor === o.id}
              disabled={o.id === "nomenclador" && !cargandoOpciones && opciones.length === 0}
              onChange={() => onCambiar(o.id)}
            />
            <strong>{o.titulo}</strong>
            <span>{o.texto}</span>
          </label>
        ))}
      </div>
      {valor !== "nomenclador" && !cargandoOpciones && opciones.length === 0 && (
        <span className={styles.hintText}>Este código no pertenece a ningún nomenclador nivelado.</span>
      )}
      {valor === "nomenclador" && (
        <>
          <div className={styles.formGroup}>
            <label className={styles.formLabel} htmlFor={`${idBase}-nom`}>Nomenclador *</label>
            <select id={`${idBase}-nom`} className={styles.formSelect} value={slug} onChange={(e) => onSlug(e.target.value)}>
              {opciones.map((n) => (
                <option key={n.slug} value={n.slug}>{n.nombre}</option>
              ))}
            </select>
          </div>
          {calculando ? (
            <span className={styles.hintText}>Calculando…</span>
          ) : calculo && !calculo.disponible ? (
            <span className={styles.errorMsg}>{calculo.motivo}</span>
          ) : calculo ? (
            <div className={styles.calculoNom}>
              <div className={styles.calculoNomCab}>
                <strong>Cálculo</strong>
                <span className={styles.hintText}>
                  Sólo lectura · sale del nomenclador{calculo.nivel != null ? ` · nivel ${calculo.nivel}` : ""}
                  {calculo.precio_por_nivel ? " · precio fijo por nivel" : ""}
                </span>
              </div>
              <Tabla className={styles.calculoNomTabla}>
                <thead><tr><th>Componente</th><th>Unidades</th><th>Galeno</th><th>Subtotal</th></tr></thead>
                <tbody>
                  {filas.map((f) => (
                    <tr key={f.concepto}>
                      <td>{f.concepto}</td>
                      <td>{f.cantidad}</td>
                      <td>{f.galeno_nombre}{f.vu != null ? ` · ${formatoPesos.format(f.vu)}` : ""}</td>
                      <td>{f.subtotal != null ? formatoPesos.format(f.subtotal) : "—"}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot><tr><td colSpan={3}>Total estimado</td><td><strong>{formatoPesos.format(total)}</strong></td></tr></tfoot>
              </Tabla>
              <span className={styles.hintText}>Si cambia el galeno o la escala, este valor se recalcula al aplicar el nomenclador.</span>
            </div>
          ) : error ? (
            <span className={styles.errorMsg}>{error}</span>
          ) : null}
        </>
      )}
    </div>
  );
}
