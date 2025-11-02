"use client";

import type { ReactNode } from "react";
import styles from "./Pill.module.scss";

type Props = { icon?: ReactNode; text: string };

export default function Pill({ icon, text }: Props) {
  return (
    <span className={styles.pill}>
      {icon && <span className={styles.icon}>{icon}</span>}
      <span className={styles.text}>{text}</span>
    </span>
  );
}
