import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Search, Sparkles, Bookmark, BookmarkCheck, X, Plus, Loader2, Send, Trash2 } from "lucide-react";
import { useEdith, useHydrated, type Job, type Proposal } from "@/lib/store";
import { type CompletedJob } from "@/lib/mockData";
import { useConfirm } from "@/components/edith/ConfirmDialog";
import { toast } from "sonner";
import { runBackendJobScan, generateBackendProposal, syncFreelanceData } from "@/lib/apiStore";
import api from "@/lib/api";

export const Route = createFileRoute("/freelance")({
  head: () => ({ meta: [{ title: "Freelance Studio — EDITH" }] }),
  component: Freelance,
});

const domains = ["All", "Content", "Design", "Web Dev", "Video", "SEO", "Data", "Translation", "Voice", "Social Media", "VA", "AI Consulting", "E-Commerce"];

function PlatformBadge({ platform }: { platform: string }) {
  const normalized = platform.toLowerCase();
  const colors: Record<string, string> = {
    upwork: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
    fiverr: "bg-green-500/10 text-green-500 border-green-500/20",
    toptal: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    contra: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
    peopleperhour: "bg-orange-500/10 text-orange-500 border-orange-500/20",
    freelancer: "bg-cyan-500/10 text-cyan-500 border-cyan-500/20",
    weworkremotely: "bg-rose-500/10 text-rose-500 border-rose-500/20",
    remoteok: "bg-violet-500/10 text-violet-400 border-violet-500/20",
  };
  const colorClass = colors[normalized] || "bg-muted text-muted-foreground border-border/40";
  return (
    <span className={`rounded-md border px-2 py-0.5 text-[10px] font-semibold tracking-wide ${colorClass}`}>
      {platform}
    </span>
  );
}

