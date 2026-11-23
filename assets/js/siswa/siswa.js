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

  // Warna badge status: ok (hijau) | bad (merah) | info (biru) | wait (kuning)
  function nadaStatus(text) {
    const t = String(text || "");
    if (/Ditolak|Gagal/i.test(t)) return "bad";
    if (/Diterima|Terverifikasi|Sudah/i.test(t)) return "ok";
    if (/Diverifikasi/i.test(t)) return "info";
    return "wait";
  }

  // Empat langkah pendaftaran untuk ditampilkan ke siswa.
  // state: done (selesai) | now (sedang berjalan) | todo (belum) | bad (perlu tindakan / tidak lolos)
  function langkahSiswa(row) {
    const b = String((row && row.statusBerkas) || "").trim();
    const s = String((row && row.statusPendaftaran) || "").trim() || "Pending";
    const berkas = /Terverifikasi/i.test(b)
      ? ["done", "Diterima panitia"]
      : /Sudah/i.test(b)
        ? ["done", "Menunggu diperiksa"]
        : /Gagal/i.test(b)
          ? ["bad", "Gagal terunggah, unggah ulang"]
          : /Ditolak/i.test(b)
            ? ["bad", "Ditolak, unggah ulang"]
            : ["now", "Unggah ijazah/SKL"];
    const sudahDiperiksa = /^(Diverifikasi|Diterima|Ditolak)$/i.test(s);
    const verif = sudahDiperiksa ? ["done", "Data sudah dicek"] : [berkas[0] === "done" ? "now" : "todo", "Menunggu panitia"];
    const hasil = /^Diterima$/i.test(s)
      ? ["done", "Selamat, kamu diterima!"]
      : /^Ditolak$/i.test(s)
        ? ["bad", "Belum diterima"]
        : [/^Diverifikasi$/i.test(s) ? "now" : "todo", "Diumumkan panitia"];
    return [
      { label: "Terdaftar", state: "done", ket: "Nomor sudah terbit" },
      { label: "Berkas", state: berkas[0], ket: berkas[1] },
      { label: "Verifikasi", state: verif[0], ket: verif[1] },
      { label: "Hasil", state: hasil[0], ket: hasil[1] },
    ];
  }

  root.Siswa = { appendLine, findMyRow, nisnFromEmail, nadaStatus, langkahSiswa };
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
    // Tombol Keluar di bilah atas hanya muncul saat sudah login (selalu terlihat walau digulir)
    const masuk = id === "homeView";
    $("logoutTop").classList.toggle("hidden", !masuk);
    $("logoutTop").classList.toggle("flex", masuk);
    // Di HP, label "Beranda" disembunyikan agar tombol Keluar muat
    $("labelBeranda").classList.toggle("hidden", masuk);
    $("labelBeranda").classList.toggle("sm:inline", masuk);
  }

  const WARNA_NADA = {
    ok: "bg-ok-50 text-ok-700",
    bad: "bg-red-50 text-red-700",
    info: "bg-info-50 text-info-700",
    wait: "bg-warn-50 text-warn-700",
  };
  const TITIK_NADA = { ok: "#16A34A", bad: "#DC2626", info: "#0284C7", wait: "#D97706" };
  const badgeSiswa = (text) => {
    const n = nadaStatus(text);
    return `<span class="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[13.5px] font-semibold leading-tight sm:text-[14px] ${WARNA_NADA[n]}"><span class="h-2 w-2 rounded-full" style="background:${TITIK_NADA[n]}" aria-hidden="true"></span>${esc(text)}</span>`;
  };
  const IKON_CENTANG = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>`;
  const IKON_BERKAS = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/></svg>`;
  const STATE_TEKS = { done: "selesai", now: "sedang berjalan", todo: "belum", bad: "perlu perhatian" };

  function langkahHtml(row) {
    const daftar = langkahSiswa(row);
    const bulat = (l, i) => {
      if (l.state === "done") return `<span class="grid h-9 w-9 place-items-center rounded-full" style="background:#16523A;color:#fff">${IKON_CENTANG}</span>`;
      if (l.state === "bad") return `<span class="grid h-9 w-9 place-items-center rounded-full bg-red-600 text-[16px] font-bold" style="color:#fff">!</span>`;
      if (l.state === "now") return `<span class="grid h-9 w-9 place-items-center rounded-full bg-pink-50 text-[15px] font-bold text-pink-600 shadow-[0_0_0_2px_#EC4899]">${i + 1}</span>`;
      return `<span class="grid h-9 w-9 place-items-center rounded-full bg-sand text-[15px] font-semibold text-ink-500 shadow-[inset_0_0_0_1px_rgb(var(--hairline))]">${i + 1}</span>`;
    };
    return `<ol class="mt-4 grid grid-cols-4" aria-label="Tahapan pendaftaran">${daftar
      .map(
        (l, i) => `<li class="relative flex flex-col items-center text-center">
          ${i < daftar.length - 1 ? `<span class="absolute left-1/2 top-[17px] h-0.5 w-full ${l.state === "done" ? "" : "bg-hairline"}" style="${l.state === "done" ? "background:#16523A" : ""}" aria-hidden="true"></span>` : ""}
          <span class="relative">${bulat(l, i)}</span>
          <span class="mt-2 text-[13.5px] font-semibold sm:text-[14.5px] ${l.state === "todo" ? "text-ink-500" : ""}">${esc(l.label)}</span>
          <span class="mt-0.5 px-1 text-[12px] leading-snug sm:text-[13px] ${l.state === "bad" ? "font-medium text-red-700" : l.state === "now" ? "font-medium text-pink-600" : "text-ink-500"}">${esc(l.ket)}</span>
          <span class="sr-only">(${STATE_TEKS[l.state]})</span>
        </li>`,
      )
      .join("")}</ol>`;
  }
  function msg(el, text, good) {
    el.textContent = text;
    el.className = `mt-3 rounded-md p-3 text-[14.5px] font-medium ${good ? "bg-ok-50 text-ok-700" : "bg-red-50 text-red-700"}`;
  }

  async function loadHome(user) {
    show("homeView");
    const nisn = nisnFromEmail(user.email);
    $("homeNisn").textContent = nisn;
    $("homeNama").textContent = "Halo 👋";
    $("homeMeta").innerHTML = "";
    $("homeBody").innerHTML = `<div class="border border-hairline bg-white p-5 sm:p-6" aria-hidden="true"><div class="skeleton h-5 w-48"></div><div class="mt-5 grid grid-cols-4 gap-3"><div class="skeleton h-16"></div><div class="skeleton h-16"></div><div class="skeleton h-16"></div><div class="skeleton h-16"></div></div></div><div class="mt-4 grid gap-3 sm:grid-cols-2" aria-hidden="true"><div class="skeleton h-20"></div><div class="skeleton h-20"></div></div><span class="sr-only">Memuat data</span>`;
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
    const nama = String(row.namaLengkap || "").trim();
    $("homeNama").textContent = nama && nama !== "-" ? `Halo, ${nama} 👋` : "Halo 👋";
    const chip = (label, isi, mono) =>
      `<span class="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[13.5px]" style="background:rgba(255,255,255,.12);box-shadow:inset 0 0 0 1px rgba(255,255,255,.2)"><span style="color:rgba(255,255,255,.7)">${label}</span><b class="${mono ? "font-mono " : ""}font-semibold">${esc(isi)}</b></span>`;
    $("homeMeta").innerHTML = chip("No.", row.noPendaftaran || "-", true) + chip("Jurusan", row.jurusan1 || "-");
    const statusDaftar = row.statusPendaftaran && row.statusPendaftaran !== "-" ? row.statusPendaftaran : "Pending";
    const statusBerkas = row.statusBerkas && row.statusBerkas !== "-" ? row.statusBerkas : "Belum Unggah";
    $("homeBody").innerHTML = `
      <div class="border border-hairline bg-white p-5 sm:p-6">
        <h3 class="text-[17px] font-semibold">Tahapan pendaftaranmu</h3>
        ${langkahHtml(row)}
      </div>
      <dl class="mt-4 grid grid-cols-2 gap-3">
        <div class="border border-hairline bg-white p-4 sm:p-5"><dt class="text-[13px] font-medium text-ink-500">Status pendaftaran</dt><dd class="mt-2">${badgeSiswa(statusDaftar)}</dd></div>
        <div class="border border-hairline bg-white p-4 sm:p-5"><dt class="text-[13px] font-medium text-ink-500">Status berkas</dt><dd class="mt-2">${badgeSiswa(statusBerkas)}</dd></div>
      </dl>
      ${
        catatan
          ? `<div class="mt-4 flex gap-3 border-l-4 bg-warn-50 p-4" style="border-color:#F2B53A"><span class="text-[18px] leading-none" aria-hidden="true">📌</span><div><p class="text-[13px] font-semibold uppercase tracking-wide text-warn-700">Catatan panitia</p><p class="mt-1 whitespace-pre-line text-[15px] text-warn-700">${esc(catatan)}</p></div></div>`
          : ""
      }
      <div class="mt-4 border border-hairline bg-white p-5 sm:p-6">
        <div class="flex items-center justify-between gap-3">
          <h3 class="text-[17px] font-semibold">Berkas yang sudah diunggah</h3>
          <span class="rounded-full bg-sand px-2.5 py-0.5 font-mono text-[12.5px] text-ink-600">${urls.length}</span>
        </div>
        ${
          urls.length
            ? `<ul class="mt-3 divide-y divide-hairline border-y border-hairline">${urls
                .map(
                  (u, i) => `<li><a href="${esc(u.trim())}" target="_blank" rel="noopener" class="group flex items-center gap-3 py-3 hover:bg-sand/60">
                    <span class="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-sand text-ink-600">${IKON_BERKAS}</span>
                    <span class="min-w-0 flex-1 truncate text-[15px] font-medium">${esc(names[i] && names[i] !== "-" ? names[i] : "Berkas " + (i + 1))}</span>
                    <span class="shrink-0 pr-1 text-[13.5px] font-medium text-ink-500 group-hover:text-ink-900">Lihat ↗</span>
                  </a></li>`,
                )
                .join("")}</ul>`
            : `<p class="mt-3 bg-sand/70 p-4 text-center text-[14.5px] text-ink-600">Belum ada berkas. Unggah ijazah/SKL di bawah ini.</p>`
        }
      </div>`;
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
      $("logoutInfo").classList.add("hidden");
      $("logoutInfo").classList.remove("flex");
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
    let pemicuKeluar = null;
    const bukaKeluar = (e) => {
      pemicuKeluar = e.currentTarget;
      $("keluarDialog").classList.remove("hidden");
      $("keluarDialog").classList.add("flex");
      $("keluarBatal").focus();
    };
    const tutupKeluar = () => {
      $("keluarDialog").classList.add("hidden");
      $("keluarDialog").classList.remove("flex");
      if (pemicuKeluar && !pemicuKeluar.closest(".hidden")) pemicuKeluar.focus();
    };
    $("logoutBtn").addEventListener("click", bukaKeluar);
    $("logoutTop").addEventListener("click", bukaKeluar);
    $("keluarBatal").addEventListener("click", tutupKeluar);
    $("keluarDialog").addEventListener("click", (e) => e.target === e.currentTarget && tutupKeluar());
    $("keluarDialog").addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        tutupKeluar();
      } else if (e.key === "Tab") {
        // fokus tetap di dalam dialog
        const a = $("keluarBatal"), b = $("keluarYa");
        if (e.shiftKey && document.activeElement === a) (e.preventDefault(), b.focus());
        else if (!e.shiftKey && document.activeElement === b) (e.preventDefault(), a.focus());
      }
    });
    $("keluarYa").addEventListener("click", async () => {
      const btn = $("keluarYa");
      btn.disabled = true;
      btn.textContent = "Keluar…";
      await db().auth.signOut().catch(() => {});
      user = null;
      btn.disabled = false;
      btn.textContent = "Ya, keluar";
      pemicuKeluar = null;
      tutupKeluar();
      $("uploadMsg").className = "hidden";
      $("nisn").value = "";
      show("loginView");
      $("logoutInfo").classList.remove("hidden");
      $("logoutInfo").classList.add("flex");
      $("siswaPanel").scrollTop = 0;
      $("nisn").focus();
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
    panel.classList.toggle("flex", open);
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
    // Logo = kembali ke beranda (tutup panel, tanpa memuat ulang halaman)
    $("siswaHome").addEventListener("click", (e) => {
      e.preventDefault();
      closePanel();
      root.scrollTo({ top: 0, behavior: "smooth" });
    });
    document.addEventListener("keydown", (e) => {
      if (e.key !== "Escape" || $("siswaPanel").classList.contains("hidden")) return;
      if ($("keluarDialog") && !$("keluarDialog").classList.contains("hidden")) return; // dialog keluar menangani Escape sendiri
      closePanel();
    });
    sync();
  });
})(typeof window !== "undefined" ? window : globalThis);
