"use client";
import React, { useMemo, useState } from "react";
import styles from "./Config.module.scss";

type TabKey = "perfil" | "tareas" | "notificaciones" | "actividad";

type ActivityEntry = {
  id: string;
  at: string;
  action: "login" | "logout" | "create" | "update" | "delete" | "download";
  entity: string;
  by: string;
  ip: string;
  meta?: string;
};

type Task = {
  id: string;
  title: string;
  due?: string;
  assignee?: string;
  status: "todo" | "in_progress" | "done";
};

const TABS: { key: TabKey; label: string; badge?: number }[] = [
  { key: "perfil", label: "Perfil" },
  { key: "tareas", label: "Tareas", badge: 2 },
  { key: "notificaciones", label: "Notificaciones", badge: 3 },
  { key: "actividad", label: "Actividad" },
];

const MOCK_ACTIVITY: ActivityEntry[] = [
  {
    id: "a1",
    at: "2025-10-08T22:15:00Z",
    action: "login",
    entity: "Sesión",
    by: "admin@cmc.com",
    ip: "181.12.34.5",
    meta: "2FA aprobado",
  },
  {
    id: "a2",
    at: "2025-10-08T22:22:00Z",
    action: "update",
    entity: "Perfil de médico",
    by: "admin@cmc.com",
    ip: "181.12.34.5",
    meta: "Actualizó especialidad",
  },
  {
    id: "a3",
    at: "2025-10-07T16:10:00Z",
    action: "create",
    entity: "Período de liquidación",
    by: "admin@cmc.com",
    ip: "181.12.34.5",
    meta: "Octubre 2025",
  },
  {
    id: "a4",
    at: "2025-10-06T09:41:00Z",
    action: "download",
    entity: "Padrón IOSCOR CSV",
    by: "admin@cmc.com",
    ip: "181.12.34.5",
  },
  {
    id: "a5",
    at: "2025-10-05T23:05:00Z",
    action: "logout",
    entity: "Sesión",
    by: "admin@cmc.com",
    ip: "181.12.34.5",
  },
];

const ACTION_ES: Record<ActivityEntry["action"], string> = {
  login: "Ingreso",
  logout: "Salida",
  create: "Creación",
  update: "Actualización",
  delete: "Eliminación",
  download: "Descarga",
};

