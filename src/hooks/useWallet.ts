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

function safeWallet(userId: string): Wallet {
  return { user_id: userId, balance: 0, currency: "USD" };
}

export function useWallet() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const wallet = useQuery({
    queryKey: ["wallet", user?.id],
    enabled: !!user?.id,
    retry: false,
    queryFn: async (): Promise<Wallet> => {
      if (!user?.id) return safeWallet("");

      try {
        const { data, error } = await supabase.from("wallets").select("user_id,balance,currency").eq("user_id", user.id).maybeSingle();
        if (error) {
          console.warn("[useWallet] Unable to load wallet row", error);
          return safeWallet(user.id);
        }

        if (data) return { user_id: data.user_id, balance: Number(data.balance ?? 0), currency: data.currency ?? "USD" };

        const { data: created, error: insertError } = await supabase.from("wallets").insert({ user_id: user.id, balance: 0, currency: "USD" }).select("user_id,balance,currency").single();
        if (insertError) {
          console.warn("[useWallet] Unable to create wallet row", insertError);
          return safeWallet(user.id);
        }

        return { user_id: created.user_id, balance: Number(created.balance ?? 0), currency: created.currency ?? "USD" };
      } catch (error) {
        console.warn("[useWallet] Wallet query failed", error);
        return safeWallet(user.id);
      }
    },
  });

  const txs = useQuery({
    queryKey: ["wallet-tx", user?.id],
    enabled: !!user?.id,
    retry: false,
    queryFn: async (): Promise<WalletTx[]> => {
      if (!user?.id) return [];

      try {
        const { data, error } = await supabase
          .from("wallet_transactions")
          .select("id,amount,type,status,reference,description,created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(100);

        if (error) {
          console.warn("[useWallet] Unable to load wallet transactions", error);
          return [];
        }

        return (data ?? []).map((t) => ({ ...t, amount: Number(t.amount ?? 0) })) as WalletTx[];
      } catch (error) {
        console.warn("[useWallet] Wallet transactions query failed", error);
        return [];
      }
    },
  });

  useEffect(() => {
    if (!user?.id) return;

    try {
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
    } catch (error) {
      console.warn("[useWallet] Unable to subscribe to wallet updates", error);
    }
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

  return { wallet: wallet.data, balance: Number(wallet.data?.balance ?? 0), currency: wallet.data?.currency ?? "USD", transactions: txs.data ?? [], isLoading: wallet.isLoading || txs.isLoading, mutate };
}

export function formatMoney(n: number, currency = "USD") {
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(n);
  } catch {
    return `$${n.toFixed(2)}`;
  }
}
