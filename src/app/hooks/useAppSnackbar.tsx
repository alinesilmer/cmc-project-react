import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import Snackbar from "@mui/material/Snackbar";
import Alert from "@mui/material/Alert";

type Severity = "success" | "error" | "warning" | "info";

type State = { open: boolean; message: string; severity: Severity };

type Ctx = (message: string, severity?: Severity) => void;

const SnackbarContext = createContext<Ctx | null>(null);

export function SnackbarProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State>({ open: false, message: "", severity: "success" });

  const notify = useCallback((message: string, severity: Severity = "success") => {
    setState({ open: true, message, severity });
  }, []);

  const handleClose = (_: React.SyntheticEvent | Event, reason?: string) => {
    if (reason === "clickaway") return;
    setState((s) => ({ ...s, open: false }));
  };

  return (
    <SnackbarContext.Provider value={notify}>
      {children}
      <Snackbar
        open={state.open}
        autoHideDuration={4500}
        onClose={handleClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert
          onClose={(e) => handleClose(e)}
          severity={state.severity}
          variant="filled"
          sx={{ width: "100%", fontSize: 13 }}
        >
          {state.message}
        </Alert>
      </Snackbar>
    </SnackbarContext.Provider>
  );
}

export function useAppSnackbar(): Ctx {
  const ctx = useContext(SnackbarContext);
  if (!ctx) throw new Error("useAppSnackbar must be used inside SnackbarProvider");
  return ctx;
}
