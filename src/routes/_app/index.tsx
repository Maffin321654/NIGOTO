import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { formatDateTime, greeting } from "@/lib/format";
import { getDashboard, setTaskStatus } from "@/lib/server/fns";
import { errorMessage } from "@/lib/utils";
import { useRpc } from "@/lib/use-rpc";

export const Route = createFileRoute("/_app/")({ component: Dashboard });

function Dashboard() {
  const { data, loading, err, reload } = useRpc(() => getDashboard());
  if (loading) return <p className="text-muted">Đang tải…</p>;
  if (err || !data) return <p className="text-accent">{err}</p>;
  const { me, events, myTasks, announcements, memberCount, overdue, inProgress, pendingContent } = data;

  async function confirm(id: string, status: string) {
    try {
      await setTaskStatus({ data: { id, status } });
      toast.success("Đã cập nhật việc.");
      reload();
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }

  return (
    <div>
      <PageHeader kicker="Tổng quan" title={`${greeting()}, ${me.name.split(" ").slice(-1)[0]}`} desc="Hôm nay câu lạc bộ đang làm gì." />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Thành viên" value={memberCount} />
        {me.canViewStaff ? <Stat label="Việc đang làm" value={inProgress} /> : null}
        {me.canViewStaff ? <Stat label="Quá hạn" value={overdue} /> : null}
        {me.canViewMedia ? <Stat label="Content chờ duyệt" value={pendingContent} /> : null}
      </div>

      <section className="mt-8">
        <h2 className="font-display text-2xl">Sự kiện sắp tới</h2>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          {events.length === 0 ? <p className="text-muted">Chưa có sự kiện công bố.</p> : null}
          {events.map((e) => (
            <Link key={e.id} to="/events/$id" params={{ id: e.id }} className="card-paper block p-5 hover:border-ink/30">
              <p className="font-display text-xl break-words">{e.title}</p>
              <p className="mt-1 text-sm text-muted">{formatDateTime(e.start_at)} · {e.location || "—"}</p>
            </Link>
          ))}
        </div>
      </section>

      {me.canViewStaff ? (
        <section className="mt-8">
          <h2 className="font-display text-2xl">Việc của bạn</h2>
          <div className="mt-3 space-y-3">
            {myTasks.length === 0 ? <p className="text-muted">Không có việc đang mở.</p> : null}
            {myTasks.map((t) => (
              <div key={t.id} className="card-paper flex flex-wrap items-center justify-between gap-3 p-4">
                <div>
                  <p className="font-medium break-words">{t.title}</p>
                  <p className="text-xs text-muted">{t.priority} · {t.status}</p>
                </div>
                {t.status === "TODO" ? (
                  <Button onClick={() => confirm(t.id, "IN_PROGRESS")}>Xác nhận đang làm</Button>
                ) : (
                  <Button variant="ink" onClick={() => confirm(t.id, "COMPLETED")}>Xác nhận hoàn thành</Button>
                )}
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section className="mt-8">
        <h2 className="font-display text-2xl">Bảng tin</h2>
        <div className="mt-3 space-y-3">
          {announcements.map((a) => (
            <article key={a.id} className="card-paper p-5">
              <p className="font-display text-lg break-words">{a.title}</p>
              <p className="mt-1 whitespace-pre-wrap break-words text-muted">{a.body}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="card-paper p-5">
      <p className="kicker">{label}</p>
      <p className="mt-2 font-display text-4xl tabular-nums">{value}</p>
    </div>
  );
}
