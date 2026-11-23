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
    }
    // gambar besar dari galeri ikut dikecilkan
    target.addEventListener("change", () => {
      if (sibuk) return;
      const file = target.files && target.files[0];
      if (file && perluDikecilkan(file, false)) proses(file, false);
    });
  }

  // Tombol "Ambil foto" hanya berguna di perangkat sentuh (HP/tablet)
  const adaKamera = () => !!(root.matchMedia && root.matchMedia("(pointer: coarse)").matches);

  // Di komputer (tanpa kamera sentuh) pilihan "Ambil foto" disembunyikan; "Pilih berkas" jadi selebar penuh
  function siapkan(wadah) {
    if (!wadah || adaKamera()) return;
    const kam = wadah.querySelector("[data-pilihan-kamera]");
    const brk = wadah.querySelector("[data-pilihan-berkas]");
    if (kam) kam.classList.add("hidden");
    if (brk) brk.classList.add("col-span-2");
  }

  Object.assign(root.PilihBerkas, { kecilkanFoto, pasang, adaKamera, siapkan });
})(typeof window !== "undefined" ? window : globalThis);
