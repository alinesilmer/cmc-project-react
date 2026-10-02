import { Link } from "react-router-dom";
import { ArrowUpRight, Clock, MapPin, MessageCircle, Phone } from "lucide-react";
import ContenedorPagina from "../../components/UI/ContenedorPagina/ContenedorPagina";
import CabeceraFresca from "../../components/UI/CabeceraFresca/CabeceraFresca";
import Revelar from "../../components/UI/Revelar/Revelar";
import Button from "../../components/UI/Button/Button";
import Llamado from "../../components/UI/Llamado/Llamado";
import { NAVEGACION } from "../../components/UI/Header/navegacion";
import { CONTACTO } from "../../lib/contacto";
import { useTituloPagina } from "../../hooks/useTituloPagina";
import styles from "./servicios.module.scss";

// Los servicios son los mismos del menú: agregar uno allá lo suma acá.
const SERVICIOS = NAVEGACION.find((i) => i.ruta === "/servicios")?.hijos ?? [];

/** Una línea por servicio, por ruta. */
const DESCRIPCIONES: Record<string, string> = {
  "/socios": "Sumate en tres pasos.",
  "/seguros": "Cobertura para tu práctica.",
  "/convenios": "Obras sociales con acuerdo.",
  "/quinta": "Un lugar para disfrutar.",
  "/prevencion-salud": "Tu plan, con descuento.",
  "/preguntas-frecuentes": "Respuestas rápidas.",
};

const DESTACADOS = [
  { icono: MapPin, texto: CONTACTO.direccion },
  { icono: Clock, texto: "Lun a vie · 7 a 15 h" },
];

export default function ServiciosPage() {
  useTituloPagina("Servicios");

  return (
    <ContenedorPagina>
      <CabeceraFresca
        titulo={
          <>
            Todo en <span>un lugar</span>
          </>
        }
        bajada="Elegí qué necesitás."
        lema={
          <>
            Pensado <em>para vos.</em>
          </>
        }
        destacados={DESTACADOS}
        compacto
      />

      <ul className={styles.grilla} aria-label="Servicios">
        {SERVICIOS.map(({ etiqueta, ruta, icono: Icono }, i) => (
          <Revelar key={ruta} como="li" distancia={20} retraso={i * 0.06}>
            <Link to={ruta} className={styles.servicio}>
              <span className={styles.icono} aria-hidden="true">
                <Icono />
              </span>
              <span className={styles.texto}>
                <strong>{etiqueta}</strong>
                {DESCRIPCIONES[ruta]}
              </span>
              <ArrowUpRight className={styles.flecha} aria-hidden="true" />
            </Link>
          </Revelar>
        ))}
      </ul>

      <Llamado
        titulo={
          <>
            ¿Dudas? <em>Escribinos.</em>
          </>
        }
      >
        <Button to="/contacto" size="large" iconoIzquierda={<MessageCircle />}>
          Contacto
        </Button>
        <Button href={CONTACTO.telefono.href} variant="outline" size="large" iconoIzquierda={<Phone />}>
          Llamar
        </Button>
      </Llamado>
    </ContenedorPagina>
  );
}
