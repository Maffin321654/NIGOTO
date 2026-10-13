-- Add leftover columns from older schemas. Safe on both fresh and existing DBs:
-- ADD COLUMN IF NOT EXISTS is a no-op when the column is already there.
-- Relaxing NOT NULL / SET DEFAULT on *existing* columns is done at runtime
-- (healSchema) so a type mismatch cannot fail the deploy-time migrator.

alter table departments add column if not exists slug text not null default '';
alter table departments add column if not exists color text not null default '';
alter table departments add column if not exists icon text not null default '';
alter table departments add column if not exists created_at timestamptz not null default now();
alter table departments add column if not exists updated_at timestamptz not null default now();

alter table events add column if not exists slug text not null default '';

alter table profiles add column if not exists email text not null default '';
alter table profiles add column if not exists slug text not null default '';
alter table profiles add column if not exists bio text not null default '';
alter table profiles add column if not exists class_name text not null default '';

alter table department_members add column if not exists position text not null default 'MEMBER';
