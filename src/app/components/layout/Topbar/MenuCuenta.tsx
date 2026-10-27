import { ChevronDown, CircleUserRound, LogOut } from "lucide-react";

import styles from "./Topbar.module.scss";
import { ItemMenu } from "./ItemMenu";
import type { MenuLink } from "./navegacion";
import BotonPlano from "@/app/components/ui/BotonPlano/BotonPlano";

type Props = {
  nombre: string;
  iniciales: string;
  items: MenuLink[];
  abierto: boolean;
  onAlternar: () => void;
  onSalir: () => void;
  can: (codigo: string) => boolean;
  ruta: string;
  alNavegar: () => void;
};

/** El botón con el nombre del usuario y su menú: perfil, datos del Colegio, permisos y Salir. */
export default function MenuCuenta({ nombre, iniciales, items, abierto, onAlternar, onSalir, can, ruta, alNavegar }: Props) {
  return (
    <div className={styles.cuenta}>
      <BotonPlano
        type="button"
        className={`${styles.userChip} ${abierto ? styles.userChipOpen : ""}`}
        onClick={onAlternar}
        aria-expanded={abierto}
        aria-haspopup="true"
        title={nombre}
      >
        <span className={styles.userName}>{nombre}</span>
        <span className={styles.userAvatar} aria-hidden="true">
          {iniciales || <CircleUserRound size={18} />}
        </span>
        <ChevronDown size={15} className={`${styles.chev} ${abierto ? styles.chevOpen : ""}`} />
      </BotonPlano>
      {abierto && (
        <div className={`${styles.dropdown} ${styles.dropdownEnd} ${styles.dropdownCuenta}`} role="menu">
          <div className={styles.dropdownCol}>
            <p className={styles.cuentaNombre}>{nombre}</p>
            <ul className={styles.dropdownList}>
              {items.map((item) => (
                <ItemMenu key={item.path} item={item} can={can} ruta={ruta} alNavegar={alNavegar} />
              ))}
            </ul>
            <BotonPlano type="button" className={styles.salir} onClick={onSalir}>
              <LogOut size={17} />
              Salir
            </BotonPlano>
          </div>
        </div>
      )}
    </div>
  );
}
