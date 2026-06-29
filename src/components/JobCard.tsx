import { Link, useNavigate } from "@tanstack/react-router";
import { Bookmark, Clock, DollarSign, MapPin } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

export type JobCardData = {
  id: string;
  title: string;
  description: string;
  budget_min: number | null;
  budget_max: number | null;
  is_hourly: boolean | null;
  experience_level: string | null;
  skills: string[] | null;
  created_at: string;
  proposals_count: number | null;
  profiles?: { display_name: string | null; location: string | null } | null;
};

export function JobCard({ job }: { job: JobCardData }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: saved } = useQuery({
    queryKey: ["job-save", job.id, user?.id],
    queryFn: async () => {
      if (!user) return false;
      const { data } = await supabase.from("job_saves").select("job_id").eq("job_id", job.id).eq("user_id", user.id).maybeSingle();
      return !!data;
    },
    enabled: !!user,
  });

  const toggleSave = useMutation({
    mutationFn: async () => {
      if (!user) { navigate({ to: "/auth" }); return; }
      if (saved) {
        await supabase.from("job_saves").delete().eq("job_id", job.id).eq("user_id", user.id);
        toast("Job removed from saved");
      } else {
        await supabase.from("job_saves").insert({ job_id: job.id, user_id: user.id });
        toast("Job saved");
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["job-save", job.id] }),
  });

  const budget = job.budget_min && job.budget_max
    ? `$${job.budget_min}–$${job.budget_max}${job.is_hourly ? "/hr" : ""}`
    : job.budget_max ? `Up to $${job.budget_max}` : "Negotiable";

  return (
    <div className="group rounded-xl border border-border bg-card p-5 transition hover:border-primary/40">
      <div className="flex items-start justify-between gap-3">
        <Link to="/jobs/$id" params={{ id: job.id }} className="flex-1">
          <h3 className="font-display text-lg font-semibold leading-tight group-hover:text-primary">{job.title}</h3>
          <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {formatDistanceToNow(new Date(job.created_at), { addSuffix: true })}</span>
            <span className="flex items-center gap-1"><DollarSign className="h-3 w-3" /> {budget}</span>
            {job.experience_level && <span className="capitalize">{job.experience_level}</span>}
            {job.profiles?.location && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {job.profiles.location}</span>}
          </div>
        </Link>
        <Button size="icon" variant="ghost" onClick={() => toggleSave.mutate()} aria-label="Save job">
          <Bookmark className={`h-4 w-4 ${saved ? "fill-primary text-primary" : ""}`} />
        </Button>
      </div>
      <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">{job.description}</p>
      {job.skills && job.skills.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {job.skills.slice(0, 5).map((s) => (
            <span key={s} className="rounded-full border border-border bg-secondary px-2.5 py-0.5 text-xs">{s}</span>
          ))}
        </div>
      )}
      <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
        <span>{job.proposals_count ?? 0} proposals</span>
        <Link to="/jobs/$id" params={{ id: job.id }} className="font-semibold text-primary hover:underline">View details →</Link>
      </div>
    </div>
  );
}
