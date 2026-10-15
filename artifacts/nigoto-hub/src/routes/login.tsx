import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { authClient, authEnabled } from "@/lib/auth/client";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { saveSignupIdentity, getSignupOpen } from "@/lib/server/fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/field";
import { errorMessage, isPersonalEmail, validateBirthday, validateName, validateStudentId } from "@/lib/utils";

export const Route = createFileRoute("/login")({ component: Login });

function nextPath() {
  if (typeof window === "undefined") return "/";
  const n = sessionStorage.getItem("nigoto_next");
  sessionStorage.removeItem("nigoto_next");
  return n && n.startsWith("/") ? n : "/";
}

function Login() {
  const nav = useNavigate();
  const { user, isPending } = useCurrentUserState();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [studentId, setStudentId] = useState("");
  const [birthday, setBirthday] = useState("");
  const [busy, setBusy] = useState(false);
  const [signupOpen, setSignupOpen] = useState(true);

  useEffect(() => {
    getSignupOpen().then((r) => setSignupOpen(r.open)).catch(() => {});
  }, []);

  useEffect(() => {
    if (!isPending && user) nav({ to: nextPath() });
  }, [isPending, user, nav]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!authEnabled) return;
    if (!isPersonalEmail(email)) {
      toast.error("Dùng email cá nhân hợp lệ.");
      return;
    }
    setBusy(true);
    try {
      if (mode === "in") {
        const res = await authClient.signIn.email({ email, password });
        if (res.error) throw new Error(res.error.message || "Đăng nhập thất bại.");
      } else {
        if (!signupOpen) throw new Error("CLB đang không nhận thêm thành viên mới.");
        if (password.length < 8) throw new Error("Mật khẩu tối thiểu 8 ký tự.");
        const name = validateName(fullName);
        if (!studentId.trim()) throw new Error("MSSV là bắt buộc.");
        const sid = validateStudentId(studentId);
        if (!birthday.trim()) throw new Error("Ngày sinh là bắt buộc.");
        const bday = validateBirthday(birthday);
        const pending = { fullName: name, studentId: sid, birthday: bday };
        try {
          sessionStorage.setItem("nigoto_identity", JSON.stringify(pending));
        } catch {
          /* ignore */
        }
        const res = await authClient.signUp.email({ email, password, name });
        if (res.error) throw new Error(res.error.message || "Đăng ký thất bại.");
        let last: unknown;
        for (let i = 0; i < 6; i++) {
          try {
            await saveSignupIdentity({ data: pending });
            last = null;
            break;
          } catch (er) {
            last = er;
            await new Promise((r) => setTimeout(r, 250));
          }
        }
        if (last) throw last;
      }
      window.location.assign(nextPath());
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-paper px-4">
      <div className="w-full max-w-md">
        <p className="kicker">Câu lạc bộ Nhật ngữ</p>
        <h1 className="mt-2 font-display text-4xl text-ink">Nigoto Hub</h1>
        <p className="mt-1 text-muted">Đăng nhập bằng email cá nhân và mật khẩu.</p>
        <form onSubmit={onSubmit} className="card-paper mt-6 space-y-4 p-6">
          {mode === "up" ? (
            <>
              <Field label="Họ tên">
                <Input value={fullName} onChange={(e) => setFullName(e.target.value)} maxLength={30} required />
              </Field>
              <Field label="MSSV (bắt buộc)">
                <Input value={studentId} onChange={(e) => setStudentId(e.target.value)} placeholder="524H0087" required minLength={4} maxLength={10} />
              </Field>
              <Field label="Ngày sinh (bắt buộc)">
                <Input type="date" value={birthday} onChange={(e) => setBirthday(e.target.value)} required />
              </Field>
            </>
          ) : null}
          <Field label="Email cá nhân">
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
          </Field>
          <Field label="Mật khẩu">
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} autoComplete={mode === "in" ? "current-password" : "new-password"} />
          </Field>
          <Button type="submit" disabled={busy || !authEnabled} className="w-full">
            {busy ? "Đang xử lý…" : mode === "in" ? "Đăng nhập" : "Tạo tài khoản"}
          </Button>
          <button
            type="button"
            className="w-full text-sm text-muted underline"
            onClick={() => {
              if (mode === "in" && !signupOpen) {
                toast.error("CLB đang không nhận thêm thành viên mới. Hãy đăng nhập nếu đã có tài khoản.");
                return;
              }
              setMode(mode === "in" ? "up" : "in");
            }}
          >
            {mode === "in" ? (signupOpen ? "Chưa có tài khoản? Đăng ký" : "Đăng ký đang đóng") : "Đã có tài khoản? Đăng nhập"}
          </button>
        </form>
      </div>
    </main>
  );
}
