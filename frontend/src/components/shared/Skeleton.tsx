export function SkeletonUserCard() {
  return (
    <div className="flex items-center gap-3 rounded-xl bg-slate-800 px-4 py-3 animate-pulse">
      <div className="h-2.5 w-2.5 shrink-0 rounded-full bg-slate-700" />
      <div className="flex-1 space-y-1.5">
        <div className="h-3.5 w-24 rounded bg-slate-700" />
        <div className="h-3 w-16 rounded bg-slate-700/60" />
      </div>
      <div className="h-7 w-14 rounded-lg bg-slate-700" />
    </div>
  );
}

export function SkeletonUserList({ count = 4 }: { count?: number }) {
  return (
    <div className="space-y-2">
      <div className="h-3 w-20 rounded bg-slate-700/50 animate-pulse px-1" />
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonUserCard key={i} />
      ))}
    </div>
  );
}
