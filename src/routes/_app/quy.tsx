import { createFileRoute } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { Field } from "@/components/field";
import { EmptyState } from "@/components/empty-state";
import { SemesterBar } from "@/components/semester-bar";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { STATUS_LABEL } from "@/lib/constants";
import { formatDateTime } from "@/lib/format";
import {
  deleteFundEntry,
  listClubFund,
  listFund,
  listSemesters,
  saveFundEntry,
  setFundBase,
  setFundPaid,
  setFundPaidAll,
} from "@/lib/server/fns";
import { cn, errorMessage } from "@/lib/utils";
import { useRpc } from "@/lib/use-rpc";

export const Route = createFileRoute("/_app/quy")({ component: Quy });

function vnd(n: number) {
  return `${new Intl.NumberFormat("vi-VN").format(Math.round(n))} đ`;
}

function Quy() {
  const sem = useRpc(() => listSemesters());
  const [semesterId, setSemesterId] = useState("");
  const [tab, setTab] = useState<"dues" | "club">("dues");
  const dues = useRpc(
    () => (semesterId ? listFund({ data: { semesterId } }) : Promise.resolve(null)),
    [semesterId],
  );
  const club = useRpc(
    () => (semesterId ? listClubFund({ data: { semesterId } }) : Promise.resolve(null)),
    [semesterId],
  );
  const [q, setQ] = useState("");
  const [payFilter, setPayFilter] = useState<"all" | "paid" | "unpaid">("all");
  const [base, setBase] = useState("");
  const [kind, setKind] = useState<"IN" | "OUT">("OUT");
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (semesterId || !sem.data?.defaultId) return;
    setSemesterId(sem.data.defaultId);
  }, [sem.data, semesterId]);

  useEffect(() => {
    if (!club.data) return;
    setBase(String(club.data.base ?? 0));
  }, [club.data]);

  if (dues.loading || club.loading || sem.loading) return <p className="text-muted">Đang tải quỹ…</p>;
  if (dues.err || club.err) return <p className="text-accent">{dues.err || club.err}</p>;

  const canEdit = dues.data?.me.canManageFund ?? sem.data?.me.canManageFund ?? false;
  const canCreateSemester = canEdit || (sem.data?.me.canCreateEvent ?? false);
  const needle = q.trim().toLowerCase();
  const allRows = dues.data?.rows ?? [];
  const paidN = allRows.filter((r) => r.fund_paid).length;
  const unpaidN = allRows.length - paidN;
  const rows = allRows.filter((r) => {
    if (payFilter === "paid" && !r.fund_paid) return false;
    if (payFilter === "unpaid" && r.fund_paid) return false;
    if (!needle) return true;
    return `${r.full_name} ${r.student_id}`.toLowerCase().includes(needle);
  });
  const allPaid = rows.length > 0 && rows.every((r) => r.fund_paid);
  const balance = club.data?.balance ?? 0;

  async function tickOne(id: string, paid: boolean) {
    if (!semesterId || !canEdit) return;
    try {
      await setFundPaid({ data: { id, paid, semesterId } });
      dues.reload();
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }

  async function tickAll(paid: boolean) {
    if (!semesterId || !canEdit) return;
    try {
      await setFundPaidAll({ data: { paid, semesterId, ids: rows.map((r) => r.user_id) } });
      toast.success(paid ? "Đã tick đóng quỹ cho danh sách đang lọc." : "Đã bỏ tick danh sách đang lọc.");
      dues.reload();
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }

  async function saveBase(e: React.FormEvent) {
    e.preventDefault();
    if (!semesterId) return;
    setBusy(true);
    try {
      await setFundBase({ data: { semesterId, amount: Number(base.replace(/\D/g, "") || 0) } });
      toast.success("Đã lưu quỹ gốc.");
      club.reload();
    } catch (er) {
      toast.error(errorMessage(er));
    } finally {
      setBusy(false);
    }
  }

  async function addEntry(e: React.FormEvent) {
    e.preventDefault();
    if (!semesterId) return;
    setBusy(true);
    try {
      await saveFundEntry({
        data: { semesterId, kind, title, amount: Number(amount.replace(/\D/g, "")) },
      });
      toast.success(kind === "IN" ? "Đã ghi khoản thu." : "Đã ghi khoản chi.");
      setTitle("");
      setAmount("");
      club.reload();
    } catch (er) {
      toast.error(errorMessage(er));
    } finally {
      setBusy(false);
    }
  }

  async function removeEntry(id: string) {
    if (!confirm("Xóa khoản này? Số dư sẽ đổi theo.")) return;
    try {
      await deleteFundEntry({ data: { id } });
      club.reload();
    } catch (er) {
      toast.error(errorMessage(er));
    }
  }

  return (
    <div>
      <PageHeader
        kicker="Ban điều hành"
        title="Quỹ"
        desc={canEdit ? "Hai mục theo học kỳ. Chỉ Chủ nhiệm và Phó chủ nhiệm được sửa." : "Chỉ xem số quỹ, thu chi và ai đã đóng. Không sửa được."}
        action={<span className="text-sm text-muted">Còn {unpaidN} bạn chưa đóng</span>}
      />
      <SemesterBar
        semesters={sem.data?.semesters ?? []}
        value={semesterId}
        onChange={setSemesterId}
        canCreate={canCreateSemester}
        onCreated={() => sem.reload()}
        emptyHint="Tạo học kỳ trước khi ghi quỹ."
      />
      {!semesterId ? (
        <EmptyState title="Chọn học kỳ" />
      ) : (
        <>
          <div className="mb-4 flex flex-wrap gap-2">
            <button type="button" onClick={() => setTab("dues")} className={cn("rounded-full px-4 py-2 text-sm min-h-11", tab === "dues" ? "bg-ink text-paper-3" : "border border-line bg-paper-3")}>Danh sách đóng quỹ</button>
            <button type="button" onClick={() => setTab("club")} className={cn("rounded-full px-4 py-2 text-sm min-h-11", tab === "club" ? "bg-ink text-paper-3" : "border border-line bg-paper-3")}>Quỹ CLB</button>
          </div>
          {tab === "dues" ? (
            <>
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <p className="mr-auto text-sm text-ink">
                  Còn <span className="font-medium tabular-nums">{unpaidN}</span> bạn chưa đóng
                  <span className="text-muted"> · đã đóng {paidN}/{allRows.length}</span>
                </p>
                {(
                  [
                    ["all", "Tất cả"],
                    ["paid", "Đã đóng"],
                    ["unpaid", "Chưa đóng"],
                  ] as const
                ).map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setPayFilter(id)}
                    className={cn(
                      "rounded-full px-3 py-1.5 text-sm min-h-9",
                      payFilter === id ? "bg-ink text-paper-3" : "border border-line bg-paper-3",
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <div className="relative mb-3">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
                <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Tìm theo họ tên hoặc MSSV…" className="pl-10" />
              </div>
              {canEdit ? (
                <div className="mb-4 flex flex-wrap gap-2">
                  <Button type="button" variant="ink" disabled={!rows.length} onClick={() => void tickAll(true)}>Tick tất cả</Button>
                  <Button type="button" variant="ghost" disabled={!rows.length} onClick={() => void tickAll(false)}>Hủy tick tất cả</Button>
                </div>
              ) : <p className="mb-3 text-sm text-muted">Chỉ xem. Không tick được.</p>}
              {rows.length === 0 ? (
                <EmptyState
                  title={
                    needle
                      ? "Không khớp tìm kiếm."
                      : payFilter === "unpaid"
                        ? "Không còn bạn nào chưa đóng."
                        : payFilter === "paid"
                          ? "Chưa có bạn nào đã đóng."
                          : "Chưa có thành viên"
                  }
                />
              ) : (
                <div className="card-paper overflow-hidden">
                  <div className="hidden grid-cols-12 items-center gap-2 border-b border-line px-5 py-3 text-xs uppercase tracking-wider text-muted md:grid">
                    <span className="col-span-1" />
                    <span className="col-span-5">Họ tên</span>
                    <span className="col-span-3">MSSV</span>
                    <span className="col-span-3">Quỹ</span>
                  </div>
                  {rows.map((m) => (
                    <label key={m.user_id} className="grid cursor-pointer grid-cols-[auto_1fr] items-center gap-3 border-b border-line px-5 py-3 last:border-0 hover:bg-paper-2 md:grid-cols-12">
                      <input
                        type="checkbox"
                        checked={m.fund_paid}
                        disabled={!canEdit}
                        onChange={() => void tickOne(m.user_id, !m.fund_paid)}
                        className="size-4 accent-[var(--accent,#b23a2f)] md:col-span-1"
                      />
                      <span className="min-w-0 md:col-span-5">
                        <span className="block font-medium break-words">{m.full_name}</span>
                        <span className="font-mono text-sm text-muted md:hidden">{m.student_id}</span>
                      </span>
                      <span className="hidden font-mono text-sm md:col-span-3 md:block">{m.student_id}</span>
                      <span className={cn("text-sm md:col-span-3", m.fund_paid ? "text-ink" : "text-muted")}>
                        {m.fund_paid ? "Đã đóng" : "Chưa đóng"}
                        <span className="ml-2 text-xs text-muted">{STATUS_LABEL[m.status] ?? m.status}</span>
                      </span>
                    </label>
                  ))}
                  {canEdit && rows.length > 0 ? (
                    <div className="hidden md:block">
                      <label className="flex items-center gap-2 px-5 py-2 text-xs text-muted">
                        <input type="checkbox" checked={allPaid} onChange={() => void tickAll(!allPaid)} className="size-4" />
                        Tick hết danh sách đang lọc
                      </label>
                    </div>
                  ) : null}
                </div>
              )}
            </>
          ) : (
            <div className="space-y-4">
              <div className="card-paper p-6">
                <p className="kicker">Quỹ hiện tại</p>
                <p className={cn("font-display text-5xl tabular-nums tracking-tight", balance < 0 ? "text-accent" : "text-ink")}>{vnd(balance)}</p>
                <p className="mt-2 text-sm text-muted">Quỹ gốc {vnd(club.data?.base ?? 0)} cộng thu, trừ chi của học kỳ này.</p>
              </div>
              {canEdit ? (
                <form onSubmit={saveBase} className="card-paper grid gap-3 p-5 md:grid-cols-[1fr_auto] md:items-end">
                  <Field label="Quỹ gốc (chỉ Chủ nhiệm và Phó chủ nhiệm)">
                    <Input inputMode="numeric" value={base} onChange={(e) => setBase(e.target.value)} />
                  </Field>
                  <Button type="submit" disabled={busy}>Lưu quỹ gốc</Button>
                </form>
              ) : null}
              {canEdit ? (
                <form onSubmit={addEntry} className="card-paper grid gap-3 p-5 md:grid-cols-4 md:items-end">
                  <Field label="Loại">
                    <Select value={kind} onChange={(e) => setKind(e.target.value === "IN" ? "IN" : "OUT")}>
                      <option value="OUT">Chi</option>
                      <option value="IN">Thu</option>
                    </Select>
                  </Field>
                  <Field label={kind === "IN" ? "Thu nhờ cái gì" : "Chi cho cái gì"}>
                    <Input value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={100} />
                  </Field>
                  <Field label="Số tiền">
                    <Input inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value)} required />
                  </Field>
                  <Button type="submit" disabled={busy}>{kind === "IN" ? "Ghi thu" : "Ghi chi"}</Button>
                </form>
              ) : null}
              {(club.data?.entries ?? []).length === 0 ? (
                <EmptyState title="Chưa có khoản thu chi" />
              ) : (
                <div className="card-paper overflow-hidden">
                  {(club.data?.entries ?? []).map((e) => (
                    <div key={e.id} className="flex items-start justify-between gap-3 border-b border-line px-5 py-3 last:border-0">
                      <div className="min-w-0">
                        <p className="font-medium break-words">{e.kind === "IN" ? "Thu" : "Chi"} · {e.title}</p>
                        <p className="text-xs text-muted">{e.author} · {formatDateTime(e.created_at)}</p>
                      </div>
                      <div className="flex shrink-0 items-center gap-3">
                        <p className={cn("tabular-nums font-medium", e.kind === "IN" ? "text-emerald-700" : "text-red-700")}>
                          {e.kind === "IN" ? "+" : "−"}{vnd(e.amount)}
                        </p>
                        {canEdit ? <button type="button" className="text-xs text-muted underline" onClick={() => void removeEntry(e.id)}>Xóa</button> : null}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
