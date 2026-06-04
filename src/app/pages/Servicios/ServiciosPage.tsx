import { useEffect, useMemo, useRef, useState } from "react";
import { Building2, ChevronLeft, ChevronRight, Search } from "lucide-react";
import { getJSON, patchJSON } from "../../lib/http";
import s from "./ServiciosPage.module.scss";

const PAGE_SIZE = 20;

type MedicoRow = {
  id: number;
  nro_socio: string | null;
  nombre: string;
  matricula_prov: string;
  es_organizacion: number;
  [key: string]: unknown;
};

function normalizeText(v: unknown): string {
  return String(v ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim();
}

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
  const [orgs, setOrgs] = useState<MedicoRow[]>([]);
  const [loadingOrgs, setLoadingOrgs] = useState(true);
  const [orgsError, setOrgsError] = useState<string | null>(null);
  const [orgsPage, setOrgsPage] = useState(1);

  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<MedicoRow[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const [updating, setUpdating] = useState<Set<number>>(new Set());
  const [updateErrors, setUpdateErrors] = useState<Record<number, string>>({});

  const searchDebounceRef = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoadingOrgs(true);
    setOrgsError(null);

    getJSON<Record<string, unknown>[]>("/api/medicos/all", { es_organizacion: 1, limit: 500 })
      .then((data) => {
        if (cancelled) return;
        const rows = (Array.isArray(data) ? data : [])
          .map(toMedicoRow)
          .filter((r) => r.es_organizacion === 1);
        setOrgs(rows);
      })
      .catch((err) => {
        if (cancelled) return;
        setOrgsError(err?.message ?? "Error al cargar organizaciones.");
      })
      .finally(() => {
        if (!cancelled) setLoadingOrgs(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

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
        const data = await getJSON<Record<string, unknown>[]>("/api/medicos/all", {
          q,
          limit: 50,
        });
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
      await patchJSON(`/api/medicos/${id}/organizacion`, { es_organizacion: newValue });

      if (newValue === 1) {
        const updated = { ...row, es_organizacion: 1 };
        setOrgs((prev) => {
          if (prev.some((o) => o.id === id)) return prev;
          return [...prev, updated].sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
        });
      } else {
        setOrgs((prev) => prev.filter((o) => o.id !== id));
      }

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
      <div className={s.header}>
        <div className={s.headerLeft}>
          <Building2 size={32} className={s.headerIcon} aria-hidden="true" />
          <div>
            <h1 className={s.title}>Servicios</h1>
            <p className={s.subtitle}>
              {loadingOrgs
                ? "Cargando…"
                : `${orgs.length} organización${orgs.length !== 1 ? "es" : ""} registrada${orgs.length !== 1 ? "s" : ""}`}
            </p>
          </div>
        </div>
      </div>

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
              <span className={s.spinner} aria-hidden="true" />
              <p>Cargando organizaciones…</p>
            </div>
          ) : orgsFiltered.length === 0 ? (
            <div className={s.emptyState}>
              <Building2 size={40} className={s.emptyIcon} aria-hidden="true" />
              <p>No hay organizaciones registradas.</p>
            </div>
          ) : (
            <table className={s.table}>
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
                          <span className={s.spinnerSm} aria-hidden="true" />
                        )}
                      </label>
                      {updateErrors[org.id] && (
                        <span className={s.updateError}>{updateErrors[org.id]}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {!loadingOrgs && orgsPageCount > 1 && (
          <div className={s.pagination} role="navigation" aria-label="Paginación organizaciones">
            <button
              className={s.pageBtn}
              onClick={() => setOrgsPage((p) => p - 1)}
              disabled={orgsPage === 1}
              aria-label="Página anterior"
            >
              <ChevronLeft size={16} />
            </button>
            <span className={s.pageInfo}>
              Página {orgsPage} de {orgsPageCount}
            </span>
            <button
              className={s.pageBtn}
              onClick={() => setOrgsPage((p) => p + 1)}
              disabled={orgsPage === orgsPageCount}
              aria-label="Página siguiente"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        )}
      </section>

      {/* Search and assign */}
      <section className={s.section}>
        <h2 className={s.sectionTitle}>Buscar y asignar organización</h2>
        <p className={s.sectionSubtitle}>
          Buscá un socio por nombre, matrícula o número de socio y marcá si es una organización.
        </p>

        <div className={s.searchRow}>
          <div className={s.searchWrap}>
            <Search size={16} className={s.searchIcon} aria-hidden="true" />
            <input
              type="search"
              className={s.searchInput}
              placeholder="Buscar por nombre, matrícula o número de socio…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              aria-label="Buscar socio"
            />
          </div>
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
                <span className={s.spinner} aria-hidden="true" />
                <p>Buscando…</p>
              </div>
            ) : searchResults.length === 0 ? (
              <div className={s.emptyState}>
                <p>No se encontraron socios con ese criterio.</p>
              </div>
            ) : (
              <table className={s.table}>
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
                            <span className={s.spinnerSm} aria-hidden="true" />
                          )}
                        </label>
                        {updateErrors[row.id] && (
                          <span className={s.updateError}>{updateErrors[row.id]}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {searchTerm.trim().length > 0 && searchTerm.trim().length < 2 && (
          <p className={s.searchHint}>Ingresá al menos 2 caracteres para buscar.</p>
        )}
      </section>
    </div>
  );
}
