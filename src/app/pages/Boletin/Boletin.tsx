import React, { useMemo, useRef, useState } from "react";
import {
  Box,
  Card,
  CardContent,
  Divider,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Paper,
  TextField,
  LinearProgress,
} from "@mui/material";
import Button from "../../../website/components/UI/Button/Button";
import { parseInputFile } from "../../utils/boletinParser";
import { exportToExcel } from "../../utils/excelExporter";
import type { ObraSocial } from "../../utils/docxParser";

const money = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export default function Boletin() {
  const inputRef = useRef<HTMLInputElement | null>(null);

  const [file, setFile] = useState<File | null>(null);
  const [data, setData] = useState<ObraSocial[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);

  const ordered = useMemo(() => [...data].sort((a, b) => b.consulta - a.consulta), [data]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return ordered;
    return ordered.filter((x) => x.nombre.toLowerCase().includes(q));
  }, [ordered, query]);

  const handlePickFile = () => inputRef.current?.click();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    setFile(f);
    setData([]);
    setQuery("");
    setError(null);
    // IMPORTANTE: resetea el input para poder volver a seleccionar el mismo archivo
    e.target.value = "";
  };

  const handleProcess = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    try {
      const parsed = await parseInputFile(file);
      setData(parsed);
      if (parsed.length === 0) {
        setError("No se detectaron items. Revisá que el DOCX tenga el formato esperado.");
      }
    } catch (err) {
      console.error(err);
      setError("No se pudo leer el DOCX. Probá con otro archivo o re-exportalo a DOCX.");
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    if (data.length === 0) return;
    await exportToExcel(data); // incluye logo (ver exporter abajo)
  };

  return (
    <Box sx={{ minHeight: "calc(100vh - 64px)", bgcolor: "#fff", py: { xs: 4, md: 6 }, px: { xs: 2, md: 4 } }}>
      <Box sx={{ maxWidth: 900, mx: "auto" }}>
        <Card elevation={0} sx={{ borderRadius: 0, border: "1px solid #e5e5e5", mb: 3 }}>
          <CardContent sx={{ p: { xs: 2.5, md: 4 } }}>
            <Stack spacing={2}>
              <Box sx={{ textAlign: "center" }}>
                <Typography variant="h4" sx={{ fontWeight: 700, color: "#0b1f3a" }}>
                  Ranking de Obras Sociales
                </Typography>
                <Typography variant="body2" sx={{ color: "#333", mt: 0.5 }}>
                  Subí el boletín (.docx), generá el ranking y descargá el Excel (incluye logo en el archivo).
                </Typography>
              </Box>

              <Divider sx={{ borderColor: "#e5e5e5" }} />

              {/* File input robusto */}
              <Box sx={{ maxWidth: 760, mx: "auto", width: "100%", textAlign: "center" }}>
                <input
  ref={inputRef}
  type="file"
  accept=".docx,.xlsx,.xls,.pdf"
  onChange={handleFileChange}
  style={{ display: "none" }}
/>

                <Stack spacing={1.2} alignItems="center">
                  <Button size="medium" variant="secondary" onClick={handlePickFile}>
                    Seleccionar DOCX
                  </Button>

                  <Typography variant="caption" sx={{ color: "#333" }}>
                    {file ? (
                      <>
                        Archivo seleccionado: <strong>{file.name}</strong>
                      </>
                    ) : (
                      "Ningún archivo seleccionado"
                    )}
                  </Typography>
                </Stack>
              </Box>

              <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} justifyContent="center" alignItems="center">
                <Button size="medium" variant="primary" onClick={handleProcess} disabled={!file || loading}>
                  {loading ? "Procesando..." : "Leer documento"}
                </Button>

                <Button size="medium" variant="secondary" onClick={handleDownload} disabled={data.length === 0}>
                  Descargar Excel
                </Button>
              </Stack>

              {loading && (
                <Box sx={{ maxWidth: 760, mx: "auto", width: "100%" }}>
                  <LinearProgress
                    sx={{
                      borderRadius: 0,
                      height: 3,
                      backgroundColor: "#f2f2f2",
                      "& .MuiLinearProgress-bar": { backgroundColor: "#111" },
                    }}
                  />
                </Box>
              )}

              {error && (
                <Typography variant="body2" sx={{ color: "#111", textAlign: "center" }}>
                  {error}
                </Typography>
              )}
            </Stack>
          </CardContent>
        </Card>

        {data.length > 0 && (
          <Card elevation={0} sx={{ borderRadius: 0, border: "1px solid #e5e5e5" }}>
            <CardContent sx={{ p: { xs: 2.5, md: 4 } }}>
              <Stack spacing={2}>
                <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems={{ sm: "center" }} justifyContent="space-between">
                  <Typography variant="h6" sx={{ fontWeight: 700, color: "#111" }}>
                    Tabla de Ranking
                  </Typography>

                  <TextField
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Buscar obra social..."
                    size="small"
                    sx={{ width: { xs: "100%", sm: 320 }, "& .MuiOutlinedInput-root": { borderRadius: 0 } }}
                  />
                </Stack>

                <TableContainer component={Paper} elevation={0} sx={{ borderRadius: 0, border: "1px solid #e5e5e5" }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ bgcolor: "#111" }}>
                        <TableCell sx={{ color: "#fff", fontWeight: 700, width: 90 }}>Ranking</TableCell>
                        <TableCell sx={{ color: "#fff", fontWeight: 700 }}>Obra Social</TableCell>
                        <TableCell sx={{ color: "#fff", fontWeight: 700, width: 160 }} align="right">Consulta</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {filtered.map((row, idx) => {
                        const rank = ordered.findIndex((x) => x.nombre === row.nombre && x.consulta === row.consulta) + 1;
                        return (
                          <TableRow key={`${row.nombre}-${row.consulta}-${idx}`} hover sx={{ bgcolor: idx % 2 === 0 ? "#fff" : "#fafafa" }}>
                            <TableCell sx={{ fontWeight: 700, color: "#111" }}>{rank}</TableCell>
                            <TableCell sx={{ color: "#111" }}>{row.nombre}</TableCell>
                            <TableCell align="right" sx={{ color: "#111", fontVariantNumeric: "tabular-nums" }}>
                              {money.format(row.consulta)}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>

                <Typography variant="caption" sx={{ color: "#444", textAlign: "center" }}>
                  Mostrando <strong>{filtered.length}</strong> resultados (ordenados de mayor a menor).
                </Typography>
              </Stack>
            </CardContent>
          </Card>
        )}
      </Box>
    </Box>
  );
}
