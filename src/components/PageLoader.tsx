export function PageLoader({ label = "Loading" }: { label?: string }) {
  return (
    <div data-page-loader="true" className="fixed inset-0 z-[60] grid place-items-center bg-background/70 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-4">
        <div className="relative h-14 w-14">
          <span className="absolute inset-0 rounded-full border-2 border-primary/20" />
          <span className="absolute inset-0 rounded-full border-2 border-transparent border-t-primary border-r-primary animate-spin" />
          <span className="absolute inset-2 rounded-full bg-primary/10 animate-pulse" />
          <span className="absolute inset-0 grid place-items-center font-display text-xs font-bold text-primary">iG</span>
        </div>
        <div className="text-xs font-medium tracking-widest text-muted-foreground uppercase">{label}</div>
      </div>
    </div>
  );
}

export function InlineLoader({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center justify-center py-10 ${className}`}>
      <div className="relative h-8 w-8">
        <span className="absolute inset-0 rounded-full border-2 border-primary/20" />
        <span className="absolute inset-0 rounded-full border-2 border-transparent border-t-primary animate-spin" />
      </div>
    </div>
  );
}
