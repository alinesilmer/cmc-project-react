import { useEffect, useState } from "react";
import { useNotify } from "@/app/hooks/useNotify";
import {
  addMedicoDocumento,
  deleteMedicoDocumento,
  getDocumentoLabels,
  getMedicoDocumentos,
  setMedicoAttach,
} from "../api";
import type { DoctorDocument } from "../api";
import type { TabKey } from "./legajo.types";
import {
  ATTACH_KEYS,
  ATTACH_PRETTY,
  DEFAULT_LABELS,
  normalizeForCompare,
  stripAttach,
  mensajeDe,
} from "./legajo.helpers";

/** Pestaña Documentos: lista, alta, reemplazo y baja de adjuntos del legajo. */
export function useLegajoDocumentos(medicoId: string, tab: TabKey) {
  const notify = useNotify();

  const [docs, setDocs] = useState<DoctorDocument[]>([]);
  const [docsLoading, setDocsLoading] = useState(false);

  const [docOpen, setDocOpen] = useState(false);
  const [docLabel, setDocLabel] = useState<string>("attach_titulo");
  const [docCustom, setDocCustom] = useState<string>("");
  const [docFile, setDocFile] = useState<File | null>(null);
  const [, setDocBusy] = useState(false);
  const [labelOptions, setLabelOptions] = useState<string[]>(DEFAULT_LABELS);

  const [replaceOpen, setReplaceOpen] = useState(false);
  const [replacePretty, setReplacePretty] = useState<string>("");
  const [pendingUpload, setPendingUpload] = useState<{
    attachKey: string | null;
    labelNormalized: string;
    file: File;
  } | null>(null);

  const [delDocOpen, setDelDocOpen] = useState(false);
  const [docToDelete, setDocToDelete] = useState<DoctorDocument | null>(null);

  useEffect(() => {
    if (tab !== "documentos") return;
    let alive = true;
    (async () => {
      setDocsLoading(true);
      try {
        const r = await getMedicoDocumentos(medicoId);
        if (!alive) return;
        setDocs(r);
      } finally {
        if (alive) setDocsLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [tab, medicoId]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const labels = await getDocumentoLabels().catch(() => DEFAULT_LABELS);
        if (!alive) return;
        const final = labels?.length ? labels : DEFAULT_LABELS;
        const cleaned = final.filter(
          (k) => k === "otro" || ATTACH_KEYS.includes(k)
        );
        setLabelOptions(cleaned.length ? cleaned : DEFAULT_LABELS);
        setDocLabel((cleaned[0] as string) || "attach_titulo");
      } catch {
        setLabelOptions(DEFAULT_LABELS);
        setDocLabel("attach_titulo");
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  async function reloadDocs() {
    setDocsLoading(true);
    try {
      const r = await getMedicoDocumentos(medicoId);
      setDocs(r);
    } finally {
      setDocsLoading(false);
    }
  }

  const tryUploadDocumento = async () => {
    if (!docFile) return;

    const attachKey = docLabel !== "otro" ? docLabel : null;
    const labelNormalized =
      docLabel === "otro"
        ? docCustom.trim().toLowerCase().replace(/\s+/g, "_")
        : stripAttach(docLabel);

    if (attachKey) {
      const exists = docs.find(
        (d) => normalizeForCompare(d.label) === labelNormalized
      );
      if (exists) {
        setPendingUpload({ attachKey, labelNormalized, file: docFile });
        setReplacePretty(ATTACH_PRETTY[attachKey] || attachKey);
        setReplaceOpen(true);
        return;
      }
    }

    await performUploadAndMap({
      attachKey,
      labelNormalized,
      file: docFile,
    });
  };

  const performUploadAndMap = async (payload: {
    attachKey: string | null;
    labelNormalized: string;
    file: File;
  }) => {
    const { attachKey, labelNormalized, file } = payload;
    setDocBusy(true);
    try {
      const created = await addMedicoDocumento(medicoId, file, labelNormalized);

      if (attachKey) {
        await setMedicoAttach(medicoId, attachKey, created.id);
      }

      await reloadDocs();

      setDocOpen(false);
      setDocFile(null);
      setDocCustom("");
    } finally {
      setDocBusy(false);
    }
  };

  const handleConfirmReplace = async () => {
    if (!pendingUpload) return;
    try {
      const existing = docs.find(
        (d) => normalizeForCompare(d.label) === pendingUpload.labelNormalized
      );
      if (existing) {
        await deleteMedicoDocumento(medicoId, existing.id);
      }
      await performUploadAndMap(pendingUpload);
    } catch (e: unknown) {
      notify.error(mensajeDe(e) || "No se pudo reemplazar el documento.");
    } finally {
      setPendingUpload(null);
      setReplaceOpen(false);
    }
  };

  const askDeleteDoc = (doc: DoctorDocument) => {
    setDocToDelete(doc);
    setDelDocOpen(true);
  };

  return {
    docs,
    docsLoading,
    docOpen,
    setDocOpen,
    docLabel,
    setDocLabel,
    docCustom,
    setDocCustom,
    docFile,
    setDocFile,
    labelOptions,
    replaceOpen,
    setReplaceOpen,
    replacePretty,
    setPendingUpload,
    delDocOpen,
    setDelDocOpen,
    docToDelete,
    setDocToDelete,
    reloadDocs,
    tryUploadDocumento,
    handleConfirmReplace,
    askDeleteDoc,
  };
}

export type LegajoDocumentos = ReturnType<typeof useLegajoDocumentos>;
