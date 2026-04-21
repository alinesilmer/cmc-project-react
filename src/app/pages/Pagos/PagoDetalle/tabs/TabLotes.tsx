import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getJSON, postJSON } from "../../../../lib/http";
import { useAppSnackbar } from "../../../../hooks/useAppSnackbar";
import Button from "../../../../components/atoms/Button/Button";
import SelectableTable from "../../../../components/molecules/SelectableTable/SelectableTable";
import type { ColumnDef } from "../../../../components/molecules/SelectableTable/types";
import styles from "./tabs.module.scss";
import { type Pago, type Liquidacion, type LoteAjuste, fmt, mesLabel } from "../../types";

const LIQUIDACIONES_URL = (pagoId: number) => `/api/liquidacion/liquidaciones_por_os/?pago_id=${pagoId}`;
const LOTES_POR_OS_URL = (osId: number, mes: number, anio: number) =>
  `/api/lotes/snaps/por_os_periodo?obra_social_id=${osId}&mes_periodo=${mes}&anio_periodo=${anio}`;
const OBTENER_O_CREAR_URL = "/api/lotes/snaps/obtener_o_crear";

type Props = { pago: Pago; pagoId: number };

const loteEstadoClass = (e: string) => {
  if (e === "A") return styles.loteA;
  if (e === "C") return styles.loteC;
  if (e === "L") return styles.loteL;
  if (e === "AP") return styles.loteAP;
  return "";
};
const loteEstadoLabel = (e: string) => {
  if (e === "A") return "Abierto";
  if (e === "C") return "Cerrado";
  if (e === "L") return "En liquidaciones";
  if (e === "AP") return "Aplicado";
  return e;
};

// Row type for SelectableTable — augments Liquidacion with resolved lote data
type LoteRow = Liquidacion & {
  _lote: LoteAjuste | null;
  _key: string;
};

const TabLotes: React.FC<Props> = ({ pago, pagoId }) => {
  const navigate = useNavigate();
  const notify = useAppSnackbar();

  const [rows, setRows] = useState<LoteRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);

  const makeKey = (osId: number, mes: number, anio: number) => `${osId}-${mes}-${anio}`;

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const liqs = await getJSON<Liquidacion[]>(LIQUIDACIONES_URL(pagoId));
      if (!Array.isArray(liqs) || liqs.length === 0) {
        setRows([]);
        setLoading(false);
        return;
      }

      // Deduplicate by OS+period
      const seen = new Set<string>();
      const pairs: { osId: number; mes: number; anio: number; key: string; liq: Liquidacion }[] = [];
      for (const l of liqs) {
        const k = makeKey(l.obra_social_id, l.mes_periodo, l.anio_periodo);
        if (!seen.has(k)) {
          seen.add(k);
          pairs.push({ osId: l.obra_social_id, mes: l.mes_periodo, anio: l.anio_periodo, key: k, liq: l });
        }
      }

      const results = await Promise.allSettled(
        pairs.map((p) => getJSON<LoteAjuste[]>(LOTES_POR_OS_URL(p.osId, p.mes, p.anio)))
      );

      const built: LoteRow[] = pairs.map((p, i) => {
        const r = results[i];
        const lote = r.status === "fulfilled"
          ? (r.value.find((l) => l.tipo === "normal") ?? null)
          : null;
        return { ...p.liq, _lote: lote, _key: p.key };
      });
      setRows(built);
    } catch (e: any) {
      setError(e?.message || "No se pudieron cargar los lotes.");
    } finally {
      setLoading(false);
    }
  }, [pagoId]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleVerOCrear = async (row: LoteRow) => {
    if (row._lote) {
      navigate(`/panel/liquidation/${pagoId}/lotes/${row._lote.id}`);
      return;
    }
    setBusyKey(row._key);
    try {
      const created = await postJSON<LoteAjuste>(OBTENER_O_CREAR_URL, {
        obra_social_id: row.obra_social_id,
        mes_periodo: row.mes_periodo,
        anio_periodo: row.anio_periodo,
      });
      setRows((prev) => prev.map((r) => r._key === row._key ? { ...r, _lote: created } : r));
      navigate(`/panel/liquidation/${pagoId}/lotes/${created.id}`);
    } catch (e: any) {
      notify(e?.message || "No se pudo obtener/crear el lote.", "error");
    } finally {
      setBusyKey(null);
    }
  };

  const columns: ColumnDef<LoteRow>[] = [
    { key: "obra_social_id", header: "Obra Social" },
    {
      key: "periodo",
      header: "Período",
      render: (r) => `${mesLabel(r.mes_periodo)} ${r.anio_periodo}`,
    },
    {
      key: "estado_lote",
      header: "Estado Lote",
      render: (r) => r._lote ? (
        <span className={`${styles.badge} ${loteEstadoClass(r._lote.estado)}`}>
          {loteEstadoLabel(r._lote.estado)}
        </span>
      ) : (
        <span style={{ fontSize: 12, color: "#94a3b8" }}>Sin lote</span>
      ),
    },
    {
      key: "total_debitos",
      header: "Total Débitos",
      alignRight: true,
      render: (r) => r._lote
        ? <span className={styles.negative}>-${fmt(r._lote.total_debitos)}</span>
        : "—",
    },
    {
      key: "total_creditos",
      header: "Total Créditos",
      alignRight: true,
      render: (r) => r._lote
        ? <span className={styles.positive}>+${fmt(r._lote.total_creditos)}</span>
        : "—",
    },
    {
      key: "pago_asignado",
      header: "Pago asignado",
      render: (r) => r._lote?.pago_id ?? "—",
    },
    {
      key: "ajustes",
      header: "Ajustes",
      render: (r) => r._lote ? r._lote.ajustes.length : "—",
    },
    {
      key: "acciones",
      header: "Acciones",
      render: (r) => {
        const isBusy = busyKey === r._key;
        return (
          <Button
            size="sm"
            variant="primary"
            onClick={(e) => { e.stopPropagation(); handleVerOCrear(r); }}
            disabled={isBusy}
          >
            {isBusy ? "…" : r._lote ? "Ver lote" : "Crear lote"}
          </Button>
        );
      },
    },
  ];

  return (
    <div className={styles.tabWrap}>
      {error && <div className={styles.errorBanner}>{error}</div>}

      <SelectableTable
        rows={rows}
        columns={columns}
        actions={[]}
        emptyMessage="No hay facturas en este pago. Agregá facturas en el tab "Facturas" primero."
        loading={loading}
      />
    </div>
  );
};

export default TabLotes;
