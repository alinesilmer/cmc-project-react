import { useMemo } from "react";
import { marked } from "marked";
import DOMPurify from "dompurify";

type Props = {
  contenido: string;
  className?: string;
};

export default function NoticiaContent({ contenido, className }: Props) {
  const html = useMemo(() => {
    try {
      const raw = marked.parse(contenido, { gfm: true, breaks: true }) as string;
      return DOMPurify.sanitize(raw);
    } catch {
      return contenido.replace(/</g, "&lt;").replace(/>/g, "&gt;");
    }
  }, [contenido]);

  return (
    <div className={className} dangerouslySetInnerHTML={{ __html: html }} />
  );
}
