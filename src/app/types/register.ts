export type SpecialtyItem = {
  // guardamos el ID_COLEGIO_ESPE directo (recomendado)
  id_colegio_espe: number;
  resolutionNumber?: string;
  resolutionDate?: string; // dd-MM-yyyy en UI (lo formateamos al mandar)
  fileKey?: string;        // ej: "resolucion_1"
};

export interface RegisterFormData {
  // documentType: string;
  documentNumber: string;
  firstName: string;
  lastName: string;
  gender: string;
  birthDate: string;

  province: string;
  locality: string; 
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

  observations: string;
  specialties?: SpecialtyItem[];
}
