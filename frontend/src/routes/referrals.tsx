import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Link2, Users, DollarSign, Award, Copy, Check } from "lucide-react";
import { useReferralStats } from "@/hooks/useApi";
import { toast } from "sonner";
import api from "@/lib/api";

export const Route = createFileRoute("/referrals")({
  head: () => ({ meta: [{ title: "Referrals — EDITH" }] }),
  component: Referrals,
});

function Referrals() {
  const { data, loading: statsLoading } = useReferralStats();
  const stats = data as any;
  const [copied, setCopied] = useState(false);
  const [list, setList] = useState<any[]>([]);
  const [listLoading, setListLoading] = useState(false);

  useEffect(() => {
    async function fetchList() {
      setListLoading(true);
      try {
        const res = await api.referrals.list() as any;
        if (res?.success && res.data) {
          setList(res.data);
        }
      } catch (err) {
        console.error("Failed to load referrals list", err);
      } finally {
        setListLoading(false);
      }
    }
    fetchList();
  }, []);

  const copyLink = () => {
    if (stats?.referralLink) {
      navigator.clipboard.writeText(stats.referralLink);
      setCopied(true);
      toast.success("Referral link copied!");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Referrals & Affiliate</h1>
        <p className="mt-1 text-sm text-muted-foreground">Invite friends and earn commissions on their store revenue and freelance contracts.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-border/60 bg-gradient-card p-5 shadow-card">
          <div className="flex items-center justify-between">
            <Users className="h-5 w-5 text-primary" />
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">Total</span>
          </div>
          <p className="mt-4 text-2xl font-mono font-semibold">{statsLoading ? "..." : (stats?.totalReferrals ?? 0)}</p>
          <p className="text-xs text-muted-foreground">Referred Users</p>
        </div>

        <div className="rounded-xl border border-border/60 bg-gradient-card p-5 shadow-card">
          <div className="flex items-center justify-between">
            <DollarSign className="h-5 w-5 text-success" />
            <span className="rounded-full bg-success/10 px-2 py-0.5 text-[10px] font-semibold text-success">Earned</span>
          </div>
          <p className="mt-4 text-2xl font-mono font-semibold">${statsLoading ? "..." : (stats?.totalCommissionEarned ?? 0)}</p>
          <p className="text-xs text-muted-foreground">Commissions Paid</p>
        </div>

        <div className="rounded-xl border border-border/60 bg-gradient-card p-5 shadow-card">
          <div className="flex items-center justify-between">
            <Award className="h-5 w-5 text-warning" />
            <span className="rounded-full bg-warning/10 px-2 py-0.5 text-[10px] font-semibold text-warning">Rate</span>
          </div>
          <p className="mt-4 text-2xl font-mono font-semibold">{statsLoading ? "..." : (stats?.commissionRate ?? "20%")}</p>
          <p className="text-xs text-muted-foreground">Partner Share</p>
        </div>

        <div className="rounded-xl border border-border/60 bg-gradient-card p-5 shadow-card">
          <div className="flex items-center justify-between">
            <Link2 className="h-5 w-5 text-primary" />
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">Pending</span>
          </div>
          <p className="mt-4 text-2xl font-mono font-semibold">{statsLoading ? "..." : (stats?.pendingReferrals ?? 0)}</p>
          <p className="text-xs text-muted-foreground">Pending Signups</p>
        </div>
      </div>

      {/* Share Link */}
      <div className="rounded-xl border border-border/60 bg-gradient-card p-6 shadow-card space-y-4">
        <h3 className="text-base font-semibold">Your Referral Link</h3>
        <p className="text-sm text-muted-foreground">Share this link to invite users. You earn commission on all activities they complete.</p>
        <div className="flex gap-2 max-w-xl">
          <input
            type="text"
            readOnly
            value={stats?.referralLink || "Loading..."}
            className="flex-1 rounded-lg border border-border bg-background/40 px-3 py-2 text-sm font-mono"
          />
          <button
            onClick={copyLink}
            className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-glow hover:opacity-90 cursor-pointer"
          >
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? "Copied" : "Copy Link"}
          </button>
        </div>
      </div>

      {/* Referral Table */}
      <div className="rounded-xl border border-border/60 bg-gradient-card shadow-card overflow-hidden">
        <div className="px-5 py-4 border-b border-border/60">
          <h3 className="font-semibold">Referred Partners</h3>
        </div>
        {listLoading ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Loading referrals list...</div>
        ) : list.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">No referrals yet. Start sharing your link to earn!</div>
        ) : (
          <table className="w-full text-sm text-left">
            <thead className="text-xs uppercase text-muted-foreground bg-card/40 border-b border-border/60">
              <tr>
                <th className="px-5 py-3">Referee</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Commissions Earned</th>
                <th className="px-5 py-3">Joined Date</th>
              </tr>
            </thead>
            <tbody>
              {list.map((r) => (
                <tr key={r.id} className="border-b border-border/40 last:border-0 hover:bg-card/60">
                  <td className="px-5 py-4 font-medium">{r.refereeEmail}</td>
                  <td className="px-5 py-4">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wider font-semibold ${r.status === "completed" ? "bg-success/15 text-success" : "bg-warning/15 text-warning"
                      }`}>
                      {r.status}
                    </span>
                  </td>
                  <td className="px-5 py-4 font-mono font-semibold">${Number(r.commissionEarned || 0).toFixed(2)}</td>
                  <td className="px-5 py-4 text-muted-foreground">{new Date(r.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
