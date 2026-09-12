-- Nâng cấp CA4 Exam: giao bài cho một, nhiều hoặc toàn bộ học viên đang hoạt động.
-- Chạy TOÀN BỘ file này đúng một lần trong Supabase SQL Editor trước khi cập nhật website.

alter type public.exam_status add value if not exists 'assigned';

create table if not exists public.exam_assignments (
  exam_id uuid not null references public.exams(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  assigned_by uuid references public.profiles(id) on delete set null,
  assigned_at timestamptz not null default now(),
  primary key (exam_id, user_id)
);

create index if not exists exam_assignments_user_id_idx on public.exam_assignments(user_id);

alter table public.exam_assignments enable row level security;

drop policy if exists exam_assignments_read on public.exam_assignments;
create policy exam_assignments_read on public.exam_assignments for select to authenticated using (
  user_id = auth.uid() or public.is_admin()
);

drop policy if exists exams_read on public.exams;
create policy exams_read on public.exams for select to authenticated using (
  status::text = 'published'
  or public.is_admin()
  or (
    status::text = 'assigned'
    and exists(
      select 1 from public.exam_assignments a
      where a.exam_id = id and a.user_id = auth.uid()
    )
  )
);

drop policy if exists passages_read on public.passages;
create policy passages_read on public.passages for select to authenticated using (
  exists(select 1 from public.exams e where e.id = exam_id)
);

drop policy if exists questions_read on public.questions;
create policy questions_read on public.questions for select to authenticated using (
  exists(select 1 from public.exams e where e.id = exam_id)
);

create or replace function public.admin_update_exam_settings(
  p_exam_id uuid,
  p_title text,
  p_description text,
  p_duration_minutes integer,
  p_max_attempts integer,
  p_folder_id uuid,
  p_status text,
  p_assigned_user_ids uuid[],
  p_actor_id uuid
)
returns void language plpgsql security definer set search_path = public as $$
declare
  requested_count integer;
  valid_count integer;
begin
  if p_status not in ('draft', 'published', 'assigned') then
    raise exception 'INVALID_STATUS';
  end if;

  if p_title is null or char_length(btrim(p_title)) not between 1 and 160
     or p_duration_minutes not between 1 and 300
     or p_max_attempts < 0 then
    raise exception 'INVALID_EXAM_SETTINGS';
  end if;

  select count(distinct item)::integer into requested_count
  from unnest(coalesce(p_assigned_user_ids, array[]::uuid[])) as item;

  if p_status = 'assigned' then
    if requested_count = 0 then
      raise exception 'ASSIGNEES_REQUIRED';
    end if;

    select count(*)::integer into valid_count
    from public.profiles
    where id = any(coalesce(p_assigned_user_ids, array[]::uuid[]))
      and role = 'student'
      and active = true;

    if valid_count <> requested_count then
      raise exception 'INVALID_ASSIGNEES';
    end if;
  end if;

  update public.exams
  set title = btrim(p_title),
      description = coalesce(p_description, ''),
      duration_minutes = p_duration_minutes,
      max_attempts = p_max_attempts,
      folder_id = p_folder_id,
      status = p_status::public.exam_status
  where id = p_exam_id;

  if not found then
    raise exception 'EXAM_NOT_FOUND';
  end if;

  delete from public.exam_assignments where exam_id = p_exam_id;

  if p_status = 'assigned' then
    insert into public.exam_assignments(exam_id, user_id, assigned_by)
    select p_exam_id, item, p_actor_id
    from (
      select distinct unnest(p_assigned_user_ids) as item
    ) selected;
  end if;
end;
$$;

revoke all on function public.admin_update_exam_settings(uuid, text, text, integer, integer, uuid, text, uuid[], uuid) from public, anon, authenticated;
grant execute on function public.admin_update_exam_settings(uuid, text, text, integer, integer, uuid, text, uuid[], uuid) to service_role;

create or replace view public.exam_catalog
with (security_invoker = true)
as
select
  e.id, e.folder_id, e.title, e.description, e.duration_minutes, e.max_attempts,
  e.status, e.share_code, e.created_at,
  coalesce(c.used_attempts, 0)::integer as used_attempts
from public.exams e
left join public.attempt_counters c on c.exam_id = e.id and c.user_id = auth.uid();

revoke all on table public.exam_assignments from anon, authenticated;
grant select on public.exam_assignments, public.exam_catalog to authenticated;
