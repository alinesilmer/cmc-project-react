import { useMemo, useState } from "react";
import { Search, ShieldCheck } from "lucide-react";

import { OBRAS_SOCIALES } from "./validaciones.config";
import type { ObraSocialConfig } from "./validaciones.types";
import ObraSocialCard, {
  obraSocialCardStyles as card,
} from "./components/ObraSocialCard";
import GuiaPortalModal from "./components/GuiaPortalModal";
import s from "./ValidacionesHub.module.scss";

export default function ValidacionesHub() {
  const [busqueda, setBusqueda] = useState("");
  const [guia, setGuia] = useState<ObraSocialConfig | null>(null);

  // Una sola grilla: el médico busca su obra social por nombre o número y la
  // tarjeta resuelve sola si se carga acá o en el portal de la obra social.
  const resultados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return OBRAS_SOCIALES;
    return OBRAS_SOCIALES.filter(
      (os) =>
        os.nombre.toLowerCase().includes(q) ||
        os.descripcion.toLowerCase().includes(q) ||
        String(os.codigo ?? "").includes(q)
    );
  }, [busqueda]);

  return (
    <div className={s.container}>
      <header className={s.header}>
        <div className={s.headerLeft}>
          <ShieldCheck size={34} className={s.headerIcon} />
          <div>
            <h1 className={s.title}>Validación de prestaciones</h1>
            <p className={s.subtitle}>
              Elegí la obra social para autorizar y cargar tus prestaciones del período.
            </p>
          </div>
        </div>

        <div className={s.searchBox}>
          <Search size={17} />
          <input
            type="search"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar obra social o número…"
            aria-label="Buscar obra social"
          />
        </div>
      </header>

      {resultados.length === 0 ? (
        <div className={s.empty}>
          <Search size={30} />
          <p>No encontramos obras sociales que coincidan con «{busqueda}».</p>
        </div>
      ) : (
        <div className={card.grid}>
          {resultados.map((os) => (
            <ObraSocialCard key={os.slug} os={os} onAbrirGuia={setGuia} />
          ))}
        </div>
      )}

      {guia && <GuiaPortalModal os={guia} onClose={() => setGuia(null)} />}
    </div>
  );
}
