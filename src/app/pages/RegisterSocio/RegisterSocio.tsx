// src/app/pages/RegisterSocio/index.tsx
"use client";
import React, { useEffect, useState } from "react";
import RegisterBase from "@/app/features/registro/components/RegisterBase";
import { FileText, GraduationCap, ListChecks, User } from "lucide-react";
import { listarEspecialidades, type Especialidad } from "./api";

const stepsMeta = [
  { id: 1, title: "Datos Personales", icon: User },
  { id: 2, title: "Datos Profesionales", icon: GraduationCap },
  { id: 3, title: "Datos Impositivos", icon: FileText },
  { id: 4, title: "Resumen", icon: ListChecks },
];

const RegisterSocioPage: React.FC = () => {
  const [specialties, setSpecialties] = useState<Especialidad[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const data = await listarEspecialidades();
        setSpecialties(data || []);
      } catch {
        setSpecialties([]);
      }
    })();
  }, []);

  return (
    <RegisterBase
      mode="admin"
      stepsMeta={stepsMeta}
      specialties={specialties}
    />
  );
};

export default RegisterSocioPage;
