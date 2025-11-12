"use client";
// arriba de todo
import { registerMedico, DOC_LABEL_MAP, uploadMedicoDocumento } from "./api";
import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./Register.module.scss";
import LayoutRegister from "./Layout/Layout";
import Steps from "./Steps/Steps";
import type { RegisterFormData, SpecialtyItem } from "../../types/register";
import arPlaces from "../../utils/ar-provinces-localities.json";
import {
  sanitizeField,
  validateStep as validateStepUtil,
  getInputProps,
} from "../../utils/validations";
import Lottie from "lottie-react";
import { getJSON } from "../../lib/http";

const stepsMeta = [
  { id: 1, title: "Datos Personales", icon: "👤" },
  { id: 2, title: "Datos Profesionales", icon: "🎓" },
  { id: 3, title: "Datos Impositivos", icon: "📋" },
  { id: 4, title: "Resumen", icon: "✓" },
];
// const LABEL_MAP: Record<string, string> = {
//   docNumberImg: "documento",
//   tituloImg: "titulo",
//   matNacImg: "matricula_nac",
//   matProvImg: "matricula_prov",
//   resolucionImg: "resolucion",
//   habMunicipal: "habilitacion_municipal",
//   cuitImg: "cuit",
//   condImpImg: "condicion_impositiva",
//   anssalImg: "anssal",
//   polizaImg: "malapraxis",
//   cbuImg: "cbu",
// };

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
  title: "", // ✓
  nationalLicense: "", // ✓
  nationalLicenseDate: "", // ✓
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
type EspecialidadDTO = { id: number; id_colegio_espe: number; nombre: string };

type UISpecialty = { id: number; id_colegio_espe: number; nombre: string };

// normalizador robusto (acepta strings u objetos variados)
const normalizeSpecialties = (data: any[]): UISpecialty[] =>
  (Array.isArray(data) ? data : []).map((it, idx) => {
    if (typeof it === "string") {
      // si tu backend devuelve sólo nombres, usamos índices como IDs (ajusta si tenés mapeo real)
      const n = idx + 1;
      return { id: n, id_colegio_espe: n, nombre: it };
    }
    return {
      id: Number(it.id ?? it.ID ?? idx + 1),
      id_colegio_espe: Number(
        it.id_colegio_espe ?? it.ID_COLEGIO_ESPE ?? it.id ?? idx + 1
      ),
      nombre: String(it.nombre ?? it.NOMBRE ?? it.name ?? ""),
    };
  });

const Register: React.FC = () => {
  const navigate = useNavigate();

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [formData, setFormData] = useState<RegisterFormData>(initialForm);
  const [errors, setErrors] = useState<
    Partial<Record<keyof RegisterFormData, string>>
  >({});

  const [provinces, setProvinces] = useState<string[]>([]);
  const [localities, setLocalities] = useState<string[]>([]);
  const [specialties, setSpecialties] = useState<EspecialidadDTO[]>([]);
  const localitiesCache = useRef<Map<string, string[]>>(new Map());

  const [files, setFiles] = useState<Record<string, File | null>>({});
  const [specItems, setSpecItems] = useState<SpecialtyItem[]>([]);

  const [fileErrs, setFileErrs] = useState<Record<string, string>>({});

  const [askAdherente, setAskAdherente] = useState(true);
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
    (async () => {
      try {
        const data = await getJSON<UISpecialty[]>("/api/especialidades/");
        setSpecialties(data);
      } catch (e) {
        setSpecialties([]);
      }
    })();
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
    if (validateStep(step))
      setStep((p) => (p < 4 ? ((p + 1) as 1 | 2 | 3 | 4) : p));
  };

  const prevStep = () =>
    setStep((p) => (p > 1 ? ((p - 1) as 1 | 2 | 3 | 4) : p));

  const submitAll = async () => {
    const allErrors = {
      ...validateStepUtil(1, formData),
      ...validateStepUtil(2, formData),
      ...validateStepUtil(3, formData),
    };
    if (Object.keys(allErrors).length) {
      setErrors(allErrors);
      setStep(1);
      return;
    }

    try {
      // Mapa rapido id_tabla => id_colegio_espe desde el dropdown
      const colegioById: Record<number, number> = Object.fromEntries(
        (specialties || []).map((s) => [
          Number(s.id),
          Number(s.id_colegio_espe),
        ])
      );

      // 1) Principal (si existe)
      const mainId = Number(formData.specialty || 0);
      const mainItem = mainId
        ? {
            id_colegio_espe: colegioById[mainId] || 0,
            n_resolucion: formData.resolutionNumber || undefined,
            fecha_resolucion: formData.resolutionDate || undefined,
            adjunto: undefined,
          }
        : undefined;

      // 2) Extras (ya vienen con id_colegio_espe en specItems)
      const extras = (specItems || []).map((it, idx) => ({
        id_colegio_espe: Number(it.id_colegio_espe),
        n_resolucion: it.resolutionNumber || undefined,
        fecha_resolucion: it.resolutionDate || undefined,
        adjunto: undefined,
      }));

      const specialtiesPayload = [
        ...(mainItem ? [mainItem] : []),
        ...extras,
      ].slice(0, 6);

      // Enviar specialties junto con el form
      const res = await registerMedico(formData, specialtiesPayload);
      const medicoId = res.medico_id;

      // Subir adjuntos
      for (const [key, file] of Object.entries(files || {})) {
        if (!(file instanceof File)) continue;
        // Usa mapping si existe, o manda el key tal cual (p.ej. "resolucion_1")
        const label = DOC_LABEL_MAP[key] ?? key;
        await uploadMedicoDocumento(medicoId, file, label);
      }

      navigate("/registro/enviado");
    } catch (e: any) {
      const msg =
        e?.response?.data?.detail ??
        e?.message ??
        "No se pudo enviar la solicitud";
      alert(typeof msg === "string" ? msg : JSON.stringify(msg));
      console.error("register error:", e);
    }
  };

  return (
    <>
      <LayoutRegister
        steps={stepsMeta}
        currentStep={step}
        onBack={prevStep}
        showBack={step > 1}
        headerCta={
          <button
            className={styles.adherenteLink}
            onClick={() => navigate("/adherente")}
          >
            Quiero ser socio adherente
          </button>
        }
      >
        <div className={styles.actionBar}>
          <button className={styles.backBtn} onClick={() => navigate("/login")}>
            Cancelar
          </button>
        </div>

        <Steps
          step={step}
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
          specItems={specItems}
          setSpecItems={setSpecItems}
        />

        <div className={styles.nav}>
          {step > 1 ? (
            <button className={styles.prev} onClick={prevStep}>
              ← Atrás
            </button>
          ) : (
            <span />
          )}
          {step < 4 ? (
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
