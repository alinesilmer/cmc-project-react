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
}
