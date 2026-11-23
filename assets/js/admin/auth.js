/* ============================================================
   admin-auth.js — login petugas lewat Supabase Auth + peran dari
   tabel public.profiles. Tidak ada password di file ini.
   ============================================================ */
(function (root) {
  // Hosting seperti Vercel melayani "/admin" TANPA garis miring akhir. Tanpa "/",
  // peramban membaca "dashboard.html" sebagai "/dashboard.html" (404). Arahkan ke "/admin/".
  function folderUrl(pathname, search, hash) {
    if (/\/[^/.]+$/.test(pathname) && /admin$/.test(pathname)) return `${pathname}/${search}${hash}`;
    return null;
  }
  if (root.location && root.location.replace) {
    const fixed = folderUrl(root.location.pathname, root.location.search, root.location.hash);
    if (fixed) root.location.replace(fixed);
  }

  const ROLE_LABEL = Object.freeze({
    superadmin: "Superadmin",
    verifikasi: "Petugas Verifikasi",
    keuangan: "Bendahara",
    tes_fisik: "Petugas Tes Fisik",
  });

  const MODULES = Object.freeze([
    { id: "verifikasi", href: "#verifikasi", title: "Verifikasi Berkas", desc: "Periksa berkas, ubah status pendaftaran, hubungi orang tua.", roles: ["verifikasi"] },
    { id: "keuangan", href: "#keuangan", title: "Keuangan & Voucher", desc: "Catat pembayaran, potongan, dan status voucher.", roles: ["keuangan"] },
    { id: "tes-fisik", href: "#tes-fisik", title: "Tes Fisik & Seragam", desc: "Isi tinggi/berat, hasil tes fisik, dan ukuran seragam.", roles: ["tes_fisik"] },
    {
      id: "superadmin", href: "#superadmin", title: "Superadmin", desc: "Pengaturan situs, rekap, unduh data, akun petugas, reset password.", roles: [],
      sub: [
        { id: "pengaturan", title: "Pengaturan situs" },
        { id: "rekap", title: "Rekap & unduh data" },
        { id: "petugas", title: "Akun petugas" },
        { id: "reset", title: "Reset password" },
        { id: "riwayat", title: "Riwayat aktivitas" },
      ],
    },
  ]);

  // "#keuangan" → "keuangan"; "#superadmin/petugas" → "superadmin"; selain modul yang dikenal → "dashboard"
  function routeFromHash(hash) {
    const id = String(hash || "").replace(/^#\/?/, "").split("/")[0];
    return MODULES.some((m) => m.id === id) ? id : "dashboard";
  }
  // Sub-menu: "#superadmin/petugas" → "petugas"; tanpa/tak dikenal → sub pertama; modul tanpa sub → null
  function subFromHash(hash) {
    const [id, sub] = String(hash || "").replace(/^#\/?/, "").split("/");
    const m = MODULES.find((x) => x.id === id);
    if (!m || !m.sub) return null;
    return m.sub.some((s) => s.id === sub) ? sub : m.sub[0].id;
  }

  const isStaffRole = (role) => Object.prototype.hasOwnProperty.call(ROLE_LABEL, role || "");

  // Superadmin boleh semua; peran lain hanya yang ada di `allowed` (kosong = semua petugas).
  function canOpen(role, allowed) {
    if (!isStaffRole(role)) return false;
    if (role === "superadmin") return true;
    return allowed.length === 0 || allowed.includes(role);
  }

  const modulesFor = (role) =>
    MODULES.filter((m) => role === "superadmin" || (isStaffRole(role) && m.roles.includes(role)));

  function usernameToEmail(username) {
    const u = String(username || "").trim().toLowerCase();
    return u.includes("@") ? u : `${u}@${root.APP_CONFIG.emailDomain.petugas}`;
  }

  let client = null;
  function getClient() {
    if (!client) {
      const { url, anonKey } = root.APP_CONFIG.supabase;
      client = root.supabase.createClient(url, anonKey, { auth: { storageKey: "spmb-petugas" } });
    }
    return client;
  }

  // ---------- Keluar otomatis bila diam 20 menit ----------
  // Waktu aktivitas terakhir disimpan di localStorage supaya semua tab admin
  // berbagi hitungan yang sama (bekerja di satu tab menjaga tab lain tetap masuk).
  const BATAS_DIAM = 20 * 60 * 1000;
  const PERINGATAN_DIAM = 60 * 1000;
  const KUNCI_AKTIF = "spmb-admin-aktif";

  // Belum pernah tercatat (mis. sesi dari sebelum fitur ini) → jangan langsung keluar.
  const sesiHabis = (terakhir, sekarang, batas = BATAS_DIAM) =>
    Number.isFinite(terakhir) && terakhir > 0 && sekarang - terakhir >= batas;
  const sisaDiam = (terakhir, sekarang, batas = BATAS_DIAM) => Math.max(0, terakhir + batas - sekarang);

  function bacaAktif() {
    try {
      return Number(root.localStorage.getItem(KUNCI_AKTIF)) || null;
    } catch (_) {
      return null;
    }
  }
  function catatAktif(waktu = Date.now()) {
    try {
      root.localStorage.setItem(KUNCI_AKTIF, String(waktu));
    } catch (_) {}
  }
  function hapusAktif() {
    try {
      root.localStorage.removeItem(KUNCI_AKTIF);
    } catch (_) {}
  }

  let pantauanDiam = false;
  function pantauDiam() {
    if (pantauanDiam || !root.document) return;
    pantauanDiam = true;
    const doc = root.document;
    let tulisTerakhir = 0;
    let keluar = false;
    let kotak = null;

    const aktif = () => {
      if (keluar) return;
      const now = Date.now();
      // Kembali dari laptop tidur lewat 20 menit: aktivitas pertama tidak boleh menghidupkan sesi lagi.
      if (sesiHabis(bacaAktif(), now)) return periksa();
      // dibatasi sekali per 5 detik, kecuali saat peringatan tampil (harus langsung tertutup)
      if (kotak || now - tulisTerakhir > 5000) {
        tulisTerakhir = now;
        catatAktif(now);
      }
      if (kotak) periksa();
    };

    function tampilPeringatan(detik) {
      if (!kotak) {
        kotak = doc.createElement("div");
        kotak.setAttribute("role", "alertdialog");
        kotak.setAttribute("aria-live", "assertive");
        kotak.setAttribute("aria-labelledby", "diamJudul");
        kotak.className =
          "fixed bottom-5 left-1/2 z-[80] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 rounded-2xl border border-hairline bg-white p-5 shadow-soft";
        kotak.innerHTML = `<p id="diamJudul" class="text-[16px] font-semibold tracking-tight">Masih di sana?</p>
          <p class="mt-1 text-[15px] text-ink-600">Tidak ada aktivitas hampir 20 menit. Anda akan keluar otomatis dalam <b data-diam-detik class="tabular-nums text-ink-900"></b> detik.</p>
          <div class="mt-4 flex justify-end gap-2">
            <button type="button" data-diam-keluar class="rounded-full px-4 py-2 text-[14px] font-medium text-ink-600 shadow-[inset_0_0_0_1px_rgb(var(--garis-tombol))] hover:bg-sand hover:text-ink-900">Keluar sekarang</button>
            <button type="button" data-diam-lanjut class="rounded-full bg-ink-900 px-4 py-2 text-[14px] font-medium text-white">Tetap masuk</button>
          </div>`;
        kotak.querySelector("[data-diam-lanjut]").addEventListener("click", () => {
          tulisTerakhir = 0;
          aktif();
        });
        kotak.querySelector("[data-diam-keluar]").addEventListener("click", () => logout());
        doc.body.appendChild(kotak);
        kotak.querySelector("[data-diam-lanjut]").focus();
      }
      kotak.querySelector("[data-diam-detik]").textContent = String(detik);
    }
    function tutupPeringatan() {
      if (kotak) kotak.remove();
      kotak = null;
    }

    function periksa() {
      if (keluar) return;
      const terakhir = bacaAktif();
      if (!terakhir) return catatAktif();
      const now = Date.now();
      if (sesiHabis(terakhir, now)) {
        keluar = true;
        return logout("habis");
      }
      const sisa = sisaDiam(terakhir, now);
      if (sisa <= PERINGATAN_DIAM) tampilPeringatan(Math.ceil(sisa / 1000));
      else tutupPeringatan();
    }

    ["pointerdown", "keydown", "wheel", "touchstart", "scroll", "mousemove"].forEach((ev) =>
      doc.addEventListener(ev, aktif, { passive: true, capture: true })
    );
    // Laptop bangun dari tidur / tab dibuka lagi: timer mungkin tertunda, periksa langsung.
    doc.addEventListener("visibilitychange", () => doc.visibilityState === "visible" && periksa());
    root.addEventListener("focus", periksa);
    // Tab lain mencatat aktivitas / keluar
    root.addEventListener("storage", (e) => e.key === KUNCI_AKTIF && periksa());
    root.setInterval(periksa, 1000);
    periksa();
  }

  async function getProfile() {
    const c = getClient();
    const { data } = await c.auth.getSession();
    const user = data && data.session && data.session.user;
    if (!user) return null;
    const { data: profile, error } = await c.from("profiles").select("id, email, nama_lengkap, role").eq("id", user.id).maybeSingle();
    if (error || !profile) return null;
    return profile;
  }

  // Catat aktivitas petugas ke tabel "riwayat" (hanya superadmin yang bisa membaca).
  // Nama/peran/waktu diisi server. Gagal (tabel belum ada / offline) diabaikan agar kerja tidak terganggu.
  // JANGAN pernah memasukkan password ke catatan.
  function catat({ aksi, modul, sasaran, detail } = {}, { tunggu = false } = {}) {
    let kirim;
    try {
      kirim = Promise.resolve(
        getClient()
          .from("riwayat")
          .insert({ aksi, modul: modul || null, sasaran: sasaran || null, detail: detail || null })
      ).then(() => {}, () => {});
    } catch {
      kirim = Promise.resolve();
    }
    return tunggu ? Promise.race([kirim, new Promise((r) => setTimeout(r, 1500))]) : kirim;
  }

  async function login(username, password) {
    const c = getClient();
    const { error } = await c.auth.signInWithPassword({ email: usernameToEmail(username), password });
    if (error) return { ok: false, error: "Username atau password salah." };
    const profile = await getProfile();
    if (!profile || !isStaffRole(profile.role)) {
      await c.auth.signOut();
      return { ok: false, error: "Akun ini bukan akun petugas. Hubungi superadmin." };
    }
    catatAktif();
    await catat({ aksi: "Masuk" }, { tunggu: true });
    return { ok: true, role: profile.role };
  }

  // alasan "habis" → halaman login menjelaskan sesi berakhir karena diam 20 menit
  async function logout(alasan) {
    await catat({ aksi: alasan === "habis" ? "Keluar otomatis (diam 20 menit)" : "Keluar" }, { tunggu: true });
    hapusAktif();
    await getClient().auth.signOut().catch(() => {});
    root.location.replace(alasan === "habis" ? "index.html?sesi=habis" : "index.html");
  }

  // Dipanggil di awal setiap halaman admin. Tidak pernah selesai bila diarahkan.
  async function requireRole(allowed = []) {
    const profile = await getProfile();
    if (!profile || !isStaffRole(profile.role)) {
      root.location.replace("index.html");
      return new Promise(() => {});
    }
    // Halaman dibuka lagi setelah ditinggal lebih dari 20 menit
    if (sesiHabis(bacaAktif(), Date.now())) {
      await logout("habis");
      return new Promise(() => {});
    }
    catatAktif();
    pantauDiam();
    if (!canOpen(profile.role, allowed)) {
      root.location.replace("dashboard.html#dashboard");
      return new Promise(() => {});
    }
    return profile;
  }

  root.AdminAuth = { catat, folderUrl, routeFromHash, subFromHash, ROLE_LABEL, MODULES, isStaffRole, canOpen, modulesFor, usernameToEmail, getClient, getProfile, login, logout, requireRole, BATAS_DIAM, sesiHabis, sisaDiam };
})(typeof window !== "undefined" ? window : globalThis);
