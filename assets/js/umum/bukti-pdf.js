/* ============================================================
   bukti-pdf.js — PDF "Bukti Pendaftaran" (kertas F4, pernyataan persetujuan,
   kolom tanda tangan). Dipakai bersama oleh:
     - formulir pendaftaran (daftar/)  → langsung setelah mendaftar
     - halaman siswa (#login)          → unduh ulang bila file hilang
     - panel admin                     → unduh untuk pendaftar mana pun
   Isi selalu dibuat dari data TERBARU di Google Sheets (bukan file tersimpan),
   jadi perubahan data/status oleh panitia otomatis ikut tercetak.
   ============================================================ */
(function (root) {
  const JSPDF_URL = "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
  const PDFLIB_URL = "https://cdnjs.cloudflare.com/ajax/libs/pdf-lib/1.17.1/pdf-lib.min.js";
  // Kop surat sekolah (PDF 1 halaman, dibuat panitia). Ganti berkas ini untuk mengganti kop.
  const SKRIP_INI = typeof document !== "undefined" && document.currentScript ? document.currentScript.src : "";
  const KOP_URL = SKRIP_INI ? new URL("../../template/template-pendaftaran-spmb-online.pdf", SKRIP_INI).href : "";
  const KOP_BAWAH = 64; // mm: batas bawah kop (garis ganda) setelah disesuaikan ke lebar F4

  function waktuWIB(date) {
    return new Date(date.getTime() + 7 * 3600 * 1000).toISOString().slice(0, 19).replace("T", " ");
  }

  // "2026-11-22 15:22:27" atau ISO lama → "22-11-2026 pukul 15.22 WIB"
  function waktuDaftarTeks(v) {
    let s = String(v || "").trim();
    if (/^\d{4}-\d{2}-\d{2}T/.test(s)) {
      const d = new Date(s);
      if (isNaN(d)) return "-";
      s = waktuWIB(d);
    }
    const m = s.match(/^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2})/);
    return m ? `${m[3]}-${m[2]}-${m[1]} pukul ${m[4]}.${m[5]} WIB` : "-";
  }

  // Tanggal lahir: "2011-08-17" → "17-08-2011"; format lain (mis. sudah "17-08-2011" di sheet) dibiarkan.
  function tanggalTeks(s) {
    const t = String(s ?? "").trim();
    const m = t.match(/^(\d{4})-(\d{2})-(\d{2})/);
    return m ? `${m[3]}-${m[2]}-${m[1]}` : t;
  }

  const namaFile = (no) => `Bukti-Pendaftaran-${String(no || "SPMB").replace(/[^\w.-]+/g, "-")}.pdf`;

  const NAMA_JURUSAN = {
    DKV: "Desain Komunikasi Visual (DKV)",
    RPL: "Rekayasa Perangkat Lunak (RPL)",
    TITL: "Teknik Instalasi Tenaga Listrik (TITL)",
    TKR: "Teknik Kendaraan Ringan (TKR)",
    TSM: "Teknik Sepeda Motor (TSM)",
  };

  // Isi bukti pendaftaran (tanpa jsPDF, agar bisa dites)
  function buildPdfContent(data, siswaUrl) {
    const v = (x) => (x === undefined || x === null || String(x).trim() === "" ? "-" : String(x));
    const jurusan = (k) => (k && k !== "-" ? NAMA_JURUSAN[k] || k : "-");
    return {
      school: "SMK TAMANSISWA JETIS",
      title: "BUKTI PENDAFTARAN ONLINE",
      subtitle: "Penerimaan Peserta Didik Baru (SPMB) Tahun Ajaran 2026/2027",
      noPendaftaran: v(data.noPendaftaran),
      sections: [
        {
          heading: "A. Data Diri Calon Siswa",
          rows: [
            ["Nama Lengkap", v(data.namaLengkap)],
            ["NISN", v(data.nisn)],
            ["Jenis Kelamin", v(data.jenisKelamin)],
            ["Tempat, Tanggal Lahir", `${v(data.tempatLahir)}, ${v(tanggalTeks(data.tanggalLahir))}`],
            ["Agama", v(data.agama)],
            ["No. WhatsApp Siswa", v(data.whatsapp)],
            ["Asal Sekolah", v(data.asalSekolah)],
            ["Alamat", v(data.alamat)],
            ["Berkas Diunggah", v(data.namaBerkas)],
          ],
        },
        {
          heading: "B. Orang Tua & Pilihan Jurusan",
          rows: [
            ["Nama Orang Tua/Wali", v(data.namaOrtu)],
            ["No. WhatsApp Ortu", v(data.waOrtu)],
            ["Jurusan Utama", jurusan(data.jurusan1)],
            ["Jurusan Cadangan", jurusan(data.jurusan2)],
            ["Status Pendaftaran", v(data.statusPendaftaran)],
            ["Waktu Pendaftaran", waktuDaftarTeks(data.createdAt)],
          ],
        },
      ],
      loginNote:
        `Lengkapi berkas atau cek berkas di ${siswaUrl} ` +
        "dengan login memakai NISN dan password yang dibuat saat mendaftar. Jangan beri tahu password ke siapa pun.",
      kertas: [215, 330], // F4 / folio, dalam mm
      pernyataan: {
        judul: "C. Pernyataan Persetujuan",
        pembuka: "Dengan menandatangani bukti pendaftaran ini, kami calon siswa dan orang tua/wali menyatakan bahwa:",
        butir: [
          "Data yang diisikan dalam formulir pendaftaran adalah benar dan dapat dipertanggungjawabkan.",
          "Calon siswa bersedia mengikuti seluruh tahapan seleksi SPMB SMK Tamansiswa Jetis.",
          "Orang tua/wali menyetujui dan mendukung calon siswa bersekolah di SMK Tamansiswa Jetis pada jurusan yang dipilih.",
          "Apabila diterima, calon siswa bersedia menaati tata tertib dan peraturan sekolah.",
          "Apabila di kemudian hari data terbukti tidak benar, kami bersedia menerima keputusan panitia, termasuk pembatalan pendaftaran.",
        ],
      },
      ttd: [
        { peran: "Calon Siswa", nama: isiNama(data.namaLengkap) },
        { peran: "Orang Tua/Wali", nama: isiNama(data.namaOrtu) },
        { peran: "Panitia SPMB", nama: "" },
      ],
    };
  }
  // Nama untuk kolom tanda tangan: kosong/"-" → "" (dicetak sebagai garis isian)
  function isiNama(x) {
    const s = String(x ?? "").trim();
    return s === "-" ? "" : s;
  }

  function buatDokumen(data, siswaUrl, opsi) {
    const pakaiKop = !!(opsi && opsi.kop);
    const { jsPDF } = root.jspdf;
    const c = buildPdfContent(data, siswaUrl);
    const doc = new jsPDF({ unit: "mm", format: c.kertas }); // F4: 215 x 330 mm
    const PAGE_W = c.kertas[0];
    const PAGE_H = c.kertas[1];
    const KIRI = 20;
    const KANAN = PAGE_W - 20;
    const TENGAH = PAGE_W / 2;
    const LEBAR = KANAN - KIRI;
    const GREEN = [23, 23, 23]; // judul & nomor: hitam arang (design.md)
    const GOLD = [242, 181, 58];
    const INK = [28, 42, 34];
    const MUTED = [75, 90, 80];
    const LABEL_X = 25;
    const COLON_X = 72;
    const VALUE_X = 75;
    const VALUE_W = KANAN - VALUE_X;
    const LINE = pakaiKop ? 5.1 : 5.6;
    // pindah halaman bila sisa ruang tidak cukup
    const ruang = (y, perlu) => {
      if (y + perlu <= PAGE_H - 12) return y;
      doc.addPage(c.kertas);
      return 20;
    };

    let y;
    if (pakaiKop) {
      // Kop surat ditempel sebagai latar (lihat tempelKop); di sini cukup judul + nomor
      doc.setTextColor(...INK);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.text(c.title, TENGAH, KOP_BAWAH + 8, { align: "center" });
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9.5);
      doc.setTextColor(...MUTED);
      doc.text(c.subtitle, TENGAH, KOP_BAWAH + 13.5, { align: "center" });

      doc.setFillColor(254, 247, 230);
      doc.roundedRect(KIRI, KOP_BAWAH + 17, LEBAR, 12, 2.5, 2.5, "F");
      doc.setTextColor(...INK);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10.5);
      doc.text("Nomor Pendaftaran", 26, KOP_BAWAH + 24.6);
      doc.setTextColor(...GREEN);
      doc.setFontSize(14);
      doc.text(c.noPendaftaran, KANAN - 6, KOP_BAWAH + 25, { align: "right" });
      y = KOP_BAWAH + 37;
    } else {
      // Kepala (tanpa kop)
      doc.setTextColor(...GREEN);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(18);
      doc.text(c.school, TENGAH, 20, { align: "center" });
      doc.setTextColor(...INK);
      doc.setFontSize(12);
      doc.text(c.title, TENGAH, 27, { align: "center" });
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(...MUTED);
      doc.text(c.subtitle, TENGAH, 33, { align: "center" });
      doc.setDrawColor(...GOLD);
      doc.setLineWidth(0.6);
      doc.line(KIRI, 37, KANAN, 37);

      // Nomor pendaftaran
      doc.setFillColor(254, 247, 230);
      doc.roundedRect(KIRI, 42, LEBAR, 18, 3, 3, "F");
      doc.setTextColor(...INK);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.text("Nomor Pendaftaran", 26, 53);
      doc.setTextColor(...GREEN);
      doc.setFontSize(16);
      doc.text(c.noPendaftaran, KANAN - 6, 53.5, { align: "right" });
      y = 71;
    }

    // Isi
    c.sections.forEach((section) => {
      doc.setTextColor(...INK);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.text(section.heading, 20, y);
      y += pakaiKop ? 6.2 : 7;
      doc.setFontSize(10);
      section.rows.forEach(([label, value]) => {
        const lines = doc.splitTextToSize(value, VALUE_W);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(...MUTED);
        doc.text(label, LABEL_X, y);
        doc.text(":", COLON_X, y);
        doc.setTextColor(...INK);
        doc.text(lines, VALUE_X, y);
        y += LINE * lines.length;
      });
      y += pakaiKop ? 3.5 : 5;
    });

    // Jarak bagian bawah: lebih rapat bila memakai kop agar tetap satu lembar F4
    const J = pakaiKop
      ? { cat: 4.5, catPad: 6, catJeda: 6.5, baris: 4.7, judul: 6, sesudah: 5, tgl: 6, garis: 21, nama: 26, namaKosong: 25.5, akhir: 33 }
      : { cat: 5, catPad: 8, catJeda: 9, baris: 5, judul: 7, sesudah: 7, tgl: 7, garis: 24, nama: 29, namaKosong: 28.5, akhir: 38 };

    // Catatan login
    doc.setFillColor(250, 247, 242);
    const note = doc.splitTextToSize(c.loginNote, LEBAR - 10);
    const noteH = note.length * J.cat + J.catPad;
    doc.roundedRect(KIRI, y, LEBAR, noteH, 3, 3, "F");
    doc.setFontSize(9.5);
    doc.setTextColor(...INK);
    doc.text(note, 25, y + J.catPad - 1.5);
    y += noteH + J.catJeda;

    // Pernyataan persetujuan siswa & orang tua/wali
    const p = c.pernyataan;
    doc.setFontSize(10);
    const pembuka = doc.splitTextToSize(p.pembuka, LEBAR);
    const butir = p.butir.map((b) => doc.splitTextToSize(b, LEBAR - 7));
    const tinggiPernyataan = J.judul + pembuka.length * J.baris + 2 + butir.reduce((t, l) => t + l.length * J.baris + 1, 0);
    y = ruang(y, tinggiPernyataan + J.sesudah + J.tgl + J.nama + 4); // pernyataan + tanda tangan tetap satu halaman
    doc.setTextColor(...INK);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text(p.judul, KIRI, y);
    y += J.judul;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(pembuka, KIRI, y);
    y += pembuka.length * J.baris + 2;
    butir.forEach((lines, i) => {
      doc.text(`${i + 1}.`, KIRI + 2, y);
      doc.text(lines, KIRI + 7, y);
      y += lines.length * J.baris + 1;
    });
    y += J.sesudah;

    // Tanda tangan: calon siswa, orang tua/wali, panitia
    const dicetak = new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
    doc.setTextColor(...MUTED);
    doc.text(`Yogyakarta, ${dicetak}`, KANAN, y, { align: "right" });
    y += J.tgl;
    const kolom = LEBAR / c.ttd.length;
    const LEBAR_GARIS = kolom - 10;
    c.ttd.forEach((t, i) => {
      const x = KIRI + kolom * i + kolom / 2;
      doc.setTextColor(...INK);
      doc.setFont("helvetica", "bold");
      doc.text(t.peran, x, y, { align: "center" });
      doc.setFont("helvetica", "normal");
      doc.setDrawColor(...INK);
      doc.setLineWidth(0.3);
      doc.line(x - LEBAR_GARIS / 2, y + J.garis, x + LEBAR_GARIS / 2, y + J.garis);
      if (t.nama) {
        const nama = doc.splitTextToSize(t.nama, LEBAR_GARIS);
        doc.text(nama[0] + (nama.length > 1 ? "…" : ""), x, y + J.nama, { align: "center" });
      } else {
        doc.setTextColor(...MUTED);
        doc.setFontSize(8.5);
        doc.text("nama jelas", x, y + J.namaKosong, { align: "center" });
        doc.setFontSize(10);
      }
    });
    y += J.akhir;
    doc.setFontSize(9);
    doc.setTextColor(...MUTED);
    doc.text("Cetak di kertas F4, tanda tangani, lalu bawa saat daftar ulang. Simpan salinannya sebagai tanda bukti yang sah.", TENGAH, Math.min(y, PAGE_H - 10), { align: "center" });

    return { doc, namaFile: namaFile(c.noPendaftaran) };
  }

  // Gabungkan baris Data_Pendaftar (data diri) + Verifikasi_Berkas (status, berkas)
  function gabungData(diri, verif) {
    const d = diri || {};
    const v = verif || {};
    const ambil = (k) => (d[k] !== undefined && String(d[k]).trim() !== "" ? d[k] : v[k]);
    const nisnMentah = String(ambil("nisn") ?? "").replace(/\D/g, "");
    return {
      ...v,
      ...d,
      noPendaftaran: ambil("noPendaftaran"),
      namaLengkap: ambil("namaLengkap"),
      nisn: nisnMentah ? nisnMentah.padStart(10, "0") : "",
      jurusan1: ambil("jurusan1"),
      jurusan2: ambil("jurusan2"),
      waOrtu: ambil("waOrtu"),
      namaBerkas: String(v.namaBerkas ?? "").split(/\r?\n/).map((x) => x.trim()).filter((x) => x && x !== "-").pop() || "",
      statusPendaftaran: v.statusPendaftaran && v.statusPendaftaran !== "-" ? v.statusPendaftaran : "Pending",
    };
  }

  // Cari data terbaru di sheet: { nisn } atau { noPendaftaran }. Hasil null bila tidak ketemu.
  async function cariData(kunci) {
    const S = root.Sheetson;
    const [diri, verif] = await Promise.all([
      S.getRows("Data_Pendaftar", { fresh: true }),
      S.getRows("Verifikasi_Berkas", { fresh: true }),
    ]);
    const cocok = (r) =>
      kunci.noPendaftaran
        ? String(r.noPendaftaran || "").trim() === String(kunci.noPendaftaran).trim()
        : S.normNisn(r.nisn) === S.normNisn(kunci.nisn);
    const d = diri.find(cocok) || null;
    const v = verif.find(cocok) || null;
    if (!d && !v) return null;
    return gabungData(d, v);
  }

  function muatSkrip(url, sudah) {
    if (sudah()) return Promise.resolve();
    return new Promise((res, rej) => {
      const el = document.createElement("script");
      el.src = url;
      el.onload = () => res();
      el.onerror = () => rej(new Error("Gagal memuat pembuat PDF. Periksa internet lalu coba lagi."));
      document.head.appendChild(el);
    });
  }
  const muatJsPdf = () => muatSkrip(JSPDF_URL, () => !!(root.jspdf && root.jspdf.jsPDF));

  // Ambil kop (sekali saja per kunjungan). Gagal → null, PDF tetap dibuat tanpa kop.
  let kopCache = null;
  async function ambilKop() {
    if (!KOP_URL) return null;
    try {
      await muatSkrip(PDFLIB_URL, () => !!root.PDFLib);
      if (!kopCache) {
        const r = await fetch(KOP_URL);
        if (!r.ok) throw new Error("HTTP " + r.status);
        kopCache = new Uint8Array(await r.arrayBuffer());
      }
      return kopCache;
    } catch (e) {
      if (root.console) console.warn("Kop surat tidak termuat, PDF dibuat tanpa kop:", e);
      return null;
    }
  }

  // Halaman 1: kop (vektor asli, disesuaikan ke lebar F4) di bawah isi dari jsPDF
  async function tempelKop(isiBytes, kopBytes) {
    const { PDFDocument } = root.PDFLib;
    const out = await PDFDocument.create();
    const isi = await PDFDocument.load(isiBytes);
    const kop = await PDFDocument.load(kopBytes);
    const [latar] = await out.embedPdf(kop, [0]);
    const halaman = await out.embedPdf(isi, isi.getPageIndices());
    halaman.forEach((hal, i) => {
      const { width: W, height: H } = isi.getPage(i).getSize();
      const p = out.addPage([W, H]);
      if (i === 0) {
        const skala = W / latar.width;
        p.drawPage(latar, { x: 0, y: H - latar.height * skala, width: W, height: latar.height * skala });
      }
      p.drawPage(hal, { x: 0, y: 0, width: W, height: H });
    });
    out.setTitle("Bukti Pendaftaran SPMB SMK Tamansiswa Jetis");
    return out.save();
  }

  function simpanBerkas(bytes, nama) {
    const url = URL.createObjectURL(new Blob([bytes], { type: "application/pdf" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = nama;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 30000);
  }

  // Alamat halaman login siswa (situs di-hosting di akar domain)
  const alamatSiswa = () => new URL("/siswa/", root.location.href).href;

  async function unduh(data, siswaUrl) {
    await muatJsPdf();
    const url = siswaUrl || alamatSiswa();
    const kop = await ambilKop();
    if (kop) {
      try {
        const { doc, namaFile: nama } = buatDokumen(data, url, { kop: true });
        simpanBerkas(await tempelKop(doc.output("arraybuffer"), kop), nama);
        return nama;
      } catch (e) {
        if (root.console) console.warn("Gagal menempel kop, PDF dibuat tanpa kop:", e);
      }
    }
    const { doc, namaFile: nama } = buatDokumen(data, url);
    doc.save(nama);
    return nama;
  }

  root.BuktiPdf = { KOP_URL, NAMA_JURUSAN, buildPdfContent, gabungData, cariData, unduh, namaFile, tanggalTeks, waktuDaftarTeks };
})(typeof window !== "undefined" ? window : globalThis);
