import { useCallback, useEffect, useState } from "react";
import {
  Building2,
  Check,
  Eye,
  EyeOff,
  KeyRound,
  Landmark,
  Loader2,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Plus,
  Save,
  Trash2,
  X,
} from "lucide-react";

import { useNotify } from "../../hooks/useNotify";
import { mensajeDeError } from "../../lib/httpErrors";
import { usePermisos } from "../../auth/usePermisos";
import {
  addMail,
  addTelefono,
  deleteMail,
  deleteTelefono,
  getInstitucion,
  revelarPassword,
  savePassword,
  saveInstitucion,
  updateMail,
  updateTelefono,
} from "./institucion.api";
import {
  formatCbu,
  formatCuit,
  type EmailInput,
  type EmailInstitucion,
  type Institucion,
  type InstitucionInput,
  type TelefonoInput,
  type TelefonoInstitucion,
} from "./institucion.types";
import s from "./Institucion.module.scss";

/** Los campos del formulario general, en el orden en que se muestran. */
const CAMPOS: {
  key: keyof InstitucionInput;
  label: string;
  seccion: "fiscal" | "banco" | "domicilio" | "otros";
  ancho?: "full";
  placeholder?: string;
}[] = [
  { key: "razon_social", label: "Razón social", seccion: "fiscal", ancho: "full" },
  { key: "cuit", label: "CUIT", seccion: "fiscal", placeholder: "30-12345678-9" },
  { key: "condicion_iva", label: "Condición IVA", seccion: "fiscal" },

  { key: "cbu", label: "CBU", seccion: "banco", ancho: "full", placeholder: "22 dígitos" },
  { key: "alias_cbu", label: "Alias", seccion: "banco" },
  { key: "banco", label: "Banco", seccion: "banco" },
  { key: "titular_cuenta", label: "Titular", seccion: "banco", ancho: "full" },

  { key: "domicilio", label: "Domicilio", seccion: "domicilio", ancho: "full" },
  { key: "localidad", label: "Localidad", seccion: "domicilio" },

  { key: "sitio_web", label: "Sitio web", seccion: "otros", ancho: "full" },
  { key: "horario_atencion", label: "Horario de atención", seccion: "otros", ancho: "full" },
];

// `ingresos_brutos`, `provincia` y `codigo_postal` quedan fuera de la pantalla a
// pedido del Colegio: el Colegio es uno solo y está en Corrientes, así que la
// provincia y el CP no aportan nada, e Ingresos Brutos no se usa.
//
// Las columnas **siguen en la base y en la API**. Sacarlas sería una migración
// destructiva a cambio de nada, y si mañana hacen falta alcanza con volver a
// listarlas acá arriba. Por eso tampoco se mandan en el PUT: se copian de lo
// que ya estaba guardado (ver `aplicar`), en vez de viajar vacías y borrarlo.
const VACIO: InstitucionInput = {
  razon_social: "", cuit: "", condicion_iva: "", ingresos_brutos: null,
  cbu: "", alias_cbu: "", banco: "", titular_cuenta: "",
  domicilio: "", localidad: "", provincia: null, codigo_postal: null,
  sitio_web: "", horario_atencion: "", notas: "",
};

const TEL_VACIO: TelefonoInput = { etiqueta: "", numero: "", notas: "" };
const MAIL_VACIO: EmailInput = {
  etiqueta: "", direccion: "", servidor_entrante: "", servidor_saliente: "", notas: "",
};

/**
 * Datos del Colegio: CUIT, CBU, domicilio, teléfonos y casillas de correo.
 *
 * La contraseña nunca llega en el listado: la API devuelve `tiene_password` y
 * el texto se pide de a una, con un click que queda auditado. Por eso el ojo
 * dispara un request en vez de mostrar algo que ya estaba en memoria.
 */
