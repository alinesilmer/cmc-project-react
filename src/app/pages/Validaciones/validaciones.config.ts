// Catálogo de obras sociales del validador.
//
// Los campos, longitudes y códigos salen de los formularios del sistema legacy
// (`sancor_1.php`, `ospm_1.php`, `omint_1.php`, `boreal_1.php`, `judicial_1.php`,
// `swiss_1.php`, `nobis/nobis.php` y la grilla de `menu.php`). Mantener esta
// tabla alineada con el backend cuando se conecte la API real.

import type { CampoConfig, ObraSocialConfig } from "./validaciones.types";

import logoBoreal from "../../assets/obras-sociales/boreal.png";
import logoIoscor from "../../assets/obras-sociales/ioscor.jpg";
import logoIosfa from "../../assets/obras-sociales/iosfa.jpg";
import logoIssunne from "../../assets/obras-sociales/issunne.png";
import logoMedife from "../../assets/obras-sociales/medife.jpg";
import logoNobis from "../../assets/obras-sociales/nobis.png";
import logoOmint from "../../assets/obras-sociales/omint.png";
import logoOspjn from "../../assets/obras-sociales/ospjn.jpg";
import logoOspm from "../../assets/obras-sociales/ospm.jpg";
import logoPrevencion from "../../assets/obras-sociales/prevencion.jpg";
import logoSancor from "../../assets/obras-sociales/sancor.jpg";
import logoSwiss from "../../assets/obras-sociales/swiss-medical.png";
import logoUpcn from "../../assets/obras-sociales/upcn.png";

// ─── Campos reutilizados entre obras sociales ─────────────────────────────────

const campoCodigo: CampoConfig = {
  name: "codigo",
  label: "Código de prestación",
  tipo: "codigo",
  required: true,
  placeholder: "Buscá por código o descripción",
  // El buscador ya sólo lista lo facturable: el backend descarta los no
  // habilitados y el front saca además los bloqueados por convenio.
  hint: "Solo se listan los códigos que podés facturar en esta obra social",
};

const campoNombreAfiliado: CampoConfig = {
  name: "nombreAfiliado",
  label: "Nombre y apellido del afiliado",
  tipo: "texto",
  required: true,
  maxLength: 40,
  uppercase: true,
  placeholder: "Nombre completo",
};

// ─── Catálogo ─────────────────────────────────────────────────────────────────

