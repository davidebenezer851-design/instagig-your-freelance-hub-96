import { Link } from "@tanstack/react-router";
import { Bookmark, Heart, Star } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useNavigate } from "@tanstack/react-router";

export type GigCardData = {
  id: string;
  title: string;
  cover_url: string | null;
  starting_price: number;
  rating: number | null;
  reviews_count: number | null;
  tags: string[] | null;
  profiles?: { display_name: string | null; avatar_url: string | null } | null;
};

export function GigCard({ gig }: { gig: GigCardData }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: liked } = useQuery({
    queryKey: ["gig-like", gig.id, user?.id],
    queryFn: async () => {
      if (!user) return false;
      const { data } = await supabase.from("gig_likes").select("gig_id").eq("gig_id", gig.id).eq("user_id", user.id).maybeSingle();
      return !!data;
    },
    enabled: !!user,
  });

  const { data: saved } = useQuery({
    queryKey: ["gig-save", gig.id, user?.id],
    queryFn: async () => {
      if (!user) return false;
      const { data } = await supabase.from("gig_saves").select("gig_id").eq("gig_id", gig.id).eq("user_id", user.id).maybeSingle();
      return !!data;
    },
    enabled: !!user,
  });

  const toggleLike = useMutation({
    mutationFn: async () => {
      if (!user) { navigate({ to: "/auth" }); return; }
      if (liked) {
        await supabase.from("gig_likes").delete().eq("gig_id", gig.id).eq("user_id", user.id);
      } else {
        await supabase.from("gig_likes").insert({ gig_id: gig.id, user_id: user.id });
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["gig-like", gig.id] }),
  });

  const toggleSave = useMutation({
    mutationFn: async () => {
      if (!user) { navigate({ to: "/auth" }); return; }
      if (saved) {
        await supabase.from("gig_saves").delete().eq("gig_id", gig.id).eq("user_id", user.id);
        toast("Removed from saved");
      } else {
        await supabase.from("gig_saves").insert({ gig_id: gig.id, user_id: user.id });
        toast("Saved to your collection");
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["gig-save", gig.id] }),
  });

  return (
    <div className="group relative overflow-hidden rounded-xl border border-border bg-card transition hover:border-primary/40 hover:shadow-[var(--shadow-card)]">
      <Link to="/gigs/$id" params={{ id: gig.id }} className="block">
        <div className="relative aspect-video w-full overflow-hidden bg-secondary">
          {gig.cover_url ? (
            <img src={gig.cover_url} alt={gig.title} className="h-full w-full object-cover transition group-hover:scale-105" />
          ) : (
            <div className="flex h-full w-full items-center justify-center grain-bg">
              <span className="font-display text-3xl font-bold text-primary/40">iG</span>
            </div>
          )}
        </div>
      </Link>
      <div className="absolute right-3 top-3 flex gap-1.5">
        <Button
          size="icon" variant="secondary"
          className="h-8 w-8 rounded-full bg-background/80 backdrop-blur"
          onClick={(e) => { e.preventDefault(); toggleLike.mutate(); }}
          aria-label="Like"
        >
          <Heart className={`h-4 w-4 ${liked ? "fill-primary text-primary" : ""}`} />
        </Button>
        <Button
          size="icon" variant="secondary"
          className="h-8 w-8 rounded-full bg-background/80 backdrop-blur"
          onClick={(e) => { e.preventDefault(); toggleSave.mutate(); }}
          aria-label="Save"
        >
          <Bookmark className={`h-4 w-4 ${saved ? "fill-primary text-primary" : ""}`} />
        </Button>
      </div>
      <Link to="/gigs/$id" params={{ id: gig.id }} className="block p-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <div className="grid h-6 w-6 place-items-center rounded-full bg-secondary text-[10px] font-semibold">
            {(gig.profiles?.display_name?.[0] ?? "?").toUpperCase()}
          </div>
          <span className="truncate">{gig.profiles?.display_name ?? "Freelancer"}</span>
        </div>
        <h3 className="mt-2 line-clamp-2 text-sm font-medium leading-snug group-hover:text-primary">{gig.title}</h3>
        <div className="mt-3 flex items-center justify-between">
          <div className="flex items-center gap-1 text-xs">
            <Star className="h-3.5 w-3.5 fill-primary text-primary" />
            <span className="font-semibold">{(gig.rating ?? 0).toFixed(1)}</span>
            <span className="text-muted-foreground">({gig.reviews_count ?? 0})</span>
          </div>
          <div className="text-right">
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground">From</div>
            <div className="font-display text-lg font-bold text-primary">${gig.starting_price}</div>
          </div>
        </div>
      </Link>
    </div>
  );
}
