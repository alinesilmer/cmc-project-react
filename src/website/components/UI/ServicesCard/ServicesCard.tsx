"use client"

import React from "react"
import { motion } from "framer-motion"
import { Link } from "react-router-dom"
import styles from "./ServicesCard.module.scss"

type Props = {
  icon: React.ReactNode
  title: string
  description?: string
  href?: string
  delay?: number
}

export default function ServiceCard({ icon, title, description, href, delay = 0 }: Props) {
  const content = (
    <>
      <div className={styles.icon}>{icon}</div>
      <h3 className={styles.cardTitle}>{title}</h3>
      {description && <p className={styles.cardDescription}>{description}</p>}
    
    </>
  )

  const baseProps = {
    className: styles.card,
    initial: { opacity: 0, y: 24 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true },
    transition: { duration: 0.5, delay },
  }

  if (href) {
    const isInternal = href.startsWith("/")
    return isInternal ? (
      <motion.div {...baseProps}>
        <Link to={href} className={styles.linkWrap} aria-label={title}>
          {content}
        </Link>
      </motion.div>
    ) : (
      <motion.a {...baseProps} href={href} target="_blank" rel="noopener noreferrer" aria-label={title}>
        {content}
      </motion.a>
    )
  }

  return <motion.div {...baseProps}>{content}</motion.div>
}
