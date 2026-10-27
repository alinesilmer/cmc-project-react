import { BriefcaseMedical } from "lucide-react";
import styles from "../DoctorProfilePage.module.scss";
import Copiable from "./Copiable";
import { fmt } from "./legajo.helpers";
import type { SeccionProps } from "./SeccionProps";

export default function SeccionProfesionales({ data, readOnly, isEditing, campos, reportar, tituloSeccion, seccionAbierta }: SeccionProps) {
  const { RText } = campos;
  return (
    <>
            {tituloSeccion(
              "profesionales",
              BriefcaseMedical,
              "Datos profesionales",
              { marginTop: 24 },
            )}
            <div
              className={`${styles.infoGrid} ${
                seccionAbierta("profesionales") ? "" : styles.mpCerrada
              }`}
            >
              <div>
                <span className={styles.label}>Nº socio</span>
                {isEditing ? (
                  RText("nro_socio")
                ) : (
                  <Copiable label="Nº socio" value={data.nro_socio} enabled={!readOnly}>
                    {fmt(data.nro_socio)}
                  </Copiable>
                )}
              </div>
              <div>
                <span className={styles.label}>Categoría</span>
                {isEditing ? (
                  RText("categoria")
                ) : (
                  <span>{fmt(data.categoria)}</span>
                )}
              </div>
              <div>
                <span className={styles.label}>Título</span>
                {isEditing ? (
                  RText("titulo")
                ) : (
                  <span>{fmt(data.titulo)}</span>
                )}
              </div>
              <div>
                <span className={styles.label}>Matrícula prov.</span>
                {isEditing ? (
                  RText("matricula_prov")
                ) : (
                  <Copiable label="Matrícula provincial" value={data.matricula_prov} enabled={!readOnly}>
                    {fmt(data.matricula_prov)}
                  </Copiable>
                )}
              </div>
              <div>
                <span className={styles.label}>Matrícula nac.</span>
                {isEditing ? (
                  RText("matricula_nac")
                ) : (
                  <Copiable label="Matrícula nacional" value={data.matricula_nac} enabled={!readOnly}>
                    {fmt(data.matricula_nac)}
                  </Copiable>
                )}
              </div>
              <div>
                <span className={styles.label}>Fecha recibido</span>
                {isEditing ? (
                  RText("fecha_recibido")
                ) : (
                  <span>{fmt(data.fecha_recibido)}</span>
                )}
              </div>
              <div>
                <span className={styles.label}>Fecha matrícula</span>
                {isEditing ? (
                  RText("fecha_matricula")
                ) : (
                  <span>{fmt(data.fecha_matricula)}</span>
                )}
              </div>
              <div>
                <span className={styles.label}>
                  Domicilio de consulta
                  {reportar("domicilio", "Domicilio de consulta", data.domicilio_consulta)}
                </span>
              </div>
              <div>
                {isEditing ? (
                  RText("domicilio_consulta")
                ) : (
                  <Copiable label="Domicilio de consulta" value={data.domicilio_consulta} enabled={!readOnly}>
                    {fmt(data.domicilio_consulta)}
                  </Copiable>
                )}
              </div>
              <div>
                <span className={styles.label}>
                  Tel. consulta
                  {reportar("telefono", "Tel. consulta", data.telefono_consulta)}
                </span>
                {isEditing ? (
                  RText("telefono_consulta")
                ) : (
                  <Copiable label="Teléfono de consulta" value={data.telefono_consulta} enabled={!readOnly}>
                    {fmt(data.telefono_consulta)}
                  </Copiable>
                )}
              </div>
            </div>
    </>
  );
}
