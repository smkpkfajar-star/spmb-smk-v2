/* ============================================================
   tema.js — mode terang / gelap untuk semua halaman.
   Dimuat di <head> tepat SETELAH tailwind-config.js agar halaman
   langsung tampil dengan tema yang benar (tanpa kedip putih).

   - Belum pernah memilih → ikut setelan HP/laptop.
   - Tombol [data-tema] di halaman mengganti tema & mengingatnya.
   - Mode Teras (kiosk) selalu terang.
   Warna tiap tema ada di style.css (:root dan html.dark).
   ============================================================ */
(function (root) {
  const KEY = "spmb-tema";

  // Fungsi murni (dites): tema yang dipakai saat halaman dibuka
  function temaAwal(simpan, sistemGelap, kiosk) {
    if (kiosk) return "terang";
    if (simpan === "gelap" || simpan === "terang") return simpan;
    return sistemGelap ? "gelap" : "terang";
  }

  root.Tema = { temaAwal, KEY };
  if (typeof document === "undefined") return;

  const html = document.documentElement;
  const baca = (k) => {
    try {
      return root.localStorage.getItem(k);
    } catch (_) {
      return null;
    }
  };
  const mq = root.matchMedia ? root.matchMedia("(prefers-color-scheme: dark)") : null;
  const kiosk = () => {
    const p = new URLSearchParams(root.location.search).get("kiosk");
    return p === "1" || (p !== "0" && baca("spmb-kiosk") === "1");
  };

  function terapkan(tema) {
    const gelap = tema === "gelap";
    html.classList.toggle("dark", gelap);
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", gelap ? "#0A0A0B" : "#FFFFFF");
    document.querySelectorAll("[data-tema]").forEach((b) => {
      const teks = gelap ? "Ganti ke mode terang" : "Ganti ke mode gelap";
      b.setAttribute("aria-label", teks);
      b.setAttribute("title", teks);
      b.setAttribute("aria-pressed", String(gelap));
    });
  }

  terapkan(temaAwal(baca(KEY), !!(mq && mq.matches), kiosk()));
  // Tombol baru muncul setelah HTML/JS halaman selesai → perbarui labelnya
  document.addEventListener("DOMContentLoaded", () => terapkan(html.classList.contains("dark") ? "gelap" : "terang"));
  if (mq && mq.addEventListener) {
    mq.addEventListener("change", (e) => {
      if (!baca(KEY)) terapkan(temaAwal(null, e.matches, kiosk()));
    });
  }
  document.addEventListener("click", (e) => {
    const b = e.target.closest && e.target.closest("[data-tema]");
    if (!b) return;
    const baru = html.classList.contains("dark") ? "terang" : "gelap";
    try {
      root.localStorage.setItem(KEY, baru);
    } catch (_) {}
    terapkan(baru);
  });
  root.Tema.terapkan = terapkan;
})(typeof window !== "undefined" ? window : globalThis);
