import { createServerFn } from "@tanstack/react-start";
import { submitWalletFundingRequest, type WalletRequestPayload } from "./wallet-server";

export const submitWalletFundingRequestFn = createServerFn({
  method: "POST",
}).handler(async ({ data }) => {
  const payload = (data ?? {}) as WalletRequestPayload;
  const origin = process.env.APP_URL ?? process.env.VITE_APP_URL ?? "https://instagig.app";
  return submitWalletFundingRequest(new Request(origin), payload);
});
