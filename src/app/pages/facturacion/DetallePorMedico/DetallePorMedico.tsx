import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, Search, UserSearch } from "lucide-react";

import { useAppSnackbar } from "@/app/hooks/useAppSnackbar";
import { listarPrestaciones, fetchMedicos, fetchMedicosTodos, descargarExportPorMedico } from "../api";
import { detailMessage } from "../types";
import type { MedicoOption, PrestacionRead, Tipo } from "../types";
import { formatMoney, parseMoney } from "../money";
import { saveAs } from "@/app/shared/lib/fileSaver";
import TablaPorObraSocial from "../components/TablaPorObraSocial";
import MedicoAutocomplete from "../components/MedicoAutocomplete";
import { dedupePorId } from "../components/localSearch";
import base from "../ListaFacturas.module.scss";
import styles from "./DetallePorMedico.module.scss";
import lq from "@/app/pages/Pagos/Liquidacion.module.scss";
import Franja from "@/app/components/layout/Franja/Franja";
import { Filtros } from "@/app/components/ui/Caja/Caja";
import { filtroAncho } from "@/app/components/ui/Caja/filtroAncho";
import Button from "@/app/components/ui/Button/Button";
import Cifras from "@/app/components/ui/Cifras/Cifras";
import Cargando from "@/app/components/ui/Cargando/Cargando";
import BotonDescarga from "@/app/components/ui/BotonDescarga/BotonDescarga";
import BotonPlano from "@/app/components/ui/BotonPlano/BotonPlano";
import { comoErrorApi } from "@/app/shared/lib/httpErrors";

// Tope del backend por request (GET /prestaciones: limit <= 200) y freno de seguridad para no traer indefinidamente si un médico tuviera muchísimas filas.
const PAGE_LIMIT = 200;
const MAX_FILAS = 5000;

const TIPOS_ORDEN: Tipo[] = ["Consulta", "Practica", "Honorarios individuales", "Sanatorio"];
const TIPO_LABEL_CORTO: Record<Tipo, string> = {
  Consulta: "Consultas",
  Practica: "Prácticas",
  "Honorarios individuales": "Honorarios",
  Sanatorio: "Sanatorios",
};

interface Busqueda { socio: string; periodo: string; }

