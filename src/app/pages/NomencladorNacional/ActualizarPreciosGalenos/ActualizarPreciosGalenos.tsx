import { useMemo, useState } from "react";
import { Building2, TrendingUp } from "lucide-react";

import PanelGalenos from "./components/PanelGalenos";
import { useObrasSociales } from "../../ObrasSociales/useObrasSociales";
import PaginaPasos from "@/app/components/layout/PaginaPasos/PaginaPasos";
import AppSearchSelect from "@/app/components/ui/AppSearchSelect/AppSearchSelect";
import type { AppSearchSelectOption } from "@/app/components/ui/AppSearchSelect/AppSearchSelect";
import Paso from "@/app/components/ui/Paso/Paso";
import c from "@/app/components/ui/Paso/Campos.module.scss";
import Vacio from "@/app/components/ui/Vacio/Vacio";

/** Valor unitario de los galenos y gastos por obra social: se tipea el nuevo de cada uno y se guardan todos juntos. */
export default function ActualizarPreciosGalenos() {
  const [nro, setNro] = useState<number | null>(null);
  const { data: osList = [], isLoading } = useObrasSociales();

  // El número adelante: se busca por nombre o por número en el mismo campo.
  const opciones = useMemo<AppSearchSelectOption[]>(
    () => osList.map((os) => ({ id: os.nro_obra_social, label: `${os.nro_obra_social} · ${os.nombre}` })),
    [osList],
  );
  const elegida = nro === null ? undefined : osList.find((os) => os.nro_obra_social === nro);

  return (
    <PaginaPasos titulo="Actualizar galenos" icono={TrendingUp} ancha>
      <Paso numero={1} titulo="Obra social">
        <div className={c.campo}>
          <AppSearchSelect
            options={opciones}
            value={nro}
            loading={isLoading}
            onChange={(id) => setNro(id == null ? null : Number(id))}
          />
        </div>
      </Paso>

      {elegida ? (
        <PanelGalenos key={elegida.nro_obra_social} obraNro={elegida.nro_obra_social} obraNombre={elegida.nombre} />
      ) : (
        <Vacio icono={Building2}>Elegí una obra social para ver sus galenos</Vacio>
      )}
    </PaginaPasos>
  );
}
