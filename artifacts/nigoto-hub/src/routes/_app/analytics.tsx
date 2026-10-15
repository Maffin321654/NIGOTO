import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { Toggle } from "@/components/toggle";
import { STATUS_LABEL, TASK_STATUS, labelOf } from "@/lib/constants";
import { formatDateTime } from "@/lib/format";
import { getAnalytics, setSignupOpen } from "@/lib/server/fns";
import { errorMessage } from "@/lib/utils";
import { useRpc } from "@/lib/use-rpc";

export const Route = createFileRoute("/_app/analytics")({ component: Analytics });

function Analytics() {
  const { data, loading, err, reload } = useRpc(() => getAnalytics());
  if (loading) return <p className="text-muted">Đang tải thống kê…</p>;
  if (err || !data) return <p className="text-accent">{err}</p>;
  const max = Math.max(1, ...data.byDept.map((d) => d.n));

  return (
    <div>
      <PageHeader kicker="Số liệu" title="Thống kê" desc="Thành viên theo ban và trạng thái công việc." />
      {data.me.isPresident && data.signupOpen != null ? (
        <div className="card-paper mb-4 p-6">
          <p className="kicker">Chủ nhiệm</p>
          <p className="mt-1 font-display text-xl">Nhận đăng ký thành viên mới</p>
          <p className="mt-1 text-sm text-muted">Tắt thì không ai tạo được tài khoản mới. Người đã có tài khoản vẫn đăng nhập bình thường.</p>
          <div className="mt-4">
            <Toggle
              on={data.signupOpen}
              label={data.signupOpen ? "Đang nhận đăng ký" : "Đã đóng đăng ký"}
              onChange={async (v) => {
                try {
                  await setSignupOpen({ data: { open: v } });
                  toast.success(v ? "Đã mở nhận đăng ký." : "Đã đóng nhận đăng ký.");
                  reload();
                } catch (e) {
                  toast.error(errorMessage(e));
                }
              }}
            />
          </div>
        </div>
      ) : null}
      <div className="card-paper p-6">
        <p className="kicker">Thành viên theo ban</p>
        <div className="mt-4 space-y-4">
          {data.byDept.map((d) => (
            <div key={d.name}>
              <div className="flex justify-between text-sm">
                <span className="font-medium">{d.name === "Ban Thành viên" ? "Thành viên" : d.name}</span>
                <span className="tabular-nums">{d.n}</span>
              </div>
              <div className="bar-track mt-1"><div className="bar-fill" style={{ width: `${(d.n / max) * 100}%` }} /></div>
            </div>
          ))}
        </div>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        {data.byStatus.map((s) => (
          <div key={s.status} className="card-paper p-5">
            <p className="kicker">{STATUS_LABEL[s.status] ?? s.status}</p>
            <p className="font-display text-3xl tabular-nums">{s.n}</p>
          </div>
        ))}
        <div className="card-paper p-5"><p className="kicker">Sự kiện</p><p className="font-display text-3xl tabular-nums">{data.events}</p></div>
        <div className="card-paper p-5"><p className="kicker">Task quá hạn</p><p className="font-display text-3xl tabular-nums">{data.overdue}</p></div>
      </div>
      <div className="card-paper mt-4 p-6">
        <p className="kicker">Công việc theo trạng thái</p>
        <div className="mt-3 space-y-2">
          {data.tasks.map((t) => (
            <div key={t.status} className="flex justify-between text-sm">
              <span>{labelOf(TASK_STATUS, t.status)}</span>
              <span className="tabular-nums">{t.n}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="card-paper mt-4 p-6">
        <p className="kicker">Nhật ký</p>
        <div className="mt-3 space-y-2 text-sm">
          {data.logs.map((l) => (
            <p key={l.id} className="text-muted">{formatDateTime(l.created_at)} · {l.actor || "—"} · {l.action} {l.entity}</p>
          ))}
        </div>
      </div>
    </div>
  );
}
