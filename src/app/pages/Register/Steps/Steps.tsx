"use client";
import React from "react";
import styles from "./Steps.module.scss";
import HelpButton from "../../../components/atoms/HelpButton/HelpButton";
import PdfUpload from "../../../components/atoms/PdfUpload/PdfUpload";
import type { RegisterFormData } from "../../../types/register";

type Props = {
  step: 1 | 2 | 3 | 4;
  formData: RegisterFormData;
  errors: Partial<Record<keyof RegisterFormData, string>>;
  provinces: string[];
  localities: string[];
  specialties: string[];
  onChange: (field: keyof RegisterFormData, value: string | boolean) => void;
  getInputProps: (
    k: keyof RegisterFormData
  ) => React.InputHTMLAttributes<HTMLInputElement>;
  files: Record<string, File | null>;
  setFiles: React.Dispatch<React.SetStateAction<Record<string, File | null>>>;
  fileErrs: Record<string, string>;
  setFileErrs: React.Dispatch<React.SetStateAction<Record<string, string>>>;
};

const FieldWithAttach: React.FC<{
  label: string;
  htmlFor?: string;
  error?: string;
  children: React.ReactNode;
  attach: React.ReactNode;
}> = ({ label, htmlFor, error, children, attach }) => (
  <div className={`${styles.formGroup} ${styles.withAttach}`}>
    <div className={styles.labelRow}>
      <label htmlFor={htmlFor}>{label}</label>
    </div>
    <div className={styles.fieldRow}>
      <div className={styles.fieldGrow}>{children}</div>
      <div className={styles.attachCell}>{attach}</div>
    </div>
    {error && <span className={styles.errorText}>{error}</span>}
  </div>
);

