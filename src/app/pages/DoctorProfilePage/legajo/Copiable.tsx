import type { ReactNode } from "react";
import CopyButton from "@/app/components/ui/CopyButton/CopyButton";
import styles from "../DoctorProfilePage.module.scss";
import { isBlankish, isDashish } from "./legajo.helpers";

// Valor del legajo con botón de copiar al lado.
export default function Copiable({
  label,
  value,
  copy,
  enabled,
  children,
}: {
  label: string;
  value: unknown;
  copy?: string;
  enabled: boolean;
  children: ReactNode;
}) {
  const texto = copy ?? (isBlankish(value) || isDashish(value) ? "" : String(value).trim());
  if (!enabled || !texto) return <span>{children}</span>;
  return (
    <span className={styles.valueRow}>
      {children}
      <CopyButton label={label} value={texto} />
    </span>
  );
}
