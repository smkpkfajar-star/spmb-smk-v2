/* ============================================================
   promo.js — pop-up gambar tiket "Daftar Ulang Makin Ringan! Mulai dengan
   Rp2 Juta, sisa biaya bisa diangsur" saat pertama membuka beranda.
   - Muncul setiap kali beranda dibuka / di-refresh.
   - Tutup: tombol ✕, tombol "Nanti saja", Esc, atau klik di luar kotak.
   - Tidak muncul bila halaman dibuka lewat tautan langsung (#login, #faq, …).
   ============================================================ */
(function (root) {
  const GAMBAR = "assets/img/promo-tiket.png"; // sumber desain: docs/desain/promo-tiket.html

  /* ---------- fungsi murni (dites) ---------- */
  function perluTampil({ hash }) {
    return !hash || hash === "#";
  }

  root.Promo = { perluTampil };
  if (typeof document === "undefined") return;

  function tampilkan() {
    const pemicu = document.activeElement;
    const el = document.createElement("div");
    el.id = "promoSpmb";
    el.className = "fixed inset-0 z-[70] flex items-center justify-center bg-black/55 p-4 motion-safe:animate-[promoLatar_.25s_ease-out]";
    el.setAttribute("role", "dialog");
    el.setAttribute("aria-modal", "true");
    el.setAttribute("aria-label", "Promo SPMB: daftar ulang makin ringan");
    el.innerHTML = `
      <div data-promo-kotak tabindex="-1" class="relative flex flex-col items-center outline-none motion-safe:animate-[promoMasuk_.35s_cubic-bezier(.2,.9,.3,1.2)]">
        <button type="button" data-promo-tutup class="absolute -right-2 -top-2 z-10 grid h-10 w-10 place-items-center rounded-full text-[17px] font-bold leading-none shadow-[0_6px_20px_rgba(0,0,0,.35)] transition hover:scale-105" style="background:#fff;color:#0E3A29" aria-label="Tutup">&#x2715;</button>
        <a href="daftar/index.html" data-promo-daftar class="block rounded-[24px] focus:outline-none focus-visible:ring-4 focus-visible:ring-white/70">
          <img src="${GAMBAR}" width="420" height="597" alt="SPMB 2026/2027 resmi dibuka. Daftar ulang makin ringan! Mulai dengan Rp2 juta, sisa biaya bisa diangsur. Daftar sekarang." class="block h-auto w-auto max-w-full drop-shadow-[0_30px_60px_rgba(0,0,0,.45)]" style="max-height:calc(100dvh - 6.5rem)" />
        </a>
        <button type="button" data-promo-tutup class="mt-3 rounded-full px-4 py-1.5 text-[14px] font-semibold underline-offset-4 hover:underline" style="color:rgba(255,255,255,.92)">Nanti saja</button>
      </div>`;

    const tutup = () => {
      document.removeEventListener("keydown", tombol, true);
      document.documentElement.classList.remove("overflow-hidden");
      el.remove();
      if (pemicu && pemicu.focus) pemicu.focus();
    };
    const tombol = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        tutup();
      } else if (e.key === "Tab") {
        // fokus tetap di dalam pop-up
        const f = [...el.querySelectorAll("a, button")];
        const i = f.indexOf(document.activeElement);
        if (e.shiftKey && i <= 0) (e.preventDefault(), f[f.length - 1].focus());
        else if (!e.shiftKey && i === f.length - 1) (e.preventDefault(), f[0].focus());
      }
    };
    el.addEventListener("click", (e) => {
      if (e.target === el || e.target.closest("[data-promo-tutup]")) tutup();
    });
    document.addEventListener("keydown", tombol, true);
    document.documentElement.classList.add("overflow-hidden");
    document.body.appendChild(el);
    // fokus ke kotak pop-up (bukan tautan) agar tidak muncul garis fokus saat dibuka dengan mouse/sentuh
    el.querySelector("[data-promo-kotak]").focus({ preventScroll: true });
  }

  document.addEventListener("DOMContentLoaded", () => {
    if (document.documentElement.classList.contains("kiosk")) return; // mode kios sekolah: tanpa pop-up
    if (!perluTampil({ hash: root.location.hash })) return;
    // jeda sebentar agar beranda sempat tampil dulu
    const gambar = new Image();
    gambar.src = GAMBAR;
    const siap = new Promise((r) => {
      gambar.onload = r;
      gambar.onerror = r;
    });
    setTimeout(async () => {
      await siap;
      if (root.location.hash && root.location.hash !== "#") return;
      if (gambar.naturalWidth && !document.getElementById("promoSpmb")) tampilkan();
    }, 700);
  });
})(typeof window !== "undefined" ? window : globalThis);
