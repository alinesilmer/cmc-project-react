export type ReplicaState = { activo: boolean; destinos: number[] };

export const REPLICA_INICIAL: ReplicaState = { activo: false, destinos: [] };

/** Destinos a mandar al backend: [] si el bloque está apagado. */
export function destinosReplica(r: ReplicaState): number[] {
  return r.activo ? r.destinos : [];
}
