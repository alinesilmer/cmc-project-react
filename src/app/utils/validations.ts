import type { RegisterFormData } from "../types/register";

export type Step = 1 | 2 | 3 | 4;

type ErrorMap = Partial<Record<keyof RegisterFormData, string>>;

const LIMITS = {
  dni: 8,
  maxAgeYears: 100,
  minAgeYears: 20,
  cuit: 11,
  cbu: 22,
};

const NUMERIC_ONLY_FIELDS: (keyof RegisterFormData)[] = [
  "documentNumber",
  "phone",
  "mobile",
  "officePhone",
  "resolutionNumber",
  "cuit",
  "cbu",
  "malpracticeCoverage",
];

const LETTERS_ONLY_FIELDS: (keyof RegisterFormData)[] = [
  "firstName",
  "lastName",
];

const ALPHANUM_SPACE_ONLY_FIELDS: (keyof RegisterFormData)[] = ["address"];

// ──────────────────────────────────────────────
// Sanitizers
// ──────────────────────────────────────────────
export function stripNonDigits(value: string): string {
  return (value || "").replace(/\D+/g, "");
}

export function stripNonLettersAndSpaces(value: string): string {
  return (value || "").replace(/[^\p{L}\s]+/gu, "");
}

export function stripNonAlnumSpaces(value: string): string {
  return (value || "").replace(/[^\p{L}\d\s]+/gu, "");
}

export function sanitizeField(
  name: keyof RegisterFormData | string,
  rawValue: string | boolean
): string {
  const value = String(rawValue ?? "");
  if ((NUMERIC_ONLY_FIELDS as string[]).includes(name as string))
    return stripNonDigits(value);
  if ((LETTERS_ONLY_FIELDS as string[]).includes(name as string))
    return stripNonLettersAndSpaces(value);
  if ((ALPHANUM_SPACE_ONLY_FIELDS as string[]).includes(name as string))
    return stripNonAlnumSpaces(value);
  if (name === "email") return value.trim();
  return value;
}

export function getInputProps(
  name: keyof RegisterFormData | string
): Record<string, unknown> {
  if ((NUMERIC_ONLY_FIELDS as string[]).includes(name as string)) {
    const props: Record<string, unknown> = {
      inputMode: "numeric",
      pattern: "\\d*",
      onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => {
        const allowed = [
          "Backspace",
          "Delete",
          "ArrowLeft",
          "ArrowRight",
          "Tab",
          "Home",
          "End",
        ];
        if (allowed.includes(e.key)) return;
        if (!/^\d$/.test(e.key)) e.preventDefault();
      },
    };
    if (name === "documentNumber") props.maxLength = LIMITS.dni;
    if (name === "cuit") props.maxLength = LIMITS.cuit;
    if (name === "cbu") props.maxLength = LIMITS.cbu;
    return props;
  }
  return {};
}

// ──────────────────────────────────────────────
export function isValidEmail(email: string): boolean {
  return /\S+@\S+\.\S+/.test(email);
}

export function isValidDateString(s: string): boolean {
  const d = new Date(s);
  return !Number.isNaN(d.getTime());
}

export function validateBirthDate(dateStr: string, now = new Date()): string {
  if (!dateStr) return "Ingrese fecha de nacimiento";
  if (!isValidDateString(dateStr)) return "Fecha inválida";

  const dob = new Date(dateStr);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const youngestAllowedDOB = new Date(today);
  youngestAllowedDOB.setFullYear(today.getFullYear() - LIMITS.minAgeYears);

  const oldestAllowedDOB = new Date(today);
  oldestAllowedDOB.setFullYear(today.getFullYear() - LIMITS.maxAgeYears);

  if (dob > today) return "La fecha no puede ser futura";
  if (dob > youngestAllowedDOB) return `Edad no válida`;
  if (dob < oldestAllowedDOB)
    return `Edad no válida (> ${LIMITS.maxAgeYears} años)`;

  return "";
}

