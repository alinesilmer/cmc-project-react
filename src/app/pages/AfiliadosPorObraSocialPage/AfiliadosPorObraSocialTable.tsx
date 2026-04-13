import { memo, useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Prestador } from "./types";
import {
  safeStr,
  pickNroPrestador,
  pickNombre,
  pickMatriculaProv,
  pickTelefonoConsulta,
  pickEspecialidad,
} from "./helpers";
import styles from "./AfiliadosPorObraSocialPage.module.scss";

const PAGE_SIZE = 50;

type Props = {
  rows: Prestador[];
  tableQuery: string;
  totalCount: number;
  onNavigate: (id: unknown) => void;
};

const AfiliadosPorObraSocialTable = memo(function AfiliadosPorObraSocialTable({
  rows,
  tableQuery,
  totalCount,
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
      <div className={styles.resultsHeader}>
        <p className={styles.resultsCount}>
          Mostrando{" "}
          <strong>
            {rows.length === totalCount
              ? rows.length
              : `${rows.length} (filtrado de ${totalCount})`}
          </strong>{" "}
          {rows.length === 1 ? "prestador" : "prestadores"}
          {rows.length > PAGE_SIZE && (
            <> &mdash; página <strong>{page}</strong> de{" "}
            <strong>{totalPages}</strong></>
          )}
        </p>
      </div>

      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>N° Socio</th>
              <th>Nombre Completo</th>
              <th>Matrícula Prov.</th>
              <th>Teléfono</th>
              <th>Especialidades</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {pageRows.length === 0 ? (
              <tr>
                <td colSpan={6} className={styles.noResults}>
                  No se encontraron prestadores que coincidan con &ldquo;
                  {tableQuery}&rdquo;
                </td>
              </tr>
            ) : (
              pageRows.map((p, idx) => {
                const nro = safeStr(pickNroPrestador(p));
                const nom = safeStr(pickNombre(p));
                const mat = safeStr(pickMatriculaProv(p));
                const tel = safeStr(pickTelefonoConsulta(p));
                const esp = safeStr(pickEspecialidad(p));
                const key = String(p.id ?? `${nro}-${mat}-${idx}`);

                return (
                  <tr key={key}>
                    <td>{nro || "—"}</td>
                    <td className={styles.tdName}>{nom || "—"}</td>
                    <td>{mat || "—"}</td>
                    <td>{tel || "—"}</td>
                    <td>{esp || "—"}</td>
                    <td>
                      <button
                        type="button"
                        className={styles.rowButton}
                        onClick={() => onNavigate(p.id)}
                        disabled={!p.id}
                      >
                        Ver
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

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
