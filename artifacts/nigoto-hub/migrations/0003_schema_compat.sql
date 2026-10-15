-- Repair columns that were added to 0002 after it had already been applied.
-- CREATE TABLE IF NOT EXISTS never mutates an existing table, so these ALTERs
-- are required for Neon (and any long-lived PGLite) that ran an older 0002.

alter table departments add column if not exists description text not null default '';
alter table departments add column if not exists sort_order int not null default 0;

alter table profiles add column if not exists full_name text not null default '';
alter table profiles add column if not exists student_id text;
alter table profiles add column if not exists phone text;
alter table profiles add column if not exists birthday date;
alter table profiles add column if not exists role text not null default 'MEMBER';
alter table profiles add column if not exists status text not null default 'ACTIVE';
alter table profiles add column if not exists join_date timestamptz not null default now();
alter table profiles add column if not exists avatar_url text;
alter table profiles add column if not exists deleted_at timestamptz;

alter table events add column if not exists description text not null default '';
alter table events add column if not exists event_type text not null default 'CULTURE';
alter table events add column if not exists status text not null default 'UPCOMING';
alter table events add column if not exists location text not null default '';
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

update events set checkin_token = id where checkin_token is null or checkin_token = '';

alter table content_items add column if not exists caption text not null default '';
alter table content_items add column if not exists platform text not null default 'FACEBOOK';
alter table content_items add column if not exists content_type text not null default 'POSTER';
alter table content_items add column if not exists status text not null default 'IDEA';
alter table content_items add column if not exists publish_at timestamptz;
alter table content_items add column if not exists event_id text;
alter table content_items add column if not exists writer_id text;
alter table content_items add column if not exists designer_id text;
alter table content_items add column if not exists reviewer_id text;
alter table content_items add column if not exists created_by text not null default '';
alter table content_items add column if not exists created_at timestamptz not null default now();
alter table content_items add column if not exists updated_at timestamptz not null default now();
alter table content_items add column if not exists deleted_at timestamptz;

alter table courses add column if not exists description text not null default '';
alter table courses add column if not exists is_public boolean not null default false;
alter table courses add column if not exists created_by text not null default '';
alter table courses add column if not exists created_at timestamptz not null default now();
alter table courses add column if not exists updated_at timestamptz not null default now();
alter table courses add column if not exists deleted_at timestamptz;

alter table course_items add column if not exists media_url text;
alter table course_items add column if not exists extra text;
alter table course_items add column if not exists sort_order int not null default 0;
alter table course_items add column if not exists created_at timestamptz not null default now();

alter table tasks add column if not exists description text not null default '';
alter table tasks add column if not exists status text not null default 'TODO';
alter table tasks add column if not exists priority text not null default 'MEDIUM';
alter table tasks add column if not exists deadline timestamptz;
alter table tasks add column if not exists department_id text;
alter table tasks add column if not exists event_id text;
alter table tasks add column if not exists created_at timestamptz not null default now();
alter table tasks add column if not exists updated_at timestamptz not null default now();
alter table tasks add column if not exists deleted_at timestamptz;

update departments set sort_order = 0 where id = 'bcn';
update departments set sort_order = 1 where id = 'members';
update departments set sort_order = 2 where id = 'media';
update departments set sort_order = 3 where id = 'academic';
update departments set sort_order = 4 where id = 'event';
