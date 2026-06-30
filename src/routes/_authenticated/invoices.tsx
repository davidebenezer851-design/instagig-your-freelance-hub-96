import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, FileText, CheckCircle2, X } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

export const Route = createFileRoute("/_authenticated/invoices")({
  head: () => ({ meta: [{ title: "Invoices — InstaGIG" }] }),
  component: InvoicesPage,
});

type Item = { description: string; qty: number; rate: number };

function InvoicesPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [tab, setTab] = useState<"received" | "sent">("received");

  const { data: invoices } = useQuery({
    queryKey: ["invoices", user?.id, tab],
    queryFn: async () => {
      if (!user) return [];
      const col = tab === "sent" ? "sender_id" : "recipient_id";
      const { data } = await supabase.from("invoices").select("*").eq(col, user.id).order("created_at", { ascending: false });
      return data ?? [];
    },
    enabled: !!user,
  });

  const markPaid = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("invoices").update({ status: "paid" }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Marked paid"); qc.invalidateQueries({ queryKey: ["invoices"] }); },
  });

  const cancel = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("invoices").update({ status: "cancelled" }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Invoice cancelled"); qc.invalidateQueries({ queryKey: ["invoices"] }); },
  });

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="mx-auto max-w-5xl px-4 py-10 md:px-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="text-xs uppercase tracking-wide text-primary">Billing</div>
            <h1 className="font-display text-3xl font-bold md:text-4xl">Invoices</h1>
            <p className="mt-1 text-sm text-muted-foreground">Send, track and settle invoices for completed work.</p>
          </div>
          <NewInvoiceDialog onCreated={() => qc.invalidateQueries({ queryKey: ["invoices"] })} />
        </div>

        <Tabs value={tab} onValueChange={(v) => setTab(v as "received" | "sent")} className="mt-8">
          <TabsList>
            <TabsTrigger value="received">Received</TabsTrigger>
            <TabsTrigger value="sent">Sent</TabsTrigger>
          </TabsList>
          <TabsContent value={tab} className="mt-5">
            {invoices && invoices.length > 0 ? (
              <div className="overflow-hidden rounded-2xl border border-border bg-card">
                <table className="w-full text-sm">
                  <thead className="bg-secondary/60 text-xs uppercase tracking-wide text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3 text-left">Invoice</th>
                      <th className="px-4 py-3 text-left">Title</th>
                      <th className="px-4 py-3 text-left">Date</th>
                      <th className="px-4 py-3 text-right">Total</th>
                      <th className="px-4 py-3 text-left">Status</th>
                      <th className="px-4 py-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.map((inv) => (
                      <tr key={inv.id} className="border-t border-border">
                        <td className="px-4 py-3 font-mono text-xs">{inv.number}</td>
                        <td className="px-4 py-3">{inv.title}</td>
                        <td className="px-4 py-3 text-muted-foreground">{format(new Date(inv.created_at), "MMM d, yyyy")}</td>
                        <td className="px-4 py-3 text-right font-semibold">${Number(inv.total).toFixed(2)}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs ${
                            inv.status === "paid" ? "bg-primary/15 text-primary" :
                            inv.status === "cancelled" ? "bg-destructive/15 text-destructive" :
                            "bg-secondary text-muted-foreground"
                          }`}>
                            {inv.status === "paid" && <CheckCircle2 className="h-3 w-3" />}
                            {inv.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          {tab === "received" && inv.status === "pending" && (
                            <Button size="sm" onClick={() => markPaid.mutate(inv.id)}>Mark paid</Button>
                          )}
                          {tab === "sent" && inv.status === "pending" && (
                            <Button size="sm" variant="ghost" onClick={() => cancel.mutate(inv.id)}>
                              <X className="mr-1 h-3 w-3" /> Cancel
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-border p-12 text-center">
                <FileText className="mx-auto h-10 w-10 text-primary" />
                <h3 className="mt-3 font-display text-lg font-semibold">No {tab} invoices yet</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {tab === "sent" ? "Create your first invoice for a client." : "When someone bills you, it'll show up here."}
                </p>
              </div>
            )}
          </TabsContent>
        </Tabs>

        <p className="mt-6 text-xs text-muted-foreground">
          Need to pay an invoice? Open the invoice and use <Link to="/payments" className="text-primary hover:underline">Payments</Link> to fund it.
        </p>
      </div>
      <Footer />
    </div>
  );
}

function NewInvoiceDialog({ onCreated }: { onCreated: () => void }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [recipientId, setRecipientId] = useState("");
  const [notes, setNotes] = useState("");
  const [tax, setTax] = useState("0");
  const [items, setItems] = useState<Item[]>([{ description: "", qty: 1, rate: 0 }]);

  // Recipients = users I've messaged with
  const { data: contacts } = useQuery({
    queryKey: ["invoice-contacts", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data: convos } = await supabase.from("conversations").select("user_a,user_b").or(`user_a.eq.${user.id},user_b.eq.${user.id}`);
      const ids = new Set<string>();
      convos?.forEach((c) => { if (c.user_a !== user.id) ids.add(c.user_a); if (c.user_b !== user.id) ids.add(c.user_b); });
      if (ids.size === 0) return [];
      const { data: profs } = await supabase.from("profiles").select("id,display_name").in("id", Array.from(ids));
      return profs ?? [];
    },
    enabled: !!user && open,
  });

  const subtotal = items.reduce((s, i) => s + (Number(i.qty) || 0) * (Number(i.rate) || 0), 0);
  const taxAmt = (Number(tax) || 0) / 100 * subtotal;
  const total = subtotal + taxAmt;

  async function submit() {
    if (!user) return;
    if (!recipientId) { toast.error("Pick a recipient"); return; }
    if (!title.trim()) { toast.error("Add a title"); return; }
    const { error } = await supabase.from("invoices").insert({
      sender_id: user.id,
      recipient_id: recipientId,
      title, notes, items: items as never,
      subtotal, tax: taxAmt, total,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Invoice sent");
    setOpen(false); onCreated();
    setTitle(""); setRecipientId(""); setNotes(""); setItems([{ description: "", qty: 1, rate: 0 }]);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="font-semibold"><Plus className="mr-1 h-4 w-4" />New invoice</Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader><DialogTitle>Create invoice</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Bill to</Label>
            <Select value={recipientId} onValueChange={setRecipientId}>
              <SelectTrigger><SelectValue placeholder="Choose a contact…" /></SelectTrigger>
              <SelectContent>
                {contacts?.map((c) => <SelectItem key={c.id} value={c.id}>{c.display_name ?? c.id.slice(0, 8)}</SelectItem>)}
                {(!contacts || contacts.length === 0) && <div className="px-3 py-2 text-xs text-muted-foreground">No contacts yet — message someone first.</div>}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Logo design — final delivery" />
          </div>

          <div>
            <Label>Line items</Label>
            <div className="mt-2 space-y-2">
              {items.map((it, idx) => (
                <div key={idx} className="grid grid-cols-[1fr_70px_90px_auto] gap-2">
                  <Input placeholder="Description" value={it.description} onChange={(e) => {
                    const next = [...items]; next[idx] = { ...it, description: e.target.value }; setItems(next);
                  }} />
                  <Input type="number" min="1" placeholder="Qty" value={it.qty} onChange={(e) => {
                    const next = [...items]; next[idx] = { ...it, qty: parseFloat(e.target.value) || 0 }; setItems(next);
                  }} />
                  <Input type="number" min="0" placeholder="Rate" value={it.rate} onChange={(e) => {
                    const next = [...items]; next[idx] = { ...it, rate: parseFloat(e.target.value) || 0 }; setItems(next);
                  }} />
                  <Button type="button" variant="ghost" size="icon" onClick={() => setItems(items.filter((_, i) => i !== idx))} disabled={items.length === 1}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button type="button" variant="ghost" size="sm" onClick={() => setItems([...items, { description: "", qty: 1, rate: 0 }])}>
                <Plus className="mr-1 h-3 w-3" /> Add item
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Tax (%)</Label>
              <Input type="number" min="0" value={tax} onChange={(e) => setTax(e.target.value)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Notes (optional)</Label>
            <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Payment terms, thanks message…" />
          </div>

          <div className="rounded-lg border border-border bg-secondary/50 p-3 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>${subtotal.toFixed(2)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Tax</span><span>${taxAmt.toFixed(2)}</span></div>
            <div className="mt-1 flex justify-between border-t border-border pt-1 font-display text-lg font-bold"><span>Total</span><span className="text-primary">${total.toFixed(2)}</span></div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={submit} className="font-semibold">Send invoice</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
