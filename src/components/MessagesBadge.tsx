import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

/**
 * Total unread messages across all conversations the current user participates in.
 * Rendered as a lemon-green bubble on the header messages icon.
 */
export function useUnreadMessagesCount() {
  const { user } = useAuth();
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!user) { setCount(0); return; }
    let active = true;

    async function load() {
      const { data: convs } = await supabase
        .from("conversations")
        .select("id")
        .or(`user_a.eq.${user!.id},user_b.eq.${user!.id}`);
      const ids = (convs ?? []).map((c) => c.id);
      if (ids.length === 0) { if (active) setCount(0); return; }
      // Sum of ALL unread messages across every thread (WhatsApp-style total).
      const { count: total } = await supabase
        .from("messages")
        .select("id", { count: "exact", head: true })
        .in("conversation_id", ids)
        .neq("sender_id", user!.id)
        .is("read_at", null);
      if (active) setCount(total ?? 0);
    }

    load();
    const channel = supabase.channel(`unread-msgs:${user.id}:${Math.random().toString(36).slice(2, 8)}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, load)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "messages" }, load)
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "messages" }, load)
      .subscribe();

    return () => { active = false; supabase.removeChannel(channel); };
  }, [user]);

  return count;
}

export function MessagesBadge() {
  const count = useUnreadMessagesCount();
  if (!count) return null;
  return (
    <span className="pointer-events-none absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-primary px-1 text-[9px] font-bold leading-none text-primary-foreground shadow ring-2 ring-background">
      {count > 99 ? "99+" : count}
    </span>
  );
}
