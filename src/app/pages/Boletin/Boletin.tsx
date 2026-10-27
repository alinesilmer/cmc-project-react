"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CircleAlert, Search, Trophy } from "lucide-react";

import styles from "./Boletin.module.scss";
import Button from "@/app/components/ui/Button/Button";
import { fetchRanking, type RankedOS } from "./boletin.api";
import { formatFecha, hoyISO } from "@/app/shared/lib/fechas";
import CampoFecha from "@/app/components/ui/CampoFecha/CampoFecha";
import Tabla from "@/app/components/ui/Tabla/Tabla";
import BotonDescarga from "@/app/components/ui/BotonDescarga/BotonDescarga";
import Caja, { Cajas } from "@/app/components/ui/Caja/Caja";
import Franja from "@/app/components/layout/Franja/Franja";
import SearchField from "@/app/components/ui/SearchField/SearchField";
import { exportarExcel, exportarPdf } from "@/app/pages/Reportes/exportar";
import type { ColumnaExport, DocumentoReporte } from "@/app/pages/Reportes/exportar";
import { axiosErrorMessage } from "@/app/shared/lib/utiles";
import { formatoPesos } from "@/app/shared/lib/formatos";
import { comoErrorApi } from "@/app/shared/lib/httpErrors";

type RankedEntry = {
  row: RankedOS;
  rank: number;
  rankLabel: string;
};


function buildRankedEntries(items: RankedOS[]): RankedEntry[] {
  const sorted = [...items].sort((a, b) => {
    if (b.honorariosA !== a.honorariosA) return b.honorariosA - a.honorariosA;

    const byName = a.nombre.localeCompare(b.nombre, "es", { sensitivity: "base" });
    if (byName !== 0) return byName;

    return a.nro - b.nro;
  });

  let distinctRank = 0;
  let lastAmount: number | null = null;

  return sorted.map((row) => {
    if (lastAmount === null || row.honorariosA !== lastAmount) {
      distinctRank += 1;
      lastAmount = row.honorariosA;
    }

    // El número solo: el oro, la plata y el bronce los pinta la insignia de la tabla.
    const rankLabel = String(distinctRank);

    return {
      row,
      rank: distinctRank,
      rankLabel,
    };
  });
}
// Lo que se exporta: las mismas cuatro columnas de la tabla.
const COLUMNAS: ColumnaExport<RankedEntry>[] = [
  { header: "Puesto", value: (x) => x.rank, tipo: "numero" },
  { header: "N°", value: (x) => x.row.nro },
  { header: "Obra social", value: (x) => x.row.nombre },
  { header: "Importe", value: (x) => x.row.honorariosA, tipo: "moneda" },
];

/** El documento (PDF o Excel) del ranking, con el diseño de los reportes. */
function documentoDe(items: RankedEntry[], codigo: string, fecha: string): DocumentoReporte<RankedEntry> {
  return {
    encabezado: "Ranking de obras sociales",
    titulo: "Ranking",
    periodo: `Código ${codigo.trim()}  ·  al ${formatFecha(fecha)}`,
    obraSocial: "Todas las obras sociales",
    columnas: COLUMNAS,
    filas: items,
    // Sumar precios unitarios de obras sociales distintas no dice nada.
    sinTotal: true,
    nombre: `ranking_obras_sociales_${codigo.trim() || "codigo"}`,
  };
}

const CLASE_PUESTO = ["", "rankFirst", "rankSecond", "rankThird"] as const;

