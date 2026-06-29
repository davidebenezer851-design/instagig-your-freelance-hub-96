import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { JobCard } from "@/components/JobCard";
import { Button } from "@/components/ui/button";
import { Briefcase, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";

const searchSchema = z.object({ q: z.string().optional() });

export const Route = createFileRoute("/jobs")({
  validateSearch: searchSchema,
  head: () => ({ meta: [{ title: "Find Jobs — InstaGIG" }] }),
  component: BrowseJobs,
});

function BrowseJobs() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const [q, setQ] = useState(search.q ?? "");

  const { data: jobs, isLoading } = useQuery({
    queryKey: ["jobs", search.q],
    queryFn: async () => {
      let query = supabase
        .from("jobs")
        .select("id,title,description,budget_min,budget_max,is_hourly,experience_level,skills,created_at,proposals_count,profiles(display_name,location)")
        .eq("status", "open")
        .order("created_at", { ascending: false });
      if (search.q) query = query.ilike("title", `%${search.q}%`);
      const { data } = await query.limit(40);
      return data ?? [];
    },
  });

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <section className="border-b border-border/60 bg-card/40">
        <div className="mx-auto max-w-7xl px-4 py-10 md:px-6">
          <h1 className="font-display text-4xl font-bold">Find <span className="text-primary">work</span></h1>
          <p className="mt-2 text-muted-foreground">Real jobs from real clients, posted in real time.</p>
          <form
            onSubmit={(e) => { e.preventDefault(); navigate({ search: { q: q || undefined } }); }}
            className="mt-6 flex max-w-2xl items-center gap-2 rounded-full border border-border bg-background p-1.5"
          >
            <Search className="ml-3 h-4 w-4 text-muted-foreground" />
            <input value={q} onChange={(e) => setQ(e.target.value)} className="flex-1 bg-transparent px-2 py-2 text-sm outline-none placeholder:text-muted-foreground" placeholder="Search jobs…" />
            <Button type="submit" className="rounded-full">Search</Button>
          </form>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-10 md:px-6">
        {isLoading ? (
          <div className="space-y-4">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-36 animate-pulse rounded-xl bg-card" />)}</div>
        ) : jobs && jobs.length > 0 ? (
          <div className="space-y-4">{jobs.map((j) => <JobCard key={j.id} job={j as never} />)}</div>
        ) : (
          <div className="rounded-2xl border border-dashed border-border p-12 text-center">
            <Briefcase className="mx-auto h-10 w-10 text-primary" />
            <h3 className="mt-4 font-display text-xl font-semibold">No jobs yet</h3>
            <p className="mt-2 text-sm text-muted-foreground">Be one of the first clients to post a job.</p>
          </div>
        )}
      </section>
      <Footer />
    </div>
  );
}
