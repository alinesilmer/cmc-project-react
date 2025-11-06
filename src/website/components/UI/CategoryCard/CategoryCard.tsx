"use client"

import React from "react"
import { motion } from "framer-motion"
import styles from "./CategoryCard.module.scss"

interface CategoryCardProps {
  title: string
  description: string
  color: "teal" | "orange" | "blue" | "mint" | "green" | "yellow"
  href: string
  icon?: React.ReactNode
}

export default function CategoryCard({
  title,
  description,
  color,
  href,
  icon
}: CategoryCardProps) {
  const isExternal = /^https?:\/\//i.test(href)

  return (
    <motion.a
      href={href}
      className={`${styles.card} ${styles[color]}`}
      {...(isExternal ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      whileHover={{ y: -6, scale: 1.015 }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
      aria-label={`${title}: ${description}`}
    >
      <div className={styles.iconWrapper}>
        {icon && <span className={styles.icon}>{icon}</span>}
      </div>

      <div className={styles.content}>
        <h3 className={styles.title}>{title}</h3>
        <p className={styles.description}>{description}</p>
      </div>

      <div className={styles.decorativeCircle} />
    </motion.a>
  )
}