const Config: React.FC = () => {
  const [tab, setTab] = useState<TabKey>("perfil");

  const [firstName, setFirst] = useState("Ana");
  const [lastName, setLast] = useState("Pérez");
  const [email, setEmail] = useState("admin@cmc.com");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState("Administrativo/a");
  const [area, setArea] = useState("Facturación");
  const [site, setSite] = useState("Casa Central");
  const [timezone, setTimezone] = useState("America/Argentina/Buenos_Aires");
  const [language, setLanguage] = useState("Español");
  const [profileStatus, setProfileStatus] = useState<null | {
    type: "ok" | "err";
    msg: string;
  }>(null);
  const canSaveProfile = firstName.trim() && lastName.trim() && email.trim();

  const [tasks, setTasks] = useState<Task[]>([
    {
      id: "t1",
      title: "Validar padrón IOSCOR",
      due: "2025-10-12",
      assignee: "Ana",
      status: "in_progress",
    },
    {
      id: "t2",
      title: "Cerrar período de liquidación",
      due: "2025-10-14",
      assignee: "Contabilidad",
      status: "todo",
    },
  ]);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDue, setNewTaskDue] = useState("");
  const [newTaskAssignee, setNewTaskAssignee] = useState("");
  const [taskStatus, setTaskStatus] = useState<null | {
    type: "ok" | "err";
    msg: string;
  }>(null);

  const [notifPrefs, setNotifPrefs] = useState({
    emailPeriodos: true,
    emailSeguridad: true,
    emailRechazos: true,
    appMenciones: true,
    appVencimientos: true,
    appCambiosEstado: false,
  });
  const [notifStatus, setNotifStatus] = useState<null | {
    type: "ok" | "err";
    msg: string;
  }>(null);

  const [q, setQ] = useState("");
  const [range, setRange] = useState<"7d" | "30d" | "all">("7d");

  const activityRows = useMemo(() => {
    const now = new Date();
    const minDate =
      range === "all"
        ? new Date(0)
        : new Date(now.getTime() - (range === "7d" ? 7 : 30) * 86400000);

    return MOCK_ACTIVITY.filter((r) => {
      const d = new Date(r.at);
      const inRange = d >= minDate && d <= now;
      const txt = `${r.action} ${r.entity} ${r.by} ${r.ip} ${
        r.meta || ""
      }`.toLowerCase();
      const matches = txt.includes(q.toLowerCase());
      return inRange && matches;
    }).sort((a, b) => +new Date(b.at) - +new Date(a.at));
  }, [q, range]);

  return (
    <div className={styles.wrap}>
      <div className={styles.cover} />
      <div className={styles.container}>
        <div className={styles.headerRow}>
          <div>
            <h1 className={styles.title}>Configuración</h1>
            <p className={styles.sub}>{email}</p>
          </div>
          <button className={styles.btnGhost}>Ver perfil</button>
        </div>

        <div className={styles.tabs}>
          {TABS.map((t) => (
            <button
              key={t.key}
              className={`${styles.tab} ${tab === t.key ? styles.active : ""}`}
              onClick={() => setTab(t.key)}
            >
              <span>{t.label}</span>
              {typeof t.badge === "number" && t.badge > 0 && (
                <span className={styles.badge}>{t.badge}</span>
              )}
            </button>
          ))}
        </div>

        {tab === "perfil" && (
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Perfil</h2>
            <p className={styles.sectionSub}>
              Datos del usuario administrativo para gestionar obras sociales,
              facturación y liquidación.
            </p>

            {profileStatus && (
              <div
                className={`${styles.alert} ${
                  profileStatus.type === "ok" ? styles.ok : styles.err
                }`}
              >
                {profileStatus.msg}
              </div>
            )}

            <form
              className={`${styles.form} ${styles.formCols}`}
              onSubmit={(e) => {
                e.preventDefault();
                if (!canSaveProfile) {
                  setProfileStatus({
                    type: "err",
                    msg: "Completá los campos obligatorios.",
                  });
                } else {
                  setProfileStatus({ type: "ok", msg: "Perfil actualizado." });
                }
              }}
            >
              <div className={styles.group}>
                <label className={styles.label}>Nombre</label>
                <input
                  className={styles.input}
                  value={firstName}
                  onChange={(e) => setFirst(e.target.value)}
                />
              </div>
              <div className={styles.group}>
                <label className={styles.label}>Apellido</label>
                <input
                  className={styles.input}
                  value={lastName}
                  onChange={(e) => setLast(e.target.value)}
                />
              </div>
              <div className={styles.group}>
                <label className={styles.label}>Correo electrónico</label>
                <input
                  className={styles.input}
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className={styles.group}>
                <label className={styles.label}>Teléfono</label>
                <input
                  className={styles.input}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
              <div className={styles.group}>
                <label className={styles.label}>Rol</label>
                <select
                  className={styles.input}
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                >
                  <option>Administrativo/a</option>
                  <option>Auditor/a</option>
                  <option>Contabilidad</option>
                </select>
              </div>
              <div className={styles.group}>
                <label className={styles.label}>Área</label>
                <select
                  className={styles.input}
                  value={area}
                  onChange={(e) => setArea(e.target.value)}
                >
                  <option>Facturación</option>
                  <option>Liquidación</option>
                  <option>Mesa de Entradas</option>
                  <option>Auditoría Médica</option>
                </select>
              </div>
              <div className={styles.group}>
                <label className={styles.label}>Sucursal</label>
                <select
                  className={styles.input}
                  value={site}
                  onChange={(e) => setSite(e.target.value)}
                >
                  <option>Casa Central</option>
                  <option>Hospital de Día</option>
                  <option>Clínica Centro</option>
                </select>
              </div>
              <div className={styles.group}>
                <label className={styles.label}>Zona horaria</label>
                <select
                  className={styles.input}
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                >
                  <option>America/Argentina/Buenos_Aires</option>
                  <option>America/Argentina/Cordoba</option>
                  <option>America/Montevideo</option>
                </select>
              </div>
              <div className={styles.groupWide}>
                <label className={styles.label}>Idioma</label>
                <select
                  className={styles.input}
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                >
                  <option>Español</option>
                  <option>Inglés</option>
                  <option>Portugués</option>
                </select>
              </div>

              <div className={styles.actions}>
                <button type="button" className={styles.btnGhost}>
                  Cancelar
                </button>
                <button
                  className={styles.btnPrimary}
                  disabled={!canSaveProfile}
                >
                  Guardar cambios
                </button>
              </div>
            </form>
          </section>
        )}

        {tab === "tareas" && (
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Tareas</h2>
            <p className={styles.sectionSub}>
              Seguimiento del trabajo administrativo (padrones, facturas y
              períodos).
            </p>

            {taskStatus && (
              <div
                className={`${styles.alert} ${
                  taskStatus.type === "ok" ? styles.ok : styles.err
                }`}
              >
                {taskStatus.msg}
              </div>
            )}

            <form
              className={`${styles.form} ${styles.formCols}`}
              onSubmit={(e) => {
                e.preventDefault();
                if (!newTaskTitle.trim()) {
                  setTaskStatus({
                    type: "err",
                    msg: "El título es obligatorio.",
                  });
                  return;
                }
                setTasks((prev) => [
                  ...prev,
                  {
                    id: `t${Date.now()}`,
                    title: newTaskTitle,
                    due: newTaskDue || undefined,
                    assignee: newTaskAssignee || undefined,
                    status: "todo",
                  },
                ]);
                setNewTaskTitle("");
                setNewTaskAssignee("");
                setNewTaskDue("");
                setTaskStatus({ type: "ok", msg: "Tarea creada." });
              }}
            >
              <div className={styles.groupWide}>
                <label className={styles.label}>Título</label>
                <input
                  className={styles.input}
                  placeholder="Ej: Emitir remitos PAMI, Confeccionar lote IOSCOR…"
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                />
              </div>
              <div className={styles.group}>
                <label className={styles.label}>Vence</label>
                <input
                  className={styles.input}
                  type="date"
                  value={newTaskDue}
                  onChange={(e) => setNewTaskDue(e.target.value)}
                />
              </div>
              <div className={styles.group}>
                <label className={styles.label}>Asignado a</label>
                <input
                  className={styles.input}
                  value={newTaskAssignee}
                  onChange={(e) => setNewTaskAssignee(e.target.value)}
                />
              </div>
              <div className={styles.actions}>
                <button
                  type="button"
                  className={styles.btnGhost}
                  onClick={() => {
                    setNewTaskTitle("");
                    setNewTaskAssignee("");
                    setNewTaskDue("");
                  }}
                >
                  Limpiar
                </button>
                <button className={styles.btnPrimary}>Agregar tarea</button>
              </div>
            </form>

            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Tarea</th>
                    <th>Vencimiento</th>
                    <th>Responsable</th>
                    <th>Estado</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {tasks.length === 0 && (
                    <tr>
                      <td colSpan={5} className={styles.empty}>
                        Sin tareas.
                      </td>
                    </tr>
                  )}
                  {tasks.map((t) => (
                    <tr key={t.id}>
                      <td>{t.title}</td>
                      <td>
                        {t.due ? new Date(t.due).toLocaleDateString() : "-"}
                      </td>
                      <td>{t.assignee || "-"}</td>
                      <td>
                        <select
                          className={styles.selectInline}
                          value={t.status}
                          onChange={(e) =>
                            setTasks((prev) =>
                              prev.map((x) =>
                                x.id === t.id
                                  ? {
                                      ...x,
                                      status: e.target.value as Task["status"],
                                    }
                                  : x
                              )
                            )
                          }
                        >
                          <option value="todo">Por hacer</option>
                          <option value="in_progress">En progreso</option>
                          <option value="done">Hecha</option>
                        </select>
                      </td>
                      <td>
                        <button
                          className={styles.btnLink}
                          onClick={() =>
                            setTasks((prev) =>
                              prev.filter((x) => x.id !== t.id)
                            )
                          }
                        >
                          Quitar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {tab === "notificaciones" && (
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Notificaciones</h2>
            <p className={styles.sectionSub}>
              Elegí cómo querés recibir avisos del sistema (obras sociales,
              facturación y seguridad).
            </p>

            {notifStatus && (
              <div
                className={`${styles.alert} ${
                  notifStatus.type === "ok" ? styles.ok : styles.err
                }`}
              >
                {notifStatus.msg}
              </div>
            )}

            <form
              className={styles.form}
              onSubmit={(e) => {
                e.preventDefault();
                setNotifStatus({ type: "ok", msg: "Preferencias guardadas." });
              }}
            >
              <div className={styles.prefGroup}>
                <h3 className={styles.prefTitle}>Correo electrónico</h3>
                <label className={styles.checkRow}>
                  <input
                    type="checkbox"
                    checked={notifPrefs.emailPeriodos}
                    onChange={(e) =>
                      setNotifPrefs((p) => ({
                        ...p,
                        emailPeriodos: e.target.checked,
                      }))
                    }
                  />
                  <span>Cierres de período y liquidación</span>
                </label>
                <label className={styles.checkRow}>
                  <input
                    type="checkbox"
                    checked={notifPrefs.emailSeguridad}
                    onChange={(e) =>
                      setNotifPrefs((p) => ({
                        ...p,
                        emailSeguridad: e.target.checked,
                      }))
                    }
                  />
                  <span>Alertas de seguridad</span>
                </label>
                <label className={styles.checkRow}>
                  <input
                    type="checkbox"
                    checked={notifPrefs.emailRechazos}
                    onChange={(e) =>
                      setNotifPrefs((p) => ({
                        ...p,
                        emailRechazos: e.target.checked,
                      }))
                    }
                  />
                  <span>Rechazos de facturas/OS</span>
                </label>
              </div>

              <div className={styles.prefGroup}>
                <h3 className={styles.prefTitle}>Dentro de la app</h3>
                <label className={styles.checkRow}>
                  <input
                    type="checkbox"
                    checked={notifPrefs.appMenciones}
                    onChange={(e) =>
                      setNotifPrefs((p) => ({
                        ...p,
                        appMenciones: e.target.checked,
                      }))
                    }
                  />
                  <span>Menciones</span>
                </label>
                <label className={styles.checkRow}>
                  <input
                    type="checkbox"
                    checked={notifPrefs.appVencimientos}
                    onChange={(e) =>
                      setNotifPrefs((p) => ({
                        ...p,
                        appVencimientos: e.target.checked,
                      }))
                    }
                  />
                  <span>Recordatorios de vencimientos</span>
                </label>
                <label className={styles.checkRow}>
                  <input
                    type="checkbox"
                    checked={notifPrefs.appCambiosEstado}
                    onChange={(e) =>
                      setNotifPrefs((p) => ({
                        ...p,
                        appCambiosEstado: e.target.checked,
                      }))
                    }
                  />
                  <span>Cambios de estado (facturas, lotes, órdenes)</span>
                </label>
              </div>

              <div className={styles.actions}>
                <button type="button" className={styles.btnGhost}>
                  Cancelar
                </button>
                <button className={styles.btnPrimary}>
                  Guardar preferencias
                </button>
              </div>
            </form>
          </section>
        )}

        {tab === "actividad" && (
          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Actividad</h2>
              <div className={styles.tools}>
                <input
                  className={styles.search}
                  placeholder="Buscar actividad"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                />
                <select
                  className={styles.select}
                  value={range}
                  onChange={(e) =>
                    setRange(e.target.value as "7d" | "30d" | "all")
                  }
                >
                  <option value="7d">Últimos 7 días</option>
                  <option value="30d">Últimos 30 días</option>
                  <option value="all">Todo</option>
                </select>
                <button className={styles.btnGhost}>Exportar CSV</button>
              </div>
            </div>

            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Acción</th>
                    <th>Elemento</th>
                    <th>Usuario</th>
                    <th>IP</th>
                    <th>Detalles</th>
                  </tr>
                </thead>
                <tbody>
                  {activityRows.length === 0 && (
                    <tr>
                      <td colSpan={6} className={styles.empty}>
                        Sin resultados.
                      </td>
                    </tr>
                  )}
                  {activityRows.map((r) => (
                    <tr key={r.id}>
                      <td>{new Date(r.at).toLocaleString()}</td>
                      <td>
                        <span
                          className={`${styles.pill} ${
                            styles[`a_${r.action}`]
                          }`}
                        >
                          {ACTION_ES[r.action]}
                        </span>
                      </td>
                      <td>{r.entity}</td>
                      <td>{r.by}</td>
                      <td>{r.ip}</td>
                      <td className={styles.meta}>{r.meta || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>
    </div>
  );
};

export default Config;
