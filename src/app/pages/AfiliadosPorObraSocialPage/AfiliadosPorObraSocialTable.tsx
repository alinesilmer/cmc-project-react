import { memo, useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import DobleScroll from "@/app/components/ui/DobleScroll/DobleScroll";
import type { ExportField, ExportRow } from "./types";
import styles from "./Padrones.module.scss";
import Tabla from "@/app/components/ui/Tabla/Tabla";
import BotonVer from "@/app/components/ui/BotonVer/BotonVer";

const PAGE_SIZE = 50;

type Props = {
  rows: ExportRow[];
  /** Las columnas elegidas en «Datos a mostrar», en el orden del catálogo. */
  campos: ExportField[];
  tableQuery: string;
  totalCount: number;
  /** Las fichas todavía no llegaron: esas columnas se ven en espera. */
  fichasPendientes: boolean;
  onNavigate: (id: unknown) => void;
};

const AfiliadosPorObraSocialTable = memo(function AfiliadosPorObraSocialTable({
  rows,
  campos,
  tableQuery,
  totalCount,
  fichasPendientes,
  onNavigate,
}: Props) {
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
  }, [rows]);

  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const pageRows = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const prevPage = useCallback(() => setPage((p) => Math.max(1, p - 1)), []);
  const nextPage = useCallback(
    () => setPage((p) => Math.min(totalPages, p + 1)),
    [totalPages]
  );

  return (
    <>
      <p className={styles.resultsCount}>
        <strong>
          {rows.length === totalCount
            ? rows.length
            : `${rows.length} de ${totalCount}`}
        </strong>{" "}
        {rows.length === 1 ? "prestador" : "prestadores"}
        {rows.length > PAGE_SIZE && (
          <> · página <strong>{page}</strong> de <strong>{totalPages}</strong></>
        )}
      </p>

      <DobleScroll className={styles.tableWrapper}>
        <Tabla className={styles.table}>
          <thead>
            <tr>
              {campos.map((c) => (
                <th key={c.key} className={c.align === "center" ? styles.centrada : undefined}>
                  {c.short}
                </th>
              ))}
              <th className={styles.colAccion} aria-label="Acciones" />
            </tr>
          </thead>
          <tbody>
            {pageRows.length === 0 ? (
              <tr>
                <td colSpan={campos.length + 1} className={styles.noResults}>
                  No se encontraron prestadores que coincidan con &ldquo;
                  {tableQuery}&rdquo;
                </td>
              </tr>
            ) : (
              pageRows.map((p, idx) => (
                <tr key={String(p.id ?? `${p.nro_socio ?? ""}-${p.matricula_prov ?? ""}-${idx}`)}>
                  {campos.map((c) => {
                    const enEspera = fichasPendientes && c.source === "medico";
                    const valor = enEspera ? "" : c.get(p);
                    return (
                      <td
                        key={c.key}
                        className={`${c.align === "center" ? styles.centrada : ""} ${c.key === "nom" ? styles.tdName : ""}`}
                      >
                        {enEspera ? (
                          <span className={styles.hueso} />
                        ) : (
                          valor || <span className={styles.vacio}>—</span>
                        )}
                      </td>
                    );
                  })}
                  <td className={styles.colAccion}>
                    <BotonVer onClick={() => onNavigate(p.id)} disabled={!p.id} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </Tabla>
      </DobleScroll>

      {totalPages > 1 && (
        <div className={styles.pagination}>
          <button
            type="button"
            className={styles.paginationBtn}
            onClick={prevPage}
            disabled={page === 1}
            aria-label="Página anterior"
          >
            <ChevronLeft size={16} />
          </button>

          <div className={styles.paginationPages}>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(
                (n) =>
                  n === 1 ||
                  n === totalPages ||
                  (n >= page - 2 && n <= page + 2)
              )
              .reduce<(number | "…")[]>((acc, n, i, arr) => {
                if (i > 0 && n - (arr[i - 1] as number) > 1) acc.push("…");
                acc.push(n);
                return acc;
              }, [])
              .map((n, i) =>
                n === "…" ? (
                  <span key={`ellipsis-${i}`} className={styles.paginationEllipsis}>
                    …
                  </span>
                ) : (
                  <button
                    key={n}
                    type="button"
                    className={`${styles.paginationBtn} ${
                      n === page ? styles.paginationBtnActive : ""
                    }`}
                    onClick={() => setPage(n as number)}
                    aria-current={n === page ? "page" : undefined}
                  >
                    {n}
                  </button>
                )
              )}
          </div>

          <button
            type="button"
            className={styles.paginationBtn}
            onClick={nextPage}
            disabled={page === totalPages}
            aria-label="Página siguiente"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      )}
    </>
  );
});

export default AfiliadosPorObraSocialTable;
