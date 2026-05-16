"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { Upload, X, FileSpreadsheet } from "lucide-react";

import styles from "./ImportarValoresCSV.module.scss";
import Button from "../../components/atoms/Button/Button";

// ── Types ─────────────────────────────────────────────────────────────────────

type ImportedRow = {
  nro: number;
  nombre: string;
  valor: number;
  fechaCambio: string | null;
  galenoQuirurgico: number;
  galenoPractica: number;
  galenoRadiologico: number;
  galenoCirugiaAdultos: number;
  galenoCirugiaInfantil: number;
  gastosQuirurgicos: number;
  gastosRadiologico: number;
  gastosBioquimicos: number;
  otrosGastos: number;
};

// ── CSV parsing ───────────────────────────────────────────────────────────────

function safeNum(raw: string): number {
  if (!raw) return 0;
  let s = raw.trim();
  if (s.includes(",") && !s.includes(".")) s = s.replace(",", ".");
  else if (/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(s))
    s = s.replace(/\./g, "").replace(",", ".");
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}

function parseLine(line: string): string[] {
  const result: string[] = [];
  let cur = "";
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQ && line[i + 1] === '"') { cur += '"'; i++; }
      else inQ = !inQ;
    } else if ((ch === "," || ch === ";") && !inQ) {
      result.push(cur.trim());
      cur = "";
    } else {
      cur += ch;
    }
  }
  result.push(cur.trim());
  return result;
}

function parseCsv(text: string): ImportedRow[] {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length < 2)
    throw new Error("El archivo debe tener encabezados y al menos una fila de datos.");

  const headers = parseLine(lines[0]).map((h) =>
    h.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "")
  );

  const col = (row: string[], ...keys: string[]) => {
    for (const k of keys) {
      const idx = headers.indexOf(k);
      if (idx !== -1 && row[idx] !== undefined) return row[idx];
    }
    return "";
  };

  const rows: ImportedRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const row = parseLine(lines[i]);
    const nro = parseInt(col(row, "nro_obrasocial", "nro", "numero", "id"), 10);
    if (!nro || isNaN(nro)) continue;
    rows.push({
      nro,
      nombre: col(row, "obra_social", "nombre", "name") || `OS ${nro}`,
      valor: safeNum(col(row, "valor", "honorarios_a", "importe", "consulta")),
      fechaCambio: col(row, "fecha_cambio", "fecha", "date") || null,
      galenoQuirurgico: safeNum(col(row, "galeno_quirurgico", "quirurgico")),
      galenoPractica: safeNum(col(row, "galeno_practica", "practica")),
      galenoRadiologico: safeNum(col(row, "galeno_radiologico", "radiologico")),
      galenoCirugiaAdultos: safeNum(col(row, "galeno_cirugia_adultos", "cirugia_adultos")),
      galenoCirugiaInfantil: safeNum(col(row, "galeno_cirugia_infantil", "cirugia_infantil")),
      gastosQuirurgicos: safeNum(col(row, "gastos_quirurgicos")),
      gastosRadiologico: safeNum(col(row, "gastos_radiologico")),
      gastosBioquimicos: safeNum(col(row, "gastos_bioquimicos")),
      otrosGastos: safeNum(col(row, "otros_gastos")),
    });
  }

  if (rows.length === 0)
    throw new Error(
      "No se encontraron filas válidas. Verificá que la columna nro_obrasocial esté presente y que los datos sean correctos."
    );
  return rows;
}

const money = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  minimumFractionDigits: 2,
});

const fmt = (v: number) => money.format(Number.isFinite(v) ? v : 0);

const PRESET_CODES = [
  { label: "Consulta Común", code: "420351" },
  { label: "Consulta Especial", code: "420353" },
  { label: "Swiss Medical", code: "42010100" },
];

// ── Component ─────────────────────────────────────────────────────────────────

