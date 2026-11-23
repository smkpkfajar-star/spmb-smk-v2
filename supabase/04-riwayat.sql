-- ============================================================
-- Riwayat aktivitas petugas (hanya SUPERADMIN yang bisa melihat) — tampil langsung (realtime)
--
-- Dicatat dari panel admin: masuk/keluar, ubah data pendaftar (lengkap dengan
-- perubahan lama → baru), hubungi orang tua, ekspor Excel/PDF, unduh bukti PDF,
-- beri nomor baru, tambah/ubah petugas, ubah peran, reset password,
-- pengaturan situs, unduh CSV.
--
-- Aturan:
-- * Petugas yang login boleh MENAMBAH catatan. Nama, peran, dan waktu diisi
--   oleh server (tidak bisa dipalsukan dari browser).
-- * Hanya superadmin yang boleh MEMBACA.
-- * TIDAK ADA yang boleh mengubah atau menghapus catatan.
--
-- Jalankan SESUDAH 01-admin-setup.sql. Bila versi lama file ini sudah pernah dijalankan,
-- jalankan ULANG agar fitur langsung (realtime) aktif.
-- Supabase → SQL Editor → New query → tempel → Run. Aman dijalankan ulang.
-- ============================================================

create table if not exists public.riwayat (
  id          bigserial primary key,
  waktu       timestamptz not null default now(),
  pelaku      uuid references auth.users (id) on delete set null,
  pelaku_nama text,
  peran       text,
  aksi        text not null,
  modul       text,
  sasaran     text,
  detail      jsonb
);
create index if not exists riwayat_waktu_idx on public.riwayat (waktu desc);
alter table public.riwayat enable row level security;

-- Isi otomatis pelaku/nama/peran/waktu dari akun yang sedang login
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
  if v_peran is null or v_peran not in ('superadmin', 'verifikasi', 'keuangan', 'tes_fisik') then
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

drop trigger if exists isi_riwayat on public.riwayat;
create trigger isi_riwayat
before insert on public.riwayat
for each row execute function public.isi_riwayat();

drop policy if exists "riwayat: petugas boleh menambah" on public.riwayat;
create policy "riwayat: petugas boleh menambah"
on public.riwayat for insert to authenticated
with check (true); -- pemeriksaan petugas ada di trigger isi_riwayat

drop policy if exists "riwayat: hanya superadmin boleh baca" on public.riwayat;
create policy "riwayat: hanya superadmin boleh baca"
on public.riwayat for select to authenticated
using (public.is_superadmin());

-- tanpa policy update/delete → catatan tidak bisa diubah atau dihapus lewat aplikasi
revoke update, delete on public.riwayat from anon, authenticated;
grant select, insert on public.riwayat to authenticated;
grant usage on sequence public.riwayat_id_seq to authenticated;

-- Realtime: aktivitas baru langsung muncul di halaman Riwayat superadmin.
-- (Aturan baca di atas tetap berlaku: hanya superadmin yang menerima kiriman langsung.)
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
       where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'riwayat'
     ) then
    alter publication supabase_realtime add table public.riwayat;
  end if;
end $$;

-- Lihat 50 aktivitas terbaru:
-- select waktu, pelaku_nama, peran, aksi, modul, sasaran, detail from public.riwayat order by waktu desc limit 50;
