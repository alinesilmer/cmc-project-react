import styles from "./SinPermiso.module.scss";

export default function SinPermiso() {
  return (
    <div className={styles.wrap}>
      <p className={styles.message}>No tienes permisos para realizar la acción</p>
    </div>
  );
}
