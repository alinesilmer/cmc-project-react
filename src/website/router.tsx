import { Suspense, lazy, useEffect } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import RequireWebEditor from "../app/auth/RequireWebEditor";

const Home = lazy(() => import("./app/inicio/page"));
const Contacto = lazy(() => import("./app/contact/page"));
const NoticiasPage = lazy(() => import("./app/noticias/page"));
const NoticiaDetail = lazy(() => import("./app/noticias/[id]/page"));
const AdminLogin = lazy(() => import("./app/admin/login/page"));
const AdminDashboard = lazy(() => import("./app/admin/dashboard/page"));
const Forbidden403 = lazy(() => import("./app/forbidden403/Forbidden403"));

import Header from "./components/UI/Header/Header";
import Footer from "./components/UI/Footer/Footer";
import NosotrosPage from "./app/nosotros/page";
import AdminMedicosPromo from "./app/admin/MedicosPromo/MedicosPromo";
import Servicios from "./app/servicios/page";
import NotFound from "./app/notFound/notFound";
import GaleriaPage from "./app/galeria/page";
import ConveniosPage from "./app/convenios/convenios";
import QuintaPage from "./app/quinta/quinta";
// import CursosCapacitacionesPage from "./app/cursoscap/page";
import CursosPage from "./app/cursoscap/page";
import CursoDetailPage from "./app/cursoscap/[id]/page";
import SegurosPage from "./app/seguros/page";
import Asociados from "./app/asociados/page";
import Blog from "./app/blog/page";
import BlogDetailPage from "./app/blog/[id]/page";

function ScrollToTop() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (hash) return;
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [pathname, hash]);
  return null;
}

export default function WebRoutes() {
  return (
    <Suspense fallback={<div style={{ padding: 24 }}>Cargando…</div>}>
      <Header />
      <ScrollToTop />

      <Routes>
        {/* 403 opcional */}
        <Route path="/403" element={<Forbidden403 />} />

        {/* Admin: login SIEMPRE público */}
        <Route path="/admin/login" element={<AdminLogin />} />

        {/* Admin: rutas protegidas para web editor */}
        <Route
          element={
            <RequireWebEditor
              redirectUnauthedTo="/panel/login" // si no está logueado
              forbidAs403={false} // si no tiene scope web:editor → /panel/dashboard
            />
          }
        >
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
          {/* alias que usás desde el login de la app */}
          <Route path="/admin/dashboard-web" element={<AdminDashboard />} />
          <Route path="/admin/medicos-promo" element={<AdminMedicosPromo />} />
        </Route>

        {/* Rutas públicas */}
        <Route path="/" element={<Home />} />
        <Route path="/contacto" element={<Contacto />} />
        <Route path="/noticias" element={<NoticiasPage />} />
        <Route path="/noticias/:id" element={<NoticiaDetail />} />
        <Route path="/cursos" element={<CursosPage />} />
        <Route path="/cursos/:id" element={<CursoDetailPage />} />
        <Route path="/nosotros" element={<NosotrosPage />} />
        <Route path="/servicios" element={<Servicios />} />
        <Route path="/notFound" element={<NotFound />} />
        <Route path="/galeria" element={<GaleriaPage />} />
        <Route path="/convenios" element={<ConveniosPage />} />
        <Route path="/quinta" element={<QuintaPage />} />
        {/* <Route path="/cursoscap" element={<CursosCapacitacionesPage />} /> */}
        <Route path="/seguros" element={<SegurosPage />} />
        <Route path="/medicos-asociados" element={<Asociados />} />
        <Route path="/blogs" element={<Blog />} />
        <Route path="/blogs/:id" element={<BlogDetailPage />} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      <Footer />
    </Suspense>
  );
}
