# Tampilan Ramah SPMB Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Desain ulang beranda dan halaman daftar/cek status ke gaya "Hangat & Ramah" dengan form 4 langkah, lebih ringan, responsif, tanpa mengubah alur data.

**Architecture:** Tetap HTML statis + Tailwind CDN + `tailwind-config.js` bersama. Logika langkah form berupa fungsi murni di file baru `assets/js/daftar/form-steps.js` (bisa dites dengan `node:test`) yang dipanggil `daftar.js`. Sebuah skrip pemeriksa (`tests/check-pages.mjs`) menjaga kontrak `id`, path script, dan larangan Font Awesome.

**Tech Stack:** HTML, Tailwind Play CDN, JavaScript vanilla, Node 24 (`node --test`) untuk tes, Supabase JS v2 + jsPDF (sudah ada).

**Spec:** `docs/superpowers/specs/2026-11-22-tampilan-ramah-design.md`

## Global Constraints

- Warna: latar `#FAF7F2`, kartu putih, aksen `#15803D` (hover `#166534`), lembut `#DCFCE7`/`#F0FDF4`, teks `#1C2A22`/`#4B5A50`/`#6B7A70`, garis kolom `#C9C5BB`, merah `#DC2626`.
- Font: hanya Plus Jakarta Sans 400/600/800, `display=swap` + `preconnect`. Teks isi ≥ 15px di HP.
- Tombol utama `rounded-full`, selebar layar di HP; kolom isian `rounded-xl` garis 1.5px; target sentuh ≥ 44px.
- Tidak ada Font Awesome; ikon = SVG di halaman atau emoji (🔧 TKR, 🏍️ TSM, ⚡ TITL, 💻 RPL, 🎨 DKV).
- Semua `id` yang dibaca `daftar.js`/`main.js` tetap ada. `showFieldError` memakai `inputEl.closest("div").querySelector(".field-error")`: setiap kolom harus punya `<div>` pembungkus terdekat yang berisi `<span class="field-error hidden">`.
- Data yang dikirim ke Sheetson/Supabase tidak berubah. Tanpa langkah build.
- Responsif 360px–desktop, tanpa gulir menyamping; hormati `prefers-reduced-motion`; kontras WCAG AA.
- Link bantuan WhatsApp di halaman daftar: `https://wa.me/628823212784`. Nomor lain di file tidak diubah.
- Teks konten yang sudah ada (jadwal, jurusan, FAQ, alamat, kontak) dipertahankan isinya.

## Review Focus

- Siswa menekan "Lanjut" dengan kolom kosong → tetap di langkah itu, pesan salah muncul di kolom yang benar, tidak ada pesan dari langkah lain yang ikut tampil.
- Siswa kembali ke langkah sebelumnya lalu maju lagi → isian tidak hilang, berkas terpilih tetap ada.
- Kirim gagal validasi karena kolom di langkah lain (mis. pernyataan belum dicentang atau jurusan sama) → form pindah ke langkah tempat salah pertama.
- Layar 360px: tidak ada elemen yang meluber; kartu jurusan bisa digeser; modal upload muat di layar.
- Pendaftaran sungguhan (dengan berkas PDF) tetap berhasil sampai kartu sukses + tombol WhatsApp + unduh PDF.

---

### Task 1: Tema bersama dan pemeriksa halaman

**Files:**
- Modify: `assets/js/umum/tailwind-config.js` (seluruh isi `theme.extend`)
- Modify: `assets/css/style.css` (hapus `.blueprint-grid`, `.nav-link`, `.step-line*`, aturan yang tak terpakai lagi; tambah dasar baru)
- Create: `tests/check-pages.mjs`
- Create: `package.json` (hanya `"type": "module"` dan script `"test": "node --test tests/ && node tests/check-pages.mjs"`)

**Interfaces:**
- Produces: token Tailwind `brand-{50,100,600,700}` = hijau (`#F0FDF4`, `#DCFCE7`, `#15803D`, `#166534`), `ink-{900,600,500}` = `#1C2A22`, `#4B5A50`, `#6B7A70`, `line` = `#C9C5BB`, `cream` = `#FAF7F2`; `fontFamily.sans` = Plus Jakarta Sans; `boxShadow.soft` = `0 8px 24px -12px rgba(28,42,34,.25)`.
- Produces: `node tests/check-pages.mjs` keluar dengan kode 0 bila semua lolos, 1 bila ada pelanggaran, mencetak setiap pelanggaran per baris.

