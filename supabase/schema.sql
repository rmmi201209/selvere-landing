-- SELVÈRE inquiries: Google Sheet replacement
-- Run this in Supabase Dashboard → SQL Editor → New query → Run

create table if not exists public.inquiries (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default timezone('utc', now()),
  name text not null,
  company text not null,
  phone text not null,
  email text not null,
  category text not null,
  message text not null,
  status text not null default '접수대기',
  privacy_consent boolean not null default false,
  note text not null default '',
  constraint inquiries_status_check
    check (status in ('접수대기', '상담중', '연락완료', '보류', '완료'))
);

create index if not exists inquiries_created_at_idx
  on public.inquiries (created_at desc);

alter table public.inquiries enable row level security;

drop policy if exists "public can insert inquiries" on public.inquiries;
drop policy if exists "authenticated can select inquiries" on public.inquiries;
drop policy if exists "authenticated can update status and note" on public.inquiries;

create policy "public can insert inquiries"
on public.inquiries
for insert
to anon, authenticated
with check (
  status = '접수대기'
  and note = ''
  and privacy_consent = true
  and length(trim(name)) > 0
  and length(trim(company)) > 0
  and length(trim(phone)) > 0
  and length(trim(email)) > 0
  and length(trim(category)) > 0
  and length(trim(message)) > 0
);

create policy "authenticated can select inquiries"
on public.inquiries
for select
to authenticated
using (true);

create policy "authenticated can update status and note"
on public.inquiries
for update
to authenticated
using (true)
with check (status in ('접수대기', '상담중', '연락완료', '보류', '완료'));

grant usage on schema public to anon, authenticated;
grant insert on table public.inquiries to anon, authenticated;
grant select, update on table public.inquiries to authenticated;
