import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { listCalendar } from "@/lib/server/fns";
import { useRpc } from "@/lib/use-rpc";

export const Route = createFileRoute("/_app/calendar")({ component: CalendarPage });

function CalendarPage() {
  const { data, loading, err } = useRpc(() => listCalendar());
  const [cursor, setCursor] = useState(() => {
    const n = new Date();
    return new Date(n.getFullYear(), n.getMonth(), 1);
  });
  const cells = useMemo(() => buildMonth(cursor), [cursor]);
  if (loading) return <p className="text-muted">Đang tải lịch…</p>;
  if (err) return <p className="text-accent">{err}</p>;
  const items = data?.items ?? [];

  return (
    <div>
      <PageHeader
        kicker="Lịch CLB"
        title={cursor.toLocaleDateString("vi-VN", { month: "long", year: "numeric" })}
        desc="Sự kiện và ngày đăng content."
        action={
          <div className="flex gap-2">
            <button className="rounded-full border border-line px-3 py-2" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}>Trước</button>
            <button className="rounded-full border border-line px-3 py-2" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}>Sau</button>
          </div>
        }
      />
      <div className="grid grid-cols-7 gap-1 text-center text-xs uppercase tracking-wider text-muted">
        {"CN T2 T3 T4 T5 T6 T7".split(" ").map((d) => <div key={d} className="py-2">{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((c, i) => {
          const dayItems = items.filter((it) => overlapsDay(it.start_at, it.end_at, c.date));
          return (
            <div key={i} className={`min-h-24 rounded-xl border border-line p-1.5 ${c.inMonth ? "bg-paper-3" : "bg-paper-2/40 text-muted"}`}>
              <p className="text-xs tabular-nums">{c.date.getDate()}</p>
              {dayItems.map((it) => (
                it.kind === "event" ? (
                  <Link key={it.id} to="/events/$id" params={{ id: it.id }} className="mt-1 block truncate rounded-md bg-accent/15 px-1 text-[11px] text-accent">
                    {it.title}
                  </Link>
                ) : (
                  <p key={it.id} className="mt-1 truncate rounded-md bg-ink/10 px-1 text-[11px]">{it.title}</p>
                )
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function dayStamp(d: Date) {
  return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
}

function overlapsDay(startIso: string, endIso: string | null | undefined, cell: Date) {
  const start = new Date(startIso);
  if (Number.isNaN(start.getTime())) return false;
  const end = endIso ? new Date(endIso) : start;
  const a = dayStamp(start);
  const b = Number.isNaN(end.getTime()) ? a : Math.max(a, dayStamp(end));
  const c = dayStamp(cell);
  return c >= a && c <= b;
}

function buildMonth(start: Date) {
  const first = new Date(start.getFullYear(), start.getMonth(), 1);
  const offset = first.getDay();
  const days: { date: Date; inMonth: boolean }[] = [];
  for (let i = 0; i < 42; i++) {
    const date = new Date(start.getFullYear(), start.getMonth(), i - offset + 1);
    days.push({ date, inMonth: date.getMonth() === start.getMonth() });
  }
  return days;
}
