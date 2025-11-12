import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  FiTrash2,
  FiEdit,
  FiSave,
  FiSearch,
  FiUpload,
  FiX,
} from "react-icons/fi";
import Button from "../../../components/UI/Button/Button";
import styles from "./MedicosPromo.module.scss";
import type { PubAd, DoctorLite } from "../../../lib/ads.client";
import {
  listAds,
  createAd,
  updateAd,
  removeAd,
  searchDoctors,
} from "../../../lib/ads.client";

export default function AdminMedicosPromo() {
  const [ads, setAds] = useState<PubAd[]>([]);
  const [loading, setLoading] = useState(true);

  // Crear
  const [medicoQuery, setMedicoQuery] = useState("");
  const [searchResults, setSearchResults] = useState<DoctorLite[]>([]);
  const [selectedDoctor, setSelectedDoctor] = useState<DoctorLite | null>(null);
  const [activoNew, setActivoNew] = useState(true);
  const [fileNew, setFileNew] = useState<File | null>(null);
  const fileNewRef = useRef<HTMLInputElement>(null);

  // Edición inline
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editDoctorQuery, setEditDoctorQuery] = useState("");
  const [editSearchResults, setEditSearchResults] = useState<DoctorLite[]>([]);
  const [editSelectedDoctor, setEditSelectedDoctor] =
    useState<DoctorLite | null>(null);
  const [editActivo, setEditActivo] = useState<boolean>(true);
  const [editFile, setEditFile] = useState<File | null>(null);
  const editFileRef = useRef<HTMLInputElement>(null);

  // ---- carga inicial
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const data = await listAds();
        setAds(data);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // ---- búsqueda de médicos (crear)
  useEffect(() => {
    const q = medicoQuery.trim();
    let cancel = false;
    (async () => {
      if (!q) {
        setSearchResults([]);
        return;
      }
      try {
        const res = await searchDoctors(q);
        if (!cancel) setSearchResults(res);
      } catch {
        if (!cancel) setSearchResults([]);
      }
    })();
    return () => {
      cancel = true;
    };
  }, [medicoQuery]);

  // ---- búsqueda de médicos (editar)
  useEffect(() => {
    if (!editingId) return;
    const q = editDoctorQuery.trim();
    let cancel = false;
    (async () => {
      if (!q) {
        setEditSearchResults([]);
        return;
      }
      try {
        const res = await searchDoctors(q);
        if (!cancel) setEditSearchResults(res);
      } catch {
        if (!cancel) setEditSearchResults([]);
      }
    })();
    return () => {
      cancel = true;
    };
  }, [editDoctorQuery, editingId]);

  const previewNew = useMemo(
    () => (fileNew ? URL.createObjectURL(fileNew) : ""),
    [fileNew]
  );
  const previewEdit = useMemo(
    () => (editFile ? URL.createObjectURL(editFile) : ""),
    [editFile]
  );

  useEffect(
    () => () => {
      if (previewNew) URL.revokeObjectURL(previewNew);
    },
    [previewNew]
  );
  useEffect(
    () => () => {
      if (previewEdit) URL.revokeObjectURL(previewEdit);
    },
    [previewEdit]
  );

  // ---- crear publicidad
  const onCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDoctor) {
      alert("Selecciona un médico");
      return;
    }
    if (!fileNew) {
      alert("Subí una imagen");
      return;
    }
    try {
      const created = await createAd(
        { medico_id: selectedDoctor.id, activo: activoNew },
        fileNew
      );
      setAds((prev) => [created, ...prev]);
      // reset
      setSelectedDoctor(null);
      setMedicoQuery("");
      setActivoNew(true);
      setFileNew(null);
      if (fileNewRef.current) fileNewRef.current.value = "";
    } catch (e) {
      console.error(e);
      alert("No se pudo crear la publicidad");
    }
  };

  // ---- eliminar publicidad
  const onDelete = async (ad: PubAd) => {
    if (!confirm("¿Eliminar esta publicidad?")) return;
    await removeAd(ad.id);
    setAds((prev) => prev.filter((x) => x.id !== ad.id));
  };

  // ---- activar edición
  const startEdit = (ad: PubAd) => {
    setEditingId(ad.id);
    setEditDoctorQuery("");
    setEditSearchResults([]);
    setEditSelectedDoctor(null);
    setEditActivo(ad.activo);
    setEditFile(null);
    if (editFileRef.current) editFileRef.current.value = "";
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditDoctorQuery("");
    setEditSearchResults([]);
    setEditSelectedDoctor(null);
    setEditFile(null);
    if (editFileRef.current) editFileRef.current.value = "";
  };

  // ---- guardar edición
  const saveEdit = async (ad: PubAd) => {
    try {
      const fields: any = {};
      if (editSelectedDoctor) fields.medico_id = editSelectedDoctor.id;
      if (typeof editActivo === "boolean") fields.activo = editActivo;
      const updated = await updateAd(ad.id, fields, editFile || undefined);
      setAds((prev) => prev.map((x) => (x.id === ad.id ? updated : x)));
      cancelEdit();
    } catch (e) {
      console.error(e);
      alert("No se pudo actualizar");
    }
  };

  // ---- toggle activo rápido
  const toggleActivo = async (ad: PubAd) => {
    try {
      const updated = await updateAd(ad.id, { activo: !ad.activo });
      setAds((prev) => prev.map((x) => (x.id === ad.id ? updated : x)));
    } catch (e) {
      console.error(e);
      alert("No se pudo cambiar el estado");
    }
  };

  return (
    <div className={styles.wrap}>
      {/* Formulario de creación */}
      <section className={styles.formSection}>
        <h2>Agregar publicidad de médico</h2>
        <form onSubmit={onCreate} className={styles.form}>
          {/* Buscar y seleccionar médico */}
          <div className={styles.row}>
            <label>Médico</label>
            <div className={styles.searchWrap}>
              <FiSearch />
              <input
                type="search"
                placeholder="Buscar..."
                value={medicoQuery}
                onChange={(e) => setMedicoQuery(e.target.value)}
              />
            </div>

            {selectedDoctor ? (
              <div className={styles.selectedDoctor}>
                <span>{selectedDoctor.nombre}</span>
                <button type="button" onClick={() => setSelectedDoctor(null)}>
                  <FiX />
                </button>
              </div>
            ) : (
              medicoQuery &&
              searchResults.length > 0 && (
                <div className={styles.dropdown}>
                  {searchResults.map((d) => (
                    <button
                      type="button"
                      key={d.id}
                      className={styles.dropdownItem}
                      onClick={() => {
                        setSelectedDoctor(d);
                        setMedicoQuery(d.nombre);
                        setSearchResults([]);
                      }}
                    >
                      {d.nombre}
                      {d.nro_socio ? ` · Socio ${d.nro_socio}` : ""}
                      {d.documento ? ` · DNI ${d.documento}` : ""}
                      {d.matricula_prov ? ` · MP ${d.matricula_prov}` : ""}
                    </button>
                  ))}
                </div>
              )
            )}
          </div>

          {/* Activo */}
          <div className={styles.rowInline}>
            <label className={styles.switchLabel}>
              <input
                type="checkbox"
                checked={activoNew}
                onChange={(e) => setActivoNew(e.target.checked)}
              />
              <span>Activo</span>
            </label>
          </div>

          {/* Archivo */}
          <div className={styles.row}>
            <label>Imagen</label>
            <div className={styles.fileRow}>
              <Button
                type="button"
                variant="outline"
                size="medium"
                onClick={() => fileNewRef.current?.click()}
              >
                <FiUpload /> Subir imagen
              </Button>
              <input
                ref={fileNewRef}
                type="file"
                accept="image/*"
                hidden
                onChange={(e) => setFileNew(e.target.files?.[0] || null)}
              />
              {fileNew && (
                <span className={styles.filename}>{fileNew.name}</span>
              )}
            </div>
            {fileNew && (
              <div className={styles.preview}>
                <img src={previewNew} alt="preview" />
              </div>
            )}
          </div>

          <div className={styles.actions}>
            <Button type="submit" variant="primary" size="medium">
              Guardar publicidad
            </Button>
          </div>
        </form>
      </section>

      {/* Listado de cards */}
      <section className={styles.listSection}>
        <h2>Publicidades</h2>
        {loading ? (
          <p>Cargando…</p>
        ) : ads.length === 0 ? (
          <p>No hay publicidades.</p>
        ) : (
          <div className={styles.cards}>
            {ads.map((ad) => (
              <motion.div
                key={ad.id}
                className={styles.card}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div className={styles.thumb}>
                  {ad.adjunto_path ? (
                    <img
                      src={ad.adjunto_path}
                      alt={ad.medico_nombre || String(ad.medico_id)}
                    />
                  ) : (
                    <div className={styles.placeholder}>Sin imagen</div>
                  )}
                </div>

                <div className={styles.body}>
                  <div className={styles.title}>
                    {ad.medico_nombre || `Médico #${ad.medico_id}`}
                  </div>

                  {editingId === ad.id ? (
                    <>
                      {/* cambiar médico */}
                      <div className={styles.row}>
                        <label>Cambiar médico</label>
                        <div className={styles.searchWrap}>
                          <FiSearch />
                          <input
                            type="search"
                            placeholder="Buscar…"
                            value={editDoctorQuery}
                            onChange={(e) => setEditDoctorQuery(e.target.value)}
                          />
                        </div>
                        {editDoctorQuery && editSearchResults.length > 0 && (
                          <div className={styles.dropdown}>
                            {editSearchResults.map((d) => (
                              <button
                                type="button"
                                key={d.id}
                                className={styles.dropdownItem}
                                onClick={() => {
                                  setEditSelectedDoctor(d);
                                  setEditDoctorQuery(d.nombre);
                                  setEditSearchResults([]);
                                }}
                              >
                                {d.nombre}
                              </button>
                            ))}
                          </div>
                        )}
                        {editSelectedDoctor && (
                          <div className={styles.selectedDoctor}>
                            <span>{editSelectedDoctor.nombre}</span>
                            <button
                              type="button"
                              onClick={() => setEditSelectedDoctor(null)}
                            >
                              <FiX />
                            </button>
                          </div>
                        )}
                      </div>

                      {/* cambiar activo */}
                      <div className={styles.rowInline}>
                        <label className={styles.switchLabel}>
                          <input
                            type="checkbox"
                            checked={!!editActivo}
                            onChange={(e) => setEditActivo(e.target.checked)}
                          />
                          <span>Activo</span>
                        </label>
                      </div>

                      {/* reemplazar imagen */}
                      <div className={styles.row}>
                        <label>Reemplazar imagen</label>
                        <div className={styles.fileRow}>
                          <Button
                            variant="outline"
                            size="small"
                            onClick={() => editFileRef.current?.click()}
                          >
                            <FiUpload /> Subir
                          </Button>
                          <input
                            ref={editFileRef}
                            type="file"
                            accept="image/*"
                            hidden
                            onChange={(e) =>
                              setEditFile(e.target.files?.[0] || null)
                            }
                          />
                          {editFile && (
                            <span className={styles.filename}>
                              {editFile.name}
                            </span>
                          )}
                        </div>
                        {editFile && (
                          <div className={styles.preview}>
                            <img src={previewEdit} alt="preview" />
                          </div>
                        )}
                      </div>

                      <div className={styles.cardActions}>
                        <Button
                          variant="primary"
                          size="small"
                          onClick={() => saveEdit(ad)}
                        >
                          <FiSave /> Guardar
                        </Button>
                        <Button
                          variant="outline"
                          size="small"
                          onClick={cancelEdit}
                        >
                          Cancelar
                        </Button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className={styles.statusRow}>
                        <label className={styles.switchLabel}>
                          <input
                            type="checkbox"
                            checked={!!ad.activo}
                            onChange={() => toggleActivo(ad)}
                          />
                          <span>{ad.activo ? "Activo" : "Inactivo"}</span>
                        </label>
                      </div>

                      <div className={styles.cardActions}>
                        <Button
                          variant="outline"
                          size="small"
                          onClick={() => startEdit(ad)}
                        >
                          <FiEdit /> Editar
                        </Button>
                        <Button
                          variant="outline"
                          size="small"
                          onClick={() => onDelete(ad)}
                        >
                          <FiTrash2 /> Eliminar
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
