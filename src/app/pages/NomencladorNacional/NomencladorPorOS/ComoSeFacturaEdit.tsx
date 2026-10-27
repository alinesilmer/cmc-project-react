import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import styles from "./NomencladorPorOS.module.scss";
import { getComponentesNomenclador, getNomencladoresDeCodigo } from "../nomenclador.api";
import type { GalenoOut, ComponentesNNSugeridos, NomencladorDeCodigoOut } from "../nomenclador.types";
import type { ModalidadValor, ComoFactura, ComponenteForm, PrecioForm } from "./porOS.types";
import { FIXED_CONCEPTOS } from "./porOS.helpers";
import { ComoSeFactura } from "./ComoSeFactura";

// ─── ComoSeFacturaEdit: lo mismo, al editar un valor que ya existe ──────────────

export type CambioComoFactura = {
  comoFactura: ComoFactura;
  nomencladorId: number | null;
  modalidad: ModalidadValor;
  componentes: ComponenteForm[];
};

/** "Cómo se factura" de un valor NE que se está editando. Muestra lo que el valor tiene hoy y
 * sólo consulta al servidor cuando se elige otro nomenclador (los componentes salen de ahí). */
export function ComoSeFacturaEdit({
  idBase,
  osNro,
  nomencladorId,
  precio,
  galenos,
  onChange,
}: {
  idBase: string;
  osNro: number;
  /** Código del Colegio que se está editando (`nm_nomenclador.id`). */
  nomencladorId: number;
  precio: Pick<PrecioForm, "comoFactura" | "nomencladorId" | "componentes">;
  galenos: GalenoOut[];
  onChange: (cambio: CambioComoFactura) => void;
}) {
  const queryClient = useQueryClient();
  const opcionesQuery = useQuery({
    queryKey: ["nomencladores-de-codigo", nomencladorId],
    queryFn: () => getNomencladoresDeCodigo(nomencladorId),
    staleTime: 5 * 60 * 1000,
  });
  const [calculando, setCalculando] = useState(false);
  const [aviso, setAviso] = useState<string | undefined>();
  const galenoPorId = useMemo(() => new Map(galenos.map((g) => [g.id, g])), [galenos]);

  const comoFactura = precio.comoFactura ?? "manual";
  // El Nacional sólo se ofrece si el valor ya se factura así.
  const opciones = (opcionesQuery.data ?? []).filter(
    (n) => n.tipo === "nivelado" || n.id === precio.nomencladorId,
  );
  const elegido = opciones.find((n) => n.id === precio.nomencladorId);

  // Lo que el valor tiene cargado, para mostrarlo de sólo lectura.
  const calculo = useMemo<ComponentesNNSugeridos>(() => {
    const filas = precio.componentes.filter((c) => c.galeno_id != null && Number(c.cantidad) > 0);
    const hon = filas.find((c) => c.concepto === "Honorarios");
    return {
      disponible: true,
      motivo: null,
      nivel: hon?.galeno_id != null ? (galenoPorId.get(hon.galeno_id)?.nivel ?? null) : null,
      componentes: filas.map((c, i) => ({
        concepto: c.concepto,
        galeno_id: c.galeno_id as number,
        galeno_nombre: galenoPorId.get(c.galeno_id as number)?.nombre ?? "",
        cantidad: String(c.cantidad),
        orden: i,
      })),
    };
  }, [precio.componentes, galenoPorId]);

  async function usarNomenclador(n: NomencladorDeCodigoOut) {
    setCalculando(true);
    setAviso(undefined);
    try {
      const r = await queryClient.fetchQuery({
        queryKey: ["componentes-nomenclador", osNro, nomencladorId, n.slug],
        queryFn: () => getComponentesNomenclador(osNro, nomencladorId, n.slug),
        staleTime: 0,
      });
      if (!r.disponible) {
        setAviso(r.motivo ?? "No se puede calcular el valor con este nomenclador.");
        return;
      }
      onChange({
        comoFactura: "nomenclador",
        nomencladorId: n.id,
        modalidad: "calculable",
        componentes: FIXED_CONCEPTOS.map((concepto) => {
          const s = r.componentes.find((c) => c.concepto === concepto);
          return {
            concepto,
            galeno_id: s?.galeno_id ?? null,
            cantidad: s ? String(Number(s.cantidad)) : "",
            valor_unitario: "",
            opcional: concepto !== "Honorarios",
          };
        }),
      });
    } catch {
      setAviso("No se pudieron calcular los componentes.");
    } finally {
      setCalculando(false);
    }
  }

  function cambiar(c: ComoFactura) {
    setAviso(undefined);
    if (c === "nomenclador") {
      const n = elegido ?? opciones[0];
      if (n) void usarNomenclador(n);
      return;
    }
    onChange({
      comoFactura: c,
      nomencladorId: null,
      modalidad: c === "fijo" ? "fijo" : "calculable",
      componentes: precio.componentes.map((x) => ({
        ...x,
        galeno_id: c === "fijo" ? null : x.galeno_id,
        cantidad: c === "fijo" ? "" : x.cantidad,
        valor_unitario: c === "fijo" ? x.valor_unitario : "",
      })),
    });
  }

  return (
    <>
      <ComoSeFactura
        idBase={idBase}
        valor={comoFactura}
        slug={elegido?.slug ?? ""}
        opciones={opciones}
        cargandoOpciones={opcionesQuery.isLoading}
        calculo={comoFactura === "nomenclador" ? calculo : null}
        calculando={calculando}
        galenos={galenos}
        onCambiar={cambiar}
        onSlug={(slug) => {
          const n = opciones.find((x) => x.slug === slug);
          if (n) void usarNomenclador(n);
        }}
      />
      {aviso && <span className={styles.errorMsg}>{aviso}</span>}
    </>
  );
}
