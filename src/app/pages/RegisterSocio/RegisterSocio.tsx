// src/app/pages/RegisterSocio/index.tsx
"use client";
import React, { useEffect, useState } from "react";
import RegisterBase from "@/app/features/registro/components/RegisterBase";
import { FileText, GraduationCap, ListChecks, User } from "lucide-react";
import { getJSON } from "@/app/shared/lib/http";

const stepsMeta = [
  { id: 1, title: "Datos Personales", icon: User },
  { id: 2, title: "Datos Profesionales", icon: GraduationCap },
  { id: 3, title: "Datos Impositivos", icon: FileText },
  { id: 4, title: "Resumen", icon: ListChecks },
];

const RegisterSocioPage: React.FC = () => {
  const [specialties, setSpecialties] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const data = await getJSON<any[]>("/api/especialidades/");
        setSpecialties(data || []);
      } catch {
        setSpecialties([]);
      }
    })();
  }, []);

  return (
    <RegisterBase
      mode="admin"
      showAdherentePrompt={false}
      stepsMeta={stepsMeta}
      specialties={specialties}
    />
  );
};

export default RegisterSocioPage;
