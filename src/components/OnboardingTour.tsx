import { useEffect, useLayoutEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";

type Step = { selector: string; title: string; body: string; placement?: "top" | "bottom" };

const STEPS: Step[] = [
  { selector: '[data-tour="browse"]',   title: "Browse Gigs & Jobs",   body: "Tap here to explore services from freelancers around the world." },
  { selector: '[data-tour="messages"]', title: "Seamless messaging",   body: "Open Messages for instant chats, quick replies, and clean file sharing." },
  { selector: '[data-tour="wallet"]',   title: "Your Wallet",          body: "Top up, pay for boosts and gigs, and watch the chip pulse when your balance changes." },
  { selector: '[data-tour="profile"]',  title: "Your account",         body: "Profile, settings, posting a gig/job — everything lives in this menu.", placement: "top" },
];

type Rect = { top: number; left: number; width: number; height: number };

export function OnboardingTour() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [active, setActive] = useState(false);
  const [i, setI] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);

  useEffect(() => {
    if (loading || !user || typeof window === "undefined") return;
    const key = `instagig:tour:${user.id}`;
    if (localStorage.getItem(key)) return;
    const waitForReady = window.setInterval(() => {
      const firstTarget = document.querySelector(STEPS[0].selector);
      const loaderGone = !document.querySelector('[data-page-loader="true"]');
      if (!firstTarget || !loaderGone || document.readyState === "loading") return;
      window.clearInterval(waitForReady);
      window.setTimeout(() => setActive(true), 450);
    }, 200);
    const timeout = window.setTimeout(() => window.clearInterval(waitForReady), 8000);
    return () => { window.clearInterval(waitForReady); window.clearTimeout(timeout); };
  }, [user, loading]);

  const step = STEPS[i];

  useLayoutEffect(() => {
    if (!active) return;
    function measure() {
      const el = document.querySelector(step.selector) as HTMLElement | null;
      if (!el) { setRect(null); return; }
      const r = el.getBoundingClientRect();
      setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
    }
    measure();
    const id = setInterval(measure, 250); // re-measure for layout shifts/scroll
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => { clearInterval(id); window.removeEventListener("resize", measure); window.removeEventListener("scroll", measure, true); };
  }, [active, step]);

  function finish() {
    if (user) localStorage.setItem(`instagig:tour:${user.id}`, "1");
    setActive(false);
  }
  function next() {
    if (i < STEPS.length - 1) setI(i + 1);
    else { finish(); navigate({ to: "/dashboard" }); }
  }

  if (!active) return null;

  const pad = 8;
  const r = rect;
  const tooltipTop = r
    ? step.placement === "top"
      ? Math.max(16, r.top - 160)
      : Math.min(window.innerHeight - 200, r.top + r.height + 14)
    : 100;
  const tooltipLeft = r
    ? Math.min(Math.max(16, r.left + r.width / 2 - 160), window.innerWidth - 336)
    : 16;

  return (
    <div className="fixed inset-0 z-[100]" aria-modal="true" role="dialog">
      {/* Dark overlay with cutout */}
      {r ? (
        <div
          className="pointer-events-auto absolute rounded-xl ring-2 ring-primary transition-all duration-300"
          style={{
            top: r.top - pad,
            left: r.left - pad,
            width: r.width + pad * 2,
            height: r.height + pad * 2,
            boxShadow: "0 0 0 9999px rgba(0,0,0,0.78), 0 0 24px 6px hsl(80 100% 56% / 0.55)",
          }}
        />
      ) : (
        <div className="absolute inset-0 bg-black/80" />
      )}

      {/* Tooltip */}
      <div
        className="pointer-events-auto absolute w-[320px] max-w-[calc(100vw-32px)] rounded-2xl border border-primary/40 bg-card p-5 shadow-2xl animate-in fade-in slide-in-from-bottom-2"
        style={{ top: tooltipTop, left: tooltipLeft }}
      >
        <div className="text-[10px] font-semibold uppercase tracking-widest text-primary">Tour · {i + 1}/{STEPS.length}</div>
        <h3 className="mt-1 font-display text-lg font-bold">{step.title}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{step.body}</p>

        <div className="mt-4 flex items-center gap-1.5">
          {STEPS.map((_, idx) => (
            <span key={idx} className={`h-1.5 rounded-full transition-all ${idx === i ? "w-6 bg-primary" : "w-1.5 bg-border"}`} />
          ))}
        </div>

        <div className="mt-4 flex items-center justify-between">
          <button type="button" onClick={finish} className="text-xs text-muted-foreground hover:text-foreground">Skip tour</button>
          <div className="flex gap-2">
            {i > 0 && <Button size="sm" variant="ghost" onClick={() => setI(i - 1)}>Back</Button>}
            <Button size="sm" onClick={next}>{i < STEPS.length - 1 ? "Next" : "Get started"}</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
