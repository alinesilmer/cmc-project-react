"use client";
import React, { useState } from "react";
import styles from "./Steps.module.scss";
import HelpButton from "../../../components/atoms/HelpButton/HelpButton";
import PdfUpload from "../../../components/atoms/PdfUpload/PdfUpload";
import type { RegisterFormData, SpecialtyItem } from "../../../types/register";

import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { es } from "date-fns/locale";
import Button from "../../../components/atoms/Button/Button";

// -------------------- utils fecha (dd-MM-yyyy ↔ Date) --------------------
const dateToStr = (d: Date | null) => {
  if (!d) return "";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yy = d.getFullYear();
  return `${dd}-${mm}-${yy}`;
};
const strToDate = (v?: string | null): Date | null => {
  if (!v) return null;
  const [dd, mm, yy] = v.split("-").map(Number);
  if (!dd || !mm || !yy) return null;
  // 12hs para evitar problemas de DST
  return new Date(yy, mm - 1, dd, 12, 0, 0, 0);
};

// -------------------- DateField controlado --------------------
const DateField: React.FC<{
  value: string;
  onChange: (val: string) => void;
  error?: string;
  placeholder?: string;
}> = ({ value, onChange, error, placeholder = "dd-mm-aaaa" }) => {
  const [open, setOpen] = useState(false);

  return (
    <DatePicker
      selected={strToDate(value)}
      onChange={(d) => {
        onChange(dateToStr(d));
        setOpen(false);
      }}
      open={open}
      onFocus={() => setOpen(true)}
      onInputClick={() => setOpen(true)}
      onClickOutside={() => setOpen(false)}
      shouldCloseOnSelect
      onKeyDown={(e) => e.preventDefault()}
      dateFormat="dd-MM-yyyy"
      locale={es}
      showMonthDropdown
      showYearDropdown
      dropdownMode="select"
      // Evita clipping por overflow/z-index
      popperContainer={({ children }) => (
        <div style={{ zIndex: 9999 }}>{children}</div>
      )}
      popperPlacement="bottom-start"
      placeholderText={placeholder}
      className={`${styles.input ?? ""} ${error ? styles.error : ""}`}
    />
  );
};

// -------------------- FieldWithAttach --------------------
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
      <div className={styles.fieldGrow}>{children}</div>
    </div>
    <div className={styles.fieldRow}>
      <div className={styles.attachCell}>{attach}</div>
    </div>
    {error && <span className={styles.errorText}>{error}</span>}
  </div>
);

// -------------------- Props --------------------
type Props = {
  step: 1 | 2 | 3 | 4;
  formData: RegisterFormData;
  errors: Partial<Record<keyof RegisterFormData, string>>;
  provinces: string[];
  localities: string[];
  specialties: { id: number; id_colegio_espe: number; nombre: string }[];
  onChange: (field: keyof RegisterFormData, value: string | boolean) => void;
  getInputProps: (
    k: keyof RegisterFormData
  ) => React.InputHTMLAttributes<HTMLInputElement>;
  files: Record<string, File | null>;
  setFiles: React.Dispatch<React.SetStateAction<Record<string, File | null>>>;
  fileErrs: Record<string, string>;
  setFileErrs: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  specItems: SpecialtyItem[];
  setSpecItems: React.Dispatch<React.SetStateAction<SpecialtyItem[]>>;
};

// const MAX_SPECS = 6;

