import { useMemo } from "react";

import type { PorOSCtx } from "./useNomencladorPorOS";
import AppSearchSelect from "@/app/components/ui/AppSearchSelect/AppSearchSelect";
import type { AppSearchSelectOption } from "@/app/components/ui/AppSearchSelect/AppSearchSelect";
import Caja from "@/app/components/ui/Caja/Caja";

/** Elegir la obra social: un solo campo donde se busca por nombre o por número. */
export default function PorOSPanelObrasSociales({ ctx }: { ctx: PorOSCtx }) {
  const { osList, selectedNroOS, setSelectedNroOS, setCodeSearch } = ctx;

  // El número adelante: se puede buscar por nombre o por número en el mismo campo.
  const opciones = useMemo<AppSearchSelectOption[]>(
    () => osList.map((os) => ({ id: os.nro_obra_social, label: `${os.nro_obra_social} · ${os.nombre}` })),
    [osList],
  );

  return (
    <Caja titulo="Obra social">
      <div style={{ flex: "1 1 100%", maxWidth: "34rem" }}>
        <AppSearchSelect
          options={opciones}
          value={selectedNroOS}
          onChange={(id) => {
            setSelectedNroOS(id == null ? null : Number(id));
            setCodeSearch("");
          }}
        />
      </div>
    </Caja>
  );
}