- [ ] **Step 1: Tulis `tests/check-pages.mjs`** yang membaca `index.html`, `daftar/index.html`, `assets/js/daftar/daftar.js`, `assets/js/beranda/main.js` lalu memeriksa:
  - setiap `getElementById("X")` di `daftar.js` ada sebagai `id="X"` di `daftar/index.html` (kecuali `kodeVoucher`, opsional);
  - setiap `getElementById("X")` di `main.js` ada di `index.html`, kecuali id yang dihapus spec (`menuBtn`/`mobileMenu`/`navInner`/`year` wajib ada; `[data-target]` tidak boleh ada lagi);
  - tidak ada `font-awesome` atau `class="fa-` di kedua HTML;
  - tidak ada `config.js`; `daftar/index.html` tidak memuat `src="./assets/`; `index.html` tidak memuat `supabase-js`;
  - kedua HTML memuat `tailwind-config.js` sesudah `cdn.tailwindcss.com`;
  - setiap elemen dengan class `field-error` ada di dalam `<div>` (cek kasar: span `field-error` berada sesudah input/select/textarea dalam blok `<div>` yang sama).
- [ ] **Step 2: Jalankan** `node tests/check-pages.mjs`. Expected: GAGAL dengan pelanggaran Font Awesome, `config.js`, path `./assets/`, `supabase-js` di beranda.
- [ ] **Step 3: Tulis ulang `tailwind-config.js`** dengan token di Interfaces; ubah `style.css` menjadi dasar baru: `body` latar cream + Plus Jakarta Sans, `.faq-item.open` (dipakai `main.js`), scrollbar tersembunyi untuk geser jurusan, `@media (prefers-reduced-motion: reduce)` mematikan transisi.
- [ ] **Step 4: Commit** `git add package.json tests/check-pages.mjs assets/js/umum/tailwind-config.js assets/css/style.css && git commit -m "feat(ui): tema hangat-ramah bersama dan pemeriksa halaman"`

### Task 2: Beranda baru

**Files:**
- Modify: `index.html` (seluruh `<head>` dan `<body>`)
- Modify: `assets/js/beranda/main.js` (hapus blok counter `[data-target]`; ganti `innerHTML` ikon Font Awesome di toggle menu dengan SVG ☰/✕)

**Interfaces:**
- Consumes: token Task 1.
- Produces: `index.html` dengan id `navbar`, `navInner`, `menuBtn`, `mobileMenu` (link `.mobile-link`), `jurusan`, `alur`, `faq`, `year`; FAQ tetap `.faq-item > .faq-trigger`.

- [ ] **Step 1: `<head>`**: Tailwind CDN → `assets/js/umum/tailwind-config.js` → Google Fonts Plus Jakarta Sans 400;600;800 dengan `preconnect` → `assets/css/style.css` → `assets/js/beranda/main.js` `defer`. Hapus Font Awesome, `config.js`, `supabase-js`.
- [ ] **Step 2: `<body>`** sesuai urutan spec: navbar (logo/nama, link Jurusan · Cara Daftar · FAQ · Cek Status, tombol "Daftar" kapsul; menu HP), hero (lencana "✓ Pendaftaran 2026/2027 sudah dibuka", judul yang ada, kalimat "Daftar online langsung dari HP, sekitar 10 menit.", tombol "Daftar Sekarang →" ke `daftar/` dan "Cek Status Pendaftaran" ke `daftar/#cek-status`; desktop: kartu jadwal di kanan dengan isi jadwal yang ada), `#alur` "Cara daftar, 3 langkah" (Isi formulir · Unggah berkas · Konfirmasi via WhatsApp; 1 kolom HP, 3 kolom desktop), jadwal (HP saja, isi sama), `#jurusan` 5 kartu + kartu Konsultasi BK dengan isi yang ada (HP: `flex overflow-x-auto snap-x`, kartu `w-[85%]`; desktop: grid 3 kolom), `#faq` (pertanyaan yang ada), ajakan akhir "Siap bergabung?" + tombol Daftar, footer (isi yang ada + `#year`). Hapus statistik hero, glow, garis waktu lama.
- [ ] **Step 3: Ubah `main.js`** sesuai Files.
- [ ] **Step 4: Jalankan** `node tests/check-pages.mjs`. Expected: tidak ada pelanggaran untuk `index.html`.
- [ ] **Step 5: Periksa di browser** (buka `index.html`) pada lebar 360px dan 1280px: tidak ada gulir menyamping, menu HP buka/tutup, FAQ buka/tutup, jurusan bisa digeser di HP.
- [ ] **Step 6: Commit** `git add index.html assets/js/beranda/main.js && git commit -m "feat(ui): beranda gaya hangat-ramah"`

