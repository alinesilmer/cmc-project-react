import { FileText, Image, Paperclip } from "lucide-react";
import type { TipoArchivo } from "../../../lib/documentos";

type Props = { tipo: TipoArchivo; size?: number; className?: string };

const ICONOS = { pdf: FileText, imagen: Image, otro: Paperclip } as const;

/** Ícono según el tipo de archivo. Antes eran emojis (📄 🖼️ 📎). */
export default function IconoArchivo({ tipo, size = 16, className }: Props) {
  const Icono = ICONOS[tipo];
  return <Icono size={size} className={className} aria-hidden="true" />;
}
