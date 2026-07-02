import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useTheme } from "@/components/ThemeProvider";
import { Bell, KeyRound, LogOut, Moon, Sun, Trash2, User as UserIcon } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({ meta: [{ title: "Settings — InstaGIG" }] }),
  component: Settings,
});

function Settings() {
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [pushOn, setPushOn] = useState(typeof Notification !== "undefined" && Notification.permission === "granted");
  const [emailOn, setEmailOn] = useState(true);
  const [pw, setPw] = useState("");

  async function togglePush(on: boolean) {
    if (typeof Notification === "undefined") { toast.error("Notifications not supported in this browser"); return; }
    if (on) {
      if (Notification.permission === "denied") {
        toast.error("Notifications are blocked. Enable them in your browser/site settings, then try again.");
        return;
      }
      if (Notification.permission !== "granted") {
        const r = await Notification.requestPermission();
        if (r !== "granted") { toast.error("Permission denied"); return; }
      }
      setPushOn(true);
      try { new Notification("Notifications enabled", { body: "You'll be alerted about new messages.", icon: "/favicon.ico" }); } catch {}
      toast.success("Push notifications enabled");
    } else {
      // Browsers don't allow revoking permission from JS; user must do it in site settings.
      setPushOn(false);
      toast.message("Turned off in-app. To fully revoke, disable notifications for this site in your browser settings.");
    }
  }

  async function changePassword() {
    if (pw.length < 6) { toast.error("Min 6 characters"); return; }
    const { error } = await supabase.auth.updateUser({ password: pw });
    if (error) toast.error(error.message); else { toast.success("Password updated"); setPw(""); }
  }

  async function signOut() {
    await qc.cancelQueries(); qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  async function deleteAccount() {
    if (!confirm("Permanently delete your account? This cannot be undone.")) return;
    toast.error("Account deletion requires admin access. Contact support.");
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="mx-auto max-w-3xl px-4 py-10 md:px-6">
        <h1 className="font-display text-3xl font-bold">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">Manage your account, theme and notifications.</p>

        {/* Appearance */}
        <Section title="Appearance" icon={theme === "dark" ? Moon : Sun}>
          <Row label="Theme" hint="Switch between dark and light mode.">
            <div className="flex rounded-lg border border-border p-1">
              <button onClick={() => setTheme("dark")} className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition ${theme === "dark" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}><Moon className="h-3.5 w-3.5" /> Dark</button>
              <button onClick={() => setTheme("light")} className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition ${theme === "light" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}><Sun className="h-3.5 w-3.5" /> Light</button>
            </div>
          </Row>
        </Section>

        {/* Notifications */}
        <Section title="Notifications" icon={Bell}>
          <Row label="Push notifications" hint="Get a desktop alert when you receive a new message.">
            <Switch checked={pushOn} onCheckedChange={togglePush} />
          </Row>
          <Row label="Email notifications" hint="Receive a summary of activity by email.">
            <Switch checked={emailOn} onCheckedChange={setEmailOn} />
          </Row>
        </Section>

        {/* Account */}
        <Section title="Account" icon={UserIcon}>
          <Row label="Email" hint="The email associated with your account.">
            <span className="text-sm text-muted-foreground">{user?.email}</span>
          </Row>
          <Row label="Profile" hint="Edit your display name, avatar, skills and more.">
            <Link to="/profile"><Button variant="secondary" size="sm">Edit profile</Button></Link>
          </Row>
        </Section>

        {/* Security */}
        <Section title="Security" icon={KeyRound}>
          <Row label="Change password" hint="Use at least 6 characters.">
            <div className="flex gap-2">
              <Input type="password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="New password" className="w-40" />
              <Button size="sm" onClick={changePassword}>Update</Button>
            </div>
          </Row>
        </Section>

        {/* Danger */}
        <Section title="Danger zone" icon={Trash2}>
          <Row label="Sign out" hint="End your session on this device.">
            <Button variant="secondary" size="sm" onClick={signOut}><LogOut className="mr-1.5 h-3.5 w-3.5" /> Sign out</Button>
          </Row>
          <Row label="Delete account" hint="Permanently delete your account and data.">
            <Button variant="destructive" size="sm" onClick={deleteAccount}>Delete</Button>
          </Row>
        </Section>
      </div>
      <Footer />
    </div>
  );
}

function Section({ title, icon: Icon, children }: { title: string; icon: React.ComponentType<{ className?: string }>; children: React.ReactNode }) {
  return (
    <section className="mt-6 overflow-hidden rounded-2xl border border-border bg-card">
      <header className="flex items-center gap-2 border-b border-border px-5 py-3">
        <Icon className="h-4 w-4 text-primary" />
        <h2 className="font-display text-sm font-semibold uppercase tracking-wider">{title}</h2>
      </header>
      <div className="divide-y divide-border">{children}</div>
    </section>
  );
}

function Row({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 px-5 py-4">
      <div className="min-w-0">
        <Label className="text-sm font-medium">{label}</Label>
        {hint && <div className="text-xs text-muted-foreground">{hint}</div>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}