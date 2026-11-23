/* ============================================================
   promo.js — pop-up gambar tiket "Daftar Ulang Makin Ringan! Mulai dengan
   Rp2 Juta, sisa biaya bisa diangsur" saat pertama membuka beranda.
   - Muncul setiap kali beranda dibuka / di-refresh.
   - Tutup: tombol ✕, tombol "Nanti saja", Esc, atau klik di luar kotak.
     Saat ditutup, tiket mengecil & terbang ke pojok kanan bawah menjadi ikon
     kecil mengambang (klik = buka lagi, ✕ kecil = sembunyikan).
   - Tidak muncul bila halaman dibuka lewat tautan langsung (#login, #faq, …),
     bila superadmin mematikan pop-up, atau bila SPMB sedang ditutup.
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

  // Mode ringan untuk HP/tablet & perangkat lemah: efek dikurangi agar animasi tetap mulus
  const RINGAN = (() => {
    try {
      const sentuh = root.matchMedia && root.matchMedia("(pointer: coarse)").matches;
      const kecil = root.innerWidth < 640;
      const lemah = (navigator.hardwareConcurrency || 8) <= 2; // komputer sangat lemah saja
      const hemat = !!(navigator.connection && navigator.connection.saveData);
      return sentuh || kecil || lemah || hemat;
    } catch {
      return false;
    }
  })();
  if (RINGAN) document.documentElement.classList.add("promo-ringan");
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

  /* ---------- partikel & kilatan ---------- */
  // Ledakan partikel dari titik (x, y) — dipakai saat kartu gacha terbuka.
  function ledakan(x, y, jumlah, { warna, jarak = 220, ukuran = [7, 14], bentuk = ["✦", "●", "■"], durasi = 950, lebar = 0, gravitasi = false } = {}) {
    if (!geraknyaHalus()) return;
    if (RINGAN) jumlah = Math.ceil(jumlah * 0.45);
    const wadah = document.createElement("div");
    Object.assign(wadah.style, { position: "fixed", inset: "0", zIndex: "80", pointerEvents: "none", overflow: "hidden" });
    document.body.appendChild(wadah);
    for (let i = 0; i < jumlah; i++) {
      const p = document.createElement("span");
      const sudut = gravitasi ? -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.4 : Math.random() * Math.PI * 2;
      const jauh = jarak * (0.45 + Math.random() * 0.75);
      const dx = Math.cos(sudut) * jauh;
      const dy = Math.sin(sudut) * jauh + (gravitasi ? jarak * 1.1 : 0);
      const uk = ukuran[0] + Math.random() * (ukuran[1] - ukuran[0]);
      const b = bentuk[i % bentuk.length];
      const w = warna[i % warna.length];
      const kotakKertas = b === "■";
      p.textContent = kotakKertas ? "" : b;
      Object.assign(p.style, {
        position: "absolute", left: x + (lebar ? (Math.random() - 0.5) * lebar : 0) + "px", top: y + "px",
        fontSize: uk * 1.5 + "px", lineHeight: "1", color: w,
        width: kotakKertas ? uk + "px" : "", height: kotakKertas ? uk * 0.62 + "px" : "", background: kotakKertas ? w : "",
        borderRadius: kotakKertas ? "2px" : "", textShadow: kotakKertas || RINGAN ? "" : "0 0 10px rgba(255,255,255,.85)", willChange: "transform, opacity",
        transform: "translate(-50%,-50%)",
      });
      wadah.appendChild(p);
      p.animate(
        [
          { transform: "translate(-50%,-50%) scale(.3) rotate(0deg)", opacity: 1 },
          { transform: `translate(calc(-50% + ${dx * 0.7}px), calc(-50% + ${dy * 0.55}px)) scale(1.1) rotate(${Math.random() * 360 - 180}deg)`, opacity: 1, offset: 0.55 },
          { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(.6) rotate(${Math.random() * 720 - 360}deg)`, opacity: 0 },
        ],
        { duration: durasi * (0.7 + Math.random() * 0.6), easing: "cubic-bezier(.15,.75,.3,1)", fill: "forwards" }
      );
    }
    setTimeout(() => wadah.remove(), durasi * 1.6);
  }
  function kilatan(x, y) {
    if (!geraknyaHalus()) return;
    const k = document.createElement("div");
    Object.assign(k.style, {
      position: "fixed", inset: "0", zIndex: "79", pointerEvents: "none",
      background: `radial-gradient(circle at ${x}px ${y}px, rgba(255,255,255,.95) 0%, rgba(253,230,138,.55) 18%, rgba(253,230,138,0) 55%)`,
    });
    document.body.appendChild(k);
    k.animate([{ opacity: 0 }, { opacity: 1, offset: 0.25 }, { opacity: 0 }], { duration: 520, easing: "ease-out", fill: "forwards" }).finished.then(() => k.remove(), () => k.remove());
  }

  /* ---------- muncul ala tarikan kartu gacha ---------- */
  const PELAN = {
    masuk: (t) => t * t,
    keluar: (t) => 1 - Math.pow(1 - t, 3),
    halus: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
    pantul: (t) => 1 + 2.2 * Math.pow(t - 1, 3) + 1.2 * Math.pow(t - 1, 2),
  };
  // [waktu 0–1, sudut rotateY, skala, opasitas, pelan menuju titik berikutnya]
  const LINTASAN = [
    [0, -1260, 0.16, 0, "masuk"],
    [0.16, -1000, 0.45, 1, "keluar"],
    [0.6, -180, 1.04, 1, "halus"],
    [0.7, -180, 1.08, 1, "pantul"],
    [1, 0, 1, 1, null],
  ];
  const LINTASAN_RINGAN = [
    [0, -540, 0.3, 0, "masuk"],
    [0.14, -460, 0.55, 1, "keluar"],
    [0.55, -180, 1.03, 1, "halus"],
    [0.66, -180, 1.06, 1, "pantul"],
    [1, 0, 1, 1, null],
  ];
  // Kartu berputar beberapa kali (sisi belakang & depan bergantian), lalu membalik memperlihatkan tiket.
  // Sisi yang tampil dipilih dari sudut putaran tiap frame (lebih andal daripada backface-visibility).
  function putarKartu(isi, durasi) {
    const depan = isi.querySelector("a");
    const belakang = isi.querySelector(".promo-kartu-belakang");
    isi.style.willChange = "transform, opacity";
    return new Promise((selesai) => {
      const mulai = performance.now();
      const langkah = (kini) => {
        const t = Math.min(1, (kini - mulai) / durasi);
        let i = 0;
        const L = RINGAN ? LINTASAN_RINGAN : LINTASAN;
        while (i < L.length - 2 && t > L[i + 1][0]) i++;
        const [t0, a0, s0, o0, pelan] = L[i];
        const [t1, a1, s1, o1] = L[i + 1];
        const k = PELAN[pelan]((t - t0) / (t1 - t0 || 1));
        const sudut = a0 + (a1 - a0) * k;
        isi.style.transform = `scale(${s0 + (s1 - s0) * k}) rotateY(${sudut}deg)`;
        isi.style.opacity = String(o0 + (o1 - o0) * Math.min(1, k));
        const depanTampak = Math.cos((sudut * Math.PI) / 180) > 0;
        depan.style.visibility = depanTampak ? "" : "hidden";
        belakang.style.visibility = depanTampak ? "hidden" : "visible";
        if (t < 1) requestAnimationFrame(langkah);
        else {
          isi.style.transform = "";
          isi.style.opacity = "";
          isi.style.willChange = "";
          depan.style.visibility = "";
          belakang.style.visibility = "hidden";
          selesai();
        }
      };
      requestAnimationFrame(langkah);
    });
  }

  async function gacha(kotak) {
    const isi = kotak.querySelector(".promo-kartu-isi");
    const sinar = kotak.querySelector(".promo-sinar");
    const tombol = kotak.querySelectorAll("[data-promo-tutup]");
    if (!geraknyaHalus() || !isi.animate) {
      sinar.style.opacity = ".4";
      return;
    }
    if (RINGAN) {
      // HP/perangkat lemah: tanpa gacha — cukup muncul halus (ringan, hanya transform & opacity)
      isi.animate(
        [{ transform: "translateY(18px) scale(.94)", opacity: 0 }, { transform: "none", opacity: 1 }],
        { duration: 320, easing: "cubic-bezier(.2,.9,.3,1.15)" }
      );
      return;
    }
    tombol.forEach((b) => (b.style.opacity = "0"));
    const DURASI = RINGAN ? 1200 : 1750;
    sinar.classList.add("nyala");
    sinar.animate(
      [{ opacity: 0 }, { opacity: 0, offset: 0.4 }, { opacity: 1, offset: 0.72 }, { opacity: 0.42 }],
      { duration: DURASI + 600, fill: "forwards" }
    );
    // kilatan + ledakan tepat saat kartu mulai membalik
    setTimeout(() => {
      const r = isi.getBoundingClientRect();
      const x = r.left + r.width / 2;
      const y = r.top + r.height / 2;
      kilatan(x, y);
      ledakan(x, y, 34, { warna: ["#FDE68A", "#F2B53A", "#ffffff", "#F472B6", "#4ADE80"], jarak: Math.max(r.width, 260) * 0.8 });
    }, DURASI * (RINGAN ? 0.66 : 0.7));
    await putarKartu(isi, DURASI);
    tombol.forEach((b) => {
      b.style.transition = "opacity .3s";
      b.style.opacity = "1";
    });
  }

  // dariRect: bila dibuka dari ikon kecil, tiket "terbang" membesar dari pojok
  function tampilkan(dariRect) {
    const pemicu = document.activeElement;
    const el = document.createElement("div");
    el.id = "promoSpmb";
    el.className = "fixed inset-0 z-[70] flex items-center justify-center overflow-hidden bg-black/60 p-4 motion-safe:animate-[promoLatar_.25s_ease-out]";
    el.setAttribute("role", "dialog");
    el.setAttribute("aria-modal", "true");
    el.setAttribute("aria-label", "Promo SPMB: daftar ulang makin ringan");
    el.innerHTML = `
      <div data-promo-kotak tabindex="-1" class="relative flex flex-col items-center outline-none">
        <button type="button" data-promo-tutup class="absolute -right-2 -top-2 z-10 grid h-10 w-10 place-items-center rounded-full text-[17px] font-bold leading-none shadow-[0_6px_20px_rgba(0,0,0,.35)] transition hover:scale-105" style="background:#fff;color:#0E3A29" aria-label="Tutup">&#x2715;</button>
        <div class="promo-panggung">
          <span class="promo-sinar" aria-hidden="true"></span>
          <div class="promo-kartu-isi">
            <a href="daftar/index.html" data-promo-daftar class="promo-tiket-besar block rounded-[24px] focus:outline-none focus-visible:ring-4 focus-visible:ring-white/70">
              <img src="${GAMBAR}" width="420" height="597" alt="SPMB 2026/2027 resmi dibuka. Daftar ulang makin ringan! Mulai dengan Rp2 juta, sisa biaya bisa diangsur. Daftar sekarang." class="block h-auto w-auto max-w-full drop-shadow-[0_30px_60px_rgba(0,0,0,.45)]" style="max-height:calc(100dvh - 6.5rem)" />
              <span class="promo-kilap" aria-hidden="true"></span>
              <span class="promo-bintang" style="left:88%;top:47%" aria-hidden="true">✦</span>
              <span class="promo-bintang" style="left:10%;top:61%;animation-delay:.9s;font-size:14px" aria-hidden="true">✦</span>
              <span class="promo-bintang" style="left:78%;top:30%;animation-delay:1.6s;font-size:12px" aria-hidden="true">✦</span>
              <span class="promo-bintang" style="left:55%;top:71%;animation-delay:2.3s;font-size:11px" aria-hidden="true">✦</span>
            </a>
            <div class="promo-kartu-belakang" aria-hidden="true">
              <img src="assets/img/logo.svg" alt="" width="88" height="88" />
              <span class="promo-kb-judul">SPMB 2026/2027</span>
              <span class="promo-kb-sub">SMK Tamansiswa Jetis</span>
              <span class="promo-kb-bintang">✦ ✦ ✦</span>
            </div>
          </div>
        </div>
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
      document.documentElement.classList.remove("overflow-hidden", "promo-buka");
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
    document.documentElement.classList.add("overflow-hidden", "promo-buka");
    document.body.appendChild(el);
    if (!dariRect) gacha(kotak);
    else {
      if (!RINGAN) {
        kotak.querySelector(".promo-sinar").style.opacity = ".42";
        kotak.querySelector(".promo-sinar").classList.add("nyala");
      }
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
    // Superadmin bisa mematikan pop-up (atau menutup SPMB) dari panel admin
    const izin = root.Pengaturan ? root.Pengaturan.ambil() : Promise.resolve({ spmbDibuka: true, popupPromo: true });
    setTimeout(async () => {
      await siap;
      const p = await izin;
      if (!p.popupPromo || !p.spmbDibuka) return;
      if (root.location.hash && root.location.hash !== "#") return;
      if (gambar.naturalWidth && !document.getElementById("promoSpmb")) tampilkan(null);
    }, 700);
  });
})(typeof window !== "undefined" ? window : globalThis);
