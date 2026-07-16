import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { Navbar } from "@/components/Navbar";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useWallet, formatMoney, type WalletTx } from "@/hooks/useWallet";
import { ArrowDownToLine, ArrowUpFromLine, Wallet as WalletIcon, Search, ShoppingBag, Sparkles, Zap, ShieldCheck, Crown, Check, Banknote, Building2, BadgeCheck, UploadCloud, Loader2, Clock3, Lock } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { submitWalletFundingRequestFn } from "@/lib/wallet-submit.server";

const searchSchema = z.object({
  upgrade: z.enum(["pro", "business"]).optional(),
  gig: z.string().optional(),
  price: z.coerce.number().optional(),
  title: z.string().optional(),
});

export const Route = createFileRoute("/_authenticated/wallet")({
  validateSearch: searchSchema,
  head: () => ({ meta: [{ title: "Wallet — InstaGIG" }] }),
  component: WalletPage,
});

const PRESETS = [10, 25, 100];

const SANDBOX = [
  { id: "pro-invoice", name: "Premium Invoice Automation Tool", price: 15, icon: Zap, desc: "Auto-generate, brand & send invoices in one click." },
  { id: "boost-gig", name: "Featured Gig Boost (24h)", price: 8, icon: Sparkles, desc: "Pin your gig to the top of the marketplace." },
  { id: "verify-pro", name: "Verified Pro Badge", price: 25, icon: ShieldCheck, desc: "Stand out with InstaGIG identity verification." },
];

const UPGRADES: Record<string, { name: string; price: number; perks: string[] }> = {
  pro: { name: "InstaGIG Pro (monthly)", price: 12, perks: ["Unlimited gigs", "Boosted visibility", "3% service fee"] },
  business: { name: "InstaGIG Business (monthly)", price: 49, perks: ["Team workspaces", "Custom invoices", "Dedicated manager"] },
};

