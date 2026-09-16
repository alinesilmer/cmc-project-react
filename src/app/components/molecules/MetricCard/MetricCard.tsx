import type React from "react";
import styles from "./MetricCard.module.scss";

interface MetricCardProps {
  title: string;
  value: string;
  change: string;
  trend: "up" | "down";
  color: "blue" | "orange" | "purple" | "green";
}

// `change` y `trend` siguen en las props pero hoy no se muestran.
const MetricCard: React.FC<MetricCardProps> = ({ title, value, color }) => {
  const cardColorClass = {
    blue: styles.cardBlue,
    orange: styles.cardOrange,
    purple: styles.cardPurple,
    green: styles.cardGreen,
  }[color];

  return (
    <div className={`${styles.card} ${cardColorClass}`}>
      <h3 className={styles.title}>{title}</h3>
      <p className={styles.value}>{value}</p>
    </div>
  );
};

export default MetricCard;
