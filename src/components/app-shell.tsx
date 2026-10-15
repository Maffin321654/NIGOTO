import { Link, useRouterState } from "@tanstack/react-router";
import {
  BarChart3,
  Bell,
  BookMarked,
  BookOpen,
  Calendar,
  CalendarDays,
  ClipboardCheck,
  CircleUser,
  Images,
  Landmark,
  LayoutDashboard,
  Lightbulb,
  ListTodo,
  Menu,
  MessageCircle,
  QrCode,
  Search,
  Users,
  Wallet,
  X,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { UserButton } from "@/lib/auth/gates";
import { getMe, globalSearch, listNotifications, saveSignupIdentity } from "@/lib/server/fns";
import { cn, errorMessage } from "@/lib/utils";
import { BootScreen } from "./boot-screen";
import { CompleteIdentity, missingIdentity } from "./complete-identity";

type Me = Awaited<ReturnType<typeof getMe>>;

const NAV: Array<{
  to: string;
  label: string;
  icon: LucideIcon;
  show: (m: Me) => boolean;
}> = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, show: () => true },
  { to: "/members", label: "Thành viên", icon: Users, show: () => true },
  { to: "/departments", label: "Ban", icon: Landmark, show: () => true },
  { to: "/events", label: "Sự kiện", icon: CalendarDays, show: () => true },
  { to: "/courses", label: "Khóa học", icon: BookOpen, show: () => true },
  { to: "/notifications", label: "Thông báo", icon: Bell, show: () => true },
  { to: "/chat", label: "Chat", icon: MessageCircle, show: () => true },
  { to: "/tasks", label: "Công việc", icon: ListTodo, show: (m) => m.canViewStaff },
  { to: "/media", label: "Media", icon: Images, show: (m) => m.canViewMedia },
  { to: "/calendar", label: "Lịch", icon: Calendar, show: (m) => m.canViewCalendar },
  { to: "/attendance", label: "Điểm danh", icon: QrCode, show: () => true },
  { to: "/quy", label: "Quỹ", icon: Wallet, show: () => true },
  { to: "/y-tuong", label: "Ý tưởng", icon: Lightbulb, show: () => true },
  { to: "/phong-van", label: "Phỏng vấn", icon: ClipboardCheck, show: (m) => m.canViewStaff },
  { to: "/analytics", label: "Thống kê", icon: BarChart3, show: (m) => m.canViewStaff },
  { to: "/huong-dan", label: "Hướng dẫn", icon: BookMarked, show: () => true },
  { to: "/settings", label: "Hồ sơ", icon: CircleUser, show: () => true },
];

