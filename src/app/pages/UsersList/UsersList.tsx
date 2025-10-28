"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./UsersList.module.scss";
import { getJSON } from "../../../lib/http";
import Button from "../../../components/atoms/Button/Button";
import BackButton from "../../../components/atoms/BackButton/BackButton";

const PAGE_SIZE = 50;

async function fetchPaged<T>(endpoint: string): Promise<T[]> {
  const all: T[] = [];
  let skip = 0;
  while (true) {
    // Tu API usa limit/skip = 50 por página
    const page = await getJSON<T[]>(`${endpoint}?limit=${PAGE_SIZE}&skip=${skip}`);
    if (!Array.isArray(page) || page.length === 0) break;
    all.push(...page);
    if (page.length < PAGE_SIZE) break;
    skip += PAGE_SIZE;
  }
  return all;
}

// Mapea un registro de tu API de médicos a la forma que usa la tabla
function toUserRow(m: any) {
  // Reglas robustas para "Tipo de Socio":
  // 1) Si existe un campo textual con "adherente" => Adherente
  // 2) Si hay flags tipo ES_ADHERENTE (S/true/1) => Adherente
  // 3) En caso contrario => Socio (por defecto), para evitar falsos adherentes
  const tipoRaw =
    (m?.TIPO_SOCIO ??
      m?.tipo_socio ??
      m?.TIPO ??
      m?.tipo ??
      "").toString().toLowerCase();
  const esAdherenteTexto = tipoRaw.includes("adherente");

  const flag = (m?.ES_ADHERENTE ?? m?.es_adherente ?? m?.adherente ?? "")
    .toString()
    .toLowerCase()
    .trim();
  const esAdherenteFlag =
    flag === "s" || flag === "1" || flag === "true" || flag === "si";

  const memberType = esAdherenteTexto || esAdherenteFlag ? "Socio Adherente" : "Socio";

  // Estado para las cards (activo/inactivo) según EXISTE o status
  const existe =
    (m?.EXISTE ?? m?.existe ?? "").toString().toUpperCase().trim() === "S";
  const status = existe ? "activo" : "inactivo";

  return {
    id: m?.ID ?? m?.id ?? m?.NRO_SOCIO ?? Math.random().toString(36).slice(2),
    name: m?.NOMBRE ?? m?.nombre ?? "—",
    email: m?.mail_particular ?? m?.email ?? "—",
    phone:
      m?.CELULAR ??
      m?.tele_particular ??
      m?.telefono ??
      m?.phone ??
      "—",
    memberType, // "Socio" | "Socio Adherente"
    joinDate: m?.fecha_ingreso ?? m?.joinDate ?? null,
    status, // "activo" | "inactivo" (solo para cards)
    matriculaProv: m?.MATRICULA_PROV ?? m?.matricula_prov ?? "—",
  };
}

const UsersList: React.FC = () => {
  const navigate = useNavigate();

  // Cambiamos mock por datos reales (sin tocar tus clases/estructura)
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    let ignore = false;
    (async () => {
      try {
        setLoading(true);
        const medicos = await fetchPaged("/api/medicos");
        const rows = medicos.map(toUserRow);
        if (!ignore) setUsers(rows);
      } catch (e) {
        console.error(e);
        if (!ignore) setUsers([]);
      } finally {
        if (!ignore) setLoading(false);
      }
    })();
    return () => {
      ignore = true;
    };
  }, []);

  const filteredUsers = useMemo(() => {
    const t = searchTerm.trim().toLowerCase();
    if (!t) return users;
    return users.filter((u) => {
      const name = (u.name ?? "").toLowerCase();
      const email = (u.mail ?? "").toLowerCase();
      return name.includes(t) || email.includes(t);
    });
  }, [users, searchTerm]);

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
          {/* Botones extra, reusando la misma clase para no tocar estilos */}
          <Button
            className={styles.backButton}
            onClick={() => navigate("/register-socio")}
            style={{ marginLeft: 8 }}
            title="Crear socio (médico)"
          >
            + Agregar socio
          </Button>
          {/* <button
            className={styles.backButton}
            onClick={() => navigate("/adherente")}
            style={{ marginLeft: 8 }}
            title="Crear socio adherente"
          >
            + Agregar adherente
          </button> */}
        </div>
      </div>

      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <span className={styles.statValue}>{users.length}</span>
          <span className={styles.statLabel}>Total Usuarios</span>
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
          onChange={(e) => setSearchTerm(e.target.value)}
          className={styles.searchInput}
        />
      </div>

      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Email</th>
              <th>Teléfono</th>
              <th>Tipo de Socio</th>
              <th>Fecha de Ingreso</th>
              <th>Matrícula Provincial</th>
              <th style={{ width: 120 }}>Acciones</th> {/* ← NUEVO */}
            </tr>
          </thead>

          <tbody>
            {/* Loader centrado mientras carga, manteniendo headers */}
            {loading ? (
              <tr>
                <td colSpan={7} style={{ textAlign: "center", padding: 12 }}>
                  ⏳ Cargando…
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
                  <td className={styles.nameCell}>{user.name}</td>
                  <td>{user.email}</td>
                  <td>{user.phone}</td>
                  <td>
                    <span className={styles.memberTypeBadge}>
                      {user.memberType}
                    </span>
                  </td>
                  <td>
                    {user.joinDate
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
                        if (targetId) navigate(`/doctors/${targetId}`);
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

      {!loading && filteredUsers.length === 0 && (
        <div className={styles.emptyState}>
          <p>No se encontraron usuarios que coincidan con la búsqueda</p>
        </div>
      )}
    </div>
  );
};

export default UsersList;