function WalletPage() {
  const { balance, currency, transactions, mutate, isLoading } = useWallet();
  const { user, loading: authLoading } = useAuth();
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const [fundOpen, setFundOpen] = useState(false);
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [confirm, setConfirm] = useState<{ amount: number; description: string } | null>(null);

  useEffect(() => {
    if (search.upgrade && UPGRADES[search.upgrade]) {
      const u = UPGRADES[search.upgrade];
      setConfirm({ amount: u.price, description: u.name });
    } else if (search.gig && search.price) {
      setConfirm({ amount: Number(search.price), description: `Order: ${search.title ?? "Gig"}` });
    }
  }, [search.upgrade, search.gig, search.price, search.title]);

  const filtered = useMemo(
    () => transactions.filter((t) => `${t.type} ${t.description ?? ""} ${t.reference ?? ""}`.toLowerCase().includes(query.toLowerCase())),
    [transactions, query]
  );

  async function buy(item: { name: string; price: number }) {
    if (item.price > balance) { toast.error("Insufficient Balance — Please Fund Your Wallet"); setFundOpen(true); return; }
    try {
      await mutate.mutateAsync({ amount: item.price, type: "purchase", description: item.name });
      toast.success(`Purchased ${item.name}`);
    } catch (error) {
      toast.error((error as Error).message || "Unable to complete purchase right now.");
    }
  }

  async function handleFundingRequest(amount: number, receiptUrl: string | null, note: string) {
    try {
      await submitWalletFundingRequestFn({
        data: {
          amount,
          receiptUrl,
          note,
          userId: user?.id,
          userEmail: user?.email,
          username: user?.user_metadata?.full_name ?? user?.email ?? "Guest",
        },
      });

      toast.success("Transfer request submitted. We’ll review it and credit your wallet once approved.");
      setFundOpen(false);
    } catch (error) {
      throw new Error((error as Error).message || "We could not submit your funding request.");
    }
  }

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-background px-4 py-20 text-center">
        <div className="mx-auto max-w-sm rounded-2xl border border-border bg-card p-8 shadow-sm">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <h1 className="font-display text-xl font-semibold">Loading wallet…</h1>
          <p className="mt-2 text-sm text-muted-foreground">We’re preparing your wallet experience now.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="mx-auto max-w-6xl space-y-6 px-4 py-6 md:px-6 md:py-10">
        <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
          <div className="min-w-0">
            <h1 className="font-display text-2xl font-bold md:text-3xl">Wallet</h1>
            <p className="text-sm text-muted-foreground">Fund your account with a premium manual bank transfer flow and track approvals in real time.</p>
          </div>
          <Badge variant="secondary" className="gap-1 px-3 py-1.5 text-sm"><WalletIcon className="h-3.5 w-3.5" /> {currency}</Badge>
        </header>

        <Card className="relative overflow-hidden border-primary/30 bg-gradient-to-br from-card via-card to-primary/10 shadow-[var(--shadow-glow)]">
          <div className="pointer-events-none absolute -right-10 -top-10 h-48 w-48 rounded-full bg-primary/30 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-16 -left-16 h-56 w-56 rounded-full bg-primary/20 blur-3xl" />
          <CardContent className="relative grid gap-6 p-6 md:grid-cols-[1fr_auto] md:p-8">
            <div>
              <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground">
                <WalletIcon className="h-3.5 w-3.5" /> Available Balance
              </div>
              <div className="mt-2 font-display text-4xl font-black tabular-nums text-foreground md:text-6xl">{formatMoney(balance, currency)}</div>
              <div className="mt-1 text-xs text-muted-foreground">InstaGIG Wallet · Manual transfer approvals</div>
            </div>
            <div className="flex flex-col gap-2 self-end md:items-end">
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => setFundOpen(true)} className="font-semibold"><ArrowDownToLine className="h-4 w-4" /> Fund Account</Button>
                <Button onClick={() => setWithdrawOpen(true)} variant="secondary"><ArrowUpFromLine className="h-4 w-4" /> Withdraw</Button>
              </div>
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Moniepoint · Instant review</div>
            </div>
          </CardContent>
        </Card>

        <section>
          <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="font-display text-lg font-bold">Manual Bank Transfer</h2>
              <p className="text-xs text-muted-foreground">Transfer to our Moniepoint account, upload proof, and your wallet will be credited once approved.</p>
            </div>
            <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[11px] font-semibold text-primary">
              <Lock className="h-3 w-3" /> Secure review flow
            </div>
          </div>

          <Card className="overflow-hidden border-primary/30 bg-gradient-to-br from-card via-card to-primary/10">
            <CardContent className="grid gap-4 p-5 md:grid-cols-[1.1fr_0.9fr] md:p-6">
              <div className="space-y-3">
                <div className="rounded-2xl border border-white/10 bg-background/70 p-4 backdrop-blur">
                  <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                    <Banknote className="h-4 w-4 text-primary" /> Transfer details
                  </div>
                  <div className="mt-3 space-y-2 text-sm text-muted-foreground">
                    <div className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-background/80 px-3 py-2">
                      <span className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Bank Name</span>
                      <span className="font-semibold text-foreground">Moniepoint</span>
                    </div>
                    <div className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-background/80 px-3 py-2">
                      <span className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Account Number</span>
                      <span className="font-semibold text-foreground">9032743676</span>
                    </div>
                    <div className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-background/80 px-3 py-2">
                      <span className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Account Name</span>
                      <span className="font-semibold text-foreground">GEORGE ETOHWO</span>
                    </div>
                  </div>
                </div>
                <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2 font-semibold text-foreground"><BadgeCheck className="h-4 w-4 text-primary" /> Fast review</div>
                  <p className="mt-2">Use the form below to submit the exact amount you transferred. We’ll notify you the moment the deposit is approved.</p>
                </div>
              </div>

              <div className="rounded-2xl border border-primary/20 bg-background/70 p-4 shadow-sm backdrop-blur">
                <div className="flex items-center gap-2 text-sm font-semibold text-foreground"><Building2 className="h-4 w-4 text-primary" /> Why it feels premium</div>
                <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2"><Check className="mt-0.5 h-4 w-4 text-primary" />Lovely glassmorphism interface with polished interactions.</li>
                  <li className="flex items-start gap-2"><Check className="mt-0.5 h-4 w-4 text-primary" />Receipt upload is stored securely in Supabase storage.</li>
                  <li className="flex items-start gap-2"><Check className="mt-0.5 h-4 w-4 text-primary" />Approval requests are routed to a dedicated admin review page.</li>
                </ul>
                <Button onClick={() => setFundOpen(true)} className="mt-4 w-full"><ArrowDownToLine className="mr-2 h-4 w-4" /> Start transfer</Button>
              </div>
            </CardContent>
          </Card>
        </section>

        <section>
          <h2 className="mb-3 font-display text-lg font-bold">Upgrade your plan</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {Object.entries(UPGRADES).map(([k, u]) => (
              <Card key={k} className="border-primary/20">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary/15 text-primary"><Crown className="h-4 w-4" /></div>
                    <CardTitle className="text-base">{u.name}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <ul className="space-y-1 text-xs text-muted-foreground">
                    {u.perks.map((p) => <li key={p} className="flex items-start gap-1.5"><Check className="mt-0.5 h-3 w-3 text-primary" />{p}</li>)}
                  </ul>
                  <div className="flex items-center justify-between">
                    <span className="font-display text-xl font-bold tabular-nums">{formatMoney(u.price, currency)}</span>
                    <Button size="sm" onClick={() => setConfirm({ amount: u.price, description: u.name })} disabled={mutate.isPending}>
                      <ShoppingBag className="h-3.5 w-3.5" /> Pay with Wallet
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section>
          <h2 className="mb-3 font-display text-lg font-bold">Purchase Sandbox</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {SANDBOX.map((it) => (
              <Card key={it.id} className="flex flex-col">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary/15 text-primary"><it.icon className="h-4 w-4" /></div>
                    <CardTitle className="text-base">{it.name}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="flex flex-1 flex-col justify-between gap-3">
                  <p className="text-xs text-muted-foreground">{it.desc}</p>
                  <div className="flex items-center justify-between">
                    <span className="font-display text-xl font-bold tabular-nums">{formatMoney(it.price, currency)}</span>
                    <Button size="sm" onClick={() => buy(it)} disabled={mutate.isPending}>
                      <ShoppingBag className="h-3.5 w-3.5" /> Pay with Wallet
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section>
          <div className="mb-3 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 sm:flex sm:items-center sm:justify-between">
            <h2 className="truncate font-display text-lg font-bold">Transaction Ledger</h2>
            <div className="relative">
              <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search" className="h-8 pl-7 text-xs" />
            </div>
          </div>
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-secondary/50 text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 text-left">Type</th>
                    <th className="px-4 py-3 text-left">Description</th>
                    <th className="px-4 py-3 text-right">Amount</th>
                    <th className="hidden px-4 py-3 text-left md:table-cell">Reference</th>
                    <th className="hidden px-4 py-3 text-left sm:table-cell">Date</th>
                    <th className="px-4 py-3 text-left">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 && (
                    <tr><td colSpan={6} className="px-4 py-10 text-center text-sm text-muted-foreground">No transactions yet. Fund your wallet to get started.</td></tr>
                  )}
                  {filtered.map((t) => <LedgerRow key={t.id} t={t} currency={currency} />)}
                </tbody>
              </table>
            </div>
          </Card>
        </section>
      </main>

      <FundModal open={fundOpen} onOpenChange={setFundOpen} userEmail={user?.email} userName={user?.user_metadata?.full_name ?? user?.email ?? "Guest"} onConfirm={handleFundingRequest} />
      <WithdrawModal open={withdrawOpen} onOpenChange={setWithdrawOpen} balance={balance} currency={currency} onConfirm={async (amt) => {
        try {
          await mutate.mutateAsync({ amount: amt, type: "withdrawal", description: "Payout to bank" });
          toast.success(`Withdrawal of ${formatMoney(amt, currency)} requested`);
          setWithdrawOpen(false);
        } catch (e) { toast.error((e as Error).message); }
      }} />

      <Dialog open={!!confirm} onOpenChange={(o) => { if (!o) { setConfirm(null); navigate({ search: {} }); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><ShoppingBag className="h-4 w-4 text-primary" /> Confirm purchase</DialogTitle>
            <DialogDescription>{confirm?.description}</DialogDescription>
          </DialogHeader>
          <div className="rounded-lg border border-border bg-card p-4">
            <div className="flex items-center justify-between text-sm"><span className="text-muted-foreground">Amount</span><span className="font-display text-2xl font-bold tabular-nums">{formatMoney(confirm?.amount ?? 0, currency)}</span></div>
            <div className="mt-2 flex items-center justify-between text-xs"><span className="text-muted-foreground">Wallet balance</span><span className="tabular-nums">{formatMoney(balance, currency)}</span></div>
            {confirm && confirm.amount > balance && <p className="mt-3 text-xs text-destructive">Insufficient balance. Fund your wallet to continue.</p>}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => { setConfirm(null); navigate({ search: {} }); }}>Cancel</Button>
            {confirm && confirm.amount > balance ? (
              <Button onClick={() => { setFundOpen(true); }}>Top up wallet</Button>
            ) : (
              <Button onClick={async () => {
                if (!confirm) return;
                await mutate.mutateAsync({ amount: confirm.amount, type: "purchase", description: confirm.description });
                toast.success(`Paid ${formatMoney(confirm.amount, currency)} for ${confirm.description}`);
                setConfirm(null);
                navigate({ search: {} });
              }}>Pay with Wallet</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function LedgerRow({ t, currency }: { t: WalletTx; currency: string }) {
  const positive = t.type === "deposit" || t.type === "refund";
  return (
    <tr className="border-t border-border">
      <td className="px-4 py-3 capitalize">{t.type}</td>
      <td className="px-4 py-3 text-muted-foreground">{t.description ?? "—"}</td>
      <td className={`px-4 py-3 text-right font-semibold tabular-nums ${positive ? "text-primary" : "text-destructive"}`}>
        {positive ? "+" : "−"}{formatMoney(t.amount, currency)}
      </td>
      <td className="hidden px-4 py-3 font-mono text-xs text-muted-foreground md:table-cell">{t.reference}</td>
      <td className="hidden px-4 py-3 text-xs text-muted-foreground sm:table-cell">{new Date(t.created_at).toLocaleString()}</td>
      <td className="px-4 py-3"><Badge variant={t.status === "completed" ? "default" : "secondary"} className="capitalize">{t.status}</Badge></td>
    </tr>
  );
}

function FundModal({ open, onOpenChange, userEmail, userName, onConfirm }: { open: boolean; onOpenChange: (b: boolean) => void; userEmail?: string; userName?: string; onConfirm: (amt: number, receiptUrl: string | null, note: string) => void | Promise<void> }) {
  const [amount, setAmount] = useState<number>(25);
  const [custom, setCustom] = useState("");
  const [note, setNote] = useState("");
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const final = custom ? Number(custom) : amount;

  async function handleSubmit() {
    if (!final || final <= 0) return;
    setIsSubmitting(true);
    try {
      let receiptUrl: string | null = null;
      if (receiptFile) {
        setIsUploading(true);
        try {
          const safeName = `${Date.now()}-${receiptFile.name.replace(/\s+/g, "-")}`;
          const path = `${userEmail ?? "anon"}/${safeName}`;
          const buckets = ["wallet-receipts", "post-attachments"];
          let lastError: unknown;

          for (const bucket of buckets) {
            try {
              const { data, error } = await supabase.storage.from(bucket).upload(path, receiptFile, {
                upsert: false,
                contentType: receiptFile.type || "image/jpeg",
                cacheControl: "3600",
              });

              if (error) {
                lastError = error;
                continue;
              }

              const { data: signedData, error: signedError } = await supabase.storage.from(bucket).createSignedUrl(data.path, 60 * 60 * 24 * 7);
              if (signedError) {
                lastError = signedError;
                continue;
              }

              receiptUrl = signedData?.signedUrl ?? null;
              break;
            } catch (error) {
              lastError = error;
            }
          }

          if (!receiptUrl && lastError) {
            console.warn("Receipt upload unavailable, continuing without it", lastError);
            toast.warning("Receipt upload was unavailable, but your payment request was still submitted.");
          }
        } finally {
          setIsUploading(false);
        }
      }
      await onConfirm(final, receiptUrl, note.trim());
      onOpenChange(false);
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><ArrowDownToLine className="h-4 w-4 text-primary" /> Fund Account</DialogTitle>
          <DialogDescription>Make a manual bank transfer to our Moniepoint account and submit proof for approval.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 to-background p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground"><Banknote className="h-4 w-4 text-primary" /> Transfer details</div>
            <div className="mt-3 grid gap-2 text-sm text-muted-foreground sm:grid-cols-3">
              <div className="rounded-xl border border-border/60 bg-background/80 p-3">
                <div className="text-[10px] uppercase tracking-[0.24em] text-muted-foreground">Bank</div>
                <div className="mt-1 font-semibold text-foreground">Moniepoint</div>
              </div>
              <div className="rounded-xl border border-border/60 bg-background/80 p-3">
                <div className="text-[10px] uppercase tracking-[0.24em] text-muted-foreground">Account</div>
                <div className="mt-1 font-semibold text-foreground">9032743676</div>
              </div>
              <div className="rounded-xl border border-border/60 bg-background/80 p-3">
                <div className="text-[10px] uppercase tracking-[0.24em] text-muted-foreground">Name</div>
                <div className="mt-1 font-semibold text-foreground">GEORGE ETOHWO</div>
              </div>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground">Amount transferred</label>
            <div className="mt-2 grid grid-cols-4 gap-2">
              {PRESETS.map((p) => (
                <button key={p} type="button" onClick={() => { setAmount(p); setCustom(""); }} className={`rounded-lg border px-3 py-2 text-sm font-semibold tabular-nums transition ${!custom && amount === p ? "border-primary bg-primary/10 text-primary" : "border-border hover:border-primary/40"}`}>
                  ${p}
                </button>
              ))}
              <Input value={custom} onChange={(e) => setCustom(e.target.value.replace(/[^\d.]/g, ""))} placeholder="Custom" inputMode="decimal" />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground">Receipt proof (optional)</label>
            <label className="mt-2 flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-primary/30 bg-background/70 px-4 py-6 text-center transition hover:border-primary/60">
              <UploadCloud className="h-6 w-6 text-primary" />
              <span className="mt-2 text-sm font-medium text-foreground">{receiptFile ? receiptFile.name : "Upload image receipt"}</span>
              <span className="mt-1 text-xs text-muted-foreground">PNG, JPG, or WEBP</span>
              <input type="file" accept="image/*" className="sr-only" onChange={(e) => setReceiptFile(e.target.files?.[0] ?? null)} />
            </label>
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground">Note to admin</label>
            <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder={`Hello, I transferred ${final || 0} to your Moniepoint account.`} className="mt-2 min-h-24 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none ring-0" />
          </div>

          <div className="rounded-xl border border-border/60 bg-background/80 p-3 text-sm text-muted-foreground">
            <div className="flex items-center gap-2 text-foreground"><Clock3 className="h-4 w-4 text-primary" /> Review window</div>
            <p className="mt-2">Your request will appear as pending until an admin approves it. A WhatsApp notification will be sent with an approval link.</p>
            <div className="mt-3 flex items-center justify-between text-xs">
              <span>Recipient</span>
              <span className="font-semibold text-foreground">{userName ?? userEmail ?? "You"}</span>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={!(final > 0) || isSubmitting || isUploading}>
            {isUploading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Uploading receipt</> : isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting</> : `Submit payment · $${final || 0}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function WithdrawModal({ open, onOpenChange, balance, currency, onConfirm }: { open: boolean; onOpenChange: (b: boolean) => void; balance: number; currency: string; onConfirm: (amt: number) => void | Promise<void> }) {
  const [val, setVal] = useState("");
  const n = Number(val);
  const over = n > balance;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><ArrowUpFromLine className="h-4 w-4 text-primary" /> Withdraw Funds</DialogTitle>
          <DialogDescription>Available: <span className="font-semibold text-foreground">{formatMoney(balance, currency)}</span></DialogDescription>
        </DialogHeader>
        <div>
          <label className="text-xs font-semibold text-muted-foreground">Amount</label>
          <Input value={val} onChange={(e) => setVal(e.target.value.replace(/[^\d.]/g, ""))} placeholder="0.00" inputMode="decimal" className="mt-2 text-lg" />
          {over && <p className="mt-2 text-xs text-destructive">Amount exceeds your available balance.</p>}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => n > 0 && !over && onConfirm(n)} disabled={!(n > 0) || over}>Withdraw</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
