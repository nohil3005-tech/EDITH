import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Pause, Flame, FlaskConical, Bookmark, X, Eye, BarChart3, Megaphone, Cog, Store, Loader2 } from "lucide-react";
import { stores } from "@/lib/mockData";
import { useHydrated } from "@/lib/store";
import { toast } from "sonner";
import { Area, AreaChart, Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

export const Route = createFileRoute("/dropshipping")({
  head: () => ({ meta: [{ title: "Dropshipping Studio — EDITH" }] }),
  component: Drop,
});

const tabs = [
  { key: "discover", label: "Product Discovery" },
  { key: "validate", label: "Validation Lab" },
  { key: "stores", label: "Stores" },
  { key: "analytics", label: "Analytics" },
];

function Drop() {
  const [tab, setTab] = useState("discover");
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dropshipping Studio</h1>
          <p className="mt-1 text-sm text-muted-foreground">Autonomous product discovery, validation, and store management.</p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-lg border border-border/60 bg-card/60 px-3 py-2 text-xs">
          <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
          <span className="text-muted-foreground">Auto-Scanning:</span> <span className="font-semibold">Every 4 hours</span>
          <button className="ml-2 rounded p-1 hover:bg-muted"><Pause className="h-3 w-3" /></button>
        </div>
      </div>

      <div className="flex gap-1 border-b border-border/60">
        {tabs.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`relative px-4 py-2.5 text-sm font-medium ${tab === t.key ? "text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
            {t.label}
            {tab === t.key && <span className="absolute inset-x-0 -bottom-px h-0.5 bg-gradient-to-r from-accent to-primary" />}
          </button>
        ))}
      </div>

      {tab === "discover" && <Discover />}
      {tab === "validate" && <Validate />}
      {tab === "stores" && <Stores />}
      {tab === "analytics" && <Analytics />}
    </div>
  );
}

function Discover() {
  const products = useHydrated((s) => s.products, [] as any[]);

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border/60 bg-gradient-card p-4 shadow-card">
        <div className="grid gap-3 md:grid-cols-4">
          <select className="rounded-lg border border-border bg-background/40 px-3 py-2 text-sm"><option>All categories</option></select>
          <select className="rounded-lg border border-border bg-background/40 px-3 py-2 text-sm"><option>All sources</option><option>TikTok Trending</option><option>AliExpress</option></select>
          <select className="rounded-lg border border-border bg-background/40 px-3 py-2 text-sm"><option>$5–$50</option></select>
          <button className="rounded-lg bg-gradient-primary px-3 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90">Scan Now</button>
        </div>
      </div>
      {products.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16 text-center">
          <p className="text-sm font-medium">No products discovered yet.</p>
          <p className="mt-1 text-xs text-muted-foreground">Run a scan or add sources to find trending products.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {products.map((p) => (
            <div key={p.id} className="group relative overflow-hidden rounded-xl border border-border/60 bg-gradient-card p-4 shadow-card transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-glow">
              <div className="flex items-start justify-between">
                {p.trending > 200 && (
                  <span className="inline-flex items-center gap-1 rounded-md bg-destructive/15 px-2 py-0.5 text-[10px] font-bold text-destructive"><Flame className="h-3 w-3" /> TRENDING</span>
                )}
                <ScoreGauge score={p.score} />
              </div>
              <div className="mt-3 flex h-32 items-center justify-center rounded-lg bg-muted text-6xl">{p.img}</div>
              <h3 className="mt-3 font-semibold">{p.name}</h3>
              <span className="text-xs text-muted-foreground">{p.category}</span>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-md bg-card/60 p-2"><div className="text-muted-foreground text-[10px]">📱 TikTok</div><div className="font-mono">{(p.posts/1000).toFixed(1)}K posts</div></div>
                <div className="rounded-md bg-card/60 p-2"><div className="text-muted-foreground text-[10px]">📈 MoM</div><div className="font-mono text-success">+{p.trending}%</div></div>
                <div className="rounded-md bg-card/60 p-2"><div className="text-muted-foreground text-[10px]">💰 Cost</div><div className="font-mono">${p.cost}</div></div>
                <div className="rounded-md bg-card/60 p-2"><div className="text-muted-foreground text-[10px]">💵 Sell</div><div className="font-mono">${p.sell}</div></div>
                <div className="rounded-md bg-card/60 p-2"><div className="text-muted-foreground text-[10px]">📊 Margin</div><div className="font-mono text-success">{p.margin}x</div></div>
                <div className="rounded-md bg-card/60 p-2"><div className="text-muted-foreground text-[10px]">🏪 Comp</div>
                  <div className={`font-mono ${p.comp === "Low" ? "text-success" : p.comp === "Medium" ? "text-warning" : "text-destructive"}`}>{p.comp}</div>
                </div>
              </div>
              <div className="mt-3 h-10">
                <ResponsiveContainer><AreaChart data={Array.from({length:12},(_,i)=>({v:Math.sin(i)*10+i*3+10}))}>
                  <Area dataKey="v" stroke="var(--accent)" fill="var(--accent)" fillOpacity={0.2} strokeWidth={1.5} />
                </AreaChart></ResponsiveContainer>
              </div>
              <div className="mt-3 flex gap-2">
                <button className="flex-1 inline-flex items-center justify-center gap-1 rounded-md bg-gradient-primary py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90"><FlaskConical className="h-3.5 w-3.5" /> Validate</button>
                <button className="rounded-md border border-border px-2 py-1.5 text-xs hover:bg-card"><Bookmark className="h-3.5 w-3.5" /></button>
                <button className="rounded-md px-2 py-1.5 text-xs text-muted-foreground hover:bg-card"><X className="h-3.5 w-3.5" /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ScoreGauge({ score }: { score: number }) {
  const color = score >= 80 ? "var(--success)" : score >= 60 ? "var(--warning)" : "var(--destructive)";
  return (
    <div className="relative h-12 w-12">
      <svg viewBox="0 0 36 36" className="h-full w-full -rotate-90">
        <circle cx="18" cy="18" r="15.5" fill="none" stroke="var(--muted)" strokeWidth="3" />
        <circle cx="18" cy="18" r="15.5" fill="none" stroke={color} strokeWidth="3" strokeDasharray={`${(score/100)*97.4} 97.4`} strokeLinecap="round" />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center font-mono text-xs font-bold">{score}</div>
    </div>
  );
}

function Validate() {
  const products = useHydrated((s) => s.products, [] as any[]);
  const p = products[0];

  const [showShopifyModal, setShowShopifyModal] = useState(false);
  const [shopifyStore, setShopifyStore] = useState("my-trending-shop");
  const [listingPrice, setListingPrice] = useState(p ? p.sell.toString() : "29.99");
  const [pushing, setPushing] = useState(false);

  if (!p) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-accent/10 text-accent">
          <FlaskConical className="h-8 w-8" />
        </div>
        <p className="mt-4 text-sm font-medium">No products in validation queue.</p>
        <p className="mt-1 text-xs text-muted-foreground">Find a trending product in Product Discovery and start validation.</p>
      </div>
    );
  }

  const steps = [
    { name: "Search Volume Check", desc: "Google: 18K/mo · Amazon: 45K/mo", status: "done" },
    { name: "Competition Analysis", desc: "3 Shopify stores · fragmented market", status: "done" },
    { name: "Margin Analysis", desc: "75% margin, healthy", status: "done" },
    { name: "Social Engagement Test", desc: "Running… 60% complete", status: "running" },
    { name: "Supplier Reliability", desc: "Queued", status: "queued" },
  ];

  const handlePushToShopify = () => {
    setPushing(true);
    setTimeout(() => {
      setPushing(false);
      setShowShopifyModal(false);
      toast.success(`"${p.name}" successfully listed to Shopify! Direct listing available at ${shopifyStore}.myshopify.com/products/${p.name.toLowerCase().replace(/\s+/g, '-')}`);
    }, 1800);
  };

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <div className="rounded-xl border border-border/60 bg-gradient-card p-5 shadow-card">
        <div className="mb-4 flex h-48 items-center justify-center rounded-lg bg-muted text-8xl">{p.img}</div>
        <h2 className="text-lg font-semibold">{p.name}</h2>
        <p className="text-xs text-muted-foreground">{p.category} · AliExpress supplier</p>
        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
          <div className="rounded-md bg-card/60 p-2"><div className="text-[10px] text-muted-foreground">Cost</div><div className="font-mono font-semibold">${p.cost}</div></div>
          <div className="rounded-md bg-card/60 p-2"><div className="text-[10px] text-muted-foreground">Sell</div><div className="font-mono font-semibold">${p.sell}</div></div>
          <div className="rounded-md bg-card/60 p-2"><div className="text-[10px] text-muted-foreground">Margin</div><div className="font-mono font-semibold text-success">{p.margin}x</div></div>
        </div>
        <button className="mt-4 w-full rounded-lg bg-gradient-primary py-2 text-sm font-semibold text-primary-foreground">Run Full Validation</button>
      </div>

      <div className="rounded-xl border border-border/60 bg-gradient-card p-5 shadow-card lg:col-span-1">
        <h3 className="mb-4 text-sm font-semibold">Validation Pipeline</h3>
        <div className="space-y-4">
          {steps.map((s, i) => (
            <div key={i} className="flex gap-3">
              <div className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs ${
                s.status === "done" ? "bg-success/20 text-success" : s.status === "running" ? "bg-primary/20 text-primary animate-pulse" : "bg-muted text-muted-foreground"
              }`}>{s.status === "done" ? "✓" : s.status === "running" ? "⟳" : "○"}</div>
              <div className="flex-1">
                <p className="text-sm font-medium">{s.name}</p>
                <p className="text-xs text-muted-foreground">{s.desc}</p>
                {s.status === "running" && <div className="mt-1.5 h-1 w-full rounded-full bg-muted"><div className="h-1 w-3/5 rounded-full bg-gradient-primary" /></div>}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-border/60 bg-gradient-card p-5 shadow-card text-center">
        <h3 className="mb-4 text-sm font-semibold">Validation Score</h3>
        <div className="relative mx-auto h-44 w-44">
          <svg viewBox="0 0 36 36" className="h-full w-full -rotate-90">
            <circle cx="18" cy="18" r="15.5" fill="none" stroke="var(--muted)" strokeWidth="3" />
            <circle cx="18" cy="18" r="15.5" fill="none" stroke="var(--success)" strokeWidth="3" strokeDasharray={`${0.87 * 97.4} 97.4`} strokeLinecap="round" />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="font-mono text-4xl font-bold">87</span>
            <span className="text-xs text-muted-foreground">/ 100</span>
          </div>
        </div>
        <div className="mt-3 inline-flex items-center gap-1 rounded-full bg-success/15 px-3 py-1 text-xs font-bold text-success">VERDICT: PASSED</div>
        <div className="mt-4 flex flex-col gap-2">
          <button onClick={() => setShowShopifyModal(true)} className="rounded-lg bg-primary/20 py-2 text-sm font-semibold text-primary hover:bg-primary/30">🛍️ List to Shopify</button>
          <button className="rounded-lg bg-success/20 py-2 text-sm font-semibold text-success hover:bg-success/30">✅ Approve & Build Store</button>
          <button className="rounded-lg border border-border py-2 text-sm hover:bg-card">⏸️ Save & Monitor</button>
          <button className="text-xs text-muted-foreground hover:text-destructive">Reject Product</button>
        </div>
      </div>

      {showShopifyModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 p-4 backdrop-blur-md" onClick={() => setShowShopifyModal(false)}>
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-2xl border border-border/60 bg-card p-5 shadow-elevated space-y-4 text-left">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-primary">Shopify Lister</p>
              <h3 className="text-base font-bold mt-1">Push "{p.name}" to Shopify</h3>
            </div>
            
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">Shopify Domain</label>
                <div className="flex rounded-md border border-border bg-background/50 overflow-hidden text-xs">
                  <input value={shopifyStore} onChange={e => setShopifyStore(e.target.value)} className="flex-1 bg-transparent px-2.5 py-2 outline-none" />
                  <span className="bg-muted px-2.5 py-2 text-muted-foreground font-mono">.myshopify.com</span>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">Listing Price ($)</label>
                <input value={listingPrice} onChange={e => setListingPrice(e.target.value)} className="w-full rounded-md border border-border bg-background/50 px-2.5 py-2 text-xs outline-none" />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setShowShopifyModal(false)} className="rounded-lg border border-border px-4 py-2 text-xs hover:bg-muted">Cancel</button>
              <button onClick={handlePushToShopify} disabled={pushing} className="rounded-lg bg-gradient-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-glow flex items-center gap-1.5">
                {pushing ? <Loader2 className="h-3 w-3 animate-spin" /> : '⚡ Push Product'}
                {pushing ? 'Pushing...' : 'List Product'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Stores() {
  if (stores.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16 text-center w-full">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-success/10 text-success">
          <Store className="h-8 w-8" />
        </div>
        <p className="mt-4 text-sm font-medium">No live stores yet.</p>
        <p className="mt-1 text-xs text-muted-foreground">Approve a product in the Validation Lab to automatically build a store.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {stores.map((s) => {
        const colorMap: Record<string,string> = { success: "var(--success)", warning: "var(--warning)", primary: "var(--primary)", destructive: "var(--destructive)" };
        const c = colorMap[s.color];
        return (
          <div key={s.id} className="relative overflow-hidden rounded-xl border border-border/60 bg-gradient-card p-5 shadow-card">
            <div className="absolute inset-x-0 top-0 h-1" style={{ background: c }} />
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full" style={{ background: c }} />
                  <h3 className="text-base font-semibold">{s.name}</h3>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">Product: <span className="text-foreground">{s.product}</span></p>
              </div>
              <div className="text-right">
                <span className="rounded-md px-2 py-0.5 text-[10px] font-bold tracking-wider" style={{ color: c, background: `color-mix(in oklab, ${c} 15%, transparent)` }}>{s.status}</span>
                <p className="mt-1 text-xs text-muted-foreground">Age: {s.age}d</p>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-4 gap-2">
              {[["Orders today", s.orders], ["Revenue today", `$${s.rev}`], ["Ad Spend", `$${s.spend}`], ["ROAS", `${s.roas}x`]].map(([l, v]) => (
                <div key={l} className="rounded-md bg-card/60 p-2 text-center">
                  <p className="text-[10px] text-muted-foreground">{l}</p>
                  <p className="mt-0.5 font-mono text-sm font-semibold">{v}</p>
                </div>
              ))}
            </div>
            <p className="mt-3 text-xs text-muted-foreground">Visitors: <span className="text-foreground font-medium">{s.visitors}</span> · Conv: <span className="text-foreground font-medium">{s.cvr}%</span> · AOV: <span className="text-foreground font-medium">${s.aov}</span></p>
            <div className="mt-3 flex gap-2 text-xs">
              <button className="inline-flex items-center gap-1 rounded-md border border-border px-2.5 py-1.5 hover:bg-card"><Eye className="h-3 w-3" /> View</button>
              <button className="inline-flex items-center gap-1 rounded-md border border-border px-2.5 py-1.5 hover:bg-card"><BarChart3 className="h-3 w-3" /> Details</button>
              <button className="inline-flex items-center gap-1 rounded-md border border-border px-2.5 py-1.5 hover:bg-card"><Megaphone className="h-3 w-3" /> Ads</button>
              <button className="inline-flex items-center gap-1 rounded-md border border-border px-2.5 py-1.5 hover:bg-card"><Cog className="h-3 w-3" /> Config</button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Analytics() {
  const hasStores = stores.length > 0;
  const data = hasStores ? Array.from({length:14},(_,i)=>({d:`D${i+1}`,rev:80+i*15+Math.sin(i)*30,ads:50+i*8})) : [];
  const sources = hasStores ? [{n:"Mon",fb:120,tt:80,gg:30,dr:20},{n:"Tue",fb:140,tt:90,gg:40,dr:25},{n:"Wed",fb:130,tt:110,gg:35,dr:30},{n:"Thu",fb:160,tt:120,gg:45,dr:30},{n:"Fri",fb:180,tt:140,gg:55,dr:35},{n:"Sat",fb:200,tt:160,gg:60,dr:40},{n:"Sun",fb:190,tt:150,gg:55,dr:38}] : [];
  
  const ads = hasStores ? [
    { name: "Ad #1 — UGC Demo", platform: "TikTok", spend: 120, rev: 480, roas: 4.0, status: "active" },
    { name: "Ad #2 — Lifestyle", platform: "Meta", spend: 95, rev: 285, roas: 3.0, status: "active" },
    { name: "Ad #3 — Testimonial", platform: "Meta", spend: 60, rev: 72, roas: 1.2, status: "paused" },
    { name: "Ad #4 — Carousel", platform: "TikTok", spend: 40, rev: 12, roas: 0.3, status: "killed" },
  ] : [];

  const stats = [
    ["Total Revenue", hasStores ? "$4,435" : "$0"],
    ["Total Orders", hasStores ? "127" : "0"],
    ["Avg ROAS", hasStores ? "3.2x" : "0.0x"],
    ["Profit Margin", hasStores ? "41%" : "0%"]
  ];

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map(([l,v])=>(
          <div key={l} className="rounded-xl border border-border/60 bg-gradient-card p-4 shadow-card">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{l}</p>
            <p className="mt-1 font-mono text-2xl font-bold">{v}</p>
            {hasStores && (
              <div className="mt-2 h-8"><ResponsiveContainer><AreaChart data={Array.from({length:8},(_,i)=>({v:i*5+Math.sin(i)*10+10}))}><Area dataKey="v" stroke="var(--accent)" fill="var(--accent)" fillOpacity={0.2} strokeWidth={1.5} /></AreaChart></ResponsiveContainer></div>
            )}
          </div>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-border/60 bg-gradient-card p-5 shadow-card">
          <h3 className="mb-3 text-sm font-semibold">Daily Revenue & Ad Spend</h3>
          {!hasStores ? (
            <div className="flex h-64 flex-col items-center justify-center text-center text-xs text-muted-foreground">No data available</div>
          ) : (
            <div className="h-64"><ResponsiveContainer><AreaChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="d" stroke="var(--muted-foreground)" fontSize={10} />
              <YAxis stroke="var(--muted-foreground)" fontSize={10} />
              <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} />
              <Area dataKey="rev" stroke="var(--success)" fill="var(--success)" fillOpacity={0.2} />
              <Area dataKey="ads" stroke="var(--warning)" fill="var(--warning)" fillOpacity={0.15} />
            </AreaChart></ResponsiveContainer></div>
          )}
        </div>
        <div className="rounded-xl border border-border/60 bg-gradient-card p-5 shadow-card">
          <h3 className="mb-3 text-sm font-semibold">Traffic Sources</h3>
          {!hasStores ? (
            <div className="flex h-64 flex-col items-center justify-center text-center text-xs text-muted-foreground">No data available</div>
          ) : (
            <div className="h-64"><ResponsiveContainer><BarChart data={sources}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="n" stroke="var(--muted-foreground)" fontSize={10} />
              <YAxis stroke="var(--muted-foreground)" fontSize={10} />
              <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="fb" stackId="a" fill="var(--chart-5)" />
              <Bar dataKey="tt" stackId="a" fill="var(--primary)" />
              <Bar dataKey="gg" stackId="a" fill="var(--accent)" />
              <Bar dataKey="dr" stackId="a" fill="var(--warning)" />
            </BarChart></ResponsiveContainer></div>
          )}
        </div>
      </div>
      <div className="overflow-hidden rounded-xl border border-border/60 bg-gradient-card shadow-card">
        {ads.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">No active ad campaigns.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase text-muted-foreground">
              <tr className="border-b border-border/60">{["Ad","Platform","Spend","Revenue","ROAS","Status"].map(h=><th key={h} className="px-4 py-3">{h}</th>)}</tr>
            </thead>
            <tbody>
              {ads.map((a,i)=>(
                <tr key={i} className={`border-b border-border/40 last:border-0 ${a.roas>3?"bg-success/5":a.roas<1?"bg-destructive/5":""}`}>
                  <td className="px-4 py-3">{a.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{a.platform}</td>
                  <td className="px-4 py-3 font-mono">${a.spend}</td>
                  <td className="px-4 py-3 font-mono">${a.rev}</td>
                  <td className={`px-4 py-3 font-mono font-semibold ${a.roas>=3?"text-success":a.roas>=1?"text-warning":"text-destructive"}`}>{a.roas}x</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${a.status==="active"?"bg-success/15 text-success":a.status==="paused"?"bg-warning/15 text-warning":"bg-destructive/15 text-destructive"}`}>{a.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
