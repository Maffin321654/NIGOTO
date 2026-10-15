-- Create missing tables (no-op if they already exist), then add every column
-- the app SELECTs so older Neon schemas stop failing page by page.

create table if not exists events (
  id text primary key
);
create table if not exists tasks (
  id text primary key
);
create table if not exists announcements (
  id text primary key
);
create table if not exists attendance (
  id text primary key
);
create table if not exists activity_logs (
  id text primary key
);
create table if not exists courses (
  id text primary key
);
create table if not exists course_items (
  id text primary key
);
create table if not exists content_items (
  id text primary key
);
create table if not exists notifications (
  id text primary key,
  user_id text not null default ''
);

alter table events add column if not exists title text not null default '';
alter table events add column if not exists description text not null default '';
alter table events add column if not exists event_type text not null default 'CULTURE';
alter table events add column if not exists status text not null default 'UPCOMING';
alter table events add column if not exists location text not null default '';
alter table events add column if not exists start_at timestamptz not null default now();
alter table events add column if not exists end_at timestamptz;
alter table events add column if not exists max_participants int;
alter table events add column if not exists cover_url text;
alter table events add column if not exists is_public boolean not null default false;
alter table events add column if not exists checkin_open boolean not null default true;
alter table events add column if not exists checkin_token text not null default '';
alter table events add column if not exists organizer_id text not null default '';
alter table events add column if not exists created_at timestamptz not null default now();
alter table events add column if not exists updated_at timestamptz not null default now();
alter table events add column if not exists deleted_at timestamptz;

alter table tasks add column if not exists title text not null default '';
alter table tasks add column if not exists description text not null default '';
alter table tasks add column if not exists status text not null default 'TODO';
alter table tasks add column if not exists priority text not null default 'MEDIUM';
alter table tasks add column if not exists deadline timestamptz;
alter table tasks add column if not exists creator_id text not null default '';
alter table tasks add column if not exists department_id text;
alter table tasks add column if not exists event_id text;
alter table tasks add column if not exists created_at timestamptz not null default now();
alter table tasks add column if not exists updated_at timestamptz not null default now();
alter table tasks add column if not exists deleted_at timestamptz;

alter table announcements add column if not exists title text not null default '';
alter table announcements add column if not exists body text not null default '';
alter table announcements add column if not exists author_id text not null default '';
alter table announcements add column if not exists created_at timestamptz not null default now();

alter table attendance add column if not exists checked_at timestamptz not null default now();
alter table attendance add column if not exists method text not null default 'QR';
alter table attendance add column if not exists event_id text;
alter table attendance add column if not exists user_id text;

alter table activity_logs add column if not exists actor_id text;
alter table activity_logs add column if not exists action text not null default '';
alter table activity_logs add column if not exists entity text not null default '';
alter table activity_logs add column if not exists entity_id text;
alter table activity_logs add column if not exists metadata text;
alter table activity_logs add column if not exists created_at timestamptz not null default now();

alter table courses add column if not exists title text not null default '';
alter table courses add column if not exists description text not null default '';
alter table courses add column if not exists is_public boolean not null default false;
alter table courses add column if not exists created_by text not null default '';
alter table courses add column if not exists created_at timestamptz not null default now();
alter table courses add column if not exists updated_at timestamptz not null default now();
alter table courses add column if not exists deleted_at timestamptz;
alter table courses add column if not exists kind text not null default 'COURSE';

alter table course_items add column if not exists kind text not null default 'TEXT';
alter table course_items add column if not exists title text not null default '';
alter table course_items add column if not exists media_url text;
alter table course_items add column if not exists extra text;
alter table course_items add column if not exists sort_order int not null default 0;
alter table course_items add column if not exists created_at timestamptz not null default now();
alter table course_items add column if not exists course_id text;

alter table content_items add column if not exists title text not null default '';
alter table content_items add column if not exists caption text not null default '';
alter table content_items add column if not exists platform text not null default 'FACEBOOK';
alter table content_items add column if not exists content_type text not null default 'POSTER';
alter table content_items add column if not exists status text not null default 'IDEA';
alter table content_items add column if not exists publish_at timestamptz;
alter table content_items add column if not exists created_by text not null default '';
alter table content_items add column if not exists created_at timestamptz not null default now();
alter table content_items add column if not exists updated_at timestamptz not null default now();
alter table content_items add column if not exists deleted_at timestamptz;

alter table notifications add column if not exists title text not null default '';
alter table notifications add column if not exists body text not null default '';
alter table notifications add column if not exists link text;
alter table notifications add column if not exists read_at timestamptz;
alter table notifications add column if not exists created_at timestamptz not null default now();
