import { NavLink, Outlet } from "react-router-dom";
import styles from "./servicios.module.scss";

export default function Servicios() {
  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <h1>Servicios</h1>
        <p>Prestaciones y beneficios para profesionales.</p>
      </section>


      <section className={styles.content}>
        <Outlet />
      </section>
    </main>
  );
}
