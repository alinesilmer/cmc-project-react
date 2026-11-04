import { useState } from "react";

import PasoGuardar from "./PasoGuardar";
import PasoValores from "./PasoValores";
import { useEdicionPrecios } from "../useEdicionPrecios";
import { useGalenosOS } from "../useGalenosOS";
import {
  REPLICA_INICIAL, destinosReplica, type ReplicaState,
} from "@/app/pages/NomencladorNacional/components/ReplicarFamilia/replicaState";

/** Los pasos de una obra social. Se monta con `key` por obra social: cambiarla descarta lo tipeado. */
export default function PanelGalenos({ obraNro, obraNombre }: { obraNro: number; obraNombre: string }) {
  // Un solo «replicar en obras sociales vinculadas» para todo lo que se cambia acá: valores y visibilidad.
  const [replica, setReplica] = useState<ReplicaState>(REPLICA_INICIAL);
  const destinos = destinosReplica(replica);

  const g = useGalenosOS(obraNro, destinos);
  const ed = useEdicionPrecios(obraNro, g.grupos, g.galenos, g.refrescar, destinos);

  return (
    <>
      <PasoValores
        grupos={g.grupos}
        cargando={g.cargando}
        fallo={g.fallo}
        edits={ed.edits}
        abiertos={ed.abiertos}
        resultadoPorCodigo={ed.resultadoPorCodigo}
        resumenPorCodigo={g.resumenPorCodigo}
        cambiando={g.cambiando}
        onEditar={ed.editar}
        onAbrir={ed.alternarAbierto}
        onVisible={g.alternarVisible}
        familia={g.familia}
        replica={replica}
        onReplica={setReplica}
        replicaVisibilidad={g.replicaVisibilidad}
        bloqueado={ed.guardando}
      />
      <PasoGuardar ed={ed} obraNombre={obraNombre} alDescartar={() => void g.refrescar()} />
    </>
  );
}
