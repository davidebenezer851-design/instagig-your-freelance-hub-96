import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { GigCard } from "@/components/GigCard";
import { JobCard } from "@/components/JobCard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Bookmark } from "lucide-react";

export const Route = createFileRoute("/_authenticated/saved")({
  head: () => ({ meta: [{ title: "Saved — InstaGIG" }] }),
  component: SavedPage,
});

function SavedPage() {
  const { user } = useAuth();
  const { data: savedGigs } = useQuery({
    queryKey: ["saved-gigs", user?.id],
    queryFn: async () => (await supabase.from("gig_saves").select("gigs(id,title,cover_url,starting_price,rating,reviews_count,tags,profiles(display_name,avatar_url))").eq("user_id", user!.id)).data?.map(r => r.gigs).filter(Boolean) ?? [],
    enabled: !!user,
  });
  const { data: savedJobs } = useQuery({
    queryKey: ["saved-jobs", user?.id],
    queryFn: async () => (await supabase.from("job_saves").select("jobs(id,title,description,budget_min,budget_max,is_hourly,experience_level,skills,created_at,proposals_count,profiles(display_name,location))").eq("user_id", user!.id)).data?.map(r => r.jobs).filter(Boolean) ?? [],
    enabled: !!user,
  });

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="mx-auto max-w-6xl px-4 py-10 md:px-6">
        <h1 className="font-display text-3xl font-bold md:text-4xl">Saved</h1>
        <p className="mt-2 text-sm text-muted-foreground">Your bookmarked gigs and jobs.</p>

        <Tabs defaultValue="gigs" className="mt-8">
          <TabsList>
            <TabsTrigger value="gigs">Gigs ({savedGigs?.length ?? 0})</TabsTrigger>
            <TabsTrigger value="jobs">Jobs ({savedJobs?.length ?? 0})</TabsTrigger>
          </TabsList>
          <TabsContent value="gigs" className="mt-6">
            {savedGigs && savedGigs.length > 0 ? (
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                {savedGigs.map((g) => <GigCard key={g!.id} gig={g as never} />)}
              </div>
            ) : <Empty msg="No saved gigs yet." link="/gigs" label="Browse gigs" />}
          </TabsContent>
          <TabsContent value="jobs" className="mt-6">
            {savedJobs && savedJobs.length > 0 ? (
              <div className="space-y-4">{savedJobs.map((j) => <JobCard key={j!.id} job={j as never} />)}</div>
            ) : <Empty msg="No saved jobs yet." link="/jobs" label="Browse jobs" />}
          </TabsContent>
        </Tabs>
      </div>
      <Footer />
    </div>
  );
}

function Empty({ msg, link, label }: { msg: string; link: string; label: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-border p-12 text-center">
      <Bookmark className="mx-auto h-10 w-10 text-primary" />
      <p className="mt-3 text-sm text-muted-foreground">{msg}</p>
      <Link to={link as never} className="mt-4 inline-block text-sm font-semibold text-primary hover:underline">{label} →</Link>
    </div>
  );
}
