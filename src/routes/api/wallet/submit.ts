import { submitWalletFundingRequest } from "@/lib/wallet-server";

function json(payload: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(payload), {
    headers: { "content-type": "application/json; charset=utf-8" },
    ...init,
  });
}

export const POST = async ({ request }: { request: Request }) => {
  try {
    const payload = await request.json();
    const result = await submitWalletFundingRequest(request, payload);
    return json(result, { status: 200 });
  } catch (error) {
    return json({ error: (error as Error).message }, { status: 400 });
  }
};
