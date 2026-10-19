import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight, UserRound } from "lucide-react";

import AppSearchSelect from "@/app/components/ui/AppSearchSelect/AppSearchSelect";
import type { AppSearchSelectOption } from "@/app/components/ui/AppSearchSelect/AppSearchSelect";
import {
  fetchObrasSociales,
  fetchPadrones,
  searchMedicosForPagador,
} from "@/app/pages/DoctorProfilePage/api";
import { esInactivoEnPadron, safeStr } from "./helpers";
import styles from "./Padrones.module.scss";
import Tabla from "@/app/components/ui/Tabla/Tabla";

const DIEZ_MINUTOS = 10 * 60 * 1000;

/** Padrón de un socio: en qué obras sociales figura. */
export default function PorSocio() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [options, setOptions] = useState<AppSearchSelectOption[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [socioId, setSocioId] = useState<number | null>(null);

  useEffect(() => {
    let alive = true;
    setBuscando(true);
    const t = window.setTimeout(() => {
      searchMedicosForPagador(query)
        .then((medicos) => {
          if (!alive) return;
          setOptions(
            medicos.map((m) => ({
              id: m.id,
              label: m.nro_socio != null ? `${m.nro_socio} - ${m.nombre}` : m.nombre,
            }))
          );
        })
        .catch(() => alive && setOptions([]))
        .finally(() => alive && setBuscando(false));
    }, 250);
    return () => {
      alive = false;
      window.clearTimeout(t);
    };
  }, [query]);

  // `/api/padrones/{id}` espera el ID del legajo, no el número de socio.
  const padrones = useQuery({
    queryKey: ["padrones", "socio", socioId],
    queryFn: () => fetchPadrones(socioId as number),
    enabled: socioId !== null,
  });

  // Sólo para ponerle nombre a cada número; cambia casi nunca.
  const catalogo = useQuery({
    queryKey: ["padrones", "catalogo"],
    queryFn: () => fetchObrasSociales(true),
    staleTime: DIEZ_MINUTOS,
  });

  const filas = useMemo(() => {
    const nombres = new Map((catalogo.data ?? []).map((o) => [o.NRO_OBRA_SOCIAL, o.NOMBRE]));
    return (padrones.data ?? [])
      .filter((p) => !esInactivoEnPadron({ marca: p.MARCA }))
      .map((p) => ({
        nro: p.NRO_OBRASOCIAL,
        nombre: nombres.get(p.NRO_OBRASOCIAL) ?? `Obra social ${p.NRO_OBRASOCIAL}`,
        categoria: safeStr(p.CATEGORIA).trim(),
      }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
  }, [catalogo.data, padrones.data]);

  return (
    <>
      <div className={styles.barra}>
        <div className={styles.socioPicker}>
          <AppSearchSelect
            options={options}
            value={socioId}
            loading={buscando}
            onQueryChange={setQuery}
            onChange={(id) => setSocioId(id == null ? null : Number(id))}
          />
        </div>

        {socioId !== null && (
          <button
            type="button"
            className={styles.ajusteBtn}
            onClick={() => navigate(`/panel/doctors/${socioId}`, { state: { tab: "padrones" } })}
          >
            Abrir legajo
            <ArrowUpRight size={15} aria-hidden="true" />
          </button>
        )}
      </div>

      {socioId === null ? (
        <div className={styles.emptyState}>
          <UserRound size={40} className={styles.emptyIcon} />
          <h3 className={styles.emptyTitle}>Buscá un socio</h3>
        </div>
      ) : padrones.isPending ? (
        <div className={styles.loadingState}>
          <div className={styles.progressBar}><div className={styles.progressFill} /></div>
          <p className={styles.loadingText}>Cargando obras sociales…</p>
        </div>
      ) : padrones.isError ? (
        <div className={styles.errorMessage}>No se pudo cargar el padrón de este socio.</div>
      ) : filas.length === 0 ? (
        <div className={styles.emptyState}>
          <h3 className={styles.emptyTitle}>Este socio no figura en ninguna obra social</h3>
        </div>
      ) : (
        <>
          <p className={styles.resultsCount}>
            <strong>{filas.length}</strong> {filas.length === 1 ? "obra social" : "obras sociales"}
          </p>
          <div className={styles.tableWrapper}>
            <Tabla className={styles.table}>
              <thead>
                <tr>
                  <th className={styles.centrada}>N.º</th>
                  <th>Obra social</th>
                  <th className={styles.centrada}>Categoría</th>
                </tr>
              </thead>
              <tbody>
                {filas.map((f) => (
                  <tr key={f.nro}>
                    <td className={styles.centrada}>{f.nro}</td>
                    <td className={styles.tdName}>{f.nombre}</td>
                    <td className={styles.centrada}>
                      {f.categoria || <span className={styles.vacio}>—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </Tabla>
          </div>
        </>
      )}
    </>
  );
}
