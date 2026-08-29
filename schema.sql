-- カレンダーの予定を保存するテーブル
-- Supabase ダッシュボードの SQL Editor で実行してください。
--
-- ※ この Supabase プロジェクトを他アプリと共有している場合でも衝突しないよう、
--    テーブル名に calendar_ の接頭辞を付けて名前空間を分けています。

create table if not exists public.calendar_events (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  start_at    timestamptz not null,
  end_at      timestamptz,
  all_day     boolean not null default false,
  description text,
  created_at  timestamptz not null default now()
);

-- Row Level Security を有効化
alter table public.calendar_events enable row level security;

-- 現状はログイン機能が無いため、anon ロールに全操作を許可します。
-- ※ 認証を追加したら、これらのポリシーを user 単位に絞り込んでください。
drop policy if exists "anon can read calendar_events"   on public.calendar_events;
drop policy if exists "anon can insert calendar_events" on public.calendar_events;
drop policy if exists "anon can update calendar_events" on public.calendar_events;
drop policy if exists "anon can delete calendar_events" on public.calendar_events;

create policy "anon can read calendar_events"
  on public.calendar_events for select
  using (true);

create policy "anon can insert calendar_events"
  on public.calendar_events for insert
  with check (true);

create policy "anon can update calendar_events"
  on public.calendar_events for update
  using (true) with check (true);

create policy "anon can delete calendar_events"
  on public.calendar_events for delete
  using (true);
