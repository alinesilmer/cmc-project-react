import { useMemo, type ReactNode } from "react";
import { CheckCircle2, ChevronDown, ChevronRight } from "lucide-react";

import {
  ORDEN_SEVERIDAD,
  SEVERIDAD_LABEL,
  type ChequeoPadron,
  type Severidad,
} from "../../auditoria.api";
// La hoja es la del control de datos del padrón.
import styles from "../../AuditoriaPadron.module.scss";

const numero = new Intl.NumberFormat("es-AR");

const claseSev = (s: Severidad) =>
  ({ alta: styles.sevAlta, media: styles.sevMedia, baja: styles.sevBaja, info: styles.sevInfo })[s];

type Props<C extends ChequeoPadron> = {
  chequeos: C[];
  /** Id del chequeo desplegado, o `null` si están todos cerrados. */
  abierto: string | null;
  onAbrir: (id: string | null) => void;
  /** El detalle del chequeo desplegado: quiénes son los casos. */
  children: (chequeo: C) => ReactNode;
};

/** Chequeos agrupados por severidad. */
export default function ListaChequeos<C extends ChequeoPadron>({ chequeos, abierto, onAbrir, children }: Props<C>) {
  const porSeveridad = useMemo(() => {
    const mapa = new Map<Severidad, C[]>();
    for (const c of chequeos) {
      const lista = mapa.get(c.severidad) ?? [];
      lista.push(c);
      mapa.set(c.severidad, lista);
    }
    // Dentro de cada grupo, primero lo que más casos tiene.
    for (const lista of mapa.values()) lista.sort((a, b) => b.casos - a.casos);
    return mapa;
  }, [chequeos]);

  return (
    <>
      {ORDEN_SEVERIDAD.map((sev) => {
        const lista = porSeveridad.get(sev) ?? [];
        if (!lista.length) return null;

        return (
          <section key={sev} className={styles.grupo}>
            <h2 className={styles.grupoTitulo}>
              <span className={`${styles.chipSev} ${claseSev(sev)}`}>{SEVERIDAD_LABEL[sev]}</span>
            </h2>

            {lista.map((c) => {
              const activo = abierto === c.id;
              return (
                <article key={c.id} className={styles.chequeo}>
                  <button
                    type="button"
                    className={styles.chequeoHead}
                    onClick={() => onAbrir(activo ? null : c.id)}
                    aria-expanded={activo}
                    disabled={c.casos === 0}
                  >
                    {c.casos === 0 ? (
                      <CheckCircle2 size={18} className={styles.flecha} />
                    ) : activo ? (
                      <ChevronDown size={18} className={styles.flecha} />
                    ) : (
                      <ChevronRight size={18} className={styles.flecha} />
                    )}

                    <span className={styles.chequeoTexto} title={c.descripcion}>
                      <span className={styles.chequeoTitulo}>{c.titulo}</span>
                    </span>

                    <span className={`${styles.casos} ${c.casos === 0 ? styles.casosCero : ""}`}>
                      {numero.format(c.casos)}
                    </span>
                  </button>

                  {activo && <div className={styles.detalle}>{children(c)}</div>}
                </article>
              );
            })}
          </section>
        );
      })}
    </>
  );
}
