import { useMemo } from "react";

import type { ObraSocialListItem } from "../../ObrasSociales/obrasSociales.types";
import { useObrasSociales } from "../../ObrasSociales/useObrasSociales";

/**
 * Las obras sociales CABECERA: las que no dependen de otra. Las asociadas (planes de una misma empresa,
 * con `obra_social_principal_id`) quedan afuera, así la consulta lista cada familia una sola vez.
 */
export function useObrasSocialesCabecera(): ObraSocialListItem[] {
  const { data } = useObrasSociales();
  return useMemo(() => (data ?? []).filter((os) => !os.obra_social_principal_id), [data]);
}
