import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { UserAvatar } from "@/components/UserAvatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Camera, Loader2, Plus, X } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({ meta: [{ title: "My Profile — InstaGIG" }] }),
  component: ProfileEdit,
});

function ProfileEdit() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [displayName, setDisplayName] = useState("");
  const [headline, setHeadline] = useState("");
  const [bio, setBio] = useState("");
  const [location, setLocation] = useState("");
  const [hourlyRate, setHourlyRate] = useState<number | "">("");
  const [skills, setSkills] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  const { data: profile } = useQuery({
    queryKey: ["my-profile", user?.id],
    enabled: !!user,
    queryFn: async () => (await supabase.from("profiles").select("*").eq("id", user!.id).maybeSingle()).data,
  });

  useEffect(() => {
    if (!profile) return;
    setDisplayName(profile.display_name ?? "");
    setHeadline(profile.headline ?? "");
    setBio(profile.bio ?? "");
    setLocation(profile.location ?? "");
    setHourlyRate(profile.hourly_rate ?? "");
    setSkills(profile.skills ?? []);
    setAvatarUrl(profile.avatar_url ?? null);
  }, [profile]);

  async function handleAvatar(file: File) {
    if (!user) return;
    setUploading(true);
    try {
      const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
      const path = `${user.id}/avatar/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from("post-attachments").upload(path, file, { contentType: file.type, upsert: true });
      if (error) throw error;
      // Bucket is private in this workspace — use a long-lived signed URL so the image loads for everyone.
      const { data: signed, error: signErr } = await supabase.storage
        .from("post-attachments")
        .createSignedUrl(path, 60 * 60 * 24 * 365 * 5);
      if (signErr) throw signErr;
      const url = signed?.signedUrl ?? null;
      setAvatarUrl(url);
      const { data: saved, error: upErr } = await supabase.from("profiles").upsert({ id: user.id, email: user.email, avatar_url: url }, { onConflict: "id" }).select("*").single();
      if (upErr) throw upErr;
      if (saved) qc.setQueryData(["my-profile", user.id], saved);
      qc.invalidateQueries({ queryKey: ["my-profile", user.id] });
      qc.invalidateQueries({ queryKey: ["avatar-profile", user.id] });
      window.dispatchEvent(new CustomEvent("instagig:avatar-updated", { detail: { userId: user.id, avatarUrl: url } }));
      toast.success("Profile photo updated");
    } catch (e) {
      toast.error((e as Error).message || "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function save() {
    if (!user) return;
    setSaving(true);
    const { data: saved, error } = await supabase.from("profiles").upsert({
      id: user.id,
      email: user.email,
      display_name: displayName,
      headline, bio, location,
      hourly_rate: hourlyRate === "" ? null : Number(hourlyRate),
      skills,
      avatar_url: avatarUrl,
    }, { onConflict: "id" }).select("*").single();
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    if (saved) qc.setQueryData(["my-profile", user.id], saved);
    qc.invalidateQueries({ queryKey: ["my-profile", user.id] });
    qc.invalidateQueries({ queryKey: ["avatar-profile", user.id] });
    window.dispatchEvent(new CustomEvent("instagig:avatar-updated", { detail: { userId: user.id, avatarUrl } }));
    toast.success("Profile updated");
  }

  function addSkill() {
    const s = skillInput.trim();
    if (!s || skills.includes(s)) return;
    setSkills([...skills, s]);
    setSkillInput("");
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="mx-auto max-w-3xl px-4 py-10 md:px-6">
        <h1 className="font-display text-3xl font-bold">Edit profile</h1>
        <p className="mt-1 text-sm text-muted-foreground">A complete profile gets you noticed faster.</p>

        <div className="mt-8 rounded-2xl border border-border bg-card p-6">
          <div className="flex items-center gap-5">
            <div className="relative">
              <UserAvatar userId={user?.id} name={displayName} avatarUrl={avatarUrl} size={96} className="text-primary" />
              <button
                onClick={() => fileRef.current?.click()}
                className="absolute -bottom-1 -right-1 grid h-9 w-9 place-items-center rounded-full bg-primary text-primary-foreground shadow-lg hover:opacity-90"
                aria-label="Change avatar"
              >
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
              </button>
              <input
                ref={fileRef} type="file" accept="image/*" className="hidden"
                onChange={(e) => e.target.files?.[0] && handleAvatar(e.target.files[0])}
              />
            </div>
            <div>
              <div className="font-display text-xl font-semibold">{displayName || "Your name"}</div>
              <div className="text-sm text-muted-foreground">{headline || "Add a headline below"}</div>
            </div>
          </div>

          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2"><Label>Full name</Label><Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} /></div>
            <div className="space-y-2 sm:col-span-2"><Label>Headline</Label><Input placeholder="e.g. Senior React Developer" value={headline} onChange={(e) => setHeadline(e.target.value)} /></div>
            <div className="space-y-2 sm:col-span-2"><Label>Bio</Label><Textarea rows={4} placeholder="Tell clients about your experience..." value={bio} onChange={(e) => setBio(e.target.value)} /></div>
            <div className="space-y-2"><Label>Location</Label><Input placeholder="City, Country" value={location} onChange={(e) => setLocation(e.target.value)} /></div>
            <div className="space-y-2"><Label>Hourly rate (USD)</Label><Input type="number" min={0} value={hourlyRate} onChange={(e) => setHourlyRate(e.target.value === "" ? "" : Number(e.target.value))} /></div>

            <div className="space-y-2 sm:col-span-2">
              <Label>Skills</Label>
              <div className="flex gap-2">
                <Input value={skillInput} onChange={(e) => setSkillInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addSkill(); } }} placeholder="Add a skill and press Enter" />
                <Button type="button" variant="secondary" onClick={addSkill}><Plus className="h-4 w-4" /></Button>
              </div>
              {skills.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-2">
                  {skills.map((s) => (
                    <span key={s} className="flex items-center gap-1 rounded-full border border-border bg-secondary px-3 py-1 text-xs">
                      {s}
                      <button onClick={() => setSkills(skills.filter((x) => x !== s))} aria-label={`Remove ${s}`}><X className="h-3 w-3" /></button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="mt-8 flex justify-end gap-2">
            <Button onClick={save} disabled={saving} className="font-semibold">{saving ? "Saving…" : "Save changes"}</Button>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}