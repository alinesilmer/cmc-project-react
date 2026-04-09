"use client";

import { useEffect, useState } from "react";
import { saveAs } from "file-saver";
import { Download } from "lucide-react";
import * as XLSX from "xlsx";

import styles from "./PadronSwiss.module.scss";
import Button from "../../components/atoms/Button/Button";

const TITLE = "Prestadores del Colegio Médico de Corrientes - Swiss Medical";
const PadronXlsxUrl = "/padron_swiss.xlsx";

type ExcelRow = (string | number)[];

const PadronSwiss = () => {
  const [data, setData] = useState<ExcelRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  function downloadExcel() {
    saveAs(PadronXlsxUrl, `${TITLE}.xlsx`);
  }

  useEffect(() => {
    async function loadExcel() {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(PadronXlsxUrl);
        if (!response.ok) {
          throw new Error("No se pudo cargar el archivo Excel.");
        }

        const arrayBuffer = await response.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: "array" });

        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];

        const jsonData = XLSX.utils.sheet_to_json<(string | number)[]>(worksheet, {
          header: 1,
          defval: "",
        });

        setData(jsonData);
      } catch (err) {
        console.error(err);
        setError("Ocurrió un error al mostrar el archivo Excel.");
      } finally {
        setLoading(false);
      }
    }

    loadExcel();
  }, []);

  const headers = data[0] || [];
  const rows = data.slice(1);

  return (
    <div className={styles.container}>
      <div className={styles.wrapper}>
        <div className={styles.card}>
          <div className={styles.cardContent}>
            <div className={styles.topRow}>
              <div className={styles.actions}>
                <Button type="button" variant="primary" onClick={downloadExcel}>
                  <Download size={18} />
                  <span>Descargar Excel</span>
                </Button>
              </div>
            </div>

            <div className={styles.excelViewer}>
              {loading && <p className={styles.message}>Cargando Excel...</p>}

              {!loading && error && <p className={styles.error}>{error}</p>}

              {!loading && !error && data.length > 0 && (
                <div className={styles.tableWrapper}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        {headers.map((header, index) => (
                          <th key={index}>{String(header)}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row, rowIndex) => (
                        <tr key={rowIndex}>
                          {headers.map((_, cellIndex) => (
                            <td key={cellIndex}>{row[cellIndex] ?? ""}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {!loading && !error && data.length === 0 && (
                <p className={styles.message}>El archivo Excel no contiene datos.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PadronSwiss;