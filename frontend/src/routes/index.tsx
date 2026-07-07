import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { DollarSign, Briefcase, Store, Cpu, ArrowUpRight, AlertTriangle, Info, AlertCircle, Sparkles, Package, Hexagon, Zap, Activity } from "lucide-react";
import { Area, AreaChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { StatCard } from "@/components/edith/StatCard";
import { revenueData, breakdownData, sparkData } from "@/lib/mockData";
import { useHydrated, useEdith } from "@/lib/store";
import { toast } from "sonner";

import api from "@/lib/api";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [{ title: "Dashboard — EDITH" }] }),
  component: Dashboard,
});

function Dashboard() {
  const navigate = useNavigate();
  const [period, setPeriod] = useState("30D");
  const alerts = useHydrated((s) => s.alerts, [] as any[]);
  const activity = useHydrated((s) => s.activity, [] as any[]);
  const proposals = useHydrated((s) => s.proposals, [] as any[]);
  const productsList = useHydrated((s) => s.products, [] as any[]);
  const dismissAlert = useEdith((s) => s.dismissAlert);
  const visibleAlerts = alerts;

  const [summary, setSummary] = useState<any>({
    earnings: { total: 0, thisMonth: 0 },
    freelance: { totalJobs: 0, activeJobs: 0, newJobs: 0 },
    dropshipping: { totalStores: 0, activeStores: 0 },
    invoices: { pending: 0, pendingAmount: 0 },
    agents: { totalRuns: 0, errors: 0, avgDurationMs: 0 }
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    api.dashboard.summary()
      .then((res: any) => {
        if (active && res?.data) {
          setSummary(res.data);
        }
      })
      .catch((err) => console.error("Error fetching dashboard summary:", err))
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  const periodMap: Record<string, typeof revenueData> = {
    "7D": revenueData.slice(-3),
    "30D": revenueData,
    "90D": [...revenueData, ...revenueData.map((d, i) => ({ ...d, date: `Jun ${i + 1}`, freelance: d.freelance + 600, drop: d.drop + 400 }))],
    "1Y": [...revenueData, ...revenueData.map((d, i) => ({ ...d, date: `Q${i + 1}`, freelance: d.freelance * 3, drop: d.drop * 3 }))],
  };
  const data = periodMap[period] || [];

  const hasRevenue = summary.earnings.total > 0;
  const pieData = hasRevenue ? [
    { name: "Freelance", value: summary.earnings.total * 0.65, color: "var(--primary)" },
    { name: "Dropshipping", value: summary.earnings.total * 0.35, color: "var(--accent)" }
  ] : [];

  const autoRate = summary.agents.totalRuns > 0 
    ? Math.round(((summary.agents.totalRuns - summary.agents.errors) / summary.agents.totalRuns) * 100)
    : 100;

  return (
    <div className="space-y-8">
      {/* Hero header */}
      <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-gradient-card p-8 shadow-elevated">
        <div className="absolute inset-0 bg-gradient-hero opacity-80" />
        <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-primary/20 blur-3xl animate-float-orb" />
        <div className="absolute -bottom-20 right-32 h-48 w-48 rounded-full bg-accent/20 blur-3xl animate-float-orb" style={{ animationDelay: "3s" }} />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent" />
        <div className="relative flex flex-wrap items-end justify-between gap-6">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[11px] font-medium uppercase tracking-widest text-primary backdrop-blur">
              <Hexagon className="h-3 w-3" strokeWidth={2.5} /> EDITH Intelligence Hub · v2.4
            </div>
            <h1 className="text-4xl font-bold tracking-tight md:text-5xl">
              Welcome back, <span className="text-gradient-primary">NSB</span>
            </h1>
            <p className="max-w-xl text-sm text-muted-foreground md:text-base">
              Your AI swarm executed <span className="font-semibold text-foreground">{summary.agents.totalRuns} tasks</span> overnight and generated <span className="font-semibold text-success">${summary.earnings.thisMonth.toLocaleString()}</span> in revenue. Here's everything in one view.
            </p>
            <div className="flex flex-wrap items-center gap-2 pt-2">
              <button onClick={() => toast.success("Morning brief generated", { description: "Check the activity feed for new insights." })}
                className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-glow transition-transform hover:scale-[1.02]">
                <Zap className="h-3.5 w-3.5" /> Run Morning Brief
              </button>
              <button onClick={() => navigate({ to: "/analytics" })}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card/60 px-4 py-2 text-sm font-medium backdrop-blur transition-colors hover:border-primary/40">
                <Activity className="h-3.5 w-3.5" /> View Activity
              </button>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2 text-right">
            <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-card/60 px-3 py-1.5 text-xs text-muted-foreground backdrop-blur">
              <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
              Last sync: just now
            </div>
            <LiveClock />
          </div>
        </div>
      </div>

      {/* Stat row */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Link to="/invoices">
          <StatCard label="Total Revenue" value={`$${summary.earnings.total.toLocaleString()}`}
            sub={<span className="inline-flex items-center gap-1 text-success"><ArrowUpRight className="h-3 w-3" /> 0% vs last month</span>}
            icon={<DollarSign className="h-4 w-4" />} trend={sparkData} />
        </Link>
        <Link to="/freelance">
          <StatCard label="Active Freelance Jobs" value={summary.freelance.activeJobs.toString()}
            sub={`${summary.freelance.activeJobs} in progress · ${summary.freelance.newJobs} new lead(s)`}
            icon={<Briefcase className="h-4 w-4" />} accent="primary" trend={sparkData.slice().reverse()} />
        </Link>
        <Link to="/dropshipping">
          <StatCard label="Dropshipping Stores" value={summary.dropshipping.totalStores.toString()}
            sub={<div className="flex items-center gap-2">
              <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-success" />{summary.dropshipping.activeStores} active</span>
            </div>}
            icon={<Store className="h-4 w-4" />} accent="success" />
        </Link>
        <Link to="/agents">
          <StatCard label="Automation Rate" value={`${autoRate}%`}
            sub={`${summary.agents.totalRuns} automated run(s)`}
            icon={<Cpu className="h-4 w-4" />} accent="success">
            <div className="absolute right-4 top-4 h-16 w-16">
              <svg viewBox="0 0 36 36" className="h-full w-full -rotate-90">
                <circle cx="18" cy="18" r="15.5" fill="none" stroke="var(--muted)" strokeWidth="2.5" />
                <circle cx="18" cy="18" r="15.5" fill="none" stroke="var(--success)" strokeWidth="2.5"
                  strokeDasharray={`${(autoRate / 100) * 97.4} 97.4`} strokeLinecap="round" />
              </svg>
            </div>
          </StatCard>
        </Link>
      </div>

      {/* Revenue overview */}
      <div className="grid gap-4 lg:grid-cols-5">
        <div className="lg:col-span-3 rounded-xl border border-border/60 bg-gradient-card p-5 shadow-card">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold">Revenue Overview</h2>
              <p className="text-xs text-muted-foreground">Freelance vs Dropshipping</p>
            </div>
            <div className="flex rounded-md border border-border/60 bg-background/40 p-0.5 text-xs">
              {["7D", "30D", "90D", "1Y"].map((t) => (
                <button key={t} onClick={() => setPeriod(t)}
                  className={`px-2.5 py-1 rounded ${period === t ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-foreground"}`}>{t}</button>
              ))}
            </div>
          </div>
          {data.length === 0 ? (
            <div className="flex h-72 flex-col items-center justify-center text-center text-xs text-muted-foreground">
              No historical revenue data available
            </div>
          ) : (
            <div className="h-72">
              <ResponsiveContainer>
                <AreaChart data={data}>
                  <defs>
                    <linearGradient id="gp" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="ga" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="date" stroke="var(--muted-foreground)" fontSize={11} />
                  <YAxis stroke="var(--muted-foreground)" fontSize={11} />
                  <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} />
                  <Area dataKey="freelance" stroke="var(--primary)" strokeWidth={2} fill="url(#gp)" />
                  <Area dataKey="drop" stroke="var(--accent)" strokeWidth={2} fill="url(#ga)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
        <div className="lg:col-span-2 rounded-xl border border-border/60 bg-gradient-card p-5 shadow-card">
          <h2 className="text-base font-semibold">Revenue Breakdown</h2>
          <p className="text-xs text-muted-foreground">This month</p>
          {pieData.length === 0 ? (
            <div className="flex h-56 flex-col items-center justify-center text-center text-xs text-muted-foreground">
              No revenue breakdown available
            </div>
          ) : (
            <>
              <div className="h-56">
                <ResponsiveContainer>
                  <PieChart>
                    <Pie data={pieData} dataKey="value" innerRadius={55} outerRadius={85} paddingAngle={4} stroke="none">
                      {pieData.map((d, i) => <Cell key={i} fill={d.color} />)}
                    </Pie>
                    <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-2">
                {pieData.map((d) => (
                  <div key={d.name} className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded" style={{ background: d.color }} />{d.name}</span>
                    <span className="font-mono font-semibold">${d.value.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Engines */}
      <div className="grid gap-4 lg:grid-cols-2">
        <EngineCard title="Freelance Engine" accent="primary" link="/freelance" linkLabel="Open Studio"
          stats={[
            ["Jobs scanned today", summary.freelance.totalJobs.toString()],
            ["Proposals sent", proposals.length.toString()],
            ["Win rate", "0%"],
            ["Active projects", summary.freelance.activeJobs.toString()],
            ["Top domain", "None"],
          ]} />
        <EngineCard title="Dropshipping Engine" accent="success" link="/dropshipping" linkLabel="Open Studio"
          stats={[
            ["Products discovered", productsList.length.toString()],
            ["In validation", "0"],
            ["Live stores", summary.dropshipping.totalStores.toString()],
            ["Orders today", "0"],
            ["ROAS average", "0.0x"],
          ]} />
      </div>

      {/* Attention + Activity */}
      <div className="grid gap-4 lg:grid-cols-5">
        <div className="lg:col-span-3 rounded-xl border border-border/60 bg-gradient-card p-5 shadow-card">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-base font-semibold">
              <AlertTriangle className="h-4 w-4 text-warning" /> Needs Your Attention
              <span className="ml-1 rounded-full bg-destructive/20 px-2 py-0.5 text-xs font-bold text-destructive">{visibleAlerts.length}</span>
            </h2>
          </div>
          <div className="space-y-2">
            {visibleAlerts.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">All clear ✨</p>}
            {visibleAlerts.map((a: any) => {
              const Icon = a.level === "urgent" ? AlertCircle : a.level === "warning" ? AlertTriangle : Info;
              const color = a.level === "urgent" ? "text-destructive" : a.level === "warning" ? "text-warning" : "text-primary";
              const dest = a.category === "Freelance" ? "/freelance" : "/dropshipping";
              return (
                <div key={a.id} className="group flex items-center gap-3 rounded-lg border border-border/40 bg-card/40 p-3 transition-colors hover:border-primary/40">
                  <Icon className={`h-4 w-4 shrink-0 ${color}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{a.category}</span>
                      <span className="text-[10px] text-muted-foreground">· {a.time}</span>
                    </div>
                    <p className="text-sm font-medium">{a.title}</p>
                    <p className="truncate text-xs text-muted-foreground">{a.desc}</p>
                  </div>
                  <button onClick={() => navigate({ to: dest })}
                    className="rounded-md border border-primary/40 bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/20">{a.action}</button>
                  <button onClick={() => dismissAlert(a.id)} title="Dismiss"
                    className="rounded-md p-1.5 text-muted-foreground hover:text-foreground">×</button>
                </div>
              );
            })}
          </div>
        </div>

        <div className="lg:col-span-2 rounded-xl border border-border/60 bg-gradient-card p-5 shadow-card">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-base font-semibold"><Sparkles className="h-4 w-4 text-accent" /> Live Activity</h2>
            <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" /> live
            </span>
          </div>
          <div className="max-h-[320px] space-y-2 overflow-auto pr-1">
            {activity.length === 0 && <p className="py-6 text-center text-xs text-muted-foreground">No recent activity</p>}
            {activity.map((e: any, i: number) => (
              <div key={e.id || i} className={`rounded-md border-l-2 bg-card/40 p-2.5 text-xs ${e.cat === "freelance" ? "border-primary" : "border-accent"}`}>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <span className="font-mono text-[10px]">{e.time}</span>
                  {e.cat === "freelance" ? <Briefcase className="h-3 w-3 text-primary" /> : <Package className="h-3 w-3 text-accent" />}
                </div>
                <p className="mt-1 text-foreground">{e.text}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function LiveClock() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);
  if (!now) return <div className="h-[3.75rem]" />; // reserve space, no SSR mismatch
  return (
    <>
      <div className="font-mono text-3xl font-bold tracking-tight">
        {now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
      </div>
      <div className="text-xs uppercase tracking-widest text-muted-foreground">
        {now.toLocaleDateString([], { weekday: "long", month: "short", day: "numeric" })}
      </div>
    </>
  );
}

function EngineCard({ title, accent, stats, link, linkLabel }: {
  title: string; accent: "primary" | "success"; stats: [string, string][]; link: string; linkLabel: string;
}) {
  const color = accent === "primary" ? "var(--primary)" : "var(--success)";
  return (
    <div className="relative overflow-hidden rounded-xl border border-border/60 bg-gradient-card p-5 shadow-card">
      <div className="absolute inset-y-0 left-0 w-1" style={{ background: color }} />
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-base font-semibold">{title}</h3>
        <span className="flex items-center gap-1.5 rounded-full bg-success/10 px-2 py-0.5 text-xs text-success">
          <span className="h-1.5 w-1.5 rounded-full bg-success" /> Active
        </span>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {stats.map(([l, v]) => (
          <div key={l} className="rounded-lg border border-border/40 bg-card/40 p-3">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{l}</p>
            <p className="mt-1 font-mono text-sm font-semibold">{v}</p>
          </div>
        ))}
      </div>
      <Link to={link} className="mt-4 inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-card"
        style={{ borderColor: color, color }}>
        {linkLabel} <ArrowUpRight className="h-3 w-3" />
      </Link>
    </div>
  );
}

