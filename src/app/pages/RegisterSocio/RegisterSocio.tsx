"use client";
import { buildRegisterPayload, DOC_LABEL_MAP } from "../Register/api";
import { registerMedicoAdmin, uploadMedicoDocumentoAdmin } from "./api";

import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./Register.module.scss";
import LayoutRegister from "../Register/Layout/Layout";
import Steps from "../Register/Steps/Steps";
import type { RegisterFormData } from "../../types/register";
import arPlaces from "../../utils/ar-provinces-localities.json";
import {
  sanitizeField,
  validateStep as validateStepUtil,
  getInputProps,
} from "../../utils/validations";
import Lottie from "lottie-react";

const stepsMeta = [
  { id: 1, title: "Datos Personales", icon: "👤" },
  { id: 2, title: "Datos Profesionales", icon: "🎓" },
  { id: 3, title: "Datos Impositivos", icon: "📋" },
  { id: 4, title: "Resumen", icon: "✓" },
];

const initialForm: RegisterFormData = {
  // documentType: "",  
  documentNumber: "", // ✓
  firstName: "", // ✓
  lastName: "", // ✓
  gender: "", // ✓
  birthDate: "", 
  province: "", // ✓
  locality: "", // ✓
  postalCode: "", // ✓
  address: "", // ✓
  phone: "", // ✓
  mobile: "", // ✓
  email: "", // ✓
  title: "",// ✓
  nationalLicense: "", // ✓
  nationalLicenseDate: "",// ✓
  provincialLicense: "", // ✓
  provincialLicenseDate: "", // ✓
  graduationDate: "", // ✓
  specialty: "", // ✓
  resolutionNumber: "", // ✓
  resolutionDate: "", // ✓ 
  officeAddress: "", // ✓
  officePhone: "", // ✓
  cuit: "", // ✓
  anssal: "", // ✓
  anssalExpiry: "", // ✓
  malpracticeCompany: "", // ✓
  malpracticeExpiry: "", // ✓
  taxCondition: "", 
  cbu: "", // ✓
  malpracticeCoverage: "", // ✓
  coverageExpiry: "", // ✓
  observations: "", 
};

