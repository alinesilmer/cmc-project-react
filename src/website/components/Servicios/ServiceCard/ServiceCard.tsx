"use client"

import type React from "react"

import { motion } from "framer-motion"
import styles from "./ServiceCard.module.scss"

interface ServiceCardProps {
  title: string
  description: string
  color: "green" | "yellow" | "pink" | "blue"
  icon?: React.ReactNode
  delay?: number
}

export default function ServiceCard({ title, description, color, icon, delay = 0 }: ServiceCardProps) {
  return (
    <motion.div
      className={`${styles.card} ${styles[color]}`}
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay, duration: 0.5 }}
      whileHover={{ y: -10 }}
    >
      <div className={styles.content}>
        <h3 className={styles.title}>{title}</h3>
        <p className={styles.description}>{description}</p>
        {icon && <div className={styles.illustration}>{icon}</div>}
      </div>

    </motion.div>
  )
}
