import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useWallet, formatMoney, type WalletTx } from "@/hooks/useWallet";
import { ArrowDownToLine, ArrowUpFromLine, CreditCard, Building2, Wallet as WalletIcon, Search, ShoppingBag, Sparkles, Zap, ShieldCheck, Crown, Check, Plus, Smartphone, Landmark, Hash, Lock } from "lucide-react";
import { toast } from "sonner";

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

type PaystackChannel = "card" | "bank" | "ussd" | "transfer";
type LinkedMethod = { id: string; brand: PaystackChannel; label: string; sub: string };

function loadMethods(): LinkedMethod[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem("instagig:methods") ?? "[]"); } catch { return []; }
}

function WalletPage() {
  const { balance, currency, transactions, mutate } = useWallet();
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const [fundOpen, setFundOpen] = useState(false);
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [methods, setMethods] = useState<LinkedMethod[]>([]);
  const [connectOpen, setConnectOpen] = useState<null | PaystackChannel>(null);
  const [confirm, setConfirm] = useState<{ amount: number; description: string } | null>(null);

  useEffect(() => { setMethods(loadMethods()); }, []);
  useEffect(() => {
    if (search.upgrade && UPGRADES[search.upgrade]) {
      const u = UPGRADES[search.upgrade];
      setConfirm({ amount: u.price, description: u.name });
    } else if (search.gig && search.price) {
      setConfirm({ amount: Number(search.price), description: `Order: ${search.title ?? "Gig"}` });
    }
  }, [search.upgrade, search.gig, search.price, search.title]);

  function saveMethods(next: LinkedMethod[]) {
    setMethods(next);
    if (typeof window !== "undefined") localStorage.setItem("instagig:methods", JSON.stringify(next));
  }

  const filtered = useMemo(
    () => transactions.filter((t) => `${t.type} ${t.description ?? ""} ${t.reference ?? ""}`.toLowerCase().includes(query.toLowerCase())),
    [transactions, query]
  );

  async function buy(item: { name: string; price: number }) {
    if (item.price > balance) { toast.error("Insufficient Balance — Please Fund Your Wallet"); setFundOpen(true); return; }
    await mutate.mutateAsync({ amount: item.price, type: "purchase", description: item.name });
    toast.success(`Purchased ${item.name}`);
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="mx-auto max-w-6xl space-y-6 px-4 py-6 md:px-6 md:py-10">
        <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
          <div className="min-w-0">
            <h1 className="font-display text-2xl font-bold md:text-3xl">Wallet</h1>
            <p className="text-sm text-muted-foreground">Fund your account, connect payout methods, and track every transaction.</p>
          </div>
          <Badge variant="secondary" className="gap-1 px-3 py-1.5 text-sm"><WalletIcon className="h-3.5 w-3.5" /> {currency}</Badge>
        </header>

        {/* Balance card */}
        <Card className="relative overflow-hidden border-primary/30 bg-gradient-to-br from-card via-card to-primary/10 shadow-[var(--shadow-glow)]">
          <div className="pointer-events-none absolute -right-10 -top-10 h-48 w-48 rounded-full bg-primary/30 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-16 -left-16 h-56 w-56 rounded-full bg-primary/20 blur-3xl" />
          <CardContent className="relative grid gap-6 p-6 md:grid-cols-[1fr_auto] md:p-8">
            <div>
              <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground">
                <WalletIcon className="h-3.5 w-3.5" /> Available Balance
              </div>
              <div className="mt-2 font-display text-4xl font-black tabular-nums text-foreground md:text-6xl">{formatMoney(balance, currency)}</div>
              <div className="mt-1 text-xs text-muted-foreground">InstaGIG Wallet · Instant settlement</div>
            </div>
            <div className="flex flex-col gap-2 self-end md:items-end">
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => setFundOpen(true)} className="font-semibold"><ArrowDownToLine className="h-4 w-4" /> Fund Account</Button>
                <Button onClick={() => setWithdrawOpen(true)} variant="secondary"><ArrowUpFromLine className="h-4 w-4" /> Withdraw</Button>
              </div>
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">•• 4242 · InstaGIG Lemon</div>
            </div>
          </CardContent>
        </Card>

        {/* Paystack payment channels */}
        <section>
          <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="font-display text-lg font-bold">Payment Channels</h2>
              <p className="text-xs text-muted-foreground">Everything runs through <span className="font-semibold text-primary">Paystack</span> — pick a channel to link.</p>
            </div>
            <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[11px] font-semibold text-primary">
              <Lock className="h-3 w-3" /> Secured by Paystack
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { k: "card" as const, name: "Debit / Credit Card", desc: "Visa, Mastercard, Verve — instant.", icon: CreditCard },
              { k: "bank" as const, name: "Bank Account", desc: "Direct debit from your bank.", icon: Landmark },
              { k: "ussd" as const, name: "USSD", desc: "Pay from any phone, no data.", icon: Hash },
              { k: "transfer" as const, name: "Bank Transfer", desc: "Dedicated Paystack account.", icon: Building2 },
            ].map((m) => {
              const linked = methods.find((x) => x.brand === m.k);
              return (
                <Card key={m.k} className="flex flex-col">
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                      <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary/15 text-primary"><m.icon className="h-4 w-4" /></div>
                      <CardTitle className="text-base">{m.name}</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="flex flex-1 flex-col justify-between gap-3">
                    <p className="text-xs text-muted-foreground">{linked ? linked.sub : m.desc}</p>
                    {linked ? (
                      <div className="flex items-center justify-between">
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary"><Check className="h-3.5 w-3.5" /> Connected</span>
                        <Button size="sm" variant="ghost" onClick={() => saveMethods(methods.filter((x) => x.id !== linked.id))}>Disconnect</Button>
                      </div>
                    ) : (
                      <Button size="sm" variant="secondary" onClick={() => setConnectOpen(m.k)}><Plus className="h-3.5 w-3.5" /> Connect</Button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>

        {/* Upgrade plans */}
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

        {/* Sandbox */}
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

        {/* Ledger */}
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

      <FundModal open={fundOpen} onOpenChange={setFundOpen} onConfirm={async (amt, method) => {
        await mutate.mutateAsync({ amount: amt, type: "deposit", description: `Deposit via ${method}` });
        toast.success(`Funded ${formatMoney(amt, currency)} via ${method}`);
        setFundOpen(false);
      }} />
      <WithdrawModal open={withdrawOpen} onOpenChange={setWithdrawOpen} balance={balance} currency={currency} onConfirm={async (amt) => {
        try {
          await mutate.mutateAsync({ amount: amt, type: "withdrawal", description: "Payout to bank" });
          toast.success(`Withdrawal of ${formatMoney(amt, currency)} requested`);
          setWithdrawOpen(false);
        } catch (e) { toast.error((e as Error).message); }
      }} />

      <ConnectModal open={!!connectOpen} onOpenChange={(o) => !o && setConnectOpen(null)} brand={connectOpen} onConfirm={(label, sub) => {
        if (!connectOpen) return;
        saveMethods([...methods, { id: crypto.randomUUID(), brand: connectOpen, label, sub }]);
        toast.success(`${label} connected`);
        setConnectOpen(null);
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

function FundModal({ open, onOpenChange, onConfirm }: { open: boolean; onOpenChange: (b: boolean) => void; onConfirm: (amt: number, method: string) => void | Promise<void> }) {
  const [amount, setAmount] = useState<number>(25);
  const [custom, setCustom] = useState("");
  const [method, setMethod] = useState("Credit Card");
  const final = custom ? Number(custom) : amount;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><ArrowDownToLine className="h-4 w-4 text-primary" /> Fund Account</DialogTitle>
          <DialogDescription>Add credit to your InstaGIG wallet.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-muted-foreground">Quick Amount</label>
            <div className="mt-2 grid grid-cols-4 gap-2">
              {PRESETS.map((p) => (
                <button key={p} type="button" onClick={() => { setAmount(p); setCustom(""); }}
                  className={`rounded-lg border px-3 py-2 text-sm font-semibold tabular-nums transition ${!custom && amount === p ? "border-primary bg-primary/10 text-primary" : "border-border hover:border-primary/40"}`}>
                  ${p}
                </button>
              ))}
              <Input value={custom} onChange={(e) => setCustom(e.target.value.replace(/[^\d.]/g, ""))} placeholder="Custom" inputMode="decimal" />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground">Paystack Channel</label>
            <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {[
                { k: "Card", i: CreditCard },
                { k: "Bank", i: Landmark },
                { k: "USSD", i: Hash },
                { k: "Transfer", i: Building2 },
              ].map(({ k, i: I }) => (
                <button key={k} type="button" onClick={() => setMethod(k)}
                  className={`flex items-center justify-center gap-1.5 rounded-lg border px-2 py-2 text-xs font-medium transition ${method === k ? "border-primary bg-primary/10 text-primary" : "border-border hover:border-primary/40"}`}>
                  <I className="h-3.5 w-3.5" />{k}
                </button>
              ))}
            </div>
            <div className="mt-3 flex items-center justify-center gap-1.5 rounded-md border border-primary/20 bg-primary/5 px-3 py-2 text-[11px] text-muted-foreground">
              <Lock className="h-3 w-3 text-primary" /> You'll be redirected to <span className="font-semibold text-foreground">Paystack</span> to complete payment securely.
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => final > 0 && onConfirm(final, `Paystack · ${method}`)} disabled={!(final > 0)}>
            Pay with Paystack · ${final || 0}
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

function ConnectModal({ open, onOpenChange, brand, onConfirm }: { open: boolean; onOpenChange: (b: boolean) => void; brand: "stripe" | "paypal" | "card" | "bank" | null; onConfirm: (label: string, sub: string) => void }) {
  const [v1, setV1] = useState("");
  const [v2, setV2] = useState("");
  useEffect(() => { if (open) { setV1(""); setV2(""); } }, [open]);
  if (!brand) return null;
  const cfg = {
    stripe: { title: "Connect Stripe", l1: "Stripe account email", l2: "Account ID (acct_…)", btn: "Connect Stripe", label: "Stripe", sub: (e: string) => `Account ${e || "linked"}` },
    paypal: { title: "Connect PayPal", l1: "PayPal email", l2: "", btn: "Connect PayPal", label: "PayPal", sub: (e: string) => e ? e : "Account linked" },
    card: { title: "Add Card", l1: "Card number", l2: "Cardholder name", btn: "Save Card", label: "Card", sub: (n: string) => `•• ${n.slice(-4) || "0000"}` },
    bank: { title: "Add Bank Account", l1: "Account number", l2: "Routing / IBAN", btn: "Link Bank", label: "Bank", sub: (n: string) => `Acct ending ${n.slice(-4) || "0000"}` },
  }[brand];
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{cfg.title}</DialogTitle>
          <DialogDescription>Connect a payment method to your InstaGIG wallet.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-muted-foreground">{cfg.l1}</label>
            <Input value={v1} onChange={(e) => setV1(e.target.value)} className="mt-1" />
          </div>
          {cfg.l2 && (
            <div>
              <label className="text-xs font-semibold text-muted-foreground">{cfg.l2}</label>
              <Input value={v2} onChange={(e) => setV2(e.target.value)} className="mt-1" />
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button disabled={!v1} onClick={() => onConfirm(cfg.label, cfg.sub(v1))}>{cfg.btn}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
