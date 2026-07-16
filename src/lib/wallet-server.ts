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

  const twilioSid = getEnv("TWILIO_ACCOUNT_SID");
  const twilioToken = getEnv("TWILIO_AUTH_TOKEN");
  const twilioFrom = getEnv("TWILIO_WHATSAPP_FROM");
  const phoneNumber = getEnv("WHATSAPP_TO_NUMBER") || "+2349032743676";

  if (twilioSid && twilioToken && twilioFrom) {
    const url = `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`;
    const form = new URLSearchParams({
      To: `whatsapp:${phoneNumber}`,
      From: `whatsapp:${twilioFrom}`,
      Body: message,
    });

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${twilioSid}:${twilioToken}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: form,
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "") ;
      console.error(`[wallet] WhatsApp send failed: ${response.status} ${text}`);
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

  const { data, error } = await supabaseAdmin.from("wallet_transactions").insert({
    user_id: userId,
    amount,
    type: "deposit",
    status: "pending",
    reference,
    description: note,
    receipt_url: receiptUrl,
    note,
  } as Record<string, unknown>).select("id,amount,status,reference,created_at").single();

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
    .select("id,amount,type,status,reference,description,note,receipt_url,created_at,user_id")
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

  const { data, error } = await supabaseAdmin.rpc("approve_wallet_transaction", { transaction_id: transactionId });
  if (error) throw error;
  return data;
}

export async function declineWalletTransaction(transactionId: string, userId: string | null) {
  if (!userId) throw new Error("Authentication required");

  const { data: roleData } = await supabaseAdmin.from("user_roles").select("role").eq("user_id", userId).order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (roleData?.role !== "admin") {
    throw new Error("Unauthorized");
  }

  const { error } = await supabaseAdmin.from("wallet_transactions").update({ status: "declined" }).eq("id", transactionId);
  if (error) throw error;
  return { ok: true };
}
