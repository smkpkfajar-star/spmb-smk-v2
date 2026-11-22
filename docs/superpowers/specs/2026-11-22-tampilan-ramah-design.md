# Desain Ulang Tampilan SPMB: "Hangat & Ramah"

Tanggal: 2026-11-22
Cakupan: `index.html` (beranda) dan `daftar/index.html` (form pendaftaran + cek status).
Halaman admin di luar cakupan; nanti dibuat baru dengan gaya yang sama.

## Tujuan dan alasannya

Calon siswa SMP dan orang tuanya, kebanyakan orang awam dan membuka dari HP, harus bisa
mendaftar ke SMK Tamansiswa Jetis tanpa bingung. Tampilan harus terasa ramah, modern, simpel,
ringan, dan responsif di semua bagian.

**Target:**
- Orang yang baru pertama kali membuka situs langsung tahu cara mendaftar dan apa yang perlu disiapkan.
- Form terasa tidak menakutkan: dibagi 4 langkah, ada petunjuk di setiap kolom, dan pesan salah menjelaskan cara memperbaikinya.
- Nyaman di HP layar kecil (lebar 360px) sampai desktop.
- Lebih ringan dari sekarang, sejauh bisa dicapai tanpa langkah build.

**Bukan target:**
- Mengubah alur data: pengiriman ke Sheetson dan upload ke Supabase tetap seperti sekarang.
- Membuat halaman admin.
- Memperbaiki bug cek NISN (teks vs angka); itu pekerjaan terpisah.

**Yang dianggap gagal walaupun tampilannya cantik:**
- Pendaftaran atau upload berkas berhenti bekerja.
- Ada teks yang sulit dibaca di HP, atau tombol yang terlalu kecil untuk jempol.
- Halaman terasa lebih berat atau lebih lambat dari sekarang.

## Pendekatan

| Pilihan | Untung | Rugi |
|---|---|---|
| A. Tailwind dikompilasi jadi satu CSS kecil | Paling ringan (~20 KB), class tetap sama | Perlu `npm run build` setiap mengubah class |
| **B. Tetap Tailwind CDN, tampilan diperbarui (DIPILIH)** | Tidak perlu build; cara edit sama seperti sekarang | Script CDN ~300 KB dan penyusunan gaya di browser tetap ada |
| C. CSS biasa tanpa framework | Paling ringan, tanpa build | Menulis ulang semua class; perawatan paling berat |

Pemilik memilih **B**. Keringanan dicapai dengan memangkas beban lain (lihat bagian Keringanan).

## Arah tampilan (disetujui lewat contoh)

Pemilik menyetujui contoh "Hangat & Ramah, versi mudah dipahami".

- **Warna:** latar krem lembut `#FAF7F2`, kartu putih, aksen utama hijau `#15803D` (hover `#166534`), lembut `#DCFCE7`/`#F0FDF4`; teks `#1C2A22`, teks kedua `#4B5A50`, teks samar `#6B7A70`; garis kolom `#C9C5BB`; merah salah `#DC2626`. Nama token `brand` di `tailwind-config.js` diganti ke skala hijau ini, `ink` ke skala teks hangat ini.
- **Bentuk:** kartu `rounded-2xl`/`rounded-3xl`; tombol utama berbentuk kapsul (`rounded-full`), selebar layar di HP; kolom isian `rounded-xl` dengan garis 1.5px yang jelas.
- **Huruf:** satu keluarga, Plus Jakarta Sans, ketebalan 400/600/800. Teks isi minimal 15px di HP, judul hero ±26px di HP dan ±48px di desktop.
- **Ikon:** emoji untuk jurusan (🔧 TKR, 🏍️ TSM, ⚡ TITL, 💻 RPL, 🎨 DKV) dan ikon SVG kecil yang ditulis langsung di halaman untuk panah, centang, menu, WhatsApp, dan salin. Font Awesome dihapus.
- **Gerak:** hanya transisi warna/naik-turun yang halus; hormati `prefers-reduced-motion`.

## Beranda (`index.html`)

