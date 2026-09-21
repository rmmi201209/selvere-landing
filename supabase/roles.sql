-- Run in Supabase SQL Editor.
-- Split admin rights:
--   skc98@daum.net  all
--   skc99@daum.net  inbound inquiries
--   skc00@daum.net  board replies/deletes

create or replace function public.has_admin_scope(scope text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case lower(coalesce(auth.jwt() ->> 'email', ''))
    when 'skc98@daum.net' then true
    when 'skc99@daum.net' then scope = 'inbound'
    when 'skc00@daum.net' then scope = 'board'
    else false
  end;
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_admin_scope('inbound') or public.has_admin_scope('board');
$$;

drop policy if exists "admin can select inquiries" on public.inquiries;
drop policy if exists "admin can update status and note" on public.inquiries;

create policy "admin can select inquiries"
on public.inquiries
for select
to authenticated
using (public.has_admin_scope('inbound'));

create policy "admin can update status and note"
on public.inquiries
for update
to authenticated
using (public.has_admin_scope('inbound'))
with check (
  public.has_admin_scope('inbound')
  and status in ('접수대기', '상담중', '연락완료', '보류', '완료')
);

drop policy if exists "admin can delete any post" on public.posts;

create policy "admin can delete any post"
on public.posts
for delete
to authenticated
using (public.has_admin_scope('board'));

drop policy if exists "admin can insert replies" on public.post_replies;
drop policy if exists "admin can delete replies" on public.post_replies;

create policy "admin can insert replies"
on public.post_replies
for insert
to authenticated
with check (
  public.has_admin_scope('board')
  and auth.uid() = author_id
  and length(trim(body)) > 0
);

create policy "admin can delete replies"
on public.post_replies
for delete
to authenticated
using (public.has_admin_scope('board'));

create or replace function public.can_use_board()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select not public.has_admin_scope('inbound')
      or public.has_admin_scope('board');
$$;

drop policy if exists "members can read posts" on public.posts;
drop policy if exists "members can insert own posts" on public.posts;
drop policy if exists "members can delete own posts" on public.posts;
drop policy if exists "members can read replies" on public.post_replies;

create policy "members can read posts"
on public.posts
for select
to authenticated
using (public.can_use_board());

create policy "members can insert own posts"
on public.posts
for insert
to authenticated
with check (
  public.can_use_board()
  and auth.uid() = author_id
  and length(trim(title)) > 0
  and length(trim(body)) > 0
);

create policy "members can delete own posts"
on public.posts
for delete
to authenticated
using (
  public.can_use_board()
  and auth.uid() = author_id
);

create policy "members can read replies"
on public.post_replies
for select
to authenticated
using (public.can_use_board());
