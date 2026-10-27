import { memo, useEffect, useState } from "react";

import DobleScroll from "@/app/components/ui/DobleScroll/DobleScroll";
import type { ExportField, ExportRow } from "./types";
import comun from "./Comun.module.scss";
import styles from "./AfiliadosPorObraSocialTable.module.scss";;
import Tabla from "@/app/components/ui/Tabla/Tabla";
import BotonVer from "@/app/components/ui/BotonVer/BotonVer";
import Paginador from "@/app/components/ui/Paginador/Paginador";

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

  return (
    <>
      <p className={comun.resultsCount}>
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

      <DobleScroll className={comun.tableWrapper}>
        <Tabla className={comun.table}>
          <thead>
            <tr>
              {campos.map((c) => (
                <th key={c.key} className={c.align === "center" ? comun.centrada : undefined}>
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
                        className={`${c.align === "center" ? comun.centrada : ""} ${c.key === "nom" ? comun.tdName : ""}`}
                      >
                        {enEspera ? (
                          <span className={comun.hueso} />
                        ) : (
                          valor || <span className={comun.vacio}>—</span>
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
        <Paginador pagina={page} totalPaginas={totalPages} onCambiar={setPage} numerado />
      )}
    </>
  );
});

export default AfiliadosPorObraSocialTable;
