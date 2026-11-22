-- ============================================================
-- Nomor pendaftaran berkode jurusan & dijamin tidak pernah sama
--
--   SPMB-2026-DKV-001   SPMB-2026-RPL-001   SPMB-2026-TITL-001
--   SPMB-2026-TKR-001   SPMB-2026-TSM-001
--
--   Tiap jurusan urut mulai 001, kapasitas 999 pendaftar per jurusan.
--
-- Cara kerja:
--  * Tiap jurusan punya penghitung sendiri per tahun. Baris penghitung dikunci
--    saat dipakai, jadi dua orang yang mendaftar di detik yang sama tetap
--    mendapat nomor berbeda.
--  * Kolom "nomor" UNIK: database menolak nomor kembar.
--  * Satu akun siswa = satu nomor. Kirim ulang setelah gagal di tengah jalan
--    (jurusan sama) mendapat nomor yang sama.
--  * Bila 999 nomor satu jurusan habis, pendaftar diberi pesan "kuota penuh".
--
-- Pengaman nomor dobel (bila penghitung pernah kembali ke awal sementara
-- data lama masih ada di Google Sheets):
--  * Formulir memeriksa nomor ke sheet. Bila sudah dipakai NISN lain, formulir
--    memanggil ambil_no_pendaftaran(jurusan, p_lewati => nomor itu) dan
--    mendapat nomor berikutnya.
--  * Petugas (superadmin/verifikasi) bisa memberi nomor pengganti lewat
--    tombol "Beri nomor baru" di Dashboard → fungsi ganti_no_pendaftaran.
--
-- Jalankan di Supabase → SQL Editor → New query → Run.
-- Aman dijalankan ulang (juga bila versi sebelumnya sudah pernah dijalankan).
-- ============================================================

-- versi lama tidak dipakai lagi
drop function if exists public.ambil_no_pendaftaran();
drop function if exists public.ambil_no_pendaftaran(text);
drop sequence if exists public.no_pendaftaran_seq;

create table if not exists public.penghitung_nomor (
  tahun   text not null,
  jurusan text not null,
  berikut int  not null default 0,
  primary key (tahun, jurusan)
);
alter table public.penghitung_nomor enable row level security;

create table if not exists public.nomor_pendaftaran (
  user_id uuid primary key references auth.users (id) on delete cascade,
  nomor   text not null unique,
  dibuat  timestamptz not null default now()
);
alter table public.nomor_pendaftaran add column if not exists jurusan text;
alter table public.nomor_pendaftaran enable row level security;

-- Bagian bersama: ambil nomor berikutnya di jurusan itu, melompati nomor
-- yang sudah tercatat di database atau ada di daftar p_terpakai.
create or replace function public._nomor_berikut(p_jurusan text, p_terpakai text[] default '{}')
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_jurusan text := upper(trim(coalesce(p_jurusan, '')));
  v_tahun   text := to_char(now() at time zone 'Asia/Jakarta', 'YYYY');
  v_urut    int;
  v_nomor   text;
begin
  if v_jurusan not in ('DKV', 'RPL', 'TITL', 'TKR', 'TSM') then
    raise exception 'Jurusan tidak dikenal: %', p_jurusan;
  end if;

  insert into public.penghitung_nomor (tahun, jurusan) values (v_tahun, v_jurusan)
  on conflict do nothing;

  loop
    -- UPDATE mengunci baris penghitung sampai transaksi selesai
    update public.penghitung_nomor
       set berikut = berikut + 1
     where tahun = v_tahun and jurusan = v_jurusan
    returning berikut into v_urut;          -- nomor pertama = 001

    if v_urut > 999 then
      raise exception 'PENUH: kuota nomor % habis', v_jurusan;
    end if;

    v_nomor := 'SPMB-' || v_tahun || '-' || v_jurusan || '-' || lpad(v_urut::text, 3, '0');
    exit when not (v_nomor = any (coalesce(p_terpakai, '{}')))
          and not exists (select 1 from public.nomor_pendaftaran where nomor = v_nomor);
  end loop;
  return v_nomor;
end;
$$;
revoke all on function public._nomor_berikut(text, text[]) from public, anon, authenticated;

-- Dipanggil formulir (akun siswa yang sedang mendaftar)
create or replace function public.ambil_no_pendaftaran(p_jurusan text, p_lewati text default null)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_jurusan text := upper(trim(coalesce(p_jurusan, '')));
  v_lama_nomor   text;
  v_lama_jurusan text;
  v_nomor        text;
begin
  if auth.uid() is null then
    raise exception 'Harus masuk dengan akun siswa';
  end if;

  -- sudah punya nomor? (kiriman ulang)
  select nomor, jurusan into v_lama_nomor, v_lama_jurusan
  from public.nomor_pendaftaran where user_id = auth.uid();
  if v_lama_nomor is not null then
    if v_lama_jurusan = v_jurusan and v_lama_nomor is distinct from p_lewati
       and v_lama_nomor ~ ('^SPMB-[0-9]{4}-' || v_jurusan || '-[0-9]{3}$') then
      return v_lama_nomor;
    end if;
    -- ganti jurusan, nomor format lama, atau nomornya ternyata sudah dipakai orang lain di sheet
    delete from public.nomor_pendaftaran where user_id = auth.uid();
  end if;

  v_nomor := public._nomor_berikut(v_jurusan, array_remove(array[p_lewati], null));
  insert into public.nomor_pendaftaran (user_id, nomor, jurusan)
  values (auth.uid(), v_nomor, v_jurusan);
  return v_nomor;
end;
$$;
revoke all on function public.ambil_no_pendaftaran(text, text) from public, anon;
grant execute on function public.ambil_no_pendaftaran(text, text) to authenticated;

-- Dipanggil petugas dari Dashboard: nomor pengganti untuk pendaftar yang nomornya dobel.
-- p_terpakai = semua nomor yang sudah ada di Google Sheets (agar tidak bentrok lagi).
create or replace function public.ganti_no_pendaftaran(p_nisn text, p_jurusan text, p_terpakai text[])
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user  uuid;
  v_nomor text;
begin
  if not exists (
    select 1 from public.profiles
    where id = auth.uid() and role::text in ('superadmin', 'verifikasi')
  ) then
    raise exception 'Hanya superadmin atau petugas verifikasi yang boleh mengganti nomor';
  end if;

  v_nomor := public._nomor_berikut(p_jurusan, p_terpakai);

  -- catat juga di akun siswa (bila akunnya ada) agar kiriman ulang memakai nomor baru
  select id into v_user from auth.users
  -- NISN 10 angka; di sheet nol di depan bisa hilang → dikembalikan dulu
  where email = lpad(regexp_replace(coalesce(p_nisn, ''), '\D', '', 'g'), 10, '0') || '@siswa.spmb.local'
  limit 1;
  if v_user is not null then
    delete from public.nomor_pendaftaran where user_id = v_user;
    insert into public.nomor_pendaftaran (user_id, nomor, jurusan)
    values (v_user, v_nomor, upper(trim(p_jurusan)));
  end if;
  return v_nomor;
end;
$$;
revoke all on function public.ganti_no_pendaftaran(text, text, text[]) from public, anon;
grant execute on function public.ganti_no_pendaftaran(text, text, text[]) to authenticated;

-- Cek sisa kuota tiap jurusan:
-- select jurusan, berikut as terpakai, 999 - berikut as sisa from public.penghitung_nomor order by jurusan;
-- Daftar nomor yang sudah dibagikan:
-- select nomor, jurusan, dibuat from public.nomor_pendaftaran order by nomor;
