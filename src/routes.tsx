import { Routes, Route, Navigate } from "react-router-dom";
import { AnimatePresence } from "framer-motion";

// APP
import RequireAuth from "./app/auth/RequireAuth";
import AppLayout from "./app/components/molecules/AppLayout/AppLayout";
import DashboardPage from "./app/pages/Dashboard/Dashboard";
import DoctorsPage from "./app/pages/DoctorsList/DoctorsList";
import SocialWorksPage from "./app/pages/SocialWorkSection/SocialWorkSection";
import LiquidationPage from "./app/pages/LiquidationPeriods/LiquidationPeriods";
import DiscountsPage from "./app/pages/DiscountsList/DiscountsList";
import LiquidationCyclePage from "./app/pages/LiquidationCycle/LiquidationCycle";
import InsuranceDetail from "./app/pages/InsuranceDetail/InsuranceDetail";
import DoctorProfilePage from "./app/pages/DoctorProfilePage/DoctorProfilePage";
import PadronIoscor from "./app/pages/PadronIoscor/PadronIoscor";
import ApplicationsList from "./app/components/molecules/ApplicationsList/ApplicationsList";
import ApplicationDetail from "./app/components/molecules/ApplicationDetail/ApplicationDetail";
import UsersList from "./app/pages/UsersList/UsersList";
import RegisterSocio from "./app/pages/RegisterSocio/RegisterSocio";
import PermissionsManager from "./app/pages/PermissionsManager/PermissionsManager";
import UsersManagerDashboard from "./app/pages/UsersManagerDashboard/UsersManagerDashboard";
import Config from "./app/pages/Config/Config";
import PadronSucio from "./app/pages/PadronSucio/PadronSucio";
import Help from "./app/pages/Help/Help";
import Login from "./app/pages/Login/Login";
import Register from "./app/pages/Register/Register";
import Info from "./app/pages/Info/Info";
import AdherenteForm from "./app/components/molecules/AdherenteForm/AdherenteForm";
import ObrasSocialesRegisterPage from "./app/pages/ObrasSocialesRegisterPage/ObrasSocialesRegisterPage";
import PadronesPage from "./app/pages/PadronesPage/PadronesPage";
import AdminPadrones from "./app/pages/AdminPadrones/AdminPadrones";
import AdminPadronesDetail from "./app/pages/AdminPadronesDetail/AdminPadronesDetail";
import Boletin from "./app/pages/Boletin/Boletin";
import AfiliadosPorObraSocialPage from "./app/pages/AfiliadosPorObraSocialPage/AfiliadosPorObraSocialPage";
import GenerarBoletin from "./app/pages/GenerarBoletin/GenerarBoletin";

// WEBSITE
import WebRoutes from "./website/router";

export default function RootRoutes() {
  return (
    <AnimatePresence mode="wait">
      <Routes>
        {/* Website público */}
        <Route path="/*" element={<WebRoutes />} />

        {/* Páginas públicas del panel (sin auth) */}
        <Route path="/panel/login" element={<Login />} />
        <Route
          path="/panel/register-os"
          element={<ObrasSocialesRegisterPage />}
        />
        <Route path="/panel/register" element={<Register />} />
        <Route path="/panel/info" element={<Info />} />
        <Route path="/panel/adherente" element={<AdherenteForm />} />
        <Route path="/panel/padrones" element={<PadronesPage />} />
         <Route path="generar-boletin" element={<GenerarBoletin />} />
       

        {/* Zona protegida */}
        <Route element={<RequireAuth />}>
          <Route path="/panel" element={<AppLayout />}>
            {/* index de /panel */}
            <Route index element={<Navigate to="dashboard" replace />} />

            {/* 👇 RUTAS RELATIVAS (sin /panel al inicio) */}
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="doctors" element={<DoctorsPage />} />
            <Route path="doctors/:id" element={<DoctorProfilePage />} />
            <Route path="social-works" element={<SocialWorksPage />} />
             <Route path="padronsucio" element={<PadronSucio />} />
               <Route
              path="afiliadospadron"
              element={<AfiliadosPorObraSocialPage />}
            />
            <Route path="liquidation" element={<LiquidationPage />} />
            <Route path="liquidation/:id" element={<LiquidationCyclePage />} />
            <Route path="liquidation/:id/debitos" element={<DiscountsPage />} />
            <Route
              path="liquidation/:id/insurance/:osId/:period/:liquidacionId"
              element={<InsuranceDetail />}
            />
          
            <Route path="padron-ioscor" element={<PadronIoscor />} />
            <Route path="solicitudes" element={<ApplicationsList />} />
            <Route path="solicitudes/:id" element={<ApplicationDetail />} />
            <Route path="users" element={<UsersList />} />
            <Route path="register-socio" element={<RegisterSocio />} />
            <Route path="admin/permissions" element={<PermissionsManager />} />
            <Route path="users-manager" element={<UsersManagerDashboard />} />
            <Route path="boletin" element={<Boletin />} />
            <Route path="config" element={<Config />} />
            <Route path="help" element={<Help />} />

            {/* Catch-all **dentro** de /panel */}
            <Route path="*" element={<Navigate to="dashboard" replace />} />
          </Route>

          {/* Otras protegidas fuera del layout /panel */}
          <Route path="/panel/admin-padrones" element={<AdminPadrones />} />
          <Route
            path="/panel/admin-padrones-detail"
            element={<AdminPadronesDetail />}
          />
        </Route>

        {/* Fallback global (opcional, casi nunca se dispara con WebRoutes arriba) */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AnimatePresence>
  );
}
