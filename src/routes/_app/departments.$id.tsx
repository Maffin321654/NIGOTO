import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/input";
import { POSITION_LABEL } from "@/lib/constants";
import { assignDepartmentMember, getDepartment, listMembers, removeDepartmentMember } from "@/lib/server/fns";
import { errorMessage } from "@/lib/utils";
import { useRpc } from "@/lib/use-rpc";

export const Route = createFileRoute("/_app/departments/$id")({ component: DeptDetail });

function DeptDetail() {
  const { id } = Route.useParams();
  const { data, loading, err, reload } = useRpc(() => getDepartment({ data: { id } }), [id]);
  const people = useRpc(() => listMembers());
  const [uid, setUid] = useState("");
  const [pos, setPos] = useState("MEMBER");

  if (loading) return <p className="text-muted">Đang tải ban…</p>;
  if (err || !data) return <p className="text-accent">{err}</p>;

  return (
    <div>
      <PageHeader kicker="Chi tiết ban" title={data.name} desc={data.description} />
      {data.canManage ? (
        <div className="card-paper mb-4 flex flex-wrap gap-2 p-4">
          <Select value={uid} onChange={(e) => setUid(e.target.value)}>
            <option value="">Chọn thành viên…</option>
            {(people.data ?? []).map((p) => (
              <option key={p.user_id} value={p.user_id}>{p.full_name}</option>
            ))}
          </Select>
          <Select value={pos} onChange={(e) => setPos(e.target.value)}>
            <option value="HEAD">Trưởng ban</option>
            <option value="VICE_HEAD">Phó ban</option>
            <option value="MEMBER">Thành viên</option>
          </Select>
          <Button onClick={async () => {
            if (!uid) return;
            try {
              await assignDepartmentMember({ data: { departmentId: id, userId: uid, position: pos } });
              toast.success("Đã thêm vào ban.");
              reload();
            } catch (e) { toast.error(errorMessage(e)); }
          }}>Thêm vào ban</Button>
        </div>
      ) : null}
      <div className="card-paper divide-y divide-line">
        {data.members.map((m) => (
          <div key={m.user_id} className="flex flex-wrap items-center justify-between gap-2 px-5 py-4">
            <Link to="/members/$id" params={{ id: m.user_id }} className="font-medium hover:underline">
              {m.full_name} · {POSITION_LABEL[m.position]} · {m.student_id}
            </Link>
            {data.canManage ? (
              <Button variant="ghost" onClick={async () => { await removeDepartmentMember({ data: { departmentId: id, userId: m.user_id } }); reload(); }}>Gỡ khỏi ban</Button>
            ) : null}
          </div>
        ))}
      </div>
      <p className="mt-4"><Link to="/departments" className="text-sm underline">← Các ban</Link></p>
    </div>
  );
}
