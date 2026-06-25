import React, { useEffect, useRef, useState } from "react";
import { fetchAfiliado } from "../api";
import type { AfiliadoRead } from "../types";

interface Props {
  dni: string;
  onDniChange: (dni: string) => void;
  onFound: (afiliado: AfiliadoRead) => void;
  onNotFound: (dni: string) => void;
  disabled?: boolean;
  error?: string | null;
}

const MIN_DIGITS = 8;

const AfiliadoLookup: React.FC<Props> = ({ dni, onDniChange, onFound, onNotFound, disabled, error }) => {
  const [loading, setLoading] = useState(false);
  const [found, setFound] = useState<AfiliadoRead | null>(null);
  const lastFetched = useRef("");

  useEffect(() => {
    if (dni.length < MIN_DIGITS) {
      setFound(null);
      lastFetched.current = "";
      return;
    }
    if (lastFetched.current === dni) return;
    lastFetched.current = dni;

    let cancelled = false;
    setLoading(true);
    setFound(null);

    fetchAfiliado(dni)
      .then((afiliado) => {
        if (cancelled) return;
        setFound(afiliado);
        onFound(afiliado);
      })
      .catch((e: any) => {
        if (cancelled) return;
        if (e?.response?.status === 404) onNotFound(dni);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [dni]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <input
          type="text"
          inputMode="numeric"
          value={dni}
          onChange={(e) => onDniChange(e.target.value.replace(/\D/g, ""))}
          placeholder="DNI (mín. 8 dígitos)"
          disabled={disabled || loading}
          maxLength={15}
          style={{ width: 180 }}
        />
        {loading && <span style={{ fontSize: 12, color: "#64748b" }}>Buscando…</span>}
        {found && !loading && (
          <span style={{ fontSize: 12, color: "#1d9148", fontWeight: 600 }}>✓ {found.nombre}</span>
        )}
      </div>
      {error && <span style={{ fontSize: 12, color: "#cc2a2a" }}>{error}</span>}
    </div>
  );
};

export default AfiliadoLookup;
