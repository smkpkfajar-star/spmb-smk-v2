/* ============================================================
   promo.js — pop-up gambar tiket "Daftar Ulang Makin Ringan! Mulai dengan
   Rp2 Juta, sisa biaya bisa diangsur" saat pertama membuka beranda.
   - Muncul setiap kali beranda dibuka / di-refresh.
   - Tutup: tombol ✕, tombol "Nanti saja", Esc, atau klik di luar kotak.
     Saat ditutup, tiket mengecil & terbang ke pojok kanan bawah menjadi ikon
     kecil mengambang (klik = buka lagi, ✕ kecil = sembunyikan).
   - Tidak muncul bila halaman dibuka lewat tautan langsung (#login, #faq, …).
   ============================================================ */
(function (root) {
  const GAMBAR = "assets/img/promo-tiket.png"; // sumber desain: docs/desain/promo-tiket.html

  /* ---------- fungsi murni (dites) ---------- */
  function perluTampil({ hash }) {
    return !hash || hash === "#";
  }
  // Geseran & skala agar kotak "dari" tampak terbang mengecil ke posisi kotak "ke"
  function transformTerbang(dari, ke) {
    const tengah = (r) => [r.left + r.width / 2, r.top + r.height / 2];
    const [x1, y1] = tengah(dari);
    const [x2, y2] = tengah(ke);
    return { dx: x2 - x1, dy: y2 - y1, skala: Math.round((ke.width / dari.width) * 1000) / 1000 };
  }

  root.Promo = { perluTampil, transformTerbang };
  if (typeof document === "undefined") return;

  const geraknyaHalus = () => !(root.matchMedia && root.matchMedia("(prefers-reduced-motion: reduce)").matches);
  const animasi = (el, frames, opsi) =>
    geraknyaHalus() && el.animate ? el.animate(frames, { fill: "forwards", ...opsi }).finished.catch(() => {}) : Promise.resolve();

  /* ---------- ikon tiket kecil mengambang (setelah pop-up ditutup) ---------- */
  function buatMini() {
    const mini = document.createElement("div");
    mini.id = "promoMini";
    mini.className = "promo-mini"; // posisi & ukuran di style.css (harus langsung berlaku untuk animasi terbang)
    mini.innerHTML = `
      <button type="button" data-mini-buka class="promo-mini-goyang promo-mini-tombol rounded-[12px] focus:outline-none focus-visible:ring-4 focus-visible:ring-pink-500/50" aria-label="Buka promo: daftar ulang makin ringan, mulai dengan Rp2 juta">
        <span class="promo-mini-denyut pointer-events-none absolute -inset-1 rounded-[14px]" aria-hidden="true"></span>
        <img src="${GAMBAR}" width="420" height="597" alt="" class="promo-mini-gambar drop-shadow-[0_10px_18px_rgba(0,0,0,.35)]" />
        <span class="absolute -bottom-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-wide shadow" style="background:#EC4899;color:#fff">Promo</span>
      </button>
      <button type="button" data-mini-tutup class="absolute -left-2 -top-2 grid h-6 w-6 place-items-center rounded-full text-[11px] font-bold leading-none shadow-[0_2px_8px_rgba(0,0,0,.3)] hover:scale-110" style="background:#fff;color:#0E3A29" aria-label="Sembunyikan promo">&#x2715;</button>`;
    mini.querySelector("[data-mini-buka]").addEventListener("click", () => {
      const dari = mini.querySelector("img").getBoundingClientRect();
      mini.remove();
      tampilkan(dari);
    });
    mini.querySelector("[data-mini-tutup]").addEventListener("click", async () => {
      await animasi(mini, [{ transform: "scale(1)", opacity: 1 }, { transform: "scale(.3)", opacity: 0 }], { duration: 220, easing: "ease-in" });
      mini.remove();
    });
    return mini;
  }

  // dariRect: bila dibuka dari ikon kecil, tiket "terbang" membesar dari pojok
  function tampilkan(dariRect) {
    const pemicu = document.activeElement;
    const el = document.createElement("div");
    el.id = "promoSpmb";
    el.className = "fixed inset-0 z-[70] flex items-center justify-center bg-black/55 p-4 motion-safe:animate-[promoLatar_.25s_ease-out]";
    el.setAttribute("role", "dialog");
    el.setAttribute("aria-modal", "true");
    el.setAttribute("aria-label", "Promo SPMB: daftar ulang makin ringan");
    el.innerHTML = `
      <div data-promo-kotak tabindex="-1" class="relative flex flex-col items-center outline-none ${dariRect ? "" : "motion-safe:animate-[promoMasuk_.35s_cubic-bezier(.2,.9,.3,1.2)]"}">
        <button type="button" data-promo-tutup class="absolute -right-2 -top-2 z-10 grid h-10 w-10 place-items-center rounded-full text-[17px] font-bold leading-none shadow-[0_6px_20px_rgba(0,0,0,.35)] transition hover:scale-105" style="background:#fff;color:#0E3A29" aria-label="Tutup">&#x2715;</button>
        <a href="daftar/index.html" data-promo-daftar class="block rounded-[24px] focus:outline-none focus-visible:ring-4 focus-visible:ring-white/70">
          <img src="${GAMBAR}" width="420" height="597" alt="SPMB 2026/2027 resmi dibuka. Daftar ulang makin ringan! Mulai dengan Rp2 juta, sisa biaya bisa diangsur. Daftar sekarang." class="block h-auto w-auto max-w-full drop-shadow-[0_30px_60px_rgba(0,0,0,.45)]" style="max-height:calc(100dvh - 6.5rem)" />
        </a>
        <button type="button" data-promo-tutup class="mt-3 rounded-full px-4 py-1.5 text-[14px] font-semibold underline-offset-4 hover:underline" style="color:rgba(255,255,255,.92)">Nanti saja</button>
      </div>`;
    const kotak = el.querySelector("[data-promo-kotak]");
    const gambar = el.querySelector("img");
    let menutup = false;

    // Tutup = tiket mengecil & terbang ke pojok kanan bawah, lalu jadi ikon kecil mengambang
    const tutup = async () => {
      if (menutup) return;
      menutup = true;
      document.removeEventListener("keydown", tombol, true);
      document.documentElement.classList.remove("overflow-hidden");
      const mini = buatMini();
      mini.style.visibility = "hidden";
      document.body.appendChild(mini);
      const t = transformTerbang(gambar.getBoundingClientRect(), mini.querySelector("img").getBoundingClientRect());
      el.style.pointerEvents = "none";
      kotak.querySelectorAll("[data-promo-tutup]").forEach((b) => (b.style.opacity = "0"));
      await Promise.all([
        animasi(kotak, [
          { transform: "translate(0,0) scale(1)", opacity: 1 },
          { transform: `translate(${t.dx}px, ${t.dy}px) scale(${t.skala})`, opacity: 0.9 },
        ], { duration: 520, easing: "cubic-bezier(.55,0,.25,1)" }),
        animasi(el, [{ backgroundColor: "rgba(0,0,0,.55)" }, { backgroundColor: "rgba(0,0,0,0)" }], { duration: 420, easing: "ease-out" }),
      ]);
      el.remove();
      mini.style.visibility = "";
      animasi(mini, [{ transform: "scale(.85)" }, { transform: "scale(1.12)" }, { transform: "scale(1)" }], { duration: 360, easing: "ease-out", fill: "none" });
      if (pemicu && pemicu.focus && pemicu !== document.body) pemicu.focus({ preventScroll: true });
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
    if (dariRect) {
      // kebalikan dari tutup: terbang membesar dari ikon kecil ke tengah
      const t = transformTerbang(gambar.getBoundingClientRect(), dariRect);
      animasi(kotak, [
        { transform: `translate(${t.dx}px, ${t.dy}px) scale(${t.skala})`, opacity: 0.9 },
        { transform: "translate(0,0) scale(1)", opacity: 1 },
      ], { duration: 460, easing: "cubic-bezier(.2,.9,.3,1.1)", fill: "none" });
    }
    // fokus ke kotak pop-up (bukan tautan) agar tidak muncul garis fokus saat dibuka dengan mouse/sentuh
    kotak.focus({ preventScroll: true });
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
      if (gambar.naturalWidth && !document.getElementById("promoSpmb")) tampilkan(null);
    }, 700);
  });
})(typeof window !== "undefined" ? window : globalThis);
