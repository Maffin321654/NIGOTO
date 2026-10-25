import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronDown, ChevronRight, ChevronUp } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/input";
import { ROLE_LABEL, STATUS_LABEL } from "@/lib/constants";
import { exportMembersExcel, getMe, listDepartments, listMembers } from "@/lib/server/fns";
import { cn, errorMessage } from "@/lib/utils";
import { useRpc } from "@/lib/use-rpc";

export const Route = createFileRoute("/_app/members/")({ component: Members });

type SortKey = "name" | "mssv" | "dept";

function Members() {
  const { data, loading, err } = useRpc(() => listMembers());
  const me = useRpc(() => getMe());
  const depts = useRpc(() => listDepartments());
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" }>({ key: "name", dir: "asc" });
  const [exporting, setExporting] = useState(false);
  const [exportDept, setExportDept] = useState("");
  const [includeAlumni, setIncludeAlumni] = useState(false);
  if (loading) return <p className="text-muted">Đang tải…</p>;
  if (err) return <p className="text-accent">{err}</p>;
  const rows = [...(data ?? [])].sort((a, b) => {
    const mul = sort.dir === "asc" ? 1 : -1;
    const cmp = (x: string, y: string) => x.localeCompare(y, "vi", { sensitivity: "base", numeric: true });
    if (sort.key === "name") return mul * cmp(a.full_name || "", b.full_name || "");
    if (sort.key === "mssv") {
      const sa = a.student_id && a.student_id !== "—" ? a.student_id : "";
      const sb = b.student_id && b.student_id !== "—" ? b.student_id : "";
      if (!sa && sb) return 1;
      if (sa && !sb) return -1;
      return mul * cmp(sa, sb);
    }
    return mul * cmp(a.depts || "", b.depts || "");
  });

  function toggle(key: SortKey) {
    setSort((s) => (s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" }));
  }

  async function downloadExcel() {
    setExporting(true);
    try {
      const file = await exportMembersExcel({ data: { departmentId: exportDept, includeAlumni } });
      const bin = atob(file.base64);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      const url = URL.createObjectURL(new Blob([bytes], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = file.filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch (er) {
      toast.error(errorMessage(er));
    } finally {
      setExporting(false);
    }
  }

  function Head({ k, label, span }: { k: SortKey; label: string; span: string }) {
    const on = sort.key === k;
    return (
      <button
        type="button"
        onClick={() => toggle(k)}
        className={cn("inline-flex items-center gap-1 text-left uppercase tracking-wider hover:text-ink", span, on ? "text-ink" : "text-muted")}
      >
        {label}
        {on ? (sort.dir === "asc" ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />) : <ChevronDown className="size-3.5 opacity-30" />}
      </button>
    );
  }

  return (
    <div>
      <PageHeader
        kicker="Nhân sự"
        title="Thành viên"
        desc="Bấm tiêu đề cột để sắp xếp. Bấm một người để xem hồ sơ."
        action={me.data?.canManageFund ? (
          <div className="flex flex-wrap items-center gap-2">
            <Select className="w-auto min-w-40" value={exportDept} onChange={(e) => setExportDept(e.target.value)}>
              <option value="">Tất cả các ban</option>
              {(depts.data ?? []).map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </Select>
            <label className="flex min-h-11 items-center gap-2 rounded-full border border-line bg-paper-3 px-3 text-sm">
              <input type="checkbox" checked={includeAlumni} onChange={(e) => setIncludeAlumni(e.target.checked)} />
              Xuất cựu thành viên
            </label>
            <Button variant="ink" disabled={exporting} onClick={() => void downloadExcel()}>
              {exporting ? "Đang xuất…" : "Xuất Excel"}
            </Button>
          </div>
        ) : undefined}
      />
      {rows.length === 0 ? <EmptyState title="Chưa có thành viên" /> : (
        <div className="card-paper overflow-hidden">
          <div className="hidden grid-cols-12 items-center gap-2 border-b border-line px-5 py-3 text-xs md:grid">
            <Head k="name" label="Họ tên" span="col-span-4" />
            <Head k="mssv" label="MSSV" span="col-span-2" />
            <Head k="dept" label="Ban" span="col-span-3" />
            <span className="col-span-2 text-muted uppercase tracking-wider">Vai trò</span>
            <span className="col-span-1" />
          </div>
          <div className="flex flex-wrap gap-2 border-b border-line px-5 py-3 md:hidden">
            <Head k="name" label="Họ tên" span="" />
            <Head k="mssv" label="MSSV" span="" />
            <Head k="dept" label="Ban" span="" />
          </div>
          {rows.map((m) => (
            <Link
              key={m.user_id}
              to="/members/$id"
              params={{ id: m.user_id }}
              className="grid grid-cols-[1fr_auto] gap-1 border-b border-line px-5 py-4 last:border-0 hover:bg-paper-2 md:grid-cols-12 md:items-center"
            >
              <span className="font-medium break-words md:col-span-4">{m.full_name}</span>
              <span className="font-mono text-sm text-muted md:col-span-2">{m.student_id}</span>
              <span className="text-sm text-muted md:col-span-3">{m.depts || "—"}</span>
              <span className="text-sm md:col-span-2">{ROLE_LABEL[m.role] ?? m.role} · {STATUS_LABEL[m.status] ?? m.status}</span>
              <span className="hidden justify-end text-muted md:col-span-1 md:flex"><ChevronRight className="size-4" /></span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
