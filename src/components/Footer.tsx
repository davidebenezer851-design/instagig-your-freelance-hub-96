import { Link } from "@tanstack/react-router";

export function Footer() {
  return (
    <footer className="border-t border-border/60 bg-background">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 md:grid-cols-4 md:px-6">
        <div>
          <div className="flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary text-primary-foreground font-display font-bold">iG</div>
            <span className="font-display text-xl font-bold">Insta<span className="text-primary">GIG</span></span>
          </div>
          <p className="mt-3 text-sm text-muted-foreground">The freelance marketplace built for speed.</p>
        </div>
        <div>
          <h4 className="mb-3 text-sm font-semibold">For freelancers</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><Link to="/gigs" className="hover:text-primary">Browse gigs</Link></li>
            <li><Link to="/jobs" className="hover:text-primary">Find work</Link></li>
            <li><Link to="/post-gig" className="hover:text-primary">Sell a gig</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="mb-3 text-sm font-semibold">For clients</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><Link to="/post-job" className="hover:text-primary">Post a job</Link></li>
            <li><Link to="/gigs" className="hover:text-primary">Hire talent</Link></li>
            <li><Link to="/dashboard" className="hover:text-primary">Dashboard</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="mb-3 text-sm font-semibold">Account</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><Link to="/auth" className="hover:text-primary">Sign in</Link></li>
            <li><Link to="/auth" className="hover:text-primary">Create account</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border/60 py-4 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} InstaGIG. All rights reserved.
      </div>
    </footer>
  );
}
