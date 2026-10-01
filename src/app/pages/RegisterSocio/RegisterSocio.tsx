// src/app/pages/RegisterSocio/index.tsx
"use client";
import React, { useEffect, useState } from "react";
import RegisterBase from "@/app/features/registro/components/RegisterBase";
import { getJSON } from "@/app/shared/lib/http";

const stepsMeta = [
  { id: 1, title: "Datos Personales", icon: "👤" },
  { id: 2, title: "Datos Profesionales", icon: "🎓" },
  { id: 3, title: "Datos Impositivos", icon: "📋" },
  { id: 4, title: "Resumen", icon: "✓" },
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
