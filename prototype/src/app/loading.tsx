export default function Loading() {
  return (
    <div aria-busy="true" aria-live="polite" className="animate-pulse">
      <span className="sr-only">Loading…</span>
      <div className="mb-2 h-8 w-56 rounded-lg bg-slate-200" />
      <div className="mb-8 h-4 w-80 max-w-full rounded bg-slate-200" />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-24 rounded-2xl bg-slate-200/80" />
        ))}
      </div>
      <div className="mt-8 space-y-3">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-16 rounded-2xl bg-slate-200/70" />
        ))}
      </div>
    </div>
  );
}
