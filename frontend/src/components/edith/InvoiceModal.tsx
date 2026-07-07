import { useEffect, useState } from "react";
import { X, Plus, Trash2, Eye, Send, Save, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { fmtMoney } from "@/lib/format";
import { useEdith } from "@/lib/store";
import type { StoredInvoice } from "@/lib/mockData";
import api from "@/lib/api";
import { Link } from "@tanstack/react-router";

type Item = { description: string; quantity: number; rate: number };

export function InvoiceModal({ open, onClose, prefill }: { open: boolean; onClose: () => void; prefill?: Partial<StoredInvoice> }) {
  const settings = useEdith((s) => s.paymentSettings);
  const invoices = useEdith((s) => s.invoices);
  const addInvoice = useEdith((s) => s.addInvoice);
  const logActivity = useEdith((s) => s.logActivity);

  const [number, setNumber] = useState("");
  const [client, setClient] = useState({ name: "", email: "", address: "" });
  const [items, setItems] = useState<Item[]>([{ description: "", quantity: 1, rate: 0 }]);
  const [taxPct, setTaxPct] = useState(0);
  const [notes, setNotes] = useState("Thank you for your business!");
  const [paymentLink, setPaymentLink] = useState("");
  const [preview, setPreview] = useState(false);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [methods, setMethods] = useState<any[]>([]);
  const [loadingMethods, setLoadingMethods] = useState(true);
  const [selectedMethodId, setSelectedMethodId] = useState("");

  useEffect(() => {
    if (!open) return;
    const next = settings.invoiceStartingNumber + invoices.length;
    setNumber(prefill?.number || `${settings.invoicePrefix}${next}`);
    setClient({
      name: prefill?.clientName || "",
      email: prefill?.clientEmail || "",
      address: prefill?.clientAddress || "",
    });
    setItems(prefill?.items?.length ? prefill.items : [{ description: "", quantity: 1, rate: 0 }]);
    setPaymentLink(prefill?.paymentLink ?? settings.defaultLink);
    setNotes(prefill?.notes ?? "Thank you for your business!");
    setPreview(false);
    setErrors({});
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const fetchMethods = async () => {
      try {
        const res = await api.payment.methods() as any;
        if (res?.data) {
          const active = res.data.filter((m: any) => m.isActive);
          setMethods(active);
          const def = active.find((m: any) => m.isDefault);
          if (def) {
            setSelectedMethodId(def.id);
          } else if (active.length > 0) {
            setSelectedMethodId(active[0].id);
          } else {
            setSelectedMethodId("");
          }
        }
      } catch (err) {
        console.error("Failed to load payment methods", err);
      } finally {
        setLoadingMethods(false);
      }
    };
    fetchMethods();
  }, [open]);

  if (!open) return null;

  if (methods.length === 0 && !loadingMethods) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm" onClick={onClose}>
        <div onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-md overflow-y-auto rounded-2xl border border-border/60 bg-gradient-card p-6 shadow-elevated text-center">
          <button onClick={onClose} className="absolute right-4 top-4 rounded-lg p-1.5 text-muted-foreground hover:bg-card hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-destructive/10 text-destructive mx-auto mb-4 border border-destructive/20 shadow-glow">
            <span className="text-xl">⚠️</span>
          </div>
          <h3 className="text-base font-bold">No payment methods configured</h3>
          <p className="text-xs text-muted-foreground mt-2">
            You must add at least one payment method in Settings before generating invoices.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <button onClick={onClose} className="px-4 py-2 text-xs rounded-lg border border-border hover:bg-card">Cancel</button>
            <Link 
              to="/settings" 
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold rounded-lg bg-gradient-primary text-primary-foreground shadow-glow inline-flex items-center"
            >
              Configure Settings &rarr;
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const subtotal = items.reduce((s, i) => s + (Number(i.quantity) || 0) * (Number(i.rate) || 0), 0);
  const tax = subtotal * (taxPct / 100);
  const total = subtotal + tax;

  const updateItem = (i: number, patch: Partial<Item>) =>
    setItems((arr) => arr.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));

  const validate = () => {
    const e: Record<string, string> = {};
    if (!client.name.trim()) e.name = "Client name required";
    if (client.email && !/^\S+@\S+\.\S+$/.test(client.email)) e.email = "Invalid email";
    if (subtotal <= 0) e.items = "Add at least one line item with a rate";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const save = (status: "draft" | "sent") => {
    if (!validate()) { toast.error("Fix the errors and try again"); return; }
    setBusy(true);
    const due = new Date();
    due.setDate(due.getDate() + settings.dueDays);

    const selectedMethod = methods.find(m => m.id === selectedMethodId);
    let resolvedLink = "";
    if (selectedMethod) {
      const d = selectedMethod.details || {};
      resolvedLink = d.url || d.paymentLink || d.link || d.payPalMeUrl || d.email || "";
    }

    const inv: StoredInvoice = {
      id: crypto.randomUUID(), number,
      clientName: client.name, clientEmail: client.email, clientAddress: client.address,
      items, subtotal, tax, total, currency: settings.currency,
      status, paymentLink: resolvedLink || paymentLink, notes,
      createdAt: new Date().toISOString(), dueAt: due.toISOString(),
      paymentDetails: selectedMethod ? {
        id: selectedMethod.id,
        name: selectedMethod.name,
        type: selectedMethod.type,
        details: selectedMethod.details,
      } : null,
    };
    setTimeout(() => {
      addInvoice(inv);
      logActivity(`${status === "sent" ? "Sent" : "Drafted"} invoice ${number} to ${client.name} for ${fmtMoney(total)}`, "freelance");
      toast.success(status === "draft" ? "Draft saved" : `Invoice sent to ${client.name}`);
      setBusy(false);
      onClose();
    }, 500);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()}
        className="relative max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-border/60 bg-gradient-card p-6 shadow-elevated">
        <button onClick={onClose} className="absolute right-4 top-4 rounded-lg p-1.5 text-muted-foreground hover:bg-card hover:text-foreground">
          <X className="h-4 w-4" />
        </button>
        {!preview ? (
          <>
            <h2 className="text-xl font-bold">Generate Invoice</h2>
            <p className="text-sm text-muted-foreground">Create a polished invoice and send it to your client.</p>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <Field label="Invoice #">
                <input value={number} onChange={(e) => setNumber(e.target.value)} className="w-full rounded-lg border border-border bg-background/40 px-3 py-2 text-sm font-mono" />
              </Field>
              <Field label="Payment Method">
                <select 
                  value={selectedMethodId} 
                  onChange={(e) => setSelectedMethodId(e.target.value)} 
                  className="w-full rounded-lg border border-border bg-background/40 px-3 py-2 text-sm"
                >
                  {methods.map((m) => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </Field>
            </div>

            <h3 className="mt-5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Bill To</h3>
            <div className="mt-2 grid gap-3 md:grid-cols-3">
              <div>
                <input placeholder="Client name *" value={client.name} onChange={(e) => setClient({ ...client, name: e.target.value })}
                  className={`w-full rounded-lg border bg-background/40 px-3 py-2 text-sm ${errors.name ? "border-destructive" : "border-border"}`} />
                {errors.name && <p className="mt-1 text-[10px] text-destructive">{errors.name}</p>}
              </div>
              <div>
                <input placeholder="Email" value={client.email} onChange={(e) => setClient({ ...client, email: e.target.value })}
                  className={`w-full rounded-lg border bg-background/40 px-3 py-2 text-sm ${errors.email ? "border-destructive" : "border-border"}`} />
                {errors.email && <p className="mt-1 text-[10px] text-destructive">{errors.email}</p>}
              </div>
              <input placeholder="Address" value={client.address} onChange={(e) => setClient({ ...client, address: e.target.value })}
                className="rounded-lg border border-border bg-background/40 px-3 py-2 text-sm" />
            </div>

            <h3 className="mt-5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Line Items</h3>
            {errors.items && <p className="text-[10px] text-destructive">{errors.items}</p>}
            <div className="mt-2 space-y-2">
              {items.map((it, i) => (
                <div key={i} className="grid grid-cols-12 gap-2">
                  <input placeholder="Description" value={it.description} onChange={(e) => updateItem(i, { description: e.target.value })}
                    className="col-span-6 rounded-lg border border-border bg-background/40 px-3 py-2 text-sm" />
                  <input type="number" placeholder="Qty" value={it.quantity} onChange={(e) => updateItem(i, { quantity: Number(e.target.value) })}
                    className="col-span-2 rounded-lg border border-border bg-background/40 px-3 py-2 text-sm" />
                  <input type="number" placeholder="Rate" value={it.rate} onChange={(e) => updateItem(i, { rate: Number(e.target.value) })}
                    className="col-span-2 rounded-lg border border-border bg-background/40 px-3 py-2 text-sm" />
                  <div className="col-span-1 flex items-center justify-end px-2 text-sm font-mono">{fmtMoney(it.quantity * it.rate, settings.currency)}</div>
                  <button onClick={() => setItems(items.filter((_, idx) => idx !== i))}
                    className="col-span-1 rounded-lg border border-border text-muted-foreground hover:text-destructive">
                    <Trash2 className="mx-auto h-4 w-4" />
                  </button>
                </div>
              ))}
              <button onClick={() => setItems([...items, { description: "", quantity: 1, rate: 0 }])}
                className="inline-flex items-center gap-1 rounded-lg border border-dashed border-border px-3 py-1.5 text-xs text-muted-foreground hover:border-primary hover:text-primary">
                <Plus className="h-3 w-3" /> Add line item
              </button>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-2">
              <Field label="Notes">
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3}
                  className="w-full rounded-lg border border-border bg-background/40 px-3 py-2 text-sm" />
              </Field>
              <div className="space-y-2 rounded-lg border border-border/60 bg-card/40 p-3 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span className="font-mono">{fmtMoney(subtotal, settings.currency)}</span></div>
                <div className="flex items-center justify-between"><span className="text-muted-foreground">Tax %</span>
                  <input type="number" value={taxPct} onChange={(e) => setTaxPct(Number(e.target.value))}
                    className="w-16 rounded border border-border bg-background/40 px-2 py-0.5 text-right text-sm" />
                </div>
                <div className="flex justify-between"><span className="text-muted-foreground">Tax</span><span className="font-mono">{fmtMoney(tax, settings.currency)}</span></div>
                <div className="mt-2 flex justify-between border-t border-border/60 pt-2 text-base font-semibold"><span>Total</span><span className="font-mono text-primary">{fmtMoney(total, settings.currency)}</span></div>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <button onClick={() => save("draft")} disabled={busy}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border px-4 py-2 text-sm hover:bg-card disabled:opacity-50">
                <Save className="h-3.5 w-3.5" /> Save as Draft
              </button>
              <button onClick={() => setPreview(true)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border px-4 py-2 text-sm hover:bg-card">
                <Eye className="h-3.5 w-3.5" /> Preview
              </button>
              <button onClick={() => save("sent")} disabled={busy}
                className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-glow disabled:opacity-50">
                {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />} Send to Client
              </button>
            </div>
          </>
        ) : (
          <InvoicePreview
            settings={settings} number={number} client={client}
            items={items} subtotal={subtotal} tax={tax} total={total}
            paymentLink={(() => {
              const selectedMethod = methods.find(m => m.id === selectedMethodId);
              if (selectedMethod) {
                const d = selectedMethod.details || {};
                return d.url || d.paymentLink || d.link || d.payPalMeUrl || d.email || "";
              }
              return paymentLink;
            })()} 
            notes={notes}
            onBack={() => setPreview(false)} onSend={() => save("sent")}
            paymentDetails={methods.find(m => m.id === selectedMethodId)}
          />
        )}
      </div>
    </div>
  );
}

function InvoicePreview({ settings, number, client, items, subtotal, tax, total, paymentLink, notes, onBack, onSend, paymentDetails }: any) {
  return (
    <div className="rounded-xl bg-white p-8 text-slate-900">
      <div className="flex items-start justify-between border-b border-slate-200 pb-6">
        <div>
          <h1 className="text-2xl font-bold">{settings?.businessName || "EDITH Agency"}</h1>
          <p className="text-xs text-slate-500 whitespace-pre-line">{settings?.businessAddress}</p>
          {settings?.taxId && <p className="text-xs text-slate-500">Tax ID: {settings.taxId}</p>}
        </div>
        <div className="text-right">
          <h2 className="text-3xl font-bold tracking-tight text-purple-600">INVOICE</h2>
          <p className="text-xs text-slate-500 font-mono mt-1">{number}</p>
          <p className="text-xs text-slate-500 mt-2">Date: {new Date().toLocaleDateString()}</p>
        </div>
      </div>
      <div className="mt-6">
        <p className="text-xs uppercase tracking-wider text-slate-400 font-semibold">Bill To</p>
        <p className="mt-1 font-semibold">{client.name}</p>
        <p className="text-sm text-slate-600">{client.email}</p>
        <p className="text-sm text-slate-600">{client.address}</p>
      </div>
      <table className="mt-6 w-full text-sm">
        <thead className="border-b border-slate-200 text-left text-xs uppercase text-slate-500">
          <tr><th className="py-2">Description</th><th className="text-right">Qty</th><th className="text-right">Rate</th><th className="text-right">Amount</th></tr>
        </thead>
        <tbody>
          {items.map((it: any, i: number) => (
            <tr key={i} className="border-b border-slate-100">
              <td className="py-2">{it.description || "—"}</td>
              <td className="text-right">{it.quantity}</td>
              <td className="text-right">{fmtMoney(it.rate, settings?.currency)}</td>
              <td className="text-right">{fmtMoney(it.quantity * it.rate, settings?.currency)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-4 flex justify-end">
        <div className="w-64 space-y-1 text-sm">
          <div className="flex justify-between"><span>Subtotal</span><span>{fmtMoney(subtotal, settings?.currency)}</span></div>
          <div className="flex justify-between"><span>Tax</span><span>{fmtMoney(tax, settings?.currency)}</span></div>
          <div className="flex justify-between border-t border-slate-300 pt-2 text-base font-bold text-purple-600"><span>Total</span><span>{fmtMoney(total, settings?.currency)}</span></div>
        </div>
      </div>

      {paymentDetails ? (
        <div className="mt-6 border-t border-slate-200 pt-6">
          <p className="text-xs uppercase tracking-wider text-slate-400 font-bold mb-2">Payment Information</p>
          <p className="text-sm font-semibold text-purple-600 mb-2">Method: {paymentDetails.name}</p>
          
          {(paymentDetails.type === 'wire_transfer' || paymentDetails.type === 'wise_transfer') && (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-xs text-slate-700 space-y-1.5 font-sans">
              {paymentDetails.details.bankName && <div><span className="font-semibold text-slate-500 w-20 inline-block">Bank:</span> {paymentDetails.details.bankName}</div>}
              {paymentDetails.details.accountNumber && <div><span className="font-semibold text-slate-500 w-20 inline-block">Account:</span> {paymentDetails.details.accountNumber}</div>}
              {paymentDetails.details.routingNumber && <div><span className="font-semibold text-slate-500 w-20 inline-block">Routing:</span> {paymentDetails.details.routingNumber}</div>}
              {paymentDetails.details.holder && <div><span className="font-semibold text-slate-500 w-20 inline-block">Holder:</span> {paymentDetails.details.holder}</div>}
              {paymentDetails.type === 'wire_transfer' && paymentDetails.details.swift && <div><span className="font-semibold text-slate-500 w-20 inline-block">SWIFT:</span> {paymentDetails.details.swift}</div>}
              {paymentDetails.type === 'wire_transfer' && paymentDetails.details.ifsc && <div><span className="font-semibold text-slate-500 w-20 inline-block">IFSC:</span> {paymentDetails.details.ifsc}</div>}
              {paymentDetails.details.notes && <div className="border-t border-slate-200 pt-1.5 mt-1.5 text-slate-500 italic">Note: {paymentDetails.details.notes}</div>}
            </div>
          )}

          {paymentDetails.type === 'upi' && (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-xs text-slate-700 space-y-1.5">
              <div><span className="font-semibold text-slate-500">UPI ID:</span> <span className="font-mono text-sm font-bold text-slate-800">{paymentDetails.details.upiId}</span></div>
              <div className="text-slate-500 italic mt-1">(Scan QR or send payment to this UPI ID)</div>
            </div>
          )}

          {['paypal', 'stripe_link', 'razorpay_link', 'custom_url'].includes(paymentDetails.type) && paymentLink && (
            <a 
              href={paymentLink} 
              target="_blank" 
              rel="noreferrer" 
              className="block w-full rounded-lg bg-purple-600 py-3 text-center font-semibold text-white shadow-md hover:bg-purple-700 transition-all text-sm"
            >
              💳 Pay Now
            </a>
          )}

          {paymentDetails.type === 'other' && (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-xs text-slate-700 whitespace-pre-wrap">
              {paymentDetails.details.notes || "No additional payment details provided."}
            </div>
          )}
        </div>
      ) : (
        paymentLink && (
          <a href={paymentLink} target="_blank" rel="noreferrer" className="mt-6 block w-full rounded-lg bg-purple-600 py-3 text-center font-semibold text-white shadow-md hover:bg-purple-700">
            Pay Now
          </a>
        )
      )}

      {notes && <p className="mt-4 text-xs text-slate-500">{notes}</p>}
      <div className="mt-6 flex justify-between gap-2">
        <button onClick={onBack} className="rounded-lg border border-slate-300 px-4 py-2 text-sm">← Edit</button>
        <button onClick={() => window.print()} className="rounded-lg border border-slate-300 px-4 py-2 text-sm">Print / PDF</button>
        <button onClick={onSend} className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-semibold text-white font-sans">Send to Client</button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}
