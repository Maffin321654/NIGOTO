import type { Sql } from "@/lib/db";
import { DEPT_SEED, ROLES, type ClubRole } from "@/lib/constants";
import { nid } from "@/lib/utils";

export type DeptSeat = { id: string; name: string; position: string };

export type Actor = {
  userId: string;
  email: string;
  name: string;
  studentId: string | null;
  phone: string | null;
  birthday: string | null;
  role: ClubRole;
  status: string;
  joinDate: string;
  depts: DeptSeat[];
  isPresident: boolean;
  isVice: boolean;
  isAdmin: boolean;
  inBcn: boolean;
  inMedia: boolean;
  inAcademic: boolean;
  inEvent: boolean;
  membersOnly: boolean;
  canViewStaff: boolean;
  canViewCalendar: boolean;
  canViewMedia: boolean;
  canCreateTask: boolean;
  canCreateEvent: boolean;
  canCreateContent: boolean;
  canCreateCourse: boolean;
  canAnnounce: boolean;
  canManagePeople: boolean;
  canEditIdentity: boolean;
  canDeleteEvent: boolean;
  canToggleCheckin: boolean;
  canManageFund: boolean;
};

const IDENT = /^[a-z_][a-z0-9_]*$/i;
const HEAL_TABLES = [
  "departments",
  "profiles",
  "department_members",
  "events",
  "event_departments",
  "event_participants",
  "attendance",
  "tasks",
  "task_assignees",
  "task_comments",
  "content_items",
  "content_approvals",
  "announcements",
  "notifications",
  "courses",
  "course_items",
  "activity_logs",
  "club_state",
  "semesters",
  "fund_dues",
  "fund_balances",
  "fund_entries",
  "interview_scores",
  "chat_messages",
  "chat_violations",
  "chat_mutes",
  "chat_reactions",
  "ideas",
] as const;

