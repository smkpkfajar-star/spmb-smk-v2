/* ============================================================
   pengaturan.js — pengaturan situs yang diatur superadmin (tabel Supabase "pengaturan"):
     spmb_dibuka  → saklar utama pendaftaran SPMB dibuka / ditutup
     popup_promo  → pop-up promo di beranda nyala / mati
     jadwal_buka / jadwal_tutup → pendaftaran otomatis buka / tutup pada waktu itu
     pesan_tutup  → tulisan saat pendaftaran ditutup
     banner_info  → banner pengumuman di beranda & halaman daftar
     kontak_wa / jam_layanan → nomor WhatsApp & jam layanan panitia
     kuota_<jurusan> → batas pendaftar per jurusan (dijaga database, formulir hanya menandai)
     hasil_diumumkan → siswa boleh melihat Diterima/Ditolak
     perawatan / pesan_perawatan → situs publik menampilkan "sedang pemeliharaan"
   Dibaca tanpa login (REST + anon key). Bila tabel belum dibuat atau internet
   bermasalah, dipakai nilai bawaan (dibuka & nyala, tanpa banner) agar situs tetap jalan.
   Penegakan sebenarnya ada di database (supabase/03, 05, 06).
   ============================================================ */
(function (root) {
  const NOMOR_BAWAAN = "628823212784";
  const BAWAAN = Object.freeze({
    spmbDibuka: true, // hasil akhir: saklar DAN jadwal DAN bukan perawatan
    saklarDibuka: true, // saklar utamanya saja
    popupPromo: true,
    jadwalBuka: null, // ms (epoch) atau null
    jadwalTutup: null,
    pesanTutup: "",
    bannerAktif: false,
    bannerTeks: "",
    kontakWa: NOMOR_BAWAAN,
    jamLayanan: "",
    kuotaJurusan: Object.freeze({}), // { DKV: 36, ... } hanya yang diberi batas
    hasilDiumumkan: true,
    perawatan: false,
    pesanPerawatan: "",
  });
  const KUNCI = { spmb_dibuka: "saklarDibuka", popup_promo: "popupPromo" };

  /* ---------- fungsi murni (dites) ---------- */
  const keMs = (v) => {
    const t = v ? Date.parse(v) : NaN;
    return Number.isNaN(t) ? null : t;
  };

  // Dibuka bila waktu sekarang di dalam jadwal (batas kosong = tanpa batas)
  function dalamJadwal(buka, tutup, sekarang) {
    if (buka != null && sekarang < buka) return false;
    if (tutup != null && sekarang >= tutup) return false;
    return true;
  }

  // Nomor WhatsApp → format wa.me (62…); "" bila tidak masuk akal
  function normalWa(v) {
    let d = String(v == null ? "" : v).replace(/\D/g, "");
    if (d.startsWith("0")) d = "62" + d.slice(1);
    else if (d.startsWith("8")) d = "62" + d;
    return /^62\d{8,13}$/.test(d) ? d : "";
  }
  function linkWa(nomor, teks) {
    return `https://wa.me/${normalWa(nomor) || NOMOR_BAWAAN}${teks ? `?text=${encodeURIComponent(teks)}` : ""}`;
  }
  // 628823212784 → "+62 882-3212-784"
  function tampilWa(nomor) {
    const n = normalWa(nomor) || NOMOR_BAWAAN;
    const sisa = n.slice(2);
    return `+62 ${sisa.slice(0, 3)}-${sisa.slice(3, 7)}-${sisa.slice(7)}`;
  }

  function dariBaris(rows, sekarang = Date.now()) {
    const hasil = { ...BAWAAN, kuotaJurusan: {} };
    (Array.isArray(rows) ? rows : []).forEach((r) => {
      if (!r) return;
      const kunci = r.kunci;
      if (KUNCI[kunci]) hasil[KUNCI[kunci]] = r.nilai !== false;
      else if (kunci === "jadwal_buka") hasil.jadwalBuka = keMs(r.waktu);
      else if (kunci === "jadwal_tutup") hasil.jadwalTutup = keMs(r.waktu);
      else if (kunci === "pesan_tutup") hasil.pesanTutup = String(r.teks || "").trim();
      else if (kunci === "banner_info") {
        hasil.bannerTeks = String(r.teks || "").trim();
        hasil.bannerAktif = r.nilai === true && hasil.bannerTeks !== "";
      } else if (kunci === "kontak_wa") hasil.kontakWa = normalWa(r.teks) || NOMOR_BAWAAN;
      else if (kunci === "jam_layanan") hasil.jamLayanan = String(r.teks || "").trim();
      else if (kunci === "hasil_diumumkan") hasil.hasilDiumumkan = r.nilai !== false;
      else if (kunci === "perawatan") hasil.perawatan = r.nilai === true;
      else if (kunci === "pesan_perawatan") hasil.pesanPerawatan = String(r.teks || "").trim();
      else if (/^kuota_[a-z]+$/.test(String(kunci))) {
        if (Number.isInteger(r.angka) && r.angka >= 0) hasil.kuotaJurusan[kunci.slice(6).toUpperCase()] = r.angka;
      }
    });
    hasil.spmbDibuka = hasil.saklarDibuka && !hasil.perawatan && dalamJadwal(hasil.jadwalBuka, hasil.jadwalTutup, sekarang);
    return hasil;
  }

  // Tanggal & jam WIB, mis. "1 Mar 2027, 08.00 WIB"
  function formatJadwal(ms) {
    return (
      new Date(ms).toLocaleString("id-ID", { timeZone: "Asia/Jakarta", day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) + " WIB"
    );
  }

  // Kalimat khusus saat ditutup: pesan superadmin > jadwal buka berikutnya > "" (tidak ada)
  function pesanKhusus(p, sekarang = Date.now()) {
    if (p.pesanTutup) return p.pesanTutup;
    if (p.saklarDibuka && !p.perawatan && p.jadwalBuka != null && sekarang < p.jadwalBuka) return `Pendaftaran dibuka pada ${formatJadwal(p.jadwalBuka)}.`;
    return "";
  }
  // Sama, tetapi selalu berisi: dipakai kotak "ditutup" di halaman daftar
  function pesanDitutup(p, sekarang = Date.now()) {
    return pesanKhusus(p, sekarang) || "Saat ini formulir pendaftaran SPMB 2026/2027 belum bisa diisi. Pantau informasi terbaru atau hubungi panitia.";
  }

  // Hitung mundur penutupan: "" bila tidak ada jadwal tutup / sudah lewat
  function teksHitungMundur(sisaMs) {
    if (!(sisaMs > 0)) return "";
    const hari = Math.floor(sisaMs / 86400000);
    if (hari >= 1) return `Pendaftaran ditutup dalam ${hari} hari`;
    const jam = Math.floor(sisaMs / 3600000);
    if (jam >= 1) return `Pendaftaran ditutup dalam ${jam} jam`;
    return "Pendaftaran ditutup dalam kurang dari 1 jam";
  }

  // Status kuota satu jurusan. kuota null/undefined = tanpa batas.
  function statusKuota(kuota, terisi) {
    if (!Number.isInteger(kuota)) return { terbatas: false, penuh: false, sisa: null };
    const sisa = Math.max(0, kuota - (terisi || 0));
    return { terbatas: true, penuh: sisa === 0, sisa };
  }

  // Ringkasan kuota untuk beranda: [{ jurusan, teks, nada: ok|wait|bad }] urut DKV, RPL, TITL, TKR, TSM.
  // Hanya jurusan yang diberi batas. "wait" (kuning) bila sisa tinggal sedikit (≤ 3 atau ≤ 15% kuota).
  const URUTAN_JURUSAN = ["DKV", "RPL", "TITL", "TKR", "TSM"];
  const NAMA_JURUSAN = Object.freeze({
    DKV: "Desain Komunikasi Visual",
    RPL: "Rekayasa Perangkat Lunak",
    TITL: "Teknik Instalasi Tenaga Listrik",
    TKR: "Teknik Kendaraan Ringan",
    TSM: "Teknik Sepeda Motor",
  });
  function ringkasKuota(rows) {
    return (Array.isArray(rows) ? rows : [])
      .filter((r) => r && URUTAN_JURUSAN.includes(r.jurusan) && Number.isInteger(r.kuota))
      .map((r) => {
        const st = statusKuota(r.kuota, r.terisi);
        const sedikit = !st.penuh && (st.sisa <= 3 || st.sisa <= r.kuota * 0.15);
        return {
          jurusan: r.jurusan,
          nama: NAMA_JURUSAN[r.jurusan],
          terisi: r.terisi || 0,
          kuota: r.kuota,
          persen: r.kuota > 0 ? Math.min(100, Math.round(((r.terisi || 0) / r.kuota) * 100)) : 100,
          teks: st.penuh ? `${r.jurusan} · penuh` : `${r.jurusan} · sisa ${st.sisa} kursi`,
          nada: st.penuh ? "bad" : sedikit ? "wait" : "ok",
        };
      })
      .sort((a, b) => URUTAN_JURUSAN.indexOf(a.jurusan) - URUTAN_JURUSAN.indexOf(b.jurusan));
  }

  // Kalimat pemancing daftar untuk section kuota; hanya dari kondisi nyata, "" bila tidak ada yang genting.
  function kalimatDesak(ringkas) {
    const daftar = Array.isArray(ringkas) ? ringkas : [];
    const sedikit = daftar.filter((k) => k.nada === "wait");
    const penuh = daftar.filter((k) => k.nada === "bad");
    const longgar = daftar.filter((k) => k.nada !== "bad");
    if (sedikit.length) {
      const bagian = sedikit.map((k) => `${k.jurusan} tinggal ${k.kuota - k.terisi} kursi`).join(", ");
      const catatan = penuh.length ? ` ${penuh.map((k) => k.jurusan).join(", ")} sudah penuh.` : "";
      return `${bagian}. Jangan sampai kehabisan!${catatan}`;
    }
    if (penuh.length && longgar.length) return `${penuh.map((k) => k.jurusan).join(", ")} sudah penuh. Amankan kursi di jurusan lain sebelum ikut habis!`;
    return "";
  }

  // Sebelum hasil diumumkan, Diterima/Ditolak tampil sebagai "Diverifikasi" (menunggu pengumuman)
  function sembunyikanHasil(status, hasilDiumumkan) {
    if (hasilDiumumkan !== false) return status;
    return /^(Diterima|Ditolak)$/i.test(String(status || "").trim()) ? "Diverifikasi" : status;
  }

  /* ---------- ambil dari server ---------- */
  let janji = null;
  let terakhir = { ...BAWAAN };
  const berhasil = (p) => ((terakhir = p), p);
  // Ambil pengaturan (sekali per halaman; segar: true = baca ulang dari server)
  function ambil({ segar = false, batasWaktu = 4000 } = {}) {
    if (janji && !segar) return janji;
    const c = root.APP_CONFIG && root.APP_CONFIG.supabase;
    if (!c || typeof fetch === "undefined") return Promise.resolve({ ...BAWAAN });
    janji = (async () => {
      const ctl = typeof AbortController !== "undefined" ? new AbortController() : null;
      const t = ctl ? setTimeout(() => ctl.abort(), batasWaktu) : null;
      const baca = (kolom) =>
        fetch(`${c.url}/rest/v1/pengaturan?select=${kolom}`, {
          headers: { apikey: c.anonKey, Authorization: `Bearer ${c.anonKey}` },
          cache: "no-store",
          signal: ctl ? ctl.signal : undefined,
        });
      try {
        // Kolom tambahan datang bertahap (SQL 05 → teks/waktu, SQL 06 → angka); mundur ke yang tersedia
        let r = await baca("kunci,nilai,teks,waktu,angka");
        if (!r.ok) r = await baca("kunci,nilai,teks,waktu");
        if (!r.ok) r = await baca("kunci,nilai");
        if (!r.ok) return { ...BAWAAN };
        return berhasil(dariBaris(await r.json()));
      } catch {
        return { ...BAWAAN };
      } finally {
        if (t) clearTimeout(t);
      }
    })();
    return janji;
  }

  // Sisa kuota tiap jurusan yang diberi batas: [{ jurusan, kuota, terisi }]. Gagal → [] (tidak menandai apa pun).
  let janjiKuota = null;
  function ambilKuota({ segar = false, batasWaktu = 4000 } = {}) {
    if (janjiKuota && !segar) return janjiKuota;
    const c = root.APP_CONFIG && root.APP_CONFIG.supabase;
    if (!c || typeof fetch === "undefined") return Promise.resolve([]);
    janjiKuota = (async () => {
      const ctl = typeof AbortController !== "undefined" ? new AbortController() : null;
      const t = ctl ? setTimeout(() => ctl.abort(), batasWaktu) : null;
      try {
        const r = await fetch(`${c.url}/rest/v1/rpc/sisa_kuota`, {
          method: "POST",
          headers: { apikey: c.anonKey, Authorization: `Bearer ${c.anonKey}`, "Content-Type": "application/json" },
          body: "{}",
          cache: "no-store",
          signal: ctl ? ctl.signal : undefined,
        });
        if (!r.ok) return [];
        const rows = await r.json();
        return Array.isArray(rows) ? rows : [];
      } catch {
        return [];
      } finally {
        if (t) clearTimeout(t);
      }
    })();
    return janjiKuota;
  }

  // Dipakai tempat yang membuat tautan/teks sesudah pengaturan dibaca (tanpa menunggu lagi)
  const waNomor = () => terakhir.kontakWa || NOMOR_BAWAAN;
  const waTautan = (teks) => linkWa(waNomor(), teks);
  const statusTampil = (status) => sembunyikanHasil(status, terakhir.hasilDiumumkan);

  /* ---------- tampilan di halaman publik (teks dari admin selalu lewat textContent) ---------- */
  // Nomor WhatsApp & jam layanan di tautan/teks yang sudah tertulis di HTML
  function terapkanKontak(p) {
    if (typeof document === "undefined" || !p) return;
    if (p.kontakWa && p.kontakWa !== NOMOR_BAWAAN) {
      document.querySelectorAll(`a[href^="https://wa.me/${NOMOR_BAWAAN}"]`).forEach((a) => {
        a.setAttribute("href", a.getAttribute("href").replace(NOMOR_BAWAAN, p.kontakWa));
      });
      document.querySelectorAll("[data-wa-teks]").forEach((el) => (el.textContent = tampilWa(p.kontakWa) + " (WhatsApp)"));
    }
    document.querySelectorAll("[data-jam-layanan]").forEach((el) => {
      el.textContent = p.jamLayanan;
      el.classList.toggle("hidden", !p.jamLayanan);
    });
  }

  const KUNCI_TUTUP = "spmb-banner-tutup";
  function pasangBanner(p) {
    if (typeof document === "undefined" || !p || !p.bannerAktif || document.getElementById("bannerInfo")) return;
    try {
      if (root.sessionStorage.getItem(KUNCI_TUTUP) === p.bannerTeks) return;
    } catch (_) {}
    const el = document.createElement("div");
    el.id = "bannerInfo";
    el.setAttribute("role", "status");
    el.className = "border-b border-pink-100 bg-pink-50 text-ink-900";
    el.innerHTML =
      '<div class="mx-auto flex max-w-[1080px] items-start gap-3 px-4 py-2.5 text-[14px] leading-snug sm:px-6">' +
      '<span class="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-pink-500" aria-hidden="true"></span>' +
      '<p class="min-w-0 flex-1" data-teks></p>' +
      '<button type="button" class="-mr-1 grid h-7 w-7 shrink-0 place-items-center rounded-md text-[18px] leading-none text-ink-500 hover:bg-white hover:text-ink-900" aria-label="Tutup pengumuman">×</button></div>';
    el.querySelector("[data-teks]").textContent = p.bannerTeks;
    el.querySelector("button").addEventListener("click", () => {
      el.remove();
      try {
        root.sessionStorage.setItem(KUNCI_TUTUP, p.bannerTeks);
      } catch (_) {}
    });
    document.body.insertBefore(el, document.body.firstChild);
  }

  // Animasi "maintenis": dua pemain tenis saling memukul bola. Murni CSS (tanpa gambar/library);
  // mati bila pengunjung memilih "kurangi gerakan".
  const CSS_TENIS =
    ".tn-bx{animation:tn-x 1s linear infinite alternate}" +
    ".tn-by{animation:tn-y 1s ease-in-out infinite}" +
    ".tn-l{transform-origin:60px 80px;animation:tn-swl 2s ease-in-out infinite}" +
    ".tn-r{transform-origin:260px 80px;animation:tn-swr 2s ease-in-out infinite}" +
    ".tn-bob{animation:tn-bob 1s ease-in-out infinite}" +
    "@keyframes tn-x{from{transform:translateX(100px)}to{transform:translateX(220px)}}" +
    "@keyframes tn-y{0%,100%{transform:translateY(0)}50%{transform:translateY(-38px)}}" +
    "@keyframes tn-swl{0%{transform:rotate(15deg)}12%{transform:rotate(-5deg)}30%{transform:rotate(-40deg)}80%{transform:rotate(-40deg)}100%{transform:rotate(15deg)}}" +
    "@keyframes tn-swr{0%,30%{transform:rotate(40deg)}50%{transform:rotate(-15deg)}62%{transform:rotate(5deg)}80%,100%{transform:rotate(40deg)}}" +
    "@keyframes tn-bob{0%,100%{transform:translateY(0)}50%{transform:translateY(-2px)}}" +
    "@media (prefers-reduced-motion:reduce){.tn-bx,.tn-by,.tn-l,.tn-r,.tn-bob{animation:none}.tn-bx{transform:translateX(160px)}}";

  const SVG_TENIS =
    '<svg viewBox="0 0 320 150" class="mx-auto h-auto w-full max-w-[340px]" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" aria-hidden="true">' +
    '<line x1="10" y1="132" x2="310" y2="132" opacity=".25"/>' +
    '<rect x="158" y="94" width="4" height="38" fill="currentColor" stroke="none" opacity=".18"/><line x1="150" y1="94" x2="170" y2="94" opacity=".55"/>' +
    // pemain kiri
    '<g class="tn-bob"><circle cx="60" cy="62" r="9" fill="currentColor" fill-opacity=".08"/><line x1="60" y1="71" x2="60" y2="102"/>' +
    '<line x1="60" y1="102" x2="50" y2="130"/><line x1="60" y1="102" x2="72" y2="130"/><line x1="60" y1="80" x2="48" y2="92"/>' +
    '<g class="tn-l"><line x1="60" y1="80" x2="84" y2="70"/><line x1="84" y1="70" x2="92" y2="63" stroke="#EC4899"/><circle cx="98" cy="56" r="9" stroke="#EC4899" fill="#EC4899" fill-opacity=".15"/></g></g>' +
    // pemain kanan
    '<g class="tn-bob" style="animation-delay:.5s"><circle cx="260" cy="62" r="9" fill="currentColor" fill-opacity=".08"/><line x1="260" y1="71" x2="260" y2="102"/>' +
    '<line x1="260" y1="102" x2="270" y2="130"/><line x1="260" y1="102" x2="248" y2="130"/><line x1="260" y1="80" x2="272" y2="92"/>' +
    '<g class="tn-r"><line x1="260" y1="80" x2="236" y2="70"/><line x1="236" y1="70" x2="228" y2="63" stroke="#EC4899"/><circle cx="222" cy="56" r="9" stroke="#EC4899" fill="#EC4899" fill-opacity=".15"/></g></g>' +
    // bola
    '<g class="tn-bx"><g class="tn-by"><circle cx="0" cy="58" r="5" fill="#F2B53A" stroke="none"/></g></g>' +
    "</svg>";

  // Mode perawatan: halaman publik tertutup layar penuh (panel admin tidak memuat berkas ini)
  function pasangPerawatan(p) {
    if (typeof document === "undefined" || !p || !p.perawatan || document.getElementById("layarPerawatan")) return;
    if (!document.getElementById("gayaTenis")) {
      const gaya = document.createElement("style");
      gaya.id = "gayaTenis";
      gaya.textContent = CSS_TENIS;
      document.head.appendChild(gaya);
    }
    const el = document.createElement("div");
    el.id = "layarPerawatan";
    el.setAttribute("role", "alert");
    el.className = "fixed inset-0 z-[200] flex items-center justify-center overflow-y-auto bg-white p-6 text-ink-900";
    el.innerHTML =
      '<div class="w-full max-w-md text-center">' +
      SVG_TENIS +
      '<h1 class="mt-4 text-[26px] font-semibold tracking-tight">Lagi maintenis nih 🎾</h1>' +
      '<p class="mt-1 text-[13.5px] italic text-ink-500">(maksudnya maintenance. Tapi kami memang lagi servis kok.)</p>' +
      '<p class="mt-4 text-[15.5px] leading-relaxed text-ink-600" data-teks></p>' +
      '<p class="mt-3 font-mono text-[12.5px] text-ink-500">Skor sementara: Panitia 40 – 0 Bug</p>' +
      '<a data-wa class="mt-6 inline-flex h-12 items-center justify-center rounded-full bg-ink-900 px-6 text-[15px] font-semibold text-white" target="_blank" rel="noopener">Hubungi panitia lewat WhatsApp</a></div>';
    el.querySelector("[data-teks]").textContent = p.pesanPerawatan || "Situs SPMB sedang dirapikan. Sebentar lagi pertandingan selesai, silakan kembali beberapa saat lagi.";
    el.querySelector("[data-wa]").setAttribute("href", linkWa(p.kontakWa));
    document.body.appendChild(el);
    document.documentElement.style.overflow = "hidden";
    // Perawatan selesai → halaman muat ulang sendiri (1 permintaan kecil tiap 90 detik, hanya saat tab terlihat)
    setInterval(async () => {
      if (document.visibilityState !== "visible") return;
      const baru = await ambil({ segar: true });
      if (!baru.perawatan && root.location && root.location.reload) root.location.reload();
    }, 90000);
  }

  root.Pengaturan = {
    BAWAAN,
    NOMOR_BAWAAN,
    KUNCI,
    dariBaris,
    dalamJadwal,
    formatJadwal,
    pesanKhusus,
    pesanDitutup,
    normalWa,
    linkWa,
    tampilWa,
    teksHitungMundur,
    statusKuota,
    ringkasKuota,
    kalimatDesak,
    NAMA_JURUSAN,
    sembunyikanHasil,
    ambil,
    ambilKuota,
    waNomor,
    waTautan,
    statusTampil,
    terapkanKontak,
    pasangBanner,
    pasangPerawatan,
  };
})(typeof window !== "undefined" ? window : globalThis);
