import { createFileRoute } from "@tanstack/react-router";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useHydrated } from "@/lib/store";
import { stores, revenueData } from "@/lib/mockData";
import { Sparkles, TrendingUp } from "lucide-react";

export const Route = createFileRoute("/analytics")({
  head: () => ({ meta: [{ title: "Analytics — EDITH" }] }),
  component: Analytics,
});

const factors = [
  ["Revenue Growth", 92], ["Profitability", 84], ["Client Satisfaction", 96],
  ["Automation Rate", 92], ["Diversification", 71],
];

const funnel = [
  ["Leads", 1240], ["Proposals", 412], ["Won", 98], ["Completed", 87], ["Paid", 82],
];

const insights = [
  "Copy that wins freelance clients is being used to improve dropshipping ads — +14% CTR.",
  "Dropshipping product trends informing freelance service offerings — beauty niche detected.",
  "AI agents share QC patterns across engines — defect rate down 23%.",
];

const predictions = [
  { text: "Consider scaling Content Writing — demand up 40% across 4 platforms.", conf: 88 },
  { text: "ZenPod Sleep Pillow approaching holiday season — prepare inventory now.", conf: 76 },
  { text: "GlowBrush ROAS stabilizing — recommend incremental budget increase 20%.", conf: 82 },
];

