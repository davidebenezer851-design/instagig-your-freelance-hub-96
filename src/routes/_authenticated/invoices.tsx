import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import {
  LayoutDashboard, FilePlus, Users, Settings, Plus, Trash2, Download,
  Save, CheckCircle2, Clock, AlertTriangle, FileText, DollarSign,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { UserEmailSearch, type UserSearchResult } from "@/components/UserEmailSearch";
import { UserAvatar } from "@/components/UserAvatar";

export const Route = createFileRoute("/_authenticated/invoices")({
  head: () => ({ meta: [{ title: "Invoices — InstaGIG" }] }),
  component: InvoicesDashboard,
});

type View = "overview" | "builder" | "clients" | "settings";
type Item = { description: string; qty: number; rate: number };

function InvoicesDashboard() {
  const [view, setView] = useState<View>("overview");

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-3 py-4 sm:px-4 sm:py-6 md:flex-row md:gap-6 md:px-6 md:py-8">
        {/* Sidebar */}
        <aside className="sticky top-24 hidden h-[calc(100vh-8rem)] w-60 shrink-0 rounded-2xl border border-border bg-card p-3 md:block">
          <div className="px-3 py-2 text-xs uppercase tracking-wide text-muted-foreground">Billing</div>
          {([
            { k: "overview", label: "Dashboard Overview", icon: LayoutDashboard },
            { k: "builder", label: "Invoice Builder", icon: FilePlus },
            { k: "clients", label: "Client Management", icon: Users },
            { k: "settings", label: "Settings & Branding", icon: Settings },
          ] as const).map(({ k, label, icon: Icon }) => (
            <button
              key={k}
              onClick={() => setView(k)}
              className={`mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                view === k ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              }`}
            >
              <Icon className="h-4 w-4" /> {label}
            </button>
          ))}
          <div className="mt-4 rounded-xl border border-border bg-secondary/40 p-3 text-xs text-muted-foreground">
            New to invoicing? <Link to="/invoicing" className="text-primary hover:underline">Read the guide</Link>
          </div>
        </aside>

        {/* Mobile pill nav */}
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 md:hidden">
          {([
            { k: "overview", label: "Overview" },
            { k: "builder", label: "Builder" },
            { k: "clients", label: "Clients" },
            { k: "settings", label: "Settings" },
          ] as const).map(({ k, label }) => (
            <button key={k} onClick={() => setView(k)} className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium ${view === k ? "bg-primary text-primary-foreground" : "border border-border text-muted-foreground"}`}>
              {label}
            </button>
          ))}
        </div>

        <main className="min-w-0 flex-1">
          {view === "overview" && <Overview onCreate={() => setView("builder")} />}
          {view === "builder" && <Builder onSaved={() => setView("overview")} />}
          {view === "clients" && <Clients />}
          {view === "settings" && <SettingsPanel />}
        </main>
      </div>
    </div>
  );
}

/* ========== Overview ========== */
function Overview({ onCreate }: { onCreate: () => void }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: invoices } = useQuery({
    queryKey: ["invoices-all", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase.from("invoices").select("*")
        .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
    enabled: !!user,
  });

  const metrics = useMemo(() => {
    const mine = (invoices ?? []).filter((i) => i.sender_id === user?.id);
    const now = new Date();
    const thisMonth = mine.filter((i) => {
      const d = new Date(i.created_at);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
    return {
      total: mine.reduce((s, i) => s + Number(i.total || 0), 0),
      paidMonth: thisMonth.filter((i) => i.status === "paid").reduce((s, i) => s + Number(i.total), 0),
      overdue: mine.filter((i) => i.status === "pending" && i.due_date && new Date(i.due_date) < now).reduce((s, i) => s + Number(i.total), 0),
      drafts: mine.filter((i) => i.status === "draft").length,
    };
  }, [invoices, user?.id]);

  const markPaid = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("invoices").update({ status: "paid" }).eq("id", id); if (error) throw error; },
    onSuccess: () => { toast.success("Marked paid"); qc.invalidateQueries({ queryKey: ["invoices-all"] }); },
  });

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xs uppercase tracking-wide text-primary">Overview</div>
          <h1 className="font-display text-2xl font-bold sm:text-3xl md:text-4xl">Billing Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">A live look at what's invoiced, paid and overdue.</p>
        </div>
        <Button onClick={onCreate} size="sm" className="font-semibold sm:size-default"><Plus className="mr-1 h-4 w-4" />New invoice</Button>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard icon={DollarSign} label="Total Invoiced" value={`$${metrics.total.toFixed(2)}`} accent />
        <MetricCard icon={CheckCircle2} label="Paid This Month" value={`$${metrics.paidMonth.toFixed(2)}`} />
        <MetricCard icon={AlertTriangle} label="Overdue Amount" value={`$${metrics.overdue.toFixed(2)}`} danger />
        <MetricCard icon={Clock} label="Pending Drafts" value={String(metrics.drafts)} />
      </div>

      <div className="mt-8 overflow-hidden rounded-2xl border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <h2 className="font-display text-lg font-semibold">Recent invoices</h2>
          <span className="text-xs text-muted-foreground">{invoices?.length ?? 0} total</span>
        </div>
        {invoices && invoices.length > 0 ? (
          <div className="w-full overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="bg-secondary/50 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 text-left sm:px-5">Invoice</th>
                  <th className="px-4 py-3 text-left sm:px-5">Title</th>
                  <th className="px-4 py-3 text-left sm:px-5">Due</th>
                  <th className="px-4 py-3 text-right sm:px-5">Amount</th>
                  <th className="px-4 py-3 text-left sm:px-5">Status</th>
                  <th className="px-4 py-3 text-right sm:px-5">Action</th>
                </tr>
              </thead>
              <tbody>
                {invoices.slice(0, 10).map((inv) => {
                  const overdue = inv.status === "pending" && inv.due_date && new Date(inv.due_date) < new Date();
                  const status = overdue ? "overdue" : inv.status;
                  return (
                    <tr key={inv.id} className="border-t border-border hover:bg-secondary/30">
                      <td className="px-4 py-3 font-mono text-xs sm:px-5">{inv.number}</td>
                      <td className="px-4 py-3 sm:px-5">{inv.title}</td>
                      <td className="px-4 py-3 text-muted-foreground sm:px-5">{inv.due_date ? format(new Date(inv.due_date), "MMM d, yyyy") : "—"}</td>
                      <td className="px-4 py-3 text-right font-semibold sm:px-5">${Number(inv.total).toFixed(2)}</td>
                      <td className="px-4 py-3 sm:px-5"><StatusBadge status={status} /></td>
                      <td className="px-4 py-3 text-right sm:px-5">
                        {inv.recipient_id === user?.id && inv.status === "pending" && (
                          <Button size="sm" onClick={() => markPaid.mutate(inv.id)}>Mark paid</Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-10 text-center">
            <FileText className="mx-auto h-10 w-10 text-primary" />
            <p className="mt-3 text-sm text-muted-foreground">No invoices yet. Send your first one in under a minute.</p>
            <Button onClick={onCreate} className="mt-4 font-semibold"><Plus className="mr-1 h-4 w-4" />Create invoice</Button>
          </div>
        )}
      </div>
    </div>
  );
}

function MetricCard({ icon: Icon, label, value, accent, danger }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string; accent?: boolean; danger?: boolean }) {
  return (
    <div className={`rounded-2xl border p-5 transition hover:translate-y-[-2px] ${accent ? "border-primary/40 bg-primary/5" : danger ? "border-destructive/40 bg-destructive/5" : "border-border bg-card"}`}>
      <div className="flex items-center justify-between">
        <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
        <Icon className={`h-4 w-4 ${accent ? "text-primary" : danger ? "text-destructive" : "text-muted-foreground"}`} />
      </div>
      <div className={`mt-2 font-display text-2xl font-bold ${accent ? "text-primary" : danger ? "text-destructive" : ""}`}>{value}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    paid: "bg-primary/15 text-primary",
    pending: "bg-secondary text-muted-foreground",
    overdue: "bg-destructive/15 text-destructive",
    draft: "bg-secondary text-foreground/70",
    cancelled: "bg-destructive/10 text-destructive",
  };
  return <span className={`inline-flex rounded-full px-2 py-0.5 text-xs capitalize ${styles[status] ?? "bg-secondary"}`}>{status}</span>;
}

/* ========== Builder ========== */
function Builder({ onSaved }: { onSaved: () => void }) {
  const { user } = useAuth();
  const [recipientId, setRecipientId] = useState("");
  const [selectedRecipient, setSelectedRecipient] = useState<UserSearchResult | null>(null);
  const [title, setTitle] = useState("");
  const [issueDate, setIssueDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [dueDate, setDueDate] = useState("");
  const [tax, setTax] = useState("0");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<Item[]>([{ description: "", qty: 1, rate: 0 }]);

  const { data: contacts } = useQuery({
    queryKey: ["invoice-contacts", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data: convos } = await supabase.from("conversations").select("user_a,user_b").or(`user_a.eq.${user.id},user_b.eq.${user.id}`);
      const ids = new Set<string>();
      convos?.forEach((c) => { if (c.user_a !== user.id) ids.add(c.user_a); if (c.user_b !== user.id) ids.add(c.user_b); });
      if (ids.size === 0) return [];
      const { data: profs } = await supabase.from("profiles").select("id,display_name,username,email,avatar_url").in("id", Array.from(ids));
      return profs ?? [];
    },
    enabled: !!user,
  });

  const subtotal = items.reduce((s, i) => s + (Number(i.qty) || 0) * (Number(i.rate) || 0), 0);
  const taxAmt = ((Number(tax) || 0) / 100) * subtotal;
  const total = subtotal + taxAmt;
  const recipientName = selectedRecipient?.display_name ?? contacts?.find((c) => c.id === recipientId)?.display_name ?? selectedRecipient?.email ?? "—";

  async function save(asDraft: boolean) {
    if (!user) return;
    if (!recipientId) return toast.error("Pick a recipient");
    if (!title.trim()) return toast.error("Add a title");
    const { error } = await supabase.from("invoices").insert({
      sender_id: user.id, recipient_id: recipientId, title, notes,
      items: items as never, subtotal, tax: taxAmt, total,
      due_date: dueDate || null,
      status: asDraft ? "draft" : "pending",
    });
    if (error) return toast.error(error.message);
    toast.success(asDraft ? "Draft saved" : "Invoice sent");
    onSaved();
  }

  function exportPdf() {
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(`<html><head><title>${title || "Invoice"}</title>
      <style>body{font-family:system-ui;padding:40px;color:#111}h1{color:#84cc16}table{width:100%;border-collapse:collapse;margin-top:20px}th,td{border-bottom:1px solid #eee;padding:10px;text-align:left}.r{text-align:right}</style>
      </head><body><h1>INVOICE</h1><p><b>To:</b> ${recipientName}<br/><b>Date:</b> ${issueDate}<br/><b>Due:</b> ${dueDate || "—"}</p>
      <h2>${title}</h2>
      <table><thead><tr><th>Description</th><th class="r">Qty</th><th class="r">Rate</th><th class="r">Total</th></tr></thead><tbody>
      ${items.map(i => `<tr><td>${i.description}</td><td class="r">${i.qty}</td><td class="r">$${Number(i.rate).toFixed(2)}</td><td class="r">$${(i.qty*i.rate).toFixed(2)}</td></tr>`).join("")}
      </tbody></table>
      <p class="r" style="margin-top:20px">Subtotal: $${subtotal.toFixed(2)}<br/>Tax: $${taxAmt.toFixed(2)}<br/><b style="font-size:20px">Total: $${total.toFixed(2)}</b></p>
      ${notes ? `<p>${notes}</p>` : ""}
      </body></html>`);
    w.document.close(); w.print();
  }

  return (
    <div>
      <div>
        <div className="text-xs uppercase tracking-wide text-primary">Invoice Builder</div>
        <h1 className="font-display text-2xl font-bold sm:text-3xl">Create a new invoice</h1>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_1fr]">
        {/* Input panel */}
        <div className="min-w-0 rounded-2xl border border-border bg-card p-4 sm:p-5">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 space-y-1.5">
              <Label>Bill to</Label>
              <UserEmailSearch
                excludeUserId={user?.id}
                selected={selectedRecipient}
                placeholder="Search client email…"
                onSelect={(profile) => { setSelectedRecipient(profile); setRecipientId(profile.id); }}
              />
              {contacts && contacts.length > 0 && !selectedRecipient && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {contacts.slice(0, 4).map((c) => (
                    <button key={c.id} type="button" onClick={() => { setSelectedRecipient(c as UserSearchResult); setRecipientId(c.id); }} className="rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground hover:border-primary hover:text-foreground">
                      {c.display_name ?? c.email ?? "Client"}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>Title</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Logo design — final delivery" />
            </div>
            <div className="space-y-1.5">
              <Label>Invoice date</Label>
              <Input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Due date</Label>
              <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
          </div>

          <div className="mt-5">
            <Label>Line items</Label>
            <div className="mt-2 space-y-3">
              {items.map((it, idx) => (
                <div key={idx} className="rounded-xl border border-border bg-background/40 p-3 sm:border-0 sm:bg-transparent sm:p-0">
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_70px_90px_80px_auto] sm:items-center">
                    <Input placeholder="Description" value={it.description} onChange={(e) => { const n=[...items]; n[idx]={...it, description:e.target.value}; setItems(n);}} />
                    <div className="grid grid-cols-2 gap-2 sm:contents">
                      <Input type="number" min="1" placeholder="Qty" value={it.qty} onChange={(e) => { const n=[...items]; n[idx]={...it, qty:parseFloat(e.target.value)||0}; setItems(n);}} />
                      <Input type="number" min="0" placeholder="Rate" value={it.rate} onChange={(e) => { const n=[...items]; n[idx]={...it, rate:parseFloat(e.target.value)||0}; setItems(n);}} />
                    </div>
                    <div className="flex items-center justify-between sm:contents">
                      <div className="text-sm font-medium sm:text-right">${((it.qty||0)*(it.rate||0)).toFixed(2)}</div>
                      <Button type="button" variant="ghost" size="icon" onClick={() => setItems(items.filter((_, i) => i !== idx))} disabled={items.length === 1}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
              <Button type="button" variant="ghost" size="sm" onClick={() => setItems([...items, { description: "", qty: 1, rate: 0 }])}>
                <Plus className="mr-1 h-3 w-3" /> Add line item
              </Button>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Tax rate (%)</Label>
              <Input type="number" min="0" value={tax} onChange={(e) => setTax(e.target.value)} />
            </div>
          </div>

          <div className="mt-4 space-y-1.5">
            <Label>Notes (optional)</Label>
            <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Thank you for the work!" />
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => save(true)}><Save className="mr-1 h-4 w-4" />Save Draft</Button>
            <Button onClick={() => save(false)} className="font-semibold">Send invoice</Button>
            <Button variant="ghost" onClick={exportPdf}><Download className="mr-1 h-4 w-4" />Generate PDF</Button>
          </div>
        </div>

        {/* Live preview */}
        <div className="min-w-0 rounded-2xl border border-primary/30 bg-card p-4 shadow-[0_0_60px_-30px_var(--color-primary)] sm:p-6">
          <div className="flex items-center justify-between gap-3 border-b border-border pb-4">
            <div className="min-w-0">
              <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary font-display font-bold text-primary-foreground">iG</div>
              <div className="mt-2 font-display text-lg font-bold">Insta<span className="text-primary">GIG</span></div>
            </div>
            <div className="text-right">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">Invoice</div>
              <div className="font-mono text-xs sm:text-sm">{format(new Date(issueDate || Date.now()), "yyyyMMdd")}-DRAFT</div>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
            <div className="min-w-0">
              <div className="text-xs text-muted-foreground">Billed to</div>
              <div className="mt-1 truncate font-semibold">{recipientName}</div>
            </div>
            <div className="min-w-0 text-right">
              <div className="text-xs text-muted-foreground">Due</div>
              <div className="mt-1 truncate font-semibold">{dueDate ? format(new Date(dueDate), "MMM d, yyyy") : "—"}</div>
            </div>
          </div>

          <h2 className="mt-4 font-display text-lg font-semibold sm:text-xl">{title || "Untitled invoice"}</h2>

          <div className="mt-3 w-full overflow-x-auto">
            <table className="w-full min-w-[420px] text-sm">
              <thead className="text-xs uppercase text-muted-foreground">
                <tr><th className="py-2 text-left">Item</th><th className="text-right">Qty</th><th className="text-right">Rate</th><th className="text-right">Total</th></tr>
              </thead>
              <tbody>
                {items.map((i, idx) => (
                  <tr key={idx} className="border-t border-border">
                    <td className="py-2 pr-2">{i.description || <span className="text-muted-foreground">Item description</span>}</td>
                    <td className="text-right">{i.qty}</td>
                    <td className="text-right">${Number(i.rate).toFixed(2)}</td>
                    <td className="text-right font-medium">${((i.qty||0)*(i.rate||0)).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 ml-auto w-full max-w-xs space-y-1 text-sm sm:w-56">
            <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>${subtotal.toFixed(2)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Tax ({tax}%)</span><span>${taxAmt.toFixed(2)}</span></div>
            <div className="flex justify-between border-t border-border pt-2 font-display text-lg font-bold"><span>Grand Total</span><span className="text-primary">${total.toFixed(2)}</span></div>
          </div>

          {notes && <p className="mt-4 border-t border-border pt-3 text-xs text-muted-foreground">{notes}</p>}
        </div>
      </div>
    </div>
  );
}

/* ========== Clients ========== */
function Clients() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ display_name: "", email: "", company: "" });
  const [selectedClient, setSelectedClient] = useState<UserSearchResult | null>(null);

  const { data: clients } = useQuery({
    queryKey: ["billing-clients", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data: convos } = await supabase.from("conversations").select("user_a,user_b").or(`user_a.eq.${user.id},user_b.eq.${user.id}`);
      const ids = new Set<string>();
      convos?.forEach((c) => { if (c.user_a !== user.id) ids.add(c.user_a); if (c.user_b !== user.id) ids.add(c.user_b); });
      const profs = ids.size ? (await supabase.from("profiles").select("id,display_name,avatar_url,headline,email").in("id", Array.from(ids))).data ?? [] : [];
      const { data: invs } = await supabase.from("invoices").select("recipient_id,total").eq("sender_id", user.id);
      const totals: Record<string, number> = {};
      invs?.forEach((i) => { totals[i.recipient_id] = (totals[i.recipient_id] ?? 0) + Number(i.total); });
      return profs.map((p) => ({ ...p, revenue: totals[p.id] ?? 0 }));
    },
    enabled: !!user,
  });

  async function addClient() {
    if (!selectedClient) return toast.error("Search and choose a registered user");
    const [a, b] = [user!.id, selectedClient.id].sort();
    const { data: existing } = await supabase.from("conversations").select("id").eq("user_a", a).eq("user_b", b).maybeSingle();
    if (!existing) await supabase.from("conversations").insert({ user_a: a, user_b: b, hidden_by_a_at: null, hidden_by_b_at: null });
    toast.success(`${selectedClient.display_name ?? selectedClient.email} added`);
    setOpen(false); setForm({ display_name: "", email: "", company: "" }); setSelectedClient(null);
    qc.invalidateQueries({ queryKey: ["billing-clients"] });
  }

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-wide text-primary">Clients</div>
          <h1 className="font-display text-2xl font-bold sm:text-3xl">Client Management</h1>
          <p className="mt-1 text-sm text-muted-foreground">Everyone you've worked with on InstaGIG.</p>
        </div>
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild><Button className="font-semibold"><Plus className="mr-1 h-4 w-4" />Add new client</Button></SheetTrigger>
          <SheetContent>
            <SheetHeader><SheetTitle>Add a client</SheetTitle></SheetHeader>
            <div className="mt-5 space-y-4">
              <div className="space-y-1.5"><Label>Search email</Label><UserEmailSearch excludeUserId={user?.id} selected={selectedClient} onSelect={setSelectedClient} placeholder="client@email.com" /></div>
              <div className="space-y-1.5"><Label>Company (optional)</Label><Input value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} /></div>
              <Button onClick={addClient} className="w-full font-semibold">Save client</Button>
              <p className="text-xs text-muted-foreground">Choose a registered user from the dropdown. If no account exists, it will say user not found.</p>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {clients && clients.length > 0 ? (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {clients.map((c) => (
            <div key={c.id} className="rounded-2xl border border-border bg-card p-5 transition hover:border-primary/40">
              <div className="flex items-center gap-3">
                <UserAvatar userId={c.id} name={c.display_name} avatarUrl={c.avatar_url} size={48} />
                <div className="min-w-0">
                  <div className="truncate font-semibold">{c.display_name}</div>
                  <div className="truncate text-xs text-muted-foreground">{c.headline ?? "Client"}</div>
                </div>
              </div>
              <div className="mt-4 flex items-end justify-between">
                <div>
                  <div className="text-xs text-muted-foreground">Total revenue</div>
                  <div className="font-display text-xl font-bold text-primary">${c.revenue.toFixed(2)}</div>
                </div>
                <Link to="/messages"><Button size="sm" variant="secondary">Message</Button></Link>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-8 rounded-2xl border border-dashed border-border p-12 text-center">
          <Users className="mx-auto h-10 w-10 text-primary" />
          <h3 className="mt-3 font-display text-lg font-semibold">No clients yet</h3>
          <p className="mt-1 text-sm text-muted-foreground">Message someone on InstaGIG and they'll show up here.</p>
        </div>
      )}
    </div>
  );
}

/* ========== Settings ========== */
function SettingsPanel() {
  const [brand, setBrand] = useState({ name: "InstaGIG Studio", email: "", color: "#cbff3b", terms: "Payment due within 14 days." });
  return (
    <div className="max-w-2xl">
      <div className="text-xs uppercase tracking-wide text-primary">Settings</div>
      <h1 className="font-display text-3xl font-bold">Settings & Branding</h1>
      <p className="mt-1 text-sm text-muted-foreground">Personalize every invoice you send.</p>

      <div className="mt-6 space-y-5 rounded-2xl border border-border bg-card p-6">
        <div className="space-y-1.5"><Label>Business name</Label><Input value={brand.name} onChange={(e) => setBrand({ ...brand, name: e.target.value })} /></div>
        <div className="space-y-1.5"><Label>Reply-to email</Label><Input type="email" value={brand.email} onChange={(e) => setBrand({ ...brand, email: e.target.value })} placeholder="you@studio.com" /></div>
        <div className="space-y-1.5">
          <Label>Brand color</Label>
          <div className="flex items-center gap-3">
            <input type="color" value={brand.color} onChange={(e) => setBrand({ ...brand, color: e.target.value })} className="h-10 w-14 cursor-pointer rounded-lg border border-border bg-transparent" />
            <Input value={brand.color} onChange={(e) => setBrand({ ...brand, color: e.target.value })} className="max-w-[160px]" />
          </div>
        </div>
        <div className="space-y-1.5"><Label>Default payment terms</Label><Textarea rows={3} value={brand.terms} onChange={(e) => setBrand({ ...brand, terms: e.target.value })} /></div>
        <Button onClick={() => toast.success("Branding saved")} className="font-semibold">Save changes</Button>
      </div>
    </div>
  );
}
