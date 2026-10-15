import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { Field } from "@/components/field";
import { QrBlock } from "@/components/qr-block";
import { Toggle } from "@/components/toggle";
import { Button } from "@/components/ui/button";
import { Input, Select, Textarea } from "@/components/ui/input";
import { EVENT_STATUS, EVENT_TYPES, LIMITS, labelOf } from "@/lib/constants";
import { formatDateTime } from "@/lib/format";
import { deleteEvent, getEvent, joinEvent, saveEvent, setCheckinOpen, setEventPublic, setEventStatus, setJoinOpen } from "@/lib/server/fns";
import { CoverFrame, coverPosition } from "@/components/cover-frame";
import { compressImage, errorMessage, toLocalInput } from "@/lib/utils";
import { useRpc } from "@/lib/use-rpc";

export const Route = createFileRoute("/_app/events/$id")({ component: EventDetail });

function EventDetail() {
  const { id } = Route.useParams();
  const { data, loading, err, reload } = useRpc(() => getEvent({ data: { id } }), [id]);
  const [editing, setEditing] = useState(false);
  const [cover, setCover] = useState("");
  const [coverPos, setCoverPos] = useState("50% 50%");
  const [busy, setBusy] = useState(false);
  if (loading) return <p className="text-muted">Đang tải sự kiện…</p>;
  if (err || !data) return <p className="text-accent">{err}</p>;

  const qrUrl = typeof window !== "undefined" ? `${window.location.origin}/checkin/${data.id}` : "";

  async function onSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setBusy(true);
    try {
      await saveEvent({
        data: {
          id,
          title: String(fd.get("title") || ""),
          description: String(fd.get("description") || ""),
          event_type: String(fd.get("event_type") || data!.event_type),
          status: data!.status,
          location: String(fd.get("location") || ""),
          start_at: new Date(String(fd.get("start_at"))).toISOString(),
          end_at: fd.get("end_at") ? new Date(String(fd.get("end_at"))).toISOString() : undefined,
          cover_url: cover,
          cover_pos: coverPos,
        },
      });
      toast.success("Đã cập nhật sự kiện.");
      setEditing(false);
      reload();
    } catch (er) {
      toast.error(errorMessage(er));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <PageHeader kicker="Chi tiết sự kiện" title={data.title} desc={`${formatDateTime(data.start_at)} · ${data.location || "—"}`} />
      {editing && data.canEditContent ? (
        <form onSubmit={onSave} className="card-paper mb-5 grid gap-3 p-5 md:grid-cols-2">
          <Field label="Tên sự kiện"><Input name="title" required maxLength={LIMITS.title} defaultValue={data.title} /></Field>
          <Field label="Địa điểm"><Input name="location" defaultValue={data.location || ""} /></Field>
          <Field label="Loại">
            <Select name="event_type" defaultValue={data.event_type}>
              {EVENT_TYPES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
            </Select>
          </Field>
          <Field label="Bắt đầu"><Input name="start_at" type="datetime-local" required defaultValue={toLocalInput(data.start_at)} /></Field>
          <Field label="Kết thúc"><Input name="end_at" type="datetime-local" defaultValue={toLocalInput(data.end_at)} /></Field>
          <div className="md:col-span-2">
            <Field label="Nội dung"><Textarea name="description" maxLength={LIMITS.description} defaultValue={data.description || ""} /></Field>
          </div>
          <Field label="Ảnh bìa">
            <Input type="file" accept="image/*" onChange={async (ev) => {
              const f = ev.target.files?.[0];
              if (!f) return;
              setCover(await compressImage(f));
            }} />
          </Field>
          <div className="flex items-end">
            {cover ? <Button type="button" variant="ghost" onClick={() => setCover("")}>Bỏ ảnh</Button> : null}
          </div>
          {cover ? <CoverFrame src={cover} position={coverPos} onChange={setCoverPos} /> : null}
          <div className="flex gap-2 md:col-span-2">
            <Button type="submit" disabled={busy}>Lưu</Button>
            <Button type="button" variant="ghost" onClick={() => setEditing(false)}>Hủy</Button>
          </div>
        </form>
      ) : (
        <>
          {data.cover_url ? <img src={data.cover_url} alt="" className="mb-5 h-48 w-full rounded-3xl object-cover sm:h-64" style={{ objectPosition: coverPosition(data.cover_pos) }} /> : null}
          <p className="max-w-3xl whitespace-pre-wrap break-words text-muted">{data.description}</p>
        </>
      )}
      <p className="mt-2 text-sm">{data.semesterName ? `${data.semesterName} · ` : ""}{labelOf(EVENT_TYPES, data.event_type)} · {labelOf(EVENT_STATUS, data.status)} · {data.is_public ? "Đã công bố" : "Chưa công bố"}</p>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        {!data.iJoined ? (
          data.join_open !== false ? (
            <Button onClick={async () => { try { await joinEvent({ data: { id } }); toast.success("Đã đăng ký tham gia."); reload(); } catch (e) { toast.error(errorMessage(e)); } }}>Tham gia</Button>
          ) : (
            <span className="self-center text-sm text-muted">Đăng ký đã đóng.</span>
          )
        ) : <span className="self-center text-sm text-muted">Bạn đã đăng ký.</span>}
        {data.canEditContent ? (
          <Button
            variant="ghost"
            onClick={() => {
              setCover(data.cover_url || "");
              setCoverPos(coverPosition(data.cover_pos));
              setEditing((v) => !v);
            }}
          >
            {editing ? "Đóng sửa" : "Sửa nội dung"}
          </Button>
        ) : null}
        {data.canEdit ? (
          <label className="flex min-h-11 items-center gap-2 rounded-full border border-line bg-paper-3 px-3 text-sm">
            <span className="text-muted">Trạng thái</span>
            <Select
              className="min-h-0 w-auto border-0 bg-transparent px-0 py-0"
              value={data.status}
              onChange={async (e) => {
                try {
                  await setEventStatus({ data: { id, status: e.target.value } });
                  toast.success("Đã đổi trạng thái.");
                  reload();
                } catch (er) {
                  toast.error(errorMessage(er));
                }
              }}
            >
              {EVENT_STATUS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
            </Select>
          </label>
        ) : null}
        {data.canPublish ? (
          <Button variant="ink" onClick={async () => { await setEventPublic({ data: { id, is_public: !data.is_public } }); reload(); }}>
            {data.is_public ? "Ẩn sự kiện" : "Công bố"}
          </Button>
        ) : null}
        {data.canEdit ? (
          <Button variant="danger" onClick={async () => {
            if (!confirm("Xóa sự kiện này?")) return;
            await deleteEvent({ data: { id } });
            window.location.assign("/events");
          }}>Xóa</Button>
        ) : null}
      </div>
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <div className="card-paper p-5"><p className="kicker">Đăng ký</p><p className="font-display text-3xl tabular-nums">{data.joined}</p></div>
        <div className="card-paper p-5"><p className="kicker">Đã điểm danh</p><p className="font-display text-3xl tabular-nums">{data.attended}</p></div>
        <div className="card-paper p-5"><p className="kicker">Bạn</p><p>{data.iAttended ? "Đã điểm danh" : "Chưa điểm danh"}</p></div>
      </div>
      {data.canCheckinToggle ? (
        <div className="card-paper mt-6 grid gap-4 p-5 md:grid-cols-2">
          <div>
            <Toggle
              on={data.join_open !== false}
              onChange={async (v) => { await setJoinOpen({ data: { id, open: v } }); reload(); }}
              label={data.join_open !== false ? "Nhận thêm đăng ký" : "Dừng nhận đăng ký"}
            />
            <Toggle
              on={data.checkin_open}
              onChange={async (v) => { await setCheckinOpen({ data: { id, open: v } }); reload(); }}
              label={data.checkin_open ? "Nhận thêm điểm danh" : "Dừng nhận điểm danh"}
            />
            <p className="mt-2 text-sm text-muted">QR chỉ hiện với ban quản trị. Thành viên quét mã này trên điện thoại.</p>
          </div>
          {qrUrl ? <QrBlock value={qrUrl} label={qrUrl} /> : null}
          <div className="md:col-span-2">
            <div className="hidden grid-cols-12 gap-2 border-b border-line pb-2 text-xs uppercase tracking-wider text-muted md:grid">
              <span className="col-span-4">Họ tên</span>
              <span className="col-span-2">MSSV</span>
              <span className="col-span-4">Ban</span>
              <span className="col-span-2 text-right">Điểm danh</span>
            </div>
            <div className="space-y-0">
              {data.people.map((p) => (
                <div key={p.user_id} className="grid grid-cols-1 gap-0.5 border-b border-line py-2 last:border-0 md:grid-cols-12 md:items-center md:gap-2">
                  <Link to="/members/$id" params={{ id: p.user_id }} className="font-medium hover:underline md:col-span-4">{p.full_name}</Link>
                  <span className="font-mono text-sm text-muted md:col-span-2">{p.student_id || "—"}</span>
                  <span className="text-sm text-muted md:col-span-4">{p.depts || "—"}</span>
                  <span className="text-sm text-muted md:col-span-2 md:text-right">{p.checked_at ? "Đã điểm danh" : "Chưa"}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}
      <p className="mt-4"><Link to="/events" className="text-sm underline">← Sự kiện</Link></p>
    </div>
  );
}
