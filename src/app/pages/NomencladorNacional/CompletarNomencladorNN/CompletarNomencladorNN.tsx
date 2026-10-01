import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  DatabaseZap,
  Info,
  Loader2,
  MinusCircle,
  PlusCircle,
} from "lucide-react";

import styles from "./CompletarNomencladorNN.module.scss";
import AppSearchSelect from "../../../components/ui/AppSearchSelect/AppSearchSelect";
import ConfirmModal from "@/app/components/ui/ConfirmModal/ConfirmModal";
import { useObrasSociales } from "../../ObrasSociales/useObrasSociales";
import { completarBaseNN } from "../nomenclador.api";
import type { CompletarBaseNNResult } from "../nomenclador.types";
import { mensajeDeError } from "@/app/shared/lib/httpErrors";

const money = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 2,
});
const num = new Intl.NumberFormat("es-AR");

/** `aaaa-mm-dd` → `dd/mm/aaaa` sin pasar por Date (evita el corrimiento por UTC). */
function fechaAR(iso: string): string {
  const [a, m, d] = iso.split("-");
  return `${d}/${m}/${a}`;
}

/**
 * Herramientas → "Completar nomenclador NN".
 *
 * Deja una obra social —nueva o existente— con los 7 galenos base y todos sus
 * valores NN, como si se acabara de dar de alta, pero SIN tocar lo que ya
 * tiene: lo existente se informa y se saltea. Lo que falta se crea en $0 con
 * vigencia 01/01/1900; después alcanza con cargar el precio de los galenos base
 * (Nomenclador → Actualizar Unidades) y los NN rotan solos.
 *
 * Al elegir la obra social se pide la vista previa (`dry_run`): el mismo
 * informe que el real, sin guardar nada.
 */
