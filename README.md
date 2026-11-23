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
| Logo & ikon tab browser | `assets/img/logo.svg` (sumber), PNG ukuran lain + `favicon.ico` di folder utama dibuat dari SVG itu |
| Teks penjelasan jurusan | `assets/js/beranda/jurusan.js` (atau `index.html`) |
| Isian formulir pendaftaran | `daftar/index.html` + `assets/js/daftar/daftar.js` |
| PDF bukti pendaftaran (kertas F4, kop surat, pernyataan, tanda tangan) — dipakai formulir, halaman siswa & tombol "Bukti PDF" admin | `assets/js/umum/bukti-pdf.js` |
| Kop surat PDF bukti (ganti file ini, nama tetap, untuk mengganti kop) | `assets/template/template-pendaftaran-spmb-online.pdf` |
| Saklar situs (SPMB dibuka/ditutup, pop-up promo) — diubah superadmin di panel *Superadmin → Pengaturan situs*; tabel dibuat oleh `supabase/03-pengaturan.sql` | `assets/js/umum/pengaturan.js` |
| Riwayat aktivitas petugas (hanya superadmin) — dicatat lewat `AdminAuth.catat(...)`; tabel dibuat oleh `supabase/04-riwayat.sql`. Jangan pernah mencatat password. | `assets/js/admin/auth.js`, *Superadmin → Riwayat aktivitas* |
| Gambar pop-up promo beranda (ubah `docs/desain/promo-tiket.html`, render ulang dengan `node docs/desain/render-tiket.mjs docs/desain/promo-tiket.html assets/img/promo-tiket.png <folder-profil-chrome>`) | `assets/img/promo-tiket.png` |
| Unggah berkas: satu tombol → pop-up "Ambil foto" (kamera HP / webcam) atau "Pilih berkas"; foto dikecilkan maks. 2000 px | `assets/js/umum/pilih-berkas.js` |
| Kolom tabel admin, status, tombol | `assets/js/admin/modules.js` |
| Tampilan tabel/filter admin (semua modul) | `assets/js/admin/ui.js` |
| Kolom laporan Ekspor Excel/PDF | `ekspor: [...]` tiap modul di `assets/js/admin/modules.js` (kolom umum: `KOLOM_EKSPOR_UMUM` di `ui.js`) |
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