const Steps: React.FC<Props> = (props) => {
  const {
    step,
    formData,
    errors,
    provinces,
    localities,
    specialties,
    specItems,
    setSpecItems,
    onChange,
    getInputProps,
    setFiles,
    files,
    fileErrs,
    setFileErrs,
  } = props;

  // Fallbacks seguros
  const specialtiesSafe = Array.isArray(specialties) ? specialties : [];
  const specItemsSafe = Array.isArray(specItems) ? specItems : [];

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

  const addSpec = () => {
    const nextIdx = specItems.length + 2; // 2..6 (1 es la principal)
    const newKey = `resolucion_${nextIdx}`;
    setSpecItems((prev) => [
      ...prev,
      {
        id_colegio_espe: 0,
        resolutionNumber: "",
        resolutionDate: "",
        fileKey: newKey,
      },
    ]);
    // 👇 importantísimo: que arranque vacío
    setFiles((prev) => ({ ...prev, [newKey]: null }));
  };

  const removeSpec = (idxToRemove: number) => {
    setSpecItems((prev) => {
      const removed = prev[idxToRemove]?.fileKey;
      const next = prev.filter((_, i) => i !== idxToRemove);
      // reindexar a 2..N
      const reindexed = next.map((it, i) => ({
        ...it,
        fileKey: `resolucion_${i + 2}`,
      }));
      // limpiar archivo del que se fue
      setFiles((prevFiles) => {
        if (!removed) return prevFiles;
        const copy = { ...prevFiles };
        delete copy[removed];
        return copy;
      });
      return reindexed;
    });
  };

  // -------------------- Step 1: Datos Personales --------------------
  if (step === 1)
    return (
      <div className={styles.stepContent}>
        <div className={styles.topTitle}>
          <h2>Datos Personales</h2>
          <HelpButton />
        </div>

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
          <DateField
            value={formData.birthDate}
            onChange={(v) => onChange("birthDate", v)}
            error={errors.birthDate}
          />
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

  // -------------------- Step 2: Datos Profesionales --------------------
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
            <DateField
              value={formData.graduationDate}
              onChange={(v) => onChange("graduationDate", v)}
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
            <DateField
              value={formData.nationalLicenseDate}
              onChange={(v) => onChange("nationalLicenseDate", v)}
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
            <DateField
              value={formData.provincialLicenseDate}
              onChange={(v) => onChange("provincialLicenseDate", v)}
            />
          </div>
          <div className={`${styles.formGroup} ${styles.especialidadGroup}`}>
            <div className={styles.formGroup}>
              <label>Especialidad *</label>
              <select
                value={String(formData.specialty || "")}
                onChange={(e) => onChange("specialty", e.target.value)} // guarda ID_COLEGIO_ESPE como string
                className={errors.specialty ? styles.error : ""}
              >
                <option value="">Seleccionar...</option>
                {specialtiesSafe.map((s) => (
                  <option key={`main-${s.id}`} value={s.id_colegio_espe}>
                    {s.nombre}
                  </option>
                ))}
              </select>
              {errors.specialty && (
                <span className={styles.errorText}>{errors.specialty}</span>
              )}
            </div>

            {/* Fecha de Resolución (principal) */}
            <div className={styles.formGroup}>
              <label>Fecha de Resolución</label>
              <DateField
                value={formData.resolutionDate}
                onChange={(v) => onChange("resolutionDate", v)}
              />
            </div>
            <FieldWithAttach
              label="Número de Resolución"
              htmlFor="nResol"
              attach={attach("resolucion_1", "Adjuntar resolución")}
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

            {specItemsSafe.map((row, idx) => {
              const fileKey = row.fileKey || `resolucion_${idx + 2}`;
              return (
                <div
                  key={fileKey}
                  className={`${styles.formGroup} ${styles.especialidadGroup}`}
                >
                  <div className={styles.formGroup}>
                    <label>Especialidad #{idx + 2}</label>
                    <select
                      value={String(row.id_colegio_espe || "")}
                      onChange={(e) => {
                        const value = e.target.value
                          ? Number(e.target.value)
                          : 0;
                        setSpecItems((prev) => {
                          const copy = Array.isArray(prev) ? [...prev] : [];
                          copy[idx] = {
                            ...(copy[idx] || {}),
                            id_colegio_espe: value,
                          };
                          return copy;
                        });
                      }}
                    >
                      <option value="">Seleccionar...</option>
                      {specialtiesSafe.map((s) => (
                        <option
                          key={`extra-${idx}-${s.id_colegio_espe}`}
                          value={s.id_colegio_espe}
                        >
                          {s.nombre}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className={styles.formGroup}>
                    <label>Fecha de Resolución</label>
                    <DateField
                      value={row.resolutionDate || ""}
                      onChange={(v) =>
                        setSpecItems((prev) => {
                          const copy = Array.isArray(prev) ? [...prev] : [];
                          copy[idx] = {
                            ...(copy[idx] || {}),
                            resolutionDate: v,
                          };
                          return copy;
                        })
                      }
                    />
                  </div>

                  <FieldWithAttach
                    label="Número de Resolución"
                    htmlFor={`nResol_extra_${idx}`}
                    attach={attach(fileKey, "Adjuntar resolución")}
                  >
                    <input
                      id={`nResol_extra_${idx}`}
                      type="text"
                      value={row.resolutionNumber || ""}
                      onChange={(e) =>
                        setSpecItems((prev) => {
                          const copy = Array.isArray(prev) ? [...prev] : [];
                          copy[idx] = {
                            ...(copy[idx] || {}),
                            resolutionNumber: e.target.value,
                          };
                          return copy;
                        })
                      }
                      placeholder="Número de resolución"
                    />
                  </FieldWithAttach>

                  <div className={styles.actionsInline}>
                    {/* <button type="button" onClick={() => removeSpec(idx)} className={styles.removeBtn}>
                      Quitar
                    </button> */}
                    <Button
                      variant="danger"
                      size="sm"
                      type="button"
                      onClick={() => removeSpec(idx)}
                      className={styles.removeBtn}
                    >
                      Quitar
                    </Button>
                  </div>
                </div>
              );
            })}

            {/* --- Especialidades extra (hasta completar 6 en total) --- */}
            <div
              className={`${styles.formGroup} ${styles.especialidadGroupMoreBoton}`}
            >
              {/* <button type="button" onClick={addSpec} className={styles.addBtn}>
                Agregar especialidad
              </button> */}
              <Button
                type="button"
                onClick={addSpec}
                className={styles.addBtn}
                variant="primary"
              >
                Agregar especialidad
              </Button>
              <small className={styles.note}>
                Si posee más de 6 especialidades, comunicarse con el colegio
                médico.
              </small>
            </div>
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

  // -------------------- Step 3: Datos Impositivos --------------------
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
            <DateField
              value={formData.anssalExpiry}
              onChange={(v) => onChange("anssalExpiry", v)}
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
            <DateField
              value={formData.malpracticeExpiry}
              onChange={(v) => onChange("malpracticeExpiry", v)}
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
            <DateField
              value={formData.coverageExpiry}
              onChange={(v) => onChange("coverageExpiry", v)}
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

  // -------------------- Step 4: Resumen --------------------
  return (
    <div className={styles.stepContent}>
      <h2>Resumen y Observaciones</h2>

      <div className={styles.summarySection}>
        <h3>Datos Personales</h3>
        <div className={styles.summaryGrid}>
          <div>
            <strong>Nombre:</strong> {formData.firstName} {formData.lastName}
          </div>
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
