import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { Field } from "@/components/field";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { LIMITS } from "@/lib/constants";
import { formatDateTime } from "@/lib/format";
import { deleteAnnouncement, listAnnouncements, listNotifications, markNotificationsRead, saveAnnouncement } from "@/lib/server/fns";
import { errorMessage } from "@/lib/utils";
import { useRpc } from "@/lib/use-rpc";

export const Route = createFileRoute("/_app/notifications")({ component: Notes });

function Notes() {
  const board = useRpc(() => listAnnouncements());
  const box = useRpc(() => listNotifications());
  if (board.loading || box.loading) return <p className="text-muted">Đang tải thông báo…</p>;

  async function post(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    try {
      await saveAnnouncement({ data: { title: String(fd.get("title") || ""), body: String(fd.get("body") || "") } });
      toast.success("Đã đăng bảng tin.");
      board.reload();
      box.reload();
      (e.target as HTMLFormElement).reset();
    } catch (er) { toast.error(errorMessage(er)); }
  }

  return (
    <div>
      <PageHeader
        kicker="Hộp thư"
        title="Thông báo"
        desc="Bảng tin CLB và thư riêng."
        action={box.data?.unread ? <Button variant="ghost" onClick={async () => { await markNotificationsRead(); box.reload(); }}>Đánh dấu đã đọc</Button> : undefined}
      />
      {board.data?.me.canAnnounce ? (
        <form onSubmit={post} className="card-paper mb-6 space-y-3 p-5">
          <Field label="Tiêu đề bảng tin"><Input name="title" required maxLength={LIMITS.title} /></Field>
          <Field label="Nội dung"><Textarea name="body" required maxLength={LIMITS.description} /></Field>
          <Button type="submit">Đăng bảng tin</Button>
        </form>
      ) : null}
      <h2 className="font-display text-2xl">Bảng tin</h2>
      <div className="mt-3 space-y-3">
        {(board.data?.rows ?? []).map((a) => (
          <article key={a.id} className="card-paper p-5">
            <p className="font-display text-xl break-words">{a.title}</p>
            <p className="text-xs text-muted">{a.author} · {formatDateTime(a.created_at)}</p>
            <p className="mt-2 whitespace-pre-wrap break-words">{a.body}</p>
            {board.data?.me.canAnnounce ? <Button variant="ghost" className="mt-2" onClick={async () => { await deleteAnnouncement({ data: { id: a.id } }); board.reload(); }}>Xóa</Button> : null}
          </article>
        ))}
      </div>
      <h2 className="mt-8 font-display text-2xl">Hộp thư của bạn</h2>
      <div className="mt-3 space-y-2">
        {(box.data?.rows ?? []).map((n) => (
          <article key={n.id} className={`card-paper p-4 ${n.read_at ? "" : "border-accent/40"}`}>
            <p className="font-medium break-words">{n.title}</p>
            <p className="whitespace-pre-wrap break-words text-sm text-muted">{n.body}</p>
            <p className="text-xs text-muted">{formatDateTime(n.created_at)}</p>
          </article>
        ))}
      </div>
    </div>
  );
}
