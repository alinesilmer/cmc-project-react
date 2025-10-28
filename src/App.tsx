"use client";
import { Routes, Route, Link, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";

import DashboardPage from "./app/pages/Dashboard/Dashboard";
import DoctorsPage from "./app/pages/DoctorsList/DoctorsList";
import SocialWorksPage from "./app/pages/SocialWorkSection/SocialWorkSection";
import LiquidationPage from "./app/pages/LiquidationPeriods/LiquidationPeriods";
import DiscountsPage from "./app/pages/DiscountsList/DiscountsList";
import LiquidationCyclePage from "./app/pages/LiquidationCycle/LiquidationCycle";
import InsuranceDetail from "./app/pages/InsuranceDetail/InsuranceDetail";
import DoctorProfilePage from "./app/pages/DoctorProfilePage/DoctorProfilePage";

// Components
import Sidebar from "./components/molecules/Sidebar/Sidebar";
import PadronIoscor from "./app/pages/PadronIoscor/PadronIoscor";

import styles from "./app.module.scss"
import Login from "./app/pages/Login/Login";
import Info from "./app/pages/Info/Info";
import Register from "./app/pages/Register/Register";
import RequireAuth from "./auth/RequireAuth";
import { useAuth } from "./auth/AuthProvider";
import ApplicationsList from "./components/molecules/ApplicationsList/ApplicationsList";
import ApplicationDetail from "./components/molecules/ApplicationDetail/ApplicationDetail";
import UsersManagerDashboard from "./app/pages/UsersManagerDashboard/UsersManagerDashboard";
import Config from "./app/pages/Config/Config";
import Help from "./app/pages/Help/Help";
import AdherenteForm from "./components/molecules/AdherenteForm/AdherenteForm";
import UsersList from "./app/pages/UsersList/UsersList";
import RegisterSocio from "./app/pages/RegisterSocio/RegisterSocio";
import PermissionsManager from "./app/pages/PermissionsManager/PermissionsManager";

function App() {
  const { user } = useAuth();
  const location = useLocation();
  // rutas donde NUNCA debe mostrarse el Sidebar
  const HIDE_SIDEBAR_PATHS = new Set<string>([
    "/login",
    "/register",
    "/info",        // Requisitos para registrarse
    "/adherente",   // “Quiero ser socio”
  ]);

  const hideSidebar = !user || HIDE_SIDEBAR_PATHS.has(location.pathname);
  return (
    <div className={styles.app}>
      {!hideSidebar && <Sidebar />}
      <main
        className={`${styles.main_content} ${
          hideSidebar ? styles.main_no_sidebar : ""
        }`}
      >
        <AnimatePresence mode="wait">
          <Routes>
            <Route element={<RequireAuth />}>
              <Route path="/" element={<Link to="/dashboard" replace />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/doctors" element={<DoctorsPage />} />
              <Route path="/doctors/:id" element={<DoctorProfilePage />} />
              <Route path="/social-works" element={<SocialWorksPage />} />
              <Route path="/liquidation" element={<LiquidationPage />} />
              <Route path="/liquidation/:id" element={<LiquidationCyclePage />} />
              <Route path="/padron-ioscor" element={<PadronIoscor />} />
              <Route path="/liquidation/:id/debitos" element={<DiscountsPage />} />
              <Route path="/liquidation/:id/insurance/:osId/:period/:liquidacionId" element={<InsuranceDetail />} />
              <Route path="/solicitudes" element={<ApplicationsList />} />
              <Route path="/solicitudes/:id" element={<ApplicationDetail />} />
              <Route path="/users" element={<UsersList />} />
              <Route path="/register-socio" element={<RegisterSocio />} />
              <Route path="/admin/permissions" element={<PermissionsManager />} />
              <Route path="/users-manager" element={<UsersManagerDashboard />} />
              <Route path="/config" element={<Config />} />
              <Route path="/help" element={<Help />} />
            </Route>
            <Route path="/info" element={<Info />} />
            <Route path="/adherente" element={<AdherenteForm />} />

            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

          </Routes>
        </AnimatePresence>
      </main>
    </div>
  );
}

export default App;
