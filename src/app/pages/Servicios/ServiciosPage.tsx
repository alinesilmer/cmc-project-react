import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2 } from "lucide-react";
import { buscarSocios, listarOrganizaciones, marcarOrganizacion } from "./servicios.api";
import Franja from "@/app/components/layout/Franja/Franja";
import s from "./ServiciosPage.module.scss";
import SearchField from "@/app/components/ui/SearchField/SearchField";
import Tabla from "@/app/components/ui/Tabla/Tabla";
import Cargando from "@/app/components/ui/Cargando/Cargando";
import Paginador from "@/app/components/ui/Paginador/Paginador";

const PAGE_SIZE = 20;
const ORGANIZACIONES_KEY = ["medicos", "organizaciones"] as const;

type MedicoRow = {
  id: number;
  nro_socio: string | null;
  nombre: string;
  matricula_prov: string;
  es_organizacion: number;
  [key: string]: unknown;
};

function pickNombre(row: Record<string, unknown>): string {
  return String(
    row.nombre ?? row.NOMBRE ?? row.apellido_nombre ?? row.APELLIDO_NOMBRE ?? "—"
  ).trim();
}

function pickNroSocio(row: Record<string, unknown>): string | null {
  const v = row.nro_socio ?? row.NRO_SOCIO;
  return v != null ? String(v) : null;
}

function pickMatricula(row: Record<string, unknown>): string {
  return String(row.matricula_prov ?? row.MATRICULA_PROV ?? "—").trim();
}

function pickEsOrg(row: Record<string, unknown>): number {
  const v = row.es_organizacion ?? row.ES_ORGANIZACION;
  if (v === true || v === 1 || v === "1") return 1;
  return 0;
}

function toMedicoRow(raw: Record<string, unknown>): MedicoRow {
  return {
    ...raw,
    id: Number(raw.id ?? raw.ID),
    nro_socio: pickNroSocio(raw),
    nombre: pickNombre(raw),
    matricula_prov: pickMatricula(raw),
    es_organizacion: pickEsOrg(raw),
  };
}

