import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  FileText,
  Search,
  X,
  Info,
  AlertTriangle,
  Download,
} from "lucide-react";

import Button from "@/app/components/ui/Button/Button";
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

/**
 * Valores del boletín, para el socio.
 *
 * Es la versión de panel del modal «Valores Boletín» de `menu.php`: el mismo
 * contenido —valor de consulta por obra social y valores de galeno— pero como
 * pantalla propia, buscable y legible en el teléfono, que es donde el médico la
 * mira antes de atender.
 *
 * Sólo lee. El boletín lo carga el Colegio desde sus propias pantallas.
 */

type Vista = "consulta" | "pediatria" | "galenos" | "observaciones";

const VISTAS: { id: Vista; label: string }[] = [
  { id: "consulta", label: "Valor de consulta" },
  { id: "galenos", label: "Valores de galeno" },
  { id: "observaciones", label: "Observaciones" },
];

/**
 * Para un pediatra la primera solapa es su boletín: los códigos de pediatría
 * de cada obra social en lugar del valor de consulta, como en el sistema viejo.
 * Los galenos no se le muestran (decisión del Colegio); las observaciones sí.
 */
const VISTAS_PEDIATRIA: { id: Vista; label: string }[] = [
  { id: "pediatria", label: "Valores de pediatría" },
  ...VISTAS.filter((v) => v.id !== "consulta" && v.id !== "galenos"),
];

/** Referencia estable para el estado inicial: un `[]` nuevo por render
 * invalidaría los `useMemo` que filtran la lista. */
const SIN_ITEMS: ItemBoletin[] = [];

export default function BoletinMedico() {
  const { user } = useAuth();
  const pediatra = esPediatra(user?.especialidades);
  const vistas = pediatra ? VISTAS_PEDIATRIA : VISTAS;

  const [vista, setVista] = useState<Vista>(vistas[0].id);
  const [busqueda, setBusqueda] = useState("");
  const [bajando, setBajando] = useState(false);

  // El boletín cambia de un día para el otro, no dentro de una sesión: se
  // mantiene en caché para que volver a la pantalla no vuelva a pedirlo todo.
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

  // Cada solapa lista sólo las obras sociales que tienen ese dato: una tarjeta
  // vacía no le dice nada a nadie, y el contador de arriba quedaría mintiendo.
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

  // Se baja el boletín entero, no lo que quedó filtrado en pantalla: el archivo
  // es el boletín, no un recorte de lo que alguien estaba mirando.
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

  if (cargando) {
    return (
      <div className={s.container}>
        <Encabezado pediatria={pediatra} />
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
        <Encabezado pediatria={pediatra} />
        <p className={s.aviso} role="status">
          <AlertTriangle size={17} aria-hidden="true" />
          No pudimos cargar el boletín en este momento.
        </p>
      </div>
    );
  }

  return (
    <div className={s.container}>
      <Encabezado pediatria={pediatra} />

      <div className={s.barra}>
        <div className={s.tabs} role="tablist" aria-label="Qué parte del boletín ver">
          {vistas.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={vista === id}
              className={vista === id ? `${s.tab} ${s.tabActiva}` : s.tab}
              onClick={() => setVista(id)}
            >
              {label}
            </button>
          ))}
        </div>

        <div className={s.buscador}>
          <Search size={17} className={s.lupa} aria-hidden="true" />
          <input
            id="buscar-obra-social"
            type="search"
            className={s.input}
            placeholder="Buscar obra social o número"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            aria-label="Buscar obra social por nombre o número"
            autoComplete="off"
          />
          {busqueda && (
            <button
              type="button"
              className={s.limpiar}
              onClick={() => setBusqueda("")}
              aria-label="Borrar la búsqueda"
            >
              <X size={15} />
            </button>
          )}
        </div>

        <p className={s.conteo} aria-live="polite">
          {busqueda
            ? `${visibles.length} de ${base.length}`
            : `${base.length} obras sociales`}
        </p>

        {/* Un solo botón: el archivo trae las tres solapas como tres hojas. */}
        <Button
          type="button"
          variant="primary"
          size="sm"
          isLoading={bajando}
          disabled={items.length === 0}
          onClick={() => void bajar()}
          leftIcon={<Download size={16} />}
        >
          Descargar boletín
        </Button>
      </div>

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

function Encabezado({ pediatria = false }: { pediatria?: boolean }) {
  const bajada = pediatria
    ? "Valores de pediatría y observaciones por obra social."
    : "Valor de consulta y galenos por obra social.";

  return (
    <header className={s.header}>
      <FileText size={30} className={s.headerIcon} aria-hidden="true" />
      <div>
        <h1 className={s.title}>Valores del boletín</h1>
        <p className={s.subtitle}>
          {bajada} Sujeto a cambios por actualizaciones permanentes.
        </p>
      </div>
    </header>
  );
}

function TablaConsulta({ items }: { items: ItemBoletin[] }) {
  return (
    <div className={s.tableWrap}>
      <table className={s.table}>
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
      </table>
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

/**
 * Las condiciones de cada obra social.
 *
 * Van en su propia solapa y no al pie de las otras dos porque no dependen del
 * precio: una obra social puede exigir bono o autorización aunque todavía no
 * tenga valores cargados, y ahí igual tiene que aparecer.
 */
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

/**
 * Un galeno de la tarjeta.
 *
 * Se muestra la unidad del galeno y nada más. Los nivelados —Cirugía Adultos
 * llega a diez niveles y Ginecología a trece— ocupaban un renglón por nivel y
 * tapaban al resto, y el nivel que corresponde a cada práctica lo resuelve la
 * administración, no el socio.
 *
 * En casi todas las obras sociales los niveles de un mismo galeno comparten
 * valor unitario, así que el renglón es un número. Las excepciones son FASO y
 * Urología: ahí se muestra el rango en vez de elegir un nivel cualquiera.
 */
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