const ADD_COLUMNS: Array<[string, string]> = [
  ["departments", "sort_order int not null default 0"],
  ["departments", "description text not null default ''"],
  ["departments", "slug text not null default ''"],
  ["departments", "color text not null default ''"],
  ["departments", "icon text not null default ''"],
  ["departments", "created_at timestamptz not null default now()"],
  ["departments", "updated_at timestamptz not null default now()"],
  ["profiles", "full_name text not null default ''"],
  ["profiles", "student_id text"],
  ["profiles", "phone text"],
  ["profiles", "birthday date"],
  ["profiles", "role text not null default 'MEMBER'"],
  ["profiles", "status text not null default 'ACTIVE'"],
  ["profiles", "join_date timestamptz not null default now()"],
  ["profiles", "avatar_url text"],
  ["profiles", "deleted_at timestamptz"],
  ["profiles", "email text not null default ''"],
  ["profiles", "slug text not null default ''"],
  ["profiles", "fund_paid boolean not null default false"],
  ["department_members", "position text not null default 'MEMBER'"],
  ["department_members", "joined_at timestamptz not null default now()"],
  ["events", "title text not null default ''"],
  ["events", "description text not null default ''"],
  ["events", "event_type text not null default 'CULTURE'"],
  ["events", "status text not null default 'UPCOMING'"],
  ["events", "location text not null default ''"],
  ["events", "start_at timestamptz not null default now()"],
  ["events", "end_at timestamptz"],
  ["events", "max_participants int"],
  ["events", "cover_url text"],
  ["events", "cover_pos text not null default '50% 50%'"],
  ["events", "is_public boolean not null default false"],
  ["events", "checkin_open boolean not null default true"],
  ["events", "join_open boolean not null default true"],
  ["events", "checkin_token text not null default ''"],
  ["events", "organizer_id text not null default ''"],
  ["events", "created_at timestamptz not null default now()"],
  ["events", "updated_at timestamptz not null default now()"],
  ["events", "deleted_at timestamptz"],
  ["events", "slug text not null default ''"],
  ["events", "semester_id text not null default ''"],
  ["event_participants", "joined_at timestamptz not null default now()"],
  ["attendance", "checked_at timestamptz not null default now()"],
  ["attendance", "method text not null default 'QR'"],
  ["attendance", "event_id text"],
  ["attendance", "user_id text"],
  ["tasks", "title text not null default ''"],
  ["tasks", "description text not null default ''"],
  ["tasks", "status text not null default 'TODO'"],
  ["tasks", "priority text not null default 'MEDIUM'"],
  ["tasks", "deadline timestamptz"],
  ["tasks", "creator_id text not null default ''"],
  ["tasks", "department_id text"],
  ["tasks", "event_id text"],
  ["tasks", "created_at timestamptz not null default now()"],
  ["tasks", "updated_at timestamptz not null default now()"],
  ["tasks", "deleted_at timestamptz"],
  ["task_comments", "body text not null default ''"],
  ["task_comments", "created_at timestamptz not null default now()"],
  ["task_comments", "user_id text"],
  ["task_comments", "task_id text"],
  ["content_items", "title text not null default ''"],
  ["content_items", "caption text not null default ''"],
  ["content_items", "platform text not null default 'FACEBOOK'"],
  ["content_items", "content_type text not null default 'POSTER'"],
  ["content_items", "status text not null default 'IDEA'"],
  ["content_items", "publish_at timestamptz"],
  ["content_items", "event_id text"],
  ["content_items", "writer_id text"],
  ["content_items", "designer_id text"],
  ["content_items", "reviewer_id text"],
  ["content_items", "created_by text not null default ''"],
  ["content_items", "created_at timestamptz not null default now()"],
  ["content_items", "updated_at timestamptz not null default now()"],
  ["content_items", "deleted_at timestamptz"],
  ["announcements", "title text not null default ''"],
  ["announcements", "body text not null default ''"],
  ["announcements", "author_id text not null default ''"],
  ["announcements", "created_at timestamptz not null default now()"],
  ["notifications", "title text not null default ''"],
  ["notifications", "body text not null default ''"],
  ["notifications", "link text"],
  ["notifications", "read_at timestamptz"],
  ["notifications", "created_at timestamptz not null default now()"],
  ["courses", "title text not null default ''"],
  ["courses", "description text not null default ''"],
  ["courses", "is_public boolean not null default false"],
  ["courses", "created_by text not null default ''"],
  ["courses", "created_at timestamptz not null default now()"],
  ["courses", "updated_at timestamptz not null default now()"],
  ["courses", "deleted_at timestamptz"],
  ["courses", "kind text not null default 'COURSE'"],
  ["course_items", "kind text not null default 'TEXT'"],
  ["course_items", "title text not null default ''"],
  ["course_items", "media_url text"],
  ["course_items", "extra text"],
  ["course_items", "sort_order int not null default 0"],
  ["course_items", "created_at timestamptz not null default now()"],
  ["course_items", "course_id text"],
  ["activity_logs", "actor_id text"],
  ["activity_logs", "action text not null default ''"],
  ["activity_logs", "entity text not null default ''"],
  ["activity_logs", "entity_id text"],
  ["activity_logs", "metadata text"],
  ["activity_logs", "created_at timestamptz not null default now()"],
  ["club_state", "value text not null default ''"],
  ["semesters", "name text not null default ''"],
  ["semesters", "sort_order int not null default 0"],
  ["semesters", "created_at timestamptz not null default now()"],
  ["fund_dues", "semester_id text not null default ''"],
  ["fund_dues", "user_id text not null default ''"],
  ["fund_dues", "paid boolean not null default false"],
  ["fund_dues", "updated_at timestamptz not null default now()"],
  ["fund_balances", "semester_id text not null default ''"],
  ["fund_balances", "base_amount bigint not null default 0"],
  ["fund_balances", "updated_at timestamptz not null default now()"],
  ["fund_entries", "semester_id text not null default ''"],
  ["fund_entries", "kind text not null default 'OUT'"],
  ["fund_entries", "title text not null default ''"],
  ["fund_entries", "amount bigint not null default 0"],
  ["fund_entries", "created_by text not null default ''"],
  ["fund_entries", "created_at timestamptz not null default now()"],
  ["interview_scores", "semester_id text not null default ''"],
  ["interview_scores", "ban text not null default ''"],
  ["interview_scores", "candidate_name text not null default ''"],
  ["interview_scores", "student_id text not null default ''"],
  ["interview_scores", "scores text not null default '{}'"],
  ["interview_scores", "notes text not null default ''"],
  ["interview_scores", "scorer_id text not null default ''"],
  ["interview_scores", "created_at timestamptz not null default now()"],
  ["interview_scores", "updated_at timestamptz not null default now()"],
  ["content_approvals", "action text not null default ''"],
  ["content_approvals", "comment text not null default ''"],
  ["content_approvals", "created_at timestamptz not null default now()"],
  ["chat_messages", "user_id text"],
  ["chat_messages", "body text not null default ''"],
  ["chat_messages", "kind text not null default 'USER'"],
  ["chat_messages", "created_at timestamptz not null default now()"],
  ["chat_violations", "user_id text not null default ''"],
  ["chat_violations", "word text not null default ''"],
  ["chat_violations", "created_at timestamptz not null default now()"],
  ["chat_mutes", "until_at timestamptz not null default now()"],
  ["chat_messages", "reply_to text"],
  ["chat_messages", "attachment_url text"],
  ["chat_messages", "attachment_name text"],
  ["chat_messages", "attachment_mime text"],
  ["chat_reactions", "emoji text not null default '👍'"],
  ["chat_reactions", "created_at timestamptz not null default now()"],
];

