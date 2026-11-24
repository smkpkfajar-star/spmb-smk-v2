-- ============================================================
-- Kuota dihitung dari siswa yang sudah DITERIMA (data spreadsheet)
--
--   Sisa kursi = kuota − jumlah siswa berstatus "Diterima" di sheet Verifikasi_Berkas
--   (jurusan diambil dari Data_Pendaftar). Sebelumnya dihitung dari jumlah nomor pendaftaran.
--
-- Cara kerja:
--  * Spreadsheet tidak dibaca langsung oleh pengunjung (berat & memakai jatah Sheetson).
--    Sebagai gantinya, panel admin menghitung jumlah Diterima per jurusan lalu menyimpannya ke
--    baris pengaturan diterima_dkv / _rpl / _titl / _tkr / _tsm lewat fungsi perbarui_diterima().
--    Itu terjadi otomatis saat petugas verifikasi / superadmin membuka Dashboard atau modul
--    Verifikasi, dan setiap kali status pendaftaran diubah.
--  * Bila jumlah Diterima sudah sama dengan kuota, pendaftar baru di jurusan itu ditolak database
--    ("PENUH") dan formulir menandai jurusan itu penuh.
--  * Angkanya hanya sesegar terakhir kali petugas verifikasi/superadmin memuat panel admin.
--
-- Jalankan SESUDAH 06-pengaturan-tambahan.sql. Supabase → SQL Editor → New query → Run. Aman diulang.
-- ============================================================

insert into public.pengaturan (kunci, nilai, angka) values
  ('diterima_dkv',  true, 0),
  ('diterima_rpl',  true, 0),
  ('diterima_titl', true, 0),
  ('diterima_tkr',  true, 0),
  ('diterima_tsm',  true, 0)
on conflict (kunci) do nothing;

-- Dipanggil panel admin: p_hitung = {"DKV":3,"RPL":5,"TITL":0,"TKR":2,"TSM":1}
create or replace function public.perbarui_diterima(p_hitung jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  j text;
  n int;
begin
  if not exists (
    select 1 from public.profiles
    where id = auth.uid() and role::text in ('superadmin', 'verifikasi')
  ) then
    raise exception 'Hanya superadmin atau petugas verifikasi yang boleh memperbarui jumlah diterima';
  end if;

  foreach j in array array['DKV', 'RPL', 'TITL', 'TKR', 'TSM'] loop
    n := coalesce((p_hitung ->> j)::int, 0);
    if n < 0 or n > 999 then
      raise exception 'Jumlah diterima % tidak wajar: %', j, n;
    end if;
    insert into public.pengaturan (kunci, nilai, angka, diubah, diubah_oleh)
    values ('diterima_' || lower(j), true, n, now(), auth.uid())
    on conflict (kunci) do update
      set angka = excluded.angka, diubah = now(), diubah_oleh = auth.uid();
  end loop;
end;
$$;
revoke all on function public.perbarui_diterima(jsonb) from public, anon;
grant execute on function public.perbarui_diterima(jsonb) to authenticated;

-- Nomor berikutnya: kuota diperiksa terhadap jumlah DITERIMA (bukan jumlah nomor)
create or replace function public._nomor_berikut(p_jurusan text, p_terpakai text[] default '{}', p_cek_kuota boolean default false)
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
  v_kuota   int;
  v_terisi  int;
begin
  if v_jurusan not in ('DKV', 'RPL', 'TITL', 'TKR', 'TSM') then
    raise exception 'Jurusan tidak dikenal: %', p_jurusan;
  end if;

  insert into public.penghitung_nomor (tahun, jurusan) values (v_tahun, v_jurusan)
  on conflict do nothing;

  if p_cek_kuota then
    perform 1 from public.penghitung_nomor where tahun = v_tahun and jurusan = v_jurusan for update;
    select angka into v_kuota from public.pengaturan where kunci = 'kuota_' || lower(v_jurusan);
    if v_kuota is not null then
      select coalesce(angka, 0) into v_terisi from public.pengaturan where kunci = 'diterima_' || lower(v_jurusan);
      if coalesce(v_terisi, 0) >= v_kuota then
        raise exception 'PENUH: kuota jurusan % sudah penuh', v_jurusan;
      end if;
    end if;
  end if;

  loop
    update public.penghitung_nomor
       set berikut = berikut + 1
     where tahun = v_tahun and jurusan = v_jurusan
    returning berikut into v_urut;

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
revoke all on function public._nomor_berikut(text, text[], boolean) from public, anon, authenticated;

-- Sisa kuota untuk formulir & beranda (publik): "terisi" = jumlah siswa Diterima
create or replace function public.sisa_kuota()
returns table (jurusan text, kuota integer, terisi integer)
language sql
stable
security definer
set search_path = public
as $$
  select upper(substr(p.kunci, 7)) as jurusan,
         p.angka as kuota,
         coalesce((select d.angka from public.pengaturan d where d.kunci = 'diterima_' || substr(p.kunci, 7)), 0)::int as terisi
  from public.pengaturan p
  where p.kunci like 'kuota\_%' and p.angka is not null;
$$;
revoke all on function public.sisa_kuota() from public;
grant execute on function public.sisa_kuota() to anon, authenticated;

-- Cek sekarang:
-- select kunci, angka, diubah from public.pengaturan where kunci like 'diterima\_%' order by kunci;
-- select * from public.sisa_kuota();
