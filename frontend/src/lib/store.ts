import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import {
  jobs as seedJobs, products as seedProducts, agents as seedAgents,
  initialActiveJobs, initialCompleted, initialFiles, initialInvoices, initialChat,
  initialAlerts, initialActivity, initialProposals,
  type ActiveJob, type CompletedJob, type StoredFile, type StoredInvoice, type ChatMsg,
} from "./mockData";

export type Job = (typeof seedJobs)[number] & { saved?: boolean; dismissed?: boolean };
export type Product = (typeof seedProducts)[number] & { saved?: boolean; dismissed?: boolean };

export type Proposal = {
  id: string; jobId: number; client: string; job: string; budget: string;
  platform: string; preview: string; body: string;
  status: "draft" | "sent" | "accepted" | "rejected"; createdAt: string;
};

export type UserProfile = {
  name: string; email: string; headline: string; hourlyRate: string;
  skills: string[]; portfolioUrl: string; avatarUrl?: string;
};

export type PaymentMethodAlt = { id: string; type: string; link: string };

export type PaymentSettings = {
  defaultLink: string; businessName: string; logoUrl: string; taxId: string;
  businessAddress: string; invoicePrefix: string; invoiceStartingNumber: number;
  currency: string; dueDays: number; methods: PaymentMethodAlt[];
};

export type Agent = (typeof seedAgents)[number] & { paused?: boolean; config?: { model: string; temperature: number; threshold: number } };

type Store = {
  // user (no auth — always "logged in")
  profile: UserProfile;
  setProfile: (p: Partial<UserProfile>) => void;

  paymentSettings: PaymentSettings;
  setPaymentSettings: (p: Partial<PaymentSettings>) => void;
  addPaymentMethod: () => void;
  updatePaymentMethod: (id: string, patch: Partial<PaymentMethodAlt>) => void;
  removePaymentMethod: (id: string) => void;

  // freelance
  jobs: Job[];
  addJobs: (j: Job[]) => void;
  toggleSavedJob: (id: number) => void;
  dismissJob: (id: number) => void;
  restoreJob: (id: number) => void;

  proposals: Proposal[];
  addProposal: (p: Proposal) => void;
  updateProposal: (id: string, patch: Partial<Proposal>) => void;
  removeProposal: (id: string) => void;

  activeJobs: ActiveJob[];
  setActiveJobs: (a: ActiveJob[]) => void;
  updateActiveJob: (id: string, patch: Partial<ActiveJob>) => void;
  addActiveJob: (a: ActiveJob) => void;
  completeActiveJob: (id: string) => void;

  completed: CompletedJob[];
  markInvoiced: (id: string) => void;

  // dropshipping
  products: Product[];
  toggleSavedProduct: (id: number) => void;
  dismissProduct: (id: number) => void;

  // marketplace
  installedPlugins: string[];
  installPlugin: (id: string) => void;
  uninstallPlugin: (id: string) => void;

  // agents
  agents: Agent[];
  toggleAgent: (name: string) => void;
  configureAgent: (name: string, config: Agent["config"]) => void;

  // files
  files: StoredFile[];
  folders: string[];
  addFile: (f: StoredFile) => void;
  removeFile: (id: string) => void;
  renameFile: (id: string, name: string) => void;
  moveFile: (id: string, folder: string) => void;
  addFolder: (name: string) => void;

  // invoices
  invoices: StoredInvoice[];
  addInvoice: (i: StoredInvoice) => void;
  updateInvoice: (id: string, patch: Partial<StoredInvoice>) => void;
  removeInvoice: (id: string) => void;

  // chat
  chat: ChatMsg[];
  addChatMsg: (m: ChatMsg) => void;
  clearChat: () => void;

  // dashboard
  alerts: typeof initialAlerts;
  dismissAlert: (id: number) => void;
  activity: typeof initialActivity;
  logActivity: (text: string, cat: "freelance" | "drop") => void;

  // ui
  theme: "dark" | "light";
  setTheme: (t: "dark" | "light") => void;
  accentColor: string;
  setAccentColor: (c: string) => void;
  onboardingComplete: boolean;
  setOnboardingComplete: (v: boolean) => void;

  // automation
  automation: Record<string, boolean>;
  setAutomation: (k: string, v: boolean) => void;
  automationConfig: { scanFrequencyHours: number; killRoasBelow: number; scaleRoasAbove: number };
  setAutomationConfig: (p: Partial<Store["automationConfig"]>) => void;

  // referrals
  referralEarnings: number;
  referralCode: string;

  // reset
  resetAll: () => void;
};

