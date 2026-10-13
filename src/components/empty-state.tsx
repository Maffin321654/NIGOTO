export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="card-paper px-6 py-12 text-center">
      <p className="font-display text-xl text-ink">{title}</p>
      {hint ? <p className="mt-1 text-sm text-muted">{hint}</p> : null}
    </div>
  );
}
