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

  // Judul tab dengan jumlah pendaftar baru, mis. "(3) Verifikasi — Admin SPMB"
  function tabTitle(title, n) {
    const base = String(title).replace(/^\(\d+\)\s*/, "");
    return n > 0 ? `(${n}) ${base}` : base;
  }

  root.AdminUI = { filterRows, changedFields, toCsv, badgeTone, paginate, sortRows, tabTitle };
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

  // Panel admin: sidebar putih bergaris (laci di HP) + topbar
  function renderShell(profile, activeId) {
    const A = root.AdminAuth;
    const header = document.getElementById("adminHeader");
    if (!header) return;
    document.body.classList.add("admin-shell");
    const active = activeId || "dashboard";
    const modules = A.modulesFor(profile.role);
    const all = [{ id: "dashboard", href: "dashboard.html", title: "Dashboard" }, ...modules];
    const current = all.find((m) => m.id === active) || all[0];
    const link = (m) =>
      `<a href="${m.href}" class="block rounded-md px-3 py-2 text-[14.5px] ${
        m.id === active ? "bg-pink-50 font-medium text-ink-900 shadow-[inset_2px_0_0_#EC4899]" : "text-ink-600 hover:bg-brand-50 hover:text-ink-900"
      }" ${m.id === active ? 'aria-current="page"' : ""}>${esc(m.title)}</a>`;
    const name = profile.nama_lengkap || profile.email;

    const aside = document.createElement("aside");
    aside.id = "adminSidebar";
    aside.className = "admin-sidebar fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-hairline bg-white";
    aside.setAttribute("aria-label", "Menu admin");
    aside.innerHTML = `
      <div class="flex h-14 items-center gap-2.5 px-5">
        <span class="grid h-7 w-7 place-items-center rounded-md bg-ink-900 font-mono text-[12px] font-medium text-white">TS</span>
        <span class="text-[15px] font-semibold tracking-tight">SPMB <span class="font-normal text-ink-500">Admin</span></span>
      </div>
      <nav class="flex-1 overflow-y-auto px-3 py-4">
        <p class="px-3 pb-1.5 font-mono text-[11.5px] uppercase tracking-wider text-ink-500">Ringkasan</p>
        ${link(all[0])}
        <p class="mt-5 px-3 pb-1.5 font-mono text-[11.5px] uppercase tracking-wider text-ink-500">Modul</p>
        ${modules.map(link).join("")}
      </nav>
      <div class="flex items-center gap-3 border-t border-hairline p-4">
        <span class="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-sand text-[13px] font-semibold text-ink-900">${esc(initials(name))}</span>
        <span class="min-w-0 flex-1 leading-tight">
          <span class="block truncate text-[14px] font-medium">${esc(name)}</span>
          <span class="block truncate text-[12.5px] text-ink-500">${esc(A.ROLE_LABEL[profile.role])}</span>
        </span>
        <button id="btnLogout" type="button" class="rounded-md px-2 py-1.5 text-[13px] font-medium text-ink-600 hover:bg-sand hover:text-ink-900">Keluar</button>
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
    document.addEventListener("keydown", (e) => e.key === "Escape" && setOpen(false));

    header.className = "sticky top-0 z-30 border-b border-hairline bg-white/85 backdrop-blur";
    header.innerHTML = `
      <div class="flex h-14 items-center gap-3 px-4 sm:px-6 lg:px-8">
        <button id="btnMenu" type="button" class="-ml-1 rounded-md px-2 py-1.5 text-[14px] font-medium text-ink-600 hover:bg-sand lg:hidden" aria-label="Buka menu" aria-expanded="false" aria-controls="adminSidebar">Menu</button>
        <nav class="min-w-0 flex-1 truncate text-[14px]" aria-label="Lokasi"><span class="text-ink-500">Admin</span><span class="px-1.5 text-ink-300">/</span><span class="font-medium">${esc(current.title)}</span></nav>
        <button id="btnBunyi" type="button" aria-pressed="false" class="rounded-md px-2.5 py-1.5 text-[13px] font-medium text-ink-600 hover:bg-sand" title="Bunyi saat ada pendaftar baru">Bunyi: mati</button>
        <span class="hidden font-mono text-[12px] text-ink-500 sm:inline">SPMB 2026/2027</span>
      </div>`;
    document.getElementById("btnMenu").addEventListener("click", () => setOpen(!document.body.classList.contains("sidebar-open")));
    document.getElementById("btnLogout").addEventListener("click", () => A.logout());
    const bunyi = document.getElementById("btnBunyi");
    const paint = () => {
      bunyi.textContent = soundOn() ? "Bunyi: nyala" : "Bunyi: mati";
      bunyi.setAttribute("aria-pressed", String(soundOn()));
    };
    bunyi.addEventListener("click", () => {
      try { root.localStorage.setItem(SOUND_KEY, soundOn() ? "0" : "1"); } catch (_) {}
      paint();
      if (soundOn()) beep();
    });
    paint();
  }

  /* ---------- pendaftar baru: cek berkala yang hemat ---------- */
  const POLL_MS = 60000;
  const SOUND_KEY = "spmb-bunyi";
  const soundOn = () => {
    try { return root.localStorage.getItem(SOUND_KEY) === "1"; } catch (_) { return false; }
  };
  function beep() {
    try {
      const Ctx = root.AudioContext || root.webkitAudioContext;
      const ac = new Ctx();
      const o = ac.createOscillator();
      const g = ac.createGain();
      o.type = "sine";
      o.frequency.value = 880;
      g.gain.setValueAtTime(0.0001, ac.currentTime);
      g.gain.exponentialRampToValueAtTime(0.08, ac.currentTime + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + 0.35);
      o.connect(g).connect(ac.destination);
      o.start();
      o.stop(ac.currentTime + 0.4);
    } catch (_) {}
  }

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
    document.addEventListener("visibilitychange", () => document.visibilityState === "visible" && check());
    return { check, reset: () => (lastN = 0), stop: () => clearInterval(timer) };
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
          <button type="button" data-cancel class="btn rounded-full px-5 py-2.5 text-[14.5px] font-medium shadow-[inset_0_0_0_1px_#D4D4D4]">Batal</button>
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
  const PAGE_SIZE = 25;
  function modulePage(config) {
    const app = document.getElementById("app");
    app.innerHTML = `
      <div class="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 class="text-[26px] font-semibold tracking-tight">${esc(config.title)}</h1>
          <p class="mt-1 text-[15px] text-ink-600">${esc(config.intro)}</p>
        </div>
        <button id="reload" type="button" class="btn rounded-full px-4 py-2 text-[14px] font-medium shadow-[inset_0_0_0_1px_#D4D4D4]">Muat ulang</button>
      </div>
      <div id="stats" class="mt-6"></div>
      <div class="mt-6 flex flex-col gap-3 border-b border-hairline lg:flex-row lg:items-end lg:justify-between">
        <div id="tabs" class="no-scrollbar -mb-px flex gap-5 overflow-x-auto" role="tablist" aria-label="${esc(config.filter.label)}"></div>
        <div class="pb-3">
          <label for="q" class="sr-only">Cari</label>
          <input id="q" type="search" class="w-full rounded-md border border-line/60 bg-white px-3 py-2 text-[14.5px] focus:border-ink-900 focus:outline-none focus:ring-2 focus:ring-pink-500/30 lg:w-80" placeholder="Cari nama, NISN, atau no. pendaftaran" />
          <label for="f" class="sr-only">${esc(config.filter.label)}</label>
          <select id="f" class="sr-only" tabindex="-1">
            <option value="">Semua</option>${config.filter.options.map((o) => `<option>${esc(o)}</option>`).join("")}
          </select>
        </div>
      </div>
      <div id="newSlot"></div>
      <p id="count" class="mt-4 font-mono text-[12.5px] text-ink-500" aria-live="polite">Memuat data…</p>
      <div id="list" class="mt-2"></div>
      <div id="pager" class="mt-4"></div>`;

    const page = { rows: [], reload: load, rerender: render };
    const state = { page: 1, sortKey: null, sortDir: "asc" };
    const $q = app.querySelector("#q");
    const $f = app.querySelector("#f");
    const $count = app.querySelector("#count");
    const $list = app.querySelector("#list");
    const $pager = app.querySelector("#pager");
    const $stats = app.querySelector("#stats");
    const $tabs = app.querySelector("#tabs");
    let currentStats = [];

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
      let rows = filterRows(page.rows, $q.value, { [config.filter.field]: $f.value });
      if (state.sortKey) rows = sortRows(rows, state.sortKey, state.sortDir);
      const pg = paginate(rows, state.page, PAGE_SIZE);
      state.page = pg.page;
      $count.textContent = `${rows.length} dari ${page.rows.length} pendaftar`;
      if (!rows.length) {
        $list.innerHTML = `<div class="rounded-lg border border-dashed border-hairline p-10 text-center text-[15px] text-ink-500">Tidak ada data yang cocok.</div>`;
        $pager.innerHTML = "";
        return;
      }
      const actionsHtml = (row) =>
        `<button type="button" data-edit="${esc(row.rowIndex)}" class="rounded-md px-3 py-1.5 text-[14px] font-medium shadow-[inset_0_0_0_1px_#D4D4D4] hover:bg-sand">Ubah</button>` +
        (config.actions || [])
          .filter((a) => !a.show || a.show(row))
          .map(
            (a, i) =>
              `<button type="button" data-action="${i}" data-row="${esc(row.rowIndex)}" class="rounded-md px-3 py-1.5 text-[14px] font-medium text-ink-600 hover:bg-sand hover:text-ink-900">${esc(a.label)}</button>`
          )
          .join("");
      const th = (c, i) => {
        if (!c.sortKey) return `<th scope="col" class="px-4 py-2.5 font-medium">${esc(c.label)}</th>`;
        const on = state.sortKey === c.sortKey;
        const arrow = on ? (state.sortDir === "asc" ? "↑" : "↓") : "↕";
        return `<th scope="col" class="px-4 py-2.5 font-medium" aria-sort="${on ? (state.sortDir === "asc" ? "ascending" : "descending") : "none"}">
          <button type="button" data-sort="${i}" class="inline-flex items-center gap-1 hover:text-ink-900">${esc(c.label)} <span aria-hidden="true">${arrow}</span></button></th>`;
      };
      const table = `
        <div class="hidden overflow-x-auto rounded-lg border border-hairline bg-white md:block">
          <table class="w-full text-left text-[14.5px]">
            <thead class="border-b border-hairline bg-brand-50 text-[12.5px] text-ink-500">
              <tr>${config.columns.map(th).join("")}<th class="px-4 py-3"><span class="sr-only">Aksi</span></th></tr>
            </thead>
            <tbody class="divide-y divide-hairline">
              ${pg.items
                .map(
                  (r) =>
                    `<tr class="align-top hover:bg-brand-50">${config.columns.map((c) => `<td class="px-4 py-3">${c.render(r)}</td>`).join("")}<td class="px-4 py-2.5"><div class="flex flex-wrap justify-end gap-1">${actionsHtml(r)}</div></td></tr>`
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
                ${config.columns.map((c) => `<div class="flex justify-between gap-3 py-1.5"><span class="font-mono text-[12.8px] text-ink-500">${esc(c.label)}</span><span class="text-right text-[15px]">${c.render(r)}</span></div>`).join("")}
                <div class="mt-3 flex flex-wrap gap-1">${actionsHtml(r)}</div>
              </article>`
            )
            .join("")}
        </div>`;
      $list.innerHTML = table + cards;
      $pager.innerHTML =
        pg.pages <= 1
          ? ""
          : `<nav class="flex items-center justify-between gap-3" aria-label="Halaman">
              <button type="button" data-page="${pg.page - 1}" ${pg.page === 1 ? "disabled" : ""} class="rounded-md px-3 py-1.5 text-[14px] font-medium shadow-[inset_0_0_0_1px_#D4D4D4] hover:bg-sand disabled:opacity-40">Sebelumnya</button>
              <span class="font-mono text-[13px] text-ink-600">Halaman ${pg.page} dari ${pg.pages}</span>
              <button type="button" data-page="${pg.page + 1}" ${pg.page === pg.pages ? "disabled" : ""} class="rounded-md px-3 py-1.5 text-[14px] font-medium shadow-[inset_0_0_0_1px_#D4D4D4] hover:bg-sand disabled:opacity-40">Berikutnya</button>
            </nav>`;
    }

    $list.addEventListener("click", (e) => {
      const sortBtn = e.target.closest("button[data-sort]");
      if (sortBtn) {
        const key = config.columns[Number(sortBtn.dataset.sort)].sortKey;
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
          render();
          toast(`Tersimpan: ${row.namaLengkap || row.noPendaftaran}`);
        },
      });
    }

    async function load() {
      $count.textContent = "Memuat data…";
      try {
        page.rows = await root.Sheetson.getRows(config.sheet);
        renderStats();
        render();
        if (page.watcher) page.watcher.reset();
        if (typeof showNew === "function") showNew(0);
      } catch (err) {
        $count.textContent = "";
        $list.innerHTML = `<div class="bg-red-50 p-6 text-[15px] font-semibold text-red-700">${esc(err.message)}. Periksa internet lalu tekan Muat ulang.</div>`;
      }
    }

    const showNew = newBanner(app.querySelector("#newSlot"), () => load());
    const watcher = watchNew(config.sheet, () => page.rows.length, showNew);
    page.watcher = watcher;

    $q.addEventListener("input", () => { state.page = 1; render(); });
    $f.addEventListener("change", () => { state.page = 1; render(); });
    app.querySelector("#reload").addEventListener("click", load);
    load();
    return page;
  }

  Object.assign(root.AdminUI, { badge, toast, renderShell, statCards, openDialog, downloadFile, modulePage, watchNew, newBanner });
})(typeof window !== "undefined" ? window : globalThis);
