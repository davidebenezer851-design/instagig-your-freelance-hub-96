import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, FileText, Send, CheckCircle2, Sparkles, Users, Calculator, Bell } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/invoicing")({
  head: () => ({
    meta: [
      { title: "Invoicing — InstaGIG" },
      { name: "description", content: "Send branded invoices, track payments and get paid faster on InstaGIG." },
      { property: "og:title", content: "Invoicing on InstaGIG" },
      { property: "og:description", content: "Create, send and track invoices in seconds." },
    ],
  }),
  component: InvoicingPage,
});

function InvoicingPage() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 grain-bg" />
        <div className="relative mx-auto max-w-6xl px-4 py-16 md:px-6 md:py-24">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/5 px-3 py-1 text-xs font-medium text-primary">
              <Sparkles className="h-3 w-3" /> Invoicing, built into InstaGIG
            </div>
            <h1 className="font-display text-4xl font-bold leading-tight md:text-6xl">
              Get paid <span className="text-primary text-glow">faster</span>. <br /> Invoice in seconds.
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-muted-foreground">
              Send pro-grade invoices to your clients without leaving InstaGIG. Track paid, pending and overdue from one slick dashboard.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link to="/invoices">
                <Button size="lg" className="font-semibold">
                  Create your first invoice <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link to="/invoices"><Button size="lg" variant="secondary">Open invoice dashboard</Button></Link>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="border-t border-border/60 bg-card/40">
        <div className="mx-auto max-w-6xl px-4 py-16 md:px-6">
          <h2 className="text-center font-display text-3xl font-bold">How invoicing works</h2>
          <p className="mx-auto mt-2 max-w-xl text-center text-sm text-muted-foreground">
            Four steps from "work delivered" to "money in your account".
          </p>
          <div className="mt-10 grid gap-6 md:grid-cols-4">
            {[
              { n: "01", icon: Users, t: "Pick a client", d: "Choose anyone you've messaged on InstaGIG — no contact import needed." },
              { n: "02", icon: Calculator, t: "Add line items", d: "Description, qty, rate. Totals and tax update in real time." },
              { n: "03", icon: Send, t: "Send instantly", d: "Client gets a notification and can pay through escrow in one tap." },
              { n: "04", icon: CheckCircle2, t: "Track & reconcile", d: "See paid, pending and overdue. Mark paid when funds clear." },
            ].map(({ n, icon: Icon, t, d }) => (
              <div key={n} className="rounded-2xl border border-border bg-card p-6">
                <div className="text-xs font-mono text-primary">{n}</div>
                <div className="mt-3 grid h-11 w-11 place-items-center rounded-xl bg-primary text-primary-foreground">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mt-3 font-display text-lg font-semibold">{t}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{d}</p>
              </div>
            ))}
          </div>
          <div className="mt-10 text-center">
            <Link to="/invoices">
              <Button size="lg" className="font-semibold">
                Create an invoice now <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-4 py-16 md:px-6">
        <div className="grid gap-6 md:grid-cols-3">
          {[
            { icon: FileText, t: "Pro templates", d: "Branded, printable PDFs that look great in any inbox." },
            { icon: Bell, t: "Smart reminders", d: "Automatic nudges for overdue invoices so you don't have to chase." },
            { icon: CheckCircle2, t: "Built-in escrow", d: "Clients pay safely; you get paid the moment funds release." },
          ].map(({ icon: Icon, t, d }) => (
            <div key={t} className="rounded-2xl border border-border bg-card p-6">
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-primary/10 text-primary">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="mt-3 font-display text-lg font-semibold">{t}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-4 pb-20 md:px-6">
        <div className="relative overflow-hidden rounded-3xl border border-primary/30 bg-card p-10 md:p-14">
          <div className="absolute inset-0 grain-bg" />
          <div className="relative flex flex-wrap items-center justify-between gap-6">
            <div className="max-w-xl">
              <h2 className="font-display text-3xl font-bold md:text-4xl">
                Ready to <span className="text-primary text-glow">bill</span> a client?
              </h2>
              <p className="mt-2 text-muted-foreground">Open the invoice dashboard and send your first invoice in under a minute.</p>
            </div>
            <Link to="/invoices">
              <Button size="lg" className="font-semibold">
                Go to invoices <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
