import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { CalendarClock } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Field } from "@/components/field";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Input, Select, Textarea } from "@/components/ui/input";
import { CONTENT_STATUS, CONTENT_TYPES, LIMITS, PLATFORMS, labelOf } from "@/lib/constants";
import { formatDateTime } from "@/lib/format";
import { deleteContent, getMe, listContent, listEvents, reviewContent, saveContent } from "@/lib/server/fns";
import { errorMessage, toLocalInput } from "@/lib/utils";
import { useRpc } from "@/lib/use-rpc";

export const Route = createFileRoute("/_app/media")({ component: Media });

function Media() {
  const me = useRpc(() => getMe());
  const { data, loading, err, reload } = useRpc(() => listContent());
  const events = useRpc(() => listEvents({ data: {} }));
  const [open, setOpen] = useState(true);
  const [publishAt, setPublishAt] = useState(() => toLocalInput(new Date(Date.now() + 3600_000)));

  const can = me.data?.canCreateContent ?? data?.me.canCreateContent;

  async function onCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const publish = String(fd.get("publish_at") || publishAt || "");
    if (!publish) {
      toast.error("Phải chọn ngày giờ đăng trên lịch.");
      return;
    }
    try {
      await saveContent({
        data: {
          title: String(fd.get("title") || ""),
          caption: String(fd.get("caption") || ""),
          platform: String(fd.get("platform") || "FACEBOOK"),
          content_type: String(fd.get("content_type") || "POSTER"),
          publish_at: new Date(publish).toISOString(),
          event_id: String(fd.get("event_id") || "") || undefined,
          status: String(fd.get("status") || "IDEA"),
        },
      });
      toast.success("Đã tạo content và ghi vào lịch đăng.");
      setOpen(false);
      reload();
    } catch (er) {
      toast.error(errorMessage(er));
    }
  }

  return (
    <div>
      <PageHeader
        kicker="Truyền thông"
        title="Media Center"
        desc="Tạo content, bắt buộc chọn ngày giờ đăng — mục sẽ hiện trên lịch CLB."
        action={can ? <Button onClick={() => setOpen((v) => !v)}>{open ? "Đóng form" : "Tạo content"}</Button> : undefined}
      />

      {can && open ? (
        <form onSubmit={onCreate} className="card-paper mb-6 grid gap-3 p-5 md:grid-cols-2">
          <Field label="Tiêu đề">
            <Input name="title" required maxLength={LIMITS.title} placeholder="Poster Tanabata" />
          </Field>
          <Field label="Nền tảng">
            <Select name="platform">{PLATFORMS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}</Select>
          </Field>
          <Field label="Loại nội dung">
            <Select name="content_type">{CONTENT_TYPES.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}</Select>
          </Field>
          <label className="block space-y-1.5 text-sm">
            <span className="flex items-center gap-2 font-medium text-ink">
              <CalendarClock className="size-4 text-accent" />
              Ngày giờ đăng (lịch) *
            </span>
            <Input
              name="publish_at"
              type="datetime-local"
              required
              value={publishAt}
              onChange={(e) => setPublishAt(e.target.value)}
            />
            <span className="text-xs text-muted">Bắt buộc. Content sẽ hiện trên trang Lịch đúng ngày giờ này.</span>
          </label>
          <Field label="Gắn sự kiện (tuỳ chọn)">
            <Select name="event_id">
              <option value="">Không gắn</option>
              {(events.data ?? []).map((ev) => <option key={ev.id} value={ev.id}>{ev.title}</option>)}
            </Select>
          </Field>
          <Field label="Trạng thái ban đầu">
            <Select name="status">
              <option value="IDEA">Ý tưởng</option>
              <option value="SUBMITTED">Gửi duyệt ngay</option>
            </Select>
          </Field>
          <div className="md:col-span-2">
            <Field label="Caption / mô tả"><Textarea name="caption" maxLength={LIMITS.description} required /></Field>
          </div>
          <div className="flex flex-wrap items-center gap-2 md:col-span-2">
            <Button type="submit">Lưu content vào lịch</Button>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Hủy</Button>
            <Link to="/calendar" className="text-sm text-muted underline">Xem lịch CLB</Link>
          </div>
        </form>
      ) : null}

      {loading && !data ? <p className="text-muted">Đang tải Media Center…</p> : null}
      {err ? <p className="text-accent">{err}</p> : null}

      {(data?.items.length ?? 0) === 0 && !loading ? (
        <EmptyState title="Chưa có content" hint="Bấm Tạo content, điền ngày giờ đăng trên lịch." />
      ) : (
        <div className="space-y-3">
          {(data?.items ?? []).map((c) => (
            <article key={c.id} className="card-paper p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-display text-xl break-words">{c.title}</p>
                  <p className="text-sm text-muted">
                    {labelOf(PLATFORMS, c.platform)} · {labelOf(CONTENT_TYPES, c.content_type)} · {labelOf(CONTENT_STATUS, c.status)}
                  </p>
                  <p className="mt-1 text-sm">
                    <span className="text-muted">Lịch đăng: </span>
                    {c.publish_at ? formatDateTime(c.publish_at) : "Chưa đặt"}
                  </p>
                  <p className="mt-2 whitespace-pre-wrap break-words text-sm">{c.caption}</p>
                </div>
                {can ? (
                  <div className="flex flex-wrap gap-2">
                    {c.status === "IDEA" || c.status === "CHANGES" ? (
                      <Button variant="ghost" onClick={async () => { await reviewContent({ data: { id: c.id, action: "SUBMIT", comment: "" } }); reload(); }}>Gửi duyệt</Button>
                    ) : null}
                    {c.status === "SUBMITTED" ? (
                      <>
                        <Button onClick={async () => { await reviewContent({ data: { id: c.id, action: "APPROVE", comment: "OK" } }); reload(); }}>Duyệt</Button>
                        <Button variant="ghost" onClick={async () => {
                          const comment = prompt("Ghi chú yêu cầu sửa") || "";
                          if (!comment) return;
                          await reviewContent({ data: { id: c.id, action: "CHANGES", comment } });
                          reload();
                        }}>Yêu cầu sửa</Button>
                        <Button variant="danger" onClick={async () => {
                          const comment = prompt("Lý do từ chối") || "";
                          if (!comment) return;
                          await reviewContent({ data: { id: c.id, action: "REJECT", comment } });
                          reload();
                        }}>Từ chối</Button>
                      </>
                    ) : null}
                    <Button variant="ghost" onClick={async () => { if (!confirm("Xóa content này?")) return; await deleteContent({ data: { id: c.id } }); reload(); }}>Xóa</Button>
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
