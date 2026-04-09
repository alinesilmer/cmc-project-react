"use client";

import { useEffect, useState } from "react";
import ObrasSociales from "../../components/Servicios/ObrasSociales/ObrasSociales";
import type { ObraSocial } from "../../components/Servicios/ObrasSociales/ObrasSociales";
import styles from "./convenios.module.scss";
import Button from "../../components/UI/Button/Button";
import { Link } from "react-router-dom";

// ─── API config ───────────────────────────────────────────────────────────────
// In dev, use "" so the Vite proxy handles /api/* → backend (avoids CORS).
// In prod, use VITE_API_URL as the absolute base (e.g. https://api.example.com).
const API_BASE: string = import.meta.env.DEV
  ? ""
  : ((import.meta.env.VITE_API_URL as string | undefined) ?? "");

const OBRAS_SOCIALES_URL = `${API_BASE}/api/obras_social/`;

// ─── Contact constants ────────────────────────────────────────────────────────
const EMAIL = "auditoria@colegiomedicocorrientes.com";
const WA_NUMBER = "543794252323";
const WA_LINK = `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(
  "Hola, quisiera información para firmar convenio con el Colegio Médico de Corrientes, por favor. ¡Gracias!."
)}`;
const MAILTO_LINK = `mailto:${EMAIL}?subject=${encodeURIComponent(
  "Carta de presentación - Convenio"
)}&body=${encodeURIComponent(
  "Hola, adjunto carta de presentación para evaluar convenio. Gracias."
)}`;

// ─── API response normalizer ──────────────────────────────────────────────────
function normalizeObrasSociales(data: unknown): ObraSocial[] {
  const items = Array.isArray(data)
    ? data
    : Array.isArray((data as any)?.items)
    ? (data as any).items
    : Array.isArray((data as any)?.results)
    ? (data as any).results
    : [];

  return items
    .map((item: any, i: number) => {
      const nombre = String(
        item?.nombre ?? item?.NOMBRE ?? item?.name ?? item?.razon_social ?? ""
      ).trim();
      if (!nombre) return null;
      return {
        id: String(item?.id ?? item?.ID ?? item?.nro ?? `os-${i}`),
        nombre,
        href: item?.href ?? item?.url ?? item?.link ?? undefined,
      } as ObraSocial;
    })
    .filter((x: ObraSocial | null): x is ObraSocial => x !== null);
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function ConveniosPage() {
  const [obras, setObras] = useState<ObraSocial[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let aborted = false;

    fetch(OBRAS_SOCIALES_URL, { headers: { Accept: "application/json" } })
      .then((res) => {
        if (!res.ok) throw new Error(`Error ${res.status} al obtener convenios.`);
        return res.json() as Promise<unknown>;
      })
      .then((data) => {
        if (aborted) return;
        setObras(normalizeObrasSociales(data));
        setLoading(false);
      })
      .catch(() => {
        if (aborted) return;
        setError("No se pudieron cargar los convenios. Intente más tarde.");
        setLoading(false);
      });

    return () => {
      aborted = true;
    };
  }, []);

  return (
    <div className={styles.galeriaWrap}>
      <ObrasSociales
        titulo="Convenios con Obras Sociales"
        subtitulo="Coberturas y convenios vigentes con el Colegio Médico de Corrientes"
        obras={obras}
        loading={loading}
        error={error}
      />

      <div className={styles.cta}>
        <h2 className={styles.subtitle}>
          ¿Sos una Obra Social o empresa que quiere unirse al equipo de Colegio
          Médico de Corrientes? <br />
          ¡Hacé click en el botón de abajo!
        </h2>

        <Link
          to={WA_LINK}
          className={styles.subLink}
          target="_blank"
          rel="noopener noreferrer"
        >
          <Button variant="primary" size="large">
            Quiero firmar convenio
          </Button>
        </Link>

        <p className={styles.otherOption}>
          Si tienes inconvenientes, por favor enviar carta de presentación al{" "}
          <a href={MAILTO_LINK} className={styles.link} aria-label="Enviar mail">
            {EMAIL}
          </a>{" "}
          y/o mensaje de WhatsApp al{" "}
          <a
            href={WA_LINK}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.link}
            aria-label="Abrir WhatsApp"
          >
            379 425 2323
          </a>
        </p>
      </div>
    </div>
  );
}
