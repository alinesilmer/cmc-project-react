import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Eye, EyeOff } from "lucide-react";

import { conProceso } from "@/app/hooks/proceso";
import { useConfirmacion } from "@/app/hooks/useConfirmacion";
import { listarFacturas, publicarPeriodo } from "../api";
import { detailMessage } from "../types";
import type { ObraSocialOption } from "../types";
import Paso from "@/app/components/ui/Paso/Paso";
import Tabla from "@/app/components/ui/Tabla/Tabla";
import Button from "@/app/components/ui/Button/Button";
import Cargando from "@/app/components/ui/Cargando/Cargando";
import Vacio from "@/app/components/ui/Vacio/Vacio";
import { ErrorAccion } from "@/app/components/ui/ResultadoAccion/ResultadoAccion";
import c from "@/app/components/ui/Paso/Campos.module.scss";
import { comoErrorApi } from "@/app/shared/lib/httpErrors";
import styles from "./PublicarRecepciones.module.scss";

// Un año son 12 períodos: se pide cada uno por separado (la API filtra por período exacto) y livianos, en vez de traer todo el historial.
const MESES = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, "0"));
const ANIO_ACTUAL = new Date().getFullYear();
const ANIOS = Array.from({ length: 8 }, (_, i) => String(ANIO_ACTUAL - i));

type PeriodoPublicable = { periodo: string; etiqueta: string; publicado: boolean };

