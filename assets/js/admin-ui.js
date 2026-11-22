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

  root.AdminUI = { filterRows, changedFields, toCsv, badgeTone };
  if (typeof document === "undefined") return;

  /* ---------- tampilan ---------- */

  const TONE_CLASS = {
    ok: "bg-brand-100 text-brand-700",
    bad: "bg-red-100 text-red-700",
    wait: "bg-amber-100 text-amber-900",
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

  function renderShell(profile, activeId) {
    const A = root.AdminAuth;
    const header = document.getElementById("adminHeader");
    if (!header) return;
    const nav = A.modulesFor(profile.role)
      .map(
        (m) =>
          `<a href="${m.href}" class="whitespace-nowrap rounded-full px-4 py-2 text-[15px] font-semibold ${
            m.id === activeId ? "bg-brand-600 text-white" : "text-ink-600 hover:bg-sand"
          }">${m.icon} ${esc(m.title)}</a>`
      )
      .join("");
    header.innerHTML = `
      <div class="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <a href="dashboard.html" class="flex items-center gap-2.5">
          <span class="grid h-10 w-10 place-items-center rounded-2xl bg-brand-600 text-sm font-extrabold text-white">TN</span>
          <span class="leading-tight"><span class="block text-[15px] font-extrabold">Admin SPMB</span>
          <span class="block text-xs text-ink-500">${esc(profile.nama_lengkap || profile.email)} · ${esc(A.ROLE_LABEL[profile.role])}</span></span>
        </a>
        <button id="btnLogout" type="button" class="rounded-full border-2 border-line bg-white px-4 py-2 text-[15px] font-semibold hover:border-ink-500">Keluar</button>
      </div>
      <nav class="no-scrollbar mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4 pb-3 sm:px-6" aria-label="Modul">${nav}</nav>`;
    document.getElementById("btnLogout").addEventListener("click", () => A.logout());
  }

  // Dialog ubah data. fields: [{name, label, type: select|text|number|textarea|date, options, help}]
  function openDialog({ title, subtitle, fields, values, onSave }) {
    const overlay = document.createElement("div");
    overlay.className = "fixed inset-0 z-[60] overflow-y-auto bg-black/50 p-4";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    const box = document.createElement("form");
    box.className = "mx-auto my-6 w-full max-w-lg rounded-3xl bg-white p-5 sm:p-6";
    box.noValidate = true;
    box.innerHTML = `<h2 class="text-xl font-extrabold">${esc(title)}</h2>${
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
     config: { sheet, profile, title, intro, filter: {field, label, options},
               columns: [{label, render(row)}], fields, editTitle(row),
               beforeSave(changes, row) → changes, actions: [{label, show(row), run(row, page)}] } */
  function modulePage(config) {
    const app = document.getElementById("app");
    app.innerHTML = `
      <div class="flex flex-col gap-1">
        <h1 class="text-2xl font-extrabold tracking-tight sm:text-3xl">${esc(config.title)}</h1>
        <p class="text-[15px] text-ink-600">${esc(config.intro)}</p>
      </div>
      <div class="mt-5 grid gap-3 rounded-3xl bg-white p-4 sm:grid-cols-[1fr_auto_auto] sm:items-end">
        <div>
          <label for="q" class="mb-1.5 block text-[15px] font-semibold">Cari</label>
          <input id="q" type="search" class="w-full rounded-xl border-2 border-line px-3.5 py-3 text-base focus:border-brand-600 focus:outline-none" placeholder="Nama, NISN, atau no. pendaftaran" />
        </div>
        <div>
          <label for="f" class="mb-1.5 block text-[15px] font-semibold">${esc(config.filter.label)}</label>
          <select id="f" class="w-full rounded-xl border-2 border-line bg-white px-3.5 py-3 text-base focus:border-brand-600 focus:outline-none">
            <option value="">Semua</option>${config.filter.options.map((o) => `<option>${esc(o)}</option>`).join("")}
          </select>
        </div>
        <button id="reload" type="button" class="rounded-full border-2 border-line bg-white px-5 py-3 text-base font-semibold hover:border-ink-500">↻ Muat ulang</button>
      </div>
      <p id="count" class="mt-4 text-[15px] font-semibold text-ink-600" aria-live="polite">Memuat data…</p>
      <div id="list" class="mt-3"></div>`;

    const page = { rows: [], reload: load, rerender: render };
    const $q = app.querySelector("#q");
    const $f = app.querySelector("#f");
    const $count = app.querySelector("#count");
    const $list = app.querySelector("#list");

    function render() {
      const rows = filterRows(page.rows, $q.value, { [config.filter.field]: $f.value });
      $count.textContent = `${rows.length} dari ${page.rows.length} pendaftar`;
      if (!rows.length) {
        $list.innerHTML = `<div class="rounded-3xl bg-white p-8 text-center text-[15px] text-ink-600">Tidak ada data yang cocok.</div>`;
        return;
      }
      const actionsHtml = (row) =>
        `<button type="button" data-edit="${esc(row.rowIndex)}" class="rounded-full bg-brand-600 px-5 py-2.5 text-[15px] font-bold text-white hover:bg-brand-700">Ubah</button>` +
        (config.actions || [])
          .filter((a) => !a.show || a.show(row))
          .map(
            (a, i) =>
              `<button type="button" data-action="${i}" data-row="${esc(row.rowIndex)}" class="rounded-full border-2 border-line bg-white px-4 py-2 text-[15px] font-semibold hover:border-ink-500">${esc(a.label)}</button>`
          )
          .join("");
      const table = `
        <div class="hidden overflow-hidden rounded-3xl bg-white md:block">
          <table class="w-full text-left text-[15px]">
            <thead class="bg-sand text-[13px] uppercase tracking-wide text-ink-600">
              <tr>${config.columns.map((c) => `<th class="px-4 py-3 font-bold">${esc(c.label)}</th>`).join("")}<th class="px-4 py-3"></th></tr>
            </thead>
            <tbody class="divide-y divide-line/40">
              ${rows
                .map(
                  (r) =>
                    `<tr class="align-top">${config.columns.map((c) => `<td class="px-4 py-3">${c.render(r)}</td>`).join("")}<td class="px-4 py-3"><div class="flex flex-wrap justify-end gap-2">${actionsHtml(r)}</div></td></tr>`
                )
                .join("")}
            </tbody>
          </table>
        </div>`;
      const cards = `
        <div class="space-y-3 md:hidden">
          ${rows
            .map(
              (r) => `<article class="rounded-3xl bg-white p-4">
                ${config.columns.map((c) => `<div class="flex justify-between gap-3 border-b border-line/30 py-2 last:border-0"><span class="text-[13px] font-semibold text-ink-500">${esc(c.label)}</span><span class="text-right text-[15px]">${c.render(r)}</span></div>`).join("")}
                <div class="mt-3 flex flex-wrap gap-2">${actionsHtml(r)}</div>
              </article>`
            )
            .join("")}
        </div>`;
      $list.innerHTML = table + cards;
    }

    $list.addEventListener("click", (e) => {
      const btn = e.target.closest("button");
      if (!btn) return;
      const idx = btn.dataset.edit ?? btn.dataset.row;
      const row = page.rows.find((r) => String(r.rowIndex) === String(idx));
      if (!row) return;
      if (btn.dataset.edit !== undefined) edit(row);
      else config.actions[Number(btn.dataset.action)].run(row, page);
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
          render();
          toast(`Tersimpan: ${row.namaLengkap || row.noPendaftaran}`);
        },
      });
    }

    async function load() {
      $count.textContent = "Memuat data…";
      try {
        page.rows = await root.Sheetson.getRows(config.sheet);
        render();
      } catch (err) {
        $count.textContent = "";
        $list.innerHTML = `<div class="rounded-3xl bg-red-50 p-6 text-[15px] font-semibold text-red-700">${esc(err.message)}. Periksa internet lalu tekan Muat ulang.</div>`;
      }
    }

    $q.addEventListener("input", render);
    $f.addEventListener("change", render);
    app.querySelector("#reload").addEventListener("click", load);
    load();
    return page;
  }

  Object.assign(root.AdminUI, { badge, toast, renderShell, openDialog, downloadFile, modulePage });
})(typeof window !== "undefined" ? window : globalThis);
