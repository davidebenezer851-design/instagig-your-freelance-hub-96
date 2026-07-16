import { getSupabaseUserFromRequest } from "@/integrations/supabase/auth-request";
import { approveWalletTransaction, declineWalletTransaction } from "@/lib/wallet-server";

function json(payload: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(payload), {
    headers: { "content-type": "application/json; charset=utf-8" },
    ...init,
  });
}

export const POST = async ({ request, params }: { request: Request; params: { id: string; action: string } }) => {
  try {
    const user = await getSupabaseUserFromRequest(request);
    const action = params.action;
    if (action === "approve") {
      await approveWalletTransaction(params.id, user?.id ?? null);
      return json({ ok: true }, { status: 200 });
    }
    if (action === "decline") {
      await declineWalletTransaction(params.id, user?.id ?? null);
      return json({ ok: true }, { status: 200 });
    }
    return json({ error: "Unsupported action" }, { status: 400 });
  } catch (error) {
    return json({ error: (error as Error).message }, { status: 403 });
  }
};
