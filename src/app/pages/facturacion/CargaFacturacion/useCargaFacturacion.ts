import { useCargaContexto } from "./useCargaContexto";
import { useCargaPrecios } from "./useCargaPrecios";
import { useCargaCambios } from "./useCargaCambios";
import { useCargaEdicion } from "./useCargaEdicion";
import { useCargaGuardado } from "./useCargaGuardado";
import { useCargaPantalla } from "./useCargaPantalla";

/** La lógica de CargaFacturacion, en partes encadenadas: cada una usa lo que devolvieron las anteriores. */
export function useCargaFacturacion() {
  const useCargaContextoValores = useCargaContexto();
  const useCargaPreciosValores = useCargaPrecios({ ...useCargaContextoValores });
  const useCargaCambiosValores = useCargaCambios({ ...useCargaContextoValores, ...useCargaPreciosValores });
  const useCargaEdicionValores = useCargaEdicion({ ...useCargaContextoValores, ...useCargaPreciosValores, ...useCargaCambiosValores });
  const useCargaGuardadoValores = useCargaGuardado({ ...useCargaContextoValores, ...useCargaPreciosValores, ...useCargaCambiosValores, ...useCargaEdicionValores });
  const useCargaPantallaValores = useCargaPantalla({ ...useCargaContextoValores, ...useCargaPreciosValores, ...useCargaCambiosValores, ...useCargaEdicionValores, ...useCargaGuardadoValores });

  return {
    ...useCargaContextoValores,
    ...useCargaPreciosValores,
    ...useCargaCambiosValores,
    ...useCargaEdicionValores,
    ...useCargaGuardadoValores,
    ...useCargaPantallaValores,
  };
}

export type CargaCtx = ReturnType<typeof useCargaFacturacion>;
