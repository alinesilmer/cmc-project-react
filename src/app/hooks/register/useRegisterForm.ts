// src/app/register/hooks/useRegisterForm.ts
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { RegisterFormData, SpecialtyItem } from "../../types/register";
import arPlaces from "../../utils/ar-provinces-localities.json";

import {
  sanitizeField,
  validateStep as validateStepUtil,
  getInputProps,
} from "../../utils/validations";

import {
  registerMedico as registerPublic,
  uploadMedicoDocumento,
  DOC_LABEL_MAP,
} from "../../pages/Register/api";

import { registerMedicoAdmin as registerAdmin } from "../../pages/RegisterSocio/api";

type Mode = "public" | "admin";

export function useRegisterForm(
  mode: Mode,
  opts?: { showAdherentePrompt?: boolean }
) {
  const navigate = useNavigate();

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [formData, setFormData] = useState<RegisterFormData>({
    documentNumber: "",
    firstName: "",
    lastName: "",
    gender: "",
    birthDate: "",
    province: "",
    locality: "",
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
    observations: "",
  });

  const [errors, setErrors] = useState<
    Partial<Record<keyof RegisterFormData, string>>
  >({});
  const [files, setFiles] = useState<Record<string, File | null>>({});
  const [fileErrs, setFileErrs] = useState<Record<string, string>>({});
  const [specItems, setSpecItems] = useState<SpecialtyItem[]>([]);
  const [provinces, setProvinces] = useState<string[]>([]);
  const [localities, setLocalities] = useState<string[]>([]);
  const localitiesCache = useRef<Map<string, string[]>>(new Map());
  const [askAdherente, setAskAdherente] = useState(
    Boolean(opts?.showAdherentePrompt)
  );

  // Provincias (derívalas si ya las tenés en otro lado)
  useEffect(() => {
    const provs = Object.keys(arPlaces || {}).sort((a, b) =>
      a.localeCompare(b, "es", { sensitivity: "base" })
    );
    setProvinces(provs);
  }, []);

  // Localidades por provincia
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

  const validateStep = (s: 1 | 2 | 3 | 4) => {
    const errs = validateStepUtil(s, formData);
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const nextStep = () => {
    if (validateStep(step)) setStep((p) => (p < 4 ? ((p + 1) as any) : p));
  };
  const prevStep = () => setStep((p) => (p > 1 ? ((p - 1) as any) : p));

  // Construye specialties payload desde principal + extras
  const buildSpecialtiesPayload = () => {
    const mainColegioId = Number(formData.specialty || 0); // ya es ID_COLEGIO_ESPE
    const mainItem = mainColegioId
      ? {
          id_colegio_espe: mainColegioId,
          n_resolucion: formData.resolutionNumber || undefined,
          fecha_resolucion: formData.resolutionDate || undefined,
          adjunto: undefined as string | undefined,
        }
      : undefined;

    const extras = (specItems || []).map((it) => ({
      id_colegio_espe: Number(it.id_colegio_espe || 0),
      n_resolucion: it.resolutionNumber || undefined,
      fecha_resolucion: it.resolutionDate || undefined,
      adjunto: undefined as string | undefined,
    }));

    return [...(mainItem ? [mainItem] : []), ...extras].slice(0, 6);
  };

  // Submit unificado (usa endpoint según mode)
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
      const specialtiesPayload = buildSpecialtiesPayload();

      // Llamada al endpoint correcto
      const apiCall =
        mode === "admin"
          ? (form: any, specs: any[]) => registerAdmin(form, specs)
          : (form: any, specs: any[]) => registerPublic(form, specs);

      const { medico_id } = await apiCall(formData, specialtiesPayload);

      // Adjuntos
      for (const [key, file] of Object.entries(files || {})) {
        if (!(file instanceof File)) continue;
        const label = DOC_LABEL_MAP[key] ?? key;
        await uploadMedicoDocumento(medico_id, file, label);
      }
      mode === "admin" ? navigate("/panel/solicitudes") : navigate("/");
    } catch (e: any) {
      const msg =
        e?.response?.data?.detail ??
        e?.message ??
        "No se pudo enviar la solicitud";
      alert(typeof msg === "string" ? msg : JSON.stringify(msg));
      console.error("register error:", e);
    }
  };

  return {
    // estado principal
    step,
    setStep,
    nextStep,
    prevStep,
    formData,
    setFormData,
    errors,
    setErrors,
    files,
    setFiles,
    fileErrs,
    setFileErrs,
    specItems,
    setSpecItems,

    // catálogos
    provinces,
    localities,

    // adherente modal (sólo público)
    askAdherente,
    setAskAdherente,

    // handlers utilitarios
    onChange,
    getInputProps,

    // acción final
    submitAll,
  };
}
