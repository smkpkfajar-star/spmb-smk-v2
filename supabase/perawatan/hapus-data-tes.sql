-- Hapus akun tes siswa (tidak menyentuh akun lain).
-- Tambahkan email NISN tes baru ke kedua daftar di bawah bila perlu.
delete from public.profiles where email in ('9999000092@siswa.spmb.local', '9999000093@siswa.spmb.local', '9999000097@siswa.spmb.local', '9999000101@siswa.spmb.local', '9999000102@siswa.spmb.local', '9999000103@siswa.spmb.local', '9999000104@siswa.spmb.local', '9999000105@siswa.spmb.local', '9999000106@siswa.spmb.local', '9999000107@siswa.spmb.local', '9999000108@siswa.spmb.local', '9999000109@siswa.spmb.local', '9999000110@siswa.spmb.local', '9999000111@siswa.spmb.local', '9999000112@siswa.spmb.local', '9999000113@siswa.spmb.local', '9999000114@siswa.spmb.local', '9999000115@siswa.spmb.local', '9999000116@siswa.spmb.local', '9999000117@siswa.spmb.local', '9999000118@siswa.spmb.local', '9999000119@siswa.spmb.local', '9999000120@siswa.spmb.local', '9999000121@siswa.spmb.local', '9999000122@siswa.spmb.local', '9999000123@siswa.spmb.local', '9999000124@siswa.spmb.local');
delete from auth.users where email in ('9999000092@siswa.spmb.local', '9999000093@siswa.spmb.local', '9999000097@siswa.spmb.local', '9999000101@siswa.spmb.local', '9999000102@siswa.spmb.local', '9999000103@siswa.spmb.local', '9999000104@siswa.spmb.local', '9999000105@siswa.spmb.local', '9999000106@siswa.spmb.local', '9999000107@siswa.spmb.local', '9999000108@siswa.spmb.local', '9999000109@siswa.spmb.local', '9999000110@siswa.spmb.local', '9999000111@siswa.spmb.local', '9999000112@siswa.spmb.local', '9999000113@siswa.spmb.local', '9999000114@siswa.spmb.local', '9999000115@siswa.spmb.local', '9999000116@siswa.spmb.local', '9999000117@siswa.spmb.local', '9999000118@siswa.spmb.local', '9999000119@siswa.spmb.local', '9999000120@siswa.spmb.local', '9999000121@siswa.spmb.local', '9999000122@siswa.spmb.local', '9999000123@siswa.spmb.local', '9999000124@siswa.spmb.local');

-- Kembalikan nomor pendaftaran ke awal (DKV 000, RPL 100, TKR 200, TSM 300, TITL 400).
-- Jalankan HANYA sebelum pendaftaran resmi dibuka, setelah baris TES di sheet dihapus.
delete from public.nomor_pendaftaran;
delete from public.penghitung_nomor;

-- Cek: daftar akun yang tersisa
select email, created_at from auth.users order by created_at;
