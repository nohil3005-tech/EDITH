import { useState } from "react";
import { useEdith, useHydrated } from "@/lib/store";
import { Hexagon, X, ArrowRight, ArrowLeft, Check, Sparkles } from "lucide-react";
import { toast } from "sonner";

export function OnboardingWizard() {
  const complete = useHydrated((s) => s.onboardingComplete, true);
  const setComplete = useEdith((s) => s.setOnboardingComplete);
  const profile = useEdith((s) => s.profile);
  const setProfile = useEdith((s) => s.setProfile);
  const ps = useEdith((s) => s.paymentSettings);
  const setPS = useEdith((s) => s.setPaymentSettings);
  const setAuto = useEdith((s) => s.setAutomation);
  const [step, setStep] = useState(0);

  if (complete) return null;

  const finish = () => { setComplete(true); toast.success("Welcome to EDITH! 🎉"); };
  const skip = () => { setComplete(true); };

  const steps = [
    {
      title: "Welcome to EDITH",
      body: (
        <div className="space-y-3 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-primary shadow-glow">
            <Hexagon className="h-8 w-8 text-primary-foreground" strokeWidth={2.5} />
          </div>
          <p className="text-lg font-semibold">Your personal AI command center</p>
          <p className="text-sm text-muted-foreground">Manage your freelance pipeline and dropshipping stores from one dashboard. Let's set things up — takes 60 seconds.</p>
        </div>
      ),
    },
    {
      title: "Your profile",
      body: (
        <div className="space-y-3">
          <Field label="Display Name"><input value={profile.name} onChange={(e) => setProfile({ name: e.target.value })} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" /></Field>
          <Field label="Headline"><input value={profile.headline} onChange={(e) => setProfile({ headline: e.target.value })} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" /></Field>
          <Field label="Top Skills (comma separated)"><input value={profile.skills.join(", ")} onChange={(e) => setProfile({ skills: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" /></Field>
        </div>
      ),
    },
    {
      title: "Connect payment",
      body: (
        <div className="space-y-3">
          <Field label="Default Payment Link (Stripe / PayPal / etc)"><input value={ps.defaultLink} onChange={(e) => setPS({ defaultLink: e.target.value })} placeholder="https://..." className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" /></Field>
          <Field label="Business Name"><input value={ps.businessName} onChange={(e) => setPS({ businessName: e.target.value })} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" /></Field>
          <p className="text-xs text-muted-foreground">This link is auto-attached to all invoices.</p>
        </div>
      ),
    },
    {
      title: "Choose primary domain",
      body: (
        <div className="grid grid-cols-2 gap-3">
          {["Content Writing", "SEO", "Web Design", "Video", "AI Consulting", "E-Commerce"].map((d) => (
            <button key={d} onClick={() => { toast.success(`Primary: ${d}`); setStep(step + 1); }}
              className="rounded-lg border border-border bg-card px-4 py-3 text-sm font-medium hover:border-primary hover:bg-primary/10">
              {d}
            </button>
          ))}
        </div>
      ),
    },
    {
      title: "Configure automation",
      body: (
        <div className="space-y-2">
          {["Auto-scan jobs", "Auto-scan products", "Auto-generate proposals"].map((k) => (
            <ToggleRow key={k} label={k} onToggle={(v) => setAuto(k, v)} defaultOn />
          ))}
        </div>
      ),
    },
    {
      title: "You're all set!",
      body: (
        <div className="space-y-3 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-success/15 text-success">
            <Check className="h-8 w-8" />
          </div>
          <p className="text-lg font-semibold">EDITH is ready</p>
          <p className="text-sm text-muted-foreground">Demo data is loaded so you can explore. Add, edit, or reset anytime from your profile menu.</p>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/15 px-3 py-1 text-xs text-primary">
            <Sparkles className="h-3 w-3" /> Pro tip: Press ⌘K to open the AI command bar
          </div>
        </div>
      ),
    },
  ];

  const isLast = step === steps.length - 1;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl border border-border bg-card shadow-elevated">
        <div className="flex items-center justify-between border-b border-border p-4">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-muted-foreground">{step + 1} / {steps.length}</span>
            <h2 className="font-semibold">{steps[step].title}</h2>
          </div>
          <button onClick={skip} className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"><X className="h-4 w-4" /></button>
        </div>
        <div className="p-6">{steps[step].body}</div>
        <div className="flex items-center justify-between border-t border-border p-4">
          <button onClick={skip} className="text-xs text-muted-foreground hover:text-foreground">Skip wizard</button>
          <div className="flex gap-2">
            {step > 0 && <button onClick={() => setStep(step - 1)} className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-accent"><ArrowLeft className="h-3 w-3" /> Back</button>}
            {!isLast ? (
              <button onClick={() => setStep(step + 1)} className="inline-flex items-center gap-1 rounded-lg bg-gradient-primary px-4 py-1.5 text-sm font-semibold text-primary-foreground shadow-glow">
                Next <ArrowRight className="h-3 w-3" />
              </button>
            ) : (
              <button onClick={finish} className="inline-flex items-center gap-1 rounded-lg bg-gradient-primary px-4 py-1.5 text-sm font-semibold text-primary-foreground shadow-glow">
                Get Started <Check className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>
        <div className="h-1 overflow-hidden rounded-b-2xl bg-muted">
          <div className="h-full bg-gradient-primary transition-all" style={{ width: `${((step + 1) / steps.length) * 100}%` }} />
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="mb-1 block text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</label>{children}</div>;
}
function ToggleRow({ label, defaultOn, onToggle }: { label: string; defaultOn?: boolean; onToggle: (v: boolean) => void }) {
  const [on, setOn] = useState(!!defaultOn);
  return (
    <div className="flex items-center justify-between rounded-lg border border-border bg-background p-3">
      <span className="text-sm">{label}</span>
      <button onClick={() => { setOn(!on); onToggle(!on); }} className={`relative h-6 w-11 rounded-full ${on ? "bg-gradient-primary" : "bg-muted"}`}>
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${on ? "translate-x-5" : "translate-x-0.5"}`} />
      </button>
    </div>
  );
}