const Register: React.FC = () => {
  const navigate = useNavigate();

  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);
  const [formData, setFormData] = useState<RegisterFormData>(initialForm);
  const [errors, setErrors] = useState<
    Partial<Record<keyof RegisterFormData, string>>
  >({});

  const [provinces, setProvinces] = useState<string[]>([]);
  const [localities, setLocalities] = useState<string[]>([]);
  const [specialties, setSpecialties] = useState<string[]>([]);
  const localitiesCache = useRef<Map<string, string[]>>(new Map());

  const [files, setFiles] = useState<Record<string, File | null>>({});
  const [fileErrs, setFileErrs] = useState<Record<string, string>>({});

  const [askAdherente, setAskAdherente] = useState(false);
  const [animData, setAnimData] = useState<object | null>(null);

  useEffect(() => {
    if (!askAdherente) return;
    (async () => {
      try {
        const mod = await import("../../assets/adherente.json");
        setAnimData(mod.default as object);
      } catch {
        setAnimData(null);
      }
    })();
  }, [askAdherente]);

  useEffect(() => {
    setProvinces(
      Object.keys(arPlaces as Record<string, string[]>).sort((a, b) =>
        a.localeCompare(b, "es", { sensitivity: "base" })
      )
    );
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

  useEffect(() => {
    const p = formData.province?.trim();
    setFormData((prev) => ({ ...prev, locality: "" }));
    if (!p) {
      setLocalities([]);
      return;
    }
    const cached = localitiesCache.current.get(p);
    if (cached) {
      setLocalities(cached);
      return;
    }
    const list = (arPlaces as Record<string, string[]>)[p] || [];
    const sorted = [...list].sort((a, b) =>
      a.localeCompare(b, "es", { sensitivity: "base" })
    );
    localitiesCache.current.set(p, sorted);
    setLocalities(sorted);
  }, [formData.province]);

  const onChange = (field: keyof RegisterFormData, value: string | boolean) => {
    const clean = sanitizeField(field, value);
    setFormData((prev) => ({ ...prev, [field]: clean }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: "" }));
  };

  const validateStep = (step: 1 | 2 | 3 | 4) => {
    const errs = validateStepUtil(step, formData);
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const nextStep = () => {
    if (validateStep(currentStep))
      setCurrentStep((p) => (p < 4 ? ((p + 1) as 1 | 2 | 3 | 4) : p));
  };

  const prevStep = () =>
    setCurrentStep((p) => (p > 1 ? ((p - 1) as 1 | 2 | 3 | 4) : p));

  
  const submitAll = async () => {
    const allErrors = {
      ...validateStepUtil(1, formData),
      ...validateStepUtil(2, formData),
      ...validateStepUtil(3, formData),
    };
    if (Object.keys(allErrors).length) {
      setErrors(allErrors);
      setCurrentStep(1);
      return;
    }

    try {
      // ✅ ahora registerMedico mapea internamente a RegisterPayload
      const payload = buildRegisterPayload(formData);
      // 2) alta admin
      const { medico_id } = await registerMedicoAdmin(payload);  
      // 3) adjuntos
      const entries = Object.entries(files || {});
      for (const [key, file] of entries) {
      if (!(file instanceof File)) continue;
      const label = DOC_LABEL_MAP[key as keyof typeof DOC_LABEL_MAP];
      if (!label) continue;
      await uploadMedicoDocumentoAdmin(medico_id, file, label);
      }

      navigate("/registro/enviado");
    } catch (e: any) {
      const msg = e?.response?.data?.detail ?? e?.message ?? "No se pudo enviar la solicitud";
      alert(typeof msg === "string" ? msg : JSON.stringify(msg));
      console.error("register error:", e);
    }
  };

  return (
    <>
      <LayoutRegister
        steps={stepsMeta}
        currentStep={currentStep}
        onBack={prevStep}
        showBack={currentStep > 1}
        // headerCta={
        //   <button
        //     className={styles.adherenteLink}
        //     onClick={() => navigate("/adherente")}
        //   >
        //     Quiero ser socio adherente
        //   </button>
        // }
      >
        <div className={styles.actionBar}>
          <button className={styles.backBtn} onClick={() => navigate("/users-manager")}>
            Cancelar
          </button>
        </div>

        <Steps
          step={currentStep}
          formData={formData}
          errors={errors}
          provinces={provinces}
          localities={localities}
          specialties={specialties}
          onChange={onChange}
          getInputProps={getInputProps}
          files={files}
          setFiles={setFiles}
          fileErrs={fileErrs}
          setFileErrs={setFileErrs}
        />

        <div className={styles.nav}>
          {currentStep > 1 ? (
            <button className={styles.prev} onClick={prevStep}>
              ← Atrás
            </button>
          ) : (
            <span />
          )}
          {currentStep < 4 ? (
            <button className={styles.next} onClick={nextStep}>
              Siguiente →
            </button>
          ) : (
            <button className={styles.submit} onClick={submitAll}>
              Enviar Solicitud
            </button>
          )}
        </div>
      </LayoutRegister>

      {askAdherente && (
        <div
          className={styles.modalOverlay}
          onClick={() => setAskAdherente(false)}
        >
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.animWrap}>
              {animData ? (
                <Lottie
                  animationData={animData}
                  loop
                  autoplay
                  style={{ width: 140, height: 140 }}
                />
              ) : (
                <svg
                  className={styles.fallbackIcon}
                  viewBox="0 0 120 120"
                  aria-hidden="true"
                >
                  <circle
                    cx="60"
                    cy="60"
                    r="46"
                    fill="none"
                    stroke="#e2e8f0"
                    strokeWidth="4"
                  />
                  <path
                    d="M40 62 L54 74 L82 46"
                    fill="none"
                    stroke="#16a34a"
                    strokeWidth="6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </div>
            <h3>¿Querés ser Socio Adherente?</h3>
            <p>
              Podés completar un formulario más corto si tu categoría es
              Adherente.
            </p>
            <div className={styles.modalActions}>
              <button
                className={styles.secondary}
                onClick={() => setAskAdherente(false)}
              >
                Continuar registro
              </button>
              <button
                className={styles.primary}
                onClick={() => navigate("/adherente")}
              >
                Quiero ser socio adherente
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Register;
