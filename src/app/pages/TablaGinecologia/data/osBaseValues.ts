/** Known base values ($ per unit) keyed by nro_obrasocial string. */
export const OS_BASE_VALUES: Record<string, number> = {
  "134": 346.22,
  "16":  400,
  "27":  400,
  "62":  360.03,
  "423": 345,
  "355": 345,
  "17":  361.62,
  "433": 303.60,
  "425": 417.45,
  "426": 345,
  "151": 354.86,
};

/**
 * OS numbers that have practice-level exclusions.
 * Each entry lists the FASGO códigos that are NOT covered.
 */
export const OS_EXCLUSIONS: Record<string, { codigos: string[]; nota: string }> = {
  "425": {
    codigos: ["22.00.02", "22.01.03"],
    nota: "Sin PAP ni Vulvoscopia",
  },
};
