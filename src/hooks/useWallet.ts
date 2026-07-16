import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type Wallet = { user_id: string; balance: number; currency: string };
export type WalletTx = {
  id: string;
  amount: number;
  type: "deposit" | "withdrawal" | "purchase" | "refund";
  status: "pending" | "completed" | "failed";
  reference: string | null;
  description: string | null;
  created_at: string;
};

export function useWallet() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const wallet = useQuery({
    queryKey: ["wallet", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<Wallet> => {
      const { data } = await supabase.from("wallets").select("user_id,balance,currency").eq("user_id", user!.id).maybeSingle();
      if (data) return { ...data, balance: Number(data.balance) };
      const { data: created, error } = await supabase.from("wallets").insert({ user_id: user!.id, balance: 0, currency: "USD" }).select("user_id,balance,currency").single();
      if (error) throw error;
      return { ...created, balance: Number(created.balance) };
    },
  });

  const txs = useQuery({
    queryKey: ["wallet-tx", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<WalletTx[]> => {
      const { data } = await supabase
        .from("wallet_transactions")
        .select("id,amount,type,status,reference,description,created_at")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(100);
      return (data ?? []).map((t) => ({ ...t, amount: Number(t.amount) })) as WalletTx[];
    },
  });

  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase.channel(`wallet-live-${user.id}`);
    channel
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "wallet_transactions", filter: `user_id=eq.${user.id}` }, () => {
        qc.invalidateQueries({ queryKey: ["wallet", user.id] });
        qc.invalidateQueries({ queryKey: ["wallet-tx", user.id] });
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "wallet_transactions", filter: `user_id=eq.${user.id}` }, () => {
        qc.invalidateQueries({ queryKey: ["wallet", user.id] });
        qc.invalidateQueries({ queryKey: ["wallet-tx", user.id] });
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "wallets", filter: `user_id=eq.${user.id}` }, () => {
        qc.invalidateQueries({ queryKey: ["wallet", user.id] });
        qc.invalidateQueries({ queryKey: ["wallet-tx", user.id] });
      })
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [qc, user?.id]);

  const mutate = useMutation({
    mutationFn: async (input: { amount: number; type: WalletTx["type"]; description?: string; reference?: string }) => {
      if (!user) throw new Error("Not signed in");
      const current = Number(wallet.data?.balance ?? 0);
      const delta = input.type === "deposit" || input.type === "refund" ? input.amount : -input.amount;
      const next = current + delta;
      if (next < 0) throw new Error("Insufficient balance");
      const ref = input.reference ?? `IG-${Date.now().toString(36).toUpperCase()}`;
      const { error: txErr } = await supabase.from("wallet_transactions").insert({
        user_id: user.id,
        amount: input.amount,
        type: input.type,
        status: "completed",
        reference: ref,
        description: input.description ?? null,
      });
      if (txErr) throw txErr;
      const { error: wErr } = await supabase.from("wallets").update({ balance: next }).eq("user_id", user.id);
      if (wErr) throw wErr;
      return { balance: next, reference: ref };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["wallet", user?.id] });
      qc.invalidateQueries({ queryKey: ["wallet-tx", user?.id] });
    },
  });

  return { wallet: wallet.data, balance: Number(wallet.data?.balance ?? 0), currency: wallet.data?.currency ?? "USD", transactions: txs.data ?? [], isLoading: wallet.isLoading, mutate };
}

export function formatMoney(n: number, currency = "USD") {
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(n);
  } catch {
    return `$${n.toFixed(2)}`;
  }
}
