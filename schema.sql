-- カレンダーの予定を保存するテーブル
-- Supabase ダッシュボードの SQL Editor で実行してください。

create table if not exists public.events (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  start_at    timestamptz not null,
  end_at      timestamptz,
  all_day     boolean not null default false,
  description text,
  created_at  timestamptz not null default now()
);

-- Row Level Security を有効化
alter table public.events enable row level security;

-- 現状はログイン機能が無いため、anon ロールに全操作を許可します。
-- ※ 認証を追加したら、これらのポリシーを user 単位に絞り込んでください。
drop policy if exists "anon can read events"   on public.events;
drop policy if exists "anon can insert events" on public.events;
drop policy if exists "anon can update events" on public.events;
drop policy if exists "anon can delete events" on public.events;

create policy "anon can read events"
  on public.events for select
  using (true);

create policy "anon can insert events"
  on public.events for insert
  with check (true);

create policy "anon can update events"
  on public.events for update
  using (true) with check (true);

create policy "anon can delete events"
  on public.events for delete
  using (true);
