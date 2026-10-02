import { useId, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, X } from "lucide-react";
import { searchDoctors, type DoctorLite } from "../../../lib/ads.client";
import { useDebounce } from "../../../hooks/useDebounce";
import styles from "./BuscadorMedico.module.scss";

type Props = {
  etiqueta: string;
  elegido: DoctorLite | null;
  onElegir: (medico: DoctorLite | null) => void;
};

/** «Socio 123 · DNI … · MP …»: lo que distingue a dos médicos con el mismo nombre. */
function detalle(d: DoctorLite): string {
  return [
    d.nombre,
    d.nro_socio && `Socio ${d.nro_socio}`,
    d.documento && `DNI ${d.documento}`,
    d.matricula_prov && `MP ${d.matricula_prov}`,
  ]
    .filter(Boolean)
    .join(" · ");
}

/**
 * Buscador de médicos para asignar un aviso. El alta y la edición tenían cada
 * uno su copia, y buscaban en cada tecla: ahora espera a que se deje de escribir.
 */
export default function BuscadorMedico({ etiqueta, elegido, onElegir }: Props) {
  const id = useId();
  const [texto, setTexto] = useState("");
  const consulta = useDebounce(texto.trim(), 250);

  const { data: resultados = [] } = useQuery({
    queryKey: ["admin", "buscar-medico", consulta],
    queryFn: () => searchDoctors(consulta),
    enabled: consulta.length >= 2 && !elegido,
    staleTime: 60 * 1000,
  });

  const elegir = (d: DoctorLite) => {
    onElegir(d);
    setTexto(d.nombre);
  };

  return (
    <div className={styles.buscador}>
      <label htmlFor={id}>{etiqueta}</label>
      <div className={styles.searchWrap}>
        <Search aria-hidden="true" />
        <input
          id={id}
          type="search"
          placeholder="Nombre, socio, DNI o matrícula…"
          value={texto}
          onChange={(e) => {
            setTexto(e.target.value);
            if (elegido) onElegir(null);
          }}
          autoComplete="off"
        />
      </div>

      {elegido ? (
        <div className={styles.selectedDoctor}>
          <span>{elegido.nombre}</span>
          <button type="button" onClick={() => onElegir(null)} aria-label="Quitar médico elegido">
            <X aria-hidden="true" />
          </button>
        </div>
      ) : (
        texto &&
        resultados.length > 0 && (
          <div className={styles.dropdown} role="listbox" aria-label="Médicos encontrados">
            {resultados.map((d) => (
              <button type="button" key={d.id} role="option" aria-selected={false} className={styles.dropdownItem} onClick={() => elegir(d)}>
                {detalle(d)}
              </button>
            ))}
          </div>
        )
      )}
    </div>
  );
}
