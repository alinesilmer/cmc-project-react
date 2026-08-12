import { memo } from "react";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";

import styles from "./consulta.module.scss";
import type { TablaValorItem } from "../nomenclador.types";

const money = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

// Todo Valor tiene siempre los 3 conceptos (Honorarios/Gastos/Ayudante) y todos
// suman al precio_total: no existen componentes opcionales.
function findComp(componentes: TablaValorItem["componentes"], concepto: string) {
  return componentes.find(
    (c) => c.concepto.toLowerCase() === concepto.toLowerCase(),
  );
}

function LedgerRow({ label, subtotal }: { label: string; subtotal: string }) {
  const value = parseFloat(subtotal);
  return (
    <div className={styles.ledRow}>
      <span className={styles.ledLabel}>{label}</span>
      <span className={styles.ledDots} aria-hidden="true" />
      <span className={`${styles.ledVal} ${value === 0 ? styles.ledValZero : ""}`}>
        {money.format(value)}
      </span>
    </div>
  );
}

/**
 * The "boleta de valores": código + descripción, gold vigencia seal, and the
 * three concepts (Honorarios / Gastos / Ayudante) itemised with the same
 * weight — none of them is the headline, they are components of one value.
 * Pure presentation — receives an already-resolved TablaValorItem.
 */
type ResultRegisterProps = {
  result: TablaValorItem;
  /** Show the gold "Vigente desde" seal (consulta-valores: yes; consulta-precios: no). */
  showVigencia?: boolean;
  /** When set, shows a specialty eligibility chip. `valida === null` = still checking. */
  eligibility?: { nombre: string; valida: boolean | null } | null;
};

function ResultRegister({ result, showVigencia = true, eligibility = null }: ResultRegisterProps) {
  const honorarios = findComp(result.componentes, "Honorarios");
  const gastos = findComp(result.componentes, "Gastos");
  const ayudante = findComp(result.componentes, "Ayudante");
  const porPresupuesto = Boolean(result.por_presupuesto);

  return (
    <article className={styles.register}>
      <div className={styles.regHead}>
        <div className={styles.regHeadmain}>
          <h2 className={styles.regTitle}>{result.descripcion}</h2>
          {result.via_aplicada === "L" && (
            <div className={`${styles.eligibility} ${styles.eligOk}`}>
              Vía laparoscópica
            </div>
          )}
          {eligibility && (
            <div
              className={`${styles.eligibility} ${
                eligibility.valida === null
                  ? styles.eligPending
                  : eligibility.valida
                    ? styles.eligOk
                    : styles.eligNo
              }`}
            >
              {eligibility.valida === null ? (
                <>
                  <Loader2 size={13} className={styles.spin} /> {eligibility.nombre}: verificando…
                </>
              ) : eligibility.valida ? (
                <>
                  <CheckCircle2 size={13} /> {eligibility.nombre}: habilitada
                </>
              ) : (
                <>
                  <XCircle size={13} /> {eligibility.nombre}: no habilitada
                </>
              )}
            </div>
          )}
        </div>
        {showVigencia && (
          <div className={styles.seal}>
            <span className={styles.sealK}>Vigente desde</span>
            <span className={styles.sealV}>{result.vigencia_desde}</span>
          </div>
        )}
      </div>

      <div className={styles.regRuler} aria-hidden="true" />

      {porPresupuesto ? (
        <div className={styles.total}>
          <span className={styles.totalLabel}>Valor Honorario</span>
          <span className={`${styles.totalValue} ${styles.totalPresupuesto}`}>
            POR PRESUPUESTO
          </span>
        </div>
      ) : (
        /* Los tres conceptos se listan igual. Antes Honorarios iba aparte como
           bloque destacado, con tipografía enorme y fondo propio: eso lo hacía
           parecer de otra naturaleza que Gastos y Ayudante, cuando los tres son
           componentes del mismo valor. */
        <div className={styles.ledger}>
          <div className={styles.ledgerCap}>Conceptos</div>
          {honorarios && <LedgerRow label="Honorarios" subtotal={honorarios.subtotal} />}
          {gastos && <LedgerRow label="Gastos" subtotal={gastos.subtotal} />}
          {ayudante && <LedgerRow label="Ayudante" subtotal={ayudante.subtotal} />}
        </div>
      )}
    </article>
  );
}

export default memo(ResultRegister);
