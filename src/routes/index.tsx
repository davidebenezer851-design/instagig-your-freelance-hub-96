import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Briefcase, MessageSquare, Search, Sparkles, Zap } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { useScrollFade } from "@/hooks/useScrollFade";


export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "InstaGIG — Hire Talent. Land Gigs. Get Paid." },
      { name: "description", content: "InstaGIG is the lightning-fast freelance marketplace. Post jobs, sell gigs, chat in real time." },
    ],
  }),
  component: LandingPage,
});

function LandingPage() {
  useScrollFade();

  const categories = [
    { slug: "design", label: "Design", emoji: "🎨" },
    { slug: "development", label: "Development", emoji: "💻" },
    { slug: "writing", label: "Writing", emoji: "✍️" },
    { slug: "marketing", label: "Marketing", emoji: "📣" },
    { slug: "video", label: "Video", emoji: "🎬" },
    { slug: "ai", label: "AI", emoji: "🤖" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero */}
      <section className="relative overflow-hidden" data-fade>
        <div className="absolute inset-0 grain-bg" />
        <div className="relative mx-auto max-w-7xl px-4 pb-20 pt-16 md:px-6 md:pt-24">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/5 px-3 py-1 text-xs font-medium text-primary">
              <Sparkles className="h-3 w-3" /> The freelance marketplace built for speed
            </div>
            <h1 className="font-display text-5xl font-bold leading-[1.05] tracking-tight md:text-7xl">
              Hire <span className="text-primary text-glow">talent</span>.
              <br /> Land <span className="text-primary text-glow">gigs</span>. Get paid.
            </h1>
            <p className="mx-auto mt-6 max-w-xl text-base text-muted-foreground md:text-lg">
              InstaGIG connects clients and freelancers in seconds. Browse thousands of gigs, post jobs, and message in real time.
            </p>

            <form
              onSubmit={(e) => { e.preventDefault(); window.location.href = "/gigs"; }}
              className="mx-auto mt-8 flex max-w-xl items-center gap-2 rounded-full border border-border bg-card p-1.5 shadow-[var(--shadow-card)]"
            >
              <Search className="ml-3 h-4 w-4 text-muted-foreground" />
              <input
                className="flex-1 bg-transparent px-2 py-2 text-sm outline-none placeholder:text-muted-foreground"
                placeholder="Try 'logo design', 'react developer', 'voice over'"
              />
              <Button type="submit" className="rounded-full font-semibold">Search</Button>
            </form>

            <div className="mt-6 flex flex-wrap items-center justify-center gap-2 text-xs text-muted-foreground">
              <span>Popular:</span>
              {["Logo design", "Web development", "Copywriting", "Video editing"].map((t) => (
                <Link key={t} to="/gigs" className="rounded-full border border-border px-3 py-1 hover:border-primary hover:text-primary">{t}</Link>
              ))}
            </div>

            <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
              <Link to="/auth" search={{ tab: "signup", role: "freelancer" } as never}>
                <Button size="lg" className="font-semibold">
                  Start selling gigs <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link to="/auth" search={{ tab: "signup", role: "client" } as never}>
                <Button size="lg" variant="secondary" className="font-semibold">
                  Hire freelancers
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="border-y border-border/60 bg-card/40" data-fade>
        <div className="mx-auto max-w-7xl px-4 py-10 md:px-6">
          <h2 className="mb-6 font-display text-2xl font-semibold">Explore categories</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-6">
            {categories.map((c) => (
              <Link
                key={c.slug}
                to="/gigs"
                search={{ category: c.slug } as never}
                className="group rounded-xl border border-border bg-card p-4 text-center transition hover:border-primary hover:bg-primary/5"
              >
                <div className="text-3xl">{c.emoji}</div>
                <div className="mt-2 text-sm font-medium group-hover:text-primary">{c.label}</div>
              </Link>
            ))}
          </div>
        </div>
      </section>


      {/* How it works */}
      <section className="border-t border-border/60 bg-card/40" data-fade>
        <div className="mx-auto max-w-7xl px-4 py-16 md:px-6">
          <h2 className="text-center font-display text-3xl font-bold">How InstaGIG works</h2>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {[
              { icon: Briefcase, t: "Post or browse", d: "Clients post jobs, freelancers list gigs. Find the perfect match in minutes." },
              { icon: MessageSquare, t: "Chat in real time", d: "WhatsApp-style messaging with emojis, attachments, voice notes, and camera." },
              { icon: Zap, t: "Get paid fast", d: "Secure escrow, instant payouts. No waiting for clients to pay." },
            ].map(({ icon: Icon, t, d }) => (
              <div key={t} className="rounded-2xl border border-border bg-card p-6">
                <div className="grid h-12 w-12 place-items-center rounded-xl bg-primary text-primary-foreground">
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="mt-4 font-display text-xl font-semibold">{t}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-7xl px-4 py-20 md:px-6" data-fade>
        <div className="relative overflow-hidden rounded-3xl border border-primary/30 bg-card p-10 md:p-16">
          <div className="absolute inset-0 grain-bg" />
          <div className="relative max-w-2xl">
            <h2 className="font-display text-3xl font-bold md:text-5xl">
              Ready to <span className="text-primary text-glow">go</span>?
            </h2>
            <p className="mt-3 text-muted-foreground">Join InstaGIG today. It's free to sign up — pay only when work happens.</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link to="/auth" search={{ tab: "signup" } as never}><Button size="lg" className="font-semibold">Create account</Button></Link>
              <Link to="/gigs"><Button size="lg" variant="secondary">Browse gigs</Button></Link>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
