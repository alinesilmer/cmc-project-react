import type { Intent } from "../chatbot.types";
import { APPROVED_LINKS, CONVENIO_EMAIL, CONVENIO_WA_LINK } from "../chatbot.enlaces";

/** Obras sociales: convenios, procedimientos por obra social, autorizaciones y valores. */
export const INTENTS_OBRAS_SOCIALES: Intent[] = [
  {
    id: "obras_sociales_check",
    keywords: [
      // singular
      "trabaja con",
      "trabaja con obra social",
      "funciona con",
      "tiene convenio con",
      "tiene convenio para",
      "atiende con",
      "acepta mi",
      "acepta obra social",
      "cubre con",
      "cubre a",
      "opera con",
      // plural
      "trabajan con",
      "trabajan con obra social",
      "tienen convenio con",
      "tienen convenio para",
      "atienden con",
      "aceptan mi",
      "aceptan obra social",
      "cubren con",
      "operan con",
      // other patterns
      "mi obra social",
      "hay convenio con",
      "hay convenio para",
      "hacen convenio con",
      "estan en convenio",
      "esta en convenio",
      "tienen convenio con",
      "tiene colegio convenio con"
    ],
    answer:
      "El Colegio tiene convenios con diversas obras sociales. " +
      "Consulte el listado completo en la sección Convenios.",
    links: [{ label: "Ver Convenios", href: "/convenios" }],
    asyncAction: "check_obra_social",
  },
  {
    id: "convenio_request",
    keywords: [
      "quiero firmar convenio",
      "firmar convenio",
      "obra social quiere convenio",
      "interesada en convenio",
      "como hacemos convenio",
      "empresa quiere convenio",
      "entidad quiere convenio",
      "iniciar convenio",
      "solicitar convenio",
    ],
    chipLabel: "Firmar convenio",
    answer:
      `Si es una Obra Social o empresa interesada en firmar convenio, ` +
      `puede contactarnos por WhatsApp o enviando su carta de presentación ` +
      `por correo a ${CONVENIO_EMAIL}.`,
    links: [
      { label: "WhatsApp — Convenio", href: CONVENIO_WA_LINK, external: true },
      { label: "Ver Convenios", href: "/convenios" },
    ],
  },
  {
    id: "swiss_medical",
    keywords: [
      "swiss medical",
      "swiss",
      "atender swiss",
      "atiendo swiss",
      "como atiendo con swiss",
      "como atender con swiss",
      "prestador swiss",
      "numero de prestador swiss",
      "usuario swiss",
      "alta swiss",
      "tutorial swiss",
      "plus swiss",
      "sin cobro de plus",
    ],
    chipLabel: "Swiss Medical",
    answer:
      "Para atender pacientes de Swiss Medical:\n\n" +
      "1. Asiente la consulta en la planilla correspondiente y haga firmar " +
      "al paciente.\n" +
      "2. Para generar su usuario en el sistema de Swiss, inicie sesión, " +
      "vaya a su perfil y presione el botón «Obtener usuario SWISS MEDICAL». " +
      "Allí encontrará las instrucciones para crearlo.\n" +
      "3. Si aún no tiene número de prestador, envíe un correo a " +
      "padronescolegiomedico@gmail.com confirmando que atenderá con Swiss " +
      "sin cobro de plus, para tramitar el alta.",
    links: [
      { label: "Ir al sistema", href: APPROVED_LINKS.login, external: true },
    ],
    whatsapp: "padrones",
  },
  {
    id: "union_personal",
    keywords: [
      "union personal",
      "autorizacion union personal",
      "autorizaciones union personal",
      "prestaciones union personal",
      "como autorizo union personal",
      "autorizar union personal",
      "codigo 420101",
      "420101",
    ],
    chipLabel: "Unión Personal",
    answer:
      "Autorizaciones de Unión Personal:\n\n" +
      "El usuario y la clave para autorizar están disponibles en su perfil " +
      "dentro del sistema.\n\n" +
      "1. Ingrese a Menú → Autorizaciones → Prestaciones.\n" +
      "2. Complete únicamente el N° de afiliado, la versión de la credencial " +
      "y el plan; luego ingrese el código de consulta 420101 y presione «Autorizar».\n" +
      "3. Complete todos los datos en un recetario con membrete e incluya el " +
      "N° de autorización como referencia.",
    links: [
      { label: "Ir al sistema", href: APPROVED_LINKS.login, external: true },
    ],
  },
  {
    id: "obras_sociales",
    keywords: [
      "obra social", "obras sociales", "cobertura", "convenio", "convenios",
      "mutual", "prepaga", "osde", "pami", "salud prepaga",
    ],
    chipLabel: "Obras sociales",
    answer:
      "El Colegio tiene convenios con diversas obras sociales y prepagas. " +
      "¿Qué desea consultar?",
    links: [{ label: "Ver listado de convenios", href: "/convenios" }],
    menuOptions: [
      {
        label: "¿Tiene convenio mi obra social?",
        query: "tiene convenio con mi obra social",
      },
      {
        label: "Firmar convenio con el Colegio",
        query: "quiero firmar convenio",
      },
    ],
  },
  {
    id: "autorizaciones_practicas",
    keywords: [
      "autorización",
      "autorizacion",
      "practica lleva autorizacion",
      "práctica lleva autorización",
      "necesita autorizacion",
      "necesita autorización",
      "requiere autorizacion",
      "requiere autorización",
      "como saber si autorizo",
      "tengo que pedir autorizacion",
      "normativas",
      "normas practicas",
    ],
    chipLabel: "Autorizaciones de prácticas",
    answer:
      "Para consultar si una práctica requiere autorización previa, ingrese " +
      "al sector Normativas de nuestra página web, donde encontrará el " +
      "listado actualizado de prácticas y sus requerimientos.",
    links: [{ label: "Ver Normativas", href: "/normativas" }],
  },
  {
    id: "consultar_valores_os",
    keywords: [
      "consultar valores",
      "valor prestaciones",
      "precio obra social",
      "precios obra social",
      "consultar precios",
      "cuanto paga",
      "cuanto cobra",
      "arancel obra social",
      "aranceles",
      "valor por codigo",
      "precio por codigo",
      "como consulto precios",
      "como veo los precios",
      "ver valores obras sociales",
    ],
    chipLabel: "¿Cómo consultar valores?",
    answer:
      "Para consultar los valores de prestaciones por obra social y código:\n\n" +
      "1. Ingrese al sistema con su usuario y contraseña.\n" +
      "2. Diríjase a la sección «Valor Prestaciones».\n" +
      "3. Seleccione la obra social y el código que desea consultar.",
    links: [
      { label: "Ingresar al sistema", href: APPROVED_LINKS.login, external: true },
    ],
  },
  {
    id: "ordenes",
    keywords: [
      "presentacion de ordenes",
      "presentar ordenes",
      "ordenes medicas",
      "cuando presento",
      "fecha ordenes",
      "plazo ordenes",
      "vencimiento ordenes",
      "orden medica",
      "dia 20",
      "hasta cuando",
      "cuando hay que presentar",
    ],
    chipLabel: "Presentación de órdenes",
    answer:
      "Tiene hasta el 20 de cada mes para presentar sus órdenes en el " +
      "Colegio Médico de Corrientes. Las presentaciones fuera de término " +
      "no son aceptadas.",
  },
];
