import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Navbar } from "@/components/Navbar";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatMoney } from "@/hooks/useWallet";
import { Loader2, CheckCircle2, XCircle, ShieldCheck, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin-transactions")({
  head: () => ({ meta: [{ title: "Admin Transactions — InstaGIG" }] }),
  component: AdminTransactionsPage,
});

function AdminTransactionsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const search = Route.useSearch();

  useEffect(() => {
    if (!user) return;
    void loadTransactions();
  }, [user]);

  async function loadTransactions() {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/transactions");
      if (!response.ok) throw new Error("Unauthorized");
      const json = await response.json();
      setTransactions(json.transactions ?? []);
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function handleAction(id: string, action: "approve" | "decline") {
    setBusyId(id);
    try {
      const response = await fetch(`/api/admin/transactions/${id}/${action}`, { method: "POST" });
      if (!response.ok) throw new Error("Action failed");
      toast.success(action === "approve" ? "Wallet funded successfully" : "Transaction declined");
      await loadTransactions();
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setBusyId(null);
    }
  }

  const txId = typeof search?.tx === "string" ? search.tx : null;
  const highlightedId = txId ?? null;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="mx-auto max-w-6xl px-4 py-8 md:px-6">
        <div className="mb-6 flex items-center gap-3">
          <Link to="/wallet" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Back to wallet
          </Link>
        </div>
        <Card className="border-primary/20">
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <CardTitle className="flex items-center gap-2 text-xl"><ShieldCheck className="h-5 w-5 text-primary" /> Admin transfer approvals</CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">Review manual bank transfer requests and approve funds instantly.</p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-10 text-sm text-muted-foreground"><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading pending transfers...</div>
            ) : transactions.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">No pending transfer requests right now.</div>
            ) : (
              <div className="space-y-3">
                {transactions.map((tx) => (
                  <div key={tx.id} className={`rounded-2xl border p-4 ${highlightedId === tx.id ? "border-primary bg-primary/10" : "border-border bg-background/80"}`}>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-foreground">{tx.description ?? "Manual transfer"}</p>
                          <Badge variant="secondary" className="capitalize">{tx.status}</Badge>
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">{tx.note ?? "No note provided."}</p>
                        <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
                          <span>Amount: <strong className="text-foreground">{formatMoney(Number(tx.amount), "USD")}</strong></span>
                          <span>Reference: <strong className="font-mono text-foreground">{tx.reference}</strong></span>
                          <span>Created: <strong className="text-foreground">{new Date(tx.created_at).toLocaleString()}</strong></span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => handleAction(tx.id, "decline")} disabled={busyId === tx.id}>
                          {busyId === tx.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <XCircle className="mr-2 h-4 w-4" />} Decline
                        </Button>
                        <Button size="sm" onClick={() => handleAction(tx.id, "approve")} disabled={busyId === tx.id}>
                          {busyId === tx.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />} Approve
                        </Button>
                      </div>
                    </div>
                    {tx.receipt_url ? (
                      <div className="mt-4 rounded-xl border border-border/60 bg-background/70 p-3">
                        <p className="mb-2 text-xs uppercase tracking-[0.24em] text-muted-foreground">Receipt proof</p>
                        <img src={tx.receipt_url} alt="Receipt proof" className="max-h-64 rounded-xl object-contain" />
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
