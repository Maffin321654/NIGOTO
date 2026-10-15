import { createServerFn } from "@tanstack/react-start";
import { getSql } from "@/lib/db";
import { authMiddleware } from "@/lib/auth/middleware";
import { CHAT_REACT, EVENT_STATUS, EVENT_TYPES, LIMITS, POSITIONS, ROLES, STATUSES, normalizeCourseKind } from "@/lib/constants";
import {
  clip,
  isGoogleDriveUrl,
  maskStudentId,
  nid,
  validateBirthday,
  validateDesc,
  validateName,
  validatePhone,
  validateStudentId,
  validateTitle,
} from "@/lib/utils";
import { deny, loadActor, logActivity, notify, purgeUser, readSignupOpen, writeSignupOpen, type Actor } from "./core";
import { sendEmail } from "./email";
import { findBannedWord } from "@/lib/chat-filter";
import { hashPassword } from "better-auth/crypto";
import { interviewBan, interviewMax } from "@/lib/interview";

async function actorOf(userId: string) {
  const sql = await getSql();
  return { sql, me: await loadActor(sql, userId) };
}

function publicFlag(v: unknown) {
  return v === true || v === "true" || v === 1 || v === "t";
}

function maskIfNeeded(me: Actor, studentId: string | null) {
  if (me.membersOnly) return maskStudentId(studentId);
  return studentId || "—";
}

function coverPos(raw: unknown) {
  const m = /^(\d{1,3})%\s+(\d{1,3})%$/.exec(String(raw || "").trim());
  if (!m) return "50% 50%";
  const n = (s: string) => Math.max(0, Math.min(100, Math.round(Number(s))));
  return `${n(m[1])}% ${n(m[2])}%`;
}

export const getMe = createServerFn({ method: "GET" }).middleware([authMiddleware]).handler(async ({ context }) => {
  const { sql, me } = await actorOf(context.userId);
  const viol = await sql<{ n: number }>`select count(*)::int as n from chat_violations where user_id = ${me.userId}`;
  return { ...me, chatViolations: viol[0]?.n ?? 0 };
});

export const saveSignupIdentity = createServerFn({ method: "POST" }).middleware([authMiddleware])
  .validator((d: { fullName: string; studentId: string; birthday: string }) => d)
  .handler(async ({ context, data }) => {
    const { sql, me } = await actorOf(context.userId);
    const name = validateName(data.fullName);
    const sid = validateStudentId(data.studentId);
    const bday = validateBirthday(data.birthday);
    const clash = await sql<{ user_id: string }>`
      select user_id from profiles where student_id = ${sid} and user_id <> ${me.userId} and deleted_at is null limit 1`;
    if (clash[0]) throw new Error("MSSV này đã được dùng. Mỗi thành viên một mã.");
    await sql`update profiles set full_name = ${name}, student_id = ${sid}, birthday = ${bday}::date
      where user_id = ${me.userId}`;
    await sql`update "user" set name = ${name} where id = ${me.userId}`;
    return loadActor(sql, me.userId);
  });

export const updateMyProfile = createServerFn({ method: "POST" }).middleware([authMiddleware])
  .validator((d: { phone?: string }) => d)
  .handler(async ({ context, data }) => {
    const { sql, me } = await actorOf(context.userId);
    const phone = validatePhone(data.phone ?? "");
    await sql`update profiles set phone = ${phone || null} where user_id = ${me.userId}`;
    return loadActor(sql, me.userId);
  });

export const requestPasswordReset = createServerFn({ method: "POST" }).middleware([authMiddleware])
  .validator((d: { email: string }) => d)
  .handler(async ({ data }) => {
    await sendEmail({
      to: data.email,
      subject: "Đặt lại mật khẩu Nigoto Hub",
      text: "Nếu email này có tài khoản, hãy dùng form đăng nhập để tạo mật khẩu mới sau khi quản trị hỗ trợ.",
    });
    return { ok: true };
  });

export const getDashboard = createServerFn({ method: "GET" }).middleware([authMiddleware]).handler(async ({ context }) => {
  const { sql, me } = await actorOf(context.userId);
  const memberCount = await sql<{ n: number }>`select count(*)::int as n from profiles where deleted_at is null`;
  const eventFilter = me.canCreateEvent
    ? sql<{ id: string; title: string; start_at: string; location: string; is_public: boolean }>`
        select id, title, start_at, location, is_public from events
        where deleted_at is null and start_at >= now() - interval '1 day'
        order by start_at asc limit 6`
    : sql<{ id: string; title: string; start_at: string; location: string; is_public: boolean }>`
        select id, title, start_at, location, is_public from events
        where deleted_at is null and is_public = true and start_at >= now() - interval '1 day'
        order by start_at asc limit 6`;
  const events = await eventFilter;

  const myTasks = me.canViewStaff
    ? await sql<{ id: string; title: string; status: string; priority: string; deadline: string | null }>`
        select t.id, t.title, t.status, t.priority, t.deadline
        from tasks t join task_assignees a on a.task_id = t.id
        where a.user_id = ${me.userId} and t.deleted_at is null
          and t.status in ('TODO','IN_PROGRESS','REVIEW')
        order by t.deadline nulls last`
    : [];

  const announcements = await sql<{ id: string; title: string; body: string; created_at: string }>`
    select id, title, body, created_at from announcements order by created_at desc limit 5`;

  const overdue = me.canViewStaff
    ? await sql<{ n: number }>`select count(*)::int as n from tasks
        where deleted_at is null and status <> 'COMPLETED' and deadline < now()`
    : [{ n: 0 }];
  const inProgress = me.canViewStaff
    ? await sql<{ n: number }>`select count(*)::int as n from tasks
        where deleted_at is null and status = 'IN_PROGRESS'`
    : [{ n: 0 }];
  const pendingContent = me.canViewMedia
    ? await sql<{ n: number }>`select count(*)::int as n from content_items
        where deleted_at is null and status in ('SUBMITTED','CHANGES')`
    : [{ n: 0 }];

  return {
    me,
    memberCount: memberCount[0]?.n ?? 0,
    events,
    myTasks,
    announcements,
    overdue: overdue[0]?.n ?? 0,
    inProgress: inProgress[0]?.n ?? 0,
    pendingContent: pendingContent[0]?.n ?? 0,
  };
});

export const globalSearch = createServerFn({ method: "POST" }).middleware([authMiddleware])
  .validator((d: { q: string }) => d)
  .handler(async ({ context, data }) => {
    const { sql, me } = await actorOf(context.userId);
    const q = `%${data.q.trim().slice(0, 60)}%`;
    if (data.q.trim().length < 2) return { people: [], events: [], tasks: [], content: [] };
    const people = await sql<{ user_id: string; full_name: string; student_id: string | null }>`
      select user_id, full_name, student_id from profiles
      where deleted_at is null and (full_name ilike ${q} or student_id ilike ${q}) limit 8`;
    const events = me.canCreateEvent
      ? await sql<{ id: string; title: string }>`select id, title from events where deleted_at is null and title ilike ${q} limit 6`
      : await sql<{ id: string; title: string }>`select id, title from events where deleted_at is null and is_public = true and title ilike ${q} limit 6`;
    const tasks = me.canViewStaff
      ? await sql<{ id: string; title: string }>`select id, title from tasks where deleted_at is null and title ilike ${q} limit 6`
      : [];
    const content = me.canViewMedia
      ? await sql<{ id: string; title: string }>`select id, title from content_items where deleted_at is null and title ilike ${q} limit 6`
      : [];
    return {
      people: people.map((p) => ({ ...p, student_id: maskIfNeeded(me, p.student_id) })),
      events,
      tasks,
      content,
    };
  });

export const listMembers = createServerFn({ method: "GET" }).middleware([authMiddleware]).handler(async ({ context }) => {
  const { sql, me } = await actorOf(context.userId);
  const rows = await sql<{
    user_id: string;
    full_name: string;
    student_id: string | null;
    role: string;
    status: string;
    email: string;
    depts: string | null;
  }>`
    select p.user_id, p.full_name, p.student_id, p.role, p.status, u.email,
      string_agg(d.name, ', ' order by d.sort_order) as depts
    from profiles p
    join "user" u on u.id = p.user_id
    left join department_members dm on dm.user_id = p.user_id
    left join departments d on d.id = dm.department_id
    where p.deleted_at is null
    group by p.user_id, p.full_name, p.student_id, p.role, p.status, u.email
    order by p.full_name`;
  return rows.map((r) => ({ ...r, student_id: maskIfNeeded(me, r.student_id) }));
});

