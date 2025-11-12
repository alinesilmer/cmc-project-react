import { Routes, Route, Navigate } from "react-router-dom";
import { AnimatePresence } from "framer-motion";

// APP (management system)
import RequireAuth from "./app/auth/RequireAuth";
// import AppLayout from "./app/components/molecules/Sidebar/Sidebar";
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
import Help from "./app/pages/Help/Help";
import Login from "./app/pages/Login/Login";
import Register from "./app/pages/Register/Register";
import Info from "./app/pages/Info/Info";
import AdherenteForm from "./app/components/molecules/AdherenteForm/AdherenteForm";

// WEBSITE
import WebRoutes from "./website/router";

export default function RootRoutes() {
  return (
    <AnimatePresence mode="wait">
      <Routes>
        {/* Public website*/}
        <Route path="/*" element={<WebRoutes />} />

        {/* Auth pages for app */}
        <Route path="/panel/login" element={<Login />} />
        <Route path="/panel/register" element={<Register />} />
        <Route path="/panel/info" element={<Info />} />
        <Route path="/panel/adherente" element={<AdherenteForm />} />

        {/* Protected app */}
        <Route element={<RequireAuth />}>
          <Route path="/panel" element={<AppLayout />}>
            <Route
              path="/panel"
              element={<Navigate to="/panel/dashboard" replace />}
            />
            <Route path="/panel/dashboard" element={<DashboardPage />} />
            <Route path="/panel/doctors" element={<DoctorsPage />} />
            <Route path="/panel/doctors/:id" element={<DoctorProfilePage />} />
            <Route path="/panel/social-works" element={<SocialWorksPage />} />
            <Route path="/panel/liquidation" element={<LiquidationPage />} />
            <Route
              path="/panel/liquidation/:id"
              element={<LiquidationCyclePage />}
            />
            <Route path="/panel/padron-ioscor" element={<PadronIoscor />} />
            <Route
              path="/panel/liquidation/:id/debitos"
              element={<DiscountsPage />}
            />
            <Route
              path="/panel/liquidation/:id/insurance/:osId/:period/:liquidacionId"
              element={<InsuranceDetail />}
            />
            <Route path="/panel/solicitudes" element={<ApplicationsList />} />
            <Route
              path="/panel/solicitudes/:id"
              element={<ApplicationDetail />}
            />
            <Route path="/panel/users" element={<UsersList />} />
            <Route path="/panel/register-socio" element={<RegisterSocio />} />
            <Route
              path="/panel/admin/permissions"
              element={<PermissionsManager />}
            />
            <Route
              path="/panel/users-manager"
              element={<UsersManagerDashboard />}
            />
            <Route path="/panel/config" element={<Config />} />
            <Route path="/panel/help" element={<Help />} />
          </Route>
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AnimatePresence>
  );
}
