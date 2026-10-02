type Props = {
  cantidad: number;
  /** La grilla que los contiene: la misma que usa la pantalla ya cargada. */
  className?: string;
  /** Cada pieza, con el tamaño de la tarjeta real para que no salte al cargar. */
  clasePieza?: string;
};

/** Marcadores grises mientras carga una grilla. */
export default function Esqueletos({ cantidad, className, clasePieza }: Props) {
  return (
    <div className={className} aria-busy="true" aria-live="polite">
      {Array.from({ length: cantidad }, (_, i) => (
        <div key={i} className={clasePieza} aria-hidden="true" />
      ))}
    </div>
  );
}
