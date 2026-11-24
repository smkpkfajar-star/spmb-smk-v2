-- ============================================================
-- Pengaturan situs lanjutan: jadwal otomatis, pesan saat ditutup, banner pengumuman
--
--   jadwal_buka  (waktu) : pendaftaran baru dibuka mulai saat ini. Kosong = tanpa batas awal.
--   jadwal_tutup (waktu) : pendaftaran otomatis ditutup mulai saat ini. Kosong = tanpa batas akhir.
--   pesan_tutup  (teks)  : tulisan yang tampil saat pendaftaran ditutup. Kosong = tulisan bawaan.
--   banner_info  (nilai + teks) : banner pengumuman di beranda & halaman daftar.
--
-- Saklar spmb_dibuka (03-pengaturan.sql) tetap yang utama: bila MATI, pendaftaran
-- tertutup walau jadwal sedang berjalan. Jadwal memakai jam server, bukan jam HP pengunjung.
-- Penjaga di server ikut membaca jadwal: formulir lama di browser pun ditolak di luar jadwal.
--
-- Jalankan SESUDAH 03-pengaturan.sql.
-- Supabase → SQL Editor → New query → tempel → Run. Aman dijalankan ulang.
-- ============================================================

alter table public.pengaturan add column if not exists teks  text;
alter table public.pengaturan add column if not exists waktu timestamptz;

alter table public.pengaturan drop constraint if exists pengaturan_teks_pendek;
alter table public.pengaturan
  add constraint pengaturan_teks_pendek check (teks is null or char_length(teks) <= 280);

insert into public.pengaturan (kunci, nilai) values
  ('jadwal_buka',  true),
  ('jadwal_tutup', true),
  ('pesan_tutup',  true),
  ('banner_info',  false)
on conflict (kunci) do nothing;

grant update (nilai, diubah, diubah_oleh, teks, waktu) on public.pengaturan to authenticated;

-- Penjaga: tolak nomor pendaftaran baru bila saklar mati ATAU di luar jadwal
create or replace function public.cek_spmb_dibuka()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_saklar boolean;
  v_buka   timestamptz;
  v_tutup  timestamptz;
begin
  select nilai into v_saklar from public.pengaturan where kunci = 'spmb_dibuka';
  select waktu into v_buka   from public.pengaturan where kunci = 'jadwal_buka';
  select waktu into v_tutup  from public.pengaturan where kunci = 'jadwal_tutup';

  if coalesce(v_saklar, true)
     and (v_buka  is null or now() >= v_buka)
     and (v_tutup is null or now() <  v_tutup) then
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

-- Cek sekarang:
-- select kunci, nilai, teks, waktu from public.pengaturan order by kunci;
