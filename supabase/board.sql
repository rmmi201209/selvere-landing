-- Run in Supabase SQL Editor after the inquiries table already exists.
-- 1) Lock B2B inquiries to the admin account
-- 2) Create member posts for the public board

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(lower(auth.jwt() ->> 'email') = 'skc98@daum.net', false);
$$;

drop policy if exists "authenticated can select inquiries" on public.inquiries;
drop policy if exists "authenticated can update status and note" on public.inquiries;
drop policy if exists "admin can select inquiries" on public.inquiries;
drop policy if exists "admin can update status and note" on public.inquiries;

create policy "admin can select inquiries"
on public.inquiries
for select
to authenticated
using (public.is_admin());

create policy "admin can update status and note"
on public.inquiries
for update
to authenticated
using (public.is_admin())
with check (
  public.is_admin()
  and status in ('접수대기', '상담중', '연락완료', '보류', '완료')
);

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default timezone('utc', now()),
  author_id uuid not null references auth.users (id) on delete cascade,
  author_name text not null default '',
  title text not null,
  body text not null
);

create index if not exists posts_created_at_idx on public.posts (created_at desc);

alter table public.posts enable row level security;

drop policy if exists "members can read posts" on public.posts;
drop policy if exists "members can insert own posts" on public.posts;
drop policy if exists "members can delete own posts" on public.posts;

create policy "members can read posts"
on public.posts
for select
to authenticated
using (true);

create policy "members can insert own posts"
on public.posts
for insert
to authenticated
with check (
  auth.uid() = author_id
  and length(trim(title)) > 0
  and length(trim(body)) > 0
);

create policy "members can delete own posts"
on public.posts
for delete
to authenticated
using (auth.uid() = author_id);

grant select, insert, delete on table public.posts to authenticated;