function pgDefault(udt: string, dataType: string): string {
  const u = `${udt} ${dataType}`.toLowerCase();
  if (u.includes("bool")) return "false";
  if (u.includes("int") || u.includes("numeric") || u.includes("decimal") || u.includes("real") || u.includes("double") || u.includes("float")) {
    return "0";
  }
  if (u.includes("timestamp")) return "now()";
  if (/\bdate\b/.test(u)) return "CURRENT_DATE";
  if (u.includes("json")) return `'{}'::jsonb`;
  if (u.includes("uuid")) return `'00000000-0000-0000-0000-000000000000'::uuid`;
  return "''";
}

async function tryQuery(sql: Sql, text: string, params: unknown[] = []) {
  try {
    await sql.query(text, params);
  } catch {
    // Legacy production schemas vary; a failed ALTER must not block boot.
  }
}

async function columnsOf(sql: Sql, table: string): Promise<Set<string>> {
  const rows = await sql.query<{ column_name: string }>(
    `select column_name from information_schema.columns
     where table_schema = 'public' and table_name = $1`,
    [table],
  );
  return new Set(rows.map((r) => String(r.column_name)));
}

async function runHeal(sql: Sql) {
  const createTables = [
    `create table if not exists activity_logs (
      id text primary key, actor_id text, action text not null default '',
      entity text not null default '', entity_id text, metadata text,
      created_at timestamptz not null default now())`,
    `create table if not exists attendance (
      id text primary key, event_id text, user_id text,
      checked_at timestamptz not null default now(), method text not null default 'QR')`,
    `create table if not exists announcements (
      id text primary key, title text not null default '', body text not null default '',
      author_id text not null default '', created_at timestamptz not null default now())`,
    `create table if not exists tasks (
      id text primary key, title text not null default '', description text not null default '',
      status text not null default 'TODO', priority text not null default 'MEDIUM',
      deadline timestamptz, creator_id text not null default '', department_id text, event_id text,
      created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
      deleted_at timestamptz)`,
    `create table if not exists task_assignees (
      task_id text not null, user_id text not null, primary key (task_id, user_id))`,
    `create table if not exists task_comments (
      id text primary key, task_id text, user_id text,
      body text not null default '', created_at timestamptz not null default now())`,
    `create table if not exists courses (
      id text primary key, title text not null default '', description text not null default '',
      is_public boolean not null default false, created_by text not null default '',
      created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
      deleted_at timestamptz)`,
    `create table if not exists course_items (
      id text primary key, course_id text, kind text not null default 'TEXT',
      title text not null default '', media_url text, extra text,
      sort_order int not null default 0, created_at timestamptz not null default now())`,
    `create table if not exists content_items (
      id text primary key, title text not null default '', caption text not null default '',
      platform text not null default 'FACEBOOK', content_type text not null default 'POSTER',
      status text not null default 'IDEA', publish_at timestamptz, event_id text,
      writer_id text, designer_id text, reviewer_id text, created_by text not null default '',
      created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
      deleted_at timestamptz)`,
    `create table if not exists event_participants (
      event_id text not null, user_id text not null, joined_at timestamptz not null default now(),
      primary key (event_id, user_id))`,
    `create table if not exists notifications (
      id text primary key, user_id text not null, title text not null default '',
      body text not null default '', link text, read_at timestamptz,
      created_at timestamptz not null default now())`,
    `create table if not exists club_state (key text primary key, value text not null default '')`,
    `create table if not exists semesters (
      id text primary key, name text not null default '',
      sort_order int not null default 0, created_at timestamptz not null default now())`,
    `create table if not exists fund_dues (
      semester_id text not null, user_id text not null,
      paid boolean not null default false, updated_at timestamptz not null default now(),
      primary key (semester_id, user_id))`,
    `create table if not exists fund_balances (
      semester_id text primary key, base_amount bigint not null default 0,
      updated_at timestamptz not null default now())`,
    `create table if not exists fund_entries (
      id text primary key, semester_id text not null default '',
      kind text not null default 'OUT', title text not null default '',
      amount bigint not null default 0, created_by text not null default '',
      created_at timestamptz not null default now())`,
    `create table if not exists interview_scores (
      id text primary key, semester_id text not null default '', ban text not null default '',
      candidate_name text not null default '', student_id text not null default '',
      scores text not null default '{}', notes text not null default '',
      scorer_id text not null default '',
      created_at timestamptz not null default now(), updated_at timestamptz not null default now())`,
    `create table if not exists chat_messages (
      id text primary key, user_id text, body text not null default '',
      kind text not null default 'USER', created_at timestamptz not null default now())`,
    `create table if not exists chat_violations (
      id text primary key, user_id text not null, word text not null default '',
      created_at timestamptz not null default now())`,
    `create table if not exists chat_mutes (
      user_id text primary key, until_at timestamptz not null)`,
    `create table if not exists chat_reactions (
      message_id text not null, user_id text not null, emoji text not null default '👍',
      created_at timestamptz not null default now(),
      primary key (message_id, user_id))`,
    `create table if not exists ideas (
      id text primary key, title text not null default '', body text not null default '',
      author_id text not null default '', created_at timestamptz not null default now())`,
  ];
  for (const stmt of createTables) await tryQuery(sql, stmt);
  await tryQuery(sql, `create index if not exists chat_messages_created_idx on chat_messages (created_at)`);
  await tryQuery(sql, `create index if not exists chat_reactions_msg_idx on chat_reactions (message_id)`);
  await tryQuery(sql, `create index if not exists ideas_created_idx on ideas (created_at)`);
  await tryQuery(sql, `create unique index if not exists fund_dues_sem_user on fund_dues (semester_id, user_id)`);

  for (const [table, spec] of ADD_COLUMNS) {
    await tryQuery(sql, `alter table ${table} add column if not exists ${spec}`);
  }

  for (const table of HEAL_TABLES) {
    const cols = await sql.query<{
      column_name: string;
      data_type: string;
      udt_name: string;
      column_default: string | null;
      is_nullable: string;
    }>(
      `select column_name, data_type, udt_name, column_default, is_nullable
       from information_schema.columns
       where table_schema = 'public' and table_name = $1`,
      [table],
    );
    for (const c of cols) {
      const name = String(c.column_name);
      if (!IDENT.test(name)) continue;
      if (name === "id" || name === "user_id") continue;
      if (c.is_nullable === "YES") continue;
      if (c.column_default != null && String(c.column_default).length > 0) continue;
      const def = pgDefault(String(c.udt_name || ""), String(c.data_type || ""));
      await tryQuery(sql, `alter table ${table} alter column "${name}" set default ${def}`);
      await tryQuery(sql, `alter table ${table} alter column "${name}" drop not null`);
    }
  }

  const backfills = [
    `update departments set slug = id where slug is null or slug = ''`,
    `update events set slug = id where slug is null or slug = ''`,
    `update events set checkin_token = id where checkin_token is null or checkin_token = ''`,
    `update events set title = name where name is not null and name <> ''`,
    `update events set start_at = starts_at where starts_at is not null`,
    `update events set start_at = begin_at where begin_at is not null`,
    `update events set start_at = event_date where event_date is not null`,
    `update events set location = place where place is not null and place <> ''`,
    `update events set location = venue where venue is not null and venue <> ''`,
    `update tasks set title = name where name is not null and name <> ''`,
    `update announcements set title = name where name is not null and name <> ''`,
    `update announcements set body = content where content is not null and content <> ''`,
    `update content_items set title = name where name is not null and name <> ''`,
    `update courses set title = name where name is not null and name <> ''`,
    `update course_items set kind = type where type is not null and type <> ''`,
    `update course_items set kind = item_type where item_type is not null and item_type <> ''`,
    `update course_items set title = name where name is not null and name <> ''`,
    `update attendance set checked_at = created_at where created_at is not null`,
    `update attendance set checked_at = checked_in_at where checked_in_at is not null`,
    `update attendance set checked_at = attended_at where attended_at is not null`,
    `update activity_logs set entity = target where target is not null and target <> ''`,
    `update activity_logs set entity = resource where resource is not null and resource <> ''`,
    `update activity_logs set entity = entity_type where entity_type is not null and entity_type <> ''`,
    `update profiles set full_name = name where full_name is null or full_name = ''`,
    `update department_members set position = role where position is null or position = ''`,
    `update departments set sort_order = 0 where id = 'bcn'`,
    `update departments set sort_order = 1 where id = 'members'`,
    `update departments set sort_order = 2 where id = 'media'`,
    `update departments set sort_order = 3 where id = 'academic'`,
    `update departments set sort_order = 4 where id = 'event'`,
    `insert into semesters (id, name, sort_order) values ('sem-hk1-2627', 'Học kỳ 1 26-27', 0) on conflict (id) do nothing`,
    `update events set semester_id = 'sem-hk1-2627' where semester_id is null or semester_id = ''`,
    `insert into fund_dues (semester_id, user_id, paid)
      select 'sem-hk1-2627', user_id, coalesce(fund_paid, false) from profiles
      where deleted_at is null
      on conflict (semester_id, user_id) do nothing`,
  ];
  for (const stmt of backfills) await tryQuery(sql, stmt);
}