export const getMember = createServerFn({ method: "POST" }).middleware([authMiddleware])
  .validator((d: { id: string }) => d)
  .handler(async ({ context, data }) => {
    const { sql, me } = await actorOf(context.userId);
    const rows = await sql<{
      user_id: string;
      full_name: string;
      student_id: string | null;
      phone: string | null;
      birthday: string | null;
      role: string;
      status: string;
      join_date: string;
      email: string;
    }>`
      select p.*, u.email from profiles p
      join "user" u on u.id = p.user_id
      where p.user_id = ${data.id} and p.deleted_at is null limit 1`;
    const p = rows[0];
    if (!p) throw new Error("Không tìm thấy thành viên.");
    const depts = await sql<{ department_id: string; name: string; position: string }>`
      select dm.department_id, d.name, dm.position
      from department_members dm join departments d on d.id = dm.department_id
      where dm.user_id = ${data.id}`;
    const attended = await sql<{ n: number }>`select count(*)::int as n from attendance where user_id = ${data.id}`;
    const tasksDone = me.canViewStaff
      ? await sql<{ n: number }>`
          select count(*)::int as n from tasks t join task_assignees a on a.task_id = t.id
          where a.user_id = ${data.id} and t.status = 'COMPLETED' and t.deleted_at is null`
      : [{ n: 0 }];
    const tasksOpen = me.canViewStaff
      ? await sql<{ n: number }>`
          select count(*)::int as n from tasks t join task_assignees a on a.task_id = t.id
          where a.user_id = ${data.id} and t.status <> 'COMPLETED' and t.deleted_at is null`
      : [{ n: 0 }];
    const seeViol = me.userId === data.id || me.inBcn || me.isPresident || me.isAdmin;
    const viol = seeViol
      ? await sql<{ n: number }>`select count(*)::int as n from chat_violations where user_id = ${data.id}`
      : [{ n: 0 }];
    const cred = me.isPresident
      ? await sql<{ n: number }>`select count(*)::int as n from account where "userId" = ${data.id} and "providerId" = 'credential' and password is not null`
      : [{ n: 0 }];
    let attendanceBySemester: Array<{ id: string; name: string; n: number }> = [];
    try {
      attendanceBySemester = await sql<{ id: string; name: string; n: number }>`
        select s.id, s.name, count(a.id)::int as n
        from semesters s
        left join events e on e.semester_id = s.id and e.deleted_at is null
        left join attendance a on a.event_id = e.id and a.user_id = ${data.id}
        group by s.id, s.name, s.sort_order, s.created_at
        order by s.sort_order, s.created_at`;
    } catch {
      attendanceBySemester = [];
    }
    return {
      ...p,
      student_id: maskIfNeeded(me, p.student_id),
      student_id_raw: me.membersOnly ? null : p.student_id,
      phone: p.phone,
      depts,
      attended: attended[0]?.n ?? 0,
      attendanceBySemester,
      tasksDone: tasksDone[0]?.n ?? 0,
      tasksOpen: tasksOpen[0]?.n ?? 0,
      chatViolations: seeViol ? viol[0]?.n ?? 0 : null,
      canEdit: me.canEditIdentity,
      canManage: me.canManagePeople,
      canSetPassword: me.isPresident,
      hasPassword: me.isPresident ? (cred[0]?.n ?? 0) > 0 : null,
      viewer: me,
    };
  });

export const patchMember = createServerFn({ method: "POST" }).middleware([authMiddleware])
  .validator(
    (d: {
      id: string;
      role?: string;
      status?: string;
      fullName?: string;
      studentId?: string;
      birthday?: string;
      email?: string;
      phone?: string;
    }) => d,
  )
  .handler(async ({ context, data }) => {
    const { sql, me } = await actorOf(context.userId);
    if (!me.canManagePeople) deny();
    const target = await sql<{ role: string }>`select role from profiles where user_id = ${data.id} limit 1`;
    if (!target[0]) throw new Error("Không tìm thấy thành viên.");
    if (data.fullName || data.studentId || data.birthday || data.email) {
      if (!me.canEditIdentity) deny("Chỉ Chủ nhiệm được đổi họ tên, MSSV, ngày sinh và email.");
    }
    if (data.fullName) {
      const name = validateName(data.fullName);
      await sql`update profiles set full_name = ${name} where user_id = ${data.id}`;
      await sql`update "user" set name = ${name} where id = ${data.id}`;
    }
    if (data.studentId) {
      const sid = validateStudentId(data.studentId);
      const clash = await sql<{ user_id: string }>`
        select user_id from profiles where student_id = ${sid} and user_id <> ${data.id} and deleted_at is null limit 1`;
      if (clash[0]) throw new Error("MSSV này đã được dùng.");
      await sql`update profiles set student_id = ${sid} where user_id = ${data.id}`;
    }
    if (data.birthday) {
      const b = validateBirthday(data.birthday);
      await sql`update profiles set birthday = ${b}::date where user_id = ${data.id}`;
    }
    if (data.phone !== undefined) {
      const phone = validatePhone(data.phone);
      await sql`update profiles set phone = ${phone || null} where user_id = ${data.id}`;
    }
    if (data.email) {
      const email = data.email.trim().toLowerCase();
      const clash = await sql<{ id: string }>`select id from "user" where email = ${email} and id <> ${data.id} limit 1`;
      if (clash[0]) throw new Error("Email này đã được dùng.");
      await sql`update "user" set email = ${email} where id = ${data.id}`;
    }
    if (data.role && Object.values(ROLES).includes(data.role as never)) {
      if (data.id === me.userId && me.isPresident && data.role !== ROLES.PRESIDENT) {
        const others = await sql<{ n: number }>`select count(*)::int as n from profiles where role = ${ROLES.PRESIDENT} and user_id <> ${me.userId}`;
        if ((others[0]?.n ?? 0) === 0) deny("Không thể hạ Chủ nhiệm cuối cùng.");
      }
      await sql`update profiles set role = ${data.role} where user_id = ${data.id}`;
    }
    if (data.status && (STATUSES as readonly string[]).includes(data.status)) {
      await sql`update profiles set status = ${data.status} where user_id = ${data.id}`;
    }
    await logActivity(sql, me.userId, "patch_member", "profile", data.id);
    return { ok: true };
  });

export const deleteMember = createServerFn({ method: "POST" }).middleware([authMiddleware])
  .validator((d: { id: string }) => d)
  .handler(async ({ context, data }) => {
    const { sql, me } = await actorOf(context.userId);
    if (!me.canManagePeople) deny();
    if (data.id === me.userId) deny("Không thể xóa chính mình.");
    const t = await sql<{ role: string }>`select role from profiles where user_id = ${data.id} limit 1`;
    if (t[0]?.role === ROLES.PRESIDENT) {
      const n = await sql<{ n: number }>`select count(*)::int as n from profiles where role = ${ROLES.PRESIDENT}`;
      if ((n[0]?.n ?? 0) <= 1) deny("Không thể xóa Chủ nhiệm cuối.");
    }
    await purgeUser(sql, data.id);
    await logActivity(sql, me.userId, "delete_member", "profile", data.id);
    return { ok: true };
  });

export const setMemberPassword = createServerFn({ method: "POST" }).middleware([authMiddleware])
  .validator((d: { id: string; password: string }) => d)
  .handler(async ({ context, data }) => {
    const { sql, me } = await actorOf(context.userId);
    if (!me.isPresident) deny("Chỉ Chủ nhiệm được đổi mật khẩu thành viên.");
    const password = String(data.password || "");
    if (password.length < 8) throw new Error("Mật khẩu tối thiểu 8 ký tự.");
    if (password.length > 72) throw new Error("Mật khẩu tối đa 72 ký tự.");
    const exists = await sql<{ id: string }>`select id from "user" where id = ${data.id} limit 1`;
    if (!exists[0]) throw new Error("Không tìm thấy thành viên.");
    const hash = await hashPassword(password);
    const acc = await sql<{ id: string }>`
      select id from account where "userId" = ${data.id} and "providerId" = 'credential' limit 1`;
    if (acc[0]) {
      await sql`update account set password = ${hash}, "updatedAt" = now() where id = ${acc[0].id}`;
    } else {
      await sql`
        insert into account (id, "accountId", "providerId", "userId", password, "createdAt", "updatedAt")
        values (${nid("acc")}, ${data.id}, ${"credential"}, ${data.id}, ${hash}, now(), now())`;
    }
    await logActivity(sql, me.userId, "set_member_password", "profile", data.id);
    return { ok: true };
  });

export const listDepartments = createServerFn({ method: "GET" }).middleware([authMiddleware]).handler(async ({ context }) => {
  const { sql } = await actorOf(context.userId);
  const depts = await sql<{ id: string; name: string; description: string; n: number }>`
    select d.id, d.name, d.description, count(dm.user_id)::int as n
    from departments d
    left join department_members dm on dm.department_id = d.id
    group by d.id, d.name, d.description, d.sort_order
    order by d.sort_order`;
  return depts;
});

export const getDepartment = createServerFn({ method: "POST" }).middleware([authMiddleware])
  .validator((d: { id: string }) => d)
  .handler(async ({ context, data }) => {
    const { sql, me } = await actorOf(context.userId);
    const drows = await sql<{ id: string; name: string; description: string }>`
      select id, name, description from departments where id = ${data.id} limit 1`;
    const dept = drows[0];
    if (!dept) throw new Error("Không tìm thấy ban.");
    const members = await sql<{
      user_id: string;
      full_name: string;
      position: string;
      student_id: string | null;
      role: string;
    }>`
      select p.user_id, p.full_name, dm.position, p.student_id, p.role
      from department_members dm
      join profiles p on p.user_id = dm.user_id
      where dm.department_id = ${data.id}
      order by case dm.position when 'HEAD' then 0 when 'VICE_HEAD' then 1 else 2 end, p.full_name`;
    return {
      ...dept,
      members: members.map((m) => ({ ...m, student_id: maskIfNeeded(me, m.student_id) })),
      canManage: me.canManagePeople,
    };
  });

