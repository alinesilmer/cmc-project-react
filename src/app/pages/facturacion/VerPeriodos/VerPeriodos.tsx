import React, { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle2, Eye, EyeOff, FileText, ListFilter, LockKeyhole, Receipt } from "lucide-react";

import { useAppSnackbar } from "@/app/hooks/useAppSnackbar";
import { conProceso } from "@/app/hooks/proceso";
import { abrirAdjunto } from "@/app/shared/lib/archivos";
import { listarFacturas, publicarPeriodo } from "../api";
import type { FacturaRead, ListarFacturasParams, ObraSocialOption } from "../types";
import { detailMessage } from "../types";
import { formatMoney } from "../money";
import { estadoLabel } from "../utiles";
import ObraSocialAutocomplete from "../components/ObraSocialAutocomplete";
import ConfirmActionModal from "../components/ConfirmActionModal";
import styles from "../ListaFacturas.module.scss";
import vp from "./VerPeriodos.module.scss";
import lq from "@/app/pages/Pagos/Liquidacion.module.scss";
import Franja, { Solapa } from "@/app/components/layout/Franja/Franja";
import { Filtros } from "@/app/components/ui/Caja/Caja";
import { filtroAncho } from "@/app/components/ui/Caja/filtroAncho";
import SearchField from "@/app/components/ui/SearchField/SearchField";
import Tabla from "@/app/components/ui/Tabla/Tabla";
import BotonVer from "@/app/components/ui/BotonVer/BotonVer";
import BotonAccion from "@/app/components/ui/BotonAccion/BotonAccion";
import Cargando from "@/app/components/ui/Cargando/Cargando";
import Paginador from "@/app/components/ui/Paginador/Paginador";
import { comoErrorApi } from "@/app/shared/lib/httpErrors";
import BotonPlano from "@/app/components/ui/BotonPlano/BotonPlano";

// Mismos estados que `FACTURA_ESTADOS_CERRADOS` en el backend (service.py): 'C' es el estado actual.
const ESTADOS_CERRADOS = new Set(["C", "L", "LC"]);

const PAGE_SIZES = [25, 50, 100, 200];
const DEFAULT_LIMIT = 50;

const SOLAPAS: Array<{ value: string; titulo: string; icono: typeof Receipt }> = [
  { value: "", titulo: "Todos", icono: ListFilter },
  { value: "A", titulo: "Abiertos", icono: CheckCircle2 },
  { value: "C", titulo: "Cerrados", icono: LockKeyhole },
];

const estadoClase = (estado: string | null): string => (estado === "A" ? lq.abierto : lq.cerrado);