export function AppShell({ children }: { children: ReactNode }) {
  const [me, setMe] = useState<Me | null>(null);
  const [bootErr, setBootErr] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<Awaited<ReturnType<typeof globalSearch>> | null>(null);
  const [unread, setUnread] = useState(0);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    let live = true;
    let resolved = false;
    const t = window.setTimeout(() => {
      if (live && !resolved) setBootErr("Phiên tải quá lâu. Hãy tải lại trang.");
    }, 8000);
    getMe()
      .then(async (m) => {
        resolved = true;
        if (!live) return;
        try {
          const raw = sessionStorage.getItem("nigoto_identity");
          if (raw && missingIdentity(m)) {
            const pending = JSON.parse(raw) as { fullName: string; studentId: string; birthday: string };
            await saveSignupIdentity({ data: pending });
            sessionStorage.removeItem("nigoto_identity");
            m = await getMe();
          }
        } catch {
          /* fill form if pending apply fails */
        }
        try {
          sessionStorage.removeItem("nigoto_chunk_reload");
        } catch {
          /* ignore */
        }
        setMe(m);
        setBootErr(null);
      })
      .catch((e) => {
        resolved = true;
        if (live) setBootErr(errorMessage(e, "Không tải được phiên."));
      });
    return () => {
      live = false;
      window.clearTimeout(t);
    };
  }, []);

  useEffect(() => {
    listNotifications()
      .then((n) => setUnread(n.unread))
      .catch(() => {});
  }, [pathname]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (pathname.startsWith("/checkin/")) sessionStorage.setItem("nigoto_next", pathname);
  }, [pathname]);

  useEffect(() => {
    if (q.trim().length < 2) {
      setHits(null);
      return;
    }
    const t = setTimeout(() => {
      globalSearch({ data: { q } }).then(setHits).catch(() => setHits(null));
    }, 220);
    return () => clearTimeout(t);
  }, [q]);

  const items = useMemo(() => (me ? NAV.filter((n) => n.show(me)) : NAV.slice(0, 6)), [me]);

  if (bootErr && !me) {
    return (
      <div className="grid min-h-screen place-items-center bg-paper p-6 text-center">
        <div>
          <p className="font-display text-2xl">Nigoto Hub</p>
          <p className="mt-2 text-accent">{bootErr}</p>
          <button className="mt-4 rounded-full bg-accent px-4 py-2 text-sm font-semibold text-paper-3" onClick={() => window.location.reload()}>
            Tải lại
          </button>
        </div>
      </div>
    );
  }
  if (!me) return <BootScreen />;
  if (missingIdentity(me)) {
    return <CompleteIdentity name={me.name} onDone={() => window.location.reload()} />;
  }

  const side = (
    <div className="flex h-full flex-col">
      <div className="px-5 py-6">
        <p className="font-display text-2xl text-paper-3">Nigoto</p>
        <p className="text-xs tracking-[0.18em] text-gold uppercase">日本語 Hub</p>
      </div>
      <nav className="min-h-0 flex-1 space-y-0.5 overflow-y-auto px-3 pb-6">
        {items.map((n) => {
          const active = n.to === "/" ? pathname === "/" : pathname === n.to || pathname.startsWith(`${n.to}/`);
          const Icon = n.icon;
          return (
            <Link
              key={n.to}
              to={n.to}
              onClick={() => setOpen(false)}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm min-h-11",
                active ? "bg-paper-3/15 text-paper-3" : "text-paper-3/75 hover:bg-paper-3/10 hover:text-paper-3",
              )}
            >
              <Icon className={cn("size-4 shrink-0", active ? "text-gold" : "opacity-80")} strokeWidth={1.75} />
              {n.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-paper-3/10 px-4 py-4 text-sm text-paper-3">
        <p className="truncate font-medium">{me.name}</p>
        <p className="truncate text-xs text-paper-3/60">{me.depts[0]?.name ?? "Thành viên"}</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-paper md:grid md:grid-cols-[240px_1fr]">
      <aside className="sticky top-0 hidden h-screen bg-ink md:block">{side}</aside>
      {open ? (
        <div className="fixed inset-0 z-40 md:hidden">
          <button className="absolute inset-0 bg-ink/40" onClick={() => setOpen(false)} aria-label="Đóng menu" />
          <aside className="relative h-full w-[80%] max-w-xs bg-ink">{side}</aside>
        </div>
      ) : null}
      <div className="min-w-0">
        <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-line bg-paper/90 px-4 py-3 backdrop-blur">
          <button className="md:hidden min-h-11 min-w-11" onClick={() => setOpen(true)} aria-label="Mở menu">
            {open ? <X /> : <Menu />}
          </button>
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Tìm thành viên, sự kiện…"
              className="w-full rounded-full border border-line bg-paper-3 py-2.5 pl-10 pr-4 text-sm text-ink outline-none"
            />
            {hits ? (
              <div className="absolute z-30 mt-2 w-full rounded-2xl border border-line bg-paper-3 p-3 shadow-lg">
                {!hits.people.length && !hits.events.length ? (
                  <p className="text-sm text-muted">Không có kết quả.</p>
                ) : (
                  <div className="space-y-2 text-sm">
                    {hits.people.map((p) => (
                      <Link key={p.user_id} to="/members/$id" params={{ id: p.user_id }} className="block rounded-lg px-2 py-1 hover:bg-paper-2" onClick={() => setQ("")}>
                        {p.full_name} · {p.student_id}
                      </Link>
                    ))}
                    {hits.events.map((e) => (
                      <Link key={e.id} to="/events/$id" params={{ id: e.id }} className="block rounded-lg px-2 py-1 hover:bg-paper-2" onClick={() => setQ("")}>
                        Sự kiện · {e.title}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ) : null}
          </div>
          <Link to="/notifications" className="relative min-h-11 min-w-11 grid place-items-center">
            <Bell className="size-5" />
            {unread > 0 ? <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-accent" /> : null}
          </Link>
          <UserButton />
        </header>
        <main className="px-4 py-6 md:px-8 md:py-8">{children}</main>
      </div>
    </div>
  );
}
