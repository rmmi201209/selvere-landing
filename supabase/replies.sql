-- Run in Supabase SQL Editor.
-- Admin (skc98@daum.net) can reply to posts and delete any post.

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(lower(auth.jwt() ->> 'email') = 'skc98@daum.net', false);
$$;

drop policy if exists "admin can delete any post" on public.posts;

create policy "admin can delete any post"
on public.posts
for delete
to authenticated
using (public.is_admin());

create table if not exists public.post_replies (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default timezone('utc', now()),
  post_id uuid not null references public.posts (id) on delete cascade,
  author_id uuid not null references auth.users (id) on delete cascade,
  author_name text not null default '관리자',
  body text not null
);

create index if not exists post_replies_post_id_idx
  on public.post_replies (post_id, created_at);

alter table public.post_replies enable row level security;

drop policy if exists "members can read replies" on public.post_replies;
drop policy if exists "admin can insert replies" on public.post_replies;
drop policy if exists "admin can delete replies" on public.post_replies;

create policy "members can read replies"
on public.post_replies
for select
to authenticated
using (true);

create policy "admin can insert replies"
on public.post_replies
for insert
to authenticated
with check (
  public.is_admin()
  and auth.uid() = author_id
  and length(trim(body)) > 0
);

create policy "admin can delete replies"
on public.post_replies
for delete
to authenticated
using (public.is_admin());

grant select on table public.post_replies to authenticated;
grant insert, delete on table public.post_replies to authenticated;
