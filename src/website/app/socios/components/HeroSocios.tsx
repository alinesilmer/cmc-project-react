import { ArrowDown, BadgeCheck, FolderOpen, Gift, Handshake, MapPin, ShieldCheck } from "lucide-react";
import Button from "../../../components/UI/Button/Button";
import CabeceraFresca from "../../../components/UI/CabeceraFresca/CabeceraFresca";
import CaminoPasos from "../../../components/UI/CaminoPasos/CaminoPasos";
import WhatsappIcon from "../../../components/UI/icons/WhatsappIcon";
import { CONTACTO, linkWhatsApp } from "../../../lib/contacto";
import { MENSAJE_WHATSAPP } from "../socios.data";

const PASOS = [
  { icono: FolderOpen, palabra: "Juntá" },
  { icono: MapPin, palabra: "Traé" },
  { icono: BadgeCheck, palabra: "¡Listo!" },
];

const DESTACADOS = [
  { icono: ShieldCheck, texto: "Respaldo" },
  { icono: Handshake, texto: "Convenios" },
  { icono: Gift, texto: "Beneficios" },
];

/** La cabecera de Socios: los tres pasos del trámite y a dónde seguir. */
export default function HeroSocios() {
  return (
    <CabeceraFresca
      titulo={
        <>
          Sumate al <span>Colegio</span>
        </>
      }
      lema={
        <>
          Tu práctica, <em>respaldada.</em>
        </>
      }
      destacados={DESTACADOS}
      acciones={
        <>
          <Button href="#requisitos" variant="primary" size="large" iconoIzquierda={<ArrowDown />}>
            Requisitos
          </Button>
          <Button
            href={linkWhatsApp(CONTACTO.whatsapp.sede, MENSAJE_WHATSAPP)}
            variant="secondary"
            size="large"
            iconoIzquierda={<WhatsappIcon />}
          >
            Consultar
          </Button>
        </>
      }
    >
      <CaminoPasos pasos={PASOS} descripcion="Tres pasos: juntá los papeles, traelos a la sede y listo" />
    </CabeceraFresca>
  );
}
