alter table chat_messages add column if not exists reply_to text;
alter table chat_messages add column if not exists attachment_url text;
alter table chat_messages add column if not exists attachment_name text;
alter table chat_messages add column if not exists attachment_mime text;

create table if not exists chat_reactions (
  message_id text not null,
  user_id text not null,
  emoji text not null default '👍',
  created_at timestamptz not null default now(),
  primary key (message_id, user_id)
);
create index if not exists chat_reactions_msg_idx on chat_reactions (message_id);
