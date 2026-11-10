import React, { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle2, FileCheck2, FilePlus2, Layers, ListFilter, LockKeyhole, Plus } from "lucide-react";

import { useAppSnackbar } from "@/app/hooks/useAppSnackbar";
import { listarFacturas } from "../api";
import type { FacturaRead, ListarFacturasParams, ObraSocialOption } from "../types";
import { detailMessage, versionLabel } from "../types";
import { formatMoney } from "../money";
import ObraSocialAutocomplete from "../components/ObraSocialAutocomplete";
import NuevaComplementariaModal from "./NuevaComplementariaModal";
import styles from "../ListaFacturas.module.scss";
import lq from "@/app/pages/Pagos/Liquidacion.module.scss";
import Franja, { Solapa } from "@/app/components/layout/Franja/Franja";
import { Filtros } from "@/app/components/ui/Caja/Caja";
import { filtroAncho } from "@/app/components/ui/Caja/filtroAncho";
import Button from "@/app/components/ui/Button/Button";
import SearchField from "@/app/components/ui/SearchField/SearchField";
import Tabla from "@/app/components/ui/Tabla/Tabla";
import BotonVer from "@/app/components/ui/BotonVer/BotonVer";
import BotonAccion from "@/app/components/ui/BotonAccion/BotonAccion";
import Cargando from "@/app/components/ui/Cargando/Cargando";
import Paginador from "@/app/components/ui/Paginador/Paginador";
import BotonPlano from "@/app/components/ui/BotonPlano/BotonPlano";
import { estadoLabel, fmtFecha } from "@/app/pages/facturacion/utiles";
import { comoErrorApi } from "@/app/shared/lib/httpErrors";

const PAGE_SIZES = [25, 50, 100, 200];
const DEFAULT_LIMIT = 50;

const SOLAPAS: Array<{ value: string; titulo: string; icono: typeof Layers }> = [
  { value: "", titulo: "Todas", icono: ListFilter },
  { value: "A", titulo: "Abiertas", icono: CheckCircle2 },
  { value: "C", titulo: "Cerradas", icono: LockKeyhole },
];

const estadoClase = (estado: string | null): string => (estado === "A" ? lq.abierto : lq.cerrado);

const Complementarias: React.FC = () => {
  const navigate = useNavigate();
  const notify = useAppSnackbar();

  const [filtros, setFiltros] = useState<ListarFacturasParams>({
    limit: DEFAULT_LIMIT,
    offset: 0,
    solo_complementos: true,
  });
  const [obraSocial, setObraSocial] = useState<ObraSocialOption | null>(null);
  const [rows, setRows] = useState<FacturaRead[]>([]);
  const [totalCount, setTotalCount] = useState<number | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchData = useCallback(async (f: ListarFacturasParams) => {
    setLoading(true);
    try {
      const { data, totalCount: tc } = await listarFacturas(f);
      setRows(data);
      setTotalCount(tc);
    } catch (e) {
      const err = comoErrorApi(e);
      notify(detailMessage(err?.response?.data?.detail) || "Error al cargar las facturas complementarias.", "error");
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
      solo_complementos: true,
      estado: filtros.estado,
    });
  };

  const handleCreated = (factura: FacturaRead) => {
    setModalOpen(false);
    notify(`Complemento abierto — ${versionLabel(factura.version)} de ${factura.periodo_label || factura.periodo}`);
    navigate(`/panel/facturacion/complementarias/${factura.id_prestaciones}/cargar`);
  };

  const hayFiltros = Boolean(obraSocial || filtros.periodo || filtros.usuario || filtros.q);

  const limit = filtros.limit ?? DEFAULT_LIMIT;
  const offset = filtros.offset ?? 0;
  const page = Math.floor(offset / limit) + 1;
  const totalPages = totalCount !== undefined ? Math.max(1, Math.ceil(totalCount / limit)) : undefined;

  return (
    <div className={styles.container}>
      <Franja titulo="Complementarias" icono={Layers}>
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
        <Button
          variant="secondary"
          leftIcon={<Plus size={17} aria-hidden="true" />}
          onClick={() => setModalOpen(true)}
        >
          Nueva complementaria
        </Button>
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
          <div className={lq.vacio}>No hay complementarias para los filtros actuales.</div>
        ) : (
          <Tabla>
            <thead>
              <tr>
                <th>Obra social</th>
                <th>Período</th>
                <th>Versión</th>
                <th>Operador</th>
                <th>Estado</th>
                <th>Cierre</th>
                <th>Factura</th>
                <th>Nº Exp.</th>
                <th>Total</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id_prestaciones}>
                  <td className={styles.os}>{row.cod_obr || "—"}</td>
                  <td>
                    {row.periodo_label || row.periodo}
                    {row.periodo_label && <span className={styles.codigo}>{row.periodo}</span>}
                  </td>
                  <td><span className={styles.version}>{versionLabel(row.version)}</span></td>
                  <td>{row.usuario || <span className={lq.tenue}>—</span>}</td>
                  <td><span className={`${lq.estado} ${estadoClase(row.estado)}`}>{estadoLabel(row.estado)}</span></td>
                  <td>{fmtFecha(row.fecha)}</td>
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
                  <td className={lq.mono}>{row.id_prestaciones}</td>
                  <td className={lq.monto}>{formatMoney(row.importe)}</td>
                  <td>
                    <div className={lq.accionesFila}>
                      {row.estado === "A" && (
                        <>
                          <BotonAccion
                            icono={FilePlus2}
                            etiqueta="Cargar prestaciones"
                            onClick={() => navigate(`/panel/facturacion/complementarias/${row.id_prestaciones}/cargar`)}
                          />
                          <BotonAccion
                            icono={FileCheck2}
                            etiqueta="Cerrar período"
                            onClick={() => navigate("/panel/facturacion/cierre")}
                          />
                        </>
                      )}
                      <BotonVer onClick={() => navigate(`/panel/facturacion/periodos/${row.id_prestaciones}`)} />
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
              ? `${totalCount} complementaria${totalCount !== 1 ? "s" : ""}`
              : undefined
          }
        />
      </div>

      <NuevaComplementariaModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreated={handleCreated}
      />
    </div>
  );
};

export default Complementarias;