export const assignDepartmentMember = createServerFn({ method: "POST" }).middleware([authMiddleware])
  .validator((d: { departmentId: string; userId: string; position: string }) => d)
  .handler(async ({ context, data }) => {
    const { sql, me } = await actorOf(context.userId);
    if (!me.canManagePeople) deny();
    if (!(POSITIONS as readonly string[]).includes(data.position)) throw new Error("Chức vụ không hợp lệ.");
    await sql`insert into department_members (department_id, user_id, position)
      values (${data.departmentId}, ${data.userId}, ${data.position})
      on conflict (department_id, user_id) do update set position = excluded.position`;
    await logActivity(sql, me.userId, "assign_dept", "department", data.departmentId, data.userId);
    return { ok: true };
  });

export const removeDepartmentMember = createServerFn({ method: "POST" }).middleware([authMiddleware])
  .validator((d: { departmentId: string; userId: string }) => d)
  .handler(async ({ context, data }) => {
    const { sql, me } = await actorOf(context.userId);
    if (!me.canManagePeople) deny();
    await sql`delete from department_members where department_id = ${data.departmentId} and user_id = ${data.userId}`;
    return { ok: true };
  });

type EventRow = {
  id: string;
  title: string;
  description: string;
  event_type: string;
  status: string;
  location: string;
  start_at: string;
  end_at: string | null;
  cover_url: string | null;
  cover_pos: string | null;
  is_public: boolean;
  checkin_open: boolean;
  join_open: boolean;
  checkin_token: string;
  organizer_id: string;
  semester_id: string;
};

export const listSemesters = createServerFn({ method: "GET" }).middleware([authMiddleware]).handler(async ({ context }) => {
  const { sql, me } = await actorOf(context.userId);
  const rows = await sql<{ id: string; name: string }>`
    select id, name from semesters order by sort_order, created_at`;
  return { me, semesters: rows, defaultId: rows[0]?.id ?? "" };
});

export const saveSemester = createServerFn({ method: "POST" }).middleware([authMiddleware])
  .validator((d: { name: string }) => d)
  .handler(async ({ context, data }) => {
    const { sql, me } = await actorOf(context.userId);
    if (!me.canCreateEvent && !me.canManageFund) deny("Chỉ Ban Chủ nhiệm / Ban Sự kiện được tạo học kỳ.");
    const name = validateTitle(data.name);
    const clash = await sql<{ id: string }>`select id from semesters where lower(name) = ${name.toLowerCase()} limit 1`;
    if (clash[0]) throw new Error("Học kỳ này đã có.");
    const max = await sql<{ n: number }>`select coalesce(max(sort_order), -1)::int as n from semesters`;
    const id = nid("sem");
    await sql`insert into semesters (id, name, sort_order) values (${id}, ${name}, ${(max[0]?.n ?? -1) + 1})`;
    await logActivity(sql, me.userId, "create_semester", "semester", id);
    return { id };
  });

export const listEvents = createServerFn({ method: "POST" }).middleware([authMiddleware])
  .validator((d?: { semesterId?: string }) => d ?? {})
  .handler(async ({ context, data }) => {
    const { sql, me } = await actorOf(context.userId);
    const sid = data.semesterId?.trim() || "";
    const rows = me.canCreateEvent
      ? sid
        ? await sql<EventRow>`select * from events where deleted_at is null and semester_id = ${sid} order by start_at desc`
        : await sql<EventRow>`select * from events where deleted_at is null order by start_at desc`
      : sid
        ? await sql<EventRow>`select * from events where deleted_at is null and is_public = true and semester_id = ${sid} order by start_at desc`
        : await sql<EventRow>`select * from events where deleted_at is null and is_public = true order by start_at desc`;
    return rows.map((e) => ({
      ...e,
      checkin_token: me.canToggleCheckin ? e.checkin_token : "",
      is_public: publicFlag(e.is_public),
      checkin_open: publicFlag(e.checkin_open),
      join_open: e.join_open == null ? true : publicFlag(e.join_open),
    }));
  });

export const getEvent = createServerFn({ method: "POST" }).middleware([authMiddleware])
  .validator((d: { id: string }) => d)
  .handler(async ({ context, data }) => {
    const { sql, me } = await actorOf(context.userId);
    const rows = await sql<EventRow>`select * from events where id = ${data.id} and deleted_at is null limit 1`;
    const e = rows[0];
    if (!e) throw new Error("Không tìm thấy sự kiện.");
    if (!publicFlag(e.is_public) && !me.canCreateEvent) deny("Sự kiện chưa công bố.");
    const sem = e.semester_id
      ? await sql<{ name: string }>`select name from semesters where id = ${e.semester_id} limit 1`
      : [];
    const joined = await sql<{ n: number }>`select count(*)::int as n from event_participants where event_id = ${e.id}`;
    const attended = await sql<{ n: number }>`select count(*)::int as n from attendance where event_id = ${e.id}`;
    const mine = await sql<{ n: number }>`select count(*)::int as n from event_participants where event_id = ${e.id} and user_id = ${me.userId}`;
    const myAtt = await sql<{ n: number }>`select count(*)::int as n from attendance where event_id = ${e.id} and user_id = ${me.userId}`;
    const people = me.canToggleCheckin
      ? await sql<{ user_id: string; full_name: string; student_id: string | null; depts: string | null; checked_at: string | null }>`
          select p.user_id, p.full_name, p.student_id, a.checked_at,
            string_agg(d.name, ', ' order by d.sort_order) as depts
          from event_participants ep
          join profiles p on p.user_id = ep.user_id
          left join attendance a on a.event_id = ep.event_id and a.user_id = ep.user_id
          left join department_members dm on dm.user_id = p.user_id
          left join departments d on d.id = dm.department_id
          where ep.event_id = ${e.id}
          group by p.user_id, p.full_name, p.student_id, a.checked_at
          order by p.full_name`
      : [];
    return {
      ...e,
      is_public: publicFlag(e.is_public),
      checkin_open: publicFlag(e.checkin_open),
      join_open: e.join_open == null ? true : publicFlag(e.join_open),
      checkin_token: me.canToggleCheckin ? e.checkin_token : "",
      joined: joined[0]?.n ?? 0,
      attended: attended[0]?.n ?? 0,
      iJoined: (mine[0]?.n ?? 0) > 0,
      iAttended: (myAtt[0]?.n ?? 0) > 0,
      people: people.map((p) => ({ ...p, student_id: maskIfNeeded(me, p.student_id), depts: p.depts || "—" })),
      canEdit: me.canCreateEvent,
      canEditContent: me.canViewStaff,
      canPublish: me.inBcn || me.isAdmin,
      canCheckinToggle: me.canToggleCheckin,
      semesterName: sem[0]?.name || "",
    };
  });

export const saveEvent = createServerFn({ method: "POST" }).middleware([authMiddleware])
  .validator(
    (d: {
      id?: string;
      title: string;
      description: string;
      event_type: string;
      status: string;
      location: string;
      start_at: string;
      end_at?: string;
      cover_url?: string;
      cover_pos?: string;
      is_public?: boolean;
      semesterId?: string;
    }) => d,
  )
  .handler(async ({ context, data }) => {
    const { sql, me } = await actorOf(context.userId);
    if (data.id) {
      if (!me.canViewStaff) deny("Chỉ ban quản trị sửa nội dung sự kiện.");
    } else if (!me.canCreateEvent) deny();
    if (!EVENT_TYPES.some((t) => t.id === data.event_type)) throw new Error("Loại sự kiện không hợp lệ.");
    const title = validateTitle(data.title);
    const description = validateDesc(data.description);
    const id = data.id || nid("evt");
    const token = nid("qr");
    const semesterId = (data.semesterId || "").trim();
    if (!data.id) {
      if (!semesterId) throw new Error("Chọn học kỳ trước khi tạo sự kiện.");
      const sem = await sql<{ id: string }>`select id from semesters where id = ${semesterId} limit 1`;
      if (!sem[0]) throw new Error("Học kỳ không tồn tại. Hãy tạo học kỳ trước.");
    }
    const pos = coverPos(data.cover_pos);
    if (data.id) {
      await sql`update events set
        title = ${title}, description = ${description}, event_type = ${data.event_type},
        status = ${data.status}, location = ${data.location}, start_at = ${data.start_at}::timestamptz,
        end_at = ${data.end_at ? data.end_at : null}, cover_url = ${data.cover_url || null},
        cover_pos = ${pos},
        updated_at = now()
        where id = ${id} and deleted_at is null`;
    } else {
      await sql`insert into events
        (id, title, description, event_type, status, location, start_at, end_at, cover_url, cover_pos, is_public, checkin_open, checkin_token, organizer_id, semester_id)
        values (${id}, ${title}, ${description}, ${data.event_type}, ${data.status}, ${data.location},
          ${data.start_at}::timestamptz, ${data.end_at ? data.end_at : null}, ${data.cover_url || null}, ${pos},
          ${!!data.is_public}, ${true}, ${token}, ${me.userId}, ${semesterId})`;
    }
    await logActivity(sql, me.userId, data.id ? "update_event" : "create_event", "event", id);
    return { id };
  });

