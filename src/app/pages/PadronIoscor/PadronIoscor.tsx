"use client";

import { useState } from "react";
import Sidebar from "../../../components/molecules/Sidebar/Sidebar";
import Card from "../../../components/atoms/Card/Card";
import IoscorAffilliateForm, {
  type PracticeInput,
  type PracticeRowForEdit,
} from "../../../components/molecules/IoscorAffilliateForm/IoscorAffilliateForm";
import IoscorAffilliateTable, {
  type PracticeRow,
} from "../../../components/molecules/IoscorAffilliateTable/IoscorAffilliateTable";
import styles from "./PadronIoscor.module.scss";

/* Local padrón mock */
const FAKE_PADRON: Record<string, true> = {
  "77153522": true,
  "12345678": true,
  "30111222": true,
};

const seed: PracticeRow[] = [
  {
    id: "p1",
    dni: "77153522",
    isIoscor: true,
    obraSocCode: "304",
    obraSocName: "IOSCOR",
    codigo: "420101",
    cantidad: 1,
    fecha: new Date().toISOString().slice(0, 10),
    orderMode: "Auto",
    percHonorario: 100,
    percGasto: 0,
    percAyudante: 0,
  },
  {
    id: "p2",
    dni: "27715326",
    isIoscor: false,
    obraSocCode: "101",
    obraSocName: "OSDE",
    codigo: "331001",
    cantidad: 1,
    fecha: new Date().toISOString().slice(0, 10),
    orderMode: "Manual",
    orderNumber: "000123",
    percHonorario: 100,
    percGasto: 0,
    percAyudante: 0,
  },
];

export default function PadronIoscor() {
  const [rows, setRows] = useState<PracticeRow[]>(seed);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState<PracticeRowForEdit | null>(null);

  const handleCreate = async (p: PracticeInput) => {
    setLoading(true);
    await new Promise((r) => setTimeout(r, 250));
    const isIoscor = !!FAKE_PADRON[p.dni];

    const newRow: PracticeRow = {
      id: `${p.dni}-${Date.now()}`,
      dni: p.dni,
      isIoscor,
      obraSocCode: p.obraSocCode,
      obraSocName: p.obraSocName,
      codigo: p.codigo,
      cantidad: p.cantidad,
      fecha: p.fecha,
      orderMode: p.orderMode,
      orderNumber: p.orderNumber,
      percHonorario: p.markHonorario ? p.percHonorario : 0,
      percGasto: p.markGasto ? p.percGasto : 0,
      percAyudante: p.markAyudante ? p.percAyudante : 0,
    };

    setRows((prev) => [newRow, ...prev]);
    setLoading(false);
  };

  const handleUpdate = async (id: string, p: PracticeInput) => {
    setLoading(true);
    await new Promise((r) => setTimeout(r, 200));
    const isIoscor = !!FAKE_PADRON[p.dni];

    setRows((prev) =>
      prev.map((r) =>
        r.id === id
          ? {
              ...r,
              dni: p.dni,
              isIoscor,
              obraSocCode: p.obraSocCode,
              obraSocName: p.obraSocName,
              codigo: p.codigo,
              cantidad: p.cantidad,
              fecha: p.fecha,
              orderMode: p.orderMode,
              orderNumber: p.orderNumber,
              percHonorario: p.markHonorario ? p.percHonorario : 0,
              percGasto: p.markGasto ? p.percGasto : 0,
              percAyudante: p.markAyudante ? p.percAyudante : 0,
            }
          : r
      )
    );
    setEditing(null);
    setLoading(false);
  };

  const onEditRow = (row: PracticeRow) => {
    setEditing({
      id: row.id,
      dni: row.dni,
      isIoscor: row.isIoscor,
      obraSocCode: row.obraSocCode,
      obraSocName: row.obraSocName,
      codigo: row.codigo,
      cantidad: row.cantidad,
      fecha: row.fecha,
      orderMode: row.orderMode,
      orderNumber: row.orderNumber,
      percHonorario: row.percHonorario,
      percGasto: row.percGasto,
      percAyudante: row.percAyudante,
    });
  };

  const onDelete = (id: string) => {
    if (!confirm("¿Borrar registro?")) return;
    setRows((prev) => prev.filter((r) => r.id !== id));
  };

  return (
    <div className={styles.page}>
      <Sidebar />
      <main className={styles.content}>
        <Card className={styles.card}>
          <section className={styles.layout}>
            <div className={styles.left}>
              <IoscorAffilliateForm
                onCreate={handleCreate}
                onUpdate={handleUpdate}
                editingRow={editing}
                onCancelEdit={() => setEditing(null)}
                loading={loading}
              />
            </div>
            <div className={styles.right}>
              <IoscorAffilliateTable
                rows={rows}
                onEdit={onEditRow}
                onDelete={onDelete}
              />
            </div>
          </section>
        </Card>
      </main>
    </div>
  );
}
