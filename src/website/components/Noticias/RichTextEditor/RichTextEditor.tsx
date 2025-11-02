"use client"

import { useEffect, useRef } from "react"
import styles from "./RichTextEditor.module.scss"

interface RichTextEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

export default function RichTextEditor({ value, onChange, placeholder }: RichTextEditorProps) {
  const quillRef = useRef<any>(null)
  const editorRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (typeof window !== "undefined" && editorRef.current && !quillRef.current) {
      import("react-quill").then((module) => {
        const ReactQuill = module.default
        import("react-quill/dist/quill.snow.css")

        const Quill = require("quill")

        const toolbarOptions = [
          [{ header: [1, 2, 3, false] }],
          ["bold", "italic", "underline", "strike"],
          [{ list: "ordered" }, { list: "bullet" }],
          [{ color: [] }, { background: [] }],
          ["link", "image"],
          ["clean"],
        ]

        quillRef.current = new Quill(editorRef.current, {
          theme: "snow",
          modules: {
            toolbar: toolbarOptions,
          },
          placeholder: placeholder || "Escribí el contenido de la noticia...",
        })

        quillRef.current.root.innerHTML = value

        quillRef.current.on("text-change", () => {
          onChange(quillRef.current.root.innerHTML)
        })
      })
    }
  }, [])

  useEffect(() => {
    if (quillRef.current && quillRef.current.root.innerHTML !== value) {
      quillRef.current.root.innerHTML = value
    }
  }, [value])

  return (
    <div className={styles.editorWrapper}>
      <div ref={editorRef} className={styles.editor} />
    </div>
  )
}
