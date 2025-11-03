"use client"

import React, { useState } from "react"
import { motion } from "framer-motion"
import { FaArrowRight } from "react-icons/fa"
import styles from "./CategoryCard.module.scss"

interface CategoryCardProps {
  title: string
  description: string
  color: "teal" | "orange" | "blue" | "mint" | "green" | "yellow"
  href: string
  icon?: React.ReactNode
}

export default function CategoryCard({ title, description, color, href, icon }: CategoryCardProps) {
  const isExternal = href.startsWith("http")
  const [expanded, setExpanded] = useState(false)
  const bezier: [number, number, number, number] = [0.22, 1, 0.36, 1]
  const baseClasses = `${styles.card} ${styles[color]}`
  const motionShared = {
    onHoverStart: () => setExpanded(true),
    onHoverEnd: () => setExpanded(false),
    layout: true as const,
    transition: { layout: { duration: 0.3, ease: bezier } }
  }

  const cardContent = (
    <>
      <div className={styles.iconWrapper}>{icon && <span className={styles.icon}>{icon}</span>}</div>
      <div className={styles.content}>
        <h3 className={styles.title}>{title}</h3>
        <p className={styles.description}>{description}</p>
      </div>
      <motion.div className={styles.arrow} whileHover={{ x: 5 }} transition={{ duration: 0.3 }}>
        <FaArrowRight />
      </motion.div>
      <div className={styles.decorativeCircle} />
    </>
  )

  if (isExternal) {
    return (
      <motion.a
        {...motionShared}
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={baseClasses}
        style={{ height: expanded ? "auto" : "var(--category-card-h, 280px)" }}
        whileHover={{ y: -8, scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        {cardContent}
      </motion.a>
    )
  }

  return (
    <motion.a
      {...motionShared}
      href={href}
      className={baseClasses}
      style={{ height: expanded ? "auto" : "var(--category-card-h, 280px)" }}
      whileHover={{ y: -8, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      {cardContent}
    </motion.a>
  )
}
