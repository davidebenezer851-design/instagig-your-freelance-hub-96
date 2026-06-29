import { useState } from "react";
import { Bookmark, Heart, Star } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useNavigate } from "@tanstack/react-router";
import { PostPreviewSheet } from "@/components/PostPreviewSheet";
import { UserAvatar } from "@/components/UserAvatar";

export type GigCardData = {
  id: string;
  title: string;
  cover_url: string | null;
  starting_price: number;
  rating: number | null;
  reviews_count: number | null;
  tags: string[] | null;
  likes_count?: number | null;
  saves_count?: number | null;
  freelancer_id?: string;
  profiles?: { id?: string; display_name: string | null; avatar_url: string | null } | null;
};

export function GigCard({ gig }: { gig: GigCardData }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

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
      if (liked) await supabase.from("gig_likes").delete().eq("gig_id", gig.id).eq("user_id", user.id);
      else await supabase.from("gig_likes").insert({ gig_id: gig.id, user_id: user.id });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["gig-like", gig.id] }); qc.invalidateQueries({ queryKey: ["gigs"] }); qc.invalidateQueries({ queryKey: ["featured-gigs"] }); },
  });
  const toggleSave = useMutation({
    mutationFn: async () => {
      if (!user) { navigate({ to: "/auth" }); return; }
      if (saved) { await supabase.from("gig_saves").delete().eq("gig_id", gig.id).eq("user_id", user.id); toast("Removed from saved"); }
      else { await supabase.from("gig_saves").insert({ gig_id: gig.id, user_id: user.id }); toast("Saved to your collection"); }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["gig-save", gig.id] }); qc.invalidateQueries({ queryKey: ["gigs"] }); qc.invalidateQueries({ queryKey: ["featured-gigs"] }); },
  });

  return (
    <>
      <div
        role="button" tabIndex={0}
        onClick={() => setOpen(true)}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setOpen(true); } }}
        className="group relative cursor-pointer overflow-hidden rounded-xl border border-border bg-card transition hover:border-primary/40 hover:shadow-[var(--shadow-card)]"
      >
        <div className="relative aspect-video w-full overflow-hidden bg-secondary">
          {gig.cover_url ? (
            <img src={gig.cover_url} alt={gig.title} className="h-full w-full object-cover transition group-hover:scale-105" />
          ) : (
            <div className="flex h-full w-full items-center justify-center grain-bg">
              <span className="font-display text-3xl font-bold text-primary/40">iG</span>
            </div>
          )}
        </div>
        <div className="absolute right-3 top-3 flex gap-1.5">
          <Button
            size="icon" variant="secondary"
            className="h-8 w-8 rounded-full bg-background/80 backdrop-blur transition-transform active:scale-90"
            onClick={(e) => { e.stopPropagation(); toggleLike.mutate(); }}
            aria-label="Like"
          >
            <Heart className={`h-4 w-4 transition ${liked ? "fill-primary text-primary animate-heart-pop" : ""}`} />
          </Button>
          <Button
            size="icon" variant="secondary"
            className="h-8 w-8 rounded-full bg-background/80 backdrop-blur transition-transform active:scale-90"
            onClick={(e) => { e.stopPropagation(); toggleSave.mutate(); }}
            aria-label="Save"
          >
            <Bookmark className={`h-4 w-4 transition ${saved ? "fill-primary text-primary animate-heart-pop" : ""}`} />
          </Button>
        </div>
        <div className="p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <UserAvatar userId={gig.profiles?.id ?? gig.freelancer_id} name={gig.profiles?.display_name} avatarUrl={gig.profiles?.avatar_url} size={24} />
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
          <div className="mt-2 flex items-center gap-3 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1"><Heart className="h-3 w-3" /> {gig.likes_count ?? 0}</span>
            <span className="flex items-center gap-1"><Bookmark className="h-3 w-3" /> {gig.saves_count ?? 0}</span>
          </div>
        </div>
      </div>
      <PostPreviewSheet kind="gig" id={open ? gig.id : null} open={open} onOpenChange={setOpen} />
    </>
  );
}
