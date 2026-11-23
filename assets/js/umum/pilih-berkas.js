/* ============================================================
   pilih-berkas.js — dua cara unggah berkas: "Ambil foto" (kamera HP)
   atau "Pilih berkas" (PDF/JPG/PNG dari galeri/file).
   Foto kamera dikecilkan dulu (maks. 2000 px, JPEG) agar di bawah 5 MB
   dan cepat terunggah. Hasilnya dimasukkan ke input file utama, jadi
   proses unggah yang sudah ada tidak berubah.
   Dipakai formulir pendaftaran (daftar/) dan halaman siswa (#login).
   ============================================================ */
(function (root) {
  const SISI_MAKS = 2000;
  const MUTU = 0.85;
  const BATAS = 5 * 1024 * 1024;

  /* ---------- fungsi murni (dites) ---------- */
  function ukuranBaru(w, h, maks) {
    const skala = Math.min(1, maks / Math.max(w, h));
    return [Math.round(w * skala), Math.round(h * skala)];
  }
  function namaFoto(d) {
    const p = (n) => String(n).padStart(2, "0");
    return `foto-berkas-${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}.jpg`;
  }
  // Foto dari kamera selalu dikecilkan; gambar dari galeri hanya bila > 5 MB. PDF tidak disentuh.
  function perluDikecilkan(file, dariKamera) {
    if (!/^image\/(jpeg|png|webp|heic|heif)$/i.test(file.type || "")) return false;
    return dariKamera || file.size > BATAS;
  }

  root.PilihBerkas = { ukuranBaru, namaFoto, perluDikecilkan };
  if (typeof document === "undefined") return;

  /* ---------- peramban ---------- */
  function muatGambar(file) {
    return new Promise((res, rej) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => res({ img, url });
      img.onerror = () => (URL.revokeObjectURL(url), rej(new Error("Foto tidak bisa dibaca")));
      img.src = url;
    });
  }

  async function kecilkanFoto(file, nama) {
    try {
      const { img, url } = await muatGambar(file);
      const [w, h] = ukuranBaru(img.naturalWidth, img.naturalHeight, SISI_MAKS);
      const kanvas = document.createElement("canvas");
      kanvas.width = w;
      kanvas.height = h;
      const g = kanvas.getContext("2d");
      g.fillStyle = "#fff"; // PNG transparan → latar putih
      g.fillRect(0, 0, w, h);
      g.drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(url);
      const blob = await new Promise((r) => kanvas.toBlob(r, "image/jpeg", MUTU));
      if (!blob || (blob.size >= file.size && file.size <= BATAS)) return file;
      const namaJpg = nama || String(file.name || "foto").replace(/\.[^.]+$/, "") + ".jpg";
      return new File([blob], namaJpg, { type: "image/jpeg", lastModified: Date.now() });
    } catch {
      return file; // gagal dikecilkan → pakai aslinya (batas 5 MB tetap diperiksa formulir)
    }
  }

  function isiInput(input, file) {
    try {
      const dt = new DataTransfer();
      dt.items.add(file);
      input.files = dt.files;
      return true;
    } catch {
      return false;
    }
  }

  // Satu tombol "Unggah berkas" → pop-up dua pilihan: Ambil foto / Pilih berkas.
  // tombol: elemen pemicu; kamera: <input type=file accept=image/* capture>; target: input file utama
  function pasang({ tombol, kamera, target, saatProses }) {
    if (!target) return;
    let sibuk = false;
    const proses = async (file, dariKamera) => {
      if (!file || !perluDikecilkan(file, dariKamera)) return false;
      sibuk = true;
      if (saatProses) saatProses(true);
      const baru = await kecilkanFoto(file, dariKamera ? namaFoto(new Date()) : null);
      if (saatProses) saatProses(false);
      const ok = isiInput(target, baru);
      target.dispatchEvent(new Event("change", { bubbles: true }));
      sibuk = false;
      return ok;
    };
    if (kamera) {
      kamera.addEventListener("change", async () => {
        const file = kamera.files && kamera.files[0];
        if (!file) return;
        const ok = await proses(file, true);
        if (!ok) {
          // peramban lama tanpa DataTransfer: pakai foto apa adanya
          isiInput(target, file);
          target.dispatchEvent(new Event("change", { bubbles: true }));
        }
        kamera.value = "";
      });
    }
    const ambilFoto = () => {
      if (adaKamera() && kamera) kamera.click(); // HP/tablet: kamera bawaan
      else bukaWebcam((file) => proses(file, true)); // komputer: webcam
    };
    const bisaFoto = () => !!kamera && (adaKamera() || bisaWebcam());
    if (tombol) {
      tombol.addEventListener("click", (e) => {
        e.preventDefault();
        if (!bisaFoto()) return target.click(); // tak ada kamera sama sekali → langsung pilih berkas
        bukaPilihan({ ambilFoto, pilihBerkas: () => target.click(), keFokus: tombol });
      });
    }
    // gambar besar dari galeri ikut dikecilkan
    target.addEventListener("change", () => {
      if (sibuk) return;
      const file = target.files && target.files[0];
      if (file && perluDikecilkan(file, false)) proses(file, false);
    });
  }

  // HP/tablet: kamera bawaan lewat <input capture>. Komputer: webcam lewat getUserMedia.
  const adaKamera = () => !!(root.matchMedia && root.matchMedia("(pointer: coarse)").matches);
  const bisaWebcam = () => !!(root.isSecureContext && navigator.mediaDevices && navigator.mediaDevices.getUserMedia);

  const PESAN_GAGAL = {
    izin: "Izin kamera ditolak. Klik ikon kamera/gembok di kolom alamat browser untuk mengizinkan, atau tutup lalu pakai \u201cPilih berkas\u201d.",
    tidakAda: "Kamera tidak ditemukan di komputer ini. Tutup lalu pakai \u201cPilih berkas\u201d.",
    lain: "Kamera tidak bisa dinyalakan (mungkin sedang dipakai aplikasi lain). Tutup lalu pakai \u201cPilih berkas\u201d.",
  };

  /* ---------- jendela webcam (komputer) ---------- */
  function bukaWebcam(pakai) {
    const pemicu = document.activeElement;
    const el = document.createElement("div");
    el.className = "fixed inset-0 z-[90] flex items-center justify-center bg-black/60 p-4";
    el.setAttribute("role", "dialog");
    el.setAttribute("aria-modal", "true");
    el.setAttribute("aria-label", "Ambil foto dengan webcam");
    el.innerHTML = `
      <div class="w-full max-w-xl bg-white p-4 shadow-soft sm:p-5">
        <div class="flex items-center justify-between gap-3">
          <h3 class="text-[17px] font-semibold">Ambil foto</h3>
          <button type="button" data-tutup class="grid h-9 w-9 place-items-center rounded-full text-ink-500 hover:bg-sand hover:text-ink-900" aria-label="Tutup">&#x2715;</button>
        </div>
        <p class="mt-0.5 text-[13.5px] text-ink-600">Arahkan dokumen ke kamera, pastikan terang dan tulisannya terbaca.</p>
        <div class="relative mt-3 overflow-hidden bg-black" style="aspect-ratio:4/3">
          <video data-video autoplay playsinline muted class="h-full w-full object-contain"></video>
          <img data-hasil alt="Hasil foto" class="absolute inset-0 hidden h-full w-full object-contain" />
          <p data-pesan class="absolute inset-0 grid place-items-center p-6 text-center text-[14.5px]" style="color:#fff">Menyalakan kamera&hellip;</p>
        </div>
        <div class="mt-4 flex justify-end gap-2">
          <button type="button" data-batal class="rounded-full px-4 py-2.5 text-[14.5px] font-medium shadow-[inset_0_0_0_1px_rgb(var(--garis-tombol))] hover:bg-sand">Batal</button>
          <button type="button" data-ulang class="hidden rounded-full px-4 py-2.5 text-[14.5px] font-medium shadow-[inset_0_0_0_1px_rgb(var(--garis-tombol))] hover:bg-sand">Ulangi</button>
          <button type="button" data-jepret disabled class="rounded-full bg-ink-900 px-5 py-2.5 text-[14.5px] font-semibold text-white disabled:opacity-50">Jepret</button>
          <button type="button" data-pakai class="hidden rounded-full bg-ink-900 px-5 py-2.5 text-[14.5px] font-semibold text-white">Pakai foto</button>
        </div>
      </div>`;
    document.body.appendChild(el);
    const q = (sel) => el.querySelector(sel);
    const video = q("[data-video]");
    const hasil = q("[data-hasil]");
    const pesan = q("[data-pesan]");
    const bJepret = q("[data-jepret]");
    const bUlang = q("[data-ulang]");
    const bPakai = q("[data-pakai]");
    let stream = null;
    let blob = null;
    let urlHasil = null;

    const tombol = (e) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        e.preventDefault();
        tutup();
      }
    };
    function tutup() {
      if (stream) stream.getTracks().forEach((t) => t.stop());
      if (urlHasil) URL.revokeObjectURL(urlHasil);
      document.removeEventListener("keydown", tombol, true);
      el.remove();
      if (pemicu && pemicu.focus) pemicu.focus();
    }
    document.addEventListener("keydown", tombol, true);
    q("[data-tutup]").addEventListener("click", tutup);
    q("[data-batal]").addEventListener("click", tutup);
    el.addEventListener("click", (e) => {
      if (e.target === el) tutup();
    });

    const modeHasil = (ada) => {
      hasil.classList.toggle("hidden", !ada);
      bJepret.classList.toggle("hidden", ada);
      bUlang.classList.toggle("hidden", !ada);
      bPakai.classList.toggle("hidden", !ada);
    };
    bJepret.addEventListener("click", () => {
      const w = video.videoWidth;
      const h = video.videoHeight;
      if (!w || !h) return;
      const kanvas = document.createElement("canvas");
      kanvas.width = w;
      kanvas.height = h;
      kanvas.getContext("2d").drawImage(video, 0, 0, w, h);
      kanvas.toBlob(
        (b) => {
          if (!b) return;
          blob = b;
          if (urlHasil) URL.revokeObjectURL(urlHasil);
          urlHasil = URL.createObjectURL(b);
          hasil.src = urlHasil;
          modeHasil(true);
          bPakai.focus();
        },
        "image/jpeg",
        0.92
      );
    });
    bUlang.addEventListener("click", () => {
      blob = null;
      modeHasil(false);
      bJepret.focus();
    });
    bPakai.addEventListener("click", () => {
      if (!blob) return;
      const file = new File([blob], namaFoto(new Date()), { type: "image/jpeg", lastModified: Date.now() });
      tutup();
      pakai(file);
    });

    navigator.mediaDevices
      .getUserMedia({ video: { width: { ideal: 1920 }, height: { ideal: 1440 } }, audio: false })
      .then((st) => {
        stream = st;
        if (!el.isConnected) {
          st.getTracks().forEach((t) => t.stop());
          return;
        }
        video.srcObject = st;
        pesan.classList.add("hidden");
        bJepret.disabled = false;
        bJepret.focus();
      })
      .catch((err) => {
        const n = err && err.name;
        pesan.textContent =
          n === "NotAllowedError" || n === "SecurityError"
            ? PESAN_GAGAL.izin
            : n === "NotFoundError" || n === "OverconstrainedError"
              ? PESAN_GAGAL.tidakAda
              : PESAN_GAGAL.lain;
      });
    q("[data-batal]").focus();
  }

  /* ---------- pop-up pilihan: Ambil foto / Pilih berkas ---------- */
  const IKON_KAMERA = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z"/><circle cx="12" cy="13.5" r="3.5"/></svg>';
  const IKON_BERKAS = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/></svg>';

  function bukaPilihan({ ambilFoto, pilihBerkas, keFokus }) {
    const el = document.createElement("div");
    el.className = "fixed inset-0 z-[90] flex items-end justify-center bg-black/50 p-3 sm:items-center sm:p-4";
    el.setAttribute("role", "dialog");
    el.setAttribute("aria-modal", "true");
    el.setAttribute("aria-labelledby", "pilihanJudul");
    const opsi = (aksi, ikon, judul, ket) =>
      `<button type="button" data-opsi="${aksi}" class="flex w-full items-center gap-4 px-4 py-4 text-left hover:bg-sand focus:bg-sand focus:outline-none">
        <span class="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-sand text-ink-900">${ikon}</span>
        <span class="min-w-0"><span class="block text-[16px] font-semibold">${judul}</span><span class="block text-[13.5px] text-ink-500">${ket}</span></span>
      </button>`;
    el.innerHTML = `
      <div class="w-full max-w-sm bg-white shadow-soft">
        <div class="flex items-center justify-between gap-3 px-4 pb-2 pt-4">
          <h3 id="pilihanJudul" class="text-[17px] font-semibold">Unggah berkas dengan&hellip;</h3>
          <button type="button" data-tutup class="grid h-9 w-9 place-items-center rounded-full text-ink-500 hover:bg-sand hover:text-ink-900" aria-label="Tutup">&#x2715;</button>
        </div>
        <div class="divide-y divide-hairline border-y border-hairline">
          ${opsi("foto", IKON_KAMERA, "Ambil foto", adaKamera() ? "Potret dokumen pakai kamera HP" : "Potret dokumen pakai webcam")}
          ${opsi("berkas", IKON_BERKAS, "Pilih berkas", "PDF/JPG/PNG dari galeri atau file")}
        </div>
        <p class="px-4 py-3 text-center text-[12.5px] text-ink-500">Pilih salah satu saja &middot; maks. 5 MB</p>
      </div>`;
    document.body.appendChild(el);
    const tombolKey = (e) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        e.preventDefault();
        tutup();
      }
    };
    function tutup(kembalikanFokus = true) {
      document.removeEventListener("keydown", tombolKey, true);
      el.remove();
      if (kembalikanFokus && keFokus && keFokus.focus) keFokus.focus();
    }
    document.addEventListener("keydown", tombolKey, true);
    el.addEventListener("click", (e) => {
      if (e.target === el || e.target.closest("[data-tutup]")) return tutup();
      const b = e.target.closest("[data-opsi]");
      if (!b) return;
      tutup(false);
      if (b.dataset.opsi === "foto") ambilFoto();
      else pilihBerkas();
    });
    el.querySelector("[data-opsi]").focus();
  }

  // (kompatibilitas) dulu menyembunyikan pilihan kamera; kini pilihan ada di pop-up
  function siapkan() {}

  Object.assign(root.PilihBerkas, { kecilkanFoto, pasang, adaKamera, bisaWebcam, bukaWebcam, bukaPilihan, siapkan });
})(typeof window !== "undefined" ? window : globalThis);
