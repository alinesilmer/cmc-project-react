import type React from "react";
import { useState } from "react";
import { MapPin, Tag, CalendarClock, ArrowUpRight } from "lucide-react";
import Revelar from "../../../components/UI/Revelar/Revelar";
import { formatearFechaISO } from "../../../lib/fechas";
import { textoSobre } from "../../../lib/color";
import { useDesborda } from "../../../hooks/useDesborda";
import DetalleBeneficio from "./DetalleBeneficio";
import { largoDescuento } from "../descuento";
import type { BeneficioPublico } from "../../../lib/beneficios.client";
import styles from "./TarjetaBeneficio.module.scss";

type Props = { beneficio: BeneficioPublico; indice: number };

/**
 * Un beneficio. Todas las tarjetas tienen la misma forma aunque falten datos:
 * la banda de arriba siempre está y lleva sólo el descuento (o un ícono), con
 * la letra según su largo; la categoría va abajo, sobre el título, así no se
 * pelean por el mismo renglón. El título
 * ocupa dos renglones, la descripción hasta cuatro y el pie va al fondo.
 * Así la grilla queda alineada.
 */
export default function TarjetaBeneficio({ beneficio: b, indice }: Props) {
  const vigencia = formatearFechaISO(b.vigencia_hasta);
  // El color lo elige quien carga el beneficio; se usa sólo como acento.
  const acento = b.color
    ? ({ "--acento": b.color, "--sobre-acento": textoSobre(b.color) } as React.CSSProperties)
    : undefined;
  const hayPie = Boolean(b.ubicacion || vigencia);

  // Si el título o la descripción no entran, se ofrece verlo completo en una
  // ventana: la tarjeta mantiene su alto y la grilla sigue alineada.
  const titulo = useDesborda<HTMLHeadingElement>();
  const texto = useDesborda<HTMLParagraphElement>();
  const descuento = useDesborda<HTMLSpanElement>();
  const [abierto, setAbierto] = useState(false);

  return (
    <Revelar
      como="article"
      className={styles.card}
      style={acento}
      distancia={20}
      duracion={0.45}
      // Techo al escalonado: con muchas tarjetas las últimas entrarían tarde.
      retraso={Math.min(indice, 6) * 0.05}
    >
      <header className={styles.banda}>
        <span ref={descuento.ref} className={styles.descuento} data-largo={largoDescuento(b.descuento)}>
          {b.descuento ?? <Tag aria-label="Beneficio" />}
        </span>
      </header>

      <div className={styles.cuerpo}>
        <span className={styles.categoria}>{b.categoria}</span>
        <h2 ref={titulo.ref} className={styles.cardTitle}>
          {b.titulo}
        </h2>
        <p ref={texto.ref} className={styles.cardText}>
          {b.descripcion}
        </p>
        {(titulo.desborda || texto.desborda || descuento.desborda) && (
          <button type="button" className={styles.verMas} onClick={() => setAbierto(true)}>
            Ver más <ArrowUpRight aria-hidden="true" />
          </button>
        )}
      </div>

      {hayPie && (
        <footer className={styles.meta}>
          {b.ubicacion && (
            <span className={styles.metaItem}>
              <MapPin aria-hidden="true" />
              {b.ubicacion}
            </span>
          )}
          {vigencia && (
            <span className={styles.metaItem}>
              <CalendarClock aria-hidden="true" />
              Hasta el {vigencia}
            </span>
          )}
        </footer>
      )}
      {abierto && <DetalleBeneficio beneficio={b} colores={acento} onCerrar={() => setAbierto(false)} />}
    </Revelar>
  );
}
