import { useMemo } from "react";
import { markdownSeguro } from "@/website/lib/markdown";

type Props = {
  contenido: string;
  className?: string;
};

/** El cuerpo de una publicación. */
export default function ContenidoMarkdown({ contenido, className }: Props) {
  const html = useMemo(() => markdownSeguro(contenido), [contenido]);
  return <div className={className} dangerouslySetInnerHTML={{ __html: html }} />;
}
