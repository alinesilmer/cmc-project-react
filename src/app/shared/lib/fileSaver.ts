// Dynamic wrapper around file-saver so the library is code-split into its own chunk.
export async function saveAs(data: Blob, filename?: string): Promise<void> {
  const mod = await import("file-saver");
  mod.saveAs(data, filename as string);
}