Urutan bagian di HP (desktop sama, hanya lebih lebar dan bersisian):

```
[Navbar]  SMK Tamansiswa Jetis                    ☰
[Hero]    ✓ Pendaftaran 2026/2027 sudah dibuka
          Rakit masa depanmu, mulai dari bengkel & lab kami.
          Daftar online langsung dari HP, sekitar 10 menit.
          [   Daftar Sekarang →   ]   (hijau, kapsul)
          [ Cek Status Pendaftaran ]  (putih, garis)
          (desktop: kartu Jadwal di kanan)
[Cara daftar, 3 langkah]  1 Isi formulir · 2 Unggah berkas · 3 Konfirmasi WhatsApp
[Jadwal]  kartu jadwal yang sudah ada (di HP muncul setelah 3 langkah)
[Pilih jurusan]  5 kartu jurusan + kartu Konsultasi BK
[FAQ]     akordeon yang sudah ada, teks lebih besar
[Ajakan akhir]  "Siap bergabung?" + tombol Daftar
[Footer]  alamat, kontak, tahun
```

- Semua isi teks yang sudah ada (jadwal, deskripsi jurusan, pertanyaan FAQ, nomor panitia, alamat) dipertahankan; hanya tampilannya yang berubah.
- Bagian "Alur Pendaftaran" yang sekarang (garis waktu terpisah HP/desktop) diganti dengan "Cara daftar, 3 langkah": satu susunan yang sama untuk HP dan desktop (desktop: 3 kolom).
- Kartu jurusan: di HP digeser ke samping (satu kartu hampir selebar layar, kartu berikutnya terlihat sedikit sebagai tanda bisa digeser); di desktop grid 3 kolom.
- Statistik hero (angka berjalan) dihapus agar hero simpel; animasi angka di `main.js` ikut dihapus.
- Ambient glow/blur besar di hero dihapus (berat di HP).

## Form pendaftaran (`daftar/index.html`)

**Kerangka halaman:** navbar sederhana (kembali ke beranda + judul), dua tab "Daftar" dan "Cek Status" yang tetap ada, footer kecil.

**Form 4 langkah**, semua tetap di dalam satu `<form id="regForm">`:

| Langkah | Judul | Kolom |
|---|---|---|
| 1 | Data Diri | namaLengkap, jenisKelamin, nisn, tempatLahir, tanggalLahir, agama, whatsapp, alamat, asalSekolah |
| 2 | Orang Tua / Wali | namaOrtu, waOrtu |
| 3 | Berkas | berkasFile (boleh dilewati) |
| 4 | Jurusan & Kirim | jurusan1, jurusan2, kodeVoucher (kalau ada di halaman), pernyataan, tombol Kirim (`submitBtn`) |

- Di atas form: "Langkah X dari 4: <judul>" + bilah kemajuan hijau.
- Tombol bawah: "Lanjut →" (kapsul hijau selebar layar) dan "← Kembali" (teks/garis) mulai langkah 2. Langkah 4 menampilkan tombol Kirim yang sudah ada.
- **"Lanjut" memeriksa kolom di langkah itu saja.** Kalau ada yang salah, form tetap di langkah itu, pesan salah muncul di bawah kolom, dan halaman menggulir ke kolom pertama yang salah. Aturan pemeriksaannya sama dengan `validateFormInputs` di `daftar.js` (NISN 10 angka, WA 9–13 angka, ukuran berkas ≤ 5 MB, jurusan 1 ≠ jurusan 2, dll.).
- Saat Kirim, `validateFormInputs` yang sudah ada tetap berjalan untuk semua kolom; kalau ada salah di langkah lain, form pindah ke langkah tempat kolom salah pertama berada.
- Pindah langkah menggulir ke atas form dan memindahkan fokus ke judul langkah (agar pembaca layar ikut).
- **Jenis kelamin** tampil sebagai dua tombol pilihan besar (Laki-laki / Perempuan). Di belakangnya tetap ada nilai `jenisKelamin` yang dibaca `daftar.js`: elemen `<select id="jenisKelamin">` dipertahankan tersembunyi dan ikut diisi, atau diganti radio dengan penyesuaian kecil di `daftar.js`. Pembangun memilih cara yang paling sedikit mengubah `daftar.js`.
- Agama dan jurusan tetap dropdown (pilihannya lebih dari 2), dengan tampilan besar dan jelas.
- Setiap kolom: label tebal + bintang merah untuk wajib, contoh isian di placeholder, satu baris petunjuk di bawah (mis. "Tulis sesuai ijazah SMP", "Lihat NISN di rapor atau tanya sekolah asal").
- Pesan salah yang sekarang di `daftar.js` diperjelas agar memberi tahu cara memperbaiki (mis. "NISN harus 10 angka. Lihat di rapor atau tanya sekolah asal."). Teks lain di logika tidak diubah.
- Langkah Berkas: area unggah besar ("Ketuk untuk memilih foto atau PDF"), menampilkan nama dan ukuran file terpilih, keterangan "PDF/JPG/PNG, maksimal 5 MB, boleh menyusul lewat WhatsApp".
- Di bawah tombol, setiap langkah: "Butuh bantuan? Chat panitia di WhatsApp" (nomor panitia yang sudah dipakai di halaman).

