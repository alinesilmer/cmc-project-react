import React from "react";
import styles from "./ObrasSocialesSteps.module.scss";
import HelpButton from "../../../atoms/HelpButton/HelpButton";
import PdfUpload from "../../../atoms/PdfUpload/PdfUpload";
import type { ObrasSocialesFormData } from "../../../../types/obras-sociales";

type Props = {
  step: 1 | 2 | 3;
  formData: ObrasSocialesFormData;
  errors: Partial<Record<keyof ObrasSocialesFormData, string>>;
  provinces: string[];
  localities: string[];
  onChange: (field: keyof ObrasSocialesFormData, value: string | boolean) => void;
  getInputProps: (
    k: keyof ObrasSocialesFormData
  ) => React.InputHTMLAttributes<HTMLInputElement>;
  files: Record<string, File | null>;
  setFiles: React.Dispatch<React.SetStateAction<Record<string, File | null>>>;
  fileErrs: Record<string, string>;
  setFileErrs: React.Dispatch<React.SetStateAction<Record<string, string>>>;
};

const ObrasSocialesSteps: React.FC<Props> = (props) => {
  const {
    step,
    formData,
    errors,
    provinces,
    localities,
    onChange,
    getInputProps,
    setFiles,
    files,
    fileErrs,
    setFileErrs,
  } = props;

  const attach = (key: string, label: string) => (
    <PdfUpload
      key={key}
      label={label}
      value={files[key] ?? null}
      maxMb={20}
      onFileSelect={(f) => {
        setFiles((p) => ({ ...p, [key]: f }));
        setFileErrs((p) => ({ ...p, [key]: f ? "" : "Debe subir un archivo" }));
      }}
      onValidationError={(reason) => {
        setFileErrs((p) => ({
          ...p,
          [key]:
            reason === "type"
              ? "Archivo inválido (solo PDF o imagen)."
              : "El archivo excede 20MB.",
        }));
      }}
      error={fileErrs[key]}
    />
  );

  // -------------------- Step 1: Datos de la Obra Social --------------------
  if (step === 1)
    return (
      <div className={styles.stepContent}>
        <div className={styles.topTitle}>
          <h2>Datos de la Obra Social</h2>
          <HelpButton />
        </div>

        <div className={styles.formGrid}>
          <div className={`${styles.formGroup} ${styles.fullWidth}`}>
            <label>Razón Social *</label>
            <input
              type="text"
              value={formData.razonSocial}
              onChange={(e) => onChange("razonSocial", e.target.value)}
              className={errors.razonSocial ? styles.error : ""}
              placeholder="Nombre completo de la obra social"
            />
            {errors.razonSocial && (
              <span className={styles.errorText}>{errors.razonSocial}</span>
            )}
          </div>

          <div className={styles.formGroup}>
            <label>Nombre *</label>
            <input
              type="text"
              value={formData.nombreFantasia}
              onChange={(e) => onChange("nombreFantasia", e.target.value)}
              placeholder="Nombre comercial (opcional)"
            />
          </div>

          <div className={`${styles.formGroup} ${styles.withAttach}`}>
            <div>
              <label htmlFor="cuit">CUIT *</label>
              <input
                id="cuit"
                type="text"
                value={formData.cuit}
                onChange={(e) => onChange("cuit", e.target.value)}
                className={errors.cuit ? styles.error : ""}
                placeholder="XX-XXXXXXXX-X"
                {...getInputProps("cuit")}
              />
              {errors.cuit && (
                <span className={styles.errorText}>{errors.cuit}</span>
              )}
            </div>
            <div className={styles.attachCell}>
              {attach("cuitImg", "Adjuntar constancia CUIT")}
            </div>
          </div>

          <div className={styles.formGroup}>
            <label>RNE (Registro Nacional de Entidades) *</label>
            <input
              type="text"
              value={formData.rne}
              onChange={(e) => onChange("rne", e.target.value)}
              className={errors.rne ? styles.error : ""}
              placeholder="Número RNE"
            />
            {errors.rne && (
              <span className={styles.errorText}>{errors.rne}</span>
            )}
          </div>

          <div className={`${styles.formGroup} ${styles.fullWidth}`}>
            <label>Dirección Legal *</label>
            <input
              type="text"
              value={formData.direccionLegal}
              onChange={(e) => onChange("direccionLegal", e.target.value)}
              className={errors.direccionLegal ? styles.error : ""}
              placeholder="Calle, número, piso, departamento"
            />
            {errors.direccionLegal && (
              <span className={styles.errorText}>{errors.direccionLegal}</span>
            )}
          </div>

          <div className={styles.formGroup}>
            <label>Provincia *</label>
            <select
              value={formData.provincia}
              onChange={(e) => onChange("provincia", e.target.value)}
              className={errors.provincia ? styles.error : ""}
            >
              <option value="">Seleccionar...</option>
              {provinces.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
            {errors.provincia && (
              <span className={styles.errorText}>{errors.provincia}</span>
            )}
          </div>

          <div className={styles.formGroup}>
            <label>Localidad *</label>
            <select
              value={formData.localidad}
              onChange={(e) => onChange("localidad", e.target.value)}
              disabled={!formData.provincia}
              className={errors.localidad ? styles.error : ""}
            >
              <option value="">
                {formData.provincia
                  ? "Seleccionar..."
                  : "Seleccione una provincia primero"}
              </option>
              {localities.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
            {errors.localidad && (
              <span className={styles.errorText}>{errors.localidad}</span>
            )}
          </div>

          <div className={styles.formGroup}>
            <label>Código Postal *</label>
            <input
              type="text"
              value={formData.codigoPostal}
              onChange={(e) => onChange("codigoPostal", e.target.value)}
              placeholder="Ej: 3400"
            />
          </div>

          <div className={`${styles.formGroup} ${styles.fullWidth}`}>
            <label>Email Institucional *</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => onChange("email", e.target.value)}
              className={errors.email ? styles.error : ""}
              placeholder="contacto@obrasocial.com.ar"
            />
            {errors.email && (
              <span className={styles.errorText}>{errors.email}</span>
            )}
          </div>

          <div className={styles.formGroup}>
            <label>Teléfono Principal *</label>
            <input
              type="tel"
              value={formData.telefono}
              onChange={(e) => onChange("telefono", e.target.value)}
              className={errors.telefono ? styles.error : ""}
              placeholder="(0379) 442-3456"
              {...getInputProps("telefono")}
            />
            {errors.telefono && (
              <span className={styles.errorText}>{errors.telefono}</span>
            )}
          </div>

          <div className={styles.formGroup}>
            <label>Teléfono Alternativo</label>
            <input
              type="tel"
              value={formData.telefonoAlternativo}
              onChange={(e) => onChange("telefonoAlternativo", e.target.value)}
              placeholder="(0379) 15-123456"
            />
          </div>

          <div className={`${styles.formGroup} ${styles.fullWidth}`}>
            <label>Sitio Web</label>
            <input
              type="url"
              value={formData.sitioWeb}
              onChange={(e) => onChange("sitioWeb", e.target.value)}
              placeholder="https://www.obrasocial.com.ar"
            />
          </div>
        </div>
      </div>
    );

  // -------------------- Step 2: Datos del Representante Legal --------------------
  if (step === 2)
    return (
      <div className={styles.stepContent}>
        <div className={styles.topTitle}>
          <h2>Representante Legal</h2>
          <HelpButton />
        </div>

        <div className={styles.formGrid}>
          <div className={styles.formGroup}>
            <label>Nombre del Representante *</label>
            <input
              type="text"
              value={formData.representanteNombre}
              onChange={(e) => onChange("representanteNombre", e.target.value)}
              className={errors.representanteNombre ? styles.error : ""}
              placeholder="Nombre completo"
            />
            {errors.representanteNombre && (
              <span className={styles.errorText}>
                {errors.representanteNombre}
              </span>
            )}
          </div>

          <div className={styles.formGroup}>
            <label>Apellido del Representante *</label>
            <input
              type="text"
              value={formData.representanteApellido}
              onChange={(e) =>
                onChange("representanteApellido", e.target.value)
              }
              className={errors.representanteApellido ? styles.error : ""}
              placeholder="Apellido completo"
            />
            {errors.representanteApellido && (
              <span className={styles.errorText}>
                {errors.representanteApellido}
              </span>
            )}
          </div>

          <div className={`${styles.formGroup} ${styles.withAttach}`}>
            <div>
              <label htmlFor="representanteDNI">DNI del Representante *</label>
              <input
                id="representanteDNI"
                type="text"
                value={formData.representanteDNI}
                onChange={(e) => onChange("representanteDNI", e.target.value)}
                className={errors.representanteDNI ? styles.error : ""}
                placeholder="Sin puntos"
              />
              {errors.representanteDNI && (
                <span className={styles.errorText}>
                  {errors.representanteDNI}
                </span>
              )}
            </div>
            <div className={styles.attachCell}>
              {attach("representanteDNIImg", "Adjuntar DNI")}
            </div>
          </div>

          <div className={styles.formGroup}>
            <label>Cargo *</label>
            <input
              type="text"
              value={formData.representanteCargo}
              onChange={(e) => onChange("representanteCargo", e.target.value)}
              className={errors.representanteCargo ? styles.error : ""}
              placeholder="Ej: Director, Presidente, Gerente"
            />
            {errors.representanteCargo && (
              <span className={styles.errorText}>
                {errors.representanteCargo}
              </span>
            )}
          </div>

          <div className={`${styles.formGroup} ${styles.fullWidth}`}>
            <label>Email del Representante *</label>
            <input
              type="email"
              value={formData.representanteEmail}
              onChange={(e) => onChange("representanteEmail", e.target.value)}
              className={errors.representanteEmail ? styles.error : ""}
              placeholder="representante@obrasocial.com.ar"
            />
            {errors.representanteEmail && (
              <span className={styles.errorText}>
                {errors.representanteEmail}
              </span>
            )}
          </div>

          <div className={styles.formGroup}>
            <label>Teléfono del Representante *</label>
            <input
              type="tel"
              value={formData.representanteTelefono}
              onChange={(e) =>
                onChange("representanteTelefono", e.target.value)
              }
              className={errors.representanteTelefono ? styles.error : ""}
              placeholder="(0379) 15-123456"
              {...getInputProps("representanteTelefono")}
            />
            {errors.representanteTelefono && (
              <span className={styles.errorText}>
                {errors.representanteTelefono}
              </span>
            )}
          </div>

          <div className={`${styles.formGroup} ${styles.fullWidth} ${styles.withAttach}`}>
            <div>
              <label>Poder / Acta de Designación *</label>
              <p className={styles.hint}>
                Documento que acredite la representación legal
              </p>
            </div>
            <div className={styles.attachCell}>
              {attach("poderLegalImg", "Adjuntar poder o acta")}
            </div>
          </div>
        </div>
      </div>
    );

  // -------------------- Step 3: Documentación y Resumen --------------------
  return (
    <div className={styles.stepContent}>
      <div className={styles.topTitle}>
        <h2>Documentación y Resumen</h2>
        <HelpButton />
      </div>

      <div className={styles.formGrid}>
        <div className={`${styles.formGroup} ${styles.fullWidth} ${styles.withAttach}`}>
          <div>
            <label>Estatuto Social *</label>
            <p className={styles.hint}>
              Documento constitutivo de la obra social
            </p>
          </div>
          <div className={styles.attachCell}>
            {attach("estatutoImg", "Adjuntar estatuto")}
          </div>
        </div>

        <div className={`${styles.formGroup} ${styles.fullWidth} ${styles.withAttach}`}>
          <div>
            <label>Constancia de Inscripción SSS *</label>
            <p className={styles.hint}>
              Superintendencia de Servicios de Salud
            </p>
          </div>
          <div className={styles.attachCell}>
            {attach("sssImg", "Adjuntar constancia SSS")}
          </div>
        </div>

        <div className={`${styles.formGroup} ${styles.fullWidth} ${styles.withAttach}`}>
          <div>
            <label>Constancia AFIP</label>
            <p className={styles.hint}>
              Constancia de inscripción y situación fiscal
            </p>
          </div>
          <div className={styles.attachCell}>
            {attach("afipImg", "Adjuntar constancia AFIP")}
          </div>
        </div>

        <div className={`${styles.formGroup} ${styles.fullWidth}`}>
          <label>Cantidad Aproximada de Afiliados</label>
          <input
            type="number"
            value={formData.cantidadAfiliados}
            onChange={(e) => onChange("cantidadAfiliados", e.target.value)}
            placeholder="Ej: 5000"
            min="0"
          />
        </div>
      </div>

      <div className={styles.summarySection}>
        <h3>Resumen de la Solicitud</h3>
        <div className={styles.summaryGrid}>
          <div>
            <strong>Obra Social:</strong> {formData.razonSocial}
          </div>
          <div>
            <strong>CUIT:</strong> {formData.cuit}
          </div>
          <div>
            <strong>Provincia:</strong> {formData.provincia}
          </div>
          <div>
            <strong>Localidad:</strong> {formData.localidad}
          </div>
          <div>
            <strong>Email:</strong> {formData.email}
          </div>
          <div>
            <strong>Teléfono:</strong> {formData.telefono}
          </div>
          <div>
            <strong>Representante:</strong> {formData.representanteNombre}{" "}
            {formData.representanteApellido}
          </div>
          <div>
            <strong>Cargo:</strong> {formData.representanteCargo}
          </div>
        </div>
      </div>

      <div className={styles.formGroup}>
        <label>Observaciones</label>
        <textarea
          value={formData.observaciones}
          onChange={(e) => onChange("observaciones", e.target.value)}
          rows={4}
          placeholder="Ingrese cualquier información adicional o consulta..."
        />
      </div>

      <div className={styles.infoBox}>
        <h4>Próximos Pasos</h4>
        <p>
          Una vez enviada su solicitud, recibirá un email de confirmación en la
          casilla institucional proporcionada. Nuestro equipo administrativo
          revisará la documentación presentada.
        </p>
        <div className={styles.contactInfo}>
          <p>
            <strong>Contacto:</strong>
          </p>
          <p>📧 obrassociales@cmcorrientes.org.ar</p>
          <p>📞 (0379) 442-3456</p>
          <p>📍 Av. 3 de Abril 1234, Corrientes Capital</p>
        </div>
      </div>
    </div>
  );
};

export default ObrasSocialesSteps;
