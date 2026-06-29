import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

type ReviewsProps = {
  subjectId: string;
  gigId?: string;
  jobId?: string;
  title?: string;
};

export function Reviews({ subjectId, gigId, jobId, title = "Reviews" }: ReviewsProps) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const key = ["reviews", subjectId, gigId ?? null, jobId ?? null];

  const { data: reviews } = useQuery({
    queryKey: key,
    queryFn: async () => {
      let q = supabase
        .from("reviews")
        .select("id,author_id,rating,comment,created_at")
        .eq("subject_id", subjectId)
        .order("created_at", { ascending: false });
      if (gigId) q = q.eq("gig_id", gigId);
      if (jobId) q = q.eq("job_id", jobId);
      const { data } = await q;
      const rows = data ?? [];
      const ids = Array.from(new Set(rows.map((r) => r.author_id)));
      if (ids.length === 0) return [];
      const { data: profiles } = await supabase
        .from("profiles").select("id,display_name,avatar_url").in("id", ids);
      const byId = new Map((profiles ?? []).map((p) => [p.id, p]));
      return rows.map((r) => ({ ...r, author: byId.get(r.author_id) ?? null }));
    },
  });

  const myReview = reviews?.find((r) => r.author_id === user?.id);

  const [rating, setRating] = useState(myReview?.rating ?? 5);
  const [comment, setComment] = useState(myReview?.comment ?? "");
  const [hover, setHover] = useState(0);

  const submit = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Sign in to leave a review");
      if (user.id === subjectId) throw new Error("You can't review yourself");
      const { error } = await supabase.from("reviews").upsert({
        author_id: user.id, subject_id: subjectId,
        gig_id: gigId ?? null, job_id: jobId ?? null,
        rating, comment: comment.trim() || null,
      }, { onConflict: "author_id,subject_id,gig_id,job_id" });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Review posted"); qc.invalidateQueries({ queryKey: key }); qc.invalidateQueries({ queryKey: ["gig"] }); qc.invalidateQueries({ queryKey: ["profile"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const avg = reviews && reviews.length > 0
    ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;

  const canReview = user && user.id !== subjectId;

  return (
    <div className="space-y-5">
      <div className="flex items-baseline justify-between">
        <h2 className="font-display text-xl font-semibold">{title}</h2>
        <div className="flex items-center gap-1 text-sm">
          <Star className="h-4 w-4 fill-primary text-primary" />
          <span className="font-semibold">{avg.toFixed(1)}</span>
          <span className="text-muted-foreground">({reviews?.length ?? 0})</span>
        </div>
      </div>

      {canReview && (
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="text-sm font-medium">{myReview ? "Update your review" : "Leave a review"}</div>
          <div className="mt-2 flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} type="button" onMouseEnter={() => setHover(n)} onMouseLeave={() => setHover(0)} onClick={() => setRating(n)} aria-label={`${n} stars`}>
                <Star className={`h-6 w-6 transition ${(hover || rating) >= n ? "fill-primary text-primary" : "text-muted-foreground"}`} />
              </button>
            ))}
          </div>
          <Textarea
            rows={3} value={comment} onChange={(e) => setComment(e.target.value)}
            placeholder="Share how it went…" className="mt-3"
          />
          <Button onClick={() => submit.mutate()} disabled={submit.isPending} className="mt-3 font-semibold">
            {submit.isPending ? "Saving…" : myReview ? "Update review" : "Post review"}
          </Button>
        </div>
      )}

      <div className="space-y-3">
        {reviews && reviews.length > 0 ? reviews.map((r) => (
          <div key={r.id} className="rounded-xl border border-border bg-card/60 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="grid h-8 w-8 place-items-center rounded-full bg-secondary text-xs font-semibold">
                  {(r.author?.display_name?.[0] ?? "?").toUpperCase()}
                </div>
                <div>
                  <div className="text-sm font-medium">{r.author?.display_name ?? "User"}</div>
                  <div className="text-[10px] text-muted-foreground">{formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}</div>
                </div>
              </div>
              <div className="flex">
                {[1,2,3,4,5].map((n) => (
                  <Star key={n} className={`h-3.5 w-3.5 ${r.rating >= n ? "fill-primary text-primary" : "text-muted-foreground/40"}`} />
                ))}
              </div>
            </div>
            {r.comment && <p className="mt-2 text-sm text-muted-foreground">{r.comment}</p>}
          </div>
        )) : (
          <p className="text-sm text-muted-foreground">No reviews yet. Be the first to leave one.</p>
        )}
      </div>
    </div>
  );
}