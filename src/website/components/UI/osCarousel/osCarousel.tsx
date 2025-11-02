"use client";

import type React from "react";
import styles from "./osCarousel.module.scss";

type Item = { name: string; image: string };

type Props = {
  items?: Item[];
  speedMs?: number;
};

interface MarqueeStyle extends React.CSSProperties {
  ["--duration"]?: string;
}

const defaults: Item[] = [
  {
    name: "OSDE",
    image:
      "https://api.dicebear.com/8.x/initials/svg?seed=OSDE&fontWeight=800&backgroundColor=0b5fff,1e40af&textColor=ffffff&radius=8",
  },
  {
    name: "Swiss Medical",
    image:
      "https://api.dicebear.com/8.x/initials/svg?seed=Swiss%20Medical&fontWeight=800&backgroundColor=0b5fff,1e40af&textColor=ffffff&radius=8",
  },
  {
    name: "Galeno",
    image:
      "https://api.dicebear.com/8.x/initials/svg?seed=Galeno&fontWeight=800&backgroundColor=0b5fff,1e40af&textColor=ffffff&radius=8",
  },
  {
    name: "Medifé",
    image:
      "https://api.dicebear.com/8.x/initials/svg?seed=Medife&fontWeight=800&backgroundColor=0b5fff,1e40af&textColor=ffffff&radius=8",
  },
  {
    name: "OMINT",
    image:
      "https://api.dicebear.com/8.x/initials/svg?seed=OMINT&fontWeight=800&backgroundColor=0b5fff,1e40af&textColor=ffffff&radius=8",
  },
  {
    name: "Accord Salud",
    image:
      "https://api.dicebear.com/8.x/initials/svg?seed=Accord%20Salud&fontWeight=800&backgroundColor=0b5fff,1e40af&textColor=ffffff&radius=8",
  },
  {
    name: "IOMA",
    image:
      "https://api.dicebear.com/8.x/initials/svg?seed=IOMA&fontWeight=800&backgroundColor=0b5fff,1e40af&textColor=ffffff&radius=8",
  },
  {
    name: "OSECAC",
    image:
      "https://api.dicebear.com/8.x/initials/svg?seed=OSECAC&fontWeight=800&backgroundColor=0b5fff,1e40af&textColor=ffffff&radius=8",
  },
  {
    name: "PAMI",
    image:
      "https://api.dicebear.com/8.x/initials/svg?seed=PAMI&fontWeight=800&backgroundColor=0b5fff,1e40af&textColor=ffffff&radius=8",
  },
  {
    name: "OBSBA",
    image:
      "https://api.dicebear.com/8.x/initials/svg?seed=OBSBA&fontWeight=800&backgroundColor=0b5fff,1e40af&textColor=ffffff&radius=8",
  },
  {
    name: "Sancor Salud",
    image:
      "https://api.dicebear.com/8.x/initials/svg?seed=Sancor%20Salud&fontWeight=800&backgroundColor=0b5fff,1e40af&textColor=ffffff&radius=8",
  },
];

export default function OSCarousel({
  items = defaults,
  speedMs = 36000,
}: Props) {
  const data = [...items, ...items];
  const inlineStyle: MarqueeStyle = { "--duration": `${speedMs}ms` };

  return (
    <section className={styles.wrapper} style={inlineStyle}>
      <div className={styles.inner}>
        <div className={styles.viewport}>
          <ul className={styles.track}>
            {data.map((it, i) => (
              <li key={`${it.name}-${i}`} className={styles.item}>
                <div className={styles.logoBox}>
                  <img
                    src={it.image}
                    alt={it.name}
                    className={styles.logo}
                    loading="lazy"
                  />
                </div>
                <span className={styles.caption}>{it.name}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
