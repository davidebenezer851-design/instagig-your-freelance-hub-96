import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bookmark, Briefcase, Calendar, CheckCircle2, Clock, DollarSign, ExternalLink, Heart, MapPin, MessageCircle, Send, Sparkles, Star, Tag } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Comments } from "@/components/Comments";
import { Reviews } from "@/components/Reviews";
import { UserAvatar } from "@/components/UserAvatar";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

type Kind = "gig" | "job";

export function PostPreviewSheet({
  kind, id, open, onOpenChange,
}: {
  kind: Kind;
  id: string | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const table = kind === "gig" ? "gigs" : "jobs";
  const likesT = kind === "gig" ? "gig_likes" : "job_likes";
  const savesT = kind === "gig" ? "gig_saves" : "job_saves";
  const fk = kind === "gig" ? "gig_id" : "job_id";

  const [showProposal, setShowProposal] = useState(false);
  const [bid, setBid] = useState("");
  const [cover, setCover] = useState("");
  const [days, setDays] = useState("7");

  const { data: post } = useQuery({
    queryKey: [kind, id],
    queryFn: async () => {
      if (!id) return null;
      const { data } = await supabase.from(table).select("*,profiles(id,display_name,avatar_url,location,headline,bio,created_at)").eq("id", id).maybeSingle();
      return data;
    },
    enabled: !!id && open,
  });

  const { data: liked } = useQuery({
    queryKey: [`${kind}-like`, id, user?.id],
    queryFn: async () => {
      if (!user || !id) return false;
      const col = fk as "gig_id";
      const { data } = await supabase.from(likesT as "gig_likes").select(col).eq(col, id).eq("user_id", user.id).maybeSingle();
      return !!data;
    },
    enabled: !!user && !!id && open,
  });
  const { data: saved } = useQuery({
    queryKey: [`${kind}-save`, id, user?.id],
    queryFn: async () => {
      if (!user || !id) return false;
      const col = fk as "gig_id";
      const { data } = await supabase.from(savesT as "gig_saves").select(col).eq(col, id).eq("user_id", user.id).maybeSingle();
      return !!data;
    },
    enabled: !!user && !!id && open,
  });

  const { data: myProposal } = useQuery({
    queryKey: ["my-proposal", id, user?.id],
    queryFn: async () => {
      if (!user || !id || kind !== "job") return null;
      const { data } = await supabase.from("proposals").select("*").eq("job_id", id).eq("freelancer_id", user.id).maybeSingle();
      return data;
    },
    enabled: !!user && !!id && open && kind === "job",
  });

  const toggleLike = useMutation({
    mutationFn: async () => {
      if (!user) { navigate({ to: "/auth" }); return; }
      if (!id) return;
      const col = fk as "gig_id";
      if (liked) await supabase.from(likesT as "gig_likes").delete().eq(col, id).eq("user_id", user.id);
      else await supabase.from(likesT as "gig_likes").insert({ [col]: id, user_id: user.id } as never);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: [kind, id] }); qc.invalidateQueries({ queryKey: [`${kind}-like`, id] }); qc.invalidateQueries({ queryKey: [kind + "s"] }); },
  });
  const toggleSave = useMutation({
    mutationFn: async () => {
      if (!user) { navigate({ to: "/auth" }); return; }
      if (!id) return;
      const col = fk as "gig_id";
      if (saved) { await supabase.from(savesT as "gig_saves").delete().eq(col, id).eq("user_id", user.id); toast("Removed from saved"); }
      else { await supabase.from(savesT as "gig_saves").insert({ [col]: id, user_id: user.id } as never); toast.success("Saved"); }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: [kind, id] }); qc.invalidateQueries({ queryKey: [`${kind}-save`, id] }); qc.invalidateQueries({ queryKey: [kind + "s"] }); },
  });

  const submitProposal = useMutation({
    mutationFn: async () => {
      if (!user || !id) throw new Error("Sign in to apply");
      const { error } = await supabase.from("proposals").insert({
        job_id: id,
        freelancer_id: user.id,
        cover_letter: cover,
        bid_amount: parseFloat(bid),
        delivery_days: parseInt(days, 10),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Proposal submitted!");
      setShowProposal(false); setCover(""); setBid(""); setDays("7");
      qc.invalidateQueries({ queryKey: ["my-proposal", id] });
      qc.invalidateQueries({ queryKey: [kind, id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  async function openMessage() {
    if (!post) return;
    if (!user) { navigate({ to: "/auth" }); return; }
    const otherId = (kind === "gig" ? (post as { freelancer_id: string }).freelancer_id : (post as { client_id: string }).client_id);
    if (user.id === otherId) { toast("That's your own post"); return; }
    const a = user.id < otherId ? user.id : otherId;
    const b = user.id < otherId ? otherId : user.id;
    const existing = await supabase.from("conversations").select("id").eq("user_a", a).eq("user_b", b).maybeSingle();
    let convId = existing.data?.id;
    if (!convId) {
      const inserted = await supabase.from("conversations").insert({ user_a: a, user_b: b }).select("id").single();
      convId = inserted.data?.id;
    }
    onOpenChange(false);
    navigate({ to: "/messages", search: { c: convId } as never });
  }

  const p = post as Record<string, unknown> | null | undefined;
  const profiles = (p?.profiles ?? null) as { id: string; display_name: string | null; avatar_url: string | null; location: string | null; headline: string | null; bio: string | null; created_at: string | null } | null;
  const isOwn = !!user && profiles?.id === user.id;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full overflow-y-auto p-0 sm:max-w-[860px] md:max-w-[920px] lg:max-w-[1040px]"
      >
        {!p ? (
          <div className="grid h-full place-items-center p-10 text-sm text-muted-foreground">Loading…</div>
        ) : (
          <div className="flex h-full flex-col">
            {/* Top bar */}
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-background/95 px-6 py-3 backdrop-blur">
              <button onClick={() => onOpenChange(false)} className="text-sm text-muted-foreground hover:text-foreground">← Back to results</button>
              <button
                onClick={() => { onOpenChange(false); navigate({ to: kind === "gig" ? "/gigs/$id" : "/jobs/$id", params: { id: id! } }); }}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
              >
                Open {kind} in a new page <ExternalLink className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Two-column body */}
            <div className="grid flex-1 grid-cols-1 gap-0 md:grid-cols-[1fr_320px]">
              {/* MAIN */}
              <div className="border-b border-border md:border-b-0 md:border-r">
                {kind === "gig" && p.cover_url && (
                  <div className="aspect-[16/8] w-full overflow-hidden bg-secondary">
                    <img src={p.cover_url as string} alt={p.title as string} className="h-full w-full object-cover" />
                  </div>
                )}

                <div className="space-y-6 p-6 md:p-8">
                  <div>
                    <h2 className="font-display text-3xl font-bold leading-tight">{p.title as string}</h2>
                    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <span>Posted {p.created_at ? formatDistanceToNow(new Date(p.created_at as string), { addSuffix: true }) : "recently"}</span>
                      {profiles?.location && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {profiles.location}</span>}
                      {typeof p.rating === "number" && (p.reviews_count as number) > 0 && (
                        <span className="flex items-center gap-1"><Star className="h-3 w-3 fill-primary text-primary" /> {(p.rating as number).toFixed(1)} ({p.reviews_count as number})</span>
                      )}
                    </div>
                  </div>

                  <div className="rounded-xl border border-border bg-card/50 p-5">
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Summary</h3>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-foreground">{p.description as string}</p>
                  </div>

                  {/* Stat strip */}
                  <div className="grid grid-cols-3 gap-3 rounded-xl border border-border bg-card/30 p-4">
                    {kind === "gig" ? (
                      <>
                        <Strip icon={<DollarSign className="h-4 w-4 text-primary" />} label="From" value={`$${p.starting_price}`} />
                        <Strip icon={<Clock className="h-4 w-4 text-primary" />} label="Delivery" value={`${p.delivery_days} days`} />
                        <Strip icon={<Sparkles className="h-4 w-4 text-primary" />} label="Status" value={p.status as string} />
                      </>
                    ) : (
                      <>
                        <Strip icon={<DollarSign className="h-4 w-4 text-primary" />} label={p.is_hourly ? "Hourly" : "Budget"} value={p.budget_min && p.budget_max ? `$${p.budget_min}–$${p.budget_max}` : "Negotiable"} />
                        <Strip icon={<Briefcase className="h-4 w-4 text-primary" />} label="Level" value={(p.experience_level as string) ?? "Any"} />
                        <Strip icon={<Send className="h-4 w-4 text-primary" />} label="Proposals" value={String(p.proposals_count ?? 0)} />
                      </>
                    )}
                  </div>

                  {/* Skills / tags */}
                  {(Array.isArray(p.tags) && (p.tags as string[]).length > 0) || (Array.isArray(p.skills) && (p.skills as string[]).length > 0) ? (
                    <div>
                      <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                        {kind === "gig" ? "Tags" : "Skills & expertise"}
                      </h3>
                      <div className="flex flex-wrap gap-1.5">
                        {((p.tags as string[]) ?? (p.skills as string[]) ?? []).map((t) => (
                          <span key={t} className="inline-flex items-center gap-1 rounded-full border border-border bg-secondary px-3 py-1 text-xs">
                            <Tag className="h-3 w-3" />{t}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {/* Like / Save */}
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" className="group" onClick={() => toggleLike.mutate()}>
                      <Heart className={`mr-1.5 h-4 w-4 transition-all duration-300 group-active:scale-125 ${liked ? "fill-primary text-primary animate-heart-pop" : ""}`} />
                      {(p.likes_count as number) ?? 0}
                    </Button>
                    <Button variant="outline" size="sm" className="group" onClick={() => toggleSave.mutate()}>
                      <Bookmark className={`mr-1.5 h-4 w-4 transition-all duration-300 group-active:scale-125 ${saved ? "fill-primary text-primary animate-heart-pop" : ""}`} />
                      {(p.saves_count as number) ?? 0}
                    </Button>
                  </div>

                  {/* Reviews */}
                  {profiles?.id && (
                    <div className="border-t border-border pt-6">
                      <Reviews
                        subjectId={profiles.id}
                        gigId={kind === "gig" ? id! : undefined}
                        jobId={kind === "job" ? id! : undefined}
                        title="Ratings & reviews"
                      />
                    </div>
                  )}

                  {/* Comments */}
                  <div className="border-t border-border pt-6">
                    <Comments gigId={kind === "gig" ? id! : undefined} jobId={kind === "job" ? id! : undefined} />
                  </div>
                </div>
              </div>

              {/* RIGHT RAIL */}
              <aside className="space-y-5 bg-card/30 p-5 md:p-6">
                {/* Action card */}
                <div className="rounded-xl border border-border bg-background p-4">
                  {kind === "job" ? (
                    <>
                      {isOwn ? (
                        <p className="text-sm text-muted-foreground">This is your job post. View incoming proposals on the full page.</p>
                      ) : myProposal ? (
                        <div className="rounded-lg border border-primary/40 bg-primary/5 p-3 text-sm">
                          <div className="flex items-center gap-1.5 font-semibold text-primary">
                            <CheckCircle2 className="h-4 w-4" /> Proposal submitted
                          </div>
                          <div className="mt-1 text-xs text-muted-foreground">
                            ${myProposal.bid_amount} · {myProposal.delivery_days}d · status: {myProposal.status}
                          </div>
                        </div>
                      ) : showProposal ? (
                        <form
                          onSubmit={(e) => { e.preventDefault(); submitProposal.mutate(); }}
                          className="space-y-3"
                        >
                          <div className="space-y-1">
                            <Label className="text-xs">Your bid ($)</Label>
                            <Input type="number" min="1" required value={bid} onChange={(e) => setBid(e.target.value)} />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Delivery (days)</Label>
                            <Input type="number" min="1" required value={days} onChange={(e) => setDays(e.target.value)} />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Cover letter</Label>
                            <Textarea rows={5} required value={cover} onChange={(e) => setCover(e.target.value)} placeholder="Why are you a great fit?" />
                          </div>
                          <div className="flex gap-2">
                            <Button type="submit" className="flex-1 font-semibold" disabled={submitProposal.isPending}>
                              {submitProposal.isPending ? "Sending…" : "Submit proposal"}
                            </Button>
                            <Button type="button" variant="ghost" onClick={() => setShowProposal(false)}>Cancel</Button>
                          </div>
                        </form>
                      ) : (
                        <Button className="w-full font-semibold" onClick={() => user ? setShowProposal(true) : navigate({ to: "/auth" })}>
                          <Send className="mr-2 h-4 w-4" /> Submit a proposal
                        </Button>
                      )}
                      <Button variant="outline" className="mt-2 w-full" onClick={() => toggleSave.mutate()}>
                        <Bookmark className={`mr-2 h-4 w-4 ${saved ? "fill-primary text-primary" : ""}`} />
                        {saved ? "Saved" : "Save job"}
                      </Button>
                    </>
                  ) : (
                    <>
                      {isOwn ? (
                        <p className="text-sm text-muted-foreground">This is your gig. Share it to bring in more orders.</p>
                      ) : (
                        <Button className="w-full font-semibold" onClick={openMessage}>
                          <MessageCircle className="mr-2 h-4 w-4" /> Contact freelancer
                        </Button>
                      )}
                      <Button variant="outline" className="mt-2 w-full" onClick={() => toggleSave.mutate()}>
                        <Bookmark className={`mr-2 h-4 w-4 ${saved ? "fill-primary text-primary" : ""}`} />
                        {saved ? "Saved" : "Save gig"}
                      </Button>
                    </>
                  )}
                </div>

                {/* About the poster */}
                <div className="rounded-xl border border-border bg-background p-4">
                  <h3 className="text-sm font-semibold">About the {kind === "gig" ? "freelancer" : "client"}</h3>
                  <div className="mt-3 flex items-center gap-3">
                    <UserAvatar userId={profiles?.id} name={profiles?.display_name} avatarUrl={profiles?.avatar_url} size={44} />
                    <div className="min-w-0">
                      <div className="truncate font-medium">{profiles?.display_name ?? "Unknown"}</div>
                      {profiles?.headline && <div className="truncate text-xs text-muted-foreground">{profiles.headline}</div>}
                    </div>
                  </div>
                  <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
                    {profiles?.location && (
                      <li className="flex items-center gap-2"><MapPin className="h-3.5 w-3.5" /> {profiles.location}</li>
                    )}
                    {profiles?.created_at && (
                      <li className="flex items-center gap-2"><Calendar className="h-3.5 w-3.5" /> Member since {new Date(profiles.created_at).toLocaleDateString(undefined, { month: "short", year: "numeric" })}</li>
                    )}
                    {kind === "job" && (
                      <li className="flex items-center gap-2"><Send className="h-3.5 w-3.5" /> {(p.proposals_count as number) ?? 0} proposals on this job</li>
                    )}
                  </ul>
                  {!isOwn && kind === "job" && (
                    <Button variant="ghost" className="mt-3 w-full" onClick={openMessage}>
                      <MessageCircle className="mr-2 h-4 w-4" /> Message client
                    </Button>
                  )}
                </div>

                {/* Share / link */}
                <div className="rounded-xl border border-border bg-background p-4">
                  <h3 className="text-sm font-semibold">{kind === "gig" ? "Gig" : "Job"} link</h3>
                  <div className="mt-2 truncate rounded-md border border-border bg-secondary px-2 py-1.5 text-xs text-muted-foreground">
                    {typeof window !== "undefined" ? `${window.location.origin}/${kind}s/${id}` : ""}
                  </div>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(`${window.location.origin}/${kind}s/${id}`);
                      toast.success("Link copied");
                    }}
                    className="mt-2 text-xs font-medium text-primary hover:underline"
                  >
                    Copy link
                  </button>
                </div>
              </aside>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

function Strip({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2">
      <div className="mt-0.5">{icon}</div>
      <div className="min-w-0">
        <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
        <div className="truncate font-display text-sm font-semibold">{value}</div>
      </div>
    </div>
  );
}
