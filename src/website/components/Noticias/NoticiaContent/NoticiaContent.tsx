import { useMemo } from "react";
import { markdownSeguro } from "../../../lib/markdown";

type Props = {
  contenido: string;
  className?: string;
};

export default function NoticiaContent({ contenido, className }: Props) {
  const html = useMemo(() => {
    return markdownSeguro(contenido);
  }, [contenido]);

  return (
    <div className={className} dangerouslySetInnerHTML={{ __html: html }} />
  );
}
