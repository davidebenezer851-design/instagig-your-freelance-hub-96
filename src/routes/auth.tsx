import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Briefcase, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

const searchSchema = z.object({
  tab: z.enum(["signin", "signup"]).optional(),
  role: z.enum(["freelancer", "client"]).optional(),
  redirect: z.string().optional(),
});

export const Route = createFileRoute("/auth")({
  validateSearch: searchSchema,
  head: () => ({ meta: [{ title: "Sign in — InstaGIG" }] }),
  component: AuthPage,
});

function AuthPage() {
  const { tab = "signin", role: initialRole, redirect = "/dashboard" } = Route.useSearch();
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    if (user) navigate({ to: redirect as never, replace: true });
  }, [user, navigate, redirect]);

  return (
    <div className="grid min-h-screen md:grid-cols-2">
      <div className="relative hidden flex-col justify-between overflow-hidden bg-card p-10 md:flex">
        <div className="absolute inset-0 grain-bg" />
        <Link to="/" className="relative flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary text-primary-foreground font-display font-bold">iG</div>
          <span className="font-display text-xl font-bold">Insta<span className="text-primary">GIG</span></span>
        </Link>
        <div className="relative">
          <h2 className="font-display text-4xl font-bold leading-tight">
            Where talent meets <span className="text-primary text-glow">opportunity</span>.
          </h2>
          <p className="mt-4 max-w-md text-muted-foreground">
            Join thousands of freelancers and clients shipping work every day on InstaGIG.
          </p>
          <div className="mt-8 grid grid-cols-2 gap-4">
            <div className="rounded-xl border border-border bg-background/40 p-4">
              <div className="text-3xl font-display font-bold text-primary">0%</div>
              <div className="text-xs text-muted-foreground">Sign-up fees</div>
            </div>
            <div className="rounded-xl border border-border bg-background/40 p-4">
              <div className="text-3xl font-display font-bold text-primary">24/7</div>
              <div className="text-xs text-muted-foreground">Live messaging</div>
            </div>
          </div>
        </div>
        <div className="relative text-xs text-muted-foreground">© InstaGIG</div>
      </div>

      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <Link to="/" className="mb-6 inline-flex items-center gap-2 md:hidden">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground font-display font-bold">iG</div>
            <span className="font-display text-lg font-bold">Insta<span className="text-primary">GIG</span></span>
          </Link>

          <Tabs defaultValue={tab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Sign in</TabsTrigger>
              <TabsTrigger value="signup">Create account</TabsTrigger>
            </TabsList>
            <TabsContent value="signin"><SignInForm /></TabsContent>
            <TabsContent value="signup"><SignUpForm initialRole={initialRole} /></TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}

function GoogleButton() {
  const [loading, setLoading] = useState(false);
  return (
    <Button
      type="button"
      variant="secondary"
      className="w-full"
      disabled={loading}
      onClick={async () => {
        setLoading(true);
        const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
        if (result.error) {
          toast.error(result.error.message);
          setLoading(false);
        }
      }}
    >
      <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24"><path fill="currentColor" d="M21.35 11.1h-9.17v2.73h6.51c-.33 3.81-3.5 5.44-6.5 5.44C8.36 19.27 5 16.25 5 12c0-4.1 3.2-7.27 7.2-7.27c3.09 0 4.9 1.97 4.9 1.97L19 4.72S16.56 2 12.1 2C6.42 2 2.03 6.8 2.03 12c0 5.05 4.13 10 10.22 10c5.35 0 9.25-3.67 9.25-9.09c0-1.15-.15-1.81-.15-1.81Z"/></svg>
      Continue with Google
    </Button>
  );
}

function SignInForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  return (
    <form
      className="mt-6 space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        setLoading(true);
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        setLoading(false);
        if (error) toast.error(error.message);
        else toast.success("Welcome back!");
      }}
    >
      <GoogleButton />
      <div className="relative my-2 text-center text-xs text-muted-foreground">
        <span className="bg-background px-2 relative z-10">or with email</span>
        <div className="absolute inset-x-0 top-1/2 -z-0 h-px bg-border" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
      </div>
      <Button type="submit" className="w-full font-semibold" disabled={loading}>
        {loading ? "Signing in..." : "Sign in"}
      </Button>
    </form>
  );
}

function SignUpForm({ initialRole }: { initialRole?: "freelancer" | "client" }) {
  const [role, setRole] = useState<"freelancer" | "client">(initialRole ?? "freelancer");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  return (
    <form
      className="mt-6 space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        setLoading(true);
        const { error } = await supabase.auth.signUp({
          email, password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { display_name: name, role },
          },
        });
        setLoading(false);
        if (error) toast.error(error.message);
        else toast.success("Account created! Check your inbox to confirm.");
      }}
    >
      <div>
        <Label className="mb-2 block">I'm joining as a…</Label>
        <div className="grid grid-cols-2 gap-2">
          {([
            { v: "freelancer", label: "Freelancer", icon: Sparkles, sub: "Sell my skills" },
            { v: "client", label: "Client", icon: Briefcase, sub: "Hire talent" },
          ] as const).map((opt) => (
            <button
              key={opt.v} type="button" onClick={() => setRole(opt.v)}
              className={`rounded-xl border p-3 text-left transition ${role === opt.v ? "border-primary bg-primary/10" : "border-border hover:border-primary/40"}`}
            >
              <opt.icon className={`h-4 w-4 ${role === opt.v ? "text-primary" : "text-muted-foreground"}`} />
              <div className="mt-2 text-sm font-semibold">{opt.label}</div>
              <div className="text-xs text-muted-foreground">{opt.sub}</div>
            </button>
          ))}
        </div>
      </div>
      <GoogleButton />
      <div className="relative my-2 text-center text-xs text-muted-foreground">
        <span className="bg-background px-2 relative z-10">or with email</span>
        <div className="absolute inset-x-0 top-1/2 -z-0 h-px bg-border" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="name">Full name</Label>
        <Input id="name" required value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="su-email">Email</Label>
        <Input id="su-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="su-password">Password</Label>
        <Input id="su-password" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
      </div>
      <Button type="submit" className="w-full font-semibold" disabled={loading}>
        {loading ? "Creating..." : "Create account"}
      </Button>
      <p className="text-center text-xs text-muted-foreground">
        By signing up you agree to InstaGIG's Terms & Privacy.
      </p>
    </form>
  );
}
