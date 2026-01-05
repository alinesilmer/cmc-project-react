// src/app/types/filters.ts

export type FilterSelection = {
  columns: string[];
  vencimientos: {
    malapraxisVencida: boolean;
    malapraxisPorVencer: boolean;
    anssalVencido: boolean;
    anssalPorVencer: boolean;
    coberturaVencida: boolean;
    coberturaPorVencer: boolean;
    fechaDesde?: string;
    fechaHasta?: string;
    // 0 = sin rango rápido; 30/60/90 = próximos N días
    dias: number;
  };
  otros: {
    sexo: string;
    estado: string;
    adherente: string;
    provincia: string;
    localidad: string;
    especialidad: string;
    categoria: string;
    condicionImpositiva: string;
    fechaIngresoDesde: string;
    fechaIngresoHasta: string;
  };
};

// Estado inicial coherente con el tipo (dias = 0 => “sin rango”)
export const initialFilters: FilterSelection = {
  columns: [],
  vencimientos: {
    malapraxisVencida: false,
    malapraxisPorVencer: false,
    anssalVencido: false,
    anssalPorVencer: false,
    coberturaVencida: false,
    coberturaPorVencer: false,
    fechaDesde: "",
    fechaHasta: "",
    dias: 0,
  },
  otros: {
    sexo: "",
    estado: "",
    adherente: "",
    provincia: "",
    localidad: "",
    especialidad: "",
    categoria: "",
    condicionImpositiva: "",
    fechaIngresoDesde: "",
    fechaIngresoHasta: "",
  },
};
