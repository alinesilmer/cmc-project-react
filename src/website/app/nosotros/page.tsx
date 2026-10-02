import { MessageCircle, UserPlus } from "lucide-react";
import ContenedorPagina from "../../components/UI/ContenedorPagina/ContenedorPagina";
import CabeceraFresca from "../../components/UI/CabeceraFresca/CabeceraFresca";
import Button from "../../components/UI/Button/Button";
import Revelar from "../../components/UI/Revelar/Revelar";
import Llamado from "../../components/UI/Llamado/Llamado";
import TarjetasIcono from "../../components/UI/TarjetasIcono/TarjetasIcono";
import { useTituloPagina } from "../../hooks/useTituloPagina";
import { DESTACADOS, PILARES, PROPOSITO, VALORES } from "./nosotros.data";
import styles from "./nosotros.module.scss";

export default function NosotrosPage() {
  useTituloPagina("Nosotros");

  return (
    <ContenedorPagina>
      <CabeceraFresca
        titulo={
          <>
            Somos el <span>Colegio</span>
          </>
        }
        bajada="Los médicos de Corrientes, juntos."
        lema={
          <>
            Cuidamos a <em>quienes cuidan.</em>
          </>
        }
        destacados={DESTACADOS}
      >
        <ul className={styles.pilares}>
          {PILARES.map(({ icono: Icono, titulo, texto }, i) => (
            <Revelar key={titulo} como="li" className={styles.pilar} distancia={14} retraso={0.2 + i * 0.08} alVerse={false}>
              <span className={styles.pilarIcono} aria-hidden="true">
                <Icono />
              </span>
              <span>
                <strong>{titulo}</strong>
                {texto}
              </span>
            </Revelar>
          ))}
        </ul>
      </CabeceraFresca>

      <section aria-label="Misión y visión" className={styles.proposito}>
        {PROPOSITO.map(({ icono: Icono, titulo, texto }, i) => (
          <Revelar key={titulo} className={styles.tarjetaProposito} distancia={20} retraso={i * 0.1}>
            <span className={styles.propositoIcono} aria-hidden="true">
              <Icono />
            </span>
            <h2>{titulo}</h2>
            <p>{texto}</p>
          </Revelar>
        ))}
      </section>

      <TarjetasIcono
        id="valores"
        titulo={
          <>
            Nuestros <em>valores</em>
          </>
        }
        items={VALORES}
      />

      <Llamado
        titulo={
          <>
            ¿Sos médico? <em>Sumate.</em>
          </>
        }
      >
        <Button to="/socios" size="large" iconoIzquierda={<UserPlus />}>
          Quiero ser socio
        </Button>
        <Button to="/contacto" variant="outline" size="large" iconoIzquierda={<MessageCircle />}>
          Contacto
        </Button>
      </Llamado>
    </ContenedorPagina>
  );
}
