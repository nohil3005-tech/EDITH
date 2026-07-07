import { createFileRoute } from "@tanstack/react-router";
import { agents } from "@/lib/mockData";
import { Bar, BarChart, ResponsiveContainer } from "recharts";
import { Cog, Pause, FileText } from "lucide-react";

export const Route = createFileRoute("/agents")({
  head: () => ({ meta: [{ title: "AI Agents — EDITH" }] }),
  component: Agents,
});

function Agents() {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">AI Agent Swarm</h1>
          <p className="mt-1 text-sm text-muted-foreground">13 specialized agents working across freelancing and dropshipping.</p>
        </div>
        <span className="inline-flex items-center gap-2 rounded-full bg-success/10 px-3 py-1.5 text-xs font-medium text-success">
          <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" /> All Systems Operational
        </span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {agents.map((a) => {
          const data = Array.from({ length: 7 }, (_, i) => ({ v: 5 + Math.round(Math.sin(i + a.name.length) * 5 + i * 2) }));
          const dot = a.status === "active" ? "bg-success" : a.status === "idle" ? "bg-warning" : "bg-muted";
          return (
            <div key={a.name} className="relative overflow-hidden rounded-xl border border-border/60 bg-gradient-card p-5 shadow-card transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-glow">
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
              <div className="flex items-start justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-2xl">{a.icon}</div>
                <span className={`flex items-center gap-1.5 rounded-full bg-card/60 px-2 py-0.5 text-[10px]`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${dot}`} /> {a.status}
                </span>
              </div>
              <h3 className="mt-3 text-sm font-semibold">{a.name}</h3>
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{a.domain}</span>
              <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-md bg-card/60 p-1.5"><div className="text-[9px] text-muted-foreground">Today</div><div className="font-mono text-sm font-semibold">{a.jobs}</div></div>
                <div className="rounded-md bg-card/60 p-1.5"><div className="text-[9px] text-muted-foreground">Success</div><div className="font-mono text-sm font-semibold text-success">{a.success}%</div></div>
                <div className="rounded-md bg-card/60 p-1.5"><div className="text-[9px] text-muted-foreground">Rev</div><div className="font-mono text-sm font-semibold">${a.rev}</div></div>
              </div>
              <div className="mt-3 h-10">
                <ResponsiveContainer><BarChart data={data}><Bar dataKey="v" fill="var(--primary)" radius={2} /></BarChart></ResponsiveContainer>
              </div>
              <div className="mt-3 flex gap-1.5 text-[10px]">
                <button className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 hover:bg-card"><Cog className="h-3 w-3" /> Config</button>
                <button className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 hover:bg-card"><Pause className="h-3 w-3" /> Pause</button>
                <button className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 hover:bg-card"><FileText className="h-3 w-3" /> Logs</button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