export default function InstitucionPage() {
  const { error: avisarError, success: avisarOk } = useNotify();
  const { can } = usePermisos();
  const puedeEditar = can("catalogo:editar");

  // Quién ve las contraseñas lo decide el backend con una lista nominal, no un
  // scope: hoy son dos personas del Colegio, y ser admin no alcanza.
  const [datos, setDatos] = useState<Institucion | null>(null);
  const puedeVerClaves = Boolean(datos?.puede_ver_claves);
  const [form, setForm] = useState<InstitucionInput>(VACIO);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [sucio, setSucio] = useState(false);

  const [telNuevo, setTelNuevo] = useState<TelefonoInput | null>(null);
  const [telEditando, setTelEditando] = useState<TelefonoInstitucion | null>(null);
  const [mailNuevo, setMailNuevo] = useState<EmailInput | null>(null);
  const [mailEditando, setMailEditando] = useState<EmailInstitucion | null>(null);

  /** Claves ya reveladas en esta sesión de pantalla, por id de casilla. */
  const [reveladas, setReveladas] = useState<Record<number, string>>({});
  const [revelando, setRevelando] = useState<number | null>(null);
  const [claveDe, setClaveDe] = useState<EmailInstitucion | null>(null);
  const [claveNueva, setClaveNueva] = useState("");

  const aplicar = useCallback((d: Institucion) => {
    setDatos(d);
    setForm({
      razon_social: d.razon_social ?? "", cuit: d.cuit ?? "",
      condicion_iva: d.condicion_iva ?? "",
      cbu: d.cbu ?? "", alias_cbu: d.alias_cbu ?? "", banco: d.banco ?? "",
      titular_cuenta: d.titular_cuenta ?? "",
      domicilio: d.domicilio ?? "", localidad: d.localidad ?? "",
      sitio_web: d.sitio_web ?? "", horario_atencion: d.horario_atencion ?? "",
      notas: d.notas ?? "",
      // Los tres que la pantalla ya no muestra viajan tal cual estaban: el PUT
      // reemplaza todos los campos, así que omitirlos los borraría.
      ingresos_brutos: d.ingresos_brutos ?? null,
      provincia: d.provincia ?? null,
      codigo_postal: d.codigo_postal ?? null,
    });
    setSucio(false);
  }, []);

  useEffect(() => {
    getInstitucion()
      .then(aplicar)
      .catch(() => avisarError("No se pudieron cargar los datos del Colegio."))
      .finally(() => setCargando(false));
  }, [aplicar, avisarError]);

  const guardar = async () => {
    if (guardando) return;
    setGuardando(true);
    try {
      aplicar(await saveInstitucion(form));
      avisarOk("Datos guardados.");
    } catch (err) {
      avisarError(mensajeDeError(err, "No se pudieron guardar los datos."));
    } finally {
      setGuardando(false);
    }
  };

  /** Recarga la ficha entera tras tocar un teléfono o una casilla. */
  const recargar = () => getInstitucion().then(setDatos).catch(() => {});

  // ── Teléfonos ──────────────────────────────────────────────────────────────

  const guardarTel = async (body: TelefonoInput, id?: number) => {
    if (!body.numero.trim()) return;
    try {
      await (id ? updateTelefono(id, body) : addTelefono(body));
      setTelNuevo(null);
      setTelEditando(null);
      await recargar();
      avisarOk(id ? "Teléfono actualizado." : "Teléfono agregado.");
    } catch (err) {
      avisarError(mensajeDeError(err, "No se pudo guardar el teléfono."));
    }
  };

  const borrarTel = async (t: TelefonoInstitucion) => {
    try {
      await deleteTelefono(t.id);
      await recargar();
      avisarOk("Teléfono eliminado.");
    } catch (err) {
      avisarError(mensajeDeError(err, "No se pudo eliminar el teléfono."));
    }
  };

  // ── Casillas ───────────────────────────────────────────────────────────────

  const guardarMail = async (body: EmailInput, id?: number) => {
    if (!body.direccion.trim()) return;
    try {
      await (id ? updateMail(id, body) : addMail(body));
      setMailNuevo(null);
      setMailEditando(null);
      await recargar();
      avisarOk(id ? "Casilla actualizada." : "Casilla agregada.");
    } catch (err) {
      avisarError(mensajeDeError(err, "No se pudo guardar la casilla."));
    }
  };

  const borrarMail = async (m: EmailInstitucion) => {
    try {
      await deleteMail(m.id);
      setReveladas((prev) => {
        const { [m.id]: _, ...resto } = prev;
        return resto;
      });
      await recargar();
      avisarOk("Casilla eliminada.");
    } catch (err) {
      avisarError(mensajeDeError(err, "No se pudo eliminar la casilla."));
    }
  };

  const alternarClave = async (m: EmailInstitucion) => {
    if (reveladas[m.id] !== undefined) {
      // Ocultar es sacarla de memoria, no sólo dejar de dibujarla: si el
      // usuario la escondió, no tiene por qué seguir en el estado de React.
      setReveladas((prev) => {
        const { [m.id]: _, ...resto } = prev;
        return resto;
      });
      return;
    }
    setRevelando(m.id);
    try {
      const { password } = await revelarPassword(m.id);
      setReveladas((prev) => ({ ...prev, [m.id]: password }));
    } catch (err) {
      avisarError(mensajeDeError(err, "No se pudo mostrar la contraseña."));
    } finally {
      setRevelando(null);
    }
  };

  const guardarClave = async () => {
    if (!claveDe) return;
    try {
      await savePassword(claveDe.id, claveNueva.trim() || null);
      setClaveDe(null);
      setClaveNueva("");
      setReveladas((prev) => {
        const { [claveDe.id]: _, ...resto } = prev;
        return resto;
      });
      await recargar();
      avisarOk(claveNueva.trim() ? "Contraseña guardada." : "Contraseña eliminada.");
    } catch (err) {
      avisarError(mensajeDeError(err, "No se pudo guardar la contraseña."));
    }
  };

  const campo = (key: keyof InstitucionInput) => (
    <input
      className={s.input}
      value={(form[key] as string) ?? ""}
      disabled={!puedeEditar}
      placeholder={CAMPOS.find((c) => c.key === key)?.placeholder}
      onChange={(e) => {
        setForm((f) => ({ ...f, [key]: e.target.value }));
        setSucio(true);
      }}
    />
  );

  const seccion = (
    id: "fiscal" | "banco" | "domicilio" | "otros",
    titulo: string,
    Icono: typeof Building2
  ) => (
    <section className={s.card}>
      <h2 className={s.cardTitle}>
        <Icono size={16} /> {titulo}
      </h2>
      <div className={s.grid}>
        {CAMPOS.filter((c) => c.seccion === id).map((c) => (
          <label
            key={c.key}
            className={`${s.field} ${c.ancho === "full" ? s.fieldFull : ""}`}
          >
            <span className={s.label}>{c.label}</span>
            {campo(c.key)}
            {/* El valor formateado va debajo del input y no adentro: adentro
                habría que reformatear en cada tecla y el cursor salta. */}
            {c.key === "cuit" && form.cuit ? (
              <span className={s.hint}>{formatCuit(form.cuit)}</span>
            ) : null}
            {c.key === "cbu" && form.cbu ? (
              <span className={s.hint}>{formatCbu(form.cbu)}</span>
            ) : null}
          </label>
        ))}
      </div>
    </section>
  );

  if (cargando) {
    return (
      <div className={s.container}>
        <div className={s.loading}>
          <Loader2 size={18} className={s.spin} /> Cargando…
        </div>
      </div>
    );
  }

  return (
    <div className={s.container}>
      <header className={s.header}>
        <Building2 size={30} className={s.headerIcon} />
        <div>
          <h1 className={s.title}>Colegio Médico de Corrientes</h1>
          <p className={s.subtitle}>Datos institucionales, contactos y casillas.</p>
        </div>
        {puedeEditar && (
          <button
            type="button"
            className={s.primaryBtn}
            onClick={guardar}
            disabled={!sucio || guardando}
          >
            {guardando ? <Loader2 size={15} className={s.spin} /> : <Save size={15} />}
            {guardando ? "Guardando…" : "Guardar"}
          </button>
        )}
      </header>

      {seccion("fiscal", "Datos fiscales", Building2)}
      {seccion("banco", "Cuenta bancaria", Landmark)}
      {seccion("domicilio", "Domicilio", MapPin)}
      {seccion("otros", "Contacto", Building2)}

      <section className={s.card}>
        <h2 className={s.cardTitle}>
          <Building2 size={16} /> Notas
        </h2>
        <textarea
          className={s.textarea}
          rows={3}
          value={form.notas ?? ""}
          disabled={!puedeEditar}
          onChange={(e) => {
            setForm((f) => ({ ...f, notas: e.target.value }));
            setSucio(true);
          }}
        />
      </section>

      {/* ── Teléfonos ── */}
      <section className={s.card}>
        <h2 className={s.cardTitle}>
          <Phone size={16} /> Teléfonos
          {puedeEditar && (
            <button
              type="button"
              className={s.addBtn}
              onClick={() => setTelNuevo({ ...TEL_VACIO })}
            >
              <Plus size={14} /> Agregar
            </button>
          )}
        </h2>

        <ul className={s.list}>
          {datos?.telefonos.map((t) =>
            telEditando?.id === t.id ? (
              <li key={t.id} className={s.rowEdit}>
                <input
                  className={s.input}
                  placeholder="Etiqueta"
                  value={telEditando.etiqueta ?? ""}
                  onChange={(e) =>
                    setTelEditando({ ...telEditando, etiqueta: e.target.value })
                  }
                />
                <input
                  className={s.input}
                  placeholder="Número"
                  value={telEditando.numero}
                  onChange={(e) =>
                    setTelEditando({ ...telEditando, numero: e.target.value })
                  }
                />
                <div className={s.rowActions}>
                  <button
                    type="button"
                    className={s.iconOk}
                    onClick={() =>
                      guardarTel(
                        {
                          etiqueta: telEditando.etiqueta,
                          numero: telEditando.numero,
                          notas: telEditando.notas,
                        },
                        telEditando.id
                      )
                    }
                  >
                    <Check size={15} />
                  </button>
                  <button
                    type="button"
                    className={s.iconBtn}
                    onClick={() => setTelEditando(null)}
                  >
                    <X size={15} />
                  </button>
                </div>
              </li>
            ) : (
              <li key={t.id} className={s.row}>
                <span className={s.rowTag}>{t.etiqueta || "Teléfono"}</span>
                <span className={s.rowMain}>{t.numero}</span>
                {puedeEditar && (
                  <div className={s.rowActions}>
                    <button
                      type="button"
                      className={s.iconBtn}
                      onClick={() => setTelEditando(t)}
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      type="button"
                      className={s.iconDanger}
                      onClick={() => borrarTel(t)}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                )}
              </li>
            )
          )}

          {telNuevo && (
            <li className={s.rowEdit}>
              <input
                className={s.input}
                placeholder="Etiqueta"
                value={telNuevo.etiqueta ?? ""}
                onChange={(e) => setTelNuevo({ ...telNuevo, etiqueta: e.target.value })}
              />
              <input
                className={s.input}
                placeholder="Número"
                autoFocus
                value={telNuevo.numero}
                onChange={(e) => setTelNuevo({ ...telNuevo, numero: e.target.value })}
              />
              <div className={s.rowActions}>
                <button
                  type="button"
                  className={s.iconOk}
                  onClick={() => guardarTel(telNuevo)}
                  disabled={!telNuevo.numero.trim()}
                >
                  <Check size={15} />
                </button>
                <button type="button" className={s.iconBtn} onClick={() => setTelNuevo(null)}>
                  <X size={15} />
                </button>
              </div>
            </li>
          )}

          {!datos?.telefonos.length && !telNuevo && (
            <li className={s.empty}>Sin teléfonos cargados.</li>
          )}
        </ul>
      </section>

      {/* ── Casillas de correo ── */}
      <section className={s.card}>
        <h2 className={s.cardTitle}>
          <Mail size={16} /> Casillas de correo
          {puedeEditar && (
            <button
              type="button"
              className={s.addBtn}
              onClick={() => setMailNuevo({ ...MAIL_VACIO })}
            >
              <Plus size={14} /> Agregar
            </button>
          )}
        </h2>

        {datos && !datos.secretos_disponibles && (
          <p className={s.aviso}>
            El servidor no tiene configurada la llave de cifrado, así que no se
            pueden guardar contraseñas. Los demás datos funcionan normalmente.
          </p>
        )}

        <ul className={s.list}>
          {datos?.emails.map((m) =>
            mailEditando?.id === m.id ? (
              <li key={m.id} className={s.rowEditMail}>
                <input
                  className={s.input}
                  placeholder="Etiqueta"
                  value={mailEditando.etiqueta ?? ""}
                  onChange={(e) =>
                    setMailEditando({ ...mailEditando, etiqueta: e.target.value })
                  }
                />
                <input
                  className={s.input}
                  placeholder="direccion@colegio.com"
                  value={mailEditando.direccion}
                  onChange={(e) =>
                    setMailEditando({ ...mailEditando, direccion: e.target.value })
                  }
                />
                <input
                  className={s.input}
                  placeholder="Entrante (IMAP/POP)"
                  value={mailEditando.servidor_entrante ?? ""}
                  onChange={(e) =>
                    setMailEditando({ ...mailEditando, servidor_entrante: e.target.value })
                  }
                />
                <input
                  className={s.input}
                  placeholder="Saliente (SMTP)"
                  value={mailEditando.servidor_saliente ?? ""}
                  onChange={(e) =>
                    setMailEditando({ ...mailEditando, servidor_saliente: e.target.value })
                  }
                />
                <div className={s.rowActions}>
                  <button
                    type="button"
                    className={s.iconOk}
                    onClick={() =>
                      guardarMail(
                        {
                          etiqueta: mailEditando.etiqueta,
                          direccion: mailEditando.direccion,
                          servidor_entrante: mailEditando.servidor_entrante,
                          servidor_saliente: mailEditando.servidor_saliente,
                          notas: mailEditando.notas,
                        },
                        mailEditando.id
                      )
                    }
                  >
                    <Check size={15} />
                  </button>
                  <button
                    type="button"
                    className={s.iconBtn}
                    onClick={() => setMailEditando(null)}
                  >
                    <X size={15} />
                  </button>
                </div>
              </li>
            ) : (
              <li key={m.id} className={s.rowMail}>
                <div className={s.mailMain}>
                  <span className={s.rowTag}>{m.etiqueta || "Casilla"}</span>
                  <span className={s.mailAddr}>{m.direccion}</span>
                  {(m.servidor_entrante || m.servidor_saliente) && (
                    <span className={s.mailServers}>
                      {[m.servidor_entrante, m.servidor_saliente].filter(Boolean).join(" · ")}
                    </span>
                  )}
                </div>

                <div className={s.mailPass}>
                  {puedeVerClaves && m.tiene_password ? (
                    <>
                      <code className={s.clave}>
                        {reveladas[m.id] ?? "••••••••"}
                      </code>
                      <button
                        type="button"
                        className={s.iconBtn}
                        title={reveladas[m.id] ? "Ocultar" : "Mostrar"}
                        onClick={() => alternarClave(m)}
                        disabled={revelando === m.id}
                      >
                        {revelando === m.id ? (
                          <Loader2 size={14} className={s.spin} />
                        ) : reveladas[m.id] ? (
                          <EyeOff size={14} />
                        ) : (
                          <Eye size={14} />
                        )}
                      </button>
                    </>
                  ) : m.tiene_password ? (
                    <span className={s.claveOculta}>Con contraseña</span>
                  ) : (
                    <span className={s.claveVacia}>Sin contraseña</span>
                  )}
                </div>

                <div className={s.rowActions}>
                  {puedeVerClaves && datos?.secretos_disponibles && (
                    <button
                      type="button"
                      className={s.iconBtn}
                      title="Cambiar contraseña"
                      onClick={() => {
                        setClaveDe(m);
                        setClaveNueva("");
                      }}
                    >
                      <KeyRound size={14} />
                    </button>
                  )}
                  {puedeEditar && (
                    <>
                      <button
                        type="button"
                        className={s.iconBtn}
                        onClick={() => setMailEditando(m)}
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        type="button"
                        className={s.iconDanger}
                        onClick={() => borrarMail(m)}
                      >
                        <Trash2 size={14} />
                      </button>
                    </>
                  )}
                </div>
              </li>
            )
          )}

          {mailNuevo && (
            <li className={s.rowEditMail}>
              <input
                className={s.input}
                placeholder="Etiqueta"
                value={mailNuevo.etiqueta ?? ""}
                onChange={(e) => setMailNuevo({ ...mailNuevo, etiqueta: e.target.value })}
              />
              <input
                className={s.input}
                placeholder="direccion@colegio.com"
                autoFocus
                value={mailNuevo.direccion}
                onChange={(e) => setMailNuevo({ ...mailNuevo, direccion: e.target.value })}
              />
              <input
                className={s.input}
                placeholder="Entrante (IMAP/POP)"
                value={mailNuevo.servidor_entrante ?? ""}
                onChange={(e) =>
                  setMailNuevo({ ...mailNuevo, servidor_entrante: e.target.value })
                }
              />
              <input
                className={s.input}
                placeholder="Saliente (SMTP)"
                value={mailNuevo.servidor_saliente ?? ""}
                onChange={(e) =>
                  setMailNuevo({ ...mailNuevo, servidor_saliente: e.target.value })
                }
              />
              <div className={s.rowActions}>
                <button
                  type="button"
                  className={s.iconOk}
                  onClick={() => guardarMail(mailNuevo)}
                  disabled={!mailNuevo.direccion.trim()}
                >
                  <Check size={15} />
                </button>
                <button type="button" className={s.iconBtn} onClick={() => setMailNuevo(null)}>
                  <X size={15} />
                </button>
              </div>
            </li>
          )}

          {!datos?.emails.length && !mailNuevo && (
            <li className={s.empty}>Sin casillas cargadas.</li>
          )}
        </ul>
      </section>

      {/* Cambio de contraseña. Va en un diálogo aparte y no inline con la
          edición de la casilla porque son dos permisos distintos: quien edita
          la dirección no necesariamente puede tocar la clave. */}
      {claveDe && (
        <div className={s.overlay} onClick={() => setClaveDe(null)}>
          <div className={s.modal} onClick={(e) => e.stopPropagation()}>
            <h3 className={s.modalTitle}>
              <KeyRound size={16} /> Contraseña de {claveDe.direccion}
            </h3>
            <input
              className={s.input}
              type="text"
              autoFocus
              placeholder="Nueva contraseña"
              value={claveNueva}
              onChange={(e) => setClaveNueva(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && guardarClave()}
            />
            <p className={s.modalHint}>
              Se guarda cifrada. Dejalo vacío para borrarla.
            </p>
            <div className={s.modalActions}>
              <button type="button" className={s.ghostBtn} onClick={() => setClaveDe(null)}>
                Cancelar
              </button>
              <button type="button" className={s.primaryBtn} onClick={guardarClave}>
                <Save size={15} /> Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