export function validateField(
  name: keyof RegisterFormData | string,
  rawValue: string
): string {
  const value = String(rawValue ?? "").trim();

  switch (name) {
    case "documentNumber":
      if (!value) return "Ingrese número de documento";
      if (!/^\d+$/.test(value)) return "Solo números";
      if (value.length !== LIMITS.dni)
        return `Debe tener ${LIMITS.dni} dígitos`;
      return "";

    case "firstName":
    case "lastName":
      if (!value)
        return name === "firstName" ? "Ingrese nombre" : "Ingrese apellido";
      if (!/^[\p{L}\s]+$/u.test(value)) return "Solo letras y espacios";
      return "";

    case "gender":
      return value ? "" : "Seleccione sexo";

    case "birthDate":
      return validateBirthDate(value);

    case "email":
      if (!value) return "Ingrese email";
      if (!isValidEmail(value)) return "Email inválido";
      return "";

    case "address":
      if (!value) return ""; // optional
      if (!/^[\p{L}\d\s]+$/u.test(value))
        return "Solo letras y números (sin símbolos)";
      return "";

    case "phone":
    case "mobile":
    case "officePhone":
      if (!value) return ""; // optional
      if (!/^\d+$/.test(value)) return "Solo números";
      return "";

    case "title":
      return value ? "" : "Ingrese título";

    case "nationalLicense":
      return value ? "" : "Ingrese matrícula nacional";

    case "specialty":
      return value ? "" : "Seleccione especialidad";

    case "resolutionNumber":
      if (!value) return ""; // optional
      if (!/^\d+$/.test(value)) return "Solo números";
      return "";

    case "cuit":
      if (!value) return "Ingrese CUIT";
      if (!/^\d+$/.test(value)) return "Solo números";
      // if (value.length !== LIMITS.cuit) return `Debe tener ${LIMITS.cuit} dígitos`;
      return "";

    case "cbu":
      if (!value) return ""; // optional
      if (!/^\d+$/.test(value)) return "Solo números";
      // if (value.length !== LIMITS.cbu) return `Debe tener ${LIMITS.cbu} dígitos`;
      return "";

    case "malpracticeCoverage":
      if (!value) return ""; // optional
      if (!/^\d+$/.test(value)) return "Solo números";
      return "";

    default:
      return "";
  }
}

// Step validation (strict)
export function validateStep(
  step: Step,
  data: Readonly<Partial<RegisterFormData>>,
  now = new Date()
): ErrorMap {
  const errors: ErrorMap = {};
  const add = (field: keyof RegisterFormData, msg: string) => {
    if (msg) errors[field] = msg;
  };

  if (step === 1) {
    // add("documentType", (data.documentType ?? "") ? "" : "Seleccione tipo de documento");
    // add("documentNumber", validateField("documentNumber", data.documentNumber ?? ""));
    // add("firstName",      validateField("firstName",      data.firstName ?? ""));
    // add("lastName",       validateField("lastName",       data.lastName ?? ""));
    // add("gender",         validateField("gender",         data.gender ?? ""));
    // add("birthDate",      validateBirthDate(data.birthDate ?? "", now));
    // add("email",          validateField("email",          data.email ?? ""));
    // if (data.address) add("address", validateField("address", data.address ?? ""));
    // if (data.phone)   add("phone",   validateField("phone",   data.phone ?? ""));
    // if (data.mobile)  add("mobile",  validateField("mobile",  data.mobile ?? ""));
  }

  if (step === 2) {
    // add("title",            validateField("title",           data.title ?? ""));
    // add("nationalLicense",  validateField("nationalLicense", data.nationalLicense ?? ""));
    // add("specialty",        validateField("specialty",       data.specialty ?? ""));
    // if (data.resolutionNumber) add("resolutionNumber", validateField("resolutionNumber", data.resolutionNumber ?? ""));
    // if (data.officePhone)     add("officePhone",     validateField("officePhone", data.officePhone ?? ""));
    // if (data.officeAddress)   add("officeAddress",   validateField("address",     data.officeAddress ?? ""));
  }

  if (step === 3) {
    // add("cuit",          validateField("cuit",          data.cuit ?? ""));
    // add("taxCondition",  (data.taxCondition ?? "") ? "" : "Seleccione condición impositiva");
    // if (data.cbu)                 add("cbu",                 validateField("cbu",                 data.cbu ?? ""));
    // if (data.malpracticeCoverage) add("malpracticeCoverage", validateField("malpracticeCoverage", data.malpracticeCoverage ?? ""));
    // if (data.phone)               add("phone",               validateField("phone",               data.phone ?? ""));
    // if (data.mobile)              add("mobile",              validateField("mobile",              data.mobile ?? ""));
  }

  return errors;
}
