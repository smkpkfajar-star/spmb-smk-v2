# SPMB SMK Tamansiswa Jetis

Situs pendaftaran siswa baru online. HTML statis + Tailwind (CDN), tanpa proses build.
Data pendaftar di Google Sheets (lewat Sheetson), akun & berkas di Supabase.
Terpasang otomatis di Vercel setiap ada push ke `main`.

## Peta folder

```
index.html            Beranda (info jurusan, alur, FAQ, login siswa)
daftar/index.html     Formulir pendaftaran
siswa/index.html      Cek status pendaftaran siswa
admin/                Panel panitia (dashboard.html = semua modul;
                      file .html lain hanya pengalih untuk bookmark lama)

assets/css/style.css  Gaya tambahan di luar Tailwind
assets/js/
  umum/               Dipakai semua halaman
    app-config.js       ← SATU-SATUNYA tempat alamat & kunci layanan
    tailwind-config.js  ← warna, huruf, sudut (tema situs)
    tema.js             ← mode terang/gelap (ikut setelan HP, tombol bulan/matahari)
    sheetson.js         ← baca/tulis Google Sheets
  beranda/            main.js (menu & navigasi), jurusan.js (penjelajah jurusan & animasi hero)
  daftar/             daftar.js (formulir, nomor, unggah, PDF bukti),
                      form-steps.js (langkah formulir), kiosk.js ("Mode Teras" untuk komputer pendaftaran di sekolah)
  siswa/              siswa.js (halaman cek status)
  admin/              auth.js (login petugas), ui.js (tabel, filter, halaman),
                      modules.js (isi tiap modul: verifikasi, keuangan, tes fisik, superadmin)

supabase/             Skrip database — lihat supabase/README.md
tests/                Tes otomatis
docs/                 design.md (panduan gaya) + catatan desain & rencana kerja
```

## Mau mengubah apa? Buka file ini

| Ingin mengubah… | File |
|---|---|
| Kunci Sheetson / alamat Supabase | `assets/js/umum/app-config.js` |
| Warna situs (terang & gelap) | `assets/css/style.css` — bagian `:root` (terang) dan `html.dark` (gelap) |
| Huruf, sudut, nama warna Tailwind | `assets/js/umum/tailwind-config.js` |
| Cara kerja mode gelap (tombol, ingatan) | `assets/js/umum/tema.js` |
| Teks penjelasan jurusan | `assets/js/beranda/jurusan.js` (atau `index.html`) |
| Isian formulir pendaftaran | `daftar/index.html` + `assets/js/daftar/daftar.js` |
| Isi PDF bukti pendaftaran | `buildPdfContent` di `assets/js/daftar/daftar.js` |
| Kolom tabel admin, status, tombol | `assets/js/admin/modules.js` |
| Tampilan tabel/filter admin (semua modul) | `assets/js/admin/ui.js` |
| Nomor WhatsApp panitia | cari `628823212784` (tes memastikan semuanya sama) |

## Menjalankan di komputer sendiri

```bash
python -m http.server 8765     # lalu buka http://127.0.0.1:8765
npm test                       # tes otomatis (butuh Node.js 20+)
```

Jalankan `npm test` sebelum push. Tes juga memeriksa bahwa setiap file
`.js`/`.css` yang dimuat halaman benar-benar ada — berguna setelah memindah file.

## Sebelum pendaftaran resmi dibuka

1. Hapus baris TES di keempat sheet Google (Data_Pendaftar, Verifikasi_Berkas,
   Keuangan_Voucher, Tes_Fisik_Seragam).
2. Jalankan `supabase/perawatan/hapus-data-tes.sql` — nomor kembali mulai 000.
3. Ganti password superadmin.
