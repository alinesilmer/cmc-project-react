import { User } from "lucide-react";
import styles from "../DoctorProfilePage.module.scss";
import { ETIQUETA_ESTADO_CUENTA } from "../api";
import Copiable from "./Copiable";
import { fmt, fmtDate, getFechaIngreso, soloDigitos } from "./legajo.helpers";
import type { SeccionProps } from "./SeccionProps";

/** `estado_cuenta_at` viene en UTC sin zona: se le agrega para mostrar el día local. */
const fechaDeBaja = (s?: string | null) =>
  s && !/(Z|[+-]\d\d:?\d\d)$/i.test(s) ? `${s}Z` : s;

export default function SeccionPersonales({ data, readOnly, isEditing, campos, reportar, tituloSeccion, seccionAbierta }: SeccionProps) {
  const { RText, RSexo, RDate, RCheck, RMotivoBaja } = campos;
  // Fallecido y baja son datos del Colegio: el médico en «Mi perfil» no los ve.
  const verBaja = !readOnly || isEditing;
  return (
    <>
            {tituloSeccion("personales", User, "Datos personales")}
            <div
              className={`${styles.infoGrid} ${
                seccionAbierta("personales") ? "" : styles.mpCerrada
              }`}
            >
              <div>
                <span className={styles.label}>
                  Nombre (registro)
                </span>
                {isEditing ? (
                  RText("name")
                ) : (
                  <span>{fmt(data.name)}</span>
                )}
              </div>
              <div>
                <span className={styles.label}>Nombre</span>
                {isEditing ? (
                  RText("nombre_")
                ) : (
                  <span>{fmt(data.nombre_)}</span>
                )}
              </div>
              <div>
                <span className={styles.label}>Apellido</span>
                {isEditing ? (
                  RText("apellido")
                ) : (
                  <span>{fmt(data.apellido)}</span>
                )}
              </div>
              <div>
                <span className={styles.label}>Sexo</span>
                {isEditing ? (
                  RSexo("sexo")
                ) : (
                  <span>{fmt(data.sexo)}</span>
                )}
              </div>
              <div>
                <span className={styles.label}>Documento</span>
                {isEditing ? (
                  RText("documento")
                ) : (
                  <Copiable label="Documento" value={data.documento} enabled={!readOnly}>
                    {fmt(data.documento)}
                  </Copiable>
                )}
              </div>
              <div>
                <span className={styles.label}>CUIT</span>
                {isEditing ? (
                  RText("cuit")
                ) : (
                  <Copiable label="CUIT" value={data.cuit} copy={soloDigitos(data.cuit)} enabled={!readOnly}>
                    {fmt(data.cuit)}
                  </Copiable>
                )}
              </div>
              <div>
                <span className={styles.label}>
                  Fecha de nacimiento
                </span>
                {isEditing ? (
                  RDate("fecha_nac")
                ) : (
                  <span>{fmtDate(data.fecha_nac)}</span>
                )}
              </div>
              <div>
                <span className={styles.label}>Estado</span>
                <span>
                  {data.estado_cuenta
                    ? ETIQUETA_ESTADO_CUENTA[data.estado_cuenta]
                    : "—"}
                </span>
              </div>
              {verBaja && (
              <>
              <div>
                <span className={styles.label}>Fallecido</span>
                {isEditing ? (
                  RCheck("fallecido", "Sí")
                ) : (
                  <span>{data.fallecido ? "Sí" : "No"}</span>
                )}
              </div>
              {data.estado_cuenta === "baja" && (
                <>
                  <div>
                    <span className={styles.label}>Fecha de baja</span>
                    <span>{fmtDate(fechaDeBaja(data.estado_cuenta_at))}</span>
                  </div>
                  <div>
                    <span className={styles.label}>Motivo de Baja</span>
                    {isEditing ? (
                      RMotivoBaja()
                    ) : (
                      <span>{fmt(data.motivo_baja)}</span>
                    )}
                  </div>
                </>
              )}
              </>
              )}

              <div>
                <span className={styles.label}>Provincia</span>
                {isEditing ? (
                  RText("provincia")
                ) : (
                  <span>{fmt(data.provincia)}</span>
                )}
              </div>
              <div>
                <span className={styles.label}>Localidad</span>
                {isEditing ? (
                  RText("localidad")
                ) : (
                  <span>{fmt(data.localidad)}</span>
                )}
              </div>
              <div>
                <span className={styles.label}>Código postal</span>
                {isEditing ? (
                  RText("codigo_postal")
                ) : (
                  <span>{fmt(data.codigo_postal)}</span>
                )}
              </div>

              <div>
                <span className={styles.label}>
                  Domicilio particular
                  {reportar("domicilio", "Domicilio particular", data.domicilio_particular)}
                </span>
                {isEditing ? (
                  RText("domicilio_particular")
                ) : (
                  <Copiable label="Domicilio" value={data.domicilio_particular} enabled={!readOnly}>
                    {fmt(data.domicilio_particular)}
                  </Copiable>
                )}
              </div>
              <div>
                <span className={styles.label}>
                  Tel. particular
                  {reportar("telefono", "Tel. particular", data.tele_particular)}
                </span>
                {isEditing ? (
                  RText("tele_particular")
                ) : (
                  <Copiable label="Teléfono" value={data.tele_particular} enabled={!readOnly}>
                    {fmt(data.tele_particular)}
                  </Copiable>
                )}
              </div>
              <div>
                <span className={styles.label}>
                  Celular particular
                  {reportar("telefono", "Celular particular", data.celular_particular)}
                </span>
                {isEditing ? (
                  RText("celular_particular")
                ) : (
                  <Copiable label="Celular" value={data.celular_particular} enabled={!readOnly}>
                    {fmt(data.celular_particular)}
                  </Copiable>
                )}
              </div>

              <div>
                <span className={styles.label}>
                  E-mail particular
                  {reportar("email", "E-mail particular", data.mail_particular)}
                </span>
                {isEditing ? (
                  RText("mail_particular")
                ) : (
                  <Copiable label="E-mail" value={data.mail_particular} enabled={!readOnly}>
                    <a
                      className={styles.link}
                      href={
                        data.mail_particular
                          ? `mailto:${data.mail_particular}`
                          : undefined
                      }
                    >
                      {fmt(data.mail_particular)}
                    </a>
                  </Copiable>
                )}
              </div>

              <div>
                <span className={styles.label}>
                  Fecha de Ingreso
                </span>
                {isEditing ? (
                  RDate("fecha_ingreso")
                ) : (
                  <span>{fmtDate(getFechaIngreso(data))}</span>
                )}
              </div>
            </div>
    </>
  );
}
