import { Globe, Percent, Stethoscope, UserCheck } from "lucide-react";
import TarjetasIcono, { type TarjetaIcono } from "../../UI/TarjetasIcono/TarjetasIcono";

const INCLUYE: TarjetaIcono[] = [
  { icono: Percent, titulo: "Descuento", texto: "Exclusivo para socios del Colegio." },
  { icono: Globe, titulo: "Red amplia", texto: "Prestadores en el país y el exterior." },
  { icono: Stethoscope, titulo: "A tu medida", texto: "Planes para vos y tu familia." },
  { icono: UserCheck, titulo: "Atención personal", texto: "Asesoras dedicadas al convenio." },
];

/** Lo que incluye el convenio con Prevención Salud. */
export default function PrevencionSalud() {
  return (
    <TarjetasIcono
      id="incluye-prevencion"
      titulo={
        <>
          Qué <em>incluye</em>
        </>
      }
      items={INCLUYE}
    />
  );
}
