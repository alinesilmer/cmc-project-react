import { Link } from "react-router-dom";

import styles from "./Topbar.module.scss";
import { columnVisible, isActivePath, passesPerms, type MenuColumn, type MenuLink } from "./navegacion";

type Comun = {
  can: (codigo: string) => boolean;
  /** La ruta actual: marca el ítem activo. */
  ruta: string;
  /** Al elegir un destino se cierran los menús. */
  alNavegar: () => void;
};

/** Un ítem de un desplegable o del drawer. */
export function ItemMenu({ item, can, ruta, alNavegar }: Comun & { item: MenuLink }) {
  if (!passesPerms(item.perms, can)) return null;

  const Icon = item.icon;
  const active = !item.external && isActivePath(ruta, item.path);
  const cls = `${styles.item} ${active ? styles.itemActive : ""}`;
  const inner = (
    <>
      <span className={styles.itemIcon}>
        <Icon size={17} />
      </span>
      <span className={styles.itemLabel}>{item.label}</span>
    </>
  );
  const node = item.external ? (
    <a href={item.path} target="_blank" rel="noopener noreferrer" className={cls} onClick={alNavegar}>
      {inner}
    </a>
  ) : (
    <Link to={item.path} className={cls} aria-current={active ? "page" : undefined} onClick={alNavegar}>
      {inner}
    </Link>
  );
  return <li>{node}</li>;
}

/** Las columnas de un desplegable o de un grupo del drawer. */
export function ColumnasMenu({ columnas, ...comun }: Comun & { columnas: MenuColumn[] }) {
  return (
    <>
      {columnas
        .filter((col) => columnVisible(col, comun.can))
        .map((col, i) => (
          <div key={col.heading ?? `col-${i}`} className={styles.dropdownCol}>
            {col.heading && <p className={styles.dropdownHeading}>{col.heading}</p>}
            <ul className={styles.dropdownList}>
              {col.items.map((item) => (
                <ItemMenu key={item.path} item={item} {...comun} />
              ))}
            </ul>
          </div>
        ))}
    </>
  );
}
