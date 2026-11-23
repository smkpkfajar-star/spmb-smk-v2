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
  }

  // Tampilan dibuat netral (hitam-abu); warna hanya pada titik kecil status
  const TITIK_NADA = { ok: "#16A34A", bad: "#DC2626", info: "#0284C7", wait: "#D97706" };
  const statusTeks = (text) =>
    `<span class="flex items-start gap-2 text-[15px] font-medium leading-snug"><span class="mt-[7px] h-2 w-2 shrink-0 rounded-full" style="background:${TITIK_NADA[nadaStatus(text)]}" aria-hidden="true"></span>${esc(text)}</span>`;
  const IKON_CENTANG = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>`;
  const IKON_BERKAS = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/></svg>`;
  const STATE_TEKS = { done: "selesai", now: "sedang berjalan", todo: "belum", bad: "perlu perhatian" };

  function langkahHtml(row) {
    const daftar = langkahSiswa(row);
    const bulat = (l, i) => {
      const dasar = "grid h-8 w-8 place-items-center rounded-full text-[13.5px]";
      if (l.state === "done") return `<span class="${dasar} bg-ink-900 text-cream">${IKON_CENTANG}</span>`;
      if (l.state === "bad") return `<span class="${dasar} bg-white font-bold text-red-600 shadow-[inset_0_0_0_2px_#DC2626]">!</span>`;
      if (l.state === "now") return `<span class="${dasar} bg-white font-semibold text-ink-900 shadow-[inset_0_0_0_2px_rgb(var(--ink-900))]">${i + 1}</span>`;
      return `<span class="${dasar} bg-white text-ink-500 shadow-[inset_0_0_0_1px_rgb(var(--hairline))]">${i + 1}</span>`;
    };
    return `<ol class="mt-5 grid grid-cols-4" aria-label="Tahapan pendaftaran">${daftar
      .map(
        (l, i) => `<li class="relative flex flex-col items-center text-center">
          ${i < daftar.length - 1 ? `<span class="absolute left-1/2 top-[15px] h-px w-full ${l.state === "done" ? "bg-ink-900" : "bg-hairline"}" aria-hidden="true"></span>` : ""}
          <span class="relative">${bulat(l, i)}</span>
          <span class="mt-2 text-[13px] font-medium sm:text-[14px] ${l.state === "todo" ? "text-ink-500" : ""}">${esc(l.label)}</span>
          <span class="mt-0.5 px-1 text-[11.5px] leading-snug sm:text-[12.5px] ${l.state === "bad" ? "text-red-700" : "text-ink-500"}">${esc(l.ket)}</span>
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
    $("homeNama").textContent = "Halo";
    $("homeMeta").textContent = "";
    $("homeBody").innerHTML = `<div class="border border-hairline bg-white p-5 sm:p-6" aria-hidden="true"><div class="skeleton h-4 w-40"></div><div class="mt-5 grid grid-cols-4 gap-3"><div class="skeleton h-14"></div><div class="skeleton h-14"></div><div class="skeleton h-14"></div><div class="skeleton h-14"></div></div></div><span class="sr-only">Memuat data</span>`;
    let row = null;
    try {
      row = findMyRow(await root.Sheetson.getRows(SHEET), nisn);
    } catch (e) {
      $("homeBody").innerHTML = `<p class="bg-red-50 p-4 text-[15px] font-medium text-red-700">${esc(e.message)}. Periksa internet lalu muat ulang.</p>`;
      return;
    }
    if (!row) {
      $("homeBody").innerHTML = `<p class="border border-hairline bg-white p-4 text-[15px] text-ink-600">Data pendaftaranmu belum terbaca. Tunggu beberapa menit lalu muat ulang. Kalau tetap tidak muncul, hubungi panitia.</p>`;
      $("uploadBox").classList.add("hidden");
      return;
    }
    $("uploadBox").classList.remove("hidden");
    const urls = String(row.urlBerkas || "").split(/\r?\n/).filter((u) => /^https?:\/\//.test(u.trim()));
    const names = String(row.namaBerkas || "").split(/\r?\n/);
    const catatan = row.catatanAdmin && row.catatanAdmin !== "-" && !/^Berkas gagal diunggah otomatis/.test(row.catatanAdmin) ? row.catatanAdmin : "";
    const nama = String(row.namaLengkap || "").trim();
    $("homeNama").textContent = nama && nama !== "-" ? `Halo, ${nama}` : "Halo";
    $("homeMeta").textContent = `${row.noPendaftaran || "-"} · ${row.jurusan1 || "-"}`;
    const statusDaftar = row.statusPendaftaran && row.statusPendaftaran !== "-" ? row.statusPendaftaran : "Pending";
    const statusBerkas = row.statusBerkas && row.statusBerkas !== "-" ? row.statusBerkas : "Belum Unggah";
    $("homeBody").innerHTML = `
      <div class="border border-hairline bg-white p-5 sm:p-6">
        <h3 class="text-[16px] font-semibold">Tahapan pendaftaran</h3>
        ${langkahHtml(row)}
        <dl class="mt-5 grid grid-cols-2 gap-4 border-t border-hairline pt-4">
          <div><dt class="text-[12.5px] text-ink-500">Status pendaftaran</dt><dd class="mt-1">${statusTeks(statusDaftar)}</dd></div>
          <div><dt class="text-[12.5px] text-ink-500">Status berkas</dt><dd class="mt-1">${statusTeks(statusBerkas)}</dd></div>
        </dl>
      </div>
      ${
        catatan
          ? `<div class="mt-3 border border-hairline border-l-2 border-l-ink-900 bg-white p-4 sm:px-6"><p class="text-[12.5px] text-ink-500">Catatan panitia</p><p class="mt-1 whitespace-pre-line text-[15px]">${esc(catatan)}</p></div>`
          : ""
      }
      <div class="mt-3 border border-hairline bg-white p-5 sm:p-6">
        <h3 class="text-[16px] font-semibold">Berkas terunggah <span class="font-normal text-ink-500">(${urls.length})</span></h3>
        ${
          urls.length
            ? `<ul class="mt-3 divide-y divide-hairline border-t border-hairline">${urls
                .map(
                  (u, i) => `<li><a href="${esc(u.trim())}" target="_blank" rel="noopener" class="group flex items-center gap-3 py-3">
                    <span class="shrink-0 text-ink-500">${IKON_BERKAS}</span>
                    <span class="min-w-0 flex-1 truncate text-[15px] group-hover:underline">${esc(names[i] && names[i] !== "-" ? names[i] : "Berkas " + (i + 1))}</span>
                    <span class="shrink-0 text-[13px] text-ink-500 group-hover:text-ink-900">Lihat ↗</span>
                  </a></li>`,
                )
                .join("")}</ul>`
            : `<p class="mt-1 text-[14.5px] text-ink-500">Belum ada berkas.</p>`
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
    // Unduh ulang bukti pendaftaran — dibuat dari data terbaru di sheet
    $("buktiBtn").addEventListener("click", async () => {
      if (!user) return;
      const btn = $("buktiBtn");
      const label = btn.querySelector("span");
      const info = $("buktiMsg");
      info.className = "hidden";
      btn.disabled = true;
      label.textContent = "Menyiapkan PDF…";
      try {
        const data = await root.BuktiPdf.cariData({ nisn: nisnFromEmail(user.email) });
        if (!data) throw new Error("Data pendaftaranmu belum terbaca. Tunggu beberapa menit lalu coba lagi.");
        await root.BuktiPdf.unduh(data);
        info.textContent = "Bukti pendaftaran diunduh. Cetak di kertas F4, lalu tanda tangani bersama orang tua/wali.";
        info.className = "mt-3 rounded-md bg-sand p-3 text-[14px] text-ink-600";
      } catch (e) {
        msg(info, e.message || "Gagal membuat PDF. Coba lagi.", false);
      }
      btn.disabled = false;
      label.textContent = "Unduh bukti pendaftaran (PDF)";
    });
    // Keluar cukup sekali ketuk (masuk lagi pun mudah); pesan singkat muncul di form login
    $("logoutBtn").addEventListener("click", async () => {
      $("logoutBtn").disabled = true;
      await db().auth.signOut().catch(() => {});
      $("logoutBtn").disabled = false;
      user = null;
      $("uploadMsg").className = "hidden";
      $("buktiMsg").className = "hidden";
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
      closePanel();
    });
    sync();
  });
})(typeof window !== "undefined" ? window : globalThis);
