import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

/**
 * Total unread messages across all conversations the current user participates in.
 * Rendered as a lemon-green bubble on the header messages icon.
 */
export function useUnreadMessagesCount() {
  const { user } = useAuth();
  const [unreadThreadIds, setUnreadThreadIds] = useState<Set<string>>(new Set());
  const recentlyClearedRef = useRef(new Set<string>());

  useEffect(() => {
    if (!user) { setUnreadThreadIds(new Set()); return; }
    let active = true;

    async function load() {
      const { data: convs } = await supabase
        .from("conversations")
        .select("id")
        .or(`user_a.eq.${user!.id},user_b.eq.${user!.id}`);
      const ids = (convs ?? []).map((c) => c.id);
      if (ids.length === 0) { if (active) setUnreadThreadIds(new Set()); return; }
      // WhatsApp-style: count of THREADS with at least one unread message,
      // not the sum of unread messages. John(34) + Lacy(16) => badge shows 2.
      const { data: unread } = await supabase
        .from("messages")
        .select("conversation_id")
        .in("conversation_id", ids)
        .neq("sender_id", user!.id)
        .is("read_at", null);
      const threads = new Set((unread ?? []).map((m: { conversation_id: string }) => m.conversation_id));
      recentlyClearedRef.current.forEach((conversationId) => threads.delete(conversationId));
      if (active) setUnreadThreadIds(threads);
    }

    function clearUnreadThread(event: Event) {
      const conversationId = (event as CustomEvent<{ conversationId?: string }>).detail?.conversationId;
      if (!conversationId) return;
      recentlyClearedRef.current.add(conversationId);
      window.setTimeout(() => recentlyClearedRef.current.delete(conversationId), 3000);
      setUnreadThreadIds((current) => {
        if (!current.has(conversationId)) return current;
        const next = new Set(current);
        next.delete(conversationId);
        return next;
      });
    }

    load();
    window.addEventListener("instagig:message-thread-read", clearUnreadThread);
    const channel = supabase.channel(`unread-msgs:${user.id}:${Math.random().toString(36).slice(2, 8)}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, (payload) => {
        const message = payload.new as { conversation_id?: string; sender_id?: string; read_at?: string | null };
        if (!message.conversation_id || message.sender_id === user.id || message.read_at || recentlyClearedRef.current.has(message.conversation_id)) return;
        setUnreadThreadIds((current) => {
          if (current.has(message.conversation_id!)) return current;
          const next = new Set(current);
          next.add(message.conversation_id!);
          return next;
        });
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "messages" }, load)
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "messages" }, load)
      .subscribe();

    return () => {
      active = false;
      window.removeEventListener("instagig:message-thread-read", clearUnreadThread);
      supabase.removeChannel(channel);
    };
  }, [user]);

  return unreadThreadIds.size;
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