function Analytics() {
  const completed = useHydrated((s) => s.completed, [] as any[]);
  const activeJobs = useHydrated((s) => s.activeJobs, [] as any[]);
  const hasData = completed.length > 0 || activeJobs.length > 0 || stores.length > 0;

  const currentFactors = hasData ? factors : [
    ["Revenue Growth", 0], ["Profitability", 0], ["Client Satisfaction", 0],
    ["Automation Rate", 100], ["Diversification", 0],
  ];

  const currentFunnel = hasData ? funnel : [
    ["Leads", 0], ["Proposals", 0], ["Won", 0], ["Completed", 0], ["Paid", 0],
  ];

  const currentInsights = hasData ? insights : [
    "No insights generated yet. Complete jobs or launch ads to see cross-engine insights.",
  ];

  const currentPredictions = hasData ? predictions : [];
  const healthScore = hasData ? 87 : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Universal Analytics</h1>
          <p className="mt-1 text-sm text-muted-foreground">Cross-engine insights and predictive intelligence.</p>
        </div>
        <div className="flex rounded-md border border-border/60 bg-card/40 p-0.5 text-xs">
          {["7D","30D","90D","Custom"].map((t,i)=>(
            <button key={t} className={`px-2.5 py-1 rounded ${i===1?"bg-primary/20 text-primary":"text-muted-foreground hover:text-foreground"}`}>{t}</button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-border/60 bg-gradient-card p-5 shadow-card text-center">
          <h3 className="text-sm font-semibold">Business Health Score</h3>
          <div className="relative mx-auto mt-3 h-40 w-40">
            <svg viewBox="0 0 36 36" className="h-full w-full -rotate-90">
              <circle cx="18" cy="18" r="15.5" fill="none" stroke="var(--muted)" strokeWidth="3" />
              <circle cx="18" cy="18" r="15.5" fill="none" stroke="url(#hg)" strokeWidth="3" strokeDasharray={`${(healthScore/100)*97.4} 97.4`} strokeLinecap="round" />
              <defs><linearGradient id="hg"><stop offset="0%" stopColor="var(--primary)" /><stop offset="100%" stopColor="var(--accent)" /></linearGradient></defs>
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="font-mono text-4xl font-bold">{healthScore}</span>
              <span className="text-xs text-muted-foreground">/ 100</span>
            </div>
          </div>
          <div className="mt-4 space-y-2 text-left">
            {currentFactors.map(([l, v]) => (
              <div key={l as string}>
                <div className="flex justify-between text-xs"><span className="text-muted-foreground">{l}</span><span className="font-mono">{v}</span></div>
                <div className="mt-1 h-1.5 rounded-full bg-muted"><div className="h-1.5 rounded-full bg-gradient-primary" style={{ width: `${v}%` }} /></div>
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-2 rounded-xl border border-border/60 bg-gradient-card p-5 shadow-card">
          <h3 className="text-sm font-semibold">Revenue Forecast — Next 30 Days</h3>
          <div className="mt-3 h-64">
            {revenueData.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center text-center text-xs text-muted-foreground border border-dashed border-border rounded-lg">
                No historical or projected revenue data available
              </div>
            ) : (
              <ResponsiveContainer>
                <AreaChart data={[...revenueData, { date: "May 10*", freelance: 5200, drop: 3100 }, { date: "May 20*", freelance: 6100, drop: 3700 }, { date: "May 30*", freelance: 7000, drop: 4200 }]}>
                  <defs>
                    <linearGradient id="fp" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--primary)" stopOpacity={0.4} /><stop offset="100%" stopColor="var(--primary)" stopOpacity={0} /></linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="date" stroke="var(--muted-foreground)" fontSize={11} />
                  <YAxis stroke="var(--muted-foreground)" fontSize={11} />
                  <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} />
                  <Area dataKey="freelance" stroke="var(--primary)" strokeWidth={2} fill="url(#fp)" />
                  <Area dataKey="drop" stroke="var(--accent)" strokeWidth={2} fill="var(--accent)" fillOpacity={0.15} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
          {revenueData.length > 0 && (
            <p className="mt-2 text-xs text-muted-foreground">* AI-projected values based on 90-day momentum.</p>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-border/60 bg-gradient-card p-5 shadow-card">
        <h3 className="mb-4 text-sm font-semibold">Revenue Funnel</h3>
        <div className="grid gap-2 sm:grid-cols-5">
          {currentFunnel.map(([l, v], i) => (
            <div key={l as string} className="rounded-lg border border-border/40 bg-card/40 p-3 text-center">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{l}</p>
              <p className="mt-1 font-mono text-xl font-bold">{(v as number).toLocaleString()}</p>
              {i > 0 && <p className="mt-1 text-[10px] text-success">{v as number > 0 ? Math.round(((v as number)/(currentFunnel[i-1][1] as number))*100) : 0}%</p>}
            </div>
          ))}
        </div>
      </div>

      {/* Freelance Margin & Tax Analytics */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-border/60 bg-gradient-card p-5 shadow-card">
          <h3 className="mb-3 text-sm font-semibold">Freelance Fee Margin Deductions</h3>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span>Upwork Fee Deductions (10%)</span>
                <span className="font-mono text-rose-400">-$450.00</span>
              </div>
              <div className="h-2 rounded-full bg-muted">
                <div className="h-2 rounded-full bg-rose-500" style={{ width: '10%' }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span>Fiverr Fee Deductions (20%)</span>
                <span className="font-mono text-rose-400">-$900.00</span>
              </div>
              <div className="h-2 rounded-full bg-muted">
                <div className="h-2 rounded-full bg-rose-500" style={{ width: '20%' }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span>Net Profit Margins (Take Home)</span>
                <span className="font-mono text-emerald-400">$3,085.00</span>
              </div>
              <div className="h-2 rounded-full bg-muted">
                <div className="h-2 rounded-full bg-emerald-500" style={{ width: '70%' }} />
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border/60 bg-gradient-card p-5 shadow-card flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-semibold">Projected Income Tax Reserves</h3>
            <p className="mt-1 text-xs text-muted-foreground">Estimated tax set-aside (25% rate) for current year earnings.</p>
          </div>
          <div className="mt-4 flex items-center justify-between border-t border-border/40 pt-4">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Total Payouts</p>
              <p className="font-mono text-xl font-bold">$4,435.00</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] uppercase tracking-wider text-amber-400">Tax Reserve (25%)</p>
              <p className="font-mono text-xl font-bold text-amber-400">$1,108.75</p>
            </div>
          </div>
          <p className="text-[10px] text-muted-foreground italic mt-3">💡 Tip: Move this tax reserve to a high-yield savings account monthly.</p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-border/60 bg-gradient-card p-5 shadow-card">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold"><Sparkles className="h-4 w-4 text-accent" /> Cross-Engine Insights</h3>
          <div className="space-y-3">
            {currentInsights.map((i, idx) => (
              <div key={idx} className="rounded-lg border border-border/40 bg-card/40 p-3 text-sm">{i}</div>
            ))}
          </div>
        </div>
        <div className="rounded-xl border border-border/60 bg-gradient-card p-5 shadow-card">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold"><TrendingUp className="h-4 w-4 text-primary" /> Predictive Recommendations</h3>
          <div className="space-y-3">
            {currentPredictions.length === 0 ? (
              <div className="rounded-lg border border-border/40 bg-card/40 p-6 text-center text-xs text-muted-foreground">
                No recommendations available yet. Run scans or complete jobs to populate.
              </div>
            ) : (
              currentPredictions.map((p, idx) => (
                <div key={idx} className="rounded-lg border border-border/40 bg-card/40 p-3">
                  <p className="text-sm">{p.text}</p>
                  <div className="mt-2 flex items-center gap-2">
                    <div className="h-1 flex-1 rounded-full bg-muted"><div className="h-1 rounded-full bg-gradient-primary" style={{ width: `${p.conf}%` }} /></div>
                    <span className="text-[10px] font-mono text-muted-foreground">{p.conf}% confidence</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
