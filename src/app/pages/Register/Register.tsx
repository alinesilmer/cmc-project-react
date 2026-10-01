// src/app/pages/Register/index.tsx
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

const RegisterPage: React.FC = () => {
  const [specialties, setSpecialties] = useState<any[]>([]);
  const [animData, setAnimData] = useState<object | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const data = await getJSON<any[]>("/api/especialidades/");
        setSpecialties(data || []);
      } catch {
        setSpecialties([]);
      }
      try {
        const mod = await import("../../assets/adherenteDoctor.json");
        setAnimData(mod.default);
      } catch {
        setAnimData(null);
      }
    })();
  }, []);

  return (
    <RegisterBase
      mode="public"
      showAdherentePrompt
      stepsMeta={stepsMeta}
      specialties={specialties}
      adherenteAnim={animData}
    />
  );
};

export default RegisterPage;
