"use client";

import type React from "react";
import { motion } from "framer-motion";
import styles from "./Card.module.scss";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  hoverable?: boolean;
}

const Card: React.FC<CardProps> = ({
  children,
  className = "",
  onClick,
  hoverable = false,
}) => {
  return (
    <motion.div
      className={`${styles.card} ${
        hoverable ? styles.hoverable : ""
      } ${className}`}
      onClick={onClick}
      whileHover={
        hoverable
          ? { y: -2, boxShadow: "0 20px 25px -5px rgb(0 0 0 / 0.15)" }
          : {}
      }
      transition={{ duration: 0.2 }}
    >
      {children}
    </motion.div>
  );
};

export default Card;