export const setEventStatus = createServerFn({ method: "POST" }).middleware([authMiddleware])
  .validator((d: { id: string; status: string }) => d)
  .handler(async ({ context, data }) => {
    const { sql, me } = await actorOf(context.userId);
    if (!me.canCreateEvent) deny();
    if (!EVENT_STATUS.some((s) => s.id === data.status)) throw new Error("Trạng thái không hợp lệ.");
    await sql`update events set status = ${data.status}, updated_at = now() where id = ${data.id} and deleted_at is null`;
    return { ok: true };
  });

export const setEventPublic = createServerFn({ method: "POST" }).middleware([authMiddleware])
  .validator((d: { id: string; is_public: boolean }) => d)
  .handler(async ({ context, data }) => {
    const { sql, me } = await actorOf(context.userId);
    if (!me.inBcn && !me.isAdmin) deny();
    await sql`update events set is_public = ${data.is_public}, updated_at = now() where id = ${data.id}`;
    return { ok: true };
  });

export const deleteEvent = createServerFn({ method: "POST" }).middleware([authMiddleware])
  .validator((d: { id: string }) => d)
  .handler(async ({ context, data }) => {
    const { sql, me } = await actorOf(context.userId);
    if (!me.canDeleteEvent) deny();
    await sql`update events set deleted_at = now() where id = ${data.id}`;
    return { ok: true };
  });

export const joinEvent = createServerFn({ method: "POST" }).middleware([authMiddleware])
  .validator((d: { id: string }) => d)
  .handler(async ({ context, data }) => {
    const { sql, me } = await actorOf(context.userId);
    const e = await sql<{ is_public: boolean; join_open: boolean | null }>`
      select is_public, join_open from events where id = ${data.id} and deleted_at is null`;
    if (!e[0]) throw new Error("Không tìm thấy sự kiện.");
    if (!publicFlag(e[0].is_public) && !me.canCreateEvent) deny();
    if (e[0].join_open != null && !publicFlag(e[0].join_open)) throw new Error("Sự kiện đã dừng nhận đăng ký.");
    await sql`insert into event_participants (event_id, user_id) values (${data.id}, ${me.userId}) on conflict do nothing`;
    return { ok: true };
  });

export const listAttendanceEvents = createServerFn({ method: "POST" }).middleware([authMiddleware])
  .validator((d?: { semesterId?: string }) => d ?? {})
  .handler(async ({ context, data }) => {
    const { sql, me } = await actorOf(context.userId);
    const sid = data.semesterId?.trim() || "";
    const rows = me.canCreateEvent
      ? sid
        ? await sql<EventRow>`select * from events where deleted_at is null and semester_id = ${sid} order by start_at desc`
        : await sql<EventRow>`select * from events where deleted_at is null order by start_at desc`
      : sid
        ? await sql<EventRow>`select * from events where deleted_at is null and is_public = true and semester_id = ${sid} order by start_at desc`
        : await sql<EventRow>`select * from events where deleted_at is null and is_public = true order by start_at desc`;
  const out = [];
  for (const e of rows) {
    const att = await sql<{ n: number }>`select count(*)::int as n from attendance where event_id = ${e.id}`;
    const mine = await sql<{ n: number }>`select count(*)::int as n from attendance where event_id = ${e.id} and user_id = ${me.userId}`;
    out.push({
      id: e.id,
      title: e.title,
      start_at: e.start_at,
      location: e.location,
      is_public: publicFlag(e.is_public),
      checkin_open: publicFlag(e.checkin_open),
      join_open: e.join_open == null ? true : publicFlag(e.join_open),
      checkin_token: me.canToggleCheckin ? e.checkin_token : "",
      attended_count: me.canToggleCheckin ? (att[0]?.n ?? 0) : 0,
      attended: (mine[0]?.n ?? 0) > 0,
    });
  }
  return { me, events: out };
});

export const setCheckinOpen = createServerFn({ method: "POST" }).middleware([authMiddleware])
  .validator((d: { id: string; open: boolean }) => d)
  .handler(async ({ context, data }) => {
    const { sql, me } = await actorOf(context.userId);
    if (!me.canToggleCheckin) deny();
    await sql`update events set checkin_open = ${data.open}, updated_at = now() where id = ${data.id}`;
    return { ok: true };
  });

export const setJoinOpen = createServerFn({ method: "POST" }).middleware([authMiddleware])
  .validator((d: { id: string; open: boolean }) => d)
  .handler(async ({ context, data }) => {
    const { sql, me } = await actorOf(context.userId);
    if (!me.canToggleCheckin) deny();
    await sql`update events set join_open = ${data.open}, updated_at = now() where id = ${data.id}`;
    return { ok: true };
  });

export const checkinEvent = createServerFn({ method: "POST" }).middleware([authMiddleware])
  .validator((d: { eventId: string; method?: string }) => d)
  .handler(async ({ context, data }) => {
    const { sql, me } = await actorOf(context.userId);
    const e = await sql<{ id: string; checkin_open: boolean; title: string }>`
      select id, checkin_open, title from events where id = ${data.eventId} and deleted_at is null limit 1`;
    if (!e[0]) throw new Error("Không tìm thấy sự kiện.");
    if (!publicFlag(e[0].checkin_open)) throw new Error("Điểm danh đã đóng. Ban quản trị chưa nhận thêm.");
    await sql`insert into event_participants (event_id, user_id) values (${data.eventId}, ${me.userId}) on conflict do nothing`;
    await sql`insert into attendance (id, event_id, user_id, method)
      values (${nid("att")}, ${data.eventId}, ${me.userId}, ${data.method || "QR"})
      on conflict (event_id, user_id) do nothing`;
    return { ok: true, title: e[0].title };
  });

export const manualCheckin = createServerFn({ method: "POST" }).middleware([authMiddleware])
  .validator((d: { eventId: string; userId: string }) => d)
  .handler(async ({ context, data }) => {
    const { sql, me } = await actorOf(context.userId);
    if (!me.canToggleCheckin) deny();
    await sql`insert into event_participants (event_id, user_id) values (${data.eventId}, ${data.userId}) on conflict do nothing`;
    await sql`insert into attendance (id, event_id, user_id, method)
      values (${nid("att")}, ${data.eventId}, ${data.userId}, ${"MANUAL"})
      on conflict (event_id, user_id) do nothing`;
    return { ok: true };
  });

export const listTasks = createServerFn({ method: "GET" }).middleware([authMiddleware]).handler(async ({ context }) => {
  const { sql, me } = await actorOf(context.userId);
  if (!me.canViewStaff) deny();
  const tasks = await sql<{
    id: string;
    title: string;
    description: string;
    status: string;
    priority: string;
    deadline: string | null;
    creator_id: string;
    department_id: string | null;
  }>`select id, title, description, status, priority, deadline, creator_id, department_id
     from tasks where deleted_at is null order by created_at desc`;
  const assignees = await sql<{ task_id: string; user_id: string; full_name: string }>`
    select a.task_id, a.user_id, p.full_name
    from task_assignees a join profiles p on p.user_id = a.user_id`;
  const byTask: Record<string, { user_id: string; full_name: string }[]> = {};
  for (const a of assignees) {
    (byTask[a.task_id] ??= []).push({ user_id: a.user_id, full_name: a.full_name });
  }
  return {
    me,
    tasks: tasks.map((t) => ({
      ...t,
      assignees: byTask[t.id] ?? [],
      overdue: !!(t.deadline && t.status !== "COMPLETED" && new Date(t.deadline).getTime() < Date.now()),
    })),
  };
});

export const saveTask = createServerFn({ method: "POST" }).middleware([authMiddleware])
  .validator(
    (d: {
      id?: string;
      title: string;
      description: string;
      status: string;
      priority: string;
      deadline?: string;
      department_id?: string;
      assigneeIds: string[];
    }) => d,
  )
  .handler(async ({ context, data }) => {
    const { sql, me } = await actorOf(context.userId);
    if (!me.canCreateTask) deny();
    const title = validateTitle(data.title);
    const description = validateDesc(data.description);
    const id = data.id || nid("task");
    if (data.id) {
      await sql`update tasks set title = ${title}, description = ${description}, status = ${data.status},
        priority = ${data.priority}, deadline = ${data.deadline || null}, department_id = ${data.department_id || null},
        updated_at = now() where id = ${id}`;
      await sql`delete from task_assignees where task_id = ${id}`;
    } else {
      await sql`insert into tasks (id, title, description, status, priority, deadline, creator_id, department_id)
        values (${id}, ${title}, ${description}, ${data.status}, ${data.priority}, ${data.deadline || null}, ${me.userId}, ${data.department_id || null})`;
    }
    for (const uid of data.assigneeIds ?? []) {
      await sql`insert into task_assignees (task_id, user_id) values (${id}, ${uid}) on conflict do nothing`;
      if (!data.id) await notify(sql, uid, "Bạn được giao việc mới", title, "/tasks");
    }
    return { id };
  });

