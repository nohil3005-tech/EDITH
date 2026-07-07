import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ShoppingBag, Star, Search, Check, Loader2 } from "lucide-react";
import { useMarketplacePlugins, useInstalledPlugins } from "@/hooks/useApi";
import { toast } from "sonner";
import api from "@/lib/api";

export const Route = createFileRoute("/marketplace")({
  head: () => ({ meta: [{ title: "Marketplace — EDITH" }] }),
  component: Marketplace,
});

function Marketplace() {
  const { data: plugins = [], loading: pluginsLoading, refetch: refetchPlugins } = useMarketplacePlugins();
  const { data: installed = [], loading: installedLoading, refetch: refetchInstalled } = useInstalledPlugins();
  
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [cat, setCat] = useState("All");

  const serverPlugins = Array.isArray(plugins) ? plugins : [];
  const installedPluginsList = Array.isArray(installed) ? installed : [];

  const categories = ["All", ...Array.from(new Set(serverPlugins.map((p: any) => p.category || p.cat || "AI Agents")))];
  
  const filtered = serverPlugins.filter((p: any) =>
    (cat === "All" || (p.category || p.cat) === cat) &&
    (!q || p.name.toLowerCase().includes(q.toLowerCase()) || (p.description || p.desc || "").toLowerCase().includes(q.toLowerCase()))
  );

  const handleInstall = async (plugin: any) => {
    const isInstalled = installedPluginsList.some((ip: any) => ip.pluginId === plugin.id);
    if (isInstalled) return;

    setBusy(plugin.id);
    try {
      await api.marketplace.install(plugin.id);
      await Promise.all([refetchPlugins(), refetchInstalled()]);
      toast.success(`${plugin.name} successfully installed!`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to install plugin");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Marketplace</h1>
        <p className="mt-1 text-sm text-muted-foreground">Extend EDITH with agents, integrations, and templates.</p>
      </div>
      
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <input 
            value={q} 
            onChange={(e) => setQ(e.target.value)} 
            placeholder="Search plugins…" 
            className="w-full rounded-lg border border-border bg-card/40 pl-9 pr-3 py-2 text-sm focus:border-primary focus:outline-none" 
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {categories.map((c) => (
            <button 
              key={c} 
              onClick={() => setCat(c)} 
              className={`rounded-full border px-3 py-1 text-xs cursor-pointer ${
                cat === c ? "border-primary bg-primary/15 text-primary" : "border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {pluginsLoading || installedLoading ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading available plugins...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16 text-center">
          <p className="text-sm font-medium">No plugins found matching your query.</p>
          <p className="mt-1 text-xs text-muted-foreground">Try a different category or search term.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((p: any) => {
            const isInstalled = installedPluginsList.some((ip: any) => ip.pluginId === p.id);
            const isBusy = busy === p.id;
            const priceText = p.price === "0" || p.price === 0 || !p.price || p.price === "Free" ? "Free" : `$${p.price}`;

            return (
              <div key={p.id} className="rounded-xl border border-border/60 bg-gradient-card p-5 shadow-card hover:border-primary/40 transition-all">
                <div className="flex items-start justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15 text-primary">
                    <ShoppingBag className="h-5 w-5" />
                  </div>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                    priceText === "Free" ? "bg-success/15 text-success" : "bg-primary/15 text-primary"
                  }`}>
                    {priceText}
                  </span>
                </div>
                <h3 className="mt-3 font-semibold">{p.name}</h3>
                <p className="text-xs text-muted-foreground">{p.category || p.cat || "AI Agents"}</p>
                <p className="mt-2 text-sm text-muted-foreground line-clamp-2 h-10">{p.description || p.desc}</p>
                <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <Star className="h-3 w-3 fill-warning text-warning" /> {p.rating || "4.8"}
                  </span>
                  <span>{p.installs || "1.2k"} installs</span>
                </div>
                <button 
                  onClick={() => handleInstall(p)} 
                  disabled={isInstalled || isBusy}
                  className={`mt-4 inline-flex w-full items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-semibold shadow-glow cursor-pointer disabled:opacity-80 transition-all ${
                    isInstalled ? "bg-success/20 text-success cursor-default" : "bg-gradient-primary text-primary-foreground"
                  }`}
                >
                  {isInstalled ? (
                    <><Check className="h-4 w-4" /> Installed</>
                  ) : isBusy ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    priceText === "Free" ? "Install" : "Buy"
                  )}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}