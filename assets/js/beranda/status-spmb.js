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

  // Sisa kursi per jurusan (hanya jurusan yang diberi kuota): chip kecil di hero + section grafik
  const NADA_KUOTA = { ok: "bg-ok-50 text-ok-700", wait: "bg-warn-50 text-warn-700", bad: "bg-red-50 text-red-700" };
  const WARNA_BATANG = { ok: "#16A34A", wait: "#D97706", bad: "#DC2626" };
  const tanpaGerak = () => !!(root.matchMedia && root.matchMedia("(prefers-reduced-motion: reduce)").matches);

  // Satu baris grafik: nama, lencana sisa, batang terisi, angka. Semua teks lewat textContent.
  function barisGrafik(k) {
    const li = document.createElement("li");
    li.className = "border border-hairline bg-white p-4 sm:p-5";
    const atas = document.createElement("div");
    atas.className = "flex items-start justify-between gap-3";
    const nama = document.createElement("div");
    nama.className = "min-w-0";
    const kode = document.createElement("span");
    kode.className = "font-mono text-[12.5px] text-ink-500";
    kode.textContent = `jurusan/${k.jurusan.toLowerCase()}`;
    const judul = document.createElement("p");
    judul.className = "text-[16px] font-semibold leading-snug";
    judul.textContent = k.nama || k.jurusan;
    nama.append(kode, judul);
    const lencana = document.createElement("span");
    lencana.className = `shrink-0 rounded-full px-3 py-1 text-[13px] font-medium ${NADA_KUOTA[k.nada]}`;
    lencana.textContent = k.kuota - k.terisi > 0 ? `sisa ${k.kuota - k.terisi} kursi` : "penuh";
    atas.append(nama, lencana);

    const jalur = document.createElement("div");
    jalur.className = "mt-3 h-3 w-full overflow-hidden rounded-full bg-sand";
    jalur.setAttribute("role", "img");
    jalur.setAttribute("aria-label", `${k.terisi} dari ${k.kuota} kursi terisi`);
    const batang = document.createElement("div");
    batang.className = "h-full rounded-full";
    batang.style.background = WARNA_BATANG[k.nada];
    batang.style.width = tanpaGerak() ? `${k.persen}%` : "0%";
    batang.style.transition = tanpaGerak() ? "none" : "width .9s cubic-bezier(.2,.8,.2,1)";
    jalur.appendChild(batang);
    if (!tanpaGerak()) requestAnimationFrame(() => requestAnimationFrame(() => (batang.style.width = `${k.persen}%`)));

    const bawah = document.createElement("div");
    bawah.className = "mt-2 flex items-center justify-between gap-3 font-mono text-[12.5px] text-ink-500";
    const angka = document.createElement("span");
    angka.textContent = `${k.terisi} / ${k.kuota} terisi · ${k.persen}%`;
    bawah.appendChild(angka);
    if (k.kuota - k.terisi > 0) {
      const daftar = document.createElement("a");
      daftar.href = `daftar/index.html?jurusan=${encodeURIComponent(k.jurusan)}`;
      daftar.className = "font-sans text-[13.5px] font-semibold text-ink-900 underline";
      daftar.setAttribute("data-spmb-daftar", "");
      daftar.textContent = `Daftar ${k.jurusan} →`;
      bawah.appendChild(daftar);
    }
    li.append(atas, jalur, bawah);
    return li;
  }

  async function pasangKuota() {
    const wadah = document.getElementById("kuotaHero");
    const grafik = document.getElementById("kuotaGrafik");
    const ringkas = root.Pengaturan.ringkasKuota(await root.Pengaturan.ambilKuota());
    if (!ringkas.length) return;
    // section grafik
    if (grafik) {
      ringkas.forEach((k) => grafik.appendChild(barisGrafik(k)));
      const seksi = document.getElementById("kuota");
      if (seksi) seksi.classList.remove("hidden");
    }
    if (!wadah) return;
    const judul = document.createElement("a");
    judul.href = "#kuota";
    judul.className = "text-[13.5px] text-ink-500 underline decoration-dotted underline-offset-4 hover:text-ink-900";
    judul.textContent = "Sisa kursi ↓";
    wadah.appendChild(judul);
    ringkas.forEach((k) => {
      const chip = document.createElement("span");
      chip.className = `rounded-full px-3 py-1 text-[13px] font-medium ${NADA_KUOTA[k.nada]}`;
      chip.textContent = k.teks;
      chip.title = `${k.terisi} dari ${k.kuota} kursi terisi`;
      wadah.appendChild(chip);
    });
    wadah.classList.remove("hidden");
    wadah.classList.add("flex");
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
