import React, { useEffect, useRef, useState } from "react";
import { History, ListOrdered, LockKeyhole } from "lucide-react";

import { useAppSnackbar } from "@/app/hooks/useAppSnackbar";
import { listarCargaPorUsuario, listarCierresPorUsuario } from "../api";
import type { ObraSocialOption, CargaPorUsuario, CierresPorUsuario } from "../types";
import { detailMessage } from "../types";
import { formatMoney } from "../money";
import ObraSocialAutocomplete from "../components/ObraSocialAutocomplete";
import base from "../ListaFacturas.module.scss";
import styles from "./RegistroFacturacion.module.scss";
import lq from "@/app/pages/Pagos/Liquidacion.module.scss";
import Franja, { Solapa } from "@/app/components/layout/Franja/Franja";
import { Filtros } from "@/app/components/ui/Caja/Caja";
import { filtroAncho } from "@/app/components/ui/Caja/filtroAncho";
import Cargando from "@/app/components/ui/Cargando/Cargando";
import CampoFecha from "@/app/components/ui/CampoFecha/CampoFecha";
import Tabla from "@/app/components/ui/Tabla/Tabla";
import { comoErrorApi } from "@/app/shared/lib/httpErrors";
import BotonPlano from "@/app/components/ui/BotonPlano/BotonPlano";

const periodoActual = (): string => {
  const d = new Date();
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}`;
};

const RegistroFacturacion: React.FC = () => {
  const notify = useAppSnackbar();
  const [vista, setVista] = useState<"carga" | "cierres">("carga");

  // ── Filtros globales: alimentan las dos secciones (carga/cierres por usuario) ──
  const [obraSocial, setObraSocial] = useState<ObraSocialOption | null>(null);
  const [periodo, setPeriodo] = useState<string>(periodoActual());
  const [desde, setDesde] = useState<string>("");
  const [hasta, setHasta] = useState<string>("");

  const codObra = obraSocial?.nro_obra_social ? String(obraSocial.nro_obra_social) : undefined;

  const handleLimpiarGlobal = () => {
    setObraSocial(null);
    setPeriodo(periodoActual());
    setDesde("");
    setHasta("");
  };

  // ── Rankings por usuario (endpoints agregados) ──────────────────────────────
  const [cargaRows, setCargaRows] = useState<CargaPorUsuario[]>([]);
  const [cargaLoading, setCargaLoading] = useState(false);
  const [cierresUsuarioRows, setCierresUsuarioRows] = useState<CierresPorUsuario[]>([]);
  const [cierresUsuarioLoading, setCierresUsuarioLoading] = useState(false);

  const rangosDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (rangosDebounce.current) clearTimeout(rangosDebounce.current);
    rangosDebounce.current = setTimeout(async () => {
      const tieneFiltro = !!periodo || (!!desde && !!hasta);
      if (!tieneFiltro) {
        setCargaRows([]);
        setCierresUsuarioRows([]);
        return;
      }

      const params = { cod_obra: codObra, periodo: periodo || undefined, desde: desde || undefined, hasta: hasta || undefined };

      setCargaLoading(true);
      try {
        const carga = await listarCargaPorUsuario(params);
        setCargaRows(carga);
      } catch (e) {
        const err = comoErrorApi(e);
        notify(detailMessage(err?.response?.data?.detail) || "Error al cargar el ranking de carga por usuario.", "error");
      } finally {
        setCargaLoading(false);
      }

      setCierresUsuarioLoading(true);
      try {
        const cierres = await listarCierresPorUsuario(params);
        setCierresUsuarioRows(cierres);
      } catch (e) {
        const err = comoErrorApi(e);
        notify(detailMessage(err?.response?.data?.detail) || "Error al cargar el ranking de cierres por operador.", "error");
      } finally {
        setCierresUsuarioLoading(false);
      }
    }, 300);
    return () => { if (rangosDebounce.current) clearTimeout(rangosDebounce.current); };
  }, [codObra, periodo, desde, hasta, notify]);

  const hayRango = !!periodo || (!!desde && !!hasta);
  const cargando = vista === "carga" ? cargaLoading : cierresUsuarioLoading;
  const filas = vista === "carga" ? cargaRows : cierresUsuarioRows;
  const hayFiltros = !!obraSocial || !!desde || !!hasta || periodo !== periodoActual();

  return (
    <div className={base.container}>
      <Franja titulo="Registro de facturación" icono={History}>
        <Solapa activa={vista === "carga"} onClick={() => setVista("carga")}>
          <ListOrdered size={18} /> Carga por usuario
        </Solapa>
        <Solapa activa={vista === "cierres"} onClick={() => setVista("cierres")}>
          <LockKeyhole size={18} /> Cierres por operador
        </Solapa>
      </Franja>

      <Filtros className={base.filtros}>
        <div className={`${lq.campo} ${filtroAncho}`}>
          <span className={lq.rotulo}>Obra social</span>
          <ObraSocialAutocomplete
            value={obraSocial?.nro_obra_social ?? null}
            onChange={(_, os) => setObraSocial(os)}
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
            value={periodo}
            onChange={(e) => setPeriodo(e.target.value)}
          />
        </div>
        <div className={lq.campo}>
          <span className={lq.rotulo}>Desde</span>
          <CampoFecha value={desde} onChange={(valor) => setDesde(valor)} />
        </div>
        <div className={lq.campo}>
          <span className={lq.rotulo}>Hasta</span>
          <CampoFecha value={hasta} onChange={(valor) => setHasta(valor)} />
        </div>
        {hayFiltros && (
          <BotonPlano type="button" className={base.limpiar} onClick={handleLimpiarGlobal}>
            Limpiar
          </BotonPlano>
        )}
      </Filtros>

      <div className={base.tablaCaja}>
        {cargando ? (
          <div className={lq.cargando}><Cargando size={22} tono="marca" aria-label="Cargando" /></div>
        ) : !hayRango ? (
          <div className={lq.vacio}>Elegí un período o un rango de fechas para ver el ranking.</div>
        ) : filas.length === 0 ? (
          <div className={lq.vacio}>{vista === "carga" ? "Sin cargas administrativas en este rango." : "Sin cierres en este rango."}</div>
        ) : (
          <Tabla>
            <thead>
              <tr>
                <th>#</th>
                <th>Usuario</th>
                <th>{vista === "carga" ? "Prestaciones cargadas" : "Facturas cerradas"}</th>
                <th>Importe total</th>
              </tr>
            </thead>
            <tbody>
              {filas.map((row, i) => (
                <tr key={row.usuario}>
                  <td className={styles.puesto}>{i + 1}</td>
                  <td>
                    {row.nombre && <span className={styles.nombre}>{row.nombre}</span>}
                    <span className={row.nombre ? styles.codigo : undefined}>{row.usuario}</span>
                  </td>
                  <td>{"cantidad_prestaciones" in row ? row.cantidad_prestaciones : row.cantidad_facturas}</td>
                  <td className={lq.monto}>{formatMoney(row.importe_total)}</td>
                </tr>
              ))}
            </tbody>
          </Tabla>
        )}
      </div>
    </div>
  );
};

export default RegistroFacturacion;