const healRef = globalThis as typeof globalThis & { __nigotoHealV12__?: Promise<void> };

export async function healSchema(sql: Sql) {
  healRef.__nigotoHealV12__ ??= runHeal(sql).catch((err) => {
    healRef.__nigotoHealV12__ = undefined;
    throw err;
  });
  await healRef.__nigotoHealV12__;
}

async function insertMatching(
  sql: Sql,
  table: string,
  data: Record<string, unknown>,
  conflict?: string,
) {
  const cols = await columnsOf(sql, table);
  const fields = Object.keys(data).filter((k) => IDENT.test(k) && cols.has(k));
  if (fields.length === 0) return;
  const values = fields.map((k) => data[k]);
  const placeholders = fields.map((_, i) => `$${i + 1}`).join(", ");
  let text = `insert into ${table} (${fields.join(", ")}) values (${placeholders})`;
  if (conflict) text += ` ${conflict}`;
  await sql.query(text, values);
}

export async function seedDepartments(sql: Sql) {
  await healSchema(sql);
  const cols = await columnsOf(sql, "departments");
  const updates = ["name", "description", "sort_order", "slug", "color", "icon"].filter((c) => cols.has(c));
  const conflict =
    updates.length > 0
      ? `on conflict (id) do update set ${updates.map((c) => `${c} = excluded.${c}`).join(", ")}`
      : "on conflict (id) do nothing";

  for (const d of DEPT_SEED) {
    const row = {
      id: d.id,
      name: d.name,
      description: d.description,
      sort_order: d.sort,
      slug: d.id,
      color: "",
      icon: "",
    };
    try {
      await insertMatching(sql, "departments", row, conflict);
    } catch {
      try {
        await insertMatching(sql, "departments", row);
      } catch {
        // Row already exists on a schema without ON CONFLICT (id).
      }
    }
  }
}

