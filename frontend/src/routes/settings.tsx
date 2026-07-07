import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Plus, Trash2, ExternalLink, X, ArrowUp, ArrowDown, Edit2, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useEdith, useHydrated } from "@/lib/store";
import { useConfirm } from "@/components/edith/ConfirmDialog";
import api from "@/lib/api";

export const Route = createFileRoute("/settings")({
  head: () => ({ meta: [{ title: "Settings — EDITH" }] }),
  component: Settings,
});

const cats = ["Profile", "Platform Accounts", "Payment Configuration", "Appearance", "Automation Rules", "Installed Plugins", "Data Management"];

function Settings() {
  const [cat, setCat] = useState(cats[0]);
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">Configure your profile, payments, and automation.</p>
      </div>
      <div className="grid gap-4 lg:grid-cols-[220px_1fr]">
        <div className="rounded-xl border border-border/60 bg-gradient-card p-2 shadow-card">
          {cats.map((c) => (
            <button key={c} onClick={() => setCat(c)}
              className={`block w-full rounded-md px-3 py-2 text-left text-sm ${cat === c ? "bg-primary/15 text-primary font-medium" : "text-muted-foreground hover:bg-card hover:text-foreground"}`}>
              {c}
            </button>
          ))}
        </div>
        <div className="rounded-xl border border-border/60 bg-gradient-card p-6 shadow-card">
          <h2 className="text-lg font-semibold">{cat}</h2>
          {cat === "Profile" && <ProfileSection />}
          {cat === "Platform Accounts" && <PlatformAccountsSection />}
          {cat === "Payment Configuration" && <PaymentSection />}
          {cat === "Appearance" && <AppearanceSection />}
          {cat === "Automation Rules" && <AutomationSection />}
          {cat === "Installed Plugins" && <PluginsSection />}
          {cat === "Data Management" && <DataSection />}
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}

function ProfileSection() {
  const profile = useHydrated((s) => s.profile, { name: "", email: "", headline: "", hourlyRate: "", skills: [], portfolioUrl: "" } as any);
  const setProfile = useEdith((s) => s.setProfile);
  const [skillInput, setSkillInput] = useState("");
  const [saving, setSaving] = useState(false);

  const onSave = async () => {
    setSaving(true);
    try {
      await api.auth.updateProfile({ profile });
      toast.success("Profile saved to server");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mt-4 space-y-4 max-w-xl">
      <div className="flex items-center gap-4">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-primary text-2xl font-bold text-primary-foreground">
          {profile.name.split(" ").map((p: string) => p[0]).join("").slice(0, 2)}
        </div>
        <button onClick={() => toast("Avatar upload coming soon")} className="rounded-lg border border-border px-3 py-2 text-sm hover:bg-card">Upload photo</button>
      </div>
      <Field label="Display Name"><input value={profile.name} onChange={(e) => setProfile({ name: e.target.value })} className="w-full rounded-lg border border-border bg-background/40 px-3 py-2 text-sm" /></Field>
      <Field label="Email"><input value={profile.email} onChange={(e) => setProfile({ email: e.target.value })} className="w-full rounded-lg border border-border bg-background/40 px-3 py-2 text-sm" /></Field>
      <Field label="Headline"><input value={profile.headline} onChange={(e) => setProfile({ headline: e.target.value })} className="w-full rounded-lg border border-border bg-background/40 px-3 py-2 text-sm" /></Field>
      <Field label="Hourly Rate"><input value={profile.hourlyRate} onChange={(e) => setProfile({ hourlyRate: e.target.value })} className="w-full rounded-lg border border-border bg-background/40 px-3 py-2 text-sm" /></Field>
      <Field label="Portfolio URL"><input value={profile.portfolioUrl} onChange={(e) => setProfile({ portfolioUrl: e.target.value })} className="w-full rounded-lg border border-border bg-background/40 px-3 py-2 text-sm" /></Field>
      <Field label="Skills">
        <div className="flex flex-wrap gap-1.5">
          {profile.skills.map((s: string) => (
            <span key={s} className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2 py-0.5 text-xs text-primary">
              {s}
              <button onClick={() => setProfile({ skills: profile.skills.filter((x: string) => x !== s) })}><X className="h-3 w-3" /></button>
            </span>
          ))}
          <input value={skillInput} onChange={(e) => setSkillInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && skillInput.trim()) { setProfile({ skills: [...profile.skills, skillInput.trim()] }); setSkillInput(""); } }}
            placeholder="Add skill, Enter…" className="rounded-full border border-dashed border-border bg-background/40 px-2 py-0.5 text-xs" />
        </div>
      </Field>
      <button onClick={onSave} disabled={saving} className="rounded-lg bg-gradient-primary px-5 py-2 text-sm font-semibold text-primary-foreground shadow-glow disabled:opacity-50">
        {saving ? "Saving..." : "Save Profile"}
      </button>
    </div>
  );
}

