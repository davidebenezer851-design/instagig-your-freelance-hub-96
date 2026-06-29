import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Bookmark, Clock, DollarSign, MapPin } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/jobs/$id")({
  component: JobDetail,
  notFoundComponent: () => <div className="p-10 text-center">Job not found.</div>,
  errorComponent: ({ error }) => <div className="p-10 text-center text-destructive">{error.message}</div>,
});

function JobDetail() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: job } = useQuery({
    queryKey: ["job", id],
    queryFn: async () => (await supabase.from("jobs").select("*,profiles(id,display_name,location)").eq("id", id).maybeSingle()).data,
  });

  if (!job) return <div className="min-h-screen bg-background"><Navbar /><div className="p-10 text-center text-muted-foreground">Loading…</div></div>;

  async function apply() {
    if (!user) { navigate({ to: "/auth" }); return; }
    const a = user.id < job!.client_id ? user.id : job!.client_id;
    const b = user.id < job!.client_id ? job!.client_id : user.id;
    const existing = await supabase.from("conversations").select("id").eq("user_a", a).eq("user_b", b).maybeSingle();
    let convId = existing.data?.id;
    if (!convId) {
      const inserted = await supabase.from("conversations").insert({ user_a: a, user_b: b }).select("id").single();
      convId = inserted.data?.id;
    }
    navigate({ to: "/messages", search: { c: convId } as never });
  }

  const budget = job.budget_min && job.budget_max ? `$${job.budget_min} – $${job.budget_max}${job.is_hourly ? "/hr" : ""}` : "Negotiable";

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="mx-auto max-w-4xl px-4 py-10 md:px-6">
        <Link to="/jobs" className="text-xs text-muted-foreground hover:text-primary">← Back to jobs</Link>
        <div className="mt-2 flex items-start justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-bold md:text-4xl">{job.title}</h1>
            <div className="mt-3 flex flex-wrap gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1"><Clock className="h-4 w-4" /> {formatDistanceToNow(new Date(job.created_at), { addSuffix: true })}</span>
              <span className="flex items-center gap-1"><DollarSign className="h-4 w-4" /> {budget}</span>
              {job.profiles?.location && <span className="flex items-center gap-1"><MapPin className="h-4 w-4" /> {job.profiles.location}</span>}
              {job.experience_level && <span className="capitalize">{job.experience_level} level</span>}
            </div>
          </div>
          <Button size="icon" variant="secondary"><Bookmark className="h-4 w-4" /></Button>
        </div>

        <div className="mt-8 rounded-2xl border border-border bg-card p-6">
          <h2 className="font-display text-lg font-semibold">Project description</h2>
          <p className="mt-3 whitespace-pre-wrap text-sm text-muted-foreground">{job.description}</p>
          {job.skills && job.skills.length > 0 && (
            <>
              <h3 className="mt-6 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Skills</h3>
              <div className="mt-2 flex flex-wrap gap-2">
                {job.skills.map((s) => <span key={s} className="rounded-full border border-border bg-secondary px-3 py-1 text-xs">{s}</span>)}
              </div>
            </>
          )}
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <Button onClick={apply} className="font-semibold">Submit a proposal</Button>
          <Button onClick={apply} variant="secondary">Message client</Button>
        </div>
      </div>
      <Footer />
    </div>
  );
}
