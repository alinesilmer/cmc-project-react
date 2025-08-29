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

// Components
import Sidebar from "./components/molecules/Sidebar/Sidebar";

function App() {
  return (
    <div className="app">
      <Sidebar />
      <main className="main-content">
        <AnimatePresence mode="wait">
          <Routes>
            <Route path="/" element={<Link to="/dashboard" replace />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/doctors" element={<DoctorsPage />} />
            <Route path="/social-works" element={<SocialWorksPage />} />
            <Route path="/liquidation" element={<LiquidationPage />} />
            <Route path="/discounts" element={<DiscountsPage />} />
            <Route path="/liquidation/:id" element={<LiquidationCyclePage />} />
            {/* <Route
              path="/liquidation-cycle"
              element={<LiquidationCyclePage />}
            /> */}
            <Route path="/insurance-detail" element={<InsuranceDetail />} />
          </Routes>
        </AnimatePresence>
      </main>
    </div>
  );
}

export default App;
