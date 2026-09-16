import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Newspaper } from "lucide-react";

import AppSearchSelect from "../../components/atoms/AppSearchSelect/AppSearchSelect";
import type { AppSearchSelectOption } from "../../components/atoms/AppSearchSelect/AppSearchSelect";
import { searchMedicosForPagador } from "../DoctorProfilePage/api";
import s from "./PadronPorSocio.module.scss";

// Atajo: elegir un socio y caer directo en la pestaña Padrones de su legajo,
// sin pasar por el listado de socios.
export default function PadronPorSocio() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [options, setOptions] = useState<AppSearchSelectOption[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    const t = window.setTimeout(() => {
      searchMedicosForPagador(query)
        .then((medicos) => {
          if (!alive) return;
          setOptions(
            medicos.map((m) => ({
              id: m.id,
              label: m.nro_socio != null ? `${m.nro_socio} - ${m.nombre}` : m.nombre,
            }))
          );
        })
        .catch(() => alive && setOptions([]))
        .finally(() => alive && setLoading(false));
    }, 250);
    return () => {
      alive = false;
      window.clearTimeout(t);
    };
  }, [query]);

  return (
    <div className={s.page}>
      <h1 className={s.title}>
        <Newspaper size={22} /> Padrón por socio
      </h1>
      <div className={s.search}>
        <AppSearchSelect
          options={options}
          value={null}
          loading={loading}
          onQueryChange={setQuery}
          onChange={(id) => {
            if (id == null) return;
            navigate(`/panel/doctors/${id}`, { state: { tab: "padrones" } });
          }}
        />
      </div>
    </div>
  );
}
