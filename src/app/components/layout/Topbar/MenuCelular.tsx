import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { ChevronDown, X, type LucideIcon } from "lucide-react";

import styles from "./Topbar.module.scss";
import { ColumnasMenu, ItemMenu } from "./ItemMenu";
import { isActivePath, menuVisible, passesPerms, type MenuLink, type TopEntry } from "./navegacion";
import BotonPlano from "@/app/components/ui/BotonPlano/BotonPlano";

type Props = {
  nav: TopEntry[];
  menuCuenta: MenuLink[];
  nombre: string;
  iniciales: string;
  autenticado: boolean;
  abierto: boolean;
  onCerrar: () => void;
  /** Al elegir un destino se cierran todos los menús. */
  alNavegar: () => void;
  onSalir: () => void;
  etiquetaAuth: string;
  IconoAuth: LucideIcon;
  can: (codigo: string) => boolean;
  ruta: string;
};

/** El menú del celular: un drawer con las secciones como acordeón y la cuenta al final. */
export default function MenuCelular({
  nav, menuCuenta, nombre, iniciales, autenticado, abierto, onCerrar, alNavegar, onSalir, etiquetaAuth, IconoAuth, can, ruta,
}: Props) {
  const [expandidos, setExpandidos] = useState<Record<string, boolean>>({});

  // Con el drawer abierto: sin scroll de fondo y Escape lo cierra.
  useEffect(() => {
    if (!abierto) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCerrar();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
    };
  }, [abierto, onCerrar]);

  // ── Acordeón ─────────────────────────────────────────────────────────────────
  const entrada = (entry: TopEntry) => {
    if (entry.kind === "link") {
      if (!passesPerms(entry.perms, can)) return null;
      const Icon = entry.icon;
      const active = isActivePath(ruta, entry.path);
      return (
        <Link
          key={entry.path}
          to={entry.path}
          className={`${styles.mLink} ${active ? styles.itemActive : ""}`}
          onClick={alNavegar}
        >
          <span className={styles.itemIcon}>
            <Icon size={17} />
          </span>
          <span className={styles.itemLabel}>{entry.label}</span>
        </Link>
      );
    }

    if (!menuVisible(entry, can)) return null;

    const Icon = entry.icon;
    const open = Boolean(expandidos[entry.id]);
    return (
      <div key={entry.id} className={styles.mGroup}>
        <BotonPlano
          type="button"
          className={styles.mGroupBtn}
          onClick={() => setExpandidos((p) => ({ ...p, [entry.id]: !p[entry.id] }))}
          aria-expanded={open}
        >
          <span className={styles.itemIcon}>
            <Icon size={17} />
          </span>
          <span className={styles.itemLabel}>{entry.label}</span>
          <ChevronDown size={16} className={`${styles.chev} ${open ? styles.chevOpen : ""}`} />
        </BotonPlano>
        {open && (
          <div className={styles.mGroupBody}>
            <ColumnasMenu columnas={entry.columns} can={can} ruta={ruta} alNavegar={alNavegar} />
          </div>
        )}
      </div>
    );
  };

  // Drawer en un portal a <body>: el `backdrop-filter` de la barra la vuelve el bloque contenedor de sus hijos `position: fixed`.
  return createPortal(
    <>
      <BotonPlano
        type="button"
        className={`${styles.overlay} ${abierto ? styles.overlayOn : ""}`}
        onClick={onCerrar}
        aria-label="Cerrar menú"
        tabIndex={abierto ? 0 : -1}
      />
      <aside className={`${styles.drawer} ${abierto ? styles.drawerOpen : ""}`} aria-label="Menú">
        <div className={styles.drawerHead}>
          {autenticado && nombre ? (
            <div className={styles.drawerUser}>
              <span className={styles.userAvatar} aria-hidden="true">
                {iniciales}
              </span>
              <span className={styles.drawerUserName}>{nombre}</span>
            </div>
          ) : (
            <span className={styles.drawerTitulo}>Menú</span>
          )}
          <BotonPlano type="button" className={styles.drawerClose} onClick={onCerrar} aria-label="Cerrar">
            <X size={18} />
          </BotonPlano>
        </div>
        <div className={styles.drawerBody}>
          {nav.map(entrada)}
          {autenticado && (
            <div className={styles.mGroupBody}>
              <div className={styles.dropdownCol}>
                <p className={styles.dropdownHeading}>Mi cuenta</p>
                <ul className={styles.dropdownList}>
                  {menuCuenta.map((item) => (
                    <ItemMenu key={item.path} item={item} can={can} ruta={ruta} alNavegar={alNavegar} />
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
        <div className={styles.drawerFoot}>
          <BotonPlano type="button" className={styles.authButton} onClick={onSalir}>
            <IconoAuth size={17} />
            <span>{etiquetaAuth}</span>
          </BotonPlano>
        </div>
      </aside>
    </>,
    document.body,
  );
}