**Kartu sukses, modal upload, dan tab Cek Status:** tetap dengan semua `id` yang sama, hanya tampilannya disesuaikan ke gaya baru (kartu putih, nomor pendaftaran besar dengan tombol salin, tombol WhatsApp hijau, tombol unduh PDF). Garis waktu status yang dibuat `renderStatusResult` disesuaikan warnanya ke palet baru (class di `daftar.js`).

## Keringanan (tanpa build)

- Hapus Font Awesome (dua versi berbeda dimuat sekarang) → ikon SVG di halaman + emoji.
- Satu keluarga font (Plus Jakarta Sans 400/600/800) menggantikan Inter + Plus Jakarta Sans dengan banyak ketebalan; `display=swap` + `preconnect`.
- Hapus Supabase dari beranda (tidak dipakai di sana).
- jsPDF dimuat dengan `defer` di halaman daftar.
- Hapus blur/glow besar dan animasi angka.
- Perbaiki path script di `daftar/index.html` (`./assets/...` → `../assets/...`) dan pakai `tailwind-config.js` bersama di kedua halaman agar warna konsisten.
- `assets/js/config.js` yang usang dan tidak dipakai: hapus dari kedua halaman.

## Batasan yang wajib dijaga

- Semua `id` yang dibaca `daftar.js` dan `main.js` tetap ada dengan arti yang sama (daftar lengkap ada di kedua file HTML saat ini).
- Urutan dan nama data yang dikirim ke Sheetson/Supabase tidak berubah.
- Tanpa langkah build; tetap file statis.
- Responsif dari 360px sampai desktop, tanpa gulir menyamping.
- Kontras teks memenuhi WCAG AA; target sentuh minimal 44px.

## Diserahkan ke pembangun

- Susunan tepat bagian di desktop (mis. hero dua kolom dengan kartu jadwal di kanan).
- Detail ikon SVG dan jarak antar elemen, mengikuti arah di atas.
- Cara teknis menampilkan/menyembunyikan langkah (mis. `data-step` + class `hidden`) dan di file mana logika langkah ditulis (`daftar.js` atau file kecil baru).

## Diputuskan sendiri oleh Claude (silakan koreksi)

- Biaya pendaftaran tidak disebut di beranda karena belum ada konfirmasi; kalimatnya "Daftar online langsung dari HP, sekitar 10 menit."
- Statistik angka di hero dan garis waktu alur yang lama dihapus demi kesederhanaan.
- Font Awesome diganti SVG/emoji.
- Link "Chat panitia di WhatsApp" di halaman daftar memakai 628823212784 (nomor yang terakhir
  diubah pemilik di commit "update nomer panitia"). Nomor beranda (628232128784) dan nomor tombol
  tanya status (6281332517626) dibiarkan apa adanya; selisih nomor dilaporkan ke pemilik di akhir.

Status: disetujui pemilik pada 2026-11-22.
