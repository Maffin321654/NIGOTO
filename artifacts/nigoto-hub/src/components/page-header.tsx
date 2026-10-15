import type { ReactNode } from "react";

export function PageHeader({
  kicker,
  title,
  desc,
  action,
}: {
  kicker: string;
  title: string;
  desc?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0 flex-1">
        <p className="kicker">{kicker}</p>
        <h1 className="mt-1 font-display text-4xl tracking-tight text-ink break-words">{title}</h1>
        {desc ? <p className="mt-1 max-w-3xl text-muted break-words [overflow-wrap:anywhere]">{desc}</p> : null}
      </div>
      {action}
    </div>
  );
}