export const setTaskStatus = createServerFn({ method: "POST" }).middleware([authMiddleware])
  .validator((d: { id: string; status: string }) => d)
  .handler(async ({ context, data }) => {
    const { sql, me } = await actorOf(context.userId);
    const assigned = await sql<{ n: number }>`select count(*)::int as n from task_assignees where task_id = ${data.id} and user_id = ${me.userId}`;
    if (!me.canCreateTask && (assigned[0]?.n ?? 0) === 0) deny();
    await sql`update tasks set status = ${data.status}, updated_at = now() where id = ${data.id}`;
    return { ok: true };
  });

export const deleteTask = createServerFn({ method: "POST" }).middleware([authMiddleware])
  .validator((d: { id: string }) => d)
  .handler(async ({ context, data }) => {
    const { sql, me } = await actorOf(context.userId);
    if (!me.canCreateTask) deny();
    await sql`update tasks set deleted_at = now() where id = ${data.id}`;
    return { ok: true };
  });

export const listContent = createServerFn({ method: "GET" }).middleware([authMiddleware]).handler(async ({ context }) => {
  const { sql, me } = await actorOf(context.userId);
  if (!me.canViewMedia) deny();
  const items = await sql<{
    id: string;
    title: string;
    caption: string;
    platform: string;
    content_type: string;
    status: string;
    publish_at: string | null;
    created_by: string;
    writer_id: string | null;
  }>`select id, title, caption, platform, content_type, status, publish_at, created_by, writer_id
     from content_items where deleted_at is null order by coalesce(publish_at, created_at) desc`;
  return { me, items };
});

export const saveContent = createServerFn({ method: "POST" }).middleware([authMiddleware])
  .validator(
    (d: {
      id?: string;
      title: string;
      caption: string;
      platform: string;
      content_type: string;
      publish_at?: string;
      event_id?: string;
      status?: string;
    }) => d,
  )
  .handler(async ({ context, data }) => {
    const { sql, me } = await actorOf(context.userId);
    if (!me.canCreateContent) deny("Chỉ Ban Truyền thông và Ban Chủ nhiệm được tạo nội dung.");
    const title = validateTitle(data.title);
    const caption = validateDesc(data.caption);
    if (!data.publish_at) throw new Error("Phải chọn ngày giờ đăng trên lịch.");
    const when = new Date(data.publish_at);
    if (Number.isNaN(when.getTime())) throw new Error("Ngày giờ đăng không hợp lệ.");
    const id = data.id || nid("ct");
    const status = data.status || "IDEA";
    const publish = when.toISOString();
    if (data.id) {
      await sql`update content_items set title = ${title}, caption = ${caption}, platform = ${data.platform},
        content_type = ${data.content_type}, publish_at = ${publish}, event_id = ${data.event_id || null},
        status = ${status}, updated_at = now() where id = ${id}`;
    } else {
      await sql`insert into content_items
        (id, title, caption, platform, content_type, status, publish_at, event_id, writer_id, created_by)
        values (${id}, ${title}, ${caption}, ${data.platform}, ${data.content_type}, ${status},
          ${publish}, ${data.event_id || null}, ${me.userId}, ${me.userId})`;
    }
    return { id };
  });

export const reviewContent = createServerFn({ method: "POST" }).middleware([authMiddleware])
  .validator((d: { id: string; action: string; comment: string }) => d)
  .handler(async ({ context, data }) => {
    const { sql, me } = await actorOf(context.userId);
    if (!me.canCreateContent) deny();
    const map: Record<string, string> = {
      SUBMIT: "SUBMITTED",
      APPROVE: "APPROVED",
      REJECT: "REJECTED",
      CHANGES: "CHANGES",
    };
    const status = map[data.action];
    if (!status) throw new Error("Thao tác duyệt không hợp lệ.");
    if ((data.action === "REJECT" || data.action === "CHANGES") && !data.comment.trim()) {
      throw new Error("Cần ghi chú khi từ chối hoặc yêu cầu sửa.");
    }
    await sql`update content_items set status = ${status}, reviewer_id = ${me.userId}, updated_at = now() where id = ${data.id}`;
    await sql`insert into content_approvals (id, content_id, actor_id, action, comment)
      values (${nid("ap")}, ${data.id}, ${me.userId}, ${data.action}, ${clip(data.comment, LIMITS.description)})`;
    return { ok: true };
  });

export const deleteContent = createServerFn({ method: "POST" }).middleware([authMiddleware])
  .validator((d: { id: string }) => d)
  .handler(async ({ context, data }) => {
    const { sql, me } = await actorOf(context.userId);
    if (!me.canCreateContent) deny();
    await sql`update content_items set deleted_at = now() where id = ${data.id}`;
    return { ok: true };
  });

export const listCalendar = createServerFn({ method: "GET" }).middleware([authMiddleware]).handler(async ({ context }) => {
  const { sql, me } = await actorOf(context.userId);
  if (!me.canViewCalendar) deny();
  const events = me.canCreateEvent
    ? await sql<{ id: string; title: string; start_at: string; end_at: string | null; kind: string }>`
        select id, title, start_at, end_at, 'event' as kind from events where deleted_at is null`
    : await sql<{ id: string; title: string; start_at: string; end_at: string | null; kind: string }>`
        select id, title, start_at, end_at, 'event' as kind from events where deleted_at is null and is_public = true`;
  const posts = me.canViewMedia
    ? await sql<{ id: string; title: string; start_at: string; end_at: string | null; kind: string }>`
        select id, title, publish_at as start_at, publish_at as end_at, 'content' as kind from content_items
        where deleted_at is null and publish_at is not null`
    : [];
  return { me, items: [...events, ...posts] };
});

export const listAnnouncements = createServerFn({ method: "GET" }).middleware([authMiddleware]).handler(async ({ context }) => {
  const { sql, me } = await actorOf(context.userId);
  const rows = await sql<{ id: string; title: string; body: string; created_at: string; author_id: string; author: string }>`
    select a.id, a.title, a.body, a.created_at, a.author_id, p.full_name as author
    from announcements a join profiles p on p.user_id = a.author_id
    order by a.created_at desc`;
  return { me, rows };
});

export const saveAnnouncement = createServerFn({ method: "POST" }).middleware([authMiddleware])
  .validator((d: { title: string; body: string }) => d)
  .handler(async ({ context, data }) => {
    const { sql, me } = await actorOf(context.userId);
    if (!me.canAnnounce) deny();
    const title = validateTitle(data.title);
    const body = validateDesc(data.body);
    const id = nid("an");
    await sql`insert into announcements (id, title, body, author_id) values (${id}, ${title}, ${body}, ${me.userId})`;
    const people = await sql<{ user_id: string }>`select user_id from profiles where deleted_at is null`;
    for (const p of people) {
      await notify(sql, p.user_id, title, body, "/notifications");
    }
    return { id };
  });

export const deleteAnnouncement = createServerFn({ method: "POST" }).middleware([authMiddleware])
  .validator((d: { id: string }) => d)
  .handler(async ({ context, data }) => {
    const { sql, me } = await actorOf(context.userId);
    if (!me.canAnnounce) deny();
    await sql`delete from announcements where id = ${data.id}`;
    return { ok: true };
  });

export const listNotifications = createServerFn({ method: "GET" }).middleware([authMiddleware]).handler(async ({ context }) => {
  const { sql, me } = await actorOf(context.userId);
  const rows = await sql<{
    id: string;
    title: string;
    body: string;
    link: string | null;
    read_at: string | null;
    created_at: string;
  }>`select id, title, body, link, read_at, created_at from notifications
     where user_id = ${me.userId} order by created_at desc limit 80`;
  const unread = rows.filter((r) => !r.read_at).length;
  return { me, rows, unread };
});

export const markNotificationsRead = createServerFn({ method: "POST" }).middleware([authMiddleware]).handler(async ({ context }) => {
  const { sql, me } = await actorOf(context.userId);
  await sql`update notifications set read_at = now() where user_id = ${me.userId} and read_at is null`;
  return { ok: true };
});

export const listCourses = createServerFn({ method: "GET" }).middleware([authMiddleware]).handler(async ({ context }) => {
  const { sql, me } = await actorOf(context.userId);
  const rows = me.canCreateCourse
    ? await sql<{ id: string; title: string; description: string; is_public: boolean }>`
        select id, title, description, is_public from courses where deleted_at is null order by created_at desc`
    : await sql<{ id: string; title: string; description: string; is_public: boolean }>`
        select id, title, description, is_public from courses where deleted_at is null and is_public = true order by created_at desc`;
  const kinds = await sql<{ course_id: string; kind: string }>`select course_id, kind from course_items`;
  const map = new Map<string, Set<"VIDEO" | "DOC">>();
  for (const k of kinds) {
    const set = map.get(k.course_id) ?? new Set();
    set.add(normalizeCourseKind(k.kind));
    map.set(k.course_id, set);
  }
  return {
    me,
    rows: rows.map((r) => ({
      ...r,
      is_public: publicFlag(r.is_public),
      kinds: [...(map.get(r.id) ?? [])],
    })),
  };
});

