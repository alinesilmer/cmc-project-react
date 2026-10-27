import { useMemo, useState } from "react";
import { Building2, Percent } from "lucide-react";

import PanelAumento from "./components/PanelAumento";
import { useObrasSociales } from "../../ObrasSociales/useObrasSociales";
import PaginaPasos from "@/app/components/layout/PaginaPasos/PaginaPasos";
import AppSearchSelect from "@/app/components/ui/AppSearchSelect/AppSearchSelect";
import type { AppSearchSelectOption } from "@/app/components/ui/AppSearchSelect/AppSearchSelect";
import Paso from "@/app/components/ui/Paso/Paso";
import c from "@/app/components/ui/Paso/Campos.module.scss";
import Vacio from "@/app/components/ui/Vacio/Vacio";

/** Aumento o baja porcentual de los valores de una obra social, en pasos: se revisa lo que cambia antes de guardar. */
export default function AumentoPorcentual() {
  const [nro, setNro] = useState<number | null>(null);
  const { data: osList = [], isLoading } = useObrasSociales();

  // El número adelante: se busca por nombre o por número en el mismo campo.
  const opciones = useMemo<AppSearchSelectOption[]>(
    () => osList.map((os) => ({ id: os.nro_obra_social, label: `${os.nro_obra_social} · ${os.nombre}` })),
    [osList],
  );
  const elegida = nro === null ? undefined : osList.find((os) => os.nro_obra_social === nro);

  return (
    <PaginaPasos titulo="Aumento porcentual" icono={Percent}>
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
        <PanelAumento key={elegida.nro_obra_social} obraNro={elegida.nro_obra_social} obraNombre={elegida.nombre} />
      ) : (
        <Vacio icono={Building2}>Elegí una obra social para empezar</Vacio>
      )}
    </PaginaPasos>
  );
}
