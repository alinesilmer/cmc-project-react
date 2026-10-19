import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Coins, Info } from "lucide-react";

import Caja, { Cajas } from "@/app/components/ui/Caja/Caja";
import Franja from "@/app/components/layout/Franja/Franja";
import { fetchBoletinMedico, type ItemBoletin } from "@/app/pages/BoletinMedico/boletinMedico.api";
import { normalizar } from "@/app/pages/BoletinMedico/boletinMedico.formato";
import { descargarBoletinGalenos } from "./boletinValoresGalenos.pdf";
import { indexarValores, ordenarFilas, type Orden } from "./valoresGalenos";
import ListaValores from "./ListaValores";
import SelectorValor from "./SelectorValor";
import s from "./BoletinValoresGalenos.module.scss";
import SearchField from "@/app/components/ui/SearchField/SearchField";
import BotonDescarga from "@/app/components/ui/BotonDescarga/BotonDescarga";

const SIN_ITEMS: ItemBoletin[] = [];

const ORDENES: { id: Orden; label: string }[] = [
  { id: "valor", label: "Mayor valor" },
  { id: "nombre", label: "A – Z" },
];

/** Boletín de galenos, para el Colegio. */
export default function BoletinValoresGalenos() {
  const [elegido, setElegido] = useState<string | null>(null);
  const [orden, setOrden] = useState<Orden>("valor");
  const [busqueda, setBusqueda] = useState("");
  const [bajando, setBajando] = useState(false);

  const {
    data: items = SIN_ITEMS,
    isPending: cargando,
    isError: error,
  } = useQuery<ItemBoletin[]>({
    queryKey: ["boletin-medico", { pediatria: false }],
    queryFn: () => fetchBoletinMedico({ pediatria: false }),
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    retry: 1,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  const indice = useMemo(() => indexarValores(items), [items]);
  const codigo = elegido ?? indice.tipos[0]?.codigo ?? "";
  const tipo = indice.tipos.find((t) => t.codigo === codigo);

  const todas = useMemo(() => indice.filas.get(codigo) ?? [], [indice, codigo]);
  const tope = useMemo(() => Math.max(0, ...todas.map((f) => f.maximo)), [todas]);

  const visibles = useMemo(() => {
    const q = normalizar(busqueda);
    const filtradas = q
      ? todas.filter((f) => normalizar(f.nombre).includes(q) || String(f.nro).includes(q))
      : todas;
    return ordenarFilas(filtradas, orden);
  }, [todas, busqueda, orden]);

  const bajar = async () => {
    setBajando(true);
    try {
      await descargarBoletinGalenos(items);
    } catch (e) {
      console.error("Descarga del boletín de galenos:", e);
    } finally {
      setBajando(false);
    }
  };

  const encabezado = <Franja titulo="Boletín de galenos" icono={Coins} />;

  if (cargando) {
    return (
      <div className={s.pantalla}>
        {encabezado}
        <div className={s.esqueleto} aria-busy="true" aria-live="polite">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className={s.esqueletoFila} />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={s.pantalla}>
        {encabezado}
        <p className={s.error} role="alert">
          <AlertTriangle size={17} aria-hidden="true" />
          No pudimos cargar el boletín en este momento.
        </p>
      </div>
    );
  }

  if (!tipo) {
    return (
      <div className={s.pantalla}>
        {encabezado}
        <p className={s.vacio} role="status">
          <Info size={17} aria-hidden="true" />
          Todavía no hay valores cargados.
        </p>
      </div>
    );
  }

  return (
    <div className={s.pantalla}>
      {encabezado}

      <Cajas>
        <Caja titulo="Configuración">
          <SelectorValor tipos={indice.tipos} elegido={codigo} onElegir={setElegido} />
          <div className={s.orden} role="group" aria-label="Orden de la lista">
            {ORDENES.map(({ id, label }) => (
              <button
                key={id}
                type="button"
                className={orden === id ? `${s.opcion} ${s.opcionActiva}` : s.opcion}
                aria-pressed={orden === id}
                onClick={() => setOrden(id)}
              >
                {label}
              </button>
            ))}
          </div>
        </Caja>
        <Caja titulo="Descargas">
          <BotonDescarga
            formato="pdf"
            onClick={() => void bajar()}
            disabled={items.length === 0}
            cargando={bajando}
          />
        </Caja>
      </Cajas>

      <SearchField
        id="buscar-obra-social"
        placeholder="Buscar obra social o número"
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
        onClear={() => setBusqueda("")}
        ariaLabel="Buscar obra social por nombre o número"
      />

      <h2 className={s.pregunta}>
        {tipo.nombre}
        {busqueda && (
          <span aria-live="polite">
            {visibles.length} de {todas.length}
          </span>
        )}
      </h2>

      {visibles.length === 0 ? (
        <p className={s.vacio} role="status">
          <Info size={17} aria-hidden="true" />
          No encontramos ninguna obra social con «{busqueda}».
        </p>
      ) : (
        <ListaValores filas={visibles} tope={tope} />
      )}
    </div>
  );
}
