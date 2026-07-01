import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

type Props = {
  userId?: string | null;
  name?: string | null;
  avatarUrl?: string | null;
  size?: number;
  className?: string;
};

/** Always-fresh avatar: pulls profile by id so a profile-photo change reflects everywhere. */
export function UserAvatar({ userId, name, avatarUrl, size = 32, className }: Props) {
  const [version, setVersion] = useState(0);
  const [liveAvatarUrl, setLiveAvatarUrl] = useState<string | null>(null);
  const { data } = useQuery({
    queryKey: ["avatar-profile", userId, version],
    queryFn: async () => {
      if (!userId) return null;
      const { data } = await supabase.from("profiles").select("display_name,avatar_url").eq("id", userId).maybeSingle();
      return data;
    },
    enabled: !!userId,
    staleTime: 30_000,
  });

  useEffect(() => {
    if (!userId) return;
    function onAvatarUpdate(event: Event) {
      const detail = (event as CustomEvent<{ userId?: string; avatarUrl?: string | null }>).detail;
      if (detail?.userId === userId) {
        if (detail.avatarUrl !== undefined) setLiveAvatarUrl(detail.avatarUrl);
        setVersion((v) => v + 1);
      }
    }
    window.addEventListener("instagig:avatar-updated", onAvatarUpdate);
    const channel = supabase.channel(`avatar:${userId}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "profiles", filter: `id=eq.${userId}` }, (payload) => {
        const next = payload.new as { avatar_url?: string | null };
        if (next.avatar_url !== undefined) setLiveAvatarUrl(next.avatar_url);
        setVersion((v) => v + 1);
      })
      .subscribe();
    return () => { window.removeEventListener("instagig:avatar-updated", onAvatarUpdate); supabase.removeChannel(channel); };
  }, [userId]);

  const url = liveAvatarUrl ?? data?.avatar_url ?? avatarUrl ?? null;
  const display = data?.display_name ?? name ?? "?";
  const initial = (display[0] ?? "?").toUpperCase();

  return (
    <div
      className={cn("relative shrink-0 overflow-hidden rounded-full bg-secondary grid place-items-center font-semibold text-foreground/80", className)}
      style={{ width: size, height: size, fontSize: Math.max(10, size * 0.4) }}
    >
      {url ? (
        <img src={url} alt={display} className="h-full w-full object-cover" referrerPolicy="no-referrer" />
      ) : (
        <span>{initial}</span>
      )}
    </div>
  );
}
