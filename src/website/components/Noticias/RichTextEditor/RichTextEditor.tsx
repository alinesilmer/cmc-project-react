"use client";

import { useEffect, useRef } from "react";
import styles from "./RichTextEditor.module.scss";
// ✅ usamos el CSS de Quill, no el de react-quill
import "quill/dist/quill.snow.css";

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export default function RichTextEditor({
  value,
  onChange,
  placeholder,
}: RichTextEditorProps) {
  const quillRef = useRef<any>(null);
  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let disposed = false;

    (async () => {
      if (
        typeof window === "undefined" ||
        !editorRef.current ||
        quillRef.current
      )
        return;

      // ✅ import dinámico ESM; evitá `require(...)` en Vite
      const { default: Quill } = await import("quill");

      const toolbarOptions = [
        [{ header: [1, 2, 3, false] }],
        ["bold", "italic", "underline", "strike"],
        [{ list: "ordered" }, { list: "bullet" }],
        [{ color: [] }, { background: [] }],
        ["link", "image"],
        ["clean"],
      ];

      if (disposed) return;

      quillRef.current = new Quill(editorRef.current, {
        theme: "snow",
        modules: { toolbar: toolbarOptions },
        placeholder: placeholder || "Escribí el contenido de la noticia...",
      });

      quillRef.current.root.innerHTML = value || "";

      quillRef.current.on("text-change", () => {
        onChange(quillRef.current.root.innerHTML);
      });
    })();

    return () => {
      disposed = true;
      quillRef.current = null;
    };
  }, [placeholder, onChange]);

  useEffect(() => {
    if (quillRef.current && quillRef.current.root.innerHTML !== value) {
      quillRef.current.root.innerHTML = value || "";
    }
  }, [value]);

  return (
    <div className={styles.editorWrapper}>
      <div ref={editorRef} className={styles.editor} />
    </div>
  );
}
