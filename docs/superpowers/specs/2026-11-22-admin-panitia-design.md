# Halaman Admin Panitia & Lengkapi Berkas Siswa

Tanggal: 2026-11-22 · Cakupan: folder `admin/` (baru) dan `siswa/` (baru).

## Tujuan dan alasannya
Panitia (banyak yang tidak paham IT) mengelola pendaftar: memverifikasi berkas, mencatat
pembayaran, mengisi tes fisik & seragam, dan melihat rekap. Siswa yang ijazah/SKL-nya
menyusul bisa login dan mengunggah berkas sendiri.

**Target**
- Setiap petugas login dengan akunnya sendiri dan hanya melihat modul tugasnya.
- Mengubah data cukup dengan klik dan isian yang jelas (bukan `prompt()`).
- Data tetap di Google Sheets yang sama, sehingga panitia tetap bisa membuka spreadsheet.
- Siswa bisa login (NISN + password) dan menambah berkas.

**Bukan target**
- Memindahkan data dari Google Sheets (pemilik memilih tetap Sheets, cara C).
- Menyembunyikan API key Sheetson. Risikonya diterima pemilik: orang yang paham teknis
  tetap bisa membaca/mengubah sheet.

**Dianggap gagal walaupun tampilannya bagus**
- Password petugas kembali tertulis di file yang bisa dibaca publik (seperti `auth.js` lama).
- Petugas melihat data lama karena cache Sheetson (4 jam).
- Mengubah satu siswa ikut mengubah baris siswa lain.

## Pendekatan
| Pilihan | Keputusan |
|---|---|
| A. Data pindah ke Supabase | Ditolak pemilik (panitia perlu Google Sheets) |
| B. Sheets lewat Apps Script | Ditolak pemilik |
| **C. Sheets via Sheetson (dipilih)** | Login petugas & siswa lewat Supabase Auth |

## Akun & peran
- Login petugas: **username** → `username@petugas.spmb.local` di Supabase Auth.
  Login siswa: NISN → `NISN@siswa.spmb.local` (sudah dipakai form daftar).
- Peran dari `public.profiles.role` (enum `public.user_role`). Ditambahkan nilai:
  `superadmin`, `verifikasi`, `keuangan`, `tes_fisik` (nilai `pendaftar` sudah ada).
- Akses modul: verifikasi → Verifikasi Berkas; keuangan → Keuangan; tes_fisik → Tes Fisik;
  superadmin → semua modul + Superadmin. `pendaftar` ditolak dari `admin/`.
- RLS `profiles`: setiap akun boleh membaca profilnya sendiri; superadmin boleh membaca
  semua dan mengubah `role` (lewat fungsi `public.is_superadmin()` security definer).
- Superadmin pertama: dibuat pemilik di dashboard Supabase (Authentication → Add user,
  "Auto Confirm"), lalu satu SQL mengubah perannya menjadi `superadmin`. Petugas lain
  ditambahkan dari halaman Superadmin (signUp + ubah role).
- Reset password (siswa/petugas) oleh superadmin: fungsi SQL `public.reset_password(email,
  password_baru)` security definer yang hanya bisa dipanggil superadmin. **Belum pasti
  diizinkan Supabase** (hak atas `auth.users`); bila ditolak, reset dilakukan dari dashboard
  Supabase dan halaman menampilkan petunjuknya.

## Halaman
Gaya sama dengan form daftar (krem/hijau, kontras tinggi, garis 2px), `noindex`.
Desktop: tabel. HP: kartu per siswa. Semua daftar punya pencarian (nama / NISN / no.
pendaftaran), filter status, tombol "Muat ulang", dan jumlah baris.

| Halaman | Isi |
|---|---|
| `admin/index.html` | Login petugas (username + password). Sudah login → dashboard |
| `admin/dashboard.html` | Sapaan + kartu modul sesuai peran + Keluar |
| `admin/verifikasi.html` | Sheet `Verifikasi_Berkas`. Panel ubah: buka berkas (semua link), `statusBerkas` (Belum Unggah / Sudah Unggah / Gagal Unggah / Berkas Terverifikasi / Berkas Ditolak), `statusPendaftaran` (Pending / Diverifikasi / Diterima / Ditolak), `catatanAdmin`. Tombol "Chat Ortu via WhatsApp" (wa.me ke `waOrtu`) yang juga mengisi `tglFollowUpWa` |
| `admin/keuangan.html` | Sheet `Keuangan_Voucher`. Ubah: `statusVoucher` (Tidak Ada / Pending / Valid / Tidak Valid), `potonganBiaya` (angka), `statusBiayaDaftar` (Belum Bayar / Lunas), `metodePembayaran` (- / Tunai / Transfer), `catatanBendahara` |
| `admin/tes-fisik.html` | Sheet `Tes_Fisik_Seragam`. Ubah: `tinggiBadan`, `beratBadan` (angka), `tatoTindik` (- / Tidak Ada / Ada), `statusTesFisik` (Belum Tes / Lulus Tes / Tidak Lulus), `ukuranSeragam` (- / S / M / L / XL / XXL), `catatanTesFisik`; `tglUkurSeragam` terisi otomatis tanggal hari ini saat ukuran diisi |
| `admin/superadmin.html` | Rekap (total, per jurusan, per status pendaftaran, lunas/belum); **Unduh CSV** tiap sheet (UTF-8 + BOM agar rapi di Excel); kelola petugas (daftar, tambah, ubah peran); reset password |
| `siswa/index.html` | Login siswa (NISN + password) → status pendaftaran, daftar berkas, unggah berkas baru (PDF/JPG/PNG, ≤ 5 MB) ke `siswa/<id-akun>/`; baris `Verifikasi_Berkas` diperbarui: `namaBerkas` & `urlBerkas` ditambah (dipisah baris baru), `statusBerkas` = Sudah Unggah |

Panel ubah = dialog besar (bukan `prompt()`), tombol Simpan/Batal, pesan berhasil/gagal.
Simpan memakai `PATCH /v2/sheets/<Sheet>/<rowIndex>` hanya untuk kolom yang diubah.

## Kode bersama
- `assets/js/umum/app-config.js` — satu-satunya tempat konfigurasi Sheetson & Supabase
  (dipakai juga oleh `daftar.js`). `assets/js/config.js` lama dihapus.
- `assets/js/umum/sheetson.js` — `getRows(sheet)` (semua halaman, penanda waktu anti-cache),
  `patchRow(sheet, rowIndex, data)`.
- `assets/js/admin/auth.js` — login/logout petugas, ambil peran, `requireRole([...])`.
- `assets/js/admin/ui.js` — tabel/kartu, pencarian, filter, dialog, toast.
- `assets/js/auth.js` lama (password tertulis) dihapus.

## Pengaturan Supabase oleh pemilik (satu file SQL + satu langkah dashboard)
1. SQL: tambah nilai enum, `is_superadmin()`, RLS `profiles`, `reset_password()`.
2. Dashboard: buat user `superadmin@petugas.spmb.local` (Auto Confirm), lalu SQL
   `update profiles set role = 'superadmin'` untuk email itu.

## Diserahkan ke pembangun
Susunan tepat tabel/kartu, urutan kolom, teks bantuan, ikon.

## Diputuskan sendiri oleh Claude (silakan koreksi)
- Nama nilai status mengikuti halaman admin lama dan `daftar.js`, ditambah "Berkas Ditolak",
  "Tidak Valid", "Tidak Lulus".
- Berkas tambahan disimpan sebagai baris baru di sel yang sama (tidak menambah kolom sheet).
- Halaman admin memakai tema biasa (bukan kiosk).
