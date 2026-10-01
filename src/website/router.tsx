import { Suspense, lazy, useEffect } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";

const Home = lazy(() => import("./app/inicio/page"));
const Contacto = lazy(() => import("./app/contact/page"));
const NoticiasPage = lazy(() => import("./app/noticias/page"));
const BeneficiosPage = lazy(() => import("./app/beneficios/page"));
const NoticiaDetail = lazy(() => import("./app/noticias/[id]/page"));
const Forbidden403 = lazy(() => import("./app/forbidden403/Forbidden403"));
const SociosPage = lazy(() => import("./app/socios/page"));

import Header from "./components/UI/Header/Header";
import Footer from "./components/UI/Footer/Footer";
import Chatbot from "./components/Chatbot/Chatbot";
import NosotrosPage from "./app/nosotros/page";
import Servicios from "./app/servicios/page";
import ConveniosPage from "./app/convenios/convenios";
import QuintaPage from "./app/quinta/quinta";
import CursosPage from "./app/cursoscap/page";
import CursoDetailPage from "./app/cursoscap/[id]/page";
import SegurosPage from "./app/seguros/page";
import Asociados from "./app/asociados/page";
import PrevencionSaludPage from "./app/prevencion-salud/page";
import PreguntasFrecuentesPage from "./app/preguntas-frecuentes/page";

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

        {/* Admin: login público */}
        {/* El admin del sitio y el panel son las mismas cuentas: quien
            autoriza es RequireWebEditor contra la sesión del panel. Esta ruta
            tenía su propio formulario y su propio token en localStorage;
            quedó sólo la redirección. */}
        <Route path="/admin/login" element={<Navigate to="/panel/login" replace />} />

        {/* El ABM de contenido se mudó al panel: es una herramienta del
            sistema y acá quedaba envuelta en el Header, el Footer y el
            Chatbot del sitio público. Se dejan las rutas viejas
            redirigiendo para no romper enlaces guardados. */}
        <Route path="/admin/dashboard-web" element={<Navigate to="/panel/sitio" replace />} />
        <Route path="/admin/dashboard" element={<Navigate to="/panel/sitio" replace />} />
        <Route
          path="/admin/medicos-promo"
          element={<Navigate to="/panel/sitio/medicos-promo" replace />}
        />

        {/* Rutas públicas */}
        <Route path="/" element={<Home />} />
        <Route path="/contacto" element={<Contacto />} />
        <Route path="/noticias" element={<NoticiasPage />} />
        <Route path="/noticias/:id" element={<NoticiaDetail />} />
        <Route path="/cursos" element={<CursosPage />} />
        <Route path="/cursos/:id" element={<CursoDetailPage />} />
        <Route path="/nosotros" element={<NosotrosPage />} />
        <Route path="/servicios" element={<Servicios />} />
        <Route path="/convenios" element={<ConveniosPage />} />
        <Route path="/beneficios" element={<BeneficiosPage />} />
        <Route path="/quinta" element={<QuintaPage />} />
        <Route path="/seguros" element={<SegurosPage />} />
        <Route path="/medicos-asociados" element={<Asociados />} />
        <Route path="/socios" element={<SociosPage />} />
        <Route path="/prevencion-salud" element={<PrevencionSaludPage />} />
        <Route path="/preguntas-frecuentes" element={<PreguntasFrecuentesPage />} />
     

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      <Chatbot />
      <Footer />
    </Suspense>
  );
}
