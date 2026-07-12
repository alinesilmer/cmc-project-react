import { Outlet } from "react-router-dom";
import Topbar from "../../molecules/Topbar/Topbar";
import { SnackbarProvider } from "../../../hooks/useAppSnackbar";
import styles from "./AppLayout.module.scss";

export default function AppLayout() {
  return (
    <SnackbarProvider>
      <div className={styles.appShell}>
        <Topbar />
        <main className={styles.content}>
          <Outlet />
        </main>
      </div>
    </SnackbarProvider>
  );
}
