import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { AlertTriangle, FileText, Info } from "lucide-react";

import Franja, { Solapa } from "@/app/components/layout/Franja/Franja";
import BotonDescarga from "@/app/components/ui/BotonDescarga/BotonDescarga";
import { useAuth } from "@/app/auth/AuthProvider";
import { agruparPorCodigo } from "@/app/features/nomenclador/galenos";
import type { GrupoGaleno } from "@/app/features/nomenclador/galenos";
import { fetchBoletinMedico } from "./boletinMedico.api";
import type { ItemBoletin } from "./boletinMedico.api";
import { esPediatra } from "./boletinPediatria";
import { descargarBoletin } from "./boletinMedico.pdf";
import { moneda, normalizar } from "./boletinMedico.formato";
import GrillaPediatria from "./GrillaPediatria";
import s from "./BoletinMedico.module.scss";
import SearchField from "@/app/components/ui/SearchField/SearchField";
import Tabla from "@/app/components/ui/Tabla/Tabla";

/** Valores del boletín, para el socio. */

type Vista = "consulta" | "pediatria" | "galenos" | "observaciones";

const VISTAS: { id: Vista; label: string }[] = [
  { id: "consulta", label: "Valor de consulta" },
  { id: "galenos", label: "Valores de galeno" },
  { id: "observaciones", label: "Observaciones" },
];

/** Para un pediatra la primera solapa es su boletín: los códigos de pediatría de cada obra social en lugar del valor de consulta. */
const VISTAS_PEDIATRIA: { id: Vista; label: string }[] = [
  { id: "pediatria", label: "Valores de pediatría" },
  ...VISTAS.filter((v) => v.id !== "consulta" && v.id !== "galenos"),
];

/** Referencia estable para el estado inicial: un `[]` nuevo por render invalidaría los `useMemo` que filtran la lista. */
const SIN_ITEMS: ItemBoletin[] = [];

