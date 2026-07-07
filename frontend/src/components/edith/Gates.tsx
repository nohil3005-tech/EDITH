import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { Loader2, Lock, ShieldAlert, LogOut } from "lucide-react";
import api from "@/lib/api";

// ─── Twinkling Stars Canvas for Gate 2 & Poetic Error ─────────
export function StarryCanvas({ isMobile }: { isMobile?: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const isMobileMode = isMobile !== undefined ? isMobile : (typeof window !== "undefined" && (window.location.pathname.startsWith("/mobile") || window.innerWidth < 768));

    let animationId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", handleResize);

    const stars = Array.from({ length: 120 }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      size: Math.random() * 1.5 + 0.5,
      speed: Math.random() * 0.04 + 0.01,
      phase: Math.random() * Math.PI * 2,
    }));

    const render = () => {
      // Deep dark night background
      ctx.fillStyle = isMobileMode ? "#060608" : "#03020a";
      ctx.fillRect(0, 0, width, height);

      // Subtle cosmic background radial glow
      const glow = ctx.createRadialGradient(
        width / 2,
        height / 2,
        0,
        width / 2,
        height / 2,
        Math.max(width, height) * 0.8
      );
      if (isMobileMode) {
        glow.addColorStop(0, "#0e0e12");
        glow.addColorStop(0.5, "#070709");
        glow.addColorStop(1, "#020203");
      } else {
        glow.addColorStop(0, "#0b0821");
        glow.addColorStop(0.5, "#040310");
        glow.addColorStop(1, "#020108");
      }
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, width, height);

      // Render & update stars
      stars.forEach((star) => {
        star.phase += star.speed;
        const opacity = 0.15 + (Math.sin(star.phase) + 1) * 0.4;
        ctx.fillStyle = isMobileMode ? `rgba(255, 255, 255, ${opacity * 0.8})` : `rgba(224, 231, 255, ${opacity})`;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fill();
      });

      animationId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animationId);
    };
  }, [isMobile]);

  return <canvas ref={canvasRef} className="fixed inset-0 -z-10 block pointer-events-none" />;
}

