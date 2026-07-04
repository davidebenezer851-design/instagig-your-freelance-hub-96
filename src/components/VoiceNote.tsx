import { useEffect, useRef, useState } from "react";
import { Pause, Play, Mic } from "lucide-react";

/**
 * WhatsApp-style voice note player.
 * Handles browser-recorded WebM blobs whose `duration` reads as `Infinity`
 * until the audio is fully seeked — we force the metadata to load so the
 * seek bar works from the first play.
 */
export function VoiceNote({ src, mine, avatar }: { src: string; mine: boolean; avatar?: React.ReactNode }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [playing, setPlaying] = useState(false);
  const [dur, setDur] = useState(0);
  const [pos, setPos] = useState(0);
  const [ready, setReady] = useState(false);

  // Force webm duration to resolve: seek to a huge value, then browser fires durationchange with real value.
  useEffect(() => {
    const a = audioRef.current; if (!a) return;
    let didHack = false;
    const finalize = () => {
      if (isFinite(a.duration) && a.duration > 0) { setDur(a.duration); setReady(true); a.currentTime = 0; }
    };
    const onDurChange = () => { if (isFinite(a.duration) && a.duration > 0) { setDur(a.duration); setReady(true); } };
    const onLoaded = () => {
      if (!isFinite(a.duration) || a.duration === 0) {
        if (!didHack) {
          didHack = true;
          try { a.currentTime = 1e9; } catch { /* noop */ }
        }
      } else { setDur(a.duration); setReady(true); }
    };
    const onSeeked = () => { if (didHack) { finalize(); didHack = false; } };
    const onTime = () => setPos(a.currentTime);
    const onEnd = () => { setPlaying(false); setPos(0); };
    a.addEventListener("loadedmetadata", onLoaded);
    a.addEventListener("durationchange", onDurChange);
    a.addEventListener("seeked", onSeeked);
    a.addEventListener("timeupdate", onTime);
    a.addEventListener("ended", onEnd);
    return () => {
      a.removeEventListener("loadedmetadata", onLoaded);
      a.removeEventListener("durationchange", onDurChange);
      a.removeEventListener("seeked", onSeeked);
      a.removeEventListener("timeupdate", onTime);
      a.removeEventListener("ended", onEnd);
    };
  }, [src]);

  function toggle() {
    const a = audioRef.current; if (!a) return;
    if (playing) { a.pause(); setPlaying(false); }
    else { a.play().then(() => setPlaying(true)).catch(() => {}); }
  }

  function fmt(s: number) {
    if (!isFinite(s) || s < 0) s = 0;
    const m = Math.floor(s / 60), ss = Math.floor(s % 60);
    return `${m}:${String(ss).padStart(2, "0")}`;
  }

  function seekTo(clientX: number) {
    const a = audioRef.current; const w = wrapRef.current;
    if (!a || !w || !ready || !dur) return;
    const rect = w.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const t = ratio * dur;
    a.currentTime = t; setPos(t);
  }

  const pct = dur > 0 ? Math.min(100, (pos / dur) * 100) : 0;
  const trackBg = mine ? "bg-primary-foreground/25" : "bg-foreground/15";
  const trackFg = mine ? "bg-primary-foreground" : "bg-primary";
  const btnBg = mine ? "bg-primary-foreground text-primary" : "bg-primary text-primary-foreground";
  const badgeBg = mine ? "bg-primary-foreground/15 text-primary-foreground" : "bg-primary/15 text-primary";

  // Static waveform bars for a "sound wave silhouette" feel
  const bars = [3, 5, 8, 12, 9, 14, 7, 11, 6, 13, 5, 10, 8, 4, 9, 12, 6, 8, 5, 3, 7, 11, 6, 4];

  return (
    <div className="flex w-64 max-w-full items-center gap-3 px-3 py-2">
      <button
        type="button"
        onClick={toggle}
        aria-label={playing ? "Pause voice note" : "Play voice note"}
        className={`grid h-9 w-9 shrink-0 place-items-center rounded-full shadow-sm transition active:scale-95 ${btnBg}`}
      >
        {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 translate-x-[1px]" />}
      </button>

      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div
          ref={wrapRef}
          className="relative h-6 cursor-pointer touch-none select-none"
          onPointerDown={(e) => { (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId); seekTo(e.clientX); }}
          onPointerMove={(e) => { if (e.buttons) seekTo(e.clientX); }}
        >
          {/* silhouette waveform */}
          <div className="pointer-events-none absolute inset-0 flex items-center gap-[2px]">
            {bars.map((h, i) => {
              const active = (i / bars.length) * 100 <= pct;
              return (
                <span
                  key={i}
                  className={`flex-1 rounded-full ${active ? trackFg : trackBg}`}
                  style={{ height: `${h * 1.4}px` }}
                />
              );
            })}
          </div>
          {/* thumb */}
          <span
            className={`pointer-events-none absolute top-1/2 h-3 w-3 -translate-y-1/2 rounded-full shadow ${trackFg}`}
            style={{ left: `calc(${pct}% - 6px)` }}
          />
        </div>
        <div className={`text-[10px] ${mine ? "text-primary-foreground/75" : "text-muted-foreground"}`}>
          {fmt(playing || pos > 0 ? pos : dur)}
        </div>
      </div>

      <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full ${badgeBg}`}>
        {avatar ?? <Mic className="h-3 w-3" />}
      </span>
      <audio ref={audioRef} src={src} preload="metadata" className="hidden" />
    </div>
  );
}
