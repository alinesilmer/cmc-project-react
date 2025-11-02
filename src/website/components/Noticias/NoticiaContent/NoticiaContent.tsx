"use client";

import { useMemo } from "react";
import { marked } from "marked";
import DOMPurify from "dompurify";

type Props = {
  contenido: string;
  className?: string;
};

export default function NoticiaContent({ contenido, className }: Props) {
  const html = useMemo(() => {
    const raw = marked.parse(contenido, { gfm: true, breaks: true }) as string;
    return DOMPurify.sanitize(raw);
  }, [contenido]);

  return (
    <div className={className} dangerouslySetInnerHTML={{ __html: html }} />
  );
}
