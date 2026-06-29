import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/post-job")({
  head: () => ({ meta: [{ title: "Post a Job — InstaGIG" }] }),
  component: PostJob,
});

function PostJob() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [min, setMin] = useState("");
  const [max, setMax] = useState("");
  const [isHourly, setIsHourly] = useState(false);
  const [experience, setExperience] = useState("intermediate");
  const [categoryId, setCategoryId] = useState("");
  const [skills, setSkills] = useState("");
  const [loading, setLoading] = useState(false);

  const { data: cats } = useQuery({ queryKey: ["categories"], queryFn: async () => (await supabase.from("categories").select("*").order("name")).data ?? [] });

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="mx-auto max-w-2xl px-4 py-10 md:px-6">
        <h1 className="font-display text-3xl font-bold">Post a job</h1>
        <p className="mt-1 text-sm text-muted-foreground">Tell freelancers what you need.</p>
        <form
          className="mt-8 space-y-5"
          onSubmit={async (e) => {
            e.preventDefault();
            setLoading(true);
            await supabase.from("user_roles").upsert({ user_id: user!.id, role: "client" }, { onConflict: "user_id,role" });
            const { data, error } = await supabase.from("jobs").insert({
              client_id: user!.id, title, description,
              budget_min: min ? parseFloat(min) : null,
              budget_max: max ? parseFloat(max) : null,
              is_hourly: isHourly,
              experience_level: experience,
              category_id: categoryId || null,
              skills: skills.split(",").map(s => s.trim()).filter(Boolean),
            }).select("id").single();
            setLoading(false);
            if (error) return toast.error(error.message);
            toast.success("Job posted!");
            navigate({ to: "/jobs/$id", params: { id: data!.id } });
          }}
        >
          <div className="space-y-2"><Label>Job title</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="Need a Shopify developer to migrate store" /></div>
          <div className="space-y-2"><Label>Description</Label><Textarea rows={6} value={description} onChange={(e) => setDescription(e.target.value)} required /></div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2"><Label>Budget min ($)</Label><Input type="number" value={min} onChange={(e) => setMin(e.target.value)} /></div>
            <div className="space-y-2"><Label>Budget max ($)</Label><Input type="number" value={max} onChange={(e) => setMax(e.target.value)} /></div>
          </div>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={isHourly} onChange={(e) => setIsHourly(e.target.checked)} /> Pay hourly</label>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2"><Label>Experience level</Label>
              <select value={experience} onChange={(e) => setExperience(e.target.value)} className="h-9 w-full rounded-md border border-border bg-input px-3 text-sm">
                <option value="entry">Entry</option><option value="intermediate">Intermediate</option><option value="expert">Expert</option>
              </select>
            </div>
            <div className="space-y-2"><Label>Category</Label>
              <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="h-9 w-full rounded-md border border-border bg-input px-3 text-sm">
                <option value="">Choose…</option>
                {cats?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>
          <div className="space-y-2"><Label>Skills (comma-separated)</Label><Input value={skills} onChange={(e) => setSkills(e.target.value)} placeholder="react, typescript, shopify" /></div>
          <Button type="submit" className="w-full font-semibold" disabled={loading}>{loading ? "Posting…" : "Post job"}</Button>
        </form>
      </div>
      <Footer />
    </div>
  );
}