### Task 3: Logika form 4 langkah

**Files:**
- Create: `assets/js/daftar/form-steps.js`
- Create: `tests/form-steps.test.mjs`
- Modify: `assets/js/daftar/daftar.js` (`validateFormInputs` dapat opsi; pasang navigasi langkah di `initFormValidationAndSubmit`; pesan salah diperjelas)

**Interfaces:**
- Produces (di `form-steps.js`, global `window.FormSteps` dan `module.exports` bila ada):
  - `STEP_FIELDS: { 1: string[], 2: string[], 3: string[], 4: string[] }` = `1: namaLengkap, jenisKelamin, nisn, tempatLahir, tanggalLahir, agama, whatsapp, alamat, asalSekolah`; `2: namaOrtu, waOrtu`; `3: berkasFile`; `4: jurusan1, jurusan2, pernyataan`.
  - `stepOfField(id: string) => 1|2|3|4|null`
  - `firstErrorStep(errorFieldIds: string[]) => number|null` (langkah terkecil yang punya error)
  - `errorsInStep(step: number, errorFieldIds: string[]) => string[]`
- Produces (di `daftar.js`): `validateFormInputs(regForm, jurusan1, jurusan2, jurusanSamaWarning, options = { scroll: true })` mengembalikan `boolean` seperti sekarang; ketika `options.scroll === false` tidak menggulir. Fungsi baru `collectErrorFieldIds(regForm) => string[]` (id kolom yang `.field-error`-nya tampil, plus `pernyataan` bila `#pernyataanError` tampil, plus `jurusan2` bila `#jurusanSamaWarning` tampil). `goToStep(n: number)` menampilkan `[data-step="n"]`, menyembunyikan lainnya, memperbarui teks `#stepLabel` ("Langkah n dari 4: <judul>") dan lebar `#stepBar` (`n*25%`), menggulir ke atas form, memfokus `[data-step="n"] h2`.

- [ ] **Step 1: Tulis tes** `tests/form-steps.test.mjs` (impor via `createRequire` atau baca file + `vm`):
  - `stepOfField("nisn") === 1`, `stepOfField("waOrtu") === 2`, `stepOfField("berkasFile") === 3`, `stepOfField("pernyataan") === 4`, `stepOfField("x") === null`
  - `firstErrorStep(["pernyataan","nisn"]) === 1`, `firstErrorStep(["jurusan2"]) === 4`, `firstErrorStep([]) === null`
  - `errorsInStep(1, ["nisn","waOrtu"])` deep-equals `["nisn"]`
- [ ] **Step 2: Jalankan** `node --test tests/`. Expected: FAIL (file belum ada).
- [ ] **Step 3: Implementasikan `form-steps.js`** sesuai Interfaces.
- [ ] **Step 4: Jalankan** `node --test tests/`. Expected: PASS.
- [ ] **Step 5: Pasang di `daftar.js`**: tombol `[data-next]` → `clearErrors`; `validateFormInputs(..., {scroll:false})`; `errorsInStep(current, collectErrorFieldIds())`; bila ada → sembunyikan error langkah lain (atur ulang `.field-error` di luar langkah aktif ke `hidden`), gulir ke error pertama di langkah ini; bila tidak ada → `clearErrors` lalu `goToStep(current+1)`. Tombol `[data-prev]` → `goToStep(current-1)` tanpa validasi. Pada submit, bila validasi gagal → `goToStep(firstErrorStep(collectErrorFieldIds()))` sebelum menggulir. Pesan salah: NISN → "NISN harus 10 angka. Lihat di rapor atau tanya sekolah asal."; WA siswa → "Nomor WhatsApp harus 9–13 angka, contoh 081234567890."; WA ortu → "Nomor WhatsApp orang tua harus 9–13 angka, contoh 081234567890."; berkas → "Ukuran file lebih dari 5 MB. Pilih file yang lebih kecil atau kirim lewat WhatsApp."
- [ ] **Step 6: Jalankan simulasi logika** `node "<scratchpad>/simulasi.js" assets/js/daftar/daftar.js` (skrip simulasi offline yang sudah ada). Expected: hasil validasi sama seperti sebelumnya (Fajar ditolak jurusan sama, Gilang ditolak NISN).
- [ ] **Step 7: Commit** `git add assets/js/daftar/form-steps.js tests/form-steps.test.mjs assets/js/daftar/daftar.js && git commit -m "feat(form): navigasi 4 langkah dengan validasi per langkah"`

### Task 4: Halaman daftar & cek status baru

