import { useEffect, useState } from "react";
import { Check, X } from "lucide-react";
import BotonPlano from "@/app/components/ui/BotonPlano/BotonPlano";
import styles from "../DoctorProfilePage.module.scss";

export type TipoImporte = "porcentaje" | "monto";
export type ImportePropioValor = { tipo: TipoImporte; valor: string };

/** Importe propio del socio en un concepto (reemplaza al porcentaje o al precio del concepto). */
export default function ImportePropio({
  porcentajePropio,
  montoPropio,
  delConcepto,
  disabled,
  onGuardar,
  onCambio,
}: {
  porcentajePropio?: number | null;
  montoPropio?: number | null;
  /** Lo que rige sin importe propio, ya formateado (ver textoDelConcepto). */
  delConcepto?: string;
  disabled?: boolean;
  /** Fila existente: se guarda con el botón. null = quitar el importe propio. */
  onGuardar?: (v: ImportePropioValor | null) => void;
  /** Fila nueva: avisa cada cambio, no hay botón de guardar. */
  onCambio?: (v: ImportePropioValor | null) => void;
}) {
  const inicial: ImportePropioValor | null =
    porcentajePropio != null
      ? { tipo: "porcentaje", valor: String(porcentajePropio) }
      : montoPropio != null
        ? { tipo: "monto", valor: String(montoPropio) }
        : null;

  const [tipo, setTipo] = useState<TipoImporte>(inicial?.tipo ?? "porcentaje");
  const [valor, setValor] = useState<string>(inicial?.valor ?? "");

  // Si el dato cambia desde afuera (se guardó, se recargó la lista), el borrador lo sigue.
  useEffect(() => {
    setTipo(inicial?.tipo ?? "porcentaje");
    setValor(inicial?.valor ?? "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [porcentajePropio, montoPropio]);

  const numero = valor.trim() === "" ? null : Number(valor.replace(",", "."));
  const invalido = numero !== null && (!Number.isFinite(numero) || numero <= 0 || (tipo === "porcentaje" && numero > 100));
  const sucio = (inicial?.tipo ?? tipo) !== tipo || (inicial?.valor ?? "") !== valor;

  const emitir = (t: TipoImporte, v: string) => {
    const n = v.trim() === "" ? null : Number(v.replace(",", "."));
    const ok = n !== null && Number.isFinite(n) && n > 0 && !(t === "porcentaje" && n > 100);
    onCambio?.(ok ? { tipo: t, valor: String(n) } : null);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
        <input
          className={styles.input}
          style={{ width: "7rem", ...(invalido ? { borderColor: "#c0392b" } : {}) }}
          type="text"
          inputMode="decimal"
          placeholder={delConcepto ?? "del concepto"}
          value={valor}
          disabled={disabled}
          aria-label="Importe propio"
          onChange={(e) => {
            setValor(e.target.value);
            emitir(tipo, e.target.value);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && onGuardar && sucio && !invalido && numero !== null) {
              onGuardar({ tipo, valor: String(numero) });
            }
          }}
        />
        <select
          className={styles.select}
          style={{ width: "4rem" }}
          value={tipo}
          disabled={disabled}
          aria-label="Tipo de importe"
          onChange={(e) => {
            const t = e.target.value as TipoImporte;
            setTipo(t);
            emitir(t, valor);
          }}
        >
          <option value="porcentaje">%</option>
          <option value="monto">$</option>
        </select>
        {onGuardar && sucio && (
          <BotonPlano
            className={styles.iconButton}
            title="Guardar importe propio"
            disabled={disabled || invalido || numero === null}
            onClick={() => numero !== null && onGuardar({ tipo, valor: String(numero) })}
          >
            <Check size={15} />
          </BotonPlano>
        )}
        {onGuardar && inicial && (
          <BotonPlano
            className={styles.iconButton}
            title="Quitar el importe propio (rige el del concepto)"
            disabled={disabled}
            onClick={() => onGuardar(null)}
          >
            <X size={15} />
          </BotonPlano>
        )}
      </div>
      <span className={styles.muted} style={{ fontSize: "0.75rem" }}>
        {inicial ? `Propio. Concepto: ${delConcepto ?? "—"}` : `Del concepto: ${delConcepto ?? "—"}`}
      </span>
    </div>
  );
}
