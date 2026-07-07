import { createContext, useCallback, useContext, useState, ReactNode } from "react";
import { AlertTriangle } from "lucide-react";

type Opts = {
  title: string;
  message: string;
  confirmText?: string;
  variant?: "danger" | "warning" | "info";
  requireType?: string;
};
type Ctx = (opts: Opts) => Promise<boolean>;
const ConfirmContext = createContext<Ctx>(async () => false);

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<(Opts & { resolve: (v: boolean) => void }) | null>(null);
  const [typed, setTyped] = useState("");

  const confirm = useCallback<Ctx>(
    (opts) => new Promise((resolve) => { setTyped(""); setState({ ...opts, resolve }); }),
    []
  );

  const close = (v: boolean) => { state?.resolve(v); setState(null); };
  const blocked = !!state?.requireType && typed !== state.requireType;
  const variantClass =
    state?.variant === "danger" ? "bg-destructive text-destructive-foreground hover:opacity-90" :
    state?.variant === "warning" ? "bg-warning text-warning-foreground hover:opacity-90" :
    "bg-gradient-primary text-primary-foreground hover:opacity-90";

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {state && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/70 backdrop-blur-sm p-4 animate-in fade-in"
             onClick={() => close(false)}>
          <div onClick={(e) => e.stopPropagation()}
               className="w-full max-w-md rounded-2xl border border-border/60 bg-card p-6 shadow-elevated animate-in zoom-in-95">
            <div className="flex items-start gap-3">
              <div className={`flex h-10 w-10 items-center justify-center rounded-full ${state.variant === "danger" ? "bg-destructive/15 text-destructive" : "bg-warning/15 text-warning"}`}>
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold">{state.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{state.message}</p>
                {state.requireType && (
                  <div className="mt-3">
                    <p className="text-xs text-muted-foreground">Type <span className="font-mono font-bold">{state.requireType}</span> to confirm</p>
                    <input value={typed} onChange={(e) => setTyped(e.target.value)} autoFocus
                      className="mt-1.5 w-full rounded-lg border border-border bg-background/40 px-3 py-1.5 text-sm font-mono" />
                  </div>
                )}
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => close(false)} className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-muted">Cancel</button>
              <button onClick={() => close(true)} disabled={blocked}
                className={`rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-40 ${variantClass}`}>
                {state.confirmText || "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

export const useConfirm = () => useContext(ConfirmContext);