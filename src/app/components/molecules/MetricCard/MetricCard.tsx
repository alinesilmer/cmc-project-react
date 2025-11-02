import type React from "react";
import styles from "./MetricCard.module.scss";

interface MetricCardProps {
  title: string;
  value: string;
  change: string;
  trend: "up" | "down";
  color: "blue" | "orange" | "purple" | "green";
}

const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  change,
  trend,
  color,
}) => {
  const cardColorClass = {
    blue: styles.cardBlue,
    orange: styles.cardOrange,
    purple: styles.cardPurple,
    green: styles.cardGreen,
  }[color];

  const trendClass = trend === "up" ? styles.trendUp : styles.trendDown;
  const trendIcon = trend === "up" ? "↑" : "↓";

  return (
    <div className={`${styles.card} ${cardColorClass}`}>
      <h3 className={styles.title}>{title}</h3>
      <p className={styles.value}>{value}</p>
      <span className={`${styles.change} ${trendClass}`}>
        {trendIcon} {change}
      </span>
    </div>
  );
};

export default MetricCard;
