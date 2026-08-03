import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import type { WalletRequestPayload } from "./wallet-server";

export const submitWalletFundingRequestFn = createServerFn({ method: "POST" })
  .inputValidator((input: WalletRequestPayload) => input)
  .handler(async ({ data }) => {
    const { submitWalletFundingRequest } = await import("./wallet-server");
    const payload = (data ?? {}) as WalletRequestPayload;

    let request: Request;
    try {
      request = getRequest();
    } catch {
      const origin = process.env["APP_URL"] ?? "https://instagig.app";
      request = new Request(origin);
    }

    return submitWalletFundingRequest(request, payload);
  });
