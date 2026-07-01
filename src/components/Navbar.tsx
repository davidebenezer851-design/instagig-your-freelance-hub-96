import { Link, useNavigate } from "@tanstack/react-router";
import { Bookmark, Briefcase, FileText, LogOut, MessageCircle, Plus, RefreshCw, Search, Settings, User as UserIcon, Wallet } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useQueryClient } from "@tanstack/react-query";
import { NotificationBell } from "@/components/NotificationBell";
import { UserAvatar } from "@/components/UserAvatar";
import { WalletChip } from "@/components/WalletChip";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";


export function Navbar() {
  const { user } = useAuth();
  const role = useUserRole();
  const navigate = useNavigate();
  const qc = useQueryClient();

  async function handleSignOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  async function switchRole() {
    if (!user || !role) return;
    const next = role === "freelancer" ? "client" : "freelancer";
    const t = toast.loading(`Switching to ${next}…`);
    await supabase.from("user_roles").delete().eq("user_id", user.id);
    const { error } = await supabase.from("user_roles").insert({ user_id: user.id, role: next });
    toast.dismiss(t);
    if (error) { toast.error(error.message); return; }
    qc.removeQueries({ queryKey: ["user-role"] });
    await qc.refetchQueries({ queryKey: ["user-role", user.id] });
    toast.success(`You're now a ${next}`);
    navigate({ to: next === "freelancer" ? "/freelancer" : "/client" });
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
          <Link to="/gigs" data-tour="browse" className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground [&.active]:text-primary" activeProps={{ className: "active" }}>
            Browse Gigs
          </Link>
          <Link to="/jobs" className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground [&.active]:text-primary" activeProps={{ className: "active" }}>
            Find Jobs
          </Link>
          <Link to="/pricing" className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground [&.active]:text-primary" activeProps={{ className: "active" }}>
            Pricing
          </Link>
          <Link to="/invoicing" className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground [&.active]:text-primary" activeProps={{ className: "active" }}>
            Invoicing
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
              <WalletChip />
              <NotificationBell />
              <Link to="/messages" data-tour="messages">
                <Button variant="ghost" size="icon" aria-label="Messages">
                  <MessageCircle className="h-4 w-4" />
                </Button>
              </Link>
              <Link to="/saved" className="hidden sm:inline-flex">
                <Button variant="ghost" size="icon" aria-label="Saved">
                  <Bookmark className="h-4 w-4" />
                </Button>
              </Link>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button data-tour="profile" variant="secondary" size="icon" className="rounded-full p-0 overflow-hidden ring-2 ring-primary/40 ring-offset-2 ring-offset-background transition hover:ring-primary/70 hover:shadow-[0_0_18px_-4px_var(--lemon)]">
                    <UserAvatar userId={user.id} size={36} />
                  </Button>
                </DropdownMenuTrigger>

                <DropdownMenuContent align="end" className="w-64">
                  <div className="px-2 py-2">
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Account</div>
                    <Link to="/accounts" className="mt-1 flex items-center gap-2 rounded-md p-1.5 hover:bg-secondary">
                      <UserAvatar userId={user.id} size={32} />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium">{user.email}</div>
                        <div className="text-[11px] text-muted-foreground">Manage accounts</div>
                      </div>
                      <span className="text-[10px] text-primary">Switch</span>
                    </Link>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild><Link to="/dashboard"><Briefcase className="mr-2 h-4 w-4" />Dashboard</Link></DropdownMenuItem>
                  <DropdownMenuItem asChild><Link to="/profile"><UserIcon className="mr-2 h-4 w-4" />Profile</Link></DropdownMenuItem>
                  <DropdownMenuItem asChild><Link to="/settings"><Settings className="mr-2 h-4 w-4" />Settings</Link></DropdownMenuItem>
                  <DropdownMenuItem asChild><Link to="/saved"><Bookmark className="mr-2 h-4 w-4" />Saved</Link></DropdownMenuItem>
                  <DropdownMenuItem asChild><Link to="/wallet"><Wallet className="mr-2 h-4 w-4" />Wallet</Link></DropdownMenuItem>
                  {role !== "client" && (
                    <DropdownMenuItem asChild><Link to="/post-gig"><Plus className="mr-2 h-4 w-4" />Post a Gig</Link></DropdownMenuItem>
                  )}
                  {role !== "freelancer" && (
                    <DropdownMenuItem asChild><Link to="/post-job"><Plus className="mr-2 h-4 w-4" />Post a Job</Link></DropdownMenuItem>
                  )}

                  {role && (
                    <DropdownMenuItem onClick={switchRole}>
                      <RefreshCw className="mr-2 h-4 w-4" />Switch to {role === "freelancer" ? "Client" : "Freelancer"}
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem asChild><Link to="/invoices"><FileText className="mr-2 h-4 w-4" />Invoices</Link></DropdownMenuItem>
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
