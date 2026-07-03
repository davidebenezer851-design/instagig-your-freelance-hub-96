import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Camera, Check, CheckCheck, File as FileIcon, Forward, Image as ImageIcon, Mic, Paperclip, Reply, Send, Smile, X, Loader2, Download, ArrowLeft, Trash2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import EmojiPicker, { EmojiStyle, Theme } from "emoji-picker-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ImageEditor } from "@/components/ImageEditor";
import { UserAvatar } from "@/components/UserAvatar";
import { useIsMobile } from "@/hooks/use-mobile";
import { UserEmailSearch, type UserSearchResult } from "@/components/UserEmailSearch";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from "@/components/ui/context-menu";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { VoiceNote } from "@/components/VoiceNote";

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
  hidden_by_a_at?: string | null;
  hidden_by_b_at?: string | null;
  other?: { id: string; display_name: string | null; avatar_url: string | null; email?: string | null } | null;
};
type ChatOther = { id: string; display_name: string | null; avatar_url: string | null; email?: string | null } | null;
type Message = {
  id: string; sender_id: string; body: string | null; created_at: string;
  attachment_url: string | null; attachment_type: string | null; attachment_name: string | null; attachment_size: number | null;
  reply_to: string | null; read_at: string | null;
};

type Pending = { id: string; file: File | Blob; name: string; type: string; size: number; previewUrl: string };

