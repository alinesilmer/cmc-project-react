import { Landmark } from "lucide-react";
import { usePermisos } from "@/app/auth/usePermisos";
import styles from "../DoctorProfilePage.module.scss";
import Copiable from "./Copiable";
import { fmt, soloDigitos } from "./legajo.helpers";
import type { SeccionProps } from "./SeccionProps";

export default function SeccionImpositivos({ data, readOnly, isEditing, campos, tituloSeccion, seccionAbierta }: SeccionProps) {
  const { can } = usePermisos();
  const { RText, RNumber, RCondicion_impositiva, RDate } = campos;
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
              <div>
                <span className={styles.label}>CBU</span>
                {/* Es el campo contra el que se pagan las liquidaciones: gate propio, independiente de medico:editar. */}
                {isEditing && can("medico:editar_bancario") ? (
                  RText("cbu")
                ) : (
                  <Copiable label="CBU" value={data.cbu} copy={soloDigitos(data.cbu)} enabled={!readOnly}>
                    {fmt(data.cbu)}
                  </Copiable>
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
