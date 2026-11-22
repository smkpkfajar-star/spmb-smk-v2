# Admin Panitia & Lengkapi Berkas Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Halaman admin panitia (login, dashboard, verifikasi, keuangan, tes fisik, superadmin) dan halaman lengkapi berkas siswa, data tetap di Google Sheets via Sheetson, login via Supabase Auth.

**Architecture:** HTML statis + Tailwind CDN + `tailwind-config.js`. Modul bersama: `app-config.js` (konfigurasi), `sheetson.js` (baca semua baris anti-cache, PATCH per baris), `admin-auth.js` (login & peran), `admin-ui.js` (daftar, cari, filter, dialog, toast). Fungsi murni diuji `node:test`; halaman diuji headless Chrome.

**Tech Stack:** HTML, Tailwind Play CDN, JS vanilla, Supabase JS v2 (CDN), Sheetson v2, Node 24 `node:test`.

**Spec:** `docs/superpowers/specs/2026-11-22-admin-panitia-design.md`

## Global Constraints
- Login petugas `username@petugas.spmb.local`; siswa `NISN@siswa.spmb.local`; sesi petugas disimpan (default supabase-js), sesi siswa juga (halaman sendiri) dengan tombol Keluar.
- Peran: `superadmin`, `verifikasi`, `keuangan`, `tes_fisik`; `pendaftar` ditolak di `admin/`.
- Setiap GET Sheetson memakai `&_=<Date.now()>` + `cache: "no-store"`.
- PATCH hanya kolom yang diubah, ke `/v2/sheets/<Sheet>/<rowIndex>`.
- Nilai status persis seperti tabel di spec.
- Tidak ada password di file sumber; `assets/js/auth.js` dan `assets/js/config.js` lama dihapus.
- Gaya: krem/hijau, garis 2px, teks ≥ 15px, `<meta name="robots" content="noindex">` di admin/ dan siswa/.
- Tidak ada `prompt()`/`alert()` untuk mengubah data; pakai dialog.

## Review Focus
- Dua petugas membuka daftar bersamaan lalu menyimpan → PATCH hanya kolom yang diubah, tidak menimpa kolom lain.
- Pencarian dengan NISN yang di sheet tersimpan sebagai angka (nol depan hilang) tetap ketemu.
- Petugas peran `keuangan` membuka `verifikasi.html` langsung → diarahkan ke dashboard dengan pesan.
- Siswa yang barisnya belum muncul di sheet (cache/terlambat) → pesan jelas, unggah tetap bisa dicoba ulang.
- Teks dari sheet (nama, catatan) berisi `<` atau `"` → ditampilkan sebagai teks, bukan HTML.

---

### Task 1: Konfigurasi & Sheetson bersama
**Files:** Create `assets/js/app-config.js`, `assets/js/sheetson.js`, `tests/sheetson.test.mjs`; Modify `assets/js/daftar.js` (pakai `window.APP_CONFIG`), `daftar/index.html` (muat app-config.js), `tests/check-pages.mjs`; Delete `assets/js/config.js`, `assets/js/auth.js`.
**Interfaces (Produces):** `window.APP_CONFIG = { sheetson: { apiKey, spreadsheetId }, supabase: { url, anonKey, bucketName } }`; `window.Sheetson = { getRows(sheet) → Promise<row[]>, patchRow(sheet, rowIndex, data) → Promise<row>, normNisn(v) → string, escapeHtml(s) → string }`.
- [ ] Tes: `getRows` menggabungkan halaman sampai `hasNextPage=false` dan setiap URL memuat `_=`; `patchRow` memakai method PATCH ke `/Sheet/7` dengan body hanya data; `normNisn("0099")==="99"`; `escapeHtml('<a "b">')==='&lt;a &quot;b&quot;&gt;'`.
- [ ] Jalankan → FAIL; implementasi → PASS; `npm test` hijau; uji simulasi daftar offline tetap sama; commit.

### Task 2: SQL Supabase, login & dashboard
**Files:** Create `supabase/admin-setup.sql`, `assets/js/admin-auth.js`, `admin/index.html`, `admin/dashboard.html`.
**Interfaces:** `AdminAuth.login(username, password) → {ok, role, error}`, `AdminAuth.logout()`, `AdminAuth.requireRole(roles) → Promise<{user, profile}>` (arahkan ke `index.html` bila belum login, ke `dashboard.html?ditolak=1` bila peran tak sesuai), `AdminAuth.MODULES` (daftar modul + peran).
- [ ] SQL: `alter type public.user_role add value if not exists` ×4; `is_superadmin()`; RLS profiles (select sendiri / superadmin semua; update role oleh superadmin); `reset_password(target_email text, new_password text)`.
- [ ] Tes `node:test`: `MODULES` menghasilkan modul yang benar untuk tiap peran.
- [ ] Uji Chrome: login salah → pesan; login peran pendaftar → ditolak.

### Task 3: UI bersama + Verifikasi Berkas
**Files:** Create `assets/js/admin-ui.js`, `admin/verifikasi.html`, `tests/admin-ui.test.mjs`.
**Interfaces:** `AdminUI.filterRows(rows, query, field, value)`, `AdminUI.openDialog({title, fields, values, onSave})`, `AdminUI.toast(msg, type)`, `AdminUI.renderList(container, rows, columns, onEdit)`.
- [ ] Tes `filterRows`: cari nama (tanpa beda huruf besar/kecil), no. pendaftaran, NISN angka vs teks ber-nol.
- [ ] Halaman verifikasi sesuai spec; uji Chrome dengan fetch tiruan (simpan → PATCH berisi kolom yang diubah saja).

### Task 4: Keuangan & Tes Fisik
**Files:** Create `admin/keuangan.html`, `admin/tes-fisik.html`.
- [ ] Field & nilai sesuai spec; `tglUkurSeragam` otomatis; uji Chrome dengan fetch tiruan.

### Task 5: Superadmin
**Files:** Create `admin/superadmin.html`; Modify `admin-ui.js` (`toCsv(rows)` + tes).
- [ ] Tes `toCsv`: BOM, kutip ganda di-escape, baris baru dalam sel.
- [ ] Rekap, unduh CSV, kelola petugas, reset password (dengan pesan cadangan bila ditolak).

### Task 6: Lengkapi Berkas siswa
**Files:** Create `siswa/index.html`, `assets/js/siswa.js`.
- [ ] Login NISN+password, status, daftar berkas, unggah → PATCH `namaBerkas`/`urlBerkas` ditambah baris baru, `statusBerkas` = Sudah Unggah.

### Task 7: Verifikasi live
- [ ] Pemilik menjalankan SQL + membuat superadmin; uji login superadmin, tambah petugas, ubah satu baris TES di tiap modul, unggah berkas siswa; laporkan.
