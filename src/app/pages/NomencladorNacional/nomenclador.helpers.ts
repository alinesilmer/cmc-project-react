export function parseMonto(s: string | null | undefined): number {
  if (!s) return 0;
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}

export function today(): string {
  return new Date().toISOString().slice(0, 10);
}
