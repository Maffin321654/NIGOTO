import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { QrBlock } from "@/components/qr-block";
import { SemesterBar } from "@/components/semester-bar";
import { Toggle } from "@/components/toggle";
import { EmptyState } from "@/components/empty-state";
import { formatDateTime } from "@/lib/format";
import { listAttendanceEvents, listSemesters, setCheckinOpen, setJoinOpen } from "@/lib/server/fns";
import { useRpc } from "@/lib/use-rpc";

export const Route = createFileRoute("/_app/attendance")({ component: Attendance });

function Attendance() {
  const sem = useRpc(() => listSemesters());
  const [semesterId, setSemesterId] = useState("");
  const { data, loading, err, reload } = useRpc(
    () => (semesterId ? listAttendanceEvents({ data: { semesterId } }) : Promise.resolve(null)),
    [semesterId],
  );

  useEffect(() => {
    if (semesterId || !sem.data?.defaultId) return;
    setSemesterId(sem.data.defaultId);
  }, [sem.data, semesterId]);

  if (loading || sem.loading) return <p className="text-muted">Đang tải điểm danh…</p>;
  if (err) return <p className="text-accent">{err}</p>;
  const staff = data?.me.canToggleCheckin ?? sem.data?.me.canToggleCheckin ?? false;
  const canCreate = data?.me.canCreateEvent ?? sem.data?.me.canCreateEvent ?? false;
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const events = data?.events ?? [];

  return (
    <div>
      <PageHeader
        kicker="Check-in"
        title="Điểm danh"
        desc={staff ? "Chọn học kỳ. QR chỉ hiện với ban quản trị." : "Chọn học kỳ rồi quét QR do ban quản trị đưa."}
      />
      <SemesterBar
        semesters={sem.data?.semesters ?? []}
        value={semesterId}
        onChange={setSemesterId}
        canCreate={canCreate}
        onCreated={() => sem.reload()}
      />
      { !semesterId ? (
        <EmptyState title="Chọn học kỳ" hint={canCreate ? "Tạo học kỳ nếu chưa có." : undefined} />
      ) : events.length === 0 ? (
        <EmptyState title="Không có sự kiện trong học kỳ này" />
      ) : (
        <div className="space-y-4">
          {events.map((e) => (
            <article key={e.id} className="card-paper p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <Link to="/events/$id" params={{ id: e.id }} className="font-display text-2xl hover:underline">{e.title}</Link>
                  <p className="text-sm text-muted">{formatDateTime(e.start_at)} · {e.location || "—"}</p>
                  {staff ? <p className="mt-1 text-sm">Đã điểm danh: {e.attended_count}</p> : (
                    <p className="mt-3 font-medium">{e.attended ? "Đã điểm danh" : "Quét mã QR do ban quản trị"}</p>
                  )}
                </div>
                {staff ? (
                  <div className="flex flex-col items-end gap-3">
                    <Toggle
                      on={e.join_open !== false}
                      onChange={async (v) => { await setJoinOpen({ data: { id: e.id, open: v } }); reload(); }}
                      label={e.join_open !== false ? "Nhận thêm đăng ký" : "Dừng nhận đăng ký"}
                    />
                    <Toggle
                      on={e.checkin_open}
                      onChange={async (v) => { await setCheckinOpen({ data: { id: e.id, open: v } }); reload(); }}
                      label={e.checkin_open ? "Nhận thêm điểm danh" : "Dừng nhận điểm danh"}
                    />
                    {origin ? <QrBlock value={`${origin}/checkin/${e.id}`} /> : null}
                  </div>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
