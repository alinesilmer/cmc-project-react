import React from "react";
import styles from "./InfoHero.module.scss";

export type InfoHeroItem = {
  title: string;
  description?: string;
};

type InfoHeroProps = {
  items: InfoHeroItem[];
  className?: string;
};

const InfoHero: React.FC<InfoHeroProps> = ({ items, className = "" }) => {
  if (!items?.length) return null;

  return (
    <div className={[styles.container, className].filter(Boolean).join(" ")}>
      {items.map((item, idx) => {
        const title = String(item.title ?? "").trim();
        const description = String(item.description ?? "").trim();

        if (!title && !description) return null;

        return (
          <div key={`${title || "item"}-${idx}`} className={styles.card}>
            {title ? <h3 className={styles.title}>{title}</h3> : null}
            {description ? <p className={styles.description}>{description}</p> : null}
          </div>
        );
      })}
    </div>
  );
};

export default InfoHero;
