// src/app/register/hooks/useRegisterForm.ts
import { useEffect, useRef, useState } from "react";
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

// ⬇️ NUEVO: mini API admin
import {
  saveContinueAdmin,
  // opcional: setExisteAdmin,
} from "../../pages/RegisterSocio/api";

type Mode = "public" | "admin";

// Cambiá esto si tu ruta de detalle es otra (p.ej. "/panel/medicos")
const DETAIL_ROUTE_PREFIX = "/doctors";

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

  // ⬇️ NUEVO: id del médico creado/actualizado en admin
  const [medicoId, setMedicoId] = useState<number | null>(null);

  // Provincias
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

  // Construye specialties payload desde principal + extras (se usa solo en público)
  const buildSpecialtiesPayload = () => {
    const mainColegioId = Number(formData.specialty || 0);
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

  // ⬇️ NUEVO: helper para no mandar strings vacíos
  const toUndef = (v?: string) => (v && `${v}`.trim() !== "" ? v : undefined);

  // ⬇️ NUEVO: payload parcial (admin)
  const buildPartialPayload = () => {
    return {
      // Identificación
      documentType: toUndef((formData as any).documentType), // si existiera
      documentNumber: toUndef(formData.documentNumber),
      firstName: toUndef(formData.firstName),
      lastName: toUndef(formData.lastName),
      gender: toUndef(formData.gender),
      birthDate: toUndef(formData.birthDate),

      // Contacto
      phone: toUndef(formData.phone || formData.mobile),
      altPhone: toUndef(formData.mobile),
      email: toUndef(formData.email),

      // Domicilio
      address: toUndef(formData.address),
      province: toUndef(formData.province),
      locality: toUndef(formData.locality),
      postalCode: toUndef(formData.postalCode),

      // Profesionales (mapeo a tu backend)
      matriculaNac: toUndef(formData.nationalLicense),
      matriculaProv: toUndef(formData.provincialLicense),
      // joinDate: toUndef(formData.graduationDate), // si querés mapearlo

      // Fiscales / Seguros
      cuit: toUndef(formData.cuit),
      taxCondition: toUndef(formData.taxCondition),
      anssal: toUndef(formData.anssal),
      anssalExpiry: toUndef(formData.anssalExpiry),
      malpracticeCompany: toUndef(formData.malpracticeCompany),
      malpracticeExpiry: toUndef(formData.malpracticeExpiry),
      cbu: toUndef(formData.cbu),

      // Otros
      observations: toUndef(formData.observations),
    };
  };

  // ⬇️ NUEVO: Guardar y continuar (ADMIN)
  const saveAndContinue = async () => {
    if (mode !== "admin") return;

    // Validá el paso actual (no rompemos tu UX)
    if (!validateStep(step)) return;

    const payload = buildPartialPayload();

    try {
      const res = await saveContinueAdmin(
        medicoId ? { medico_id: medicoId, ...payload } : payload
      );
      if (!medicoId) setMedicoId(res.medico_id);
      // Avanzamos solo si el botón es "Guardar y continuar"
      setStep((s) => (s < 4 ? ((s + 1) as any) : s));
    } catch (e: any) {
      const msg =
        e?.response?.data?.detail ??
        e?.message ??
        "No se pudo guardar el borrador";
      alert(typeof msg === "string" ? msg : JSON.stringify(msg));
      console.error("saveAndContinue error:", e);
    }
  };

  // ⬇️ NUEVO: Guardar y terminar (ADMIN) — guarda, sube adjuntos (si hay) y redirige al detalle
  const saveAndFinish = async () => {
    if (mode !== "admin") return;

    // Asegurá que exista el médico y que el último step quede guardado
    if (!medicoId) {
      await saveAndContinue();
    } else {
      // si cambió algo en el último paso y querés forzar guardado:
      const payload = buildPartialPayload();
      if (Object.values(payload).some((v) => v !== undefined)) {
        try {
          await saveContinueAdmin({ medico_id: medicoId, ...payload });
        } catch (e) {
          // si falla el guardado final, igual evitamos quedar en limbo
          console.error("final patch failed:", e);
        }
      }
    }

    // Subí adjuntos si fueron cargados en el wizard
    try {
      if (medicoId) {
        for (const [key, file] of Object.entries(files || {})) {
          if (!(file instanceof File)) continue;
          const label = DOC_LABEL_MAP[key] ?? key;
          await uploadMedicoDocumento(medicoId, file, label);
        }
      }
    } catch (e) {
      console.warn("Documentos con error, continúo con la redirección:", e);
      // Igual redireccionamos: luego puede usar "Agregar documento" en el perfil
    }

    // Redirigir al detalle del médico
    navigate(`${DETAIL_ROUTE_PREFIX}/${medicoId!}`);
  };

  // Submit unificado (público intacto; admin redirige a saveAndFinish para compatibilidad)
  const submitAll = async () => {
    // Público: igual que antes
    if (mode === "public") {
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
        const { medico_id } = await registerPublic(
          formData,
          specialtiesPayload
        );

        for (const [key, file] of Object.entries(files || {})) {
          if (!(file instanceof File)) continue;
          const label = DOC_LABEL_MAP[key] ?? key;
          await uploadMedicoDocumento(medico_id, file, label);
        }
        navigate("/");
      } catch (e: any) {
        const msg =
          e?.response?.data?.detail ??
          e?.message ??
          "No se pudo enviar la solicitud";
        alert(typeof msg === "string" ? msg : JSON.stringify(msg));
        console.error("register (public) error:", e);
      }
      return;
    }

    // Admin: para no romper componentes que aún llaman submitAll()
    await saveAndFinish();
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

    // NUEVO: flujo admin
    medicoId,
    setMedicoId,
    saveAndContinue,
    saveAndFinish,

    // acción final (público intacto, admin delega)
    submitAll,
  };
}