type UserRow = { id: string; name: string; email: string; image: string | null };
type ProfileRow = {
  user_id: string;
  full_name: string;
  student_id: string | null;
  phone: string | null;
  birthday: string | null;
  role: string;
  status: string;
  join_date: string;
};

export async function ensureProfile(sql: Sql, userId: string) {
  await seedDepartments(sql);
  const existing = await sql<ProfileRow>`select * from profiles where user_id = ${userId} limit 1`;
  if (existing[0]) return existing[0];

  const users = await sql<UserRow>`select id, name, email, image from "user" where id = ${userId} limit 1`;
  const u = users[0];
  if (!u) throw new Error("Không tìm thấy tài khoản.");

  const countRows = await sql<{ n: number }>`select count(*)::int as n from profiles`;
  const first = (countRows[0]?.n ?? 0) === 0;
  const role = first ? ROLES.PRESIDENT : ROLES.MEMBER;
  const dept = first ? "bcn" : "members";
  const position = first ? "HEAD" : "MEMBER";

  await insertMatching(sql, "profiles", {
    user_id: userId,
    full_name: u.name || "Thành viên mới",
    role,
    status: "ACTIVE",
    email: u.email || "",
    slug: userId,
  });
  await insertMatching(
    sql,
    "department_members",
    { department_id: dept, user_id: userId, position },
    "on conflict (department_id, user_id) do nothing",
  );

  if (first) {
    await insertMatching(sql, "club_state", { key: "seeded", value: "1" }, "on conflict (key) do nothing");
  }

  const created = await sql<ProfileRow>`select * from profiles where user_id = ${userId} limit 1`;
  return created[0]!;
}

