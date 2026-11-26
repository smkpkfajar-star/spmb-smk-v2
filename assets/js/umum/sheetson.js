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

  // Hanya berkas TERBARU yang dipakai: bila sel berisi beberapa baris (data lama), ambil yang terakhir.
  // urlBerkas & namaBerkas berpasangan per baris.
  function berkasTerbaru(row) {
    const urls = String((row && row.urlBerkas) || "").split(/\r?\n/).map((x) => x.trim());
    let i = urls.length - 1;
    while (i >= 0 && !/^https?:\/\//.test(urls[i])) i--;
    if (i < 0) return null;
    const names = String((row && row.namaBerkas) || "").split(/\r?\n/).map((x) => x.trim());
    const nama = names[i] && names[i] !== "-" ? names[i] : [...names].reverse().find((x) => x && x !== "-") || "";
    return { url: urls[i], nama };
  }

  // Berkas dipisah per jenis; tiap jenis punya kolom URL sendiri di sheet Verifikasi_Berkas.
  // Ijazah dan SKL saling menggantikan (SKL dipakai selama ijazah belum keluar).
  const JENIS_BERKAS = [
    { id: "ijazah", label: "Ijazah", kolom: "urlIjazah", ket: "Bila belum keluar, cukup unggah SKL" },
    { id: "skl", label: "SKL", kolom: "urlSkl", ket: "Surat Keterangan Lulus" },
    { id: "kk", label: "Kartu Keluarga", kolom: "urlKk", ket: "" },
    { id: "kartuPelajar", label: "Kartu Pelajar", kolom: "urlKartuPelajar", ket: "" },
  ];
  const adaUrl = (v) => /^https?:\/\//.test(String(v ?? "").trim());
  // [{ id, label, kolom, ket, url|null }] — berkas lama (kolom urlBerkas) ikut sebagai "Berkas lain" bila ada.
  function daftarBerkas(row) {
    const out = JENIS_BERKAS.map((j) => ({ ...j, url: adaUrl(row && row[j.kolom]) ? String(row[j.kolom]).trim() : null }));
    const lama = berkasTerbaru(row);
    if (lama) out.push({ id: "lain", label: lama.nama || "Berkas lain", kolom: "urlBerkas", ket: "", url: lama.url, lama: true });
    return out;
  }
  // Status berkas otomatis dari kelengkapan: Belum Unggah | Sebagian Unggah | Sudah Unggah.
  // Lengkap = (Ijazah atau SKL) + Kartu Keluarga + Kartu Pelajar.
  function statusBerkasDari(row) {
    const d = Object.fromEntries(daftarBerkas(row).map((b) => [b.id, !!b.url]));
    if (d.lain && !d.ijazah && !d.skl && !d.kk && !d.kartuPelajar) return "Sudah Unggah"; // data lama: satu berkas
    const jumlah = ["ijazah", "skl", "kk", "kartuPelajar"].filter((k) => d[k]).length;
    if (!jumlah) return "Belum Unggah";
    return (d.ijazah || d.skl) && d.kk && d.kartuPelajar ? "Sudah Unggah" : "Sebagian Unggah";
  }
  // Teks ringkas untuk bukti pendaftaran / ekspor: "Ijazah, Kartu Keluarga"
  function ringkasBerkas(row) {
    return daftarBerkas(row).filter((b) => b.url).map((b) => b.label).join(", ");
  }

  root.Sheetson = { berkasTerbaru, JENIS_BERKAS, daftarBerkas, statusBerkasDari, ringkasBerkas, getRows, rowsAfter, patchRow, normNisn, escapeHtml };
})(typeof window !== "undefined" ? window : globalThis);
