import { Outlet } from "react-router-dom";
import Sidebar from "../../molecules/Sidebar/Sidebar";
import styles from "./AppLayout.module.scss";

export default function AppLayout() {
  return (
    <div className={styles.appShell}>
      <aside className={styles.sidebar}>
        <Sidebar />
      </aside>
      <main className={styles.content}>
        <Outlet />
      </main>
    </div>
  );
}
