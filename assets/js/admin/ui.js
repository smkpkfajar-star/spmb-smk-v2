/* ============================================================
   admin-ui.js — tampilan bersama halaman admin:
   kepala halaman, daftar (tabel di laptop, kartu di HP), cari & filter,
   dialog ubah data, toast, dan CSV.
   Membutuhkan: Sheetson (sheetson.js); untuk DOM juga AdminAuth.
   ============================================================ */
(function (root) {
  const esc = (s) => root.Sheetson.escapeHtml(s);
  const norm = (v) => root.Sheetson.normNisn(v);

  /* ---------- fungsi murni (dites) ---------- */

  function filterRows(rows, query, filters) {
    const q = String(query || "").trim().toLowerCase();
    const qDigits = /^\d+$/.test(q) ? norm(q) : null;
    return rows.filter((row) => {
      for (const [field, value] of Object.entries(filters || {})) {
        if (value !== "" && value != null && String(row[field] ?? "") !== value) return false;
      }
      if (!q) return true;
      if (String(row.namaLengkap ?? "").toLowerCase().includes(q)) return true;
      if (String(row.noPendaftaran ?? "").toLowerCase().includes(q)) return true;
      if (qDigits && norm(row.nisn).includes(qDigits)) return true;
      return false;
    });
  }

  // Hanya kolom yang nilainya berubah (dibandingkan sebagai teks)
  function changedFields(before, after) {
    const out = {};
    for (const [k, v] of Object.entries(after)) {
      if (String(before[k] ?? "") !== String(v ?? "")) out[k] = v;
    }
    return out;
  }

  function toCsv(rows, columns) {
    const cell = (v) => {
      const s = String(v ?? "");
      return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const lines = [columns.map((c) => cell(c.label)).join(",")];
    rows.forEach((r) => lines.push(columns.map((c) => cell(r[c.key])).join(",")));
    return "﻿" + lines.join("\r\n") + "\r\n";
  }

  function badgeTone(status) {
    const s = String(status || "").toLowerCase();
    if (s === "tidak ada" || s === "-") return "wait";
    if (/mengundurkan/.test(s)) return "info";
    if (/ditolak|tidak|gagal/.test(s)) return "bad";
    if (/diterima|lunas|valid|terverifikasi|lulus|sudah|diverifikasi/.test(s)) return "ok";
    return "wait";
  }

  function paginate(rows, page, size) {
    const pages = Math.max(1, Math.ceil(rows.length / size));
    const p = Math.min(Math.max(Number(page) || 1, 1), pages);
    return { items: rows.slice((p - 1) * size, p * size), pages, page: p };
  }

  // Urutkan salinan baris; angka dibanding sebagai angka, teks tanpa beda huruf besar/kecil.
  // Nilai kosong selalu di akhir.
  function sortRows(rows, key, dir) {
    const sign = dir === "desc" ? -1 : 1;
    const empty = (v) => v === undefined || v === null || v === "" || v === "-";
    return [...rows].sort((a, b) => {
      const x = a[key], y = b[key];
      if (empty(x) && empty(y)) return 0;
      if (empty(x)) return 1;
      if (empty(y)) return -1;
      const nx = Number(x), ny = Number(y);
      if (Number.isFinite(nx) && Number.isFinite(ny)) return (nx - ny) * sign;
      return String(x).localeCompare(String(y), "id", { sensitivity: "base" }) * sign;
    });
  }

  // Waktu daftar: format baru "2026-11-22 15:22:27" (WIB) atau ISO lama "2026-11-22T08:22:27Z"
  function parseWaktu(v) {
    const s = String(v ?? "").trim();
    let d = null;
    if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}(:\d{2})?$/.test(s)) d = new Date(s.replace(" ", "T") + "+07:00");
    else if (/^\d{4}-\d{2}-\d{2}T/.test(s)) d = new Date(s);
    return d && !isNaN(d) ? d : null;
  }
  const BULAN = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
  // → "22 Nov 2026, 15.22" (jam WIB, tidak bergantung zona waktu komputer)
  function formatWaktu(v) {
    const d = parseWaktu(v);
    if (!d) return "-";
    const w = new Date(d.getTime() + 7 * 3600 * 1000);
    const two = (n) => String(n).padStart(2, "0");
    return `${w.getUTCDate()} ${BULAN[w.getUTCMonth()]} ${w.getUTCFullYear()}, ${two(w.getUTCHours())}.${two(w.getUTCMinutes())}`;
  }
  const waktuKey = (v) => (parseWaktu(v) || { getTime: () => 0 }).getTime();

  // Tanggal kalender WIB "2026-11-22" dari angka waktu (ms); 0 → ""
  const tanggalWIB = (ms) => (ms ? new Date(ms + 7 * 3600 * 1000).toISOString().slice(0, 10) : "");

  // Saring baris menurut tanggal daftar (dari/sampai "YYYY-MM-DD", boleh kosong)
  function filterTanggal(rows, dari, sampai) {
    let a = dari || "", b = sampai || "";
    if (!a && !b) return rows;
    if (a && b && a > b) [a, b] = [b, a];
    return rows.filter((r) => {
      const t = tanggalWIB(r._waktu);
      return t && (!a || t >= a) && (!b || t <= b);
    });
  }

  // Tombol nomor halaman: 1 … 9 10 11 … 20
  function pageNumbers(page, pages) {
    if (pages <= 7) return Array.from({ length: pages }, (_, i) => i + 1);
    const set = new Set([1, pages, page - 1, page, page + 1]);
    if (page <= 3) [2, 3].forEach((n) => set.add(n));
    if (page >= pages - 2) [pages - 2, pages - 1].forEach((n) => set.add(n));
    const nums = [...set].filter((n) => n >= 1 && n <= pages).sort((a, b) => a - b);
    const out = [];
    nums.forEach((n, i) => {
      if (i && n - nums[i - 1] > 1) out.push("…");
      out.push(n);
    });
    return out;
  }

  // Judul tab dengan jumlah pendaftar baru, mis. "(3) Verifikasi — Admin SPMB"
  function tabTitle(title, n) {
    const base = String(title).replace(/^\(\d+\)\s*/, "");
    return n > 0 ? `(${n}) ${base}` : base;
  }

  // Saringan tambahan (dropdown). def = { id, label, get(row) → teks, options?: [urutan tetap] }
  const isi = (v, kosong) => (v != null && String(v).trim() !== "" && String(v).trim() !== "-" ? String(v).trim() : kosong);
  // Urutan jurusan di seluruh situs
  const URUTAN_JURUSAN = ["DKV", "RPL", "TITL", "TKR", "TSM"];
  const SARING_UMUM = [
    { id: "jurusan", label: "Jurusan", get: (r) => isi(r.jurusan1, isi(r._jurusan, "Belum diisi")), options: URUTAN_JURUSAN },
    { id: "jk", label: "Jenis kelamin", get: (r) => isi(r._jk, "Belum diisi") },
    { id: "asal", label: "Asal sekolah", get: (r) => isi(r._asal, "Belum diisi") },
  ];

  function opsiSaring(rows, def) {
    const n = new Map();
    rows.forEach((r) => {
      const v = def.get(r);
      n.set(v, (n.get(v) || 0) + 1);
    });
    const tetap = def.options || [];
    const lain = [...n.keys()].filter((v) => !tetap.includes(v)).sort((a, b) => a.localeCompare(b, "id"));
    return [...tetap, ...lain].map((value) => ({ value, n: n.get(value) || 0 }));
  }

  function saringTambahan(rows, defs, pilihan) {
    const aktif = defs.filter((d) => pilihan && pilihan[d.id]);
    return aktif.length ? rows.filter((r) => aktif.every((d) => d.get(r) === pilihan[d.id])) : rows;
  }

  // ---------- nomor pendaftaran dobel ----------
  const nomorBersih = (v) => {
    const t = String(v ?? "").trim();
    return t && t !== "-" ? t : "";
  };
  // Kelompok nomor yang dipakai lebih dari satu orang. orang[0] = yang daftar lebih dulu (tetap memegang nomor).
  function cariNomorDobel(rows) {
    const per = new Map();
    rows.forEach((r) => {
      const n = nomorBersih(r.noPendaftaran);
      if (n) per.set(n, [...(per.get(n) || []), r]);
    });
    return [...per.entries()]
      .filter(([, orang]) => orang.length > 1)
      .map(([nomor, orang]) => ({
        nomor,
        orang: [...orang].sort((a, b) => (waktuKey(a.createdAt) || Infinity) - (waktuKey(b.createdAt) || Infinity) || a.rowIndex - b.rowIndex),
      }))
      .sort((a, b) => a.nomor.localeCompare(b.nomor));
  }
  // Baris milik seseorang di sheet lain: nama yang cocok tepat satu → itu; selain itu urutan kemunculan.
  function barisMilik(rows, nomor, nama, urutanKe) {
    const kandidat = rows.filter((r) => nomorBersih(r.noPendaftaran) === nomor).sort((a, b) => a.rowIndex - b.rowIndex);
    const norm = (v) => String(v ?? "").trim().toLowerCase();
    const samaNama = kandidat.filter((r) => norm(r.namaLengkap) === norm(nama));
    if (samaNama.length === 1) return samaNama[0];
    return kandidat[urutanKe] || null;
  }
  const pesanNomorBaru = (nama, lama, baru) =>
    `Halo, kami panitia SPMB SMK Tamansiswa Jetis.\n\nNomor pendaftaran atas nama *${nama}* kami perbarui dari ${lama} menjadi *${baru}* ` +
    `karena ada kesalahan sistem penomoran. Data pendaftaran tetap aman, tidak perlu mendaftar ulang.\n\n` +
    `Mohon gunakan nomor baru ini untuk keperluan selanjutnya. Terima kasih.`;

  // Isian dialog "Ubah petugas" ("-" = kosong). Password kosong = tidak diganti.
  function cekUbahPetugas(v) {
    const nama = String(v.nama || "").trim();
    if (!nama || nama === "-") throw new Error("Isi nama petugas.");
    const pw = v.password === undefined || v.password === "-" ? "" : String(v.password);
    if (pw && pw.length < 8) throw new Error("Password minimal 8 karakter. Kosongkan bila tidak ingin mengganti password.");
    return { nama, password: pw || null };
  }

  // ---------- Ekspor laporan (Excel/PDF) ----------
  // Kolom yang selalu ada di setiap laporan; kolom khusus modul ditambahkan di belakangnya.
  const KOLOM_EKSPOR_UMUM = [
    { label: "No. pendaftaran", get: (r) => r.noPendaftaran },
    { label: "Nama", get: (r) => r.namaLengkap },
    { label: "NISN", get: (r) => isi(r.nisn, r._nisn) },
    { label: "Jenis kelamin", get: (r) => r._jk },
    { label: "Jurusan", get: (r) => isi(r.jurusan1, r._jurusan) },
    { label: "Asal sekolah", get: (r) => r._asal },
    { label: "Waktu daftar", get: (r) => (r._waktuAsli ? formatWaktu(r._waktuAsli) : "") },
  ];
  // Nilai sel: "-"/kosong -> ""; kolom angka -> Number (0 dianggap belum diisi)
  function selEkspor(v, angka) {
    const t = isi(v, "");
    if (!angka) return t === "-" ? "" : t;
    const n = Number(String(t).replace(/[^\d.,-]/g, "").replace(",", "."));
    return Number.isFinite(n) && n > 0 ? n : "";
  }
  function tabelEkspor(rows, kolomModul = []) {
    const kolom = [...KOLOM_EKSPOR_UMUM, ...kolomModul];
    return {
      header: ["No", ...kolom.map((k) => k.label)],
      body: rows.map((r, i) => [i + 1, ...kolom.map((k) => selEkspor(k.get(r), k.angka))]),
    };
  }
  const keteranganFilter = (bagian) => {
    const b = bagian.filter(Boolean);
    return b.length ? b.join(" · ") : "Semua data (tanpa filter)";
  };
  function namaFileLaporan(judul, ext, date = new Date()) {
    const tgl = new Date(date.getTime() + 7 * 3600 * 1000).toISOString().slice(0, 10);
    const aman = String(judul).replace(/&/g, "dan").replace(/[\\/:*?"<>|]+/g, " ").replace(/\s+/g, " ").trim();
    return `Laporan ${aman} ${tgl}.${ext}`;
  }

  /* ---------- riwayat aktivitas (dites) ---------- */
  // Perubahan data untuk dicatat: ["Label: lama → baru", …] — hanya kolom yang berubah
  function ringkasPerubahan(sebelum, sesudah, label) {
    const tampil = (v) => {
      const t = String(v ?? "").trim();
      return t === "" || t === "-" ? "–" : t;
    };
    return Object.keys(sesudah || {})
      .filter((k) => tampil((sebelum || {})[k]) !== tampil(sesudah[k]))
      .map((k) => `${(label && label[k]) || k}: ${tampil((sebelum || {})[k])} → ${tampil(sesudah[k])}`);
  }
  // Teks ringkas kolom "Detail" di halaman Riwayat
  function teksDetailRiwayat(detail) {
    if (!detail) return "";
    if (Array.isArray(detail.perubahan) && detail.perubahan.length) return detail.perubahan.join(" · ");
    return String(detail.keterangan || "");
  }

  /* Jumlah siswa berstatus "Diterima" per jurusan (dasar kuota). Jurusan diambil dari Data_Pendaftar
     (dicocokkan lewat NISN, cadangan no. pendaftaran); bila daftar tidak diberikan, dipakai kolom _jurusan. */
  const kunciSiswa = (r) => {
    const n = String((r && (r.nisn ?? r._nisn)) ?? "").trim().replace(/^0+/, "");
    return n ? "n" + n : "p" + String((r && r.noPendaftaran) ?? "").trim();
  };
  function hitungDiterima(verif, daftar) {
    const jurusan = new Map((daftar || []).map((r) => [kunciSiswa(r), String(r.jurusan1 || "").trim().toUpperCase()]));
    const hasil = { DKV: 0, RPL: 0, TITL: 0, TKR: 0, TSM: 0 };
    (verif || []).forEach((r) => {
      if (String(r.statusPendaftaran || "").trim().toLowerCase() !== "diterima") return;
      const j = jurusan.get(kunciSiswa(r)) || String(r._jurusan || "").trim().toUpperCase();
      if (Object.prototype.hasOwnProperty.call(hasil, j)) hasil[j] += 1;
    });
    return hasil;
  }

  root.AdminUI = { hitungDiterima, ringkasPerubahan, teksDetailRiwayat, tabelEkspor, keteranganFilter, namaFileLaporan, cekUbahPetugas, cariNomorDobel, barisMilik, pesanNomorBaru, polaBunyi: () => polaBunyi(), URUTAN_JURUSAN, SARING_UMUM, opsiSaring, saringTambahan, isi, filterRows, changedFields, toCsv, badgeTone, paginate, sortRows, tabTitle, parseWaktu, formatWaktu, waktuKey, pageNumbers, tanggalWIB, filterTanggal };
  if (typeof document === "undefined") return;

  /* ---------- tampilan ---------- */

  const TONE_DOT = { ok: "#16A34A", bad: "#DC2626", wait: "#D97706", info: "#0369A1" };
  function badge(text) {
    const t = text === undefined || text === null || text === "" ? "-" : text;
    return `<span class="inline-flex items-center gap-1.5 whitespace-nowrap text-[14px]"><span class="h-1.5 w-1.5 rounded-full" style="background:${TONE_DOT[badgeTone(t)]}" aria-hidden="true"></span>${esc(t)}</span>`;
  }

  const initials = (name) =>
    String(name || "?")
      .split(/[\s@._-]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0].toUpperCase())
      .join("");

  function toast(message, type = "ok") {
    let el = document.getElementById("adminToast");
    if (!el) {
      el = document.createElement("div");
      el.id = "adminToast";
      el.setAttribute("role", "status");
      document.body.appendChild(el);
    }
    el.textContent = message;
    el.className =
      "fixed bottom-5 left-1/2 z-[70] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 rounded-2xl px-5 py-3.5 text-center text-[15px] font-bold text-white shadow-soft " +
      (type === "error" ? "bg-red-700" : "bg-ink-900");
    clearTimeout(el._t);
    el._t = setTimeout(() => el.remove(), 3500);
  }

  const MINI_KEY = "spmb-admin-menu-kecil";
  const svg = (d) =>
    `<svg class="shrink-0" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
  const NAV_ICON = {
    dashboard: svg('<rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/>'),
    verifikasi: svg('<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/><path d="M9 14l2 2 4-4"/>'),
    keuangan: svg('<rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3 10h18"/><path d="M16 15h2"/>'),
    "tes-fisik": svg('<path d="M4 17L17 4l3 3L7 20z"/><path d="M8 13l2 2M11 10l2 2M14 7l2 2"/>'),
    superadmin: svg('<path d="M12 3l8 3v6c0 4.5-3.4 8.3-8 9-4.6-.7-8-4.5-8-9V6z"/><path d="M9 12l2 2 4-4"/>'),
  };

  // Panel admin: sidebar putih bergaris (laci di HP, bisa dikecilkan di laptop) + topbar
  let petugasAktif = null;
  function renderShell(profile, activeId) {
    petugasAktif = profile;
    const A = root.AdminAuth;
    const header = document.getElementById("adminHeader");
    if (!header) return;
    document.body.classList.add("admin-shell");
    const active = activeId || "dashboard";
    const modules = A.modulesFor(profile.role);
    const all = [{ id: "dashboard", href: "#dashboard", title: "Dashboard" }, ...modules];
    const current = all.find((m) => m.id === active) || all[0];
    const link = (m) =>
      `<a href="${m.href}" data-nav="${m.id}" title="${esc(m.title)}" class="flex items-center gap-3 rounded-md px-3 py-2 text-[14.5px]">${NAV_ICON[m.id] || NAV_ICON.dashboard}<span class="mini-hide truncate">${esc(m.title)}</span></a>`;
    // Sub-menu (mis. Superadmin): garis tipis di kiri, hilang saat panel dikecilkan
    const subMenu = (m) =>
      `<div id="sub-${m.id}" class="mini-hide mb-1 ml-[1.35rem] mt-0.5 space-y-0.5 border-l border-hairline pl-2.5" role="group" aria-label="${esc(m.title)}">${m.sub
        .map((s) => `<a href="${m.href}/${s.id}" data-nav-sub="${m.id}/${s.id}" class="block truncate rounded-md px-2.5 py-1.5 text-[13.5px] text-ink-600 hover:bg-brand-50 hover:text-ink-900">${esc(s.title)}</a>`)
        .join("")}</div>`;
    // Menu induk yang punya sub-menu: tautan + tombol panah untuk menciutkan/membuka sub-menu
    const linkInduk = (m) =>
      `<div class="flex items-center gap-1">${link(m).replace('class="flex items-center', 'class="min-w-0 flex-1 flex items-center')}` +
      `<button type="button" data-sub-toggle="${m.id}" aria-controls="sub-${m.id}" aria-expanded="true" title="Ciutkan/buka sub-menu" ` +
      `class="mini-hide grid h-8 w-8 shrink-0 place-items-center rounded-md text-ink-500 hover:bg-brand-50 hover:text-ink-900">` +
      `<span class="sr-only">Sub-menu ${esc(m.title)}</span>` +
      `<svg data-panah width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="transition:transform .2s"><path d="m6 9 6 6 6-6"/></svg>` +
      `</button></div>`;
    const name = profile.nama_lengkap || profile.email;

    const aside = document.createElement("aside");
    aside.id = "adminSidebar";
    aside.className = "admin-sidebar fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-hairline bg-white";
    aside.setAttribute("aria-label", "Menu admin");
    aside.innerHTML = `
      <div class="sb-head flex h-14 items-center gap-2.5 px-5">
        <img src="../assets/img/logo.svg" alt="" width="28" height="28" class="h-7 w-7 shrink-0 rounded-md" />
        <span class="mini-hide whitespace-nowrap text-[15px] font-semibold tracking-tight">SPMB <span class="font-normal text-ink-500">Admin</span></span>
      </div>
      <nav class="flex-1 overflow-y-auto overflow-x-hidden px-3 py-4">
        <p class="mini-hide px-3 pb-1.5 font-mono text-[11.5px] uppercase tracking-wider text-ink-500">Ringkasan</p>
        ${link(all[0])}
        <p class="mini-hide mt-5 px-3 pb-1.5 font-mono text-[11.5px] uppercase tracking-wider text-ink-500">Modul</p>
        <hr class="mini-show my-3 hidden border-hairline" />
        ${modules.map((m) => (m.sub ? linkInduk(m) + subMenu(m) : link(m))).join("")}
      </nav>
      <div class="sb-alat mx-3 mb-3 hidden items-center gap-1.5 lg:flex">
        <button type="button" data-mini aria-controls="adminSidebar" class="sb-mini-row flex h-9 min-w-0 flex-1 items-center gap-2 whitespace-nowrap rounded-md px-3 text-[14px] font-medium text-ink-600 shadow-[inset_0_0_0_1px_rgb(var(--hairline))] hover:bg-pink-50 hover:text-ink-900 hover:shadow-[inset_0_0_0_1px_rgb(var(--pink-200))] lg:flex"><svg class="mini-arah shrink-0" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 17l-5-5 5-5M18 17l-5-5 5-5"/></svg><span class="mini-hide">Kecilkan</span></button>
        <button type="button" data-bunyi aria-pressed="false" class="grid h-9 w-9 shrink-0 place-items-center rounded-full text-ink-600 shadow-[inset_0_0_0_1px_rgb(var(--garis-tombol))] hover:bg-sand hover:text-ink-900 aria-pressed:text-pink-600 aria-pressed:shadow-[inset_0_0_0_1px_rgb(var(--pink-200))]"><svg class="ikon-bunyi-nyala" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 5L6 9H3v6h3l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13"/></svg><svg class="ikon-bunyi-mati" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 5L6 9H3v6h3l5 4z"/><path d="M16 9l5 6M21 9l-5 6"/></svg></button>
        <button type="button" data-tema data-kiosk-hide class="btn grid h-9 w-9 shrink-0 place-items-center rounded-full text-ink-600 shadow-[inset_0_0_0_1px_rgb(var(--garis-tombol))] hover:bg-sand hover:text-ink-900" aria-label="Ganti ke mode gelap" title="Ganti ke mode gelap"><svg class="ikon-bulan" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/></svg><svg class="ikon-matahari" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg></button>
      </div>
      <button type="button" data-mini aria-controls="adminSidebar" class="sb-handle absolute -right-3.5 top-[4.5rem] hidden h-7 w-7 place-items-center rounded-full border border-hairline bg-white text-ink-600 shadow-[0_2px_6px_rgba(0,0,0,0.12)] hover:border-pink-500 hover:bg-pink-500 hover:text-white lg:grid"><svg class="mini-arah shrink-0" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 17l-5-5 5-5M18 17l-5-5 5-5"/></svg></button>
      <div class="sb-foot flex items-center gap-3 border-t border-hairline p-4">
        <span class="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-sand text-[13px] font-semibold text-ink-900" title="${esc(name)}">${esc(initials(name))}</span>
        <span class="mini-hide min-w-0 flex-1 leading-tight">
          <span class="block truncate text-[14px] font-medium">${esc(name)}</span>
          <span class="block truncate text-[12.5px] text-ink-500">${esc(A.ROLE_LABEL[profile.role])}</span>
        </span>
        <button id="btnLogout" type="button" title="Keluar" class="inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-[13px] font-medium text-ink-600 hover:bg-sand hover:text-ink-900"><svg class="mini-show hidden" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 17l-5-5 5-5M5 12h11"/></svg><span class="mini-hide">Keluar</span><span class="mini-show sr-only">Keluar</span></button>
      </div>`;
    document.body.appendChild(aside);

    // Sub-menu: TERTUTUP saat panel dibuka (panel tetap ringkas). Dibuka lewat panah
    // atau klik menu induknya; buka/tutup beranimasi halus (tinggi + transparansi).
    const aturSub = (tombol, buka, halus) => {
      const id = tombol.dataset.subToggle;
      const wadah = aside.querySelector(`#sub-${id}`);
      tombol.setAttribute("aria-expanded", String(buka));
      const panah = tombol.querySelector("[data-panah]");
      if (panah) panah.style.transform = buka ? "" : "rotate(-90deg)";
      if (!wadah) return;
      wadah.style.overflow = "hidden";
      const gerak = halus && !(root.matchMedia && root.matchMedia("(prefers-reduced-motion: reduce)").matches);
      if (!gerak) {
        wadah.hidden = !buka;
        wadah.style.maxHeight = "";
        return;
      }
      wadah.style.transition = "max-height .22s ease, opacity .22s ease";
      if (buka) {
        wadah.hidden = false;
        wadah.style.maxHeight = "0px";
        wadah.style.opacity = "0";
        requestAnimationFrame(() => {
          wadah.style.maxHeight = wadah.scrollHeight + "px";
          wadah.style.opacity = "1";
        });
        setTimeout(() => tombol.getAttribute("aria-expanded") === "true" && (wadah.style.maxHeight = ""), 260);
      } else {
        wadah.style.maxHeight = wadah.scrollHeight + "px";
        requestAnimationFrame(() => {
          wadah.style.maxHeight = "0px";
          wadah.style.opacity = "0";
        });
        setTimeout(() => tombol.getAttribute("aria-expanded") === "false" && (wadah.hidden = true), 240);
      }
    };
    aside.querySelectorAll("[data-sub-toggle]").forEach((t) => aturSub(t, false, false));
    aside.addEventListener("click", (e) => {
      const t = e.target.closest("[data-sub-toggle]");
      if (t) return aturSub(t, t.getAttribute("aria-expanded") !== "true", true);
      // klik menu induk (mis. "Superadmin") ikut membuka sub-menunya
      const induk = e.target.closest("a[data-nav]");
      const panah = induk && aside.querySelector(`[data-sub-toggle="${induk.dataset.nav}"]`);
      if (panah && panah.getAttribute("aria-expanded") !== "true") aturSub(panah, true, true);
    });
    try {
      Object.keys(localStorage).filter((k) => k.startsWith("spmb-admin-sub-")).forEach((k) => localStorage.removeItem(k));
    } catch {}

    const overlay = document.createElement("div");
    overlay.className = "fixed inset-0 z-40 hidden bg-black/30 lg:hidden";
    overlay.id = "sidebarOverlay";
    document.body.appendChild(overlay);
    const setOpen = (open) => {
      document.body.classList.toggle("sidebar-open", open);
      overlay.classList.toggle("hidden", !open);
      const t = document.getElementById("btnMenu");
      if (t) t.setAttribute("aria-expanded", String(open));
    };
    overlay.addEventListener("click", () => setOpen(false));
    // HP: tutup laci setelah memilih menu
    aside.addEventListener("click", (e) => e.target.closest("a[data-nav], a[data-nav-sub]") && setOpen(false));
    setActiveNav(active, current.title);
    document.addEventListener("keydown", (e) => e.key === "Escape" && setOpen(false));

    // Bar atas hanya untuk HP: tombol menu + nama panel + bunyi & tema.
    // Di laptop semuanya sudah ada di sidebar (judul halaman ada di isi halaman).
    header.className = "sticky top-0 z-30 border-b border-hairline bg-white/85 backdrop-blur lg:hidden";
    header.innerHTML = `
      <div class="grid h-14 grid-cols-[1fr_auto_1fr] items-center gap-3 px-4 sm:px-6">
        <button id="btnMenu" type="button" class="grid h-9 w-9 place-items-center justify-self-start rounded-full shadow-[inset_0_0_0_1px_rgb(var(--garis-tombol))] hover:bg-sand" aria-label="Buka menu" aria-expanded="false" aria-controls="adminSidebar"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg></button>
        <span id="crumbTitle" class="truncate text-[15px] font-semibold tracking-tight">${esc(current.title)}</span>
        <div class="flex items-center gap-2 justify-self-end"><button type="button" data-bunyi aria-pressed="false" class="grid h-9 w-9 shrink-0 place-items-center rounded-full text-ink-600 shadow-[inset_0_0_0_1px_rgb(var(--garis-tombol))] hover:bg-sand hover:text-ink-900 aria-pressed:text-pink-600 aria-pressed:shadow-[inset_0_0_0_1px_rgb(var(--pink-200))]"><svg class="ikon-bunyi-nyala" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 5L6 9H3v6h3l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13"/></svg><svg class="ikon-bunyi-mati" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 5L6 9H3v6h3l5 4z"/><path d="M16 9l5 6M21 9l-5 6"/></svg></button><button type="button" data-tema data-kiosk-hide class="btn grid h-9 w-9 shrink-0 place-items-center rounded-full text-ink-600 shadow-[inset_0_0_0_1px_rgb(var(--garis-tombol))] hover:bg-sand hover:text-ink-900" aria-label="Ganti ke mode gelap" title="Ganti ke mode gelap"><svg class="ikon-bulan" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/></svg><svg class="ikon-matahari" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg></button></div>
      </div>`;
    document.getElementById("btnMenu").addEventListener("click", () => setOpen(!document.body.classList.contains("sidebar-open")));
    document.getElementById("btnLogout").addEventListener("click", () => A.logout());
    // Laptop: sidebar bisa dikecilkan jadi ikon saja (diingat di browser ini)
    const tombolMini = aside.querySelectorAll("[data-mini]");
    const setMini = (mini) => {
      document.body.classList.toggle("sidebar-mini", mini);
      const teks = mini ? "Lebarkan menu" : "Kecilkan menu";
      tombolMini.forEach((b) => {
        b.setAttribute("aria-expanded", String(!mini));
        b.setAttribute("aria-label", teks);
        b.title = teks;
        const span = b.querySelector("span");
        if (span) span.textContent = mini ? "Lebarkan" : "Kecilkan";
      });
      try { root.localStorage.setItem(MINI_KEY, mini ? "1" : "0"); } catch (_) {}
    };
    let miniAwal = false;
    try { miniAwal = root.localStorage.getItem(MINI_KEY) === "1"; } catch (_) {}
    setMini(miniAwal);
    tombolMini.forEach((b) => b.addEventListener("click", () => setMini(!document.body.classList.contains("sidebar-mini"))));
    const tombolBunyi = document.querySelectorAll("[data-bunyi]");
    const paint = () => {
      const on = soundOn();
      const teks = on ? "Bunyi pendaftar baru: nyala (klik untuk mematikan)" : "Bunyi pendaftar baru: mati (klik untuk menyalakan)";
      tombolBunyi.forEach((b) => {
        b.setAttribute("aria-pressed", String(on));
        b.setAttribute("aria-label", teks);
        b.title = teks;
      });
    };
    tombolBunyi.forEach((b) =>
      b.addEventListener("click", () => {
        try { root.localStorage.setItem(SOUND_KEY, soundOn() ? "0" : "1"); } catch (_) {}
        paint();
        if (soundOn()) beep();
      })
    );
    paint();
  }

  /* ---------- pendaftar baru: langsung muncul, cek berkala yang hemat ---------- */
  const POLL_MS = 30000;
  const SOUND_KEY = "spmb-bunyi";
  const soundOn = () => {
    try { return root.localStorage.getItem(SOUND_KEY) === "1"; } catch (_) { return false; }
  };
  // Bunyi pendaftar baru: lonceng tiga nada naik (G5–B5–E6), diputar 2x (±2 detik).
  // f = frekuensi (Hz), t = mulai (detik), d = lama dengung, v = volume puncak.
  function polaBunyi() {
    const lonceng = [784, 988, 1319];
    const nada = [];
    [0, 1.05].forEach((mulai) =>
      lonceng.forEach((f, i) => nada.push({ f, t: mulai + i * 0.17, d: i === 2 ? 0.9 : 0.55, v: i === 2 ? 0.34 : 0.26 }))
    );
    return nada;
  }

  let audioCtx = null;
  function beep() {
    try {
      const Ctx = root.AudioContext || root.webkitAudioContext;
      if (!Ctx) return;
      audioCtx = audioCtx || new Ctx();
      const ac = audioCtx;
      if (ac.state === "suspended") ac.resume();
      // limiter agar suara keras tetap jernih (tidak pecah)
      const limiter = ac.createDynamicsCompressor();
      limiter.threshold.value = -6;
      limiter.ratio.value = 12;
      limiter.connect(ac.destination);
      const t0 = ac.currentTime + 0.05;
      polaBunyi().forEach((n) => {
        // nada dasar + dentang oktaf atas yang lebih pelan → terdengar seperti lonceng
        [
          [n.f, "triangle", n.v],
          [n.f * 2, "sine", n.v * 0.35],
        ].forEach(([f, type, v]) => {
          const o = ac.createOscillator();
          const g = ac.createGain();
          o.type = type;
          o.frequency.value = f;
          const mulai = t0 + n.t;
          g.gain.setValueAtTime(0.0001, mulai);
          g.gain.exponentialRampToValueAtTime(v, mulai + 0.012);
          g.gain.exponentialRampToValueAtTime(0.0001, mulai + n.d);
          o.connect(g).connect(limiter);
          o.start(mulai);
          o.stop(mulai + n.d + 0.05);
        });
      });
    } catch (_) {}
  }

  // Simpan jumlah Diterima per jurusan ke database (dasar kuota yang dilihat pengunjung).
  // Hanya superadmin/verifikasi; hanya dikirim bila angkanya berbeda dari yang terakhir dikirim; gagal diam-diam.
  let sinkronTerakhir = "";
  async function sinkronDiterima(verif, daftar, role) {
    const peran = role || (petugasAktif && petugasAktif.role);
    if (!["superadmin", "verifikasi"].includes(peran) || !root.AdminAuth) return;
    const hitung = hitungDiterima(verif, daftar);
    const isi = JSON.stringify(hitung);
    if (isi === sinkronTerakhir) return;
    try {
      const { error } = await root.AdminAuth.getClient().rpc("perbarui_diterima", { p_hitung: hitung });
      if (!error) sinkronTerakhir = isi;
    } catch (_) {}
  }

  const ACTIVE_WATCHERS = new Set();
  const stopAllWatchers = () => [...ACTIVE_WATCHERS].forEach((w) => w.stop());
  // Daftarkan pemantau lain (mis. realtime riwayat) agar ikut dihentikan saat pindah modul
  const daftarPengamat = (w) => {
    ACTIVE_WATCHERS.add(w);
    return () => ACTIVE_WATCHERS.delete(w);
  };

  // Langsung (realtime hemat): tiap 30 detik, hanya saat tab terlihat, SATU permintaan kecil
  // yang hanya meminta baris setelah yang sudah tampil. Tab yang disembunyikan tidak memanggil
  // server sama sekali; begitu dibuka lagi langsung cek. Permintaan tidak pernah menumpuk.
  // getKnown() → jumlah baris yang sudah tampil; onNew(rows) dipanggil bila ada baris baru
  // (penerima menambahkannya ke tabel, sehingga getKnown() ikut naik).
  function watchNew(sheet, getKnown, onNew) {
    let busy = false;
    async function check() {
      if (busy || document.visibilityState !== "visible") return;
      busy = true;
      try {
        const rows = await root.Sheetson.rowsAfter(sheet, getKnown());
        if (rows.length) {
          if (soundOn()) beep();
          await onNew(rows);
        }
      } catch (_) {
        // jaringan putus sesaat: coba lagi di putaran berikutnya
      } finally {
        busy = false;
      }
    }
    const timer = setInterval(check, POLL_MS);
    const onVisible = () => document.visibilityState === "visible" && check();
    document.addEventListener("visibilitychange", onVisible);
    const handle = {
      check,
      stop: () => {
        clearInterval(timer);
        document.removeEventListener("visibilitychange", onVisible);
        ACTIVE_WATCHERS.delete(handle);
      },
    };
    ACTIVE_WATCHERS.add(handle);
    return handle;
  }

  // Pemberitahuan di atas tabel + judul tab: jumlah pendaftar baru yang BELUM dilihat.
  // Baris baru diwarnai di tabel; angka turun saat barisnya diklik. onDismiss = "tandai semua dilihat".
  function newBanner(container, onDismiss) {
    const baseTitle = document.title;
    const el = document.createElement("div");
    el.className = "hidden";
    el.setAttribute("role", "status");
    container.appendChild(el);
    return (n) => {
      document.title = tabTitle(baseTitle, n);
      if (!n) {
        el.className = "hidden";
        el.innerHTML = "";
        return;
      }
      el.className = "mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-pink-100 bg-pink-50 px-4 py-3";
      el.innerHTML = `<span class="flex items-center gap-2 text-[14.5px]"><span class="relative flex h-2 w-2"><span class="absolute inline-flex h-full w-full animate-ping rounded-full bg-pink-400 opacity-60"></span><span class="relative inline-flex h-2 w-2 rounded-full bg-pink-500"></span></span><b class="font-semibold">${n} pendaftar baru</b> belum dilihat · ditandai warna pink, klik barisnya bila sudah dibaca</span>
        <button type="button" class="rounded-md bg-ink-900 px-3 py-1.5 text-[14px] font-medium text-white hover:opacity-90">Tandai semua dilihat</button>`;
      el.querySelector("button").addEventListener("click", onDismiss);
    };
  }

  // Tandai menu aktif & judul lokasi tanpa merender ulang kerangka
  const NAV_ON = ["bg-pink-50", "font-medium", "text-ink-900", "shadow-[inset_2px_0_0_#EC4899]"];
  const NAV_OFF = ["text-ink-600", "hover:bg-brand-50", "hover:text-ink-900"];
  function setActiveNav(id, title, sub) {
    document.querySelectorAll("#adminSidebar a[data-nav]").forEach((a) => {
      const on = a.dataset.nav === id;
      NAV_ON.forEach((c) => a.classList.toggle(c, on));
      NAV_OFF.forEach((c) => a.classList.toggle(c, !on));
      if (on && !sub) a.setAttribute("aria-current", "page");
      else a.removeAttribute("aria-current");
    });
    document.querySelectorAll("#adminSidebar a[data-nav-sub]").forEach((a) => {
      const on = !!sub && a.dataset.navSub === `${id}/${sub}`;
      ["bg-pink-50", "font-medium", "text-ink-900"].forEach((c) => a.classList.toggle(c, on));
      a.classList.toggle("text-ink-600", !on);
      if (on) a.setAttribute("aria-current", "page");
      else a.removeAttribute("aria-current");
    });
    const crumb = document.getElementById("crumbTitle");
    if (crumb && title) crumb.textContent = title;
  }

  // Angka ringkasan. stats: [{label, value, tone?: ok|bad|wait|info}]
  function statCards(stats) {
    return `<dl class="grid grid-cols-2 border-y border-hairline sm:grid-cols-3 lg:grid-cols-${Math.min(stats.length, 5)}">${stats
      .map(
        (st) => `<div class="border-hairline py-4 pr-4 [&:not(:first-child)]:sm:border-l [&:not(:first-child)]:sm:pl-5">
          <dt class="flex items-center gap-1.5 text-[13px] text-ink-500">${st.tone ? `<span class="h-1.5 w-1.5 rounded-full" style="background:${TONE_DOT[st.tone]}" aria-hidden="true"></span>` : ""}${esc(st.label)}</dt>
          <dd class="mt-1 text-[28px] font-semibold leading-none tracking-tight tabular-nums">${esc(st.value)}</dd>
        </div>`
      )
      .join("")}</dl>`;
  }

  // Dialog ubah data. fields: [{name, label, type: select|text|number|textarea|date, options, help}]
  function openDialog({ title, subtitle, fields, values, onSave }) {
    const overlay = document.createElement("div");
    overlay.className = "fixed inset-0 z-[60] bg-black/30";
    overlay.setAttribute("data-admin-overlay", "");
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    const box = document.createElement("form");
    box.className = "drawer absolute inset-y-0 right-0 flex w-full max-w-md flex-col border-l border-hairline bg-white shadow-soft";
    box.noValidate = true;
    box.innerHTML = `
      <div class="flex items-start justify-between gap-3 border-b border-hairline px-5 py-4">
        <div class="min-w-0">
          <h2 class="truncate text-[17px] font-semibold tracking-tight">${esc(title)}</h2>
          ${subtitle ? `<p class="mt-0.5 font-mono text-[12.5px] text-ink-500">${esc(subtitle)}</p>` : ""}
        </div>
        <button type="button" data-cancel class="rounded-md px-2 py-1 text-[13px] font-medium text-ink-600 hover:bg-sand" aria-label="Tutup">Tutup</button>
      </div>
      <div class="flex-1 space-y-5 overflow-y-auto px-5 py-5" data-fields></div>
      <div class="border-t border-hairline px-5 py-4">
        <p data-error class="mb-3 hidden bg-red-50 p-3 text-[14px] font-medium text-red-700"></p>
        <div class="flex justify-end gap-2">
          <button type="button" data-cancel class="btn rounded-full px-5 py-2.5 text-[14.5px] font-medium shadow-[inset_0_0_0_1px_rgb(var(--garis-tombol))]">Batal</button>
          <button type="submit" data-save class="btn rounded-full bg-ink-900 px-6 py-2.5 text-[14.5px] font-medium text-white disabled:opacity-60">Simpan</button>
        </div>
      </div>`;
    const wrap = box.querySelector("[data-fields]");
    const inputs = {};
    fields.forEach((f) => {
      const id = `dlg-${f.name}`;
      const div = document.createElement("div");
      const label = document.createElement("label");
      label.htmlFor = id;
      label.className = "mb-1.5 block text-[14px] font-medium";
      label.textContent = f.label;
      div.appendChild(label);
      let input;
      if (f.type === "select") {
        input = document.createElement("select");
        const current = String(values[f.name] ?? "");
        const opts = f.options.includes(current) || current === "" ? f.options : [current, ...f.options];
        opts.forEach((o) => {
          const opt = document.createElement("option");
          opt.value = o;
          opt.textContent = o === "" ? "-" : o;
          input.appendChild(opt);
        });
      } else if (f.type === "textarea") {
        input = document.createElement("textarea");
        input.rows = 3;
      } else {
        input = document.createElement("input");
        input.type = f.type || "text";
        if (f.type === "number") input.inputMode = "decimal";
      }
      input.id = id;
      input.className = "w-full rounded-md border border-line/60 bg-white px-3 py-2.5 text-[15px] focus:border-ink-900 focus:outline-none focus:ring-2 focus:ring-pink-500/30";
      const v = values[f.name];
      // "-" adalah tanda sel kosong di sheet; tampilkan sebagai kosong (kecuali pilihan yang memang berisi "-")
      input.value = v === undefined || v === null || (v === "-" && f.type !== "select") ? "" : String(v);
      div.appendChild(input);
      if (f.help) {
        const p = document.createElement("p");
        p.className = "mt-1 text-[13px] text-ink-500";
        p.textContent = f.help;
        div.appendChild(p);
      }
      wrap.appendChild(div);
      inputs[f.name] = input;
    });
    overlay.appendChild(box);
    document.body.appendChild(overlay);
    const first = box.querySelector("input, select, textarea");
    if (first) first.focus();

    const close = () => {
      overlay.remove();
      document.removeEventListener("keydown", onKey);
    };
    const onKey = (e) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", onKey);
    box.querySelectorAll("[data-cancel]").forEach((b) => b.addEventListener("click", close));
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) close();
    });

    box.addEventListener("submit", async (e) => {
      e.preventDefault();
      const after = {};
      fields.forEach((f) => {
        const raw = inputs[f.name].value.trim();
        after[f.name] = f.type === "number" && raw !== "" ? Number(raw) : raw === "" ? "-" : raw;
      });
      const errEl = box.querySelector("[data-error]");
      const saveBtn = box.querySelector("[data-save]");
      saveBtn.disabled = true;
      saveBtn.textContent = "Menyimpan…";
      errEl.classList.add("hidden");
      try {
        await onSave(after);
        close();
      } catch (err) {
        errEl.textContent = err.message || "Gagal menyimpan. Coba lagi.";
        errEl.classList.remove("hidden");
        saveBtn.disabled = false;
        saveBtn.textContent = "Simpan";
      }
    });
  }

  function downloadFile(filename, text, type = "text/csv;charset=utf-8") {
    const url = URL.createObjectURL(new Blob([text], { type }));
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  /* ---------- halaman modul generik ----------
     config: { sheet, title, intro, filter: {field, label, options},
               stats(rows) → [{label, value, tone, filter}],
               columns: [{label, render(row), sortKey?}], fields, editTitle(row),
               beforeSave(changes, row) → changes, actions: [{label, show(row), run(row, page)}] } */
  const PAGE_SIZES = [25, 50, 100];
  const SIZE_KEY = "spmb-admin-per-halaman";
  const savedSize = () => {
    try {
      const n = Number(localStorage.getItem(SIZE_KEY));
      return PAGE_SIZES.includes(n) ? n : 25;
    } catch {
      return 25;
    }
  };
  // Kolom "Waktu daftar" otomatis di setiap modul (diambil dari Data_Pendaftar)
  const WAKTU_COL = {
    label: "Waktu daftar",
    sortKey: "_waktu",
    render: (r) => `<span class="whitespace-nowrap font-mono text-[13px] text-ink-600">${esc(formatWaktu(r._waktuAsli))}</span>`,
  };

  // Pustaka dimuat hanya saat petugas menekan ekspor (halaman admin tetap ringan)
  const PUSTAKA = {
    pdf: ["https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js", "https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js"],
    xlsx: ["https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js"],
  };
  const skripDimuat = {};
  function muatSkrip(src) {
    if (!skripDimuat[src])
      skripDimuat[src] = new Promise((ok, gagal) => {
        const el = document.createElement("script");
        el.src = src;
        el.onload = ok;
        el.onerror = () => {
          delete skripDimuat[src];
          el.remove();
          gagal(new Error("pustaka tidak termuat, periksa koneksi internet"));
        };
        document.head.appendChild(el);
      });
    return skripDimuat[src];
  }
  const NAMA_SEKOLAH = "SMK Tamansiswa Jetis";
  const dicetakTeks = () => {
    const oleh = petugasAktif ? ` oleh ${petugasAktif.nama_lengkap || petugasAktif.email}` : "";
    return `Dicetak ${formatWaktu(new Date().toISOString())} WIB${oleh}`;
  };

  async function eksporExcel(lap) {
    await muatSkrip(PUSTAKA.xlsx[0]);
    const X = root.XLSX;
    const atas = [[`Laporan ${lap.judul} - SPMB ${NAMA_SEKOLAH}`], [`Filter: ${lap.keterangan}`], [`Jumlah: ${lap.body.length} pendaftar · ${dicetakTeks()}`], []];
    const ws = X.utils.aoa_to_sheet([...atas, lap.header, ...lap.body]);
    // lebar kolom mengikuti isi terpanjang (dibatasi)
    ws["!cols"] = lap.header.map((h, i) => ({ wch: Math.min(48, Math.max(String(h).length, ...lap.body.map((r) => String(r[i] ?? "").length)) + 2) }));
    ws["!autofilter"] = { ref: X.utils.encode_range({ s: { r: atas.length, c: 0 }, e: { r: atas.length + lap.body.length, c: lap.header.length - 1 } }) };
    const wb = X.utils.book_new();
    X.utils.book_append_sheet(wb, ws, lap.judul.replace(/[\\/?*[\]:]/g, " ").slice(0, 31));
    X.writeFile(wb, namaFileLaporan(lap.judul, "xlsx"));
  }

  async function eksporPdf(lap) {
    for (const src of PUSTAKA.pdf) await muatSkrip(src);
    const { jsPDF } = root.jspdf;
    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    const lebar = doc.internal.pageSize.getWidth();
    const tinggi = doc.internal.pageSize.getHeight();
    const hijau = [22, 82, 58];
    doc.setFillColor(...hijau);
    doc.roundedRect(12, 11, 9, 9, 2.4, 2.4, "F");
    doc.setTextColor(255, 255, 255).setFont("helvetica", "bold").setFontSize(9).text("TS", 16.5, 17, { align: "center" });
    doc.setTextColor(110, 110, 110).setFont("helvetica", "normal").setFontSize(9).text(`SPMB ${NAMA_SEKOLAH}`, 24, 14.5);
    doc.setTextColor(17, 17, 17).setFont("helvetica", "bold").setFontSize(14).text(`Laporan ${lap.judul}`, 24, 20);
    doc.setFont("helvetica", "normal").setFontSize(9).setTextColor(70, 70, 70);
    const ket = doc.splitTextToSize(`Filter: ${lap.keterangan}`, lebar - 24);
    doc.text(ket, 12, 27);
    const yInfo = 27 + ket.length * 4;
    doc.text(`Jumlah: ${lap.body.length} pendaftar   ·   ${dicetakTeks()}`, 12, yInfo);
    doc.autoTable({
      head: [lap.header],
      body: lap.body,
      startY: yInfo + 4,
      margin: { left: 12, right: 12, bottom: 14 },
      styles: { font: "helvetica", fontSize: 7.5, cellPadding: 1.6, overflow: "linebreak", lineColor: [225, 225, 225], lineWidth: 0.1, textColor: [30, 30, 30] },
      headStyles: { fillColor: hijau, textColor: 255, fontStyle: "bold" },
      alternateRowStyles: { fillColor: [246, 246, 246] },
      columnStyles: { 0: { halign: "right", cellWidth: 8 } },
      didDrawPage: () => {
        doc.setFontSize(8).setTextColor(130, 130, 130);
        doc.text(`${NAMA_SEKOLAH} · Laporan ${lap.judul}`, 12, tinggi - 7);
        doc.text(`Halaman ${doc.internal.getNumberOfPages()}`, lebar - 12, tinggi - 7, { align: "right" });
      },
    });
    doc.save(namaFileLaporan(lap.judul, "pdf"));
  }

  function modulePage(config) {
    const columns = [config.columns[0], WAKTU_COL, ...config.columns.slice(1)];
    const app = document.getElementById("app");
    app.innerHTML = `
      <div class="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 class="text-[26px] font-semibold tracking-tight">${esc(config.title)}</h1>
          <p class="mt-1 text-[15px] text-ink-600">${esc(config.intro)}</p>
        </div>
      </div>
      <div id="stats" class="mt-6"></div>
      <div class="mt-6 flex flex-col gap-3 border-b border-hairline lg:flex-row lg:items-end lg:justify-between">
        <div id="tabs" class="no-scrollbar -mb-px flex gap-5 overflow-x-auto" role="tablist" aria-label="${esc(config.filter.label)}"></div>
        <div class="flex gap-2 pb-3">
          <label for="q" class="sr-only">Cari</label>
          <input id="q" type="search" class="min-w-0 flex-1 rounded-md border border-line/60 bg-white px-3 py-2 text-[14.5px] focus:border-ink-900 focus:outline-none focus:ring-2 focus:ring-pink-500/30 lg:w-80 lg:flex-none" placeholder="Cari nama, NISN, atau no. pendaftaran" />
          <label for="f" class="sr-only">${esc(config.filter.label)}</label>
          <select id="f" class="sr-only" tabindex="-1">
            <option value="">Semua</option>${config.filter.options.map((o) => `<option>${esc(o)}</option>`).join("")}
          </select>
          <div class="relative">
            <button type="button" id="filterBtn" aria-expanded="false" aria-controls="filterPanel" class="inline-flex h-full items-center gap-1.5 rounded-md bg-white px-3.5 py-2 text-[14.5px] font-medium shadow-[inset_0_0_0_1px_rgb(var(--garis-tombol))] hover:bg-sand">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 5h18l-7 8.5V19l-4 2v-7.5z"/></svg>
              Filter<span id="filterN" class="hidden min-w-5 rounded-full bg-pink-500 px-1.5 text-center font-mono text-[11.5px] leading-5 text-white"></span>
            </button>
            <div id="filterPanel" role="dialog" aria-label="Filter" tabindex="-1" class="absolute right-0 top-full z-30 mt-2 hidden w-[min(calc(100vw-2rem),34rem)] overflow-y-auto overscroll-contain rounded-lg border border-hairline bg-white p-4 text-left shadow-[0_12px_32px_rgba(0,0,0,0.12)]">
              <div class="flex items-center justify-between">
                <h2 class="text-[15px] font-semibold">Filter</h2>
                <button type="button" data-tutup class="grid h-8 w-8 place-items-center rounded-md text-[20px] leading-none text-ink-500 hover:bg-sand hover:text-ink-900" aria-label="Tutup filter">×</button>
              </div>
              <div id="saringSel" class="mt-3 grid gap-3 sm:grid-cols-2"></div>
              <div id="tglBar" class="mt-4 border-t border-hairline pt-4" role="group" aria-label="Tanggal daftar">
                <p class="text-[12.5px] text-ink-500">Tanggal daftar</p>
                <div class="mt-1 flex items-center gap-2">
                  <label for="tglDari" class="sr-only">Dari tanggal</label>
                  <input id="tglDari" type="date" class="rounded-md border border-line/60 bg-white px-2.5 py-1.5 text-[14px] focus:border-ink-900 focus:outline-none focus:ring-2 focus:ring-pink-500/30 min-w-0 flex-1" />
                  <span class="text-ink-500" aria-hidden="true">–</span>
                  <label for="tglSampai" class="sr-only">Sampai tanggal</label>
                  <input id="tglSampai" type="date" class="rounded-md border border-line/60 bg-white px-2.5 py-1.5 text-[14px] focus:border-ink-900 focus:outline-none focus:ring-2 focus:ring-pink-500/30 min-w-0 flex-1" />
                </div>
                <div class="mt-2 flex flex-wrap gap-1">
                  <button type="button" data-tgl="hari" class="rounded-full px-3 py-1.5 text-[13.5px] font-medium shadow-[inset_0_0_0_1px_rgb(var(--garis-tombol))] hover:bg-sand">Hari ini</button>
                  <button type="button" data-tgl="kemarin" class="rounded-full px-3 py-1.5 text-[13.5px] font-medium shadow-[inset_0_0_0_1px_rgb(var(--garis-tombol))] hover:bg-sand">Kemarin</button>
                  <button type="button" data-tgl="7" class="rounded-full px-3 py-1.5 text-[13.5px] font-medium shadow-[inset_0_0_0_1px_rgb(var(--garis-tombol))] hover:bg-sand">7 hari</button>
                </div>
              </div>
              <div class="mt-4 flex items-center justify-between gap-2 border-t border-hairline pt-3">
                <button type="button" id="saringReset" class="rounded-full px-3 py-2 text-[13.5px] font-medium text-pink-600 hover:bg-pink-50 disabled:invisible">Hapus semua</button>
                <button type="button" data-tutup id="filterLihat" class="rounded-full bg-ink-900 px-4 py-2 text-[14px] font-medium text-white hover:opacity-90">Tampilkan</button>
              </div>
            </div>
          </div>
          <div class="relative">
            <button type="button" id="eksporBtn" aria-expanded="false" aria-controls="eksporMenu" aria-label="Ekspor laporan" class="inline-flex h-full items-center gap-1.5 rounded-md bg-white px-3.5 py-2 text-[14.5px] font-medium shadow-[inset_0_0_0_1px_rgb(var(--garis-tombol))] hover:bg-sand">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 4v11M7 10l5 5 5-5M5 20h14"/></svg>
              <span class="hidden sm:inline">Ekspor</span>
            </button>
            <div id="eksporMenu" role="dialog" aria-label="Ekspor laporan" tabindex="-1" class="absolute right-0 top-full z-30 mt-2 hidden w-[min(calc(100vw-2rem),20rem)] rounded-lg border border-hairline bg-white p-2 text-left shadow-[0_12px_32px_rgba(0,0,0,0.12)]">
              <p id="eksporInfo" class="px-2 pb-2 pt-1 text-[13px] leading-snug text-ink-500"></p>
              <button type="button" data-ekspor="xlsx" class="flex w-full items-center gap-3 rounded-md px-2 py-2.5 text-left hover:bg-sand disabled:opacity-50">
                <span class="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-ok-50 font-mono text-[11px] font-semibold text-ok-700">XLS</span>
                <span><span data-judul class="block text-[14.5px] font-medium">Excel (.xlsx)</span><span class="block text-[12.5px] text-ink-500">Untuk diolah, dijumlah, atau difilter lagi</span></span>
              </button>
              <button type="button" data-ekspor="pdf" class="flex w-full items-center gap-3 rounded-md px-2 py-2.5 text-left hover:bg-sand disabled:opacity-50">
                <span class="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-pink-50 font-mono text-[11px] font-semibold text-pink-600">PDF</span>
                <span><span data-judul class="block text-[14.5px] font-medium">PDF</span><span class="block text-[12.5px] text-ink-500">Siap cetak / dikirim sebagai laporan</span></span>
              </button>
            </div>
          </div>
        </div>
      </div>
      <div id="filterAktif" class="mt-3 flex flex-wrap gap-1.5 empty:hidden"></div>
      <div id="newSlot"></div>
      <p id="count" class="mt-4 h-5 font-mono text-[12.5px] text-ink-500" aria-live="polite"></p>
      <div id="list" class="mt-2"><div class="space-y-2" aria-hidden="true">${'<div class="skeleton h-12"></div>'.repeat(8)}</div></div>
      <div id="pager" class="mt-4"></div>`;

    const page = { rows: [], reload: () => load(true), rerender: render };
    // Bawaan: pendaftar terbaru di atas
    const state = { page: 1, size: savedSize(), sortKey: "_waktu", sortDir: "desc" };
    const $q = app.querySelector("#q");
    const $dari = app.querySelector("#tglDari");
    const $sampai = app.querySelector("#tglSampai");
    const $f = app.querySelector("#f");
    const $count = app.querySelector("#count");
    const $list = app.querySelector("#list");
    const $pager = app.querySelector("#pager");
    const $stats = app.querySelector("#stats");
    const $tabs = app.querySelector("#tabs");
    const $saring = app.querySelector("#saringSel");
    const saringDefs = [...SARING_UMUM, ...(config.saring || [])];
    const pilihan = {};
    let currentStats = [];
    const terakhir = { rows: [], keterangan: "" };
    // Pendaftar baru yang masuk sendiri (rowIndex) dan belum diklik petugas
    const baru = new Set();
    const eBaru = (r) => baru.has(String(r.rowIndex));
    const lencanaBaru = '<span data-baru class="mr-1.5 inline-block rounded-full bg-pink-500 px-1.5 py-0.5 align-middle text-[10.5px] font-semibold uppercase leading-none tracking-wide text-white">Baru</span>';
    // Data diri (Data_Pendaftar) yang ditempelkan ke tiap baris; diingat agar baris baru cukup minta sedikit
    let diri = new Map();
    let jumlahDaftar = 0;
    const lengkapi = (r) => {
      const d = diri.get(String(r.noPendaftaran)) || {};
      r._waktuAsli = d.createdAt || "";
      r._waktu = waktuKey(r._waktuAsli);
      r._jurusan = d.jurusan1 || "";
      r._jk = d.jenisKelamin || "";
      r._asal = d.asalSekolah || "";
      r._nisn = d.nisn || "";
    };

    // Dropdown saringan; jumlah tiap pilihan dihitung dari semua data
    function renderSaring() {
      $saring.innerHTML = saringDefs
        .map((d) => {
          const on = !!pilihan[d.id];
          const opsi = opsiSaring(page.rows, d);
          if (on && !opsi.some((o) => o.value === pilihan[d.id])) opsi.push({ value: pilihan[d.id], n: 0 });
          return `<label class="flex flex-col gap-1 text-[12.5px] text-ink-500">${esc(d.label)}<select data-saring="${esc(d.id)}" class="w-full rounded-md border bg-white px-2.5 py-2 text-[14px] focus:border-ink-900 focus:outline-none focus:ring-2 focus:ring-pink-500/30 ${
            on ? "border-pink-500 font-medium text-ink-900" : "border-line/60 text-ink-900"
          }"><option value="">Semua</option>${opsi
            .map((o) => `<option value="${esc(o.value)}" ${o.value === pilihan[d.id] ? "selected" : ""}>${esc(o.value)} (${o.n})</option>`)
            .join("")}</select></label>`;
        })
        .join("");
    }

    function renderStats() {
      if (!config.stats) return;
      currentStats = config.stats(page.rows).filter((st) => st.filter === undefined);
      $stats.innerHTML = currentStats.length ? statCards(currentStats) : "";
    }

    function renderTabs() {
      const counts = new Map();
      page.rows.forEach((r) => {
        const v = r[config.filter.field] && r[config.filter.field] !== "-" ? r[config.filter.field] : config.filter.options[0];
        counts.set(v, (counts.get(v) || 0) + 1);
      });
      const tabs = [["", "Semua", page.rows.length], ...config.filter.options.map((o) => [o, o, counts.get(o) || 0])];
      $tabs.innerHTML = tabs
        .map(([value, label, n]) => {
          const on = $f.value === value;
          return `<button type="button" role="tab" aria-selected="${on}" data-tab-value="${esc(value)}" class="whitespace-nowrap border-b-2 pb-3 text-[14.5px] ${
            on ? "border-pink-500 font-medium text-ink-900" : "border-transparent text-ink-500 hover:text-ink-900"
          }">${esc(label)} <span class="ml-1 rounded-full bg-sand px-1.5 py-0.5 font-mono text-[11.5px] text-ink-600">${n}</span></button>`;
        })
        .join("");
    }

    function render() {
      renderTabs();
      let rows = filterTanggal(filterRows(page.rows, $q.value, { [config.filter.field]: $f.value }), $dari.value, $sampai.value);
      rows = saringTambahan(rows, saringDefs, pilihan);
      const adaTanggal = !!($dari.value || $sampai.value);
      const saringAktif = saringDefs.filter((d) => pilihan[d.id]);
      const nAktif = saringAktif.length + (adaTanggal ? 1 : 0);
      const $n = app.querySelector("#filterN");
      $n.textContent = nAktif;
      $n.classList.toggle("hidden", !nAktif);
      app.querySelector("#saringReset").disabled = !nAktif;
      app.querySelector("#filterLihat").textContent = `Tampilkan ${rows.length} pendaftar`;
      if (state.sortKey) rows = sortRows(rows, state.sortKey, state.sortDir);
      const pg = paginate(rows, state.page, state.size);
      state.page = pg.page;
      const tglTeks = (v) => formatWaktu(v + " 12:00:00").replace(/, .*$/, "");
      const [t1, t2] = [$dari.value, $sampai.value].filter(Boolean).sort();
      const rentang = !adaTanggal
        ? ""
        : t2 && t1 !== t2
          ? ` · ${tglTeks(t1)} – ${tglTeks(t2)}`
          : ` · ${$dari.value && $sampai.value ? "tanggal" : $dari.value ? "sejak" : "sampai"} ${tglTeks(t1)}`;
      const label = (key, teks) =>
        `<span class="inline-flex items-center gap-1 rounded-full bg-pink-50 py-1 pl-3 pr-1 text-[13px] text-ink-900 shadow-[inset_0_0_0_1px_rgb(var(--pink-200))]">${esc(teks)}<button type="button" data-hapus="${esc(key)}" class="grid h-5 w-5 place-items-center rounded-full text-[15px] leading-none text-ink-500 hover:bg-white hover:text-ink-900" aria-label="Hapus filter ${esc(teks)}">×</button></span>`;
      app.querySelector("#filterAktif").innerHTML =
        saringAktif.map((d) => label(d.id, `${d.label}: ${pilihan[d.id]}`)).join("") +
        (adaTanggal ? label("tanggal", `Tanggal daftar${rentang.replace(/^ · /, ": ")}`) : "");
      $count.textContent = `${rows.length} dari ${page.rows.length} pendaftar`;
      terakhir.rows = rows;
      terakhir.keterangan = keteranganFilter([
        $f.value ? `${config.filter.label}: ${$f.value}` : "",
        ...saringAktif.map((d) => `${d.label}: ${pilihan[d.id]}`),
        adaTanggal ? `Tanggal daftar${rentang.replace(/^ · /, ": ")}` : "",
        $q.value.trim() ? `Pencarian: "${$q.value.trim()}"` : "",
      ]);
      if (!rows.length) {
        $list.innerHTML = `<div class="rounded-lg border border-dashed border-hairline p-10 text-center text-[15px] text-ink-500">Tidak ada data yang cocok.</div>`;
        $pager.innerHTML = "";
        return;
      }
      const actionsHtml = (row) =>
        `<button type="button" data-edit="${esc(row.rowIndex)}" class="rounded-md px-3 py-1.5 text-[14px] font-medium shadow-[inset_0_0_0_1px_rgb(var(--garis-tombol))] hover:bg-sand">Ubah</button>` +
        `<button type="button" data-bukti="${esc(row.rowIndex)}" class="inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-[14px] font-medium text-ink-600 hover:bg-sand hover:text-ink-900 disabled:opacity-60" title="Unduh bukti pendaftaran (PDF, kertas F4)"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 4v12"/><path d="m7 11 5 5 5-5"/><path d="M5 20h14"/></svg>Bukti PDF</button>` +
        (config.actions || [])
          .filter((a) => !a.show || a.show(row))
          .map(
            (a, i) =>
              `<button type="button" data-action="${i}" data-row="${esc(row.rowIndex)}" class="rounded-md px-3 py-1.5 text-[14px] font-medium text-ink-600 hover:bg-sand hover:text-ink-900">${esc(a.label)}</button>`
          )
          .join("");
      // Kolom pertama (nama) & kolom aksi dibekukan; judul kolom menempel di atas.
      const STICKY_L = "sticky left-0 z-[1] shadow-[1px_0_0_rgb(var(--hairline))]";
      const STICKY_R = "sticky right-0 z-[1] shadow-[-1px_0_0_rgb(var(--hairline))]";
      const thCls = (i) =>
        `sticky top-0 border-b border-hairline bg-brand-50 px-4 py-3 font-medium whitespace-nowrap ${i === 0 ? "left-0 z-[3] min-w-[230px] shadow-[1px_0_0_rgb(var(--hairline))]" : "z-[2]"}`;
      const th = (c, i) => {
        if (!c.sortKey) return `<th scope="col" class="${thCls(i)}">${esc(c.label)}</th>`;
        const on = state.sortKey === c.sortKey;
        const arrow = on ? (state.sortDir === "asc" ? "↑" : "↓") : "↕";
        return `<th scope="col" class="${thCls(i)}" aria-sort="${on ? (state.sortDir === "asc" ? "ascending" : "descending") : "none"}">
          <button type="button" data-sort="${i}" class="inline-flex items-center gap-1 hover:text-ink-900">${esc(c.label)} <span aria-hidden="true">${arrow}</span></button></th>`;
      };
      const table = `
        <div class="hidden max-h-[calc(100vh-12rem)] overflow-auto rounded-lg border border-hairline bg-white md:block">
          <table class="w-full border-separate border-spacing-0 text-left text-[14px] leading-snug">
            <thead class="text-[12.5px] text-ink-500">
              <tr>${columns.map(th).join("")}<th scope="col" class="sticky right-0 top-0 z-[3] whitespace-nowrap border-b border-hairline bg-brand-50 px-4 py-3 text-left font-medium shadow-[-1px_0_0_rgb(var(--hairline))]">Aksi</th></tr>
            </thead>
            <tbody>
              ${pg.items
                .map(
                  (r) =>
                    `<tr data-rid="${esc(r.rowIndex)}" class="${eBaru(r) ? "bg-pink-100 hover:bg-pink-100" : "bg-white even:bg-sand hover:bg-pink-50"}">${columns
                      .map((c, i) => `<td class="border-b border-hairline bg-inherit px-4 py-2.5 align-middle ${i === 0 ? STICKY_L : c.wrap ? "min-w-[180px] max-w-[280px]" : "whitespace-nowrap"}">${i === 0 && eBaru(r) ? lencanaBaru : ""}${c.render(r)}</td>`)
                      .join("")}<td class="border-b border-hairline bg-inherit px-3 py-2 align-middle ${STICKY_R}"><div class="flex justify-end gap-1 whitespace-nowrap">${actionsHtml(r)}</div></td></tr>`
                )
                .join("")}
            </tbody>
          </table>
        </div>`;
      const cards = `
        <div class="divide-y divide-hairline rounded-lg border border-hairline bg-white md:hidden">
          ${pg.items
            .map(
              (r) => `<article data-rid="${esc(r.rowIndex)}" class="p-4 ${eBaru(r) ? "bg-pink-100" : ""}">
                ${eBaru(r) ? `<div data-baru class="pb-1">${lencanaBaru}</div>` : ""}
                ${columns.map((c) => `<div class="flex justify-between gap-3 py-1.5"><span class="font-mono text-[12.8px] text-ink-500">${esc(c.label)}</span><span class="text-right text-[15px]">${c.render(r)}</span></div>`).join("")}
                <div class="mt-3 flex flex-wrap gap-1">${actionsHtml(r)}</div>
              </article>`
            )
            .join("")}
        </div>`;
      $list.innerHTML = table + cards;
      const from = (pg.page - 1) * state.size + 1;
      const to = Math.min(pg.page * state.size, rows.length);
      const btn = "min-w-9 rounded-md px-2.5 py-1.5 text-[14px] font-medium";
      const nums = pageNumbers(pg.page, pg.pages)
        .map((n) =>
          n === "…"
            ? `<span class="px-1 text-ink-500" aria-hidden="true">…</span>`
            : n === pg.page
              ? `<span class="${btn} bg-ink-900 text-center text-white" aria-current="page">${n}</span>`
              : `<button type="button" data-page="${n}" class="${btn} text-ink-600 hover:bg-sand hover:text-ink-900" aria-label="Halaman ${n}">${n}</button>`
        )
        .join("");
      $pager.innerHTML = `<nav class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between" aria-label="Halaman">
          <div class="flex items-center gap-2 font-mono text-[12.5px] text-ink-500">
            <span>${from}–${to} dari ${rows.length}</span>
            <label for="perPage" class="sr-only">Baris per halaman</label>
            <select id="perPage" class="rounded-md border border-line/60 bg-white px-2 py-1 text-[13px] text-ink-900 focus:border-ink-900 focus:outline-none">
              ${PAGE_SIZES.map((n) => `<option value="${n}" ${n === state.size ? "selected" : ""}>${n} / halaman</option>`).join("")}
            </select>
          </div>
          ${
            pg.pages <= 1
              ? ""
              : `<div class="flex flex-wrap items-center gap-1">
              <button type="button" data-page="${pg.page - 1}" ${pg.page === 1 ? "disabled" : ""} class="${btn} shadow-[inset_0_0_0_1px_rgb(var(--garis-tombol))] hover:bg-sand disabled:opacity-40" aria-label="Halaman sebelumnya">‹</button>
              ${nums}
              <button type="button" data-page="${pg.page + 1}" ${pg.page === pg.pages ? "disabled" : ""} class="${btn} shadow-[inset_0_0_0_1px_rgb(var(--garis-tombol))] hover:bg-sand disabled:opacity-40" aria-label="Halaman berikutnya">›</button>
            </div>`
          }
        </nav>`;
    }

    // Klik baris baru → warnanya jadi sama seperti baris lain (tanpa menggambar ulang tabel)
    const tandaiDilihat = (rid) => {
      if (!baru.delete(String(rid))) return;
      $list.querySelectorAll(`[data-rid="${CSS.escape(String(rid))}"]`).forEach((el) => {
        el.classList.remove("bg-pink-100", "hover:bg-pink-100");
        if (el.tagName === "TR") el.classList.add("bg-white", "even:bg-sand", "hover:bg-pink-50");
        el.querySelectorAll("[data-baru]").forEach((b) => b.remove());
      });
      showNew(baru.size);
    };
    const tandaiSemua = () => {
      baru.clear();
      showNew(0);
      render();
    };
    $list.addEventListener("click", (e) => {
      const kartu = e.target.closest("[data-rid]");
      if (kartu) tandaiDilihat(kartu.dataset.rid);
      const sortBtn = e.target.closest("button[data-sort]");
      if (sortBtn) {
        const key = columns[Number(sortBtn.dataset.sort)].sortKey;
        state.sortDir = state.sortKey === key && state.sortDir === "asc" ? "desc" : "asc";
        state.sortKey = key;
        render();
        return;
      }
      const btn = e.target.closest("button");
      if (!btn) return;
      const idx = btn.dataset.edit ?? btn.dataset.bukti ?? btn.dataset.row;
      const row = page.rows.find((r) => String(r.rowIndex) === String(idx));
      if (!row) return;
      if (btn.dataset.bukti !== undefined) unduhBukti(row, btn);
      else if (btn.dataset.edit !== undefined) edit(row);
      else {
        const aksi = config.actions[Number(btn.dataset.action)];
        catatModul(aksi.label, row);
        aksi.run(row, page);
      }
    });
    $pager.addEventListener("click", (e) => {
      const b = e.target.closest("button[data-page]");
      if (!b || b.disabled) return;
      state.page = Number(b.dataset.page);
      render();
      $list.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    $pager.addEventListener("change", (e) => {
      if (e.target.id !== "perPage") return;
      state.size = Number(e.target.value);
      state.page = 1;
      try {
        localStorage.setItem(SIZE_KEY, String(state.size));
      } catch {}
      render();
    });
    $tabs.addEventListener("click", (e) => {
      const b = e.target.closest("button[data-tab-value]");
      if (!b) return;
      $f.value = b.dataset.tabValue;
      state.page = 1;
      render();
    });

    // Riwayat aktivitas (dibaca superadmin): siapa melakukan apa pada pendaftar mana
    const sasaranBaris = (r) => [r.noPendaftaran && r.noPendaftaran !== "-" ? r.noPendaftaran : "", r.namaLengkap || ""].filter(Boolean).join(" · ");
    const catatModul = (aksi, row, detail) =>
      root.AdminAuth && root.AdminAuth.catat({ aksi, modul: config.title, sasaran: row ? sasaranBaris(row) : null, detail });

    // Bukti pendaftaran (PDF F4) dibuat ulang dari data terbaru di sheet
    async function unduhBukti(row, btn) {
      if (!root.BuktiPdf) return toast("Fitur bukti PDF belum termuat. Muat ulang halaman.");
      btn.disabled = true;
      try {
        // NISN lebih pasti (nomor pendaftaran bisa dobel); nomor dipakai bila NISN kosong
        const nisn = String(row.nisn || row._nisn || "").replace(/\D/g, "");
        const kunci = nisn ? { nisn } : { noPendaftaran: row.noPendaftaran };
        const data = await root.BuktiPdf.cariData(kunci);
        if (!data) throw new Error("Data pendaftar tidak ditemukan di sheet");
        await root.BuktiPdf.unduh(data);
        toast(`Bukti pendaftaran diunduh: ${data.namaLengkap || data.noPendaftaran}`);
        catatModul("Unduh bukti PDF", row);
      } catch (err) {
        toast(err.message || "Gagal membuat PDF");
      }
      btn.disabled = false;
    }

    function edit(row) {
      const original = {};
      config.fields.forEach((f) => (original[f.name] = row[f.name] ?? ""));
      openDialog({
        title: config.editTitle(row),
        subtitle: `${row.noPendaftaran || ""} · NISN ${row.nisn || "-"}`,
        fields: config.fields,
        values: original,
        onSave: async (after) => {
          let changes = changedFields(original, after);
          if (config.beforeSave) changes = config.beforeSave(changes, row);
          if (!Object.keys(changes).length) {
            toast("Tidak ada perubahan.");
            return;
          }
          await root.Sheetson.patchRow(config.sheet, row.rowIndex, changes);
          const label = Object.fromEntries(config.fields.map((f) => [f.name, f.label]));
          catatModul("Ubah data", row, { perubahan: ringkasPerubahan(original, changes, label) });
          Object.assign(row, changes);
          if (config.sheet === "Verifikasi_Berkas" && "statusPendaftaran" in changes) sinkronDiterima(page.rows, null);
          renderStats();
          renderSaring();
          render();
          toast(`Tersimpan: ${row.namaLengkap || row.noPendaftaran}`);
        },
      });
    }

    async function load(fresh) {
      const bar = document.createElement("div");
      bar.className = "loadbar";
      bar.setAttribute("aria-hidden", "true");
      document.body.appendChild(bar);
      try {
        const opts = { fresh: fresh === true };
        const [rows, daftar] = await Promise.all([
          root.Sheetson.getRows(config.sheet, opts),
          config.sheet === "Data_Pendaftar" ? null : root.Sheetson.getRows("Data_Pendaftar", opts).catch(() => []),
        ]);
        // Data diri dari Data_Pendaftar: waktu daftar, jurusan, jenis kelamin, asal sekolah, NISN
        const sumber = daftar || rows;
        diri = new Map(sumber.map((r) => [String(r.noPendaftaran), r]));
        jumlahDaftar = sumber.length;
        rows.forEach(lengkapi);
        page.rows = rows;
        renderStats();
        renderSaring();
        render();
        bar.remove();
        showNew(baru.size);
        if (config.sheet === "Verifikasi_Berkas") sinkronDiterima(page.rows, null);
      } catch (err) {
        bar.remove();
        $count.textContent = "";
        $list.innerHTML = `<div class="flex flex-wrap items-center justify-between gap-3 bg-red-50 p-6 text-[15px] font-semibold text-red-700"><span>${esc(err.message)}. Periksa internet Anda.</span><button type="button" data-coba class="rounded-md bg-ink-900 px-3 py-1.5 text-[14px] font-medium text-white hover:opacity-90">Coba lagi</button></div>`;
        $list.querySelector("[data-coba]").addEventListener("click", () => load(true));
      }
    }

    const showNew = newBanner(app.querySelector("#newSlot"), tandaiSemua);

    // Pendaftar baru masuk langsung ke tabel (diwarnai sampai diklik). Hanya baris baru yang diunduh.
    async function tambahBaru(masuk) {
      const ada = new Set(page.rows.map((r) => String(r.rowIndex)));
      const segar = masuk.filter((r) => !ada.has(String(r.rowIndex)));
      if (!segar.length) return;
      if (config.sheet === "Data_Pendaftar") {
        segar.forEach((r) => diri.set(String(r.noPendaftaran), r));
        jumlahDaftar += segar.length;
      } else {
        try {
          const d = await root.Sheetson.rowsAfter("Data_Pendaftar", jumlahDaftar);
          d.forEach((r) => diri.set(String(r.noPendaftaran), r));
          jumlahDaftar += d.length;
        } catch (_) {
          // data diri menyusul di pemuatan berikutnya; baris tetap tampil
        }
      }
      segar.forEach((r) => {
        lengkapi(r);
        baru.add(String(r.rowIndex));
      });
      page.rows.push(...segar);
      renderStats();
      renderSaring();
      render();
      showNew(baru.size);
    }
    const watcher = watchNew(config.sheet, () => page.rows.length, tambahBaru);
    page.watcher = watcher;

    // Perubahan oleh petugas lain tidak ikut "baris baru": segarkan diam-diam bila tab baru
    // dibuka lagi setelah >5 menit tersembunyi (tab yang sedang dilihat tidak diunduh ulang).
    let tersembunyiSejak = 0;
    const saatTampil = () => {
      if (document.visibilityState === "hidden") return void (tersembunyiSejak = Date.now());
      if (tersembunyiSejak && Date.now() - tersembunyiSejak > 5 * 60000) load(true);
      tersembunyiSejak = 0;
    };
    document.addEventListener("visibilitychange", saatTampil);
    const pengamatSegar = { stop: () => { document.removeEventListener("visibilitychange", saatTampil); ACTIVE_WATCHERS.delete(pengamatSegar); } };
    ACTIVE_WATCHERS.add(pengamatSegar);

    $q.addEventListener("input", () => { state.page = 1; render(); });
    [$dari, $sampai].forEach((el) => el.addEventListener("change", () => { state.page = 1; render(); }));
    app.querySelector("#tglBar").addEventListener("click", (e) => {
      const b = e.target.closest("button[data-tgl]");
      if (!b) return;
      const hari = (mundur) => tanggalWIB(Date.now() - mundur * 86400000);
      const pilih = { hari: [hari(0), hari(0)], kemarin: [hari(1), hari(1)], 7: [hari(6), hari(0)], reset: ["", ""] }[b.dataset.tgl];
      [$dari.value, $sampai.value] = pilih;
      state.page = 1;
      render();
    });
    $f.addEventListener("change", () => { state.page = 1; render(); });
    $saring.addEventListener("change", (e) => {
      const id = e.target.dataset.saring;
      if (!id) return;
      pilihan[id] = e.target.value;
      state.page = 1;
      renderSaring();
      render();
      const el = $saring.querySelector(`[data-saring="${id}"]`);
      if (el) el.focus();
    });
    const $panel = app.querySelector("#filterPanel");
    const $fbtn = app.querySelector("#filterBtn");
    // tinggi mengikuti sisa layar di bawah tombol, agar tombol Tampilkan selalu terlihat
    const ukurPanel = () => {
      if (!document.contains($panel)) return root.removeEventListener("resize", ukurPanel);
      if ($panel.classList.contains("hidden")) return;
      $panel.style.maxHeight = Math.max(288, root.innerHeight - $panel.getBoundingClientRect().top - 12) + "px";
    };
    root.addEventListener("resize", ukurPanel);
    const bukaPanel = (buka) => {
      $panel.classList.toggle("hidden", !buka);
      $fbtn.setAttribute("aria-expanded", String(buka));
      if (buka) {
        ukurPanel();
        ($panel.querySelector("select") || $panel).focus();
      }
    };
    $fbtn.addEventListener("click", () => bukaPanel($panel.classList.contains("hidden")));
    $panel.addEventListener("click", (e) => {
      if (e.target.closest("[data-tutup]")) {
        bukaPanel(false);
        $fbtn.focus();
      }
    });
    const tutupLuar = (e) => {
      if (!document.contains($panel)) return document.removeEventListener("pointerdown", tutupLuar);
      if (!$panel.classList.contains("hidden") && !$panel.contains(e.target) && !$fbtn.contains(e.target)) bukaPanel(false);
    };
    document.addEventListener("pointerdown", tutupLuar);
    $panel.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        bukaPanel(false);
        $fbtn.focus();
      }
    });
    app.querySelector("#filterAktif").addEventListener("click", (e) => {
      const b = e.target.closest("button[data-hapus]");
      if (!b) return;
      if (b.dataset.hapus === "tanggal") $dari.value = $sampai.value = "";
      else pilihan[b.dataset.hapus] = "";
      state.page = 1;
      renderSaring();
      render();
    });
    app.querySelector("#saringReset").addEventListener("click", () => {
      Object.keys(pilihan).forEach((k) => (pilihan[k] = ""));
      $dari.value = $sampai.value = "";
      state.page = 1;
      renderSaring();
      render();
    });
    // Ekspor: data persis seperti yang tampil (cari + tab + filter + tanggal, urutan sama), semua halaman
    const $ebtn = app.querySelector("#eksporBtn");
    const $emenu = app.querySelector("#eksporMenu");
    const bukaEkspor = (buka) => {
      $emenu.classList.toggle("hidden", !buka);
      $ebtn.setAttribute("aria-expanded", String(buka));
      if (buka) {
        bukaPanel(false);
        const n = terakhir.rows.length;
        app.querySelector("#eksporInfo").innerHTML = n
          ? `<b class="font-medium text-ink-900">${n} pendaftar</b> akan diekspor.<br>${esc(terakhir.keterangan)}`
          : "Tidak ada data yang cocok dengan filter.";
        $emenu.querySelectorAll("[data-ekspor]").forEach((b) => (b.disabled = !n));
        ($emenu.querySelector("[data-ekspor]:not(:disabled)") || $emenu).focus();
      }
    };
    $ebtn.addEventListener("click", () => bukaEkspor($emenu.classList.contains("hidden")));
    $fbtn.addEventListener("click", () => bukaEkspor(false));
    const tutupEkspor = (e) => {
      if (!document.contains($emenu)) return document.removeEventListener("pointerdown", tutupEkspor);
      if (!$emenu.classList.contains("hidden") && !$emenu.contains(e.target) && !$ebtn.contains(e.target)) bukaEkspor(false);
    };
    document.addEventListener("pointerdown", tutupEkspor);
    $emenu.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        bukaEkspor(false);
        $ebtn.focus();
      }
    });
    $emenu.addEventListener("click", async (e) => {
      const b = e.target.closest("button[data-ekspor]");
      if (!b || b.disabled) return;
      const jenis = b.dataset.ekspor;
      const laporan = { judul: config.title, keterangan: terakhir.keterangan, ...tabelEkspor(terakhir.rows, config.ekspor || []) };
      const $judul = b.querySelector("[data-judul]");
      const judulAsli = $judul.textContent;
      $emenu.querySelectorAll("[data-ekspor]").forEach((x) => (x.disabled = true));
      $judul.textContent = "Menyiapkan…";
      try {
        await (jenis === "pdf" ? eksporPdf(laporan) : eksporExcel(laporan));
        toast(`${laporan.body.length} pendaftar diekspor ke ${jenis === "pdf" ? "PDF" : "Excel"}.`);
        catatModul(jenis === "pdf" ? "Ekspor PDF" : "Ekspor Excel", null, { keterangan: `${laporan.body.length} pendaftar · ${laporan.keterangan}` });
        bukaEkspor(false);
      } catch (err) {
        toast("Gagal membuat file: " + (err.message || "periksa koneksi internet"), "error");
      }
      $judul.textContent = judulAsli;
      $emenu.querySelectorAll("[data-ekspor]").forEach((x) => (x.disabled = false));
    });
    load();
    return page;
  }

  Object.assign(root.AdminUI, { badge, toast, renderShell, setActiveNav, statCards, openDialog, downloadFile, modulePage, watchNew, newBanner, stopAllWatchers, daftarPengamat, sinkronDiterima });
})(typeof window !== "undefined" ? window : globalThis);
