import { createFileRoute } from "@tanstack/react-router";
import { getSupabaseUserFromRequest } from "@/integrations/supabase/auth-request";
import { listPendingTransactionsForAdmin } from "@/lib/wallet-server";

function json(payload: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(payload), {
    headers: { "content-type": "application/json; charset=utf-8" },
    ...init,
  });
}

export const Route = createFileRoute("/api/admin/transactions")({
  server: {
    handlers: {
      GET: async ({ request }: { request: Request }) => {
        try {
          const user = await getSupabaseUserFromRequest(request);
          const transactions = await listPendingTransactionsForAdmin(user?.id ?? null);
          return json({ transactions }, { status: 200 });
        } catch (error) {
          return json({ error: (error as Error).message }, { status: 403 });
        }
      },
    },
  },
});
