/// <reference lib="webworker" />
export {};

type Row = Record<string, any>;

let HAYSTACKS: string[] = [];
let ROWS_LEN = 0;

const norm = (v: unknown) => String(v ?? "").toLowerCase();

function buildHaystack(r: Row): string {
  const fields = [
    r.det_id, r.socio, r.nombreSocio, r.matri, r.nroOrden, r.fecha, r.codigo,
    r.nroAfiliado, r.afiliado, r.xCant, r.porcentaje, r.honorarios, r.gastos,
    r.coseguro, r.importe, r.pagado, r.tipo, r.monto, r.obs, r.total,
  ].map(norm);
  return fields.join(" | ");
}

self.onmessage = (e: MessageEvent) => {
  const { type, payload } = e.data || {};
  if (type === "setData") {
    const rows: Row[] = payload.rows || [];
    ROWS_LEN = rows.length;
    HAYSTACKS = rows.map(buildHaystack);
    (self as any).postMessage({ type: "ready", payload: { count: ROWS_LEN } });
    return;
  }
  if (type === "search") {
    const q: string = (payload?.q || "").toLowerCase().trim();
    if (!q) {
      const all = Array.from({ length: ROWS_LEN }, (_, i) => i);
      (self as any).postMessage({ type: "result", payload: { indexes: all } });
      return;
    }
    const tokens = q.split(/\s+/).filter(Boolean);
    const indexes: number[] = [];
    for (let i = 0; i < ROWS_LEN; i++) {
      const hay = HAYSTACKS[i];
      let ok = true;
      for (const t of tokens) {
        if (hay.indexOf(t) === -1) { ok = false; break; }
      }
      if (ok) indexes.push(i);
    }
    (self as any).postMessage({ type: "result", payload: { indexes } });
  }
};
