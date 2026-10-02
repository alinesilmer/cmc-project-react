import { useSearchParams } from "react-router-dom";
import PublicacionesAdmin from "../publicaciones/PublicacionesAdmin";
import AdminMedicosPromo from "../MedicosPromo/MedicosPromo";
import ValoresEticos from "../valoresEticos/ValoresEticos";
import styles from "./dashboard.module.scss";

const SOLAPAS = [
  { id: "noticias", etiqueta: "Publicaciones" },
  { id: "promo", etiqueta: "Publicidad de doctores" },
  { id: "etica", etiqueta: "Valores Éticos" },
] as const;

type Solapa = (typeof SOLAPAS)[number]["id"];

const esSolapa = (v: string | null): v is Solapa => SOLAPAS.some((s) => s.id === v);

/**
 * Administrador del contenido del sitio (/panel/sitio). Cada solapa es su
 * propio componente; acá sólo se elige cuál mostrar.
 */
export default function DashboardPage() {
  // La solapa sale de la URL para que `?tab=promo` siga siendo enlazable: es a
  // donde redirige la vieja dirección del sitio (/admin/medicos-promo).
  const [params, setParams] = useSearchParams();
  const pedida = params.get("tab");
  const solapa: Solapa = esSolapa(pedida) ? pedida : "noticias";
  const elegir = (s: Solapa) => setParams(s === "noticias" ? {} : { tab: s }, { replace: true });

  return (
    <div className={styles.dashboard}>
      <header className={styles.header}>
        <div className={styles.wrapperTabsTittle}>
          <h1>Panel de Administración</h1>
          <div className={styles.tabs} role="tablist" aria-label="Secciones del administrador">
            {SOLAPAS.map((s) => (
              <button
                key={s.id}
                type="button"
                role="tab"
                aria-selected={solapa === s.id}
                className={`${styles.tab} ${solapa === s.id ? styles.active : ""}`}
                onClick={() => elegir(s.id)}
              >
                {s.etiqueta}
              </button>
            ))}
          </div>
        </div>
      </header>

      <div className={styles.container}>
        {solapa === "noticias" && <PublicacionesAdmin />}
        {solapa === "promo" && (
          <div className={styles.tabContent}>
            <AdminMedicosPromo />
          </div>
        )}
        {solapa === "etica" && (
          <div className={styles.tabContent}>
            <ValoresEticos />
          </div>
        )}
      </div>
    </div>
  );
}
