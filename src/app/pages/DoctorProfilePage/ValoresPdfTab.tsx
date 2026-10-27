import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { FileText, SearchX } from "lucide-react";

import styles from "./ValoresPdfTab.module.scss";
import { abrirAdjunto } from "@/app/shared/lib/archivos";
import { formatFecha } from "@/app/shared/lib/fechas";
import { useNotify } from "@/app/hooks/useNotify";
import { listTodosValorDocumentos } from "@/app/pages/NomencladorNacional/nomenclador.api";
import type { ValorDocumentoOut } from "@/app/pages/NomencladorNacional/nomenclador.types";
import SearchField from "@/app/components/ui/SearchField/SearchField";
import Tabla from "@/app/components/ui/Tabla/Tabla";
import Cargando from "@/app/components/ui/Cargando/Cargando";

const PDF = "application/pdf";

/** Minúsculas y sin tildes: "Prevención" tiene que aparecer buscando "prevencion". */
function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

function nombreObraSocial(doc: ValorDocumentoOut): string {
  return doc.obra_social_nombre?.trim() || `O.S. ${doc.obra_social_nro}`;
}

/** Pestaña «Valores PDF» de "Mi perfil" del personal: los PDF adjuntados en el historial de valores de cada obra social, juntos en una sola tabla. */
export default function ValoresPdfTab() {
  const notify = useNotify();
  const [busqueda, setBusqueda] = useState("");

  const { data: documentos = [], isLoading, error } = useQuery({
    queryKey: ["valores-documentos-todos"],
    queryFn: listTodosValorDocumentos,
    staleTime: 5 * 60 * 1000,
  });

  const pdfs = useMemo(
    () => documentos.filter((d) => d.content_type === PDF),
    [documentos],
  );

  const visibles = useMemo(() => {
    const termino = normalizar(busqueda.trim());
    if (!termino) return pdfs;
    return pdfs.filter((d) =>
      normalizar(
        [
          nombreObraSocial(d),
          d.obra_social_nro,
          d.nombre_original,
          d.descripcion ?? "",
          formatFecha(d.vigencia_desde),
        ].join(" "),
      ).includes(termino),
    );
  }, [pdfs, busqueda]);

  if (isLoading) {
    return (
      <div className={styles.estado}>
        <Cargando size={22} />
      </div>
    );
  }

  if (error) {
    const sinPermiso = isAxiosError(error) && error.response?.status === 403;
    return (
      <div className={styles.estado}>
        <SearchX size={28} />
        <span>
          {sinPermiso
            ? "No tenés permiso para ver los valores."
            : "No se pudieron cargar los documentos."}
        </span>
      </div>
    );
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.barra}>
        <SearchField
          placeholder="Buscar obra social o archivo"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          onClear={() => setBusqueda("")}
        />
        <span className={styles.contador}>
          {busqueda.trim() ? `${visibles.length} de ${pdfs.length}` : pdfs.length}
        </span>
      </div>

      {visibles.length === 0 ? (
        <div className={styles.estado}>
          <SearchX size={28} />
          <span>{pdfs.length === 0 ? "Sin PDF cargados." : "Sin resultados."}</span>
        </div>
      ) : (
        <div className={styles.tablaWrap}>
          <Tabla className={styles.tabla}>
            <thead>
              <tr>
                <th>Obra social</th>
                <th>Vigencia</th>
                <th>PDF</th>
                <th>Nota</th>
              </tr>
            </thead>
            <tbody>
              {visibles.map((doc) => (
                <tr key={doc.id}>
                  <td>
                    <span className={styles.os}>{nombreObraSocial(doc)}</span>
                    <span className={styles.osNro}>N° {doc.obra_social_nro}</span>
                  </td>
                  <td className={styles.fecha}>{formatFecha(doc.vigencia_desde)}</td>
                  <td>
                    <button
                      type="button"
                      className={styles.archivo}
                      title={doc.nombre_original}
                      onClick={() =>
                        abrirAdjunto(doc.url).catch((e: Error) => notify.error(e.message))
                      }
                    >
                      <FileText size={15} />
                      <span>{doc.nombre_original}</span>
                    </button>
                  </td>
                  <td className={styles.nota}>{doc.descripcion || "—"}</td>
                </tr>
              ))}
            </tbody>
          </Tabla>
        </div>
      )}
    </div>
  );
}
