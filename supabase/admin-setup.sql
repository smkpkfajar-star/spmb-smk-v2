-- ============================================================
-- admin-setup.sql — jalankan SEKALI di Supabase SQL Editor.
-- Aman dijalankan ulang.
-- ============================================================

-- 1) Peran petugas (nilai 'pendaftar' sudah ada)
alter type public.user_role add value if not exists 'superadmin';
alter type public.user_role add value if not exists 'verifikasi';
alter type public.user_role add value if not exists 'keuangan';
alter type public.user_role add value if not exists 'tes_fisik';

-- 2) Cek superadmin (dipakai aturan akses di bawah)
create or replace function public.is_superadmin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role::text = 'superadmin'
  );
$$;

-- 3) Aturan akses tabel profiles
alter table public.profiles enable row level security;

drop policy if exists "profil: baca sendiri atau superadmin" on public.profiles;
create policy "profil: baca sendiri atau superadmin"
on public.profiles for select to authenticated
using (id = (select auth.uid()) or public.is_superadmin());

drop policy if exists "profil: superadmin boleh ubah" on public.profiles;
create policy "profil: superadmin boleh ubah"
on public.profiles for update to authenticated
using (public.is_superadmin())
with check (public.is_superadmin());

-- 4) Pengaman: hanya superadmin yang boleh mengubah/menentukan peran,
--    apa pun aturan lain yang mungkin sudah ada di tabel profiles.
create or replace function public.lindungi_role()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- auth.uid() kosong = dijalankan dari SQL Editor / server, bukan dari browser
  if (select auth.uid()) is null or public.is_superadmin() then
    return new;
  end if;
  if tg_op = 'INSERT' and new.role::text <> 'pendaftar' then
    raise exception 'Tidak boleh menentukan peran sendiri';
  end if;
  if tg_op = 'UPDATE' and new.role is distinct from old.role then
    raise exception 'Hanya superadmin yang boleh mengubah peran';
  end if;
  return new;
end;
$$;

drop trigger if exists lindungi_role on public.profiles;
create trigger lindungi_role
before insert or update on public.profiles
for each row execute function public.lindungi_role();

-- 5) Reset password oleh superadmin
create or replace function public.reset_password(target_email text, new_password text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_superadmin() then
    raise exception 'Hanya superadmin yang boleh mereset password';
  end if;
  if length(coalesce(new_password, '')) < 8 then
    raise exception 'Password minimal 8 karakter';
  end if;
  update auth.users
     set encrypted_password = extensions.crypt(new_password, extensions.gen_salt('bf')),
         updated_at = now()
   where email = lower(target_email);
  if not found then
    raise exception 'Akun % tidak ditemukan', target_email;
  end if;
end;
$$;

revoke execute on function public.reset_password(text, text) from public, anon;
grant execute on function public.reset_password(text, text) to authenticated;

-- 6) Petugas boleh melihat daftar berkas semua siswa di storage
drop policy if exists "petugas lihat semua berkas" on storage.objects;
create policy "petugas lihat semua berkas"
on storage.objects for select to authenticated
using (
  bucket_id = 'berkas-spmb'
  and exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role::text in ('superadmin', 'verifikasi')
  )
);

-- Selesai. Hasil yang diharapkan: "Success. No rows returned".
