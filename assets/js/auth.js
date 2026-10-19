// assets/js/auth.js

// Konfigurasi Kredensial Admin Simulasi (Dapat dihubungkan ke Supabase/Database)
const ADMIN_ACCOUNTS = [
  { username: "superadmin", pass: "admin123", name: "Super Admin SPMB", role: "superadmin" },
  { username: "verifikasi", pass: "verifikasi123", name: "Admin Verifikasi Berkas", role: "verifikasi" },
  { username: "keuangan", pass: "keuangan123", name: "Bendahara Keuangan", role: "keuangan" },
  { username: "fisik", pass: "fisik123", name: "Petugas Tes Fisik", role: "tes-fisik" }
];

function loginAdmin(username, password) {
  const account = ADMIN_ACCOUNTS.find(
    (acc) => acc.username === username && acc.pass === password
  );
  if (account) {
    const sessionData = {
      username: account.username,
      name: account.name,
      role: account.role,
      loginTime: new Date().toISOString()
    };
    localStorage.setItem("spmb_admin_session", JSON.stringify(sessionData));
    return { success: true, role: account.role };
  }
  return { success: false, message: "Username atau password salah!" };
}

function getAdminSession() {
  const session = localStorage.getItem("spmb_admin_session");
  return session ? JSON.parse(session) : null;
}

function logoutAdmin() {
  localStorage.removeItem("spmb_admin_session");
  window.location.href = "login.html";
}

function checkAdminAccess(allowedRoles = []) {
  const currentAdmin = getAdminSession();
  if (!currentAdmin) {
    window.location.href = "login.html";
    return null;
  }

  // Superadmin memiliki akses penuh ke semua halaman
  if (currentAdmin.role === "superadmin") return currentAdmin;

  if (allowedRoles.length > 0 && !allowedRoles.includes(currentAdmin.role)) {
    alert("Akses ditolak! Anda tidak memiliki wewenang membuka modul ini.");
    window.location.href = "dashboard.html";
    return null;
  }

  return currentAdmin;
}