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

  root.AdminUI = { filterRows, changedFields, toCsv, badgeTone, paginate, sortRows };
  if (typeof document === "undefined") return;

  /* ---------- tampilan ---------- */

  const TONE_CLASS = {
    ok: "bg-ok-50 text-ok-700",
    bad: "bg-red-100 text-red-700",
    wait: "bg-warn-50 text-warn-700",
  };
  function badge(text) {
    const t = text === undefined || text === null || text === "" ? "-" : text;
    return `<span class="inline-block whitespace-nowrap rounded-full px-3 py-1 text-[13px] font-bold ${TONE_CLASS[badgeTone(t)]}">${esc(t)}</span>`;
  }

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

  // Panel admin: sidebar gelap kiri (laci di HP) + topbar
  function renderShell(profile, activeId) {
    const A = root.AdminAuth;
    const header = document.getElementById("adminHeader");
    if (!header) return;
    document.body.classList.add("admin-shell");
    const active = activeId || "dashboard";
    const items = [{ id: "dashboard", href: "dashboard.html", icon: "🏠", title: "Dashboard" }, ...A.modulesFor(profile.role)];
    const current = items.find((m) => m.id === active) || items[0];

    const aside = document.createElement("aside");
    aside.id = "adminSidebar";
    aside.className = "admin-sidebar fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-ink-900 text-white";
    aside.setAttribute("aria-label", "Menu admin");
    aside.innerHTML = `
      <div class="flex h-16 items-center gap-2.5 border-b border-white/10 px-5">
        <span class="grid h-8 w-8 place-items-center rounded-lg bg-ok-700 font-mono text-[13px] font-medium text-white">TS</span>
        <span class="leading-tight"><span class="block text-[15px] font-semibold">SPMB Admin</span>
        <span class="block font-mono text-[12px] text-white/60">tamansiswa jetis</span></span>
      </div>
      <nav class="flex-1 space-y-1 overflow-y-auto p-3">
        <p class="px-3 pb-1 pt-2 font-mono text-[12px] uppercase tracking-wide text-white/50">Menu</p>
        ${items
          .map(
            (m) => `<a href="${m.href}" class="flex items-center gap-3 rounded-lg px-3 py-2.5 text-[15px] ${
              m.id === active ? "bg-white/10 font-semibold text-white shadow-[inset_3px_0_0_#F2B53A]" : "text-white/75 hover:bg-white/5 hover:text-white"
            }" ${m.id === active ? 'aria-current="page"' : ""}><span aria-hidden="true">${m.icon}</span>${esc(m.title)}</a>`
          )
          .join("")}
      </nav>
      <div class="border-t border-white/10 p-4">
        <p class="truncate text-[15px] font-semibold">${esc(profile.nama_lengkap || profile.email)}</p>
        <p class="font-mono text-[12px] text-gold-500">${esc(A.ROLE_LABEL[profile.role])}</p>
        <button id="btnLogout" type="button" class="btn mt-3 w-full rounded-full bg-white/10 px-4 py-2.5 text-[15px] font-semibold text-white hover:bg-white/15">Keluar</button>
      </div>`;
    document.body.appendChild(aside);

    const overlay = document.createElement("div");
    overlay.className = "fixed inset-0 z-40 hidden bg-black/40 lg:hidden";
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

    header.className = "sticky top-0 z-30 border-b border-hairline bg-white/90 backdrop-blur";
    header.innerHTML = `
      <div class="flex h-16 items-center gap-3 px-4 sm:px-6">
        <button id="btnMenu" type="button" class="grid h-10 w-10 place-items-center rounded-full shadow-[inset_0_0_0_1px_#D4D4D4] lg:hidden" aria-label="Buka menu" aria-expanded="false" aria-controls="adminSidebar">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg>
        </button>
        <p class="min-w-0 flex-1 truncate text-[15px]"><span class="text-ink-500">Admin /</span> <span class="font-semibold">${esc(current.title)}</span></p>
        <span class="hidden items-center gap-2 rounded-full px-3 py-1.5 text-[14px] shadow-[inset_0_0_0_1px_#EAEAEA] sm:inline-flex">
          <span class="h-2 w-2 rounded-full bg-ok-600" aria-hidden="true"></span>${esc(profile.nama_lengkap || profile.email)}
        </span>
      </div>`;
    document.getElementById("btnMenu").addEventListener("click", () => setOpen(!document.body.classList.contains("sidebar-open")));
    document.getElementById("btnLogout").addEventListener("click", () => A.logout());
  }

  // Kartu angka. stats: [{label, value, tone?: ok|bad|wait|info, filter?}]
  const STAT_DOT = { ok: "#16A34A", bad: "#DC2626", wait: "#F2B53A", info: "#0369A1" };
  function statCards(stats) {
    return `<div class="grid grid-cols-2 gap-px overflow-hidden border border-hairline bg-hairline sm:grid-cols-3 lg:grid-cols-${Math.min(stats.length, 5)}">${stats
      .map(
        (st, i) => `<button type="button" data-stat="${i}" class="bg-white p-4 text-left hover:bg-brand-50 ${st.filter === undefined ? "cursor-default" : ""}">
          <span class="tag" style="--dot:${STAT_DOT[st.tone] || "#171717"}">${esc(st.label)}</span>
          <span class="mt-2 block text-[32px] font-semibold leading-none tracking-tight">${esc(st.value)}</span>
        </button>`
      )
      .join("")}</div>`;
  }

  // Dialog ubah data. fields: [{name, label, type: select|text|number|textarea|date, options, help}]
  function openDialog({ title, subtitle, fields, values, onSave }) {
    const overlay = document.createElement("div");
    overlay.className = "fixed inset-0 z-[60] overflow-y-auto bg-black/50 p-4";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    const box = document.createElement("form");
    box.className = "mx-auto my-6 w-full max-w-lg rounded-3xl border border-hairline bg-white p-5 sm:p-6";
    box.noValidate = true;
    box.innerHTML = `<h2 class="text-xl font-semibold">${esc(title)}</h2>${
      subtitle ? `<p class="mt-1 text-[15px] text-ink-600">${esc(subtitle)}</p>` : ""
    }<div class="mt-5 space-y-4" data-fields></div>
      <p data-error class="mt-4 hidden rounded-2xl bg-red-50 p-3 text-[15px] font-semibold text-red-700"></p>
      <div class="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <button type="button" data-cancel class="rounded-full border-2 border-line bg-white px-6 py-3.5 text-base font-semibold">Batal</button>
        <button type="submit" data-save class="rounded-full bg-brand-600 px-8 py-3.5 text-base font-bold text-white disabled:opacity-60">Simpan</button>
      </div>`;
    const wrap = box.querySelector("[data-fields]");
    const inputs = {};
    fields.forEach((f) => {
      const id = `dlg-${f.name}`;
      const div = document.createElement("div");
      const label = document.createElement("label");
      label.htmlFor = id;
      label.className = "mb-1.5 block text-[15px] font-semibold";
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
      input.className = "w-full rounded-xl border-2 border-line bg-white px-3.5 py-3 text-base focus:border-brand-600 focus:outline-none";
      const v = values[f.name];
      input.value = v === undefined || v === null || (f.type === "number" && v === "-") ? "" : String(v);
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
    box.querySelector("[data-cancel]").addEventListener("click", close);
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
      <div class="flex flex-col gap-1">
        <h1 class="heading text-[28px] sm:text-[34px]">${esc(config.title)}</h1>
        <p class="text-[15px] text-ink-600">${esc(config.intro)}</p>
      </div>
      <div id="stats" class="mt-6"></div>
      <div class="mt-6 grid gap-3 border border-hairline bg-white p-4 sm:grid-cols-[1fr_auto_auto] sm:items-end">
        <div>
          <label for="q" class="mb-1.5 block text-[15px] font-semibold">Cari</label>
          <input id="q" type="search" class="w-full rounded-xl border-[1.5px] border-line px-3.5 py-2.5 text-base focus:border-brand-600 focus:outline-none" placeholder="Nama, NISN, atau no. pendaftaran" />
        </div>
        <div>
          <label for="f" class="mb-1.5 block text-[15px] font-semibold">${esc(config.filter.label)}</label>
          <select id="f" class="w-full rounded-xl border-[1.5px] border-line bg-white px-3.5 py-2.5 text-base focus:border-brand-600 focus:outline-none">
            <option value="">Semua</option>${config.filter.options.map((o) => `<option>${esc(o)}</option>`).join("")}
          </select>
        </div>
        <button id="reload" type="button" class="btn h-11 rounded-full px-5 text-base font-semibold shadow-[inset_0_0_0_1px_#D4D4D4]">↻ Muat ulang</button>
      </div>
      <p id="count" class="mt-4 text-[15px] font-semibold text-ink-600" aria-live="polite">Memuat data…</p>
      <div id="list" class="mt-3"></div>
      <div id="pager" class="mt-4"></div>`;

    const page = { rows: [], reload: load, rerender: render };
    const state = { page: 1, sortKey: null, sortDir: "asc" };
    const $q = app.querySelector("#q");
    const $f = app.querySelector("#f");
    const $count = app.querySelector("#count");
    const $list = app.querySelector("#list");
    const $pager = app.querySelector("#pager");
    const $stats = app.querySelector("#stats");
    let currentStats = [];

    function renderStats() {
      if (!config.stats) return;
      currentStats = config.stats(page.rows);
      $stats.innerHTML = statCards(currentStats);
    }

    function render() {
      let rows = filterRows(page.rows, $q.value, { [config.filter.field]: $f.value });
      if (state.sortKey) rows = sortRows(rows, state.sortKey, state.sortDir);
      const pg = paginate(rows, state.page, PAGE_SIZE);
      state.page = pg.page;
      $count.textContent = `${rows.length} dari ${page.rows.length} pendaftar`;
      if (!rows.length) {
        $list.innerHTML = `<div class="border border-hairline bg-white p-8 text-center text-[15px] text-ink-600">Tidak ada data yang cocok.</div>`;
        $pager.innerHTML = "";
        return;
      }
      const actionsHtml = (row) =>
        `<button type="button" data-edit="${esc(row.rowIndex)}" class="btn rounded-full bg-brand-600 px-5 py-2 text-[15px] font-semibold text-white">Ubah</button>` +
        (config.actions || [])
          .filter((a) => !a.show || a.show(row))
          .map(
            (a, i) =>
              `<button type="button" data-action="${i}" data-row="${esc(row.rowIndex)}" class="btn rounded-full px-4 py-2 text-[15px] font-medium shadow-[inset_0_0_0_1px_#D4D4D4]">${esc(a.label)}</button>`
          )
          .join("");
      const th = (c, i) => {
        if (!c.sortKey) return `<th scope="col" class="px-4 py-3 font-medium">${esc(c.label)}</th>`;
        const on = state.sortKey === c.sortKey;
        const arrow = on ? (state.sortDir === "asc" ? "↑" : "↓") : "↕";
        return `<th scope="col" class="px-4 py-3 font-medium" aria-sort="${on ? (state.sortDir === "asc" ? "ascending" : "descending") : "none"}">
          <button type="button" data-sort="${i}" class="inline-flex items-center gap-1 hover:text-ink-900">${esc(c.label)} <span aria-hidden="true">${arrow}</span></button></th>`;
      };
      const table = `
        <div class="hidden overflow-x-auto border border-hairline bg-white md:block">
          <table class="w-full text-left text-[15px]">
            <thead class="border-b border-hairline bg-sand font-mono text-[12.8px] text-ink-600">
              <tr>${config.columns.map(th).join("")}<th class="px-4 py-3"><span class="sr-only">Aksi</span></th></tr>
            </thead>
            <tbody class="divide-y divide-hairline">
              ${pg.items
                .map(
                  (r) =>
                    `<tr class="align-top hover:bg-brand-50">${config.columns.map((c) => `<td class="px-4 py-3">${c.render(r)}</td>`).join("")}<td class="px-4 py-3"><div class="flex flex-wrap justify-end gap-2">${actionsHtml(r)}</div></td></tr>`
                )
                .join("")}
            </tbody>
          </table>
        </div>`;
      const cards = `
        <div class="divide-y divide-hairline border border-hairline bg-white md:hidden">
          ${pg.items
            .map(
              (r) => `<article class="p-4">
                ${config.columns.map((c) => `<div class="flex justify-between gap-3 py-1.5"><span class="font-mono text-[12.8px] text-ink-500">${esc(c.label)}</span><span class="text-right text-[15px]">${c.render(r)}</span></div>`).join("")}
                <div class="mt-3 flex flex-wrap gap-2">${actionsHtml(r)}</div>
              </article>`
            )
            .join("")}
        </div>`;
      $list.innerHTML = table + cards;
      $pager.innerHTML =
        pg.pages <= 1
          ? ""
          : `<nav class="flex items-center justify-between gap-3" aria-label="Halaman">
              <button type="button" data-page="${pg.page - 1}" ${pg.page === 1 ? "disabled" : ""} class="btn rounded-full px-4 py-2 text-[15px] font-medium shadow-[inset_0_0_0_1px_#D4D4D4] disabled:opacity-40">‹ Sebelumnya</button>
              <span class="font-mono text-[13px] text-ink-600">Halaman ${pg.page} dari ${pg.pages}</span>
              <button type="button" data-page="${pg.page + 1}" ${pg.page === pg.pages ? "disabled" : ""} class="btn rounded-full px-4 py-2 text-[15px] font-medium shadow-[inset_0_0_0_1px_#D4D4D4] disabled:opacity-40">Berikutnya ›</button>
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
    $stats.addEventListener("click", (e) => {
      const b = e.target.closest("button[data-stat]");
      const st = b && currentStats[Number(b.dataset.stat)];
      if (!st || st.filter === undefined) return;
      $f.value = st.filter;
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
      } catch (err) {
        $count.textContent = "";
        $list.innerHTML = `<div class="bg-red-50 p-6 text-[15px] font-semibold text-red-700">${esc(err.message)}. Periksa internet lalu tekan Muat ulang.</div>`;
      }
    }

    $q.addEventListener("input", () => { state.page = 1; render(); });
    $f.addEventListener("change", () => { state.page = 1; render(); });
    app.querySelector("#reload").addEventListener("click", load);
    load();
    return page;
  }

  Object.assign(root.AdminUI, { badge, toast, renderShell, statCards, openDialog, downloadFile, modulePage });
})(typeof window !== "undefined" ? window : globalThis);
