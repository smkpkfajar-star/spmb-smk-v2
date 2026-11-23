/* ============================================================
   status-spmb.js — beranda menyesuaikan diri bila superadmin MENUTUP SPMB:
   badge "resmi dibuka" → "ditutup", tombol Daftar disembunyikan,
   jadwal "Dibuka" → "Ditutup", dan info singkat tampil di hero.
   (Pop-up promo diatur terpisah di promo.js.)
   ============================================================ */
(function (root) {
  if (typeof document === "undefined") return;

  function terapkanDitutup() {
    const badge = document.getElementById("badgeSpmb");
    if (badge) {
      badge.removeAttribute("href");
      badge.setAttribute("role", "status");
      badge.style.background = "#3f3f46";
      badge.style.boxShadow = "none";
      badge.classList.remove("hover:-translate-y-0.5");
      badge.innerHTML = '<span class="h-2.5 w-2.5 rounded-full" style="background:#F87171" aria-hidden="true"></span> Pendaftaran SPMB 2026/2027 ditutup';
    }
    document.querySelectorAll("[data-spmb-daftar]").forEach((a) => (a.style.display = "none"));
    const jadwal = document.getElementById("jadwalSpmb");
    if (jadwal) {
      jadwal.textContent = "Ditutup";
      jadwal.className = "rounded-full bg-red-50 px-3 py-1 text-[13px] font-medium text-red-700";
    }
    const info = document.getElementById("spmbTutupInfo");
    if (info) info.classList.remove("hidden");
  }

  document.addEventListener("DOMContentLoaded", async () => {
    if (!root.Pengaturan) return;
    const p = await root.Pengaturan.ambil();
    if (!p.spmbDibuka) terapkanDitutup();
  });
})(typeof window !== "undefined" ? window : globalThis);