function fmtSize(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

function MessagesPage() {
  const { user } = useAuth();
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const qc = useQueryClient();
  const activeId = search.c;

  const { data: conversations } = useQuery({
    queryKey: ["conversations", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("conversations")
        .select("id,user_a,user_b,last_message_at,hidden_by_a_at,hidden_by_b_at")
        .or(`user_a.eq.${user!.id},user_b.eq.${user!.id}`)
        .order("last_message_at", { ascending: false });
      const list = ((data ?? []) as Conv[]).filter((c) => c.user_a === user!.id ? !c.hidden_by_a_at : !c.hidden_by_b_at);
      const otherIds = list.map(c => c.user_a === user!.id ? c.user_b : c.user_a);
      const { data: profs } = await supabase.from("profiles").select("id,display_name,avatar_url,email").in("id", otherIds.length ? otherIds : ["00000000-0000-0000-0000-000000000000"]);
      const map = new Map((profs ?? []).map(p => [p.id, p]));
      return list.map(c => ({ ...c, other: map.get(c.user_a === user!.id ? c.user_b : c.user_a) ?? null }));
    },
    enabled: !!user,
  });

  useEffect(() => {
    if (!user) return;
    const channel = supabase.channel(`conversation-list:${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "conversations" }, () => {
        qc.invalidateQueries({ queryKey: ["conversations", user.id] });
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, () => {
        qc.invalidateQueries({ queryKey: ["conversations", user.id] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [qc, user]);

  async function hideConversation(c: Conv) {
    if (!user) return;
    const patch = c.user_a === user.id
      ? { hidden_by_a_at: new Date().toISOString() }
      : { hidden_by_b_at: new Date().toISOString() };
    const { error } = await supabase.from("conversations").update(patch).eq("id", c.id);
    if (error) { toast.error(error.message); return; }
    if (activeId === c.id) navigate({ search: {} });
    qc.invalidateQueries({ queryKey: ["conversations", user.id] });
    toast.success("Conversation removed from your messages");
  }

  return (
    <div className="flex h-[100dvh] w-full flex-col overflow-x-hidden bg-background">
      <Navbar />
      <div className="mx-auto flex w-full min-w-0 max-w-full flex-1 overflow-hidden border-x border-border md:my-4 md:max-w-6xl md:rounded-2xl md:border" style={{ minHeight: 0 }}>
        <aside className={`w-full min-w-0 border-r border-border md:w-80 ${activeId ? "hidden md:block" : "block"}`}>
          <div className="border-b border-border p-4">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-semibold">Chats</h2>
              <NewChatByEmail onOpen={(id) => navigate({ search: { c: id } })} />
            </div>
          </div>
          <div className="overflow-y-auto" style={{ maxHeight: "calc(100dvh - 8rem)" }}>
            {conversations && conversations.length > 0 ? (
              <ul className="divide-y divide-border">
                {conversations.map((c) => (
                  <ConversationListItem
                    key={c.id}
                    conversation={c}
                    active={activeId === c.id}
                    onOpen={() => navigate({ search: { c: c.id } })}
                    onDelete={() => hideConversation(c)}
                  />
                ))}
              </ul>
            ) : (
              <div className="p-8 text-center text-sm text-muted-foreground">
                No conversations yet. Message a freelancer or client from a gig or job.
              </div>
            )}
          </div>
        </aside>

        <section className={`w-full min-w-0 flex-1 flex-col ${!activeId ? "hidden md:flex" : "flex"}`} style={{ minHeight: 0 }}>
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

function ConversationListItem({ conversation, active, onOpen, onDelete }: { conversation: Conv; active: boolean; onOpen: () => void; onDelete: () => void }) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const longPressRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressedRef = useRef(false);
  const name = conversation.other?.display_name || conversation.other?.email?.split("@")[0] || "Unknown";

  function startLongPress() {
    if (longPressRef.current) clearTimeout(longPressRef.current);
    longPressedRef.current = false;
    longPressRef.current = setTimeout(() => { longPressedRef.current = true; setConfirmOpen(true); }, 550);
  }
  function stopLongPress() {
    if (longPressRef.current) clearTimeout(longPressRef.current);
  }

  return (
    <li>
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <button
            onClick={(e) => { if (longPressedRef.current) { e.preventDefault(); longPressedRef.current = false; return; } onOpen(); }}
            onTouchStart={startLongPress}
            onTouchEnd={stopLongPress}
            onTouchMove={stopLongPress}
            className={`grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 p-3 text-left transition hover:bg-secondary ${active ? "bg-secondary" : ""}`}
          >
            <UserAvatar userId={conversation.other?.id} name={name} avatarUrl={conversation.other?.avatar_url} size={40} />
            <span className="min-w-0">
              <span className="block truncate text-sm font-medium">{name}</span>
              <span className="block truncate text-xs text-muted-foreground">{formatDistanceToNow(new Date(conversation.last_message_at), { addSuffix: true })}</span>
            </span>
            <span className="hidden h-8 w-8 place-items-center rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive md:grid" onClick={(e) => { e.stopPropagation(); setConfirmOpen(true); }}>
              <Trash2 className="h-4 w-4" />
            </span>
          </button>
        </ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem onSelect={() => setConfirmOpen(true)} className="text-destructive focus:text-destructive">
            <Trash2 className="mr-2 h-4 w-4" /> Remove chat
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this chat?</AlertDialogTitle>
            <AlertDialogDescription>This removes the conversation from your Messages list. It won't delete it for the other person.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={onDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </li>
  );
}

function NewChatByEmail({ onOpen }: { onOpen: (convId: string) => void }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<UserSearchResult | null>(null);
  const [busy, setBusy] = useState(false);

  async function start() {
    if (!user || !selected) return;
    setBusy(true);
    try {
      if (selected.id === user.id) { toast.error("That's you 🙂"); return; }
      const [a, b] = [user.id, selected.id].sort();
      const { data: existing } = await supabase
        .from("conversations")
        .select("id")
        .eq("user_a", a).eq("user_b", b).maybeSingle();
      let convId = existing?.id;
      if (!convId) {
        const { data: created, error } = await supabase
          .from("conversations")
          .insert({ user_a: a, user_b: b, hidden_by_a_at: null, hidden_by_b_at: null })
          .select("id").single();
        if (error) throw error;
        convId = created.id;
      } else {
        const patch = a === user.id ? { hidden_by_a_at: null } : { hidden_by_b_at: null };
        await supabase.from("conversations").update(patch).eq("id", convId);
      }
      setOpen(false); setSelected(null);
      onOpen(convId!);
    } catch (e) {
      toast.error((e as Error).message);
    } finally { setBusy(false); }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button size="sm" variant="secondary" className="h-8 gap-1"><Send className="h-3.5 w-3.5" />New</Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72">
        <div className="space-y-2">
          <div className="text-sm font-semibold">Start a new chat</div>
          <p className="text-xs text-muted-foreground">Search by email, then choose the person from the dropdown.</p>
          <UserEmailSearch excludeUserId={user?.id} selected={selected} onSelect={setSelected} />
          <Button onClick={start} disabled={busy || !selected} className="w-full" size="sm">
            {busy ? "Opening…" : "Start chat"}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function ChatPanel({ convId, onBack }: { convId: string; onBack: () => void }) {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const qc = useQueryClient();
  const [messages, setMessages] = useState<Message[]>([]);
  const [body, setBody] = useState("");
  const [pending, setPending] = useState<Pending[]>([]);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [otherTyping, setOtherTyping] = useState(false);
  const [sending, setSending] = useState(false);
  const [editing, setEditing] = useState<File | null>(null);
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recSecs, setRecSecs] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recChunksRef = useRef<Blob[]>([]);
  const recTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSentTyping = useRef<number>(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imgInputRef = useRef<HTMLInputElement>(null);
  const camInputRef = useRef<HTMLInputElement>(null);

  const { data: otherUser } = useQuery({
    queryKey: ["chat-other", convId, user?.id],
    enabled: !!user && !!convId,
    queryFn: async () => {
      const { data: c } = await supabase.from("conversations").select("user_a,user_b").eq("id", convId).maybeSingle();
      if (!c) return null;
      const otherId = c.user_a === user!.id ? c.user_b : c.user_a;
      const { data: p } = await supabase.from("profiles").select("id,display_name,avatar_url,email").eq("id", otherId).maybeSingle();
      return p as ChatOther;
    },
  });

  useEffect(() => {
    let active = true;
    supabase.from("messages")
      .select("id,sender_id,body,created_at,attachment_url,attachment_type,attachment_name,attachment_size,reply_to,read_at")
      .eq("conversation_id", convId).order("created_at").then(({ data }) => {
        if (active) {
          const loaded = (data ?? []) as Message[];
          setMessages((prev) => {
            const optimistic = prev.filter((m) => m.id.startsWith("temp-"));
            return [...loaded, ...optimistic.filter((m) => !loaded.some((x) => x.id === m.id))];
          });
        }
      });
    const channel = supabase.channel(`chat:${convId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${convId}` }, (payload) => {
        const m = payload.new as Message;
        setMessages((prev) => prev.some((x) => x.id === m.id) ? prev : [...prev, m]);
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "messages", filter: `conversation_id=eq.${convId}` }, (payload) => {
        const m = payload.new as Message;
        setMessages((prev) => prev.map((x) => x.id === m.id ? { ...x, ...m } : x));
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "messages", filter: `conversation_id=eq.${convId}` }, (payload) => {
        const m = payload.old as Partial<Message>;
        if (!m.id) return;
        setMessages((prev) => prev.filter((x) => x.id !== m.id));
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

  // Mark incoming messages as read when chat is open
  useEffect(() => {
    if (!user) return;
    const unread = messages.filter((m) => m.sender_id !== user.id && !m.read_at).map((m) => m.id);
    if (unread.length === 0) return;
    supabase.from("messages").update({ read_at: new Date().toISOString() }).in("id", unread).then(() => {});
  }, [messages, user]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length, otherTyping, pending.length]);

  function broadcastTyping() {
    const now = Date.now();
    if (now - lastSentTyping.current < 1200) return;
    lastSentTyping.current = now;
    channelRef.current?.send({ type: "broadcast", event: "typing", payload: { user_id: user?.id } });
  }

  function addPendingFile(file: File | Blob, name: string, type: string) {
    const size = (file as File).size ?? (file as Blob).size;
    if (size > 15 * 1024 * 1024) { toast.error(`${name} is over 15MB`); return; }
    const previewUrl = URL.createObjectURL(file);
    setPending((p) => [...p, { id: crypto.randomUUID(), file, name, type, size, previewUrl }]);
  }

  function onPickImage(files: FileList | null) {
    if (!files || !files[0]) return;
    setEditing(files[0]);
    if (imgInputRef.current) imgInputRef.current.value = "";
    if (camInputRef.current) camInputRef.current.value = "";
  }
  function onPickFile(files: FileList | null) {
    if (!files) return;
    Array.from(files).forEach((f) => {
      if (f.type.startsWith("image/")) { setEditing(f); return; }
      addPendingFile(f, f.name, f.type || "application/octet-stream");
    });
    if (fileInputRef.current) fileInputRef.current.value = "";
  }
  function removePending(id: string) {
    setPending((p) => {
      const found = p.find((x) => x.id === id);
      if (found) URL.revokeObjectURL(found.previewUrl);
      return p.filter((x) => x.id !== id);
    });
  }

  async function uploadOne(p: Pending) {
    const ext = p.name.includes(".") ? p.name.split(".").pop() : (p.type.split("/")[1] || "bin");
    const path = `${user!.id}/messages/${convId}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("post-attachments").upload(path, p.file, { contentType: p.type, cacheControl: "3600" });
    if (error) throw error;
    const { data } = await supabase.storage.from("post-attachments").createSignedUrl(path, 60 * 60 * 24 * 365);
    return { url: data?.signedUrl ?? "", type: p.type, name: p.name, size: p.size };
  }

  async function send() {
    const text = body.trim();
    if (!text && pending.length === 0) return;
    if (!user) return;
    setSending(true);
    const optimisticTextId = uploadedTempId();
    try {
      const uploaded = await Promise.all(pending.map(uploadOne));
      const replyToId = replyTo?.id ?? null;
      const rows: Array<Partial<Message> & { conversation_id: string; sender_id: string }> = [];
      uploaded.forEach((u, idx) => {
        rows.push({
          conversation_id: convId, sender_id: user.id,
          body: idx === uploaded.length - 1 ? (text || null) : null,
          attachment_url: u.url, attachment_type: u.type, attachment_name: u.name, attachment_size: u.size,
          reply_to: idx === 0 ? replyToId : null,
        });
      });
      if (uploaded.length === 0 && text) {
        rows.push({ conversation_id: convId, sender_id: user.id, body: text, reply_to: replyToId });
      }
      setBody(""); pending.forEach((p) => URL.revokeObjectURL(p.previewUrl)); setPending([]); setReplyTo(null);
      if (uploaded.length === 0 && text) {
        setMessages((prev) => [...prev, {
          id: optimisticTextId, sender_id: user.id, body: text, created_at: new Date().toISOString(),
          attachment_url: null, attachment_type: null, attachment_name: null, attachment_size: null,
          reply_to: replyToId, read_at: null,
        }]);
      }

      const { data, error } = await supabase.from("messages").insert(rows).select("id,sender_id,body,created_at,attachment_url,attachment_type,attachment_name,attachment_size,reply_to,read_at");
      if (error) throw error;
      setMessages((prev) => {
        const real = (data ?? []) as Message[];
        const withoutTemp = prev.filter((m) => m.id !== optimisticTextId);
        const dedup = real.filter((r) => !withoutTemp.some((m) => m.id === r.id));
        return [...withoutTemp, ...dedup];
      });
      await supabase.from("conversations").update({ last_message_at: new Date().toISOString(), hidden_by_a_at: null, hidden_by_b_at: null }).eq("id", convId);
      qc.invalidateQueries({ queryKey: ["conversations", user.id] });
    } catch (e) {
      setMessages((prev) => prev.filter((m) => m.id !== optimisticTextId));
      toast.error((e as Error).message || "Failed to send");
    } finally {
      setSending(false);
    }
  }

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "";
      const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      recChunksRef.current = [];
      rec.ondataavailable = (e) => { if (e.data.size) recChunksRef.current.push(e.data); };
      rec.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        if (recTimerRef.current) { clearInterval(recTimerRef.current); recTimerRef.current = null; }
        const blob = new Blob(recChunksRef.current, { type: mime || "audio/webm" });
        if (blob.size > 0) addPendingFile(blob, `voice-${Date.now()}.webm`, blob.type);
        setRecording(false); setRecSecs(0);
      };
      mediaRecorderRef.current = rec;
      rec.start();
      setRecording(true); setRecSecs(0);
      recTimerRef.current = setInterval(() => setRecSecs((s) => s + 1), 1000);
    } catch {
      toast.error("Microphone permission denied");
    }
  }
  function stopRecording() { mediaRecorderRef.current?.state === "recording" && mediaRecorderRef.current.stop(); }
  function cancelRecording() {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      recChunksRef.current = [];
      mediaRecorderRef.current.stop();
    }
  }

  async function deleteSelectedMessage() {
    if (!user || !selectedMessage || selectedMessage.sender_id !== user.id) return;
    const id = selectedMessage.id;
    setDeleteDialogOpen(false);
    setSelectedMessage(null);
    const previous = messages;
    setMessages((prev) => prev.filter((m) => m.id !== id));
    if (id.startsWith("temp-")) return;
    const { error } = await supabase.from("messages").delete().eq("id", id).eq("sender_id", user.id);
    if (error) {
      setMessages(previous);
      toast.error(error.message);
    }
  }

  const chatName = otherUser?.display_name || otherUser?.email?.split("@")[0] || "Conversation";

  return (
    <>
      <header className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 border-b border-border p-3">
        <button onClick={onBack} className="md:hidden -ml-1 grid h-8 w-8 place-items-center rounded-full text-muted-foreground hover:bg-secondary" aria-label="Back">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex min-w-0 items-center gap-3">
          <UserAvatar userId={otherUser?.id} name={chatName} avatarUrl={otherUser?.avatar_url} size={36} />
          <div className="min-w-0">
          <div className="truncate text-sm font-semibold">{chatName}</div>
          <div className="text-xs text-muted-foreground">{otherTyping ? "typing…" : "Online"}</div>
          </div>
        </div>
        {selectedMessage?.sender_id === user?.id ? (
          <Button type="button" size="icon" variant="ghost" className="shrink-0 text-destructive hover:text-destructive" onClick={() => setDeleteDialogOpen(true)} aria-label="Delete selected message">
            <Trash2 className="h-5 w-5" />
          </Button>
        ) : <span />}
      </header>

      <div ref={scrollRef} className="min-w-0 flex-1 overflow-y-auto bg-[var(--gradient-ink)] p-2 sm:p-4" style={{ minHeight: 0 }}>
        <div className="space-y-2">
          {messages.map((m) => {
            const mine = m.sender_id === user?.id;
            const replied = m.reply_to ? messages.find((x) => x.id === m.reply_to) : null;
            return (
              <SwipeableMessage
                key={m.id}
                onReply={() => setReplyTo(m)}
                onDelete={mine ? () => { setSelectedMessage(m); setDeleteDialogOpen(true); } : undefined}
                onSelect={mine ? () => setSelectedMessage(m) : undefined}
                mine={mine}
                selected={selectedMessage?.id === m.id}
              >
                <MessageBubble m={m} mine={mine} replied={replied ?? null} />
              </SwipeableMessage>
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

      <form
        onSubmit={(e) => { e.preventDefault(); send(); }}
        className="w-full min-w-0 border-t border-border bg-card p-2 sm:p-3"
        style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}
      >
        {replyTo && (
          <div className="mb-2 flex items-start gap-2 rounded-lg border-l-4 border-primary bg-secondary px-3 py-2 text-xs">
            <div className="min-w-0 flex-1">
              <div className="font-semibold text-primary">Replying to {replyTo.sender_id === user?.id ? "yourself" : "them"}</div>
              <div className="truncate text-muted-foreground">{replyTo.body ?? (replyTo.attachment_type?.startsWith("image/") ? "📷 Photo" : "📎 Attachment")}</div>
            </div>
            <button type="button" onClick={() => setReplyTo(null)} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
          </div>
        )}

        {recording && (
          <div className="mb-2 flex items-center gap-2 rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-400">
            <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-red-500" />
            Recording voice note · {String(Math.floor(recSecs / 60)).padStart(2, "0")}:{String(recSecs % 60).padStart(2, "0")}
            <button type="button" onClick={cancelRecording} className="ml-auto text-muted-foreground hover:text-foreground">Cancel</button>
          </div>
        )}

        <div className="flex min-w-0 flex-col gap-2 rounded-2xl border border-border bg-background p-1.5 sm:p-2">
          {pending.length > 0 && (
            <div className="flex flex-wrap gap-2 border-b border-border pb-2">
              {pending.map((p) => (
                <div key={p.id} className="group relative overflow-hidden rounded-lg border border-border bg-secondary">
                  {p.type.startsWith("image/") ? (
                    <img src={p.previewUrl} alt={p.name} className="h-20 w-20 object-cover" />
                  ) : p.type.startsWith("audio/") ? (
                    <div className="flex h-20 w-56 items-center gap-2 p-2">
                      <Mic className="h-5 w-5 shrink-0 text-primary" />
                      <audio src={p.previewUrl} controls className="h-8 w-full" />
                    </div>
                  ) : (
                    <div className="flex h-20 w-32 flex-col items-center justify-center gap-1 p-2">
                      <FileIcon className="h-6 w-6 text-primary" />
                      <span className="line-clamp-2 text-center text-[10px] text-muted-foreground">{p.name}</span>
                    </div>
                  )}
                  <button type="button" onClick={() => removePending(p.id)}
                    className="absolute right-1 top-1 grid h-5 w-5 place-items-center rounded-full bg-black/70 text-white hover:bg-black">
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className={`grid items-end gap-1 ${isMobile ? "grid-cols-[auto_auto_auto_auto_minmax(0,1fr)_auto]" : "grid-cols-[auto_auto_auto_minmax(0,1fr)_auto]"}`}>
            <Popover open={emojiOpen} onOpenChange={setEmojiOpen}>
              <PopoverTrigger asChild>
                <Button type="button" size="icon" variant="ghost" className="h-9 w-9 shrink-0" aria-label="Emoji"><Smile className="h-5 w-5" /></Button>
              </PopoverTrigger>
              <PopoverContent side="top" align="start" sideOffset={8} className="z-50 w-[min(360px,calc(100vw-24px))] p-0 border-border">
                <EmojiPicker
                  onEmojiClick={(e) => setBody((b) => b + e.emoji)}
                  theme={Theme.DARK} emojiStyle={EmojiStyle.NATIVE}
                  width="100%" height={isMobile ? 320 : 380}
                  lazyLoadEmojis searchDisabled={false} previewConfig={{ showPreview: false }}
                />
              </PopoverContent>
            </Popover>
            <Button type="button" size="icon" variant="ghost" className="h-9 w-9 shrink-0" onClick={() => fileInputRef.current?.click()} aria-label="Attach file">
              <Paperclip className="h-5 w-5" />
            </Button>
            <Button type="button" size="icon" variant="ghost" className="h-9 w-9 shrink-0" onClick={() => imgInputRef.current?.click()} aria-label="Image">
              <ImageIcon className="h-5 w-5" />
            </Button>
            {isMobile && (
              <Button type="button" size="icon" variant="ghost" className="h-9 w-9 shrink-0" onClick={() => camInputRef.current?.click()} aria-label="Camera">
                <Camera className="h-5 w-5" />
              </Button>
            )}
            <input ref={fileInputRef} type="file" multiple className="hidden" onChange={(e) => onPickFile(e.target.files)} />
            <input ref={imgInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => onPickImage(e.target.files)} />
            <input ref={camInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => onPickImage(e.target.files)} />
            <textarea
              value={body}
              onChange={(e) => { setBody(e.target.value); broadcastTyping(); }}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && !isMobile) { e.preventDefault(); send(); } }}
              placeholder="Type a message"
              rows={1}
              className="max-h-32 min-h-9 min-w-0 resize-none bg-transparent px-1 py-2 text-sm outline-none sm:px-2"
            />
            {body.trim() || pending.length ? (
              <Button type="submit" size="icon" className="h-9 w-9 shrink-0 rounded-full" disabled={sending}>
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            ) : (
              <Button type="button" size="icon" className="h-9 w-9 shrink-0" variant={recording ? "default" : "ghost"} aria-label={recording ? "Stop recording" : "Record voice"} onClick={recording ? stopRecording : startRecording}>
                <Mic className={`h-5 w-5 ${recording ? "animate-pulse" : ""}`} />
              </Button>
            )}
          </div>
        </div>
      </form>

      {editing && (
        <ImageEditor
          key={editing.name + editing.size + editing.lastModified}
          file={editing}
          open={!!editing}
          onCancel={() => setEditing(null)}
          onConfirm={(blob) => {
            const name = editing.name || `photo-${Date.now()}.jpg`;
            addPendingFile(blob, name, blob.type || "image/jpeg");
            setEditing(null);
          }}
        />
      )}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete message?</AlertDialogTitle>
            <AlertDialogDescription>This removes the message for everyone in this conversation.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={deleteSelectedMessage}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function uploadedTempId() {
  return `temp-${crypto.randomUUID()}`;
}

function SwipeableMessage({ children, onReply, onDelete, onSelect, mine, selected }: { children: React.ReactNode; onReply: () => void; onDelete?: () => void; onSelect?: () => void; mine: boolean; selected?: boolean }) {
  const [dx, setDx] = useState(0);
  const [dragging, setDragging] = useState(false);
  const startX = useRef(0);
  const startY = useRef(0);
  const decided = useRef<"h" | "v" | null>(null);
  const longPressRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function onStart(x: number, y: number) {
    startX.current = x; startY.current = y; decided.current = null; setDragging(true);
    if (onSelect) longPressRef.current = setTimeout(onSelect, 550);
  }
  function onMove(x: number, y: number) {
    if (!dragging) return;
    const ddx = x - startX.current;
    const ddy = y - startY.current;
    if (decided.current === null) {
      if (Math.abs(ddx) > 6 || Math.abs(ddy) > 6) decided.current = Math.abs(ddx) > Math.abs(ddy) ? "h" : "v";
    }
    if (decided.current !== "h") return;
    if (longPressRef.current) clearTimeout(longPressRef.current);
    // Swipe right for both sender and receiver to reply.
    const clamped = Math.max(0, Math.min(80, ddx));
    setDx(clamped);
  }
  function onEnd() {
    if (longPressRef.current) clearTimeout(longPressRef.current);
    if (dx > 50) onReply();
    setDx(0); setDragging(false); decided.current = null;
  }

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div
          className={`swipe-row group relative flex items-end ${mine ? "justify-end" : "justify-start"} ${dragging ? "is-dragging" : ""} ${selected ? "rounded-xl bg-primary/10" : ""}`}
          style={{ touchAction: "pan-y" }}
          onTouchStart={(e) => onStart(e.touches[0].clientX, e.touches[0].clientY)}
          onTouchMove={(e) => onMove(e.touches[0].clientX, e.touches[0].clientY)}
          onTouchEnd={onEnd}
          onPointerDown={(e) => { if (e.pointerType === "mouse") return; onStart(e.clientX, e.clientY); }}
          onPointerMove={(e) => { if (e.pointerType === "mouse") return; onMove(e.clientX, e.clientY); }}
          onPointerUp={(e) => { if (e.pointerType === "mouse") return; onEnd(); }}
        >
          <span
            className="pointer-events-none absolute left-1 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full bg-primary/20 text-primary"
            style={{ opacity: dx > 16 ? Math.min(1, dx / 50) : 0, transform: `translateY(-50%) scale(${Math.min(1, dx / 50)})` }}
          >
            <Reply className="h-4 w-4" />
          </span>
          <div
            style={{ transform: `translateX(${dx}px)`, transition: dragging ? "none" : "transform 180ms ease" }}
            className={`flex max-w-full min-w-0 items-center gap-1 ${mine ? "flex-row-reverse justify-end" : "justify-start"}`}
          >
            <div className="hidden opacity-0 transition group-hover:opacity-100 md:flex">
              <Button type="button" size="icon" variant="ghost" className="h-8 w-8 rounded-full" onClick={onReply} aria-label="Reply">
                <Reply className="h-4 w-4" />
              </Button>
              {onDelete && (
                <Button type="button" size="icon" variant="ghost" className="h-8 w-8 rounded-full text-destructive hover:text-destructive" onClick={onDelete} aria-label="Delete">
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
            {children}
          </div>
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem onSelect={onReply}><Reply className="mr-2 h-4 w-4" /> Reply</ContextMenuItem>
        {onDelete && <ContextMenuItem onSelect={onDelete} className="text-destructive focus:text-destructive"><Trash2 className="mr-2 h-4 w-4" /> Delete</ContextMenuItem>}
      </ContextMenuContent>
    </ContextMenu>
  );
}

function MessageBubble({ m, mine, replied }: { m: Message; mine: boolean; replied: Message | null }) {
  const isImg = m.attachment_type?.startsWith("image/");
  const isAudio = m.attachment_type?.startsWith("audio/");
  return (
    <div className={`max-w-[min(82vw,34rem)] overflow-hidden rounded-2xl text-sm shadow-sm sm:max-w-[70%] ${mine ? "bg-primary text-primary-foreground rounded-br-sm" : "bg-card text-foreground rounded-bl-sm"}`}>
      {replied && (
        <div className={`mx-2 mt-2 rounded-md border-l-2 ${mine ? "border-primary-foreground/60 bg-black/15" : "border-primary bg-secondary"} px-2 py-1 text-[11px]`}>
          <div className="truncate opacity-80">{replied.body ?? (replied.attachment_type?.startsWith("image/") ? "📷 Photo" : "📎 Attachment")}</div>
        </div>
      )}
      {m.attachment_url && isImg && (
        <a href={m.attachment_url} target="_blank" rel="noreferrer" className="block">
          <img src={m.attachment_url} alt={m.attachment_name ?? "image"} className="max-h-80 w-full object-cover" />
        </a>
      )}
      {m.attachment_url && isAudio && (
        <div className="flex items-center gap-2 p-2">
          <audio src={m.attachment_url} controls className="h-9 w-56 max-w-full" />
        </div>
      )}
      {m.attachment_url && !isImg && !isAudio && (
        <a href={m.attachment_url} target="_blank" rel="noreferrer"
           className={`flex items-center gap-2 ${m.body ? `border-b ${mine ? "border-primary-foreground/20" : "border-border"}` : ""} p-3`}>
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-black/20"><FileIcon className="h-5 w-5" /></div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-xs font-medium">{m.attachment_name ?? "File"}</div>
            <div className={`text-[10px] ${mine ? "text-primary-foreground/70" : "text-muted-foreground"}`}>{m.attachment_size ? fmtSize(m.attachment_size) : ""}</div>
          </div>
          <Download className="h-4 w-4 shrink-0 opacity-70" />
        </a>
      )}
      {m.body && <div className="whitespace-pre-wrap px-3 py-2">{m.body}</div>}
      <div className={`flex items-center justify-end gap-1 px-3 pb-1.5 text-[10px] ${mine ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
        <span>{new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
        {mine && (
          m.id.startsWith("temp-") ? <Check className="h-3 w-3" />
          : m.read_at ? <CheckCheck className="h-3 w-3 text-sky-400" />
          : <CheckCheck className="h-3 w-3 opacity-80" />
        )}
      </div>
    </div>
  );
}