export default function ServiciosPage() {
  const queryClient = useQueryClient();
  const consultaOrgs = useQuery({
    queryKey: ORGANIZACIONES_KEY,
    queryFn: async () => {
      const data = await listarOrganizaciones();
      return (Array.isArray(data) ? data : [])
        .map(toMedicoRow)
        .filter((r) => r.es_organizacion === 1);
    },
  });
  const orgs = useMemo(() => consultaOrgs.data ?? [], [consultaOrgs.data]);
  const loadingOrgs = consultaOrgs.isPending;
  const orgsError = consultaOrgs.isError
    ? consultaOrgs.error.message || "Error al cargar organizaciones."
    : null;
  const setOrgs = (cambio: (prev: MedicoRow[]) => MedicoRow[]) =>
    queryClient.setQueryData<MedicoRow[]>(ORGANIZACIONES_KEY, (prev) => prev && cambio(prev));
  const [orgsPage, setOrgsPage] = useState(1);

  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<MedicoRow[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const [updating, setUpdating] = useState<Set<number>>(new Set());
  const [updateErrors, setUpdateErrors] = useState<Record<number, string>>({});

  const searchDebounceRef = useRef<number | null>(null);

  useEffect(() => {
    if (searchDebounceRef.current) window.clearTimeout(searchDebounceRef.current);

    const q = searchTerm.trim();
    if (q.length < 2) {
      setSearchResults([]);
      setSearchError(null);
      return;
    }

    searchDebounceRef.current = window.setTimeout(async () => {
      setSearching(true);
      setSearchError(null);
      try {
        const data = await buscarSocios(q);
        setSearchResults((Array.isArray(data) ? data : []).map(toMedicoRow));
      } catch (err: unknown) {
        setSearchError((err as { message?: string })?.message ?? "Error al buscar.");
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 350);

    return () => {
      if (searchDebounceRef.current) window.clearTimeout(searchDebounceRef.current);
    };
  }, [searchTerm]);

  async function toggleOrganizacion(row: MedicoRow) {
    const id = row.id;
    const newValue = row.es_organizacion === 1 ? 0 : 1;

    setUpdating((prev) => new Set(prev).add(id));
    setUpdateErrors((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });

    try {
      await marcarOrganizacion(id, newValue);

      if (newValue === 1) {
        const updated = { ...row, es_organizacion: 1 };
        setOrgs((prev) => {
          if (prev.some((o) => o.id === id)) return prev;
          return [...prev, updated].sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
        });
      } else {
        setOrgs((prev) => prev.filter((o) => o.id !== id));
      }
      // Descarta cualquier lectura que haya salido antes de guardar: si llegara después, pisaría el cambio con el estado viejo.
      void queryClient.invalidateQueries({ queryKey: ORGANIZACIONES_KEY });

      setSearchResults((prev) =>
        prev.map((r) => (r.id === id ? { ...r, es_organizacion: newValue } : r))
      );
    } catch (err: unknown) {
      setUpdateErrors((prev) => ({
        ...prev,
        [id]: (err as { message?: string })?.message ?? "Error al actualizar.",
      }));
    } finally {
      setUpdating((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  }

  const orgsFiltered = useMemo(() => orgs, [orgs]);
  const orgsPageCount = Math.max(1, Math.ceil(orgsFiltered.length / PAGE_SIZE));
  const orgsPaginated = orgsFiltered.slice((orgsPage - 1) * PAGE_SIZE, orgsPage * PAGE_SIZE);

  useEffect(() => {
    setOrgsPage(1);
  }, [orgs.length]);

  return (
    <div className={s.container}>
      <Franja titulo="Servicios" icono={Building2} />

      {/* Buscar y asignar: arriba, porque es lo que se viene a hacer acá. */}
      <section className={s.section}>
        <h2 className={s.sectionTitle}>Buscar y asignar organización</h2>

        <div className={s.searchRow}>
          <SearchField
            placeholder="Buscar por nombre, matrícula o número de socio…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            ariaLabel="Buscar socio"
          />
        </div>

        {searchError && (
          <div className={s.errorBanner} role="alert">
            {searchError}
          </div>
        )}

        {searchTerm.trim().length >= 2 && (
          <div className={s.tableWrapper}>
            {searching ? (
              <div className={s.loadingState}>
                <Cargando size={32} tono="marca" aria-hidden="true" />
                <p>Buscando…</p>
              </div>
            ) : searchResults.length === 0 ? (
              <div className={s.emptyState}>
                <p>No se encontraron socios con ese criterio.</p>
              </div>
            ) : (
              <Tabla className={s.table}>
                <thead>
                  <tr>
                    <th>Nro. Socio</th>
                    <th>Nombre</th>
                    <th>Matrícula Prov.</th>
                    <th className={s.checkCol}>Es Organización</th>
                  </tr>
                </thead>
                <tbody>
                  {searchResults.map((row) => (
                    <tr key={row.id}>
                      <td className={s.idCell}>{row.nro_socio ?? "—"}</td>
                      <td className={s.nameCell}>{row.nombre}</td>
                      <td>{row.matricula_prov}</td>
                      <td className={s.checkCol}>
                        <label className={s.checkLabel}>
                          <input
                            type="checkbox"
                            className={s.checkbox}
                            checked={row.es_organizacion === 1}
                            disabled={updating.has(row.id)}
                            onChange={() => toggleOrganizacion(row)}
                            aria-label={`Marcar ${row.nombre} como organización`}
                          />
                          {updating.has(row.id) && (
                            <Cargando size={14} tono="marca" aria-hidden="true" />
                          )}
                        </label>
                        {updateErrors[row.id] && (
                          <span className={s.updateError}>{updateErrors[row.id]}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Tabla>
            )}
          </div>
        )}

        {searchTerm.trim().length > 0 && searchTerm.trim().length < 2 && (
          <p className={s.searchHint}>Ingresá al menos 2 caracteres para buscar.</p>
        )}
      </section>

      {/* Organizations table */}
      <section className={s.section}>
        <h2 className={s.sectionTitle}>Organizaciones activas</h2>

        {orgsError && (
          <div className={s.errorBanner} role="alert">
            {orgsError}
          </div>
        )}

        <div className={s.tableWrapper}>
          {loadingOrgs ? (
            <div className={s.loadingState}>
              <Cargando size={32} tono="marca" aria-hidden="true" />
              <p>Cargando organizaciones…</p>
            </div>
          ) : orgsFiltered.length === 0 ? (
            <div className={s.emptyState}>
              <Building2 size={40} className={s.emptyIcon} aria-hidden="true" />
              <p>No hay organizaciones registradas.</p>
            </div>
          ) : (
            <Tabla className={s.table}>
              <thead>
                <tr>
                  <th>Nro. Socio</th>
                  <th>Nombre</th>
                  <th>Matrícula Prov.</th>
                  <th className={s.checkCol}>Es Organización</th>
                </tr>
              </thead>
              <tbody>
                {orgsPaginated.map((org) => (
                  <tr key={org.id}>
                    <td className={s.idCell}>{org.nro_socio ?? "—"}</td>
                    <td className={s.nameCell}>{org.nombre}</td>
                    <td>{org.matricula_prov}</td>
                    <td className={s.checkCol}>
                      <label className={s.checkLabel}>
                        <input
                          type="checkbox"
                          className={s.checkbox}
                          checked={org.es_organizacion === 1}
                          disabled={updating.has(org.id)}
                          onChange={() => toggleOrganizacion(org)}
                          aria-label={`Marcar ${org.nombre} como organización`}
                        />
                        {updating.has(org.id) && (
                          <Cargando size={14} tono="marca" aria-hidden="true" />
                        )}
                      </label>
                      {updateErrors[org.id] && (
                        <span className={s.updateError}>{updateErrors[org.id]}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </Tabla>
          )}
        </div>

        {!loadingOrgs && orgsPageCount > 1 && (
          <Paginador pagina={orgsPage} totalPaginas={orgsPageCount} onCambiar={setOrgsPage} etiqueta="Paginación organizaciones" />
        )}
      </section>
    </div>
  );
}
