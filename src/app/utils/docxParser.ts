import mammoth from "mammoth";

export interface ObraSocial {
  nombre: string;
  consulta: number;
}

export async function parseDocx(file: File): Promise<ObraSocial[]> {
  const buffer = await file.arrayBuffer();
  const { value } = await mammoth.extractRawText({ arrayBuffer: buffer });

  const lines = value.split("\n");

  const result: ObraSocial[] = [];
  let obraActual = "";

  for (const line of lines) {
    if (/^\s*\d+\s*[-–]/.test(line)) {
      obraActual = line.trim();
      continue;
    }

    // Detecta línea de consulta
    const match = line.match(
      /Consulta(?:\s+Especialista|\s+Única)?\s*\$?\s*([\d.,]+)/i
    );

    if (match && obraActual) {
      const value = Number(
        match[1].replace(/\./g, "").replace(",", ".")
      );

      if (!Number.isNaN(value)) {
        result.push({
          nombre: obraActual,
          consulta: value,
        });
      }

      obraActual = "";
    }
  }

  return result;
}
