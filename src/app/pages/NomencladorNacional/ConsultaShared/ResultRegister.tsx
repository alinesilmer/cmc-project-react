import { memo } from "react";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";

import styles from "./consulta.module.scss";
import { ORIGEN_LABELS, type TablaValorItem } from "../nomenclador.types";

// Unidades sin ceros de relleno: `17.5000` → `17,5`.
const unidades = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 4 });

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

/**
 * Una fila del ledger. Con `comp` muestra además de dónde sale el número:
 * `cantidad × valor unitario del galeno`, que es exactamente la cuenta que hace
 * el backend (`subtotal = cantidad × valor_unitario`). Sin eso, el importe es
 * un dato que hay que creer; con eso, se puede verificar.
 */
function LedgerRow({
  label,
  comp,
  showDesglose,
}: {
  label: string;
  comp: TablaValorItem["componentes"][number];
  showDesglose: boolean;
}) {
  const value = parseFloat(comp.subtotal);
  const cantidad = parseFloat(comp.cantidad);
  const unitario = parseFloat(comp.valor_unitario);
  // Con cantidad 0 (el caso típico de Ayudante) no hay cuenta que mostrar: el
  // "0 × algo" es ruido, el importe en cero ya lo dice.
  const hayCuenta = showDesglose && cantidad > 0 && !isNaN(unitario);

  return (
    <div className={styles.ledRow}>
      <span className={styles.ledLabel}>
        {label}
        {hayCuenta && (
          <span className={styles.ledCuenta}>
            {unidades.format(cantidad)} × {money.format(unitario)}
            {comp.galeno_nivel != null && ` · nivel ${comp.galeno_nivel}`}
          </span>
        )}
      </span>
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
  /**
   * Muestra de dónde sale cada importe: el nomenclador que ganó y la cuenta
   * `cantidad × unitario` de cada concepto. Va en consulta-valores, que es la
   * pantalla de auditoría del convenio; consulta-precios es la consulta rápida
   * del médico y ahí el desglose sería ruido.
   */
  showDesglose?: boolean;
};

function ResultRegister({
  result,
  showVigencia = true,
  eligibility = null,
  showDesglose = false,
}: ResultRegisterProps) {
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
          <div className={styles.ledgerCap}>
            Conceptos
            {showDesglose && (
              <span className={styles.ledgerOrigen}>
                {ORIGEN_LABELS[result.origen]}
                {result.nivel != null && ` · nivel ${result.nivel}`}
              </span>
            )}
          </div>
          {honorarios && (
            <LedgerRow label="Honorarios" comp={honorarios} showDesglose={showDesglose} />
          )}
          {gastos && <LedgerRow label="Gastos" comp={gastos} showDesglose={showDesglose} />}
          {ayudante && (
            <LedgerRow label="Ayudante" comp={ayudante} showDesglose={showDesglose} />
          )}
        </div>
      )}
    </article>
  );
}

export default memo(ResultRegister);
