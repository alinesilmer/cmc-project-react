import { useEffect, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, XCircle } from "lucide-react";

import Button from "@/app/components/ui/Button/Button";
import ProgressLoader from "@/app/components/ui/ProgressLoader/ProgressLoader";
import { moneda, periodoLegible } from "@/app/pages/Importaciones/formato";

import type { FaseLote, ResumenPlanilla } from "./importarPrestaciones.api";
import s from "./ImportarPrestaciones.module.scss";

/** Qué muestra el modal de la importación. */
export type EstadoModal =
  /** Antes de importar: advierte del riesgo de duplicar facturación. */
  | { tipo: "advertencia"; resumen: ResumenPlanilla }
  | {
      tipo: "importando";
      fase: FaseLote;
      hecho: number;
      total: number;
      /** Se pidió cancelar y se espera la respuesta del servidor. */
      cancelando: boolean;
      /** No se pudo pedir la cancelación (la importación sigue). */
      avisoCancelar?: string;
    }
  | {
      tipo: "terminado";
      resumen: ResumenPlanilla;
      /** Se había pedido cancelar, pero el commit ya había empezado. */
      cancelacionTardia: boolean;
    }
  | { tipo: "cancelado" }
  | { tipo: "error"; mensaje: string };

interface Props {
  estado: EstadoModal;
  obraSocial: string;
  periodo: string;
  onCancelar: () => void;
  onCerrar: () => void;
  /** «Sí, importar» en la advertencia. */
  onConfirmar: () => void;
}

/** Cuánto de la barra corresponde a cada fase: validar y grabar son casi todo el tiempo;
 * el commit final es instantáneo. */
function porcentaje(fase: FaseLote, hecho: number, total: number): number {
  const avance = total > 0 ? Math.min(hecho / total, 1) : 0;
  if (fase === "validando") return Math.round(avance * 45);
  if (fase === "grabando") return Math.round(45 + avance * 50);
  if (fase === "guardando") return 97;
  return 0;
}

function textoDeFase(fase: FaseLote, hecho: number, total: number): string {
  if (fase === "grabando") return `Grabando fila ${hecho} de ${total}`;
  if (fase === "guardando") return "Confirmando los cambios…";
  if (fase === "validando" && total > 0) return `Validando fila ${hecho} de ${total}`;
  return "Preparando la importación…";
}

