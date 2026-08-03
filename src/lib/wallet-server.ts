import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type WalletRequestPayload = {
  amount: number;
  receiptUrl?: string | null;
  note?: string | null;
  userId?: string | null;
  userEmail?: string | null;
  username?: string | null;
};

function normalizeAmount(value: number) {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0) throw new Error("Amount must be greater than zero.");
  return amount;
}

function getEnv(name: string) {
  return process.env[name] ?? "";
}

function buildAdminUrl(request: Request, transactionId: string) {
  const requestUrl = new URL(request.url);
  const origin = request.headers.get("origin") ?? request.headers.get("x-forwarded-host") ?? requestUrl.origin;
  return new URL(`/admin-transactions?tx=${encodeURIComponent(transactionId)}`, origin).toString();
}

async function sendWhatsAppNotification(request: Request, payload: WalletRequestPayload, transactionId: string) {
  const amount = normalizeAmount(payload.amount);
  const username = payload.username ?? payload.userEmail ?? "Guest";
  const email = payload.userEmail ?? "n/a";
  const userId = payload.userId ?? "n/a";
  const note = payload.note?.trim() || "No note provided";
  const receiptUrl = payload.receiptUrl?.trim() || "No receipt uploaded";
  const timestamp = new Date().toISOString();
  const adminUrl = buildAdminUrl(request, transactionId);
  const message = [
    "New wallet funding request",
    `Customer: ${username}`,
    `Email: ${email}`,
    `User ID: ${userId}`,
    `Amount: ${amount}`,
    `Purpose: ${note}`,
    `Receipt: ${receiptUrl}`,
    `Timestamp: ${timestamp}`,
    `Transaction ID: ${transactionId}`,
    `Review: ${adminUrl}`,
  ].join("\n");

  const phoneNumber = getEnv("WHATSAPP_TO_NUMBER") || "+2349032743676";
  const lovableKey = getEnv("LOVABLE_API_KEY");
  const twilioKey = getEnv("TWILIO_API_KEY");
  // Defaults to the Twilio WhatsApp sandbox sender; override with TWILIO_WHATSAPP_FROM.
  const twilioFrom = getEnv("TWILIO_WHATSAPP_FROM") || "+14155238886";

  if (lovableKey && twilioKey) {
    const form = new URLSearchParams({
      To: `whatsapp:${phoneNumber}`,
      From: `whatsapp:${twilioFrom}`,
      Body: message,
    });
    if (payload.receiptUrl?.trim()) form.set("MediaUrl", payload.receiptUrl.trim());

    try {
      const response = await fetch("https://connector-gateway.lovable.dev/twilio/Messages.json", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${lovableKey}`,
          "X-Connection-Api-Key": twilioKey,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: form,
      });
      if (!response.ok) {
        const text = await response.text().catch(() => "");
        console.error(`[wallet] WhatsApp send failed: ${response.status} ${text}`);
      }
    } catch (err) {
      console.error("[wallet] WhatsApp send error", err);
    }
    return;
  }

  const webhookUrl = getEnv("WHATSAPP_WEBHOOK_URL") || getEnv("WHATSAPP_API_URL");
  if (webhookUrl) {
    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to: phoneNumber, message }),
    });
    return;
  }

  console.info(`[wallet] WhatsApp notification ready: ${message}`);
}

export async function submitWalletFundingRequest(request: Request, payload: WalletRequestPayload) {
  const amount = normalizeAmount(payload.amount);
  const userId = payload.userId ?? null;
  const reference = `IG-${Date.now().toString(36).toUpperCase()}`;
  const note = payload.note?.trim() || "Manual bank transfer request";
  const receiptUrl = payload.receiptUrl ?? null;

  if (!userId) throw new Error("Authentication required");

  const { data, error } = await supabaseAdmin.from("wallet_transactions").insert({
    user_id: userId,
    amount,
    type: "deposit",
    status: "pending",
    reference,
    description: note,
    metadata: { receipt_url: receiptUrl, note },
  }).select("id,amount,status,reference,created_at").single();

  if (error) throw error;

  await sendWhatsAppNotification(request, payload, data.id);

  return { transaction: data };
}

export async function listPendingTransactionsForAdmin(userId: string | null) {
  if (!userId) throw new Error("Authentication required");

  const { data: roleData } = await supabaseAdmin.from("user_roles").select("role").eq("user_id", userId).order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (roleData?.role !== "admin") {
    throw new Error("Unauthorized");
  }

  const { data, error } = await supabaseAdmin.from("wallet_transactions")
    .select("id,amount,type,status,reference,description,metadata,created_at,user_id")
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function approveWalletTransaction(transactionId: string, userId: string | null) {
  if (!userId) throw new Error("Authentication required");

  const { data: roleData } = await supabaseAdmin.from("user_roles").select("role").eq("user_id", userId).order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (roleData?.role !== "admin") {
    throw new Error("Unauthorized");
  }

  const { data: tx, error: txErr } = await supabaseAdmin
    .from("wallet_transactions")
    .select("id,user_id,amount,status")
    .eq("id", transactionId)
    .single();
  if (txErr) throw txErr;
  if (tx.status !== "pending") return { ok: true, alreadyProcessed: true };

  const { data: wallet } = await supabaseAdmin
    .from("wallets")
    .select("user_id,balance")
    .eq("user_id", tx.user_id)
    .maybeSingle();

  const nextBalance = Number(wallet?.balance ?? 0) + Number(tx.amount);

  if (wallet) {
    const { error: wErr } = await supabaseAdmin.from("wallets").update({ balance: nextBalance }).eq("user_id", tx.user_id);
    if (wErr) throw wErr;
  } else {
    const { error: wErr } = await supabaseAdmin.from("wallets").insert({ user_id: tx.user_id, balance: nextBalance });
    if (wErr) throw wErr;
  }

  const { error: updErr } = await supabaseAdmin
    .from("wallet_transactions")
    .update({ status: "completed" })
    .eq("id", transactionId);
  if (updErr) throw updErr;

  return { ok: true, balance: nextBalance };
}

export async function declineWalletTransaction(transactionId: string, userId: string | null) {
  if (!userId) throw new Error("Authentication required");

  const { data: roleData } = await supabaseAdmin.from("user_roles").select("role").eq("user_id", userId).order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (roleData?.role !== "admin") {
    throw new Error("Unauthorized");
  }

  const { error } = await supabaseAdmin.from("wallet_transactions").update({ status: "failed" }).eq("id", transactionId);
  if (error) throw error;
  return { ok: true };
}
