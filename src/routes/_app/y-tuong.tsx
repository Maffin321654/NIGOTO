import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { Field } from "@/components/field";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { LIMITS } from "@/lib/constants";
import { formatDateTime } from "@/lib/format";
import { deleteIdea, listIdeas, saveIdea } from "@/lib/server/fns";
import { errorMessage } from "@/lib/utils";
import { useRpc } from "@/lib/use-rpc";

export const Route = createFileRoute("/_app/y-tuong")({ component: Ideas });

function Ideas() {
  const box = useRpc(() => listIdeas());
  if (box.loading) return <p className="text-muted">Đang tải ý tưởng…</p>;
  if (box.err) return <p className="text-accent">{box.err}</p>;

  async function post(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    try {
      await saveIdea({ data: { title: String(fd.get("title") || ""), body: String(fd.get("body") || "") } });
      toast.success("Đã gửi ý tưởng.");
      box.reload();
      (e.target as HTMLFormElement).reset();
    } catch (er) {
      toast.error(errorMessage(er));
    }
  }

  async function remove(id: string) {
    if (!confirm("Xóa thư ý tưởng này?")) return;
    try {
      await deleteIdea({ data: { id } });
      box.reload();
    } catch (er) {
      toast.error(errorMessage(er));
    }
  }

  const rows = box.data?.rows ?? [];
  const canDelete = box.data?.me.canViewStaff ?? false;

  return (
    <div>
      <PageHeader
        kicker="CLB"
        title="Đóng góp ý tưởng"
        desc={canDelete ? "Mọi người xem được. Ban quản trị xóa được thư không phù hợp." : "Gửi ý tưởng cho CLB. Mọi người đều xem được. Bạn không xóa thư của người khác."}
      />
      <form onSubmit={post} className="card-paper mb-6 space-y-3 p-5">
        <Field label="Tiêu đề"><Input name="title" required maxLength={LIMITS.title} /></Field>
        <Field label="Ý tưởng"><Textarea name="body" required maxLength={LIMITS.description} /></Field>
        <Button type="submit">Gửi</Button>
      </form>
      {rows.length === 0 ? (
        <EmptyState title="Chưa có ý tưởng" hint="Viết thư đầu tiên ở form phía trên." />
      ) : (
        <div className="space-y-3">
          {rows.map((idea) => (
            <article key={idea.id} className="card-paper p-5">
              <p className="font-display text-xl break-words">{idea.title}</p>
              <p className="text-xs text-muted">{idea.author} · {formatDateTime(idea.created_at)}</p>
              <p className="mt-2 whitespace-pre-wrap break-words">{idea.body}</p>
              {canDelete ? (
                <Button variant="ghost" className="mt-2" onClick={() => void remove(idea.id)}>Xóa</Button>
              ) : null}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
