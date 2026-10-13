import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { Field } from "@/components/field";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { POSITION_LABEL, ROLE_LABEL, STATUSES, STATUS_LABEL } from "@/lib/constants";
import { assignDepartmentMember, deleteMember, getMember, patchMember, removeDepartmentMember, setMemberPassword } from "@/lib/server/fns";
import { errorMessage } from "@/lib/utils";
import { formatDate } from "@/lib/format";
import { useRpc } from "@/lib/use-rpc";

export const Route = createFileRoute("/_app/members/$id")({ component: MemberDetail });

function MemberDetail() {
  const { id } = Route.useParams();
  const nav = useNavigate();
  const { data, loading, err, reload } = useRpc(() => getMember({ data: { id } }), [id]);
  const [dept, setDept] = useState("media");
  const [pos, setPos] = useState("MEMBER");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [lastSet, setLastSet] = useState<string | null>(null);
  const [attSem, setAttSem] = useState("ALL");

  if (loading) return <p className="text-muted">Đang tải hồ sơ…</p>;
  if (err || !data) return <p className="text-accent">{err || "Không có dữ liệu."}</p>;

  async function saveIdentity(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    try {
      await patchMember({
        data: {
          id,
          fullName: String(fd.get("fullName") || ""),
          studentId: String(fd.get("studentId") || ""),
          birthday: String(fd.get("birthday") || ""),
          email: String(fd.get("email") || ""),
          phone: String(fd.get("phone") || ""),
        },
      });
      toast.success("Đã lưu hồ sơ.");
      reload();
    } catch (er) {
      toast.error(errorMessage(er));
    }
  }

  return (
    <div>
      <PageHeader kicker="Hồ sơ thành viên" title={data.full_name} desc={`${ROLE_LABEL[data.role]} · ${data.email}`} />
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="card-paper space-y-2 p-5 lg:col-span-2">
          <p><span className="text-muted">MSSV:</span> {data.student_id}</p>
          <p><span className="text-muted">Ngày sinh:</span> {data.birthday || "—"}</p>
          <p><span className="text-muted">SĐT:</span> {data.phone || "—"}</p>
          <p><span className="text-muted">Ngày vào:</span> {formatDate(data.join_date)}</p>
          <p><span className="text-muted">Trạng thái:</span> {STATUS_LABEL[data.status]}</p>
          <div className="pt-2 text-sm">
            {data.depts.map((d) => (
              <span key={d.department_id} className="mr-2 inline-block rounded-full bg-paper-2 px-3 py-1">
                {d.name} · {POSITION_LABEL[d.position]}
              </span>
            ))}
          </div>
        </div>
        <div className="grid gap-3">
          <div className="card-paper p-5">
            <p className="kicker">Điểm danh</p>
            <Select
              className="mt-2"
              value={attSem}
              onChange={(e) => setAttSem(e.target.value)}
            >
              <option value="ALL">Tất cả học kỳ ({data.attended})</option>
              {(data.attendanceBySemester ?? []).map((s) => (
                <option key={s.id} value={s.id}>{s.name} ({s.n})</option>
              ))}
            </Select>
            <p className="mt-2 font-display text-3xl tabular-nums">
              {attSem === "ALL" ? data.attended : (data.attendanceBySemester ?? []).find((s) => s.id === attSem)?.n ?? 0}
            </p>
            <p className="mt-1 text-xs text-muted">Số lần điểm danh trong học kỳ đã chọn.</p>
          </div>
          {data.chatViolations != null ? (
            <div className="card-paper p-5">
              <p className="kicker">Vi phạm chat</p>
              <p className="font-display text-3xl tabular-nums">{data.chatViolations}</p>
              <p className="mt-1 text-xs text-muted">Chỉ bạn và Ban Chủ nhiệm thấy số này.</p>
            </div>
          ) : null}
          {data.viewer.canViewStaff ? (
            <>
              <div className="card-paper p-5"><p className="kicker">Task xong</p><p className="font-display text-3xl tabular-nums">{data.tasksDone}</p></div>
              <div className="card-paper p-5"><p className="kicker">Task đang mở</p><p className="font-display text-3xl tabular-nums">{data.tasksOpen}</p></div>
            </>
          ) : null}
        </div>
      </div>

      {data.canEdit ? (
        <form onSubmit={saveIdentity} className="card-paper mt-6 grid gap-3 p-5 md:grid-cols-2">
          <h2 className="font-display text-xl md:col-span-2">Sửa danh tính (Chủ nhiệm)</h2>
          <Field label="Họ tên"><Input name="fullName" defaultValue={data.full_name} maxLength={30} /></Field>
          <Field label="MSSV"><Input name="studentId" defaultValue={data.student_id_raw ?? ""} /></Field>
          <Field label="Ngày sinh"><Input name="birthday" type="date" defaultValue={data.birthday ?? ""} /></Field>
          <Field label="Email đăng nhập"><Input name="email" type="email" defaultValue={data.email} /></Field>
          <Field label="SĐT"><Input name="phone" defaultValue={data.phone ?? ""} /></Field>
          <div className="md:col-span-2"><Button type="submit">Lưu thay đổi</Button></div>
        </form>
      ) : null}

      {data.canSetPassword ? (
        <form
          className="card-paper mt-6 space-y-3 p-5"
          onSubmit={async (e) => {
            e.preventDefault();
            if (pw !== pw2) {
              toast.error("Hai ô mật khẩu không khớp.");
              return;
            }
            try {
              await setMemberPassword({ data: { id, password: pw } });
              setLastSet(pw);
              setPw("");
              setPw2("");
              toast.success("Đã đặt mật khẩu mới.");
              reload();
            } catch (er) {
              toast.error(errorMessage(er));
            }
          }}
        >
          <h2 className="font-display text-xl">Mật khẩu đăng nhập</h2>
          <p className="text-sm text-muted">
            Hub không lưu mật khẩu gốc nên không xem được mật khẩu hiện tại
            {data.hasPassword ? " (tài khoản đã có mật khẩu)." : " (chưa đặt mật khẩu email)."}
            {" "}Chủ nhiệm đặt mật khẩu mới — thành viên dùng ngay để đăng nhập.
          </p>
          {lastSet ? (
            <p className="rounded-xl bg-paper-2 px-3 py-2 font-mono text-sm break-all">
              Mật khẩu vừa đặt: {lastSet}
            </p>
          ) : null}
          <Field label="Mật khẩu mới">
            <Input
              type={showPw ? "text" : "password"}
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              minLength={8}
              required
              autoComplete="new-password"
            />
          </Field>
          <Field label="Nhập lại">
            <Input
              type={showPw ? "text" : "password"}
              value={pw2}
              onChange={(e) => setPw2(e.target.value)}
              minLength={8}
              required
              autoComplete="new-password"
            />
          </Field>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={showPw} onChange={(e) => setShowPw(e.target.checked)} />
            Hiện mật khẩu
          </label>
          <Button type="submit">Đặt mật khẩu</Button>
        </form>
      ) : null}

      {data.canManage ? (
        <div className="card-paper mt-6 space-y-4 p-5">
          <h2 className="font-display text-xl">Phân ban</h2>
          <div className="flex flex-wrap gap-2">
            <Select value={dept} onChange={(e) => setDept(e.target.value)}>
              <option value="bcn">Ban Chủ nhiệm</option>
              <option value="members">Ban Thành viên</option>
              <option value="media">Ban Truyền thông</option>
              <option value="academic">Ban Học thuật</option>
              <option value="event">Ban Sự kiện</option>
            </Select>
            <Select value={pos} onChange={(e) => setPos(e.target.value)}>
              <option value="HEAD">Trưởng ban</option>
              <option value="VICE_HEAD">Phó ban</option>
              <option value="MEMBER">Thành viên</option>
            </Select>
            <Button onClick={async () => { try { await assignDepartmentMember({ data: { departmentId: dept, userId: id, position: pos } }); toast.success("Đã phân ban."); reload(); } catch (e) { toast.error(errorMessage(e)); } }}>Thêm / đổi chức</Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {data.depts.map((d) => (
              <Button key={d.department_id} variant="ghost" onClick={async () => { await removeDepartmentMember({ data: { departmentId: d.department_id, userId: id } }); reload(); }}>
                Gỡ {d.name}
              </Button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <Select defaultValue={data.role} onChange={async (e) => { await patchMember({ data: { id, role: e.target.value } }); reload(); }}>
              {Object.entries(ROLE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </Select>
            <Select defaultValue={data.status} onChange={async (e) => { await patchMember({ data: { id, status: e.target.value } }); reload(); }}>
              {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
            </Select>
            <Button variant="danger" onClick={async () => {
              if (!confirm("Xóa tài khoản này? Email sẽ đăng ký lại được.")) return;
              try { await deleteMember({ data: { id } }); toast.success("Đã xóa."); nav({ to: "/members" }); } catch (e) { toast.error(errorMessage(e)); }
            }}>Xóa tài khoản</Button>
          </div>
        </div>
      ) : null}
      <p className="mt-4"><Link to="/members" className="text-sm underline">← Danh sách thành viên</Link></p>
    </div>
  );
}