const DetallePorMedico: React.FC = () => {
  const navigate = useNavigate();
  const notify = useAppSnackbar();

  // Buscador de socio: por Nº de socio o por nombre (mismo `/medicos` que usa el resto de facturación) .
  const [medicosPrecargados, setMedicosPrecargados] = useState<MedicoOption[] | null>(null);
  const [errorPrecarga, setErrorPrecarga] = useState(false);
  const [reintentoPrecarga, setReintentoPrecarga] = useState(0);

  useEffect(() => {
    let active = true;
    setErrorPrecarga(false);
    (async () => {
      try {
        const medicos = await fetchMedicosTodos();
        if (active) setMedicosPrecargados(dedupePorId(medicos, (m) => m.cod));
      } catch {
        if (active) setErrorPrecarga(true);
      }
    })();
    return () => { active = false; };
  }, [reintentoPrecarga]);

  const [medicoElegido, setMedicoElegido] = useState<MedicoOption | null>(null);
  const [periodoInput, setPeriodoInput] = useState("");

  const [rows, setRows] = useState<PrestacionRead[] | null>(null);
  const [medico, setMedico] = useState<MedicoOption | null>(null);
  const [busqueda, setBusqueda] = useState<Busqueda | null>(null);
  const [truncado, setTruncado] = useState(false);
  const [loading, setLoading] = useState(false);
  const [exportando, setExportando] = useState<"pdf" | "xlsx" | null>(null);

  const buscar = async () => {
    const socio = medicoElegido?.cod?.trim() ?? "";
    const periodo = periodoInput.trim();
    if (!socio || !periodo) {
      notify("Elegí un socio y completá el período.", "error");
      return;
    }
    if (!/^\d{6}$/.test(periodo)) {
      notify("El período va en formato AAAAMM (ej. 202607).", "error");
      return;
    }

    setLoading(true);
    setMedico(null);
    try {
      // Se trae todo el detalle del médico en el período (paginando en lotes de 200) para poder mostrar los totales exactos.
      let acumulado: PrestacionRead[] = [];
      let offset = 0;
      let total = Infinity;
      let corte = false;
      while (acumulado.length < total && acumulado.length < MAX_FILAS) {
        const { data, totalCount } = await listarPrestaciones({
          cod_medico: socio, periodo, limit: PAGE_LIMIT, offset,
        });
        acumulado = acumulado.concat(data);
        total = totalCount ?? acumulado.length;
        if (data.length < PAGE_LIMIT) break;
        offset += PAGE_LIMIT;
      }
      if (acumulado.length >= MAX_FILAS && acumulado.length < total) corte = true;

      acumulado.sort((a, b) => {
        const fa = a.fecha_practica ?? "";
        const fb = b.fecha_practica ?? "";
        if (fa !== fb) return fa < fb ? -1 : 1;
        return (a.id ?? 0) - (b.id ?? 0);
      });

      setRows(acumulado);
      setTruncado(corte);
      setBusqueda({ socio, periodo });

      // Nombre/matrícula del médico: se resuelve por el socio que EFECTIVAMENTE trajo la consulta.
      const socioReal = acumulado[0]?.cod_medico ?? socio;
      try {
        const meds = await fetchMedicos(socioReal, 10);
        setMedico(meds.find((m) => String(m.cod) === String(socioReal)) ?? null);
      } catch {
        // El detalle ya se muestra igual; el nombre es un extra.
      }
    } catch (e) {
      const err = comoErrorApi(e);
      notify(detailMessage(err?.response?.data?.detail) || "Error al cargar el detalle.", "error");
    } finally {
      setLoading(false);
    }
  };

  const limpiar = () => {
    setMedicoElegido(null);
    setPeriodoInput("");
    setRows(null);
    setMedico(null);
    setBusqueda(null);
    setTruncado(false);
  };

  const exportar = async (formato: "pdf" | "xlsx") => {
    if (!busqueda) return;
    setExportando(formato);
    try {
      const { blob, filename } = await descargarExportPorMedico(busqueda.socio, busqueda.periodo, formato);
      await saveAs(blob, filename ?? `detalle_medico_${busqueda.socio}_${busqueda.periodo}.${formato}`);
    } catch (e) {
      const err = comoErrorApi(e);
      notify(detailMessage(err?.response?.data?.detail) || "No se pudo generar el archivo.", "error");
    } finally {
      setExportando(null);
    }
  };

  const verFicha = (id: number) => navigate(`/panel/facturacion/consulta/${id}`);

  // Totales y conteos por tipo — las anuladas (estado "X") no suman.
  const resumen = useMemo(() => {
    const base = {
      vigentes: 0, anuladas: 0,
      honorarios: 0, gastos: 0, coseguro: 0, subtotal: 0,
      porTipo: {} as Record<string, number>,
    };
    if (!rows) return base;
    for (const p of rows) {
      if (p.estado === "X") { base.anuladas += 1; continue; }
      base.vigentes += 1;
      base.honorarios += parseMoney(p.honorarios);
      base.gastos += parseMoney(p.gastos);
      base.coseguro += parseMoney(p.coseguro);
      base.subtotal += parseMoney(p.importe_total);
      if (p.tipo) base.porTipo[p.tipo] = (base.porTipo[p.tipo] ?? 0) + 1;
    }
    return base;
  }, [rows]);

  const hayResultados = !!busqueda && !!rows;
  const tiposPresentes = TIPOS_ORDEN.filter((t) => resumen.porTipo[t]);

  if (!medicosPrecargados) {
    return (
      <div className={base.container}>
        <Franja titulo="Detalle por médico" icono={UserSearch} />
        <div className={styles.vacio}>
          {errorPrecarga ? (
            <>
              <p><AlertTriangle size={16} aria-hidden="true" /> No se pudieron cargar los médicos.</p>
              <Button variant="ghost" onClick={() => setReintentoPrecarga((k) => k + 1)}>Reintentar</Button>
            </>
          ) : (
            <Cargando size={22} tono="marca" aria-label="Cargando" />
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={base.container}>
      <Franja titulo="Detalle por médico" icono={UserSearch} />

      <Filtros
        className={base.filtros}
        onSubmit={(e) => {
          e.preventDefault();
          void buscar();
        }}
      >
        <div className={`${lq.campo} ${filtroAncho}`}>
          <span className={lq.rotulo}>Socio</span>
          <MedicoAutocomplete
            value={medicoElegido?.cod ?? null}
            onChange={(_cod, m) => setMedicoElegido(m)}
            blurOnSelect={false}
            medicosPrecargados={medicosPrecargados}
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
            value={periodoInput}
            onChange={(e) => setPeriodoInput(e.target.value)}
          />
        </div>
        <Button type="submit" variant="secondary" leftIcon={<Search size={17} aria-hidden="true" />} isLoading={loading}>
          Ver detalle
        </Button>
        {(medicoElegido || periodoInput || busqueda) && (
          <BotonPlano type="button" className={base.limpiar} onClick={limpiar} disabled={loading}>
            Limpiar
          </BotonPlano>
        )}
      </Filtros>

      {hayResultados && rows!.length > 0 && (
        <section className={styles.resumen}>
          <div className={styles.cabecera}>
            <div className={styles.medico}>
              <h2 className={styles.nombre}>{medico?.nombre ?? `Socio ${busqueda!.socio}`}</h2>
              <p className={styles.sub}>
                Socio {medico?.cod ?? busqueda!.socio}
                {medico?.matricula != null && ` · Matrícula ${medico.matricula}`}
                {` · Período ${busqueda!.periodo}`}
              </p>
            </div>
            <div className={styles.descargas}>
              <BotonDescarga formato="excel" onClick={() => exportar("xlsx")} disabled={exportando !== null} cargando={exportando === "xlsx"} />
              <BotonDescarga formato="pdf" onClick={() => exportar("pdf")} disabled={exportando !== null} cargando={exportando === "pdf"} />
            </div>
          </div>

          <Cifras
            items={[
              { valor: resumen.vigentes, rotulo: resumen.vigentes !== 1 ? "prestaciones" : "prestación" },
              { valor: formatMoney(resumen.honorarios), rotulo: "honorarios" },
              { valor: formatMoney(resumen.gastos), rotulo: "gastos" },
              ...(resumen.coseguro > 0 ? [{ valor: formatMoney(resumen.coseguro), rotulo: "coseguro" }] : []),
              { valor: formatMoney(resumen.subtotal), rotulo: "total" },
              ...(resumen.anuladas > 0
                ? [{ valor: resumen.anuladas, rotulo: resumen.anuladas !== 1 ? "anuladas" : "anulada", tono: "apagada" as const }]
                : []),
            ]}
          />

          {tiposPresentes.length > 0 && (
            <p className={styles.tipos}>
              {tiposPresentes.map((t) => `${TIPO_LABEL_CORTO[t]}: ${resumen.porTipo[t]}`).join(" · ")}
            </p>
          )}
        </section>
      )}

      {truncado && (
        <p className={styles.aviso} role="alert">
          <AlertTriangle size={16} aria-hidden="true" /> Se muestran las primeras {MAX_FILAS} filas: afiná por período.
        </p>
      )}

      {!busqueda && !loading && (
        <div className={styles.vacio}>
          <UserSearch size={28} aria-hidden="true" />
          <p>Elegí un socio y un período para ver todas sus prestaciones.</p>
        </div>
      )}

      {loading && (
        <div className={styles.vacio}>
          <Cargando size={22} tono="marca" aria-label="Cargando el detalle" />
        </div>
      )}

      {hayResultados && rows!.length === 0 && !loading && (
        <div className={styles.vacio}>
          <AlertTriangle size={28} aria-hidden="true" />
          <p>No hay prestaciones del socio {busqueda!.socio} en el período {busqueda!.periodo}.</p>
        </div>
      )}

      {hayResultados && rows!.length > 0 && !loading && (
        <TablaPorObraSocial
          prestaciones={rows!}
          cargando={false}
          onRowClick={(p) => verFicha(p.id)}
          mostrarCodigoOS
        />
      )}
    </div>
  );
};

export default DetallePorMedico;
