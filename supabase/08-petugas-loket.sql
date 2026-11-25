-- ============================================================
-- 08-petugas-loket.sql — peran "Petugas Loket" (jaga_loket): hanya boleh
-- menyalakan/mematikan Mode Teras di komputer loket lewat admin.
-- Jalankan SEKALI di Supabase SQL Editor. Aman dijalankan ulang.
-- ============================================================

alter type public.user_role add value if not exists 'jaga_loket';

-- Riwayat (login/keluar) juga boleh dicatat oleh Petugas Loket
create or replace function public.isi_riwayat()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_nama text;
  v_peran text;
begin
  select nama_lengkap, role::text into v_nama, v_peran
  from public.profiles where id = auth.uid();
  if v_peran is null or v_peran not in ('superadmin', 'verifikasi', 'keuangan', 'tes_fisik', 'jaga_loket') then
    raise exception 'Hanya petugas yang boleh mencatat riwayat';
  end if;
  new.pelaku := auth.uid();
  new.pelaku_nama := v_nama;
  new.peran := v_peran;
  new.waktu := now();
  new.aksi := left(coalesce(new.aksi, ''), 80);
  new.modul := left(new.modul, 80);
  new.sasaran := left(new.sasaran, 200);
  return new;
end;
$$;
