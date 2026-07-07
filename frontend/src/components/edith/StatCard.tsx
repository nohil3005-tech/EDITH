import { ReactNode } from "react";
import { Area, AreaChart, ResponsiveContainer } from "recharts";

interface Props {
  label: string;
  value: string;
  sub?: ReactNode;
  icon: ReactNode;
  trend?: { v: number }[];
  accent?: "primary" | "success" | "warning";
  children?: ReactNode;
}

export function StatCard({ label, value, sub, icon, trend, accent = "primary", children }: Props) {
  const color = accent === "success" ? "var(--success)" : accent === "warning" ? "var(--warning)" : "var(--primary)";
  return (
    <div className="group relative overflow-hidden rounded-xl border border-border/60 bg-gradient-card p-5 shadow-card transition-all duration-300 hover:-translate-y-1 hover:border-primary/50 hover:shadow-glow">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent" />
      <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full opacity-0 blur-3xl transition-opacity duration-500 group-hover:opacity-30" style={{ background: color }} />
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">{label}</p>
          <p className="mt-2 font-mono text-3xl font-bold tracking-tight">{value}</p>
          {sub && <div className="mt-1.5 text-xs text-muted-foreground">{sub}</div>}
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-border/60 bg-card/80 shadow-inner transition-transform group-hover:scale-110 group-hover:rotate-6" style={{ color, boxShadow: `inset 0 0 16px -8px ${color}` }}>
          {icon}
        </div>
      </div>
      {trend && (
        <div className="mt-3 h-12 -mx-1">
          <ResponsiveContainer>
            <AreaChart data={trend}>
              <defs>
                <linearGradient id={`g-${label}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={color} stopOpacity={0.4} />
                  <stop offset="100%" stopColor={color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area dataKey="v" stroke={color} strokeWidth={2} fill={`url(#g-${label})`} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
      {children}
    </div>
  );
}