// ─── GATE 1: Password Wall ────────────────────────────────────
export function PasswordWall({ onSuccess }: { onSuccess: (token: string) => void }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const isMobile = typeof window !== 'undefined' && (window.location.pathname.startsWith('/mobile') || window.innerWidth < 768);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await api.auth.gate1Verify(password) as any;
      if (res?.data?.token) {
        onSuccess(res.data.token);
      }
    } catch (err: any) {
      setError("Access Denied");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center px-4 font-sans ${isMobile ? "bg-black" : "bg-[#07070d]"}`}>
      <div className={`w-full max-w-sm rounded-2xl border p-8 backdrop-blur-xl ${isMobile ? "border-neutral-850 bg-[#111115]/80 shadow-xl" : "border-white/5 bg-[#0b0b12]/60 shadow-[0_0_50px_rgba(0,0,0,0.8)]"}`}>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="flex flex-col items-center justify-center text-center">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-white/[0.03] border border-white/10 text-white/70">
              <Lock className="h-5 w-5" />
            </div>
          </div>
          <div className="space-y-2">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className={`w-full rounded-lg border bg-black/40 px-4 py-3 text-center text-lg text-white placeholder-white/20 transition-all focus:outline-none focus:ring-1 ${isMobile ? "border-neutral-800 focus:border-neutral-500 focus:ring-neutral-500" : "border-white/10 focus:border-indigo-500 focus:ring-indigo-500"}`}
            />
            {error && (
              <p className={`text-center text-sm font-semibold tracking-wide animate-pulse mt-2 ${isMobile ? "text-neutral-400" : "text-red-400"}`}>
                {error}
              </p>
            )}
          </div>
          <button
            disabled={busy}
            type="submit"
            className={`flex w-full items-center justify-center gap-2 rounded-lg py-3 font-semibold transition-all active:scale-[0.98] disabled:opacity-60 ${isMobile ? "bg-neutral-100 text-black hover:bg-neutral-200" : "bg-indigo-600 hover:bg-indigo-500 text-white"}`}
          >
            {busy && <Loader2 className={`h-4 w-4 animate-spin ${isMobile ? "text-black" : "text-white"}`} />}
            Unlock
          </button>
        </form>
      </div>
    </div>
  );
}

// ─── GATE 2: Codename Verification ────────────────────────────
export function CodenameVerification({
  onSuccess,
  onBack,
}: {
  onSuccess: (token: string) => void;
  onBack: () => void;
}) {
  const [codename, setCodename] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const isMobile = typeof window !== 'undefined' && (window.location.pathname.startsWith('/mobile') || window.innerWidth < 768);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await api.auth.gate2Verify(codename) as any;
      if (res?.data?.token) {
        onSuccess(res.data.token);
      }
    } catch (err: any) {
      setError("The stars do not recognize you");
    } finally {
      setBusy(false);
    }
  };

  if (error) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center px-4 font-sans text-center">
        <StarryCanvas isMobile={isMobile} />
        <div className="max-w-md space-y-6 animate-fade-in">
          <h1 className={`text-3xl font-extralight tracking-widest leading-relaxed font-mono ${isMobile ? "text-neutral-200" : "text-indigo-200/90"}`}>
            {error}
          </h1>
          <p className={`text-sm font-light italic ${isMobile ? "text-neutral-500" : "text-indigo-400/60"}`}>
            "We walked the galactic dust, but the cosmos was silent."
          </p>
          <button
            onClick={() => {
              setError(null);
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
        <form onSubmit={handleSubmit} className="space-y-8">
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
          <div className="flex gap-4">
            <button
              type="button"
              onClick={onBack}
              className={`flex-1 rounded-lg border py-3 text-sm font-medium transition-all ${isMobile ? "border-neutral-800 text-neutral-400 hover:text-white hover:bg-neutral-900/40" : "border-white/10 text-white/70 hover:bg-white/5 hover:text-white"}`}
            >
              Back
            </button>
            <button
              disabled={busy}
              type="submit"
              className={`flex-[2] flex items-center justify-center gap-2 rounded-lg py-3 font-semibold transition-all active:scale-[0.98] disabled:opacity-60 ${isMobile ? "bg-neutral-100 text-black hover:bg-neutral-200" : "bg-indigo-600 hover:bg-indigo-500 text-white"}`}
            >
              {busy && <Loader2 className={`h-4 w-4 animate-spin ${isMobile ? "text-black" : "text-white"}`} />}
              Transmit
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── GATE 3: Google OAuth Login ───────────────────────────────
export function GoogleSignIn({
  onSuccess,
  onPending,
  onBack,
}: {
  onSuccess: (token: string) => void;
  onPending: () => void;
  onBack: () => void;
}) {
  const [googleClientId, setGoogleClientId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showChooser, setShowChooser] = useState(false);
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customEmail, setCustomEmail] = useState("");
  const isMobile = typeof window !== 'undefined' && (window.location.pathname.startsWith('/mobile') || window.innerWidth < 768);

  useEffect(() => {
    api.auth.getConfig()
      .then((res: any) => {
        if (res?.data?.googleClientId) {
          setGoogleClientId(res.data.googleClientId);
        }
      })
      .catch((err: any) => {
        console.error(err);
        toast.error("Failed to load backend authentication config.");
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!googleClientId) return;

    const initializeGis = () => {
      if ((window as any).google) {
        (window as any).google.accounts.id.initialize({
          client_id: googleClientId,
          callback: async (response: any) => {
            setLoading(true);
            try {
              const res = await api.auth.googleLogin(response.credential) as any;
              if (res?.data?.status === "active" && res?.data?.token) {
                toast.success("Identity verified");
                onSuccess(res.data.token);
              } else if (res?.data?.status === "pending") {
                onPending();
              }
            } catch (err: any) {
              toast.error(err.message || "Google Authentication failed");
            } finally {
              setLoading(false);
            }
          },
        });

        (window as any).google.accounts.id.renderButton(
          document.getElementById("google-signin-btn"),
          {
            theme: "filled_dark",
            size: "large",
            width: "300",
            text: "signin_with",
            shape: "pill",
          }
        );
      }
    };

    const interval = setInterval(() => {
      if ((window as any).google) {
        clearInterval(interval);
        initializeGis();
      }
    }, 100);

    return () => clearInterval(interval);
  }, [googleClientId]);

  const handleSelectMockEmail = async (email: string) => {
    setShowChooser(false);
    setLoading(true);
    try {
      const res = await api.auth.googleLogin(`mock_${email}`) as any;
      if (res?.data?.status === "active" && res?.data?.token) {
        toast.success("Identity verified");
        onSuccess(res.data.token);
      } else if (res?.data?.status === "pending") {
        onPending();
      }
    } catch (err: any) {
      toast.error(err.message || "Google Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center px-4 font-sans ${isMobile ? "bg-black" : "bg-[#05050c]"}`}>
      <div className={`w-full max-w-md rounded-2xl border p-8 text-center space-y-6 ${isMobile ? "border-neutral-850 bg-[#111115]/80 shadow-xl" : "border-white/5 bg-[#0a0a14] shadow-[0_0_50px_rgba(0,0,0,0.7)]"}`}>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight text-white">Identify Yourself</h1>
          <p className={`text-sm ${isMobile ? "text-neutral-400" : "text-muted-foreground"}`}>Gate 3: Google Identity Verification</p>
        </div>

        <div className="flex justify-center py-4 min-h-[50px]">
          {loading ? (
            <Loader2 className={`h-8 w-8 animate-spin ${isMobile ? "text-white" : "text-indigo-500"}`} />
          ) : googleClientId ? (
            <div id="google-signin-btn" className="inline-block" />
          ) : (
            <button
              onClick={() => setShowChooser(true)}
              className="flex items-center justify-center gap-3 w-full max-w-[280px] h-[46px] bg-white hover:bg-gray-100 text-gray-700 font-medium rounded-full shadow-md transition-all active:scale-[0.98] border border-gray-200"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="h-5 w-5">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                <path fill="#4285F4" d="M46.5 24c0-1.61-.15-3.16-.45-4.66H24v9.3h12.75c-.55 2.89-2.18 5.33-4.62 6.96l7.19 5.57C43.51 36.6 46.5 30.9 46.5 24z"/>
                <path fill="#FBBC05" d="M10.54 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.98-6.19z"/>
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.19-5.57c-2 1.34-4.55 2.13-7.7 2.13-6.26 0-11.57-4.22-13.46-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
              </svg>
              <span className="text-sm font-sans tracking-wide">Sign in with Google</span>
            </button>
          )}
        </div>

        <button
          onClick={onBack}
          className={`text-xs transition-colors ${isMobile ? "text-neutral-500 hover:text-white" : "text-muted-foreground hover:text-white"}`}
        >
          Reset Challenge Stages
        </button>
      </div>

      {showChooser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4 font-sans text-left">
          <div className={`w-full max-w-[360px] rounded-lg shadow-2xl overflow-hidden border animate-in fade-in zoom-in-95 duration-200 ${isMobile ? "bg-[#0F0F12] text-white border-neutral-850" : "bg-white text-gray-800 border-gray-200"}`}>
            <div className="p-8 space-y-6">
              <div className="text-center space-y-2">
                <div className="text-2xl font-semibold select-none leading-none tracking-tight">
                  <span className="text-[#4285F4]">G</span>
                  <span className="text-[#EA4335]">o</span>
                  <span className="text-[#FBBC05]">o</span>
                  <span className="text-[#4285F4]">g</span>
                  <span className="text-[#34A853]">l</span>
                  <span className="text-[#EA4335]">e</span>
                </div>
                <h2 className={`text-xl font-normal leading-tight ${isMobile ? "text-white" : "text-[#202124]"}`}>Choose an account</h2>
                <p className={`text-sm ${isMobile ? "text-neutral-400" : "text-[#5f6368]"}`}>to continue to <strong className={`font-semibold ${isMobile ? "text-white" : "text-gray-900"}`}>EDITH</strong></p>
              </div>

              {!showCustomInput ? (
                <div className={`divide-y max-h-[280px] overflow-y-auto border-y ${isMobile ? "divide-neutral-900 border-neutral-900" : "divide-gray-200 border-gray-200"}`}>
                  <button
                    onClick={() => handleSelectMockEmail("admin@edith.local")}
                    className={`w-full py-3 px-1 flex items-center gap-3 transition-colors text-left ${isMobile ? "hover:bg-neutral-900/60" : "hover:bg-gray-50"}`}
                  >
                    <div className="h-9 w-9 rounded-full bg-[#1a73e8] text-white font-medium text-sm flex items-center justify-center">
                      EO
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium truncate ${isMobile ? "text-white" : "text-gray-900"}`}>EDITH Operator</p>
                      <p className={`text-xs truncate ${isMobile ? "text-neutral-400" : "text-gray-500"}`}>admin@edith.local</p>
                    </div>
                  </button>

                  <button
                    onClick={() => handleSelectMockEmail("usera@edith.local")}
                    className={`w-full py-3 px-1 flex items-center gap-3 transition-colors text-left ${isMobile ? "hover:bg-neutral-900/60" : "hover:bg-gray-50"}`}
                  >
                    <div className="h-9 w-9 rounded-full bg-[#e8710a] text-white font-medium text-sm flex items-center justify-center">
                      UA
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium truncate ${isMobile ? "text-white" : "text-gray-900"}`}>User A</p>
                      <p className={`text-xs truncate ${isMobile ? "text-neutral-400" : "text-gray-500"}`}>usera@edith.local</p>
                    </div>
                  </button>

                  <button
                    onClick={() => handleSelectMockEmail("userb@edith.local")}
                    className={`w-full py-3 px-1 flex items-center gap-3 transition-colors text-left ${isMobile ? "hover:bg-neutral-900/60" : "hover:bg-gray-50"}`}
                  >
                    <div className="h-9 w-9 rounded-full bg-[#137333] text-white font-medium text-sm flex items-center justify-center">
                      UB
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium truncate ${isMobile ? "text-white" : "text-gray-900"}`}>User B</p>
                      <p className={`text-xs truncate ${isMobile ? "text-neutral-400" : "text-gray-500"}`}>userb@edith.local</p>
                    </div>
                  </button>

                  <button
                    onClick={() => setShowCustomInput(true)}
                    className={`w-full py-3 px-1 flex items-center gap-3 transition-colors text-left font-medium ${isMobile ? "text-white hover:bg-neutral-900/60" : "text-[#1a73e8] hover:bg-gray-50"}`}
                  >
                    <div className={`h-9 w-9 rounded-full border flex items-center justify-center ${isMobile ? "border-neutral-800 bg-[#121216] text-neutral-400" : "border-gray-300 bg-gray-50 text-gray-500"}`}>
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0ZM3 19.235v-.11a6 6 0 0 1 6-6h6a6 6 0 0 1 6 6v.11m-18 0A23.905 23.905 0 0 0 12 18a23.904 23.904 0 0 0 9.14-1.164" />
                      </svg>
                    </div>
                    <span className="text-sm">Use another account</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-4 py-2">
                  <div className="space-y-1">
                    <label className={`text-xs font-medium uppercase ${isMobile ? "text-neutral-400" : "text-gray-500"}`}>Email address</label>
                    <input
                      type="email"
                      value={customEmail}
                      onChange={(e) => setCustomEmail(e.target.value)}
                      placeholder="name@example.com"
                      autoFocus
                      className={`w-full border rounded px-3 py-2 text-sm focus:outline-none ${isMobile ? "bg-black border-neutral-850 text-white focus:border-white" : "bg-white border-gray-300 text-gray-900 focus:border-[#1a73e8]"}`}
                    />
                  </div>
                  <div className="flex gap-2 justify-end pt-2">
                    <button
                      type="button"
                      onClick={() => setShowCustomInput(false)}
                      className={`px-4 py-2 text-sm rounded ${isMobile ? "text-neutral-400 hover:bg-neutral-900" : "text-gray-600 hover:bg-gray-100"}`}
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (customEmail.trim()) {
                          handleSelectMockEmail(customEmail.trim());
                        }
                      }}
                      className={`px-4 py-2 text-sm rounded font-medium ${isMobile ? "bg-white text-black hover:bg-neutral-200" : "bg-[#1a73e8] text-white hover:bg-[#1557b0]"}`}
                    >
                      Continue
                    </button>
                  </div>
                </div>
              )}

              <div className={`text-xs leading-normal pt-2 ${isMobile ? "text-neutral-500" : "text-[#5f6368]"}`}>
                To continue, Google will share your name, email address, profile picture, and language preference with EDITH. Refer to EDITH's Privacy Policy and Terms of Service.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Pending Approval Page ────────────────────────────────────
export function PendingApproval({ onLogout }: { onLogout: () => void }) {
  const isMobile = typeof window !== 'undefined' && (window.location.pathname.startsWith('/mobile') || window.innerWidth < 768);
  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center px-4 font-sans text-center ${isMobile ? "bg-black" : "bg-[#05050c]"}`}>
      <div className={`w-full max-w-md rounded-2xl border p-8 space-y-6 ${isMobile ? "border-neutral-850 bg-[#111115]/80 shadow-xl" : "border-white/5 bg-[#0a0a14] shadow-[0_0_50px_rgba(0,0,0,0.7)]"}`}>
        <div className="flex flex-col items-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-yellow-500/10 text-yellow-500 border border-yellow-500/20">
            <ShieldAlert className="h-8 w-8" />
          </div>
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-white">Access Pending</h1>
          <p className={`text-sm leading-relaxed ${isMobile ? "text-neutral-400" : "text-muted-foreground"}`}>
            Your registration is currently awaiting administrator review.
            You will be granted full access once your account is activated.
          </p>
        </div>
        <div className="pt-4">
          <button
            onClick={onLogout}
            className={`inline-flex items-center gap-2 rounded-lg border px-6 py-2.5 text-sm font-medium transition-all ${isMobile ? "border-neutral-800 text-white hover:bg-neutral-900" : "border-white/10 text-white hover:bg-white/5"}`}
          >
            <LogOut className="h-4 w-4" /> Return to Login
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Blocked Page ─────────────────────────────────────────────
export function BlockedAccount({ onLogout }: { onLogout: () => void }) {
  const isMobile = typeof window !== 'undefined' && (window.location.pathname.startsWith('/mobile') || window.innerWidth < 768);
  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center px-4 font-sans text-center ${isMobile ? "bg-black" : "bg-[#0c0505]"}`}>
      <div className={`w-full max-w-md rounded-2xl border p-8 space-y-6 ${isMobile ? "border-neutral-850 bg-[#140a0a]/80 shadow-xl" : "border-white/5 bg-[#140a0a] shadow-[0_0_50px_rgba(0,0,0,0.7)]"}`}>
        <div className="flex flex-col items-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10 text-red-500 border border-red-500/20 animate-pulse">
            <ShieldAlert className="h-8 w-8" />
          </div>
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-white">Access Suspended</h1>
          <p className={`text-sm leading-relaxed ${isMobile ? "text-neutral-400" : "text-muted-foreground"}`}>
            Your account has been deactivated by the system administrator.
            Please contact support if you believe this is an error.
          </p>
        </div>
        <div className="pt-4">
          <button
            onClick={onLogout}
            className={`inline-flex items-center gap-2 rounded-lg border px-6 py-2.5 text-sm font-medium transition-all ${isMobile ? "border-neutral-800 text-white hover:bg-neutral-900" : "border-white/10 text-white/5"}`}
          >
            <LogOut className="h-4 w-4" /> Return to Login
          </button>
        </div>
      </div>
    </div>
  );
}