const Steps: React.FC<Props> = ({
  step,
  formData,
  errors,
  provinces,
  localities,
  specialties,
  onChange,
  getInputProps,
  setFiles,
  fileErrs,
  setFileErrs,
}) => {
  const attach = (key: string, label: string) => (
    <PdfUpload
      label={label}
      onFileSelect={(f) => {
        setFiles((p) => ({ ...p, [key]: f }));
        setFileErrs((p) => ({ ...p, [key]: f ? "" : "Debe subir un archivo" }));
      }}
      onValidationError={(reason) => {
        setFileErrs((p) => ({
          ...p,
          [key]:
            reason === "type"
              ? "El archivo debe ser PDF."
              : "El archivo excede 10MB.",
        }));
      }}
      error={fileErrs[key]}
    />
  );

  if (step === 1)
    return (
      <div className={styles.stepContent}>
        <div className={styles.topTitle}>
          <h2>Datos Personales</h2>
          <HelpButton />
        </div>

        {/* <div className={styles.formGroup}>
          <label>Tipo de Documento *</label>
          <select
            value={formData.documentType}
            onChange={(e) => onChange("documentType", e.target.value)}
            className={errors.documentType ? styles.error : ""}
          >
            <option value="">Seleccionar...</option>
            {[
              "Documento Único",
              "Libreta de Enrolamiento",
              "Libreta Cívica",
              "Otro",
            ].map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          {errors.documentType && (
            <span className={styles.errorText}>{errors.documentType}</span>
          )}
        </div> */}

        <FieldWithAttach
          label="Número de Documento *"
          htmlFor="documentNumber"
          error={errors.documentNumber}
          attach={attach("docNumberImg", "Adjuntar documento")}
        >
          <input
            id="documentNumber"
            type="text"
            value={formData.documentNumber}
            onChange={(e) => onChange("documentNumber", e.target.value)}
            className={errors.documentNumber ? styles.error : ""}
            placeholder="Sin puntos"
            {...getInputProps("documentNumber")}
          />
        </FieldWithAttach>

        <div className={styles.formGroup}>
          <label>Nombre *</label>
          <input
            type="text"
            value={formData.firstName}
            onChange={(e) => onChange("firstName", e.target.value)}
            className={errors.firstName ? styles.error : ""}
          />
          {errors.firstName && (
            <span className={styles.errorText}>{errors.firstName}</span>
          )}
        </div>

        <div className={styles.formGroup}>
          <label>Apellido *</label>
          <input
            type="text"
            value={formData.lastName}
            onChange={(e) => onChange("lastName", e.target.value)}
            className={errors.lastName ? styles.error : ""}
          />
          {errors.lastName && (
            <span className={styles.errorText}>{errors.lastName}</span>
          )}
        </div>

        <div className={styles.formGroup}>
          <label>Sexo *</label>
          <select
            value={formData.gender}
            onChange={(e) => onChange("gender", e.target.value)}
            className={errors.gender ? styles.error : ""}
          >
            <option value="">Seleccionar...</option>
            <option value="F">Femenino</option>
            <option value="M">Masculino</option>
          </select>
          {errors.gender && (
            <span className={styles.errorText}>{errors.gender}</span>
          )}
        </div>

        <div className={styles.formGroup}>
          <label>Fecha de Nacimiento *</label>
          <input
            type="date"
            value={formData.birthDate}
            onChange={(e) => onChange("birthDate", e.target.value)}
            className={errors.birthDate ? styles.error : ""}
          />
          {errors.birthDate && (
            <span className={styles.errorText}>{errors.birthDate}</span>
          )}
        </div>

        <div className={styles.formGroup}>
          <label>Provincia *</label>
          <select
            value={formData.province}
            onChange={(e) => onChange("province", e.target.value)}
          >
            <option value="">Seleccionar...</option>
            {provinces.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.formGroup}>
          <label>Localidad *</label>
          <select
            value={formData.locality}
            onChange={(e) => onChange("locality", e.target.value)}
            disabled={!formData.province}
          >
            <option value="">
              {formData.province
                ? "Seleccionar..."
                : "Seleccione una provincia primero"}
            </option>
            {localities.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.formGroup}>
          <label>Código Postal *</label>
          <input
            type="text"
            value={formData.postalCode}
            onChange={(e) => onChange("postalCode", e.target.value)}
            placeholder="Ej: 3400"
          />
        </div>

        <div className={`${styles.formGroup} ${styles.fullWidth}`}>
          <label>Domicilio Particular *</label>
          <input
            type="text"
            value={formData.address}
            onChange={(e) => onChange("address", e.target.value)}
            placeholder="Calle, número, piso, departamento"
          />
          {errors.address && (
            <span className={styles.errorText}>{errors.address}</span>
          )}
        </div>

        <div className={`${styles.formGroup} ${styles.fullWidth}`}>
          <label>Email Particular *</label>
          <input
            type="email"
            value={formData.email}
            onChange={(e) => onChange("email", e.target.value)}
            className={errors.email ? styles.error : ""}
            placeholder="ejemplo@correo.com"
          />
          {errors.email && (
            <span className={styles.errorText}>{errors.email}</span>
          )}
        </div>

        <div className={styles.formGroup}>
          <label>Teléfono Particular *</label>
          <input
            type="tel"
            value={formData.phone}
            onChange={(e) => onChange("phone", e.target.value)}
            placeholder="(0379) 442-3456"
            {...getInputProps("phone")}
            className={errors.phone ? styles.error : ""}
          />
          {errors.phone && (
            <span className={styles.errorText}>{errors.phone}</span>
          )}
        </div>

        <div className={styles.formGroup}>
          <label>Celular Particular *</label>
          <input
            type="tel"
            value={formData.mobile}
            onChange={(e) => onChange("mobile", e.target.value)}
            placeholder="(0379) 15-123456"
            {...getInputProps("mobile")}
            className={errors.mobile ? styles.error : ""}
          />
          {errors.mobile && (
            <span className={styles.errorText}>{errors.mobile}</span>
          )}
        </div>
      </div>
    );

  if (step === 2)
    return (
      <div className={styles.stepContent}>
        <div className={styles.topTitle}>
          <h2>Datos Profesionales</h2>
          <HelpButton />
        </div>

        <div className={styles.formGrid}>
          <FieldWithAttach
            label="Título *"
            htmlFor="titulo"
            error={errors.title}
            attach={attach("tituloImg", "Adjuntar título")}
          >
            <input
              id="titulo"
              type="text"
              value={formData.title}
              onChange={(e) => onChange("title", e.target.value)}
              className={errors.title ? styles.error : ""}
              placeholder="Ej: Médico Cirujano"
            />
          </FieldWithAttach>

          <div className={styles.formGroup}>
            <label>Fecha de Recibido *</label>
            <input
              type="date"
              value={formData.graduationDate}
              onChange={(e) => onChange("graduationDate", e.target.value)}
            />
          </div>

          <FieldWithAttach
            label="Matrícula Nacional *"
            htmlFor="matNac"
            error={errors.nationalLicense}
            attach={attach("matNacImg", "Adjuntar matrícula nacional")}
          >
            <input
              id="matNac"
              type="text"
              value={formData.nationalLicense}
              onChange={(e) => onChange("nationalLicense", e.target.value)}
              className={errors.nationalLicense ? styles.error : ""}
              placeholder="Número de matrícula"
            />
          </FieldWithAttach>

          <div className={styles.formGroup}>
            <label>Fecha Matrícula Nacional *</label>
            <input
              type="date"
              value={formData.nationalLicenseDate}
              onChange={(e) => onChange("nationalLicenseDate", e.target.value)}
            />
          </div>

          <FieldWithAttach
            label="Matrícula Provincial"
            htmlFor="matProv"
            attach={attach("matProvImg", "Adjuntar matrícula provincial")}
          >
            <input
              id="matProv"
              type="text"
              value={formData.provincialLicense}
              onChange={(e) => onChange("provincialLicense", e.target.value)}
              placeholder="Número de matrícula"
            />
          </FieldWithAttach>

          <div className={styles.formGroup}>
            <label>Fecha Matrícula Provincial *</label>
            <input
              type="date"
              value={formData.provincialLicenseDate}
              onChange={(e) =>
                onChange("provincialLicenseDate", e.target.value)
              }
            />
          </div>

          <div className={styles.formGroup}>
            <label>Especialidad *</label>
            <select
              value={formData.specialty}
              onChange={(e) => onChange("specialty", e.target.value)}
              className={errors.specialty ? styles.error : ""}
            >
              <option value="">Seleccionar...</option>
              {specialties.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            {errors.specialty && (
              <span className={styles.errorText}>{errors.specialty}</span>
            )}
          </div>

          <FieldWithAttach
            label="Número de Resolución"
            htmlFor="nResol"
            attach={attach("resolucionImg", "Adjuntar resolución")}
            error={errors.resolutionNumber}
          >
            <input
              id="nResol"
              type="text"
              value={formData.resolutionNumber}
              onChange={(e) => onChange("resolutionNumber", e.target.value)}
              placeholder="Número de resolución"
              {...getInputProps("resolutionNumber")}
              className={errors.resolutionNumber ? styles.error : ""}
            />
          </FieldWithAttach>

          <div className={styles.formGroup}>
            <label>Fecha de Resolución *</label>
            <input
              type="date"
              value={formData.resolutionDate}
              onChange={(e) => onChange("resolutionDate", e.target.value)}
            />
          </div>

          <FieldWithAttach
            label="Domicilio del Consultorio"
            htmlFor="domCons"
            attach={attach("habMunicipal", "Adjuntar habilitación municipal")}
          >
            <input
              id="domCons"
              type="text"
              value={formData.officeAddress}
              onChange={(e) => onChange("officeAddress", e.target.value)}
              placeholder="Dirección completa del consultorio"
            />
          </FieldWithAttach>

          <div className={styles.formGroup}>
            <label>Teléfono del Consultorio *</label>
            <input
              type="tel"
              value={formData.officePhone}
              onChange={(e) => onChange("officePhone", e.target.value)}
              placeholder="(0379) 442-3456"
              {...getInputProps("officePhone")}
              className={errors.officePhone ? styles.error : ""}
            />
            {errors.officePhone && (
              <span className={styles.errorText}>{errors.officePhone}</span>
            )}
          </div>
        </div>
      </div>
    );

  if (step === 3)
    return (
      <div className={styles.stepContent}>
        <div className={styles.topTitle}>
          <h2>Datos Impositivos</h2>
          <HelpButton />
        </div>

        <div className={styles.formGrid}>
          <FieldWithAttach
            label="CUIT *"
            htmlFor="cuit"
            error={errors.cuit}
            attach={attach("cuitImg", "Adjuntar imagen CUIT")}
          >
            <input
              id="cuit"
              type="text"
              value={formData.cuit}
              onChange={(e) => onChange("cuit", e.target.value)}
              className={errors.cuit ? styles.error : ""}
              placeholder="11 dígitos"
              {...getInputProps("cuit")}
            />
          </FieldWithAttach>

          <FieldWithAttach
            label="Condición Impositiva *"
            htmlFor="condImp"
            error={errors.taxCondition}
            attach={attach("condImpImg", "Adjuntar comprobante")}
          >
            <select
              id="condImp"
              value={formData.taxCondition}
              onChange={(e) => onChange("taxCondition", e.target.value)}
              className={errors.taxCondition ? styles.error : ""}
            >
              <option value="">Seleccionar...</option>
              {[
                "Monotributista",
                "Responsable Inscripto",
                "Exento",
                "Rentas",
              ].map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </FieldWithAttach>

          <FieldWithAttach
            label="ANSSAL"
            htmlFor="anssal"
            attach={attach("anssalImg", "Adjuntar ANSSAL")}
          >
            <input
              id="anssal"
              type="text"
              value={formData.anssal}
              onChange={(e) => onChange("anssal", e.target.value)}
              placeholder="Número ANSSAL"
            />
          </FieldWithAttach>

          <div className={styles.formGroup}>
            <label>Vencimiento ANSSAL</label>
            <input
              type="date"
              value={formData.anssalExpiry}
              onChange={(e) => onChange("anssalExpiry", e.target.value)}
            />
          </div>

          <FieldWithAttach
            label="Mala Praxis (Compañía)"
            htmlFor="malpraxis"
            attach={attach("polizaImg", "Adjuntar póliza")}
          >
            <input
              id="malpraxis"
              type="text"
              value={formData.malpracticeCompany}
              onChange={(e) => onChange("malpracticeCompany", e.target.value)}
              placeholder="Nombre de la compañía"
            />
          </FieldWithAttach>

          <div className={styles.formGroup}>
            <label>Vencimiento Mala Praxis</label>
            <input
              type="date"
              value={formData.malpracticeExpiry}
              onChange={(e) => onChange("malpracticeExpiry", e.target.value)}
            />
          </div>

          <div className={styles.formGroup}>
            <label>Cobertura Mala Praxis</label>
            <input
              type="text"
              value={formData.malpracticeCoverage}
              onChange={(e) => onChange("malpracticeCoverage", e.target.value)}
              placeholder="Monto de cobertura (solo números)"
              {...getInputProps("malpracticeCoverage")}
              className={errors.malpracticeCoverage ? styles.error : ""}
            />
            {errors.malpracticeCoverage && (
              <span className={styles.errorText}>
                {errors.malpracticeCoverage}
              </span>
            )}
          </div>

          <div className={styles.formGroup}>
            <label>Vencimiento de Cobertura</label>
            <input
              type="date"
              value={formData.coverageExpiry}
              onChange={(e) => onChange("coverageExpiry", e.target.value)}
            />
          </div>

          <FieldWithAttach
            label="CBU"
            htmlFor="cbu"
            attach={attach("cbuImg", "Adjuntar CBU")}
            error={errors.cbu}
          >
            <input
              id="cbu"
              type="text"
              value={formData.cbu}
              onChange={(e) => onChange("cbu", e.target.value)}
              placeholder="22 dígitos"
              {...getInputProps("cbu")}
              className={errors.cbu ? styles.error : ""}
            />
          </FieldWithAttach>
        </div>
      </div>
    );

  return (
    <div className={styles.stepContent}>
      <h2>Resumen y Observaciones</h2>

      <div className={styles.summarySection}>
        <h3>Datos Personales</h3>
        <div className={styles.summaryGrid}>
          <div>
            <strong>Nombre:</strong> {formData.firstName} {formData.lastName}
          </div>
          {/* <div>
            <strong>Documento:</strong> {formData.documentType}{" "}
            {formData.documentNumber}
          </div> */}
          <div>
            <strong>Email:</strong> {formData.email}
          </div>
          <div>
            <strong>Provincia:</strong> {formData.province}
          </div>
          <div>
            <strong>Localidad:</strong> {formData.locality}
          </div>
        </div>
      </div>

      <div className={styles.summarySection}>
        <h3>Datos Profesionales</h3>
        <div className={styles.summaryGrid}>
          <div>
            <strong>Título:</strong> {formData.title}
          </div>
          <div>
            <strong>Matrícula Nacional:</strong> {formData.nationalLicense}
          </div>
          <div>
            <strong>Especialidad:</strong> {formData.specialty}
          </div>
        </div>
      </div>

      <div className={styles.summarySection}>
        <h3>Datos Impositivos</h3>
        <div className={styles.summaryGrid}>
          <div>
            <strong>CUIT:</strong> {formData.cuit}
          </div>
          <div>
            <strong>Condición:</strong> {formData.taxCondition}
          </div>
        </div>
      </div>

      <div className={styles.formGroup}>
        <label>Observaciones</label>
        <textarea
          value={formData.observations}
          onChange={(e) => onChange("observations", e.target.value)}
          rows={4}
          placeholder="Ingrese cualquier observación adicional..."
        />
      </div>

      <div className={styles.infoBox}>
        <h4>Próximos Pasos</h4>
        <p>
          Una vez enviada su solicitud, recibirá un email de confirmación. El
          proceso de alta de socio será revisado por nuestro equipo
          administrativo.
        </p>
        <div className={styles.contactInfo}>
          <p>
            <strong>Contacto:</strong>
          </p>
          <p>📧 registro@cmcorrientes.org.ar</p>
          <p>📞 (0379) 442-3456</p>
          <p>📍 Av. 3 de Abril 1234, Corrientes Capital</p>
        </div>
      </div>
    </div>
  );
};

export default Steps;
