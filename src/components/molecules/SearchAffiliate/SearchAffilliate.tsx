"use client";

import React, { useState } from "react";
import Button from "../../atoms/Button/Button";
import styles from "./SearchAffilliate.module.scss";

type Props = {
  value?: string;
  loading?: boolean;
  onChange?: (v: string) => void;
  onSearch?: (v: string) => void;
};

function SearchAffilliate({ value, loading, onChange, onSearch }: Props) {
  const [internal, setInternal] = useState("");

  const q = value ?? internal;
  const setQ = (v: string) => {
    setInternal(v);
    onChange?.(v);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch?.(q.trim());
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Consultar padrón de afiliados a Ioscor</h1>
      <form className={styles.form} onSubmit={handleSubmit}>
        <input
          className={styles.search}
          placeholder="Buscá a un afiliado por DNI"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <Button className={styles.button} disabled={loading}>
          {loading ? "Buscando…" : "Buscar"}
        </Button>
      </form>
    </div>
  );
}

export default SearchAffilliate;
