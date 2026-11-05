/** La única descarga en curso del panel: el modal que bloquea la pantalla lee su fase. */
export type FaseDescarga = "libre" | "generando" | "listo" | "error";

/** Si el archivo no sale en este tiempo, se da por fallido para no dejar la pantalla bloqueada. */
const LIMITE_MS = 5 * 60 * 1000;
/** Tras terminar la tarea, lo que tarda en aparecer el archivo cuando se guarda justo después. */
const ESPERA_ARCHIVO_MS = 700;

let fase: FaseDescarga = "libre";
/** Si la descarga en curso ya entregó su archivo. */
let entregado = false;
const suscriptores = new Set<() => void>();

function emitir(siguiente: FaseDescarga) {
  fase = siguiente;
  suscriptores.forEach((s) => s());
}

export function suscribirDescarga(suscriptor: () => void): () => void {
  suscriptores.add(suscriptor);
  return () => suscriptores.delete(suscriptor);
}

export function leerDescarga(): FaseDescarga {
  return fase;
}

/** Cierra el modal una vez que terminó (con éxito o con error). */
export function cerrarDescarga(): void {
  if (fase === "listo" || fase === "error") emitir("libre");
}

/** Para los archivos que se entregan sin descarga (un PDF cargado en otra pestaña): quien lo hace avisa acá. */
export function avisarArchivo(): void {
  if (fase === "generando") entregado = true;
}

/** Mientras corre, cualquier `<a download>` que se dispare cuenta como archivo entregado: todos los guardados (file-saver, jsPDF, SheetJS) terminan así. */
function vigilarArchivo() {
  const ancla = HTMLAnchorElement.prototype;
  const marcar = (a: HTMLAnchorElement) => {
    if (a.hasAttribute("download")) entregado = true;
  };
  ancla.click = function (this: HTMLAnchorElement) {
    marcar(this);
    HTMLElement.prototype.click.call(this);
  };
  ancla.dispatchEvent = function (this: HTMLAnchorElement, evento: Event) {
    if (evento.type === "click") marcar(this);
    return EventTarget.prototype.dispatchEvent.call(this, evento);
  };
  return () => {
    Reflect.deleteProperty(ancla, "click");
    Reflect.deleteProperty(ancla, "dispatchEvent");
  };
}

const esperar = (ms: number) => new Promise<void>((r) => window.setTimeout(r, ms));

/**
 * Corre la tarea que genera un archivo con el modal de espera encima. Termina en «listo» sólo si el
 * navegador recibió un archivo; si la tarea falla o no entrega nada, termina en «error».
 */
export async function conDescarga(tarea: () => unknown): Promise<void> {
  if (fase !== "libre") return;
  entregado = false;
  emitir("generando");
  const soltar = vigilarArchivo();
  let fallo = false;
  let reloj = 0;
  try {
    const limite = new Promise<never>((_, rechazar) => {
      reloj = window.setTimeout(() => rechazar(new Error("La descarga tardó demasiado.")), LIMITE_MS);
    });
    await Promise.race([Promise.resolve(tarea()), limite]);
  } catch (e) {
    fallo = true;
    console.error("Descarga:", e);
  } finally {
    window.clearTimeout(reloj);
  }
  if (!fallo && !entregado) await esperar(ESPERA_ARCHIVO_MS);
  soltar();
  emitir(!fallo && entregado ? "listo" : "error");
}
