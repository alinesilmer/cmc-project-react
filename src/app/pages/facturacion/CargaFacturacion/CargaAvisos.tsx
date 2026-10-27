import styles from "./CargaFacturacion.module.scss";
import comun from "./Comun.module.scss";
import { AlertTriangle, ArrowLeft } from "lucide-react";
import { versionLabel } from "../types";
import type { CargaCtx } from "./useCargaFacturacion";
import BotonPlano from "@/app/components/ui/BotonPlano/BotonPlano";

export default function CargaAvisos({ ctx }: { ctx: CargaCtx }) {
  const { navigate, capa, isComplemento, replicarParam, isReplicando, loadingReplicar, complementoMeta, obraSocial, periodo, volverA } = ctx;
  return (
    <>
      {!isComplemento && (periodo || obraSocial) && (
        <div className={styles.datosCarga}>
          {periodo && (
            <span className={`${comun.infoChip} ${comun.chipNeutral}`}>
              Período: {periodo.periodo_label}
            </span>
          )}
          {obraSocial && (
            <span className={`${comun.infoChip} ${comun.chipNeutral}`}>
              OS: {obraSocial.nro_obra_social} · {obraSocial.nombre}
            </span>
          )}
          <BotonPlano
            type="button"
            className={styles.backBtn}
            onClick={() => (capa ? capa.cerrar() : navigate(volverA))}
          >
            <ArrowLeft size={15} /> Volver
          </BotonPlano>
        </div>
      )}

      {isReplicando && !loadingReplicar && (
        <div className={styles.complementoAlert}>
          <AlertTriangle size={18} className={styles.complementoAlertIcon} />
          <span>
            Replicando los datos de la prestación <strong>#{replicarParam}</strong> — al guardar se
            crea una prestación <strong>nueva</strong>, la original no se modifica.
          </span>
        </div>
      )}

      {isComplemento && complementoMeta && (
        <div className={styles.complementoAlert}>
          <AlertTriangle size={18} className={styles.complementoAlertIcon} />
          <span>
            Estás cargando en una <strong>complementaria</strong> ({versionLabel(complementoMeta.version)})
            {" "}de la obra social <strong>{complementoMeta.cod_obra}</strong> en el período{" "}
            <strong>{complementoMeta.periodo_label}</strong>.
          </span>
        </div>
      )}
    </>
  );
}
