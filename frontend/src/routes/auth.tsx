import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Hexagon, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { StarryCanvas } from "@/components/edith/Gates";
import api from "@/lib/api";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Sign in — EDITH" }] }),
  component: AuthPage,
});

function AuthPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [codename, setCodename] = useState("");
  const [codenameVerified, setCodenameVerified] = useState(false);
  const [codenameError, setCodenameError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const verified = localStorage.getItem("codename_verified") === "true";
      setCodenameVerified(verified);
    }
  }, []);

  useEffect(() => {
    if (!loading && user) navigate({ to: "/" });
  }, [user, loading, navigate]);

  const handleGoogleLogin = async () => {
    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: window.location.origin + "/auth",
        },
      });
      if (error) throw error;
    } catch (err) {
      toast.error((err as Error).message);
      setBusy(false);
    }
  };

  const handleCodenameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCodenameError(null);
    setBusy(true);
    try {
      const res = await api.auth.gate1Verify(codename) as any;
      if (res?.data?.token) {
        localStorage.setItem("codename_verified", "true");
        setCodenameVerified(true);
        toast.success("Identity verified");
      }
    } catch (err: any) {
      setCodenameError("The stars do not recognize you");
    } finally {
      setBusy(false);
    }
  };

  const isMobile = typeof window !== 'undefined' && (window.location.pathname.startsWith('/mobile') || window.innerWidth < 768);

  if (!codenameVerified) {
    if (codenameError) {
      return (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center px-4 font-sans text-center">
          <StarryCanvas isMobile={isMobile} />
          <div className="max-w-md space-y-6 animate-fade-in">
            <h1 className={`text-3xl font-extralight tracking-widest leading-relaxed font-mono ${isMobile ? "text-neutral-200" : "text-indigo-200/90"}`}>
              {codenameError}
            </h1>
            <p className={`text-sm font-light italic ${isMobile ? "text-neutral-500" : "text-indigo-400/60"}`}>
              "We walked the galactic dust, but the cosmos was silent."
            </p>
            <button
              onClick={() => {
                setCodenameError(null);
                setCodename("");
              }}
              className={`inline-flex items-center justify-center rounded-lg px-6 py-2.5 text-sm font-medium transition-all active:scale-[0.97] ${isMobile ? "border border-neutral-800 bg-[#121216]/50 text-white hover:bg-neutral-800" : "border border-indigo-500/30 bg-indigo-500/10 text-indigo-200 hover:bg-indigo-500/25"}`}
            >
              Seek Entry Again
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center px-4 font-sans">
        <StarryCanvas isMobile={isMobile} />
        <div className={`w-full max-w-md rounded-2xl border p-8 backdrop-blur-md ${isMobile ? "border-neutral-850 bg-black/80 shadow-xl" : "border-white/5 bg-black/40 shadow-[0_0_60px_rgba(0,0,0,0.6)]"}`}>
          <form onSubmit={handleCodenameSubmit} className="space-y-8">
            <div className="text-center space-y-2">
              <h1 className={`text-2xl font-light tracking-widest font-mono ${isMobile ? "text-white" : "text-indigo-100"}`}>
                Who Goes There?
              </h1>
              <p className={`text-xs uppercase tracking-widest font-mono ${isMobile ? "text-neutral-500" : "text-indigo-300/40"}`}>
                Identity challenge gate
              </p>
            </div>
            <div className="space-y-4">
              <input
                type="text"
                value={codename}
                onChange={(e) => setCodename(e.target.value)}
                placeholder="Speak the codename to continue..."
                required
                autoFocus
                className={`w-full rounded-lg border px-4 py-3 text-center text-lg placeholder-white/20 transition-all focus:outline-none focus:ring-1 ${isMobile ? "border-neutral-800 bg-[#121216]/50 text-white focus:border-neutral-500 focus:ring-neutral-500" : "border-indigo-500/20 bg-indigo-950/20 text-indigo-100 focus:border-indigo-400 focus:ring-indigo-400"}`}
              />
            </div>
            <button
              disabled={busy}
              type="submit"
              className={`flex w-full items-center justify-center gap-2 rounded-lg py-3 font-semibold transition-all active:scale-[0.98] disabled:opacity-60 ${isMobile ? "bg-neutral-100 text-black hover:bg-neutral-200" : "bg-indigo-600 hover:bg-indigo-500 text-white"}`}
            >
              {busy && <Loader2 className={`h-4 w-4 animate-spin ${isMobile ? "text-black" : "text-white"}`} />}
              Transmit
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 relative">
      <StarryCanvas isMobile={isMobile} />
      <div className="w-full max-w-md rounded-2xl border border-border/60 bg-gradient-card p-8 shadow-elevated backdrop-blur-xl">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-primary shadow-glow">
            <Hexagon className="h-6 w-6 text-primary-foreground" strokeWidth={2.5} />
          </div>
          <h1 className="text-2xl font-bold">Welcome to EDITH</h1>
          <p className="text-sm text-muted-foreground">Enhanced Digital Intelligence & Trading Hub</p>
        </div>

        <div className="mt-8 space-y-4">
          <button type="button" onClick={handleGoogleLogin} disabled={busy}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-background/40 hover:bg-background/80 px-4 py-3 text-sm font-semibold text-foreground transition-colors disabled:opacity-60 cursor-pointer shadow-md">
            <svg className="h-4 w-4 mr-1" viewBox="0 0 24 24" fill="currentColor">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
            </svg>
            Sign in with Google
          </button>
        </div>

        <div className="mt-6 flex justify-between items-center text-xs">
          <Link to="/" className="text-muted-foreground hover:text-primary">← Back to dashboard</Link>
          <button
            onClick={() => {
              localStorage.removeItem("codename_verified");
              setCodenameVerified(false);
            }}
            className="text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
          >
            Lock Gate
          </button>
        </div>
      </div>
    </div>
  );
}