function Freelance() {
  const [tab, setTab] = useState("discover");
  const [domain, setDomain] = useState("All");
  const [scanning, setScanning] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [platformFilter, setPlatformFilter] = useState("All platforms");
  const [budgetFilter, setBudgetFilter] = useState("Budget: any");
  const [selectedActiveJob, setSelectedActiveJob] = useState<any | null>(null);
  const [showAddManualModal, setShowAddManualModal] = useState(false);

  const allJobs = useHydrated((s) => s.jobs, [] as Job[]);
  const proposals = useHydrated((s) => s.proposals, [] as Proposal[]);
  const activeJobs = useHydrated((s) => s.activeJobs, [] as any[]);
  const completedJobs = useHydrated((s) => s.completed, [] as any[]);

  useEffect(() => {
    syncFreelanceData();
    const interval = setInterval(syncFreelanceData, 5000);
    return () => clearInterval(interval);
  }, []);

  const visibleJobs = allJobs.filter((j) => {
    if (j.dismissed) return false;
    
    // Domain filter
    if (domain !== "All" && j.category !== domain) return false;
    
    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const titleMatch = j.title?.toLowerCase().includes(q);
      const descMatch = j.desc?.toLowerCase().includes(q);
      const tagMatch = j.tags?.some((t: string) => t.toLowerCase().includes(q));
      if (!titleMatch && !descMatch && !tagMatch) return false;
    }
    
    // Platform filter
    if (platformFilter !== "All platforms") {
      if ((j.platform || "Upwork").toLowerCase() !== platformFilter.toLowerCase()) return false;
    }
    
    // Budget filter
    if (budgetFilter !== "Budget: any") {
      const budgetClean = (j.budget || "").replace(/[^0-9–-]/g, "");
      const parts = budgetClean.split(/[–-]/);
      const min = parseInt(parts[0], 10) || 0;
      const max = parseInt(parts[1], 10) || min;
      
      if (budgetFilter === "$500–$2k") {
        if (max < 500 || min > 2000) return false;
      } else if (budgetFilter === "$2k–$10k") {
        if (max < 2000 || min > 10000) return false;
      }
    }
    
    return true;
  });

  const tabs = [
    { key: "discover", label: "Discover Jobs", count: visibleJobs.length },
    { key: "proposals", label: "Proposals", count: proposals.length },
    { key: "progress", label: "In Progress", count: activeJobs.length },
    { key: "completed", label: "Completed", count: completedJobs.length },
  ];

  const onScan = async () => {
    setScanning(true);
    try {
      const result = await runBackendJobScan();
      toast.success(`Scan complete — ${result.newJobs} new jobs found`);
    } catch {
      toast.success(`Scan complete — ${visibleJobs.length} jobs available`);
    } finally {
      setScanning(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Freelance Studio</h1>
          <p className="mt-1 text-sm text-muted-foreground">Manage jobs, proposals, and deliveries across 13 domains.</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setShowAddManualModal(true)}
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-card/65 px-4 py-2 text-sm font-semibold hover:bg-card">
            <Plus className="h-4 w-4 text-muted-foreground" /> Add Manual Task
          </button>
          <button onClick={onScan} disabled={scanning}
            className="inline-flex items-center gap-2 rounded-lg bg-gradient-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-glow hover:opacity-90 disabled:opacity-60">
            {scanning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            {scanning ? "Scanning…" : "New Job Scan"}
          </button>
        </div>
      </div>

      {/* Domains */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {domains.map((d) => {
          const count = d === "All" ? allJobs.filter((j) => !j.dismissed).length : allJobs.filter((j) => !j.dismissed && j.category === d).length;
          return (
            <button key={d} onClick={() => setDomain(d)}
            className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
              domain === d ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card/40 text-muted-foreground hover:text-foreground"
            }`}>{d} {count > 0 && <span className="ml-1 opacity-70">{count}</span>}</button>
          );
        })}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border/60">
        {tabs.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`relative px-4 py-2.5 text-sm font-medium transition-colors ${
              tab === t.key ? "text-foreground" : "text-muted-foreground hover:text-foreground"
            }`}>
            {t.label}
            <span className="ml-2 rounded-full bg-muted px-1.5 py-0.5 text-[10px]">{t.count}</span>
            {tab === t.key && <span className="absolute inset-x-0 -bottom-px h-0.5 bg-gradient-primary" />}
          </button>
        ))}
      </div>

      {tab === "discover" && (
        <DiscoverTab 
          jobs={visibleJobs} 
          scanning={scanning} 
          onScan={onScan} 
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          platformFilter={platformFilter}
          setPlatformFilter={setPlatformFilter}
          budgetFilter={budgetFilter}
          setBudgetFilter={setBudgetFilter}
        />
      )}
      {tab === "proposals" && <ProposalsTab />}
      {tab === "progress" && <KanbanTab onSelectJob={setSelectedActiveJob} />}
      {tab === "completed" && <CompletedTab />}

      {selectedActiveJob && (
        <ActiveJobModal job={selectedActiveJob} onClose={() => { setSelectedActiveJob(null); syncFreelanceData(); }} />
      )}
      {showAddManualModal && (
        <AddManualTaskModal onClose={() => setShowAddManualModal(false)} />
      )}
    </div>
  );
}

function DiscoverTab({
  jobs,
  scanning,
  onScan,
  searchQuery,
  setSearchQuery,
  platformFilter,
  setPlatformFilter,
  budgetFilter,
  setBudgetFilter,
}: {
  jobs: Job[];
  scanning: boolean;
  onScan: () => void;
  searchQuery: string;
  setSearchQuery: (v: string) => void;
  platformFilter: string;
  setPlatformFilter: (v: string) => void;
  budgetFilter: string;
  setBudgetFilter: (v: string) => void;
}) {
  const toggleSaved = useEdith((s) => s.toggleSavedJob);
  const dismiss = useEdith((s) => s.dismissJob);
  const restore = useEdith((s) => s.restoreJob);
  const addProposal = useEdith((s) => s.addProposal);
  const [genFor, setGenFor] = useState<Job | null>(null);

  const onDismiss = async (j: Job) => {
    dismiss(j.id);
    if (j._backendId) {
      try {
        await api.freelance.dismissJob(j._backendId);
      } catch (err) {
        console.error("Failed to dismiss job on backend", err);
      }
    }
    toast("Job dismissed");
  };

  const onToggleSaved = async (j: Job) => {
    toggleSaved(j.id);
    if (j._backendId) {
      try {
        await api.freelance.saveJob(j._backendId);
      } catch (err) {
        console.error("Failed to toggle save on backend", err);
      }
    }
    toast.success(j.saved ? "Removed from saved" : "Job saved");
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border/60 bg-gradient-card p-4 shadow-card">
        <div className="grid gap-3 md:grid-cols-3">
          <div className="flex items-center gap-2 rounded-lg border border-border bg-background/40 px-3 py-2 text-sm">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input 
              placeholder="Keywords: shopify, copywriter, saas..." 
              className="w-full bg-transparent outline-none placeholder:text-muted-foreground" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <select 
            className="rounded-lg border border-border bg-background/40 px-3 py-2 text-sm"
            value={platformFilter}
            onChange={(e) => setPlatformFilter(e.target.value)}
          >
            <option>All platforms</option>
            <option>Upwork</option>
            <option>Fiverr</option>
            <option>Toptal</option>
            <option>Contra</option>
            <option>PeoplePerHour</option>
            <option>Freelancer</option>
            <option>WeWorkRemotely</option>
            <option>RemoteOK</option>
          </select>
          <select 
            className="rounded-lg border border-border bg-background/40 px-3 py-2 text-sm"
            value={budgetFilter}
            onChange={(e) => setBudgetFilter(e.target.value)}
          >
            <option>Budget: any</option>
            <option>$500–$2k</option>
            <option>$2k–$10k</option>
          </select>
        </div>
        <div className="mt-3 flex items-center justify-between">
          <span className="text-xs text-muted-foreground">{jobs.length} jobs match</span>
          <div className="flex gap-2">
            <button onClick={() => toast.success("Search saved")} className="rounded-md border border-border px-3 py-1.5 text-xs hover:bg-card">Save Search</button>
            <button onClick={onScan} disabled={scanning} className="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60">
              {scanning ? "Scanning…" : "Scan Now"}
            </button>
          </div>
        </div>
      </div>

      {jobs.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16 text-center">
          <p className="text-sm font-medium">No jobs match your filters.</p>
          <p className="mt-1 text-xs text-muted-foreground">Try a different domain or run a fresh scan.</p>
          <button onClick={onScan} className="mt-3 rounded-lg bg-gradient-primary px-4 py-2 text-xs font-semibold text-primary-foreground">Scan for Jobs</button>
        </div>
      )}

      {jobs.map((j, idx) => (
        <div key={j.id} className="group rounded-xl border border-border/60 bg-gradient-card p-5 shadow-card transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-glow">
          <div className="flex items-start gap-4">
            <span className="font-mono text-xs text-muted-foreground">#{String(idx + 1).padStart(2, "0")}</span>
            <div className="flex-1">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-md bg-primary/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary">{j.category}</span>
                    <PlatformBadge platform={j.platform || "Upwork"} />
                  </div>
                  <h3 className="mt-1.5 text-base font-semibold leading-snug">{j.title}</h3>
                </div>
                <ScoreBadge score={j.score} />
              </div>

              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                <span>💰 Budget: <span className="text-foreground font-medium">{j.budget}</span></span>
                <span>⭐ Rating: <span className="text-foreground font-medium">{j.rating}</span></span>
                <span>📅 <span className="text-foreground font-medium">{j.days} days</span></span>
                <span>🎯 Accuracy: <span className={`font-semibold ${
                  (j.accuracy ?? 85) >= 90 ? "text-emerald-400" :
                  (j.accuracy ?? 85) >= 80 ? "text-cyan-400" : "text-amber-400"
                }`}>{j.accuracy ?? 85}%</span></span>
              </div>

              <p className="mt-3 text-sm text-muted-foreground">{j.desc}</p>

              <div className="mt-2 flex flex-wrap gap-1.5">
                {j.tags.map((t: string) => (
                  <span key={t} className="rounded-md border border-border bg-card/60 px-1.5 py-0.5 text-[10px] text-muted-foreground">{t}</span>
                ))}
              </div>

              <div className="mt-3 flex items-start gap-2 rounded-lg border border-primary/20 bg-primary/5 p-3">
                <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <div className="space-y-1.5 flex-1">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-primary">AI Analysis</p>
                  <p className="text-xs text-foreground/90">{j.insight}</p>
                  <div className="pt-1.5 border-t border-primary/10 mt-1.5 text-[10px] text-muted-foreground flex flex-col gap-0.5">
                    <span className="font-semibold uppercase text-primary/80">Swarm Accuracy Breakdown:</span>
                    <p className="text-xs text-slate-300 italic leading-relaxed">
                      {j.accuracyDetails ?? 'Capable of high precision deliverable construction.'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-4 flex items-center gap-2">
                <button onClick={() => setGenFor(j)} className="inline-flex items-center gap-1.5 rounded-md bg-gradient-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90">
                  <Sparkles className="h-3.5 w-3.5" /> Generate Proposal
                </button>
                <button onClick={() => onToggleSaved(j)}
                  className={`inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-xs hover:bg-card ${j.saved ? "border-success/40 text-success" : "border-border"}`}>
                  {j.saved ? <BookmarkCheck className="h-3.5 w-3.5" /> : <Bookmark className="h-3.5 w-3.5" />}
                  {j.saved ? "Saved" : "Save"}
                </button>
                <button onClick={() => onDismiss(j)} className="inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-xs text-muted-foreground hover:bg-card"><X className="h-3.5 w-3.5" /> Dismiss</button>
              </div>
            </div>
          </div>
        </div>
      ))}

      {genFor && <ProposalGenerator job={genFor} onClose={() => setGenFor(null)} onSave={(p) => { addProposal(p); setGenFor(null); }} />}
    </div>
  );
}

function ScoreBadge({ score }: { score: number }) {
  const color = score >= 80 ? "var(--success)" : score >= 60 ? "var(--warning)" : "var(--destructive)";
  return (
    <div className="relative h-14 w-14 shrink-0">
      <svg viewBox="0 0 36 36" className="h-full w-full -rotate-90">
        <circle cx="18" cy="18" r="15.5" fill="none" stroke="var(--muted)" strokeWidth="3" />
        <circle cx="18" cy="18" r="15.5" fill="none" stroke={color} strokeWidth="3"
          strokeDasharray={`${(score / 100) * 97.4} 97.4`} strokeLinecap="round" />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center font-mono text-sm font-bold">{score}</div>
    </div>
  );
}

function ProposalsTab() {
  const proposals = useHydrated((s) => s.proposals, [] as Proposal[]);
  const updateProposal = useEdith((s) => s.updateProposal);
  const removeProposal = useEdith((s) => s.removeProposal);
  const addActiveJob = useEdith((s) => s.addActiveJob);
  const jobs = useEdith((s) => s.jobs);
  const confirm = useConfirm();
  const [filter, setFilter] = useState<Proposal["status"] | "all">("all");

  const counts = {
    draft: proposals.filter((p) => p.status === "draft").length,
    sent: proposals.filter((p) => p.status === "sent").length,
    accepted: proposals.filter((p) => p.status === "accepted").length,
    rejected: proposals.filter((p) => p.status === "rejected").length,
  };
  const filtered = filter === "all" ? proposals : proposals.filter((p) => p.status === filter);

  const send = async (p: Proposal) => {
    try {
      if (isNaN(Number(p.id)) && p.id.includes('-')) {
        await api.freelance.sendProposal(p.id, { email: "client@example.com" });
      }
      updateProposal(p.id, { status: "sent" });
      toast.success(`Proposal sent to ${p.client}`);
    } catch (err: any) {
      toast.error(err.message || "Failed to send proposal on backend");
    }
  };

  const accept = async (p: Proposal) => {
    try {
      const job = jobs.find((j) => j.id === p.jobId);
      const backendJobId = job?._backendId;

      if (backendJobId && isNaN(Number(p.id)) && p.id.includes('-')) {
        await api.freelance.updateProposal(p.id, { status: "accepted" });
        const res = await api.freelance.createActiveJob({ jobId: backendJobId, proposalId: p.id }) as any;
        
        if (res?.data) {
          const activeJob = res.data;
          addActiveJob({
            id: activeJob.id || crypto.randomUUID(),
            client: p.client,
            title: p.job,
            budget: parseFloat(p.budget.replace(/\D/g, '')) || 500,
            due: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(),
            status: "planning",
            progress: 0,
            subtasks: [],
            log: [{ time: new Date().toLocaleTimeString(), text: "Active job created from proposal" }],
          });
        }
      } else {
        addActiveJob({
          id: crypto.randomUUID(),
          client: p.client,
          title: p.job,
          budget: parseFloat(p.budget.replace(/\D/g, '')) || 500,
          due: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(),
          status: "planning",
          progress: 0,
          subtasks: [],
          log: [{ time: new Date().toLocaleTimeString(), text: "Active job created locally" }],
        });
      }

      updateProposal(p.id, { status: "accepted" });
      toast.success(`Proposal accepted! Spawning active job for ${p.client}.`);
    } catch (err: any) {
      toast.error(err.message || "Failed to accept proposal");
    }
  };

  const reject = async (p: Proposal) => {
    try {
      if (isNaN(Number(p.id)) && p.id.includes('-')) {
        await api.freelance.updateProposal(p.id, { status: "rejected" });
      }
      updateProposal(p.id, { status: "rejected" });
      toast.success(`Proposal rejected.`);
    } catch (err: any) {
      toast.error(err.message || "Failed to reject proposal");
    }
  };

  const discard = async (p: Proposal) => {
    if (await confirm({ title: "Discard proposal?", message: `This will permanently remove the draft for ${p.client}.`, variant: "danger", confirmText: "Discard" })) {
      removeProposal(p.id);
      toast.success("Proposal discarded");
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1 text-xs">
        {([["all", "All", proposals.length], ["draft", "Drafts", counts.draft], ["sent", "Pending / Sent", counts.sent], ["accepted", "Accepted", counts.accepted], ["rejected", "Rejected", counts.rejected]] as const).map(([k, l, n]) => (
          <button key={k} onClick={() => setFilter(k as any)}
            className={`rounded-md px-3 py-1.5 ${filter === k ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-card"}`}>
            {l} ({n})
          </button>
        ))}
      </div>
      {filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16 text-center">
          <p className="text-sm font-medium">No proposals here yet.</p>
          <p className="mt-1 text-xs text-muted-foreground">Generate a proposal from any job in Discover.</p>
        </div>
      )}
      {filtered.map((p) => (
        <div key={p.id} className="rounded-xl border border-border/60 bg-gradient-card p-4 shadow-card">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-primary text-sm font-semibold text-primary-foreground">{p.client[0]}</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold">{p.client}</h3>
                <span className="text-xs text-muted-foreground">· {p.platform}</span>
                <StatusPill s={p.status} />
              </div>
              <p className="text-sm text-muted-foreground">{p.job} — <span className="font-mono text-foreground">{p.budget}</span></p>
              <p className="mt-1 truncate text-xs text-muted-foreground">"{p.preview}"</p>
            </div>
            {p.status === "draft" && (
              <button onClick={() => send(p)} className="inline-flex items-center gap-1 rounded-md bg-gradient-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90">
                <Send className="h-3 w-3" /> Send
              </button>
            )}
            {p.status === "sent" && (
              <div className="flex items-center gap-1.5">
                <button onClick={() => accept(p)} className="inline-flex items-center rounded-md bg-emerald-500/20 border border-emerald-500/40 px-3 py-1.5 text-xs font-semibold text-emerald-400 hover:bg-emerald-500/30">
                  Accept
                </button>
                <button onClick={() => reject(p)} className="inline-flex items-center rounded-md bg-rose-500/20 border border-rose-500/40 px-3 py-1.5 text-xs font-semibold text-rose-400 hover:bg-rose-500/30">
                  Reject
                </button>
              </div>
            )}
            <button onClick={() => discard(p)} className="rounded-md p-2 text-muted-foreground hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
          </div>
        </div>
      ))}
    </div>
  );
}

function StatusPill({ s }: { s: Proposal["status"] }) {
  const map: Record<Proposal["status"], string> = {
    draft: "bg-muted text-muted-foreground",
    sent: "bg-primary/15 text-primary",
    accepted: "bg-success/15 text-success",
    rejected: "bg-destructive/15 text-destructive",
  };
  return <span className={`rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wider ${map[s]}`}>{s}</span>;
}

function ProposalGenerator({ job, onClose, onSave }: { job: Job; onClose: () => void; onSave: (p: Proposal) => void }) {
  const [generating, setGenerating] = useState(false);
  const [body, setBody] = useState("");
  const [bid, setBid] = useState(job.budget.split("-")[0].replace(/\D/g, "") || "500");
  const [backendProposalId, setBackendProposalId] = useState<string | null>(null);
  const [tone, setTone] = useState("professional");
  const [cvOption, setCvOption] = useState("full");

  const generate = async () => {
    if (!job._backendId) {
      setGenerating(true);
      setTimeout(() => {
        const cvSnippet = cvOption === 'tech'
          ? "TECHNICAL STACK: React, TypeScript, Node.js..."
          : cvOption === 'experience'
          ? "PROJECT EXPERIENCE: Architected EDITH AI Business Hub..."
          : "FULL RESUME: Nohil Bansu CV Portfolio summary...";

        const fallbackText = tone === 'direct'
          ? `Hi there,\n\nI read your requirements for "${job.title}". I am a seasoned developer and can deliver this cleanly for $${bid} in 5 days.\n\n[CV Context: ${cvSnippet}]`
          : tone === 'technical'
          ? `Hi there,\n\nI read your requirements for "${job.title}". I will implement this using React, TypeScript, and local storage state sync hooks. Clean code structure with comprehensive testing is standard.\n\n[CV Context: ${cvSnippet}]`
          : tone === 'conversational'
          ? `Hey! Hope you are doing well. I saw your job posting for "${job.title}" and it sounds super exciting. I have built very similar layouts and would love to discuss details.\n\n[CV Context: ${cvSnippet}]`
          : `Hi there,\n\nI read your requirements for "${job.title}" and would love to help you build this project. I have extensive experience with matching technologies and can deliver a robust, high-performance solution.\n\n[CV Context: ${cvSnippet}]`;
        setBody(fallbackText);
        setGenerating(false);
        toast.success(`Proposal generated (${tone} mock fallback)`);
      }, 800);
      return;
    }

    setGenerating(true);
    try {
      const res = await api.freelance.generateProposal(job._backendId, { tone, cvOption }) as any;
      if (res?.data) {
        const p = res.data;
        setBody(p.draftText || "");
        setBid(parseFloat(p.bidAmount || "500").toString());
        setBackendProposalId(p.id);
        toast.success(`AI Proposal generated (${tone})`);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to generate proposal");
    } finally {
      setGenerating(false);
    }
  };

  const save = async (status: Proposal["status"]) => {
    if (!body.trim()) { toast.error("Generate or write the proposal first"); return; }
    
    try {
      let pId = backendProposalId;
      if (!pId && job._backendId) {
        const genRes = await api.freelance.generateProposal(job._backendId, { tone }) as any;
        if (genRes?.data) {
          pId = genRes.data.id;
          setBackendProposalId(pId);
        }
      }

      const numericalBid = parseFloat(bid) || 0;

      if (pId) {
        const updateData = {
          finalText: body,
          bidAmount: numericalBid,
          deliveryDays: job.days || 7,
          status,
        };
        await api.freelance.updateProposal(pId, updateData);
        if (status === "sent") {
          await api.freelance.sendProposal(pId, { email: "client@example.com" });
        }
      }

      onSave({
        id: pId || crypto.randomUUID(),
        jobId: job.id,
        client: job.title.split(" ").slice(-2).join(" "),
        job: job.title,
        budget: `$${bid}`,
        platform: job.platform || "Upwork",
        preview: body.slice(0, 90),
        body,
        status,
        createdAt: new Date().toISOString(),
      });
    } catch (err: any) {
      toast.error(err.message || "Failed to save proposal");
    }
  };

  const platform = job.platform || "Upwork";
  const feePct = platform.toLowerCase() === "fiverr" ? 0.20 : 0.10;
  const grossBid = parseFloat(bid) || 0;
  const platformFee = grossBid * feePct;
  const taxReserve = (grossBid - platformFee) * 0.25;
  const netEarnings = grossBid - platformFee - taxReserve;

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-background/70 p-4 backdrop-blur-sm" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()}
        className="w-full max-w-3xl rounded-2xl border border-border/60 bg-card shadow-elevated">
        <div className="flex items-start justify-between border-b border-border/60 p-5">
          <div>
            <p className="text-xs uppercase tracking-wider text-primary">Proposal Generator</p>
            <h3 className="mt-1 font-semibold">{job.title}</h3>
            <p className="text-xs text-muted-foreground">Budget {job.budget} · {job.days} days · Score {job.score}</p>
          </div>
          <button onClick={onClose} className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"><X className="h-4 w-4" /></button>
        </div>
        
        <div className="grid gap-4 p-5 md:grid-cols-[1fr_240px]">
          <div className="space-y-3">
            {/* Tone Selector & CV Options */}
            <div className="flex flex-col gap-2.5 bg-background/35 p-3 rounded-lg border border-border/40">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-muted-foreground">Tone style:</span>
                {["professional", "direct", "technical", "conversational"].map((t) => (
                  <button
                    key={t}
                    onClick={() => setTone(t)}
                    className={`rounded px-2 py-0.5 text-[11px] capitalize transition-colors ${
                      tone === t ? "bg-primary/20 border border-primary/40 text-primary font-bold" : "border border-border text-muted-foreground hover:text-foreground hover:bg-muted"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-muted-foreground">CV Source:</span>
                {[
                  { key: "full", label: "Full Summary" },
                  { key: "tech", label: "Tech Stack" },
                  { key: "experience", label: "Project Experience" }
                ].map((c) => (
                  <button
                    key={c.key}
                    onClick={() => setCvOption(c.key)}
                    className={`rounded px-2 py-0.5 text-[11px] transition-colors ${
                      cvOption === c.key ? "bg-accent/20 border border-accent/40 text-accent font-bold" : "border border-border text-muted-foreground hover:text-foreground hover:bg-muted"
                    }`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>

            <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={12}
              placeholder="Click 'Generate with AI' or write your proposal here…"
              className="w-full resize-none rounded-lg border border-border bg-background/40 p-3 text-sm" />
            
            <div className="flex flex-wrap items-center justify-between gap-3 bg-[#0c0c14]/40 p-3 rounded-lg border border-border/30">
              <button onClick={generate} disabled={generating}
                className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-primary px-3.5 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-60">
                {generating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                {generating ? "Generating…" : body ? "Regenerate" : "Generate with AI"}
              </button>
              
              <div className="flex items-center gap-3.5">
                <label className="text-xs text-muted-foreground font-semibold">Gross Bid ($):</label>
                <input
                  type="range"
                  min="50"
                  max="4000"
                  step="25"
                  value={grossBid || 500}
                  onChange={(e) => setBid(e.target.value)}
                  className="w-28 h-1 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                />
                <input value={bid} onChange={(e) => setBid(e.target.value)} className="w-20 rounded-md border border-border bg-background/40 px-2.5 py-1 text-xs font-mono text-center font-bold" />
              </div>
            </div>
          </div>

          <div className="space-y-4 rounded-xl border border-border/60 bg-card/40 p-3 text-xs">
            <div>
              <p className="font-semibold text-primary/80 uppercase text-[10px] tracking-wider">AI Insight</p>
              <p className="mt-1 text-muted-foreground">{job.insight}</p>
            </div>
            
            {/* Margin Calculator */}
            <div className="border-t border-border/60 pt-3">
              <p className="font-semibold text-primary/80 uppercase text-[10px] tracking-wider mb-2">Platform Fee & Payout Margin</p>
              <div className="space-y-1.5 font-mono text-[11px]">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Gross Bid:</span>
                  <span className="text-foreground">${grossBid.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-rose-400">
                  <span>{platform} Fee ({feePct * 100}%):</span>
                  <span>-${platformFee.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-amber-400">
                  <span>Tax Reserve (25%):</span>
                  <span>-${taxReserve.toFixed(2)}</span>
                </div>
                <div className="border-t border-border/40 my-1 pt-1 flex justify-between text-emerald-400 font-bold">
                  <span>Net Earnings:</span>
                  <span>${netEarnings.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-border/60 p-4">
          <button onClick={() => save("draft")} className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-muted">Save Draft</button>
          <button onClick={() => save("sent")} className="rounded-lg bg-gradient-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-glow">Approve & Send</button>
        </div>
      </div>
    </div>
  );
}

function KanbanTab({ onSelectJob }: { onSelectJob: (job: any) => void }) {
  const activeJobs = useHydrated((s) => s.activeJobs, [] as any[]);

  const getRelativeTime = (isoString: string) => {
    try {
      const diffMs = new Date(isoString).getTime() - Date.now();
      if (diffMs < 0) return "overdue";
      const diffHours = Math.round(diffMs / (3600 * 1000));
      if (diffHours < 24) return `${diffHours}h`;
      return `${Math.round(diffHours / 24)}d`;
    } catch {
      return "due";
    }
  };

  const getColumnItems = (status: string) => {
    return activeJobs
      .filter((j) => j.status === status)
      .map((j) => ({
        id: j.id,
        client: j.client,
        type: j.title,
        due: getRelativeTime(j.due),
        pct: j.progress
      }));
  };

  const cols = [
    { title: "Planning", status: "planning", color: "var(--chart-5)" },
    { title: "In Execution", status: "execution", color: "var(--primary)" },
    { title: "QC Review", status: "qc", color: "var(--warning)" },
    { title: "Ready to Deliver", status: "ready", color: "var(--success)" },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {cols.map((c) => {
        const items = getColumnItems(c.status);
        return (
          <div key={c.title} className="rounded-xl border border-border/60 bg-card/40 p-3">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: c.color }} />
                <h3 className="text-sm font-semibold">{c.title}</h3>
              </div>
              <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px]">{items.length}</span>
            </div>
            <div className="space-y-2">
              {items.length === 0 && (
                <p className="py-6 text-center text-xs text-muted-foreground">Empty</p>
              )}
              {items.map((it, i) => {
                const jobObj = activeJobs.find(x => x.id === it.id);
                return (
                  <div key={it.id || i}
                    onClick={() => jobObj && onSelectJob(jobObj)}
                    className="group rounded-lg border border-border/60 bg-gradient-card p-3 hover:border-primary/40 cursor-pointer hover:shadow-glow hover:-translate-y-0.5 transition-all">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">{it.client}</p>
                      <span className={`text-[10px] font-mono ${it.due.includes("h") || it.due === "overdue" ? "text-destructive" : "text-muted-foreground"}`}>{it.due}</span>
                    </div>
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{it.type}</span>
                    <div className="mt-2 h-1 rounded-full bg-muted">
                      <div className="h-1 rounded-full bg-gradient-primary" style={{ width: `${it.pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function CompletedTab() {
  const completed = useHydrated((s) => s.completed, [] as CompletedJob[]);

  const totalEarned = completed.reduce((sum, j) => sum + j.amount, 0);
  const avgRating = completed.length > 0
    ? (completed.reduce((sum, j) => sum + j.rating, 0) / completed.length).toFixed(1)
    : "0.0";
  const avgJobValue = completed.length > 0
    ? Math.round(totalEarned / completed.length)
    : 0;

  const stats = [
    ["Earned this month", `$${totalEarned.toLocaleString()}`],
    ["Jobs completed", completed.length.toString()],
    ["Avg rating", `${avgRating} ★`],
    ["Repeat client rate", "0%"],
    ["Avg job value", `$${avgJobValue.toLocaleString()}`],
    ["Time saved by AI", `${completed.length * 4} hrs`],
  ];

  const rows = completed.map((j) => [
    j.client,
    j.title,
    `$${j.amount.toLocaleString()}`,
    j.rating.toFixed(1),
    j.date,
    j.platform
  ]);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {stats.map(([l, v]) => (
          <div key={l} className="rounded-lg border border-border/60 bg-gradient-card p-3">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{l}</p>
            <p className="mt-1 font-mono text-base font-semibold">{v}</p>
          </div>
        ))}
      </div>
      <div className="overflow-hidden rounded-xl border border-border/60 bg-gradient-card shadow-card">
        {rows.length === 0 ? (
          <div className="py-12 text-center text-sm text-muted-foreground">No completed jobs yet.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase text-muted-foreground">
              <tr className="border-b border-border/60">
                {["Client", "Type", "Amount", "Rating", "Date", "Platform"].map((h) => <th key={h} className="px-4 py-3">{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className="border-b border-border/40 last:border-0 hover:bg-card/60">
                  {r.map((c, j) => <td key={j} className="px-4 py-3">{c}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function ActiveJobModal({ job, onClose }: { job: any; onClose: () => void }) {
  const [activeJob, setActiveJob] = useState(job);
  const [executingTaskId, setExecutingTaskId] = useState<string | null>(null);
  const [runningQC, setRunningQC] = useState(false);
  const [delivering, setDelivering] = useState(false);
  const [savingSubtasks, setSavingSubtasks] = useState(false);

  // Sync state if job updates externally
  useEffect(() => {
    setActiveJob(job);
  }, [job]);

  const downloadQCReport = () => {
    if (!activeJob.qcResults) return;
    const r = activeJob.qcResults;
    const text = `==================================================
EDITH QUALITY CONTROL VERIFICATION REPORT
==================================================
Project: ${activeJob.title}
Client: ${activeJob.client}
QC Score: ${r.score}/100
Verdict: ${r.passed ? 'PASSED' : 'FAILED / REVISIONS NEEDED'}
Checked At: ${new Date(r.checkedAt).toLocaleString()}

Detected Issues:
${r.issues && r.issues.length > 0 ? r.issues.map((i: string) => `- ${i}`).join('\n') : 'None'}

Suggestions for Improvements:
${r.suggestions && r.suggestions.length > 0 ? r.suggestions.map((s: string) => `- ${s}`).join('\n') : 'None'}

==================================================
Verified by EDITH AI Agent Swarm
==================================================`;

    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `QC_Report_${activeJob.title.replace(/\s+/g, '_')}.txt`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("QC Report downloaded successfully!");
  };

  const handleExecuteSubtask = async (subtaskId: string, agentType: string) => {
    setExecutingTaskId(subtaskId);
    try {
      const res = await api.freelance.executeJob(activeJob.id, {
        taskType: agentType,
        input: { subtaskId }
      }) as any;
      if (res?.data) {
        toast.success("Subtask executed successfully");
        await syncFreelanceData();
        const updatedJobs = useEdith.getState().activeJobs;
        const matching = updatedJobs.find((j: any) => j.id === activeJob.id);
        if (matching) setActiveJob(matching);
      }
    } catch (err: any) {
      toast.error("Execution failed: " + err.message);
    } finally {
      setExecutingTaskId(null);
    }
  };

  const handleQC = async () => {
    setRunningQC(true);
    try {
      const res = await api.freelance.runQC(activeJob.id) as any;
      if (res?.data) {
        toast.success("Quality check complete!");
        await syncFreelanceData();
        const updatedJobs = useEdith.getState().activeJobs;
        const matching = updatedJobs.find((j: any) => j.id === activeJob.id);
        if (matching) setActiveJob(matching);
      }
    } catch (err: any) {
      toast.error("QC failed: " + err.message);
    } finally {
      setRunningQC(false);
    }
  };

  const handleDeliver = async () => {
    setDelivering(true);
    try {
      const res = await api.freelance.deliverJob(activeJob.id, {
        deliveryMessage: activeJob.deliveryMessage || undefined
      }) as any;
      if (res?.data) {
        toast.success("Project delivered successfully!");
        await syncFreelanceData();
        onClose();
      }
    } catch (err: any) {
      toast.error("Delivery failed: " + err.message);
    } finally {
      setDelivering(false);
    }
  };

  const handleMoveColumn = async (column: string) => {
    try {
      await api.freelance.moveJob(activeJob.id, column);
      toast.success(`Moved to ${column}`);
      await syncFreelanceData();
      const updatedJobs = useEdith.getState().activeJobs;
      const matching = updatedJobs.find((j: any) => j.id === activeJob.id);
      if (matching) setActiveJob(matching);
    } catch (err: any) {
      toast.error("Move failed: " + err.message);
    }
  };

  const handleEditOutput = async (subtaskId: string, newOutput: string) => {
    const updatedSubtasks = activeJob.subtasks.map((s: any) => 
      s.id === subtaskId ? { ...s, output: newOutput } : s
    );
    
    // Update local state first
    setActiveJob({ ...activeJob, subtasks: updatedSubtasks });

    // Save back to backend in background
    setSavingSubtasks(true);
    try {
      await (api.freelance as any).updateActiveJob(activeJob.id, { subtasks: updatedSubtasks });
    } catch (err) {
      console.error("Failed to save edited subtask output:", err);
    } finally {
      setSavingSubtasks(false);
    }
  };

  const handleEditDeliveryMessage = async (newMsg: string) => {
    setActiveJob({ ...activeJob, deliveryMessage: newMsg });
    try {
      await (api.freelance as any).updateActiveJob(activeJob.id, { deliveryMessage: newMsg });
    } catch (err) {
      console.error("Failed to save edited delivery message:", err);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 p-4 backdrop-blur-md" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()}
        className="w-full max-w-4xl max-h-[85vh] overflow-y-auto rounded-2xl border border-border/60 bg-card p-6 shadow-elevated space-y-6 scrollbar-thin">
        
        {/* Header */}
        <div className="flex items-start justify-between border-b border-border/60 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-primary/10 border border-primary/20 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary">
                {activeJob.status === 'planning' ? 'Planning' : activeJob.status === 'execution' ? 'In Execution' : activeJob.status === 'qc' ? 'QC Review' : 'Ready to Deliver'}
              </span>
              <span className="text-xs text-muted-foreground">Budget: ${activeJob.budget}</span>
            </div>
            <h2 className="mt-2 text-xl font-bold text-foreground">{activeJob.title}</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Client: {activeJob.client}</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content body split layout */}
        <div className="grid gap-6 md:grid-cols-[2fr_1fr]">
          <div className="space-y-6">
            
            {/* Subtasks (Swarm Executions) */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-primary flex items-center gap-1.5">
                  <Sparkles className="h-4 w-4" /> AI Agent Swarm Subtasks
                </h3>
                {savingSubtasks && <span className="text-[10px] text-muted-foreground animate-pulse">Auto-saving...</span>}
              </div>

              {activeJob.subtasks.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
                  No subtasks generated for this job category. Click below to add one or execute the agent directly.
                </div>
              ) : (
                <div className="space-y-3">
                  {activeJob.subtasks.map((task: any) => (
                    <div key={task.id} className="rounded-xl border border-border/60 bg-background/30 p-4 space-y-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <span className={`h-2 w-2 rounded-full ${task.status === 'done' ? 'bg-success' : task.status === 'in_progress' ? 'bg-primary animate-ping' : 'bg-muted'}`} />
                          <div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <p className="text-xs font-semibold">{task.title}</p>
                              {task.hours && <span className="rounded bg-muted px-1.5 py-0.5 text-[9px] font-mono text-muted-foreground">{task.hours}h</span>}
                              {task.priority && (
                                <span className={`rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase ${
                                  task.priority === 'high' ? 'bg-rose-500/10 text-rose-400' :
                                  task.priority === 'medium' ? 'bg-amber-500/10 text-amber-400' : 'bg-slate-500/10 text-slate-400'
                                }`}>{task.priority}</span>
                              )}
                              {task.milestone && <span className="rounded bg-primary/10 border border-primary/20 text-primary px-1.5 py-0.5 text-[9px] font-semibold">{task.milestone}</span>}
                            </div>
                            <p className="text-[10px] text-muted-foreground font-mono uppercase mt-1">Agent: {task.assignedAgent}</p>
                          </div>
                        </div>
                        {task.status !== 'done' ? (
                          <button
                            disabled={executingTaskId !== null}
                            onClick={() => handleExecuteSubtask(task.id, task.assignedAgent)}
                            className="inline-flex items-center gap-1.5 rounded-md bg-gradient-primary px-3 py-1.5 text-[10px] font-semibold text-primary-foreground disabled:opacity-60 shadow-sm"
                          >
                            {executingTaskId === task.id ? (
                              <>
                                <Loader2 className="h-3 w-3 animate-spin" /> Executing...
                              </>
                            ) : (
                              <>
                                <Sparkles className="h-3 w-3" /> Run Agent
                              </>
                            )}
                          </button>
                        ) : (
                          <span className="rounded-full bg-success/15 px-2 py-0.5 text-[10px] text-success font-semibold">Done</span>
                        )}
                      </div>

                      {/* Display generated text area if output exists */}
                      {task.output && (
                        <div className="space-y-1.5 pt-2 border-t border-border/40">
                          <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground font-semibold">Generated Output (Editable)</p>
                          <textarea
                            value={task.output}
                            onChange={(e) => handleEditOutput(task.id, e.target.value)}
                            rows={6}
                            className="w-full resize-y rounded-lg border border-border/40 bg-background/50 p-2.5 text-xs font-mono leading-relaxed outline-none focus:border-primary/50"
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* QC Checks Panel */}
            {activeJob.subtasks.some((s: any) => s.status === 'done') && (
              <div className="rounded-xl border border-border/60 bg-background/20 p-4 space-y-4">
                <div className="flex items-center justify-between border-b border-border/40 pb-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-warning flex items-center gap-1.5">
                    Quality Control Check (QC)
                  </h3>
                  <div className="flex gap-2">
                    {activeJob.qcResults && (
                      <button
                        onClick={downloadQCReport}
                        className="inline-flex items-center gap-1.5 rounded-md bg-muted border border-border text-foreground px-3 py-1.5 text-[10px] font-bold uppercase hover:bg-card"
                      >
                        Download Report
                      </button>
                    )}
                    <button
                      disabled={runningQC}
                      onClick={handleQC}
                      className="inline-flex items-center gap-1.5 rounded-md bg-warning/15 border border-warning/30 text-warning px-3 py-1.5 text-[10px] font-bold uppercase hover:bg-warning/20 disabled:opacity-50"
                    >
                      {runningQC ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Run QC Scan'}
                    </button>
                  </div>
                </div>

                {activeJob.qcResults ? (
                  <div className="space-y-3 text-xs">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full border-2 border-warning flex items-center justify-center font-mono font-bold text-warning text-sm">
                        {activeJob.qcResults.score}
                      </div>
                      <div>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${activeJob.qcResults.passed ? 'bg-success/15 text-success' : 'bg-destructive/15 text-destructive'}`}>
                          {activeJob.qcResults.passed ? 'QC PASSED' : 'QC FAILED / REVISION NEEDED'}
                        </span>
                        <p className="text-[10px] text-muted-foreground mt-0.5">Checked: {new Date(activeJob.qcResults.checkedAt).toLocaleTimeString()}</p>
                      </div>
                    </div>

                    {activeJob.qcResults.issues && activeJob.qcResults.issues.length > 0 && (
                      <div>
                        <p className="font-semibold text-destructive">Detected Issues:</p>
                        <ul className="list-disc pl-4 space-y-0.5 text-muted-foreground text-[11px] mt-1">
                          {activeJob.qcResults.issues.map((iss: string, idx: number) => <li key={idx}>{iss}</li>)}
                        </ul>
                      </div>
                    )}

                    {activeJob.qcResults.suggestions && activeJob.qcResults.suggestions.length > 0 && (
                      <div>
                        <p className="font-semibold text-success">Suggestions:</p>
                        <ul className="list-disc pl-4 space-y-0.5 text-muted-foreground text-[11px] mt-1">
                          {activeJob.qcResults.suggestions.map((sug: string, idx: number) => <li key={idx}>{sug}</li>)}
                        </ul>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">Run a Quality Control Scan to analyze alignment with specifications, originality, and structure.</p>
                )}
              </div>
            )}

            {/* Delivery Panel */}
            {activeJob.status === 'ready' && (
              <div className="rounded-xl border border-success/30 bg-success/5 p-4 space-y-4">
                <div className="flex items-center justify-between border-b border-success/20 pb-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-success flex items-center gap-1.5">
                    Client Delivery Package
                  </h3>
                  <button
                    disabled={delivering}
                    onClick={handleDeliver}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-success text-white px-4 py-2 text-xs font-bold uppercase hover:bg-success/90 disabled:opacity-50"
                  >
                    {delivering ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Deliver Output'}
                  </button>
                </div>

                {activeJob.deliveryMessage ? (
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center">
                        <label className="text-[10px] font-semibold text-success uppercase">Delivery Message (Editable)</label>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(activeJob.deliveryMessage);
                            toast.success("Delivery message copied!");
                          }}
                          className="text-[10px] text-muted-foreground hover:text-foreground underline"
                        >
                          Copy Message
                        </button>
                      </div>
                      <textarea
                        value={activeJob.deliveryMessage}
                        onChange={(e) => handleEditDeliveryMessage(e.target.value)}
                        rows={5}
                        className="w-full rounded-lg border border-border bg-background p-2.5 text-xs outline-none focus:border-success/50 font-sans"
                      />
                    </div>

                    {activeJob.deliveryFiles && activeJob.deliveryFiles.length > 0 && (
                      <div className="space-y-1.5">
                        <p className="text-[10px] font-semibold text-success uppercase">Delivered Files</p>
                        <div className="grid gap-2">
                          {activeJob.deliveryFiles.map((f: any, idx: number) => (
                            <div key={idx} className="flex justify-between items-center bg-card p-2 rounded border border-border text-xs">
                              <span className="font-mono text-muted-foreground">{f.filename}</span>
                              <a
                                href={`${api.BASE_URL}${f.url}`}
                                target="_blank"
                                rel="noreferrer"
                                className="text-primary hover:underline text-[10px] font-semibold"
                              >
                                Download
                              </a>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">Click Deliver to package generated files and auto-compose a professional freelance submission message.</p>
                )}
              </div>
            )}

          </div>

          {/* Sidebar controls */}
          <div className="space-y-4">
            <div className="rounded-xl border border-border bg-card/60 p-4 space-y-4 text-xs">
              <h3 className="font-semibold text-foreground uppercase tracking-wider text-[10px]">Job Progression</h3>
              
              <div className="space-y-2">
                <button
                  onClick={() => handleMoveColumn('planning')}
                  className={`w-full py-2 text-center rounded-lg border font-semibold text-[10px] uppercase transition-colors ${activeJob.status === 'planning' ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:bg-card'}`}
                >
                  Planning
                </button>
                <button
                  onClick={() => handleMoveColumn('execution')}
                  className={`w-full py-2 text-center rounded-lg border font-semibold text-[10px] uppercase transition-colors ${activeJob.status === 'execution' ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:bg-card'}`}
                >
                  In Execution
                </button>
                <button
                  onClick={() => handleMoveColumn('qc')}
                  className={`w-full py-2 text-center rounded-lg border font-semibold text-[10px] uppercase transition-colors ${activeJob.status === 'qc' ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:bg-card'}`}
                >
                  QC Review
                </button>
                <button
                  onClick={() => handleMoveColumn('ready')}
                  className={`w-full py-2 text-center rounded-lg border font-semibold text-[10px] uppercase transition-colors ${activeJob.status === 'ready' ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:bg-card'}`}
                >
                  Ready to Deliver
                </button>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card/40 p-4 text-xs space-y-2.5">
              <div>
                <p className="font-semibold text-muted-foreground text-[10px] uppercase">Assigned Swarm</p>
                <p className="text-foreground font-semibold mt-0.5">Content & Text Optimization Node</p>
              </div>
              <div>
                <p className="font-semibold text-muted-foreground text-[10px] uppercase">Last Updated</p>
                <p className="text-foreground mt-0.5">{new Date(activeJob.due).toLocaleTimeString()}</p>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

function AddManualTaskModal({ onClose }: { onClose: () => void }) {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("Content");
  const [description, setDescription] = useState("");
  const [budget, setBudget] = useState("500");
  const [platform, setPlatform] = useState("Manual");
  const [submitting, setSubmitting] = useState(false);

  const categories = ["Content", "Design", "Web Dev", "Video", "SEO", "Data", "Translation", "Voice", "Social Media", "VA", "AI Consulting", "E-Commerce"];
  const platforms = ["Manual", "External", "Upwork", "Fiverr", "Freelancer", "Toptal", "Contra", "PeoplePerHour", "WeWorkRemotely", "RemoteOK"];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim() || !category.trim()) {
      toast.error("Please fill in all required fields.");
      return;
    }
    const budgetNum = parseFloat(budget);
    if (isNaN(budgetNum) || budgetNum < 0) {
      toast.error("Please enter a valid budget amount.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.freelance.createManualJob({
        title: title.trim(),
        category,
        description: description.trim(),
        budget: budgetNum,
        platform
      }) as any;

      if (res?.success) {
        toast.success(`Task "${title}" created successfully!`);
        await syncFreelanceData();
        onClose();
      } else {
        toast.error(res?.error?.message || "Failed to create manual task.");
      }
    } catch (err: any) {
      toast.error(err.message || "An error occurred while creating task.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/85 p-4 backdrop-blur-md" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()}
        className="w-full max-w-xl rounded-2xl border border-border/60 bg-card p-6 shadow-elevated space-y-6">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/60 pb-3">
          <h2 className="text-lg font-bold text-foreground">Add Custom Task</h2>
          <button onClick={onClose} className="rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground">Task Title *</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Build landing page for gym"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Category *</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
              >
                {categories.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Platform Source</label>
              <select
                value={platform}
                onChange={(e) => setPlatform(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
              >
                {platforms.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Budget (USD) *</label>
              <input
                type="number"
                required
                min="0"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                placeholder="500"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground">Requirements / Brief *</label>
            <textarea
              required
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what needs to be done. The AI agents will analyze this to generate the execution subtasks and output deliverables."
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none resize-none"
            />
          </div>

          {/* Footer actions */}
          <div className="flex justify-end gap-2 border-t border-border/60 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-border px-4 py-2 text-sm font-semibold hover:bg-muted"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-glow hover:opacity-90 disabled:opacity-60"
            >
              {submitting && <Loader2 className="h-3 w-3 animate-spin" />}
              {submitting ? "Creating..." : "Create Task"}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}

