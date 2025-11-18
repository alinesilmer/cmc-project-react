import { useState } from "react";
import type { ObrasSocialesFormData } from "../../types/obras-sociales";
import { initialObrasSocialesFormData } from "../../types/obras-sociales";
import { validateObrasSocialesForm } from "../../lib/obras-sociales-validation";
// import { sendObrasSocialesRegister } from "../../api/obras-sociales-api";

export function useObrasSocialesForm() {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [formData, setFormData] = useState<ObrasSocialesFormData>(
    initialObrasSocialesFormData
  );
  const [errors, setErrors] = useState<
    Partial<Record<keyof ObrasSocialesFormData, string>>
  >({});
  const [files, setFiles] = useState<Record<string, File | null>>({
    cuitImg: null,
    representanteDNIImg: null,
    poderLegalImg: null,
    estatutoImg: null,
    sssImg: null,
    afipImg: null,
  });
  const [fileErrs, setFileErrs] = useState<Record<string, string>>({});

  // Mock provinces and localities
  const [provinces] = useState([
    "Buenos Aires",
    "Corrientes",
    "CABA",
    "Córdoba",
    "Santa Fe",
  ]);
  const [localities, setLocalities] = useState<string[]>([]);

  const onChange = (field: keyof ObrasSocialesFormData, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: "" }));

    // Update localities when province changes
    if (field === "provincia" && typeof value === "string") {
      if (value === "Corrientes") {
        setLocalities(["Corrientes Capital", "Goya", "Paso de los Libres"]);
      } else if (value === "Buenos Aires") {
        setLocalities(["La Plata", "Mar del Plata", "Bahía Blanca"]);
      } else {
        setLocalities([]);
      }
      setFormData((prev) => ({ ...prev, localidad: "" }));
    }
  };

  const getInputProps = (field: keyof ObrasSocialesFormData) => {
    return {
      value: formData[field],
      onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
        onChange(field, e.target.value),
    };
  };

  const nextStep = () => {
    const validationErrors = validateObrasSocialesForm(formData, step, files);
    
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    if (step < 3) {
      setStep((prev) => (prev + 1) as 1 | 2 | 3);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const prevStep = () => {
    if (step > 1) {
      setStep((prev) => (prev - 1) as 1 | 2 | 3);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const submitAll = async () => {
    const validationErrors = validateObrasSocialesForm(formData, step, files);
    
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    try {
      // TODO: Uncomment when backend is ready
      // await sendObrasSocialesRegister(formData, files);
      
      console.log("Formulario enviado:", formData);
      console.log("Archivos:", files);
      
      alert("¡Solicitud enviada exitosamente! Recibirá un email de confirmación.");
      
      // Reset form
      setFormData(initialObrasSocialesFormData);
      setFiles({
        cuitImg: null,
        representanteDNIImg: null,
        poderLegalImg: null,
        estatutoImg: null,
        sssImg: null,
        afipImg: null,
      });
      setStep(1);
    } catch (error) {
      console.error("Error al enviar:", error);
      alert("Hubo un error al enviar la solicitud. Por favor, intente nuevamente.");
    }
  };

  return {
    step,
    formData,
    errors,
    provinces,
    localities,
    files,
    setFiles,
    fileErrs,
    setFileErrs,
    onChange,
    getInputProps,
    nextStep,
    prevStep,
    submitAll,
  };
}
