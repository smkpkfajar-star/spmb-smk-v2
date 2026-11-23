/* ============================================================
   promo.js — pop-up "Biaya awal Rp2 Juta" saat pertama membuka beranda.
   - Muncul sekali per sesi browser; setelah ditutup tidak muncul lagi
     sampai browser/tab baru dibuka.
   - Tutup: tombol ✕, tombol "Nanti saja", Esc, atau klik di luar kotak.
   - Tidak muncul bila halaman dibuka lewat tautan langsung (#login, #faq, …).
   ============================================================ */
(function (root) {
  const KUNCI = "spmb-promo-ditutup";

  /* ---------- fungsi murni (dites) ---------- */
  function perluTampil({ ditutup, hash }) {
    if (ditutup) return false;
    return !hash || hash === "#";
  }

  root.Promo = { perluTampil };
  if (typeof document === "undefined") return;

  const baca = () => {
    try {
      return sessionStorage.getItem(KUNCI) === "1";
    } catch {
      return false;
    }
  };
  const tandai = () => {
    try {
      sessionStorage.setItem(KUNCI, "1");
    } catch {}
  };

  function tampilkan() {
    const pemicu = document.activeElement;
    const el = document.createElement("div");
    el.id = "promoSpmb";
    el.className = "fixed inset-0 z-[70] flex items-center justify-center bg-black/55 p-4 motion-safe:animate-[promoLatar_.25s_ease-out]";
    el.setAttribute("role", "dialog");
    el.setAttribute("aria-modal", "true");
    el.setAttribute("aria-labelledby", "promoJudul");
    el.innerHTML = `
      <div class="relative w-full max-w-[420px] overflow-hidden shadow-[0_30px_80px_rgba(0,0,0,.35)] motion-safe:animate-[promoMasuk_.35s_cubic-bezier(.2,.9,.3,1.2)]" style="border-radius:18px">
        <button type="button" data-promo-tutup class="absolute right-3 top-3 z-10 grid h-9 w-9 place-items-center rounded-full text-[18px] leading-none transition hover:scale-105" style="background:rgba(255,255,255,.14);color:#fff" aria-label="Tutup">&#x2715;</button>
        <div class="relative overflow-hidden px-6 pb-6 pt-6" style="background:#16523A;color:#fff">
          <span class="pointer-events-none absolute -right-14 -top-14 h-44 w-44 rounded-full" style="background:rgba(247,200,105,.12)" aria-hidden="true"></span>
          <span class="relative inline-flex items-center gap-2 rounded-full px-3 py-1 text-[12px] font-bold uppercase tracking-wide" style="background:rgba(255,255,255,.12)">
            <span class="relative flex h-2 w-2" aria-hidden="true"><span class="absolute inline-flex h-full w-full rounded-full opacity-75 motion-safe:animate-ping" style="background:#4ADE80"></span><span class="relative inline-flex h-2 w-2 rounded-full" style="background:#4ADE80"></span></span>
            SPMB 2026/2027 resmi dibuka
          </span>
          <p class="relative mt-4 text-[17px] font-medium" style="color:rgba(255,255,255,.85)">Cukup bayar</p>
          <p id="promoJudul" class="teks-emas relative text-[64px] font-black leading-none tracking-tight">Rp2 Juta</p>
          <p class="relative mt-2 text-[20px] font-bold leading-tight">di awal, kamu sudah bisa mulai sekolah di sini!</p>
          <p class="relative mt-2 text-[14px] leading-relaxed" style="color:rgba(255,255,255,.75)">Praktik nyata berstandar industri · 5 jurusan · daftar online gratis</p>
        </div>
        <div class="tiket-sobek flex flex-col items-center gap-2.5 border-t-[3px] border-dashed px-6 pb-5 pt-6 text-center" style="background:#F7C869;border-color:#16523A">
          <a href="daftar/index.html" data-promo-daftar class="inline-flex w-full items-center justify-center gap-2 rounded-full px-5 py-3 text-[16px] font-bold" style="background:#0E3A29;color:#fff">
            Daftar sekarang
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
          </a>
          <button type="button" data-promo-tutup class="text-[14px] font-semibold underline-offset-4 hover:underline" style="color:#16523A">Nanti saja</button>
          <span class="text-[11.5px] leading-snug" style="color:#4a4a2a">*Biaya awal untuk mulai sekolah. Rincian biaya lainnya dijelaskan panitia saat daftar ulang.</span>
        </div>
      </div>`;

    const tutup = () => {
      tandai();
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
      else if (e.target.closest("[data-promo-daftar]")) tandai();
    });
    document.addEventListener("keydown", tombol, true);
    document.documentElement.classList.add("overflow-hidden");
    document.body.appendChild(el);
    el.querySelector("[data-promo-daftar]").focus({ preventScroll: true });
  }

  document.addEventListener("DOMContentLoaded", () => {
    if (document.documentElement.classList.contains("kiosk")) return; // mode kios sekolah: tanpa pop-up
    if (!perluTampil({ ditutup: baca(), hash: root.location.hash })) return;
    // jeda sebentar agar beranda sempat tampil dulu
    setTimeout(() => {
      if (root.location.hash && root.location.hash !== "#") return;
      if (!document.getElementById("promoSpmb")) tampilkan();
    }, 700);
  });
})(typeof window !== "undefined" ? window : globalThis);