export const getCourse = createServerFn({ method: "POST" }).middleware([authMiddleware])
  .validator((d: { id: string }) => d)
  .handler(async ({ context, data }) => {
    const { sql, me } = await actorOf(context.userId);
    const rows = await sql<{
      id: string;
      title: string;
      description: string;
      is_public: boolean;
      created_by: string;
    }>`select id, title, description, is_public, created_by from courses where id = ${data.id} and deleted_at is null`;
    const c = rows[0];
    if (!c) throw new Error("Không tìm thấy khóa học.");
    if (!publicFlag(c.is_public) && !me.canCreateCourse) deny();
    const items = await sql<{
      id: string;
      kind: string;
      title: string;
      media_url: string | null;
      extra: string | null;
      sort_order: number;
    }>`select id, kind, title, media_url, extra, sort_order from course_items where course_id = ${c.id} order by sort_order, created_at`;
    return { ...c, is_public: publicFlag(c.is_public), items, canEdit: me.canCreateCourse };
  });

export const saveCourse = createServerFn({ method: "POST" }).middleware([authMiddleware])
  .validator((d: { id?: string; title: string; description: string; is_public?: boolean }) => d)
  .handler(async ({ context, data }) => {
    const { sql, me } = await actorOf(context.userId);
    if (!me.canCreateCourse) deny();
    const title = validateTitle(data.title);
    const description = validateDesc(data.description);
    const id = data.id || nid("crs");
    if (data.id) {
      await sql`update courses set title = ${title}, description = ${description}, updated_at = now() where id = ${id}`;
    } else {
      await sql`insert into courses (id, title, description, is_public, created_by)
        values (${id}, ${title}, ${description}, ${!!data.is_public}, ${me.userId})`;
    }
    return { id };
  });

export const setCoursePublic = createServerFn({ method: "POST" }).middleware([authMiddleware])
  .validator((d: { id: string; is_public: boolean }) => d)
  .handler(async ({ context, data }) => {
    const { sql, me } = await actorOf(context.userId);
    if (!me.canCreateCourse) deny();
    await sql`update courses set is_public = ${data.is_public} where id = ${data.id}`;
    return { ok: true };
  });

export const deleteCourse = createServerFn({ method: "POST" }).middleware([authMiddleware])
  .validator((d: { id: string }) => d)
  .handler(async ({ context, data }) => {
    const { sql, me } = await actorOf(context.userId);
    if (!me.canCreateCourse) deny();
    await sql`update courses set deleted_at = now() where id = ${data.id}`;
    return { ok: true };
  });

export const saveCourseItem = createServerFn({ method: "POST" }).middleware([authMiddleware])
  .validator(
    (d: { courseId: string; kind: string; title: string; media_url?: string; extra?: string }) => d,
  )
  .handler(async ({ context, data }) => {
    const { sql, me } = await actorOf(context.userId);
    if (!me.canCreateCourse) deny();
    const title = validateTitle(data.title);
    const kind = normalizeCourseKind(data.kind);
    if (kind === "VIDEO") {
      if (!data.media_url || !isGoogleDriveUrl(data.media_url)) {
        throw new Error("Bài video chỉ nhận link Google Drive.");
      }
    }
    if (data.media_url && data.media_url.startsWith("data:") && data.media_url.length > LIMITS.videoBytes * 1.4) {
      throw new Error("Video tối đa 8MB. File lớn hơn hãy dùng Google Drive.");
    }
    await sql`insert into course_items (id, course_id, kind, title, media_url, extra)
      values (${nid("ci")}, ${data.courseId}, ${kind}, ${title}, ${data.media_url || null}, ${data.extra || null})`;
    return { ok: true };
  });

export const deleteCourseItem = createServerFn({ method: "POST" }).middleware([authMiddleware])
  .validator((d: { id: string }) => d)
  .handler(async ({ context, data }) => {
    const { sql, me } = await actorOf(context.userId);
    if (!me.canCreateCourse) deny();
    await sql`delete from course_items where id = ${data.id}`;
    return { ok: true };
  });

export const getAnalytics = createServerFn({ method: "GET" }).middleware([authMiddleware]).handler(async ({ context }) => {
  const { sql, me } = await actorOf(context.userId);
  if (!me.canViewStaff) deny();
  const byDept = await sql<{ name: string; n: number }>`
    select d.name, count(dm.user_id)::int as n
    from departments d left join department_members dm on dm.department_id = d.id
    group by d.name, d.sort_order order by d.sort_order`;
  const byStatus = await sql<{ status: string; n: number }>`
    select status, count(*)::int as n from profiles where deleted_at is null group by status`;
  const tasks = await sql<{ status: string; n: number }>`
    select status, count(*)::int as n from tasks where deleted_at is null group by status`;
  const overdue = await sql<{ n: number }>`select count(*)::int as n from tasks
    where deleted_at is null and status <> 'COMPLETED' and deadline < now()`;
  const events = await sql<{ n: number }>`select count(*)::int as n from events where deleted_at is null`;
  const logs = await sql<{ id: string; action: string; entity: string; created_at: string; actor: string | null }>`
    select l.id, l.action, l.entity, l.created_at, p.full_name as actor
    from activity_logs l left join profiles p on p.user_id = l.actor_id
    order by l.created_at desc limit 20`;
  return { me, byDept, byStatus, tasks, overdue: overdue[0]?.n ?? 0, events: events[0]?.n ?? 0, logs, signupOpen: me.isPresident ? await readSignupOpen(sql) : null };
});

export const getSignupOpen = createServerFn({ method: "GET" }).handler(async () => {
  const sql = await getSql();
  return { open: await readSignupOpen(sql) };
});

export const setSignupOpen = createServerFn({ method: "POST" }).middleware([authMiddleware])
  .validator((d: { open: boolean }) => d)
  .handler(async ({ context, data }) => {
    const { sql, me } = await actorOf(context.userId);
    if (!me.isPresident) deny("Chỉ Chủ nhiệm được bật/tắt nhận đăng ký.");
    await writeSignupOpen(sql, data.open);
    await logActivity(sql, me.userId, data.open ? "open_signup" : "close_signup", "club");
    return { open: data.open };
  });

function canModerateChat(me: Actor) {
  return me.inBcn || me.isPresident || me.isAdmin;
}

async function muteRemaining(sql: Awaited<ReturnType<typeof getSql>>, userId: string) {
  const rows = await sql<{ until_at: string }>`select until_at from chat_mutes where user_id = ${userId}`;
  const until = rows[0]?.until_at ? new Date(rows[0].until_at) : null;
  if (!until || Number.isNaN(until.getTime()) || until.getTime() <= Date.now()) return null;
  return until.toISOString();
}

function dataUrlBytes(dataUrl: string) {
  const i = dataUrl.indexOf(",");
  const b64 = i >= 0 ? dataUrl.slice(i + 1) : dataUrl;
  return Math.floor((b64.length * 3) / 4);
}

export const listChat = createServerFn({ method: "POST" }).middleware([authMiddleware])
  .validator((d?: { after?: string }) => d ?? {})
  .handler(async ({ context }) => {
    const { sql, me } = await actorOf(context.userId);
    const mutedUntil = await muteRemaining(sql, me.userId);
    const rows = await sql<{
      id: string;
      user_id: string | null;
      body: string;
      kind: string;
      created_at: string;
      reply_to: string | null;
      attachment_url: string | null;
      attachment_name: string | null;
      attachment_mime: string | null;
      full_name: string | null;
    }>`
      select m.id, m.user_id, m.body, m.kind, m.created_at, m.reply_to,
        m.attachment_url, m.attachment_name, m.attachment_mime, p.full_name
      from chat_messages m
      left join profiles p on p.user_id = m.user_id
      order by m.created_at desc
      limit 80`;
    const ids = rows.map((r) => r.id);
    const reacts = ids.length
      ? await sql.query<{ message_id: string; emoji: string; n: number; mine: boolean }>(
          `select message_id, emoji, count(*)::int as n,
             bool_or(user_id = $1) as mine
           from chat_reactions where message_id = any($2::text[])
           group by message_id, emoji`,
          [me.userId, ids],
        )
      : [];
    const reactMap = new Map<string, { emoji: string; count: number; mine: boolean }[]>();
    for (const r of reacts) {
      const list = reactMap.get(r.message_id) ?? [];
      list.push({ emoji: r.emoji, count: r.n, mine: publicFlag(r.mine) });
      reactMap.set(r.message_id, list);
    }
    const replyIds = [...new Set(rows.map((r) => r.reply_to).filter((x): x is string => !!x))];
    const replies = replyIds.length
      ? await sql.query<{ id: string; body: string; full_name: string | null }>(
          `select m.id, m.body, p.full_name from chat_messages m
           left join profiles p on p.user_id = m.user_id
           where m.id = any($1::text[])`,
          [replyIds],
        )
      : [];
    const replyMap = new Map(replies.map((r) => [r.id, r]));
    const messages = [...rows].reverse().map((r) => {
      const attName = r.attachment_name;
      const attUrl = r.attachment_url;
      const attMime = r.attachment_mime;
      const reply = r.reply_to ? replyMap.get(r.reply_to) : undefined;
      return {
        id: r.id,
        userId: r.user_id,
        name: r.full_name || "Thành viên",
        body: r.body,
        kind: r.kind,
        createdAt: r.created_at,
        replyTo: r.reply_to,
        replyPreview: reply ? { name: reply.full_name || "Thành viên", body: reply.body } : null,
        attachment: attName
          ? {
              name: attName,
              mime: attMime || "",
              preview: attMime?.startsWith("image/") ? attUrl : null,
            }
          : null,
        reactions: reactMap.get(r.id) ?? [],
      };
    });
    return { messages, mutedUntil, meId: me.userId, canModerate: canModerateChat(me) };
  });

