"use client";
import { Routes, Route, Link } from "react-router-dom";
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

function App() {
  return (
    <div className={styles.app}>
      <Sidebar />
      <main className={styles.main_content}>
        <AnimatePresence mode="wait">
          <Routes>
            <Route path="/" element={<Link to="/dashboard" replace />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/doctors" element={<DoctorsPage />} />
            <Route path="/social-works" element={<SocialWorksPage />} />
            <Route path="/liquidation" element={<LiquidationPage />} />
            <Route path="/doctors/:id" element={<DoctorProfilePage />} />
            <Route path="/liquidation/:id" element={<LiquidationCyclePage />} />
            <Route path="/padron-ioscor" element={<PadronIoscor />} />
            <Route path="/info" element={<Info />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            <Route
              path="/liquidation/:id/debitos"
              element={<DiscountsPage />}
            />
            <Route
              path="/liquidation/:id/insurance/:osId/:period/:liquidacionId"
              element={<InsuranceDetail />}
            />
          </Routes>
        </AnimatePresence>
      </main>
    </div>
  );
}

export default App;
