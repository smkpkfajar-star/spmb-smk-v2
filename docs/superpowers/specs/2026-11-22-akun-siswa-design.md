# Akun Siswa saat Pendaftaran (Supabase Auth)

Tanggal: 2026-11-22 · Status: disetujui pemilik ("pakai A", "lanjut")

## Tujuan
Siswa membuat password saat mendaftar, agar nanti bisa login (NISN + password) untuk
melengkapi berkas. Password **tidak boleh** disimpan di spreadsheet, karena API key Sheetson
terbuka di browser sehingga seluruh sheet bisa dibaca siapa pun.

## Pendekatan
| Pilihan | Catatan |
|---|---|
| **A. Supabase Auth (dipilih)** | Password di-hash oleh Supabase; sheet tidak menyimpan password |
| B. Hash password di sheet | Sheet tetap terbaca publik, login di browser bisa dilewati |
| C. Tanpa password (NISN + no. daftar + tgl lahir) | Mudah ditebak |

## Rancangan
- Langkah 4 form: "Password" + "Ulangi password" (min. 8 karakter, harus sama, tombol Lihat).
- Login = `<NISN>@siswa.spmb.local` (alamat buatan, tidak pernah dikirimi email).
- Urutan kirim: cek NISN di sheet → buat akun (`signUp`) → unggah berkas ke
  `berkas-spmb/siswa/<id-akun>/` → simpan 4 sheet (tanpa password) → catat
  `no_pendaftaran` di metadata akun → logout.
- NISN sudah punya akun: password salah → ditolak; password benar dan akun belum punya
  `no_pendaftaran` → kiriman ulang dilanjutkan; sudah punya `no_pendaftaran` → ditolak.
- Kartu sukses memberi tahu cara login nanti.
- Halaman "Lengkapi Berkas" (login) dibuat nanti bersama halaman admin.

## Pengaturan Supabase (sudah dijalankan pemilik)
- `handle_new_user` diperbaiki (`public.user_role`, `search_path = ''`, tidak menggagalkan
  pembuatan akun) dan role akun baru selalu `pendaftar` (tidak dari metadata browser).
- Email provider aktif, "Confirm email" mati.
- Policy storage: `authenticated` boleh INSERT dan SELECT hanya di `siswa/<auth.uid()>/`.

## Temuan saat pengerjaan
- Jawaban Sheetson di-cache 4 jam (`cache-control: max-age=14400`, Cloudflare HIT).
  Semua GET ke Sheetson wajib memakai penanda waktu (`&_=<timestamp>`) + `cache: "no-store"`.
  Ini juga berlaku untuk halaman admin nanti.
- Pencarian NISN: filter `where` (teks lalu angka), lalu pindai semua halaman sebagai cadangan.