export const sendChat = createServerFn({ method: "POST" }).middleware([authMiddleware])
  .validator(
    (d: {
      body: string;
      replyTo?: string;
      attachment?: { name: string; mime: string; dataUrl: string } | null;
    }) => d,
  )
  .handler(async ({ context, data }) => {
    const { sql, me } = await actorOf(context.userId);
    const muted = await muteRemaining(sql, me.userId);
    if (muted) {
      const s = Math.max(1, Math.ceil((new Date(muted).getTime() - Date.now()) / 1000));
      throw new Error(`Bạn đang timeout. Còn ${s} giây.`);
    }
    const body = clip(String(data.body || ""), LIMITS.chat).trim();
    const att = data.attachment;
    if (!body && !att) throw new Error("Nhắn gì đó hoặc đính kèm tệp.");
    const hit = findBannedWord(body);
    if (hit) {
      await sql`insert into chat_violations (id, user_id, word) values (${nid("cv")}, ${me.userId}, ${hit})`;
      const until = new Date(Date.now() + 30_000).toISOString();
      await sql`
        insert into chat_mutes (user_id, until_at) values (${me.userId}, ${until}::timestamptz)
        on conflict (user_id) do update set until_at = excluded.until_at`;
      await sql`insert into chat_messages (id, user_id, body, kind)
        values (${nid("cm")}, null, ${`${me.name} đã vi phạm nội quy chat và bị timeout 30 giây.`}, ${"SYSTEM"})`;
      throw new Error("Tin chứa văn tục. Timeout 30 giây.");
    }
    if (att) {
      if (dataUrlBytes(att.dataUrl) > LIMITS.chatFile) throw new Error("Ảnh/tệp tối đa 2MB.");
    }
    const id = nid("cm");
    await sql`insert into chat_messages
      (id, user_id, body, kind, reply_to, attachment_url, attachment_name, attachment_mime)
      values (
        ${id}, ${me.userId}, ${body}, ${"USER"}, ${data.replyTo || null},
        ${att?.dataUrl || null}, ${att?.name || null}, ${att?.mime || null}
      )`;
    return { id };
  });

export const reactChat = createServerFn({ method: "POST" }).middleware([authMiddleware])
  .validator((d: { messageId: string; emoji: string }) => d)
  .handler(async ({ context, data }) => {
    const { sql, me } = await actorOf(context.userId);
    if (!(CHAT_REACT as readonly string[]).includes(data.emoji)) throw new Error("Emoji không hợp lệ.");
    const cur = await sql<{ emoji: string }>`
      select emoji from chat_reactions where message_id = ${data.messageId} and user_id = ${me.userId}`;
    if (cur[0]?.emoji === data.emoji) {
      await sql`delete from chat_reactions where message_id = ${data.messageId} and user_id = ${me.userId}`;
    } else {
      await sql`
        insert into chat_reactions (message_id, user_id, emoji)
        values (${data.messageId}, ${me.userId}, ${data.emoji})
        on conflict (message_id, user_id) do update set emoji = excluded.emoji`;
    }
    return { ok: true };
  });

export const getChatFile = createServerFn({ method: "POST" }).middleware([authMiddleware])
  .validator((d: { messageId: string }) => d)
  .handler(async ({ context, data }) => {
    const { sql } = await actorOf(context.userId);
    const rows = await sql<{ attachment_url: string | null; attachment_name: string | null }>`
      select attachment_url, attachment_name from chat_messages where id = ${data.messageId}`;
    const r = rows[0];
    if (!r?.attachment_url) throw new Error("Không có tệp.");
    return { url: r.attachment_url, name: r.attachment_name || "tep" };
  });

export const deleteChat = createServerFn({ method: "POST" }).middleware([authMiddleware])
  .validator((d: { messageId: string }) => d)
  .handler(async ({ context, data }) => {
    const { sql, me } = await actorOf(context.userId);
    if (!canModerateChat(me)) deny();
    await sql`delete from chat_reactions where message_id = ${data.messageId}`;
    await sql`delete from chat_messages where id = ${data.messageId}`;
    return { ok: true };
  });

export const clearChat = createServerFn({ method: "POST" }).middleware([authMiddleware]).handler(async ({ context }) => {
  const { sql, me } = await actorOf(context.userId);
  if (!canModerateChat(me)) deny();
  await sql`delete from chat_reactions`;
  await sql`delete from chat_messages`;
  await sql`insert into chat_messages (id, user_id, body, kind)
    values (${nid("cm")}, null, ${`${me.name} đã xóa toàn bộ khung chat.`}, ${"SYSTEM"})`;
  return { ok: true };
});

export const listFund = createServerFn({ method: "POST" }).middleware([authMiddleware])
  .validator((d?: { semesterId?: string }) => d ?? {})
  .handler(async ({ context, data }) => {
    const { sql, me } = await actorOf(context.userId);
    if (!me.canViewStaff) deny("Chỉ ban quản trị xem quỹ.");
    const sid = (data.semesterId || "").trim();
    if (!sid) return { me, rows: [] as Array<{ user_id: string; full_name: string; student_id: string; status: string; fund_paid: boolean }> };
    const sem = await sql<{ id: string }>`select id from semesters where id = ${sid} limit 1`;
    if (!sem[0]) throw new Error("Học kỳ không tồn tại.");
    const rows = await sql<{
      user_id: string;
      full_name: string;
      student_id: string | null;
      status: string;
      fund_paid: boolean;
    }>`
      select p.user_id, p.full_name, p.student_id, p.status, coalesce(f.paid, false) as fund_paid
      from profiles p
      left join fund_dues f on f.user_id = p.user_id and f.semester_id = ${sid}
      where p.deleted_at is null
      order by coalesce(f.paid, false) asc, p.full_name`;
    return {
      me,
      rows: rows.map((r) => ({
        ...r,
        fund_paid: publicFlag(r.fund_paid),
        student_id: r.student_id || "—",
      })),
    };
  });

export const setFundPaid = createServerFn({ method: "POST" }).middleware([authMiddleware])
  .validator((d: { id: string; paid: boolean; semesterId: string }) => d)
  .handler(async ({ context, data }) => {
    const { sql, me } = await actorOf(context.userId);
    if (!me.canManageFund) deny("Chỉ Chủ nhiệm và Phó chủ nhiệm ghi quỹ.");
    const sid = data.semesterId.trim();
    if (!sid) throw new Error("Chọn học kỳ trước.");
    await sql`
      insert into fund_dues (semester_id, user_id, paid, updated_at)
      values (${sid}, ${data.id}, ${data.paid}, now())
      on conflict (semester_id, user_id) do update set paid = excluded.paid, updated_at = now()`;
    return { ok: true };
  });

export const setFundPaidAll = createServerFn({ method: "POST" }).middleware([authMiddleware])
  .validator((d: { paid: boolean; semesterId: string; ids?: string[] }) => d)
  .handler(async ({ context, data }) => {
    const { sql, me } = await actorOf(context.userId);
    if (!me.canManageFund) deny("Chỉ Chủ nhiệm và Phó chủ nhiệm ghi quỹ.");
    const sid = data.semesterId.trim();
    if (!sid) throw new Error("Chọn học kỳ trước.");
    const ids = (data.ids ?? []).filter((id) => typeof id === "string" && id.length > 0);
    const targets = ids.length
      ? ids
      : (await sql<{ user_id: string }>`select user_id from profiles where deleted_at is null`).map((r) => r.user_id);
    for (const id of targets) {
      await sql`
        insert into fund_dues (semester_id, user_id, paid, updated_at)
        values (${sid}, ${id}, ${data.paid}, now())
        on conflict (semester_id, user_id) do update set paid = excluded.paid, updated_at = now()`;
    }
    await logActivity(sql, me.userId, data.paid ? "fund_tick_all" : "fund_untick_all", "semester", sid);
    return { ok: true };
  });

