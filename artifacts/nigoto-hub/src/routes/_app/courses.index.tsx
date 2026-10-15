import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { Field } from "@/components/field";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { COURSE_ITEM_KINDS, LIMITS } from "@/lib/constants";
import { listCourses, saveCourse } from "@/lib/server/fns";
import { cn, errorMessage } from "@/lib/utils";
import { useRpc } from "@/lib/use-rpc";

export const Route = createFileRoute("/_app/courses/")({ component: Courses });

type Filter = "all" | "VIDEO" | "DOC";

function Courses() {
  const { data, loading, err, reload } = useRpc(() => listCourses());
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<Filter>("all");
  const [q, setQ] = useState("");
  if (loading) return <p className="text-muted">Đang tải khóa học…</p>;
  if (err) return <p className="text-accent">{err}</p>;
  const can = data?.me.canCreateCourse;
  const needle = q.trim().toLowerCase();
  const rows = (data?.rows ?? [])
    .filter((c) => filter === "all" || c.kinds.includes(filter))
    .filter((c) => !needle || `${c.title} ${c.description}`.toLowerCase().includes(needle));

  async function onCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    try {
      const r = await saveCourse({ data: { title: String(fd.get("title") || ""), description: String(fd.get("description") || "") } });
      toast.success("Đã tạo khóa (chưa công bố).");
      setOpen(false);
      reload();
      await nav({ to: "/courses/$id", params: { id: r.id } });
    } catch (er) { toast.error(errorMessage(er)); }
  }

  return (
    <div>
      <PageHeader
        kicker="Học thuật"
        title="Khóa học"
        desc="Video hoặc tài liệu. Bấm một khóa để xem bài học."
        action={can ? <Button onClick={() => setOpen((v) => !v)}>{open ? "Đóng form" : "Tạo khóa"}</Button> : undefined}
      />
      {open && can ? (
        <form onSubmit={onCreate} className="card-paper mb-6 space-y-3 p-5">
          <Field label="Tên khóa"><Input name="title" required maxLength={LIMITS.title} /></Field>
          <Field label="Mô tả"><Textarea name="description" maxLength={LIMITS.description} /></Field>
          <Button type="submit">Lưu</Button>
        </form>
      ) : null}

      <div className="relative mb-4">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Tìm khóa học theo tên hoặc mô tả…"
          className="pl-10"
        />
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {([
          { id: "all" as const, label: "Tất cả" },
          ...COURSE_ITEM_KINDS,
        ]).map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilter(f.id)}
            className={cn(
              "min-h-11 rounded-full px-4 text-sm font-semibold",
              filter === f.id ? "bg-ink text-paper-3" : "border border-line bg-paper-3 text-ink hover:bg-paper-2",
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {rows.length === 0 ? (
        <EmptyState title={needle ? "Không khớp tìm kiếm." : filter === "all" ? "Chưa có khóa công bố" : "Không có khóa loại này."} />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {rows.map((c) => (
            <Link key={c.id} to="/courses/$id" params={{ id: c.id }} className="card-paper block p-5 hover:border-ink/30">
              <p className="font-display text-2xl break-words">{c.title}</p>
              <p className="mt-1 line-clamp-3 text-sm text-muted">{c.description}</p>
              <p className="mt-2 text-xs text-muted">
                {c.kinds.length
                  ? c.kinds.map((k) => (k === "VIDEO" ? "Video" : "Tài liệu")).join(" · ")
                  : "Chưa có bài"}
                {" · "}
                {c.is_public ? "Công khai" : "Nháp"}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
