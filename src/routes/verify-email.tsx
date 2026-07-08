import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CheckCircle2, Loader2, MailCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/verify-email")({
  head: () => ({ meta: [{ title: "Verify email — InstaGIG" }] }),
  component: VerifyEmailPage,
});

function VerifyEmailPage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<"checking" | "verified" | "error">("checking");
  const [message, setMessage] = useState("Checking your verification link…");

  useEffect(() => {
    let alive = true;
    async function verify() {
      try {
        const url = new URL(window.location.href);
        const code = url.searchParams.get("code");
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
          window.history.replaceState({}, "", "/verify-email");
        } else {
          const { data } = await supabase.auth.getSession();
          if (!data.session) setMessage("Email verified. You can sign in now.");
        }
        window.setTimeout(() => {
          if (!alive) return;
          setStatus("verified");
          setMessage("Verified — welcome to InstaGIG.");
        }, 1000);
      } catch (error) {
        if (!alive) return;
        setStatus("error");
        setMessage((error as Error).message || "This verification link is invalid or expired.");
      }
    }
    verify();
    return () => { alive = false; };
  }, []);

  return (
    <div className="grid min-h-screen place-items-center bg-background px-4">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 text-center shadow-[var(--shadow-card)]">
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-primary/15 text-primary">
          {status === "checking" ? <Loader2 className="h-6 w-6 animate-spin" /> : status === "verified" ? <CheckCircle2 className="h-6 w-6" /> : <MailCheck className="h-6 w-6" />}
        </div>
        <h1 className="mt-4 font-display text-xl font-bold">Email verification</h1>
        <p className="mt-2 text-sm text-muted-foreground">{message}</p>
        <div className="mt-6 flex flex-col gap-2">
          {status === "verified" ? (
            <Button onClick={() => navigate({ to: "/dashboard", replace: true })} className="font-semibold">Continue</Button>
          ) : status === "error" ? (
            <Link to="/auth" search={{ tab: "signin" } as never}><Button className="w-full font-semibold">Back to sign in</Button></Link>
          ) : null}
        </div>
      </div>
    </div>
  );
}