export async function syncBcnClubRole(sql: Sql, userId: string) {
  const seats = await sql<{ department_id: string; position: string }>`
    select department_id, position from department_members where user_id = ${userId}`;
  const bcn = seats.find((s) => s.department_id === "bcn");
  const prof = await sql<{ role: string }>`select role from profiles where user_id = ${userId} limit 1`;
  const role = prof[0]?.role;
  if (role === ROLES.PRESIDENT || role === ROLES.SUPER_ADMIN) return;
  if (bcn?.position === "VICE_HEAD" && role !== ROLES.VICE_PRESIDENT) {
    await sql`update profiles set role = ${ROLES.VICE_PRESIDENT} where user_id = ${userId}`;
  } else if (role === ROLES.VICE_PRESIDENT && bcn?.position !== "VICE_HEAD") {
    await sql`update profiles set role = ${ROLES.MEMBER} where user_id = ${userId}`;
  }
}

export async function loadActor(sql: Sql, userId: string): Promise<Actor> {
  const profile = await ensureProfile(sql, userId);
  await syncBcnClubRole(sql, userId);
  const fresh = await sql<ProfileRow>`select * from profiles where user_id = ${userId} limit 1`;
  const p = fresh[0] ?? profile;
  const users = await sql<UserRow>`select id, name, email, image from "user" where id = ${userId} limit 1`;
  const u = users[0];
  const cols = await columnsOf(sql, "departments");
  const orderBy = cols.has("sort_order") ? "d.sort_order" : "d.name";
  const seats = await sql.query<{ department_id: string; name: string; position: string }>(
    `select dm.department_id, d.name, dm.position
     from department_members dm
     join departments d on d.id = dm.department_id
     where dm.user_id = $1
     order by ${orderBy}`,
    [userId],
  );

  const depts: DeptSeat[] = seats.map((s) => ({ id: s.department_id, name: s.name, position: s.position }));
  const inBcn = depts.some((d) => d.id === "bcn");
  const inMedia = depts.some((d) => d.id === "media");
  const inAcademic = depts.some((d) => d.id === "academic");
  const inEvent = depts.some((d) => d.id === "event");
  const role = (p.role as ClubRole) || ROLES.MEMBER;
  const isPresident = role === ROLES.PRESIDENT;
  const isVice = role === ROLES.VICE_PRESIDENT;
  const isAdmin = role === ROLES.SUPER_ADMIN || isPresident;
  const canViewStaff = isAdmin || inBcn || inMedia || inAcademic || inEvent;
  const bcnHead = depts.some((d) => d.id === "bcn" && d.position === "HEAD");

  return {
    userId,
    email: u?.email ?? "",
    name: p.full_name || u?.name || "Thành viên",
    studentId: p.student_id,
    phone: p.phone,
    birthday: p.birthday,
    role,
    status: p.status,
    joinDate: p.join_date,
    depts,
    isPresident,
    isVice,
    isAdmin,
    inBcn,
    inMedia,
    inAcademic,
    inEvent,
    membersOnly: !canViewStaff,
    canViewStaff,
    canViewCalendar: canViewStaff,
    canViewMedia: isAdmin || inBcn || inMedia,
    canCreateTask: isAdmin || inBcn,
    canCreateEvent: isAdmin || inBcn || inEvent,
    canCreateContent: isAdmin || inBcn || inMedia,
    canCreateCourse: isAdmin || inBcn || inAcademic,
    canAnnounce: isAdmin || inBcn || inMedia,
    canManagePeople: isAdmin || isVice || inBcn,
    canEditIdentity: isPresident || bcnHead || isAdmin,
    canDeleteEvent: isAdmin || inBcn || inEvent,
    canToggleCheckin: canViewStaff,
    canManageFund: isPresident || isVice,
  };
}

