import { useMemo, useState } from "react";
import { Building2, History } from "lucide-react";

import styles from "./HistorialValoresConsulta.module.scss";
import HistorialValores from "../ObrasSociales/ObrasSocialesDetalle/HistorialValores";
import { useObrasSociales } from "../ObrasSociales/useObrasSociales";
import AppSearchSelect from "@/app/components/ui/AppSearchSelect/AppSearchSelect";
import type { AppSearchSelectOption } from "@/app/components/ui/AppSearchSelect/AppSearchSelect";
import Caja from "@/app/components/ui/Caja/Caja";
import Franja from "@/app/components/layout/Franja/Franja";

/** Consulta directa del historial de valores de una obra social desde el menú, sin tener que entrar a la ficha de la OS. */
export default function HistorialValoresConsulta() {
  const [nro, setNro] = useState<number | null>(null);

  const { data: osList = [], isLoading } = useObrasSociales();

  // El número adelante: se puede buscar por nombre o por número en el mismo campo.
  const opciones = useMemo<AppSearchSelectOption[]>(
    () =>
      osList.map((os) => ({
        id: os.nro_obra_social,
        label: `${os.nro_obra_social} · ${os.nombre}`,
      })),
    [osList],
  );

  const elegida = nro === null ? undefined : osList.find((os) => os.nro_obra_social === nro);

  return (
    <div className={styles.container}>
      <Franja titulo="Historial de valores" icono={History} />

      <Caja titulo="Obra social">
        <div className={styles.selector}>
          <AppSearchSelect
            options={opciones}
            value={nro}
            loading={isLoading}
            onChange={(id) => setNro(id == null ? null : Number(id))}
          />
        </div>
      </Caja>

      {elegida ? (
        // `key`: al cambiar de obra social el panel arranca de cero (vista, filtros y página), en vez de arrastrar los de la anterior.
        <HistorialValores
          key={elegida.nro_obra_social}
          obraNro={elegida.nro_obra_social}
          obraNombre={elegida.nombre}
        />
      ) : (
        <div className={styles.prompt}>
          <Building2 size={34} aria-hidden="true" />
          <span>Elegí una obra social</span>
        </div>
      )}
    </div>
  );
}