export default function BoletinMedico() {
  const { user } = useAuth();
  const pediatra = esPediatra(user?.especialidades);
  const vistas = pediatra ? VISTAS_PEDIATRIA : VISTAS;

  const [vista, setVista] = useState<Vista>(vistas[0].id);
  const [busqueda, setBusqueda] = useState("");
  const [bajando, setBajando] = useState(false);

  // El boletín cambia de un día para el otro, no dentro de una sesión.
  const {
    data: items = SIN_ITEMS,
    isPending: cargando,
    isError: error,
  } = useQuery<ItemBoletin[]>({
    queryKey: ["boletin-medico", { pediatria: pediatra }],
    queryFn: () => fetchBoletinMedico({ pediatria: pediatra }),
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    retry: 1,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  // Cada solapa lista sólo las obras sociales que tienen ese dato: una tarjeta vacía no le dice nada a nadie.
  const base = useMemo(() => {
    if (vista === "pediatria") return items.filter((i) => i.pediatria.length > 0);
    if (vista === "galenos") return items.filter((i) => i.galenos.length > 0);
    if (vista === "observaciones") {
      return items.filter((i) => i.observaciones.length > 0);
    }
    return items.filter((i) => i.consulta !== null);
  }, [items, vista]);

  const visibles = useMemo(() => {
    const q = normalizar(busqueda);
    if (!q) return base;
    return base.filter(
      (i) => normalizar(i.nombre).includes(q) || String(i.nro).includes(q)
    );
  }, [base, busqueda]);

  // Se baja el boletín entero, no lo que quedó filtrado en pantalla: el archivo es el boletín.
  const bajar = async () => {
    setBajando(true);
    try {
      await descargarBoletin(items);
    } catch (e) {
      console.error("Descarga del boletín:", e);
    } finally {
      setBajando(false);
    }
  };

  const franja = (
    <Franja titulo="Valores del boletín" icono={FileText}>
      {vistas.map(({ id, label }) => (
        <Solapa key={id} activa={vista === id} onClick={() => setVista(id)} cuenta={cuantas(items, id)}>
          {label}
        </Solapa>
      ))}
    </Franja>
  );

  if (cargando) {
    return (
      <div className={s.container}>
        {franja}
        <div className={s.esqueletos} aria-busy="true" aria-live="polite">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className={s.esqueleto} />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={s.container}>
        {franja}
        <p className={s.aviso} role="status">
          <AlertTriangle size={17} aria-hidden="true" />
          No pudimos cargar el boletín en este momento.
        </p>
      </div>
    );
  }

  return (
    <div className={s.container}>
      {franja}

      <div className={s.barra}>
        <SearchField
          id="buscar-obra-social"
          placeholder="Buscar obra social o número"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          onClear={() => setBusqueda("")}
          ariaLabel="Buscar obra social por nombre o número"
        />

        {busqueda && (
          <p className={s.conteo} aria-live="polite">
            {visibles.length} de {base.length}
          </p>
        )}

        {/* Se baja el boletín entero, con las tres partes. */}
        <div className={s.descarga}>
          <BotonDescarga formato="pdf" onClick={() => void bajar()} cargando={bajando} disabled={items.length === 0}>
            Boletín
          </BotonDescarga>
        </div>
      </div>

      <p className={s.nota}>
        <Info size={16} aria-hidden="true" />
        Valores sujetos a cambios.
      </p>

      {visibles.length === 0 ? (
        <p className={s.aviso} role="status">
          <Info size={17} aria-hidden="true" />
          {busqueda
            ? `No encontramos ninguna obra social con «${busqueda}».`
            : "Todavía no hay valores cargados."}
        </p>
      ) : vista === "consulta" ? (
        <TablaConsulta items={visibles} />
      ) : vista === "pediatria" ? (
        <GrillaPediatria items={visibles} />
      ) : vista === "galenos" ? (
        <GrillaGalenos items={visibles} />
      ) : (
        <GrillaObservaciones items={visibles} />
      )}
    </div>
  );
}

/** Cuántas obras sociales tienen el dato de cada solapa (lo que lista cada una). */
function cuantas(items: ItemBoletin[], vista: Vista): number {
  if (vista === "pediatria") return items.filter((i) => i.pediatria.length > 0).length;
  if (vista === "galenos") return items.filter((i) => i.galenos.length > 0).length;
  if (vista === "observaciones") return items.filter((i) => i.observaciones.length > 0).length;
  return items.filter((i) => i.consulta !== null).length;
}

function TablaConsulta({ items }: { items: ItemBoletin[] }) {
  return (
    <div className={s.tableWrap}>
      <Tabla className={s.table}>
        <thead>
          <tr>
            <th className={s.num}>N°</th>
            <th>Obra social</th>
            <th className={s.num}>Consulta</th>
          </tr>
        </thead>
        <tbody>
          {items.map((i) => (
            <tr key={i.nro}>
              <td className={s.num}>{i.nro}</td>
              <td className={s.nombre}>{i.nombre}</td>
              <td className={`${s.num} ${s.valor}`}>
                {i.consulta !== null ? moneda.format(i.consulta) : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </Tabla>
    </div>
  );
}

function GrillaGalenos({ items }: { items: ItemBoletin[] }) {
  return (
    <ul className={s.grid}>
      {items.map((i, idx) => (
        <motion.li
          key={i.nro}
          className={s.card}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          // Techo al escalonado: con muchas obras sociales el último entraría tarde.
          transition={{ duration: 0.22, delay: Math.min(idx, 10) * 0.03 }}
        >
          <div className={s.cardHead}>
            <h2 className={s.cardTitle}>{i.nombre}</h2>
            <span className={s.cardNro}>{i.nro}</span>
          </div>

          <ul className={s.valores}>
            {agruparPorCodigo(i.galenos).map((grupo) => (
              <li key={grupo.codigo}>
                <Galeno grupo={grupo} />
              </li>
            ))}
          </ul>
        </motion.li>
      ))}
    </ul>
  );
}

/** Las condiciones de cada obra social. */
function GrillaObservaciones({ items }: { items: ItemBoletin[] }) {
  return (
    <ul className={s.grid}>
      {items.map((i, idx) => (
        <motion.li
          key={i.nro}
          className={s.card}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.22, delay: Math.min(idx, 10) * 0.03 }}
        >
          <div className={s.cardHead}>
            <h2 className={s.cardTitle}>{i.nombre}</h2>
            <span className={s.cardNro}>{i.nro}</span>
          </div>

          <ul className={s.condiciones}>
            {i.observaciones.map((texto, n) => (
              <li key={n}>{texto}</li>
            ))}
          </ul>
        </motion.li>
      ))}
    </ul>
  );
}

/** Un galeno de la tarjeta. */
function Galeno({ grupo }: { grupo: GrupoGaleno }) {
  const valor =
    grupo.minimo === grupo.maximo
      ? moneda.format(grupo.minimo)
      : `${moneda.format(grupo.minimo)} – ${moneda.format(grupo.maximo)}`;

  return (
    <div className={s.valorFila}>
      <span className={s.valorNombre}>{grupo.nombre}</span>
      <span className={s.valorMonto}>{valor}</span>
    </div>
  );
}
