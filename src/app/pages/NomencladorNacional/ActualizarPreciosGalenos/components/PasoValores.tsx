import Paso from "@/app/components/ui/Paso/Paso";
import Aviso from "@/app/components/ui/Aviso/Aviso";
import Tabla from "@/app/components/ui/Tabla/Tabla";
import Cargando from "@/app/components/ui/Cargando/Cargando";
import c from "@/app/components/ui/Paso/Campos.module.scss";
import s from "./TablaGalenos.module.scss";
import FilaGaleno from "./FilaGaleno";
import ReplicarFamiliaBlock, {
  ErrorReplica, ResultadoReplica,
} from "../../components/ReplicarFamilia/ReplicarFamiliaBlock";
import type { ReplicaState } from "../../components/ReplicarFamilia/replicaState";
import type { GalenoResumenOut, ObraSocialFamiliaItem } from "../../nomenclador.types";
import type { ReplicaVisibilidad } from "../useGalenosOS";
import { grupoUltimaVigencia, type Grupo, type ResultadoGuardado } from "../precios.helpers";

type Props = {
  grupos: Grupo[];
  cargando: boolean;
  fallo: boolean;
  edits: Record<string, string>;
  abiertos: Record<string, boolean>;
  resultadoPorCodigo: Map<string, ResultadoGuardado>;
  resumenPorCodigo: Map<string, GalenoResumenOut>;
  cambiando: Set<string>;
  onEditar: (codigo: string, valor: string) => void;
  onAbrir: (codigo: string) => void;
  onVisible: (grupo: Grupo) => void;
  /** Los otros planes de la empresa de esta obra social. */
  familia: ObraSocialFamiliaItem[];
  replica: ReplicaState;
  onReplica: (r: ReplicaState) => void;
  /** Lo que pasó al repetir el último cambio de visibilidad en las vinculadas. */
  replicaVisibilidad: ReplicaVisibilidad | null;
  /** Se está guardando: no se cambian los destinos a mitad de camino. */
  bloqueado: boolean;
};

/** Paso «Nuevos valores»: cada galeno con su valor actual y el campo para el nuevo. */
export default function PasoValores({
  grupos,
  cargando,
  fallo,
  edits,
  abiertos,
  resultadoPorCodigo,
  resumenPorCodigo,
  cambiando,
  onEditar,
  onAbrir,
  onVisible,
  familia,
  replica,
  onReplica,
  replicaVisibilidad,
  bloqueado,
}: Props) {
  return (
    <Paso numero={2} titulo="Nuevos valores">
      <Aviso tono="info">
        En los nivelados, el valor se aplica a todos los niveles y conserva sus unidades. Con el interruptor apagado, el galeno no
        aparece en el boletín de los médicos de esta obra social; no cambia precios ni facturación.
      </Aviso>

      <ReplicarFamiliaBlock
        familia={familia}
        value={replica}
        onChange={onReplica}
        disabled={bloqueado}
        descripcion="Al guardar los valores nuevos y al mostrar u ocultar un galeno, el mismo cambio se hace en las obras sociales elegidas (mismo código, todos sus niveles). Si un plan no tiene el galeno, al guardar el valor se crea; al cambiar la visibilidad se omite. La vigencia nueva tiene que ser posterior a la que ya tenga cada plan."
      />
      {replicaVisibilidad && (
        <>
          <p className={c.ayuda}>Visibilidad de «{replicaVisibilidad.nombre}» en las obras sociales vinculadas:</p>
          {replicaVisibilidad.error ? (
            <ErrorReplica mensaje={replicaVisibilidad.error} />
          ) : (
            <ResultadoReplica resultados={replicaVisibilidad.resultados} />
          )}
        </>
      )}

      {cargando && (
        <p className={c.ayuda}>
          <Cargando size={14} /> Cargando galenos…
        </p>
      )}
      {fallo && <p className={c.ayuda} role="alert">No se pudieron cargar los galenos.</p>}
      {!cargando && !fallo && grupos.length === 0 && (
        <p className={c.ayuda}>Esta obra social no tiene galenos activos: se crean desde Galenos.</p>
      )}

      {grupos.length > 0 && (
        <div className={s.envoltorio}>
          <Tabla>
            <thead>
              <tr>
                <th>Galeno</th>
                <th>Modo</th>
                <th>Unidad actual</th>
                <th>Última vigencia</th>
                <th>Nueva unidad</th>
                <th>Visible en boletín</th>
              </tr>
            </thead>
            <tbody>
              {grupos.map((g) => (
                <FilaGaleno
                  key={g.codigo}
                  grupo={g}
                  valor={edits[g.codigo] ?? ""}
                  resultado={resultadoPorCodigo.get(g.codigo)}
                  abierto={!!abiertos[g.codigo]}
                  info={resumenPorCodigo.get(g.codigo)}
                  ultimaVigencia={grupoUltimaVigencia(g)}
                  cambiando={cambiando.has(g.codigo)}
                  onEditar={onEditar}
                  onAbrir={onAbrir}
                  onVisible={onVisible}
                />
              ))}
            </tbody>
          </Tabla>
        </div>
      )}
    </Paso>
  );
}
