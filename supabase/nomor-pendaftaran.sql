-- ============================================================
-- Nomor pendaftaran berkode jurusan & dijamin tidak pernah sama
--
--   DKV  → SPMB-2026-000 … 099
--   RPL  → SPMB-2026-100 … 199
--   TKR  → SPMB-2026-200 … 299
--   TSM  → SPMB-2026-300 … 399
--   TITL → SPMB-2026-400 … 499
--
-- Cara kerja:
--  * Tiap jurusan punya penghitung sendiri per tahun. Baris penghitung dikunci
--    saat dipakai, jadi dua orang yang mendaftar di detik yang sama tetap
--    mendapat nomor berbeda.
--  * Kolom "nomor" UNIK: database menolak nomor kembar.
--  * Satu akun siswa = satu nomor. Kirim ulang setelah gagal di tengah jalan
--    (jurusan sama) mendapat nomor yang sama.
--  * Bila 100 nomor satu jurusan habis, pendaftar diberi pesan "kuota penuh".
--
-- Jalankan sekali di Supabase → SQL Editor → New query → Run.
-- Aman dijalankan ulang (juga bila versi sebelumnya sudah pernah dijalankan).
-- ============================================================

-- versi lama (nomor urut tanpa kode jurusan) tidak dipakai lagi
drop function if exists public.ambil_no_pendaftaran();
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

create or replace function public.ambil_no_pendaftaran(p_jurusan text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_jurusan text := upper(trim(coalesce(p_jurusan, '')));
  v_blok    int;
  v_tahun   text := to_char(now() at time zone 'Asia/Jakarta', 'YYYY');
  v_urut    int;
  v_nomor   text;
  v_lama_nomor   text;
  v_lama_jurusan text;
begin
  if auth.uid() is null then
    raise exception 'Harus masuk dengan akun siswa';
  end if;

  v_blok := case v_jurusan
    when 'DKV' then 0 when 'RPL' then 1 when 'TKR' then 2 when 'TSM' then 3 when 'TITL' then 4
  end;
  if v_blok is null then
    raise exception 'Jurusan tidak dikenal: %', p_jurusan;
  end if;

  -- sudah punya nomor? (kiriman ulang)
  select nomor, jurusan into v_lama_nomor, v_lama_jurusan
  from public.nomor_pendaftaran where user_id = auth.uid();
  if v_lama_nomor is not null then
    if v_lama_jurusan = v_jurusan then
      return v_lama_nomor;
    end if;
    -- pendaftar mengganti jurusan sebelum pendaftarannya selesai
    delete from public.nomor_pendaftaran where user_id = auth.uid();
  end if;

  insert into public.penghitung_nomor (tahun, jurusan) values (v_tahun, v_jurusan)
  on conflict do nothing;

  -- UPDATE mengunci baris penghitung sampai transaksi selesai
  update public.penghitung_nomor
     set berikut = berikut + 1
   where tahun = v_tahun and jurusan = v_jurusan
  returning berikut - 1 into v_urut;

  if v_urut > 99 then
    raise exception 'PENUH: kuota nomor % habis', v_jurusan;
  end if;

  v_nomor := 'SPMB-' || v_tahun || '-' || lpad((v_blok * 100 + v_urut)::text, 3, '0');

  insert into public.nomor_pendaftaran (user_id, nomor, jurusan)
  values (auth.uid(), v_nomor, v_jurusan);

  return v_nomor;
end;
$$;

revoke all on function public.ambil_no_pendaftaran(text) from public, anon;
grant execute on function public.ambil_no_pendaftaran(text) to authenticated;

-- Cek sisa kuota tiap jurusan:
-- select jurusan, berikut as terpakai, 100 - berikut as sisa from public.penghitung_nomor order by jurusan;
-- Daftar nomor yang sudah dibagikan:
-- select nomor, jurusan, dibuat from public.nomor_pendaftaran order by nomor;
