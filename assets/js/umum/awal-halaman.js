/* ============================================================
   awal-halaman.js — saat halaman DI-REFRESH, mulai dari paling atas.
   Browser biasanya mengembalikan posisi scroll terakhir sehingga halaman terbuka
   di tengah. Dimuat di <head> (sebelum browser memulihkan posisi).
   - Hanya untuk refresh: tombol Kembali/Maju tetap mengembalikan posisi seperti biasa.
   - Alamat dengan tanda # (mis. beranda#jurusan) dibiarkan: browser menuju bagian itu.
   ============================================================ */
(function (root) {
  // Fungsi murni (dites): perlu dipaksa ke atas?
  function perluKeAtas(jenisNavigasi, hash) {
    return jenisNavigasi === "reload" && !hash;
  }

  const jenis = () => {
    try {
      const nav = root.performance && root.performance.getEntriesByType && root.performance.getEntriesByType("navigation")[0];
      return nav ? nav.type : root.performance && root.performance.navigation && root.performance.navigation.type === 1 ? "reload" : "";
    } catch (_) {
      return "";
    }
  };

  root.AwalHalaman = { perluKeAtas };
  if (typeof document === "undefined" || !root.history || !("scrollRestoration" in root.history)) return;
  if (!perluKeAtas(jenis(), root.location && root.location.hash)) return;

  try {
    root.history.scrollRestoration = "manual";
  } catch (_) {
    return;
  }
  const keAtas = () => root.scrollTo(0, 0);
  keAtas();
  root.addEventListener("load", keAtas, { once: true });
  // Pulihkan perilaku biasa agar Kembali/Maju dari halaman lain tetap mengingat posisi
  root.addEventListener("pagehide", () => {
    try {
      root.history.scrollRestoration = "auto";
    } catch (_) {}
  });
})(typeof window !== "undefined" ? window : globalThis);
