import type { RegisterFormData } from "@/app/types/register";

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
function stripNonDigits(value: string): string {
  return (value || "").replace(/\D+/g, "");
}

function stripNonLettersAndSpaces(value: string): string {
  return (value || "").replace(/[^\p{L}\s]+/gu, "");
}

function stripNonAlnumSpaces(value: string): string {
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

// La validación bloqueante por paso está desactivada: el alta avanza aunque haya campos vacíos.
export function validateStep(
  _step: Step,
  _data: Readonly<Partial<RegisterFormData>>
): ErrorMap {
  return {};
}
