import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { Field } from "@/components/field";
import { Button } from "@/components/ui/button";
import { Input, Select, Textarea } from "@/components/ui/input";
import { LIMITS, TASK_PRIORITY, TASK_STATUS, labelOf } from "@/lib/constants";
import { formatDate } from "@/lib/format";
import { deleteTask, listMembers, listTasks, saveTask, setTaskStatus } from "@/lib/server/fns";
import { errorMessage } from "@/lib/utils";
import { useRpc } from "@/lib/use-rpc";

export const Route = createFileRoute("/_app/tasks")({ component: Tasks });

function Tasks() {
  const { data, loading, err, reload } = useRpc(() => listTasks());
  const people = useRpc(() => listMembers());
  const [open, setOpen] = useState(false);
  if (loading) return <p className="text-muted">Đang tải việc…</p>;
  if (err) return <p className="text-accent">{err}</p>;
  const can = data?.me.canCreateTask;
  const cols = TASK_STATUS;

  async function onCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const assigneeIds = fd.getAll("assignees").map(String).filter(Boolean);
    try {
      await saveTask({
        data: {
          title: String(fd.get("title") || ""),
          description: String(fd.get("description") || ""),
          status: "TODO",
          priority: String(fd.get("priority") || "MEDIUM"),
          deadline: fd.get("deadline") ? new Date(String(fd.get("deadline"))).toISOString() : undefined,
          assigneeIds,
        },
      });
      toast.success("Đã giao việc.");
      setOpen(false);
      reload();
    } catch (er) { toast.error(errorMessage(er)); }
  }

  return (
    <div>
      <PageHeader kicker="Kanban" title="Công việc" desc="Kéo trạng thái bằng nút. Dashboard cũng có xác nhận đang làm / hoàn thành." action={can ? <Button onClick={() => setOpen((v) => !v)}>Tạo việc</Button> : undefined} />
      {open && can ? (
        <form onSubmit={onCreate} className="card-paper mb-6 grid gap-3 p-5 md:grid-cols-2">
          <Field label="Tiêu đề"><Input name="title" required maxLength={LIMITS.title} /></Field>
          <Field label="Ưu tiên"><Select name="priority">{TASK_PRIORITY.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}</Select></Field>
          <Field label="Hạn"><Input name="deadline" type="datetime-local" /></Field>
          <Field label="Giao cho">
            <select name="assignees" multiple className="min-h-28 w-full rounded-xl border border-line bg-paper-3 p-2">
              {(people.data ?? []).map((p) => <option key={p.user_id} value={p.user_id}>{p.full_name}</option>)}
            </select>
          </Field>
          <div className="md:col-span-2"><Field label="Mô tả"><Textarea name="description" maxLength={LIMITS.description} /></Field></div>
          <div className="md:col-span-2"><Button type="submit">Lưu</Button></div>
        </form>
      ) : null}
      <div className="grid gap-3 md:grid-cols-4">
        {cols.map((col) => (
          <div key={col.id} className="card-paper p-3">
            <p className="kicker px-1 py-2">{col.label}</p>
            <div className="space-y-2">
              {(data?.tasks ?? []).filter((t) => t.status === col.id).map((t) => (
                <div key={t.id} className="rounded-xl border border-line bg-paper p-3">
                  <p className="font-medium break-words">{t.title}</p>
                  <p className="text-xs text-muted">{labelOf(TASK_PRIORITY, t.priority)} {t.deadline ? `· ${formatDate(t.deadline)}` : ""} {t.overdue ? "· Quá hạn" : ""}</p>
                  <p className="text-xs text-muted">{t.assignees.map((a) => a.full_name).join(", ")}</p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {cols.filter((c) => c.id !== t.status).map((c) => (
                      <button key={c.id} className="rounded-full bg-paper-3 px-2 py-1 text-[11px]" onClick={async () => { await setTaskStatus({ data: { id: t.id, status: c.id } }); reload(); }}>{c.label}</button>
                    ))}
                    {can ? <button className="rounded-full px-2 py-1 text-[11px] text-accent" onClick={async () => { if (!confirm("Xóa việc này?")) return; await deleteTask({ data: { id: t.id } }); reload(); }}>Xóa</button> : null}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
