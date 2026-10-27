import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import AppSearchSelect from "@/app/components/ui/AppSearchSelect/AppSearchSelect";
import c from "@/app/components/ui/Paso/Campos.module.scss";
import { searchDoctors, type DoctorLite } from "@/website/lib/ads.client";
import { useDebounce } from "@/website/hooks/useDebounce";

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

/** Buscador de médicos para asignar un aviso: por nombre, socio, DNI o matrícula. */
export default function BuscadorMedico({ etiqueta, elegido, onElegir }: Props) {
  const [texto, setTexto] = useState("");
  const consulta = useDebounce(texto.trim(), 250);

  const { data: resultados = [], isFetching } = useQuery({
    queryKey: ["admin", "buscar-medico", consulta],
    queryFn: () => searchDoctors(consulta),
    enabled: consulta.length >= 2 && !elegido,
    staleTime: 60 * 1000,
  });

  const opciones = useMemo(() => resultados.map((d) => ({ id: d.id, label: detalle(d) })), [resultados]);

  return (
    <div className={c.campo}>
      <span className={c.rotulo}>{etiqueta}</span>
      <AppSearchSelect
        options={opciones}
        value={elegido?.id ?? null}
        loading={isFetching}
        onQueryChange={setTexto}
        onChange={(id) => onElegir(id == null ? null : (resultados.find((d) => d.id === id) ?? null))}
      />
      <p className={c.ayuda}>Nombre, socio, DNI o matrícula.</p>
    </div>
  );
}
