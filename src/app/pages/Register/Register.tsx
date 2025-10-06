"use client";

import type React from "react";

import { useState, useEffect } from "react";
import styles from "./Register.module.scss";
import PdfUpload from "../../../components/atoms/PdfUpload/PdfUpload";
import HelpButton from "../../../components/atoms/HelpButton/HelpButton";

interface FormData {
  memberNumber: string;
  memberType: string;
  documentType: string;
  documentNumber: string;
  firstName: string;
  lastName: string;
  gender: string;
  birthDate: string;
  province: string;
  postalCode: string;
  address: string;
  phone: string;
  mobile: string;
  email: string;

  title: string;
  nationalLicense: string;
  nationalLicenseDate: string;
  provincialLicense: string;
  provincialLicenseDate: string;
  entryDate: string;
  graduationDate: string;
  specialty: string;
  resolutionNumber: string;
  resolutionDate: string;
  officeAddress: string;
  officePhone: string;

  cuit: string;
  anssal: string;
  anssalExpiry: string;
  malpracticeCompany: string;
  malpracticeExpiry: string;
  taxCondition: string;
  cbu: string;
  malpracticeCoverage: string;
  coverageExpiry: string;
  lifeTime: boolean;
  lifeTimeDate: string;
  category: string;

  observations: string;
}

const steps = [
  { id: 1, title: "Datos Personales", icon: "👤" },
  { id: 2, title: "Datos Profesionales", icon: "🎓" },
  { id: 3, title: "Datos Impositivos", icon: "📋" },
  { id: 4, title: "Resumen", icon: "✓" },
];

const documentTypes = [
  "Documento Único",
  "Libreta de Enrolamiento",
  "Libreta Cívica",
  "Otro",
];

const taxConditions = [
  "Monotributista",
  "Responsable Inscripto",
  "Exento",
  "Rentas",
];

type FieldWithAttachProps = {
  label: string;
  htmlFor?: string;
  error?: string;
  children: React.ReactNode;
  attach: React.ReactNode;
};

