import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Award,
  Building2,
  Camera,
  ClipboardList,
  FileCheck,
  GraduationCap,
  House,
  IdCard,
  Landmark,
  MessageSquareWarning,
  MonitorCog,
  PenLine,
  Receipt,
  ShieldPlus,
  Stethoscope,
} from "lucide-react";

type Etiqueta = "obligatorio" | "no-obligatorio" | "legalizado" | "simple" | "importante";

export type Requisito = {
  id: string;
  /** Lo que se lee en la tarjeta: dos o tres palabras. */
  corto: string;
  icono: LucideIcon;
  /** El detalle completo, al tocar la tarjeta. */
  text: ReactNode;
  hint?: string;
  tags?: Etiqueta[];
};

// Fuera del componente: antes se volvían a crear en cada render.

export const PRINCIPALES: Requisito[] = [
  {
    id: "1", corto: "Título de médico", icono: GraduationCap,
    text: (
      <>
        Fotocopia del <strong>Título de Médico</strong> (ambos lados) con inscripción de matrículas e
        inscripción en los Ministerios de Educación de la Nación y del Interior.
      </>
    ),
    tags: ["legalizado"],
    hint: "Legalizado por Escribano Público.",
  },
  {
    id: "2", corto: "Título de especialista", icono: Award,
    text: (
      <>
        Fotocopia del <strong>Título de Especialista</strong> y <strong>Resolución Ministerial</strong> de
        la especialidad (o Título de Residencia / Concurrencia / Servicio donde realizó la capacitación).
      </>
    ),
    tags: ["legalizado"],
    hint: "Legalizado por Escribano Público. Emitido por Ministerio de Salud Pública de la Pcia. de Corrientes.",
  },
];

export const COPIAS_SIMPLES: Requisito[] = [
  { id: "3a", corto: "Matrícula provincial", icono: IdCard, text: <>Matrícula Provincial (ambos lados).</>, tags: ["no-obligatorio", "simple"] },
  { id: "3b", corto: "Matrícula nacional", icono: IdCard, text: <>Matrícula Nacional (ambos lados).</>, tags: ["no-obligatorio", "simple"] },
  {
    id: "3c", corto: "DNI con domicilio", icono: House,
    text: (
      <>
        DNI con domicilio actualizado <em>o</em> Constancia Policial de Domicilio.
      </>
    ),
    tags: ["obligatorio", "simple"],
  },
  {
    id: "3d", corto: "Constancia de AFIP", icono: Receipt,
    text: (
      <>
        Inscripción en AFIP (CUIT) indicando condición fiscal (<strong>Monotributista</strong> o{" "}
        <strong>Responsable Inscripto</strong>) y <strong>último recibo de pago</strong>.
      </>
    ),
    tags: ["obligatorio", "simple"],
  },
  { id: "3e", corto: "Inscripción en DGR", icono: Landmark, text: <>Inscripción y Exención en DGR.</>, tags: ["obligatorio", "simple"] },
  {
    id: "3f", corto: "Superintendencia", icono: Building2,
    text: (
      <>
        Trámite de inscripción en la <strong>Superintendencia de Servicios de Salud</strong> (comprobante).
      </>
    ),
    hint: "Presenta un comprobante con plazo de 60 días para el Resuelto. ANSSAL – Ctes. 25 de Mayo Nº 1425 – Tel. 4430148.",
    tags: ["obligatorio", "simple"],
  },
  {
    id: "3g", corto: "Seguro de mala praxis", icono: ShieldPlus,
    text: (
      <>
        Póliza y último recibo de pago del <strong>Seguro de Mala Praxis</strong> (si no lo gestiona el
        Colegio Médico).
      </>
    ),
    tags: ["obligatorio", "simple"],
  },
  {
    id: "3h", corto: "Habilitación del consultorio", icono: Stethoscope,
    text: (
      <>
        <strong>Habilitación Ministerial del consultorio</strong> o nota del director médico del instituto
        que certifique que integra el plantel y que la institución está habilitada por el MSP.
      </>
    ),
    tags: ["obligatorio", "simple"],
  },
  {
    id: "3i", corto: "Aparatología", icono: MonitorCog,
    text: (
      <>
        <strong>Declaración de aparatología</strong> (si realiza prácticas con equipamiento facturable):
        certificado de compra y características.
      </>
    ),
    tags: ["obligatorio", "simple"],
  },
  {
    id: "3j", corto: "Antecedentes ético-gremiales", icono: FileCheck,
    text: (
      <>
        Si estuvo asociado a otro Colegio/Federación: <strong>Certificado de antecedentes Ético-Gremiales</strong>{" "}
        y <strong>Libre Deuda</strong>; caso contrario, <strong>Acta de Declaración</strong> aclarando
        situación.
      </>
    ),
    tags: ["obligatorio", "simple"],
  },
  {
    id: "3k", corto: "Nota al Presidente", icono: PenLine,
    text: (
      <>
        <strong>Nota</strong> dirigida al Presidente del Colegio Médico de Corrientes (Pedro A. Espinoza)
        solicitando su aceptación como socio-prestador.
      </>
    ),
    tags: ["obligatorio", "simple"],
  },
  {
    id: "3l", corto: "Aclaración punto 12", icono: MessageSquareWarning,
    text: (
      <>
        <strong>Aclaración del punto 12</strong>: no presenta certificado de antecedentes Ético-Gremiales
        por motivos fundados.
      </>
    ),
    tags: ["importante", "simple"],
  },
  { id: "3m", corto: "2 fotos carnet", icono: Camera, text: <>Dos fotos tipo carnet.</>, tags: ["obligatorio", "simple"] },
  {
    id: "3n", corto: "Ficha de inscripción", icono: ClipboardList,
    text: (
      <>
        Completar la <strong>ficha de inscripción</strong> provista por la Institución.
      </>
    ),
    tags: ["obligatorio", "simple"],
  },
];

export const ARANCELES = [
  { concepto: "Inscripción", monto: "$ 40.000" },
  { concepto: "Cuota", monto: "$ 8.000" },
];

export const MENSAJE_WHATSAPP =
  "Hola Colegio Médico Corrientes, tengo una consulta sobre los requisitos de ingreso como socio-prestador.";
