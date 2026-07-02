import { useEffect, useState } from "react";
import { Bell, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

type Notif = {
  id: string; type: string; title: string; body: string | null;
  link: string | null; read: boolean; created_at: string;
};

export function NotificationBell() {
  const { user } = useAuth();
  const [items, setItems] = useState<Notif[]>([]);

  useEffect(() => {
    if (!user) return;
    let active = true;
    supabase
      .from("notifications")
      .select("id,type,title,body,link,read,created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20)
      .then(({ data }) => { if (active) setItems((data ?? []) as Notif[]); });

    const channel = supabase.channel(`notif:${user.id}:${Math.random().toString(36).slice(2, 8)}`);
    channel.on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
      (payload) => {
        const n = payload.new as Notif;
        setItems((p) => [n, ...p].slice(0, 20));
        // In-app toast so users see the alert regardless of which tab they're on
        toast(n.title, {
          description: n.body ?? undefined,
          action: n.link ? { label: "Open", onClick: () => { window.location.href = n.link!; } } : undefined,
        });
        // Native push (fires on desktop and mobile when permission granted)
        if (typeof Notification !== "undefined" && Notification.permission === "granted") {
          try {
            const not = new Notification(n.title, { body: n.body ?? "", tag: n.id, icon: "/favicon.ico" });
            not.onclick = () => { window.focus(); if (n.link) window.location.href = n.link; };
          } catch {}
        }
      }
    ).subscribe();

    return () => { active = false; supabase.removeChannel(channel); };
  }, [user]);

  // Ask for push permission automatically on first mount (users can opt out in Settings)
  useEffect(() => {
    if (!user || typeof Notification === "undefined") return;
    if (Notification.permission === "default") {
      Notification.requestPermission().catch(() => {});
    }
  }, [user]);

  async function markAllRead() {
    if (!user) return;
    await supabase.from("notifications").update({ read: true }).eq("user_id", user.id).eq("read", false);
    setItems((p) => p.map((n) => ({ ...n, read: true })));
  }

  const unread = items.filter((n) => !n.read).length;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Notifications" className="relative">
          <Bell className="h-4 w-4" />
          {unread > 0 && (
            <span className="absolute right-1.5 top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-primary px-1 text-[9px] font-bold text-primary-foreground">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b border-border p-3">
          <span className="text-sm font-semibold">Notifications</span>
          {unread > 0 && (
            <button onClick={markAllRead} className="flex items-center gap-1 text-xs text-primary hover:underline">
              <Check className="h-3 w-3" /> Mark all read
            </button>
          )}
        </div>
        <div className="max-h-96 overflow-y-auto">
          {items.length === 0 ? (
            <div className="p-8 text-center text-xs text-muted-foreground">No notifications yet</div>
          ) : (
            items.map((n) => {
              const content = (
                <div className={`flex gap-3 border-b border-border/60 p-3 last:border-0 transition hover:bg-secondary ${!n.read ? "bg-primary/5" : ""}`}>
                  <div className={`mt-1 h-2 w-2 shrink-0 rounded-full ${!n.read ? "bg-primary" : "bg-transparent"}`} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{n.title}</div>
                    {n.body && <div className="truncate text-xs text-muted-foreground">{n.body}</div>}
                    <div className="mt-1 text-[10px] text-muted-foreground">{formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}</div>
                  </div>
                </div>
              );
              return n.link ? (
                <a key={n.id} href={n.link} onClick={() => { supabase.from("notifications").update({ read: true }).eq("id", n.id); }}>
                  {content}
                </a>
              ) : <div key={n.id}>{content}</div>;
            })
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}