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

  // kamera: <input type=file accept=image/* capture=environment>; target: input file utama
  function pasang({ kamera, target, saatProses }) {
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
      // Komputer: tombol "Ambil foto" membuka webcam di jendela kecil
      const label = document.querySelector(`label[for="${kamera.id}"]`);
      if (label && !adaKamera() && bisaWebcam()) {
        const buka = () => bukaWebcam((file) => proses(file, true));
        label.addEventListener("click", (e) => {
          e.preventDefault();
          buka();
        });
        label.addEventListener("keydown", (e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            buka();
          }
        });
        if (!label.hasAttribute("tabindex")) label.tabIndex = 0;
        const ket = label.querySelector("[data-ket-kamera]");
        if (ket) ket.textContent = "pakai webcam";
      }
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

  // Pilihan "Ambil foto" disembunyikan hanya bila perangkat tidak punya cara memotret sama sekali
  function siapkan(wadah) {
    if (!wadah || adaKamera() || bisaWebcam()) return;
    const kam = wadah.querySelector("[data-pilihan-kamera]");
    const brk = wadah.querySelector("[data-pilihan-berkas]");
    if (kam) kam.classList.add("hidden");
    if (brk) brk.classList.add("col-span-2");
  }

  Object.assign(root.PilihBerkas, { kecilkanFoto, pasang, adaKamera, bisaWebcam, bukaWebcam, siapkan });
})(typeof window !== "undefined" ? window : globalThis);
