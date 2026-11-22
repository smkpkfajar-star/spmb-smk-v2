# Gaya RPL (design.md) + Panel Admin Standar

Tanggal: 2026-11-22 · Status: disetujui pemilik ("ya kerjakan")
Referensi: `design.md` (ekstraksi `rpl.tamsis.site`) dan tangkapan layar situs tersebut.

## Tujuan
Situs SPMB senada dengan situs jurusan RPL sekolah, tanpa mengorbankan keterbacaan untuk
orang awam dan pemakaian di teras. Halaman admin berbentuk panel admin standar.

## Publik (beranda, daftar & cek status, siswa)
- Kanvas putih, teks `#171717`, isi `#525252`/`#666666`, garis `#E5E7EB`, aksen emas `#F2B53A`.
- Font Geist (+ Geist Mono untuk label kecil bergaya kode, mis. `● jurusan/rpl`).
- Bingkai tengah ≤1080px bergaris kiri-kanan; penanda "+" di pertemuan bagian (desktop).
- Hero: latar titik-titik + gradasi radial hijau/emas/biru, judul besar huruf rapat.
- Tombol kapsul hitam (utama) / putih bergaris (kedua). Kartu & kolom isian bersudut tajam.
- Bilah kemajuan form berwarna emas.

## Admin
- Sidebar gelap kiri (menu sesuai peran + Keluar), laci ☰ di HP; topbar judul + petugas.
- Dashboard: kartu angka + 10 pendaftar terbaru. Modul: kartu angka per status, tabel
  dengan urut kolom dan 25 baris per halaman, dialog ubah tetap.

## Penyimpangan dari design.md (keputusan Claude, disebutkan ke pemilik)
- Warna status tetap (merah salah/ditolak, hijau diterima/lunas, emas pending, biru info).
- Garis kolom isian `#737373` 1.5px, bukan `#E5E7EB` 1px; teks keterangan tidak `#BDBDBD`.
- Jarak tepi 16px di HP (bukan 0px). Mode Teras dipertahankan. Tanpa mode gelap.
- Fungsi tidak berubah; semua id dan tes dipertahankan.
