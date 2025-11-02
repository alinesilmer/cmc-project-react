import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { FiArrowUpRight } from "react-icons/fi";
import styles from "./CategoryCard.module.scss";

interface CategoryCardProps {
  title: string;
  description: string;
  image?: string;
  color: "coral" | "orange" | "teal" | "blue" | "mint";
  href: string;
}

export default function CategoryCard({
  title,
  description,
  image,
  color,
  href,
}: CategoryCardProps) {
  return (
    <Link className={styles.cardWrapper} to={href} aria-label={title}>
      <motion.div
        className={`${styles.card} ${styles[color]}`}
        whileHover={{ y: -8, scale: 1.02 }}
        transition={{ duration: 0.25 }}
      >
        <div className={styles.content}>
          <h3 className={styles.title}>{title}</h3>
          <p className={styles.description}>{description}</p>
          <motion.button
            className={styles.button}
            whileHover={{ scale: 1.06 }}
            whileTap={{ scale: 0.95 }}
          >
            <FiArrowUpRight />
          </motion.button>
        </div>
        <div className={styles.imageWrapper}>
          <img src={image}  />
        </div>
      </motion.div>
    </Link>
  );
}
