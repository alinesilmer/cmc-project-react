"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./UsersList.module.scss";
import { getJSON } from "../../lib/http";
import Button from "../../components/atoms/Button/Button";
import BackButton from "../../components/atoms/BackButton/BackButton";

const PAGE_SIZE = 50;

type MedicoRow = {
  id: number;
  nro_socio: number | null;
  nombre: string;
  mail_particular?: string | null;
  tele_particular?: string | null;
  fecha_ingreso?: string | null;
  MATRICULA_PROV?: string | number | null;
  EXISTE?: string | null;
  // TIPO_SOCIO?: string | null;
  // tipo_socio?: string | null;
  NRO_SOCIO?: number | null;
  TIPO?: string | null;
  tipo?: string | null;
  ES_ADHERENTE?: string | number | boolean | null;
  es_adherente?: string | number | boolean | null;
  adherente?: string | number | boolean | null;
  activo?: boolean | number; // <- llega 0/1 o bool
  existe?: string | null;
};

// Mapea un registro de tu API de médicos a la forma que usa la tabla
function toUserRow(m: MedicoRow | any) {
  // status desde backend (prioritario)
  const isActive =
    typeof m?.activo !== "undefined"
      ? Boolean(Number(m.activo))
      : (m?.EXISTE ?? m?.existe ?? "").toString().toUpperCase().trim() === "S";

  const status = isActive ? "activo" : "inactivo";

  return {
    id: m?.ID ?? m?.id ?? m?.NRO_SOCIO ?? Math.random().toString(36).slice(2),
    nro_socio: m?.NRO_SOCIO ?? m?.nro_socio ?? null,
    name: m?.NOMBRE ?? m?.nombre ?? "—",
    email: m?.mail_particular ?? m?.email ?? "—",
    phone: m?.tele_particular ?? "—",
    joinDate: m?.fecha_ingreso ?? m?.joinDate ?? null,
    status,
    matriculaProv: m?.MATRICULA_PROV ?? m?.matricula_prov ?? "—",
  };
}

type UserRow = ReturnType<typeof toUserRow>;

const UsersList: React.FC = () => {
  const navigate = useNavigate();

  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState("");

  // Paginación
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const skip = (page - 1) * PAGE_SIZE;

        const params = new URLSearchParams();
        params.set("limit", PAGE_SIZE.toString());
        params.set("skip", skip.toString());
        const q = searchTerm.trim();
        if (q) params.set("q", q);

        // La API devuelve un array simple de médicos
        const data = await getJSON<MedicoRow[]>(
          `/api/medicos?${params.toString()}`
        );

        const items = (data ?? []).map(toUserRow);

        if (!ignore) {
          setUsers(items);
          setHasMore(items.length === PAGE_SIZE);
        }
      } catch (e: any) {
        console.error(e);
        if (!ignore) {
          setUsers([]);
          setError("Error al cargar usuarios");
          setHasMore(false);
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    load();

    return () => {
      ignore = true;
    };
  }, [page, searchTerm]);

  // Ya no filtramos en memoria una lista gigante; el filtro va al backend (q)
  const filteredUsers = users;

  // Conteos reales para las cards
  const activeUsers = useMemo(
    () => users.filter((u) => u.status === "activo").length,
    [users]
  );
  const inactiveUsers = useMemo(
    () => users.filter((u) => u.status === "inactivo").length,
    [users]
  );

  return (
    <div className={styles.container}>
      <BackButton />
      <div className={styles.header}>
        <h1 className={styles.title}>Listado de Usuarios</h1>

        <div>
          <Button
            className={styles.backButton}
            onClick={() => navigate("/panel/register-socio")}
            style={{ marginLeft: 8 }}
            title="Crear socio (médico)"
          >
            + Agregar socio
          </Button>
        </div>
      </div>

      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <span className={styles.statValue}>{users.length}</span>
          <span className={styles.statLabel}>Total Usuarios (página)</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statValue}>{activeUsers}</span>
          <span className={styles.statLabel}>Activos</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statValue}>{inactiveUsers}</span>
          <span className={styles.statLabel}>Inactivos</span>
        </div>
      </div>

      <div className={styles.searchBar}>
        <input
          type="text"
          placeholder="Buscar por nombre o email..."
          value={searchTerm}
          onChange={(e) => {
            setPage(1); // al cambiar búsqueda, volvemos a la página 1
            setSearchTerm(e.target.value);
          }}
          className={styles.searchInput}
        />
      </div>

      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Nro Socio</th>
              <th>Nombre</th>
              <th>Email</th>
              <th>Teléfono</th>
              <th>Fecha de Ingreso</th>
              <th>Matrícula Provincial</th>
              <th style={{ width: 120 }}>Acciones</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} style={{ textAlign: "center", padding: 12 }}>
                  ⏳ Cargando…
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={7} style={{ textAlign: "center", padding: 12 }}>
                  {error}
                </td>
              </tr>
            ) : filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: "center", padding: 12 }}>
                  No se encontraron usuarios que coincidan con la búsqueda
                </td>
              </tr>
            ) : (
              filteredUsers.map((user) => (
                <tr key={user.id}>
                  <td>{user.nro_socio ?? "—"}</td>
                  <td className={styles.nameCell}>{user.name}</td>
                  <td>{user.email}</td>
                  <td>{user.phone}</td>
                  <td>
                    {user.joinDate && !user.joinDate.startsWith("0000")
                      ? new Date(user.joinDate).toLocaleDateString("es-AR")
                      : "—"}
                  </td>
                  <td>{user.matriculaProv ?? "—"}</td>
                  <td>
                    <Button
                      className={styles.backButton}
                      variant="primary"
                      type="button"
                      style={{ padding: "4px 8px", fontSize: 12 }}
                      title="Ver / editar"
                      onClick={() => {
                        const targetId = user.id ?? user.nro_socio;
                        if (targetId) navigate(`/panel/doctors/${targetId}`);
                      }}
                    >
                      Ver / editar
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Controles de paginación */}
      <div
        style={{
          display: "flex",
          gap: 8,
          justifyContent: "flex-end",
          marginTop: 12,
        }}
      >
        <Button
          className={styles.backButton}
          type="button"
          disabled={page === 1 || loading}
          onClick={() => setPage((p) => Math.max(1, p - 1))}
        >
          Anterior
        </Button>

        <span style={{ alignSelf: "center" }}>Página {page}</span>

        <Button
          className={styles.backButton}
          type="button"
          disabled={!hasMore || loading}
          onClick={() => setPage((p) => p + 1)}
        >
          Siguiente
        </Button>
      </div>

      {!loading && filteredUsers.length === 0 && !error && (
        <div className={styles.emptyState}>
          <p>No se encontraron usuarios que coincidan con la búsqueda</p>
        </div>
      )}
    </div>
  );
};

export default UsersList;
