import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Bookmark, Clock, Heart, MessageCircle, Star } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export const Route = createFileRoute("/gigs/$id")({
  component: GigDetail,
  notFoundComponent: () => <div className="p-10 text-center">Gig not found.</div>,
  errorComponent: ({ error }) => <div className="p-10 text-center text-destructive">{error.message}</div>,
});

function GigDetail() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: gig, isLoading } = useQuery({
    queryKey: ["gig", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("gigs")
        .select("*,profiles(id,display_name,avatar_url,headline,location),categories(name,slug)")
        .eq("id", id).maybeSingle();
      return data;
    },
  });

  if (isLoading) return <div className="min-h-screen bg-background"><Navbar /><div className="p-10 text-center text-muted-foreground">Loading…</div></div>;
  if (!gig) return <div className="min-h-screen bg-background"><Navbar /><div className="p-10 text-center">Gig not found.</div></div>;

  async function contact() {
    if (!user) { navigate({ to: "/auth" }); return; }
    if (user.id === gig!.freelancer_id) { toast("That's your own gig"); return; }
    const a = user.id < gig!.freelancer_id ? user.id : gig!.freelancer_id;
    const b = user.id < gig!.freelancer_id ? gig!.freelancer_id : user.id;
    const existing = await supabase.from("conversations").select("id").eq("user_a", a).eq("user_b", b).maybeSingle();
    let convId = existing.data?.id;
    if (!convId) {
      const inserted = await supabase.from("conversations").insert({ user_a: a, user_b: b }).select("id").single();
      convId = inserted.data?.id;
    }
    navigate({ to: "/messages", search: { c: convId } as never });
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 md:grid-cols-3 md:px-6">
        <div className="md:col-span-2">
          <Link to="/gigs" className="text-xs text-muted-foreground hover:text-primary">← Back to gigs</Link>
          <h1 className="mt-2 font-display text-3xl font-bold md:text-4xl">{gig.title}</h1>
          <div className="mt-3 flex items-center gap-4 text-sm">
            <Link to="/profile/$id" params={{ id: gig.freelancer_id }} className="flex items-center gap-2 hover:text-primary">
              <div className="grid h-8 w-8 place-items-center rounded-full bg-secondary text-xs font-semibold">
                {(gig.profiles?.display_name?.[0] ?? "?").toUpperCase()}
              </div>
              <span className="font-medium">{gig.profiles?.display_name ?? "Freelancer"}</span>
            </Link>
            <span className="flex items-center gap-1 text-xs"><Star className="h-3.5 w-3.5 fill-primary text-primary" /> {(gig.rating ?? 0).toFixed(1)} ({gig.reviews_count ?? 0})</span>
          </div>

          <div className="mt-6 aspect-video w-full overflow-hidden rounded-2xl border border-border bg-secondary">
            {gig.cover_url ? <img src={gig.cover_url} alt={gig.title} className="h-full w-full object-cover" /> : (
              <div className="grid h-full w-full place-items-center grain-bg">
                <span className="font-display text-6xl font-bold text-primary/40">iG</span>
              </div>
            )}
          </div>

          <h2 className="mt-8 font-display text-xl font-semibold">About this gig</h2>
          <p className="mt-3 whitespace-pre-wrap text-sm text-muted-foreground">{gig.description}</p>

          {gig.tags && gig.tags.length > 0 && (
            <div className="mt-6 flex flex-wrap gap-2">
              {gig.tags.map((t) => <span key={t} className="rounded-full border border-border bg-secondary px-3 py-1 text-xs">{t}</span>)}
            </div>
          )}
        </div>

        <aside className="md:sticky md:top-24 md:self-start">
          <div className="rounded-2xl border border-border bg-card p-6">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">Starting at</div>
            <div className="font-display text-4xl font-bold text-primary">${gig.starting_price}</div>
            <div className="mt-3 flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3.5 w-3.5" /> {gig.delivery_days}-day delivery
            </div>
            <Button className="mt-5 w-full font-semibold" onClick={contact}>
              <MessageCircle className="mr-2 h-4 w-4" /> Contact freelancer
            </Button>
            <Button className="mt-2 w-full" variant="secondary" onClick={contact}>
              Continue (${gig.starting_price})
            </Button>
            <div className="mt-4 flex gap-2">
              <Button variant="ghost" size="sm" className="flex-1"><Heart className="mr-1 h-3.5 w-3.5" /> Like</Button>
              <Button variant="ghost" size="sm" className="flex-1"><Bookmark className="mr-1 h-3.5 w-3.5" /> Save</Button>
            </div>
          </div>
        </aside>
      </div>
      <Footer />
    </div>
  );
}
