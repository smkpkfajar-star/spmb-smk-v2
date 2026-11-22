/* ============================================================
   app-config.js — SATU-SATUNYA tempat konfigurasi layanan.
   Dipakai daftar.js, halaman admin, dan halaman siswa.

   Catatan keamanan: semua nilai di file ini terlihat oleh siapa pun yang
   membuka situs. Jangan pernah menaruh password atau kunci "service_role".
   ============================================================ */
window.APP_CONFIG = {
  sheetson: {
    apiKey: "oGKHOLLKHVzlDAWCpD2zHUWGSj3G4o8l2vajRqzpBW6e3Ha1SgJWLRxwAPk",
    spreadsheetId: "1vFCAMSse_I294GIaqVRKNP4L-Zpw8pr1EHgzJqxdYUs",
  },
  supabase: {
    url: "https://zfnkjntxxvckkgmqmfex.supabase.co",
    anonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpmbmtqbnR4eHZja2tnbXFtZmV4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIzMzA1MTYsImV4cCI6MjEwNzkwNjUxNn0.lFaxG4TfrRbTPpgi3HxKnPPp9rxbUmusoIMidT3TSN4",
    bucketName: "berkas-spmb",
  },
  // Akun login dibuat dengan alamat buatan (tidak pernah dikirimi email)
  emailDomain: {
    siswa: "siswa.spmb.local",
    petugas: "petugas.spmb.local",
  },
};
