import { useMemo } from "react";
import { markdownSeguro } from "../../../lib/markdown";

type Props = {
  contenido: string;
  className?: string;
};

/**
 * El cuerpo de una publicación. Lo usan la página pública y la vista previa
 * del editor, para que lo que el editor ve sea exactamente lo que se publica.
 * El HTML sale de `markdownSeguro`, que lo pasa por DOMPurify.
 */
export default function ContenidoMarkdown({ contenido, className }: Props) {
  const html = useMemo(() => markdownSeguro(contenido), [contenido]);
  return <div className={className} dangerouslySetInnerHTML={{ __html: html }} />;
}
