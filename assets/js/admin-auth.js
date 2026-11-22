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
    { id: "superadmin", href: "#superadmin", title: "Superadmin", desc: "Rekap, unduh data, kelola akun petugas, reset password.", roles: [] },
  ]);

  // "#keuangan" → "keuangan"; selain modul yang dikenal → "dashboard"
  function routeFromHash(hash) {
    const id = String(hash || "").replace(/^#\/?/, "");
    return MODULES.some((m) => m.id === id) ? id : "dashboard";
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

  async function getProfile() {
    const c = getClient();
    const { data } = await c.auth.getSession();
    const user = data && data.session && data.session.user;
    if (!user) return null;
    const { data: profile, error } = await c.from("profiles").select("id, email, nama_lengkap, role").eq("id", user.id).maybeSingle();
    if (error || !profile) return null;
    return profile;
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
    return { ok: true, role: profile.role };
  }

  async function logout() {
    await getClient().auth.signOut().catch(() => {});
    root.location.replace("index.html");
  }

  // Dipanggil di awal setiap halaman admin. Tidak pernah selesai bila diarahkan.
  async function requireRole(allowed = []) {
    const profile = await getProfile();
    if (!profile || !isStaffRole(profile.role)) {
      root.location.replace("index.html");
      return new Promise(() => {});
    }
    if (!canOpen(profile.role, allowed)) {
      root.location.replace("dashboard.html#dashboard");
      return new Promise(() => {});
    }
    return profile;
  }

  root.AdminAuth = { folderUrl, routeFromHash, ROLE_LABEL, MODULES, isStaffRole, canOpen, modulesFor, usernameToEmail, getClient, getProfile, login, logout, requireRole };
})(typeof window !== "undefined" ? window : globalThis);
