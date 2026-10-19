import { useEffect } from "react";
import { ArrowLeft, Compass } from "lucide-react";
import ContenedorPagina from "../../components/UI/ContenedorPagina/ContenedorPagina";
import Button from "../../components/UI/Button/Button";
import { useTituloPagina } from "../../hooks/useTituloPagina";
import styles from "./noEncontrada.module.scss";

/** Página para una dirección que no existe. */
export default function NoEncontrada() {
  useTituloPagina("Página no encontrada");

  // El servidor entrega el sitio con un 200 para cualquier ruta (es una SPA).
  useEffect(() => {
    const meta = document.createElement("meta");
    meta.name = "robots";
    meta.content = "noindex";
    document.head.appendChild(meta);
    return () => meta.remove();
  }, []);

  return (
    <ContenedorPagina>
      <section className={styles.aviso}>
        <span className={styles.icono} aria-hidden="true">
          <Compass />
        </span>
        <h1 className={styles.titulo}>
          Página <span>no encontrada</span>
        </h1>
        <p className={styles.bajada}>Esa dirección no existe.</p>
        <Button to="/" iconoIzquierda={<ArrowLeft />}>
          Ir al inicio
        </Button>
      </section>
    </ContenedorPagina>
  );
}
