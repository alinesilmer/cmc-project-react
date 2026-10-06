import { Award, BookOpen, DollarSign, FileText, Headphones, Users } from "lucide-react";
import TarjetasIcono, { type TarjetaIcono } from "../../UI/TarjetasIcono/TarjetasIcono";

const SERVICIOS: TarjetaIcono[] = [
  { icono: FileText, titulo: "Facturación electrónica", texto: "Integrada con todas las obras sociales." },
  { icono: DollarSign, titulo: "Liquidación de honorarios", texto: "Seguí tus cobros en tiempo real." },
  { icono: Users, titulo: "Padrones", texto: "Enlace directo con obras sociales y prepagas." },
  { icono: BookOpen, titulo: "Normativas y valores", texto: "Valores éticos y normas al día." },
  { icono: Award, titulo: "Certificaciones", texto: "Certificados y constancias, en digital." },
  { icono: Headphones, titulo: "Soporte", texto: "Atención personalizada para tus consultas." },
];

export default function HealthServices() {
  return (
    <TarjetasIcono
      id="servicios"
      titulo={
        <>
          Nuestros <em>servicios</em>
        </>
      }
      items={SERVICIOS}
      columnas={3}
    />
  );
}
