import { leerDescarga } from "@/app/hooks/descargas";
import { detalleDeError } from "@/app/shared/lib/httpErrors";

export type FaseProceso = "libre" | "corriendo" | "listo" | "error";

export type EstadoProceso = { fase: FaseProceso; titulo: string; detalle: string };

type Texto<T> = string | ((resultado: T) => string);

export type TextosProceso<T> = {
  /** Mientras corre («Cerrando el período»). */
  haciendo: string;
  /** Al terminar bien («Período cerrado»). */
  listo: Texto<T>;
  /** Una línea de más bajo el «listo». */
  detalleListo?: Texto<T>;
  /** Título del error (por defecto «No se pudo completar»). */
  fallo?: string;
  /** El texto del error cuando el del servidor no alcanza. */
  detalleFallo?: (error: unknown) => string | undefined;
};

/** Si la tarea no termina en este tiempo, se da por fallida para no dejar la pantalla bloqueada. */
const LIMITE_MS = 5 * 60 * 1000;

const LIBRE: EstadoProceso = { fase: "libre", titulo: "", detalle: "" };

let estado: EstadoProceso = LIBRE;
const suscriptores = new Set<() => void>();

function emitir(siguiente: EstadoProceso) {
  estado = siguiente;
  suscriptores.forEach((s) => s());
}

export function suscribirProceso(suscriptor: () => void): () => void {
  suscriptores.add(suscriptor);
  return () => suscriptores.delete(suscriptor);
}

export function leerProceso(): EstadoProceso {
  return estado;
}

/** Cierra el modal una vez que terminó (con éxito o con error). */
export function cerrarProceso(): void {
  if (estado.fase === "listo" || estado.fase === "error") emitir(LIBRE);
}

const resolver = <T>(texto: Texto<T> | undefined, resultado: T): string =>
  typeof texto === "function" ? texto(resultado) : (texto ?? "");

/**
 * Corre una acción lenta con el modal de espera encima: «haciendo…», y al terminar «listo» o el error.
 * Devuelve lo que devolvió la tarea, o `undefined` si falló (o si ya había otra acción en curso).
 */
export async function conProceso<T>(textos: TextosProceso<T>, tarea: () => Promise<T>): Promise<T | undefined> {
  if (estado.fase !== "libre" || leerDescarga() !== "libre") return undefined;
  emitir({ fase: "corriendo", titulo: textos.haciendo, detalle: "No toques nada hasta que termine." });
  let reloj = 0;
  try {
    const limite = new Promise<never>((_, rechazar) => {
      reloj = window.setTimeout(() => rechazar(new Error("La acción tardó demasiado.")), LIMITE_MS);
    });
    const resultado = await Promise.race([tarea(), limite]);
    emitir({ fase: "listo", titulo: resolver(textos.listo, resultado), detalle: resolver(textos.detalleListo, resultado) });
    return resultado;
  } catch (e) {
    console.error("Proceso:", e);
    emitir({
      fase: "error",
      titulo: textos.fallo ?? "No se pudo completar",
      detalle: textos.detalleFallo?.(e) || detalleDeError(e, "Probá de nuevo."),
    });
    return undefined;
  } finally {
    window.clearTimeout(reloj);
  }
}
