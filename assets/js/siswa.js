/* ============================================================
   siswa.js — halaman "Lengkapi Berkas": siswa login (NISN + password),
   melihat status, dan mengunggah berkas tambahan.
   Membutuhkan: APP_CONFIG, Sheetson, supabase-js.
   ============================================================ */
(function (root) {
  const SHEET = "Verifikasi_Berkas";
  const MAX_SIZE = 5 * 1024 * 1024;
  const ALLOWED_EXT = ["pdf", "jpg", "jpeg", "png"];

  /* ---------- fungsi murni (dites) ---------- */
  function appendLine(old, add) {
    const s = String(old ?? "").trim();
    return s === "" || s === "-" ? add : `${s}\n${add}`;
  }
  function findMyRow(rows, nisn) {
    const n = root.Sheetson.normNisn(nisn);
    return rows.find((r) => root.Sheetson.normNisn(r.nisn) === n) || null;
  }
  const nisnFromEmail = (email) => String(email || "").split("@")[0];

  root.Siswa = { appendLine, findMyRow, nisnFromEmail };
  if (typeof document === "undefined") return;

  /* ---------- halaman ---------- */
  const esc = (s) => root.Sheetson.escapeHtml(s);
  const $ = (id) => document.getElementById(id);
  let client = null;
  const db = () =>
    (client =
      client ||
      root.supabase.createClient(root.APP_CONFIG.supabase.url, root.APP_CONFIG.supabase.anonKey, {
        auth: { storageKey: "spmb-siswa" },
      }));

  function show(id) {
    ["loginView", "homeView"].forEach((v) => $(v).classList.toggle("hidden", v !== id));
  }
  function msg(el, text, good) {
    el.textContent = text;
    el.className = `mt-3 rounded-md p-3 text-[14.5px] font-medium ${good ? "bg-ok-50 text-ok-700" : "bg-red-50 text-red-700"}`;
  }

  async function loadHome(user) {
    show("homeView");
    const nisn = nisnFromEmail(user.email);
    $("homeNisn").textContent = nisn;
    $("homeBody").innerHTML = `<p class="text-[15px] text-ink-600">Memuat data pendaftaran…</p>`;
    let row = null;
    try {
      row = findMyRow(await root.Sheetson.getRows(SHEET), nisn);
    } catch (e) {
      $("homeBody").innerHTML = `<p class="rounded-2xl bg-red-50 p-4 text-[15px] font-semibold text-red-700">${esc(e.message)}. Periksa internet lalu muat ulang.</p>`;
      return;
    }
    if (!row) {
      $("homeBody").innerHTML = `<p class="rounded-lg bg-warn-50 p-4 text-[15px] font-semibold text-warn-700">Data pendaftaran Anda belum terbaca. Tunggu beberapa menit lalu tekan Muat ulang. Kalau tetap tidak muncul, hubungi panitia.</p>`;
      $("uploadBox").classList.add("hidden");
      return;
    }
    $("uploadBox").classList.remove("hidden");
    const urls = String(row.urlBerkas || "").split(/\r?\n/).filter((u) => /^https?:\/\//.test(u.trim()));
    const names = String(row.namaBerkas || "").split(/\r?\n/);
    const catatan = row.catatanAdmin && row.catatanAdmin !== "-" && !/^Berkas gagal diunggah otomatis/.test(row.catatanAdmin) ? row.catatanAdmin : "";
    $("homeBody").innerHTML = `
      <p class="text-lg font-semibold">${esc(row.namaLengkap || "-")}</p>
      <p class="text-[15px] text-ink-600">No. pendaftaran <b class="text-ink-900">${esc(row.noPendaftaran || "-")}</b> · Jurusan ${esc(row.jurusan1 || "-")}</p>
      <dl class="mt-4 grid gap-3 sm:grid-cols-2">
        <div class="rounded-lg bg-sand p-4"><dt class="text-[13px] font-semibold text-ink-500">Status pendaftaran</dt><dd class="mt-1 text-lg font-semibold">${esc(row.statusPendaftaran || "Pending")}</dd></div>
        <div class="rounded-lg bg-sand p-4"><dt class="text-[13px] font-semibold text-ink-500">Status berkas</dt><dd class="mt-1 text-lg font-semibold">${esc(row.statusBerkas || "Belum Unggah")}</dd></div>
      </dl>
      ${catatan ? `<p class="mt-3 rounded-lg bg-warn-50 p-4 text-[15px] text-warn-700"><b>Catatan panitia:</b> ${esc(catatan)}</p>` : ""}
      <h3 class="mt-5 text-base font-semibold">Berkas yang sudah diunggah</h3>
      ${
        urls.length
          ? `<ul class="mt-2 space-y-1.5">${urls.map((u, i) => `<li><a href="${esc(u.trim())}" target="_blank" rel="noopener" class="font-semibold text-brand-700 underline">${esc(names[i] && names[i] !== "-" ? names[i] : "Berkas " + (i + 1))}</a></li>`).join("")}</ul>`
          : `<p class="mt-1 text-[15px] text-ink-600">Belum ada berkas.</p>`
      }`;
    $("uploadBox").dataset.row = row.rowIndex;
    $("uploadBox")._row = row;
  }

  async function upload(user) {
    const input = $("fileInput");
    const info = $("uploadMsg");
    const file = input.files && input.files[0];
    if (!file) return msg(info, "Pilih berkas terlebih dahulu.", false);
    const ext = file.name.split(".").pop().toLowerCase();
    if (!ALLOWED_EXT.includes(ext)) return msg(info, "Jenis berkas harus PDF, JPG, atau PNG.", false);
    if (file.size > MAX_SIZE) return msg(info, "Ukuran berkas lebih dari 5 MB. Pilih berkas yang lebih kecil.", false);
    const row = $("uploadBox")._row;
    const btn = $("uploadBtn");
    btn.disabled = true;
    btn.textContent = "Mengunggah…";
    try {
      const bucket = root.APP_CONFIG.supabase.bucketName;
      const path = `siswa/${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const up = await db().storage.from(bucket).upload(path, file);
      if (up.error) throw new Error("Unggah gagal: " + up.error.message);
      const url = db().storage.from(bucket).getPublicUrl(path).data.publicUrl;
      await root.Sheetson.patchRow(SHEET, row.rowIndex, {
        namaBerkas: appendLine(row.namaBerkas, file.name),
        urlBerkas: appendLine(row.urlBerkas, url),
        statusBerkas: "Sudah Unggah",
      });
      input.value = "";
      $("fileName").textContent = "";
      msg(info, `✓ ${file.name} berhasil diunggah. Panitia akan memeriksanya.`, true);
      await loadHome(user);
    } catch (e) {
      msg(info, e.message || "Gagal mengunggah. Coba lagi.", false);
    }
    btn.disabled = false;
    btn.textContent = "Unggah berkas";
  }

  // Panel login siswa di beranda (#login). Supabase & sheet baru dimuat saat panel dibuka.
  let started = false;
  let user = null;

  async function start() {
    if (started) return;
    started = true;
    $("togglePw").addEventListener("click", (e) => {
      const pw = $("password");
      const s = pw.type === "password";
      pw.type = s ? "text" : "password";
      e.target.textContent = s ? "Sembunyikan" : "Lihat";
      e.target.setAttribute("aria-pressed", String(s));
    });
    $("lupaBtn").addEventListener("click", () => {
      const open = $("lupaInfo").classList.toggle("hidden") === false;
      $("lupaBtn").setAttribute("aria-expanded", String(open));
    });
    $("loginForm").addEventListener("submit", async (e) => {
      e.preventDefault();
      const nisn = $("nisn").value.trim();
      const pw = $("password").value;
      const err = $("loginError");
      if (!/^\d{10}$/.test(nisn) || !pw) return msg(err, "Isi NISN (10 angka) dan password.", false);
      const btn = $("loginBtn");
      btn.disabled = true;
      btn.textContent = "Memeriksa…";
      const res = await db().auth.signInWithPassword({ email: `${nisn}@${root.APP_CONFIG.emailDomain.siswa}`, password: pw });
      btn.disabled = false;
      btn.textContent = "Masuk";
      if (res.error) return msg(err, "NISN atau password salah. Lupa password? Hubungi panitia.", false);
      err.className = "hidden";
      user = res.data.user;
      $("password").value = "";
      loadHome(user);
    });
    $("fileInput").addEventListener("change", () => {
      const f = $("fileInput").files[0];
      $("fileName").textContent = f ? `${f.name} (${Math.max(1, Math.round(f.size / 1024))} KB)` : "";
    });
    $("uploadBtn").addEventListener("click", () => upload(user));
    $("reloadBtn").addEventListener("click", () => user && loadHome(user));
    $("logoutBtn").addEventListener("click", async () => {
      await db().auth.signOut().catch(() => {});
      user = null;
      show("loginView");
    });

    const { data } = await db().auth.getSession();
    user = data && data.session && data.session.user;
    if (user) loadHome(user);
    else show("loginView");
  }

  function setPanel(open) {
    const panel = $("siswaPanel");
    if (!panel) return;
    panel.classList.toggle("hidden", !open);
    document.documentElement.classList.toggle("overflow-hidden", open);
    if (open) {
      start();
      setTimeout(() => {
        const first = !$("loginView").classList.contains("hidden") ? $("nisn") : $("siswaClose");
        if (first) first.focus();
      }, 50);
    }
  }
  function closePanel() {
    if (root.location.hash === "#login") root.history.pushState(null, "", root.location.pathname + root.location.search);
    setPanel(false);
  }

  document.addEventListener("DOMContentLoaded", () => {
    if (!$("siswaPanel")) return;
    const sync = () => setPanel(root.location.hash === "#login");
    root.addEventListener("hashchange", sync);
    root.addEventListener("popstate", sync);
    $("siswaClose").addEventListener("click", closePanel);
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !$("siswaPanel").classList.contains("hidden")) closePanel();
    });
    sync();
  });
})(typeof window !== "undefined" ? window : globalThis);