export default function Boletin() {
  const mountedRef = useRef(true);

  const [data, setData] = useState<RankedOS[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [codigo, setCodigo] = useState("420101");
  // Valores vigentes a esta fecha. Hoy por defecto: es el precio que rige.
  const [fecha, setFecha] = useState(hoyISO);
  const [bajando, setBajando] = useState<"pdf" | "excel" | null>(null);

  const codigoVacio = codigo.trim() === "";

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const load = async (codigoActual: string, fechaActual: string) => {
    if (codigoActual.trim() === "") return;
    setLoading(true);
    setError(null);
    try {
      const latest = await fetchRanking(codigoActual.trim(), fechaActual);
      if (!mountedRef.current) return;
      setData(latest);
      if (latest.length === 0) setError("No se encontraron resultados para ese código.");
    } catch (e) {
      if (!mountedRef.current) return;
      setError(axiosErrorMessage(e));
      setData([]);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  };

  useEffect(() => {
    void load(codigo, fecha);
    // Sólo al montar: después se recarga desde el buscador o el selector.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const ranked = useMemo(() => buildRankedEntries(data), [data]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return ranked;
    return ranked.filter(({ row }) => {
      const name = row.nombre.toLowerCase();
      const nro = String(row.nro);
      return name.includes(q) || nro.includes(q);
    });
  }, [ranked, query]);

  const handleConsultar = async () => {
    setQuery("");
    setData([]);
    await load(codigo, fecha);
  };

  const descargar = async (formato: "pdf" | "excel") => {
    if (codigoVacio || ranked.length === 0) return;
    setBajando(formato);
    setError(null);
    try {
      const documento = documentoDe(ranked, codigo, fecha);
      if (formato === "pdf") await exportarPdf(documento);
      else await exportarExcel(documento);
    } catch (e) {
      const err = comoErrorApi(e);
      setError(
        `No se pudo generar el ${formato === "pdf" ? "PDF" : "Excel"}. ${err?.message ? String(err.message) : ""}`.trim(),
      );
    } finally {
      setBajando(null);
    }
  };

  const sinDatos = ranked.length === 0 || loading || codigoVacio;

  return (
    <div className={styles.container}>
      <Franja titulo="Ranking de valores" icono={Trophy} />

      <Cajas>
        <Caja titulo="Configuración">
          {/* Enter en cualquiera de los dos campos consulta, como el botón. */}
          <form
            className={styles.consulta}
            onSubmit={(e) => {
              e.preventDefault();
              if (!loading && !codigoVacio) void handleConsultar();
            }}
          >
            <label className={styles.campo}>
              <span>Código</span>
              <input
                id="codigoInput"
                type="text"
                inputMode="numeric"
                value={codigo}
                onChange={(e) => setCodigo(e.target.value)}
                placeholder="420101"
                aria-invalid={codigoVacio}
                className={`${styles.entrada} ${codigoVacio ? styles.entradaError : ""}`}
              />
            </label>

            {/* Los precios de una obra social cambian con cada convenio: el ranking es siempre a una fecha. */}
            <div className={styles.campo}>
              <span>Vigentes al</span>
              <CampoFecha value={fecha} onChange={(valor) => setFecha(valor)} id="fechaInput" />
            </div>

            <Button
              submit
              size="md"
              variant="primary"
              leftIcon={<Search size={18} aria-hidden="true" />}
              disabled={loading || codigoVacio}
            >
              Buscar
            </Button>
          </form>
        </Caja>

        <Caja titulo="Descargas">
          <BotonDescarga
            formato="pdf"
            onClick={() => void descargar("pdf")}
            disabled={sinDatos || bajando !== null}
            cargando={bajando === "pdf"}
          />
          <BotonDescarga
            formato="excel"
            onClick={() => void descargar("excel")}
            disabled={sinDatos || bajando !== null}
            cargando={bajando === "excel"}
          />
        </Caja>
      </Cajas>

      {loading && (
        <div className={styles.progressBar}>
          <div className={styles.progressFill} />
        </div>
      )}

      {(error || codigoVacio) && (
        <p className={styles.errorMessage} role="alert">
          <CircleAlert size={18} aria-hidden="true" />
          {codigoVacio ? "Escribí un código para consultar." : error}
        </p>
      )}

      {ranked.length > 0 && (
        <>
          <SearchField
            placeholder="Buscar por nombre o número…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onClear={() => setQuery("")}
          />

          <div className={styles.tableWrapper}>
            <Tabla>
              <thead>
                <tr>
                  <th className={styles.thRank}>Puesto</th>
                  <th className={styles.thNumber}>N°</th>
                  <th>Obra social</th>
                  <th className={styles.thAmount}>Importe</th>
                </tr>
              </thead>

              <tbody>
                {filtered.map(({ row, rank, rankLabel }) => (
                  <tr key={row.nro}>
                    <td className={styles.tdRank}>
                      <span className={`${styles.rankBadge} ${styles[CLASE_PUESTO[rank] ?? ""] ?? ""}`}>
                        {rankLabel}
                      </span>
                    </td>
                    <td className={styles.tdNumber}>{row.nro}</td>
                    <td className={styles.tdName}>{row.nombre}</td>
                    <td className={styles.tdAmount}>{formatoPesos.format(row.honorariosA)}</td>
                  </tr>
                ))}
              </tbody>
            </Tabla>
          </div>
        </>
      )}
    </div>
  );
}
