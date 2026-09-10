-- CA4 Exam — database schema
-- Chạy toàn bộ file trong Supabase SQL Editor bằng tài khoản chủ dự án.

create extension if not exists pgcrypto;

do $$ begin
  create type public.user_role as enum ('admin', 'student');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.exam_status as enum ('draft', 'published');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.question_kind as enum ('DON', 'NHOM', 'NGAN');
exception when duplicate_object then null; end $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text not null,
  role public.user_role not null default 'student',
  active boolean not null default true,
  is_root boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint root_must_be_admin check (not is_root or role = 'admin')
);

create unique index if not exists one_root_admin on public.profiles (is_root) where is_root;
create unique index if not exists profiles_email_lower on public.profiles (lower(email));

create table if not exists public.folders (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 100),
  sort_order integer not null default 0 check (sort_order >= 0),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.exams (
  id uuid primary key default gen_random_uuid(),
  folder_id uuid references public.folders(id) on delete set null,
  title text not null check (char_length(title) between 1 and 160),
  description text not null default '' check (char_length(description) <= 500),
  duration_minutes integer not null check (duration_minutes between 1 and 300),
  max_attempts integer not null default 0 check (max_attempts >= 0),
  status public.exam_status not null default 'draft',
  format_version text not null default 'CA4-1.0',
  total_questions integer not null default 60 check (total_questions = 60),
  total_points numeric(8,3) not null default 70 check (total_points = 70),
  share_code text not null unique default encode(gen_random_bytes(9), 'hex'),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.passages (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid not null references public.exams(id) on delete cascade,
  group_code text not null check (group_code in ('N1', 'N2')),
  content text not null check (char_length(content) > 0),
  created_at timestamptz not null default now(),
  unique (exam_id, group_code)
);

create table if not exists public.questions (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid not null references public.exams(id) on delete cascade,
  passage_id uuid references public.passages(id) on delete cascade,
  number integer not null check (number between 1 and 60),
  kind public.question_kind not null,
  stem text not null check (char_length(stem) > 0),
  options jsonb not null default '{}'::jsonb,
  topic text not null default '',
  level text not null check (level in ('BIET', 'HIEU', 'VANDUNG')),
  points numeric(8,4) not null check (points > 0),
  created_at timestamptz not null default now(),
  unique (exam_id, number),
  constraint question_shape check (
    (kind = 'NGAN' and passage_id is null and options = '{}'::jsonb)
    or
    (kind in ('DON', 'NHOM') and jsonb_typeof(options) = 'object'
      and options ? 'A' and options ? 'B' and options ? 'C' and options ? 'D')
  )
);

-- Bảng đáp án không có policy đọc cho trình duyệt. Chỉ Edge Function dùng secret key truy cập.
create table if not exists public.question_keys (
  question_id uuid primary key references public.questions(id) on delete cascade,
  correct_answer text not null,
  accepted_answers jsonb not null default '[]'::jsonb,
  explanation text not null default ''
);

create table if not exists public.attempt_counters (
  user_id uuid not null references public.profiles(id) on delete cascade,
  exam_id uuid not null references public.exams(id) on delete cascade,
  used_attempts integer not null default 0 check (used_attempts >= 0),
  updated_at timestamptz not null default now(),
  primary key (user_id, exam_id)
);

-- Bài đang làm là dữ liệu tạm. Edge Function xóa bản ghi ngay sau khi chấm.
create table if not exists public.active_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  exam_id uuid not null references public.exams(id) on delete cascade,
  started_at timestamptz not null default now(),
  deadline_at timestamptz not null,
  warning_count integer not null default 0 check (warning_count between 0 and 3),
  draft_answers jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (user_id, exam_id)
);

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at before update on public.profiles for each row execute function public.set_updated_at();
drop trigger if exists folders_set_updated_at on public.folders;
create trigger folders_set_updated_at before update on public.folders for each row execute function public.set_updated_at();
drop trigger if exists exams_set_updated_at on public.exams;
create trigger exams_set_updated_at before update on public.exams for each row execute function public.set_updated_at();

