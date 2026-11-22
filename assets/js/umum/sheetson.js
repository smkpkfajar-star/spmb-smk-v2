/* ============================================================
   sheetson.js — baca & ubah Google Sheets lewat Sheetson.
   Dipakai halaman admin dan siswa. Membutuhkan window.APP_CONFIG.

   PENTING: Sheetson mengirim "cache-control: max-age=14400" (4 jam) dan
   jawabannya di-cache Cloudflare. Setiap GET wajib memakai penanda waktu.
   ============================================================ */
(function (root) {
  const BASE = "https://api.sheetson.com/v2/sheets";
  const PAGE_SIZE = 100;

  function headers(json) {
    const { apiKey, spreadsheetId } = root.APP_CONFIG.sheetson;
    const h = { Authorization: `Bearer ${apiKey}`, "X-Spreadsheet-Id": spreadsheetId };
    if (json) h["Content-Type"] = "application/json";
    return h;
  }

  // Salinan sebentar per sheet: pindah menu di admin tidak mengunduh ulang semuanya.
  // Tombol "Muat ulang" & pemberitahuan pendaftar baru memakai { fresh: true }.
  const CACHE_MS = 2 * 60 * 1000;
  const cache = new Map();

  function getRows(sheet, opts) {
    const hit = cache.get(sheet);
    if (hit && !(opts && opts.fresh) && Date.now() - hit.at < CACHE_MS) return hit.promise;
    const promise = fetchAll(sheet);
    const entry = { at: Date.now(), promise };
    cache.set(sheet, entry);
    promise.catch(() => cache.get(sheet) === entry && cache.delete(sheet));
    return promise;
  }

  // Semua baris sebuah sheet (semua halaman), selalu data terbaru.
  async function fetchAll(sheet) {
    const rows = [];
    for (let skip = 0; ; ) {
      const url = `${BASE}/${encodeURIComponent(sheet)}?limit=${PAGE_SIZE}&skip=${skip}&_=${Date.now()}`;
      const res = await fetch(url, { cache: "no-store", headers: headers(false) });
      if (!res.ok) throw new Error(`Gagal membaca ${sheet} (HTTP ${res.status})`);
      const json = await res.json();
      const page = json.results || [];
      rows.push(...page);
      skip += page.length;
      if (!json.hasNextPage || page.length === 0) return rows;
    }
  }

  // Baris setelah posisi tertentu — dipakai admin untuk cek "ada pendaftar baru?" (1 permintaan)
  async function rowsAfter(sheet, knownCount, limit = 50) {
    const url = `${BASE}/${encodeURIComponent(sheet)}?limit=${limit}&skip=${knownCount}&_=${Date.now()}`;
    const res = await fetch(url, { cache: "no-store", headers: headers(false) });
    if (!res.ok) throw new Error(`Gagal memeriksa ${sheet} (HTTP ${res.status})`);
    const json = await res.json();
    return json.results || [];
  }

  // Ubah satu baris; kirim HANYA kolom yang berubah agar tidak menimpa isian petugas lain.
  async function patchRow(sheet, rowIndex, data) {
    const res = await fetch(`${BASE}/${encodeURIComponent(sheet)}/${rowIndex}`, {
      method: "PATCH",
      headers: headers(true),
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(`Gagal menyimpan ke ${sheet} (HTTP ${res.status})`);
    return res.json();
  }

  // NISN di sheet bisa tersimpan sebagai angka (nol di depan hilang).
  function normNisn(v) {
    return String(v ?? "").trim().replace(/^0+/, "");
  }

  function escapeHtml(s) {
    return String(s ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  root.Sheetson = { getRows, rowsAfter, patchRow, normNisn, escapeHtml };
})(typeof window !== "undefined" ? window : globalThis);