export async function logActivity(
  sql: Sql,
  actorId: string,
  action: string,
  entity: string,
  entityId?: string,
  metadata?: string,
) {
  await insertMatching(sql, "activity_logs", {
    id: nid("log"),
    actor_id: actorId,
    action,
    entity,
    entity_id: entityId ?? null,
    metadata: metadata ?? null,
  });
}

export async function notify(
  sql: Sql,
  userId: string,
  title: string,
  body: string,
  link?: string,
) {
  await insertMatching(sql, "notifications", {
    id: nid("nt"),
    user_id: userId,
    title,
    body,
    link: link ?? null,
  });
}

const USER_COL_CANDIDATES = [
  "user_id",
  "userId",
  "actor_id",
  "author_id",
  "created_by",
  "member_id",
  "owner_id",
  "organizer_id",
  "scorer_id",
];

async function deleteRowsForUser(sql: Sql, table: string, targetId: string) {
  if (!IDENT.test(table)) return;
  try {
    const cols = await columnsOf(sql, table);
    for (const col of USER_COL_CANDIDATES) {
      if (!cols.has(col)) continue;
      await tryQuery(sql, `delete from ${table} where "${col}" = $1`, [targetId]);
    }
  } catch {
    // table may not exist
  }
}

async function nullRowsForUser(sql: Sql, table: string, col: string, targetId: string) {
  if (!IDENT.test(table) || !IDENT.test(col)) return;
  try {
    const cols = await columnsOf(sql, table);
    if (!cols.has(col)) return;
    await tryQuery(sql, `update ${table} set "${col}" = null where "${col}" = $1`, [targetId]);
    await tryQuery(sql, `update ${table} set "${col}" = '' where "${col}" = $1`, [targetId]);
  } catch {
    // ignore
  }
}

