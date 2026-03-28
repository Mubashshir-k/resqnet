-- ResQNet RLS + realtime policies (clean slate).
-- Run this in Supabase SQL Editor for the target project.

-- 1) Normalize role values (handles 'Volunteer', ' volunteer ', etc.)
update public.users
set role = lower(trim(role))
where role is not null;

-- Helper: avoids recursion by checking admin role inside a security-definer function.
-- This function bypasses RLS on public.users to prevent "infinite recursion" in policies.
create or replace function public.is_admin()
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  is_admin_user boolean;
begin
  select exists (
    select 1
    from public.users u
    where u.id::text = auth.uid()::text
      and lower(trim(u.role)) = 'admin'
  ) into is_admin_user;
  
  return coalesce(is_admin_user, false);
end;
$$;

-- 2) Ensure realtime is enabled for required tables.
do $$
begin
  alter publication supabase_realtime add table public.reports;
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.assignments;
exception
  when duplicate_object then null;
end $$;

-- 3) Enable Row Level Security on key tables.
alter table if exists public.users enable row level security;
alter table if exists public.reports enable row level security;
alter table if exists public.assignments enable row level security;

-- 3c) Prevent duplicate assignments (ensure uniqueness)
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'unique_report_volunteer') then
    alter table public.assignments add constraint unique_report_volunteer unique (report_id, volunteer_id);
  end if;
end $$;

-- 3b) Ensure REST API role grants (required in addition to RLS).
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on table public.users to authenticated;
grant select, insert, update, delete on table public.reports to authenticated;
grant select, insert, update, delete on table public.assignments to authenticated;

-- ==========================================
-- 4. STORAGE POLICIES (for 'reports' bucket)
-- ==========================================

-- Clean slate for storage policies
drop policy if exists "Allow public read of report images" on storage.objects;
drop policy if exists "Allow authenticated upload of report images" on storage.objects;
drop policy if exists "Allow admin delete of report images" on storage.objects;
drop policy if exists "Allow owner delete of report images" on storage.objects;

-- 4a) Allow public read access to images in 'reports' bucket
create policy "Allow public read of report images"
on storage.objects for select
using (bucket_id = 'reports');

-- 4b) Allow authenticated users to upload images to 'reports' bucket
create policy "Allow authenticated upload of report images"
on storage.objects for insert
with check (
  bucket_id = 'reports' 
  and auth.role() = 'authenticated'
);

-- 4c) Allow admins to delete any image in 'reports'
create policy "Allow admin delete of report images"
on storage.objects for delete
using (
  bucket_id = 'reports' 
  and public.is_admin()
);

-- 4d) Allow users to delete their own uploads (optional but good)
-- Handle potential type mismatch between auth.uid() (uuid) and owner (uuid or text)
create policy "Allow owner delete of report images"
on storage.objects for delete
using (
  bucket_id = 'reports' 
  and (auth.uid())::text = owner::text
);

-- 4) Drop all existing policies on these tables (prevents conflicting leftovers).
do $$
declare r record;
begin
  for r in select policyname from pg_policies where schemaname = 'public' and tablename = 'users' loop
    execute format('drop policy if exists %I on public.users', r.policyname);
  end loop;
end $$;

do $$
declare r record;
begin
  for r in select policyname from pg_policies where schemaname = 'public' and tablename = 'reports' loop
    execute format('drop policy if exists %I on public.reports', r.policyname);
  end loop;
end $$;

do $$
declare r record;
begin
  for r in select policyname from pg_policies where schemaname = 'public' and tablename = 'assignments' loop
    execute format('drop policy if exists %I on public.assignments', r.policyname);
  end loop;
end $$;

-- =========================
-- USERS TABLE POLICIES
-- =========================

-- Users can read their own profile
create policy "Users can read own or admins"
on public.users
for select
to authenticated
using (
  (auth.uid())::text = id::text
  or public.is_admin()
);

-- Users can create their own profile row
create policy "Users can create their own profile"
on public.users
for insert
to authenticated
with check (auth.uid() = id);

-- =========================
-- REPORTS TABLE POLICIES
-- =========================

-- Users can read own reports
create policy "Users can read own reports"
on public.reports
for select
to authenticated
using ((auth.uid())::text = user_id::text);

-- Admins can read all reports
create policy "Admins can read all reports"
on public.reports
for select
to authenticated
using (public.is_admin());

-- Volunteers can read reports assigned to them
create policy "Volunteers can read assigned reports"
on public.reports
for select
to authenticated
using (
  exists (
    select 1
    from public.assignments a
    where a.report_id = reports.id
      and a.volunteer_id::text = (auth.uid())::text
  )
);

-- Users can create their own reports
create policy "Users can create reports"
on public.reports
for insert
to authenticated
with check ((auth.uid())::text = user_id::text);

-- Admins can update all reports
create policy "Admins can update all reports"
on public.reports
for update
to authenticated
using (public.is_admin());

-- Volunteers can update reports assigned to them (mark completed)
create policy "Volunteers can update assigned reports"
on public.reports
for update
to authenticated
using (
  exists (
    select 1
    from public.assignments a
    where a.report_id = reports.id
      and a.volunteer_id::text = (auth.uid())::text
  )
)
with check (
  exists (
    select 1
    from public.assignments a
    where a.report_id = reports.id
      and a.volunteer_id::text = (auth.uid())::text
  )
);

-- Admins can delete any report
create policy "Admins can delete reports"
on public.reports
for delete
to authenticated
using (public.is_admin());

-- =========================
-- ASSIGNMENTS TABLE POLICIES
-- =========================

-- Admins can create assignments (dispatch)
create policy "Admins can create assignments"
on public.assignments
for insert
to authenticated
with check (public.is_admin());

-- Admins can read all assignments
create policy "Admins can read all assignments"
on public.assignments
for select
to authenticated
using (public.is_admin());

-- Volunteers can read their own assignments
create policy "Volunteers can read own assignments"
on public.assignments
for select
to authenticated
using ((auth.uid())::text = volunteer_id::text);

-- Volunteers can update their own assignment status
create policy "Volunteers can update own assignment status"
on public.assignments
for update
to authenticated
using ((auth.uid())::text = volunteer_id::text)
with check ((auth.uid())::text = volunteer_id::text);

-- Admins can delete assignments (usually via report cascade)
create policy "Admins can delete assignments"
on public.assignments
for delete
to authenticated
using (public.is_admin());
