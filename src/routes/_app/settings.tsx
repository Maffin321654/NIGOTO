import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { Field } from "@/components/field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { POSITION_LABEL, ROLE_LABEL } from "@/lib/constants";
import { getMe, updateMyProfile } from "@/lib/server/fns";
import { errorMessage } from "@/lib/utils";
import { useRpc } from "@/lib/use-rpc";

export const Route = createFileRoute("/_app/settings")({ component: Settings });

function Settings() {
  const { data, loading, err, reload } = useRpc(() => getMe());
  if (loading) return <p className="text-muted">Đang tải hồ sơ…</p>;
  if (err || !data) return <p className="text-accent">{err}</p>;

  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    try {
      await updateMyProfile({ data: { phone: String(fd.get("phone") || "") } });
      toast.success("Đã lưu số điện thoại.");
      reload();
    } catch (er) { toast.error(errorMessage(er)); }
  }

  return (
    <div>
      <PageHeader kicker="Tài khoản" title="Hồ sơ" desc="Họ tên, MSSV và ngày sinh do Chủ nhiệm chỉnh nếu sai." />
      <div className="card-paper max-w-xl space-y-3 p-6">
        <p><span className="text-muted">Họ tên:</span> {data.name}</p>
        <p><span className="text-muted">Email:</span> {data.email}</p>
        <p><span className="text-muted">MSSV:</span> {data.studentId || "—"}</p>
        <p><span className="text-muted">Ngày sinh:</span> {data.birthday || "—"}</p>
        <p><span className="text-muted">Vai trò:</span> {ROLE_LABEL[data.role]}</p>
        <p><span className="text-muted">Ban:</span> {data.depts.map((d) => `${d.name} (${POSITION_LABEL[d.position]})`).join(", ") || "—"}</p>
        <p><span className="text-muted">Vi phạm chat:</span> {data.chatViolations} lần</p>
        <form onSubmit={save} className="space-y-3 pt-2">
          <Field label="Số điện thoại (chỉ số, tối đa 12)">
            <Input name="phone" defaultValue={data.phone ?? ""} inputMode="numeric" maxLength={12} />
          </Field>
          <Button type="submit">Lưu hồ sơ</Button>
        </form>
      </div>
    </div>
  );
}
