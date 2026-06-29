import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Bookmark, Briefcase, MessageCircle, Plus, Sparkles } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — InstaGIG" }] }),
  component: Dashboard,
});

function Dashboard() {
  const { user } = useAuth();
  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => user ? (await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle()).data : null,
    enabled: !!user,
  });
  const { data: roles } = useQuery({
    queryKey: ["roles", user?.id],
    queryFn: async () => user ? (await supabase.from("user_roles").select("role").eq("user_id", user.id)).data?.map(r => r.role) ?? [] : [],
    enabled: !!user,
  });
  const isFreelancer = roles?.includes("freelancer");
  const isClient = roles?.includes("client");

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="mx-auto max-w-6xl px-4 py-10 md:px-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="text-xs uppercase tracking-wide text-muted-foreground">Welcome back</div>
            <h1 className="font-display text-3xl font-bold md:text-4xl">{profile?.display_name ?? "there"} 👋</h1>
          </div>
          <div className="flex flex-wrap gap-2">
            {isFreelancer && <Link to="/post-gig"><Button className="font-semibold"><Plus className="mr-1 h-4 w-4" />Post a gig</Button></Link>}
            {isClient && <Link to="/post-job"><Button className="font-semibold"><Plus className="mr-1 h-4 w-4" />Post a job</Button></Link>}
          </div>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <Link to="/messages" className="group rounded-2xl border border-border bg-card p-6 hover:border-primary/40">
            <MessageCircle className="h-6 w-6 text-primary" />
            <h3 className="mt-3 font-display text-lg font-semibold group-hover:text-primary">Messages</h3>
            <p className="mt-1 text-sm text-muted-foreground">Continue conversations.</p>
          </Link>
          <Link to="/saved" className="group rounded-2xl border border-border bg-card p-6 hover:border-primary/40">
            <Bookmark className="h-6 w-6 text-primary" />
            <h3 className="mt-3 font-display text-lg font-semibold group-hover:text-primary">Saved</h3>
            <p className="mt-1 text-sm text-muted-foreground">Gigs and jobs you bookmarked.</p>
          </Link>
          <Link to={isClient ? "/jobs" : "/gigs"} className="group rounded-2xl border border-border bg-card p-6 hover:border-primary/40">
            <Briefcase className="h-6 w-6 text-primary" />
            <h3 className="mt-3 font-display text-lg font-semibold group-hover:text-primary">{isClient ? "Browse talent" : "Find work"}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{isClient ? "Discover gigs from freelancers." : "Latest jobs from clients."}</p>
          </Link>
        </div>

        {!isFreelancer && !isClient && (
          <div className="mt-10 rounded-2xl border border-dashed border-primary/30 bg-primary/5 p-8 text-center">
            <Sparkles className="mx-auto h-8 w-8 text-primary" />
            <h3 className="mt-3 font-display text-xl font-semibold">Pick how you'll use InstaGIG</h3>
            <p className="mt-2 text-sm text-muted-foreground">Add a role to unlock posting.</p>
            <div className="mt-4 flex justify-center gap-2">
              <Button variant="secondary" onClick={async () => { await supabase.from("user_roles").insert({ user_id: user!.id, role: "freelancer" }); location.reload(); }}>I'm a freelancer</Button>
              <Button variant="secondary" onClick={async () => { await supabase.from("user_roles").insert({ user_id: user!.id, role: "client" }); location.reload(); }}>I'm a client</Button>
            </div>
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}
