import { Outlet } from "react-router-dom";
import Sidebar from "../../molecules/Sidebar/Sidebar";
import { SnackbarProvider } from "../../../hooks/useAppSnackbar";
import styles from "./AppLayout.module.scss";

export default function AppLayout() {
  return (
    <SnackbarProvider>
      <div className={styles.appShell}>
        <aside className={styles.sidebar}>
          <Sidebar />
        </aside>
        <main className={styles.content}>
          <Outlet />
        </main>
      </div>
    </SnackbarProvider>
  );
}