create or replace function public.handle_new_auth_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, display_name, role, active, is_root)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(nullif(new.raw_user_meta_data ->> 'display_name', ''), split_part(coalesce(new.email, 'Học viên'), '@', 1)),
    'student',
    true,
    false
  ) on conflict (id) do update set email = excluded.email;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert or update of email on auth.users for each row execute function public.handle_new_auth_user();

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.profiles where id = auth.uid() and role = 'admin' and active);
$$;

create or replace function public.start_exam_attempt(
  p_user_id uuid,
  p_exam_id uuid,
  p_duration_minutes integer,
  p_max_attempts integer
)
returns table(id uuid, deadline_at timestamptz, warning_count integer, draft_answers jsonb)
language plpgsql security definer set search_path = public as $$
declare
  existing public.active_attempts%rowtype;
  next_count integer;
  new_id uuid;
  new_deadline timestamptz;
begin
  select * into existing from public.active_attempts
  where user_id = p_user_id and exam_id = p_exam_id
  for update;

  if found and existing.deadline_at > now() then
    return query select existing.id, existing.deadline_at, existing.warning_count, existing.draft_answers;
    return;
  elsif found then
    delete from public.active_attempts where public.active_attempts.id = existing.id;
  end if;

  insert into public.attempt_counters(user_id, exam_id, used_attempts)
  values (p_user_id, p_exam_id, 1)
  on conflict (user_id, exam_id) do update
    set used_attempts = public.attempt_counters.used_attempts + 1, updated_at = now()
    where p_max_attempts = 0 or public.attempt_counters.used_attempts < p_max_attempts
  returning used_attempts into next_count;

  if next_count is null or (p_max_attempts > 0 and next_count > p_max_attempts) then
    raise exception 'ATTEMPT_LIMIT';
  end if;

  new_id := gen_random_uuid();
  new_deadline := now() + make_interval(mins => p_duration_minutes);
  insert into public.active_attempts(id, user_id, exam_id, deadline_at)
  values (new_id, p_user_id, p_exam_id, new_deadline);

  return query select new_id, new_deadline, 0, '{}'::jsonb;
end;
$$;

revoke all on function public.start_exam_attempt(uuid, uuid, integer, integer) from public, anon, authenticated;
grant execute on function public.start_exam_attempt(uuid, uuid, integer, integer) to service_role;

alter table public.profiles enable row level security;
alter table public.folders enable row level security;
alter table public.exams enable row level security;
alter table public.passages enable row level security;
alter table public.questions enable row level security;
alter table public.question_keys enable row level security;
alter table public.attempt_counters enable row level security;
alter table public.active_attempts enable row level security;

drop policy if exists profiles_read on public.profiles;
create policy profiles_read on public.profiles for select to authenticated using (id = auth.uid() or public.is_admin());

drop policy if exists folders_read on public.folders;
create policy folders_read on public.folders for select to authenticated using (true);

drop policy if exists exams_read on public.exams;
create policy exams_read on public.exams for select to authenticated using (status = 'published' or public.is_admin());

drop policy if exists passages_read on public.passages;
create policy passages_read on public.passages for select to authenticated using (
  exists(select 1 from public.exams e where e.id = exam_id and (e.status = 'published' or public.is_admin()))
);

drop policy if exists questions_read on public.questions;
create policy questions_read on public.questions for select to authenticated using (
  exists(select 1 from public.exams e where e.id = exam_id and (e.status = 'published' or public.is_admin()))
);

-- Không tạo policy cho question_keys: authenticated/anon không thể đọc đáp án.

drop policy if exists counters_read_own on public.attempt_counters;
create policy counters_read_own on public.attempt_counters for select to authenticated using (user_id = auth.uid());

drop policy if exists attempts_read_own on public.active_attempts;
create policy attempts_read_own on public.active_attempts for select to authenticated using (user_id = auth.uid());

create or replace view public.exam_catalog
with (security_invoker = true)
as
select
  e.id, e.folder_id, e.title, e.description, e.duration_minutes, e.max_attempts,
  e.status, e.share_code, e.created_at,
  coalesce(c.used_attempts, 0)::integer as used_attempts
from public.exams e
left join public.attempt_counters c on c.exam_id = e.id and c.user_id = auth.uid();

grant select on public.exam_catalog to authenticated;
grant usage on schema public to authenticated;
grant select on public.profiles, public.folders, public.exams, public.passages, public.questions, public.attempt_counters, public.active_attempts to authenticated;
