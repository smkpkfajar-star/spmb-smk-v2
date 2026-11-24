/* ============================================================
   status-spmb.js — beranda menyesuaikan diri dengan pengaturan superadmin:
   - SPMB ditutup: badge "resmi dibuka" → "ditutup", tombol Daftar disembunyikan,
     jadwal "Dibuka" → "Ditutup", info singkat (pesan superadmin / tanggal buka) di hero.
   - Hitung mundur penutupan bila jadwal tutup sudah diisi.
   - Grafik sisa kursi per jurusan: menggantikan panel terminal (section 2) bila kuota sudah diisi.
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

  /* ---------- grafik sisa kursi (panel gelap, section 2) ---------- */
  const WARNA_BATANG = { ok: "#4ADE80", wait: "#F2B53A", bad: "#F87171" };
  const tanpaGerak = () => !!(root.matchMedia && root.matchMedia("(prefers-reduced-motion: reduce)").matches);

  // Animasi pemancing daftar (mati bila pengunjung memilih "kurangi gerakan"):
  //  kq-bar kilau melintas di batang · kq-strip garis miring bergerak (kursi tinggal sedikit)
  //  kq-denyut label berdenyut · kq-goyang kalimat desakan bergoyang sesekali · kq-ajak tombol berdenyut pelan
  const CSS_KUOTA =
    ".kq-bar{position:relative;overflow:hidden}" +
    ".kq-bar::after{content:'';position:absolute;inset:0;background:linear-gradient(90deg,transparent,rgba(255,255,255,.55),transparent);transform:translateX(-100%);animation:kq-sweep 2.2s ease-in-out 1.2s infinite}" +
    ".kq-strip{background-image:repeating-linear-gradient(45deg,rgba(0,0,0,.18) 0 7px,transparent 7px 14px);background-size:20px 20px;animation:kq-strip .7s linear infinite}" +
    ".kq-denyut{animation:kq-denyut 1.3s ease-in-out infinite}" +
    ".kq-goyang{animation:kq-goyang 3.2s ease-in-out infinite}" +
    ".kq-ajak{animation:kq-ajak 1.8s ease-in-out infinite}" +
    "@keyframes kq-sweep{0%{transform:translateX(-100%)}60%,100%{transform:translateX(100%)}}" +
    "@keyframes kq-strip{to{background-position:20px 0}}" +
    "@keyframes kq-denyut{0%,100%{transform:scale(1);box-shadow:0 0 0 0 rgba(242,181,58,.5)}50%{transform:scale(1.07);box-shadow:0 0 0 6px rgba(242,181,58,0)}}" +
    "@keyframes kq-goyang{0%,86%,100%{transform:translateX(0)}88%{transform:translateX(-3px)}91%{transform:translateX(3px)}94%{transform:translateX(-2px)}97%{transform:translateX(2px)}}" +
    "@keyframes kq-ajak{0%,100%{transform:scale(1)}50%{transform:scale(1.04)}}" +
    "@media (prefers-reduced-motion:reduce){.kq-bar::after,.kq-strip,.kq-denyut,.kq-goyang,.kq-ajak{animation:none}}";
  function pasangGayaKuota() {
    if (document.getElementById("gayaKuota")) return;
    const g = document.createElement("style");
    g.id = "gayaKuota";
    g.textContent = CSS_KUOTA;
    document.head.appendChild(g);
  }

  // Satu baris sederhana: kode jurusan · batang terisi · sisa kursi. Semua teks lewat textContent.
  function barisGrafik(k) {
    const sisa = k.kuota - k.terisi;
    const li = document.createElement("li");
    li.className = "grid grid-cols-[3.4rem_1fr_auto] items-center gap-3";
    li.title = `${k.nama || k.jurusan}: ${k.terisi} dari ${k.kuota} kursi terisi`;

    const kode = document.createElement("span");
    kode.className = "font-semibold";
    kode.textContent = k.jurusan;

    const jalur = document.createElement("div");
    jalur.className = "h-3 w-full overflow-hidden rounded-full bg-white/15";
    jalur.setAttribute("role", "img");
    jalur.setAttribute("aria-label", `${k.jurusan}: ${k.terisi} dari ${k.kuota} kursi terisi`);
    const batang = document.createElement("div");
    batang.className = `h-full rounded-full${k.nada === "bad" ? "" : " kq-bar"}${k.nada === "wait" ? " kq-strip" : ""}`;
    batang.style.backgroundColor = WARNA_BATANG[k.nada];
    batang.style.width = tanpaGerak() ? `${k.persen}%` : "0%";
    batang.style.transition = tanpaGerak() ? "none" : "width .9s cubic-bezier(.2,.8,.2,1)";
    jalur.appendChild(batang);

    const label = document.createElement("span");
    label.className = "min-w-[4.6rem] text-right text-[12.5px]";
    if (sisa > 0) {
      label.textContent = `sisa ${sisa}`;
      label.className += k.nada === "wait" ? " kq-denyut inline-block rounded-full bg-gold-500/20 px-2 py-0.5 font-semibold text-gold-400" : " text-white/80";
    } else {
      label.textContent = "PENUH";
      label.className += " font-semibold text-red-400";
    }
    li.append(kode, jalur, label);
    return { li, mulai: () => (batang.style.width = `${k.persen}%`) };
  }

  async function pasangKuota() {
    const panel = document.getElementById("kuotaPanel");
    const grafik = document.getElementById("kuotaGrafik");
    if (!panel || !grafik) return;
    const ringkas = root.Pengaturan.ringkasKuota(await root.Pengaturan.ambilKuota());
    if (!ringkas.length) return; // belum ada kuota → panel terminal tetap tampil
    pasangGayaKuota();
    const baris = ringkas.map(barisGrafik);
    baris.forEach((b) => grafik.appendChild(b.li));
    const desak = root.Pengaturan.kalimatDesak(ringkas);
    const $desak = document.getElementById("kuotaDesak");
    if ($desak && desak) {
      $desak.textContent = `🔥 ${desak}`;
      $desak.classList.remove("hidden");
    }
    // Grafik menggantikan panel terminal
    const terminal = document.getElementById("terminalPanel");
    if (terminal) terminal.classList.add("hidden");
    panel.classList.remove("hidden");
    // Batang tumbuh saat panel terlihat di layar
    const mulaiSemua = () => baris.forEach((b, i) => setTimeout(b.mulai, tanpaGerak() ? 0 : i * 130));
    if (tanpaGerak() || !("IntersectionObserver" in root)) mulaiSemua();
    else {
      const io = new root.IntersectionObserver(
        (e) => {
          if (e.some((x) => x.isIntersecting)) {
            io.disconnect();
            mulaiSemua();
          }
        },
        { threshold: 0.2 }
      );
      io.observe(panel);
    }
  }

  document.addEventListener("DOMContentLoaded", async () => {
    if (!root.Pengaturan) return;
    const p = await root.Pengaturan.ambil();
    root.Pengaturan.terapkanKontak(p);
    root.Pengaturan.pasangBanner(p);
    if (!p.spmbDibuka) terapkanDitutup(p);
    pasangHitungMundur(p);
    if (p.spmbDibuka) pasangKuota();
    root.Pengaturan.pasangPerawatan(p);
  });
})(typeof window !== "undefined" ? window : globalThis);