**Files:**
- Modify: `daftar/index.html` (seluruh `<head>` dan `<body>`)
- Modify: `assets/js/daftar/daftar.js` (hanya string class di `renderStatusResult`, `showUploadModal`, `showUploadError`, `initTabSwitcher`, `initMobileMenu`: ganti warna `brand-*`/`indigo` lama dan ikon `fa-*` ke SVG/kelas baru)

**Interfaces:**
- Consumes: token Task 1; `goToStep`, `[data-step]`, `[data-next]`, `[data-prev]`, `#stepLabel`, `#stepBar` dari Task 3; semua id di Global Constraints.
- Produces: markup form dengan `[data-step="1".."4"]` di dalam `#regForm`; langkah 1 tampil saat dibuka.

- [ ] **Step 1: `<head>`**: Tailwind CDN → `../assets/js/umum/tailwind-config.js` → font → `../assets/css/style.css`. Script di akhir body: `supabase-js@2`, `../assets/js/daftar/form-steps.js`, `../assets/js/daftar/daftar.js`, jsPDF dengan `defer`. Hapus Font Awesome, `./assets/js/config.js`, `./assets/js/beranda/main.js`.
- [ ] **Step 2: Kerangka**: navbar (← Beranda, judul, menu HP dengan id `mobile-menu-btn`/`menu-icon`/`mobile-menu`), tab Daftar/Cek Status (`.tab-btn[data-tab]`), footer kecil.
- [ ] **Step 3: Form 4 langkah** sesuai tabel spec. Setiap kolom: `<div>` pembungkus berisi label tebal + `*` merah, input `rounded-xl border-[1.5px] border-line px-3 py-3 text-[15px]`, satu baris petunjuk, `<span class="field-error hidden ...">`. Jenis kelamin: dua tombol pilihan yang mengisi `<select id="jenisKelamin" class="sr-only">` yang tetap ada (tombol aktif: garis hijau 2px + latar `brand-50`). Berkas: label besar "Ketuk untuk memilih foto atau PDF" untuk `#berkasFile` (accept tetap `.pdf, .jpg, .jpeg, .png`), tampilkan nama + ukuran file terpilih, keterangan "PDF/JPG/PNG, maksimal 5 MB, boleh menyusul lewat WhatsApp". Langkah 4 berisi jurusan, `#jurusanSamaWarning`, pernyataan + `#pernyataanError`, `#submitBtn`. Di atas: `#stepLabel` + bilah `#stepBar`. Di bawah tiap langkah: tombol `[data-prev]` (mulai langkah 2) dan `[data-next]` (langkah 1–3), serta "Butuh bantuan? Chat panitia di WhatsApp" ke `https://wa.me/628823212784`.
- [ ] **Step 4: Kartu sukses, tab cek status, modal upload**: id yang sama, gaya baru (nomor pendaftaran besar + `#copyNo` SVG, `#btnWhatsApp` hijau, tombol unduh PDF `onclick="triggerDownloadPDF()"`, modal muat di 360px).
- [ ] **Step 5: Sesuaikan string class di `daftar.js`** sesuai Files.
- [ ] **Step 6: Jalankan** `npm test`. Expected: semua tes lulus dan `check-pages` tanpa pelanggaran.
- [ ] **Step 7: Periksa di browser** (`daftar/index.html`, 360px dan 1280px): maju-mundur langkah, Lanjut dengan kolom kosong, kembali lalu maju (isian dan berkas tetap), submit dengan pernyataan belum dicentang (pindah ke langkah 4), tab Cek Status, `#cek-status` di URL membuka tab cek status.
- [ ] **Step 8: Commit** `git add daftar/index.html assets/js/daftar/daftar.js && git commit -m "feat(ui): halaman daftar 4 langkah dan cek status gaya hangat-ramah"`

### Task 5: Uji pendaftaran sungguhan

**Files:** tidak ada perubahan kode.

- [ ] **Step 1: Jalankan** skrip uji live satu pendaftar berkas PDF (`<scratchpad>/isi-asli-11.js` dengan NISN baru) terhadap `assets/js/daftar/daftar.js`. Expected: `BERHASIL SPMB-…`, `statusBerkas=Sudah Unggah`, link berkas HTTP 200.
- [ ] **Step 2: Lewati form di browser sekali secara manual** sampai kartu sukses; pastikan tombol WhatsApp dan unduh PDF bekerja.
- [ ] **Step 3: Laporkan** ke pemilik: hasil, jumlah baris TES baru, dan selisih nomor WhatsApp (beranda 628232128784 vs daftar 628823212784).
