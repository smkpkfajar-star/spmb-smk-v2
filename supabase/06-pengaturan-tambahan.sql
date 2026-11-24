-- ============================================================
-- Pengaturan tambahan: kontak panitia, kuota per jurusan, pengumuman hasil, mode perawatan
--
--   kontak_wa        (teks)  : nomor WhatsApp panitia (62812...). Kosong = nomor bawaan.
--   jam_layanan      (teks)  : jam layanan panitia, tampil di footer & halaman daftar.
--   kuota_dkv, kuota_rpl, kuota_titl, kuota_tkr, kuota_tsm (angka) :
--                      batas pendaftar per jurusan tahun ini. Kosong = tanpa batas.
--   hasil_diumumkan  (nilai) : true = siswa bisa melihat Diterima/Ditolak. false = disembunyikan.
--   perawatan        (nilai) : true = situs publik menampilkan "sedang pemeliharaan" dan
--                      pendaftar baru ditolak. Panel admin tetap bisa dipakai.
--   pesan_perawatan  (teks)  : tulisan saat perawatan. Kosong = tulisan bawaan.
--
-- KUOTA dijaga di database: saat siswa meminta nomor pendaftaran, jumlah nomor jurusan itu
-- (tahun ini) dihitung sambil mengunci penghitung jurusan, jadi dua pendaftar di detik yang
-- sama tidak bisa sama-sama menembus batas. Kiriman ulang oleh akun yang sama tidak dihitung
-- dua kali; nomor pengganti dari petugas tidak dibatasi kuota.
--
-- Jalankan SESUDAH 02, 03, dan 05. Supabase → SQL Editor → New query → Run. Aman diulang.
-- ============================================================

alter table public.pengaturan add column if not exists angka integer;
alter table public.pengaturan drop constraint if exists pengaturan_angka_wajar;
alter table public.pengaturan
  add constraint pengaturan_angka_wajar check (angka is null or (angka >= 0 and angka <= 999));

insert into public.pengaturan (kunci, nilai) values
  ('kontak_wa',       true),
  ('jam_layanan',     true),
  ('pesan_perawatan', true),
  ('kuota_dkv',       true),
  ('kuota_rpl',       true),
  ('kuota_titl',      true),
  ('kuota_tkr',       true),
  ('kuota_tsm',       true),
  ('hasil_diumumkan', true),
  ('perawatan',       false)
on conflict (kunci) do nothing;

grant update (nilai, diubah, diubah_oleh, teks, waktu, angka) on public.pengaturan to authenticated;

-- Penjaga pendaftaran: tutup bila saklar mati, di luar jadwal, ATAU sedang perawatan
create or replace function public.cek_spmb_dibuka()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_saklar    boolean;
  v_buka      timestamptz;
  v_tutup     timestamptz;
  v_perawatan boolean;
begin
  select nilai into v_saklar     from public.pengaturan where kunci = 'spmb_dibuka';
  select waktu into v_buka       from public.pengaturan where kunci = 'jadwal_buka';
  select waktu into v_tutup      from public.pengaturan where kunci = 'jadwal_tutup';
  select nilai into v_perawatan  from public.pengaturan where kunci = 'perawatan';

  if coalesce(v_saklar, true)
     and not coalesce(v_perawatan, false)
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

-- Nomor berikutnya (sekarang bisa memeriksa kuota jurusan)
drop function if exists public._nomor_berikut(text, text[]);
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
    -- kunci penghitung jurusan ini dulu, baru hitung → tidak ada dua pendaftar yang lolos bersamaan
    perform 1 from public.penghitung_nomor where tahun = v_tahun and jurusan = v_jurusan for update;
    select angka into v_kuota from public.pengaturan where kunci = 'kuota_' || lower(v_jurusan);
    if v_kuota is not null then
      select count(*) into v_terisi from public.nomor_pendaftaran
      where jurusan = v_jurusan and to_char(dibuat at time zone 'Asia/Jakarta', 'YYYY') = v_tahun;
      if v_terisi >= v_kuota then
        raise exception 'PENUH: kuota jurusan % sudah penuh', v_jurusan;
      end if;
    end if;
  end if;

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
revoke all on function public._nomor_berikut(text, text[], boolean) from public, anon, authenticated;

-- Dipanggil formulir (akun siswa yang sedang mendaftar); sama seperti 02, hanya memeriksa kuota
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

  v_nomor := public._nomor_berikut(v_jurusan, array_remove(array[p_lewati], null), true);
  insert into public.nomor_pendaftaran (user_id, nomor, jurusan)
  values (auth.uid(), v_nomor, v_jurusan);
  return v_nomor;
end;
$$;
revoke all on function public.ambil_no_pendaftaran(text, text) from public, anon;
grant execute on function public.ambil_no_pendaftaran(text, text) to authenticated;

-- Sisa kuota untuk formulir (publik): hanya jurusan yang diberi batas
create or replace function public.sisa_kuota()
returns table (jurusan text, kuota integer, terisi integer)
language sql
stable
security definer
set search_path = public
as $$
  select upper(substr(p.kunci, 7)) as jurusan,
         p.angka as kuota,
         (select count(*)::int from public.nomor_pendaftaran n
           where n.jurusan = upper(substr(p.kunci, 7))
             and to_char(n.dibuat at time zone 'Asia/Jakarta', 'YYYY') = to_char(now() at time zone 'Asia/Jakarta', 'YYYY')) as terisi
  from public.pengaturan p
  where p.kunci like 'kuota\_%' and p.angka is not null;
$$;
revoke all on function public.sisa_kuota() from public;
grant execute on function public.sisa_kuota() to anon, authenticated;

-- Cek sekarang:
-- select kunci, nilai, teks, waktu, angka from public.pengaturan order by kunci;
-- select * from public.sisa_kuota();