export default function CompletarNomencladorNN() {
  const osQuery = useObrasSociales();
  const [os, setOs] = useState<number | null>(null);
  const [preview, setPreview] = useState<CompletarBaseNNResult | null>(null);
  const [resultado, setResultado] = useState<CompletarBaseNNResult | null>(null);
  const [cargando, setCargando] = useState<"preview" | "aplicar" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const osOptions = useMemo(
    () =>
      (osQuery.data ?? [])
        .map((o) => ({ id: o.nro_obra_social, label: `${o.nro_obra_social} · ${o.nombre}` }))
        .sort((a, b) => a.label.localeCompare(b.label, "es", { numeric: true })),
    [osQuery.data],
  );
  const osNombre = osOptions.find((o) => o.id === os)?.label ?? "";

  useEffect(() => {
    setPreview(null);
    setResultado(null);
    setError(null);
    if (os == null) return;
    let vigente = true;
    setCargando("preview");
    completarBaseNN(os, true)
      .then((r) => vigente && setPreview(r))
      .catch((e) => vigente && setError(mensajeDeError(e, "No se pudo calcular la vista previa.")))
      .finally(() => vigente && setCargando(null));
    return () => {
      vigente = false;
    };
  }, [os]);

  async function aplicar() {
    if (os == null) return;
    setConfirmOpen(false);
    setCargando("aplicar");
    setError(null);
    try {
      setResultado(await completarBaseNN(os, false));
      setPreview(null);
    } catch (e) {
      setError(mensajeDeError(e, "No se pudo completar el nomenclador."));
    } finally {
      setCargando(null);
    }
  }

  const informe = resultado ?? preview;
  const hayAlgoParaCrear =
    !!preview && (preview.galenos_creados.length > 0 || preview.nn_creados > 0);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <span className={styles.headerIcon}>
          <DatabaseZap size={20} />
        </span>
        <div>
          <h1 className={styles.title}>Completar nomenclador NN</h1>
          <p className={styles.subtitle}>
            Crea los galenos base y los valores NN que le falten a una obra social
          </p>
        </div>
      </div>

      <div className={styles.infoBox}>
        <Info size={15} style={{ flexShrink: 0, marginTop: 2 }} />
        <span>
          Lo que falta se crea <strong>en $0</strong> con vigencia{" "}
          <strong>01/01/1900</strong>: los 7 galenos base y un valor NN por cada
          código del Nomenclador Nacional. Lo que la obra social ya tiene{" "}
          <strong>no se toca</strong>. Después solo hay que cargar el precio de los
          galenos base en <em>Nomenclador → Actualizar Unidades</em> y los valores NN
          se actualizan solos.
        </span>
      </div>

      <section className={styles.card}>
        <label className={styles.label}>Obra social</label>
        <div className={styles.selectWrap}>
          <AppSearchSelect
            options={osOptions}
            value={os}
            loading={osQuery.isLoading}
            disabled={osQuery.isLoading || cargando === "aplicar"}
            onChange={(v) => setOs(v == null ? null : Number(v))}
          />
        </div>

        {cargando === "preview" && (
          <p className={styles.muted}>
            <Loader2 size={14} className={styles.spin} /> Revisando qué le falta a la obra social…
          </p>
        )}
        {cargando === "aplicar" && (
          <p className={styles.muted}>
            <Loader2 size={14} className={styles.spin} /> Creando galenos y valores NN… no cierres la página.
          </p>
        )}
        {error && (
          <div className={styles.errorBox}>
            <AlertCircle size={15} /> {error}
          </div>
        )}
      </section>

      {informe && (
        <section className={styles.card}>
          {resultado ? (
            <div className={styles.okBox}>
              <CheckCircle2 size={16} />
              <span>
                Listo: {osNombre} quedó con su nomenclador NN completo.
                {resultado.galenos_creados.length > 0 &&
                  ` Se crearon ${resultado.galenos_creados.length} galeno(s) en $0.`}
                {` Se crearon ${num.format(resultado.nn_creados)} valor(es) NN.`}
              </span>
            </div>
          ) : (
            <h2 className={styles.sectionTitle}>Vista previa — todavía no se guardó nada</h2>
          )}

          <h3 className={styles.blockTitle}>Galenos base</h3>
          <ul className={styles.lista}>
            {informe.galenos_creados.map((g) => (
              <li key={g.codigo} className={styles.itemNuevo}>
                <PlusCircle size={14} />
                <span className={styles.itemNombre}>{g.nombre}</span>
                <span className={styles.itemDetalle}>
                  {resultado ? "creado en $0" : "se crea en $0"}
                </span>
              </li>
            ))}
            {informe.galenos_existentes.map((g) => (
              <li key={g.codigo} className={styles.itemExistente}>
                <MinusCircle size={14} />
                <span className={styles.itemNombre}>{g.nombre}</span>
                <span className={styles.itemDetalle}>
                  ya existía — {money.format(Number(g.valor_unitario))} desde{" "}
                  {fechaAR(g.vigencia_desde)}, no se toca
                </span>
              </li>
            ))}
          </ul>

          <h3 className={styles.blockTitle}>Valores NN</h3>
          <div className={styles.contadores}>
            <div className={`${styles.contador} ${styles.contadorNuevo}`}>
              <strong>{num.format(informe.nn_creados)}</strong>
              <span>{resultado ? "creados" : "se crean"} en $0</span>
            </div>
            <div className={styles.contador}>
              <strong>{num.format(informe.nn_existentes)}</strong>
              <span>ya existían — no se tocan</span>
            </div>
            <div className={styles.contador}>
              <strong>{num.format(informe.total_candidatos)}</strong>
              <span>códigos del Nomenclador Nacional</span>
            </div>
          </div>
          {informe.habilitaciones_sembradas > 0 && (
            <p className={styles.muted}>
              En {num.format(informe.habilitaciones_sembradas)} código(s) nuevos se cargan
              también las especialidades que pueden cobrarlo, tomadas de la plantilla del
              código (o "sin restricción" si el código lo indica).
            </p>
          )}

          {informe.errores.length > 0 && (
            <>
              <h3 className={styles.blockTitle}>
                No se pueden crear ({informe.errores.length})
              </h3>
              <ul className={styles.lista}>
                {informe.errores.slice(0, 50).map((e) => (
                  <li key={e.codigo} className={styles.itemError}>
                    <AlertCircle size={14} />
                    <span className={styles.itemNombre}>{e.codigo}</span>
                    <span className={styles.itemDetalle}>{e.motivo}</span>
                  </li>
                ))}
              </ul>
              {informe.errores.length > 50 && (
                <p className={styles.muted}>… y {informe.errores.length - 50} más.</p>
              )}
            </>
          )}

          {!resultado && (
            <div className={styles.actions}>
              {hayAlgoParaCrear ? (
                <button
                  type="button"
                  className={styles.btnPrimary}
                  onClick={() => setConfirmOpen(true)}
                  disabled={cargando !== null}
                >
                  <DatabaseZap size={15} /> Completar nomenclador
                </button>
              ) : (
                <span className={styles.okInline}>
                  <CheckCircle2 size={15} /> Esta obra social ya tiene todo: no hay nada para crear.
                </span>
              )}
            </div>
          )}
        </section>
      )}

      <ConfirmModal
        isOpen={confirmOpen}
        variant="warning"
        title="Completar nomenclador NN"
        message={
          preview
            ? `Se van a crear en ${osNombre}:\n\n` +
              `• ${preview.galenos_creados.length} galeno(s) base en $0\n` +
              `• ${num.format(preview.nn_creados)} valor(es) NN en $0\n\n` +
              `Lo que ya existe (${preview.galenos_existentes.length} galeno(s), ` +
              `${num.format(preview.nn_existentes)} NN) no se toca.`
            : ""
        }
        confirmLabel="Completar"
        onConfirm={aplicar}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}
