-- Hapus akun tes siswa (tidak menyentuh akun lain).
-- Tambahkan email NISN tes baru ke kedua daftar di bawah bila perlu.
delete from public.profiles where email in ('9999000092@siswa.spmb.local', '9999000093@siswa.spmb.local', '9999000097@siswa.spmb.local', '9999000101@siswa.spmb.local', '9999000102@siswa.spmb.local', '9999000103@siswa.spmb.local', '9999000104@siswa.spmb.local', '9999000105@siswa.spmb.local', '9999000106@siswa.spmb.local', '9999000107@siswa.spmb.local', '9999000108@siswa.spmb.local', '9999000109@siswa.spmb.local', '9999000110@siswa.spmb.local', '9999000111@siswa.spmb.local', '9999000112@siswa.spmb.local', '9999000113@siswa.spmb.local', '9999000114@siswa.spmb.local', '9999000115@siswa.spmb.local', '9999000116@siswa.spmb.local', '9999000117@siswa.spmb.local', '9999000118@siswa.spmb.local', '9999000119@siswa.spmb.local', '9999000120@siswa.spmb.local', '9999000121@siswa.spmb.local', '9999000122@siswa.spmb.local', '9999000123@siswa.spmb.local', '9999000124@siswa.spmb.local', '9999000125@siswa.spmb.local', '9999000126@siswa.spmb.local', '9999000127@siswa.spmb.local', '9999000128@siswa.spmb.local', '9999000129@siswa.spmb.local', '1234567890@siswa.spmb.local', '9999000130@siswa.spmb.local', '9999000131@siswa.spmb.local', '9999000132@siswa.spmb.local', '9999000133@siswa.spmb.local', '9999000134@siswa.spmb.local');
delete from auth.users where email in ('9999000092@siswa.spmb.local', '9999000093@siswa.spmb.local', '9999000097@siswa.spmb.local', '9999000101@siswa.spmb.local', '9999000102@siswa.spmb.local', '9999000103@siswa.spmb.local', '9999000104@siswa.spmb.local', '9999000105@siswa.spmb.local', '9999000106@siswa.spmb.local', '9999000107@siswa.spmb.local', '9999000108@siswa.spmb.local', '9999000109@siswa.spmb.local', '9999000110@siswa.spmb.local', '9999000111@siswa.spmb.local', '9999000112@siswa.spmb.local', '9999000113@siswa.spmb.local', '9999000114@siswa.spmb.local', '9999000115@siswa.spmb.local', '9999000116@siswa.spmb.local', '9999000117@siswa.spmb.local', '9999000118@siswa.spmb.local', '9999000119@siswa.spmb.local', '9999000120@siswa.spmb.local', '9999000121@siswa.spmb.local', '9999000122@siswa.spmb.local', '9999000123@siswa.spmb.local', '9999000124@siswa.spmb.local', '9999000125@siswa.spmb.local', '9999000126@siswa.spmb.local', '9999000127@siswa.spmb.local', '9999000128@siswa.spmb.local', '9999000129@siswa.spmb.local', '1234567890@siswa.spmb.local', '9999000130@siswa.spmb.local', '9999000131@siswa.spmb.local', '9999000132@siswa.spmb.local', '9999000133@siswa.spmb.local', '9999000134@siswa.spmb.local');

-- Kembalikan nomor pendaftaran ke awal (SPMB-tahun-DKV-001, RPL-001, TITL-001, TKR-001, TSM-001).
-- Hapus dulu SEMUA baris TES di keempat sheet, baru jalankan skrip ini.
-- DIKUNCI: bila sudah ada satu saja akun siswa asli (NISN bukan 99990…), penghitung
-- TIDAK dikembalikan — agar nomor pendaftar asli tidak pernah terbagi dua kali.
do $$
begin
  if exists (
    select 1 from auth.users
    where email like '%@siswa.spmb.local' and email not like '99990%'
  ) then
    raise exception 'DIBATALKAN: sudah ada pendaftar asli. Penghitung nomor tidak boleh dikembalikan ke awal.';
  end if;
  delete from public.nomor_pendaftaran;
  delete from public.penghitung_nomor;
  raise notice 'Penghitung nomor dikembalikan ke awal.';
end $$;

-- Cek: daftar akun yang tersisa
select email, created_at from auth.users order by created_at;