const defaultProfile: UserProfile = {
  name: "Alex Morgan",
  email: "alex@edith.ai",
  headline: "AI-Powered Freelancer & E-Commerce Operator",
  hourlyRate: "$45",
  skills: ["Content Writing", "SEO", "Product Descriptions", "Shopify", "Graphic Design"],
  portfolioUrl: "https://portfolio.edith.ai",
};

const defaultPayment: PaymentSettings = {
  defaultLink: "https://buy.stripe.com/test_abc123",
  businessName: "EDITH Agency",
  logoUrl: "",
  taxId: "",
  businessAddress: "",
  invoicePrefix: "INV-",
  invoiceStartingNumber: 1001,
  currency: "USD",
  dueDays: 14,
  methods: [{ id: "m1", type: "PayPal", link: "https://paypal.me/alexmorgan" }],
};

const seedAgentsWithState: Agent[] = seedAgents.map((a) => ({ ...a, paused: false, config: { model: "gpt-5", temperature: 0.7, threshold: 80 } }));

const initial = {
  profile: defaultProfile,
  paymentSettings: defaultPayment,
  jobs: seedJobs.map((j) => ({ ...j })),
  proposals: [...initialProposals],
  activeJobs: [...initialActiveJobs],
  completed: [...initialCompleted],
  products: seedProducts.map((p) => ({ ...p })),
  installedPlugins: [] as string[],
  agents: seedAgentsWithState,
  files: [...initialFiles],
  folders: ["Deliverables", "Invoices", "Assets", "Portfolio", "Archives"],
  invoices: [...initialInvoices],
  chat: [...initialChat],
  alerts: [...initialAlerts],
  activity: [...initialActivity],
  theme: "dark" as const,
  accentColor: "#7C3AED",
  onboardingComplete: false,
  automation: {
    "Auto-scan jobs": true,
    "Auto-scan products": true,
    "Auto-generate proposals": true,
    "Auto-kill ads below ROAS": true,
    "Auto-scale ads above ROAS": false,
    "Email notifications": true,
  },
  automationConfig: { scanFrequencyHours: 4, killRoasBelow: 1.0, scaleRoasAbove: 2.5 },
  referralEarnings: 0,
  referralCode: "",
};

