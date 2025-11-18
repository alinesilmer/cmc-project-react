export type ObrasSocialesFormData = {
  // Datos de la Obra Social
  razonSocial: string;
  nombreFantasia: string;
  cuit: string;
  rne: string;
  direccionLegal: string;
  provincia: string;
  localidad: string;
  codigoPostal: string;
  email: string;
  telefono: string;
  telefonoAlternativo: string;
  sitioWeb: string;

  // Datos del Representante Legal
  representanteNombre: string;
  representanteApellido: string;
  representanteDNI: string;
  representanteCargo: string;
  representanteEmail: string;
  representanteTelefono: string;

  // Documentación y otros
  cantidadAfiliados: string;
  observaciones: string;
};

export const initialObrasSocialesFormData: ObrasSocialesFormData = {
  razonSocial: "",
  nombreFantasia: "",
  cuit: "",
  rne: "",
  direccionLegal: "",
  provincia: "",
  localidad: "",
  codigoPostal: "",
  email: "",
  telefono: "",
  telefonoAlternativo: "",
  sitioWeb: "",
  representanteNombre: "",
  representanteApellido: "",
  representanteDNI: "",
  representanteCargo: "",
  representanteEmail: "",
  representanteTelefono: "",
  cantidadAfiliados: "",
  observaciones: "",
};
