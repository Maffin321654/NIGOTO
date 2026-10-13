import { useState } from "react";
import { toast } from "sonner";
import { Field } from "@/components/field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { saveSignupIdentity } from "@/lib/server/fns";
import { errorMessage, validateBirthday, validateName, validateStudentId } from "@/lib/utils";

export function CompleteIdentity({
  name,
  onDone,
}: {
  name: string;
  onDone: () => void;
}) {
  const [fullName, setFullName] = useState(name);
  const [studentId, setStudentId] = useState("");
  const [birthday, setBirthday] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const pending = {
        fullName: validateName(fullName),
        studentId: validateStudentId(studentId),
        birthday: validateBirthday(birthday),
      };
      await saveSignupIdentity({ data: pending });
      try {
        sessionStorage.removeItem("nigoto_identity");
      } catch {
        /* ignore */
      }
      toast.success("Đã lưu MSSV và ngày sinh.");
      onDone();
    } catch (er) {
      toast.error(errorMessage(er));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid min-h-screen place-items-center bg-paper px-4">
      <form onSubmit={submit} className="card-paper w-full max-w-md space-y-4 p-6">
        <p className="kicker">Hoàn tất hồ sơ</p>
        <h1 className="font-display text-3xl">MSSV và ngày sinh bắt buộc</h1>
        <p className="text-sm text-muted">Điền đúng như thẻ sinh viên. Không dùng Hub được nếu thiếu hai mục này.</p>
        <Field label="Họ tên (bắt buộc)">
          <Input value={fullName} onChange={(e) => setFullName(e.target.value)} required maxLength={30} />
        </Field>
        <Field label="MSSV (bắt buộc)">
          <Input value={studentId} onChange={(e) => setStudentId(e.target.value)} placeholder="524H0087" required minLength={4} maxLength={10} />
        </Field>
        <Field label="Ngày sinh (bắt buộc)">
          <Input type="date" value={birthday} onChange={(e) => setBirthday(e.target.value)} required />
        </Field>
        <Button type="submit" className="w-full" disabled={busy}>{busy ? "Đang lưu…" : "Lưu và vào Hub"}</Button>
      </form>
    </div>
  );
}

export function missingIdentity(me: { studentId?: string | null; birthday?: string | null }) {
  const sid = (me.studentId || "").trim();
  const b = String(me.birthday || "").slice(0, 10);
  return !sid || sid === "—" || !/^\d{4}-\d{2}-\d{2}$/.test(b);
}
