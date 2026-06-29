import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { GigCard } from "@/components/GigCard";
import { MapPin } from "lucide-react";

export const Route = createFileRoute("/profile/$id")({
  component: ProfilePage,
});

function ProfilePage() {
  const { id } = Route.useParams();
  const { data: profile } = useQuery({
    queryKey: ["profile-page", id],
    queryFn: async () => (await supabase.from("profiles").select("*").eq("id", id).maybeSingle()).data,
  });
  const { data: gigs } = useQuery({
    queryKey: ["profile-gigs", id],
    queryFn: async () => (await supabase.from("gigs").select("id,title,cover_url,starting_price,rating,reviews_count,tags,profiles(display_name,avatar_url)").eq("freelancer_id", id).eq("status", "active")).data ?? [],
  });

  if (!profile) return <div className="min-h-screen bg-background"><Navbar /><div className="p-10 text-center text-muted-foreground">Loading…</div></div>;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="mx-auto max-w-5xl px-4 py-10 md:px-6">
        <div className="flex flex-wrap items-center gap-6">
          <div className="grid h-24 w-24 place-items-center rounded-full bg-primary text-primary-foreground font-display text-3xl font-bold">
            {(profile.display_name?.[0] ?? "?").toUpperCase()}
          </div>
          <div>
            <h1 className="font-display text-3xl font-bold">{profile.display_name}</h1>
            {profile.headline && <p className="mt-1 text-muted-foreground">{profile.headline}</p>}
            {profile.location && <div className="mt-1 flex items-center gap-1 text-sm text-muted-foreground"><MapPin className="h-3.5 w-3.5" /> {profile.location}</div>}
          </div>
        </div>
        {profile.bio && (
          <div className="mt-8 rounded-2xl border border-border bg-card p-6">
            <h2 className="font-display text-lg font-semibold">About</h2>
            <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{profile.bio}</p>
          </div>
        )}
        <h2 className="mt-10 font-display text-xl font-semibold">Active gigs</h2>
        {gigs && gigs.length > 0 ? (
          <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {gigs.map((g) => <GigCard key={g.id} gig={g as never} />)}
          </div>
        ) : <p className="mt-4 text-sm text-muted-foreground">No active gigs.</p>}
      </div>
      <Footer />
    </div>
  );
}
