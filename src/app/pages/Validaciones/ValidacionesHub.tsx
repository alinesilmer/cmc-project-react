import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ClipboardCheck,
  ExternalLink,
  FolderOpen,
  HeartHandshake,
  Info,
  LayoutGrid,
  Search,
  type LucideIcon,
} from "lucide-react";

import { useAuth } from "@/app/auth/AuthProvider";
import { isMedico } from "@/app/auth/roles";
import { CODIGOS_CON_CARPETA, OBRAS_SOCIALES, OCULTAS_EN_OTROS, destinoObraSocial } from "./validaciones.config";
import Carpeta from "./components/Carpeta";
import { OBRAS_SOCIALES_KEY } from "@/app/pages/ObrasSociales/useObrasSociales";
import { listObrasSociales } from "@/app/pages/ObrasSociales/obrasSociales.api";
import type { ObraSocialConfig } from "./validaciones.types";
import ObraSocialCard, {
  obraSocialCardStyles as card,
} from "./components/ObraSocialCard";
import GuiaPortalModal from "./components/GuiaPortalModal";
import InfoObraSocialModal from "./components/InfoObraSocialModal";
import type { ObraSocialListItem } from "@/app/pages/ObrasSociales/obrasSociales.types";
import RequisitosModal from "./components/RequisitosModal";
import s from "./ValidacionesHub.module.scss";
import SearchField from "@/app/components/ui/SearchField/SearchField";

type Filtro = "todas" | "panel" | "externas" | "otros";

const FILTROS: { id: Filtro; titulo: string; icono: LucideIcon }[] = [
  { id: "todas", titulo: "Todas", icono: LayoutGrid },
  { id: "panel", titulo: "En el panel", icono: ClipboardCheck },
  { id: "externas", titulo: "Portal externo", icono: ExternalLink },
  { id: "otros", titulo: "Otros", icono: FolderOpen },
];

export default function ValidacionesHub() {
  const { user } = useAuth();
  const esMedico = isMedico(user);
  const [busqueda, setBusqueda] = useState("");
  const [filtro, setFiltro] = useState<Filtro>("todas");
  const [guia, setGuia] = useState<ObraSocialConfig | null>(null);
  const [requisitos, setRequisitos] = useState<ObraSocialConfig | null>(null);
  const [info, setInfo] = useState<ObraSocialListItem | null>(null);
  // Una sola grilla: el médico busca su obra social por nombre o número y la tarjeta resuelve sola si se carga acá o en…
  // El catálogo completo sólo hace falta en «Otros»; comparte caché con el resto del panel.
  const catalogo = useQuery({
    queryKey: OBRAS_SOCIALES_KEY,
    queryFn: () => listObrasSociales(),
    staleTime: 10 * 60 * 1000,
    enabled: filtro === "otros",
  });
  const otras = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return (catalogo.data ?? [])
      .filter((os) => !CODIGOS_CON_CARPETA.has(os.nro_obra_social) && !OCULTAS_EN_OTROS.has(os.nro_obra_social))
      .filter((os) => !q || os.nombre.toLowerCase().includes(q) || String(os.nro_obra_social).includes(q))
      .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
  }, [catalogo.data, busqueda]);

  const resultados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (filtro === "otros") return [];
    return OBRAS_SOCIALES.filter((os) => {
      // "En el panel" son las que se cargan acá; el resto abre otro sitio.
      const enPanel = destinoObraSocial(os, esMedico).tipo === "panel";
      if (filtro === "panel" && !enPanel) return false;
      if (filtro === "externas" && enPanel) return false;
      if (!q) return true;
      return (
        os.nombre.toLowerCase().includes(q) ||
        os.descripcion.toLowerCase().includes(q) ||
        String(os.codigo ?? "").includes(q)
      );
    });
  }, [busqueda, filtro, esMedico]);

  return (
    <div className={s.fondo}>
      <div className={s.container}>
        <div className={s.escena}>
          <header className={s.header}>
            <h1 className={s.title}>
              <ClipboardCheck size={38} strokeWidth={1.9} style={{ verticalAlign: "-4px", marginRight: 12 }} aria-hidden="true" />
              Carga de Prestaciones
            </h1>

            <div
              className={s.filtros}
              role="group"
              aria-label="Filtrar obras sociales"
            >
              {FILTROS.map(({ icono: Icono, ...f }) => (
                <button
                  key={f.id}
                  type="button"
                  className={`${s.filtro} ${filtro === f.id ? s.filtroActivo : ""}`}
                  aria-pressed={filtro === f.id}
                  onClick={() => setFiltro(f.id)}
                >
                  <Icono size={18} strokeWidth={2} aria-hidden="true" />
                  {f.titulo}
                </button>
              ))}
            </div>
          </header>

          <SearchField
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar obra social o número…"
            ariaLabel="Buscar obra social"
          />

          {filtro === "externas" && (
            <aside className={s.nota}>
              <span className={s.notaIcono} aria-hidden="true">
                <HeartHandshake size={22} strokeWidth={1.8} />
              </span>
              <div>
                <h2 className={s.notaTitulo}>
                  Estos portales no son del Colegio
                </h2>
                <p className={s.notaTexto}>
                  No podemos repararlos, pero sí ayudarte: si uno falla,
                  avisanos. Pronto, todas las obras sociales desde acá.
                </p>
              </div>
            </aside>
          )}

          {filtro === "otros" && (
            <aside className={s.nota}>
              <span className={s.notaIcono} aria-hidden="true">
                <Info size={22} strokeWidth={1.8} />
              </span>
              <div>
                <h2 className={s.notaTitulo}>Información de obras sociales</h2>
                <p className={s.notaTexto}>Tocá una carpeta para ver sus datos.</p>
              </div>
            </aside>
          )}

          {filtro === "otros" ? (
            catalogo.isPending ? (
              <div className={s.empty}><p>Cargando…</p></div>
            ) : catalogo.isError ? (
              <div className={s.empty}><p>No se pudo cargar el listado de obras sociales.</p></div>
            ) : otras.length === 0 ? (
              <div className={s.empty}>
                <Search size={30} />
                <p>{busqueda.trim() ? `No encontramos obras sociales que coincidan con «${busqueda}».` : "No hay otras obras sociales."}</p>
              </div>
            ) : (
              <div className={card.grid}>
                {otras.map((os) => (
                  <Carpeta key={os.id} nombre={os.nombre} onAbrir={() => setInfo(os)} />
                ))}
              </div>
            )
          ) : resultados.length === 0 ? (
            <div className={s.empty}>
              <Search size={30} />
              <p>
                {busqueda.trim()
                  ? `No encontramos obras sociales que coincidan con «${busqueda}».`
                  : "No hay obras sociales en este grupo."}
              </p>
            </div>
          ) : (
            <div className={card.grid}>
              {resultados.map((os) => (
                <ObraSocialCard key={os.slug} os={os} onAbrirGuia={setGuia} onRequisitos={setRequisitos} />
              ))}
            </div>
          )}
        </div>

        {guia && <GuiaPortalModal os={guia} onClose={() => setGuia(null)} />}
      {requisitos && <RequisitosModal os={requisitos} onClose={() => setRequisitos(null)} />}
      {info && <InfoObraSocialModal os={info} onClose={() => setInfo(null)} />}
      </div>
    </div>
  );
}
