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

  root.AdminUI = { cariNomorDobel, barisMilik, pesanNomorBaru, polaBunyi: () => polaBunyi(), URUTAN_JURUSAN, SARING_UMUM, opsiSaring, saringTambahan, isi, filterRows, changedFields, toCsv, badgeTone, paginate, sortRows, tabTitle, parseWaktu, formatWaktu, waktuKey, pageNumbers, tanggalWIB, filterTanggal };
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
  function renderShell(profile, activeId) {
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
    const name = profile.nama_lengkap || profile.email;

    const aside = document.createElement("aside");
    aside.id = "adminSidebar";
    aside.className = "admin-sidebar fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-hairline bg-white";
    aside.setAttribute("aria-label", "Menu admin");
    aside.innerHTML = `
      <div class="sb-head flex h-14 items-center gap-2.5 px-5">
        <span class="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-ink-900 font-mono text-[12px] font-medium text-white">TS</span>
        <span class="mini-hide whitespace-nowrap text-[15px] font-semibold tracking-tight">SPMB <span class="font-normal text-ink-500">Admin</span></span>
      </div>
      <nav class="flex-1 overflow-y-auto overflow-x-hidden px-3 py-4">
        <p class="mini-hide px-3 pb-1.5 font-mono text-[11.5px] uppercase tracking-wider text-ink-500">Ringkasan</p>
        ${link(all[0])}
        <p class="mini-hide mt-5 px-3 pb-1.5 font-mono text-[11.5px] uppercase tracking-wider text-ink-500">Modul</p>
        <hr class="mini-show my-3 hidden border-hairline" />
        ${modules.map(link).join("")}
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
    aside.addEventListener("click", (e) => e.target.closest("a[data-nav]") && setOpen(false));
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

  /* ---------- pendaftar baru: cek berkala yang hemat ---------- */
  const POLL_MS = 60000;
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

  const ACTIVE_WATCHERS = new Set();
  const stopAllWatchers = () => [...ACTIVE_WATCHERS].forEach((w) => w.stop());

  // Cek tiap 60 detik selama tab terlihat; langsung cek saat tab kembali dibuka.
  // getKnown() → jumlah baris yang sudah tampil; onNew(n) dipanggil bila ada baris baru.
  function watchNew(sheet, getKnown, onNew) {
    let busy = false;
    let lastN = 0;
    async function check() {
      if (busy || document.visibilityState !== "visible") return;
      busy = true;
      try {
        const rows = await root.Sheetson.rowsAfter(sheet, getKnown());
        const n = rows.length;
        if (n > lastN && soundOn()) beep();
        lastN = n;
        onNew(n);
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
      reset: () => (lastN = 0),
      stop: () => {
        clearInterval(timer);
        document.removeEventListener("visibilitychange", onVisible);
        ACTIVE_WATCHERS.delete(handle);
      },
    };
    ACTIVE_WATCHERS.add(handle);
    return handle;
  }

  // Pemberitahuan di atas tabel + judul tab
  function newBanner(container, onShow) {
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
      el.innerHTML = `<span class="flex items-center gap-2 text-[14.5px]"><span class="relative flex h-2 w-2"><span class="absolute inline-flex h-full w-full animate-ping rounded-full bg-pink-400 opacity-60"></span><span class="relative inline-flex h-2 w-2 rounded-full bg-pink-500"></span></span><b class="font-semibold">${n} pendaftar baru</b> sejak data terakhir dimuat</span>
        <button type="button" class="rounded-md bg-ink-900 px-3 py-1.5 text-[14px] font-medium text-white hover:opacity-90">Tampilkan</button>`;
      el.querySelector("button").addEventListener("click", onShow);
    };
  }

  // Tandai menu aktif & judul lokasi tanpa merender ulang kerangka
  const NAV_ON = ["bg-pink-50", "font-medium", "text-ink-900", "shadow-[inset_2px_0_0_#EC4899]"];
  const NAV_OFF = ["text-ink-600", "hover:bg-brand-50", "hover:text-ink-900"];
  function setActiveNav(id, title) {
    document.querySelectorAll("#adminSidebar a[data-nav]").forEach((a) => {
      const on = a.dataset.nav === id;
      NAV_ON.forEach((c) => a.classList.toggle(c, on));
      NAV_OFF.forEach((c) => a.classList.toggle(c, !on));
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

  function modulePage(config) {
    const columns = [config.columns[0], WAKTU_COL, ...config.columns.slice(1)];
    const app = document.getElementById("app");
    app.innerHTML = `
      <div class="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 class="text-[26px] font-semibold tracking-tight">${esc(config.title)}</h1>
          <p class="mt-1 text-[15px] text-ink-600">${esc(config.intro)}</p>
        </div>
        <button id="reload" type="button" class="btn rounded-full px-4 py-2 text-[14px] font-medium shadow-[inset_0_0_0_1px_rgb(var(--garis-tombol))]">Muat ulang</button>
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
      if (!rows.length) {
        $list.innerHTML = `<div class="rounded-lg border border-dashed border-hairline p-10 text-center text-[15px] text-ink-500">Tidak ada data yang cocok.</div>`;
        $pager.innerHTML = "";
        return;
      }
      const actionsHtml = (row) =>
        `<button type="button" data-edit="${esc(row.rowIndex)}" class="rounded-md px-3 py-1.5 text-[14px] font-medium shadow-[inset_0_0_0_1px_rgb(var(--garis-tombol))] hover:bg-sand">Ubah</button>` +
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
              <tr>${columns.map(th).join("")}<th scope="col" class="sticky right-0 top-0 z-[3] border-b border-hairline bg-brand-50 px-4 py-3 shadow-[-1px_0_0_rgb(var(--hairline))]"><span class="sr-only">Aksi</span></th></tr>
            </thead>
            <tbody>
              ${pg.items
                .map(
                  (r) =>
                    `<tr class="bg-white even:bg-sand hover:bg-pink-50">${columns
                      .map((c, i) => `<td class="border-b border-hairline bg-inherit px-4 py-2.5 align-middle ${i === 0 ? STICKY_L : c.wrap ? "min-w-[180px] max-w-[280px]" : "whitespace-nowrap"}">${c.render(r)}</td>`)
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
              (r) => `<article class="p-4">
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

    $list.addEventListener("click", (e) => {
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
      const idx = btn.dataset.edit ?? btn.dataset.row;
      const row = page.rows.find((r) => String(r.rowIndex) === String(idx));
      if (!row) return;
      if (btn.dataset.edit !== undefined) edit(row);
      else config.actions[Number(btn.dataset.action)].run(row, page);
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
          Object.assign(row, changes);
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
        // Data diri dari Data_Pendaftar: waktu daftar, jurusan, jenis kelamin, asal sekolah
        const diri = new Map((daftar || rows).map((r) => [String(r.noPendaftaran), r]));
        rows.forEach((r) => {
          const d = diri.get(String(r.noPendaftaran)) || {};
          r._waktuAsli = d.createdAt || "";
          r._waktu = waktuKey(r._waktuAsli);
          r._jurusan = d.jurusan1 || "";
          r._jk = d.jenisKelamin || "";
          r._asal = d.asalSekolah || "";
        });
        page.rows = rows;
        renderStats();
        renderSaring();
        render();
        bar.remove();
        if (page.watcher) page.watcher.reset();
        if (typeof showNew === "function") showNew(0);
      } catch (err) {
        bar.remove();
        $count.textContent = "";
        $list.innerHTML = `<div class="bg-red-50 p-6 text-[15px] font-semibold text-red-700">${esc(err.message)}. Periksa internet lalu tekan Muat ulang.</div>`;
      }
    }

    const showNew = newBanner(app.querySelector("#newSlot"), () => load(true));
    const watcher = watchNew(config.sheet, () => page.rows.length, showNew);
    page.watcher = watcher;

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
    app.querySelector("#reload").addEventListener("click", () => load(true));
    load();
    return page;
  }

  Object.assign(root.AdminUI, { badge, toast, renderShell, setActiveNav, statCards, openDialog, downloadFile, modulePage, watchNew, newBanner, stopAllWatchers });
})(typeof window !== "undefined" ? window : globalThis);