const VerPeriodos: React.FC = () => {
  const navigate = useNavigate();
  const notify = useAppSnackbar();

  // Los complementos (v2+) viven en su propia sección — acá solo las facturas originales.
  const [filtros, setFiltros] = useState<ListarFacturasParams>({
    limit: DEFAULT_LIMIT,
    offset: 0,
    solo_complementos: false,
  });
  const [obraSocial, setObraSocial] = useState<ObraSocialOption | null>(null);
  const [rows, setRows] = useState<FacturaRead[]>([]);
  const [totalCount, setTotalCount] = useState<number | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [aPublicar, setAPublicar] = useState<FacturaRead | null>(null);
  const [publicando, setPublicando] = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchData = useCallback(async (f: ListarFacturasParams) => {
    setLoading(true);
    try {
      const { data, totalCount: tc } = await listarFacturas(f);
      setRows(data);
      setTotalCount(tc);
    } catch (e) {
      const err = comoErrorApi(e);
      notify(detailMessage(err?.response?.data?.detail) || "Error al cargar las facturas.", "error");
    } finally {
      setLoading(false);
    }
  }, [notify]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchData(filtros), 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [filtros, fetchData]);

  const set = (patch: Partial<ListarFacturasParams>) =>
    setFiltros((f) => ({ ...f, ...patch, offset: 0 }));

  const handleObraSocialChange = (nro: number | null, os: ObraSocialOption | null) => {
    setObraSocial(os);
    set({ cod_obra: nro ? String(nro) : undefined });
  };

  // La solapa (estado) no se limpia: es la vista elegida, no un filtro.
  const handleLimpiar = () => {
    setObraSocial(null);
    setFiltros({
      limit: filtros.limit ?? DEFAULT_LIMIT,
      offset: 0,
      solo_complementos: false,
      estado: filtros.estado,
    });
  };

  const hayFiltros = Boolean(obraSocial || filtros.periodo || filtros.usuario || filtros.q);

  const handleVer = (row: FacturaRead) => {
    navigate(`/panel/facturacion/periodos/${row.id_prestaciones}`);
  };

  const handleVerFactura = (row: FacturaRead) => {
    abrirAdjunto(row.documento_url).catch((e: Error) => notify(e.message, "error"));
  };

  const handleConfirmarPublicar = async () => {
    if (!aPublicar) return;
    setPublicando(true);
    const nuevoEstado = !aPublicar.publicado;
    await conProceso(
      {
        haciendo: nuevoEstado ? "Publicando el período" : "Despublicando el período",
        listo: nuevoEstado ? "Período publicado" : "Período despublicado",
        fallo: "No se pudo actualizar",
        detalleFallo: (e) => detailMessage(comoErrorApi(e).response?.data?.detail) || undefined,
      },
      async () => {
        await publicarPeriodo({
          cod_obra: aPublicar.cod_obr, periodo: aPublicar.periodo, publicado: nuevoEstado,
        });
        setAPublicar(null);
        await fetchData(filtros);
      },
    );
    setPublicando(false);
  };

  const limit = filtros.limit ?? DEFAULT_LIMIT;
  const offset = filtros.offset ?? 0;
  const page = Math.floor(offset / limit) + 1;
  const totalPages = totalCount !== undefined ? Math.max(1, Math.ceil(totalCount / limit)) : undefined;

  return (
    <div className={styles.container}>
      <Franja titulo="Períodos" icono={Receipt}>
        {SOLAPAS.map(({ value, titulo, icono: Icono }) => (
          <Solapa key={value} activa={(filtros.estado ?? "") === value} onClick={() => set({ estado: value || undefined })}>
            <Icono size={18} /> {titulo}
          </Solapa>
        ))}
      </Franja>

      <div className={styles.barra}>
        <SearchField
          className={styles.buscador}
          fullWidth
          placeholder="Buscar por número de factura…"
          value={filtros.q ?? ""}
          onChange={(e) => set({ q: e.target.value || undefined })}
          onClear={() => set({ q: undefined })}
        />
      </div>

      <Filtros className={styles.filtros}>
        <div className={`${lq.campo} ${filtroAncho}`}>
          <span className={lq.rotulo}>Obra social</span>
          <ObraSocialAutocomplete
            value={obraSocial?.nro_obra_social ?? null}
            onChange={handleObraSocialChange}
          />
        </div>
        <div className={lq.campo}>
          <span className={lq.rotulo}>Período</span>
          <input
            className={lq.input}
            type="text"
            inputMode="numeric"
            maxLength={6}
            placeholder="Ej. 202607"
            value={filtros.periodo ?? ""}
            onChange={(e) => set({ periodo: e.target.value || undefined })}
          />
        </div>
        <div className={lq.campo}>
          <span className={lq.rotulo}>Operador</span>
          <input
            className={lq.input}
            type="text"
            placeholder="Usuario"
            value={filtros.usuario ?? ""}
            onChange={(e) => set({ usuario: e.target.value || undefined })}
          />
        </div>
        {hayFiltros && (
          <BotonPlano type="button" className={styles.limpiar} onClick={handleLimpiar} disabled={loading}>
            Limpiar
          </BotonPlano>
        )}
      </Filtros>

      <div className={`${styles.tablaCaja} ${loading && rows.length > 0 ? styles.tablaVieja : ""}`}>
        {loading && rows.length === 0 ? (
          <div className={lq.cargando}><Cargando size={22} tono="marca" aria-label="Cargando" /></div>
        ) : rows.length === 0 ? (
          <div className={lq.vacio}>No hay facturas para los filtros actuales.</div>
        ) : (
          <Tabla>
            <thead>
              <tr>
                <th>Nº Exp.</th>
                <th>Obra social</th>
                <th>Período</th>
                <th>Estado</th>
                <th>Factura</th>
                <th>Total</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id_prestaciones}>
                  <td className={lq.mono}>{row.id_prestaciones}</td>
                  <td>
                    <span className={styles.os}>{row.cod_obr || "—"}</span>
                    {row.nombre_obra_social && <span className={vp.osNombre}>{row.nombre_obra_social}</span>}
                  </td>
                  <td>
                    {row.periodo_label || row.periodo}
                    {row.periodo_label && <span className={styles.codigo}>{row.periodo}</span>}
                  </td>
                  <td><span className={`${lq.estado} ${estadoClase(row.estado)}`}>{estadoLabel(row.estado)}</span></td>
                  <td>
                    {row.nro_factura ? (
                      <span className={styles.factura}>
                        <span className={lq.mono}>{row.nro_factura}</span>
                        {row.tipo_factura && <span className={styles.version}>{row.tipo_factura}</span>}
                      </span>
                    ) : (
                      <span className={lq.tenue}>Sin factura</span>
                    )}
                  </td>
                  <td className={lq.monto}>{formatMoney(row.importe)}</td>
                  <td>
                    <div className={lq.accionesFila}>
                      <BotonVer onClick={() => handleVer(row)} />
                      {row.estado && ESTADOS_CERRADOS.has(row.estado) && row.documento_url && (
                        <BotonAccion icono={FileText} etiqueta="Ver factura" onClick={() => handleVerFactura(row)} />
                      )}
                      <BotonPlano
                        type="button"
                        className={`${vp.publicar} ${row.publicado ? vp.publicado : ""}`}
                        onClick={() => setAPublicar(row)}
                      >
                        {row.publicado ? <Eye size={15} /> : <EyeOff size={15} />}
                        {row.publicado ? "Publicado" : "No publicado"}
                      </BotonPlano>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </Tabla>
        )}
      </div>

      <div className={styles.pie}>
        <select
          className={lq.select}
          value={limit}
          onChange={(e) => setFiltros((f) => ({ ...f, limit: Number(e.target.value), offset: 0 }))}
          disabled={loading}
          aria-label="Filas por página"
        >
          {PAGE_SIZES.map((s) => (
            <option key={s} value={s}>{s} por página</option>
          ))}
        </select>
        <Paginador
          pagina={page}
          totalPaginas={totalPages}
          hayMas={!((totalCount !== undefined && offset + limit >= totalCount) || rows.length < limit)}
          onCambiar={(p) => setFiltros((f) => ({ ...f, offset: (p - 1) * limit }))}
          ocupado={loading}
          resumen={
            totalCount !== undefined
              ? `${totalCount} factura${totalCount !== 1 ? "s" : ""}`
              : undefined
          }
        />
      </div>

      <ConfirmActionModal
        isOpen={Boolean(aPublicar)}
        icon={aPublicar?.publicado ? EyeOff : Eye}
        variant="primary"
        title={aPublicar?.publicado ? "Despublicar período" : "Publicar período"}
        message={
          aPublicar && (
            <>
              El período <strong>{aPublicar.periodo_label || aPublicar.periodo}</strong> de{" "}
              <strong>{aPublicar.cod_obr}</strong>{" "}
              {aPublicar.publicado
                ? "dejará de verse en el panel del médico."
                : "pasará a verse en el panel del médico."}
            </>
          )
        }
        confirmLabel={aPublicar?.publicado ? "Despublicar" : "Publicar"}
        onClose={() => {
          if (!publicando) setAPublicar(null);
        }}
        onConfirm={handleConfirmarPublicar}
        loading={publicando}
      />
    </div>
  );
};

export default VerPeriodos;
