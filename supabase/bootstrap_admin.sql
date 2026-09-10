-- Chạy file này SAU KHI đã tạo người dùng quản trị trong Authentication > Users.
-- Mật khẩu chỉ nhập trong Supabase Dashboard, không lưu trong mã nguồn.

do $$
declare
  target_id uuid;
begin
  select id into target_id
  from auth.users
  where lower(email) = lower('hoangprogamer@gmail.com')
  limit 1;

  if target_id is null then
    raise exception 'Chưa có tài khoản hoangprogamer@gmail.com trong Authentication > Users';
  end if;

  update public.profiles set role = 'student', is_root = false where is_root = true and id <> target_id;

  insert into public.profiles (id, email, display_name, role, active, is_root)
  values (target_id, 'hoangprogamer@gmail.com', 'Admin Hoàng', 'admin', true, true)
  on conflict (id) do update set
    email = excluded.email,
    display_name = excluded.display_name,
    role = 'admin',
    active = true,
    is_root = true;
end $$;
