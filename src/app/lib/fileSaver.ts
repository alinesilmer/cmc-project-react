// Dynamic wrapper around file-saver so the library is code-split into its own
// chunk (loaded only when a download actually runs) instead of sitting in the
// main bundle. Call sites keep using `saveAs(blob, name)`; it now returns a
// promise they can ignore or await.
export async function saveAs(data: Blob, filename?: string): Promise<void> {
  const mod = await import("file-saver");
  mod.saveAs(data, filename as string);
}
