import { Link, useLocation } from "react-router-dom";
import { ChevronRight, User } from "lucide-react";
import { NAVEGACION, esActiva, type ItemNav } from "./navegacion";
import { useModal } from "@/website/hooks/useModal";
import styles from "./NavMovil.module.scss";
import Button from "@/website/components/UI/Button/Button";

type Props = {
  onCerrar: () => void;
  onIngresar: () => void;
};

/** El menú del celular: una lista con íconos; los servicios, agrupados abajo. */
export default function NavMovil({ onCerrar, onIngresar }: Props) {
  const { pathname } = useLocation();
  useModal(true, onCerrar);

  const secciones = NAVEGACION.filter((i) => !i.hijos);
  const servicios = NAVEGACION.find((i) => i.hijos)?.hijos ?? [];

  const fila = (item: ItemNav) => {
    const Icono = item.icono;
    const activa = esActiva(pathname, item);
    return (
      <li key={item.ruta}>
        <Link to={item.ruta} className={`${styles.fila} ${activa ? styles.activa : ""}`} onClick={onCerrar}>
          <Icono className={styles.icono} aria-hidden="true" />
          <span>{item.etiqueta}</span>
          <ChevronRight className={styles.flecha} aria-hidden="true" />
        </Link>
      </li>
    );
  };

  return (
    <nav id="mobile-menu" className={styles.menu} aria-label="Menú">
      <ul className={styles.lista}>{secciones.map(fila)}</ul>

      <p className={styles.titulo}>Servicios</p>
      <ul className={styles.lista}>{servicios.map(fila)}</ul>

      <Button variant="plano" type="button" className={styles.ingresar} onClick={onIngresar}>
        <User aria-hidden="true" />
        Ingresar
      </Button>
    </nav>
  );
}