export const OBRAS_SOCIALES: ObraSocialConfig[] = [
  {
    slug: "sancor",
    nombre: "Sancor Salud",
    codigo: 411,
    modo: "integrada",
    estado: "operativa",
    validacion: "online",
    protocolo: "SOAP · HL7 v2.4",
    color: "#0f7b3f",
    logo: logoSancor,
    cargaImplementada: true,
    descripcion:
      "Autorización en línea contra el autorizador de Sancor. Requiere el token de la credencial del afiliado.",
    codigosBloqueados: ["180164", "180150"],
    // La sustitución por especialidad decide si 070660 se resuelve en línea:
    // con especialidad 16 se envía como 070715 y Sancor lo autoriza; sin ella,
    // el paciente tiene que ir a las oficinas. El front no conoce las
    // especialidades del médico, así que el aviso va en condicional — antes
    // afirmaba que nunca se autoriza, y se lo mostraba también a quien sí
    // podía validarlo.
    nota: "Según tu especialidad, el código 070660 puede no autorizarse en línea: en ese caso el paciente debe tramitarlo en oficinas de Sancor.",
    campos: [
      {
        name: "nroAfiliado",
        label: "Número de afiliado",
        tipo: "numerico",
        required: true,
        maxLength: 10,
        placeholder: "0012345678",
        hint: "Número principal / dígito verificador",
        sufijo: { name: "barraAfiliado", maxLength: 2, placeholder: "00" },
      },
      {
        name: "token",
        label: "Token de la credencial",
        tipo: "numerico",
        required: true,
        maxLength: 4,
        placeholder: "1234",
        hint: "4 dígitos que muestra la app del afiliado",
      },
      campoCodigo,
    ],
  },
  {
    slug: "ospjn",
    nombre: "OSPJN · Poder Judicial",
    codigo: 151,
    modo: "integrada",
    estado: "operativa",
    validacion: "online",
    protocolo: "REST",
    color: "#1f3a93",
    logo: logoOspjn,
    descripcion:
      "Validación de afiliado y autorización en línea contra el servicio de la Obra Social del Poder Judicial de la Nación.",
    campos: [
      {
        name: "nroAfiliado",
        label: "Número de afiliado",
        tipo: "numerico",
        required: true,
        maxLength: 6,
        placeholder: "000000",
        hint: "Número de afiliado / orden familiar",
        sufijo: { name: "barraAfiliado", maxLength: 2, placeholder: "00" },
      },
      campoCodigo,
    ],
  },
  {
    slug: "nobis",
    nombre: "Nobis Salud",
    codigo: 402,
    modo: "integrada",
    estado: "operativa",
    validacion: "online",
    protocolo: "SOAP · Gecros",
    color: "#7b2d8b",
    logo: logoNobis,
    descripcion:
      "Autorización en línea contra el servicio Gecros de Nobis. Requiere el token de la credencial.",
    campos: [
      {
        name: "nroAfiliado",
        label: "Número de afiliado",
        tipo: "numerico",
        required: true,
        maxLength: 20,
        placeholder: "Número de credencial",
      },
      {
        name: "token",
        label: "Token de la credencial",
        tipo: "numerico",
        required: true,
        maxLength: 4,
        placeholder: "1234",
      },
      campoCodigo,
      {
        name: "cantidad",
        label: "Cantidad",
        tipo: "entero",
        required: true,
        min: 1,
        max: 99,
        placeholder: "1",
      },
    ],
  },
  {
    slug: "ospm",
    nombre: "OSPM · Personal Municipal",
    codigo: 433,
    modo: "integrada",
    estado: "operativa",
    validacion: "online",
    protocolo: "REST",
    color: "#0b7285",
    logo: logoOspm,
    descripcion:
      "Validación por DNI del afiliado. El sistema resuelve el padrón y devuelve la autorización.",
    campos: [
      {
        name: "dni",
        label: "DNI del afiliado",
        tipo: "numerico",
        required: true,
        maxLength: 8,
        placeholder: "30123456",
        hint: "Sin puntos ni espacios",
      },
      campoCodigo,
    ],
  },
  {
    slug: "omint",
    nombre: "Omint",
    codigo: 243,
    modo: "integrada",
    estado: "operativa",
    validacion: "manual",
    color: "#e2711d",
    logo: logoOmint,
    cargaImplementada: true,
    descripcion:
      "Carga de prestaciones ya autorizadas por Omint. El comprobante se rinde con el período mensual.",
    campos: [
      campoNombreAfiliado,
      {
        name: "nroAfiliado",
        label: "Número de afiliado",
        tipo: "numerico",
        required: true,
        maxLength: 20,
        placeholder: "99999999999999",
        hint: "Hasta 20 dígitos",
      },
      campoCodigo,
    ],
  },
  {
    slug: "boreal",
    nombre: "Boreal Salud",
    codigo: 285,
    modo: "integrada",
    estado: "operativa",
    validacion: "manual",
    color: "#2c8c5a",
    logo: logoBoreal,
    cargaImplementada: true,
    descripcion:
      "Carga manual con el número de validación obtenido en el portal de Boreal. Permite adjuntar la orden en PDF.",
    permiteAdjuntarOrden: true,
    campos: [
      {
        name: "nroValidacion",
        label: "Número de validación",
        tipo: "numerico",
        required: true,
        maxLength: 20,
        placeholder: "Número que devolvió Boreal",
        hint: "Es el número de autorización que entrega el portal de Boreal",
      },
      campoNombreAfiliado,
      {
        name: "nroAfiliado",
        label: "Número de afiliado",
        tipo: "numerico",
        required: true,
        maxLength: 20,
        placeholder: "12345678901234",
        sufijo: { name: "barraAfiliado", maxLength: 2, placeholder: "00" },
      },
      {
        name: "coseguro",
        label: "Coseguro",
        tipo: "moneda",
        required: false,
        placeholder: "0,00",
        hint: "Dejalo en 0 si la prestación no tiene coseguro",
      },
      campoCodigo,
    ],
  },

  // ── Portales externos ──────────────────────────────────────────────────────
  // Estas obras sociales no se validan desde el panel: en `menu.php` el enlace
  // sale del sitio del Colegio hacia el portal de la obra social.
  {
    slug: "ioscor",
    nombre: "IOSCOR",
    codigo: null,
    modo: "externa",
    estado: "operativa",
    color: "#1d6fb8",
    logo: logoIoscor,
    descripcion: "Validá en el portal de socios de IOSCOR con tu usuario de prestador.",
    url: "http://socios.comecorammeco.com/users/login",
  },
  {
    slug: "iosfa",
    nombre: "IOSFA",
    codigo: null,
    modo: "externa",
    estado: "operativa",
    color: "#0d5c63",
    logo: logoIosfa,
    descripcion: "Validador web de la Obra Social de las Fuerzas Armadas.",
    url: "http://validador.iosfa.gob.ar:5080/Login/Login.aspx",
  },
  {
    slug: "issunne",
    nombre: "ISSUNNE",
    codigo: null,
    modo: "externa",
    estado: "operativa",
    color: "#8a1538",
    logo: logoIssunne,
    descripcion: "Portal del prestador del Instituto de Seguridad Social de la UNNE.",
    url: "https://portaldelprestador.issunne.unne.edu.ar/",
  },
  {
    slug: "medife",
    nombre: "Medifé",
    codigo: 296,
    modo: "externa",
    estado: "operativa",
    color: "#00a99d",
    logo: logoMedife,
    descripcion: "Validación a través de Traditum, la plataforma que usa Medifé.",
    url: "https://menu.traditum.com/View/Main.aspx",
  },
  {
    slug: "prevencion-salud",
    nombre: "Prevención Salud",
    codigo: null,
    modo: "externa",
    estado: "operativa",
    color: "#e30613",
    logo: logoPrevencion,
    descripcion:
      "El Colegio tiene su propia página de Prevención Salud con la información del convenio; la validación se hace en la autogestión de prestadores.",
    sitioCmc: "/prevencion-salud",
    url: "https://autogestionprestadores.prevencionsalud.com.ar/Validations/AuthorizationRequest",
  },
  {
    slug: "swiss-medical",
    nombre: "Swiss Medical",
    codigo: 256,
    modo: "externa",
    estado: "operativa",
    color: "#c8102e",
    logo: logoSwiss,
    descripcion:
      "Las prestaciones y órdenes se cargan en el portal de prestadores de Swiss Medical, con tu usuario propio.",
    url: "https://www.swissmedical.com.ar/prestadores/",
    nota: "¿Todavía no tenés usuario? El Colegio te da tu N° de Prestador y la guía de registro paso a paso.",
  },
  {
    slug: "upcn",
    nombre: "UPCN · Unión Personal",
    codigo: null,
    modo: "externa",
    estado: "operativa",
    color: "#c4973a",
    logo: logoUpcn,
    descripcion:
      "Centro de atención de Unión Personal. Consultá en el Colegio el usuario y la clave compartida.",
    url: "https://centro.unionpersonal.com.ar/appHMS/ca_web_prod/login.php",
    nota: "Cargá sólo el número de afiliado, la versión de credencial y el plan; después el código de consulta 420101.",
  },
];

export const getObraSocial = (slug?: string) =>
  OBRAS_SOCIALES.find((os) => os.slug === slug);

/** Se validan y cargan desde el panel. */
export const OBRAS_INTEGRADAS = OBRAS_SOCIALES.filter((os) => os.modo === "integrada");

/** Se validan fuera del panel (portal de la obra social o página del Colegio). */
export const OBRAS_EXTERNAS = OBRAS_SOCIALES.filter((os) => os.modo === "externa");

/** Destino recomendado para una obra social externa. */
export const destinoExterno = (os: ObraSocialConfig) => ({
  href: os.sitioCmc ?? os.url ?? "#",
  /** `true` cuando el destino es una página del propio sitio del Colegio. */
  interno: Boolean(os.sitioCmc),
});
