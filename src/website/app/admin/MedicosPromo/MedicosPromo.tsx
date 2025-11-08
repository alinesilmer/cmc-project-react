// website/src/website/app/admin/medicos/MedicosPromo.tsx
import { useEffect, useRef, useState } from "react";
import { medicosPromo } from "../../../lib/api";
import type { MedicoPromo, MedicoPromoCreate, MediaType } from "../../../lib/api";
import styles from "./MedicosPromo.module.scss";
import Button from "../../../components/UI/Button/Button";

const empty: MedicoPromoCreate = {
  nombre: "",
  especialidad: "",
  mediaUrl: "",
  mediaType: "image",
  orden: 1,
  activo: true,
};

export default function AdminMedicosPromo() {
  const [rows, setRows] = useState<MedicoPromo[]>([]);
  const [form, setForm] = useState<MedicoPromoCreate>(empty);
  const [editingId, setEditingId] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const token = localStorage.getItem("token") ?? "";

  const fetchRows = async () => {
    const data = await medicosPromo.list({ all: true }, token);
    setRows(data);
    if (!editingId) {
      const maxOrden = data.reduce((a, b) => Math.max(a, b.orden), 0);
      setForm((f) => ({ ...f, orden: Math.max(1, maxOrden + 1) }));
    }
  };

  useEffect(() => {
    fetchRows();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startEdit = (row: MedicoPromo) => {
    setEditingId(row.id);
    setForm({
      nombre: row.nombre,
      especialidad: row.especialidad,
      mediaUrl: row.mediaUrl ?? "",
      mediaType: row.mediaType ?? "image",
      orden: row.orden,
      activo: row.activo,
    });
    setErr("");
  };

  const cancel = () => {
    setEditingId(null);
    setForm(empty);
    setErr("");
    if (fileRef.current) fileRef.current.value = "";
  };

  const onUpload = async (file: File) => {
    const { url, mimetype } = await medicosPromo.upload(token, file);
    const isVideo = mimetype.startsWith("video/");
    setForm((f) => ({ ...f, mediaUrl: url, mediaType: isVideo ? "video" : "image" }));
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setErr("");
      if (editingId) await medicosPromo.update(token, editingId, form);
      else await medicosPromo.create(token, form);
      await fetchRows();
      cancel();
    } catch (e: any) {
      setErr(e?.message || "Error");
    } finally {
      setLoading(false);
    }
  };

  const onDelete = async (id: string) => {
    if (!confirm("¿Eliminar este médico promocionado?")) return;
    try {
      setLoading(true);
      await medicosPromo.remove(token, id);
      if (editingId === id) cancel();
      await fetchRows();
    } catch (e: any) {
      alert(e?.message || "Error al eliminar");
    } finally {
      setLoading(false);
    }
  };

  const toggleActivo = async (row: MedicoPromo) => {
    try {
      await medicosPromo.update(token, row.id, { activo: !row.activo });
      await fetchRows();
    } catch (e: any) {
      alert(e?.message || "Error");
    }
  };

  const bump = async (row: MedicoPromo, dir: -1 | 1) => {
    const targetOrden = row.orden + dir;
    const swap = rows.find((r) => r.orden === targetOrden);
    if (!swap) return;
    await medicosPromo.update(token, row.id, { orden: targetOrden });
    await medicosPromo.update(token, swap.id, { orden: row.orden });
    await fetchRows();
  };

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        {/* <h2>“Nuestros médicos asociados” — Carrusel (máx. 10 activos)</h2> */}
        
      </div>

      

      <form className={styles.form} onSubmit={onSubmit}>
        <input
          type="text"
          placeholder="Nombre"
          value={form.nombre}
          onChange={(e) => setForm({ ...form, nombre: e.target.value })}
          required
        />
        <input
          type="text"
          placeholder="Especialidad"
          value={form.especialidad}
          onChange={(e) => setForm({ ...form, especialidad: e.target.value })}
          required
        />
        <input
          type="number"
          placeholder="Orden"
          value={form.orden}
          onChange={(e) => setForm({ ...form, orden: Number(e.target.value) })}
          min={1}
        />
        <select
          value={form.mediaType}
          onChange={(e) => setForm({ ...form, mediaType: e.target.value as MediaType })}
        >
          <option value="image">Imagen</option>
          <option value="video">Video</option>
        </select>

        <input
          className="wide"
          type="url"
          placeholder="URL de media (opcional si subís archivo)"
          value={form.mediaUrl}
          onChange={(e) => setForm({ ...form, mediaUrl: e.target.value })}
        />

        <div className="wide" style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <input
            ref={fileRef}
            type="file"
            accept="image/*,video/*"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onUpload(f);
            }}
          />
          {form.mediaUrl && <small>Media: {form.mediaUrl}</small>}
        </div>

        <label>
          <input
            type="checkbox"
            checked={form.activo}
            onChange={(e) => setForm({ ...form, activo: e.target.checked })}
          />{" "}
          Activo
        </label>

        {err && <div style={{ color: "crimson" }}>{err}</div>}

        <div className="wide" style={{ display: "flex", gap: 12 }}>
          <Button size="medium" variant="outline" type="submit" disabled={loading}>
            {editingId ? "Actualizar" : "Crear"}
          </Button>
          <Button size="medium" variant="outline" type="button" onClick={cancel}>
            Cancelar
          </Button>
        </div>
      </form>
    </div>
  );
}
