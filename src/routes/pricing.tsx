import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, Sparkles } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Pricing — InstaGIG" },
      { name: "description", content: "Simple, transparent pricing for freelancers and clients on InstaGIG." },
      { property: "og:title", content: "Pricing — InstaGIG" },
      { property: "og:description", content: "Free to join. Pay only when work happens." },
    ],
  }),
  component: PricingPage,
});

const tiers = [
  {
    name: "Starter",
    price: "Free",
    blurb: "For freelancers just getting started.",
    perks: ["Up to 3 active gigs", "Real-time messaging", "Basic invoicing", "5% service fee on payouts"],
    cta: "Start free",
    to: "/auth" as const,
    search: undefined as Record<string, string> | undefined,
    featured: false,
  },
  {
    name: "Pro",
    price: "$12/mo",
    blurb: "Stand out. Get paid faster.",
    perks: ["Unlimited gigs & proposals", "Boosted search visibility", "Branded invoices + auto reminders", "3% service fee", "Priority support"],
    cta: "Go Pro",
    to: "/payments" as const,
    search: { plan: "pro" },
    featured: true,
  },
  {
    name: "Business",
    price: "Custom",
    blurb: "For agencies & hiring teams.",
    perks: ["Team workspaces", "Hire & escrow at scale", "Custom invoice templates", "Dedicated account manager", "API access"],
    cta: "Contact sales",
    to: "/payments" as const,
    search: { plan: "business" },
    featured: false,
  },
];


function PricingPage() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <section className="mx-auto max-w-6xl px-4 py-16 md:px-6">
        <div className="text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/5 px-3 py-1 text-xs font-medium text-primary">
            <Sparkles className="h-3 w-3" /> Simple pricing
          </div>
          <h1 className="font-display text-4xl font-bold md:text-6xl">
            Free to join. <span className="text-primary text-glow">Pay when it pays.</span>
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
            No setup fees, no monthly minimums. Upgrade when you're ready to scale.
          </p>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {tiers.map((t) => (
            <div
              key={t.name}
              className={`relative rounded-3xl border p-7 transition ${
                t.featured
                  ? "border-primary bg-card shadow-[0_0_60px_-15px_var(--color-primary)]"
                  : "border-border bg-card hover:border-primary/40"
              }`}
            >
              {t.featured && (
                <div className="absolute -top-3 left-7 rounded-full bg-primary px-3 py-1 text-xs font-bold text-primary-foreground">
                  Most popular
                </div>
              )}
              <h3 className="font-display text-xl font-semibold">{t.name}</h3>
              <div className="mt-2 font-display text-4xl font-bold">{t.price}</div>
              <p className="mt-2 text-sm text-muted-foreground">{t.blurb}</p>
              <ul className="mt-6 space-y-3 text-sm">
                {t.perks.map((p) => (
                  <li key={p} className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> <span>{p}</span>
                  </li>
                ))}
              </ul>
              <Link to={t.to} search={t.search as never} className="mt-7 block">
                <Button className="w-full font-semibold" variant={t.featured ? "default" : "secondary"}>
                  {t.cta}
                </Button>
              </Link>

            </div>
          ))}
        </div>

        <div className="mt-16 rounded-2xl border border-border bg-card p-8 text-center">
          <h2 className="font-display text-2xl font-semibold">Fees on every transaction</h2>
          <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">
            A small service fee covers escrow, dispute protection, and instant payouts. Payment processing is 2.9% + $0.30.
          </p>
        </div>
      </section>
      <Footer />
    </div>
  );
}
