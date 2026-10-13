import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { Field } from "@/components/field";
import { EmptyState } from "@/components/empty-state";
import { SemesterBar } from "@/components/semester-bar";
import { Button } from "@/components/ui/button";
import { Input, Select, Textarea } from "@/components/ui/input";
import { EVENT_STATUS, EVENT_TYPES, LIMITS, labelOf } from "@/lib/constants";
import { getMe, listEvents, listSemesters, saveEvent } from "@/lib/server/fns";
import { CoverFrame } from "@/components/cover-frame";
import { compressImage, errorMessage, toLocalInput } from "@/lib/utils";
import { formatDateTime } from "@/lib/format";
import { useRpc } from "@/lib/use-rpc";

export const Route = createFileRoute("/_app/events/")({ component: Events });

function Events() {
  const me = useRpc(() => getMe());
  const sem = useRpc(() => listSemesters());
  const [semesterId, setSemesterId] = useState("");
  const { data, loading, err, reload } = useRpc(
    () => (semesterId ? listEvents({ data: { semesterId } }) : Promise.resolve([])),
    [semesterId],
  );
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  const [cover, setCover] = useState("");
  const [coverPos, setCoverPos] = useState("50% 50%");

  useEffect(() => {
    if (semesterId || !sem.data?.defaultId) return;
    setSemesterId(sem.data.defaultId);
  }, [sem.data, semesterId]);

  if (loading || me.loading || sem.loading) return <p className="text-muted">Đang tải sự kiện…</p>;
  if (err) return <p className="text-accent">{err}</p>;
  const can = me.data?.canCreateEvent;
  const semesters = sem.data?.semesters ?? [];

  async function onCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!semesterId) {
      toast.error("Chọn hoặc tạo học kỳ trước.");
      return;
    }
    const fd = new FormData(e.currentTarget);
    try {
      const saved = await saveEvent({
        data: {
          title: String(fd.get("title") || ""),
          description: String(fd.get("description") || ""),
          event_type: String(fd.get("event_type") || "CULTURE"),
          status: String(fd.get("status") || "UPCOMING"),
          location: String(fd.get("location") || ""),
          start_at: new Date(String(fd.get("start_at"))).toISOString(),
          end_at: fd.get("end_at") ? new Date(String(fd.get("end_at"))).toISOString() : undefined,
          cover_url: cover || undefined,
          cover_pos: coverPos,
          is_public: fd.get("is_public") === "on",
          semesterId,
        },
      });
      toast.success("Đã lưu sự kiện.");
      setOpen(false);
      reload();
      await nav({ to: "/events/$id", params: { id: saved.id } });
    } catch (er) {
      toast.error(errorMessage(er));
    }
  }

  return (
    <div>
      <PageHeader
        kicker="Hoạt động"
        title="Sự kiện"
        desc="Chọn học kỳ rồi tạo sự kiện. Sự kiện hiện có thuộc Học kỳ 1 26-27."
        action={can && semesterId ? <Button onClick={() => setOpen((v) => !v)}>{open ? "Đóng form" : "Tạo sự kiện"}</Button> : undefined}
      />
      <SemesterBar
        semesters={semesters}
        value={semesterId}
        onChange={(id) => { setSemesterId(id); setOpen(false); }}
        canCreate={can}
        onCreated={() => sem.reload()}
        emptyHint="Tạo học kỳ trước, rồi mới tạo sự kiện."
      />
      {open && can && semesterId ? (
        <form onSubmit={onCreate} className="card-paper mb-6 grid gap-3 p-5 md:grid-cols-2">
          <p className="md:col-span-2 text-sm text-muted">Học kỳ: {semesters.find((s) => s.id === semesterId)?.name}</p>
          <Field label="Tên sự kiện"><Input name="title" required maxLength={LIMITS.title} /></Field>
          <Field label="Địa điểm"><Input name="location" /></Field>
          <Field label="Loại">
            <Select name="event_type">{EVENT_TYPES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}</Select>
          </Field>
          <Field label="Trạng thái">
            <Select name="status">{EVENT_STATUS.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}</Select>
          </Field>
          <Field label="Bắt đầu"><Input name="start_at" type="datetime-local" required defaultValue={toLocalInput(new Date())} /></Field>
          <Field label="Kết thúc"><Input name="end_at" type="datetime-local" /></Field>
          <div className="md:col-span-2">
            <Field label="Mô tả"><Textarea name="description" maxLength={LIMITS.description} /></Field>
          </div>
          <Field label="Ảnh bìa">
            <Input type="file" accept="image/*" onChange={async (e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              setCover(await compressImage(f));
            }} />
          </Field>
          {cover ? <CoverFrame src={cover} position={coverPos} onChange={setCoverPos} /> : null}
          <label className="flex items-center gap-2 text-sm md:col-span-2">
            <input type="checkbox" name="is_public" /> Hiện cho thành viên
          </label>
          <div className="flex gap-2 md:col-span-2">
            <Button type="submit">Lưu</Button>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Hủy</Button>
          </div>
        </form>
      ) : null}
      {!semesterId ? <EmptyState title="Chọn học kỳ" hint={can ? "Tạo học kỳ nếu chưa có, rồi tạo sự kiện." : "Chưa có học kỳ để xem."} /> : (data ?? []).length === 0 ? <EmptyState title="Chưa có sự kiện trong học kỳ này" hint={can ? "Bấm Tạo sự kiện." : undefined} /> : (
        <div className="grid gap-3 md:grid-cols-2">
          {(data ?? []).map((e) => (
            <Link key={e.id} to="/events/$id" params={{ id: e.id }} className="card-paper overflow-hidden hover:border-ink/30">
              {e.cover_url ? <img src={e.cover_url} alt="" className="h-36 w-full object-cover" style={{ objectPosition: e.cover_pos || "50% 50%" }} /> : null}
              <div className="p-5">
                <p className="font-display text-xl break-words">{e.title}</p>
                <p className="mt-1 text-sm text-muted">{formatDateTime(e.start_at)} · {labelOf(EVENT_TYPES, e.event_type)}</p>
                <p className="mt-2 text-xs">{labelOf(EVENT_STATUS, e.status)} · {e.is_public ? "Đã công bố" : "Nháp / ẩn"}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
