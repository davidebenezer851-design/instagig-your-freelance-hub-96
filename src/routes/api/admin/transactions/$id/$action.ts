import { createFileRoute } from "@tanstack/react-router";
import { getSupabaseUserFromRequest } from "@/integrations/supabase/auth-request";
import { approveWalletTransaction, declineWalletTransaction } from "@/lib/wallet-server";

function json(payload: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(payload), {
    headers: { "content-type": "application/json; charset=utf-8" },
    ...init,
  });
}

export const Route = createFileRoute("/api/admin/transactions/$id/$action")({
  server: {
    handlers: {
      POST: async ({ request, params }) => {
        try {
          const user = await getSupabaseUserFromRequest(request);
          if (params.action === "approve") {
            await approveWalletTransaction(params.id, user?.id ?? null);
            return json({ ok: true }, { status: 200 });
          }
          if (params.action === "decline") {
            await declineWalletTransaction(params.id, user?.id ?? null);
            return json({ ok: true }, { status: 200 });
          }
          return json({ error: "Unsupported action" }, { status: 400 });
        } catch (error) {
          return json({ error: (error as Error).message }, { status: 403 });
        }
      },
    },
  },
});
