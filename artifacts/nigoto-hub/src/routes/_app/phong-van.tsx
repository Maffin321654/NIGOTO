import { createFileRoute } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { Field } from "@/components/field";
import { EmptyState } from "@/components/empty-state";
import { SemesterBar } from "@/components/semester-bar";
import { Button } from "@/components/ui/button";
import { Input, Select, Textarea } from "@/components/ui/input";
import { INTERVIEW_BANS, interviewBan, interviewMax, type InterviewBanId } from "@/lib/interview";
import { deleteInterviewScore, listInterviewScores, listSemesters, saveInterviewScore } from "@/lib/server/fns";
import { errorMessage } from "@/lib/utils";
import { formatDateTime } from "@/lib/format";
import { useRpc } from "@/lib/use-rpc";

export const Route = createFileRoute("/_app/phong-van")({ component: PhongVan });

type Row = {
  id: string;
  ban: string;
  candidate_name: string;
  student_id: string;
  notes: string;
  scores: Record<string, number>;
  total: number;
  max: number;
  scorer_name: string;
  updated_at: string;
};

function blankScores(ban: string) {
  const spec = interviewBan(ban);
  const out: Record<string, number> = {};
  for (const c of spec?.criteria ?? []) out[c.id] = 0;
  return out;
}

function scoreLabel(n: number) {
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

function PhongVan() {
  const sem = useRpc(() => listSemesters());
  const [semesterId, setSemesterId] = useState("");
  const { data, loading, err, reload } = useRpc(
    () => (semesterId ? listInterviewScores({ data: { semesterId } }) : Promise.resolve(null)),
    [semesterId],
  );
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [ban, setBan] = useState<InterviewBanId>("event");
  const [name, setName] = useState("");
  const [mssv, setMssv] = useState("");
  const [notes, setNotes] = useState("");
  const [scores, setScores] = useState<Record<string, number>>(() => blankScores("event"));
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (semesterId || !sem.data?.defaultId) return;
    setSemesterId(sem.data.defaultId);
  }, [sem.data, semesterId]);

  const spec = interviewBan(ban);
  const total = useMemo(() => {
    if (!spec) return 0;
    return spec.criteria.reduce((n, c) => n + (scores[c.id] ?? 0), 0);
  }, [spec, scores]);

  if (loading || sem.loading) return <p className="text-muted">Đang tải phiếu chấm…</p>;
  if (err) return <p className="text-accent">{err}</p>;

  const canCreate = sem.data?.me.canViewStaff ?? false;
  const needle = q.trim().toLowerCase();
  const rows = ((data?.rows ?? []) as Row[]).filter((r) => {
    if (!needle) return true;
    return `${r.candidate_name} ${r.student_id}`.toLowerCase().includes(needle);
  });

  function resetForm() {
    setEditId(null);
    setBan("event");
    setName("");
    setMssv("");
    setNotes("");
    setScores(blankScores("event"));
  }

  function openNew() {
    resetForm();
    setOpen(true);
  }

  function openRow(r: Row) {
    const next = (interviewBan(r.ban)?.id ?? "event") as InterviewBanId;
    setEditId(r.id);
    setBan(next);
    setName(r.candidate_name);
    setMssv(r.student_id);
    setNotes(r.notes);
    setScores({ ...blankScores(next), ...r.scores });
    setOpen(true);
  }

  function changeBan(id: InterviewBanId) {
    setBan(id);
    setScores(blankScores(id));
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!semesterId) {
      toast.error("Chọn hoặc tạo học kỳ trước.");
      return;
    }
    setBusy(true);
    try {
      await saveInterviewScore({
        data: {
          id: editId || undefined,
          semesterId,
          ban,
          candidateName: name,
          studentId: mssv,
          scores,
          notes,
        },
      });
      toast.success(editId ? "Đã cập nhật điểm." : "Đã lưu phiếu chấm.");
      setOpen(false);
      resetForm();
      reload();
    } catch (er) {
      toast.error(errorMessage(er));
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!editId) return;
    if (!confirm("Xóa phiếu chấm này?")) return;
    try {
      await deleteInterviewScore({ data: { id: editId } });
      toast.success("Đã xóa phiếu.");
      setOpen(false);
      resetForm();
      reload();
    } catch (er) {
      toast.error(errorMessage(er));
    }
  }

  return (
    <div>
      <PageHeader
        kicker="Tuyển thành viên"
        title="Chấm điểm phỏng vấn"
        desc="Chọn học kỳ và ban. Mỗi ban một bảng tiêu chí. Phiếu đã lưu nằm trong danh sách — bấm vào để chỉnh điểm."
        action={canCreate && semesterId ? <Button onClick={() => (open ? (setOpen(false), resetForm()) : openNew())}>{open ? "Đóng form" : "Tạo phiếu"}</Button> : undefined}
      />
      <SemesterBar
        semesters={sem.data?.semesters ?? []}
        value={semesterId}
        onChange={(id) => { setSemesterId(id); setOpen(false); resetForm(); }}
        canCreate={canCreate}
        onCreated={() => sem.reload()}
        emptyHint="Tạo học kỳ trước khi chấm phỏng vấn."
      />
      {!semesterId ? <EmptyState title="Chọn học kỳ" hint="Mặc định là Học kỳ 1 26-27." /> : (
        <>
          {open && spec ? (
            <form onSubmit={save} className="card-paper mb-6 space-y-4 p-5">
              <Field label="Ban">
                <Select value={ban} onChange={(e) => changeBan(e.target.value as InterviewBanId)}>
                  {INTERVIEW_BANS.map((b) => <option key={b.id} value={b.id}>{b.label}</option>)}
                </Select>
              </Field>
              {spec.intro ? <p className="text-sm text-muted">{spec.intro}</p> : null}
              <div className="grid gap-3 md:grid-cols-2">
                <Field label="Tên ứng viên">
                  <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nhập họ tên ứng viên…" required maxLength={30} />
                </Field>
                <Field label="MSSV">
                  <Input value={mssv} onChange={(e) => setMssv(e.target.value)} placeholder="524H0087" required minLength={4} maxLength={10} />
                </Field>
              </div>
              <div className="space-y-5">
                {spec.criteria.map((c, i) => {
                  const v = scores[c.id] ?? 0;
                  const mid = c.max / 2;
                  return (
                    <div key={c.id}>
                      <div className="flex items-baseline justify-between gap-3">
                        <p className="font-medium">{i + 1}. {c.title}</p>
                        <p className="shrink-0 tabular-nums text-sm">{scoreLabel(v)}/{c.max}</p>
                      </div>
                      <p className="mt-0.5 text-xs text-muted">{c.hint}</p>
                      <input
                        type="range"
                        min={0}
                        max={c.max}
                        step={0.5}
                        value={v}
                        onChange={(e) => setScores((s) => ({ ...s, [c.id]: Number(e.target.value) }))}
                        className="mt-2 w-full accent-[var(--color-accent,#8b3a2f)]"
                      />
                      <div className="flex justify-between text-xs text-muted">
                        <span>0</span>
                        <span>{scoreLabel(mid)}</span>
                        <span>{c.max}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="flex items-center justify-between border-t border-line pt-3">
                <p className="text-sm font-medium">Tổng điểm</p>
                <p className="font-display text-2xl tabular-nums">{scoreLabel(total)}<span className="text-base text-muted">/{interviewMax(ban)}</span></p>
              </div>
              <Field label="Nhận xét / dẫn chứng từ câu trả lời">
                <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Điểm mạnh, điểm yếu, câu trả lời đáng chú ý…" maxLength={2000} />
              </Field>
              <div className="flex flex-wrap gap-2">
                <Button type="submit" disabled={busy}>{busy ? "Đang lưu…" : editId ? "Cập nhật điểm" : "Lưu phiếu"}</Button>
                <Button type="button" variant="ghost" onClick={() => { setOpen(false); resetForm(); }}>Hủy</Button>
                {editId ? <Button type="button" variant="danger" onClick={() => void remove()}>Xóa phiếu</Button> : null}
              </div>
            </form>
          ) : null}
          <div className="relative mb-3">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Tìm theo họ tên hoặc MSSV…" className="pl-10" />
          </div>
          {rows.length === 0 ? (
            <EmptyState title={needle ? "Không khớp tìm kiếm." : "Chưa có phiếu trong học kỳ này"} hint={canCreate ? "Bấm Tạo phiếu." : undefined} />
          ) : (
            <div className="space-y-2">
              {rows.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => openRow(r)}
                  className="card-paper grid w-full grid-cols-1 gap-1 px-5 py-4 text-left hover:border-ink/30 md:grid-cols-12 md:items-center"
                >
                  <span className="font-medium break-words md:col-span-4">{r.candidate_name}</span>
                  <span className="font-mono text-sm text-muted md:col-span-2">{r.student_id}</span>
                  <span className="text-sm text-muted md:col-span-3">{interviewBan(r.ban)?.label ?? r.ban}</span>
                  <span className="tabular-nums md:col-span-1">{scoreLabel(r.total)}/{r.max}</span>
                  <span className="text-xs text-muted md:col-span-2 md:text-right">{r.scorer_name} · {formatDateTime(r.updated_at)}</span>
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
