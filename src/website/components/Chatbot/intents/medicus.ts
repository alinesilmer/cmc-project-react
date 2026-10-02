import type { Intent } from "../chatbot.types";

/** MEDICUS — Fuerzas de Seguridad: el menú y sus subtemas. */
export const INTENTS_MEDICUS: Intent[] = [
  {
    id: "medicus_menu",
    keywords: [
      "medicus fuerzas",
      "medicus gendarmeria",
      "medicus prefectura",
      "medicus seguridad",
      "fuerzas seguridad medicus",
      "gendarmeria prefectura medicus",
    ],
    chipLabel: "MEDICUS Fuerzas de Seguridad",
    answer:
      "Sobre MEDICUS — Fuerzas de Seguridad (Gendarmería Nacional y Prefectura Naval), " +
      "¿qué desea consultar?",
    menuOptions: [
      {
        label: "1. Planes MS1 y MS2",
        query: "Cuáles son los planes MS1 y MS2 de MEDICUS",
      },
      {
        label: "2. Copagos del plan MS1",
        query: "Cuáles son los copagos MS1 MEDICUS",
      },
      {
        label: "3. Exclusiones de copago",
        query: "Quiénes están excluidos del copago MEDICUS",
      },
      {
        label: "4. Autorizaciones y facturación",
        query: "Cómo pedir autorización MEDICUS y cómo facturar",
      },
      {
        label: "5. Usuario y contraseña",
        query: "credenciales osfa iosfa usuario contrasena validacion",
      },
    ],
    links: [
      { label: "Ver Preguntas Frecuentes", href: "/preguntas-frecuentes" },
    ],
  },
  {
    id: "medicus_planes",
    keywords: [
      "planes ms1",
      "plan ms1",
      "plan ms2",
      "ms1 y ms2",
      "que es ms1",
      "que es ms2",
      "diferencia ms1",
      "cobertura ms1",
      "cobertura ms2",
      "internacion ms1",
      "internacion ms2",
      "cuales son los planes ms1",
    ],
    answer:
      "MEDICUS incorporó afiliados de las Fuerzas de Seguridad Nacionales " +
      "(Gendarmería y Prefectura) desde el 1° de junio de 2026. Los planes son:\n\n" +
      "• MS1: tiene copagos en consultas y prácticas ambulatorias. " +
      "Internación en habitación compartida.\n" +
      "• MS2: sin copagos. Internación en habitación individual.\n\n" +
      "Los afiliados deben presentar credencial vigente de MEDICUS.",
    links: [
      { label: "Ver Preguntas Frecuentes", href: "/preguntas-frecuentes" },
    ],
  },
  {
    id: "medicus_copagos",
    keywords: [
      "copago medicus",
      "copagos medicus",
      "copago ms1",
      "copagos ms1",
      "cuanto paga medicus",
      "cuanto es el copago",
      "tabla copago",
      "valor copago",
      "cuales son los copagos ms1",
    ],
    answer:
      "Copagos vigentes del Plan MS1 (desde junio 2026):\n\n" +
      "• $35.000 — Cirugías ambulatorias, endoscopías, CPRE, broncoscopías.\n" +
      "• $20.000 — Consultas médicas, especialistas, psicología, ecografías, " +
      "tomografías, resonancias, imágenes especiales, laboratorio (por receta), " +
      "odontología, y prácticas de cardiología, dermatología, ginecología, " +
      "oftalmología, traumatología y otras especialidades.\n" +
      "• $10.000 — Radiología (por receta), fonoaudiología, kinesiología, nutrición.\n\n" +
      "El Plan MS2 no tiene copagos.",
    links: [
      { label: "Ver Preguntas Frecuentes", href: "/preguntas-frecuentes" },
    ],
  },
  {
    id: "medicus_exclusiones",
    keywords: [
      "excluidos del copago",
      "excluido copago",
      "exclusion copago",
      "exclusiones medicus",
      "sin copago medicus",
      "quienes no pagan",
      "quienes estan excluidos",
      "oncologia copago",
      "embarazo copago",
      "cud copago",
    ],
    answer:
      "Están excluidos de copagos en el Plan MS1:\n\n" +
      "• Pacientes oncológicos u oncohematológicos.\n" +
      "• Pacientes en cuidados paliativos.\n" +
      "• HIV, diálisis, trasplantados, tratamientos de fertilidad.\n" +
      "• Plan materno infantil: embarazo, parto, puerperio y niños hasta 3 años.\n" +
      "• Titulares de CUD (Certificado Único de Discapacidad).\n\n" +
      "También excluidas en contexto preventivo: PAP y mamografía.\n" +
      "Las prestaciones realizadas en guardia sí llevan copago.",
    links: [
      { label: "Ver Preguntas Frecuentes", href: "/preguntas-frecuentes" },
    ],
  },
  {
    id: "medicus_osfa",
    keywords: [
      "credenciales osfa",
      "credenciales iosfa",
      "usuario osfa",
      "contrasena osfa",
      "clave osfa",
      "usuario iosfa",
      "contrasena iosfa",
      "clave iosfa",
      "osfa validacion",
      "iosfa validacion",
      "credenciales osfa iosfa usuario contrasena validacion",
      "fuerzas armadas usuario",
      "fuerzas armadas contrasena",
    ],
    answer:
      "Para ingresar al sistema de validación de OSFA (ex IOSFA — Fuerzas Armadas), " +
      "tanto el usuario como la contraseña son el CUIT del Colegio Médico con guiones:\n\n" +
      "👤 Usuario: 3-57319069-2\n" +
      "🔑 Contraseña: 3-57319069-2",
    links: [
      { label: "Ver Preguntas Frecuentes", href: "/preguntas-frecuentes" },
    ],
  },
  {
    id: "medicus_autorizaciones",
    keywords: [
      "autorizacion medicus",
      "autorizaciones medicus",
      "autorizar medicus",
      "como autorizo medicus",
      "facturar medicus",
      "facturacion medicus",
      "receta medicus",
      "membrete medicus",
      "como pedir autorizacion medicus",
      "autorizacionesplanms",
    ],
    answer:
      "Para solicitar autorizaciones de MEDICUS — Fuerzas de Seguridad:\n\n" +
      "📧 autorizacionesplanms@medicus.com.ar\n" +
      "📱 El afiliado también puede tramitarla por la app de MEDICUS.\n\n" +
      "Para facturar: las prestaciones deben registrarse en recetario con " +
      "membrete profesional. En cada orden debe constar el importe percibido " +
      "en concepto de copago cuando corresponda.",
    links: [
      { label: "Ver Preguntas Frecuentes", href: "/preguntas-frecuentes" },
    ],
  },
];
