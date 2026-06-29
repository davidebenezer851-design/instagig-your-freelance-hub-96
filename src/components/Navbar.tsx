import { Link, useNavigate } from "@tanstack/react-router";
import { Bookmark, Briefcase, LogOut, MessageCircle, Plus, Search, User as UserIcon } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useQueryClient } from "@tanstack/react-query";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function Navbar() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();

  async function handleSignOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/60 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 md:px-6">
        <Link to="/" className="flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary text-primary-foreground font-display font-bold text-lg">
            iG
          </div>
          <span className="font-display text-xl font-bold tracking-tight">
            Insta<span className="text-primary">GIG</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          <Link to="/gigs" className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground [&.active]:text-primary" activeProps={{ className: "active" }}>
            Browse Gigs
          </Link>
          <Link to="/jobs" className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground [&.active]:text-primary" activeProps={{ className: "active" }}>
            Find Jobs
          </Link>
        </nav>

        <div className="flex items-center gap-2">
          <Link to="/gigs" className="hidden md:inline-flex">
            <Button variant="ghost" size="icon" aria-label="Search">
              <Search className="h-4 w-4" />
            </Button>
          </Link>
          {user ? (
            <>
              <Link to="/messages">
                <Button variant="ghost" size="icon" aria-label="Messages">
                  <MessageCircle className="h-4 w-4" />
                </Button>
              </Link>
              <Link to="/saved">
                <Button variant="ghost" size="icon" aria-label="Saved">
                  <Bookmark className="h-4 w-4" />
                </Button>
              </Link>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="secondary" size="icon" className="rounded-full">
                    <UserIcon className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52">
                  <DropdownMenuItem asChild><Link to="/dashboard"><Briefcase className="mr-2 h-4 w-4" />Dashboard</Link></DropdownMenuItem>
                  <DropdownMenuItem asChild><Link to="/saved"><Bookmark className="mr-2 h-4 w-4" />Saved</Link></DropdownMenuItem>
                  <DropdownMenuItem asChild><Link to="/post-gig"><Plus className="mr-2 h-4 w-4" />Post a Gig</Link></DropdownMenuItem>
                  <DropdownMenuItem asChild><Link to="/post-job"><Plus className="mr-2 h-4 w-4" />Post a Job</Link></DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut}><LogOut className="mr-2 h-4 w-4" />Sign out</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <>
              <Link to="/auth"><Button variant="ghost" size="sm">Sign in</Button></Link>
              <Link to="/auth" search={{ tab: "signup" } as never}>
                <Button size="sm" className="font-semibold">Join InstaGIG</Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
