create table if not exists ideas (
  id text primary key,
  title text not null default '',
  body text not null default '',
  author_id text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists ideas_created_idx on ideas (created_at);