/** Publica u oculta a los médicos las recepciones de la obra social elegida arriba: un período por vez o todos juntos. */
export default function PublicarRecepciones({ obraSocial, bloqueado }: { obraSocial: ObraSocialOption | null; bloqueado: boolean }) {
  const queryClient = useQueryClient();
  const { pedir, modal } = useConfirmacion();
  const [trabajando, setTrabajando] = useState(false);
  const [anio, setAnio] = useState(String(ANIO_ACTUAL));
  const cod = obraSocial ? String(obraSocial.nro_obra_social) : "";
  const clave = ["recepciones-publicacion", cod, anio];

  const facturas = useQuery({
    queryKey: clave,
    queryFn: async () => {
      const porMes = await Promise.all(
        MESES.map((mes) => listarFacturas({ cod_obra: cod, periodo: `${anio}${mes}`, limit: 20 }).then((r) => r.data)),
      );
      return porMes.flat();
    },
    enabled: Boolean(cod),
  });

  // La publicación es por obra social y período: la original y sus complementos comparten estado.
  const periodos = useMemo<PeriodoPublicable[]>(() => {
    const porPeriodo = new Map<string, PeriodoPublicable>();
    for (const f of facturas.data ?? []) {
      const previo = porPeriodo.get(f.periodo);
      if (previo) previo.publicado = previo.publicado || f.publicado;
      else porPeriodo.set(f.periodo, { periodo: f.periodo, etiqueta: f.periodo_label || f.periodo, publicado: f.publicado });
    }
    return [...porPeriodo.values()].sort((a, b) => b.periodo.localeCompare(a.periodo));
  }, [facturas.data]);

  const aplicar = async (lista: PeriodoPublicable[], publicar: boolean) => {
    if (!cod || lista.length === 0) return;
    setTrabajando(true);
    let fallos = 0;
    await conProceso(
      {
        haciendo: publicar ? "Publicando las recepciones" : "Ocultando las recepciones",
        listo: publicar ? "Recepciones publicadas" : "Recepciones ocultas",
        detalleListo: () => (fallos > 0 ? `${fallos} período${fallos === 1 ? "" : "s"} no se pudo actualizar.` : ""),
        fallo: "No se pudo actualizar",
        detalleFallo: (e) => detailMessage(comoErrorApi(e).response?.data?.detail) || undefined,
      },
      async () => {
        for (const p of lista) {
          try {
            await publicarPeriodo({ cod_obra: cod, periodo: p.periodo, publicado: publicar });
          } catch {
            fallos += 1;
          }
        }
        // Si no se pudo ninguno, es un error y no un «listo».
        if (fallos === lista.length) throw new Error("No se pudo actualizar ningún período.");
      },
    );
    await queryClient.invalidateQueries({ queryKey: clave });
    setTrabajando(false);
  };

  const nombre = obraSocial?.nombre ?? "";
  const pendientesPublicar = periodos.filter((p) => !p.publicado);
  const pendientesOcultar = periodos.filter((p) => p.publicado);

  const cambiarUno = (p: PeriodoPublicable) => {
    const publicar = !p.publicado;
    pedir(
      {
        titulo: publicar ? "Publicar recepciones" : "Ocultar recepciones",
        mensaje: publicar
          ? `Los médicos van a ver las recepciones de ${nombre} de ${p.etiqueta}.`
          : `Los médicos dejan de ver las recepciones de ${nombre} de ${p.etiqueta}.`,
        confirmar: publicar ? "Publicar" : "Ocultar",
      },
      () => void aplicar([p], publicar),
    );
  };

  const cambiarTodos = (publicar: boolean) => {
    const lista = publicar ? pendientesPublicar : pendientesOcultar;
    pedir(
      {
        titulo: publicar ? `Publicar todo ${anio}` : `Ocultar todo ${anio}`,
        mensaje: publicar
          ? `Los médicos van a ver las recepciones de ${nombre} de ${lista.length} período${lista.length === 1 ? "" : "s"} de ${anio}.`
          : `Los médicos dejan de ver las recepciones de ${nombre} de ${lista.length} período${lista.length === 1 ? "" : "s"} de ${anio}.`,
        confirmar: publicar ? "Publicar todos" : "Ocultar todos",
      },
      () => void aplicar(lista, publicar),
    );
  };

  return (
    <Paso icono={Eye} titulo="Publicar recepciones">
      {!obraSocial && <p className={c.ayuda}>Elegí la obra social en el paso 1.</p>}
      {obraSocial && (
        <label className={c.campo}>
          <span className={c.rotulo}>Año</span>
          <select className={c.seleccion} value={anio} onChange={(e) => setAnio(e.target.value)} disabled={bloqueado || trabajando}>
            {ANIOS.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </label>
      )}

      {facturas.isLoading && <Cargando size={20} tono="marca" aria-label="Cargando los períodos" />}
      {facturas.isError && <ErrorAccion>No se pudieron cargar los períodos.</ErrorAccion>}

      {obraSocial && facturas.isSuccess && periodos.length === 0 && <Vacio icono={EyeOff}>Esta obra social no tiene períodos en {anio}.</Vacio>}

      {periodos.length > 0 && (
        <>
          <div className={c.acciones}>
            <Button variant="primary" leftIcon={<Eye size={16} aria-hidden="true" />} disabled={bloqueado || trabajando || pendientesPublicar.length === 0} onClick={() => cambiarTodos(true)}>
              Publicar todos
            </Button>
            <Button variant="ghost" leftIcon={<EyeOff size={16} aria-hidden="true" />} disabled={bloqueado || trabajando || pendientesOcultar.length === 0} onClick={() => cambiarTodos(false)}>
              Ocultar todos
            </Button>
          </div>
          <Tabla>
            <thead>
              <tr>
                <th>Período</th>
                <th>Médicos</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {periodos.map((p) => (
                <tr key={p.periodo}>
                  <td>{p.etiqueta}</td>
                  <td>
                    <span className={`${styles.estado} ${p.publicado ? styles.visible : ""}`}>{p.publicado ? "Lo ven" : "Oculto"}</span>
                  </td>
                  <td>
                    <Button variant="ghost" size="sm" disabled={bloqueado || trabajando} onClick={() => cambiarUno(p)}>
                      {p.publicado ? "Ocultar" : "Publicar"}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </Tabla>
        </>
      )}
      {modal}
    </Paso>
  );
}