function PlatformAccountsSection() {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const confirm = useConfirm();

  // Form states
  const [platformName, setPlatformName] = useState("Upwork");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [profileUrl, setProfileUrl] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [connecting, setConnecting] = useState(false);

  const fetchAccounts = async () => {
    try {
      const res = await api.platform.accounts() as any;
      if (res?.data) {
        setAccounts(res.data);
      }
    } catch (err) {
      toast.error("Failed to load platform accounts");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      toast.error("Email/username and password are required");
      return;
    }
    setConnecting(true);
    try {
      await api.platform.connect({
        platformName,
        email,
        password,
        profileUrl: profileUrl.trim() || undefined
      });
      toast.success(`${platformName} account connected successfully.`);
      setModalOpen(false);
      setEmail("");
      setPassword("");
      setProfileUrl("");
      setShowPassword(false);
      fetchAccounts();
    } catch (err: any) {
      toast.error(err.message || "Failed to connect platform account");
    } finally {
      setConnecting(false);
    }
  };

  const handleDelete = async (id: string, name: string, mail: string) => {
    if (await confirm({
      title: "Disconnect account?",
      message: `Are you sure you want to disconnect ${name} (${mail})? Saved notifications and credentials will be removed.`,
      variant: "danger",
      confirmText: "Disconnect"
    })) {
      try {
        await api.platform.delete(id);
        toast.success("Account disconnected");
        fetchAccounts();
      } catch (err: any) {
        toast.error(err.message || "Failed to disconnect account");
      }
    }
  };

  const handleTest = async (id: string) => {
    toast.info("Testing platform connection...");
    try {
      const res = await api.platform.test(id) as any;
      if (res?.data?.success) {
        toast.success("Connection successful!");
      } else {
        toast.error("Connection failed. Check your login details.");
      }
      fetchAccounts();
    } catch (err: any) {
      toast.error(err.message || "Connection test error");
      fetchAccounts();
    }
  };

  const handleSync = async (id: string) => {
    toast.info("Synchronizing platform feed...");
    try {
      setAccounts(prev => prev.map(a => a.id === id ? { ...a, status: 'syncing' } : a));
      await api.platform.sync(id);
      toast.success("Synchronization complete.");
      fetchAccounts();
    } catch (err: any) {
      toast.error(err.message || "Synchronization failed");
      fetchAccounts();
    }
  };

  const getPlatformBadgeColor = (name: string) => {
    const n = name.toLowerCase();
    if (n.includes("upwork")) return "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
    if (n.includes("fiverr")) return "bg-green-500/10 text-green-500 border-green-500/20";
    if (n.includes("freelancer")) return "bg-blue-500/10 text-blue-500 border-blue-500/20";
    return "bg-muted text-muted-foreground border-border/40";
  };

  return (
    <div className="mt-4 space-y-6 max-w-2xl relative">
      <div className="space-y-4 rounded-xl border border-border/60 bg-gradient-card p-5 shadow-card">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">🔗 Connected Platforms</h3>
          <button
            onClick={() => setModalOpen(true)}
            className="inline-flex items-center gap-1 text-xs text-primary hover:underline hover:text-primary/80 transition-all font-semibold"
          >
            <Plus className="h-3.5 w-3.5" /> Connect Platform
          </button>
        </div>

        {loading ? (
          <p className="text-xs text-muted-foreground animate-pulse">Loading connected accounts...</p>
        ) : accounts.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/80 bg-card/20 py-8 px-4 text-center">
            <span className="text-2xl mb-2">🔗</span>
            <p className="text-sm font-medium">No accounts connected yet</p>
            <p className="text-xs text-muted-foreground mt-1 max-w-xs">
              Link Upwork, Fiverr, or Freelancer accounts to sync client messages and track contract proposals automatically.
            </p>
            <button
              onClick={() => setModalOpen(true)}
              className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-gradient-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow-glow"
            >
              <Plus className="h-3 w-3" /> Connect Account
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {accounts.map((acc) => (
              <div
                key={acc.id}
                className="flex flex-col md:flex-row justify-between md:items-center rounded-xl border p-4 shadow-sm bg-card/30 border-border/50 hover:border-primary/30 transition-all"
              >
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className={`rounded-md border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${getPlatformBadgeColor(acc.platformName)}`}>
                      {acc.platformName}
                    </span>
                    <span className="font-semibold text-sm text-foreground">{acc.email}</span>
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <div>
                      Status:{' '}
                      <span className={`font-semibold capitalize ${
                        acc.status === 'connected' ? 'text-success' :
                        acc.status === 'syncing' ? 'text-primary animate-pulse' : 'text-destructive'
                      }`}>{acc.status}</span>
                    </div>
                    {acc.lastSyncedAt && (
                      <div>
                        Synced: <span className="text-foreground">{new Date(acc.lastSyncedAt).toLocaleString()}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 mt-3 md:mt-0 justify-end">
                  <button
                    onClick={() => handleTest(acc.id)}
                    disabled={acc.status === 'syncing'}
                    className="px-2 py-1 text-xs rounded-lg border border-border text-muted-foreground hover:bg-card hover:text-foreground transition-all disabled:opacity-50"
                  >
                    Test
                  </button>
                  <button
                    onClick={() => handleSync(acc.id)}
                    disabled={acc.status === 'syncing'}
                    className="px-2 py-1 text-xs rounded-lg border border-border text-muted-foreground hover:bg-card hover:text-foreground transition-all disabled:opacity-50"
                  >
                    Sync Feed
                  </button>
                  <button
                    onClick={() => handleDelete(acc.id, acc.platformName, acc.email)}
                    className="p-1 text-xs rounded-lg border border-border text-muted-foreground hover:border-destructive hover:text-destructive transition-all"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm">
          <form onSubmit={handleConnect} className="relative w-full max-w-lg rounded-2xl border border-border/80 bg-gradient-card p-6 shadow-elevated">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="absolute right-4 top-4 rounded-lg p-1.5 text-muted-foreground hover:bg-card hover:text-foreground transition-all"
            >
              <X className="h-4 w-4" />
            </button>

            <h3 className="text-lg font-bold tracking-tight mb-1">CONNECT PLATFORM ACCOUNT</h3>
            <p className="text-xs text-muted-foreground mb-4">
              Enter your login credentials. Credentials will be securely stored using AES-256 encryption.
            </p>

            <div className="space-y-4">
              <Field label="Platform">
                <select
                  value={platformName}
                  onChange={(e) => setPlatformName(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background/40 px-3 py-2 text-sm"
                >
                  <option value="Upwork">Upwork</option>
                  <option value="Fiverr">Fiverr</option>
                  <option value="Freelancer">Freelancer</option>
                </select>
              </Field>

              <Field label="Email / Username">
                <input
                  type="text"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full rounded-lg border border-border bg-background/40 px-3 py-2 text-sm"
                />
              </Field>

              <Field label="Password">
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-lg border border-border bg-background/40 pl-3 pr-10 py-2 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-xs text-muted-foreground hover:text-foreground font-semibold"
                  >
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
              </Field>

              <Field label="Profile URL (Optional)">
                <input
                  type="url"
                  value={profileUrl}
                  onChange={(e) => setProfileUrl(e.target.value)}
                  placeholder="https://www.upwork.com/freelancers/~id"
                  className="w-full rounded-lg border border-border bg-background/40 px-3 py-2 text-sm"
                />
              </Field>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="px-4 py-2 text-sm rounded-lg border border-border text-muted-foreground hover:bg-card hover:text-foreground transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={connecting}
                className="px-4 py-2 text-sm font-semibold rounded-lg bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90 transition-all inline-flex items-center gap-1.5"
              >
                {connecting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Check className="h-4 w-4" />
                )}
                {connecting ? 'Connecting...' : 'Connect'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

function PaymentSection() {
  const ps = useHydrated((s) => s.paymentSettings, { defaultLink: "", businessName: "", invoicePrefix: "INV-", invoiceStartingNumber: 1001, currency: "USD", dueDays: 14, methods: [] as any[] } as any);
  const setPS = useEdith((s) => s.setPaymentSettings);
  const confirm = useConfirm();

  const [methods, setMethods] = useState<any[]>([]);
  const [loadingMethods, setLoadingMethods] = useState(true);
  const [saving, setSaving] = useState(false);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingMethod, setEditingMethod] = useState<any | null>(null);
  const [methodName, setMethodName] = useState("");
  const [methodType, setMethodType] = useState<string>("wire_transfer");
  const [methodActive, setMethodActive] = useState(true);
  const [methodDefault, setMethodDefault] = useState(false);
  const [details, setDetails] = useState<Record<string, any>>({});

  const fetchMethods = async () => {
    try {
      const res = await api.payment.methods() as any;
      if (res?.data) {
        setMethods(res.data);
      }
    } catch (err) {
      toast.error("Failed to load payment methods");
    } finally {
      setLoadingMethods(false);
    }
  };

  useEffect(() => {
    fetchMethods();
  }, []);

  const handleAddClick = () => {
    setEditingMethod(null);
    setMethodName("");
    setMethodType("wire_transfer");
    setMethodActive(true);
    setMethodDefault(false);
    setDetails({
      holder: "", bankName: "", accountNumber: "", routingNumber: "", swift: "", ifsc: "", notes: "",
      upiId: "", url: ""
    });
    setModalOpen(true);
  };

  const handleEditClick = (m: any) => {
    setEditingMethod(m);
    setMethodName(m.name);
    setMethodType(m.type);
    setMethodActive(m.isActive);
    setMethodDefault(m.isDefault);
    setDetails(m.details || {});
    setModalOpen(true);
  };

  const handleDeleteClick = async (id: string, name: string) => {
    if (await confirm({ title: "Delete payment method?", message: `"${name}" will be permanently removed.`, variant: "danger", confirmText: "Delete" })) {
      try {
        await api.payment.deleteMethod(id);
        toast.success("Payment method deleted");
        fetchMethods();
      } catch (err: any) {
        toast.error(err.message || "Failed to delete payment method");
      }
    }
  };

  const handleToggleActive = async (m: any) => {
    try {
      const updated = !m.isActive;
      await api.payment.updateMethod(m.id, { isActive: updated });
      toast.success(`"${m.name}" is now ${updated ? "active" : "inactive"}`);
      fetchMethods();
    } catch (err: any) {
      toast.error(err.message || "Failed to toggle status");
    }
  };

  const handleSetDefault = async (id: string | null) => {
    try {
      await api.payment.setDefault({ id });
      toast.success("Default payment method updated");
      fetchMethods();
    } catch (err: any) {
      toast.error(err.message || "Failed to set default method");
    }
  };

  const handleMove = async (index: number, direction: 'up' | 'down') => {
    const nextIndex = direction === 'up' ? index - 1 : index + 1;
    if (nextIndex < 0 || nextIndex >= methods.length) return;
    
    const newMethods = [...methods];
    const temp = newMethods[index];
    newMethods[index] = newMethods[nextIndex];
    newMethods[nextIndex] = temp;
    
    setMethods(newMethods);
    
    try {
      await api.payment.reorderMethods({ ids: newMethods.map(m => m.id) });
      toast.success("Order updated");
      fetchMethods();
    } catch (err: any) {
      toast.error(err.message || "Failed to reorder methods");
      fetchMethods();
    }
  };

  const handleSaveMethod = async () => {
    if (!methodName.trim()) {
      toast.error("Method name is required");
      return;
    }

    let cleanedDetails: Record<string, any> = {};
    if (methodType === 'wire_transfer') {
      cleanedDetails = {
        holder: details.holder || "",
        bankName: details.bankName || "",
        accountNumber: details.accountNumber || "",
        routingNumber: details.routingNumber || "",
        swift: details.swift || "",
        ifsc: details.ifsc || "",
        notes: details.notes || "",
      };
    } else if (methodType === 'wise_transfer') {
      cleanedDetails = {
        holder: details.holder || "",
        bankName: details.bankName || "",
        accountNumber: details.accountNumber || "",
        routingNumber: details.routingNumber || "",
        notes: details.notes || "",
      };
    } else if (methodType === 'upi') {
      cleanedDetails = {
        upiId: details.upiId || "",
      };
    } else if (['paypal', 'stripe_link', 'razorpay_link', 'custom_url'].includes(methodType)) {
      cleanedDetails = {
        url: details.url || "",
      };
    } else if (methodType === 'other') {
      cleanedDetails = {
        notes: details.notes || "",
      };
    }

    try {
      if (editingMethod) {
        await api.payment.updateMethod(editingMethod.id, {
          name: methodName,
          type: methodType,
          details: cleanedDetails,
          isActive: methodActive,
          isDefault: methodDefault,
        });
        toast.success("Payment method updated");
      } else {
        await api.payment.createMethod({
          name: methodName,
          type: methodType,
          details: cleanedDetails,
          isActive: methodActive,
          isDefault: methodDefault,
        });
        toast.success("Payment method created");
      }
      setModalOpen(false);
      fetchMethods();
    } catch (err: any) {
      toast.error(err.message || "Failed to save payment method");
    }
  };

  const onSaveSettings = async () => {
    setSaving(true);
    try {
      await api.auth.paymentSettings(ps);
      toast.success("Payment settings saved to server");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save payment settings");
    } finally {
      setSaving(false);
    }
  };

  const renderCardDetails = (m: any) => {
    const d = m.details || {};
    switch (m.type) {
      case 'wire_transfer':
      case 'wise_transfer':
        return (
          <div className="text-xs text-muted-foreground mt-1.5 space-y-0.5 font-mono">
            <div>Type: <span className="text-foreground font-sans capitalize">{m.type.replace('_', ' ')}</span></div>
            {d.bankName && <div>Bank: <span className="text-foreground">{d.bankName}</span></div>}
            {d.accountNumber && (
              <div>Account: <span className="text-foreground">****{d.accountNumber.slice(-4)}</span></div>
            )}
          </div>
        );
      case 'upi':
        return (
          <div className="text-xs text-muted-foreground mt-1.5 space-y-0.5 font-mono">
            <div>Type: <span className="text-foreground font-sans">UPI</span></div>
            {d.upiId && <div>UPI ID: <span className="text-foreground font-sans">{d.upiId}</span></div>}
          </div>
        );
      case 'paypal':
      case 'stripe_link':
      case 'razorpay_link':
      case 'custom_url':
        return (
          <div className="text-xs text-muted-foreground mt-1.5 space-y-0.5 font-mono">
            <div>Type: <span className="text-foreground font-sans capitalize">{m.type.replace('_', ' ')}</span></div>
            {d.url && <div className="truncate">URL: <span className="text-foreground underline font-sans cursor-pointer hover:text-primary transition-colors" onClick={() => window.open(d.url, "_blank")}>{d.url}</span></div>}
          </div>
        );
      default:
        return (
          <div className="text-xs text-muted-foreground mt-1.5 space-y-0.5">
            <div>Type: <span className="text-foreground capitalize">{m.type}</span></div>
            {d.notes && <div className="truncate">Notes: <span className="text-foreground">{d.notes}</span></div>}
          </div>
        );
    }
  };

  const defaultMethodId = methods.find(m => m.isDefault)?.id || "";

  return (
    <div className="mt-4 space-y-6 max-w-2xl relative">
      <div className="space-y-4 rounded-xl border border-border/60 bg-gradient-card p-5 shadow-card">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">💳 Payment Configuration</h3>
        
        <div>
          <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted-foreground">Default Payment Method</label>
          <select 
            value={defaultMethodId} 
            onChange={(e) => handleSetDefault(e.target.value || null)} 
            className="w-full rounded-lg border border-border bg-background/40 px-3 py-2 text-sm"
          >
            <option value="">No default method</option>
            {methods.map((m) => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
          <p className="mt-1 text-xs text-muted-foreground">This method will be pre-selected in the invoice generator.</p>
        </div>

        <div className="border-t border-border/40 pt-4">
          <div className="mb-3 flex items-center justify-between">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Your Payment Methods</h4>
            <button 
              onClick={handleAddClick} 
              className="inline-flex items-center gap-1 text-xs text-primary hover:underline hover:text-primary/80 transition-all font-semibold"
            >
              <Plus className="h-3.5 w-3.5" /> Add Payment Method
            </button>
          </div>

          {loadingMethods ? (
            <p className="text-xs text-muted-foreground animate-pulse">Loading methods...</p>
          ) : methods.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/80 bg-card/20 py-8 px-4 text-center">
              <span className="text-2xl mb-2">💳</span>
              <p className="text-sm font-medium">No payment methods yet</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-xs">Add your first payment method to start receiving payments from clients.</p>
              <button 
                onClick={handleAddClick} 
                className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-gradient-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow-glow"
              >
                <Plus className="h-3 w-3" /> Add Payment Method
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {methods.map((m, idx) => (
                <div 
                  key={m.id} 
                  className={`flex flex-col md:flex-row justify-between md:items-center rounded-xl border p-4 shadow-sm transition-all bg-card/30 border-border/50 hover:border-primary/30`}
                >
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <span 
                      onClick={() => handleToggleActive(m)}
                      title={m.isActive ? "Click to deactivate" : "Click to activate"}
                      className={`h-2.5 w-2.5 rounded-full mt-1.5 shrink-0 cursor-pointer shadow-sm transition-all ${
                        m.isActive 
                          ? "bg-success shadow-[0_0_8px_var(--success)]" 
                          : "bg-muted-foreground/40"
                      }`}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm truncate">{m.name}</span>
                        {m.isDefault && (
                          <span className="rounded bg-primary/10 border border-primary/20 px-1 py-0.2 text-[9px] text-primary uppercase font-bold tracking-wider">Default</span>
                        )}
                        {!m.isActive && (
                          <span className="rounded bg-muted border border-border/80 px-1 py-0.2 text-[9px] text-muted-foreground uppercase font-bold tracking-wider">Inactive</span>
                        )}
                      </div>
                      {renderCardDetails(m)}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mt-3 md:mt-0 justify-end">
                    <button 
                      onClick={() => handleMove(idx, 'up')} 
                      disabled={idx === 0}
                      className="p-1 rounded-lg border border-border text-muted-foreground hover:bg-card hover:text-foreground disabled:opacity-30 transition-all"
                    >
                      <ArrowUp className="h-3.5 w-3.5" />
                    </button>
                    <button 
                      onClick={() => handleMove(idx, 'down')} 
                      disabled={idx === methods.length - 1}
                      className="p-1 rounded-lg border border-border text-muted-foreground hover:bg-card hover:text-foreground disabled:opacity-30 transition-all"
                    >
                      <ArrowDown className="h-3.5 w-3.5" />
                    </button>
                    <button 
                      onClick={() => handleEditClick(m)}
                      className="px-2 py-1 text-xs rounded-lg border border-border text-muted-foreground hover:bg-card hover:text-foreground transition-all inline-flex items-center gap-1"
                    >
                      <Edit2 className="h-3 w-3" /> Edit
                    </button>
                    <button 
                      onClick={() => handleDeleteClick(m.id, m.name)}
                      className="px-2 py-1 text-xs rounded-lg border border-border text-muted-foreground hover:border-destructive hover:text-destructive transition-all inline-flex items-center gap-1"
                    >
                      <Trash2 className="h-3 w-3" /> Del
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="space-y-4 rounded-xl border border-border/60 bg-gradient-card p-5 shadow-card">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">🏢 Invoice & Business Details</h3>
        
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Business Name"><input value={ps.businessName} onChange={(e) => setPS({ businessName: e.target.value })} className="w-full rounded-lg border border-border bg-background/40 px-3 py-2 text-sm" /></Field>
          <Field label="Tax ID"><input value={ps.taxId || ""} onChange={(e) => setPS({ taxId: e.target.value })} className="w-full rounded-lg border border-border bg-background/40 px-3 py-2 text-sm" /></Field>
          <Field label="Logo URL"><input value={ps.logoUrl || ""} onChange={(e) => setPS({ logoUrl: e.target.value })} className="w-full rounded-lg border border-border bg-background/40 px-3 py-2 text-sm" /></Field>
          <Field label="Currency">
            <select value={ps.currency} onChange={(e) => setPS({ currency: e.target.value })} className="w-full rounded-lg border border-border bg-background/40 px-3 py-2 text-sm">
              {["USD", "EUR", "GBP", "INR", "CAD", "AUD"].map((c) => <option key={c}>{c}</option>)}
            </select>
          </Field>
          <div className="md:col-span-2"><Field label="Business Address"><textarea value={ps.businessAddress || ""} onChange={(e) => setPS({ businessAddress: e.target.value })} rows={2} className="w-full rounded-lg border border-border bg-background/40 px-3 py-2 text-sm" /></Field></div>
          <Field label="Invoice Prefix"><input value={ps.invoicePrefix} onChange={(e) => setPS({ invoicePrefix: e.target.value })} className="w-full rounded-lg border border-border bg-background/40 px-3 py-2 text-sm font-mono" /></Field>
          <Field label="Starting Number"><input type="number" value={ps.invoiceStartingNumber} onChange={(e) => setPS({ invoiceStartingNumber: Number(e.target.value) })} className="w-full rounded-lg border border-border bg-background/40 px-3 py-2 text-sm font-mono" /></Field>
          <Field label="Due in (days)"><input type="number" value={ps.dueDays} onChange={(e) => setPS({ dueDays: Number(e.target.value) })} className="w-full rounded-lg border border-border bg-background/40 px-3 py-2 text-sm font-mono" /></Field>
        </div>
      </div>

      <button onClick={onSaveSettings} disabled={saving} className="rounded-lg bg-gradient-primary px-5 py-2 text-sm font-semibold text-primary-foreground shadow-glow disabled:opacity-50">
        {saving ? "Saving..." : "Save Business Settings"}
      </button>

      {/* Add/Edit Payment Method Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-lg overflow-y-auto rounded-2xl border border-border/80 bg-gradient-card p-6 shadow-elevated max-h-[90vh]">
            <button 
              onClick={() => setModalOpen(false)} 
              className="absolute right-4 top-4 rounded-lg p-1.5 text-muted-foreground hover:bg-card hover:text-foreground transition-all"
            >
              <X className="h-4 w-4" />
            </button>
            
            <h3 className="text-lg font-bold tracking-tight mb-1">{editingMethod ? "EDIT PAYMENT METHOD" : "ADD PAYMENT METHOD"}</h3>
            <p className="text-xs text-muted-foreground mb-4">Configure a payment method to display on client invoices.</p>

            <div className="space-y-4">
              <Field label="Method Name">
                <input 
                  value={methodName} 
                  onChange={(e) => setMethodName(e.target.value)} 
                  placeholder="e.g. Wise US Account" 
                  className="w-full rounded-lg border border-border bg-background/40 px-3 py-2 text-sm"
                />
              </Field>

              <Field label="Type">
                <select 
                  value={methodType} 
                  onChange={(e) => setMethodType(e.target.value)} 
                  className="w-full rounded-lg border border-border bg-background/40 px-3 py-2 text-sm"
                >
                  <option value="wire_transfer">Wire Transfer (Bank Details)</option>
                  <option value="wise_transfer">Wise Transfer (US Account)</option>
                  <option value="upi">UPI</option>
                  <option value="paypal">PayPal Link</option>
                  <option value="stripe_link">Stripe Payment Link</option>
                  <option value="razorpay_link">Razorpay Payment Link</option>
                  <option value="custom_url">Custom URL</option>
                  <option value="other">Other (Free Text)</option>
                </select>
              </Field>

              <div className="flex items-center justify-between py-2 border-y border-border/30">
                <div>
                  <p className="text-sm font-semibold">Status</p>
                  <p className="text-xs text-muted-foreground">Toggles visibility in invoice creation dropdown.</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">{methodActive ? "Active" : "Inactive"}</span>
                  <Toggle on={methodActive} onChange={setMethodActive} />
                </div>
              </div>

              {/* Dynamic Type-specific fields */}
              <div className="space-y-3 pt-2">
                {(methodType === "wire_transfer" || methodType === "wise_transfer") && (
                  <>
                    <Field label="Account Holder">
                      <input 
                        value={details.holder || ""} 
                        onChange={(e) => setDetails({ ...details, holder: e.target.value })} 
                        placeholder="e.g. John Doe"
                        className="w-full rounded-lg border border-border bg-background/40 px-3 py-2 text-sm"
                      />
                    </Field>
                    <Field label="Bank Name">
                      <input 
                        value={details.bankName || ""} 
                        onChange={(e) => setDetails({ ...details, bankName: e.target.value })} 
                        placeholder="e.g. Community Federal Savings Bank"
                        className="w-full rounded-lg border border-border bg-background/40 px-3 py-2 text-sm"
                      />
                    </Field>
                    <Field label="Account Number">
                      <input 
                        value={details.accountNumber || ""} 
                        onChange={(e) => setDetails({ ...details, accountNumber: e.target.value })} 
                        placeholder="Account number"
                        className="w-full rounded-lg border border-border bg-background/40 px-3 py-2 text-sm"
                      />
                    </Field>
                    <Field label="Routing Number">
                      <input 
                        value={details.routingNumber || ""} 
                        onChange={(e) => setDetails({ ...details, routingNumber: e.target.value })} 
                        placeholder="Routing number"
                        className="w-full rounded-lg border border-border bg-background/40 px-3 py-2 text-sm font-mono"
                      />
                    </Field>
                  </>
                )}

                {methodType === "wire_transfer" && (
                  <>
                    <Field label="SWIFT Code">
                      <input 
                        value={details.swift || ""} 
                        onChange={(e) => setDetails({ ...details, swift: e.target.value })} 
                        placeholder="SWIFT code"
                        className="w-full rounded-lg border border-border bg-background/40 px-3 py-2 text-sm font-mono"
                      />
                    </Field>
                    <Field label="IFSC Code">
                      <input 
                        value={details.ifsc || ""} 
                        onChange={(e) => setDetails({ ...details, ifsc: e.target.value })} 
                        placeholder="IFSC code (for Indian banks)"
                        className="w-full rounded-lg border border-border bg-background/40 px-3 py-2 text-sm font-mono"
                      />
                    </Field>
                  </>
                )}

                {methodType === "upi" && (
                  <Field label="UPI ID">
                    <input 
                      value={details.upiId || ""} 
                      onChange={(e) => setDetails({ ...details, upiId: e.target.value })} 
                      placeholder="e.g. username@upi"
                      className="w-full rounded-lg border border-border bg-background/40 px-3 py-2 text-sm"
                    />
                  </Field>
                )}

                {methodType === "paypal" && (
                  <Field label="PayPal.Me URL or Email">
                    <input 
                      value={details.url || ""} 
                      onChange={(e) => setDetails({ ...details, url: e.target.value })} 
                      placeholder="e.g. https://paypal.me/username or user@email.com"
                      className="w-full rounded-lg border border-border bg-background/40 px-3 py-2 text-sm"
                    />
                  </Field>
                )}

                {(methodType === "stripe_link" || methodType === "razorpay_link" || methodType === "custom_url") && (
                  <Field label={methodType === "custom_url" ? "Any URL" : "Payment Link URL"}>
                    <input 
                      value={details.url || ""} 
                      onChange={(e) => setDetails({ ...details, url: e.target.value })} 
                      placeholder="e.g. https://buy.stripe.com/..."
                      className="w-full rounded-lg border border-border bg-background/40 px-3 py-2 text-sm"
                    />
                  </Field>
                )}

                {(methodType === "wire_transfer" || methodType === "wise_transfer" || methodType === "other") && (
                  <Field label="Notes / Instruction Text">
                    <textarea 
                      value={details.notes || ""} 
                      onChange={(e) => setDetails({ ...details, notes: e.target.value })} 
                      placeholder="Include instructions or notes for reference..."
                      rows={3}
                      className="w-full rounded-lg border border-border bg-background/40 px-3 py-2 text-sm"
                    />
                  </Field>
                )}
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button 
                onClick={() => setModalOpen(false)}
                className="px-4 py-2 text-sm rounded-lg border border-border text-muted-foreground hover:bg-card hover:text-foreground transition-all"
              >
                Cancel
              </button>
              <button 
                onClick={handleSaveMethod}
                className="px-4 py-2 text-sm font-semibold rounded-lg bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90 transition-all inline-flex items-center gap-1.5"
              >
                <Check className="h-4 w-4" /> Save Method
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AppearanceSection() {
  const theme = useHydrated((s) => s.theme, "dark" as "dark" | "light");
  const setTheme = useEdith((s) => s.setTheme);
  const accent = useHydrated((s) => s.accentColor, "#7C3AED");
  const setAccent = useEdith((s) => s.setAccentColor);

  return (
    <div className="mt-4 space-y-4 max-w-xl">
      <Field label="Theme">
        <div className="flex gap-2">
          {(["dark", "light"] as const).map((t) => (
            <button key={t} onClick={() => setTheme(t)}
              className={`rounded-lg border px-4 py-2 text-sm capitalize ${theme === t ? "border-primary bg-primary/15 text-primary" : "border-border"}`}>{t}</button>
          ))}
        </div>
      </Field>
      <Field label="Accent Color">
        <div className="flex gap-2">
          {["#7C3AED", "#06D6A0", "#F59E0B", "#EF4444", "#3B82F6", "#EC4899"].map((c) => (
            <button key={c} onClick={() => { setAccent(c); toast.success("Accent color updated"); }}
              className={`h-8 w-8 rounded-full border-2 ${accent === c ? "border-foreground" : "border-border"}`} style={{ background: c }} />
          ))}
        </div>
      </Field>
    </div>
  );
}

function AutomationSection() {
  const auto = useHydrated((s) => s.automation, {} as Record<string, boolean>);
  const setAuto = useEdith((s) => s.setAutomation);
  const cfg = useHydrated((s) => s.automationConfig, { scanFrequencyHours: 4, killRoasBelow: 1.0, scaleRoasAbove: 2.5 });
  const setCfg = useEdith((s) => s.setAutomationConfig);

  const rules = [
    ["Auto-scan jobs", `Every ${cfg.scanFrequencyHours} hours`],
    ["Auto-scan products", `Every ${cfg.scanFrequencyHours} hours`],
    ["Auto-generate proposals", "Requires approval"],
    ["Auto-execute contracts", "Let AI execute swarms automatically"],
    ["Auto-kill ads below ROAS", `< ${cfg.killRoasBelow}x`],
    ["Auto-scale ads above ROAS", `> ${cfg.scaleRoasAbove}x`],
    ["Email notifications", "Daily digest"],
  ];

  const handleToggle = async (key: string, val: boolean) => {
    setAuto(key, val);
    toast.success(`${key}: ${val ? "on" : "off"}`);
    try {
      const mergedPrefs = { ...auto, ...cfg, [key]: val };
      await api.auth.updateProfile({ preferences: mergedPrefs });
    } catch (err) {
      console.error("Failed to save automation rule to backend", err);
    }
  };

  const handleConfigChange = async (patch: Partial<typeof cfg>) => {
    setCfg(patch);
    try {
      const mergedPrefs = { ...auto, ...cfg, ...patch };
      await api.auth.updateProfile({ preferences: mergedPrefs });
    } catch (err) {
      console.error("Failed to save automation config to backend", err);
    }
  };

  return (
    <div className="mt-4 space-y-3 max-w-xl">
      {rules.map(([l, v]) => (
        <div key={l} className="flex items-center justify-between rounded-lg border border-border/60 bg-card/40 p-3">
          <div><p className="text-sm font-medium">{l}</p><p className="text-xs text-muted-foreground">{v}</p></div>
          <Toggle on={!!auto[l]} onChange={(v) => handleToggle(l, v)} />
        </div>
      ))}
      <div className="grid gap-3 md:grid-cols-3 pt-2">
        <Field label="Scan frequency (h)"><input type="number" value={cfg.scanFrequencyHours} onChange={(e) => handleConfigChange({ scanFrequencyHours: Number(e.target.value) })} className="w-full rounded-lg border border-border bg-background/40 px-3 py-2 text-sm" /></Field>
        <Field label="Kill ROAS below"><input type="number" step="0.1" value={cfg.killRoasBelow} onChange={(e) => handleConfigChange({ killRoasBelow: Number(e.target.value) })} className="w-full rounded-lg border border-border bg-background/40 px-3 py-2 text-sm" /></Field>
        <Field label="Scale ROAS above"><input type="number" step="0.1" value={cfg.scaleRoasAbove} onChange={(e) => handleConfigChange({ scaleRoasAbove: Number(e.target.value) })} className="w-full rounded-lg border border-border bg-background/40 px-3 py-2 text-sm" /></Field>
      </div>
    </div>
  );
}

function PluginsSection() {
  const installed = useHydrated((s) => s.installedPlugins, [] as string[]);
  const uninstall = useEdith((s) => s.uninstallPlugin);
  const confirm = useConfirm();

  if (installed.length === 0) return <p className="mt-4 text-sm text-muted-foreground">No plugins installed yet. Visit the Marketplace to browse.</p>;

  return (
    <div className="mt-4 space-y-2 max-w-xl">
      {installed.map((id) => (
        <div key={id} className="flex items-center justify-between rounded-lg border border-border bg-card/40 p-3">
          <div>
            <p className="text-sm font-medium">{id}</p>
            <p className="text-xs text-muted-foreground">Active · Auto-updates enabled</p>
          </div>
          <button onClick={async () => {
            if (await confirm({ title: "Uninstall plugin?", message: id, variant: "danger", confirmText: "Uninstall" })) {
              uninstall(id); toast.success(`${id} uninstalled`);
            }
          }} className="text-xs text-destructive hover:underline">Uninstall</button>
        </div>
      ))}
    </div>
  );
}

function DataSection() {
  const reset = useEdith((s) => s.resetAll);
  const setOnboarding = useEdith((s) => s.setOnboardingComplete);
  const confirm = useConfirm();

  const exportAll = () => {
    const data = useEdith.getState();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `edith-export-${Date.now()}.json`; a.click();
    toast.success("Data exported");
  };

  return (
    <div className="mt-4 space-y-3 max-w-xl">
      <button onClick={exportAll} className="w-full rounded-lg border border-border bg-card/40 p-3 text-left text-sm hover:bg-card">Export All Data (JSON)</button>
      <button onClick={() => { setOnboarding(false); toast.success("Onboarding wizard will appear on next reload"); }} className="w-full rounded-lg border border-border bg-card/40 p-3 text-left text-sm hover:bg-card">Re-run Onboarding Wizard</button>
      <button onClick={async () => {
        if (await confirm({ title: "Reset all data?", message: "All your jobs, proposals, invoices, files, settings will be wiped and replaced with demo data.", variant: "danger", confirmText: "Reset", requireType: "RESET" })) {
          reset(); toast.success("Reset to demo data");
        }
      }} className="w-full rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-left text-sm text-destructive hover:bg-destructive/20">Reset to Demo Data</button>
    </div>
  );
}

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!on)} className={`relative h-6 w-11 rounded-full transition-colors ${on ? "bg-gradient-primary" : "bg-muted"}`}>
      <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${on ? "translate-x-5" : "translate-x-0.5"}`} />
    </button>
  );
}