export default function ImportarValoresCSV() {
  const [codigo, setCodigo] = useState("");
  const [rows, setRows] = useState<ImportedRow[] | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [filterNro, setFilterNro] = useState<number | "">("");
  const [isDragging, setIsDragging] = useState(false);
  const [applied, setApplied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((file: File) => {
    setApplied(false);
    setParseError(null);
    setRows(null);
    setFilterNro("");
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        setRows(parseCsv(e.target?.result as string));
      } catch (err) {
        setParseError(err instanceof Error ? err.message : "No se pudo leer el archivo.");
      }
    };
    reader.onerror = () => setParseError("Error al leer el archivo.");
    reader.readAsText(file, "UTF-8");
  }, []);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
      e.target.value = "";
    },
    [handleFile]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleClear = useCallback(() => {
    setRows(null);
    setParseError(null);
    setFilterNro("");
    setApplied(false);
  }, []);

  const preview = useMemo(() => {
    if (!rows) return [];
    if (!filterNro) return rows;
    return rows.filter((r) => r.nro === filterNro);
  }, [rows, filterNro]);

  return (
    <div className={styles.container}>
      {/* ── Header ── */}
      <section className={styles.panel}>
        <div className={styles.panelTop}>
          <div>
            <h2 className={styles.panelTitle}>Actualizar valores CSV</h2>
            <p className={styles.panelDescription}>
              Cargue un archivo <strong>CSV</strong> con los nuevos valores para
              cualquier código de práctica. El sistema parsea las columnas y
              muestra una vista previa de los cambios antes de aplicarlos.
            </p>
          </div>
        </div>

        {/* ── Código selector ── */}
        <div className={styles.codigoSection}>
          <label className={styles.codigoLabel} htmlFor="import-codigo">
            Código de práctica
          </label>
          <div className={styles.codigoRow}>
            <input
              id="import-codigo"
              className={styles.codigoInput}
              type="text"
              placeholder="Ej: 420351"
              value={codigo}
              onChange={(e) => setCodigo(e.target.value.trim())}
              maxLength={20}
            />
            <div className={styles.presetRow}>
              {PRESET_CODES.map((p) => (
                <button
                  key={p.code}
                  className={`${styles.presetBtn} ${codigo === p.code ? styles.presetBtnActive : ""}`}
                  onClick={() => setCodigo(p.code)}
                  type="button"
                >
                  {p.label}
                  <span className={styles.presetCode}>{p.code}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── Column legend ── */}
        <div className={styles.legend}>
          <span className={styles.legendTitle}>Columnas esperadas en el CSV</span>
          <div className={styles.legendCols}>
            {["nro_obrasocial", "valor"].map((c) => (
              <code key={c} className={styles.colRequired}>{c}</code>
            ))}
            {[
              "obra_social", "fecha_cambio",
              "galeno_quirurgico", "galeno_practica", "galeno_radiologico",
              "galeno_cirugia_adultos", "galeno_cirugia_infantil",
              "gastos_quirurgicos", "gastos_radiologico",
              "gastos_bioquimicos", "otros_gastos",
            ].map((c) => (
              <code key={c} className={styles.colOptional}>{c}</code>
            ))}
          </div>
          <p className={styles.legendNote}>
            Separador: coma <code>,</code> o punto y coma <code>;</code> · UTF-8 ·{" "}
            <span className={styles.colRequired}>requeridas</span>{" "}
            <span className={styles.colOptional}>opcionales</span>
          </p>
        </div>
      </section>

      {/* ── Upload / Preview ── */}
      <section className={styles.panel}>
        {!rows ? (
          <>
            <div
              className={`${styles.dropzone} ${isDragging ? styles.dropzoneActive : ""}`}
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === "Enter" && fileInputRef.current?.click()}
            >
              <FileSpreadsheet className={styles.dropzoneIcon} size={32} />
              <span className={styles.dropzoneTitle}>
                Arrastrá tu archivo CSV o hacé clic para seleccionarlo
              </span>
              <span className={styles.dropzoneHint}>.csv · coma o punto y coma · UTF-8</span>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.txt"
                style={{ display: "none" }}
                onChange={handleInputChange}
              />
            </div>

            {parseError && (
              <div className={styles.errorBox}>{parseError}</div>
            )}
          </>
        ) : (
          <>
            {/* Preview bar */}
            <div className={styles.previewBar}>
              <div className={styles.previewBarLeft}>
                <Upload size={16} className={styles.previewBarIcon} />
                <span className={styles.previewCount}>
                  {rows.length} {rows.length === 1 ? "fila" : "filas"} detectadas
                </span>
                {codigo && (
                  <span className={styles.codigoBadge}>
                    Código: <strong>{codigo}</strong>
                  </span>
                )}
                {applied && (
                  <span className={styles.appliedBadge}>
                    ✓ Listo · pendiente conexión con backend
                  </span>
                )}
              </div>

              <div className={styles.previewBarRight}>
                <select
                  className={styles.filterSelect}
                  value={filterNro}
                  onChange={(e) =>
                    setFilterNro(e.target.value ? Number(e.target.value) : "")
                  }
                >
                  <option value="">Todas las obras sociales</option>
                  {rows.map((r) => (
                    <option key={r.nro} value={r.nro}>
                      {r.nro} · {r.nombre}
                    </option>
                  ))}
                </select>

                <button className={styles.clearBtn} onClick={handleClear}>
                  <X size={14} />
                  Descartar
                </button>
              </div>
            </div>

            {/* Table */}
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th className={styles.colNro}>N° OS</th>
                    <th>Obra Social</th>
                    <th className={styles.colMoney}>Valor</th>
                    <th className={styles.colDate}>Fecha cambio</th>
                    <th className={styles.colMoney}>Quirúrgico</th>
                    <th className={styles.colMoney}>Práctica</th>
                    <th className={styles.colMoney}>Radiológico</th>
                    <th className={styles.colMoney}>Cir. Adultos</th>
                    <th className={styles.colMoney}>Cir. Infantil</th>
                    <th className={styles.colMoney}>G. Quirúrg.</th>
                    <th className={styles.colMoney}>G. Radio.</th>
                    <th className={styles.colMoney}>G. Bioquím.</th>
                    <th className={styles.colMoney}>Otros G.</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.map((row) => (
                    <tr key={row.nro}>
                      <td className={styles.nroCell}>{row.nro}</td>
                      <td className={styles.nameCell}>{row.nombre}</td>
                      <td className={styles.moneyCell}>{fmt(row.valor)}</td>
                      <td className={styles.dateCell}>{row.fechaCambio ?? "—"}</td>
                      <td className={styles.moneyCell}>{fmt(row.galenoQuirurgico)}</td>
                      <td className={styles.moneyCell}>{fmt(row.galenoPractica)}</td>
                      <td className={styles.moneyCell}>{fmt(row.galenoRadiologico)}</td>
                      <td className={styles.moneyCell}>{fmt(row.galenoCirugiaAdultos)}</td>
                      <td className={styles.moneyCell}>{fmt(row.galenoCirugiaInfantil)}</td>
                      <td className={styles.moneyCell}>{fmt(row.gastosQuirurgicos)}</td>
                      <td className={styles.moneyCell}>{fmt(row.gastosRadiologico)}</td>
                      <td className={styles.moneyCell}>{fmt(row.gastosBioquimicos)}</td>
                      <td className={styles.moneyCell}>{fmt(row.otrosGastos)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className={styles.actions}>
              <button className={styles.clearBtn} onClick={handleClear}>
                <X size={14} />
                Descartar archivo
              </button>
              <Button
                size="md"
                variant="primary"
                onClick={() => setApplied(true)}
                disabled={applied}
              >
                <span className={styles.btnInner}>
                  <Upload size={16} />
                  {applied ? "Valores aplicados" : "Aplicar valores"}
                </span>
              </Button>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
