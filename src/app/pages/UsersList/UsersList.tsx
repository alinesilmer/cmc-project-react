"use client";

import type React from "react";
import { useEffect, useMemo, useState, useRef } from "react";
import styles from "./UsersList.module.scss";
import { getJSON } from "../../lib/http";
import Button from "../../components/atoms/Button/Button";
import BackButton from "../../components/atoms/BackButton/BackButton";
import Modal from "../../components/atoms/Modal/Modal";
import FilterModal from "../../components/molecules/FilterModal/FilterModal";
import { useNavigate } from "react-router-dom";
import type { FilterSelection } from "../../types/filters";
import { initialFilters } from "../../types/filters";

import { useMedicosExport } from "./useMedicosExport";

type MedicoRow = Record<string, unknown>;

function normalizeBool(v: any): boolean {
  if (typeof v === "boolean") return v;
  if (typeof v === "number") return v !== 0;
  if (typeof v === "string") {
    const t = v.trim().toUpperCase();
    return ["1", "S", "SI", "TRUE", "T", "Y", "YES"].includes(t);
  }
  return false;
}

function isActiveRow(row: any): boolean {
  if (typeof row?.activo !== "undefined") return Boolean(Number(row.activo));
  const ex = (row?.EXISTE ?? row?.existe ?? "").toString().trim().toUpperCase();
  return ex === "S";
}

function normalizeAdherente(row: any): boolean | null {
  const raw = row?.adherente ?? row?.ES_ADHERENTE ?? row?.es_adherente;
  if (raw === null || typeof raw === "undefined" || raw === "") return null;
  return normalizeBool(raw);
}

function toUserRow(m: any) {
  const status = isActiveRow(m) ? "activo" : "inactivo";
  const a = normalizeAdherente(m);
  const os = (m?.obra_social ?? m?.OBRA_SOCIAL ?? "").toString().trim();

  return {
    id: m?.ID ?? m?.id ?? m?.NRO_SOCIO ?? Math.random().toString(36).slice(2),
    nro_socio: m?.NRO_SOCIO ?? m?.nro_socio ?? null,
    name: m?.NOMBRE ?? m?.nombre ?? "—",
    email: m?.mail_particular ?? m?.email ?? "—",
    phone: m?.tele_particular ?? "—",
    joinDate: m?.fecha_ingreso ?? m?.joinDate ?? null,
    status,
    matriculaProv: m?.MATRICULA_PROV ?? m?.matricula_prov ?? "—",
    adherente: a,
    obraSocial: os || "—",
  };
}

type UserRow = ReturnType<typeof toUserRow>;

