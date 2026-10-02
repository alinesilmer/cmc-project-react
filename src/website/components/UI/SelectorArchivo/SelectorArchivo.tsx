import type React from "react";
import { useRef } from "react";
import Button, { type ButtonProps } from "../Button/Button";
import { accept, filtrarValidos, type Extensiones } from "../../../lib/subidas";

type Props = {
  extensiones: Extensiones;
  multiple?: boolean;
  /** Sólo los archivos que pasaron la validación. */
  onElegir: (archivos: File[]) => void;
  /** Los motivos de rechazo ya redactados, o `null` si pasaron todos. */
  onError: (mensaje: string | null) => void;
  children: React.ReactNode;
  variant?: ButtonProps["variant"];
  size?: ButtonProps["size"];
  iconoIzquierda?: React.ReactNode;
};

/**
 * Botón que abre el diálogo de archivos y valida lo elegido antes de
 * aceptarlo. El `accept` del input es sólo una sugerencia del diálogo, así que
 * la validación se hace igual (ver `lib/subidas.ts`).
 *
 * El editor de publicaciones y el de avisos tenían tres copias de esto, cada
 * una con su input oculto, su ref y su limpieza del valor.
 */
export default function SelectorArchivo({
  extensiones,
  multiple = false,
  onElegir,
  onError,
  children,
  variant = "secondary",
  size = "medium",
  iconoIzquierda,
}: Props) {
  const input = useRef<HTMLInputElement>(null);

  const alCambiar = (e: React.ChangeEvent<HTMLInputElement>) => {
    const elegidos = Array.from(e.target.files ?? []);
    // Se limpia para que elegir de nuevo el mismo archivo vuelva a disparar.
    e.target.value = "";
    if (!elegidos.length) return;

    // Se aceptan los que sirven y se avisa por los que no, en vez de abortar
    // toda la selección por un archivo suelto.
    const { validos, errores } = filtrarValidos(elegidos, extensiones);
    onError(errores.length ? errores.join(" ") : null);
    if (validos.length) onElegir(validos);
  };

  return (
    <>
      <Button
        variant={variant}
        size={size}
        iconoIzquierda={iconoIzquierda}
        onClick={() => input.current?.click()}
      >
        {children}
      </Button>
      <input
        ref={input}
        type="file"
        accept={accept(extensiones)}
        multiple={multiple}
        hidden
        onChange={alCambiar}
      />
    </>
  );
}
