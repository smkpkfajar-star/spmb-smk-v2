-- ============================================================
-- Pengaturan situs yang bisa diubah superadmin dari panel admin
--
--   spmb_dibuka  : true = pendaftaran SPMB dibuka, false = ditutup
--   popup_promo  : true = pop-up promo tampil di beranda, false = mati
--
-- * Semua pengunjung boleh MEMBACA (situs perlu tahu status).
-- * Hanya SUPERADMIN yang boleh MENGUBAH.
-- * Penjaga di server: bila SPMB ditutup, pendaftar baru tidak bisa mendapat
--   nomor pendaftaran (formulir lama di browser pun tetap ditolak).
--   Superadmin/verifikasi tetap bisa memberi nomor pengganti ("Beri nomor baru").
--
-- Jalankan SESUDAH 01-admin-setup.sql dan 02-nomor-pendaftaran.sql.
-- Supabase → SQL Editor → New query → tempel → Run. Aman dijalankan ulang.
-- ============================================================

create table if not exists public.pengaturan (
  kunci       text primary key,
  nilai       boolean not null,
  diubah      timestamptz not null default now(),
  diubah_oleh uuid references auth.users (id) on delete set null
);
alter table public.pengaturan enable row level security;

insert into public.pengaturan (kunci, nilai) values
  ('spmb_dibuka', true),
  ('popup_promo', true)
on conflict (kunci) do nothing;

drop policy if exists "pengaturan: semua boleh baca" on public.pengaturan;
create policy "pengaturan: semua boleh baca"
on public.pengaturan for select to anon, authenticated
using (true);

drop policy if exists "pengaturan: superadmin boleh ubah" on public.pengaturan;
create policy "pengaturan: superadmin boleh ubah"
on public.pengaturan for update to authenticated
using (public.is_superadmin())
with check (public.is_superadmin());

grant select on public.pengaturan to anon, authenticated;
grant update (nilai, diubah, diubah_oleh) on public.pengaturan to authenticated;

-- Penjaga: tolak nomor pendaftaran baru saat SPMB ditutup
create or replace function public.cek_spmb_dibuka()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce((select nilai from public.pengaturan where kunci = 'spmb_dibuka'), true) then
    return new;
  end if;
  -- petugas yang memberi nomor pengganti tetap boleh
  if exists (
    select 1 from public.profiles
    where id = auth.uid() and role::text in ('superadmin', 'verifikasi')
  ) then
    return new;
  end if;
  raise exception 'DITUTUP: pendaftaran SPMB sedang ditutup';
end;
$$;

drop trigger if exists cek_spmb_dibuka on public.nomor_pendaftaran;
create trigger cek_spmb_dibuka
before insert on public.nomor_pendaftaran
for each row execute function public.cek_spmb_dibuka();

-- Cek status sekarang:
-- select kunci, nilai, diubah from public.pengaturan order by kunci;
