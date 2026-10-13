import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { Field } from "@/components/field";
import { saveSemester } from "@/lib/server/fns";
import { errorMessage } from "@/lib/utils";

export function SemesterBar({
  semesters,
  value,
  onChange,
  canCreate,
  onCreated,
  emptyHint,
}: {
  semesters: Array<{ id: string; name: string }>;
  value: string;
  onChange: (id: string) => void;
  canCreate?: boolean;
  onCreated?: (id: string) => void;
  emptyHint?: string;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const r = await saveSemester({ data: { name } });
      toast.success("Đã tạo học kỳ.");
      setName("");
      setOpen(false);
      onCreated?.(r.id);
      onChange(r.id);
    } catch (er) {
      toast.error(errorMessage(er));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card-paper mb-4 p-5">
      <p className="kicker">Học kỳ</p>
      <div className="mt-3 flex flex-wrap items-end gap-3">
        <div className="min-w-[220px] flex-1">
          <Field label="Chọn học kỳ">
            <Select value={value} onChange={(e) => onChange(e.target.value)} disabled={!semesters.length}>
              {semesters.length === 0 ? <option value="">Chưa có học kỳ</option> : null}
              {semesters.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </Select>
          </Field>
        </div>
        {canCreate ? (
          <Button type="button" variant="ghost" onClick={() => setOpen((v) => !v)}>
            {open ? "Đóng" : "Tạo học kỳ"}
          </Button>
        ) : null}
      </div>
      {open && canCreate ? (
        <form onSubmit={create} className="mt-3 flex flex-wrap items-end gap-2">
          <div className="min-w-[220px] flex-1">
            <Field label="Tên học kỳ">
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Học kỳ 2 26-27" required maxLength={40} />
            </Field>
          </div>
          <Button type="submit" disabled={busy}>{busy ? "Đang lưu…" : "Lưu học kỳ"}</Button>
        </form>
      ) : null}
      {canCreate && semesters.length === 0 ? (
        <p className="mt-2 text-sm text-accent">{emptyHint || "Tạo học kỳ trước khi dùng trang này."}</p>
      ) : null}
    </div>
  );
}
