-- Club-wide chat + profanity timeouts.

create table if not exists chat_messages (
  id text primary key,
  user_id text,
  body text not null default '',
  kind text not null default 'USER',
  created_at timestamptz not null default now()
);
create index if not exists chat_messages_created_idx on chat_messages (created_at);

create table if not exists chat_violations (
  id text primary key,
  user_id text not null,
  word text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists chat_violations_user_idx on chat_violations (user_id, created_at);

create table if not exists chat_mutes (
  user_id text primary key,
  until_at timestamptz not null
);