const FieldWithAttach: React.FC<FieldWithAttachProps> = ({
  label,
  htmlFor,
  error,
  children,
  attach,
}) => (
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

function Register() {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<FormData>({
    memberNumber: "3194",
    memberType: "adherente",
    documentType: "",
    documentNumber: "",
    firstName: "",
    lastName: "",
    gender: "",
    birthDate: "",
    province: "",
    postalCode: "",
    address: "",
    phone: "",
    mobile: "",
    email: "",
    title: "",
    nationalLicense: "",
    nationalLicenseDate: "",
    provincialLicense: "",
    provincialLicenseDate: "",
    entryDate: "",
    graduationDate: "",
    specialty: "",
    resolutionNumber: "",
    resolutionDate: "",
    officeAddress: "",
    officePhone: "",
    cuit: "",
    anssal: "",
    anssalExpiry: "",
    malpracticeCompany: "",
    malpracticeExpiry: "",
    taxCondition: "",
    cbu: "",
    malpracticeCoverage: "",
    coverageExpiry: "",
    lifeTime: false,
    lifeTimeDate: "",
    category: "a",
    observations: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [provinces, setProvinces] = useState<string[]>([]);
  const [specialties, setSpecialties] = useState<string[]>([]);
  const [files, setFiles] = useState<Record<string, File | null>>({});
  const [fileErrs, setFileErrs] = useState<Record<string, string>>({});

  useEffect(() => {
    setProvinces([
      "Buenos Aires",
      "Catamarca",
      "Chaco",
      "Chubut",
      "Córdoba",
      "Corrientes",
      "Entre Ríos",
      "Formosa",
      "Jujuy",
      "La Pampa",
      "La Rioja",
      "Mendoza",
      "Misiones",
      "Neuquén",
      "Río Negro",
      "Salta",
      "San Juan",
      "San Luis",
      "Santa Cruz",
      "Santa Fe",
      "Santiago del Estero",
      "Tierra del Fuego",
      "Tucumán",
    ]);
    setSpecialties([
      "No tiene especialidad",
      "Cardiología",
      "Dermatología",
      "Endocrinología",
      "Gastroenterología",
      "Ginecología",
      "Neurología",
      "Oftalmología",
      "Pediatría",
      "Psiquiatría",
      "Traumatología",
      "Urología",
    ]);
  }, []);

  const handleInputChange = (
    field: keyof FormData,
    value: string | boolean
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: "" }));
  };

  const attachHandlers = (key: string, label: string) => ({
    node: (
      <PdfUpload
        label={label}
        onFileSelect={(f) => {
          setFiles((p) => ({ ...p, [key]: f }));
          setFileErrs((p) => ({
            ...p,
            [key]: f ? "" : "Debe subir un archivo",
          }));
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
    ),
    error: fileErrs[key],
  });

  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {};
    switch (step) {
      case 1:
        if (!formData.documentType)
          newErrors.documentType = "Seleccione tipo de documento";
        if (!formData.documentNumber)
          newErrors.documentNumber = "Ingrese número de documento";
        if (!formData.firstName) newErrors.firstName = "Ingrese nombre";
        if (!formData.lastName) newErrors.lastName = "Ingrese apellido";
        if (!formData.gender) newErrors.gender = "Seleccione sexo";
        if (!formData.birthDate)
          newErrors.birthDate = "Ingrese fecha de nacimiento";
        if (!formData.email) newErrors.email = "Ingrese email";
        else if (!/\S+@\S+\.\S+/.test(formData.email))
          newErrors.email = "Email inválido";
        break;
      case 2:
        if (!formData.title) newErrors.title = "Ingrese título";
        if (!formData.nationalLicense)
          newErrors.nationalLicense = "Ingrese matrícula nacional";
        if (!formData.specialty)
          newErrors.specialty = "Seleccione especialidad";
        break;
      case 3:
        if (!formData.cuit) newErrors.cuit = "Ingrese CUIT";
        if (!formData.taxCondition)
          newErrors.taxCondition = "Seleccione condición impositiva";
        break;
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const nextStep = () => {
    if (validateStep(currentStep)) setCurrentStep((p) => Math.min(p + 1, 4));
  };
  const prevStep = () => setCurrentStep((p) => Math.max(p - 1, 1));

  const renderPersonalData = () => (
    <div className={`${styles.stepContent} fade-in`}>
      <div className={styles.topTitle}>
        <h2>Datos Personales</h2>
        <HelpButton />
      </div>

      <div className={styles.formGrid}>
        {/* Membership Information */}
        <div className={styles.formGroup}>
          <label>Número de Socio</label>
          <input
            type="text"
            value={formData.memberNumber}
            disabled
            className={styles.disabledInput}
          />
        </div>

        <div className={styles.formGroup}>
          <label>Tipo de Socio</label>
          <select
            value={formData.memberType}
            onChange={(e) => handleInputChange("memberType", e.target.value)}
          >
            <option value="socio">Socio</option>
            <option value="adherente">Adherente</option>
            <option value="vitalicio">Vitalicio</option>
          </select>
        </div>

        {/* Identity Documents */}
        <div className={styles.formGroup}>
          <label>Tipo de Documento *</label>
          <select
            value={formData.documentType}
            onChange={(e) => handleInputChange("documentType", e.target.value)}
            className={errors.documentType ? styles.error : ""}
          >
            <option value="">Seleccionar...</option>
            {documentTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
          {errors.documentType && (
            <span className={styles.errorText}>{errors.documentType}</span>
          )}
        </div>

        {(() => {
          const a = attachHandlers("docNumberImg", "Adjuntar documento");
          return (
            <FieldWithAttach
              label="Número de Documento *"
              htmlFor="documentNumber"
              error={errors.documentNumber}
              attach={a.node}
            >
              <input
                id="documentNumber"
                type="text"
                value={formData.documentNumber}
                onChange={(e) =>
                  handleInputChange("documentNumber", e.target.value)
                }
                className={errors.documentNumber ? styles.error : ""}
                placeholder="Sin puntos"
              />
            </FieldWithAttach>
          );
        })()}

        {/* Personal Information */}
        <div className={styles.formGroup}>
          <label>Nombre *</label>
          <input
            type="text"
            value={formData.firstName}
            onChange={(e) => handleInputChange("firstName", e.target.value)}
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
            onChange={(e) => handleInputChange("lastName", e.target.value)}
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
            onChange={(e) => handleInputChange("gender", e.target.value)}
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
            onChange={(e) => handleInputChange("birthDate", e.target.value)}
            className={errors.birthDate ? styles.error : ""}
          />
          {errors.birthDate && (
            <span className={styles.errorText}>{errors.birthDate}</span>
          )}
        </div>

        {/* Address Information */}
        <div className={`${styles.formGroup} ${styles.fullWidth}`}>
          <label>Domicilio Particular</label>
          <input
            type="text"
            value={formData.address}
            onChange={(e) => handleInputChange("address", e.target.value)}
            placeholder="Calle, número, piso, departamento"
          />
        </div>

        <div className={styles.formGroup}>
          <label>Provincia</label>
          <select
            value={formData.province}
            onChange={(e) => handleInputChange("province", e.target.value)}
          >
            <option value="">Seleccionar...</option>
            {provinces.map((province) => (
              <option key={province} value={province}>
                {province}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.formGroup}>
          <label>Código Postal</label>
          <input
            type="text"
            value={formData.postalCode}
            onChange={(e) => handleInputChange("postalCode", e.target.value)}
            placeholder="Ej: 3400"
          />
        </div>

        {/* Contact Information */}
        <div className={`${styles.formGroup} ${styles.fullWidth}`}>
          <label>Email Particular *</label>
          <input
            type="email"
            value={formData.email}
            onChange={(e) => handleInputChange("email", e.target.value)}
            className={errors.email ? styles.error : ""}
            placeholder="ejemplo@correo.com"
          />
          {errors.email && (
            <span className={styles.errorText}>{errors.email}</span>
          )}
        </div>

        <div className={styles.formGroup}>
          <label>Teléfono Particular</label>
          <input
            type="tel"
            value={formData.phone}
            onChange={(e) => handleInputChange("phone", e.target.value)}
            placeholder="(0379) 442-3456"
          />
        </div>

        <div className={styles.formGroup}>
          <label>Celular Particular</label>
          <input
            type="tel"
            value={formData.mobile}
            onChange={(e) => handleInputChange("mobile", e.target.value)}
            placeholder="(0379) 15-123456"
          />
        </div>
      </div>
    </div>
  );

  const renderProfessionalData = () => (
    <div className={`${styles.stepContent} fade-in`}>
      <div className={styles.topTitle}>
        <h2>Datos Profesionales</h2>
        <HelpButton />
      </div>

      <div className={styles.formGrid}>
        {/* Academic Title */}
        {(() => {
          const a = attachHandlers("tituloImg", "Adjuntar título");
          return (
            <FieldWithAttach
              label="Título *"
              htmlFor="titulo"
              error={errors.title}
              attach={a.node}
            >
              <input
                id="titulo"
                type="text"
                value={formData.title}
                onChange={(e) => handleInputChange("title", e.target.value)}
                className={errors.title ? styles.error : ""}
                placeholder="Ej: Médico Cirujano"
              />
            </FieldWithAttach>
          );
        })()}

        <div className={styles.formGroup}>
          <label>Fecha de Recibido</label>
          <input
            type="date"
            value={formData.graduationDate}
            onChange={(e) =>
              handleInputChange("graduationDate", e.target.value)
            }
          />
        </div>

        {/* National License */}
        {(() => {
          const a = attachHandlers("matNacImg", "Adjuntar matrícula nacional");
          return (
            <FieldWithAttach
              label="Matrícula Nacional *"
              htmlFor="matNac"
              error={errors.nationalLicense}
              attach={a.node}
            >
              <input
                id="matNac"
                type="text"
                value={formData.nationalLicense}
                onChange={(e) =>
                  handleInputChange("nationalLicense", e.target.value)
                }
                className={errors.nationalLicense ? styles.error : ""}
                placeholder="Número de matrícula"
              />
            </FieldWithAttach>
          );
        })()}

        <div className={styles.formGroup}>
          <label>Fecha Matrícula Nacional</label>
          <input
            type="date"
            value={formData.nationalLicenseDate}
            onChange={(e) =>
              handleInputChange("nationalLicenseDate", e.target.value)
            }
          />
        </div>

        {/* Provincial License */}
        {(() => {
          const a = attachHandlers(
            "matProvImg",
            "Adjuntar matrícula provincial"
          );
          return (
            <FieldWithAttach
              label="Matrícula Provincial"
              htmlFor="matProv"
              attach={a.node}
            >
              <input
                id="matProv"
                type="text"
                value={formData.provincialLicense}
                onChange={(e) =>
                  handleInputChange("provincialLicense", e.target.value)
                }
                placeholder="Número de matrícula"
              />
            </FieldWithAttach>
          );
        })()}

        <div className={styles.formGroup}>
          <label>Fecha Matrícula Provincial</label>
          <input
            type="date"
            value={formData.provincialLicenseDate}
            onChange={(e) =>
              handleInputChange("provincialLicenseDate", e.target.value)
            }
          />
        </div>

        {/* Specialty Information */}
        <div className={styles.formGroup}>
          <label>Especialidad *</label>
          <select
            value={formData.specialty}
            onChange={(e) => handleInputChange("specialty", e.target.value)}
            className={errors.specialty ? styles.error : ""}
          >
            <option value="">Seleccionar...</option>
            {specialties.map((specialty) => (
              <option key={specialty} value={specialty}>
                {specialty}
              </option>
            ))}
          </select>
          {errors.specialty && (
            <span className={styles.errorText}>{errors.specialty}</span>
          )}
        </div>

        <div className={styles.formGroup}>
          <label>Fecha de Ingreso</label>
          <input
            type="date"
            value={formData.entryDate}
            onChange={(e) => handleInputChange("entryDate", e.target.value)}
          />
        </div>

        {(() => {
          const a = attachHandlers("resolucionImg", "Adjuntar resolución");
          return (
            <FieldWithAttach
              label="Número de Resolución"
              htmlFor="nResol"
              attach={a.node}
            >
              <input
                id="nResol"
                type="text"
                value={formData.resolutionNumber}
                onChange={(e) =>
                  handleInputChange("resolutionNumber", e.target.value)
                }
                placeholder="Número de resolución"
              />
            </FieldWithAttach>
          );
        })()}

        <div className={styles.formGroup}>
          <label>Fecha de Resolución</label>
          <input
            type="date"
            value={formData.resolutionDate}
            onChange={(e) =>
              handleInputChange("resolutionDate", e.target.value)
            }
          />
        </div>

        {/* Office Information */}
        {(() => {
          const a = attachHandlers(
            "habMunicipal",
            "Adjuntar habilitación municipal"
          );
          return (
            <FieldWithAttach
              label="Domicilio del Consultorio"
              htmlFor="domCons"
              attach={a.node}
            >
              <input
                id="domCons"
                type="text"
                value={formData.officeAddress}
                onChange={(e) =>
                  handleInputChange("officeAddress", e.target.value)
                }
                placeholder="Dirección completa del consultorio"
              />
            </FieldWithAttach>
          );
        })()}

        <div className={styles.formGroup}>
          <label>Teléfono del Consultorio</label>
          <input
            type="tel"
            value={formData.officePhone}
            onChange={(e) => handleInputChange("officePhone", e.target.value)}
            placeholder="(0379) 442-3456"
          />
        </div>
      </div>
    </div>
  );

  const renderTaxData = () => (
    <div className={`${styles.stepContent} fade-in`}>
      <div className={styles.topTitle}>
        <h2>Datos Impositivos</h2>
        <HelpButton />
      </div>

      <div className={styles.formGrid}>
        {/* Tax Identification */}
        {(() => {
          const a = attachHandlers("cuitImg", "Adjuntar imagen CUIT");
          return (
            <FieldWithAttach
              label="CUIT *"
              htmlFor="cuit"
              error={errors.cuit}
              attach={a.node}
            >
              <input
                id="cuit"
                type="text"
                value={formData.cuit}
                onChange={(e) => handleInputChange("cuit", e.target.value)}
                className={errors.cuit ? styles.error : ""}
                placeholder="XX-XXXXXXXX-X"
              />
            </FieldWithAttach>
          );
        })()}

        {(() => {
          const a = attachHandlers("condImpImg", "Adjuntar comprobante");
          return (
            <FieldWithAttach
              label="Condición Impositiva *"
              htmlFor="condImp"
              error={errors.taxCondition}
              attach={a.node}
            >
              <select
                id="condImp"
                value={formData.taxCondition}
                onChange={(e) =>
                  handleInputChange("taxCondition", e.target.value)
                }
                className={errors.taxCondition ? styles.error : ""}
              >
                <option value="">Seleccionar...</option>
                {taxConditions.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </FieldWithAttach>
          );
        })()}

        {/* ANSSAL Information */}
        {(() => {
          const a = attachHandlers("anssalImg", "Adjuntar ANSSAL");
          return (
            <FieldWithAttach label="ANSSAL" htmlFor="anssal" attach={a.node}>
              <input
                id="anssal"
                type="text"
                value={formData.anssal}
                onChange={(e) => handleInputChange("anssal", e.target.value)}
                placeholder="Número ANSSAL"
              />
            </FieldWithAttach>
          );
        })()}

        <div className={styles.formGroup}>
          <label>Vencimiento ANSSAL</label>
          <input
            type="date"
            value={formData.anssalExpiry}
            onChange={(e) => handleInputChange("anssalExpiry", e.target.value)}
          />
        </div>

        {/* Malpractice Insurance */}
        {(() => {
          const a = attachHandlers("polizaImg", "Adjuntar póliza");
          return (
            <FieldWithAttach
              label="Mala Praxis (Compañía)"
              htmlFor="malpraxis"
              attach={a.node}
            >
              <input
                id="malpraxis"
                type="text"
                value={formData.malpracticeCompany}
                onChange={(e) =>
                  handleInputChange("malpracticeCompany", e.target.value)
                }
                placeholder="Nombre de la compañía"
              />
            </FieldWithAttach>
          );
        })()}

        <div className={styles.formGroup}>
          <label>Vencimiento Mala Praxis</label>
          <input
            type="date"
            value={formData.malpracticeExpiry}
            onChange={(e) =>
              handleInputChange("malpracticeExpiry", e.target.value)
            }
          />
        </div>

        <div className={styles.formGroup}>
          <label>Cobertura Mala Praxis</label>
          <input
            type="text"
            value={formData.malpracticeCoverage}
            onChange={(e) =>
              handleInputChange("malpracticeCoverage", e.target.value)
            }
            placeholder="Monto de cobertura"
          />
        </div>

        <div className={styles.formGroup}>
          <label>Vencimiento de Cobertura</label>
          <input
            type="date"
            value={formData.coverageExpiry}
            onChange={(e) =>
              handleInputChange("coverageExpiry", e.target.value)
            }
          />
        </div>

        {/* Banking Information */}
        {(() => {
          const a = attachHandlers("cbuImg", "Adjuntar CBU");
          return (
            <FieldWithAttach label="CBU" htmlFor="cbu" attach={a.node}>
              <input
                id="cbu"
                type="text"
                value={formData.cbu}
                onChange={(e) => handleInputChange("cbu", e.target.value)}
                placeholder="XXXXXXXXXXXXXXXXXXXXXXXX"
              />
            </FieldWithAttach>
          );
        })()}

        <div className={`${styles.formGroup} ${styles.fullWidth}`}>
          <small className={styles.hint}>
            Si su CBU cambia, por favor notifíquelo inmediatamente.
          </small>
        </div>

        {/* Membership Status */}
        <div className={styles.checkboxGroup}>
          <label className={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={formData.lifeTime}
              onChange={(e) => handleInputChange("lifeTime", e.target.checked)}
            />
            <span className={styles.checkmark}></span>
            Vitalicio
          </label>
        </div>

        {formData.lifeTime && (
          <div className={styles.formGroup}>
            <label>Fecha Vitalicio</label>
            <input
              type="date"
              value={formData.lifeTimeDate}
              onChange={(e) =>
                handleInputChange("lifeTimeDate", e.target.value)
              }
            />
          </div>
        )}

        <div className={styles.formGroup}>
          <label>Categoría</label>
          <input
            type="text"
            value={formData.category}
            disabled
            className={styles.disabledInput}
          />
        </div>
      </div>
    </div>
  );

  const renderSummary = () => (
    <div className={`${styles.stepContent} fade-in`}>
      <h2>Resumen y Observaciones</h2>

      <div className={styles.summarySection}>
        <h3>Datos Personales</h3>
        <div className={styles.summaryGrid}>
          <div>
            <strong>Nombre:</strong> {formData.firstName} {formData.lastName}
          </div>
          <div>
            <strong>Documento:</strong> {formData.documentType}{" "}
            {formData.documentNumber}
          </div>
          <div>
            <strong>Email:</strong> {formData.email}
          </div>
          <div>
            <strong>Provincia:</strong> {formData.province}
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
          onChange={(e) => handleInputChange("observations", e.target.value)}
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

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return renderPersonalData();
      case 2:
        return renderProfessionalData();
      case 3:
        return renderTaxData();
      case 4:
        return renderSummary();
      default:
        return renderPersonalData();
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.sideBar}>
        <div className={styles.progressSequence}>
          <div className={styles.logo}>
            <img src="/placeholder.svg?height=60&width=100" alt="CMC" />
            <h1>Registro de Socio</h1>
          </div>

          <div className={styles.stepsList}>
            {steps.map((step) => (
              <div
                key={step.id}
                className={`${styles.stepItem} ${
                  currentStep === step.id
                    ? styles.active
                    : currentStep > step.id
                    ? styles.completed
                    : ""
                }`}
              >
                <div className={styles.stepIcon}>
                  {currentStep > step.id ? "✓" : step.icon}
                </div>
                <div className={styles.stepInfo}>
                  <div className={styles.stepNumber}>Paso {step.id}</div>
                  <div className={styles.stepTitle}>{step.title}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className={styles.mainContent}>
        <div className={styles.formContainer}>
          {renderStepContent()}

          <div className={styles.navigationButtons}>
            {currentStep > 1 && (
              <button
                type="button"
                onClick={prevStep}
                className={styles.prevButton}
              >
                ← Atrás
              </button>
            )}

            {currentStep < 4 ? (
              <button
                type="button"
                onClick={nextStep}
                className={styles.nextButton}
              >
                Siguiente →
              </button>
            ) : (
              <button
                type="submit"
                className={styles.submitButton}
                onClick={() => alert("Formulario enviado!")}
              >
                Enviar Solicitud
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Register;