export async function purgeUser(sql: Sql, targetId: string) {
  await healSchema(sql);
  for (const table of [
    "department_members",
    "event_participants",
    "attendance",
    "task_assignees",
    "task_comments",
    "notifications",
    "chat_violations",
    "chat_mutes",
    "chat_reactions",
    "chat_messages",
    "activity_logs",
    "content_approvals",
    "fund_dues",
  ]) {
    await deleteRowsForUser(sql, table, targetId);
  }
  await nullRowsForUser(sql, "events", "organizer_id", targetId);
  await nullRowsForUser(sql, "tasks", "creator_id", targetId);
  await nullRowsForUser(sql, "announcements", "author_id", targetId);
  await nullRowsForUser(sql, "courses", "created_by", targetId);
  await nullRowsForUser(sql, "fund_entries", "created_by", targetId);
  await nullRowsForUser(sql, "content_items", "writer_id", targetId);
  await nullRowsForUser(sql, "content_items", "designer_id", targetId);
  await nullRowsForUser(sql, "content_items", "reviewer_id", targetId);
  await nullRowsForUser(sql, "content_items", "created_by", targetId);
  await nullRowsForUser(sql, "activity_logs", "actor_id", targetId);

  await tryQuery(sql, `delete from profiles where user_id = $1`, [targetId]);
  await tryQuery(sql, `delete from profiles where id = $1`, [targetId]);
  await tryQuery(sql, `delete from session where "userId" = $1`, [targetId]);
  await tryQuery(sql, `delete from account where "userId" = $1`, [targetId]);
  await tryQuery(sql, `delete from verification where identifier = $1`, [targetId]);
  await tryQuery(sql, `delete from "user" where id = $1`, [targetId]);

  let stillProfile = 0;
  try {
    stillProfile = (await sql.query<{ n: number }>(`select count(*)::int as n from profiles where user_id = $1`, [targetId]))[0]?.n ?? 0;
  } catch {
    stillProfile = 0;
  }
  if (stillProfile > 0) {
    await tryQuery(sql, `update profiles set deleted_at = now() where user_id = $1`, [targetId]);
    stillProfile = 0;
  }
  let stillUser = 0;
  try {
    stillUser = (await sql.query<{ n: number }>(`select count(*)::int as n from "user" where id = $1`, [targetId]))[0]?.n ?? 0;
  } catch {
    stillUser = 0;
  }
  if (stillUser > 0) throw new Error("Không xóa được tài khoản đăng nhập (ràng buộc dữ liệu).");
}

export function deny(msg = "Bạn không có quyền thực hiện thao tác này.") {
  throw new Error(msg);
}

const SIGNUP_KEY = "signup_open";

export async function readSignupOpen(sql: Sql) {
  await healSchema(sql);
  const rows = await sql<{ value: string }>`select value from club_state where key = ${SIGNUP_KEY} limit 1`;
  if (!rows[0]) return true;
  const v = String(rows[0].value).trim().toLowerCase();
  return v !== "0" && v !== "false" && v !== "off";
}

export async function writeSignupOpen(sql: Sql, open: boolean) {
  await healSchema(sql);
  const value = open ? "1" : "0";
  await sql`
    insert into club_state (key, value) values (${SIGNUP_KEY}, ${value})
    on conflict (key) do update set value = excluded.value`;
}