export const useEdith = create<Store>()(
  persist(
    (set) => ({
      ...initial,
      setProfile: (p) => set((s) => ({ profile: { ...s.profile, ...p } })),
      setPaymentSettings: (p) => set((s) => ({ paymentSettings: { ...s.paymentSettings, ...p } })),
      addPaymentMethod: () => set((s) => ({ paymentSettings: { ...s.paymentSettings, methods: [...s.paymentSettings.methods, { id: crypto.randomUUID(), type: "PayPal", link: "" }] } })),
      updatePaymentMethod: (id, patch) => set((s) => ({ paymentSettings: { ...s.paymentSettings, methods: s.paymentSettings.methods.map((m) => (m.id === id ? { ...m, ...patch } : m)) } })),
      removePaymentMethod: (id) => set((s) => ({ paymentSettings: { ...s.paymentSettings, methods: s.paymentSettings.methods.filter((m) => m.id !== id) } })),

      addJobs: (j) => set((s) => ({ jobs: [...j, ...s.jobs] })),
      toggleSavedJob: (id) => set((s) => ({ jobs: s.jobs.map((j) => (j.id === id ? { ...j, saved: !j.saved } : j)) })),
      dismissJob: (id) => set((s) => ({ jobs: s.jobs.map((j) => (j.id === id ? { ...j, dismissed: true } : j)) })),
      restoreJob: (id) => set((s) => ({ jobs: s.jobs.map((j) => (j.id === id ? { ...j, dismissed: false } : j)) })),

      addProposal: (p) => set((s) => ({ proposals: [p, ...s.proposals] })),
      updateProposal: (id, patch) => set((s) => ({ proposals: s.proposals.map((p) => (p.id === id ? { ...p, ...patch } : p)) })),
      removeProposal: (id) => set((s) => ({ proposals: s.proposals.filter((p) => p.id !== id) })),

      setActiveJobs: (activeJobs) => set({ activeJobs }),
      updateActiveJob: (id, patch) => set((s) => ({ activeJobs: s.activeJobs.map((j) => (j.id === id ? { ...j, ...patch } : j)) })),
      addActiveJob: (a) => set((s) => ({ activeJobs: [a, ...s.activeJobs] })),
      completeActiveJob: (id) => set((s) => {
        const job = s.activeJobs.find((j) => j.id === id);
        if (!job) return s;
        const completed: CompletedJob = { id: job.id, client: job.client, title: job.title, amount: job.budget, rating: 5, date: new Date().toISOString().slice(0, 10), platform: "Upwork", domain: "Content", invoiced: false };
        return { activeJobs: s.activeJobs.filter((j) => j.id !== id), completed: [completed, ...s.completed] };
      }),

      markInvoiced: (id) => set((s) => ({ completed: s.completed.map((c) => (c.id === id ? { ...c, invoiced: true } : c)) })),

      toggleSavedProduct: (id) => set((s) => ({ products: s.products.map((p) => (p.id === id ? { ...p, saved: !p.saved } : p)) })),
      dismissProduct: (id) => set((s) => ({ products: s.products.map((p) => (p.id === id ? { ...p, dismissed: true } : p)) })),

      installPlugin: (id) => set((s) => (s.installedPlugins.includes(id) ? s : { installedPlugins: [...s.installedPlugins, id] })),
      uninstallPlugin: (id) => set((s) => ({ installedPlugins: s.installedPlugins.filter((p) => p !== id) })),

      toggleAgent: (name) => set((s) => ({ agents: s.agents.map((a) => (a.name === name ? { ...a, paused: !a.paused } : a)) })),
      configureAgent: (name, config) => set((s) => ({ agents: s.agents.map((a) => (a.name === name ? { ...a, config } : a)) })),

      addFile: (f) => set((s) => ({ files: [f, ...s.files] })),
      removeFile: (id) => set((s) => ({ files: s.files.filter((f) => f.id !== id) })),
      renameFile: (id, name) => set((s) => ({ files: s.files.map((f) => (f.id === id ? { ...f, name } : f)) })),
      moveFile: (id, folder) => set((s) => ({ files: s.files.map((f) => (f.id === id ? { ...f, folder } : f)) })),
      addFolder: (name) => set((s) => (s.folders.includes(name) ? s : { folders: [...s.folders, name] })),

      addInvoice: (i) => set((s) => ({ invoices: [i, ...s.invoices] })),
      updateInvoice: (id, patch) => set((s) => ({ invoices: s.invoices.map((i) => (i.id === id ? { ...i, ...patch } : i)) })),
      removeInvoice: (id) => set((s) => ({ invoices: s.invoices.filter((i) => i.id !== id) })),

      addChatMsg: (m) => set((s) => ({ chat: [...s.chat, m] })),
      clearChat: () => set({ chat: [] }),

      dismissAlert: (id) => set((s) => ({ alerts: s.alerts.filter((a) => a.id !== id) })),
      logActivity: (text, cat) => set((s) => ({
        activity: [{ id: crypto.randomUUID(), time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }), cat, text }, ...s.activity].slice(0, 30),
      })),

      setTheme: (theme) => {
        if (typeof document !== "undefined") {
          document.documentElement.classList.toggle("light", theme === "light");
          document.documentElement.classList.toggle("dark", theme === "dark");
        }
        set({ theme });
      },
      setAccentColor: (c) => {
        if (typeof document !== "undefined") document.documentElement.style.setProperty("--primary", c);
        set({ accentColor: c });
      },
      setOnboardingComplete: (v) => set({ onboardingComplete: v }),

      setAutomation: (k, v) => set((s) => ({ automation: { ...s.automation, [k]: v } })),
      setAutomationConfig: (p) => set((s) => ({ automationConfig: { ...s.automationConfig, ...p } })),

      resetAll: () => set({ ...initial }),
    }),
    {
      name: "edith-store",
      version: 2,
      storage: createJSONStorage(() => (typeof window === "undefined" ? (undefined as any) : localStorage)),
    }
  )
);

import { useEffect, useState } from "react";
export function useHydrated<T>(selector: (s: Store) => T, fallback: T): T {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  const value = useEdith(selector);
  return hydrated ? value : fallback;
}
