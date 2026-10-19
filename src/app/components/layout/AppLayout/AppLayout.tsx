import { Outlet } from "react-router-dom";
import Topbar from "@/app/components/layout/Topbar/Topbar";
import AvisoIngreso from "@/app/features/avisoIngreso/AvisoIngreso";
import styles from "./AppLayout.module.scss";

export default function AppLayout() {
  return (
    <>
      <div className={styles.appShell}>
        <Topbar />
        <main className={styles.content}>
          <Outlet />
        </main>
      </div>
      <AvisoIngreso />
    </>
  );
}