export default function ModalImportacion({ estado, obraSocial, periodo, onCancelar, onCerrar, onConfirmar }: Props) {
  const dialogo = useRef<HTMLDivElement>(null);
  const importando = estado.tipo === "importando";
  // Con prestaciones sin autorización hay que tildar que se entiende el riesgo.
  const [entiende, setEntiende] = useState(false);

  // El foco entra al modal y vuelve a la página al cerrarlo.
  useEffect(() => {
    const anterior = document.activeElement as HTMLElement | null;
    dialogo.current?.focus();
    return () => anterior?.focus?.();
  }, []);

  // Mientras importa no se cierra con Escape ni con un clic afuera: sólo con «Cancelar».
  useEffect(() => {
    if (importando) return;
    const alTeclear = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCerrar();
    };
    window.addEventListener("keydown", alTeclear);
    return () => window.removeEventListener("keydown", alTeclear);
  }, [importando, onCerrar]);

  const destino = `${obraSocial} · ${periodoLegible(periodo)}`;

  return (
    <div className={s.velo}>
      <div
        ref={dialogo}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="titulo-importacion"
        className={s.modal}
      >
        {estado.tipo === "advertencia" && (
          <>
            <div className={s.modalCabecera}>
              <AlertTriangle size={30} className={s.alerta} aria-hidden="true" />
              <div>
                <h2 id="titulo-importacion">¡Atención! Posible facturación duplicada</h2>
                <p>{destino}</p>
              </div>
            </div>

            {estado.resumen.sinAutorizacion > 0 ? (
              <p className={`${s.textoModal} ${s.caja}`}>
                Considerá que si está por cargar prestaciones que <strong>no tienen número de autorización o de validación</strong>,
                puede que ya estén cargadas y, por lo tanto, <strong>se duplicaría la facturación</strong>. En esta planilla hay{" "}
                <strong>{estado.resumen.sinAutorizacion}</strong>{" "}
                {estado.resumen.sinAutorizacion === 1 ? "prestación" : "prestaciones"} sin número de autorización o de
                validación.
              </p>
            ) : (
              <p className={s.textoModal}>
                Todas las prestaciones de esta planilla tienen número de autorización o de validación.
              </p>
            )}

            {estado.resumen.afiliadosNuevos > 0 && (
              <p className={s.textoModal}>
                Además se registrarán en el padrón <strong>{estado.resumen.afiliadosNuevos}</strong>{" "}
                {estado.resumen.afiliadosNuevos === 1 ? "afiliado nuevo" : "afiliados nuevos"}.
              </p>
            )}

            {estado.resumen.sinAutorizacion > 0 && (
              <label className={s.entiendo}>
                <input type="checkbox" checked={entiende} onChange={(e) => setEntiende(e.target.checked)} />
                Entiendo que las prestaciones sin número de autorización o de validación pueden estar duplicadas.
              </label>
            )}

            <p className={s.pregunta}>
              ¿Querés importar {estado.resumen.grabables} {estado.resumen.grabables === 1 ? "prestación" : "prestaciones"} en{" "}
              {obraSocial}?
            </p>
            <div className={s.modalPie}>
              <Button type="button" variant="ghost" onClick={onCerrar}>
                Volver
              </Button>
              <Button
                type="button"
                variant="primary"
                onClick={onConfirmar}
                disabled={estado.resumen.sinAutorizacion > 0 && !entiende}
              >
                Sí, importar
              </Button>
            </div>
          </>
        )}

        {estado.tipo === "importando" && (
          <>
            <ProgressLoader
              titleId="titulo-importacion"
              title={estado.cancelando ? "Cancelando la importación…" : "Importando prestaciones…"}
              subtitle={destino}
              label={textoDeFase(estado.fase, estado.hecho, estado.total)}
              percent={porcentaje(estado.fase, estado.hecho, estado.total)}
            />

            <p className={s.textoModal}>
              {estado.fase === "guardando"
                ? "Ya se está guardando: a partir de acá no se puede cancelar."
                : "Se graba todo junto al final. Si cancelás ahora, no queda ninguna prestación cargada."}
            </p>
            {estado.avisoCancelar && <p className={`${s.textoModal} ${s.error}`}>{estado.avisoCancelar}</p>}

            <div className={s.modalPie}>
              <Button
                type="button"
                variant="danger"
                onClick={onCancelar}
                disabled={estado.cancelando || estado.fase === "guardando"}
              >
                {estado.cancelando ? "Cancelando…" : "Cancelar importación"}
              </Button>
            </div>
          </>
        )}

        {estado.tipo === "terminado" && (
          <>
            <div className={s.modalCabecera}>
              <CheckCircle2 size={30} className={s.ok} aria-hidden="true" />
              <div>
                <h2 id="titulo-importacion">Importación terminada</h2>
                <p>{destino}</p>
              </div>
            </div>
            {estado.cancelacionTardia && (
              <p className={`${s.textoModal} ${s.caja}`}>
                Pediste cancelar, pero la importación ya se estaba guardando y no se llegó a frenar: las prestaciones
                quedaron cargadas.
              </p>
            )}
            <dl className={s.cifras}>
              <div className={s.cargadas}>
                <dt>Cargadas</dt>
                <dd>{estado.resumen.grabables}</dd>
              </div>
              <div>
                <dt>Importe</dt>
                <dd>{moneda.format(estado.resumen.importeTotal)}</dd>
              </div>
              <div>
                <dt>Equipos</dt>
                <dd>{estado.resumen.equipos}</dd>
              </div>
              <div>
                <dt>Quedaron afuera</dt>
                <dd>{estado.resumen.total - estado.resumen.grabables}</dd>
              </div>
            </dl>
            <div className={s.modalPie}>
              <Button type="button" variant="primary" onClick={onCerrar}>
                Cerrar
              </Button>
            </div>
          </>
        )}

        {estado.tipo === "cancelado" && (
          <>
            <div className={s.modalCabecera}>
              <AlertTriangle size={30} className={s.alerta} aria-hidden="true" />
              <div>
                <h2 id="titulo-importacion">Importación cancelada</h2>
                <p>{destino}</p>
              </div>
            </div>
            <p className={`${s.textoModal} ${s.caja}`}>
              No se cargó ninguna prestación. La previsualización sigue acá para volver a confirmar cuando quieras.
            </p>
            <div className={s.modalPie}>
              <Button type="button" variant="primary" onClick={onCerrar}>
                Cerrar
              </Button>
            </div>
          </>
        )}

        {estado.tipo === "error" && (
          <>
            <div className={s.modalCabecera}>
              <XCircle size={30} className={s.malo} aria-hidden="true" />
              <div>
                <h2 id="titulo-importacion">No se pudo importar</h2>
                <p>{destino}</p>
              </div>
            </div>
            <p className={`${s.textoModal} ${s.error}`}>{estado.mensaje}</p>
            <div className={s.modalPie}>
              <Button type="button" variant="primary" onClick={onCerrar}>
                Cerrar
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