const UsersList: React.FC = () => {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [rawUsers, setRawUsers] = useState<MedicoRow[]>([]);
  const [basePage, setBasePage] = useState<MedicoRow[]>([]); // ← guarda la primera página (sin q)
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [remoteMode, setRemoteMode] = useState(false); // ← si true: ya usamos resultados del backend para la búsqueda
  const navigate = useNavigate();

  const [error, setError] = useState<string | null>(null);

  const [isExportOpen, setIsExportOpen] = useState(false);

  // Export: usamos el hook
  const { exportLoading, exportError, setExportError, onExportWithFilters } =
    useMedicosExport();

  const [filters, setFilters] = useState<FilterSelection>(initialFilters);

  const resetFilters = () => {
    setFilters({
      columns: ["name", "documento", "mail_particular"], // ← si cambiás columnas, asegurate de tener "name"
      vencimientos: {
        malapraxisVencida: false,
        malapraxisPorVencer: false,
        anssalVencido: false,
        anssalPorVencer: false,
        coberturaVencida: false,
        coberturaPorVencer: false,
        fechaDesde: "",
        fechaHasta: "",
        dias: 30,
      },
      otros: {
        sexo: "",
        estado: "",
        adherente: "",
        provincia: "",
        localidad: "",
        especialidad: "",
        categoria: "",
        condicionImpositiva: "",
        fechaIngresoDesde: "",
        fechaIngresoHasta: "",
      },
    });
    setExportError(null);
  };

  const resetExportWizard = () => {
    setExportError(null);
  };

  // --------- Carga inicial (página base sin q) ----------
  useEffect(() => {
    let ignore = false;

    async function loadBase() {
      setLoading(true);
      setError(null);

      try {
        const data = await getJSON<MedicoRow[]>("/api/medicos?limit=200");
        if (ignore) return;
        setBasePage(data);
        setRawUsers(data);
        setUsers(data.map(toUserRow));
      } catch (err: any) {
        if (ignore) return;
        setError(err?.message || "Error al cargar los datos");
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    loadBase();
    return () => {
      ignore = true;
    };
  }, []);

  // --------- BÚSQUEDA REMOTA con debounce ----------
  const debounceRef = useRef<number | null>(null);
  useEffect(() => {
    const q = searchTerm.trim();

    // si q vacío → restauramos la página base sin pedir al backend
    if (!q) {
      setRemoteMode(false);
      setRawUsers(basePage);
      setUsers(basePage.map(toUserRow));
      return;
    }

    // para no saturar la API: mínimo 2 chars (ajustable)
    const MIN_CHARS = 2;
    if (q.length < MIN_CHARS) {
      setRemoteMode(false);
      setRawUsers(basePage);
      setUsers(basePage.map(toUserRow));
      return;
    }

    // debounce 300ms
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(async () => {
      try {
        // el endpoint ya soporta ?q y respeta limit<=200
        const url = `/api/medicos?q=${encodeURIComponent(q)}&limit=200`;
        const data = await getJSON<MedicoRow[]>(url);
        setRemoteMode(true);
        setRawUsers(data);
        setUsers(data.map(toUserRow));
      } catch (err) {
        // ante error, no rompas la UI: quedate con la base
        setRemoteMode(false);
        setRawUsers(basePage);
        setUsers(basePage.map(toUserRow));
      }
    }, 300);

    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, basePage]);

  // --------- Filtro local (solo si NO estamos en remoteMode) ----------
  const filteredUsers = useMemo(() => {
    if (remoteMode || !searchTerm.trim()) return users; // ya vienen del backend
    const s = searchTerm.toLowerCase();
    return users.filter(
      (u) =>
        u.name.toLowerCase().includes(s) ||
        u.email.toLowerCase().includes(s) ||
        String(u.nro_socio ?? "")
          .toLowerCase()
          .includes(s) ||
        String(u.matriculaProv ?? "")
          .toLowerCase()
          .includes(s)
    );
  }, [users, searchTerm, remoteMode]);

  const visibleUsers = filteredUsers;

  // Llama al hook para exportar; HTML/JSX queda intacto
  async function handleExportWithFilters(
    format: "xlsx" | "csv",
    logoFile: File | null
  ) {
    if (filters.columns.length === 0) {
      setExportError("Seleccioná al menos una columna");
      return;
    }
    const ok = await onExportWithFilters(format, filters, logoFile);
    if (ok) setIsExportOpen(false);
  }

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.emptyState}>
          <p>Cargando usuarios...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.emptyState}>
          <p>Error: {error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Usuarios</h1>
          <p className={styles.subtitle}>Gestión de médicos asociados</p>
        </div>
        <div className={styles.headerActions}>
          <BackButton />
          <Button
            variant="primary"
            onClick={() => navigate("/panel/register-socio")}
          >
            Agregar usuario
          </Button>
          <Button onClick={() => setIsExportOpen(true)}>
            Filtrar y Exportar
          </Button>
        </div>
      </div>

      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statValue}>{users.length}</div>
          <div className={styles.statLabel}>Total de usuarios</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statValue}>
            {users.filter((u) => u.status === "activo").length}
          </div>
          <div className={styles.statLabel}>Activos</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statValue}>{filteredUsers.length}</div>
          <div className={styles.statLabel}>Filtrados</div>
        </div>
      </div>

      <div className={styles.searchBar}>
        <input
          type="text"
          className={styles.searchInput}
          placeholder="Buscar por nombre, email, matrícula o número de socio..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {filteredUsers.length === 0 ? (
        <div className={styles.emptyState}>
          <p>No se encontraron usuarios</p>
        </div>
      ) : (
        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Nro. Socio</th>
                <th>Nombre</th>
                <th>Email</th>
                <th>Teléfono</th>
                <th>Matrícula</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {visibleUsers.map((user) => (
                <tr key={user.id}>
                  <td>{user.nro_socio ?? "—"}</td>
                  <td className={styles.nameCell}>{user.name}</td>
                  <td>{user.email}</td>
                  <td>{user.phone}</td>
                  <td>{user.matriculaProv}</td>
                  <td>
                    <span
                      className={
                        user.status === "activo"
                          ? styles.statusActive
                          : styles.statusInactive
                      }
                    >
                      {user.status}
                    </span>
                  </td>
                  <td>
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() => navigate(`/panel/doctors/${user.id}`)}
                      aria-label={`Ver más de ${user.name}`}
                    >
                      Ver más
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        title="Filtrar y descargar"
        size="large"
      >
        <FilterModal
          filters={filters}
          setFilters={setFilters}
          exportError={exportError}
          exportLoading={exportLoading}
          onExport={handleExportWithFilters}
          onClose={() => setIsExportOpen(false)}
          resetFilters={resetFilters}
        />
      </Modal>
    </div>
  );
};

export default UsersList;
