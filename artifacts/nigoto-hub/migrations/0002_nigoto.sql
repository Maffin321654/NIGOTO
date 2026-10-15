-- Nigoto Hub club workspace schema.

create table if not exists profiles (
  user_id text primary key,
  full_name text not null default '',
  student_id text,
  phone text,
  birthday date,
  role text not null default 'MEMBER',
  status text not null default 'ACTIVE',
  join_date timestamptz not null default now(),
  avatar_url text,
  deleted_at timestamptz
);
create index if not exists profiles_student_id_idx on profiles (student_id);
create index if not exists profiles_role_idx on profiles (role);

create table if not exists departments (
  id text primary key,
  name text not null,
  description text not null default '',
  sort_order int not null default 0
);

create table if not exists department_members (
  department_id text not null references departments(id) on delete cascade,
  user_id text not null,
  position text not null default 'MEMBER',
  joined_at timestamptz not null default now(),
  primary key (department_id, user_id)
);
create index if not exists department_members_user_idx on department_members (user_id);

create table if not exists events (
  id text primary key,
  title text not null,
  description text not null default '',
  event_type text not null default 'CULTURE',
  status text not null default 'UPCOMING',
  location text not null default '',
  start_at timestamptz not null,
  end_at timestamptz,
  max_participants int,
  cover_url text,
  is_public boolean not null default false,
  checkin_open boolean not null default true,
  checkin_token text not null,
  organizer_id text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index if not exists events_start_idx on events (start_at);
create index if not exists events_public_idx on events (is_public);

create table if not exists event_departments (
  event_id text not null references events(id) on delete cascade,
  department_id text not null references departments(id) on delete cascade,
  primary key (event_id, department_id)
);

create table if not exists event_participants (
  event_id text not null references events(id) on delete cascade,
  user_id text not null,
  joined_at timestamptz not null default now(),
  primary key (event_id, user_id)
);

create table if not exists attendance (
  id text primary key,
  event_id text not null references events(id) on delete cascade,
  user_id text not null,
  checked_at timestamptz not null default now(),
  method text not null default 'QR',
  unique (event_id, user_id)
);
create index if not exists attendance_user_idx on attendance (user_id);

create table if not exists tasks (
  id text primary key,
  title text not null,
  description text not null default '',
  status text not null default 'TODO',
  priority text not null default 'MEDIUM',
  deadline timestamptz,
  creator_id text not null,
  department_id text,
  event_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index if not exists tasks_status_idx on tasks (status);

create table if not exists task_assignees (
  task_id text not null references tasks(id) on delete cascade,
  user_id text not null,
  primary key (task_id, user_id)
);
create index if not exists task_assignees_user_idx on task_assignees (user_id);

create table if not exists task_comments (
  id text primary key,
  task_id text not null references tasks(id) on delete cascade,
  user_id text not null,
  body text not null,
  created_at timestamptz not null default now()
);

create table if not exists content_items (
  id text primary key,
  title text not null,
  caption text not null default '',
  platform text not null default 'FACEBOOK',
  content_type text not null default 'POSTER',
  status text not null default 'IDEA',
  publish_at timestamptz,
  event_id text,
  writer_id text,
  designer_id text,
  reviewer_id text,
  created_by text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists content_approvals (
  id text primary key,
  content_id text not null references content_items(id) on delete cascade,
  actor_id text not null,
  action text not null,
  comment text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists announcements (
  id text primary key,
  title text not null,
  body text not null,
  author_id text not null,
  created_at timestamptz not null default now()
);

create table if not exists notifications (
  id text primary key,
  user_id text not null,
  title text not null,
  body text not null default '',
  link text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists notifications_user_idx on notifications (user_id, created_at desc);

create table if not exists courses (
  id text primary key,
  title text not null,
  description text not null default '',
  is_public boolean not null default false,
  created_by text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists course_items (
  id text primary key,
  course_id text not null references courses(id) on delete cascade,
  kind text not null,
  title text not null,
  media_url text,
  extra text,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists activity_logs (
  id text primary key,
  actor_id text,
  action text not null,
  entity text not null,
  entity_id text,
  metadata text,
  created_at timestamptz not null default now()
);

create table if not exists club_state (
  key text primary key,
  value text not null default ''
);
