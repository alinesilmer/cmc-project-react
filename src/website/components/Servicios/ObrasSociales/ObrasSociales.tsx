import { useMemo } from "react";
import Esqueletos from "../../UI/Esqueletos/Esqueletos";
import { coincide } from "../../../lib/texto";
import type { ObraSocialPublica } from "../../../lib/obrasSociales.client";
import styles from "./ObrasSociales.module.scss";

type Props = {
  obras: ObraSocialPublica[];
  /** El texto del buscador, que vive en la cabecera. */
  busqueda: string;
  loading?: boolean;
  error?: boolean;
};

/** Palabras que no sirven para el monograma: «Obra Social de…» no distingue a nadie. */
const VACIAS = new Set(["OBRA", "SOCIAL", "DE", "DEL", "LA", "LOS", "Y", "EL", "OS", "SA", "SRL"]);
const TONOS = 4;

/**
 * Las iniciales del monograma: la sigla entera cuando el nombre empieza con
 * una (IOSFA, OSPPRA, «OSPIL (Industria Lechera)») y si no, la inicial de las
 * dos primeras palabras que dicen algo (Swiss Medical → SM). Con la inicial
 * sola, todas las «OS…» decían «OS».
 */
function monograma(nombre: string): string {
  const palabras = nombre
    .toUpperCase()
    .replace(/[^A-ZÁÉÍÓÚÑ0-9 ]/g, " ")
    .split(" ")
    .filter((p) => p && !VACIAS.has(p));
  if (palabras.length === 0) return nombre.slice(0, 2).toUpperCase();
  const [primera, segunda] = palabras;
  const esSigla = primera.length <= 7 && (palabras.length === 1 || /^I?OS/.test(primera));
  if (esSigla) return primera;
  return segunda ? primera[0] + segunda[0] : primera.slice(0, 2);
}

/** El color sale del nombre, no de la posición: al buscar, cada una conserva el suyo. */
function tono(nombre: string): number {
  let suma = 0;
  for (const c of nombre) suma = (suma + c.charCodeAt(0)) % 997;
  return suma % TONOS;
}

/** Las obras sociales con convenio, como un mosaico de tarjetas con monograma. */
export default function ObrasSociales({ obras, busqueda, loading = false, error = false }: Props) {
  const visibles = useMemo(
    () =>
      obras
        .filter((o) => coincide(busqueda, [o.nombre]))
        .sort((a, b) => a.nombre.localeCompare(b.nombre, "es")),
    [obras, busqueda]
  );

  if (loading) return <Esqueletos cantidad={12} className={styles.mosaico} clasePieza={styles.hueso} />;
  if (error) {
    return (
      <p className={styles.aviso} role="alert">
        No se pudieron cargar los convenios. Probá de nuevo en un rato.
      </p>
    );
  }
  if (obras.length === 0) return <p className={styles.aviso}>Muy pronto.</p>;
  if (visibles.length === 0) return <p className={styles.aviso}>Nada para «{busqueda.trim()}».</p>;

  return (
    <ul className={styles.mosaico} aria-label="Obras sociales con convenio">
      {visibles.map((o, i) => {
        const letras = monograma(o.nombre);
        return (
          <li key={o.nro} className={styles.obra} style={{ animationDelay: `${Math.min(i, 20) * 0.02}s` }}>
            <span
              className={styles.monograma}
              data-tono={tono(o.nombre)}
              data-largo={letras.length > 3 ? "largo" : undefined}
              aria-hidden="true"
            >
              {letras}
            </span>
            <span className={styles.nombre} title={o.nombre}>
              {o.nombre}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
