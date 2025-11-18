import type { ObrasSocialesFormData } from "../types/obras-sociales";

export function validateObrasSocialesForm(
  data: ObrasSocialesFormData,
  step: number,
  files: Record<string, File | null>
): Partial<Record<keyof ObrasSocialesFormData, string>> {
  const errors: Partial<Record<keyof ObrasSocialesFormData, string>> = {};

  // Step 1: Datos de la Obra Social
  if (step === 1) {
    if (!data.razonSocial.trim()) {
      errors.razonSocial = "La razón social es obligatoria";
    }

    if (!data.cuit.trim()) {
      errors.cuit = "El CUIT es obligatorio";
    } else if (!/^\d{2}-?\d{8}-?\d{1}$/.test(data.cuit)) {
      errors.cuit = "Formato de CUIT inválido (XX-XXXXXXXX-X)";
    }

    if (!data.rne.trim()) {
      errors.rne = "El RNE es obligatorio";
    }

    if (!data.direccionLegal.trim()) {
      errors.direccionLegal = "La dirección legal es obligatoria";
    }

    if (!data.provincia) {
      errors.provincia = "Debe seleccionar una provincia";
    }

    if (!data.localidad) {
      errors.localidad = "Debe seleccionar una localidad";
    }

    if (!data.email.trim()) {
      errors.email = "El email es obligatorio";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      errors.email = "Email inválido";
    }

    if (!data.telefono.trim()) {
      errors.telefono = "El teléfono es obligatorio";
    }

    if (!files.cuitImg) {
      errors.cuit = "Debe adjuntar la constancia de CUIT";
    }
  }

  // Step 2: Representante Legal
  if (step === 2) {
    if (!data.representanteNombre.trim()) {
      errors.representanteNombre = "El nombre del representante es obligatorio";
    }

    if (!data.representanteApellido.trim()) {
      errors.representanteApellido = "El apellido del representante es obligatorio";
    }

    if (!data.representanteDNI.trim()) {
      errors.representanteDNI = "El DNI del representante es obligatorio";
    } else if (!/^\d{7,8}$/.test(data.representanteDNI)) {
      errors.representanteDNI = "DNI inválido (7-8 dígitos sin puntos)";
    }

    if (!data.representanteCargo.trim()) {
      errors.representanteCargo = "El cargo es obligatorio";
    }

    if (!data.representanteEmail.trim()) {
      errors.representanteEmail = "El email del representante es obligatorio";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.representanteEmail)) {
      errors.representanteEmail = "Email inválido";
    }

    if (!data.representanteTelefono.trim()) {
      errors.representanteTelefono = "El teléfono del representante es obligatorio";
    }

    if (!files.representanteDNIImg) {
      errors.representanteDNI = "Debe adjuntar el DNI del representante";
    }

    if (!files.poderLegalImg) {
      errors.representanteCargo = "Debe adjuntar el poder o acta de designación";
    }
  }

  // Step 3: Documentación
  if (step === 3) {
    if (!files.estatutoImg) {
      errors.razonSocial = "Debe adjuntar el estatuto social";
    }

    if (!files.sssImg) {
      errors.razonSocial = "Debe adjuntar la constancia de inscripción SSS";
    }
  }

  return errors;
}
