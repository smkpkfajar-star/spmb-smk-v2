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

  // Posisi garis sobekan (0–1 dari atas) = titik tengah lubang transparan terpanjang
  // di tepi kiri gambar, dicari di 30%–92% tinggi (abaikan sudut membulat).
  function tengahLubang(alpha) {
    const n = alpha.length;
    let terbaik = null;
    let mulai = -1;
    for (let i = Math.floor(n * 0.3); i <= Math.ceil(n * 0.92); i++) {
      const bolong = i < n && alpha[i] < 16;
      if (bolong && mulai < 0) mulai = i;
      if ((!bolong || i === Math.ceil(n * 0.92)) && mulai >= 0) {
        const akhir = bolong ? i : i - 1;
        if (!terbaik || akhir - mulai > terbaik[1] - terbaik[0]) terbaik = [mulai, akhir];
        mulai = -1;
      }
    }
    return terbaik ? Math.round(((terbaik[0] + terbaik[1]) / 2 / n) * 1000) / 1000 : null;
  }

  root.Promo = { perluTampil, transformTerbang, tengahLubang };
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

  /* ---------- sobek karcis saat tiket diklik ---------- */
  let garisSobek = null;
  function bacaGarisSobek(img) {
    if (garisSobek) return garisSobek;
    try {
      const k = document.createElement("canvas");
      k.width = 4;
      k.height = img.naturalHeight;
      const g = k.getContext("2d", { willReadFrequently: true });
      g.drawImage(img, 0, 0, img.naturalWidth, img.naturalHeight, 0, 0, img.naturalWidth, img.naturalHeight);
      const d = g.getImageData(1, 0, 1, img.naturalHeight).data;
      const alpha = [];
      for (let i = 3; i < d.length; i += 4) alpha.push(d[i]);
      garisSobek = tengahLubang(alpha);
    } catch {}
    return (garisSobek = garisSobek || 0.66);
  }

  // Bagian bawah (sobekan emas) ditarik, robek di garis putus-putus, lalu jatuh berputar
  async function sobekKarcis(img) {
    const r = img.getBoundingClientRect();
    const g = bacaGarisSobek(img) * 100;
    const potong = (atas) => {
      const c = img.cloneNode();
      c.removeAttribute("alt");
      c.setAttribute("aria-hidden", "true");
      Object.assign(c.style, {
        position: "fixed", left: r.left + "px", top: r.top + "px", width: r.width + "px", height: r.height + "px",
        maxHeight: "none", margin: "0", zIndex: "75", pointerEvents: "none",
        clipPath: atas ? `inset(0 0 ${100 - g}% 0)` : `inset(${g}% 0 0 0)`,
        transformOrigin: atas ? "50% 100%" : `0% ${g}%`,
      });
      document.body.appendChild(c);
      return c;
    };
    const bagianAtas = potong(true);
    const bagianBawah = potong(false);
    img.style.visibility = "hidden";
    const kilau = img.parentElement && img.parentElement.querySelectorAll(".promo-kilap, .promo-bintang");
    if (kilau) kilau.forEach((x) => (x.style.display = "none"));
    await Promise.all([
      animasi(bagianAtas, [
        { transform: "none", offset: 0 },
        { transform: "translateY(-3px) rotate(-.6deg)", offset: 0.35 },
        { transform: "translateY(-10px) rotate(-1.5deg)", offset: 1 },
      ], { duration: 820, easing: "ease-out" }),
      animasi(bagianBawah, [
        { transform: "none", opacity: 1, offset: 0 },
        { transform: "translate(3px, 4px) rotate(1.5deg)", opacity: 1, offset: 0.14 },
        { transform: "translate(-1px, 2px) rotate(-.8deg)", opacity: 1, offset: 0.26 },
        { transform: "translate(8px, 14px) rotate(4deg)", opacity: 1, offset: 0.4 },
        { transform: "translate(70px, 340px) rotate(24deg)", opacity: 0, offset: 1 },
      ], { duration: 820, easing: "cubic-bezier(.5,0,.75,.4)" }),
    ]);
    return () => {
      bagianAtas.remove();
      bagianBawah.remove();
    };
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
        <a href="daftar/index.html" data-promo-daftar class="promo-tiket-besar block rounded-[24px] focus:outline-none focus-visible:ring-4 focus-visible:ring-white/70">
          <img src="${GAMBAR}" width="420" height="597" alt="SPMB 2026/2027 resmi dibuka. Daftar ulang makin ringan! Mulai dengan Rp2 juta, sisa biaya bisa diangsur. Daftar sekarang." class="block h-auto w-auto max-w-full drop-shadow-[0_30px_60px_rgba(0,0,0,.45)]" style="max-height:calc(100dvh - 6.5rem)" />
          <span class="promo-kilap" aria-hidden="true"></span>
          <span class="promo-bintang" style="left:88%;top:47%" aria-hidden="true">✦</span>
          <span class="promo-bintang" style="left:10%;top:61%;animation-delay:.9s;font-size:14px" aria-hidden="true">✦</span>
          <span class="promo-bintang" style="left:78%;top:30%;animation-delay:1.6s;font-size:12px" aria-hidden="true">✦</span>
          <span class="promo-bintang" style="left:55%;top:71%;animation-delay:2.3s;font-size:11px" aria-hidden="true">✦</span>
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
    let menyobek = false;
    el.addEventListener("click", async (e) => {
      if (e.target === el || e.target.closest("[data-promo-tutup]")) return tutup();
      const tautan = e.target.closest("[data-promo-daftar]");
      if (!tautan) return;
      // Ctrl/⌘/Shift-klik (tab baru) atau mode kurangi animasi: biarkan langsung
      if (e.ctrlKey || e.metaKey || e.shiftKey || e.button !== 0 || !geraknyaHalus()) return;
      e.preventDefault();
      if (menyobek) return;
      menyobek = true;
      kotak.querySelectorAll("[data-promo-tutup]").forEach((b) => (b.style.opacity = "0"));
      await sobekKarcis(gambar);
      root.location.href = tautan.href;
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
