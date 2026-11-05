import { Outlet } from "react-router-dom";
import Topbar from "@/app/components/layout/Topbar/Topbar";
import AvisoIngreso from "@/app/features/avisoIngreso/AvisoIngreso";
import { CapaCarga } from "@/app/pages/facturacion/CargaFacturacion/CapaCarga";
import styles from "./AppLayout.module.scss";

export default function AppLayout() {
  return (
    <>
      <div className={styles.appShell}>
        <Topbar />
        <main className={styles.content}>
          <Outlet />
        </main>
        {/* Edición rápida de una prestación, encima de la página (ver CapaCarga). */}
        <CapaCarga />
      </div>
      <AvisoIngreso />
    </>
  );
}
