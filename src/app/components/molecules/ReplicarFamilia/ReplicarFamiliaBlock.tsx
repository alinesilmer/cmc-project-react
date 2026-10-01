import { useMemo } from "react";

import MultiSelectBuscable from "../MultiSelectBuscable/MultiSelectBuscable";
import styles from "./ReplicarFamilia.module.scss";
import type { ReplicaState } from "./replicaState";
import type {
  ObraSocialFamiliaItem,
  ReplicaResultadoItem,
} from "../../../pages/NomencladorNacional/nomenclador.types";

type BlockProps = {
  familia: ObraSocialFamiliaItem[];
  value: ReplicaState;
  onChange: (next: ReplicaState) => void;
  /** Texto que explica qué se replica en esta pantalla. */
  descripcion: string;
  disabled?: boolean;
};

/**
 * Check "Replicar en obras sociales relacionadas" + lista de los planes de la familia.
 * Arranca apagado; al prenderlo quedan todos tildados. Sin familia no se renderiza.
 */
export default function ReplicarFamiliaBlock({ familia, value, onChange, descripcion, disabled }: BlockProps) {
  const options = useMemo(
    () => familia.map((f) => ({ value: f.nro_obra_social, label: f.nombre, hint: String(f.nro_obra_social) })),
    [familia],
  );
  if (familia.length === 0) return null;

  return (
    <div className={`${styles.block} ${value.activo ? styles.blockOn : ""}`}>
      <label className={styles.toggle}>
        <input
          type="checkbox"
          checked={value.activo}
          disabled={disabled}
          onChange={(e) =>
            onChange({
              activo: e.target.checked,
              destinos: e.target.checked ? familia.map((f) => f.nro_obra_social) : [],
            })
          }
        />
        <span>
          <strong>Replicar en obras sociales relacionadas</strong>
          <small>{descripcion}</small>
        </span>
      </label>
      {value.activo && (
        <MultiSelectBuscable
          options={options}
          selected={value.destinos}
          onChange={(destinos) => onChange({ activo: true, destinos })}
          noun="obras sociales"
          disabled={disabled}
        />
      )}
    </div>
  );
}

function etiquetaEstado(r: ReplicaResultadoItem): string {
  if (r.estado === "replicado") return "Replicado";
  if (r.estado === "creado") return r.motivo ?? "Creado";
  if (r.estado === "omitido") return "Omitido";
  return "Error";
}

type ResultadoProps = {
  resultados: ReplicaResultadoItem[];
};

/** "Se replicó en las N obras sociales." o "Se replicó en X de N … excepto:" con estado por OS. */
export function ResultadoReplica({ resultados }: ResultadoProps) {
  if (resultados.length === 0) return null;
  const ok = resultados.filter((r) => r.estado === "replicado" || r.estado === "creado").length;
  const total = resultados.length;
  const todas = ok === total;
  return (
    <div className={`${styles.result} ${todas ? styles.resultOk : styles.resultWarn}`} role="status">
      <strong>
        {todas
          ? `Se replicó en ${total === 1 ? "la obra social" : `las ${total} obras sociales`}.`
          : `Se replicó en ${ok} de ${total} obras sociales${ok < total ? " excepto:" : "."}`}
      </strong>
      <ul className={styles.resultList}>
        {resultados.map((r) => (
          <li key={r.obra_social_nro}>
            <span className={`${styles.badge} ${styles[`badge_${r.estado}`]}`}>{etiquetaEstado(r)}</span>
            <span>
              {r.obra_social_nro} · {r.nombre}
              {(r.estado === "omitido" || r.estado === "error") && r.motivo ? `: ${r.motivo}` : ""}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Mensaje para cuando la replicación falla entera (red/servidor) después de guardar el origen. */
export function ErrorReplica({ mensaje }: { mensaje: string }) {
  return (
    <div className={`${styles.result} ${styles.resultErr}`} role="alert">
      <strong>No se pudo replicar en las obras sociales relacionadas.</strong>
      <span>{mensaje} El cambio en la obra social de origen ya quedó guardado.</span>
    </div>
  );
}
