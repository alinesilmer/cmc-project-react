import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Download, Info, Search, X } from "lucide-react";

import Button from "@/app/components/ui/Button/Button";
import { fetchBoletinMedico, type ItemBoletin } from "@/app/pages/BoletinMedico/boletinMedico.api";
import { normalizar } from "@/app/pages/BoletinMedico/boletinMedico.formato";
import { descargarBoletinGalenos } from "./boletinValoresGalenos.pdf";
import { indexarValores, ordenarFilas, type Orden } from "./valoresGalenos";
import ListaValores from "./ListaValores";
import SelectorValor from "./SelectorValor";
import s from "./BoletinValoresGalenos.module.scss";

const SIN_ITEMS: ItemBoletin[] = [];

const ORDENES: { id: Orden; label: string }[] = [
  { id: "valor", label: "Mayor valor" },
  { id: "nombre", label: "A – Z" },
];

/**
 * Boletín de galenos, para el Colegio.
 *
 * Se elige un valor —Galeno Quirúrgico, Gasto Radiológico— y la pantalla
 * muestra una sola lista: cada obra social y cuánto paga. Lee lo mismo que
 * «Valores del boletín» del socio y comparte su caché.
 */
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

  const encabezado = (
    <header className={s.encabezado}>
      <div>
        <h1 className={s.titulo}>Boletín de galenos</h1>
        <p className={s.bajada}>Elegí un valor y compará todas las obras sociales.</p>
      </div>
      <Button
        type="button"
        variant="primary"
        isLoading={bajando}
        disabled={items.length === 0}
        onClick={() => void bajar()}
        leftIcon={<Download size={17} />}
      >
        Descargar PDF
      </Button>
    </header>
  );

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

      <SelectorValor tipos={indice.tipos} elegido={codigo} onElegir={setElegido} />

      <div className={s.barraLista}>
        <h2 className={s.pregunta}>
          {tipo.nombre}: <span>cuánto paga cada obra social</span>
        </h2>

        <div className={s.buscador}>
          <Search size={17} className={s.lupa} aria-hidden="true" />
          <input
            id="buscar-obra-social"
            type="search"
            className={s.campo}
            placeholder="Buscar obra social o número"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            aria-label="Buscar obra social por nombre o número"
            autoComplete="off"
          />
          {busqueda && (
            <button type="button" className={s.limpiar} onClick={() => setBusqueda("")} aria-label="Borrar la búsqueda">
              <X size={15} />
            </button>
          )}
        </div>

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
      </div>

      <p className={s.conteo} aria-live="polite">
        {busqueda ? `${visibles.length} de ${todas.length}` : `${todas.length} obras sociales`}
      </p>

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
