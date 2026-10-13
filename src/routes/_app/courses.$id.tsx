import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { Field } from "@/components/field";
import { Button } from "@/components/ui/button";
import { Input, Select, Textarea } from "@/components/ui/input";
import { COURSE_ITEM_KINDS, LIMITS, normalizeCourseKind } from "@/lib/constants";
import { deleteCourse, deleteCourseItem, getCourse, saveCourseItem, setCoursePublic } from "@/lib/server/fns";
import { errorMessage, googleDrivePreviewSrc, isGoogleDriveUrl, validateDesc } from "@/lib/utils";
import { useRpc } from "@/lib/use-rpc";

export const Route = createFileRoute("/_app/courses/$id")({ component: CourseDetail });

function CourseDetail() {
  const { id } = Route.useParams();
  const { data, loading, err, reload } = useRpc(() => getCourse({ data: { id } }), [id]);
  const [kind, setKind] = useState<"VIDEO" | "DOC">("VIDEO");
  if (loading) return <p className="text-muted">Đang tải khóa…</p>;
  if (err || !data) return <p className="text-accent">{err}</p>;

  async function addItem(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const nextKind = String(fd.get("kind") || "VIDEO") === "VIDEO" ? "VIDEO" : "DOC";
    const url = String(fd.get("media_url") || "").trim();
    if (nextKind === "VIDEO") {
      if (!isGoogleDriveUrl(url)) {
        toast.error("Bài video chỉ nhận link Google Drive.");
        return;
      }
    }
    const extra = nextKind === "VIDEO"
      ? JSON.stringify({ description: validateDesc(String(fd.get("body") || "")) })
      : String(fd.get("body") || "").trim();
    try {
      await saveCourseItem({
        data: {
          courseId: id,
          kind: nextKind,
          title: String(fd.get("title") || ""),
          media_url: url || undefined,
          extra: extra || undefined,
        },
      });
      toast.success("Đã thêm bài.");
      (e.target as HTMLFormElement).reset();
      setKind("VIDEO");
      reload();
    } catch (er) { toast.error(errorMessage(er)); }
  }

  return (
    <div>
      <PageHeader kicker="Chi tiết khóa" title={data.title} desc={data.description} />
      {data.canEdit ? (
        <div className="mb-4 flex gap-2">
          <Button variant="ink" onClick={async () => { await setCoursePublic({ data: { id, is_public: !data.is_public } }); reload(); }}>{data.is_public ? "Ẩn khóa" : "Công bố"}</Button>
          <Button variant="danger" onClick={async () => { if (!confirm("Xóa khóa này?")) return; await deleteCourse({ data: { id } }); window.location.assign("/courses"); }}>Xóa</Button>
        </div>
      ) : null}
      <div className="space-y-3">
        {data.items.map((it) => {
          const type = normalizeCourseKind(it.kind);
          const extra = it.extra ? formatExtra(it.extra) : "";
          return (
            <article key={it.id} className="card-paper p-5">
              <p className="kicker">{type === "VIDEO" ? "Video" : "Tài liệu"}</p>
              <p className="font-display text-xl break-words">{it.title}</p>
              {type === "VIDEO" && it.media_url ? (
                googleDrivePreviewSrc(it.media_url) ? (
                  <iframe
                    title={it.title}
                    src={googleDrivePreviewSrc(it.media_url)!}
                    className="mt-3 h-64 w-full rounded-xl border border-line bg-paper-2"
                    allow="autoplay"
                  />
                ) : (
                  <a className="mt-2 inline-block text-accent underline break-all" href={it.media_url} target="_blank" rel="noreferrer">Mở Google Drive</a>
                )
              ) : null}
              {type === "DOC" && it.media_url ? (
                <a className="mt-2 inline-block text-accent underline break-all" href={it.media_url} target="_blank" rel="noreferrer">Mở tài liệu</a>
              ) : null}
              {extra ? <p className="mt-2 text-sm whitespace-pre-wrap break-words">{extra}</p> : null}
              {data.canEdit ? <Button variant="ghost" className="mt-2" onClick={async () => { await deleteCourseItem({ data: { id: it.id } }); reload(); }}>Xóa bài</Button> : null}
            </article>
          );
        })}
      </div>
      {data.canEdit ? (
        <form onSubmit={addItem} className="card-paper mt-6 grid gap-3 p-5 md:grid-cols-2">
          <Field label="Loại bài">
            <Select name="kind" value={kind} onChange={(e) => setKind(e.target.value === "VIDEO" ? "VIDEO" : "DOC")}>
              {COURSE_ITEM_KINDS.map((k) => <option key={k.id} value={k.id}>{k.label}</option>)}
            </Select>
          </Field>
          <Field label="Tiêu đề bài"><Input name="title" required /></Field>
          {kind === "VIDEO" ? (
            <>
              <div className="md:col-span-2">
                <Field label="Link Google Drive">
                  <Input name="media_url" required placeholder="https://drive.google.com/file/d/…" />
                </Field>
              </div>
              <div className="md:col-span-2">
                <Field label="Mô tả">
                  <Textarea name="body" rows={3} maxLength={LIMITS.description} placeholder="Nội dung video, ghi chú cho thành viên…" />
                </Field>
              </div>
            </>
          ) : (
            <>
              <div className="md:col-span-2">
                <Field label="Link tài liệu (tuỳ chọn)">
                  <Input name="media_url" placeholder="https://…" />
                </Field>
              </div>
              <div className="md:col-span-2">
                <Field label="Nội dung / ghi chú">
                  <Textarea name="body" rows={4} placeholder="Tóm tắt, hướng dẫn, ghi chú…" />
                </Field>
              </div>
            </>
          )}
          <Button type="submit">Thêm bài</Button>
        </form>
      ) : null}
      <p className="mt-4"><Link to="/courses" className="text-sm underline">← Khóa học</Link></p>
    </div>
  );
}

function formatExtra(s: string) {
  try {
    const o = JSON.parse(s) as { word?: string; reading?: string; meaning?: string; example?: string; description?: string };
    if (o && typeof o.description === "string") return o.description;
    if (o && (o.word || o.meaning)) {
      return [o.word, o.reading ? `（${o.reading}）` : "", o.meaning ? `— ${o.meaning}` : "", o.example].filter(Boolean).join(" ");
    }
  } catch { /* plain text */ }
  return s;
}
