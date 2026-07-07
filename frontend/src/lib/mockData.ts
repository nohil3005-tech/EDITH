export const revenueData: { date: string; freelance: number; drop: number }[] = [];

export const breakdownData: { name: string; value: number; color: string }[] = [];

export const sparkData: { v: number }[] = [];

export const initialAlerts: any[] = [];

export const initialActivity: any[] = [];

export const jobs: any[] = [];

export const initialProposals: any[] = [];

export type ActiveJob = {
  id: string; client: string; title: string; budget: number; due: string;
  status: "planning" | "execution" | "qc" | "ready";
  progress: number; subtasks: { label: string; done: boolean }[];
  log: { time: string; text: string }[]; qc?: { check: string; pass: boolean }[];
  invoiced?: boolean;
};

export const initialActiveJobs: ActiveJob[] = [];

export type CompletedJob = { id: string; client: string; title: string; amount: number; rating: number; date: string; platform: string; domain: string; invoiced: boolean };
export const initialCompleted: CompletedJob[] = [];

export const products: any[] = [];

export const stores: any[] = [];

export const agents = [
  { name: "Job Scanner", domain: "Freelance", icon: "🔍", status: "active", jobs: 0, success: 100, rev: 0 },
  { name: "Proposal Writer", domain: "Freelance", icon: "✍️", status: "active", jobs: 0, success: 100, rev: 0 },
  { name: "Content Executor", domain: "Content", icon: "📝", status: "active", jobs: 0, success: 100, rev: 0 },
  { name: "Design Executor", domain: "Design", icon: "🎨", status: "active", jobs: 0, success: 100, rev: 0 },
  { name: "Web Dev Executor", domain: "Web Dev", icon: "💻", status: "idle", jobs: 0, success: 100, rev: 0 },
  { name: "QC Reviewer", domain: "Freelance", icon: "✅", status: "active", jobs: 0, success: 100, rev: 0 },
  { name: "Client Comms", domain: "Freelance", icon: "💬", status: "active", jobs: 0, success: 100, rev: 0 },
  { name: "Product Hunter", domain: "Dropshipping", icon: "🎯", status: "active", jobs: 0, success: 100, rev: 0 },
  { name: "Validator", domain: "Dropshipping", icon: "🧪", status: "active", jobs: 0, success: 100, rev: 0 },
  { name: "Store Builder", domain: "Dropshipping", icon: "🏪", status: "idle", jobs: 0, success: 100, rev: 0 },
  { name: "Ad Optimizer", domain: "Dropshipping", icon: "📢", status: "active", jobs: 0, success: 100, rev: 0 },
  { name: "Customer Support", domain: "Dropshipping", icon: "🤝", status: "active", jobs: 0, success: 100, rev: 0 },
  { name: "Analytics Brain", domain: "Cross", icon: "🧠", status: "active", jobs: 0, success: 100, rev: 0 },
];

export type StoredFile = { id: string; name: string; folder: string; mime: string; size: number; createdAt: string; dataUrl?: string };
export const initialFiles: StoredFile[] = [];

export type StoredInvoice = {
  id: string; number: string; clientName: string; clientEmail: string; clientAddress: string;
  items: { description: string; quantity: number; rate: number }[];
  subtotal: number; tax: number; total: number; currency: string; status: "draft" | "sent" | "paid";
  paymentLink: string; notes: string; createdAt: string; dueAt: string; paidAt?: string;
  paymentDetails?: any;
};
export const initialInvoices: StoredInvoice[] = [];

export type ChatMsg = { id: string; role: "user" | "assistant"; content: string; createdAt: string };
export const initialChat: ChatMsg[] = [];