function moneyAmount(raw: unknown) {
  const n = Math.round(Number(raw));
  if (!Number.isFinite(n) || n <= 0) throw new Error("Số tiền phải lớn hơn 0.");
  if (n > 1_000_000_000_000) throw new Error("Số tiền quá lớn.");
  return n;
}

export const listClubFund = createServerFn({ method: "POST" }).middleware([authMiddleware])
  .validator((d?: { semesterId?: string }) => d ?? {})
  .handler(async ({ context, data }) => {
    const { sql, me } = await actorOf(context.userId);
    if (!me.canViewStaff) deny("Chỉ ban quản trị xem quỹ.");
    const sid = (data.semesterId || "").trim();
    if (!sid) return { base: 0, balance: 0, entries: [] as Array<{ id: string; kind: string; title: string; amount: number; created_at: string; author: string }> };
    const baseRow = await sql<{ base_amount: string | number }>`
      select base_amount from fund_balances where semester_id = ${sid} limit 1`;
    const base = Number(baseRow[0]?.base_amount ?? 0);
    const rows = await sql<{ id: string; kind: string; title: string; amount: string | number; created_at: string; author: string | null }>`
      select e.id, e.kind, e.title, e.amount, e.created_at, coalesce(p.full_name, '') as author
      from fund_entries e
      left join profiles p on p.user_id = e.created_by
      where e.semester_id = ${sid}
      order by e.created_at desc`;
    const entries = rows.map((r) => ({
      id: r.id,
      kind: r.kind === "IN" ? "IN" : "OUT",
      title: r.title,
      amount: Number(r.amount),
      created_at: r.created_at,
      author: r.author || "—",
    }));
    const delta = entries.reduce((n, e) => n + (e.kind === "IN" ? e.amount : -e.amount), 0);
    return { base, balance: base + delta, entries };
  });

export const setFundBase = createServerFn({ method: "POST" }).middleware([authMiddleware])
  .validator((d: { semesterId: string; amount: number }) => d)
  .handler(async ({ context, data }) => {
    const { sql, me } = await actorOf(context.userId);
    if (!me.canManageFund) deny("Chỉ Chủ nhiệm và Phó chủ nhiệm điều chỉnh quỹ gốc.");
    const sid = data.semesterId.trim();
    if (!sid) throw new Error("Chọn học kỳ trước.");
    const n = Math.round(Number(data.amount));
    if (!Number.isFinite(n) || n < 0) throw new Error("Quỹ gốc không được âm.");
    if (n > 1_000_000_000_000) throw new Error("Số tiền quá lớn.");
    await sql`
      insert into fund_balances (semester_id, base_amount, updated_at)
      values (${sid}, ${n}, now())
      on conflict (semester_id) do update set base_amount = excluded.base_amount, updated_at = now()`;
    await logActivity(sql, me.userId, "set_fund_base", "semester", sid);
    return { ok: true };
  });

export const saveFundEntry = createServerFn({ method: "POST" }).middleware([authMiddleware])
  .validator((d: { semesterId: string; kind: string; title: string; amount: number }) => d)
  .handler(async ({ context, data }) => {
    const { sql, me } = await actorOf(context.userId);
    if (!me.canManageFund) deny("Chỉ Chủ nhiệm và Phó chủ nhiệm ghi thu chi.");
    const sid = data.semesterId.trim();
    if (!sid) throw new Error("Chọn học kỳ trước.");
    const kind = data.kind === "IN" ? "IN" : data.kind === "OUT" ? "OUT" : "";
    if (!kind) throw new Error("Chọn thu hoặc chi.");
    const title = validateTitle(data.title);
    const amount = moneyAmount(data.amount);
    const id = nid("fd");
    await sql`insert into fund_entries (id, semester_id, kind, title, amount, created_by)
      values (${id}, ${sid}, ${kind}, ${title}, ${amount}, ${me.userId})`;
    await logActivity(sql, me.userId, kind === "IN" ? "fund_in" : "fund_out", "fund_entry", id);
    return { id };
  });

export const deleteFundEntry = createServerFn({ method: "POST" }).middleware([authMiddleware])
  .validator((d: { id: string }) => d)
  .handler(async ({ context, data }) => {
    const { sql, me } = await actorOf(context.userId);
    if (!me.canManageFund) deny("Chỉ Chủ nhiệm và Phó chủ nhiệm xóa thu chi.");
    await sql`delete from fund_entries where id = ${data.id}`;
    return { ok: true };
  });

function canScoreInterview(me: Actor) {
  return me.canViewStaff;
}

function cleanInterviewScores(ban: string, raw: Record<string, number>) {
  const spec = interviewBan(ban);
  if (!spec) throw new Error("Chọn ban để chấm.");
  const scores: Record<string, number> = {};
  let total = 0;
  for (const c of spec.criteria) {
    let v = Number(raw[c.id] ?? 0);
    if (!Number.isFinite(v) || v < 0) v = 0;
    if (v > c.max) v = c.max;
    v = Math.round(v * 2) / 2;
    scores[c.id] = v;
    total += v;
  }
  return { scores, total, max: interviewMax(ban) };
}

export const listInterviewScores = createServerFn({ method: "POST" }).middleware([authMiddleware])
  .validator((d?: { semesterId?: string }) => d ?? {})
  .handler(async ({ context, data }) => {
    const { sql, me } = await actorOf(context.userId);
    if (!canScoreInterview(me)) deny("Chỉ ban quản trị được chấm phỏng vấn.");
    const sid = (data.semesterId || "").trim();
    if (!sid) return { rows: [] as Array<{
      id: string; ban: string; candidate_name: string; student_id: string;
      notes: string; scores: Record<string, number>; total: number; max: number;
      scorer_name: string; updated_at: string;
    }> };
    const rows = await sql<{
      id: string; ban: string; candidate_name: string; student_id: string;
      notes: string; scores: string; scorer_name: string | null; updated_at: string;
    }>`
      select s.id, s.ban, s.candidate_name, s.student_id, s.notes, s.scores, s.updated_at,
        coalesce(p.full_name, '') as scorer_name
      from interview_scores s
      left join profiles p on p.user_id = s.scorer_id
      where s.semester_id = ${sid}
      order by s.updated_at desc`;
    return {
      rows: rows.map((r) => {
        let parsed: Record<string, number> = {};
        try { parsed = JSON.parse(r.scores || "{}"); } catch { parsed = {}; }
        const clean = interviewBan(r.ban) ? cleanInterviewScores(r.ban, parsed) : { scores: parsed, total: 0, max: 100 };
        return {
          id: r.id,
          ban: r.ban,
          candidate_name: r.candidate_name,
          student_id: r.student_id,
          notes: r.notes,
          scores: clean.scores,
          total: clean.total,
          max: clean.max,
          scorer_name: r.scorer_name || "—",
          updated_at: r.updated_at,
        };
      }),
    };
  });

export const saveInterviewScore = createServerFn({ method: "POST" }).middleware([authMiddleware])
  .validator((d: {
    id?: string;
    semesterId: string;
    ban: string;
    candidateName: string;
    studentId: string;
    scores: Record<string, number>;
    notes?: string;
  }) => d)
  .handler(async ({ context, data }) => {
    const { sql, me } = await actorOf(context.userId);
    if (!canScoreInterview(me)) deny("Chỉ ban quản trị được chấm phỏng vấn.");
    const sid = data.semesterId.trim();
    if (!sid) throw new Error("Chọn học kỳ trước.");
    const sem = await sql<{ id: string }>`select id from semesters where id = ${sid} limit 1`;
    if (!sem[0]) throw new Error("Học kỳ không tồn tại.");
    if (!interviewBan(data.ban)) throw new Error("Chọn ban để chấm.");
    const name = validateName(data.candidateName);
    const studentId = validateStudentId(data.studentId);
    const notes = clip(data.notes || "", 2000);
    const { scores } = cleanInterviewScores(data.ban, data.scores || {});
    const payload = JSON.stringify(scores);
    const id = data.id?.trim() || nid("iv");
    if (data.id) {
      const exist = await sql<{ id: string }>`select id from interview_scores where id = ${id} limit 1`;
      if (!exist[0]) throw new Error("Không tìm thấy phiếu chấm.");
      await sql`update interview_scores set
        semester_id = ${sid}, ban = ${data.ban}, candidate_name = ${name}, student_id = ${studentId},
        scores = ${payload}, notes = ${notes}, updated_at = now()
        where id = ${id}`;
    } else {
      await sql`insert into interview_scores
        (id, semester_id, ban, candidate_name, student_id, scores, notes, scorer_id)
        values (${id}, ${sid}, ${data.ban}, ${name}, ${studentId}, ${payload}, ${notes}, ${me.userId})`;
    }
    await logActivity(sql, me.userId, data.id ? "update_interview" : "create_interview", "interview", id);
    return { id };
  });

export const deleteInterviewScore = createServerFn({ method: "POST" }).middleware([authMiddleware])
  .validator((d: { id: string }) => d)
  .handler(async ({ context, data }) => {
    const { sql, me } = await actorOf(context.userId);
    if (!canScoreInterview(me)) deny();
    await sql`delete from interview_scores where id = ${data.id}`;
    return { ok: true };
  });


