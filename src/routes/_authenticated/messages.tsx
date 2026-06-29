import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Camera, Image as ImageIcon, Mic, Paperclip, Send, Smile, Sticker } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const searchSchema = z.object({ c: z.string().uuid().optional() });

export const Route = createFileRoute("/_authenticated/messages")({
  validateSearch: searchSchema,
  head: () => ({ meta: [{ title: "Messages — InstaGIG" }] }),
  component: MessagesPage,
});

type Conv = {
  id: string;
  user_a: string;
  user_b: string;
  last_message_at: string;
  other?: { id: string; display_name: string | null; avatar_url: string | null } | null;
};
type Message = { id: string; sender_id: string; body: string | null; created_at: string };

function MessagesPage() {
  const { user } = useAuth();
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const activeId = search.c;

  const { data: conversations } = useQuery({
    queryKey: ["conversations", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("conversations")
        .select("id,user_a,user_b,last_message_at")
        .or(`user_a.eq.${user!.id},user_b.eq.${user!.id}`)
        .order("last_message_at", { ascending: false });
      const list = (data ?? []) as Conv[];
      const otherIds = list.map(c => c.user_a === user!.id ? c.user_b : c.user_a);
      const { data: profs } = await supabase.from("profiles").select("id,display_name,avatar_url").in("id", otherIds.length ? otherIds : ["00000000-0000-0000-0000-000000000000"]);
      const map = new Map((profs ?? []).map(p => [p.id, p]));
      return list.map(c => ({ ...c, other: map.get(c.user_a === user!.id ? c.user_b : c.user_a) ?? null }));
    },
    enabled: !!user,
  });

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />
      <div className="mx-auto flex w-full max-w-6xl flex-1 overflow-hidden border-x border-border md:my-6 md:rounded-2xl md:border">
        {/* Conv list */}
        <aside className={`w-full border-r border-border md:w-80 ${activeId ? "hidden md:block" : "block"}`}>
          <div className="border-b border-border p-4">
            <h2 className="font-display text-lg font-semibold">Chats</h2>
          </div>
          {conversations && conversations.length > 0 ? (
            <ul className="divide-y divide-border">
              {conversations.map((c) => (
                <li key={c.id}>
                  <button
                    onClick={() => navigate({ search: { c: c.id } })}
                    className={`flex w-full items-center gap-3 p-3 text-left transition hover:bg-secondary ${activeId === c.id ? "bg-secondary" : ""}`}
                  >
                    <div className="grid h-10 w-10 place-items-center rounded-full bg-primary text-primary-foreground font-semibold">
                      {(c.other?.display_name?.[0] ?? "?").toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">{c.other?.display_name ?? "Unknown"}</div>
                      <div className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(c.last_message_at), { addSuffix: true })}</div>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="p-8 text-center text-sm text-muted-foreground">
              No conversations yet. Message a freelancer or client from a gig or job.
            </div>
          )}
        </aside>

        {/* Active chat */}
        <section className={`flex flex-1 flex-col ${!activeId ? "hidden md:flex" : "flex"}`}>
          {activeId ? <ChatPanel convId={activeId} onBack={() => navigate({ search: {} })} /> : (
            <div className="grid flex-1 place-items-center p-8 text-center text-sm text-muted-foreground">
              Pick a conversation to start chatting.
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function ChatPanel({ convId, onBack }: { convId: string; onBack: () => void }) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [body, setBody] = useState("");
  const [showEmoji, setShowEmoji] = useState(false);
  const [otherTyping, setOtherTyping] = useState(false);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSentTyping = useRef<number>(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    supabase.from("messages").select("id,sender_id,body,created_at").eq("conversation_id", convId).order("created_at").then(({ data }) => {
      if (active) setMessages((data ?? []) as Message[]);
    });
    const channel = supabase.channel(`chat:${convId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${convId}` }, (payload) => {
        setMessages((prev) => [...prev, payload.new as Message]);
      })
      .on("broadcast", { event: "typing" }, (payload) => {
        const fromId = (payload.payload as { user_id?: string })?.user_id;
        if (!fromId || fromId === user?.id) return;
        setOtherTyping(true);
        if (typingTimer.current) clearTimeout(typingTimer.current);
        typingTimer.current = setTimeout(() => setOtherTyping(false), 2500);
      })
      .subscribe();
    channelRef.current = channel;
    return () => { active = false; supabase.removeChannel(channel); };
  }, [convId, user?.id]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length, otherTyping]);

  function broadcastTyping() {
    const now = Date.now();
    if (now - lastSentTyping.current < 1200) return;
    lastSentTyping.current = now;
    channelRef.current?.send({ type: "broadcast", event: "typing", payload: { user_id: user?.id } });
  }

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed) return;
    setBody("");
    await supabase.from("messages").insert({ conversation_id: convId, sender_id: user!.id, body: trimmed });
    await supabase.from("conversations").update({ last_message_at: new Date().toISOString() }).eq("id", convId);
  }

  const emojis = ["😀","😂","🥰","😎","🔥","💯","👍","👏","🎉","💸","🙏","🚀","✨","💪","❤️","😅","🤔","👀","💀","🤝"];
  const stickers = ["🦄","🐱","🐶","🌮","🍕","☕️","🎮","📸","🎨","💎"];

  return (
    <>
      <header className="flex items-center gap-3 border-b border-border p-3">
        <button onClick={onBack} className="md:hidden text-sm text-muted-foreground">←</button>
        <div className="grid h-9 w-9 place-items-center rounded-full bg-primary text-primary-foreground font-semibold">C</div>
        <div>
          <div className="text-sm font-semibold">Conversation</div>
          <div className="text-xs text-muted-foreground">Online</div>
        </div>
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto bg-[var(--gradient-ink)] p-4" style={{ minHeight: 0 }}>
        <div className="space-y-2">
          {messages.map((m) => {
            const mine = m.sender_id === user?.id;
            return (
              <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm shadow-sm ${mine ? "bg-primary text-primary-foreground rounded-br-sm" : "bg-card text-foreground rounded-bl-sm"}`}>
                  {m.body}
                  <div className={`mt-1 text-[10px] ${mine ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                    {new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </div>
                </div>
              </div>
            );
          })}
          {messages.length === 0 && <div className="py-12 text-center text-xs text-muted-foreground">Say hi 👋</div>}
          {otherTyping && (
            <div className="flex justify-start">
              <div className="flex items-center gap-1 rounded-2xl rounded-bl-sm bg-card px-3 py-2 shadow-sm">
                <span className="typing-dot" />
                <span className="typing-dot" style={{ animationDelay: "150ms" }} />
                <span className="typing-dot" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          )}
        </div>
      </div>

      {showEmoji && (
        <div className="border-t border-border bg-card p-3">
          <div className="text-xs font-semibold text-muted-foreground">Emojis</div>
          <div className="mt-2 flex flex-wrap gap-1">
            {emojis.map((e) => (
              <button key={e} onClick={() => send(e)} className="rounded-md px-2 py-1 text-xl hover:bg-secondary">{e}</button>
            ))}
          </div>
          <div className="mt-3 text-xs font-semibold text-muted-foreground">Stickers</div>
          <div className="mt-2 flex flex-wrap gap-1">
            {stickers.map((s) => (
              <button key={s} onClick={() => send(s + s + s)} className="rounded-md px-2 py-1 text-3xl hover:bg-secondary">{s}</button>
            ))}
          </div>
        </div>
      )}

      <form
        onSubmit={(e) => { e.preventDefault(); send(body); }}
        className="flex items-center gap-1 border-t border-border bg-card p-2"
      >
        <Button type="button" size="icon" variant="ghost" onClick={() => setShowEmoji(s => !s)}><Smile className="h-5 w-5" /></Button>
        <Button type="button" size="icon" variant="ghost"><Sticker className="h-5 w-5" /></Button>
        <Button type="button" size="icon" variant="ghost" asChild>
          <label><Paperclip className="h-5 w-5" /><input type="file" className="hidden" /></label>
        </Button>
        <Button type="button" size="icon" variant="ghost" asChild>
          <label><ImageIcon className="h-5 w-5" /><input type="file" accept="image/*" className="hidden" /></label>
        </Button>
        <Button type="button" size="icon" variant="ghost" asChild>
          <label><Camera className="h-5 w-5" /><input type="file" accept="image/*" capture="environment" className="hidden" /></label>
        </Button>
        <input
          value={body}
          onChange={(e) => { setBody(e.target.value); broadcastTyping(); }}
          placeholder="Type a message"
          className="flex-1 rounded-full border border-border bg-background px-4 py-2 text-sm outline-none focus:border-primary"
        />
        {body.trim() ? (
          <Button type="submit" size="icon" className="rounded-full"><Send className="h-4 w-4" /></Button>
        ) : (
          <Button type="button" size="icon" variant="ghost"><Mic className="h-5 w-5" /></Button>
        )}
      </form>
    </>
  );
}
