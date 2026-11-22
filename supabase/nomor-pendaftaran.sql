-- ============================================================
-- Nomor pendaftaran urut & dijamin tidak pernah sama
-- Hasil: SPMB-2026-0001, SPMB-2026-0002, ...
--
-- Cara kerja:
--  * Urutan (sequence) Postgres memberi angka berikutnya secara atomik:
--    dua orang yang mendaftar di detik yang sama tetap dapat angka berbeda.
--  * Kolom "nomor" UNIK: database menolak nomor kembar.
--  * Satu akun siswa = satu nomor. Bila siswa mengirim ulang setelah gagal
--    di tengah jalan, ia mendapat nomor yang sama (tidak membuang nomor).
--
-- Jalankan sekali di Supabase → SQL Editor → New query → Run.
-- Aman dijalankan ulang.
-- ============================================================

create sequence if not exists public.no_pendaftaran_seq start 1;

create table if not exists public.nomor_pendaftaran (
  user_id uuid primary key references auth.users (id) on delete cascade,
  nomor   text not null unique,
  dibuat  timestamptz not null default now()
);

-- Tabel hanya bisa diisi lewat fungsi di bawah (tanpa policy = tertutup untuk umum)
alter table public.nomor_pendaftaran enable row level security;

create or replace function public.ambil_no_pendaftaran()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_nomor text;
begin
  if auth.uid() is null then
    raise exception 'Harus masuk dengan akun siswa';
  end if;

  select nomor into v_nomor from public.nomor_pendaftaran where user_id = auth.uid();
  if v_nomor is not null then
    return v_nomor;
  end if;

  v_nomor := 'SPMB-' || to_char(now() at time zone 'Asia/Jakarta', 'YYYY') || '-'
             || lpad(nextval('public.no_pendaftaran_seq')::text, 4, '0');

  insert into public.nomor_pendaftaran (user_id, nomor)
  values (auth.uid(), v_nomor)
  on conflict (user_id) do nothing;

  select nomor into v_nomor from public.nomor_pendaftaran where user_id = auth.uid();
  return v_nomor;
end;
$$;

revoke all on function public.ambil_no_pendaftaran() from public, anon;
grant execute on function public.ambil_no_pendaftaran() to authenticated;

-- Cek: daftar nomor yang sudah dibagikan
-- select nomor, dibuat from public.nomor_pendaftaran order by dibuat desc;
