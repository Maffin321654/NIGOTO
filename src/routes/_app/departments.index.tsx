import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { listDepartments } from "@/lib/server/fns";
import { useRpc } from "@/lib/use-rpc";

export const Route = createFileRoute("/_app/departments/")({ component: Depts });

function Depts() {
  const { data, loading, err } = useRpc(() => listDepartments());
  if (loading) return <p className="text-muted">Đang tải…</p>;
  if (err) return <p className="text-accent">{err}</p>;
  return (
    <div>
      <PageHeader kicker="Cơ cấu" title="Các ban" desc="Bấm vào một ban để xem thành viên và phân quyền." />
      <div className="grid gap-3 md:grid-cols-2">
        {(data ?? []).map((d) => (
          <Link key={d.id} to="/departments/$id" params={{ id: d.id }} className="card-paper flex items-start justify-between gap-3 p-5 hover:border-ink/30">
            <div>
              <p className="font-display text-2xl">{d.name}</p>
              <p className="mt-1 text-sm text-muted">{d.description}</p>
              <p className="mt-3 tabular-nums text-accent">{d.n} thành viên</p>
            </div>
            <ChevronRight className="mt-2 size-5 shrink-0 text-muted" />
          </Link>
        ))}
      </div>
    </div>
  );
}
