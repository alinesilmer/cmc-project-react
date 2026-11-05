import { Landmark } from "lucide-react";
import { usePermisos } from "@/app/auth/usePermisos";
import styles from "../DoctorProfilePage.module.scss";
import Copiable from "./Copiable";
import { fmt, soloDigitos } from "./legajo.helpers";
import type { SeccionProps } from "./SeccionProps";
import { esCbuValido, etiquetaMedioCobro } from "@/app/shared/lib/cbu";

export default function SeccionImpositivos({ data, readOnly, isEditing, campos, tituloSeccion, seccionAbierta }: SeccionProps) {
  const { can } = usePermisos();
  const { RText, RNumber, RCondicion_impositiva, RDate, RCbu, RMedioCobro } = campos;
  const editaCobro = isEditing && can("medico:editar_bancario");
  return (
    <>
            {tituloSeccion(
              "impositivos",
              Landmark,
              "Datos impositivos",
              { marginTop: 24 },
            )}
            <div
              className={`${styles.infoGrid} ${
                seccionAbierta("impositivos") ? "" : styles.mpCerrada
              }`}
            >
              <div>
                <span className={styles.label}>
                  Condición impositiva
                </span>
                {isEditing ? (
                  RCondicion_impositiva("condicion_impositiva")
                ) : (
                  <span>
                    {fmt(data.condicion_impositiva)}
                  </span>
                )}
              </div>
              <div>
                <span className={styles.label}>ANSSAL</span>
                {isEditing ? (
                  RNumber("anssal")
                ) : (
                  <span>{fmt(data.anssal)}</span>
                )}
              </div>
              <div>
                <span className={styles.label}>Venc. ANSSAL</span>
                {isEditing ? (
                  RDate("vencimiento_anssal")
                ) : (
                  <span>{fmt(data.vencimiento_anssal)}</span>
                )}
              </div>
              <div>
                <span className={styles.label}>Malapraxis</span>
                {isEditing ? (
                  RText("malapraxis")
                ) : (
                  <span>{fmt(data.malapraxis)}</span>
                )}
              </div>
              <div>
                <span className={styles.label}>
                  Venc. malapraxis
                </span>
                {isEditing ? (
                  RDate("vencimiento_malapraxis")
                ) : (
                  <span>
                    {fmt(data.vencimiento_malapraxis)}
                  </span>
                )}
              </div>
              <div>
                <span className={styles.label}>Cobertura</span>
                {isEditing ? (
                  RNumber("cobertura")
                ) : (
                  <span>{fmt(data.cobertura)}</span>
                )}
              </div>
              <div>
                <span className={styles.label}>Venc. cobertura</span>
                {isEditing ? (
                  RDate("vencimiento_cobertura")
                ) : (
                  <span>
                    {fmt(data.vencimiento_cobertura)}
                  </span>
                )}
              </div>
              {/* Cobro: es lo contra lo que se pagan las liquidaciones. Gate propio, independiente de medico:editar. */}
              <div>
                <span className={styles.label}>Cobra por</span>
                {editaCobro ? RMedioCobro() : <span>{etiquetaMedioCobro(data.medio_cobro)}</span>}
              </div>
              <div>
                <span className={styles.label}>CBU Santander</span>
                {editaCobro ? (
                  RCbu("cbu_santander", "santander")
                ) : (
                  <Copiable label="CBU Santander" value={data.cbu_santander} copy={soloDigitos(data.cbu_santander)} enabled={!readOnly}>
                    {fmt(data.cbu_santander)}
                  </Copiable>
                )}
              </div>
              <div>
                <span className={styles.label}>CBU otro banco</span>
                {editaCobro ? (
                  RCbu("cbu_otro_banco", "otro")
                ) : (
                  <>
                    <Copiable label="CBU otro banco" value={data.cbu_otro_banco} copy={soloDigitos(data.cbu_otro_banco)} enabled={!readOnly}>
                      {fmt(data.cbu_otro_banco)}
                    </Copiable>
                    {/* Valores del sistema anterior que no son un CBU (cuenta de 10 dígitos, etc.): se conservan, pero no se pueden usar para pagar. */}
                    {data.cbu_otro_banco && !esCbuValido(data.cbu_otro_banco) && !readOnly && (
                      <small className={styles.errorInline}>No es un CBU válido: no se puede usar para transferir.</small>
                    )}
                  </>
                )}
              </div>
              {/* Apunte interno del Colegio sobre el médico: no le corresponde verlo a él, sólo al personal que lo carga. */}
              {!readOnly && (
                <div>
                  <span className={styles.label}>Observación</span>
                  {isEditing ? (
                    RText("observacion")
                  ) : (
                    <span>{fmt(data.observacion)}</span>
                  )}
                </div>
              )}
            </div>
    </>
  );
}
