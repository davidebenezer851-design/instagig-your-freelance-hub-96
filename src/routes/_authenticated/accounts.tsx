import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserAvatar } from "@/components/UserAvatar";
import { Check, ChevronRight, Mail, Plus, Shield, User as UserIcon, LogOut } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/accounts")({
  head: () => ({ meta: [{ title: "Accounts — InstaGIG" }] }),
  component: AccountsPage,
});

function AccountsPage() {
  const { user } = useAuth();
  const [newEmail, setNewEmail] = useState("");
  const [busy, setBusy] = useState(false);

  async function addEmail() {
    if (!newEmail.trim()) return;
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ email: newEmail.trim() });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Confirmation sent to " + newEmail);
    setNewEmail("");
  }

  async function signOut() {
    await supabase.auth.signOut();
    window.location.href = "/auth";
  }

  const email = user?.email ?? "";

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="mx-auto max-w-3xl px-4 py-10 md:px-6">
        <h1 className="font-display text-3xl font-bold">Accounts</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage the emails you use to sign in, add another account, or switch between them.
        </p>

        {/* Active account card */}
        <div className="mt-8 overflow-hidden rounded-2xl border border-border bg-card">
          <div className="flex items-center gap-4 border-b border-border p-5">
            <UserAvatar userId={user?.id} size={56} className="ring-2 ring-primary/40" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <div className="truncate font-display text-lg font-semibold">{email || "Signed in"}</div>
                <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold text-primary">ACTIVE</span>
              </div>
              <div className="text-xs text-muted-foreground">Primary account · Verified</div>
            </div>
            <Check className="h-5 w-5 text-primary" />
          </div>

          <Link to="/profile" className="flex items-center gap-3 px-5 py-4 hover:bg-secondary/50">
            <UserIcon className="h-4 w-4 text-muted-foreground" />
            <span className="flex-1 text-sm">Edit profile & photo</span>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </Link>
          <Link to="/settings" className="flex items-center gap-3 border-t border-border px-5 py-4 hover:bg-secondary/50">
            <Shield className="h-4 w-4 text-muted-foreground" />
            <span className="flex-1 text-sm">Security & password</span>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </Link>
        </div>

        {/* Add / switch */}
        <div className="mt-6 rounded-2xl border border-border bg-card p-5">
          <div className="mb-3 flex items-center gap-2">
            <Plus className="h-4 w-4 text-primary" />
            <h2 className="font-display text-base font-semibold">Add another email</h2>
          </div>
          <p className="mb-4 text-xs text-muted-foreground">
            Add a secondary email to your account. We'll send a confirmation link before switching.
          </p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="flex-1 space-y-1">
              <Label htmlFor="e" className="sr-only">Email</Label>
              <Input id="e" type="email" placeholder="name@company.com" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} />
            </div>
            <Button onClick={addEmail} disabled={busy || !newEmail.trim()} className="font-semibold">
              {busy ? "Sending…" : "Add email"}
            </Button>
          </div>
        </div>

        {/* Switch accounts */}
        <div className="mt-6 rounded-2xl border border-border bg-card">
          <div className="flex items-center gap-2 p-5 pb-2">
            <Mail className="h-4 w-4 text-primary" />
            <h2 className="font-display text-base font-semibold">Switch account</h2>
          </div>
          <p className="px-5 pb-4 text-xs text-muted-foreground">
            Sign out and sign back in with a different email or Google account.
          </p>
          <button
            onClick={signOut}
            className="flex w-full items-center gap-3 border-t border-border px-5 py-4 text-left text-sm hover:bg-secondary/50"
          >
            <UserAvatar userId={user?.id} size={36} />
            <div className="flex-1">
              <div className="font-medium">Sign in with a different account</div>
              <div className="text-xs text-muted-foreground">Google, email & password, or magic link</div>
            </div>
            <LogOut className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>
      </div>
      <Footer />
    </div>
  );
}
