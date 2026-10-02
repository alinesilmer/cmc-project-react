import { IdCard, Megaphone, Wallet } from "lucide-react";
import Revelar from "../../UI/Revelar/Revelar";
import TarjetasIcono, { type TarjetaIcono } from "../../UI/TarjetasIcono/TarjetasIcono";
import { CONTACTO } from "../../../lib/contacto";
import styles from "./Quinta.module.scss";

const FOTO = "https://res.cloudinary.com/dcfkgepmp/image/upload/q_auto/f_auto/w_1600,c_limit/v1762471702/quintacmc3_s6sffw.jpg";

const REQUISITOS: TarjetaIcono[] = [
  { icono: Wallet, titulo: "Cuota al día", texto: "Para usar la pileta y las instalaciones." },
  { icono: IdCard, titulo: "Carnet de socio", texto: `Tramitalo en la sede: ${CONTACTO.direccion}.` },
  { icono: Megaphone, titulo: "Temporada", texto: "Avisamos cuando arranca la pileta. Seguí las publicaciones." },
];

/** Lo que hace falta para usar la Quinta y, debajo, la foto grande. */
export default function Quinta() {
  return (
    <>
      <TarjetasIcono
        id="requisitos-quinta"
        titulo={
          <>
            Para <em>usarla</em>
          </>
        }
        items={REQUISITOS}
        columnas={3}
      />

      <Revelar className={styles.foto} distancia={24}>
        <img src={FOTO} alt="La Quinta del Colegio Médico" width={1600} height={686} loading="lazy" decoding="async" />
      </Revelar>
    </>
  );
}
