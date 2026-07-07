import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, Download, Search, Receipt, CheckCircle2, Send, Eye, X } from "lucide-react";
import { fmtMoney, fmtDate } from "@/lib/format";
import { InvoiceModal } from "@/components/edith/InvoiceModal";
import { toast } from "sonner";
import { useEdith, useHydrated } from "@/lib/store";
import { useConfirm } from "@/components/edith/ConfirmDialog";
import type { StoredInvoice } from "@/lib/mockData";

export const Route = createFileRoute("/invoices")({
  head: () => ({ meta: [{ title: "Invoices — EDITH" }] }),
  component: InvoicesPage,
});

const FILTERS = ["All", "Draft", "Sent", "Paid", "Overdue"] as const;
type Filter = typeof FILTERS[number];

function InvoicesPage() {
  const invoices = useHydrated((s) => s.invoices, [] as StoredInvoice[]);
  const updateInvoice = useEdith((s) => s.updateInvoice);
  const removeInvoice = useEdith((s) => s.removeInvoice);
  const settings = useHydrated((s) => s.paymentSettings, { currency: "USD" } as any);
  const confirm = useConfirm();

  const [filter, setFilter] = useState<Filter>("All");
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [previewing, setPreviewing] = useState<StoredInvoice | null>(null);

  const isOverdue = (r: StoredInvoice) => r.status === "sent" && r.dueAt && new Date(r.dueAt) < new Date();
  const filtered = invoices.filter((r) => {
    const eff = isOverdue(r) ? "Overdue" : r.status[0].toUpperCase() + r.status.slice(1);
    if (filter !== "All" && eff !== filter) return false;
    if (q && !`${r.number} ${r.clientName}`.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });

  const markPaid = (id: string) => {
    updateInvoice(id, { status: "paid", paidAt: new Date().toISOString() });
    toast.success("Marked as paid");
  };
  const send = (id: string) => {
    updateInvoice(id, { status: "sent" });
    toast.success("Invoice sent");
  };
  const onDelete = async (inv: StoredInvoice) => {
    if (await confirm({ title: "Delete invoice?", message: `Invoice ${inv.number} will be permanently removed.`, variant: "danger", confirmText: "Delete" })) {
      removeInvoice(inv.id);
      toast.success("Invoice deleted");
    }
  };

  const exportCsv = () => {
    const rows = [["Number", "Client", "Status", "Total", "Created", "Due"]];
    filtered.forEach((r) => rows.push([r.number, r.clientName, r.status, String(r.total), r.createdAt, r.dueAt]));
    const csv = rows.map((r) => r.map((c) => `"${(c || "").replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "invoices.csv"; a.click();
    toast.success("CSV exported");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Invoices</h1>
          <p className="mt-1 text-sm text-muted-foreground">Manage and send invoices to your clients.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={exportCsv} className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card/40 px-3 py-2 text-sm hover:bg-card">
            <Download className="h-3.5 w-3.5" /> Export CSV
          </button>
          <button onClick={() => setOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-glow">
            <Plus className="h-3.5 w-3.5" /> Generate New Invoice
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex rounded-lg border border-border/60 bg-card/40 p-0.5">
          {FILTERS.map((f) => {
            const count = f === "All" ? invoices.length : invoices.filter((r) => (isOverdue(r) ? "Overdue" : r.status[0].toUpperCase() + r.status.slice(1)) === f).length;
            return (
              <button key={f} onClick={() => setFilter(f)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${filter === f ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-foreground"}`}>
                {f} <span className="ml-1 opacity-70">{count}</span>
              </button>
            );
          })}
        </div>
        <div className="relative ml-auto w-full md:w-64">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search…"
            className="w-full rounded-lg border border-border bg-card/40 pl-8 pr-3 py-1.5 text-sm" />
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-border/60 bg-gradient-card shadow-card">
        {filtered.length === 0 ? (
          <EmptyState onCreate={() => setOpen(true)} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border/60 bg-card/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Invoice #</th>
                  <th className="px-4 py-3">Client</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => {
                  const overdue = isOverdue(r);
                  return (
                    <tr key={r.id} onClick={() => setPreviewing(r)} className={`cursor-pointer border-b border-border/40 hover:bg-card/40 ${overdue ? "bg-destructive/5" : ""}`}>
                      <td className="px-4 py-3 font-mono">{r.number}</td>
                      <td className="px-4 py-3">{r.clientName}</td>
                      <td className="px-4 py-3 text-right font-mono">{fmtMoney(r.total, r.currency)}</td>
                      <td className="px-4 py-3"><StatusBadge status={overdue ? "overdue" : r.status} /></td>
                      <td className="px-4 py-3 text-muted-foreground">{fmtDate(r.createdAt)}</td>
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-end gap-1.5">
                          {r.status === "draft" && (
                            <button onClick={() => send(r.id)} className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs hover:border-primary hover:text-primary">
                              <Send className="h-3 w-3" /> Send
                            </button>
                          )}
                          {r.status !== "paid" && (
                            <button onClick={() => markPaid(r.id)} className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs hover:border-success hover:text-success">
                              <CheckCircle2 className="h-3 w-3" /> Mark Paid
                            </button>
                          )}
                          <button onClick={() => setPreviewing(r)} className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs hover:border-primary hover:text-primary">
                            <Eye className="h-3 w-3" /> View
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <InvoiceModal open={open} onClose={() => setOpen(false)} />

      {previewing && (
        <PreviewModal inv={previewing} settings={settings} onClose={() => setPreviewing(null)} onMarkPaid={() => { markPaid(previewing.id); setPreviewing(null); }} onDelete={() => { onDelete(previewing); setPreviewing(null); }} />
      )}
    </div>
  );
}

function PreviewModal({ inv, settings, onClose, onMarkPaid, onDelete }: any) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="relative max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-border/60 bg-gradient-card p-6 shadow-elevated">
        <button onClick={onClose} className="absolute right-4 top-4 rounded-lg p-1.5 text-muted-foreground hover:bg-card hover:text-foreground"><X className="h-4 w-4" /></button>
        <div className="rounded-xl bg-white p-8 text-slate-900">
          <div className="flex items-start justify-between border-b border-slate-200 pb-6">
            <div>
              <h1 className="text-2xl font-bold">{settings?.businessName || "EDITH Agency"}</h1>
              <p className="text-xs text-slate-500 whitespace-pre-line">{settings?.businessAddress}</p>
            </div>
            <div className="text-right">
              <h2 className="text-3xl font-bold tracking-tight text-purple-600">INVOICE</h2>
              <p className="text-xs text-slate-500 font-mono mt-1">{inv.number}</p>
              <p className="text-xs text-slate-500 mt-2">Date: {fmtDate(inv.createdAt)}</p>
              <p className="text-xs text-slate-500">Due: {fmtDate(inv.dueAt)}</p>
            </div>
          </div>
          <div className="mt-6">
            <p className="text-xs uppercase tracking-wider text-slate-400">Bill To</p>
            <p className="mt-1 font-semibold">{inv.clientName}</p>
            <p className="text-sm text-slate-600">{inv.clientEmail}</p>
          </div>
          <table className="mt-6 w-full text-sm">
            <thead className="border-b border-slate-200 text-left text-xs uppercase text-slate-500">
              <tr><th className="py-2">Description</th><th className="text-right">Qty</th><th className="text-right">Rate</th><th className="text-right">Amount</th></tr>
            </thead>
            <tbody>
              {inv.items.map((it: any, i: number) => (
                <tr key={i} className="border-b border-slate-100">
                  <td className="py-2">{it.description || "—"}</td>
                  <td className="text-right">{it.quantity}</td>
                  <td className="text-right">{fmtMoney(it.rate, inv.currency)}</td>
                  <td className="text-right">{fmtMoney(it.quantity * it.rate, inv.currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-4 flex justify-end">
            <div className="w-64 space-y-1 text-sm">
              <div className="flex justify-between"><span>Subtotal</span><span>{fmtMoney(inv.subtotal, inv.currency)}</span></div>
              <div className="flex justify-between"><span>Tax</span><span>{fmtMoney(inv.tax, inv.currency)}</span></div>
              <div className="flex justify-between border-t border-slate-300 pt-2 text-base font-bold text-purple-600"><span>Total</span><span>{fmtMoney(inv.total, inv.currency)}</span></div>
            </div>
          </div>

          {(inv as any).paymentDetails ? (
            <div className="mt-6 border-t border-slate-200 pt-6">
              <p className="text-xs uppercase tracking-wider text-slate-400 font-bold mb-2">Payment Information</p>
              <p className="text-sm font-semibold text-purple-600 mb-2">Method: {(inv as any).paymentDetails.name}</p>
              
              {((inv as any).paymentDetails.type === 'wire_transfer' || (inv as any).paymentDetails.type === 'wise_transfer') && (
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-xs text-slate-700 space-y-1.5 font-sans">
                  {(inv as any).paymentDetails.details?.bankName && <div><span className="font-semibold text-slate-500 w-20 inline-block">Bank:</span> {(inv as any).paymentDetails.details.bankName}</div>}
                  {(inv as any).paymentDetails.details?.accountNumber && <div><span className="font-semibold text-slate-500 w-20 inline-block">Account:</span> {(inv as any).paymentDetails.details.accountNumber}</div>}
                  {(inv as any).paymentDetails.details?.routingNumber && <div><span className="font-semibold text-slate-500 w-20 inline-block">Routing:</span> {(inv as any).paymentDetails.details.routingNumber}</div>}
                  {(inv as any).paymentDetails.details?.holder && <div><span className="font-semibold text-slate-500 w-20 inline-block">Holder:</span> {(inv as any).paymentDetails.details.holder}</div>}
                  {(inv as any).paymentDetails.type === 'wire_transfer' && (inv as any).paymentDetails.details?.swift && <div><span className="font-semibold text-slate-500 w-20 inline-block">SWIFT:</span> {(inv as any).paymentDetails.details.swift}</div>}
                  {(inv as any).paymentDetails.type === 'wire_transfer' && (inv as any).paymentDetails.details?.ifsc && <div><span className="font-semibold text-slate-500 w-20 inline-block">IFSC:</span> {(inv as any).paymentDetails.details.ifsc}</div>}
                  {(inv as any).paymentDetails.details?.notes && <div className="border-t border-slate-200 pt-1.5 mt-1.5 text-slate-500 italic">Note: {(inv as any).paymentDetails.details.notes}</div>}
                </div>
              )}

              {(inv as any).paymentDetails.type === 'upi' && (
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-xs text-slate-700 space-y-1.5">
                  <div><span className="font-semibold text-slate-500">UPI ID:</span> <span className="font-mono text-sm font-bold text-slate-800">{(inv as any).paymentDetails.details?.upiId}</span></div>
                  <div className="text-slate-500 italic mt-1">(Scan QR or send payment to this UPI ID)</div>
                </div>
              )}

              {['paypal', 'stripe_link', 'razorpay_link', 'custom_url'].includes((inv as any).paymentDetails.type) && (inv as any).paymentLink && (
                <a 
                  href={(inv as any).paymentLink} 
                  target="_blank" 
                  rel="noreferrer" 
                  className="block w-full rounded-lg bg-purple-600 py-3 text-center font-semibold text-white shadow-md hover:bg-purple-700 transition-all text-sm"
                >
                  💳 Pay Now
                </a>
              )}

              {(inv as any).paymentDetails.type === 'other' && (
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-xs text-slate-700 whitespace-pre-wrap">
                  {(inv as any).paymentDetails.details?.notes || "No additional payment details provided."}
                </div>
              )}
            </div>
          ) : (
            inv.paymentLink && (
              <a 
                href={inv.paymentLink} 
                target="_blank" 
                rel="noreferrer" 
                className="block w-full rounded-lg bg-purple-600 py-3 text-center font-semibold text-white shadow-md hover:bg-purple-700 transition-all text-sm"
              >
                💳 Pay Now
              </a>
            )
          )}
        </div>
        <div className="mt-4 flex flex-wrap justify-end gap-2">
          <button onClick={onDelete} className="rounded-lg border border-destructive/40 px-3 py-2 text-sm text-destructive hover:bg-destructive/10">Delete</button>
          <button onClick={() => window.print()} className="rounded-lg border border-border px-3 py-2 text-sm hover:bg-card">Download PDF</button>
          {inv.status !== "paid" && <button onClick={onMarkPaid} className="rounded-lg bg-success px-3 py-2 text-sm font-semibold text-white">Mark as Paid</button>}
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    paid: "bg-success/15 text-success border-success/30",
    sent: "bg-primary/15 text-primary border-primary/30",
    draft: "bg-muted text-muted-foreground border-border",
    overdue: "bg-destructive/15 text-destructive border-destructive/30 animate-pulse",
  };
  return <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider ${map[status] || map.draft}`}>{status}</span>;
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <Receipt className="h-8 w-8" />
      </div>
      <h3 className="mt-4 text-lg font-semibold">No invoices match this filter</h3>
      <button onClick={onCreate} className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-gradient-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-glow">
        <Plus className="h-3.5 w-3.5" /> Generate New Invoice
      </button>
    </div>
  );
}
