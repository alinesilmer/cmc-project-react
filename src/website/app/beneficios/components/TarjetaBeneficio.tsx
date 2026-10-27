import type React from "react";
import { useState } from "react";
import { MapPin, Tag, CalendarClock, ArrowUpRight } from "lucide-react";
import Revelar from "@/website/components/UI/Revelar/Revelar";
import { formatearFechaISO } from "@/website/lib/fechas";
import { textoSobre } from "@/website/lib/color";
import { useDesborda } from "@/website/hooks/useDesborda";
import DetalleBeneficio from "./DetalleBeneficio";
import { largoDescuento } from "../descuento";
import type { BeneficioPublico } from "@/website/lib/beneficios.client";
import styles from "./TarjetaBeneficio.module.scss";
import Button from "@/website/components/UI/Button/Button";

type Props = { beneficio: BeneficioPublico; indice: number };

/** Un beneficio. Todas las tarjetas tienen la misma forma aunque falten datos: la banda de arriba siempre está y lleva sólo el descuento. */
export default function TarjetaBeneficio({ beneficio: b, indice }: Props) {
  const vigencia = formatearFechaISO(b.vigencia_hasta);
  // El color lo elige quien carga el beneficio; se usa sólo como acento.
  const acento = b.color
    ? ({ "--acento": b.color, "--sobre-acento": textoSobre(b.color) } as React.CSSProperties)
    : undefined;
  const hayPie = Boolean(b.ubicacion || vigencia);

  // Toda la tarjeta abre el detalle; «Ver más» sólo se muestra como pista cuando el título o el texto no entran.
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
          <span className={styles.verMas} aria-hidden="true">
            Ver más <ArrowUpRight />
          </span>
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
      {/* Cubre la tarjeta entera: un clic en cualquier parte abre el detalle, y con el teclado es un solo foco. */}
      <Button
        variant="plano"
        className={styles.abrir}
        onClick={() => setAbierto(true)}
        aria-label={`Ver más sobre ${b.titulo}`}
      />
      {abierto && <DetalleBeneficio beneficio={b} colores={acento} onCerrar={() => setAbierto(false)} />}
    </Revelar>
  );
}
