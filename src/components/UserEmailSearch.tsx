import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { UserAvatar } from "@/components/UserAvatar";
import { cn } from "@/lib/utils";

export type UserSearchResult = {
  id: string;
  display_name: string | null;
  username: string | null;
  email: string | null;
  avatar_url: string | null;
};

type Props = {
  excludeUserId?: string | null;
  placeholder?: string;
  selected?: UserSearchResult | null;
  className?: string;
  onSelect: (profile: UserSearchResult) => void;
};

export function UserEmailSearch({ excludeUserId, placeholder = "Search by email", selected, className, onSelect }: Props) {
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const cleaned = useMemo(() => query.trim().replace(/[%(),]/g, ""), [query]);
  const searchTerm = cleaned.replace(/[.*]/g, " ").trim();

  useEffect(() => {
    if (selected) setQuery(selected.email ?? selected.display_name ?? selected.username ?? "");
  }, [selected]);

  const { data: results = [], isFetching } = useQuery({
    queryKey: ["user-email-search", searchTerm, excludeUserId],
    enabled: searchTerm.length >= 2,
    queryFn: async () => {
      let request = supabase
        .from("profiles")
        .select("id,display_name,username,email,avatar_url")
        .or(`email.ilike.*${searchTerm}*,display_name.ilike.*${searchTerm}*,username.ilike.*${searchTerm}*`)
        .limit(6);
      if (excludeUserId) request = request.neq("id", excludeUserId);
      const { data, error } = await request;
      if (error) throw error;
      return (data ?? []) as UserSearchResult[];
    },
  });

  const showMenu = focused && searchTerm.length >= 2;

  return (
    <div className={cn("relative", className)}>
      <div className="flex items-center rounded-md border border-border bg-background px-3 focus-within:ring-2 focus-within:ring-primary/50">
        <Search className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => window.setTimeout(() => setFocused(false), 140)}
          placeholder={placeholder}
          className="h-10 min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
        {isFetching && <Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted-foreground" />}
      </div>

      {showMenu && (
        <div className="absolute left-0 right-0 top-[calc(100%+0.35rem)] z-50 overflow-hidden rounded-xl border border-border bg-popover shadow-xl">
          {results.length > 0 ? results.map((profile) => {
            const name = profile.display_name || profile.username || profile.email?.split("@")[0] || "User";
            return (
              <button
                key={profile.id}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  onSelect(profile);
                  setQuery(profile.email ?? name);
                  setFocused(false);
                }}
                className="grid w-full grid-cols-[auto_minmax(0,1fr)] items-center gap-3 px-3 py-2 text-left hover:bg-secondary"
              >
                <UserAvatar userId={profile.id} name={name} avatarUrl={profile.avatar_url} size={34} />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium">{name}</span>
                  <span className="block truncate text-xs text-muted-foreground">{profile.email ?? "No email on profile"}</span>
                </span>
              </button>
            );
          }) : (
            <div className="px-3 py-3 text-sm text-muted-foreground">User not found</div>
          )}
        </div>
      )}
    </div>
  );
}