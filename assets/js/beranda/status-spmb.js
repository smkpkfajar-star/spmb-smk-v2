/* ============================================================
   status-spmb.js — beranda menyesuaikan diri dengan pengaturan superadmin:
   - SPMB ditutup: badge "resmi dibuka" → "ditutup", tombol Daftar disembunyikan,
     jadwal "Dibuka" → "Ditutup", info singkat (pesan superadmin / tanggal buka) di hero.
   - Hitung mundur penutupan bila jadwal tutup sudah diisi.
   - Banner pengumuman, nomor WhatsApp & jam layanan, layar pemeliharaan.
   (Pop-up promo diatur terpisah di promo.js.)
   ============================================================ */
(function (root) {
  if (typeof document === "undefined") return;

  function terapkanDitutup(p) {
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
    if (info) {
      info.classList.remove("hidden");
      // pesan dari superadmin / jadwal buka (selalu lewat textContent)
      const pesan = info.querySelector("#spmbTutupPesan");
      if (pesan) pesan.textContent = root.Pengaturan.pesanKhusus(p);
    }
  }

  // "Pendaftaran ditutup dalam N hari" — diperbarui tiap menit selama halaman terbuka
  function pasangHitungMundur(p) {
    const el = document.getElementById("hitungMundur");
    if (!el || !p.spmbDibuka || p.jadwalTutup == null) return;
    const tampil = () => {
      const teks = root.Pengaturan.teksHitungMundur(p.jadwalTutup - Date.now());
      el.textContent = teks;
      el.classList.toggle("hidden", !teks);
    };
    tampil();
    setInterval(tampil, 60000);
  }

  document.addEventListener("DOMContentLoaded", async () => {
    if (!root.Pengaturan) return;
    const p = await root.Pengaturan.ambil();
    root.Pengaturan.terapkanKontak(p);
    root.Pengaturan.pasangBanner(p);
    if (!p.spmbDibuka) terapkanDitutup(p);
    pasangHitungMundur(p);
    root.Pengaturan.pasangPerawatan(p);
  });
})(typeof window !== "undefined" ? window : globalThis);
